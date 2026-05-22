import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Topology, SystemDelta, CommitInfo } from "./types.js";
import type { NodeDiff } from "./diff.js";
import { computeLayout } from "./layout.js";
import { CSS } from "./render-css.js";

function getClientScript(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  try {
    return readFileSync(join(__dirname, "index.global.js"), "utf-8");
  } catch {
    return "console.error('Client bundle not found. Run: npx tsup');";
  }
}

export function renderReview(
  topology: Topology,
  delta: SystemDelta,
  nodeDiffs?: NodeDiff[],
  commits?: CommitInfo[]
): string {
  const layout = computeLayout(topology, delta, nodeDiffs);
  const data = JSON.stringify({
    topology,
    delta,
    nodeDiffs: nodeDiffs || [],
    layout,
    commits: commits || [],
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
