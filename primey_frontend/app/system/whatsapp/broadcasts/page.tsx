"use client";

/* ============================================================
   📂 primey_frontend/app/system/whatsapp/broadcasts/page.tsx
   📣 Primey Care — WhatsApp Broadcasts
   ------------------------------------------------------------
   ✅ Same approved Products / Customers / Orders operational pattern
   ✅ Real API only: /api/whatsapp/broadcasts/
   ✅ Header / KPI cards / search / filters / columns / table unified
   ✅ Inline create broadcast form
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
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  Clipboard,
  ColumnsIcon,
  Copy,
  FileSpreadsheet,
  Loader2,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  ShieldAlert,
  TriangleAlert,
  UsersRound,
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

type BroadcastStatus =
  | "DRAFT"
  | "PENDING"
  | "SCHEDULED"
  | "SENDING"
  | "SENT"
  | "FAILED"
  | "CANCELLED";

type StatusFilter = "all" | BroadcastStatus;
type SortKey = "newest" | "oldest" | "title" | "status" | "recipients" | "sent";
type ColumnKey =
  | "select"
  | "broadcast"
  | "status"
  | "recipients"
  | "sent"
  | "failed"
  | "scheduledAt"
  | "createdAt"
  | "actions";

type BroadcastRecord = {
  id: number;
  title: string;
  message: string;
  status: BroadcastStatus | string;
  target_type: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by_name: string;
  notes: string;
};

type BroadcastForm = {
  title: string;
  message: string;
  target_type: "manual" | "customers" | "providers" | "agents" | "all";
  recipients: string;
  scheduled_at: string;
  notes: string;
  send_now: boolean;
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  results?: unknown[];
  count?: number;
  broadcast?: unknown;
};

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  broadcast: true,
  status: true,
  recipients: true,
  sent: true,
  failed: true,
  scheduledAt: true,
  createdAt: true,
  actions: true,
};

const translations = {
  ar: {
    title: "بث واتساب",
    subtitle: "إدارة رسائل واتساب الجماعية، الإرسال المباشر، الجدولة، ومتابعة نتائج الإرسال.",
    back: "واتساب",
    settings: "الإعدادات",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    totalBroadcasts: "إجمالي البث",
    sentBroadcasts: "مرسلة",
    failedBroadcasts: "فاشلة",
    pendingBroadcasts: "معلقة / مجدولة",
    broadcasts: "عمليات البث",
    createBroadcast: "إنشاء بث",
    saveBroadcast: "حفظ البث",
    saving: "جاري الحفظ",
    clearForm: "تفريغ النموذج",
    formDesc: "أنشئ رسالة بث واتساب. في الإرسال اليدوي افصل الأرقام بسطر جديد أو فاصلة.",
    searchPlaceholder: "ابحث بعنوان البث أو الرسالة أو الملاحظات...",
    allStatuses: "كل الحالات",
    status: "الحالة",
    draft: "مسودة",
    pending: "معلقة",
    scheduled: "مجدولة",
    sending: "جاري الإرسال",
    sent: "مرسلة",
    failed: "فاشلة",
    cancelled: "ملغاة",
    targetType: "الفئة المستهدفة",
    manual: "أرقام يدوية",
    customers: "العملاء",
    providers: "مقدمو الخدمة",
    agents: "المندوبون",
    all: "الكل",
    broadcast: "البث",
    recipients: "المستلمون",
    sentCount: "تم الإرسال",
    failedCount: "فشل",
    scheduledAt: "وقت الجدولة",
    createdAt: "تاريخ الإنشاء",
    actions: "الإجراءات",
    columns: "الأعمدة",
    sort: "الترتيب",
    selected: "محدد",
    newest: "الأحدث",
    oldest: "الأقدم",
    titleSort: "العنوان",
    statusSort: "الحالة",
    recipientsSort: "المستلمون",
    sentSort: "الإرسال",
    from: "من",
    to: "إلى",
    activeFilters: "فلاتر مفعلة",
    clearSelection: "إلغاء التحديد",
    broadcastTitle: "عنوان البث",
    messageBody: "نص الرسالة",
    manualRecipients: "الأرقام اليدوية",
    scheduleTime: "وقت الجدولة",
    notes: "ملاحظات",
    sendNow: "إرسال الآن",
    copyMessage: "نسخ الرسالة",
    copyRecipients: "نسخ الأرقام",
    noDataTitle: "لا توجد عمليات بث",
    noDataDesc: "ستظهر عمليات بث واتساب هنا عند إنشائها.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض عمليات بث أخرى.",
    errorTitle: "تعذر تحميل بث واتساب",
    errorDesc: "تأكد من تشغيل الباكند وخدمة واتساب ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    requiredTitle: "عنوان البث مطلوب.",
    requiredMessage: "نص الرسالة مطلوب.",
    requiredRecipients: "أدخل رقمًا واحدًا على الأقل عند اختيار الأرقام اليدوية.",
    saved: "تم حفظ بث واتساب بنجاح.",
    actionFailed: "تعذر تنفيذ العملية.",
    copied: "تم النسخ",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير بث واتساب",
    generatedAt: "تاريخ الطباعة",
    showing: "عرض",
    rows: "صفوف",
    of: "من",
    unknown: "غير محدد",
  },
  en: {
    title: "WhatsApp Broadcasts",
    subtitle: "Manage WhatsApp bulk messages, direct sending, scheduling, and delivery results.",
    back: "WhatsApp",
    settings: "Settings",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    totalBroadcasts: "Total broadcasts",
    sentBroadcasts: "Sent",
    failedBroadcasts: "Failed",
    pendingBroadcasts: "Pending / scheduled",
    broadcasts: "Broadcasts",
    createBroadcast: "Create broadcast",
    saveBroadcast: "Save broadcast",
    saving: "Saving",
    clearForm: "Clear form",
    formDesc: "Create a WhatsApp broadcast. For manual sending, separate phone numbers by new lines or commas.",
    searchPlaceholder: "Search by broadcast title, message, or notes...",
    allStatuses: "All statuses",
    status: "Status",
    draft: "Draft",
    pending: "Pending",
    scheduled: "Scheduled",
    sending: "Sending",
    sent: "Sent",
    failed: "Failed",
    cancelled: "Cancelled",
    targetType: "Target type",
    manual: "Manual numbers",
    customers: "Customers",
    providers: "Providers",
    agents: "Agents",
    all: "All",
    broadcast: "Broadcast",
    recipients: "Recipients",
    sentCount: "Sent",
    failedCount: "Failed",
    scheduledAt: "Scheduled at",
    createdAt: "Created at",
    actions: "Actions",
    columns: "Columns",
    sort: "Sort",
    selected: "Selected",
    newest: "Newest",
    oldest: "Oldest",
    titleSort: "Title",
    statusSort: "Status",
    recipientsSort: "Recipients",
    sentSort: "Sent",
    from: "From",
    to: "To",
    activeFilters: "Active filters",
    clearSelection: "Clear selection",
    broadcastTitle: "Broadcast title",
    messageBody: "Message body",
    manualRecipients: "Manual recipients",
    scheduleTime: "Schedule time",
    notes: "Notes",
    sendNow: "Send now",
    copyMessage: "Copy message",
    copyRecipients: "Copy recipients",
    noDataTitle: "No broadcasts",
    noDataDesc: "WhatsApp broadcasts will appear here once created.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other broadcasts.",
    errorTitle: "Unable to load WhatsApp broadcasts",
    errorDesc: "Make sure the backend and WhatsApp service are running, then try again.",
    tryAgain: "Try again",
    requiredTitle: "Broadcast title is required.",
    requiredMessage: "Message body is required.",
    requiredRecipients: "Enter at least one phone number when manual recipients are selected.",
    saved: "WhatsApp broadcast saved successfully.",
    actionFailed: "Unable to complete action.",
    copied: "Copied",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "WhatsApp broadcasts report",
    generatedAt: "Generated at",
    showing: "Showing",
    rows: "Rows",
    of: "of",
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
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["1", "true", "yes", "on", "send_now"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }

  return fallback;
}

function toEnglishDigits(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function normalizePhone(value: string) {
  return toEnglishDigits(value).replace(/[^\d+]/g, "");
}

function parseRecipients(value: string) {
  return value
    .split(/[\n,،;]+/g)
    .map((item) => normalizePhone(item))
    .filter(Boolean);
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
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

  if (envBase.endsWith("/api")) {
    return envBase.slice(0, -4);
  }

  return envBase;
}

function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
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
    method?: "GET" | "POST" | "PATCH";
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
      ...(options?.method && options.method !== "GET"
        ? { "Content-Type": "application/json" }
        : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method && options.method !== "GET"
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

function extractArray(payload: ApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;

  const data = asRecord(payload.data);
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.broadcasts)) return data.broadcasts;

  return [];
}

function normalizeBroadcast(value: unknown): BroadcastRecord {
  const item = asRecord(value);

  return {
    id: toNumber(item.id),
    title: normalizeText(item.title || item.name || item.broadcast_title),
    message: normalizeText(item.message || item.message_body || item.body || item.content),
    status: normalizeText(item.status || "PENDING").toUpperCase() as BroadcastStatus,
    target_type: normalizeText(item.target_type || item.audience || "manual"),
    recipient_count: toNumber(item.recipient_count ?? item.total_recipients ?? item.recipients_count),
    sent_count: toNumber(item.sent_count ?? item.success_count),
    failed_count: toNumber(item.failed_count ?? item.error_count),
    pending_count: toNumber(item.pending_count),
    scheduled_at: normalizeText(item.scheduled_at) || null,
    started_at: normalizeText(item.started_at) || null,
    completed_at: normalizeText(item.completed_at) || null,
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
    created_by_name: normalizeText(item.created_by_name || item.created_by),
    notes: normalizeText(item.notes),
  };
}

function createInitialForm(): BroadcastForm {
  return {
    title: "",
    message: "",
    target_type: "manual",
    recipients: "",
    scheduled_at: "",
    notes: "",
    send_now: true,
  };
}

function getStatusLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const status = normalizeText(value).toUpperCase();

  if (status === "DRAFT") return t.draft;
  if (status === "SCHEDULED") return t.scheduled;
  if (status === "SENDING") return t.sending;
  if (status === "SENT") return t.sent;
  if (status === "FAILED") return t.failed;
  if (status === "CANCELLED") return t.cancelled;

  return t.pending;
}

function getStatusClass(value: string) {
  const status = normalizeText(value).toUpperCase();

  if (status === "SENT") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (status === "SCHEDULED" || status === "SENDING") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

function getTargetLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const target = normalizeText(value).toLowerCase();

  if (target === "customers") return t.customers;
  if (target === "providers") return t.providers;
  if (target === "agents") return t.agents;
  if (target === "all") return t.all;

  return t.manual;
}

function StatusBadge({ value, locale }: { value: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        getStatusClass(value),
      )}
    >
      {getStatusLabel(value, locale)}
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function BroadcastsSkeleton() {
  return (
    <div className="w-full space-y-4">
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SystemWhatsAppBroadcastsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [broadcasts, setBroadcasts] = React.useState<BroadcastRecord[]>([]);
  const [form, setForm] = React.useState<BroadcastForm>(() => createInitialForm());

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [visibleColumns, setVisibleColumns] =
    React.useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);

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

  const loadBroadcasts = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          limit: "500",
          page_size: "500",
        });

        if (searchInput.trim()) params.set("search", searchInput.trim());
        if (statusFilter !== "all") params.set("status", statusFilter);

        const payload = await fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/broadcasts/", params), {
          signal: controller.signal,
        });

        setBroadcasts(extractArray(payload).map(normalizeBroadcast));
        setSelectedIds([]);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setError(message);
        setBroadcasts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [searchInput, statusFilter, t.errorDesc],
  );

  React.useEffect(() => {
    void loadBroadcasts();
  }, [loadBroadcasts]);

  const filteredBroadcasts = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let items = broadcasts.filter((broadcast) => {
      const matchesSearch =
        !query ||
        broadcast.title.toLowerCase().includes(query) ||
        broadcast.message.toLowerCase().includes(query) ||
        broadcast.notes.toLowerCase().includes(query) ||
        broadcast.target_type.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || broadcast.status.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });

    if (dateFrom) {
      items = items.filter((broadcast) => {
        const date = formatDate(broadcast.created_at || broadcast.scheduled_at);
        return date !== "—" && date >= dateFrom;
      });
    }

    if (dateTo) {
      items = items.filter((broadcast) => {
        const date = formatDate(broadcast.created_at || broadcast.scheduled_at);
        return date !== "—" && date <= dateTo;
      });
    }

    items = [...items].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.created_at || "").localeCompare(String(b.created_at || ""));
      }

      if (sortKey === "title") {
        return a.title.localeCompare(b.title);
      }

      if (sortKey === "status") {
        return a.status.localeCompare(b.status);
      }

      if (sortKey === "recipients") {
        return b.recipient_count - a.recipient_count;
      }

      if (sortKey === "sent") {
        return b.sent_count - a.sent_count;
      }

      return String(b.created_at || b.scheduled_at || "").localeCompare(
        String(a.created_at || a.scheduled_at || ""),
      );
    });

    return items;
  }, [broadcasts, dateFrom, dateTo, searchInput, sortKey, statusFilter]);

  const summary = React.useMemo(() => {
    const sent = broadcasts.filter((item) => item.status === "SENT").length;
    const failed = broadcasts.filter((item) => item.status === "FAILED").length;
    const pending = broadcasts.filter((item) =>
      ["DRAFT", "PENDING", "SCHEDULED", "SENDING"].includes(String(item.status)),
    ).length;

    return {
      total: broadcasts.length,
      sent,
      failed,
      pending,
    };
  }, [broadcasts]);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    statusFilter !== "all" ||
    sortKey !== "newest" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const allPageSelected =
    filteredBroadcasts.length > 0 &&
    filteredBroadcasts.every((item) => selectedIds.includes(item.id));

  function updateForm<T extends keyof BroadcastForm>(key: T, value: BroadcastForm[T]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setSortKey("newest");
    setDateFrom("");
    setDateTo("");
    setSelectedIds([]);
  }

  function clearForm() {
    setForm(createInitialForm());
  }

  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredBroadcasts.map((item) => item.id));
  }

  function toggleSelectItem(id: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((item) => item !== id);
    });
  }

  async function saveBroadcast() {
    const recipients = parseRecipients(form.recipients);

    if (!form.title.trim()) {
      toast.error(t.requiredTitle);
      return;
    }

    if (!form.message.trim()) {
      toast.error(t.requiredMessage);
      return;
    }

    if (form.target_type === "manual" && recipients.length <= 0) {
      toast.error(t.requiredRecipients);
      return;
    }

    setSaving(true);

    try {
      await fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/broadcasts/"), {
        method: "POST",
        body: {
          title: form.title.trim(),
          name: form.title.trim(),
          message: form.message.trim(),
          message_body: form.message.trim(),
          target_type: form.target_type,
          audience: form.target_type,
          recipients,
          recipient_numbers: recipients,
          scheduled_at: form.send_now ? "" : form.scheduled_at,
          notes: form.notes.trim(),
          send_now: form.send_now,
          status: form.send_now ? "PENDING" : "SCHEDULED",
        },
      });

      toast.success(t.saved);
      clearForm();
      await loadBroadcasts({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.actionFailed;

      toast.error(message);
    } finally {
      setSaving(false);
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

  function buildExportRows() {
    return filteredBroadcasts.map((broadcast) => ({
      title: broadcast.title || "—",
      status: getStatusLabel(broadcast.status, locale),
      target: getTargetLabel(broadcast.target_type, locale),
      recipients: broadcast.recipient_count,
      sent: broadcast.sent_count,
      failed: broadcast.failed_count,
      scheduledAt: formatDateTime(broadcast.scheduled_at),
      createdAt: formatDateTime(broadcast.created_at),
      message: broadcast.message || "—",
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
                <th>${escapeHtml(t.broadcast)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.targetType)}</th>
                <th>${escapeHtml(t.recipients)}</th>
                <th>${escapeHtml(t.sentCount)}</th>
                <th>${escapeHtml(t.failedCount)}</th>
                <th>${escapeHtml(t.scheduledAt)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
                <th>${escapeHtml(t.messageBody)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.title)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.target)}</td>
                      <td>${escapeHtml(row.recipients)}</td>
                      <td>${escapeHtml(row.sent)}</td>
                      <td>${escapeHtml(row.failed)}</td>
                      <td>${escapeHtml(row.scheduledAt)}</td>
                      <td>${escapeHtml(row.createdAt)}</td>
                      <td>${escapeHtml(row.message)}</td>
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
    link.download = `primey-care-whatsapp-broadcasts-${new Date().toISOString().slice(0, 10)}.xls`;
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
            <div class="box"><span>${escapeHtml(t.totalBroadcasts)}</span><strong>${escapeHtml(summary.total)}</strong></div>
            <div class="box"><span>${escapeHtml(t.sentBroadcasts)}</span><strong>${escapeHtml(summary.sent)}</strong></div>
            <div class="box"><span>${escapeHtml(t.failedBroadcasts)}</span><strong>${escapeHtml(summary.failed)}</strong></div>
            <div class="box"><span>${escapeHtml(t.pendingBroadcasts)}</span><strong>${escapeHtml(summary.pending)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.broadcast)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.targetType)}</th>
                <th>${escapeHtml(t.recipients)}</th>
                <th>${escapeHtml(t.sentCount)}</th>
                <th>${escapeHtml(t.failedCount)}</th>
                <th>${escapeHtml(t.scheduledAt)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.title)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.target)}</td>
                      <td>${escapeHtml(row.recipients)}</td>
                      <td>${escapeHtml(row.sent)}</td>
                      <td>${escapeHtml(row.failed)}</td>
                      <td>${escapeHtml(row.scheduledAt)}</td>
                      <td>${escapeHtml(row.createdAt)}</td>
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
        <BroadcastsSkeleton />
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
            <Link href="/system/whatsapp">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadBroadcasts({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/whatsapp/settings">
              <Settings className="h-4 w-4" />
              {t.settings}
            </Link>
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
          title={t.totalBroadcasts}
          value={formatInteger(summary.total)}
          trend={`${t.showing} ${formatInteger(filteredBroadcasts.length)}`}
          icon={Megaphone}
        />

        <KpiCard
          title={t.sentBroadcasts}
          value={formatInteger(summary.sent)}
          trend={t.sent}
          icon={CheckCircle2}
        />

        <KpiCard
          title={t.failedBroadcasts}
          value={formatInteger(summary.failed)}
          trend={t.failed}
          icon={XCircle}
        />

        <KpiCard
          title={t.pendingBroadcasts}
          value={formatInteger(summary.pending)}
          trend={t.scheduled}
          icon={CalendarClock}
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
              onClick={() => void loadBroadcasts()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
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
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                    <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[150px]">
                      <ShieldAlert className="h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allStatuses}</SelectItem>
                      <SelectItem value="DRAFT">{t.draft}</SelectItem>
                      <SelectItem value="PENDING">{t.pending}</SelectItem>
                      <SelectItem value="SCHEDULED">{t.scheduled}</SelectItem>
                      <SelectItem value="SENDING">{t.sending}</SelectItem>
                      <SelectItem value="SENT">{t.sent}</SelectItem>
                      <SelectItem value="FAILED">{t.failed}</SelectItem>
                      <SelectItem value="CANCELLED">{t.cancelled}</SelectItem>
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
                          ["broadcast", t.broadcast],
                          ["status", t.status],
                          ["recipients", t.recipients],
                          ["sent", t.sentCount],
                          ["failed", t.failedCount],
                          ["scheduledAt", t.scheduledAt],
                          ["createdAt", t.createdAt],
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

                  <Button variant="outline" className="h-9 rounded-lg bg-background" onClick={resetFilters}>
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
                          ["status", t.statusSort],
                          ["recipients", t.recipientsSort],
                          ["sent", t.sentSort],
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
                    <Button variant="outline" className="h-9 rounded-lg bg-background" onClick={() => setSelectedIds([])}>
                      <XCircle className="h-4 w-4" />
                      {t.clearSelection} ({formatInteger(selectedIds.length)})
                    </Button>
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
                <Table className="min-w-[1080px] table-fixed">
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

                      {visibleColumns.broadcast ? (
                        <TableHeaderCell className="w-[330px]">
                          <HeaderSortButton active={sortKey === "title"} onClick={() => setSortKey("title")}>
                            {t.broadcast}
                          </HeaderSortButton>
                        </TableHeaderCell>
                      ) : null}

                      {visibleColumns.status ? (
                        <TableHeaderCell className="w-[120px]">
                          <HeaderSortButton active={sortKey === "status"} onClick={() => setSortKey("status")}>
                            {t.status}
                          </HeaderSortButton>
                        </TableHeaderCell>
                      ) : null}

                      {visibleColumns.recipients ? (
                        <TableHeaderCell className="w-[105px]">
                          <HeaderSortButton active={sortKey === "recipients"} onClick={() => setSortKey("recipients")}>
                            {t.recipients}
                          </HeaderSortButton>
                        </TableHeaderCell>
                      ) : null}

                      {visibleColumns.sent ? (
                        <TableHeaderCell className="w-[105px]">
                          <HeaderSortButton active={sortKey === "sent"} onClick={() => setSortKey("sent")}>
                            {t.sentCount}
                          </HeaderSortButton>
                        </TableHeaderCell>
                      ) : null}

                      {visibleColumns.failed ? (
                        <TableHeaderCell className="w-[105px]">{t.failedCount}</TableHeaderCell>
                      ) : null}

                      {visibleColumns.scheduledAt ? (
                        <TableHeaderCell className="w-[145px]">{t.scheduledAt}</TableHeaderCell>
                      ) : null}

                      {visibleColumns.createdAt ? (
                        <TableHeaderCell className="w-[145px]">{t.createdAt}</TableHeaderCell>
                      ) : null}

                      {visibleColumns.actions ? (
                        <TableHeaderCell className="w-[72px] text-center">{t.actions}</TableHeaderCell>
                      ) : null}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredBroadcasts.length ? (
                      filteredBroadcasts.map((broadcast) => (
                        <TableRow key={broadcast.id} className="h-[62px]">
                          {visibleColumns.select ? (
                            <TableBodyCell className="w-[46px] px-3">
                              <Checkbox
                                checked={selectedIds.includes(broadcast.id)}
                                onCheckedChange={(checked) => toggleSelectItem(broadcast.id, Boolean(checked))}
                                aria-label={broadcast.title}
                              />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.broadcast ? (
                            <TableBodyCell className="w-[330px]">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-emerald-50">
                                  <Megaphone className="h-4 w-4 text-emerald-700" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {broadcast.title || t.unknown}
                                  </p>
                                  <p className="line-clamp-1 text-xs text-muted-foreground">
                                    {broadcast.message || "—"}
                                  </p>
                                </div>
                              </div>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.status ? (
                            <TableBodyCell className="w-[120px]">
                              <StatusBadge value={broadcast.status} locale={locale} />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.recipients ? (
                            <TableBodyCell className="w-[105px]">
                              <span className="text-sm font-medium tabular-nums">
                                {formatInteger(broadcast.recipient_count)}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.sent ? (
                            <TableBodyCell className="w-[105px]">
                              <span className="text-sm font-medium tabular-nums text-emerald-700">
                                {formatInteger(broadcast.sent_count)}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.failed ? (
                            <TableBodyCell className="w-[105px]">
                              <span className="text-sm font-medium tabular-nums text-red-700">
                                {formatInteger(broadcast.failed_count)}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.scheduledAt ? (
                            <TableBodyCell className="w-[145px]">
                              <span className="block truncate text-sm tabular-nums text-muted-foreground">
                                {formatDateTime(broadcast.scheduled_at)}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.createdAt ? (
                            <TableBodyCell className="w-[145px]">
                              <span className="block truncate text-sm tabular-nums text-muted-foreground">
                                {formatDateTime(broadcast.created_at)}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.actions ? (
                            <TableBodyCell className="w-[72px] text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-48">
                                  <DropdownMenuItem onClick={() => void copyValue(broadcast.message)}>
                                    <Copy className="h-4 w-4" />
                                    {t.copyMessage}
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() =>
                                      void copyValue(
                                        `${broadcast.title}\n${broadcast.message}`,
                                      )
                                    }
                                  >
                                    <Clipboard className="h-4 w-4" />
                                    {t.copyRecipients}
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
                              <Megaphone className="h-6 w-6 text-muted-foreground" />
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
                              <Button variant="outline" className="h-9 rounded-lg" onClick={resetFilters}>
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
                  {formatInteger(filteredBroadcasts.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(broadcasts.length)}
                </span>{" "}
                {t.rows}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-6 py-5">
            <CardTitle>{t.createBroadcast}</CardTitle>
            <CardDescription>{t.formDesc}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-6 pb-6">
            <div className="space-y-2">
              <FieldLabel>{t.broadcastTitle}</FieldLabel>
              <Input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                className="h-10 rounded-lg bg-background"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <FieldLabel>{t.targetType}</FieldLabel>
              <Select
                value={form.target_type}
                disabled={saving}
                onValueChange={(value) => updateForm("target_type", value as BroadcastForm["target_type"])}
              >
                <SelectTrigger className="h-10 rounded-lg bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t.manual}</SelectItem>
                  <SelectItem value="customers">{t.customers}</SelectItem>
                  <SelectItem value="providers">{t.providers}</SelectItem>
                  <SelectItem value="agents">{t.agents}</SelectItem>
                  <SelectItem value="all">{t.all}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.target_type === "manual" ? (
              <div className="space-y-2">
                <FieldLabel>{t.manualRecipients}</FieldLabel>
                <textarea
                  value={form.recipients}
                  onChange={(event) => updateForm("recipients", event.target.value)}
                  disabled={saving}
                  className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  dir="ltr"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <FieldLabel>{t.messageBody}</FieldLabel>
              <textarea
                value={form.message}
                onChange={(event) => updateForm("message", event.target.value)}
                disabled={saving}
                className="min-h-[150px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm">
              <Checkbox
                checked={form.send_now}
                disabled={saving}
                onCheckedChange={(checked) => updateForm("send_now", Boolean(checked))}
              />
              {t.sendNow}
            </label>

            {!form.send_now ? (
              <div className="space-y-2">
                <FieldLabel>{t.scheduleTime}</FieldLabel>
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(event) => updateForm("scheduled_at", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <FieldLabel>{t.notes}</FieldLabel>
              <Input
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                className="h-10 rounded-lg bg-background"
                disabled={saving}
              />
            </div>

            <div className="grid gap-2 pt-1">
              <Button
                className="h-10 rounded-lg bg-black text-white hover:bg-black/90"
                disabled={saving}
                onClick={() => void saveBroadcast()}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {saving ? t.saving : t.saveBroadcast}
              </Button>

              <Button
                variant="outline"
                className="h-10 rounded-lg bg-background"
                disabled={saving}
                onClick={clearForm}
              >
                <RotateCcw className="h-4 w-4" />
                {t.clearForm}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}