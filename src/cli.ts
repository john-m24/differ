import { program } from "commander";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderReview } from "./render.js";
import { captureDiff, captureCommits, mapDiffsToNodes } from "./diff.js";
import { startServer } from "./server.js";
import { startWatchServer } from "./watch-server.js";
import { runHistory } from "./history.js";
import { computeTopology } from "./topology.js";
import type { Topology, SystemDelta } from "./types.js";

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

program
  .name("differ")
  .description("Architecture monitoring — watch how your system evolves")
  .version("0.2.0");

program
  .command("review")
  .description("Generate an interactive diff review")
  .option("-o, --output <path>", "output HTML file", "review.html")
  .option("-b, --base <ref>", "git base ref for diff", "origin/main")
  .option("-d, --delta <path>", "path to SYSTEM_DELTA.json (optional)")
  .action((opts) => {
    const cwd = process.cwd();
    const outputPath = resolve(opts.output);
    const topology = computeTopology(cwd);

    let delta = EMPTY_DELTA;
    if (opts.delta && existsSync(resolve(opts.delta))) {
      delta = JSON.parse(readFileSync(resolve(opts.delta), "utf-8"));
    }

    const fileDiffs = captureDiff(opts.base, cwd);
    const commits = captureCommits(opts.base, cwd);
    const nodeDiffs = fileDiffs.length > 0 ? mapDiffsToNodes(fileDiffs, topology) : [];

    if (fileDiffs.length > 0) {
      console.log(`Captured diff: ${fileDiffs.length} file(s) mapped to ${nodeDiffs.length} node(s)`);
    }
    if (commits.length > 0) {
      console.log(`Captured ${commits.length} commit(s)`);
    }

    const html = renderReview(topology, delta, nodeDiffs, commits);
    writeFileSync(outputPath, html);
    console.log(`Review written to ${outputPath}`);
  });

program
  .command("serve")
  .description("Start a local server with live diff view")
  .option("-b, --base <ref>", "git base ref for diff", "origin/main")
  .option("-d, --delta <path>", "path to SYSTEM_DELTA.json (optional)")
  .option("-p, --port <port>", "port to serve on", "3141")
  .action((opts) => {
    startServer({
      deltaPath: opts.delta ? resolve(opts.delta) : undefined,
      base: opts.base,
      port: parseInt(opts.port),
    });
  });

program
  .command("watch")
  .description("Watch source files and show live structural activity")
  .option("-b, --base <ref>", "git base ref for diff", "origin/main")
  .option("-p, --port <port>", "port to serve on", "3141")
  .option("--debounce <ms>", "debounce delay in ms", "1500")
  .option("--fresh", "start a fresh timeline session")
  .action((opts) => {
    startWatchServer({
      base: opts.base,
      port: parseInt(opts.port),
      debounceMs: parseInt(opts.debounce),
      fresh: opts.fresh || false,
    });
  });

program
  .command("history")
  .description("Query the timeline database")
  .option("-n, --node <id>", "filter to a specific node")
  .option("-d, --days <n>", "look back N days", "30")
  .option("--stats", "show aggregate statistics")
  .option("--format <fmt>", "output format: table or json", "table")
  .option("--limit <n>", "max results to show", "50")
  .action((opts) => {
    runHistory({
      node: opts.node,
      days: parseInt(opts.days),
      stats: opts.stats || false,
      format: opts.format,
      limit: parseInt(opts.limit),
    });
  });

program.parse();
