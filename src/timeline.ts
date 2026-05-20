import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Timeline, TimelineEntry } from "./types.js";

const DIFFER_DIR = ".differ";
const TIMELINE_FILE = "timeline.json";

export function getTimelinePath(cwd: string): string {
  return join(cwd, DIFFER_DIR, TIMELINE_FILE);
}

function ensureDifferDir(cwd: string): void {
  const dir = join(cwd, DIFFER_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function loadTimeline(cwd: string): Timeline {
  const path = getTimelinePath(cwd);
  if (!existsSync(path)) {
    return { sessionStart: new Date().toISOString(), entries: [] };
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function appendEntry(cwd: string, entry: TimelineEntry): Timeline {
  ensureDifferDir(cwd);
  const timeline = loadTimeline(cwd);
  timeline.entries.push(entry);
  writeFileSync(getTimelinePath(cwd), JSON.stringify(timeline, null, 2) + "\n");
  return timeline;
}

export function resetTimeline(cwd: string): Timeline {
  ensureDifferDir(cwd);
  const timeline: Timeline = {
    sessionStart: new Date().toISOString(),
    entries: [],
  };
  writeFileSync(getTimelinePath(cwd), JSON.stringify(timeline, null, 2) + "\n");
  return timeline;
}
