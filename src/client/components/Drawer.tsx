import React from "react";
import { useStore } from "../state.js";
import { ReadingOrder } from "./ReadingOrder.js";
import { DiffView } from "./DiffView.js";

export function Drawer() {
  const { drawerOpen, selectedNode, setDrawerOpen } = useStore();

  return (
    <div className={"drawer " + (drawerOpen ? "open" : "closed")}>
      {drawerOpen && (
        <>
          <div className="drawer-header">
            <span className="drawer-title">
              {selectedNode || "Files"}
            </span>
            <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
              &times;
            </button>
          </div>
          <div className="drawer-body">
            <ReadingOrder />
            <DiffView />
          </div>
        </>
      )}
    </div>
  );
}
