"use client";

/* ============================================================
   📂 app/system/centers/[id]/page.tsx
   🧠 Primey Care | Center Details
   ------------------------------------------------------------
   ✅ المسار: /system/centers/[id]
   ✅ الإصدار: v1.1.0 - UX Refinement

   ✅ العمل:
      عرض تفاصيل مركز / مقدم خدمة.

   ✅ API:
      GET /api/providers/{id}/

   ✅ ملاحظات UX:
      - لا يتم إظهار المسارات التقنية أو أسماء API داخل واجهة المستخدم.
      - لا يتم عرض زر حذف نهائي داخل صفحة التفاصيل.
      - لا يتم عرض زر تعديل معطل إلى حين اعتماد صفحة التعديل.
      - الصفحة تستخدم عرض المساحة بالكامل.
      - يوجد Error State مستقل عن Not Found.
      - يوجد Skeleton Loading كامل.
      - يوجد نسخ سريع للكود والجوال والبريد.
      - الأقسام المرتبطة تظهر كأقسام تشغيلية واضحة وليست أزرار وهمية.

   ✅ الوظائف:
      - عرض بيانات المركز
      - تحديث البيانات
      - نسخ الكود / الجوال / البريد
      - فتح الموقع والخرائط إذا كانت الروابط صالحة
      - دعم عربي / إنجليزي عبر primey-locale
      - استخدام sonner للتنبيهات
      - بدون localhost hardcoded
      - الحفاظ على تصميم Primey Care الرسمي
============================================================ */

import type { ComponentType } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  ShieldCheck,
  Star,
  Wallet,
  XCircle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

/* ============================================================
   Types
============================================================ */

type AppLocale = "ar" | "en";

type ProviderStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "DRAFT"
  | "UNKNOWN";

type ProviderType =
  | "HOSPITAL"
  | "MEDICAL_CENTER"
  | "PHARMACY"
  | "PARTNER"
  | "LAB"
  | "CLINIC"
  | "OTHER"
  | "UNKNOWN";

type CenterDetail = {
  id: number | string;
  name: string;
  code: string;
  providerType: ProviderType;
  status: ProviderStatus;
  contactPerson: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  city: string;
  area: string;
  address: string;
  googleMapsLink: string;
  notes: string;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  raw: Record<string, unknown>;
};

type ProviderDetailResponse = {
  ok?: boolean;
  message?: string;
  data?: unknown;
  provider?: unknown;
  center?: unknown;
};

/* ============================================================
   Locale Helpers
============================================================ */

function readLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const savedLocale = window.localStorage.getItem("primey-locale");

    if (savedLocale === "en") return "en";
    if (savedLocale === "ar") return "ar";

    return document.documentElement.lang === "en" ? "en" : "ar";
  } catch (error) {
    console.error("Read locale error:", error);
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

function formatNumber(value: number | string): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return "0";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function formatDate(value: string): string {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return value || "-";
  }
}

/* ============================================================
   API Normalizers
============================================================ */

function normalizeStatus(value: unknown): ProviderStatus {
  const status = String(value || "").toUpperCase();

  if (status === "ACTIVE") return "ACTIVE";
  if (status === "INACTIVE") return "INACTIVE";
  if (status === "SUSPENDED") return "SUSPENDED";
  if (status === "DRAFT") return "DRAFT";

  if (value === true) return "ACTIVE";
  if (value === false) return "INACTIVE";

  return "UNKNOWN";
}

function normalizeProviderType(value: unknown): ProviderType {
  const providerType = String(value || "").toUpperCase();

  if (providerType === "HOSPITAL") return "HOSPITAL";
  if (providerType === "MEDICAL_CENTER") return "MEDICAL_CENTER";
  if (providerType === "PHARMACY") return "PHARMACY";
  if (providerType === "PARTNER") return "PARTNER";
  if (providerType === "LAB") return "LAB";
  if (providerType === "CLINIC") return "CLINIC";
  if (providerType === "OTHER") return "OTHER";

  return "UNKNOWN";
}

