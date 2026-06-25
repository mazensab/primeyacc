"use client";
/* ============================================================
   📂 primey_frontend/app/system/business-controls/page.tsx
   🧩 PrimeyAcc — System Business Controls Center
   ------------------------------------------------------------
   ✅ Premium PrimeyCare admin pattern adapted for PrimeyAcc
   ✅ System business controls module center page
   ✅ Real API only: GET /api/system/business-controls/
   ✅ KPI cards + quick actions + business controls tables
   ✅ Search, type filter, status/severity filter, sorting, reset
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
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  History,
  Inbox,
  KeyRound,
  Layers3,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
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
type ApiRecord = Record<string, unknown>;
type RowType = "all" | "audit" | "idempotency" | "reference";
type SortKey = "newest" | "company" | "type" | "status";
type UnifiedRow = {
  id: string;
  numericId: number;
  type: "audit" | "idempotency" | "reference";
  companyName: string;
  companyCode: string;
  primary: string;
  secondary: string;
  status: string;
  severity: string;
  source: string;
  countValue: number;
  message: string;
  createdAt: string;
  updatedAt: string;
};
type Summary = {
  auditEventsCount: number;
  auditWarningCount: number;
  auditCriticalCount: number;
  idempotencyKeysCount: number;
  idempotencyStartedCount: number;
  idempotencySucceededCount: number;
  idempotencyFailedCount: number;
  idempotencyExpiredCount: number;
  referenceSequencesCount: number;
  activeReferenceSequencesCount: number;
  companiesCount: number;
  companiesWithAuditEvents: number;
  companiesWithIdempotencyKeys: number;
  companiesWithReferenceSequences: number;
};
const API_ENDPOINT = "/api/system/business-controls/";
const translations = {
  ar: {
    pageTitle: "ضوابط الأعمال",
    pageSubtitle:
      "مركز مراقبة أحداث التدقيق ومفاتيح منع التكرار وتسلسلات المراجع من API النظام الحقيقي.",
    badge: "النظام والحوكمة",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    reset: "إعادة ضبط",
    apiContracts: "عقود API",
    releaseReadiness: "جاهزية الإطلاق",
    totalAuditEvents: "أحداث التدقيق",
    criticalAuditEvents: "أحداث حرجة",
    idempotencyKeys: "مفاتيح منع التكرار",
    referenceSequences: "تسلسلات المراجع",
    fromLiveApi: "من API حقيقي",
    searchPlaceholder: "ابحث بالشركة أو الحدث أو المفتاح أو المرجع أو الرسالة...",
    all: "الكل",
    audit: "التدقيق",
    idempotency: "منع التكرار",
    reference: "المراجع",
    type: "النوع",
    status: "الحالة",
    sort: "الترتيب",
    newest: "الأحدث",
    company: "الشركة",
    typeSort: "النوع",
    statusSort: "الحالة",
    businessControlsTable: "سجل ضوابط الأعمال",
    businessControlsDesc:
      "آخر أحداث التدقيق ومفاتيح منع التكرار وتسلسلات المراجع المسجلة في النظام.",
    showing: "عرض",
    of: "من",
    rows: "سجل",
    companyName: "الشركة",
    primary: "العنصر",
    secondary: "التفاصيل",
    source: "المصدر",
    message: "الرسالة",
    createdAt: "تاريخ الإنشاء",
    auditEvents: "أحداث التدقيق",
    idempotencyTable: "مفاتيح منع التكرار",
    referenceTable: "تسلسلات المراجع",
    latestAudit: "آخر أحداث التدقيق",
    latestKeys: "آخر مفاتيح منع التكرار",
    latestRefs: "آخر تسلسلات المراجع",
    active: "نشط",
    inactive: "غير نشط",
    started: "بدأ",
    succeeded: "ناجح",
    failed: "فشل",
    info: "معلومة",
    warning: "تحذير",
    critical: "حرج",
    emptyTitle: "لا توجد بيانات ضوابط",
    emptyDesc: "لم يرجع API أي سجلات لضوابط الأعمال.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل ضوابط الأعمال",
    errorDesc: "تأكد من صلاحيات النظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير ضوابط الأعمال في PrimeyAcc",
    generatedAt: "تاريخ الإنشاء",
    refreshed: "تم تحديث ضوابط الأعمال.",
    unknown: "غير معروف",
    notAvailable: "—",
  },
  en: {
    pageTitle: "Business Controls",
    pageSubtitle:
      "System monitoring center for audit events, idempotency keys, and reference sequences from the live system API.",
    badge: "System Governance",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    reset: "Reset",
    apiContracts: "API Contracts",
    releaseReadiness: "Release Readiness",
    totalAuditEvents: "Audit events",
    criticalAuditEvents: "Critical events",
    idempotencyKeys: "Idempotency keys",
    referenceSequences: "Reference sequences",
    fromLiveApi: "From live API",
    searchPlaceholder: "Search company, event, key, reference, or message...",
    all: "All",
    audit: "Audit",
    idempotency: "Idempotency",
    reference: "References",
    type: "Type",
    status: "Status",
    sort: "Sort",
    newest: "Newest",
    company: "Company",
    typeSort: "Type",
    statusSort: "Status",
    businessControlsTable: "Business controls log",
    businessControlsDesc:
      "Latest audit events, idempotency keys, and reference sequences recorded in the system.",
    showing: "Showing",
    of: "of",
    rows: "rows",
    companyName: "Company",
    primary: "Item",
    secondary: "Details",
    source: "Source",
    message: "Message",
    createdAt: "Created at",
    auditEvents: "Audit events",
    idempotencyTable: "Idempotency keys",
    referenceTable: "Reference sequences",
    latestAudit: "Latest audit events",
    latestKeys: "Latest idempotency keys",
    latestRefs: "Latest reference sequences",
    active: "Active",
    inactive: "Inactive",
    started: "Started",
    succeeded: "Succeeded",
    failed: "Failed",
    info: "Info",
    warning: "Warning",
    critical: "Critical",
    emptyTitle: "No business controls data",
    emptyDesc: "The API returned no business control records.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show more results.",
    errorTitle: "Could not load business controls",
    errorDesc: "Make sure you have system permission and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "PrimeyAcc Business Controls Report",
    generatedAt: "Generated at",
    refreshed: "Business controls refreshed.",
    unknown: "Unknown",
    notAvailable: "—",
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
function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}
function normalizeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
function normalizeBool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["1", "true", "yes", "active", "succeeded"].includes(value.toLowerCase());
  }
  return fallback;
}
function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(normalizeNumber(value)),
  );
}
function formatDateTime(value: unknown, locale: Locale) {
  const raw = normalizeText(value);
  if (!raw) return translations[locale].notAvailable;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
      normalizeText(record.message) ||
        normalizeText(record.detail) ||
        normalizeText(record.error) ||
        `Request failed with status ${response.status}`,
    );
  }
  return (payload || {}) as T;
}
function getCompanyName(value: unknown, locale: Locale) {
  const company = asRecord(value);
  return (
    normalizeText(company.display_name) ||
    normalizeText(company.name) ||
    normalizeText(company.company_name) ||
    normalizeText(company.company_code) ||
    translations[locale].unknown
  );
}
function getCompanyCode(value: unknown) {
  const company = asRecord(value);
  return normalizeText(company.company_code) || normalizeText(company.code);
}
function normalizeAuditEvent(value: unknown, index: number, locale: Locale): UnifiedRow {
  const item = asRecord(value);
  const company = item.company;
  const sourceApp = normalizeText(item.source_app);
  const sourceModel = normalizeText(item.source_model);
  const action = normalizeText(item.action);
  const severity = normalizeText(item.severity, "info").toLowerCase();
  return {
    id: `audit-${normalizeText(item.id, String(index + 1))}`,
    numericId: normalizeNumber(item.id, index + 1),
    type: "audit",
    companyName: getCompanyName(company, locale),
    companyCode: getCompanyCode(company),
    primary: normalizeText(item.event_type, translations[locale].audit),
    secondary: [sourceApp, sourceModel, action].filter(Boolean).join(" / "),
    status: severity,
    severity,
    source: [sourceApp, sourceModel].filter(Boolean).join(" / "),
    countValue: 0,
    message:
      normalizeText(item.message) ||
      normalizeText(item.object_reference) ||
      normalizeText(item.request_id) ||
      translations[locale].notAvailable,
    createdAt: normalizeText(item.created_at),
    updatedAt: normalizeText(item.created_at),
  };
}
function normalizeIdempotency(value: unknown, index: number, locale: Locale): UnifiedRow {
  const item = asRecord(value);
  const company = item.company;
  const status = normalizeText(item.status, "started").toLowerCase();
  const scope = normalizeText(item.scope);
  const operation = normalizeText(item.operation);
  return {
    id: `key-${normalizeText(item.id, String(index + 1))}`,
    numericId: normalizeNumber(item.id, index + 1),
    type: "idempotency",
    companyName: getCompanyName(company, locale),
    companyCode: getCompanyCode(company),
    primary: normalizeText(item.key, translations[locale].idempotency),
    secondary: [scope, operation].filter(Boolean).join(" / "),
    status,
    severity: "",
    source: scope,
    countValue: 0,
    message:
      normalizeText(item.error_message) ||
      normalizeText(item.request_hash) ||
      normalizeText(item.completed_at) ||
      translations[locale].notAvailable,
    createdAt: normalizeText(item.created_at),
    updatedAt: normalizeText(item.updated_at),
  };
}
function normalizeReference(value: unknown, index: number, locale: Locale): UnifiedRow {
  const item = asRecord(value);
  const company = item.company;
  const isActive = normalizeBool(item.is_active, true);
  const currentNumber = normalizeNumber(item.current_number);
  return {
    id: `ref-${normalizeText(item.id, String(index + 1))}`,
    numericId: normalizeNumber(item.id, index + 1),
    type: "reference",
    companyName: getCompanyName(company, locale),
    companyCode: getCompanyCode(company),
    primary: normalizeText(item.scope, translations[locale].reference),
    secondary: normalizeText(item.prefix),
    status: isActive ? "active" : "inactive",
    severity: "",
    source: normalizeText(item.prefix),
    countValue: currentNumber,
    message:
      normalizeText(item.description) ||
      `${normalizeText(item.prefix)}-${formatInteger(currentNumber)}`,
    createdAt: normalizeText(item.created_at),
    updatedAt: normalizeText(item.updated_at),
  };
}
function rowTypeLabel(type: UnifiedRow["type"], locale: Locale) {
  const t = translations[locale];
  if (type === "audit") return t.audit;
  if (type === "idempotency") return t.idempotency;
  return t.reference;
}
function statusLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const normalized = value.toLowerCase();
  if (normalized === "active") return t.active;
  if (normalized === "inactive") return t.inactive;
  if (normalized === "started") return t.started;
  if (normalized === "succeeded") return t.succeeded;
  if (normalized === "failed") return t.failed;
  if (normalized === "info") return t.info;
  if (normalized === "warning") return t.warning;
  if (normalized === "critical") return t.critical;
  return value || t.unknown;
}
function statusBadgeClass(value: string) {
  const normalized = value.toLowerCase();
  if (["active", "succeeded", "info"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (["warning", "started"].includes(normalized)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (["critical", "failed"].includes(normalized)) {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-muted-foreground/30 bg-muted text-muted-foreground";
}
function typeBadgeClass(value: UnifiedRow["type"]) {
  if (value === "audit") return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (value === "idempotency") return "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300";
  return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300";
}
function extractRows(payload: ApiRecord, locale: Locale): UnifiedRow[] {
  const data = asRecord(payload.data);
  const auditRows = asArray(data.latest_audit_events).map((item, index) =>
    normalizeAuditEvent(item, index, locale),
  );
  const keyRows = asArray(data.latest_idempotency_keys).map((item, index) =>
    normalizeIdempotency(item, index, locale),
  );
  const referenceRows = asArray(data.reference_sequences).map((item, index) =>
    normalizeReference(item, index, locale),
  );
  return [...auditRows, ...keyRows, ...referenceRows];
}
function extractSummary(payload: ApiRecord, rows: UnifiedRow[]): Summary {
  const summary = asRecord(asRecord(payload.data).summary);
  return {
    auditEventsCount: normalizeNumber(
      summary.audit_events_count,
      rows.filter((row) => row.type === "audit").length,
    ),
    auditWarningCount: normalizeNumber(summary.audit_warning_count),
    auditCriticalCount: normalizeNumber(summary.audit_critical_count),
    idempotencyKeysCount: normalizeNumber(
      summary.idempotency_keys_count,
      rows.filter((row) => row.type === "idempotency").length,
    ),
    idempotencyStartedCount: normalizeNumber(summary.idempotency_started_count),
    idempotencySucceededCount: normalizeNumber(summary.idempotency_succeeded_count),
    idempotencyFailedCount: normalizeNumber(summary.idempotency_failed_count),
    idempotencyExpiredCount: normalizeNumber(summary.idempotency_expired_count),
    referenceSequencesCount: normalizeNumber(
      summary.reference_sequences_count,
      rows.filter((row) => row.type === "reference").length,
    ),
    activeReferenceSequencesCount: normalizeNumber(summary.active_reference_sequences_count),
    companiesCount: normalizeNumber(summary.companies_count),
    companiesWithAuditEvents: normalizeNumber(summary.companies_with_audit_events),
    companiesWithIdempotencyKeys: normalizeNumber(summary.companies_with_idempotency_keys),
    companiesWithReferenceSequences: normalizeNumber(summary.companies_with_reference_sequences),
  };
}
function buildExportRows(rows: UnifiedRow[], locale: Locale) {
  return rows.map((row) => [
    rowTypeLabel(row.type, locale),
    row.companyName,
    row.companyCode,
    row.primary,
    row.secondary,
    statusLabel(row.status, locale),
    row.source,
    row.message,
    formatDateTime(row.createdAt, locale),
  ]);
}
function buildTableHtml(headers: string[], rows: string[][]) {
  return `
    <table border="1" cellspacing="0" cellpadding="6">
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}
function KpiCard({
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
function BusinessControlsSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Card className="rounded-3xl">
          <CardHeader className="space-y-4">
            <Skeleton className="h-7 w-44 rounded-full" />
            <Skeleton className="h-10 w-80 rounded-xl" />
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
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
export default function SystemBusinessControlsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [payload, setPayload] = React.useState<ApiRecord>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<RowType>("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
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
  const loadBusinessControls = React.useCallback(
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
    void loadBusinessControls();
  }, [loadBusinessControls]);
  const rows = React.useMemo(() => extractRows(payload, locale), [payload, locale]);
  const summary = React.useMemo(() => extractSummary(payload, rows), [payload, rows]);
  const statusOptions = React.useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.status).filter(Boolean)));
  }, [rows]);
  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        const matchesType = typeFilter === "all" || row.type === typeFilter;
        const matchesStatus = statusFilter === "all" || row.status.toLowerCase() === statusFilter;
        const haystack = [
          row.type,
          row.companyName,
          row.companyCode,
          row.primary,
          row.secondary,
          row.status,
          row.severity,
          row.source,
          row.message,
        ]
          .join(" ")
          .toLowerCase();
        return matchesType && matchesStatus && (!query || haystack.includes(query));
      })
      .sort((first, second) => {
        if (sort === "company") return first.companyName.localeCompare(second.companyName);
        if (sort === "type") return first.type.localeCompare(second.type);
        if (sort === "status") return first.status.localeCompare(second.status);
        const firstTime = new Date(first.createdAt || first.updatedAt).getTime() || first.numericId;
        const secondTime = new Date(second.createdAt || second.updatedAt).getTime() || second.numericId;
        return secondTime - firstTime;
      });
  }, [rows, search, sort, statusFilter, typeFilter]);
  const hasFilters =
    Boolean(search) || typeFilter !== "all" || statusFilter !== "all" || sort !== "newest";
  function resetFilters() {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setSort("newest");
  }
  function exportHeaders() {
    return [
      t.type,
      t.companyName,
      t.company,
      t.primary,
      t.secondary,
      t.status,
      t.source,
      t.message,
      t.createdAt,
    ];
  }
  function exportExcel() {
    const exportRows = buildExportRows(filteredRows, locale);
    if (!exportRows.length) {
      toast.error(t.exportEmpty);
      return;
    }
    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml(exportHeaders(), exportRows)}
        </body>
      </html>
    `;
    const blob = new Blob([`\ufeff${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `primeyacc-business-controls-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function openPrintWindow(mode: "print" | "pdf") {
    const exportRows = buildExportRows(filteredRows, locale);
    if (!exportRows.length) {
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
          <script>window.onload = function () { window.print(); };</script>
        </head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml(exportHeaders(), exportRows)}
        </body>
      </html>
    `);
    printWindow.document.close();
  }
  if (loading) return <BusinessControlsSkeleton />;
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
            <Button onClick={() => void loadBusinessControls({ silent: true })} className="rounded-xl">
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
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.pageTitle}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  {t.pageSubtitle}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadBusinessControls({ silent: true })}
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
          <KpiCard title={t.totalAuditEvents} value={summary.auditEventsCount} description={t.fromLiveApi} icon={History} />
          <KpiCard title={t.criticalAuditEvents} value={summary.auditCriticalCount} description={`${t.warning}: ${formatInteger(summary.auditWarningCount)}`} icon={AlertTriangle} />
          <KpiCard title={t.idempotencyKeys} value={summary.idempotencyKeysCount} description={`${t.succeeded}: ${formatInteger(summary.idempotencySucceededCount)} · ${t.failed}: ${formatInteger(summary.idempotencyFailedCount)}`} icon={Fingerprint} />
          <KpiCard title={t.referenceSequences} value={summary.referenceSequencesCount} description={`${t.active}: ${formatInteger(summary.activeReferenceSequencesCount)}`} icon={KeyRound} />
        </section>
        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {t.latestAudit}
              </CardTitle>
              <CardDescription>
                {formatInteger(summary.companiesWithAuditEvents)} / {formatInteger(summary.companiesCount)} {t.company}
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock3 className="h-4 w-4 text-primary" />
                {t.latestKeys}
              </CardTitle>
              <CardDescription>
                {t.started}: {formatInteger(summary.idempotencyStartedCount)} · {t.failed}: {formatInteger(summary.idempotencyFailedCount)}
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border-border/70 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-primary" />
                {t.latestRefs}
              </CardTitle>
              <CardDescription>
                {formatInteger(summary.companiesWithReferenceSequences)} {t.company}
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.businessControlsTable}</CardTitle>
                <CardDescription className="mt-2">{t.businessControlsDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <Inbox className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(filteredRows.length)} {t.of} {formatInteger(rows.length)} {t.rows}
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
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as RowType)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="audit">{t.audit}</SelectItem>
                    <SelectItem value="idempotency">{t.idempotency}</SelectItem>
                    <SelectItem value="reference">{t.reference}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    {statusOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {statusLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="company">{t.company}</SelectItem>
                    <SelectItem value="type">{t.typeSort}</SelectItem>
                    <SelectItem value="status">{t.statusSort}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
                <Link href="/system/api-contracts" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted">
                  <TableProperties className="h-4 w-4" />
                  {t.apiContracts}
                </Link>
                <Link href="/system/release-readiness" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted">
                  <Activity className="h-4 w-4" />
                  {t.releaseReadiness}
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1260px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        <span className="inline-flex items-center gap-1">
                          <Layers3 className="h-3.5 w-3.5" />
                          {t.type}
                        </span>
                      </TableHead>
                      <TableHead className={cn("w-[210px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.companyName}
                      </TableHead>
                      <TableHead className={cn("w-[210px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          {t.primary}
                        </span>
                      </TableHead>
                      <TableHead className={cn("w-[220px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.secondary}
                      </TableHead>
                      <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.status}
                      </TableHead>
                      <TableHead className={cn("w-[170px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.source}
                      </TableHead>
                      <TableHead className={cn("w-[260px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.message}
                      </TableHead>
                      <TableHead className={cn("w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.createdAt}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length ? (
                      filteredRows.map((row) => (
                        <TableRow key={row.id} className="h-[76px]">
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <Badge variant="outline" className={cn("rounded-full", typeBadgeClass(row.type))}>
                              {rowTypeLabel(row.type, locale)}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm font-medium">{row.companyName}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {row.companyCode || `#${row.numericId}`}
                            </span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm font-semibold">{row.primary || t.notAvailable}</span>
                            <span className="block truncate text-xs text-muted-foreground">#{row.numericId}</span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {row.secondary || t.notAvailable}
                            </span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(row.status))}>
                              {statusLabel(row.status, locale)}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-xs text-muted-foreground">
                              {row.source || t.notAvailable}
                            </span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {row.message || t.notAvailable}
                            </span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-xs text-muted-foreground">
                              {formatDateTime(row.createdAt || row.updatedAt, locale)}
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
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="rounded-2xl border-border/70 bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-primary" />
                    {t.auditEvents}
                  </CardTitle>
                  <CardDescription>
                    {t.warning}: {formatInteger(summary.auditWarningCount)} · {t.critical}: {formatInteger(summary.auditCriticalCount)}
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="rounded-2xl border-border/70 bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {t.idempotencyTable}
                  </CardTitle>
                  <CardDescription>
                    {t.started}: {formatInteger(summary.idempotencyStartedCount)} · {t.succeeded}: {formatInteger(summary.idempotencySucceededCount)} · {t.failed}: {formatInteger(summary.idempotencyFailedCount)}
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="rounded-2xl border-border/70 bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <XCircle className="h-4 w-4 text-primary" />
                    {t.referenceTable}
                  </CardTitle>
                  <CardDescription>
                    {t.active}: {formatInteger(summary.activeReferenceSequencesCount)} · {t.referenceSequences}: {formatInteger(summary.referenceSequencesCount)}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
