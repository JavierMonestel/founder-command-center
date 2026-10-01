import type { ActionItem } from "@/lib/types";
import { daysBetween, formatDue } from "@/lib/dates";
import { completeItem, markWaiting, reopenItem, snoozeItem } from "@/app/actions";
import { PriorityBadge, VerticalBadge, buttonClass, cn } from "./ui";

const SOURCE_LABEL: Record<ActionItem["source"], string> = {
  meeting: "from meeting",
  email: "from email",
  slack: "from Slack",
  founder: "added by founder",
  capture: "quick capture",
};

export function ItemRow({ item, today, compact = false }: { item: ActionItem; today: string; compact?: boolean }) {
  const overdue = item.status !== "done" && item.due_date !== null && daysBetween(today, item.due_date) < 0;
  return (
    <li className="group flex items-start gap-3 py-3">
      <form action={item.status === "done" ? reopenItem : completeItem}>
        <input type="hidden" name="id" value={item.id} />
        <button
          aria-label={item.status === "done" ? "Reopen" : "Mark done"}
          className={cn(
            "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
            item.status === "done" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-emerald-500",
          )}
        >
          {item.status === "done" && (
            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
              <path d="M7.6 13.4L4.2 10l-1.2 1.2 4.6 4.6 9.4-9.4L15.8 5z" />
            </svg>
          )}
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-medium", item.status === "done" ? "text-slate-400 line-through" : "text-slate-900")}>
          {item.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <PriorityBadge priority={item.priority} />
          {!compact && <VerticalBadge vertical={item.vertical} />}
          <span className="font-medium text-slate-600">{item.owner}</span>
          <span>·</span>
          <span className={cn(overdue && "font-semibold text-red-600")}>{formatDue(item.due_date, today)}</span>
          {item.status === "waiting" && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700">waiting on reply</span>}
          {!compact && <span className="text-slate-400">· {SOURCE_LABEL[item.source]}</span>}
        </div>
        {!compact && item.context && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{item.context}</p>}
      </div>
      {item.status !== "done" && (
        <div className="flex shrink-0 gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
          <form action={snoozeItem}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="days" value={2} />
            <button className={buttonClass.ghost} title="Push the due date 2 days out">
              Snooze 2d
            </button>
          </form>
          {item.status !== "waiting" && (
            <form action={markWaiting}>
              <input type="hidden" name="id" value={item.id} />
              <button className={buttonClass.ghost} title="Mark as waiting on someone else">
                Waiting
              </button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}
