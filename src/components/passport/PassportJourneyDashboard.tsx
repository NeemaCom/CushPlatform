import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  FileText,
  History,
  Link2,
  MapPin,
  Plane,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import CushVerifyConsentInbox from "@/components/passport/CushVerifyConsentInbox";
import PassportEvidenceIntake from "@/components/passport/PassportEvidenceIntake";
import PassportJourneySteps, { type JourneySection, type PassportJourneyStep } from "@/components/passport/PassportJourneySteps";
import PostArrivalPanel from "@/components/passport/PostArrivalPanel";
import V2AssessmentPanel from "@/components/passport/V2AssessmentPanel";

type PassportSummary = {
  score: number | null;
  provisionalScore: number | null;
  scoreCoveragePercent: number;
  confidenceScore: number | null;
  assessmentStatus: "not_started" | "incomplete" | "provisional" | "complete";
  missingRequirements: string[];
  mode: string;
  lastUpdated: string | null;
};

type Progression = {
  maturityStatus: "getting_started" | "provisional" | "evidence_supported" | "institution_supported";
  sourceTypes: string[];
  preArrival: { completed: number; total: number; percent: number };
  postArrival: { completed: number; total: number; percent: number; activated: boolean };
  documents: { submitted: number; approved: number };
  nextActions: string[];
  historyReady: boolean;
  history: Array<{
    id: number;
    previousScore: number | null;
    score: number | null;
    previousConfidence: number | null;
    confidence: number | null;
    scoreCoveragePercent: number;
    assessmentStatus: string;
    maturityStatus: string;
    sourceTypes: string[];
    changedInformation: string[];
    changeSummary: string;
    createdAt: string;
  }>;
};

type Props = {
  passport: PassportSummary;
  progression?: Progression;
  scoreSummary: ReactNode;
  sharePanel: ReactNode;
  modePending: boolean;
  monoCodePending: boolean;
  onModeChange: (mode: string) => void;
};

const sectionCopy: Record<JourneySection, { title: string; shortTitle: string; description: string }> = {
  information: {
    title: "Individual financial information",
    shortTitle: "Self-provided information",
    description: "Income, employment, housing, savings and commitments.",
  },
  documents: {
    title: "Document submission",
    shortTitle: "Document upload",
    description: "Statements, payslips and supporting evidence.",
  },
  connections: {
    title: "Financial connections",
    shortTitle: "Bank connection",
    description: "Review the available bank and credit options for this stage.",
  },
};

function evidenceSourceLabel(source: string, compact = false) {
  const labels: Record<string, { full: string; short: string }> = {
    self_declared: { full: "self-declared information", short: "self-declared" },
    verified_statement: { full: "reviewed bank statement", short: "reviewed statement" },
    bank_connected: { full: "connected bank data", short: "bank data" },
    credit_history: { full: "credit history", short: "credit history" },
  };
  return labels[source]?.[compact ? "short" : "full"] ?? source.replace(/_/g, " ");
}

