"use client";

/* ============================================================
   📂 primey_frontend/app/system/payments/[id]/page.tsx
   💳 Primey Care — Payment Details
   ------------------------------------------------------------
   ✅ Same approved Customers / Invoices detail visual pattern
   ✅ Side profile card + main details workspace
   ✅ Real API only: GET /api/payments/{id}/
   ✅ Confirm: POST /api/payments/{id}/confirm/
   ✅ Cancel: POST /api/payments/{id}/cancel/
   ✅ Customer / invoice / order / gateway / treasury / accounting
   ✅ Internal UI components only
   ✅ No localhost
   ✅ No fake data
   ✅ SAR icon from /currency/sar.svg
   ✅ Web print
   ✅ sonner toast
   ✅ RTL/LTR via primey-locale
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
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type PaymentCustomer = {
  id: number | null;
  customer_code: string;
  name: string;
  display_name: string;
  full_name: string;
  phone: string;
  phone_number: string;
  whatsapp: string;
  whatsapp_number: string;
  primary_contact_number: string;
  email: string;
  status: string;
  normalized_phone: string;
  user_id: number | null;
  user_username: string;
  has_customer_account: boolean;
  is_phone_verified: boolean;
  is_whatsapp_verified: boolean;
  phone_verified_at: string | null;
  whatsapp_verified_at: string | null;
  last_login_at: string | null;
};

type PaymentInvoice = {
  id: number | null;
  label: string;
  invoice_number: string;
  status: string;
  invoice_type: string;
  issue_date: string | null;
  due_date: string | null;
  order_id: number | null;
  customer_id: number | null;
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  currency: string;
  accounting_entry_reference: string;
  is_accounting_posted: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type PaymentOrder = {
  id: number | null;
  label: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  source: string;
  product_name: string;
  product_type: string;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  currency_code: string;
  customer_id: number | null;
  product_id: number | null;
  provider_id: number | null;
  contract_id: number | null;
  agent_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type PaymentRecord = {
  id: number;
  payment_number: string;
  reference: string;
  status: string;
  payment_method: string;
  provider: string;
  currency: string;

  amount: number;
  paid_amount: number;
  refunded_amount: number;
  remaining_amount: number;
  net_collected_amount: number;

  invoice_id: number | null;
  invoice: PaymentInvoice | null;

  order_id: number | null;
  order: PaymentOrder | null;

  customer_id: number | null;
  customer: PaymentCustomer | null;
  customer_name: string;

  external_reference: string;
  transaction_id: string;
  gateway_response_code: string;
  gateway_message: string;
  failure_reason: string;

  treasury_movement_reference: string;
  accounting_entry_reference: string;
  is_treasury_posted: boolean;
  is_accounting_posted: boolean;

  timeline: {
    initiated_at: string | null;
    paid_at: string | null;
    refunded_at: string | null;
    cancelled_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  initiated_at: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  updated_at: string | null;

  notes: string;
  financial_flow: {
    gateway_completed: boolean;
    accounting_posted: boolean;
    treasury_posted: boolean;
    accounting_reference: string;
    treasury_reference: string;
  };
};

type PaymentApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  payment?: unknown;
  customer?: unknown;
  order?: unknown;
  invoice?: unknown;
  financial_flow?: unknown;
};

const SAR_ICON = "/currency/sar.svg";

const translations = {
  ar: {
    title: "تفاصيل الدفعة",
    subtitle: "عرض الدفعة والعميل والفاتورة والطلب وحالة الخزينة والمحاسبة.",
    back: "رجوع",
    refresh: "تحديث",
    print: "طباعة",
    actions: "الإجراءات",
    copy: "نسخ الرقم",
    copied: "تم النسخ",
    confirm: "تأكيد الدفعة",
    cancel: "إلغاء الدفعة",
    overview: "نظرة عامة",
    gateway: "البوابة والمراجع",
    relations: "الروابط",
    activity: "السجل",
    payment: "الدفعة",
    customer: "العميل",
    invoice: "الفاتورة",
    order: "الطلب",
    paymentInfo: "بيانات الدفعة",
    customerInfo: "بيانات العميل",
    invoiceInfo: "بيانات الفاتورة",
    orderInfo: "بيانات الطلب",
    gatewayInfo: "بيانات البوابة",
    treasuryAccounting: "الخزينة والمحاسبة",
    notes: "الملاحظات",
    noNotes: "لا توجد ملاحظات.",
    failureReason: "سبب الفشل",
    paymentNumber: "رقم الدفعة",
    reference: "المرجع",
    status: "الحالة",
    method: "طريقة الدفع",
    provider: "المزود",
    amount: "المبلغ",
    paid: "المحصل",
    refunded: "المسترد",
    remaining: "المتبقي",
    netCollected: "صافي التحصيل",
    currency: "العملة",
    externalReference: "المرجع الخارجي",
    transactionId: "رقم العملية",
    gatewayCode: "كود البوابة",
    gatewayMessage: "رسالة البوابة",
    treasury: "الخزينة",
    accounting: "المحاسبة",
    treasuryReference: "مرجع حركة الخزينة",
    accountingReference: "مرجع القيد المحاسبي",
    posted: "مرحلة",
    pendingPost: "غير مرحلة",
    gatewayCompleted: "مكتملة عبر البوابة",
    createdAt: "تاريخ الإنشاء",
    initiatedAt: "تاريخ البدء",
    paidAt: "تاريخ الدفع",
    refundedAt: "تاريخ الاسترداد",
    cancelledAt: "تاريخ الإلغاء",
    updatedAt: "آخر تحديث",
    customerCode: "رقم العميل",
    name: "الاسم",
    phone: "الجوال",
    email: "البريد",
    account: "حساب العميل",
    hasAccount: "لديه حساب",
    noAccount: "بدون حساب",
    phoneVerified: "الجوال موثق",
    whatsappVerified: "واتساب موثق",
    invoiceNumber: "رقم الفاتورة",
    invoiceStatus: "حالة الفاتورة",
    invoiceTotal: "إجمالي الفاتورة",
    invoiceDue: "متبقي الفاتورة",
    orderNumber: "رقم الطلب",
    orderStatus: "حالة الطلب",
    fulfillmentStatus: "حالة التنفيذ",
    product: "المنتج",
    orderTotal: "إجمالي الطلب",
    orderRemaining: "متبقي الطلب",
    openCustomer: "فتح العميل",
    openInvoice: "فتح الفاتورة",
    openOrder: "فتح الطلب",
    pending: "بانتظار",
    paidStatus: "مدفوعة",
    failed: "فاشلة",
    cancelled: "ملغاة",
    refundedStatus: "مستردة",
    partiallyRefunded: "مستردة جزئيًا",
    unknown: "غير محدد",
    cash: "نقدي",
    bankTransfer: "تحويل بنكي",
    gatewayMethod: "بوابة دفع",
    creditCard: "بطاقة ائتمان",
    debitCard: "مدى / بطاقة",
    applePay: "Apple Pay",
    stcPay: "STC Pay",
    tamara: "تمارا",
    tabby: "تابي",
    wallet: "محفظة",
    notFoundTitle: "الدفعة غير موجودة",
    notFoundDesc: "تعذر العثور على الدفعة المطلوبة.",
    errorTitle: "تعذر تحميل تفاصيل الدفعة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    confirmPaymentQuestion: "هل تريد تأكيد هذه الدفعة؟",
    cancelPaymentQuestion: "هل تريد إلغاء هذه الدفعة؟",
    confirmSuccess: "تم تأكيد الدفعة بنجاح.",
    cancelSuccess: "تم إلغاء الدفعة بنجاح.",
    operationFailed: "تعذر تنفيذ العملية.",
    printTitle: "تفاصيل الدفعة",
    generatedAt: "تاريخ الطباعة",
  },
  en: {
    title: "Payment Details",
    subtitle: "View payment, customer, invoice, order, treasury, and accounting status.",
    back: "Back",
    refresh: "Refresh",
    print: "Print",
    actions: "Actions",
    copy: "Copy number",
    copied: "Copied",
    confirm: "Confirm payment",
    cancel: "Cancel payment",
    overview: "Overview",
    gateway: "Gateway & refs",
    relations: "Relations",
    activity: "Activity",
    payment: "Payment",
    customer: "Customer",
    invoice: "Invoice",
    order: "Order",
    paymentInfo: "Payment info",
    customerInfo: "Customer info",
    invoiceInfo: "Invoice info",
    orderInfo: "Order info",
    gatewayInfo: "Gateway info",
    treasuryAccounting: "Treasury & accounting",
    notes: "Notes",
    noNotes: "No notes.",
    failureReason: "Failure reason",
    paymentNumber: "Payment number",
    reference: "Reference",
    status: "Status",
    method: "Method",
    provider: "Provider",
    amount: "Amount",
    paid: "Collected",
    refunded: "Refunded",
    remaining: "Remaining",
    netCollected: "Net collected",
    currency: "Currency",
    externalReference: "External reference",
    transactionId: "Transaction ID",
    gatewayCode: "Gateway code",
    gatewayMessage: "Gateway message",
    treasury: "Treasury",
    accounting: "Accounting",
    treasuryReference: "Treasury movement ref",
    accountingReference: "Accounting entry ref",
    posted: "Posted",
    pendingPost: "Pending",
    gatewayCompleted: "Gateway completed",
    createdAt: "Created at",
    initiatedAt: "Initiated at",
    paidAt: "Paid at",
    refundedAt: "Refunded at",
    cancelledAt: "Cancelled at",
    updatedAt: "Updated at",
    customerCode: "Customer code",
    name: "Name",
    phone: "Phone",
    email: "Email",
    account: "Customer account",
    hasAccount: "Has account",
    noAccount: "No account",
    phoneVerified: "Phone verified",
    whatsappVerified: "WhatsApp verified",
    invoiceNumber: "Invoice number",
    invoiceStatus: "Invoice status",
    invoiceTotal: "Invoice total",
    invoiceDue: "Invoice due",
    orderNumber: "Order number",
    orderStatus: "Order status",
    fulfillmentStatus: "Fulfillment status",
    product: "Product",
    orderTotal: "Order total",
    orderRemaining: "Order remaining",
    openCustomer: "Open customer",
    openInvoice: "Open invoice",
    openOrder: "Open order",
    pending: "Pending",
    paidStatus: "Paid",
    failed: "Failed",
    cancelled: "Cancelled",
    refundedStatus: "Refunded",
    partiallyRefunded: "Partially refunded",
    unknown: "Unknown",
    cash: "Cash",
    bankTransfer: "Bank transfer",
    gatewayMethod: "Gateway",
    creditCard: "Credit card",
    debitCard: "Debit card",
    applePay: "Apple Pay",
    stcPay: "STC Pay",
    tamara: "Tamara",
    tabby: "Tabby",
    wallet: "Wallet",
    notFoundTitle: "Payment not found",
    notFoundDesc: "The requested payment could not be found.",
    errorTitle: "Unable to load payment details",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    confirmPaymentQuestion: "Do you want to confirm this payment?",
    cancelPaymentQuestion: "Do you want to cancel this payment?",
    confirmSuccess: "Payment confirmed successfully.",
    cancelSuccess: "Payment cancelled successfully.",
    operationFailed: "Unable to complete operation.",
    printTitle: "Payment details",
    generatedAt: "Generated at",
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

function normalizeCustomer(value: unknown): PaymentCustomer | null {
  const item = asRecord(value);

  if (!Object.keys(item).length) return null;

  return {
    id: item.id === null || item.id === undefined ? null : toNumber(item.id),
    customer_code: normalizeText(item.customer_code),
    name: normalizeText(item.name || item.display_name || item.full_name),
    display_name: normalizeText(item.display_name || item.name || item.full_name),
    full_name: normalizeText(item.full_name || item.name || item.display_name),
    phone: normalizeText(item.phone || item.phone_number || item.primary_contact_number),
    phone_number: normalizeText(item.phone_number || item.phone || item.primary_contact_number),
    whatsapp: normalizeText(item.whatsapp || item.whatsapp_number),
    whatsapp_number: normalizeText(item.whatsapp_number || item.whatsapp),
    primary_contact_number: normalizeText(
      item.primary_contact_number ||
        item.whatsapp_number ||
        item.phone_number ||
        item.phone,
    ),
    email: normalizeText(item.email),
    status: normalizeText(item.status),
    normalized_phone: normalizeText(item.normalized_phone),
    user_id: item.user_id === null || item.user_id === undefined ? null : toNumber(item.user_id),
    user_username: normalizeText(item.user_username),
    has_customer_account: toBoolean(item.has_customer_account),
    is_phone_verified: toBoolean(item.is_phone_verified),
    is_whatsapp_verified: toBoolean(item.is_whatsapp_verified),
    phone_verified_at: normalizeText(item.phone_verified_at) || null,
    whatsapp_verified_at: normalizeText(item.whatsapp_verified_at) || null,
    last_login_at: normalizeText(item.last_login_at) || null,
  };
}

function normalizeInvoice(value: unknown): PaymentInvoice | null {
  const item = asRecord(value);

  if (!Object.keys(item).length) return null;

  return {
    id: item.id === null || item.id === undefined ? null : toNumber(item.id),
    label: normalizeText(item.label),
    invoice_number: normalizeText(item.invoice_number || item.number || item.reference),
    status: normalizeText(item.status),
    invoice_type: normalizeText(item.invoice_type),
    issue_date: normalizeText(item.issue_date) || null,
    due_date: normalizeText(item.due_date) || null,
    order_id: item.order_id === null || item.order_id === undefined ? null : toNumber(item.order_id),
    customer_id:
      item.customer_id === null || item.customer_id === undefined ? null : toNumber(item.customer_id),
    subtotal: toNumber(item.subtotal),
    discount_amount: toNumber(item.discount_amount),
    taxable_amount: toNumber(item.taxable_amount),
    tax_rate: toNumber(item.tax_rate),
    tax_amount: toNumber(item.tax_amount),
    total_amount: toNumber(item.total_amount),
    paid_amount: toNumber(item.paid_amount),
    due_amount: toNumber(item.due_amount),
    currency: normalizeText(item.currency, "SAR"),
    accounting_entry_reference: normalizeText(item.accounting_entry_reference),
    is_accounting_posted: toBoolean(item.is_accounting_posted),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function normalizeOrder(value: unknown): PaymentOrder | null {
  const item = asRecord(value);

  if (!Object.keys(item).length) return null;

  return {
    id: item.id === null || item.id === undefined ? null : toNumber(item.id),
    label: normalizeText(item.label),
    order_number: normalizeText(item.order_number || item.number || item.code),
    status: normalizeText(item.status),
    payment_status: normalizeText(item.payment_status),
    fulfillment_status: normalizeText(item.fulfillment_status),
    source: normalizeText(item.source),
    product_name: normalizeText(item.product_name),
    product_type: normalizeText(item.product_type),
    total_amount: toNumber(item.total_amount),
    amount_paid: toNumber(item.amount_paid),
    remaining_amount: toNumber(item.remaining_amount),
    currency_code: normalizeText(item.currency_code, "SAR"),
    customer_id:
      item.customer_id === null || item.customer_id === undefined ? null : toNumber(item.customer_id),
    product_id:
      item.product_id === null || item.product_id === undefined ? null : toNumber(item.product_id),
    provider_id:
      item.provider_id === null || item.provider_id === undefined ? null : toNumber(item.provider_id),
    contract_id:
      item.contract_id === null || item.contract_id === undefined ? null : toNumber(item.contract_id),
    agent_id: item.agent_id === null || item.agent_id === undefined ? null : toNumber(item.agent_id),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function extractPaymentPayload(payload: PaymentApiResponse): unknown {
  if (payload.payment) return payload.payment;

  const data = asRecord(payload.data);

  if (data.payment) return data.payment;
  if (data.item) return data.item;
  if (data.result) return data.result;
  if (data.id || data.payment_number) return data;

  return payload;
}

function normalizePayment(value: unknown, fallback?: PaymentApiResponse): PaymentRecord {
  const item = asRecord(value);
  const fallbackRecord = asRecord(fallback || {});
  const fallbackData = asRecord(fallbackRecord.data);

  const customer = normalizeCustomer(item.customer || fallbackData.customer || fallbackRecord.customer);
  const invoice = normalizeInvoice(item.invoice || fallbackData.invoice || fallbackRecord.invoice);
  const order = normalizeOrder(item.order || fallbackData.order || fallbackRecord.order);

  const financialFlow = asRecord(
    item.financial_flow || fallbackData.financial_flow || fallbackRecord.financial_flow,
  );

  const timeline = asRecord(item.timeline);

  const paymentNumber = normalizeText(
    item.payment_number || item.reference || `PAY-${normalizeText(item.id)}`,
  );

  return {
    id: toNumber(item.id),
    payment_number: paymentNumber,
    reference: paymentNumber,
    status: normalizeText(item.status).toUpperCase(),
    payment_method: normalizeText(item.payment_method || item.method).toUpperCase(),
    provider: normalizeText(item.provider).toUpperCase(),
    currency: normalizeText(item.currency, "SAR"),

    amount: toNumber(item.amount),
    paid_amount: toNumber(item.paid_amount),
    refunded_amount: toNumber(item.refunded_amount),
    remaining_amount: toNumber(item.remaining_amount),
    net_collected_amount: toNumber(item.net_collected_amount),

    invoice_id:
      item.invoice_id === null || item.invoice_id === undefined
        ? invoice?.id ?? null
        : toNumber(item.invoice_id),
    invoice,

    order_id:
      item.order_id === null || item.order_id === undefined
        ? order?.id ?? null
        : toNumber(item.order_id),
    order,

    customer_id:
      item.customer_id === null || item.customer_id === undefined
        ? customer?.id ?? null
        : toNumber(item.customer_id),
    customer,
    customer_name: normalizeText(item.customer_name || customer?.name || customer?.display_name),

    external_reference: normalizeText(item.external_reference),
    transaction_id: normalizeText(item.transaction_id),
    gateway_response_code: normalizeText(item.gateway_response_code),
    gateway_message: normalizeText(item.gateway_message),
    failure_reason: normalizeText(item.failure_reason),

    treasury_movement_reference: normalizeText(item.treasury_movement_reference),
    accounting_entry_reference: normalizeText(item.accounting_entry_reference),
    is_treasury_posted: toBoolean(item.is_treasury_posted),
    is_accounting_posted: toBoolean(item.is_accounting_posted),

    timeline: {
      initiated_at: normalizeText(timeline.initiated_at || item.initiated_at) || null,
      paid_at: normalizeText(timeline.paid_at || item.paid_at) || null,
      refunded_at: normalizeText(timeline.refunded_at || item.refunded_at) || null,
      cancelled_at: normalizeText(timeline.cancelled_at || item.cancelled_at) || null,
      created_at: normalizeText(timeline.created_at || item.created_at) || null,
      updated_at: normalizeText(timeline.updated_at || item.updated_at) || null,
    },

    initiated_at: normalizeText(item.initiated_at || timeline.initiated_at) || null,
    paid_at: normalizeText(item.paid_at || timeline.paid_at) || null,
    refunded_at: normalizeText(item.refunded_at || timeline.refunded_at) || null,
    cancelled_at: normalizeText(item.cancelled_at || timeline.cancelled_at) || null,
    created_at: normalizeText(item.created_at || timeline.created_at) || null,
    updated_at: normalizeText(item.updated_at || timeline.updated_at) || null,

    notes: normalizeText(item.notes),
    financial_flow: {
      gateway_completed: toBoolean(financialFlow.gateway_completed),
      accounting_posted: toBoolean(financialFlow.accounting_posted || item.is_accounting_posted),
      treasury_posted: toBoolean(financialFlow.treasury_posted || item.is_treasury_posted),
      accounting_reference: normalizeText(
        financialFlow.accounting_reference || item.accounting_entry_reference,
      ),
      treasury_reference: normalizeText(
        financialFlow.treasury_reference || item.treasury_movement_reference,
      ),
    },
  };
}

function getStatusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "PENDING" || normalized === "INITIATED") return t.pending;
  if (normalized === "PAID" || normalized === "CONFIRMED" || normalized === "SUCCESS") {
    return t.paidStatus;
  }
  if (normalized === "FAILED") return t.failed;
  if (normalized === "CANCELLED" || normalized === "CANCELED") return t.cancelled;
  if (normalized === "REFUNDED") return t.refundedStatus;
  if (normalized === "PARTIALLY_REFUNDED") return t.partiallyRefunded;

  return normalized || t.unknown;
}

function getStatusClass(status: string) {
  const normalized = normalizeText(status).toUpperCase();

  if (["PAID", "CONFIRMED", "SUCCESS"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["PENDING", "INITIATED"].includes(normalized)) {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  if (["FAILED", "CANCELLED", "CANCELED"].includes(normalized)) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(normalized)) {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function getMethodLabel(method: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(method).toUpperCase();

  if (normalized === "CASH") return t.cash;
  if (normalized === "BANK_TRANSFER") return t.bankTransfer;
  if (normalized === "GATEWAY") return t.gatewayMethod;
  if (normalized === "CREDIT_CARD") return t.creditCard;
  if (normalized === "DEBIT_CARD") return t.debitCard;
  if (normalized === "APPLE_PAY") return t.applePay;
  if (normalized === "STC_PAY") return t.stcPay;
  if (normalized === "TAMARA") return t.tamara;
  if (normalized === "TABBY") return t.tabby;
  if (normalized === "WALLET") return t.wallet;

  return normalized || t.unknown;
}

function canConfirmPayment(payment: PaymentRecord) {
  const status = normalizeText(payment.status).toUpperCase();
  return Boolean(payment.id) && !["PAID", "CONFIRMED", "SUCCESS", "CANCELLED", "CANCELED", "REFUNDED"].includes(status);
}

function canCancelPayment(payment: PaymentRecord) {
  const status = normalizeText(payment.status).toUpperCase();
  return Boolean(payment.id) && !["PAID", "CONFIRMED", "SUCCESS", "CANCELLED", "CANCELED", "REFUNDED"].includes(status);
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

function PostingBadge({
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
      <span className="truncate">{posted ? t.posted : t.pendingPost}</span>
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
          <Skeleton className="h-9 w-28" />
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
            {Array.from({ length: 7 }).map((_, index) => (
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

export default function SystemPaymentDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const paymentId = normalizeText(params?.id);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [payment, setPayment] = React.useState<PaymentRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<"confirm" | "cancel" | null>(null);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

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

  const loadPayment = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!paymentId) {
        setLoading(false);
        setError(t.notFoundDesc);
        return;
      }

      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const payload = await fetchJson<PaymentApiResponse>(
          makeApiUrl(`/api/payments/${paymentId}/`),
          { signal: controller.signal },
        );

        const nextPayment = normalizePayment(extractPaymentPayload(payload), payload);
        setPayment(nextPayment.id ? nextPayment : null);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setPayment(null);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [paymentId, t.errorDesc, t.notFoundDesc],
  );

  React.useEffect(() => {
    void loadPayment();
  }, [loadPayment]);

  async function copyPaymentNumber() {
    if (!payment) return;

    try {
      await navigator.clipboard.writeText(payment.payment_number);
      toast.success(t.copied);
    } catch {
      toast.error(t.operationFailed);
    }
  }

  async function postPaymentAction(action: "confirm" | "cancel") {
    if (!payment) return;

    const confirmed = window.confirm(
      action === "confirm" ? t.confirmPaymentQuestion : t.cancelPaymentQuestion,
    );

    if (!confirmed) return;

    setActionLoading(action);

    try {
      await fetchJson<unknown>(makeApiUrl(`/api/payments/${payment.id}/${action}/`), {
        method: "POST",
        body:
          action === "confirm"
            ? {
                paid_amount: payment.amount || payment.paid_amount,
                auto_create_treasury_movement: true,
                auto_post_accounting: true,
              }
            : {
                reason: "",
              },
      });

      toast.success(action === "confirm" ? t.confirmSuccess : t.cancelSuccess);
      await loadPayment({ silent: true });
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
    if (!payment) return;

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
          <title>${escapeHtml(t.printTitle)} - ${escapeHtml(payment.payment_number)}</title>
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
              <p>${escapeHtml(t.paymentNumber)}: <strong>${escapeHtml(payment.payment_number)}</strong></p>
              <p>${escapeHtml(t.status)}: ${escapeHtml(getStatusLabel(payment.status, locale))}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.amount)}</span><strong class="num">${escapeHtml(formatMoney(payment.amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.paid)}</span><strong class="num">${escapeHtml(formatMoney(payment.paid_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.refunded)}</span><strong class="num">${escapeHtml(formatMoney(payment.refunded_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.netCollected)}</span><strong class="num">${escapeHtml(formatMoney(payment.net_collected_amount))}</strong></div>
          </div>

          <table>
            <tbody>
              <tr><th>${escapeHtml(t.customer)}</th><td>${escapeHtml(payment.customer_name || payment.customer?.name || "—")}</td></tr>
              <tr><th>${escapeHtml(t.invoice)}</th><td>${escapeHtml(payment.invoice?.invoice_number || "—")}</td></tr>
              <tr><th>${escapeHtml(t.order)}</th><td>${escapeHtml(payment.order?.order_number || "—")}</td></tr>
              <tr><th>${escapeHtml(t.method)}</th><td>${escapeHtml(getMethodLabel(payment.payment_method, locale))}</td></tr>
              <tr><th>${escapeHtml(t.provider)}</th><td>${escapeHtml(payment.provider || "—")}</td></tr>
              <tr><th>${escapeHtml(t.externalReference)}</th><td>${escapeHtml(payment.external_reference || "—")}</td></tr>
              <tr><th>${escapeHtml(t.transactionId)}</th><td>${escapeHtml(payment.transaction_id || "—")}</td></tr>
              <tr><th>${escapeHtml(t.treasuryReference)}</th><td>${escapeHtml(payment.treasury_movement_reference || "—")}</td></tr>
              <tr><th>${escapeHtml(t.accountingReference)}</th><td>${escapeHtml(payment.accounting_entry_reference || "—")}</td></tr>
              <tr><th>${escapeHtml(t.paidAt)}</th><td>${escapeHtml(formatDate(payment.paid_at))}</td></tr>
              <tr><th>${escapeHtml(t.createdAt)}</th><td>${escapeHtml(formatDate(payment.created_at))}</td></tr>
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

  if (error || !payment) {
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
            <BackIcon className="h-4 w-4" />
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

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadPayment()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activityRows = [
    {
      label: t.initiatedAt,
      value: formatDate(payment.initiated_at),
      icon: CalendarDays,
    },
    {
      label: t.paidAt,
      value: formatDate(payment.paid_at),
      icon: CheckCircle2,
    },
    {
      label: t.refundedAt,
      value: formatDate(payment.refunded_at),
      icon: RotateCcw,
    },
    {
      label: t.cancelledAt,
      value: formatDate(payment.cancelled_at),
      icon: XCircle,
    },
    {
      label: t.createdAt,
      value: formatDate(payment.created_at),
      icon: ReceiptText,
    },
    {
      label: t.updatedAt,
      value: formatDate(payment.updated_at),
      icon: RefreshCw,
    },
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
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadPayment({ silent: true })}
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
              <DropdownMenuItem onClick={() => void copyPaymentNumber()}>
                <Copy className="h-4 w-4" />
                {t.copy}
              </DropdownMenuItem>

              {canConfirmPayment(payment) ? (
                <DropdownMenuItem
                  disabled={actionLoading === "confirm"}
                  onClick={() => void postPaymentAction("confirm")}
                >
                  {actionLoading === "confirm" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {t.confirm}
                </DropdownMenuItem>
              ) : null}

              {canCancelPayment(payment) ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={actionLoading === "cancel"}
                    className="text-red-600 focus:text-red-600"
                    onClick={() => void postPaymentAction("cancel")}
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
              <WalletCards className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate text-xl font-bold">
                {payment.payment_number}
              </CardTitle>
              <CardDescription className="truncate">
                {payment.customer_name || payment.customer?.name || t.customer}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={payment.status} locale={locale} />
              <Badge
                variant="outline"
                className="rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium"
              >
                {getMethodLabel(payment.payment_method, locale)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-2 px-6 pb-6">
            <InfoRow label={t.amount}>
              <MoneyValue value={payment.amount} />
            </InfoRow>
            <InfoRow label={t.paid}>
              <MoneyValue value={payment.paid_amount} />
            </InfoRow>
            <InfoRow label={t.refunded}>
              <MoneyValue value={payment.refunded_amount} />
            </InfoRow>
            <InfoRow label={t.netCollected}>
              <MoneyValue value={payment.net_collected_amount} />
            </InfoRow>
            <InfoRow label={t.treasury}>
              <PostingBadge posted={payment.is_treasury_posted} locale={locale} />
            </InfoRow>
            <InfoRow label={t.accounting}>
              <PostingBadge posted={payment.is_accounting_posted} locale={locale} />
            </InfoRow>
            <InfoRow label={t.paidAt} value={formatDate(payment.paid_at)} />

            <div className="grid gap-2 pt-3">
              {payment.customer_id ? (
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href={`/system/customers/${payment.customer_id}`}>
                    <User className="h-4 w-4" />
                    {t.openCustomer}
                  </Link>
                </Button>
              ) : null}

              {payment.invoice_id ? (
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href={`/system/invoices/${payment.invoice_id}`}>
                    <ReceiptText className="h-4 w-4" />
                    {t.openInvoice}
                  </Link>
                </Button>
              ) : null}

              {payment.order_id ? (
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href={`/system/orders/${payment.order_id}`}>
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
            <MetricCard
              title={t.amount}
              value={<MoneyValue value={payment.amount} />}
              icon={Banknote}
            />
            <MetricCard
              title={t.paid}
              value={<MoneyValue value={payment.paid_amount} />}
              icon={CheckCircle2}
            />
            <MetricCard
              title={t.refunded}
              value={<MoneyValue value={payment.refunded_amount} />}
              icon={RotateCcw}
            />
            <MetricCard
              title={t.netCollected}
              value={<MoneyValue value={payment.net_collected_amount} />}
              icon={WalletCards}
            />
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardContent className="p-4">
                <TabsList className="h-auto flex-wrap justify-start rounded-lg bg-muted/40 p-1">
                  <TabsTrigger value="overview" className="rounded-md">
                    <Eye className="h-4 w-4" />
                    {t.overview}
                  </TabsTrigger>
                  <TabsTrigger value="gateway" className="rounded-md">
                    <ShieldCheck className="h-4 w-4" />
                    {t.gateway}
                  </TabsTrigger>
                  <TabsTrigger value="relations" className="rounded-md">
                    <FileText className="h-4 w-4" />
                    {t.relations}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="rounded-md">
                    <CalendarDays className="h-4 w-4" />
                    {t.activity}
                  </TabsTrigger>
                </TabsList>
              </CardContent>
            </Card>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.paymentInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.paymentNumber} value={payment.payment_number} />
                    <InfoRow label={t.status}>
                      <StatusBadge status={payment.status} locale={locale} />
                    </InfoRow>
                    <InfoRow label={t.method} value={getMethodLabel(payment.payment_method, locale)} />
                    <InfoRow label={t.provider} value={payment.provider || "—"} />
                    <InfoRow label={t.currency} value={payment.currency || "SAR"} />
                    <InfoRow label={t.createdAt} value={formatDate(payment.created_at)} />
                    <InfoRow label={t.updatedAt} value={formatDate(payment.updated_at)} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.treasuryAccounting}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.treasury}>
                      <PostingBadge posted={payment.is_treasury_posted} locale={locale} />
                    </InfoRow>
                    <InfoRow label={t.accounting}>
                      <PostingBadge posted={payment.is_accounting_posted} locale={locale} />
                    </InfoRow>
                    <InfoRow
                      label={t.treasuryReference}
                      value={payment.treasury_movement_reference || payment.financial_flow.treasury_reference || "—"}
                    />
                    <InfoRow
                      label={t.accountingReference}
                      value={payment.accounting_entry_reference || payment.financial_flow.accounting_reference || "—"}
                    />
                    <InfoRow label={t.gatewayCompleted}>
                      <PostingBadge posted={payment.financial_flow.gateway_completed} locale={locale} />
                    </InfoRow>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none xl:col-span-2">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.notes}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 px-5 pb-5 md:grid-cols-2">
                    <div className="rounded-lg border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">{t.notes}</p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {payment.notes || t.noNotes}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">{t.failureReason}</p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {payment.failure_reason || t.noNotes}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="gateway" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-base">{t.gatewayInfo}</CardTitle>
                  <CardDescription>{payment.payment_number}</CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <InfoRow label={t.externalReference} value={payment.external_reference || "—"} />
                  <InfoRow label={t.transactionId} value={payment.transaction_id || "—"} />
                  <InfoRow label={t.gatewayCode} value={payment.gateway_response_code || "—"} />
                  <InfoRow label={t.gatewayMessage} value={payment.gateway_message || "—"} />
                  <InfoRow label={t.provider} value={payment.provider || "—"} />
                  <InfoRow label={t.method} value={getMethodLabel(payment.payment_method, locale)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="relations" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-3">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.customerInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.name} value={payment.customer_name || payment.customer?.name || "—"} />
                    <InfoRow label={t.customerCode} value={payment.customer?.customer_code || "—"} />
                    <InfoRow
                      label={t.phone}
                      value={
                        payment.customer?.primary_contact_number ||
                        payment.customer?.phone ||
                        payment.customer?.whatsapp ||
                        "—"
                      }
                    />
                    <InfoRow label={t.email} value={payment.customer?.email || "—"} />
                    <InfoRow
                      label={t.account}
                      value={payment.customer?.has_customer_account ? t.hasAccount : t.noAccount}
                    />
                    <InfoRow
                      label={t.phoneVerified}
                      value={payment.customer?.is_phone_verified ? t.posted : t.pendingPost}
                    />
                    <InfoRow
                      label={t.whatsappVerified}
                      value={payment.customer?.is_whatsapp_verified ? t.posted : t.pendingPost}
                    />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.invoiceInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.invoiceNumber} value={payment.invoice?.invoice_number || "—"} />
                    <InfoRow label={t.invoiceStatus} value={payment.invoice?.status || "—"} />
                    <InfoRow label={t.invoiceTotal}>
                      <MoneyValue value={payment.invoice?.total_amount || 0} />
                    </InfoRow>
                    <InfoRow label={t.paid}>
                      <MoneyValue value={payment.invoice?.paid_amount || 0} />
                    </InfoRow>
                    <InfoRow label={t.invoiceDue}>
                      <MoneyValue value={payment.invoice?.due_amount || 0} />
                    </InfoRow>
                    <InfoRow label={t.accounting}>
                      <PostingBadge posted={Boolean(payment.invoice?.is_accounting_posted)} locale={locale} />
                    </InfoRow>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.orderInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.orderNumber} value={payment.order?.order_number || "—"} />
                    <InfoRow label={t.orderStatus} value={payment.order?.status || "—"} />
                    <InfoRow label={t.fulfillmentStatus} value={payment.order?.fulfillment_status || "—"} />
                    <InfoRow label={t.product} value={payment.order?.product_name || "—"} />
                    <InfoRow label={t.orderTotal}>
                      <MoneyValue value={payment.order?.total_amount || 0} />
                    </InfoRow>
                    <InfoRow label={t.orderRemaining}>
                      <MoneyValue value={payment.order?.remaining_amount || 0} />
                    </InfoRow>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-base">{t.activity}</CardTitle>
                  <CardDescription>{payment.payment_number}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-5">
                  {activityRows.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="truncate font-medium">{item.label}</p>
                        </div>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-base">{t.treasuryAccounting}</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-[180px] px-4 text-right">{t.status}</TableHead>
                        <TableHead className="px-4 text-right">{t.reference}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="h-[62px]">
                        <TableCell className="px-4 text-right">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-muted-foreground" />
                            {t.treasury}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 text-right">
                          <div className="flex flex-wrap items-center gap-2">
                            <PostingBadge posted={payment.is_treasury_posted} locale={locale} />
                            <span className="text-sm text-muted-foreground">
                              {payment.treasury_movement_reference || "—"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>

                      <TableRow className="h-[62px]">
                        <TableCell className="px-4 text-right">
                          <div className="flex items-center gap-2">
                            <ReceiptText className="h-4 w-4 text-muted-foreground" />
                            {t.accounting}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 text-right">
                          <div className="flex flex-wrap items-center gap-2">
                            <PostingBadge posted={payment.is_accounting_posted} locale={locale} />
                            <span className="text-sm text-muted-foreground">
                              {payment.accounting_entry_reference || "—"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}