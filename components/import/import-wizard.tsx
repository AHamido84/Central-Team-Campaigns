"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Info, Loader2, UploadCloud } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { commitImportAction, previewImportAction } from "@/lib/actions/import";
import { adapterFor } from "@/lib/import/adapters";
import { REQUIRED_FIELDS, TARGET_FIELDS, type ColumnMapping, type TargetField } from "@/lib/import/fields";
import { parseFile, type ParsedFile } from "@/lib/import/parse-file";
import type { CampaignResolution, CommitResult, PreviewResult } from "@/lib/import/service";
import { detectMapping, missingRequired } from "@/lib/import/transform";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useErrorText } from "@/components/forms/use-action";

type Step = "upload" | "mapping" | "preview" | "done";

export interface WizardProps {
  companies: { id: string; name: string; currency: string }[];
  platforms: { id: string; name: string }[];
  savedMappings: { platform_id: string; source_column: string; target_field: string }[];
}

export function ImportWizard({ companies, platforms, savedMappings }: WizardProps) {
  const t = useTranslations("import");
  const tc = useTranslations("common");
  const locale = useLocale();
  const errorText = useErrorText();
  const [step, setStep] = useState<Step>("upload");
  const [companyId, setCompanyId] = useState(companies.length === 1 ? companies[0].id : "");
  const [platformId, setPlatformId] = useState(platforms.find((p) => p.name === "Meta")?.id ?? platforms[0]?.id ?? "");
  const [file, setFile] = useState<{ name: string; data: ParsedFile } | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [autoMapped, setAutoMapped] = useState<ColumnMapping>({});
  const [saveMapping, setSaveMapping] = useState(true);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, CampaignResolution>>({});
  const [result, setResult] = useState<CommitResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const company = companies.find((c) => c.id === companyId);
  const platform = platforms.find((p) => p.id === platformId);
  const fieldLabel = (f: string) => t(`fields.${f}`);

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (!companyId) {
      toast.error(t("company") + ": " + errorText("required"));
      return;
    }
    setParsing(true);
    try {
      const data = await parseFile(f);
      const adapter = adapterFor(platform?.name ?? "Meta");
      const m = detectMapping(data.headers, adapter, savedMappings.filter((s) => s.platform_id === platformId));
      setFile({ name: f.name, data });
      setMapping(m);
      setAutoMapped(m);
      setStep("mapping");
    } catch (e) {
      toast.error(errorText((e as Error).message) ?? String(e));
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  /** Only mapped columns are sent to the server. */
  const payload = useMemo(() => {
    if (!file) return null;
    const cols = file.data.headers.map((h, i) => [h, i] as const).filter(([h]) => mapping[h]);
    return {
      companyId,
      platformId,
      fileName: file.name,
      headers: cols.map(([h]) => h),
      rows: file.data.rows.map((r) => cols.map(([, i]) => r[i] ?? "")),
      mapping: Object.fromEntries(cols.map(([h]) => [h, mapping[h]])) as ColumnMapping,
    };
  }, [file, mapping, companyId, platformId]);

  const missing = missingRequired(mapping);
  const sampleOf = (i: number) => file?.data.rows.find((r) => String(r[i] ?? "").trim() !== "")?.[i] ?? "";

  function setField(header: string, f: TargetField | "") {
    setMapping((m) => {
      const next = { ...m };
      if (f) for (const k of Object.keys(next)) if (next[k] === f) next[k] = ""; // one column per field
      next[header] = f;
      return next;
    });
  }

  function runPreview() {
    if (!payload) return;
    start(async () => {
      const res = await previewImportAction(payload);
      if (!res.ok) {
        toast.error(errorText(res.error));
        return;
      }
      setPreview(res.data);
      setResolutions({});
      setStep("preview");
    });
  }

  function runCommit() {
    if (!payload) return;
    start(async () => {
      const res = await commitImportAction({ ...payload, resolutions, saveMapping });
      if (!res.ok) {
        toast.error(errorText(res.error));
        return;
      }
      setResult(res.data);
      setStep("done");
      toast.success(t("doneToast", { inserted: res.data.inserted, updated: res.data.updated, skipped: res.data.skipped }));
    });
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setStep("upload");
  }

  const steps: Step[] = ["upload", "mapping", "preview", "done"];
  const money = (v: number) => formatCurrency(v, company?.currency ?? "SAR", locale, 2);

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <ol className="flex items-center gap-2 overflow-x-auto text-sm">
        {steps.map((s, i) => {
          const idx = steps.indexOf(step);
          const done = i < idx;
          return (
            <li key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  "num grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                  i === idx ? "bg-brand-primary text-brand-accent dark:bg-brand-accent dark:text-brand-primary" : done ? "bg-success text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={cn("whitespace-nowrap", i === idx ? "font-medium" : "text-muted-foreground")}>{t(`steps.${s}`)}</span>
              {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border sm:w-10" />}
            </li>
          );
        })}
      </ol>

      {step === "upload" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="space-y-4 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("company")} htmlFor="imp_company" required>
                  <Select id="imp_company" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                    <option value="">—</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("platform")} htmlFor="imp_platform" required>
                  <Select id="imp_platform" value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
                    {platforms.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void onFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
                  dragging ? "border-brand-accent bg-brand-accent/10" : "border-border hover:border-brand-accent/60 hover:bg-muted/50",
                  !companyId && "opacity-60",
                )}
              >
                {parsing ? <Loader2 className="mb-3 size-10 animate-spin text-brand-accent" /> : <UploadCloud className="mb-3 size-10 text-brand-accent" />}
                <p className="font-medium">{parsing ? t("parsing") : t("drop")}</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("dropHint")}</p>
                <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,text/csv" className="sr-only" data-testid="file-input" onChange={(e) => void onFile(e.target.files?.[0])} />
              </label>
            </CardContent>
          </Card>
          <Card className="bg-brand-primary text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Info className="size-4 text-brand-accent" />{t("tipsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-white/80">
                {["tip1", "tip2", "tip3"].map((k) => (
                  <li key={k} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-accent" />
                    {t(k)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "mapping" && file && (
        <Card>
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-4 text-muted-foreground" />{file.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("rowsRead", { n: formatNumber(file.data.rows.length, locale), cols: file.data.headers.length })} · {company?.name} · {platform?.name}
              </p>
            </div>
            <Badge variant="accent">{t("mappedCount", { n: Object.values(mapping).filter(Boolean).length })}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("mappingBody")}</p>
            {missing.length > 0 && (
              <p className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="size-4 shrink-0" />
                {t("missingRequired", { fields: missing.map(fieldLabel).join("، ") })}
              </p>
            )}
            <div className="rounded-xl border">
              <Table>
                <THead>
                  <TR>
                    <TH>{t("column")}</TH>
                    <TH>{t("sampleValue")}</TH>
                    <TH className="min-w-[220px]">{t("field")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {file.data.headers.map((h, i) => (
                    <TR key={h} className={cn(!mapping[h] && "opacity-60")}>
                      <TD className="font-medium">
                        {h}
                        {mapping[h] && autoMapped[h] === mapping[h] && <Badge variant="muted" className="ms-2">{t("auto")}</Badge>}
                      </TD>
                      <TD className="num max-w-[200px] truncate text-muted-foreground">{String(sampleOf(i))}</TD>
                      <TD>
                        <Select value={mapping[h] ?? ""} onChange={(e) => setField(h, e.target.value as TargetField | "")} aria-label={h}>
                          <option value="">{t("ignore")}</option>
                          {TARGET_FIELDS.map((f) => (
                            <option key={f} value={f}>
                              {fieldLabel(f)}
                              {REQUIRED_FIELDS.includes(f) ? " *" : ""}
                            </option>
                          ))}
                        </Select>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={saveMapping} onCheckedChange={(v) => setSaveMapping(!!v)} />
              {t("saveMapping")}
            </label>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={reset}>{t("back")}</Button>
              <Button onClick={runPreview} disabled={pending || missing.length > 0}>
                {pending && <Loader2 className="animate-spin" />}
                {pending ? t("checking") : t("next")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && preview && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [t("sum.rows"), formatNumber(preview.validRows, locale)],
              [t("sum.dates"), preview.dateFrom ? `${preview.dateFrom} → ${preview.dateTo}` : "—"],
              [t("sum.spend"), money(preview.totalSpend)],
              [t("sum.campaigns"), formatNumber(preview.campaigns.length, locale)],
              [t("sum.insert"), formatNumber(preview.toInsert, locale)],
              [t("sum.update"), formatNumber(preview.toUpdate, locale)],
              [t("sum.skipped"), formatNumber(preview.skippedRows, locale)],
              [t("sum.level"), t(`level.${preview.level}`)],
            ].map(([k, v]) => (
              <Card key={k} className="p-4">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className={cn("num mt-1 font-semibold", k === t("sum.dates") ? "text-sm sm:text-base" : "text-lg")} dir={k === t("sum.dates") ? "ltr" : undefined}>{v}</p>
              </Card>
            ))}
          </div>
          {preview.duplicateRowsInFile > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="num font-medium">{preview.duplicateRowsInFile}</span> {t("sum.dupes")}
            </p>
          )}
          {preview.warnings.map((w) => (
            <p key={w} className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {t(`warn.${w}`)}
            </p>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>{t("campaignsTitle")}</CardTitle>
            </CardHeader>
            <Table>
              <THead>
                <TR>
                  <TH>{fieldLabel("campaign_name")}</TH>
                  <TH>{t("sum.rows")}</TH>
                  <TH>{fieldLabel("spend")}</TH>
                  <TH className="min-w-[260px]" />
                </TR>
              </THead>
              <TBody>
                {preview.campaigns.map((c) => (
                  <TR key={c.key}>
                    <TD className="font-medium">
                      {c.name || c.externalId}
                      {c.externalId && <span className="num ms-2 text-xs text-muted-foreground">#{c.externalId}</span>}
                    </TD>
                    <TD className="num">{formatNumber(c.rows, locale)}</TD>
                    <TD className="num">{money(c.spend)}</TD>
                    <TD>
                      {c.match ? (
                        <Badge variant="success">{t("matched")}: {c.match.name}</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="accent">{t("newCampaign")}</Badge>
                          <Select
                            aria-label={c.name}
                            value={resolutions[c.key]?.mode === "link" ? (resolutions[c.key] as { campaignId: string }).campaignId : ""}
                            onChange={(e) =>
                              setResolutions((r) => ({ ...r, [c.key]: e.target.value ? { mode: "link", campaignId: e.target.value } : { mode: "create" } }))
                            }
                          >
                            <option value="">{t("createNew")}</option>
                            {preview.existingCampaigns.map((ec) => (
                              <option key={ec.id} value={ec.id}>{t("linkTo", { name: ec.name })}</option>
                            ))}
                          </Select>
                        </div>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          {preview.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-warning" />{t("issuesTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="max-h-60 space-y-1.5 overflow-y-auto text-sm">
                  {preview.issues.map((i) => (
                    <li key={i.line} className="flex gap-3">
                      <span className="num w-20 shrink-0 text-muted-foreground">{t("line", { n: i.line })}</span>
                      <span>
                        {i.issues
                          .map((x) => (x.startsWith("invalidNumber:") ? t("issue.invalidNumber", { field: fieldLabel(x.split(":")[1]) }) : t(`issue.${x}`)))
                          .join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("sampleTitle")}</CardTitle>
            </CardHeader>
            <Table>
              <THead>
                <TR>
                  {(["date", "campaign_name", "adset_name", "ad_name", "spend", "impressions", "link_clicks", "results", "leads"] as const).map((f) => (
                    <TH key={f}>{fieldLabel(f)}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {preview.sample.map((r) => (
                  <TR key={r.line} className={cn(r.issues.some((x) => !x.startsWith("invalidNumber")) && "bg-destructive/5")}>
                    <TD className="num">{r.date || "—"}</TD>
                    <TD>{r.campaign_name}</TD>
                    <TD className="text-muted-foreground">{r.adset_name || "—"}</TD>
                    <TD className="text-muted-foreground">{r.ad_name || "—"}</TD>
                    <TD className="num">{formatNumber(r.spend, locale, 2)}</TD>
                    <TD className="num">{formatNumber(r.impressions, locale)}</TD>
                    <TD className="num">{formatNumber(r.link_clicks, locale)}</TD>
                    <TD className="num">{formatNumber(r.results, locale)}</TD>
                    <TD className="num">{formatNumber(r.leads, locale)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-between sm:rounded-xl sm:border">
            <Button variant="outline" onClick={() => setStep("mapping")} disabled={pending}>{t("back")}</Button>
            <Button variant="accent" size="lg" onClick={runCommit} disabled={pending || preview.validRows === 0}>
              {pending && <Loader2 className="animate-spin" />}
              {pending ? t("importing") : t("confirm")}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <Card className="mx-auto max-w-xl p-8 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-success/12 text-success">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="text-xl font-semibold">{t("doneTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("doneBody", { inserted: result.inserted, updated: result.updated, skipped: result.skipped, campaigns: result.campaignsCreated, adsets: result.adSetsCreated })}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={reset}>{t("another")}</Button>
            <Button variant="outline" asChild>
              <Link href="/import/history">{t("viewHistory")}</Link>
            </Button>
          </div>
          <span className="sr-only">{tc("saved")}</span>
        </Card>
      )}
    </div>
  );
}
