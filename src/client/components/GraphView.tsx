import React, { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import { useStore, DATA, getNodeStatus } from "../state.js";
import type { ReactNodeKind } from "../types.js";

const KIND_STYLES: Record<ReactNodeKind, { borderStyle: string; icon: string }> = {
  page: { borderStyle: "solid", icon: "◻" },
  component: { borderStyle: "solid", icon: "" },
  hook: { borderStyle: "dashed", icon: "⟡" },
  store: { borderStyle: "solid", icon: "◎" },
  context: { borderStyle: "dotted", icon: "○" },
};

const STATUS_COLORS = {
  changed: { border: "#2563eb", bg: "#eff6ff" },
  affected: { border: "#d97706", bg: "#fffbeb" },
  unchanged: { border: "#e5e7eb", bg: "#ffffff" },
};

function SemanticNode({ data }: { data: { label: string; kind: ReactNodeKind; status: string; route?: string; dimmed: boolean } }) {
  const style = KIND_STYLES[data.kind];
  const colors = STATUS_COLORS[data.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.unchanged;

  return (
    <div
      style={{
        padding: data.kind === "page" ? "8px 14px" : "6px 10px",
        borderRadius: data.kind === "page" ? 8 : data.kind === "store" ? 12 : 5,
        border: `1.5px ${style.borderStyle} ${colors.border}`,
        background: colors.bg,
        fontSize: data.kind === "page" ? 12 : 11,
        fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
        fontWeight: data.kind === "page" ? 500 : 400,
        color: "#1a1a1a",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 5,
        opacity: data.dimmed ? 0.25 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      {style.icon && <span style={{ opacity: 0.5, fontSize: 10 }}>{style.icon}</span>}
      <span>{data.route || data.label}</span>
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { semantic: SemanticNode };

const EDGE_STYLES: Record<string, { stroke: string; strokeDasharray?: string; strokeWidth: number }> = {
  renders: { stroke: "#6b7280", strokeWidth: 1.5 },
  "uses-hook": { stroke: "#6366f1", strokeDasharray: "4 3", strokeWidth: 1.5 },
  subscribes: { stroke: "#7c3aed", strokeDasharray: "2 2", strokeWidth: 1.5 },
  provides: { stroke: "#059669", strokeDasharray: "6 3", strokeWidth: 1.5 },
};

export function GraphView() {
  const { selectedNode, setSelectedNode } = useStore();

  const neighborIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const ids = new Set<string>();
    for (const edge of DATA.topology.edges) {
      if (edge.from === selectedNode) ids.add(edge.to);
      if (edge.to === selectedNode) ids.add(edge.from);
    }
    return ids;
  }, [selectedNode]);

  const { nodes, edges } = useMemo(() => {
    const layout = DATA.layout;
    const topoNodes = DATA.topology.nodes;

    const rfNodes: Node[] = layout.nodes.map(n => {
      const topoNode = topoNodes.find(tn => tn.id === n.id);
      const status = getNodeStatus(n.id);
      const isNeighbor = neighborIds.has(n.id);
      const dimmed = selectedNode !== null && n.id !== selectedNode && !isNeighbor;

      return {
        id: n.id,
        type: "semantic",
        position: { x: n.x - n.width / 2, y: n.y - n.height / 2 },
        data: {
          label: topoNode?.name || n.id.split("/").pop() || n.id,
          kind: topoNode?.kind || "component",
          status,
          route: topoNode?.route,
          dimmed,
        },
        selected: n.id === selectedNode,
      };
    });

    // Only show edges connected to the selected node
    const rfEdges: Edge[] = [];
    if (selectedNode) {
      for (const e of DATA.topology.edges) {
        if (e.from !== selectedNode && e.to !== selectedNode) continue;
        const style = EDGE_STYLES[e.kind] || EDGE_STYLES.renders;
        rfEdges.push({
          id: `${e.from}->${e.to}:${e.kind}`,
          source: e.from,
          target: e.to,
          style: {
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            strokeDasharray: style.strokeDasharray,
          },
          animated: false,
        });
      }
    }

    return { nodes: rfNodes, edges: rfEdges };
  }, [selectedNode, neighborIds]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(selectedNode === node.id ? null : node.id);
  }, [selectedNode, setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={3}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: "default" }}
    >
      <Background color="#f5f5f5" gap={40} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
