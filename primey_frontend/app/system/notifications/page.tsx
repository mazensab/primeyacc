"use client";

/* ============================================================
   📂 primey_frontend/app/system/notifications/page.tsx
   🔔 Primey Care — Notifications
   ------------------------------------------------------------
   ✅ Same approved Customers / Orders / Users table pattern
   ✅ Real API only with safe notification-center endpoint fallbacks
   ✅ Inbox list/count/latest + mark_read/mark_unread/mark_all_read/bulk_mark_read
   ✅ Header buttons / KPI cards / toolbar / table unified
   ✅ Search / read filter / severity filter / type filter / date range
   ✅ Link to notification details: /system/notifications/[id]
   ✅ Link to notification settings: /system/notifications/settings
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Bell,
  CheckCircle2,
  ColumnsIcon,
  Eye,
  FileSpreadsheet,
  Inbox,
  Loader2,
  MailCheck,
  MoreHorizontal,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
type SeverityFilter =
  | "all"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "critical";
type TypeFilter =
  | "all"
  | "system"
  | "order"
  | "invoice"
  | "payment"
  | "whatsapp"
  | "customer"
  | "provider";
type SortKey = "newest" | "oldest" | "title" | "severity" | "type" | "read";

type ColumnKey =
  | "select"
  | "notification"
  | "type"
  | "severity"
  | "status"
  | "createdAt"
  | "readAt"
  | "link"
  | "actions";

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
  recipient_id: number | null;
  event_id: number | null;
};

type NotificationCounts = {
  total: number;
  unread: number;
  read: number;
  info: number;
  success: number;
  warning: number;
  error: number;
  critical: number;
};

type PaginationState = {
  page: number;
  page_size: number;
  total_pages: number;
  total_items: number;
  has_next: boolean;
  has_previous: boolean;
};

type InboxApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  results?: unknown[];
  count?: number;
  meta?: unknown;
};

const PAGE_SIZE = 12;

const API_BASE_CANDIDATES = [
  "/api/notifications",
  "/api/notification-center",
  "/api/notification_center",
  "/api/notification-center-api",
];

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  notification: true,
  type: true,
  severity: true,
  status: true,
  createdAt: true,
  readAt: true,
  link: true,
  actions: true,
};

const translations = {
  ar: {
    title: "الإشعارات",
    subtitle: "متابعة إشعارات المستخدم الحالي، الرسائل غير المقروءة، والتنبيهات المهمة.",
    settings: "الإعدادات",
    details: "عرض التفاصيل",
    refresh: "تحديث",
    markAllRead: "تحديد الكل كمقروء",
    markSelectedRead: "تحديد المحدد كمقروء",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث بعنوان الإشعار أو الرسالة أو النوع...",
    total: "إجمالي الإشعارات",
    unread: "غير مقروءة",
    read: "مقروءة",
    alerts: "تنبيهات مهمة",
    notification: "الإشعار",
    type: "النوع",
    severity: "الشدة",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",
    readAt: "تاريخ القراءة",
    link: "الرابط",
    actions: "الإجراءات",
    columns: "الأعمدة",
    sort: "الترتيب",
    selected: "محدد",
    allStatuses: "كل الحالات",
    allSeverities: "كل الشدات",
    allTypes: "كل الأنواع",
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
    readStatus: "مقروء",
    unreadStatus: "غير مقروء",
    from: "من",
    to: "إلى",
    newest: "الأحدث",
    oldest: "الأقدم",
    titleSort: "العنوان",
    severitySort: "الشدة",
    typeSort: "النوع",
    readSort: "حالة القراءة",
    activeFilters: "فلاتر مفعلة",
    clearSelection: "إلغاء التحديد",
    openLink: "فتح الرابط",
    markRead: "تحديد كمقروء",
    markUnread: "تحديد كغير مقروء",
    actionSuccess: "تم تنفيذ العملية بنجاح.",
    actionFailed: "تعذر تنفيذ العملية.",
    noDataTitle: "لا توجد إشعارات بعد",
    noDataDesc: "عند وصول إشعارات جديدة ستظهر هنا.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض إشعارات أخرى.",
    errorTitle: "تعذر تحميل الإشعارات",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير الإشعارات",
    generatedAt: "تاريخ الطباعة",
    showing: "عرض",
    rows: "صفوف",
    page: "صفحة",
    of: "من",
    next: "التالي",
    previous: "السابق",
    unknown: "غير محدد",
    noLink: "لا يوجد رابط",
  },
  en: {
    title: "Notifications",
    subtitle: "Monitor current user notifications, unread messages, and important alerts.",
    settings: "Settings",
    details: "View details",
    refresh: "Refresh",
    markAllRead: "Mark all as read",
    markSelectedRead: "Mark selected as read",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    searchPlaceholder: "Search title, message, or type...",
    total: "Total notifications",
    unread: "Unread",
    read: "Read",
    alerts: "Important alerts",
    notification: "Notification",
    type: "Type",
    severity: "Severity",
    status: "Status",
    createdAt: "Created at",
    readAt: "Read at",
    link: "Link",
    actions: "Actions",
    columns: "Columns",
    sort: "Sort",
    selected: "Selected",
    allStatuses: "All statuses",
    allSeverities: "All severities",
    allTypes: "All types",
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
    readStatus: "Read",
    unreadStatus: "Unread",
    from: "From",
    to: "To",
    newest: "Newest",
    oldest: "Oldest",
    titleSort: "Title",
    severitySort: "Severity",
    typeSort: "Type",
    readSort: "Read status",
    activeFilters: "Active filters",
    clearSelection: "Clear selection",
    openLink: "Open link",
    markRead: "Mark as read",
    markUnread: "Mark as unread",
    actionSuccess: "Action completed successfully.",
    actionFailed: "Unable to complete action.",
    noDataTitle: "No notifications yet",
    noDataDesc: "New notifications will appear here once received.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other notifications.",
    errorTitle: "Unable to load notifications",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Notifications report",
    generatedAt: "Generated at",
    showing: "Showing",
    rows: "Rows",
    page: "Page",
    of: "of",
    next: "Next",
    previous: "Previous",
    unknown: "Unknown",
    noLink: "No link",
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

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
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

  throw lastError instanceof Error
    ? lastError
    : new Error("Notification API request failed.");
}

function extractResults(payload: InboxApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;

  const data = asRecord(payload.data);
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;

  return [];
}

function extractMeta(payload: InboxApiResponse) {
  return asRecord(payload.meta);
}

function normalizeCounts(value: unknown): NotificationCounts {
  const item = asRecord(value);

  return {
    total: toNumber(item.total),
    unread: toNumber(item.unread),
    read: toNumber(item.read),
    info: toNumber(item.info),
    success: toNumber(item.success),
    warning: toNumber(item.warning),
    error: toNumber(item.error),
    critical: toNumber(item.critical),
  };
}

function extractCounts(payload: InboxApiResponse): NotificationCounts {
  const meta = asRecord(payload.meta);
  const data = asRecord(payload.data);

  return normalizeCounts(meta.counts || data.counts || {});
}

function extractPagination(payload: InboxApiResponse): PaginationState {
  const meta = extractMeta(payload);

  return {
    page: toNumber(meta.page, 1),
    page_size: toNumber(meta.page_size, PAGE_SIZE),
    total_pages: Math.max(toNumber(meta.total_pages, 1), 1),
    total_items: toNumber(meta.total_items, toNumber(payload.count)),
    has_next: toBoolean(meta.has_next),
    has_previous: toBoolean(meta.has_previous),
  };
}

function normalizeNotification(value: unknown): NotificationRecord {
  const item = asRecord(value);

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
    recipient_id:
      item.recipient_id === null || item.recipient_id === undefined
        ? null
        : toNumber(item.recipient_id),
    event_id:
      item.event_id === null || item.event_id === undefined
        ? null
        : toNumber(item.event_id),
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

  return type ? type : t.system;
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

function HeaderSortButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center justify-start gap-1 truncate text-xs font-semibold transition hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="truncate">{children}</span>
      <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

function TableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-11 whitespace-nowrap px-4 text-right align-middle text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function TableBodyCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableCell
      className={cn(
        "h-[62px] overflow-hidden px-4 text-right align-middle",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}

export default function SystemNotificationsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [notifications, setNotifications] = React.useState<NotificationRecord[]>([]);
  const [counts, setCounts] = React.useState<NotificationCounts>(() => normalizeCounts({}));
  const [pagination, setPagination] = React.useState<PaginationState>({
    page: 1,
    page_size: PAGE_SIZE,
    total_pages: 1,
    total_items: 0,
    has_next: false,
    has_previous: false,
  });

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState("");
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [readFilter, setReadFilter] = React.useState<ReadFilter>("all");
  const [severityFilter, setSeverityFilter] = React.useState<SeverityFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [visibleColumns, setVisibleColumns] =
    React.useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [page, setPage] = React.useState(1);

  const didLoadRef = React.useRef(false);

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

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadNotifications = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: String(page),
          page_size: String(PAGE_SIZE),
        });

        if (search) params.set("search", search);

        if (severityFilter !== "all") {
          params.set("severity", severityFilter);
        }

        if (typeFilter !== "all") {
          params.set("notification_type", typeFilter);
        }

        if (readFilter === "read") {
          params.set("is_read", "true");
        }

        if (readFilter === "unread") {
          params.set("is_read", "false");
        }

        const payload = await requestNotificationApi<InboxApiResponse>("/inbox/", {
          params,
          signal: controller.signal,
        });

        const nextItems = extractResults(payload).map(normalizeNotification);
        const nextCounts = extractCounts(payload);
        const nextPagination = extractPagination(payload);

        setNotifications(nextItems);
        setCounts(nextCounts);
        setPagination(nextPagination);
        setSelectedIds([]);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setNotifications([]);
        setCounts(normalizeCounts({}));
        setPagination({
          page,
          page_size: PAGE_SIZE,
          total_pages: 1,
          total_items: 0,
          has_next: false,
          has_previous: false,
        });
        setSelectedIds([]);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [page, readFilter, search, severityFilter, t.errorDesc, typeFilter],
  );

  React.useEffect(() => {
    if (!didLoadRef.current) {
      didLoadRef.current = true;
      void loadNotifications();
      return;
    }

    void loadNotifications({ silent: true });
  }, [loadNotifications]);

  const filteredNotifications = React.useMemo(() => {
    let items = [...notifications];

    if (dateFrom) {
      items = items.filter((item) => {
        const created = formatDate(item.created_at);
        return created !== "—" && created >= dateFrom;
      });
    }

    if (dateTo) {
      items = items.filter((item) => {
        const created = formatDate(item.created_at);
        return created !== "—" && created <= dateTo;
      });
    }

    items.sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.created_at || "").localeCompare(String(b.created_at || ""));
      }

      if (sortKey === "title") {
        return a.title.localeCompare(b.title);
      }

      if (sortKey === "severity") {
        return a.severity.localeCompare(b.severity);
      }

      if (sortKey === "type") {
        return a.notification_type.localeCompare(b.notification_type);
      }

      if (sortKey === "read") {
        return Number(a.is_read) - Number(b.is_read);
      }

      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

    return items;
  }, [dateFrom, dateTo, notifications, sortKey]);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const importantAlerts = counts.warning + counts.error + counts.critical;

  const hasActiveFilters =
    Boolean(search.trim()) ||
    readFilter !== "all" ||
    severityFilter !== "all" ||
    typeFilter !== "all" ||
    sortKey !== "newest" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const allPageSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((item) => selectedIds.includes(item.id));

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setReadFilter("all");
    setSeverityFilter("all");
    setTypeFilter("all");
    setSortKey("newest");
    setDateFrom("");
    setDateTo("");
    setSelectedIds([]);
    setPage(1);
  }

  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredNotifications.map((item) => item.id));
  }

  function toggleSelectNotification(id: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((item) => item !== id);
    });
  }

  async function runInboxAction(
    action: "mark_read" | "mark_unread" | "mark_all_read" | "bulk_mark_read",
    payload: ApiRecord = {},
  ) {
    setActionLoading(action);

    try {
      await requestNotificationApi<InboxApiResponse>("/inbox/", {
        method: "POST",
        body: {
          action,
          ...payload,
        },
      });

      toast.success(t.actionSuccess);
      await loadNotifications({ silent: true });
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

  function openNotificationLink(link: string) {
    if (!link) return;

    if (link.startsWith("http://") || link.startsWith("https://")) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }

    window.location.href = link;
  }

  function buildExportRows() {
    return filteredNotifications.map((item) => ({
      title: item.title,
      message: item.message,
      type: getTypeLabel(item.notification_type, locale),
      severity: getSeverityLabel(item.severity, locale),
      status: item.is_read ? t.readStatus : t.unreadStatus,
      createdAt: formatDateTime(item.created_at),
      readAt: formatDateTime(item.read_at),
      link: item.link || "—",
    }));
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
          <h2>${escapeHtml(t.printTitle)}</h2>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.notification)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.severity)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
                <th>${escapeHtml(t.readAt)}</th>
                <th>${escapeHtml(t.link)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.title)}<br />${escapeHtml(row.message)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.severity)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.createdAt)}</td>
                      <td>${escapeHtml(row.readAt)}</td>
                      <td>${escapeHtml(row.link)}</td>
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
    link.download = `primey-care-notifications-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }

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
              align-items: flex-start;
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
              font-size: 11px;
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
              <p>${escapeHtml(t.showing)}: ${escapeHtml(rows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.total)}</span><strong>${escapeHtml(counts.total)}</strong></div>
            <div class="box"><span>${escapeHtml(t.unread)}</span><strong>${escapeHtml(counts.unread)}</strong></div>
            <div class="box"><span>${escapeHtml(t.read)}</span><strong>${escapeHtml(counts.read)}</strong></div>
            <div class="box"><span>${escapeHtml(t.alerts)}</span><strong>${escapeHtml(importantAlerts)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.notification)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.severity)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
                <th>${escapeHtml(t.readAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.title)}<br />${escapeHtml(row.message)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.severity)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.createdAt)}</td>
                      <td>${escapeHtml(row.readAt)}</td>
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

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
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-80 w-full" />
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
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadNotifications({ silent: true })}
            disabled={refreshing || Boolean(actionLoading)}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/notifications/settings">
              <Settings className="h-4 w-4" />
              {t.settings}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void runInboxAction("mark_all_read")}
            disabled={Boolean(actionLoading) || counts.unread <= 0}
          >
            {actionLoading === "mark_all_read" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MailCheck className="h-4 w-4" />
            )}
            {t.markAllRead}
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.total}
          value={formatInteger(counts.total || pagination.total_items)}
          trend={`${t.showing} ${formatInteger(filteredNotifications.length)}`}
          icon={Inbox}
        />

        <KpiCard
          title={t.unread}
          value={formatInteger(counts.unread)}
          trend={t.unreadStatus}
          icon={Bell}
        />

        <KpiCard
          title={t.read}
          value={formatInteger(counts.read)}
          trend={t.readStatus}
          icon={CheckCircle2}
        />

        <KpiCard
          title={t.alerts}
          value={formatInteger(importantAlerts)}
          trend={`${t.error}: ${formatInteger(counts.error)}`}
          icon={ShieldAlert}
        />
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
              onClick={() => void loadNotifications()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                  locale === "ar" ? "right-3" : "left-3",
                )}
              />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t.searchPlaceholder}
                className={cn(
                  "h-10 rounded-lg bg-background",
                  locale === "ar" ? "pr-9" : "pl-9",
                )}
              />
            </div>

            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={readFilter}
                  onValueChange={(value) => {
                    setReadFilter(value as ReadFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[145px]">
                    <CheckCircle2 className="h-4 w-4" />
                    <SelectValue placeholder={t.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    <SelectItem value="unread">{t.unreadStatus}</SelectItem>
                    <SelectItem value="read">{t.readStatus}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={severityFilter}
                  onValueChange={(value) => {
                    setSeverityFilter(value as SeverityFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[145px]">
                    <ShieldAlert className="h-4 w-4" />
                    <SelectValue placeholder={t.severity} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allSeverities}</SelectItem>
                    <SelectItem value="info">{t.info}</SelectItem>
                    <SelectItem value="success">{t.success}</SelectItem>
                    <SelectItem value="warning">{t.warning}</SelectItem>
                    <SelectItem value="error">{t.error}</SelectItem>
                    <SelectItem value="critical">{t.critical}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value as TypeFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[145px]">
                    <Bell className="h-4 w-4" />
                    <SelectValue placeholder={t.type} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allTypes}</SelectItem>
                    <SelectItem value="system">{t.system}</SelectItem>
                    <SelectItem value="order">{t.order}</SelectItem>
                    <SelectItem value="invoice">{t.invoice}</SelectItem>
                    <SelectItem value="payment">{t.payment}</SelectItem>
                    <SelectItem value="whatsapp">{t.whatsapp}</SelectItem>
                    <SelectItem value="customer">{t.customer}</SelectItem>
                    <SelectItem value="provider">{t.provider}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.from}</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.to}</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 rounded-lg bg-background">
                      <ColumnsIcon className="h-4 w-4" />
                      {t.columns}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                    <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(
                      [
                        ["select", t.selected],
                        ["notification", t.notification],
                        ["type", t.type],
                        ["severity", t.severity],
                        ["status", t.status],
                        ["createdAt", t.createdAt],
                        ["readAt", t.readAt],
                        ["link", t.link],
                        ["actions", t.actions],
                      ] as [ColumnKey, string][]
                    ).map(([key, label]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={visibleColumns[key]}
                        onCheckedChange={(checked) =>
                          setVisibleColumns((current) => ({
                            ...current,
                            [key]: Boolean(checked),
                          }))
                        }
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-background"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 rounded-lg bg-background">
                      <ArrowUpDown className="h-4 w-4" />
                      {t.sort}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                    {(
                      [
                        ["newest", t.newest],
                        ["oldest", t.oldest],
                        ["title", t.titleSort],
                        ["severity", t.severitySort],
                        ["type", t.typeSort],
                        ["read", t.readSort],
                      ] as [SortKey, string][]
                    ).map(([key, label]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={sortKey === key}
                        onCheckedChange={() => setSortKey(key)}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedIds.length > 0 ? (
                  <>
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg bg-background"
                      disabled={Boolean(actionLoading)}
                      onClick={() =>
                        void runInboxAction("bulk_mark_read", {
                          ids: selectedIds,
                        })
                      }
                    >
                      {actionLoading === "bulk_mark_read" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MailCheck className="h-4 w-4" />
                      )}
                      {t.markSelectedRead} ({formatInteger(selectedIds.length)})
                    </Button>

                    <Button
                      variant="outline"
                      className="h-9 rounded-lg bg-background"
                      onClick={() => setSelectedIds([])}
                    >
                      <XCircle className="h-4 w-4" />
                      {t.clearSelection}
                    </Button>
                  </>
                ) : null}

                {hasActiveFilters ? (
                  <Badge variant="secondary" className="h-9 rounded-lg px-3 text-xs font-semibold">
                    {t.activeFilters}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[1160px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {visibleColumns.select ? (
                      <TableHeaderCell className="w-[46px] px-3">
                        <Checkbox
                          checked={allPageSelected}
                          onCheckedChange={(checked) => toggleSelectAllPage(Boolean(checked))}
                          aria-label={t.selected}
                        />
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.notification ? (
                      <TableHeaderCell className="w-[360px]">
                        <HeaderSortButton
                          active={sortKey === "title"}
                          onClick={() => setSortKey("title")}
                        >
                          {t.notification}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.type ? (
                      <TableHeaderCell className="w-[125px]">
                        <HeaderSortButton
                          active={sortKey === "type"}
                          onClick={() => setSortKey("type")}
                        >
                          {t.type}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.severity ? (
                      <TableHeaderCell className="w-[125px]">
                        <HeaderSortButton
                          active={sortKey === "severity"}
                          onClick={() => setSortKey("severity")}
                        >
                          {t.severity}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.status ? (
                      <TableHeaderCell className="w-[120px]">
                        <HeaderSortButton
                          active={sortKey === "read"}
                          onClick={() => setSortKey("read")}
                        >
                          {t.status}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.createdAt ? (
                      <TableHeaderCell className="w-[145px]">
                        <HeaderSortButton
                          active={sortKey === "newest" || sortKey === "oldest"}
                          onClick={() => setSortKey("newest")}
                        >
                          {t.createdAt}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.readAt ? (
                      <TableHeaderCell className="w-[145px]">{t.readAt}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.link ? (
                      <TableHeaderCell className="w-[130px]">{t.link}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.actions ? (
                      <TableHeaderCell className="w-[72px] text-center">
                        {t.actions}
                      </TableHeaderCell>
                    ) : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredNotifications.length ? (
                    filteredNotifications.map((notification) => (
                      <TableRow key={notification.id} className="h-[62px]">
                        {visibleColumns.select ? (
                          <TableBodyCell className="w-[46px] px-3">
                            <Checkbox
                              checked={selectedIds.includes(notification.id)}
                              onCheckedChange={(checked) =>
                                toggleSelectNotification(notification.id, Boolean(checked))
                              }
                              aria-label={notification.title}
                            />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.notification ? (
                          <TableBodyCell className="w-[360px]">
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className={cn(
                                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
                                  notification.is_read ? "bg-muted/40" : "bg-emerald-50",
                                )}
                              >
                                <Bell
                                  className={cn(
                                    "h-4 w-4",
                                    notification.is_read
                                      ? "text-muted-foreground"
                                      : "text-emerald-700",
                                  )}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/system/notifications/${notification.id}`}
                                  className="block truncate text-sm font-semibold text-foreground hover:underline"
                                >
                                  {notification.title || t.unknown}
                                </Link>
                                <p className="truncate text-xs text-muted-foreground">
                                  {notification.message || "—"}
                                </p>
                              </div>
                            </div>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.type ? (
                          <TableBodyCell className="w-[125px]">
                            <Badge
                              variant="outline"
                              className="max-w-full rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium"
                            >
                              <span className="truncate">
                                {getTypeLabel(notification.notification_type, locale)}
                              </span>
                            </Badge>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.severity ? (
                          <TableBodyCell className="w-[125px]">
                            <SeverityBadge severity={notification.severity} locale={locale} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.status ? (
                          <TableBodyCell className="w-[120px]">
                            <ReadBadge isRead={notification.is_read} locale={locale} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.createdAt ? (
                          <TableBodyCell className="w-[145px]">
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {formatDateTime(notification.created_at)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.readAt ? (
                          <TableBodyCell className="w-[145px]">
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {formatDateTime(notification.read_at)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.link ? (
                          <TableBodyCell className="w-[130px]">
                            {notification.link ? (
                              <button
                                type="button"
                                onClick={() => openNotificationLink(notification.link)}
                                className="truncate text-sm font-medium text-foreground hover:underline"
                              >
                                {t.openLink}
                              </button>
                            ) : (
                              <span className="text-sm text-muted-foreground">{t.noLink}</span>
                            )}
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.actions ? (
                          <TableBodyCell className="w-[72px] text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                  disabled={Boolean(actionLoading)}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align={locale === "ar" ? "start" : "end"}
                                className="w-52"
                              >
                                <DropdownMenuItem asChild>
                                  <Link href={`/system/notifications/${notification.id}`}>
                                    <Eye className="h-4 w-4" />
                                    {t.details}
                                  </Link>
                                </DropdownMenuItem>

                                {notification.link ? (
                                  <DropdownMenuItem
                                    onClick={() => openNotificationLink(notification.link)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    {t.openLink}
                                  </DropdownMenuItem>
                                ) : null}

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() =>
                                    void runInboxAction("mark_read", {
                                      id: notification.id,
                                    })
                                  }
                                  disabled={notification.is_read}
                                >
                                  <MailCheck className="h-4 w-4" />
                                  {t.markRead}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    void runInboxAction("mark_unread", {
                                      id: notification.id,
                                    })
                                  }
                                  disabled={!notification.is_read}
                                >
                                  <Bell className="h-4 w-4" />
                                  {t.markUnread}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableBodyCell>
                        ) : null}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={visibleColumnCount} className="h-72">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                            <Bell className="h-6 w-6 text-muted-foreground" />
                          </div>

                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {hasActiveFilters ? t.noResultsTitle : t.noDataTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {hasActiveFilters ? t.noResultsDesc : t.noDataDesc}
                            </p>
                          </div>

                          {hasActiveFilters ? (
                            <Button
                              variant="outline"
                              className="h-9 rounded-lg"
                              onClick={resetFilters}
                            >
                              <RotateCcw className="h-4 w-4" />
                              {t.reset}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {t.showing}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(filteredNotifications.length)}
              </span>{" "}
              {t.of}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(pagination.total_items || counts.total)}
              </span>{" "}
              {t.rows}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={!pagination.has_previous || refreshing}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                {t.previous}
              </Button>

              <div className="rounded-lg border bg-background px-3 py-2 text-sm tabular-nums">
                {t.page} {formatInteger(page)} {t.of}{" "}
                {formatInteger(pagination.total_pages)}
              </div>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={!pagination.has_next || refreshing}
                onClick={() =>
                  setPage((current) =>
                    Math.min(current + 1, pagination.total_pages),
                  )
                }
              >
                {t.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}