import { execSync } from "node:child_process";
import type { Topology, CommitInfo, CommitFile } from "./types.js";

export interface FileHunk {
  file: string;
  hunks: string;
  status: "A" | "D" | "M" | "R";
}

export interface NodeDiff {
  nodeId: string;
  files: FileHunk[];
}

export function captureDiff(base: string, cwd: string, opts?: { includeWorktree?: boolean; ref?: string }): FileHunk[] {
  let raw = "";

  if (opts?.ref) {
    // Diff a specific branch ref against base (committed only)
    try {
      raw = execSync(`git diff ${base}...${opts.ref}`, { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    } catch {
      return [];
    }
  } else if (opts?.includeWorktree) {
    // Two-dot: shows all changes from base to working tree (committed + uncommitted)
    try {
      raw = execSync(`git diff ${base}`, { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    } catch {
      return [];
    }
  } else {
    // Try committed changes first (three-dot: base...HEAD)
    try {
      raw = execSync(`git diff ${base}...HEAD`, { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    } catch {
      // ignore
    }
    // If no committed diff, try including working tree changes (two-dot: base)
    if (!raw.trim()) {
      try {
        raw = execSync(`git diff ${base}`, { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
      } catch {
        return [];
      }
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

    let status: FileHunk["status"] = "M";
    const preamble = lines.slice(0, hunkStart).join("\n");
    if (preamble.includes("new file mode")) status = "A";
    else if (preamble.includes("deleted file mode")) status = "D";
    else if (preamble.includes("rename from")) status = "R";

    const hunks = lines.slice(hunkStart).join("\n");
    files.push({ file, hunks, status });
  }

  return files;
}

export function captureCommits(base: string, cwd: string): CommitInfo[] {
  let logOutput = "";
  try {
    logOutput = execSync(`git log --format="%H|%h|%s|%an|%ai" ${base}...HEAD`, {
      cwd,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    // ignore
  }

  // Fallback: try two-dot range (commits reachable from HEAD but not base)
  if (!logOutput.trim()) {
    try {
      logOutput = execSync(`git log --format="%H|%h|%s|%an|%ai" ${base}..HEAD`, {
        cwd,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch {
      return [];
    }
  }

  if (!logOutput.trim()) return [];

  const commits: CommitInfo[] = [];
  const logLines = logOutput.trim().split("\n");

  for (const line of logLines) {
    const parts = line.split("|");
    if (parts.length < 5) continue;
    const hash = parts[0];
    const shortHash = parts[1];
    const author = parts[parts.length - 2];
    const date = parts[parts.length - 1];
    const message = parts.slice(2, parts.length - 2).join("|");
    if (!hash) continue;

    let filesOutput = "";
    try {
      filesOutput = execSync(`git diff-tree --no-commit-id --name-status -r ${hash}`, {
        cwd,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch {
      filesOutput = "";
    }

    const files: CommitFile[] = [];
    if (filesOutput.trim()) {
      for (const fline of filesOutput.trim().split("\n")) {
        const match = fline.match(/^([ADMR])\t(.+)/);
        if (match) {
          files.push({ status: match[1] as CommitFile["status"], path: match[2] });
        }
      }
    }

    commits.push({ hash, shortHash, message, author, date, files });
  }

  // Reverse to oldest-first for timeline display
  return commits.reverse();
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

export function fileMatchesTopology(file: string, topology: Topology): boolean {
  return topology.nodes.some((node) => fileMatchesPatterns(file, node.files));
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
