import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-neu-xs hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground shadow-neu-xs hover:bg-secondary/80",
        destructive:
          "bg-destructive text-destructive-foreground shadow-neu-xs hover:bg-destructive/80",
        outline: "text-foreground bg-muted/30 shadow-neu-xs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
