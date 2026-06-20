"use client";

/* ============================================================
   📂 app/customer/cards/page.tsx
   💳 Primey Care | Customer Cards Page
   ------------------------------------------------------------
   ✅ صفحة محتوى فقط داخل الشِل الموحد
   ✅ لا تنشئ سايدر أو هيدر مستقل
   ✅ تعرض بطاقات/اشتراكات العميل الحالي فقط
   ✅ تعتمد على /api/customers/me/ ثم /api/orders/?customer_id=
   ✅ لا تفترض وجود API مستقل للبطاقات حاليًا
   ✅ تستخرج البطاقات من الطلبات card / subscription / membership
   ✅ w-full space-y-4
   ✅ عربي/إنجليزي عبر primey-locale
   ✅ أرقام إنجليزية دائمًا
   ✅ رمز SAR من /currency/sar.svg
   ✅ Skeleton Loading
   ✅ Error State مستقل
   ✅ Empty State ذكي
   ✅ Search في صف مستقل
   ✅ Filters في صف مستقل
   ✅ Excel .xls HTML Workbook
   ✅ Web PDF Print
   ✅ sonner
   ✅ بدون localhost
============================================================ */

import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  FileText,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  TimerReset,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AppLocale = "ar" | "en";
type Dict = Record<string, unknown>;

type CardStatus =
  | "active"
  | "upcoming"
  | "expired"
  | "pending"
  | "cancelled"
  | "UNKNOWN";

type PaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "failed"
  | "refunded"
  | "UNKNOWN";

type CardKind =
  | "card"
  | "subscription"
  | "membership"
  | "program"
  | "UNKNOWN";

type CustomerCardRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  cardNumber: string;
  title: string;
  productName: string;
  providerName: string;
  kind: CardKind;
  status: CardStatus;
  paymentStatus: PaymentStatus;
  startsAt: string;
  endsAt: string;
  issuedAt: string;
  createdAt: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
};

type CardsSummary = {
  totalCards: number;
  activeCards: number;
  upcomingCards: number;
  expiredCards: number;
  pendingCards: number;
  cancelledCards: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
};

type ApiEnvelope = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  data?: unknown;
  customer?: unknown;
  summary?: unknown;
  results?: unknown;
  items?: unknown;
  orders?: unknown;
  latest_orders?: unknown;
};

const SAR_ICON_PATH = "/currency/sar.svg";

const DEFAULT_SUMMARY: CardsSummary = {
  totalCards: 0,
  activeCards: 0,
  upcomingCards: 0,
  expiredCards: 0,
  pendingCards: 0,
  cancelledCards: 0,
  totalAmount: 0,
  paidAmount: 0,
  remainingAmount: 0,
};

function readLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const savedLocale = window.localStorage.getItem("primey-locale");

    if (savedLocale === "en") return "en";
    if (savedLocale === "ar") return "ar";

    return document.documentElement.lang === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function apiUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  if (!base) return path;

  return `${base.replace(/\/$/, "")}${path}`;
}

async function readJson(response: Response): Promise<ApiEnvelope | null> {
  return (await response.json().catch(() => null)) as ApiEnvelope | null;
}

