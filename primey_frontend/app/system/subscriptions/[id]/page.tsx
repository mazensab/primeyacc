"use client";

/* ============================================================
   📂 primey_frontend/app/system/subscriptions/[id]/page.tsx
   💳 PrimeyAcc — System Subscription Detail
   ------------------------------------------------------------
   ✅ Premium PrimeyCare detail pattern adapted for PrimeyAcc
   ✅ Real API only: GET /api/system/subscriptions/{id}/
   ✅ Detail cards + printable report
   ✅ Refresh, print, PDF through browser print dialog
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ Arabic/English via primey-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  Copy,
  FileText,
  Hash,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type CompanyRecord = {
  id: string;
  name: string;
  code: string;
  status: string;
  owner: string;
  activity: string;
  subscription: string;
  email: string;
  phone: string;
  city: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
};

const API_ENDPOINT = "/api/system/subscriptions/";

const translations = {
  ar: {
    title: "تفاصيل الاشتراك",
    subtitle:
      "عرض تفاصيل اشتراك الشركة داخل إدارة منصة PrimeyAcc مع بيانات الشركة والخطة والحالة والدورة والقيمة والتواريخ.",
    badge: "إدارة المنصة",
    backToCompanies: "العودة للاشتراكات",
    companiesList: "قائمة الاشتراكات",
    systemDashboard: "لوحة النظام",
    refresh: "تحديث",
    print: "طباعة",
    pdf: "PDF",
    copyId: "نسخ المعرف",
    copied: "تم النسخ.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    refreshed: "تم تحديث تفاصيل الاشتراك.",

    identity: "بيانات التعريف",
    identityDesc: "اسم الشركة والكود والمعرف الداخلي.",
    contact: "بيانات التواصل",
    contactDesc: "بيانات العملة وتاريخ البداية وتاريخ الانتهاء والملاحظات.",
    operations: "الخطة والدورة والقيمة",
    operationsDesc: "حالة الاشتراك والخطة ودورة الفوترة والقيمة.",
    notes: "ملاحظات",
    notesDesc: "ملاحظات إدارية داخلية عند توفرها.",
    quickLinks: "روابط سريعة",
    quickLinksDesc: "تنقل سريع داخل وحدة الشركات.",

    companyName: "اسم الشركة",
    companyCode: "كود الاشتراك",
    companyId: "معرف الشركة",
    owner: "الخطة",
    email: "العملة",
    phone: "رقم الجوال",
    city: "تاريخ الانتهاء",
    activity: "دورة الفوترة",
    subscription: "القيمة",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",

    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    trial: "تجريبي",
    pending: "معلق",
    draft: "مسودة",
    cancelled: "ملغي",
    expired: "منتهي",
    past_due: "متأخر",
    unknown: "غير محدد",
    notAvailable: "غير متوفر",

    reportTitle: "تقرير تفاصيل شركة PrimeyAcc",
    generatedAt: "تاريخ الطباعة",

    errorTitle: "تعذر تحميل تفاصيل الاشتراك",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    emptyTitle: "لا توجد بيانات للشركة",
    emptyDesc: "لم يرجع API بيانات صالحة لهذه الشركة.",
    tryAgain: "إعادة المحاولة",
  },
  en: {
    title: "Subscription details",
    subtitle:
      "View the company subscription inside PrimeyAcc platform management with company, plan, status, billing cycle, value, and dates.",
    badge: "Platform management",
    backToCompanies: "Back to subscriptions",
    companiesList: "Subscriptions list",
    systemDashboard: "System dashboard",
    refresh: "Refresh",
    print: "Print",
    pdf: "PDF",
    copyId: "Copy ID",
    copied: "Copied.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    refreshed: "Subscription details refreshed.",

    identity: "Identity",
    identityDesc: "Company name, code, and internal identifier.",
    contact: "Contact details",
    contactDesc: "Owner, email, phone, and city.",
    operations: "Plan, cycle, and value",
    operationsDesc: "Subscription status, plan, billing cycle, and value.",
    notes: "Notes",
    notesDesc: "Internal administrative notes when available.",
    quickLinks: "Quick links",
    quickLinksDesc: "Quick navigation inside the companies module.",

    companyName: "Company name",
    companyCode: "Company code",
    companyId: "Company ID",
    owner: "Plan",
    email: "Currency",
    phone: "Start date",
    city: "End date",
    activity: "Billing cycle",
    subscription: "Value",
    status: "Status",
    createdAt: "Created at",
    updatedAt: "Updated at",

    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    trial: "Trial",
    pending: "Pending",
    draft: "Draft",
    cancelled: "Cancelled",
    expired: "Expired",
    past_due: "Past due",
    unknown: "Unknown",
    notAvailable: "Not available",

    reportTitle: "PrimeyAcc Subscription Details Report",
    generatedAt: "Generated at",

    errorTitle: "Could not load subscription details",
    errorDesc:
      "Make sure you are signed in as a system user and the backend is running, then try again.",
    emptyTitle: "No company data",
    emptyDesc: "The API did not return valid data for this company.",
    tryAgain: "Try again",
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
  return String(value).trim() || fallback;
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).replace("T", " ").slice(0, 16);
  }

  return parsed.toISOString().replace("T", " ").slice(0, 16);
}

function normalizeNestedName(
  value: unknown,
  keys: string[] = ["name", "title", "full_name"],
) {
  if (typeof value === "string") return value;
  const record = asRecord(value);

  for (const key of keys) {
    const text = normalizeText(record[key]);
    if (text) return text;
  }

  return "";
}

function normalizeStatus(value: unknown) {
  if (value === null || value === undefined || value === "") return "unknown";
  if (typeof value === "boolean") return value ? "active" : "inactive";

  const text = normalizeText(value).toLowerCase();

  if (!text) return "unknown";
  if (text === "true") return "active";
  if (text === "false") return "inactive";
  if (text === "enabled") return "active";
  if (text === "disabled") return "inactive";

  return text;
}

function extractCompanyPayload(payload: unknown): ApiRecord {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const resultRecord = asRecord(record.result);
  const directSubscription = asRecord(record.subscription);
  const dataSubscription = asRecord(dataRecord.subscription);
  const resultSubscription = asRecord(resultRecord.subscription);
  const directItem = asRecord(record.item || record.record || record.object);
  const dataItem = asRecord(dataRecord.item || dataRecord.record || dataRecord.object);
  const resultItem = asRecord(resultRecord.item || resultRecord.record || resultRecord.object);
  if (Object.keys(directSubscription).length) return directSubscription;
  if (Object.keys(dataSubscription).length) return dataSubscription;
  if (Object.keys(resultSubscription).length) return resultSubscription;
  if (Object.keys(directItem).length) return directItem;
  if (Object.keys(dataItem).length) return dataItem;
  if (Object.keys(resultItem).length) return resultItem;
  if (Object.keys(dataRecord).length) return dataRecord;
  if (Object.keys(resultRecord).length) return resultRecord;
  return record;
}
function normalizeCompany(payload: unknown): CompanyRecord {
  const record = extractCompanyPayload(payload);
  const company = record.company || record.company_ref || record.tenant || record.account_company;
  const plan = record.plan || record.subscription_plan || record.package || record.product;
  const planRecord = asRecord(plan);
  const pricing = asRecord(record.pricing);
  const totals = asRecord(record.totals);
  const amount = normalizeText(
    record.amount ||
      record.price ||
      record.monthly_price ||
      record.subscription_amount ||
      record.total_amount ||
      pricing.amount ||
      pricing.price ||
      totals.amount ||
      totals.total,
    "0",
  );
  const currency = normalizeText(record.currency || pricing.currency || "SAR", "SAR");
  const rawCycle = normalizeText(
    record.billing_cycle || record.cycle || record.period || planRecord.billing_cycle,
    "unknown",
  ).toLowerCase();
  const cycle =
    rawCycle === "month"
      ? "monthly"
      : rawCycle === "year"
        ? "yearly"
        : rawCycle === "semiannual" || rawCycle === "semi-annual"
          ? "semi_annual"
          : rawCycle === "one-time"
            ? "one_time"
            : rawCycle;
  const planName =
    normalizeNestedName(plan, ["name", "plan_name", "title", "display_name"]) ||
    normalizeText(record.plan_name || record.package_name, "—");
  return {
    id: normalizeText(record.id || record.uuid || record.pk || record.slug || record.code),
    name:
      normalizeNestedName(company, ["name", "company_name", "title", "display_name"]) ||
      normalizeText(record.company_name || record.company_title, "—"),
    code: normalizeText(
      record.code ||
        record.subscription_code ||
        record.reference ||
        record.invoice_number ||
        record.uuid ||
        record.id,
      "—",
    ),
    status: normalizeStatus(record.status ?? record.state ?? record.is_active),
    owner: planName,
    activity: cycle || "unknown",
    subscription: `${amount} ${currency}`,
    email: currency,
    phone: normalizeText(record.starts_at || record.start_date || record.started_at || record.valid_from),
    city: normalizeText(record.ends_at || record.end_date || record.expires_at || record.valid_to, "—"),
    notes: normalizeText(record.notes || record.description || record.internal_notes),
    created_at: normalizeText(record.created_at || record.created || record.inserted_at) || null,
    updated_at: normalizeText(record.updated_at || record.modified_at || record.updated || record.last_modified) || null,
  };
}
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let payload: unknown = null;

  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const record = asRecord(payload);
    const message =
      normalizeText(record.message) ||
      normalizeText(record.detail) ||
      normalizeText(record.error) ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (payload || {}) as T;
}

function getStatusLabel(value: string, locale: Locale) {
  const normalized = value.toLowerCase();

  const ar: Record<string, string> = {
    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    trial: "تجريبي",
    pending: "معلق",
    draft: "مسودة",
    cancelled: "ملغي",
    expired: "منتهي",
    past_due: "متأخر",
  };

  const en: Record<string, string> = {
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    trial: "Trial",
    pending: "Pending",
    draft: "Draft",
    cancelled: "Cancelled",
    expired: "Expired",
    past_due: "Past due",
  };

  return locale === "ar" ? ar[normalized] || value : en[normalized] || value;
}

function getStatusClass(value: string) {
  const normalized = value.toLowerCase();

  if (["active", "paid", "confirmed", "ready", "success"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["pending", "trial", "draft", "processing"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["inactive", "failed", "cancelled", "expired", "suspended", "blocked"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StatusBadge({ value, locale }: { value: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getStatusClass(value))}
    >
      {getStatusLabel(value, locale)}
    </Badge>
  );
}

function InfoCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 truncate text-lg font-bold tracking-tight">
            {value}
          </CardTitle>
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      {description ? (
        <CardContent className="pt-0">
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border bg-background p-4">
      <span className="rounded-xl bg-muted p-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 break-words text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function CompanyDetailSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-8 w-72" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-36" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function SystemSubscriptionDetailPage() {
  const params = useParams();
  const companyId = React.useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] || "" : String(value || "");
  }, [params]);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [company, setCompany] = React.useState<CompanyRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ChevronLeft : ArrowRight;

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

  const loadCompany = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!companyId) {
        setError(t.emptyDesc);
        setLoading(false);
        return;
      }

      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const payload = await fetchJson<unknown>(
          makeApiUrl(`${API_ENDPOINT}${encodeURIComponent(companyId)}/`),
        );
        const normalized = normalizeCompany(payload);

        if (!normalized.id && !normalized.name) {
          setCompany(null);
          setError("");
          return;
        }

        setCompany(normalized);

        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, t.emptyDesc, t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadCompany();
  }, [loadCompany]);

  function fallback(value: string | null | undefined) {
    return normalizeText(value, t.notAvailable);
  }

  async function copyCompanyId() {
    if (!company?.id) return;

    try {
      await navigator.clipboard.writeText(company.id);
      toast.success(t.copied);
    } catch {
      toast.error(t.errorDesc);
    }
  }

  function buildPrintableHtml() {
    if (!company) return "";

    const rows = [
      [t.companyName, company.name],
      [t.companyCode, company.code],
      [t.companyId, company.id],
      [t.status, getStatusLabel(company.status, locale)],
      [t.owner, company.owner],
      [t.email, fallback(company.email)],
      [t.phone, fallback(company.phone)],
      [t.city, company.city],
      [t.activity, company.activity],
      [t.subscription, company.subscription],
      [t.createdAt, formatDateTime(company.created_at)],
      [t.updatedAt, formatDateTime(company.updated_at)],
      [t.notes, fallback(company.notes)],
    ];

    return `
      <table>
        <tbody>
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <th>${escapeHtml(label)}</th>
                  <td>${escapeHtml(value)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function openPrintWindow(mode: "print" | "pdf") {
    if (!company) return;

    if (mode === "pdf") {
      toast.info(t.pdfHint);
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1000,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.reportTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 10px;
              font-size: 13px;
              text-align: ${dir === "rtl" ? "right" : "left"};
              vertical-align: top;
            }
            th { width: 220px; background: #f1f5f9; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildPrintableHtml()}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) return <CompanyDetailSkeleton />;

  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-3xl border-destructive/30 bg-card shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => void loadCompany({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!company) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-3xl bg-card shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-muted p-4 text-muted-foreground">
              <CircleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.emptyTitle}</CardTitle>
            <CardDescription>{t.emptyDesc}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="rounded-xl">
              <Link href="/system/subscriptions/list">
                <ListChecks className="h-4 w-4" />
                {t.companiesList}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-4xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.badge}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {company.name || t.title}
                  </h1>
                  <StatusBadge value={company.status} locale={locale} />
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  {t.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system/subscriptions">
                    <BackIcon className="h-4 w-4" />
                    {t.backToCompanies}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadCompany({ silent: true })}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("print")}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("pdf")}>
                  <FileText className="h-4 w-4" />
                  {t.pdf}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard title={t.companyCode} value={company.code || t.notAvailable} description={t.identity} icon={Hash} />
          <InfoCard title={t.status} value={<StatusBadge value={company.status} locale={locale} />} description={t.operations} icon={ShieldCheck} />
          <InfoCard title={t.activity} value={company.activity || t.notAvailable} description={t.operations} icon={Activity} />
          <InfoCard title={t.createdAt} value={formatDateTime(company.created_at)} description={t.identity} icon={CalendarDays} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.identity}</CardTitle>
                <CardDescription>{t.identityDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <DetailRow label={t.companyName} value={company.name || t.notAvailable} icon={Building2} />
                <DetailRow label={t.companyCode} value={company.code || t.notAvailable} icon={Hash} />
                <DetailRow
                  label={t.companyId}
                  value={
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs">{company.id || t.notAvailable}</span>
                      {company.id ? (
                        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg" onClick={copyCompanyId}>
                          <Copy className="h-3.5 w-3.5" />
                          {t.copyId}
                        </Button>
                      ) : null}
                    </div>
                  }
                  icon={Hash}
                />
                <DetailRow label={t.updatedAt} value={formatDateTime(company.updated_at)} icon={CalendarDays} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.contact}</CardTitle>
                <CardDescription>{t.contactDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <DetailRow label={t.owner} value={fallback(company.owner)} icon={UserRound} />
                <DetailRow label={t.email} value={fallback(company.email)} icon={Mail} />
                <DetailRow label={t.phone} value={fallback(company.phone)} icon={Phone} />
                <DetailRow label={t.city} value={fallback(company.city)} icon={MapPin} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.operations}</CardTitle>
                <CardDescription>{t.operationsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <DetailRow label={t.status} value={<StatusBadge value={company.status} locale={locale} />} icon={ShieldCheck} />
                <DetailRow label={t.activity} value={fallback(company.activity)} icon={Activity} />
                <DetailRow label={t.subscription} value={fallback(company.subscription)} icon={CheckCircle2} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.notes}</CardTitle>
                <CardDescription>{t.notesDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-24 rounded-2xl border bg-background p-4 text-sm leading-7 text-muted-foreground">
                  {company.notes || t.notAvailable}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="rounded-2xl shadow-sm xl:sticky xl:top-6">
              <CardHeader>
                <CardTitle>{t.quickLinks}</CardTitle>
                <CardDescription>{t.quickLinksDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system/subscriptions/list">
                    <ListChecks className="h-4 w-4" />
                    {t.companiesList}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system/subscriptions">
                    <Building2 className="h-4 w-4" />
                    {t.backToCompanies}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system">
                    <LayoutDashboard className="h-4 w-4" />
                    {t.systemDashboard}
                  </Link>
                </Button>
                <Button type="button" variant="outline" className="justify-start rounded-xl bg-background" onClick={() => openPrintWindow("print")}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button type="button" variant="outline" className="justify-start rounded-xl bg-background" onClick={() => openPrintWindow("pdf")}>
                  <FileText className="h-4 w-4" />
                  {t.pdf}
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}






