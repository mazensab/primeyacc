"use client";

/* ============================================================
   📂 app/system/treasury/transactions/create/page.tsx
   🧠 Primey Care | Create Treasury Transaction Page
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET  /api/treasury/accounts/
      POST /api/treasury/transactions/create/
      fallback POST /api/treasury/transactions/
   ✅ Create income / expense / transfer / deposit / withdraw / refund / fee / adjustment
   ✅ Source account + destination account for transfers
   ✅ Draft / confirmed submit modes
   ✅ Unsaved changes protection
   ✅ Form validation
   ✅ Error state
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
  Loader2,
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
  results?: unknown[];
  items?: unknown[];
  rows?: unknown[];
  message?: string;
  detail?: string;
  error?: string;
  errors?: unknown;
};

type TreasuryAccount = {
  id: string;
  name: string;
  code: string;
  account_type: string;
  account_type_label: string;
  status: string;
  current_balance: number;
  currency: string;
  is_default: boolean;
};

type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "deposit"
  | "withdraw"
  | "refund"
  | "fee"
  | "adjustment";

type SubmitMode = "draft" | "confirmed";

type FormState = {
  transaction_type: TransactionType;
  treasury_account_id: string;
  destination_account_id: string;
  transaction_date: string;
  amount: string;
  fees_amount: string;
  reference: string;
  source_number: string;
  party_name: string;
  description: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const API = {
  accounts: "/api/treasury/accounts/",
  create: "/api/treasury/transactions/create/",
  transactions: "/api/treasury/transactions/",
};

const translations = {
  ar: {
    title: "إنشاء حركة خزينة",
    subtitle: "تسجيل حركة مالية جديدة داخل الخزينة مع ربط الحساب والمبلغ والمرجع.",
    back: "حركات الخزينة",
    treasury: "الخزينة",
    refresh: "تحديث الحسابات",
    clear: "مسح النموذج",
    saveDraft: "حفظ كمسودة",
    saveConfirmed: "حفظ وتأكيد",
    saving: "جاري الحفظ...",
    loading: "جاري تحميل البيانات",

    basicInfo: "بيانات الحركة",
    basicInfoDesc: "حدد نوع الحركة والحساب والتاريخ والمبلغ.",
    accountingInfo: "البيانات المالية",
    accountingInfoDesc: "المبلغ والرسوم والصافي المتوقع.",
    referenceInfo: "المرجع والوصف",
    referenceInfoDesc: "أضف بيانات الطرف والمرجع والوصف عند الحاجة.",
    summary: "ملخص الحركة",
    summaryDesc: "راجع البيانات قبل الحفظ.",

    transactionType: "نوع الحركة",
    sourceAccount: "حساب الخزينة",
    destinationAccount: "حساب الوجهة",
    transactionDate: "تاريخ الحركة",
    amount: "المبلغ",
    feesAmount: "الرسوم",
    netAmount: "الصافي",
    reference: "مرجع خارجي",
    sourceNumber: "رقم المصدر",
    partyName: "الطرف",
    description: "الوصف",
    notes: "ملاحظات",
    currentBalance: "الرصيد الحالي",
    accountType: "نوع الحساب",
    chooseAccount: "اختر الحساب",
    chooseDestination: "اختر حساب الوجهة",
    optional: "اختياري",

    income: "قبض",
    expense: "صرف",
    transfer: "تحويل داخلي",
    deposit: "إيداع",
    withdraw: "سحب",
    refund: "استرداد",
    fee: "رسوم",
    adjustment: "تسوية",

    draft: "مسودة",
    confirmed: "مؤكدة",
    source: "المصدر",
    destination: "الوجهة",
    movementDirection: "اتجاه الحركة",
    incoming: "وارد",
    outgoing: "صادر",
    internalTransfer: "تحويل بين حسابين",
    neutral: "تسوية",

    required: "هذا الحقل مطلوب.",
    invalidAmount: "أدخل مبلغًا صحيحًا أكبر من صفر.",
    invalidFees: "أدخل رسومًا صحيحة أو اتركها صفر.",
    sameAccount: "لا يمكن أن يكون حساب الوجهة هو نفس حساب المصدر.",
    dateRequired: "تاريخ الحركة مطلوب.",
    accountRequired: "حساب الخزينة مطلوب.",
    destinationRequired: "حساب الوجهة مطلوب للتحويل.",
    confirmClear: "هل تريد مسح النموذج؟",
    leaveWarning: "لديك تغييرات غير محفوظة.",
    created: "تم إنشاء حركة الخزينة بنجاح.",
    createdDraft: "تم حفظ حركة الخزينة كمسودة.",
    createdConfirmed: "تم إنشاء وتأكيد حركة الخزينة بنجاح.",
    errorTitle: "تعذر تجهيز صفحة إنشاء الحركة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    submitError: "تعذر حفظ حركة الخزينة.",
    noAccountsTitle: "لا توجد حسابات خزينة",
    noAccountsDesc: "أضف صندوقًا أو حسابًا بنكيًا قبل إنشاء حركة خزينة.",
    tryAgain: "إعادة المحاولة",
    notAvailable: "—",
    sar: "ر.س",
  },
  en: {
    title: "Create Treasury Transaction",
    subtitle: "Record a new treasury movement with account, amount, and reference.",
    back: "Treasury transactions",
    treasury: "Treasury",
    refresh: "Refresh accounts",
    clear: "Clear form",
    saveDraft: "Save draft",
    saveConfirmed: "Save & confirm",
    saving: "Saving...",
    loading: "Loading data",

    basicInfo: "Transaction details",
    basicInfoDesc: "Select transaction type, account, date, and amount.",
    accountingInfo: "Financial data",
    accountingInfoDesc: "Amount, fees, and expected net amount.",
    referenceInfo: "Reference and description",
    referenceInfoDesc: "Add party, reference, and description when needed.",
    summary: "Transaction summary",
    summaryDesc: "Review the data before saving.",

    transactionType: "Transaction type",
    sourceAccount: "Treasury account",
    destinationAccount: "Destination account",
    transactionDate: "Transaction date",
    amount: "Amount",
    feesAmount: "Fees",
    netAmount: "Net amount",
    reference: "External reference",
    sourceNumber: "Source number",
    partyName: "Party",
    description: "Description",
    notes: "Notes",
    currentBalance: "Current balance",
    accountType: "Account type",
    chooseAccount: "Choose account",
    chooseDestination: "Choose destination account",
    optional: "Optional",

    income: "Income",
    expense: "Expense",
    transfer: "Internal transfer",
    deposit: "Deposit",
    withdraw: "Withdraw",
    refund: "Refund",
    fee: "Fee",
    adjustment: "Adjustment",

    draft: "Draft",
    confirmed: "Confirmed",
    source: "Source",
    destination: "Destination",
    movementDirection: "Movement direction",
    incoming: "Incoming",
    outgoing: "Outgoing",
    internalTransfer: "Internal transfer",
    neutral: "Adjustment",

    required: "This field is required.",
    invalidAmount: "Enter a valid amount greater than zero.",
    invalidFees: "Enter valid fees or keep it zero.",
    sameAccount: "Destination account cannot be the same as source account.",
    dateRequired: "Transaction date is required.",
    accountRequired: "Treasury account is required.",
    destinationRequired: "Destination account is required for transfers.",
    confirmClear: "Clear the form?",
    leaveWarning: "You have unsaved changes.",
    created: "Treasury transaction created successfully.",
    createdDraft: "Treasury transaction saved as draft.",
    createdConfirmed: "Treasury transaction created and confirmed successfully.",
    errorTitle: "Unable to prepare create transaction page",
    errorDesc: "Make sure the backend is running, then try again.",
    submitError: "Unable to save treasury transaction.",
    noAccountsTitle: "No treasury accounts",
    noAccountsDesc: "Add a cashbox or bank account before creating a treasury transaction.",
    tryAgain: "Try again",
    notAvailable: "—",
    sar: "SAR",
  },
} as const;

const INITIAL_FORM: FormState = {
  transaction_type: "income",
  treasury_account_id: "",
  destination_account_id: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  amount: "",
  fees_amount: "0",
  reference: "",
  source_number: "",
  party_name: "",
  description: "",
  notes: "",
};

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

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

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
    status: normalizeText(item.status || "active"),
    current_balance: toNumber(item.current_balance ?? item.balance),
    currency: normalizeText(item.currency || "SAR"),
    is_default: toBoolean(item.is_default),
  };
}

function getCreatedId(payload: ApiResponse) {
  const data = asRecord(payload.data);
  const result = asRecord(payload.result);

  return normalizeText(
    payload.id ||
      payload.transaction_id ||
      data.id ||
      data.transaction_id ||
      result.id ||
      result.transaction_id,
  );
}

function getTypeLabel(type: TransactionType, locale: Locale) {
  const t = translations[locale];

  if (type === "income") return t.income;
  if (type === "expense") return t.expense;
  if (type === "transfer") return t.transfer;
  if (type === "deposit") return t.deposit;
  if (type === "withdraw") return t.withdraw;
  if (type === "refund") return t.refund;
  if (type === "fee") return t.fee;

  return t.adjustment;
}

function getDirection(type: TransactionType, locale: Locale) {
  const t = translations[locale];

  if (["income", "deposit"].includes(type)) return t.incoming;
  if (["expense", "withdraw", "refund", "fee"].includes(type)) return t.outgoing;
  if (type === "transfer") return t.internalTransfer;

  return t.neutral;
}

function typeClass(type: TransactionType) {
  if (["income", "deposit"].includes(type)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["expense", "withdraw", "refund", "fee"].includes(type)) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (type === "transfer") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  return "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50";
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
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-4 p-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-40 w-full" />
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
  );
}

export default function TreasuryTransactionCreatePage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<TreasuryAccount[]>([]);
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitError, setSubmitError] = React.useState("");
  const [dirty, setDirty] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [savingMode, setSavingMode] = React.useState<SubmitMode | null>(null);
  const [loadError, setLoadError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const amount = toNumber(form.amount);
  const fees = toNumber(form.fees_amount);
  const netAmount = Math.max(0, amount - fees);

  const selectedAccount = React.useMemo(() => {
    return accounts.find((account) => account.id === form.treasury_account_id) || null;
  }, [accounts, form.treasury_account_id]);

  const destinationAccount = React.useMemo(() => {
    return accounts.find((account) => account.id === form.destination_account_id) || null;
  }, [accounts, form.destination_account_id]);

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

        const payload = await fetchJson<ApiResponse>(
          makeApiUrl(API.accounts, params),
          {
            method: "GET",
            signal: controller.signal,
          },
        );

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
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

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
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "transaction_type" && value !== "transfer") {
        next.destination_account_id = "";
      }

      return next;
    });

    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError("");
    setDirty(true);
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.transaction_type) nextErrors.transaction_type = t.required;
    if (!form.treasury_account_id) nextErrors.treasury_account_id = t.accountRequired;
    if (!form.transaction_date) nextErrors.transaction_date = t.dateRequired;

    if (amount <= 0) nextErrors.amount = t.invalidAmount;
    if (fees < 0) nextErrors.fees_amount = t.invalidFees;

    if (form.transaction_type === "transfer") {
      if (!form.destination_account_id) {
        nextErrors.destination_account_id = t.destinationRequired;
      }

      if (
        form.destination_account_id &&
        form.destination_account_id === form.treasury_account_id
      ) {
        nextErrors.destination_account_id = t.sameAccount;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function buildPayload(mode: SubmitMode) {
    return {
      transaction_type: form.transaction_type,
      type: form.transaction_type,
      treasury_account_id: form.treasury_account_id,
      account_id: form.treasury_account_id,
      destination_account_id:
        form.transaction_type === "transfer" ? form.destination_account_id : null,
      transaction_date: form.transaction_date,
      date: form.transaction_date,
      amount,
      fees_amount: fees,
      net_amount: netAmount,
      reference: form.reference.trim(),
      source_number: form.source_number.trim(),
      party_name: form.party_name.trim(),
      description: form.description.trim(),
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
        router.push("/system/treasury/transactions");
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.submitError;

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
                <CardTitle>{t.basicInfo}</CardTitle>
                <CardDescription>{t.basicInfoDesc}</CardDescription>
              </CardHeader>

              <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t.transactionType}
                  </label>
                  <Select
                    value={form.transaction_type}
                    onValueChange={(value) => updateField("transaction_type", value as TransactionType)}
                    disabled={Boolean(savingMode)}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">{t.income}</SelectItem>
                      <SelectItem value="expense">{t.expense}</SelectItem>
                      <SelectItem value="transfer">{t.transfer}</SelectItem>
                      <SelectItem value="deposit">{t.deposit}</SelectItem>
                      <SelectItem value="withdraw">{t.withdraw}</SelectItem>
                      <SelectItem value="refund">{t.refund}</SelectItem>
                      <SelectItem value="fee">{t.fee}</SelectItem>
                      <SelectItem value="adjustment">{t.adjustment}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={errors.transaction_type} />
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

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    {t.sourceAccount}
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

                {form.transaction_type === "transfer" ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      {t.destinationAccount}
                    </label>
                    <Select
                      value={form.destination_account_id || undefined}
                      onValueChange={(value) => updateField("destination_account_id", value)}
                      disabled={Boolean(savingMode)}
                    >
                      <SelectTrigger className="h-10 rounded-lg bg-background">
                        <SelectValue placeholder={t.chooseDestination} />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts
                          .filter((account) => account.id !== form.treasury_account_id)
                          .map((account) => (
                            <SelectItem key={account.id || account.code} value={account.id}>
                              {account.code ? `${account.code} — ${account.name}` : account.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={errors.destination_account_id} />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-6 py-5">
                <CardTitle>{t.accountingInfo}</CardTitle>
                <CardDescription>{t.accountingInfoDesc}</CardDescription>
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
                <CardTitle>{t.referenceInfo}</CardTitle>
                <CardDescription>{t.referenceInfoDesc}</CardDescription>
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
                    className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", typeClass(form.transaction_type))}
                  >
                    {getTypeLabel(form.transaction_type, locale)}
                  </Badge>
                </CardAction>
              </CardHeader>

              <CardContent className="space-y-4 px-6 pb-6">
                <div className="rounded-lg border bg-background p-4">
                  <div className="mb-1 text-xs text-muted-foreground">
                    {t.movementDirection}
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {getDirection(form.transaction_type, locale)}
                  </div>
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <div className="mb-1 text-xs text-muted-foreground">{t.source}</div>
                  <div className="text-sm font-semibold text-foreground">
                    {selectedAccount?.name || t.notAvailable}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {selectedAccount?.code || t.notAvailable}
                  </div>
                </div>

                {form.transaction_type === "transfer" ? (
                  <div className="rounded-lg border bg-background p-4">
                    <div className="mb-1 text-xs text-muted-foreground">
                      {t.destination}
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {destinationAccount?.name || t.notAvailable}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {destinationAccount?.code || t.notAvailable}
                    </div>
                  </div>
                ) : null}

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
                  variant="outline"
                  className="h-10 w-full rounded-lg bg-background"
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
                  variant="outline"
                  className="h-10 w-full rounded-lg bg-background"
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
                      ? "عند الحفظ والتأكيد سيتم إرسال الطلب للباكند كحركة مؤكدة مع تطبيق أثر الرصيد إذا كان مدعومًا."
                      : "Save & confirm sends the transaction as confirmed and applies balance impact when supported by the backend."}
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