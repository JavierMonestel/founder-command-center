import { getLatestBrief, getSnapshot, saveBrief } from "@/lib/repo";
import { generateBrief } from "@/lib/ai";
import { buildRulesBrief } from "@/lib/brief";
import { authorized } from "../auth";

// GET  -> latest brief as Markdown (for a scheduled "post to Slack at 8am" automation)
// POST -> generate + store a fresh brief, return it as JSON
export async function GET() {
  const latest = await getLatestBrief();
  const markdown = latest?.markdown ?? buildRulesBrief(await getSnapshot());
  return new Response(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { mode, markdown } = await generateBrief(await getSnapshot());
  await saveBrief(mode, markdown);
  return Response.json({ mode, markdown });
}
