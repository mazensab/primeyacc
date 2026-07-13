"use client";
/* ============================================================
   📂 primey_frontend/app/company/treasury/_components/treasury-voucher-detail-page.tsx
   🧠 PrimeyAcc — Company Treasury Voucher Detail
   ------------------------------------------------------------
   ✅ PrimeyAcc Approved Design
   ✅ Shared receipt/payment voucher detail page
   ✅ Real company-scoped APIs only
   ✅ Confirm/cancel with shared AlertDialog
   ✅ Full Excel + print report
   ✅ Clickable party/account/document/journal links
   ✅ sonner + Arabic/English + English digits
   ✅ SAR icon from /currency/sar.svg
============================================================ */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CircleX,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Hash,
  Landmark,
  Loader2,
  MoreVertical,
  Phone,
  Printer,
  ReceiptText,
  RefreshCw,
  UserRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
export type VoucherVariant = "receipt" | "payment";

type VoucherDetails = {
  id: string;
  number: string;
  date: string;
  status: string;
  amount: number;
  method: string;
  reference: string;
  description: string;
  notes: string;
  cancellationReason: string;
  partyId: string;
  partyName: string;
  partyCode: string;
  partyPhone: string;
  partyType: string;
  treasuryAccountId: string;
  treasuryAccountName: string;
  treasuryAccountCode: string;
  accountingAccountId: string;
  accountingAccountCode: string;
  accountingAccountName: string;
  accountingEntryId: string;
  accountingEntryNumber: string;
  accountingEntryStatus: string;
  treasuryTransactionId: string;
  treasuryTransactionNumber: string;
  treasuryTransactionStatus: string;
  linkedDocumentId: string;
  linkedDocumentNumber: string;
  linkedDocumentStatus: string;
  createdAt: string;
  updatedAt: string;
};

const translations = {
  ar: {
    badge: "الخزينة والمدفوعات",
    receiptTitle: "تفاصيل سند القبض",
    paymentTitle: "تفاصيل سند الصرف",
    receiptSubtitle:
      "ملف سند القبض مع الطرف، حساب الخزينة، المستند المرتبط، والقيد المحاسبي.",
    paymentSubtitle:
      "ملف سند الصرف مع الطرف، حساب الخزينة، المستند المرتبط، والقيد المحاسبي.",
    receiptBack: "العودة إلى سندات القبض",
    paymentBack: "العودة إلى سندات الصرف",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة السند",
    actions: "الإجراءات",
    confirm: "تأكيد السند",
    cancelVoucher: "إلغاء السند",
    confirmTitle: "تأكيد السند",
    confirmDescription:
      "سيتم تأكيد السند وإنشاء أثره في الخزينة والمحاسبة وفق قواعد النظام.",
    confirmAction: "تأكيد",
    cancelTitle: "تأكيد إلغاء السند",
    cancelDescription:
      "سيتم إلغاء السند وتنفيذ العكس الآمن عند وجود أثر محاسبي، مع الاحتفاظ بالسجل.",
    cancelReason: "سبب الإلغاء",
    cancelAction: "إلغاء السند",
    close: "رجوع",
    confirmedDone: "تم تأكيد السند بنجاح.",
    cancelledDone: "تم إلغاء السند بنجاح.",
    refreshed: "تم تحديث تفاصيل السند.",
    exportReady: "تم تجهيز ملف Excel بنجاح.",
    printReady: "تم تجهيز نموذج السند للطباعة.",
    printBlocked:
      "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.",
    status: "الحالة",
    amount: "المبلغ",
    date: "تاريخ السند",
    method: "طريقة الدفع",
    voucherData: "بيانات السند",
    voucherDataDesc: "رقم السند، التاريخ، المرجع، الوصف، والملاحظات.",
    partyData: "بيانات الطرف",
    partyDataDesc: "الطرف المرتبط بالسند وبيانات التواصل المتاحة.",
    treasuryData: "الخزينة والمحاسبة",
    treasuryDataDesc: "حساب الخزينة والحساب المحاسبي والقيد وحركة الخزينة.",
    number: "رقم السند",
    reference: "المرجع الخارجي",
    description: "الوصف",
    notes: "الملاحظات",
    partyName: "اسم الطرف",
    partyCode: "كود الطرف",
    partyPhone: "الجوال",
    partyType: "نوع الطرف",
    treasuryAccount: "حساب الخزينة",
    accountingAccount: "الحساب المحاسبي",
    accountingEntry: "القيد المحاسبي",
    treasuryTransaction: "حركة الخزينة",
    linkedDocument: "المستند المرتبط",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    openDetails: "فتح التفاصيل",
    notFound: "لم يتم العثور على السند المطلوب.",
    loadFailed: "تعذر تحميل تفاصيل السند.",
    tryAgain: "إعادة المحاولة",
    sar: "ر.س",
    draft: "مسودة",
    confirmed: "مؤكد",
    cancelled: "ملغي",
    cash: "نقدي",
    bankTransfer: "تحويل بنكي",
    card: "بطاقة",
    wallet: "محفظة",
    check: "شيك",
    other: "أخرى",
    generatedAt: "تم الإنشاء في",
    actionFailed: "تعذر تنفيذ الإجراء.",
    receiptDocumentTitle: "سند قبض",
    paymentDocumentTitle: "سند صرف",
    originalCopy: "الأصل",
    receiptPartyLine: "استلمنا من السيد/السادة",
    paymentPartyLine: "صرفنا إلى السيد/السادة",
    amountNumeric: "المبلغ رقمًا",
    amountWords: "المبلغ كتابةً",
    receiptFor: "وذلك عن",
    paymentFor: "وذلك مقابل",
    treasurySource: "حساب الخزينة",
    receiverSignature: "المستلم",
    preparerSignature: "أعده",
    accountantSignature: "المحاسب",
    approverSignature: "اعتمده",
    managerSignature: "المدير",
    stampSignature: "الختم",
    internalReference: "مرجع داخلي",
    cancelledNoticeTitle: "هذا السند ملغى",
    cancelledNoticeDescription:
      "تم إلغاء السند والاحتفاظ به لأغراض المراجعة، ولا يجوز استخدامه كسند ساري.",
  },
  en: {
    badge: "Treasury & Payments",
    receiptTitle: "Receipt voucher details",
    paymentTitle: "Payment voucher details",
    receiptSubtitle:
      "Receipt voucher profile with counterparty, treasury account, linked document, and journal entry.",
    paymentSubtitle:
      "Payment voucher profile with counterparty, treasury account, linked document, and journal entry.",
    receiptBack: "Back to receipt vouchers",
    paymentBack: "Back to payment vouchers",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print voucher",
    actions: "Actions",
    confirm: "Confirm voucher",
    cancelVoucher: "Cancel voucher",
    confirmTitle: "Confirm voucher",
    confirmDescription:
      "The voucher will be confirmed and posted to treasury and accounting according to system rules.",
    confirmAction: "Confirm",
    cancelTitle: "Confirm voucher cancellation",
    cancelDescription:
      "The voucher will be cancelled with safe reversal when an accounting effect exists, while preserving the record.",
    cancelReason: "Cancellation reason",
    cancelAction: "Cancel voucher",
    close: "Back",
    confirmedDone: "Voucher confirmed successfully.",
    cancelledDone: "Voucher cancelled successfully.",
    refreshed: "Voucher details refreshed.",
    exportReady: "Excel file prepared successfully.",
    printReady: "Voucher form prepared for printing.",
    printBlocked:
      "The print window could not be opened. Allow pop-ups and try again.",
    status: "Status",
    amount: "Amount",
    date: "Voucher date",
    method: "Payment method",
    voucherData: "Voucher data",
    voucherDataDesc: "Voucher number, date, reference, description, and notes.",
    partyData: "Counterparty data",
    partyDataDesc:
      "The counterparty linked to this voucher and available contact details.",
    treasuryData: "Treasury and accounting",
    treasuryDataDesc:
      "Treasury account, accounting account, journal entry, and treasury movement.",
    number: "Voucher number",
    reference: "External reference",
    description: "Description",
    notes: "Notes",
    partyName: "Counterparty name",
    partyCode: "Counterparty code",
    partyPhone: "Phone",
    partyType: "Counterparty type",
    treasuryAccount: "Treasury account",
    accountingAccount: "Accounting account",
    accountingEntry: "Journal entry",
    treasuryTransaction: "Treasury transaction",
    linkedDocument: "Linked document",
    createdAt: "Created at",
    updatedAt: "Last update",
    openDetails: "Open details",
    notFound: "The requested voucher was not found.",
    loadFailed: "Could not load voucher details.",
    tryAgain: "Try again",
    sar: "SAR",
    draft: "Draft",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    cash: "Cash",
    bankTransfer: "Bank transfer",
    card: "Card",
    wallet: "Wallet",
    check: "Check",
    other: "Other",
    generatedAt: "Generated at",
    actionFailed: "Could not complete the action.",
    receiptDocumentTitle: "Receipt voucher",
    paymentDocumentTitle: "Payment voucher",
    originalCopy: "Original",
    receiptPartyLine: "Received from",
    paymentPartyLine: "Paid to",
    amountNumeric: "Amount in figures",
    amountWords: "Amount in words",
    receiptFor: "For",
    paymentFor: "In consideration of",
    treasurySource: "Treasury account",
    receiverSignature: "Receiver",
    preparerSignature: "Prepared by",
    accountantSignature: "Accountant",
    approverSignature: "Approved by",
    managerSignature: "Manager",
    stampSignature: "Stamp",
    internalReference: "Internal reference",
    cancelledNoticeTitle: "This voucher is cancelled",
    cancelledNoticeDescription:
      "The voucher was cancelled and retained for audit purposes. It must not be used as a valid voucher.",
  },
} as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function initialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function apiBase() {
  const value = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return value.endsWith("/api") ? value.slice(0, -4) : value;
}

