import * as React from "react"
import { cn } from "@/lib/utils"

// Simple tooltip replacement without Radix UI dependencies
const Tooltip = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const TooltipTrigger = ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => {
  return (
    <div className={cn("cursor-pointer", className)} {...props}>
      {children}
    </div>
  )
}

const TooltipContent = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div 
      className={cn(
        "hidden absolute z-50 bg-gray-800 text-white px-2 py-1 rounded text-sm",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
}

// Empty provider component to replace TooltipProvider
const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
