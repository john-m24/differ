import { mkdirSync, existsSync, writeFileSync, copyFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync, spawnSync } from "node:child_process";
import { initTopology } from "./init.js";
import { captureDiff, mapDiffsToNodes } from "./diff.js";
import { analyzeDiff } from "./analyze.js";
import { startServer } from "./server.js";
import type { Topology } from "./types.js";

export interface PersonalModeOptions {
  base: string;
  port: string;
  intent?: string;
  model?: string;
}

export function ensureDotDiffer(repoRoot: string): string {
  const dotDiffer = join(repoRoot, ".differ");
  mkdirSync(join(dotDiffer, "sessions"), { recursive: true });

  const gitignorePath = join(dotDiffer, ".gitignore");
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, "*\n");
  }

  return dotDiffer;
}

export function resolveTopology(repoRoot: string): { path: string; source: "root" | "personal" } {
  const rootPath = join(repoRoot, "topology.json");
  if (existsSync(rootPath)) {
    return { path: rootPath, source: "root" };
  }

  const personalPath = join(repoRoot, ".differ", "topology.json");
  if (existsSync(personalPath)) {
    return { path: personalPath, source: "personal" };
  }

  initTopology({ dir: repoRoot, output: personalPath });
  return { path: personalPath, source: "personal" };
}

export function promoteTopology(repoRoot: string): void {
  const personalPath = join(repoRoot, ".differ", "topology.json");
  if (!existsSync(personalPath)) {
    console.error("No personal topology found at .differ/topology.json");
    console.error("Run `differ` first to auto-scaffold one, or create it manually.");
    process.exit(1);
  }

  const rootPath = join(repoRoot, "topology.json");
  if (existsSync(rootPath)) {
    console.log("Overwriting existing topology.json in repo root.");
  }

  copyFileSync(personalPath, rootPath);
  console.log("Promoted .differ/topology.json → topology.json");
  console.log("Your topology is now ready for team use and CI.");
}

export function runPersonalMode(opts: PersonalModeOptions): void {
  let repoRoot: string;
  try {
    repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
  } catch {
    console.error("Not a git repository. Run `differ` from within a git repo.");
    process.exit(1);
  }

  console.log("\ndiffer — personal review\n");

  const dotDiffer = ensureDotDiffer(repoRoot);

  const { path: topologyPath, source } = resolveTopology(repoRoot);
  const sourceLabel = source === "root" ? "topology.json (committed)" : ".differ/topology.json (personal)";
  console.log(`  Topology: ${sourceLabel}`);

  const fileDiffs = captureDiff(opts.base, repoRoot);
  if (fileDiffs.length === 0) {
    console.log(`  No changes detected against ${opts.base}. Nothing to review.\n`);
    process.exit(0);
  }
  console.log(`  Diff: ${fileDiffs.length} file(s) against ${opts.base}`);

  const topology: Topology = JSON.parse(readFileSync(topologyPath, "utf-8"));
  const nodeDiffs = mapDiffsToNodes(fileDiffs, topology);

  const which = spawnSync("which", ["claude"], { encoding: "utf-8" });
  if (which.status !== 0) {
    console.error("\n  Claude CLI not found.");
    console.error("  Install it: https://docs.anthropic.com/en/docs/claude-code\n");
    process.exit(1);
  }

  const model = opts.model || "sonnet";
  process.stdout.write(`  Analyzing with Claude (${model})...`);

  const deltaPath = join(dotDiffer, "SYSTEM_DELTA.json");
  const delta = analyzeDiff({
    fileDiffs,
    nodeDiffs,
    topology,
    intent: opts.intent,
    model,
  });
  writeFileSync(deltaPath, JSON.stringify(delta, null, 2) + "\n");
  console.log(" done\n");

  startServer({
    topologyPath,
    deltaPath,
    base: opts.base,
    port: parseInt(opts.port),
  });
}
