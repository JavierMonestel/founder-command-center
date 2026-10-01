"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as repo from "@/lib/repo";
import { resetStore } from "@/lib/store";
import { captureItems, generateBrief } from "@/lib/ai";
import { addDays, todayIso } from "@/lib/dates";
import type { CapturedItem } from "@/lib/capture";

const id = z.coerce.number().int().positive();

function refreshAll() {
  revalidatePath("/", "layout");
}

export async function completeItem(formData: FormData) {
  await repo.setActionItemStatus(id.parse(formData.get("id")), "done");
  refreshAll();
}

export async function reopenItem(formData: FormData) {
  await repo.setActionItemStatus(id.parse(formData.get("id")), "open");
  refreshAll();
}

export async function markWaiting(formData: FormData) {
  await repo.setActionItemStatus(id.parse(formData.get("id")), "waiting");
  refreshAll();
}

export async function snoozeItem(formData: FormData) {
  const days = z.coerce.number().int().min(1).max(30).parse(formData.get("days") ?? 2);
  await repo.snoozeActionItem(id.parse(formData.get("id")), addDays(todayIso(), days));
  refreshAll();
}

const NewItem = z.object({
  title: z.string().trim().min(3).max(200),
  vertical: z.enum(["clinical", "performance", "company"]),
  owner: z.string().trim().min(1).max(60),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .or(z.literal("").transform(() => null)),
  priority: z.enum(["p0", "p1", "p2"]),
  context: z.string().trim().max(500).nullable().optional(),
});

export async function createItem(formData: FormData) {
  const parsed = NewItem.parse({
    title: formData.get("title"),
    vertical: formData.get("vertical"),
    owner: formData.get("owner"),
    due_date: formData.get("due_date") ?? "",
    priority: formData.get("priority"),
    context: (formData.get("context") as string) || null,
  });
  await repo.createActionItems([{ ...parsed, context: parsed.context ?? null, source: "founder" }]);
  refreshAll();
}

export async function updateKr(formData: FormData) {
  const value = z.coerce.number().finite().parse(formData.get("current_value"));
  await repo.updateKeyResult(id.parse(formData.get("id")), value);
  refreshAll();
}

export async function makeDecision(formData: FormData) {
  const outcome = z.string().trim().min(1).max(500).parse(formData.get("outcome"));
  const note = String(formData.get("note") ?? "").trim();
  await repo.decide(id.parse(formData.get("id")), note ? `${outcome} — ${note}` : outcome);
  refreshAll();
}

export async function toggleBlocker(formData: FormData) {
  await repo.setBlockerResolved(id.parse(formData.get("id")), formData.get("resolved") === "true");
  refreshAll();
}

export async function generateBriefAction() {
  const snapshot = await repo.getSnapshot();
  const { mode, markdown } = await generateBrief(snapshot);
  await repo.saveBrief(mode, markdown);
  revalidatePath("/brief");
}

export interface CapturePreview {
  mode: "claude" | "rules";
  items: CapturedItem[];
  error?: string;
}

export async function previewCapture(text: string): Promise<CapturePreview> {
  const clean = text.trim().slice(0, 8000);
  if (clean.length < 4) return { mode: "rules", items: [], error: "Paste a note, email, or meeting summary first." };
  return captureItems(clean, todayIso());
}

const CapturedList = z.array(
  z.object({
    title: z.string().trim().min(3).max(200),
    vertical: z.enum(["clinical", "performance", "company"]),
    owner: z.string().trim().min(1).max(60),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    priority: z.enum(["p0", "p1", "p2"]),
    context: z.string().max(500).nullable(),
  }),
);

export async function saveCaptured(items: CapturedItem[]): Promise<number> {
  const parsed = CapturedList.parse(items);
  await repo.createActionItems(parsed.map((item) => ({ ...item, source: "capture" as const })));
  refreshAll();
  return parsed.length;
}

export async function resetDemo() {
  await resetStore();
  refreshAll();
}
