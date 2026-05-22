import { commitRange, setCommitRange, activeFiles, DATA } from "../state.js";

export function CommitBar() {
  const commits = DATA.commits || [];
  if (commits.length === 0) {
    return <div class="commit-bar"><span class="commit-bar-label">No commit data</span></div>;
  }

  const [start, end] = commitRange.value;
  const allSelected = start === 0 && end === commits.length - 1;

  function onPillClick(idx: number, e: MouseEvent) {
    if (e.shiftKey) {
      setCommitRange([Math.min(start, idx), Math.max(start, idx)]);
    } else {
      setCommitRange([idx, idx]);
    }
  }

  return (
    <div class="commit-bar">
      <span class="commit-bar-label">Commits</span>
      <div class="commit-bar-actions">
        <button
          class={"commit-bar-btn" + (allSelected ? " active" : "")}
          onClick={() => setCommitRange([0, commits.length - 1])}
        >All</button>
      </div>
      <div class="commit-pills">
        {commits.map((c, i) => (
          <div
            key={c.hash}
            class={"commit-pill" + (i >= start && i <= end ? " selected" : "")}
            onClick={(e) => onPillClick(i, e as unknown as MouseEvent)}
          >
            <span class="hash">{c.shortHash}</span>
            {c.message.length > 40 ? c.message.slice(0, 40) + "…" : c.message}
          </div>
        ))}
      </div>
      <div class="commit-summary">
        <span>{end - start + 1} commits, {activeFiles.value.size} files</span>
      </div>
    </div>
  );
}
