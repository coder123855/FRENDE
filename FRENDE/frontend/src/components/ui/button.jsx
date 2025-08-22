import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"
import { ariaUtils } from "../../utils/accessibilityUtils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 aria-invalid:ring-error/20 dark:aria-invalid:ring-error/40 aria-invalid:border-error hover:transform hover:scale-[1.02] active:transform active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md hover:shadow-lg hover:from-primary-600 hover:to-primary-700",
        destructive:
          "bg-gradient-to-r from-error-500 to-error-600 text-white shadow-md hover:shadow-lg hover:from-error-600 hover:to-error-700 focus-visible:ring-error/20 dark:focus-visible:ring-error/40",
        outline:
          "border-2 border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 hover:border-primary/50",
        secondary:
          "bg-gradient-to-r from-secondary-500 to-secondary-600 text-white shadow-md hover:shadow-lg hover:from-secondary-600 hover:to-secondary-700",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 hover:shadow-sm",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-600",
        success:
          "bg-gradient-to-r from-success-500 to-success-600 text-white shadow-md hover:shadow-lg hover:from-success-600 hover:to-success-700",
        warning:
          "bg-gradient-to-r from-warning-500 to-warning-600 text-white shadow-md hover:shadow-lg hover:from-warning-600 hover:to-warning-700",
        accent:
          "bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-md hover:shadow-lg hover:from-accent-600 hover:to-accent-700",
      },
      size: {
        default: "h-10 px-6 py-2.5 has-[>svg]:px-4",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-12 rounded-xl px-8 has-[>svg]:px-6 text-base",
        icon: "size-10",
        xl: "h-14 rounded-xl px-10 has-[>svg]:px-8 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ariaLabel,
  ariaDescribedBy,
  ...props
}) {
  const Comp = asChild ? Slot : "button"
  
  React.useEffect(() => {
    if (props.ref?.current) {
      ariaUtils.setupAriaRelationship(props.ref.current, ariaLabel, ariaDescribedBy);
    }
  }, [ariaLabel, ariaDescribedBy, props.ref]);

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
