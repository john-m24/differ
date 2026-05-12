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
    <p class="intent">${escapeHtml(delta.intent)}</p>
    <span class="intent-badge ${delta.intent_satisfied ? "satisfied" : "unsatisfied"}">
      ${delta.intent_satisfied ? "Intent satisfied" : "Intent NOT satisfied"}
    </span>
  </header>
  <div class="filters" id="filters">
    <label class="filter-toggle active" data-status="changed"><span class="filter-swatch changed"></span>Changed</label>
    <label class="filter-toggle active" data-status="added"><span class="filter-swatch added"></span>Added</label>
    <label class="filter-toggle active" data-status="removed"><span class="filter-swatch removed"></span>Removed</label>
    <label class="filter-toggle active" data-status="blast-radius"><span class="filter-swatch blast-radius"></span>Blast radius</label>
    <label class="filter-toggle active" data-status="unchanged"><span class="filter-swatch unchanged"></span>Unchanged</label>
  </div>
  <div class="layout">
    <div class="graph-container">
      <svg id="graph"></svg>
    </div>
    <div class="panel" id="panel">
      <div class="panel-empty">Click a node to inspect</div>
    </div>
  </div>
  <div class="trace">
    <h2>Decision Trace</h2>
    ${renderDecisionTrace(delta)}
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

function renderDecisionTrace(delta: SystemDelta): string {
  if (delta.decision_trace.length === 0) return "<p>No decisions recorded.</p>";

  return delta.decision_trace
    .map(
      (d) => `
    <div class="decision">
      <strong>${escapeHtml(d.decision)}</strong>
      <div class="alternatives">Considered: ${d.alternatives.map(escapeHtml).join(", ")}</div>
      <div class="rationale">${escapeHtml(d.rationale)}</div>
    </div>`
    )
    .join("\n");
}

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; }
#app { display: flex; flex-direction: column; height: 100vh; }

