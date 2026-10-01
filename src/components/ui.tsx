import type { ReactNode } from "react";
import type { Priority, Vertical } from "@/lib/types";
import { VERTICAL_LABEL } from "@/lib/types";
import type { Health } from "@/lib/progress";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children}
      {count !== undefined && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{count}</span>
      )}
    </h2>
  );
}

export const VERTICAL_STYLES: Record<Vertical, { dot: string; badge: string; bar: string; text: string }> = {
  clinical: { dot: "bg-teal-500", badge: "bg-teal-50 text-teal-700 ring-teal-600/20", bar: "bg-teal-500", text: "text-teal-700" },
  performance: { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700 ring-orange-600/20", bar: "bg-orange-500", text: "text-orange-700" },
  company: { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 ring-indigo-600/20", bar: "bg-indigo-500", text: "text-indigo-700" },
};

export function VerticalBadge({ vertical }: { vertical: Vertical }) {
  const s = VERTICAL_STYLES[vertical];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", s.badge)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {VERTICAL_LABEL[vertical]}
    </span>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  p0: "bg-red-50 text-red-700 ring-red-600/20",
  p1: "bg-amber-50 text-amber-700 ring-amber-600/20",
  p2: "bg-slate-50 text-slate-600 ring-slate-500/20",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase ring-1 ring-inset", PRIORITY_STYLES[priority])}>
      {priority}
    </span>
  );
}

const HEALTH_STYLES: Record<Health, string> = {
  "on-track": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  "at-risk": "bg-amber-50 text-amber-700 ring-amber-600/20",
  "off-track": "bg-red-50 text-red-700 ring-red-600/20",
};

export function HealthBadge({ health }: { health: Health }) {
  return (
    <span className={cn("whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset", HEALTH_STYLES[health])}>
      {health.replace("-", " ")}
    </span>
  );
}

export function ProgressBar({ value, marker, color = "bg-slate-900" }: { value: number; marker?: number; color?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="relative h-2 w-full rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      {marker !== undefined && (
        <div
          className="absolute -top-1 h-4 w-0.5 rounded bg-slate-400"
          style={{ left: `${Math.round(Math.min(1, marker) * 100)}%` }}
          title={`Cycle elapsed: ${Math.round(marker * 100)}%`}
        />
      )}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "danger" | "warn" | "good" }) {
  const toneClass = {
    default: "text-slate-900",
    danger: "text-red-600",
    warn: "text-amber-600",
    good: "text-emerald-600",
  }[tone];
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn("mt-1 text-3xl font-semibold tabular-nums", toneClass)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">{children}</div>;
}

export const buttonClass = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50",
  ghost: "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900",
};

export const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";
