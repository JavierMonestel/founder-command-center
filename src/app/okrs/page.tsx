import { listObjectives } from "@/lib/repo";
import { cycleElapsed, healthFor, krProgress } from "@/lib/progress";
import { todayIso } from "@/lib/dates";
import { VERTICAL_LABEL, type Vertical } from "@/lib/types";
import { Card, HealthBadge, PageHeader, ProgressBar, VERTICAL_STYLES, cn } from "@/components/ui";
import { updateKr } from "../actions";

export default async function OkrsPage() {
  const objectives = await listObjectives();
  const elapsed = cycleElapsed(objectives, todayIso());
  const cycle = objectives[0]?.cycle ?? "";

  return (
    <>
      <PageHeader
        title={`OKRs · ${cycle}`}
        subtitle={`Objectives and key results per business line. The grey tick on each bar marks how much of the cycle has elapsed (${Math.round(elapsed * 100)}%).`}
      />
      <div className="space-y-10">
        {(["clinical", "performance", "company"] as Vertical[]).map((v) => (
          <section key={v}>
            <h2 className={cn("mb-3 text-sm font-semibold uppercase tracking-wider", VERTICAL_STYLES[v].text)}>{VERTICAL_LABEL[v]}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {objectives
                .filter((o) => o.vertical === v)
                .map((o) => (
                  <Card key={o.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold leading-snug text-slate-900">{o.title}</h3>
                        <div className="mt-1 text-xs text-slate-500">Owner: {o.owner}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-2xl font-semibold tabular-nums">{Math.round(o.progress * 100)}%</div>
                        <HealthBadge health={healthFor(o.progress, elapsed)} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={o.progress} marker={elapsed} color={VERTICAL_STYLES[v].bar} />
                    </div>
                    <ul className="mt-5 space-y-4">
                      {o.key_results.map((kr) => {
                        const p = krProgress(kr);
                        const lowerIsBetter = kr.target_value < kr.start_value;
                        return (
                          <li key={kr.id}>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-slate-700">
                                {kr.title}
                                {lowerIsBetter && <span className="ml-1 text-xs text-slate-400">(lower is better)</span>}
                              </span>
                              <span className="shrink-0 text-xs tabular-nums text-slate-500">{Math.round(p * 100)}%</span>
                            </div>
                            <div className="mt-1.5">
                              <ProgressBar value={p} color="bg-slate-400" />
                            </div>
                            <form action={updateKr} className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                              <input type="hidden" name="id" value={kr.id} />
                              <span>
                                {kr.start_value} →
                              </span>
                              <input
                                name="current_value"
                                type="number"
                                step="any"
                                defaultValue={kr.current_value}
                                aria-label={`Current value for ${kr.title}`}
                                className="w-24 rounded-md border border-slate-200 px-2 py-1 text-xs tabular-nums text-slate-900 focus:border-slate-400 focus:outline-none"
                              />
                              <span>
                                / {kr.target_value} {kr.metric}
                              </span>
                              <button className="ml-auto rounded-md px-2 py-1 font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                                Update
                              </button>
                            </form>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
