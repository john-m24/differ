import type { Topology, SystemDelta, CommitInfo } from "./types.js";
import type { NodeDiff } from "./diff.js";
import { computeLayout } from "./layout.js";
import { CSS } from "./render-css.js";
import { SCRIPT } from "./render-script.js";

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
<div id="app">
  <div class="commit-bar" id="commit-bar"></div>
  <div class="panels">
    <aside class="panel-left" id="file-tree"></aside>
    <div class="panel-divider" data-resize="left"></div>
    <main class="panel-center" id="diff-view"></main>
    <div class="panel-divider" data-resize="right"></div>
    <aside class="panel-right" id="graph-panel">
      <div class="graph-toolbar" id="filters">
        <button class="filter-btn active" data-status="changed">Changed</button>
        <button class="filter-btn active" data-status="added">Added</button>
        <button class="filter-btn active" data-status="removed">Removed</button>
        <button class="filter-btn active" data-status="blast-radius">Blast radius</button>
        <button class="filter-btn" data-status="unchanged">Unchanged</button>
      </div>
      <div class="graph-area"><svg id="graph"></svg></div>
    </aside>
  </div>
</div>
<script>
const DATA = ${data};
${SCRIPT}
</script>
</body>
</html>`;
}
