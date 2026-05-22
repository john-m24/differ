export const CSS = `
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

/* Top bar: branch selector + commits */
.top-bar {
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

/* Branch selector */
.branch-selector {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--border);
}
.branch-pair { display: flex; align-items: center; gap: 6px; }
.branch-label { font-size: 10px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; }
.branch-select {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  cursor: pointer;
  outline: none;
  max-width: 260px;
}
.branch-select:hover { border-color: #2a2a2d; }
.branch-select:focus { border-color: var(--accent-blue); }
.branch-arrow { color: var(--text-tertiary); font-size: 16px; }

/* Commit bar */
.commit-bar {
  padding: 6px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  flex-shrink: 0;
}
.commit-bar-label { font-size: 10px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }
.commit-pills { display: flex; gap: 3px; flex: 1; overflow-x: auto; padding: 2px 0; }
.commit-pill {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 3px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  cursor: pointer;
  white-space: nowrap;
  color: var(--text-tertiary);
  transition: all 0.1s;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.commit-pill:hover { border-color: #2a2a2d; color: var(--text-primary); }
.commit-pill.selected { border-color: var(--accent-blue); color: var(--text-primary); background: #0d1a2d; }
.commit-pill .hash { color: var(--accent-blue); margin-right: 4px; }
.commit-bar-actions { display: flex; gap: 4px; flex-shrink: 0; }
.commit-bar-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-tertiary);
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 10px;
  cursor: pointer;
  text-transform: uppercase;
}
.commit-bar-btn:hover { color: var(--text-primary); border-color: #2a2a2d; }
.commit-bar-btn.active { color: var(--accent-blue); border-color: var(--accent-blue); }
.commit-summary { display: none; font-size: 11px; color: var(--text-secondary); }

/* Panels */
.panels { display: flex; flex: 1; overflow: hidden; }

.panel-left {
  width: 260px;
  min-width: 180px;
  overflow-y: auto;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}
.panel-center { flex: 1; overflow: auto; display: flex; flex-direction: column; }
.panel-right {
  width: 420px;
  min-width: 280px;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-divider {
  width: 3px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s;
  flex-shrink: 0;
}
.panel-divider:hover, .panel-divider.dragging { background: var(--accent-blue); opacity: 0.5; }

/* File tree */
.file-tree { flex: 1; overflow-y: auto; padding: 4px 0; }
.file-tree-filter {
  padding: 6px 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  background: #0d0d14;
}
.file-tree-filter-name { color: var(--accent-purple); font-weight: 500; }
.file-tree-filter-clear {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.file-tree-filter-clear:hover { color: var(--text-primary); }

.tree-dir-header {
  padding: 4px 12px;
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}
.tree-dir-header:hover { color: var(--text-secondary); background: var(--surface); }
.tree-dir-chevron { font-size: 8px; transition: transform 0.1s; }
.tree-dir.collapsed .tree-dir-chevron { transform: rotate(-90deg); }
.tree-dir.collapsed .tree-dir-files { display: none; }

.tree-file {
  padding: 4px 12px 4px 28px;
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  border-left: 2px solid transparent;
}
.tree-file:hover { background: var(--surface); color: var(--text-primary); }
.tree-file.selected { background: var(--surface); color: var(--text-primary); border-left-color: var(--accent-blue); }
.tree-file-status {
  font-size: 9px;
  font-weight: 700;
  width: 12px;
  flex-shrink: 0;
}
.tree-file-status.A { color: var(--accent-green); }
.tree-file-status.D { color: var(--accent-red); }
.tree-file-status.M { color: var(--accent-yellow); }
.tree-file-status.R { color: var(--accent-purple); }
.tree-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.file-tree-empty { padding: 24px 16px; text-align: center; color: var(--text-tertiary); font-size: 12px; font-style: italic; }

/* Diff view */
.diff-header {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  flex-shrink: 0;
}
.diff-header-path {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.diff-header-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  text-transform: uppercase;
  flex-shrink: 0;
}
.diff-header-badge.A { background: #002d1a; color: var(--accent-green); }
.diff-header-badge.D { background: #2d0000; color: var(--accent-red); }
.diff-header-badge.M { background: #2d2000; color: var(--accent-yellow); }
.diff-header-badge.R { background: #1a0d2d; color: var(--accent-purple); }
.diff-header-node {
  margin-left: auto;
  font-size: 11px;
  color: var(--accent-purple);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
}
.diff-header-node:hover { background: #0d0d14; }

.diff-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 13px;
  flex-direction: column;
  gap: 8px;
}
.diff-empty::before { content: "←"; font-size: 20px; opacity: 0.4; }

.diff-table-wrap { flex: 1; overflow: auto; }
.diff-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.6;
  table-layout: fixed;
}
.diff-table td { padding: 0 8px; white-space: pre; overflow: hidden; text-overflow: ellipsis; vertical-align: top; }
.diff-table .ln {
  width: 40px;
  min-width: 40px;
  text-align: right;
  color: var(--text-tertiary);
  padding-right: 8px;
  user-select: none;
  border-right: 1px solid var(--border);
  font-size: 10px;
  opacity: 0.6;
}
.diff-table .code { width: 50%; }
.diff-table .code-left { border-right: 1px solid var(--border); }
.diff-table tr.hunk-header td {
  background: #0d0d1a;
  color: var(--accent-purple);
  font-size: 11px;
  padding: 3px 8px;
  font-style: italic;
  opacity: 0.7;
}
.diff-table tr.del td.code-left { background: var(--diff-del-bg); color: var(--accent-red); }
.diff-table tr.add td.code-right { background: var(--diff-add-bg); color: var(--accent-green); }
.diff-table tr.change td.code-left { background: var(--diff-del-bg); color: var(--accent-red); }
.diff-table tr.change td.code-right { background: var(--diff-add-bg); color: var(--accent-green); }
.diff-table tr.ctx td { color: var(--text-tertiary); }

/* Graph panel */
.graph-toolbar { padding: 6px 10px; border-bottom: 1px solid var(--border); display: flex; gap: 4px; flex-wrap: wrap; flex-shrink: 0; align-items: center; }
.filter-btn { background: var(--surface); border: 1px solid var(--border); color: var(--text-tertiary); padding: 2px 7px; border-radius: 3px; font-size: 10px; cursor: pointer; }
.filter-btn.active { color: var(--text-primary); border-color: #2a2a2d; }
.filter-btn:not(.active) { opacity: 0.4; }
.graph-area { flex: 1; position: relative; overflow: hidden; }
#graph { width: 100%; height: 100%; cursor: grab; }

/* Graph nodes and edges */
.node { cursor: pointer; }
.node rect { rx: 4; ry: 4; stroke-width: 1.5; transition: all 0.15s; }
.node text { font-family: 'JetBrains Mono', 'Fira Code', monospace; pointer-events: none; }
.node .nlabel { font-size: 10px; fill: var(--text-primary); text-anchor: middle; dominant-baseline: middle; font-weight: 400; }
.node.unchanged rect { fill: var(--surface); stroke: var(--border); }
.node.changed rect { fill: #1a1400; stroke: var(--accent-yellow); }
.node.added rect { fill: #001a0d; stroke: var(--accent-green); }
.node.removed rect { fill: #1a0000; stroke: var(--accent-red); stroke-dasharray: 4; }
.node.blast-radius rect { fill: #0d0d1a; stroke: var(--accent-purple); stroke-dasharray: 2; }
.node.selected rect { stroke-width: 2.5; filter: drop-shadow(0 0 6px currentColor); }
.node.neighbor-highlight rect { stroke-width: 2; filter: drop-shadow(0 0 3px currentColor); }
.node.dimmed { opacity: 0.2; }
.node:hover rect { filter: brightness(1.3); }
.node.file-highlighted rect { stroke-width: 2.5; stroke: var(--accent-blue); }

.edge { stroke: var(--border); stroke-width: 1; fill: none; opacity: 0.6; }
.edge.added { stroke: var(--accent-green); stroke-width: 1.5; opacity: 1; }
.edge.removed { stroke: var(--accent-red); stroke-dasharray: 4; opacity: 1; }
.edge.neighbor-highlight { stroke-width: 2; opacity: 1; stroke: var(--text-secondary); }
.edge-group.dimmed { opacity: 0.1; }

.folder-group rect { fill: var(--surface); stroke: var(--border); stroke-width: 1; stroke-dasharray: 4; opacity: 0.4; }
.folder-label { font-size: 9px; fill: var(--text-tertiary); font-family: 'Inter', sans-serif; font-weight: 500; }
`;
