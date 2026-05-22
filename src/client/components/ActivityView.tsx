import React, { useMemo, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import { useStore, DATA, getNodeStatus, getVisibleNodeIds, getHiddenNeighborCount, getActivitySet } from "../state.js";
import { computeActivityLayout } from "../layout.js";
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

const EDGE_STYLES: Record<string, { stroke: string; strokeDasharray?: string; strokeWidth: number }> = {
  renders: { stroke: "#6b7280", strokeWidth: 1.5 },
  "uses-hook": { stroke: "#6366f1", strokeDasharray: "4 3", strokeWidth: 1.5 },
  subscribes: { stroke: "#7c3aed", strokeDasharray: "2 2", strokeWidth: 1.5 },
  provides: { stroke: "#059669", strokeDasharray: "6 3", strokeWidth: 1.5 },
  "consumes-context": { stroke: "#ca8a04", strokeDasharray: "3 4", strokeWidth: 1.5 },
  "nests-route": { stroke: "#059669", strokeDasharray: "8 4", strokeWidth: 1 },
};

function ActivityNode({ data }: { data: { label: string; kind: ReactNodeKind; status: string; route?: string; dimmed: boolean; hiddenCount: number; nodeId: string } }) {
  const style = KIND_STYLES[data.kind];
  const colors = STATUS_COLORS[data.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.unchanged;
  const { expandNode } = useStore();

  const onBadgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    expandNode(data.nodeId);
  }, [data.nodeId, expandNode]);

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
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      {style.icon && <span style={{ opacity: 0.5, fontSize: 10 }}>{style.icon}</span>}
      <span>{data.route || data.label}</span>
      {data.hiddenCount > 0 && (
        <button
          onClick={onBadgeClick}
          className="expand-badge"
        >
          +{data.hiddenCount}
        </button>
      )}
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { activity: ActivityNode };

function FitViewOnChange({ visibleSize }: { visibleSize: number }) {
  const reactFlow = useReactFlow();
  const prevSize = useRef(visibleSize);

  useEffect(() => {
    if (visibleSize !== prevSize.current && visibleSize > 0) {
      setTimeout(() => reactFlow.fitView({ duration: 300, padding: 0.2 }), 50);
    }
    prevSize.current = visibleSize;
  }, [visibleSize, reactFlow]);

  return null;
}

export function ActivityView() {
  const { selectedNode, setSelectedNode, expandedNodes, resetActivityView, dataVersion } = useStore();
  const prevVisibleRef = useRef<Set<string>>(new Set());

  const visibleSet = useMemo(() => getVisibleNodeIds(), [expandedNodes, dataVersion]);

  const neighborIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const ids = new Set<string>();
    for (const edge of DATA.topology.edges) {
      if (edge.from === selectedNode && visibleSet.has(edge.to)) ids.add(edge.to);
      if (edge.to === selectedNode && visibleSet.has(edge.from)) ids.add(edge.from);
    }
    return ids;
  }, [selectedNode, visibleSet]);

  const { nodes, edges } = useMemo(() => {
    const visibleNodes = DATA.topology.nodes.filter(n => visibleSet.has(n.id));
    const visibleEdges = DATA.topology.edges.filter(
      e => visibleSet.has(e.from) && visibleSet.has(e.to)
    );

    const layout = computeActivityLayout(visibleNodes, visibleEdges);
    const entering = new Set<string>();
    for (const id of visibleSet) {
      if (!prevVisibleRef.current.has(id)) entering.add(id);
    }

    const rfNodes: Node[] = layout.nodes.map(n => {
      const topoNode = DATA.topology.nodes.find(tn => tn.id === n.id);
      const status = getNodeStatus(n.id);
      const isNeighbor = neighborIds.has(n.id);
      const dimmed = selectedNode !== null && n.id !== selectedNode && !isNeighbor;
      const hiddenCount = getHiddenNeighborCount(n.id, visibleSet);
      const isEntering = entering.has(n.id);

      return {
        id: n.id,
        type: "activity",
        position: { x: n.x - n.width / 2, y: n.y - n.height / 2 },
        data: {
          label: topoNode?.name || n.id.split("/").pop() || n.id,
          kind: topoNode?.kind || "component",
          status,
          route: topoNode?.route,
          dimmed,
          hiddenCount,
          nodeId: n.id,
        },
        selected: n.id === selectedNode,
        className: isEntering ? "node-entering" : undefined,
      };
    });

    const rfEdges: Edge[] = visibleEdges.map(e => {
      const edgeStyle = EDGE_STYLES[e.kind] || EDGE_STYLES.renders;
      const isHighlighted = selectedNode && (e.from === selectedNode || e.to === selectedNode);
      const isDimmed = selectedNode && !isHighlighted;

      return {
        id: `${e.from}->${e.to}:${e.kind}`,
        source: e.from,
        target: e.to,
        style: {
          stroke: edgeStyle.stroke,
          strokeWidth: isHighlighted ? edgeStyle.strokeWidth + 0.5 : edgeStyle.strokeWidth,
          strokeDasharray: edgeStyle.strokeDasharray,
          opacity: isDimmed ? 0.2 : 1,
          transition: "opacity 0.2s",
        },
        animated: false,
      };
    });

    return { nodes: rfNodes, edges: rfEdges };
  }, [visibleSet, selectedNode, neighborIds, dataVersion]);

  useEffect(() => {
    prevVisibleRef.current = visibleSet;
  }, [visibleSet]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(selectedNode === node.id ? null : node.id);
  }, [selectedNode, setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const activitySet = getActivitySet();
  const isEmpty = activitySet.size === 0 && DATA.git.committed.length === 0;

  if (isEmpty) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af", fontFamily: "'SF Mono', monospace", fontSize: 13 }}>
        Watching for changes...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlowProvider>
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
          <FitViewOnChange visibleSize={visibleSet.size} />
        </ReactFlow>
      </ReactFlowProvider>
      {expandedNodes.size > 0 && (
        <button
          onClick={resetActivityView}
          className="reset-activity-btn"
        >
          Reset
        </button>
      )}
    </div>
  );
}
