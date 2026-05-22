import { create } from "zustand";
import type { WatchData, ReactNode } from "./types.js";

export let DATA: WatchData;

export type ViewMode = "activity" | "topology" | "project";

interface DifferState {
  viewMode: ViewMode;
  selectedNode: string | null;
  selectedFile: string | null;
  drawerOpen: boolean;
  readingOrder: string[];
  expandedNodes: Set<string>;
  dataVersion: number;

  setViewMode: (mode: ViewMode) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedFile: (path: string | null) => void;
  setDrawerOpen: (open: boolean) => void;
  expandNode: (id: string) => void;
  resetActivityView: () => void;
}

export const useStore = create<DifferState>((set) => ({
  viewMode: "activity" as ViewMode,
  selectedNode: null,
  selectedFile: null,
  drawerOpen: false,
  readingOrder: [],
  expandedNodes: new Set<string>(),
  dataVersion: 0,

  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedNode: (id) => {
    if (id) {
      const node = DATA.topology.nodes.find(n => n.id === id);
      const isActive = DATA.blastRadius.changed.includes(id) || DATA.blastRadius.affected.includes(id);
      const file = isActive && node ? node.filePath : null;
      set({ selectedNode: id, drawerOpen: true, selectedFile: file });
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

  expandNode: (id) => set((state) => {
    const next = new Set(state.expandedNodes);
    next.add(id);
    return { expandedNodes: next };
  }),

  resetActivityView: () => set({ expandedNodes: new Set<string>(), selectedNode: null, drawerOpen: false, selectedFile: null }),
}));

export function initData(data: WatchData) {
  DATA = data;
  const order = computeReadingOrder(data);
  useStore.setState({ readingOrder: order });
}

export function updateData(data: WatchData) {
  DATA = data;
  const order = computeReadingOrder(data);
  useStore.setState((state) => ({ readingOrder: order, dataVersion: state.dataVersion + 1 }));
}

function computeReadingOrder(data: WatchData): string[] {
  const { topology, blastRadius, git } = data;
  const changedIds = new Set(blastRadius.changed);

  // Get changed nodes, grouped by kind priority
  const changedNodes = topology.nodes.filter(n => changedIds.has(n.id));

  // Priority: stores(1) > hooks(2) > components leaf-first(3) > pages(4)
  const kindPriority: Record<string, number> = {
    store: 1,
    hook: 2,
    context: 3,
    component: 4,
    page: 5,
  };

  changedNodes.sort((a, b) => {
    const pa = kindPriority[a.kind] ?? 99;
    const pb = kindPriority[b.kind] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  // Collect unique file paths from changed nodes
  const files: string[] = [];
  const seen = new Set<string>();

  for (const node of changedNodes) {
    if (!seen.has(node.filePath)) {
      seen.add(node.filePath);
      files.push(node.filePath);
    }
  }

  // Add affected (but not changed) files at the end
  const affectedIds = new Set(blastRadius.affected);
  const affectedNodes = topology.nodes
    .filter(n => affectedIds.has(n.id))
    .sort((a, b) => (kindPriority[a.kind] ?? 99) - (kindPriority[b.kind] ?? 99));

  for (const node of affectedNodes) {
    if (!seen.has(node.filePath)) {
      seen.add(node.filePath);
      files.push(node.filePath);
    }
  }

  return files;
}

export function getActivitySet(): Set<string> {
  const { changed, affected } = DATA.blastRadius;
  const activity = new Set([...changed, ...affected]);

  // Cold start fallback: use last commit's files
  if (activity.size === 0 && DATA.git.committed.length > 0) {
    const committedFiles = new Set(DATA.git.committed.map(h => h.file));
    for (const node of DATA.topology.nodes) {
      if (committedFiles.has(node.filePath)) activity.add(node.id);
    }
  }

  return activity;
}

export function getVisibleNodeIds(): Set<string> {
  const activity = getActivitySet();
  const { expandedNodes } = useStore.getState();

  const visible = new Set(activity);
  for (const nodeId of expandedNodes) {
    visible.add(nodeId);
    for (const edge of DATA.topology.edges) {
      if (edge.from === nodeId) visible.add(edge.to);
      if (edge.to === nodeId) visible.add(edge.from);
    }
  }
  return visible;
}

export function getHiddenNeighborCount(nodeId: string, visibleSet: Set<string>): number {
  let count = 0;
  for (const edge of DATA.topology.edges) {
    if (edge.from === nodeId && !visibleSet.has(edge.to)) count++;
    if (edge.to === nodeId && !visibleSet.has(edge.from)) count++;
  }
  return count;
}

export function getNodeStatus(id: string): "changed" | "affected" | "unchanged" {
  if (DATA.blastRadius.changed.includes(id)) return "changed";
  if (DATA.blastRadius.affected.includes(id)) return "affected";
  return "unchanged";
}

export function getNodeById(id: string): ReactNode | undefined {
  return DATA.topology.nodes.find(n => n.id === id);
}

export function getNodeEdges(id: string) {
  const renders = DATA.topology.edges.filter(e => e.from === id && e.kind === "renders");
  const renderedBy = DATA.topology.edges.filter(e => e.to === id && e.kind === "renders");
  const usesHooks = DATA.topology.edges.filter(e => e.from === id && e.kind === "uses-hook");
  const calledBy = DATA.topology.edges.filter(e => e.to === id && e.kind === "uses-hook");
  const subscribesTo = DATA.topology.edges.filter(e => e.from === id && e.kind === "subscribes");
  const subscribers = DATA.topology.edges.filter(e => e.to === id && e.kind === "subscribes");
  const provides = DATA.topology.edges.filter(e => e.from === id && e.kind === "provides");
  const consumesContext = DATA.topology.edges.filter(e => e.from === id && e.kind === "consumes-context");
  const consumedBy = DATA.topology.edges.filter(e => e.to === id && e.kind === "consumes-context");
  const nestsRoute = DATA.topology.edges.filter(e => e.from === id && e.kind === "nests-route");
  const nestedIn = DATA.topology.edges.filter(e => e.to === id && e.kind === "nests-route");

  return { renders, renderedBy, usesHooks, calledBy, subscribesTo, subscribers, provides, consumesContext, consumedBy, nestsRoute, nestedIn };
}
