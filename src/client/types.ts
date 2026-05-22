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

export interface LayoutNode {
  id: string;
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutEdge {
  source: string;
  target: string;
  weight: number;
  points: { x: number; y: number }[];
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

export type GitLayer = "committed" | "staged" | "unstaged";

export interface GitState {
  branch: string;
  base: string;
  committed: NodeDiff[];
  staged: FileHunk[];
  unstaged: FileHunk[];
  commits: CommitInfo[];
}

export interface WatchData {
  topology: Topology;
  layout: GraphLayout;
  git: GitState;
}
