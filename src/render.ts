import type { Topology, SystemDelta } from "./types.js";
import type { NodeDiff } from "./diff.js";

export function renderReview(topology: Topology, delta: SystemDelta, nodeDiffs?: NodeDiff[]): string {
  const data = JSON.stringify({ topology, delta, nodeDiffs: nodeDiffs || [] })
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
  <header>
    <h1>differ</h1>
    <nav class="tabs">
      <button class="tab active" data-view="summary">Summary</button>
      <button class="tab" data-view="graph">Graph</button>
    </nav>
  </header>

  <main class="view active" id="view-summary"></main>
  <main class="view" id="view-graph">
    <div class="graph-toolbar" id="filters">
      <button class="filter-btn active" data-status="changed">Changed</button>
      <button class="filter-btn active" data-status="added">Added</button>
      <button class="filter-btn active" data-status="removed">Removed</button>
      <button class="filter-btn active" data-status="blast-radius">Blast radius</button>
      <button class="filter-btn" data-status="unchanged">Unchanged</button>
    </div>
    <div class="graph-layout">
      <div class="graph-area"><svg id="graph"></svg></div>
      <aside class="detail-panel" id="panel">
        <p class="panel-placeholder">Select a node</p>
      </aside>
    </div>
  </main>
</div>
<script>
const DATA = ${data};
${SCRIPT}
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const CSS = `
:root {
  --bg: #0a0a0b;
  --surface: #141415;
  --border: #1e1e20;
  --text-primary: #ededef;
  --text-secondary: #7a7a7d;
  --text-tertiary: #4a4a4d;
  --accent-green: #34d399;
  --accent-red: #f87171;
  --accent-yellow: #fbbf24;
  --accent-purple: #a78bfa;
  --accent-blue: #60a5fa;
  --diff-add-bg: #0c1f17;
  --diff-del-bg: #1f0c0c;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; background: var(--bg); color: var(--text-primary); font-size: 14px; line-height: 1.5; }
#app { display: flex; flex-direction: column; height: 100vh; }

header { padding: 12px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 24px; }
header h1 { font-size: 15px; font-weight: 600; color: var(--text-secondary); letter-spacing: -0.3px; }
.tabs { display: flex; gap: 2px; }
.tab { background: none; border: none; color: var(--text-tertiary); padding: 6px 12px; border-radius: 5px; cursor: pointer; font-size: 13px; font-weight: 500; }
.tab:hover { color: var(--text-secondary); }
.tab.active { background: var(--surface); color: var(--text-primary); }

.view { display: none; flex: 1; overflow: hidden; }
.view.active { display: flex; flex-direction: column; }

/* Summary */
#view-summary { overflow-y: auto; padding: 40px 24px; }
.summary { max-width: 680px; margin: 0 auto; width: 100%; }
.summary-intent { font-size: 20px; font-weight: 500; color: var(--text-primary); line-height: 1.4; margin-bottom: 32px; }

.summary-group { margin-bottom: 28px; }
.summary-group-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-tertiary); margin-bottom: 10px; }

.node-card { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; overflow: hidden; transition: border-color 0.1s; }
.node-card:hover { border-color: #2a2a2d; }
.node-card-header { padding: 12px 16px; display: flex; align-items: center; gap: 10px; cursor: pointer; }
.node-card-header:hover { background: var(--surface); }
.node-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.3px; }
.node-badge.changed { background: #2d2000; color: var(--accent-yellow); }
.node-badge.added { background: #002d1a; color: var(--accent-green); }
.node-badge.removed { background: #2d0000; color: var(--accent-red); }
.node-card-name { font-weight: 500; font-size: 14px; }
.node-card-desc { color: var(--text-secondary); font-size: 12px; margin-left: auto; }
.node-card-chevron { color: var(--text-tertiary); font-size: 12px; transition: transform 0.15s; }
.node-card.open .node-card-chevron { transform: rotate(90deg); }

.node-card-body { display: none; border-top: 1px solid var(--border); }
.node-card.open .node-card-body { display: block; }

.node-card-section { padding: 12px 16px; border-bottom: 1px solid var(--border); }
.node-card-section:last-child { border-bottom: none; }
.node-card-section h4 { font-size: 11px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.structural-list { list-style: none; }
.structural-list li { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px; padding: 1px 0; }
.structural-list li.add { color: var(--accent-green); }
.structural-list li.mod { color: var(--accent-yellow); }
.structural-list li.del { color: var(--accent-red); }

.code-file { margin-bottom: 4px; }
.code-file-header { font-family: monospace; font-size: 11px; color: var(--text-secondary); padding: 6px 12px; background: #0f0f10; border-radius: 4px 4px 0 0; border: 1px solid var(--border); border-bottom: none; }
.code-diff { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 11px; line-height: 1.6; padding: 8px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 0 0 4px 4px; overflow-x: auto; white-space: pre; max-height: 400px; overflow-y: auto; }
.code-diff .la { color: var(--accent-green); background: var(--diff-add-bg); display: block; padding: 0 4px; margin: 0 -4px; }
.code-diff .ld { color: var(--accent-red); background: var(--diff-del-bg); display: block; padding: 0 4px; margin: 0 -4px; }
.code-diff .lh { color: var(--accent-purple); display: block; margin-top: 4px; }
.code-diff .lc { color: var(--text-tertiary); display: block; }

.blast-list { display: flex; flex-direction: column; gap: 4px; }
.blast-item { font-size: 13px; color: var(--text-secondary); padding: 8px 12px; border: 1px solid #1a1a2e; border-radius: 6px; background: #0d0d14; }
.blast-item strong { color: var(--accent-purple); }

.decisions-list { display: flex; flex-direction: column; gap: 16px; }
.decision-item strong { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.decision-item .considered { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
.decision-item .rationale { font-size: 12px; color: var(--accent-green); margin-top: 2px; }

/* Graph */
.graph-toolbar { padding: 8px 16px; border-bottom: 1px solid var(--border); display: flex; gap: 6px; }
.filter-btn { background: var(--surface); border: 1px solid var(--border); color: var(--text-tertiary); padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; }
.filter-btn.active { color: var(--text-primary); border-color: #2a2a2d; }
.filter-btn:not(.active) { opacity: 0.4; }
.graph-layout { display: flex; flex: 1; overflow: hidden; }
.graph-area { flex: 1; position: relative; }
#graph { width: 100%; height: 100%; }
.detail-panel { width: 360px; border-left: 1px solid var(--border); overflow-y: auto; padding: 16px; }
.detail-panel.expanded { width: 55vw; }
.panel-placeholder { color: var(--text-tertiary); font-style: italic; text-align: center; padding: 40px 0; }

.node { cursor: pointer; }
.node rect { rx: 6; ry: 6; stroke-width: 1.5; transition: all 0.1s; }
.node text { font-family: 'Inter', sans-serif; pointer-events: none; }
.node .nlabel { font-size: 11px; fill: var(--text-primary); text-anchor: middle; dominant-baseline: middle; font-weight: 500; }
.node .ntype { font-size: 9px; fill: var(--text-tertiary); text-anchor: middle; }
.node.unchanged rect { fill: var(--surface); stroke: var(--border); }
.node.changed rect { fill: #1a1400; stroke: var(--accent-yellow); }
.node.added rect { fill: #001a0d; stroke: var(--accent-green); }
.node.removed rect { fill: #1a0000; stroke: var(--accent-red); stroke-dasharray: 4; }
.node.blast-radius rect { fill: #0d0d1a; stroke: var(--accent-purple); stroke-dasharray: 2; }
.node.selected rect { stroke-width: 2.5; }
.node:hover rect { filter: brightness(1.2); }

.edge { stroke: var(--border); stroke-width: 1; fill: none; marker-end: url(#arr); }
.edge.added { stroke: var(--accent-green); stroke-width: 1.5; }
.edge.removed { stroke: var(--accent-red); stroke-dasharray: 4; }
.elabel { font-size: 8px; fill: var(--text-tertiary); text-anchor: middle; }
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

  function getStatus(id) {
    if (addedIds.has(id)) return "added";
    if (removedIds.has(id)) return "removed";
    if (changedIds.has(id)) return "changed";
    if (blastIds.has(id)) return "blast-radius";
    return "unchanged";
  }

  function esc(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  function renderDiffHtml(hunks) {
    return hunks.split("\\n").map(line => {
      if (line.startsWith("+")) return '<span class=la>' + esc(line) + '</span>';
      if (line.startsWith("-")) return '<span class=ld>' + esc(line) + '</span>';
      if (line.startsWith("@@")) return '<span class=lh>' + esc(line) + '</span>';
      return '<span class=lc>' + esc(line) + '</span>';
    }).join("");
  }

  // Build summary view
  (function buildSummary() {
    const container = document.getElementById("view-summary");
    let h = '<div class="summary">';
    h += '<p class="summary-intent">' + esc(delta.intent) + '</p>';

    // Changed + Added + Removed nodes as cards with code
    const relevantNodes = [
      ...delta.changed.map(c => ({ id: c.id, status: "changed", summary: c.summary, before: c.before, structural: c.structural_changes })),
      ...delta.added.map(id => ({ id, status: "added", summary: topology.nodes.find(n => n.id === id)?.description || "", before: null, structural: [] })),
      ...delta.removed.map(id => ({ id, status: "removed", summary: "This node was removed.", before: null, structural: [] }))
    ];

    if (relevantNodes.length > 0) {
      h += '<div class="summary-group"><div class="summary-group-title">Changes</div>';
      relevantNodes.forEach(n => {
        const diff = nodeDiffs.find(nd => nd.nodeId === n.id);
        h += '<div class="node-card" data-node="' + n.id + '">';
        h += '<div class="node-card-header"><span class="node-badge ' + n.status + '">' + n.status + '</span>';
        h += '<span class="node-card-name">' + esc(n.id) + '</span>';
        if (n.summary) h += '<span class="node-card-desc">' + esc(n.summary) + '</span>';
        h += '<span class="node-card-chevron">&#9656;</span></div>';

        h += '<div class="node-card-body">';
        if (n.before) {
          h += '<div class="node-card-section"><h4>Before</h4><p style="color:var(--text-secondary);font-size:12px">' + esc(n.before) + '</p></div>';
        }
        if (n.structural && n.structural.length > 0) {
          h += '<div class="node-card-section"><h4>Structural</h4><ul class="structural-list">';
          n.structural.forEach(s => {
            let cls = s.startsWith("added:") ? "add" : s.startsWith("modified:") ? "mod" : s.startsWith("removed:") ? "del" : "";
            h += '<li class="' + cls + '">' + esc(s) + '</li>';
          });
          h += '</ul></div>';
        }
        if (diff && diff.files.length > 0) {
          h += '<div class="node-card-section"><h4>Code</h4>';
          diff.files.forEach(f => {
            h += '<div class="code-file"><div class="code-file-header">' + esc(f.file) + '</div>';
            h += '<div class="code-diff">' + renderDiffHtml(f.hunks) + '</div></div>';
          });
          h += '</div>';
        }
        h += '</div></div>';
      });
      h += '</div>';
    }

    // Moved
    if (delta.moved.length > 0) {
      h += '<div class="summary-group"><div class="summary-group-title">Moved</div>';
      delta.moved.forEach(m => {
        h += '<div class="node-card"><div class="node-card-header">';
        h += '<span class="node-badge" style="background:#1a0d2d;color:var(--accent-purple)">moved</span>';
        h += '<span class="node-card-name">' + esc(m.what) + '</span>';
        h += '<span class="node-card-desc">' + esc(m.from) + ' &rarr; ' + esc(m.to) + '</span>';
        h += '</div></div>';
      });
      h += '</div>';
    }

    // Blast radius
    if (delta.blast_radius.length > 0) {
      h += '<div class="summary-group"><div class="summary-group-title">Blast Radius</div><div class="blast-list">';
      delta.blast_radius.forEach(id => {
        const node = topology.nodes.find(n => n.id === id);
        h += '<div class="blast-item"><strong>' + esc(id) + '</strong>';
        if (node) h += ' &mdash; ' + esc(node.description);
        h += '</div>';
      });
      h += '</div></div>';
    }

    // Decisions
    if (delta.decision_trace.length > 0) {
      h += '<div class="summary-group"><div class="summary-group-title">Decisions</div><div class="decisions-list">';
      delta.decision_trace.forEach(d => {
        h += '<div class="decision-item"><strong>' + esc(d.decision) + '</strong>';
        h += '<div class="considered">vs. ' + d.alternatives.map(a => esc(a)).join(", ") + '</div>';
        h += '<div class="rationale">' + esc(d.rationale) + '</div></div>';
      });
      h += '</div></div>';
    }

    // Scope violations
    if (delta.scope_violations.length > 0) {
      h += '<div class="summary-group"><div class="summary-group-title" style="color:var(--accent-red)">Scope Violations</div>';
      delta.scope_violations.forEach(v => { h += '<p style="color:var(--accent-red);font-size:13px">' + esc(v) + '</p>'; });
      h += '</div>';
    }

    h += '</div>';
    container.innerHTML = h;

    // Toggle cards open/closed
    container.addEventListener("click", function(e) {
      const header = e.target.closest(".node-card-header");
      if (header) header.closest(".node-card").classList.toggle("open");
    });
  })();

  // Tabs
  document.querySelector(".tabs").addEventListener("click", function(e) {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById("view-" + tab.dataset.view).classList.add("active");
    if (tab.dataset.view === "graph" && !window._gi) { initGraph(); window._gi = true; }
  });

  function initGraph() {
    const allNodeIds = new Set([...topology.nodes.map(n => n.id), ...delta.added, ...delta.removed]);
    const nodes = Array.from(allNodeIds).map(id => {
      const tn = topology.nodes.find(n => n.id === id);
      const nd = nodeDiffs.find(d => d.nodeId === id);
      const w = nd ? nd.files.reduce((s, f) => s + f.hunks.split("\\n").length, 0) : 0;
      return { id, type: tn?.type || "", desc: tn?.description || "", status: getStatus(id), weight: w };
    });
    const maxW = Math.max(1, ...nodes.map(n => n.weight));
    const edges = [...topology.edges, ...delta.edges_added].map(e => {
      const k = e.from + "->" + e.to;
      return { source: e.from, target: e.to, desc: e.description || "", status: removedEdgeKeys.has(k) ? "removed" : addedEdgeKeys.has(k) ? "added" : "" };
    });

    const svg = document.getElementById("graph");
    const W = svg.clientWidth, H = svg.clientHeight;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = '<defs><marker id="arr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--border)"/></marker></defs>';

    const nm = new Map();
    nodes.forEach((n, i) => {
      const a = (2*Math.PI*i)/nodes.length, r = Math.min(W,H)*0.3;
      n.x = W/2+r*Math.cos(a); n.y = H/2+r*Math.sin(a);
      n.w = Math.max(80, n.id.length*8+24) + (n.status!=="unchanged" ? Math.min(20,(n.weight/maxW)*20) : 0);
      n.h = 34 + (n.status!=="unchanged" ? Math.min(12,(n.weight/maxW)*12) : 0);
      n.vx=0; n.vy=0; nm.set(n.id, n);
    });
    for(let t=0;t<300;t++){
      for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i],b=nodes[j]; let dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1,f=10000/(d*d);
        a.vx-=(dx/d)*f;a.vy-=(dy/d)*f;b.vx+=(dx/d)*f;b.vy+=(dy/d)*f;
      }
      edges.forEach(e=>{const a=nm.get(e.source),b=nm.get(e.target);if(!a||!b)return;let dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||1,f=(d-160)*0.008;a.vx+=(dx/d)*f;a.vy+=(dy/d)*f;b.vx-=(dx/d)*f;b.vy-=(dy/d)*f;});
      nodes.forEach(n=>{n.vx+=(W/2-n.x)*0.001;n.vy+=(H/2-n.y)*0.001;n.vx*=0.82;n.vy*=0.82;n.x+=n.vx;n.y+=n.vy;n.x=Math.max(n.w/2+10,Math.min(W-n.w/2-10,n.x));n.y=Math.max(n.h/2+10,Math.min(H-n.h/2-10,n.y));});
    }

    function ep(a,b){const dx=b.x-a.x,dy=b.y-a.y,ang=Math.atan2(dy,dx);function ix(hw,hh,an){const ac=Math.abs(Math.cos(an)),as=Math.abs(Math.sin(an));return hw*as<=hh*ac?hw/ac:hh/as;}return{x1:a.x+Math.cos(ang)*ix(a.w/2,a.h/2,ang),y1:a.y+Math.sin(ang)*ix(a.w/2,a.h/2,ang),x2:b.x-Math.cos(ang)*ix(b.w/2,b.h/2,ang+Math.PI),y2:b.y-Math.sin(ang)*ix(b.w/2,b.h/2,ang+Math.PI)};}

    edges.forEach(e=>{const a=nm.get(e.source),b=nm.get(e.target);if(!a||!b)return;const p=ep(a,b);
      const g=document.createElementNS("http://www.w3.org/2000/svg","g");g.setAttribute("class","edge-group");
      const l=document.createElementNS("http://www.w3.org/2000/svg","line");
      l.setAttribute("x1",p.x1);l.setAttribute("y1",p.y1);l.setAttribute("x2",p.x2);l.setAttribute("y2",p.y2);
      l.setAttribute("class","edge "+e.status);l.dataset.source=e.source;l.dataset.target=e.target;g.appendChild(l);
      if(e.desc){const t=document.createElementNS("http://www.w3.org/2000/svg","text");t.setAttribute("x",(p.x1+p.x2)/2);t.setAttribute("y",(p.y1+p.y2)/2-5);t.setAttribute("class","elabel");t.textContent=e.desc;g.appendChild(t);}
      svg.appendChild(g);
    });

    nodes.forEach(n=>{
      const g=document.createElementNS("http://www.w3.org/2000/svg","g");g.setAttribute("class","node "+n.status);
      g.setAttribute("transform","translate("+n.x+","+n.y+")");g.dataset.nodeId=n.id;
      const r=document.createElementNS("http://www.w3.org/2000/svg","rect");
      r.setAttribute("x",-n.w/2);r.setAttribute("y",-n.h/2);r.setAttribute("width",n.w);r.setAttribute("height",n.h);g.appendChild(r);
      const t=document.createElementNS("http://www.w3.org/2000/svg","text");t.setAttribute("class","nlabel");t.setAttribute("y",n.type?"-3":"0");t.textContent=n.id;g.appendChild(t);
      if(n.type){const tp=document.createElementNS("http://www.w3.org/2000/svg","text");tp.setAttribute("class","ntype");tp.setAttribute("y","10");tp.textContent=n.type;g.appendChild(tp);}
      g.addEventListener("click",()=>selectGraphNode(n.id));svg.appendChild(g);
    });
    applyFilters();
  }

  function selectGraphNode(id) {
    document.querySelectorAll(".node").forEach(g=>g.classList.remove("selected"));
    const el=document.querySelector('.node[data-node-id="'+id+'"]');if(el)el.classList.add("selected");
    const panel=document.getElementById("panel");
    const ci=delta.changed.find(c=>c.id===id);
    const tn=topology.nodes.find(n=>n.id===id);
    const nd=nodeDiffs.find(d=>d.nodeId===id);
    const st=getStatus(id);
    let h='<h3 style="margin-bottom:4px">'+esc(id)+'</h3>';
    h+='<span class="node-badge '+st+'" style="margin-bottom:8px;display:inline-block">'+st+'</span>';
    if(tn)h+='<p style="color:var(--text-secondary);font-size:12px;margin-top:8px">'+esc(tn.description)+'</p>';
    if(ci){h+='<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)"><h4 style="font-size:11px;color:var(--text-tertiary);margin-bottom:4px">CHANGE</h4><p style="font-size:13px">'+esc(ci.summary)+'</p></div>';}
    if(nd&&nd.files.length>0){h+='<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)"><h4 style="font-size:11px;color:var(--text-tertiary);margin-bottom:6px">CODE</h4>';
      nd.files.forEach(f=>{h+='<div class="code-file"><div class="code-file-header">'+esc(f.file)+'</div><div class="code-diff">'+renderDiffHtml(f.hunks)+'</div></div>';});
      h+='</div>';}
    panel.innerHTML=h;
  }

  const activeFilters=new Set(["changed","added","removed","blast-radius"]);
  function applyFilters(){
    document.querySelectorAll(".node").forEach(g=>{g.style.display=activeFilters.has(getStatus(g.dataset.nodeId))?"":"none";});
    document.querySelectorAll(".edge-group").forEach(g=>{const l=g.querySelector("line");if(!l)return;
      const s=document.querySelector('.node[data-node-id="'+l.dataset.source+'"]');
      const t=document.querySelector('.node[data-node-id="'+l.dataset.target+'"]');
      g.style.display=(s&&s.style.display!==""&&t&&t.style.display!=="")||(s&&s.style.display!=="none"&&t&&t.style.display!=="none")?"":"none";
    });
  }
  document.getElementById("filters")?.addEventListener("click",function(e){
    const b=e.target.closest(".filter-btn");if(!b)return;
    const s=b.dataset.status;
    if(activeFilters.has(s)){activeFilters.delete(s);b.classList.remove("active");}
    else{activeFilters.add(s);b.classList.add("active");}
    applyFilters();
  });
})();
`;
