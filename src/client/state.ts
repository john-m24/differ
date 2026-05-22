import { create } from "zustand";
import type { AppData, FileHunk } from "./types.js";

export let DATA: AppData;

interface DifferState {
  commitRange: [number, number];
  selectedNode: string | null;
  selectedFile: string | null;
  activeFilters: Set<string>;
  activeFiles: Set<string>;
  activeFileHunks: FileHunk[];
  activeNodeIds: Set<string>;

  setCommitRange: (range: [number, number]) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedFile: (path: string | null) => void;
  toggleFilter: (status: string) => void;
}

function recompute(commitRange: [number, number]) {
  const { commits, nodeDiffs } = DATA;
  if (!commits || commits.length === 0) {
    return {
      activeFiles: new Set(nodeDiffs.flatMap(nd => nd.files.map(f => f.file))),
      activeFileHunks: nodeDiffs.flatMap(nd => nd.files),
      activeNodeIds: new Set(nodeDiffs.map(nd => nd.nodeId)),
    };
  }

  const [start, end] = commitRange;
  const selected = commits.slice(start, end + 1);
  const files = new Set<string>();
  selected.forEach(c => c.files.forEach(f => files.add(f.path)));

  const hunks: FileHunk[] = [];
  nodeDiffs.forEach(nd => {
    nd.files.forEach(f => { if (files.has(f.file)) hunks.push(f); });
  });

  const nodeIds = new Set<string>();
  nodeDiffs.forEach(nd => {
    if (nd.files.some(f => files.has(f.file))) nodeIds.add(nd.nodeId);
  });

  return { activeFiles: files, activeFileHunks: hunks, activeNodeIds: nodeIds };
}

export const useStore = create<DifferState>((set, get) => ({
  commitRange: [0, 0],
  selectedNode: null,
  selectedFile: null,
  activeFilters: new Set(["changed", "added", "removed", "blast-radius"]),
  activeFiles: new Set<string>(),
  activeFileHunks: [],
  activeNodeIds: new Set<string>(),

  setCommitRange: (range) => {
    const derived = recompute(range);
    const state = get();
    const selectedFile = state.selectedFile && derived.activeFiles.has(state.selectedFile)
      ? state.selectedFile : null;
    set({ commitRange: range, ...derived, selectedFile });
  },

  setSelectedNode: (id) => {
    if (id) {
      const node = DATA.topology.nodes.find(n => n.id === id);
      if (node) {
        const state = get();
        const firstFile = state.activeFileHunks.find(f =>
          node.files.some(p => fileMatchesPattern(f.file, p))
        );
        set({ selectedNode: id, selectedFile: firstFile?.file || null });
        return;
      }
    }
    set({ selectedNode: id });
  },

  setSelectedFile: (path) => set({ selectedFile: path }),

  toggleFilter: (status) => {
    const current = get().activeFilters;
    const next = new Set(current);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    set({ activeFilters: next });
  },
}));

export function initData(data: AppData) {
  DATA = data;
  const range: [number, number] = [0, Math.max(0, (data.commits || []).length - 1)];
  const derived = recompute(range);
  useStore.setState({ commitRange: range, ...derived });
}

export function getStatus(id: string): string {
  const { delta, nodeDiffs } = DATA;
  if (delta.added.includes(id)) return "added";
  if (delta.removed.includes(id)) return "removed";
  if (delta.changed.some(c => c.id === id)) return "changed";
  if (delta.blast_radius.includes(id)) return "blast-radius";
  if (nodeDiffs.some(nd => nd.nodeId === id)) return "changed";
  return "unchanged";
}

export function getOwnerNode(filePath: string): string | null {
  for (const node of DATA.topology.nodes) {
    if (node.files.some(p => fileMatchesPattern(filePath, p))) return node.id;
  }
  return null;
}

export function fileMatchesPattern(file: string, pattern: string): boolean {
  const re = pattern.replace(/\./g, "\\.").replace(/\*\*\//g, "(.+/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
  return new RegExp("^" + re + "$").test(file);
}
