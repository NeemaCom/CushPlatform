import "./_group.css";
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  FileText,
  Link2,
  MapPin,
  Plane,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";

const fieldClass =
  "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm";

export function Current() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">C</span>
          <span className="text-sm font-bold tracking-tight">Cush Passport</span>
        </div>
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-semibold">SA</span>
          Account
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold">Cush Verify requests</h2>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">1 needs your decision</span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    Review the institution, purpose, categories, and access period before sharing.
                  </p>
                </div>
              </div>
              <article className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="text-sm font-semibold">Sample Housing Provider</p>
                      <p className="mt-1 text-xs text-slate-500">Requested 20 Nov 2026 · 30 days</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"><Clock3 className="h-3.5 w-3.5" />Pending</span>
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stated purpose</p>
                  <p className="mt-1 text-sm text-slate-700">Assess a rental application</p>
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-600">Requested categories</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Income & employment", "Rent & housing", "Score summary"].map((item) => (
                    <span key={item} className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-800"><Check className="h-3 w-3" />{item}</span>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white">Review request</button>
                  <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Decline</button>
                </div>
              </article>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="p-5 sm:p-7">
                <div className="flex flex-col items-center gap-7 sm:flex-row">
                  <div className="flex w-full shrink-0 flex-col items-center gap-3 sm:w-56">
                    <div className="text-center">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">Cush Score</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Your current assessment</p>
                    </div>
                    <div className="relative grid h-44 w-44 place-items-center rounded-full border-[12px] border-amber-300 bg-white">
                      <div className="text-center">
                        <p className="text-5xl font-extrabold tracking-tight">680</p>
                        <p className="mt-1 text-[10px] font-semibold tracking-wide text-slate-500">OUT OF 1,000</p>
                        <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">Provisional</span>
                      </div>
                    </div>
                    <div className="w-full rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-indigo-700" /><span className="text-xs font-bold">Confidence</span></div>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">Medium</span>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-indigo-100"><div className="h-full w-[48%] rounded-full bg-indigo-500" /></div>
                      <p className="mt-2 text-[10px] text-slate-500">48/100 · Evidence quality</p>
                    </div>
                  </div>
                  <div className="w-full flex-1 space-y-5">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Migration Mode</p>
                      <div className="flex w-fit gap-1 rounded-xl bg-slate-100 p-1">
                        <button className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold shadow-sm"><Plane className="h-3.5 w-3.5" />Pre-Arrival</button>
                        <button className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-slate-500"><MapPin className="h-3.5 w-3.5" />Post-Arrival</button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><p className="text-sm font-semibold text-amber-900">Provisional assessment</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-800"><li>Complete your financial profile</li><li>Connect a bank account</li><li>Complete the required Credit Check</li></ul></div></div>
                    </div>
                    <div className="border-t border-slate-100 pt-4">
                      <div className="mb-2 flex justify-between text-xs"><span className="font-semibold text-slate-600">Assessment progress</span><span className="text-slate-400">35%</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[35%] rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-500" /></div>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Your score updates as supported information is reviewed. Missing information is not treated as a zero.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div><h2 className="text-base font-bold">Financial profile</h2><p className="mt-1 text-xs leading-5 text-slate-500">Add information from your current country. Your original currency is retained.</p></div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">Pre-arrival</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-600">Country<select className={fieldClass}><option>Nigeria</option></select></label>
                <label className="text-xs font-medium text-slate-600">Currency<select className={fieldClass}><option>NGN — Nigerian Naira</option></select></label>
                <label className="text-xs font-medium text-slate-600">Employment status<select className={fieldClass}><option>Employed</option></select></label>
                <label className="text-xs font-medium text-slate-600">Employer<input className={fieldClass} value="Example employer" readOnly /></label>
                <label className="text-xs font-medium text-slate-600">Monthly income<input className={fieldClass} value="₦450,000" readOnly /></label>
                <label className="text-xs font-medium text-slate-600">Housing arrangement<select className={fieldClass}><option>Renting</option></select></label>
                <label className="text-xs font-medium text-slate-600">Monthly housing cost<input className={fieldClass} value="₦120,000" readOnly /></label>
                <label className="text-xs font-medium text-slate-600">Savings<input className={fieldClass} value="₦900,000" readOnly /></label>
              </div>
              <label className="block text-xs font-medium text-slate-600">Financial history or context<textarea className="mt-1.5 min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Add relevant context about your financial history." /></label>
              <div className="flex flex-wrap gap-2"><button className="rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">Save details</button><button className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Clear profile</button></div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold">Documents and evidence</h2><p className="mt-1 text-xs leading-5 text-slate-500">Upload supported documents for review. Self-declared information is not verified.</p></div><FileText className="h-5 w-5 text-indigo-600" /></div>
              <div className="mt-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center"><Upload className="mx-auto h-5 w-5 text-slate-500" /><p className="mt-2 text-sm font-semibold">Choose a PDF or CSV statement</p><p className="mt-1 text-xs text-slate-500">Select country, currency, and evidence type after upload.</p><button className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Browse files</button></div>
              <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-100 p-3 text-xs"><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" />Bank statement · Nov 2026</span><span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Under review</span></div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold">Financial assessment</h2>
              <p className="mt-1 text-xs text-slate-500">Review connected financial information alongside your self-declared details above.</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><Link2 className="h-4 w-4" /></span><div><p className="text-sm font-semibold">Connect your bank</p><p className="text-xs text-slate-500">Import statements to support your profile</p></div><button className="ml-auto rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Connect</button></div></div>
                <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-50 text-teal-700"><BadgeCheck className="h-4 w-4" /></span><div><p className="text-sm font-semibold">Credit Check</p><p className="text-xs text-slate-500">Separate consent required</p></div><button className="ml-auto rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Review</button></div></div>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="space-y-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
              <div className="flex items-center gap-3"><Link2 className="h-5 w-5 text-blue-300" /><div><p className="text-sm font-bold">Share Your Passport</p><p className="text-xs text-slate-400">Generate a secure link for landlords and lenders</p></div></div>
              <p className="text-xs leading-relaxed text-slate-400">Viewers can review your assessment status and listed evidence without seeing raw document contents.</p>
              <div className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-xs text-slate-300"><span className="flex items-center gap-2"><Eye className="h-3.5 w-3.5" />Private link</span><Copy className="h-3.5 w-3.5" /></div>
              <button className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold">Generate Passport Link</button>
            </section>
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold">Assessment overview</h3>
              <div className="grid grid-cols-2 gap-3">
                {[["680","Cush Score","/ 1000"],["48/100","Confidence","Evidence quality"],["Pre","Mode","Arrival"],["35%","Progress","Assessment"]].map(([value,label,sub]) => <div key={label} className="rounded-xl bg-slate-50 p-3 text-center"><p className="text-xl font-black text-indigo-700">{value}</p><p className="text-[10px] text-slate-400">{sub}</p><p className="mt-0.5 text-xs text-slate-500">{label}</p></div>)}
              </div>
            </section>
            <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#2926a5] to-[#5148df] p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100">Your next steps</p>
              <h3 className="mt-2 text-lg font-bold">Build your Cush Score</h3>
              <p className="mt-2 text-sm leading-relaxed text-indigo-50">Connect a bank for statements and complete the required Credit Check. Your score updates as supported information is reviewed.</p>
              <button className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#2926a5]">Open assessment <ChevronRight className="h-4 w-4" /></button>
              <p className="mt-3 text-xs text-indigo-100">Missing inputs are excluded from your provisional score.</p>
            </section>
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400"><Users className="h-3.5 w-3.5" />Last updated 20 Nov 2026 <ArrowUpRight className="h-3 w-3" /></p>
          </aside>
        </div>
      </main>
    </div>
  );
}
