"use client";
import * as React from "react";
import * as M from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuGroup = M.Group;

export const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof M.Content>, React.ComponentPropsWithoutRef<typeof M.Content>>(
  ({ className, sideOffset = 6, ...props }, ref) => (
    <M.Portal>
      <M.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[12rem] overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-soft data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </M.Portal>
  ),
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<React.ElementRef<typeof M.Item>, React.ComponentPropsWithoutRef<typeof M.Item>>(
  ({ className, ...props }, ref) => (
    <M.Item
      ref={ref}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  ),
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuLabel = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof M.Label>) => (
  <M.Label className={cn("px-2.5 py-2 text-sm", className)} {...props} />
);
export const DropdownMenuSeparator = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof M.Separator>) => (
  <M.Separator className={cn("my-1 h-px bg-border", className)} {...props} />
);
