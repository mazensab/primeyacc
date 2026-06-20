"use client";

/* ============================================================
   📂 app/system/treasury/accounts/create/page.tsx
   🧠 Primey Care | Create Treasury Account Page

   ✅ المسار:
      app/system/treasury/accounts/create/page.tsx

   ✅ العمل:
      صفحة إنشاء حساب خزينة داخل النظام.
      تدعم إنشاء حساب صندوق أو بنك أو محفظة مع الرصيد الافتتاحي والحالة والبيانات البنكية.

   ✅ الإصدار:
      Phase 17 UX Refinement + Treasury Account Create Build

   ✅ يعتمد على:
      - /api/treasury/accounts/create/
      - /api/treasury/accounts/
      - primey-locale
      - AuthProvider
      - sonner
      - /currency/sar.svg

   ✅ متوافق مع:
      - Treasury overview page
      - Treasury accounts page
      - Treasury cashboxes / banks pages
      - Centers / Customers approved UX standard

   ✅ الوظائف:
      - إنشاء حساب خزينة.
      - دعم نوع الحساب: صندوق / بنك / محفظة / أخرى.
      - الرصيد الافتتاحي.
      - الحالة التشغيلية.
      - بيانات البنك عند اختيار حساب بنكي.
      - حماية مغادرة الصفحة عند وجود تغييرات غير محفوظة.
      - مسح النموذج بتأكيد.
      - Error State مستقل.
      - صلاحيات آمنة بدون كسر system_admin/superuser.
      - أرقام إنجليزية دائمًا.
      - رمز SAR من /currency/sar.svg بعد الرقم.
      - استخدام sonner للتنبيهات.

   ------------------------------------------------------------
   تحسينات هذا الإصدار:
      - بناء الصفحة من الصفر لأن الملف المرفق كان فارغًا تقريبًا.
      - الالتزام بالقاعدة: w-full space-y-4 بدون main/min-h-screen/max-w.
      - عدم عرض أي مسارات أو عبارات تقنية داخل واجهة المستخدم.
      - إخفاء الأزرار غير المصرح بها.
      - إزالة localhost و API_BASE_URL الثابت.
============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Save,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
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

/* ============================================================
   Types
============================================================ */

type AppLocale = "ar" | "en";
type Dict = Record<string, unknown>;

type AccountType = "CASHBOX" | "BANK" | "WALLET" | "OTHER";
type AccountStatus = "ACTIVE" | "INACTIVE" | "CLOSED";

type FormState = {
  name: string;
  code: string;
  accountType: AccountType;
  status: AccountStatus;
  openingBalance: string;
  currentBalance: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  isDefault: boolean;
  notes: string;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  data?: T;
  id?: string | number;
};

const SAR_ICON_PATH = "/currency/sar.svg";

function makeDefaultForm(): FormState {
  return {
    name: "",
    code: "",
    accountType: "CASHBOX",
    status: "ACTIVE",
    openingBalance: "0",
    currentBalance: "0",
    bankName: "",
    accountNumber: "",
    iban: "",
    isDefault: false,
    notes: "",
  };
}

/* ============================================================
   Locale / API
============================================================ */

function readLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const saved =
      window.localStorage.getItem("primey-locale") ||
      window.localStorage.getItem("locale") ||
      window.localStorage.getItem("lang");

    if (saved === "en") return "en";
    if (saved === "ar") return "ar";

    return document.documentElement.lang === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function applyDocumentLocale(locale: AppLocale) {
  try {
    if (typeof document === "undefined") return;

    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.body.dir = locale === "ar" ? "rtl" : "ltr";
  } catch (error) {
    console.error("Apply locale error:", error);
  }
}

function apiUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  if (!base) return path;

  return `${base.replace(/\/$/, "")}${path}`;
}

function getCookie(name: string) {
  try {
    if (typeof document === "undefined") return "";

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() || "";
    }

    return "";
  } catch {
    return "";
  }
}

/* ============================================================
   Auth / Permissions
============================================================ */

