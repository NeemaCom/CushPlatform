import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type AssessmentTone = "violet" | "teal";

interface AssessmentStepProps {
  id?: string;
  step: number;
  title: string;
  description: string;
  tone?: AssessmentTone;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function AssessmentStep({
  id,
  step,
  title,
  description,
  tone = "violet",
  icon,
  defaultOpen = false,
  children,
}: AssessmentStepProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const style = tone === "violet"
    ? {
        container: "border-violet-200 shadow-violet-950/5",
        header: "bg-gradient-to-r from-violet-50 via-fuchsia-50 to-white hover:from-violet-100 hover:via-fuchsia-100",
        number: "bg-violet-700 text-white",
        icon: "bg-white text-violet-700 ring-1 ring-violet-200",
        divider: "border-violet-100",
      }
    : {
        container: "border-teal-200 shadow-teal-950/5",
        header: "bg-gradient-to-r from-teal-50 via-cyan-50 to-white hover:from-teal-100 hover:via-cyan-100",
        number: "bg-teal-700 text-white",
        icon: "bg-white text-teal-700 ring-1 ring-teal-200",
        divider: "border-teal-100",
      };

  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = defaultOpen;
  }, [defaultOpen]);

  return (
    <details
      ref={detailsRef}
      id={id}
      className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${style.container}`}
    >
      <summary className={`flex cursor-pointer list-none items-center gap-3 p-4 transition-colors sm:p-5 [&::-webkit-details-marker]:hidden ${style.header}`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${style.number}`}>
          {step}
        </span>
        {icon && (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style.icon}`}>
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-bold tracking-tight text-slate-900">{title}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{description}</span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className={`space-y-4 border-t p-4 sm:p-5 ${style.divider}`}>
        {children}
      </div>
    </details>
  );
}
