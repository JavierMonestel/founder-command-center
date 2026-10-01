import { revalidatePath } from "next/cache";
import { z } from "zod";
import { captureItems } from "@/lib/ai";
import { createActionItems } from "@/lib/repo";
import { todayIso } from "@/lib/dates";
import { authorized } from "../auth";
import { storageMode } from "@/lib/db";

const Body = z.object({
  text: z.string().min(4).max(20000),
  source: z.enum(["meeting", "email", "slack", "capture"]).default("capture"),
  dry_run: z.boolean().default(false),
});

// Webhook target: send meeting notes (e.g. a Grain recap), an email body, or a Slack
// message and get structured follow-ups back. Saves them unless dry_run is true.
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch (error) {
    const detail = error instanceof z.ZodError ? z.flattenError(error).fieldErrors : "invalid JSON";
    return Response.json({ error: "bad request", detail }, { status: 400 });
  }

  const { mode, items } = await captureItems(body.text, todayIso());
  // The hosted demo keeps changes per browser (cookie), so API callers can't persist there.
  const persist = !body.dry_run && storageMode() === "file";
  if (persist) {
    await createActionItems(items.map((item) => ({ ...item, source: body.source })));
    revalidatePath("/", "layout");
  }
  return Response.json({
    mode,
    saved: persist,
    items,
    ...(!persist && !body.dry_run ? { note: "Hosted demo stores changes per browser session; run locally (file storage) to persist API writes." } : {}),
  });
}
