"use client";
/* ============================================================
   📂 primey_frontend/components/system/activity-profiles/SystemActivityBackendsCenter.tsx
   🧩 Mhamcloud — System Activity Backends Center
   ------------------------------------------------------------
   ✅ Real API only: GET /api/system/activity-backends/
   ✅ Activity-specific backend models + company summaries
   ✅ KPI cards + filters + tables
   ✅ Arabic/English via primey-locale
============================================================ */
import * as React from "react";
import Link from "next/link";
import {
  Boxes,
  Building2,
  Database,
  FileSpreadsheet,
  FileText,
  Inbox,
  Layers3,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type BackendModel = {
  model: string;
  appLabel: string;
  dbTable: string;
  count: number;
  companyScoped: boolean;
};
type CompanyBackendSummary = {
  id: number;
  name: string;
  code: string;
  status: string;
  summaryText: string;
};
const API_ENDPOINT = "/api/system/activity-backends/";
const translations = {
  ar: {
    title: "خلفيات الأنشطة",
    subtitle:
      "مراقبة نماذج وبيانات الخلفيات المتخصصة للأنشطة مثل المطاعم والعيادات والمشاريع من API النظام الحقيقي.",
    badge: "الجاهزية والربط",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    reset: "إعادة ضبط",
    activityProfiles: "أنشطة الشركات",
    searchPlaceholder: "ابحث باسم النموذج أو الجدول أو الشركة...",
    modelsCount: "عدد النماذج",
    recordsCount: "إجمالي السجلات",
    companiesWithRecords: "شركات لديها سجلات",
    companiesLoaded: "شركات معروضة",
    fromLiveApi: "من API حقيقي",
    modelsTable: "نماذج خلفيات الأنشطة",
    modelsTableDesc: "النماذج المسجلة في تطبيق activity_backends وعدد السجلات لكل نموذج.",
    companiesTable: "ملخص الشركات",
    companiesTableDesc: "ملخص بيانات خلفيات الأنشطة حسب الشركة.",
    showing: "عرض",
    of: "من",
    model: "النموذج",
    app: "التطبيق",
    table: "الجدول",
    count: "العدد",
    companyScoped: "مربوط بشركة",
    company: "الشركة",
    code: "الكود",
    status: "الحالة",
    summary: "الملخص",
    yes: "نعم",
    no: "لا",
    emptyTitle: "لا توجد بيانات",
    emptyDesc: "لم يرجع API أي نماذج أو ملخصات.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل خلفيات الأنشطة",
    errorDesc: "تأكد من صلاحيات النظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير خلفيات الأنشطة في Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
    refreshed: "تم تحديث خلفيات الأنشطة.",
  },
  en: {
    title: "Activity Backends",
    subtitle:
      "Monitor activity-specific backend models and records such as restaurant, clinic, and project scopes from the live system API.",
    badge: "Readiness & API",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    reset: "Reset",
    activityProfiles: "Activity Profiles",
    searchPlaceholder: "Search model, table, or company...",
    modelsCount: "Models count",
    recordsCount: "Total records",
    companiesWithRecords: "Companies with records",
    companiesLoaded: "Loaded companies",
    fromLiveApi: "From live API",
    modelsTable: "Activity backend models",
    modelsTableDesc: "Registered activity_backends models and record counts.",
    companiesTable: "Company summaries",
    companiesTableDesc: "Activity backend summaries by company.",
    showing: "Showing",
    of: "of",
    model: "Model",
    app: "App",
    table: "Table",
    count: "Count",
    companyScoped: "Company scoped",
    company: "Company",
    code: "Code",
    status: "Status",
    summary: "Summary",
    yes: "Yes",
    no: "No",
    emptyTitle: "No data",
    emptyDesc: "The API returned no models or summaries.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search to show more results.",
    errorTitle: "Could not load activity backends",
    errorDesc: "Make sure you have system permission and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "Mhamcloud Activity Backends Report",
    generatedAt: "Generated at",
    refreshed: "Activity backends refreshed.",
  },
} as const;
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}
function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
function boolValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["1", "true", "yes"].includes(value.toLowerCase());
  return fallback;
}
function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(numberValue(value)),
  );
}
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/+$/,
          "",
        )
      : "";
  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}
