import Link from "next/link";
import { getSnapshot } from "@/lib/repo";
import { bucketItems, cycleElapsed, healthFor } from "@/lib/progress";
import { daysBetween, formatDateTime, formatDue } from "@/lib/dates";
import { VERTICAL_LABEL, type Vertical } from "@/lib/types";
import { ItemRow } from "@/components/ItemRow";
import {
  Card,
  EmptyState,
  HealthBadge,
  PageHeader,
  ProgressBar,
  SectionTitle,
  Stat,
  VERTICAL_STYLES,
  VerticalBadge,
  buttonClass,
  cn,
} from "@/components/ui";
import { toggleBlocker } from "./actions";

export default async function OverviewPage() {
  const s = await getSnapshot();
  const elapsed = cycleElapsed(s.objectives, s.today);
  const buckets = bucketItems(s.items, s.today);
  const pending = s.decisions.filter((d) => d.status === "pending");
  const openBlockers = s.blockers.filter((b) => !b.resolved);
  const avgProgress = s.objectives.reduce((a, o) => a + o.progress, 0) / Math.max(1, s.objectives.length);
  const dueSoonDecisions = pending.filter((d) => d.deadline && daysBetween(s.today, d.deadline) <= 2);

  const dateLabel = new Date(`${s.today}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <>
      <PageHeader
        title="Good morning — here's the company today"
        subtitle={`${dateLabel} · OKR cycle ${Math.round(elapsed * 100)}% elapsed · one view across both business lines`}
        action={
          <Link href="/brief" className={buttonClass.primary}>
            Open daily brief →
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Overdue follow-ups" value={buckets.overdue.length} tone={buckets.overdue.length ? "danger" : "good"} hint="Nothing falls through the cracks" />
        <Stat label="Due this week" value={buckets.dueToday.length + buckets.thisWeek.length} hint={`${buckets.dueToday.length} due today`} />
        <Stat label="Decisions pending" value={pending.length} tone={dueSoonDecisions.length ? "warn" : "default"} hint={`${dueSoonDecisions.length} due within 48h`} />
        <Stat label="Open blockers" value={openBlockers.length} tone={openBlockers.length ? "warn" : "good"} />
        <Stat
          label="OKR progress"
          value={`${Math.round(avgProgress * 100)}%`}
          tone={avgProgress + 0.1 >= elapsed ? "good" : "warn"}
          hint={`vs ${Math.round(elapsed * 100)}% of cycle elapsed`}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <SectionTitle count={dueSoonDecisions.length + buckets.overdue.filter((i) => i.owner === "Founder").length}>
              Needs the founder now
            </SectionTitle>
            <ul className="divide-y divide-slate-100">
              {dueSoonDecisions.map((d) => (
                <li key={`d${d.id}`} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Decide: {d.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <VerticalBadge vertical={d.vertical} />
                      <span className="font-semibold text-amber-600">{formatDue(d.deadline, s.today)}</span>
                      <span>· asked by {d.requested_by}</span>
                    </div>
                  </div>
                  <Link href="/decisions" className={buttonClass.secondary}>
                    Decide
                  </Link>
                </li>
              ))}
              {buckets.overdue
                .filter((i) => i.owner === "Founder")
                .map((i) => (
                  <ItemRow key={i.id} item={i} today={s.today} />
                ))}
            </ul>
            {dueSoonDecisions.length === 0 && buckets.overdue.every((i) => i.owner !== "Founder") && (
              <EmptyState>Inbox zero for the founder. Nothing urgent.</EmptyState>
            )}
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            {(["clinical", "performance", "company"] as Vertical[]).map((v) => {
              const objectives = s.objectives.filter((o) => o.vertical === v);
              const open = s.items.filter((i) => i.vertical === v && i.status !== "done");
              const overdue = buckets.overdue.filter((i) => i.vertical === v);
              const blockers = openBlockers.filter((b) => b.vertical === v);
              return (
                <Card key={v} className="flex flex-col">
                  <div className="mb-4">
                    <h3 className={cn("text-sm font-semibold", VERTICAL_STYLES[v].text)}>{VERTICAL_LABEL[v]}</h3>
                    <span className="text-xs text-slate-500">
                      {open.length} open · <span className={overdue.length ? "font-semibold text-red-600" : ""}>{overdue.length} overdue</span>
                    </span>
                  </div>
                  <div className="space-y-4">
                    {objectives.map((o) => (
                      <div key={o.id}>
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <span className="text-xs font-medium leading-snug text-slate-700">{o.title}</span>
                          <span className="text-xs font-semibold tabular-nums text-slate-900">{Math.round(o.progress * 100)}%</span>
                        </div>
                        <ProgressBar value={o.progress} marker={elapsed} color={VERTICAL_STYLES[v].bar} />
                        <div className="mt-1.5">
                          <HealthBadge health={healthFor(o.progress, elapsed)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {blockers.length > 0 && (
                    <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                      {blockers.map((b) => (
                        <div key={b.id} className="rounded-lg bg-red-50/60 p-2.5">
                          <div className="text-xs font-semibold text-red-800">⚠ {b.title}</div>
                          <div className="mt-0.5 text-[11px] leading-snug text-red-700/80">{b.impact}</div>
                          <form action={toggleBlocker} className="mt-1">
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="resolved" value="true" />
                            <button className="text-[11px] font-medium text-red-700 underline-offset-2 hover:underline">Mark resolved</button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <SectionTitle count={buckets.overdue.length + buckets.dueToday.length + buckets.thisWeek.length}>
                Follow-ups due this week (all owners)
              </SectionTitle>
              <Link href="/follow-ups" className="text-xs font-medium text-slate-500 hover:text-slate-900">
                View all →
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {[...buckets.overdue, ...buckets.dueToday, ...buckets.thisWeek].slice(0, 8).map((i) => (
                <ItemRow key={i.id} item={i} today={s.today} />
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <SectionTitle count={s.meetings.length}>Upcoming meetings</SectionTitle>
            <ul className="space-y-4">
              {s.meetings.map((m) => (
                <li key={m.id} className="flex gap-3">
                  <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", VERTICAL_STYLES[m.vertical].dot)} />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{m.title}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(m.starts_at)} ET</div>
                    <div className="text-xs text-slate-400">{m.attendees}</div>
                    {m.prep_notes && <div className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">Prep: {m.prep_notes}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <SectionTitle count={pending.length}>Decision queue</SectionTitle>
              <Link href="/decisions" className="text-xs font-medium text-slate-500 hover:text-slate-900">
                Open →
              </Link>
            </div>
            <ul className="space-y-3">
              {pending.map((d) => (
                <li key={d.id} className="text-sm">
                  <div className="font-medium text-slate-800">{d.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <VerticalBadge vertical={d.vertical} /> {formatDue(d.deadline, s.today)}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
