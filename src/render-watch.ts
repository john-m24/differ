import type { Topology, SystemDelta, Timeline } from "./types.js";
import type { NodeDiff } from "./diff.js";
import { renderReview } from "./render.js";

export function renderWatchView(
  topology: Topology,
  delta: SystemDelta | null,
  nodeDiffs: NodeDiff[],
  timeline: Timeline
): string {
  if (delta) {
    return injectTimeline(renderReview(topology, delta, nodeDiffs), topology, delta, timeline);
  }
  return renderTimelineOnly(topology, delta, timeline);
}

function injectTimeline(html: string, topology: Topology, delta: SystemDelta | null, timeline: Timeline): string {
  html = html.replace(
    '<button class="tab" data-view="graph">Graph</button>',
    '<button class="tab" data-view="graph">Graph</button>\n      <button class="tab" data-view="timeline">Timeline</button>'
  );

  html = html.replace(
    "</div>\n<script>",
    '  <main class="view" id="view-timeline"></main>\n</div>\n<script>'
  );

  const timelineData = JSON.stringify(timeline);
  const topoData = JSON.stringify(topology);
  const deltaData = JSON.stringify(delta);

  const injection = `<style>${TIMELINE_CSS}</style>\n<script>\nconst TIMELINE_DATA = ${timelineData};\nconst TOPO = ${topoData};\nconst DELTA_STATE = ${deltaData};\n${TIMELINE_JS}\n</script>`;
  html = html.replace("</body>", injection + "\n</body>");

  return html;
}

function renderTimelineOnly(topology: Topology, delta: SystemDelta | null, timeline: Timeline): string {
  const topoData = JSON.stringify(topology).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
  const deltaData = JSON.stringify(delta);
  const timelineData = JSON.stringify(timeline);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Differ Watch</title>
<style>
${BASE_CSS}
${TIMELINE_CSS}
</style>
</head>
<body>
<div id="app">
  <header>
    <h1>differ <span class="watch-badge">watch</span></h1>
    <nav class="tabs">
      <button class="tab active" data-view="timeline">Timeline</button>
    </nav>
  </header>

  <main class="view active" id="view-timeline"></main>
</div>
<script>
const TOPO = ${topoData};
const DELTA_STATE = ${deltaData};
const TIMELINE_DATA = ${timelineData};
${TIMELINE_JS}
${TAB_JS}
</script>
</body>
</html>`;
}

const BASE_CSS = `
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
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; background: var(--bg); color: var(--text-primary); font-size: 14px; line-height: 1.5; }
#app { display: flex; flex-direction: column; height: 100vh; }

header { padding: 12px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 24px; }
header h1 { font-size: 15px; font-weight: 600; color: var(--text-secondary); letter-spacing: -0.3px; }
.watch-badge { font-size: 10px; background: #1a2d1a; color: var(--accent-green); padding: 2px 6px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: middle; }
.tabs { display: flex; gap: 2px; }
.tab { background: none; border: none; color: var(--text-tertiary); padding: 6px 12px; border-radius: 5px; cursor: pointer; font-size: 13px; font-weight: 500; }
.tab:hover { color: var(--text-secondary); }
.tab.active { background: var(--surface); color: var(--text-primary); }

.view { display: none; flex: 1; overflow: hidden; }
.view.active { display: flex; flex-direction: column; }
`;

const TIMELINE_CSS = `
#view-timeline { overflow-y: auto; padding: 24px; }
.timeline-layout { display: grid; grid-template-columns: 280px 1fr; gap: 24px; max-width: 1100px; margin: 0 auto; width: 100%; }
@media (max-width: 800px) { .timeline-layout { grid-template-columns: 1fr; } }

/* Activity map (left panel) */
.activity-map { position: sticky; top: 0; align-self: start; }
.activity-map h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-tertiary); margin-bottom: 10px; }
.activity-node { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 6px; margin-bottom: 4px; border: 1px solid var(--border); transition: all 0.3s; }
.activity-node-name { font-size: 12px; font-weight: 500; flex: 1; }
.activity-node-heat { width: 40px; height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; }
.activity-node-heat-bar { height: 100%; border-radius: 3px; transition: width 0.5s, background 0.5s; }
.activity-node.hot { border-color: #2d2000; }
.activity-node.hot .activity-node-name { color: var(--accent-yellow); }
.activity-node.unexpected { border-color: #2d1a00; background: #1a0d00; }
.activity-node.unexpected .activity-node-name { color: var(--accent-red); }

/* Staleness */
.staleness-bar { padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 16px; font-size: 11px; color: var(--text-tertiary); display: flex; align-items: center; gap: 8px; }
.staleness-bar.stale { border-color: #2d2000; background: #1a1400; }
.staleness-bar.stale .staleness-label { color: var(--accent-yellow); }
.staleness-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-green); }
.staleness-bar.stale .staleness-dot { background: var(--accent-yellow); }

/* Timeline feed (right panel) */
.timeline-feed { }
.timeline-status { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; background: var(--surface); }
.timeline-status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-green); animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.timeline-status-text { font-size: 12px; color: var(--text-secondary); }

