"use client";

/* ============================================================
   📂 app/system/accounting/fiscal-years/create/page.tsx
   🧾 Primey Care — Create Fiscal Year
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders form pattern
   ✅ Real API:
      POST /api/accounting/fiscal-years/
      fallback:
      POST /api/accounting/fiscal_years/
      POST /api/accounting/years/
   ✅ Premium form + side readiness summary
   ✅ Auto-generate year name/code from start date
   ✅ Calendar year helper
   ✅ Create monthly periods option
   ✅ CSRF
   ✅ Field validation
   ✅ Unsaved changes protection
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
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  TriangleAlert,
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
  id?: unknown;
  pk?: unknown;
  uuid?: unknown;
  data?: unknown;
  item?: unknown;
  fiscal_year?: unknown;
  year?: unknown;
  result?: unknown;
  message?: string;
  detail?: string;
  error?: string;
};

type FiscalYearStatus = "open" | "draft" | "closed" | "locked" | "archived";

type FormState = {
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  status: FiscalYearStatus;
  is_current: boolean;
  use_calendar_year: boolean;
  create_monthly_periods: boolean;
  notes: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  name: "",
  code: "",
  start_date: "",
  end_date: "",
  status: "open",
  is_current: false,
  use_calendar_year: true,
  create_monthly_periods: true,
  notes: "",
};

const translations = {
  ar: {
    title: "إنشاء سنة مالية",
    subtitle: "أضف سنة مالية جديدة وحدد نطاقها وحالة الإقفال وخيارات الفترات.",
    back: "السنوات المالية",
    save: "حفظ السنة المالية",
    saving: "جاري الحفظ...",
    clear: "تفريغ",
    autoFill: "تعبئة تلقائية",

    formTitle: "بيانات السنة المالية",
    formDesc: "أدخل بيانات السنة المالية الأساسية ونطاق التاريخ.",
    optionsTitle: "خيارات السنة",
    optionsDesc: "إعدادات تساعد في تشغيل السنة المالية.",
    summaryTitle: "ملخص الجاهزية",
    summaryDesc: "تحقق سريع قبل الحفظ.",

    name: "اسم السنة المالية",
    namePlaceholder: "مثال: السنة المالية 2026",
    code: "كود السنة",
    codePlaceholder: "مثال: FY-2026",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    status: "الحالة",
    notes: "ملاحظات",
    notesPlaceholder: "اكتب أي ملاحظات داخلية عن السنة المالية...",

    useCalendarYear: "سنة تقويمية",
    useCalendarYearDesc: "تعبئة البداية والنهاية تلقائيًا من 1 يناير إلى 31 ديسمبر.",
    makeCurrent: "جعلها السنة الحالية",
    makeCurrentDesc: "تعيين هذه السنة كسنة مالية حالية عند الحفظ.",
    createMonthlyPeriods: "إنشاء فترات شهرية",
    createMonthlyPeriodsDesc: "إنشاء 12 فترة محاسبية شهرية تلقائيًا إن كان الباكند يدعم ذلك.",

    open: "مفتوحة",
    draft: "مسودة",
    closed: "مغلقة",
    locked: "مقفلة",
    archived: "مؤرشفة",

    ready: "جاهز للحفظ",
    notReady: "بيانات مطلوبة",
    basicData: "البيانات الأساسية",
    dateRange: "نطاق التاريخ",
    statusReady: "حالة السنة",
    optionsReady: "خيارات التشغيل",

    requiredName: "اسم السنة المالية مطلوب.",
    requiredCode: "كود السنة مطلوب.",
    requiredStartDate: "تاريخ البداية مطلوب.",
    requiredEndDate: "تاريخ النهاية مطلوب.",
    invalidDateRange: "تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية.",
    saveSuccess: "تم إنشاء السنة المالية بنجاح.",
    saveError: "تعذر إنشاء السنة المالية.",
    unsavedConfirm: "لديك تغييرات غير محفوظة. هل تريد المغادرة؟",
    clearConfirm: "هل تريد تفريغ النموذج؟",
    unknown: "غير محدد",
  },
  en: {
    title: "Create Fiscal Year",
    subtitle: "Add a new fiscal year and define its date range, status, and period options.",
    back: "Fiscal years",
    save: "Save fiscal year",
    saving: "Saving...",
    clear: "Clear",
    autoFill: "Auto fill",

    formTitle: "Fiscal year details",
    formDesc: "Enter the main fiscal year information and date range.",
    optionsTitle: "Year options",
    optionsDesc: "Settings that help operate the fiscal year.",
    summaryTitle: "Readiness summary",
    summaryDesc: "Quick check before saving.",

    name: "Fiscal year name",
    namePlaceholder: "Example: Fiscal Year 2026",
    code: "Year code",
    codePlaceholder: "Example: FY-2026",
    startDate: "Start date",
    endDate: "End date",
    status: "Status",
    notes: "Notes",
    notesPlaceholder: "Write internal notes about this fiscal year...",

    useCalendarYear: "Calendar year",
    useCalendarYearDesc: "Auto-fill dates from January 1 to December 31.",
    makeCurrent: "Make current year",
    makeCurrentDesc: "Set this year as the current fiscal year when saving.",
    createMonthlyPeriods: "Create monthly periods",
    createMonthlyPeriodsDesc: "Create 12 monthly accounting periods automatically if supported by backend.",

    open: "Open",
    draft: "Draft",
    closed: "Closed",
    locked: "Locked",
    archived: "Archived",

    ready: "Ready to save",
    notReady: "Required data",
    basicData: "Basic data",
    dateRange: "Date range",
    statusReady: "Year status",
    optionsReady: "Operation options",

    requiredName: "Fiscal year name is required.",
    requiredCode: "Year code is required.",
    requiredStartDate: "Start date is required.",
    requiredEndDate: "End date is required.",
    invalidDateRange: "End date must be after or equal to start date.",
    saveSuccess: "Fiscal year created successfully.",
    saveError: "Unable to create fiscal year.",
    unsavedConfirm: "You have unsaved changes. Do you want to leave?",
    clearConfirm: "Do you want to clear the form?",
    unknown: "Unknown",
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

  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")[1] || ""
  );
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": decodeURIComponent(csrfToken) } : {}),
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
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (payload || {}) as T;
}

function extractCreatedId(payload: ApiResponse) {
  const data = asRecord(payload.data);
  const item = asRecord(payload.item || payload.fiscal_year || payload.year || payload.result);

  return normalizeText(
    payload.id ||
      payload.pk ||
      payload.uuid ||
      data.id ||
      data.pk ||
      data.uuid ||
      item.id ||
      item.pk ||
      item.uuid,
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);

  return parsed.toISOString().slice(0, 10);
}

function getYearFromDate(value: string) {
  if (!value) return "";
  const year = value.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : "";
}

function statusLabel(status: FiscalYearStatus, locale: Locale) {
  const t = translations[locale];

  if (status === "open") return t.open;
  if (status === "draft") return t.draft;
  if (status === "closed") return t.closed;
  if (status === "locked") return t.locked;

  return t.archived;
}

function getStatusClass(status: FiscalYearStatus) {
  if (status === "open") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "locked") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  if (status === "closed") {
    return "border-slate-500/30 bg-slate-50 text-slate-700 hover:bg-slate-50";
  }

  if (status === "draft") {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
}

function ReadinessItem({
  ready,
  label,
}: {
  ready: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {ready ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <TriangleAlert className="h-4 w-4 text-amber-600" />
      )}
    </div>
  );
}

function OptionCard({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/30">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-muted-foreground"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

function CreateSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-4 p-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CreateAccountingFiscalYearPage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [ready, setReady] = React.useState(false);

  const [saving, setSaving] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [dirty, setDirty] = React.useState(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  React.useEffect(() => {
    const applyLocale = () => {
      const nextLocale = getInitialLocale();

      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
      document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
    };

    applyLocale();
    setReady(true);

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
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty, saving]);

  const readiness = React.useMemo(() => {
    const basicData = Boolean(form.name.trim()) && Boolean(form.code.trim());
    const dateRange =
      Boolean(form.start_date) &&
      Boolean(form.end_date) &&
      form.end_date >= form.start_date;
    const statusReady = Boolean(form.status);
    const optionsReady = true;

    return {
      basicData,
      dateRange,
      statusReady,
      optionsReady,
      ready: basicData && dateRange && statusReady,
    };
  }, [form]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setDirty(true);
    setSubmitError("");

    setFieldErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
  }

  function fillFromYear(year: string) {
    if (!year) return;

    const name = locale === "ar" ? `السنة المالية ${year}` : `Fiscal Year ${year}`;
    const code = `FY-${year}`;

    setForm((current) => ({
      ...current,
      name: current.name.trim() ? current.name : name,
      code: current.code.trim() ? current.code : code,
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
      use_calendar_year: true,
    }));

    setDirty(true);
    setFieldErrors({});
  }

  function handleStartDateChange(value: string) {
    const year = getYearFromDate(value);

    setForm((current) => {
      const next: FormState = {
        ...current,
        start_date: value,
      };

      if (current.use_calendar_year && year) {
        next.name = current.name.trim()
          ? current.name
          : locale === "ar"
            ? `السنة المالية ${year}`
            : `Fiscal Year ${year}`;
        next.code = current.code.trim() ? current.code : `FY-${year}`;
        next.end_date = `${year}-12-31`;
      }

      return next;
    });

    setDirty(true);
    setSubmitError("");
    setFieldErrors((current) => ({
      ...current,
      start_date: undefined,
      end_date: undefined,
    }));
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};

    if (!form.name.trim()) nextErrors.name = t.requiredName;
    if (!form.code.trim()) nextErrors.code = t.requiredCode;
    if (!form.start_date) nextErrors.start_date = t.requiredStartDate;
    if (!form.end_date) nextErrors.end_date = t.requiredEndDate;

    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      nextErrors.end_date = t.invalidDateRange;
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      title: form.name.trim(),
      fiscal_year_name: form.name.trim(),
      code: form.code.trim(),
      year_code: form.code.trim(),
      fiscal_year_code: form.code.trim(),
      start_date: form.start_date,
      date_from: form.start_date,
      from_date: form.start_date,
      end_date: form.end_date,
      date_to: form.end_date,
      to_date: form.end_date,
      status: form.status,
      year_status: form.status,
      is_current: form.is_current,
      current: form.is_current,
      is_closed: form.status === "closed" || form.status === "locked",
      is_locked: form.status === "locked",
      create_monthly_periods: form.create_monthly_periods,
      auto_create_periods: form.create_monthly_periods,
      generate_periods: form.create_monthly_periods,
      period_frequency: form.create_monthly_periods ? "monthly" : null,
      notes: form.notes.trim(),
      description: form.notes.trim(),
    };
  }

  async function submitForm(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    setSubmitError("");

    const payload = buildPayload();

    const endpoints = [
      "/api/accounting/fiscal-years/",
      "/api/accounting/fiscal_years/",
      "/api/accounting/years/",
    ];

    let createdId = "";
    let lastError: unknown = null;

    try {
      for (const endpoint of endpoints) {
        try {
          const responsePayload = await fetchJson<ApiResponse>(makeApiUrl(endpoint), {
            method: "POST",
            body: JSON.stringify(payload),
          });

          createdId = extractCreatedId(responsePayload);
          break;
        } catch (caughtError) {
          lastError = caughtError;
        }
      }

      if (!createdId && lastError) {
        throw lastError instanceof Error ? lastError : new Error(t.saveError);
      }

      toast.success(t.saveSuccess);
      setDirty(false);

      if (createdId) {
        router.push(`/system/accounting/fiscal-years/${createdId}`);
      } else {
        router.push("/system/accounting/fiscal-years");
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.saveError;

      setSubmitError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function clearForm() {
    if (dirty && !window.confirm(t.clearConfirm)) return;

    setForm(initialForm);
    setFieldErrors({});
    setSubmitError("");
    setDirty(false);
  }

  function goBack(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!dirty || saving) return;

    const confirmed = window.confirm(t.unsavedConfirm);

    if (!confirmed) {
      event.preventDefault();
    }
  }

  const currentYear = String(new Date().getFullYear());

  if (!ready) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <CreateSkeleton />
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
            <Link href="/system/accounting/fiscal-years" onClick={goBack}>
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => fillFromYear(currentYear)}
            disabled={saving}
          >
            <RefreshCw className="h-4 w-4" />
            {t.autoFill}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={clearForm}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4" />
            {t.clear}
          </Button>

          <Button
            className="h-9 rounded-lg bg-black text-white hover:bg-black/90"
            onClick={() => void submitForm()}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t.saving : t.save}
          </Button>
        </div>
      </div>

      {submitError ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-4 text-right">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">{t.saveError}</p>
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={submitForm}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{t.formTitle}</CardTitle>
                    <CardDescription>{t.formDesc}</CardDescription>
                  </div>

                  <CardAction>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                      <CalendarClock className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardAction>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 px-6 pb-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t.name}</label>
                    <Input
                      value={form.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder={t.namePlaceholder}
                      disabled={saving}
                      className={cn(
                        "h-10 rounded-lg bg-background",
                        fieldErrors.name && "border-red-300",
                      )}
                    />
                    {fieldErrors.name ? (
                      <p className="text-xs text-red-600">{fieldErrors.name}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t.code}</label>
                    <Input
                      value={form.code}
                      onChange={(event) =>
                        updateField("code", event.target.value.toUpperCase())
                      }
                      placeholder={t.codePlaceholder}
                      disabled={saving}
                      className={cn(
                        "h-10 rounded-lg bg-background",
                        fieldErrors.code && "border-red-300",
                      )}
                    />
                    {fieldErrors.code ? (
                      <p className="text-xs text-red-600">{fieldErrors.code}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {t.startDate}
                    </label>
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={(event) => handleStartDateChange(event.target.value)}
                      disabled={saving}
                      className={cn(
                        "h-10 rounded-lg bg-background",
                        fieldErrors.start_date && "border-red-300",
                      )}
                    />
                    {fieldErrors.start_date ? (
                      <p className="text-xs text-red-600">{fieldErrors.start_date}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t.endDate}</label>
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={(event) => updateField("end_date", event.target.value)}
                      disabled={saving}
                      className={cn(
                        "h-10 rounded-lg bg-background",
                        fieldErrors.end_date && "border-red-300",
                      )}
                    />
                    {fieldErrors.end_date ? (
                      <p className="text-xs text-red-600">{fieldErrors.end_date}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t.status}</label>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        updateField("status", value as FiscalYearStatus)
                      }
                      disabled={saving}
                    >
                      <SelectTrigger className="h-10 rounded-lg bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">{t.open}</SelectItem>
                        <SelectItem value="draft">{t.draft}</SelectItem>
                        <SelectItem value="closed">{t.closed}</SelectItem>
                        <SelectItem value="locked">{t.locked}</SelectItem>
                        <SelectItem value="archived">{t.archived}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t.notes}</label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    placeholder={t.notesPlaceholder}
                    disabled={saving}
                    rows={5}
                    className="min-h-[128px] w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{t.optionsTitle}</CardTitle>
                    <CardDescription>{t.optionsDesc}</CardDescription>
                  </div>

                  <CardAction>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                      <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardAction>
                </div>
              </CardHeader>

              <CardContent className="grid gap-3 px-6 pb-6 md:grid-cols-3">
                <OptionCard
                  title={t.useCalendarYear}
                  description={t.useCalendarYearDesc}
                  checked={form.use_calendar_year}
                  disabled={saving}
                  onChange={(checked) => {
                    updateField("use_calendar_year", checked);
                    const year = getYearFromDate(form.start_date) || currentYear;
                    if (checked) fillFromYear(year);
                  }}
                />

                <OptionCard
                  title={t.makeCurrent}
                  description={t.makeCurrentDesc}
                  checked={form.is_current}
                  disabled={saving}
                  onChange={(checked) => updateField("is_current", checked)}
                />

                <OptionCard
                  title={t.createMonthlyPeriods}
                  description={t.createMonthlyPeriodsDesc}
                  checked={form.create_monthly_periods}
                  disabled={saving}
                  onChange={(checked) => updateField("create_monthly_periods", checked)}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{t.summaryTitle}</CardTitle>
                    <CardDescription>{t.summaryDesc}</CardDescription>
                  </div>

                  <CardAction>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                      <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardAction>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 px-6 pb-6">
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {readiness.ready ? t.ready : t.notReady}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        getStatusClass(form.status),
                      )}
                    >
                      {statusLabel(form.status, locale)}
                    </Badge>
                  </div>
                </div>

                <ReadinessItem ready={readiness.basicData} label={t.basicData} />
                <ReadinessItem ready={readiness.dateRange} label={t.dateRange} />
                <ReadinessItem ready={readiness.statusReady} label={t.statusReady} />
                <ReadinessItem ready={readiness.optionsReady} label={t.optionsReady} />

                <div className="rounded-lg border bg-background p-4 text-sm">
                  <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {form.name || t.name}
                  </div>

                  <div className="space-y-1 text-muted-foreground">
                    <p>
                      {t.code}:{" "}
                      <span className="font-medium text-foreground">
                        {form.code || "—"}
                      </span>
                    </p>
                    <p>
                      {t.startDate}:{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {formatDate(form.start_date)}
                      </span>
                    </p>
                    <p>
                      {t.endDate}:{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {formatDate(form.end_date)}
                      </span>
                    </p>
                    <p>
                      {t.makeCurrent}:{" "}
                      <span className="font-medium text-foreground">
                        {form.is_current ? "✓" : "—"}
                      </span>
                    </p>
                    <p>
                      {t.createMonthlyPeriods}:{" "}
                      <span className="font-medium text-foreground">
                        {form.create_monthly_periods ? "✓" : "—"}
                      </span>
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  className="h-10 w-full rounded-lg bg-black text-white hover:bg-black/90"
                  onClick={() => void submitForm()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? t.saving : t.save}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}