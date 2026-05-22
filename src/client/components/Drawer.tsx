import React, { useCallback, useRef, useState } from "react";
import { useStore, getNodeById } from "../state.js";
import { ReadingOrder } from "./ReadingOrder.js";
import { DiffView } from "./DiffView.js";
import { NodeDetail } from "./NodeDetail.js";

const MIN_HEIGHT = 120;
const MAX_HEIGHT_RATIO = 0.85;
const DEFAULT_HEIGHT = 320;

export function Drawer() {
  const { drawerOpen, selectedNode, selectedFile, setDrawerOpen } = useStore();
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startY.current - ev.clientY;
      const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
      const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeight.current + delta));
      setHeight(newHeight);
    };

    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [height]);

  const node = selectedNode ? getNodeById(selectedNode) : null;
  const title = node ? node.name : "Files";

  return (
    <div
      className={"drawer " + (drawerOpen ? "open" : "closed")}
      style={drawerOpen ? { height } : undefined}
    >
      {drawerOpen && (
        <>
          <div className="drawer-resize-handle" onMouseDown={onDragStart}>
            <div className="drawer-resize-grip" />
          </div>
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
