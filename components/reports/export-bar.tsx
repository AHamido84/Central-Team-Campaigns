"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, FileDown, FileSpreadsheet, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { createShareLinkAction } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAction, useErrorText } from "@/components/forms/use-action";
import { PrintButton } from "./print-button";

async function download(url: string, fallbackName: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: "pdfFailed" }))).error ?? "pdfFailed");
  const name = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function ShareDialog({ query }: { query: string }) {
  const t = useTranslations();
  const [days, setDays] = useState("7");
  const [fixed, setFixed] = useState(true);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const { pending, run } = useAction();
  return (
    <Dialog onOpenChange={(o) => !o && setUrl("")}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Share2 />{t("reports.share")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("reports.share")}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{t("reports.shareHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>{t("reports.validFor")}</span>
            <Select value={days} onChange={(e) => setDays(e.target.value)}>
              {[1, 7, 30, 90].map((d) => <option key={d} value={d}>{t("reports.days", { n: d })}</option>)}
            </Select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" className="size-4" checked={fixed} onChange={(e) => setFixed(e.target.checked)} />
            {t("reports.fixedDates")}
          </label>
        </div>
        {url && (
          <div className="flex gap-2">
            <Input readOnly value={url} dir="ltr" className="num text-xs" onFocus={(e) => e.target.select()} />
            <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })} aria-label={t("reports.copy")}>
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button disabled={pending} onClick={() => run(() => createShareLinkAction(query, Number(days), fixed), { success: t("reports.linkCreated"), onSuccess: (r) => setUrl(r.url) })}>
            {pending ? <Loader2 className="animate-spin" /> : <Share2 />}
            {t("reports.createLink")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExportBar({ query, canShare }: { query: string; canShare: boolean }) {
  const t = useTranslations();
  const errorText = useErrorText();
  const [busy, setBusy] = useState<"" | "pdf" | "xlsx">("");
  const get = async (kind: "pdf" | "xlsx") => {
    setBusy(kind);
    try {
      await download(`/api/reports/${kind}?${query}`, `report.${kind}`);
    } catch (e) {
      toast.error(errorText((e as Error).message));
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button variant="accent" size="sm" disabled={!!busy} onClick={() => get("pdf")}>
        {busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileDown />}
        {busy === "pdf" ? t("reports.preparingPdf") : t("reports.pdf")}
      </Button>
      <Button variant="outline" size="sm" disabled={!!busy} onClick={() => get("xlsx")}>
        {busy === "xlsx" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
        Excel
      </Button>
      <PrintButton />
      {canShare && <ShareDialog query={query} />}
    </div>
  );
}
