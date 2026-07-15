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
import {
  AlertTriangle,
  ArrowUpDown,
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  Filter,
  Loader2,
  Mail,
  MessageCircle,
  MoreVertical,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
type SortKey = "newest" | "oldest" | "priority";
type ChannelFilter = "all" | "IN_APP" | "EMAIL" | "WHATSAPP" | "SYSTEM";
type TypeFilter = "all" | "INFO" | "SUCCESS" | "WARNING" | "ERROR";
type PriorityFilter = "all" | "LOW" | "NORMAL" | "HIGH" | "URGENT";
type NotificationDocumentMode = "full" | "table";

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
    createTest: "إنشاء إشعار اختبار",
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
    testCreated: "تم إنشاء إشعار اختبار.",
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
    companyFallback: "الشركة",
    fullReportTitle: "تقرير إشعارات الشركة",
    tableReportTitle: "قائمة إشعارات الشركة",
    generatedFor: "المنشأة",
    filtersApplied: "الفلاتر المطبقة",
    noFilters: "بدون فلاتر إضافية",
    fullPrintReady: "تم تجهيز تقرير إشعارات الشركة للطباعة.",
    tablePrintReady: "تم تجهيز قائمة إشعارات الشركة للطباعة.",
    fullExported: "تم تصدير تقرير إشعارات الشركة إلى Excel.",
    tableExported: "تم تصدير قائمة إشعارات الشركة إلى Excel.",
    popupBlocked:
      "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.",
    confirmMarkAllTitle: "تعليم جميع الإشعارات كمقروءة",
    confirmMarkAllDesc:
      "سيتم تعليم جميع الإشعارات غير المقروءة داخل مساحة الشركة الحالية كمقروءة.",
    cancel: "إلغاء",
    confirm: "تأكيد",
  },
  en: {
    eyebrow: "Messaging & Notifications",
    title: "Company Notifications Center",
    subtitle:
      "Track current-company notifications, user alerts, and company-wide notifications only.",
    refresh: "Refresh",
    markAllRead: "Mark all read",
    createTest: "Create test notification",
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
    testCreated: "Test notification created.",
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
    companyFallback: "Company",
    fullReportTitle: "Company Notifications Report",
    tableReportTitle: "Company Notifications List",
    generatedFor: "Company",
    filtersApplied: "Applied filters",
    noFilters: "No additional filters",
    fullPrintReady: "Company notifications report is ready to print.",
    tablePrintReady: "Company notifications list is ready to print.",
    fullExported: "Company notifications report exported to Excel.",
    tableExported: "Company notifications list exported to Excel.",
    popupBlocked:
      "The print window could not be opened. Allow pop-ups and try again.",
    confirmMarkAllTitle: "Mark all notifications as read",
    confirmMarkAllDesc:
      "All unread notifications in the current company workspace will be marked as read.",
    cancel: "Cancel",
    confirm: "Confirm",
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

  if (Number.isNaN(parsed.getTime())) {
    return String(value).replace("T", " ").slice(0, 16);
  }

  const year = String(parsed.getFullYear()).padStart(4, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
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
      ? (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "")
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

function extractCompanyName(payload: unknown) {
  const record = asRecord(payload);
  const company = asRecord(record.company);
  const profile = asRecord(record.profile);

  return normalizeText(
    company.name_ar ||
      company.name ||
      company.legal_name ||
      record.company_name ||
      record.companyName ||
      profile.company_name ||
      profile.companyName,
  );
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
    <Card className="group rounded-lg border bg-card shadow-none">
      <CardContent className="flex min-h-[128px] items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-xl font-black tracking-tight tabular-nums">
            {formatInteger(value)}
          </p>
          <p className="mt-6 line-clamp-2 text-xs text-muted-foreground">
            {description}
          </p>
        </div>

        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-4 py-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-10 w-80" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-lg border bg-card shadow-none">
            <CardContent className="space-y-4 p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-lg border bg-card shadow-none">
        <CardHeader>
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[480px] w-full" />
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
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border bg-background text-muted-foreground">
        <Search className="h-5 w-5" />
      </span>

      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {showReset && onReset ? (
        <Button type="button" variant="outline" onClick={onReset}>
          <RotateCcw />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default function CompanyNotificationsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [companyName, setCompanyName] = React.useState("");
  const [state, setState] = React.useState<ApiState>({
    count: 0,
    unreadCount: 0,
    notifications: [],
  });
  const [selected, setSelected] =
    React.useState<CompanyNotification | null>(null);
  const [markAllReadOpen, setMarkAllReadOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [readFilter, setReadFilter] =
    React.useState<ReadFilter>("all");
  const [channelFilter, setChannelFilter] =
    React.useState<ChannelFilter>("all");
  const [typeFilter, setTypeFilter] =
    React.useState<TypeFilter>("all");
  const [priorityFilter, setPriorityFilter] =
    React.useState<PriorityFilter>("all");
  const [sourceFilter, setSourceFilter] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("newest");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  React.useEffect(() => {
    const applyLocale = () => {
      const nextLocale = getInitialLocale();
      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir =
        nextLocale === "ar" ? "rtl" : "ltr";
      document.body.dir =
        nextLocale === "ar" ? "rtl" : "ltr";
    };

    applyLocale();
    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener(
        "primey-locale-changed",
        applyLocale,
      );
    };
  }, []);

  React.useEffect(() => {
    let active = true;

    void fetchJson<unknown>(makeApiUrl("/api/auth/whoami/"))
      .then((payload) => {
        if (!active) return;
        setCompanyName(extractCompanyName(payload));
      })
      .catch(() => {
        if (active) setCompanyName("");
      });

    return () => {
      active = false;
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

        const listPayload = await fetchJson<ApiRecord>(
          makeApiUrl("/api/company/notifications/", params),
        );
        const rows = extractArray(listPayload).map(
          normalizeNotification,
        );
        const unreadCount = rows.filter(
          (row) => !row.isRead,
        ).length;

        setState({
          count: extractCount(listPayload, rows),
          unreadCount,
          notifications: rows,
        });

        setSelected((current) => {
          if (!current) return null;
          return (
            rows.find((row) => row.id === current.id) || null
          );
        });

        if (silent) toast.success(t.loaded);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : t.errorDesc;

        setError(message);

        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.errorDesc, t.loaded],
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

      if (needle && !haystack.includes(needle)) return false;
      if (readFilter === "read" && !notification.isRead) {
        return false;
      }
      if (readFilter === "unread" && notification.isRead) {
        return false;
      }
      if (
        channelFilter !== "all" &&
        notification.channel !== channelFilter
      ) {
        return false;
      }
      if (
        typeFilter !== "all" &&
        notification.notificationType !== typeFilter
      ) {
        return false;
      }
      if (
        priorityFilter !== "all" &&
        notification.priority !== priorityFilter
      ) {
        return false;
      }

      if (sourceFilter.trim()) {
        const sourceNeedle = sourceFilter
          .trim()
          .toLowerCase();
        const sourceHaystack = [
          notification.sourceType,
          notification.sourceId,
        ]
          .join(" ")
          .toLowerCase();

        if (!sourceHaystack.includes(sourceNeedle)) {
          return false;
        }
      }

      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === "oldest") {
        return (
          rowDateValue(a.createdAt) -
          rowDateValue(b.createdAt)
        );
      }

      if (sort === "priority") {
        return (
          priorityWeight(b.priority) -
          priorityWeight(a.priority)
        );
      }

      return (
        rowDateValue(b.createdAt) -
        rowDateValue(a.createdAt)
      );
    });
  }, [
    channelFilter,
    priorityFilter,
    readFilter,
    search,
    sort,
    sourceFilter,
    state.notifications,
    typeFilter,
  ]);

  const readCount = Math.max(
    state.count - state.unreadCount,
    0,
  );
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

  const filterSummary = React.useMemo(() => {
    const parts: string[] = [];

    if (search.trim()) {
      parts.push(`${t.search}: ${search.trim()}`);
    }

    if (readFilter !== "all") {
      parts.push(
        `${t.status}: ${
          readFilter === "read" ? t.read : t.unread
        }`,
      );
    }

    if (channelFilter !== "all") {
      parts.push(
        `${t.channel}: ${getChannelLabel(
          channelFilter,
          locale,
        )}`,
      );
    }

    if (typeFilter !== "all") {
      parts.push(
        `${t.type}: ${getTypeLabel(typeFilter, locale)}`,
      );
    }

    if (priorityFilter !== "all") {
      parts.push(
        `${t.priority}: ${getPriorityLabel(
          priorityFilter,
          locale,
        )}`,
      );
    }

    if (sourceFilter.trim()) {
      parts.push(`${t.source}: ${sourceFilter.trim()}`);
    }

    if (sort !== "newest") {
      parts.push(
        `${t.sort}: ${
          sort === "oldest" ? t.oldest : t.prioritySort
        }`,
      );
    }

    return parts.length ? parts.join(" • ") : t.noFilters;
  }, [
    channelFilter,
    locale,
    priorityFilter,
    readFilter,
    search,
    sort,
    sourceFilter,
    t,
    typeFilter,
  ]);

  const buildNotificationsDocument = React.useCallback(
    (mode: NotificationDocumentMode) => {
      const reportTitle =
        mode === "full"
          ? t.fullReportTitle
          : t.tableReportTitle;
      const safeCompanyName =
        companyName || t.companyFallback;
      const generatedAt = formatDateTime(
        new Date().toISOString(),
      );
      const textAlign =
        dir === "rtl" ? "right" : "left";
      const summary =
        mode === "full"
          ? `
            <table class="summary-table">
              <tbody>
                <tr>
                  <th>${escapeHtml(
                    t.totalNotifications,
                  )}</th>
                  <td>${escapeHtml(
                    formatInteger(state.count),
                  )}</td>
                  <th>${escapeHtml(
                    t.unreadNotifications,
                  )}</th>
                  <td>${escapeHtml(
                    formatInteger(state.unreadCount),
                  )}</td>
                </tr>
                <tr>
                  <th>${escapeHtml(
                    t.readNotifications,
                  )}</th>
                  <td>${escapeHtml(
                    formatInteger(readCount),
                  )}</td>
                  <th>${escapeHtml(
                    t.urgentNotifications,
                  )}</th>
                  <td>${escapeHtml(
                    formatInteger(urgentCount),
                  )}</td>
                </tr>
              </tbody>
            </table>
          `
          : "";

      return `
        <!doctype html>
        <html dir="${dir}" lang="${locale}">
          <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(reportTitle)}</title>
            <style>
              @page {
                size: A4 landscape;
                margin: 10mm;
              }

              * {
                box-sizing: border-box;
              }

              body {
                margin: 0;
                color: #111827;
                background: #ffffff;
                font-family: Tahoma, Arial, sans-serif;
                direction: ${dir};
              }

              .report {
                width: 100%;
              }

              .company-name {
                margin: 0;
                font-size: 13px;
                font-weight: 700;
              }

              h1 {
                margin: 4px 0 0;
                font-size: 24px;
                line-height: 1.25;
              }

              .meta {
                margin-top: 6px;
                color: #4b5563;
                font-size: 11px;
                line-height: 1.7;
              }

              .filter-box {
                margin-top: 10px;
                padding: 7px 9px;
                border: 1px solid #000000;
                font-size: 10px;
                line-height: 1.6;
              }

              table {
                width: 100%;
                margin-top: 10px;
                border-collapse: collapse;
                table-layout: fixed;
              }

              th,
              td {
                border: 1px solid #000000;
                padding: 6px 7px;
                font-size: 10px;
                line-height: 1.45;
                text-align: ${textAlign};
                vertical-align: middle;
                word-break: break-word;
              }

              th {
                background: #f3f4f6;
                font-weight: 700;
              }

              .summary-table th,
              .summary-table td {
                font-size: 11px;
              }

              .summary-table td {
                font-weight: 700;
                text-align: center;
              }

              .footer {
                margin-top: 7px;
                color: #4b5563;
                font-size: 9px;
              }

              @media print {
                body {
                  print-color-adjust: exact;
                  -webkit-print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
            <main class="report">
              <p class="company-name">
                ${escapeHtml(safeCompanyName)}
              </p>
              <h1>${escapeHtml(reportTitle)}</h1>
              <div class="meta">
                ${escapeHtml(t.generatedFor)}:
                ${escapeHtml(safeCompanyName)}
                &nbsp;•&nbsp;
                ${escapeHtml(t.generatedAt)}:
                ${escapeHtml(generatedAt)}
                &nbsp;•&nbsp;
                ${escapeHtml(t.showing)}:
                ${escapeHtml(
                  formatInteger(filteredRows.length),
                )}
              </div>

              ${summary}

              <div class="filter-box">
                <strong>${escapeHtml(
                  t.filtersApplied,
                )}:</strong>
                ${escapeHtml(filterSummary)}
              </div>

              ${tableHtmlForNotifications(
                filteredRows,
                locale,
              )}

              <div class="footer">
                ${escapeHtml(safeCompanyName)}
                &nbsp;•&nbsp;
                ${escapeHtml(generatedAt)}
              </div>
            </main>
          </body>
        </html>
      `;
    },
    [
      companyName,
      dir,
      filterSummary,
      filteredRows,
      locale,
      readCount,
      state.count,
      state.unreadCount,
      t,
      urgentCount,
    ],
  );

  function downloadNotifications(
    mode: NotificationDocumentMode,
  ) {
    if (!filteredRows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const documentHtml =
      buildNotificationsDocument(mode);
    const blob = new Blob([documentHtml], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download =
      mode === "full"
        ? `company-notifications-${date}.xls`
        : `company-notifications-table-${date}.xls`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.success(
      mode === "full"
        ? t.fullExported
        : t.tableExported,
    );
  }

  function printNotifications(
    mode: NotificationDocumentMode,
  ) {
    if (!filteredRows.length) {
      toast.error(t.printEmpty);
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast.error(t.popupBlocked);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(
      buildNotificationsDocument(mode),
    );
    printWindow.document.close();

    printWindow.onafterprint = () => {
      printWindow.close();
    };

    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);

    toast.success(
      mode === "full"
        ? t.fullPrintReady
        : t.tablePrintReady,
    );
  }

  async function markOneRead(
    notification: CompanyNotification,
  ) {
    if (!notification.id || notification.isRead) return;

    try {
      setActionLoading(true);

      await fetchJson<ApiRecord>(
        makeApiUrl(
          `/api/company/notifications/${notification.id}/read/`,
        ),
        { method: "POST" },
      );

      toast.success(t.markedRead);
      await loadNotifications({ silent: false });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : t.errorDesc;
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function markAllRead() {
    try {
      setActionLoading(true);

      await fetchJson<ApiRecord>(
        makeApiUrl(
          "/api/company/notifications/mark-all-read/",
        ),
        { method: "POST" },
      );

      toast.success(t.markedAllRead);
      setMarkAllReadOpen(false);
      await loadNotifications({ silent: false });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : t.errorDesc;
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function createTestNotification() {
    try {
      setActionLoading(true);

      const payload = await fetchJson<ApiRecord>(
        makeApiUrl("/api/company/notifications/test/"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
      const notificationPayload =
        payload.notification ||
        payload.data ||
        payload.result ||
        payload;
      const notification =
        normalizeNotification(notificationPayload);

      toast.success(t.testCreated);

      if (notification.id) {
        setSelected(notification);
      }

      await loadNotifications({ silent: false });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : t.errorDesc;
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main
        dir={dir}
        className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
      >
        <DashboardSkeleton />
      </main>
    );
  }

  if (error) {
    return (
      <main
        dir={dir}
        className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
      >
        <Card className="mx-auto max-w-3xl rounded-lg border-destructive/30 bg-card shadow-none">
          <CardHeader className="text-center">
            <span className="mx-auto mb-2 inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="h-7 w-7" />
            </span>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-center">
            <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              {error}
            </p>

            <Button
              type="button"
              onClick={() =>
                void loadNotifications({ silent: true })
              }
            >
              <RefreshCw />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main
      dir={dir}
      className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 py-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className="mb-3 gap-2 rounded-full bg-background font-normal"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t.eyebrow}
            </Badge>

            <h1 className="text-3xl font-black tracking-tight">
              {t.title}
            </h1>

            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {t.subtitle}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadNotifications({ silent: true })
              }
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              {t.refresh}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setMarkAllReadOpen(true)}
              disabled={
                actionLoading || !state.unreadCount
              }
            >
              {actionLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <CheckCheck />
              )}
              {t.markAllRead}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void createTestNotification()
              }
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {t.createTest}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadNotifications("full")
              }
            >
              <FileSpreadsheet />
              {t.exportExcel}
            </Button>

            <Button
              type="button"
              onClick={() =>
                printNotifications("full")
              }
            >
              <Printer />
              {t.print}
            </Button>
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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

        <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
          <CardHeader className="gap-4 border-b p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base font-bold">
                    {t.listTitle}
                  </CardTitle>

                  <Badge
                    variant="outline"
                    className="rounded-full bg-background font-normal tabular-nums"
                  >
                    {formatInteger(filteredRows.length)}
                  </Badge>

                  {state.unreadCount ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-amber-200 bg-amber-50 font-normal text-amber-700"
                    >
                      {t.unread}:{" "}
                      {formatInteger(state.unreadCount)}
                    </Badge>
                  ) : null}
                </div>

                <CardDescription className="mt-2">
                  {t.listDescription}
                </CardDescription>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    downloadNotifications("table")
                  }
                >
                  <FileSpreadsheet />
                  {t.exportExcel}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    printNotifications("table")
                  }
                >
                  <Printer />
                  {t.print}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-5">
            <div className="space-y-3 rounded-lg border bg-background p-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto]">
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder={t.search}
                    className="ps-9"
                  />
                </div>

                <Select
                  value={readFilter}
                  onValueChange={(value) =>
                    setReadFilter(value as ReadFilter)
                  }
                >
                  <SelectTrigger>
                    <Filter className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t.all}
                    </SelectItem>
                    <SelectItem value="unread">
                      {t.unread}
                    </SelectItem>
                    <SelectItem value="read">
                      {t.read}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sort}
                  onValueChange={(value) =>
                    setSort(value as SortKey)
                  }
                >
                  <SelectTrigger>
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">
                      {t.newest}
                    </SelectItem>
                    <SelectItem value="oldest">
                      {t.oldest}
                    </SelectItem>
                    <SelectItem value="priority">
                      {t.prioritySort}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={resetFilters}
                >
                  <RotateCcw />
                  {t.reset}
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Select
                  value={channelFilter}
                  onValueChange={(value) =>
                    setChannelFilter(
                      value as ChannelFilter,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t.channel}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((item) => (
                      <SelectItem
                        key={item}
                        value={item}
                      >
                        {item === "all"
                          ? t.all
                          : getChannelLabel(
                              item,
                              locale,
                            )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={typeFilter}
                  onValueChange={(value) =>
                    setTypeFilter(value as TypeFilter)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.type} />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((item) => (
                      <SelectItem
                        key={item}
                        value={item}
                      >
                        {item === "all"
                          ? t.all
                          : getTypeLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={priorityFilter}
                  onValueChange={(value) =>
                    setPriorityFilter(
                      value as PriorityFilter,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t.priority}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((item) => (
                      <SelectItem
                        key={item}
                        value={item}
                      >
                        {item === "all"
                          ? t.all
                          : getPriorityLabel(
                              item,
                              locale,
                            )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={sourceFilter}
                  onChange={(event) =>
                    setSourceFilter(event.target.value)
                  }
                  placeholder={t.source}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="overflow-x-auto">
                <Table className="min-w-[1120px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className="sticky start-0 z-20 w-[230px] bg-muted/40 px-4 text-start text-xs font-semibold text-muted-foreground">
                        {t.titleColumn}
                      </TableHead>
                      <TableHead className="w-[300px] px-4 text-start text-xs font-semibold text-muted-foreground">
                        {t.messageColumn}
                      </TableHead>
                      <TableHead className="w-[115px] px-4 text-start text-xs font-semibold text-muted-foreground">
                        {t.status}
                      </TableHead>
                      <TableHead className="w-[125px] px-4 text-start text-xs font-semibold text-muted-foreground">
                        {t.channel}
                      </TableHead>
                      <TableHead className="w-[110px] px-4 text-start text-xs font-semibold text-muted-foreground">
                        {t.type}
                      </TableHead>
                      <TableHead className="w-[110px] px-4 text-start text-xs font-semibold text-muted-foreground">
                        {t.priority}
                      </TableHead>
                      <TableHead className="w-[155px] px-4 text-start text-xs font-semibold text-muted-foreground">
                        {t.createdAt}
                      </TableHead>
                      <TableHead className="w-[72px] px-4 text-center text-xs font-semibold text-muted-foreground">
                        {t.actions}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredRows.length ? (
                      filteredRows.map((notification) => (
                        <TableRow
                          key={notification.id}
                          className={cn(
                            "h-[64px] cursor-pointer transition-colors hover:bg-muted/30",
                            selected?.id ===
                              notification.id &&
                              "bg-muted/40",
                          )}
                          onClick={() =>
                            setSelected(notification)
                          }
                        >
                          <TableCell
                            className={cn(
                              "sticky start-0 z-10 bg-background px-4",
                              selected?.id ===
                                notification.id &&
                                "bg-muted/40",
                            )}
                          >
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-semibold">
                                {notification.title ||
                                  t.unknown}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                #
                                {notification.id || "—"}
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
                              {notification.isRead
                                ? t.read
                                : t.unread}
                            </Badge>
                          </TableCell>

                          <TableCell className="px-4 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              {notification.channel ===
                              "EMAIL" ? (
                                <Mail className="h-4 w-4" />
                              ) : notification.channel ===
                                "WHATSAPP" ? (
                                <MessageCircle className="h-4 w-4" />
                              ) : (
                                <Bell className="h-4 w-4" />
                              )}
                              {getChannelLabel(
                                notification.channel,
                                locale,
                              )}
                            </span>
                          </TableCell>

                          <TableCell className="px-4">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs",
                                getTypeBadgeClass(
                                  notification.notificationType,
                                ),
                              )}
                            >
                              {getTypeLabel(
                                notification.notificationType,
                                locale,
                              )}
                            </Badge>
                          </TableCell>

                          <TableCell className="px-4">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs",
                                getPriorityBadgeClass(
                                  notification.priority,
                                ),
                              )}
                            >
                              {getPriorityLabel(
                                notification.priority,
                                locale,
                              )}
                            </Badge>
                          </TableCell>

                          <TableCell className="px-4 text-sm tabular-nums text-muted-foreground">
                            {formatDateTime(
                              notification.createdAt,
                            )}
                          </TableCell>

                          <TableCell
                            className="px-4 text-center"
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={t.actions}
                                >
                                  <MoreVertical />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align="end"
                                className="min-w-44"
                              >
                                <DropdownMenuItem
                                  onSelect={() =>
                                    setSelected(
                                      notification,
                                    )
                                  }
                                >
                                  <Eye />
                                  {t.open}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  className="text-emerald-700 focus:text-emerald-700"
                                  disabled={
                                    actionLoading ||
                                    notification.isRead
                                  }
                                  onSelect={() =>
                                    void markOneRead(
                                      notification,
                                    )
                                  }
                                >
                                  <CheckCircle2 />
                                  {t.markRead}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-72"
                        >
                          <EmptyState
                            title={
                              hasFilters
                                ? t.noResultsTitle
                                : t.noDataTitle
                            }
                            description={
                              hasFilters
                                ? t.noResultsDesc
                                : t.noDataDesc
                            }
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

        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="gap-4 border-b p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base font-bold">
                    {t.detailTitle}
                  </CardTitle>

                  {selected ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs",
                        selected.isRead
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700",
                      )}
                    >
                      {selected.isRead
                        ? t.read
                        : t.unread}
                    </Badge>
                  ) : null}
                </div>

                <CardDescription className="mt-2">
                  {t.detailDescription}
                </CardDescription>
              </div>

              {selected && !selected.isRead ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void markOneRead(selected)
                  }
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <CheckCircle2 />
                  )}
                  {t.markRead}
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="p-5">
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <h3 className="text-lg font-bold">
                    {selected.title || t.unknown}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {selected.message || "—"}
                  </p>
                </div>

                <div className="grid overflow-hidden rounded-lg border sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    [t.id, selected.id || "—"],
                    [
                      t.channel,
                      getChannelLabel(
                        selected.channel,
                        locale,
                      ),
                    ],
                    [
                      t.type,
                      getTypeLabel(
                        selected.notificationType,
                        locale,
                      ),
                    ],
                    [
                      t.priority,
                      getPriorityLabel(
                        selected.priority,
                        locale,
                      ),
                    ],
                    [
                      t.source,
                      selected.sourceType || "—",
                    ],
                    [
                      `${t.source} ID`,
                      selected.sourceId || "—",
                    ],
                    [
                      t.createdAt,
                      formatDateTime(selected.createdAt),
                    ],
                    [
                      t.readAt,
                      formatDateTime(selected.readAt),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="border-b p-4 last:border-b-0 sm:border-e sm:[&:nth-child(2n)]:border-e-0 xl:[&:nth-child(2n)]:border-e xl:[&:nth-child(4n)]:border-e-0 xl:[&:nth-last-child(-n+4)]:border-b-0"
                    >
                      <p className="text-xs text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-2 truncate text-sm font-medium tabular-nums">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 p-6 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border bg-background text-muted-foreground">
                  <ShieldCheck className="h-6 w-6" />
                </span>

                <div>
                  <h3 className="text-sm font-semibold">
                    {t.noSelection}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.detailDescription}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog
          open={markAllReadOpen}
          onOpenChange={(open) => {
            if (!actionLoading) {
              setMarkAllReadOpen(open);
            }
          }}
        >
          <AlertDialogContent
            dir={dir}
            className="sm:max-w-[500px]"
          >
            <AlertDialogHeader className="text-start">
              <span className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCheck className="h-5 w-5" />
              </span>

              <AlertDialogTitle>
                {t.confirmMarkAllTitle}
              </AlertDialogTitle>

              <AlertDialogDescription className="leading-7">
                {t.confirmMarkAllDesc}
                <span className="mt-3 block rounded-lg border bg-muted/30 px-3 py-2 text-foreground">
                  {t.unreadNotifications}:{" "}
                  <strong className="tabular-nums">
                    {formatInteger(state.unreadCount)}
                  </strong>
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel
                disabled={actionLoading}
              >
                {t.cancel}
              </AlertDialogCancel>

              <AlertDialogAction
                disabled={actionLoading}
                onClick={(event) => {
                  event.preventDefault();
                  void markAllRead();
                }}
                className="!bg-emerald-600 !text-white hover:!bg-emerald-700 focus-visible:!ring-emerald-600"
              >
                {actionLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CheckCheck />
                )}
                {t.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}
