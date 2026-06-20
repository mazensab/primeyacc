"use client";

/* ============================================================
   📂 app/system/treasury/transactions/[id]/page.tsx
   🧠 Primey Care | Treasury Transaction Details Page
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET  /api/treasury/transactions/{id}/
      POST /api/treasury/transactions/{id}/confirm/
      POST /api/treasury/transactions/{id}/cancel/
   ✅ Primary confirm/save/create buttons are always black
   ✅ Secondary actions are outline
   ✅ Transaction details / account / destination / amount / status
   ✅ Web Print
   ✅ Skeleton Loading
   ✅ Error / Not Found states
   ✅ sonner
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
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

type TreasuryTransaction = {
  id: string;
  transaction_number: string;
  transaction_type: string;
  transaction_type_label: string;
  source: string;
  source_label: string;
  status: string;
  status_label: string;
  transaction_date: string | null;
  treasury_account_id: string;
  treasury_account_name: string;
  treasury_account_code: string;
  destination_account_id: string;
  destination_account_name: string;
  destination_account_code: string;
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
    title: "تفاصيل حركة الخزينة",
    subtitle: "عرض بيانات حركة الخزينة وحالتها وأثرها المالي.",
    back: "حركات الخزينة",
    treasury: "الخزينة",
    refresh: "تحديث",
    print: "طباعة",
    confirm: "تأكيد الحركة",
    cancel: "إلغاء الحركة",
    confirming: "جاري التأكيد...",
    cancelling: "جاري الإلغاء...",
    openStatement: "كشف الحساب",

    transactionSummary: "ملخص الحركة",
    transactionSummaryDesc: "بيانات الحركة الأساسية وحالتها.",
    financialSummary: "الملخص المالي",
    financialSummaryDesc: "المبلغ والرسوم والصافي.",
    accountInfo: "الحسابات",
    accountInfoDesc: "حساب الخزينة وحساب الوجهة إن وجد.",
    referenceInfo: "المرجع والوصف",
    referenceInfoDesc: "بيانات الطرف والمرجع والوصف.",
    postingInfo: "حالة الترحيل",
    postingInfoDesc: "حالة أثر الرصيد والترحيل المالي.",

    number: "رقم الحركة",
    type: "نوع الحركة",
    status: "الحالة",
    date: "التاريخ",
    source: "المصدر",
    sourceAccount: "حساب الخزينة",
    destinationAccount: "حساب الوجهة",
    amount: "المبلغ",
    fees: "الرسوم",
    net: "الصافي",
    party: "الطرف",
    reference: "المرجع",
    externalReference: "مرجع خارجي",
    sourceNumber: "رقم المصدر",
    description: "الوصف",
    notes: "ملاحظات",
    createdBy: "أنشئت بواسطة",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    confirmedAt: "تاريخ التأكيد",
    cancelledAt: "تاريخ الإلغاء",
    cancellationReason: "سبب الإلغاء",

    balanceApplied: "أثر الرصيد",
    accountingPosted: "الترحيل المحاسبي",
    treasuryPosted: "ترحيل الخزينة",
    applied: "مطبق",
    notApplied: "غير مطبق",
    posted: "مرحل",
    notPosted: "غير مرحل",

    draft: "مسودة",
    confirmed: "مؤكدة",
    cancelled: "ملغاة",
    income: "قبض",
    expense: "صرف",
    transfer: "تحويل",
    deposit: "إيداع",
    withdraw: "سحب",
    openingBalance: "رصيد افتتاحي",
    refund: "استرداد",
    fee: "رسوم",
    adjustment: "تسوية",

    confirmQuestion: "هل تريد تأكيد حركة الخزينة؟",
    cancelQuestion: "هل تريد إلغاء حركة الخزينة؟",
    confirmedToast: "تم تأكيد حركة الخزينة بنجاح.",
    cancelledToast: "تم إلغاء حركة الخزينة بنجاح.",
    refreshed: "تم تحديث تفاصيل الحركة.",

    errorTitle: "تعذر تحميل تفاصيل الحركة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    notFoundTitle: "لم يتم العثور على الحركة",
    notFoundDesc: "قد تكون الحركة غير موجودة أو لا تملك صلاحية عرضها.",
    tryAgain: "إعادة المحاولة",

    actionError: "تعذر تنفيذ الإجراء.",
    printTitle: "تفاصيل حركة الخزينة",
    generatedAt: "تاريخ الطباعة",
    notAvailable: "—",
    sar: "ر.س",
  },
  en: {
    title: "Treasury Transaction Details",
    subtitle: "View treasury transaction information, status, and financial impact.",
    back: "Treasury transactions",
    treasury: "Treasury",
    refresh: "Refresh",
    print: "Print",
    confirm: "Confirm transaction",
    cancel: "Cancel transaction",
    confirming: "Confirming...",
    cancelling: "Cancelling...",
    openStatement: "Statement",

    transactionSummary: "Transaction summary",
    transactionSummaryDesc: "Main transaction data and status.",
    financialSummary: "Financial summary",
    financialSummaryDesc: "Amount, fees, and net amount.",
    accountInfo: "Accounts",
    accountInfoDesc: "Treasury account and destination account if available.",
    referenceInfo: "Reference and description",
    referenceInfoDesc: "Party, reference, and description data.",
    postingInfo: "Posting status",
    postingInfoDesc: "Balance impact and financial posting status.",

    number: "Transaction number",
    type: "Type",
    status: "Status",
    date: "Date",
    source: "Source",
    sourceAccount: "Treasury account",
    destinationAccount: "Destination account",
    amount: "Amount",
    fees: "Fees",
    net: "Net",
    party: "Party",
    reference: "Reference",
    externalReference: "External reference",
    sourceNumber: "Source number",
    description: "Description",
    notes: "Notes",
    createdBy: "Created by",
    createdAt: "Created at",
    updatedAt: "Updated at",
    confirmedAt: "Confirmed at",
    cancelledAt: "Cancelled at",
    cancellationReason: "Cancellation reason",

    balanceApplied: "Balance impact",
    accountingPosted: "Accounting posting",
    treasuryPosted: "Treasury posting",
    applied: "Applied",
    notApplied: "Not applied",
    posted: "Posted",
    notPosted: "Not posted",

    draft: "Draft",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    deposit: "Deposit",
    withdraw: "Withdraw",
    openingBalance: "Opening balance",
    refund: "Refund",
    fee: "Fee",
    adjustment: "Adjustment",

    confirmQuestion: "Confirm this treasury transaction?",
    cancelQuestion: "Cancel this treasury transaction?",
    confirmedToast: "Treasury transaction confirmed successfully.",
    cancelledToast: "Treasury transaction cancelled successfully.",
    refreshed: "Transaction details refreshed.",

    errorTitle: "Unable to load transaction details",
    errorDesc: "Make sure the backend is running, then try again.",
    notFoundTitle: "Transaction not found",
    notFoundDesc: "The transaction may not exist or you may not have permission to view it.",
    tryAgain: "Try again",

    actionError: "Unable to complete the action.",
    printTitle: "Treasury transaction details",
    generatedAt: "Generated at",
    notAvailable: "—",
    sar: "SAR",
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

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (
      ["1", "true", "yes", "on", "applied", "posted", "confirmed", "success"].includes(
        normalized,
      )
    ) {
      return true;
    }

    if (["0", "false", "no", "off", "draft", "cancelled"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
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
  if (Number.isNaN(parsed.getTime())) return String(value).replace("T", " ").slice(0, 16);

  return parsed.toISOString().replace("T", " ").slice(0, 16);
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
  const envBase =
    typeof process !== "undefined"
      ? (
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          ""
        ).replace(/\/+$/, "")
      : "";

  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}

function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=")[1] || "") : "";
}

async function fetchJson<T>(
  url: string,
  options: RequestInit & { signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    ...options,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options.method && options.method !== "GET"
        ? {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
          }
        : {}),
      ...(options.headers || {}),
    },
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
      payload?.errors ||
      `Request failed with status ${response.status}`;

    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return (payload || {}) as T;
}

function extractPayload(payload: ApiResponse): ApiRecord {
  const data = asRecord(payload.data);
  const result = asRecord(payload.result);
  const item = asRecord(payload.item);
  const transaction = asRecord(payload.transaction);

  if (Object.keys(transaction).length) return transaction;
  if (Object.keys(item).length) return item;
  if (Object.keys(data).length) return data;
  if (Object.keys(result).length) return result;

  return asRecord(payload);
}

function normalizeTransaction(value: unknown): TreasuryTransaction {
  const item = asRecord(value);
  const account = asRecord(item.treasury_account || item.account);
  const destination = asRecord(item.destination_account || item.to_account);
  const createdBy = asRecord(item.created_by || item.user);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    transaction_number: normalizeText(item.transaction_number || item.number || item.reference),
    transaction_type: normalizeText(item.transaction_type || item.type || "adjustment"),
    transaction_type_label: normalizeText(item.transaction_type_label || item.type_label),
    source: normalizeText(item.source),
    source_label: normalizeText(item.source_label),
    status: normalizeText(item.status || "draft").toLowerCase(),
    status_label: normalizeText(item.status_label),
    transaction_date:
      normalizeText(item.transaction_date || item.date || item.created_at) || null,
    treasury_account_id: normalizeText(item.treasury_account_id || item.account_id || account.id || account.pk),
    treasury_account_name: normalizeText(account.name || item.treasury_account_name || item.account_name),
    treasury_account_code: normalizeText(account.code || item.treasury_account_code || item.account_code),
    destination_account_id: normalizeText(item.destination_account_id || item.to_account_id || destination.id || destination.pk),
    destination_account_name: normalizeText(destination.name || item.destination_account_name || item.to_account_name),
    destination_account_code: normalizeText(destination.code || item.destination_account_code || item.to_account_code),
    amount: toNumber(item.amount),
    fees_amount: toNumber(item.fees_amount || item.fee_amount),
    net_amount: toNumber(item.net_amount ?? item.amount),
    currency: normalizeText(item.currency || "SAR"),
    reference: normalizeText(item.reference),
    external_reference: normalizeText(item.external_reference),
    source_number: normalizeText(item.source_number || item.source_reference),
    party_name: normalizeText(item.party_name),
    description: normalizeText(item.description),
    notes: normalizeText(item.notes),
    balance_applied: toBoolean(item.balance_applied || item.is_balance_applied),
    accounting_posted: toBoolean(item.accounting_posted || item.is_accounting_posted),
    treasury_posted: toBoolean(item.treasury_posted || item.is_treasury_posted || item.balance_applied),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
    created_by_name: normalizeText(
      item.created_by_name ||
        createdBy.name ||
        createdBy.full_name ||
        createdBy.email ||
        createdBy.username,
    ),
    confirmed_at: normalizeText(item.confirmed_at) || null,
    cancelled_at: normalizeText(item.cancelled_at) || null,
    cancellation_reason: normalizeText(item.cancellation_reason || item.cancel_reason),
  };
}

function typeLabel(type: string, locale: Locale) {
  const t = translations[locale];
  const normalized = type.toLowerCase();

  if (normalized === "income") return t.income;
  if (normalized === "expense") return t.expense;
  if (normalized === "transfer") return t.transfer;
  if (normalized === "deposit") return t.deposit;
  if (normalized === "withdraw") return t.withdraw;
  if (normalized === "opening_balance") return t.openingBalance;
  if (normalized === "refund") return t.refund;
  if (normalized === "fee") return t.fee;
  if (normalized === "adjustment") return t.adjustment;

  return type || t.notAvailable;
}

function statusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = status.toLowerCase();

  if (normalized === "confirmed") return t.confirmed;
  if (normalized === "cancelled") return t.cancelled;

  return t.draft;
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "confirmed") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (normalized === "cancelled") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

function typeClass(type: string) {
  const normalized = type.toLowerCase();

  if (["income", "deposit", "opening_balance"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["expense", "withdraw", "refund", "fee"].includes(normalized)) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (normalized === "transfer") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  return "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50";
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusClass(status))}
    >
      {statusLabel(status, locale)}
    </Badge>
  );
}

function TypeBadge({ type, locale }: { type: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", typeClass(type))}
    >
      {typeLabel(type, locale)}
    </Badge>
  );
}

function BooleanBadge({
  value,
  trueLabel,
  falseLabel,
}: {
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        value
          ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          : "border-slate-500/30 bg-slate-50 text-slate-700 hover:bg-slate-50",
      )}
    >
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

function MoneyValue({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-1 text-sm font-semibold tabular-nums">
      <span>{formatMoney(value)}</span>
      <img src="/currency/sar.svg" alt={label} className="h-3.5 w-3.5" />
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-medium text-foreground", mono && "tabular-nums")}>
        {value}
      </div>
    </div>
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
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function TreasuryTransactionDetailsPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();

  const id = React.useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId || "";
  }, [params]);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [transaction, setTransaction] = React.useState<TreasuryTransaction | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState<"confirm" | "cancel" | null>(null);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const canConfirm = transaction?.status === "draft";
  const canCancel = Boolean(transaction && transaction.status !== "cancelled");

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

  const loadTransaction = React.useCallback(
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

        const payload = await fetchJson<ApiResponse>(
          makeApiUrl(`/api/treasury/transactions/${encodeURIComponent(id)}/`),
          {
            method: "GET",
            signal: controller.signal,
          },
        );

        const normalized = normalizeTransaction(extractPayload(payload));

        if (!normalized.id && !normalized.transaction_number) {
          setTransaction(null);
          setNotFound(true);
          return;
        }

        setTransaction(normalized);

        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        if (message.includes("404")) {
          setNotFound(true);
          setTransaction(null);
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [id, t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadTransaction();
  }, [loadTransaction]);

  async function runAction(action: "confirm" | "cancel") {
    if (!transaction) return;

    const question = action === "confirm" ? t.confirmQuestion : t.cancelQuestion;

    if (!window.confirm(question)) return;

    setActionLoading(action);
    setError("");

    try {
      const endpoint =
        action === "confirm"
          ? `/api/treasury/transactions/${encodeURIComponent(transaction.id)}/confirm/`
          : `/api/treasury/transactions/${encodeURIComponent(transaction.id)}/cancel/`;

      await fetchJson<ApiResponse>(makeApiUrl(endpoint), {
        method: "POST",
        body: JSON.stringify({}),
      });

      toast.success(action === "confirm" ? t.confirmedToast : t.cancelledToast);

      await loadTransaction({ silent: false });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.actionError;

      setError(message);
      toast.error(t.actionError);
    } finally {
      setActionLoading(null);
    }
  }

  function printPage() {
    if (!transaction) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) return;

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
              gap: 16px;
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            h1 { margin: 0; font-size: 22px; }
            p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
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
            .box strong { font-size: 15px; }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Primey Care - ${escapeHtml(t.printTitle)}</h1>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
          </div>

          <div class="grid">
            <div class="box"><span>${escapeHtml(t.number)}</span><strong>${escapeHtml(transaction.transaction_number || t.notAvailable)}</strong></div>
            <div class="box"><span>${escapeHtml(t.status)}</span><strong>${escapeHtml(statusLabel(transaction.status, locale))}</strong></div>
            <div class="box"><span>${escapeHtml(t.type)}</span><strong>${escapeHtml(typeLabel(transaction.transaction_type, locale))}</strong></div>
            <div class="box"><span>${escapeHtml(t.date)}</span><strong>${escapeHtml(formatDate(transaction.transaction_date))}</strong></div>
            <div class="box"><span>${escapeHtml(t.sourceAccount)}</span><strong>${escapeHtml(transaction.treasury_account_name || t.notAvailable)}</strong></div>
            <div class="box"><span>${escapeHtml(t.destinationAccount)}</span><strong>${escapeHtml(transaction.destination_account_name || t.notAvailable)}</strong></div>
            <div class="box"><span>${escapeHtml(t.amount)}</span><strong>${escapeHtml(formatMoney(transaction.amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.fees)}</span><strong>${escapeHtml(formatMoney(transaction.fees_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.net)}</span><strong>${escapeHtml(formatMoney(transaction.net_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.party)}</span><strong>${escapeHtml(transaction.party_name || t.notAvailable)}</strong></div>
            <div class="box"><span>${escapeHtml(t.reference)}</span><strong>${escapeHtml(transaction.reference || t.notAvailable)}</strong></div>
            <div class="box"><span>${escapeHtml(t.description)}</span><strong>${escapeHtml(transaction.description || t.notAvailable)}</strong></div>
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
  }

  if (loading) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <PageSkeleton />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 text-right">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/treasury/transactions">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>
        </div>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
              <TriangleAlert className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">{t.notFoundTitle}</p>
              <p className="text-sm text-muted-foreground">{t.notFoundDesc}</p>
            </div>
            <Button asChild variant="outline" className="h-9 rounded-lg">
              <Link href="/system/treasury/transactions">
                <BackIcon className="h-4 w-4" />
                {t.back}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!transaction) return null;

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
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/treasury/transactions">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/treasury">
              <WalletCards className="h-4 w-4" />
              {t.treasury}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadTransaction({ silent: true })}
            disabled={refreshing || Boolean(actionLoading)}
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

          {canCancel ? (
            <Button
              variant="outline"
              className="h-9 rounded-lg"
              onClick={() => void runAction("cancel")}
              disabled={Boolean(actionLoading)}
            >
              {actionLoading === "cancel" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {actionLoading === "cancel" ? t.cancelling : t.cancel}
            </Button>
          ) : null}

          {canConfirm ? (
            <Button
              className="h-9 rounded-lg bg-black text-white hover:bg-black/90"
              onClick={() => void runAction("confirm")}
              disabled={Boolean(actionLoading)}
            >
              {actionLoading === "confirm" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {actionLoading === "confirm" ? t.confirming : t.confirm}
            </Button>
          ) : null}
        </div>
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
              onClick={() => void loadTransaction()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="relative px-6 py-5">
              <CardDescription>{t.transactionSummaryDesc}</CardDescription>
              <CardTitle>{transaction.transaction_number || t.notAvailable}</CardTitle>
              <CardAction>
                <StatusBadge status={transaction.status} locale={locale} />
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6">
              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm text-muted-foreground">{t.type}</span>
                <TypeBadge type={transaction.transaction_type} locale={locale} />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm text-muted-foreground">{t.date}</span>
                <span className="text-sm font-medium text-foreground tabular-nums">
                  {formatDate(transaction.transaction_date)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm text-muted-foreground">{t.source}</span>
                <span className="max-w-[180px] truncate text-sm font-medium text-foreground">
                  {transaction.source_label || transaction.source || t.notAvailable}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.financialSummary}</CardTitle>
              <CardDescription>{t.financialSummaryDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6">
              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm text-muted-foreground">{t.amount}</span>
                <MoneyValue value={transaction.amount} label={t.sar} />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm text-muted-foreground">{t.fees}</span>
                <MoneyValue value={transaction.fees_amount} label={t.sar} />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm font-medium text-foreground">{t.net}</span>
                <MoneyValue value={transaction.net_amount} label={t.sar} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.postingInfo}</CardTitle>
              <CardDescription>{t.postingInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6">
              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm text-muted-foreground">{t.balanceApplied}</span>
                <BooleanBadge
                  value={transaction.balance_applied}
                  trueLabel={t.applied}
                  falseLabel={t.notApplied}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm text-muted-foreground">{t.treasuryPosted}</span>
                <BooleanBadge
                  value={transaction.treasury_posted}
                  trueLabel={t.posted}
                  falseLabel={t.notPosted}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm text-muted-foreground">{t.accountingPosted}</span>
                <BooleanBadge
                  value={transaction.accounting_posted}
                  trueLabel={t.posted}
                  falseLabel={t.notPosted}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.accountInfo}</CardTitle>
              <CardDescription>{t.accountInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 px-6 pb-6 md:grid-cols-2">
              <DetailItem
                label={t.sourceAccount}
                value={
                  <div className="space-y-1">
                    <div>{transaction.treasury_account_name || t.notAvailable}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {transaction.treasury_account_code || t.notAvailable}
                    </div>
                  </div>
                }
              />

              <DetailItem
                label={t.destinationAccount}
                value={
                  <div className="space-y-1">
                    <div>{transaction.destination_account_name || t.notAvailable}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {transaction.destination_account_code || t.notAvailable}
                    </div>
                  </div>
                }
              />

              {transaction.treasury_account_id ? (
                <div className="md:col-span-2">
                  <Button asChild variant="outline" className="h-9 rounded-lg">
                    <Link
                      href={`/system/treasury/statement?account_id=${encodeURIComponent(
                        transaction.treasury_account_id,
                      )}`}
                    >
                      <FileText className="h-4 w-4" />
                      {t.openStatement}
                    </Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.referenceInfo}</CardTitle>
              <CardDescription>{t.referenceInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 px-6 pb-6 md:grid-cols-2">
              <DetailItem label={t.party} value={transaction.party_name || t.notAvailable} />
              <DetailItem label={t.reference} value={transaction.reference || t.notAvailable} mono />
              <DetailItem
                label={t.externalReference}
                value={transaction.external_reference || t.notAvailable}
                mono
              />
              <DetailItem label={t.sourceNumber} value={transaction.source_number || t.notAvailable} mono />
              <div className="md:col-span-2">
                <DetailItem label={t.description} value={transaction.description || t.notAvailable} />
              </div>
              <div className="md:col-span-2">
                <DetailItem label={t.notes} value={transaction.notes || t.notAvailable} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.createdAt}</CardTitle>
              <CardDescription>{transaction.created_by_name || t.notAvailable}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 px-6 pb-6 md:grid-cols-2">
              <DetailItem label={t.createdAt} value={formatDate(transaction.created_at)} mono />
              <DetailItem label={t.updatedAt} value={formatDate(transaction.updated_at)} mono />
              <DetailItem label={t.confirmedAt} value={formatDate(transaction.confirmed_at)} mono />
              <DetailItem label={t.cancelledAt} value={formatDate(transaction.cancelled_at)} mono />

              {transaction.cancellation_reason ? (
                <div className="md:col-span-2">
                  <DetailItem label={t.cancellationReason} value={transaction.cancellation_reason} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}