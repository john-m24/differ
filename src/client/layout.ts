import dagre from "@dagrejs/dagre";
const { Graph } = dagre.graphlib;
import type { ReactNode, ReactEdge, ReactNodeKind, LayoutNode, LayoutEdge } from "./types.js";

const NODE_SIZES: Record<ReactNodeKind, { width: number; height: number }> = {
  page: { width: 140, height: 40 },
  component: { width: 120, height: 34 },
  hook: { width: 110, height: 30 },
  store: { width: 120, height: 36 },
  context: { width: 110, height: 34 },
};

export interface ActivityLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

export function computeActivityLayout(
  nodes: ReactNode[],
  edges: ReactEdge[],
): ActivityLayout {
  const nodeIds = new Set(nodes.map(n => n.id));

  const g = new Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: 40,
    ranksep: 60,
    marginx: 30,
    marginy: 30,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const size = NODE_SIZES[node.kind];
    const labelWidth = Math.max(size.width, node.name.length * 8 + 24);
    g.setNode(node.id, { width: labelWidth, height: size.height });
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      g.setEdge(edge.from, edge.to);
    }
  }

  dagre.layout(g);

  const layoutNodes: LayoutNode[] = nodes.map(node => {
    const n = g.node(node.id);
    return { id: node.id, x: n.x, y: n.y, width: n.width, height: n.height };
  });

  const layoutEdges: LayoutEdge[] = [];
  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
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
    width: (graphInfo.width || 400) + 60,
    height: (graphInfo.height || 300) + 60,
  };
}
