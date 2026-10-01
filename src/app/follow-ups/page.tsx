import Link from "next/link";
import { listActionItems } from "@/lib/repo";
import { bucketItems } from "@/lib/progress";
import { todayIso } from "@/lib/dates";
import { OWNERS } from "@/lib/capture";
import { VERTICALS, VERTICAL_LABEL, type ActionItem } from "@/lib/types";
import { ItemRow } from "@/components/ItemRow";
import { Card, EmptyState, PageHeader, SectionTitle, buttonClass, cn, inputClass } from "@/components/ui";
import { createItem } from "../actions";

export default async function FollowUpsPage(props: PageProps<"/follow-ups">) {
  const sp = await props.searchParams;
  const vertical = typeof sp.vertical === "string" ? sp.vertical : "all";
  const owner = typeof sp.owner === "string" ? sp.owner : "all";
  const today = todayIso();

  const all = await listActionItems();
  const filtered = all.filter(
    (i) => (vertical === "all" || i.vertical === vertical) && (owner === "all" || i.owner === owner),
  );
  const buckets = bucketItems(filtered, today);
  const waiting = filtered.filter((i) => i.status === "waiting");
  const done = filtered.filter((i) => i.status === "done");

  const href = (patch: Record<string, string>) => {
    const q = new URLSearchParams({ vertical, owner, ...patch });
    for (const [k, v] of [...q.entries()]) if (v === "all") q.delete(k);
    const s = q.toString();
    return s ? `/follow-ups?${s}` : "/follow-ups";
  };

  const sections: [string, ActionItem[], string?][] = [
    ["Overdue", buckets.overdue, "text-red-600"],
    ["Due today", buckets.dueToday],
    ["Next 7 days", buckets.thisWeek],
    ["Later", buckets.later],
    ["No due date", buckets.undated],
  ];

  return (
    <>
      <PageHeader
        title="Follow-ups"
        subtitle="Every commitment from meetings, email and Slack — with an owner and a date — across both business lines."
      />

      <div className="mb-6 flex flex-wrap gap-4">
        <FilterGroup label="Line">
          {["all", ...VERTICALS].map((v) => (
            <FilterLink key={v} href={href({ vertical: v })} active={vertical === v}>
              {v === "all" ? "All" : VERTICAL_LABEL[v as keyof typeof VERTICAL_LABEL]}
            </FilterLink>
          ))}
        </FilterGroup>
        <FilterGroup label="Owner">
          {["all", ...OWNERS].map((o) => (
            <FilterLink key={o} href={href({ owner: o })} active={owner === o}>
              {o === "all" ? "Everyone" : o}
            </FilterLink>
          ))}
        </FilterGroup>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {sections.map(([title, items, tone]) =>
            items.length === 0 ? null : (
              <Card key={title}>
                <SectionTitle count={items.length}>
                  <span className={tone}>{title}</span>
                </SectionTitle>
                <ul className="divide-y divide-slate-100">
                  {items.map((i) => (
                    <ItemRow key={i.id} item={i} today={today} />
                  ))}
                </ul>
              </Card>
            ),
          )}
          {filtered.filter((i) => i.status !== "done").length === 0 && <EmptyState>No open follow-ups for this filter.</EmptyState>}
          {done.length > 0 && (
            <details className="rounded-xl border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-500">
                Completed ({done.length})
              </summary>
              <ul className="mt-2 divide-y divide-slate-100">
                {done.map((i) => (
                  <ItemRow key={i.id} item={i} today={today} />
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <SectionTitle>Add a follow-up</SectionTitle>
            <form action={createItem} className="space-y-3">
              <input name="title" required minLength={3} placeholder="e.g. Send pilot proposal to Northfield" className={inputClass} />
              <div className="grid grid-cols-2 gap-3">
                <select name="vertical" defaultValue="clinical" className={inputClass} aria-label="Business line">
                  {VERTICALS.map((v) => (
                    <option key={v} value={v}>
                      {VERTICAL_LABEL[v]}
                    </option>
                  ))}
                </select>
                <select name="owner" defaultValue="Founder" className={inputClass} aria-label="Owner">
                  {OWNERS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <input type="date" name="due_date" className={inputClass} aria-label="Due date" />
                <select name="priority" defaultValue="p1" className={inputClass} aria-label="Priority">
                  <option value="p0">P0 · urgent</option>
                  <option value="p1">P1 · this week</option>
                  <option value="p2">P2 · nice to have</option>
                </select>
              </div>
              <textarea name="context" rows={2} placeholder="Context (optional)" className={inputClass} />
              <button className={cn(buttonClass.primary, "w-full")}>Add follow-up</button>
            </form>
            <p className="mt-3 text-xs text-slate-500">
              Tip: paste a whole email or meeting notes into{" "}
              <Link href="/capture" className="font-medium text-slate-700 underline">
                Quick Capture
              </Link>{" "}
              to extract several follow-ups at once.
            </p>
          </Card>

          {waiting.length > 0 && (
            <Card>
              <SectionTitle count={waiting.length}>Waiting on others</SectionTitle>
              <ul className="divide-y divide-slate-100">
                {waiting.map((i) => (
                  <ItemRow key={i.id} item={i} today={today} compact />
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
        active ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
      )}
    >
      {children}
    </Link>
  );
}
