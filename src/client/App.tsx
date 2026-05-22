import React, { useEffect } from "react";
import { BranchSelector } from "./components/BranchSelector.js";
import { CommitBar } from "./components/CommitBar.js";
import { FileTree } from "./components/FileTree.js";
import { DiffView } from "./components/DiffView.js";
import { GraphPanel } from "./components/GraphPanel.js";
import { PanelResizer } from "./components/PanelResizer.js";

export function App() {
  useEffect(() => {
    try {
      const lw = localStorage.getItem("differ-panel-left");
      const rw = localStorage.getItem("differ-panel-right");
      if (lw) (document.querySelector(".panel-left") as HTMLElement).style.width = lw;
      if (rw) (document.querySelector(".panel-right") as HTMLElement).style.width = rw;
    } catch {}
  }, []);

  return (
    <>
      <div className="top-bar">
        <BranchSelector />
        <CommitBar />
      </div>
      <div className="panels">
        <aside className="panel-left" id="file-tree">
          <FileTree />
        </aside>
        <PanelResizer side="left" target=".panel-left" />
        <main className="panel-center" id="diff-view">
          <DiffView />
        </main>
        <PanelResizer side="right" target=".panel-right" />
        <aside className="panel-right" id="graph-panel">
          <GraphPanel />
        </aside>
      </div>
    </>
  );
}
