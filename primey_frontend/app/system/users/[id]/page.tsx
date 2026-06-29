"use client";

/* ============================================================
   📂 primey_frontend/app/system/users/[id]/page.tsx
   🏢 Mhamcloud — System User Detail
   ------------------------------------------------------------
   ✅ Premium PrimeyCare detail pattern adapted for Mhamcloud
   ✅ Real API only: GET /api/users/{id}/
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

type UserRecord = {
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

const API_ENDPOINT = "/api/users/";

const translations = {
  ar: {
    title: "تفاصيل المستخدم",
    subtitle:
      "عرض ملف المستخدم داخل إدارة منصة Mhamcloud مع بيانات التعريف والحالة والدور ونوع الوصول والتواصل.",
    badge: "إدارة المنصة",
    backToUsers: "العودة للمستخدمين",
    usersList: "قائمة المستخدمين",
    systemDashboard: "لوحة النظام",
    refresh: "تحديث",
    print: "طباعة",
    pdf: "PDF",
    copyId: "نسخ المعرف",
    copied: "تم النسخ.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    refreshed: "تم تحديث تفاصيل المستخدم.",

    identity: "بيانات التعريف",
    identityDesc: "الاسم واسم الدخول والمعرف الداخلي.",
    contact: "بيانات التواصل",
    contactDesc: "اسم المستخدم والبريد والهاتف والصلاحيات.",
    operations: "التشغيل ونوع الوصول",
    operationsDesc: "الحالة التشغيلية والدور ونوع الوصول.",
    notes: "ملاحظات",
    notesDesc: "ملاحظات إدارية داخلية عند توفرها.",
    quickLinks: "روابط سريعة",
    quickLinksDesc: "تنقل سريع داخل وحدة المستخدمين.",

    userName: "الاسم",
    userCode: "اسم الدخول",
    userId: "معرف المستخدم",
    owner: "اسم المستخدم",
    email: "البريد الإلكتروني",
    phone: "رقم الجوال",
    city: "الصلاحيات",
    activity: "الدور",
    subscription: "نوع الوصول",
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
    unknown: "غير محدد",
    notAvailable: "غير متوفر",

    reportTitle: "تقرير تفاصيل مستخدم Mhamcloud",
    generatedAt: "تاريخ الطباعة",

    errorTitle: "تعذر تحميل تفاصيل المستخدم",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    emptyTitle: "لا توجد بيانات للمستخدم",
    emptyDesc: "لم يرجع API بيانات صالحة لهذه المستخدم.",
    tryAgain: "إعادة المحاولة",
  },
  en: {
    title: "User details",
    subtitle:
      "View the user profile inside Mhamcloud platform management with identity, status, activity, subscription, and contact data.",
    badge: "Platform management",
    backToUsers: "Back to users",
    usersList: "Users list",
    systemDashboard: "System dashboard",
    refresh: "Refresh",
    print: "Print",
    pdf: "PDF",
    copyId: "Copy ID",
    copied: "Copied.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    refreshed: "User details refreshed.",

    identity: "Identity",
    identityDesc: "User name, code, and internal identifier.",
    contact: "Contact details",
    contactDesc: "Username, email, phone, and permissions.",
    operations: "Operations and access",
    operationsDesc: "Operational status, role, and access type.",
    notes: "Notes",
    notesDesc: "Internal administrative notes when available.",
    quickLinks: "Quick links",
    quickLinksDesc: "Quick navigation inside the users module.",

    userName: "User name",
    userCode: "Username",
    userId: "User ID",
    owner: "Username",
    email: "Email",
    phone: "Phone",
    city: "Permissions",
    activity: "Role",
    subscription: "Access type",
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
    unknown: "Unknown",
    notAvailable: "Not available",

    reportTitle: "Mhamcloud User Details Report",
    generatedAt: "Generated at",

    errorTitle: "Could not load user details",
    errorDesc:
      "Make sure you are signed in as a system user and the backend is running, then try again.",
    emptyTitle: "No user data",
    emptyDesc: "The API did not return valid data for this user.",
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

function extractUserPayload(payload: unknown): ApiRecord {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const resultRecord = asRecord(record.result);

  const directUser = asRecord(record.user);
  const dataUser = asRecord(dataRecord.user);
  const resultUser = asRecord(resultRecord.user);

  const directItem = asRecord(record.item || record.record || record.object);
  const dataItem = asRecord(dataRecord.item || dataRecord.record || dataRecord.object);
  const resultItem = asRecord(resultRecord.item || resultRecord.record || resultRecord.object);

  if (Object.keys(directUser).length) return directUser;
  if (Object.keys(dataUser).length) return dataUser;
  if (Object.keys(resultUser).length) return resultUser;

  if (Object.keys(directItem).length) return directItem;
  if (Object.keys(dataItem).length) return dataItem;
  if (Object.keys(resultItem).length) return resultItem;

  if (Object.keys(dataRecord).length) return dataRecord;
  if (Object.keys(resultRecord).length) return resultRecord;

  return record;
}

function normalizeUser(payload: unknown): UserRecord {
  const record = extractUserPayload(payload);
  const profile = asRecord(record.profile);
  const defaultWorkspace = asRecord(record.default_workspace);
  const membership = asRecord(
    record.default_membership || record.membership || record.company_membership
  );
  const rawId = normalizeText(record.id || record.pk || record.user_id);
  const userId = normalizeText(record.user_id || rawId);
  const username = normalizeText(
    record.username || profile.username || record.code || userId,
    "—"
  );
  const firstName = normalizeText(record.first_name || profile.first_name);
  const lastName = normalizeText(record.last_name || profile.last_name);
  const joinedName = `${firstName} ${lastName}`.trim();
  const displayName = normalizeText(
    record.display_name ||
      record.full_name ||
      record.name ||
      joinedName ||
      username ||
      record.email,
    "—"
  );
  const email = normalizeText(record.email || profile.email, "—");
  const phone = normalizeText(
    record.phone ||
      record.mobile ||
      record.whatsapp ||
      profile.phone ||
      profile.mobile,
    "—"
  );
  const role = normalizeText(
    record.system_role ||
      record.role ||
      record.access_role ||
      membership.role,
    "—"
  );
  const accessType = normalizeText(
    record.access_type ||
      defaultWorkspace.type ||
      defaultWorkspace.code ||
      defaultWorkspace.name ||
      (record.can_access_system === true ? "system" : ""),
    "—"
  );
  const permissionsValue =
    record.system_permissions ||
    record.permissions ||
    record.permission_codes ||
    record.permission_list;
  let permissions = "—";
  if (Array.isArray(permissionsValue)) {
    const values = permissionsValue
      .map((item) => {
        if (typeof item === "string") return item;
        const permission = asRecord(item);
        return normalizeText(
          permission.code ||
            permission.key ||
            permission.name ||
            permission.label ||
            permission.codename
        );
      })
      .filter(Boolean);
    permissions =
      values.length > 6
        ? `${values.slice(0, 6).join(", ")} +${values.length - 6}`
        : values.join(", ") || "—";
  } else if (isRecord(permissionsValue)) {
    const enabled = Object.entries(permissionsValue)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key);
    permissions =
      enabled.length > 6
        ? `${enabled.slice(0, 6).join(", ")} +${enabled.length - 6}`
        : enabled.join(", ") || "—";
  } else {
    permissions = normalizeText(permissionsValue, "—");
  }
  return {
    id: rawId || userId || username,
    name: displayName,
    code: username,
    status: normalizeStatus(
      record.status || (record.is_active === false ? "inactive" : "active")
    ),
    owner: username,
    activity: role,
    subscription: accessType,
    email,
    phone,
    city: permissions,
    notes: normalizeText(record.status_reason || record.notes || record.description || record.internal_notes),
    created_at:
      normalizeText(record.created_at || record.created || record.inserted_at || record.date_joined || profile.created_at) ||
      null,
    updated_at:
      normalizeText(record.updated_at || record.modified_at || record.updated || record.last_login || profile.updated_at) ||
      null,
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
  };

  const en: Record<string, string> = {
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    trial: "Trial",
    pending: "Pending",
    draft: "Draft",
    cancelled: "Cancelled",
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

function UserDetailSkeleton() {
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

export default function SystemUserDetailPage() {
  const params = useParams();
  const userId = React.useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] || "" : String(value || "");
  }, [params]);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [user, setUser] = React.useState<UserRecord | null>(null);
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

  const loadUser = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!userId) {
        setError(t.emptyDesc);
        setLoading(false);
        return;
      }

      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const payload = await fetchJson<unknown>(
          makeApiUrl(`${API_ENDPOINT}${encodeURIComponent(userId)}/`),
        );
        const normalized = normalizeUser(payload);

        if (!normalized.id && !normalized.name) {
          setUser(null);
          setError("");
          return;
        }

        setUser(normalized);

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
    [userId, t.emptyDesc, t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadUser();
  }, [loadUser]);

  function fallback(value: string | null | undefined) {
    return normalizeText(value, t.notAvailable);
  }

  async function copyUserId() {
    if (!user?.id) return;

    try {
      await navigator.clipboard.writeText(user.id);
      toast.success(t.copied);
    } catch {
      toast.error(t.errorDesc);
    }
  }

  function buildPrintableHtml() {
    if (!user) return "";

    const rows = [
      [t.userName, user.name],
      [t.userCode, user.code],
      [t.userId, user.id],
      [t.status, getStatusLabel(user.status, locale)],
      [t.owner, user.owner],
      [t.email, fallback(user.email)],
      [t.phone, fallback(user.phone)],
      [t.city, user.city],
      [t.activity, user.activity],
      [t.subscription, user.subscription],
      [t.createdAt, formatDateTime(user.created_at)],
      [t.updatedAt, formatDateTime(user.updated_at)],
      [t.notes, fallback(user.notes)],
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
    if (!user) return;

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

  if (loading) return <UserDetailSkeleton />;

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
            <Button onClick={() => void loadUser({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!user) {
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
              <Link href="/system/users/list">
                <ListChecks className="h-4 w-4" />
                {t.usersList}
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
                    {user.name || t.title}
                  </h1>
                  <StatusBadge value={user.status} locale={locale} />
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  {t.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system/users">
                    <BackIcon className="h-4 w-4" />
                    {t.backToUsers}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadUser({ silent: true })}
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
          <InfoCard title={t.userCode} value={user.code || t.notAvailable} description={t.identity} icon={Hash} />
          <InfoCard title={t.status} value={<StatusBadge value={user.status} locale={locale} />} description={t.operations} icon={ShieldCheck} />
          <InfoCard title={t.activity} value={user.activity || t.notAvailable} description={t.operations} icon={Activity} />
          <InfoCard title={t.createdAt} value={formatDateTime(user.created_at)} description={t.identity} icon={CalendarDays} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.identity}</CardTitle>
                <CardDescription>{t.identityDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <DetailRow label={t.userName} value={user.name || t.notAvailable} icon={Building2} />
                <DetailRow label={t.userCode} value={user.code || t.notAvailable} icon={Hash} />
                <DetailRow
                  label={t.userId}
                  value={
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs">{user.id || t.notAvailable}</span>
                      {user.id ? (
                        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg" onClick={copyUserId}>
                          <Copy className="h-3.5 w-3.5" />
                          {t.copyId}
                        </Button>
                      ) : null}
                    </div>
                  }
                  icon={Hash}
                />
                <DetailRow label={t.updatedAt} value={formatDateTime(user.updated_at)} icon={CalendarDays} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.contact}</CardTitle>
                <CardDescription>{t.contactDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <DetailRow label={t.owner} value={fallback(user.owner)} icon={UserRound} />
                <DetailRow label={t.email} value={fallback(user.email)} icon={Mail} />
                <DetailRow label={t.phone} value={fallback(user.phone)} icon={Phone} />
                <DetailRow label={t.city} value={fallback(user.city)} icon={MapPin} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.operations}</CardTitle>
                <CardDescription>{t.operationsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <DetailRow label={t.status} value={<StatusBadge value={user.status} locale={locale} />} icon={ShieldCheck} />
                <DetailRow label={t.activity} value={fallback(user.activity)} icon={Activity} />
                <DetailRow label={t.subscription} value={fallback(user.subscription)} icon={CheckCircle2} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.notes}</CardTitle>
                <CardDescription>{t.notesDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-24 rounded-2xl border bg-background p-4 text-sm leading-7 text-muted-foreground">
                  {user.notes || t.notAvailable}
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
                  <Link href="/system/users/list">
                    <ListChecks className="h-4 w-4" />
                    {t.usersList}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system/users">
                    <Building2 className="h-4 w-4" />
                    {t.backToUsers}
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



