import dagre from "@dagrejs/dagre";
const { Graph } = dagre.graphlib;
import type { Topology, SystemDelta } from "./types.js";
import type { NodeDiff } from "./diff.js";

export interface LayoutNode {
  id: string;
  type: string;
  description: string;
  status: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
  description: string;
  status: string;
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
  delta: SystemDelta,
  nodeDiffs?: NodeDiff[]
): GraphLayout {
  const g = new Graph();
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  const changedIds = new Set(delta.changed.map((c) => c.id));
  const addedIds = new Set(delta.added);
  const removedIds = new Set(delta.removed);
  const blastIds = new Set(delta.blast_radius);

  function getStatus(id: string): string {
    if (addedIds.has(id)) return "added";
    if (removedIds.has(id)) return "removed";
    if (changedIds.has(id)) return "changed";
    if (blastIds.has(id)) return "blast-radius";
    return "unchanged";
  }

  const allNodeIds = new Set([
    ...topology.nodes.map((n) => n.id),
    ...delta.added,
    ...delta.removed,
  ]);

  const maxWeight = Math.max(
    1,
    ...(nodeDiffs || []).map((nd) =>
      nd.files.reduce((s, f) => s + f.hunks.split("\n").length, 0)
    )
  );

  for (const id of allNodeIds) {
    const topoNode = topology.nodes.find((n) => n.id === id);
    const nd = (nodeDiffs || []).find((d) => d.nodeId === id);
    const weight = nd
      ? nd.files.reduce((s, f) => s + f.hunks.split("\n").length, 0)
      : 0;
    const status = getStatus(id);

    const baseWidth = Math.max(100, id.length * 9 + 32);
    const baseHeight = 40;
    const scale = status !== "unchanged" ? 1 + Math.min(0.4, (weight / maxWeight) * 0.4) : 1;

    g.setNode(id, {
      width: baseWidth * scale,
      height: baseHeight * scale,
      label: id,
    });
  }

  const removedEdgeKeys = new Set(delta.edges_removed.map((e) => e.from + "->" + e.to));
  const addedEdgeKeys = new Set(delta.edges_added.map((e) => e.from + "->" + e.to));

  const allEdges = [...topology.edges, ...delta.edges_added];
  for (const e of allEdges) {
    if (allNodeIds.has(e.from) && allNodeIds.has(e.to)) {
      g.setEdge(e.from, e.to);
    }
  }

  dagre.layout(g);

  const layoutNodes: LayoutNode[] = [];
  for (const id of allNodeIds) {
    const node = g.node(id);
    const topoNode = topology.nodes.find((n) => n.id === id);
    layoutNodes.push({
      id,
      type: topoNode?.type || "unknown",
      description: topoNode?.description || "",
      status: getStatus(id),
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
    });
  }

  const layoutEdges: LayoutEdge[] = [];
  for (const e of allEdges) {
    if (!allNodeIds.has(e.from) || !allNodeIds.has(e.to)) continue;
    const edgeData = g.edge(e.from, e.to);
    if (!edgeData) continue;
    const key = e.from + "->" + e.to;
    layoutEdges.push({
      source: e.from,
      target: e.to,
      description: e.description || "",
      status: removedEdgeKeys.has(key) ? "removed" : addedEdgeKeys.has(key) ? "added" : "",
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
