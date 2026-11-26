"use client";
import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof D.Content>) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <D.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl border bg-card p-5 shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4",
          "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6 sm:data-[state=open]:zoom-in-95 sm:data-[state=open]:slide-in-from-bottom-0",
          className,
        )}
        {...props}
      >
        {children}
        <D.Close className="absolute end-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close">
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

export const DialogHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("mb-5 space-y-1 pe-8", className)} {...p} />;
export const DialogTitle = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof D.Title>) => (
  <D.Title className={cn("text-lg font-semibold", className)} {...p} />
);
export const DialogDescription = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof D.Description>) => (
  <D.Description className={cn("text-sm text-muted-foreground", className)} {...p} />
);
export const DialogFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...p} />
);
