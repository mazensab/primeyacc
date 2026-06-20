"use client";

/* ============================================================
   📂 app/system/accounting/tax-rates/[id]/page.tsx
   🧾 Primey Care — Tax Rate Details
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders detail pattern
   ✅ Real API:
      GET /api/accounting/tax-rates/{id}/
      fallback:
      GET /api/accounting/taxes/{id}/
      GET /api/accounting/vat-rates/{id}/
   ✅ Profile side card + main detail content
   ✅ KPI cards
   ✅ Copy / Excel .xls / Web print
   ✅ Skeleton loading
   ✅ Error / Not Found states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Info,
  Loader2,
  Percent,
  Printer,
  RefreshCw,
  ShieldCheck,
  Tag,
  TriangleAlert,
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
  id?: unknown;
  pk?: unknown;
  uuid?: unknown;
  data?: unknown;
  item?: unknown;
  tax_rate?: unknown;
  tax?: unknown;
  vat_rate?: unknown;
  result?: unknown;
  summary?: unknown;
};

type TaxType = "vat" | "withholding" | "sales" | "service" | "other";
type TaxStatus = "active" | "inactive" | "draft" | "archived" | "unknown";

type TaxRateRecord = {
  id: string;
  code: string;
  name: string;
  type: TaxType;
  type_label: string;
  rate: number;
  percentage: number;
  status: TaxStatus;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  description: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
};

const translations = {
  ar: {
    title: "تفاصيل معدل الضريبة",
    subtitle: "عرض بيانات معدل الضريبة وحالته ونطاق صلاحيته.",
    back: "معدلات الضريبة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    copy: "نسخ",
    copied: "تم النسخ.",

    profileTitle: "بطاقة الضريبة",
    profileDesc: "ملخص معدل الضريبة الحالي.",
    detailsTitle: "بيانات معدل الضريبة",
    detailsDesc: "معلومات الضريبة الأساسية ونطاق التطبيق.",
    operationalTitle: "معلومات تشغيلية",
    operationalDesc: "تواريخ الإنشاء والتحديث والملاحظات.",

    rateCard: "نسبة الضريبة",
    statusCard: "الحالة",
    typeCard: "النوع",
    validityCard: "نطاق الصلاحية",

    name: "اسم الضريبة",
    code: "الكود",
    type: "النوع",
    rate: "النسبة",
    status: "الحالة",
    effectiveFrom: "تاريخ البداية",
    effectiveTo: "تاريخ النهاية",
    description: "الوصف",
    notes: "الملاحظات",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    activeFlag: "نشط",
    inactiveFlag: "غير نشط",

    active: "نشط",
    inactive: "غير نشط",
    draft: "مسودة",
    archived: "مؤرشف",
    unknown: "غير محدد",

    vat: "ضريبة القيمة المضافة",
    withholding: "ضريبة استقطاع",
    sales: "ضريبة مبيعات",
    service: "ضريبة خدمات",
    other: "أخرى",

    valid: "ساري",
    notLimited: "غير محدد",
    from: "من",
    to: "إلى",

    errorTitle: "تعذر تحميل تفاصيل معدل الضريبة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    notFoundTitle: "معدل الضريبة غير موجود",
    notFoundDesc: "لم يتم العثور على معدل الضريبة المطلوب أو ربما تم حذفه.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث تفاصيل معدل الضريبة.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير تفاصيل معدل الضريبة",
    generatedAt: "تاريخ الطباعة",
    notAvailable: "—",
  },
  en: {
    title: "Tax Rate Details",
    subtitle: "View tax rate details, status, and validity range.",
    back: "Tax rates",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    copy: "Copy",
    copied: "Copied.",

    profileTitle: "Tax card",
    profileDesc: "Current tax rate summary.",
    detailsTitle: "Tax rate details",
    detailsDesc: "Main tax information and application range.",
    operationalTitle: "Operational information",
    operationalDesc: "Creation, update dates, and notes.",

    rateCard: "Tax rate",
    statusCard: "Status",
    typeCard: "Type",
    validityCard: "Validity range",

    name: "Tax name",
    code: "Code",
    type: "Type",
    rate: "Rate",
    status: "Status",
    effectiveFrom: "Effective from",
    effectiveTo: "Effective to",
    description: "Description",
    notes: "Notes",
    createdAt: "Created at",
    updatedAt: "Updated at",
    activeFlag: "Active",
    inactiveFlag: "Inactive",

    active: "Active",
    inactive: "Inactive",
    draft: "Draft",
    archived: "Archived",
    unknown: "Unknown",

    vat: "VAT",
    withholding: "Withholding tax",
    sales: "Sales tax",
    service: "Service tax",
    other: "Other",

    valid: "Valid",
    notLimited: "Not limited",
    from: "From",
    to: "To",

    errorTitle: "Unable to load tax rate details",
    errorDesc: "Make sure the backend is running, then try again.",
    notFoundTitle: "Tax rate not found",
    notFoundDesc: "The requested tax rate was not found or may have been deleted.",
    tryAgain: "Try again",
    refreshed: "Tax rate details refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Tax rate details report",
    generatedAt: "Generated at",
    notAvailable: "—",
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

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (["1", "true", "yes", "on", "active", "enabled"].includes(normalized)) {
      return true;
    }

    if (
      ["0", "false", "no", "off", "inactive", "disabled", "archived"].includes(
        normalized,
      )
    ) {
      return false;
    }
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

function formatDateTime(value: string | null | undefined) {
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

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
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

function extractObject(payload: ApiResponse) {
  const candidates = [
    payload.tax_rate,
    payload.tax,
    payload.vat_rate,
    payload.item,
    payload.data,
    payload.result,
    payload.summary,
  ];

  for (const candidate of candidates) {
    if (isRecord(candidate)) return candidate;
  }

  return {};
}

function normalizeTaxType(value: unknown): TaxType {
  const type = normalizeText(value).toLowerCase();

  if (["vat", "value_added_tax", "value-added-tax", "tax_vat"].includes(type)) {
    return "vat";
  }

  if (["withholding", "withholding_tax", "wht"].includes(type)) {
    return "withholding";
  }

  if (["sales", "sales_tax"].includes(type)) {
    return "sales";
  }

  if (["service", "service_tax"].includes(type)) {
    return "service";
  }

  return "other";
}

function normalizeStatus(value: unknown, isActive: boolean): TaxStatus {
  const status = normalizeText(value).toLowerCase();

  if (["active", "enabled", "open"].includes(status)) return "active";
  if (["inactive", "disabled"].includes(status)) return "inactive";
  if (["draft", "pending", "new"].includes(status)) return "draft";
  if (["archived", "archive"].includes(status)) return "archived";

  return isActive ? "active" : "inactive";
}

function normalizeTaxRate(value: unknown, fallbackId = ""): TaxRateRecord {
  const item = asRecord(value);
  const id = normalizeText(item.id || item.pk || item.uuid || fallbackId);

  const isActive = toBoolean(item.is_active ?? item.active ?? item.enabled, true);
  const type = normalizeTaxType(item.type || item.tax_type || item.category);
  const rateValue = toNumber(
    item.rate ??
      item.percentage ??
      item.tax_rate ??
      item.tax_percentage ??
      item.value,
  );

  return {
    id,
    code: normalizeText(item.code || item.tax_code || item.slug),
    name:
      normalizeText(item.name || item.title || item.label || item.name_ar || item.name_en) ||
      (id ? `#${id}` : ""),
    type,
    type_label: normalizeText(item.type_label || item.tax_type_label || item.category_label),
    rate: rateValue,
    percentage: rateValue,
    status: normalizeStatus(item.status || item.tax_status, isActive),
    is_active: isActive,
    effective_from:
      normalizeText(
        item.effective_from ||
          item.valid_from ||
          item.start_date ||
          item.starts_at,
      ) || null,
    effective_to:
      normalizeText(
        item.effective_to ||
          item.valid_until ||
          item.end_date ||
          item.ends_at,
      ) || null,
    description: normalizeText(item.description || item.details),
    notes: normalizeText(item.notes || item.internal_notes || item.description || item.details),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function typeLabel(type: TaxType, locale: Locale) {
  const t = translations[locale];

  if (type === "vat") return t.vat;
  if (type === "withholding") return t.withholding;
  if (type === "sales") return t.sales;
  if (type === "service") return t.service;

  return t.other;
}

function statusLabel(status: TaxStatus, locale: Locale) {
  const t = translations[locale];

  if (status === "active") return t.active;
  if (status === "inactive") return t.inactive;
  if (status === "draft") return t.draft;
  if (status === "archived") return t.archived;

  return t.unknown;
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

  if (status === "archived") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
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

function StatusBadge({ status, locale }: { status: TaxStatus; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getStatusClass(status))}
    >
      {statusLabel(status, locale)}
    </Badge>
  );
}

function TypeBadge({ type, locale }: { type: TaxType; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getTypeClass(type))}
    >
      {typeLabel(type, locale)}
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

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-left text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function DetailsSkeleton() {
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

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-24 w-full" />
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="rounded-lg border bg-card shadow-none">
                <CardHeader className="min-h-[112px] px-6 py-5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-5 w-20" />
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="space-y-3 p-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AccountingTaxRateDetailsPage() {
  const params = useParams<{ id?: string }>();
  const taxRateId = decodeURIComponent(String(params?.id || ""));

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [taxRate, setTaxRate] = React.useState<TaxRateRecord | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notFound, setNotFound] = React.useState(false);

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

  const loadTaxRateDetails = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");
        setNotFound(false);

        const endpoints = [
          `/api/accounting/tax-rates/${taxRateId}/`,
          `/api/accounting/taxes/${taxRateId}/`,
          `/api/accounting/vat-rates/${taxRateId}/`,
        ];

        let payload: ApiResponse | null = null;
        let lastError: unknown = null;

        for (const endpoint of endpoints) {
          try {
            payload = await fetchJson<ApiResponse>(makeApiUrl(endpoint), controller.signal);
            break;
          } catch (caughtError) {
            lastError = caughtError;
          }
        }

        if (!payload) {
          const message = lastError instanceof Error ? lastError.message : "";

          if (message.includes("404") || message.toLowerCase().includes("not found")) {
            setNotFound(true);
            setTaxRate(null);
            return;
          }

          throw lastError instanceof Error ? lastError : new Error(t.errorDesc);
        }

        const record = normalizeTaxRate(extractObject(payload), taxRateId);
        setTaxRate(record);

        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [taxRateId, t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadTaxRateDetails();
  }, [loadTaxRateDetails]);

  const validityText = React.useMemo(() => {
    if (!taxRate) return t.notAvailable;

    const from = formatDate(taxRate.effective_from);
    const to = formatDate(taxRate.effective_to);

    if (from === "—" && to === "—") return t.notLimited;
    if (from !== "—" && to !== "—") return `${t.from} ${from} ${t.to} ${to}`;
    if (from !== "—") return `${t.from} ${from}`;
    return `${t.to} ${to}`;
  }, [t, taxRate]);

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.success(t.copied);
    }
  }

  function buildExportRows() {
    if (!taxRate) return [];

    return [
      { label: t.name, value: taxRate.name || t.notAvailable },
      { label: t.code, value: taxRate.code || t.notAvailable },
      { label: t.type, value: typeLabel(taxRate.type, locale) },
      { label: t.rate, value: formatPercent(taxRate.rate) },
      { label: t.status, value: statusLabel(taxRate.status, locale) },
      { label: t.effectiveFrom, value: formatDate(taxRate.effective_from) },
      { label: t.effectiveTo, value: formatDate(taxRate.effective_to) },
      { label: t.description, value: taxRate.description || t.notAvailable },
      { label: t.notes, value: taxRate.notes || t.notAvailable },
      { label: t.createdAt, value: formatDateTime(taxRate.created_at) },
      { label: t.updatedAt, value: formatDateTime(taxRate.updated_at) },
    ];
  }

  function exportExcel() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; direction: ${dir}; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d9d9d9; padding: 8px; text-align: ${locale === "ar" ? "right" : "left"}; }
            th { background: #f3f4f6; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.printTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.name)}</th>
                <th>${escapeHtml(t.description)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.label)}</td>
                      <td>${escapeHtml(row.value)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `primey-care-tax-rate-${taxRate?.code || taxRateId}-${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }

    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
      toast.error(t.printEmpty);
      return;
    }

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
            .summary {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
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
            .box strong { font-size: 16px; }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-bottom: 18px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 9px;
              text-align: ${locale === "ar" ? "right" : "left"};
              vertical-align: top;
            }
            th {
              background: #f9fafb;
              color: #374151;
              font-weight: 700;
            }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Primey Care - ${escapeHtml(t.printTitle)}</h1>
              <p>${escapeHtml(t.name)}: ${escapeHtml(taxRate?.name || "")}</p>
              <p>${escapeHtml(t.code)}: ${escapeHtml(taxRate?.code || taxRate?.id || "")}</p>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.rateCard)}</span><strong>${escapeHtml(formatPercent(taxRate?.rate || 0))}</strong></div>
            <div class="box"><span>${escapeHtml(t.statusCard)}</span><strong>${escapeHtml(statusLabel(taxRate?.status || "unknown", locale))}</strong></div>
            <div class="box"><span>${escapeHtml(t.typeCard)}</span><strong>${escapeHtml(typeLabel(taxRate?.type || "other", locale))}</strong></div>
            <div class="box"><span>${escapeHtml(t.validityCard)}</span><strong>${escapeHtml(validityText)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.name)}</th>
                <th>${escapeHtml(t.description)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.label)}</td>
                      <td>${escapeHtml(row.value)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

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
        <DetailsSkeleton />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted/40">
              <XCircle className="h-7 w-7 text-muted-foreground" />
            </div>

            <div className="space-y-1">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {t.notFoundTitle}
              </h1>
              <p className="text-sm text-muted-foreground">{t.notFoundDesc}</p>
            </div>

            <Button asChild variant="outline" className="h-9 rounded-lg">
              <Link href="/system/accounting/tax-rates">
                <BackIcon className="h-4 w-4" />
                {t.back}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-right">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {taxRate?.name || t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/accounting/tax-rates">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadTaxRateDetails({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            {t.export}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>
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
              onClick={() => void loadTaxRateDetails()}
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
            <CardHeader className="px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{t.profileTitle}</CardTitle>
                  <CardDescription>{t.profileDesc}</CardDescription>
                </div>

                <CardAction>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                    <BadgePercent className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardAction>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6">
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">
                      {taxRate?.name || t.notAvailable}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground tabular-nums">
                      {taxRate?.code || taxRate?.id || t.notAvailable}
                    </p>
                  </div>

                  <StatusBadge status={taxRate?.status || "unknown"} locale={locale} />
                </div>
              </div>

              <DetailLine
                label={t.code}
                value={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:underline"
                    onClick={() => void copyValue(taxRate?.code || taxRate?.id || "")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {taxRate?.code || taxRate?.id || t.notAvailable}
                  </button>
                }
              />

              <DetailLine
                label={t.type}
                value={<TypeBadge type={taxRate?.type || "other"} locale={locale} />}
              />

              <DetailLine
                label={t.rate}
                value={
                  <span className="tabular-nums">
                    {formatPercent(taxRate?.rate || 0)}
                  </span>
                }
              />

              <DetailLine
                label={t.status}
                value={<StatusBadge status={taxRate?.status || "unknown"} locale={locale} />}
              />

              <DetailLine
                label={t.activeFlag}
                value={
                  taxRate?.is_active ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      {t.activeFlag}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      <XCircle className="h-4 w-4" />
                      {t.inactiveFlag}
                    </span>
                  )
                }
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.operationalTitle}</CardTitle>
              <CardDescription>{t.operationalDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6">
              <DetailLine
                label={t.createdAt}
                value={<span className="tabular-nums">{formatDateTime(taxRate?.created_at)}</span>}
              />

              <DetailLine
                label={t.updatedAt}
                value={<span className="tabular-nums">{formatDateTime(taxRate?.updated_at)}</span>}
              />

              <div className="rounded-lg border bg-background p-4">
                <p className="mb-2 text-sm font-medium text-foreground">{t.notes}</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {taxRate?.notes || t.notAvailable}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={t.rateCard}
              value={formatPercent(taxRate?.rate || 0)}
              trend={t.rate}
              icon={Percent}
            />

            <KpiCard
              title={t.statusCard}
              value={statusLabel(taxRate?.status || "unknown", locale)}
              trend={taxRate?.is_active ? t.activeFlag : t.inactiveFlag}
              icon={taxRate?.is_active ? CheckCircle2 : XCircle}
            />

            <KpiCard
              title={t.typeCard}
              value={typeLabel(taxRate?.type || "other", locale)}
              trend={taxRate?.code || t.type}
              icon={Tag}
            />

            <KpiCard
              title={t.validityCard}
              value={validityText}
              trend={t.valid}
              icon={CalendarDays}
            />
          </div>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{t.detailsTitle}</CardTitle>
                  <CardDescription>{t.detailsDesc}</CardDescription>
                </div>

                <CardAction>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                    <Info className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardAction>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailLine label={t.name} value={taxRate?.name || t.notAvailable} />
                <DetailLine label={t.code} value={taxRate?.code || taxRate?.id || t.notAvailable} />
                <DetailLine
                  label={t.type}
                  value={typeLabel(taxRate?.type || "other", locale)}
                />
                <DetailLine
                  label={t.rate}
                  value={<span className="tabular-nums">{formatPercent(taxRate?.rate || 0)}</span>}
                />
                <DetailLine
                  label={t.status}
                  value={statusLabel(taxRate?.status || "unknown", locale)}
                />
                <DetailLine label={t.validityCard} value={validityText} />
                <DetailLine
                  label={t.effectiveFrom}
                  value={<span className="tabular-nums">{formatDate(taxRate?.effective_from)}</span>}
                />
                <DetailLine
                  label={t.effectiveTo}
                  value={<span className="tabular-nums">{formatDate(taxRate?.effective_to)}</span>}
                />
              </div>

              <div className="rounded-lg border bg-background p-4">
                <p className="mb-2 text-sm font-medium text-foreground">{t.description}</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {taxRate?.description || t.notAvailable}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.validityCard}</CardTitle>
              <CardDescription>{validityText}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 px-6 pb-6 md:grid-cols-2">
              <div className="rounded-lg border bg-background p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {t.effectiveFrom}
                </div>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {formatDate(taxRate?.effective_from)}
                </p>
              </div>

              <div className="rounded-lg border bg-background p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {t.effectiveTo}
                </div>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {formatDate(taxRate?.effective_to)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}