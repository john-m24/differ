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
import { useStore, DATA, getNodeStatus, getNodeActivity } from "../state.js";

function TopologyNode({ data }: { data: { label: string; changed: boolean; activity: { committed: number; staged: number; unstaged: number } } }) {
  const isChanged = data.changed;
  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 6,
        border: `1px solid ${isChanged ? "#2563eb" : "#e8e8e8"}`,
        background: isChanged ? "#eff6ff" : "#ffffff",
        fontSize: 11,
        fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
        color: "#1a1a1a",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ visibility: "hidden" }} />
      <span>{data.label}</span>
      <ActivityDots activity={data.activity} />
      <Handle type="source" position={Position.Right} style={{ visibility: "hidden" }} />
    </div>
  );
}

function ActivityDots({ activity }: { activity: { committed: number; staged: number; unstaged: number } }) {
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < Math.min(activity.committed, 4); i++) {
    dots.push(<span key={`c${i}`} style={{ width: 4, height: 4, borderRadius: "50%", background: "#2563eb", display: "inline-block" }} />);
  }
  for (let i = 0; i < Math.min(activity.staged, 3); i++) {
    dots.push(<span key={`s${i}`} style={{ width: 4, height: 4, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />);
  }
  for (let i = 0; i < Math.min(activity.unstaged, 3); i++) {
    dots.push(<span key={`u${i}`} style={{ width: 4, height: 4, borderRadius: "50%", border: "1px solid #999", background: "transparent", display: "inline-block" }} />);
  }
  if (dots.length === 0) return null;
  return <span style={{ display: "flex", gap: 2, marginLeft: 4 }}>{dots}</span>;
}

const nodeTypes: NodeTypes = { topology: TopologyNode };

export function GraphView() {
  const { selectedNode, setSelectedNode } = useStore();

  const { nodes, edges } = useMemo(() => {
    const layout = DATA.layout;
    const rfNodes: Node[] = layout.nodes.map(n => {
      const status = getNodeStatus(n.id);
      const activity = getNodeActivity(n.id);
      return {
        id: n.id,
        type: "topology",
        position: { x: n.x, y: n.y },
        data: {
          label: n.id.split("/").pop() || n.id,
          changed: status === "changed",
          activity,
        },
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
        style: { stroke: "#e8e8e8", strokeWidth: 1 },
        animated: false,
      }));

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
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.1}
      maxZoom={3}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: "default" }}
    >
      <Background color="#f0f0f0" gap={40} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
