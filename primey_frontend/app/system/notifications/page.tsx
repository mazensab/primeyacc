"use client";
/* ============================================================
   📂 primey_frontend/app/system/notifications/page.tsx
   🔔 PrimeyAcc — System Notifications Overview
   ------------------------------------------------------------
   ✅ Premium PrimeyCare admin pattern adapted for PrimeyAcc
   ✅ System notifications module center page
   ✅ Real API only: GET /api/system/notifications/
   ✅ KPI cards + quick actions + notifications table
   ✅ Search, read filter, channel filter, priority filter, sorting, reset
   ✅ Mark read / unread / mark all read
   ✅ Excel .xls export
   ✅ Web print + PDF through browser print dialog
   ✅ Skeleton loading
   ✅ Error / Empty / No results states
   ✅ sonner toast
   ✅ Arabic/English via primey-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */
import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpDown,
  Bell,
  Building2,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FileText,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Mail,
  MessageCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
  Wifi,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type SortKey = "newest" | "oldest" | "title" | "company";
type ReadFilter = "all" | "unread" | "read";
type ChannelFilter = "all" | "IN_APP" | "EMAIL" | "WHATSAPP" | "SYSTEM";
type PriorityFilter = "all" | "LOW" | "NORMAL" | "HIGH" | "URGENT";
type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  companyName: string;
  companyCode: string;
  recipientName: string;
  channel: string;
  notificationType: string;
  priority: string;
  source: string;
  actionUrl: string;
  isRead: boolean;
  createdAt: string | null;
};
type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};
const API_ENDPOINT = "/api/system/notifications/";
const readFilters: ReadFilter[] = ["all", "unread", "read"];
const channelFilters: ChannelFilter[] = ["all", "IN_APP", "EMAIL", "WHATSAPP", "SYSTEM"];
const priorityFilters: PriorityFilter[] = ["all", "LOW", "NORMAL", "HIGH", "URGENT"];
const translations = {
  ar: {
    title: "الإشعارات",
    subtitle:
      "مركز إشعارات PrimeyAcc لمتابعة إشعارات الشركات والمستخدمين والقنوات من مكان واحد.",
    badge: "التواصل والإشعارات",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    markAllRead: "تعليم الكل كمقروء",
    list: "قائمة الإشعارات",
    unreadOnly: "غير المقروءة",
    whatsapp: "واتساب",
    dashboard: "لوحة النظام",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث بعنوان الإشعار أو الرسالة أو الشركة أو المستلم...",
    all: "الكل",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    titleSort: "العنوان",
    companySort: "الشركة",
    open: "فتح",
    read: "مقروء",
    unread: "غير مقروء",
    totalNotifications: "إجمالي الإشعارات",
    unreadNotifications: "غير المقروءة",
    readNotifications: "المقروءة",
    companyWideNotifications: "العامة للشركات",
    fromLiveApi: "من واجهات النظام الحقيقية",
    actionsTitle: "اختصارات وحدة التواصل والإشعارات",
    actionsDesc: "تنقل سريع بين صفحات التواصل بنفس نمط إدارة المنصة.",
    openListTitle: "عرض قائمة الإشعارات",
    openListDesc: "جدول إشعارات النظام مع الفلاتر والتصدير والطباعة.",
    unreadTitle: "الإشعارات غير المقروءة",
    unreadDesc: "متابعة الإشعارات التي لم يتم التعامل معها بعد.",
    whatsappTitle: "واتساب",
    whatsappDesc: "إدارة قنوات وقوالب ورسائل واتساب.",
    dashboardTitle: "لوحة النظام",
    dashboardDesc: "العودة إلى لوحة تحكم النظام الرئيسية.",
    tableTitle: "أحدث الإشعارات",
    tableDesc:
      "نظرة سريعة على إشعارات الشركات والمستخدمين مع القناة والأولوية والحالة.",
    notification: "الإشعار",
    company: "الشركة",
    recipient: "المستلم",
    channel: "القناة",
    priority: "الأولوية",
    status: "الحالة",
    source: "المصدر",
    createdAt: "تاريخ الإنشاء",
    markRead: "تعليم كمقروء",
    markUnread: "تعليم كغير مقروء",
    inApp: "داخل النظام",
    email: "البريد",
    whatsappChannel: "واتساب",
    system: "النظام",
    low: "منخفضة",
    normal: "عادية",
    high: "مرتفعة",
    urgent: "عاجلة",
    companyWide: "عام للشركة",
    unknown: "غير محدد",
    noDataTitle: "لا توجد إشعارات",
    noDataDesc: "ستظهر إشعارات النظام هنا عند توفرها من API.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل مركز الإشعارات",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير مركز إشعارات PrimeyAcc",
    generatedAt: "تاريخ الإنشاء",
    showing: "عرض",
    of: "من",
    rows: "سجل",
    refreshed: "تم تحديث الإشعارات.",
    actionDone: "تم تنفيذ العملية بنجاح.",
  },
  en: {
    title: "Notifications",
    subtitle:
      "PrimeyAcc notifications center for monitoring company, user, and channel notifications in one place.",
    badge: "Communications & Notifications",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    markAllRead: "Mark all read",
    list: "Notifications list",
    unreadOnly: "Unread only",
    whatsapp: "WhatsApp",
    dashboard: "System dashboard",
    reset: "Reset",
    searchPlaceholder: "Search by title, message, company, or recipient...",
    all: "All",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    titleSort: "Title",
    companySort: "Company",
    open: "Open",
    read: "Read",
    unread: "Unread",
    totalNotifications: "Total notifications",
    unreadNotifications: "Unread",
    readNotifications: "Read",
    companyWideNotifications: "Company-wide",
    fromLiveApi: "From live system APIs",
    actionsTitle: "Communications shortcuts",
    actionsDesc: "Quick navigation across communications pages using the platform pattern.",
    openListTitle: "Open notifications list",
    openListDesc: "System notifications table with filters, export, and print.",
    unreadTitle: "Unread notifications",
    unreadDesc: "Track notifications that still need attention.",
    whatsappTitle: "WhatsApp",
    whatsappDesc: "Manage WhatsApp channels, templates, and messages.",
    dashboardTitle: "System dashboard",
    dashboardDesc: "Return to the main system dashboard.",
    tableTitle: "Latest notifications",
    tableDesc:
      "Quick view of company and user notifications with channel, priority, and status.",
    notification: "Notification",
    company: "Company",
    recipient: "Recipient",
    channel: "Channel",
    priority: "Priority",
    status: "Status",
    source: "Source",
    createdAt: "Created at",
    markRead: "Mark read",
    markUnread: "Mark unread",
    inApp: "In-app",
    email: "Email",
    whatsappChannel: "WhatsApp",
    system: "System",
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent",
    companyWide: "Company-wide",
    unknown: "Unknown",
    noDataTitle: "No notifications",
    noDataDesc: "System notifications will appear here when available from the API.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to view other results.",
    errorTitle: "Could not load notifications center",
    errorDesc:
      "Make sure you are signed in with system permission and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "PrimeyAcc System Notifications Report",
    generatedAt: "Generated at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    refreshed: "Notifications refreshed.",
    actionDone: "Action completed successfully.",
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
function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(toNumber(value)),
  );
}
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
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
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/+$/,
          "",
        )
      : "";
  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}