function apiUrl(path: string) {
  return `${apiBase()}${path}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const escaped = name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1] || "") : "";
}

function record(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : {};
}

function text(value: unknown, fallback = "") {
  const result =
    value === undefined || value === null ? "" : String(value).trim();
  return result || fallback;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const csrfToken = getCookie("csrftoken");
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      ...(init?.headers || {}),
    },
  });
  const raw = await response.text();
  let payload: unknown = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = {};
    }
  }
  if (!response.ok) {
    const source = record(payload);
    throw new Error(
      text(source.message) ||
        text(source.detail) ||
        text(source.error) ||
        `HTTP ${response.status}`,
    );
  }
  return payload as T;
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const source = record(payload);
  for (const key of [
    "results",
    "items",
    "payments",
    "customer_payments",
    "supplier_payments",
    "data",
  ]) {
    if (Array.isArray(source[key])) return source[key] as unknown[];
  }
  const nested = record(source.data);
  for (const key of [
    "results",
    "items",
    "payments",
    "customer_payments",
    "supplier_payments",
  ]) {
    if (Array.isArray(nested[key])) return nested[key] as unknown[];
  }
  return [];
}

function unwrapVoucher(payload: unknown) {
  const source = record(payload);
  return (
    source.payment ||
    source.customer_payment ||
    source.supplier_payment ||
    source.result ||
    source.data ||
    payload
  );
}

function normalizeVoucher(value: unknown): VoucherDetails {
  const source = record(value);
  const customer = record(source.customer);
  const supplier = record(source.supplier);
  const party = record(
    source.party || source.counterparty || source.customer || source.supplier,
  );
  const treasuryAccount = record(source.treasury_account);
  const accountingAccount = record(
    source.treasury_accounting_account || treasuryAccount.accounting_account,
  );
  const accountingEntry = record(source.accounting_entry);
  const treasuryTransaction = record(source.treasury_transaction);
  const salesInvoice = record(source.sales_invoice);
  const purchaseBill = record(source.purchase_bill);
  return {
    id: text(source.id || source.pk),
    number: text(
      source.payment_number || source.voucher_number || source.number,
    ),
    date: text(source.payment_date || source.voucher_date || source.date),
    status: text(source.status, "DRAFT").toUpperCase(),
    amount: numberValue(source.amount),
    method: text(source.payment_method || source.method, "OTHER").toUpperCase(),
    reference: text(source.reference, "—"),
    description: text(source.description || source.memo, "—"),
    notes: text(source.notes, "—"),
    cancellationReason: text(source.cancellation_reason),
    partyId: text(
      source.party_id ||
        source.counterparty_id ||
        source.customer_id ||
        source.supplier_id ||
        party.id ||
        customer.id ||
        supplier.id,
    ),
    partyName: text(
      source.party_name ||
        source.counterparty_name ||
        source.customer_name ||
        source.supplier_name ||
        party.name ||
        customer.name ||
        supplier.name,
      "—",
    ),
    partyCode: text(
      source.party_code ||
        source.counterparty_code ||
        source.customer_code ||
        source.supplier_code ||
        party.code ||
        customer.code ||
        supplier.code,
      "—",
    ),
    partyPhone: text(
      source.party_phone ||
        source.counterparty_phone ||
        source.customer_phone ||
        source.supplier_phone ||
        party.phone ||
        party.mobile ||
        customer.phone ||
        supplier.phone,
      "—",
    ),
    partyType: text(
      source.counterparty_type ||
        source.party_type ||
        (source.customer || source.customer_id ? "CUSTOMER" : "") ||
        (source.supplier || source.supplier_id ? "SUPPLIER" : ""),
      "—",
    ).toUpperCase(),
    treasuryAccountId: text(source.treasury_account_id || treasuryAccount.id),
    treasuryAccountName: text(
      source.treasury_account_name || treasuryAccount.name,
      "—",
    ),
    treasuryAccountCode: text(
      source.treasury_account_code || treasuryAccount.code,
      "—",
    ),
    accountingAccountId: text(
      source.treasury_accounting_account_id ||
        source.accounting_account_id ||
        accountingAccount.id,
    ),
    accountingAccountCode: text(
      source.treasury_accounting_account_code ||
        source.accounting_account_code ||
        accountingAccount.code,
      "—",
    ),
    accountingAccountName: text(
      source.treasury_accounting_account_name ||
        source.accounting_account_name ||
        accountingAccount.name,
      "—",
    ),
    accountingEntryId: text(source.accounting_entry_id || accountingEntry.id),
    accountingEntryNumber: text(
      source.accounting_entry_number ||
        accountingEntry.entry_number ||
        accountingEntry.number,
    ),
    accountingEntryStatus: text(
      source.accounting_entry_status || accountingEntry.status,
      "—",
    ),
    treasuryTransactionId: text(
      source.treasury_transaction_id || treasuryTransaction.id,
    ),
    treasuryTransactionNumber: text(
      source.treasury_transaction_number ||
        treasuryTransaction.transaction_number ||
        treasuryTransaction.number,
      "—",
    ),
    treasuryTransactionStatus: text(
      source.treasury_transaction_status || treasuryTransaction.status,
      "—",
    ),
    linkedDocumentId: text(
      source.linked_document_id ||
        source.sales_invoice_id ||
        source.purchase_bill_id ||
        salesInvoice.id ||
        purchaseBill.id,
    ),
    linkedDocumentNumber: text(
      source.linked_document_number ||
        source.sales_invoice_number ||
        source.purchase_bill_number ||
        salesInvoice.invoice_number ||
        salesInvoice.number ||
        purchaseBill.bill_number ||
        purchaseBill.number,
      "—",
    ),
    linkedDocumentStatus: text(
      source.linked_document_status ||
        source.linked_document_payment_status ||
        salesInvoice.status ||
        purchaseBill.status,
      "—",
    ),
    createdAt: text(source.created_at),
    updatedAt: text(source.updated_at || source.created_at),
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10) || "—";
  return parsed.toISOString().slice(0, 10);
}

function formatDateTime() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function extractCompanyName(payload: unknown) {
  const source = record(payload);
  const company = record(
    source.company ||
      source.current_company ||
      source.workspace_company ||
      source.active_company,
  );
  return text(
    source.company_name ||
      source.current_company_name ||
      source.workspace_company_name ||
      company.name ||
      company.company_name ||
      company.legal_name ||
      company.display_name,
  );
}

function technicalStatusLabel(value: string, locale: Locale) {
  const normalized = text(value, "—").toUpperCase();
  const labels: Record<string, { ar: string; en: string }> = {
    POSTED: { ar: "مرحل", en: "Posted" },
    CONFIRMED: { ar: "مؤكد", en: "Confirmed" },
    DRAFT: { ar: "مسودة", en: "Draft" },
    CANCELLED: { ar: "ملغى", en: "Cancelled" },
    CANCELED: { ar: "ملغى", en: "Cancelled" },
    REVERSED: { ar: "معكوس", en: "Reversed" },
    PAID: { ar: "مدفوع", en: "Paid" },
    PARTIAL: { ar: "مدفوع جزئيًا", en: "Partially paid" },
    UNPAID: { ar: "غير مدفوع", en: "Unpaid" },
    PENDING: { ar: "قيد الانتظار", en: "Pending" },
    ACTIVE: { ar: "نشط", en: "Active" },
    INACTIVE: { ar: "غير نشط", en: "Inactive" },
  };
  return labels[normalized]?.[locale] || value || "—";
}

const ARABIC_ONES = [
  "",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
] as const;

const ARABIC_TEENS = [
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر",
] as const;

const ARABIC_TENS = [
  "",
  "",
  "عشرون",
  "ثلاثون",
  "أربعون",
  "خمسون",
  "ستون",
  "سبعون",
  "ثمانون",
  "تسعون",
] as const;

const ARABIC_HUNDREDS = [
  "",
  "مائة",
  "مائتان",
  "ثلاثمائة",
  "أربعمائة",
  "خمسمائة",
  "ستمائة",
  "سبعمائة",
  "ثمانمائة",
  "تسعمائة",
] as const;

function joinArabic(parts: string[]) {
  return parts.filter(Boolean).join(" و");
}

function arabicUnderThousand(value: number): string {
  const number = Math.max(0, Math.floor(value));
  if (number === 0) return "";

  const hundreds = Math.floor(number / 100);
  const remainder = number % 100;
  const parts: string[] = [];

  if (hundreds) parts.push(ARABIC_HUNDREDS[hundreds] || "");

  if (remainder >= 10 && remainder <= 19) {
    parts.push(ARABIC_TEENS[remainder - 10] || "");
  } else {
    const ones = remainder % 10;
    const tens = Math.floor(remainder / 10);
    if (ones) parts.push(ARABIC_ONES[ones] || "");
    if (tens) parts.push(ARABIC_TENS[tens] || "");
  }

  return joinArabic(parts);
}

function arabicScale(
  group: number,
  singular: string,
  dual: string,
  plural: string,
) {
  if (group === 0) return "";
  if (group === 1) return singular;
  if (group === 2) return dual;
  const words = arabicUnderThousand(group);
  if (group >= 3 && group <= 10) return `${words} ${plural}`;
  return `${words} ${singular}`;
}

function arabicNumberToWords(value: number): string {
  const number = Math.max(0, Math.floor(value));
  if (number === 0) return "صفر";

  const millions = Math.floor(number / 1_000_000);
  const thousands = Math.floor((number % 1_000_000) / 1_000);
  const remainder = number % 1_000;
  const parts = [
    arabicScale(millions, "مليون", "مليونان", "ملايين"),
    arabicScale(thousands, "ألف", "ألفان", "آلاف"),
    arabicUnderThousand(remainder),
  ].filter(Boolean);

  return joinArabic(parts);
}

const ENGLISH_ONES = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const;

const ENGLISH_TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
] as const;

function englishUnderThousand(value: number): string {
  const number = Math.max(0, Math.floor(value));
  if (number === 0) return "";
  const hundreds = Math.floor(number / 100);
  const remainder = number % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ENGLISH_ONES[hundreds]} hundred`);
  if (remainder < 20) {
    if (remainder) parts.push(ENGLISH_ONES[remainder] || "");
  } else {
    const tens = Math.floor(remainder / 10);
    const ones = remainder % 10;
    parts.push(
      ones
        ? `${ENGLISH_TENS[tens]}-${ENGLISH_ONES[ones]}`
        : ENGLISH_TENS[tens] || "",
    );
  }
  return parts.filter(Boolean).join(" ");
}

