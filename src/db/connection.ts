import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { applyMigrations } from "./schema.js";

const connections = new Map<string, Database.Database>();

export function getDb(cwd: string): Database.Database {
  const dbDir = join(cwd, ".differ");
  const dbPath = join(dbDir, "differ.db");

  if (connections.has(dbPath)) return connections.get(dbPath)!;

  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  applyMigrations(db);

  connections.set(dbPath, db);
  return db;
}

export function closeDb(cwd: string): void {
  const dbPath = join(cwd, ".differ", "differ.db");
  const db = connections.get(dbPath);
  if (db) {
    db.close();
    connections.delete(dbPath);
  }
}
