import React from "react";
import { DATA } from "../state.js";

export function StatusBar() {
  const { git, blastRadius, topology } = DATA;

  const changedNodes = topology.nodes.filter(n => blastRadius.changed.includes(n.id));
  const components = changedNodes.filter(n => n.kind === "component" || n.kind === "page").length;
  const hooks = changedNodes.filter(n => n.kind === "hook").length;
  const stores = changedNodes.filter(n => n.kind === "store").length;
  const routes = blastRadius.affectedRoutes.length;

  return (
    <div className="status-bar">
      <span className="status-branch">{git.branch}</span>
      <span className="status-arrow">&larr;</span>
      <span className="status-base">{git.base}</span>
      <div className="status-dot" />
      <span className="status-label">watching</span>
      <div className="status-counts">
        {components > 0 && <span className="status-count">{components} component{components !== 1 ? "s" : ""}</span>}
        {hooks > 0 && <span className="status-count">{hooks} hook{hooks !== 1 ? "s" : ""}</span>}
        {stores > 0 && <span className="status-count">{stores} store{stores !== 1 ? "s" : ""}</span>}
        {(components > 0 || hooks > 0 || stores > 0) && <span className="status-separator">changed</span>}
        {routes > 0 && (
          <span className="status-count status-routes">{routes} route{routes !== 1 ? "s" : ""} affected</span>
        )}
      </div>
    </div>
  );
}
