import React from "react";
import { DATA } from "../state.js";

export function StatusBar() {
  const { git } = DATA;
  const stagedCount = git.staged.length;
  const unstagedCount = git.unstaged.length;
  const committedCount = git.committed.reduce((s, nd) => s + nd.files.length, 0);

  return (
    <div className="status-bar">
      <span className="status-branch">{git.branch}</span>
      <span className="status-arrow">&larr;</span>
      <span className="status-base">{git.base}</span>
      <div className="status-dot" />
      <span className="status-label">watching</span>
      <div className="status-counts">
        {committedCount > 0 && (
          <span className="status-count">
            <span className="status-count-dot committed" />
            {committedCount} committed
          </span>
        )}
        {stagedCount > 0 && (
          <span className="status-count">
            <span className="status-count-dot staged" />
            {stagedCount} staged
          </span>
        )}
        {unstagedCount > 0 && (
          <span className="status-count">
            <span className="status-count-dot unstaged" />
            {unstagedCount} unstaged
          </span>
        )}
      </div>
    </div>
  );
}
