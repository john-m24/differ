import { execSync } from "node:child_process";
import type { Topology } from "./types.js";

export interface FileHunk {
  file: string;
  hunks: string;
}

export interface NodeDiff {
  nodeId: string;
  files: FileHunk[];
}

export function captureDiff(base: string, cwd: string): FileHunk[] {
  let raw: string;
  try {
    raw = execSync(`git diff ${base}...HEAD`, { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
  } catch {
    try {
      raw = execSync(`git diff ${base}`, { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    } catch {
      return [];
    }
  }

  return parseDiff(raw);
}

export function parseDiff(raw: string): FileHunk[] {
  const files: FileHunk[] = [];
  const fileSections = raw.split(/^diff --git /m).slice(1);

  for (const section of fileSections) {
    const lines = section.split("\n");
    const headerMatch = lines[0]?.match(/a\/(.+?) b\/(.+)/);
    if (!headerMatch) continue;

    const file = headerMatch[2];
    const hunkStart = lines.findIndex((l) => l.startsWith("@@"));
    if (hunkStart === -1) continue;

    const hunks = lines.slice(hunkStart).join("\n");
    files.push({ file, hunks });
  }

  return files;
}

export function mapDiffsToNodes(fileDiffs: FileHunk[], topology: Topology): NodeDiff[] {
  const nodeDiffs: NodeDiff[] = [];

  for (const node of topology.nodes) {
    const matched: FileHunk[] = [];

    for (const fd of fileDiffs) {
      if (fileMatchesPatterns(fd.file, node.files)) {
        matched.push(fd);
      }
    }

    if (matched.length > 0) {
      nodeDiffs.push({ nodeId: node.id, files: matched });
    }
  }

  return nodeDiffs;
}

function fileMatchesPatterns(file: string, patterns: string[]): boolean {
  return patterns.some((pattern) => globMatch(file, pattern));
}

function globMatch(file: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*\//g, "(.+/)?")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*");

  return new RegExp(`^${regexStr}$`).test(file);
}
