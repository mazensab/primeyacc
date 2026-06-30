"use client";

/* ============================================================
   📂 primey_frontend/app/company/notifications/page.tsx
   🧠 Mhamcloud — Company Notifications Center
   ------------------------------------------------------------
   ✅ Approved Premium system page pattern
   ✅ Company workspace only
   ✅ Real API only
   ✅ Tenant-safe: no company_id from frontend
   ✅ List / filters / unread count
   ✅ Mark one notification as read
   ✅ Mark all notifications as read
   ✅ Excel .xls + Web print
   ✅ Empty / error / skeleton states
   ✅ sonner toast
   ✅ Arabic / English support
   ✅ English numbers always
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpDown,
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
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

type ReadFilter = "all" | "unread" | "read";
type SortKey = "newest" | "oldest" | "priority";
type ChannelFilter = "all" | "IN_APP" | "EMAIL" | "WHATSAPP" | "SYSTEM";
type TypeFilter = "all" | "INFO" | "SUCCESS" | "WARNING" | "ERROR";
type PriorityFilter = "all" | "LOW" | "NORMAL" | "HIGH" | "URGENT";

type CompanyNotification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  channel: string;
  notificationType: string;
  priority: string;
  sourceType: string;
  sourceId: string;
  createdAt: string | null;
  readAt: string | null;
};

type ApiState = {
  count: number;
  unreadCount: number;
  notifications: CompanyNotification[];
};

const translations = {
  ar: {
    eyebrow: "التواصل والإشعارات",
    title: "مركز إشعارات الشركة",
    subtitle:
      "متابعة إشعارات الشركة الحالية تنبيهات المستخدم والإشعارات العامة داخل نفس الشركة فقط.",
    refresh: "تحديث",
    markAllRead: "تعليم الكل كمقروء",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    search: "بحث",
    all: "الكل",
    unread: "غير مقروء",
    read: "مقروء",
    newest: "الأحدث",
    oldest: "الأقدم",
    prioritySort: "حسب الأولوية",
    status: "الحالة",
    channel: "القناة",
    type: "النوع",
    priority: "الأولوية",
    source: "المصدر",
    sort: "الترتيب",
    actions: "إجراءات",
    open: "عرض",
    markRead: "تعليم كمقروء",
    totalNotifications: "إجمالي الإشعارات",
    unreadNotifications: "غير المقروء",
    readNotifications: "المقروء",
    urgentNotifications: "العاجلة / العالية",
    fromCompanyApi: "من واجهات الشركة الحقيقية",
    listTitle: "قائمة إشعارات الشركة",
    listDescription:
      "الإشعارات الخاصة بالمستخدم الحالي والإشعارات العامة للشركة حسب الصلاحيات.",
    detailTitle: "تفاصيل الإشعار",
    detailDescription: "اختر إشعارا من الجدول لعرض تفاصيله.",
    noSelection: "لم يتم اختيار إشعار بعد.",
    titleColumn: "العنوان",
    messageColumn: "الرسالة",
    createdAt: "تاريخ الإنشاء",
    readAt: "تاريخ القراءة",
    id: "المعرف",
    unknown: "غير محدد",
    noDataTitle: "لا توجد إشعارات",
    noDataDesc: "ستظهر إشعارات الشركة هنا عند توفرها من API.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غير البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل إشعارات الشركة",
    errorDesc:
      "تأكد من تسجيل الدخول داخل مساحة الشركة ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    loaded: "تم تحديث إشعارات الشركة.",
    markedRead: "تم تعليم الإشعار كمقروء.",
    markedAllRead: "تم تعليم كل الإشعارات كمقروءة.",
    exportEmpty: "لا توجد إشعارات للتصدير.",
    printEmpty: "لا توجد إشعارات للطباعة.",
    printTitle: "تقرير إشعارات الشركة",
    generatedAt: "تاريخ الطباعة",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    inApp: "داخل النظام",
    email: "البريد",
    whatsapp: "واتساب",
    system: "النظام",
    info: "معلومة",
    success: "نجاح",
    warning: "تحذير",
    error: "خطأ",
    low: "منخفضة",
    normal: "عادية",
    high: "عالية",
    urgent: "عاجلة",
  },
  en: {
    eyebrow: "Messaging & Notifications",
    title: "Company Notifications Center",
    subtitle:
      "Track current-company notifications, user alerts, and company-wide notifications only.",
    refresh: "Refresh",
    markAllRead: "Mark all read",
    exportExcel: "Export Excel",
    print: "Print",
    reset: "Reset",
    search: "Search",
    all: "All",
    unread: "Unread",
    read: "Read",
    newest: "Newest",
    oldest: "Oldest",
    prioritySort: "By priority",
    status: "Status",
    channel: "Channel",
    type: "Type",
    priority: "Priority",
    source: "Source",
    sort: "Sort",
    actions: "Actions",
    open: "View",
    markRead: "Mark read",
    totalNotifications: "Total notifications",
    unreadNotifications: "Unread",
    readNotifications: "Read",
    urgentNotifications: "Urgent / high",
    fromCompanyApi: "From real company APIs",
    listTitle: "Company Notifications List",
    listDescription:
      "Current user's notifications and company-wide notifications according to permissions.",
    detailTitle: "Notification Details",
    detailDescription: "Select a notification from the table to view its details.",
    noSelection: "No notification selected yet.",
    titleColumn: "Title",
    messageColumn: "Message",
    createdAt: "Created at",
    readAt: "Read at",
    id: "ID",
    unknown: "Unknown",
    noDataTitle: "No notifications",
    noDataDesc: "Company notifications will appear here when returned by the API.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load company notifications",
    errorDesc:
      "Make sure you are signed in to a company workspace and the backend is running, then try again.",
    tryAgain: "Try again",
    loaded: "Company notifications refreshed.",
    markedRead: "Notification marked as read.",
    markedAllRead: "All notifications marked as read.",
    exportEmpty: "There are no notifications to export.",
    printEmpty: "There are no notifications to print.",
    printTitle: "Company Notifications Report",
    generatedAt: "Generated at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    inApp: "In-app",
    email: "Email",
    whatsapp: "WhatsApp",
    system: "System",
    info: "Info",
    success: "Success",
    warning: "Warning",
    error: "Error",
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent",
  },
} as const;

const CHANNELS: ChannelFilter[] = ["all", "IN_APP", "EMAIL", "WHATSAPP", "SYSTEM"];
const TYPES: TypeFilter[] = ["all", "INFO", "SUCCESS", "WARNING", "ERROR"];
const PRIORITIES: PriorityFilter[] = ["all", "LOW", "NORMAL", "HIGH", "URGENT"];

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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).replace("T", " ").slice(0, 16);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
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

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : "";
}

async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    ...options,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(method !== "GET" && csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      ...(options.headers || {}),
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

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const record = asRecord(payload);
  const data = record.data;

  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.notifications)) return record.notifications;
  if (Array.isArray(data)) return data;

  const dataRecord = asRecord(data);
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.notifications)) return dataRecord.notifications;

  return [];
}

function extractCount(payload: unknown, rows: unknown[]) {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);

  return toNumber(
    record.count ??
      record.total ??
      record.total_count ??
      dataRecord.count ??
      dataRecord.total ??
      metaRecord.count ??
      metaRecord.total,
    rows.length,
  );
}

function normalizeNotification(value: unknown): CompanyNotification {
  const record = asRecord(value);

  return {
    id: normalizeText(record.id || record.uuid || record.pk),
    title:
      normalizeText(record.title || record.subject || record.heading) ||
      normalizeText(record.notification_type || record.type, "Notification"),
    message: normalizeText(record.message || record.body || record.description || record.content),
    isRead: Boolean(record.is_read ?? record.read ?? record.read_at),
    channel: normalizeText(record.channel, "IN_APP").toUpperCase(),
    notificationType: normalizeText(record.notification_type || record.type, "INFO").toUpperCase(),
    priority: normalizeText(record.priority, "NORMAL").toUpperCase(),
    sourceType: normalizeText(record.source_type || record.source || "—"),
    sourceId: normalizeText(record.source_id || record.object_id || record.reference || ""),
    createdAt:
      normalizeText(record.created_at || record.created || record.sent_at || record.timestamp) || null,
    readAt: normalizeText(record.read_at || record.readAt) || null,
  };
}

function getChannelLabel(value: string, locale: Locale) {
  const t = translations[locale];

  if (value === "EMAIL") return t.email;
  if (value === "WHATSAPP") return t.whatsapp;
  if (value === "SYSTEM") return t.system;
  return t.inApp;
}

function getTypeLabel(value: string, locale: Locale) {
  const t = translations[locale];

  if (value === "SUCCESS") return t.success;
  if (value === "WARNING") return t.warning;
  if (value === "ERROR") return t.error;
  return t.info;
}

function getPriorityLabel(value: string, locale: Locale) {
  const t = translations[locale];

  if (value === "LOW") return t.low;
  if (value === "HIGH") return t.high;
  if (value === "URGENT") return t.urgent;
  return t.normal;
}

function priorityWeight(value: string) {
  if (value === "URGENT") return 4;
  if (value === "HIGH") return 3;
  if (value === "NORMAL") return 2;
  if (value === "LOW") return 1;
  return 0;
}

function getTypeBadgeClass(value: string) {
  if (value === "SUCCESS") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "WARNING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "ERROR") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getPriorityBadgeClass(value: string) {
  if (value === "URGENT") return "border-rose-200 bg-rose-50 text-rose-700";
  if (value === "HIGH") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "LOW") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function rowDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function tableHtmlForNotifications(
  rows: CompanyNotification[],
  locale: Locale,
) {
  const t = translations[locale];

  return `
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(t.titleColumn)}</th>
          <th>${escapeHtml(t.messageColumn)}</th>
          <th>${escapeHtml(t.status)}</th>
          <th>${escapeHtml(t.channel)}</th>
          <th>${escapeHtml(t.type)}</th>
          <th>${escapeHtml(t.priority)}</th>
          <th>${escapeHtml(t.createdAt)}</th>
        </tr>
      </thead>
      <tbody>
        ${
          rows.length
            ? rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.title)}</td>
                      <td>${escapeHtml(row.message)}</td>
                      <td>${escapeHtml(row.isRead ? t.read : t.unread)}</td>
                      <td>${escapeHtml(getChannelLabel(row.channel, locale))}</td>
                      <td>${escapeHtml(getTypeLabel(row.notificationType, locale))}</td>
                      <td>${escapeHtml(getPriorityLabel(row.priority, locale))}</td>
                      <td>${escapeHtml(formatDateTime(row.createdAt))}</td>
                    </tr>
                  `,
                )
                .join("")
            : `<tr><td colspan="7">—</td></tr>`
        }
      </tbody>
    </table>
  `;
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
    <Card className="group overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {formatInteger(value)}
          </CardTitle>
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-2xl">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-2xl">
        <CardHeader>
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({
  title,
  description,
  resetLabel,
  showReset,
  onReset,
}: {
  title: string;
  description: string;
  resetLabel: string;
  showReset?: boolean;
  onReset?: () => void;
}) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {showReset && onReset ? (
        <Button variant="outline" size="sm" onClick={onReset} className="rounded-lg">
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default function CompanyNotificationsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [state, setState] = React.useState<ApiState>({
    count: 0,
    unreadCount: 0,
    notifications: [],
  });
  const [selected, setSelected] = React.useState<CompanyNotification | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [readFilter, setReadFilter] = React.useState<ReadFilter>("all");
  const [channelFilter, setChannelFilter] = React.useState<ChannelFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>("all");
  const [sourceFilter, setSourceFilter] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("newest");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

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

        if (readFilter === "read") params.set("is_read", "true");
        if (readFilter === "unread") params.set("is_read", "false");
        if (channelFilter !== "all") params.set("channel", channelFilter);
        if (typeFilter !== "all") params.set("notification_type", typeFilter);
        if (priorityFilter !== "all") params.set("priority", priorityFilter);
        if (sourceFilter.trim()) params.set("source_type", sourceFilter.trim());

        const [listPayload, unreadPayload] = await Promise.all([
          fetchJson<ApiRecord>(makeApiUrl("/api/company/notifications/", params)),
          fetchJson<ApiRecord>(makeApiUrl("/api/company/notifications/unread-count/")),
        ]);

        const rows = extractArray(listPayload).map(normalizeNotification);
        const unreadCount = toNumber(unreadPayload.unread_count, 0);

        setState({
          count: extractCount(listPayload, rows),
          unreadCount,
          notifications: rows,
        });

        if (selected) {
          setSelected(rows.find((row) => row.id === selected.id) || null);
        }

        if (silent) toast.success(t.loaded);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      channelFilter,
      priorityFilter,
      readFilter,
      selected,
      sourceFilter,
      t.errorDesc,
      t.loaded,
      typeFilter,
    ],
  );

  React.useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const resetFilters = React.useCallback(() => {
    setSearch("");
    setReadFilter("all");
    setChannelFilter("all");
    setTypeFilter("all");
    setPriorityFilter("all");
    setSourceFilter("");
    setSort("newest");
  }, []);

  const filteredRows = React.useMemo(() => {
    const needle = search.trim().toLowerCase();

    const rows = state.notifications.filter((notification) => {
      const haystack = [
        notification.title,
        notification.message,
        notification.channel,
        notification.notificationType,
        notification.priority,
        notification.sourceType,
        notification.sourceId,
      ]
        .join(" ")
        .toLowerCase();

      return !needle || haystack.includes(needle);
    });

    return [...rows].sort((a, b) => {
      if (sort === "oldest") return rowDateValue(a.createdAt) - rowDateValue(b.createdAt);
      if (sort === "priority") return priorityWeight(b.priority) - priorityWeight(a.priority);
      return rowDateValue(b.createdAt) - rowDateValue(a.createdAt);
    });
  }, [search, sort, state.notifications]);

  const readCount = Math.max(state.count - state.unreadCount, 0);
  const urgentCount = state.notifications.filter((item) =>
    ["HIGH", "URGENT"].includes(item.priority),
  ).length;
  const hasFilters = Boolean(
    search ||
      readFilter !== "all" ||
      channelFilter !== "all" ||
      typeFilter !== "all" ||
      priorityFilter !== "all" ||
      sourceFilter ||
      sort !== "newest",
  );

  async function markOneRead(notification: CompanyNotification) {
    if (!notification.id || notification.isRead) return;

    try {
      setActionLoading(true);
      await fetchJson<ApiRecord>(
        makeApiUrl(`/api/company/notifications/${notification.id}/read/`),
        { method: "POST" },
      );

      toast.success(t.markedRead);
      await loadNotifications({ silent: false });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function markAllRead() {
    try {
      setActionLoading(true);
      await fetchJson<ApiRecord>(
        makeApiUrl("/api/company/notifications/mark-all-read/"),
        { method: "POST" },
      );

      toast.success(t.markedAllRead);
      await loadNotifications({ silent: false });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  function exportExcel() {
    if (!filteredRows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <h1>${escapeHtml(t.printTitle)}</h1>
          ${tableHtmlForNotifications(filteredRows, locale)}
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `company-notifications-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function printPage() {
    if (!filteredRows.length) {
      toast.error(t.printEmpty);
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: ${dir === "rtl" ? "right" : "left"}; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.printTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString("en-US"))}</p>
          ${tableHtmlForNotifications(filteredRows, locale)}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <DashboardSkeleton />
      </main>
    );
  }

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
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.eyebrow}
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
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void markAllRead()}
                  disabled={actionLoading || !state.unreadCount}
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                  {t.markAllRead}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.exportExcel}
                </Button>
                <Button className="rounded-xl" onClick={printPage}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t.totalNotifications}
            value={state.count}
            description={t.fromCompanyApi}
            icon={Bell}
          />
          <KpiCard
            title={t.unreadNotifications}
            value={state.unreadCount}
            description={t.fromCompanyApi}
            icon={BellRing}
          />
          <KpiCard
            title={t.readNotifications}
            value={readCount}
            description={t.fromCompanyApi}
            icon={CheckCircle2}
          />
          <KpiCard
            title={t.urgentNotifications}
            value={urgentCount}
            description={t.fromCompanyApi}
            icon={AlertTriangle}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.listTitle}</CardTitle>
              <CardDescription>{t.listDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t.search}
                      className="h-10 rounded-xl ps-9"
                    />
                  </div>

                  <Select value={readFilter} onValueChange={(value) => setReadFilter(value as ReadFilter)}>
                    <SelectTrigger className="h-10 rounded-xl bg-background lg:w-[150px]">
                      <Filter className="h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.all}</SelectItem>
                      <SelectItem value="unread">{t.unread}</SelectItem>
                      <SelectItem value="read">{t.read}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                    <SelectTrigger className="h-10 rounded-xl bg-background lg:w-[150px]">
                      <ArrowUpDown className="h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">{t.newest}</SelectItem>
                      <SelectItem value="oldest">{t.oldest}</SelectItem>
                      <SelectItem value="priority">{t.prioritySort}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                    <RotateCcw className="h-4 w-4" />
                    {t.reset}
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Select value={channelFilter} onValueChange={(value) => setChannelFilter(value as ChannelFilter)}>
                    <SelectTrigger className="h-10 rounded-xl bg-background">
                      <SelectValue placeholder={t.channel} />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item === "all" ? t.all : getChannelLabel(item, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
                    <SelectTrigger className="h-10 rounded-xl bg-background">
                      <SelectValue placeholder={t.type} />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item === "all" ? t.all : getTypeLabel(item, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as PriorityFilter)}>
                    <SelectTrigger className="h-10 rounded-xl bg-background">
                      <SelectValue placeholder={t.priority} />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item === "all" ? t.all : getPriorityLabel(item, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    value={sourceFilter}
                    onChange={(event) => setSourceFilter(event.target.value)}
                    placeholder={t.source}
                    className="h-10 rounded-xl bg-background"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border bg-background">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1180px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-[240px] px-4 text-right text-xs font-semibold text-muted-foreground">
                          {t.titleColumn}
                        </TableHead>
                        <TableHead className="w-[320px] px-4 text-right text-xs font-semibold text-muted-foreground">
                          {t.messageColumn}
                        </TableHead>
                        <TableHead className="w-[120px] px-4 text-right text-xs font-semibold text-muted-foreground">
                          {t.status}
                        </TableHead>
                        <TableHead className="w-[130px] px-4 text-right text-xs font-semibold text-muted-foreground">
                          {t.channel}
                        </TableHead>
                        <TableHead className="w-[120px] px-4 text-right text-xs font-semibold text-muted-foreground">
                          {t.type}
                        </TableHead>
                        <TableHead className="w-[120px] px-4 text-right text-xs font-semibold text-muted-foreground">
                          {t.priority}
                        </TableHead>
                        <TableHead className="w-[160px] px-4 text-right text-xs font-semibold text-muted-foreground">
                          {t.createdAt}
                        </TableHead>
                        <TableHead className="w-[150px] px-4 text-right text-xs font-semibold text-muted-foreground">
                          {t.actions}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.length ? (
                        filteredRows.map((notification) => (
                          <TableRow key={notification.id} className="h-[68px]">
                            <TableCell className="px-4">
                              <div className="min-w-0">
                                <span className="block truncate text-sm font-semibold">
                                  {notification.title || t.unknown}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  #{notification.id || "—"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4">
                              <p className="line-clamp-2 text-sm text-muted-foreground">
                                {notification.message || "—"}
                              </p>
                            </TableCell>
                            <TableCell className="px-4">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs",
                                  notification.isRead
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-amber-200 bg-amber-50 text-amber-700",
                                )}
                              >
                                {notification.isRead ? t.read : t.unread}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-2">
                                {notification.channel === "EMAIL" ? (
                                  <Mail className="h-4 w-4" />
                                ) : notification.channel === "WHATSAPP" ? (
                                  <MessageCircle className="h-4 w-4" />
                                ) : (
                                  <Bell className="h-4 w-4" />
                                )}
                                {getChannelLabel(notification.channel, locale)}
                              </span>
                            </TableCell>
                            <TableCell className="px-4">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs",
                                  getTypeBadgeClass(notification.notificationType),
                                )}
                              >
                                {getTypeLabel(notification.notificationType, locale)}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs",
                                  getPriorityBadgeClass(notification.priority),
                                )}
                              >
                                {getPriorityLabel(notification.priority, locale)}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 text-sm tabular-nums text-muted-foreground">
                              {formatDateTime(notification.createdAt)}
                            </TableCell>
                            <TableCell className="px-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={() => setSelected(notification)}
                                >
                                  <Eye className="h-4 w-4" />
                                  {t.open}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={() => void markOneRead(notification)}
                                  disabled={actionLoading || notification.isRead}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  {t.markRead}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="h-80">
                            <EmptyState
                              title={hasFilters ? t.noResultsTitle : t.noDataTitle}
                              description={hasFilters ? t.noResultsDesc : t.noDataDesc}
                              resetLabel={t.reset}
                              showReset={hasFilters}
                              onReset={resetFilters}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {t.showing}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(filteredRows.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(state.count)}
                </span>{" "}
                {t.rows}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.detailTitle}</CardTitle>
              <CardDescription>{t.detailDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {selected ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{selected.title || t.unknown}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selected.message || "—"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs",
                          selected.isRead
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700",
                        )}
                      >
                        {selected.isRead ? t.read : t.unread}
                      </Badge>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div className="flex items-center justify-between gap-3 border-t pt-3">
                        <span className="text-muted-foreground">{t.id}</span>
                        <span className="font-medium tabular-nums">{selected.id || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t pt-3">
                        <span className="text-muted-foreground">{t.channel}</span>
                        <span>{getChannelLabel(selected.channel, locale)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t pt-3">
                        <span className="text-muted-foreground">{t.type}</span>
                        <span>{getTypeLabel(selected.notificationType, locale)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t pt-3">
                        <span className="text-muted-foreground">{t.priority}</span>
                        <span>{getPriorityLabel(selected.priority, locale)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t pt-3">
                        <span className="text-muted-foreground">{t.source}</span>
                        <span className="truncate">{selected.sourceType || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t pt-3">
                        <span className="text-muted-foreground">{t.createdAt}</span>
                        <span className="tabular-nums">{formatDateTime(selected.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t pt-3">
                        <span className="text-muted-foreground">{t.readAt}</span>
                        <span className="tabular-nums">{formatDateTime(selected.readAt)}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full rounded-xl"
                    onClick={() => void markOneRead(selected)}
                    disabled={actionLoading || selected.isRead}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {t.markRead}
                  </Button>

                  <Button asChild variant="outline" className="w-full rounded-xl bg-background">
                    <Link href="/company">{t.eyebrow}</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
                  <div className="rounded-full bg-background p-4 text-muted-foreground">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{t.noSelection}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t.detailDescription}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}