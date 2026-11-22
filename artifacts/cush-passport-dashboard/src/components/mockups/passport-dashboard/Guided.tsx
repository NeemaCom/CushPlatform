import "./_group.css";
import { useState } from "react";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Building2, Check, ChevronDown, ChevronRight,
  CircleHelp, Clock3, FileText, Link2, LockKeyhole, MapPin, Plane, Plus,
  ShieldCheck, Sparkles, Upload, X,
} from "lucide-react";

type Stage = "pre" | "post";
type Path = "info" | "documents" | "connections";

const paths: { id: Path; title: string; description: string; icon: typeof FileText; count: string }[] = [
  { id: "info", title: "Financial information", description: "Share the essentials, at your pace.", icon: FileText, count: "3 of 6 details" },
  { id: "documents", title: "Documents", description: "Add evidence when you’re ready.", icon: Upload, count: "1 document" },
  { id: "connections", title: "Bank & credit connections", description: "Choose what you’d like to connect.", icon: Link2, count: "Not started" },
];

const preFields = [
  { key: "country", label: "Current country", value: "Nigeria" },
  { key: "currency", label: "Currency", value: "NGN — Nigerian Naira" },
  { key: "employment", label: "Employment status", value: "Employed" },
  { key: "employer", label: "Employer", value: "Example employer" },
  { key: "income", label: "Monthly income", value: "₦450,000" },
  { key: "housing", label: "Housing arrangement", value: "Renting" },
  { key: "housingCost", label: "Monthly housing cost", value: "₦120,000" },
  { key: "savings", label: "Savings", value: "₦900,000" },
];
const postFields = [
  { key: "location", label: "Current location", value: "Manchester, UK" },
  { key: "arrival", label: "Arrival date", value: "12 Nov 2026" },
  { key: "employment", label: "Employment status", value: "Employed" },
  { key: "employer", label: "Employer", value: "Example employer" },
  { key: "income", label: "Monthly income received", value: "£2,150" },
  { key: "housing", label: "Accommodation", value: "Renting" },
];

