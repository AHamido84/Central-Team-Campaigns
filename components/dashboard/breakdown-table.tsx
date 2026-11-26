import { useLocale, useTranslations } from "next-intl";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { BreakdownRow } from "@/lib/data/campaign-analytics";
import type { MetricKey } from "@/lib/metrics";
import { fmtMetric } from "@/lib/metric-format";
import { NoData } from "./panels";

export function BreakdownTable({ rows, metrics, currency, nameLabel, labels = {} }: { rows: BreakdownRow[]; metrics: MetricKey[]; currency: string; nameLabel: string; labels?: Record<string, string> }) {
  const t = useTranslations();
  const locale = useLocale();
  if (!rows.length) return <NoData text={t("dashboard.noData")} />;
  return (
    <div className="-mx-5">
      <Table>
        <THead>
          <TR>
            <TH className="ps-5">{nameLabel}</TH>
            {metrics.map((k) => <TH key={k} className="text-end last:pe-5">{t(`metrics.${labels[k] ?? k}`)}</TH>)}
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={r.id}>
              <TD className="max-w-72 whitespace-normal ps-5 font-medium">{r.name || <span className="text-muted-foreground">{t("dashboard.unassigned")}</span>}</TD>
              {metrics.map((k) => <TD key={k} className="num text-end last:pe-5">{fmtMetric(k, r.m[k] as number | null, currency, locale)}</TD>)}
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
