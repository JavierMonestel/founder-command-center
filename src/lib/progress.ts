import type { ActionItem, KeyResult, Objective } from "./types";
import { daysBetween } from "./dates";

// Progress from start -> target, clamped to [0, 1]. Works for "lower is better"
// key results too (e.g. founder admin hours 12 -> 4), because the sign cancels out.
export function krProgress(kr: Pick<KeyResult, "start_value" | "current_value" | "target_value">): number {
  const span = kr.target_value - kr.start_value;
  if (span === 0) return 1;
  const p = (kr.current_value - kr.start_value) / span;
  return Math.max(0, Math.min(1, p));
}

export function objectiveProgress(krs: KeyResult[]): number {
  if (krs.length === 0) return 0;
  return krs.reduce((sum, kr) => sum + krProgress(kr), 0) / krs.length;
}

// Share of the OKR cycle that has elapsed (0..1). Progress is compared against this
// linear expectation to flag "at risk" objectives.
export function periodElapsed(today: string, start: string, end: string): number {
  const total = daysBetween(start, end);
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, daysBetween(start, today) / total));
}

export function cycleElapsed(objectives: Pick<Objective, "period_start" | "period_end">[], today: string): number {
  const first = objectives[0];
  return first ? periodElapsed(today, first.period_start, first.period_end) : 0;
}

export type Health = "on-track" | "at-risk" | "off-track";

export function healthFor(progress: number, elapsed: number): Health {
  // Give early-cycle objectives some slack before calling them off-track.
  const gap = elapsed - progress;
  if (gap <= 0.1) return "on-track";
  if (gap <= 0.3) return "at-risk";
  return "off-track";
}

export interface ItemBuckets {
  overdue: ActionItem[];
  dueToday: ActionItem[];
  thisWeek: ActionItem[];
  later: ActionItem[];
  undated: ActionItem[];
}

export function bucketItems(items: ActionItem[], today: string): ItemBuckets {
  const buckets: ItemBuckets = { overdue: [], dueToday: [], thisWeek: [], later: [], undated: [] };
  for (const item of items) {
    if (item.status === "done") continue;
    if (!item.due_date) {
      buckets.undated.push(item);
      continue;
    }
    const diff = daysBetween(today, item.due_date);
    if (diff < 0) buckets.overdue.push(item);
    else if (diff === 0) buckets.dueToday.push(item);
    else if (diff <= 7) buckets.thisWeek.push(item);
    else buckets.later.push(item);
  }
  const byPriority = (a: ActionItem, b: ActionItem) =>
    a.priority.localeCompare(b.priority) || (a.due_date ?? "").localeCompare(b.due_date ?? "");
  for (const list of Object.values(buckets)) list.sort(byPriority);
  return buckets;
}
