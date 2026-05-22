import { useState } from "preact/hooks";
import { selectedNode, selectedFile, activeFileHunks, setSelectedFile, setSelectedNode, getOwnerNode, DATA } from "../state.js";
import type { FileHunk } from "../types.js";

export function FileTree() {
  const nodeId = selectedNode.value;
  let files = activeFileHunks.value;

  if (nodeId) {
    const node = DATA.topology.nodes.find(n => n.id === nodeId);
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
      {nodeId && (
        <div class="file-tree-filter">
          <span class="file-tree-filter-name">{nodeId}</span>
          <button class="file-tree-filter-clear" onClick={() => setSelectedNode(null)}>&times;</button>
        </div>
      )}
      {uniqueFiles.length === 0 ? (
        <div class="file-tree-empty">No files in selection</div>
      ) : (
        <div class="file-tree">
          {Object.keys(dirs).sort().map(dir => (
            <DirGroup key={dir} dir={dir} files={dirs[dir]} />
          ))}
        </div>
      )}
    </>
  );
}

function DirGroup({ dir, files }: { dir: string; files: FileHunk[] }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div class={"tree-dir" + (collapsed ? " collapsed" : "")}>
      <div class="tree-dir-header" onClick={() => setCollapsed(!collapsed)}>
        <span class="tree-dir-chevron">&#9662;</span> {dir}
      </div>
      {!collapsed && (
        <div class="tree-dir-files">
          {files.map(f => {
            const name = f.file.split("/").pop();
            const owner = getOwnerNode(f.file);
            const sel = selectedFile.value === f.file;
            return (
              <div
                key={f.file}
                class={"tree-file" + (sel ? " selected" : "")}
                onClick={() => setSelectedFile(f.file)}
              >
                <span class={"tree-file-status " + f.status}>{f.status}</span>
                <span class="tree-file-name">{name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fileMatchesPattern(file: string, pattern: string): boolean {
  const re = pattern.replace(/\./g, "\\.").replace(/\*\*\//g, "(.+/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
  return new RegExp("^" + re + "$").test(file);
}
