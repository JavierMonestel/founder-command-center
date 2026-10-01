import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { CompanySnapshot } from "./types";
import { buildRulesBrief, snapshotForModel } from "./brief";
import { heuristicCapture, OWNERS, type CapturedItem } from "./capture";

// Claude is optional. With ANTHROPIC_API_KEY set, briefs and captures are model-written;
// without it the app runs in "demo mode" using the deterministic rules engine, so the
// hosted demo works for anyone without exposing a key.

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";
// Route policy refusals to a fallback model server-side instead of failing the request.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

export type AiMode = "claude" | "rules";

const BRIEF_SYSTEM = `You are the chief-of-staff assistant to the founder of an early-stage health-AI startup with two business lines:
- Clinical: an ECG-based software-as-a-medical-device business selling to health systems (evidence generation, regulatory, pilots).
- Performance: a consumer membership for athletes (growth, retention, device support).

Write the founder's daily brief in Markdown from the JSON company snapshot you receive.
Rules:
- Start with "# Founder Daily Brief — <weekday, month day>" and a one-line **TL;DR**.
- Then "## Needs you today": only decisions due within 48h and the founder's own overdue/due-today items. Be specific about what to decide and the options.
- Then one section per business line (Clinical, Performance, Company-wide): OKR pulse vs. share of the OKR cycle elapsed, overdue follow-ups with owners, blockers with impact, pending decisions.
- Then "## Meetings today & tomorrow" with prep notes, and "## Suggested delegations" for low-priority founder items another owner could take.
- Be concise, scannable, and concrete. Never invent facts, numbers, people, or meetings that are not in the snapshot.`;

export async function generateBrief(snapshot: CompanySnapshot): Promise<{ mode: AiMode; markdown: string }> {
  if (!aiEnabled()) return { mode: "rules", markdown: buildRulesBrief(snapshot) };
  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: BRIEF_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(snapshotForModel(snapshot), null, 2) }],
    });
    if (response.stop_reason === "refusal") throw new Error("model declined");
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) throw new Error("empty response");
    return { mode: "claude", markdown: text };
  } catch (error) {
    logAiError("brief", error);
    return { mode: "rules", markdown: buildRulesBrief(snapshot) };
  }
}

const CaptureSchema = z.object({
  items: z.array(
    z.object({
      title: z.string().describe("Imperative, specific task title, max ~90 chars"),
      vertical: z.enum(["clinical", "performance", "company"]),
      owner: z.enum(OWNERS),
      due_date: z.string().nullable().describe("YYYY-MM-DD or null if no date is implied"),
      priority: z.enum(["p0", "p1", "p2"]),
      context: z.string().nullable().describe("One short sentence of useful context, or null"),
    }),
  ),
});

export async function captureItems(text: string, today: string): Promise<{ mode: AiMode; items: CapturedItem[] }> {
  if (!aiEnabled()) return { mode: "rules", items: heuristicCapture(text, today) };
  try {
    const weekday = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(CaptureSchema) },
      system:
        `You turn raw notes (Slack messages, emails, meeting notes) into action items for a founder's follow-up tracker at a health-AI startup with a Clinical line (health systems, regulatory, patients) and a Performance line (athletes, memberships, wearables). ` +
        `Today is ${weekday} ${today}. Resolve relative dates ("Friday", "next week") to YYYY-MM-DD. ` +
        `Default owner is Founder unless someone else is clearly responsible. p0 = blocking revenue/partners or explicitly urgent; p2 = nice-to-have. ` +
        `Extract only real commitments or follow-ups; skip chit-chat. Return an empty list if there are none.`,
      messages: [{ role: "user", content: text }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error("no parsed output");
    return { mode: "claude", items: response.parsed_output.items };
  } catch (error) {
    logAiError("capture", error);
    return { mode: "rules", items: heuristicCapture(text, today) };
  }
}

function logAiError(task: string, error: unknown) {
  if (error instanceof Anthropic.AuthenticationError) console.error(`[ai:${task}] invalid ANTHROPIC_API_KEY`);
  else if (error instanceof Anthropic.RateLimitError) console.error(`[ai:${task}] rate limited`);
  else if (error instanceof Anthropic.APIError) console.error(`[ai:${task}] API error ${error.status}: ${error.message}`);
  else console.error(`[ai:${task}]`, error);
}
