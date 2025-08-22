import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm",
        secondary:
          "border-transparent bg-gradient-to-r from-secondary-500 to-secondary-600 text-white shadow-sm",
        accent:
          "border-transparent bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-sm",
        success:
          "border-transparent bg-gradient-to-r from-success-500 to-success-600 text-white shadow-sm",
        warning:
          "border-transparent bg-gradient-to-r from-warning-500 to-warning-600 text-white shadow-sm",
        error:
          "border-transparent bg-gradient-to-r from-error-500 to-error-600 text-white shadow-sm",
        outline: 
          "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: 
          "border-transparent bg-background-secondary text-foreground-secondary hover:bg-background-tertiary",
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
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants } 