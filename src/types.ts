export type { TopologyNode, TopologyEdge, Topology, TopologyConfig } from "./topology.js";
export { computeTopology, fileToNodeId } from "./topology.js";

export interface ChangedNode {
  id: string;
  summary: string;
  before: string;
  structural_changes: string[];
}

export interface MovedItem {
  what: string;
  from: string;
  to: string;
}

export interface Decision {
  decision: string;
  alternatives: string[];
  rationale: string;
  nodes: string[];
}

export interface SystemDelta {
  intent: string;
  intent_satisfied: boolean;
  changed: ChangedNode[];
  added: string[];
  removed: string[];
  moved: MovedItem[];
  edges_added: { from: string; to: string; weight: number }[];
  edges_removed: { from: string; to: string; weight: number }[];
  blast_radius: string[];
  scope_violations: string[];
  decision_trace: Decision[];
}

export interface CommitFile {
  path: string;
  status: "A" | "D" | "M" | "R";
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  files: CommitFile[];
}

export interface TimelineNodeStat {
  id: string;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  files: string[];
}

export interface TimelineEntry {
  timestamp: string;
  base: string;
  nodes: TimelineNodeStat[];
  incremental: TimelineNodeStat[];
  commitsBefore?: string[];
  unexpected?: string[];
}

export interface Timeline {
  sessionStart: string;
  entries: TimelineEntry[];
}
