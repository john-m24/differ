import type { Topology, SystemDelta } from "./types.js";
import type { NodeDiff } from "./diff.js";

export function renderReview(topology: Topology, delta: SystemDelta, nodeDiffs?: NodeDiff[]): string {
  const data = JSON.stringify({ topology, delta, nodeDiffs: nodeDiffs || [] })
    .replace(/<\//g, "<\\/")
    .replace(/<!--/g, "<\\!--");

  const scopeWarning =
    delta.scope_violations.length > 0
      ? `<div class="scope-warning">Scope violations: ${delta.scope_violations.map(escapeHtml).join("; ")}</div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Differ — System Review</title>
<style>
${CSS}
</style>
</head>
<body>
<div id="app">
  ${scopeWarning}
  <header>
    <h1>Differ</h1>
    <div class="tabs">
      <button class="tab active" data-view="summary">Summary</button>
      <button class="tab" data-view="graph">Graph</button>
    </div>
    <span class="intent-badge ${delta.intent_satisfied ? "satisfied" : "unsatisfied"}">
      ${delta.intent_satisfied ? "Intent satisfied" : "Intent NOT satisfied"}
    </span>
  </header>

  <div class="view-summary" id="view-summary">
    ${renderSummaryView(delta, topology)}
  </div>

  <div class="view-graph hidden" id="view-graph">
    <div class="filters" id="filters">
      <label class="filter-toggle active" data-status="changed"><span class="filter-swatch changed"></span>Changed</label>
      <label class="filter-toggle active" data-status="added"><span class="filter-swatch added"></span>Added</label>
      <label class="filter-toggle active" data-status="removed"><span class="filter-swatch removed"></span>Removed</label>
      <label class="filter-toggle active" data-status="blast-radius"><span class="filter-swatch blast-radius"></span>Blast radius</label>
      <label class="filter-toggle" data-status="unchanged"><span class="filter-swatch unchanged"></span>Unchanged</label>
    </div>
    <div class="layout">
      <div class="graph-container">
        <svg id="graph"></svg>
      </div>
      <div class="panel" id="panel">
        <div class="panel-empty">Click a node to inspect</div>
      </div>
    </div>
  </div>
</div>
<script>
const DATA = ${data};
${SCRIPT}
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSummaryView(delta: SystemDelta, topology: Topology): string {
  let html = '<div class="summary-content">';

  // Intent
  html += '<section class="summary-section">';
  html += `<h2>Intent</h2>`;
  html += `<p class="summary-intent">${escapeHtml(delta.intent)}</p>`;
  html += '</section>';

  // What changed — table of contents
  html += '<section class="summary-section">';
  html += '<h2>What Changed</h2>';
  html += '<div class="summary-changes">';

  if (delta.changed.length > 0) {
    delta.changed.forEach((c) => {
      const node = topology.nodes.find((n) => n.id === c.id);
      html += `<div class="summary-change-item changed">`;
      html += `<div class="sci-header"><span class="sci-badge changed">changed</span><strong>${escapeHtml(c.id)}</strong></div>`;
      html += `<p class="sci-desc">${escapeHtml(c.summary)}</p>`;
      if (c.structural_changes.length > 0) {
        html += `<ul class="sci-structural">`;
        c.structural_changes.forEach((sc) => {
          html += `<li>${escapeHtml(sc)}</li>`;
        });
        html += `</ul>`;
      }
      html += `</div>`;
    });
  }

  if (delta.added.length > 0) {
    delta.added.forEach((id) => {
      const node = topology.nodes.find((n) => n.id === id);
      html += `<div class="summary-change-item added">`;
      html += `<div class="sci-header"><span class="sci-badge added">added</span><strong>${escapeHtml(id)}</strong></div>`;
      if (node) html += `<p class="sci-desc">${escapeHtml(node.description)}</p>`;
      html += `</div>`;
    });
  }

  if (delta.removed.length > 0) {
    delta.removed.forEach((id) => {
      html += `<div class="summary-change-item removed">`;
      html += `<div class="sci-header"><span class="sci-badge removed">removed</span><strong>${escapeHtml(id)}</strong></div>`;
      html += `</div>`;
    });
  }

  if (delta.moved.length > 0) {
    delta.moved.forEach((m) => {
      html += `<div class="summary-change-item moved">`;
      html += `<div class="sci-header"><span class="sci-badge moved">moved</span><strong>${escapeHtml(m.what)}</strong></div>`;
      html += `<p class="sci-desc">${escapeHtml(m.from)} → ${escapeHtml(m.to)}</p>`;
      html += `</div>`;
    });
  }

  html += '</div></section>';

  // Blast radius
  if (delta.blast_radius.length > 0) {
    html += '<section class="summary-section">';
    html += '<h2>Blast Radius</h2>';
    html += '<p class="summary-blast-desc">These nodes may be affected but were not directly modified:</p>';
    html += '<div class="summary-blast-list">';
    delta.blast_radius.forEach((id) => {
      const node = topology.nodes.find((n) => n.id === id);
      html += `<div class="summary-blast-item"><strong>${escapeHtml(id)}</strong>`;
      if (node) html += ` — ${escapeHtml(node.description)}`;
      html += `</div>`;
    });
    html += '</div></section>';
  }

  // Decision trace
  if (delta.decision_trace.length > 0) {
    html += '<section class="summary-section">';
    html += '<h2>Decisions</h2>';
    delta.decision_trace.forEach((d) => {
      html += `<div class="summary-decision">`;
      html += `<strong>${escapeHtml(d.decision)}</strong>`;
      html += `<div class="sd-alternatives">Considered: ${d.alternatives.map(escapeHtml).join(", ")}</div>`;
      html += `<div class="sd-rationale">${escapeHtml(d.rationale)}</div>`;
      html += `</div>`;
    });
    html += '</section>';
  }

  html += '</div>';
  return html;
}

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; }
#app { display: flex; flex-direction: column; height: 100vh; }

.scope-warning { padding: 10px 24px; background: #4a1e1e; border-bottom: 2px solid #f85149; color: #f85149; font-size: 13px; font-weight: 500; }

header { padding: 12px 24px; border-bottom: 1px solid #21262d; display: flex; align-items: center; gap: 16px; }
header h1 { font-size: 18px; color: #f0f6fc; }
.tabs { display: flex; gap: 4px; flex: 1; }
.tab { background: none; border: 1px solid transparent; color: #8b949e; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; }
.tab:hover { color: #c9d1d9; }
.tab.active { background: #21262d; color: #f0f6fc; border-color: #30363d; }
.intent-badge { font-size: 12px; padding: 4px 8px; border-radius: 12px; font-weight: 500; }
.intent-badge.satisfied { background: #1b4332; color: #6fdd8b; }
.intent-badge.unsatisfied { background: #4a1e1e; color: #f85149; border: 1px solid #f85149; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

.hidden { display: none !important; }

/* Summary view */
.view-summary { flex: 1; overflow-y: auto; }
.summary-content { max-width: 720px; margin: 0 auto; padding: 32px 24px; }
.summary-section { margin-bottom: 32px; }
.summary-section h2 { font-size: 14px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
.summary-intent { font-size: 18px; color: #f0f6fc; line-height: 1.4; }
.summary-changes { display: flex; flex-direction: column; gap: 8px; }
.summary-change-item { padding: 12px 16px; border: 1px solid #21262d; border-radius: 8px; cursor: pointer; transition: border-color 0.15s; }
.summary-change-item:hover { border-color: #30363d; }
.summary-change-item.changed { border-left: 3px solid #d29922; }
.summary-change-item.added { border-left: 3px solid #6fdd8b; }
.summary-change-item.removed { border-left: 3px solid #f85149; }
.summary-change-item.moved { border-left: 3px solid #a371f7; }
.sci-header { display: flex; align-items: center; gap: 8px; }
.sci-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
.sci-badge.changed { background: #2d1f00; color: #d29922; }
.sci-badge.added { background: #0d2818; color: #6fdd8b; }
.sci-badge.removed { background: #2d0d0d; color: #f85149; }
.sci-badge.moved { background: #1c1433; color: #a371f7; }
.sci-desc { font-size: 13px; color: #8b949e; margin-top: 4px; }
.sci-structural { list-style: none; margin-top: 6px; padding: 0; }
.sci-structural li { font-family: monospace; font-size: 11px; color: #6fdd8b; padding: 1px 0; }
.summary-blast-desc { font-size: 13px; color: #8b949e; margin-bottom: 8px; }
.summary-blast-list { display: flex; flex-direction: column; gap: 4px; }
.summary-blast-item { font-size: 13px; color: #c9d1d9; padding: 6px 12px; background: #1c1433; border: 1px solid #6e40c9; border-radius: 6px; }
.summary-decision { margin-bottom: 16px; }
.summary-decision strong { font-size: 14px; color: #c9d1d9; }
.sd-alternatives { font-size: 12px; color: #8b949e; margin-top: 4px; }
.sd-rationale { font-size: 12px; color: #6fdd8b; margin-top: 2px; }

/* Graph view */
.view-graph { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.filters { padding: 8px 24px; border-bottom: 1px solid #21262d; display: flex; gap: 12px; align-items: center; }
.filter-toggle { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #8b949e; cursor: pointer; padding: 3px 8px; border-radius: 12px; border: 1px solid #21262d; user-select: none; transition: opacity 0.15s; }
.filter-toggle.active { color: #c9d1d9; border-color: #30363d; }
.filter-toggle:not(.active) { opacity: 0.4; }
.filter-swatch { width: 8px; height: 8px; border-radius: 2px; }
.filter-swatch.changed { background: #d29922; }
.filter-swatch.added { background: #6fdd8b; }
.filter-swatch.removed { background: #f85149; }
.filter-swatch.blast-radius { background: #6e40c9; }
.filter-swatch.unchanged { background: #30363d; }
.layout { display: flex; flex: 1; overflow: hidden; }
.graph-container { flex: 1; position: relative; }
#graph { width: 100%; height: 100%; }

/* Panel — expandable */
.panel { width: 380px; border-left: 1px solid #21262d; overflow-y: auto; padding: 16px; transition: width 0.2s; position: relative; }
.panel.expanded { width: 60vw; }
.panel-expand-btn { position: absolute; top: 8px; right: 8px; background: #21262d; border: 1px solid #30363d; color: #8b949e; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.panel-expand-btn:hover { color: #f0f6fc; }
.panel-empty { color: #484f58; font-style: italic; padding: 24px; text-align: center; }
.panel h3 { color: #f0f6fc; margin-bottom: 8px; font-size: 14px; }
.panel-section { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #21262d; }
.panel-section:last-child { border-bottom: none; }
.panel .summary { color: #c9d1d9; font-size: 13px; }
.panel .before { color: #8b949e; font-size: 12px; margin-top: 4px; }
.panel .structural { list-style: none; padding: 0; }
.panel .structural li { font-family: monospace; font-size: 12px; padding: 2px 0; color: #c9d1d9; }
.panel .structural li.added { color: #6fdd8b; }
.panel .structural li.modified { color: #d29922; }
.panel .structural li.removed { color: #f85149; }
.panel .code-section { margin-top: 8px; }
.panel .code-file { margin-bottom: 8px; }
.panel .code-file-name { font-size: 11px; font-family: monospace; color: #8b949e; padding: 4px 8px; background: #161b22; border-radius: 4px 4px 0 0; border: 1px solid #21262d; border-bottom: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.panel .code-file-name:hover { color: #c9d1d9; }
.panel .code-file-name .toggle { font-size: 10px; color: #484f58; }
.panel .code-diff { font-family: monospace; font-size: 11px; line-height: 1.5; padding: 8px; background: #0d1117; border: 1px solid #21262d; border-radius: 0 0 4px 4px; overflow-x: auto; white-space: pre; max-height: 400px; overflow-y: auto; }
.panel.expanded .code-diff { max-height: none; }
.panel .code-diff .line-add { color: #6fdd8b; background: #0d2818; display: block; }
.panel .code-diff .line-del { color: #f85149; background: #2d0d0d; display: block; }
.panel .code-diff .line-hunk { color: #6e40c9; display: block; margin-top: 4px; }
.panel .code-diff .line-ctx { color: #8b949e; display: block; }
.panel .code-diff.collapsed { display: none; }

/* Progress tracking */
.node.reviewed rect { opacity: 0.5; }
.node.reviewed .node-label { opacity: 0.6; }
.panel .reviewed-badge { display: inline-block; font-size: 10px; padding: 2px 6px; background: #1b4332; color: #6fdd8b; border-radius: 4px; margin-left: 8px; }

/* Node visual weight */
.node rect { transition: all 0.15s; }

.edge { stroke: #30363d; stroke-width: 1.5; fill: none; marker-end: url(#arrow); }
.edge.removed { stroke: #f85149; stroke-width: 2; stroke-dasharray: 4; marker-end: url(#arrow-removed); }
.edge.added { stroke: #6fdd8b; stroke-width: 2; marker-end: url(#arrow-added); }
.edge-label { font-size: 9px; fill: #484f58; text-anchor: middle; pointer-events: none; opacity: 0.7; }
.edge-group:hover .edge-label { opacity: 1; fill: #c9d1d9; }
.edge-group:hover .edge { stroke-width: 2.5; }

.moved-arrow { stroke: #a371f7; stroke-width: 2; stroke-dasharray: 6 3; fill: none; marker-end: url(#moved-arrow); }
.moved-label { font-size: 9px; fill: #a371f7; text-anchor: middle; pointer-events: none; }

.node { cursor: pointer; transition: opacity 0.15s; }
.node:hover { opacity: 0.85; }
.node:hover .node-label { fill: #f0f6fc; }
.node rect { rx: 8; ry: 8; stroke-width: 2; }
.node .node-label { font-size: 11px; fill: #c9d1d9; text-anchor: middle; dominant-baseline: middle; pointer-events: none; font-weight: 500; }
.node .node-type { font-size: 9px; fill: #484f58; text-anchor: middle; pointer-events: none; }
.node.unchanged rect { fill: #161b22; stroke: #30363d; }
.node.changed rect { fill: #2d1f00; stroke: #d29922; }
.node.added rect { fill: #0d2818; stroke: #6fdd8b; }
.node.removed rect { fill: #2d0d0d; stroke: #f85149; stroke-dasharray: 4; }
.node.blast-radius rect { fill: #1c1433; stroke: #6e40c9; stroke-dasharray: 2; }
.node.selected rect { stroke-width: 3; filter: drop-shadow(0 0 6px currentColor); }
`;

const SCRIPT = `
(function() {
  const { topology, delta, nodeDiffs } = DATA;

  const changedIds = new Set(delta.changed.map(c => c.id));
  const addedIds = new Set(delta.added);
  const removedIds = new Set(delta.removed);
  const blastIds = new Set(delta.blast_radius);
  const removedEdgeKeys = new Set(delta.edges_removed.map(e => e.from + "->" + e.to));
  const addedEdgeKeys = new Set(delta.edges_added.map(e => e.from + "->" + e.to));
  const reviewedNodes = new Set();

  function getNodeStatus(id) {
    if (addedIds.has(id)) return "added";
    if (removedIds.has(id)) return "removed";
    if (changedIds.has(id)) return "changed";
    if (blastIds.has(id)) return "blast-radius";
    return "unchanged";
  }

  function getEdgeStatus(from, to) {
    const key = from + "->" + to;
    if (removedEdgeKeys.has(key)) return "removed";
    if (addedEdgeKeys.has(key)) return "added";
    return "";
  }

  // Tab switching
  document.querySelector(".tabs").addEventListener("click", function(e) {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    const view = tab.dataset.view;
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("view-summary").classList.toggle("hidden", view !== "summary");
    document.getElementById("view-graph").classList.toggle("hidden", view !== "graph");
    if (view === "graph" && !window._graphInitialized) {
      initGraph();
      window._graphInitialized = true;
    }
  });

  // Summary view: click a change item to go to graph
  document.querySelectorAll(".summary-change-item").forEach(function(item) {
    item.addEventListener("click", function() {
      const name = item.querySelector("strong")?.textContent;
      if (name) {
        document.querySelector('[data-view="graph"]').click();
        setTimeout(function() { selectNode(name); }, 100);
      }
    });
  });

  function initGraph() {
    const allNodeIds = new Set([
      ...topology.nodes.map(n => n.id),
      ...delta.added,
      ...delta.removed
    ]);

    const nodes = Array.from(allNodeIds).map(id => {
      const topoNode = topology.nodes.find(n => n.id === id);
      const nodeDiff = nodeDiffs.find(nd => nd.nodeId === id);
      const linesChanged = nodeDiff ? nodeDiff.files.reduce((sum, f) => sum + f.hunks.split("\\n").length, 0) : 0;
      return {
        id,
        type: topoNode?.type || "unknown",
        description: topoNode?.description || "",
        status: getNodeStatus(id),
        weight: linesChanged
      };
    });

    const allEdges = [
      ...topology.edges,
      ...delta.edges_added
    ];

    const edges = allEdges.map(e => ({
      source: e.from,
      target: e.to,
      type: e.type,
      description: e.description || "",
      status: getEdgeStatus(e.from, e.to)
    }));

    const svg = document.getElementById("graph");
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.innerHTML = \`
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#30363d"/>
        </marker>
        <marker id="arrow-removed" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#f85149"/>
        </marker>
        <marker id="arrow-added" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6fdd8b"/>
        </marker>
        <marker id="moved-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#a371f7"/>
        </marker>
      </defs>
    \`;

    // Node size scales with change magnitude
    const maxWeight = Math.max(1, ...nodes.map(n => n.weight));
    function getNodeHeight(n) {
      if (n.status === "unchanged") return 36;
      return 36 + Math.min(20, (n.weight / maxWeight) * 20);
    }
    function getNodeWidth(n) {
      const base = Math.max(80, n.id.length * 8 + 24);
      if (n.status === "unchanged") return base;
      return base + Math.min(30, (n.weight / maxWeight) * 30);
    }

    const nodeMap = new Map();
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      const radius = Math.min(width, height) * 0.3;
      n.x = width / 2 + radius * Math.cos(angle);
      n.y = height / 2 + radius * Math.sin(angle);
      n.w = getNodeWidth(n);
      n.h = getNodeHeight(n);
      n.vx = 0;
      n.vy = 0;
      nodeMap.set(n.id, n);
    });

    for (let tick = 0; tick < 300; tick++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          let force = 12000 / (dist * dist);
          let fx = (dx / dist) * force, fy = (dy / dist) * force;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }
      edges.forEach(e => {
        const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
        if (!a || !b) return;
        let dx = b.x - a.x, dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = (dist - 180) * 0.008;
        let fx = (dx / dist) * force, fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      });
      nodes.forEach(n => {
        n.vx += (width / 2 - n.x) * 0.001;
        n.vy += (height / 2 - n.y) * 0.001;
        n.vx *= 0.82; n.vy *= 0.82;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(n.w / 2 + 20, Math.min(width - n.w / 2 - 20, n.x));
        n.y = Math.max(n.h / 2 + 20, Math.min(height - n.h / 2 - 20, n.y));
      });
    }

    function edgeEndpoints(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const angle = Math.atan2(dy, dx);
      function intersect(hw, hh, ang) {
        const absCos = Math.abs(Math.cos(ang)), absSin = Math.abs(Math.sin(ang));
        return (hw * absSin <= hh * absCos) ? hw / absCos : hh / absSin;
      }
      const dA = intersect(a.w / 2, a.h / 2, angle);
      const dB = intersect(b.w / 2, b.h / 2, angle + Math.PI);
      return {
        x1: a.x + Math.cos(angle) * dA, y1: a.y + Math.sin(angle) * dA,
        x2: b.x - Math.cos(angle) * dB, y2: b.y - Math.sin(angle) * dB
      };
    }

    // Draw edges with always-visible labels
    edges.forEach(e => {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
      if (!a || !b) return;
      const pts = edgeEndpoints(a, b);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "edge-group");
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", pts.x1); line.setAttribute("y1", pts.y1);
      line.setAttribute("x2", pts.x2); line.setAttribute("y2", pts.y2);
      line.setAttribute("class", "edge " + e.status);
      line.dataset.source = e.source; line.dataset.target = e.target;
      g.appendChild(line);
      if (e.description) {
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", (pts.x1 + pts.x2) / 2);
        label.setAttribute("y", (pts.y1 + pts.y2) / 2 - 6);
        label.setAttribute("class", "edge-label");
        label.textContent = e.description;
        g.appendChild(label);
      }
      svg.appendChild(g);
    });

    // Draw moved arrows
    delta.moved.forEach(m => {
      const from = nodeMap.get(m.from), to = nodeMap.get(m.to);
      if (!from || !to) return;
      const pts = edgeEndpoints(from, to);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", pts.x1); line.setAttribute("y1", pts.y1 - 14);
      line.setAttribute("x2", pts.x2); line.setAttribute("y2", pts.y2 - 14);
      line.setAttribute("class", "moved-arrow");
      svg.appendChild(line);
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", (pts.x1 + pts.x2) / 2);
      label.setAttribute("y", (pts.y1 + pts.y2) / 2 - 20);
      label.setAttribute("class", "moved-label");
      label.textContent = m.what;
      svg.appendChild(label);
    });

    // Draw nodes
    nodes.forEach(n => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "node " + n.status);
      g.setAttribute("transform", "translate(" + n.x + "," + n.y + ")");
      g.dataset.nodeId = n.id;
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", -n.w / 2); rect.setAttribute("y", -n.h / 2);
      rect.setAttribute("width", n.w); rect.setAttribute("height", n.h);
      g.appendChild(rect);
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "node-label"); text.setAttribute("y", "-2");
      text.textContent = n.id;
      g.appendChild(text);
      const typeLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      typeLabel.setAttribute("class", "node-type"); typeLabel.setAttribute("y", "12");
      typeLabel.textContent = n.type;
      g.appendChild(typeLabel);
      g.addEventListener("click", () => selectNode(n.id));
      svg.appendChild(g);
    });

    // Apply initial filter (hide unchanged)
    applyFilters();
  }

  // Panel interaction
  window.selectNode = function(id) {
    document.querySelectorAll(".node").forEach(g => g.classList.remove("selected"));
    const nodeEl = document.querySelector('.node[data-node-id="' + id + '"]');
    if (nodeEl) nodeEl.classList.add("selected");

    // Mark as reviewed
    reviewedNodes.add(id);
    if (nodeEl) nodeEl.classList.add("reviewed");

    const panel = document.getElementById("panel");
    const changedInfo = delta.changed.find(c => c.id === id);
    const topoNode = topology.nodes.find(n => n.id === id);
    const status = getNodeStatus(id);

    let html = '<button class="panel-expand-btn" data-action="toggle-expand">&harr;</button>';

    html += '<div class="panel-section">';
    html += '<h3>' + id + (reviewedNodes.has(id) ? '<span class=reviewed-badge>reviewed</span>' : '') + '</h3>';
    html += '<span class="intent-badge ' + (status === "removed" ? "unsatisfied" : "satisfied") + '">' + status + '</span>';
    if (topoNode) html += '<p class="summary" style="margin-top:8px">' + topoNode.description + '</p>';
    if (!topoNode && status === "removed") html += '<p class="summary" style="margin-top:8px;color:#f85149">This node was removed in this change.</p>';
    html += '</div>';

    if (changedInfo) {
      html += '<div class="panel-section">';
      html += '<h3>Change Summary</h3>';
      html += '<p class="summary">' + changedInfo.summary + '</p>';
      html += '<p class="before">Before: ' + changedInfo.before + '</p>';
      html += '</div>';
      if (changedInfo.structural_changes.length > 0) {
        html += '<div class="panel-section">';
        html += '<h3>Structural Changes</h3>';
        html += '<ul class="structural">';
        changedInfo.structural_changes.forEach(sc => {
          let cls = "";
          if (sc.startsWith("added:")) cls = "added";
          else if (sc.startsWith("modified:")) cls = "modified";
          else if (sc.startsWith("removed:")) cls = "removed";
          html += '<li class="' + cls + '">' + sc + '</li>';
        });
        html += '</ul></div>';
      }
    }

    const movedFrom = delta.moved.filter(m => m.from === id);
    const movedTo = delta.moved.filter(m => m.to === id);
    if (movedFrom.length > 0 || movedTo.length > 0) {
      html += '<div class="panel-section"><h3>Moved</h3>';
      movedFrom.forEach(m => { html += '<p class="summary" style="color:#f85149">\\u2197 ' + m.what + ' moved to ' + m.to + '</p>'; });
      movedTo.forEach(m => { html += '<p class="summary" style="color:#6fdd8b">\\u2199 ' + m.what + ' moved from ' + m.from + '</p>'; });
      html += '</div>';
    }

    if (status === "blast-radius") {
      html += '<div class="panel-section"><h3 style="color:#6e40c9">Blast Radius</h3>';
      html += '<p class="summary">This node may be affected by the change but was not directly modified.</p></div>';
    }

    if (delta.scope_violations.length > 0) {
      html += '<div class="panel-section"><h3 style="color:#f85149">Scope Violations</h3>';
      delta.scope_violations.forEach(v => { html += '<p class="summary">' + v + '</p>'; });
      html += '</div>';
    }

    const nodeDiff = nodeDiffs.find(nd => nd.nodeId === id);
    if (nodeDiff && nodeDiff.files.length > 0) {
      html += '<div class="panel-section code-section"><h3>Code</h3>';
      nodeDiff.files.forEach(f => {
        html += '<div class="code-file">';
        html += '<div class="code-file-name" data-toggle="diff"><span>' + escapeForHtml(f.file) + '</span><span class="toggle">collapse</span></div>';
        html += '<div class="code-diff">';
        const lines = f.hunks.split("\\n");
        lines.forEach(line => {
          if (line.startsWith("+")) html += '<span class="line-add">' + escapeForHtml(line) + '</span>';
          else if (line.startsWith("-")) html += '<span class="line-del">' + escapeForHtml(line) + '</span>';
          else if (line.startsWith("@@")) html += '<span class="line-hunk">' + escapeForHtml(line) + '</span>';
          else html += '<span class="line-ctx">' + escapeForHtml(line) + '</span>';
        });
        html += '</div></div>';
      });
      html += '</div>';
    }

    panel.innerHTML = html || '<div class="panel-empty">No details for this node</div>';
  };

  function escapeForHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Event delegation for collapsible diffs + expand
  document.getElementById("panel").addEventListener("click", function(e) {
    const toggle = e.target.closest("[data-toggle=diff]");
    if (toggle) {
      const diff = toggle.nextElementSibling;
      if (diff) diff.classList.toggle("collapsed");
    }
    const expand = e.target.closest("[data-action=toggle-expand]");
    if (expand) {
      document.getElementById("panel").classList.toggle("expanded");
    }
  });

  // Filter toggles
  const activeFilters = new Set(["changed", "added", "removed", "blast-radius"]);
  function applyFilters() {
    document.querySelectorAll(".node").forEach(function(g) {
      const id = g.dataset.nodeId;
      const status = getNodeStatus(id);
      g.style.display = activeFilters.has(status) ? "" : "none";
    });
    document.querySelectorAll(".edge-group").forEach(function(g) {
      const line = g.querySelector("line");
      if (!line) return;
      const sourceNode = document.querySelector('.node[data-node-id="' + line.dataset.source + '"]');
      const targetNode = document.querySelector('.node[data-node-id="' + line.dataset.target + '"]');
      g.style.display = (sourceNode && sourceNode.style.display !== "none" && targetNode && targetNode.style.display !== "none") ? "" : "none";
    });
  }

  document.getElementById("filters")?.addEventListener("click", function(e) {
    const toggle = e.target.closest(".filter-toggle");
    if (!toggle) return;
    const status = toggle.dataset.status;
    if (activeFilters.has(status)) {
      activeFilters.delete(status);
      toggle.classList.remove("active");
    } else {
      activeFilters.add(status);
      toggle.classList.add("active");
    }
    applyFilters();
  });
})();
`;
