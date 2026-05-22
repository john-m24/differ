import React from "react";
import { useStore, DATA } from "../state.js";

export function CommitBar() {
  const { commitRange, setCommitRange, activeFiles } = useStore();
  const commits = DATA.commits || [];

  if (commits.length === 0) {
    return <div className="commit-bar"><span className="commit-bar-label">No commit data</span></div>;
  }

  const [start, end] = commitRange;
  const allSelected = start === 0 && end === commits.length - 1;

  function onPillClick(idx: number, e: React.MouseEvent) {
    if (e.shiftKey) {
      setCommitRange([Math.min(start, idx), Math.max(start, idx)]);
    } else {
      setCommitRange([idx, idx]);
    }
  }

  return (
    <div className="commit-bar">
      <span className="commit-bar-label">Commits</span>
      <div className="commit-bar-actions">
        <button
          className={"commit-bar-btn" + (allSelected ? " active" : "")}
          onClick={() => setCommitRange([0, commits.length - 1])}
        >All</button>
      </div>
      <div className="commit-pills">
        {commits.map((c, i) => (
          <div
            key={c.hash}
            className={"commit-pill" + (i >= start && i <= end ? " selected" : "")}
            onClick={(e) => onPillClick(i, e)}
          >
            <span className="hash">{c.shortHash}</span>
            {c.message.length > 40 ? c.message.slice(0, 40) + "…" : c.message}
          </div>
        ))}
      </div>
      <div className="commit-summary">
        <span>{end - start + 1} commits, {activeFiles.size} files</span>
      </div>
    </div>
  );
}