function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}
function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}
async function ensureCsrfToken() {
  let token = getCookie("csrftoken");
  if (token) return token;
  await fetch(makeApiUrl("/api/auth/csrf/"), {
    credentials: "include",
    cache: "no-store",
  }).catch(() => null);
  token = getCookie("csrftoken");
  return token;
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
async function postJson<T>(url: string): Promise<T> {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-CSRFToken": csrfToken,
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
    throw new Error(
      normalizeText(record.message) ||
        normalizeText(record.detail) ||
        normalizeText(record.error) ||
        `Request failed with status ${response.status}`,
    );
  }
  return (payload || {}) as T;
}
function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.notifications)) return record.notifications;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.notifications)) return dataRecord.notifications;
  return [];
}
function extractCount(payload: unknown) {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const arrayCount = extractArray(payload).length;
  return toNumber(
    record.count ??
      record.total ??
      record.total_count ??
      dataRecord.count ??
      dataRecord.total ??
      dataRecord.total_count,
    arrayCount,
  );
}
function normalizeNestedName(value: unknown, keys: string[] = ["name", "title", "full_name", "username", "email"]) {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  for (const key of keys) {
    const text = normalizeText(record[key]);
    if (text) return text;
  }
  return "";
}
function normalizeNotification(value: unknown): NotificationRecord {
  const record = asRecord(value);
  const company = asRecord(record.company);
  const recipient = asRecord(record.recipient);
  const createdBy = asRecord(record.created_by);
  const companyName =
    normalizeNestedName(company, ["name", "display_name", "title"]) ||
    normalizeText(record.company_name) ||
    (record.company_id ? `#${String(record.company_id)}` : "—");
  const recipientName =
    normalizeNestedName(recipient) ||
    normalizeText(record.recipient_username) ||
    normalizeText(record.recipient_name) ||
    normalizeNestedName(createdBy) ||
    "—";
  const sourceType = normalizeText(record.source_type);
  const sourceId = normalizeText(record.source_id);
  return {
    id: normalizeText(record.id, "—"),
    title: normalizeText(record.title, "—"),
    message: normalizeText(record.message, "—"),
    companyName,
    companyCode:
      normalizeText(company.code) ||
      normalizeText(company.company_code) ||
      normalizeText(record.company_code) ||
      "—",
    recipientName:
      record.is_company_wide === true || record.recipient_id === null ? "company-wide" : recipientName,
    channel: normalizeText(record.channel, "IN_APP").toUpperCase(),
    notificationType: normalizeText(record.notification_type, "INFO").toUpperCase(),
    priority: normalizeText(record.priority, "NORMAL").toUpperCase(),
    source: [sourceType, sourceId ? `#${sourceId}` : ""].filter(Boolean).join(" ") || "—",
    actionUrl: normalizeText(record.action_url),
    isRead: Boolean(record.is_read),
    createdAt: normalizeText(record.created_at) || null,
  };
}
function getChannelLabel(channel: string, locale: Locale) {
  const t = translations[locale];
  const key = channel.toUpperCase();
  if (key === "EMAIL") return t.email;
  if (key === "WHATSAPP") return t.whatsappChannel;
  if (key === "SYSTEM") return t.system;
  return t.inApp;
}
function getPriorityLabel(priority: string, locale: Locale) {
  const t = translations[locale];
  const key = priority.toUpperCase();
  if (key === "LOW") return t.low;
  if (key === "HIGH") return t.high;
  if (key === "URGENT") return t.urgent;
  return t.normal;
}
function getRecipientLabel(value: string, locale: Locale) {
  if (value === "company-wide") return translations[locale].companyWide;
  return value || "—";
}
function getChannelIcon(channel: string) {
  const key = channel.toUpperCase();
  if (key === "EMAIL") return Mail;
  if (key === "WHATSAPP") return MessageCircle;
  if (key === "SYSTEM") return ShieldCheck;
  return Bell;
}
function rowDateValue(value: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-3 text-3xl font-bold tabular-nums">{formatInteger(value)}</p>
            <p className="mt-4 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-2xl bg-muted p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className="group rounded-2xl border bg-background p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-muted p-3 text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">{action.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p>
        </div>
      </div>
    </Link>
  );
}
function NotificationsOverviewSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Card className="rounded-3xl">
          <CardHeader className="space-y-4">
            <Skeleton className="h-7 w-36 rounded-full" />
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-5 w-full max-w-2xl rounded-xl" />
          </CardHeader>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-5 w-32 rounded-xl" />
                <Skeleton className="h-9 w-20 rounded-xl" />
                <Skeleton className="h-4 w-40 rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