export default function PassportJourneyDashboard({
  passport,
  progression,
  scoreSummary,
  sharePanel,
  modePending,
  monoCodePending,
  onModeChange,
}: Props) {
  const isPostArrival = passport.mode === "post_arrival";
  const [activeSection, setActiveSection] = useState<JourneySection | null>(null);
  const [visited, setVisited] = useState({
    preDetails: false,
    preConnections: false,
    postArrival: false,
  });
  const drawerRef = useRef<HTMLElement | null>(null);
  const drawerCloseRef = useRef<HTMLButtonElement | null>(null);
  const section = activeSection ? sectionCopy[activeSection] : null;
  const postArrivalView = activeSection === "documents"
    ? "documents"
    : activeSection === "connections"
      ? "connections"
      : "information";

  useEffect(() => {
    if (!activeSection) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();

    function handleDrawerKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveSection(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const visibleFocusable = Array.from(focusable ?? []).filter((element) =>
        element.getClientRects().length > 0 && !element.closest("[hidden]"),
      );
      if (!visibleFocusable.length) {
        event.preventDefault();
        drawerCloseRef.current?.focus();
        return;
      }
      const first = visibleFocusable[0];
      const last = visibleFocusable[visibleFocusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !drawerRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !drawerRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDrawerKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDrawerKeys);
      previousFocus?.focus();
    };
  }, [activeSection]);

  function openSection(nextSection: JourneySection) {
    setVisited((current) => ({
      preDetails: current.preDetails || (!isPostArrival && nextSection !== "connections"),
      preConnections: current.preConnections || (!isPostArrival && nextSection === "connections"),
      postArrival: current.postArrival || isPostArrival,
    }));
    setActiveSection(nextSection);
  }

  const journeyOptions: Array<{
    key: JourneySection;
    icon: typeof FileText;
    status: string;
    postDescription: string;
  }> = [
    {
      key: "information",
      icon: FileText,
      status: isPostArrival
        ? progression
          ? progression.postArrival.activated
            ? progression.postArrival.percent === 100
              ? "Complete"
              : progression.postArrival.completed
                ? `${progression.postArrival.completed}/${progression.postArrival.total} added`
                : "Start when ready"
            : "Confirm arrival first"
          : "Continue"
        : progression
          ? progression.preArrival.percent === 100
            ? "Complete"
            : progression.preArrival.completed
              ? `${progression.preArrival.completed}/${progression.preArrival.total} added`
              : "Start here"
          : passport.assessmentStatus === "not_started" ? "Start here" : "Continue",
      postDescription: "UK income, employment, housing and financial history.",
    },
    {
      key: "documents",
      icon: Upload,
      status: progression?.documents.approved
        ? `${progression.documents.approved} approved`
        : progression?.documents.submitted
          ? `${progression.documents.submitted} submitted`
          : "Optional",
      postDescription: "Statements, payslips and supporting records.",
    },
    {
      key: "connections",
      icon: Link2,
      status: progression?.sourceTypes.includes("bank_connected")
        ? "Connected"
        : "Choose when ready",
      postDescription: "Available banking options for the UK.",
    },
  ];
  const journeySteps: PassportJourneyStep[] = journeyOptions.map(({ key, icon, status, postDescription }, index) => ({
    key,
    icon,
    status,
    title: sectionCopy[key].shortTitle,
    description: isPostArrival ? postDescription : sectionCopy[key].description,
    step: index + 1,
    expanded: activeSection === key,
  }));

  const drawerTitle = section?.title ?? "Your financial identity";

  function selectStage(mode: "pre_arrival" | "post_arrival") {
    setVisited((current) => mode === "post_arrival"
      ? { ...current, postArrival: true }
      : { ...current, preDetails: true });
    setActiveSection("information");
    onModeChange(mode);
  }

  return (
    <>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Your Cush assessment">
            <div className="grid gap-4 p-4 sm:p-5">
              {scoreSummary}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Choose your stage</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">Build your financial identity, one step at a time</p>
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Passport stage">
                  {[
                    { value: "pre_arrival", label: "Pre-arrival", Icon: Plane },
                    { value: "post_arrival", label: "Post-arrival", Icon: MapPin },
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={passport.mode === value}
                      aria-controls="passport-journey-options"
                      disabled={modePending || passport.mode === value}
                      onClick={() => selectStage(value as "pre_arrival" | "post_arrival")}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        passport.mode === value
                          ? value === "post_arrival"
                            ? "bg-teal-700 text-white shadow-md ring-1 ring-teal-800"
                            : "bg-indigo-700 text-white shadow-md ring-1 ring-indigo-800"
                          : "bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900"
                      } disabled:cursor-default`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {label}
                      {passport.mode === value && <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">Selected</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-600">Assessment progress</span>
                  <span className="font-semibold tabular-nums text-slate-700">{passport.scoreCoveragePercent}%</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label="Scoring criteria coverage"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={passport.scoreCoveragePercent}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-[width]"
                    style={{ width: `${passport.scoreCoveragePercent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                  Missing information is excluded, not counted as zero.
                </p>
                {passport.missingRequirements.length > 0 && (
                  <details className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-semibold text-amber-900">
                      {passport.missingRequirements.length} outstanding {passport.missingRequirements.length === 1 ? "item" : "items"}
                    </summary>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-800">
                      {passport.missingRequirements.map((requirement) => <li key={requirement}>{requirement}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </section>

          <section
            id="passport-journey-options"
            role="tabpanel"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            aria-label={isPostArrival ? "Post-arrival steps" : "Pre-arrival steps"}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                {isPostArrival
                  ? <MapPin className="h-4 w-4" aria-hidden="true" />
                  : <Plane className="h-4 w-4" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-700">
                  {isPostArrival ? "Post-arrival" : "Pre-arrival"}
                </p>
                <h1 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                  {isPostArrival ? "Build your new financial history" : "Prepare your financial identity"}
                </h1>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {isPostArrival
                    ? "Add details from your new country as your circumstances change."
                    : "Start with what you know. You can return to any step later."}
                </p>
              </div>
            </div>
            <PassportJourneySteps
              steps={journeySteps}
              panelId="passport-section-dialog"
              onSelect={openSection}
            />
            <p className="mt-3 flex items-start gap-2 px-1 text-[11px] leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden="true" />
              Your information stays private unless you choose to share it.
            </p>
          </section>
        </main>

        <aside className="space-y-4" aria-label="Next steps and sharing">
          <section className="rounded-2xl bg-gradient-to-br from-[#2926a5] to-[#5148df] p-5 text-white shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-100">Your next steps</p>
            <h2 className="mt-2 text-lg font-bold">
              {isPostArrival ? "Build your UK financial history" : "Build your Cush Score"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-indigo-50">
              {isPostArrival
                ? "Add your UK details or review the available banking options. You can return to Pre-arrival at any time."
                : "Add your financial information, then decide whether documents or connections are right for you."}
            </p>
            <button
              type="button"
              onClick={() => openSection("information")}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {isPostArrival ? "Add details" : "Continue assessment"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="mt-3 text-[11px] leading-5 text-indigo-100">
              No deadline. Your Pre-arrival and Post-arrival records stay distinct.
            </p>
          </section>

          {progression && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Financial identity progress">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Your journey</p>
                  <h2 className="mt-1 text-sm font-bold text-slate-900">Financial identity progress</h2>
                </div>
                <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-800">
                  {{
                    getting_started: "Getting started",
                    provisional: "Provisional",
                    evidence_supported: "Evidence-supported",
                    institution_supported: "Institution-supported",
                  }[progression.maturityStatus]}
                </span>
              </div>
              {progression.sourceTypes.length > 0 && (
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  Current sources: {progression.sourceTypes.map((source) => evidenceSourceLabel(source)).join(" · ")}
                </p>
              )}
              <ol className="mt-3 space-y-2.5">
                <li className="flex items-start gap-2.5 text-xs">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700">1</span>
                  <span><strong className="text-slate-800">Pre-arrival</strong><span className="block text-slate-500">{progression.preArrival.completed}/{progression.preArrival.total} profile areas</span></span>
                </li>
                <li className="flex items-start gap-2.5 text-xs">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-50 text-[10px] font-bold text-violet-700">2</span>
                  <span><strong className="text-slate-800">Supporting evidence</strong><span className="block text-slate-500">{progression.documents.approved} reviewed · {progression.documents.submitted} submitted</span></span>
                </li>
                <li className="flex items-start gap-2.5 text-xs">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-50 text-[10px] font-bold text-teal-700">3</span>
                  <span>
                    <strong className="text-slate-800">Post-arrival</strong>
                    <span className="block text-slate-500">
                      {progression.postArrival.activated
                        ? `${progression.postArrival.completed}/${progression.postArrival.total} profile areas`
                        : "Ready when you confirm arrival"}
                    </span>
                  </span>
                </li>
              </ol>
              <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-500">
                Score reflects financial information, not milestone completion. Confidence is measured separately.
              </p>
              {progression.nextActions.length > 0 && (
                <details className="mt-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-amber-900">Ways to strengthen your assessment</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-900">
                    {progression.nextActions.slice(0, 3).map((action) => <li key={action}>{action}</li>)}
                  </ul>
                </details>
              )}
              <details className="mt-2 rounded-lg border border-slate-100 px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-slate-700">
                  <History className="h-3.5 w-3.5" aria-hidden="true" />Assessment history
                </summary>
                {!progression.historyReady ? (
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">A database update is needed before the assessment timeline can be saved.</p>
                ) : progression.history.length === 0 ? (
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">Your first saved assessment will appear here.</p>
                ) : (
                  <ol className="mt-2 space-y-3">
                    {progression.history.slice(0, 5).map((item) => (
                      <li key={item.id} className="border-l-2 border-indigo-100 pl-3">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <strong className="text-slate-800">
                            {item.score === null
                              ? "Score pending"
                              : `Score ${item.score}/1,000${item.previousScore === null ? "" : ` · from ${item.previousScore}`}`}
                          </strong>
                          <time className="shrink-0 text-slate-400" dateTime={item.createdAt}>
                            {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </time>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {item.confidence === null
                            ? "Confidence pending"
                            : `Confidence ${item.confidence}/100${item.previousConfidence === null ? "" : ` · from ${item.previousConfidence}`}`}
                          {" · "}{item.scoreCoveragePercent}% score coverage
                        </p>
                        {item.sourceTypes.length > 0 && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            Evidence on file: {item.sourceTypes.map((source) => evidenceSourceLabel(source, true)).join(" · ")}
                          </p>
                        )}
                        {item.changedInformation.length > 0 && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            Updated: {item.changedInformation.join(" · ")}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] leading-5 text-slate-600">{item.changeSummary}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </details>
            </section>
          )}

          <CushVerifyConsentInbox />
          {sharePanel}
          {passport.lastUpdated && (
            <p className="text-center text-xs text-slate-400">
              Last updated {new Date(passport.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </aside>
      </div>

      <div
        className={activeSection ? "fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]" : "hidden"}
        aria-hidden={!activeSection}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setActiveSection(null);
        }}
      >
        <section
          ref={drawerRef}
          id="passport-section-dialog"
          role={activeSection ? "dialog" : undefined}
          aria-modal={activeSection ? "true" : undefined}
          aria-labelledby="passport-drawer-title"
          aria-describedby="passport-drawer-description"
          className="absolute inset-0 flex h-[100dvh] flex-col overflow-hidden bg-white shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[min(600px,calc(100vw-24px))] sm:border-l sm:border-slate-200"
        >
          <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-700">
                {isPostArrival ? "Post-arrival" : "Pre-arrival"} · Your information stays yours
              </p>
              <h2 id="passport-drawer-title" className="mt-1 truncate text-lg font-bold text-slate-900">
                {drawerTitle}
              </h2>
              <p id="passport-drawer-description" className="mt-1 text-xs text-slate-500">
                Save as you go. Your information remains here when you switch sections.
              </p>
            </div>
            <button
              ref={drawerCloseRef}
              type="button"
              onClick={() => setActiveSection(null)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Close section"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-3 sm:p-5">
            {visited.preDetails && (
              <div hidden={isPostArrival || activeSection === "connections"}>
                <PassportEvidenceIntake
                  period="pre_arrival"
                  view={activeSection === "documents" ? "documents" : "profile"}
                  onSaved={activeSection === "information" ? () => setActiveSection(null) : undefined}
                  onApplyExtractedFacts={() => setActiveSection("information")}
                />
              </div>
            )}
            {visited.preConnections && (
              <div hidden={isPostArrival || activeSection !== "connections"}>
                {monoCodePending && (
                  <p className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800" role="status">
                    Finishing your Mono bank connection…
                  </p>
                )}
                <V2AssessmentPanel />
              </div>
            )}
            {visited.postArrival && (
              <div hidden={!isPostArrival}>
                <PostArrivalPanel
                  view={postArrivalView}
                  onApplyExtractedFacts={() => setActiveSection("information")}
                />
              </div>
            )}
            {!activeSection && <span className="sr-only">Choose a dashboard section to begin.</span>}
          </div>
        </section>
      </div>
    </>
  );
}
