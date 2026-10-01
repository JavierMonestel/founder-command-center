import type { DatabaseSync } from "node:sqlite";
import type { ItemSource, ItemStatus, Priority, Vertical } from "./types";

// Every write in the app is expressed as a small, serializable operation. In file mode
// an op is applied straight to SQLite; in cookie mode ops are stored per visitor and
// replayed onto a freshly seeded database on each request.

export interface NewActionItem {
  title: string;
  vertical: Vertical;
  owner: string;
  due_date: string | null;
  priority: Priority;
  source: ItemSource;
  context: string | null;
}

export type Op =
  | { t: "status"; id: number; s: ItemStatus; at: string }
  | { t: "snooze"; id: number; due: string; at: string }
  | { t: "kr"; id: number; v: number; at: string }
  | { t: "decide"; id: number; o: string; on: string }
  | { t: "blocker"; id: number; r: boolean }
  | { t: "new"; item: NewActionItem; at: string };

export function applyOp(db: DatabaseSync, op: Op): void {
  switch (op.t) {
    case "status":
      db.prepare("UPDATE action_items SET status = ?, updated_at = ? WHERE id = ?").run(op.s, op.at, op.id);
      break;
    case "snooze":
      db.prepare("UPDATE action_items SET due_date = ?, updated_at = ? WHERE id = ?").run(op.due, op.at, op.id);
      break;
    case "kr":
      db.prepare("UPDATE key_results SET current_value = ?, updated_at = ? WHERE id = ?").run(op.v, op.at, op.id);
      break;
    case "decide":
      db.prepare("UPDATE decisions SET status = 'decided', outcome = ?, decided_at = ? WHERE id = ?").run(op.o, op.on, op.id);
      break;
    case "blocker":
      db.prepare("UPDATE blockers SET resolved = ? WHERE id = ?").run(op.r ? 1 : 0, op.id);
      break;
    case "new": {
      const i = op.item;
      db.prepare(
        `INSERT INTO action_items (title, vertical, owner, due_date, priority, status, source, context, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
      ).run(i.title, i.vertical, i.owner, i.due_date, i.priority, i.source, i.context, op.at, op.at);
      break;
    }
  }
}

// Cookies top out around 4 KB, so keep the newest ops that fit.
export const MAX_OPS_BYTES = 3500;

export function encodeOps(ops: Op[]): string {
  let kept = ops;
  let json = JSON.stringify(kept);
  while (json.length > MAX_OPS_BYTES && kept.length > 0) {
    kept = kept.slice(1);
    json = JSON.stringify(kept);
  }
  return json;
}

export function decodeOps(raw: string | undefined): Op[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.filter((op) => op && typeof op === "object" && "t" in op) as Op[]) : [];
  } catch {
    return [];
  }
}
