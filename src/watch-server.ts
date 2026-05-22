import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { captureDiff, captureCommits, mapDiffsToNodes } from "./diff.js";
import { computeLayout } from "./layout.js";
import { startWatcher } from "./watcher.js";
import { computeTopology } from "./topology.js";
import { CSS } from "./render-css.js";
import type { Topology } from "./types.js";

export interface WatchOptions {
  base: string;
  port: number;
  debounceMs: number;
  fresh: boolean;
}

export function startWatchServer(opts: WatchOptions) {
  const app = new Hono();
  const clients: Set<WritableStreamDefaultWriter> = new Set();
  const cwd = process.cwd();

  function loadTopology(): Topology {
    return computeTopology(cwd);
  }

  function computeState() {
    const topology = loadTopology();
    const branch = getCurrentBranch(cwd);

    // Committed changes (base...HEAD)
    const committedDiffs = captureDiff(opts.base, cwd);
    const committed = committedDiffs.length > 0 ? mapDiffsToNodes(committedDiffs, topology) : [];
    const commits = captureCommits(opts.base, cwd);

    // Staged changes
    const staged = captureStagedDiff(cwd);

    // Unstaged changes
    const unstaged = captureUnstagedDiff(cwd);

    const layout = computeLayout(topology, committed);

    return {
      topology,
      layout,
      git: {
        branch,
        base: opts.base,
        committed,
        staged,
        unstaged,
        commits,
      },
    };
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

  function pushState() {
    try {
      const state = computeState();
      const msg = new TextEncoder().encode(
        `event: state\ndata: ${JSON.stringify(state)}\n\n`
      );
      for (const writer of clients) {
        writer.write(msg).catch(() => clients.delete(writer));
      }
    } catch (err) {
      console.error("[watch] error computing state:", err);
    }
  }

  app.get("/api/state", (c) => {
    return c.json(computeState());
  });

  app.get("/", (c) => {
    const state = computeState();
    const html = renderWatchHTML(state);
    return c.html(html);
  });

  const topology = loadTopology();

  startWatcher({
    cwd,
    topology,
    debounceMs: opts.debounceMs,
    onChange: (changedFiles) => {
      console.log(`[watch] ${changedFiles.length} file(s) changed`);
      pushState();
    },
  });

  // Also poll for git state changes (commits, staging) every 2s
  setInterval(() => {
    pushState();
  }, 2000);

  console.log(`Differ watch → http://localhost:${opts.port}`);
  serve({ fetch: app.fetch, port: opts.port });
}

function renderWatchHTML(state: unknown): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  let clientScript = "";
  try {
    clientScript = readFileSync(join(__dirname, "index.global.js"), "utf-8");
  } catch {
    clientScript = "console.error('Client bundle not found. Run: npm run build');";
  }

  let reactFlowCSS = "";
  try {
    reactFlowCSS = readFileSync(join(__dirname, "..", "node_modules", "@xyflow", "react", "dist", "style.css"), "utf-8");
  } catch {
    try {
      reactFlowCSS = readFileSync(join(process.cwd(), "node_modules", "@xyflow", "react", "dist", "style.css"), "utf-8");
    } catch {}
  }

  const data = JSON.stringify(state).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Differ Watch</title>
<style>
${reactFlowCSS}
${CSS}
</style>
</head>
<body>
<div id="app"></div>
<script>
window.DATA = ${data};
</script>
<script>
${clientScript}
</script>
</body>
</html>`;
}

function getCurrentBranch(cwd: string): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd, encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

function captureStagedDiff(cwd: string): { file: string; hunks: string; status: "A" | "D" | "M" | "R" }[] {
  try {
    const raw = execSync("git diff --cached", { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    if (!raw.trim()) return [];
    return parseDiffOutput(raw);
  } catch {
    return [];
  }
}

function captureUnstagedDiff(cwd: string): { file: string; hunks: string; status: "A" | "D" | "M" | "R" }[] {
  try {
    const raw = execSync("git diff", { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    if (!raw.trim()) return [];
    return parseDiffOutput(raw);
  } catch {
    return [];
  }
}

function parseDiffOutput(raw: string): { file: string; hunks: string; status: "A" | "D" | "M" | "R" }[] {
  const files: { file: string; hunks: string; status: "A" | "D" | "M" | "R" }[] = [];
  const fileSections = raw.split(/^diff --git /m).slice(1);

  for (const section of fileSections) {
    const lines = section.split("\n");
    const headerMatch = lines[0]?.match(/a\/(.+?) b\/(.+)/);
    if (!headerMatch) continue;

    const file = headerMatch[2];
    const hunkStart = lines.findIndex((l) => l.startsWith("@@"));
    if (hunkStart === -1) continue;

    let status: "A" | "D" | "M" | "R" = "M";
    const preamble = lines.slice(0, hunkStart).join("\n");
    if (preamble.includes("new file mode")) status = "A";
    else if (preamble.includes("deleted file mode")) status = "D";
    else if (preamble.includes("rename from")) status = "R";

    const hunks = lines.slice(hunkStart).join("\n");
    files.push({ file, hunks, status });
  }

  return files;
}
