import type { Priority, Vertical } from "./types";
import { addDays } from "./dates";

export interface CapturedItem {
  title: string;
  vertical: Vertical;
  owner: string;
  due_date: string | null;
  priority: Priority;
  context: string | null;
}

export const OWNERS = ["Founder", "CTO", "Clinical Lead", "Performance Lead", "Executive Assistant"] as const;

const CLINICAL_HINTS = /\b(hospital|health system|clinic|clinical|cardiolog\w*|fda|pre-?sub|irb|patients?|regulatory|hipaa|baa|pilot|cmio|ecg study|validation)\b/i;
const PERFORMANCE_HINTS = /\b(athletes?|club|team plan|strap|members?|membership|coach\w*|race|hydration|beta|waitlist|endurance|podcast|onboarding)\b/i;

const OWNER_ALIASES: [RegExp, string][] = [
  [/@?\bcto\b/i, "CTO"],
  [/@?\bclinical(?:\s|-)?lead\b/i, "Clinical Lead"],
  [/@?\bperformance(?:\s|-)?lead\b/i, "Performance Lead"],
  [/@?\b(ea|executive assistant|me)\b/i, "Executive Assistant"],
  [/@?\bfounder|ceo\b/i, "Founder"],
];

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Rules-based fallback for turning free text (a Slack message, meeting notes, an
// email snippet) into structured action items. One item per line/bullet.
// Greetings, sign-offs and meta questions carry no commitment of their own.
const NOT_AN_ASK = /^(?:hi|hello|hey|thanks|thank you|cheers|best|regards|great (?:call|meeting|chat)|can someone|could someone|let me know|sounds good)\b/i;

const BULLET =/^\s*(?:[-*•]|\d+[.)]|\[ \])\s+/;

export function heuristicCapture(text: string, today: string): CapturedItem[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  // In bulleted notes, the non-bullet lines are headings ("Leadership sync notes").
  const hasBullets = lines.some((l) => BULLET.test(l));
  return lines
    .filter((l) => !hasBullets || BULLET.test(l))
    // Prose (emails, Slack) gets split into sentences; bullets are already one ask each.
    .flatMap((l) => (hasBullets ? [l.replace(BULLET, "")] : l.split(/(?<=[.?!])\s+/)))
    .filter((s) => !NOT_AN_ASK.test(s.trim()))
    .flatMap((l) => l.split(/;\s+|,\s+(?:and\s+)?(?:also\s+)?(?=(?:remind me to|book|send|schedule|draft|follow up|ask|share|review)\b)/i))
    .map((line) => line.replace(/^\s*(?:also|and|plus)\s+/i, "").trim())
    .filter((line) => line.length > 3)
    .map((line) => parseLine(line, today));
}

export function parseLine(line: string, today: string): CapturedItem {
  let rest = line;

  const tag = rest.match(/#(clinical|performance|company)\b/i);
  let vertical: Vertical;
  if (tag) {
    vertical = tag[1].toLowerCase() as Vertical;
    rest = rest.replace(tag[0], "");
  } else if (CLINICAL_HINTS.test(rest)) vertical = "clinical";
  else if (PERFORMANCE_HINTS.test(rest)) vertical = "performance";
  else vertical = "company";

  let priority: Priority = "p1";
  if (/!p0\b|\b(urgent|asap|critical)\b/i.test(rest)) priority = "p0";
  else if (/!p2\b|\b(whenever|low priority|nice to have)\b/i.test(rest)) priority = "p2";
  rest = rest.replace(/!p[012]\b/i, "");

  let owner = "Founder";
  // Only an explicit @mention or "owner: X" assigns someone; a name merely appearing
  // in the sentence ("get results from the CTO") does not make them the owner.
  const mention = rest.match(/@([\w-]+(?:\s(?:lead))?)|\bowner:\s*([\w ]+?)(?=[,.]|$)/i);
  const ownerSource = mention ? mention[0] : "";
  for (const [re, name] of OWNER_ALIASES) {
    if (re.test(ownerSource)) {
      owner = name;
      break;
    }
  }
  if (mention) rest = rest.replace(mention[0], "");

  // Meeting-notes style: "CTO to send …" / "Clinical lead: chase …" names the owner up front.
  const lead = rest.match(/^\s*(founder|ceo|cto|clinical lead|performance lead|ea|executive assistant)\s*(?::|\bto\b)\s*/i);
  if (lead) {
    owner = OWNER_ALIASES.find(([re]) => re.test(lead[1]))?.[1] ?? owner;
    rest = rest.slice(lead[0].length);
  }

  const { due, cleaned } = extractDue(rest, today);
  rest = cleaned;

  const title = tidy(rest);
  return { title, vertical, owner, due_date: due, priority, context: null };
}

function extractDue(text: string, today: string): { due: string | null; cleaned: string } {
  // Most specific first: "great call today … next Friday" should resolve to Friday.
  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/\b(?:by|on|due)?\s*(\d{4}-\d{2}-\d{2})\b/i, (m) => m[1]],
    [/\b(?:by|due)?\s*tomorrow\b/i, () => addDays(today, 1)],
    [/\b(?:by|due)?\s*next week\b/i, () => addDays(today, 7)],
    [/\bin (\d{1,2}) days?\b/i, (m) => addDays(today, Number(m[1]))],
    [
      new RegExp(`\\b(?:by|on|due|this|(next))?\\s*(${WEEKDAYS.join("|")})\\b`, "i"),
      (m) => addDays(nextWeekday(today, WEEKDAYS.indexOf(m[2].toLowerCase())), m[1] ? 7 : 0),
    ],
    [/\b(?:by|due)?\s*today\b|\beod\b/i, () => today],
  ];
  for (const [re, toDate] of patterns) {
    const m = text.match(re);
    if (m) return { due: toDate(m), cleaned: text.replace(m[0], " ") };
  }
  return { due: null, cleaned: text };
}

function nextWeekday(today: string, weekday: number): string {
  const current = new Date(`${today}T12:00:00Z`).getUTCDay();
  const delta = (weekday - current + 7) % 7 || 7;
  return addDays(today, delta);
}

function tidy(s: string): string {
  const t = s
    .replace(/\(?\b(?:low priority|nice to have|whenever)\b\)?/gi, "")
    .replace(/\b(?:at some point|urgent|asap|is)\b\s*$|\b(?:at some point|urgent|asap)\b/gi, "")
    .replace(/^(?:hey[,!]?\s+)?(?:as discussed,?\s*|fyi,?\s*)?(?:can you |could you |please |remind me to |we should |need to )*/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,]+(?:for|by|on|at|due|before)\s*[?.!]?\s*$/i, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[\s,.:;?!-]+|[\s,.:;?!-]+$/g, "")
    .trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
