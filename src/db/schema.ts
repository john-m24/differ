import type Database from "better-sqlite3";

interface Migration {
  version: number;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE schema_version (
        version INTEGER NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        node_id TEXT NOT NULL,
        commit_hash TEXT,
        lines_added INTEGER DEFAULT 0,
        lines_removed INTEGER DEFAULT 0,
        files_changed INTEGER DEFAULT 0,
        files TEXT
      );

      CREATE INDEX idx_events_node ON events(node_id);
      CREATE INDEX idx_events_ts ON events(timestamp);
      CREATE INDEX idx_events_commit ON events(commit_hash);
    `,
  },
];

export function applyMigrations(db: Database.Database): void {
  const hasTable = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
    )
    .get();

  let currentVersion = 0;
  if (hasTable) {
    const row = db
      .prepare("SELECT MAX(version) as v FROM schema_version")
      .get() as { v: number | null } | undefined;
    currentVersion = row?.v ?? 0;
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;

    db.transaction(() => {
      db.exec(migration.up);
      db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(
        migration.version
      );
    })();
  }
}
