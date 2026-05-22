import { selectedFile, getOwnerNode, setSelectedNode, DATA } from "../state.js";

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
        leftNum++; rightNum++;
        rows.push({
          type: j < dels.length && j < adds.length ? "change" : j < dels.length ? "del" : "add",
          left: j < dels.length ? { num: leftNum, text: dels[j] } : null,
          right: j < adds.length ? { num: rightNum, text: adds[j] } : null,
        });
        if (j >= dels.length) leftNum--;
        if (j >= adds.length) rightNum--;
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

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function DiffView() {
  const file = selectedFile.value;
  if (!file) {
    return <div class="diff-empty">Select a file to view diff</div>;
  }

  let fileHunk = null;
  for (const nd of DATA.nodeDiffs) {
    const found = nd.files.find(f => f.file === file);
    if (found) { fileHunk = found; break; }
  }

  if (!fileHunk) {
    return <div class="diff-empty">No diff data for {file}</div>;
  }

  const owner = getOwnerNode(file);
  const rows = parseSideBySide(fileHunk.hunks);

  return (
    <>
      <div class="diff-header">
        <span class={"diff-header-badge " + fileHunk.status}>{fileHunk.status}</span>
        <span class="diff-header-path">{file}</span>
        {owner && (
          <span class="diff-header-node" onClick={() => setSelectedNode(owner)}>{owner}</span>
        )}
      </div>
      <div class="diff-table-wrap">
        <table class="diff-table">
          <tbody>
            {rows.map((row, i) => {
              if (row.type === "hunk") {
                return <tr key={i} class="hunk-header"><td colSpan={4}>{row.text}</td></tr>;
              }
              return (
                <tr key={i} class={row.type}>
                  <td class="ln">{row.left?.num ?? ""}</td>
                  <td class="code code-left" dangerouslySetInnerHTML={{ __html: row.left ? esc(row.left.text) : "" }} />
                  <td class="ln">{row.right?.num ?? ""}</td>
                  <td class="code code-right" dangerouslySetInnerHTML={{ __html: row.right ? esc(row.right.text) : "" }} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
