import { program } from "commander";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderReview } from "./render.js";
import { initTopology } from "./init.js";
import { captureDiff, mapDiffsToNodes } from "./diff.js";
import { analyzeDiff, buildPrompt } from "./analyze.js";
import { startServer } from "./server.js";
import { startWatchServer } from "./watch-server.js";
import type { Topology, SystemDelta } from "./types.js";

program
  .name("differ")
  .description("Systems-level code review — topology first, code second")
  .version("0.1.0");

program
  .command("review")
  .description("Generate an interactive review from topology + delta")
  .option("-t, --topology <path>", "path to topology.json", "topology.json")
  .option("-d, --delta <path>", "path to SYSTEM_DELTA.json", "SYSTEM_DELTA.json")
  .option("-o, --output <path>", "output HTML file", "review.html")
  .option("-b, --base <ref>", "git base ref for diff", "origin/main")
  .option("--no-diff", "skip git diff capture")
  .action((opts) => {
    const topologyPath = resolve(opts.topology);
    const deltaPath = resolve(opts.delta);
    const outputPath = resolve(opts.output);

    const topology: Topology = JSON.parse(readFileSync(topologyPath, "utf-8"));
    const delta: SystemDelta = JSON.parse(readFileSync(deltaPath, "utf-8"));

    let nodeDiffs = undefined;
    if (opts.diff !== false) {
      const fileDiffs = captureDiff(opts.base, process.cwd());
      if (fileDiffs.length > 0) {
        nodeDiffs = mapDiffsToNodes(fileDiffs, topology);
        console.log(`Captured diff: ${fileDiffs.length} file(s) mapped to ${nodeDiffs.length} node(s)`);
      }
    }

    const html = renderReview(topology, delta, nodeDiffs);
    writeFileSync(outputPath, html);

    console.log(`Review written to ${outputPath}`);
  });

program
  .command("serve")
  .description("Start a local server with live topology editing via chat")
  .option("-t, --topology <path>", "path to topology.json", "topology.json")
  .option("-d, --delta <path>", "path to SYSTEM_DELTA.json", "SYSTEM_DELTA.json")
  .option("-b, --base <ref>", "git base ref for diff", "origin/main")
  .option("-p, --port <port>", "port to serve on", "3141")
  .action((opts) => {
    startServer({
      topologyPath: resolve(opts.topology),
      deltaPath: resolve(opts.delta),
      base: opts.base,
      port: parseInt(opts.port),
    });
  });

program
  .command("analyze")
  .description("Generate SYSTEM_DELTA.json from git diff using Claude")
  .option("-t, --topology <path>", "path to topology.json", "topology.json")
  .option("-o, --output <path>", "output SYSTEM_DELTA.json path", "SYSTEM_DELTA.json")
  .option("-b, --base <ref>", "git base ref for diff", "origin/main")
  .option("-i, --intent <text>", "hint about what the changes achieve")
  .option("-m, --model <model>", "Claude model to use", "sonnet")
  .option("--verbose", "print prompt and raw response")
  .option("--dry-run", "print prompt without calling Claude")
  .action((opts) => {
    const topologyPath = resolve(opts.topology);
    const outputPath = resolve(opts.output);

    const fileDiffs = captureDiff(opts.base, process.cwd());
    if (fileDiffs.length === 0) {
      console.log("No changes to analyze.");
      return;
    }

    let topology: Topology | null = null;
    let nodeDiffs: ReturnType<typeof mapDiffsToNodes> | null = null;

    if (existsSync(topologyPath)) {
      topology = JSON.parse(readFileSync(topologyPath, "utf-8"));
      nodeDiffs = mapDiffsToNodes(fileDiffs, topology!);
      console.log(
        `Diff: ${fileDiffs.length} file(s) mapped to ${nodeDiffs.length} node(s)`
      );
    } else {
      console.log("No topology.json found — analyzing diff without node mapping.");
    }

    if (opts.dryRun) {
      const prompt = buildPrompt({
        fileDiffs,
        nodeDiffs,
        topology,
        intent: opts.intent,
      });
      console.log(prompt);
      return;
    }

    console.log("Analyzing with Claude...");
    const delta = analyzeDiff({
      fileDiffs,
      nodeDiffs,
      topology,
      intent: opts.intent,
      model: opts.model,
      verbose: opts.verbose,
    });

    writeFileSync(outputPath, JSON.stringify(delta, null, 2) + "\n");
    console.log(`Analysis written to ${outputPath}`);
  });

program
  .command("watch")
  .description("Watch source files and show live structural activity")
  .option("-t, --topology <path>", "path to topology.json", "topology.json")
  .option("-d, --delta <path>", "path to SYSTEM_DELTA.json", "SYSTEM_DELTA.json")
  .option("-b, --base <ref>", "git base ref for diff", "origin/main")
  .option("-p, --port <port>", "port to serve on", "3141")
  .option("--debounce <ms>", "debounce delay in ms", "1500")
  .option("--fresh", "start a fresh timeline session")
  .action((opts) => {
    startWatchServer({
      topologyPath: resolve(opts.topology),
      deltaPath: resolve(opts.delta),
      base: opts.base,
      port: parseInt(opts.port),
      debounceMs: parseInt(opts.debounce),
      fresh: opts.fresh || false,
    });
  });

program
  .command("init")
  .description("Scaffold a topology.json by detecting repo structure")
  .option("-d, --dir <path>", "directory to scan", ".")
  .option("-o, --output <path>", "output file path", "topology.json")
  .action((opts) => {
    initTopology({ dir: resolve(opts.dir), output: resolve(opts.output) });
  });

program.parse();
