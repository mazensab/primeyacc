"use client";
/* ============================================================
   📂 primey_frontend/app/system/integrations/api-keys/page.tsx
   🔑 Mhamcloud — System Integration API Keys
   ------------------------------------------------------------
   ✅ Approved /system/companies visual pattern
   ✅ Real API only: GET /api/system/integration-api-keys/
   ✅ Header/actions + KPI cards + filters/table
   ✅ Search, status filter, environment filter, sorting, reset
   ✅ Excel .xls export
   ✅ Web print + PDF through browser print dialog
   ✅ Skeleton loading
   ✅ Empty / no results / API warning states
   ✅ Arabic/English via primey-locale
   ✅ English digits preserved
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */
import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Loader2,
  PlugZap,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
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
import { API_PATHS } from "@/lib/api/endpoints";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type SortKey = "newest" | "oldest" | "name" | "environment";
type StatusFilter = "all" | "active" | "disabled" | "revoked" | "expired";
type EnvironmentFilter = "all" | "live" | "test";
type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  status: string;
  environment: string;
  company: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string | null;
  expiresAt: string | null;
};
const statusFilters: StatusFilter[] = ["all", "active", "disabled", "revoked", "expired"];
const environmentFilters: EnvironmentFilter[] = ["all", "live", "test"];
const translations = {
  ar: {
    title: "مفاتيح API",
    subtitle:
      "إدارة مفاتيح الربط الخارجي للشركات والواجهات المتكاملة مع النظام، مع متابعة الحالة والبيئة والصلاحيات.",
    badge: "التكاملات",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    center: "مركز التكاملات",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث باسم المفتاح أو الشركة أو prefix أو الصلاحيات...",
    all: "الكل",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    environmentSort: "البيئة",
    open: "فتح",
    totalKeys: "إجمالي المفاتيح",
    activeKeys: "النشطة",
    liveKeys: "Live",
    testKeys: "Test",
    revokedKeys: "الملغاة",
    fromLiveApi: "من API حقيقي",
    tableTitle: "قائمة مفاتيح API",
    tableDesc:
      "جدول مفاتيح التكامل المسجلة في Mhamcloud مع البيئة والحالة والصلاحيات وآخر استخدام.",
    keyName: "المفتاح",
    prefix: "Prefix",
    company: "الشركة",
    environment: "البيئة",
    scopes: "الصلاحيات",
    status: "الحالة",
    lastUsedAt: "آخر استخدام",
    createdAt: "تاريخ الإنشاء",
    expiresAt: "تاريخ الانتهاء",
    active: "نشط",
    disabled: "معطل",
    revoked: "ملغي",
    expired: "منتهي",
    live: "Live",
    test: "Test",
    unknown: "غير محدد",
    noDataTitle: "لا توجد مفاتيح API",
    noDataDesc: "ستظهر مفاتيح التكامل هنا عند إنشائها من النظام.",
    noResultsTitle: "لا توجد مفاتيح API مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    warningTitle: "تعذر تحميل مفاتيح API",
    warningDesc: "تعذر جلب البيانات من API، وتم عرض الصفحة بدون تعطيل الواجهة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير مفاتيح API في Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    refreshed: "تم تحديث مفاتيح API.",
  },
  en: {
    title: "API Keys",
    subtitle:
      "Manage external integration keys for companies and system APIs, including status, environment, and scopes.",
    badge: "Integrations",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    center: "Integrations Center",
    reset: "Reset",
    searchPlaceholder: "Search by key name, company, prefix, or scopes...",
    all: "All",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    environmentSort: "Environment",
    open: "Open",
    totalKeys: "Total keys",
    activeKeys: "Active",
    liveKeys: "Live",
    testKeys: "Test",
    revokedKeys: "Revoked",
    fromLiveApi: "From real API",
    tableTitle: "API keys list",
    tableDesc:
      "Integration keys registered in Mhamcloud with environment, status, scopes, and last usage.",
    keyName: "Key",
    prefix: "Prefix",
    company: "Company",
    environment: "Environment",
    scopes: "Scopes",
    status: "Status",
    lastUsedAt: "Last used",
    createdAt: "Created at",
    expiresAt: "Expires at",
    active: "Active",
    disabled: "Disabled",
    revoked: "Revoked",
    expired: "Expired",
    live: "Live",
    test: "Test",
    unknown: "Unknown",
    noDataTitle: "No API keys",
    noDataDesc: "Integration keys will appear here when created from the system.",
    noResultsTitle: "No matching API keys",
    noResultsDesc: "Change the search or filters to show other results.",
    warningTitle: "Could not load API keys",
    warningDesc: "The API request failed, so the page was displayed without blocking the UI.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "Mhamcloud API Keys Report",
    generatedAt: "Generated at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    refreshed: "API keys refreshed.",
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
function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}
function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(toNumber(value)),
  );
}
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
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
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
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
    const message =
      normalizeText(record.message) ||
      normalizeText(record.detail) ||
      normalizeText(record.error) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return (payload || {}) as T;
}
function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.records)) return dataRecord.records;
  if (Array.isArray(metaRecord.results)) return metaRecord.results;
  return [];
}
function extractCount(payload: unknown) {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);
  const arrayCount = extractArray(payload).length;
  return toNumber(
    record.count ??
      record.total ??
      record.total_count ??
      dataRecord.count ??
      dataRecord.total ??
      dataRecord.total_count ??
      metaRecord.count ??
      metaRecord.total ??
      metaRecord.total_count,
    arrayCount,
  );
}
function normalizeNestedName(value: unknown, keys: string[] = ["name", "title", "full_name"]) {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  for (const key of keys) {
    const text = normalizeText(record[key]);
    if (text) return text;
  }
  return "";
}
function normalizeStatus(value: unknown) {
  if (typeof value === "boolean") return value ? "active" : "disabled";
  const text = normalizeText(value, "active").toLowerCase();
  if (text === "true" || text === "enabled") return "active";
  if (text === "false" || text === "inactive" || text === "disable") return "disabled";
  if (text === "revoke") return "revoked";
  if (text === "expire") return "expired";
  return text;
}
function normalizeEnvironment(value: unknown) {
  const text = normalizeText(value, "test").toLowerCase();
  if (text === "production" || text === "prod") return "live";
  if (text === "sandbox") return "test";
  return text === "live" ? "live" : "test";
}
function normalizeScopes(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\n]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}
function normalizeApiKey(value: unknown): ApiKeyRecord {
  const record = asRecord(value);
  const company = record.company || record.company_ref || record.company_detail || record.owner_company;
  return {
    id: normalizeText(record.id || record.uuid || record.pk),
    name: normalizeText(record.name || record.key_name || record.label || record.description, "—"),
    keyPrefix: normalizeText(record.key_prefix || record.prefix || record.public_prefix || record.masked_key, "—"),
    status: normalizeStatus(record.effective_status ?? record.status ?? record.state ?? record.is_active),
    environment: normalizeEnvironment(record.environment ?? record.env ?? record.mode),
    company:
      normalizeText(record.company_name) ||
      normalizeNestedName(company, ["name", "company_name", "title", "code"]) ||
      "—",
    scopes: normalizeScopes(record.scopes || record.permissions || record.allowed_scopes),
    lastUsedAt: normalizeText(record.last_used_at || record.last_used || record.used_at) || null,
    createdAt: normalizeText(record.created_at || record.created || record.inserted_at) || null,
    expiresAt: normalizeText(record.expires_at || record.expired_at || record.valid_until) || null,
  };
}
function getStatusLabel(value: string, locale: Locale) {
  const normalized = value.toLowerCase().replace(/[^a-z_]/g, "") as keyof (typeof translations)["ar"];
  const fallback = normalizeText(value, translations[locale].unknown);
  return normalizeText(translations[locale][normalized], fallback);
}
function getEnvironmentLabel(value: string, locale: Locale) {
  const normalized = value.toLowerCase().replace(/[^a-z_]/g, "") as keyof (typeof translations)["ar"];
  const fallback = normalizeText(value, translations[locale].unknown);
  return normalizeText(translations[locale][normalized], fallback);
}
function getStatusClass(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "disabled" || normalized === "expired") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "revoked") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}
function getEnvironmentClass(value: string) {
  return value.toLowerCase() === "live"
    ? "border-sky-200 bg-sky-50 text-sky-700"
    : "border-slate-200 bg-slate-50 text-slate-700";
}
function rowDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
function PillBadge({
  value,
  locale,
  type,
}: {
  value: string;
  locale: Locale;
  type: "status" | "environment";
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap rounded-full px-2.5 py-1 text-xs",
        type === "status" ? getStatusClass(value) : getEnvironmentClass(value),
      )}
    >
      {type === "status" ? getStatusLabel(value, locale) : getEnvironmentLabel(value, locale)}
    </Badge>
  );
}
function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {formatInteger(value)}
          </CardTitle>
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
function ApiKeysSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-8 w-72" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl">
          <CardHeader>
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
function EmptyState({
  title,
  description,
  showReset,
  resetLabel,
  onReset,
}: {
  title: string;
  description: string;
  showReset?: boolean;
  resetLabel: string;
  onReset: () => void;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {showReset ? (
        <Button variant="outline" size="sm" onClick={onReset} className="rounded-lg">
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}
export default function SystemIntegrationApiKeysPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [keys, setKeys] = React.useState<ApiKeyRecord[]>([]);
  const [apiTotal, setApiTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [apiWarning, setApiWarning] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [environment, setEnvironment] = React.useState<EnvironmentFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("newest");
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
  const loadApiKeys = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setApiWarning("");
        const payload = await fetchJson<unknown>(makeApiUrl(API_PATHS.systemIntegrationApiKeys.list));
        const rows = extractArray(payload).map(normalizeApiKey);
        setKeys(rows);
        setApiTotal(extractCount(payload));
        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.warningDesc;
        setApiWarning(message);
        setKeys([]);
        setApiTotal(0);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.refreshed, t.warningDesc],
  );
  React.useEffect(() => {
    void loadApiKeys();
  }, [loadApiKeys]);
  const resetFilters = React.useCallback(() => {
    setSearch("");
    setStatus("all");
    setEnvironment("all");
    setSort("newest");
  }, []);
  const filteredKeys = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = keys.filter((key) => {
      const haystack = [
        key.name,
        key.keyPrefix,
        key.company,
        key.environment,
        key.status,
        key.scopes.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (status !== "all" && key.status !== status) return false;
      if (environment !== "all" && key.environment !== environment) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      if (sort === "oldest") return rowDateValue(a.createdAt) - rowDateValue(b.createdAt);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "environment") return a.environment.localeCompare(b.environment);
      return rowDateValue(b.createdAt) - rowDateValue(a.createdAt);
    });
  }, [environment, keys, search, sort, status]);
  const stats = React.useMemo(() => {
    return {
      total: apiTotal || keys.length,
      active: keys.filter((key) => key.status === "active").length,
      live: keys.filter((key) => key.environment === "live").length,
      test: keys.filter((key) => key.environment === "test").length,
      revoked: keys.filter((key) => key.status === "revoked").length,
    };
  }, [apiTotal, keys]);
  const hasFilters = Boolean(search || status !== "all" || environment !== "all" || sort !== "newest");
  function buildExportRows() {
    return filteredKeys.map((key) => [
      key.name,
      key.keyPrefix,
      key.company,
      getEnvironmentLabel(key.environment, locale),
      getStatusLabel(key.status, locale),
      key.scopes.length ? key.scopes.join(", ") : "—",
      formatDate(key.lastUsedAt),
      formatDate(key.createdAt),
      formatDate(key.expiresAt),
    ]);
  }
  function buildTableHtml() {
    const headers = [
      t.keyName,
      t.prefix,
      t.company,
      t.environment,
      t.status,
      t.scopes,
      t.lastUsedAt,
      t.createdAt,
      t.expiresAt,
    ];
    const rows = buildExportRows();
    return `
      <table border="1" cellspacing="0" cellpadding="6">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    `;
  }
  function exportExcel() {
    const rows = buildExportRows();
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
          ${buildTableHtml()}
        </body>
      </html>
    `;
    const blob = new Blob([`\ufeff${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Mhamcloud-system-api-keys-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function openPrintWindow(mode: "print" | "pdf") {
    const rows = buildExportRows();
    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }
    if (mode === "pdf") {
      toast.info(t.pdfHint);
    }
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
          ${buildTableHtml()}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
  if (loading) return <ApiKeysSkeleton />;
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
                  onClick={() => void loadApiKeys({ silent: true })}
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
                <Button asChild className="rounded-xl">
                  <Link href="/system/integrations">
                    <KeyRound className="h-4 w-4" />
                    {t.center}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        {apiWarning ? (
          <Card className="rounded-2xl border-amber-200 bg-amber-50/70 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-4 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="rounded-full bg-amber-100 p-2">
                  <TriangleAlert className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{t.warningTitle}</p>
                  <p className="mt-1 text-xs text-amber-700">{apiWarning}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-fit rounded-xl bg-background"
                onClick={() => void loadApiKeys({ silent: true })}
                disabled={refreshing}
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {t.tryAgain}
              </Button>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalKeys} value={stats.total} description={t.fromLiveApi} icon={KeyRound} />
          <KpiCard title={t.activeKeys} value={stats.active} description={t.fromLiveApi} icon={ShieldCheck} />
          <KpiCard title={t.liveKeys} value={stats.live} description={t.fromLiveApi} icon={PlugZap} />
          <KpiCard title={t.revokedKeys} value={stats.revoked} description={t.fromLiveApi} icon={XCircle} />
        </div>
        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.tableTitle}</CardTitle>
                <CardDescription className="mt-2">{t.tableDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <KeyRound className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(filteredKeys.length)} {t.of} {formatInteger(apiTotal || keys.length)} {t.rows}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
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
                <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "all" ? t.all : getStatusLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={environment} onValueChange={(value) => setEnvironment(value as EnvironmentFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {environmentFilters.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "all" ? t.all : getEnvironmentLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[160px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                    <SelectItem value="environment">{t.environmentSort}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[980px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("h-11 w-[220px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.keyName}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[135px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.prefix}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.company}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[110px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.environment}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[110px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.status}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[220px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.scopes}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.lastUsedAt}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.createdAt}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKeys.length ? (
                      filteredKeys.map((key) => (
                        <TableRow key={key.id || key.keyPrefix || key.name} className="h-[64px]">
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {key.name || t.unknown}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                #{key.id || key.keyPrefix || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {key.keyPrefix || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {key.company || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                            <PillBadge value={key.environment} locale={locale} type="environment" />
                          </TableCell>
                          <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                            <PillBadge value={key.status} locale={locale} type="status" />
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {key.scopes.length ? key.scopes.join(", ") : "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {formatDate(key.lastUsedAt)}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {formatDate(key.createdAt)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <EmptyState
                            title={hasFilters ? t.noResultsTitle : t.noDataTitle}
                            description={hasFilters ? t.noResultsDesc : t.noDataDesc}
                            showReset={hasFilters}
                            resetLabel={t.reset}
                            onReset={resetFilters}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                {t.showing}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(filteredKeys.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(apiTotal || keys.length)}
                </span>{" "}
                {t.rows}
              </p>
              <Button asChild variant="outline" className="w-fit rounded-xl bg-background">
                <Link href="/system/integrations">
                  <KeyRound className="h-4 w-4" />
                  {t.center}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
