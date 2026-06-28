"use client";

/* ============================================================
   📂 primey_frontend/app/system/plans/[id]/page.tsx
   💼 PrimeyAcc — System Plan Detail + Edit
   ------------------------------------------------------------
   ✅ Approved Premium PrimeyAcc system page pattern
   ✅ Real API only:
      - GET  /api/system/plans/{id}/
      - POST /api/system/plans/{id}/update/
      - POST /api/system/plans/{id}/status/
   ✅ Detail cards + KPI cards + edit form
   ✅ Recent linked subscriptions table
   ✅ Table actions use compact vertical dots menu
   ✅ CSRF/session auth with credentials include
   ✅ English digits for money/numeric inputs
   ✅ Feature chips + suggestions UI
   ✅ Arabic/English via primey-locale
   ✅ sonner toast
   ✅ SAR icon from public/currency/sar.svg
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Gift,
  LayoutDashboard,
  ListChecks,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UsersRound,
  Warehouse,
  X,
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
type PlanAction = "activate" | "deactivate" | "publish" | "hide";

type PlanStats = {
  subscriptions_total: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  expired_subscriptions: number;
  cancelled_subscriptions: number;
  suspended_subscriptions: number;
};

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
  stats: PlanStats;
  created_at: string | null;
  updated_at: string | null;
};

type SubscriptionRecord = {
  id: string;
  company_id: string;
  company_name: string;
  company_code: string;
  status: string;
  billing_cycle: string;
  start_date: string | null;
  end_date: string | null;
  days_remaining: number;
  total_amount: string;
  auto_renew: boolean;
  is_current: boolean;
  created_at: string | null;
};

type PlanFormState = {
  name: string;
  code: string;
  slug: string;
  description: string;
  monthly_price: string;
  yearly_price: string;
  max_users: string;
  max_branches: string;
  max_warehouses: string;
  max_pos: string;
  features: string;
  is_active: boolean;
  is_public: boolean;
  sort_order: string;
};

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const CSRF_ENDPOINT = "/api/auth/csrf";

const FEATURE_SUGGESTIONS = {
  ar: [
    "الحسابات العامة",
    "دليل الحسابات",
    "القيود اليومية",
    "فواتير مبيعات",
    "أوامر البيع",
    "مرتجعات المبيعات",
    "إشعارات دائنة",
    "فواتير مشتريات",
    "إدارة المخزون",
    "المواقع والمخازن",
    "الأصناف والتسعير",
    "الأرقام التسلسلية والدفعات",
    "الحجوزات والتخصيص",
    "الجرد والتقييم",
    "نقاط البيع",
    "الخزينة والمدفوعات",
    "طرق الدفع والأجهزة",
    "التقارير المالية",
    "المستندات والقوالب",
    "PDF والطباعة",
    "الطباعة الحرارية",
    "واتساب والإشعارات",
    "إدارة العملاء",
    "إدارة الموردين",
    "الموارد البشرية",
    "الحضور والانصراف",
    "الإجازات",
    "الرواتب",
    "تقييم الأداء",
    "المستخدمون والصلاحيات",
    "الفروع",
    "المخازن",
    "الدعم الفني",
    "التكاملات",
    "مفاتيح API",
    "الأنشطة المتخصصة",
    "المجوهرات",
    "المطاعم",
  ],
  en: [
    "General accounting",
    "Chart of accounts",
    "Journal entries",
    "Sales invoices",
    "Sales orders",
    "Sales returns",
    "Credit notes",
    "Purchase bills",
    "Inventory management",
    "Locations and warehouses",
    "Items and pricing",
    "Serials, batches, and expiry",
    "Reservations and allocation",
    "Physical counts and valuation",
    "Point of sale",
    "Treasury and payments",
    "Payment methods and devices",
    "Financial reports",
    "Documents and templates",
    "PDF and printing",
    "Thermal printing",
    "WhatsApp and notifications",
    "Customer management",
    "Supplier management",
    "Human resources",
    "Attendance",
    "Leaves",
    "Payroll",
    "Performance reviews",
    "Users and permissions",
    "Branches",
    "Warehouses",
    "Support",
    "Integrations",
    "API keys",
    "Activity-specific modules",
    "Jewelry",
    "Restaurants",
  ],
} as const;

const translations = {
  ar: {
    badge: "إدارة المنصة",
    title: "تفاصيل الباقة",
    subtitle: "عرض وتعديل بيانات الباقة ومتابعة الاشتراكات المرتبطة بها من واجهات النظام الحقيقية.",
    back: "العودة للباقات",
    refresh: "تحديث",
    edit: "تعديل",
    cancelEdit: "إلغاء التعديل",
    save: "حفظ التعديلات",
    saving: "جاري الحفظ...",
    details: "تفاصيل",
    activate: "تفعيل",
    deactivate: "تعطيل",
    publish: "إظهار",
    hide: "إخفاء",
    actions: "الإجراءات",
    confirmDeactivate: "تعطيل الباقة لا يلغي اشتراكات الشركات الحالية. هل تريد المتابعة",
    confirmHide: "إخفاء الباقة يمنع ظهورها مستقبلا فقط. هل تريد المتابعة",
    updated: "تم حفظ التعديلات بنجاح.",
    statusUpdated: "تم تحديث حالة الباقة بنجاح.",
    errorTitle: "تعذر تحميل تفاصيل الباقة",
    errorDesc: "تأكد من الصلاحيات ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    totalSubscriptions: "إجمالي الاشتراكات",
    activeSubscriptions: "اشتراكات نشطة",
    trialSubscriptions: "اشتراكات تجريبية",
    expiredSubscriptions: "اشتراكات منتهية",
    fromLiveApi: "من واجهات النظام الحقيقية",
    planInfo: "بيانات الباقة",
    pricing: "الأسعار",
    limits: "الحدود التشغيلية",
    features: "المميزات",
    noFeatures: "لا توجد مميزات مسجلة.",
    monthly: "شهري",
    yearly: "سنوي",
    users: "مستخدم",
    branches: "فرع",
    warehouses: "مخزن",
    pos: "نقطة بيع",
    active: "مفعلة",
    inactive: "موقفة",
    public: "عامة",
    internal: "داخلية",
    name: "اسم الباقة",
    code: "كود الباقة",
    slug: "معرف الرابط",
    description: "الوصف",
    monthlyPrice: "السعر الشهري",
    yearlyPrice: "السعر السنوي",
    maxUsers: "عدد المستخدمين",
    maxBranches: "عدد الفروع",
    maxWarehouses: "عدد المخازن",
    maxPos: "نقاط البيع",
    sortOrder: "ترتيب العرض",
    statusVisibility: "الحالة والظهور",
    addFeature: "إضافة",
    featureInputPlaceholder: "اكتب ميزة ثم اضغط إضافة...",
    suggestedFeatures: "اقتراحات جاهزة",
    selectedFeatures: "المميزات المختارة",
    recentSubscriptions: "آخر اشتراكات مرتبطة",
    recentSubscriptionsDesc: "آخر الشركات التي تستخدم هذه الباقة حسب API التفاصيل.",
    company: "الشركة",
    subscriptionStatus: "حالة الاشتراك",
    billingCycle: "دورة الفوترة",
    period: "الفترة",
    amount: "المبلغ",
    noSubscriptions: "لا توجد اشتراكات مرتبطة بهذه الباقة.",
    quickTitle: "اختصارات وحدة الباقات",
    quickDesc: "تنقل سريع بنفس نمط إدارة المنصة المعتمد.",
    plansList: "قائمة الباقات",
    plansListDesc: "العودة إلى جدول إدارة الباقات.",
    subscriptions: "اشتراكات الشركات",
    subscriptionsDesc: "متابعة اشتراكات الشركات.",
    payments: "مدفوعات المنصة",
    paymentsDesc: "مراجعة مدفوعات المنصة.",
    dashboard: "لوحة النظام",
    dashboardDesc: "العودة إلى لوحة النظام الرئيسية.",
    requiredName: "اسم الباقة مطلوب.",
    requiredCode: "كود الباقة مطلوب.",
    invalidNumber: "القيم الرقمية يجب أن تكون صفر أو أكبر.",
  },
  en: {
    badge: "Platform management",
    title: "Plan details",
    subtitle: "View and edit plan data and track linked subscriptions through real system APIs.",
    back: "Back to plans",
    refresh: "Refresh",
    edit: "Edit",
    cancelEdit: "Cancel edit",
    save: "Save changes",
    saving: "Saving...",
    details: "Details",
    activate: "Activate",
    deactivate: "Deactivate",
    publish: "Publish",
    hide: "Hide",
    actions: "Actions",
    confirmDeactivate: "Deactivating a plan does not cancel existing subscriptions. Continue?",
    confirmHide: "Hiding a plan only prevents future public visibility. Continue?",
    updated: "Changes saved successfully.",
    statusUpdated: "Plan status updated successfully.",
    errorTitle: "Could not load plan details",
    errorDesc: "Make sure you have permission and the backend is running, then try again.",
    tryAgain: "Try again",
    totalSubscriptions: "Total subscriptions",
    activeSubscriptions: "Active subscriptions",
    trialSubscriptions: "Trial subscriptions",
    expiredSubscriptions: "Expired subscriptions",
    fromLiveApi: "From real system APIs",
    planInfo: "Plan information",
    pricing: "Pricing",
    limits: "Operational limits",
    features: "Features",
    noFeatures: "No features recorded.",
    monthly: "Monthly",
    yearly: "Yearly",
    users: "users",
    branches: "branches",
    warehouses: "warehouses",
    pos: "POS",
    active: "Active",
    inactive: "Inactive",
    public: "Public",
    internal: "Internal",
    name: "Plan name",
    code: "Plan code",
    slug: "Slug",
    description: "Description",
    monthlyPrice: "Monthly price",
    yearlyPrice: "Yearly price",
    maxUsers: "Max users",
    maxBranches: "Max branches",
    maxWarehouses: "Max warehouses",
    maxPos: "Max POS",
    sortOrder: "Sort order",
    statusVisibility: "Status and visibility",
    addFeature: "Add",
    featureInputPlaceholder: "Write a feature then click Add...",
    suggestedFeatures: "Suggested features",
    selectedFeatures: "Selected features",
    recentSubscriptions: "Recent linked subscriptions",
    recentSubscriptionsDesc: "Latest companies using this plan from the detail API.",
    company: "Company",
    subscriptionStatus: "Subscription status",
    billingCycle: "Billing cycle",
    period: "Period",
    amount: "Amount",
    noSubscriptions: "No subscriptions linked to this plan.",
    quickTitle: "Plans module shortcuts",
    quickDesc: "Quick navigation using the approved platform management pattern.",
    plansList: "Plans list",
    plansListDesc: "Return to the plans management table.",
    subscriptions: "Company subscriptions",
    subscriptionsDesc: "Review company subscriptions.",
    payments: "Platform payments",
    paymentsDesc: "Review platform payments.",
    dashboard: "System dashboard",
    dashboardDesc: "Return to the main system dashboard.",
    requiredName: "Plan name is required.",
    requiredCode: "Plan code is required.",
    invalidNumber: "Numeric values must be zero or greater.",
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

function toEnglishDigits(value: string) {
  return String(value || "").replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
    const code = digit.charCodeAt(0);

    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);

    return digit;
  });
}

function cleanDecimalInput(value: string) {
  const normalized = toEnglishDigits(value).replace(",", ".");
  const onlyValid = normalized.replace(/[^0-9.]/g, "");
  const parts = onlyValid.split(".");

  if (parts.length <= 1) return parts[0] || "";

  return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
}

function cleanIntegerInput(value: string) {
  return toEnglishDigits(value).replace(/[^0-9]/g, "");
}

function toSafeNumber(value: string) {
  const parsed = Number(String(value || "0").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
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
        `Request failed with status ${response.status}`,
    );
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
    throw new Error(
      normalizeText(record.message) ||
        normalizeText(record.detail) ||
        normalizeText(record.error) ||
        `Request failed with status ${response.status}`,
    );
  }

  return (payload || {}) as T;
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

function featuresToList(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyStats(): PlanStats {
  return {
    subscriptions_total: 0,
    active_subscriptions: 0,
    trial_subscriptions: 0,
    expired_subscriptions: 0,
    cancelled_subscriptions: 0,
    suspended_subscriptions: 0,
  };
}

function normalizePlan(value: unknown): PlanRecord {
  const record = asRecord(value);
  const stats = asRecord(record.stats);

  return {
    id: normalizeText(record.id ?? record.pk),
    name: normalizeText(record.name, "—"),
    code: normalizeText(record.code, "—").toUpperCase(),
    slug: normalizeText(record.slug, "—"),
    description: normalizeText(record.description),
    monthly_price: normalizeText(record.monthly_price, "0.00"),
    yearly_price: normalizeText(record.yearly_price, "0.00"),
    max_users: toNumber(record.max_users, 0),
    max_branches: toNumber(record.max_branches, 0),
    max_warehouses: toNumber(record.max_warehouses, 0),
    max_pos: toNumber(record.max_pos, 0),
    features: normalizeFeatures(record.features),
    is_active: toBoolean(record.is_active, true),
    is_public: toBoolean(record.is_public, true),
    sort_order: toNumber(record.sort_order, 0),
    stats: {
      subscriptions_total: toNumber(stats.subscriptions_total, 0),
      active_subscriptions: toNumber(stats.active_subscriptions, 0),
      trial_subscriptions: toNumber(stats.trial_subscriptions, 0),
      expired_subscriptions: toNumber(stats.expired_subscriptions, 0),
      cancelled_subscriptions: toNumber(stats.cancelled_subscriptions, 0),
      suspended_subscriptions: toNumber(stats.suspended_subscriptions, 0),
    },
    created_at: normalizeText(record.created_at) || null,
    updated_at: normalizeText(record.updated_at) || null,
  };
}

function normalizeSubscription(value: unknown): SubscriptionRecord {
  const record = asRecord(value);
  const company = asRecord(record.company);

  return {
    id: normalizeText(record.id ?? record.pk),
    company_id: normalizeText(company.id),
    company_name: normalizeText(company.name, "—"),
    company_code: normalizeText(company.company_code ?? company.code),
    status: normalizeText(record.status, "—"),
    billing_cycle: normalizeText(record.billing_cycle, "—"),
    start_date: normalizeText(record.start_date) || null,
    end_date: normalizeText(record.end_date) || null,
    days_remaining: toNumber(record.days_remaining, 0),
    total_amount: normalizeText(record.total_amount, "0.00"),
    auto_renew: toBoolean(record.auto_renew, false),
    is_current: toBoolean(record.is_current, false),
    created_at: normalizeText(record.created_at) || null,
  };
}

function extractDetail(payload: unknown) {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  const plan = normalizePlan(data.plan ?? record.plan);
  const subscriptionsSource = data.recent_subscriptions ?? record.recent_subscriptions;
  const recentSubscriptions = Array.isArray(subscriptionsSource)
    ? subscriptionsSource.map(normalizeSubscription)
    : [];

  return { plan, recentSubscriptions };
}

function extractPlanFromPayload(payload: unknown) {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  const rawPlan = data.plan ?? record.plan;

  return rawPlan ? normalizePlan(rawPlan) : null;
}

function formFromPlan(plan: PlanRecord): PlanFormState {
  return {
    name: plan.name === "—" ? "" : plan.name,
    code: plan.code === "—" ? "" : plan.code,
    slug: plan.slug === "—" ? "" : plan.slug,
    description: plan.description,
    monthly_price: plan.monthly_price,
    yearly_price: plan.yearly_price,
    max_users: String(plan.max_users),
    max_branches: String(plan.max_branches),
    max_warehouses: String(plan.max_warehouses),
    max_pos: String(plan.max_pos),
    features: plan.features.join("\n"),
    is_active: plan.is_active,
    is_public: plan.is_public,
    sort_order: String(plan.sort_order),
  };
}

function numericInputClass(extra = "") {
  return cn("h-11 rounded-xl bg-background text-left font-mono tabular-nums", extra);
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

function DetailSkeleton() {
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

export default function SystemPlanDetailPage() {
  const params = useParams();
  const router = useRouter();

  const rawId = params?.id;
  const planId = Array.isArray(rawId) ? rawId[0] : String(rawId || "");

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [plan, setPlan] = React.useState<PlanRecord | null>(null);
  const [recentSubscriptions, setRecentSubscriptions] = React.useState<SubscriptionRecord[]>([]);
  const [editForm, setEditForm] = React.useState<PlanFormState | null>(null);
  const [featureInput, setFeatureInput] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [busyAction, setBusyAction] = React.useState("");
  const [editMode, setEditMode] = React.useState(false);
  const [error, setError] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

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

  const loadPlan = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!planId) return;

      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const payload = await fetchJson<unknown>(
          `/api/system/plans/${encodeURIComponent(planId)}/`,
        );
        const detail = extractDetail(payload);

        setPlan(detail.plan);
        setRecentSubscriptions(detail.recentSubscriptions);
        setEditForm(formFromPlan(detail.plan));
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [planId, t.errorDesc],
  );

  React.useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const selectedFeatures = React.useMemo(
    () => featuresToList(editForm?.features || ""),
    [editForm?.features],
  );

  const quickActions = React.useMemo<QuickAction[]>(
    () => [
      {
        title: t.plansList,
        description: t.plansListDesc,
        href: "/system/plans",
        icon: Gift,
      },
      {
        title: t.subscriptions,
        description: t.subscriptionsDesc,
        href: "/system/subscriptions",
        icon: CreditCard,
      },
      {
        title: t.payments,
        description: t.paymentsDesc,
        href: "/system/platform-payments",
        icon: FileText,
      },
      {
        title: t.dashboard,
        description: t.dashboardDesc,
        href: "/system",
        icon: LayoutDashboard,
      },
    ],
    [
      t.dashboard,
      t.dashboardDesc,
      t.payments,
      t.paymentsDesc,
      t.plansList,
      t.plansListDesc,
      t.subscriptions,
      t.subscriptionsDesc,
    ],
  );

  function updateField<K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) {
    setEditForm((current) => (current ? { ...current, [key]: value } : current));

    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  function syncFeatures(items: string[]) {
    const uniqueItems = Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
    updateField("features", uniqueItems.join("\n"));
  }

  function addFeature(value: string) {
    const cleaned = value.trim();

    if (!cleaned) return;

    syncFeatures([...selectedFeatures, cleaned]);
    setFeatureInput("");
  }

  function removeFeature(value: string) {
    syncFeatures(selectedFeatures.filter((item) => item !== value));
  }

  function validateForm() {
    if (!editForm) return false;

    const nextErrors: Record<string, string> = {};

    if (!editForm.name.trim()) nextErrors.name = t.requiredName;
    if (!editForm.code.trim()) nextErrors.code = t.requiredCode;

    const numericFields: Array<keyof PlanFormState> = [
      "monthly_price",
      "yearly_price",
      "max_users",
      "max_branches",
      "max_warehouses",
      "max_pos",
      "sort_order",
    ];

    numericFields.forEach((field) => {
      if (toSafeNumber(String(editForm[field])) === null) {
        nextErrors[field] = t.invalidNumber;
      }
    });

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function saveChanges(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!planId || !editForm || !validateForm()) return;

    try {
      setSaving(true);

      const payload = await postJson<unknown>(
        `/api/system/plans/${encodeURIComponent(planId)}/update/`,
        {
          name: editForm.name.trim(),
          code: editForm.code.trim().toUpperCase(),
          slug: editForm.slug.trim(),
          description: editForm.description.trim(),
          monthly_price: String(toSafeNumber(editForm.monthly_price) ?? 0),
          yearly_price: String(toSafeNumber(editForm.yearly_price) ?? 0),
          max_users: Math.trunc(toSafeNumber(editForm.max_users) ?? 1),
          max_branches: Math.trunc(toSafeNumber(editForm.max_branches) ?? 1),
          max_warehouses: Math.trunc(toSafeNumber(editForm.max_warehouses) ?? 0),
          max_pos: Math.trunc(toSafeNumber(editForm.max_pos) ?? 0),
          features: featuresToList(editForm.features),
          is_active: editForm.is_active,
          is_public: editForm.is_public,
          sort_order: Math.trunc(toSafeNumber(editForm.sort_order) ?? 0),
        },
      );

      const updatedPlan = extractPlanFromPayload(payload);
      const record = asRecord(payload);
      const message = normalizeText(record.message) || t.updated;

      if (updatedPlan) {
        setPlan(updatedPlan);
        setEditForm(formFromPlan(updatedPlan));
      }

      setEditMode(false);
      toast.success(message);
      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function runPlanAction(action: PlanAction) {
    if (!planId || !plan) return;

    if (action === "deactivate" && !window.confirm(t.confirmDeactivate)) return;
    if (action === "hide" && !window.confirm(t.confirmHide)) return;

    try {
      setBusyAction(action);

      const payload = await postJson<unknown>(
        `/api/system/plans/${encodeURIComponent(planId)}/status/`,
        { action },
      );

      const updatedPlan = extractPlanFromPayload(payload);
      const record = asRecord(payload);
      const message = normalizeText(record.message) || t.statusUpdated;

      if (updatedPlan) {
        setPlan(updatedPlan);
        setEditForm(formFromPlan(updatedPlan));
      } else {
        setPlan((current) => {
          if (!current) return current;

          if (action === "activate") return { ...current, is_active: true };
          if (action === "deactivate") return { ...current, is_active: false };
          if (action === "publish") return { ...current, is_public: true };
          if (action === "hide") return { ...current, is_public: false };

          return current;
        });
      }

      toast.success(message);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
      toast.error(message);
    } finally {
      setBusyAction("");
    }
  }

  if (loading) return <DetailSkeleton />;

  if (error || !plan) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8" dir={dir}>
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
            <Button className="rounded-xl" onClick={() => void loadPlan()}>
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const stats = plan.stats || emptyStats();

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
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{plan.name}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  {plan.description || t.subtitle}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {plan.code}
                  </Badge>
                  <StatusBadge active={plan.is_active} locale={locale} />
                  <VisibilityBadge isPublic={plan.is_public} locale={locale} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system/plans">
                    <ArrowLeft className="h-4 w-4" />
                    {t.back}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadPlan({ silent: true })}
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
                  variant={editMode ? "outline" : "default"}
                  className="rounded-xl"
                  onClick={() => setEditMode((current) => !current)}
                  disabled={saving}
                >
                  <Pencil className="h-4 w-4" />
                  {editMode ? t.cancelEdit : t.edit}
                </Button>

                {plan.is_active ? (
                  <Button
                    variant="outline"
                    className="rounded-xl bg-background"
                    disabled={Boolean(busyAction)}
                    onClick={() => void runPlanAction("deactivate")}
                  >
                    {busyAction === "deactivate" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                    {t.deactivate}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="rounded-xl bg-background"
                    disabled={Boolean(busyAction)}
                    onClick={() => void runPlanAction("activate")}
                  >
                    {busyAction === "activate" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BadgeCheck className="h-4 w-4" />
                    )}
                    {t.activate}
                  </Button>
                )}

                {plan.is_public ? (
                  <Button
                    variant="outline"
                    className="rounded-xl bg-background"
                    disabled={Boolean(busyAction)}
                    onClick={() => void runPlanAction("hide")}
                  >
                    {busyAction === "hide" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                    {t.hide}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="rounded-xl bg-background"
                    disabled={Boolean(busyAction)}
                    onClick={() => void runPlanAction("publish")}
                  >
                    {busyAction === "publish" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {t.publish}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title={t.totalSubscriptions}
            value={formatInteger(stats.subscriptions_total)}
            description={t.fromLiveApi}
            icon={Gift}
          />
          <MetricCard
            title={t.activeSubscriptions}
            value={formatInteger(stats.active_subscriptions)}
            description={t.fromLiveApi}
            icon={BadgeCheck}
          />
          <MetricCard
            title={t.trialSubscriptions}
            value={formatInteger(stats.trial_subscriptions)}
            description={t.fromLiveApi}
            icon={Activity}
          />
          <MetricCard
            title={t.expiredSubscriptions}
            value={formatInteger(stats.expired_subscriptions)}
            description={t.fromLiveApi}
            icon={CalendarDays}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.href} action={action} />
          ))}
        </div>

        {editMode && editForm ? (
          <form onSubmit={saveChanges} className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.edit}</CardTitle>
                <CardDescription>{t.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.name}</label>
                  <Input
                    value={editForm.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className="h-11 rounded-xl bg-background"
                    disabled={saving}
                  />
                  {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.code}</label>
                  <Input
                    value={editForm.code}
                    onChange={(event) => updateField("code", event.target.value.toUpperCase())}
                    className="h-11 rounded-xl bg-background font-mono uppercase"
                    disabled={saving}
                  />
                  {errors.code ? <p className="text-xs text-destructive">{errors.code}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.slug}</label>
                  <Input
                    value={editForm.slug}
                    onChange={(event) => updateField("slug", event.target.value)}
                    className="h-11 rounded-xl bg-background"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.sortOrder}</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={editForm.sort_order}
                    onChange={(event) =>
                      updateField("sort_order", cleanIntegerInput(event.target.value))
                    }
                    className={numericInputClass()}
                    disabled={saving}
                  />
                  {errors.sort_order ? (
                    <p className="text-xs text-destructive">{errors.sort_order}</p>
                  ) : null}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">{t.description}</label>
                  <textarea
                    value={editForm.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    className="min-h-[110px] w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={saving}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.pricing}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.monthlyPrice}</label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={editForm.monthly_price}
                      onChange={(event) =>
                        updateField("monthly_price", cleanDecimalInput(event.target.value))
                      }
                      className={numericInputClass(locale === "ar" ? "pl-10" : "pr-10")}
                      disabled={saving}
                    />
                    <span
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2",
                        locale === "ar" ? "left-3" : "right-3",
                      )}
                    >
                      <MoneyIcon />
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.yearlyPrice}</label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={editForm.yearly_price}
                      onChange={(event) =>
                        updateField("yearly_price", cleanDecimalInput(event.target.value))
                      }
                      className={numericInputClass(locale === "ar" ? "pl-10" : "pr-10")}
                      disabled={saving}
                    />
                    <span
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2",
                        locale === "ar" ? "left-3" : "right-3",
                      )}
                    >
                      <MoneyIcon />
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.limits}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["max_users", t.maxUsers],
                  ["max_branches", t.maxBranches],
                  ["max_warehouses", t.maxWarehouses],
                  ["max_pos", t.maxPos],
                ].map(([field, label]) => (
                  <div key={field} className="space-y-2">
                    <label className="text-sm font-medium">{label}</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={String(editForm[field as keyof PlanFormState])}
                      onChange={(event) =>
                        updateField(
                          field as keyof PlanFormState,
                          cleanIntegerInput(event.target.value) as never,
                        )
                      }
                      className={numericInputClass()}
                      disabled={saving}
                    />
                    {errors[field] ? (
                      <p className="text-xs text-destructive">{errors[field]}</p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.features}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={featureInput}
                    onChange={(event) => setFeatureInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addFeature(featureInput);
                      }
                    }}
                    placeholder={t.featureInputPlaceholder}
                    className="h-11 rounded-xl bg-background"
                    disabled={saving}
                  />
                  <Button
                    type="button"
                    className="h-11 rounded-xl"
                    onClick={() => addFeature(featureInput)}
                    disabled={saving || !featureInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                    {t.addFeature}
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t.suggestedFeatures}</p>
                  <div className="flex flex-wrap gap-2">
                    {FEATURE_SUGGESTIONS[locale].map((feature) => {
                      const selected = selectedFeatures.includes(feature);

                      return (
                        <Button
                          key={feature}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          className="h-8 rounded-full bg-background px-3 text-xs data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground"
                          data-selected={selected}
                          onClick={() =>
                            selected ? removeFeature(feature) : addFeature(feature)
                          }
                          disabled={saving}
                        >
                          {feature}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t.selectedFeatures}</p>
                  {selectedFeatures.length ? (
                    <div className="flex flex-wrap gap-2 rounded-2xl border bg-background p-3">
                      {selectedFeatures.map((feature) => (
                        <Badge
                          key={feature}
                          variant="secondary"
                          className="gap-2 rounded-full px-3 py-1.5"
                        >
                          {feature}
                          <button
                            type="button"
                            className="rounded-full text-muted-foreground transition hover:text-foreground"
                            onClick={() => removeFeature(feature)}
                            disabled={saving}
                            aria-label={feature}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                      {t.noFeatures}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.statusVisibility}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Button
                  type="button"
                  variant={editForm.is_active ? "default" : "outline"}
                  className="h-auto justify-start rounded-2xl p-4"
                  onClick={() => updateField("is_active", !editForm.is_active)}
                  disabled={saving}
                >
                  <BadgeCheck className="h-4 w-4" />
                  {editForm.is_active ? t.active : t.inactive}
                </Button>

                <Button
                  type="button"
                  variant={editForm.is_public ? "default" : "outline"}
                  className="h-auto justify-start rounded-2xl p-4"
                  onClick={() => updateField("is_public", !editForm.is_public)}
                  disabled={saving}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {editForm.is_public ? t.public : t.internal}
                </Button>
              </CardContent>
            </Card>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl bg-background"
                onClick={() => {
                  setEditForm(formFromPlan(plan));
                  setEditMode(false);
                }}
                disabled={saving}
              >
                <RotateCcw className="h-4 w-4" />
                {t.cancelEdit}
              </Button>

              <Button type="submit" className="rounded-xl" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? t.saving : t.save}
              </Button>
            </div>
          </form>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.planInfo}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t.name}</p>
                  <p className="mt-2 font-semibold">{plan.name}</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t.code}</p>
                  <p className="mt-2 font-mono font-semibold">{plan.code}</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t.slug}</p>
                  <p className="mt-2 font-semibold">{plan.slug}</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t.sortOrder}</p>
                  <p dir="ltr" className="mt-2 font-semibold tabular-nums">
                    {formatInteger(plan.sort_order)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.recentSubscriptions}</CardTitle>
                <CardDescription>{t.recentSubscriptionsDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-2xl border bg-background">
                  <div className="overflow-x-auto">
                    <Table className="w-full min-w-[980px] table-fixed">
                      <TableHeader>
                        <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                          <TableHead className={cn("w-[260px] px-4 text-xs", alignClass)}>
                            {t.company}
                          </TableHead>
                          <TableHead className={cn("w-[150px] px-4 text-xs", alignClass)}>
                            {t.subscriptionStatus}
                          </TableHead>
                          <TableHead className={cn("w-[150px] px-4 text-xs", alignClass)}>
                            {t.billingCycle}
                          </TableHead>
                          <TableHead className={cn("w-[220px] px-4 text-xs", alignClass)}>
                            {t.period}
                          </TableHead>
                          <TableHead className={cn("w-[150px] px-4 text-xs", alignClass)}>
                            {t.amount}
                          </TableHead>
                          <TableHead className="sticky left-0 z-10 h-11 w-[76px] bg-muted/40 px-3 text-center text-xs">
                            {t.actions}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentSubscriptions.length ? (
                          recentSubscriptions.map((subscription) => (
                            <TableRow key={subscription.id} className="h-[64px] hover:bg-muted/30">
                              <TableCell className={cn("px-4", alignClass)}>
                                <div className="space-y-1">
                                  <p className="font-semibold">{subscription.company_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {subscription.company_code || subscription.company_id}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className={cn("px-4", alignClass)}>
                                <Badge variant="outline" className="rounded-full">
                                  {subscription.status}
                                </Badge>
                              </TableCell>
                              <TableCell className={cn("px-4", alignClass)}>
                                <span className="text-sm">{subscription.billing_cycle}</span>
                              </TableCell>
                              <TableCell className={cn("px-4", alignClass)}>
                                <div dir="ltr" className="text-sm tabular-nums text-muted-foreground">
                                  {formatDate(subscription.start_date)} → {formatDate(subscription.end_date)}
                                </div>
                              </TableCell>
                              <TableCell className={cn("px-4", alignClass)}>
                                <MoneyValue value={subscription.total_amount} />
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
                                      <Link href={`/system/subscriptions/${subscription.id}`}>
                                        <ListChecks className="h-3.5 w-3.5" />
                                        {t.details}
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-xs">
                                      <Link href="/system/subscriptions">
                                        <CreditCard className="h-3.5 w-3.5" />
                                        {t.subscriptions}
                                      </Link>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6}>
                              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
                                <Building2 className="mb-3 h-6 w-6 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">{t.noSubscriptions}</p>
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

          <aside className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.pricing}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t.monthly}</p>
                  <div className="mt-2 text-lg">
                    <MoneyValue value={plan.monthly_price} />
                  </div>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t.yearly}</p>
                  <div className="mt-2 text-lg">
                    <MoneyValue value={plan.yearly_price} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.limits}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-background p-3">
                  <UsersRound className="mb-2 h-4 w-4 text-muted-foreground" />
                  <p dir="ltr" className="font-semibold tabular-nums">
                    {formatInteger(plan.max_users)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.users}</p>
                </div>
                <div className="rounded-2xl border bg-background p-3">
                  <Activity className="mb-2 h-4 w-4 text-muted-foreground" />
                  <p dir="ltr" className="font-semibold tabular-nums">
                    {formatInteger(plan.max_branches)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.branches}</p>
                </div>
                <div className="rounded-2xl border bg-background p-3">
                  <Warehouse className="mb-2 h-4 w-4 text-muted-foreground" />
                  <p dir="ltr" className="font-semibold tabular-nums">
                    {formatInteger(plan.max_warehouses)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.warehouses}</p>
                </div>
                <div className="rounded-2xl border bg-background p-3">
                  <Zap className="mb-2 h-4 w-4 text-muted-foreground" />
                  <p dir="ltr" className="font-semibold tabular-nums">
                    {formatInteger(plan.max_pos)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.pos}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.features}</CardTitle>
              </CardHeader>
              <CardContent>
                {plan.features.length ? (
                  <div className="flex flex-wrap gap-2">
                    {plan.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="rounded-full px-3 py-1.5">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t.noFeatures}</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
