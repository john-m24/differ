import ts from "typescript";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";

const IGNORE = new Set([
  "node_modules", "dist", "build", ".git", ".differ", "coverage",
  "__pycache__", ".next", ".nuxt", "vendor", ".turbo", "out",
]);

const REACT_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);

export function scanSourceFiles(cwd: string): string[] {
  const files: string[] = [];
  const stack = [cwd];

  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") || IGNORE.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && REACT_EXTENSIONS.has(extname(entry.name))) {
        files.push(relative(cwd, full));
      }
    }
  }

  return files;
}

export function parseFile(cwd: string, filePath: string): ts.SourceFile {
  const fullPath = join(cwd, filePath);
  const content = readFileSync(fullPath, "utf-8");
  return ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS
  );
}

export function isReactProject(cwd: string): boolean {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return !!(pkg.dependencies?.react || pkg.devDependencies?.react);
  } catch {
    return false;
  }
}

export type Framework = "nextjs" | "remix" | "vite-react" | "cra" | "generic";

export function detectFramework(cwd: string): Framework {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return "generic";
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    if (pkg.dependencies?.next) return "nextjs";
    if (pkg.dependencies?.["@remix-run/react"]) return "remix";
    if (pkg.devDependencies?.vite && existsSync(join(cwd, "vite.config.ts"))) return "vite-react";
    if (pkg.dependencies?.["react-scripts"]) return "cra";
  } catch {}
  return "generic";
}
