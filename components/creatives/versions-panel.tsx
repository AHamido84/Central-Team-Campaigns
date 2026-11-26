"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import type { z } from "zod";
import { Check, ExternalLink, MessageSquareWarning, Plus } from "lucide-react";
import { addCreativeVersion, reviewCreativeVersion } from "@/lib/actions/creatives";
import { CreativeVersionInput } from "@/types/forms";
import type { CreativeVersion } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/components/forms/use-action";
import { cn } from "@/lib/utils";

type In = z.input<typeof CreativeVersionInput>;
type Out = z.output<typeof CreativeVersionInput>;

function AddVersionDialog({ creativeId }: { creativeId: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const { pending, run, errorText } = useAction();
  const form = useForm<In, unknown, Out>({ resolver: zodResolver(CreativeVersionInput), defaultValues: { file_url: "", thumbnail_url: "", revision_notes: "" } });
  const e = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus />{t("creatives.addVersion")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("creatives.addVersion")}</DialogTitle></DialogHeader>
        <form noValidate className="grid gap-4" onSubmit={form.handleSubmit((d) => run(() => addCreativeVersion(creativeId, d), { setError: form.setError, success: t("creatives.versionAdded"), onSuccess: () => { setOpen(false); form.reset(); } }))}>
          <Field label={t("creatives.f.file_url")} htmlFor="v_file" error={errorText(e.file_url?.message)} hint={t("creatives.fileHint")}>
            <Input id="v_file" dir="ltr" {...form.register("file_url")} />
          </Field>
          <Field label={t("creatives.f.thumbnail_url")} htmlFor="v_thumb" error={errorText(e.thumbnail_url?.message)}>
            <Input id="v_thumb" dir="ltr" {...form.register("thumbnail_url")} />
          </Field>
          <Field label={t("creatives.revisionNotes")} htmlFor="v_notes">
            <Textarea id="v_notes" rows={3} {...form.register("revision_notes")} />
          </Field>
          <p className="text-xs text-muted-foreground">{t("creatives.versionNote")}</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending}>{pending ? t("common.saving") : t("creatives.sendForReview")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviewControls({ version }: { version: CreativeVersion }) {
  const t = useTranslations();
  const { pending, run } = useAction();
  const [comment, setComment] = useState("");
  const [asking, setAsking] = useState(false);
  return (
    <div className="mt-2 space-y-2">
      {asking && <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("creatives.changesPlaceholder")} aria-label={t("creatives.reviewComment")} autoFocus />}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="accent" disabled={pending} onClick={() => run(() => reviewCreativeVersion(version.id, { decision: "approved", comment }), { success: t("creatives.approvedToast") })}>
          <Check />{t("creatives.approve")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || (asking && !comment.trim())}
          onClick={() => (asking ? run(() => reviewCreativeVersion(version.id, { decision: "changes_requested", comment }), { success: t("creatives.changesToast"), onSuccess: () => setAsking(false) }) : setAsking(true))}
        >
          <MessageSquareWarning />{asking ? t("creatives.sendChanges") : t("creatives.requestChanges")}
        </Button>
      </div>
    </div>
  );
}

export function VersionsPanel({ creativeId, versions, current, canManage, canApprove, names }: { creativeId: string; versions: CreativeVersion[]; current: number; canManage: boolean; canApprove: boolean; names: Record<string, string> }) {
  const t = useTranslations();
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="space-y-3">
      {canManage && <AddVersionDialog creativeId={creativeId} />}
      {!versions.length && <p className="text-sm text-muted-foreground">{t("creatives.noVersions")}</p>}
      <ol className="space-y-3">
        {versions.map((v) => (
          <li key={v.id} className={cn("rounded-lg border p-3 text-sm", v.version === current && "border-brand-accent/60")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="num font-semibold">v{v.version}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", v.review_status === "approved" ? "bg-success/15 text-success" : v.review_status === "changes_requested" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning")}>
                {t(`creatives.review.${v.review_status}`)}
              </span>
              {v.file_url && (
                <a href={v.file_url} target="_blank" rel="noreferrer" className="ms-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  {t("creatives.openFile")}<ExternalLink className="size-3" />
                </a>
              )}
            </div>
            {v.revision_notes && <p className="mt-1.5 whitespace-pre-line">{v.revision_notes}</p>}
            <p className="num mt-1 text-xs text-muted-foreground">{names[v.created_by] ?? v.created_by} · {v.created_at ? fmt.format(new Date(v.created_at)) : ""}</p>
            {v.reviewer && (
              <p className="mt-2 rounded-md bg-muted px-2 py-1.5 text-xs">
                <span className="font-medium">{names[v.reviewer] ?? v.reviewer}:</span> {v.review_comment || t(`creatives.review.${v.review_status}`)}
              </p>
            )}
            {canApprove && v.review_status === "pending" && v.version === current && <ReviewControls version={v} />}
          </li>
        ))}
      </ol>
    </div>
  );
}
