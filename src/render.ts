import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Topology } from "./types.js";
import type { NodeDiff } from "./diff.js";
import { computeLayout } from "./layout.js";
import { CSS } from "./render-css.js";

function getClientScript(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  try {
    return readFileSync(join(__dirname, "index.global.js"), "utf-8");
  } catch {
    return "console.error('Client bundle not found. Run: npm run build');";
  }
}

function getReactFlowCSS(): string {
  try {
    const rfPath = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "@xyflow", "react", "dist", "style.css");
    return readFileSync(rfPath, "utf-8");
  } catch {
    try {
      return readFileSync(join(process.cwd(), "node_modules", "@xyflow", "react", "dist", "style.css"), "utf-8");
    } catch {
      return "";
    }
  }
}

export function renderReview(
  topology: Topology,
  nodeDiffs?: NodeDiff[]
): string {
  const layout = computeLayout(topology, nodeDiffs);
  const data = JSON.stringify({
    topology,
    layout,
    git: {
      branch: "unknown",
      base: "main",
      committed: nodeDiffs || [],
      staged: [],
      unstaged: [],
      commits: [],
    },
  })
    .replace(/<\//g, "<\\/")
    .replace(/<!--/g, "<\\!--");

  const clientScript = getClientScript();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Differ</title>
<style>
${getReactFlowCSS()}
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
