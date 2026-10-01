import { DatabaseSync } from "node:sqlite";
import { seedDatabase } from "./seed";

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS objectives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vertical TEXT NOT NULL,
  cycle TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  title TEXT NOT NULL,
  owner TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS key_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  objective_id INTEGER NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  metric TEXT NOT NULL,
  start_value REAL NOT NULL,
  current_value REAL NOT NULL,
  target_value REAL NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS action_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  vertical TEXT NOT NULL,
  owner TEXT NOT NULL,
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'p1',
  status TEXT NOT NULL DEFAULT 'open',
  source TEXT NOT NULL DEFAULT 'founder',
  context TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  vertical TEXT NOT NULL,
  context TEXT NOT NULL,
  options TEXT NOT NULL,          -- JSON array of strings
  deadline TEXT,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  outcome TEXT,
  decided_at TEXT
);
CREATE TABLE IF NOT EXISTS blockers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  vertical TEXT NOT NULL,
  impact TEXT NOT NULL,
  owner TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  vertical TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  attendees TEXT NOT NULL,
  prep_notes TEXT
);
CREATE TABLE IF NOT EXISTS briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  mode TEXT NOT NULL,             -- 'claude' | 'rules'
  markdown TEXT NOT NULL
);
`;

// Fresh, seeded in-memory database. Used by the hosted demo (one per request, with the
// visitor's own changes replayed on top) and by the unit tests.
export function createMemoryDb(now: Date = new Date()): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(SCHEMA);
  seedDatabase(db, now);
  return db;
}
