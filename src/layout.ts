import dagre from "@dagrejs/dagre";
const { Graph } = dagre.graphlib;
import type { Topology, SystemDelta } from "./types.js";
import type { NodeDiff } from "./diff.js";

export interface LayoutNode {
  id: string;
  path: string;
  status: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
  weight: number;
  status: string;
  points: { x: number; y: number }[];
}

export interface FolderGroup {
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  folders: FolderGroup[];
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
  const diffNodeIds = new Set((nodeDiffs || []).map((nd) => nd.nodeId));

  function getStatus(id: string): string {
    if (addedIds.has(id)) return "added";
    if (removedIds.has(id)) return "removed";
    if (changedIds.has(id)) return "changed";
    if (blastIds.has(id)) return "blast-radius";
    if (diffNodeIds.has(id)) return "changed";
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
      path: topoNode?.path || "",
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
      weight: e.weight || 1,
      status: removedEdgeKeys.has(key) ? "removed" : addedEdgeKeys.has(key) ? "added" : "",
      points: edgeData.points || [],
    });
  }

  // Compute folder groups from node positions
  const folderMap = new Map<string, LayoutNode[]>();
  for (const node of layoutNodes) {
    const parts = node.id.split("/");
    const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
    if (!folderMap.has(folder)) folderMap.set(folder, []);
    folderMap.get(folder)!.push(node);
  }

  const padding = 20;
  const folders: FolderGroup[] = [];
  for (const [path, nodes] of folderMap) {
    if (nodes.length < 2) continue;
    const minX = Math.min(...nodes.map((n) => n.x - n.width / 2));
    const maxX = Math.max(...nodes.map((n) => n.x + n.width / 2));
    const minY = Math.min(...nodes.map((n) => n.y - n.height / 2));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height / 2));
    folders.push({
      path,
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    });
  }

  const graphInfo = g.graph();
  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    folders,
    width: (graphInfo.width || 800) + 80,
    height: (graphInfo.height || 600) + 80,
  };
}
