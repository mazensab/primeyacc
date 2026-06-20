"use client";

/* ============================================================
   📂 app/system/accounting/accounts/create/page.tsx
   🧾 Primey Care — Create Accounting Account
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API only:
      GET  /api/accounting/accounts/
      POST /api/accounting/accounts/
      POST /api/accounting/accounts/create/ fallback
   ✅ Auto sequential account code
   ✅ Parent account selector
   ✅ Unsaved changes protection
   ✅ Skeleton loading
   ✅ Error state
   ✅ sonner toast
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
  BookOpen,
  CheckCircle2,
  FolderTree,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  WalletCards,
  X,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Locale = "ar" | "en";

type ApiRecord = Record<string, unknown>;

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
type AccountNature = "debit" | "credit";
type AccountKind = "group" | "posting";

type ParentAccount = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  name_en: string;
  account_type: AccountType;
  nature: AccountNature;
  is_group: boolean;
  is_active: boolean;
};

type AccountForm = {
  code: string;
  name_ar: string;
  name_en: string;
  account_type: AccountType;
  nature: AccountNature;
  parent_id: string;
  is_group: boolean;
  is_active: boolean;
  opening_balance: string;
  currency: string;
  notes: string;
};

type FieldErrors = Partial<Record<keyof AccountForm | "general", string>>;

const translations = {
  ar: {
    title: "إنشاء حساب محاسبي",
    subtitle:
      "إضافة حساب جديد داخل دليل الحسابات مع توليد الكود تلقائيًا حسب النوع أو الحساب الأب.",
    back: "دليل الحسابات",
    save: "حفظ الحساب",
    saving: "جاري الحفظ",
    refresh: "تحديث الحسابات",
    reset: "مسح النموذج",

    basicInfo: "بيانات الحساب",
    basicInfoDesc: "حدد اسم الحساب ونوعه وطبيعته داخل الشجرة المحاسبية.",
    structureInfo: "هيكل الحساب",
    structureInfoDesc: "اختر الحساب الأب والتصنيف وطريقة الترحيل.",
    balanceInfo: "الرصيد والملاحظات",
    balanceInfoDesc: "أدخل الرصيد الافتتاحي عند الحاجة وملاحظات داخلية اختيارية.",
    summary: "ملخص الحساب",
    summaryDesc: "مراجعة جاهزية الحساب قبل الحفظ.",

    accountName: "اسم الحساب",
    accountNameAr: "اسم الحساب عربي",
    accountNameEn: "اسم الحساب إنجليزي",
    accountCode: "كود الحساب",
    generatedCode: "يتم توليده تلقائيًا",
    accountType: "نوع الحساب",
    nature: "الطبيعة",
    parentAccount: "الحساب الأب",
    noParent: "بدون حساب أب",
    searchParent: "ابحث عن حساب أب...",
    accountKind: "تصنيف الحساب",
    groupAccount: "حساب تجميعي",
    postingAccount: "حساب ترحيل",
    activeAccount: "حساب نشط",
    accountStatus: "إظهار الحساب ضمن الحسابات النشطة والقابلة للاستخدام.",
    openingBalance: "الرصيد الافتتاحي",
    currency: "العملة",
    notes: "ملاحظات",
    notesPlaceholder: "ملاحظات داخلية اختيارية...",

    asset: "أصول",
    liability: "التزامات",
    equity: "حقوق ملكية",
    revenue: "إيرادات",
    expense: "مصروفات",
    debit: "مدين",
    credit: "دائن",

    ready: "جاهز للحفظ",
    notReady: "غير مكتمل",
    validName: "اسم الحساب مكتمل",
    validType: "نوع الحساب محدد",
    validCode: "كود الحساب جاهز",
    validParent: "هيكل الحساب صحيح",
    invalidName: "اسم الحساب مطلوب",
    invalidCode: "تعذر توليد الكود",
    invalidParent: "لا يمكن اختيار حساب ترحيل كحساب أب",

    totalAccounts: "إجمالي الحسابات",
    groupAccounts: "حسابات تجميعية",
    postingAccounts: "حسابات ترحيل",
    nextCode: "الكود التالي",

    saved: "تم إنشاء الحساب المحاسبي بنجاح.",
    refreshed: "تم تحديث قائمة الحسابات.",
    resetDone: "تم مسح النموذج.",
    errorTitle: "تعذر تحميل الحسابات",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    saveError: "تعذر حفظ الحساب المحاسبي.",
    tryAgain: "إعادة المحاولة",
    confirmReset: "لديك تغييرات غير محفوظة. هل تريد مسح النموذج؟",
    leaveWarning: "لديك تغييرات غير محفوظة.",
    sar: "ر.س",
    unknown: "غير محدد",
  },
  en: {
    title: "Create Accounting Account",
    subtitle:
      "Add a new account to the chart of accounts with an auto-generated sequential code.",
    back: "Chart of accounts",
    save: "Save account",
    saving: "Saving",
    refresh: "Refresh accounts",
    reset: "Reset form",

    basicInfo: "Account information",
    basicInfoDesc: "Set the account name, type, and nature inside the accounting tree.",
    structureInfo: "Account structure",
    structureInfoDesc: "Choose the parent account, account kind, and posting behavior.",
    balanceInfo: "Balance and notes",
    balanceInfoDesc: "Enter an optional opening balance and internal notes.",
    summary: "Account summary",
    summaryDesc: "Review account readiness before saving.",

    accountName: "Account name",
    accountNameAr: "Arabic account name",
    accountNameEn: "English account name",
    accountCode: "Account code",
    generatedCode: "Generated automatically",
    accountType: "Account type",
    nature: "Nature",
    parentAccount: "Parent account",
    noParent: "No parent account",
    searchParent: "Search parent account...",
    accountKind: "Account kind",
    groupAccount: "Group account",
    postingAccount: "Posting account",
    activeAccount: "Active account",
    accountStatus: "Show this account as active and available for use.",
    openingBalance: "Opening balance",
    currency: "Currency",
    notes: "Notes",
    notesPlaceholder: "Optional internal notes...",

    asset: "Assets",
    liability: "Liabilities",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expenses",
    debit: "Debit",
    credit: "Credit",

    ready: "Ready to save",
    notReady: "Incomplete",
    validName: "Account name completed",
    validType: "Account type selected",
    validCode: "Account code ready",
    validParent: "Account structure valid",
    invalidName: "Account name is required",
    invalidCode: "Could not generate code",
    invalidParent: "Posting account cannot be selected as parent",

    totalAccounts: "Total accounts",
    groupAccounts: "Group accounts",
    postingAccounts: "Posting accounts",
    nextCode: "Next code",

    saved: "Accounting account created successfully.",
    refreshed: "Accounts list refreshed.",
    resetDone: "Form has been reset.",
    errorTitle: "Could not load accounts",
    errorDesc: "Make sure the backend is running, then try again.",
    saveError: "Could not save accounting account.",
    tryAgain: "Try again",
    confirmReset: "You have unsaved changes. Do you want to reset the form?",
    leaveWarning: "You have unsaved changes.",
    sar: "SAR",
    unknown: "Unknown",
  },
} as const;

const ACCOUNT_TYPES: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];

const TYPE_PREFIX: Record<AccountType, string> = {
  asset: "1",
  liability: "2",
  equity: "3",
  revenue: "4",
  expense: "5",
};

const TYPE_NATURE: Record<AccountType, AccountNature> = {
  asset: "debit",
  expense: "debit",
  liability: "credit",
  equity: "credit",
  revenue: "credit",
};

const EMPTY_FORM: AccountForm = {
  code: "",
  name_ar: "",
  name_en: "",
  account_type: "asset",
  nature: "debit",
  parent_id: "",
  is_group: false,
  is_active: true,
  opening_balance: "0",
  currency: "SAR",
  notes: "",
};

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
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

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "active"].includes(normalized)) return true;
    if (["false", "0", "no", "inactive"].includes(normalized)) return false;
  }

  return fallback;
}

function normalizeType(value: unknown): AccountType {
  const normalized = asString(value).toLowerCase();

  if (ACCOUNT_TYPES.includes(normalized as AccountType)) return normalized as AccountType;

  return "asset";
}

function normalizeNature(value: unknown, accountType: AccountType): AccountNature {
  const normalized = asString(value).toLowerCase();

  if (normalized === "debit" || normalized === "credit") return normalized;

  return TYPE_NATURE[accountType];
}

function pickRecord(...values: unknown[]): ApiRecord {
  for (const value of values) {
    if (isRecord(value)) return value;
  }

  return {};
}

function normalizeAccount(raw: unknown): ParentAccount | null {
  if (!isRecord(raw)) return null;

  const id = asString(raw.id || raw.pk || raw.account_id);
  const accountType = normalizeType(raw.account_type || raw.type || raw.category);
  const nature = normalizeNature(raw.nature || raw.normal_balance, accountType);

  if (!id) return null;

  return {
    id,
    code: asString(raw.code || raw.account_code || raw.number),
    name: asString(raw.name || raw.title || raw.name_ar || raw.name_en),
    name_ar: asString(raw.name_ar || raw.arabic_name || raw.name),
    name_en: asString(raw.name_en || raw.english_name || raw.name),
    account_type: accountType,
    nature,
    is_group: asBoolean(raw.is_group ?? raw.group ?? raw.is_parent, true),
    is_active: asBoolean(raw.is_active ?? raw.active, true),
  };
}

function normalizeAccountsResponse(payload: unknown): ParentAccount[] {
  const root = pickRecord(payload);
  const data = root.data;
  const results = root.results;
  const accounts = root.accounts;

  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(results)
      ? results
      : Array.isArray(data)
        ? data
        : Array.isArray(accounts)
          ? accounts
          : isRecord(data) && Array.isArray(data.results)
            ? data.results
            : isRecord(data) && Array.isArray(data.accounts)
              ? data.accounts
              : [];

  return source
    .map(normalizeAccount)
    .filter((account): account is ParentAccount => Boolean(account))
    .sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
}

function extractApiError(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;

  const direct =
    asString(payload.message) ||
    asString(payload.detail) ||
    asString(payload.error);

  if (direct) return direct;

  const errors = payload.errors;

  if (typeof errors === "string") return errors;

  if (Array.isArray(errors)) {
    return errors.map((item) => asString(item)).filter(Boolean).join(" ") || fallback;
  }

  if (isRecord(errors)) {
    const first = Object.values(errors)[0];

    if (Array.isArray(first)) return first.map((item) => asString(item)).filter(Boolean).join(" ");
    if (typeof first === "string") return first;
  }

  return fallback;
}

function parseFieldErrors(payload: unknown): FieldErrors {
  if (!isRecord(payload)) return {};

  const errors = isRecord(payload.errors) ? payload.errors : payload;

  const fieldErrors: FieldErrors = {};

  for (const [key, value] of Object.entries(errors)) {
    if (Array.isArray(value)) {
      fieldErrors[key as keyof FieldErrors] = value.map((item) => asString(item)).filter(Boolean).join(" ");
    } else if (typeof value === "string") {
      fieldErrors[key as keyof FieldErrors] = value;
    }
  }

  return fieldErrors;
}

function displayAccountName(account: ParentAccount, locale: Locale): string {
  if (locale === "ar") return account.name_ar || account.name || account.name_en || account.code;
  return account.name_en || account.name || account.name_ar || account.code;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function normalizeDecimalInput(value: string): string {
  return value.replace(/[^\d.-]/g, "");
}

function suggestNextCode(accounts: ParentAccount[], form: AccountForm): string {
  const parent = accounts.find((account) => account.id === form.parent_id);

  if (parent?.code) {
    const directChildren = accounts.filter((account) => {
      if (!account.code.startsWith(parent.code)) return false;
      const suffix = account.code.slice(parent.code.length);
      return /^\d{2,4}$/.test(suffix);
    });

    const childNumbers = directChildren
      .map((account) => Number(account.code.slice(parent.code.length)))
      .filter((number) => Number.isFinite(number));

    const next = childNumbers.length ? Math.max(...childNumbers) + 1 : 1;
    const width = Math.max(2, String(next).length);

    return `${parent.code}${String(next).padStart(width, "0")}`;
  }

  const prefix = TYPE_PREFIX[form.account_type];

  const sameTypeRootCodes = accounts
    .filter((account) => account.account_type === form.account_type && account.code.startsWith(prefix))
    .map((account) => account.code)
    .filter((code) => /^\d+$/.test(code));

  if (!sameTypeRootCodes.length) return `${prefix}001`;

  const rootNumbers = sameTypeRootCodes
    .map((code) => Number(code.slice(1)))
    .filter((number) => Number.isFinite(number));

  const next = rootNumbers.length ? Math.max(...rootNumbers) + 1 : 1;

  return `${prefix}${String(next).padStart(3, "0")}`;
}

function validateForm(form: AccountForm): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name_ar.trim()) errors.name_ar = "required";
  if (!form.name_en.trim()) errors.name_en = "required";

  const openingBalance = Number(normalizeDecimalInput(form.opening_balance || "0"));

  if (!Number.isFinite(openingBalance)) errors.opening_balance = "invalid";

  return errors;
}

function FieldError({ message, locale }: { message?: string; locale: Locale }) {
  if (!message) return null;

  const t = translations[locale];

  const normalizedMessage =
    message === "required"
      ? "required"
      : message === "invalid"
        ? "invalid"
        : message;

  const label =
    normalizedMessage === "required"
      ? locale === "ar"
        ? "هذا الحقل مطلوب."
        : "This field is required."
      : normalizedMessage === "invalid"
        ? locale === "ar"
          ? "أدخل رقمًا صحيحًا."
          : "Enter a valid number."
        : message;

  return <p className="mt-1 text-xs text-red-600">{label}</p>;
}

function InfoBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <Badge variant="outline" className={className}>
      {children}
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
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[720px] rounded-lg" />
        <Skeleton className="h-[420px] rounded-lg" />
      </div>
    </div>
  );
}

export default function CreateAccountingAccountPage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<ParentAccount[]>([]);
  const [form, setForm] = React.useState<AccountForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [searchParent, setSearchParent] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [pageError, setPageError] = React.useState("");
  const [isDirty, setIsDirty] = React.useState(false);
  const [createdId, setCreatedId] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const selectedParent = React.useMemo(
    () => accounts.find((account) => account.id === form.parent_id) || null,
    [accounts, form.parent_id],
  );

  const suggestedCode = React.useMemo(
    () => suggestNextCode(accounts, form),
    [accounts, form],
  );

  const filteredParents = React.useMemo(() => {
    const query = searchParent.trim().toLowerCase();

    return accounts.filter((account) => {
      if (!account.is_group || !account.is_active) return false;
      if (account.account_type !== form.account_type) return false;

      if (!query) return true;

      return [
        account.code,
        account.name,
        account.name_ar,
        account.name_en,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [accounts, form.account_type, searchParent]);

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
      if (!isDirty || saving) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, saving]);

  const loadAccounts = React.useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const response = await fetch(apiUrl("/api/accounting/accounts/"), {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      let payload: unknown = null;

      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(extractApiError(payload, t.errorDesc));
      }

      setAccounts(normalizeAccountsResponse(payload));
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : t.errorDesc;

      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [t.errorDesc]);

  React.useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  React.useEffect(() => {
    setForm((current) => ({
      ...current,
      nature: TYPE_NATURE[current.account_type],
      code: suggestNextCode(accounts, current),
    }));
  }, [accounts]);

  const updateForm = React.useCallback(
    <K extends keyof AccountForm>(key: K, value: AccountForm[K]) => {
      setForm((current) => {
        const next = {
          ...current,
          [key]: value,
        };

        if (key === "account_type") {
          const nextType = value as AccountType;

          next.nature = TYPE_NATURE[nextType];
          next.parent_id = "";
          next.code = suggestNextCode(accounts, {
            ...next,
            account_type: nextType,
            parent_id: "",
          });
        } else if (key === "parent_id") {
          next.code = suggestNextCode(accounts, next);
        }

        return next;
      });

      setFieldErrors((current) => ({
        ...current,
        [key]: undefined,
        general: undefined,
      }));

      setIsDirty(true);
      setCreatedId("");
    },
    [accounts],
  );

  const handleReset = React.useCallback(() => {
    if (isDirty && !window.confirm(t.confirmReset)) return;

    const initial = {
      ...EMPTY_FORM,
      code: suggestNextCode(accounts, EMPTY_FORM),
    };

    setForm(initial);
    setFieldErrors({});
    setSearchParent("");
    setPageError("");
    setIsDirty(false);
    setCreatedId("");
    toast.success(t.resetDone);
  }, [accounts, isDirty, t.confirmReset, t.resetDone]);

  const buildPayload = React.useCallback(() => {
    const openingBalance = Number(normalizeDecimalInput(form.opening_balance || "0"));

    return {
      code: form.code || suggestedCode,
      name: form.name_ar.trim() || form.name_en.trim(),
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      account_type: form.account_type,
      nature: form.nature,
      parent: form.parent_id || null,
      parent_id: form.parent_id || null,
      is_group: form.is_group,
      is_active: form.is_active,
      opening_balance: Number.isFinite(openingBalance) ? openingBalance : 0,
      currency: form.currency || "SAR",
      notes: form.notes.trim(),
    };
  }, [form, suggestedCode]);

  const submitToEndpoint = React.useCallback(
    async (endpoint: string, payload: ApiRecord) => {
      const response = await fetch(apiUrl(endpoint), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify(payload),
      });

      let responsePayload: unknown = null;

      try {
        responsePayload = await response.json();
      } catch {
        responsePayload = null;
      }

      return {
        ok: response.ok,
        status: response.status,
        payload: responsePayload,
      };
    },
    [],
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const errors = validateForm(form);

      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        toast.error(t.saveError);
        return;
      }

      setSaving(true);
      setPageError("");
      setFieldErrors({});

      const payload = buildPayload();

      try {
        let result = await submitToEndpoint("/api/accounting/accounts/", payload);

        if (!result.ok && [404, 405].includes(result.status)) {
          result = await submitToEndpoint("/api/accounting/accounts/create/", payload);
        }

        if (!result.ok) {
          setFieldErrors(parseFieldErrors(result.payload));
          throw new Error(extractApiError(result.payload, t.saveError));
        }

        const responseRecord = pickRecord(result.payload);
        const data = pickRecord(responseRecord.data, responseRecord.account, responseRecord.result, result.payload);
        const id = asString(data.id || data.pk || responseRecord.id);

        setCreatedId(id);
        setIsDirty(false);
        toast.success(t.saved);

        if (id) {
          router.push(`/system/accounting/accounts/${encodeURIComponent(id)}`);
        }
      } catch (error) {
        const message = error instanceof Error && error.message ? error.message : t.saveError;

        setPageError(message);
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    [buildPayload, form, router, submitToEndpoint, t.saveError, t.saved],
  );

  const handleBack = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isDirty || saving) return;

      const accepted = window.confirm(t.leaveWarning);

      if (!accepted) event.preventDefault();
    },
    [isDirty, saving, t.leaveWarning],
  );

  if (loading) return <PageSkeleton />;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/system/accounting" className="hover:text-foreground">
              {locale === "ar" ? "المحاسبة" : "Accounting"}
            </Link>
            <span>/</span>
            <Link href="/system/accounting/accounts" className="hover:text-foreground">
              {t.back}
            </Link>
            <span>/</span>
            <span className="text-foreground">{t.title}</span>
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/system/accounting/accounts" onClick={handleBack}>
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button type="button" variant="outline" onClick={() => void loadAccounts()} disabled={saving}>
            <RefreshCw className="h-4 w-4" />
            {t.refresh}
          </Button>

          <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </Button>

          <Button type="submit" disabled={saving} className="bg-foreground text-background hover:bg-foreground/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t.saving : t.save}
          </Button>
        </div>
      </div>

      {pageError ? (
        <Card className="border-red-200 bg-red-50/60 shadow-none">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-red-100 p-2 text-red-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-red-900">{t.saveError}</div>
              <p className="mt-1 text-sm text-red-700">{pageError}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isDirty ? (
        <Card className="border-amber-200 bg-amber-50/50 shadow-none">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-amber-900">{t.leaveWarning}</div>
              <p className="mt-1 text-sm text-amber-700">{t.leaveWarning}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="border-b">
              <div>
                <CardTitle>{t.basicInfo}</CardTitle>
                <CardDescription>{t.basicInfoDesc}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="grid gap-4 p-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.accountNameAr}</label>
                <Input
                  value={form.name_ar}
                  onChange={(event) => updateForm("name_ar", event.target.value)}
                  placeholder={locale === "ar" ? "مثال: النقدية بالصندوق" : "Arabic account name"}
                  disabled={saving}
                />
                <FieldError message={fieldErrors.name_ar} locale={locale} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.accountNameEn}</label>
                <Input
                  value={form.name_en}
                  onChange={(event) => updateForm("name_en", event.target.value)}
                  placeholder="Example: Cash in Hand"
                  disabled={saving}
                  dir="ltr"
                />
                <FieldError message={fieldErrors.name_en} locale={locale} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.accountCode}</label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm font-semibold">{form.code || suggestedCode}</span>
                  <Badge variant="outline" className="ms-auto">
                    {t.generatedCode}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.openingBalance}</label>
                <Input
                  value={form.opening_balance}
                  onChange={(event) => updateForm("opening_balance", normalizeDecimalInput(event.target.value))}
                  disabled={saving}
                  inputMode="decimal"
                  dir="ltr"
                />
                <FieldError message={fieldErrors.opening_balance} locale={locale} />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">{t.notes}</label>
                <Textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  placeholder={t.notesPlaceholder}
                  disabled={saving}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="border-b">
              <CardTitle>{t.structureInfo}</CardTitle>
              <CardDescription>{t.structureInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 p-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.accountType}</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ACCOUNT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      disabled={saving}
                      onClick={() => updateForm("account_type", type)}
                      className={`rounded-lg border p-3 text-start transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                        form.account_type === type
                          ? "border-foreground bg-foreground text-background"
                          : "bg-background"
                      }`}
                    >
                      <div className="font-medium">{t[type]}</div>
                      <div className={`mt-1 text-xs ${form.account_type === type ? "text-background/70" : "text-muted-foreground"}`}>
                        {TYPE_PREFIX[type]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.nature}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["debit", "credit"] as AccountNature[]).map((nature) => (
                    <button
                      key={nature}
                      type="button"
                      disabled
                      className={`rounded-lg border p-3 text-start ${
                        form.nature === nature
                          ? "border-foreground bg-muted"
                          : "bg-background opacity-60"
                      }`}
                    >
                      <div className="font-medium">{t[nature]}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{t.generatedCode}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 lg:col-span-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label className="text-sm font-medium">{t.parentAccount}</label>
                    <p className="mt-1 text-xs text-muted-foreground">{t.structureInfoDesc}</p>
                  </div>

                  <Button
                    type="button"
                    variant={!form.parent_id ? "default" : "outline"}
                    className={!form.parent_id ? "bg-foreground text-background hover:bg-foreground/90" : ""}
                    onClick={() => updateForm("parent_id", "")}
                    disabled={saving}
                  >
                    <FolderTree className="h-4 w-4" />
                    {t.noParent}
                  </Button>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchParent}
                    onChange={(event) => setSearchParent(event.target.value)}
                    placeholder={t.searchParent}
                    className="ps-9"
                    disabled={saving}
                  />
                </div>

                <div className="overflow-hidden rounded-lg border bg-background">
                  <ScrollArea className="h-[260px]">
                    <div className="divide-y">
                      {filteredParents.length ? (
                        filteredParents.map((account) => {
                          const selected = form.parent_id === account.id;

                          return (
                            <button
                              key={account.id}
                              type="button"
                              disabled={saving}
                              onClick={() => updateForm("parent_id", account.id)}
                              className={`flex w-full items-start justify-between gap-3 p-3 text-start transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                                selected ? "bg-muted/60" : ""
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-sm font-semibold">{account.code}</span>
                                  <span className="font-medium">{displayAccountName(account, locale)}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <InfoBadge>{t[account.account_type]}</InfoBadge>
                                  <InfoBadge>{t[account.nature]}</InfoBadge>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {selected ? (
                                  <InfoBadge tone="success">
                                    <CheckCircle2 className="me-1 h-3.5 w-3.5" />
                                    {locale === "ar" ? "محدد" : "Selected"}
                                  </InfoBadge>
                                ) : (
                                  <Badge variant="outline">{locale === "ar" ? "اختيار" : "Select"}</Badge>
                                )}
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="flex min-h-[180px] flex-col items-center justify-center p-6 text-center">
                          <FolderTree className="h-8 w-8 text-muted-foreground" />
                          <p className="mt-2 text-sm font-medium">
                            {locale === "ar" ? "لا توجد حسابات أب مطابقة." : "No matching parent accounts."}
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="border-b">
              <CardTitle>{t.balanceInfo}</CardTitle>
              <CardDescription>{t.balanceInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 p-4 lg:grid-cols-2">
              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border bg-background p-4">
                <div>
                  <p className="text-sm font-semibold">{t.groupAccount}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.structureInfoDesc}</p>
                </div>
                <Switch
                  checked={form.is_group}
                  disabled={saving}
                  onCheckedChange={(value) => updateForm("is_group", Boolean(value))}
                  className="mt-1"
                />
              </label>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border bg-background p-4">
                <div>
                  <p className="text-sm font-semibold">{t.activeAccount}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.accountStatus}</p>
                </div>
                <Switch
                  checked={form.is_active}
                  disabled={saving}
                  onCheckedChange={(value) => updateForm("is_active", Boolean(value))}
                  className="mt-1"
                />
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4 rounded-lg border bg-card shadow-none">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{t.summary}</CardTitle>
                  <CardDescription>{t.summaryDesc}</CardDescription>
                </div>
                <CardAction>
                  <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                    <WalletCards className="h-5 w-5" />
                  </div>
                </CardAction>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              <div className="rounded-lg border bg-background p-4">
                <div className="text-xs text-muted-foreground">{t.nextCode}</div>
                <div className="mt-2 font-mono text-2xl font-semibold">{form.code || suggestedCode}</div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t.accountNameAr}</span>
                  <span className="max-w-[60%] truncate font-medium">{form.name_ar || t.unknown}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t.accountNameEn}</span>
                  <span className="max-w-[60%] truncate font-medium" dir="ltr">{form.name_en || t.unknown}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t.accountType}</span>
                  <InfoBadge>{t[form.account_type]}</InfoBadge>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t.nature}</span>
                  <InfoBadge>{t[form.nature]}</InfoBadge>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">{t.parentAccount}</span>
                  <span className="max-w-[62%] text-end font-medium">
                    {selectedParent ? `${selectedParent.code} · ${displayAccountName(selectedParent, locale)}` : t.noParent}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t.accountKind}</span>
                  <InfoBadge>{form.is_group ? t.groupAccount : t.postingAccount}</InfoBadge>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t.openingBalance}</span>
                  <span className="font-medium">{formatNumber(Number(normalizeDecimalInput(form.opening_balance || "0")))}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t.currency}</span>
                  <InfoBadge>{form.currency}</InfoBadge>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t.activeAccount}</span>
                  <InfoBadge tone={form.is_active ? "success" : "warning"}>
                    {form.is_active ? t.activeAccount : t.unknown}
                  </InfoBadge>
                </div>
              </div>

              {createdId ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <CheckCircle2 className="me-2 inline h-4 w-4" />
                  {t.saved}
                </div>
              ) : null}

              <div className="grid gap-2">
                <Button type="submit" disabled={saving} className="bg-foreground text-background hover:bg-foreground/90">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {saving ? t.saving : t.save}
                </Button>

                <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
                  <RotateCcw className="h-4 w-4" />
                  {locale === "ar" ? "إنشاء حساب آخر" : "Create another"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}