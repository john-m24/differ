import type { Topology, SystemDelta, CommitInfo } from "./types.js";
import type { NodeDiff } from "./diff.js";
import { renderReview } from "./render.js";

const EMPTY_DELTA: SystemDelta = {
  intent: "", intent_satisfied: true, changed: [], added: [], removed: [],
  moved: [], edges_added: [], edges_removed: [], blast_radius: [],
  scope_violations: [], decision_trace: [],
};

export function renderServeView(topology: Topology, delta: SystemDelta | null, nodeDiffs?: NodeDiff[], commits?: CommitInfo[]): string {
  const base = renderReview(topology, delta || EMPTY_DELTA, nodeDiffs, commits);

  const injection = `
<script>
(function() {
  const evtSource = new EventSource("/api/events");
  evtSource.onmessage = function() { window.location.reload(); };
})();
</script>`;

  return base.replace("</body>", injection + "\n</body>");
}