export function Guided() {
  const [stage, setStage] = useState<Stage>("pre");
  const [openPath, setOpenPath] = useState<Path | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({
    country: "Nigeria", currency: "NGN — Nigerian Naira", employment: "Employed",
    employer: "Example employer", income: "₦450,000", housing: "Renting",
    housingCost: "₦120,000", savings: "₦900,000", history: "",
    location: "Manchester, UK", arrival: "12 Nov 2026",
  });
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [toast, setToast] = useState("");
  const currentFields = stage === "pre" ? preFields : postFields;
  const stageLabel = stage === "pre" ? "Pre-arrival" : "Post-arrival";

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const updateField = (key: string, value: string) => setFields((old) => ({ ...old, [key]: value }));

  const renderForm = () => {
    if (!openPath) return null;
    const active = paths.find((item) => item.id === openPath)!;
    const ActiveIcon = active.icon;
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17263f]/35 sm:items-stretch sm:justify-end" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpenPath(null);
      }}>
        <section className="guided-drawer flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[24px] bg-[#fffefa] shadow-2xl sm:my-3 sm:mr-3 sm:max-h-[calc(100dvh-24px)] sm:w-[min(540px,calc(100vw-24px))] sm:rounded-[22px]" role="dialog" aria-modal="true" aria-label={active.title}>
          <header className="flex items-center justify-between border-b border-[#e9e8df] px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <button onClick={() => setOpenPath(null)} className="grid h-9 w-9 place-items-center rounded-full border border-[#e5e5dc] text-[#647084] hover:bg-[#f5f4ed]" aria-label="Close form"><ArrowLeft size={17} /></button>
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#737b91]">{stageLabel} · Step 1 of 3</p><h2 className="mt-0.5 text-lg font-semibold text-[#25294e]">{active.title}</h2></div>
            </div>
            <button onClick={() => setOpenPath(null)} className="grid h-9 w-9 place-items-center rounded-full text-[#738583] hover:bg-[#f2f1ea]" aria-label="Close"><X size={18} /></button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-7">
            <div className="mb-6 rounded-xl bg-[#f1f4ed] p-4">
              <div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#5148df]"><ActiveIcon size={18} /></span><p className="text-sm leading-5 text-[#586274]">A few details can help shape your assessment. You can leave anything blank and come back later.</p></div>
            </div>
            {openPath === "info" && <>
              <div className="grid gap-4 sm:grid-cols-2">
                {currentFields.map(({ key, label, value }) => <label key={key} className="block text-xs font-semibold text-[#596176]">{label}
                  <input value={fields[key] ?? value} onChange={(e) => updateField(key, e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#ddded4] bg-white px-3 text-sm font-medium text-[#2b3046] outline-none focus:border-[#5148df] focus:ring-2 focus:ring-[#e4e2fb]" />
                </label>)}
              </div>
              <label className="mt-4 block text-xs font-semibold text-[#596176]">Financial history or context <span className="font-normal text-[#87918a]">Optional</span>
                <textarea value={fields.history} onChange={(e) => updateField("history", e.target.value)} placeholder="Anything you’d like us to understand about your financial history?" className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-[#ddded4] bg-white p-3 text-sm font-normal text-[#2b3046] outline-none focus:border-[#5148df] focus:ring-2 focus:ring-[#e4e2fb]" />
              </label>
              <p className="mt-3 flex gap-2 text-xs leading-5 text-[#74817c]"><CircleHelp size={15} className="mt-0.5 shrink-0" />Your original currency is retained. Self-declared details are not independently verified.</p>
            </>}
            {openPath === "documents" && <>
              <div className="rounded-2xl border border-dashed border-[#c6c7dc] bg-[#f7f7fa] px-5 py-8 text-center">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#5148df]"><Upload size={19} /></span>
                <p className="mt-3 text-sm font-semibold text-[#294644]">Choose a document</p>
                <p className="mt-1 text-xs text-[#75837d]">PDF or CSV statement. You can add country, currency and evidence type next.</p>
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#d9d8e7] bg-white px-4 py-2.5 text-xs font-semibold text-[#39347f] hover:bg-[#f7f7fb]"><Plus size={14} />Browse files<input type="file" accept=".pdf,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && showToast(`${e.target.files[0].name} selected for this preview`)} /></label>
              </div>
              <div className="mt-5 rounded-xl border border-[#e5e6dd] bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#84918a]">Illustrative example</p>
                <div className="mt-3 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#eff3ed] text-[#56786d]"><FileText size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#294644]">Bank statement · Nov 2026</p><p className="mt-0.5 text-xs text-[#84918a]">Example item · not uploaded</p></div><span className="rounded-full bg-[#f4f1df] px-2.5 py-1 text-[10px] font-semibold text-[#88733c]">Under review</span></div>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#75837d]">Adding a document here only updates this preview. No file is uploaded or saved.</p>
            </>}
            {openPath === "connections" && <>
              <div className="space-y-3">
                <article className="rounded-2xl border border-[#e4e5dc] bg-white p-4">
                <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#efeff9] text-[#5148df]"><Building2 size={18} /></span><div className="flex-1"><h3 className="text-sm font-semibold text-[#303451]">Bank information</h3><p className="mt-1 text-xs leading-5 text-[#76808d]">You may choose to connect a bank or add statements as documents. No bank connection is available in this preview.</p></div></div>
                  <button onClick={() => showToast("Bank connection is not available in this preview")} className="mt-4 w-full rounded-xl border border-[#d9d8e7] py-2.5 text-xs font-semibold text-[#39347f] hover:bg-[#f7f7fb]">Connection unavailable in preview</button>
                </article>
                <article className="rounded-2xl border border-[#e4e5dc] bg-white p-4">
                <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f2f1e8] text-[#74679e]"><BadgeCheck size={18} /></span><div className="flex-1"><h3 className="text-sm font-semibold text-[#303451]">Credit Check</h3><p className="mt-1 text-xs leading-5 text-[#76808d]">A separate consent step may be required. This preview does not request or run a credit check.</p></div></div>
                  <button onClick={() => showToast("No consent or credit check is initiated in this preview")} className="mt-4 w-full rounded-xl border border-[#e1dfd2] py-2.5 text-xs font-semibold text-[#746a4d] hover:bg-[#faf9f4]">View information</button>
                </article>
              </div>
              <div className="mt-5 flex gap-2 rounded-xl bg-[#f5f4ed] p-3 text-xs leading-5 text-[#6b7b74]"><LockKeyhole size={15} className="mt-0.5 shrink-0" />You choose what to share. No integrations are active in this mockup.</div>
            </>}
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-[#e9e8df] bg-[#fffefa] px-5 py-4 sm:px-7">
            <button onClick={() => setOpenPath(null)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#657773] hover:bg-[#f4f3ec]">Close</button>
            <button onClick={() => { setOpenPath(null); showToast("Preview only — your changes haven’t been saved"); }} className="inline-flex items-center gap-2 rounded-xl bg-[#342ca8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2926a5]">Done for now<Check size={15} /></button>
          </footer>
        </section>
      </div>
    );
  };

  return (
    <div className="guided-root min-h-[100dvh] bg-[#f6f5ef] text-[#203b39]">
      <header className="sticky top-0 z-20 border-b border-[#e9e8df] bg-[#fbfaf6]/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1180px] items-center justify-between px-4 sm:h-[62px] sm:px-7">
          <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[#342ca8] text-sm font-bold text-white">c</span><span className="text-sm font-bold tracking-[-.03em] text-[#303451]">Cush <span className="font-medium text-[#75808c]">Passport</span></span></div>
          <div className="hidden items-center gap-2 text-xs text-[#75808c] sm:flex"><ShieldCheck size={15} className="text-[#5148df]" />Your information stays in your control</div>
          <button className="flex items-center gap-2 rounded-full border border-[#e7e6dc] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#516761]" onClick={() => showToast("Account menu is illustrative")}><span className="grid h-6 w-6 place-items-center rounded-full bg-[#e8eee6] text-[10px] font-bold text-[#42655b]">SA</span><span className="hidden sm:inline">Sam’s account</span><ChevronDown size={13} /></button>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pb-12 pt-3 sm:px-7 sm:pt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
          <div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#72847b] sm:text-[10px] sm:tracking-[.19em]">Your financial identity, in progress</p><h1 className="mt-1 text-[22px] font-semibold tracking-[-.045em] text-[#1e3b38] sm:mt-1.5 sm:text-[32px]"><span className="sm:hidden">A steadier start.</span><span className="hidden sm:inline">A steadier start, wherever you’re headed.</span></h1><p className="mt-1.5 hidden max-w-2xl text-sm text-[#71807a] sm:block">Build your assessment before you move. Keep adding context when you arrive.</p></div>
          <span className="hidden rounded-full border border-[#e4e2d6] bg-[#fbfaf6] px-3 py-1.5 text-[10px] font-semibold text-[#7b867e] sm:inline-flex">Illustrative example data</span>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-[20px] border border-[#e7e6dc] bg-[#fffefa] shadow-[0_4px_20px_rgba(39,63,57,.035)]">
              <div className="grid sm:grid-cols-[205px_minmax(0,1fr)]">
                <div className="flex items-center gap-3 border-b border-[#eeede5] px-4 py-2.5 sm:gap-4 sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r sm:px-6 sm:py-6">
                  <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full sm:h-[82px] sm:w-[82px]" style={{ background: "conic-gradient(#5148df 0 68%, #e7e7df 68% 100%)" }}>
                    <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-[#fffefa] sm:h-[68px] sm:w-[68px]"><div className="text-center"><p className="text-[20px] font-semibold leading-none tracking-[-.06em] text-[#342ca8] sm:text-[25px]">680</p><p className="mt-0.5 text-[7px] font-bold tracking-[.11em] text-[#858a98] sm:mt-1 sm:text-[8px]">/ 1,000</p></div></div>
                  </div>
                  <div><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#5148df] sm:text-[10px] sm:tracking-[.15em]">Cush Score</p><p className="mt-0.5 text-[11px] text-[#78818d] sm:mt-1 sm:text-xs">Provisional assessment</p><div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#f2f1e5] px-2 py-0.5 text-[9px] font-semibold text-[#786b45] sm:mt-2.5 sm:px-2.5 sm:py-1 sm:text-[10px]"><Clock3 size={10} />In progress</div></div>
                </div>
                <div className="p-3 sm:px-6 sm:py-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                    <div className="hidden sm:block"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#858a98]">Choose your stage</p><p className="mt-1 text-sm font-semibold text-[#303451]">Your journey, one step at a time</p></div>
                    <div className="flex w-full rounded-xl bg-[#f1f1e9] p-1 sm:w-fit" role="tablist" aria-label="Journey stage">
                      <button role="tab" aria-selected={stage === "pre"} onClick={() => setStage("pre")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors sm:flex-none sm:px-3 ${stage === "pre" ? "bg-white text-[#342ca8] shadow-sm" : "text-[#7c8390] hover:text-[#5148df]"}`}><Plane size={13} />Pre-arrival</button>
                      <button role="tab" aria-selected={stage === "post"} onClick={() => setStage("post")} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors sm:flex-none sm:px-3 ${stage === "post" ? "bg-white text-[#342ca8] shadow-sm" : "text-[#7c8390] hover:text-[#5148df]"}`}><MapPin size={13} />Post-arrival</button>
                    </div>
                  </div>
                  <div className="mt-2 rounded-xl bg-[#f4f5ef] p-2.5 sm:mt-5 sm:p-3.5">
                    <div className="flex items-center justify-between text-xs"><span className="font-semibold text-[#596176]">Assessment progress</span><span className="font-bold text-[#342ca8]">35%</span></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e4e3f1]"><div className="h-full w-[35%] rounded-full bg-[#5148df]" /></div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1 sm:mt-3 sm:gap-2"><span className="text-[11px] text-[#78818d]">Confidence <strong className="ml-1 text-[#5148df]">48 / 100</strong></span><span className="text-[9px] text-[#858a98] sm:text-[10px]">Evidence quality · separate from Score</span></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[20px] border border-[#e7e6dc] bg-[#fffefa] p-3 shadow-[0_4px_20px_rgba(39,63,57,.035)] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#efeff9] text-[#5148df]">{stage === "pre" ? <Plane size={14} /> : <MapPin size={14} />}</span><span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#5148df]">{stageLabel}</span></div><h2 className="mt-1.5 text-base font-semibold tracking-[-.025em] text-[#303451] sm:mt-2 sm:text-lg">{stage === "pre" ? "Get the foundations in place" : "Settle in, then update your picture"}</h2><p className="mt-1 text-[11px] leading-4 text-[#75808d] sm:text-xs sm:leading-5">{stage === "pre" ? "Choose a path to begin. You can move between them whenever you like." : "Add details that reflect life after arrival. Nothing here needs to be completed all at once."}</p></div>
                <button className="hidden items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#73847a] hover:bg-[#f3f3eb] sm:flex" onClick={() => showToast("Your progress is illustrative in this preview")}><CircleHelp size={13} />How this works</button>
              </div>
              <div className="mt-4 space-y-2.5">
                {paths.map(({ id, title, description, icon: Icon, count }, index) => (
                  <button key={id} onClick={() => setOpenPath(id)} className="group flex w-full items-center gap-3 rounded-[15px] border border-[#e8e8df] bg-white p-3 text-left transition-colors hover:border-[#c5d3c6] hover:bg-[#fbfcf8] sm:gap-4 sm:px-4 sm:py-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#efeff9] text-[#5148df]"><Icon size={18} /></span>
                    <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-[#303451]">{title}</span>{index === 0 && stage === "pre" && <span className="rounded-full bg-[#f4f1e4] px-2 py-0.5 text-[9px] font-semibold text-[#85764e]">Suggested first</span>}</span><span className="mt-1 block text-xs text-[#7c8390]">{description}</span></span>
                    <span className="hidden text-[10px] text-[#87928a] sm:block">{count}</span><ChevronRight size={17} className="shrink-0 text-[#99a69b] transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
              <p className="mt-3 flex items-start gap-2 px-1 text-[10px] leading-4 text-[#8a938b]"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-[#829788]" />Your details are not shared by completing these steps. Missing information is not treated as a zero.</p>
            </section>

            <section className="rounded-[18px] border border-[#e7e6dc] bg-[#fffefa] px-4 py-4 sm:px-5">
              <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f1f0fa] text-[#74679e]"><Sparkles size={17} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#303451]">Small steps count</p><p className="mt-1 text-xs leading-5 text-[#78818d]">An assessment can grow with you. Add what you know now, and revisit it after your move.</p></div></div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[19px] bg-gradient-to-br from-[#2926a5] to-[#5148df] p-5 text-white shadow-[0_8px_24px_rgba(52,44,168,.14)]">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#e0defb]">Your next steps</p><h2 className="mt-2 text-lg font-semibold tracking-[-.02em]">Build your Cush Score</h2><p className="mt-2 text-xs leading-5 text-[#eeedff]">Add a little information, then decide whether supporting evidence is right for you.</p>
              <button onClick={() => setOpenPath("info")} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-[#2926a5] hover:bg-[#f2f1ff]">Continue assessment<ArrowRight size={14} /></button>
              <p className="mt-3 text-[10px] leading-4 text-[#e0defb]">No deadline. Missing inputs are excluded, not counted as zero.</p>
            </section>

            <section className="overflow-hidden rounded-[18px] border border-[#e4e4d9] bg-[#fffefa]">
              <button onClick={() => setVerifyOpen(!verifyOpen)} aria-expanded={verifyOpen} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[#fbfbf7]">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#efeff9] text-[#5148df]"><ShieldCheck size={17} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#303451]">Cush Verify requests</span><span className="mt-0.5 block text-[10px] text-[#858a98]">No pending requests</span></span>
                <ChevronDown size={16} className={`text-[#859188] transition-transform ${verifyOpen ? "rotate-180" : ""}`} />
              </button>
              {verifyOpen && <div className="border-t border-[#efeee7] px-4 pb-4 pt-3"><div className="rounded-xl bg-[#f6f6f0] p-3.5"><p className="text-xs font-semibold text-[#4b4a70]">Nothing to review right now</p><p className="mt-1.5 text-[11px] leading-5 text-[#7d8491]">If a request appears, review its institution, purpose, requested categories and access period before deciding. Nothing is shared in this preview.</p></div><button onClick={() => showToast("No requests are available in this preview")} className="mt-3 text-[10px] font-semibold text-[#5148df] hover:underline">About requests</button></div>}
            </section>
            <p className="flex items-center justify-center gap-1.5 px-2 text-[10px] text-[#8b958c]"><LockKeyhole size={12} />Private by default · You stay in control</p>
          </aside>
        </div>
      </main>

      {toast && <div role="status" className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-[#2926a5] px-4 py-3 text-xs font-medium text-white shadow-xl">{toast}</div>}
      {renderForm()}
    </div>
  );
}
