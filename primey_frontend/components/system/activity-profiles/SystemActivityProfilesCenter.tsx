"use client";
/* ============================================================
   📂 primey_frontend/components/system/activity-profiles/SystemActivityProfilesCenter.tsx
   🧩 Mhamcloud — System Activity Profiles Center
   ------------------------------------------------------------
   ✅ Approved Premium Mhamcloud system page pattern
   ✅ Real API only:
      - GET /api/system/activity-profiles/
      - GET /api/system/activity-profiles/list/
   ✅ KPI cards + filters + table
   ✅ Search, status filter, activity type filter, sort, reset
   ✅ Excel .xls export
   ✅ Web print + PDF through browser print dialog
   ✅ Skeleton loading
   ✅ Error / Empty / No results states
   ✅ Arabic/English via primey-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */
import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpDown,
  Building2,
  CheckCircle2,
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
  TableProperties,
  TriangleAlert,
  XCircle,
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
type PageMode = "overview" | "list";
type ApiRecord = Record<string, unknown>;
type StatusFilter = "all" | "ACTIVE" | "INACTIVE";
type SortKey = "default" | "name" | "code" | "type" | "companies";
type ActivityProfile = {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  description: string;
  activityType: string;
  businessType: string;
  sector: string;
  status: string;
  statusLabel: string;
  isActive: boolean;
  companiesCount: number;
  modules: string[];
  features: string[];
  createdAt: string;
  updatedAt: string;
};
type Summary = {
  total: number;
  active: number;
  inactive: number;
  companiesCount: number;
  typesCount: number;
};
const ENDPOINTS: Record<PageMode, string> = {
  overview: "/api/system/activity-profiles/",
  list: "/api/system/activity-profiles/list/",
};
const translations = {
  ar: {
    overviewTitle: "أنشطة الشركات",
    listTitle: "قائمة أنشطة الشركات",
    overviewSubtitle:
      "مركز مراقبة ملفات الأنشطة المرتبطة بالشركات ومسارات التخصيص من API النظام الحقيقي.",
    listSubtitle:
      "قائمة تفصيلية لملفات أنشطة الشركات مع البحث والفرز والتصدير.",
    badge: "الجاهزية والربط",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    reset: "إعادة ضبط",
    activityBackends: "خلفيات الأنشطة",
    apiContracts: "عقود API",
    searchPlaceholder: "ابحث بالاسم أو الكود أو النوع أو الوصف...",
    all: "الكل",
    active: "نشط",
    inactive: "غير نشط",
    status: "الحالة",
    activityType: "نوع النشاط",
    sort: "الترتيب",
    defaultSort: "الافتراضي",
    nameSort: "الاسم",
    codeSort: "الكود",
    typeSort: "نوع النشاط",
    companiesSort: "عدد الشركات",
    totalProfiles: "إجمالي الملفات",
    activeProfiles: "ملفات نشطة",
    inactiveProfiles: "ملفات غير نشطة",
    companiesLinked: "الشركات المرتبطة",
    fromLiveApi: "من API حقيقي",
    tableTitle: "ملفات أنشطة الشركات",
    tableDesc: "ملفات الأنشطة المسجلة في النظام مع عدد الشركات والميزات والوحدات.",
    showing: "عرض",
    of: "من",
    rows: "ملف",
    code: "الكود",
    name: "الاسم",
    sector: "القطاع",
    companies: "الشركات",
    modules: "الوحدات",
    features: "الميزات",
    description: "الوصف",
    details: "التفاصيل",
    yes: "نعم",
    no: "لا",
    emptyTitle: "لا توجد ملفات أنشطة",
    emptyDesc: "لم يرجع API أي ملفات أنشطة.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل أنشطة الشركات",
    errorDesc: "تأكد من صلاحيات النظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير أنشطة الشركات في Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
    refreshed: "تم تحديث أنشطة الشركات.",
    unknown: "غير معروف",
  },
  en: {
    overviewTitle: "Activity Profiles",
    listTitle: "Activity Profiles List",
    overviewSubtitle:
      "System monitoring center for company activity profiles and specialization paths from the live system API.",
    listSubtitle:
      "Detailed company activity profile list with search, sorting, and export.",
    badge: "Readiness & API",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    reset: "Reset",
    activityBackends: "Activity Backends",
    apiContracts: "API Contracts",
    searchPlaceholder: "Search name, code, type, or description...",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    status: "Status",
    activityType: "Activity type",
    sort: "Sort",
    defaultSort: "Default",
    nameSort: "Name",
    codeSort: "Code",
    typeSort: "Activity type",
    companiesSort: "Companies count",
    totalProfiles: "Total profiles",
    activeProfiles: "Active profiles",
    inactiveProfiles: "Inactive profiles",
    companiesLinked: "Linked companies",
    fromLiveApi: "From live API",
    tableTitle: "Company activity profiles",
    tableDesc: "Registered system activity profiles with companies, features, and modules.",
    showing: "Showing",
    of: "of",
    rows: "profiles",
    code: "Code",
    name: "Name",
    sector: "Sector",
    companies: "Companies",
    modules: "Modules",
    features: "Features",
    description: "Description",
    details: "Details",
    yes: "Yes",
    no: "No",
    emptyTitle: "No activity profiles",
    emptyDesc: "The API returned no activity profiles.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show more results.",
    errorTitle: "Could not load activity profiles",
    errorDesc: "Make sure you have system permission and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "Mhamcloud Activity Profiles Report",
    generatedAt: "Generated at",
    refreshed: "Activity profiles refreshed.",
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
function boolValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["1", "true", "yes", "active"].includes(value.toLowerCase());
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
function listText(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  if (isRecord(value)) {
    return Object.keys(value).filter(Boolean);
  }
  const raw = text(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
function normalizeProfile(value: unknown, index: number): ActivityProfile {
  const record = asRecord(value);
  const id = numberValue(record.id || record.pk, index + 1);
  const status = text(record.status, boolValue(record.is_active, true) ? "ACTIVE" : "INACTIVE").toUpperCase();
  return {
    id,
    code: text(record.code || record.key || record.slug, `profile-${id}`),
    name: text(record.display_name || record.name || record.title || record.label, `Profile ${id}`),
    nameAr: text(record.name_ar),
    nameEn: text(record.name_en),
    description: text(record.description || record.notes),
    activityType: text(record.activity_type || record.business_type || record.sector || record.category),
    businessType: text(record.business_type || record.activity_type),
    sector: text(record.sector || record.category),
    status,
    statusLabel: text(record.status_label, status),
    isActive: boolValue(record.is_active, status === "ACTIVE"),
    companiesCount: numberValue(record.companies_count || record.company_count),
    modules: listText(record.modules),
    features: listText(record.features),
    createdAt: text(record.created_at),
    updatedAt: text(record.updated_at),
  };
}
function statusLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const normalized = value.toUpperCase();
  if (normalized === "ACTIVE") return t.active;
  if (normalized === "INACTIVE") return t.inactive;
  return value || t.unknown;
}
function statusBadgeClass(value: string) {
  const normalized = value.toUpperCase();
  if (normalized === "ACTIVE") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (normalized === "INACTIVE") {
    return "border-muted-foreground/30 bg-muted text-muted-foreground";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
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
function ActivityProfilesSkeleton() {
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
export function SystemActivityProfilesCenter({ mode = "overview" }: { mode?: PageMode }) {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [payload, setPayload] = React.useState<ApiRecord>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("default");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";
  const pageTitle = mode === "list" ? t.listTitle : t.overviewTitle;
  const pageSubtitle = mode === "list" ? t.listSubtitle : t.overviewSubtitle;
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
  const loadProfiles = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const data = await fetchJson<ApiRecord>(ENDPOINTS[mode]);
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
    [mode, t.errorDesc, t.refreshed],
  );
  React.useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);
  const apiData = asRecord(payload.data);
  const rawResults = asArray(apiData.results).length ? asArray(apiData.results) : asArray(payload.results);
  const profiles = rawResults.map(normalizeProfile);
  const summaryRecord = asRecord(apiData.summary);
  const summary: Summary = {
    total: numberValue(summaryRecord.total, profiles.length),
    active: numberValue(summaryRecord.active, profiles.filter((item) => item.isActive).length),
    inactive: numberValue(summaryRecord.inactive, profiles.filter((item) => !item.isActive).length),
    companiesCount: numberValue(summaryRecord.companies_count, profiles.reduce((sum, item) => sum + item.companiesCount, 0)),
    typesCount: numberValue(summaryRecord.types_count, new Set(profiles.map((item) => item.activityType).filter(Boolean)).size),
  };
  const activityTypes = Array.from(
    new Set(
      [
        ...asArray(asRecord(apiData.choices).activity_types)
          .map((item) => text(asRecord(item).value || asRecord(item).label))
          .filter(Boolean),
        ...profiles.map((item) => item.activityType).filter(Boolean),
      ],
    ),
  );
  const filteredProfiles = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles
      .filter((item) => {
        const matchesStatus =
          statusFilter === "all" ||
          item.status.toUpperCase() === statusFilter ||
          (statusFilter === "ACTIVE" && item.isActive) ||
          (statusFilter === "INACTIVE" && !item.isActive);
        const matchesType = typeFilter === "all" || item.activityType === typeFilter;
        const haystack = [
          item.code,
          item.name,
          item.nameAr,
          item.nameEn,
          item.activityType,
          item.businessType,
          item.sector,
          item.description,
          item.modules.join(" "),
          item.features.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return matchesStatus && matchesType && (!query || haystack.includes(query));
      })
      .sort((first, second) => {
        if (sort === "name") return first.name.localeCompare(second.name);
        if (sort === "code") return first.code.localeCompare(second.code);
        if (sort === "type") return first.activityType.localeCompare(second.activityType);
        if (sort === "companies") return second.companiesCount - first.companiesCount;
        return 0;
      });
  }, [profiles, search, sort, statusFilter, typeFilter]);
  const hasFilters = Boolean(search) || statusFilter !== "all" || typeFilter !== "all" || sort !== "default";
  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSort("default");
  }
  function exportRows() {
    return filteredProfiles.map((item) => ({
      Code: item.code,
      Name: item.name,
      ActivityType: item.activityType,
      Sector: item.sector,
      Status: item.status,
      IsActive: item.isActive ? t.yes : t.no,
      CompaniesCount: item.companiesCount,
      Modules: item.modules.join(", "),
      Features: item.features.join(", "),
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
    link.download = `Mhamcloud-activity-profiles-${new Date().toISOString().slice(0, 10)}.xls`;
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
  if (loading) return <ActivityProfilesSkeleton />;
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
            <Button onClick={() => void loadProfiles({ silent: true })} className="rounded-xl">
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
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{pageTitle}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{pageSubtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadProfiles({ silent: true })}
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
          <MetricCard title={t.totalProfiles} value={summary.total || profiles.length} description={t.fromLiveApi} icon={Layers3} />
          <MetricCard title={t.activeProfiles} value={summary.active} description={t.fromLiveApi} icon={CheckCircle2} />
          <MetricCard title={t.inactiveProfiles} value={summary.inactive} description={t.fromLiveApi} icon={XCircle} />
          <MetricCard title={t.companiesLinked} value={summary.companiesCount} description={t.fromLiveApi} icon={Building2} />
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
                {t.showing} {formatInteger(filteredProfiles.length)} {t.of} {formatInteger(profiles.length)} {t.rows}
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
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="ACTIVE">{t.active}</SelectItem>
                    <SelectItem value="INACTIVE">{t.inactive}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    {activityTypes.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t.defaultSort}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                    <SelectItem value="code">{t.codeSort}</SelectItem>
                    <SelectItem value="type">{t.typeSort}</SelectItem>
                    <SelectItem value="companies">{t.companiesSort}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
                <Link href="/system/activity-backends" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted">
                  <Activity className="h-4 w-4" />
                  {t.activityBackends}
                </Link>
                <Link href="/system/api-contracts" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted">
                  <TableProperties className="h-4 w-4" />
                  {t.apiContracts}
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1180px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          {t.code}
                        </span>
                      </TableHead>
                      <TableHead className={cn("w-[230px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.name}</TableHead>
                      <TableHead className={cn("w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.activityType}</TableHead>
                      <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.status}</TableHead>
                      <TableHead className={cn("w-[110px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.companies}</TableHead>
                      <TableHead className={cn("w-[180px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.modules}</TableHead>
                      <TableHead className={cn("w-[230px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.description}</TableHead>
                      <TableHead className={cn("w-[120px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.details}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.length ? (
                      filteredProfiles.map((item) => (
                        <TableRow key={item.id} className="h-[76px]">
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm font-semibold">{item.code}</span>
                            <span className="block truncate text-xs text-muted-foreground">#{item.id}</span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm font-medium">{item.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {locale === "ar" ? item.nameEn : item.nameAr}
                            </span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm">{item.activityType || item.businessType || "—"}</span>
                            <span className="block truncate text-xs text-muted-foreground">{item.sector}</span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(item.status))}>
                              {statusLabel(item.status, locale)}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="text-sm font-semibold tabular-nums">{formatInteger(item.companiesCount)}</span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {item.modules.length ? item.modules.join(", ") : item.features.join(", ") || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {item.description || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <Link
                              href={`/system/activity-profiles/${item.id}`}
                              className="inline-flex h-9 items-center rounded-xl border bg-background px-3 text-xs font-medium hover:bg-muted"
                            >
                              {t.details}
                            </Link>
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
                              <h3 className="font-semibold">{hasFilters ? t.noResultsTitle : t.emptyTitle}</h3>
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
