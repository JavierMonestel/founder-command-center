import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { seedDatabase } from "./seed";
import { SCHEMA } from "./schema";

// Two storage modes:
// - "file":   a SQLite file (node:sqlite, no native addon). Default for local use.
// - "cookie": every request gets a fresh seeded in-memory SQLite database and the
//             visitor's own changes (kept in a cookie) are replayed on top of it.
//             Default on Vercel, where serverless instances don't share a disk, so a
//             file database would show different data on every request.
export type StorageMode = "file" | "cookie";

export function storageMode(): StorageMode {
  const mode = process.env.DEMO_STORAGE;
  if (mode === "file" || mode === "cookie") return mode;
  return process.env.VERCEL ? "cookie" : "file";
}

function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  if (process.env.VERCEL) return "/tmp/founder-command-center.db";
  return path.join(process.cwd(), "data", "founder-command-center.db");
}

let instance: DatabaseSync | null = null;

export function getFileDb(): DatabaseSync {
  if (instance) return instance;
  const file = resolveDbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM objectives").get() as { n: number };
  if (n === 0) seedDatabase(db);
  instance = db;
  return db;
}

export function resetFileDb(): void {
  const db = getFileDb();
  db.exec(`
    DELETE FROM key_results; DELETE FROM objectives; DELETE FROM action_items;
    DELETE FROM decisions; DELETE FROM blockers; DELETE FROM meetings; DELETE FROM briefs;
    DELETE FROM sqlite_sequence;
  `);
  seedDatabase(db);
}

// node:sqlite returns null-prototype rows; React can only serialize plain objects
// across the server/client boundary, so normalize everything we hand out.
export function plain<T>(row: unknown): T {
  return { ...(row as object) } as T;
}
