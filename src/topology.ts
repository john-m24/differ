import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";

export interface TopologyNode {
  id: string;
  path: string;
  files: string[];
}

export interface TopologyEdge {
  from: string;
  to: string;
  weight: number;
}

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface TopologyConfig {
  src?: string;
  ignore?: string[];
  granularity?: "directory" | "file";
}

const DEFAULT_IGNORE = [
  "node_modules",
  "dist",
  "build",
  ".git",
  ".differ",
  "coverage",
  "__pycache__",
  ".next",
  ".nuxt",
  "vendor",
];

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".rb",
  ".php",
]);

export function computeTopology(cwd: string, config?: TopologyConfig): Topology {
  const ignore = new Set([...DEFAULT_IGNORE, ...(config?.ignore ?? [])]);
  if (config?.granularity === "directory") {
    const nodes = detectNodes(cwd, ignore, config);
    const edges = detectEdges(cwd, nodes);
    return { nodes, edges };
  }
  return computeFileTopology(cwd, ignore, config);
}

function computeFileTopology(cwd: string, ignore: Set<string>, config?: TopologyConfig): Topology {
  const srcDir = config?.src ?? "src";
  const srcPath = join(cwd, srcDir);
  const scanDir = existsSync(srcPath) && statSync(srcPath).isDirectory() ? srcPath : cwd;

  const allFiles = collectSourceFiles(scanDir, ignore);
  const nodes: TopologyNode[] = allFiles.map((f) => {
    const rel = relative(cwd, f);
    const name = relative(cwd, f).replace(/^src\//, "");
    return { id: name, path: rel, files: [rel] };
  });

  const edges = detectEdges(cwd, nodes);
  return { nodes, edges };
}

function detectNodes(cwd: string, ignore: Set<string>, config?: TopologyConfig): TopologyNode[] {
  // Check for monorepo workspaces first
  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.workspaces) {
        const patterns: string[] = Array.isArray(pkg.workspaces)
          ? pkg.workspaces
          : pkg.workspaces.packages ?? [];
        const nodes = resolveWorkspaceNodes(cwd, patterns, ignore);
        if (nodes.length > 0) return nodes;
      }
    } catch {}
  }

  // Look for src directory
  const srcDir = config?.src ?? "src";
  const srcPath = join(cwd, srcDir);

  if (existsSync(srcPath) && statSync(srcPath).isDirectory()) {
    return detectDirectoryNodes(srcPath, cwd, ignore);
  }

  // Fallback: top-level directories
  return detectDirectoryNodes(cwd, cwd, ignore);
}

function resolveWorkspaceNodes(
  cwd: string,
  patterns: string[],
  ignore: Set<string>
): TopologyNode[] {
  const nodes: TopologyNode[] = [];

  for (const pattern of patterns) {
    const base = pattern.replace(/\/\*$/, "");
    const basePath = join(cwd, base);
    if (!existsSync(basePath) || !statSync(basePath).isDirectory()) continue;

    const entries = readdirSync(basePath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || ignore.has(entry.name)) continue;
      const fullPath = join(basePath, entry.name);
      const relPath = relative(cwd, fullPath);
      const files = collectSourceFiles(fullPath, ignore);
      if (files.length > 0) {
        nodes.push({
          id: entry.name,
          path: relPath,
          files: files.map((f) => relative(cwd, f)),
        });
      }
    }
  }

  return nodes;
}

