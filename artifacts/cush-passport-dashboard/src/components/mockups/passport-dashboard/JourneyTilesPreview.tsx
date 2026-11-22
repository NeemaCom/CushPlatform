import "./_group.css";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  FileText,
  Link2,
  MapPin,
  Plane,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { PassportJourneySteps } from "./PassportJourneySteps";

type Stage = "pre_arrival" | "post_arrival";
type Section = "information" | "documents" | "connections";

const panelTitles: Record<Section, string> = {
  information: "Self-provided information",
  documents: "Document upload",
  connections: "Bank connection",
};

export function JourneyTilesPreview() {
  const [stage, setStage] = useState<Stage>("pre_arrival");
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const postArrival = stage === "post_arrival";
  const steps = [
    {
      key: "information" as const,
      title: "Self-provided information",
      description: postArrival
        ? "UK income, employment, housing and financial history."
        : "Income, employment, housing, savings and commitments.",
      status: postArrival ? "2/8 areas added" : "3/6 areas added",
      icon: FileText,
      step: 1,
      expanded: activeSection === "information",
    },
    {
      key: "documents" as const,
      title: "Document upload",
      description: "Statements, payslips and supporting records.",
      status: "1 submitted",
      icon: Upload,
      step: 2,
      expanded: activeSection === "documents",
    },
    {
      key: "connections" as const,
      title: "Bank connection",
      description: postArrival ? "Review the available UK banking option." : "Choose a bank or credit option when ready.",
      status: "Choose when ready",
      icon: Link2,
      step: 3,
      expanded: activeSection === "connections",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f5ef] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-7">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-700 text-sm font-bold text-white">C</span>
            <span className="text-sm font-bold">Cush Passport</span>
          </div>
          <span className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><ShieldCheck className="h-4 w-4 text-indigo-700" />Your information stays in your control</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Preview data</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-7 sm:py-8">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-700">Your financial identity, in progress</p>
                  <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Build it one step at a time</h1>
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Passport stage">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!postArrival}
                    onClick={() => { setStage("pre_arrival"); setActiveSection(null); }}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${!postArrival ? "bg-indigo-700 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
                  >
                    <Plane className="h-3.5 w-3.5" />Pre-arrival
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={postArrival}
                    onClick={() => { setStage("post_arrival"); setActiveSection(null); }}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${postArrival ? "bg-teal-700 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
                  >
                    <MapPin className="h-3.5 w-3.5" />Post-arrival
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Assessment progress</span><span className="font-bold text-indigo-700">35%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[35%] rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" /></div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">Missing information is excluded, not counted as zero. Saved sections stay available to review.</p>
            </section>

            <section id="passport-journey-options" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label={postArrival ? "Post-arrival steps" : "Pre-arrival steps"}>
              <div className="flex items-start gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${postArrival ? "bg-teal-50 text-teal-700" : "bg-indigo-50 text-indigo-700"}`}>
                  {postArrival ? <MapPin className="h-4 w-4" /> : <Plane className="h-4 w-4" />}
                </span>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${postArrival ? "text-teal-700" : "text-indigo-700"}`}>{postArrival ? "Post-arrival" : "Pre-arrival"}</p>
                  <h2 className="mt-1 text-lg font-bold">{postArrival ? "Build your new financial history" : "Prepare your financial identity"}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{postArrival ? "Add details from your new country as your circumstances change." : "Start with what you know. You can return to any step later."}</p>
                </div>
              </div>
              <PassportJourneySteps
                steps={steps}
                panelId="passport-section-dialog"
                onSelect={setActiveSection}
              />
              <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />Your details stay private unless you choose to share them.
              </p>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl bg-gradient-to-br from-[#2926a5] to-[#5148df] p-5 text-white shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-100">Your next steps</p>
              <h2 className="mt-2 text-lg font-bold">Build your Cush Score</h2>
              <p className="mt-2 text-xs leading-5 text-indigo-50">Add a little information, then decide whether supporting evidence is right for you.</p>
              <button type="button" onClick={() => setActiveSection("information")} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-indigo-800 hover:bg-indigo-50">
                Continue assessment <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-[11px] leading-5 text-indigo-100">No deadline. Pre-arrival and Post-arrival records stay distinct.</p>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-indigo-700" /><h2 className="text-sm font-bold">Confidence</h2></div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Evidence quality is tracked separately from the Cush Score.</p>
            </section>
          </aside>
        </div>
      </main>

      {activeSection && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 p-0 sm:p-3" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setActiveSection(null);
        }}>
          <section
            id="passport-section-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={panelTitles[activeSection]}
            className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-full sm:max-w-xl sm:rounded-2xl"
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-700">{postArrival ? "Post-arrival" : "Pre-arrival"}</p>
                <h2 className="mt-1 text-lg font-bold">{panelTitles[activeSection]}</h2>
              </div>
              <button type="button" onClick={() => setActiveSection(null)} aria-label="Close section" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 sm:p-5">
              {activeSection === "information" && (
                <>
                  {postArrival && (
                    <details className="rounded-xl border border-slate-200 bg-white p-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                        Account holder details <span className="flex items-center gap-2 text-[10px] font-medium text-emerald-700">3 details saved <ChevronDown className="h-4 w-4 text-slate-400" /></span>
                      </summary>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input aria-label="Account holder name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value="Amina Example" readOnly />
                        <input aria-label="Account holder email" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value="amina@example.test" readOnly />
                      </div>
                    </details>
                  )}
                  {[
                    ["Income and employment", "Saved", true],
                    ["Housing and rent", "Add details", false],
                    ["Savings and commitments", "Saved", true],
                  ].map(([title, state, filled]) => (
                    <details key={title as string} className="rounded-xl border border-slate-200 bg-white p-4" open={false}>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                        {title as string}
                        <span className={`text-[10px] font-semibold ${filled ? "text-emerald-700" : "text-slate-500"}`}>{state as string}<ChevronDown className="ml-2 inline h-4 w-4 text-slate-400" /></span>
                      </summary>
                      <p className="mt-3 text-xs leading-5 text-slate-500">Open this section to review or edit your saved details.</p>
                    </details>
                  ))}
                </>
              )}
              {activeSection === "documents" && (
                <>
                  <details className="rounded-xl border border-slate-200 bg-white p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                      Add a supporting document <span className="flex items-center gap-2 text-[10px] font-semibold text-indigo-700">1 on file <ChevronDown className="h-4 w-4" /></span>
                    </summary>
                    <div className="mt-4 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-6 text-center text-sm font-semibold text-slate-700">Choose a PDF or CSV statement</div>
                  </details>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold">October bank statement</p>
                    <p className="mt-1 text-xs text-slate-500">Uploaded privately · Review pending</p>
                  </div>
                </>
              )}
              {activeSection === "connections" && (
                <details className="rounded-xl border border-slate-200 bg-white p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                    {postArrival ? "Connect accounts via Plaid" : "Connect a bank with Mono"}
                    <span className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">Choose when ready <ChevronDown className="h-4 w-4" /></span>
                  </summary>
                  <p className="mt-3 text-xs leading-5 text-slate-500">Review the available connection options and consent before continuing.</p>
                  <button type="button" className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Review connection options</button>
                </details>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
