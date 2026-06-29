"use client";
/* ============================================================
   📂 primey_frontend/app/system/api-contracts/page.tsx
   🔗 Mhamcloud — System API Contracts Registry
   ------------------------------------------------------------
   ✅ Approved Premium Mhamcloud system page pattern
   ✅ Real API only: GET /api/system/release-readiness/
   ✅ Reads API contracts from data.contracts
   ✅ KPI cards + filters + contracts table
   ✅ Search, scope filter, method filter, critical filter, reset
   ✅ Excel .xls export
   ✅ Web print + PDF through browser print dialog
   ✅ Skeleton loading
   ✅ Error / Empty / No results states
   ✅ sonner toast
   ✅ Arabic/English via primey-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */
import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Globe2,
  Inbox,
  Layers3,
  Loader2,
  Network,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TableProperties,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
type ScopeFilter = "all" | "system" | "company" | "other";
type MethodFilter = "all" | "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type CriticalFilter = "all" | "critical" | "non_critical";
type SortKey = "default" | "key" | "module" | "scope" | "path";
type ApiContract = {
  key: string;
  title: string;
  module: string;
  scope: string;
  basePath: string;
  methods: string[];
  description: string;
  responseShape: string;
  companyScoped: boolean;
  releaseCritical: boolean;
};
type Summary = {
  contractsCount: number;
  systemScopedContracts: number;
  companyScopedContracts: number;
  checksCount: number;
  failedCount: number;
  warningCount: number;
};
const API_ENDPOINT = "/api/system/release-readiness/";
const translations = {
  ar: {
    title: "عقود API",
    subtitle:
      "سجل عقود API المسجلة في Mhamcloud للنظام والشركات من مصدر جاهزية الإصدار الحقيقي.",
    badge: "الجاهزية والربط",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    reset: "إعادة ضبط",
    dashboard: "لوحة النظام",
    readiness: "جاهزية الإصدار",
    searchPlaceholder: "ابحث بالمفتاح أو الوحدة أو المسار أو الوصف...",
    all: "الكل",
    system: "النظام",
    company: "الشركات",
    other: "أخرى",
    critical: "حرجة",
    nonCritical: "غير حرجة",
    scope: "النطاق",
    method: "الطريقة",
    importance: "الأهمية",
    sort: "الترتيب",
    defaultSort: "الافتراضي",
    keySort: "المفتاح",
    moduleSort: "الوحدة",
    scopeSort: "النطاق",
    pathSort: "المسار",
    totalContracts: "إجمالي العقود",
    systemContracts: "عقود النظام",
    companyContracts: "عقود الشركات",
    criticalContracts: "عقود حرجة",
    fromLiveApi: "من API حقيقي",
    tableTitle: "سجل عقود API",
    tableDesc:
      "مرجع العقود المسجلة في الباكند مع المسارات والطرق والنطاقات وشكل الاستجابة.",
    showing: "عرض",
    of: "من",
    rows: "عقد",
    key: "المفتاح",
    module: "الوحدة",
    basePath: "المسار",
    methods: "الطرق",
    responseShape: "شكل الاستجابة",
    description: "الوصف",
    contractVersion: "إصدار العقد",
    phase: "المرحلة",
    yes: "نعم",
    no: "لا",
    emptyTitle: "لا توجد عقود API",
    emptyDesc: "لم يرجع API أي عقود مسجلة.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل عقود API",
    errorDesc: "تأكد من صلاحيات النظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير عقود API في Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
    refreshed: "تم تحديث عقود API.",
    unknown: "غير معروف",
  },
  en: {
    title: "API Contracts",
    subtitle:
      "Mhamcloud registered API contract registry for system and company endpoints from the live release-readiness source.",
    badge: "Readiness & API",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    reset: "Reset",
    dashboard: "System dashboard",
    readiness: "Release readiness",
    searchPlaceholder: "Search key, module, path, or description...",
    all: "All",
    system: "System",
    company: "Company",
    other: "Other",
    critical: "Critical",
    nonCritical: "Non-critical",
    scope: "Scope",
    method: "Method",
    importance: "Importance",
    sort: "Sort",
    defaultSort: "Default",
    keySort: "Key",
    moduleSort: "Module",
    scopeSort: "Scope",
    pathSort: "Path",
    totalContracts: "Total contracts",
    systemContracts: "System contracts",
    companyContracts: "Company contracts",
    criticalContracts: "Critical contracts",
    fromLiveApi: "From live API",
    tableTitle: "API contract registry",
    tableDesc:
      "Registered backend contracts with paths, methods, scopes, and response shapes.",
    showing: "Showing",
    of: "of",
    rows: "contracts",
    key: "Key",
    module: "Module",
    basePath: "Base path",
    methods: "Methods",
    responseShape: "Response shape",
    description: "Description",
    contractVersion: "Contract version",
    phase: "Phase",
    yes: "Yes",
    no: "No",
    emptyTitle: "No API contracts",
    emptyDesc: "The API returned no registered contracts.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show more results.",
    errorTitle: "Could not load API contracts",
    errorDesc: "Make sure you have system permission and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "Mhamcloud API Contracts Report",
    generatedAt: "Generated at",
    refreshed: "API contracts refreshed.",
    unknown: "Unknown",
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
function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}
async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(makeApiUrl(path), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
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
    throw new Error(
      text(record.message) ||
        text(record.detail) ||
        text(record.error) ||
        `Request failed with status ${response.status}`,
    );
  }
  return (payload || {}) as T;
}
function normalizeMethods(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}
function normalizeContract(value: unknown, index: number): ApiContract {
  const record = asRecord(value);
  const basePath = text(record.base_path || record.path || record.url);
  const scope = text(
    record.scope || record.access_scope,
    basePath.includes("/company/") ? "company" : "system",
  ).toLowerCase();
  return {
    key: text(record.key || record.code || record.id, `contract-${index + 1}`),
    title: text(record.title || record.label || record.name || record.key, `Contract ${index + 1}`),
    module: text(record.module || record.app || record.service || record.title || record.key, "—"),
    scope,
    basePath,
    methods: normalizeMethods(record.methods || record.method || record.http_methods),
    description: text(record.description || record.summary || record.message),
    responseShape: text(record.response_shape || record.responseShape || record.shape, "object"),
    companyScoped: Boolean(record.company_scoped || record.is_company_scoped || scope === "company"),
    releaseCritical: Boolean(record.release_critical || record.is_release_critical || record.critical),
  };
}
function scopeLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const normalized = value.toLowerCase();
  if (normalized === "system") return t.system;
  if (normalized === "company") return t.company;
  return t.other;
}
function scopeBadgeClass(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "system") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
  if (normalized === "company") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}