function detectDirectoryNodes(
  dir: string,
  cwd: string,
  ignore: Set<string>
): TopologyNode[] {
  const nodes: TopologyNode[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  // Directories become nodes
  for (const entry of entries) {
    if (!entry.isDirectory() || ignore.has(entry.name) || entry.name.startsWith(".")) continue;
    const fullPath = join(dir, entry.name);
    const relPath = relative(cwd, fullPath);
    const files = collectSourceFiles(fullPath, ignore);
    if (files.length > 0) {
      nodes.push({
        id: entry.name,
        path: relPath,
        files: files.map((f) => relative(cwd, f)),
      });
    }
  }

  // Root-level source files grouped as one node
  const rootFiles = entries
    .filter((e) => e.isFile() && SOURCE_EXTENSIONS.has(extOf(e.name)))
    .map((e) => relative(cwd, join(dir, e.name)));

  if (rootFiles.length > 0) {
    const id = dir === cwd ? "root" : relative(cwd, dir) + "/root";
    nodes.push({ id, path: relative(cwd, dir) || ".", files: rootFiles });
  }

  return nodes;
}

function collectSourceFiles(dir: string, ignore: Set<string>): string[] {
  const results: string[] = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") || ignore.has(entry.name)) continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extOf(entry.name))) {
        results.push(full);
      }
    }
  }

  return results;
}

function detectEdges(cwd: string, nodes: TopologyNode[]): TopologyEdge[] {
  const fileToNode = new Map<string, string>();
  for (const node of nodes) {
    for (const file of node.files) {
      fileToNode.set(file, node.id);
    }
  }

  // Map directory paths to node ids for resolving imports
  const dirToNode = new Map<string, string>();
  for (const node of nodes) {
    dirToNode.set(node.path, node.id);
  }

  const edgeWeights = new Map<string, number>();

  for (const node of nodes) {
    for (const file of node.files) {
      const fullPath = join(cwd, file);
      const imports = extractImports(fullPath);

      for (const imp of imports) {
        const resolvedNode = resolveImportToNode(imp, file, cwd, fileToNode, dirToNode, nodes);
        if (resolvedNode && resolvedNode !== node.id) {
          const key = `${node.id}→${resolvedNode}`;
          edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1);
        }
      }
    }
  }

  return Array.from(edgeWeights.entries()).map(([key, weight]) => {
    const [from, to] = key.split("→");
    return { from, to, weight };
  });
}

function extractImports(filePath: string): string[] {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }

  const imports: string[] = [];

  // ES imports: import ... from "..."
  const esImportRe = /(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = esImportRe.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Dynamic imports: import("...")
  const dynamicRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicRe.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // CommonJS: require("...")
  const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRe.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Only keep relative imports (skip node_modules packages)
  return imports.filter((i) => i.startsWith(".") || i.startsWith("/"));
}

function resolveImportToNode(
  importPath: string,
  fromFile: string,
  cwd: string,
  fileToNode: Map<string, string>,
  dirToNode: Map<string, string>,
  nodes: TopologyNode[]
): string | null {
  const fromDir = dirname(join(cwd, fromFile));
  let resolved = resolve(fromDir, importPath);
  let relResolved = relative(cwd, resolved);

  // Try exact match
  if (fileToNode.has(relResolved)) return fileToNode.get(relResolved)!;

  // Try with extensions
  for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs"]) {
    const withExt = relResolved + ext;
    if (fileToNode.has(withExt)) return fileToNode.get(withExt)!;
    // Strip .js extension and try .ts (common in ESM TypeScript)
    if (relResolved.endsWith(".js")) {
      const swapped = relResolved.slice(0, -3) + ext;
      if (fileToNode.has(swapped)) return fileToNode.get(swapped)!;
    }
  }

  // Try as directory with index
  for (const idx of ["index.ts", "index.tsx", "index.js", "index.mjs"]) {
    const indexPath = join(relResolved, idx);
    if (fileToNode.has(indexPath)) return fileToNode.get(indexPath)!;
  }

  // Fall back to directory-based matching: which node's path is a prefix?
  for (const node of nodes) {
    if (relResolved.startsWith(node.path + "/") || relResolved === node.path) {
      return node.id;
    }
  }

  return null;
}

export function fileToNodeId(filePath: string, nodes: TopologyNode[]): string | null {
  for (const node of nodes) {
    if (node.files.includes(filePath)) return node.id;
  }
  // Prefix match for new files not yet in the computed list
  for (const node of nodes) {
    if (filePath.startsWith(node.path + "/")) return node.id;
  }
  return null;
}

function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot);
}
