"use client";
import * as React from "react";
import * as P from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export function PopoverContent({ className, align = "end", sideOffset = 6, ...props }: React.ComponentPropsWithoutRef<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content align={align} sideOffset={sideOffset} className={cn("z-50 rounded-xl border bg-popover p-3 text-popover-foreground shadow-soft outline-none", className)} {...props} />
    </P.Portal>
  );
}
