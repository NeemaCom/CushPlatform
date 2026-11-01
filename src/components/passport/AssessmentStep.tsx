import { useEffect, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface AssessmentStepProps {
  id?: string;
  step: number;
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function AssessmentStep({
  id,
  step,
  title,
  description,
  defaultOpen = false,
  children,
}: AssessmentStepProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = defaultOpen;
  }, [defaultOpen]);

  return (
    <details
      ref={detailsRef}
      id={id}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-800">
          {step}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-slate-900">{title}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{description}</span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-4 border-t border-slate-100 p-4 sm:p-5">
        {children}
      </div>
    </details>
  );
}
