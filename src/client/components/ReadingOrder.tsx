import React from "react";
import { useStore, DATA, getNodeStatus } from "../state.js";

export function ReadingOrder() {
  const { readingOrder, selectedNode, selectedFile, setSelectedFile } = useStore();

  let files = readingOrder;

  // If a node is selected, show only its file
  if (selectedNode) {
    const node = DATA.topology.nodes.find(n => n.id === selectedNode);
    if (node) {
      files = files.filter(f => f === node.filePath);
      if (files.length === 0) files = [node.filePath];
    }
  }

  if (files.length === 0) {
    return (
      <div className="reading-order" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12 }}>
        No changes
      </div>
    );
  }

  // Group by kind
  const groups = groupByKind(files);

  return (
    <div className="reading-order">
      {groups.map(group => (
        <div key={group.kind} className="reading-group">
          <div className="reading-group-title">{group.kind}</div>
          {group.items.map((item, i) => (
            <div
              key={item.filePath}
              className={"reading-file" + (selectedFile === item.filePath ? " selected" : "")}
              onClick={() => setSelectedFile(item.filePath)}
            >
              <span className="reading-file-idx">{item.index}</span>
              <span className="reading-file-name" title={item.filePath}>{item.name}</span>
              <span className={"reading-file-status " + item.status}>{item.status === "changed" ? "●" : "○"}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

interface GroupItem {
  filePath: string;
  name: string;
  status: string;
  index: number;
}

function groupByKind(files: string[]): { kind: string; items: GroupItem[] }[] {
  const kindOrder = ["Stores", "Hooks", "Contexts", "Components", "Pages"];
  const groups = new Map<string, GroupItem[]>();

  let idx = 1;
  for (const filePath of files) {
    const nodes = DATA.topology.nodes.filter(n => n.filePath === filePath);
    const primaryNode = nodes[0];
    if (!primaryNode) continue;

    const groupName = primaryNode.kind === "store" ? "Stores"
      : primaryNode.kind === "hook" ? "Hooks"
      : primaryNode.kind === "context" ? "Contexts"
      : primaryNode.kind === "page" ? "Pages"
      : "Components";

    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push({
      filePath,
      name: primaryNode.name,
      status: getNodeStatus(primaryNode.id),
      index: idx++,
    });
  }

  return kindOrder
    .filter(k => groups.has(k))
    .map(k => ({ kind: k, items: groups.get(k)! }));
}
