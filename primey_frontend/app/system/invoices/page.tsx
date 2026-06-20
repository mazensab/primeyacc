"use client";

/* ============================================================
   📂 primey_frontend/app/system/invoices/page.tsx
   🧾 Primey Care — Invoices
   ------------------------------------------------------------
   ✅ Same approved Customers page visual pattern 1:1
   ✅ Header buttons / KPI cards / toolbar / table unified
   ✅ Fixed table column widths like Customers page
   ✅ Internal UI components only
   ✅ Real API only: /api/invoices/
   ✅ No fake data
   ✅ No visible technical labels
   ✅ Excel .xls + Web print
   ✅ SAR icon from /currency/sar.svg
   ✅ RTL/LTR + Arabic/English through primey-locale
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpDown,
  CheckCircle2,
  ColumnsIcon,
  Copy,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  TriangleAlert,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

type InvoiceStatus =
  | "all"
  | "draft"
  | "issued"
  | "paid"
  | "partially_paid"
  | "cancelled";

type PaymentFilter = "all" | "paid" | "partial" | "unpaid";
type AccountingFilter = "all" | "posted" | "pending";

type SortKey =
  | "newest"
  | "oldest"
  | "highest_total"
  | "highest_due"
  | "highest_paid"
  | "due_soon";

type ColumnKey =
  | "select"
  | "invoice"
  | "customer"
  | "order"
  | "total"
  | "paid"
  | "due"
  | "status"
  | "payment"
  | "accounting"
  | "issueDate"
  | "dueDate"
  | "actions";

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
};

type InvoiceSummary = {
  total_count: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  accounting_posted_count: number;
  accounting_pending_count: number;
  currency: string;
};

type InvoicesApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    items?: unknown[];
    results?: unknown[];
    summary?: unknown;
    pagination?: unknown;
  };
  items?: unknown[];
  results?: unknown[];
  summary?: unknown;
  pagination?: unknown;
  count?: number;
  total_count?: number;
};

const SAR_ICON = "/currency/sar.svg";

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  invoice: true,
  customer: true,
  order: true,
  total: true,
  paid: true,
  due: true,
  status: true,
  payment: true,
  accounting: true,
  issueDate: true,
  dueDate: true,
  actions: true,
};

const translations = {
  ar: {
    title: "الفواتير",
    subtitle: "متابعة الفواتير والتحصيل والإصدار والترحيل المحاسبي.",
    create: "إنشاء فاتورة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث في الفواتير...",
    allStatuses: "كل الحالات",
    draft: "مسودة",
    issued: "صادرة",
    paid: "مدفوعة",
    partially_paid: "مدفوعة جزئيًا",
    cancelled: "ملغاة",
    unknown: "غير محدد",
    totalInvoices: "إجمالي الفواتير",
    totalAmount: "إجمالي المبالغ",
    paidAmount: "المحصل",
    dueAmount: "المتبقي",
    totalAmountTrend: "إجمالي",
    paidAmountTrend: "محصل",
    dueAmountTrend: "متبقي",
    invoice: "الفاتورة",
    customer: "العميل",
    order: "الطلب",
    total: "الإجمالي",
    paidCol: "المدفوع",
    dueCol: "المتبقي",
    status: "الحالة",
    payment: "الدفع",
    accounting: "المحاسبة",
    issueDate: "الإصدار",
    dueDate: "الاستحقاق",
    actions: "الإجراءات",
    columns: "الأعمدة",
    sort: "الترتيب",
    selected: "محدد",
    allPayments: "كل حالات الدفع",
    paymentPaid: "مدفوعة بالكامل",
    paymentPartial: "مدفوعة جزئيًا",
    paymentUnpaid: "غير مدفوعة",
    allAccounting: "كل حالات المحاسبة",
    accountingPosted: "مرحلة",
    accountingPending: "غير مرحلة",
    newest: "الأحدث",
    oldest: "الأقدم",
    highestTotal: "الأعلى إجماليًا",
    highestDue: "الأعلى متبقيًا",
    highestPaid: "الأعلى تحصيلًا",
    dueSoon: "الأقرب استحقاقًا",
    from: "من",
    to: "إلى",
    clearSelection: "إلغاء التحديد",
    activeFilters: "فلاتر مفعلة",
    view: "عرض التفاصيل",
    issue: "إصدار الفاتورة",
    cancel: "إلغاء الفاتورة",
    copyNumber: "نسخ رقم الفاتورة",
    copied: "تم النسخ",
    noDataTitle: "لا توجد فواتير بعد",
    noDataDesc: "عند إنشاء الفواتير ستظهر هنا.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل الفواتير",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    confirmIssue: "هل تريد إصدار هذه الفاتورة؟",
    confirmCancel: "هل تريد إلغاء هذه الفاتورة؟",
    issueSuccess: "تم إصدار الفاتورة بنجاح.",
    cancelSuccess: "تم إلغاء الفاتورة بنجاح.",
    operationFailed: "تعذر تنفيذ العملية.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير الفواتير",
    generatedAt: "تاريخ الطباعة",
    showing: "عرض",
    rows: "صفوف",
    page: "صفحة",
    of: "من",
    next: "التالي",
    previous: "السابق",
    overdue: "متأخرة",
  },
  en: {
    title: "Invoices",
    subtitle: "Manage invoices, collection, issuing, and accounting posting.",
    create: "Create Invoice",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    searchPlaceholder: "Search invoices...",
    allStatuses: "All statuses",
    draft: "Draft",
    issued: "Issued",
    paid: "Paid",
    partially_paid: "Partially Paid",
    cancelled: "Cancelled",
    unknown: "Unknown",
    totalInvoices: "Total invoices",
    totalAmount: "Total amount",
    paidAmount: "Collected",
    dueAmount: "Due",
    totalAmountTrend: "Total",
    paidAmountTrend: "Collected",
    dueAmountTrend: "Due",
    invoice: "Invoice",
    customer: "Customer",
    order: "Order",
    total: "Total",
    paidCol: "Paid",
    dueCol: "Due",
    status: "Status",
    payment: "Payment",
    accounting: "Accounting",
    issueDate: "Issue date",
    dueDate: "Due date",
    actions: "Actions",
    columns: "Columns",
    sort: "Sort",
    selected: "Selected",
    allPayments: "All payments",
    paymentPaid: "Paid",
    paymentPartial: "Partial",
    paymentUnpaid: "Unpaid",
    allAccounting: "All accounting",
    accountingPosted: "Posted",
    accountingPending: "Pending",
    newest: "Newest",
    oldest: "Oldest",
    highestTotal: "Highest total",
    highestDue: "Highest due",
    highestPaid: "Highest paid",
    dueSoon: "Due soon",
    from: "From",
    to: "To",
    clearSelection: "Clear selection",
    activeFilters: "Active filters",
    view: "View details",
    issue: "Issue invoice",
    cancel: "Cancel invoice",
    copyNumber: "Copy invoice number",
    copied: "Copied",
    noDataTitle: "No invoices yet",
    noDataDesc: "Created invoices will appear here.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load invoices",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    confirmIssue: "Do you want to issue this invoice?",
    confirmCancel: "Do you want to cancel this invoice?",
    issueSuccess: "Invoice issued successfully.",
    cancelSuccess: "Invoice cancelled successfully.",
    operationFailed: "Unable to complete operation.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Invoices report",
    generatedAt: "Generated at",
    showing: "Showing",
    rows: "Rows",
    page: "Page",
    of: "of",
    next: "Next",
    previous: "Previous",
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

function makeApiUrl(path: string, params?: URLSearchParams) {
  const base = getApiBaseUrl();
  const query = params?.toString();

  return `${base}${path}${query ? `?${query}` : ""}`;
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

function extractInvoices(payload: InvoicesApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;

  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.items)) return payload.data.items;
  }

  return [];
}

function extractSummary(payload: InvoicesApiResponse) {
  if (payload.summary && typeof payload.summary === "object") return payload.summary;

  if (
    payload.data &&
    typeof payload.data === "object" &&
    payload.data.summary &&
    typeof payload.data.summary === "object"
  ) {
    return payload.data.summary;
  }

  return {};
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

function normalizeInvoice(value: unknown): InvoiceRecord {
  const item = asRecord(value);
  const customer = normalizeCustomer(item.customer);
  const order = normalizeOrder(item.order);

  const invoiceNumber = normalizeText(
    item.invoice_number || item.number || item.reference || `INV-${normalizeText(item.id)}`,
  );

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
  };
}

function buildSummaryFromRows(value: unknown, rows: InvoiceRecord[]): InvoiceSummary {
  const item = asRecord(value);

  const subtotal = rows.reduce((sum, invoice) => sum + invoice.subtotal, 0);
  const discount = rows.reduce((sum, invoice) => sum + invoice.discount_amount, 0);
  const tax = rows.reduce((sum, invoice) => sum + invoice.tax_amount, 0);
  const total = rows.reduce((sum, invoice) => sum + invoice.total_amount, 0);
  const paid = rows.reduce((sum, invoice) => sum + invoice.paid_amount, 0);
  const due = rows.reduce((sum, invoice) => sum + invoice.due_amount, 0);
  const posted = rows.filter((invoice) => invoice.is_accounting_posted).length;

  return {
    total_count: toNumber(item.total_count ?? item.count, rows.length),
    subtotal: toNumber(item.subtotal, subtotal),
    discount_amount: toNumber(item.discount_amount, discount),
    tax_amount: toNumber(item.tax_amount, tax),
    total_amount: toNumber(item.total_amount, total),
    paid_amount: toNumber(item.paid_amount, paid),
    due_amount: toNumber(item.due_amount, due),
    accounting_posted_count: toNumber(item.accounting_posted_count, posted),
    accounting_pending_count: toNumber(
      item.accounting_pending_count,
      Math.max(rows.length - posted, 0),
    ),
    currency: normalizeText(item.currency, "SAR"),
  };
}

function getStatusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(status).toLowerCase();

  if (normalized === "draft") return t.draft;
  if (normalized === "issued") return t.issued;
  if (normalized === "paid") return t.paid;
  if (normalized === "partially_paid" || normalized === "partial") return t.partially_paid;
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

function getPaymentFilter(invoice: InvoiceRecord): PaymentFilter {
  if (invoice.due_amount <= 0) return "paid";
  if (invoice.paid_amount > 0) return "partial";
  return "unpaid";
}

function getPaymentLabel(invoice: InvoiceRecord, locale: Locale) {
  const t = translations[locale];
  const status = getPaymentFilter(invoice);

  if (status === "paid") return t.paymentPaid;
  if (status === "partial") return t.paymentPartial;
  return t.paymentUnpaid;
}

function getPaymentClass(invoice: InvoiceRecord) {
  const status = getPaymentFilter(invoice);

  if (status === "paid") return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  if (status === "partial") return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";

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

function KpiCard({
  title,
  value,
  trend,
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[112px] px-6 py-5">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>

        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          {value}
        </CardTitle>

        <CardAction>
          <Badge
            variant="outline"
            className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {trend}
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
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

function HeaderSortButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center justify-start gap-1 truncate text-xs font-semibold transition hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="truncate">{children}</span>
      <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

function TableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-11 whitespace-nowrap px-4 text-right align-middle text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function TableBodyCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableCell
      className={cn(
        "h-[62px] overflow-hidden px-4 text-right align-middle",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}

export default function SystemInvoicesPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [invoices, setInvoices] = React.useState<InvoiceRecord[]>([]);
  const [summary, setSummary] = React.useState<InvoiceSummary>(() =>
    buildSummaryFromRows({}, []),
  );

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<number | null>(null);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<InvoiceStatus>("all");
  const [paymentFilter, setPaymentFilter] = React.useState<PaymentFilter>("all");
  const [accountingFilter, setAccountingFilter] = React.useState<AccountingFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Array<number>>([]);
  const [visibleColumns, setVisibleColumns] =
    React.useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [page, setPage] = React.useState(1);

  const didLoadRef = React.useRef(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const pageSize = 10;

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

  const loadInvoices = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) {
          setLoading(true);
        }

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: "1",
          page_size: "500",
        });

        const payload = await fetchJson<InvoicesApiResponse>(
          makeApiUrl("/api/invoices/", params),
          {
            signal: controller.signal,
          },
        );

        const nextInvoices = extractInvoices(payload).map(normalizeInvoice);
        const nextSummary = buildSummaryFromRows(
          extractSummary(payload),
          nextInvoices,
        );

        setInvoices(nextInvoices);
        setSummary(nextSummary);
        setSelectedIds([]);
        setPage(1);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setInvoices([]);
        setSummary(buildSummaryFromRows({}, []));
        setSelectedIds([]);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [t.errorDesc],
  );

  React.useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    void loadInvoices();
  }, [loadInvoices]);

  const filteredInvoices = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = invoices.filter((invoice) => {
      const status = normalizeText(invoice.status).toLowerCase();

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (paymentFilter !== "all" && getPaymentFilter(invoice) !== paymentFilter) return false;
      if (accountingFilter === "posted" && !invoice.is_accounting_posted) return false;
      if (accountingFilter === "pending" && invoice.is_accounting_posted) return false;

      if (dateFrom) {
        const value = (invoice.issue_date || invoice.created_at || "").slice(0, 10);
        if (value && value < dateFrom) return false;
      }

      if (dateTo) {
        const value = (invoice.issue_date || invoice.created_at || "").slice(0, 10);
        if (value && value > dateTo) return false;
      }

      if (!query) return true;

      const haystack = [
        invoice.invoice_number,
        invoice.customer_name,
        invoice.customer?.name,
        invoice.customer?.phone,
        invoice.customer?.email,
        invoice.order?.order_number,
        invoice.accounting_entry_reference,
        invoice.notes,
        invoice.internal_notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    return [...rows].sort((a, b) => {
      if (sortKey === "oldest") {
        return normalizeText(a.created_at || a.issue_date).localeCompare(
          normalizeText(b.created_at || b.issue_date),
        );
      }

      if (sortKey === "highest_total") return b.total_amount - a.total_amount;
      if (sortKey === "highest_due") return b.due_amount - a.due_amount;
      if (sortKey === "highest_paid") return b.paid_amount - a.paid_amount;

      if (sortKey === "due_soon") {
        return normalizeText(a.due_date || "9999-12-31").localeCompare(
          normalizeText(b.due_date || "9999-12-31"),
        );
      }

      return normalizeText(b.created_at || b.issue_date).localeCompare(
        normalizeText(a.created_at || a.issue_date),
      );
    });
  }, [
    accountingFilter,
    dateFrom,
    dateTo,
    invoices,
    paymentFilter,
    search,
    sortKey,
    statusFilter,
  ]);

  const filteredSummary = React.useMemo(
    () => buildSummaryFromRows({}, filteredInvoices),
    [filteredInvoices],
  );

  const totalPages = Math.max(Math.ceil(filteredInvoices.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);

  const paginatedInvoices = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [currentPage, filteredInvoices]);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    paymentFilter !== "all" ||
    accountingFilter !== "all" ||
    sortKey !== "newest" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const allPageSelected =
    paginatedInvoices.length > 0 &&
    paginatedInvoices.every((invoice) => selectedIds.includes(invoice.id));

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setAccountingFilter("all");
    setSortKey("newest");
    setDateFrom("");
    setDateTo("");
    setSelectedIds([]);
    setPage(1);
  }

  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds((current) =>
        current.filter((id) => !paginatedInvoices.some((invoice) => invoice.id === id)),
      );
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      paginatedInvoices.forEach((invoice) => next.add(invoice.id));
      return Array.from(next);
    });
  }

  function toggleSelectInvoice(id: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((item) => item !== id);
    });
  }

  async function copyInvoiceNumber(invoice: InvoiceRecord) {
    try {
      await navigator.clipboard.writeText(invoice.invoice_number);
      toast.success(t.copied);
    } catch {
      toast.error(t.operationFailed);
    }
  }

  async function postInvoiceAction(invoice: InvoiceRecord, action: "issue" | "cancel") {
    const confirmed = window.confirm(
      action === "issue" ? t.confirmIssue : t.confirmCancel,
    );

    if (!confirmed) return;

    setActionLoadingId(invoice.id);

    try {
      await fetchJson<unknown>(makeApiUrl(`/api/invoices/${invoice.id}/${action}/`), {
        method: "POST",
        body: action === "issue" ? { auto_post_accounting: true } : { reason: "" },
      });

      toast.success(action === "issue" ? t.issueSuccess : t.cancelSuccess);
      await loadInvoices({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;

      toast.error(message);
    } finally {
      setActionLoadingId(null);
    }
  }

  function buildExportRows() {
    return filteredInvoices.map((invoice) => ({
      invoice: invoice.invoice_number,
      customer: invoice.customer_name || invoice.customer?.name || "—",
      order: invoice.order?.order_number || "—",
      total: invoice.total_amount,
      paid: invoice.paid_amount,
      due: invoice.due_amount,
      status: getStatusLabel(invoice.status, locale),
      payment: getPaymentLabel(invoice, locale),
      accounting: invoice.is_accounting_posted ? t.accountingPosted : t.accountingPending,
      issueDate: formatDate(invoice.issue_date),
      dueDate: formatDate(invoice.due_date),
    }));
  }

  function exportExcel() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; direction: ${dir}; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d9d9d9; padding: 8px; text-align: ${locale === "ar" ? "right" : "left"}; }
            th { background: #f3f4f6; font-weight: 700; }
            .num { mso-number-format: "0.00"; }
          </style>
        </head>
        <body>
          <h2>${escapeHtml(t.printTitle)}</h2>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.invoice)}</th>
                <th>${escapeHtml(t.customer)}</th>
                <th>${escapeHtml(t.order)}</th>
                <th>${escapeHtml(t.total)}</th>
                <th>${escapeHtml(t.paidCol)}</th>
                <th>${escapeHtml(t.dueCol)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.payment)}</th>
                <th>${escapeHtml(t.accounting)}</th>
                <th>${escapeHtml(t.issueDate)}</th>
                <th>${escapeHtml(t.dueDate)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.invoice)}</td>
                      <td>${escapeHtml(row.customer)}</td>
                      <td>${escapeHtml(row.order)}</td>
                      <td class="num">${escapeHtml(row.total)}</td>
                      <td class="num">${escapeHtml(row.paid)}</td>
                      <td class="num">${escapeHtml(row.due)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.payment)}</td>
                      <td>${escapeHtml(row.accounting)}</td>
                      <td>${escapeHtml(row.issueDate)}</td>
                      <td>${escapeHtml(row.dueDate)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `primey-care-invoices-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }

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
          <title>${escapeHtml(t.printTitle)}</title>
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
              align-items: flex-start;
              gap: 16px;
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            h1 { margin: 0; font-size: 22px; }
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
              <p>${escapeHtml(t.showing)}: ${escapeHtml(rows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalInvoices)}</span><strong>${escapeHtml(filteredSummary.total_count)}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalAmount)}</span><strong>${escapeHtml(formatMoney(filteredSummary.total_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.paidAmount)}</span><strong>${escapeHtml(formatMoney(filteredSummary.paid_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.dueAmount)}</span><strong>${escapeHtml(formatMoney(filteredSummary.due_amount))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.invoice)}</th>
                <th>${escapeHtml(t.customer)}</th>
                <th>${escapeHtml(t.order)}</th>
                <th>${escapeHtml(t.total)}</th>
                <th>${escapeHtml(t.paidCol)}</th>
                <th>${escapeHtml(t.dueCol)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.payment)}</th>
                <th>${escapeHtml(t.accounting)}</th>
                <th>${escapeHtml(t.issueDate)}</th>
                <th>${escapeHtml(t.dueDate)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.invoice)}</td>
                      <td>${escapeHtml(row.customer)}</td>
                      <td>${escapeHtml(row.order)}</td>
                      <td class="num">${escapeHtml(formatMoney(row.total))}</td>
                      <td class="num">${escapeHtml(formatMoney(row.paid))}</td>
                      <td class="num">${escapeHtml(formatMoney(row.due))}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.payment)}</td>
                      <td>${escapeHtml(row.accounting)}</td>
                      <td>${escapeHtml(row.issueDate)}</td>
                      <td>${escapeHtml(row.dueDate)}</td>
                    </tr>
                  `,
                )
                .join("")}
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-lg border bg-card shadow-none">
              <CardHeader className="min-h-[112px] px-6 py-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-5 w-20" />
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
    );
  }

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
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadInvoices({ silent: true })}
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
            className="h-9 rounded-lg"
            onClick={exportExcel}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {t.export}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={printPage}
          >
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <Button
            asChild
            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
          >
            <Link href="/system/invoices/create">
              <Plus className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalInvoices}
          value={formatInteger(summary.total_count)}
          trend={`${formatInteger(filteredInvoices.length)}+`}
        />

        <KpiCard
          title={t.totalAmount}
          value={<MoneyValue value={summary.total_amount} />}
          trend={t.totalAmountTrend}
        />

        <KpiCard
          title={t.paidAmount}
          value={<MoneyValue value={summary.paid_amount} />}
          trend={t.paidAmountTrend}
        />

        <KpiCard
          title={t.dueAmount}
          value={<MoneyValue value={summary.due_amount} />}
          trend={t.dueAmountTrend}
        />
      </div>

      {error ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 text-right">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">{t.errorTitle}</p>
                <p className="text-sm text-red-700">{error || t.errorDesc}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadInvoices()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-2 lg:flex-1">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-[360px]">
                  <Search
                    className={cn(
                      "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                      locale === "ar" ? "right-3" : "left-3",
                    )}
                  />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder={t.searchPlaceholder}
                    className={cn(
                      "h-9 rounded-lg bg-background",
                      locale === "ar" ? "pr-9" : "pl-9",
                    )}
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as InvoiceStatus);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background lg:w-[128px]">
                    <CheckCircle2 className="h-4 w-4" />
                    <SelectValue placeholder={t.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    <SelectItem value="draft">{t.draft}</SelectItem>
                    <SelectItem value="issued">{t.issued}</SelectItem>
                    <SelectItem value="paid">{t.paid}</SelectItem>
                    <SelectItem value="partially_paid">{t.partially_paid}</SelectItem>
                    <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={paymentFilter}
                  onValueChange={(value) => {
                    setPaymentFilter(value as PaymentFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background lg:w-[150px]">
                    <ShieldCheck className="h-4 w-4" />
                    <SelectValue placeholder={t.payment} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allPayments}</SelectItem>
                    <SelectItem value="paid">{t.paymentPaid}</SelectItem>
                    <SelectItem value="partial">{t.paymentPartial}</SelectItem>
                    <SelectItem value="unpaid">{t.paymentUnpaid}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={accountingFilter}
                  onValueChange={(value) => {
                    setAccountingFilter(value as AccountingFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background lg:w-[155px]">
                    <ReceiptText className="h-4 w-4" />
                    <SelectValue placeholder={t.accounting} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allAccounting}</SelectItem>
                    <SelectItem value="posted">{t.accountingPosted}</SelectItem>
                    <SelectItem value="pending">{t.accountingPending}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.from}</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => {
                      setDateFrom(event.target.value);
                      setPage(1);
                    }}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.to}</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(event) => {
                      setDateTo(event.target.value);
                      setPage(1);
                    }}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-lg bg-background">
                    <ColumnsIcon className="h-4 w-4" />
                    {t.columns}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                  <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(
                    [
                      ["select", t.selected],
                      ["invoice", t.invoice],
                      ["customer", t.customer],
                      ["order", t.order],
                      ["total", t.total],
                      ["paid", t.paidCol],
                      ["due", t.dueCol],
                      ["status", t.status],
                      ["payment", t.payment],
                      ["accounting", t.accounting],
                      ["issueDate", t.issueDate],
                      ["dueDate", t.dueDate],
                      ["actions", t.actions],
                    ] as [ColumnKey, string][]
                  ).map(([key, label]) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={visibleColumns[key]}
                      onCheckedChange={(checked) =>
                        setVisibleColumns((current) => ({
                          ...current,
                          [key]: Boolean(checked),
                        }))
                      }
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                onClick={resetFilters}
              >
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-lg bg-background">
                    <ArrowUpDown className="h-4 w-4" />
                    {t.sort}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-52">
                  {(
                    [
                      ["newest", t.newest],
                      ["oldest", t.oldest],
                      ["highest_total", t.highestTotal],
                      ["highest_due", t.highestDue],
                      ["highest_paid", t.highestPaid],
                      ["due_soon", t.dueSoon],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={sortKey === key}
                      onCheckedChange={() => {
                        setSortKey(key);
                        setPage(1);
                      }}
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {selectedIds.length > 0 ? (
                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-background"
                  onClick={() => setSelectedIds([])}
                >
                  <XCircle className="h-4 w-4" />
                  {t.clearSelection} ({formatInteger(selectedIds.length)})
                </Button>
              ) : null}

              {hasActiveFilters ? (
                <Badge variant="secondary" className="h-9 rounded-lg px-3 text-xs font-semibold">
                  {t.activeFilters}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[1220px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {visibleColumns.select ? (
                      <TableHeaderCell className="w-[46px] px-3">
                        <Checkbox
                          checked={allPageSelected}
                          onCheckedChange={(checked) =>
                            toggleSelectAllPage(Boolean(checked))
                          }
                          aria-label={t.selected}
                        />
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.invoice ? (
                      <TableHeaderCell className="w-[205px]">
                        <HeaderSortButton
                          active={sortKey === "newest"}
                          onClick={() => {
                            setSortKey("newest");
                            setPage(1);
                          }}
                        >
                          {t.invoice}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.customer ? (
                      <TableHeaderCell className="w-[190px]">{t.customer}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.order ? (
                      <TableHeaderCell className="w-[140px]">{t.order}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.total ? (
                      <TableHeaderCell className="w-[112px]">
                        <HeaderSortButton
                          active={sortKey === "highest_total"}
                          onClick={() => {
                            setSortKey("highest_total");
                            setPage(1);
                          }}
                        >
                          {t.total}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.paid ? (
                      <TableHeaderCell className="w-[112px]">
                        <HeaderSortButton
                          active={sortKey === "highest_paid"}
                          onClick={() => {
                            setSortKey("highest_paid");
                            setPage(1);
                          }}
                        >
                          {t.paidCol}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.due ? (
                      <TableHeaderCell className="w-[112px]">
                        <HeaderSortButton
                          active={sortKey === "highest_due"}
                          onClick={() => {
                            setSortKey("highest_due");
                            setPage(1);
                          }}
                        >
                          {t.dueCol}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.status ? (
                      <TableHeaderCell className="w-[112px]">{t.status}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.payment ? (
                      <TableHeaderCell className="w-[128px]">{t.payment}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.accounting ? (
                      <TableHeaderCell className="w-[118px]">{t.accounting}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.issueDate ? (
                      <TableHeaderCell className="w-[112px]">{t.issueDate}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.dueDate ? (
                      <TableHeaderCell className="w-[112px]">
                        <HeaderSortButton
                          active={sortKey === "due_soon"}
                          onClick={() => {
                            setSortKey("due_soon");
                            setPage(1);
                          }}
                        >
                          {t.dueDate}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.actions ? (
                      <TableHeaderCell className="w-[72px] text-center">
                        {t.actions}
                      </TableHeaderCell>
                    ) : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedInvoices.length ? (
                    paginatedInvoices.map((invoice) => {
                      const overdue = isInvoiceOverdue(invoice);

                      return (
                        <TableRow key={invoice.id} className="h-[62px]">
                          {visibleColumns.select ? (
                            <TableBodyCell className="w-[46px] px-3">
                              <Checkbox
                                checked={selectedIds.includes(invoice.id)}
                                onCheckedChange={(checked) =>
                                  toggleSelectInvoice(invoice.id, Boolean(checked))
                                }
                                aria-label={invoice.invoice_number}
                              />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.invoice ? (
                            <TableBodyCell className="w-[205px]">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                                  <ReceiptText className="h-4 w-4 text-muted-foreground" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <Link
                                    href={`/system/invoices/${invoice.id}`}
                                    className="block truncate text-sm font-semibold text-foreground hover:underline"
                                  >
                                    {invoice.invoice_number}
                                  </Link>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {invoice.invoice_type || "—"}
                                  </p>
                                </div>
                              </div>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.customer ? (
                            <TableBodyCell className="w-[190px]">
                              <div className="min-w-0">
                                {invoice.customer_id ? (
                                  <Link
                                    href={`/system/customers/${invoice.customer_id}`}
                                    className="block truncate text-sm font-medium text-foreground hover:underline"
                                  >
                                    {invoice.customer_name || invoice.customer?.name || "—"}
                                  </Link>
                                ) : (
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {invoice.customer_name || invoice.customer?.name || "—"}
                                  </p>
                                )}

                                <p className="truncate text-xs text-muted-foreground">
                                  {invoice.customer?.phone || invoice.customer?.email || "—"}
                                </p>
                              </div>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.order ? (
                            <TableBodyCell className="w-[140px]">
                              {invoice.order_id ? (
                                <Link
                                  href={`/system/orders/${invoice.order_id}`}
                                  className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                                >
                                  <span className="truncate">
                                    {invoice.order?.order_number || `#${invoice.order_id}`}
                                  </span>
                                  <FileText className="h-3.5 w-3.5 shrink-0" />
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.total ? (
                            <TableBodyCell className="w-[112px]">
                              <MoneyValue value={invoice.total_amount} />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.paid ? (
                            <TableBodyCell className="w-[112px]">
                              <MoneyValue value={invoice.paid_amount} />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.due ? (
                            <TableBodyCell className="w-[112px]">
                              <div className="min-w-0 space-y-1">
                                <MoneyValue value={invoice.due_amount} />
                                {overdue ? (
                                  <Badge
                                    variant="outline"
                                    className="max-w-full rounded-full border-red-500/30 bg-red-50 px-2 py-0.5 text-[10px] text-red-700 hover:bg-red-50"
                                  >
                                    <span className="truncate">{t.overdue}</span>
                                  </Badge>
                                ) : null}
                              </div>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.status ? (
                            <TableBodyCell className="w-[112px]">
                              <StatusBadge status={invoice.status} locale={locale} />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.payment ? (
                            <TableBodyCell className="w-[128px]">
                              <PaymentBadge invoice={invoice} locale={locale} />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.accounting ? (
                            <TableBodyCell className="w-[118px]">
                              <AccountingBadge
                                posted={invoice.is_accounting_posted}
                                locale={locale}
                              />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.issueDate ? (
                            <TableBodyCell className="w-[112px]">
                              <span className="block truncate text-sm tabular-nums text-muted-foreground">
                                {formatDate(invoice.issue_date)}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.dueDate ? (
                            <TableBodyCell className="w-[112px]">
                              <span className="block truncate text-sm tabular-nums text-muted-foreground">
                                {formatDate(invoice.due_date)}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.actions ? (
                            <TableBodyCell className="w-[72px] text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    disabled={actionLoadingId === invoice.id}
                                  >
                                    {actionLoadingId === invoice.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreHorizontal className="h-4 w-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                  align={locale === "ar" ? "start" : "end"}
                                  className="w-52"
                                >
                                  <DropdownMenuItem asChild>
                                    <Link href={`/system/invoices/${invoice.id}`}>
                                      <Eye className="h-4 w-4" />
                                      {t.view}
                                    </Link>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => void copyInvoiceNumber(invoice)}
                                  >
                                    <Copy className="h-4 w-4" />
                                    {t.copyNumber}
                                  </DropdownMenuItem>

                                  {canIssueInvoice(invoice) ? (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        void postInvoiceAction(invoice, "issue")
                                      }
                                    >
                                      <Send className="h-4 w-4" />
                                      {t.issue}
                                    </DropdownMenuItem>
                                  ) : null}

                                  {canCancelInvoice(invoice) ? (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600 focus:text-red-600"
                                        onClick={() =>
                                          void postInvoiceAction(invoice, "cancel")
                                        }
                                      >
                                        <XCircle className="h-4 w-4" />
                                        {t.cancel}
                                      </DropdownMenuItem>
                                    </>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableBodyCell>
                          ) : null}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={visibleColumnCount} className="h-72">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                            <ReceiptText className="h-6 w-6 text-muted-foreground" />
                          </div>

                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {hasActiveFilters ? t.noResultsTitle : t.noDataTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {hasActiveFilters ? t.noResultsDesc : t.noDataDesc}
                            </p>
                          </div>

                          {hasActiveFilters ? (
                            <Button
                              variant="outline"
                              className="h-9 rounded-lg"
                              onClick={resetFilters}
                            >
                              <RotateCcw className="h-4 w-4" />
                              {t.reset}
                            </Button>
                          ) : (
                            <Button
                              asChild
                              className="h-9 rounded-lg bg-black text-white hover:bg-black/90"
                            >
                              <Link href="/system/invoices/create">
                                <Plus className="h-4 w-4" />
                                {t.create}
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {t.showing}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(paginatedInvoices.length)}
              </span>{" "}
              {t.of}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(filteredInvoices.length)}
              </span>{" "}
              {t.rows}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                {t.previous}
              </Button>

              <div className="rounded-lg border bg-background px-3 py-2 text-sm tabular-nums">
                {t.page} {formatInteger(currentPage)} {t.of}{" "}
                {formatInteger(totalPages)}
              </div>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(current + 1, totalPages))
                }
              >
                {t.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}