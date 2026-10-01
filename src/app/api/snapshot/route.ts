import { getSnapshot } from "@/lib/repo";
import { snapshotForModel } from "@/lib/brief";

// Read-only JSON feed of the whole operating picture. Point a Zapier/Make/n8n
// "fetch URL" step here to sync OKRs and follow-ups into Notion, Slack, etc.
export async function GET(request: Request) {
  const full = new URL(request.url).searchParams.get("format") === "full";
  const snapshot = await getSnapshot();
  return Response.json(full ? snapshot : snapshotForModel(snapshot));
}
