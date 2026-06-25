"use client";

/* ============================================================
   📂 primey_frontend/app/system/plans/reports/page.tsx
   💼 PrimeyAcc — System Plans Reports
   ------------------------------------------------------------
   ✅ Approved PrimeyAcc reports pattern
   ✅ Real API only: GET /api/system/plans/
   ✅ Summary KPIs + status/visibility/pricing distributions
   ✅ Analytical full-width table
   ✅ Search, status, visibility, code, price tier, sort filters
   ✅ Row actions use compact vertical dots menu
   ✅ Excel .xls export
   ✅ Web print + PDF through browser print dialog
   ✅ Skeleton loading
   ✅ Error / Empty / No results states
   ✅ sonner toast
   ✅ Arabic/English via primey-locale
   ✅ SAR icon from public/currency/sar.svg
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowUpDown,
  BadgeCheck,
  BarChart3,
  Eye,
  FileSpreadsheet,
  FileText,
  Gift,
  LayoutDashboard,
  ListChecks,
  Loader2,
  MoreVertical,
  PieChart,
  Power,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  TableProperties,
  TriangleAlert,
  UsersRound,
  Warehouse,
  Zap,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
type StatusFilter = "all" | "active" | "inactive";
type VisibilityFilter = "all" | "public" | "internal";
type PriceTierFilter = "all" | "free" | "paid" | "low" | "mid" | "high";
type SortKey =
  | "order"
  | "name"
  | "monthly"
  | "yearly"
  | "companies"
  | "users"
  | "updated";

type PlanRecord = {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string;
  monthly_price: string;
  yearly_price: string;
  max_users: number;
  max_branches: number;
  max_warehouses: number;
  max_pos: number;
  features: string[];
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  companies_count: number;
  created_at: string | null;
  updated_at: string | null;
};

type DistributionRow = {
  key: string;
  label: string;
  count: number;
  percent: number;
};

type ServerStats = {
  total: number;
  active: number;
  inactive: number;
  public: number;
  internal: number;
};

const API_ENDPOINT = "/api/system/plans/";

const translations = {
  ar: {
    title: "تقارير الباقات",
    subtitle:
      "تحليلات باقات PrimeyAcc حسب الحالة والظهور والأسعار والحدود وعدد الشركات المرتبطة من بيانات API الحقيقية.",
    badge: "إدارة المنصة",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    backToPlans: "قائمة الباقات",
    createPlan: "إنشاء باقة",
    systemDashboard: "لوحة النظام",
    reset: "إعادة ضبط",

    searchPlaceholder: "ابحث باسم الباقة أو الكود أو المعرف أو الوصف أو المميزات...",
    statusFilter: "الحالة",
    visibilityFilter: "الظهور",
    codeFilter: "الكود",
    priceTierFilter: "نطاق السعر",
    sort: "الترتيب",
    all: "الكل",
    allStatuses: "كل الحالات",
    allVisibility: "كل أنواع الظهور",
    allCodes: "كل الأكواد",
    allPrices: "كل الأسعار",
    activeOnly: "المفعلة",
    inactiveOnly: "الموقفة",
    publicOnly: "العامة",
    internalOnly: "الداخلية",
    freePlans: "مجانية",
    paidPlans: "مدفوعة",
    lowPlans: "أقل من 100",
    midPlans: "100 إلى 499",
    highPlans: "500 فأكثر",
    sortOrder: "ترتيب العرض",
    sortName: "الاسم",
    sortMonthly: "السعر الشهري",
    sortYearly: "السعر السنوي",
    sortCompanies: "عدد الشركات",
    sortUsers: "عدد المستخدمين",
    sortUpdated: "آخر تحديث",

    totalPlans: "إجمالي الباقات",
    activePlans: "الباقات المفعلة",
    publicPlans: "باقات ظاهرة",
    linkedCompanies: "الشركات المرتبطة",
    averageMonthly: "متوسط الشهري",
    averageYearly: "متوسط السنوي",
    maxUsersTotal: "إجمالي حدود المستخدمين",
    filteredRows: "نتائج التقرير",
    fromLiveApi: "من واجهات النظام الحقيقية",

    statusDistribution: "توزيع الباقات حسب الحالة",
    statusDistributionDesc: "عدد ونسبة الباقات المفعلة والموقفة.",
    visibilityDistribution: "توزيع الباقات حسب الظهور",
    visibilityDistributionDesc: "عدد ونسبة الباقات العامة والداخلية.",
    priceDistribution: "توزيع الباقات حسب السعر الشهري",
    priceDistributionDesc: "تحليل نطاقات الأسعار الشهرية الحالية.",
    reportTable: "جدول التقرير التحليلي",
    reportTableDesc:
      "بيانات الباقات بعد تطبيق الفلاتر الحالية وهي نفس البيانات المستخدمة في التصدير والطباعة.",

    plan: "الباقة",
    code: "الكود",
    prices: "الأسعار",
    monthly: "شهري",
    yearly: "سنوي",
    limits: "الحدود",
    users: "مستخدم",
    branches: "فرع",
    warehouses: "مخزن",
    pos: "نقطة بيع",
    companies: "الشركات",
    features: "المميزات",
    status: "الحالة",
    visibility: "الظهور",
    updatedAt: "آخر تحديث",
    actions: "الإجراءات",
    details: "تفاصيل",
    plansCenter: "مركز الباقات",

    active: "مفعلة",
    inactive: "موقفة",
    public: "عامة",
    internal: "داخلية",
    unknown: "غير محدد",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noDataTitle: "لا توجد باقات",
    noDataDesc: "ستظهر تقارير الباقات هنا عند توفر بيانات من API.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غير البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل تقارير الباقات",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    reportTitle: "تقرير باقات PrimeyAcc",
    generatedAt: "تاريخ الإنشاء",
    refreshed: "تم تحديث تقارير الباقات.",
  },
  en: {
    title: "Plans reports",
    subtitle:
      "Analyze PrimeyAcc plans by status, visibility, pricing, limits, and linked companies using real API data.",
    badge: "Platform management",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    pdfHint: "Choose Save as PDF from the print dialog.",
    backToPlans: "Plans list",
    createPlan: "Create plan",
    systemDashboard: "System dashboard",
    reset: "Reset",

    searchPlaceholder: "Search by plan name, code, slug, description, or features...",
    statusFilter: "Status",
    visibilityFilter: "Visibility",
    codeFilter: "Code",
    priceTierFilter: "Price tier",
    sort: "Sort",
    all: "All",
    allStatuses: "All statuses",
    allVisibility: "All visibility",
    allCodes: "All codes",
    allPrices: "All prices",
    activeOnly: "Active only",
    inactiveOnly: "Inactive only",
    publicOnly: "Public only",
    internalOnly: "Internal only",
    freePlans: "Free",
    paidPlans: "Paid",
    lowPlans: "Below 100",
    midPlans: "100 to 499",
    highPlans: "500 and above",
    sortOrder: "Display order",
    sortName: "Name",
    sortMonthly: "Monthly price",
    sortYearly: "Yearly price",
    sortCompanies: "Companies count",
    sortUsers: "Users limit",
    sortUpdated: "Last updated",

    totalPlans: "Total plans",
    activePlans: "Active plans",
    publicPlans: "Public plans",
    linkedCompanies: "Linked companies",
    averageMonthly: "Average monthly",
    averageYearly: "Average yearly",
    maxUsersTotal: "Total user limits",
    filteredRows: "Report results",
    fromLiveApi: "From real system APIs",

    statusDistribution: "Plans by status",
    statusDistributionDesc: "Count and percentage of active and inactive plans.",
    visibilityDistribution: "Plans by visibility",
    visibilityDistributionDesc: "Count and percentage of public and internal plans.",
    priceDistribution: "Plans by monthly price",
    priceDistributionDesc: "Analysis of current monthly price ranges.",
    reportTable: "Analytical report table",
    reportTableDesc:
      "Filtered plan data used for the current export and print output.",

    plan: "Plan",
    code: "Code",
    prices: "Prices",
    monthly: "Monthly",
    yearly: "Yearly",
    limits: "Limits",
    users: "users",
    branches: "branches",
    warehouses: "warehouses",
    pos: "POS",
    companies: "Companies",
    features: "Features",
    status: "Status",
    visibility: "Visibility",
    updatedAt: "Updated at",
    actions: "Actions",
    details: "Details",
    plansCenter: "Plans center",

    active: "Active",
    inactive: "Inactive",
    public: "Public",
    internal: "Internal",
    unknown: "Unknown",

    showing: "Showing",
    of: "of",
    rows: "rows",
    noDataTitle: "No plans",
    noDataDesc: "Plans reports will appear here when the API returns data.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Could not load plans reports",
    errorDesc:
      "Make sure you are signed in as a system user and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    reportTitle: "PrimeyAcc Plans Report",
    generatedAt: "Generated at",
    refreshed: "Plans reports refreshed.",
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

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["1", "true", "yes", "active", "public"].includes(normalized)) return true;
    if (["0", "false", "no", "inactive", "internal"].includes(normalized)) return false;
  }

  return fallback;
}

function normalizeFeatures(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  const text = normalizeText(value);

  if (!text) return [];

  return text
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(toNumber(value)),
  );
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
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

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);

  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.plans)) return record.plans;
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.plans)) return dataRecord.plans;

  return [];
}

function extractCount(payload: unknown, fallback: number) {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);

  return toNumber(record.count ?? dataRecord.count ?? record.total ?? dataRecord.total, fallback);
}

function extractStats(payload: unknown, fallback: ServerStats): ServerStats {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const statsRecord = asRecord(record.stats ?? dataRecord.stats);

  return {
    total: toNumber(statsRecord.total, fallback.total),
    active: toNumber(statsRecord.active, fallback.active),
    inactive: toNumber(statsRecord.inactive, fallback.inactive),
    public: toNumber(statsRecord.public, fallback.public),
    internal: toNumber(statsRecord.internal, fallback.internal),
  };
}

function normalizePlan(value: unknown): PlanRecord {
  const record = asRecord(value);
  const limits = asRecord(record.limits);
  const usage = asRecord(record.usage);
  const stats = asRecord(record.stats);

  return {
    id: normalizeText(record.id ?? record.pk ?? record.uuid),
    name: normalizeText(record.name ?? record.title, "—"),
    code: normalizeText(record.code ?? record.plan_code, "—").toUpperCase(),
    slug: normalizeText(record.slug ?? record.key, "—"),
    description: normalizeText(record.description ?? record.notes),
    monthly_price: normalizeText(record.monthly_price ?? record.monthly ?? record.price_monthly, "0.00"),
    yearly_price: normalizeText(record.yearly_price ?? record.yearly ?? record.price_yearly, "0.00"),
    max_users: toNumber(record.max_users ?? limits.max_users, 0),
    max_branches: toNumber(record.max_branches ?? limits.max_branches, 0),
    max_warehouses: toNumber(record.max_warehouses ?? limits.max_warehouses, 0),
    max_pos: toNumber(record.max_pos ?? limits.max_pos, 0),
    features: normalizeFeatures(record.features),
    is_active: toBoolean(record.is_active ?? record.active ?? record.status, true),
    is_public: toBoolean(record.is_public ?? record.public ?? record.visibility, true),
    sort_order: toNumber(record.sort_order ?? record.order, 0),
    companies_count: toNumber(
      record.companies_count ??
        record.company_count ??
        record.subscriptions_count ??
        usage.companies_count ??
        stats.subscriptions_total,
      0,
    ),
    created_at: normalizeText(record.created_at ?? record.created) || null,
    updated_at: normalizeText(record.updated_at ?? record.modified_at ?? record.updated) || null,
  };
}

function rowDateValue(value: string | null) {
  if (!value) return 0;

  const parsed = new Date(value).getTime();

  return Number.isFinite(parsed) ? parsed : 0;
}

function priceTier(plan: PlanRecord): PriceTierFilter {
  const monthly = toNumber(plan.monthly_price);

  if (monthly === 0) return "free";
  if (monthly < 100) return "low";
  if (monthly < 500) return "mid";

  return "high";
}

function makeDistribution(rows: PlanRecord[], items: Array<{ key: string; label: string; test: (plan: PlanRecord) => boolean }>) {
  const total = rows.length || 1;

  return items.map((item) => {
    const count = rows.filter(item.test).length;

    return {
      key: item.key,
      label: item.label,
      count,
      percent: Math.round((count / total) * 100),
    };
  });
}

function MoneyIcon() {
  return (
    <Image
      src="/currency/sar.svg"
      alt="SAR"
      width={15}
      height={15}
      className="h-[15px] w-[15px]"
    />
  );
}

function MoneyValue({ value }: { value: unknown }) {
  return (
    <span dir="ltr" className="inline-flex items-center gap-1 font-semibold tabular-nums">
      <MoneyIcon />
      {formatMoney(value)}
    </span>
  );
}

function StatusBadge({ active, locale }: { active: boolean; locale: Locale }) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3 py-1",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {active ? t.active : t.inactive}
    </Badge>
  );
}

function VisibilityBadge({ isPublic, locale }: { isPublic: boolean; locale: Locale }) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3 py-1",
        isPublic
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-amber-200 bg-amber-50 text-amber-700",
      )}
    >
      {isPublic ? t.public : t.internal}
    </Badge>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="space-y-1">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
        </div>
        <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function DistributionCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: DistributionRow[];
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="rounded-2xl border bg-background p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="font-medium">{row.label}</span>
              <span className="text-sm font-semibold tabular-nums">
                {formatInteger(row.count)} · {formatInteger(row.percent)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(row.percent, 100)}%` }}
              />
            </div>
          </div>
        ))}
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
  onReset?: () => void;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
      <div className="mb-4 rounded-2xl bg-background p-3 shadow-sm">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      {showReset && onReset ? (
        <Button variant="outline" className="mt-4 rounded-xl bg-background" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <Skeleton className="h-44 rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    </main>
  );
}

export default function SystemPlansReportsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [plans, setPlans] = React.useState<PlanRecord[]>([]);
  const [apiTotal, setApiTotal] = React.useState(0);
  const [serverStats, setServerStats] = React.useState<ServerStats>({
    total: 0,
    active: 0,
    inactive: 0,
    public: 0,
    internal: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [visibility, setVisibility] = React.useState<VisibilityFilter>("all");
  const [code, setCode] = React.useState("all");
  const [price, setPrice] = React.useState<PriceTierFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("order");

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

  const loadReports = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const payload = await fetchJson<unknown>(API_ENDPOINT);
        const rows = extractArray(payload).map(normalizePlan);

        const fallbackStats = {
          total: rows.length,
          active: rows.filter((plan) => plan.is_active).length,
          inactive: rows.filter((plan) => !plan.is_active).length,
          public: rows.filter((plan) => plan.is_public).length,
          internal: rows.filter((plan) => !plan.is_public).length,
        };

        setPlans(rows);
        setApiTotal(extractCount(payload, rows.length));
        setServerStats(extractStats(payload, fallbackStats));

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
    void loadReports();
  }, [loadReports]);

  const resetFilters = React.useCallback(() => {
    setSearch("");
    setStatus("all");
    setVisibility("all");
    setCode("all");
    setPrice("all");
    setSort("order");
  }, []);

  const availableCodes = React.useMemo(() => {
    return Array.from(new Set(plans.map((plan) => plan.code).filter(Boolean))).sort();
  }, [plans]);

  const filteredPlans = React.useMemo(() => {
    const needle = search.trim().toLowerCase();

    const rows = plans.filter((plan) => {
      const haystack = [
        plan.name,
        plan.code,
        plan.slug,
        plan.description,
        plan.features.join(" "),
        plan.is_active ? "active" : "inactive",
        plan.is_public ? "public" : "internal",
      ]
        .join(" ")
        .toLowerCase();

      if (needle && !haystack.includes(needle)) return false;
      if (status === "active" && !plan.is_active) return false;
      if (status === "inactive" && plan.is_active) return false;
      if (visibility === "public" && !plan.is_public) return false;
      if (visibility === "internal" && plan.is_public) return false;
      if (code !== "all" && plan.code !== code) return false;
      if (price !== "all") {
        const tier = priceTier(plan);

        if (price === "paid" && tier === "free") return false;
        if (price !== "paid" && tier !== price) return false;
      }

      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "monthly") return toNumber(b.monthly_price) - toNumber(a.monthly_price);
      if (sort === "yearly") return toNumber(b.yearly_price) - toNumber(a.yearly_price);
      if (sort === "companies") return b.companies_count - a.companies_count;
      if (sort === "users") return b.max_users - a.max_users;
      if (sort === "updated") {
        return rowDateValue(b.updated_at || b.created_at) - rowDateValue(a.updated_at || a.created_at);
      }

      const orderDiff = a.sort_order - b.sort_order;

      if (orderDiff !== 0) return orderDiff;

      return a.name.localeCompare(b.name);
    });
  }, [code, plans, price, search, sort, status, visibility]);

  const hasFilters = Boolean(
    search || status !== "all" || visibility !== "all" || code !== "all" || price !== "all" || sort !== "order",
  );

  const reportStats = React.useMemo(() => {
    const monthlyTotal = filteredPlans.reduce((sum, plan) => sum + toNumber(plan.monthly_price), 0);
    const yearlyTotal = filteredPlans.reduce((sum, plan) => sum + toNumber(plan.yearly_price), 0);
    const companiesTotal = filteredPlans.reduce((sum, plan) => sum + plan.companies_count, 0);
    const usersTotal = filteredPlans.reduce((sum, plan) => sum + plan.max_users, 0);
    const divisor = filteredPlans.length || 1;

    return {
      total: serverStats.total || apiTotal || plans.length,
      active: serverStats.active || plans.filter((plan) => plan.is_active).length,
      public: serverStats.public || plans.filter((plan) => plan.is_public).length,
      linkedCompanies: companiesTotal,
      averageMonthly: monthlyTotal / divisor,
      averageYearly: yearlyTotal / divisor,
      usersTotal,
      filtered: filteredPlans.length,
    };
  }, [apiTotal, filteredPlans, plans, serverStats]);

  const statusDistribution = React.useMemo(() => {
    return makeDistribution(filteredPlans, [
      { key: "active", label: t.active, test: (plan) => plan.is_active },
      { key: "inactive", label: t.inactive, test: (plan) => !plan.is_active },
    ]);
  }, [filteredPlans, t.active, t.inactive]);

  const visibilityDistribution = React.useMemo(() => {
    return makeDistribution(filteredPlans, [
      { key: "public", label: t.public, test: (plan) => plan.is_public },
      { key: "internal", label: t.internal, test: (plan) => !plan.is_public },
    ]);
  }, [filteredPlans, t.internal, t.public]);

  const priceDistribution = React.useMemo(() => {
    return makeDistribution(filteredPlans, [
      { key: "free", label: t.freePlans, test: (plan) => priceTier(plan) === "free" },
      { key: "low", label: t.lowPlans, test: (plan) => priceTier(plan) === "low" },
      { key: "mid", label: t.midPlans, test: (plan) => priceTier(plan) === "mid" },
      { key: "high", label: t.highPlans, test: (plan) => priceTier(plan) === "high" },
    ]);
  }, [filteredPlans, t.freePlans, t.highPlans, t.lowPlans, t.midPlans]);

  function buildExportRows() {
    return filteredPlans.map((plan) => [
      plan.name,
      plan.code,
      plan.slug,
      plan.monthly_price,
      plan.yearly_price,
      plan.max_users,
      plan.max_branches,
      plan.max_warehouses,
      plan.max_pos,
      plan.companies_count,
      plan.features.join(", "),
      plan.is_active ? t.active : t.inactive,
      plan.is_public ? t.public : t.internal,
      formatDate(plan.updated_at || plan.created_at),
    ]);
  }

  function buildTableHtml() {
    const headers = [
      t.plan,
      t.code,
      t.monthly,
      t.yearly,
      t.users,
      t.branches,
      t.warehouses,
      t.pos,
      t.companies,
      t.features,
      t.status,
      t.visibility,
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
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString("en-US"))}</p>
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
    link.download = `primeyacc-system-plans-reports-${new Date().toISOString().slice(0, 10)}.xls`;
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
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString("en-US"))}</p>
          ${buildTableHtml()}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) return <ReportsSkeleton />;

  if (error) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8" dir={dir}>
        <div className="w-full">
          <Card className="rounded-3xl border-destructive/30 bg-card shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
                  <TriangleAlert className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>{t.errorTitle}</CardTitle>
                  <CardDescription className="mt-1">{error || t.errorDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button className="rounded-xl" onClick={() => void loadReports()}>
                <RefreshCw className="h-4 w-4" />
                {t.tryAgain}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8" dir={dir}>
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
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  {t.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system/plans">
                    <ArrowLeft className="h-4 w-4" />
                    {t.backToPlans}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadReports({ silent: true })}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {t.refresh}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={exportExcel}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.exportExcel}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => openPrintWindow("print")}
                >
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => openPrintWindow("pdf")}
                >
                  <FileText className="h-4 w-4" />
                  {t.pdf}
                </Button>
                <Button asChild className="rounded-xl">
                  <Link href="/system/plans/create">
                    <Gift className="h-4 w-4" />
                    {t.createPlan}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title={t.totalPlans}
            value={formatInteger(reportStats.total)}
            description={t.fromLiveApi}
            icon={Gift}
          />
          <MetricCard
            title={t.activePlans}
            value={formatInteger(reportStats.active)}
            description={t.fromLiveApi}
            icon={BadgeCheck}
          />
          <MetricCard
            title={t.publicPlans}
            value={formatInteger(reportStats.public)}
            description={t.fromLiveApi}
            icon={Eye}
          />
          <MetricCard
            title={t.linkedCompanies}
            value={formatInteger(reportStats.linkedCompanies)}
            description={t.fromLiveApi}
            icon={UsersRound}
          />
          <MetricCard
            title={t.averageMonthly}
            value={<MoneyValue value={reportStats.averageMonthly} />}
            description={t.fromLiveApi}
            icon={BarChart3}
          />
          <MetricCard
            title={t.averageYearly}
            value={<MoneyValue value={reportStats.averageYearly} />}
            description={t.fromLiveApi}
            icon={PieChart}
          />
          <MetricCard
            title={t.maxUsersTotal}
            value={formatInteger(reportStats.usersTotal)}
            description={t.fromLiveApi}
            icon={UsersRound}
          />
          <MetricCard
            title={t.filteredRows}
            value={formatInteger(reportStats.filtered)}
            description={t.fromLiveApi}
            icon={TableProperties}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <DistributionCard
            title={t.statusDistribution}
            description={t.statusDistributionDesc}
            rows={statusDistribution}
          />
          <DistributionCard
            title={t.visibilityDistribution}
            description={t.visibilityDistributionDesc}
            rows={visibilityDistribution}
          />
          <DistributionCard
            title={t.priceDistribution}
            description={t.priceDistributionDesc}
            rows={priceDistribution}
          />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>{t.reportTable}</CardTitle>
                <CardDescription className="mt-2">{t.reportTableDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <Activity className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(filteredPlans.length)} {t.of}{" "}
                {formatInteger(apiTotal || plans.length)} {t.rows}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="relative md:col-span-2">
                <Search
                  className={cn(
                    "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                    locale === "ar" ? "right-3" : "left-3",
                  )}
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className={cn(
                    "h-11 rounded-xl bg-background",
                    locale === "ar" ? "pr-10" : "pl-10",
                  )}
                />
              </div>

              <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                <SelectTrigger className="h-11 rounded-xl bg-background">
                  <SelectValue placeholder={t.statusFilter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allStatuses}</SelectItem>
                  <SelectItem value="active">{t.activeOnly}</SelectItem>
                  <SelectItem value="inactive">{t.inactiveOnly}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={visibility}
                onValueChange={(value) => setVisibility(value as VisibilityFilter)}
              >
                <SelectTrigger className="h-11 rounded-xl bg-background">
                  <SelectValue placeholder={t.visibilityFilter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allVisibility}</SelectItem>
                  <SelectItem value="public">{t.publicOnly}</SelectItem>
                  <SelectItem value="internal">{t.internalOnly}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={code} onValueChange={setCode}>
                <SelectTrigger className="h-11 rounded-xl bg-background">
                  <SelectValue placeholder={t.codeFilter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allCodes}</SelectItem>
                  {availableCodes.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={price} onValueChange={(value) => setPrice(value as PriceTierFilter)}>
                <SelectTrigger className="h-11 rounded-xl bg-background">
                  <SelectValue placeholder={t.priceTierFilter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allPrices}</SelectItem>
                  <SelectItem value="free">{t.freePlans}</SelectItem>
                  <SelectItem value="paid">{t.paidPlans}</SelectItem>
                  <SelectItem value="low">{t.lowPlans}</SelectItem>
                  <SelectItem value="mid">{t.midPlans}</SelectItem>
                  <SelectItem value="high">{t.highPlans}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger className="h-11 w-[210px] rounded-xl bg-background">
                  <ArrowUpDown className="h-4 w-4" />
                  <SelectValue placeholder={t.sort} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">{t.sortOrder}</SelectItem>
                  <SelectItem value="name">{t.sortName}</SelectItem>
                  <SelectItem value="monthly">{t.sortMonthly}</SelectItem>
                  <SelectItem value="yearly">{t.sortYearly}</SelectItem>
                  <SelectItem value="companies">{t.sortCompanies}</SelectItem>
                  <SelectItem value="users">{t.sortUsers}</SelectItem>
                  <SelectItem value="updated">{t.sortUpdated}</SelectItem>
                </SelectContent>
              </Select>

              {hasFilters ? (
                <Button
                  variant="ghost"
                  className="rounded-xl"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[1220px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("w-[230px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.plan}
                      </TableHead>
                      <TableHead className={cn("w-[100px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.code}
                      </TableHead>
                      <TableHead className={cn("w-[170px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.prices}
                      </TableHead>
                      <TableHead className={cn("w-[190px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.limits}
                      </TableHead>
                      <TableHead className={cn("w-[100px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.companies}
                      </TableHead>
                      <TableHead className={cn("w-[170px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.features}
                      </TableHead>
                      <TableHead className={cn("w-[110px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.status}
                      </TableHead>
                      <TableHead className={cn("w-[110px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.visibility}
                      </TableHead>
                      <TableHead className={cn("w-[120px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.updatedAt}
                      </TableHead>
                      <TableHead className="sticky left-0 z-10 h-11 w-[76px] bg-muted/40 px-3 text-center text-xs font-semibold text-muted-foreground">
                        {t.actions}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.length ? (
                      filteredPlans.map((plan) => (
                        <TableRow key={plan.id || plan.slug || plan.code} className="h-[68px] hover:bg-muted/30">
                          <TableCell className={cn("px-4", alignClass)}>
                            <div className="space-y-1">
                              <p className="font-semibold">{plan.name}</p>
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                {plan.description || plan.slug}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className={cn("px-4", alignClass)}>
                            <Badge variant="outline" className="rounded-full">
                              {plan.code || t.unknown}
                            </Badge>
                          </TableCell>

                          <TableCell className={cn("px-4", alignClass)}>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{t.monthly}</span>
                                <MoneyValue value={plan.monthly_price} />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{t.yearly}</span>
                                <MoneyValue value={plan.yearly_price} />
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className={cn("px-4", alignClass)}>
                            <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                              <span className="inline-flex items-center gap-1">
                                <UsersRound className="h-3.5 w-3.5" />
                                {formatInteger(plan.max_users)} {t.users}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Activity className="h-3.5 w-3.5" />
                                {formatInteger(plan.max_branches)} {t.branches}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Warehouse className="h-3.5 w-3.5" />
                                {formatInteger(plan.max_warehouses)} {t.warehouses}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Zap className="h-3.5 w-3.5" />
                                {formatInteger(plan.max_pos)} {t.pos}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className={cn("px-4", alignClass)}>
                            <span className="font-semibold tabular-nums">
                              {formatInteger(plan.companies_count)}
                            </span>
                          </TableCell>

                          <TableCell className={cn("px-4", alignClass)}>
                            <div className="flex max-w-[160px] flex-wrap gap-1">
                              {plan.features.slice(0, 2).map((feature) => (
                                <Badge key={feature} variant="secondary" className="rounded-full text-[11px]">
                                  {feature}
                                </Badge>
                              ))}
                              {plan.features.length > 2 ? (
                                <Badge variant="outline" className="rounded-full text-[11px]">
                                  +{formatInteger(plan.features.length - 2)}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell className={cn("px-4", alignClass)}>
                            <StatusBadge active={plan.is_active} locale={locale} />
                          </TableCell>

                          <TableCell className={cn("px-4", alignClass)}>
                            <VisibilityBadge isPublic={plan.is_public} locale={locale} />
                          </TableCell>

                          <TableCell className={cn("px-4", alignClass)}>
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {formatDate(plan.updated_at || plan.created_at)}
                            </span>
                          </TableCell>

                          <TableCell className="sticky left-0 z-10 w-[76px] bg-background px-3 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg bg-background"
                                  aria-label={t.actions}
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align={locale === "ar" ? "start" : "end"}
                                className="w-48 rounded-xl p-1"
                              >
                                <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-xs">
                                  <Link href={plan.id ? `/system/plans/${plan.id}` : "/system/plans"}>
                                    <ListChecks className="h-3.5 w-3.5" />
                                    {t.details}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-xs">
                                  <Link href="/system/plans">
                                    <Gift className="h-3.5 w-3.5" />
                                    {t.plansCenter}
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10}>
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
                  {formatInteger(filteredPlans.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(apiTotal || plans.length)}
                </span>{" "}
                {t.rows}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system">
                    <LayoutDashboard className="h-4 w-4" />
                    {t.systemDashboard}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system/plans">
                    <Gift className="h-4 w-4" />
                    {t.backToPlans}
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
