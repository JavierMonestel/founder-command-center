import { describe, expect, it } from "vitest";
import { buildRulesBrief, snapshotForModel } from "../brief";
import type { CompanySnapshot } from "../types";

const snapshot: CompanySnapshot = {
  today: "2026-10-01",
  objectives: [
    {
      id: 1,
      vertical: "clinical",
      cycle: "Aug 13 – Nov 12",
      period_start: "2026-08-13",
      period_end: "2026-11-12",
      title: "Land the first health-system pilot",
      owner: "Founder",
      progress: 0.2,
      key_results: [],
    },
  ],
  items: [
    {
      id: 1,
      title: "Send pilot one-pager",
      vertical: "clinical",
      owner: "Founder",
      due_date: "2026-09-29",
      priority: "p0",
      status: "open",
      source: "meeting",
      context: null,
      created_at: "",
      updated_at: "",
    },
    {
      id: 2,
      title: "Podcast guest list",
      vertical: "performance",
      owner: "Founder",
      due_date: "2026-10-20",
      priority: "p2",
      status: "open",
      source: "slack",
      context: null,
      created_at: "",
      updated_at: "",
    },
  ],
  decisions: [
    {
      id: 1,
      title: "Pilot pricing model",
      vertical: "clinical",
      context: "",
      options: ["Flat fee", "Per patient"],
      deadline: "2026-10-02",
      requested_by: "Clinical Lead",
      status: "pending",
      outcome: null,
      decided_at: null,
    },
  ],
  blockers: [{ id: 1, title: "IRB amendment pending", vertical: "clinical", impact: "Delays cohort", owner: "Clinical Lead", resolved: false, created_at: "" }],
  meetings: [],
};

describe("buildRulesBrief", () => {
  const md = buildRulesBrief(snapshot);

  it("leads with the date and a TL;DR", () => {
    expect(md).toMatch(/^# Founder Daily Brief — Thursday, October 1/);
    expect(md).toContain("**TL;DR:** 1 overdue follow-up");
  });

  it("surfaces urgent decisions and the founder's overdue items first", () => {
    const needs = md.split("## Needs you today")[1].split("## Clinical")[0];
    expect(needs).toContain("**Decide:** Pilot pricing model");
    expect(needs).toContain("Flat fee / Per patient");
    expect(needs).toContain("**Overdue (yours):** Send pilot one-pager");
  });

  it("flags off-track OKRs, blockers and delegation candidates", () => {
    expect(md).toContain("Land the first health-system pilot: **20%** (off track)");
    expect(md).toContain("Blocker: IRB amendment pending");
    expect(md).toContain('"Podcast guest list" is low priority');
  });
});

describe("snapshotForModel", () => {
  it("only sends open work to the model", () => {
    const view = snapshotForModel(snapshot);
    expect(view.open_action_items).toHaveLength(2);
    expect(view.pending_decisions[0].options).toEqual(["Flat fee", "Per patient"]);
    expect(view.cycle_elapsed_pct).toBe(54);
  });
});
