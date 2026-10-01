import { headers } from "next/headers";
import { aiEnabled } from "@/lib/ai";
import { storageMode } from "@/lib/db";
import { Card, PageHeader, SectionTitle } from "@/components/ui";

const RECIPES = [
  {
    tool: "Grain → Command Center",
    trigger: "Grain: “Meeting recap ready” webhook",
    action: "POST the recap to /api/ingest with source=meeting. Action items land in Follow-ups with owners and due dates.",
  },
  {
    tool: "Slack → Command Center",
    trigger: "Slack: message saved / emoji reaction 📌",
    action: "Zapier or Make forwards the message text to /api/ingest with source=slack.",
  },
  {
    tool: "Command Center → Slack",
    trigger: "Schedule: weekdays 7:45 AM ET",
    action: "POST /api/brief to generate today’s brief, then post the Markdown to the founder’s DM.",
  },
  {
    tool: "Command Center → Notion",
    trigger: "Schedule: Fridays 4 PM",
    action: "GET /api/snapshot and upsert OKR progress + open follow-ups into the Notion company wiki (single source of truth).",
  },
  {
    tool: "Attio / Linear",
    trigger: "Follow-up created with an external partner or an engineering owner",
    action: "Route partner follow-ups to the Attio record and engineering items to a Linear issue (see the OKR → Linear planner project).",
  },
];

export default async function IntegrationsPage() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;
  const tokenRequired = Boolean(process.env.INGEST_TOKEN);

  return (
    <>
      <PageHeader
        title="Integrations & automations"
        subtitle="The command center is API-first so the rest of the toolstack (Grain, Slack, Notion, Attio, Linear) can feed it and read from it through Zapier, Make or n8n."
      />

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <StatusCard label="AI engine" value={aiEnabled() ? "Claude (Anthropic API)" : "Rules engine (demo mode)"} ok={aiEnabled()} />
        <StatusCard label="Webhook auth" value={tokenRequired ? "Bearer token required" : "Open (demo)"} ok={tokenRequired} />
        <StatusCard
          label="Storage"
          value={storageMode() === "file" ? "SQLite file (shared)" : "SQLite in-memory + your changes (per browser)"}
          ok
        />
      </div>

      <SectionTitle>Automation recipes</SectionTitle>
      <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {RECIPES.map((r) => (
          <Card key={r.tool}>
            <div className="text-sm font-semibold text-slate-900">{r.tool}</div>
            <div className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">Trigger</div>
            <div className="text-sm text-slate-600">{r.trigger}</div>
            <div className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">Action</div>
            <div className="text-sm text-slate-600">{r.action}</div>
          </Card>
        ))}
      </div>

      <SectionTitle>API endpoints</SectionTitle>
      <div className="space-y-4">
        <Endpoint
          method="POST"
          path="/api/ingest"
          description="Turn free text into follow-ups. Body: { text, source?: meeting|email|slack, dry_run?: boolean }"
          example={`curl -X POST ${base}/api/ingest \\
  -H "Content-Type: application/json" \\${tokenRequired ? `\n  -H "Authorization: Bearer $INGEST_TOKEN" \\` : ""}
  -d '{"text":"CTO to share strap test results by Friday","source":"slack","dry_run":true}'`}
        />
        <Endpoint method="GET" path="/api/snapshot" description="Compact JSON of OKRs, open follow-ups, decisions, blockers and meetings. Add ?format=full for raw records." example={`curl ${base}/api/snapshot`} />
        <Endpoint method="GET" path="/api/brief" description="Latest daily brief as Markdown." example={`curl ${base}/api/brief`} />
        <Endpoint method="POST" path="/api/brief" description="Generate and store a fresh brief; returns { mode, markdown }." example={`curl -X POST ${base}/api/brief`} />
      </div>
    </>
  );
}

function StatusCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-900">
        <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-400"}`} />
        {value}
      </div>
    </Card>
  );
}

function Endpoint({ method, path, description, example }: { method: string; path: string; description: string; example: string }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${method === "GET" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}>
          {method}
        </span>
        <code className="font-mono text-sm text-slate-900">{path}</code>
      </div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">{example}</pre>
    </Card>
  );
}
