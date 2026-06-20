"use client";

/* ============================================================
   📂 app/customer/orders/page.tsx
   🧭 Primey Care | Customer Orders Page
   ------------------------------------------------------------
   ✅ صفحة محتوى فقط داخل الشِل الموحد
   ✅ لا تنشئ سايدر أو هيدر مستقل
   ✅ تعرض طلبات العميل الحالي فقط
   ✅ تعتمد على /api/customers/me/ ثم /api/orders/?customer_id=
   ✅ fallback آمن من latest_orders
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
  CreditCard,
  Download,
  Eye,
  FileText,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCcw,
  Search,
  ShoppingBag,
  TimerReset,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "processing"
  | "completed"
  | "cancelled"
  | "refunded"
  | "UNKNOWN";

type PaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "failed"
  | "refunded"
  | "UNKNOWN";

type FulfillmentStatus =
  | "not_started"
  | "in_progress"
  | "issued"
  | "delivered"
  | "failed"
  | "UNKNOWN";

type OrderKind =
  | "general"
  | "card"
  | "program"
  | "service"
  | "subscription"
  | "UNKNOWN";

type OrderRow = {
  id: string;
  orderNumber: string;
  title: string;
  productName: string;
  productType: string;
  providerName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  orderKind: OrderKind;
  paymentMethod: string;
  paymentReference: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdAt: string;
  scheduledAt: string;
};

type OrdersSummary = {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  paidOrders: number;
  unpaidOrders: number;
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

const DEFAULT_SUMMARY: OrdersSummary = {
  totalOrders: 0,
  pendingOrders: 0,
  processingOrders: 0,
  completedOrders: 0,
  paidOrders: 0,
  unpaidOrders: 0,
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
    "customer",
    "product",
    "provider",
    "center",
    "invoice",
    "payment",
    "fulfillment",
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

function normalizeOrderStatus(value: unknown): OrderStatus {
  const status = String(value || "").toLowerCase();

  if (status === "draft") return "draft";
  if (status === "pending") return "pending";
  if (status === "confirmed") return "confirmed";
  if (status === "processing") return "processing";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "refunded") return "refunded";

  return "UNKNOWN";
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value || "").toLowerCase();

  if (status === "unpaid") return "unpaid";
  if (status === "partial" || status === "partially_paid") return "partially_paid";
  if (status === "paid") return "paid";
  if (status === "failed") return "failed";
  if (status === "refunded") return "refunded";

  return "UNKNOWN";
}

function normalizeFulfillmentStatus(value: unknown): FulfillmentStatus {
  const status = String(value || "").toLowerCase();

  if (status === "not_started") return "not_started";
  if (status === "in_progress") return "in_progress";
  if (status === "issued") return "issued";
  if (status === "delivered" || status === "fulfilled") return "delivered";
  if (status === "failed" || status === "cancelled" || status === "canceled") {
    return "failed";
  }

  return "UNKNOWN";
}

function normalizeOrderKind(value: unknown): OrderKind {
  const kind = String(value || "").toLowerCase();

  if (kind === "general") return "general";
  if (kind === "card") return "card";
  if (kind === "program") return "program";
  if (kind === "service") return "service";
  if (kind === "subscription") return "subscription";

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
    title: isArabic ? "طلباتي" : "My Orders",
    subtitle: isArabic
      ? "تابع طلباتك وحالة الدفع والتنفيذ."
      : "Track your orders, payment status, and fulfillment.",

    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة PDF" : "Print PDF",
    search: isArabic ? "بحث" : "Search",
    searchPlaceholder: isArabic
      ? "ابحث برقم الطلب، المنتج، مقدم الخدمة، الفاتورة..."
      : "Search by order number, product, provider, invoice...",
    all: isArabic ? "الكل" : "All",

    totalOrders: isArabic ? "إجمالي الطلبات" : "Total Orders",
    pendingOrders: isArabic ? "بانتظار التأكيد" : "Pending",
    processingOrders: isArabic ? "قيد التنفيذ" : "Processing",
    completedOrders: isArabic ? "مكتملة" : "Completed",
    totalAmount: isArabic ? "إجمالي الطلبات" : "Total Amount",
    paidAmount: isArabic ? "المدفوع" : "Paid",
    remainingAmount: isArabic ? "المتبقي" : "Remaining",

    tableTitle: isArabic ? "قائمة الطلبات" : "Orders List",
    tableDesc: isArabic
      ? "آخر طلباتك المسجلة في Primey Care."
      : "Your latest orders in Primey Care.",

    order: isArabic ? "الطلب" : "Order",
    product: isArabic ? "المنتج" : "Product",
    provider: isArabic ? "مقدم الخدمة" : "Provider",
    kind: isArabic ? "النوع" : "Kind",
    status: isArabic ? "الحالة" : "Status",
    payment: isArabic ? "الدفع" : "Payment",
    fulfillment: isArabic ? "التنفيذ" : "Fulfillment",
    total: isArabic ? "الإجمالي" : "Total",
    remaining: isArabic ? "المتبقي" : "Remaining",
    createdAt: isArabic ? "تاريخ الإنشاء" : "Created At",
    action: isArabic ? "الإجراء" : "Action",
    view: isArabic ? "عرض" : "View",

    loadError: isArabic ? "تعذر تحميل الطلبات." : "Unable to load orders.",
    loadSuccess: isArabic ? "تم تحديث الطلبات." : "Orders refreshed.",
    exportSuccess: isArabic ? "تم تجهيز ملف Excel." : "Excel file prepared.",
    exportEmpty: isArabic
      ? "لا توجد بيانات قابلة للتصدير."
      : "No data available to export.",
    printSuccess: isArabic ? "تم تجهيز نافذة الطباعة." : "Print window prepared.",
    printError: isArabic ? "تعذر فتح نافذة الطباعة." : "Unable to open print window.",

    emptyTitle: isArabic ? "لا توجد طلبات حتى الآن" : "No orders yet",
    emptyText: isArabic
      ? "ستظهر طلباتك هنا بعد إنشاء أول طلب."
      : "Your orders will appear here after the first order is created.",
    noResultsTitle: isArabic ? "لا توجد نتائج مطابقة" : "No matching results",
    noResultsText: isArabic
      ? "جرّب تغيير البحث أو الفلاتر."
      : "Try changing search or filters.",

    noData: isArabic ? "غير متوفر" : "Not available",
    generatedAt: isArabic ? "تاريخ التصدير" : "Generated At",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",

    statusOptions: {
      all: isArabic ? "كل الحالات" : "All Statuses",
      pending: isArabic ? "بانتظار التأكيد" : "Pending",
      confirmed: isArabic ? "مؤكد" : "Confirmed",
      processing: isArabic ? "قيد التنفيذ" : "Processing",
      completed: isArabic ? "مكتمل" : "Completed",
      cancelled: isArabic ? "ملغي" : "Cancelled",
      refunded: isArabic ? "مسترد" : "Refunded",
    },

    paymentOptions: {
      all: isArabic ? "كل حالات الدفع" : "All Payment",
      unpaid: isArabic ? "غير مدفوع" : "Unpaid",
      partially_paid: isArabic ? "مدفوع جزئيًا" : "Partially Paid",
      paid: isArabic ? "مدفوع" : "Paid",
      failed: isArabic ? "فشل الدفع" : "Failed",
      refunded: isArabic ? "مسترد" : "Refunded",
    },

    orderStatus: {
      draft: isArabic ? "مسودة" : "Draft",
      pending: isArabic ? "بانتظار التأكيد" : "Pending",
      confirmed: isArabic ? "مؤكد" : "Confirmed",
      processing: isArabic ? "قيد التنفيذ" : "Processing",
      completed: isArabic ? "مكتمل" : "Completed",
      cancelled: isArabic ? "ملغي" : "Cancelled",
      refunded: isArabic ? "مسترد" : "Refunded",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<OrderStatus, string>,

    paymentStatus: {
      unpaid: isArabic ? "غير مدفوع" : "Unpaid",
      partially_paid: isArabic ? "مدفوع جزئيًا" : "Partially Paid",
      paid: isArabic ? "مدفوع" : "Paid",
      failed: isArabic ? "فشل الدفع" : "Failed",
      refunded: isArabic ? "مسترد" : "Refunded",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<PaymentStatus, string>,

    fulfillmentStatus: {
      not_started: isArabic ? "لم يبدأ" : "Not Started",
      in_progress: isArabic ? "قيد التنفيذ" : "In Progress",
      issued: isArabic ? "تم الإصدار" : "Issued",
      delivered: isArabic ? "تم التسليم" : "Delivered",
      failed: isArabic ? "فشل" : "Failed",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<FulfillmentStatus, string>,

    orderKind: {
      general: isArabic ? "عام" : "General",
      card: isArabic ? "بطاقة" : "Card",
      program: isArabic ? "برنامج" : "Program",
      service: isArabic ? "خدمة" : "Service",
      subscription: isArabic ? "اشتراك" : "Subscription",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<OrderKind, string>,
  };
}

function normalizeOrder(row: unknown, index: number): OrderRow {
  const obj = asDict(row);
  const product = asDict(obj.product);
  const provider = asDict(obj.provider || obj.center);
  const invoice = asDict(obj.invoice);

  const id = String(
    getValue(obj, "id") ||
      getValue(obj, "order_id") ||
      getValue(obj, "pk") ||
      index + 1,
  );

  const productName = String(
    getValue(obj, "product_name") ||
      product.name ||
      product.title ||
      getValue(obj, "service_name") ||
      getValue(obj, "program_name") ||
      "",
  );

  const orderKind = normalizeOrderKind(
    getValue(obj, "order_kind") ||
      getValue(obj, "kind") ||
      getValue(obj, "product_type") ||
      product.product_type,
  );

  const totalAmount = toNumber(
    getValue(obj, "total_amount") ||
      getValue(obj, "grand_total") ||
      getValue(obj, "amount"),
  );

  const paidAmount = toNumber(getValue(obj, "paid_amount"));

  const remainingAmount = toNumber(
    getValue(obj, "remaining_amount") ||
      getValue(obj, "due_amount") ||
      Math.max(totalAmount - paidAmount, 0),
  );

  return {
    id,
    orderNumber: String(
      getValue(obj, "order_number") ||
        getValue(obj, "number") ||
        getValue(obj, "reference") ||
        `ORD-${id}`,
    ),
    title: productName || "-",
    productName: productName || "-",
    productType: String(getValue(obj, "product_type") || product.product_type || ""),
    providerName: String(
      getValue(obj, "provider_name") ||
        provider.name ||
        provider.display_name ||
        provider.provider_name ||
        "",
    ),
    status: normalizeOrderStatus(getValue(obj, "status")),
    paymentStatus: normalizePaymentStatus(getValue(obj, "payment_status")),
    fulfillmentStatus: normalizeFulfillmentStatus(
      getValue(obj, "fulfillment_status"),
    ),
    orderKind,
    paymentMethod: String(
      getValue(obj, "payment_method") ||
        getValue(obj, "payment_type") ||
        "",
    ),
    paymentReference: String(
      getValue(obj, "payment_reference") ||
        getValue(obj, "transaction_id") ||
        "",
    ),
    invoiceNumber: String(
      getValue(obj, "invoice_number") ||
        invoice.invoice_number ||
        invoice.number ||
        "",
    ),
    totalAmount,
    paidAmount,
    remainingAmount,
    createdAt: String(getValue(obj, "created_at") || getValue(obj, "created") || ""),
    scheduledAt: String(
      getValue(obj, "scheduled_at") ||
        getValue(obj, "starts_at") ||
        getValue(obj, "ends_at") ||
        "",
    ),
  };
}

function buildSummary(rows: OrderRow[]): OrdersSummary {
  return rows.reduce<OrdersSummary>(
    (summary, row) => {
      summary.totalOrders += 1;
      summary.totalAmount += row.totalAmount;
      summary.paidAmount += row.paidAmount;
      summary.remainingAmount += row.remainingAmount;

      if (row.status === "pending") summary.pendingOrders += 1;
      if (row.status === "processing") summary.processingOrders += 1;
      if (row.status === "completed") summary.completedOrders += 1;

      if (row.paymentStatus === "paid") summary.paidOrders += 1;
      if (row.paymentStatus === "unpaid") summary.unpaidOrders += 1;

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

function orderTone(status: OrderStatus) {
  if (status === "completed" || status === "confirmed") return "success";
  if (status === "processing") return "info";
  if (status === "pending" || status === "draft") return "warning";
  if (status === "cancelled" || status === "refunded") return "danger";
  return "default";
}

function paymentTone(status: PaymentStatus) {
  if (status === "paid") return "success";
  if (status === "partially_paid") return "info";
  if (status === "unpaid") return "warning";
  if (status === "failed" || status === "refunded") return "danger";
  return "default";
}

function fulfillmentTone(status: FulfillmentStatus) {
  if (status === "delivered" || status === "issued") return "success";
  if (status === "in_progress") return "info";
  if (status === "not_started") return "warning";
  if (status === "failed") return "danger";
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

      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardContent className="space-y-3 p-5">
          <SkeletonLine className="h-11 w-full rounded-2xl" />
          <SkeletonLine className="h-12 w-full rounded-xl" />
          <SkeletonLine className="h-12 w-full rounded-xl" />
          <SkeletonLine className="h-12 w-full rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
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
  icon: React.ReactNode;
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

function buildExportHtml({
  rows,
  locale,
}: {
  rows: OrderRow[];
  locale: AppLocale;
}) {
  const t = dictionary(locale);
  const generatedAt = new Date().toLocaleString("en-US");

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.orderNumber)}</td>
          <td>${escapeHtml(row.productName)}</td>
          <td>${escapeHtml(t.orderKind[row.orderKind])}</td>
          <td>${escapeHtml(row.providerName || "-")}</td>
          <td>${escapeHtml(t.orderStatus[row.status])}</td>
          <td>${escapeHtml(t.paymentStatus[row.paymentStatus])}</td>
          <td>${escapeHtml(t.fulfillmentStatus[row.fulfillmentStatus])}</td>
          <td>${escapeHtml(formatMoney(row.totalAmount))}</td>
          <td>${escapeHtml(formatMoney(row.remainingAmount))}</td>
          <td>${escapeHtml(formatDate(row.createdAt))}</td>
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
              <th>${escapeHtml(t.order)}</th>
              <th>${escapeHtml(t.product)}</th>
              <th>${escapeHtml(t.kind)}</th>
              <th>${escapeHtml(t.provider)}</th>
              <th>${escapeHtml(t.status)}</th>
              <th>${escapeHtml(t.payment)}</th>
              <th>${escapeHtml(t.fulfillment)}</th>
              <th>${escapeHtml(t.total)}</th>
              <th>${escapeHtml(t.remaining)}</th>
              <th>${escapeHtml(t.createdAt)}</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;
}

export default function CustomerOrdersPage() {
  const [locale, setLocale] = useState<AppLocale>("ar");
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [summary, setSummary] = useState<OrdersSummary>(DEFAULT_SUMMARY);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");
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
            row.productName,
            row.productType,
            row.providerName,
            row.invoiceNumber,
            row.paymentMethod,
            row.paymentReference,
            t.orderKind[row.orderKind],
            t.orderStatus[row.status],
            t.paymentStatus[row.paymentStatus],
            t.fulfillmentStatus[row.fulfillmentStatus],
          ]
            .join(" ")
            .toLowerCase()
            .includes(clean);

        const matchesStatus =
          statusFilter === "all" || row.status === statusFilter;

        const matchesPayment =
          paymentFilter === "all" || row.paymentStatus === paymentFilter;

        return matchesQuery && matchesStatus && matchesPayment;
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [paymentFilter, query, rows, statusFilter, t]);

  const displaySummary = useMemo(
    () => buildSummary(filteredRows),
    [filteredRows],
  );

  const hasSearchOrFilters =
    query.trim().length > 0 || statusFilter !== "all" || paymentFilter !== "all";

  const loadOrders = useCallback(
    async (showToast = false) => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const mePayload = await fetchJson("/api/customers/me/");
        const meData = asDict(mePayload?.data);
        const customer = asDict(meData.customer || mePayload?.customer || {});
        const customerId = String(
          getValue(customer, "id") ||
            getValue(meData, "customer_id") ||
            "",
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
          .map(normalizeOrder)
          .filter((row) => isValidId(row.id) || row.orderNumber !== "-");

        setRows(normalizedRows);
        setSummary(buildSummary(normalizedRows));

        if (showToast) {
          toast.success(t.loadSuccess);
        }
      } catch (error) {
        console.error("Customer orders load error:", error);
        setRows([]);
        setSummary(DEFAULT_SUMMARY);
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
    anchor.download = `primey-care-customer-orders-${Date.now()}.xls`;
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
    void loadOrders(false);
  }, [loadOrders]);

  return (
    <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Badge variant="outline" className="mb-2 rounded-full px-3 py-1">
            <ShoppingBag className="h-3.5 w-3.5" />
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
            onClick={() => void loadOrders(true)}
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
              onClick={() => void loadOrders(true)}
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
              title={t.totalOrders}
              value={formatNumber(displaySummary.totalOrders)}
              icon={<ShoppingBag className="h-5 w-5" />}
            />
            <KpiCard
              title={t.pendingOrders}
              value={formatNumber(displaySummary.pendingOrders)}
              icon={<TimerReset className="h-5 w-5" />}
            />
            <KpiCard
              title={t.completedOrders}
              value={formatNumber(displaySummary.completedOrders)}
              icon={<PackageCheck className="h-5 w-5" />}
            />
            <KpiCard
              title={t.totalAmount}
              value={<MoneyText value={displaySummary.totalAmount} />}
              icon={<WalletCards className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title={t.paidAmount}
              value={<MoneyText value={displaySummary.paidAmount} />}
              icon={<CreditCard className="h-5 w-5" />}
            />
            <KpiCard
              title={t.remainingAmount}
              value={<MoneyText value={displaySummary.remainingAmount} />}
              icon={<FileText className="h-5 w-5" />}
            />
            <KpiCard
              title={t.processingOrders}
              value={formatNumber(displaySummary.processingOrders)}
              icon={<CalendarDays className="h-5 w-5" />}
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
                    setStatusFilter(event.target.value as OrderStatus | "all")
                  }
                  className="h-11 rounded-2xl border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="all">{t.statusOptions.all}</option>
                  <option value="pending">{t.statusOptions.pending}</option>
                  <option value="confirmed">{t.statusOptions.confirmed}</option>
                  <option value="processing">{t.statusOptions.processing}</option>
                  <option value="completed">{t.statusOptions.completed}</option>
                  <option value="cancelled">{t.statusOptions.cancelled}</option>
                  <option value="refunded">{t.statusOptions.refunded}</option>
                </select>

                <select
                  value={paymentFilter}
                  onChange={(event) =>
                    setPaymentFilter(event.target.value as PaymentStatus | "all")
                  }
                  className="h-11 rounded-2xl border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="all">{t.paymentOptions.all}</option>
                  <option value="unpaid">{t.paymentOptions.unpaid}</option>
                  <option value="partially_paid">
                    {t.paymentOptions.partially_paid}
                  </option>
                  <option value="paid">{t.paymentOptions.paid}</option>
                  <option value="failed">{t.paymentOptions.failed}</option>
                  <option value="refunded">{t.paymentOptions.refunded}</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t.tableTitle}</CardTitle>
              <CardDescription>{t.tableDesc}</CardDescription>
            </CardHeader>

            <CardContent>
              {filteredRows.length === 0 ? (
                <EmptyState
                  icon={<ShoppingBag className="h-7 w-7 text-muted-foreground" />}
                  title={hasSearchOrFilters ? t.noResultsTitle : t.emptyTitle}
                  text={hasSearchOrFilters ? t.noResultsText : t.emptyText}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.order}</TableHead>
                        <TableHead>{t.product}</TableHead>
                        <TableHead>{t.kind}</TableHead>
                        <TableHead>{t.provider}</TableHead>
                        <TableHead>{t.status}</TableHead>
                        <TableHead>{t.payment}</TableHead>
                        <TableHead>{t.fulfillment}</TableHead>
                        <TableHead>{t.total}</TableHead>
                        <TableHead>{t.createdAt}</TableHead>
                        <TableHead className="text-center">{t.action}</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={`${row.id}-${row.orderNumber}`}>
                          <TableCell>
                            <div className="min-w-[140px]">
                              <p className="font-semibold">{row.orderNumber}</p>
                              {row.invoiceNumber ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {row.invoiceNumber}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="min-w-[180px]">
                              <p className="font-medium">{row.productName}</p>
                              {row.productType ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {normalizeText(row.productType)}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell>
                            <StatusBadge>{t.orderKind[row.orderKind]}</StatusBadge>
                          </TableCell>

                          <TableCell>{row.providerName || "-"}</TableCell>

                          <TableCell>
                            <StatusBadge tone={orderTone(row.status)}>
                              {t.orderStatus[row.status]}
                            </StatusBadge>
                          </TableCell>

                          <TableCell>
                            <StatusBadge tone={paymentTone(row.paymentStatus)}>
                              {t.paymentStatus[row.paymentStatus]}
                            </StatusBadge>
                          </TableCell>

                          <TableCell>
                            <StatusBadge tone={fulfillmentTone(row.fulfillmentStatus)}>
                              {t.fulfillmentStatus[row.fulfillmentStatus]}
                            </StatusBadge>
                          </TableCell>

                          <TableCell>
                            <div className="min-w-[120px]">
                              <MoneyText value={row.totalAmount} />
                              {row.remainingAmount > 0 ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {t.remaining}: {formatMoney(row.remainingAmount)}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell>{formatDate(row.createdAt)}</TableCell>

                          <TableCell className="text-center">
                            {isValidId(row.id) ? (
                              <Link href={`/customer/orders/${row.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl"
                                >
                                  <Eye className="h-4 w-4" />
                                  {t.view}
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
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}