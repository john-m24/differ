import type Database from "better-sqlite3";

export interface Event {
  id: number;
  timestamp: string;
  nodeId: string;
  commitHash: string | null;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  files: string[];
}

export interface NodeStats {
  nodeId: string;
  totalEvents: number;
  totalLinesAdded: number;
  totalLinesRemoved: number;
  lastSeen: string;
}

function rowToEvent(row: any): Event {
  return {
    id: row.id,
    timestamp: row.timestamp,
    nodeId: row.node_id,
    commitHash: row.commit_hash,
    linesAdded: row.lines_added,
    linesRemoved: row.lines_removed,
    filesChanged: row.files_changed,
    files: row.files ? JSON.parse(row.files) : [],
  };
}

export function getNodeTimeline(
  db: Database.Database,
  nodeId: string,
  opts?: { since?: string; until?: string; limit?: number }
): Event[] {
  let sql = "SELECT * FROM events WHERE node_id = ?";
  const params: any[] = [nodeId];

  if (opts?.since) {
    sql += " AND timestamp >= ?";
    params.push(opts.since);
  }
  if (opts?.until) {
    sql += " AND timestamp <= ?";
    params.push(opts.until);
  }

  sql += " ORDER BY timestamp DESC";

  if (opts?.limit) {
    sql += " LIMIT ?";
    params.push(opts.limit);
  }

  return db.prepare(sql).all(...params).map(rowToEvent);
}

export function getHottestNodes(
  db: Database.Database,
  opts?: { days?: number; limit?: number }
): NodeStats[] {
  const days = opts?.days ?? 30;
  const limit = opts?.limit ?? 20;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const rows = db
    .prepare(
      `SELECT
        node_id,
        COUNT(*) as total_events,
        SUM(lines_added) as total_lines_added,
        SUM(lines_removed) as total_lines_removed,
        MAX(timestamp) as last_seen
      FROM events
      WHERE timestamp >= ?
      GROUP BY node_id
      ORDER BY total_events DESC
      LIMIT ?`
    )
    .all(since, limit) as any[];

  return rows.map((row) => ({
    nodeId: row.node_id,
    totalEvents: row.total_events,
    totalLinesAdded: row.total_lines_added ?? 0,
    totalLinesRemoved: row.total_lines_removed ?? 0,
    lastSeen: row.last_seen,
  }));
}

export function getRecentActivity(
  db: Database.Database,
  opts?: { limit?: number; since?: string }
): Event[] {
  let sql = "SELECT * FROM events";
  const params: any[] = [];

  if (opts?.since) {
    sql += " WHERE timestamp >= ?";
    params.push(opts.since);
  }

  sql += " ORDER BY timestamp DESC";
  sql += ` LIMIT ?`;
  params.push(opts?.limit ?? 100);

  return db.prepare(sql).all(...params).map(rowToEvent);
}

export function getCoupledNodes(
  db: Database.Database,
  nodeId: string,
  opts?: { days?: number }
): { nodeId: string; sharedCommits: number }[] {
  const days = opts?.days ?? 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const rows = db
    .prepare(
      `SELECT e2.node_id, COUNT(DISTINCT e1.commit_hash) as shared_commits
      FROM events e1
      JOIN events e2 ON e1.commit_hash = e2.commit_hash AND e1.node_id != e2.node_id
      WHERE e1.node_id = ? AND e1.timestamp >= ? AND e1.commit_hash IS NOT NULL
      GROUP BY e2.node_id
      ORDER BY shared_commits DESC`
    )
    .all(nodeId, since) as any[];

  return rows.map((row) => ({
    nodeId: row.node_id,
    sharedCommits: row.shared_commits,
  }));
}
