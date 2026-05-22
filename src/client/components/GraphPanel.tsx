import React, { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import { useStore, DATA, getStatus } from "../state.js";

const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  changed: { bg: "#1a1400", border: "#fbbf24" },
  added: { bg: "#001a0d", border: "#34d399" },
  removed: { bg: "#1a0000", border: "#f87171" },
  "blast-radius": { bg: "#0d0d1a", border: "#a78bfa" },
  unchanged: { bg: "#141415", border: "#1e1e20" },
};

function FileNode({ data }: { data: { label: string; status: string; fullPath: string } }) {
  const colors = STATUS_COLORS[data.status] || STATUS_COLORS.unchanged;
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 4,
        border: `1.5px solid ${colors.border}`,
        background: colors.bg,
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        color: "#ededef",
        whiteSpace: "nowrap",
        maxWidth: 160,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={data.fullPath}
    >
      <Handle type="target" position={Position.Left} style={{ visibility: "hidden" }} />
      {data.label}
      <Handle type="source" position={Position.Right} style={{ visibility: "hidden" }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { file: FileNode };

export function GraphPanel() {
  const { activeFilters, selectedNode, activeNodeIds, commitRange, setSelectedNode, toggleFilter } = useStore();
  const commits = DATA.commits || [];
  const showingAll = commitRange[0] === 0 && commitRange[1] === commits.length - 1;

  const { nodes, edges } = useMemo(() => {
    const layout = DATA.layout;
    const rfNodes: Node[] = layout.nodes
      .filter(n => activeFilters.has(getStatus(n.id)))
      .map(n => {
        const status = getStatus(n.id);
        const dimmed = !showingAll && !activeNodeIds.has(n.id) && status !== "unchanged";
        return {
          id: n.id,
          type: "file",
          position: { x: n.x, y: n.y },
          data: { label: n.id.split("/").pop() || n.id, status, fullPath: n.id },
          style: dimmed ? { opacity: 0.25 } : undefined,
          selected: n.id === selectedNode,
        };
      });

    const visibleIds = new Set(rfNodes.map(n => n.id));
    const rfEdges: Edge[] = layout.edges
      .filter(e => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map(e => ({
        id: `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        style: { stroke: "#1e1e20", strokeWidth: 1, opacity: 0.5 },
        animated: false,
      }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [activeFilters, selectedNode, activeNodeIds, showingAll]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(selectedNode === node.id ? null : node.id);
  }, [selectedNode, setSelectedNode]);

  return (
    <>
      <div className="graph-toolbar">
        {["changed", "added", "removed", "blast-radius", "unchanged"].map(s => (
          <button
            key={s}
            className={"filter-btn" + (activeFilters.has(s) ? " active" : "")}
            onClick={() => toggleFilter(s)}
          >
            {s === "blast-radius" ? "Blast radius" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <div className="graph-area">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "default" }}
        >
          <Background color="#1e1e20" gap={30} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => STATUS_COLORS[(n.data as any)?.status]?.border || "#1e1e20"}
            style={{ background: "#0a0a0b", border: "1px solid #1e1e20" }}
          />
        </ReactFlow>
      </div>
    </>
  );
}
