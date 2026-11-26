"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, type ButtonProps } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";

/** A button that asks for confirmation in a dialog (no browser confirm()). */
export function ConfirmButton({
  message,
  confirmLabel,
  onConfirm,
  destructive = true,
  children,
  ...props
}: ButtonProps & { message: string; confirmLabel?: string; onConfirm: () => void; destructive?: boolean }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("common");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button {...props}>{children}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{confirmLabel ?? t("confirmDelete")}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel ?? t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
