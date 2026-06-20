"use client";

/* ============================================================
   📂 app/customer/orders/[id]/page.tsx
   🧭 Primey Care | Customer Order Details Page
   ------------------------------------------------------------
   ✅ صفحة محتوى فقط داخل الشِل الموحد
   ✅ لا تنشئ سايدر أو هيدر مستقل
   ✅ تفاصيل طلب العميل الحالي فقط
   ✅ تعتمد على /api/customers/me/ ثم /api/orders/{id}/
   ✅ حماية واجهة من عرض طلب لا يخص العميل
   ✅ Web PDF Print
   ✅ SAR icon from /currency/sar.svg
   ✅ عربي/إنجليزي عبر primey-locale
   ✅ أرقام إنجليزية دائمًا
   ✅ Skeleton Loading
   ✅ Error State مستقل
   ✅ Not Found مستقل
   ✅ sonner
   ✅ بدون localhost
============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  Loader2,
  PackageCheck,
  Printer,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  UserRound,
  WalletCards,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
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
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

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

type OrderDetail = {
  id: string;
  orderNumber: string;

  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;

  productId: string;
  productName: string;
  productType: string;

  providerId: string;
  providerName: string;

  invoiceId: string;
  invoiceNumber: string;

  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  orderKind: OrderKind;

  paymentMethod: string;
  paymentReference: string;

  unitPrice: number;
  quantity: number;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;

  startsAt: string;
  endsAt: string;
  scheduledAt: string;
  issuedAt: string;
  issueReference: string;

  notes: string;
  cancellationReason: string;

  createdAt: string;
  updatedAt: string;
  raw: Dict;
};

type ApiEnvelope = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  data?: unknown;
  customer?: unknown;
  order?: unknown;
  item?: unknown;
};

const SAR_ICON_PATH = "/currency/sar.svg";

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
    headers: {
      Accept: "application/json",
    },
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeText(value: unknown) {
  return String(value || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
}

function titleCase(value: unknown) {
  const text = normalizeText(value);

  if (!text) return "";

  return text
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
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
    title: isArabic ? "تفاصيل الطلب" : "Order Details",
    subtitle: isArabic
      ? "راجع تفاصيل الطلب وحالة الدفع والتنفيذ."
      : "Review order details, payment status, and fulfillment.",
    back: isArabic ? "طلباتي" : "My Orders",
    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    print: isArabic ? "طباعة PDF" : "Print PDF",
    viewInvoice: isArabic ? "عرض الفاتورة" : "View Invoice",

    overview: isArabic ? "ملخص الطلب" : "Order Overview",
    overviewDesc: isArabic
      ? "الحالة العامة ومعلومات الطلب."
      : "General status and order information.",
    amounts: isArabic ? "المبالغ" : "Amounts",
    amountsDesc: isArabic
      ? "تفاصيل المبالغ الخاصة بالطلب."
      : "Order amount breakdown.",
    productProvider: isArabic ? "المنتج ومقدم الخدمة" : "Product & Provider",
    productProviderDesc: isArabic
      ? "تفاصيل المنتج ومقدم الخدمة."
      : "Product and provider details.",
    payment: isArabic ? "الدفع والفاتورة" : "Payment & Invoice",
    paymentDesc: isArabic
      ? "تفاصيل الدفع والفاتورة المرتبطة."
      : "Payment and related invoice details.",
    timeline: isArabic ? "المواعيد" : "Timeline",
    timelineDesc: isArabic
      ? "تواريخ الطلب والتنفيذ."
      : "Order and fulfillment dates.",
    notes: isArabic ? "الملاحظات" : "Notes",

    orderNumber: isArabic ? "رقم الطلب" : "Order Number",
    orderStatus: isArabic ? "حالة الطلب" : "Order Status",
    paymentStatusLabel: isArabic ? "حالة الدفع" : "Payment Status",
    fulfillmentStatusLabel: isArabic ? "حالة التنفيذ" : "Fulfillment Status",
    orderKind: isArabic ? "نوع الطلب" : "Order Type",

    customer: isArabic ? "العميل" : "Customer",
    customerPhone: isArabic ? "رقم العميل" : "Customer Phone",
    product: isArabic ? "المنتج" : "Product",
    productType: isArabic ? "نوع المنتج" : "Product Type",
    provider: isArabic ? "مقدم الخدمة" : "Provider",

    unitPrice: isArabic ? "سعر الوحدة" : "Unit Price",
    quantity: isArabic ? "الكمية" : "Quantity",
    subtotal: isArabic ? "الإجمالي قبل الخصم" : "Subtotal",
    discount: isArabic ? "الخصم" : "Discount",
    tax: isArabic ? "الضريبة" : "Tax",
    total: isArabic ? "الإجمالي" : "Total",
    paid: isArabic ? "المدفوع" : "Paid",
    remaining: isArabic ? "المتبقي" : "Remaining",

    paymentMethod: isArabic ? "طريقة الدفع" : "Payment Method",
    paymentReference: isArabic ? "مرجع الدفع" : "Payment Reference",
    invoiceNumber: isArabic ? "رقم الفاتورة" : "Invoice Number",
    issueReference: isArabic ? "مرجع الإصدار" : "Issue Reference",

    createdAt: isArabic ? "تاريخ الإنشاء" : "Created At",
    updatedAt: isArabic ? "آخر تحديث" : "Updated At",
    scheduledAt: isArabic ? "موعد الخدمة" : "Scheduled At",
    startsAt: isArabic ? "بداية الخدمة" : "Starts At",
    endsAt: isArabic ? "نهاية الخدمة" : "Ends At",
    issuedAt: isArabic ? "تاريخ الإصدار" : "Issued At",

    orderNotes: isArabic ? "ملاحظات الطلب" : "Order Notes",
    cancellationReason: isArabic ? "سبب الإلغاء" : "Cancellation Reason",

    noData: isArabic ? "غير متوفر" : "Not available",
    loading: isArabic ? "جاري تحميل تفاصيل الطلب" : "Loading order details",
    loadError: isArabic
      ? "تعذر تحميل تفاصيل الطلب."
      : "Unable to load order details.",
    loadSuccess: isArabic ? "تم تحديث تفاصيل الطلب." : "Order details refreshed.",
    notFoundTitle: isArabic ? "الطلب غير متاح" : "Order Not Available",
    notFoundText: isArabic
      ? "لم يتم العثور على الطلب أو أنه لا يخص حسابك."
      : "The order was not found or does not belong to your account.",
    printSuccess: isArabic ? "تم تجهيز نافذة الطباعة." : "Print window prepared.",
    printError: isArabic ? "تعذر فتح نافذة الطباعة." : "Unable to open print window.",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",

    orderStatusMap: {
      draft: isArabic ? "مسودة" : "Draft",
      pending: isArabic ? "بانتظار التأكيد" : "Pending",
      confirmed: isArabic ? "مؤكد" : "Confirmed",
      processing: isArabic ? "قيد التنفيذ" : "Processing",
      completed: isArabic ? "مكتمل" : "Completed",
      cancelled: isArabic ? "ملغي" : "Cancelled",
      refunded: isArabic ? "مسترد" : "Refunded",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<OrderStatus, string>,

    paymentStatusMap: {
      unpaid: isArabic ? "غير مدفوع" : "Unpaid",
      partially_paid: isArabic ? "مدفوع جزئيًا" : "Partially Paid",
      paid: isArabic ? "مدفوع" : "Paid",
      failed: isArabic ? "فشل الدفع" : "Failed",
      refunded: isArabic ? "مسترد" : "Refunded",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<PaymentStatus, string>,

    fulfillmentStatusMap: {
      not_started: isArabic ? "لم يبدأ" : "Not Started",
      in_progress: isArabic ? "قيد التنفيذ" : "In Progress",
      issued: isArabic ? "تم الإصدار" : "Issued",
      delivered: isArabic ? "تم التسليم" : "Delivered",
      failed: isArabic ? "فشل" : "Failed",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<FulfillmentStatus, string>,

    orderKindMap: {
      general: isArabic ? "عام" : "General",
      card: isArabic ? "بطاقة" : "Card",
      program: isArabic ? "برنامج" : "Program",
      service: isArabic ? "خدمة" : "Service",
      subscription: isArabic ? "اشتراك" : "Subscription",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<OrderKind, string>,
  };
}

function normalizeOrder(row: unknown): OrderDetail {
  const obj = asDict(row);
  const customer = asDict(obj.customer);
  const product = asDict(obj.product);
  const provider = asDict(obj.provider || obj.center);
  const invoice = asDict(obj.invoice);

  const id = String(
    getValue(obj, "id") ||
      getValue(obj, "order_id") ||
      getValue(obj, "pk") ||
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
    orderNumber: String(
      getValue(obj, "order_number") ||
        getValue(obj, "number") ||
        getValue(obj, "reference") ||
        (id ? `ORD-${id}` : ""),
    ),

    customerId: String(
      getValue(obj, "customer_id") ||
        customer.id ||
        customer.pk ||
        "",
    ),
    customerName: String(
      getValue(obj, "customer_name") ||
        customer.display_name ||
        customer.full_name ||
        customer.name ||
        "",
    ),
    customerPhone: String(
      getValue(obj, "customer_phone") ||
        customer.phone_number ||
        customer.whatsapp_number ||
        customer.normalized_phone ||
        "",
    ),
    customerEmail: String(
      getValue(obj, "customer_email") ||
        customer.email ||
        "",
    ),

    productId: String(getValue(obj, "product_id") || product.id || ""),
    productName: String(
      getValue(obj, "product_name") ||
        product.name ||
        product.title ||
        getValue(obj, "service_name") ||
        getValue(obj, "program_name") ||
        "",
    ),
    productType: String(
      getValue(obj, "product_type") ||
        product.product_type ||
        product.type ||
        "",
    ),

    providerId: String(getValue(obj, "provider_id") || provider.id || ""),
    providerName: String(
      getValue(obj, "provider_name") ||
        provider.name ||
        provider.display_name ||
        provider.provider_name ||
        "",
    ),

    invoiceId: String(getValue(obj, "invoice_id") || invoice.id || ""),
    invoiceNumber: String(
      getValue(obj, "invoice_number") ||
        invoice.invoice_number ||
        invoice.number ||
        "",
    ),

    status: normalizeOrderStatus(getValue(obj, "status")),
    paymentStatus: normalizePaymentStatus(getValue(obj, "payment_status")),
    fulfillmentStatus: normalizeFulfillmentStatus(
      getValue(obj, "fulfillment_status"),
    ),
    orderKind: normalizeOrderKind(
      getValue(obj, "order_kind") ||
        getValue(obj, "kind") ||
        getValue(obj, "product_type") ||
        product.product_type,
    ),

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

    unitPrice: toNumber(
      getValue(obj, "unit_price") ||
        getValue(obj, "price") ||
        totalAmount,
    ),
    quantity: toNumber(getValue(obj, "quantity") || 1),
    subtotalAmount: toNumber(
      getValue(obj, "subtotal_amount") ||
        getValue(obj, "subtotal") ||
        totalAmount,
    ),
    discountAmount: toNumber(
      getValue(obj, "discount_amount") ||
        getValue(obj, "discount"),
    ),
    taxAmount: toNumber(
      getValue(obj, "tax_amount") ||
        getValue(obj, "vat_amount") ||
        getValue(obj, "tax"),
    ),
    totalAmount,
    paidAmount,
    remainingAmount: toNumber(
      getValue(obj, "remaining_amount") ||
        getValue(obj, "due_amount") ||
        Math.max(totalAmount - paidAmount, 0),
    ),

    startsAt: String(getValue(obj, "starts_at") || ""),
    endsAt: String(getValue(obj, "ends_at") || ""),
    scheduledAt: String(getValue(obj, "scheduled_at") || ""),
    issuedAt: String(getValue(obj, "issued_at") || ""),
    issueReference: String(getValue(obj, "issue_reference") || ""),

    notes: String(getValue(obj, "notes") || ""),
    cancellationReason: String(getValue(obj, "cancellation_reason") || ""),

    createdAt: String(getValue(obj, "created_at") || getValue(obj, "created") || ""),
    updatedAt: String(getValue(obj, "updated_at") || getValue(obj, "modified") || ""),
    raw: obj,
  };
}

function unwrapOrder(payload: ApiEnvelope | null): OrderDetail {
  const data = asDict(payload?.data);
  return normalizeOrder(payload?.order || data.order || payload?.item || payload?.data || {});
}

function unwrapCurrentCustomerId(payload: ApiEnvelope | null) {
  const data = asDict(payload?.data);
  const customer = asDict(data.customer || payload?.customer || payload?.data || {});

  return String(
    getValue(customer, "id") ||
      getValue(customer, "customer_id") ||
      getValue(data, "customer_id") ||
      "",
  );
}

function orderBelongsToCustomer(order: OrderDetail, customerId: string) {
  if (!isValidId(customerId)) return true;
  if (!isValidId(order.customerId)) return true;

  return String(order.customerId) === String(customerId);
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <TableRow>
      <TableCell className="w-[42%] text-muted-foreground">{label}</TableCell>
      <TableCell className="font-medium">{value || "-"}</TableCell>
    </TableRow>
  );
}

function InfoBox({
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
      <CardContent className="flex items-start gap-3 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="mt-1 truncate text-xl font-bold">{value || "-"}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-muted ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardContent className="space-y-3 p-5">
          <SkeletonLine className="h-8 w-52" />
          <SkeletonLine className="h-4 w-96 max-w-full" />
        </CardContent>
      </Card>

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

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="space-y-4 p-5">
            <SkeletonLine className="h-14 w-14 rounded-2xl" />
            <SkeletonLine className="h-7 w-48" />
            <SkeletonLine className="h-4 w-36" />
            <SkeletonLine className="h-12 w-full rounded-xl" />
            <SkeletonLine className="h-12 w-full rounded-xl" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="space-y-3 p-5">
            <SkeletonLine className="h-6 w-40" />
            <SkeletonLine className="h-12 w-full rounded-xl" />
            <SkeletonLine className="h-12 w-full rounded-xl" />
            <SkeletonLine className="h-12 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function buildPrintHtml(order: OrderDetail, locale: AppLocale) {
  const t = dictionary(locale);
  const printedAt = new Date().toLocaleString("en-US");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(t.title)} - ${escapeHtml(order.orderNumber)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            direction: ${locale === "ar" ? "rtl" : "ltr"};
            color: #111827;
            padding: 24px;
          }
          .header {
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          h1 { margin: 0 0 8px; font-size: 24px; }
          .muted { color: #6b7280; font-size: 12px; }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          .card {
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 14px;
            margin-bottom: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          td {
            border-bottom: 1px solid #f3f4f6;
            padding: 8px;
            font-size: 13px;
          }
          td:first-child {
            color: #6b7280;
            width: 38%;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${escapeHtml(t.title)}</h1>
          <div class="muted">${escapeHtml(t.printedAt)}: ${escapeHtml(printedAt)}</div>
        </div>

        <div class="grid">
          <div class="card">
            <strong>${escapeHtml(t.orderNumber)}</strong>
            <div>${escapeHtml(order.orderNumber)}</div>
          </div>
          <div class="card">
            <strong>${escapeHtml(t.total)}</strong>
            <div>${escapeHtml(formatMoney(order.totalAmount))} SAR</div>
          </div>
        </div>

        <div class="card">
          <strong>${escapeHtml(t.overview)}</strong>
          <table>
            <tbody>
              <tr><td>${escapeHtml(t.orderStatus)}</td><td>${escapeHtml(t.orderStatusMap[order.status])}</td></tr>
              <tr><td>${escapeHtml(t.paymentStatusLabel)}</td><td>${escapeHtml(t.paymentStatusMap[order.paymentStatus])}</td></tr>
              <tr><td>${escapeHtml(t.fulfillmentStatusLabel)}</td><td>${escapeHtml(t.fulfillmentStatusMap[order.fulfillmentStatus])}</td></tr>
              <tr><td>${escapeHtml(t.product)}</td><td>${escapeHtml(order.productName || "-")}</td></tr>
              <tr><td>${escapeHtml(t.provider)}</td><td>${escapeHtml(order.providerName || "-")}</td></tr>
              <tr><td>${escapeHtml(t.invoiceNumber)}</td><td>${escapeHtml(order.invoiceNumber || "-")}</td></tr>
              <tr><td>${escapeHtml(t.createdAt)}</td><td>${escapeHtml(formatDate(order.createdAt))}</td></tr>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;
}

export default function CustomerOrderDetailsPage() {
  const params = useParams<{ id?: string }>();
  const orderId = String(params?.id || "");

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notFound, setNotFound] = useState(false);

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";

  const loadOrder = useCallback(
    async (showToast = false) => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setNotFound(false);

        if (!isValidId(orderId)) {
          setNotFound(true);
          setOrder(null);
          return;
        }

        const mePayload = await fetchJson("/api/customers/me/");
        const customerId = unwrapCurrentCustomerId(mePayload);

        const orderPayload = await fetchJson(`/api/orders/${encodeURIComponent(orderId)}/`);
        const nextOrder = unwrapOrder(orderPayload);

        if (!isValidId(nextOrder.id)) {
          setNotFound(true);
          setOrder(null);
          return;
        }

        if (!orderBelongsToCustomer(nextOrder, customerId)) {
          setNotFound(true);
          setOrder(null);
          return;
        }

        setOrder(nextOrder);

        if (showToast) {
          toast.success(t.loadSuccess);
        }
      } catch (error) {
        console.error("Customer order details load error:", error);
        setOrder(null);
        setErrorMessage(error instanceof Error ? error.message : t.loadError);
        toast.error(t.loadError);
      } finally {
        setIsLoading(false);
      }
    },
    [orderId, t.loadError, t.loadSuccess],
  );

  function printOrder() {
    if (!order) return;

    const html = buildPrintHtml(order, locale);
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
    void loadOrder(false);
  }, [loadOrder]);

  return (
    <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Badge variant="outline" className="mb-2 rounded-full px-3 py-1">
            <ShoppingBag className="h-3.5 w-3.5" />
            {t.title}
          </Badge>

          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {order?.orderNumber || t.title}
          </h1>

          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/customer/orders">
            <Button variant="outline" className="h-10 rounded-xl">
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              {t.back}
            </Button>
          </Link>

          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => void loadOrder(true)}
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
            onClick={printOrder}
            disabled={isLoading || !order}
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
              onClick={() => void loadOrder(true)}
            >
              <RefreshCcw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <PageSkeleton />
      ) : notFound || !order ? (
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold">{t.notFoundTitle}</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {t.notFoundText}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoBox
              title={t.orderStatus}
              value={
                <StatusBadge tone={orderTone(order.status)}>
                  {t.orderStatusMap[order.status]}
                </StatusBadge>
              }
              icon={<ClipboardList className="h-5 w-5" />}
            />

            <InfoBox
              title={t.paymentStatusLabel}
              value={
                <StatusBadge tone={paymentTone(order.paymentStatus)}>
                  {t.paymentStatusMap[order.paymentStatus]}
                </StatusBadge>
              }
              icon={<CreditCard className="h-5 w-5" />}
            />

            <InfoBox
              title={t.fulfillmentStatusLabel}
              value={
                <StatusBadge tone={fulfillmentTone(order.fulfillmentStatus)}>
                  {t.fulfillmentStatusMap[order.fulfillmentStatus]}
                </StatusBadge>
              }
              icon={<PackageCheck className="h-5 w-5" />}
            />

            <InfoBox
              title={t.total}
              value={<MoneyText value={order.totalAmount} />}
              icon={<WalletCards className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4" />
                    {t.overview}
                  </CardTitle>
                  <CardDescription>{t.overviewDesc}</CardDescription>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableBody>
                      <DetailRow label={t.orderNumber} value={order.orderNumber} />
                      <DetailRow
                        label={t.orderKind}
                        value={t.orderKindMap[order.orderKind]}
                      />
                      <DetailRow
                        label={t.createdAt}
                        value={formatDate(order.createdAt)}
                      />
                      <DetailRow
                        label={t.updatedAt}
                        value={formatDate(order.updatedAt)}
                      />
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserRound className="h-4 w-4" />
                    {t.customer}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableBody>
                      <DetailRow
                        label={t.customer}
                        value={order.customerName || t.noData}
                      />
                      <DetailRow
                        label={t.customerPhone}
                        value={<span dir="ltr">{order.customerPhone || "-"}</span>}
                      />
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </aside>

            <div className="space-y-4">
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Stethoscope className="h-4 w-4" />
                    {t.productProvider}
                  </CardTitle>
                  <CardDescription>{t.productProviderDesc}</CardDescription>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableBody>
                      <DetailRow
                        label={t.product}
                        value={order.productName || t.noData}
                      />
                      <DetailRow
                        label={t.productType}
                        value={titleCase(order.productType) || t.noData}
                      />
                      <DetailRow
                        label={t.provider}
                        value={order.providerName || t.noData}
                      />
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <WalletCards className="h-4 w-4" />
                    {t.amounts}
                  </CardTitle>
                  <CardDescription>{t.amountsDesc}</CardDescription>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableBody>
                      <DetailRow
                        label={t.unitPrice}
                        value={<MoneyText value={order.unitPrice} />}
                      />
                      <DetailRow
                        label={t.quantity}
                        value={formatNumber(order.quantity)}
                      />
                      <DetailRow
                        label={t.subtotal}
                        value={<MoneyText value={order.subtotalAmount} />}
                      />
                      <DetailRow
                        label={t.discount}
                        value={<MoneyText value={order.discountAmount} />}
                      />
                      <DetailRow
                        label={t.tax}
                        value={<MoneyText value={order.taxAmount} />}
                      />
                      <DetailRow
                        label={t.total}
                        value={<MoneyText value={order.totalAmount} />}
                      />
                      <DetailRow
                        label={t.paid}
                        value={<MoneyText value={order.paidAmount} />}
                      />
                      <DetailRow
                        label={t.remaining}
                        value={<MoneyText value={order.remainingAmount} />}
                      />
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ReceiptText className="h-4 w-4" />
                    {t.payment}
                  </CardTitle>
                  <CardDescription>{t.paymentDesc}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Table>
                    <TableBody>
                      <DetailRow
                        label={t.paymentMethod}
                        value={titleCase(order.paymentMethod) || t.noData}
                      />
                      <DetailRow
                        label={t.paymentReference}
                        value={order.paymentReference || "-"}
                      />
                      <DetailRow
                        label={t.invoiceNumber}
                        value={order.invoiceNumber || "-"}
                      />
                      <DetailRow
                        label={t.issueReference}
                        value={order.issueReference || "-"}
                      />
                    </TableBody>
                  </Table>

                  {isValidId(order.invoiceId) ? (
                    <Link href={`/customer/invoices/${order.invoiceId}`}>
                      <Button variant="outline" className="rounded-xl">
                        <FileText className="h-4 w-4" />
                        {t.viewInvoice}
                      </Button>
                    </Link>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-4 w-4" />
                    {t.timeline}
                  </CardTitle>
                  <CardDescription>{t.timelineDesc}</CardDescription>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableBody>
                      <DetailRow
                        label={t.scheduledAt}
                        value={formatDate(order.scheduledAt)}
                      />
                      <DetailRow
                        label={t.startsAt}
                        value={formatDate(order.startsAt)}
                      />
                      <DetailRow
                        label={t.endsAt}
                        value={formatDate(order.endsAt)}
                      />
                      <DetailRow
                        label={t.issuedAt}
                        value={formatDate(order.issuedAt)}
                      />
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {(order.notes || order.cancellationReason) ? (
                <Card className="rounded-2xl border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BadgeCheck className="h-4 w-4" />
                      {t.notes}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {order.notes ? (
                      <div className="rounded-2xl border bg-background p-4 text-sm leading-7">
                        <p className="mb-1 font-semibold">{t.orderNotes}</p>
                        <p className="text-muted-foreground">{order.notes}</p>
                      </div>
                    ) : null}

                    {order.cancellationReason ? (
                      <div className="rounded-2xl border bg-background p-4 text-sm leading-7">
                        <p className="mb-1 font-semibold">{t.cancellationReason}</p>
                        <p className="text-muted-foreground">
                          {order.cancellationReason}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}