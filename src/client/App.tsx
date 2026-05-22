import React from "react";
import { useStore, DATA } from "./state.js";
import { GraphView } from "./components/GraphView.js";
import { Drawer } from "./components/Drawer.js";
import { StatusBar } from "./components/StatusBar.js";

export function App() {
  return (
    <>
      <StatusBar />
      <div className="graph-main">
        <GraphView />
      </div>
      <Drawer />
    </>
  );
}
