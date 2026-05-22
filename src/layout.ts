import dagre from "@dagrejs/dagre";
const { Graph } = dagre.graphlib;
import type { ReactTopology, ReactNode, ReactNodeKind } from "./react-ast/types.js";
import type { BlastRadius } from "./blast-radius.js";

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
  kind: string;
  points: { x: number; y: number }[];
}

export interface ClusterLayout {
  id: string;
  kind: ReactNodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  clusters?: ClusterLayout[];
  width: number;
  height: number;
}

const NODE_SIZES: Record<ReactNodeKind, { width: number; height: number }> = {
  page: { width: 140, height: 40 },
  component: { width: 120, height: 34 },
  hook: { width: 110, height: 30 },
  store: { width: 120, height: 36 },
  context: { width: 110, height: 34 },
};

export function computeLayout(
  topology: ReactTopology,
  blastRadius?: BlastRadius
): GraphLayout {
  // Group nodes by kind to determine which clusters to create
  const kindGroups = new Map<ReactNodeKind, ReactNode[]>();
  for (const node of topology.nodes) {
    if (!kindGroups.has(node.kind)) kindGroups.set(node.kind, []);
    kindGroups.get(node.kind)!.push(node);
  }

  const g = new Graph({ compound: true });
  g.setGraph({
    rankdir: "TB",
    nodesep: 30,
    ranksep: 50,
    marginx: 30,
    marginy: 30,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Create cluster parent nodes for each kind present
  for (const [kind] of kindGroups) {
    g.setNode(`__cluster_${kind}`, {
      label: kind,
      clusterLabelPos: "top",
      paddingTop: 24,
      paddingBottom: 12,
      paddingLeft: 16,
      paddingRight: 16,
    });
  }

  // Add real nodes and assign to cluster parents
  for (const node of topology.nodes) {
    const size = NODE_SIZES[node.kind];
    const labelWidth = Math.max(size.width, node.name.length * 8 + 24);
    g.setNode(node.id, {
      width: labelWidth,
      height: size.height,
      label: node.name,
    });
    g.setParent(node.id, `__cluster_${node.kind}`);
  }

  // Add edges
  for (const edge of topology.edges) {
    if (g.hasNode(edge.from) && g.hasNode(edge.to)) {
      g.setEdge(edge.from, edge.to);
    }
  }

  dagre.layout(g);

  // Extract node positions
  const layoutNodes: LayoutNode[] = topology.nodes.map(node => {
    const n = g.node(node.id);
    return {
      id: node.id,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    };
  });

  // Extract cluster boundaries
  const clusters: ClusterLayout[] = [];
  for (const [kind] of kindGroups) {
    const clusterId = `__cluster_${kind}`;
    const clusterNode = g.node(clusterId);
    if (clusterNode && clusterNode.width && clusterNode.height) {
      clusters.push({
        id: clusterId,
        kind,
        x: clusterNode.x,
        y: clusterNode.y,
        width: clusterNode.width,
        height: clusterNode.height,
      });
    }
  }

  // Extract edges
  const layoutEdges: LayoutEdge[] = [];
  for (const edge of topology.edges) {
    if (!g.hasNode(edge.from) || !g.hasNode(edge.to)) continue;
    const edgeData = g.edge(edge.from, edge.to);
    if (!edgeData) continue;
    layoutEdges.push({
      source: edge.from,
      target: edge.to,
      kind: edge.kind,
      points: edgeData.points || [],
    });
  }

  const graphInfo = g.graph();
  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    clusters,
    width: (graphInfo.width || 800) + 80,
    height: (graphInfo.height || 600) + 80,
  };
}
