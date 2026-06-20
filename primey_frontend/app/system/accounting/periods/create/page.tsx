"use client";

/* ============================================================
   📂 app/system/accounting/periods/create/page.tsx
   🧾 Primey Care — Create Accounting Period
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET  /api/accounting/fiscal-years/?page=1&page_size=500
      POST /api/accounting/periods/
      fallback POST /api/accounting/fiscal-periods/
   ✅ Premium form + side summary
   ✅ Field validation
   ✅ CSRF
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
  period?: unknown;
  fiscal_period?: unknown;
  result?: unknown;
  results?: unknown[];
  items?: unknown[];
  rows?: unknown[];
  message?: string;
  detail?: string;
  error?: string;
};

type FiscalYearOption = {
  id: string;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  is_closed: boolean;
  is_locked: boolean;
};

type PeriodStatus = "open" | "draft" | "closed" | "locked";

type FormState = {
  name: string;
  code: string;
  fiscal_year_id: string;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
  notes: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  name: "",
  code: "",
  fiscal_year_id: "",
  start_date: "",
  end_date: "",
  status: "open",
  notes: "",
};

const translations = {
  ar: {
    title: "إنشاء فترة محاسبية",
    subtitle: "أضف فترة محاسبية جديدة واربطها بالسنة المالية المناسبة.",
    back: "الفترات المحاسبية",
    save: "حفظ الفترة",
    saving: "جاري الحفظ...",
    clear: "تفريغ",
    refresh: "تحديث السنوات",

    formTitle: "بيانات الفترة",
    formDesc: "أدخل بيانات الفترة المحاسبية الأساسية.",
    summaryTitle: "ملخص الجاهزية",
    summaryDesc: "تحقق سريع قبل الحفظ.",

    name: "اسم الفترة",
    namePlaceholder: "مثال: يناير 2026",
    code: "كود الفترة",
    codePlaceholder: "مثال: 2026-01",
    fiscalYear: "السنة المالية",
    fiscalYearPlaceholder: "اختر السنة المالية",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    status: "الحالة",
    notes: "ملاحظات",
    notesPlaceholder: "اكتب أي ملاحظات داخلية عن الفترة...",

    open: "مفتوحة",
    draft: "مسودة",
    closed: "مغلقة",
    locked: "مقفلة",

    ready: "جاهز للحفظ",
    notReady: "بيانات مطلوبة",
    basicData: "البيانات الأساسية",
    dateRange: "نطاق التاريخ",
    fiscalYearReady: "السنة المالية",
    statusReady: "حالة الفترة",

    requiredName: "اسم الفترة مطلوب.",
    requiredCode: "كود الفترة مطلوب.",
    requiredFiscalYear: "السنة المالية مطلوبة.",
    requiredStartDate: "تاريخ البداية مطلوب.",
    requiredEndDate: "تاريخ النهاية مطلوب.",
    invalidDateRange: "تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية.",
    saveSuccess: "تم إنشاء الفترة المحاسبية بنجاح.",
    saveError: "تعذر إنشاء الفترة المحاسبية.",
    loadFiscalYearsError: "تعذر تحميل السنوات المالية.",
    noFiscalYears: "لا توجد سنوات مالية متاحة.",
    unsavedConfirm: "لديك تغييرات غير محفوظة. هل تريد المغادرة؟",
    clearConfirm: "هل تريد تفريغ النموذج؟",
    tryAgain: "إعادة المحاولة",
    unknown: "غير محدد",
  },
  en: {
    title: "Create Accounting Period",
    subtitle: "Add a new accounting period and link it to the proper fiscal year.",
    back: "Accounting periods",
    save: "Save period",
    saving: "Saving...",
    clear: "Clear",
    refresh: "Refresh years",

    formTitle: "Period details",
    formDesc: "Enter the main accounting period information.",
    summaryTitle: "Readiness summary",
    summaryDesc: "Quick check before saving.",

    name: "Period name",
    namePlaceholder: "Example: January 2026",
    code: "Period code",
    codePlaceholder: "Example: 2026-01",
    fiscalYear: "Fiscal year",
    fiscalYearPlaceholder: "Select fiscal year",
    startDate: "Start date",
    endDate: "End date",
    status: "Status",
    notes: "Notes",
    notesPlaceholder: "Write internal notes about this period...",

    open: "Open",
    draft: "Draft",
    closed: "Closed",
    locked: "Locked",

    ready: "Ready to save",
    notReady: "Required data",
    basicData: "Basic data",
    dateRange: "Date range",
    fiscalYearReady: "Fiscal year",
    statusReady: "Period status",

    requiredName: "Period name is required.",
    requiredCode: "Period code is required.",
    requiredFiscalYear: "Fiscal year is required.",
    requiredStartDate: "Start date is required.",
    requiredEndDate: "End date is required.",
    invalidDateRange: "End date must be after or equal to start date.",
    saveSuccess: "Accounting period created successfully.",
    saveError: "Unable to create accounting period.",
    loadFiscalYearsError: "Unable to load fiscal years.",
    noFiscalYears: "No fiscal years available.",
    unsavedConfirm: "You have unsaved changes. Do you want to leave?",
    clearConfirm: "Do you want to clear the form?",
    tryAgain: "Try again",
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

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["1", "true", "yes", "on", "active", "open", "opened", "locked", "closed"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off", "inactive", "draft"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);

  return parsed.toISOString().slice(0, 10);
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

  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1] || "";
}

async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    ...options,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(getCookie("csrftoken") ? { "X-CSRFToken": decodeURIComponent(getCookie("csrftoken")) } : {}),
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

function extractArray(payload: ApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  const data = asRecord(payload.data);

  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.fiscal_years)) return data.fiscal_years;
  if (Array.isArray(data.years)) return data.years;

  return [];
}

function extractCreatedId(payload: ApiResponse) {
  const data = asRecord(payload.data);
  const item = asRecord(payload.item || payload.period || payload.fiscal_period || payload.result);

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

function normalizeFiscalYear(value: unknown): FiscalYearOption {
  const item = asRecord(value);
  const id = normalizeText(item.id || item.pk || item.uuid);

  return {
    id,
    code: normalizeText(item.code || item.year_code || item.number),
    name:
      normalizeText(item.name || item.title || item.fiscal_year_name) ||
      normalizeText(item.code || item.year_code) ||
      (id ? `#${id}` : ""),
    start_date:
      normalizeText(item.start_date || item.date_from || item.from_date || item.starts_at) ||
      null,
    end_date:
      normalizeText(item.end_date || item.date_to || item.to_date || item.ends_at) ||
      null,
    status: normalizeText(item.status || item.year_status || "open"),
    is_closed: toBoolean(item.is_closed ?? item.closed ?? item.isClosed, false),
    is_locked: toBoolean(item.is_locked ?? item.locked ?? item.isLocked, false),
  };
}

function statusLabel(status: PeriodStatus, locale: Locale) {
  const t = translations[locale];

  if (status === "open") return t.open;
  if (status === "draft") return t.draft;
  if (status === "closed") return t.closed;
  return t.locked;
}

function getStatusClass(status: PeriodStatus) {
  if (status === "open") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "locked") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  if (status === "closed") {
    return "border-slate-500/30 bg-slate-50 text-slate-700 hover:bg-slate-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
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
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CreateAccountingPeriodPage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [fiscalYears, setFiscalYears] = React.useState<FiscalYearOption[]>([]);

  const [loadingYears, setLoadingYears] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
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

  const loadFiscalYears = React.useCallback(async () => {
    const controller = new AbortController();

    try {
      setLoadingYears(true);
      setLoadError("");

      const params = new URLSearchParams({
        page: "1",
        page_size: "500",
      });

      const endpoints = [
        "/api/accounting/fiscal-years/",
        "/api/accounting/fiscal_years/",
        "/api/accounting/years/",
      ];

      let payload: ApiResponse | null = null;
      let lastError: unknown = null;

      for (const endpoint of endpoints) {
        try {
          payload = await fetchJson<ApiResponse>(makeApiUrl(endpoint, params), {
            method: "GET",
            signal: controller.signal,
          });
          break;
        } catch (caughtError) {
          lastError = caughtError;
        }
      }

      if (!payload) {
        throw lastError instanceof Error ? lastError : new Error(t.loadFiscalYearsError);
      }

      const years = extractArray(payload)
        .map(normalizeFiscalYear)
        .filter((year) => year.id || year.name || year.code)
        .sort((a, b) => String(b.start_date || "").localeCompare(String(a.start_date || "")));

      setFiscalYears(years);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.loadFiscalYearsError;

      setLoadError(message);
      setFiscalYears([]);
    } finally {
      setLoadingYears(false);
    }

    return () => controller.abort();
  }, [t.loadFiscalYearsError]);

  React.useEffect(() => {
    void loadFiscalYears();
  }, [loadFiscalYears]);

  const selectedFiscalYear = React.useMemo(() => {
    return fiscalYears.find((year) => year.id === form.fiscal_year_id) || null;
  }, [fiscalYears, form.fiscal_year_id]);

  const readiness = React.useMemo(() => {
    const basicData = Boolean(form.name.trim()) && Boolean(form.code.trim());
    const fiscalYearReady = Boolean(form.fiscal_year_id);
    const dateRange =
      Boolean(form.start_date) &&
      Boolean(form.end_date) &&
      form.end_date >= form.start_date;
    const statusReady = Boolean(form.status);

    return {
      basicData,
      fiscalYearReady,
      dateRange,
      statusReady,
      ready: basicData && fiscalYearReady && dateRange && statusReady,
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

  function validateForm() {
    const nextErrors: FieldErrors = {};

    if (!form.name.trim()) nextErrors.name = t.requiredName;
    if (!form.code.trim()) nextErrors.code = t.requiredCode;
    if (!form.fiscal_year_id) nextErrors.fiscal_year_id = t.requiredFiscalYear;
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
      code: form.code.trim(),
      period_code: form.code.trim(),
      fiscal_year_id: form.fiscal_year_id,
      start_date: form.start_date,
      end_date: form.end_date,
      status: form.status,
      is_closed: form.status === "closed" || form.status === "locked",
      is_locked: form.status === "locked",
      notes: form.notes.trim(),
    };
  }

  async function submitForm(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    setSubmitError("");

    const payload = buildPayload();

    const endpoints = ["/api/accounting/periods/", "/api/accounting/fiscal-periods/"];
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
        router.push(`/system/accounting/periods/${createdId}`);
      } else {
        router.push("/system/accounting/periods");
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

  if (loadingYears) {
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
            <Link href="/system/accounting/periods" onClick={goBack}>
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadFiscalYears()}
            disabled={saving || loadingYears}
          >
            <RefreshCw className={cn("h-4 w-4", loadingYears && "animate-spin")} />
            {t.refresh}
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

      {loadError ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 text-right">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">{t.loadFiscalYearsError}</p>
                <p className="text-sm text-red-700">{loadError}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadFiscalYears()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

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
                    className={cn("h-10 rounded-lg bg-background", fieldErrors.name && "border-red-300")}
                  />
                  {fieldErrors.name ? (
                    <p className="text-xs text-red-600">{fieldErrors.name}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t.code}</label>
                  <Input
                    value={form.code}
                    onChange={(event) => updateField("code", event.target.value)}
                    placeholder={t.codePlaceholder}
                    disabled={saving}
                    className={cn("h-10 rounded-lg bg-background", fieldErrors.code && "border-red-300")}
                  />
                  {fieldErrors.code ? (
                    <p className="text-xs text-red-600">{fieldErrors.code}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.fiscalYear}</label>
                <Select
                  value={form.fiscal_year_id || "none"}
                  onValueChange={(value) => updateField("fiscal_year_id", value === "none" ? "" : value)}
                  disabled={saving}
                >
                  <SelectTrigger
                    className={cn(
                      "h-10 rounded-lg bg-background",
                      fieldErrors.fiscal_year_id && "border-red-300",
                    )}
                  >
                    <SelectValue placeholder={t.fiscalYearPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.fiscalYearPlaceholder}</SelectItem>
                    {fiscalYears.map((year) => (
                      <SelectItem key={year.id || year.code || year.name} value={year.id || year.code || year.name}>
                        {year.code ? `${year.code} — ${year.name}` : year.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.fiscal_year_id ? (
                  <p className="text-xs text-red-600">{fieldErrors.fiscal_year_id}</p>
                ) : !fiscalYears.length ? (
                  <p className="text-xs text-amber-600">{t.noFiscalYears}</p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t.startDate}</label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(event) => updateField("start_date", event.target.value)}
                    disabled={saving}
                    className={cn("h-10 rounded-lg bg-background", fieldErrors.start_date && "border-red-300")}
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
                    className={cn("h-10 rounded-lg bg-background", fieldErrors.end_date && "border-red-300")}
                  />
                  {fieldErrors.end_date ? (
                    <p className="text-xs text-red-600">{fieldErrors.end_date}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.status}</label>
                <Select
                  value={form.status}
                  onValueChange={(value) => updateField("status", value as PeriodStatus)}
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
                  </SelectContent>
                </Select>
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
                        readiness.ready
                          ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                          : "border-amber-500/30 bg-amber-50 text-amber-700",
                      )}
                    >
                      {statusLabel(form.status, locale)}
                    </Badge>
                  </div>
                </div>

                <ReadinessItem ready={readiness.basicData} label={t.basicData} />
                <ReadinessItem ready={readiness.fiscalYearReady} label={t.fiscalYearReady} />
                <ReadinessItem ready={readiness.dateRange} label={t.dateRange} />
                <ReadinessItem ready={readiness.statusReady} label={t.statusReady} />

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
                      {t.fiscalYear}:{" "}
                      <span className="font-medium text-foreground">
                        {selectedFiscalYear?.name || "—"}
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