function englishNumberToWords(value: number): string {
  const number = Math.max(0, Math.floor(value));
  if (number === 0) return "zero";
  const millions = Math.floor(number / 1_000_000);
  const thousands = Math.floor((number % 1_000_000) / 1_000);
  const remainder = number % 1_000;
  return [
    millions ? `${englishUnderThousand(millions)} million` : "",
    thousands ? `${englishUnderThousand(thousands)} thousand` : "",
    englishUnderThousand(remainder),
  ]
    .filter(Boolean)
    .join(" ");
}

function amountInWords(value: number, locale: Locale) {
  const totalHalalas = Math.max(0, Math.round(value * 100));
  const riyals = Math.floor(totalHalalas / 100);
  const halalas = totalHalalas % 100;

  if (locale === "ar") {
    let riyalWords = arabicNumberToWords(riyals);
    if (riyalWords.endsWith("مائتان")) {
      riyalWords = `${riyalWords.slice(0, -"مائتان".length)}مائتا`;
    }
    const halalaWords = halalas ? ` و${arabicNumberToWords(halalas)} هللة` : "";
    return `فقط ${riyalWords} ريال سعودي${halalaWords} لا غير`;
  }

  const riyalLabel = riyals === 1 ? "Saudi riyal" : "Saudi riyals";
  const halalaWords = halalas
    ? ` and ${englishNumberToWords(halalas)} halalas`
    : "";
  return `Only ${englishNumberToWords(riyals)} ${riyalLabel}${halalaWords}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function MoneyValue({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold">
      <span dir="ltr" lang="en" className="tabular-nums">
        {money(value)}
      </span>
      <Image
        src="/currency/sar.svg"
        alt={label}
        width={14}
        height={14}
        className="h-3.5 w-3.5 shrink-0"
      />
    </span>
  );
}

function statusKey(status: string): "draft" | "confirmed" | "cancelled" {
  const normalized = status.toUpperCase();
  if (normalized === "CONFIRMED" || normalized === "POSTED") return "confirmed";
  if (
    normalized === "CANCELLED" ||
    normalized === "CANCELED" ||
    normalized === "REVERSED"
  ) {
    return "cancelled";
  }
  return "draft";
}

function statusLabel(status: string, locale: Locale) {
  return translations[locale][statusKey(status)];
}

function statusClasses(status: string) {
  const key = statusKey(status);
  if (key === "confirmed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (key === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function methodLabel(method: string, locale: Locale) {
  const t = translations[locale];
  const normalized = method.toUpperCase();
  if (normalized === "BANK_TRANSFER") return t.bankTransfer;
  if (normalized === "CARD") return t.card;
  if (normalized === "WALLET") return t.wallet;
  if (normalized === "CHECK") return t.check;
  if (normalized === "CASH") return t.cash;
  return t.other;
}

function partyTypeLabel(value: string, locale: Locale) {
  const normalized = value.toUpperCase();
  if (locale === "ar") {
    if (normalized === "CUSTOMER") return "عميل";
    if (normalized === "SUPPLIER") return "مورد";
    if (normalized === "EMPLOYEE") return "موظف";
    if (normalized === "OTHER") return "طرف آخر";
  } else {
    if (normalized === "CUSTOMER") return "Customer";
    if (normalized === "SUPPLIER") return "Supplier";
    if (normalized === "EMPLOYEE") return "Employee";
    if (normalized === "OTHER") return "Other party";
  }
  return value || "—";
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="group rounded-lg border bg-card shadow-none transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">
            {title}
          </CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight">
            {value}
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

function DetailField({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const content = (
    <>
      <span className="rounded-lg border bg-muted/30 p-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 break-words text-sm font-medium text-foreground">
          {value || "—"}
        </div>
      </div>
      {href ? (
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="flex min-h-[74px] items-start gap-3 rounded-lg border bg-background p-4 transition hover:bg-muted/35"
    >
      {content}
    </Link>
  ) : (
    <div className="flex min-h-[74px] items-start gap-3 rounded-lg border bg-background p-4">
      {content}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-4 w-full max-w-3xl" />
          </CardHeader>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-lg border bg-card shadow-none">
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-32" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="p-6">
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export function TreasuryVoucherDetailPage({
  variant,
  voucherNumber,
}: {
  variant: VoucherVariant;
  voucherNumber: string;
}) {
  const router = useRouter();
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [voucher, setVoucher] = React.useState<VoucherDetails | null>(null);
  const [error, setError] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [autoPrintRequested, setAutoPrintRequested] = React.useState(false);
  const autoPrintHandledRef = React.useRef(false);
  const printReportRef = React.useRef<(targetWindow?: Window) => void>(
    () => undefined,
  );

  React.useEffect(() => {
    const applyLocale = () => {
      const next = initialLocale();
      setLocale(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.body.dir = next === "ar" ? "rtl" : "ltr";
    };
    applyLocale();
    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);
    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  React.useEffect(() => {
    setAutoPrintRequested(
      new URLSearchParams(window.location.search).get("print") === "voucher",
    );
  }, []);

  React.useEffect(() => {
    let active = true;
    void requestJson<unknown>("/api/auth/whoami/")
      .then((payload) => {
        if (active) setCompanyName(extractCompanyName(payload));
      })
      .catch(() => {
        if (active) setCompanyName("");
      });
    return () => {
      active = false;
    };
  }, []);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;
  const apiPath =
    variant === "receipt"
      ? "/api/company/treasury/customer-payments/"
      : "/api/company/treasury/supplier-payments/";
  const backHref =
    variant === "receipt"
      ? "/company/treasury/receipt-vouchers"
      : "/company/treasury/payment-vouchers";
  const title = variant === "receipt" ? t.receiptTitle : t.paymentTitle;
  const subtitle =
    variant === "receipt" ? t.receiptSubtitle : t.paymentSubtitle;
  const backLabel = variant === "receipt" ? t.receiptBack : t.paymentBack;

  const loadVoucher = React.useCallback(
    async ({
      notify = false,
      silent = false,
    }: { notify?: boolean; silent?: boolean } = {}) => {
      if (!voucherNumber) return;
      if (!silent) setLoading(true);
      setRefreshing(true);
      setError("");
      try {
        const encoded = encodeURIComponent(voucherNumber);
        let listPayload = await requestJson<unknown>(
          `${apiPath}?search=${encoded}&page_size=100`,
        );
        let rows = extractRows(listPayload).map(normalizeVoucher);
        let match =
          rows.find(
            (row) => row.number.toUpperCase() === voucherNumber.toUpperCase(),
          ) || (rows.length === 1 ? rows[0] : undefined);
        if (!match) {
          listPayload = await requestJson<unknown>(`${apiPath}?page_size=500`);
          rows = extractRows(listPayload).map(normalizeVoucher);
          match = rows.find(
            (row) => row.number.toUpperCase() === voucherNumber.toUpperCase(),
          );
        }
        if (!match) throw new Error(t.notFound);
        if (match.id) {
          const detailPayload = await requestJson<unknown>(
            `${apiPath}${encodeURIComponent(match.id)}/`,
          );
          setVoucher(normalizeVoucher(unwrapVoucher(detailPayload)));
        } else {
          setVoucher(match);
        }
        if (notify) toast.success(t.refreshed);
      } catch (caughtError) {
        setVoucher(null);
        const message =
          caughtError instanceof Error ? caughtError.message : t.loadFailed;
        setError(message);
        if (notify) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiPath, t.loadFailed, t.notFound, t.refreshed, voucherNumber],
  );

  React.useEffect(() => {
    void loadVoucher();
  }, [loadVoucher]);

  const status = voucher ? statusKey(voucher.status) : "draft";
  const canConfirm = Boolean(voucher?.id && status === "draft");
  const canCancel = Boolean(voucher?.id && status !== "cancelled");

  const partyHref = React.useMemo(() => {
    if (!voucher?.partyId) return "";
    if (voucher.partyType === "CUSTOMER") {
      return `/company/customers/${encodeURIComponent(voucher.partyId)}`;
    }
    if (voucher.partyType === "SUPPLIER") {
      return `/company/suppliers/${encodeURIComponent(voucher.partyId)}`;
    }
    return "";
  }, [voucher]);

  const accountingAccountHref = voucher?.accountingAccountId
    ? `/company/accounting/chart-of-accounts/${encodeURIComponent(
        voucher.accountingAccountId,
      )}`
    : "";

  const accountingEntryHref = voucher?.accountingEntryNumber
    ? `/company/accounting/journal-entries/${encodeURIComponent(
        voucher.accountingEntryNumber,
      )}`
    : "";

  const linkedDocumentHref = React.useMemo(() => {
    if (!voucher?.linkedDocumentId && !voucher?.linkedDocumentNumber) return "";
    const identifier = voucher.linkedDocumentId || voucher.linkedDocumentNumber;
    return variant === "receipt"
      ? `/company/sales/invoices/${encodeURIComponent(identifier)}`
      : `/company/purchases/bills/${encodeURIComponent(identifier)}`;
  }, [variant, voucher]);

  async function confirmVoucher() {
    if (!voucher?.id || !canConfirm) return;
    setActionLoading(true);
    try {
      await requestJson(
        `${apiPath}${encodeURIComponent(voucher.id)}/confirm/`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      toast.success(t.confirmedDone);
      setConfirmOpen(false);
      await loadVoucher({ silent: true });
    } catch (caughtError) {
      toast.error(
        caughtError instanceof Error ? caughtError.message : t.actionFailed,
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelVoucher() {
    if (!voucher?.id || !canCancel) return;
    setActionLoading(true);
    try {
      await requestJson(`${apiPath}${encodeURIComponent(voucher.id)}/cancel/`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      toast.success(t.cancelledDone);
      setCancelOpen(false);
      setCancelReason("");
      await loadVoucher({ silent: true });
    } catch (caughtError) {
      toast.error(
        caughtError instanceof Error ? caughtError.message : t.actionFailed,
      );
    } finally {
      setActionLoading(false);
    }
  }

  function reportRows() {
    if (!voucher) return [];
    return [
      [t.number, voucher.number],
      [t.status, statusLabel(voucher.status, locale)],
      [t.date, formatDate(voucher.date)],
      [t.amount, money(voucher.amount)],
      [t.method, methodLabel(voucher.method, locale)],
      [t.reference, voucher.reference],
      [t.description, voucher.description],
      [t.notes, voucher.notes],
      [t.partyName, voucher.partyName],
      [t.partyCode, voucher.partyCode],
      [t.partyPhone, voucher.partyPhone],
      [t.partyType, partyTypeLabel(voucher.partyType, locale)],
      [
        t.treasuryAccount,
        [voucher.treasuryAccountCode, voucher.treasuryAccountName]
          .filter(Boolean)
          .join(" — "),
      ],
      [
        t.accountingAccount,
        [voucher.accountingAccountCode, voucher.accountingAccountName]
          .filter(Boolean)
          .join(" — "),
      ],
      [
        t.accountingEntry,
        [
          voucher.accountingEntryNumber || "—",
          technicalStatusLabel(voucher.accountingEntryStatus, locale),
        ].join(" — "),
      ],
      [
        t.treasuryTransaction,
        [
          voucher.treasuryTransactionNumber || "—",
          technicalStatusLabel(voucher.treasuryTransactionStatus, locale),
        ].join(" — "),
      ],
      [
        t.linkedDocument,
        [
          voucher.linkedDocumentNumber || "—",
          technicalStatusLabel(voucher.linkedDocumentStatus, locale),
        ].join(" — "),
      ],
      [t.createdAt, formatDate(voucher.createdAt)],
      [t.updatedAt, formatDate(voucher.updatedAt)],
    ];
  }

  function exportExcel() {
    if (!voucher) return;
    const rows = reportRows();
    const html = `<!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #111; }
            h1 { margin: 0 0 6px; font-size: 22px; }
            p { margin: 0 0 16px; color: #555; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: ${
              locale === "ar" ? "right" : "left"
            }; vertical-align: top; }
            th { width: 28%; background: #f3f4f6; }
            .text { mso-number-format: '\\@'; direction: ltr; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)} ${escapeHtml(voucher.number)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(formatDateTime())}</p>
          <table>
            <tbody>
              ${rows
                .map(
                  ([label, value]) =>
                    `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(
                      value,
                    )}</td></tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>`;
    const blob = new Blob(["\uFEFF", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${variant}-voucher-${voucher.number || voucher.id}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(t.exportReady);
  }

  function printReport(targetWindow?: Window) {
    if (!voucher) return;
    const popup =
      targetWindow || window.open("", "_blank", "width=980,height=900");
    if (!popup) {
      toast.error(t.printBlocked);
      return;
    }

    popup.opener = null;

    const isReceipt = variant === "receipt";
    const documentTitle = isReceipt
      ? t.receiptDocumentTitle
      : t.paymentDocumentTitle;
    const partyLine = isReceipt ? t.receiptPartyLine : t.paymentPartyLine;
    const purposeLabel = isReceipt ? t.receiptFor : t.paymentFor;
    const displayCompanyName =
      companyName || (locale === "ar" ? "الشركة الحالية" : "Current company");
    const cancelled = statusKey(voucher.status) === "cancelled";
    const sarIconUrl = `${window.location.origin}/currency/sar.svg`;
    const signatures = isReceipt
      ? [
          t.receiverSignature,
          t.accountantSignature,
          t.managerSignature,
          t.stampSignature,
        ]
      : [
          t.receiverSignature,
          t.preparerSignature,
          t.accountantSignature,
          t.approverSignature,
        ];

    const optionalReference =
      voucher.reference && voucher.reference !== "—"
        ? `<div class="detail-item">
             <span>${escapeHtml(t.reference)}</span>
             <strong>${escapeHtml(voucher.reference)}</strong>
           </div>`
        : "";

    const optionalLinkedDocument =
      voucher.linkedDocumentNumber && voucher.linkedDocumentNumber !== "—"
        ? `<div class="detail-item">
             <span>${escapeHtml(t.linkedDocument)}</span>
             <strong dir="ltr">${escapeHtml(
               voucher.linkedDocumentNumber,
             )}</strong>
           </div>`
        : "";

    const optionalNotes =
      voucher.notes && voucher.notes !== "—"
        ? `<div class="wide-line">
             <span>${escapeHtml(t.notes)}</span>
             <strong>${escapeHtml(voucher.notes)}</strong>
           </div>`
        : "";

    const cancellationReason =
      cancelled && voucher.cancellationReason
        ? `<div class="cancel-reason">
             <span>${escapeHtml(t.cancelReason)}</span>
             <strong>${escapeHtml(voucher.cancellationReason)}</strong>
           </div>`
        : "";

    popup.document.open();
    popup.document.write(`<!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(documentTitle)} ${escapeHtml(
            voucher.number,
          )}</title>
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; color: #111; }
            body {
              font-family: Tahoma, Arial, sans-serif;
              padding: 8mm;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .voucher-sheet {
              position: relative;
              width: 100%;
              min-height: 267mm;
              margin: 0 auto;
              overflow: hidden;
              border: 1.5px solid #111;
              background: #fff;
              padding: 10mm;
            }
            .watermark {
              position: absolute;
              inset: 43% auto auto 50%;
              z-index: 0;
              transform: translate(-50%, -50%) rotate(-28deg);
              color: rgba(190, 18, 60, .12);
              font-size: 88px;
              font-weight: 900;
              white-space: nowrap;
              pointer-events: none;
            }
            .content { position: relative; z-index: 1; }
            .topline {
              display: grid;
              grid-template-columns: 1fr 1.25fr 1fr;
              align-items: start;
              gap: 10px;
              border-bottom: 2px solid #111;
              padding-bottom: 7mm;
            }
            .company-name { font-size: 18px; font-weight: 800; }
            .system-name { margin-top: 5px; font-size: 10px; color: #555; }
            .title-block { text-align: center; }
            .copy-label {
              display: inline-block;
              border: 1px solid #111;
              border-radius: 999px;
              padding: 3px 12px;
              font-size: 10px;
              font-weight: 700;
            }
            h1 { margin: 7px 0 3px; font-size: 26px; }
            .voucher-number {
              direction: ltr;
              font-family: Consolas, monospace;
              font-size: 14px;
              font-weight: 700;
            }
            .meta {
              display: grid;
              gap: 7px;
              font-size: 11px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              border-bottom: 1px solid #999;
              padding-bottom: 5px;
            }
            .meta-row strong { direction: ltr; }
            .party-line {
              margin-top: 9mm;
              border: 1px solid #111;
              padding: 6mm;
              font-size: 15px;
              line-height: 1.8;
            }
            .party-line strong { font-size: 18px; }
            .amount-box {
              display: grid;
              grid-template-columns: 1fr;
              gap: 0;
              margin-top: 6mm;
              border: 1.5px solid #111;
            }
            .amount-row {
              display: grid;
              grid-template-columns: 34mm 1fr;
              align-items: center;
              min-height: 16mm;
            }
            .amount-row + .amount-row { border-top: 1px solid #111; }
            .amount-label {
              align-self: stretch;
              display: flex;
              align-items: center;
              background: #f2f2f2;
              border-inline-end: 1px solid #111;
              padding: 4mm;
              font-size: 11px;
              font-weight: 700;
            }
            .amount-value {
              padding: 4mm 5mm;
              font-size: 14px;
              font-weight: 700;
            }
            .money {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              direction: inherit;
              font-size: 24px;
              font-weight: 900;
            }
            .money img { width: 18px; height: 18px; }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              margin-top: 6mm;
              border: 1px solid #111;
            }
            .detail-item {
              min-height: 17mm;
              padding: 4mm;
              border-bottom: 1px solid #111;
            }
            .detail-item:nth-child(odd) {
              border-inline-end: 1px solid #111;
            }
            .detail-item span,
            .wide-line span,
            .cancel-reason span {
              display: block;
              margin-bottom: 4px;
              color: #555;
              font-size: 10px;
            }
            .detail-item strong,
            .wide-line strong,
            .cancel-reason strong {
              font-size: 13px;
              line-height: 1.6;
            }
            .wide-line,
            .cancel-reason {
              grid-column: 1 / -1;
              min-height: 16mm;
              padding: 4mm;
              border-bottom: 1px solid #111;
            }
            .cancel-reason {
              border: 1px solid #be123c;
              background: #fff1f2;
              color: #9f1239;
              margin-top: 5mm;
            }
            .signatures {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 5mm;
              margin-top: 18mm;
            }
            .signature {
              min-height: 28mm;
              border-top: 1px solid #111;
              padding-top: 4mm;
              text-align: center;
              font-size: 11px;
              font-weight: 700;
            }
            .footer {
              position: absolute;
              right: 10mm;
              left: 10mm;
              bottom: 8mm;
              display: flex;
              justify-content: space-between;
              gap: 12px;
              border-top: 1px solid #aaa;
              padding-top: 3mm;
              color: #666;
              font-size: 8.5px;
            }
            .footer .internal { direction: ltr; text-align: left; }
            @page { size: A4 portrait; margin: 0; }
            @media print {
              body { padding: 0; }
              .voucher-sheet { min-height: 297mm; border: 0; }
            }
          </style>
        </head>
        <body>
          <section class="voucher-sheet">
            ${
              cancelled
                ? `<div class="watermark">${escapeHtml(
                    statusLabel(voucher.status, locale),
                  )}</div>`
                : ""
            }
            <div class="content">
              <header class="topline">
                <div>
                  <div class="company-name">${escapeHtml(
                    displayCompanyName,
                  )}</div>
                  <div class="system-name">PrimeyAcc</div>
                </div>
                <div class="title-block">
                  <div class="copy-label">${escapeHtml(t.originalCopy)}</div>
                  <h1>${escapeHtml(documentTitle)}</h1>
                  <div class="voucher-number">${escapeHtml(
                    voucher.number,
                  )}</div>
                </div>
                <div class="meta">
                  <div class="meta-row">
                    <span>${escapeHtml(t.date)}</span>
                    <strong>${escapeHtml(formatDate(voucher.date))}</strong>
                  </div>
                  <div class="meta-row">
                    <span>${escapeHtml(t.status)}</span>
                    <strong>${escapeHtml(
                      statusLabel(voucher.status, locale),
                    )}</strong>
                  </div>
                </div>
              </header>

              <div class="party-line">
                ${escapeHtml(partyLine)}:
                <strong>${escapeHtml(voucher.partyName)}</strong>
              </div>

              <div class="amount-box">
                <div class="amount-row">
                  <div class="amount-label">${escapeHtml(t.amountNumeric)}</div>
                  <div class="amount-value">
                    <span class="money">
                      <span dir="ltr">${escapeHtml(
                        money(voucher.amount),
                      )}</span>
                      <img src="${escapeHtml(sarIconUrl)}" alt="SAR" />
                    </span>
                  </div>
                </div>
                <div class="amount-row">
                  <div class="amount-label">${escapeHtml(t.amountWords)}</div>
                  <div class="amount-value">${escapeHtml(
                    amountInWords(voucher.amount, locale),
                  )}</div>
                </div>
              </div>

              <div class="details-grid">
                <div class="detail-item">
                  <span>${escapeHtml(purposeLabel)}</span>
                  <strong>${escapeHtml(voucher.description)}</strong>
                </div>
                <div class="detail-item">
                  <span>${escapeHtml(t.method)}</span>
                  <strong>${escapeHtml(
                    methodLabel(voucher.method, locale),
                  )}</strong>
                </div>
                <div class="detail-item">
                  <span>${escapeHtml(t.treasurySource)}</span>
                  <strong>${escapeHtml(voucher.treasuryAccountName)}</strong>
                </div>
                <div class="detail-item">
                  <span>${escapeHtml(t.partyPhone)}</span>
                  <strong dir="ltr">${escapeHtml(voucher.partyPhone)}</strong>
                </div>
                ${optionalReference}
                ${optionalLinkedDocument}
                ${optionalNotes}
              </div>

              ${cancellationReason}

              <div class="signatures">
                ${signatures
                  .map(
                    (label) =>
                      `<div class="signature">${escapeHtml(label)}</div>`,
                  )
                  .join("")}
              </div>
            </div>

            <footer class="footer">
              <span>${escapeHtml(t.generatedAt)}: ${escapeHtml(
                formatDateTime(),
              )}</span>
              <span class="internal">${escapeHtml(
                t.internalReference,
              )}: ${escapeHtml(
                [
                  voucher.accountingEntryNumber,
                  voucher.treasuryTransactionNumber,
                ]
                  .filter(Boolean)
                  .join(" / ") || "—",
              )}</span>
            </footer>
          </section>
          <script>
            window.onload = () => {
              window.onafterprint = () => window.close();
              window.focus();
              window.print();
            };
          <\/script>
        </body>
      </html>`);
    popup.document.close();
    if (!targetWindow) toast.success(t.printReady);
  }

  printReportRef.current = printReport;

  React.useEffect(() => {
    if (
      !autoPrintRequested ||
      !voucher ||
      autoPrintHandledRef.current
    ) {
      return;
    }

    autoPrintHandledRef.current = true;

    const timer = window.setTimeout(() => {
      printReportRef.current(window);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [autoPrintRequested, voucher]);

  if (loading) return <DetailSkeleton />;

  if (!voucher) {
    return (
      <main
        dir={dir}
        className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8"
      >
        <Card className="mx-auto max-w-[900px] rounded-lg border-rose-200 bg-card shadow-none">
          <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
            <CircleAlert className="h-10 w-10 text-rose-500" />
            <div>
              <h1 className="text-xl font-bold">{t.loadFailed}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {error || t.notFound}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild variant="outline">
                <Link href={backHref}>
                  <BackIcon className="h-4 w-4" />
                  {backLabel}
                </Link>
              </Button>
              <Button
                type="button"
                onClick={() => void loadVoucher({ notify: true, silent: true })}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {t.tryAgain}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main
      dir={dir}
      className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[1500px] space-y-5">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-2 text-start">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <ReceiptText className="h-3.5 w-3.5" />
                  {t.badge}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
                    {title}{" "}
                    <span
                      dir="ltr"
                      lang="en"
                      className="inline-block font-mono"
                    >
                      {voucher.number}
                    </span>
                  </h1>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs",
                      statusClasses(voucher.status),
                    )}
                  >
                    {statusLabel(voucher.status, locale)}
                  </Badge>
                </div>
                <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
                  {subtitle}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span dir="ltr" lang="en" className="tabular-nums">
                    {formatDate(voucher.date)}
                  </span>
                  <span>•</span>
                  <span>{methodLabel(voucher.method, locale)}</span>
                  <span>•</span>
                  <span>{partyTypeLabel(voucher.partyType, locale)}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button asChild variant="outline">
                  <Link href={backHref}>
                    <BackIcon className="h-4 w-4" />
                    {backLabel}
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void loadVoucher({ notify: true, silent: true })
                  }
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {t.refresh}
                </Button>
                <Button type="button" variant="outline" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button type="button" variant="outline" onClick={() => printReport()}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={t.actions}
                      title={t.actions}
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreVertical className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align={locale === "ar" ? "start" : "end"}
                    className="w-52"
                  >
                    {partyHref ? (
                      <DropdownMenuItem onClick={() => router.push(partyHref)}>
                        <UserRound className="h-4 w-4" />
                        {t.partyData}
                      </DropdownMenuItem>
                    ) : null}
                    {accountingAccountHref ? (
                      <DropdownMenuItem
                        onClick={() => router.push(accountingAccountHref)}
                      >
                        <Landmark className="h-4 w-4" />
                        {t.accountingAccount}
                      </DropdownMenuItem>
                    ) : null}
                    {accountingEntryHref ? (
                      <DropdownMenuItem
                        onClick={() => router.push(accountingEntryHref)}
                      >
                        <FileText className="h-4 w-4" />
                        {t.accountingEntry}
                      </DropdownMenuItem>
                    ) : null}
                    {canConfirm || canCancel ? <DropdownMenuSeparator /> : null}
                    {canConfirm ? (
                      <DropdownMenuItem
                        disabled={actionLoading}
                        onClick={() => setConfirmOpen(true)}
                        className="text-emerald-700 focus:text-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {t.confirm}
                      </DropdownMenuItem>
                    ) : null}
                    {canCancel ? (
                      <DropdownMenuItem
                        disabled={actionLoading}
                        onClick={() => setCancelOpen(true)}
                        className="text-rose-600 focus:text-rose-600"
                      >
                        <CircleX className="h-4 w-4" />
                        {t.cancelVoucher}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </Card>

        {status === "cancelled" ? (
          <Card className="rounded-lg border-rose-200 bg-rose-50/60 shadow-none">
            <CardContent className="flex items-start gap-3 p-4 text-rose-800">
              <CircleX className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">{t.cancelledNoticeTitle}</p>
                <p className="mt-1 text-sm leading-6 text-rose-700">
                  {t.cancelledNoticeDescription}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t.status}
            value={
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs",
                  statusClasses(voucher.status),
                )}
              >
                {statusLabel(voucher.status, locale)}
              </Badge>
            }
            description={t.status}
            icon={BadgeCheck}
          />
          <KpiCard
            title={t.amount}
            value={<MoneyValue value={voucher.amount} label={t.sar} />}
            description={t.amount}
            icon={Banknote}
          />
          <KpiCard
            title={t.date}
            value={
              <span dir="ltr" lang="en" className="tabular-nums">
                {formatDate(voucher.date)}
              </span>
            }
            description={t.date}
            icon={CalendarDays}
          />
          <KpiCard
            title={t.method}
            value={methodLabel(voucher.method, locale)}
            description={t.method}
            icon={WalletCards}
          />
        </div>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <CardTitle className="text-base">{t.voucherData}</CardTitle>
            <CardDescription>{t.voucherDataDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-3 sm:px-6">
            <DetailField
              label={t.number}
              value={
                <span dir="ltr" lang="en" className="font-mono tabular-nums">
                  {voucher.number}
                </span>
              }
              icon={Hash}
            />
            <DetailField
              label={t.date}
              value={
                <span dir="ltr" lang="en" className="tabular-nums">
                  {formatDate(voucher.date)}
                </span>
              }
              icon={CalendarDays}
            />
            <DetailField
              label={t.status}
              value={statusLabel(voucher.status, locale)}
              icon={BadgeCheck}
            />
            <DetailField
              label={t.method}
              value={methodLabel(voucher.method, locale)}
              icon={WalletCards}
            />
            <DetailField
              label={t.reference}
              value={voucher.reference}
              icon={FileText}
            />
            <DetailField
              label={t.linkedDocument}
              value={
                <div>
                  <p dir="ltr" lang="en" className="tabular-nums">
                    {voucher.linkedDocumentNumber}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {technicalStatusLabel(voucher.linkedDocumentStatus, locale)}
                  </p>
                </div>
              }
              icon={ReceiptText}
              href={linkedDocumentHref}
            />
            <div className="md:col-span-2 xl:col-span-3">
              <DetailField
                label={t.description}
                value={voucher.description}
                icon={FileText}
              />
            </div>
            <div className="md:col-span-2 xl:col-span-3">
              <DetailField
                label={t.notes}
                value={voucher.notes}
                icon={FileText}
              />
            </div>
            {status === "cancelled" && voucher.cancellationReason ? (
              <div className="md:col-span-2 xl:col-span-3">
                <DetailField
                  label={t.cancelReason}
                  value={voucher.cancellationReason}
                  icon={CircleX}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 pt-5 sm:px-6">
              <CardTitle className="text-base">{t.partyData}</CardTitle>
              <CardDescription>{t.partyDataDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-5 pb-5 md:grid-cols-2 sm:px-6">
              <DetailField
                label={t.partyName}
                value={voucher.partyName}
                icon={UserRound}
                href={partyHref}
              />
              {voucher.partyCode && voucher.partyCode !== "—" ? (
                <DetailField
                  label={t.partyCode}
                  value={
                    <span
                      dir="ltr"
                      lang="en"
                      className="font-mono tabular-nums"
                    >
                      {voucher.partyCode}
                    </span>
                  }
                  icon={Hash}
                />
              ) : null}
              <DetailField
                label={t.partyPhone}
                value={
                  <span dir="ltr" lang="en" className="tabular-nums">
                    {voucher.partyPhone}
                  </span>
                }
                icon={Phone}
              />
              <DetailField
                label={t.partyType}
                value={partyTypeLabel(voucher.partyType, locale)}
                icon={UserRound}
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 pt-5 sm:px-6">
              <CardTitle className="text-base">{t.treasuryData}</CardTitle>
              <CardDescription>{t.treasuryDataDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-5 pb-5 md:grid-cols-2 sm:px-6">
              <DetailField
                label={t.treasuryAccount}
                value={
                  <div>
                    <p>{voucher.treasuryAccountName}</p>
                    <p
                      className="mt-1 text-xs text-muted-foreground"
                      dir="ltr"
                      lang="en"
                    >
                      {voucher.treasuryAccountCode}
                    </p>
                  </div>
                }
                icon={WalletCards}
                href={accountingAccountHref}
              />
              <DetailField
                label={t.accountingAccount}
                value={
                  <div>
                    <p>{voucher.accountingAccountName}</p>
                    <p
                      className="mt-1 text-xs text-muted-foreground"
                      dir="ltr"
                      lang="en"
                    >
                      {voucher.accountingAccountCode}
                    </p>
                  </div>
                }
                icon={Landmark}
                href={accountingAccountHref}
              />
              <DetailField
                label={t.treasuryTransaction}
                value={
                  <div>
                    <p dir="ltr" lang="en" className="tabular-nums">
                      {voucher.treasuryTransactionNumber}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {technicalStatusLabel(
                        voucher.treasuryTransactionStatus,
                        locale,
                      )}
                    </p>
                  </div>
                }
                icon={WalletCards}
              />
              <DetailField
                label={t.accountingEntry}
                value={
                  <div>
                    <p dir="ltr" lang="en" className="tabular-nums">
                      {voucher.accountingEntryNumber || "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {technicalStatusLabel(
                        voucher.accountingEntryStatus,
                        locale,
                      )}
                    </p>
                  </div>
                }
                icon={FileText}
                href={accountingEntryHref}
              />
              <DetailField
                label={t.createdAt}
                value={
                  <span dir="ltr" lang="en" className="tabular-nums">
                    {formatDate(voucher.createdAt)}
                  </span>
                }
                icon={CalendarDays}
              />
              <DetailField
                label={t.updatedAt}
                value={
                  <span dir="ltr" lang="en" className="tabular-nums">
                    {formatDate(voucher.updatedAt)}
                  </span>
                }
                icon={RefreshCw}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <span className="font-medium">{t.number}: </span>
            <span dir="ltr" lang="en" className="font-mono tabular-nums">
              {voucher.number}
            </span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              {t.close}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmVoucher();
              }}
              disabled={actionLoading}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.cancelTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.cancelDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <span className="font-medium">{t.number}: </span>
              <span dir="ltr" lang="en" className="font-mono tabular-nums">
                {voucher.number}
              </span>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-medium">{t.cancelReason}</span>
              <textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={3}
                className="min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={actionLoading}
              onClick={() => setCancelReason("")}
            >
              {t.close}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void cancelVoucher();
              }}
              disabled={actionLoading}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CircleX className="h-4 w-4" />
              )}
              {t.cancelAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
