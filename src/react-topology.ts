import { join, dirname, relative, extname } from "node:path";
import { scanSourceFiles, parseFile, detectFramework } from "./react-ast/parser.js";
import { detectNodes } from "./react-ast/detect-components.js";
import { detectEdges } from "./react-ast/detect-edges.js";
import { detectRoutes } from "./react-ast/detect-routes.js";
import { detectProps } from "./react-ast/detect-props.js";
import type { ReactNode, ReactEdge, ReactTopology, FileParseResult } from "./react-ast/types.js";

export type { ReactNode, ReactEdge, ReactTopology } from "./react-ast/types.js";

export function computeReactTopology(cwd: string): ReactTopology {
  const framework = detectFramework(cwd);
  const files = scanSourceFiles(cwd);
  const fileResults: FileParseResult[] = [];

  // Pass 1: detect all nodes (components, hooks, stores, contexts)
  for (const filePath of files) {
    let sourceFile;
    try {
      sourceFile = parseFile(cwd, filePath);
    } catch {
      continue;
    }

    const nodes = detectNodes(sourceFile, filePath);
    if (nodes.length === 0) continue;

    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = detectEdges(sourceFile, filePath, nodeIds);

    fileResults.push({
      filePath,
      nodes,
      ...edges,
    });
  }

  // Collect all nodes
  const allNodes: ReactNode[] = [];
  for (const result of fileResults) {
    allNodes.push(...result.nodes);
  }

  // Build import resolution map: localName in file → target node ID
  const nodeByExportedName = new Map<string, ReactNode>();
  for (const node of allNodes) {
    if (node.exported) {
      nodeByExportedName.set(`${node.filePath}:${node.name}`, node);
    }
  }

  // Resolve imports to node IDs
  const importResolution = buildImportResolution(fileResults, allNodes, cwd);

  // Pass 2: resolve edges
  const allEdges: ReactEdge[] = [];

  for (const result of fileResults) {
    // Resolve JSX references → renders edges
    for (const ref of result.jsxReferences) {
      const targetId = importResolution.get(`${result.filePath}:${ref.referencedName}`);
      if (targetId && targetId !== ref.componentId) {
        allEdges.push({ from: ref.componentId, to: targetId, kind: "renders" });
      }
    }

    // Resolve hook calls → uses-hook or subscribes edges
    for (const call of result.hookCalls) {
      const targetId = importResolution.get(`${result.filePath}:${call.hookName}`);
      if (targetId) {
        const targetNode = allNodes.find(n => n.id === targetId);
        if (targetNode?.kind === "store") {
          allEdges.push({
            from: call.componentId,
            to: targetId,
            kind: "subscribes",
            subscribedKeys: call.subscribedKeys,
          });
        } else {
          allEdges.push({ from: call.componentId, to: targetId, kind: "uses-hook" });
        }
      } else {
        // Hook defined in same file
        const localTarget = allNodes.find(
          n => n.filePath === result.filePath && n.name === call.hookName
        );
        if (localTarget) {
          const kind = localTarget.kind === "store" ? "subscribes" : "uses-hook";
          allEdges.push({
            from: call.componentId,
            to: localTarget.id,
            kind: kind as "subscribes" | "uses-hook",
            subscribedKeys: kind === "subscribes" ? call.subscribedKeys : undefined,
          });
        }
      }
    }

    // Resolve context providers → provides edges
    for (const prov of result.contextProviders) {
      const targetId = importResolution.get(`${result.filePath}:${prov.contextName}`);
      if (targetId) {
        allEdges.push({ from: prov.componentId, to: targetId, kind: "provides" });
      }
    }

    // Resolve context consumers → consumes-context edges
    for (const cons of result.contextConsumers) {
      const targetId = importResolution.get(`${result.filePath}:${cons.contextName}`);
      if (targetId) {
        const targetNode = allNodes.find(n => n.id === targetId);
        if (targetNode?.kind === "context") {
          allEdges.push({ from: cons.componentId, to: targetId, kind: "consumes-context" });
        }
      }
    }
  }

  // Deduplicate edges
  const edgeSet = new Set<string>();
  const dedupedEdges: ReactEdge[] = [];
  for (const edge of allEdges) {
    const key = `${edge.from}→${edge.to}:${edge.kind}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      dedupedEdges.push(edge);
    }
  }

  // Detect routes and mark page nodes
  const routes = detectRoutes(cwd, framework);
  for (const route of routes) {
    const node = allNodes.find(n => n.filePath === route.filePath);
    if (node) {
      node.kind = "page";
      node.route = route.path;
    }
  }

  // Compute route nesting edges
  const pageNodes = allNodes.filter(n => n.kind === "page" && n.route);
  const sortedPages = [...pageNodes].sort((a, b) => a.route!.length - b.route!.length);
  for (const child of sortedPages) {
    let closestParent: ReactNode | null = null;
    for (const candidate of sortedPages) {
      if (candidate === child) continue;
      if (candidate.route!.length >= child.route!.length) continue;
      const isPrefix = candidate.route === "/"
        ? child.route !== "/"
        : child.route!.startsWith(candidate.route! + "/");
      if (isPrefix) {
        if (!closestParent || candidate.route!.length > closestParent.route!.length) {
          closestParent = candidate;
        }
      }
    }
    if (closestParent) {
      dedupedEdges.push({ from: closestParent.id, to: child.id, kind: "nests-route" });
    }
  }

  // Extract props for components
  for (const result of fileResults) {
    for (const node of result.nodes) {
      if (node.kind === "component" || node.kind === "page") {
        try {
          const sourceFile = parseFile(cwd, node.filePath);
          const props = detectProps(sourceFile, node.filePath, node.name);
          if (props.length > 0) node.props = props;
        } catch {}
      }
    }
  }

  return { nodes: allNodes, edges: dedupedEdges };
}

function buildImportResolution(
  fileResults: FileParseResult[],
  allNodes: ReactNode[],
  cwd: string
): Map<string, string> {
  // Map: "filePath:localName" → target node ID
  const resolution = new Map<string, string>();

  // Build export lookup: "filePath:exportedName" → node ID
  const exportLookup = new Map<string, string>();
  for (const node of allNodes) {
    if (node.exported) {
      exportLookup.set(`${node.filePath}:${node.name}`, node.id);
      // Default export shorthand
      exportLookup.set(`${node.filePath}:default`, node.id);
    }
  }

  for (const result of fileResults) {
    // Resolve each import to a node
    for (const imp of result.imports) {
      if (!imp.source.startsWith(".")) continue; // skip package imports

      // Resolve relative import path
      const fromDir = dirname(result.filePath);
      let resolved = resolveImportPath(fromDir, imp.source, allNodes);
      if (!resolved) continue;

      // Look up the exported name
      const targetKey = imp.importedName === "default"
        ? `${resolved}:default`
        : `${resolved}:${imp.importedName}`;

      const targetId = exportLookup.get(targetKey);
      if (targetId) {
        resolution.set(`${result.filePath}:${imp.localName}`, targetId);
      }
    }

    // Also resolve local references (same-file components)
    for (const node of result.nodes) {
      resolution.set(`${result.filePath}:${node.name}`, node.id);
    }
  }

  return resolution;
}

function resolveImportPath(fromDir: string, importPath: string, allNodes: ReactNode[]): string | null {
  // fromDir is relative (e.g. "src/client"), importPath is relative (e.g. "./components/GraphView.js")
  // Join them to get the resolved relative path
  const joined = join(fromDir, importPath).replace(/\\/g, "/");
  // Normalize: remove any leading "./"
  const rel = joined.startsWith("./") ? joined.slice(2) : joined;

  // Collect all known file paths
  const knownFiles = new Set(allNodes.map(n => n.filePath));

  // Try exact match
  if (knownFiles.has(rel)) return rel;

  // Try with extensions
  for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
    if (knownFiles.has(rel + ext)) return rel + ext;
    // Handle .js → .ts/.tsx
    if (rel.endsWith(".js")) {
      const swapped = rel.slice(0, -3) + ext;
      if (knownFiles.has(swapped)) return swapped;
    }
  }

  // Try as directory with index
  for (const idx of ["index.ts", "index.tsx", "index.js", "index.jsx"]) {
    const indexPath = `${rel}/${idx}`;
    if (knownFiles.has(indexPath)) return indexPath;
  }

  return null;
}
