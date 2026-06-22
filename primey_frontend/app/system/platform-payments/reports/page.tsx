"use client";

/* ============================================================
   📂 primey_frontend/app/system/platform-payments/reports/page.tsx
   💳 PrimeyAcc — System Platform Payments Reports
   ------------------------------------------------------------
   ✅ Premium PrimeyCare reports pattern adapted for PrimeyAcc
   ✅ Real API only: GET /api/system/billing-documents/?document_type=PAYMENT_RECEIPT
   ✅ Summary KPIs + status/payment method/reference distributions
   ✅ Analytical full-width table
   ✅ Search, status, payment method, reference, date filters
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
  ArrowUpDown,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  ListChecks,
  Loader2,
  MapPin,
  PieChart,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TableProperties,
  TriangleAlert,
  UsersRound,
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

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type StatusFilter =
  | "all"
  | "active"
  | "inactive"
  | "suspended"
  | "trial"
  | "pending"
  | "draft"
  | "cancelled"
  | "unknown";
type SortKey = "newest" | "oldest" | "name" | "code" | "status" | "activity" | "city";

type CompanyRecord = {
  id: string;
  name: string;
  code: string;
  status: string;
  owner: string;
  activity: string;
  subscription: string;
  email: string;
  phone: string;
  city: string;
  created_at: string | null;
  updated_at: string | null;
};

type DistributionRow = {
  key: string;
  label: string;
  count: number;
  percent: number;
};

const API_ENDPOINT = "/api/system/billing-documents/";

const statusFilters: StatusFilter[] = [
  "all",
  "active",
  "inactive",
  "suspended",
  "trial",
  "pending",
  "draft",
  "cancelled",
  "unknown",
];

const translations = {
  ar: {
    title: "تقارير المدفوعات",
    subtitle:
      "تحليلات إيصالات مدفوعات منصة PrimeyAcc حسب الحالة وطريقة الدفع والمبلغ المدفوع والمراجع والتواريخ، مبنية على بيانات API الحقيقية.",
    badge: "إدارة الاشتراكات",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    addCompany: "قائمة المدفوعات",
    companiesList: "قائمة المدفوعات",
    companiesCenter: "مركز المدفوعات",
    systemDashboard: "لوحة النظام",
    reset: "إعادة ضبط",

    searchPlaceholder: "ابحث باسم الشركة أو رقم الإيصال أو مرجع الفوترة أو طريقة الدفع أو مرجع العملية...",
    statusFilter: "الحالة",
    activityFilter: "النشاط",
    cityFilter: "المدينة",
    fromDate: "من تاريخ",
    toDate: "إلى تاريخ",
    sort: "الترتيب",
    all: "الكل",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    codeSort: "الكود",
    statusSort: "الحالة",
    activitySort: "النشاط",
    citySort: "المدينة",

    totalCompanies: "إجمالي المدفوعات",
    activeCompanies: "المدفوعات المؤكدة",
    inactiveCompanies: "غير المؤكدة",
    subscribedCompanies: "مدفوعات بقيمة",
    uniqueActivities: "طرق دفع مختلفة",
    uniqueCities: "مراجع عمليات مختلفة",
    filteredRows: "نتائج التقرير",
    fromLiveApi: "من واجهات النظام الحقيقية",

    statusDistribution: "توزيع المدفوعات حسب الحالة",
    statusDistributionDesc: "عدد ونسبة المدفوعات في كل حالة.",
    activityDistribution: "توزيع المدفوعات حسب طريقة الدفع",
    activityDistributionDesc: "أكثر طرق الدفع ظهورا ضمن المدفوعات الحالية.",
    cityDistribution: "توزيع المدفوعات حسب مرجع العملية",
    cityDistributionDesc: "أكثر مراجع العمليات ظهورا ضمن المدفوعات الحالية.",
    reportTable: "جدول التقرير التحليلي",
    reportTableDesc:
      "بيانات المدفوعات بعد تطبيق الفلاتر الحالية وهي نفس البيانات المستخدمة في التصدير والطباعة.",

    company: "الشركة",
    code: "رقم الإيصال",
    owner: "مرجع الفوترة",
    activity: "طريقة الدفع",
    subscription: "المبلغ المدفوع",
    city: "مرجع العملية",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    open: "فتح",

    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    trial: "تجريبي",
    pending: "معلق",
    draft: "مسودة",
    cancelled: "ملغي",
    expired: "منتهي",
    past_due: "متأخر",
    unknown: "غير محدد",
    notAvailable: "غير متوفر",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noDataTitle: "لا توجد مدفوعات",
    noDataDesc: "ستظهر تقارير المدفوعات عند توفر بيانات من API.",
    noResultsTitle: "لا توجد مدفوعات مطابقة",
    noResultsDesc: "غير البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل تقارير المدفوعات",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    reportTitle: "تقرير مدفوعات منصة PrimeyAcc",
    generatedAt: "تاريخ الإنشاء",
    refreshed: "تم تحديث تقارير المدفوعات.",
  },
  en: {
    title: "Platform payments reports",
    subtitle:
      "PrimeyAcc platform payment receipt analytics by status, payment method, paid amount, references, and dates, based on real API data.",
    badge: "Subscription management",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    pdfHint: "Choose Save as PDF from the print dialog.",
    addCompany: "Payments list",
    companiesList: "Payments list",
    companiesCenter: "Payments center",
    systemDashboard: "System dashboard",
    reset: "Reset",

    searchPlaceholder: "Search by company, receipt number, billing reference, payment method, or transaction reference...",
    statusFilter: "Status",
    activityFilter: "Activity",
    cityFilter: "City",
    fromDate: "From date",
    toDate: "To date",
    sort: "Sort",
    all: "All",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    codeSort: "Code",
    statusSort: "Status",
    activitySort: "Activity",
    citySort: "City",

    totalCompanies: "Total payments",
    activeCompanies: "Confirmed payments",
    inactiveCompanies: "Inactive",
    subscribedCompanies: "With value",
    uniqueActivities: "Unique payment methods",
    uniqueCities: "Unique transaction references",
    filteredRows: "Report results",
    fromLiveApi: "From real system APIs",

    statusDistribution: "Payments by status",
    statusDistributionDesc: "Count and ratio of companies by operational status.",
    activityDistribution: "Payments by payment method",
    activityDistributionDesc: "Top payment methods appearing in current payment receipts.",
    cityDistribution: "Payments by transaction reference",
    cityDistributionDesc: "Top transaction references appearing in current payment receipts.",
    reportTable: "Analytical report table",
    reportTableDesc:
      "Payment data after current filters, used by export and print actions.",

    company: "Company",
    code: "Receipt number",
    owner: "Billing reference",
    activity: "Payment method",
    subscription: "Paid amount",
    city: "Transaction reference",
    status: "Status",
    createdAt: "Created at",
    updatedAt: "Updated at",
    open: "Open",

    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    trial: "Trial",
    pending: "Pending",
    draft: "Draft",
    cancelled: "Cancelled",
    expired: "Expired",
    past_due: "Past due",
    unknown: "Unknown",
    notAvailable: "Not available",

    showing: "Showing",
    of: "of",
    rows: "rows",
    noDataTitle: "No payments",
    noDataDesc: "Payment reports will appear when the API returns data.",
    noResultsTitle: "No matching payments",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load payment reports",
    errorDesc:
      "Make sure you are signed in as a system user and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    reportTitle: "PrimeyAcc Platform Payments Report",
    generatedAt: "Generated at",
    refreshed: "Platform payments reports refreshed.",
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

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function rowDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
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
      ? (
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          ""
        ).replace(/\/+$/, "")
      : "";

  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}

function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
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

function normalizeStatus(value: unknown): CompanyRecord["status"] {
  const normalized = normalizeText(value, "unknown").toLowerCase();
  if (["active", "paid", "confirmed", "ready", "success", "issued"].includes(normalized)) {
    return "active";
  }
  if (["inactive", "cancelled", "canceled", "failed", "void", "expired", "unpaid"].includes(normalized)) {
    return "inactive";
  }
  if (["pending", "draft", "processing", "open"].includes(normalized)) {
    return "pending";
  }
  return normalized || "unknown";
}
function normalizeNestedName(value: unknown, keys: string[]): string | null {
  const record = asRecord(value);
  for (const key of keys) {
    const normalized = normalizeText(record[key]);
    if (normalized && normalized !== "—") return normalized;
  }
  return null;
}
function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const resultRecord = asRecord(record.result);
  const candidates = [
    record.results,
    record.items,
    record.documents,
    record.billing_documents,
    record.payment_receipts,
    record.receipts,
    dataRecord.results,
    dataRecord.items,
    dataRecord.documents,
    dataRecord.billing_documents,
    dataRecord.payment_receipts,
    dataRecord.receipts,
    resultRecord.results,
    resultRecord.items,
    resultRecord.documents,
    resultRecord.billing_documents,
    resultRecord.payment_receipts,
    resultRecord.receipts,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}
function extractCount(payload: unknown): number {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const resultRecord = asRecord(record.result);
  const candidates = [
    record.count,
    record.total,
    record.total_count,
    record.results_count,
    dataRecord.count,
    dataRecord.total,
    dataRecord.total_count,
    dataRecord.results_count,
    resultRecord.count,
    resultRecord.total,
    resultRecord.total_count,
    resultRecord.results_count,
  ];
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return extractArray(payload).length;
}
function normalizeCompany(value: unknown): CompanyRecord {
  const record = asRecord(value);
  const company = record.company || record.company_ref || record.tenant || record.account_company;
  const companyRecord = asRecord(company);
  const subscription = record.subscription || record.subscription_ref || record.company_subscription;
  const subscriptionRecord = asRecord(subscription);
  const money = asRecord(record.money);
  const sequence = asRecord(record.sequence);
  const paidAmount = normalizeText(
    record.paid_amount ||
      record.amount ||
      record.total_amount ||
      record.grand_total ||
      money.paid_amount ||
      money.amount ||
      money.total_amount ||
      money.total,
    "0",
  );
  const currency = normalizeText(
    record.currency_code ||
      record.currency ||
      money.currency_code ||
      money.currency ||
      companyRecord.currency_code ||
      subscriptionRecord.currency_code ||
      "SAR",
    "SAR",
  );
  const paymentMethod = normalizeText(
    record.payment_method ||
      record.method ||
      record.gateway ||
      record.channel ||
      record.payment_channel,
    "—",
  );
  const billingReference = normalizeText(
    record.billing_reference ||
      record.invoice_number ||
      record.invoice_reference ||
      record.reference ||
      record.receipt_reference ||
      subscriptionRecord.billing_reference ||
      subscriptionRecord.code,
    "—",
  );
  const transactionReference = normalizeText(
    record.transaction_reference ||
      record.transaction_id ||
      record.gateway_reference ||
      record.external_reference ||
      record.payment_reference,
    "—",
  );
  return {
    id: normalizeText(record.id || record.uuid || record.pk || record.document_number),
    name:
      normalizeNestedName(company, ["display_name", "name", "company_name", "title"]) ||
      normalizeText(record.company_name || companyRecord.company_code, "—"),
    code: normalizeText(
      record.document_number ||
        record.receipt_number ||
        record.number ||
        sequence.number ||
        record.id,
      "—",
    ),
    status: normalizeStatus(record.status ?? record.state ?? record.document_status),
    owner: billingReference,
    activity: paymentMethod,
    subscription: `${paidAmount} ${currency}`,
    email: normalizeText(record.document_type || record.type || "PAYMENT_RECEIPT", "PAYMENT_RECEIPT"),
    phone: normalizeText(record.paid_at || record.issue_date || record.issued_at),
    city: transactionReference,
    created_at:
      normalizeText(record.issued_at || record.issue_date || record.paid_at || record.created_at || record.created) ||
      null,
    updated_at:
      normalizeText(record.paid_at || record.updated_at || record.modified_at || record.updated) ||
      null,
  };
}
function getStatusLabel(value: string, locale: Locale) {
  const normalized = value.toLowerCase();

  const ar: Record<string, string> = {
    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    trial: "تجريبي",
    pending: "معلق",
    draft: "مسودة",
    cancelled: "ملغي",
    expired: "منتهي",
    past_due: "متأخر",
    unknown: "غير محدد",
  };

  const en: Record<string, string> = {
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    trial: "Trial",
    pending: "Pending",
    draft: "Draft",
    cancelled: "Cancelled",
    expired: "Expired",
    past_due: "Past due",
    unknown: "Unknown",
  };

  return locale === "ar" ? ar[normalized] || value : en[normalized] || value;
}

function getStatusClass(value: string) {
  const normalized = value.toLowerCase();

  if (["active", "paid", "confirmed", "ready", "success", "issued"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["pending", "trial", "draft", "processing"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["inactive", "failed", "cancelled", "expired", "suspended", "blocked"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StatusBadge({ value, locale }: { value: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getStatusClass(value))}
    >
      {getStatusLabel(value, locale)}
    </Badge>
  );
}

function makeDistribution(
  rows: CompanyRecord[],
  pick: (row: CompanyRecord) => string,
  locale: Locale,
  options?: { status?: boolean; limit?: number },
): DistributionRow[] {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const key = normalizeText(pick(row), "—");
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const total = rows.length || 1;

  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: options?.status ? getStatusLabel(key, locale) : key,
      count,
      percent: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, options?.limit || 10);
}

function ReportSkeleton() {
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

function DistributionCard({
  title,
  description,
  rows,
  locale,
}: {
  title: string;
  description: string;
  rows: DistributionRow[];
  locale: Locale;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <div key={row.key} className="rounded-2xl border bg-background p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-foreground">{row.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatInteger(row.count)} · {formatPercent(row.percent)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    locale === "ar" ? "origin-right" : "origin-left",
                    "bg-primary",
                  )}
                  style={{ width: `${Math.max(3, Math.min(100, row.percent))}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-2xl border bg-muted/20 text-sm text-muted-foreground">
            —
          </div>
        )}
      </CardContent>
    </Card>
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

export default function SystemPlatformPaymentsReportsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [companies, setCompanies] = React.useState<CompanyRecord[]>([]);
  const [apiTotal, setApiTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [activity, setActivity] = React.useState("all");
  const [city, setCity] = React.useState("all");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
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

  const loadCompanies = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: "1",
          page_size: "500",
          ordering: "-created_at",
        });

        params.set("document_type", "PAYMENT_RECEIPT");
        const payload = await fetchJson<unknown>(makeApiUrl(API_ENDPOINT, params));
        const rows = extractArray(payload).map(normalizeCompany);

        setCompanies(rows);
        setApiTotal(extractCount(payload));

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
    void loadCompanies();
  }, [loadCompanies]);

  const activityOptions = React.useMemo(() => {
    return [...new Set(companies.map((company) => company.activity).filter((value) => value && value !== "—"))].sort();
  }, [companies]);

  const cityOptions = React.useMemo(() => {
    return [...new Set(companies.map((company) => company.city).filter((value) => value && value !== "—"))].sort();
  }, [companies]);

  const filteredCompanies = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : 0;
    const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : 0;

    const rows = companies.filter((company) => {
      const haystack = [
        company.name,
        company.code,
        company.owner,
        company.activity,
        company.subscription,
        company.city,
        company.status,
        company.email,
        company.phone,
      ]
        .join(" ")
        .toLowerCase();

      const createdTime = rowDateValue(company.created_at);

      if (needle && !haystack.includes(needle)) return false;
      if (status !== "all" && company.status !== status) return false;
      if (activity !== "all" && company.activity !== activity) return false;
      if (city !== "all" && company.city !== city) return false;
      if (fromTime && createdTime && createdTime < fromTime) return false;
      if (toTime && createdTime && createdTime > toTime) return false;

      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === "oldest") return rowDateValue(a.created_at) - rowDateValue(b.created_at);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "code") return a.code.localeCompare(b.code);
      if (sort === "status") return a.status.localeCompare(b.status);
      if (sort === "activity") return a.activity.localeCompare(b.activity);
      if (sort === "city") return a.city.localeCompare(b.city);
      return rowDateValue(b.created_at) - rowDateValue(a.created_at);
    });
  }, [activity, city, companies, fromDate, search, sort, status, toDate]);

  const stats = React.useMemo(() => {
    return {
      total: apiTotal || companies.length,
      active: companies.filter((company) => company.status === "active").length,
      inactive: companies.filter((company) =>
        ["inactive", "suspended", "cancelled"].includes(company.status),
      ).length,
      subscribed: companies.filter((company) => company.subscription && company.subscription !== "—").length,
      activities: activityOptions.length,
      cities: cityOptions.length,
      filtered: filteredCompanies.length,
    };
  }, [activityOptions.length, apiTotal, cityOptions.length, companies, filteredCompanies.length]);

  const statusDistribution = React.useMemo(
    () => makeDistribution(filteredCompanies, (row) => row.status, locale, { status: true, limit: 8 }),
    [filteredCompanies, locale],
  );

  const activityDistribution = React.useMemo(
    () => makeDistribution(filteredCompanies, (row) => row.activity, locale, { limit: 8 }),
    [filteredCompanies, locale],
  );

  const cityDistribution = React.useMemo(
    () => makeDistribution(filteredCompanies, (row) => row.city, locale, { limit: 8 }),
    [filteredCompanies, locale],
  );

  const hasFilters = Boolean(
    search || status !== "all" || activity !== "all" || city !== "all" || fromDate || toDate || sort !== "newest",
  );

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setActivity("all");
    setCity("all");
    setFromDate("");
    setToDate("");
    setSort("newest");
  }

  function buildExportRows() {
    return filteredCompanies.map((company) => [
      company.name,
      company.code,
      company.owner,
      company.activity,
      company.subscription,
      company.city,
      getStatusLabel(company.status, locale),
      formatDate(company.created_at),
      formatDate(company.updated_at),
    ]);
  }

  function buildTableHtml() {
    const headers = [
      t.company,
      t.code,
      t.owner,
      t.activity,
      t.subscription,
      t.city,
      t.status,
      t.createdAt,
      t.updatedAt,
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
    link.download = `primeyacc-system-companies-report-${new Date().toISOString().slice(0, 10)}.xls`;
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

  if (loading) return <ReportSkeleton />;

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
            <Button onClick={() => void loadCompanies({ silent: true })} className="rounded-xl">
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
                  onClick={() => void loadCompanies({ silent: true })}
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
                  <Link href="/system/platform-payments">
                    <Plus className="h-4 w-4" />
                    {t.addCompany}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalCompanies} value={stats.total} description={t.fromLiveApi} icon={Building2} />
          <KpiCard title={t.activeCompanies} value={stats.active} description={t.fromLiveApi} icon={CheckCircle2} />
          <KpiCard title={t.inactiveCompanies} value={stats.inactive} description={t.fromLiveApi} icon={ShieldCheck} />
          <KpiCard title={t.subscribedCompanies} value={stats.subscribed} description={t.fromLiveApi} icon={Activity} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard title={t.uniqueActivities} value={stats.activities} description={t.fromLiveApi} icon={PieChart} />
          <KpiCard title={t.uniqueCities} value={stats.cities} description={t.fromLiveApi} icon={MapPin} />
          <KpiCard title={t.filteredRows} value={stats.filtered} description={t.fromLiveApi} icon={TableProperties} />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="pt-6">
            <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_160px_160px_160px_150px_150px_170px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="h-10 rounded-xl ps-9"
                />
              </div>

              <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                <SelectTrigger className="h-10 rounded-xl bg-background">
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

              <Select value={activity} onValueChange={setActivity}>
                <SelectTrigger className="h-10 rounded-xl bg-background">
                  <SelectValue placeholder={t.activityFilter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  {activityOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="h-10 rounded-xl bg-background">
                  <SelectValue placeholder={t.cityFilter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  {cityOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-10 rounded-xl"
                aria-label={t.fromDate}
              />

              <Input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-10 rounded-xl"
                aria-label={t.toDate}
              />

              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger className="h-10 rounded-xl bg-background">
                  <ArrowUpDown className="h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t.newest}</SelectItem>
                  <SelectItem value="oldest">{t.oldest}</SelectItem>
                  <SelectItem value="name">{t.nameSort}</SelectItem>
                  <SelectItem value="code">{t.codeSort}</SelectItem>
                  <SelectItem value="status">{t.statusSort}</SelectItem>
                  <SelectItem value="activity">{t.activitySort}</SelectItem>
                  <SelectItem value="city">{t.citySort}</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          <DistributionCard
            title={t.statusDistribution}
            description={t.statusDistributionDesc}
            rows={statusDistribution}
            locale={locale}
          />
          <DistributionCard
            title={t.activityDistribution}
            description={t.activityDistributionDesc}
            rows={activityDistribution}
            locale={locale}
          />
          <DistributionCard
            title={t.cityDistribution}
            description={t.cityDistributionDesc}
            rows={cityDistribution}
            locale={locale}
          />
        </div>

        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.reportTable}</CardTitle>
                <CardDescription className="mt-2">{t.reportTableDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <UsersRound className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(filteredCompanies.length)} {t.of} {formatInteger(apiTotal || companies.length)} {t.rows}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1120px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("w-[220px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.company}
                      </TableHead>
                      <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.code}
                      </TableHead>
                      <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.owner}
                      </TableHead>
                      <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.activity}
                      </TableHead>
                      <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.subscription}
                      </TableHead>
                      <TableHead className={cn("w-[120px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.city}
                      </TableHead>
                      <TableHead className={cn("w-[110px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.status}
                      </TableHead>
                      <TableHead className={cn("w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.createdAt}
                      </TableHead>
                      <TableHead className="sticky left-0 z-10 w-[76px] bg-muted/40 px-3 text-center text-xs font-semibold text-muted-foreground">
                        {t.open}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredCompanies.length ? (
                      filteredCompanies.map((company) => (
                        <TableRow key={company.id || company.code || company.name} className="h-[64px]">
                          <TableCell className={cn("overflow-hidden px-4 align-middle", alignClass)}>
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {company.name || t.notAvailable}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                #{company.id || company.code || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={cn("overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {company.code || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.owner || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.activity || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.subscription || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.city || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <StatusBadge value={company.status} locale={locale} />
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {formatDate(company.created_at)}
                            </span>
                          </TableCell>
                          <TableCell className="sticky left-0 z-10 bg-background px-3 text-center align-middle">
                            <Button asChild variant="outline" size="sm" className="h-8 rounded-lg bg-background px-3">
                              <Link href={company.id ? `/system/platform-payments/${company.id}` : "/system/platform-payments/list"}>
                                {t.open}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9}>
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
                  {formatInteger(filteredCompanies.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(apiTotal || companies.length)}
                </span>{" "}
                {t.rows}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system/platform-payments">
                    <BarChart3 className="h-4 w-4" />
                    {t.companiesCenter}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system/platform-payments/list">
                    <ListChecks className="h-4 w-4" />
                    {t.companiesList}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system">
                    <LayoutDashboard className="h-4 w-4" />
                    {t.systemDashboard}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}






















