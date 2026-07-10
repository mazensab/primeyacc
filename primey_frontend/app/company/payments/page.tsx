"use client";
/* ============================================================
   📂 primey_frontend/app/company/payments/page.tsx
   🧠 PrimeyAcc — Company Payments Center Page
   ------------------------------------------------------------
   ✅ Approved Premium company page pattern
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
   ✅ No localhost hardcoding except safe dev fallback
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
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
type MethodFilter = "all" | "CASH" | "BANK_TRANSFER" | "CARD" | "WALLET" | "CHECK" | "OTHER";
type SortKey = "newest" | "oldest" | "amount_high" | "amount_low" | "number" | "party";
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
    partialWarningDesc: "بعض واجهات المدفوعات لم تعد بيانات صالحة، لذلك تظهر البيانات المتاحة فقط.",
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
    searchPlaceholder: "Search by voucher number, party, reference, or treasury account...",
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
    partialWarningDesc: "Some payment APIs did not return valid data, so only available data is shown.",
    errorTitle: "Could not load payments",
    errorDesc: "Make sure you are signed in to the company and the backend is running, then try again.",
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
  return identifier
    ? `${base}/${encodeURIComponent(identifier)}`
    : base;
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function getApiBaseUrl() {
  const fallbackBase = "http://127.0.0.1:8000";
  const envBase =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/+$/,
          "",
        )
      : "";
  if (!envBase) return fallbackBase;
  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
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
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "cancelled";
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
  if (value === "confirmed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
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
    if (sort === "number") return a.number.localeCompare(b.number, undefined, { numeric: true });
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
    number: normalizeText(record.payment_number || record.number || record.reference, "—"),
    partyId: normalizeText(isReceipt ? record.customer_id : record.supplier_id),
    partyName: normalizeText(isReceipt ? record.customer_name : record.supplier_name, "—"),
    partyPhone: normalizeText(isReceipt ? record.customer_phone : record.supplier_phone),
    linkedDocumentId: normalizeText(isReceipt ? record.sales_invoice_id : record.purchase_bill_id),
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
    treasuryAccountingAccountId: normalizeText(record.treasury_accounting_account_id),
    treasuryAccountingAccountCode: normalizeText(record.treasury_accounting_account_code),
    treasuryAccountingAccountName: normalizeText(record.treasury_accounting_account_name),
    treasuryTransactionId: normalizeText(record.treasury_transaction_id),
    treasuryTransactionNumber: normalizeText(record.treasury_transaction_number),
    treasuryTransactionStatus: normalizeText(record.treasury_transaction_status),
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
function MoneyValue({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold tabular-nums">
      <Image src="/currency/sar.svg" alt={label} width={14} height={14} className="h-3.5 w-3.5" />
      <span>{formatMoney(value)}</span>
    </span>
  );
}
function StatusBadge({ value, label }: { value: string; label: string }) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getStatusBadgeClass(value))}>
      {label}
    </Badge>
  );
}
function KindBadge({ value, label }: { value: PaymentKind; label: string }) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getKindBadgeClass(value))}>
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
    <Card className="group overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {money ? <MoneyValue value={value} label={t.sar} /> : formatInteger(value)}
          </CardTitle>
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-2xl">
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
      <Card className="rounded-2xl">
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
        <Button variant="outline" size="sm" onClick={onReset} className="rounded-lg">
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
      <div className="overflow-hidden rounded-2xl border bg-background">
        <div className="overflow-x-auto">
          <Table className="min-w-[1280px] table-fixed">
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
                    className={`h-[72px] transition-colors ${onRowClick ? "cursor-pointer hover:bg-muted/40" : ""}`}
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest("button, a, input, select, textarea, [role='menuitem']")) return;
                      onRowClick?.(row);
                    }}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn("h-[72px] overflow-hidden px-4 text-start align-middle", column.className)}
                      >
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-80">
                    <EmptyTableState
                      title={hasFilters ? noResultsTitle : emptyTitle}
                      description={hasFilters ? noResultsDescription : emptyDescription}
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
        {showingLabel} <span className="font-medium text-foreground tabular-nums">{formatInteger(rows.length)}</span> {ofLabel}{" "}
        <span className="font-medium text-foreground tabular-nums">{formatInteger(allRowsCount)}</span> {rowsLabel}
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
  const [search, setSearch] = React.useState("")
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
;
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
          fetchJson<unknown>(makeApiUrl(API_PATHS.receipts, params), controller.signal),
          fetchJson<unknown>(makeApiUrl(API_PATHS.payments, params), controller.signal),
        ]);
        const failedMessages = results
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) => normalizeText(result.reason instanceof Error ? result.reason.message : result.reason));
        const receiptPayload = results[0].status === "fulfilled" ? results[0].value : {};
        const paymentPayload = results[1].status === "fulfilled" ? results[1].value : {};
        const receiptRows = extractArray(receiptPayload).map((item) => normalizePayment(item, "receipt"));
        const paymentRows = extractArray(paymentPayload).map((item) => normalizePayment(item, "payment"));
        setRows(sortRows([...receiptRows, ...paymentRows], "newest"));
        const hasPartialData = failedMessages.length > 0 && failedMessages.length < results.length;
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
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
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
    search || kind !== "all" || status !== "all" || method !== "all" || sort !== "newest" || dateFrom || dateTo,
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
  function exportExcel() {
    if (!filteredRows.length) {
      toast.warning(t.exportEmpty);
      return;
    }
    const rowsForExport = [
      [t.title],
      [t.generatedAt, new Date().toLocaleString()],
      [],
      [t.kind, t.voucherNo, t.party, t.document, t.treasuryAccount, t.amount, t.method, t.status, t.date, t.accounting, t.movement],
      ...filteredRows.map((row) => [
        kindLabel(row.kind, locale),
        row.number,
        row.partyName,
        row.linkedDocumentNumber || row.linkedDocumentId,
        row.treasuryAccountName,
        formatMoney(row.amount),
        methodLabel(row.method, locale),
        statusLabel(row.status, locale),
        formatDate(row.date),
        [
          row.accountingEntryNumber,
          row.treasuryAccountingAccountCode || row.treasuryAccountingAccountName,
        ]
          .filter(Boolean)
          .join(" / "),
        row.treasuryTransactionNumber,
      ]),
    ];
    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <table border="1">
            ${rowsForExport
              .map(
                (row) =>
                  `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
              )
              .join("")}
          </table>
        </body>
      </html>
    `;
    const blob = new Blob(["\uFEFF", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `company-payments-${new Date().toISOString().slice(0, 10)}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function printPage() {
    if (!filteredRows.length) {
      toast.warning(t.printEmpty);
      return;
    }
    window.print();
  }
  const columns: DataColumn<PaymentRecord>[] = [
    {
      key: "kind",
      label: t.kind,
      className: "w-[140px]",
      render: (row) => <KindBadge value={row.kind} label={kindLabel(row.kind, locale)} />,
    },
    {
      key: "number",
      label: t.voucherNo,
      className: "w-[190px]",
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
      className: "w-[220px]",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.partyName}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{row.partyPhone || row.partyId || "—"}</p>
        </div>
      ),
    },
    {
      key: "date",
      label: t.date,
      className: "w-[130px]",
      render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{formatDate(row.date)}</span>,
    },
    {
      key: "amount",
      label: t.amount,
      className: "w-[150px]",
      render: (row) => <MoneyValue value={row.amount} label={t.sar} />,
    },
    {
      key: "status",
      label: t.status,
      className: "w-[140px]",
      render: (row) => <StatusBadge value={row.status} label={statusLabel(row.status, locale)} />,
    },
    {
      key: "account",
      label: t.treasuryAccount,
      className: "w-[210px]",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{row.treasuryAccountName}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{methodLabel(row.method, locale)}</p>
        </div>
      ),
    },
    {
      key: "document",
      label: t.document,
      className: "w-[180px]",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{row.linkedDocumentNumber || "—"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{row.linkedDocumentPaymentStatus || "—"}</p>
        </div>
      ),
    },
    {
      key: "accounting",
      label: t.accounting,
      className: "w-[260px]",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{row.accountingEntryNumber || "—"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{row.treasuryTransactionNumber || "—"}</p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground tabular-nums">
            {row.treasuryAccountingAccountCode
              ? `${row.treasuryAccountingAccountCode} — ${
                  row.treasuryAccountingAccountName || (locale === "ar" ? "حساب محاسبي" : "Accounting account")
                }`
              : "—"}
          </p>
        </div>
      ),
    },

    {
      key: "actions",
      label: locale === "ar" ? "الإجراءات" : "Actions",
      className: "w-[86px] text-center",
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
                className="h-9 w-9 rounded-xl bg-background"
                aria-label={
                  locale === "ar"
                    ? "إجراءات السند"
                    : "Voucher actions"
                }
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={locale === "ar" ? "start" : "end"}
              className="w-44 rounded-xl"
            >
              <DropdownMenuItem
                onClick={() => router.push(paymentDetailHref(row))}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {locale === "ar" ? "فتح التفاصيل" : "Open details"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
  if (loading) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          <DashboardSkeleton />
        </div>
      </main>
    );
  }
  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-[900px] rounded-3xl border-destructive/30 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="h-5 w-5" />
              {t.errorTitle}
            </CardTitle>
            <CardDescription>{error || t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void loadRows()} className="rounded-xl" disabled={refreshing}>
              {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.moduleBadge}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => void loadRows({ silent: true })} disabled={refreshing}>
                  <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={printPage}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button asChild className="rounded-xl">
                  <Link href="/company/treasury/receipt-vouchers">
                    <ArrowDownLeft className="h-4 w-4" />
                    {t.openReceipt}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/company/treasury/payment-vouchers">
                    <ArrowUpRight className="h-4 w-4" />
                    {t.openPayment}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        {warnings.length ? (
          <Card className="rounded-2xl border-amber-200 bg-amber-50 text-amber-950 shadow-sm">
            <CardContent className="flex gap-3 p-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.partialWarningTitle}</p>
                <p className="mt-1 text-sm opacity-80">{t.partialWarningDesc}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.netFlow} value={stats.netFlow} description={t.netFlow} icon={WalletCards} money t={t} />
          <KpiCard title={t.totalReceipts} value={stats.totalReceipts} description={`${t.receipts}: ${formatInteger(stats.receipts)}`} icon={ArrowDownLeft} money t={t} />
          <KpiCard title={t.totalPayments} value={stats.totalPayments} description={`${t.payments}: ${formatInteger(stats.payments)}`} icon={ArrowUpRight} money t={t} />
          <KpiCard title={t.totalVouchers} value={stats.total} description={`${t.confirmedCount}: ${formatInteger(stats.confirmed)} · ${t.draftCount}: ${formatInteger(stats.draft)}`} icon={ReceiptText} t={t} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/company/treasury/receipt-vouchers" className="rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <ArrowDownLeft className="mb-3 h-5 w-5 text-primary" />
            <p className="font-semibold">{t.receiptVoucher}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.receipts}</p>
          </Link>
          <Link href="/company/treasury/payment-vouchers" className="rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <ArrowUpRight className="mb-3 h-5 w-5 text-primary" />
            <p className="font-semibold">{t.paymentVoucher}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.payments}</p>
          </Link>
          <Link href="/company/treasury/cashboxes" className="rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Banknote className="mb-3 h-5 w-5 text-primary" />
            <p className="font-semibold">{t.cashboxes}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.treasuryAccount}</p>
          </Link>
          <Link href="/company/treasury/bank-accounts" className="rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <FileText className="mb-3 h-5 w-5 text-primary" />
            <p className="font-semibold">{t.bankAccounts}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.treasuryAccount}</p>
          </Link>
        </div>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.tableTitle}</CardTitle>
            <CardDescription>{t.tableDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-10 rounded-xl bg-background ps-9"
                  />
                </div>
                <Select value={kind} onValueChange={(value) => setKind(value as KindFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="receipt">{t.receipts}</SelectItem>
                    <SelectItem value="payment">{t.payments}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="draft">{t.draft}</SelectItem>
                    <SelectItem value="confirmed">{t.confirmed}</SelectItem>
                    <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={method} onValueChange={(value) => setMethod(value as MethodFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[170px]">
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
                <div className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.from}</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="h-8 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
                <div className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.to}</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="h-8 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[160px]">
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
                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
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