function asDict(value: unknown): Dict {
  return value && typeof value === "object" ? (value as Dict) : {};
}

function getNested(source: Dict, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (value && typeof value === "object") return value as Dict;
  }

  return {};
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .flatMap((value) => {
          if (!value) return [];

          if (typeof value === "string") return [value];

          if (Array.isArray(value)) {
            return value.flatMap((item) => {
              if (typeof item === "string") return [item];

              if (item && typeof item === "object") {
                const obj = item as Dict;

                return [
                  obj.code,
                  obj.codename,
                  obj.permission,
                  obj.name,
                  obj.role,
                ].filter(Boolean) as string[];
              }

              return [];
            });
          }

          if (value && typeof value === "object") {
            const obj = value as Dict;

            return [
              obj.code,
              obj.codename,
              obj.permission,
              obj.name,
              obj.role,
            ].filter(Boolean) as string[];
          }

          return [];
        })
        .map((item) => String(item).trim())
        .filter(Boolean),
    ),
  );
}

function getAuthUser(authValue: unknown) {
  const auth = asDict(authValue);

  return getNested(auth, [
    "user",
    "currentUser",
    "profile",
    "account",
    "session",
    "data",
  ]);
}

function getAuthRoles(authValue: unknown): string[] {
  const auth = asDict(authValue);
  const user = getAuthUser(authValue);

  return uniqueStrings([
    auth.role,
    auth.roles,
    auth.user_role,
    auth.userType,
    auth.user_type,
    auth.workspace,
    auth.workspaces,
    auth.type,
    user.role,
    user.roles,
    user.user_role,
    user.userType,
    user.user_type,
    user.workspace,
    user.workspaces,
    user.type,
  ]).map((item) => item.toLowerCase());
}

function getAuthPermissionCodes(authValue: unknown): string[] {
  const auth = asDict(authValue);
  const user = getAuthUser(authValue);

  const authPermissions = asDict(auth.permissions);
  const userPermissions = asDict(user.permissions);
  const authProfilePermissions = asDict(auth.profile_permissions);
  const userProfilePermissions = asDict(user.profile_permissions);

  return uniqueStrings([
    auth.permission_codes,
    auth.permissions,
    auth.codes,
    auth.profile_permissions,
    authPermissions.codes,
    authProfilePermissions.codes,
    user.permission_codes,
    user.permissions,
    user.codes,
    user.profile_permissions,
    userPermissions.codes,
    userProfilePermissions.codes,
  ]);
}

function isAuthResolving(authValue: unknown) {
  const auth = asDict(authValue);

  return Boolean(
    auth.isLoading ||
      auth.loading ||
      auth.isInitializing ||
      auth.initializing ||
      auth.pending,
  );
}

function isSystemAdmin(authValue: unknown) {
  const auth = asDict(authValue);
  const user = getAuthUser(authValue);
  const roles = getAuthRoles(authValue);

  return (
    Boolean(auth.is_superuser) ||
    Boolean(auth.isSuperuser) ||
    Boolean(auth.is_system_admin) ||
    Boolean(auth.isSystemAdmin) ||
    Boolean(user.is_superuser) ||
    Boolean(user.isSuperuser) ||
    Boolean(user.is_system_admin) ||
    Boolean(user.isSystemAdmin) ||
    roles.some((role) =>
      [
        "system_admin",
        "superuser",
        "super_admin",
        "superadmin",
        "admin",
        "administrator",
      ].includes(role),
    )
  );
}

function hasSafePermission(
  authValue: unknown,
  codes: string[],
  mode: "view" | "action",
) {
  if (isSystemAdmin(authValue)) return true;

  const permissions = getAuthPermissionCodes(authValue);

  if (permissions.length > 0) {
    return codes.some((code) => permissions.includes(code));
  }

  const roles = getAuthRoles(authValue);

  if (roles.length > 0) {
    if (mode === "view") {
      return roles.some((role) =>
        [
          "system_admin",
          "superuser",
          "super_admin",
          "accountant",
          "support",
          "viewer",
        ].includes(role),
      );
    }

    return roles.some((role) =>
      ["system_admin", "superuser", "super_admin", "accountant"].includes(role),
    );
  }

  return true;
}