async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let payload: unknown = null;
  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const record = asRecord(payload);
    throw new Error(text(record.message) || text(record.detail) || `Request failed with status ${response.status}`);
  }
  return (payload || {}) as T;
}
function compactSummary(value: unknown): string {
  const record = asRecord(value);
  if (!Object.keys(record).length) return "—";
  if (record.error) {
    return `${text(record.error)}: ${text(record.message)}`;
  }
  const parts = Object.entries(record)
    .filter(([, item]) => typeof item !== "object")
    .slice(0, 6)
    .map(([key, item]) => `${key}: ${text(item)}`);
  return parts.join(" · ") || "—";
}
function normalizeModel(value: unknown, index: number): BackendModel {
  const record = asRecord(value);
  return {
    model: text(record.model, `Model ${index + 1}`),
    appLabel: text(record.app_label),
    dbTable: text(record.db_table),
    count: numberValue(record.count),
    companyScoped: boolValue(record.company_scoped),
  };
}
function normalizeCompanySummary(value: unknown, index: number): CompanyBackendSummary {
  const record = asRecord(value);
  const company = asRecord(record.company);
  const summary = record.summary;
  return {
    id: numberValue(company.id || company.pk, index + 1),
    name: text(company.display_name || company.name || company.company_name, `Company ${index + 1}`),
    code: text(company.company_code || company.code),
    status: text(company.status, "ACTIVE"),
    summaryText: compactSummary(summary),
  };
}
function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-3 truncate text-3xl font-bold tabular-nums">
              {typeof value === "number" ? formatInteger(value) : value}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-2xl bg-muted p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
function BackendsSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Card className="rounded-3xl">
          <CardHeader className="space-y-4">
            <Skeleton className="h-7 w-44 rounded-full" />
            <Skeleton className="h-10 w-72 rounded-xl" />
            <Skeleton className="h-5 w-full max-w-3xl rounded-xl" />
          </CardHeader>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </main>
  );
}
export function SystemActivityBackendsCenter() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [payload, setPayload] = React.useState<ApiRecord>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";
  React.useEffect(() => {
    const applyLocale = () => {
      const nextLocale = getInitialLocale();
      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
      document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
    };
    applyLocale();
    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);
    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);
  const loadBackends = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const data = await fetchJson<ApiRecord>(API_ENDPOINT);
        setPayload(data);
        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.errorDesc, t.refreshed],
  );
  React.useEffect(() => {
    void loadBackends();
  }, [loadBackends]);
  const apiData = asRecord(payload.data);
  const summary = asRecord(apiData.summary);
  const models = asArray(apiData.models).map(normalizeModel);
  const companySummaries = asArray(apiData.companies).length
    ? asArray(apiData.companies).map(normalizeCompanySummary)
    : asArray(payload.results).map(normalizeCompanySummary);
  const query = search.trim().toLowerCase();
  const filteredModels = models.filter((item) =>
    [item.model, item.appLabel, item.dbTable, String(item.count)].join(" ").toLowerCase().includes(query),
  );
  const filteredCompanies = companySummaries.filter((item) =>
    [item.name, item.code, item.status, item.summaryText].join(" ").toLowerCase().includes(query),
  );
  function resetFilters() {
    setSearch("");
  }
  function exportRows() {
    return [
      ...filteredModels.map((item) => ({
        Type: "Model",
        Name: item.model,
        Code: item.appLabel,
        Status: item.companyScoped ? t.yes : t.no,
        Count: item.count,
        Summary: item.dbTable,
      })),
      ...filteredCompanies.map((item) => ({
        Type: "Company",
        Name: item.name,
        Code: item.code,
        Status: item.status,
        Count: "",
        Summary: item.summaryText,
      })),
    ];
  }
  function buildTableHtml(rows: ReturnType<typeof exportRows>) {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    return `
      <table border="1" cellspacing="0" cellpadding="6">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) =>
                `<tr>${headers
                  .map((header) => `<td>${escapeHtml(row[header as keyof typeof row])}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}
        </tbody>
      </table>
    `;
  }
  function exportExcel() {
    const rows = exportRows();
    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }
    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml(rows)}
        </body>
      </html>
    `;
    const blob = new Blob([`\ufeff${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Mhamcloud-activity-backends-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function openPrintWindow(modeName: "print" | "pdf") {
    const rows = exportRows();
    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }
    if (modeName === "pdf") toast.info(t.pdfHint);
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!printWindow) return;
    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.reportTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              font-size: 12px;
              text-align: ${dir === "rtl" ? "right" : "left"};
              vertical-align: top;
            }
            th { background: #f1f5f9; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml(rows)}
        </body>
      </html>
    `);
    printWindow.document.close();
    window.setTimeout(() => printWindow.print(), 250);
  }
  if (loading) return <BackendsSkeleton />;
  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-3xl border-destructive/30 bg-card shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => void loadBackends({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-4xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.badge}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadBackends({ silent: true })}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.exportExcel}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("print")}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("pdf")}>
                  <FileText className="h-4 w-4" />
                  {t.pdf}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title={t.modelsCount} value={numberValue(summary.models_count, models.length)} description={t.fromLiveApi} icon={Database} />
          <MetricCard title={t.recordsCount} value={numberValue(summary.records_count)} description={t.fromLiveApi} icon={Layers3} />
          <MetricCard title={t.companiesWithRecords} value={numberValue(summary.companies_with_activity_records)} description={t.fromLiveApi} icon={Building2} />
          <MetricCard title={t.companiesLoaded} value={companySummaries.length} description={t.fromLiveApi} icon={Boxes} />
        </section>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="h-10 rounded-xl ps-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
                <Link href="/system/activity-profiles" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted">
                  <Boxes className="h-4 w-4" />
                  {t.activityProfiles}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.modelsTable}</CardTitle>
            <CardDescription>{t.modelsTableDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[920px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("w-[220px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.model}</TableHead>
                      <TableHead className={cn("w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.app}</TableHead>
                      <TableHead className={cn("w-[300px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.table}</TableHead>
                      <TableHead className={cn("w-[120px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.count}</TableHead>
                      <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.companyScoped}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredModels.length ? (
                      filteredModels.map((item) => (
                        <TableRow key={`${item.appLabel}-${item.model}`} className="h-[64px]">
                          <TableCell className={cn("px-4 align-middle text-sm font-medium", alignClass)}>{item.model}</TableCell>
                          <TableCell className={cn("px-4 align-middle text-sm", alignClass)}>{item.appLabel || "—"}</TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <code className="block truncate rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                              {item.dbTable || "—"}
                            </code>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle text-sm font-semibold tabular-nums", alignClass)}>
                            {formatInteger(item.count)}
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <Badge variant="outline" className="rounded-full">
                              {item.companyScoped ? t.yes : t.no}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                            <div className="rounded-full bg-muted p-4 text-muted-foreground">
                              <Inbox className="h-8 w-8" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{search ? t.noResultsTitle : t.emptyTitle}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">{search ? t.noResultsDesc : t.emptyDesc}</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.companiesTable}</CardTitle>
            <CardDescription>{t.companiesTableDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[980px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("w-[240px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.company}</TableHead>
                      <TableHead className={cn("w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.code}</TableHead>
                      <TableHead className={cn("w-[120px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.status}</TableHead>
                      <TableHead className={cn("w-[470px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.summary}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.length ? (
                      filteredCompanies.map((item) => (
                        <TableRow key={item.id} className="h-[68px]">
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm font-medium">{item.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">#{item.id}</span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle text-sm", alignClass)}>{item.code || "—"}</TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <Badge variant="outline" className="rounded-full">{item.status || "—"}</Badge>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{item.summaryText}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-48 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                            <div className="rounded-full bg-muted p-4 text-muted-foreground">
                              <Inbox className="h-8 w-8" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{search ? t.noResultsTitle : t.emptyTitle}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">{search ? t.noResultsDesc : t.emptyDesc}</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
