import "server-only";
import { connection } from "next/server";
import { plain } from "./db";
import { getStore, loadBrief, mutate, storeBrief, type StoredBrief } from "./store";
import type { NewActionItem } from "./ops";
import { objectiveProgress } from "./progress";
import { todayIso } from "./dates";
import type {
  ActionItem,
  Blocker,
  CompanySnapshot,
  Decision,
  ItemStatus,
  KeyResult,
  Meeting,
  Objective,
  ObjectiveWithKRs,
} from "./types";

export type { NewActionItem };

// Data access layer. Reads opt out of prerendering via connection() because the data
// is per request (and node:sqlite is synchronous, so it would otherwise be baked in
// at build time).

export async function listObjectives(): Promise<ObjectiveWithKRs[]> {
  await connection();
  const db = await getStore();
  const objectives = db.prepare("SELECT * FROM objectives ORDER BY vertical, id").all().map((r) => plain<Objective>(r));
  const krs = db.prepare("SELECT * FROM key_results ORDER BY id").all().map((r) => plain<KeyResult>(r));
  return objectives.map((o) => {
    const key_results = krs.filter((kr) => kr.objective_id === o.id);
    return { ...o, key_results, progress: objectiveProgress(key_results) };
  });
}

export async function listActionItems(): Promise<ActionItem[]> {
  await connection();
  return (await getStore())
    .prepare("SELECT * FROM action_items ORDER BY status = 'done', due_date IS NULL, due_date, priority")
    .all()
    .map((r) => plain<ActionItem>(r));
}

interface DecisionRow extends Omit<Decision, "options"> {
  options: string;
}

export async function listDecisions(): Promise<Decision[]> {
  await connection();
  return (await getStore())
    .prepare("SELECT * FROM decisions ORDER BY status = 'decided', deadline IS NULL, deadline")
    .all()
    .map((r) => {
      const row = plain<DecisionRow>(r);
      return { ...row, options: JSON.parse(row.options) as string[] };
    });
}

export async function listBlockers(): Promise<Blocker[]> {
  await connection();
  return (await getStore())
    .prepare("SELECT * FROM blockers ORDER BY resolved, id")
    .all()
    .map((r) => {
      const row = plain<Omit<Blocker, "resolved"> & { resolved: number }>(r);
      return { ...row, resolved: row.resolved === 1 };
    });
}

export async function listMeetings(): Promise<Meeting[]> {
  await connection();
  return (await getStore())
    .prepare("SELECT * FROM meetings WHERE starts_at >= ? ORDER BY starts_at")
    .all(new Date(Date.now() - 2 * 3_600_000).toISOString())
    .map((r) => plain<Meeting>(r));
}

export async function getSnapshot(): Promise<CompanySnapshot> {
  const [objectives, items, decisions, blockers, meetings] = await Promise.all([
    listObjectives(),
    listActionItems(),
    listDecisions(),
    listBlockers(),
    listMeetings(),
  ]);
  return { today: todayIso(), objectives, items, decisions, blockers, meetings };
}

export type LatestBrief = StoredBrief;

export async function getLatestBrief(): Promise<LatestBrief | null> {
  await connection();
  return loadBrief();
}

// ---- mutations (called from server actions / route handlers) ----

const now = () => new Date().toISOString();

export function createActionItems(items: NewActionItem[]): Promise<void> {
  const at = now();
  return mutate(...items.map((item) => ({ t: "new" as const, item, at })));
}

export function setActionItemStatus(id: number, status: ItemStatus): Promise<void> {
  return mutate({ t: "status", id, s: status, at: now() });
}

export function snoozeActionItem(id: number, newDue: string): Promise<void> {
  return mutate({ t: "snooze", id, due: newDue, at: now() });
}

export function updateKeyResult(id: number, currentValue: number): Promise<void> {
  return mutate({ t: "kr", id, v: currentValue, at: now() });
}

export function decide(id: number, outcome: string): Promise<void> {
  return mutate({ t: "decide", id, o: outcome, on: todayIso() });
}

export function setBlockerResolved(id: number, resolved: boolean): Promise<void> {
  return mutate({ t: "blocker", id, r: resolved });
}

export function saveBrief(mode: "claude" | "rules", markdown: string): Promise<void> {
  return storeBrief({ created_at: now(), mode, markdown });
}
