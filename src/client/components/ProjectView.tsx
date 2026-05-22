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
import { DATA, useStore, getNodeStatus } from "../state.js";
import type { ReactNode, ReactNodeKind } from "../types.js";

const LAYERS: ReactNodeKind[] = ["page", "component", "hook", "context", "store"];

const LAYER_LABELS: Record<ReactNodeKind, string> = {
  page: "Routes",
  component: "Components",
  hook: "Hooks",
  context: "Contexts",
  store: "Stores",
};

const LAYER_COLORS: Record<ReactNodeKind, { bg: string; border: string; text: string }> = {
  page: { bg: "#ecfdf5", border: "#059669", text: "#065f46" },
  component: { bg: "#eff6ff", border: "#2563eb", text: "#1e40af" },
  hook: { bg: "#eef2ff", border: "#6366f1", text: "#4338ca" },
  context: { bg: "#fefce8", border: "#ca8a04", text: "#854d0e" },
  store: { bg: "#faf5ff", border: "#7c3aed", text: "#5b21b6" },
};

const MAX_PER_ROW = 7;
const NODE_H_GAP = 20;
const NODE_V_GAP = 12;
const NODE_HEIGHT = 34;
const LEFT_MARGIN = 90;
const TOP_MARGIN = 40;
const BAND_GAP = 50;
const NODE_WIDTH = 130;

function LayerNode({ data }: { data: { label: string; kind: ReactNodeKind; status: string; route?: string; dimmed: boolean } }) {
  const layer = LAYER_COLORS[data.kind];
  const hasStatus = data.status !== "unchanged";
  const statusColor = data.status === "changed" ? "#2563eb" : "#d97706";

  return (
    <div
      style={{
        padding: "6px 12px",
        borderRadius: data.kind === "store" ? 10 : data.kind === "page" ? 7 : 5,
        border: `1.5px solid ${hasStatus ? statusColor : layer.border}`,
        background: hasStatus ? (data.status === "changed" ? "#eff6ff" : "#fffbeb") : layer.bg,
        fontSize: 11,
        fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
        fontWeight: 500,
        color: hasStatus ? statusColor : layer.text,
        whiteSpace: "nowrap",
        boxShadow: hasStatus ? `0 0 0 2px ${statusColor}22` : "0 1px 2px rgba(0,0,0,0.04)",
        opacity: data.dimmed ? 0.2 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      <span>{data.route || data.label}</span>
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </div>
  );
}

function BandLabelNode({ data }: { data: { label: string; kind: ReactNodeKind; count: number } }) {
  const layer = LAYER_COLORS[data.kind];
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        color: layer.border,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 2,
      }}
    >
      <span>{data.label}</span>
      <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.5 }}>{data.count}</span>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  layerNode: LayerNode,
  bandLabel: BandLabelNode,
};

const EDGE_STYLES: Record<string, { stroke: string; strokeDasharray?: string }> = {
  renders: { stroke: "#6b7280" },
  "uses-hook": { stroke: "#6366f1", strokeDasharray: "4 3" },
  subscribes: { stroke: "#7c3aed", strokeDasharray: "2 2" },
  provides: { stroke: "#059669", strokeDasharray: "6 3" },
};

export function ProjectView() {
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
    const topoNodes = DATA.topology.nodes;
    const topoEdges = DATA.topology.edges;

    const layerGroups: Record<ReactNodeKind, ReactNode[]> = {
      page: [], component: [], hook: [], context: [], store: [],
    };
    for (const node of topoNodes) {
      layerGroups[node.kind].push(node);
    }
    for (const kind of LAYERS) {
      layerGroups[kind].sort((a, b) => a.name.localeCompare(b.name));
    }

    const rfNodes: Node[] = [];
    let currentY = TOP_MARGIN;

    for (const kind of LAYERS) {
      const group = layerGroups[kind];
      if (group.length === 0) continue;

      const rows = Math.ceil(group.length / MAX_PER_ROW);
      const bandHeight = rows * (NODE_HEIGHT + NODE_V_GAP) - NODE_V_GAP;

      rfNodes.push({
        id: `__band_${kind}`,
        type: "bandLabel",
        position: { x: 0, y: currentY + bandHeight / 2 - 10 },
        data: { label: LAYER_LABELS[kind], kind, count: group.length },
        selectable: false,
        draggable: false,
      });

      for (let i = 0; i < group.length; i++) {
        const row = Math.floor(i / MAX_PER_ROW);
        const col = i % MAX_PER_ROW;
        const node = group[i];
        const status = getNodeStatus(node.id);
        const isNeighbor = neighborIds.has(node.id);
        const dimmed = selectedNode !== null && node.id !== selectedNode && !isNeighbor;

        rfNodes.push({
          id: node.id,
          type: "layerNode",
          position: {
            x: LEFT_MARGIN + col * (NODE_WIDTH + NODE_H_GAP),
            y: currentY + row * (NODE_HEIGHT + NODE_V_GAP),
          },
          data: {
            label: node.name,
            kind: node.kind,
            status,
            route: node.route,
            dimmed,
          },
        });
      }

      currentY += bandHeight + BAND_GAP;
    }

    // Only show edges for selected node
    const rfEdges: Edge[] = [];
    if (selectedNode) {
      const seen = new Set<string>();
      for (const edge of topoEdges) {
        if (edge.from !== selectedNode && edge.to !== selectedNode) continue;
        const key = `${edge.from}->${edge.to}:${edge.kind}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const style = EDGE_STYLES[edge.kind] || EDGE_STYLES.renders;
        rfEdges.push({
          id: key,
          source: edge.from,
          target: edge.to,
          style: {
            stroke: style.stroke,
            strokeWidth: 1.5,
            strokeDasharray: style.strokeDasharray,
          },
          animated: false,
        });
      }
    }

    return { nodes: rfNodes, edges: rfEdges };
  }, [selectedNode, neighborIds]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.id.startsWith("__band_")) return;
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
      minZoom={0.3}
      maxZoom={3}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: "default" }}
      nodesDraggable={true}
      nodesConnectable={false}
    >
      <Background color="#f8f8f8" gap={40} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
