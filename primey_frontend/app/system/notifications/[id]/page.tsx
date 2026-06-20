"use client";

/* ============================================================
   📂 primey_frontend/app/system/notifications/[id]/page.tsx
   🔔 Primey Care — Notification Details
   ------------------------------------------------------------
   ✅ Same approved Customers / Users / Providers detail pattern
   ✅ Real API only with safe notification-center endpoint fallbacks
   ✅ GET detail: resource=notification&id={id}
   ✅ Inbox actions: mark_read / mark_unread
   ✅ Side profile card + main tabs
   ✅ Web print
   ✅ Skeleton loading
   ✅ Error / Not Found states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  Inbox,
  LinkIcon,
  Loader2,
  MailCheck,
  MoreHorizontal,
  Printer,
  RefreshCw,
  ShieldAlert,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type NotificationRecord = {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  severity: string;
  link: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  recipient_id: number | null;
  recipient_name: string;
  event_id: number | null;
  company_reference: string;
  company_name: string;
  context: ApiRecord;
  event: ApiRecord;
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  results?: unknown[];
  meta?: unknown;
};

const API_BASE_CANDIDATES = [
  "/api/notifications",
  "/api/notification-center",
  "/api/notification_center",
  "/api/notification-center-api",
];

const translations = {
  ar: {
    title: "تفاصيل الإشعار",
    subtitle: "عرض بيانات الإشعار، حالته، الشدة، الرابط، والحدث المرتبط به.",
    back: "رجوع",
    refresh: "تحديث",
    print: "طباعة",
    actions: "الإجراءات",
    openLink: "فتح الرابط",
    copyLink: "نسخ الرابط",
    copyTitle: "نسخ العنوان",
    markRead: "تحديد كمقروء",
    markUnread: "تحديد كغير مقروء",
    copied: "تم النسخ",
    actionSuccess: "تم تنفيذ العملية بنجاح.",
    actionFailed: "تعذر تنفيذ العملية.",
    overview: "نظرة عامة",
    message: "الرسالة",
    event: "الحدث",
    activity: "السجل",
    notificationInfo: "بيانات الإشعار",
    statusInfo: "الحالة والتصنيف",
    recipientInfo: "المستلم",
    eventInfo: "بيانات الحدث",
    titleField: "العنوان",
    messageField: "نص الرسالة",
    type: "النوع",
    severity: "الشدة",
    status: "الحالة",
    readStatus: "مقروء",
    unreadStatus: "غير مقروء",
    info: "معلومة",
    success: "نجاح",
    warning: "تحذير",
    error: "خطأ",
    critical: "حرج",
    system: "النظام",
    order: "طلب",
    invoice: "فاتورة",
    payment: "مدفوعات",
    whatsapp: "واتساب",
    customer: "عميل",
    provider: "مقدم خدمة",
    link: "الرابط",
    noLink: "لا يوجد رابط",
    recipient: "المستلم",
    recipientId: "رقم المستلم",
    eventId: "رقم الحدث",
    company: "الشركة",
    companyReference: "مرجع الشركة",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    readAt: "تاريخ القراءة",
    context: "السياق",
    noContext: "لا توجد بيانات سياق.",
    notFoundTitle: "الإشعار غير موجود",
    notFoundDesc: "تعذر العثور على الإشعار المطلوب.",
    errorTitle: "تعذر تحميل تفاصيل الإشعار",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    unknown: "غير محدد",
    printTitle: "تقرير الإشعار",
    generatedAt: "تاريخ الطباعة",
  },
  en: {
    title: "Notification Details",
    subtitle: "View notification data, status, severity, link, and related event.",
    back: "Back",
    refresh: "Refresh",
    print: "Print",
    actions: "Actions",
    openLink: "Open link",
    copyLink: "Copy link",
    copyTitle: "Copy title",
    markRead: "Mark as read",
    markUnread: "Mark as unread",
    copied: "Copied",
    actionSuccess: "Action completed successfully.",
    actionFailed: "Unable to complete action.",
    overview: "Overview",
    message: "Message",
    event: "Event",
    activity: "Activity",
    notificationInfo: "Notification info",
    statusInfo: "Status and classification",
    recipientInfo: "Recipient",
    eventInfo: "Event data",
    titleField: "Title",
    messageField: "Message",
    type: "Type",
    severity: "Severity",
    status: "Status",
    readStatus: "Read",
    unreadStatus: "Unread",
    info: "Info",
    success: "Success",
    warning: "Warning",
    error: "Error",
    critical: "Critical",
    system: "System",
    order: "Order",
    invoice: "Invoice",
    payment: "Payment",
    whatsapp: "WhatsApp",
    customer: "Customer",
    provider: "Provider",
    link: "Link",
    noLink: "No link",
    recipient: "Recipient",
    recipientId: "Recipient ID",
    eventId: "Event ID",
    company: "Company",
    companyReference: "Company reference",
    createdAt: "Created at",
    updatedAt: "Updated at",
    readAt: "Read at",
    context: "Context",
    noContext: "No context data.",
    notFoundTitle: "Notification not found",
    notFoundDesc: "The requested notification could not be found.",
    errorTitle: "Unable to load notification details",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    unknown: "Unknown",
    printTitle: "Notification report",
    generatedAt: "Generated at",
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
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    return ["1", "true", "yes", "read", "مقروء"].includes(value.toLowerCase());
  }

  return Boolean(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).replace("T", " ").slice(0, 16);
  }

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

  if (envBase.endsWith("/api")) {
    return envBase.slice(0, -4);
  }

  return envBase;
}

function makeApiUrl(basePath: string, suffix: string, params?: URLSearchParams) {
  const base = getApiBaseUrl();
  const query = params?.toString();

  return `${base}${basePath}${suffix}${query ? `?${query}` : ""}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
}

async function fetchJson<T>(
  url: string,
  options?: {
    signal?: AbortSignal;
    method?: "GET" | "POST";
    body?: unknown;
  },
): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    method: options?.method || "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal: options?.signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options?.method === "POST" ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method === "POST"
        ? JSON.stringify(options.body || {})
        : undefined,
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

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

async function requestNotificationApi<T>(
  suffix: string,
  options?: {
    params?: URLSearchParams;
    signal?: AbortSignal;
    method?: "GET" | "POST";
    body?: unknown;
  },
): Promise<T> {
  let lastError: unknown = null;

  for (const basePath of API_BASE_CANDIDATES) {
    try {
      return await fetchJson<T>(makeApiUrl(basePath, suffix, options?.params), {
        signal: options?.signal,
        method: options?.method,
        body: options?.body,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Notification API request failed.");
}

function extractDetailPayload(payload: ApiResponse): unknown {
  const data = asRecord(payload.data);

  if (data.id || data.title || data.message) return data;

  return payload.data || payload;
}

function normalizeNotification(value: unknown): NotificationRecord {
  const item = asRecord(value);
  const event = asRecord(item.event);
  const context = asRecord(item.context);

  return {
    id: toNumber(item.id),
    title: normalizeText(item.title),
    message: normalizeText(item.message),
    notification_type: normalizeText(item.notification_type || item.type || "system"),
    severity: normalizeText(item.severity || "info").toLowerCase(),
    link: normalizeText(item.link),
    is_read: toBoolean(item.is_read),
    read_at: normalizeText(item.read_at) || null,
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
    recipient_id:
      item.recipient_id === null || item.recipient_id === undefined
        ? null
        : toNumber(item.recipient_id),
    recipient_name: normalizeText(item.recipient_name),
    event_id:
      item.event_id === null || item.event_id === undefined
        ? toNumber(event.id) || null
        : toNumber(item.event_id),
    company_reference: normalizeText(item.company_reference || event.company_reference),
    company_name: normalizeText(item.company_name || event.company_name),
    context,
    event,
  };
}

function getSeverityLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const severity = normalizeText(value).toLowerCase();

  if (severity === "success") return t.success;
  if (severity === "warning") return t.warning;
  if (severity === "error") return t.error;
  if (severity === "critical") return t.critical;

  return t.info;
}

function getSeverityClass(value: string) {
  const severity = normalizeText(value).toLowerCase();

  if (severity === "success") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (severity === "warning") {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  if (severity === "error") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (severity === "critical") {
    return "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50";
  }

  return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
}

function getTypeLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const type = normalizeText(value).toLowerCase();

  if (type.includes("order")) return t.order;
  if (type.includes("invoice")) return t.invoice;
  if (type.includes("payment")) return t.payment;
  if (type.includes("whatsapp")) return t.whatsapp;
  if (type.includes("customer")) return t.customer;
  if (type.includes("provider")) return t.provider;

  return type || t.system;
}

function openNotificationLink(link: string) {
  if (!link) return;

  if (link.startsWith("http://") || link.startsWith("https://")) {
    window.open(link, "_blank", "noopener,noreferrer");
    return;
  }

  window.location.href = link;
}

function SeverityBadge({
  severity,
  locale,
}: {
  severity: string;
  locale: Locale;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        getSeverityClass(severity),
      )}
    >
      {getSeverityLabel(severity, locale)}
    </Badge>
  );
}

function ReadBadge({
  isRead,
  locale,
}: {
  isRead: boolean;
  locale: Locale;
}) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        isRead
          ? "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40"
          : "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
      )}
    >
      {isRead ? t.readStatus : t.unreadStatus}
    </Badge>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[104px] px-6 py-5">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>

        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground">
          {value}
        </CardTitle>

        <CardAction>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-left text-sm font-medium text-foreground">
        {children || value || "—"}
      </div>
    </div>
  );
}

function KeyValueBlock({
  data,
  emptyText,
}: {
  data: ApiRecord;
  emptyText: string;
}) {
  const entries = Object.entries(data || {}).filter(([, value]) => value !== null && value !== undefined && value !== "");

  if (!entries.length) {
    return (
      <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      {entries.map(([key, value]) => (
        <div key={key} className="grid gap-2 border-b p-3 last:border-b-0 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="text-sm font-medium text-muted-foreground">{key}</div>
          <pre className="min-w-0 whitespace-pre-wrap break-words text-sm text-foreground">
            {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-3">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="rounded-lg border bg-card shadow-none">
                <CardHeader className="min-h-[104px] px-6 py-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-28" />
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SystemNotificationDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const notificationId = normalizeText(params?.id);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [notification, setNotification] = React.useState<NotificationRecord | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState("");
  const [error, setError] = React.useState("");

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

  const loadNotification = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!notificationId) {
        setLoading(false);
        setError(t.notFoundDesc);
        return;
      }

      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          resource: "notification",
          id: notificationId,
        });

        const payload = await requestNotificationApi<ApiResponse>("/detail/", {
          params,
          signal: controller.signal,
        });

        const nextNotification = normalizeNotification(extractDetailPayload(payload));

        setNotification(nextNotification.id ? nextNotification : null);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setNotification(null);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [notificationId, t.errorDesc, t.notFoundDesc],
  );

  React.useEffect(() => {
    void loadNotification();
  }, [loadNotification]);

  async function runInboxAction(action: "mark_read" | "mark_unread") {
    if (!notification) return;

    setActionLoading(action);

    try {
      await requestNotificationApi<ApiResponse>("/inbox/", {
        method: "POST",
        body: {
          action,
          id: notification.id,
        },
      });

      toast.success(t.actionSuccess);
      await loadNotification({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.actionFailed;

      toast.error(message);
    } finally {
      setActionLoading("");
    }
  }

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.actionFailed);
    }
  }

  function printPage() {
    if (!notification) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.actionFailed);
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)} - ${escapeHtml(notification.title)}</title>
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
            h2 { margin: 18px 0 8px; font-size: 16px; }
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
              font-size: 11px;
              margin-bottom: 16px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px;
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
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.status)}: ${escapeHtml(notification.is_read ? t.readStatus : t.unreadStatus)}</p>
              <p>${escapeHtml(t.type)}: ${escapeHtml(getTypeLabel(notification.notification_type, locale))}</p>
              <p>${escapeHtml(t.severity)}: ${escapeHtml(getSeverityLabel(notification.severity, locale))}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.status)}</span><strong>${escapeHtml(notification.is_read ? t.readStatus : t.unreadStatus)}</strong></div>
            <div class="box"><span>${escapeHtml(t.type)}</span><strong>${escapeHtml(getTypeLabel(notification.notification_type, locale))}</strong></div>
            <div class="box"><span>${escapeHtml(t.severity)}</span><strong>${escapeHtml(getSeverityLabel(notification.severity, locale))}</strong></div>
            <div class="box"><span>${escapeHtml(t.createdAt)}</span><strong>${escapeHtml(formatDate(notification.created_at))}</strong></div>
          </div>

          <h2>${escapeHtml(t.notificationInfo)}</h2>
          <table>
            <tbody>
              <tr><th>${escapeHtml(t.titleField)}</th><td>${escapeHtml(notification.title || "—")}</td></tr>
              <tr><th>${escapeHtml(t.messageField)}</th><td>${escapeHtml(notification.message || "—")}</td></tr>
              <tr><th>${escapeHtml(t.link)}</th><td>${escapeHtml(notification.link || "—")}</td></tr>
              <tr><th>${escapeHtml(t.recipient)}</th><td>${escapeHtml(notification.recipient_name || "—")}</td></tr>
              <tr><th>${escapeHtml(t.eventId)}</th><td>${escapeHtml(notification.event_id || "—")}</td></tr>
              <tr><th>${escapeHtml(t.readAt)}</th><td>${escapeHtml(formatDateTime(notification.read_at))}</td></tr>
              <tr><th>${escapeHtml(t.createdAt)}</th><td>${escapeHtml(formatDateTime(notification.created_at))}</td></tr>
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
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 text-right">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>
        </div>

        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-red-200 bg-white">
              <TriangleAlert className="h-6 w-6 text-red-600" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-red-900">
                {error ? t.errorTitle : t.notFoundTitle}
              </p>
              <p className="text-sm text-red-700">{error || t.notFoundDesc}</p>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadNotification()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
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
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadNotification({ silent: true })}
            disabled={refreshing || Boolean(actionLoading)}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90">
                <MoreHorizontal className="h-4 w-4" />
                {t.actions}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
              {notification.link ? (
                <>
                  <DropdownMenuItem onClick={() => openNotificationLink(notification.link)}>
                    <Eye className="h-4 w-4" />
                    {t.openLink}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => void copyValue(notification.link)}>
                    <Copy className="h-4 w-4" />
                    {t.copyLink}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                </>
              ) : null}

              <DropdownMenuItem onClick={() => void copyValue(notification.title)}>
                <Copy className="h-4 w-4" />
                {t.copyTitle}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => void runInboxAction("mark_read")}
                disabled={Boolean(actionLoading) || notification.is_read}
              >
                {actionLoading === "mark_read" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MailCheck className="h-4 w-4" />
                )}
                {t.markRead}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => void runInboxAction("mark_unread")}
                disabled={Boolean(actionLoading) || !notification.is_read}
              >
                {actionLoading === "mark_unread" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {t.markUnread}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-4 px-6 py-5">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-lg border",
                notification.is_read ? "bg-muted/40" : "bg-emerald-50",
              )}
            >
              <Bell
                className={cn(
                  "h-7 w-7",
                  notification.is_read ? "text-muted-foreground" : "text-emerald-700",
                )}
              />
            </div>

            <div className="min-w-0 space-y-1">
              <CardTitle className="line-clamp-2 text-xl font-bold">
                {notification.title || t.unknown}
              </CardTitle>
              <CardDescription className="line-clamp-2">
                {notification.message || "—"}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <ReadBadge isRead={notification.is_read} locale={locale} />
              <SeverityBadge severity={notification.severity} locale={locale} />
            </div>
          </CardHeader>

          <CardContent className="space-y-2 px-6 pb-6">
            <InfoRow label={t.type} value={getTypeLabel(notification.notification_type, locale)} />
            <InfoRow label={t.createdAt} value={formatDateTime(notification.created_at)} />
            <InfoRow label={t.readAt} value={formatDateTime(notification.read_at)} />
            <InfoRow label={t.eventId} value={notification.event_id || "—"} />
            <InfoRow label={t.recipientId} value={notification.recipient_id || "—"} />
            <InfoRow label={t.company} value={notification.company_name || "—"} />
            <InfoRow label={t.companyReference} value={notification.company_reference || "—"} />

            <div className="grid gap-2 pt-3">
              {notification.link ? (
                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={() => openNotificationLink(notification.link)}
                >
                  <LinkIcon className="h-4 w-4" />
                  {t.openLink}
                </Button>
              ) : null}

              <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
                <Printer className="h-4 w-4" />
                {t.print}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title={t.status}
              value={notification.is_read ? t.readStatus : t.unreadStatus}
              icon={CheckCircle2}
            />
            <MetricCard
              title={t.type}
              value={getTypeLabel(notification.notification_type, locale)}
              icon={Inbox}
            />
            <MetricCard
              title={t.severity}
              value={getSeverityLabel(notification.severity, locale)}
              icon={ShieldAlert}
            />
            <MetricCard
              title={t.createdAt}
              value={formatDate(notification.created_at)}
              icon={CalendarDays}
            />
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardContent className="p-4">
                <TabsList className="h-auto flex-wrap justify-start rounded-lg bg-muted/40 p-1">
                  <TabsTrigger value="overview" className="rounded-md">
                    <Eye className="h-4 w-4" />
                    {t.overview}
                  </TabsTrigger>
                  <TabsTrigger value="message" className="rounded-md">
                    <Bell className="h-4 w-4" />
                    {t.message}
                  </TabsTrigger>
                  <TabsTrigger value="event" className="rounded-md">
                    <ShieldAlert className="h-4 w-4" />
                    {t.event}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="rounded-md">
                    <CalendarDays className="h-4 w-4" />
                    {t.activity}
                  </TabsTrigger>
                </TabsList>
              </CardContent>
            </Card>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.notificationInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.titleField} value={notification.title || "—"} />
                    <InfoRow label={t.type} value={getTypeLabel(notification.notification_type, locale)} />
                    <InfoRow label={t.severity}>
                      <SeverityBadge severity={notification.severity} locale={locale} />
                    </InfoRow>
                    <InfoRow label={t.status}>
                      <ReadBadge isRead={notification.is_read} locale={locale} />
                    </InfoRow>
                    <InfoRow label={t.link} value={notification.link || t.noLink} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.recipientInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.recipient} value={notification.recipient_name || "—"} />
                    <InfoRow label={t.recipientId} value={notification.recipient_id || "—"} />
                    <InfoRow label={t.company} value={notification.company_name || "—"} />
                    <InfoRow label={t.companyReference} value={notification.company_reference || "—"} />
                    <InfoRow label={t.eventId} value={notification.event_id || "—"} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="message" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-base">{t.messageField}</CardTitle>
                  <CardDescription>{notification.title || t.unknown}</CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="min-h-[260px] rounded-lg border bg-background p-5">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {notification.message || "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="event" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-base">{t.eventInfo}</CardTitle>
                  <CardDescription>{notification.event_id || "—"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5">
                  <KeyValueBlock data={notification.event} emptyText={t.noContext} />

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">{t.context}</p>
                    <KeyValueBlock data={notification.context} emptyText={t.noContext} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-base">{t.activity}</CardTitle>
                  <CardDescription>{notification.title || t.unknown}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-5">
                  {[
                    {
                      label: t.createdAt,
                      value: formatDateTime(notification.created_at),
                      icon: CalendarDays,
                    },
                    {
                      label: t.updatedAt,
                      value: formatDateTime(notification.updated_at),
                      icon: RefreshCw,
                    },
                    {
                      label: t.readAt,
                      value: formatDateTime(notification.read_at),
                      icon: MailCheck,
                    },
                    {
                      label: t.status,
                      value: notification.is_read ? t.readStatus : t.unreadStatus,
                      icon: CheckCircle2,
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="truncate font-medium">{item.label}</p>
                        </div>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}