import type { DatabaseSync } from "node:sqlite";
import { addDays, todayIso } from "./dates";

// Fictional sample data for an early-stage health-AI startup with two business lines:
// a clinical (SaMD) vertical and a performance/wellness vertical. Organizations and
// people are invented; dates are relative to "today" so the demo always looks live.

interface SeedObjective {
  vertical: string;
  title: string;
  owner: string;
  krs: [title: string, metric: string, start: number, current: number, target: number][];
}

const OBJECTIVES: SeedObjective[] = [
  {
    vertical: "clinical",
    title: "Build the clinical evidence base for ECG-derived electrolyte estimation",
    owner: "Clinical Lead",
    krs: [
      ["Patients in retrospective validation cohort", "patients", 0, 780, 1200],
      ["Data-use agreements signed with partner sites", "sites", 0, 2, 3],
      ["FDA pre-submission package sections drafted", "sections", 0, 5, 8],
    ],
  },
  {
    vertical: "clinical",
    title: "Land the first paid health-system pilot",
    owner: "Founder",
    krs: [
      ["Qualified pilot conversations", "conversations", 0, 6, 10],
      ["Signed letters of intent", "LOIs", 0, 0, 2],
    ],
  },
  {
    vertical: "performance",
    title: "Grow paid athlete memberships after the public beta",
    owner: "Performance Lead",
    krs: [
      ["Paying members", "members", 1500, 3100, 5000],
      ["Waitlist-to-trial conversion", "%", 8, 13, 20],
      ["Weekly active athletes", "athletes", 2000, 3900, 6000],
    ],
  },
  {
    vertical: "performance",
    title: "Make in-session hydration alerts trustworthy",
    owner: "CTO",
    krs: [
      ["Supported heart-rate straps", "devices", 4, 5, 8],
      ["Alert precision on validated sessions", "%", 70, 81, 90],
    ],
  },
  {
    vertical: "company",
    title: "Run the company on a single source of truth",
    owner: "Executive Assistant",
    krs: [
      ["Recurring processes automated", "workflows", 0, 5, 12],
      ["Meetings with notes + actions synced to Notion", "%", 40, 72, 95],
      ["Founder hours per week on admin", "hours", 12, 7, 4],
    ],
  },
];

type SeedItem = [
  title: string,
  vertical: string,
  owner: string,
  dueOffset: number | null,
  priority: string,
  status: string,
  source: string,
  context: string | null,
];

const ACTION_ITEMS: SeedItem[] = [
  ["Send Northfield Health the pilot scope + pricing one-pager", "clinical", "Founder", -2, "p0", "open", "meeting", "Promised on the Tuesday intro call; their CMIO is presenting to the innovation committee next week."],
  ["Follow up with Cedar Valley Cardiology on the data-use agreement redlines", "clinical", "Clinical Lead", -1, "p0", "waiting", "email", "Their counsel returned redlines on the de-identification clause."],
  ["Book regulatory consultant for pre-sub review session", "clinical", "Executive Assistant", 1, "p1", "open", "founder", null],
  ["Draft investor update: October metrics + clinical milestones", "company", "Founder", 3, "p1", "open", "founder", "Pull KR snapshot from the command center export."],
  ["Confirm travel for the sports-science conference (flights + hotel)", "performance", "Executive Assistant", 2, "p1", "open", "slack", "Founder is speaking on the hydration panel; arrive the night before."],
  ["Reply to Summit Endurance Club about a team plan", "performance", "Performance Lead", 0, "p0", "open", "email", "60 athletes; they asked for coach dashboards and a group discount."],
  ["Ship onboarding email sequence for new beta members", "performance", "Performance Lead", 5, "p2", "open", "meeting", null],
  ["Collect strap-compatibility test results from the CTO", "performance", "CTO", -4, "p1", "open", "meeting", "Needed for the support page and the partnerships deck."],
  ["Schedule quarterly OKR review with both leads", "company", "Executive Assistant", 4, "p1", "open", "founder", null],
  ["Send thank-you + recap to the sports cardiologist advisor", "clinical", "Founder", -6, "p2", "open", "meeting", null],
  ["Renew the HIPAA-compliant cloud BAA paperwork", "clinical", "Executive Assistant", 9, "p1", "open", "email", null],
  ["Prepare athlete case study for the website", "performance", "Performance Lead", 12, "p2", "open", "slack", null],
  ["Audit Notion workspace: archive stale project pages", "company", "Executive Assistant", 6, "p2", "open", "founder", null],
  ["Approve contractor invoice for the ECG labeling sprint", "clinical", "Founder", -1, "p1", "open", "email", null],
  ["Finalize podcast guest list for next month", "performance", "Founder", 10, "p2", "waiting", "slack", null],
  ["Set up Grain → Notion meeting-notes sync", "company", "Executive Assistant", -3, "p1", "done", "founder", null],
  ["Migrate partner pipeline from spreadsheet to Attio", "company", "Executive Assistant", -8, "p1", "done", "founder", null],
];

type SeedDecision = [
  title: string,
  vertical: string,
  context: string,
  options: string[],
  deadlineOffset: number | null,
  requestedBy: string,
];

