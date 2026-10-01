"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { CapturedItem } from "@/lib/capture";
import { VERTICAL_LABEL } from "@/lib/types";
import { previewCapture, saveCaptured } from "../actions";
import { Spinner } from "@/components/ClientButtons";
import { Card, PriorityBadge, SectionTitle, VerticalBadge, buttonClass, inputClass } from "@/components/ui";

const SAMPLES = {
  "Meeting notes": `Leadership sync notes
- CTO to send the strap firmware workaround to support by Thursday
- Clinical lead: chase Cedar Valley counsel on the DUA redlines, urgent
- Founder to intro the performance lead to the Summit Endurance head coach tomorrow
- We should refresh the athlete case study at some point (low priority)`,
  "Founder Slack DM": `can you remind me to send the investor update draft next week, and book the regulatory consultant for friday? also the podcast guest list is whenever`,
  Email: `Hi team — great call today. As discussed, Northfield's CMIO needs the pilot data-flow diagram and the security questionnaire before their committee meets next Friday. Can someone own that? Thanks, Dana`,
};

export function CaptureClient({ aiOn }: { aiOn: boolean }) {
  const [text, setText] = useState(SAMPLES["Meeting notes"]);
  const [items, setItems] = useState<CapturedItem[] | null>(null);
  const [mode, setMode] = useState<"claude" | "rules" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [extracting, startExtract] = useTransition();
  const [saving, startSave] = useTransition();

  const extract = () =>
    startExtract(async () => {
      setMessage(null);
      const result = await previewCapture(text);
      setItems(result.items);
      setMode(result.mode);
      if (result.error) setMessage(result.error);
    });

  const save = () =>
    startSave(async () => {
      if (!items?.length) return;
      const n = await saveCaptured(items);
      setMessage(`Added ${n} follow-up${n === 1 ? "" : "s"} to the tracker.`);
      setItems(null);
    });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Try a sample</span>
          {Object.entries(SAMPLES).map(([label, sample]) => (
            <button key={label} type="button" className={buttonClass.ghost} onClick={() => setText(sample)}>
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          className={`${inputClass} font-mono text-[13px] leading-relaxed`}
          placeholder="Paste meeting notes, an email, or a Slack thread…"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">{aiOn ? "Extraction by Claude (structured output)" : "Demo mode: rules-based extraction"}</span>
          <button onClick={extract} disabled={extracting} className={buttonClass.primary}>
            {extracting && <Spinner />}
            {extracting ? "Extracting…" : "Extract follow-ups"}
          </button>
        </div>
      </Card>

      <Card>
        <SectionTitle count={items?.length}>Preview</SectionTitle>
        {message && <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>}
        {!items && !message && <p className="text-sm text-slate-500">Extracted follow-ups appear here for review before they are saved.</p>}
        {items && items.length === 0 && <p className="text-sm text-slate-500">No commitments found in that text.</p>}
        {items && items.length > 0 && (
          <>
            <ul className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <li key={idx} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{item.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <PriorityBadge priority={item.priority} />
                      <VerticalBadge vertical={item.vertical} />
                      <span className="font-medium text-slate-600">{item.owner}</span>
                      <span>· {item.due_date ?? "no date"}</span>
                    </div>
                    {item.context && <p className="mt-1 text-xs text-slate-500">{item.context}</p>}
                  </div>
                  <button
                    className={buttonClass.ghost}
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    aria-label={`Remove ${item.title}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-400">via {mode === "claude" ? "Claude" : "rules engine"} · lines: {Object.values(VERTICAL_LABEL).join(" / ")}</span>
              <button onClick={save} disabled={saving} className={buttonClass.primary}>
                {saving && <Spinner />}
                Add {items.length} to tracker
              </button>
            </div>
          </>
        )}
        {message?.startsWith("Added") && (
          <Link href="/follow-ups" className="text-sm font-medium text-slate-700 underline">
            View follow-ups →
          </Link>
        )}
      </Card>
    </div>
  );
}