async function fetchJson(path: string): Promise<ApiEnvelope | null> {
  const response = await fetch(apiUrl(path), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const payload = await readJson(response);

  if (!response.ok || payload?.ok === false || payload?.success === false) {
    throw new Error(
      payload?.message ||
        payload?.detail ||
        payload?.error ||
        "Unable to load data.",
    );
  }

  return payload;
}

function asDict(value: unknown): Dict {
  return value && typeof value === "object" ? (value as Dict) : {};
}

function getValue(obj: Dict, key: string): unknown {
  const direct = obj[key];

  if (direct !== undefined && direct !== null && direct !== "") return direct;

  for (const container of [
    "order",
    "card",
    "membership",
    "subscription",
    "product",
    "provider",
    "center",
    "customer",
    "invoice",
    "payment",
    "amounts",
    "data",
  ]) {
    const nested = obj[container];

    if (nested && typeof nested === "object") {
      const value = (nested as Dict)[key];

      if (value !== undefined && value !== null && value !== "") return value;
    }
  }

  return undefined;
}

function unwrapArray(payload: ApiEnvelope | null, keys: string[]) {
  if (!payload) return [];

  const data = asDict(payload.data);

  for (const key of keys) {
    const fromRoot = (payload as Dict)[key];
    const fromData = data[key];

    if (Array.isArray(fromRoot)) return fromRoot;
    if (Array.isArray(fromData)) return fromData;
  }

  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;

  return [];
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .replace(/[^\d.-]/g, "")
      .trim(),
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: unknown) {
  const raw = String(value || "").trim();

  if (!raw) return "-";

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function normalizeText(value: unknown) {
  return String(value || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value || "").toLowerCase();

  if (status === "unpaid") return "unpaid";
  if (status === "partial" || status === "partially_paid") return "partially_paid";
  if (status === "paid" || status === "confirmed") return "paid";
  if (status === "failed") return "failed";
  if (status === "refunded") return "refunded";

  return "UNKNOWN";
}

function normalizeCardKind(value: unknown): CardKind {
  const kind = String(value || "").toLowerCase();

  if (kind === "card" || kind === "cards") return "card";
  if (kind === "subscription" || kind === "subscriptions") return "subscription";
  if (kind === "membership" || kind === "memberships") return "membership";
  if (kind === "program") return "program";

  return "UNKNOWN";
}

function isCardLike(row: Dict) {
  const product = asDict(row.product);
  const kind = String(
    getValue(row, "order_kind") ||
      getValue(row, "kind") ||
      getValue(row, "product_type") ||
      product.product_type ||
      product.type ||
      "",
  ).toLowerCase();

  const title = String(
    getValue(row, "product_name") ||
      product.name ||
      product.title ||
      getValue(row, "title") ||
      "",
  ).toLowerCase();

  return (
    ["card", "cards", "subscription", "subscriptions", "membership", "memberships"].includes(
      kind,
    ) ||
    title.includes("card") ||
    title.includes("بطاقة") ||
    title.includes("اشتراك")
  );
}

function normalizeStatusFromDates({
  rawStatus,
  paymentStatus,
  startsAt,
  endsAt,
}: {
  rawStatus: unknown;
  paymentStatus: PaymentStatus;
  startsAt: string;
  endsAt: string;
}): CardStatus {
  const normalized = String(rawStatus || "").toLowerCase();

  if (["cancelled", "canceled", "refunded"].includes(normalized)) return "cancelled";

  if (paymentStatus === "unpaid" || paymentStatus === "failed") return "pending";

  if (["pending", "draft"].includes(normalized)) return "pending";

  const now = new Date();
  const startDate = startsAt ? new Date(startsAt) : null;
  const endDate = endsAt ? new Date(endsAt) : null;

  if (endDate && !Number.isNaN(endDate.getTime()) && endDate < now) {
    return "expired";
  }

  if (startDate && !Number.isNaN(startDate.getTime()) && startDate > now) {
    return "upcoming";
  }

  if (
    ["active", "confirmed", "processing", "completed", "issued", "delivered"].includes(
      normalized,
    ) ||
    paymentStatus === "paid"
  ) {
    return "active";
  }

  return "UNKNOWN";
}

function isValidId(value: unknown) {
  const id = String(value || "").trim();

  return Boolean(
    id &&
      id !== "-" &&
      id !== "0" &&
      id !== "undefined" &&
      id !== "null",
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

function dictionary(locale: AppLocale) {
  const isArabic = locale === "ar";

  return {
    title: isArabic ? "بطاقاتي" : "My Cards",
    subtitle: isArabic
      ? "تابع بطاقاتك واشتراكاتك وفترة الصلاحية وحالة الدفع."
      : "Track your cards, memberships, validity, and payment status.",

    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة PDF" : "Print PDF",
    search: isArabic ? "بحث" : "Search",
    searchPlaceholder: isArabic
      ? "ابحث باسم البطاقة، رقم الطلب، مقدم الخدمة..."
      : "Search by card name, order number, provider...",
    all: isArabic ? "الكل" : "All",

    totalCards: isArabic ? "إجمالي البطاقات" : "Total Cards",
    activeCards: isArabic ? "بطاقات نشطة" : "Active Cards",
    upcomingCards: isArabic ? "قادمة" : "Upcoming",
    expiredCards: isArabic ? "منتهية" : "Expired",
    pendingCards: isArabic ? "معلقة" : "Pending",
    cancelledCards: isArabic ? "ملغاة" : "Cancelled",
    totalAmount: isArabic ? "إجمالي القيمة" : "Total Amount",
    paidAmount: isArabic ? "المدفوع" : "Paid",
    remainingAmount: isArabic ? "المتبقي" : "Remaining",

    cardsGrid: isArabic ? "بطاقات العميل" : "Customer Cards",
    cardsGridDesc: isArabic
      ? "عرض مبسط للبطاقات والاشتراكات النشطة والمنتهية."
      : "Simple view for active and expired cards or memberships.",
    tableTitle: isArabic ? "قائمة البطاقات" : "Cards List",
    tableDesc: isArabic
      ? "البطاقات المستخرجة من طلبات العميل."
      : "Cards extracted from customer orders.",

    card: isArabic ? "البطاقة" : "Card",
    order: isArabic ? "الطلب" : "Order",
    provider: isArabic ? "مقدم الخدمة" : "Provider",
    kind: isArabic ? "النوع" : "Kind",
    status: isArabic ? "الحالة" : "Status",
    payment: isArabic ? "الدفع" : "Payment",
    validity: isArabic ? "الصلاحية" : "Validity",
    startsAt: isArabic ? "تبدأ" : "Starts",
    endsAt: isArabic ? "تنتهي" : "Ends",
    amount: isArabic ? "المبلغ" : "Amount",
    action: isArabic ? "الإجراء" : "Action",
    viewOrder: isArabic ? "عرض الطلب" : "View Order",

    loadError: isArabic ? "تعذر تحميل البطاقات." : "Unable to load cards.",
    loadSuccess: isArabic ? "تم تحديث البطاقات." : "Cards refreshed.",
    exportSuccess: isArabic ? "تم تجهيز ملف Excel." : "Excel file prepared.",
    exportEmpty: isArabic
      ? "لا توجد بيانات قابلة للتصدير."
      : "No data available to export.",
    printSuccess: isArabic ? "تم تجهيز نافذة الطباعة." : "Print window prepared.",
    printError: isArabic ? "تعذر فتح نافذة الطباعة." : "Unable to open print window.",

    emptyTitle: isArabic ? "لا توجد بطاقات حتى الآن" : "No cards yet",
    emptyText: isArabic
      ? "ستظهر بطاقاتك هنا بعد شراء بطاقة أو اشتراك."
      : "Your cards will appear here after purchasing a card or membership.",
    noResultsTitle: isArabic ? "لا توجد نتائج مطابقة" : "No matching results",
    noResultsText: isArabic
      ? "جرّب تغيير البحث أو الفلاتر."
      : "Try changing search or filters.",

    noData: isArabic ? "غير متوفر" : "Not available",
    generatedAt: isArabic ? "تاريخ التصدير" : "Generated At",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",

    statusOptions: {
      all: isArabic ? "كل الحالات" : "All Statuses",
      active: isArabic ? "نشطة" : "Active",
      upcoming: isArabic ? "قادمة" : "Upcoming",
      expired: isArabic ? "منتهية" : "Expired",
      pending: isArabic ? "معلقة" : "Pending",
      cancelled: isArabic ? "ملغاة" : "Cancelled",
    },

    kindOptions: {
      all: isArabic ? "كل الأنواع" : "All Types",
      card: isArabic ? "بطاقة" : "Card",
      subscription: isArabic ? "اشتراك" : "Subscription",
      membership: isArabic ? "عضوية" : "Membership",
      program: isArabic ? "برنامج" : "Program",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<CardKind | "all", string>,

    cardStatus: {
      active: isArabic ? "نشطة" : "Active",
      upcoming: isArabic ? "قادمة" : "Upcoming",
      expired: isArabic ? "منتهية" : "Expired",
      pending: isArabic ? "معلقة" : "Pending",
      cancelled: isArabic ? "ملغاة" : "Cancelled",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<CardStatus, string>,

    paymentStatus: {
      unpaid: isArabic ? "غير مدفوع" : "Unpaid",
      partially_paid: isArabic ? "مدفوع جزئيًا" : "Partially Paid",
      paid: isArabic ? "مدفوع" : "Paid",
      failed: isArabic ? "فشل الدفع" : "Failed",
      refunded: isArabic ? "مسترد" : "Refunded",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<PaymentStatus, string>,
  };
}

function normalizeCard(row: unknown, index: number): CustomerCardRow {
  const obj = asDict(row);
  const product = asDict(obj.product);
  const provider = asDict(obj.provider || obj.center);

  const id = String(
    getValue(obj, "card_id") ||
      getValue(obj, "membership_id") ||
      getValue(obj, "id") ||
      index + 1,
  );

  const orderId = String(getValue(obj, "order_id") || getValue(obj, "id") || id);

  const productName = String(
    getValue(obj, "product_name") ||
      product.name ||
      product.title ||
      getValue(obj, "service_name") ||
      getValue(obj, "program_name") ||
      "",
  );

  const rawKind =
    getValue(obj, "card_type") ||
    getValue(obj, "membership_type") ||
    getValue(obj, "order_kind") ||
    getValue(obj, "kind") ||
    getValue(obj, "product_type") ||
    product.product_type ||
    product.type;

  const kind = normalizeCardKind(rawKind);
  const paymentStatus = normalizePaymentStatus(getValue(obj, "payment_status"));

  const startsAt = String(
    getValue(obj, "starts_at") ||
      getValue(obj, "start_date") ||
      getValue(obj, "valid_from") ||
      getValue(obj, "scheduled_at") ||
      "",
  );

  const endsAt = String(
    getValue(obj, "ends_at") ||
      getValue(obj, "end_date") ||
      getValue(obj, "valid_until") ||
      getValue(obj, "expires_at") ||
      "",
  );

  const totalAmount = toNumber(
    getValue(obj, "total_amount") ||
      getValue(obj, "grand_total") ||
      getValue(obj, "amount"),
  );

  const paidAmount = toNumber(getValue(obj, "paid_amount"));

  return {
    id,
    orderId,
    orderNumber: String(
      getValue(obj, "order_number") ||
        getValue(obj, "number") ||
        getValue(obj, "reference") ||
        `ORD-${orderId}`,
    ),
    cardNumber: String(
      getValue(obj, "card_number") ||
        getValue(obj, "membership_number") ||
        getValue(obj, "subscription_number") ||
        "",
    ),
    title: productName || "-",
    productName: productName || "-",
    providerName: String(
      getValue(obj, "provider_name") ||
        provider.name ||
        provider.display_name ||
        provider.provider_name ||
        "",
    ),
    kind,
    status: normalizeStatusFromDates({
      rawStatus: getValue(obj, "status"),
      paymentStatus,
      startsAt,
      endsAt,
    }),
    paymentStatus,
    startsAt,
    endsAt,
    issuedAt: String(
      getValue(obj, "issued_at") ||
        getValue(obj, "activated_at") ||
        getValue(obj, "created_at") ||
        "",
    ),
    createdAt: String(getValue(obj, "created_at") || ""),
    totalAmount,
    paidAmount,
    remainingAmount: toNumber(
      getValue(obj, "remaining_amount") ||
        getValue(obj, "due_amount") ||
        Math.max(totalAmount - paidAmount, 0),
    ),
    currency: String(getValue(obj, "currency") || "SAR"),
  };
}

function buildSummary(rows: CustomerCardRow[]): CardsSummary {
  return rows.reduce<CardsSummary>(
    (summary, row) => {
      summary.totalCards += 1;
      summary.totalAmount += row.totalAmount;
      summary.paidAmount += row.paidAmount;
      summary.remainingAmount += row.remainingAmount;

      if (row.status === "active") summary.activeCards += 1;
      if (row.status === "upcoming") summary.upcomingCards += 1;
      if (row.status === "expired") summary.expiredCards += 1;
      if (row.status === "pending") summary.pendingCards += 1;
      if (row.status === "cancelled") summary.cancelledCards += 1;

      return summary;
    },
    { ...DEFAULT_SUMMARY },
  );
}

function SarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <Image
      src={SAR_ICON_PATH}
      alt=""
      width={16}
      height={16}
      className={className}
    />
  );
}

function MoneyText({ value }: { value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" dir="ltr">
      <span>{formatMoney(value)}</span>
      <SarIcon className="h-3.5 w-3.5" />
    </span>
  );
}

function StatusBadge({
  children,
  tone = "default",
}: {
  children: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const classes = {
    default: "border-border bg-muted text-muted-foreground hover:bg-muted",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300",
    warning:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300",
    danger:
      "border-red-200 bg-red-50 text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300",
    info:
      "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300",
  };

  return (
    <Badge className={`rounded-full px-3 py-1 ${classes[tone]}`}>
      {children}
    </Badge>
  );
}

function cardTone(status: CardStatus) {
  if (status === "active") return "success";
  if (status === "upcoming") return "info";
  if (status === "pending") return "warning";
  if (status === "expired" || status === "cancelled") return "danger";
  return "default";
}

function paymentTone(status: PaymentStatus) {
  if (status === "paid") return "success";
  if (status === "partially_paid") return "info";
  if (status === "unpaid") return "warning";
  if (status === "failed" || status === "refunded") return "danger";
  return "default";
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-muted ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-2xl border bg-card shadow-sm">
            <CardContent className="p-5">
              <SkeletonLine className="h-7 w-24" />
              <SkeletonLine className="mt-3 h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="rounded-2xl border bg-card shadow-sm">
            <CardContent className="space-y-4 p-5">
              <SkeletonLine className="h-12 w-12 rounded-2xl" />
              <SkeletonLine className="h-6 w-44" />
              <SkeletonLine className="h-4 w-32" />
              <SkeletonLine className="h-10 w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <p className="mt-1 text-sm text-muted-foreground">{title}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border bg-background px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        {icon}
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function CardTile({
  item,
  locale,
}: {
  item: CustomerCardRow;
  locale: AppLocale;
}) {
  const t = dictionary(locale);

  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>

          <StatusBadge tone={cardTone(item.status)}>
            {t.cardStatus[item.status]}
          </StatusBadge>
        </div>

        <div>
          <h3 className="line-clamp-2 text-base font-bold">{item.productName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.cardNumber || item.orderNumber}
          </p>
        </div>

        <div className="grid gap-2 rounded-2xl border bg-background p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t.kind}</span>
            <span className="font-medium">{t.kindOptions[item.kind]}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t.startsAt}</span>
            <span className="font-medium">{formatDate(item.startsAt)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t.endsAt}</span>
            <span className="font-medium">{formatDate(item.endsAt)}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t.amount}</span>
            <MoneyText value={item.totalAmount} />
          </div>
        </div>

        {isValidId(item.orderId) ? (
          <Link href={`/customer/orders/${item.orderId}`}>
            <Button variant="outline" className="w-full rounded-xl">
              <Eye className="h-4 w-4" />
              {t.viewOrder}
            </Button>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildExportHtml({
  rows,
  locale,
}: {
  rows: CustomerCardRow[];
  locale: AppLocale;
}) {
  const t = dictionary(locale);
  const generatedAt = new Date().toLocaleString("en-US");

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.productName)}</td>
          <td>${escapeHtml(row.cardNumber || "-")}</td>
          <td>${escapeHtml(row.orderNumber)}</td>
          <td>${escapeHtml(row.providerName || "-")}</td>
          <td>${escapeHtml(t.kindOptions[row.kind])}</td>
          <td>${escapeHtml(t.cardStatus[row.status])}</td>
          <td>${escapeHtml(t.paymentStatus[row.paymentStatus])}</td>
          <td>${escapeHtml(formatDate(row.startsAt))}</td>
          <td>${escapeHtml(formatDate(row.endsAt))}</td>
          <td>${escapeHtml(formatMoney(row.totalAmount))}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; direction: ${locale === "ar" ? "rtl" : "ltr"}; }
          h1 { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(t.title)}</h1>
        <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(generatedAt)}</p>
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(t.card)}</th>
              <th>${escapeHtml("Card No.")}</th>
              <th>${escapeHtml(t.order)}</th>
              <th>${escapeHtml(t.provider)}</th>
              <th>${escapeHtml(t.kind)}</th>
              <th>${escapeHtml(t.status)}</th>
              <th>${escapeHtml(t.payment)}</th>
              <th>${escapeHtml(t.startsAt)}</th>
              <th>${escapeHtml(t.endsAt)}</th>
              <th>${escapeHtml(t.amount)}</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;
}

export default function CustomerCardsPage() {
  const [locale, setLocale] = useState<AppLocale>("ar");
  const [rows, setRows] = useState<CustomerCardRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CardStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<CardKind | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";

  const filteredRows = useMemo(() => {
    const clean = query.trim().toLowerCase();

    return rows
      .filter((row) => {
        const matchesQuery =
          !clean ||
          [
            row.orderNumber,
            row.cardNumber,
            row.productName,
            row.providerName,
            t.kindOptions[row.kind],
            t.cardStatus[row.status],
            t.paymentStatus[row.paymentStatus],
          ]
            .join(" ")
            .toLowerCase()
            .includes(clean);

        const matchesStatus =
          statusFilter === "all" || row.status === statusFilter;

        const matchesKind = kindFilter === "all" || row.kind === kindFilter;

        return matchesQuery && matchesStatus && matchesKind;
      })
      .sort((a, b) =>
        String(b.endsAt || b.startsAt || b.createdAt).localeCompare(
          String(a.endsAt || a.startsAt || a.createdAt),
        ),
      );
  }, [kindFilter, query, rows, statusFilter, t]);

  const displaySummary = useMemo(
    () => buildSummary(filteredRows),
    [filteredRows],
  );

  const hasSearchOrFilters =
    query.trim().length > 0 || statusFilter !== "all" || kindFilter !== "all";

  const loadCards = useCallback(
    async (showToast = false) => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const mePayload = await fetchJson("/api/customers/me/");
        const meData = asDict(mePayload?.data);
        const customer = asDict(meData.customer || mePayload?.customer || {});
        const customerId = String(
          getValue(customer, "id") || getValue(meData, "customer_id") || "",
        );

        let sourceRows = unwrapArray(mePayload, ["latest_orders", "orders"]);

        if (isValidId(customerId)) {
          try {
            const ordersPayload = await fetchJson(
              `/api/orders/?customer_id=${encodeURIComponent(
                customerId,
              )}&page=1&page_size=200`,
            );

            const apiRows = unwrapArray(ordersPayload, [
              "orders",
              "results",
              "items",
            ]);

            if (apiRows.length > 0) {
              sourceRows = apiRows;
            }
          } catch {
            // fallback إلى latest_orders من /api/customers/me/
          }
        }

        const normalizedRows = sourceRows
          .filter((item) => isCardLike(asDict(item)))
          .map(normalizeCard)
          .filter((row) => isValidId(row.id) || row.orderNumber !== "-");

        setRows(normalizedRows);

        if (showToast) {
          toast.success(t.loadSuccess);
        }
      } catch (error) {
        console.error("Customer cards load error:", error);
        setRows([]);
        setErrorMessage(error instanceof Error ? error.message : t.loadError);
        toast.error(t.loadError);
      } finally {
        setIsLoading(false);
      }
    },
    [t.loadError, t.loadSuccess],
  );

  function exportExcel() {
    const exportRows = filteredRows;

    if (exportRows.length === 0) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = buildExportHtml({ rows: exportRows, locale });
    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `primey-care-customer-cards-${Date.now()}.xls`;
    anchor.click();

    URL.revokeObjectURL(url);
    toast.success(t.exportSuccess);
  }

  function printPage() {
    const printRows = filteredRows;

    if (printRows.length === 0) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = buildExportHtml({ rows: printRows, locale });
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.printError);
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();

    toast.success(t.printSuccess);
  }

  useEffect(() => {
    const syncLocale = () => setLocale(readLocale());

    syncLocale();

    window.addEventListener("primey-locale-changed", syncLocale);
    window.addEventListener("storage", syncLocale);

    return () => {
      window.removeEventListener("primey-locale-changed", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  useEffect(() => {
    void loadCards(false);
  }, [loadCards]);

  return (
    <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Badge variant="outline" className="mb-2 rounded-full px-3 py-1">
            <CreditCard className="h-3.5 w-3.5" />
            {t.title}
          </Badge>

          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {t.title}
          </h1>

          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => void loadCards(true)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={exportExcel}
            disabled={isLoading || filteredRows.length === 0}
          >
            <Download className="h-4 w-4" />
            {t.exportExcel}
          </Button>

          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={printPage}
            disabled={isLoading || filteredRows.length === 0}
          >
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <Card className="rounded-2xl border border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-destructive">
                  {errorMessage || t.loadError}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.loadError}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void loadCards(true)}
            >
              <RefreshCcw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={t.totalCards}
              value={formatNumber(displaySummary.totalCards)}
              icon={<CreditCard className="h-5 w-5" />}
            />
            <KpiCard
              title={t.activeCards}
              value={formatNumber(displaySummary.activeCards)}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <KpiCard
              title={t.upcomingCards}
              value={formatNumber(displaySummary.upcomingCards)}
              icon={<TimerReset className="h-5 w-5" />}
            />
            <KpiCard
              title={t.expiredCards}
              value={formatNumber(displaySummary.expiredCards)}
              icon={<XCircle className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title={t.totalAmount}
              value={<MoneyText value={displaySummary.totalAmount} />}
              icon={<WalletCards className="h-5 w-5" />}
            />
            <KpiCard
              title={t.paidAmount}
              value={<MoneyText value={displaySummary.paidAmount} />}
              icon={<ShieldCheck className="h-5 w-5" />}
            />
            <KpiCard
              title={t.remainingAmount}
              value={<MoneyText value={displaySummary.remainingAmount} />}
              icon={<FileText className="h-5 w-5" />}
            />
          </div>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t.search}</CardTitle>
              <CardDescription>{t.tableDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="h-11 rounded-2xl bg-background ltr:pl-9 rtl:pr-9"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as CardStatus | "all")
                  }
                  className="h-11 rounded-2xl border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="all">{t.statusOptions.all}</option>
                  <option value="active">{t.statusOptions.active}</option>
                  <option value="upcoming">{t.statusOptions.upcoming}</option>
                  <option value="expired">{t.statusOptions.expired}</option>
                  <option value="pending">{t.statusOptions.pending}</option>
                  <option value="cancelled">{t.statusOptions.cancelled}</option>
                </select>

                <select
                  value={kindFilter}
                  onChange={(event) =>
                    setKindFilter(event.target.value as CardKind | "all")
                  }
                  className="h-11 rounded-2xl border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="all">{t.kindOptions.all}</option>
                  <option value="card">{t.kindOptions.card}</option>
                  <option value="subscription">{t.kindOptions.subscription}</option>
                  <option value="membership">{t.kindOptions.membership}</option>
                  <option value="program">{t.kindOptions.program}</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t.cardsGrid}</CardTitle>
              <CardDescription>{t.cardsGridDesc}</CardDescription>
            </CardHeader>

            <CardContent>
              {filteredRows.length === 0 ? (
                <EmptyState
                  icon={<CreditCard className="h-7 w-7 text-muted-foreground" />}
                  title={hasSearchOrFilters ? t.noResultsTitle : t.emptyTitle}
                  text={hasSearchOrFilters ? t.noResultsText : t.emptyText}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredRows.map((item) => (
                    <CardTile
                      key={`${item.id}-${item.orderNumber}`}
                      item={item}
                      locale={locale}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {filteredRows.length > 0 ? (
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{t.tableTitle}</CardTitle>
                <CardDescription>{t.tableDesc}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.card}</TableHead>
                        <TableHead>{t.order}</TableHead>
                        <TableHead>{t.provider}</TableHead>
                        <TableHead>{t.kind}</TableHead>
                        <TableHead>{t.status}</TableHead>
                        <TableHead>{t.payment}</TableHead>
                        <TableHead>{t.validity}</TableHead>
                        <TableHead>{t.amount}</TableHead>
                        <TableHead className="text-center">{t.action}</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={`${row.id}-${row.orderNumber}`}>
                          <TableCell>
                            <div className="min-w-[180px]">
                              <p className="font-semibold">{row.productName}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {row.cardNumber || row.currency || "-"}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>{row.orderNumber}</TableCell>
                          <TableCell>{row.providerName || "-"}</TableCell>

                          <TableCell>
                            <StatusBadge>{t.kindOptions[row.kind]}</StatusBadge>
                          </TableCell>

                          <TableCell>
                            <StatusBadge tone={cardTone(row.status)}>
                              {t.cardStatus[row.status]}
                            </StatusBadge>
                          </TableCell>

                          <TableCell>
                            <StatusBadge tone={paymentTone(row.paymentStatus)}>
                              {t.paymentStatus[row.paymentStatus]}
                            </StatusBadge>
                          </TableCell>

                          <TableCell>
                            <div className="min-w-[150px] text-sm">
                              <p>
                                {t.startsAt}: {formatDate(row.startsAt)}
                              </p>
                              <p className="mt-1 text-muted-foreground">
                                {t.endsAt}: {formatDate(row.endsAt)}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <MoneyText value={row.totalAmount} />
                          </TableCell>

                          <TableCell className="text-center">
                            {isValidId(row.orderId) ? (
                              <Link href={`/customer/orders/${row.orderId}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl"
                                >
                                  <Eye className="h-4 w-4" />
                                  {t.viewOrder}
                                </Button>
                              </Link>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}