function normalizeCenterDetail(payload: unknown): CenterDetail {
  const wrapper = (payload || {}) as ProviderDetailResponse;
  const obj = ((wrapper.data ||
    wrapper.provider ||
    wrapper.center ||
    payload ||
    {}) as Record<string, unknown>);

  return {
    id: (obj.id ?? "") as number | string,
    name: String(obj.name ?? obj.title ?? "-"),
    code: String(obj.code ?? obj.provider_code ?? "-"),
    providerType: normalizeProviderType(
      obj.provider_type ?? obj.type ?? obj.category,
    ),
    status: normalizeStatus(obj.status ?? obj.is_active),
    contactPerson: String(obj.contact_person ?? obj.contact_name ?? ""),
    phone: String(obj.phone ?? ""),
    mobile: String(obj.mobile ?? obj.phone_number ?? ""),
    email: String(obj.email ?? ""),
    website: String(obj.website ?? ""),
    city: String(obj.city ?? ""),
    area: String(obj.area ?? obj.region ?? ""),
    address: String(obj.address ?? ""),
    googleMapsLink: String(obj.google_maps_link ?? obj.map_url ?? ""),
    notes: String(obj.notes ?? ""),
    isFeatured: Boolean(obj.is_featured ?? obj.featured),
    createdAt: String(obj.created_at ?? ""),
    updatedAt: String(obj.updated_at ?? ""),
    raw: obj,
  };
}

/* ============================================================
   Dictionary
============================================================ */

function dictionary(locale: AppLocale) {
  const isArabic = locale === "ar";

  return {
    title: isArabic ? "تفاصيل المركز" : "Center Details",
    subtitle: isArabic
      ? "مراجعة بيانات المركز الأساسية ومعلومات التواصل والموقع والحالة التشغيلية."
      : "Review center information, contact details, location, and operational status.",

    back: isArabic ? "قائمة المراكز" : "Centers List",
    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",

    apiError: isArabic
      ? "تعذر تحميل تفاصيل المركز."
      : "Unable to load center details.",
    apiErrorHint: isArabic
      ? "تحقق من الاتصال أو الصلاحيات ثم أعد المحاولة."
      : "Check the connection or permissions, then try again.",
    refreshSuccess: isArabic
      ? "تم تحديث بيانات المركز بنجاح."
      : "Center details refreshed successfully.",

    notFound: isArabic
      ? "لم يتم العثور على بيانات المركز"
      : "Center data was not found",
    notFoundHint: isArabic
      ? "قد يكون السجل غير موجود أو لم يعد متاحًا."
      : "The record may not exist or may no longer be available.",

    contact: isArabic ? "المسؤول" : "Contact",
    createdAtShort: isArabic ? "تاريخ الإنشاء" : "Created At",
    codeShort: isArabic ? "الكود" : "Code",

    profileDesc: isArabic
      ? "مراجعة بيانات المركز الأساسية ومعلومات التواصل والموقع."
      : "Review basic center information, contact details, and location.",

    details: isArabic ? "البيانات التفصيلية" : "Detailed Information",
    basicSection: isArabic ? "البيانات الأساسية" : "Basic Information",
    contactSection: isArabic ? "بيانات التواصل" : "Contact Information",
    locationSection: isArabic ? "بيانات الموقع" : "Location Information",
    systemSection: isArabic ? "بيانات السجل" : "Record Information",

    relatedSections: isArabic ? "الأقسام المرتبطة" : "Related Sections",
    relatedDesc: isArabic
      ? "أقسام تساعدك على متابعة ارتباطات المركز داخل النظام."
      : "Sections that help you follow this center's operational connections.",

    notes: isArabic ? "ملاحظات" : "Notes",
    noNotes: isArabic ? "لا توجد ملاحظات." : "No notes available.",

    profileCompletion: isArabic ? "اكتمال الملف" : "Profile Completion",

    copied: isArabic ? "تم النسخ بنجاح" : "Copied successfully",
    unavailable: isArabic ? "غير متوفر" : "Unavailable",
    open: isArabic ? "فتح" : "Open",
    copy: isArabic ? "نسخ" : "Copy",

    fields: {
      id: isArabic ? "رقم المركز" : "Center ID",
      name: isArabic ? "اسم المركز" : "Center Name",
      code: isArabic ? "الكود" : "Code",
      providerType: isArabic ? "نوع الجهة" : "Provider Type",
      status: isArabic ? "الحالة" : "Status",
      contactPerson: isArabic ? "الشخص المسؤول" : "Contact Person",
      phone: isArabic ? "الهاتف" : "Phone",
      mobile: isArabic ? "الجوال" : "Mobile",
      email: isArabic ? "البريد الإلكتروني" : "Email",
      website: isArabic ? "الموقع الإلكتروني" : "Website",
      city: isArabic ? "المدينة" : "City",
      area: isArabic ? "الحي / المنطقة" : "Area",
      address: isArabic ? "العنوان" : "Address",
      maps: isArabic ? "خرائط جوجل" : "Google Maps",
      featured: isArabic ? "مركز مميز" : "Featured Center",
      createdAt: isArabic ? "تاريخ الإنشاء" : "Created At",
      updatedAt: isArabic ? "آخر تحديث" : "Updated At",
    },

    active: isArabic ? "نشط" : "Active",
    inactive: isArabic ? "غير نشط" : "Inactive",
    suspended: isArabic ? "موقوف" : "Suspended",
    draft: isArabic ? "مسودة" : "Draft",
    unknown: isArabic ? "غير محدد" : "Unknown",

    yes: isArabic ? "نعم" : "Yes",
    no: isArabic ? "لا" : "No",

    typeLabels: {
      HOSPITAL: isArabic ? "مستشفى" : "Hospital",
      MEDICAL_CENTER: isArabic ? "مركز طبي" : "Medical Center",
      PHARMACY: isArabic ? "صيدلية" : "Pharmacy",
      PARTNER: isArabic ? "شريك" : "Partner",
      LAB: isArabic ? "مختبر" : "Lab",
      CLINIC: isArabic ? "عيادة" : "Clinic",
      OTHER: isArabic ? "أخرى" : "Other",
      UNKNOWN: isArabic ? "غير محدد" : "Unknown",
    } satisfies Record<ProviderType, string>,

    cards: {
      contracts: isArabic ? "العقود" : "Contracts",
      contractsDesc: isArabic
        ? "متابعة العقود المرتبطة بهذا المركز."
        : "Track contracts connected to this center.",

      services: isArabic ? "الخدمات" : "Services",
      servicesDesc: isArabic
        ? "متابعة الخدمات والباقات المتاحة من هذا المركز."
        : "Track services and packages available from this center.",

      payments: isArabic ? "المدفوعات" : "Payments",
      paymentsDesc: isArabic
        ? "متابعة المدفوعات والحركات المالية المرتبطة."
        : "Track related payments and financial activity.",

      orders: isArabic ? "الطلبات" : "Orders",
      ordersDesc: isArabic
        ? "متابعة الطلبات التشغيلية المرتبطة بالمركز."
        : "Track operational orders connected to this center.",
    },
  };
}

