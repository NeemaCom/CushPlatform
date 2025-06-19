import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  children: ReactNode;
  className?: string;
  config?: Record<string, any>;
}

export function ChartContainer({ children, className, config }: ChartContainerProps) {
  return (
    <div className={cn("flex aspect-video justify-center text-xs", className)}>
      {children}
    </div>
  );
}
