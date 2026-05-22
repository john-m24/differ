import { signal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface BranchInfo {
  name: string;
  active: boolean;
  commits: number;
}

const branches = signal<BranchInfo[]>([]);
const currentBase = signal("main");
const currentHead = signal("");

export function BranchSelector() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    currentBase.value = params.get("base") || "main";
    currentHead.value = params.get("branch") || "";

    fetch("/api/branches").then(r => r.json()).then(data => {
      if (data.branches) branches.value = data.branches;
      if (!currentHead.value && data.current) currentHead.value = data.current;
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
    <div class="branch-selector">
      <div class="branch-pair">
        <label class="branch-label">base</label>
        <select
          class="branch-select"
          value={currentBase.value}
          onChange={(e) => navigate((e.target as HTMLSelectElement).value, currentHead.value)}
        >
          <option value="main">main</option>
          <option value="origin/main">origin/main</option>
          {branches.value.filter(b => !b.active).map(b => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </select>
      </div>
      <span class="branch-arrow">&#8592;</span>
      <div class="branch-pair">
        <label class="branch-label">head</label>
        <select
          class="branch-select"
          value={currentHead.value}
          onChange={(e) => navigate(currentBase.value, (e.target as HTMLSelectElement).value)}
        >
          {branches.value.map(b => (
            <option key={b.name} value={b.name}>
              {b.name}{b.active ? " (current)" : ""} — {b.commits} commit{b.commits !== 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
