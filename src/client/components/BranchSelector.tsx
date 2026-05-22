import React, { useState, useEffect } from "react";

interface BranchInfo {
  name: string;
  active: boolean;
  commits: number;
}

export function BranchSelector() {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [currentBase, setCurrentBase] = useState("main");
  const [currentHead, setCurrentHead] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCurrentBase(params.get("base") || "main");
    setCurrentHead(params.get("branch") || "");

    fetch("/api/branches").then(r => r.json()).then(data => {
      if (data.branches) setBranches(data.branches);
      if (!params.get("branch") && data.current) setCurrentHead(data.current);
    }).catch(() => {});
  }, []);

  function navigate(base: string, head: string) {
    const params = new URLSearchParams();
    if (base && base !== "main") params.set("base", base);
    if (head) params.set("branch", head);
    const qs = params.toString();
    window.location.href = "/" + (qs ? "?" + qs : "");
  }

  return (
    <div className="branch-selector">
      <div className="branch-pair">
        <label className="branch-label">base</label>
        <select
          className="branch-select"
          value={currentBase}
          onChange={(e) => navigate(e.target.value, currentHead)}
        >
          <option value="main">main</option>
          <option value="origin/main">origin/main</option>
          {branches.filter(b => !b.active).map(b => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </select>
      </div>
      <span className="branch-arrow">←</span>
      <div className="branch-pair">
        <label className="branch-label">head</label>
        <select
          className="branch-select"
          value={currentHead}
          onChange={(e) => navigate(currentBase, e.target.value)}
        >
          {branches.map(b => (
            <option key={b.name} value={b.name}>
              {b.name}{b.active ? " (current)" : ""} — {b.commits} commit{b.commits !== 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