export default function SystemNotificationsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [notifications, setNotifications] = React.useState<NotificationRecord[]>([]);
  const [apiTotal, setApiTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [readFilter, setReadFilter] = React.useState<ReadFilter>("all");
  const [channel, setChannel] = React.useState<ChannelFilter>("all");
  const [priority, setPriority] = React.useState<PriorityFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";
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
  const loadNotifications = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const params = new URLSearchParams({
          limit: "100",
          offset: "0",
        });
        const payload = await fetchJson<unknown>(makeApiUrl(API_ENDPOINT, params));
        const rows = extractArray(payload).map(normalizeNotification);
        setNotifications(rows);
        setApiTotal(extractCount(payload));
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
    [t.errorDesc, t.refreshed],
  );
  React.useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);
  const resetFilters = React.useCallback(() => {
    setSearch("");
    setReadFilter("all");
    setChannel("all");
    setPriority("all");
    setSort("newest");
  }, []);
  const filteredNotifications = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = notifications.filter((item) => {
      const haystack = [
        item.title,
        item.message,
        item.companyName,
        item.companyCode,
        item.recipientName,
        item.channel,
        item.priority,
        item.source,
      ]
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (readFilter === "read" && !item.isRead) return false;
      if (readFilter === "unread" && item.isRead) return false;
      if (channel !== "all" && item.channel !== channel) return false;
      if (priority !== "all" && item.priority !== priority) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      if (sort === "oldest") return rowDateValue(a.createdAt) - rowDateValue(b.createdAt);
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "company") return a.companyName.localeCompare(b.companyName);
      return rowDateValue(b.createdAt) - rowDateValue(a.createdAt);
    });
  }, [channel, notifications, priority, readFilter, search, sort]);
  const stats = React.useMemo(() => {
    return {
      total: apiTotal || notifications.length,
      unread: notifications.filter((item) => !item.isRead).length,
      read: notifications.filter((item) => item.isRead).length,
      companyWide: notifications.filter((item) => item.recipientName === "company-wide").length,
    };
  }, [apiTotal, notifications]);
  const quickActions = React.useMemo<QuickAction[]>(
    () => [
      {
        title: t.openListTitle,
        description: t.openListDesc,
        href: "/system/notifications",
        icon: ListChecks,
      },
      {
        title: t.unreadTitle,
        description: t.unreadDesc,
        href: "/system/notifications",
        icon: AlertTriangle,
      },
      {
        title: t.whatsappTitle,
        description: t.whatsappDesc,
        href: "/system/whatsapp",
        icon: Wifi,
      },
      {
        title: t.dashboardTitle,
        description: t.dashboardDesc,
        href: "/system",
        icon: LayoutDashboard,
      },
    ],
    [
      t.dashboardDesc,
      t.dashboardTitle,
      t.openListDesc,
      t.openListTitle,
      t.unreadDesc,
      t.unreadTitle,
      t.whatsappDesc,
      t.whatsappTitle,
    ],
  );
  const hasFilters =
    Boolean(search) ||
    readFilter !== "all" ||
    channel !== "all" ||
    priority !== "all" ||
    sort !== "newest";
  const previewRows = filteredNotifications.slice(0, 10);
  function buildExportRows() {
    return filteredNotifications.map((item) => [
      item.title,
      item.message,
      item.companyName,
      item.companyCode,
      getRecipientLabel(item.recipientName, locale),
      getChannelLabel(item.channel, locale),
      getPriorityLabel(item.priority, locale),
      item.isRead ? t.read : t.unread,
      item.source,
      formatDate(item.createdAt),
    ]);
  }
  function buildTableHtml() {
    const headers = [
      t.notification,
      "Message",
      t.company,
      "Code",
      t.recipient,
      t.channel,
      t.priority,
      t.status,
      t.source,
      t.createdAt,
    ];
    const rows = buildExportRows();
    return `
      <table border="1" cellspacing="0" cellpadding="6">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    `;
  }
  function exportExcel() {
    const rows = buildExportRows();
    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }
    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml()}
        </body>
      </html>
    `;
    const blob = new Blob([`\ufeff${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `primeyacc-system-notifications-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function openPrintWindow(mode: "print" | "pdf") {
    const rows = buildExportRows();
    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }
    if (mode === "pdf") toast.info(t.pdfHint);
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
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
              padding: 8px;
              font-size: 12px;
              text-align: ${dir === "rtl" ? "right" : "left"};
              vertical-align: top;
            }
            th { background: #f1f5f9; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml()}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
  async function markAllRead() {
    if (!stats.unread) return;
    try {
      setSaving(true);
      await postJson(makeApiUrl(`${API_ENDPOINT}mark-all-read/`));
      toast.success(t.actionDone);
      await loadNotifications({ silent: false });
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : t.errorDesc);
    } finally {
      setSaving(false);
    }
  }
  async function toggleRead(item: NotificationRecord) {
    try {
      setSaving(true);
      const path = item.isRead
        ? `${API_ENDPOINT}${item.id}/unread/`
        : `${API_ENDPOINT}${item.id}/read/`;
      await postJson(makeApiUrl(path));
      toast.success(t.actionDone);
      await loadNotifications({ silent: false });
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : t.errorDesc);
    } finally {
      setSaving(false);
    }
  }
  if (loading) return <NotificationsOverviewSkeleton />;
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
            <Button onClick={() => void loadNotifications({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
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
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadNotifications({ silent: true })}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.exportExcel}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("print")}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("pdf")}>
                  <FileText className="h-4 w-4" />
                  {t.pdf}
                </Button>
                <Button className="rounded-xl" onClick={() => void markAllRead()} disabled={saving || !stats.unread}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t.markAllRead}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalNotifications} value={stats.total} description={t.fromLiveApi} icon={Bell} />
          <KpiCard title={t.unreadNotifications} value={stats.unread} description={t.fromLiveApi} icon={AlertTriangle} />
          <KpiCard title={t.readNotifications} value={stats.read} description={t.fromLiveApi} icon={CheckCircle2} />
          <KpiCard title={t.companyWideNotifications} value={stats.companyWide} description={t.fromLiveApi} icon={Building2} />
        </div>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.actionsTitle}</CardTitle>
            <CardDescription>{t.actionsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => (
                <QuickActionCard key={`${action.href}-${action.title}`} action={action} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.tableTitle}</CardTitle>
                <CardDescription className="mt-2">{t.tableDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <Inbox className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(previewRows.length)} {t.of} {formatInteger(apiTotal || notifications.length)} {t.rows}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-10 rounded-xl ps-9"
                  />
                </div>
                <Select value={readFilter} onValueChange={(value) => setReadFilter(value as ReadFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {readFilters.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "all" ? t.all : item === "read" ? t.read : t.unread}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={channel} onValueChange={(value) => setChannel(value as ChannelFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[155px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelFilters.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "all" ? t.all : getChannelLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={priority} onValueChange={(value) => setPriority(value as PriorityFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityFilters.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "all" ? t.all : getPriorityLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[160px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="title">{t.titleSort}</SelectItem>
                    <SelectItem value="company">{t.companySort}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1060px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("h-11 w-[260px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.notification}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[170px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.company}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.recipient}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.channel}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.priority}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.status}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.createdAt}
                      </TableHead>
                      <TableHead className="sticky left-0 z-10 h-11 w-[140px] bg-muted/40 px-3 text-center text-xs font-semibold text-muted-foreground">
                        {t.open}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.length ? (
                      previewRows.map((item) => {
                        const ChannelIcon = getChannelIcon(item.channel);
                        return (
                          <TableRow key={item.id} className="h-[68px]">
                            <TableCell className={cn("h-[68px] overflow-hidden px-4 align-middle", alignClass)}>
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="mt-0.5 rounded-2xl bg-muted p-2 text-muted-foreground">
                                  <ChannelIcon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
                                  <span className="mt-1 line-clamp-1 block text-xs text-muted-foreground">{item.message}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className={cn("h-[68px] overflow-hidden px-4 align-middle", alignClass)}>
                              <span className="block truncate text-sm font-medium">{item.companyName}</span>
                              <span className="block truncate text-xs text-muted-foreground">{item.companyCode}</span>
                            </TableCell>
                            <TableCell className={cn("h-[68px] overflow-hidden px-4 align-middle text-sm", alignClass)}>
                              <div className="flex items-center gap-2">
                                <UserRound className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{getRecipientLabel(item.recipientName, locale)}</span>
                              </div>
                            </TableCell>
                            <TableCell className={cn("h-[68px] px-4 align-middle", alignClass)}>
                              <Badge variant="secondary" className="rounded-full">
                                {getChannelLabel(item.channel, locale)}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("h-[68px] px-4 align-middle", alignClass)}>
                              <Badge variant="outline" className="rounded-full">
                                {getPriorityLabel(item.priority, locale)}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("h-[68px] px-4 align-middle", alignClass)}>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full",
                                  item.isRead
                                    ? "border-emerald-500/30 text-emerald-700"
                                    : "border-amber-500/30 text-amber-700",
                                )}
                              >
                                {item.isRead ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                                {item.isRead ? t.read : t.unread}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("h-[68px] px-4 align-middle text-sm text-muted-foreground", alignClass)}>
                              {formatDate(item.createdAt)}
                            </TableCell>
                            <TableCell className="sticky left-0 z-10 h-[68px] bg-background px-3 text-center align-middle">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl bg-background"
                                onClick={() => void toggleRead(item)}
                                disabled={saving}
                              >
                                {item.isRead ? t.markUnread : t.markRead}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-64 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                            <div className="rounded-full bg-muted p-4 text-muted-foreground">
                              <Inbox className="h-8 w-8" />
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {hasFilters ? t.noResultsTitle : t.noDataTitle}
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {hasFilters ? t.noResultsDesc : t.noDataDesc}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
