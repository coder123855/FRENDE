import * as React from "react"

import { cn } from "@/lib/utils"
import { ariaUtils, formUtils } from "../../utils/accessibilityUtils";

function Input({
  className,
  type,
  ariaLabel,
  ariaDescribedBy,
  error,
  ...props
}) {
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (inputRef.current) {
      ariaUtils.setupAriaRelationship(inputRef.current, ariaLabel, ariaDescribedBy);
      
      if (error) {
        formUtils.associateError(inputRef.current, error);
      } else {
        formUtils.clearError(inputRef.current);
      }
    }
  }, [ariaLabel, ariaDescribedBy, error]);

  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm transition-all duration-200",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:border-primary/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-error aria-invalid:ring-error/20",
        "hover:border-border/80",
        error && "border-error ring-error/20",
        className
      )}
      ref={inputRef}
      {...props}
    />
  )
}

export { Input }
