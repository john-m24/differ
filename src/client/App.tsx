import { useEffect } from "preact/hooks";
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
      <CommitBar />
      <div class="panels">
        <aside class="panel-left" id="file-tree">
          <FileTree />
        </aside>
        <PanelResizer side="left" target=".panel-left" />
        <main class="panel-center" id="diff-view">
          <DiffView />
        </main>
        <PanelResizer side="right" target=".panel-right" />
        <aside class="panel-right" id="graph-panel">
          <GraphPanel />
        </aside>
      </div>
    </>
  );
}