/* ============================================================
   Dictionary
============================================================ */

function dictionary(locale: AppLocale) {
  const isArabic = locale === "ar";

  return {
    title: isArabic ? "إنشاء حساب خزينة" : "Create Treasury Account",
    subtitle: isArabic
      ? "أضف حساب خزينة جديد للصندوق أو البنك أو المحفظة مع الرصيد الافتتاحي والحالة."
      : "Add a new treasury account for cashbox, bank, or wallet with opening balance and status.",

    back: isArabic ? "حسابات الخزينة" : "Treasury Accounts",
    treasury: isArabic ? "الخزينة" : "Treasury",
    cashboxes: isArabic ? "الصناديق" : "Cashboxes",
    banks: isArabic ? "البنوك" : "Banks",
    save: isArabic ? "حفظ الحساب" : "Save Account",
    saving: isArabic ? "جاري الحفظ..." : "Saving...",
    clear: isArabic ? "مسح النموذج" : "Clear Form",

    mainInfo: isArabic ? "بيانات الحساب" : "Account Details",
    mainInfoDesc: isArabic
      ? "المعلومات الأساسية لحساب الخزينة."
      : "Basic treasury account information.",

    financialInfo: isArabic ? "الرصيد والحالة" : "Balance and Status",
    financialInfoDesc: isArabic
      ? "حدد الرصيد الافتتاحي والحالة التشغيلية."
      : "Set opening balance and operational status.",

    bankInfo: isArabic ? "بيانات البنك" : "Bank Information",
    bankInfoDesc: isArabic
      ? "تظهر هذه البيانات عند اختيار حساب بنكي."
      : "These fields are used when the account type is bank.",

    summaryTitle: isArabic ? "ملخص الحساب" : "Account Summary",
    summaryDesc: isArabic
      ? "راجع بيانات الحساب قبل الحفظ."
      : "Review account data before saving.",

    name: isArabic ? "اسم الحساب" : "Account Name",
    code: isArabic ? "كود الحساب" : "Account Code",
    codeHint: isArabic
      ? "اتركه فارغًا إذا كان النظام يولده تلقائيًا."
      : "Leave empty if the system generates it automatically.",
    accountType: isArabic ? "نوع الحساب" : "Account Type",
    status: isArabic ? "الحالة" : "Status",
    openingBalance: isArabic ? "الرصيد الافتتاحي" : "Opening Balance",
    currentBalance: isArabic ? "الرصيد الحالي" : "Current Balance",
    bankName: isArabic ? "اسم البنك" : "Bank Name",
    accountNumber: isArabic ? "رقم الحساب البنكي" : "Bank Account Number",
    iban: isArabic ? "IBAN" : "IBAN",
    isDefault: isArabic ? "تعيين كحساب افتراضي" : "Set as Default Account",
    notes: isArabic ? "ملاحظات" : "Notes",

    cashbox: isArabic ? "صندوق" : "Cashbox",
    bank: isArabic ? "بنك" : "Bank",
    wallet: isArabic ? "محفظة" : "Wallet",
    other: isArabic ? "أخرى" : "Other",

    active: isArabic ? "نشط" : "Active",
    inactive: isArabic ? "غير نشط" : "Inactive",
    closed: isArabic ? "مغلق" : "Closed",

    selectedType: isArabic ? "النوع المحدد" : "Selected Type",
    selectedStatus: isArabic ? "الحالة المحددة" : "Selected Status",
    defaultAccount: isArabic ? "حساب افتراضي" : "Default Account",
    regularAccount: isArabic ? "حساب عادي" : "Regular Account",
    notSet: isArabic ? "غير محدد" : "Not set",

    accessDeniedTitle: isArabic
      ? "غير مصرح بإنشاء حساب خزينة"
      : "Access denied",
    accessDeniedText: isArabic
      ? "لا تملك صلاحية إنشاء حسابات الخزينة. تواصل مع مسؤول النظام إذا كنت تحتاج الوصول."
      : "You do not have permission to create treasury accounts. Contact your system administrator if you need access.",

    validationTitle: isArabic ? "راجع بيانات الحساب" : "Review account data",
    requiredName: isArabic ? "اسم الحساب مطلوب." : "Account name is required.",
    invalidOpeningBalance: isArabic
      ? "الرصيد الافتتاحي يجب أن يكون رقمًا صحيحًا."
      : "Opening balance must be a valid number.",
    invalidCurrentBalance: isArabic
      ? "الرصيد الحالي يجب أن يكون رقمًا صحيحًا."
      : "Current balance must be a valid number.",
    requiredBankName: isArabic
      ? "اسم البنك مطلوب عند اختيار نوع بنك."
      : "Bank name is required when account type is bank.",

    saveSuccess: isArabic
      ? "تم إنشاء حساب الخزينة بنجاح."
      : "Treasury account created successfully.",
    saveError: isArabic
      ? "تعذر حفظ حساب الخزينة."
      : "Unable to save treasury account.",

    confirmClear: isArabic
      ? "هل تريد مسح النموذج الحالي؟"
      : "Clear the current form?",
    unsavedChanges: isArabic
      ? "لديك تغييرات غير محفوظة. هل تريد المغادرة؟"
      : "You have unsaved changes. Do you want to leave?",
  };
}

