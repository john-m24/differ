import { render } from "preact";
import { App } from "./App.js";
import { initData } from "./state.js";
import type { AppData } from "./types.js";

declare global {
  interface Window {
    DATA: AppData;
  }
}

const data = (window as any).DATA as AppData;
initData(data);

render(<App />, document.getElementById("app")!);
