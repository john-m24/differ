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

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
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
  const g = new Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 30,
    ranksep: 50,
    marginx: 30,
    marginy: 30,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of topology.nodes) {
    const size = NODE_SIZES[node.kind];
    const labelWidth = Math.max(size.width, node.name.length * 8 + 24);
    g.setNode(node.id, {
      width: labelWidth,
      height: size.height,
      label: node.name,
    });
  }

  for (const edge of topology.edges) {
    if (g.hasNode(edge.from) && g.hasNode(edge.to)) {
      g.setEdge(edge.from, edge.to);
    }
  }

  dagre.layout(g);

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
    width: (graphInfo.width || 800) + 80,
    height: (graphInfo.height || 600) + 80,
  };
}