function methodBadgeClass(value: string) {
  if (value === "GET") return "border-blue-500/30 text-blue-700 dark:text-blue-300";
  if (value === "POST") return "border-emerald-500/30 text-emerald-700 dark:text-emerald-300";
  if (value === "PATCH" || value === "PUT") return "border-amber-500/30 text-amber-700 dark:text-amber-300";
  if (value === "DELETE") return "border-destructive/30 text-destructive";
  return "border-border text-muted-foreground";
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
function ApiContractsSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Card className="rounded-3xl">
          <CardHeader className="space-y-4">
            <Skeleton className="h-7 w-44 rounded-full" />
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-5 w-full max-w-3xl rounded-xl" />
          </CardHeader>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-5 w-32 rounded-xl" />
                <Skeleton className="h-9 w-20 rounded-xl" />
                <Skeleton className="h-4 w-40 rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-5">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
export default function SystemApiContractsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [payload, setPayload] = React.useState<ApiRecord>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [scopeFilter, setScopeFilter] = React.useState<ScopeFilter>("all");
  const [methodFilter, setMethodFilter] = React.useState<MethodFilter>("all");
  const [criticalFilter, setCriticalFilter] = React.useState<CriticalFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("default");
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
  const loadContracts = React.useCallback(
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
    void loadContracts();
  }, [loadContracts]);
  const apiData = asRecord(payload.data);
  const meta = asRecord(payload.meta);
  const summaryRecord = asRecord(apiData.summary);
  const contracts = React.useMemo(
    () => asArray(apiData.contracts).map(normalizeContract),
    [apiData.contracts],
  );
  const summary: Summary = {
    contractsCount: numberValue(summaryRecord.contracts_count, contracts.length),
    systemScopedContracts: numberValue(
      summaryRecord.system_scoped_contracts,
      contracts.filter((item) => item.scope === "system").length,
    ),
    companyScopedContracts: numberValue(
      summaryRecord.company_scoped_contracts,
      contracts.filter((item) => item.companyScoped).length,
    ),
    checksCount: numberValue(summaryRecord.checks_count),
    failedCount: numberValue(summaryRecord.failed_count),
    warningCount: numberValue(summaryRecord.warning_count),
  };
  const phase = text(apiData.phase, t.unknown);
  const contractVersion = text(meta.contract_version, "v1");
  const criticalCount = contracts.filter((item) => item.releaseCritical).length;
  const filteredContracts = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return contracts
      .filter((item) => {
        const normalizedScope = item.scope.toLowerCase();
        const matchesScope =
          scopeFilter === "all" ||
          normalizedScope === scopeFilter ||
          (scopeFilter === "company" && item.companyScoped) ||
          (scopeFilter === "other" && normalizedScope !== "system" && normalizedScope !== "company");
        const matchesMethod =
          methodFilter === "all" || item.methods.map((method) => method.toUpperCase()).includes(methodFilter);
        const matchesCritical =
          criticalFilter === "all" ||
          (criticalFilter === "critical" && item.releaseCritical) ||
          (criticalFilter === "non_critical" && !item.releaseCritical);
        const haystack = [
          item.key,
          item.title,
          item.module,
          item.scope,
          item.basePath,
          item.methods.join(" "),
          item.description,
          item.responseShape,
        ]
          .join(" ")
          .toLowerCase();
        return matchesScope && matchesMethod && matchesCritical && (!query || haystack.includes(query));
      })
      .sort((first, second) => {
        if (sort === "key") return first.key.localeCompare(second.key);
        if (sort === "module") return first.module.localeCompare(second.module);
        if (sort === "scope") return first.scope.localeCompare(second.scope);
        if (sort === "path") return first.basePath.localeCompare(second.basePath);
        return 0;
      });
  }, [contracts, criticalFilter, methodFilter, scopeFilter, search, sort]);
  const hasFilters =
    Boolean(search) ||
    scopeFilter !== "all" ||
    methodFilter !== "all" ||
    criticalFilter !== "all" ||
    sort !== "default";
  function resetFilters() {
    setSearch("");
    setScopeFilter("all");
    setMethodFilter("all");
    setCriticalFilter("all");
    setSort("default");
  }
  function exportRows() {
    return filteredContracts.map((item) => ({
      Key: item.key,
      Module: item.module,
      Scope: item.scope,
      CompanyScoped: item.companyScoped ? t.yes : t.no,
      ReleaseCritical: item.releaseCritical ? t.yes : t.no,
      BasePath: item.basePath,
      Methods: item.methods.join(", "),
      ResponseShape: item.responseShape,
      Description: item.description,
    }));
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
          <p>${escapeHtml(t.phase)}: ${escapeHtml(phase)}</p>
          <p>${escapeHtml(t.contractVersion)}: ${escapeHtml(contractVersion)}</p>
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
    link.download = `Mhamcloud-api-contracts-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function openPrintWindow(mode: "print" | "pdf") {
    const rows = exportRows();
    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }
    if (mode === "pdf") toast.info(t.pdfHint);
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
          <p>${escapeHtml(t.phase)}: ${escapeHtml(phase)} — ${escapeHtml(t.contractVersion)}: ${escapeHtml(contractVersion)}</p>
          ${buildTableHtml(rows)}
        </body>
      </html>
    `);
    printWindow.document.close();
    window.setTimeout(() => printWindow.print(), 250);
  }
  if (loading) return <ApiContractsSkeleton />;
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
            <Button onClick={() => void loadContracts({ silent: true })} className="rounded-xl">
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
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full bg-background">
                    {t.phase}: {phase}
                  </Badge>
                  <Badge variant="outline" className="rounded-full bg-background">
                    {t.contractVersion}: {contractVersion}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadContracts({ silent: true })}
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
          <MetricCard title={t.totalContracts} value={summary.contractsCount || contracts.length} description={t.fromLiveApi} icon={Layers3} />
          <MetricCard title={t.systemContracts} value={summary.systemScopedContracts} description={t.fromLiveApi} icon={ShieldCheck} />
          <MetricCard title={t.companyContracts} value={summary.companyScopedContracts} description={t.fromLiveApi} icon={Building2} />
          <MetricCard title={t.criticalContracts} value={criticalCount} description={t.fromLiveApi} icon={CheckCircle2} />
        </section>
        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.tableTitle}</CardTitle>
                <CardDescription className="mt-2">{t.tableDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <Inbox className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(filteredContracts.length)} {t.of} {formatInteger(contracts.length)} {t.rows}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-10 rounded-xl ps-9"
                  />
                </div>
                <Select value={scopeFilter} onValueChange={(value) => setScopeFilter(value as ScopeFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="system">{t.system}</SelectItem>
                    <SelectItem value="company">{t.company}</SelectItem>
                    <SelectItem value="other">{t.other}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={methodFilter} onValueChange={(value) => setMethodFilter(value as MethodFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={criticalFilter} onValueChange={(value) => setCriticalFilter(value as CriticalFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="critical">{t.critical}</SelectItem>
                    <SelectItem value="non_critical">{t.nonCritical}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t.defaultSort}</SelectItem>
                    <SelectItem value="key">{t.keySort}</SelectItem>
                    <SelectItem value="module">{t.moduleSort}</SelectItem>
                    <SelectItem value="scope">{t.scopeSort}</SelectItem>
                    <SelectItem value="path">{t.pathSort}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
                <Link href="/system/release-readiness" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted">
                  <Network className="h-4 w-4" />
                  {t.readiness}
                </Link>
                <Link href="/system" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted">
                  <Globe2 className="h-4 w-4" />
                  {t.dashboard}
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1280px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("w-[170px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          {t.key}
                        </span>
                      </TableHead>
                      <TableHead className={cn("w-[180px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.module}</TableHead>
                      <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.scope}</TableHead>
                      <TableHead className={cn("w-[290px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.basePath}</TableHead>
                      <TableHead className={cn("w-[180px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.methods}</TableHead>
                      <TableHead className={cn("w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.responseShape}</TableHead>
                      <TableHead className={cn("w-[120px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.importance}</TableHead>
                      <TableHead className={cn("w-[260px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.description}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.length ? (
                      filteredContracts.map((item) => (
                        <TableRow key={item.key} className="h-[76px]">
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm font-semibold">{item.key}</span>
                            <span className="block truncate text-xs text-muted-foreground">{item.title}</span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm font-medium">{item.module}</span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <Badge variant="outline" className={cn("rounded-full", scopeBadgeClass(item.scope))}>
                              {scopeLabel(item.scope, locale)}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <code className="block truncate rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                              {item.basePath || "—"}
                            </code>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <div className="flex flex-wrap gap-1">
                              {item.methods.length ? (
                                item.methods.map((method) => (
                                  <Badge key={`${item.key}-${method}`} variant="outline" className={cn("rounded-full text-[11px]", methodBadgeClass(method.toUpperCase()))}>
                                    {method.toUpperCase()}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <Badge variant="secondary" className="rounded-full">
                              <TableProperties className="h-3.5 w-3.5" />
                              {item.responseShape}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <Badge variant="outline" className={cn("rounded-full", item.releaseCritical ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
                              {item.releaseCritical ? t.critical : t.nonCritical}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {item.description || "—"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-64 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                            <div className="rounded-full bg-muted p-4 text-muted-foreground">
                              <Inbox className="h-8 w-8" />
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {hasFilters ? t.noResultsTitle : t.emptyTitle}
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {hasFilters ? t.noResultsDesc : t.emptyDesc}
                              </p>
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
