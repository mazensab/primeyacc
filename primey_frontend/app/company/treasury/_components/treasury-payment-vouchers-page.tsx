"use client";
/* ============================================================
   📂 primey_frontend/app/company/treasury/_components/treasury-payment-vouchers-page.tsx
   🧠 PrimeyAcc — Company Treasury Payment Vouchers Shared Page
   ------------------------------------------------------------
   ✅ Approved Premium company operational pattern
   ✅ Real API only, no fake demo data
   ✅ Company scoped API through backend session
   ✅ Receipt vouchers and payment vouchers pages
   ✅ Create / edit draft / confirm / cancel
   ✅ No delete action
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
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  CircleX,
  Edit3,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
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
type VoucherVariant = "receipt" | "payment";
type ApiRecord = Record<string, unknown>;
type SortKey = "newest" | "oldest" | "amount_high" | "amount_low" | "number" | "party";
type StatusFilter = "all" | "draft" | "confirmed" | "cancelled";
type MethodFilter = "all" | "CASH" | "BANK_TRANSFER" | "CARD" | "WALLET" | "CHECK" | "OTHER";
type TreasuryAccountOption = {
  id: string;
  name: string;
  code: string;
  type: string;
  currentBalance: number;
  status: string;
};
type VoucherRecord = {
  id: string;
  paymentNumber: string;
  partyId: string;
  partyName: string;
  partyPhone: string;
  linkedDocumentId: string;
  linkedDocumentNumber: string;
  linkedDocumentStatus: string;
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
  treasuryTransactionType: string;
  accountingEntryId: string;
  accountingEntryNumber: string;
  accountingEntryStatus: string;
  isAccountingPosted: boolean;
  amount: number;
  currency: string;
  paymentMethod: MethodFilter;
  paymentMethodLabel: string;
  status: "draft" | "confirmed" | "cancelled";
  paymentDate: string | null;
  reference: string;
  description: string;
  notes: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string;
  createdAt: string | null;
  updatedAt: string | null;
};
type VoucherFormState = {
  id: string;
  treasuryAccountId: string;
  amount: string;
  paymentMethod: MethodFilter;
  paymentDate: string;
  partyId: string;
  partyName: string;
  partyPhone: string;
  linkedDocumentId: string;
  reference: string;
  description: string;
  notes: string;
  confirmNow: boolean;
};
type DataColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};
const API_PATHS = {
  receipt: "/api/company/treasury/customer-payments/",
  payment: "/api/company/treasury/supplier-payments/",
  accounts: "/api/company/treasury/accounts/",
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
const emptyForm: VoucherFormState = {
  id: "",
  treasuryAccountId: "",
  amount: "",
  paymentMethod: "CASH",
  paymentDate: new Date().toISOString().slice(0, 10),
  partyId: "",
  partyName: "",
  partyPhone: "",
  linkedDocumentId: "",
  reference: "",
  description: "",
  notes: "",
  confirmNow: false,
};
const translations = {
  ar: {
    back: "الخزينة والمدفوعات",
    moduleBadge: "الخزينة والمدفوعات",
    receiptTitle: "سندات القبض",
    receiptSubtitle:
      "إدارة دفعات العملاء وسندات القبض مع التأكيد والترحيل وربط فاتورة المبيعات والقيد المحاسبي.",
    paymentTitle: "سندات الصرف",
    paymentSubtitle:
      "إدارة دفعات الموردين وسندات الصرف مع التأكيد والترحيل وربط فاتورة المشتريات والقيد المحاسبي.",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    addReceipt: "إضافة سند قبض",
    addPayment: "إضافة سند صرف",
    editReceipt: "تعديل سند قبض",
    editPayment: "تعديل سند صرف",
    save: "حفظ",
    saving: "جاري الحفظ...",
    cancel: "إلغاء",
    confirm: "تأكيد",
    cancelVoucher: "إلغاء السند",
    reset: "إعادة ضبط",
    search: "بحث",
    status: "الحالة",
    method: "الطريقة",
    sort: "الترتيب",
    from: "من",
    to: "إلى",
    all: "الكل",
    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    numberSort: "رقم السند",
    partySort: "الطرف",
    draft: "مسودة",
    confirmed: "مؤكد",
    cancelled: "ملغي",
    cash: "نقدي",
    bankTransfer: "تحويل بنكي",
    card: "بطاقة",
    wallet: "محفظة",
    check: "شيك",
    other: "أخرى",
    totalAmount: "إجمالي المبلغ",
    totalVouchers: "إجمالي السندات",
    draftVouchers: "مسودات",
    confirmedVouchers: "مؤكدة",
    cancelledVouchers: "ملغاة",
    operationalHintTitle: "صفحة تشغيلية",
    receiptOperationalHint:
      "يمكن إنشاء سند قبض كمسودة أو تأكيده. التأكيد هو الذي ينشئ حركة واردة ويحدّث الخزينة بأمان.",
    paymentOperationalHint:
      "يمكن إنشاء سند صرف كمسودة أو تأكيده. التأكيد هو الذي ينشئ حركة صادرة ويحدّث الخزينة بأمان.",
    formCreateDesc: "أدخل بيانات السند، ويمكن حفظه كمسودة أو تأكيده مباشرة.",
    formEditDesc: "يمكن تعديل المسودة فقط. السندات المؤكدة أو الملغاة لا تعدل مباشرة.",
    tableTitleReceipt: "قائمة سندات القبض",
    tableTitlePayment: "قائمة سندات الصرف",
    tableDescReceipt: "أحدث سندات قبض العملاء الخاصة بالشركة الحالية.",
    tableDescPayment: "أحدث سندات صرف الموردين الخاصة بالشركة الحالية.",
    searchPlaceholderReceipt: "ابحث برقم السند أو العميل أو المرجع أو الفاتورة...",
    searchPlaceholderPayment: "ابحث برقم السند أو المورد أو المرجع أو الفاتورة...",
    voucherNo: "رقم السند",
    party: "الطرف",
    customerName: "اسم العميل",
    supplierName: "اسم المورد",
    partyPhone: "رقم الجوال",
    partyId: "معرف الطرف",
    salesInvoiceId: "معرف فاتورة المبيعات",
    purchaseBillId: "معرف فاتورة المشتريات",
    linkedDocument: "المستند",
    treasuryAccount: "حساب الخزينة",
    amount: "المبلغ",
    date: "التاريخ",
    reference: "المرجع",
    description: "الوصف",
    notes: "ملاحظات",
    accounting: "المحاسبة",
    treasuryMovement: "حركة الخزينة",
    actions: "الإجراءات",
    confirmNow: "تأكيد مباشرة",
    noTreasuryAccounts: "لا توجد حسابات خزينة نشطة. أضف صندوقًا أو حسابًا بنكيًا أولًا.",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    sar: "ر.س",
    unknown: "غير محدد",
    noDataTitleReceipt: "لا توجد سندات قبض",
    noDataTitlePayment: "لا توجد سندات صرف",
    noDataDescReceipt: "ابدأ بإضافة أول سند قبض.",
    noDataDescPayment: "ابدأ بإضافة أول سند صرف.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitleReceipt: "تعذر تحميل سندات القبض",
    errorTitlePayment: "تعذر تحميل سندات الصرف",
    errorDesc: "تأكد من تسجيل الدخول للشركة ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    created: "تم إنشاء السند بنجاح.",
    updated: "تم تحديث السند بنجاح.",
    confirmedDone: "تم تأكيد السند بنجاح.",
    cancelledDone: "تم إلغاء السند بنجاح.",
    cancelReasonPrompt: "اكتب سبب الإلغاء",
    validationRequired: "اختر حساب الخزينة وأدخل المبلغ واسم الطرف.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    generatedAt: "تم الإنشاء في",
    apiUnsupported: "تعذر تنفيذ العملية من الواجهة الحالية.",
  },
  en: {
    back: "Treasury & Payments",
    moduleBadge: "Treasury & Payments",
    receiptTitle: "Receipt Vouchers",
    receiptSubtitle:
      "Manage customer receipt vouchers with confirmation, posting, sales invoice allocation, and accounting entry linkage.",
    paymentTitle: "Payment Vouchers",
    paymentSubtitle:
      "Manage supplier payment vouchers with confirmation, posting, purchase bill allocation, and accounting entry linkage.",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    addReceipt: "Add receipt voucher",
    addPayment: "Add payment voucher",
    editReceipt: "Edit receipt voucher",
    editPayment: "Edit payment voucher",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    confirm: "Confirm",
    cancelVoucher: "Cancel voucher",
    reset: "Reset",
    search: "Search",
    status: "Status",
    method: "Method",
    sort: "Sort",
    from: "From",
    to: "To",
    all: "All",
    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    numberSort: "Voucher number",
    partySort: "Party",
    draft: "Draft",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    cash: "Cash",
    bankTransfer: "Bank transfer",
    card: "Card",
    wallet: "Wallet",
    check: "Check",
    other: "Other",
    totalAmount: "Total amount",
    totalVouchers: "Total vouchers",
    draftVouchers: "Draft",
    confirmedVouchers: "Confirmed",
    cancelledVouchers: "Cancelled",
    operationalHintTitle: "Operational page",
    receiptOperationalHint:
      "A receipt voucher can be saved as draft or confirmed. Confirmation creates an inflow and updates treasury safely.",
    paymentOperationalHint:
      "A payment voucher can be saved as draft or confirmed. Confirmation creates an outflow and updates treasury safely.",
    formCreateDesc: "Enter voucher details, then save as draft or confirm immediately.",
    formEditDesc: "Only draft vouchers can be edited. Confirmed or cancelled vouchers are not directly edited.",
    tableTitleReceipt: "Receipt vouchers list",
    tableTitlePayment: "Payment vouchers list",
    tableDescReceipt: "Newest customer receipt vouchers for the current company.",
    tableDescPayment: "Newest supplier payment vouchers for the current company.",
    searchPlaceholderReceipt: "Search by voucher number, customer, reference, or invoice...",
    searchPlaceholderPayment: "Search by voucher number, supplier, reference, or bill...",
    voucherNo: "Voucher No.",
    party: "Party",
    customerName: "Customer name",
    supplierName: "Supplier name",
    partyPhone: "Phone",
    partyId: "Party ID",
    salesInvoiceId: "Sales invoice ID",
    purchaseBillId: "Purchase bill ID",
    linkedDocument: "Document",
    treasuryAccount: "Treasury account",
    amount: "Amount",
    date: "Date",
    reference: "Reference",
    description: "Description",
    notes: "Notes",
    accounting: "Accounting",
    treasuryMovement: "Treasury movement",
    actions: "Actions",
    confirmNow: "Confirm immediately",
    noTreasuryAccounts: "No active treasury accounts. Add a cashbox or bank account first.",
    showing: "Showing",
    of: "of",
    rows: "rows",
    sar: "SAR",
    unknown: "Unknown",
    noDataTitleReceipt: "No receipt vouchers",
    noDataTitlePayment: "No payment vouchers",
    noDataDescReceipt: "Start by creating the first receipt voucher.",
    noDataDescPayment: "Start by creating the first payment voucher.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitleReceipt: "Could not load receipt vouchers",
    errorTitlePayment: "Could not load payment vouchers",
    errorDesc: "Make sure you are signed in to the company and the backend is running, then try again.",
    tryAgain: "Try again",
    created: "Voucher created successfully.",
    updated: "Voucher updated successfully.",
    confirmedDone: "Voucher confirmed successfully.",
    cancelledDone: "Voucher cancelled successfully.",
    cancelReasonPrompt: "Enter cancellation reason",
    validationRequired: "Select treasury account, enter amount, and party name.",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    generatedAt: "Generated at",
    apiUnsupported: "The operation could not be completed from this page.",
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
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")[1] || ""
  );
}
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const csrfToken = getCookie("csrftoken");
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": decodeURIComponent(csrfToken) } : {}),
      ...(init?.headers || {}),
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
  const resultRecord = asRecord(result);
  if (Array.isArray(resultRecord.results)) return resultRecord.results;
  if (Array.isArray(resultRecord.items)) return resultRecord.items;
  return [];
}
function getConfig(variant: VoucherVariant, locale: Locale) {
  const t = translations[locale];
  const isReceipt = variant === "receipt";
  return {
    apiPath: isReceipt ? API_PATHS.receipt : API_PATHS.payment,
    title: isReceipt ? t.receiptTitle : t.paymentTitle,
    subtitle: isReceipt ? t.receiptSubtitle : t.paymentSubtitle,
    addLabel: isReceipt ? t.addReceipt : t.addPayment,
    editLabel: isReceipt ? t.editReceipt : t.editPayment,
    tableTitle: isReceipt ? t.tableTitleReceipt : t.tableTitlePayment,
    tableDesc: isReceipt ? t.tableDescReceipt : t.tableDescPayment,
    searchPlaceholder: isReceipt ? t.searchPlaceholderReceipt : t.searchPlaceholderPayment,
    noDataTitle: isReceipt ? t.noDataTitleReceipt : t.noDataTitlePayment,
    noDataDesc: isReceipt ? t.noDataDescReceipt : t.noDataDescPayment,
    errorTitle: isReceipt ? t.errorTitleReceipt : t.errorTitlePayment,
    operationalHint: isReceipt ? t.receiptOperationalHint : t.paymentOperationalHint,
    partyNameLabel: isReceipt ? t.customerName : t.supplierName,
    linkedDocumentLabel: isReceipt ? t.salesInvoiceId : t.purchaseBillId,
    icon: isReceipt ? ArrowDownLeft : ArrowUpRight,
  };
}
function statusFromApi(value: unknown): VoucherRecord["status"] {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "CONFIRMED" || normalized === "POSTED") return "confirmed";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "cancelled";
  return "draft";
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
function statusLabel(status: StatusFilter, locale: Locale) {
  const t = translations[locale];
  if (status === "confirmed") return t.confirmed;
  if (status === "cancelled") return t.cancelled;
  if (status === "draft") return t.draft;
  return t.all;
}
function getStatusBadgeClass(value: string) {
  if (value === "confirmed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "draft") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-border bg-muted/30 text-muted-foreground";
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
function sortRows(rows: VoucherRecord[], sort: SortKey) {
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return rowDateValue(a.paymentDate) - rowDateValue(b.paymentDate);
    if (sort === "amount_high") return b.amount - a.amount;
    if (sort === "amount_low") return a.amount - b.amount;
    if (sort === "number") return a.paymentNumber.localeCompare(b.paymentNumber, undefined, { numeric: true });
    if (sort === "party") return a.partyName.localeCompare(b.partyName);
    return rowDateValue(b.paymentDate) - rowDateValue(a.paymentDate);
  });
}
function normalizeAccount(value: unknown): TreasuryAccountOption {
  const record = asRecord(value);
  return {
    id: normalizeText(record.id || record.pk || record.uuid),
    name: normalizeText(record.name, "—"),
    code: normalizeText(record.code, "—"),
    type: normalizeText(record.account_type || record.type),
    currentBalance: toNumber(record.current_balance),
    status: normalizeText(record.status, "ACTIVE"),
  };
}
function normalizeVoucher(value: unknown, variant: VoucherVariant): VoucherRecord {
  const record = asRecord(value);
  const isReceipt = variant === "receipt";
  const paymentMethod = normalizeText(record.payment_method, "CASH") as MethodFilter;
  return {
    id: normalizeText(record.id || record.pk || record.uuid),
    paymentNumber: normalizeText(record.payment_number || record.number || record.reference, "—"),
    partyId: normalizeText(isReceipt ? record.customer_id : record.supplier_id),
    partyName: normalizeText(isReceipt ? record.customer_name : record.supplier_name, "—"),
    partyPhone: normalizeText(isReceipt ? record.customer_phone : record.supplier_phone),
    linkedDocumentId: normalizeText(isReceipt ? record.sales_invoice_id : record.purchase_bill_id),
    linkedDocumentNumber: normalizeText(
      isReceipt
        ? record.sales_invoice_number || record.invoice_number
        : record.purchase_bill_number || record.bill_number,
    ),
    linkedDocumentStatus: normalizeText(isReceipt ? record.invoice_status : record.bill_status),
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
    treasuryTransactionType: normalizeText(record.treasury_transaction_type),
    accountingEntryId: normalizeText(record.accounting_entry_id),
    accountingEntryNumber: normalizeText(record.accounting_entry_number),
    accountingEntryStatus: normalizeText(record.accounting_entry_status),
    isAccountingPosted: Boolean(record.is_accounting_posted),
    amount: toNumber(record.amount),
    currency: normalizeText(record.currency, "SAR"),
    paymentMethod,
    paymentMethodLabel: normalizeText(record.payment_method_label),
    status: statusFromApi(record.status),
    paymentDate: normalizeText(record.payment_date) || null,
    reference: normalizeText(record.reference),
    description: normalizeText(record.description),
    notes: normalizeText(record.notes),
    confirmedAt: normalizeText(record.confirmed_at) || null,
    cancelledAt: normalizeText(record.cancelled_at) || null,
    cancellationReason: normalizeText(record.cancellation_reason),
    createdAt: normalizeText(record.created_at) || null,
    updatedAt: normalizeText(record.updated_at) || null,
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
                  <TableRow key={rowKey(row)} className="h-[72px]">
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
function VoucherFormCard({
  variant,
  mode,
  form,
  accounts,
  saving,
  locale,
  onChange,
  onSubmit,
  onCancel,
}: {
  variant: VoucherVariant;
  mode: "create" | "edit";
  form: VoucherFormState;
  accounts: TreasuryAccountOption[];
  saving: boolean;
  locale: Locale;
  onChange: (patch: Partial<VoucherFormState>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const t = translations[locale];
  const config = getConfig(variant, locale);
  const title = mode === "create" ? config.addLabel : config.editLabel;
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{mode === "create" ? t.formCreateDesc : t.formEditDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!accounts.length ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {t.noTreasuryAccounts}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-medium">{t.treasuryAccount}</span>
            <Select
              value={form.treasuryAccountId || undefined}
              onValueChange={(value) => onChange({ treasuryAccountId: value })}
            >
              <SelectTrigger className="h-10 rounded-xl bg-background">
                <SelectValue placeholder={t.treasuryAccount} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} — {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">{t.amount}</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => onChange({ amount: event.target.value })}
              className="h-10 rounded-xl bg-background tabular-nums"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">{t.method}</span>
            <Select
              value={form.paymentMethod}
              onValueChange={(value) => onChange({ paymentMethod: value as MethodFilter })}
            >
              <SelectTrigger className="h-10 rounded-xl bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.filter((item) => item !== "all").map((method) => (
                  <SelectItem key={method} value={method}>
                    {methodLabel(method, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">{t.date}</span>
            <Input
              type="date"
              value={form.paymentDate}
              onChange={(event) => onChange({ paymentDate: event.target.value })}
              className="h-10 rounded-xl bg-background tabular-nums"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">{config.partyNameLabel}</span>
            <Input
              value={form.partyName}
              onChange={(event) => onChange({ partyName: event.target.value })}
              className="h-10 rounded-xl bg-background"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">{t.partyPhone}</span>
            <Input
              value={form.partyPhone}
              onChange={(event) => onChange({ partyPhone: event.target.value })}
              className="h-10 rounded-xl bg-background tabular-nums"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">{t.partyId}</span>
            <Input
              value={form.partyId}
              onChange={(event) => onChange({ partyId: event.target.value })}
              className="h-10 rounded-xl bg-background tabular-nums"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">{config.linkedDocumentLabel}</span>
            <Input
              value={form.linkedDocumentId}
              onChange={(event) => onChange({ linkedDocumentId: event.target.value })}
              className="h-10 rounded-xl bg-background tabular-nums"
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">{t.reference}</span>
            <Input
              value={form.reference}
              onChange={(event) => onChange({ reference: event.target.value })}
              className="h-10 rounded-xl bg-background"
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium">{t.description}</span>
            <Input
              value={form.description}
              onChange={(event) => onChange({ description: event.target.value })}
              className="h-10 rounded-xl bg-background"
            />
          </label>
          <label className="space-y-2 md:col-span-2 xl:col-span-4">
            <span className="text-sm font-medium">{t.notes}</span>
            <textarea
              value={form.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              rows={3}
              className="min-h-20 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {mode === "create" ? (
            <label className="flex h-10 items-center gap-3 rounded-xl border bg-background px-3 md:col-span-2">
              <input
                type="checkbox"
                checked={form.confirmNow}
                onChange={(event) => onChange({ confirmNow: event.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">{t.confirmNow}</span>
            </label>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" className="rounded-xl" onClick={onSubmit} disabled={saving || !accounts.length}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? t.saving : t.save}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl bg-background" onClick={onCancel} disabled={saving}>
            {t.cancel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
export function TreasuryPaymentVouchersPage({ variant }: { variant: VoucherVariant }) {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [rows, setRows] = React.useState<VoucherRecord[]>([]);
  const [accounts, setAccounts] = React.useState<TreasuryAccountOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [formVisible, setFormVisible] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [form, setForm] = React.useState<VoucherFormState>(emptyForm);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [method, setMethod] = React.useState<MethodFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const config = getConfig(variant, locale);
  const PageIcon = config.icon;
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
  const loadData = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const voucherParams = new URLSearchParams({
          page: "1",
          page_size: "100",
          ordering: "-payment_date",
        });
        const accountsParams = new URLSearchParams({
          page: "1",
          page_size: "100",
          status: "ACTIVE",
          ordering: "name",
        });
        const [voucherPayload, accountsPayload] = await Promise.all([
          fetchJson<unknown>(makeApiUrl(config.apiPath, voucherParams)),
          fetchJson<unknown>(makeApiUrl(API_PATHS.accounts, accountsParams)),
        ]);
        const voucherRows = extractArray(voucherPayload).map((item) => normalizeVoucher(item, variant));
        const accountRows = extractArray(accountsPayload)
          .map(normalizeAccount)
          .filter((account) => account.id && account.status !== "INACTIVE");
        setRows(voucherRows);
        setAccounts(accountRows);
        if (silent) toast.success(t.refresh);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [config.apiPath, t, variant],
  );
  React.useEffect(() => {
    void loadData();
  }, [loadData]);
  const stats = React.useMemo(() => {
    const draft = rows.filter((row) => row.status === "draft");
    const confirmed = rows.filter((row) => row.status === "confirmed");
    const cancelled = rows.filter((row) => row.status === "cancelled");
    return {
      total: rows.length,
      amount: rows.reduce((sum, row) => sum + row.amount, 0),
      draft: draft.length,
      confirmed: confirmed.length,
      cancelled: cancelled.length,
    };
  }, [rows]);
  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const haystack = [
        row.paymentNumber,
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
        row.status,
        row.paymentMethod,
      ]
        .join(" ")
        .toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (status !== "all" && row.status !== status) return false;
      if (method !== "all" && row.paymentMethod !== method) return false;
      return isWithinDate(row.paymentDate || row.createdAt, dateFrom, dateTo);
    });
    return sortRows(filtered, sort);
  }, [dateFrom, dateTo, method, rows, search, sort, status]);
  const hasFilters = Boolean(search || status !== "all" || method !== "all" || sort !== "newest" || dateFrom || dateTo);
  function resetFilters() {
    setSearch("");
    setStatus("all");
    setMethod("all");
    setSort("newest");
    setDateFrom("");
    setDateTo("");
  }
  function openCreate() {
    setMode("create");
    setForm({
      ...emptyForm,
      paymentDate: new Date().toISOString().slice(0, 10),
      treasuryAccountId: accounts[0]?.id || "",
      paymentMethod: "CASH",
    });
    setFormVisible(true);
  }
  function openEdit(row: VoucherRecord) {
    if (row.status !== "draft") {
      toast.warning(t.formEditDesc);
      return;
    }
    setMode("edit");
    setForm({
      id: row.id,
      treasuryAccountId: row.treasuryAccountId,
      amount: String(row.amount || ""),
      paymentMethod: row.paymentMethod || "CASH",
      paymentDate: formatDate(row.paymentDate) === "—" ? new Date().toISOString().slice(0, 10) : formatDate(row.paymentDate),
      partyId: row.partyId,
      partyName: row.partyName === "—" ? "" : row.partyName,
      partyPhone: row.partyPhone,
      linkedDocumentId: row.linkedDocumentId,
      reference: row.reference,
      description: row.description,
      notes: row.notes,
      confirmNow: false,
    });
    setFormVisible(true);
  }
  function closeForm() {
    setMode("create");
    setForm(emptyForm);
    setFormVisible(false);
  }
  function buildPayload() {
    const commonPayload: ApiRecord = {
      treasury_account_id: form.treasuryAccountId,
      account_id: form.treasuryAccountId,
      amount: form.amount,
      payment_method: form.paymentMethod,
      payment_date: form.paymentDate,
      currency: "SAR",
      reference: form.reference.trim(),
      description: form.description.trim(),
      notes: form.notes.trim(),
    };
    if (mode === "create" && form.confirmNow) {
      commonPayload.status = "CONFIRMED";
    }
    if (variant === "receipt") {
      return {
        ...commonPayload,
        customer_id: form.partyId.trim() || null,
        customer_name: form.partyName.trim(),
        customer_phone: form.partyPhone.trim(),
        sales_invoice_id: form.linkedDocumentId.trim() || null,
        invoice_id: form.linkedDocumentId.trim() || null,
      };
    }
    return {
      ...commonPayload,
      supplier_id: form.partyId.trim() || null,
      supplier_name: form.partyName.trim(),
      supplier_phone: form.partyPhone.trim(),
      purchase_bill_id: form.linkedDocumentId.trim() || null,
      bill_id: form.linkedDocumentId.trim() || null,
    };
  }
  async function submitForm() {
    const payload = buildPayload();
    if (!form.treasuryAccountId || toNumber(form.amount) <= 0 || !form.partyName.trim()) {
      toast.warning(t.validationRequired);
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        await fetchJson(makeApiUrl(config.apiPath), {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(t.created);
      } else {
        await fetchJson(makeApiUrl(`${config.apiPath}${form.id}/`), {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success(t.updated);
      }
      closeForm();
      await loadData({ silent: true });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.apiUnsupported;
      toast.error(message || t.apiUnsupported);
    } finally {
      setSaving(false);
    }
  }
  async function confirmVoucher(row: VoucherRecord) {
    if (row.status !== "draft") return;
    setSaving(true);
    try {
      await fetchJson(makeApiUrl(`${config.apiPath}${row.id}/confirm/`), {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success(t.confirmedDone);
      await loadData({ silent: true });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.apiUnsupported;
      toast.error(message || t.apiUnsupported);
    } finally {
      setSaving(false);
    }
  }
  async function cancelVoucher(row: VoucherRecord) {
    if (row.status === "cancelled") return;
    const reason = window.prompt(t.cancelReasonPrompt, "");
    if (reason === null) return;
    setSaving(true);
    try {
      await fetchJson(makeApiUrl(`${config.apiPath}${row.id}/cancel/`), {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      toast.success(t.cancelledDone);
      await loadData({ silent: true });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.apiUnsupported;
      toast.error(message || t.apiUnsupported);
    } finally {
      setSaving(false);
    }
  }
  function exportExcel() {
    if (!filteredRows.length) {
      toast.warning(t.exportEmpty);
      return;
    }
    const rowsForExport = [
      [config.title],
      [t.generatedAt, new Date().toLocaleString()],
      [],
      [t.voucherNo, t.party, t.linkedDocument, t.treasuryAccount, t.amount, t.method, t.status, t.date, t.accounting, t.treasuryMovement],
      ...filteredRows.map((row) => [
        row.paymentNumber,
        row.partyName,
        row.linkedDocumentNumber || row.linkedDocumentId,
        row.treasuryAccountName,
        formatMoney(row.amount),
        methodLabel(row.paymentMethod, locale),
        statusLabel(row.status, locale),
        formatDate(row.paymentDate),
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
    anchor.download = `${variant}-vouchers-${new Date().toISOString().slice(0, 10)}.xls`;
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
  const columns: DataColumn<VoucherRecord>[] = [
    {
      key: "number",
      label: t.voucherNo,
      className: "w-[190px]",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{row.paymentNumber}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{row.reference || "—"}</p>
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
      render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{formatDate(row.paymentDate)}</span>,
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
          <p className="mt-1 truncate text-xs text-muted-foreground">{methodLabel(row.paymentMethod, locale)}</p>
        </div>
      ),
    },
    {
      key: "document",
      label: t.linkedDocument,
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
          <p className="mt-1 truncate text-xs text-muted-foreground">{row.accountingEntryStatus || "—"}</p>
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
      label: t.actions,
      className: "w-[270px]",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => openEdit(row)}
            disabled={saving || row.status !== "draft"}
          >
            <Edit3 className="h-4 w-4" />
            {locale === "ar" ? "تعديل" : "Edit"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => void confirmVoucher(row)}
            disabled={saving || row.status !== "draft"}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t.confirm}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => void cancelVoucher(row)}
            disabled={saving || row.status === "cancelled"}
          >
            <CircleX className="h-4 w-4" />
            {t.cancel}
          </Button>
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
              {config.errorTitle}
            </CardTitle>
            <CardDescription>{error || t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void loadData()} className="rounded-xl" disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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
                <Link
                  href="/company/treasury"
                  className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {t.back}
                </Link>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.moduleBadge}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{config.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{config.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => void loadData({ silent: true })} disabled={refreshing}>
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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
                <Button className="rounded-xl" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {config.addLabel}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <Card className="rounded-2xl border-amber-200/70 bg-amber-50/70 text-amber-950 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <TriangleAlert className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t.operationalHintTitle}</p>
              <p className="mt-1 text-sm opacity-80">{config.operationalHint}</p>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalVouchers} value={stats.total} description={config.title} icon={ReceiptText} t={t} />
          <KpiCard title={t.totalAmount} value={stats.amount} description={t.amount} icon={PageIcon} money t={t} />
          <KpiCard title={t.confirmedVouchers} value={stats.confirmed} description={t.confirmed} icon={CheckCircle2} t={t} />
          <KpiCard title={t.draftVouchers} value={stats.draft} description={t.draft} icon={FileText} t={t} />
        </div>
        {formVisible ? (
          <VoucherFormCard
            variant={variant}
            mode={mode}
            form={form}
            accounts={accounts}
            saving={saving}
            locale={locale}
            onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
            onSubmit={() => void submitForm()}
            onCancel={closeForm}
          />
        ) : null}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{config.tableTitle}</CardTitle>
            <CardDescription>{config.tableDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={config.searchPlaceholder}
                    className="h-10 rounded-xl bg-background ps-9"
                  />
                </div>
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
              emptyTitle={config.noDataTitle}
              emptyDescription={config.noDataDesc}
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
