"use client";

/* ============================================================
   📂 primey_frontend/app/system/whatsapp/inbox/page.tsx
   💬 Primey Care — WhatsApp Inbox
   ------------------------------------------------------------
   ✅ Same approved Products / Customers / Orders operational pattern
   ✅ Real API only:
      GET  /api/whatsapp/inbox/summary/
      GET  /api/whatsapp/inbox/conversations/
      GET  /api/whatsapp/inbox/conversations/{id}/
      GET  /api/whatsapp/inbox/conversations/{id}/messages/
      POST /api/whatsapp/inbox/conversations/{id}/mark-read/
      POST /api/whatsapp/inbox/conversations/{id}/status/
      POST /api/whatsapp/inbox/conversations/{id}/toggle-resolved/
      POST /api/whatsapp/inbox/conversations/{id}/toggle-pinned/
   ✅ Header / KPI cards / filters / columns / table unified
   ✅ Conversation details + messages panel
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
  CheckCircle2,
  Clock3,
  ColumnsIcon,
  FileSpreadsheet,
  Inbox,
  Loader2,
  MailCheck,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Pin,
  PinOff,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  TriangleAlert,
  UserRound,
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

type ConversationStatus = "OPEN" | "CLOSED" | "ARCHIVED" | "SPAM";
type StatusFilter = "all" | ConversationStatus;
type ResolvedFilter = "all" | "resolved" | "unresolved";
type SortKey = "newest" | "oldest" | "name" | "unread" | "status";
type ColumnKey =
  | "select"
  | "contact"
  | "status"
  | "preview"
  | "unread"
  | "assigned"
  | "lastMessage"
  | "flags"
  | "actions";

type ContactRecord = {
  id: number | null;
  phone_number: string;
  display_name: string;
  push_name: string;
  profile_name: string;
  is_blocked: boolean;
  is_business: boolean;
  last_message_at: string | null;
  last_seen_at: string | null;
};

type AssignedUserRecord = {
  id: number | null;
  name: string;
  email: string;
  username: string;
};

type ConversationRecord = {
  id: number;
  status: ConversationStatus | string;
  subject: string;
  assigned_to_id: number | null;
  assigned_to_name: string;
  assigned_to: AssignedUserRecord;
  session_name: string;
  unread_count: number;
  last_message_preview: string;
  last_message_at: string | null;
  is_pinned: boolean;
  is_muted: boolean;
  is_resolved: boolean;
  created_at: string | null;
  updated_at: string | null;
  contact: ContactRecord;
};

type MessageRecord = {
  id: number;
  conversation_id: number;
  direction: string;
  message_type: string;
  external_message_id: string;
  provider: string;
  provider_status: string;
  delivery_status: string;
  sender_phone: string;
  sender_name: string;
  body_text: string;
  caption: string;
  attachment_url: string;
  attachment_name: string;
  mime_type: string;
  media_type: string;
  is_read: boolean;
  is_from_me: boolean;
  message_created_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  created_at: string | null;
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

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  results?: unknown[];
  count?: number;
  summary?: unknown;
  conversation?: unknown;
};

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  contact: true,
  status: true,
  preview: true,
  unread: true,
  assigned: true,
  lastMessage: true,
  flags: true,
  actions: true,
};

const translations = {
  ar: {
    title: "صندوق وارد واتساب",
    subtitle: "متابعة محادثات واتساب الواردة، الرسائل، الحالات، والتعامل مع المحادثات.",
    back: "واتساب",
    settings: "الإعدادات",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    total: "إجمالي المحادثات",
    open: "مفتوحة",
    unread: "غير مقروءة",
    resolved: "محلولة",
    inbox: "صندوق الوارد",
    conversations: "المحادثات",
    messages: "الرسائل",
    selectedConversation: "المحادثة المحددة",
    searchPlaceholder: "ابحث باسم العميل أو الجوال أو آخر رسالة...",
    allStatuses: "كل الحالات",
    status: "الحالة",
    closed: "مغلقة",
    archived: "مؤرشفة",
    spam: "مزعجة",
    allResolved: "كل حالات الحل",
    unresolved: "غير محلولة",
    onlyUnread: "غير المقروءة فقط",
    from: "من",
    to: "إلى",
    columns: "الأعمدة",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    unreadSort: "غير المقروء",
    statusSort: "الحالة",
    selected: "محدد",
    contact: "الجهة",
    preview: "آخر رسالة",
    assigned: "المسؤول",
    lastMessage: "آخر رسالة",
    flags: "علامات",
    actions: "الإجراءات",
    pinned: "مثبتة",
    muted: "صامتة",
    markRead: "تعليم كمقروء",
    setOpen: "جعلها مفتوحة",
    setClosed: "إغلاق",
    setArchived: "أرشفة",
    setSpam: "تعليم كمزعجة",
    toggleResolved: "تبديل الحل",
    togglePinned: "تبديل التثبيت",
    pin: "تثبيت",
    unpin: "إلغاء التثبيت",
    solve: "حل المحادثة",
    reopen: "إلغاء الحل",
    activeFilters: "فلاتر مفعلة",
    clearSelection: "إلغاء التحديد",
    noDataTitle: "لا توجد محادثات",
    noDataDesc: "ستظهر محادثات واتساب الواردة هنا عند وصول رسائل.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض محادثات أخرى.",
    noConversationTitle: "اختر محادثة",
    noConversationDesc: "اضغط على محادثة من الجدول لعرض رسائلها وتفاصيلها.",
    noMessages: "لا توجد رسائل في هذه المحادثة.",
    errorTitle: "تعذر تحميل صندوق الوارد",
    errorDesc: "تأكد من تشغيل الباكند وخدمة واتساب ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    actionSuccess: "تم تنفيذ العملية بنجاح.",
    actionFailed: "تعذر تنفيذ العملية.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير صندوق وارد واتساب",
    generatedAt: "تاريخ الطباعة",
    showing: "عرض",
    rows: "صفوف",
    of: "من",
    unknown: "غير محدد",
    phone: "الجوال",
    session: "الجلسة",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    sender: "المرسل",
    messageType: "نوع الرسالة",
    delivery: "التسليم",
    inbound: "وارد",
    outbound: "صادر",
    copied: "تم النسخ",
    copy: "نسخ",
  },
  en: {
    title: "WhatsApp Inbox",
    subtitle: "Monitor inbound WhatsApp conversations, messages, statuses, and handling.",
    back: "WhatsApp",
    settings: "Settings",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    total: "Total conversations",
    open: "Open",
    unread: "Unread",
    resolved: "Resolved",
    inbox: "Inbox",
    conversations: "Conversations",
    messages: "Messages",
    selectedConversation: "Selected conversation",
    searchPlaceholder: "Search by customer, phone, or last message...",
    allStatuses: "All statuses",
    status: "Status",
    closed: "Closed",
    archived: "Archived",
    spam: "Spam",
    allResolved: "All resolution states",
    unresolved: "Unresolved",
    onlyUnread: "Unread only",
    from: "From",
    to: "To",
    columns: "Columns",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    unreadSort: "Unread",
    statusSort: "Status",
    selected: "Selected",
    contact: "Contact",
    preview: "Last message",
    assigned: "Assigned",
    lastMessage: "Last message",
    flags: "Flags",
    actions: "Actions",
    pinned: "Pinned",
    muted: "Muted",
    markRead: "Mark as read",
    setOpen: "Set open",
    setClosed: "Close",
    setArchived: "Archive",
    setSpam: "Mark spam",
    toggleResolved: "Toggle resolved",
    togglePinned: "Toggle pinned",
    pin: "Pin",
    unpin: "Unpin",
    solve: "Resolve",
    reopen: "Reopen",
    activeFilters: "Active filters",
    clearSelection: "Clear selection",
    noDataTitle: "No conversations",
    noDataDesc: "Inbound WhatsApp conversations will appear here once messages arrive.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other conversations.",
    noConversationTitle: "Select a conversation",
    noConversationDesc: "Click a conversation from the table to view its messages and details.",
    noMessages: "No messages in this conversation.",
    errorTitle: "Unable to load inbox",
    errorDesc: "Make sure the backend and WhatsApp service are running, then try again.",
    tryAgain: "Try again",
    actionSuccess: "Action completed successfully.",
    actionFailed: "Unable to complete action.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "WhatsApp inbox report",
    generatedAt: "Generated at",
    showing: "Showing",
    rows: "Rows",
    of: "of",
    unknown: "Unknown",
    phone: "Phone",
    session: "Session",
    createdAt: "Created at",
    updatedAt: "Updated at",
    sender: "Sender",
    messageType: "Message type",
    delivery: "Delivery",
    inbound: "Inbound",
    outbound: "Outbound",
    copied: "Copied",
    copy: "Copy",
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

    if (["1", "true", "yes", "on", "resolved", "pinned", "read"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
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

function normalizeContact(value: unknown): ContactRecord {
  const item = asRecord(value);

  return {
    id: item.id === null || item.id === undefined ? null : toNumber(item.id),
    phone_number: normalizeText(item.phone_number),
    display_name: normalizeText(item.display_name),
    push_name: normalizeText(item.push_name),
    profile_name: normalizeText(item.profile_name),
    is_blocked: toBoolean(item.is_blocked),
    is_business: toBoolean(item.is_business),
    last_message_at: normalizeText(item.last_message_at) || null,
    last_seen_at: normalizeText(item.last_seen_at) || null,
  };
}

function normalizeAssignedUser(value: unknown): AssignedUserRecord {
  const item = asRecord(value);

  return {
    id: item.id === null || item.id === undefined ? null : toNumber(item.id),
    name: normalizeText(item.name),
    email: normalizeText(item.email),
    username: normalizeText(item.username),
  };
}

function normalizeConversation(value: unknown): ConversationRecord {
  const item = asRecord(value);
  const contact = normalizeContact(item.contact);
  const assignedTo = normalizeAssignedUser(item.assigned_to);

  return {
    id: toNumber(item.id),
    status: normalizeText(item.status || "OPEN").toUpperCase() as ConversationStatus,
    subject: normalizeText(item.subject),
    assigned_to_id:
      item.assigned_to_id === null || item.assigned_to_id === undefined
        ? null
        : toNumber(item.assigned_to_id),
    assigned_to_name: normalizeText(item.assigned_to_name || assignedTo.name),
    assigned_to: assignedTo,
    session_name: normalizeText(item.session_name),
    unread_count: toNumber(item.unread_count),
    last_message_preview: normalizeText(item.last_message_preview),
    last_message_at: normalizeText(item.last_message_at) || null,
    is_pinned: toBoolean(item.is_pinned),
    is_muted: toBoolean(item.is_muted),
    is_resolved: toBoolean(item.is_resolved),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
    contact,
  };
}

function normalizeMessage(value: unknown): MessageRecord {
  const item = asRecord(value);

  return {
    id: toNumber(item.id),
    conversation_id: toNumber(item.conversation_id),
    direction: normalizeText(item.direction),
    message_type: normalizeText(item.message_type),
    external_message_id: normalizeText(item.external_message_id),
    provider: normalizeText(item.provider),
    provider_status: normalizeText(item.provider_status),
    delivery_status: normalizeText(item.delivery_status),
    sender_phone: normalizeText(item.sender_phone),
    sender_name: normalizeText(item.sender_name),
    body_text: normalizeText(item.body_text),
    caption: normalizeText(item.caption),
    attachment_url: normalizeText(item.attachment_url),
    attachment_name: normalizeText(item.attachment_name),
    mime_type: normalizeText(item.mime_type),
    media_type: normalizeText(item.media_type),
    is_read: toBoolean(item.is_read),
    is_from_me: toBoolean(item.is_from_me),
    message_created_at: normalizeText(item.message_created_at) || null,
    sent_at: normalizeText(item.sent_at) || null,
    delivered_at: normalizeText(item.delivered_at) || null,
    read_at: normalizeText(item.read_at) || null,
    failed_at: normalizeText(item.failed_at) || null,
    created_at: normalizeText(item.created_at) || null,
  };
}

function normalizeSummary(value: unknown): InboxSummary {
  const item = asRecord(value);

  return {
    total_conversations: toNumber(item.total_conversations ?? item.total ?? item.count),
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

function extractSummary(payload: ApiResponse) {
  if (payload.summary) return payload.summary;

  const data = asRecord(payload.data);
  if (data.summary) return data.summary;

  return data;
}

function extractConversation(payload: ApiResponse) {
  if (payload.conversation) return payload.conversation;

  const data = asRecord(payload.data);
  if (data.conversation) return data.conversation;

  return data;
}

function getConversationName(conversation: ConversationRecord) {
  return (
    conversation.contact.display_name ||
    conversation.contact.push_name ||
    conversation.contact.profile_name ||
    conversation.subject ||
    conversation.contact.phone_number ||
    `#${conversation.id}`
  );
}

function getStatusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const value = normalizeText(status).toUpperCase();

  if (value === "CLOSED") return t.closed;
  if (value === "ARCHIVED") return t.archived;
  if (value === "SPAM") return t.spam;

  return t.open;
}

function getStatusClass(status: string) {
  const value = normalizeText(status).toUpperCase();

  if (value === "OPEN") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (value === "CLOSED") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  if (value === "SPAM") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function StatusBadge({
  status,
  locale,
}: {
  status: string;
  locale: Locale;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        getStatusClass(status),
      )}
    >
      {getStatusLabel(status, locale)}
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

export default function SystemWhatsAppInboxPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");

  const [summary, setSummary] = React.useState<InboxSummary>(() =>
    normalizeSummary({}),
  );
  const [conversations, setConversations] = React.useState<ConversationRecord[]>([]);
  const [selectedConversation, setSelectedConversation] =
    React.useState<ConversationRecord | null>(null);
  const [messages, setMessages] = React.useState<MessageRecord[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [messagesLoading, setMessagesLoading] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState("");
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [resolvedFilter, setResolvedFilter] = React.useState<ResolvedFilter>("all");
  const [onlyUnread, setOnlyUnread] = React.useState(false);
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

  const loadMessages = React.useCallback(
    async (conversation: ConversationRecord | null) => {
      if (!conversation?.id) {
        setMessages([]);
        return;
      }

      const controller = new AbortController();

      try {
        setMessagesLoading(true);

        const params = new URLSearchParams({ limit: "200" });
        const payload = await fetchJson<ApiResponse>(
          makeApiUrl(`/api/whatsapp/inbox/conversations/${conversation.id}/messages/`, params),
          { signal: controller.signal },
        );

        const nextConversation = normalizeConversation(extractConversation(payload));
        const nextMessages = extractArray(payload).map(normalizeMessage);

        setSelectedConversation(nextConversation.id ? nextConversation : conversation);
        setMessages(nextMessages);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        toast.error(message);
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }

      return () => controller.abort();
    },
    [t.errorDesc],
  );

  const loadInbox = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          limit: "200",
        });

        if (searchInput.trim()) {
          params.set("search", searchInput.trim());
        }

        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }

        if (onlyUnread) {
          params.set("only_unread", "true");
        }

        if (resolvedFilter === "resolved") {
          params.set("is_resolved", "true");
        }

        if (resolvedFilter === "unresolved") {
          params.set("is_resolved", "false");
        }

        const [summaryResponse, conversationsResponse] = await Promise.all([
          fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/inbox/summary/"), {
            signal: controller.signal,
          }),
          fetchJson<ApiResponse>(
            makeApiUrl("/api/whatsapp/inbox/conversations/", params),
            { signal: controller.signal },
          ),
        ]);

        const nextSummary = normalizeSummary(extractSummary(summaryResponse));
        const nextConversations = extractArray(conversationsResponse).map(normalizeConversation);

        setSummary(nextSummary);
        setConversations(nextConversations);
        setSelectedIds([]);

        setSelectedConversation((current) => {
          if (!current) return nextConversations[0] || null;
          return nextConversations.find((item) => item.id === current.id) || nextConversations[0] || null;
        });
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setError(message);
        setConversations([]);
        setSelectedConversation(null);
        setMessages([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [onlyUnread, resolvedFilter, searchInput, statusFilter, t.errorDesc],
  );

  React.useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  React.useEffect(() => {
    void loadMessages(selectedConversation);
  }, [loadMessages, selectedConversation?.id]);

  const filteredConversations = React.useMemo(() => {
    let items = [...conversations];

    if (dateFrom) {
      items = items.filter((item) => {
        const date = formatDate(item.last_message_at || item.created_at);
        return date !== "—" && date >= dateFrom;
      });
    }

    if (dateTo) {
      items = items.filter((item) => {
        const date = formatDate(item.last_message_at || item.created_at);
        return date !== "—" && date <= dateTo;
      });
    }

    items.sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.last_message_at || a.created_at || "").localeCompare(
          String(b.last_message_at || b.created_at || ""),
        );
      }

      if (sortKey === "name") {
        return getConversationName(a).localeCompare(getConversationName(b));
      }

      if (sortKey === "unread") {
        return b.unread_count - a.unread_count;
      }

      if (sortKey === "status") {
        return String(a.status).localeCompare(String(b.status));
      }

      if (a.is_pinned !== b.is_pinned) {
        return Number(b.is_pinned) - Number(a.is_pinned);
      }

      return String(b.last_message_at || b.created_at || "").localeCompare(
        String(a.last_message_at || a.created_at || ""),
      );
    });

    return items;
  }, [conversations, dateFrom, dateTo, sortKey]);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    statusFilter !== "all" ||
    resolvedFilter !== "all" ||
    onlyUnread ||
    sortKey !== "newest" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const allPageSelected =
    filteredConversations.length > 0 &&
    filteredConversations.every((item) => selectedIds.includes(item.id));

  function resetFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setResolvedFilter("all");
    setOnlyUnread(false);
    setSortKey("newest");
    setDateFrom("");
    setDateTo("");
    setSelectedIds([]);
  }

  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredConversations.map((item) => item.id));
  }

  function toggleSelectItem(id: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((item) => item !== id);
    });
  }

  async function postConversationAction(
    conversation: ConversationRecord,
    action:
      | "mark-read"
      | "toggle-resolved"
      | "toggle-pinned"
      | "status",
    body: ApiRecord = {},
  ) {
    setActionLoading(`${action}-${conversation.id}`);

    try {
      const endpoint =
        action === "mark-read"
          ? `/api/whatsapp/inbox/conversations/${conversation.id}/mark-read/`
          : action === "toggle-resolved"
            ? `/api/whatsapp/inbox/conversations/${conversation.id}/toggle-resolved/`
            : action === "toggle-pinned"
              ? `/api/whatsapp/inbox/conversations/${conversation.id}/toggle-pinned/`
              : `/api/whatsapp/inbox/conversations/${conversation.id}/status/`;

      await fetchJson<ApiResponse>(makeApiUrl(endpoint), {
        method: "POST",
        body,
      });

      toast.success(t.actionSuccess);
      await loadInbox({ silent: true });
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
    return filteredConversations.map((conversation) => ({
      contact: getConversationName(conversation),
      phone: conversation.contact.phone_number,
      status: getStatusLabel(conversation.status, locale),
      preview: conversation.last_message_preview,
      unread: conversation.unread_count,
      assigned: conversation.assigned_to_name || conversation.assigned_to.name || "—",
      lastMessage: formatDateTime(conversation.last_message_at),
      pinned: conversation.is_pinned ? t.pinned : "",
      resolved: conversation.is_resolved ? t.resolved : t.unresolved,
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
                <th>${escapeHtml(t.contact)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.preview)}</th>
                <th>${escapeHtml(t.unread)}</th>
                <th>${escapeHtml(t.assigned)}</th>
                <th>${escapeHtml(t.lastMessage)}</th>
                <th>${escapeHtml(t.flags)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.contact)}<br />${escapeHtml(row.phone)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.preview || "—")}</td>
                      <td>${escapeHtml(row.unread)}</td>
                      <td>${escapeHtml(row.assigned)}</td>
                      <td>${escapeHtml(row.lastMessage)}</td>
                      <td>${escapeHtml([row.pinned, row.resolved].filter(Boolean).join(" / "))}</td>
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
    link.download = `primey-care-whatsapp-inbox-${new Date().toISOString().slice(0, 10)}.xls`;
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
            <div class="box"><span>${escapeHtml(t.total)}</span><strong>${escapeHtml(summary.total_conversations)}</strong></div>
            <div class="box"><span>${escapeHtml(t.open)}</span><strong>${escapeHtml(summary.open_conversations)}</strong></div>
            <div class="box"><span>${escapeHtml(t.unread)}</span><strong>${escapeHtml(summary.unread_conversations)}</strong></div>
            <div class="box"><span>${escapeHtml(t.resolved)}</span><strong>${escapeHtml(summary.resolved_conversations)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.contact)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.preview)}</th>
                <th>${escapeHtml(t.unread)}</th>
                <th>${escapeHtml(t.assigned)}</th>
                <th>${escapeHtml(t.lastMessage)}</th>
                <th>${escapeHtml(t.flags)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.contact)}<br />${escapeHtml(row.phone)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.preview || "—")}</td>
                      <td>${escapeHtml(row.unread)}</td>
                      <td>${escapeHtml(row.assigned)}</td>
                      <td>${escapeHtml(row.lastMessage)}</td>
                      <td>${escapeHtml([row.pinned, row.resolved].filter(Boolean).join(" / "))}</td>
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
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/whatsapp">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadInbox({ silent: true })}
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
          value={formatInteger(summary.total_conversations || conversations.length)}
          trend={`${t.showing} ${formatInteger(filteredConversations.length)}`}
          icon={Inbox}
        />

        <KpiCard
          title={t.open}
          value={formatInteger(summary.open_conversations)}
          trend={t.open}
          icon={MessageCircle}
        />

        <KpiCard
          title={t.unread}
          value={formatInteger(summary.unread_conversations)}
          trend={t.onlyUnread}
          icon={MailCheck}
        />

        <KpiCard
          title={t.resolved}
          value={formatInteger(summary.resolved_conversations)}
          trend={`${t.pinned}: ${formatInteger(summary.pinned_conversations)}`}
          icon={ShieldCheck}
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
              onClick={() => void loadInbox()}
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
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[145px]">
                      <CheckCircle2 className="h-4 w-4" />
                      <SelectValue placeholder={t.status} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allStatuses}</SelectItem>
                      <SelectItem value="OPEN">{t.open}</SelectItem>
                      <SelectItem value="CLOSED">{t.closed}</SelectItem>
                      <SelectItem value="ARCHIVED">{t.archived}</SelectItem>
                      <SelectItem value="SPAM">{t.spam}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={resolvedFilter}
                    onValueChange={(value) => setResolvedFilter(value as ResolvedFilter)}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[155px]">
                      <ShieldCheck className="h-4 w-4" />
                      <SelectValue placeholder={t.resolved} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allResolved}</SelectItem>
                      <SelectItem value="resolved">{t.resolved}</SelectItem>
                      <SelectItem value="unresolved">{t.unresolved}</SelectItem>
                    </SelectContent>
                  </Select>

                  <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-sm">
                    <Checkbox
                      checked={onlyUnread}
                      onCheckedChange={(checked) => setOnlyUnread(Boolean(checked))}
                    />
                    {t.onlyUnread}
                  </label>

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
                          ["contact", t.contact],
                          ["status", t.status],
                          ["preview", t.preview],
                          ["unread", t.unread],
                          ["assigned", t.assigned],
                          ["lastMessage", t.lastMessage],
                          ["flags", t.flags],
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
                          ["name", t.nameSort],
                          ["unread", t.unreadSort],
                          ["status", t.statusSort],
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
                <Table className="min-w-[1120px] table-fixed">
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

                      {visibleColumns.contact ? (
                        <TableHeaderCell className="w-[260px]">
                          <HeaderSortButton
                            active={sortKey === "name"}
                            onClick={() => setSortKey("name")}
                          >
                            {t.contact}
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

                      {visibleColumns.preview ? (
                        <TableHeaderCell className="w-[300px]">{t.preview}</TableHeaderCell>
                      ) : null}

                      {visibleColumns.unread ? (
                        <TableHeaderCell className="w-[90px]">
                          <HeaderSortButton
                            active={sortKey === "unread"}
                            onClick={() => setSortKey("unread")}
                          >
                            {t.unread}
                          </HeaderSortButton>
                        </TableHeaderCell>
                      ) : null}

                      {visibleColumns.assigned ? (
                        <TableHeaderCell className="w-[150px]">{t.assigned}</TableHeaderCell>
                      ) : null}

                      {visibleColumns.lastMessage ? (
                        <TableHeaderCell className="w-[145px]">
                          <HeaderSortButton
                            active={sortKey === "newest" || sortKey === "oldest"}
                            onClick={() => setSortKey("newest")}
                          >
                            {t.lastMessage}
                          </HeaderSortButton>
                        </TableHeaderCell>
                      ) : null}

                      {visibleColumns.flags ? (
                        <TableHeaderCell className="w-[120px]">{t.flags}</TableHeaderCell>
                      ) : null}

                      {visibleColumns.actions ? (
                        <TableHeaderCell className="w-[72px] text-center">
                          {t.actions}
                        </TableHeaderCell>
                      ) : null}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredConversations.length ? (
                      filteredConversations.map((conversation) => {
                        const name = getConversationName(conversation);
                        const isActive = selectedConversation?.id === conversation.id;

                        return (
                          <TableRow
                            key={conversation.id}
                            className={cn(
                              "h-[62px] cursor-pointer",
                              isActive && "bg-muted/30",
                            )}
                            onClick={() => setSelectedConversation(conversation)}
                          >
                            {visibleColumns.select ? (
                              <TableBodyCell className="w-[46px] px-3">
                                <Checkbox
                                  checked={selectedIds.includes(conversation.id)}
                                  onCheckedChange={(checked) =>
                                    toggleSelectItem(conversation.id, Boolean(checked))
                                  }
                                  onClick={(event) => event.stopPropagation()}
                                  aria-label={name}
                                />
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.contact ? (
                              <TableBodyCell className="w-[260px]">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-emerald-50">
                                    <MessageCircle className="h-4 w-4 text-emerald-700" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                      {name}
                                    </p>
                                    <p className="truncate text-xs tabular-nums text-muted-foreground" dir="ltr">
                                      {conversation.contact.phone_number || "—"}
                                    </p>
                                  </div>
                                </div>
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.status ? (
                              <TableBodyCell className="w-[120px]">
                                <StatusBadge status={conversation.status} locale={locale} />
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.preview ? (
                              <TableBodyCell className="w-[300px]">
                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                  {conversation.last_message_preview || "—"}
                                </p>
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.unread ? (
                              <TableBodyCell className="w-[90px]">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-full px-2.5 py-1 text-xs font-medium",
                                    conversation.unread_count > 0
                                      ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                                      : "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40",
                                  )}
                                >
                                  {formatInteger(conversation.unread_count)}
                                </Badge>
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.assigned ? (
                              <TableBodyCell className="w-[150px]">
                                <span className="block truncate text-sm text-muted-foreground">
                                  {conversation.assigned_to_name ||
                                    conversation.assigned_to.name ||
                                    "—"}
                                </span>
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.lastMessage ? (
                              <TableBodyCell className="w-[145px]">
                                <span className="block truncate text-sm tabular-nums text-muted-foreground">
                                  {formatDateTime(conversation.last_message_at)}
                                </span>
                              </TableBodyCell>
                            ) : null}

                            {visibleColumns.flags ? (
                              <TableBodyCell className="w-[120px]">
                                <div className="flex flex-wrap gap-1">
                                  {conversation.is_pinned ? (
                                    <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                                      {t.pinned}
                                    </Badge>
                                  ) : null}
                                  {conversation.is_resolved ? (
                                    <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                                      {t.resolved}
                                    </Badge>
                                  ) : null}
                                  {conversation.is_muted ? (
                                    <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">
                                      {t.muted}
                                    </Badge>
                                  ) : null}
                                  {!conversation.is_pinned &&
                                  !conversation.is_resolved &&
                                  !conversation.is_muted ? (
                                    <span className="text-sm text-muted-foreground">—</span>
                                  ) : null}
                                </div>
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
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent
                                    align={locale === "ar" ? "start" : "end"}
                                    className="w-52"
                                  >
                                    <DropdownMenuItem
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void postConversationAction(conversation, "mark-read");
                                      }}
                                    >
                                      <MailCheck className="h-4 w-4" />
                                      {t.markRead}
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void postConversationAction(conversation, "status", {
                                          status: "OPEN",
                                        });
                                      }}
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                      {t.setOpen}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void postConversationAction(conversation, "status", {
                                          status: "CLOSED",
                                        });
                                      }}
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                      {t.setClosed}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void postConversationAction(conversation, "status", {
                                          status: "ARCHIVED",
                                        });
                                      }}
                                    >
                                      <Inbox className="h-4 w-4" />
                                      {t.setArchived}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void postConversationAction(conversation, "status", {
                                          status: "SPAM",
                                        });
                                      }}
                                    >
                                      <XCircle className="h-4 w-4" />
                                      {t.setSpam}
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void postConversationAction(conversation, "toggle-resolved", {
                                          is_resolved: !conversation.is_resolved,
                                        });
                                      }}
                                    >
                                      <ShieldCheck className="h-4 w-4" />
                                      {conversation.is_resolved ? t.reopen : t.solve}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void postConversationAction(conversation, "toggle-pinned", {
                                          is_pinned: !conversation.is_pinned,
                                        });
                                      }}
                                    >
                                      {conversation.is_pinned ? (
                                        <PinOff className="h-4 w-4" />
                                      ) : (
                                        <Pin className="h-4 w-4" />
                                      )}
                                      {conversation.is_pinned ? t.unpin : t.pin}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableBodyCell>
                            ) : null}
                          </TableRow>
                        );
                      })
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
                  {formatInteger(filteredConversations.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(conversations.length)}
                </span>{" "}
                {t.rows}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.selectedConversation}</CardTitle>
              <CardDescription>
                {selectedConversation
                  ? getConversationName(selectedConversation)
                  : t.noConversationTitle}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pb-6">
              {selectedConversation ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-emerald-50">
                      <UserRound className="h-5 w-5 text-emerald-700" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-foreground">
                        {getConversationName(selectedConversation)}
                      </p>
                      <p className="truncate text-sm tabular-nums text-muted-foreground" dir="ltr">
                        {selectedConversation.contact.phone_number || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <InfoRow label={t.status} value={<StatusBadge status={selectedConversation.status} locale={locale} />} />
                    <InfoRow label={t.phone} value={selectedConversation.contact.phone_number || "—"} />
                    <InfoRow label={t.unread} value={formatInteger(selectedConversation.unread_count)} />
                    <InfoRow label={t.assigned} value={selectedConversation.assigned_to_name || selectedConversation.assigned_to.name || "—"} />
                    <InfoRow label={t.session} value={selectedConversation.session_name || "—"} />
                    <InfoRow label={t.lastMessage} value={formatDateTime(selectedConversation.last_message_at)} />
                    <InfoRow label={t.createdAt} value={formatDateTime(selectedConversation.created_at)} />
                    <InfoRow label={t.updatedAt} value={formatDateTime(selectedConversation.updated_at)} />
                  </div>

                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg bg-background"
                      disabled={Boolean(actionLoading)}
                      onClick={() => void postConversationAction(selectedConversation, "mark-read")}
                    >
                      <MailCheck className="h-4 w-4" />
                      {t.markRead}
                    </Button>

                    <Button
                      variant="outline"
                      className="h-9 rounded-lg bg-background"
                      disabled={Boolean(actionLoading)}
                      onClick={() =>
                        void postConversationAction(selectedConversation, "toggle-resolved", {
                          is_resolved: !selectedConversation.is_resolved,
                        })
                      }
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {selectedConversation.is_resolved ? t.reopen : t.solve}
                    </Button>

                    <Button
                      variant="outline"
                      className="h-9 rounded-lg bg-background"
                      disabled={Boolean(actionLoading)}
                      onClick={() =>
                        void postConversationAction(selectedConversation, "toggle-pinned", {
                          is_pinned: !selectedConversation.is_pinned,
                        })
                      }
                    >
                      {selectedConversation.is_pinned ? (
                        <PinOff className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                      {selectedConversation.is_pinned ? t.unpin : t.pin}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                    <MessageCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{t.noConversationTitle}</p>
                    <p className="text-sm text-muted-foreground">{t.noConversationDesc}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{t.messages}</CardTitle>
                  <CardDescription>
                    {selectedConversation
                      ? getConversationName(selectedConversation)
                      : t.noConversationTitle}
                  </CardDescription>
                </div>

                {messagesLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Clock3 className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>

            <CardContent className="max-h-[520px] space-y-3 overflow-y-auto px-6 pb-6">
              {selectedConversation && messages.length ? (
                messages.map((message) => {
                  const isOutbound = message.is_from_me || message.direction?.toUpperCase() === "OUTBOUND";
                  const text = message.body_text || message.caption || message.attachment_name || "—";

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        isOutbound ? "justify-start" : "justify-end",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[88%] rounded-2xl border px-4 py-3",
                          isOutbound
                            ? "bg-muted/40"
                            : "border-emerald-500/20 bg-emerald-50",
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-muted-foreground">
                            {isOutbound ? t.outbound : t.inbound}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatDateTime(message.message_created_at || message.created_at)}
                          </span>
                        </div>

                        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                          {text}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{message.message_type || t.messageType}</span>
                          {message.delivery_status ? <span>• {message.delivery_status}</span> : null}
                          {message.sender_phone ? <span dir="ltr">• {message.sender_phone}</span> : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                    <MessageCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {selectedConversation ? t.noMessages : t.noConversationTitle}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation ? t.noMessages : t.noConversationDesc}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}