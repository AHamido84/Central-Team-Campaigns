"use client";
import { RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteMapping, resetPlatformMappings, setMappingTarget } from "@/lib/actions/settings";
import { TARGET_FIELDS } from "@/lib/import/fields";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PlatformBadge } from "@/components/platforms/platform-badge";
import { useAction } from "@/components/forms/use-action";
import { FileSpreadsheet } from "lucide-react";

export interface MappingGroup { platformId: string; platform: string; rows: { id: string; column: string; target: string; updated: string }[] }

export function MappingsPanel({ groups }: { groups: MappingGroup[] }) {
  const t = useTranslations();
  const { pending, run } = useAction();
  if (!groups.length) return <EmptyState icon={FileSpreadsheet} title={t("settings.mappings.emptyTitle")} body={t("settings.mappings.emptyBody")} />;
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Card key={g.platformId}>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
            <div className="flex items-center gap-2">
              <PlatformBadge name={g.platform} />
              <span className="text-sm text-muted-foreground">{t("settings.mappings.count", { n: g.rows.length })}</span>
            </div>
            <ConfirmButton variant="outline" size="sm" destructive disabled={pending} message={t("settings.mappings.resetConfirm", { platform: g.platform })} confirmLabel={t("settings.mappings.reset")} onConfirm={() => run(() => resetPlatformMappings(g.platformId), { success: t("settings.mappings.resetDone") })}>
              <RotateCcw />{t("settings.mappings.reset")}
            </ConfirmButton>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>{t("settings.mappings.column")}</TH>
                  <TH>{t("settings.mappings.target")}</TH>
                  <TH className="w-14" />
                </TR>
              </THead>
              <TBody>
                {g.rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="text-sm" dir="auto">{r.column}</TD>
                    <TD className="min-w-56">
                      <Select aria-label={t("settings.mappings.target")} value={r.target} disabled={pending} onChange={(e) => run(() => setMappingTarget(r.id, e.target.value))}>
                        <option value="">{t("import.ignore")}</option>
                        {TARGET_FIELDS.map((f) => <option key={f} value={f}>{t(`import.fields.${f}`)}</option>)}
                      </Select>
                    </TD>
                    <TD>
                      <Button variant="ghost" size="icon" disabled={pending} aria-label={t("common.delete")} onClick={() => run(() => deleteMapping(r.id), { success: t("settings.mappings.deleted") })}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      ))}
    </div>
  );
}
