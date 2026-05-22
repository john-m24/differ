export type ReactNodeKind = "page" | "component" | "hook" | "store" | "context";

export interface ReactNode {
  id: string;
  kind: ReactNodeKind;
  name: string;
  filePath: string;
  line: number;
  exported: boolean;
  props?: PropSignature[];
  route?: string;
  storeKeys?: string[];
}

export interface PropSignature {
  name: string;
  type: string;
  optional: boolean;
}

export type ReactEdgeKind = "renders" | "uses-hook" | "subscribes" | "provides";

export interface ReactEdge {
  from: string;
  to: string;
  kind: ReactEdgeKind;
  subscribedKeys?: string[];
}

export interface ReactTopology {
  nodes: ReactNode[];
  edges: ReactEdge[];
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
  kind: string;
  points: { x: number; y: number }[];
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

export interface BlastRadius {
  changed: string[];
  affected: string[];
  affectedRoutes: string[];
  risks: RiskSignal[];
}

export interface RiskSignal {
  kind: "props-changed" | "hook-signature-changed" | "store-shape-changed";
  nodeId: string;
  detail: string;
}

export interface FileHunk {
  file: string;
  hunks: string;
  status: "A" | "D" | "M" | "R";
}

export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  files: { path: string; status: string }[];
}

export interface GitState {
  branch: string;
  base: string;
  committed: FileHunk[];
  staged: FileHunk[];
  unstaged: FileHunk[];
  commits: CommitInfo[];
  changedFiles: string[];
}

export interface WatchData {
  topology: ReactTopology;
  layout: GraphLayout;
  blastRadius: BlastRadius;
  git: GitState;
}
