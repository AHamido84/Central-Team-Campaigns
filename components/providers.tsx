"use client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children, dir }: { children: React.ReactNode; dir: "rtl" | "ltr" }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {children}
      <Toaster dir={dir} />
    </ThemeProvider>
  );
}
