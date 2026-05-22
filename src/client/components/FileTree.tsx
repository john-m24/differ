import React, { useState } from "react";
import { useStore, DATA, fileMatchesPattern } from "../state.js";
import type { FileHunk } from "../types.js";

export function FileTree() {
  const { selectedNode, selectedFile, activeFileHunks, setSelectedFile, setSelectedNode } = useStore();
  let files = activeFileHunks;

  if (selectedNode) {
    const node = DATA.topology.nodes.find(n => n.id === selectedNode);
    if (node) {
      files = files.filter(f => node.files.some(p => fileMatchesPattern(f.file, p)));
    }
  }

  const seen = new Set<string>();
  const uniqueFiles: FileHunk[] = [];
  files.forEach(f => { if (!seen.has(f.file)) { seen.add(f.file); uniqueFiles.push(f); } });

  const dirs: Record<string, FileHunk[]> = {};
  uniqueFiles.forEach(f => {
    const parts = f.file.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
    if (!dirs[dir]) dirs[dir] = [];
    dirs[dir].push(f);
  });

  return (
    <>
      {selectedNode && (
        <div className="file-tree-filter">
          <span className="file-tree-filter-name">{selectedNode}</span>
          <button className="file-tree-filter-clear" onClick={() => setSelectedNode(null)}>×</button>
        </div>
      )}
      {uniqueFiles.length === 0 ? (
        <div className="file-tree-empty">No files in selection</div>
      ) : (
        <div className="file-tree">
          {Object.keys(dirs).sort().map(dir => (
            <DirGroup key={dir} dir={dir} files={dirs[dir]} selectedFile={selectedFile} onSelect={setSelectedFile} />
          ))}
        </div>
      )}
    </>
  );
}

function DirGroup({ dir, files, selectedFile, onSelect }: {
  dir: string; files: FileHunk[]; selectedFile: string | null; onSelect: (f: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={"tree-dir" + (collapsed ? " collapsed" : "")}>
      <div className="tree-dir-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="tree-dir-chevron">▾</span> {dir}
      </div>
      {!collapsed && (
        <div className="tree-dir-files">
          {files.map(f => {
            const name = f.file.split("/").pop();
            const sel = selectedFile === f.file;
            return (
              <div
                key={f.file}
                className={"tree-file" + (sel ? " selected" : "")}
                onClick={() => onSelect(f.file)}
              >
                <span className={"tree-file-status " + f.status}>{f.status}</span>
                <span className="tree-file-name">{name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
