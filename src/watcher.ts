import { watch, type FSWatcher } from "node:fs";
import type { Topology } from "./types.js";
import { fileMatchesTopology } from "./diff.js";

export interface WatcherOptions {
  cwd: string;
  topology: Topology;
  debounceMs: number;
  onChange: (changedFiles: string[]) => void;
}

export function startWatcher(opts: WatcherOptions): FSWatcher {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const pendingFiles = new Set<string>();

  const watcher = watch(opts.cwd, { recursive: true }, (_eventType, filename) => {
    if (!filename) return;

    if (
      filename.startsWith(".git/") ||
      filename.startsWith("node_modules/") ||
      filename.startsWith(".differ/") ||
      filename.startsWith("dist/")
    )
      return;

    if (!fileMatchesTopology(filename, opts.topology)) return;

    pendingFiles.add(filename);

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      const files = [...pendingFiles];
      pendingFiles.clear();
      opts.onChange(files);
    }, opts.debounceMs);
  });

  return watcher;
}