/* ============================================================
   Helpers
============================================================ */

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidNumberText(value: string) {
  if (!value.trim()) return true;

  return Number.isFinite(Number(value));
}

function formatNumber(value: unknown): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatMoney(value: unknown): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function normalizeMoneyInput(value: string) {
  const cleaned = value.replace(/[^\d.-]/g, "");

  const parts = cleaned.split(".");
  const integerPart = parts[0] || "";
  const decimalPart = parts.slice(1).join("");

  if (parts.length > 1) {
    return `${integerPart}.${decimalPart.slice(0, 2)}`;
  }

  return integerPart;
}

function accountTypeLabel(type: AccountType, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<AccountType, string> = {
    CASHBOX: t.cashbox,
    BANK: t.bank,
    WALLET: t.wallet,
    OTHER: t.other,
  };

  return labels[type];
}

function statusLabel(status: AccountStatus, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<AccountStatus, string> = {
    ACTIVE: t.active,
    INACTIVE: t.inactive,
    CLOSED: t.closed,
  };

  return labels[status];
}

function accountTypeBadge(type: AccountType, locale: AppLocale) {
  const label = accountTypeLabel(type, locale);

  if (type === "CASHBOX") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (type === "BANK") {
    return (
      <Badge className="rounded-full border-sky-200 bg-sky-50 px-3 py-1 text-sky-700 hover:bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
        {label}
      </Badge>
    );
  }

  if (type === "WALLET") {
    return (
      <Badge className="rounded-full border-violet-200 bg-violet-50 px-3 py-1 text-violet-700 hover:bg-violet-50 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300">
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-full px-3 py-1">
      {label}
    </Badge>
  );
}

function statusBadge(status: AccountStatus, locale: AppLocale) {
  const label = statusLabel(status, locale);

  if (status === "ACTIVE") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (status === "INACTIVE") {
    return (
      <Badge className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="rounded-full px-3 py-1">
      {label}
    </Badge>
  );
}

function SarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <Image
      src={SAR_ICON_PATH}
      alt=""
      width={16}
      height={16}
      className={className}
    />
  );
}

function MoneyText({ value }: { value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span>{formatMoney(value)}</span>
      <SarIcon className="h-3.5 w-3.5" />
    </span>
  );
}

/* ============================================================
   Page
============================================================ */

