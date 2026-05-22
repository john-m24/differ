export const CSS = `
:root {
  --bg: #ffffff;
  --surface: #f8f8f8;
  --border: #e8e8e8;
  --text: #1a1a1a;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --accent: #2563eb;
  --accent-light: #eff6ff;
  --diff-add-bg: #f0fdf4;
  --diff-add-text: #166534;
  --diff-del-bg: #fef2f2;
  --diff-del-text: #991b1b;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
#app { display: flex; flex-direction: column; height: 100vh; }

/* Status bar */
.status-bar {
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.status-branch {
  font-family: 'SF Mono', 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
}
.status-arrow { color: var(--text-tertiary); font-size: 11px; }
.status-base { color: var(--text-secondary); font-size: 12px; }
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.status-label { font-size: 11px; color: var(--text-tertiary); }
.status-counts {
  margin-left: auto;
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
}
.status-count { display: flex; align-items: center; gap: 4px; }
.status-count-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
.status-count-dot.committed { background: var(--accent); }
.status-count-dot.staged { background: #22c55e; }
.status-count-dot.unstaged { background: var(--text-tertiary); }

/* Graph area — primary view */
.graph-main {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0;
}
.graph-main .react-flow { width: 100%; height: 100%; }
.react-flow__background { opacity: 0.3; }

/* Drawer */
.drawer {
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: height 0.2s ease;
  flex-shrink: 0;
  overflow: hidden;
}
.drawer.closed { height: 0; border-top: none; }
.drawer.open { height: 320px; }

.drawer-header {
  padding: 8px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--surface);
  flex-shrink: 0;
}
.drawer-title {
  font-size: 12px;
  font-weight: 500;
}
.drawer-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text-tertiary);
  cursor: pointer;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 3px;
}
.drawer-close:hover { background: var(--border); color: var(--text); }

.drawer-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Reading order (left side of drawer) */
.reading-order {
  width: 280px;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  flex-shrink: 0;
}
.reading-file {
  padding: 6px 16px;
  font-size: 12px;
  font-family: 'SF Mono', 'JetBrains Mono', monospace;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}
.reading-file:hover { background: var(--surface); color: var(--text); }
.reading-file.selected { background: var(--accent-light); color: var(--accent); }
.reading-file-idx {
  font-size: 10px;
  color: var(--text-tertiary);
  width: 18px;
  flex-shrink: 0;
  text-align: right;
}
.reading-file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.reading-file-status {
  font-size: 9px;
  font-weight: 600;
  margin-left: auto;
  flex-shrink: 0;
}
.reading-file-status.A { color: #22c55e; }
.reading-file-status.D { color: #ef4444; }
.reading-file-status.M { color: var(--accent); }
.reading-file-status.R { color: #8b5cf6; }

/* Diff panel (right side of drawer) */
.diff-panel {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
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
  font-family: 'SF Mono', 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.diff-header-node {
  margin-left: auto;
  font-size: 11px;
  color: var(--accent);
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 3px;
  flex-shrink: 0;
}
.diff-header-node:hover { background: var(--accent-light); }

.diff-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 12px;
}

.diff-table-wrap { flex: 1; overflow: auto; }
.diff-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'SF Mono', 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 1.7;
  table-layout: fixed;
}
.diff-table td {
  padding: 0 8px;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: top;
}
.diff-table .ln {
  width: 36px;
  min-width: 36px;
  text-align: right;
  color: var(--text-tertiary);
  padding-right: 8px;
  user-select: none;
  border-right: 1px solid var(--border);
  font-size: 10px;
}
.diff-table .code { width: 50%; }
.diff-table .code-left { border-right: 1px solid var(--border); }
.diff-table tr.hunk-header td {
  background: var(--surface);
  color: var(--text-tertiary);
  font-size: 10px;
  padding: 2px 8px;
}
.diff-table tr.del td.code-left { background: var(--diff-del-bg); color: var(--diff-del-text); }
.diff-table tr.add td.code-right { background: var(--diff-add-bg); color: var(--diff-add-text); }
.diff-table tr.change td.code-left { background: var(--diff-del-bg); color: var(--diff-del-text); }
.diff-table tr.change td.code-right { background: var(--diff-add-bg); color: var(--diff-add-text); }
.diff-table tr.ctx td { color: var(--text-secondary); }

.diff-unified td.code { width: auto; }
.diff-unified tr.add td.code { background: var(--diff-add-bg); color: var(--diff-add-text); }
.diff-unified tr.del td.code { background: var(--diff-del-bg); color: var(--diff-del-text); }

/* Status bar semantic counts */
.status-separator { color: var(--text-tertiary); }
.status-routes { color: #d97706; }

/* Drawer kind badge */
.drawer-kind-badge {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: 0.5px;
}
.drawer-kind-badge.component { background: #eff6ff; color: #2563eb; }
.drawer-kind-badge.hook { background: #eff6ff; color: #6366f1; }
.drawer-kind-badge.store { background: #faf5ff; color: #7c3aed; }
.drawer-kind-badge.page { background: #ecfdf5; color: #059669; }
.drawer-kind-badge.context { background: #fefce8; color: #ca8a04; }

/* Drawer detail panel */
.drawer-detail-panel {
  width: 320px;
  border-right: 1px solid var(--border);
  overflow-y: auto;
  flex-shrink: 0;
}

/* Reading order groups */
.reading-group-title {
  padding: 6px 16px 2px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary);
}
.reading-file-status.changed { color: var(--accent); }
.reading-file-status.affected { color: #d97706; }
.reading-file-status.unchanged { color: var(--text-tertiary); }

/* Node detail panel */
.node-detail { padding: 12px 16px; }
.node-detail-empty { padding: 24px; color: var(--text-tertiary); text-align: center; }
.node-detail-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.node-detail-kind {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 3px;
}
.node-detail-kind.component { background: #eff6ff; color: #2563eb; }
.node-detail-kind.hook { background: #eff6ff; color: #6366f1; }
.node-detail-kind.store { background: #faf5ff; color: #7c3aed; }
.node-detail-kind.page { background: #ecfdf5; color: #059669; }
.node-detail-kind.context { background: #fefce8; color: #ca8a04; }
.node-detail-name { font-weight: 500; font-size: 13px; }
.node-detail-route { font-size: 11px; color: var(--text-secondary); font-family: 'SF Mono', monospace; }
.node-detail-status { font-size: 9px; font-weight: 600; margin-left: auto; }
.node-detail-status.changed { color: var(--accent); }
.node-detail-status.affected { color: #d97706; }
.node-detail-file {
  font-size: 11px;
  font-family: 'SF Mono', monospace;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}

.node-detail-sections { display: flex; flex-direction: column; gap: 12px; }
.node-detail-section-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.node-detail-prop {
  font-size: 11px;
  font-family: 'SF Mono', monospace;
  padding: 2px 0;
  display: flex;
  gap: 4px;
}
.prop-name { color: var(--text); }
.prop-optional { color: var(--text-tertiary); }
.prop-type { color: var(--text-secondary); }

.node-detail-store-key {
  font-size: 11px;
  font-family: 'SF Mono', monospace;
  padding: 2px 0;
  color: var(--text);
}

.node-detail-subscription { display: flex; align-items: center; gap: 6px; }
.subscribed-keys { font-size: 10px; color: var(--text-tertiary); font-family: 'SF Mono', monospace; }

.node-link {
  font-size: 11px;
  padding: 2px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.node-link.changed .node-link-name { color: var(--accent); }
.node-link.affected .node-link-name { color: #d97706; }
.node-link-kind {
  font-size: 9px;
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  font-weight: 600;
  text-transform: uppercase;
}
.node-link-kind.component { background: #eff6ff; color: #2563eb; }
.node-link-kind.hook { background: #eff6ff; color: #6366f1; }
.node-link-kind.store { background: #faf5ff; color: #7c3aed; }
.node-link-kind.page { background: #ecfdf5; color: #059669; }
.node-link-kind.context { background: #fefce8; color: #ca8a04; }
.node-link-name { color: var(--text); }

/* View switcher */
.view-switcher {
  display: flex;
  gap: 2px;
  background: var(--surface);
  border-radius: 5px;
  padding: 2px;
  margin-right: 12px;
}
.view-tab {
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.view-tab:hover { color: var(--text); }
.view-tab.active {
  background: var(--bg);
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}

/* Project view — layered architecture graph */
.project-view .react-flow { width: 100%; height: 100%; }
`;
