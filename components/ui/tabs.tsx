"use client";
import * as React from "react";
import * as T from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;
export const TabsList = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof T.List>) => (
  <T.List className={cn("inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1", className)} {...p} />
);
export const TabsTrigger = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof T.Trigger>) => (
  <T.Trigger
    className={cn(
      "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors data-[state=active]:bg-card data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className,
    )}
    {...p}
  />
);
export const TabsContent = ({ className, ...p }: React.ComponentPropsWithoutRef<typeof T.Content>) => (
  <T.Content className={cn("mt-5 outline-none", className)} {...p} />
);
