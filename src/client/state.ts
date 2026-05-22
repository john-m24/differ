import { signal, computed } from "@preact/signals";
import type { AppData, FileHunk } from "./types.js";

export let DATA: AppData;

export function initData(data: AppData) {
  DATA = data;
  commitRange.value = [0, (data.commits || []).length - 1];
  recompute();
}

export const commitRange = signal<[number, number]>([0, 0]);
export const selectedNode = signal<string | null>(null);
export const selectedFile = signal<string | null>(null);
export const activeFilters = signal<Set<string>>(new Set(["changed", "added", "removed", "blast-radius"]));

export const activeFiles = signal<Set<string>>(new Set());
export const activeFileHunks = signal<FileHunk[]>([]);
export const activeNodeIds = signal<Set<string>>(new Set());

export function recompute() {
  const { commits, nodeDiffs } = DATA;
  if (!commits || commits.length === 0) {
    activeFiles.value = new Set(nodeDiffs.flatMap(nd => nd.files.map(f => f.file)));
    activeFileHunks.value = nodeDiffs.flatMap(nd => nd.files);
    activeNodeIds.value = new Set(nodeDiffs.map(nd => nd.nodeId));
    return;
  }

  const [start, end] = commitRange.value;
  const selected = commits.slice(start, end + 1);
  const files = new Set<string>();
  selected.forEach(c => c.files.forEach(f => files.add(f.path)));
  activeFiles.value = files;

  const hunks: FileHunk[] = [];
  nodeDiffs.forEach(nd => {
    nd.files.forEach(f => { if (files.has(f.file)) hunks.push(f); });
  });
  activeFileHunks.value = hunks;

  const nodeIds = new Set<string>();
  nodeDiffs.forEach(nd => {
    if (nd.files.some(f => files.has(f.file))) nodeIds.add(nd.nodeId);
  });
  activeNodeIds.value = nodeIds;
}

export function setCommitRange(range: [number, number]) {
  commitRange.value = range;
  recompute();
  if (selectedFile.value && !activeFiles.value.has(selectedFile.value)) {
    selectedFile.value = null;
  }
}

export function setSelectedNode(id: string | null) {
  selectedNode.value = id;
  if (id) {
    const node = DATA.topology.nodes.find(n => n.id === id);
    if (node) {
      const firstFile = activeFileHunks.value.find(f => node.files.some(p => fileMatchesPattern(f.file, p)));
      selectedFile.value = firstFile ? firstFile.file : null;
    }
  }
}

export function setSelectedFile(path: string | null) {
  selectedFile.value = path;
}

export function toggleFilter(status: string) {
  const next = new Set(activeFilters.value);
  if (next.has(status)) next.delete(status);
  else next.add(status);
  activeFilters.value = next;
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

function fileMatchesPattern(file: string, pattern: string): boolean {
  const re = pattern.replace(/\./g, "\\.").replace(/\*\*\//g, "(.+/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
  return new RegExp("^" + re + "$").test(file);
}
