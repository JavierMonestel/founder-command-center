import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { DatabaseSync } from "node:sqlite";
import { getFileDb, resetFileDb, storageMode } from "./db";
import { createMemoryDb } from "./schema";
import { applyOp, decodeOps, encodeOps, type Op } from "./ops";

const OPS_COOKIE = "fcc_ops";
const BRIEF_COOKIE = "fcc_brief";
const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 7 };

async function readOps(): Promise<Op[]> {
  return decodeOps((await cookies()).get(OPS_COOKIE)?.value);
}

// One database per request: the shared file in file mode, or seed + this visitor's
// changes in cookie mode. cache() dedupes it across components in the same render.
export const getStore = cache(async (): Promise<DatabaseSync> => {
  if (storageMode() === "file") return getFileDb();
  const db = createMemoryDb();
  for (const op of await readOps()) applyOp(db, op);
  return db;
});

export async function mutate(...newOps: Op[]): Promise<void> {
  if (storageMode() === "file") {
    for (const op of newOps) applyOp(getFileDb(), op);
    return;
  }
  const ops = [...(await readOps()), ...newOps];
  (await cookies()).set(OPS_COOKIE, encodeOps(ops), COOKIE_OPTS);
}

export interface StoredBrief {
  created_at: string;
  mode: "claude" | "rules";
  markdown: string;
}

export async function storeBrief(brief: StoredBrief): Promise<void> {
  if (storageMode() === "file") {
    getFileDb().prepare("INSERT INTO briefs (created_at, mode, markdown) VALUES (?, ?, ?)").run(brief.created_at, brief.mode, brief.markdown);
    return;
  }
  const json = JSON.stringify(brief);
  const jar = await cookies();
  // A brief that doesn't fit in a cookie simply isn't persisted in the hosted demo.
  if (json.length < 3800) jar.set(BRIEF_COOKIE, json, COOKIE_OPTS);
  else jar.delete(BRIEF_COOKIE);
}

export async function loadBrief(): Promise<StoredBrief | null> {
  if (storageMode() === "file") {
    const row = getFileDb().prepare("SELECT created_at, mode, markdown FROM briefs ORDER BY id DESC LIMIT 1").get();
    return row ? ({ ...row } as unknown as StoredBrief) : null;
  }
  const raw = (await cookies()).get(BRIEF_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredBrief;
  } catch {
    return null;
  }
}

export async function resetStore(): Promise<void> {
  if (storageMode() === "file") {
    resetFileDb();
    return;
  }
  const jar = await cookies();
  jar.delete(OPS_COOKIE);
  jar.delete(BRIEF_COOKIE);
}