.timeline-empty { color: var(--text-tertiary); text-align: center; padding: 60px 0; font-style: italic; }

.timeline-entry { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; padding: 12px 16px; transition: border-color 0.2s; }
.timeline-entry:hover { border-color: #2a2a2d; }
.timeline-entry.has-unexpected { border-color: #2d1a00; border-left: 3px solid var(--accent-red); }
.timeline-entry.has-commit { border-color: #1a1a2d; border-left: 3px solid var(--accent-purple); }

.timeline-entry-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.timeline-time { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 11px; color: var(--text-tertiary); }
.timeline-commit-tag { font-size: 10px; padding: 1px 6px; border-radius: 3px; background: #1a1a2d; color: var(--accent-purple); font-weight: 500; }
.timeline-unexpected-tag { font-size: 10px; padding: 1px 6px; border-radius: 3px; background: #2d0d00; color: var(--accent-red); font-weight: 600; }

.timeline-entry-nodes { display: flex; flex-wrap: wrap; gap: 6px; }
.timeline-node { display: flex; align-items: center; gap: 8px; padding: 5px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; font-size: 12px; }
.timeline-node.unexpected { border-color: #2d1a00; background: #1a0d00; }
.timeline-node-name { font-weight: 500; }
.timeline-node-stats { display: flex; gap: 6px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 11px; }
.timeline-node-stats .add { color: var(--accent-green); }
.timeline-node-stats .del { color: var(--accent-red); }
.timeline-node-files { font-size: 10px; color: var(--text-tertiary); }

.timeline-commit-msg { font-size: 11px; color: var(--accent-purple); margin-top: 6px; font-family: 'JetBrains Mono', 'Fira Code', monospace; padding: 4px 8px; background: #0d0d14; border-radius: 4px; }
`;

const TIMELINE_JS = `
(function() {
  const container = document.getElementById("view-timeline");
  const entries = TIMELINE_DATA.entries || [];
  const topo = TOPO;
  const delta = DELTA_STATE;

  // Track cumulative activity per node
  const activityCounts = {};
  topo.nodes.forEach(n => { activityCounts[n.id] = 0; });
  const unexpectedNodes = new Set();

  // Count from existing entries
  entries.forEach(e => {
    (e.incremental || e.nodes || []).forEach(n => {
      activityCounts[n.id] = (activityCounts[n.id] || 0) + n.linesAdded + n.linesRemoved;
    });
    (e.unexpected || []).forEach(id => unexpectedNodes.add(id));
  });

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function getStaleness() {
    if (!delta) return { stale: false, label: "No analysis yet" };
    if (entries.length === 0) return { stale: false, label: "Analysis is current" };
    const totalIncremental = entries.reduce((sum, e) => {
      return sum + (e.incremental || []).reduce((s, n) => s + n.linesAdded + n.linesRemoved, 0);
    }, 0);
    if (totalIncremental > 100) return { stale: true, label: totalIncremental + " lines changed since last analysis" };
    if (totalIncremental > 0) return { stale: false, label: totalIncremental + " lines since analysis" };
    return { stale: false, label: "Analysis is current" };
  }

  function getMaxActivity() {
    const vals = Object.values(activityCounts);
    return Math.max(1, ...vals);
  }

  function renderActivityMap() {
    const maxAct = getMaxActivity();
    const expectedIds = new Set();
    if (delta) {
      (delta.changed || []).forEach(c => expectedIds.add(c.id));
      (delta.added || []).forEach(id => expectedIds.add(id));
      (delta.blast_radius || []).forEach(id => expectedIds.add(id));
    }

    const sorted = [...topo.nodes].sort((a, b) => (activityCounts[b.id] || 0) - (activityCounts[a.id] || 0));

    let h = '<div class="activity-map">';
    h += '<h3>System Activity</h3>';

    const staleness = getStaleness();
    h += '<div class="staleness-bar' + (staleness.stale ? ' stale' : '') + '">';
    h += '<span class="staleness-dot"></span>';
    h += '<span class="staleness-label">' + staleness.label + '</span>';
    h += '</div>';

    for (const node of sorted) {
      const count = activityCounts[node.id] || 0;
      const pct = Math.round((count / maxAct) * 100);
      const isHot = count > 0;
      const isUnexpected = unexpectedNodes.has(node.id);
      let cls = "activity-node";
      if (isUnexpected) cls += " unexpected";
      else if (isHot) cls += " hot";

      let heatColor = "var(--border)";
      if (isUnexpected) heatColor = "var(--accent-red)";
      else if (pct > 60) heatColor = "var(--accent-yellow)";
      else if (pct > 0) heatColor = "var(--accent-green)";

      h += '<div class="' + cls + '">';
      h += '<span class="activity-node-name">' + node.id + '</span>';
      h += '<div class="activity-node-heat"><div class="activity-node-heat-bar" style="width:' + pct + '%;background:' + heatColor + '"></div></div>';
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  function renderEntry(entry) {
    const inc = entry.incremental || entry.nodes || [];
    const hasUnexpected = entry.unexpected && entry.unexpected.length > 0;
    const hasCommit = entry.commitsBefore && entry.commitsBefore.length > 0;
    let cls = "timeline-entry";
    if (hasUnexpected) cls += " has-unexpected";
    else if (hasCommit) cls += " has-commit";

    let h = '<div class="' + cls + '">';
    h += '<div class="timeline-entry-header">';
    h += '<span class="timeline-time">' + formatTime(entry.timestamp) + '</span>';
    if (hasCommit) h += '<span class="timeline-commit-tag">commit</span>';
    if (hasUnexpected) h += '<span class="timeline-unexpected-tag">unexpected</span>';
    h += '</div>';

    if (hasCommit) {
      h += '<div class="timeline-commit-msg">' + entry.commitsBefore.map(c => c.replace(/</g, "&lt;")).join("<br>") + '</div>';
    }

    if (inc.length > 0) {
      h += '<div class="timeline-entry-nodes">';
      for (const node of inc) {
        const isU = hasUnexpected && entry.unexpected.includes(node.id);
        h += '<div class="timeline-node' + (isU ? ' unexpected' : '') + '">';
        h += '<span class="timeline-node-name">' + node.id + '</span>';
        h += '<span class="timeline-node-stats">';
        if (node.linesAdded > 0) h += '<span class="add">+' + node.linesAdded + '</span>';
        if (node.linesRemoved > 0) h += '<span class="del">-' + node.linesRemoved + '</span>';
        h += '</span>';
        h += '<span class="timeline-node-files">' + node.filesChanged + ' file' + (node.filesChanged !== 1 ? 's' : '') + '</span>';
        h += '</div>';
      }
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  function render() {
    let h = '<div class="timeline-layout">';
    h += renderActivityMap();
    h += '<div class="timeline-feed">';
    h += '<div class="timeline-status"><span class="timeline-status-dot"></span><span class="timeline-status-text">Watching for changes...</span></div>';

    if (entries.length === 0) {
      h += '<div class="timeline-empty">No activity yet. Waiting for agent to make changes.</div>';
    } else {
      for (let i = entries.length - 1; i >= 0; i--) {
        h += renderEntry(entries[i]);
      }
    }
    h += '</div></div>';
    container.innerHTML = h;
  }

  render();

  // SSE for live updates
  const evtSource = new EventSource("/api/events");
  evtSource.addEventListener("timeline-entry", function(e) {
    const entry = JSON.parse(e.data);
    entries.push(entry);

    (entry.incremental || []).forEach(n => {
      activityCounts[n.id] = (activityCounts[n.id] || 0) + n.linesAdded + n.linesRemoved;
    });
    (entry.unexpected || []).forEach(id => unexpectedNodes.add(id));

    render();
    container.scrollTop = 0;
  });
})();
`;

const TAB_JS = `
document.querySelector(".tabs")?.addEventListener("click", function(e) {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById("view-" + tab.dataset.view).classList.add("active");
});
`;
