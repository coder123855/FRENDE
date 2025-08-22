import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "../../lib/utils"

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-md transition-all duration-200 hover:shadow-lg",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef(({ className, children, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-gray-200 text-gray-600 font-semibold text-sm relative overflow-hidden",
      className
    )}
    {...props}
  >
    {children ? (
      children
    ) : (
      <svg
        className="w-full h-full text-gray-400"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Human silhouette - head */}
        <circle cx="12" cy="8" r="4" fill="currentColor" />
        {/* Human silhouette - body */}
        <path
          d="M12 12c-2.5 0-4.5 2-4.5 4.5V20h9v-3.5c0-2.5-2-4.5-4.5-4.5z"
          fill="currentColor"
        />
      </svg>
    )}
  </AvatarPrimitive.Fallback>
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }

// Default export for backward compatibility
export default Avatar 