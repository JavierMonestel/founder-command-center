// Date helpers. Everything is stored as YYYY-MM-DD (dates) or ISO strings (timestamps)
// so SQLite comparisons stay simple and timezone-agnostic.

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayIso(now: Date = new Date()): string {
  return isoDate(now);
}

export function addDays(base: string | Date, days: number): string {
  const d = typeof base === "string" ? new Date(`${base}T12:00:00Z`) : new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function formatDue(due: string | null, today: string): string {
  if (!due) return "No due date";
  const diff = daysBetween(today, due);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff === -1) return "1 day overdue";
  if (diff < 0) return `${-diff} days overdue`;
  if (diff < 7) return `Due in ${diff} days`;
  return new Date(`${due}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}
