"use client";

/* ============================================================
   📂 app/customer/payments/page.tsx
   💳 Primey Care | Customer Payments Page
   ------------------------------------------------------------
   ✅ صفحة محتوى فقط داخل الشِل الموحد
   ✅ لا تنشئ سايدر أو هيدر مستقل
   ✅ تعرض مدفوعات العميل الحالي فقط
   ✅ تعتمد على /api/customers/me/ ثم /api/payments/?customer_id=
   ✅ fallback آمن من latest_payments
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
  Banknote,
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

type PaymentRow = {
  id: string;
  paymentNumber: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  provider: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  paidAmount: number;
  currency: string;
  externalReference: string;
  transactionId: string;
  paidAt: string;
  confirmedAt: string;
  createdAt: string;
};

type PaymentSummary = {
  totalPayments: number;
  pendingPayments: number;
  confirmedPayments: number;
  cancelledPayments: number;
  failedPayments: number;
  refundedPayments: number;
  totalAmount: number;
  confirmedAmount: number;
  pendingAmount: number;
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
  payments?: unknown;
  latest_payments?: unknown;
};

const SAR_ICON_PATH = "/currency/sar.svg";

const DEFAULT_SUMMARY: PaymentSummary = {
  totalPayments: 0,
  pendingPayments: 0,
  confirmedPayments: 0,
  cancelledPayments: 0,
  failedPayments: 0,
  refundedPayments: 0,
  totalAmount: 0,
  confirmedAmount: 0,
  pendingAmount: 0,
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
    "payment",
    "customer",
    "invoice",
    "order",
    "gateway",
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

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value || "").toLowerCase();

  if (status === "pending") return "pending";
  if (status === "confirmed") return "confirmed";
  if (status === "paid") return "paid";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "failed") return "failed";
  if (status === "refunded") return "refunded";

  return "UNKNOWN";
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  const method = String(value || "").toLowerCase();

  if (method === "cash") return "cash";
  if (method === "bank_transfer" || method === "bank") return "bank_transfer";
  if (method === "gateway" || method === "online") return "gateway";
  if (method === "card" || method === "cards") return "card";
  if (method === "wallet" || method === "wallets") return "wallet";
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
    title: isArabic ? "مدفوعاتي" : "My Payments",
    subtitle: isArabic
      ? "راجع مدفوعاتك وحالات التأكيد والمراجع المالية."
      : "Review your payments, confirmation status, and references.",

    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة PDF" : "Print PDF",
    search: isArabic ? "بحث" : "Search",
    searchPlaceholder: isArabic
      ? "ابحث برقم الدفعة، الفاتورة، الطلب، المرجع..."
      : "Search by payment number, invoice, order, reference...",
    all: isArabic ? "الكل" : "All",

    totalPayments: isArabic ? "إجمالي المدفوعات" : "Total Payments",
    pendingPayments: isArabic ? "بانتظار التأكيد" : "Pending",
    confirmedPayments: isArabic ? "مؤكدة" : "Confirmed",
    cancelledPayments: isArabic ? "ملغاة" : "Cancelled",
    failedPayments: isArabic ? "فاشلة" : "Failed",
    refundedPayments: isArabic ? "مستردة" : "Refunded",
    totalAmount: isArabic ? "إجمالي المدفوعات" : "Total Amount",
    confirmedAmount: isArabic ? "المؤكد" : "Confirmed Amount",
    pendingAmount: isArabic ? "المعلق" : "Pending Amount",

    tableTitle: isArabic ? "قائمة المدفوعات" : "Payments List",
    tableDesc: isArabic
      ? "مدفوعاتك المسجلة في Primey Care."
      : "Your payments in Primey Care.",

    payment: isArabic ? "الدفعة" : "Payment",
    invoice: isArabic ? "الفاتورة" : "Invoice",
    order: isArabic ? "الطلب" : "Order",
    method: isArabic ? "طريقة الدفع" : "Method",
    status: isArabic ? "الحالة" : "Status",
    amount: isArabic ? "المبلغ" : "Amount",
    provider: isArabic ? "المزود" : "Provider",
    reference: isArabic ? "المرجع" : "Reference",
    paidAt: isArabic ? "تاريخ الدفع" : "Paid At",
    confirmedAt: isArabic ? "تاريخ التأكيد" : "Confirmed At",
    action: isArabic ? "الإجراء" : "Action",
    view: isArabic ? "عرض" : "View",

    loadError: isArabic ? "تعذر تحميل المدفوعات." : "Unable to load payments.",
    loadSuccess: isArabic ? "تم تحديث المدفوعات." : "Payments refreshed.",
    exportSuccess: isArabic ? "تم تجهيز ملف Excel." : "Excel file prepared.",
    exportEmpty: isArabic
      ? "لا توجد بيانات قابلة للتصدير."
      : "No data available to export.",
    printSuccess: isArabic ? "تم تجهيز نافذة الطباعة." : "Print window prepared.",
    printError: isArabic ? "تعذر فتح نافذة الطباعة." : "Unable to open print window.",

    emptyTitle: isArabic ? "لا توجد مدفوعات حتى الآن" : "No payments yet",
    emptyText: isArabic
      ? "ستظهر مدفوعاتك هنا بعد تسجيل أول دفعة."
      : "Your payments will appear here after the first payment is recorded.",
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
      confirmed: isArabic ? "مؤكدة" : "Confirmed",
      paid: isArabic ? "مدفوعة" : "Paid",
      cancelled: isArabic ? "ملغاة" : "Cancelled",
      failed: isArabic ? "فاشلة" : "Failed",
      refunded: isArabic ? "مستردة" : "Refunded",
    },

    methodOptions: {
      all: isArabic ? "كل الطرق" : "All Methods",
      cash: isArabic ? "كاش" : "Cash",
      bank_transfer: isArabic ? "تحويل بنكي" : "Bank Transfer",
      gateway: isArabic ? "بوابة دفع" : "Gateway",
      card: isArabic ? "بطاقة" : "Card",
      wallet: isArabic ? "محفظة" : "Wallet",
      tamara: isArabic ? "تمارا" : "Tamara",
      tabby: isArabic ? "تابي" : "Tabby",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<PaymentMethod | "all", string>,

    paymentStatus: {
      pending: isArabic ? "بانتظار التأكيد" : "Pending",
      confirmed: isArabic ? "مؤكدة" : "Confirmed",
      paid: isArabic ? "مدفوعة" : "Paid",
      cancelled: isArabic ? "ملغاة" : "Cancelled",
      failed: isArabic ? "فاشلة" : "Failed",
      refunded: isArabic ? "مستردة" : "Refunded",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<PaymentStatus, string>,

    paymentMethod: {
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

function normalizePayment(row: unknown, index: number): PaymentRow {
  const obj = asDict(row);
  const invoice = asDict(obj.invoice);
  const order = asDict(obj.order);
  const customer = asDict(obj.customer);

  const id = String(
    getValue(obj, "id") ||
      getValue(obj, "payment_id") ||
      getValue(obj, "pk") ||
      index + 1,
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
        `PAY-${id}`,
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
    customerName: String(
      getValue(obj, "customer_name") ||
        customer.display_name ||
        customer.full_name ||
        customer.name ||
        "",
    ),
    invoiceId: String(getValue(obj, "invoice_id") || invoice.id || ""),
    invoiceNumber: String(
      getValue(obj, "invoice_number") ||
        invoice.invoice_number ||
        invoice.number ||
        "",
    ),
    orderId: String(getValue(obj, "order_id") || order.id || ""),
    orderNumber: String(
      getValue(obj, "order_number") ||
        order.order_number ||
        order.number ||
        "",
    ),
    amount,
    paidAmount: amount,
    currency: String(getValue(obj, "currency") || "SAR"),
    externalReference: String(
      getValue(obj, "external_reference") ||
        getValue(obj, "gateway_reference") ||
        "",
    ),
    transactionId: String(
      getValue(obj, "transaction_id") ||
        getValue(obj, "gateway_transaction_id") ||
        "",
    ),
    paidAt: String(
      getValue(obj, "paid_at") ||
        getValue(obj, "payment_date") ||
        getValue(obj, "created_at") ||
        "",
    ),
    confirmedAt: String(
      getValue(obj, "confirmed_at") ||
        getValue(obj, "approved_at") ||
        "",
    ),
    createdAt: String(getValue(obj, "created_at") || ""),
  };
}

function buildSummary(rows: PaymentRow[]): PaymentSummary {
  return rows.reduce<PaymentSummary>(
    (summary, row) => {
      summary.totalPayments += 1;
      summary.totalAmount += row.paidAmount;

      if (row.status === "pending") {
        summary.pendingPayments += 1;
        summary.pendingAmount += row.paidAmount;
      }

      if (row.status === "confirmed" || row.status === "paid") {
        summary.confirmedPayments += 1;
        summary.confirmedAmount += row.paidAmount;
      }

      if (row.status === "cancelled") summary.cancelledPayments += 1;
      if (row.status === "failed") summary.failedPayments += 1;
      if (row.status === "refunded") summary.refundedPayments += 1;

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
  if (method === "bank_transfer") return "default";
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

function buildExportHtml({
  rows,
  locale,
}: {
  rows: PaymentRow[];
  locale: AppLocale;
}) {
  const t = dictionary(locale);
  const generatedAt = new Date().toLocaleString("en-US");

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.paymentNumber)}</td>
          <td>${escapeHtml(t.paymentStatus[row.status])}</td>
          <td>${escapeHtml(t.paymentMethod[row.paymentMethod])}</td>
          <td>${escapeHtml(row.invoiceNumber || "-")}</td>
          <td>${escapeHtml(row.orderNumber || "-")}</td>
          <td>${escapeHtml(formatMoney(row.paidAmount))}</td>
          <td>${escapeHtml(row.externalReference || row.transactionId || "-")}</td>
          <td>${escapeHtml(formatDate(row.paidAt))}</td>
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
              <th>${escapeHtml(t.payment)}</th>
              <th>${escapeHtml(t.status)}</th>
              <th>${escapeHtml(t.method)}</th>
              <th>${escapeHtml(t.invoice)}</th>
              <th>${escapeHtml(t.order)}</th>
              <th>${escapeHtml(t.amount)}</th>
              <th>${escapeHtml(t.reference)}</th>
              <th>${escapeHtml(t.paidAt)}</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;
}

export default function CustomerPaymentsPage() {
  const [locale, setLocale] = useState<AppLocale>("ar");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "all">("all");
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
            row.paymentNumber,
            row.invoiceNumber,
            row.orderNumber,
            row.provider,
            row.externalReference,
            row.transactionId,
            t.paymentStatus[row.status],
            t.paymentMethod[row.paymentMethod],
          ]
            .join(" ")
            .toLowerCase()
            .includes(clean);

        const matchesStatus =
          statusFilter === "all" || row.status === statusFilter;

        const matchesMethod =
          methodFilter === "all" || row.paymentMethod === methodFilter;

        return matchesQuery && matchesStatus && matchesMethod;
      })
      .sort((a, b) =>
        String(b.paidAt || b.confirmedAt || b.createdAt).localeCompare(
          String(a.paidAt || a.confirmedAt || a.createdAt),
        ),
      );
  }, [methodFilter, query, rows, statusFilter, t]);

  const displaySummary = useMemo(
    () => buildSummary(filteredRows),
    [filteredRows],
  );

  const hasSearchOrFilters =
    query.trim().length > 0 || statusFilter !== "all" || methodFilter !== "all";

  const loadPayments = useCallback(
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

        let sourceRows = unwrapArray(mePayload, ["latest_payments", "payments"]);

        if (isValidId(customerId)) {
          const endpoints = [
            `/api/payments/?customer_id=${encodeURIComponent(
              customerId,
            )}&page=1&page_size=200`,
            `/api/payments/list/?customer_id=${encodeURIComponent(
              customerId,
            )}&page=1&page_size=200`,
          ];

          for (const endpoint of endpoints) {
            try {
              const paymentsPayload = await fetchJson(endpoint);
              const apiRows = unwrapArray(paymentsPayload, [
                "payments",
                "results",
                "items",
              ]);

              if (apiRows.length > 0) {
                sourceRows = apiRows;
                break;
              }
            } catch {
              // fallback إلى latest_payments من /api/customers/me/
            }
          }
        }

        const normalizedRows = sourceRows
          .map(normalizePayment)
          .filter((row) => isValidId(row.id) || row.paymentNumber !== "-");

        setRows(normalizedRows);

        if (showToast) {
          toast.success(t.loadSuccess);
        }
      } catch (error) {
        console.error("Customer payments load error:", error);
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
    anchor.download = `primey-care-customer-payments-${Date.now()}.xls`;
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
    void loadPayments(false);
  }, [loadPayments]);

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
            onClick={() => void loadPayments(true)}
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
              onClick={() => void loadPayments(true)}
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
              title={t.totalPayments}
              value={formatNumber(displaySummary.totalPayments)}
              icon={<CreditCard className="h-5 w-5" />}
            />
            <KpiCard
              title={t.confirmedPayments}
              value={formatNumber(displaySummary.confirmedPayments)}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <KpiCard
              title={t.pendingPayments}
              value={formatNumber(displaySummary.pendingPayments)}
              icon={<TimerReset className="h-5 w-5" />}
            />
            <KpiCard
              title={t.totalAmount}
              value={<MoneyText value={displaySummary.totalAmount} />}
              icon={<WalletCards className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title={t.confirmedAmount}
              value={<MoneyText value={displaySummary.confirmedAmount} />}
              icon={<Banknote className="h-5 w-5" />}
            />
            <KpiCard
              title={t.pendingAmount}
              value={<MoneyText value={displaySummary.pendingAmount} />}
              icon={<FileText className="h-5 w-5" />}
            />
            <KpiCard
              title={t.cancelledPayments}
              value={formatNumber(
                displaySummary.cancelledPayments +
                  displaySummary.failedPayments +
                  displaySummary.refundedPayments,
              )}
              icon={<XCircle className="h-5 w-5" />}
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
                    setStatusFilter(event.target.value as PaymentStatus | "all")
                  }
                  className="h-11 rounded-2xl border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="all">{t.statusOptions.all}</option>
                  <option value="pending">{t.statusOptions.pending}</option>
                  <option value="confirmed">{t.statusOptions.confirmed}</option>
                  <option value="paid">{t.statusOptions.paid}</option>
                  <option value="cancelled">{t.statusOptions.cancelled}</option>
                  <option value="failed">{t.statusOptions.failed}</option>
                  <option value="refunded">{t.statusOptions.refunded}</option>
                </select>

                <select
                  value={methodFilter}
                  onChange={(event) =>
                    setMethodFilter(event.target.value as PaymentMethod | "all")
                  }
                  className="h-11 rounded-2xl border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="all">{t.methodOptions.all}</option>
                  <option value="cash">{t.methodOptions.cash}</option>
                  <option value="bank_transfer">
                    {t.methodOptions.bank_transfer}
                  </option>
                  <option value="gateway">{t.methodOptions.gateway}</option>
                  <option value="card">{t.methodOptions.card}</option>
                  <option value="wallet">{t.methodOptions.wallet}</option>
                  <option value="tamara">{t.methodOptions.tamara}</option>
                  <option value="tabby">{t.methodOptions.tabby}</option>
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
                  icon={<CreditCard className="h-7 w-7 text-muted-foreground" />}
                  title={hasSearchOrFilters ? t.noResultsTitle : t.emptyTitle}
                  text={hasSearchOrFilters ? t.noResultsText : t.emptyText}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.payment}</TableHead>
                        <TableHead>{t.status}</TableHead>
                        <TableHead>{t.method}</TableHead>
                        <TableHead>{t.invoice}</TableHead>
                        <TableHead>{t.order}</TableHead>
                        <TableHead>{t.amount}</TableHead>
                        <TableHead>{t.reference}</TableHead>
                        <TableHead>{t.paidAt}</TableHead>
                        <TableHead className="text-center">{t.action}</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={`${row.id}-${row.paymentNumber}`}>
                          <TableCell>
                            <div className="min-w-[150px]">
                              <p className="font-semibold">{row.paymentNumber}</p>
                              {row.provider ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {normalizeText(row.provider)}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell>
                            <StatusBadge tone={paymentTone(row.status)}>
                              {t.paymentStatus[row.status]}
                            </StatusBadge>
                          </TableCell>

                          <TableCell>
                            <StatusBadge tone={methodTone(row.paymentMethod)}>
                              {t.paymentMethod[row.paymentMethod]}
                            </StatusBadge>
                          </TableCell>

                          <TableCell>
                            {row.invoiceNumber || row.invoiceId ? (
                              <div className="min-w-[120px]">
                                <p>{row.invoiceNumber || row.invoiceId}</p>
                              </div>
                            ) : (
                              "-"
                            )}
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

                          <TableCell>
                            <MoneyText value={row.paidAmount} />
                          </TableCell>

                          <TableCell>
                            <div className="min-w-[140px]">
                              <p className="truncate">
                                {row.externalReference ||
                                  row.transactionId ||
                                  "-"}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>{formatDate(row.paidAt)}</TableCell>

                          <TableCell className="text-center">
                            {isValidId(row.id) ? (
                              <Link href={`/customer/payments/${row.id}`}>
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