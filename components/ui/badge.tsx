import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-primary/10 text-primary",
      accent: "bg-brand-accent/15 text-[rgb(140_110_20)] dark:text-brand-accent",
      success: "bg-success/12 text-success",
      warning: "bg-warning/15 text-warning",
      destructive: "bg-destructive/12 text-destructive",
      muted: "bg-muted text-muted-foreground",
      outline: "border text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
