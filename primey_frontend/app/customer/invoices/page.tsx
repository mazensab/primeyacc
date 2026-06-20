"use client";

/* ============================================================
   📂 app/customer/invoices/page.tsx
   🧾 Primey Care | Customer Invoices Page
   ------------------------------------------------------------
   ✅ صفحة محتوى فقط داخل الشِل الموحد
   ✅ لا تنشئ سايدر أو هيدر مستقل
   ✅ تعرض فواتير العميل الحالي فقط
   ✅ تعتمد على /api/customers/me/ ثم /api/invoices/?customer_id=
   ✅ fallback آمن من latest_invoices
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
  Printer,
  ReceiptText,
  RefreshCcw,
  Search,
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

type InvoiceStatus =
  | "draft"
  | "issued"
  | "sent"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "cancelled"
  | "refunded"
  | "UNKNOWN";

type InvoiceType =
  | "standard"
  | "tax"
  | "simplified_tax"
  | "credit_note"
  | "debit_note"
  | "subscription"
  | "UNKNOWN";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  orderId: string;
  orderNumber: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  createdAt: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  currency: string;
};

type InvoiceSummary = {
  totalInvoices: number;
  draftInvoices: number;
  issuedInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
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
  invoices?: unknown;
  latest_invoices?: unknown;
};

const SAR_ICON_PATH = "/currency/sar.svg";

const DEFAULT_SUMMARY: InvoiceSummary = {
  totalInvoices: 0,
  draftInvoices: 0,
  issuedInvoices: 0,
  paidInvoices: 0,
  overdueInvoices: 0,
  totalAmount: 0,
  paidAmount: 0,
  dueAmount: 0,
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
    "invoice",
    "customer",
    "order",
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

function normalizeInvoiceStatus(value: unknown): InvoiceStatus {
  const status = String(value || "").toLowerCase();

  if (status === "draft") return "draft";
  if (status === "issued") return "issued";
  if (status === "sent") return "sent";
  if (status === "paid") return "paid";
  if (status === "partial" || status === "partially_paid") return "partially_paid";
  if (status === "overdue") return "overdue";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "refunded") return "refunded";

  return "UNKNOWN";
}

function normalizeInvoiceType(value: unknown): InvoiceType {
  const type = String(value || "").toLowerCase();

  if (type === "standard") return "standard";
  if (type === "tax") return "tax";
  if (type === "simplified_tax") return "simplified_tax";
  if (type === "credit_note") return "credit_note";
  if (type === "debit_note") return "debit_note";
  if (type === "subscription") return "subscription";

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
    title: isArabic ? "فواتيري" : "My Invoices",
    subtitle: isArabic
      ? "راجع فواتيرك والمبالغ المدفوعة والمستحقة."
      : "Review your invoices, paid amounts, and due balances.",

    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة PDF" : "Print PDF",
    search: isArabic ? "بحث" : "Search",
    searchPlaceholder: isArabic
      ? "ابحث برقم الفاتورة، رقم الطلب، الحالة..."
      : "Search by invoice number, order number, status...",
    all: isArabic ? "الكل" : "All",

    totalInvoices: isArabic ? "إجمالي الفواتير" : "Total Invoices",
    draftInvoices: isArabic ? "مسودات" : "Drafts",
    issuedInvoices: isArabic ? "مصدرة" : "Issued",
    paidInvoices: isArabic ? "مدفوعة" : "Paid",
    overdueInvoices: isArabic ? "متأخرة" : "Overdue",
    totalAmount: isArabic ? "إجمالي الفواتير" : "Total Amount",
    paidAmount: isArabic ? "المدفوع" : "Paid",
    dueAmount: isArabic ? "المستحق" : "Due",

    tableTitle: isArabic ? "قائمة الفواتير" : "Invoices List",
    tableDesc: isArabic
      ? "فواتيرك المسجلة في Primey Care."
      : "Your invoices in Primey Care.",

    invoice: isArabic ? "الفاتورة" : "Invoice",
    invoiceType: isArabic ? "النوع" : "Type",
    status: isArabic ? "الحالة" : "Status",
    order: isArabic ? "الطلب" : "Order",
    issueDate: isArabic ? "تاريخ الإصدار" : "Issue Date",
    dueDate: isArabic ? "تاريخ الاستحقاق" : "Due Date",
    total: isArabic ? "الإجمالي" : "Total",
    paid: isArabic ? "المدفوع" : "Paid",
    due: isArabic ? "المستحق" : "Due",
    action: isArabic ? "الإجراء" : "Action",
    view: isArabic ? "عرض" : "View",

    loadError: isArabic ? "تعذر تحميل الفواتير." : "Unable to load invoices.",
    loadSuccess: isArabic ? "تم تحديث الفواتير." : "Invoices refreshed.",
    exportSuccess: isArabic ? "تم تجهيز ملف Excel." : "Excel file prepared.",
    exportEmpty: isArabic
      ? "لا توجد بيانات قابلة للتصدير."
      : "No data available to export.",
    printSuccess: isArabic ? "تم تجهيز نافذة الطباعة." : "Print window prepared.",
    printError: isArabic ? "تعذر فتح نافذة الطباعة." : "Unable to open print window.",

    emptyTitle: isArabic ? "لا توجد فواتير حتى الآن" : "No invoices yet",
    emptyText: isArabic
      ? "ستظهر فواتيرك هنا بعد إصدار أول فاتورة."
      : "Your invoices will appear here after the first invoice is issued.",
    noResultsTitle: isArabic ? "لا توجد نتائج مطابقة" : "No matching results",
    noResultsText: isArabic
      ? "جرّب تغيير البحث أو الفلاتر."
      : "Try changing search or filters.",

    noData: isArabic ? "غير متوفر" : "Not available",
    generatedAt: isArabic ? "تاريخ التصدير" : "Generated At",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",

    statusOptions: {
      all: isArabic ? "كل الحالات" : "All Statuses",
      draft: isArabic ? "مسودة" : "Draft",
      issued: isArabic ? "مصدرة" : "Issued",
      sent: isArabic ? "مرسلة" : "Sent",
      paid: isArabic ? "مدفوعة" : "Paid",
      partially_paid: isArabic ? "مدفوعة جزئيًا" : "Partially Paid",
      overdue: isArabic ? "متأخرة" : "Overdue",
      cancelled: isArabic ? "ملغاة" : "Cancelled",
      refunded: isArabic ? "مستردة" : "Refunded",
    },

    invoiceStatus: {
      draft: isArabic ? "مسودة" : "Draft",
      issued: isArabic ? "مصدرة" : "Issued",
      sent: isArabic ? "مرسلة" : "Sent",
      paid: isArabic ? "مدفوعة" : "Paid",
      partially_paid: isArabic ? "مدفوعة جزئيًا" : "Partially Paid",
      overdue: isArabic ? "متأخرة" : "Overdue",
      cancelled: isArabic ? "ملغاة" : "Cancelled",
      refunded: isArabic ? "مستردة" : "Refunded",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<InvoiceStatus, string>,

    invoiceTypeMap: {
      standard: isArabic ? "قياسية" : "Standard",
      tax: isArabic ? "ضريبية" : "Tax",
      simplified_tax: isArabic ? "ضريبية مبسطة" : "Simplified Tax",
      credit_note: isArabic ? "إشعار دائن" : "Credit Note",
      debit_note: isArabic ? "إشعار مدين" : "Debit Note",
      subscription: isArabic ? "اشتراك" : "Subscription",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<InvoiceType, string>,
  };
}

function normalizeInvoice(row: unknown, index: number): InvoiceRow {
  const obj = asDict(row);
  const order = asDict(obj.order);
  const customer = asDict(obj.customer);

  const id = String(
    getValue(obj, "id") ||
      getValue(obj, "invoice_id") ||
      getValue(obj, "pk") ||
      index + 1,
  );

  const totalAmount = toNumber(
    getValue(obj, "total_amount") ||
      getValue(obj, "grand_total") ||
      getValue(obj, "amount"),
  );

  const paidAmount = toNumber(getValue(obj, "paid_amount"));

  return {
    id,
    invoiceNumber: String(
      getValue(obj, "invoice_number") ||
        getValue(obj, "number") ||
        getValue(obj, "reference") ||
        `INV-${id}`,
    ),
    invoiceType: normalizeInvoiceType(
      getValue(obj, "invoice_type") ||
        getValue(obj, "type"),
    ),
    status: normalizeInvoiceStatus(getValue(obj, "status")),
    orderId: String(getValue(obj, "order_id") || order.id || ""),
    orderNumber: String(
      getValue(obj, "order_number") ||
        order.order_number ||
        order.number ||
        "",
    ),
    customerName: String(
      getValue(obj, "customer_name") ||
        customer.display_name ||
        customer.full_name ||
        customer.name ||
        "",
    ),
    issueDate: String(
      getValue(obj, "issue_date") ||
        getValue(obj, "issued_at") ||
        getValue(obj, "created_at") ||
        "",
    ),
    dueDate: String(getValue(obj, "due_date") || ""),
    createdAt: String(getValue(obj, "created_at") || ""),
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
    dueAmount: toNumber(
      getValue(obj, "due_amount") ||
        getValue(obj, "remaining_amount") ||
        Math.max(totalAmount - paidAmount, 0),
    ),
    currency: String(getValue(obj, "currency") || "SAR"),
  };
}

function buildSummary(rows: InvoiceRow[]): InvoiceSummary {
  return rows.reduce<InvoiceSummary>(
    (summary, row) => {
      summary.totalInvoices += 1;
      summary.totalAmount += row.totalAmount;
      summary.paidAmount += row.paidAmount;
      summary.dueAmount += row.dueAmount;

      if (row.status === "draft") summary.draftInvoices += 1;
      if (row.status === "issued" || row.status === "sent") {
        summary.issuedInvoices += 1;
      }
      if (row.status === "paid") summary.paidInvoices += 1;
      if (row.status === "overdue") summary.overdueInvoices += 1;

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

function invoiceTone(status: InvoiceStatus) {
  if (status === "paid") return "success";
  if (status === "issued" || status === "sent" || status === "partially_paid") {
    return "info";
  }
  if (status === "draft") return "warning";
  if (status === "overdue" || status === "cancelled" || status === "refunded") {
    return "danger";
  }
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
  rows: InvoiceRow[];
  locale: AppLocale;
}) {
  const t = dictionary(locale);
  const generatedAt = new Date().toLocaleString("en-US");

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.invoiceNumber)}</td>
          <td>${escapeHtml(t.invoiceTypeMap[row.invoiceType])}</td>
          <td>${escapeHtml(t.invoiceStatus[row.status])}</td>
          <td>${escapeHtml(row.orderNumber || "-")}</td>
          <td>${escapeHtml(formatDate(row.issueDate))}</td>
          <td>${escapeHtml(formatDate(row.dueDate))}</td>
          <td>${escapeHtml(formatMoney(row.totalAmount))}</td>
          <td>${escapeHtml(formatMoney(row.paidAmount))}</td>
          <td>${escapeHtml(formatMoney(row.dueAmount))}</td>
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
              <th>${escapeHtml(t.invoice)}</th>
              <th>${escapeHtml(t.invoiceType)}</th>
              <th>${escapeHtml(t.status)}</th>
              <th>${escapeHtml(t.order)}</th>
              <th>${escapeHtml(t.issueDate)}</th>
              <th>${escapeHtml(t.dueDate)}</th>
              <th>${escapeHtml(t.total)}</th>
              <th>${escapeHtml(t.paid)}</th>
              <th>${escapeHtml(t.due)}</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;
}

export default function CustomerInvoicesPage() {
  const [locale, setLocale] = useState<AppLocale>("ar");
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
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
            row.invoiceNumber,
            row.orderNumber,
            row.customerName,
            t.invoiceTypeMap[row.invoiceType],
            t.invoiceStatus[row.status],
            row.currency,
          ]
            .join(" ")
            .toLowerCase()
            .includes(clean);

        const matchesStatus =
          statusFilter === "all" || row.status === statusFilter;

        return matchesQuery && matchesStatus;
      })
      .sort((a, b) =>
        String(b.issueDate || b.createdAt).localeCompare(
          String(a.issueDate || a.createdAt),
        ),
      );
  }, [query, rows, statusFilter, t]);

  const displaySummary = useMemo(
    () => buildSummary(filteredRows),
    [filteredRows],
  );

  const hasSearchOrFilters = query.trim().length > 0 || statusFilter !== "all";

  const loadInvoices = useCallback(
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

        let sourceRows = unwrapArray(mePayload, ["latest_invoices", "invoices"]);

        if (isValidId(customerId)) {
          try {
            const invoicesPayload = await fetchJson(
              `/api/invoices/?customer_id=${encodeURIComponent(
                customerId,
              )}&page=1&page_size=200`,
            );

            const apiRows = unwrapArray(invoicesPayload, [
              "invoices",
              "results",
              "items",
            ]);

            if (apiRows.length > 0) {
              sourceRows = apiRows;
            }
          } catch {
            // fallback إلى latest_invoices من /api/customers/me/
          }
        }

        const normalizedRows = sourceRows
          .map(normalizeInvoice)
          .filter((row) => isValidId(row.id) || row.invoiceNumber !== "-");

        setRows(normalizedRows);

        if (showToast) {
          toast.success(t.loadSuccess);
        }
      } catch (error) {
        console.error("Customer invoices load error:", error);
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
    anchor.download = `primey-care-customer-invoices-${Date.now()}.xls`;
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
    void loadInvoices(false);
  }, [loadInvoices]);

  return (
    <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Badge variant="outline" className="mb-2 rounded-full px-3 py-1">
            <ReceiptText className="h-3.5 w-3.5" />
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
            onClick={() => void loadInvoices(true)}
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
              onClick={() => void loadInvoices(true)}
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
              title={t.totalInvoices}
              value={formatNumber(displaySummary.totalInvoices)}
              icon={<ReceiptText className="h-5 w-5" />}
            />
            <KpiCard
              title={t.issuedInvoices}
              value={formatNumber(displaySummary.issuedInvoices)}
              icon={<FileText className="h-5 w-5" />}
            />
            <KpiCard
              title={t.paidInvoices}
              value={formatNumber(displaySummary.paidInvoices)}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <KpiCard
              title={t.overdueInvoices}
              value={formatNumber(displaySummary.overdueInvoices)}
              icon={<TimerReset className="h-5 w-5" />}
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
              icon={<CreditCard className="h-5 w-5" />}
            />
            <KpiCard
              title={t.dueAmount}
              value={<MoneyText value={displaySummary.dueAmount} />}
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
                    setStatusFilter(event.target.value as InvoiceStatus | "all")
                  }
                  className="h-11 rounded-2xl border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="all">{t.statusOptions.all}</option>
                  <option value="draft">{t.statusOptions.draft}</option>
                  <option value="issued">{t.statusOptions.issued}</option>
                  <option value="sent">{t.statusOptions.sent}</option>
                  <option value="paid">{t.statusOptions.paid}</option>
                  <option value="partially_paid">
                    {t.statusOptions.partially_paid}
                  </option>
                  <option value="overdue">{t.statusOptions.overdue}</option>
                  <option value="cancelled">{t.statusOptions.cancelled}</option>
                  <option value="refunded">{t.statusOptions.refunded}</option>
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
                  icon={<ReceiptText className="h-7 w-7 text-muted-foreground" />}
                  title={hasSearchOrFilters ? t.noResultsTitle : t.emptyTitle}
                  text={hasSearchOrFilters ? t.noResultsText : t.emptyText}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.invoice}</TableHead>
                        <TableHead>{t.invoiceType}</TableHead>
                        <TableHead>{t.status}</TableHead>
                        <TableHead>{t.order}</TableHead>
                        <TableHead>{t.issueDate}</TableHead>
                        <TableHead>{t.dueDate}</TableHead>
                        <TableHead>{t.total}</TableHead>
                        <TableHead>{t.paid}</TableHead>
                        <TableHead>{t.due}</TableHead>
                        <TableHead className="text-center">{t.action}</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={`${row.id}-${row.invoiceNumber}`}>
                          <TableCell>
                            <div className="min-w-[140px]">
                              <p className="font-semibold">{row.invoiceNumber}</p>
                              {row.currency ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {row.currency}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell>
                            <StatusBadge>
                              {t.invoiceTypeMap[row.invoiceType]}
                            </StatusBadge>
                          </TableCell>

                          <TableCell>
                            <StatusBadge tone={invoiceTone(row.status)}>
                              {t.invoiceStatus[row.status]}
                            </StatusBadge>
                          </TableCell>

                          <TableCell>
                            {row.orderNumber || row.orderId ? (
                              <div className="min-w-[120px]">
                                <p>{row.orderNumber || row.orderId}</p>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>

                          <TableCell>{formatDate(row.issueDate)}</TableCell>
                          <TableCell>{formatDate(row.dueDate)}</TableCell>

                          <TableCell>
                            <MoneyText value={row.totalAmount} />
                          </TableCell>

                          <TableCell>
                            <MoneyText value={row.paidAmount} />
                          </TableCell>

                          <TableCell>
                            <MoneyText value={row.dueAmount} />
                          </TableCell>

                          <TableCell className="text-center">
                            {isValidId(row.id) ? (
                              <Link href={`/customer/invoices/${row.id}`}>
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