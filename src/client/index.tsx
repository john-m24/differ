import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { initData } from "./state.js";
import type { AppData } from "./types.js";

const data = (window as any).DATA as AppData;
initData(data);

createRoot(document.getElementById("app")!).render(<App />);
