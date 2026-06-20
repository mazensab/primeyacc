"use client";

/* ============================================================
   📂 app/customer/payments/[id]/page.tsx
   💳 Primey Care | Customer Payment Details Page
   ------------------------------------------------------------
   ✅ صفحة محتوى فقط داخل الشِل الموحد
   ✅ لا تنشئ سايدر أو هيدر مستقل
   ✅ تفاصيل دفعة العميل الحالي فقط
   ✅ تعتمد على /api/customers/me/ ثم /api/payments/{id}/
   ✅ حماية واجهة من عرض دفعة لا تخص العميل
   ✅ عرض فقط بدون أكشنات إدارة النظام
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
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  WalletCards,
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
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

type AppLocale = "ar" | "en";
type Dict = Record<string, unknown>;

type PaymentStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "cancelled"
  | "failed"
  | "refunded"
  | "UNKNOWN";

type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "gateway"
  | "card"
  | "wallet"
  | "tamara"
  | "tabby"
  | "UNKNOWN";

type PaymentDetails = {
  id: string;
  paymentNumber: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  provider: string;

  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;

  invoiceId: string;
  invoiceNumber: string;
  invoiceTotalAmount: number;
  invoiceRemainingAmount: number;

  orderId: string;
  orderNumber: string;
  orderTotalAmount: number;

  amount: number;
  paidAmount: number;
  currency: string;

  sourceReference: string;
  externalReference: string;
  gatewayReference: string;
  transactionId: string;
  paymentReference: string;

  paidAt: string;
  confirmedAt: string;
  cancelledAt: string;
  createdAt: string;
  updatedAt: string;

  notes: string;
  cancellationReason: string;

  isTreasuryPosted: boolean;
  isAccountingPosted: boolean;
  treasuryReference: string;
  accountingReference: string;
};

type ApiEnvelope = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  data?: unknown;
  customer?: unknown;
  payment?: unknown;
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
    "payment",
    "customer",
    "invoice",
    "order",
    "gateway",
    "amounts",
    "treasury",
    "accounting",
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

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase());
  }

  return Boolean(value);
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

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value || "").toLowerCase();

  if (status === "pending" || status === "draft" || status === "unconfirmed") {
    return "pending";
  }

  if (
    status === "confirmed" ||
    status === "paid" ||
    status === "success" ||
    status === "completed"
  ) {
    return status === "paid" ? "paid" : "confirmed";
  }

  if (status === "cancelled" || status === "canceled" || status === "void") {
    return "cancelled";
  }

  if (status === "failed" || status === "error" || status === "declined") {
    return "failed";
  }

  if (status === "refunded") return "refunded";

  return "UNKNOWN";
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  const method = String(value || "").toLowerCase();

  if (method === "cash") return "cash";
  if (method === "bank_transfer" || method === "bank" || method === "transfer") {
    return "bank_transfer";
  }
  if (method === "gateway" || method === "online" || method === "online_payment") {
    return "gateway";
  }
  if (
    method === "card" ||
    method === "cards" ||
    method === "mada" ||
    method === "visa" ||
    method === "mastercard" ||
    method === "master_card"
  ) {
    return "card";
  }
  if (method === "wallet" || method === "wallets" || method === "apple_pay" || method === "stc_pay") {
    return "wallet";
  }
  if (method === "tamara") return "tamara";
  if (method === "tabby") return "tabby";

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
    title: isArabic ? "تفاصيل الدفعة" : "Payment Details",
    subtitle: isArabic
      ? "راجع تفاصيل الدفعة والمراجع والفاتورة والطلب المرتبط."
      : "Review payment details, references, invoice, and linked order.",
    back: isArabic ? "مدفوعاتي" : "My Payments",
    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    print: isArabic ? "طباعة PDF" : "Print PDF",
    viewInvoice: isArabic ? "عرض الفاتورة" : "View Invoice",
    viewOrder: isArabic ? "عرض الطلب" : "View Order",

    overview: isArabic ? "ملخص الدفعة" : "Payment Overview",
    overviewDesc: isArabic
      ? "الحالة العامة ومعلومات الدفعة."
      : "General status and payment information.",
    customer: isArabic ? "العميل" : "Customer",
    customerDesc: isArabic ? "بيانات العميل المرتبط." : "Linked customer details.",
    invoice: isArabic ? "الفاتورة" : "Invoice",
    invoiceDesc: isArabic ? "بيانات الفاتورة المرتبطة." : "Linked invoice details.",
    order: isArabic ? "الطلب" : "Order",
    orderDesc: isArabic ? "بيانات الطلب المرتبط." : "Linked order details.",
    references: isArabic ? "المراجع" : "References",
    referencesDesc: isArabic
      ? "مراجع الدفع والبوابة والعملية."
      : "Payment, gateway, and transaction references.",
    posting: isArabic ? "الترحيل المالي" : "Financial Posting",
    postingDesc: isArabic
      ? "حالة ترحيل الدفعة في الخزينة والمحاسبة."
      : "Treasury and accounting posting status.",
    notes: isArabic ? "الملاحظات" : "Notes",

    paymentNumber: isArabic ? "رقم الدفعة" : "Payment Number",
    paymentStatus: isArabic ? "حالة الدفعة" : "Payment Status",
    paymentMethod: isArabic ? "طريقة الدفع" : "Payment Method",
    provider: isArabic ? "المزود" : "Provider",
    amount: isArabic ? "المبلغ" : "Amount",
    paidAmount: isArabic ? "المبلغ المدفوع" : "Paid Amount",
    currency: isArabic ? "العملة" : "Currency",

    customerName: isArabic ? "اسم العميل" : "Customer Name",
    customerPhone: isArabic ? "رقم العميل" : "Customer Phone",
    customerEmail: isArabic ? "بريد العميل" : "Customer Email",

    invoiceNumber: isArabic ? "رقم الفاتورة" : "Invoice Number",
    invoiceTotal: isArabic ? "إجمالي الفاتورة" : "Invoice Total",
    invoiceRemaining: isArabic ? "متبقي الفاتورة" : "Invoice Remaining",

    orderNumber: isArabic ? "رقم الطلب" : "Order Number",
    orderTotal: isArabic ? "إجمالي الطلب" : "Order Total",

    sourceReference: isArabic ? "مرجع المصدر" : "Source Reference",
    externalReference: isArabic ? "المرجع الخارجي" : "External Reference",
    gatewayReference: isArabic ? "مرجع البوابة" : "Gateway Reference",
    transactionId: isArabic ? "رقم العملية" : "Transaction ID",
    paymentReference: isArabic ? "مرجع الدفع" : "Payment Reference",

    paidAt: isArabic ? "تاريخ الدفع" : "Paid At",
    confirmedAt: isArabic ? "تاريخ التأكيد" : "Confirmed At",
    cancelledAt: isArabic ? "تاريخ الإلغاء" : "Cancelled At",
    createdAt: isArabic ? "تاريخ الإنشاء" : "Created At",
    updatedAt: isArabic ? "آخر تحديث" : "Updated At",

    treasury: isArabic ? "الخزينة" : "Treasury",
    accounting: isArabic ? "المحاسبة" : "Accounting",
    posted: isArabic ? "مرحل" : "Posted",
    notPosted: isArabic ? "غير مرحل" : "Not Posted",
    treasuryReference: isArabic ? "مرجع الخزينة" : "Treasury Reference",
    accountingReference: isArabic ? "مرجع المحاسبة" : "Accounting Reference",
    cancellationReason: isArabic ? "سبب الإلغاء" : "Cancellation Reason",

    noData: isArabic ? "غير متوفر" : "Not available",
    loading: isArabic ? "جاري تحميل تفاصيل الدفعة" : "Loading payment details",
    loadError: isArabic
      ? "تعذر تحميل تفاصيل الدفعة."
      : "Unable to load payment details.",
    loadSuccess: isArabic ? "تم تحديث تفاصيل الدفعة." : "Payment details refreshed.",
    notFoundTitle: isArabic ? "الدفعة غير متاحة" : "Payment Not Available",
    notFoundText: isArabic
      ? "لم يتم العثور على الدفعة أو أنها لا تخص حسابك."
      : "The payment was not found or does not belong to your account.",
    printSuccess: isArabic ? "تم تجهيز نافذة الطباعة." : "Print window prepared.",
    printError: isArabic ? "تعذر فتح نافذة الطباعة." : "Unable to open print window.",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",

    paymentStatusMap: {
      pending: isArabic ? "بانتظار التأكيد" : "Pending",
      confirmed: isArabic ? "مؤكدة" : "Confirmed",
      paid: isArabic ? "مدفوعة" : "Paid",
      cancelled: isArabic ? "ملغاة" : "Cancelled",
      failed: isArabic ? "فاشلة" : "Failed",
      refunded: isArabic ? "مستردة" : "Refunded",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<PaymentStatus, string>,

    paymentMethodMap: {
      cash: isArabic ? "كاش" : "Cash",
      bank_transfer: isArabic ? "تحويل بنكي" : "Bank Transfer",
      gateway: isArabic ? "بوابة دفع" : "Gateway",
      card: isArabic ? "بطاقة" : "Card",
      wallet: isArabic ? "محفظة" : "Wallet",
      tamara: isArabic ? "تمارا" : "Tamara",
      tabby: isArabic ? "تابي" : "Tabby",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<PaymentMethod, string>,
  };
}

function normalizePayment(row: unknown): PaymentDetails {
  const obj = asDict(row);
  const customer = asDict(obj.customer || obj.client);
  const invoice = asDict(obj.invoice);
  const order = asDict(obj.order);

  const id = String(
    getValue(obj, "id") ||
      getValue(obj, "payment_id") ||
      getValue(obj, "pk") ||
      "",
  );

  const amount = toNumber(
    getValue(obj, "paid_amount") ||
      getValue(obj, "amount") ||
      getValue(obj, "total_amount"),
  );

  return {
    id,
    paymentNumber: String(
      getValue(obj, "payment_number") ||
        getValue(obj, "number") ||
        getValue(obj, "reference") ||
        (id ? `PAY-${id}` : ""),
    ),
    status: normalizePaymentStatus(getValue(obj, "status")),
    paymentMethod: normalizePaymentMethod(
      getValue(obj, "payment_method") ||
        getValue(obj, "method") ||
        getValue(obj, "payment_type"),
    ),
    provider: String(
      getValue(obj, "provider") ||
        getValue(obj, "gateway_provider") ||
        getValue(obj, "payment_provider") ||
        "",
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

    invoiceId: String(getValue(obj, "invoice_id") || invoice.id || ""),
    invoiceNumber: String(
      getValue(obj, "invoice_number") ||
        invoice.invoice_number ||
        invoice.number ||
        "",
    ),
    invoiceTotalAmount: toNumber(
      getValue(obj, "invoice_total_amount") ||
        invoice.total_amount ||
        invoice.amount,
    ),
    invoiceRemainingAmount: toNumber(
      getValue(obj, "invoice_remaining_amount") ||
        getValue(obj, "invoice_remaining") ||
        invoice.remaining_amount ||
        invoice.due_amount,
    ),

    orderId: String(getValue(obj, "order_id") || order.id || ""),
    orderNumber: String(
      getValue(obj, "order_number") ||
        order.order_number ||
        order.number ||
        "",
    ),
    orderTotalAmount: toNumber(
      getValue(obj, "order_total_amount") ||
        order.total_amount ||
        order.amount,
    ),

    amount,
    paidAmount: amount,
    currency: String(getValue(obj, "currency") || "SAR"),

    sourceReference: String(getValue(obj, "source_reference") || ""),
    externalReference: String(getValue(obj, "external_reference") || ""),
    gatewayReference: String(
      getValue(obj, "gateway_reference") ||
        getValue(obj, "gateway_ref") ||
        getValue(obj, "gateway_transaction_id") ||
        "",
    ),
    transactionId: String(
      getValue(obj, "transaction_id") ||
        getValue(obj, "gateway_transaction_id") ||
        "",
    ),
    paymentReference: String(
      getValue(obj, "payment_reference") ||
        getValue(obj, "reference") ||
        "",
    ),

    paidAt: String(
      getValue(obj, "paid_at") ||
        getValue(obj, "payment_date") ||
        getValue(obj, "created_at") ||
        "",
    ),
    confirmedAt: String(getValue(obj, "confirmed_at") || ""),
    cancelledAt: String(
      getValue(obj, "cancelled_at") ||
        getValue(obj, "canceled_at") ||
        "",
    ),
    createdAt: String(getValue(obj, "created_at") || ""),
    updatedAt: String(getValue(obj, "updated_at") || ""),

    notes: String(getValue(obj, "notes") || getValue(obj, "description") || ""),
    cancellationReason: String(
      getValue(obj, "cancellation_reason") ||
        getValue(obj, "cancel_reason") ||
        "",
    ),

    isTreasuryPosted: toBool(
      getValue(obj, "is_treasury_posted") ||
        getValue(obj, "treasury_posted"),
    ),
    isAccountingPosted: toBool(
      getValue(obj, "is_accounting_posted") ||
        getValue(obj, "accounting_posted"),
    ),
    treasuryReference: String(
      getValue(obj, "treasury_reference") ||
        getValue(obj, "treasury_ref") ||
        "",
    ),
    accountingReference: String(
      getValue(obj, "accounting_reference") ||
        getValue(obj, "accounting_ref") ||
        "",
    ),
  };
}

function unwrapPayment(payload: ApiEnvelope | null): PaymentDetails {
  const data = asDict(payload?.data);

  return normalizePayment(
    payload?.payment ||
      data.payment ||
      payload?.item ||
      payload?.data ||
      {},
  );
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

function paymentBelongsToCustomer(payment: PaymentDetails, customerId: string) {
  if (!isValidId(customerId)) return true;
  if (!isValidId(payment.customerId)) return true;

  return String(payment.customerId) === String(customerId);
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

function paymentTone(status: PaymentStatus) {
  if (status === "confirmed" || status === "paid") return "success";
  if (status === "pending") return "warning";
  if (status === "failed" || status === "cancelled" || status === "refunded") {
    return "danger";
  }

  return "default";
}

function methodTone(method: PaymentMethod) {
  if (method === "cash") return "success";
  if (method === "gateway" || method === "card" || method === "wallet") return "info";
  if (method === "tamara" || method === "tabby") return "warning";

  return "default";
}

function postedTone(posted: boolean) {
  return posted ? "success" : "warning";
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

function buildPrintHtml(payment: PaymentDetails, locale: AppLocale) {
  const t = dictionary(locale);
  const printedAt = new Date().toLocaleString("en-US");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(t.title)} - ${escapeHtml(payment.paymentNumber)}</title>
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
            <strong>${escapeHtml(t.paymentNumber)}</strong>
            <div>${escapeHtml(payment.paymentNumber)}</div>
          </div>
          <div class="card">
            <strong>${escapeHtml(t.amount)}</strong>
            <div>${escapeHtml(formatMoney(payment.paidAmount))} SAR</div>
          </div>
        </div>

        <div class="card">
          <strong>${escapeHtml(t.overview)}</strong>
          <table>
            <tbody>
              <tr><td>${escapeHtml(t.paymentStatus)}</td><td>${escapeHtml(t.paymentStatusMap[payment.status])}</td></tr>
              <tr><td>${escapeHtml(t.paymentMethod)}</td><td>${escapeHtml(t.paymentMethodMap[payment.paymentMethod])}</td></tr>
              <tr><td>${escapeHtml(t.customerName)}</td><td>${escapeHtml(payment.customerName || "-")}</td></tr>
              <tr><td>${escapeHtml(t.invoiceNumber)}</td><td>${escapeHtml(payment.invoiceNumber || "-")}</td></tr>
              <tr><td>${escapeHtml(t.orderNumber)}</td><td>${escapeHtml(payment.orderNumber || "-")}</td></tr>
              <tr><td>${escapeHtml(t.externalReference)}</td><td>${escapeHtml(payment.externalReference || "-")}</td></tr>
              <tr><td>${escapeHtml(t.transactionId)}</td><td>${escapeHtml(payment.transactionId || "-")}</td></tr>
              <tr><td>${escapeHtml(t.paidAt)}</td><td>${escapeHtml(formatDate(payment.paidAt))}</td></tr>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;
}

export default function CustomerPaymentDetailsPage() {
  const params = useParams<{ id?: string }>();
  const paymentId = String(params?.id || "");

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notFound, setNotFound] = useState(false);

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";

  const loadPayment = useCallback(
    async (showToast = false) => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setNotFound(false);

        if (!isValidId(paymentId)) {
          setNotFound(true);
          setPayment(null);
          return;
        }

        const mePayload = await fetchJson("/api/customers/me/");
        const customerId = unwrapCurrentCustomerId(mePayload);

        const endpoints = [
          `/api/payments/${encodeURIComponent(paymentId)}/`,
          `/api/payments/detail/${encodeURIComponent(paymentId)}/`,
          `/api/payments/detail/?id=${encodeURIComponent(paymentId)}`,
        ];

        let paymentPayload: ApiEnvelope | null = null;
        let lastError = "";

        for (const endpoint of endpoints) {
          try {
            paymentPayload = await fetchJson(endpoint);
            break;
          } catch (error) {
            lastError = error instanceof Error ? error.message : t.loadError;
          }
        }

        if (!paymentPayload) {
          throw new Error(lastError || t.loadError);
        }

        const nextPayment = unwrapPayment(paymentPayload);

        if (!isValidId(nextPayment.id)) {
          setNotFound(true);
          setPayment(null);
          return;
        }

        if (!paymentBelongsToCustomer(nextPayment, customerId)) {
          setNotFound(true);
          setPayment(null);
          return;
        }

        setPayment(nextPayment);

        if (showToast) {
          toast.success(t.loadSuccess);
        }
      } catch (error) {
        console.error("Customer payment details load error:", error);
        setPayment(null);
        setErrorMessage(error instanceof Error ? error.message : t.loadError);
        toast.error(t.loadError);
      } finally {
        setIsLoading(false);
      }
    },
    [paymentId, t.loadError, t.loadSuccess],
  );

  function printPayment() {
    if (!payment) return;

    const html = buildPrintHtml(payment, locale);
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
    void loadPayment(false);
  }, [loadPayment]);

  return (
    <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Badge variant="outline" className="mb-2 rounded-full px-3 py-1">
            <CreditCard className="h-3.5 w-3.5" />
            {t.title}
          </Badge>

          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {payment?.paymentNumber || t.title}
          </h1>

          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/customer/payments">
            <Button variant="outline" className="h-10 rounded-xl">
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              {t.back}
            </Button>
          </Link>

          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => void loadPayment(true)}
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
            onClick={printPayment}
            disabled={isLoading || !payment}
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
              onClick={() => void loadPayment(true)}
            >
              <RefreshCcw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <PageSkeleton />
      ) : notFound || !payment ? (
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <CreditCard className="h-7 w-7 text-muted-foreground" />
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
              title={t.paymentStatus}
              value={
                <StatusBadge tone={paymentTone(payment.status)}>
                  {t.paymentStatusMap[payment.status]}
                </StatusBadge>
              }
              icon={<ShieldCheck className="h-5 w-5" />}
            />

            <InfoBox
              title={t.paymentMethod}
              value={
                <StatusBadge tone={methodTone(payment.paymentMethod)}>
                  {t.paymentMethodMap[payment.paymentMethod]}
                </StatusBadge>
              }
              icon={<CreditCard className="h-5 w-5" />}
            />

            <InfoBox
              title={t.amount}
              value={<MoneyText value={payment.paidAmount} />}
              icon={<WalletCards className="h-5 w-5" />}
            />

            <InfoBox
              title={t.provider}
              value={titleCase(payment.provider) || t.noData}
              icon={<Banknote className="h-5 w-5" />}
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
                      <DetailRow
                        label={t.paymentNumber}
                        value={payment.paymentNumber}
                      />
                      <DetailRow
                        label={t.paymentStatus}
                        value={t.paymentStatusMap[payment.status]}
                      />
                      <DetailRow
                        label={t.paymentMethod}
                        value={t.paymentMethodMap[payment.paymentMethod]}
                      />
                      <DetailRow
                        label={t.currency}
                        value={payment.currency || "SAR"}
                      />
                      <DetailRow
                        label={t.paidAt}
                        value={formatDate(payment.paidAt)}
                      />
                      <DetailRow
                        label={t.confirmedAt}
                        value={formatDate(payment.confirmedAt)}
                      />
                      <DetailRow
                        label={t.createdAt}
                        value={formatDate(payment.createdAt)}
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
                  <CardDescription>{t.customerDesc}</CardDescription>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableBody>
                      <DetailRow
                        label={t.customerName}
                        value={payment.customerName || t.noData}
                      />
                      <DetailRow
                        label={t.customerPhone}
                        value={<span dir="ltr">{payment.customerPhone || "-"}</span>}
                      />
                      <DetailRow
                        label={t.customerEmail}
                        value={payment.customerEmail || "-"}
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
                    <ReceiptText className="h-4 w-4" />
                    {t.invoice}
                  </CardTitle>
                  <CardDescription>{t.invoiceDesc}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Table>
                    <TableBody>
                      <DetailRow
                        label={t.invoiceNumber}
                        value={payment.invoiceNumber || "-"}
                      />
                      <DetailRow
                        label={t.invoiceTotal}
                        value={<MoneyText value={payment.invoiceTotalAmount} />}
                      />
                      <DetailRow
                        label={t.invoiceRemaining}
                        value={<MoneyText value={payment.invoiceRemainingAmount} />}
                      />
                    </TableBody>
                  </Table>

                  {isValidId(payment.invoiceId) ? (
                    <Link href={`/customer/invoices/${payment.invoiceId}`}>
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
                    <ShoppingBag className="h-4 w-4" />
                    {t.order}
                  </CardTitle>
                  <CardDescription>{t.orderDesc}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Table>
                    <TableBody>
                      <DetailRow
                        label={t.orderNumber}
                        value={payment.orderNumber || "-"}
                      />
                      <DetailRow
                        label={t.orderTotal}
                        value={<MoneyText value={payment.orderTotalAmount} />}
                      />
                    </TableBody>
                  </Table>

                  {isValidId(payment.orderId) ? (
                    <Link href={`/customer/orders/${payment.orderId}`}>
                      <Button variant="outline" className="rounded-xl">
                        <ShoppingBag className="h-4 w-4" />
                        {t.viewOrder}
                      </Button>
                    </Link>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4" />
                    {t.references}
                  </CardTitle>
                  <CardDescription>{t.referencesDesc}</CardDescription>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableBody>
                      <DetailRow
                        label={t.sourceReference}
                        value={payment.sourceReference || "-"}
                      />
                      <DetailRow
                        label={t.externalReference}
                        value={payment.externalReference || "-"}
                      />
                      <DetailRow
                        label={t.gatewayReference}
                        value={payment.gatewayReference || "-"}
                      />
                      <DetailRow
                        label={t.transactionId}
                        value={payment.transactionId || "-"}
                      />
                      <DetailRow
                        label={t.paymentReference}
                        value={payment.paymentReference || "-"}
                      />
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="h-4 w-4" />
                    {t.posting}
                  </CardTitle>
                  <CardDescription>{t.postingDesc}</CardDescription>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableBody>
                      <DetailRow
                        label={t.treasury}
                        value={
                          <StatusBadge tone={postedTone(payment.isTreasuryPosted)}>
                            {payment.isTreasuryPosted ? t.posted : t.notPosted}
                          </StatusBadge>
                        }
                      />
                      <DetailRow
                        label={t.treasuryReference}
                        value={payment.treasuryReference || "-"}
                      />
                      <DetailRow
                        label={t.accounting}
                        value={
                          <StatusBadge tone={postedTone(payment.isAccountingPosted)}>
                            {payment.isAccountingPosted ? t.posted : t.notPosted}
                          </StatusBadge>
                        }
                      />
                      <DetailRow
                        label={t.accountingReference}
                        value={payment.accountingReference || "-"}
                      />
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {(payment.notes || payment.cancellationReason || payment.cancelledAt) ? (
                <Card className="rounded-2xl border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">{t.notes}</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {payment.notes ? (
                      <div className="rounded-2xl border bg-background p-4 text-sm leading-7 text-muted-foreground">
                        {payment.notes}
                      </div>
                    ) : null}

                    {payment.cancellationReason ? (
                      <div className="rounded-2xl border bg-background p-4 text-sm leading-7">
                        <p className="mb-1 font-semibold">{t.cancellationReason}</p>
                        <p className="text-muted-foreground">
                          {payment.cancellationReason}
                        </p>
                      </div>
                    ) : null}

                    {payment.cancelledAt ? (
                      <div className="rounded-2xl border bg-background p-4 text-sm leading-7">
                        <p className="mb-1 font-semibold">{t.cancelledAt}</p>
                        <p className="text-muted-foreground">
                          {formatDate(payment.cancelledAt)}
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