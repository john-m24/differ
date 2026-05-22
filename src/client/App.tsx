import React from "react";
import { useStore } from "./state.js";
import { ActivityView } from "./components/ActivityView.js";
import { GraphView } from "./components/GraphView.js";
import { ProjectView } from "./components/ProjectView.js";
import { Drawer } from "./components/Drawer.js";
import { StatusBar } from "./components/StatusBar.js";

export function App() {
  const { viewMode } = useStore();

  return (
    <>
      <StatusBar />
      <div className="graph-main">
        {viewMode === "activity" && <ActivityView />}
        {viewMode === "topology" && <GraphView />}
        {viewMode === "project" && <ProjectView />}
      </div>
      {(viewMode === "activity" || viewMode === "topology") && <Drawer />}
    </>
  );
}
