import { existsSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "./db/connection.js";
import { getNodeTimeline, getHottestNodes, getRecentActivity } from "./db/queries.js";

export interface HistoryOptions {
  node?: string;
  days: number;
  stats: boolean;
  format: string;
  limit: number;
}

export function runHistory(opts: HistoryOptions): void {
  const cwd = process.cwd();
  const dbPath = join(cwd, ".differ", "differ.db");

  if (!existsSync(dbPath)) {
    console.log("No history database found. Run `differ watch` first to start recording events.");
    return;
  }

  const db = getDb(cwd);

  if (opts.stats) {
    showStats(db, opts);
    return;
  }

  if (opts.node) {
    showNodeTimeline(db, opts);
    return;
  }

  showRecentActivity(db, opts);
}

function showStats(db: any, opts: HistoryOptions): void {
  const hottest = getHottestNodes(db, { days: opts.days, limit: opts.limit });

  if (hottest.length === 0) {
    console.log("No activity recorded in the last " + opts.days + " days.");
    return;
  }

  if (opts.format === "json") {
    console.log(JSON.stringify(hottest, null, 2));
    return;
  }

  const maxEvents = Math.max(...hottest.map((n) => n.totalEvents));
  const maxBarWidth = 30;

  console.log(`\nNode activity (last ${opts.days} days):\n`);
  for (const node of hottest) {
    const barLen = Math.round((node.totalEvents / maxEvents) * maxBarWidth);
    const bar = "█".repeat(barLen);
    const lines = `+${node.totalLinesAdded}/-${node.totalLinesRemoved}`;
    console.log(`  ${node.nodeId.padEnd(20)} ${bar} ${node.totalEvents} events (${lines})`);
  }
  console.log("");
}

function showNodeTimeline(db: any, opts: HistoryOptions): void {
  const since = new Date(Date.now() - opts.days * 86400000).toISOString();
  const events = getNodeTimeline(db, opts.node!, { since, limit: opts.limit });

  if (events.length === 0) {
    console.log(`No activity for "${opts.node}" in the last ${opts.days} days.`);
    return;
  }

  if (opts.format === "json") {
    console.log(JSON.stringify(events, null, 2));
    return;
  }

  console.log(`\nTimeline for "${opts.node}" (last ${opts.days} days):\n`);
  for (const event of events) {
    const date = event.timestamp.slice(0, 16).replace("T", " ");
    const commit = event.commitHash ? ` [${event.commitHash.slice(0, 7)}]` : "";
    console.log(`  ${date}  +${event.linesAdded}/-${event.linesRemoved}  ${event.filesChanged} files${commit}`);
  }
  console.log(`\n  Total: ${events.length} events\n`);
}

function showRecentActivity(db: any, opts: HistoryOptions): void {
  const since = new Date(Date.now() - opts.days * 86400000).toISOString();
  const events = getRecentActivity(db, { since, limit: opts.limit });

  if (events.length === 0) {
    console.log("No activity recorded in the last " + opts.days + " days.");
    return;
  }

  if (opts.format === "json") {
    console.log(JSON.stringify(events, null, 2));
    return;
  }

  console.log(`\nRecent activity (last ${opts.days} days):\n`);
  for (const event of events) {
    const date = event.timestamp.slice(0, 16).replace("T", " ");
    const commit = event.commitHash ? ` [${event.commitHash.slice(0, 7)}]` : "";
    console.log(`  ${date}  ${event.nodeId.padEnd(18)} +${event.linesAdded}/-${event.linesRemoved}${commit}`);
  }
  console.log(`\n  ${events.length} events shown\n`);
}
