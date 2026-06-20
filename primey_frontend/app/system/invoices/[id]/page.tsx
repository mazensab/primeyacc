"use client";

/* ============================================================
   📂 primey_frontend/app/system/invoices/[id]/page.tsx
   🧾 Primey Care — Invoice Details
   ------------------------------------------------------------
   ✅ Same approved Customers detail visual pattern
   ✅ Paid profile detail layout: side card + main workspace
   ✅ Real API only: GET /api/invoices/{id}/
   ✅ Invoice overview, items, payments, activity
   ✅ Issue / cancel actions
   ✅ Internal UI components only
   ✅ No localhost
   ✅ No fake data
   ✅ RTL/LTR via primey-locale
   ✅ English numerals + dates
   ✅ SAR icon from /currency/sar.svg
   ✅ Web print
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  ShoppingCart,
  TriangleAlert,
  User,
  WalletCards,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
type TabKey = "overview" | "items" | "payments" | "activity";

type InvoiceCustomer = {
  id: number | null;
  customer_code: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  status: string;
};

type InvoiceOrder = {
  id: number | null;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  currency_code: string;
};

type InvoiceItem = {
  id: number;
  title: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
};

type InvoicePayment = {
  id: number;
  payment_number: string;
  method: string;
  status: string;
  amount: number;
  reference: string;
  paid_at: string | null;
  created_at: string | null;
};

type InvoiceRecord = {
  id: number;
  invoice_number: string;
  number: string;
  reference: string;
  invoice_type: string;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  customer_id: number | null;
  customer_name: string;
  customer: InvoiceCustomer | null;
  order_id: number | null;
  order: InvoiceOrder | null;
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  currency: string;
  notes: string;
  internal_notes: string;
  accounting_entry_reference: string;
  is_accounting_posted: boolean;
  created_at: string | null;
  updated_at: string | null;
  items: InvoiceItem[];
  payments: InvoicePayment[];
};

type InvoiceApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  invoice?: unknown;
  item?: unknown;
  result?: unknown;
};

const SAR_ICON = "/currency/sar.svg";

const translations = {
  ar: {
    title: "تفاصيل الفاتورة",
    subtitle: "عرض بيانات الفاتورة، العميل، الطلب، البنود، المدفوعات، والترحيل.",
    back: "رجوع",
    refresh: "تحديث",
    print: "طباعة",
    copy: "نسخ الرقم",
    copied: "تم النسخ",
    issue: "إصدار الفاتورة",
    cancel: "إلغاء الفاتورة",
    actions: "الإجراءات",
    overview: "نظرة عامة",
    items: "البنود",
    payments: "المدفوعات",
    activity: "السجل",
    invoice: "الفاتورة",
    customer: "العميل",
    order: "الطلب",
    financialSummary: "الملخص المالي",
    invoiceInfo: "بيانات الفاتورة",
    customerInfo: "بيانات العميل",
    orderInfo: "بيانات الطلب",
    notes: "الملاحظات",
    internalNotes: "ملاحظات داخلية",
    noNotes: "لا توجد ملاحظات.",
    invoiceNumber: "رقم الفاتورة",
    invoiceType: "نوع الفاتورة",
    status: "الحالة",
    paymentStatus: "الدفع",
    accounting: "المحاسبة",
    issuedAt: "تاريخ الإصدار",
    dueDate: "تاريخ الاستحقاق",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    subtotal: "الإجمالي قبل الضريبة",
    discount: "الخصم",
    taxable: "الخاضع للضريبة",
    taxRate: "نسبة الضريبة",
    tax: "الضريبة",
    total: "الإجمالي",
    paid: "المدفوع",
    due: "المتبقي",
    name: "الاسم",
    phone: "الجوال",
    email: "البريد",
    customerCode: "رقم العميل",
    orderNumber: "رقم الطلب",
    orderStatus: "حالة الطلب",
    fulfillmentStatus: "التنفيذ",
    accountingPosted: "مرحلة",
    accountingPending: "غير مرحلة",
    accountingReference: "مرجع القيد",
    paidFull: "مدفوعة بالكامل",
    paidPartial: "مدفوعة جزئيًا",
    unpaid: "غير مدفوعة",
    draft: "مسودة",
    issued: "صادرة",
    paidStatus: "مدفوعة",
    partiallyPaid: "مدفوعة جزئيًا",
    cancelled: "ملغاة",
    unknown: "غير محدد",
    itemTitle: "البند",
    description: "الوصف",
    quantity: "الكمية",
    unitPrice: "سعر الوحدة",
    itemSubtotal: "الإجمالي",
    itemDiscount: "الخصم",
    itemTax: "الضريبة",
    itemTotal: "الصافي",
    paymentNumber: "رقم الدفعة",
    paymentMethod: "الطريقة",
    paymentReference: "المرجع",
    amount: "المبلغ",
    paidAt: "تاريخ الدفع",
    noItemsTitle: "لا توجد بنود",
    noItemsDesc: "لم يتم إرجاع بنود لهذه الفاتورة.",
    noPaymentsTitle: "لا توجد مدفوعات",
    noPaymentsDesc: "لم يتم تسجيل مدفوعات على هذه الفاتورة.",
    activityCreated: "تم إنشاء الفاتورة",
    activityUpdated: "تم تحديث الفاتورة",
    activityIssued: "تم إصدار الفاتورة",
    activityAccounting: "حالة الترحيل المحاسبي",
    notFoundTitle: "الفاتورة غير موجودة",
    notFoundDesc: "تعذر العثور على الفاتورة المطلوبة.",
    errorTitle: "تعذر تحميل تفاصيل الفاتورة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    confirmIssue: "هل تريد إصدار هذه الفاتورة؟",
    confirmCancel: "هل تريد إلغاء هذه الفاتورة؟",
    issueSuccess: "تم إصدار الفاتورة بنجاح.",
    cancelSuccess: "تم إلغاء الفاتورة بنجاح.",
    operationFailed: "تعذر تنفيذ العملية.",
    printTitle: "تفاصيل الفاتورة",
    generatedAt: "تاريخ الطباعة",
    openCustomer: "فتح العميل",
    openOrder: "فتح الطلب",
    overdue: "متأخرة",
  },
  en: {
    title: "Invoice Details",
    subtitle: "View invoice data, customer, order, items, payments, and posting.",
    back: "Back",
    refresh: "Refresh",
    print: "Print",
    copy: "Copy number",
    copied: "Copied",
    issue: "Issue invoice",
    cancel: "Cancel invoice",
    actions: "Actions",
    overview: "Overview",
    items: "Items",
    payments: "Payments",
    activity: "Activity",
    invoice: "Invoice",
    customer: "Customer",
    order: "Order",
    financialSummary: "Financial summary",
    invoiceInfo: "Invoice info",
    customerInfo: "Customer info",
    orderInfo: "Order info",
    notes: "Notes",
    internalNotes: "Internal notes",
    noNotes: "No notes.",
    invoiceNumber: "Invoice number",
    invoiceType: "Invoice type",
    status: "Status",
    paymentStatus: "Payment",
    accounting: "Accounting",
    issuedAt: "Issue date",
    dueDate: "Due date",
    createdAt: "Created at",
    updatedAt: "Updated at",
    subtotal: "Subtotal",
    discount: "Discount",
    taxable: "Taxable",
    taxRate: "Tax rate",
    tax: "Tax",
    total: "Total",
    paid: "Paid",
    due: "Due",
    name: "Name",
    phone: "Phone",
    email: "Email",
    customerCode: "Customer code",
    orderNumber: "Order number",
    orderStatus: "Order status",
    fulfillmentStatus: "Fulfillment",
    accountingPosted: "Posted",
    accountingPending: "Pending",
    accountingReference: "Entry reference",
    paidFull: "Paid",
    paidPartial: "Partially paid",
    unpaid: "Unpaid",
    draft: "Draft",
    issued: "Issued",
    paidStatus: "Paid",
    partiallyPaid: "Partially paid",
    cancelled: "Cancelled",
    unknown: "Unknown",
    itemTitle: "Item",
    description: "Description",
    quantity: "Qty",
    unitPrice: "Unit price",
    itemSubtotal: "Subtotal",
    itemDiscount: "Discount",
    itemTax: "Tax",
    itemTotal: "Total",
    paymentNumber: "Payment number",
    paymentMethod: "Method",
    paymentReference: "Reference",
    amount: "Amount",
    paidAt: "Paid at",
    noItemsTitle: "No items",
    noItemsDesc: "No items were returned for this invoice.",
    noPaymentsTitle: "No payments",
    noPaymentsDesc: "No payments were recorded for this invoice.",
    activityCreated: "Invoice created",
    activityUpdated: "Invoice updated",
    activityIssued: "Invoice issued",
    activityAccounting: "Accounting posting status",
    notFoundTitle: "Invoice not found",
    notFoundDesc: "The requested invoice could not be found.",
    errorTitle: "Unable to load invoice details",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    confirmIssue: "Do you want to issue this invoice?",
    confirmCancel: "Do you want to cancel this invoice?",
    issueSuccess: "Invoice issued successfully.",
    cancelSuccess: "Invoice cancelled successfully.",
    operationFailed: "Unable to complete operation.",
    printTitle: "Invoice details",
    generatedAt: "Generated at",
    openCustomer: "Open customer",
    openOrder: "Open order",
    overdue: "Overdue",
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
  const cleaned = String(value).trim();
  return cleaned || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    return ["1", "true", "yes", "on", "posted"].includes(value.toLowerCase());
  }

  return false;
}

function formatInteger(value: unknown) {
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }

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

function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          ""
        ).replace(/\/+$/, "")
      : "";

  if (envBase.endsWith("/api")) {
    return envBase.slice(0, -4);
  }

  return envBase;
}

function makeApiUrl(path: string) {
  const base = getApiBaseUrl();
  return `${base}${path}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

async function fetchJson<T>(
  url: string,
  options?: {
    signal?: AbortSignal;
    method?: "GET" | "POST";
    body?: unknown;
  },
): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    method: options?.method || "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal: options?.signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options?.method === "POST" ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method === "POST"
        ? JSON.stringify(options.body || {})
        : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let payload: any = null;

  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.detail ||
      payload?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

function extractInvoicePayload(payload: InvoiceApiResponse): unknown {
  if (payload.data) {
    const data = asRecord(payload.data);

    if (data.invoice) return data.invoice;
    if (data.item) return data.item;
    if (data.result) return data.result;
    if (data.id || data.invoice_number) return data;
  }

  if (payload.invoice) return payload.invoice;
  if (payload.item) return payload.item;
  if (payload.result) return payload.result;

  return payload;
}

function normalizeCustomer(value: unknown): InvoiceCustomer | null {
  const item = asRecord(value);

  if (!Object.keys(item).length) return null;

  return {
    id: item.id === null || item.id === undefined ? null : toNumber(item.id),
    customer_code: normalizeText(item.customer_code),
    name: normalizeText(item.name || item.display_name || item.full_name),
    phone: normalizeText(item.phone || item.phone_number || item.mobile),
    whatsapp: normalizeText(item.whatsapp || item.whatsapp_number),
    email: normalizeText(item.email),
    status: normalizeText(item.status),
  };
}

function normalizeOrder(value: unknown): InvoiceOrder | null {
  const item = asRecord(value);

  if (!Object.keys(item).length) return null;

  return {
    id: item.id === null || item.id === undefined ? null : toNumber(item.id),
    order_number: normalizeText(item.order_number || item.number || item.code),
    status: normalizeText(item.status),
    payment_status: normalizeText(item.payment_status),
    fulfillment_status: normalizeText(item.fulfillment_status),
    total_amount: toNumber(item.total_amount),
    amount_paid: toNumber(item.amount_paid),
    remaining_amount: toNumber(item.remaining_amount),
    currency_code: normalizeText(item.currency_code, "SAR"),
  };
}

function normalizeItem(value: unknown): InvoiceItem {
  const item = asRecord(value);

  const title = normalizeText(
    item.title ||
      item.name ||
      item.product_name ||
      item.service_name ||
      item.description ||
      `#${normalizeText(item.id)}`,
  );

  return {
    id: toNumber(item.id),
    title,
    description: normalizeText(item.description || item.notes),
    quantity: toNumber(item.quantity, 1),
    unit_price: toNumber(item.unit_price || item.price),
    subtotal: toNumber(item.subtotal),
    discount_amount: toNumber(item.discount_amount),
    tax_amount: toNumber(item.tax_amount),
    total_amount: toNumber(item.total_amount || item.amount),
  };
}

function normalizePayment(value: unknown): InvoicePayment {
  const item = asRecord(value);

  return {
    id: toNumber(item.id),
    payment_number: normalizeText(
      item.payment_number || item.number || item.reference || `PAY-${normalizeText(item.id)}`,
    ),
    method: normalizeText(item.method || item.payment_method),
    status: normalizeText(item.status),
    amount: toNumber(item.amount || item.paid_amount || item.total_amount),
    reference: normalizeText(item.reference || item.transaction_reference || item.gateway_reference),
    paid_at: normalizeText(item.paid_at || item.confirmed_at || item.payment_date) || null,
    created_at: normalizeText(item.created_at) || null,
  };
}

function normalizeInvoice(value: unknown): InvoiceRecord {
  const item = asRecord(value);
  const customer = normalizeCustomer(item.customer);
  const order = normalizeOrder(item.order);
  const invoiceNumber = normalizeText(
    item.invoice_number || item.number || item.reference || `INV-${normalizeText(item.id)}`,
  );

  const itemCandidates = [
    item.items,
    item.invoice_items,
    item.lines,
    item.invoice_lines,
  ];

  const paymentCandidates = [
    item.payments,
    item.invoice_payments,
    item.payment_items,
  ];

  const rawItems = itemCandidates.find(Array.isArray) || [];
  const rawPayments = paymentCandidates.find(Array.isArray) || [];

  return {
    id: toNumber(item.id),
    invoice_number: invoiceNumber,
    number: invoiceNumber,
    reference: invoiceNumber,
    invoice_type: normalizeText(item.invoice_type).toLowerCase(),
    status: normalizeText(item.status).toLowerCase(),
    issue_date: normalizeText(item.issue_date) || null,
    due_date: normalizeText(item.due_date) || null,
    customer_id:
      item.customer_id === null || item.customer_id === undefined
        ? customer?.id ?? null
        : toNumber(item.customer_id),
    customer_name: normalizeText(item.customer_name || customer?.name),
    customer,
    order_id:
      item.order_id === null || item.order_id === undefined
        ? order?.id ?? null
        : toNumber(item.order_id),
    order,
    subtotal: toNumber(item.subtotal),
    discount_amount: toNumber(item.discount_amount),
    taxable_amount: toNumber(item.taxable_amount),
    tax_rate: toNumber(item.tax_rate),
    tax_amount: toNumber(item.tax_amount),
    total_amount: toNumber(item.total_amount),
    paid_amount: toNumber(item.paid_amount),
    due_amount: toNumber(item.due_amount),
    currency: normalizeText(item.currency, "SAR"),
    notes: normalizeText(item.notes),
    internal_notes: normalizeText(item.internal_notes),
    accounting_entry_reference: normalizeText(item.accounting_entry_reference),
    is_accounting_posted: toBoolean(item.is_accounting_posted),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
    items: asArray(rawItems).map(normalizeItem),
    payments: asArray(rawPayments).map(normalizePayment),
  };
}

function getStatusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(status).toLowerCase();

  if (normalized === "draft") return t.draft;
  if (normalized === "issued") return t.issued;
  if (normalized === "paid") return t.paidStatus;
  if (normalized === "partially_paid" || normalized === "partial") return t.partiallyPaid;
  if (normalized === "cancelled" || normalized === "canceled") return t.cancelled;

  return normalized || t.unknown;
}

function getStatusClass(status: string) {
  const normalized = normalizeText(status).toLowerCase();

  if (normalized === "paid") return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  if (normalized === "issued") return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  if (normalized === "partially_paid" || normalized === "partial") return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  if (normalized === "cancelled" || normalized === "canceled") return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function getPaymentLabel(invoice: InvoiceRecord, locale: Locale) {
  const t = translations[locale];

  if (invoice.due_amount <= 0) return t.paidFull;
  if (invoice.paid_amount > 0) return t.paidPartial;
  return t.unpaid;
}

function getPaymentClass(invoice: InvoiceRecord) {
  if (invoice.due_amount <= 0) return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  if (invoice.paid_amount > 0) return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";

  return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
}

function canIssueInvoice(invoice: InvoiceRecord) {
  const status = normalizeText(invoice.status).toLowerCase();
  return Boolean(invoice.id) && !["issued", "paid", "cancelled", "canceled"].includes(status);
}

function canCancelInvoice(invoice: InvoiceRecord) {
  const status = normalizeText(invoice.status).toLowerCase();
  return Boolean(invoice.id) && !["paid", "cancelled", "canceled"].includes(status);
}

function isInvoiceOverdue(invoice: InvoiceRecord) {
  if (!invoice.due_date || invoice.due_amount <= 0) return false;

  const dueDate = new Date(invoice.due_date);
  if (Number.isNaN(dueDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function SarIcon({ className }: { className?: string }) {
  return (
    <Image
      src={SAR_ICON}
      alt="SAR"
      width={14}
      height={14}
      className={cn("inline-block h-3.5 w-3.5 object-contain", className)}
      unoptimized
    />
  );
}

function MoneyValue({ value }: { value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums text-foreground">
      <span>{formatMoney(value)}</span>
      <SarIcon />
    </span>
  );
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full rounded-full px-2.5 py-1 text-xs font-medium",
        getStatusClass(status),
      )}
    >
      <span className="truncate">{getStatusLabel(status, locale)}</span>
    </Badge>
  );
}

function PaymentBadge({ invoice, locale }: { invoice: InvoiceRecord; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full rounded-full px-2.5 py-1 text-xs font-medium",
        getPaymentClass(invoice),
      )}
    >
      <span className="truncate">{getPaymentLabel(invoice, locale)}</span>
    </Badge>
  );
}

function AccountingBadge({
  posted,
  locale,
}: {
  posted: boolean;
  locale: Locale;
}) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full rounded-full px-2.5 py-1 text-xs font-medium",
        posted
          ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          : "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50",
      )}
    >
      <span className="truncate">{posted ? t.accountingPosted : t.accountingPending}</span>
    </Badge>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-left text-sm font-medium text-foreground">
        {children || value || "—"}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[104px] px-6 py-5">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>
        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground">
          {value}
        </CardTitle>
        <CardAction>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="rounded-lg border bg-card shadow-none">
                <CardHeader className="min-h-[104px] px-6 py-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-28" />
                </CardHeader>
              </Card>
            ))}
          </div>
          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SystemInvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const invoiceId = normalizeText(params?.id);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [invoice, setInvoice] = React.useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<"issue" | "cancel" | null>(null);
  const [error, setError] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const backIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  React.useEffect(() => {
    const applyLocale = () => {
      setLocale(getInitialLocale());
    };

    applyLocale();

    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  const loadInvoice = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!invoiceId) {
        setLoading(false);
        setError(t.notFoundDesc);
        return;
      }

      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const payload = await fetchJson<InvoiceApiResponse>(
          makeApiUrl(`/api/invoices/${invoiceId}/`),
          { signal: controller.signal },
        );

        const nextInvoice = normalizeInvoice(extractInvoicePayload(payload));
        setInvoice(nextInvoice.id ? nextInvoice : null);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setInvoice(null);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [invoiceId, t.errorDesc, t.notFoundDesc],
  );

  React.useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  async function copyInvoiceNumber() {
    if (!invoice) return;

    try {
      await navigator.clipboard.writeText(invoice.invoice_number);
      toast.success(t.copied);
    } catch {
      toast.error(t.operationFailed);
    }
  }

  async function postInvoiceAction(action: "issue" | "cancel") {
    if (!invoice) return;

    const confirmed = window.confirm(action === "issue" ? t.confirmIssue : t.confirmCancel);
    if (!confirmed) return;

    setActionLoading(action);

    try {
      await fetchJson<unknown>(makeApiUrl(`/api/invoices/${invoice.id}/${action}/`), {
        method: "POST",
        body: action === "issue" ? { auto_post_accounting: true } : { reason: "" },
      });

      toast.success(action === "issue" ? t.issueSuccess : t.cancelSuccess);
      await loadInvoice({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;

      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  }

  function printPage() {
    if (!invoice) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.operationFailed);
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)} - ${escapeHtml(invoice.invoice_number)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 28px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            h1 { margin: 0; font-size: 22px; }
            h2 { margin: 18px 0 8px; font-size: 16px; }
            p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 10px;
              margin-bottom: 18px;
            }
            .box {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 10px;
            }
            .box span {
              display: block;
              color: #6b7280;
              font-size: 11px;
              margin-bottom: 4px;
            }
            .box strong {
              font-size: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px;
              text-align: ${locale === "ar" ? "right" : "left"};
              vertical-align: top;
            }
            th {
              background: #f9fafb;
              color: #374151;
              font-weight: 700;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
              margin-bottom: 16px;
            }
            .num { direction: ltr; unicode-bidi: embed; white-space: nowrap; }
            @media print {
              body { padding: 16px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Primey Care - ${escapeHtml(t.printTitle)}</h1>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.invoiceNumber)}: <strong>${escapeHtml(invoice.invoice_number)}</strong></p>
              <p>${escapeHtml(t.status)}: ${escapeHtml(getStatusLabel(invoice.status, locale))}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.total)}</span><strong class="num">${escapeHtml(formatMoney(invoice.total_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.paid)}</span><strong class="num">${escapeHtml(formatMoney(invoice.paid_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.due)}</span><strong class="num">${escapeHtml(formatMoney(invoice.due_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.tax)}</span><strong class="num">${escapeHtml(formatMoney(invoice.tax_amount))}</strong></div>
          </div>

          <div class="grid">
            <div class="box"><span>${escapeHtml(t.customer)}</span><strong>${escapeHtml(invoice.customer_name || invoice.customer?.name || "—")}</strong></div>
            <div class="box"><span>${escapeHtml(t.order)}</span><strong>${escapeHtml(invoice.order?.order_number || "—")}</strong></div>
            <div class="box"><span>${escapeHtml(t.issuedAt)}</span><strong>${escapeHtml(formatDate(invoice.issue_date))}</strong></div>
            <div class="box"><span>${escapeHtml(t.dueDate)}</span><strong>${escapeHtml(formatDate(invoice.due_date))}</strong></div>
          </div>

          <h2>${escapeHtml(t.items)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.itemTitle)}</th>
                <th>${escapeHtml(t.quantity)}</th>
                <th>${escapeHtml(t.unitPrice)}</th>
                <th>${escapeHtml(t.itemDiscount)}</th>
                <th>${escapeHtml(t.itemTax)}</th>
                <th>${escapeHtml(t.itemTotal)}</th>
              </tr>
            </thead>
            <tbody>
              ${
                invoice.items.length
                  ? invoice.items
                      .map(
                        (item) => `
                          <tr>
                            <td>${escapeHtml(item.title)}</td>
                            <td class="num">${escapeHtml(item.quantity)}</td>
                            <td class="num">${escapeHtml(formatMoney(item.unit_price))}</td>
                            <td class="num">${escapeHtml(formatMoney(item.discount_amount))}</td>
                            <td class="num">${escapeHtml(formatMoney(item.tax_amount))}</td>
                            <td class="num">${escapeHtml(formatMoney(item.total_amount))}</td>
                          </tr>
                        `,
                      )
                      .join("")
                  : `<tr><td colspan="6">${escapeHtml(t.noItemsDesc)}</td></tr>`
              }
            </tbody>
          </table>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  if (loading) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 text-right">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            {React.createElement(backIcon, { className: "h-4 w-4" })}
            {t.back}
          </Button>
        </div>

        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-red-200 bg-white">
              <TriangleAlert className="h-6 w-6 text-red-600" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-red-900">
                {error ? t.errorTitle : t.notFoundTitle}
              </p>
              <p className="text-sm text-red-700">
                {error || t.notFoundDesc}
              </p>
            </div>

            <Button variant="outline" className="h-9 rounded-lg bg-white" onClick={() => void loadInvoice()}>
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overdue = isInvoiceOverdue(invoice);

  const tabs: Array<{
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "overview", label: t.overview, icon: Eye },
    { key: "items", label: t.items, icon: PackageCheck },
    { key: "payments", label: t.payments, icon: WalletCards },
    { key: "activity", label: t.activity, icon: FileText },
  ];

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-right">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            {React.createElement(backIcon, { className: "h-4 w-4" })}
            {t.back}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadInvoice({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90">
                <MoreHorizontal className="h-4 w-4" />
                {t.actions}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
              <DropdownMenuItem onClick={() => void copyInvoiceNumber()}>
                <Copy className="h-4 w-4" />
                {t.copy}
              </DropdownMenuItem>

              {canIssueInvoice(invoice) ? (
                <DropdownMenuItem
                  disabled={actionLoading === "issue"}
                  onClick={() => void postInvoiceAction("issue")}
                >
                  {actionLoading === "issue" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {t.issue}
                </DropdownMenuItem>
              ) : null}

              {canCancelInvoice(invoice) ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={actionLoading === "cancel"}
                    className="text-red-600 focus:text-red-600"
                    onClick={() => void postInvoiceAction("cancel")}
                  >
                    {actionLoading === "cancel" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {t.cancel}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-4 px-6 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
              <ReceiptText className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate text-xl font-bold">
                {invoice.invoice_number}
              </CardTitle>
              <CardDescription className="truncate">
                {invoice.customer_name || invoice.customer?.name || t.customer}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={invoice.status} locale={locale} />
              <PaymentBadge invoice={invoice} locale={locale} />
              {overdue ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-red-500/30 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  {t.overdue}
                </Badge>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-2 px-6 pb-6">
            <InfoRow label={t.total}>
              <MoneyValue value={invoice.total_amount} />
            </InfoRow>
            <InfoRow label={t.paid}>
              <MoneyValue value={invoice.paid_amount} />
            </InfoRow>
            <InfoRow label={t.due}>
              <MoneyValue value={invoice.due_amount} />
            </InfoRow>
            <InfoRow label={t.issuedAt} value={formatDate(invoice.issue_date)} />
            <InfoRow label={t.dueDate} value={formatDate(invoice.due_date)} />
            <InfoRow label={t.accounting}>
              <AccountingBadge posted={invoice.is_accounting_posted} locale={locale} />
            </InfoRow>

            <div className="grid gap-2 pt-3">
              {invoice.customer_id ? (
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href={`/system/customers/${invoice.customer_id}`}>
                    <User className="h-4 w-4" />
                    {t.openCustomer}
                  </Link>
                </Button>
              ) : null}

              {invoice.order_id ? (
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href={`/system/orders/${invoice.order_id}`}>
                    <ShoppingCart className="h-4 w-4" />
                    {t.openOrder}
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title={t.total} value={<MoneyValue value={invoice.total_amount} />} icon={Banknote} />
            <MetricCard title={t.paid} value={<MoneyValue value={invoice.paid_amount} />} icon={CheckCircle2} />
            <MetricCard title={t.due} value={<MoneyValue value={invoice.due_amount} />} icon={WalletCards} />
            <MetricCard title={t.tax} value={<MoneyValue value={invoice.tax_amount} />} icon={ReceiptText} />
          </div>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.key;

                  return (
                    <Button
                      key={tab.key}
                      type="button"
                      variant={active ? "default" : "outline"}
                      className={cn(
                        "h-9 rounded-lg",
                        active ? "bg-black text-white hover:bg-black/90" : "bg-background",
                      )}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </Button>
                  );
                })}
              </div>

              {activeTab === "overview" ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="rounded-lg border bg-background shadow-none">
                    <CardHeader className="px-5 py-4">
                      <CardTitle className="text-base">{t.invoiceInfo}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                      <InfoRow label={t.invoiceNumber} value={invoice.invoice_number} />
                      <InfoRow label={t.invoiceType} value={invoice.invoice_type || "—"} />
                      <InfoRow label={t.status}>
                        <StatusBadge status={invoice.status} locale={locale} />
                      </InfoRow>
                      <InfoRow label={t.paymentStatus}>
                        <PaymentBadge invoice={invoice} locale={locale} />
                      </InfoRow>
                      <InfoRow label={t.issuedAt} value={formatDate(invoice.issue_date)} />
                      <InfoRow label={t.dueDate} value={formatDate(invoice.due_date)} />
                      <InfoRow label={t.createdAt} value={formatDate(invoice.created_at)} />
                      <InfoRow label={t.updatedAt} value={formatDate(invoice.updated_at)} />
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg border bg-background shadow-none">
                    <CardHeader className="px-5 py-4">
                      <CardTitle className="text-base">{t.financialSummary}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                      <InfoRow label={t.subtotal}>
                        <MoneyValue value={invoice.subtotal} />
                      </InfoRow>
                      <InfoRow label={t.discount}>
                        <MoneyValue value={invoice.discount_amount} />
                      </InfoRow>
                      <InfoRow label={t.taxable}>
                        <MoneyValue value={invoice.taxable_amount} />
                      </InfoRow>
                      <InfoRow label={t.taxRate} value={`${formatMoney(invoice.tax_rate)}%`} />
                      <InfoRow label={t.tax}>
                        <MoneyValue value={invoice.tax_amount} />
                      </InfoRow>
                      <InfoRow label={t.total}>
                        <MoneyValue value={invoice.total_amount} />
                      </InfoRow>
                      <InfoRow label={t.paid}>
                        <MoneyValue value={invoice.paid_amount} />
                      </InfoRow>
                      <InfoRow label={t.due}>
                        <MoneyValue value={invoice.due_amount} />
                      </InfoRow>
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg border bg-background shadow-none">
                    <CardHeader className="px-5 py-4">
                      <CardTitle className="text-base">{t.customerInfo}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                      <InfoRow label={t.name} value={invoice.customer_name || invoice.customer?.name || "—"} />
                      <InfoRow label={t.customerCode} value={invoice.customer?.customer_code || "—"} />
                      <InfoRow label={t.phone} value={invoice.customer?.phone || invoice.customer?.whatsapp || "—"} />
                      <InfoRow label={t.email} value={invoice.customer?.email || "—"} />
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg border bg-background shadow-none">
                    <CardHeader className="px-5 py-4">
                      <CardTitle className="text-base">{t.orderInfo}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5">
                      <InfoRow label={t.orderNumber} value={invoice.order?.order_number || "—"} />
                      <InfoRow label={t.orderStatus} value={invoice.order?.status || "—"} />
                      <InfoRow label={t.fulfillmentStatus} value={invoice.order?.fulfillment_status || "—"} />
                      <InfoRow label={t.accounting}>
                        <AccountingBadge posted={invoice.is_accounting_posted} locale={locale} />
                      </InfoRow>
                      <InfoRow label={t.accountingReference} value={invoice.accounting_entry_reference || "—"} />
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg border bg-background shadow-none xl:col-span-2">
                    <CardHeader className="px-5 py-4">
                      <CardTitle className="text-base">{t.notes}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 px-5 pb-5 md:grid-cols-2">
                      <div className="rounded-lg border bg-card p-4">
                        <p className="mb-2 text-sm font-medium">{t.notes}</p>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {invoice.notes || t.noNotes}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-card p-4">
                        <p className="mb-2 text-sm font-medium">{t.internalNotes}</p>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {invoice.internal_notes || t.noNotes}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {activeTab === "items" ? (
                <div className="overflow-hidden rounded-lg border bg-background">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[900px] table-fixed">
                      <TableHeader>
                        <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                          <TableHead className="w-[260px] px-4 text-right">{t.itemTitle}</TableHead>
                          <TableHead className="w-[220px] px-4 text-right">{t.description}</TableHead>
                          <TableHead className="w-[90px] px-4 text-right">{t.quantity}</TableHead>
                          <TableHead className="w-[120px] px-4 text-right">{t.unitPrice}</TableHead>
                          <TableHead className="w-[120px] px-4 text-right">{t.itemDiscount}</TableHead>
                          <TableHead className="w-[120px] px-4 text-right">{t.itemTax}</TableHead>
                          <TableHead className="w-[120px] px-4 text-right">{t.itemTotal}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.items.length ? (
                          invoice.items.map((item) => (
                            <TableRow key={item.id || item.title} className="h-[62px]">
                              <TableCell className="px-4 text-right">
                                <p className="truncate font-medium">{item.title}</p>
                              </TableCell>
                              <TableCell className="px-4 text-right">
                                <p className="truncate text-sm text-muted-foreground">
                                  {item.description || "—"}
                                </p>
                              </TableCell>
                              <TableCell className="px-4 text-right tabular-nums">
                                {formatInteger(item.quantity)}
                              </TableCell>
                              <TableCell className="px-4 text-right">
                                <MoneyValue value={item.unit_price} />
                              </TableCell>
                              <TableCell className="px-4 text-right">
                                <MoneyValue value={item.discount_amount} />
                              </TableCell>
                              <TableCell className="px-4 text-right">
                                <MoneyValue value={item.tax_amount} />
                              </TableCell>
                              <TableCell className="px-4 text-right">
                                <MoneyValue value={item.total_amount} />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="h-56">
                              <div className="flex flex-col items-center justify-center gap-2 text-center">
                                <PackageCheck className="h-8 w-8 text-muted-foreground" />
                                <p className="font-semibold">{t.noItemsTitle}</p>
                                <p className="text-sm text-muted-foreground">{t.noItemsDesc}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}

              {activeTab === "payments" ? (
                <div className="overflow-hidden rounded-lg border bg-background">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[760px] table-fixed">
                      <TableHeader>
                        <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                          <TableHead className="w-[180px] px-4 text-right">{t.paymentNumber}</TableHead>
                          <TableHead className="w-[130px] px-4 text-right">{t.paymentMethod}</TableHead>
                          <TableHead className="w-[120px] px-4 text-right">{t.status}</TableHead>
                          <TableHead className="w-[130px] px-4 text-right">{t.amount}</TableHead>
                          <TableHead className="w-[160px] px-4 text-right">{t.paymentReference}</TableHead>
                          <TableHead className="w-[130px] px-4 text-right">{t.paidAt}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.payments.length ? (
                          invoice.payments.map((payment) => (
                            <TableRow key={payment.id || payment.payment_number} className="h-[62px]">
                              <TableCell className="px-4 text-right font-medium">
                                {payment.payment_number}
                              </TableCell>
                              <TableCell className="px-4 text-right">
                                {payment.method || "—"}
                              </TableCell>
                              <TableCell className="px-4 text-right">
                                <Badge variant="outline" className="rounded-full bg-muted/40">
                                  {payment.status || "—"}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 text-right">
                                <MoneyValue value={payment.amount} />
                              </TableCell>
                              <TableCell className="px-4 text-right">
                                <p className="truncate text-sm text-muted-foreground">
                                  {payment.reference || "—"}
                                </p>
                              </TableCell>
                              <TableCell className="px-4 text-right tabular-nums text-muted-foreground">
                                {formatDate(payment.paid_at || payment.created_at)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="h-56">
                              <div className="flex flex-col items-center justify-center gap-2 text-center">
                                <WalletCards className="h-8 w-8 text-muted-foreground" />
                                <p className="font-semibold">{t.noPaymentsTitle}</p>
                                <p className="text-sm text-muted-foreground">{t.noPaymentsDesc}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}

              {activeTab === "activity" ? (
                <div className="grid gap-3">
                  {[
                    {
                      label: t.activityCreated,
                      value: formatDate(invoice.created_at),
                      icon: ReceiptText,
                    },
                    {
                      label: t.activityIssued,
                      value: formatDate(invoice.issue_date),
                      icon: Send,
                    },
                    {
                      label: t.activityAccounting,
                      value: invoice.is_accounting_posted ? t.accountingPosted : t.accountingPending,
                      icon: ShieldCheck,
                    },
                    {
                      label: t.activityUpdated,
                      value: formatDate(invoice.updated_at),
                      icon: RotateCcw,
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="font-medium">{item.label}</p>
                        </div>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}