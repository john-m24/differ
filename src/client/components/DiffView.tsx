import React, { useMemo, useState } from "react";
import { Diff, Hunk, parseDiff, markEdits, tokenize } from "react-diff-view";
import type { HunkData, FileData } from "react-diff-view";
import { useStore, DATA, getNodeById } from "../state.js";
import type { FileHunk } from "../types.js";

function buildDiffText(fileHunk: FileHunk): string {
  const { file, hunks, status } = fileHunk;
  const lines: string[] = [];
  lines.push(`diff --git a/${file} b/${file}`);
  if (status === "A") {
    lines.push("new file mode 100644");
    lines.push("--- /dev/null");
    lines.push(`+++ b/${file}`);
  } else if (status === "D") {
    lines.push("deleted file mode 100644");
    lines.push(`--- a/${file}`);
    lines.push("+++ /dev/null");
  } else {
    lines.push(`--- a/${file}`);
    lines.push(`+++ b/${file}`);
  }
  lines.push(hunks);
  return lines.join("\n");
}

export function DiffView() {
  const { selectedFile, setSelectedNode } = useStore();
  const [viewType, setViewType] = useState<"split" | "unified">("split");

  if (!selectedFile) {
    return <div className="diff-panel"><div className="diff-empty">Select a file</div></div>;
  }

  let fileHunk: FileHunk | null = null;
  fileHunk = DATA.git.committed.find(f => f.file === selectedFile) || null;
  if (!fileHunk) fileHunk = DATA.git.staged.find(f => f.file === selectedFile) || null;
  if (!fileHunk) fileHunk = DATA.git.unstaged.find(f => f.file === selectedFile) || null;

  if (!fileHunk) {
    return <div className="diff-panel"><div className="diff-empty">No diff for {selectedFile}</div></div>;
  }

  const ownerNode = DATA.topology.nodes.find(n => n.filePath === selectedFile);

  const parsedFile = useMemo(() => {
    const diffText = buildDiffText(fileHunk!);
    const files = parseDiff(diffText, { nearbySequences: "zip" });
    return files[0] || null;
  }, [fileHunk]);

  if (!parsedFile || parsedFile.hunks.length === 0) {
    return <div className="diff-panel"><div className="diff-empty">No changes in {selectedFile}</div></div>;
  }

  const tokens = useMemo(() => {
    if (!parsedFile) return undefined;
    const options = {
      highlight: false,
      enhancers: [markEdits(parsedFile.hunks, { type: "block" })],
    };
    try {
      return tokenize(parsedFile.hunks, options);
    } catch {
      return undefined;
    }
  }, [parsedFile]);

  const diffType = fileHunk.status === "A" ? "add"
    : fileHunk.status === "D" ? "delete"
    : "modify";

  return (
    <div className="diff-panel">
      <div className="diff-header">
        <span className="diff-header-path">{selectedFile}</span>
        <div className="diff-header-actions">
          <button
            className={`diff-view-toggle ${viewType === "split" ? "active" : ""}`}
            onClick={() => setViewType("split")}
          >
            Split
          </button>
          <button
            className={`diff-view-toggle ${viewType === "unified" ? "active" : ""}`}
            onClick={() => setViewType("unified")}
          >
            Unified
          </button>
        </div>
        {ownerNode && (
          <span className="diff-header-node" onClick={() => setSelectedNode(ownerNode.id)}>
            {ownerNode.name}
          </span>
        )}
      </div>
      <div className="diff-table-wrap">
        <Diff
          viewType={viewType}
          diffType={diffType}
          hunks={parsedFile.hunks}
          tokens={tokens}
        >
          {(hunks: HunkData[]) => hunks.map(hunk => (
            <Hunk key={hunk.content} hunk={hunk} />
          ))}
        </Diff>
      </div>
    </div>
  );
}
