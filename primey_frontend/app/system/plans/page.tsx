"use client";

/* ============================================================
   📂 primey_frontend/app/system/plans/page.tsx
   💼 Mhamcloud — System Plans Management
   ------------------------------------------------------------
   ✅ Approved Premium Mhamcloud system page pattern
   ✅ Same spirit as companies/subscriptions/platform-payments pages
   ✅ Real API only:
      - GET  /api/system/plans/
      - POST /api/system/plans/{id}/status/
   ✅ KPI cards + quick actions + plans management table
   ✅ Search, status filter, visibility filter, code filter, sorting, reset
   ✅ Activate / deactivate plans
   ✅ Publish / hide plans
   ✅ Create/detail/edit navigation prepared for the next approved pages
   ✅ CSRF/session auth with credentials include for status actions
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
  ArrowUpDown,
  BarChart3,
  BadgeCheck,
  CreditCard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Gift,
  LayoutDashboard,
  ListChecks,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type StatusFilter = "all" | "active" | "inactive";
type VisibilityFilter = "all" | "public" | "internal";
type SortKey = "order" | "name" | "monthly" | "yearly" | "companies";
type PlanAction = "activate" | "deactivate" | "publish" | "hide";

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

type ServerStats = {
  total: number;
  active: number;
  inactive: number;
  public: number;
  internal: number;
};

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const API_ENDPOINT = "/api/system/plans/";
const CSRF_ENDPOINT = "/api/auth/csrf";

const translations = {
  ar: {
    title: "باقات المنصة",
    subtitle:
      "إدارة باقات Mhamcloud من مكان واحد: الأسعار الحدود الظهور التفعيل وعلاقة الباقة باشتراكات الشركات.",
    badge: "إدارة المنصة",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    reset: "إعادة ضبط",
    createPlan: "إنشاء باقة",
    details: "تفاصيل",
    edit: "تعديل",
    actions: "الإجراءات",
    activate: "تفعيل",
    deactivate: "تعطيل",
    publish: "إظهار",
    hide: "إخفاء",
    activating: "جاري التفعيل...",
    deactivating: "جاري التعطيل...",
    publishing: "جاري الإظهار...",
    hiding: "جاري الإخفاء...",
    confirmDeactivate:
      "تعطيل الباقة لا يلغي اشتراكات الشركات الحالية لكنه يمنع استخدامها كباقة مفعلة. هل تريد المتابعة",
    confirmHide:
      "إخفاء الباقة يمنع ظهورها مستقبلا للاشتراك ولا يمس البيانات السابقة. هل تريد المتابعة",
    actionSuccess: "تم تحديث حالة الباقة بنجاح.",
    searchPlaceholder: "ابحث باسم الباقة أو الكود أو المعرف أو الوصف...",
    all: "الكل",
    allStatuses: "كل الحالات",
    allVisibility: "كل أنواع الظهور",
    allCodes: "كل الأكواد",
    activeOnly: "المفعلة",
    inactiveOnly: "الموقفة",
    publicOnly: "العامة",
    internalOnly: "الداخلية",
    sort: "الترتيب",
    sortOrder: "الترتيب",
    sortName: "الاسم",
    sortMonthly: "السعر الشهري",
    sortYearly: "السعر السنوي",
    sortCompanies: "عدد الشركات",
    totalPlans: "إجمالي الباقات",
    activePlans: "الباقات المفعلة",
    inactivePlans: "الباقات الموقفة",
    publicPlans: "باقات ظاهرة",
    fromLiveApi: "من واجهات النظام الحقيقية",
    actionsTitle: "اختصارات وحدة الباقات",
    actionsDesc: "تنقل سريع بنفس نمط إدارة المنصة المعتمد.",
    createTitle: "إنشاء باقة جديدة",
    createDesc: "إضافة باقة SaaS جديدة من API الباقات الحقيقي.",
    openSubscriptionsTitle: "اشتراكات الشركات",
    openSubscriptionsDesc: "متابعة الاشتراكات المرتبطة بالباقات.",
    openPaymentsTitle: "مدفوعات المنصة",
    openPaymentsDesc: "مراجعة عمليات تحصيل اشتراكات المنصة.",
    openSettingsTitle: "إعدادات النظام",
    openSettingsDesc: "تحكم بإعدادات المنصة وسياساتها.",
    dashboardTitle: "تقارير الباقات",
    dashboardDesc: "تحليل الباقات حسب الحالة والظهور والأسعار وحدود الاستخدام.",
    tableTitle: "قائمة الباقات",
    tableDesc:
      "جدول إدارة باقات Mhamcloud مع الأسعار والحدود والحالة والظهور وإجراءات الإدارة.",
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
    status: "الحالة",
    visibility: "الظهور",
    updatedAt: "آخر تحديث",
    active: "مفعلة",
    inactive: "موقفة",
    public: "عامة",
    internal: "داخلية",
    unknown: "غير محدد",
    noDataTitle: "لا توجد باقات",
    noDataDesc: "ستظهر باقات المنصة هنا عند توفرها من API.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غير البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل مركز الباقات",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير باقات Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    refreshed: "تم تحديث مركز الباقات.",
  },
  en: {
    title: "Platform Plans",
    subtitle:
      "Manage Mhamcloud plans in one place: prices, limits, visibility, activation, and company subscription usage.",
    badge: "Platform management",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    reset: "Reset",
    createPlan: "Create plan",
    details: "Details",
    edit: "Edit",
    actions: "Actions",
    activate: "Activate",
    deactivate: "Deactivate",
    publish: "Publish",
    hide: "Hide",
    activating: "Activating...",
    deactivating: "Deactivating...",
    publishing: "Publishing...",
    hiding: "Hiding...",
    confirmDeactivate:
      "Deactivating a plan does not cancel existing company subscriptions, but it marks the plan inactive. Continue?",
    confirmHide:
      "Hiding a plan prevents future public visibility and does not affect previous data. Continue?",
    actionSuccess: "Plan status updated successfully.",
    searchPlaceholder: "Search by plan name, code, slug, or description...",
    all: "All",
    allStatuses: "All statuses",
    allVisibility: "All visibility",
    allCodes: "All codes",
    activeOnly: "Active only",
    inactiveOnly: "Inactive only",
    publicOnly: "Public only",
    internalOnly: "Internal only",
    sort: "Sort",
    sortOrder: "Order",
    sortName: "Name",
    sortMonthly: "Monthly price",
    sortYearly: "Yearly price",
    sortCompanies: "Companies count",
    totalPlans: "Total plans",
    activePlans: "Active plans",
    inactivePlans: "Inactive plans",
    publicPlans: "Public plans",
    fromLiveApi: "From real system APIs",
    actionsTitle: "Plans module shortcuts",
    actionsDesc: "Quick navigation using the approved platform management pattern.",
    createTitle: "Create a new plan",
    createDesc: "Add a new SaaS plan through the real plans API.",
    openSubscriptionsTitle: "Company subscriptions",
    openSubscriptionsDesc: "Review company subscriptions linked to platform plans.",
    openPaymentsTitle: "Platform payments",
    openPaymentsDesc: "Review platform subscription payment collection.",
    openSettingsTitle: "System settings",
    openSettingsDesc: "Control platform settings and policies.",
    dashboardTitle: "Plans reports",
    dashboardDesc: "Analyze plans by status, visibility, pricing, and usage limits.",
    tableTitle: "Plans list",
    tableDesc:
      "A management table for Mhamcloud plans with prices, limits, status, visibility, and actions.",
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
    status: "Status",
    visibility: "Visibility",
    updatedAt: "Updated at",
    active: "Active",
    inactive: "Inactive",
    public: "Public",
    internal: "Internal",
    unknown: "Unknown",
    noDataTitle: "No plans",
    noDataDesc: "Platform plans will appear here when returned by the API.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Could not load plans center",
    errorDesc:
      "Make sure you are signed in as a system user and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "Mhamcloud Platform Plans Report",
    generatedAt: "Generated at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    refreshed: "Plans center refreshed.",
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

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["1", "true", "yes", "y", "on", "active", "public"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "n", "off", "inactive", "internal"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
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

function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();

  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length !== 2) return "";

  return decodeURIComponent(parts.pop()?.split(";").shift() || "");
}

async function ensureCsrfToken() {
  let token = getCookie("csrftoken");

  if (token) return token;

  const response = await fetch(makeApiUrl(CSRF_ENDPOINT), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok) return "";

  token = getCookie("csrftoken");

  return token;
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

async function postJson<T>(path: string, body: ApiRecord): Promise<T> {
  const csrfToken = await ensureCsrfToken();

  const response = await fetch(makeApiUrl(path), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: JSON.stringify(body),
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
      normalizeText(record.non_field_errors) ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
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

function extractPlanFromPayload(payload: unknown): PlanRecord | null {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const planRecord = asRecord(record.plan ?? dataRecord.plan ?? dataRecord.item ?? dataRecord.result);

  if (!Object.keys(planRecord).length) return null;

  return normalizePlan(planRecord);
}

function rowDateValue(value: string | null) {
  if (!value) return 0;

  const parsed = new Date(value).getTime();

  return Number.isFinite(parsed) ? parsed : 0;
}

function getStatusClass(isActive: boolean) {
  return isActive
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-50 text-slate-700";
}

function getVisibilityClass(isPublic: boolean) {
  return isPublic
    ? "border-sky-200 bg-sky-50 text-sky-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function actionBusyText(action: PlanAction, locale: Locale) {
  const t = translations[locale];

  if (action === "activate") return t.activating;
  if (action === "deactivate") return t.deactivating;
  if (action === "publish") return t.publishing;

  return t.hiding;
}

function applyLocalAction(plan: PlanRecord, action: PlanAction): PlanRecord {
  if (action === "activate") return { ...plan, is_active: true };
  if (action === "deactivate") return { ...plan, is_active: false };
  if (action === "publish") return { ...plan, is_public: true };
  if (action === "hide") return { ...plan, is_public: false };

  return plan;
}

function MoneyValue({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-foreground">
      <Image
        src="/currency/sar.svg"
        alt="SAR"
        width={14}
        height={14}
        className="h-3.5 w-3.5"
      />
      {formatMoney(value)}
    </span>
  );
}

function StatusBadge({ active, locale }: { active: boolean; locale: Locale }) {
  const t = translations[locale];

  return (
    <Badge variant="outline" className={cn("rounded-full px-3 py-1", getStatusClass(active))}>
      {active ? t.active : t.inactive}
    </Badge>
  );
}

function VisibilityBadge({ isPublic, locale }: { isPublic: boolean; locale: Locale }) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-3 py-1", getVisibilityClass(isPublic))}
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
  value: string;
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

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;

  return (
    <Button
      asChild
      variant="outline"
      className="h-auto justify-start rounded-2xl bg-background p-4 text-start transition hover:-translate-y-0.5 hover:shadow-sm"
    >
      <Link href={action.href}>
        <span className="flex w-full items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <span className="space-y-1">
            <span className="block font-semibold text-foreground">{action.title}</span>
            <span className="block text-xs leading-5 text-muted-foreground">
              {action.description}
            </span>
          </span>
        </span>
      </Link>
    </Button>
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
        <Gift className="h-6 w-6 text-muted-foreground" />
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

function PlansManagementSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <Skeleton className="h-48 rounded-3xl" />
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

export default function SystemPlansPage() {
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
  const [busyAction, setBusyAction] = React.useState("");
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [visibility, setVisibility] = React.useState<VisibilityFilter>("all");
  const [code, setCode] = React.useState("all");
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

  const loadPlans = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const payload = await fetchJson<unknown>(makeApiUrl(API_ENDPOINT));
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
    void loadPlans();
  }, [loadPlans]);

  const resetFilters = React.useCallback(() => {
    setSearch("");
    setStatus("all");
    setVisibility("all");
    setCode("all");
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

      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "monthly") return toNumber(a.monthly_price) - toNumber(b.monthly_price);
      if (sort === "yearly") return toNumber(a.yearly_price) - toNumber(b.yearly_price);
      if (sort === "companies") return b.companies_count - a.companies_count;

      const orderDiff = a.sort_order - b.sort_order;

      if (orderDiff !== 0) return orderDiff;

      return rowDateValue(b.updated_at || b.created_at) - rowDateValue(a.updated_at || a.created_at);
    });
  }, [code, plans, search, sort, status, visibility]);

  const stats = React.useMemo<ServerStats>(() => {
    return {
      total: serverStats.total || apiTotal || plans.length,
      active: serverStats.active || plans.filter((plan) => plan.is_active).length,
      inactive: serverStats.inactive || plans.filter((plan) => !plan.is_active).length,
      public: serverStats.public || plans.filter((plan) => plan.is_public).length,
      internal: serverStats.internal || plans.filter((plan) => !plan.is_public).length,
    };
  }, [apiTotal, plans, serverStats]);

  const quickActions = React.useMemo<QuickAction[]>(
    () => [
      {
        title: t.createTitle,
        description: t.createDesc,
        href: "/system/plans/create",
        icon: Plus,
      },
      {
        title: t.openSubscriptionsTitle,
        description: t.openSubscriptionsDesc,
        href: "/system/subscriptions",
        icon: CreditCard,
      },
      {
        title: t.openPaymentsTitle,
        description: t.openPaymentsDesc,
        href: "/system/platform-payments",
        icon: FileText,
      },
      {
        title: t.dashboardTitle,
        description: t.dashboardDesc,
        href: "/system/plans/reports",
        icon: BarChart3,
      },
    ],
    [
      t.createDesc,
      t.createTitle,
      t.dashboardDesc,
      t.dashboardTitle,
      t.openPaymentsDesc,
      t.openPaymentsTitle,
      t.openSubscriptionsDesc,
      t.openSubscriptionsTitle,
    ],
  );

  const hasFilters = Boolean(
    search || status !== "all" || visibility !== "all" || code !== "all" || sort !== "order",
  );

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
    link.download = `Mhamcloud-system-plans-management-${new Date().toISOString().slice(0, 10)}.xls`;
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

  async function runPlanAction(plan: PlanRecord, action: PlanAction) {
    if (!plan.id) return;

    if (action === "deactivate" && !window.confirm(t.confirmDeactivate)) return;
    if (action === "hide" && !window.confirm(t.confirmHide)) return;

    const actionKey = `${plan.id}:${action}`;

    try {
      setBusyAction(actionKey);

      const payload = await postJson<unknown>(
        `/api/system/plans/${encodeURIComponent(plan.id)}/status/`,
        { action },
      );

      const updatedPlan = extractPlanFromPayload(payload) || applyLocalAction(plan, action);
      const record = asRecord(payload);
      const message = normalizeText(record.message) || t.actionSuccess;

      setPlans((current) =>
        current.map((item) => (item.id === plan.id ? updatedPlan : item)),
      );

      toast.success(message);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
      toast.error(message);
    } finally {
      setBusyAction("");
    }
  }

  if (loading) return <PlansManagementSkeleton />;

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
              <Button className="rounded-xl" onClick={() => void loadPlans()}>
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
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadPlans({ silent: true })}
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
                    <Plus className="h-4 w-4" />
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
            value={formatInteger(stats.total)}
            description={t.fromLiveApi}
            icon={Gift}
          />
          <MetricCard
            title={t.activePlans}
            value={formatInteger(stats.active)}
            description={t.fromLiveApi}
            icon={BadgeCheck}
          />
          <MetricCard
            title={t.inactivePlans}
            value={formatInteger(stats.inactive)}
            description={t.fromLiveApi}
            icon={Power}
          />
          <MetricCard
            title={t.publicPlans}
            value={formatInteger(stats.public)}
            description={t.fromLiveApi}
            icon={Eye}
          />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.actionsTitle}</CardTitle>
            <CardDescription>{t.actionsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => (
                <QuickActionCard key={action.href} action={action} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>{t.tableTitle}</CardTitle>
                <CardDescription className="mt-2">{t.tableDesc}</CardDescription>
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
                  <SelectValue placeholder={t.allStatuses} />
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
                  <SelectValue placeholder={t.allVisibility} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allVisibility}</SelectItem>
                  <SelectItem value="public">{t.publicOnly}</SelectItem>
                  <SelectItem value="internal">{t.internalOnly}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={code} onValueChange={setCode}>
                <SelectTrigger className="h-11 rounded-xl bg-background">
                  <SelectValue placeholder={t.allCodes} />
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

              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger className="h-11 rounded-xl bg-background">
                  <ArrowUpDown className="h-4 w-4" />
                  <SelectValue placeholder={t.sort} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">{t.sortOrder}</SelectItem>
                  <SelectItem value="name">{t.sortName}</SelectItem>
                  <SelectItem value="monthly">{t.sortMonthly}</SelectItem>
                  <SelectItem value="yearly">{t.sortYearly}</SelectItem>
                  <SelectItem value="companies">{t.sortCompanies}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasFilters ? (
              <Button
                variant="ghost"
                className="w-fit rounded-xl"
                onClick={resetFilters}
              >
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[1120px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("h-11 w-[220px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.plan}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[95px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.code}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[155px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.prices}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[185px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.limits}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[105px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.companies}
                      </TableHead>
                      <TableHead className={cn("min-w-[120px] px-4", alignClass)}>
                        {t.status}
                      </TableHead>
                      <TableHead className={cn("min-w-[120px] px-4", alignClass)}>
                        {t.visibility}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[120px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.updatedAt}
                      </TableHead>
                      <TableHead className="sticky left-0 z-10 h-11 w-[76px] bg-muted/40 px-3 text-center text-xs font-semibold text-muted-foreground">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.length ? (
                      filteredPlans.map((plan) => {
                        const activateKey = `${plan.id}:activate`;
                        const deactivateKey = `${plan.id}:deactivate`;
                        const publishKey = `${plan.id}:publish`;
                        const hideKey = `${plan.id}:hide`;
                        const isAnyBusy = busyAction.startsWith(`${plan.id}:`);

                        return (
                          <TableRow key={plan.id || plan.slug || plan.code} className="h-[64px] hover:bg-muted/30">
                            <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                              <div className="space-y-1">
                                <div className="font-semibold text-foreground">{plan.name}</div>
                                <div className="text-xs text-muted-foreground">{plan.slug}</div>
                                {plan.description ? (
                                  <div className="line-clamp-1 max-w-[360px] text-xs text-muted-foreground">
                                    {plan.description}
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>

                            <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                              <Badge variant="outline" className="rounded-full">
                                {plan.code || t.unknown}
                              </Badge>
                            </TableCell>

                            <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                              <div className="space-y-1 text-sm">
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

                            <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
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

                            <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                              <span className="font-semibold tabular-nums">
                                {formatInteger(plan.companies_count)}
                              </span>
                            </TableCell>

                            <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                              <StatusBadge active={plan.is_active} locale={locale} />
                            </TableCell>

                            <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                              <VisibilityBadge isPublic={plan.is_public} locale={locale} />
                            </TableCell>

                            <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                              <span className="text-sm tabular-nums text-muted-foreground">
                                {formatDate(plan.updated_at || plan.created_at)}
                              </span>
                            </TableCell>
                            <TableCell className="sticky left-0 z-10 h-[64px] w-[76px] bg-background px-3 text-center align-middle">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg bg-background"
                                    aria-label={t.actions}
                                    disabled={isAnyBusy}
                                  >
                                    {isAnyBusy ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    )}
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

                                  <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-xs">
                                    <Link href={plan.id ? `/system/plans/${plan.id}` : "/system/plans"}>
                                      <Pencil className="h-3.5 w-3.5" />
                                      {t.edit}
                                    </Link>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  {plan.is_active ? (
                                    <DropdownMenuItem
                                      className="cursor-pointer gap-2 rounded-lg text-xs"
                                      disabled={isAnyBusy}
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        void runPlanAction(plan, "deactivate");
                                      }}
                                    >
                                      {busyAction === deactivateKey ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Power className="h-3.5 w-3.5" />
                                      )}
                                      {busyAction === deactivateKey
                                        ? actionBusyText("deactivate", locale)
                                        : t.deactivate}
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      className="cursor-pointer gap-2 rounded-lg text-xs"
                                      disabled={isAnyBusy}
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        void runPlanAction(plan, "activate");
                                      }}
                                    >
                                      {busyAction === activateKey ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <BadgeCheck className="h-3.5 w-3.5" />
                                      )}
                                      {busyAction === activateKey
                                        ? actionBusyText("activate", locale)
                                        : t.activate}
                                    </DropdownMenuItem>
                                  )}

                                  {plan.is_public ? (
                                    <DropdownMenuItem
                                      className="cursor-pointer gap-2 rounded-lg text-xs"
                                      disabled={isAnyBusy}
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        void runPlanAction(plan, "hide");
                                      }}
                                    >
                                      {busyAction === hideKey ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <EyeOff className="h-3.5 w-3.5" />
                                      )}
                                      {busyAction === hideKey
                                        ? actionBusyText("hide", locale)
                                        : t.hide}
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      className="cursor-pointer gap-2 rounded-lg text-xs"
                                      disabled={isAnyBusy}
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        void runPlanAction(plan, "publish");
                                      }}
                                    >
                                      {busyAction === publishKey ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Eye className="h-3.5 w-3.5" />
                                      )}
                                      {busyAction === publishKey
                                        ? actionBusyText("publish", locale)
                                        : t.publish}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
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
                  {formatInteger(filteredPlans.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(apiTotal || plans.length)}
                </span>{" "}
                {t.rows}
              </p>
              <Button asChild variant="outline" className="w-fit rounded-xl bg-background">
                <Link href="/system/plans/create">
                  <Plus className="h-4 w-4" />
                  {t.createPlan}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
