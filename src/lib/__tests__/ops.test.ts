import { describe, expect, it } from "vitest";
import { createMemoryDb } from "../schema";
import { applyOp, decodeOps, encodeOps, MAX_OPS_BYTES, type Op } from "../ops";

const NOW = new Date("2026-10-01T13:00:00Z");

function row<T>(sql: string, ...params: (string | number)[]): T {
  return { ...(createdDb.prepare(sql).get(...params) as object) } as T;
}
const createdDb = createMemoryDb(NOW);

describe("seed", () => {
  it("is deterministic so replayed ops always target the same ids", () => {
    const a = createMemoryDb(NOW).prepare("SELECT id, title FROM action_items ORDER BY id").all();
    const b = createMemoryDb(NOW).prepare("SELECT id, title FROM action_items ORDER BY id").all();
    expect(a.map((r) => ({ ...r }))).toEqual(b.map((r) => ({ ...r })));
    expect(a.length).toBeGreaterThan(10);
  });
});

describe("applyOp", () => {
  it("applies every op type", () => {
    const ops: Op[] = [
      { t: "status", id: 1, s: "done", at: "x" },
      { t: "snooze", id: 2, due: "2026-10-20", at: "x" },
      { t: "kr", id: 1, v: 999, at: "x" },
      { t: "decide", id: 1, o: "Flat pilot fee", on: "2026-10-01" },
      { t: "blocker", id: 1, r: true },
      {
        t: "new",
        at: "x",
        item: { title: "New thing", vertical: "company", owner: "CTO", due_date: null, priority: "p2", source: "capture", context: null },
      },
    ];
    for (const op of ops) applyOp(createdDb, op);

    expect(row<{ status: string }>("SELECT status FROM action_items WHERE id = 1").status).toBe("done");
    expect(row<{ due_date: string }>("SELECT due_date FROM action_items WHERE id = 2").due_date).toBe("2026-10-20");
    expect(row<{ current_value: number }>("SELECT current_value FROM key_results WHERE id = 1").current_value).toBe(999);
    expect(row<{ outcome: string }>("SELECT outcome FROM decisions WHERE id = 1").outcome).toBe("Flat pilot fee");
    expect(row<{ resolved: number }>("SELECT resolved FROM blockers WHERE id = 1").resolved).toBe(1);
    expect(row<{ owner: string }>("SELECT owner FROM action_items WHERE title = ?", "New thing").owner).toBe("CTO");
  });
});

describe("cookie encoding", () => {
  it("round-trips ops and ignores garbage", () => {
    const ops: Op[] = [{ t: "blocker", id: 3, r: false }];
    expect(decodeOps(encodeOps(ops))).toEqual(ops);
    expect(decodeOps("not json")).toEqual([]);
    expect(decodeOps('{"t":"x"}')).toEqual([]);
  });

  it("drops the oldest ops to stay under the cookie budget", () => {
    const ops: Op[] = Array.from({ length: 200 }, (_, i) => ({ t: "status", id: i, s: "done", at: "2026-10-01T00:00:00.000Z" }));
    const encoded = encodeOps(ops);
    expect(encoded.length).toBeLessThanOrEqual(MAX_OPS_BYTES);
    const kept = decodeOps(encoded);
    expect(kept.at(-1)).toEqual(ops.at(-1));
    expect(kept.length).toBeLessThan(ops.length);
  });
});
