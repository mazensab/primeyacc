"use client";

/* ============================================================
   📂 app/system/treasury/vouchers/payment/page.tsx
   🧠 Primey Care | Create Treasury Payment Voucher
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET  /api/treasury/accounts/
      POST /api/treasury/transactions/create/
      fallback POST /api/treasury/transactions/
   ✅ Create/save/confirm primary buttons are black
   ✅ Secondary actions are outline
   ✅ Payment voucher form
   ✅ Unsaved changes protection
   ✅ Form validation
   ✅ Skeleton / Error / Empty states
   ✅ sonner
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  id?: string | number;
  transaction_id?: string | number;
  data?: unknown;
  result?: unknown;
  item?: unknown;
  message?: string;
  detail?: string;
  error?: string;
  errors?: unknown;
  results?: unknown[];
  items?: unknown[];
  rows?: unknown[];
};

type TreasuryAccount = {
  id: string;
  name: string;
  code: string;
  account_type: string;
  account_type_label: string;
  current_balance: number;
  currency: string;
  status: string;
  is_default: boolean;
};

type SubmitMode = "draft" | "confirmed";

type FormState = {
  treasury_account_id: string;
  transaction_date: string;
  amount: string;
  fees_amount: string;
  party_name: string;
  reference: string;
  source_number: string;
  description: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const API = {
  accounts: "/api/treasury/accounts/",
  create: "/api/treasury/transactions/create/",
  transactions: "/api/treasury/transactions/",
};

const INITIAL_FORM: FormState = {
  treasury_account_id: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  amount: "",
  fees_amount: "0",
  party_name: "",
  reference: "",
  source_number: "",
  description: "",
  notes: "",
};

const translations = {
  ar: {
    title: "إنشاء سند صرف",
    subtitle: "تسجيل سند صرف جديد داخل الخزينة مع الحساب والمبلغ والطرف والمرجع.",
    back: "سندات الخزينة",
    treasury: "الخزينة",
    transactions: "حركات الخزينة",
    refresh: "تحديث الحسابات",
    clear: "مسح النموذج",
    saveDraft: "حفظ كمسودة",
    saveConfirmed: "حفظ وتأكيد",
    saving: "جاري الحفظ...",

    voucherData: "بيانات سند الصرف",
    voucherDataDesc: "حدد الحساب والتاريخ والمبلغ الأساسي للسند.",
    financialData: "البيانات المالية",
    financialDataDesc: "المبلغ والرسوم والصافي المتوقع.",
    referenceData: "الطرف والمرجع",
    referenceDataDesc: "أضف بيانات الطرف والمرجع والوصف عند الحاجة.",
    summary: "ملخص السند",
    summaryDesc: "راجع بيانات سند الصرف قبل الحفظ.",

    account: "حساب الخزينة",
    chooseAccount: "اختر حساب الخزينة",
    transactionDate: "تاريخ السند",
    amount: "المبلغ",
    feesAmount: "الرسوم",
    netAmount: "الصافي",
    partyName: "الطرف",
    reference: "مرجع خارجي",
    sourceNumber: "رقم المصدر",
    description: "الوصف",
    notes: "ملاحظات",
    currentBalance: "الرصيد الحالي",
    accountType: "نوع الحساب",
    paymentVoucher: "سند صرف",
    outgoing: "صادر من الخزينة",
    draft: "مسودة",
    confirmed: "مؤكد",
    optional: "اختياري",

    required: "هذا الحقل مطلوب.",
    invalidAmount: "أدخل مبلغًا صحيحًا أكبر من صفر.",
    invalidFees: "أدخل رسومًا صحيحة أو اتركها صفر.",
    dateRequired: "تاريخ السند مطلوب.",
    accountRequired: "حساب الخزينة مطلوب.",
    confirmClear: "هل تريد مسح النموذج؟",
    leaveWarning: "لديك تغييرات غير محفوظة.",
    createdDraft: "تم حفظ سند الصرف كمسودة.",
    createdConfirmed: "تم إنشاء وتأكيد سند الصرف بنجاح.",
    submitError: "تعذر حفظ سند الصرف.",
    errorTitle: "تعذر تجهيز صفحة سند الصرف",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    noAccountsTitle: "لا توجد حسابات خزينة",
    noAccountsDesc: "أضف صندوقًا أو حسابًا بنكيًا قبل إنشاء سند صرف.",
    tryAgain: "إعادة المحاولة",
    notAvailable: "—",
    sar: "ر.س",
  },
  en: {
    title: "Create Payment Voucher",
    subtitle: "Record a new treasury payment voucher with account, amount, party, and reference.",
    back: "Treasury vouchers",
    treasury: "Treasury",
    transactions: "Treasury transactions",
    refresh: "Refresh accounts",
    clear: "Clear form",
    saveDraft: "Save draft",
    saveConfirmed: "Save & confirm",
    saving: "Saving...",

    voucherData: "Payment voucher data",
    voucherDataDesc: "Select the account, date, and main voucher amount.",
    financialData: "Financial data",
    financialDataDesc: "Amount, fees, and expected net amount.",
    referenceData: "Party and reference",
    referenceDataDesc: "Add party, reference, and description when needed.",
    summary: "Voucher summary",
    summaryDesc: "Review the payment voucher data before saving.",

    account: "Treasury account",
    chooseAccount: "Choose treasury account",
    transactionDate: "Voucher date",
    amount: "Amount",
    feesAmount: "Fees",
    netAmount: "Net amount",
    partyName: "Party",
    reference: "External reference",
    sourceNumber: "Source number",
    description: "Description",
    notes: "Notes",
    currentBalance: "Current balance",
    accountType: "Account type",
    paymentVoucher: "Payment voucher",
    outgoing: "Outgoing from treasury",
    draft: "Draft",
    confirmed: "Confirmed",
    optional: "Optional",

    required: "This field is required.",
    invalidAmount: "Enter a valid amount greater than zero.",
    invalidFees: "Enter valid fees or keep it zero.",
    dateRequired: "Voucher date is required.",
    accountRequired: "Treasury account is required.",
    confirmClear: "Clear the form?",
    leaveWarning: "You have unsaved changes.",
    createdDraft: "Payment voucher saved as draft.",
    createdConfirmed: "Payment voucher created and confirmed successfully.",
    submitError: "Unable to save payment voucher.",
    errorTitle: "Unable to prepare payment voucher page",
    errorDesc: "Make sure the backend is running, then try again.",
    noAccountsTitle: "No treasury accounts",
    noAccountsDesc: "Add a cashbox or bank account before creating a payment voucher.",
    tryAgain: "Try again",
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
    if (["1", "true", "yes", "on", "active", "default"].includes(normalized)) return true;
    if (["0", "false", "no", "off", "inactive"].includes(normalized)) return false;
  }

  return fallback;
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
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

function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
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

function extractData(payload: ApiResponse | null) {
  return asRecord(payload?.data);
}

function extractItems(payload: ApiResponse | null) {
  if (!payload) return [];

  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  const data = extractData(payload);

  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.accounts)) return data.accounts;

  return [];
}

function normalizeAccount(value: unknown): TreasuryAccount {
  const item = asRecord(value);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    name: normalizeText(item.name || item.title),
    code: normalizeText(item.code || item.number),
    account_type: normalizeText(item.account_type || item.type),
    account_type_label: normalizeText(item.account_type_label || item.type_label),
    current_balance: toNumber(item.current_balance ?? item.balance),
    currency: normalizeText(item.currency || "SAR"),
    status: normalizeText(item.status || "active"),
    is_default: toBoolean(item.is_default),
  };
}

function getCreatedId(payload: ApiResponse) {
  const data = asRecord(payload.data);
  const result = asRecord(payload.result);
  const item = asRecord(payload.item);

  return normalizeText(
    payload.id ||
      payload.transaction_id ||
      data.id ||
      data.transaction_id ||
      result.id ||
      result.transaction_id ||
      item.id ||
      item.transaction_id,
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
  icon: React.ComponentType<{ className?: string }>;
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardAction>

        <div className="pt-1">
          <Badge
            variant="outline"
            className="rounded-full border-red-500/30 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            {trend}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[520px] rounded-lg" />
        <Skeleton className="h-[520px] rounded-lg" />
      </div>
    </div>
  );
}

export default function TreasuryPaymentVoucherPage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<TreasuryAccount[]>([]);
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [dirty, setDirty] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [submitError, setSubmitError] = React.useState("");
  const [savingMode, setSavingMode] = React.useState<SubmitMode | null>(null);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const amount = toNumber(form.amount);
  const fees = toNumber(form.fees_amount);
  const netAmount = Math.max(0, amount + fees);

  const selectedAccount = React.useMemo(() => {
    return accounts.find((account) => account.id === form.treasury_account_id) || null;
  }, [accounts, form.treasury_account_id]);

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

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || savingMode) return;

      event.preventDefault();
      event.returnValue = t.leaveWarning;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty, savingMode, t.leaveWarning]);

  const loadAccounts = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setLoadError("");

        const params = new URLSearchParams({
          page: "1",
          page_size: "500",
          ordering: "account_type",
        });

        const payload = await fetchJson<ApiResponse>(makeApiUrl(API.accounts, params), {
          method: "GET",
          signal: controller.signal,
        });

        const nextAccounts = extractItems(payload)
          .map(normalizeAccount)
          .filter((account) => {
            if (!account.id && !account.name && !account.code) return false;
            return account.status !== "inactive" && account.status !== "archived";
          });

        setAccounts(nextAccounts);

        setForm((current) => {
          if (current.treasury_account_id || !nextAccounts.length) return current;

          return {
            ...current,
            treasury_account_id:
              nextAccounts.find((account) => account.is_default)?.id || nextAccounts[0].id,
          };
        });
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message ? caughtError.message : t.errorDesc;

        setLoadError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [t.errorDesc],
  );

  React.useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError("");
    setDirty(true);
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.treasury_account_id) nextErrors.treasury_account_id = t.accountRequired;
    if (!form.transaction_date) nextErrors.transaction_date = t.dateRequired;
    if (amount <= 0) nextErrors.amount = t.invalidAmount;
    if (fees < 0) nextErrors.fees_amount = t.invalidFees;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function buildPayload(mode: SubmitMode) {
    return {
      transaction_type: "expense",
      type: "expense",
      voucher_type: "payment",
      voucher_kind: "payment",
      source: "treasury_payment",
      treasury_account_id: form.treasury_account_id,
      account_id: form.treasury_account_id,
      transaction_date: form.transaction_date,
      date: form.transaction_date,
      amount,
      fees_amount: fees,
      net_amount: netAmount,
      party_name: form.party_name.trim(),
      reference: form.reference.trim(),
      source_number: form.source_number.trim(),
      description: form.description.trim() || t.paymentVoucher,
      notes: form.notes.trim(),
      status: mode,
      confirm: mode === "confirmed",
      should_confirm: mode === "confirmed",
      balance_applied: mode === "confirmed",
    };
  }

  async function submitForm(mode: SubmitMode) {
    if (!validateForm()) {
      toast.error(t.submitError);
      return;
    }

    setSavingMode(mode);
    setSubmitError("");

    const payload = buildPayload(mode);

    try {
      let responsePayload: ApiResponse | null = null;

      try {
        responsePayload = await fetchJson<ApiResponse>(makeApiUrl(API.create), {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch {
        responsePayload = await fetchJson<ApiResponse>(makeApiUrl(API.transactions), {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      const createdId = responsePayload ? getCreatedId(responsePayload) : "";

      setDirty(false);
      toast.success(mode === "confirmed" ? t.createdConfirmed : t.createdDraft);

      if (createdId) {
        router.push(`/system/treasury/transactions/${encodeURIComponent(createdId)}`);
      } else {
        router.push("/system/treasury/vouchers");
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message ? caughtError.message : t.submitError;

      setSubmitError(message);
      toast.error(t.submitError);
    } finally {
      setSavingMode(null);
    }
  }

  function clearForm() {
    if (dirty && !window.confirm(t.confirmClear)) return;

    setForm({
      ...INITIAL_FORM,
      treasury_account_id:
        accounts.find((account) => account.is_default)?.id || accounts[0]?.id || "",
      transaction_date: new Date().toISOString().slice(0, 10),
    });

    setErrors({});
    setSubmitError("");
    setDirty(false);
  }

  if (loading) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <PageSkeleton />
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
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/treasury/vouchers">
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

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/treasury/transactions">
              <ReceiptText className="h-4 w-4" />
              {t.transactions}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadAccounts({ silent: true })}
            disabled={refreshing || Boolean(savingMode)}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard
          title={t.paymentVoucher}
          value={t.outgoing}
          trend={t.confirmed}
          icon={CreditCard}
        />

        <KpiCard
          title={t.amount}
          value={<MoneyValue value={amount} label={t.sar} />}
          trend={t.paymentVoucher}
          icon={ReceiptText}
        />

        <KpiCard
          title={t.netAmount}
          value={<MoneyValue value={netAmount} label={t.sar} />}
          trend={t.sar}
          icon={FileText}
        />
      </div>

      {loadError ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 text-right">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">{t.errorTitle}</p>
                <p className="text-sm text-red-700">{loadError || t.errorDesc}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadAccounts()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!accounts.length && !loadError ? (
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
              <WalletCards className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">{t.noAccountsTitle}</p>
              <p className="text-sm text-muted-foreground">{t.noAccountsDesc}</p>
            </div>
            <Button asChild variant="outline" className="h-9 rounded-lg">
              <Link href="/system/treasury">
                <WalletCards className="h-4 w-4" />
                {t.treasury}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {accounts.length ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {submitError ? (
              <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
                <CardContent className="flex items-start gap-3 p-4 text-right">
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">{t.submitError}</p>
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-6 py-5">
                <CardTitle>{t.voucherData}</CardTitle>
                <CardDescription>{t.voucherDataDesc}</CardDescription>
              </CardHeader>

              <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t.account}
                  </label>
                  <Select
                    value={form.treasury_account_id || undefined}
                    onValueChange={(value) => updateField("treasury_account_id", value)}
                    disabled={Boolean(savingMode)}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue placeholder={t.chooseAccount} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id || account.code} value={account.id}>
                          {account.code ? `${account.code} — ${account.name}` : account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.treasury_account_id} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t.transactionDate}
                  </label>
                  <Input
                    type="date"
                    value={form.transaction_date}
                    onChange={(event) => updateField("transaction_date", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    disabled={Boolean(savingMode)}
                  />
                  <FieldError message={errors.transaction_date} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-6 py-5">
                <CardTitle>{t.financialData}</CardTitle>
                <CardDescription>{t.financialDataDesc}</CardDescription>
              </CardHeader>

              <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t.amount}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => updateField("amount", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    disabled={Boolean(savingMode)}
                    placeholder="0.00"
                  />
                  <FieldError message={errors.amount} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t.feesAmount}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.fees_amount}
                    onChange={(event) => updateField("fees_amount", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    disabled={Boolean(savingMode)}
                    placeholder="0.00"
                  />
                  <FieldError message={errors.fees_amount} />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t.netAmount}
                  </label>
                  <div className="flex h-10 items-center rounded-lg border bg-muted/30 px-3">
                    <MoneyValue value={netAmount} label={t.sar} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-6 py-5">
                <CardTitle>{t.referenceData}</CardTitle>
                <CardDescription>{t.referenceDataDesc}</CardDescription>
              </CardHeader>

              <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t.partyName}{" "}
                    <span className="text-xs text-muted-foreground">({t.optional})</span>
                  </label>
                  <Input
                    value={form.party_name}
                    onChange={(event) => updateField("party_name", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    disabled={Boolean(savingMode)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t.reference}{" "}
                    <span className="text-xs text-muted-foreground">({t.optional})</span>
                  </label>
                  <Input
                    value={form.reference}
                    onChange={(event) => updateField("reference", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    disabled={Boolean(savingMode)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t.sourceNumber}{" "}
                    <span className="text-xs text-muted-foreground">({t.optional})</span>
                  </label>
                  <Input
                    value={form.source_number}
                    onChange={(event) => updateField("source_number", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    disabled={Boolean(savingMode)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t.description}{" "}
                    <span className="text-xs text-muted-foreground">({t.optional})</span>
                  </label>
                  <Input
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    disabled={Boolean(savingMode)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t.notes}{" "}
                    <span className="text-xs text-muted-foreground">({t.optional})</span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    className="min-h-[110px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={Boolean(savingMode)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="relative px-6 py-5">
                <CardDescription>{t.summaryDesc}</CardDescription>
                <CardTitle>{t.summary}</CardTitle>
                <CardAction>
                  <Badge
                    variant="outline"
                    className="rounded-full border-red-500/30 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    {t.paymentVoucher}
                  </Badge>
                </CardAction>
              </CardHeader>

              <CardContent className="space-y-4 px-6 pb-6">
                <div className="rounded-lg border bg-background p-4">
                  <div className="mb-1 text-xs text-muted-foreground">{t.outgoing}</div>
                  <div className="text-sm font-semibold text-foreground">
                    {selectedAccount?.name || t.notAvailable}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {selectedAccount?.code || t.notAvailable}
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <span className="text-sm text-muted-foreground">{t.amount}</span>
                    <MoneyValue value={amount} label={t.sar} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <span className="text-sm text-muted-foreground">{t.feesAmount}</span>
                    <MoneyValue value={fees} label={t.sar} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                    <span className="text-sm font-medium text-foreground">{t.netAmount}</span>
                    <MoneyValue value={netAmount} label={t.sar} />
                  </div>
                </div>

                {selectedAccount ? (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="mb-1 text-xs text-muted-foreground">
                      {t.currentBalance}
                    </div>
                    <MoneyValue value={selectedAccount.current_balance} label={t.sar} />
                    <div className="mt-2 text-xs text-muted-foreground">
                      {t.accountType}:{" "}
                      {selectedAccount.account_type_label ||
                        selectedAccount.account_type ||
                        t.notAvailable}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardContent className="space-y-2 p-4">
                <Button
                  className="h-10 w-full rounded-lg bg-black text-white hover:bg-black/90"
                  onClick={() => void submitForm("confirmed")}
                  disabled={Boolean(savingMode)}
                >
                  {savingMode === "confirmed" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {savingMode === "confirmed" ? t.saving : t.saveConfirmed}
                </Button>

                <Button
                  className="h-10 w-full rounded-lg bg-black text-white hover:bg-black/90"
                  onClick={() => void submitForm("draft")}
                  disabled={Boolean(savingMode)}
                >
                  {savingMode === "draft" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingMode === "draft" ? t.saving : t.saveDraft}
                </Button>

                <Button
                  variant="outline"
                  className="h-10 w-full rounded-lg bg-background"
                  onClick={clearForm}
                  disabled={Boolean(savingMode)}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.clear}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardContent className="flex items-start gap-3 p-4 text-right">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {t.confirmed}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {locale === "ar"
                      ? "عند حفظ وتأكيد السند سيتم إرساله للباكند كسند صرف مؤكد مع تطبيق أثر الرصيد إذا كان مدعومًا."
                      : "Save & confirm sends the voucher as confirmed and applies balance impact when supported by the backend."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}