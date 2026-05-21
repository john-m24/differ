import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderServeView } from "./render-serve.js";
import { captureDiff, captureCommits, mapDiffsToNodes } from "./diff.js";
import { computeTopology } from "./topology.js";
import type { SystemDelta } from "./types.js";

export interface ServeOptions {
  deltaPath?: string;
  base: string;
  port: number;
}

const EMPTY_DELTA: SystemDelta = {
  intent: "",
  intent_satisfied: true,
  changed: [],
  added: [],
  removed: [],
  moved: [],
  edges_added: [],
  edges_removed: [],
  blast_radius: [],
  scope_violations: [],
  decision_trace: [],
};

export function startServer(opts: ServeOptions) {
  const app = new Hono();
  const clients: Set<WritableStreamDefaultWriter> = new Set();

  function loadState() {
    const cwd = process.cwd();
    const topology = computeTopology(cwd);

    let delta = EMPTY_DELTA;
    if (opts.deltaPath && existsSync(opts.deltaPath)) {
      delta = JSON.parse(readFileSync(opts.deltaPath, "utf-8"));
    }

    const fileDiffs = captureDiff(opts.base, cwd);
    const nodeDiffs = fileDiffs.length > 0 ? mapDiffsToNodes(fileDiffs, topology) : [];
    const commits = captureCommits(opts.base, cwd);
    return { topology, delta, nodeDiffs, commits };
  }

  // SSE endpoint for live reload
  app.get("/api/events", (c) => {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    clients.add(writer);

    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

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

  function notifyClients() {
    const msg = new TextEncoder().encode("data: refresh\n\n");
    for (const writer of clients) {
      writer.write(msg).catch(() => clients.delete(writer));
    }
  }

  // API: get current state
  app.get("/api/state", (c) => {
    const state = loadState();
    return c.json(state);
  });

  // Serve the interactive review page
  app.get("/", (c) => {
    const state = loadState();
    const html = renderServeView(state.topology, state.delta, state.nodeDiffs, state.commits);
    return c.html(html);
  });

  console.log(`Differ serve running at http://localhost:${opts.port}`);
  serve({ fetch: app.fetch, port: opts.port });
}
