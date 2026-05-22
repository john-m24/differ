import React from "react";
import { useStore, DATA, fileMatchesPattern } from "../state.js";

export function ReadingOrder() {
  const { readingOrder, selectedNode, selectedFile, setSelectedFile } = useStore();

  let files = readingOrder;

  if (selectedNode) {
    const node = DATA.topology.nodes.find(n => n.id === selectedNode);
    if (node) {
      files = files.filter(f => node.files.some(p => fileMatchesPattern(f, p)));
    }
  }

  function getFileStatus(file: string): string {
    for (const nd of DATA.git.committed) {
      const found = nd.files.find(f => f.file === file);
      if (found) return found.status;
    }
    const staged = DATA.git.staged.find(f => f.file === file);
    if (staged) return staged.status;
    const unstaged = DATA.git.unstaged.find(f => f.file === file);
    if (unstaged) return unstaged.status;
    return "M";
  }

  if (files.length === 0) {
    return <div className="reading-order" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>No files</div>;
  }

  return (
    <div className="reading-order">
      {files.map((file, i) => {
        const name = file.split("/").pop();
        const status = getFileStatus(file);
        return (
          <div
            key={file}
            className={"reading-file" + (selectedFile === file ? " selected" : "")}
            onClick={() => setSelectedFile(file)}
          >
            <span className="reading-file-idx">{i + 1}</span>
            <span className="reading-file-name" title={file}>{name}</span>
            <span className={"reading-file-status " + status}>{status}</span>
          </div>
        );
      })}
    </div>
  );
}
