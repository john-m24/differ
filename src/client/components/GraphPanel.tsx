import { useRef, useEffect } from "preact/hooks";
import { selectedNode, activeFilters, activeNodeIds, commitRange, selectedFile, setSelectedNode, getStatus, getOwnerNode, DATA } from "../state.js";

export function GraphPanel() {
  const svgRef = useRef<SVGSVGElement>(null);
  const initedRef = useRef(false);

  useEffect(() => {
    if (initedRef.current || !svgRef.current) return;
    initedRef.current = true;
    initGraph(svgRef.current);
  }, []);

  useEffect(() => {
    updateHighlights(svgRef.current);
  });

  return (
    <>
      <div class="graph-toolbar" id="filters">
        {["changed", "added", "removed", "blast-radius", "unchanged"].map(s => (
          <FilterBtn key={s} status={s} />
        ))}
      </div>
      <div class="graph-area">
        <svg ref={svgRef} id="graph" />
      </div>
    </>
  );
}

function FilterBtn({ status }: { status: string }) {
  const active = activeFilters.value.has(status);
  return (
    <button
      class={"filter-btn" + (active ? " active" : "")}
      onClick={() => {
        const next = new Set(activeFilters.value);
        if (next.has(status)) next.delete(status);
        else next.add(status);
        activeFilters.value = next;
      }}
    >{status === "blast-radius" ? "Blast radius" : status.charAt(0).toUpperCase() + status.slice(1)}</button>
  );
}

function initGraph(svg: SVGSVGElement) {
  const { nodes, edges, folders, width, height } = DATA.layout;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = '<defs><marker id="arr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--border)"/></marker><marker id="arr-add" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent-green)"/></marker><marker id="arr-del" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--accent-red)"/></marker></defs>';

  // Folder groups
  (folders || []).forEach(f => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "folder-group");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(f.x));
    rect.setAttribute("y", String(f.y));
    rect.setAttribute("width", String(f.width));
    rect.setAttribute("height", String(f.height));
    rect.setAttribute("rx", "8");
    g.appendChild(rect);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(f.x + 8));
    label.setAttribute("y", String(f.y + 14));
    label.setAttribute("class", "folder-label");
    label.textContent = f.path;
    g.appendChild(label);
    svg.appendChild(g);
  });

  // Edges
  edges.forEach(e => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "edge-group");
    g.dataset.source = e.source;
    g.dataset.target = e.target;
    if (e.points && e.points.length >= 2) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      let d = "M " + e.points[0].x + " " + e.points[0].y;
      for (let i = 1; i < e.points.length; i++) d += " L " + e.points[i].x + " " + e.points[i].y;
      path.setAttribute("d", d);
      path.setAttribute("class", "edge " + e.status);
      if (e.status === "added") path.style.markerEnd = "url(#arr-add)";
      else if (e.status === "removed") path.style.markerEnd = "url(#arr-del)";
      else path.style.markerEnd = "url(#arr)";
      g.appendChild(path);
    }
    svg.appendChild(g);
  });

  // Nodes
  nodes.forEach(n => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "node " + n.status);
    g.setAttribute("transform", `translate(${n.x},${n.y})`);
    g.dataset.nodeId = n.id;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(-n.width / 2));
    rect.setAttribute("y", String(-n.height / 2));
    rect.setAttribute("width", String(n.width));
    rect.setAttribute("height", String(n.height));
    g.appendChild(rect);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "nlabel");
    text.setAttribute("y", "0");
    text.textContent = n.id.split("/").pop() || n.id;
    g.appendChild(text);
    g.setAttribute("title", n.id);
    g.addEventListener("click", () => {
      if (selectedNode.value === n.id) setSelectedNode(null);
      else setSelectedNode(n.id);
    });
    svg.appendChild(g);
  });

  // Zoom and pan — start fitted to the container
  let vbX = 0, vbY = 0, vbW = width, vbH = height;

  function fitToView() {
    vbX = -20;
    vbY = -20;
    vbW = width + 40;
    vbH = height + 40;
    svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  }
  fitToView();

  let isPanning = false, dragMoved = false;
  let panStartX = 0, panStartY = 0, startVbX = 0, startVbY = 0;

  function applyViewBox() {
    svg.setAttribute("viewBox", `${vbX} ${vbY} ${vbW} ${vbH}`);
  }

  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const newW = vbW * factor;
    const newH = vbH * factor;
    vbX += (vbW - newW) * mx;
    vbY += (vbH - newH) * my;
    vbW = newW;
    vbH = newH;
    applyViewBox();
  }, { passive: false });

  svg.addEventListener("mousedown", (e) => {
    isPanning = true;
    dragMoved = false;
    panStartX = e.clientX;
    panStartY = e.clientY;
    startVbX = vbX;
    startVbY = vbY;
    svg.style.cursor = "grabbing";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isPanning) return;
    const rect = svg.getBoundingClientRect();
    const dx = (e.clientX - panStartX) / rect.width * vbW;
    const dy = (e.clientY - panStartY) / rect.height * vbH;
    if (Math.abs(e.clientX - panStartX) > 3 || Math.abs(e.clientY - panStartY) > 3) dragMoved = true;
    vbX = startVbX - dx;
    vbY = startVbY - dy;
    applyViewBox();
  });

  document.addEventListener("mouseup", () => {
    if (isPanning) { isPanning = false; svg.style.cursor = ""; }
  });

  svg.addEventListener("click", (e) => {
    if (dragMoved) { e.stopPropagation(); dragMoved = false; }
  }, true);
}

