import { readdirSync, existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import type { Topology, TopologyNode } from "./types.js";

interface InitOptions {
  dir: string;
  output: string;
}

export function initTopology(opts: InitOptions): void {
  const dir = resolve(opts.dir);
  const outputPath = resolve(opts.output);

  if (existsSync(outputPath)) {
    console.log(`topology.json already exists at ${outputPath}`);
    console.log("Use --output to write to a different path, or delete the existing file.");
    return;
  }

  const nodes = detectNodes(dir);
  const topology: Topology = { nodes, edges: [] };

  writeFileSync(outputPath, JSON.stringify(topology, null, 2) + "\n");
  console.log(`Wrote topology.json with ${nodes.length} detected node(s) to ${outputPath}`);

  if (nodes.length === 0) {
    console.log("\nNo nodes detected automatically. Edit topology.json to define your system's components.");
  } else {
    console.log("\nDetected nodes:");
    nodes.forEach((n) => console.log(`  - ${n.id} (${n.type}) → ${n.files.join(", ")}`));
    console.log("\nNext steps:");
    console.log("  1. Review and edit the detected nodes");
    console.log("  2. Add edges to describe relationships between nodes");
    console.log("  3. Add descriptions to each node");
  }
}

function detectNodes(dir: string): TopologyNode[] {
  const nodes: TopologyNode[] = [];

  const pkgPath = join(dir, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

    if (pkg.workspaces) {
      const workspaces = Array.isArray(pkg.workspaces)
        ? pkg.workspaces
        : pkg.workspaces.packages || [];
      workspaces.forEach((ws: string) => {
        const name = ws.replace(/\/\*$/, "").split("/").pop() || ws;
        nodes.push({
          id: toPascalCase(name),
          type: "workspace",
          files: [ws.endsWith("/*") ? ws + "*" : ws + "/**"],
          description: "",
        });
      });
    }
  }

  if (nodes.length === 0) {
    const srcDir = join(dir, "src");
    if (existsSync(srcDir)) {
      const entries = safeReaddir(srcDir);
      entries.forEach((entry) => {
        const fullPath = join(srcDir, entry);
        if (isDirectory(fullPath)) {
          nodes.push({
            id: toPascalCase(entry),
            type: "module",
            files: [`src/${entry}/**`],
            description: "",
          });
        }
      });
    }
  }

  if (nodes.length === 0) {
    const topLevel = safeReaddir(dir);
    const ignoreDirs = new Set([
      "node_modules", ".git", "dist", "build", "coverage",
      ".context", ".claude", "examples", "test", "tests", "__tests__",
    ]);
    topLevel.forEach((entry) => {
      if (ignoreDirs.has(entry) || entry.startsWith(".")) return;
      const fullPath = join(dir, entry);
      if (isDirectory(fullPath)) {
        nodes.push({
          id: toPascalCase(entry),
          type: "directory",
          files: [`${entry}/**`],
          description: "",
        });
      }
    });
  }

  return nodes;
}

function toPascalCase(s: string): string {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s/g, "");
}

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
