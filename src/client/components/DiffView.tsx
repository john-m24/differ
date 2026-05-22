import React from "react";
import { useStore, getOwnerNode, DATA } from "../state.js";

interface DiffRow {
  type: "hunk" | "ctx" | "add" | "del" | "change";
  text?: string;
  left?: { num: number; text: string } | null;
  right?: { num: number; text: string } | null;
}

function parseSideBySide(hunks: string): DiffRow[] {
  const lines = hunks.split("\n");
  const rows: DiffRow[] = [];
  let leftNum = 0, rightNum = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line && i === lines.length - 1) break;

    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) { leftNum = parseInt(match[1]) - 1; rightNum = parseInt(match[2]) - 1; }
      rows.push({ type: "hunk", text: line });
      i++;
      continue;
    }

    if (line.startsWith("-")) {
      const dels: string[] = [];
      while (i < lines.length && lines[i].startsWith("-")) { dels.push(lines[i].slice(1)); i++; }
      const adds: string[] = [];
      while (i < lines.length && lines[i].startsWith("+")) { adds.push(lines[i].slice(1)); i++; }
      const maxLen = Math.max(dels.length, adds.length);
      for (let j = 0; j < maxLen; j++) {
        const hasLeft = j < dels.length;
        const hasRight = j < adds.length;
        if (hasLeft) leftNum++;
        if (hasRight) rightNum++;
        rows.push({
          type: hasLeft && hasRight ? "change" : hasLeft ? "del" : "add",
          left: hasLeft ? { num: leftNum, text: dels[j] } : null,
          right: hasRight ? { num: rightNum, text: adds[j] } : null,
        });
      }
      continue;
    }

    if (line.startsWith("+")) {
      rightNum++;
      rows.push({ type: "add", left: null, right: { num: rightNum, text: line.slice(1) } });
      i++;
      continue;
    }

    if (line.startsWith(" ") || (line.length > 0 && !line.startsWith("\\"))) {
      leftNum++; rightNum++;
      const text = line.startsWith(" ") ? line.slice(1) : line;
      rows.push({ type: "ctx", left: { num: leftNum, text }, right: { num: rightNum, text } });
    }
    i++;
  }
  return rows;
}

function parseUnifiedLines(hunks: string): { num: number; text: string }[] {
  const lines = hunks.split("\n");
  const result: { num: number; text: string }[] = [];
  let lineNum = 0;

  for (const line of lines) {
    if (!line && lines.indexOf(line) === lines.length - 1) break;
    if (line.startsWith("@@")) {
      const match = line.match(/@@ [^+]*\+(\d+)/);
      if (match) lineNum = parseInt(match[1]) - 1;
      continue;
    }
    if (line.startsWith("+")) {
      lineNum++;
      result.push({ num: lineNum, text: line.slice(1) });
    } else if (!line.startsWith("-")) {
      lineNum++;
      result.push({ num: lineNum, text: line.startsWith(" ") ? line.slice(1) : line });
    }
  }
  return result;
}

export function DiffView() {
  const { selectedFile, setSelectedNode } = useStore();

  if (!selectedFile) {
    return <div className="diff-panel"><div className="diff-empty">Select a file</div></div>;
  }

  let fileHunk = null;
  for (const nd of DATA.git.committed) {
    const found = nd.files.find(f => f.file === selectedFile);
    if (found) { fileHunk = found; break; }
  }
  if (!fileHunk) {
    fileHunk = DATA.git.staged.find(f => f.file === selectedFile) || null;
  }
  if (!fileHunk) {
    fileHunk = DATA.git.unstaged.find(f => f.file === selectedFile) || null;
  }

  if (!fileHunk) {
    return <div className="diff-panel"><div className="diff-empty">No diff for {selectedFile}</div></div>;
  }

  const owner = getOwnerNode(selectedFile);

  return (
    <div className="diff-panel">
      <div className="diff-header">
        <span className="diff-header-path">{selectedFile}</span>
        {owner && (
          <span className="diff-header-node" onClick={() => setSelectedNode(owner)}>{owner}</span>
        )}
      </div>
      {fileHunk.status === "A" ? (
        <NewFileView hunks={fileHunk.hunks} />
      ) : fileHunk.status === "D" ? (
        <DeletedFileView hunks={fileHunk.hunks} />
      ) : (
        <SideBySideView hunks={fileHunk.hunks} />
      )}
    </div>
  );
}

function NewFileView({ hunks }: { hunks: string }) {
  const lines = parseUnifiedLines(hunks);
  return (
    <div className="diff-table-wrap">
      <table className="diff-table diff-unified">
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="add">
              <td className="ln">{l.num}</td>
              <td className="code">{l.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeletedFileView({ hunks }: { hunks: string }) {
  const lines = hunks.split("\n")
    .filter(l => l.startsWith("-") && !l.startsWith("---"))
    .map((l, i) => ({ num: i + 1, text: l.slice(1) }));
  return (
    <div className="diff-table-wrap">
      <table className="diff-table diff-unified">
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="del">
              <td className="ln">{l.num}</td>
              <td className="code">{l.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SideBySideView({ hunks }: { hunks: string }) {
  const rows = parseSideBySide(hunks);
  return (
    <div className="diff-table-wrap">
      <table className="diff-table">
        <tbody>
          {rows.map((row, i) => {
            if (row.type === "hunk") {
              return <tr key={i} className="hunk-header"><td colSpan={4}>{row.text}</td></tr>;
            }
            return (
              <tr key={i} className={row.type}>
                <td className="ln">{row.left?.num ?? ""}</td>
                <td className="code code-left">{row.left?.text ?? ""}</td>
                <td className="ln">{row.right?.num ?? ""}</td>
                <td className="code code-right">{row.right?.text ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
