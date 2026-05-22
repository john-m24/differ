import ts from "typescript";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, basename, extname } from "node:path";
import type { Framework } from "./parser.js";

export interface RouteInfo {
  path: string;
  componentName: string;
  filePath: string;
}

export function detectRoutes(cwd: string, framework: Framework): RouteInfo[] {
  switch (framework) {
    case "nextjs":
      return detectNextjsRoutes(cwd);
    case "remix":
      return detectRemixRoutes(cwd);
    default:
      return [];
  }
}

function detectNextjsRoutes(cwd: string): RouteInfo[] {
  const routes: RouteInfo[] = [];

  // App router: app/
  const appDir = join(cwd, "app");
  if (existsSync(appDir)) {
    scanNextAppDir(appDir, cwd, "/", routes);
  }

  // Pages router: pages/ or src/pages/
  for (const pagesDir of [join(cwd, "pages"), join(cwd, "src", "pages")]) {
    if (existsSync(pagesDir)) {
      scanNextPagesDir(pagesDir, cwd, "/", routes);
    }
  }

  return routes;
}

function scanNextAppDir(dir: string, cwd: string, routePrefix: string, routes: RouteInfo[]) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

    if (entry.isFile()) {
      const name = basename(entry.name, extname(entry.name));
      if (name === "page" || name === "layout") {
        const rel = relative(cwd, join(dir, entry.name));
        const componentName = deriveComponentName(rel);
        routes.push({
          path: routePrefix === "/" ? "/" : routePrefix,
          componentName,
          filePath: rel,
        });
      }
    }

    if (entry.isDirectory()) {
      const segment = entry.name.startsWith("(")
        ? ""  // route groups in Next.js are invisible
        : entry.name.startsWith("[")
          ? `:${entry.name.replace(/[\[\]]/g, "")}`
          : entry.name;
      const nextPrefix = segment
        ? `${routePrefix === "/" ? "" : routePrefix}/${segment}`
        : routePrefix;
      scanNextAppDir(join(dir, entry.name), cwd, nextPrefix, routes);
    }
  }
}

function scanNextPagesDir(dir: string, cwd: string, routePrefix: string, routes: RouteInfo[]) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_") || entry.name === "api") continue;

    const full = join(dir, entry.name);
    if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      const name = basename(entry.name, extname(entry.name));
      const rel = relative(cwd, full);
      const route = name === "index"
        ? routePrefix
        : `${routePrefix === "/" ? "" : routePrefix}/${name.replace(/\[([^\]]+)\]/g, ":$1")}`;
      routes.push({
        path: route,
        componentName: deriveComponentName(rel),
        filePath: rel,
      });
    }

    if (entry.isDirectory()) {
      const segment = entry.name.startsWith("[")
        ? `:${entry.name.replace(/[\[\]]/g, "")}`
        : entry.name;
      scanNextPagesDir(full, cwd, `${routePrefix === "/" ? "" : routePrefix}/${segment}`, routes);
    }
  }
}

function detectRemixRoutes(cwd: string): RouteInfo[] {
  const routes: RouteInfo[] = [];
  const routesDir = join(cwd, "app", "routes");
  if (!existsSync(routesDir)) return routes;

  let entries;
  try { entries = readdirSync(routesDir, { withFileTypes: true }); } catch { return routes; }

  for (const entry of entries) {
    if (!entry.isFile() || !/\.(tsx?|jsx?)$/.test(entry.name)) continue;
    const name = basename(entry.name, extname(entry.name));
    const rel = relative(cwd, join(routesDir, entry.name));

    // Remix flat route convention: dots become path segments
    const route = "/" + name
      .replace(/\./g, "/")
      .replace(/_index$/, "")
      .replace(/\$(\w+)/g, ":$1");

    routes.push({
      path: route || "/",
      componentName: deriveComponentName(rel),
      filePath: rel,
    });
  }

  return routes;
}

function deriveComponentName(filePath: string): string {
  const name = basename(filePath, extname(filePath));
  // PascalCase the filename
  return name
    .split(/[-_.]/)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}
