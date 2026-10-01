import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { aiEnabled } from "@/lib/ai";
import { resetDemo } from "./actions";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Founder Command Center",
  description:
    "A chief-of-staff operating system for a two-vertical health-AI startup: OKRs, follow-ups, decisions, blockers and an AI daily brief in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const ai = aiEnabled();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-900">
        <div className="lg:flex lg:min-h-screen">
          <aside className="bg-slate-950 lg:w-60 lg:shrink-0">
            <div className="lg:sticky lg:top-0 lg:h-screen">
            <div className="flex items-center gap-2.5 px-6 py-5">
              <Logo />
              <div>
                <div className="text-sm font-semibold text-white">Founder OS</div>
                <div className="text-[11px] text-slate-400">Command Center</div>
              </div>
            </div>
            <Sidebar />
            <div className="hidden px-6 text-[11px] leading-relaxed text-slate-500 lg:absolute lg:bottom-5 lg:block">
              <div className="mb-2 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${ai ? "bg-emerald-400" : "bg-amber-400"}`} />
                {ai ? "Claude connected" : "Demo mode · rules engine"}
              </div>
              Portfolio project by Javier Monestel.
              <br />
              Sample data is fictional.
            </div>
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-800">
              <span>
                Demo workspace with fictional data · independent portfolio project, not affiliated with any company.
              </span>
              <form action={resetDemo}>
                <button className="font-medium underline underline-offset-2 hover:text-amber-950">Reset demo data</button>
              </form>
            </div>
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

function Logo() {
  // A heartbeat trace inside a rounded square — nods to ECG-based health AI.
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-white/10" />
      <path d="M5 17h5l2.5-6 4 11 3-8 1.5 3H27" fill="none" stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
