"use client";
import { History, Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { rollbackImportAction } from "@/lib/actions/import";
import type { ImportHistoryRow } from "@/lib/data/import";
import { formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PlatformBadge } from "@/components/platforms/platform-badge";
import { useAction } from "@/components/forms/use-action";

export function ImportHistoryTable({ rows, rollbackable }: { rows: ImportHistoryRow[]; rollbackable: string[] }) {
  const t = useTranslations("import.history");
  const locale = useLocale();
  const { pending, run } = useAction();
  const allowed = new Set(rollbackable);
  if (!rows.length) return <EmptyState icon={History} title={t("empty")} body={t("emptyBody")} />;
  const fmtTime = (iso: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(new Date(iso));
  return (
    <Card>
      <Table>
        <THead>
          <TR>
            <TH>{t("file")}</TH>
            <TH>{t("at")}</TH>
            <TH>{t("by")}</TH>
            <TH>{t("total")}</TH>
            <TH>{t("inserted")}</TH>
            <TH>{t("updated")}</TH>
            <TH>{t("skipped")}</TH>
            <TH>{t("status")}</TH>
            <TH />
          </TR>
        </THead>
        <TBody>
          {rows.map((b) => (
            <TR key={b.id}>
              <TD>
                <p className="font-medium">{b.file_name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {b.company_name} <PlatformBadge name={b.platform_name} />
                  <span dir="ltr" className="num">{b.date_from} → {b.date_to}</span>
                </div>
              </TD>
              <TD className="num text-muted-foreground">{fmtTime(b.imported_at)}</TD>
              <TD>{b.user_name}</TD>
              <TD className="num">{formatNumber(b.rows_total, locale)}</TD>
              <TD className="num text-success">{formatNumber(b.rows_inserted, locale)}</TD>
              <TD className="num">{formatNumber(b.rows_updated, locale)}</TD>
              <TD className="num text-muted-foreground">{formatNumber(b.rows_skipped, locale)}</TD>
              <TD>
                <Badge variant={b.status === "completed" ? "success" : b.status === "rolled_back" ? "muted" : "destructive"}>{t(b.status)}</Badge>
              </TD>
              <TD>
                {b.status === "completed" && allowed.has(b.company_id) && (
                  <ConfirmButton
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    message={t("rollbackConfirm")}
                    confirmLabel={t("rollback")}
                    onConfirm={() => run(() => rollbackImportAction(b.id), { success: false, onSuccess: (d) => toast.success(t("rolledBack", d)) })}
                  >
                    <Undo2 />
                    {t("rollback")}
                  </ConfirmButton>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
