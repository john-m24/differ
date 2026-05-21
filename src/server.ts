import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFileSync, writeFileSync, watchFile } from "node:fs";
import { resolve } from "node:path";
import { renderServeView } from "./render-serve.js";
import { captureDiff, captureCommits, mapDiffsToNodes } from "./diff.js";
import { chatWithAgent } from "./chat-agent.js";
import type { Topology, SystemDelta } from "./types.js";

export interface ServeOptions {
  topologyPath: string;
  deltaPath: string;
  base: string;
  port: number;
}

export function startServer(opts: ServeOptions) {
  const app = new Hono();
  const clients: Set<WritableStreamDefaultWriter> = new Set();

  function loadState() {
    const topology: Topology = JSON.parse(readFileSync(opts.topologyPath, "utf-8"));
    const delta: SystemDelta = JSON.parse(readFileSync(opts.deltaPath, "utf-8"));
    const fileDiffs = captureDiff(opts.base, process.cwd());
    const nodeDiffs = fileDiffs.length > 0 ? mapDiffsToNodes(fileDiffs, topology) : [];
    const commits = captureCommits(opts.base, process.cwd());
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

  // Watch files for changes
  watchFile(opts.topologyPath, { interval: 500 }, notifyClients);
  watchFile(opts.deltaPath, { interval: 500 }, notifyClients);

  // API: get current state
  app.get("/api/state", (c) => {
    const state = loadState();
    return c.json(state);
  });

  // API: chat with agent
  app.post("/api/chat", async (c) => {
    const { message } = await c.req.json();
    if (!message) return c.json({ error: "No message provided" }, 400);

    try {
      const { topology, delta } = loadState();
      const response = chatWithAgent(message, topology, delta);
      return c.json(response);
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }
  });

  // API: apply proposed changes
  app.post("/api/apply", async (c) => {
    const { changes } = await c.req.json();
    if (!changes || !Array.isArray(changes)) {
      return c.json({ error: "No changes provided" }, 400);
    }

    for (const change of changes) {
      if (change.file === "topology.json") {
        writeFileSync(opts.topologyPath, change.after + "\n");
      } else if (change.file === "SYSTEM_DELTA.json") {
        writeFileSync(opts.deltaPath, change.after + "\n");
      }
    }

    notifyClients();
    return c.json({ ok: true });
  });

  // Serve the interactive review page with chat UI
  app.get("/", (c) => {
    const state = loadState();
    const html = renderServeView(state.topology, state.delta, state.nodeDiffs, state.commits);
    return c.html(html);
  });

  console.log(`Differ serve running at http://localhost:${opts.port}`);
  serve({ fetch: app.fetch, port: opts.port });
}
