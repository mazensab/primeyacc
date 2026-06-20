"use client";

/* ============================================================
   📂 app/system/accounting/tax-rates/create/page.tsx
   🧾 Primey Care — Create Tax Rate
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders form pattern
   ✅ Real API:
      POST /api/accounting/tax-rates/
      fallback:
      POST /api/accounting/taxes/
      POST /api/accounting/vat-rates/
   ✅ Premium form + side readiness summary
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
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Percent,
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
  tax_rate?: unknown;
  tax?: unknown;
  vat_rate?: unknown;
  result?: unknown;
  message?: string;
  detail?: string;
  error?: string;
};

type TaxType = "vat" | "withholding" | "sales" | "service" | "other";
type TaxStatus = "active" | "inactive" | "draft" | "archived";

type FormState = {
  name: string;
  code: string;
  type: TaxType;
  rate: string;
  status: TaxStatus;
  effective_from: string;
  effective_to: string;
  description: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  name: "",
  code: "",
  type: "vat",
  rate: "",
  status: "active",
  effective_from: "",
  effective_to: "",
  description: "",
};

const translations = {
  ar: {
    title: "إنشاء معدل ضريبة",
    subtitle: "أضف معدل ضريبة جديد لاستخدامه في الفواتير والعمليات المحاسبية.",
    back: "معدلات الضريبة",
    save: "حفظ معدل الضريبة",
    saving: "جاري الحفظ...",
    clear: "تفريغ",

    formTitle: "بيانات معدل الضريبة",
    formDesc: "أدخل بيانات الضريبة الأساسية ونطاق صلاحيتها.",
    summaryTitle: "ملخص الجاهزية",
    summaryDesc: "تحقق سريع قبل الحفظ.",

    name: "اسم الضريبة",
    namePlaceholder: "مثال: ضريبة القيمة المضافة 15%",
    code: "كود الضريبة",
    codePlaceholder: "مثال: VAT15",
    type: "نوع الضريبة",
    rate: "النسبة",
    ratePlaceholder: "مثال: 15",
    status: "الحالة",
    effectiveFrom: "تاريخ البداية",
    effectiveTo: "تاريخ النهاية",
    description: "الوصف",
    descriptionPlaceholder: "اكتب وصفًا أو ملاحظات داخلية عن معدل الضريبة...",

    vat: "ضريبة القيمة المضافة",
    withholding: "ضريبة استقطاع",
    sales: "ضريبة مبيعات",
    service: "ضريبة خدمات",
    other: "أخرى",

    active: "نشط",
    inactive: "غير نشط",
    draft: "مسودة",
    archived: "مؤرشف",

    ready: "جاهز للحفظ",
    notReady: "بيانات مطلوبة",
    basicData: "البيانات الأساسية",
    rateReady: "النسبة",
    dateRange: "نطاق التاريخ",
    statusReady: "حالة الضريبة",

    requiredName: "اسم الضريبة مطلوب.",
    requiredCode: "كود الضريبة مطلوب.",
    requiredRate: "نسبة الضريبة مطلوبة.",
    invalidRate: "النسبة يجب أن تكون رقمًا بين 0 و 100.",
    invalidDateRange: "تاريخ النهاية يجب أن يكون بعد أو يساوي تاريخ البداية.",
    saveSuccess: "تم إنشاء معدل الضريبة بنجاح.",
    saveError: "تعذر إنشاء معدل الضريبة.",
    unsavedConfirm: "لديك تغييرات غير محفوظة. هل تريد المغادرة؟",
    clearConfirm: "هل تريد تفريغ النموذج؟",
    percentHint: "اكتب الرقم فقط بدون علامة النسبة.",
    unknown: "غير محدد",
  },
  en: {
    title: "Create Tax Rate",
    subtitle: "Add a new tax rate for invoices and accounting operations.",
    back: "Tax rates",
    save: "Save tax rate",
    saving: "Saving...",
    clear: "Clear",

    formTitle: "Tax rate details",
    formDesc: "Enter the main tax details and validity range.",
    summaryTitle: "Readiness summary",
    summaryDesc: "Quick check before saving.",

    name: "Tax name",
    namePlaceholder: "Example: VAT 15%",
    code: "Tax code",
    codePlaceholder: "Example: VAT15",
    type: "Tax type",
    rate: "Rate",
    ratePlaceholder: "Example: 15",
    status: "Status",
    effectiveFrom: "Effective from",
    effectiveTo: "Effective to",
    description: "Description",
    descriptionPlaceholder: "Write a description or internal notes about this tax rate...",

    vat: "VAT",
    withholding: "Withholding tax",
    sales: "Sales tax",
    service: "Service tax",
    other: "Other",

    active: "Active",
    inactive: "Inactive",
    draft: "Draft",
    archived: "Archived",

    ready: "Ready to save",
    notReady: "Required data",
    basicData: "Basic data",
    rateReady: "Rate",
    dateRange: "Date range",
    statusReady: "Tax status",

    requiredName: "Tax name is required.",
    requiredCode: "Tax code is required.",
    requiredRate: "Tax rate is required.",
    invalidRate: "Rate must be a number between 0 and 100.",
    invalidDateRange: "End date must be after or equal to start date.",
    saveSuccess: "Tax rate created successfully.",
    saveError: "Unable to create tax rate.",
    unsavedConfirm: "You have unsaved changes. Do you want to leave?",
    clearConfirm: "Do you want to clear the form?",
    percentHint: "Enter the number only without the percent sign.",
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

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").replace("%", ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function formatPercent(value: unknown) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value))}%`;
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
  const item = asRecord(
    payload.item ||
      payload.tax_rate ||
      payload.tax ||
      payload.vat_rate ||
      payload.result,
  );

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

function statusLabel(status: TaxStatus, locale: Locale) {
  const t = translations[locale];

  if (status === "active") return t.active;
  if (status === "inactive") return t.inactive;
  if (status === "draft") return t.draft;

  return t.archived;
}

function typeLabel(type: TaxType, locale: Locale) {
  const t = translations[locale];

  if (type === "vat") return t.vat;
  if (type === "withholding") return t.withholding;
  if (type === "sales") return t.sales;
  if (type === "service") return t.service;

  return t.other;
}

function getStatusClass(status: TaxStatus) {
  if (status === "active") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "inactive") {
    return "border-slate-500/30 bg-slate-50 text-slate-700 hover:bg-slate-50";
  }

  if (status === "draft") {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
}

function getTypeClass(type: TaxType) {
  if (type === "vat") {
    return "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50";
  }

  if (type === "withholding") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  if (type === "sales") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (type === "service") {
    return "border-cyan-500/30 bg-cyan-50 text-cyan-700 hover:bg-cyan-50";
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

export default function CreateAccountingTaxRatePage() {
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
    const rate = toNumber(form.rate, NaN);

    const basicData = Boolean(form.name.trim()) && Boolean(form.code.trim());
    const rateReady = Number.isFinite(rate) && rate >= 0 && rate <= 100;
    const dateRange =
      !form.effective_from ||
      !form.effective_to ||
      form.effective_to >= form.effective_from;
    const statusReady = Boolean(form.status);

    return {
      basicData,
      rateReady,
      dateRange,
      statusReady,
      ready: basicData && rateReady && dateRange && statusReady,
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
    const rate = toNumber(form.rate, NaN);

    if (!form.name.trim()) nextErrors.name = t.requiredName;
    if (!form.code.trim()) nextErrors.code = t.requiredCode;
    if (!form.rate.trim()) nextErrors.rate = t.requiredRate;

    if (form.rate.trim() && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
      nextErrors.rate = t.invalidRate;
    }

    if (form.effective_from && form.effective_to && form.effective_to < form.effective_from) {
      nextErrors.effective_to = t.invalidDateRange;
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function buildPayload() {
    const rate = toNumber(form.rate);

    return {
      name: form.name.trim(),
      title: form.name.trim(),
      label: form.name.trim(),
      code: form.code.trim(),
      tax_code: form.code.trim(),
      type: form.type,
      tax_type: form.type,
      category: form.type,
      rate,
      percentage: rate,
      tax_rate: rate,
      tax_percentage: rate,
      value: rate,
      status: form.status,
      tax_status: form.status,
      is_active: form.status === "active",
      active: form.status === "active",
      enabled: form.status === "active",
      effective_from: form.effective_from || null,
      valid_from: form.effective_from || null,
      start_date: form.effective_from || null,
      effective_to: form.effective_to || null,
      valid_until: form.effective_to || null,
      end_date: form.effective_to || null,
      description: form.description.trim(),
      notes: form.description.trim(),
    };
  }

  async function submitForm(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    setSubmitError("");

    const payload = buildPayload();

    const endpoints = [
      "/api/accounting/tax-rates/",
      "/api/accounting/taxes/",
      "/api/accounting/vat-rates/",
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

      router.push("/system/accounting/tax-rates");
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
            <Link href="/system/accounting/tax-rates" onClick={goBack}>
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
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
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{t.formTitle}</CardTitle>
                  <CardDescription>{t.formDesc}</CardDescription>
                </div>

                <CardAction>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                    <BadgePercent className="h-5 w-5 text-muted-foreground" />
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
                    onChange={(event) => updateField("code", event.target.value.toUpperCase())}
                    placeholder={t.codePlaceholder}
                    disabled={saving}
                    className={cn("h-10 rounded-lg bg-background", fieldErrors.code && "border-red-300")}
                  />
                  {fieldErrors.code ? (
                    <p className="text-xs text-red-600">{fieldErrors.code}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t.type}</label>
                  <Select
                    value={form.type}
                    onValueChange={(value) => updateField("type", value as TaxType)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vat">{t.vat}</SelectItem>
                      <SelectItem value="withholding">{t.withholding}</SelectItem>
                      <SelectItem value="sales">{t.sales}</SelectItem>
                      <SelectItem value="service">{t.service}</SelectItem>
                      <SelectItem value="other">{t.other}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t.rate}</label>
                  <div className="relative">
                    <Percent
                      className={cn(
                        "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                        locale === "ar" ? "left-3" : "right-3",
                      )}
                    />
                    <Input
                      inputMode="decimal"
                      value={form.rate}
                      onChange={(event) => updateField("rate", event.target.value)}
                      placeholder={t.ratePlaceholder}
                      disabled={saving}
                      className={cn(
                        "h-10 rounded-lg bg-background tabular-nums",
                        locale === "ar" ? "pl-9" : "pr-9",
                        fieldErrors.rate && "border-red-300",
                      )}
                    />
                  </div>
                  {fieldErrors.rate ? (
                    <p className="text-xs text-red-600">{fieldErrors.rate}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t.percentHint}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t.status}</label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => updateField("status", value as TaxStatus)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t.active}</SelectItem>
                      <SelectItem value="inactive">{t.inactive}</SelectItem>
                      <SelectItem value="draft">{t.draft}</SelectItem>
                      <SelectItem value="archived">{t.archived}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t.effectiveFrom}</label>
                  <div className="relative">
                    <CalendarDays
                      className={cn(
                        "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                        locale === "ar" ? "left-3" : "right-3",
                      )}
                    />
                    <Input
                      type="date"
                      value={form.effective_from}
                      onChange={(event) => updateField("effective_from", event.target.value)}
                      disabled={saving}
                      className={cn(
                        "h-10 rounded-lg bg-background",
                        locale === "ar" ? "pl-9" : "pr-9",
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t.effectiveTo}</label>
                  <div className="relative">
                    <CalendarDays
                      className={cn(
                        "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                        locale === "ar" ? "left-3" : "right-3",
                      )}
                    />
                    <Input
                      type="date"
                      value={form.effective_to}
                      onChange={(event) => updateField("effective_to", event.target.value)}
                      disabled={saving}
                      className={cn(
                        "h-10 rounded-lg bg-background",
                        locale === "ar" ? "pl-9" : "pr-9",
                        fieldErrors.effective_to && "border-red-300",
                      )}
                    />
                  </div>
                  {fieldErrors.effective_to ? (
                    <p className="text-xs text-red-600">{fieldErrors.effective_to}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.description}</label>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder={t.descriptionPlaceholder}
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
                        getStatusClass(form.status),
                      )}
                    >
                      {statusLabel(form.status, locale)}
                    </Badge>
                  </div>
                </div>

                <ReadinessItem ready={readiness.basicData} label={t.basicData} />
                <ReadinessItem ready={readiness.rateReady} label={t.rateReady} />
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
                      {t.type}:{" "}
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          getTypeClass(form.type),
                        )}
                      >
                        {typeLabel(form.type, locale)}
                      </Badge>
                    </p>
                    <p>
                      {t.rate}:{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {form.rate ? formatPercent(form.rate) : "—"}
                      </span>
                    </p>
                    <p>
                      {t.effectiveFrom}:{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {formatDate(form.effective_from)}
                      </span>
                    </p>
                    <p>
                      {t.effectiveTo}:{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {formatDate(form.effective_to)}
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