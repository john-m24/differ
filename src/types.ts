export interface TopologyNode {
  id: string;
  type: string;
  files: string[];
  description: string;
}

export interface TopologyEdge {
  from: string;
  to: string;
  type: "calls" | "depends" | "emits" | "subscribes";
  description?: string;
}

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

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
  edges_added: TopologyEdge[];
  edges_removed: TopologyEdge[];
  blast_radius: string[];
  scope_violations: string[];
  decision_trace: Decision[];
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
