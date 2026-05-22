import React from "react";
import { useStore, getNodeById } from "../state.js";
import { ReadingOrder } from "./ReadingOrder.js";
import { DiffView } from "./DiffView.js";
import { NodeDetail } from "./NodeDetail.js";

export function Drawer() {
  const { drawerOpen, selectedNode, selectedFile, setDrawerOpen } = useStore();

  const node = selectedNode ? getNodeById(selectedNode) : null;
  const title = node ? node.name : "Files";

  return (
    <div className={"drawer " + (drawerOpen ? "open" : "closed")}>
      {drawerOpen && (
        <>
          <div className="drawer-header">
            {node && <span className={"drawer-kind-badge " + node.kind}>{node.kind}</span>}
            <span className="drawer-title">{title}</span>
            <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
              &times;
            </button>
          </div>
          <div className="drawer-body">
            {selectedNode && !selectedFile ? (
              <>
                <div className="drawer-detail-panel">
                  <NodeDetail nodeId={selectedNode} />
                </div>
                <ReadingOrder />
              </>
            ) : (
              <>
                <ReadingOrder />
                <DiffView />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
