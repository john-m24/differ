import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { captureDiff, captureCommits, mapDiffsToNodes, parseDiff } from "./diff.js";
import { computeLayout } from "./layout.js";
import { startWatcher } from "./watcher.js";
import { computeReactTopology } from "./react-topology.js";
import { computeBlastRadius } from "./blast-radius.js";
import { isReactProject } from "./react-ast/parser.js";
import { computeTopology } from "./topology.js";
import { CSS } from "./render-css.js";
import type { ReactTopology } from "./react-ast/types.js";

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
  const useReact = isReactProject(cwd);

  let cachedTopology: ReactTopology | null = null;

  function getTopology(): ReactTopology {
    if (!cachedTopology) {
      if (useReact) {
        cachedTopology = computeReactTopology(cwd);
      } else {
        // Fallback: convert file-level topology to ReactTopology shape
        const topo = computeTopology(cwd);
        cachedTopology = {
          nodes: topo.nodes.map(n => ({
            id: n.id,
            kind: "component" as const,
            name: n.id.split("/").pop() || n.id,
            filePath: n.path || n.files[0] || n.id,
            line: 1,
            exported: true,
          })),
          edges: topo.edges.map(e => ({
            from: e.from,
            to: e.to,
            kind: "renders" as const,
          })),
        };
      }
    }
    return cachedTopology;
  }

  function getChangedFiles(): string[] {
    const files = new Set<string>();
    // Committed changes
    try {
      const raw = execSync(`git diff --name-only ${opts.base}...HEAD`, { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
      raw.trim().split("\n").filter(Boolean).forEach(f => files.add(f));
    } catch {}
    // Staged
    try {
      const raw = execSync("git diff --cached --name-only", { cwd, encoding: "utf-8" });
      raw.trim().split("\n").filter(Boolean).forEach(f => files.add(f));
    } catch {}
    // Unstaged
    try {
      const raw = execSync("git diff --name-only", { cwd, encoding: "utf-8" });
      raw.trim().split("\n").filter(Boolean).forEach(f => files.add(f));
    } catch {}
    return [...files];
  }

  function computeState() {
    const topology = getTopology();
    const changedFiles = getChangedFiles();
    const blastRadius = computeBlastRadius(topology, changedFiles);
    const layout = computeLayout(topology, blastRadius);
    const branch = getCurrentBranch(cwd);

    // Git state for diff viewing
    const committedDiffs = captureDiff(opts.base, cwd);
    const staged = captureStagedDiff(cwd);
    const unstaged = captureUnstagedDiff(cwd);
    const commits = captureCommits(opts.base, cwd);

    return {
      topology,
      layout,
      blastRadius,
      git: {
        branch,
        base: opts.base,
        committed: committedDiffs,
        staged,
        unstaged,
        commits,
        changedFiles,
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

  // Use the old topology for file watching (it knows about file patterns)
  const fileTopology = computeTopology(cwd);

  startWatcher({
    cwd,
    topology: fileTopology,
    debounceMs: opts.debounceMs,
    onChange: (changedFiles) => {
      console.log(`[watch] ${changedFiles.length} file(s) changed`);
      // Invalidate topology cache so it re-parses
      cachedTopology = null;
      pushState();
    },
  });

  // Poll for git state changes (commits, staging) every 2s
  setInterval(() => {
    pushState();
  }, 2000);

  console.log(`Differ watch → http://localhost:${opts.port}`);
  if (useReact) {
    console.log(`[watch] React project detected — using semantic topology`);
  }
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
    return parseDiff(raw);
  } catch {
    return [];
  }
}

function captureUnstagedDiff(cwd: string): { file: string; hunks: string; status: "A" | "D" | "M" | "R" }[] {
  try {
    const raw = execSync("git diff", { cwd, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    if (!raw.trim()) return [];
    return parseDiff(raw);
  } catch {
    return [];
  }
}
