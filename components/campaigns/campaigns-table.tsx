"use client";
import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Download, Megaphone, Pencil, Plus, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { CampaignRow } from "@/lib/data/campaigns";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatCurrency, formatNumber } from "@/lib/format";
import { CAMPAIGN_STATUS } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PlatformBadge } from "@/components/platforms/platform-badge";
import { CampaignFormDialog, type CampaignFormOptions } from "./campaign-form-dialog";

type GroupBy = "none" | "company" | "platform";

export function CampaignsTable({
  rows,
  options,
  canManage,
  fixedCompanyId,
  defaultBuyer,
}: {
  rows: CampaignRow[];
  options: CampaignFormOptions;
  canManage: boolean;
  fixedCompanyId?: string;
  defaultBuyer?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [company, setCompany] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("");
  const [buyer, setBuyer] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [visibility, setVisibility] = useState<VisibilityState>({ objective: false, leads: false, cpl: false, budget: false });

  const money = (v: number | null, cur: string) => (v === null ? "—" : formatCurrency(v, cur, locale, 2));

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => (!company || r.company_id === company) && (!platform || r.platform_id === platform) && (!status || r.status === status) && (!buyer || r.media_buyer === buyer),
      ),
    [rows, company, platform, status, buyer],
  );

  const columns = useMemo<ColumnDef<CampaignRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: t("campaigns.f.name"),
        enableHiding: false,
        cell: ({ row }) => (
          <Link href={`/campaigns/${row.original.id}`} className="font-medium hover:text-brand-accent hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      ...(fixedCompanyId ? [] : [{ id: "company", accessorKey: "company_name", header: t("campaigns.f.company_id") } as ColumnDef<CampaignRow>]),
      { id: "platform", accessorKey: "platform_name", header: t("campaigns.f.platform_id"), cell: ({ getValue }) => <PlatformBadge name={String(getValue())} /> },
      { id: "status", accessorKey: "status", header: t("campaigns.f.status"), cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      { id: "objective", accessorKey: "objective", header: t("campaigns.f.objective"), cell: ({ getValue }) => t(`campaigns.objective.${getValue()}`) },
      { id: "media_buyer", accessorKey: "media_buyer_name", header: t("campaigns.f.media_buyer"), cell: ({ getValue }) => String(getValue() || "—") },
      {
        id: "dates",
        accessorKey: "start_date",
        header: t("campaigns.col.dates"),
        cell: ({ row }) => (
          <span dir="ltr" className="num text-xs text-muted-foreground">
            {row.original.start_date || "—"} → {row.original.end_date || "…"}
          </span>
        ),
      },
      { id: "budget", accessorKey: "budget", header: t("campaigns.f.budget"), cell: ({ row }) => <span className="num">{money(row.original.budget, row.original.company_currency)}</span> },
      { id: "spend", accessorKey: "spend", header: t("campaigns.col.spend"), cell: ({ row }) => <span className="num font-medium">{money(row.original.spend, row.original.company_currency)}</span> },
      { id: "results", accessorKey: "results", header: t("campaigns.col.results"), cell: ({ getValue }) => <span className="num">{formatNumber(Number(getValue()), locale)}</span> },
      {
        id: "cpr",
        accessorFn: (r) => r.cost_per_result ?? Number.POSITIVE_INFINITY,
        header: t("campaigns.col.cpr"),
        cell: ({ row }) => <span className="num">{money(row.original.cost_per_result, row.original.company_currency)}</span>,
      },
      { id: "leads", accessorKey: "leads", header: t("campaigns.col.leads"), cell: ({ getValue }) => <span className="num">{formatNumber(Number(getValue()), locale)}</span> },
      {
        id: "cpl",
        accessorFn: (r) => r.cpl ?? Number.POSITIVE_INFINITY,
        header: t("campaigns.col.cpl"),
        cell: ({ row }) => <span className="num">{money(row.original.cpl, row.original.company_currency)}</span>,
      },
      ...(canManage
        ? [
            {
              id: "actions",
              header: "",
              enableHiding: false,
              enableSorting: false,
              cell: ({ row }) => (
                <CampaignFormDialog
                  campaign={row.original}
                  options={options}
                  fixedCompanyId={fixedCompanyId}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={t("common.edit")}>
                      <Pencil />
                    </Button>
                  }
                />
              ),
            } as ColumnDef<CampaignRow>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, canManage, fixedCompanyId, options],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter, columnVisibility: visibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setVisibility,
    globalFilterFn: (row, _id, value) => {
      const q = String(value).toLowerCase();
      const r = row.original;
      return [r.name, r.company_name, r.platform_name, r.media_buyer_name, r.external_campaign_id].some((s) => s?.toLowerCase().includes(q));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const visibleRows = table.getRowModel().rows;
  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "", label: "", rows: visibleRows }];
    const map = new Map<string, { key: string; label: string; rows: typeof visibleRows }>();
    for (const r of visibleRows) {
      const key = groupBy === "company" ? r.original.company_id : r.original.platform_id;
      const label = groupBy === "company" ? r.original.company_name : r.original.platform_name;
      if (!map.has(key)) map.set(key, { key, label, rows: [] });
      map.get(key)!.rows.push(r);
    }
    return [...map.values()];
  }, [groupBy, visibleRows]);

  function exportCsv() {
    const cols = table.getVisibleLeafColumns().filter((c) => c.id !== "actions");
    const headers = cols.map((c) => String(c.columnDef.header));
    const raw = (r: CampaignRow, id: string): string | number | null => {
      switch (id) {
        case "company": return r.company_name;
        case "platform": return r.platform_name;
        case "media_buyer": return r.media_buyer_name;
        case "dates": return `${r.start_date} - ${r.end_date}`;
        case "cpr": return r.cost_per_result === null ? "" : Number(r.cost_per_result.toFixed(2));
        case "cpl": return r.cpl === null ? "" : Number(r.cpl.toFixed(2));
        case "spend": return Number(r.spend.toFixed(2));
        default: return (r as unknown as Record<string, string | number>)[id] ?? "";
      }
    };
    downloadCsv(`campaigns-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, visibleRows.map((r) => cols.map((c) => raw(r.original, c.id)))));
  }

  const addButton = canManage ? (
    <CampaignFormDialog
      options={options}
      fixedCompanyId={fixedCompanyId}
      defaultBuyer={defaultBuyer}
      trigger={
        <Button>
          <Plus />
          {t("campaigns.add")}
        </Button>
      }
    />
  ) : null;

  if (!rows.length) return <EmptyState icon={Megaphone} title={t("campaigns.emptyTitle")} body={t("campaigns.emptyBody")} action={addButton} />;

  const colCount = table.getVisibleLeafColumns().length;

  return (
    <Card>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder={t("common.search")} className="ps-9" />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Columns3 />
                <span className="hidden sm:inline">{t("common.columns")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 space-y-2">
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={c.getIsVisible()} onCheckedChange={(v) => c.toggleVisibility(!!v)} />
                    {String(c.columnDef.header)}
                  </label>
                ))}
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={exportCsv}>
            <Download />
            <span className="hidden sm:inline">{t("common.export")}</span>
          </Button>
          {addButton}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {!fixedCompanyId && (
            <Select value={company} onChange={(e) => setCompany(e.target.value)} aria-label={t("campaigns.f.company_id")}>
              <option value="">{t("campaigns.f.company_id")}: {t("common.all")}</option>
              {options.companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          )}
          <Select value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label={t("campaigns.f.platform_id")}>
            <option value="">{t("campaigns.f.platform_id")}: {t("common.all")}</option>
            {options.platforms.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("campaigns.f.status")}>
            <option value="">{t("campaigns.f.status")}: {t("common.all")}</option>
            {CAMPAIGN_STATUS.map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </Select>
          <Select value={buyer} onChange={(e) => setBuyer(e.target.value)} aria-label={t("campaigns.f.media_buyer")}>
            <option value="">{t("campaigns.f.media_buyer")}: {t("common.all")}</option>
            {options.mediaBuyers.map((m) => (
              <option key={m.email} value={m.email}>{m.name}</option>
            ))}
          </Select>
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} aria-label={t("common.groupBy")}>
            {(["none", ...(fixedCompanyId ? [] : ["company"]), "platform"] as GroupBy[]).map((g) => (
              <option key={g} value={g}>{t("common.groupBy")}: {t(`campaigns.group.${g}`)}</option>
            ))}
          </Select>
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted-foreground">{t("campaigns.noMatch")}</p>
      ) : (
        <Table>
          <THead>
            {table.getHeaderGroups().map((hg) => (
              <TR key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TH key={h.id}>
                    {h.column.getCanSort() ? (
                      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={h.column.getToggleSortingHandler()}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc" ? <ArrowUp className="size-3" /> : h.column.getIsSorted() === "desc" ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-40" />}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </TH>
                ))}
              </TR>
            ))}
          </THead>
          <TBody>
            {groups.map((g) => {
              const spend = g.rows.reduce((s, r) => s + r.original.spend, 0);
              const results = g.rows.reduce((s, r) => s + r.original.results, 0);
              return (
                <Fragment key={g.key || "all"}>
                  {groupBy !== "none" && (
                    <TR className="bg-muted/60 hover:bg-muted/60">
                      <TD colSpan={colCount} className="py-2 text-xs">
                        <span className="font-semibold">{g.label}</span>
                        <span className="ms-3 text-muted-foreground">
                          {t("campaigns.count", { n: g.rows.length })} · {t("campaigns.col.spend")}{" "}
                          <span className="num">{formatNumber(spend, locale, 0)}</span> · {t("campaigns.col.results")} <span className="num">{formatNumber(results, locale)}</span> ·{" "}
                          {t("campaigns.col.cpr")} <span className="num">{results > 0 ? formatNumber(spend / results, locale, 2) : "—"}</span>
                        </span>
                      </TD>
                    </TR>
                  )}
                  {g.rows.map((row) => (
                    <TR key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TD key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TD>
                      ))}
                    </TR>
                  ))}
                </Fragment>
              );
            })}
          </TBody>
        </Table>
      )}
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">{t("campaigns.count", { n: visibleRows.length })}</div>
    </Card>
  );
}
