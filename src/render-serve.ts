import type { Topology } from "./types.js";
import type { NodeDiff } from "./diff.js";
import { renderReview } from "./render.js";

export function renderServeView(topology: Topology, nodeDiffs?: NodeDiff[]): string {
  const base = renderReview(topology, nodeDiffs);

  const injection = `
<script>
(function() {
  const evtSource = new EventSource("/api/events");
  evtSource.addEventListener("state", function() { window.location.reload(); });
})();
</script>`;

  return base.replace("</body>", injection + "\n</body>");
}
