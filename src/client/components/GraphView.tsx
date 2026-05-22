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

function SemanticNode({ data }: { data: { label: string; kind: ReactNodeKind; status: string; route?: string } }) {
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
  renders: { stroke: "#d1d5db", strokeWidth: 1 },
  "uses-hook": { stroke: "#93c5fd", strokeDasharray: "4 3", strokeWidth: 1 },
  subscribes: { stroke: "#c4b5fd", strokeDasharray: "2 2", strokeWidth: 1.5 },
  provides: { stroke: "#86efac", strokeDasharray: "6 3", strokeWidth: 1.5 },
};

export function GraphView() {
  const { selectedNode, setSelectedNode } = useStore();

  const { nodes, edges } = useMemo(() => {
    const layout = DATA.layout;
    const topoNodes = DATA.topology.nodes;

    const rfNodes: Node[] = layout.nodes.map(n => {
      const topoNode = topoNodes.find(tn => tn.id === n.id);
      const status = getNodeStatus(n.id);
      return {
        id: n.id,
        type: "semantic",
        position: { x: n.x - n.width / 2, y: n.y - n.height / 2 },
        data: {
          label: topoNode?.name || n.id.split("/").pop() || n.id,
          kind: topoNode?.kind || "component",
          status,
          route: topoNode?.route,
        },
        selected: n.id === selectedNode,
      };
    });

    const rfEdges: Edge[] = layout.edges.map(e => {
      const style = EDGE_STYLES[e.kind] || EDGE_STYLES.renders;
      return {
        id: `${e.source}->${e.target}:${e.kind}`,
        source: e.source,
        target: e.target,
        style: {
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeDasharray: style.strokeDasharray,
        },
        animated: false,
      };
    });

    return { nodes: rfNodes, edges: rfEdges };
  }, [selectedNode]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(selectedNode === node.id ? null : node.id);
  }, [selectedNode, setSelectedNode]);

  return (
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
      <Background color="#f5f5f5" gap={40} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
