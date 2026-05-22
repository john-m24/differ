export type { TopologyNode, TopologyEdge, Topology, TopologyConfig } from "./topology.js";
export { computeTopology, fileToNodeId } from "./topology.js";

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
}

export interface Timeline {
  sessionStart: string;
  entries: TimelineEntry[];
}
