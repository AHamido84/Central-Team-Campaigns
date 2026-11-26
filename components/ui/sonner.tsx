"use client";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

export function Toaster({ dir }: { dir: "rtl" | "ltr" }) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      dir={dir}
      position={dir === "rtl" ? "top-left" : "top-right"}
      theme={(resolvedTheme as "light" | "dark") ?? "light"}
      richColors
      closeButton
      toastOptions={{ classNames: { toast: "font-sans rounded-xl" } }}
    />
  );
}
