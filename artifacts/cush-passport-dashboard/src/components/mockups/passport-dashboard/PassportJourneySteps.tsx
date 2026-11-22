import { CheckCircle2, ChevronDown, type LucideIcon } from "lucide-react";

type Section = "information" | "documents" | "connections";

type Step = {
  key: Section;
  title: string;
  description: string;
  status: string;
  icon: LucideIcon;
  step: number;
  expanded: boolean;
};

const stepStyles: Record<Section, {
  idle: string;
  active: string;
  icon: string;
  accentBar: string;
  footer: string;
  status: string;
}> = {
  information: {
    idle: "border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/70 shadow-[0_3px_16px_rgba(79,70,229,0.12)] hover:border-indigo-300 hover:shadow-[0_8px_24px_rgba(79,70,229,0.24)]",
    active: "border-indigo-400 bg-gradient-to-br from-indigo-100/90 via-indigo-50/80 to-sky-50 shadow-[0_0_0_1px_rgba(79,70,229,0.14),0_0_24px_rgba(79,70,229,0.28)]",
    icon: "bg-indigo-100 text-indigo-700 shadow-[0_0_12px_rgba(79,70,229,0.20)] group-hover:shadow-[0_0_16px_rgba(79,70,229,0.32)]",
    accentBar: "bg-indigo-500 shadow-[0_0_12px_rgba(79,70,229,0.70)]",
    footer: "border-indigo-200/80 text-indigo-800",
    status: "bg-indigo-100 text-indigo-800",
  },
  documents: {
    idle: "border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/70 shadow-[0_3px_16px_rgba(124,58,237,0.12)] hover:border-violet-300 hover:shadow-[0_8px_24px_rgba(124,58,237,0.24)]",
    active: "border-violet-400 bg-gradient-to-br from-violet-100/90 via-violet-50/80 to-fuchsia-50 shadow-[0_0_0_1px_rgba(124,58,237,0.14),0_0_24px_rgba(124,58,237,0.28)]",
    icon: "bg-violet-100 text-violet-700 shadow-[0_0_12px_rgba(124,58,237,0.20)] group-hover:shadow-[0_0_16px_rgba(124,58,237,0.32)]",
    accentBar: "bg-violet-500 shadow-[0_0_12px_rgba(124,58,237,0.70)]",
    footer: "border-violet-200/80 text-violet-800",
    status: "bg-violet-100 text-violet-800",
  },
  connections: {
    idle: "border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/70 shadow-[0_3px_16px_rgba(13,148,136,0.12)] hover:border-teal-300 hover:shadow-[0_8px_24px_rgba(13,148,136,0.24)]",
    active: "border-teal-400 bg-gradient-to-br from-teal-100/90 via-teal-50/80 to-cyan-50 shadow-[0_0_0_1px_rgba(13,148,136,0.14),0_0_24px_rgba(13,148,136,0.28)]",
    icon: "bg-teal-100 text-teal-700 shadow-[0_0_12px_rgba(13,148,136,0.20)] group-hover:shadow-[0_0_16px_rgba(13,148,136,0.32)]",
    accentBar: "bg-teal-500 shadow-[0_0_12px_rgba(13,148,136,0.70)]",
    footer: "border-teal-200/80 text-teal-800",
    status: "bg-teal-100 text-teal-800",
  },
};

export function PassportJourneySteps({
  steps,
  panelId,
  onSelect,
}: {
  steps: Step[];
  panelId: string;
  onSelect: (section: Section) => void;
}) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {steps.map(({ key, title, description, status, icon: Icon, step, expanded }) => {
        const isComplete = status === "Complete" || status === "Connected" || status.endsWith("approved");
        const colors = stepStyles[key];
        return (
          <button
            key={key}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => onSelect(key)}
            className={`group relative flex min-h-[140px] w-full flex-col items-start overflow-hidden rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none sm:p-4 ${
              expanded ? colors.active : colors.idle
            }`}
          >
            <span aria-hidden="true" className={`pointer-events-none absolute inset-x-4 top-0 h-0.5 rounded-b-full ${colors.accentBar}`} />
            <span className="flex w-full items-center justify-between gap-2">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${colors.icon}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                isComplete ? "bg-emerald-50 text-emerald-700" : colors.status
              }`}>
                {isComplete && <CheckCircle2 className="mr-1 inline h-3 w-3" aria-hidden="true" />}
                {status}
              </span>
            </span>
            <span className="mt-3 block text-sm font-semibold text-slate-900">{title}</span>
            <span className="mt-1 block flex-1 text-xs leading-5 text-slate-600">{description}</span>
            <span className={`mt-3 flex w-full items-center justify-between border-t pt-2 text-[10px] font-semibold ${colors.footer}`}>
              <span>Step {String(step).padStart(2, "0")}</span>
              <span className="inline-flex items-center gap-1">
                {expanded ? "Open" : "Open section"}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
