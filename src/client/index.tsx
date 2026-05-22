import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { initData, updateData } from "./state.js";
import type { WatchData } from "./types.js";

const data = (window as any).DATA as WatchData;
initData(data);

createRoot(document.getElementById("app")!).render(<App />);

// Live updates via SSE
const evtSource = new EventSource("/api/events");
evtSource.addEventListener("state", (e) => {
  try {
    const newData = JSON.parse(e.data) as WatchData;
    updateData(newData);
  } catch {}
});
