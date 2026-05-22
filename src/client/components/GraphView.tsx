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
  changed: { border: "#d97706", bg: "#fef3c7" },
  affected: { border: "#7c3aed", bg: "#ede9fe" },
  unchanged: { border: "#e5e7eb", bg: "#ffffff" },
};

const CLUSTER_COLORS: Record<ReactNodeKind, { bg: string; border: string; label: string }> = {
  page: { bg: "#ecfdf510", border: "#05966920", label: "Routes" },
  component: { bg: "#eff6ff10", border: "#2563eb20", label: "Components" },
  hook: { bg: "#eef2ff10", border: "#6366f120", label: "Hooks" },
  context: { bg: "#fefce810", border: "#ca8a0420", label: "Contexts" },
  store: { bg: "#faf5ff10", border: "#7c3aed20", label: "Stores" },
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

function ClusterNode({ data }: { data: { label: string; kind: ReactNodeKind; width: number; height: number } }) {
  const colors = CLUSTER_COLORS[data.kind];
  return (
    <div
      style={{
        width: data.width,
        height: data.height,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        position: "relative",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 6,
          left: 10,
          fontSize: 9,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          color: colors.border.replace("20", "80"),
          opacity: 0.8,
        }}
      >
        {colors.label}
      </span>
    </div>
  );
}

const nodeTypes: NodeTypes = { semantic: SemanticNode, cluster: ClusterNode };

const EDGE_STYLES: Record<string, { stroke: string; strokeDasharray?: string; strokeWidth: number }> = {
  renders: { stroke: "#6b7280", strokeWidth: 1.5 },
  "uses-hook": { stroke: "#6366f1", strokeDasharray: "4 3", strokeWidth: 1.5 },
  subscribes: { stroke: "#7c3aed", strokeDasharray: "2 2", strokeWidth: 1.5 },
  provides: { stroke: "#059669", strokeDasharray: "6 3", strokeWidth: 1.5 },
  "consumes-context": { stroke: "#ca8a04", strokeDasharray: "3 4", strokeWidth: 1.5 },
  "nests-route": { stroke: "#059669", strokeDasharray: "8 4", strokeWidth: 1 },
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
    const rfNodes: Node[] = [];

    // Add cluster background nodes
    if (layout.clusters) {
      for (const cluster of layout.clusters) {
        rfNodes.push({
          id: cluster.id,
          type: "cluster",
          position: { x: cluster.x - cluster.width / 2, y: cluster.y - cluster.height / 2 },
          data: {
            label: cluster.kind,
            kind: cluster.kind,
            width: cluster.width,
            height: cluster.height,
          },
          selectable: false,
          draggable: false,
          zIndex: -1,
        });
      }
    }

    // Add regular nodes
    for (const n of layout.nodes) {
      const topoNode = topoNodes.find(tn => tn.id === n.id);
      const status = getNodeStatus(n.id);
      const isNeighbor = neighborIds.has(n.id);
      const dimmed = selectedNode !== null && n.id !== selectedNode && !isNeighbor;

      rfNodes.push({
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
      });
    }

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
    if (node.id.startsWith("__cluster_")) return;
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
