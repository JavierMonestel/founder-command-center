import { describe, expect, it } from "vitest";
import { bucketItems, healthFor, krProgress, periodElapsed } from "../progress";
import type { ActionItem } from "../types";

describe("krProgress", () => {
  it("measures progress from start to target", () => {
    expect(krProgress({ start_value: 0, current_value: 50, target_value: 200 })).toBe(0.25);
  });
  it("supports lower-is-better key results", () => {
    expect(krProgress({ start_value: 12, current_value: 8, target_value: 4 })).toBe(0.5);
  });
  it("clamps to [0, 1]", () => {
    expect(krProgress({ start_value: 0, current_value: 300, target_value: 200 })).toBe(1);
    expect(krProgress({ start_value: 10, current_value: 5, target_value: 20 })).toBe(0);
  });
});

describe("health", () => {
  it("compares progress to the share of the cycle elapsed", () => {
    const elapsed = periodElapsed("2026-10-01", "2026-09-01", "2026-10-31");
    expect(elapsed).toBe(0.5);
    expect(healthFor(0.45, elapsed)).toBe("on-track");
    expect(healthFor(0.3, elapsed)).toBe("at-risk");
    expect(healthFor(0.1, elapsed)).toBe("off-track");
  });
});

describe("bucketItems", () => {
  const base: Omit<ActionItem, "id" | "due_date" | "status" | "priority"> = {
    title: "t",
    vertical: "company",
    owner: "Founder",
    source: "founder",
    context: null,
    created_at: "",
    updated_at: "",
  };
  const item = (id: number, due: string | null, status: ActionItem["status"] = "open", priority: ActionItem["priority"] = "p1"): ActionItem => ({
    ...base,
    id,
    due_date: due,
    status,
    priority,
  });

  it("groups open items by due date and skips done ones", () => {
    const b = bucketItems(
      [item(1, "2026-09-28"), item(2, "2026-10-01"), item(3, "2026-10-05"), item(4, "2026-11-01"), item(5, null), item(6, "2026-09-01", "done")],
      "2026-10-01",
    );
    expect(b.overdue.map((i) => i.id)).toEqual([1]);
    expect(b.dueToday.map((i) => i.id)).toEqual([2]);
    expect(b.thisWeek.map((i) => i.id)).toEqual([3]);
    expect(b.later.map((i) => i.id)).toEqual([4]);
    expect(b.undated.map((i) => i.id)).toEqual([5]);
  });

  it("sorts each bucket by priority first", () => {
    const b = bucketItems([item(1, "2026-09-20", "open", "p2"), item(2, "2026-09-29", "open", "p0")], "2026-10-01");
    expect(b.overdue.map((i) => i.id)).toEqual([2, 1]);
  });
});