/* ============================================================
   UI Helpers
============================================================ */

function getStatusLabel(status: ProviderStatus, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<ProviderStatus, string> = {
    ACTIVE: t.active,
    INACTIVE: t.inactive,
    SUSPENDED: t.suspended,
    DRAFT: t.draft,
    UNKNOWN: t.unknown,
  };

  return labels[status];
}

function statusBadge(status: ProviderStatus, locale: AppLocale) {
  const label = getStatusLabel(status, locale);

  if (status === "ACTIVE") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (status === "DRAFT") {
    return (
      <Badge className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
        {label}
      </Badge>
    );
  }

  if (status === "SUSPENDED") {
    return (
      <Badge className="rounded-full border-orange-200 bg-orange-50 px-3 py-1 text-orange-700 hover:bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300">
        {label}
      </Badge>
    );
  }

  if (status === "INACTIVE") {
    return (
      <Badge variant="outline" className="rounded-full px-3 py-1">
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

function isValidExternalLink(value?: string) {
  if (!value) return false;
  return value.startsWith("https://") || value.startsWith("http://");
}

function isValidCenterId(id: CenterDetail["id"]) {
  const value = String(id || "").trim();
  return value.length > 0 && value !== "-" && value !== "undefined";
}

function calculateProfileCompleteness(center: CenterDetail) {
  const fields = [
    center.name,
    center.code,
    center.providerType,
    center.status,
    center.contactPerson,
    center.phone || center.mobile,
    center.email,
    center.city,
    center.area,
    center.address,
    center.website,
    center.googleMapsLink,
  ];

  const completed = fields.filter((field) => {
    const value = String(field || "").trim();
    return value.length > 0 && value !== "-" && value !== "UNKNOWN";
  }).length;

  return Math.round((completed / fields.length) * 100);
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-muted ${className}`} />;
}

function DetailsSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-3">
          <SkeletonLine className="h-8 w-56" />
          <SkeletonLine className="h-4 w-[420px] max-w-full" />
          <SkeletonLine className="h-4 w-72 max-w-full" />
        </div>

        <div className="flex gap-2">
          <SkeletonLine className="h-10 w-28 rounded-xl" />
          <SkeletonLine className="h-10 w-24 rounded-xl" />
        </div>
      </div>

      <div className="grid w-full gap-4 xl:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="space-y-4 p-4">
            <SkeletonLine className="h-56 w-full rounded-2xl" />
            <div className="space-y-2">
              <SkeletonLine className="mx-auto h-5 w-44" />
              <SkeletonLine className="mx-auto h-4 w-28" />
              <SkeletonLine className="mx-auto h-7 w-20" />
            </div>
            <SkeletonLine className="h-24 w-full rounded-xl" />
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonLine key={index} className="h-16 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonLine key={index} className="h-24 rounded-xl" />
            ))}
          </div>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardContent className="space-y-3 p-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <SkeletonLine key={index} className="h-9 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Page
============================================================ */

export default function SystemCenterDetailsPage() {
  const params = useParams<{ id: string }>();

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [center, setCenter] = useState<CenterDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const t = useMemo(() => dictionary(locale), [locale]);

  const profileCompleteness = useMemo(() => {
    if (!center) return 0;
    return calculateProfileCompleteness(center);
  }, [center]);

  async function loadCenter(showToast = false) {
    const id = String(params?.id || "").trim();

    if (!id) {
      setCenter(null);
      setErrorMessage(t.apiError);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch(`/api/providers/${id}/`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 404) {
        setCenter(null);
        setErrorMessage("");
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as ProviderDetailResponse;
      const normalized = normalizeCenterDetail(payload);

      setCenter(normalized);

      if (showToast) {
        toast.success(t.refreshSuccess);
      }
    } catch (error) {
      console.error("Failed to load center details:", error);
      setCenter(null);
      setErrorMessage(t.apiError);
      toast.error(t.apiError);
    } finally {
      setIsLoading(false);
    }
  }

  async function copyToClipboard(value: string) {
    const cleanValue = value.trim();

    if (!cleanValue || cleanValue === "-") {
      toast.error(t.unavailable);
      return;
    }

    try {
      await navigator.clipboard.writeText(cleanValue);
      toast.success(t.copied);
    } catch (error) {
      console.error("Copy error:", error);
      toast.error(t.unavailable);
    }
  }

  useEffect(() => {
    const syncLocale = () => {
      const nextLocale = readLocale();

      applyDocumentLocale(nextLocale);
      setLocale(nextLocale);
    };

    const syncAfterPaint = () => {
      syncLocale();

      window.setTimeout(() => {
        syncLocale();
      }, 0);
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
    loadCenter(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id, locale]);

  if (isLoading) {
    return <DetailsSkeleton />;
  }

  if (errorMessage) {
    return (
      <div className="w-full space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
              {t.title}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-4xl text-sm">
              {t.subtitle}
            </p>
          </div>

          <Link href="/system/centers/list">
            <Button variant="outline" className="h-10 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </Button>
          </Link>
        </div>

        <Card className="rounded-2xl border border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <XCircle className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-destructive">
                  {errorMessage}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t.apiErrorHint}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => loadCenter(true)}
            >
              <RefreshCcw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="w-full space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
              {t.title}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-4xl text-sm">
              {t.subtitle}
            </p>
          </div>

          <Link href="/system/centers/list">
            <Button variant="outline" className="h-10 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </Button>
          </Link>
        </div>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Building2 className="h-7 w-7 text-muted-foreground" />
            </div>

            <div>
              <p className="font-semibold">{t.notFound}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t.notFoundHint}
              </p>
            </div>

            <Link href="/system/centers/list">
              <Button className="mt-2 rounded-xl">
                <ArrowLeft className="h-4 w-4" />
                {t.back}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {statusBadge(center.status, locale)}

            {center.isFeatured ? (
              <Badge className="rounded-full">
                <Star className="h-3.5 w-3.5 fill-current" />
                {t.fields.featured}
              </Badge>
            ) : null}
          </div>

          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {center.name}
          </h1>

          <div className="text-muted-foreground mt-2 flex flex-col gap-2 text-sm lg:flex-row lg:flex-wrap lg:gap-4">
            <div>
              <span className="text-foreground font-semibold">
                {t.contact}:
              </span>{" "}
              {center.contactPerson || "-"}
            </div>

            <div>
              <span className="text-foreground font-semibold">
                {t.createdAtShort}:
              </span>{" "}
              {formatDate(center.createdAt)}
            </div>

            <div>
              <span className="text-foreground font-semibold">
                {t.codeShort}:
              </span>{" "}
              {center.code}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href="/system/centers/list">
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t.back}</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => loadCenter(true)}
          >
            <RefreshCcw className="h-4 w-4" />
            <span>{t.refresh}</span>
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid w-full gap-4 xl:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
        {/* Profile */}
        <aside className="min-w-0 space-y-4">
          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border bg-muted">
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-background shadow-sm">
                  <Building2 className="h-14 w-14 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2 text-center">
                <h2 className="text-lg font-bold">{center.name}</h2>

                <p className="text-muted-foreground text-sm">
                  {t.typeLabels[center.providerType]}
                </p>

                <div className="flex justify-center">
                  {statusBadge(center.status, locale)}
                </div>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {t.profileCompletion}
                  </p>

                  <Badge variant="outline" className="rounded-full">
                    {formatNumber(profileCompleteness)}%
                  </Badge>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${profileCompleteness}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <QuickInfo
                  icon={ShieldCheck}
                  label={t.fields.code}
                  value={center.code || "-"}
                  onCopy={() => copyToClipboard(center.code)}
                />

                <QuickInfo
                  icon={Phone}
                  label={t.fields.mobile}
                  value={center.mobile || center.phone || "-"}
                  onCopy={() =>
                    copyToClipboard(center.mobile || center.phone || "")
                  }
                />

                <QuickInfo
                  icon={Mail}
                  label={t.fields.email}
                  value={center.email || "-"}
                  onCopy={() => copyToClipboard(center.email)}
                />

                <QuickInfo
                  icon={MapPin}
                  label={t.fields.city}
                  value={center.city || center.area || "-"}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {isValidExternalLink(center.website) ? (
                  <a
                    href={center.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border bg-background px-3 text-sm font-medium transition hover:bg-muted"
                  >
                    <Globe className="h-4 w-4" />
                    {t.fields.website}
                  </a>
                ) : null}

                {isValidExternalLink(center.googleMapsLink) ? (
                  <a
                    href={center.googleMapsLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border bg-background px-3 text-sm font-medium transition hover:bg-muted"
                  >
                    <MapPin className="h-4 w-4" />
                    {t.fields.maps}
                  </a>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Content */}
        <main className="min-w-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={ShieldCheck}
              label={t.fields.status}
              value={getStatusLabel(center.status, locale)}
            />

            <MetricCard
              icon={Building2}
              label={t.fields.providerType}
              value={t.typeLabels[center.providerType]}
            />

            <MetricCard
              icon={Star}
              label={t.fields.featured}
              value={center.isFeatured ? t.yes : t.no}
            />

            <MetricCard
              icon={CalendarDays}
              label={t.fields.updatedAt}
              value={formatDate(center.updatedAt)}
            />
          </div>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">{t.details}</CardTitle>
              <CardDescription>{t.profileDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <DetailsSection title={t.basicSection}>
                <DetailRow label={t.fields.id} value={String(center.id || "-")} />
                <DetailRow label={t.fields.name} value={center.name || "-"} />
                <DetailRow
                  label={t.fields.code}
                  value={center.code || "-"}
                  copyValue={center.code}
                  onCopy={copyToClipboard}
                />
                <DetailRow
                  label={t.fields.providerType}
                  value={t.typeLabels[center.providerType]}
                />
                <DetailRow
                  label={t.fields.status}
                  value={getStatusLabel(center.status, locale)}
                />
                <DetailRow
                  label={t.fields.featured}
                  value={center.isFeatured ? t.yes : t.no}
                />
              </DetailsSection>

              <DetailsSection title={t.contactSection}>
                <DetailRow
                  label={t.fields.contactPerson}
                  value={center.contactPerson || "-"}
                />
                <DetailRow
                  label={t.fields.phone}
                  value={center.phone || "-"}
                  copyValue={center.phone}
                  onCopy={copyToClipboard}
                />
                <DetailRow
                  label={t.fields.mobile}
                  value={center.mobile || "-"}
                  copyValue={center.mobile}
                  onCopy={copyToClipboard}
                />
                <DetailRow
                  label={t.fields.email}
                  value={center.email || "-"}
                  copyValue={center.email}
                  onCopy={copyToClipboard}
                />
                <DetailRow
                  label={t.fields.website}
                  value={center.website || "-"}
                  link={center.website}
                />
              </DetailsSection>

              <DetailsSection title={t.locationSection}>
                <DetailRow label={t.fields.city} value={center.city || "-"} />
                <DetailRow label={t.fields.area} value={center.area || "-"} />
                <DetailRow
                  label={t.fields.address}
                  value={center.address || "-"}
                />
                <DetailRow
                  label={t.fields.maps}
                  value={center.googleMapsLink || "-"}
                  link={center.googleMapsLink}
                />
              </DetailsSection>

              <DetailsSection title={t.systemSection}>
                <DetailRow
                  label={t.fields.createdAt}
                  value={formatDate(center.createdAt)}
                />
                <DetailRow
                  label={t.fields.updatedAt}
                  value={formatDate(center.updatedAt)}
                />
              </DetailsSection>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">
                {t.relatedSections}
              </CardTitle>
              <CardDescription>{t.relatedDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <OperationCard
                icon={FileText}
                title={t.cards.contracts}
                description={t.cards.contractsDesc}
              />

              <OperationCard
                icon={Activity}
                title={t.cards.services}
                description={t.cards.servicesDesc}
              />

              <OperationCard
                icon={Wallet}
                title={t.cards.payments}
                description={t.cards.paymentsDesc}
              />

              <OperationCard
                icon={CheckCircle2}
                title={t.cards.orders}
                description={t.cards.ordersDesc}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">{t.notes}</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="rounded-xl border bg-background p-4 text-sm leading-7 text-muted-foreground">
                {center.notes || t.noNotes}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   Small Components
============================================================ */

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 transition hover:bg-muted/40">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-5 w-5" />
      </div>

      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}

function QuickInfo({
  icon: Icon,
  label,
  value,
  onCopy,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border bg-background p-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold">{value}</p>
        </div>
      </div>

      {onCopy ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-lg"
          onClick={onCopy}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

function DetailsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="border-b bg-muted/40 px-4 py-3 text-sm font-semibold">
        {title}
      </div>

      <Table>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

function DetailRow({
  label,
  value,
  link,
  copyValue,
  onCopy,
}: {
  label: string;
  value: string;
  link?: string;
  copyValue?: string;
  onCopy?: (value: string) => void;
}) {
  const hasLink = Boolean(link && isValidExternalLink(link));
  const hasCopy = Boolean(copyValue && onCopy);

  return (
    <TableRow>
      <TableCell className="w-[220px] bg-muted/30 font-medium">
        {label}
      </TableCell>

      <TableCell>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            {hasLink ? (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-2 text-primary hover:underline"
              >
                <span className="truncate">{value}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <span className="break-words">{value}</span>
            )}
          </div>

          {hasCopy ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg"
              onClick={() => onCopy?.(copyValue || "")}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function OperationCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-5 w-5" />
      </div>

      <p className="font-semibold">{title}</p>

      <p className="text-muted-foreground mt-1 text-xs leading-5">
        {description}
      </p>
    </div>
  );
}