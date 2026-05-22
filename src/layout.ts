import dagre from "@dagrejs/dagre";
const { Graph } = dagre.graphlib;
import type { Topology } from "./types.js";
import type { NodeDiff } from "./diff.js";

export interface LayoutNode {
  id: string;
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
  weight: number;
  points: { x: number; y: number }[];
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

export function computeLayout(
  topology: Topology,
  nodeDiffs?: NodeDiff[]
): GraphLayout {
  const g = new Graph();
  g.setGraph({ rankdir: "LR", nodesep: 30, ranksep: 60, marginx: 30, marginy: 30 });
  g.setDefaultEdgeLabel(() => ({}));

  const diffNodeIds = new Set((nodeDiffs || []).map((nd) => nd.nodeId));

  for (const node of topology.nodes) {
    const label = node.id.split("/").pop() || node.id;
    const baseWidth = Math.max(90, label.length * 7 + 30);
    const baseHeight = 34;
    const scale = diffNodeIds.has(node.id) ? 1.1 : 1;

    g.setNode(node.id, {
      width: baseWidth * scale,
      height: baseHeight * scale,
      label: node.id,
    });
  }

  for (const e of topology.edges) {
    if (g.hasNode(e.from) && g.hasNode(e.to)) {
      g.setEdge(e.from, e.to);
    }
  }

  dagre.layout(g);

  const layoutNodes: LayoutNode[] = topology.nodes.map((node) => {
    const n = g.node(node.id);
    return {
      id: node.id,
      path: node.path,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    };
  });

  const layoutEdges: LayoutEdge[] = [];
  for (const e of topology.edges) {
    if (!g.hasNode(e.from) || !g.hasNode(e.to)) continue;
    const edgeData = g.edge(e.from, e.to);
    if (!edgeData) continue;
    layoutEdges.push({
      source: e.from,
      target: e.to,
      weight: e.weight || 1,
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
