"use client";

/* ============================================================
   📂 app/system/accounting/journals/create/page.tsx
   🧾 Primey Care — Create Journal Entry
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API only:
      GET  /api/accounting/accounts/
      GET  /api/accounting/cost-centers/
      GET  /api/accounting/periods/
      POST /api/accounting/journals/create/
      POST /api/accounting/journals/ fallback
   ✅ Manual journal entry
   ✅ Balanced debit / credit validation
   ✅ Account + cost center selectors
   ✅ Unsaved changes protection
   ✅ Skeleton loading
   ✅ Error state
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
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
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type Account = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  name_en: string;
  account_type: string;
  is_group: boolean;
  is_active: boolean;
};

type CostCenter = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
};

type AccountingPeriod = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
};

type JournalLine = {
  id: string;
  account_id: string;
  cost_center_id: string;
  description: string;
  debit: string;
  credit: string;
};

type JournalForm = {
  entry_date: string;
  period_id: string;
  reference: string;
  source_number: string;
  posting_source: string;
  description: string;
  notes: string;
  lines: JournalLine[];
};

type FieldErrors = Partial<Record<keyof JournalForm | "lines" | "general", string>>;

const translations = {
  ar: {
    title: "إنشاء قيد يومية",
    subtitle: "إضافة قيد محاسبي يدوي مع سطور مدين ودائن ومركز تكلفة ومرجع تشغيلي.",
    back: "قيود اليومية",
    save: "حفظ القيد",
    saving: "جاري الحفظ...",
    refresh: "تحديث البيانات",
    reset: "مسح النموذج",
    addLine: "إضافة سطر",
    removeLine: "حذف",

    basicInfo: "بيانات القيد",
    basicInfoDesc: "حدد تاريخ القيد والفترة والمرجع والوصف.",
    linesInfo: "سطور القيد",
    linesInfoDesc: "أضف الحسابات وقيم المدين والدائن. يجب أن يكون القيد متوازنًا.",
    summary: "ملخص القيد",
    summaryDesc: "مراجعة جاهزية القيد قبل الحفظ.",

    entryDate: "تاريخ القيد",
    period: "الفترة المحاسبية",
    noPeriod: "بدون فترة",
    reference: "المرجع",
    sourceNumber: "رقم المصدر",
    postingSource: "مصدر القيد",
    description: "الوصف",
    notes: "ملاحظات",
    descriptionPlaceholder: "مثال: قيد تسوية يدوي...",
    notesPlaceholder: "ملاحظات داخلية اختيارية...",

    account: "الحساب",
    costCenter: "مركز التكلفة",
    lineDescription: "بيان السطر",
    debit: "مدين",
    credit: "دائن",
    actions: "الإجراءات",
    searchAccount: "ابحث عن الحساب...",
    searchCostCenter: "ابحث عن مركز التكلفة...",

    totalDebit: "إجمالي المدين",
    totalCredit: "إجمالي الدائن",
    difference: "فرق التوازن",
    balanceStatus: "حالة التوازن",
    linesCount: "عدد السطور",
    ready: "جاهز للحفظ",
    notReady: "غير مكتمل",
    balanced: "متوازن",
    unbalanced: "غير متوازن",

    accountsLoaded: "الحسابات",
    costCentersLoaded: "مراكز التكلفة",
    periodsLoaded: "الفترات",
    today: "تاريخ اليوم",

    validDate: "تاريخ القيد محدد",
    validDescription: "وصف القيد مكتمل",
    validLines: "يوجد سطران صحيحان على الأقل",
    validBalance: "القيد متوازن",
    invalidDate: "تاريخ القيد مطلوب",
    invalidDescription: "وصف القيد مطلوب",
    invalidLines: "أضف سطرين صحيحين على الأقل",
    invalidBalance: "القيد غير متوازن",

    manual: "يدوي",
    required: "هذا الحقل مطلوب.",
    accountRequired: "اختر الحساب.",
    lineAmountRequired: "أدخل قيمة مدين أو دائن.",
    debitCreditConflict: "لا يمكن إدخال مدين ودائن في نفس السطر.",
    loadError: "تعذر تحميل البيانات المحاسبية.",
    saveError: "تعذر حفظ قيد اليومية.",
    saveSuccess: "تم إنشاء قيد اليومية بنجاح.",
    resetDone: "تم مسح النموذج.",
    confirmReset: "لديك تغييرات غير محفوظة. هل تريد مسح النموذج؟",
    leaveWarning: "لديك تغييرات غير محفوظة.",
    noAccounts: "لا توجد حسابات مطابقة.",
    noCostCenters: "لا توجد مراكز تكلفة مطابقة.",
    select: "اختيار",
    selected: "محدد",
    sar: "ر.س",
    unknown: "غير محدد",
  },
  en: {
    title: "Create Journal Entry",
    subtitle: "Add a manual accounting journal with debit, credit, cost center, and operational reference lines.",
    back: "Journal entries",
    save: "Save journal",
    saving: "Saving...",
    refresh: "Refresh data",
    reset: "Reset form",
    addLine: "Add line",
    removeLine: "Remove",

    basicInfo: "Journal information",
    basicInfoDesc: "Set the entry date, period, reference, and description.",
    linesInfo: "Journal lines",
    linesInfoDesc: "Add accounts and debit/credit values. The entry must be balanced.",
    summary: "Journal summary",
    summaryDesc: "Review readiness before saving.",

    entryDate: "Entry date",
    period: "Period",
    noPeriod: "No period",
    reference: "Reference",
    sourceNumber: "Source number",
    postingSource: "Posting source",
    description: "Description",
    notes: "Notes",
    descriptionPlaceholder: "Example: Manual adjustment journal...",
    notesPlaceholder: "Optional internal notes...",

    account: "Account",
    costCenter: "Cost center",
    lineDescription: "Line description",
    debit: "Debit",
    credit: "Credit",
    actions: "Actions",
    searchAccount: "Search account...",
    searchCostCenter: "Search cost center...",

    totalDebit: "Total debit",
    totalCredit: "Total credit",
    difference: "Balance difference",
    balanceStatus: "Balance status",
    linesCount: "Lines count",
    ready: "Ready to save",
    notReady: "Incomplete",
    balanced: "Balanced",
    unbalanced: "Unbalanced",

    accountsLoaded: "Accounts",
    costCentersLoaded: "Cost centers",
    periodsLoaded: "Periods",
    today: "Today",

    validDate: "Entry date selected",
    validDescription: "Description completed",
    validLines: "At least two valid lines",
    validBalance: "Journal is balanced",
    invalidDate: "Entry date is required",
    invalidDescription: "Description is required",
    invalidLines: "Add at least two valid lines",
    invalidBalance: "Journal is not balanced",

    manual: "Manual",
    required: "This field is required.",
    accountRequired: "Choose an account.",
    lineAmountRequired: "Enter debit or credit amount.",
    debitCreditConflict: "Debit and credit cannot be entered on the same line.",
    loadError: "Could not load accounting data.",
    saveError: "Could not save journal entry.",
    saveSuccess: "Journal entry created successfully.",
    resetDone: "Form has been reset.",
    confirmReset: "You have unsaved changes. Do you want to reset the form?",
    leaveWarning: "You have unsaved changes.",
    noAccounts: "No matching accounts.",
    noCostCenters: "No matching cost centers.",
    select: "Select",
    selected: "Selected",
    sar: "SAR",
    unknown: "Unknown",
  },
} as const;

const EMPTY_LINE = (): JournalLine => ({
  id: crypto.randomUUID(),
  account_id: "",
  cost_center_id: "",
  description: "",
  debit: "",
  credit: "",
});

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: JournalForm = {
  entry_date: today,
  period_id: "",
  reference: "",
  source_number: "",
  posting_source: "manual",
  description: "",
  notes: "",
  lines: [EMPTY_LINE(), EMPTY_LINE()],
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

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function pickRecord(...values: unknown[]): ApiRecord {
  for (const value of values) {
    if (isRecord(value)) return value;
  }

  return {};
}

function normalizeAccount(raw: unknown): Account | null {
  if (!isRecord(raw)) return null;

  const id = asString(raw.id || raw.pk || raw.account_id);

  if (!id) return null;

  return {
    id,
    code: asString(raw.code || raw.account_code || raw.number),
    name: asString(raw.name || raw.title || raw.name_ar || raw.name_en),
    name_ar: asString(raw.name_ar || raw.arabic_name || raw.name),
    name_en: asString(raw.name_en || raw.english_name || raw.name),
    account_type: asString(raw.account_type || raw.type || raw.category),
    is_group: asBoolean(raw.is_group ?? raw.group ?? raw.is_parent, false),
    is_active: asBoolean(raw.is_active ?? raw.active, true),
  };
}

function normalizeCostCenter(raw: unknown): CostCenter | null {
  if (!isRecord(raw)) return null;

  const id = asString(raw.id || raw.pk || raw.cost_center_id);

  if (!id) return null;

  return {
    id,
    code: asString(raw.code || raw.cost_center_code || raw.number),
    name: asString(raw.name || raw.title || raw.name_ar || raw.name_en),
    name_ar: asString(raw.name_ar || raw.arabic_name || raw.name),
    name_en: asString(raw.name_en || raw.english_name || raw.name),
    is_active: asBoolean(raw.is_active ?? raw.active, true),
  };
}

function normalizePeriod(raw: unknown): AccountingPeriod | null {
  if (!isRecord(raw)) return null;

  const id = asString(raw.id || raw.pk || raw.period_id);

  if (!id) return null;

  return {
    id,
    name: asString(raw.name || raw.title || raw.period_name || raw.code),
    start_date: asString(raw.start_date || raw.starts_at),
    end_date: asString(raw.end_date || raw.ends_at),
    status: asString(raw.status || raw.state),
  };
}

function extractArray(payload: unknown, key: string): unknown[] {
  if (Array.isArray(payload)) return payload;

  const root = pickRecord(payload);
  const data = root.data;

  if (Array.isArray(root.results)) return root.results;
  if (Array.isArray(root[key])) return root[key];
  if (Array.isArray(data)) return data;

  if (isRecord(data)) {
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data[key])) return data[key];
  }

  return [];
}

function normalizeAccounts(payload: unknown): Account[] {
  return extractArray(payload, "accounts")
    .map(normalizeAccount)
    .filter((account): account is Account => Boolean(account))
    .filter((account) => account.is_active && !account.is_group)
    .sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
}

function normalizeCostCenters(payload: unknown): CostCenter[] {
  return extractArray(payload, "cost_centers")
    .map(normalizeCostCenter)
    .filter((center): center is CostCenter => Boolean(center))
    .filter((center) => center.is_active)
    .sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
}

function normalizePeriods(payload: unknown): AccountingPeriod[] {
  return extractArray(payload, "periods")
    .map(normalizePeriod)
    .filter((period): period is AccountingPeriod => Boolean(period));
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

function displayAccountName(account: Account, locale: Locale): string {
  if (locale === "ar") return account.name_ar || account.name || account.name_en || account.code;
  return account.name_en || account.name || account.name_ar || account.code;
}

function displayCostCenterName(center: CostCenter, locale: Locale): string {
  if (locale === "ar") return center.name_ar || center.name || center.name_en || center.code;
  return center.name_en || center.name || center.name_ar || center.code;
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function normalizeDecimalInput(value: string): string {
  return value.replace(/[^\d.-]/g, "");
}

function parseAmount(value: string): number {
  const parsed = Number(normalizeDecimalInput(value || "0"));

  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateTotals(lines: JournalLine[]) {
  const totalDebit = lines.reduce((sum, line) => sum + parseAmount(line.debit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + parseAmount(line.credit), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const validLines = lines.filter((line) => line.account_id && (parseAmount(line.debit) > 0 || parseAmount(line.credit) > 0));

  return {
    totalDebit,
    totalCredit,
    difference,
    validLinesCount: validLines.length,
    isBalanced: difference < 0.01 && totalDebit > 0 && totalCredit > 0,
  };
}

function validateForm(form: JournalForm, locale: Locale): FieldErrors {
  const t = translations[locale];
  const errors: FieldErrors = {};

  if (!form.entry_date) errors.entry_date = t.required;
  if (!form.description.trim()) errors.description = t.required;

  const totals = calculateTotals(form.lines);

  if (totals.validLinesCount < 2) {
    errors.lines = t.invalidLines;
  }

  if (!totals.isBalanced) {
    errors.general = t.invalidBalance;
  }

  form.lines.forEach((line, index) => {
    const debit = parseAmount(line.debit);
    const credit = parseAmount(line.credit);

    if ((debit > 0 || credit > 0) && !line.account_id) {
      errors.lines = `${t.accountRequired} (${index + 1})`;
    }

    if (debit > 0 && credit > 0) {
      errors.lines = `${t.debitCreditConflict} (${index + 1})`;
    }
  });

  return errors;
}

function buildPayload(form: JournalForm) {
  return {
    entry_date: form.entry_date,
    period: form.period_id || null,
    period_id: form.period_id || null,
    reference: form.reference.trim(),
    source_number: form.source_number.trim(),
    posting_source: form.posting_source || "manual",
    description: form.description.trim(),
    notes: form.notes.trim(),
    lines: form.lines
      .map((line) => ({
        account: line.account_id || null,
        account_id: line.account_id || null,
        cost_center: line.cost_center_id || null,
        cost_center_id: line.cost_center_id || null,
        description: line.description.trim(),
        debit: parseAmount(line.debit),
        credit: parseAmount(line.credit),
      }))
      .filter((line) => line.account_id && (line.debit > 0 || line.credit > 0)),
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function MoneyValue({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span>{formatMoney(value)}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      variant="outline"
      className={
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }
    >
      {label}
    </Badge>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
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
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[760px] rounded-lg" />
        <Skeleton className="h-[520px] rounded-lg" />
      </div>
    </div>
  );
}

function SelectorPopover({
  title,
  searchPlaceholder,
  selectedLabel,
  children,
}: {
  title: string;
  searchPlaceholder: string;
  selectedLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background">
      <div className="border-b p-3">
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{selectedLabel}</div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export default function CreateJournalEntryPage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [costCenters, setCostCenters] = React.useState<CostCenter[]>([]);
  const [periods, setPeriods] = React.useState<AccountingPeriod[]>([]);
  const [form, setForm] = React.useState<JournalForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [accountSearch, setAccountSearch] = React.useState<Record<string, string>>({});
  const [costCenterSearch, setCostCenterSearch] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [pageError, setPageError] = React.useState("");
  const [isDirty, setIsDirty] = React.useState(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;
  const totals = React.useMemo(() => calculateTotals(form.lines), [form.lines]);

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

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const [accountsResponse, costCentersResponse, periodsResponse] = await Promise.all([
        fetch(apiUrl("/api/accounting/accounts/"), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
        fetch(apiUrl("/api/accounting/cost-centers/"), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
        fetch(apiUrl("/api/accounting/periods/"), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
      ]);

      const accountsPayload = await accountsResponse.json().catch(() => null);
      const costCentersPayload = await costCentersResponse.json().catch(() => null);
      const periodsPayload = await periodsResponse.json().catch(() => null);

      if (!accountsResponse.ok) throw new Error(extractApiError(accountsPayload, t.loadError));

      setAccounts(normalizeAccounts(accountsPayload));

      if (costCentersResponse.ok) {
        setCostCenters(normalizeCostCenters(costCentersPayload));
      } else {
        setCostCenters([]);
      }

      if (periodsResponse.ok) {
        setPeriods(normalizePeriods(periodsPayload));
      } else {
        setPeriods([]);
      }
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : t.loadError;

      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateForm = React.useCallback(
    <K extends keyof JournalForm>(key: K, value: JournalForm[K]) => {
      setForm((current) => ({
        ...current,
        [key]: value,
      }));

      setFieldErrors((current) => ({
        ...current,
        [key]: undefined,
        general: undefined,
      }));

      setIsDirty(true);
    },
    [],
  );

  const updateLine = React.useCallback(
    <K extends keyof JournalLine>(lineId: string, key: K, value: JournalLine[K]) => {
      setForm((current) => ({
        ...current,
        lines: current.lines.map((line) => {
          if (line.id !== lineId) return line;

          const next = {
            ...line,
            [key]: value,
          };

          if (key === "debit" && parseAmount(String(value)) > 0) {
            next.credit = "";
          }

          if (key === "credit" && parseAmount(String(value)) > 0) {
            next.debit = "";
          }

          return next;
        }),
      }));

      setFieldErrors((current) => ({
        ...current,
        lines: undefined,
        general: undefined,
      }));

      setIsDirty(true);
    },
    [],
  );

  const addLine = React.useCallback(() => {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, EMPTY_LINE()],
    }));

    setIsDirty(true);
  }, []);

  const removeLine = React.useCallback(
    (lineId: string) => {
      setForm((current) => {
        if (current.lines.length <= 2) return current;

        return {
          ...current,
          lines: current.lines.filter((line) => line.id !== lineId),
        };
      });

      setIsDirty(true);
    },
    [],
  );

  const handleReset = React.useCallback(() => {
    if (isDirty && !window.confirm(t.confirmReset)) return;

    setForm({
      ...EMPTY_FORM,
      entry_date: new Date().toISOString().slice(0, 10),
      lines: [EMPTY_LINE(), EMPTY_LINE()],
    });
    setFieldErrors({});
    setAccountSearch({});
    setCostCenterSearch({});
    setPageError("");
    setIsDirty(false);
    toast.success(t.resetDone);
  }, [isDirty, t.confirmReset, t.resetDone]);

  const submitToEndpoint = React.useCallback(async (endpoint: string, payload: ApiRecord) => {
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

    const responsePayload = await response.json().catch(() => null);

    return {
      ok: response.ok,
      status: response.status,
      payload: responsePayload,
    };
  }, []);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const errors = validateForm(form, locale);

      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        toast.error(errors.general || errors.lines || t.saveError);
        return;
      }

      setSaving(true);
      setPageError("");
      setFieldErrors({});

      const payload = buildPayload(form);

      try {
        let result = await submitToEndpoint("/api/accounting/journals/create/", payload);

        if (!result.ok && [404, 405].includes(result.status)) {
          result = await submitToEndpoint("/api/accounting/journals/", payload);
        }

        if (!result.ok) {
          setFieldErrors(parseFieldErrors(result.payload));
          throw new Error(extractApiError(result.payload, t.saveError));
        }

        const responseRecord = pickRecord(result.payload);
        const data = pickRecord(responseRecord.data, responseRecord.journal, responseRecord.result, result.payload);
        const id = asString(data.id || data.pk || responseRecord.id);

        setIsDirty(false);
        toast.success(t.saveSuccess);

        if (id) {
          router.push(`/system/accounting/journals/${encodeURIComponent(id)}`);
        } else {
          router.push("/system/accounting/journals");
        }
      } catch (error) {
        const message = error instanceof Error && error.message ? error.message : t.saveError;

        setPageError(message);
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    [form, locale, router, submitToEndpoint, t.saveError, t.saveSuccess],
  );

  const handleBack = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isDirty || saving) return;

      const accepted = window.confirm(t.leaveWarning);

      if (!accepted) event.preventDefault();
    },
    [isDirty, saving, t.leaveWarning],
  );

  const findAccount = React.useCallback(
    (id: string) => accounts.find((account) => account.id === id) || null,
    [accounts],
  );

  const findCostCenter = React.useCallback(
    (id: string) => costCenters.find((center) => center.id === id) || null,
    [costCenters],
  );

  const filteredAccounts = React.useCallback(
    (lineId: string) => {
      const query = (accountSearch[lineId] || "").trim().toLowerCase();

      return accounts.filter((account) => {
        if (!query) return true;

        return [
          account.code,
          account.name,
          account.name_ar,
          account.name_en,
          account.account_type,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
    },
    [accountSearch, accounts],
  );

  const filteredCostCenters = React.useCallback(
    (lineId: string) => {
      const query = (costCenterSearch[lineId] || "").trim().toLowerCase();

      return costCenters.filter((center) => {
        if (!query) return true;

        return [center.code, center.name, center.name_ar, center.name_en]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
    },
    [costCenterSearch, costCenters],
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
            <Link href="/system/accounting/journals" className="hover:text-foreground">
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
            <Link href="/system/accounting/journals" onClick={handleBack}>
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button type="button" variant="outline" onClick={() => void loadData()} disabled={saving}>
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

      {fieldErrors.general || fieldErrors.lines ? (
        <Card className="border-red-200 bg-red-50/60 shadow-none">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-red-100 p-2 text-red-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-red-900">{t.notReady}</div>
              <p className="mt-1 text-sm text-red-700">{fieldErrors.general || fieldErrors.lines}</p>
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
              <CardTitle>{t.basicInfo}</CardTitle>
              <CardDescription>{t.basicInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 p-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.entryDate}</label>
                <Input
                  type="date"
                  value={form.entry_date}
                  onChange={(event) => updateForm("entry_date", event.target.value)}
                  disabled={saving}
                  dir="ltr"
                />
                <FieldError message={fieldErrors.entry_date} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.period}</label>
                <select
                  value={form.period_id}
                  onChange={(event) => updateForm("period_id", event.target.value)}
                  disabled={saving}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">{t.noPeriod}</option>
                  {periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.reference}</label>
                <Input
                  value={form.reference}
                  onChange={(event) => updateForm("reference", event.target.value)}
                  disabled={saving}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.sourceNumber}</label>
                <Input
                  value={form.source_number}
                  onChange={(event) => updateForm("source_number", event.target.value)}
                  disabled={saving}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.postingSource}</label>
                <Input
                  value={form.posting_source}
                  onChange={(event) => updateForm("posting_source", event.target.value)}
                  disabled={saving}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">{t.description}</label>
                <Textarea
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                  placeholder={t.descriptionPlaceholder}
                  disabled={saving}
                  rows={3}
                />
                <FieldError message={fieldErrors.description} />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">{t.notes}</label>
                <Textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  placeholder={t.notesPlaceholder}
                  disabled={saving}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>{t.linesInfo}</CardTitle>
                  <CardDescription>{t.linesInfoDesc}</CardDescription>
                </div>

                <CardAction>
                  <Button type="button" variant="outline" onClick={addLine} disabled={saving}>
                    <Plus className="h-4 w-4" />
                    {t.addLine}
                  </Button>
                </CardAction>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              {form.lines.map((line, index) => {
                const selectedAccount = findAccount(line.account_id);
                const selectedCostCenter = findCostCenter(line.cost_center_id);
                const accountResults = filteredAccounts(line.id);
                const costCenterResults = filteredCostCenters(line.id);

                return (
                  <div key={line.id} className="rounded-lg border bg-background p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="text-sm font-medium">{t.lineDescription}</span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLine(line.id)}
                        disabled={saving || form.lines.length <= 2}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t.removeLine}
                      </Button>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_130px_130px]">
                      <SelectorPopover
                        title={t.account}
                        searchPlaceholder={t.searchAccount}
                        selectedLabel={
                          selectedAccount
                            ? `${selectedAccount.code} · ${displayAccountName(selectedAccount, locale)}`
                            : t.accountRequired
                        }
                      >
                        <div className="relative mb-2">
                          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={accountSearch[line.id] || ""}
                            onChange={(event) =>
                              setAccountSearch((current) => ({
                                ...current,
                                [line.id]: event.target.value,
                              }))
                            }
                            placeholder={t.searchAccount}
                            className="ps-9"
                            disabled={saving}
                          />
                        </div>

                        <ScrollArea className="h-[170px]">
                          <div className="space-y-1">
                            {accountResults.length ? (
                              accountResults.map((account) => {
                                const selected = account.id === line.account_id;

                                return (
                                  <button
                                    key={account.id}
                                    type="button"
                                    disabled={saving}
                                    onClick={() => updateLine(line.id, "account_id", account.id)}
                                    className={`w-full rounded-md border px-3 py-2 text-start text-sm transition hover:bg-muted/40 ${
                                      selected ? "border-foreground bg-muted" : "bg-background"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-mono font-semibold">{account.code}</span>
                                      {selected ? <Badge variant="outline">{t.selected}</Badge> : null}
                                    </div>
                                    <div className="mt-1 truncate text-muted-foreground">
                                      {displayAccountName(account, locale)}
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="flex h-[130px] items-center justify-center text-center text-sm text-muted-foreground">
                                {t.noAccounts}
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </SelectorPopover>

                      <SelectorPopover
                        title={t.costCenter}
                        searchPlaceholder={t.searchCostCenter}
                        selectedLabel={
                          selectedCostCenter
                            ? `${selectedCostCenter.code} · ${displayCostCenterName(selectedCostCenter, locale)}`
                            : t.unknown
                        }
                      >
                        <div className="relative mb-2">
                          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={costCenterSearch[line.id] || ""}
                            onChange={(event) =>
                              setCostCenterSearch((current) => ({
                                ...current,
                                [line.id]: event.target.value,
                              }))
                            }
                            placeholder={t.searchCostCenter}
                            className="ps-9"
                            disabled={saving}
                          />
                        </div>

                        <ScrollArea className="h-[170px]">
                          <div className="space-y-1">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => updateLine(line.id, "cost_center_id", "")}
                              className={`w-full rounded-md border px-3 py-2 text-start text-sm transition hover:bg-muted/40 ${
                                !line.cost_center_id ? "border-foreground bg-muted" : "bg-background"
                              }`}
                            >
                              {t.unknown}
                            </button>

                            {costCenterResults.length ? (
                              costCenterResults.map((center) => {
                                const selected = center.id === line.cost_center_id;

                                return (
                                  <button
                                    key={center.id}
                                    type="button"
                                    disabled={saving}
                                    onClick={() => updateLine(line.id, "cost_center_id", center.id)}
                                    className={`w-full rounded-md border px-3 py-2 text-start text-sm transition hover:bg-muted/40 ${
                                      selected ? "border-foreground bg-muted" : "bg-background"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-mono font-semibold">{center.code}</span>
                                      {selected ? <Badge variant="outline">{t.selected}</Badge> : null}
                                    </div>
                                    <div className="mt-1 truncate text-muted-foreground">
                                      {displayCostCenterName(center, locale)}
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="flex h-[100px] items-center justify-center text-center text-sm text-muted-foreground">
                                {t.noCostCenters}
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </SelectorPopover>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t.debit}</label>
                        <Input
                          value={line.debit}
                          onChange={(event) => updateLine(line.id, "debit", normalizeDecimalInput(event.target.value))}
                          disabled={saving}
                          inputMode="decimal"
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">{t.credit}</label>
                        <Input
                          value={line.credit}
                          onChange={(event) => updateLine(line.id, "credit", normalizeDecimalInput(event.target.value))}
                          disabled={saving}
                          inputMode="decimal"
                          dir="ltr"
                        />
                      </div>

                      <div className="xl:col-span-4">
                        <label className="text-sm font-medium">{t.lineDescription}</label>
                        <Input
                          value={line.description}
                          onChange={(event) => updateLine(line.id, "description", event.target.value)}
                          disabled={saving}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
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
              <SummaryRow label={t.totalDebit} value={<MoneyValue value={totals.totalDebit} label={t.sar} />} />
              <SummaryRow label={t.totalCredit} value={<MoneyValue value={totals.totalCredit} label={t.sar} />} />
              <SummaryRow label={t.difference} value={<MoneyValue value={totals.difference} label={t.sar} />} />
              <SummaryRow
                label={t.balanceStatus}
                value={<StatusBadge ok={totals.isBalanced} label={totals.isBalanced ? t.balanced : t.unbalanced} />}
              />
              <SummaryRow label={t.linesCount} value={formatInteger(form.lines.length)} />

              <div className="rounded-lg border bg-background p-3">
                <div className="mb-3 text-sm font-semibold">{t.ready}</div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{form.entry_date ? t.validDate : t.invalidDate}</span>
                    <StatusBadge ok={Boolean(form.entry_date)} label={form.entry_date ? t.ready : t.notReady} />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{form.description.trim() ? t.validDescription : t.invalidDescription}</span>
                    <StatusBadge ok={Boolean(form.description.trim())} label={form.description.trim() ? t.ready : t.notReady} />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {totals.validLinesCount >= 2 ? t.validLines : t.invalidLines}
                    </span>
                    <StatusBadge ok={totals.validLinesCount >= 2} label={totals.validLinesCount >= 2 ? t.ready : t.notReady} />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      {totals.isBalanced ? t.validBalance : t.invalidBalance}
                    </span>
                    <StatusBadge ok={totals.isBalanced} label={totals.isBalanced ? t.ready : t.notReady} />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Button type="submit" disabled={saving} className="bg-foreground text-background hover:bg-foreground/90">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? t.saving : t.save}
                </Button>

                <Button type="button" variant="outline" onClick={addLine} disabled={saving}>
                  <Plus className="h-4 w-4" />
                  {t.addLine}
                </Button>

                <Button type="button" variant="outline" onClick={handleReset} disabled={saving}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <div className="rounded-lg bg-muted p-2">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.accountsLoaded}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatInteger(accounts.length)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <div className="rounded-lg bg-muted p-2">
                  <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.costCentersLoaded}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatInteger(costCenters.length)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <div className="rounded-lg bg-muted p-2">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.periodsLoaded}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatInteger(periods.length)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}