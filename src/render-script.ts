export const SCRIPT = `
(function() {
  const { topology, delta, nodeDiffs, layout, commits } = DATA;

  const changedIds = new Set(delta.changed.map(c => c.id));
  const addedIds = new Set(delta.added);
  const removedIds = new Set(delta.removed);
  const blastIds = new Set(delta.blast_radius);
  const diffNodeIds = new Set(nodeDiffs.map(nd => nd.nodeId));
  const removedEdgeKeys = new Set(delta.edges_removed.map(e => e.from + "->" + e.to));
  const addedEdgeKeys = new Set(delta.edges_added.map(e => e.from + "->" + e.to));

  // Build lookup maps
  const topoNodeById = {};
  topology.nodes.forEach(n => { topoNodeById[n.id] = n; });
  const diffById = {};
  nodeDiffs.forEach(d => { diffById[d.nodeId] = d; });

  // File to node ownership
  function fileMatchesPattern(file, pattern) {
    const re = pattern.replace(/\\./g, "\\\\.").replace(/\\*\\*\\//g, "(.+/)?").replace(/\\*\\*/g, ".*").replace(/\\*/g, "[^/]*");
    return new RegExp("^" + re + "$").test(file);
  }
  function getOwnerNode(filePath) {
    for (const node of topology.nodes) {
      if (node.files.some(p => fileMatchesPattern(filePath, p))) return node.id;
    }
    return null;
  }

  function getStatus(id) {
    if (addedIds.has(id)) return "added";
    if (removedIds.has(id)) return "removed";
    if (changedIds.has(id)) return "changed";
    if (blastIds.has(id)) return "blast-radius";
    if (diffNodeIds.has(id)) return "changed";
    return "unchanged";
  }

  function esc(s) { return s ? s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") : ""; }

  // ─── State ───────────────────────────────────────────────────
  const state = {
    commitRange: [0, (commits || []).length - 1],
    selectedNode: null,
    selectedFile: null,
    activeFilters: new Set(["changed","added","removed","blast-radius"]),
  };

  // Derived state
  let activeFiles = new Set();
  let activeFileHunks = [];
  let activeNodeIds = new Set();

  function recomputeActiveData() {
    if (!commits || commits.length === 0) {
      activeFiles = new Set(nodeDiffs.flatMap(nd => nd.files.map(f => f.file)));
      activeFileHunks = nodeDiffs.flatMap(nd => nd.files);
      activeNodeIds = new Set(nodeDiffs.map(nd => nd.nodeId));
      return;
    }

    const [start, end] = state.commitRange;
    const selectedCommits = commits.slice(start, end + 1);
    activeFiles = new Set();
    selectedCommits.forEach(c => c.files.forEach(f => activeFiles.add(f.path)));

    activeFileHunks = [];
    nodeDiffs.forEach(nd => {
      nd.files.forEach(f => {
        if (activeFiles.has(f.file)) activeFileHunks.push(f);
      });
    });

    activeNodeIds = new Set();
    nodeDiffs.forEach(nd => {
      if (nd.files.some(f => activeFiles.has(f.file))) activeNodeIds.add(nd.nodeId);
    });
  }

  function setState(patch) {
    Object.assign(state, patch);
    if ('commitRange' in patch) {
      recomputeActiveData();
      renderCommitBar();
      renderFileTree();
      if (state.selectedFile && !activeFiles.has(state.selectedFile)) {
        state.selectedFile = null;
      }
      renderDiffView();
      updateGraphHighlights();
    }
    if ('selectedNode' in patch) {
      renderFileTree();
      // Auto-select first file of the node
      if (state.selectedNode) {
        const node = topoNodeById[state.selectedNode];
        if (node) {
          const firstFile = activeFileHunks.find(f => fileMatchesPattern(f.file, node.files[0]) || node.files.some(p => fileMatchesPattern(f.file, p)));
          if (firstFile) state.selectedFile = firstFile.file;
          else state.selectedFile = null;
        }
      }
      renderDiffView();
      updateGraphHighlights();
    }
    if ('selectedFile' in patch) {
      renderDiffView();
      highlightFileInTree();
      highlightOwnerNode();
    }
    if ('activeFilters' in patch) {
      applyFilters();
    }
  }

  // ─── Commit Bar ──────────────────────────────────────────────
  function renderCommitBar() {
    const bar = document.getElementById("commit-bar");
    if (!commits || commits.length === 0) {
      bar.innerHTML = '<span class="commit-bar-label">No commit data</span>';
      return;
    }

    const [start, end] = state.commitRange;
    const allSelected = start === 0 && end === commits.length - 1;

    let h = '<span class="commit-bar-label">Commits</span>';
    h += '<div class="commit-bar-actions">';
    h += '<button class="commit-bar-btn' + (allSelected ? ' active' : '') + '" data-action="select-all">All</button>';
    h += '</div>';
    h += '<div class="commit-pills">';
    commits.forEach((c, i) => {
      const sel = i >= start && i <= end;
      const msg = c.message.length > 40 ? c.message.slice(0, 40) + "…" : c.message;
      h += '<div class="commit-pill' + (sel ? ' selected' : '') + '" data-idx="' + i + '">';
      h += '<span class="hash">' + esc(c.shortHash) + '</span>' + esc(msg);
      h += '</div>';
    });
    h += '</div>';
    h += '<div class="commit-summary"><span>' + (end - start + 1) + ' commits, ' + activeFiles.size + ' files</span></div>';
    h += '<button class="commit-bar-toggle" data-action="toggle-collapse">&#9776;</button>';

    bar.innerHTML = h;
  }

  document.getElementById("commit-bar").addEventListener("click", function(e) {
    const pill = e.target.closest(".commit-pill");
    if (pill) {
      const idx = parseInt(pill.dataset.idx);
      if (e.shiftKey && state.commitRange) {
        const [s] = state.commitRange;
        setState({ commitRange: [Math.min(s, idx), Math.max(s, idx)] });
      } else {
        setState({ commitRange: [idx, idx] });
      }
      return;
    }
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    if (btn.dataset.action === "select-all") {
      setState({ commitRange: [0, (commits || []).length - 1] });
    } else if (btn.dataset.action === "toggle-collapse") {
      document.getElementById("commit-bar").classList.toggle("collapsed");
    }
  });

  // ─── File Tree ───────────────────────────────────────────────
  function renderFileTree() {
    const container = document.getElementById("file-tree");
    let files = activeFileHunks;

    // Filter by selected node
    if (state.selectedNode) {
      const node = topoNodeById[state.selectedNode];
      if (node) {
        files = files.filter(f => node.files.some(p => fileMatchesPattern(f.file, p)));
      }
    }

    // Deduplicate by file path
    const seen = new Set();
    const uniqueFiles = [];
    files.forEach(f => {
      if (!seen.has(f.file)) { seen.add(f.file); uniqueFiles.push(f); }
    });

    let h = '';

    // Node filter indicator
    if (state.selectedNode) {
      const node = topoNodeById[state.selectedNode];
      h += '<div class="file-tree-filter">';
      h += '<span class="file-tree-filter-name">' + esc(state.selectedNode) + '</span>';
      h += '<button class="file-tree-filter-clear" data-action="clear-node">&times;</button>';
      h += '</div>';
    }

    if (uniqueFiles.length === 0) {
      h += '<div class="file-tree-empty">No files in selection</div>';
      container.innerHTML = h;
      return;
    }

    // Group by directory (collapse single-child)
    const dirs = {};
    uniqueFiles.forEach(f => {
      const parts = f.file.split("/");
      const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
      if (!dirs[dir]) dirs[dir] = [];
      dirs[dir].push(f);
    });

    h += '<div class="file-tree">';
    Object.keys(dirs).sort().forEach(dir => {
      h += '<div class="tree-dir">';
      h += '<div class="tree-dir-header"><span class="tree-dir-chevron">&#9662;</span> ' + esc(dir) + '</div>';
      h += '<div class="tree-dir-files">';
      dirs[dir].forEach(f => {
        const name = f.file.split("/").pop();
        const owner = getOwnerNode(f.file);
        const sel = state.selectedFile === f.file ? ' selected' : '';
        h += '<div class="tree-file' + sel + '" data-file="' + esc(f.file) + '">';
        h += '<span class="tree-file-status ' + f.status + '">' + f.status + '</span>';
        h += '<span class="tree-file-name">' + esc(name) + '</span>';
        if (owner && !state.selectedNode) h += '<span class="tree-file-node">' + esc(owner) + '</span>';
        h += '</div>';
      });
      h += '</div></div>';
    });
    h += '</div>';

    container.innerHTML = h;
  }

  document.getElementById("file-tree").addEventListener("click", function(e) {
    const file = e.target.closest(".tree-file");
    if (file) {
      setState({ selectedFile: file.dataset.file });
      return;
    }
    const dirHeader = e.target.closest(".tree-dir-header");
    if (dirHeader) {
      dirHeader.closest(".tree-dir").classList.toggle("collapsed");
      return;
    }
    const clearBtn = e.target.closest("[data-action=clear-node]");
    if (clearBtn) {
      setState({ selectedNode: null });
      return;
    }
  });

  function highlightFileInTree() {
    document.querySelectorAll(".tree-file").forEach(el => {
      el.classList.toggle("selected", el.dataset.file === state.selectedFile);
    });
  }

  // ─── Diff View ───────────────────────────────────────────────
  function parseSideBySide(hunks) {
    const lines = hunks.split("\\n");
    const rows = [];
    let leftNum = 0, rightNum = 0;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith("@@")) {
        // Parse line numbers from hunk header
        const match = line.match(/@@ -(\\d+)(?:,\\d+)? \\+(\\d+)(?:,\\d+)? @@/);
        if (match) {
          leftNum = parseInt(match[1]) - 1;
          rightNum = parseInt(match[2]) - 1;
        }
        rows.push({ type: "hunk", text: line });
        i++;
        continue;
      }

      // Collect consecutive del/add blocks to pair them
      if (line.startsWith("-")) {
        const dels = [];
        while (i < lines.length && lines[i].startsWith("-")) {
          dels.push(lines[i].slice(1));
          i++;
        }
        const adds = [];
        while (i < lines.length && lines[i].startsWith("+")) {
          adds.push(lines[i].slice(1));
          i++;
        }
        const maxLen = Math.max(dels.length, adds.length);
        for (let j = 0; j < maxLen; j++) {
          leftNum++;
          rightNum++;
          rows.push({
            type: j < dels.length && j < adds.length ? "change" : j < dels.length ? "del" : "add",
            left: j < dels.length ? { num: leftNum, text: dels[j] } : null,
            right: j < adds.length ? { num: rightNum, text: adds[j] } : null,
          });
          if (j >= dels.length) leftNum--;
          if (j >= adds.length) rightNum--;
        }
        continue;
      }

      if (line.startsWith("+")) {
        rightNum++;
        rows.push({ type: "add", left: null, right: { num: rightNum, text: line.slice(1) } });
        i++;
        continue;
      }

      // Context line
      if (line.startsWith(" ") || (!line.startsWith("\\\\") && line.length > 0)) {
        leftNum++;
        rightNum++;
        rows.push({ type: "ctx", left: { num: leftNum, text: line.startsWith(" ") ? line.slice(1) : line }, right: { num: rightNum, text: line.startsWith(" ") ? line.slice(1) : line } });
      }
      i++;
    }
    return rows;
  }

  function renderDiffView() {
    const container = document.getElementById("diff-view");

    if (!state.selectedFile) {
      container.innerHTML = '<div class="diff-empty">Select a file to view diff</div>';
      return;
    }

    // Find the file hunk
    let fileHunk = null;
    for (const nd of nodeDiffs) {
      const found = nd.files.find(f => f.file === state.selectedFile);
      if (found) { fileHunk = found; break; }
    }

    if (!fileHunk) {
      container.innerHTML = '<div class="diff-empty">No diff data for ' + esc(state.selectedFile) + '</div>';
      return;
    }

    const owner = getOwnerNode(state.selectedFile);
    let h = '<div class="diff-header">';
    h += '<span class="diff-header-badge ' + fileHunk.status + '">' + fileHunk.status + '</span>';
    h += '<span class="diff-header-path">' + esc(state.selectedFile) + '</span>';
    if (owner) h += '<span class="diff-header-node" data-node="' + esc(owner) + '">' + esc(owner) + '</span>';
    h += '</div>';

    const rows = parseSideBySide(fileHunk.hunks);
    h += '<div class="diff-table-wrap"><table class="diff-table">';
    rows.forEach(row => {
      if (row.type === "hunk") {
        h += '<tr class="hunk-header"><td colspan="4">' + esc(row.text) + '</td></tr>';
        return;
      }
      h += '<tr class="' + row.type + '">';
      h += '<td class="ln">' + (row.left ? row.left.num : '') + '</td>';
      h += '<td class="code code-left">' + (row.left ? esc(row.left.text) : '') + '</td>';
      h += '<td class="ln">' + (row.right ? row.right.num : '') + '</td>';
      h += '<td class="code code-right">' + (row.right ? esc(row.right.text) : '') + '</td>';
      h += '</tr>';
    });
    h += '</table></div>';

    container.innerHTML = h;
  }

  document.getElementById("diff-view").addEventListener("click", function(e) {
    const nodeLink = e.target.closest(".diff-header-node");
    if (nodeLink) {
      setState({ selectedNode: nodeLink.dataset.node });
    }
  });

  // ─── Graph ───────────────────────────────────────────────────
  function initGraph() {
    const { nodes, edges, width, height } = layout;
    const svg = document.getElementById("graph");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.innerHTML = '<defs><marker id="arr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--border)"/></marker><marker id="arr-add" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent-green)"/></marker><marker id="arr-del" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent-red)"/></marker></defs>';

    // Draw folder groups
    (layout.folders || []).forEach(f => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "folder-group");
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", f.x);
      rect.setAttribute("y", f.y);
      rect.setAttribute("width", f.width);
      rect.setAttribute("height", f.height);
      rect.setAttribute("rx", "8");
      g.appendChild(rect);
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", f.x + 8);
      label.setAttribute("y", f.y + 14);
      label.setAttribute("class", "folder-label");
      label.textContent = f.path;
      g.appendChild(label);
      svg.appendChild(g);
    });

    edges.forEach(e => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "edge-group");
      g.dataset.source = e.source;
      g.dataset.target = e.target;

      if (e.points && e.points.length >= 2) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let d = "M " + e.points[0].x + " " + e.points[0].y;
        for (let i = 1; i < e.points.length; i++) {
          d += " L " + e.points[i].x + " " + e.points[i].y;
        }
        path.setAttribute("d", d);
        path.setAttribute("class", "edge " + e.status);
        if (e.status === "added") path.style.markerEnd = "url(#arr-add)";
        else if (e.status === "removed") path.style.markerEnd = "url(#arr-del)";
        else path.style.markerEnd = "url(#arr)";
        g.appendChild(path);

      }
      svg.appendChild(g);
    });

    nodes.forEach(n => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "node " + n.status);
      g.setAttribute("transform", "translate(" + n.x + "," + n.y + ")");
      g.dataset.nodeId = n.id;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", -n.width / 2);
      rect.setAttribute("y", -n.height / 2);
      rect.setAttribute("width", n.width);
      rect.setAttribute("height", n.height);
      g.appendChild(rect);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "nlabel");
      text.setAttribute("y", "0");
      text.textContent = n.id;
      g.appendChild(text);

      g.addEventListener("click", () => {
        if (state.selectedNode === n.id) {
          setState({ selectedNode: null });
        } else {
          setState({ selectedNode: n.id });
        }
      });
      svg.appendChild(g);
    });

    applyFilters();
    updateGraphHighlights();

    // Zoom and pan
    let zoom = 1;
    let panX = 0, panY = 0;
    let isPanning = false, panStartX = 0, panStartY = 0, panStartPanX = 0, panStartPanY = 0;

    function applyTransform() {
      const vw = width / zoom;
      const vh = height / zoom;
      const vx = (width - vw) / 2 - panX / zoom;
      const vy = (height - vh) / 2 - panY / zoom;
      svg.setAttribute("viewBox", vx + " " + vy + " " + vw + " " + vh);
    }

    svg.addEventListener("wheel", function(e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      zoom = Math.max(0.2, Math.min(5, zoom * delta));
      applyTransform();
    }, { passive: false });

    let dragMoved = false;
    svg.addEventListener("mousedown", function(e) {
      isPanning = true;
      dragMoved = false;
      panStartX = e.clientX;
      panStartY = e.clientY;
      panStartPanX = panX;
      panStartPanY = panY;
      svg.style.cursor = "grabbing";
      e.preventDefault();
    });
    document.addEventListener("mousemove", function(e) {
      if (!isPanning) return;
      const dx = e.clientX - panStartX;
      const dy = e.clientY - panStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
      panX = panStartPanX + dx;
      panY = panStartPanY + dy;
      applyTransform();
    });
    document.addEventListener("mouseup", function() {
      if (isPanning) { isPanning = false; svg.style.cursor = ""; }
    });

    // Suppress node click if user was dragging
    svg.addEventListener("click", function(e) {
      if (dragMoved) { e.stopPropagation(); dragMoved = false; }
    }, true);
  }

  function updateGraphHighlights() {
    document.querySelectorAll(".node").forEach(g => {
      const id = g.dataset.nodeId;
      g.classList.remove("selected", "dimmed", "neighbor-highlight", "file-highlighted");

      if (state.selectedNode === id) {
        g.classList.add("selected");
      } else if (state.selectedNode) {
        // Check if neighbor
        const isNeighbor = layout.edges.some(e =>
          (e.source === state.selectedNode && e.target === id) ||
          (e.target === state.selectedNode && e.source === id)
        );
        if (isNeighbor) g.classList.add("neighbor-highlight");
      }

      // Dim nodes not in active commit range (only if not showing all)
      const showingAll = state.commitRange[0] === 0 && state.commitRange[1] === (commits || []).length - 1;
      if (!showingAll && !activeNodeIds.has(id) && getStatus(id) !== "unchanged") {
        g.classList.add("dimmed");
      }

      // Highlight node that owns selected file
      if (state.selectedFile && !state.selectedNode) {
        const owner = getOwnerNode(state.selectedFile);
        if (owner === id) g.classList.add("file-highlighted");
      }
    });

    // Edge highlighting
    document.querySelectorAll(".edge-group").forEach(g => {
      const src = g.dataset.source, tgt = g.dataset.target;
      g.classList.remove("dimmed");
      const edgePath = g.querySelector(".edge");
      if (edgePath) edgePath.classList.remove("neighbor-highlight");

      if (state.selectedNode) {
        if (src === state.selectedNode || tgt === state.selectedNode) {
          if (edgePath) edgePath.classList.add("neighbor-highlight");
        }
      }

      const showingAll = state.commitRange[0] === 0 && state.commitRange[1] === (commits || []).length - 1;
      if (!showingAll) {
        const srcActive = activeNodeIds.has(src);
        const tgtActive = activeNodeIds.has(tgt);
        if (!srcActive && !tgtActive) g.classList.add("dimmed");
      }
    });
  }

  function highlightOwnerNode() {
    document.querySelectorAll(".node.file-highlighted").forEach(g => g.classList.remove("file-highlighted"));
    if (state.selectedFile && !state.selectedNode) {
      const owner = getOwnerNode(state.selectedFile);
      if (owner) {
        const el = document.querySelector('.node[data-node-id="' + owner + '"]');
        if (el) el.classList.add("file-highlighted");
      }
    }
  }

  // ─── Filters ─────────────────────────────────────────────────
  function applyFilters() {
    document.querySelectorAll(".node").forEach(g => {
      const status = getStatus(g.dataset.nodeId);
      g.style.display = state.activeFilters.has(status) ? "" : "none";
    });
    document.querySelectorAll(".edge-group").forEach(g => {
      const src = g.dataset.source, tgt = g.dataset.target;
      const sNode = document.querySelector('.node[data-node-id="' + src + '"]');
      const tNode = document.querySelector('.node[data-node-id="' + tgt + '"]');
      const visible = sNode && tNode && sNode.style.display !== "none" && tNode.style.display !== "none";
      g.style.display = visible ? "" : "none";
    });
  }

  document.getElementById("filters").addEventListener("click", function(e) {
    const b = e.target.closest(".filter-btn");
    if (!b) return;
    const s = b.dataset.status;
    if (state.activeFilters.has(s)) { state.activeFilters.delete(s); b.classList.remove("active"); }
    else { state.activeFilters.add(s); b.classList.add("active"); }
    applyFilters();
  });

  // ─── Panel Resizing ──────────────────────────────────────────
  document.querySelectorAll(".panel-divider").forEach(divider => {
    divider.addEventListener("mousedown", function(e) {
      e.preventDefault();
      const dir = divider.dataset.resize;
      const panel = dir === "left"
        ? document.querySelector(".panel-left")
        : document.querySelector(".panel-right");
      const startX = e.clientX;
      const startWidth = panel.offsetWidth;
      divider.classList.add("dragging");

      function onMove(e) {
        const dx = e.clientX - startX;
        const newWidth = dir === "left" ? startWidth + dx : startWidth - dx;
        const clamped = Math.max(160, Math.min(600, newWidth));
        panel.style.width = clamped + "px";
      }
      function onUp() {
        divider.classList.remove("dragging");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        try { localStorage.setItem("differ-panel-" + dir, panel.style.width); } catch(e) {}
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  });

  // Restore saved widths
  try {
    const lw = localStorage.getItem("differ-panel-left");
    const rw = localStorage.getItem("differ-panel-right");
    if (lw) document.querySelector(".panel-left").style.width = lw;
    if (rw) document.querySelector(".panel-right").style.width = rw;
  } catch(e) {}

  // ─── Init ────────────────────────────────────────────────────
  recomputeActiveData();
  renderCommitBar();
  renderFileTree();
  renderDiffView();
  initGraph();
})();
`;
