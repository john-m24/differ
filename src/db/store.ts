import type Database from "better-sqlite3";

export interface ChangeRecord {
  nodeId: string;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  files: string[];
  commitHash?: string | null;
  timestamp?: string;
}

export function recordChanges(db: Database.Database, changes: ChangeRecord[]): void {
  if (changes.length === 0) return;

  const stmt = db.prepare(`
    INSERT INTO events (timestamp, node_id, commit_hash, lines_added, lines_removed, files_changed, files)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  db.transaction(() => {
    for (const change of changes) {
      stmt.run(
        change.timestamp ?? now,
        change.nodeId,
        change.commitHash ?? null,
        change.linesAdded,
        change.linesRemoved,
        change.filesChanged,
        JSON.stringify(change.files)
      );
    }
  })();
}