const DECISIONS: SeedDecision[] = [
  [
    "Pilot pricing model for Northfield Health",
    "clinical",
    "Northfield wants a 6-month pilot. Per-patient pricing aligns with value; a flat fee is easier for their procurement.",
    ["Flat pilot fee", "Per-monitored-patient fee", "Free pilot, paid conversion"],
    2,
    "Clinical Lead",
  ],
  [
    "Team-plan discount for endurance clubs",
    "performance",
    "Summit Endurance Club (60 athletes) asked for a group rate. Sets a precedent for every club deal.",
    ["15% off, annual only", "25% off with coach dashboard add-on", "No discount; offer free coach seats"],
    1,
    "Performance Lead",
  ],
  [
    "Hire: second ML engineer now or after the seed extension?",
    "company",
    "Clinical validation and strap support both compete for the CTO's time.",
    ["Open the role now", "Wait for the seed extension", "Contract for 3 months"],
    7,
    "CTO",
  ],
  [
    "Which conference to sponsor in Q1",
    "performance",
    "Budget allows one sponsorship. Endurance expo reaches athletes; the cardiology summit reaches clinical buyers.",
    ["Endurance expo", "Sports cardiology summit", "Neither; invest in content"],
    14,
    "Founder",
  ],
];

const BLOCKERS: [string, string, string, string][] = [
  ["Partner site IRB amendment pending", "clinical", "Delays 400 patients in the validation cohort by ~3 weeks.", "Clinical Lead"],
  ["Strap firmware update breaks raw ECG export on one model", "performance", "Hydration alerts disabled for ~9% of active athletes.", "CTO"],
  ["No single owner for partner follow-ups", "company", "Two warm health-system leads went 10+ days without a reply.", "Executive Assistant"],
];

type SeedMeeting = [title: string, vertical: string, dayOffset: number, hourET: number, attendees: string, prep: string | null];

const MEETINGS: SeedMeeting[] = [
  ["Weekly leadership sync", "company", 0, 10, "Founder, CTO, Clinical Lead, Performance Lead", "Review blockers + pending decisions first."],
  ["Northfield Health – pilot scoping", "clinical", 1, 13, "Founder, Clinical Lead, Northfield CMIO", "Bring pricing options; decision #1 must be made before this call."],
  ["Summit Endurance Club – team plan", "performance", 1, 16, "Performance Lead, club head coach", null],
  ["Regulatory consultant – pre-sub walkthrough", "clinical", 3, 11, "Clinical Lead, CTO, consultant", "Share drafted sections 1–5."],
  ["Investor check-in", "company", 4, 15, "Founder, lead seed investor", "Send update draft 24h before."],
  ["Strap OEM partnership call", "performance", 6, 12, "CTO, Performance Lead, OEM BD team", null],
];

export function seedDatabase(db: DatabaseSync, now: Date = new Date()): void {
  const today = todayIso(now);
  const stamp = now.toISOString();

  const insertObjective = db.prepare(
    "INSERT INTO objectives (vertical, cycle, period_start, period_end, title, owner) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertKr = db.prepare(
    `INSERT INTO key_results (objective_id, title, metric, start_value, current_value, target_value, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  // A 13-week cycle that is always ~half done, so the demo shows realistic on-track /
  // at-risk signals whatever day it is opened.
  const periodStart = addDays(today, -49);
  const periodEnd = addDays(today, 42);
  const cycle = `${shortDate(periodStart)} – ${shortDate(periodEnd)}`;
  for (const o of OBJECTIVES) {
    const { lastInsertRowid } = insertObjective.run(o.vertical, cycle, periodStart, periodEnd, o.title, o.owner);
    for (const [title, metric, start, current, target] of o.krs) {
      insertKr.run(Number(lastInsertRowid), title, metric, start, current, target, stamp);
    }
  }

  const insertItem = db.prepare(
    `INSERT INTO action_items (title, vertical, owner, due_date, priority, status, source, context, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const [title, vertical, owner, offset, priority, status, source, context] of ACTION_ITEMS) {
    const due = offset === null ? null : addDays(today, offset);
    insertItem.run(title, vertical, owner, due, priority, status, source, context, stamp, stamp);
  }

  const insertDecision = db.prepare(
    `INSERT INTO decisions (title, vertical, context, options, deadline, requested_by, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
  );
  for (const [title, vertical, context, options, offset, by] of DECISIONS) {
    insertDecision.run(title, vertical, context, JSON.stringify(options), offset === null ? null : addDays(today, offset), by);
  }
  db.prepare(
    `INSERT INTO decisions (title, vertical, context, options, deadline, requested_by, status, outcome, decided_at)
     VALUES (?, ?, ?, ?, ?, ?, 'decided', ?, ?)`,
  ).run(
    "Adopt Attio as the company CRM",
    "company",
    "Partner pipeline lived in three spreadsheets.",
    JSON.stringify(["Attio", "HubSpot", "Stay on spreadsheets"]),
    addDays(today, -9),
    "Executive Assistant",
    "Attio — native relationship graph, cheaper at our size, good API for automations.",
    addDays(today, -10),
  );

  const insertBlocker = db.prepare(
    "INSERT INTO blockers (title, vertical, impact, owner, resolved, created_at) VALUES (?, ?, ?, ?, 0, ?)",
  );
  for (const [title, vertical, impact, owner] of BLOCKERS) insertBlocker.run(title, vertical, impact, owner, stamp);

  const insertMeeting = db.prepare(
    "INSERT INTO meetings (title, vertical, starts_at, attendees, prep_notes) VALUES (?, ?, ?, ?, ?)",
  );
  for (const [title, vertical, dayOffset, hourET, attendees, prep] of MEETINGS) {
    // Store as UTC; 10:00 ET ≈ 14:00 UTC (good enough for a demo calendar).
    const startsAt = `${businessDay(today, dayOffset)}T${String(hourET + 4).padStart(2, "0")}:00:00.000Z`;
    insertMeeting.run(title, vertical, startsAt, attendees, prep);
  }
}

// Shift a date forward past weekends so the demo calendar never books Saturday meetings.
function businessDay(today: string, offset: number): string {
  let d = addDays(today, offset);
  for (;;) {
    const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (dow !== 0 && dow !== 6) return d;
    d = addDays(d, 1);
  }
}

function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
