"use client";

/* ============================================================
   📂 primey_frontend/app/system/whatsapp/page.tsx
   🟢 Primey Care — WhatsApp Overview
   ------------------------------------------------------------
   ✅ Same approved Customers / Orders / Users operational pattern
   ✅ Real API only:
      - GET  /api/whatsapp/status/
      - GET  /api/whatsapp/settings/
      - GET  /api/whatsapp/inbox/summary/
      - GET  /api/whatsapp/logs/
      - GET  /api/whatsapp/templates/
      - GET  /api/whatsapp/broadcasts/
      - POST /api/whatsapp/session/create-qr/
      - POST /api/whatsapp/session/create-pairing-code/
      - POST /api/whatsapp/session/disconnect/
      - POST /api/whatsapp/send-test/
   ✅ Internal navigation cards for removed sidebar children
   ✅ Header buttons / KPI cards / status panels / recent logs table
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error state
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
  FileSpreadsheet,
  Inbox,
  Layers3,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Printer,
  QrCode,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
  TriangleAlert,
  Unplug,
  Wifi,
  WifiOff,
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

type StatusFilter = "all" | "SENT" | "FAILED" | "PENDING" | "DELIVERED" | "READ";
type SortKey = "newest" | "oldest" | "recipient" | "status" | "event";
type ColumnKey =
  | "select"
  | "recipient"
  | "event"
  | "status"
  | "message"
  | "createdAt"
  | "provider"
  | "actions";

type WhatsAppStatus = {
  configured: boolean;
  is_enabled: boolean;
  is_active: boolean;
  connected: boolean;
  provider: string;
  session_name: string;
  session_mode: string;
  session_status: string;
  connected_phone: string;
  device_label: string;
  qr_code: string;
  pairing_code: string;
  last_connected_at: string | null;
  last_check_at: string | null;
  last_error_message: string;
  gateway_message: string;
};

type WhatsAppConfig = {
  id: number | null;
  provider: string;
  is_enabled: boolean;
  is_active: boolean;
  business_name: string;
  phone_number: string;
  default_language_code: string;
  default_country_code: string;
  allow_broadcasts: boolean;
  send_test_enabled: boolean;
  default_test_recipient: string;
  session_name: string;
  session_mode: string;
  session_status: string;
  session_connected_phone: string;
  session_device_label: string;
  last_error_message: string;
};

type InboxSummary = {
  total_conversations: number;
  open_conversations: number;
  unread_conversations: number;
  resolved_conversations: number;
  pinned_conversations: number;
  muted_conversations: number;
  latest_message_at: string | null;
};

type WhatsAppLogRecord = {
  id: number;
  status: string;
  delivery_status: string;
  provider_status: string;
  direction: string;
  message_type: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_role: string;
  template_name: string;
  event_code: string;
  trigger_source: string;
  message_body: string;
  payload_summary: string;
  failure_reason: string;
  error_message: string;
  external_message_id: string;
  provider_message_id: string;
  created_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  results?: unknown[];
  count?: number;
  config?: unknown;
  summary?: unknown;
};

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  recipient: true,
  event: true,
  status: true,
  message: true,
  createdAt: true,
  provider: true,
  actions: true,
};

const translations = {
  ar: {
    title: "واتساب",
    subtitle: "إدارة اتصال واتساب، صندوق الوارد، القوالب، البث، السجلات، وحالة الجلسة.",
    refresh: "تحديث",
    settings: "الإعدادات",
    inbox: "صندوق الوارد",
    logs: "السجلات",
    templates: "القوالب",
    broadcasts: "البث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    connected: "متصل",
    disconnected: "غير متصل",
    connecting: "جاري الاتصال",
    failed: "فشل الاتصال",
    inactive: "غير مفعل",
    enabled: "مفعل",
    disabled: "معطل",
    status: "الحالة",
    session: "الجلسة",
    sessionStatus: "حالة الجلسة",
    connectedPhone: "الرقم المتصل",
    device: "الجهاز",
    lastConnected: "آخر اتصال",
    lastCheck: "آخر فحص",
    provider: "المزود",
    businessName: "اسم النشاط",
    defaultLanguage: "اللغة الافتراضية",
    defaultCountry: "مفتاح الدولة",
    allowBroadcasts: "السماح بالبث",
    sendTestEnabled: "إرسال تجريبي",
    qrSession: "إنشاء QR",
    pairingSession: "رمز ربط",
    disconnect: "فصل الجلسة",
    phoneForPairing: "رقم الربط",
    testMessage: "رسالة اختبار",
    testPhone: "رقم الاختبار",
    testName: "اسم المستلم",
    testBody: "نص الرسالة",
    sendTest: "إرسال اختبار",
    totalInbox: "المحادثات",
    unreadInbox: "غير مقروءة",
    totalLogs: "سجلات الرسائل",
    totalTemplates: "القوالب",
    totalBroadcasts: "رسائل البث",
    latestActivity: "آخر السجلات",
    navigation: "إدارة واتساب",
    navigationDesc: "انتقل للصفحات الداخلية لإدارة كل جزء من مركز واتساب.",
    sessionPanel: "حالة الاتصال",
    sessionPanelDesc: "متابعة حالة الجلسة الحالية وربط الجهاز.",
    testPanel: "إرسال رسالة اختبار",
    testPanelDesc: "استخدمها للتحقق من عمل الاتصال والإرسال.",
    qrCode: "رمز QR",
    pairingCode: "رمز الربط",
    noQr: "لا يوجد QR حاليًا.",
    noPairing: "لا يوجد رمز ربط حاليًا.",
    recipient: "المستلم",
    event: "الحدث",
    message: "الرسالة",
    createdAt: "تاريخ الإنشاء",
    actions: "الإجراءات",
    columns: "الأعمدة",
    sort: "الترتيب",
    selected: "محدد",
    allStatuses: "كل الحالات",
    sent: "مرسلة",
    pending: "معلقة",
    delivered: "تم التسليم",
    read: "مقروءة",
    failedStatus: "فاشلة",
    newest: "الأحدث",
    oldest: "الأقدم",
    recipientSort: "المستلم",
    statusSort: "الحالة",
    eventSort: "الحدث",
    searchPlaceholder: "ابحث في السجلات بالرقم أو المستلم أو الحدث أو الرسالة...",
    activeFilters: "فلاتر مفعلة",
    clearSelection: "إلغاء التحديد",
    noDataTitle: "لا توجد سجلات",
    noDataDesc: "ستظهر سجلات واتساب هنا عند وجود رسائل.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض سجلات أخرى.",
    errorTitle: "تعذر تحميل بيانات واتساب",
    errorDesc: "تأكد من تشغيل الباكند وخدمة واتساب ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    actionSuccess: "تم تنفيذ العملية بنجاح.",
    actionFailed: "تعذر تنفيذ العملية.",
    testSent: "تمت معالجة رسالة الاختبار.",
    requiredPhone: "رقم الجوال مطلوب.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير واتساب",
    generatedAt: "تاريخ الطباعة",
    showing: "عرض",
    rows: "صفوف",
    of: "من",
    unknown: "غير محدد",
    open: "فتح",
    copied: "تم النسخ",
    copyMessage: "نسخ الرسالة",
    noMessage: "لا توجد رسالة.",
  },
  en: {
    title: "WhatsApp",
    subtitle: "Manage WhatsApp connection, inbox, templates, broadcasts, logs, and session status.",
    refresh: "Refresh",
    settings: "Settings",
    inbox: "Inbox",
    logs: "Logs",
    templates: "Templates",
    broadcasts: "Broadcasts",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    connected: "Connected",
    disconnected: "Disconnected",
    connecting: "Connecting",
    failed: "Connection failed",
    inactive: "Inactive",
    enabled: "Enabled",
    disabled: "Disabled",
    status: "Status",
    session: "Session",
    sessionStatus: "Session status",
    connectedPhone: "Connected phone",
    device: "Device",
    lastConnected: "Last connected",
    lastCheck: "Last check",
    provider: "Provider",
    businessName: "Business name",
    defaultLanguage: "Default language",
    defaultCountry: "Country code",
    allowBroadcasts: "Allow broadcasts",
    sendTestEnabled: "Test sending",
    qrSession: "Create QR",
    pairingSession: "Pairing code",
    disconnect: "Disconnect",
    phoneForPairing: "Pairing phone",
    testMessage: "Test message",
    testPhone: "Test phone",
    testName: "Recipient name",
    testBody: "Message body",
    sendTest: "Send test",
    totalInbox: "Conversations",
    unreadInbox: "Unread",
    totalLogs: "Message logs",
    totalTemplates: "Templates",
    totalBroadcasts: "Broadcast messages",
    latestActivity: "Latest logs",
    navigation: "WhatsApp management",
    navigationDesc: "Open internal pages to manage each part of WhatsApp center.",
    sessionPanel: "Connection status",
    sessionPanelDesc: "Monitor current session and pair the device.",
    testPanel: "Send test message",
    testPanelDesc: "Use it to verify connection and sending.",
    qrCode: "QR code",
    pairingCode: "Pairing code",
    noQr: "No QR available now.",
    noPairing: "No pairing code available now.",
    recipient: "Recipient",
    event: "Event",
    message: "Message",
    createdAt: "Created at",
    actions: "Actions",
    columns: "Columns",
    sort: "Sort",
    selected: "Selected",
    allStatuses: "All statuses",
    sent: "Sent",
    pending: "Pending",
    delivered: "Delivered",
    read: "Read",
    failedStatus: "Failed",
    newest: "Newest",
    oldest: "Oldest",
    recipientSort: "Recipient",
    statusSort: "Status",
    eventSort: "Event",
    searchPlaceholder: "Search logs by phone, recipient, event, or message...",
    activeFilters: "Active filters",
    clearSelection: "Clear selection",
    noDataTitle: "No logs",
    noDataDesc: "WhatsApp logs will appear here once messages exist.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other logs.",
    errorTitle: "Unable to load WhatsApp data",
    errorDesc: "Make sure the backend and WhatsApp service are running, then try again.",
    tryAgain: "Try again",
    actionSuccess: "Action completed successfully.",
    actionFailed: "Unable to complete action.",
    testSent: "Test message processed.",
    requiredPhone: "Phone number is required.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "WhatsApp report",
    generatedAt: "Generated at",
    showing: "Showing",
    rows: "Rows",
    of: "of",
    unknown: "Unknown",
    open: "Open",
    copied: "Copied",
    copyMessage: "Copy message",
    noMessage: "No message.",
  },
} as const;

const NAVIGATION_ITEMS = [
  {
    key: "inbox",
    href: "/system/whatsapp/inbox",
    icon: Inbox,
  },
  {
    key: "templates",
    href: "/system/whatsapp/templates",
    icon: Layers3,
  },
  {
    key: "broadcasts",
    href: "/system/whatsapp/broadcasts",
    icon: Radio,
  },
  {
    key: "logs",
    href: "/system/whatsapp/logs",
    icon: TerminalSquare,
  },
  {
    key: "settings",
    href: "/system/whatsapp/settings",
    icon: Settings,
  },
] as const;

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

    if (["1", "true", "yes", "on", "enabled", "active", "connected"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off", "disabled", "inactive", "disconnected"].includes(normalized)) {
      return false;
    }
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

function extractArray(payload: ApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;

  const data = asRecord(payload.data);
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;

  return [];
}

function normalizeStatus(value: unknown): WhatsAppStatus {
  const item = asRecord(value);

  return {
    configured: toBoolean(item.configured, true),
    is_enabled: toBoolean(item.is_enabled),
    is_active: toBoolean(item.is_active),
    connected: toBoolean(item.connected),
    provider: normalizeText(item.provider || "whatsapp_web_session"),
    session_name: normalizeText(item.session_name),
    session_mode: normalizeText(item.session_mode || "qr"),
    session_status: normalizeText(item.session_status || "disconnected"),
    connected_phone: normalizeText(item.connected_phone || item.phone_number),
    device_label: normalizeText(item.device_label || item.device_name),
    qr_code: normalizeText(item.qr_code),
    pairing_code: normalizeText(item.pairing_code),
    last_connected_at: normalizeText(item.last_connected_at) || null,
    last_check_at: normalizeText(item.last_check_at) || null,
    last_error_message: normalizeText(item.last_error_message),
    gateway_message: normalizeText(item.gateway_message || item.message),
  };
}

function normalizeConfig(value: unknown): WhatsAppConfig {
  const item = asRecord(value);

  return {
    id: item.id === null || item.id === undefined ? null : toNumber(item.id),
    provider: normalizeText(item.provider || "whatsapp_web_session"),
    is_enabled: toBoolean(item.is_enabled),
    is_active: toBoolean(item.is_active),
    business_name: normalizeText(item.business_name || item.app_name || "Primey Care"),
    phone_number: normalizeText(item.phone_number),
    default_language_code: normalizeText(item.default_language_code || "ar"),
    default_country_code: normalizeText(item.default_country_code || "966"),
    allow_broadcasts: toBoolean(item.allow_broadcasts, true),
    send_test_enabled: toBoolean(item.send_test_enabled, true),
    default_test_recipient: normalizeText(item.default_test_recipient),
    session_name: normalizeText(item.session_name || "primey-care-system-session"),
    session_mode: normalizeText(item.session_mode || "qr"),
    session_status: normalizeText(item.session_status || "disconnected"),
    session_connected_phone: normalizeText(item.session_connected_phone),
    session_device_label: normalizeText(item.session_device_label),
    last_error_message: normalizeText(item.last_error_message),
  };
}

function normalizeInboxSummary(value: unknown): InboxSummary {
  const item = asRecord(value);

  return {
    total_conversations: toNumber(
      item.total_conversations ?? item.total ?? item.count,
    ),
    open_conversations: toNumber(item.open_conversations ?? item.open),
    unread_conversations: toNumber(
      item.unread_conversations ?? item.unread ?? item.unread_count,
    ),
    resolved_conversations: toNumber(item.resolved_conversations ?? item.resolved),
    pinned_conversations: toNumber(item.pinned_conversations ?? item.pinned),
    muted_conversations: toNumber(item.muted_conversations ?? item.muted),
    latest_message_at: normalizeText(item.latest_message_at || item.last_message_at) || null,
  };
}

function normalizeLog(value: unknown): WhatsAppLogRecord {
  const item = asRecord(value);

  return {
    id: toNumber(item.id),
    status: normalizeText(item.status || item.delivery_status || "PENDING").toUpperCase(),
    delivery_status: normalizeText(item.delivery_status || item.status || "PENDING").toUpperCase(),
    provider_status: normalizeText(item.provider_status),
    direction: normalizeText(item.direction || "OUTBOUND"),
    message_type: normalizeText(item.message_type),
    recipient_name: normalizeText(item.recipient_name),
    recipient_phone: normalizeText(item.recipient_phone),
    recipient_role: normalizeText(item.recipient_role),
    template_name: normalizeText(item.template_name),
    event_code: normalizeText(item.event_code),
    trigger_source: normalizeText(item.trigger_source),
    message_body: normalizeText(item.message_body || item.payload_summary),
    payload_summary: normalizeText(item.payload_summary || item.message_body),
    failure_reason: normalizeText(item.failure_reason),
    error_message: normalizeText(item.error_message || item.failure_reason),
    external_message_id: normalizeText(item.external_message_id),
    provider_message_id: normalizeText(item.provider_message_id || item.external_message_id),
    created_at: normalizeText(item.created_at) || null,
    sent_at: normalizeText(item.sent_at) || null,
    delivered_at: normalizeText(item.delivered_at) || null,
    read_at: normalizeText(item.read_at) || null,
  };
}

function extractConfig(payload: ApiResponse) {
  if (payload.config) return payload.config;

  const data = asRecord(payload.data);
  if (data.config) return data.config;

  return data;
}

function extractSummary(payload: ApiResponse) {
  if (payload.summary) return payload.summary;

  const data = asRecord(payload.data);
  if (data.summary) return data.summary;

  return data;
}

function getConnectionLabel(status: WhatsAppStatus, locale: Locale) {
  const t = translations[locale];
  const sessionStatus = status.session_status.toLowerCase();

  if (status.connected || sessionStatus === "connected") return t.connected;
  if (sessionStatus.includes("qr") || sessionStatus.includes("pair") || sessionStatus.includes("connect")) return t.connecting;
  if (sessionStatus.includes("fail") || sessionStatus.includes("error")) return t.failed;
  if (!status.is_active) return t.inactive;

  return t.disconnected;
}

function getConnectionBadgeClass(status: WhatsAppStatus) {
  const sessionStatus = status.session_status.toLowerCase();

  if (status.connected || sessionStatus === "connected") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (sessionStatus.includes("qr") || sessionStatus.includes("pair") || sessionStatus.includes("connect")) {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  if (sessionStatus.includes("fail") || sessionStatus.includes("error")) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function getDeliveryLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const status = normalizeText(value).toUpperCase();

  if (status === "SENT") return t.sent;
  if (status === "DELIVERED") return t.delivered;
  if (status === "READ") return t.read;
  if (status === "FAILED") return t.failedStatus;

  return t.pending;
}

function getDeliveryBadgeClass(value: string) {
  const status = normalizeText(value).toUpperCase();

  if (status === "SENT" || status === "DELIVERED" || status === "READ") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "FAILED") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
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

function StatusBadge({
  status,
  locale,
}: {
  status: WhatsAppStatus;
  locale: Locale;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        getConnectionBadgeClass(status),
      )}
    >
      {getConnectionLabel(status, locale)}
    </Badge>
  );
}

function DeliveryBadge({
  value,
  locale,
}: {
  value: string;
  locale: Locale;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        getDeliveryBadgeClass(value),
      )}
    >
      {getDeliveryLabel(value, locale)}
    </Badge>
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-left text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
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
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SystemWhatsAppPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");

  const [status, setStatus] = React.useState<WhatsAppStatus>(() =>
    normalizeStatus({}),
  );
  const [config, setConfig] = React.useState<WhatsAppConfig>(() =>
    normalizeConfig({}),
  );
  const [summary, setSummary] = React.useState<InboxSummary>(() =>
    normalizeInboxSummary({}),
  );
  const [logs, setLogs] = React.useState<WhatsAppLogRecord[]>([]);
  const [templatesCount, setTemplatesCount] = React.useState(0);
  const [broadcastsCount, setBroadcastsCount] = React.useState(0);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState("");
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [visibleColumns, setVisibleColumns] =
    React.useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);

  const [pairingPhone, setPairingPhone] = React.useState("");
  const [testPhone, setTestPhone] = React.useState("");
  const [testName, setTestName] = React.useState("");
  const [testMessage, setTestMessage] = React.useState("");

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

  const loadDashboard = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const logsParams = new URLSearchParams({ limit: "100" });

        const [
          statusResponse,
          settingsResponse,
          inboxResponse,
          logsResponse,
          templatesResponse,
          broadcastsResponse,
        ] = await Promise.allSettled([
          fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/status/"), {
            signal: controller.signal,
          }),
          fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/settings/"), {
            signal: controller.signal,
          }),
          fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/inbox/summary/"), {
            signal: controller.signal,
          }),
          fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/logs/", logsParams), {
            signal: controller.signal,
          }),
          fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/templates/"), {
            signal: controller.signal,
          }),
          fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/broadcasts/"), {
            signal: controller.signal,
          }),
        ]);

        if (statusResponse.status === "fulfilled") {
          setStatus(normalizeStatus(statusResponse.value));
        } else {
          throw statusResponse.reason;
        }

        if (settingsResponse.status === "fulfilled") {
          const nextConfig = normalizeConfig(extractConfig(settingsResponse.value));
          setConfig(nextConfig);
          setTestPhone((current) => current || nextConfig.default_test_recipient);
        }

        if (inboxResponse.status === "fulfilled") {
          setSummary(normalizeInboxSummary(extractSummary(inboxResponse.value)));
        }

        if (logsResponse.status === "fulfilled") {
          setLogs(extractArray(logsResponse.value).map(normalizeLog));
        }

        if (templatesResponse.status === "fulfilled") {
          setTemplatesCount(
            toNumber(templatesResponse.value.count, extractArray(templatesResponse.value).length),
          );
        }

        if (broadcastsResponse.status === "fulfilled") {
          setBroadcastsCount(
            toNumber(broadcastsResponse.value.count, extractArray(broadcastsResponse.value).length),
          );
        }

        setSelectedIds([]);
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
    [t.errorDesc],
  );

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const filteredLogs = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let items = logs.filter((log) => {
      const matchesSearch =
        !query ||
        log.recipient_name.toLowerCase().includes(query) ||
        log.recipient_phone.toLowerCase().includes(query) ||
        log.event_code.toLowerCase().includes(query) ||
        log.message_body.toLowerCase().includes(query) ||
        log.failure_reason.toLowerCase().includes(query) ||
        log.external_message_id.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        log.delivery_status.toUpperCase() === statusFilter ||
        log.status.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });

    items = [...items].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.created_at || "").localeCompare(String(b.created_at || ""));
      }

      if (sortKey === "recipient") {
        return (a.recipient_name || a.recipient_phone).localeCompare(
          b.recipient_name || b.recipient_phone,
        );
      }

      if (sortKey === "status") {
        return a.delivery_status.localeCompare(b.delivery_status);
      }

      if (sortKey === "event") {
        return a.event_code.localeCompare(b.event_code);
      }

      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

    return items;
  }, [logs, searchInput, sortKey, statusFilter]);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    statusFilter !== "all" ||
    sortKey !== "newest";

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const allPageSelected =
    filteredLogs.length > 0 && filteredLogs.every((item) => selectedIds.includes(item.id));

  function resetFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setSortKey("newest");
    setSelectedIds([]);
  }

  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredLogs.map((item) => item.id));
  }

  function toggleSelectItem(id: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((item) => item !== id);
    });
  }

  async function runSessionAction(action: "qr" | "pairing" | "disconnect") {
    setActionLoading(action);

    try {
      if (action === "pairing" && !normalizePhone(pairingPhone)) {
        toast.error(t.requiredPhone);
        return;
      }

      const endpoint =
        action === "qr"
          ? "/api/whatsapp/session/create-qr/"
          : action === "pairing"
            ? "/api/whatsapp/session/create-pairing-code/"
            : "/api/whatsapp/session/disconnect/";

      const body =
        action === "pairing"
          ? {
              phone_number: normalizePhone(pairingPhone),
              session_name: config.session_name || status.session_name,
              session_mode: "pairing_code",
            }
          : {
              session_name: config.session_name || status.session_name,
              session_mode: action === "qr" ? "qr" : config.session_mode || status.session_mode,
            };

      const response = await fetchJson<ApiResponse>(makeApiUrl(endpoint), {
        method: "POST",
        body,
      });

      const nextStatus = normalizeStatus({
        ...status,
        ...response,
      });

      setStatus(nextStatus);
      toast.success(t.actionSuccess);
      await loadDashboard({ silent: true });
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

  async function sendTestMessage() {
    const phone = normalizePhone(testPhone);

    if (!phone) {
      toast.error(t.requiredPhone);
      return;
    }

    setActionLoading("test");

    try {
      await fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/send-test/"), {
        method: "POST",
        body: {
          phone_number: phone,
          recipient_phone: phone,
          recipient_name: testName.trim() || "User",
          message: testMessage.trim() || "Primey Care WhatsApp test message.",
        },
      });

      toast.success(t.testSent);
      await loadDashboard({ silent: true });
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

  function buildExportRows() {
    return filteredLogs.map((log) => ({
      recipient: log.recipient_name || log.recipient_phone || "—",
      phone: log.recipient_phone || "—",
      event: log.event_code || log.trigger_source || "—",
      status: getDeliveryLabel(log.delivery_status || log.status, locale),
      message: log.message_body || log.payload_summary || log.failure_reason || "—",
      provider: log.provider_status || log.external_message_id || "—",
      createdAt: formatDateTime(log.created_at),
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
                <th>${escapeHtml(t.recipient)}</th>
                <th>${escapeHtml(t.event)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.message)}</th>
                <th>${escapeHtml(t.provider)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.recipient)}<br />${escapeHtml(row.phone)}</td>
                      <td>${escapeHtml(row.event)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.message)}</td>
                      <td>${escapeHtml(row.provider)}</td>
                      <td>${escapeHtml(row.createdAt)}</td>
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
    link.download = `primey-care-whatsapp-${new Date().toISOString().slice(0, 10)}.xls`;
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
              <p>${escapeHtml(t.status)}: ${escapeHtml(getConnectionLabel(status, locale))}</p>
              <p>${escapeHtml(t.connectedPhone)}: ${escapeHtml(status.connected_phone || config.session_connected_phone || "—")}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalInbox)}</span><strong>${escapeHtml(summary.total_conversations)}</strong></div>
            <div class="box"><span>${escapeHtml(t.unreadInbox)}</span><strong>${escapeHtml(summary.unread_conversations)}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalLogs)}</span><strong>${escapeHtml(logs.length)}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalTemplates)}</span><strong>${escapeHtml(templatesCount)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.recipient)}</th>
                <th>${escapeHtml(t.event)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.message)}</th>
                <th>${escapeHtml(t.provider)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.recipient)}<br />${escapeHtml(row.phone)}</td>
                      <td>${escapeHtml(row.event)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.message)}</td>
                      <td>${escapeHtml(row.provider)}</td>
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
        <DashboardSkeleton />
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
            onClick={() => void loadDashboard({ silent: true })}
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
            <Link href="/system/whatsapp/settings">
              <Settings className="h-4 w-4" />
              {t.settings}
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/whatsapp/inbox">
              <Inbox className="h-4 w-4" />
              {t.inbox}
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/whatsapp/logs">
              <TerminalSquare className="h-4 w-4" />
              {t.logs}
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
          title={t.status}
          value={getConnectionLabel(status, locale)}
          trend={status.connected_phone || config.session_connected_phone || status.session_status || "—"}
          icon={status.connected ? Wifi : WifiOff}
        />

        <KpiCard
          title={t.totalInbox}
          value={formatInteger(summary.total_conversations)}
          trend={`${t.unreadInbox}: ${formatInteger(summary.unread_conversations)}`}
          icon={Inbox}
        />

        <KpiCard
          title={t.totalLogs}
          value={formatInteger(logs.length)}
          trend={`${t.showing} ${formatInteger(filteredLogs.length)}`}
          icon={TerminalSquare}
        />

        <KpiCard
          title={t.totalTemplates}
          value={formatInteger(templatesCount)}
          trend={`${t.totalBroadcasts}: ${formatInteger(broadcastsCount)}`}
          icon={Layers3}
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
              onClick={() => void loadDashboard()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>{t.sessionPanel}</CardTitle>
                  <CardDescription>{t.sessionPanelDesc}</CardDescription>
                </div>

                <StatusBadge status={status} locale={locale} />
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoRow label={t.sessionStatus} value={status.session_status || config.session_status || "—"} />
                <InfoRow label={t.connectedPhone} value={status.connected_phone || config.session_connected_phone || "—"} />
                <InfoRow label={t.device} value={status.device_label || config.session_device_label || "—"} />
                <InfoRow label={t.session} value={status.session_name || config.session_name || "—"} />
                <InfoRow label={t.provider} value={status.provider || config.provider || "—"} />
                <InfoRow label={t.lastConnected} value={formatDateTime(status.last_connected_at)} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">{t.qrCode}</p>
                    </div>

                    <Button
                      variant="outline"
                      className="h-8 rounded-lg"
                      disabled={Boolean(actionLoading)}
                      onClick={() => void runSessionAction("qr")}
                    >
                      {actionLoading === "qr" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4" />
                      )}
                      {t.qrSession}
                    </Button>
                  </div>

                  {status.qr_code ? (
                    <div className="overflow-hidden rounded-lg border bg-white p-3">
                      <img
                        src={status.qr_code}
                        alt={t.qrCode}
                        className="mx-auto h-48 w-48 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-[218px] items-center justify-center rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                      {t.noQr}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">{t.pairingCode}</p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <Input
                      value={pairingPhone}
                      onChange={(event) => setPairingPhone(normalizePhone(event.target.value))}
                      placeholder={t.phoneForPairing}
                      className="h-10 rounded-lg bg-background text-right tabular-nums"
                      dir="ltr"
                    />

                    <Button
                      variant="outline"
                      className="h-10 rounded-lg"
                      disabled={Boolean(actionLoading)}
                      onClick={() => void runSessionAction("pairing")}
                    >
                      {actionLoading === "pairing" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Smartphone className="h-4 w-4" />
                      )}
                      {t.pairingSession}
                    </Button>

                    <div className="flex min-h-[112px] items-center justify-center rounded-lg border bg-muted/30 p-4 text-center">
                      {status.pairing_code ? (
                        <button
                          type="button"
                          onClick={() => void copyValue(status.pairing_code)}
                          className="font-display text-3xl font-bold tracking-[0.25em] text-foreground"
                          dir="ltr"
                        >
                          {status.pairing_code}
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t.noPairing}</span>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      className="h-10 rounded-lg text-red-600 hover:text-red-600"
                      disabled={Boolean(actionLoading)}
                      onClick={() => void runSessionAction("disconnect")}
                    >
                      {actionLoading === "disconnect" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unplug className="h-4 w-4" />
                      )}
                      {t.disconnect}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.latestActivity}</CardTitle>
              <CardDescription>{t.subtitle}</CardDescription>
            </CardHeader>

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
                      value={statusFilter}
                      onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                    >
                      <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[150px]">
                        <CheckCircle2 className="h-4 w-4" />
                        <SelectValue placeholder={t.status} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allStatuses}</SelectItem>
                        <SelectItem value="SENT">{t.sent}</SelectItem>
                        <SelectItem value="PENDING">{t.pending}</SelectItem>
                        <SelectItem value="DELIVERED">{t.delivered}</SelectItem>
                        <SelectItem value="READ">{t.read}</SelectItem>
                        <SelectItem value="FAILED">{t.failedStatus}</SelectItem>
                      </SelectContent>
                    </Select>
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
                            ["recipient", t.recipient],
                            ["event", t.event],
                            ["status", t.status],
                            ["message", t.message],
                            ["createdAt", t.createdAt],
                            ["provider", t.provider],
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
                            ["recipient", t.recipientSort],
                            ["status", t.statusSort],
                            ["event", t.eventSort],
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
                      <Button
                        variant="outline"
                        className="h-9 rounded-lg bg-background"
                        onClick={() => setSelectedIds([])}
                      >
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
                  <Table className="min-w-[1040px] table-fixed">
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

                        {visibleColumns.recipient ? (
                          <TableHeaderCell className="w-[210px]">
                            <HeaderSortButton
                              active={sortKey === "recipient"}
                              onClick={() => setSortKey("recipient")}
                            >
                              {t.recipient}
                            </HeaderSortButton>
                          </TableHeaderCell>
                        ) : null}

                        {visibleColumns.event ? (
                          <TableHeaderCell className="w-[170px]">
                            <HeaderSortButton
                              active={sortKey === "event"}
                              onClick={() => setSortKey("event")}
                            >
                              {t.event}
                            </HeaderSortButton>
                          </TableHeaderCell>
                        ) : null}

                        {visibleColumns.status ? (
                          <TableHeaderCell className="w-[120px]">
                            <HeaderSortButton
                              active={sortKey === "status"}
                              onClick={() => setSortKey("status")}
                            >
                              {t.status}
                            </HeaderSortButton>
                          </TableHeaderCell>
                        ) : null}

                        {visibleColumns.message ? (
                          <TableHeaderCell className="w-[300px]">{t.message}</TableHeaderCell>
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

                        {visibleColumns.provider ? (
                          <TableHeaderCell className="w-[150px]">{t.provider}</TableHeaderCell>
                        ) : null}

                        {visibleColumns.actions ? (
                          <TableHeaderCell className="w-[72px] text-center">
                            {t.actions}
                          </TableHeaderCell>
                        ) : null}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredLogs.length ? (
                        filteredLogs.map((log) => (
                          <TableRow key={log.id} className="h-[62px]">
                            {visibleColumns.select ? (
                              <TableBodyCell className="w-[46px] px-3">
                                <Checkbox
                                  checked={selectedIds.includes(log.id)}
                                  onCheckedChange={(checked) =>
                                    toggleSelectItem(log.id, Boolean(checked))
                                  }
                                  aria-label={`${log.recipient_name || log.recipient_phone}`}
                                />
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.recipient ? (
                              <TableBodyCell className="w-[210px]">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-emerald-50">
                                    <MessageCircle className="h-4 w-4 text-emerald-700" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                      {log.recipient_name || log.recipient_phone || t.unknown}
                                    </p>
                                    <p className="truncate text-xs tabular-nums text-muted-foreground" dir="ltr">
                                      {log.recipient_phone || "—"}
                                    </p>
                                  </div>
                                </div>
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.event ? (
                              <TableBodyCell className="w-[170px]">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {log.event_code || "—"}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {log.trigger_source || log.message_type || "—"}
                                  </p>
                                </div>
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.status ? (
                              <TableBodyCell className="w-[120px]">
                                <DeliveryBadge value={log.delivery_status || log.status} locale={locale} />
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.message ? (
                              <TableBodyCell className="w-[300px]">
                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                  {log.message_body || log.payload_summary || log.failure_reason || t.noMessage}
                                </p>
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.createdAt ? (
                              <TableBodyCell className="w-[145px]">
                                <span className="block truncate text-sm tabular-nums text-muted-foreground">
                                  {formatDateTime(log.created_at)}
                                </span>
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.provider ? (
                              <TableBodyCell className="w-[150px]">
                                <span className="block truncate text-sm text-muted-foreground">
                                  {log.provider_status || log.provider_message_id || "—"}
                                </span>
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
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent
                                    align={locale === "ar" ? "start" : "end"}
                                    className="w-44"
                                  >
                                    <DropdownMenuItem
                                      onClick={() =>
                                        void copyValue(
                                          log.message_body ||
                                            log.payload_summary ||
                                            log.failure_reason ||
                                            "",
                                        )
                                      }
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                      {t.copyMessage}
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
                                <MessageCircle className="h-6 w-6 text-muted-foreground" />
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
                    {formatInteger(filteredLogs.length)}
                  </span>{" "}
                  {t.of}{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatInteger(logs.length)}
                  </span>{" "}
                  {t.rows}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.navigation}</CardTitle>
              <CardDescription>{t.navigationDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 px-6 pb-6">
              {NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                const label = t[item.key];

                return (
                  <Button
                    key={item.key}
                    asChild
                    variant="outline"
                    className="h-11 justify-start rounded-lg bg-background"
                  >
                    <Link href={item.href}>
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.testPanel}</CardTitle>
              <CardDescription>{t.testPanelDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.testPhone}</label>
                <Input
                  value={testPhone}
                  onChange={(event) => setTestPhone(normalizePhone(event.target.value))}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.testName}</label>
                <Input
                  value={testName}
                  onChange={(event) => setTestName(event.target.value)}
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t.testBody}</label>
                <textarea
                  value={testMessage}
                  onChange={(event) => setTestMessage(event.target.value)}
                  className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <Button
                className="h-10 w-full rounded-lg bg-black text-white hover:bg-black/90"
                disabled={Boolean(actionLoading) || !config.send_test_enabled}
                onClick={() => void sendTestMessage()}
              >
                {actionLoading === "test" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {t.sendTest}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.settings}</CardTitle>
              <CardDescription>{config.business_name || "Primey Care"}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-2 px-6 pb-6">
              <InfoRow label={t.businessName} value={config.business_name || "—"} />
              <InfoRow label={t.status} value={config.is_enabled ? t.enabled : t.disabled} />
              <InfoRow label={t.provider} value={config.provider || "—"} />
              <InfoRow label={t.defaultLanguage} value={config.default_language_code || "—"} />
              <InfoRow label={t.defaultCountry} value={config.default_country_code || "—"} />
              <InfoRow label={t.allowBroadcasts} value={config.allow_broadcasts ? t.enabled : t.disabled} />
              <InfoRow label={t.sendTestEnabled} value={config.send_test_enabled ? t.enabled : t.disabled} />
              <InfoRow label={t.lastCheck} value={formatDateTime(status.last_check_at)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}