export default function CreateTreasuryAccountPage() {
  const auth = useAuth() as unknown;

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [form, setForm] = useState<FormState>(() => makeDefaultForm());
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";
  const authResolving = isAuthResolving(auth);

  const canCreate = hasSafePermission(
    auth,
    ["treasury.create", "treasury.accounts.create", "treasury.manage"],
    "action",
  );

  const canSubmit = canCreate && !isSaving;

  const isBankAccount = form.accountType === "BANK";

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setIsDirty(true);
  }

  function updateMoneyField(key: "openingBalance" | "currentBalance", value: string) {
    updateForm(key, normalizeMoneyInput(value));
  }

  function handleAccountTypeChange(value: AccountType) {
    setForm((current) => ({
      ...current,
      accountType: value,
      bankName: value === "BANK" ? current.bankName : "",
      accountNumber: value === "BANK" ? current.accountNumber : "",
      iban: value === "BANK" ? current.iban : "",
    }));

    setIsDirty(true);
  }

  function clearForm() {
    if (isDirty && !window.confirm(t.confirmClear)) return;

    setForm(makeDefaultForm());
    setSubmitError("");
    setIsDirty(false);
  }

  function validateForm() {
    const errors: string[] = [];

    if (!form.name.trim()) errors.push(t.requiredName);
    if (!isValidNumberText(form.openingBalance)) errors.push(t.invalidOpeningBalance);
    if (!isValidNumberText(form.currentBalance)) errors.push(t.invalidCurrentBalance);
    if (form.accountType === "BANK" && !form.bankName.trim()) {
      errors.push(t.requiredBankName);
    }

    return Array.from(new Set(errors));
  }

  function buildPayload() {
    const openingBalance = toNumber(form.openingBalance);
    const currentBalance = form.currentBalance.trim()
      ? toNumber(form.currentBalance)
      : openingBalance;

    return {
      name: form.name.trim(),
      title: form.name.trim(),
      code: form.code.trim() || undefined,
      account_code: form.code.trim() || undefined,
      account_type: form.accountType,
      type: form.accountType,
      status: form.status,
      state: form.status,
      opening_balance: openingBalance,
      initial_balance: openingBalance,
      current_balance: currentBalance,
      balance: currentBalance,
      currency: "SAR",
      bank_name: isBankAccount ? form.bankName.trim() : "",
      account_number: isBankAccount ? form.accountNumber.trim() : "",
      bank_account_number: isBankAccount ? form.accountNumber.trim() : "",
      iban: isBankAccount ? form.iban.trim() : "",
      is_default: form.isDefault,
      default: form.isDefault,
      notes: form.notes.trim(),
      description: form.notes.trim(),
    };
  }

  const submitForm = useCallback(async () => {
    if (!canCreate) return;

    const errors = validateForm();

    if (errors.length > 0) {
      setSubmitError(errors.join("\n"));
      toast.error(t.validationTitle);
      return;
    }

    try {
      setIsSaving(true);
      setSubmitError("");

      const csrfToken = getCookie("csrftoken");
      const payload = buildPayload();

      const endpoints = ["/api/treasury/accounts/create/", "/api/treasury/accounts/"];

      let saved = false;
      let lastMessage = "";

      for (const endpoint of endpoints) {
        const response = await fetch(apiUrl(endpoint), {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
          body: JSON.stringify(payload),
        });

        const responsePayload = (await response.json().catch(() => null)) as
          | ApiEnvelope<unknown>
          | null;

        if ([404, 405].includes(response.status)) {
          lastMessage =
            responsePayload?.message ||
            responsePayload?.detail ||
            responsePayload?.error ||
            `HTTP ${response.status}`;
          continue;
        }

        if (response.status === 400) {
          lastMessage =
            responsePayload?.message ||
            responsePayload?.detail ||
            responsePayload?.error ||
            t.saveError;
          break;
        }

        if (
          !response.ok ||
          responsePayload?.ok === false ||
          responsePayload?.success === false
        ) {
          throw new Error(
            responsePayload?.message ||
              responsePayload?.detail ||
              responsePayload?.error ||
              `HTTP ${response.status}`,
          );
        }

        saved = true;
        break;
      }

      if (!saved) {
        throw new Error(lastMessage || t.saveError);
      }

      toast.success(t.saveSuccess);
      setForm(makeDefaultForm());
      setIsDirty(false);
      setSubmitError("");
    } catch (error) {
      console.error("Create treasury account submit error:", error);
      const message = error instanceof Error ? error.message : t.saveError;

      setSubmitError(message || t.saveError);
      toast.error(t.saveError);
    } finally {
      setIsSaving(false);
    }
  }, [canCreate, form, isBankAccount, t]);

  useEffect(() => {
    const syncLocale = () => {
      const nextLocale = readLocale();

      applyDocumentLocale(nextLocale);
      setLocale(nextLocale);
    };

    const syncAfterPaint = () => {
      syncLocale();
      window.setTimeout(syncLocale, 0);
    };

    syncAfterPaint();

    window.addEventListener("primey-locale-changed", syncAfterPaint);
    window.addEventListener("storage", syncAfterPaint);

    return () => {
      window.removeEventListener("primey-locale-changed", syncAfterPaint);
      window.removeEventListener("storage", syncAfterPaint);
    };
  }, []);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty || isSaving) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);

    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [isDirty, isSaving]);

  if (!authResolving && !canCreate) {
    return (
      <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
        <Card className="rounded-2xl border border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-start gap-3 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <XCircle className="h-5 w-5" />
            </div>

            <div>
              <p className="font-semibold text-destructive">
                {t.accessDeniedTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.accessDeniedText}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {t.title}
          </h1>

          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/system/treasury/accounts"
            onClick={(event) => {
              if (isDirty && !window.confirm(t.unsavedChanges)) {
                event.preventDefault();
              }
            }}
          >
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t.back}</span>
            </Button>
          </Link>

          <Link
            href="/system/treasury"
            onClick={(event) => {
              if (isDirty && !window.confirm(t.unsavedChanges)) {
                event.preventDefault();
              }
            }}
          >
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl sm:w-auto"
            >
              <Wallet className="h-4 w-4" />
              <span>{t.treasury}</span>
            </Button>
          </Link>

          <Link
            href="/system/treasury/cashboxes"
            onClick={(event) => {
              if (isDirty && !window.confirm(t.unsavedChanges)) {
                event.preventDefault();
              }
            }}
          >
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl sm:w-auto"
            >
              <Banknote className="h-4 w-4" />
              <span>{t.cashboxes}</span>
            </Button>
          </Link>

          <Link
            href="/system/treasury/banks"
            onClick={(event) => {
              if (isDirty && !window.confirm(t.unsavedChanges)) {
                event.preventDefault();
              }
            }}
          >
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl sm:w-auto"
            >
              <Building2 className="h-4 w-4" />
              <span>{t.banks}</span>
            </Button>
          </Link>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={clearForm}
            disabled={isSaving}
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t.clear}</span>
          </Button>

          <Button
            type="button"
            className="h-10 rounded-xl"
            onClick={submitForm}
            disabled={!canSubmit}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isSaving ? t.saving : t.save}</span>
          </Button>
        </div>
      </div>

      {submitError ? (
        <Card className="rounded-2xl border border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-start gap-3 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <XCircle className="h-5 w-5" />
            </div>

            <div>
              <p className="font-semibold text-destructive">
                {t.validationTitle}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {submitError}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <FileText className="h-4 w-4" />
                {t.mainInfo}
              </CardTitle>
              <CardDescription>{t.mainInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.name}</label>
                <Input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  disabled={isSaving}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.code}</label>
                <Input
                  value={form.code}
                  onChange={(event) => updateForm("code", event.target.value)}
                  disabled={isSaving}
                  dir="ltr"
                  className="h-11 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">{t.codeHint}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.accountType}</label>
                <select
                  value={form.accountType}
                  onChange={(event) =>
                    handleAccountTypeChange(event.target.value as AccountType)
                  }
                  disabled={isSaving}
                  className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="CASHBOX">{t.cashbox}</option>
                  <option value="BANK">{t.bank}</option>
                  <option value="WALLET">{t.wallet}</option>
                  <option value="OTHER">{t.other}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.status}</label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateForm("status", event.target.value as AccountStatus)
                  }
                  disabled={isSaving}
                  className="h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="ACTIVE">{t.active}</option>
                  <option value="INACTIVE">{t.inactive}</option>
                  <option value="CLOSED">{t.closed}</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t.notes}</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  disabled={isSaving}
                  rows={3}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <CreditCard className="h-4 w-4" />
                {t.financialInfo}
              </CardTitle>
              <CardDescription>{t.financialInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.openingBalance}</label>
                <div className="relative">
                  <Input
                    value={form.openingBalance}
                    onChange={(event) =>
                      updateMoneyField("openingBalance", event.target.value)
                    }
                    disabled={isSaving}
                    inputMode="decimal"
                    dir="ltr"
                    className="h-11 rounded-xl pe-10"
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 end-3">
                    <SarIcon className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.currentBalance}</label>
                <div className="relative">
                  <Input
                    value={form.currentBalance}
                    onChange={(event) =>
                      updateMoneyField("currentBalance", event.target.value)
                    }
                    disabled={isSaving}
                    inputMode="decimal"
                    dir="ltr"
                    className="h-11 rounded-xl pe-10"
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 end-3">
                    <SarIcon className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-background px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(event) =>
                      updateForm("isDefault", event.target.checked)
                    }
                    disabled={isSaving}
                    className="h-4 w-4 rounded border-muted-foreground"
                  />
                  <span>{t.isDefault}</span>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Building2 className="h-4 w-4" />
                {t.bankInfo}
              </CardTitle>
              <CardDescription>{t.bankInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.bankName}</label>
                <Input
                  value={form.bankName}
                  onChange={(event) => updateForm("bankName", event.target.value)}
                  disabled={isSaving || !isBankAccount}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.accountNumber}</label>
                <Input
                  value={form.accountNumber}
                  onChange={(event) =>
                    updateForm("accountNumber", event.target.value)
                  }
                  disabled={isSaving || !isBankAccount}
                  dir="ltr"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t.iban}</label>
                <Input
                  value={form.iban}
                  onChange={(event) =>
                    updateForm("iban", event.target.value.toUpperCase())
                  }
                  disabled={isSaving || !isBankAccount}
                  dir="ltr"
                  className="h-11 rounded-xl"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <CheckCircle2 className="h-4 w-4" />
                {t.summaryTitle}
              </CardTitle>
              <CardDescription>{t.summaryDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.name}</p>
                <p className="mt-2 font-semibold">{form.name || t.notSet}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">
                    {t.selectedType}
                  </p>
                  <div className="mt-2">
                    {accountTypeBadge(form.accountType, locale)}
                  </div>
                </div>

                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">
                    {t.selectedStatus}
                  </p>
                  <div className="mt-2">{statusBadge(form.status, locale)}</div>
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.openingBalance}
                </p>
                <div className="mt-2 font-semibold">
                  <MoneyText value={form.openingBalance} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.currentBalance}
                </p>
                <div className="mt-2 font-semibold">
                  <MoneyText value={form.currentBalance} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.isDefault}</p>
                <p className="mt-2 font-semibold">
                  {form.isDefault ? t.defaultAccount : t.regularAccount}
                </p>
              </div>

              {isBankAccount ? (
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{t.bankInfo}</p>
                  <p className="mt-2 font-semibold">
                    {form.bankName || t.notSet}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {form.accountNumber || "-"}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground" dir="ltr">
                    {form.iban || "-"}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-2 pt-2">
                <Button
                  type="button"
                  className="h-11 rounded-2xl"
                  onClick={submitForm}
                  disabled={!canSubmit}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? t.saving : t.save}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-2xl"
                  onClick={clearForm}
                  disabled={isSaving}
                >
                  <RefreshCcw className="h-4 w-4" />
                  {t.clear}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4" />
                {t.financialInfo}
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                {form.status === "ACTIVE" ? t.active : statusLabel(form.status, locale)}
              </p>

              <div className="text-2xl font-bold">
                {formatNumber(toNumber(form.currentBalance))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}