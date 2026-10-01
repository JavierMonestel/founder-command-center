import { listDecisions } from "@/lib/repo";
import { daysBetween, formatDue, todayIso } from "@/lib/dates";
import { Card, EmptyState, PageHeader, SectionTitle, VerticalBadge, buttonClass, cn, inputClass } from "@/components/ui";
import { makeDecision } from "../actions";

export default async function DecisionsPage() {
  const today = todayIso();
  const decisions = await listDecisions();
  const pending = decisions.filter((d) => d.status === "pending");
  const decided = decisions.filter((d) => d.status === "decided");

  return (
    <>
      <PageHeader
        title="Decision queue"
        subtitle="Decisions the team needs from the founder, framed with context and options — one click to decide, and the outcome is logged."
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <SectionTitle count={pending.length}>Waiting on the founder</SectionTitle>
          {pending.length === 0 && <EmptyState>No pending decisions. 🎉</EmptyState>}
          {pending.map((d) => {
            const urgent = d.deadline !== null && daysBetween(today, d.deadline) <= 2;
            return (
              <Card key={d.id} className={cn(urgent && "border-amber-300 ring-1 ring-amber-200")}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <VerticalBadge vertical={d.vertical} />
                  <span className={cn(urgent && "font-semibold text-amber-600")}>{formatDue(d.deadline, today)}</span>
                  <span>· requested by {d.requested_by}</span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900">{d.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{d.context}</p>
                <form action={makeDecision} className="mt-4 space-y-3">
                  <input type="hidden" name="id" value={d.id} />
                  <input name="note" placeholder="Optional rationale (logged with the decision)" className={inputClass} />
                  <div className="flex flex-wrap gap-2">
                    {d.options.map((option) => (
                      <button key={option} name="outcome" value={option} className={buttonClass.secondary}>
                        {option}
                      </button>
                    ))}
                  </div>
                </form>
              </Card>
            );
          })}
        </div>
        <div>
          <SectionTitle count={decided.length}>Decision log</SectionTitle>
          <Card>
            <ul className="space-y-4">
              {decided.map((d) => (
                <li key={d.id} className="border-l-2 border-emerald-400 pl-3">
                  <div className="text-sm font-medium text-slate-900">{d.title}</div>
                  <div className="mt-0.5 text-sm text-slate-600">→ {d.outcome}</div>
                  <div className="mt-1 text-xs text-slate-400">Decided {d.decided_at}</div>
                </li>
              ))}
              {decided.length === 0 && <li className="text-sm text-slate-500">Nothing decided yet.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
