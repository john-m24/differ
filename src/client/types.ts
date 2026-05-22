export interface TopologyNode {
  id: string;
  path: string;
  files: string[];
}

export interface TopologyEdge {
  from: string;
  to: string;
  weight: number;
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

export interface SystemDelta {
  intent: string;
  intent_satisfied: boolean;
  changed: ChangedNode[];
  added: string[];
  removed: string[];
  moved: { what: string; from: string; to: string }[];
  edges_added: TopologyEdge[];
  edges_removed: TopologyEdge[];
  blast_radius: string[];
  scope_violations: string[];
  decision_trace: { decision: string; alternatives: string[]; rationale: string; nodes: string[] }[];
}

export interface FileHunk {
  file: string;
  hunks: string;
  status: "A" | "D" | "M" | "R";
}

export interface NodeDiff {
  nodeId: string;
  files: FileHunk[];
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

export interface FolderGroup {
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

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

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  folders: FolderGroup[];
  width: number;
  height: number;
}

export interface AppData {
  topology: Topology;
  delta: SystemDelta;
  nodeDiffs: NodeDiff[];
  layout: GraphLayout;
  commits: CommitInfo[];
}
