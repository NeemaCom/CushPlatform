import { CheckCircle2, ChevronDown, type LucideIcon } from "lucide-react";

export type JourneySection = "information" | "documents" | "connections";

export type PassportJourneyStep = {
  key: JourneySection;
  title: string;
  description: string;
  status: string;
  icon: LucideIcon;
  step: number;
  expanded: boolean;
};

type Props = {
  steps: PassportJourneyStep[];
  panelId: string;
  onSelect: (section: JourneySection) => void;
};

export default function PassportJourneySteps({ steps, panelId, onSelect }: Props) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {steps.map(({ key, title, description, status, icon: Icon, step, expanded }) => {
        const isComplete = status === "Complete" || status === "Connected" || status.endsWith("approved");
        return (
          <button
            key={key}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => onSelect(key)}
            className={`group flex min-h-[140px] w-full flex-col items-start rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:p-4 ${
              expanded
                ? "border-indigo-300 bg-indigo-50/70 shadow-sm"
                : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30"
            }`}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-100">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                isComplete ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}>
                {isComplete && <CheckCircle2 className="mr-1 inline h-3 w-3" aria-hidden="true" />}
                {status}
              </span>
            </span>
            <span className="mt-3 block text-sm font-semibold text-slate-800">{title}</span>
            <span className="mt-1 block flex-1 text-xs leading-5 text-slate-500">{description}</span>
            <span className="mt-3 flex w-full items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-semibold text-indigo-700">
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