.scope-warning { padding: 10px 24px; background: #4a1e1e; border-bottom: 2px solid #f85149; color: #f85149; font-size: 13px; font-weight: 500; }

header { padding: 16px 24px; border-bottom: 1px solid #21262d; display: flex; align-items: center; gap: 16px; }
header h1 { font-size: 18px; color: #f0f6fc; }
.intent { font-size: 14px; color: #8b949e; flex: 1; }
.intent-badge { font-size: 12px; padding: 4px 8px; border-radius: 12px; font-weight: 500; }
.intent-badge.satisfied { background: #1b4332; color: #6fdd8b; }
.intent-badge.unsatisfied { background: #4a1e1e; color: #f85149; border: 1px solid #f85149; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

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
.panel { width: 380px; border-left: 1px solid #21262d; overflow-y: auto; padding: 16px; }
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
.panel .code-diff { font-family: monospace; font-size: 11px; line-height: 1.5; padding: 8px; background: #0d1117; border: 1px solid #21262d; border-radius: 0 0 4px 4px; overflow-x: auto; white-space: pre; max-height: 300px; overflow-y: auto; }
.panel .code-diff .line-add { color: #6fdd8b; background: #0d2818; display: block; }
.panel .code-diff .line-del { color: #f85149; background: #2d0d0d; display: block; }
.panel .code-diff .line-hunk { color: #6e40c9; display: block; margin-top: 4px; }
.panel .code-diff .line-ctx { color: #8b949e; display: block; }
.panel .code-diff.collapsed { display: none; }
.trace { padding: 16px 24px; border-top: 1px solid #21262d; max-height: 200px; overflow-y: auto; }
.trace h2 { font-size: 14px; color: #f0f6fc; margin-bottom: 12px; }
.decision { margin-bottom: 12px; }
.decision strong { font-size: 13px; color: #c9d1d9; }
.decision .alternatives { font-size: 12px; color: #8b949e; margin-top: 2px; }
.decision .rationale { font-size: 12px; color: #6fdd8b; margin-top: 2px; }

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

.edge { stroke: #30363d; stroke-width: 1.5; fill: none; marker-end: url(#arrow); }
.edge.removed { stroke: #f85149; stroke-width: 2; stroke-dasharray: 4; marker-end: url(#arrow-removed); }
.edge.added { stroke: #6fdd8b; stroke-width: 2; marker-end: url(#arrow-added); }
.edge-label { font-size: 9px; fill: #484f58; text-anchor: middle; pointer-events: none; opacity: 0; transition: opacity 0.2s; }
.edge-group:hover .edge-label { opacity: 1; }
.edge-group:hover .edge { stroke-width: 2.5; }

.moved-arrow { stroke: #a371f7; stroke-width: 2; stroke-dasharray: 6 3; fill: none; marker-end: url(#moved-arrow); }
.moved-label { font-size: 9px; fill: #a371f7; text-anchor: middle; pointer-events: none; }

.legend { position: absolute; bottom: 16px; left: 16px; background: #161b22; border: 1px solid #21262d; border-radius: 6px; padding: 12px; font-size: 11px; }
.legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.legend-item:last-child { margin-bottom: 0; }
.legend-swatch { width: 14px; height: 10px; border-radius: 3px; border: 2px solid; }
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

  const allNodeIds = new Set([
    ...topology.nodes.map(n => n.id),
    ...delta.added,
    ...delta.removed
  ]);

  const nodes = Array.from(allNodeIds).map(id => {
    const topoNode = topology.nodes.find(n => n.id === id);
    return {
      id,
      type: topoNode?.type || "unknown",
      description: topoNode?.description || "",
      status: getNodeStatus(id)
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

  // Measure node label widths
  function getNodeWidth(id) {
    return Math.max(80, id.length * 8 + 24);
  }
  const NODE_HEIGHT = 36;

  // Simple force-directed layout
  const nodeMap = new Map();
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const radius = Math.min(width, height) * 0.3;
    n.x = width / 2 + radius * Math.cos(angle);
    n.y = height / 2 + radius * Math.sin(angle);
    n.w = getNodeWidth(n.id);
    n.vx = 0;
    n.vy = 0;
    nodeMap.set(n.id, n);
  });

  // Run simulation
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
    });

    nodes.forEach(n => {
      n.vx *= 0.82;
      n.vy *= 0.82;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(n.w / 2 + 20, Math.min(width - n.w / 2 - 20, n.x));
      n.y = Math.max(NODE_HEIGHT / 2 + 20, Math.min(height - NODE_HEIGHT / 2 - 20, n.y));
    });
  }

  // Edge connection points (from rect border)
  function edgeEndpoints(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const angle = Math.atan2(dy, dx);
    const aHalfW = a.w / 2, bHalfW = b.w / 2;
    const halfH = NODE_HEIGHT / 2;
    function intersect(hw, hh, ang) {
      const absCos = Math.abs(Math.cos(ang)), absSin = Math.abs(Math.sin(ang));
      let d;
      if (hw * absSin <= hh * absCos) d = hw / absCos;
      else d = hh / absSin;
      return d;
    }
    const dA = intersect(aHalfW, halfH, angle);
    const dB = intersect(bHalfW, halfH, angle + Math.PI);
    return {
      x1: a.x + Math.cos(angle) * dA,
      y1: a.y + Math.sin(angle) * dA,
      x2: b.x - Math.cos(angle) * dB,
      y2: b.y - Math.sin(angle) * dB
    };
  }

  // Draw edges
  edges.forEach(e => {
    const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
    if (!a || !b) return;
    const pts = edgeEndpoints(a, b);

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "edge-group");

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", pts.x1);
    line.setAttribute("y1", pts.y1);
    line.setAttribute("x2", pts.x2);
    line.setAttribute("y2", pts.y2);
    line.setAttribute("class", "edge " + e.status);
    line.dataset.source = e.source;
    line.dataset.target = e.target;
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
    line.setAttribute("x1", pts.x1);
    line.setAttribute("y1", pts.y1 - 14);
    line.setAttribute("x2", pts.x2);
    line.setAttribute("y2", pts.y2 - 14);
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
    rect.setAttribute("x", -n.w / 2);
    rect.setAttribute("y", -NODE_HEIGHT / 2);
    rect.setAttribute("width", n.w);
    rect.setAttribute("height", NODE_HEIGHT);
    g.appendChild(rect);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "node-label");
    text.setAttribute("y", "-2");
    text.textContent = n.id;
    g.appendChild(text);

    const typeLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    typeLabel.setAttribute("class", "node-type");
    typeLabel.setAttribute("y", "12");
    typeLabel.textContent = n.type;
    g.appendChild(typeLabel);

    g.addEventListener("click", () => selectNode(n.id));
    svg.appendChild(g);
  });

  // Legend
  const container = document.querySelector(".graph-container");
  const legend = document.createElement("div");
  legend.className = "legend";
  legend.innerHTML = \`
    <div class="legend-item"><div class="legend-swatch" style="background:#2d1f00;border-color:#d29922"></div>Changed</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#0d2818;border-color:#6fdd8b"></div>Added</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#2d0d0d;border-color:#f85149"></div>Removed</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#1c1433;border-color:#6e40c9"></div>Blast radius</div>
  \`;
  container.appendChild(legend);

  // Panel interaction
  function selectNode(id) {
    document.querySelectorAll(".node").forEach(g => g.classList.remove("selected"));
    const nodeEl = document.querySelector('.node[data-node-id="' + id + '"]');
    if (nodeEl) nodeEl.classList.add("selected");

    const panel = document.getElementById("panel");
    const changedInfo = delta.changed.find(c => c.id === id);
    const topoNode = topology.nodes.find(n => n.id === id);
    const status = getNodeStatus(id);

    let html = "";

    html += '<div class="panel-section">';
    html += '<h3>' + id + '</h3>';
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

    // Moved items involving this node
    const movedFrom = delta.moved.filter(m => m.from === id);
    const movedTo = delta.moved.filter(m => m.to === id);
    if (movedFrom.length > 0 || movedTo.length > 0) {
      html += '<div class="panel-section">';
      html += '<h3>Moved</h3>';
      movedFrom.forEach(m => { html += '<p class="summary" style="color:#f85149">\\u2197 ' + m.what + ' moved to ' + m.to + '</p>'; });
      movedTo.forEach(m => { html += '<p class="summary" style="color:#6fdd8b">\\u2199 ' + m.what + ' moved from ' + m.from + '</p>'; });
      html += '</div>';
    }

    // Blast radius info
    if (status === "blast-radius") {
      html += '<div class="panel-section">';
      html += '<h3 style="color:#6e40c9">Blast Radius</h3>';
      html += '<p class="summary">This node may be affected by the change but was not directly modified.</p>';
      const incomingEdges = edges.filter(e => e.target === id || e.source === id);
      if (incomingEdges.length > 0) {
        html += '<p class="before" style="margin-top:4px">Connected to: ' + incomingEdges.map(e => e.source === id ? e.target : e.source).join(", ") + '</p>';
      }
      html += '</div>';
    }

    // Scope violations
    if (delta.scope_violations.length > 0) {
      html += '<div class="panel-section">';
      html += '<h3 style="color:#f85149">Scope Violations</h3>';
      delta.scope_violations.forEach(v => { html += '<p class="summary">' + v + '</p>'; });
      html += '</div>';
    }

    // Code diff
    const nodeDiff = nodeDiffs.find(nd => nd.nodeId === id);
    if (nodeDiff && nodeDiff.files.length > 0) {
      html += '<div class="panel-section code-section">';
      html += '<h3>Code</h3>';
      nodeDiff.files.forEach((f, idx) => {
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
  }

  function escapeForHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Event delegation for collapsible diffs
  document.getElementById("panel").addEventListener("click", function(e) {
    const toggle = e.target.closest("[data-toggle=diff]");
    if (toggle) {
      const diff = toggle.nextElementSibling;
      if (diff) diff.classList.toggle("collapsed");
    }
  });

  // Filter toggles
  const activeFilters = new Set(["changed", "added", "removed", "blast-radius", "unchanged"]);
  document.getElementById("filters").addEventListener("click", function(e) {
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

  function applyFilters() {
    document.querySelectorAll(".node").forEach(function(g) {
      const id = g.dataset.nodeId;
      const status = getNodeStatus(id);
      g.style.display = activeFilters.has(status) ? "" : "none";
    });
    document.querySelectorAll(".edge-group").forEach(function(g) {
      const line = g.querySelector("line");
      if (!line) return;
      // Show edge if both source and target are visible
      const sourceNode = document.querySelector('.node[data-node-id="' + line.dataset.source + '"]');
      const targetNode = document.querySelector('.node[data-node-id="' + line.dataset.target + '"]');
      g.style.display = (sourceNode && sourceNode.style.display !== "none" && targetNode && targetNode.style.display !== "none") ? "" : "none";
    });
  }
})();
`;
