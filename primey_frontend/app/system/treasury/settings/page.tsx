"use client";

/* ============================================================
   📂 app/system/treasury/settings/page.tsx
   🧠 Primey Care | Treasury Settings Page
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET  /api/treasury/settings/
      POST /api/treasury/settings/update/
      fallback PATCH/POST /api/treasury/settings/
      GET  /api/treasury/accounts/
   ✅ Create/save/confirm primary actions are black
   ✅ Treasury default accounts and operational settings
   ✅ Unsaved changes protection
   ✅ Skeleton / Error / Empty states
   ✅ sonner
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  FileText,
  Landmark,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
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
  data?: unknown;
  result?: unknown;
  item?: unknown;
  settings?: unknown;
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
  current_balance: number;
  currency: string;
  status: string;
  is_default: boolean;
};

type SettingsForm = {
  default_cashbox_account_id: string;
  default_bank_account_id: string;
  allow_negative_balance: boolean;
  auto_confirm_transactions: boolean;
  auto_post_to_accounting: boolean;
  require_reference: boolean;
  receipt_prefix: string;
  payment_prefix: string;
  transfer_prefix: string;
  transaction_prefix: string;
  treasury_lock_date: string;
  low_balance_threshold: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof SettingsForm, string>>;

const API = {
  whoami: "/api/auth/whoami/",
  settings: "/api/treasury/settings/",
  updateSettings: "/api/treasury/settings/update/",
  accounts: "/api/treasury/accounts/",
};

const DEFAULT_FORM: SettingsForm = {
  default_cashbox_account_id: "",
  default_bank_account_id: "",
  allow_negative_balance: false,
  auto_confirm_transactions: false,
  auto_post_to_accounting: false,
  require_reference: false,
  receipt_prefix: "RCPT",
  payment_prefix: "PAY",
  transfer_prefix: "TRF",
  transaction_prefix: "TRX",
  treasury_lock_date: "",
  low_balance_threshold: "0",
  notes: "",
};

const translations = {
  ar: {
    title: "إعدادات الخزينة",
    subtitle: "ضبط الحسابات الافتراضية وسياسات الحركات والترحيل وأرقام السندات.",
    treasury: "الخزينة",
    transactions: "حركات الخزينة",
    reports: "تقارير الخزينة",
    refresh: "تحديث",
    reset: "إعادة ضبط",
    save: "حفظ الإعدادات",
    saving: "جاري الحفظ...",

    overview: "ملخص الإعدادات",
    accountsCard: "الحسابات الافتراضية",
    accountsDesc: "حدد الصندوق والبنك الافتراضي لاستخدامهما في العمليات المالية.",
    policiesCard: "سياسات التشغيل",
    policiesDesc: "تحكم في الرصيد السالب والتأكيد التلقائي والترحيل والإلزام بالمرجع.",
    numberingCard: "ترقيم السندات",
    numberingDesc: "حدد بادئات سندات القبض والصرف والتحويل والحركات العامة.",
    controlsCard: "الضوابط المالية",
    controlsDesc: "حدد تاريخ القفل وحد التنبيه للرصيد والملاحظات الداخلية.",
    saveCard: "جاهزية الحفظ",
    saveDesc: "راجع التغييرات قبل حفظ إعدادات الخزينة.",

    defaultCashbox: "الصندوق الافتراضي",
    defaultBank: "البنك الافتراضي",
    chooseCashbox: "اختر الصندوق الافتراضي",
    chooseBank: "اختر البنك الافتراضي",
    allowNegativeBalance: "السماح بالرصيد السالب",
    autoConfirmTransactions: "تأكيد الحركات تلقائيًا",
    autoPostToAccounting: "الترحيل المحاسبي تلقائيًا",
    requireReference: "إلزام المرجع",
    receiptPrefix: "بادئة سند القبض",
    paymentPrefix: "بادئة سند الصرف",
    transferPrefix: "بادئة التحويل",
    transactionPrefix: "بادئة الحركة",
    treasuryLockDate: "تاريخ قفل الخزينة",
    lowBalanceThreshold: "حد التنبيه للرصيد",
    notes: "ملاحظات داخلية",

    enabled: "مفعل",
    disabled: "غير مفعل",
    activeAccounts: "حسابات نشطة",
    cashboxes: "الصناديق",
    banks: "البنوك",
    totalBalance: "إجمالي الرصيد",
    currentBalance: "الرصيد الحالي",
    accountType: "نوع الحساب",
    unsaved: "تغييرات غير محفوظة",
    saved: "محفوظ",
    noAccounts: "لا توجد حسابات",
    noAccountsDesc: "أضف صندوقًا أو حسابًا بنكيًا قبل ضبط الإعدادات الافتراضية.",

    required: "هذا الحقل مطلوب.",
    invalidThreshold: "أدخل رقمًا صحيحًا أو اتركه صفر.",
    leaveWarning: "لديك تغييرات غير محفوظة.",
    confirmReset: "هل تريد إعادة ضبط التغييرات؟",
    refreshed: "تم تحديث إعدادات الخزينة.",
    savedToast: "تم حفظ إعدادات الخزينة بنجاح.",
    saveError: "تعذر حفظ إعدادات الخزينة.",
    errorTitle: "تعذر تحميل إعدادات الخزينة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    notAvailable: "—",
    sar: "ر.س",
  },
  en: {
    title: "Treasury Settings",
    subtitle: "Configure default accounts, movement policies, posting, and voucher numbering.",
    treasury: "Treasury",
    transactions: "Treasury transactions",
    reports: "Treasury reports",
    refresh: "Refresh",
    reset: "Reset",
    save: "Save settings",
    saving: "Saving...",

    overview: "Settings overview",
    accountsCard: "Default accounts",
    accountsDesc: "Select the default cashbox and bank used in financial operations.",
    policiesCard: "Operational policies",
    policiesDesc: "Control negative balances, auto-confirmation, posting, and reference requirement.",
    numberingCard: "Voucher numbering",
    numberingDesc: "Set prefixes for receipt, payment, transfer, and general transactions.",
    controlsCard: "Financial controls",
    controlsDesc: "Set treasury lock date, low balance threshold, and internal notes.",
    saveCard: "Save readiness",
    saveDesc: "Review changes before saving treasury settings.",

    defaultCashbox: "Default cashbox",
    defaultBank: "Default bank",
    chooseCashbox: "Choose default cashbox",
    chooseBank: "Choose default bank",
    allowNegativeBalance: "Allow negative balance",
    autoConfirmTransactions: "Auto-confirm transactions",
    autoPostToAccounting: "Auto-post to accounting",
    requireReference: "Require reference",
    receiptPrefix: "Receipt prefix",
    paymentPrefix: "Payment prefix",
    transferPrefix: "Transfer prefix",
    transactionPrefix: "Transaction prefix",
    treasuryLockDate: "Treasury lock date",
    lowBalanceThreshold: "Low balance threshold",
    notes: "Internal notes",

    enabled: "Enabled",
    disabled: "Disabled",
    activeAccounts: "Active accounts",
    cashboxes: "Cashboxes",
    banks: "Banks",
    totalBalance: "Total balance",
    currentBalance: "Current balance",
    accountType: "Account type",
    unsaved: "Unsaved changes",
    saved: "Saved",
    noAccounts: "No accounts",
    noAccountsDesc: "Add a cashbox or bank account before configuring default settings.",

    required: "This field is required.",
    invalidThreshold: "Enter a valid number or keep it zero.",
    leaveWarning: "You have unsaved changes.",
    confirmReset: "Reset unsaved changes?",
    refreshed: "Treasury settings refreshed.",
    savedToast: "Treasury settings saved successfully.",
    saveError: "Unable to save treasury settings.",
    errorTitle: "Unable to load treasury settings",
    errorDesc: "Make sure the backend is running, then try again.",
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

    if (["1", "true", "yes", "on", "enabled", "active", "default"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off", "disabled", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(toNumber(value));
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
  const data = asRecord(payload?.data);
  const result = asRecord(payload?.result);
  const item = asRecord(payload?.item);
  const settings = asRecord(payload?.settings);

  if (Object.keys(settings).length) return settings;
  if (Object.keys(data).length) return data;
  if (Object.keys(result).length) return result;
  if (Object.keys(item).length) return item;

  return asRecord(payload);
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
    account_type: normalizeText(item.account_type || item.type || "other").toLowerCase(),
    account_type_label: normalizeText(item.account_type_label || item.type_label),
    current_balance: toNumber(item.current_balance ?? item.balance),
    currency: normalizeText(item.currency || "SAR"),
    status: normalizeText(item.status || "active").toLowerCase(),
    is_default: toBoolean(item.is_default),
  };
}

function normalizeSettings(value: unknown): SettingsForm {
  const item = asRecord(value);

  return {
    default_cashbox_account_id: normalizeText(
      item.default_cashbox_account_id ||
        item.default_cashbox_id ||
        item.default_cashbox ||
        item.cashbox_account_id,
    ),
    default_bank_account_id: normalizeText(
      item.default_bank_account_id ||
        item.default_bank_id ||
        item.default_bank ||
        item.bank_account_id,
    ),
    allow_negative_balance: toBoolean(item.allow_negative_balance),
    auto_confirm_transactions: toBoolean(item.auto_confirm_transactions),
    auto_post_to_accounting: toBoolean(item.auto_post_to_accounting || item.auto_accounting_posting),
    require_reference: toBoolean(item.require_reference),
    receipt_prefix: normalizeText(item.receipt_prefix, DEFAULT_FORM.receipt_prefix),
    payment_prefix: normalizeText(item.payment_prefix, DEFAULT_FORM.payment_prefix),
    transfer_prefix: normalizeText(item.transfer_prefix, DEFAULT_FORM.transfer_prefix),
    transaction_prefix: normalizeText(item.transaction_prefix, DEFAULT_FORM.transaction_prefix),
    treasury_lock_date:
      normalizeText(item.treasury_lock_date || item.lock_date).slice(0, 10) || "",
    low_balance_threshold: String(
      item.low_balance_threshold ?? item.balance_alert_threshold ?? DEFAULT_FORM.low_balance_threshold,
    ),
    notes: normalizeText(item.notes),
  };
}

function buildPayload(form: SettingsForm) {
  return {
    default_cashbox_account_id: form.default_cashbox_account_id || null,
    default_bank_account_id: form.default_bank_account_id || null,
    allow_negative_balance: form.allow_negative_balance,
    auto_confirm_transactions: form.auto_confirm_transactions,
    auto_post_to_accounting: form.auto_post_to_accounting,
    require_reference: form.require_reference,
    receipt_prefix: form.receipt_prefix.trim(),
    payment_prefix: form.payment_prefix.trim(),
    transfer_prefix: form.transfer_prefix.trim(),
    transaction_prefix: form.transaction_prefix.trim(),
    treasury_lock_date: form.treasury_lock_date || null,
    low_balance_threshold: toNumber(form.low_balance_threshold),
    notes: form.notes.trim(),
  };
}

function isCashbox(account: TreasuryAccount) {
  const type = `${account.account_type} ${account.account_type_label}`.toLowerCase();
  return type.includes("cash") || type.includes("box") || type.includes("صندوق");
}

function isBank(account: TreasuryAccount) {
  const type = `${account.account_type} ${account.account_type_label}`.toLowerCase();
  return type.includes("bank") || type.includes("بنك");
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

function BooleanBadge({
  value,
  enabled,
  disabled,
}: {
  value: boolean;
  enabled: string;
  disabled: string;
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
      {value ? enabled : disabled}
    </Badge>
  );
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
            className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {trend}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onChange,
  disabled,
  enabledText,
  disabledText,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (nextValue: boolean) => void;
  disabled?: boolean;
  enabledText: string;
  disabledText: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1 text-right">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-sm leading-6 text-muted-foreground">{description}</div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <BooleanBadge value={value} enabled={enabledText} disabled={disabledText} />

        <Button
          type="button"
          variant={value ? "default" : "outline"}
          className={cn(
            "h-9 rounded-lg",
            value && "bg-black text-white hover:bg-black/90",
          )}
          disabled={disabled}
          onClick={() => onChange(!value)}
        >
          {value ? enabledText : disabledText}
        </Button>
      </div>
    </div>
  );
}

function AccountOption({ account }: { account: TreasuryAccount }) {
  return (
    <span>
      {account.code ? `${account.code} — ${account.name}` : account.name}
    </span>
  );
}

function AccountMiniCard({
  title,
  account,
  fallback,
  sar,
}: {
  title: string;
  account: TreasuryAccount | null;
  fallback: string;
  sar: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-1 text-xs text-muted-foreground">{title}</div>
      <div className="truncate text-sm font-semibold text-foreground">
        {account?.name || fallback}
      </div>
      <div className="mt-1 truncate text-xs text-muted-foreground tabular-nums">
        {account?.code || fallback}
      </div>
      {account ? (
        <div className="mt-3">
          <MoneyValue value={account.current_balance} label={sar} />
        </div>
      ) : null}
    </div>
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

      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[620px] rounded-lg" />
        <Skeleton className="h-[620px] rounded-lg" />
      </div>
    </div>
  );
}

export default function TreasurySettingsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<TreasuryAccount[]>([]);
  const [form, setForm] = React.useState<SettingsForm>(DEFAULT_FORM);
  const [originalForm, setOriginalForm] = React.useState<SettingsForm>(DEFAULT_FORM);
  const [errors, setErrors] = React.useState<FormErrors>({});

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [canSave, setCanSave] = React.useState(true);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const cashboxAccounts = React.useMemo(() => accounts.filter(isCashbox), [accounts]);
  const bankAccounts = React.useMemo(() => accounts.filter(isBank), [accounts]);

  const selectedCashbox = React.useMemo(() => {
    return accounts.find((account) => account.id === form.default_cashbox_account_id) || null;
  }, [accounts, form.default_cashbox_account_id]);

  const selectedBank = React.useMemo(() => {
    return accounts.find((account) => account.id === form.default_bank_account_id) || null;
  }, [accounts, form.default_bank_account_id]);

  const stats = React.useMemo(() => {
    return {
      activeAccounts: accounts.filter((account) => account.status !== "inactive").length,
      cashboxes: cashboxAccounts.length,
      banks: bankAccounts.length,
      totalBalance: accounts.reduce((sum, account) => sum + account.current_balance, 0),
    };
  }, [accounts, bankAccounts.length, cashboxAccounts.length]);

  const dirty = React.useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(originalForm);
  }, [form, originalForm]);

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
      if (!dirty || saving) return;

      event.preventDefault();
      event.returnValue = t.leaveWarning;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty, saving, t.leaveWarning]);

  const loadData = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const accountParams = new URLSearchParams({
          page: "1",
          page_size: "500",
          ordering: "account_type",
        });

        const [settingsPayload, accountsPayload, whoamiPayload] = await Promise.all([
          fetchJson<ApiResponse>(makeApiUrl(API.settings), {
            method: "GET",
            signal: controller.signal,
          }).catch(() => null),
          fetchJson<ApiResponse>(makeApiUrl(API.accounts, accountParams), {
            method: "GET",
            signal: controller.signal,
          }),
          fetchJson<ApiResponse>(makeApiUrl(API.whoami), {
            method: "GET",
            signal: controller.signal,
          }).catch(() => null),
        ]);

        const nextAccounts = extractItems(accountsPayload)
          .map(normalizeAccount)
          .filter((account) => account.id || account.name || account.code);

        const loadedSettings = settingsPayload
          ? normalizeSettings(extractData(settingsPayload))
          : DEFAULT_FORM;

        const withFallbackAccounts = {
          ...loadedSettings,
          default_cashbox_account_id:
            loadedSettings.default_cashbox_account_id ||
            nextAccounts.find((account) => account.is_default && isCashbox(account))?.id ||
            nextAccounts.find(isCashbox)?.id ||
            "",
          default_bank_account_id:
            loadedSettings.default_bank_account_id ||
            nextAccounts.find((account) => account.is_default && isBank(account))?.id ||
            nextAccounts.find(isBank)?.id ||
            "",
        };

        const whoami = extractData(whoamiPayload);
        const role = normalizeText(whoami.role || whoami.user_role || whoami.user_type).toLowerCase();
        const isSuper =
          toBoolean(whoami.is_superuser) ||
          role.includes("system_admin") ||
          role.includes("superuser") ||
          role.includes("admin");

        const rawPermissions = [
          ...((Array.isArray(whoami.permission_codes) ? whoami.permission_codes : []) as unknown[]),
          ...((Array.isArray(asRecord(whoami.permissions).codes)
            ? asRecord(whoami.permissions).codes
            : []) as unknown[]),
          ...((Array.isArray(asRecord(whoami.profile_permissions).codes)
            ? asRecord(whoami.profile_permissions).codes
            : []) as unknown[]),
        ].map((permission) => normalizeText(permission).toLowerCase());

        const allowed =
          !whoamiPayload ||
          isSuper ||
          rawPermissions.some((permission) =>
            [
              "treasury.settings",
              "treasury.change_settings",
              "treasury.update",
              "treasury.manage",
            ].includes(permission),
          );

        setCanSave(allowed);
        setAccounts(nextAccounts);
        setForm(withFallbackAccounts);
        setOriginalForm(withFallbackAccounts);
        setErrors({});

        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message ? caughtError.message : t.errorDesc;

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  function updateField<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setError("");
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    if (!form.receipt_prefix.trim()) nextErrors.receipt_prefix = t.required;
    if (!form.payment_prefix.trim()) nextErrors.payment_prefix = t.required;
    if (!form.transfer_prefix.trim()) nextErrors.transfer_prefix = t.required;
    if (!form.transaction_prefix.trim()) nextErrors.transaction_prefix = t.required;
    if (toNumber(form.low_balance_threshold) < 0) {
      nextErrors.low_balance_threshold = t.invalidThreshold;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveSettings() {
    if (!validateForm()) {
      toast.error(t.saveError);
      return;
    }

    setSaving(true);
    setError("");

    const payload = buildPayload(form);

    try {
      try {
        await fetchJson<ApiResponse>(makeApiUrl(API.updateSettings), {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch {
        try {
          await fetchJson<ApiResponse>(makeApiUrl(API.settings), {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } catch {
          await fetchJson<ApiResponse>(makeApiUrl(API.settings), {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
      }

      setOriginalForm(form);
      toast.success(t.savedToast);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message ? caughtError.message : t.saveError;

      setError(message);
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    if (dirty && !window.confirm(t.confirmReset)) return;

    setForm(originalForm);
    setErrors({});
    setError("");
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
            <Link href="/system/treasury">
              <BackIcon className="h-4 w-4" />
              {t.treasury}
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/treasury/transactions">
              <WalletCards className="h-4 w-4" />
              {t.transactions}
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/treasury/reports">
              <FileText className="h-4 w-4" />
              {t.reports}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadData({ silent: true })}
            disabled={refreshing || saving}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={resetForm}
            disabled={saving || !dirty}
          >
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </Button>

          {canSave ? (
            <Button
              className="h-9 rounded-lg bg-black text-white hover:bg-black/90"
              onClick={() => void saveSettings()}
              disabled={saving || !dirty}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? t.saving : t.save}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.activeAccounts}
          value={formatInteger(stats.activeAccounts)}
          trend={dirty ? t.unsaved : t.saved}
          icon={WalletCards}
        />

        <KpiCard
          title={t.cashboxes}
          value={formatInteger(stats.cashboxes)}
          trend={selectedCashbox?.name || t.notAvailable}
          icon={Banknote}
        />

        <KpiCard
          title={t.banks}
          value={formatInteger(stats.banks)}
          trend={selectedBank?.name || t.notAvailable}
          icon={Landmark}
        />

        <KpiCard
          title={t.totalBalance}
          value={<MoneyValue value={stats.totalBalance} label={t.sar} />}
          trend={t.currentBalance}
          icon={Settings}
        />
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
              onClick={() => void loadData()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!accounts.length && !error ? (
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
              <WalletCards className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-foreground">{t.noAccounts}</p>
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.accountsCard}</CardTitle>
              <CardDescription>{t.accountsDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t.defaultCashbox}
                </label>
                <Select
                  value={form.default_cashbox_account_id || undefined}
                  onValueChange={(value) => updateField("default_cashbox_account_id", value)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue placeholder={t.chooseCashbox} />
                  </SelectTrigger>
                  <SelectContent>
                    {cashboxAccounts.length ? (
                      cashboxAccounts.map((account) => (
                        <SelectItem key={account.id || account.code} value={account.id}>
                          <AccountOption account={account} />
                        </SelectItem>
                      ))
                    ) : (
                      accounts.map((account) => (
                        <SelectItem key={account.id || account.code} value={account.id}>
                          <AccountOption account={account} />
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FieldError message={errors.default_cashbox_account_id} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t.defaultBank}
                </label>
                <Select
                  value={form.default_bank_account_id || undefined}
                  onValueChange={(value) => updateField("default_bank_account_id", value)}
                  disabled={saving}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue placeholder={t.chooseBank} />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.length ? (
                      bankAccounts.map((account) => (
                        <SelectItem key={account.id || account.code} value={account.id}>
                          <AccountOption account={account} />
                        </SelectItem>
                      ))
                    ) : (
                      accounts.map((account) => (
                        <SelectItem key={account.id || account.code} value={account.id}>
                          <AccountOption account={account} />
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FieldError message={errors.default_bank_account_id} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.policiesCard}</CardTitle>
              <CardDescription>{t.policiesDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6">
              <ToggleRow
                title={t.allowNegativeBalance}
                description={
                  locale === "ar"
                    ? "عند التفعيل يمكن للحسابات تسجيل حركة تؤدي إلى رصيد سالب إذا سمح الباكند بذلك."
                    : "When enabled, accounts may allow transactions that result in a negative balance if supported by the backend."
                }
                value={form.allow_negative_balance}
                onChange={(value) => updateField("allow_negative_balance", value)}
                disabled={saving}
                enabledText={t.enabled}
                disabledText={t.disabled}
              />

              <ToggleRow
                title={t.autoConfirmTransactions}
                description={
                  locale === "ar"
                    ? "تأكيد حركات الخزينة تلقائيًا بعد الإنشاء بدل بقائها كمسودة."
                    : "Automatically confirm treasury transactions after creation instead of keeping them as drafts."
                }
                value={form.auto_confirm_transactions}
                onChange={(value) => updateField("auto_confirm_transactions", value)}
                disabled={saving}
                enabledText={t.enabled}
                disabledText={t.disabled}
              />

              <ToggleRow
                title={t.autoPostToAccounting}
                description={
                  locale === "ar"
                    ? "إرسال أثر الحركات المؤكدة إلى المحاسبة تلقائيًا عند دعم ذلك."
                    : "Automatically post confirmed treasury impact to accounting when supported."
                }
                value={form.auto_post_to_accounting}
                onChange={(value) => updateField("auto_post_to_accounting", value)}
                disabled={saving}
                enabledText={t.enabled}
                disabledText={t.disabled}
              />

              <ToggleRow
                title={t.requireReference}
                description={
                  locale === "ar"
                    ? "إلزام إدخال مرجع للحركات والسندات عند إنشاء العمليات المالية."
                    : "Require a reference when creating treasury movements and vouchers."
                }
                value={form.require_reference}
                onChange={(value) => updateField("require_reference", value)}
                disabled={saving}
                enabledText={t.enabled}
                disabledText={t.disabled}
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.numberingCard}</CardTitle>
              <CardDescription>{t.numberingDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t.receiptPrefix}
                </label>
                <Input
                  value={form.receipt_prefix}
                  onChange={(event) =>
                    updateField("receipt_prefix", event.target.value.toUpperCase())
                  }
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                />
                <FieldError message={errors.receipt_prefix} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t.paymentPrefix}
                </label>
                <Input
                  value={form.payment_prefix}
                  onChange={(event) =>
                    updateField("payment_prefix", event.target.value.toUpperCase())
                  }
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                />
                <FieldError message={errors.payment_prefix} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t.transferPrefix}
                </label>
                <Input
                  value={form.transfer_prefix}
                  onChange={(event) =>
                    updateField("transfer_prefix", event.target.value.toUpperCase())
                  }
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                />
                <FieldError message={errors.transfer_prefix} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t.transactionPrefix}
                </label>
                <Input
                  value={form.transaction_prefix}
                  onChange={(event) =>
                    updateField("transaction_prefix", event.target.value.toUpperCase())
                  }
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                />
                <FieldError message={errors.transaction_prefix} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.controlsCard}</CardTitle>
              <CardDescription>{t.controlsDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t.treasuryLockDate}
                </label>
                <Input
                  type="date"
                  value={form.treasury_lock_date}
                  onChange={(event) => updateField("treasury_lock_date", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                />
                <FieldError message={errors.treasury_lock_date} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t.lowBalanceThreshold}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.low_balance_threshold}
                  onChange={(event) => updateField("low_balance_threshold", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                />
                <FieldError message={errors.low_balance_threshold} />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t.notes}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={saving}
                />
                <FieldError message={errors.notes} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="relative px-6 py-5">
              <CardDescription>{t.saveDesc}</CardDescription>
              <CardTitle>{t.saveCard}</CardTitle>
              <CardAction>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    dirty
                      ? "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50"
                      : "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
                  )}
                >
                  {dirty ? t.unsaved : t.saved}
                </Badge>
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pb-6">
              <AccountMiniCard
                title={t.defaultCashbox}
                account={selectedCashbox}
                fallback={t.notAvailable}
                sar={t.sar}
              />

              <AccountMiniCard
                title={t.defaultBank}
                account={selectedBank}
                fallback={t.notAvailable}
                sar={t.sar}
              />

              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                  <span className="text-sm text-muted-foreground">{t.allowNegativeBalance}</span>
                  <BooleanBadge
                    value={form.allow_negative_balance}
                    enabled={t.enabled}
                    disabled={t.disabled}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                  <span className="text-sm text-muted-foreground">{t.autoConfirmTransactions}</span>
                  <BooleanBadge
                    value={form.auto_confirm_transactions}
                    enabled={t.enabled}
                    disabled={t.disabled}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                  <span className="text-sm text-muted-foreground">{t.autoPostToAccounting}</span>
                  <BooleanBadge
                    value={form.auto_post_to_accounting}
                    enabled={t.enabled}
                    disabled={t.disabled}
                  />
                </div>
              </div>

              {canSave ? (
                <Button
                  className="h-10 w-full rounded-lg bg-black text-white hover:bg-black/90"
                  onClick={() => void saveSettings()}
                  disabled={saving || !dirty}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? t.saving : t.save}
                </Button>
              ) : null}

              <Button
                variant="outline"
                className="h-10 w-full rounded-lg bg-background"
                onClick={resetForm}
                disabled={saving || !dirty}
              >
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="flex items-start gap-3 p-4 text-right">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{t.overview}</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {locale === "ar"
                    ? "الإعدادات تحفظ في الباكند عند توفر endpoint الإعدادات. يتم استخدام القيم الحالية كواجهة تشغيل آمنة بدون بيانات وهمية."
                    : "Settings are saved in the backend when the settings endpoint is available. Current values are used as a safe operational interface without fake data."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.numberingCard}</CardTitle>
              <CardDescription>{t.numberingDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 px-6 pb-6">
              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm text-muted-foreground">{t.receiptPrefix}</span>
                <Badge variant="outline" className="rounded-full tabular-nums">
                  {form.receipt_prefix || t.notAvailable}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm text-muted-foreground">{t.paymentPrefix}</span>
                <Badge variant="outline" className="rounded-full tabular-nums">
                  {form.payment_prefix || t.notAvailable}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm text-muted-foreground">{t.transferPrefix}</span>
                <Badge variant="outline" className="rounded-full tabular-nums">
                  {form.transfer_prefix || t.notAvailable}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <span className="text-sm text-muted-foreground">{t.transactionPrefix}</span>
                <Badge variant="outline" className="rounded-full tabular-nums">
                  {form.transaction_prefix || t.notAvailable}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}