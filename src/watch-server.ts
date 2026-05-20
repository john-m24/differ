import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { renderWatchView } from "./render-watch.js";
import { captureDiff, mapDiffsToNodes } from "./diff.js";
import { computeNodeStats, computeIncremental } from "./diff-stats.js";
import { loadTimeline, appendEntry, resetTimeline } from "./timeline.js";
import { startWatcher } from "./watcher.js";
import type { Topology, SystemDelta, TimelineEntry, TimelineNodeStat } from "./types.js";

export interface WatchOptions {
  topologyPath: string;
  deltaPath: string;
  base: string;
  port: number;
  debounceMs: number;
  fresh: boolean;
}

export function startWatchServer(opts: WatchOptions) {
  const app = new Hono();
  const clients: Set<WritableStreamDefaultWriter> = new Set();
  const cwd = process.cwd();

  if (opts.fresh) resetTimeline(cwd);

  let previousStats: TimelineNodeStat[] = [];
  let lastCommitHash = getCurrentCommit(cwd);

  function loadTopology(): Topology {
    return JSON.parse(readFileSync(opts.topologyPath, "utf-8"));
  }

  function loadDelta(): SystemDelta | null {
    if (!existsSync(opts.deltaPath)) return null;
    try {
      return JSON.parse(readFileSync(opts.deltaPath, "utf-8"));
    } catch {
      return null;
    }
  }

  function getExpectedNodes(delta: SystemDelta | null): Set<string> {
    if (!delta) return new Set();
    const expected = new Set<string>();
    for (const c of delta.changed) expected.add(c.id);
    for (const a of delta.added) expected.add(a);
    for (const b of delta.blast_radius) expected.add(b);
    return expected;
  }

  app.get("/api/events", (c) => {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    clients.add(writer);

    c.req.raw.signal.addEventListener("abort", () => {
      clients.delete(writer);
      writer.close().catch(() => {});
    });

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });

  function pushEvent(event: string, data: unknown) {
    const msg = new TextEncoder().encode(
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    );
    for (const writer of clients) {
      writer.write(msg).catch(() => clients.delete(writer));
    }
  }

  app.get("/api/timeline", (c) => {
    return c.json(loadTimeline(cwd));
  });

  app.get("/api/state", (c) => {
    const topology = loadTopology();
    const delta = loadDelta();
    return c.json({ topology, delta });
  });

  app.get("/", (c) => {
    const topology = loadTopology();
    const delta = loadDelta();
    const fileDiffs = captureDiff(opts.base, cwd, { includeWorktree: true });
    const nodeDiffs = fileDiffs.length > 0 ? mapDiffsToNodes(fileDiffs, topology) : [];
    const timeline = loadTimeline(cwd);
    const html = renderWatchView(topology, delta, nodeDiffs, timeline);
    return c.html(html);
  });

  let topology = loadTopology();

  // Start with empty previousStats so the first trigger shows current state
  // (subsequent triggers show only what changed since last check)

  startWatcher({
    cwd,
    topology,
    debounceMs: opts.debounceMs,
    onChange: (changedFiles) => {
      console.log(`[watch] triggered by: ${changedFiles.join(", ")}`);
      try {
      topology = loadTopology();

      // Detect new commits since last check
      const currentCommit = getCurrentCommit(cwd);
      let commitsBefore: string[] | undefined;
      if (currentCommit !== lastCommitHash) {
        commitsBefore = getCommitsBetween(cwd, lastCommitHash, currentCommit);
        lastCommitHash = currentCommit;
      }

      const fileDiffs = captureDiff(opts.base, cwd, { includeWorktree: true });
      if (fileDiffs.length === 0 && !commitsBefore) return;

      const nodeStats = fileDiffs.length > 0 ? computeNodeStats(fileDiffs, topology) : [];
      const incremental = computeIncremental(nodeStats, previousStats);

      // Nothing actually changed incrementally
      if (incremental.length === 0 && !commitsBefore) return;

      // Detect unexpected nodes (touched but not in last analysis)
      const delta = loadDelta();
      const expected = getExpectedNodes(delta);
      const unexpected = incremental
        .filter((n) => expected.size > 0 && !expected.has(n.id))
        .map((n) => n.id);

      const entry: TimelineEntry = {
        timestamp: new Date().toISOString(),
        base: opts.base,
        nodes: nodeStats,
        incremental,
        commitsBefore: commitsBefore?.length ? commitsBefore : undefined,
        unexpected: unexpected.length > 0 ? unexpected : undefined,
      };

      previousStats = nodeStats;
      appendEntry(cwd, entry);
      pushEvent("timeline-entry", entry);

      const names = incremental.map((n) => n.id).join(", ");
      if (unexpected.length > 0) {
        console.log(`[watch] ⚠ ${names} (unexpected: ${unexpected.join(", ")})`);
      } else if (names) {
        console.log(`[watch] ${names}`);
      }
      if (commitsBefore) {
        console.log(`[watch] new commits: ${commitsBefore.join(", ")}`);
      }
      } catch (err) {
        console.error(`[watch] error in onChange:`, err);
      }
    },
  });

  console.log(`Differ watch → http://localhost:${opts.port}`);
  serve({ fetch: app.fetch, port: opts.port });
}

function getCurrentCommit(cwd: string): string {
  try {
    return execSync("git rev-parse HEAD", { cwd, encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function getCommitsBetween(cwd: string, from: string, to: string): string[] {
  if (!from || !to || from === to) return [];
  try {
    const log = execSync(`git log --oneline ${from}..${to}`, {
      cwd,
      encoding: "utf-8",
    }).trim();
    return log ? log.split("\n") : [];
  } catch {
    return [];
  }
}
