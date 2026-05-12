import { program } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderReview } from "./render.js";
import { initTopology } from "./init.js";
import { captureDiff, mapDiffsToNodes } from "./diff.js";
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
  .command("init")
  .description("Scaffold a topology.json by detecting repo structure")
  .option("-d, --dir <path>", "directory to scan", ".")
  .option("-o, --output <path>", "output file path", "topology.json")
  .action((opts) => {
    initTopology({ dir: resolve(opts.dir), output: resolve(opts.output) });
  });

program.parse();
