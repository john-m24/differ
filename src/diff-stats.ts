import type { FileHunk } from "./diff.js";
import type { Topology, TimelineNodeStat } from "./types.js";
import { mapDiffsToNodes } from "./diff.js";

export function computeNodeStats(
  fileDiffs: FileHunk[],
  topology: Topology
): TimelineNodeStat[] {
  const nodeDiffs = mapDiffsToNodes(fileDiffs, topology);

  return nodeDiffs.map((nd) => {
    let linesAdded = 0;
    let linesRemoved = 0;

    for (const f of nd.files) {
      for (const line of f.hunks.split("\n")) {
        if (line.startsWith("+") && !line.startsWith("+++")) linesAdded++;
        if (line.startsWith("-") && !line.startsWith("---")) linesRemoved++;
      }
    }

    return {
      id: nd.nodeId,
      filesChanged: nd.files.length,
      linesAdded,
      linesRemoved,
      files: nd.files.map((f) => f.file),
    };
  });
}

export function computeIncremental(
  current: TimelineNodeStat[],
  previous: TimelineNodeStat[]
): TimelineNodeStat[] {
  const prevMap = new Map(previous.map((n) => [n.id, n]));
  const result: TimelineNodeStat[] = [];

  for (const node of current) {
    const prev = prevMap.get(node.id);
    const added = node.linesAdded - (prev?.linesAdded ?? 0);
    const removed = node.linesRemoved - (prev?.linesRemoved ?? 0);
    const filesDelta = node.files.filter(
      (f) => !prev?.files.includes(f)
    );

    if (added !== 0 || removed !== 0 || filesDelta.length > 0) {
      result.push({
        id: node.id,
        filesChanged: filesDelta.length || (added !== 0 || removed !== 0 ? node.filesChanged : 0),
        linesAdded: Math.max(0, added),
        linesRemoved: Math.max(0, removed),
        files: filesDelta.length > 0 ? filesDelta : node.files,
      });
    }
  }

  return result;
}
