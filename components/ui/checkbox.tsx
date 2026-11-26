"use client";
import * as React from "react";
import * as C from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<React.ElementRef<typeof C.Root>, React.ComponentPropsWithoutRef<typeof C.Root>>(({ className, ...props }, ref) => (
  <C.Root
    ref={ref}
    className={cn(
      "peer size-4 shrink-0 rounded border border-input bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className,
    )}
    {...props}
  >
    <C.Indicator className="flex items-center justify-center">
      <Check className="size-3" />
    </C.Indicator>
  </C.Root>
));
Checkbox.displayName = "Checkbox";
