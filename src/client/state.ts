import { create } from "zustand";
import type { WatchData, FileHunk, NodeDiff } from "./types.js";

export let DATA: WatchData;

interface DifferState {
  selectedNode: string | null;
  selectedFile: string | null;
  drawerOpen: boolean;
  readingOrder: string[];

  setSelectedNode: (id: string | null) => void;
  setSelectedFile: (path: string | null) => void;
  setDrawerOpen: (open: boolean) => void;
}

export const useStore = create<DifferState>((set, get) => ({
  selectedNode: null,
  selectedFile: null,
  drawerOpen: false,
  readingOrder: [],

  setSelectedNode: (id) => {
    if (id) {
      set({ selectedNode: id, drawerOpen: true, selectedFile: null });
    } else {
      set({ selectedNode: null, drawerOpen: false, selectedFile: null });
    }
  },

  setSelectedFile: (path) => {
    set({ selectedFile: path, drawerOpen: true });
  },

  setDrawerOpen: (open) => {
    if (!open) set({ drawerOpen: false, selectedNode: null, selectedFile: null });
    else set({ drawerOpen: open });
  },
}));

export function initData(data: WatchData) {
  DATA = data;
  const order = computeReadingOrder(data);
  useStore.setState({ readingOrder: order });
}

export function updateData(data: WatchData) {
  DATA = data;
  const order = computeReadingOrder(data);
  useStore.setState({ readingOrder: order });
}

function computeReadingOrder(data: WatchData): string[] {
  const { topology, git } = data;
  const allFiles = new Set<string>();

  git.committed.forEach(nd => nd.files.forEach(f => allFiles.add(f.file)));
  git.staged.forEach(f => allFiles.add(f.file));
  git.unstaged.forEach(f => allFiles.add(f.file));

  // Sort by topology order (upstream first based on edges)
  const nodeOrder = topoSort(topology.nodes.map(n => n.id), topology.edges);
  const nodeIndex = new Map(nodeOrder.map((id, i) => [id, i]));

  const files = [...allFiles];
  files.sort((a, b) => {
    const nodeA = getOwnerNode(a);
    const nodeB = getOwnerNode(b);
    const idxA = nodeA ? (nodeIndex.get(nodeA) ?? 999) : 999;
    const idxB = nodeB ? (nodeIndex.get(nodeB) ?? 999) : 999;
    if (idxA !== idxB) return idxA - idxB;
    return a.localeCompare(b);
  });

  return files;
}

function topoSort(nodeIds: string[], edges: { from: string; to: string }[]): string[] {
  const adj = new Map<string, string[]>();
  const inDeg = new Map<string, number>();

  for (const id of nodeIds) {
    adj.set(id, []);
    inDeg.set(id, 0);
  }

  for (const e of edges) {
    if (adj.has(e.from) && inDeg.has(e.to)) {
      adj.get(e.from)!.push(e.to);
      inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
    }
  }

  const queue = nodeIds.filter(id => (inDeg.get(id) ?? 0) === 0);
  const result: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    for (const next of adj.get(node) ?? []) {
      const deg = (inDeg.get(next) ?? 1) - 1;
      inDeg.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  // Add any remaining (cycles)
  for (const id of nodeIds) {
    if (!result.includes(id)) result.push(id);
  }

  return result;
}

export function getOwnerNode(filePath: string): string | null {
  for (const node of DATA.topology.nodes) {
    if (node.files.some(p => fileMatchesPattern(filePath, p))) return node.id;
  }
  return null;
}

export function getNodeStatus(id: string): "changed" | "unchanged" {
  const hasCommitted = DATA.git.committed.some(nd => nd.nodeId === id);
  if (hasCommitted) return "changed";

  const node = DATA.topology.nodes.find(n => n.id === id);
  if (!node) return "unchanged";

  const hasStaged = DATA.git.staged.some(f => node.files.some(p => fileMatchesPattern(f.file, p)));
  if (hasStaged) return "changed";

  const hasUnstaged = DATA.git.unstaged.some(f => node.files.some(p => fileMatchesPattern(f.file, p)));
  if (hasUnstaged) return "changed";

  return "unchanged";
}

export function getNodeActivity(id: string): { committed: number; staged: number; unstaged: number } {
  const node = DATA.topology.nodes.find(n => n.id === id);
  if (!node) return { committed: 0, staged: 0, unstaged: 0 };

  const committed = DATA.git.committed
    .filter(nd => nd.nodeId === id)
    .reduce((s, nd) => s + nd.files.length, 0);

  const staged = DATA.git.staged
    .filter(f => node.files.some(p => fileMatchesPattern(f.file, p)))
    .length;

  const unstaged = DATA.git.unstaged
    .filter(f => node.files.some(p => fileMatchesPattern(f.file, p)))
    .length;

  return { committed, staged, unstaged };
}

export function fileMatchesPattern(file: string, pattern: string): boolean {
  const re = pattern.replace(/\./g, "\\.").replace(/\*\*\//g, "(.+/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
  return new RegExp("^" + re + "$").test(file);
}
