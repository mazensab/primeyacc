"use client";
/* ============================================================
   📂 primey_frontend/app/company/payments/page.tsx
   🧠 PrimeyAcc — Company Payments Center Page
   ------------------------------------------------------------
   ✅ PrimeyAcc Approved Design
   ✅ Real API only, no fake demo data
   ✅ Company scoped APIs through backend session
   ✅ Unified receipts + payments monitoring center
   ✅ Links to receipt/payment voucher operational pages
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ English numbers/money always
   ✅ SAR icon from /currency/sar.svg
   ✅ NEXT_PUBLIC_API_URL only
============================================================ */
import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  Banknote,
  CalendarIcon,
  FileSpreadsheet,
  FileText,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  TriangleAlert,
  WalletCards,
  ExternalLink,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
type PaymentKind = "receipt" | "payment";
type KindFilter = "all" | PaymentKind;
type StatusFilter = "all" | "draft" | "confirmed" | "cancelled";
type MethodFilter =
  "all" | "CASH" | "BANK_TRANSFER" | "CARD" | "WALLET" | "CHECK" | "OTHER";
type SortKey =
  "newest" | "oldest" | "amount_high" | "amount_low" | "number" | "party";
type PaymentRecord = {
  id: string;
  kind: PaymentKind;
  number: string;
  partyId: string;
  partyName: string;
  partyPhone: string;
  linkedDocumentId: string;
  linkedDocumentNumber: string;
  linkedDocumentPaymentStatus: string;
  treasuryAccountId: string;
  treasuryAccountName: string;
  treasuryAccountType: string;
  treasuryAccountingAccountId: string;
  treasuryAccountingAccountCode: string;
  treasuryAccountingAccountName: string;
  treasuryTransactionId: string;
  treasuryTransactionNumber: string;
  treasuryTransactionStatus: string;
  accountingEntryId: string;
  accountingEntryNumber: string;
  accountingEntryStatus: string;
  amount: number;
  currency: string;
  method: MethodFilter;
  methodLabel: string;
  status: Exclude<StatusFilter, "all">;
  date: string | null;
  reference: string;
  description: string;
  notes: string;
  createdAt: string | null;
};
type DataColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};
const API_PATHS = {
  receipts: "/api/company/treasury/customer-payments/",
  payments: "/api/company/treasury/supplier-payments/",
} as const;
const paymentMethods: MethodFilter[] = [
  "all",
  "CASH",
  "BANK_TRANSFER",
  "CARD",
  "WALLET",
  "CHECK",
  "OTHER",
];
const translations = {
  ar: {
    moduleBadge: "الخزينة والمدفوعات",
    title: "المدفوعات",
    subtitle:
      "إدارة سندات القبض والصرف ومراجعة التدفقات النقدية والحركات المرتبطة بها.",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    printVoucher: "طباعة السند",
    printBlocked:
      "تعذر فتح نافذة طباعة السند. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.",
    reset: "إعادة ضبط",
    search: "بحث",
    all: "الكل",
    from: "من",
    to: "إلى",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    numberSort: "رقم السند",
    partySort: "الطرف",
    openReceipt: "إضافة سند قبض",
    openPayment: "إضافة سند صرف",
    receipts: "سندات القبض",
    payments: "سندات الصرف",
    netFlow: "صافي التدفق",
    totalReceipts: "إجمالي المقبوضات",
    totalPayments: "إجمالي المصروفات",
    totalVouchers: "إجمالي السندات",
    confirmed: "مؤكد",
    draft: "مسودة",
    cancelled: "ملغي",
    confirmedCount: "مؤكدة",
    draftCount: "مسودات",
    cancelledCount: "ملغاة",
    shortcutsTitle: "اختصارات المدفوعات",
    shortcutsDesc: "انتقال سريع للصفحات التشغيلية المرتبطة بالمدفوعات.",
    receiptVoucher: "سند قبض",
    paymentVoucher: "سند صرف",
    cashboxes: "الصناديق",
    bankAccounts: "الحسابات البنكية",
    tableTitle: "سجل المدفوعات",
    tableDesc: "سندات القبض والصرف المسجلة في الشركة.",
    searchPlaceholder: "ابحث برقم السند أو الطرف أو المرجع أو حساب الخزينة...",
    kind: "النوع",
    status: "الحالة",
    method: "الطريقة",
    voucherNo: "رقم السند",
    party: "الطرف",
    document: "المستند",
    treasuryAccount: "حساب الخزينة",
    amount: "المبلغ",
    date: "التاريخ",
    accounting: "المحاسبة",
    movement: "حركة الخزينة",
    reference: "المرجع",
    actions: "الإجراءات",
    cash: "نقدي",
    bankTransfer: "تحويل بنكي",
    card: "بطاقة",
    wallet: "محفظة",
    check: "شيك",
    other: "أخرى",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    sar: "ر.س",
    unknown: "غير محدد",
    noDataTitle: "لا توجد مدفوعات",
    noDataDesc: "لا توجد سندات مسجلة حاليًا.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    partialWarningTitle: "تم تحميل الصفحة جزئيًا",
    partialWarningDesc:
      "تعذر تحميل جزء من بيانات المدفوعات، لذلك تظهر البيانات المتاحة حاليًا فقط.",
    errorTitle: "تعذر تحميل المدفوعات",
    errorDesc: "تأكد من تسجيل الدخول للشركة ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    generatedAt: "تم الإنشاء في",
    refreshed: "تم تحديث المدفوعات.",
    open: "فتح",
  },
  en: {
    moduleBadge: "Treasury & Payments",
    title: "Payments",
    subtitle:
      "Manage receipt and payment vouchers and review their related cash movements.",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    printVoucher: "Print voucher",
    printBlocked:
      "The voucher print window could not be opened. Allow pop-ups and try again.",
    reset: "Reset",
    search: "Search",
    all: "All",
    from: "From",
    to: "To",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    numberSort: "Voucher number",
    partySort: "Party",
    openReceipt: "Add receipt voucher",
    openPayment: "Add payment voucher",
    receipts: "Receipt vouchers",
    payments: "Payment vouchers",
    netFlow: "Net cash flow",
    totalReceipts: "Total receipts",
    totalPayments: "Total payments",
    totalVouchers: "Total vouchers",
    confirmed: "Confirmed",
    draft: "Draft",
    cancelled: "Cancelled",
    confirmedCount: "Confirmed",
    draftCount: "Draft",
    cancelledCount: "Cancelled",
    shortcutsTitle: "Payment shortcuts",
    shortcutsDesc: "Quick access to payment-related operational pages.",
    receiptVoucher: "Receipt voucher",
    paymentVoucher: "Payment voucher",
    cashboxes: "Cashboxes",
    bankAccounts: "Bank accounts",
    tableTitle: "Payments register",
    tableDesc: "Receipt and payment vouchers recorded for the company.",
    searchPlaceholder:
      "Search by voucher number, party, reference, or treasury account...",
    kind: "Type",
    status: "Status",
    method: "Method",
    voucherNo: "Voucher No.",
    party: "Party",
    document: "Document",
    treasuryAccount: "Treasury account",
    amount: "Amount",
    date: "Date",
    accounting: "Accounting",
    movement: "Treasury movement",
    reference: "Reference",
    actions: "Actions",
    cash: "Cash",
    bankTransfer: "Bank transfer",
    card: "Card",
    wallet: "Wallet",
    check: "Check",
    other: "Other",
    showing: "Showing",
    of: "of",
    rows: "rows",
    sar: "SAR",
    unknown: "Unknown",
    noDataTitle: "No payments",
    noDataDesc: "No vouchers are currently recorded.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    partialWarningTitle: "Page loaded partially",
    partialWarningDesc:
      "Part of the payment data could not be loaded, so only available records are shown.",
    errorTitle: "Could not load payments",
    errorDesc:
      "Make sure you are signed in to the company and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    generatedAt: "Generated at",
    refreshed: "Payments refreshed.",
    open: "Open",
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
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
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
function formatReportDateTime(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function paymentDetailHref(row: PaymentRecord) {
  const base =
    row.kind === "payment"
      ? "/company/treasury/payment-vouchers"
      : "/company/treasury/receipt-vouchers";
  const identifier = row.number || row.id;
  return identifier ? `${base}/${encodeURIComponent(identifier)}` : base;
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function getApiBaseUrl() {
  const envBase = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return envBase.endsWith("/api") ? envBase.slice(0, -4) : envBase;
}
function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}
async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal,
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
    const message =
      normalizeText(record.message) ||
      normalizeText(record.detail) ||
      normalizeText(record.error) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return (payload || {}) as T;
}
function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  const data = record.data;
  const result = record.result;
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.rows)) return record.rows;
  if (Array.isArray(data)) return data;
  if (Array.isArray(result)) return result;
  const dataRecord = asRecord(data);
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.records)) return dataRecord.records;
  if (Array.isArray(dataRecord.rows)) return dataRecord.rows;
  const resultRecord = asRecord(result);
  if (Array.isArray(resultRecord.results)) return resultRecord.results;
  if (Array.isArray(resultRecord.items)) return resultRecord.items;
  return [];
}
function normalizeStatus(value: unknown): PaymentRecord["status"] {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "CONFIRMED" || normalized === "POSTED") return "confirmed";
  if (normalized === "CANCELLED" || normalized === "CANCELED")
    return "cancelled";
  return "draft";
}
function statusLabel(status: StatusFilter, locale: Locale) {
  const t = translations[locale];
  if (status === "confirmed") return t.confirmed;
  if (status === "cancelled") return t.cancelled;
  if (status === "draft") return t.draft;
  return t.all;
}
function methodLabel(method: MethodFilter, locale: Locale) {
  const t = translations[locale];
  if (method === "BANK_TRANSFER") return t.bankTransfer;
  if (method === "CARD") return t.card;
  if (method === "WALLET") return t.wallet;
  if (method === "CHECK") return t.check;
  if (method === "OTHER") return t.other;
  if (method === "all") return t.all;
  return t.cash;
}
function kindLabel(kind: KindFilter, locale: Locale) {
  const t = translations[locale];
  if (kind === "receipt") return t.receipts;
  if (kind === "payment") return t.payments;
  return t.all;
}
function getStatusBadgeClass(value: string) {
  if (value === "confirmed")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "draft") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-border bg-muted/30 text-muted-foreground";
}
function getKindBadgeClass(value: PaymentKind) {
  return value === "receipt"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
}
function rowDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}
function isWithinDate(dateValue: string | null, from: string, to: string) {
  const normalized = formatDate(dateValue);
  if (normalized === "—") return !from && !to;
  if (from && normalized < from) return false;
  if (to && normalized > to) return false;
  return true;
}
function sortRows(rows: PaymentRecord[], sort: SortKey) {
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return rowDateValue(a.date) - rowDateValue(b.date);
    if (sort === "amount_high") return b.amount - a.amount;
    if (sort === "amount_low") return a.amount - b.amount;
    if (sort === "number")
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    if (sort === "party") return a.partyName.localeCompare(b.partyName);
    return rowDateValue(b.date) - rowDateValue(a.date);
  });
}
function normalizePayment(value: unknown, kind: PaymentKind): PaymentRecord {
  const record = asRecord(value);
  const isReceipt = kind === "receipt";
  return {
    id: `${kind}-${normalizeText(record.id || record.pk || record.uuid)}`,
    kind,
    number: normalizeText(
      record.payment_number || record.number || record.reference,
      "—",
    ),
    partyId: normalizeText(isReceipt ? record.customer_id : record.supplier_id),
    partyName: normalizeText(
      isReceipt ? record.customer_name : record.supplier_name,
      "—",
    ),
    partyPhone: normalizeText(
      isReceipt ? record.customer_phone : record.supplier_phone,
    ),
    linkedDocumentId: normalizeText(
      isReceipt ? record.sales_invoice_id : record.purchase_bill_id,
    ),
    linkedDocumentNumber: normalizeText(
      isReceipt
        ? record.sales_invoice_number || record.invoice_number
        : record.purchase_bill_number || record.bill_number,
    ),
    linkedDocumentPaymentStatus: normalizeText(
      isReceipt ? record.invoice_payment_status : record.bill_payment_status,
    ),
    treasuryAccountId: normalizeText(record.treasury_account_id),
    treasuryAccountName: normalizeText(record.treasury_account_name, "—"),
    treasuryAccountType: normalizeText(record.treasury_account_type),
    treasuryAccountingAccountId: normalizeText(
      record.treasury_accounting_account_id,
    ),
    treasuryAccountingAccountCode: normalizeText(
      record.treasury_accounting_account_code,
    ),
    treasuryAccountingAccountName: normalizeText(
      record.treasury_accounting_account_name,
    ),
    treasuryTransactionId: normalizeText(record.treasury_transaction_id),
    treasuryTransactionNumber: normalizeText(
      record.treasury_transaction_number,
    ),
    treasuryTransactionStatus: normalizeText(
      record.treasury_transaction_status,
    ),
    accountingEntryId: normalizeText(record.accounting_entry_id),
    accountingEntryNumber: normalizeText(record.accounting_entry_number),
    accountingEntryStatus: normalizeText(record.accounting_entry_status),
    amount: toNumber(record.amount),
    currency: normalizeText(record.currency, "SAR"),
    method: normalizeText(record.payment_method, "CASH") as MethodFilter,
    methodLabel: normalizeText(record.payment_method_label),
    status: normalizeStatus(record.status),
    date: normalizeText(record.payment_date) || null,
    reference: normalizeText(record.reference),
    description: normalizeText(record.description),
    notes: normalizeText(record.notes),
    createdAt: normalizeText(record.created_at) || null,
  };
}
function parsePaymentDate(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}
function formatPaymentDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function PaymentDatePicker({
  value,
  onChange,
  locale,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  placeholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = parsePaymentDate(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={placeholder}
          title={placeholder}
          className={cn(
            "h-9 w-[150px] justify-start bg-background px-3 text-start font-normal shadow-none",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span dir="ltr" lang="en" className="truncate tabular-nums">
            {value || placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align={locale === "ar" ? "end" : "start"}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              onChange(formatPaymentDate(date));
              setOpen(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
function MoneyValue({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold tabular-nums">
      <span>{formatMoney(value)}</span>
      <Image
        src="/currency/sar.svg"
        alt={label}
        width={14}
        height={14}
        className="h-3.5 w-3.5"
      />
    </span>
  );
}
function StatusBadge({ value, label }: { value: string; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap rounded-full px-2.5 py-1 text-xs",
        getStatusBadgeClass(value),
      )}
    >
      {label}
    </Badge>
  );
}
function KindBadge({ value, label }: { value: PaymentKind; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap rounded-full px-2.5 py-1 text-xs",
        getKindBadgeClass(value),
      )}
    >
      {label}
    </Badge>
  );
}
function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  money,
  t,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  money?: boolean;
  t: (typeof translations)[Locale];
}) {
  return (
    <Card className="group overflow-hidden rounded-lg border bg-card shadow-none transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">
            {title}
          </CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {money ? (
              <MoneyValue value={value} label={t.sar} />
            ) : (
              formatInteger(value)
            )}
          </CardTitle>
        </div>
        <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-full max-w-3xl" />
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-28" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-lg border bg-card shadow-none">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-lg border bg-card shadow-none">
        <CardHeader>
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
function EmptyTableState({
  title,
  description,
  showReset,
  onReset,
  resetLabel,
}: {
  title: string;
  description: string;
  showReset?: boolean;
  onReset?: () => void;
  resetLabel: string;
}) {
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {showReset && onReset ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="rounded-lg"
        >
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}
function DataTable<T extends { id: string }>({
  rows,
  allRowsCount,
  columns,
  rowKey,
  emptyTitle,
  emptyDescription,
  noResultsTitle,
  noResultsDescription,
  hasFilters,
  onReset,
  resetLabel,
  showingLabel,
  ofLabel,
  rowsLabel,
  onRowClick,
}: {
  rows: T[];
  allRowsCount: number;
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  emptyTitle: string;
  emptyDescription: string;
  noResultsTitle: string;
  noResultsDescription: string;
  hasFilters: boolean;
  onReset: () => void;
  resetLabel: string;
  showingLabel: string;
  ofLabel: string;
  rowsLabel: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="overflow-x-auto">
          <Table className="min-w-[1180px] table-fixed">
            <TableHeader>
              <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "h-11 whitespace-nowrap px-4 text-start text-xs font-semibold text-muted-foreground",
                      column.className,
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    className={cn(
                      "h-[64px] transition-colors",
                      onRowClick ? "cursor-pointer hover:bg-muted/40" : "",
                    )}
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (
                        target.closest(
                          "button, a, input, select, textarea, [role='menuitem']",
                        )
                      ) {
                        return;
                      }
                      onRowClick?.(row);
                    }}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          "h-[64px] overflow-hidden px-4 text-start align-middle",
                          column.className,
                        )}
                      >
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-72">
                    <EmptyTableState
                      title={hasFilters ? noResultsTitle : emptyTitle}
                      description={
                        hasFilters ? noResultsDescription : emptyDescription
                      }
                      showReset={hasFilters}
                      onReset={onReset}
                      resetLabel={resetLabel}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {showingLabel}{" "}
        <span className="font-medium text-foreground tabular-nums">
          {formatInteger(rows.length)}
        </span>{" "}
        {ofLabel}{" "}
        <span className="font-medium text-foreground tabular-nums">
          {formatInteger(allRowsCount)}
        </span>{" "}
        {rowsLabel}
      </div>
    </div>
  );
}
export default function CompanyPaymentsPage() {
  const router = useRouter();
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [rows, setRows] = React.useState<PaymentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  React.useEffect(() => {
    // primeyAccountQueryPrefill: open reports already filtered by the selected account.
    const params = new URLSearchParams(window.location.search);
    const query =
      params.get("account_code") ||
      params.get("search") ||
      params.get("q") ||
      params.get("account") ||
      params.get("account_id") ||
      "";
    if (query.trim()) {
      setSearch(query.trim());
    }
  }, []);
  const [kind, setKind] = React.useState<KindFilter>("all");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [method, setMethod] = React.useState<MethodFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
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
  const loadRows = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        setWarnings([]);
        const params = new URLSearchParams({
          page: "1",
          page_size: "150",
          ordering: "-payment_date",
        });
        const results = await Promise.allSettled([
          fetchJson<unknown>(
            makeApiUrl(API_PATHS.receipts, params),
            controller.signal,
          ),
          fetchJson<unknown>(
            makeApiUrl(API_PATHS.payments, params),
            controller.signal,
          ),
        ]);
        const failedMessages = results
          .filter(
            (result): result is PromiseRejectedResult =>
              result.status === "rejected",
          )
          .map((result) =>
            normalizeText(
              result.reason instanceof Error
                ? result.reason.message
                : result.reason,
            ),
          );
        const receiptPayload =
          results[0].status === "fulfilled" ? results[0].value : {};
        const paymentPayload =
          results[1].status === "fulfilled" ? results[1].value : {};
        const receiptRows = extractArray(receiptPayload).map((item) =>
          normalizePayment(item, "receipt"),
        );
        const paymentRows = extractArray(paymentPayload).map((item) =>
          normalizePayment(item, "payment"),
        );
        setRows(sortRows([...receiptRows, ...paymentRows], "newest"));
        const hasPartialData =
          failedMessages.length > 0 && failedMessages.length < results.length;
        setWarnings(hasPartialData ? failedMessages.filter(Boolean) : []);
        if (failedMessages.length === results.length) {
          throw new Error(failedMessages[0] || t.errorDesc);
        }
        if (hasPartialData) {
          toast.warning(t.partialWarningTitle);
        } else if (silent) {
          toast.success(t.refreshed);
        }
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      return () => controller.abort();
    },
    [t],
  );
  React.useEffect(() => {
    void loadRows();
  }, [loadRows]);
  const stats = React.useMemo(() => {
    const receipts = rows.filter((row) => row.kind === "receipt");
    const payments = rows.filter((row) => row.kind === "payment");
    const totalReceipts = receipts.reduce((sum, row) => sum + row.amount, 0);
    const totalPayments = payments.reduce((sum, row) => sum + row.amount, 0);
    return {
      total: rows.length,
      receipts: receipts.length,
      payments: payments.length,
      totalReceipts,
      totalPayments,
      netFlow: totalReceipts - totalPayments,
      confirmed: rows.filter((row) => row.status === "confirmed").length,
      draft: rows.filter((row) => row.status === "draft").length,
      cancelled: rows.filter((row) => row.status === "cancelled").length,
    };
  }, [rows]);
  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const haystack = [
        row.number,
        row.partyName,
        row.partyPhone,
        row.linkedDocumentNumber,
        row.treasuryAccountName,
        row.treasuryTransactionNumber,
        row.accountingEntryNumber,
        row.treasuryAccountingAccountCode,
        row.treasuryAccountingAccountName,
        row.reference,
        row.description,
        row.notes,
        row.kind,
        row.status,
        row.method,
      ]
        .join(" ")
        .toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (kind !== "all" && row.kind !== kind) return false;
      if (status !== "all" && row.status !== status) return false;
      if (method !== "all" && row.method !== method) return false;
      return isWithinDate(row.date || row.createdAt, dateFrom, dateTo);
    });
    return sortRows(filtered, sort);
  }, [dateFrom, dateTo, kind, method, rows, search, sort, status]);
  const hasFilters = Boolean(
    search ||
    kind !== "all" ||
    status !== "all" ||
    method !== "all" ||
    sort !== "newest" ||
    dateFrom ||
    dateTo,
  );
  function resetFilters() {
    setSearch("");
    setKind("all");
    setStatus("all");
    setMethod("all");
    setSort("newest");
    setDateFrom("");
    setDateTo("");
  }
  function buildReportDocument(
    mode: "excel" | "print",
    includeSummary = true,
  ) {
    const reportTitle = includeSummary ? t.title : t.tableTitle;
    const reportSubtitle = includeSummary ? t.subtitle : t.tableDesc;
    const generatedAt = formatReportDateTime();
    const filterParts = [
      search.trim() ? `${t.search}: ${search.trim()}` : "",
      kind !== "all" ? `${t.kind}: ${kindLabel(kind, locale)}` : "",
      status !== "all" ? `${t.status}: ${statusLabel(status, locale)}` : "",
      method !== "all" ? `${t.method}: ${methodLabel(method, locale)}` : "",
      dateFrom ? `${t.from}: ${dateFrom}` : "",
      dateTo ? `${t.to}: ${dateTo}` : "",
    ].filter(Boolean);
    const summaryItems = includeSummary
      ? [
          [t.netFlow, formatMoney(stats.netFlow)],
          [t.totalReceipts, formatMoney(stats.totalReceipts)],
          [t.totalPayments, formatMoney(stats.totalPayments)],
          [t.totalVouchers, formatInteger(stats.total)],
          [t.confirmedCount, formatInteger(stats.confirmed)],
          [t.draftCount, formatInteger(stats.draft)],
          [t.cancelledCount, formatInteger(stats.cancelled)],
        ]
      : [];
    const summaryMarkup = summaryItems.length
      ? mode === "print"
        ? `<div class="summary-grid">${summaryItems
            .map(
              ([label, value]) =>
                `<div class="summary-item"><div class="summary-label">${escapeHtml(
                  label,
                )}</div><div class="summary-value">${escapeHtml(
                  value,
                )}</div></div>`,
            )
            .join("")}</div>`
        : `<table class="summary"><tbody><tr>${summaryItems
            .map(
              ([label, value]) =>
                `<td><div class="summary-label">${escapeHtml(
                  label,
                )}</div><div class="summary-value">${escapeHtml(
                  value,
                )}</div></td>`,
            )
            .join("")}</tr></tbody></table>`
      : "";
    const bodyRows = filteredRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(kindLabel(row.kind, locale))}</td>
            <td class="text">${escapeHtml(row.number)}</td>
            <td>${escapeHtml(row.partyName)}</td>
            <td class="text">${escapeHtml(
              row.linkedDocumentNumber || row.linkedDocumentId || "—",
            )}</td>
            <td>${escapeHtml(row.treasuryAccountName)}</td>
            <td class="number">${escapeHtml(formatMoney(row.amount))}</td>
            <td>${escapeHtml(methodLabel(row.method, locale))}</td>
            <td>${escapeHtml(statusLabel(row.status, locale))}</td>
            <td class="text">${escapeHtml(formatDate(row.date))}</td>
            <td class="text">${escapeHtml(
              [
                row.accountingEntryNumber,
                row.treasuryAccountingAccountCode ||
                  row.treasuryAccountingAccountName,
              ]
                .filter(Boolean)
                .join(" / ") || "—",
            )}</td>
            <td class="text">${escapeHtml(
              row.treasuryTransactionNumber || "—",
            )}</td>
          </tr>`,
      )
      .join("");
    const officeXml =
      mode === "excel"
        ? `<!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${escapeHtml(reportTitle.slice(0, 31))}</x:Name>
                  <x:WorksheetOptions>
                    ${locale === "ar" ? "<x:DisplayRightToLeft/>" : ""}
                    <x:FreezePanes/>
                    <x:FrozenNoSplit/>
                    <x:SplitHorizontal>1</x:SplitHorizontal>
                    <x:TopRowBottomPane>1</x:TopRowBottomPane>
                    <x:FitToPage/>
                    <x:Print>
                      <x:ValidPrinterInfo/>
                      <x:HorizontalResolution>600</x:HorizontalResolution>
                      <x:VerticalResolution>600</x:VerticalResolution>
                    </x:Print>
                    <x:Selected/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
        <![endif]-->`
        : "";
    return `<!doctype html>
      <html
        lang="${locale}"
        dir="${dir}"
        xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40"
      >
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(reportTitle)}</title>
          ${officeXml}
          <style>
            * { box-sizing: border-box; }
            html,
            body {
              width: 100%;
              margin: 0;
              background: #fff;
            }
            body {
              font-family: Tahoma, Arial, sans-serif;
              color: #111;
              padding: ${mode === "print" ? "0" : "8px"};
              font-size: 12px;
            }
            .report-sheet {
              width: ${mode === "print" ? "100%" : "1440px"};
              max-width: none;
              margin: 0 auto;
            }
            .report-header {
              border-bottom: 2px solid #111;
              margin-bottom: 12px;
              padding-bottom: 9px;
            }
            h1 {
              margin: 0;
              font-size: ${mode === "print" ? "24px" : "22px"};
              font-weight: 700;
              line-height: 1.25;
            }
            .subtitle {
              margin: 5px 0 0;
              color: #4b5563;
              line-height: 1.6;
              font-size: ${mode === "print" ? "11px" : "12px"};
            }
            .meta {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              margin-top: 7px;
              color: #4b5563;
              font-size: 10px;
            }
            .filters {
              margin: 7px 0 0;
              color: #374151;
              font-size: 10px;
            }
            .summary {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              margin: 0 0 12px;
            }
            .summary td {
              border: 1px solid #000;
              padding: 9px 8px;
              vertical-align: top;
            }
            .summary-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin: 0 0 12px;
            }
            .summary-item {
              flex: 1 1 22%;
              min-width: 145px;
              border: 1px solid #000;
              padding: 9px 8px;
              vertical-align: top;
            }
            .summary-label {
              color: #4b5563;
              font-size: 10px;
              line-height: 1.35;
            }
            .summary-value {
              margin-top: 4px;
              font-size: 15px;
              font-weight: 700;
              direction: ltr;
              font-variant-numeric: tabular-nums;
            }
            .data {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            .data th,
            .data td {
              border: 1px solid #000;
              padding: ${mode === "print" ? "5px 4px" : "7px 6px"};
              text-align: start;
              vertical-align: middle;
              overflow-wrap: anywhere;
              word-break: normal;
              line-height: 1.35;
            }
            .data th {
              background: #e5e7eb;
              font-weight: 700;
              white-space: normal;
              font-size: ${mode === "print" ? "10px" : "11px"};
            }
            .data td {
              font-size: ${mode === "print" ? "9.5px" : "11px"};
            }
            .text {
              mso-number-format: '\\@';
              direction: ltr;
              font-variant-numeric: tabular-nums;
            }
            .number {
              mso-number-format: '0.00';
              direction: ltr;
              text-align: end;
              font-variant-numeric: tabular-nums;
            }
            @page {
              size: A4 landscape;
              margin: 6mm;
            }
            @media print {
              html,
              body,
              .report-sheet {
                width: 100% !important;
                max-width: none !important;
              }
              body {
                padding: 0 !important;
              }
              thead {
                display: table-header-group;
              }
              tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <main class="report-sheet">
          <header class="report-header">
            <h1>${escapeHtml(reportTitle)}</h1>
            <p class="subtitle">${escapeHtml(reportSubtitle)}</p>
            <div class="meta">
              <span>${escapeHtml(t.generatedAt)}: ${escapeHtml(
                generatedAt,
              )}</span>
              <span>
                ${escapeHtml(t.showing)}
                ${escapeHtml(formatInteger(filteredRows.length))}
                ${escapeHtml(t.of)}
                ${escapeHtml(formatInteger(rows.length))}
              </span>
            </div>
            ${
              filterParts.length
                ? `<p class="filters">${escapeHtml(filterParts.join(" | "))}</p>`
                : ""
            }
          </header>
          ${summaryMarkup}
          <table class="data">
            <colgroup>
              ${
                mode === "print"
                  ? `
                    <col style="width: 7%" />
                    <col style="width: 12%" />
                    <col style="width: 12%" />
                    <col style="width: 9%" />
                    <col style="width: 14%" />
                    <col style="width: 8%" />
                    <col style="width: 7%" />
                    <col style="width: 7%" />
                    <col style="width: 8%" />
                    <col style="width: 10%" />
                    <col style="width: 6%" />
                  `
                  : `
                    <col style="width: 95px" />
                    <col style="width: 165px" />
                    <col style="width: 155px" />
                    <col style="width: 130px" />
                    <col style="width: 185px" />
                    <col style="width: 105px" />
                    <col style="width: 100px" />
                    <col style="width: 95px" />
                    <col style="width: 105px" />
                    <col style="width: 205px" />
                    <col style="width: 130px" />
                  `
              }
            </colgroup>
            <thead>
              <tr>
                <th>${escapeHtml(t.kind)}</th>
                <th>${escapeHtml(t.voucherNo)}</th>
                <th>${escapeHtml(t.party)}</th>
                <th>${escapeHtml(t.document)}</th>
                <th>${escapeHtml(t.treasuryAccount)}</th>
                <th>${escapeHtml(`${t.amount} (${t.sar})`)}</th>
                <th>${escapeHtml(t.method)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.accounting)}</th>
                <th>${escapeHtml(t.movement)}</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
          ${
            mode === "print"
              ? `<script>
                  window.onload = () => {
                    window.focus();
                    window.print();
                  };
                  window.onafterprint = () => window.close();
                <\/script>`
              : ""
          }
          </main>
        </body>
      </html>`;
  }

  function exportExcel(includeSummary = true) {
    if (!filteredRows.length) {
      toast.warning(t.exportEmpty);
      return;
    }
    const html = buildReportDocument("excel", includeSummary);
    const blob = new Blob(["\uFEFF", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `company-payments-${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(
      locale === "ar"
        ? "تم تجهيز ملف Excel بنجاح."
        : "Excel file prepared successfully.",
    );
  }

  function openPrintReport(includeSummary: boolean) {
    if (!filteredRows.length) {
      toast.warning(t.printEmpty);
      return;
    }
    const popup = window.open("", "_blank", "width=1400,height=900");
    if (!popup) {
      toast.error(t.errorDesc);
      return;
    }
    popup.opener = null;
    popup.document.write(buildReportDocument("print", includeSummary));
    popup.document.close();
    toast.success(
      locale === "ar"
        ? "تم تجهيز صفحة الطباعة."
        : "Print page prepared.",
    );
  }

  function printPage() {
    openPrintReport(true);
  }

  function printTable() {
    openPrintReport(false);
  }

  function printVoucher(row: PaymentRecord) {
    const printWindow = window.open(
      `${paymentDetailHref(row)}?print=voucher`,
      "_blank",
    );

    if (!printWindow) {
      toast.error(t.printBlocked);
      return;
    }

    printWindow.opener = null;
  }

  const columns: DataColumn<PaymentRecord>[] = [
    {
      key: "kind",
      label: t.kind,
      className: "sticky start-0 z-10 w-[115px] bg-inherit",
      render: (row) => (
        <KindBadge value={row.kind} label={kindLabel(row.kind, locale)} />
      ),
    },
    {
      key: "number",
      label: t.voucherNo,
      className: "w-[175px]",
      render: (row) => (
        <div className="min-w-0">
          <span className="block max-w-full cursor-pointer select-none truncate font-semibold text-foreground">
            {row.number}
          </span>
          {row.reference && row.reference !== "—" ? (
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              {row.reference}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "party",
      label: t.party,
      className: "w-[185px]",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.partyName}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {row.partyPhone || row.partyId || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "date",
      label: t.date,
      className: "w-[110px]",
      render: (row) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatDate(row.date)}
        </span>
      ),
    },
    {
      key: "amount",
      label: t.amount,
      className: "w-[125px]",
      render: (row) => <MoneyValue value={row.amount} label={t.sar} />,
    },
    {
      key: "status",
      label: t.status,
      className: "w-[110px]",
      render: (row) => (
        <StatusBadge
          value={row.status}
          label={statusLabel(row.status, locale)}
        />
      ),
    },
    {
      key: "account",
      label: t.treasuryAccount,
      className: "w-[180px]",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">
            {row.treasuryAccountName}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {methodLabel(row.method, locale)}
          </p>
        </div>
      ),
    },
    {
      key: "document",
      label: t.document,
      className: "w-[150px]",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">
            {row.linkedDocumentNumber || "—"}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {row.linkedDocumentPaymentStatus || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "accounting",
      label: t.accounting,
      className: "w-[210px]",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">
            {row.accountingEntryNumber || "—"}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {row.treasuryTransactionNumber || "—"}
          </p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground tabular-nums">
            {row.treasuryAccountingAccountCode
              ? `${row.treasuryAccountingAccountCode} — ${
                  row.treasuryAccountingAccountName ||
                  (locale === "ar" ? "حساب محاسبي" : "Accounting account")
                }`
              : "—"}
          </p>
        </div>
      ),
    },

    {
      key: "actions",
      label: locale === "ar" ? "الإجراءات" : "Actions",
      className: "sticky end-0 z-10 w-[76px] bg-inherit text-center",
      render: (row) => (
        <div
          className="flex items-center justify-center"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg bg-background"
                aria-label={
                  locale === "ar" ? "إجراءات السند" : "Voucher actions"
                }
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={locale === "ar" ? "start" : "end"}
              className="w-44"
            >
              <DropdownMenuItem
                onClick={() => router.push(paymentDetailHref(row))}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {locale === "ar" ? "فتح التفاصيل" : "Open details"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => printVoucher(row)}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                {t.printVoucher}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
  if (loading) {
    return (
      <main
        dir={dir}
        className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-[1500px]">
          <DashboardSkeleton />
        </div>
      </main>
    );
  }
  if (error) {
    return (
      <main
        dir={dir}
        className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
      >
        <Card className="mx-auto max-w-[900px] rounded-lg border-destructive/30 bg-card shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="h-5 w-5" />
              {t.errorTitle}
            </CardTitle>
            <CardDescription>{error || t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => void loadRows()}
              className="rounded-lg"
              disabled={refreshing}
            >
              {refreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main
      dir={dir}
      className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1 text-start">
            <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
              {t.subtitle}
            </p>
            <nav
              aria-label={t.moduleBadge}
              className="flex flex-wrap items-center gap-5 pt-2"
            >
              <Link
                href="/company/treasury"
                className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {locale === "ar" ? "الخزينة" : "Treasury"}
              </Link>
              <Link
                href="/company/treasury/receipt-vouchers"
                className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.receipts}
              </Link>
              <Link
                href="/company/treasury/payment-vouchers"
                className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.payments}
              </Link>
              <Link
                href="/company/payments"
                aria-current="page"
                className="border-b-2 border-foreground pb-1 text-sm font-semibold text-foreground"
              >
                {t.title}
              </Link>
            </nav>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadRows({ silent: true })}
              disabled={refreshing}
            >
              <RefreshCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
              />
              {t.refresh}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => exportExcel(true)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t.export}
            </Button>
            <Button type="button" variant="outline" onClick={printPage}>
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
            <Button asChild>
              <Link href="/company/treasury/receipt-vouchers">
                <ArrowDownLeft className="h-4 w-4" />
                {t.openReceipt}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/company/treasury/payment-vouchers">
                <ArrowUpRight className="h-4 w-4" />
                {t.openPayment}
              </Link>
            </Button>
          </div>
        </header>
        {warnings.length ? (
          <Card className="rounded-lg border-amber-200 bg-amber-50 text-amber-950 shadow-none">
            <CardContent className="flex gap-3 p-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.partialWarningTitle}</p>
                <p className="mt-1 text-sm opacity-80">
                  {t.partialWarningDesc}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t.netFlow}
            value={stats.netFlow}
            description={t.netFlow}
            icon={WalletCards}
            money
            t={t}
          />
          <KpiCard
            title={t.totalReceipts}
            value={stats.totalReceipts}
            description={`${t.receipts}: ${formatInteger(stats.receipts)}`}
            icon={ArrowDownLeft}
            money
            t={t}
          />
          <KpiCard
            title={t.totalPayments}
            value={stats.totalPayments}
            description={`${t.payments}: ${formatInteger(stats.payments)}`}
            icon={ArrowUpRight}
            money
            t={t}
          />
          <KpiCard
            title={t.totalVouchers}
            value={stats.total}
            description={`${t.confirmedCount}: ${formatInteger(stats.confirmed)} · ${t.draftCount}: ${formatInteger(stats.draft)}`}
            icon={ReceiptText}
            t={t}
          />
        </div>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <CardTitle className="text-base">{t.shortcutsTitle}</CardTitle>
            <CardDescription>{t.shortcutsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4 sm:px-6">
            {[
              {
                href: "/company/treasury/receipt-vouchers",
                title: t.receiptVoucher,
                description: t.receipts,
                icon: ArrowDownLeft,
              },
              {
                href: "/company/treasury/payment-vouchers",
                title: t.paymentVoucher,
                description: t.payments,
                icon: ArrowUpRight,
              },
              {
                href: "/company/treasury/cashboxes",
                title: t.cashboxes,
                description: t.treasuryAccount,
                icon: Banknote,
              },
              {
                href: "/company/treasury/bank-accounts",
                title: t.bankAccounts,
                description: t.treasuryAccount,
                icon: FileText,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between gap-4 rounded-lg border bg-background p-4 transition hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle>{t.tableTitle}</CardTitle>
                <CardDescription className="mt-1">
                  {t.tableDesc}
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg bg-background"
                  onClick={() => exportExcel(false)}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg bg-background"
                  onClick={printTable}
                >
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-9 rounded-lg bg-background ps-9"
                  />
                </div>
                <Select
                  value={kind}
                  onValueChange={(value) => setKind(value as KindFilter)}
                >
                  <SelectTrigger className="h-9 rounded-lg bg-background sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="receipt">{t.receipts}</SelectItem>
                    <SelectItem value="payment">{t.payments}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as StatusFilter)}
                >
                  <SelectTrigger className="h-9 rounded-lg bg-background sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="draft">{t.draft}</SelectItem>
                    <SelectItem value="confirmed">{t.confirmed}</SelectItem>
                    <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={method}
                  onValueChange={(value) => setMethod(value as MethodFilter)}
                >
                  <SelectTrigger className="h-9 rounded-lg bg-background sm:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((item) => (
                      <SelectItem key={item} value={item}>
                        {methodLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-2">
                  <span className="text-xs text-muted-foreground">
                    {t.from}
                  </span>
                  <PaymentDatePicker
                    value={dateFrom}
                    onChange={setDateFrom}
                    locale={locale}
                    placeholder={locale === "ar" ? "من تاريخ" : "From date"}
                  />
                </div>
                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-2">
                  <span className="text-xs text-muted-foreground">{t.to}</span>
                  <PaymentDatePicker
                    value={dateTo}
                    onChange={setDateTo}
                    locale={locale}
                    placeholder={locale === "ar" ? "إلى تاريخ" : "To date"}
                  />
                </div>
                <Select
                  value={sort}
                  onValueChange={(value) => setSort(value as SortKey)}
                >
                  <SelectTrigger className="h-9 rounded-lg bg-background sm:w-[160px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
                    <SelectItem value="amount_low">{t.amountLow}</SelectItem>
                    <SelectItem value="number">{t.numberSort}</SelectItem>
                    <SelectItem value="party">{t.partySort}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-background"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
            <DataTable
              rows={filteredRows}
              allRowsCount={rows.length}
              columns={columns}
              rowKey={(row) => row.id}
              onRowClick={(row) => router.push(paymentDetailHref(row))}
              emptyTitle={t.noDataTitle}
              emptyDescription={t.noDataDesc}
              noResultsTitle={t.noResultsTitle}
              noResultsDescription={t.noResultsDesc}
              hasFilters={hasFilters}
              onReset={resetFilters}
              resetLabel={t.reset}
              showingLabel={t.showing}
              ofLabel={t.of}
              rowsLabel={t.rows}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