function updateHighlights(svg: SVGSVGElement | null) {
  if (!svg) return;
  const filters = activeFilters.value;
  const commits = DATA.commits || [];
  const [start, end] = commitRange.value;
  const showingAll = start === 0 && end === commits.length - 1;

  svg.querySelectorAll<SVGGElement>(".node").forEach(g => {
    const id = g.dataset.nodeId!;
    const status = getStatus(id);
    g.style.display = filters.has(status) ? "" : "none";
    g.classList.remove("selected", "dimmed", "neighbor-highlight", "file-highlighted");

    if (selectedNode.value === id) {
      g.classList.add("selected");
    } else if (selectedNode.value) {
      const isNeighbor = DATA.layout.edges.some(e =>
        (e.source === selectedNode.value && e.target === id) ||
        (e.target === selectedNode.value && e.source === id)
      );
      if (isNeighbor) g.classList.add("neighbor-highlight");
    }

    if (!showingAll && !activeNodeIds.value.has(id) && status !== "unchanged") {
      g.classList.add("dimmed");
    }

    if (selectedFile.value && !selectedNode.value) {
      const owner = getOwnerNode(selectedFile.value);
      if (owner === id) g.classList.add("file-highlighted");
    }
  });

  svg.querySelectorAll<SVGGElement>(".edge-group").forEach(g => {
    const src = g.dataset.source!;
    const tgt = g.dataset.target!;
    const srcEl = svg.querySelector(`.node[data-node-id="${src}"]`) as HTMLElement;
    const tgtEl = svg.querySelector(`.node[data-node-id="${tgt}"]`) as HTMLElement;
    const visible = srcEl && tgtEl && srcEl.style.display !== "none" && tgtEl.style.display !== "none";
    g.style.display = visible ? "" : "none";
    g.classList.remove("dimmed");

    if (selectedNode.value) {
      const edgePath = g.querySelector(".edge");
      if (edgePath) {
        edgePath.classList.toggle("neighbor-highlight", src === selectedNode.value || tgt === selectedNode.value);
      }
    }

    if (!showingAll && !activeNodeIds.value.has(src) && !activeNodeIds.value.has(tgt)) {
      g.classList.add("dimmed");
    }
  });
}
