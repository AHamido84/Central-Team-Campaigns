"use client";
import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Side drawer (used for the mobile navigation). Opens from the start side (right in Arabic). */
export const Sheet = D.Root;
export const SheetTrigger = D.Trigger;
export const SheetClose = D.Close;
export const SheetTitle = D.Title;

export function SheetContent({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof D.Content>) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <D.Content
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0",
          className,
        )}
        {...props}
      >
        {children}
        <D.Close className="absolute end-3 top-3 rounded-md p-1.5 text-sidebar-muted hover:bg-white/10">
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}
