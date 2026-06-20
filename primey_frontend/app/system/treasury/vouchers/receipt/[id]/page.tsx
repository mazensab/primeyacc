"use client";

/* ============================================================
   📂 app/system/treasury/vouchers/receipt/[id]/page.tsx
   🧠 Primey Care | Receipt Voucher Details Page
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET  /api/treasury/transactions/{id}/
      POST /api/treasury/transactions/{id}/confirm/
      POST /api/treasury/transactions/{id}/cancel/
   ✅ Receipt voucher details
   ✅ Create/save/confirm primary actions are black
   ✅ Secondary actions are outline
   ✅ Web Print
   ✅ Skeleton / Error / Not Found states
   ✅ sonner
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
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
import { Skeleton } from "@/components/ui/skeleton";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  data?: unknown;
  result?: unknown;
  item?: unknown;
  transaction?: unknown;
  message?: string;
  detail?: string;
  error?: string;
  errors?: unknown;
};

type ReceiptVoucher = {
  id: string;
  transaction_number: string;
  transaction_type: string;
  source: string;
  source_label: string;
  status: string;
  status_label: string;
  transaction_date: string | null;
  treasury_account_id: string;
  treasury_account_name: string;
  treasury_account_code: string;
  amount: number;
  fees_amount: number;
  net_amount: number;
  currency: string;
  reference: string;
  external_reference: string;
  source_number: string;
  party_name: string;
  description: string;
  notes: string;
  balance_applied: boolean;
  accounting_posted: boolean;
  treasury_posted: boolean;
  created_at: string | null;
  updated_at: string | null;
  created_by_name: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string;
};

const translations = {
  ar: {
    title: "تفاصيل سند القبض",
    subtitle: "عرض بيانات سند القبض وحالته وأثره على الخزينة.",
    back: "سندات الخزينة",
    treasury: "الخزينة",
    transactions: "حركات الخزينة",
    refresh: "تحديث",
    print: "طباعة",
    confirm: "تأكيد السند",
    cancel: "إلغاء السند",
    confirming: "جاري التأكيد...",
    cancelling: "جاري الإلغاء...",

    summary: "ملخص سند القبض",
    summaryDescription: "القيمة والحالة والحساب المرتبط.",
    details: "بيانات السند",
    detailsDescription: "المرجع والطرف والوصف ومعلومات الإنشاء.",
    posting: "الأثر والترحيل",
    postingDescription: "حالة تطبيق الرصيد والربط المحاسبي.",
    status: "الحالة",
    voucherNo: "رقم السند",
    amount: "المبلغ",
    fees: "الرسوم",
    net: "الصافي",
    account: "حساب الخزينة",
    accountCode: "رمز الحساب",
    date: "تاريخ السند",
    source: "المصدر",
    reference: "المرجع",
    externalReference: "مرجع خارجي",
    sourceNumber: "رقم المصدر",
    party: "الطرف",
    description: "الوصف",
    notes: "ملاحظات",
    createdBy: "أنشئ بواسطة",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    confirmedAt: "تاريخ التأكيد",
    cancelledAt: "تاريخ الإلغاء",
    cancellationReason: "سبب الإلغاء",
    balanceApplied: "تطبيق الرصيد",
    accountingPosted: "الترحيل المحاسبي",
    treasuryPosted: "ترحيل الخزينة",
    applied: "مطبق",
    notApplied: "غير مطبق",
    posted: "مرحل",
    notPosted: "غير مرحل",
    emptyValue: "غير محدد",
    noNotes: "لا توجد ملاحظات.",
    noDescription: "لا يوجد وصف.",
    notFoundTitle: "سند القبض غير موجود",
    notFoundDescription: "تعذر العثور على سند القبض المطلوب أو قد لا تملك صلاحية عرضه.",
    errorTitle: "تعذر تحميل سند القبض",
    retry: "إعادة المحاولة",
    loadError: "تعذر تحميل بيانات سند القبض.",
    confirmSuccess: "تم تأكيد سند القبض بنجاح.",
    cancelSuccess: "تم إلغاء سند القبض بنجاح.",
    actionError: "تعذر تنفيذ الإجراء.",
    confirmQuestion: "هل تريد تأكيد سند القبض؟ لا يمكن تعديل السند بعد التأكيد.",
    cancelQuestion: "هل تريد إلغاء سند القبض؟",
    printTitle: "طباعة سند القبض",
    receiptVoucher: "سند قبض",
    operationalInfo: "معلومات تشغيلية",
    financialInfo: "معلومات مالية",
    auditInfo: "معلومات التدقيق",
    openTransactions: "عرض حركات الخزينة",
  },
  en: {
    title: "Receipt Voucher Details",
    subtitle: "View receipt voucher data, status, and treasury impact.",
    back: "Treasury Vouchers",
    treasury: "Treasury",
    transactions: "Treasury Transactions",
    refresh: "Refresh",
    print: "Print",
    confirm: "Confirm Voucher",
    cancel: "Cancel Voucher",
    confirming: "Confirming...",
    cancelling: "Cancelling...",

    summary: "Receipt voucher summary",
    summaryDescription: "Amount, status, and linked treasury account.",
    details: "Voucher details",
    detailsDescription: "Reference, party, description, and creation details.",
    posting: "Impact and posting",
    postingDescription: "Balance application and accounting posting status.",
    status: "Status",
    voucherNo: "Voucher no.",
    amount: "Amount",
    fees: "Fees",
    net: "Net",
    account: "Treasury account",
    accountCode: "Account code",
    date: "Voucher date",
    source: "Source",
    reference: "Reference",
    externalReference: "External reference",
    sourceNumber: "Source number",
    party: "Party",
    description: "Description",
    notes: "Notes",
    createdBy: "Created by",
    createdAt: "Created at",
    updatedAt: "Updated at",
    confirmedAt: "Confirmed at",
    cancelledAt: "Cancelled at",
    cancellationReason: "Cancellation reason",
    balanceApplied: "Balance applied",
    accountingPosted: "Accounting posted",
    treasuryPosted: "Treasury posted",
    applied: "Applied",
    notApplied: "Not applied",
    posted: "Posted",
    notPosted: "Not posted",
    emptyValue: "Not set",
    noNotes: "No notes.",
    noDescription: "No description.",
    notFoundTitle: "Receipt voucher not found",
    notFoundDescription: "The requested receipt voucher could not be found, or you may not have access.",
    errorTitle: "Could not load receipt voucher",
    retry: "Retry",
    loadError: "Could not load receipt voucher data.",
    confirmSuccess: "Receipt voucher confirmed successfully.",
    cancelSuccess: "Receipt voucher cancelled successfully.",
    actionError: "Could not complete the action.",
    confirmQuestion: "Do you want to confirm this receipt voucher? It cannot be edited after confirmation.",
    cancelQuestion: "Do you want to cancel this receipt voucher?",
    printTitle: "Print receipt voucher",
    receiptVoucher: "Receipt Voucher",
    operationalInfo: "Operational information",
    financialInfo: "Financial information",
    auditInfo: "Audit information",
    openTransactions: "View treasury transactions",
  },
} as const;

const SAR_ICON = "/currency/sar.svg";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";

  const stored = window.localStorage.getItem("primey-locale");

  return stored === "en" ? "en" : "ar";
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) return parts.pop()?.split(";").shift() || "";

  return "";
}

function getApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  return configured.replace(/\/+$/, "");
}

function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) return normalizedPath;

  return `${baseUrl}${normalizedPath}`;
}

function isRecord(value: unknown): value is ApiRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "yes", "y", "posted", "applied", "confirmed"].includes(normalized);
  }

  return false;
}

function asNullableDate(value: unknown): string | null {
  const text = asString(value).trim();

  return text ? text : null;
}

function pickRecord(...values: unknown[]): ApiRecord {
  for (const value of values) {
    if (isRecord(value)) return value;
  }

  return {};
}

function normalizeApiPayload(payload: unknown): ApiRecord {
  if (!isRecord(payload)) return {};

  const response = payload as ApiResponse;

  return pickRecord(
    response.transaction,
    response.item,
    response.result,
    response.data,
    payload,
  );
}

function extractApiError(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;

  const response = payload as ApiResponse;

  const direct =
    asString(response.message) ||
    asString(response.detail) ||
    asString(response.error);

  if (direct) return direct;

  if (typeof response.errors === "string") return response.errors;

  if (isRecord(response.errors)) {
    const first = Object.values(response.errors)[0];

    if (Array.isArray(first)) return first.map((item) => asString(item)).filter(Boolean).join(" ");
    if (typeof first === "string") return first;
  }

  return fallback;
}

function normalizeVoucher(raw: unknown): ReceiptVoucher | null {
  if (!isRecord(raw)) return null;

  const account = pickRecord(
    raw.treasury_account,
    raw.account,
    raw.cashbox,
    raw.bank,
    raw.treasury,
  );

  const id = asString(raw.id || raw.pk || raw.transaction_id);

  if (!id) return null;

  const amount = asNumber(raw.amount || raw.total_amount || raw.value);
  const feesAmount = asNumber(raw.fees_amount || raw.fees || raw.fee_amount);
  const netAmount = asNumber(raw.net_amount || raw.net || raw.received_amount, amount - feesAmount);

  return {
    id,
    transaction_number: asString(
      raw.transaction_number ||
        raw.number ||
        raw.voucher_number ||
        raw.receipt_number ||
        `#${id}`,
    ),
    transaction_type: asString(raw.transaction_type || raw.type || "receipt"),
    source: asString(raw.source || raw.source_type || raw.transaction_source),
    source_label: asString(raw.source_label || raw.source_display || raw.source_name || raw.source),
    status: asString(raw.status || raw.state || "draft").toLowerCase(),
    status_label: asString(raw.status_label || raw.status_display || raw.status || "draft"),
    transaction_date: asNullableDate(raw.transaction_date || raw.date || raw.created_at),
    treasury_account_id: asString(account.id || raw.treasury_account_id || raw.account_id),
    treasury_account_name: asString(
      account.name ||
        account.account_name ||
        raw.treasury_account_name ||
        raw.account_name ||
        raw.cashbox_name ||
        raw.bank_name,
    ),
    treasury_account_code: asString(
      account.code ||
        account.account_code ||
        raw.treasury_account_code ||
        raw.account_code ||
        raw.cashbox_code ||
        raw.bank_code,
    ),
    amount,
    fees_amount: feesAmount,
    net_amount: netAmount,
    currency: asString(raw.currency || raw.currency_code || "SAR"),
    reference: asString(raw.reference || raw.payment_reference || raw.ref || raw.reference_number),
    external_reference: asString(raw.external_reference || raw.gateway_reference || raw.bank_reference),
    source_number: asString(raw.source_number || raw.invoice_number || raw.order_number),
    party_name: asString(
      raw.party_name ||
        raw.customer_name ||
        raw.agent_name ||
        raw.provider_name ||
        raw.counterparty_name ||
        raw.payer_name,
    ),
    description: asString(raw.description || raw.memo || raw.reason),
    notes: asString(raw.notes || raw.internal_notes),
    balance_applied: asBoolean(raw.balance_applied || raw.is_balance_applied),
    accounting_posted: asBoolean(raw.accounting_posted || raw.is_accounting_posted || raw.journal_posted),
    treasury_posted: asBoolean(raw.treasury_posted || raw.is_posted || raw.posted),
    created_at: asNullableDate(raw.created_at),
    updated_at: asNullableDate(raw.updated_at),
    created_by_name: asString(
      raw.created_by_name ||
        raw.created_by_display ||
        raw.created_by_username ||
        raw.created_by,
    ),
    confirmed_at: asNullableDate(raw.confirmed_at || raw.approved_at),
    cancelled_at: asNullableDate(raw.cancelled_at),
    cancellation_reason: asString(raw.cancellation_reason || raw.cancel_reason),
  };
}

function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatMoney(value: number): string {
  return formatNumber(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value: string | null, locale: Locale): string {
  if (!value) return translations[locale].emptyValue;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(value: string | null, locale: Locale): string {
  if (!value) return translations[locale].emptyValue;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function valueOrDash(value: string, locale: Locale): string {
  return value.trim() ? value : translations[locale].emptyValue;
}

function statusClasses(status: string): string {
  switch (status) {
    case "confirmed":
    case "posted":
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "cancelled":
    case "canceled":
    case "void":
      return "border-red-200 bg-red-50 text-red-700";
    case "draft":
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function MoneyValue({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{formatMoney(value)}</span>
      <img src={SAR_ICON} alt="SAR" className="h-4 w-4 shrink-0 opacity-80" />
    </span>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/20 px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="max-w-[62%] text-end text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function PostingBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }
    >
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}

function PageSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Skeleton className="h-[520px] rounded-lg" />
        <Skeleton className="h-[520px] rounded-lg" />
      </div>
    </div>
  );
}

export default function TreasuryReceiptVoucherDetailsPage() {
  const params = useParams<{ id?: string }>();

  const id = React.useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId || "";
  }, [params]);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [voucher, setVoucher] = React.useState<ReceiptVoucher | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState<"confirm" | "cancel" | null>(null);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const canConfirm = voucher?.status === "draft";
  const canCancel = Boolean(voucher && voucher.status !== "cancelled");

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

  const loadVoucher = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");
        setNotFound(false);

        const response = await fetch(apiUrl(`/api/treasury/transactions/${encodeURIComponent(id)}/`), {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        let payload: unknown = null;

        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (response.status === 404) {
          setVoucher(null);
          setNotFound(true);
          return;
        }

        if (!response.ok) {
          throw new Error(extractApiError(payload, t.loadError));
        }

        const normalized = normalizeVoucher(normalizeApiPayload(payload));

        if (!normalized) {
          setVoucher(null);
          setNotFound(true);
          return;
        }

        setVoucher(normalized);
      } catch (requestError) {
        const message =
          requestError instanceof Error && requestError.message
            ? requestError.message
            : t.loadError;

        setError(message);
        setVoucher(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [id, t.loadError],
  );

  React.useEffect(() => {
    void loadVoucher();
  }, [loadVoucher]);

  const performAction = React.useCallback(
    async (action: "confirm" | "cancel") => {
      if (!voucher || actionLoading) return;

      const question = action === "confirm" ? t.confirmQuestion : t.cancelQuestion;
      const accepted = window.confirm(question);

      if (!accepted) return;

      setActionLoading(action);

      try {
        const response = await fetch(
          apiUrl(`/api/treasury/transactions/${encodeURIComponent(voucher.id)}/${action}/`),
          {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify({}),
          },
        );

        let payload: unknown = null;

        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          throw new Error(extractApiError(payload, t.actionError));
        }

        toast.success(action === "confirm" ? t.confirmSuccess : t.cancelSuccess);

        await loadVoucher({ silent: true });
      } catch (requestError) {
        const message =
          requestError instanceof Error && requestError.message
            ? requestError.message
            : t.actionError;

        toast.error(message);
      } finally {
        setActionLoading(null);
      }
    },
    [
      actionLoading,
      loadVoucher,
      t.actionError,
      t.cancelQuestion,
      t.cancelSuccess,
      t.confirmQuestion,
      t.confirmSuccess,
      voucher,
    ],
  );

  const handlePrint = React.useCallback(() => {
    if (!voucher || typeof window === "undefined") return;

    const printWindow = window.open("", "_blank", "width=1100,height=800");

    if (!printWindow) {
      toast.error(t.actionError);
      return;
    }

    const statusLabel = voucher.status_label || voucher.status;
    const direction = locale === "ar" ? "rtl" : "ltr";
    const lang = locale;
    const rows = [
      [t.voucherNo, voucher.transaction_number],
      [t.status, statusLabel],
      [t.date, formatDateOnly(voucher.transaction_date, locale)],
      [t.account, voucher.treasury_account_name],
      [t.accountCode, voucher.treasury_account_code],
      [t.amount, `${formatMoney(voucher.amount)} SAR`],
      [t.fees, `${formatMoney(voucher.fees_amount)} SAR`],
      [t.net, `${formatMoney(voucher.net_amount)} SAR`],
      [t.source, voucher.source_label || voucher.source],
      [t.reference, voucher.reference],
      [t.externalReference, voucher.external_reference],
      [t.sourceNumber, voucher.source_number],
      [t.party, voucher.party_name],
      [t.description, voucher.description],
      [t.notes, voucher.notes],
      [t.balanceApplied, voucher.balance_applied ? t.applied : t.notApplied],
      [t.accountingPosted, voucher.accounting_posted ? t.posted : t.notPosted],
      [t.treasuryPosted, voucher.treasury_posted ? t.posted : t.notPosted],
      [t.createdBy, voucher.created_by_name],
      [t.createdAt, formatDateTime(voucher.created_at, locale)],
      [t.confirmedAt, formatDateTime(voucher.confirmed_at, locale)],
      [t.cancelledAt, formatDateTime(voucher.cancelled_at, locale)],
    ];

    const rowsHtml = rows
      .map(([label, value]) => {
        const safeValue = String(value || "").trim() || t.emptyValue;

        return `
          <tr>
            <th>${escapeHtml(label)}</th>
            <td>${escapeHtml(safeValue)}</td>
          </tr>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang}" dir="${direction}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)} - ${escapeHtml(voucher.transaction_number)}</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 32px;
              background: #f8fafc;
              color: #0f172a;
              font-family: Arial, Tahoma, sans-serif;
            }

            .sheet {
              max-width: 900px;
              margin: 0 auto;
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              overflow: hidden;
            }

            .header {
              padding: 28px 32px;
              border-bottom: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              gap: 24px;
              align-items: flex-start;
            }

            .brand {
              font-size: 14px;
              color: #64748b;
              margin-bottom: 8px;
            }

            h1 {
              margin: 0;
              font-size: 26px;
              letter-spacing: -0.03em;
            }

            .number {
              text-align: end;
              font-size: 14px;
              color: #64748b;
            }

            .number strong {
              display: block;
              color: #0f172a;
              font-size: 18px;
              margin-top: 4px;
            }

            .amount {
              margin: 24px 32px;
              padding: 22px;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              background: #f8fafc;
              display: flex;
              justify-content: space-between;
              gap: 16px;
              align-items: center;
            }

            .amount span {
              color: #64748b;
              font-size: 14px;
            }

            .amount strong {
              font-size: 32px;
            }

            table {
              width: calc(100% - 64px);
              margin: 0 32px 32px;
              border-collapse: collapse;
              border: 1px solid #e2e8f0;
              overflow: hidden;
              border-radius: 12px;
            }

            th,
            td {
              padding: 13px 16px;
              border-bottom: 1px solid #e2e8f0;
              text-align: start;
              vertical-align: top;
              font-size: 14px;
            }

            th {
              width: 280px;
              background: #f8fafc;
              color: #475569;
              font-weight: 700;
            }

            tr:last-child th,
            tr:last-child td {
              border-bottom: 0;
            }

            .footer {
              margin: 0 32px 32px;
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 24px;
            }

            .signature {
              height: 90px;
              border: 1px dashed #cbd5e1;
              border-radius: 14px;
              padding: 14px;
              color: #64748b;
              font-size: 13px;
            }

            @media print {
              body {
                padding: 0;
                background: #fff;
              }

              .sheet {
                max-width: none;
                border: 0;
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div>
                <div class="brand">Primey Care</div>
                <h1>${escapeHtml(t.receiptVoucher)}</h1>
              </div>
              <div class="number">
                ${escapeHtml(t.voucherNo)}
                <strong>${escapeHtml(voucher.transaction_number)}</strong>
              </div>
            </div>

            <div class="amount">
              <div>
                <span>${escapeHtml(t.net)}</span>
                <strong>${escapeHtml(formatMoney(voucher.net_amount))} SAR</strong>
              </div>
              <div>
                <span>${escapeHtml(t.status)}</span>
                <strong>${escapeHtml(statusLabel)}</strong>
              </div>
            </div>

            <table>
              <tbody>${rowsHtml}</tbody>
            </table>

            <div class="footer">
              <div class="signature">${locale === "ar" ? "توقيع المستلم" : "Receiver signature"}</div>
              <div class="signature">${locale === "ar" ? "توقيع المحاسب" : "Accountant signature"}</div>
            </div>
          </div>

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
  }, [locale, t, voucher]);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/system/treasury" className="hover:text-foreground">
                {t.treasury}
              </Link>
              <span>/</span>
              <Link href="/system/treasury/vouchers" className="hover:text-foreground">
                {t.back}
              </Link>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <Button variant="outline" asChild>
            <Link href="/system/treasury/vouchers">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>
        </div>

        <Card className="border-red-200 bg-red-50/60 shadow-none">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-100 p-2 text-red-700">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-red-900">{t.errorTitle}</h2>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>

            <Button onClick={() => void loadVoucher()} variant="outline" className="bg-background">
              <RefreshCw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !voucher) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/system/treasury" className="hover:text-foreground">
                {t.treasury}
              </Link>
              <span>/</span>
              <Link href="/system/treasury/vouchers" className="hover:text-foreground">
                {t.back}
              </Link>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <Button variant="outline" asChild>
            <Link href="/system/treasury/vouchers">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>
        </div>

        <Card className="shadow-none">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-muted p-4">
              <ReceiptText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">{t.notFoundTitle}</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">{t.notFoundDescription}</p>
            <Button className="mt-5 bg-foreground text-background hover:bg-foreground/90" asChild>
              <Link href="/system/treasury/vouchers">
                <BackIcon className="h-4 w-4" />
                {t.back}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/system/treasury" className="hover:text-foreground">
              {t.treasury}
            </Link>
            <span>/</span>
            <Link href="/system/treasury/vouchers" className="hover:text-foreground">
              {t.back}
            </Link>
            <span>/</span>
            <span className="text-foreground">{voucher.transaction_number}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <Badge variant="outline" className={statusClasses(voucher.status)}>
              {voucher.status_label || voucher.status}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/system/treasury/vouchers">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={() => void loadVoucher({ silent: true })}
            disabled={refreshing || Boolean(actionLoading)}
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t.refresh}
          </Button>

          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          {canCancel ? (
            <Button
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
              disabled={Boolean(actionLoading)}
              onClick={() => void performAction("cancel")}
            >
              {actionLoading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              {actionLoading === "cancel" ? t.cancelling : t.cancel}
            </Button>
          ) : null}

          {canConfirm ? (
            <Button
              className="bg-foreground text-background hover:bg-foreground/90"
              disabled={Boolean(actionLoading)}
              onClick={() => void performAction("confirm")}
            >
              {actionLoading === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {actionLoading === "confirm" ? t.confirming : t.confirm}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="overflow-hidden shadow-none">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{t.summary}</CardTitle>
                  <CardDescription>{t.summaryDescription}</CardDescription>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                  <ReceiptText className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              <div className="rounded-lg border bg-background p-4">
                <div className="text-sm text-muted-foreground">{t.net}</div>
                <div className="mt-2">
                  <MoneyValue value={voucher.net_amount} className="text-3xl font-semibold tracking-tight" />
                </div>
              </div>

              <InfoRow
                label={t.voucherNo}
                value={<span className="font-semibold">{voucher.transaction_number}</span>}
                icon={<FileText className="h-4 w-4" />}
              />

              <InfoRow
                label={t.status}
                value={
                  <Badge variant="outline" className={statusClasses(voucher.status)}>
                    {voucher.status_label || voucher.status}
                  </Badge>
                }
                icon={<ShieldCheck className="h-4 w-4" />}
              />

              <InfoRow
                label={t.date}
                value={formatDateOnly(voucher.transaction_date, locale)}
                icon={<ReceiptText className="h-4 w-4" />}
              />

              <InfoRow
                label={t.account}
                value={
                  <span>
                    {valueOrDash(voucher.treasury_account_name, locale)}
                    {voucher.treasury_account_code ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {voucher.treasury_account_code}
                      </span>
                    ) : null}
                  </span>
                }
                icon={<WalletCards className="h-4 w-4" />}
              />
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{t.financialInfo}</CardTitle>
              <CardDescription>{t.summaryDescription}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <InfoRow
                label={t.amount}
                value={<MoneyValue value={voucher.amount} />}
                icon={<Banknote className="h-4 w-4" />}
              />
              <InfoRow
                label={t.fees}
                value={<MoneyValue value={voucher.fees_amount} />}
                icon={<Banknote className="h-4 w-4" />}
              />
              <InfoRow
                label={t.net}
                value={<MoneyValue value={voucher.net_amount} />}
                icon={<Banknote className="h-4 w-4" />}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="shadow-none">
            <CardHeader className="border-b">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{t.details}</CardTitle>
                  <CardDescription>{t.detailsDescription}</CardDescription>
                </div>

                <CardAction>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/system/treasury/transactions">
                      <WalletCards className="h-4 w-4" />
                      {t.openTransactions}
                    </Link>
                  </Button>
                </CardAction>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-4">
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                    <ReceiptText className="h-4 w-4" />
                  </div>
                  <h2 className="font-semibold">{t.operationalInfo}</h2>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <InfoRow label={t.source} value={valueOrDash(voucher.source_label || voucher.source, locale)} />
                  <InfoRow label={t.reference} value={valueOrDash(voucher.reference, locale)} />
                  <InfoRow label={t.externalReference} value={valueOrDash(voucher.external_reference, locale)} />
                  <InfoRow label={t.sourceNumber} value={valueOrDash(voucher.source_number, locale)} />
                  <InfoRow label={t.party} value={valueOrDash(voucher.party_name, locale)} />
                  <InfoRow label={t.accountCode} value={valueOrDash(voucher.treasury_account_code, locale)} />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h2 className="font-semibold">{t.description}</h2>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-7 text-foreground">
                  {voucher.description ? voucher.description : t.noDescription}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h2 className="font-semibold">{t.notes}</h2>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-7 text-foreground">
                  {voucher.notes ? voucher.notes : t.noNotes}
                </div>
              </section>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>{t.posting}</CardTitle>
              <CardDescription>{t.postingDescription}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-lg border bg-background p-4">
                <div className="text-sm text-muted-foreground">{t.balanceApplied}</div>
                <div className="mt-2">
                  <PostingBadge
                    active={voucher.balance_applied}
                    activeLabel={t.applied}
                    inactiveLabel={t.notApplied}
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-background p-4">
                <div className="text-sm text-muted-foreground">{t.accountingPosted}</div>
                <div className="mt-2">
                  <PostingBadge
                    active={voucher.accounting_posted}
                    activeLabel={t.posted}
                    inactiveLabel={t.notPosted}
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-background p-4">
                <div className="text-sm text-muted-foreground">{t.treasuryPosted}</div>
                <div className="mt-2">
                  <PostingBadge
                    active={voucher.treasury_posted}
                    activeLabel={t.posted}
                    inactiveLabel={t.notPosted}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>{t.auditInfo}</CardTitle>
              <CardDescription>{t.detailsDescription}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 lg:grid-cols-2">
              <InfoRow label={t.createdBy} value={valueOrDash(voucher.created_by_name, locale)} />
              <InfoRow label={t.createdAt} value={formatDateTime(voucher.created_at, locale)} />
              <InfoRow label={t.updatedAt} value={formatDateTime(voucher.updated_at, locale)} />
              <InfoRow label={t.confirmedAt} value={formatDateTime(voucher.confirmed_at, locale)} />
              <InfoRow label={t.cancelledAt} value={formatDateTime(voucher.cancelled_at, locale)} />
              <InfoRow label={t.cancellationReason} value={valueOrDash(voucher.cancellation_reason, locale)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}