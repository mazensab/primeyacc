"use client";
/*
================================================================================
📂 primey_frontend/components/company/whatsapp/CompanyWhatsAppInboxView.tsx
🟢 Mhamcloud — Company WhatsApp Inbox Premium View
================================================================================
✅ Approved Premium pattern matching company workspace companies page
✅ Real API only: /api/company/whatsapp/conversations/
✅ Arabic/English via primey-locale
✅ English digits always in Arabic and English, matching approved companies page
✅ Main /company/whatsapp page is Inbox, not dashboard quick-card page
✅ No "لوحة الشركة / العودة إلى لوحة الشركة الرئيسية" card
✅ Company WhatsApp conversations + messages + reply
✅ Supports LID/JID reply through backend Phase 3
================================================================================
*/
import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Inbox,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  SendHorizontal,
  Settings2,
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
import { cn } from "@/lib/utils";
type Locale = "ar" | "en";
type InboxSummary = {
  total_conversations?: number;
  open_conversations?: number;
  closed_conversations?: number;
  archived_conversations?: number;
  spam_conversations?: number;
  unread_conversations?: number;
  resolved_conversations?: number;
  pinned_conversations?: number;
};
type InboxContact = {
  id?: number;
  phone_number?: string;
  normalized_phone?: string;
  whatsapp_jid?: string;
  display_name?: string;
  push_name?: string;
};
type InboxConversation = {
  id: number;
  status?: string;
  is_pinned?: boolean;
  is_resolved?: boolean;
  unread_count?: number;
  assigned_to_name?: string;
  session_name?: string;
  last_message_preview?: string;
  last_message_at?: string | null;
  updated_at?: string | null;
  contact?: InboxContact;
};
type InboxMessage = {
  id: number;
  conversation_id?: number;
  direction?: "INBOUND" | "OUTBOUND" | string;
  status?: string;
  message_type?: string;
  body?: string;
  external_message_id?: string;
  provider_response?: Record<string, unknown>;
  received_at?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
};
type InboxListPayload = {
  success?: boolean;
  message?: string;
  summary?: InboxSummary;
  conversations?: InboxConversation[];
  results?: InboxConversation[];
  data?: {
    conversations?: InboxConversation[];
    results?: InboxConversation[];
  };
};
type InboxMessagesPayload = {
  success?: boolean;
  message?: string;
  conversation?: InboxConversation;
  messages?: InboxMessage[];
  results?: InboxMessage[];
  data?: {
    messages?: InboxMessage[];
    results?: InboxMessage[];
  };
};
type InboxReplyPayload = {
  success?: boolean;
  message?: string;
  reply?: InboxMessage;
  conversation?: InboxConversation;
};
type StatusFilter = "all" | "OPEN" | "CLOSED" | "ARCHIVED" | "SPAM";
const API_ROOT = "/api/company/whatsapp/conversations/";
const translations = {
  ar: {
    badge: "التواصل والإشعارات",
    title: "صندوق محادثات واتساب الشركة",
    desc: "متابعة محادثات واتساب الواردة والرد عليها مباشرة من مساحة الشركة باستخدام الاتصال الرسمي للنظام.",
    settings: "إعدادات واتساب",
    settingsDesc: "إدارة الاتصال، QR، Pairing Code، وحالة الجلسة.",
    templates: "قوالب واتساب",
    templatesDesc: "مراجعة القوالب الرسمية واختبار إرسالها.",
    logs: "سجل الرسائل",
    logsDesc: "متابعة الرسائل المرسلة والفاشلة وسجل الإرسال.",
    refresh: "تحديث",
    search: "بحث",
    searchPlaceholder: "ابحث بالاسم أو الرقم أو آخر رسالة...",
    all: "الكل",
    open: "مفتوحة",
    closed: "مغلقة",
    archived: "مؤرشفة",
    spam: "مزعجة",
    conversations: "المحادثات",
    conversationCount: "محادثة",
    noConversations: "لا توجد محادثات بعد",
    noConversationsDesc: "ستظهر المحادثات تلقائيًا عند وصول أول رسالة إلى رقم الشركة.",
    selectConversation: "اختر محادثة",
    selectConversationDesc: "اختر محادثة من القائمة لعرض الرسائل والرد من داخل الشركة.",
    jid: "JID",
    phone: "الرقم",
    unread: "غير مقروء",
    total: "إجمالي المحادثات",
    resolved: "المحادثات المحلولة",
    openCount: "المحادثات المفتوحة",
    messagePlaceholder: "اكتب ردك هنا...",
    send: "إرسال الرد",
    sending: "جار الإرسال...",
    loadError: "تعذر تحميل صندوق واتساب.",
    messagesLoadError: "تعذر تحميل رسائل المحادثة.",
    replyRequired: "اكتب رسالة الرد أولًا.",
    replySent: "تم إرسال الرد وتسجيله في المحادثة.",
    inbound: "وارد",
    outbound: "صادر",
    emptyMessages: "لا توجد رسائل في هذه المحادثة.",
    media: "رسالة وسائط",
    latest: "آخر نشاط",
    totalDesc: "جميع محادثات واتساب المسجلة داخل مساحة الشركة.",
    unreadDesc: "المحادثات التي تتطلب المراجعة أو الرد.",
    resolvedDesc: "المحادثات التي تم إنهاؤها ومعالجتها.",
    openCountDesc: "المحادثات المفتوحة قيد المتابعة.",
    reset: "إعادة ضبط",
    audio: "صوت",
    image: "صورة",
    video: "فيديو",
    document: "مستند",
    unknown: "غير معروف",
    text: "نص",
    received: "مستلمة",
    sent: "مرسلة",
    failed: "فاشلة",
  },
  en: {
    badge: "Communication & Notifications",
    title: "Company WhatsApp Inbox",
    desc: "Monitor inbound WhatsApp conversations and reply directly from the company workspace using the official connection.",
    settings: "WhatsApp Settings",
    settingsDesc: "Manage connection, QR, Pairing Code, and session status.",
    templates: "WhatsApp Templates",
    templatesDesc: "Review official templates and test sending.",
    logs: "Message Logs",
    logsDesc: "Track sent, failed, and provider message history.",
    refresh: "Refresh",
    search: "Search",
    searchPlaceholder: "Search by name, number, or latest message...",
    all: "All",
    open: "Open",
    closed: "Closed",
    archived: "Archived",
    spam: "Spam",
    conversations: "Conversations",
    conversationCount: "conversation",
    noConversations: "No conversations yet",
    noConversationsDesc: "Inbound conversations will appear automatically once the first message arrives.",
    selectConversation: "Select a conversation",
    selectConversationDesc: "Choose a conversation from the list to view messages and reply from the company workspace.",
    jid: "JID",
    phone: "Phone",
    unread: "Unread",
    total: "Total conversations",
    resolved: "Resolved conversations",
    openCount: "Open conversations",
    messagePlaceholder: "Write your reply here...",
    send: "Send reply",
    sending: "Sending...",
    loadError: "Unable to load WhatsApp inbox.",
    messagesLoadError: "Unable to load conversation messages.",
    replyRequired: "Write a reply message first.",
    replySent: "Reply sent and recorded in the conversation.",
    inbound: "Inbound",
    outbound: "Outbound",
    emptyMessages: "No messages in this conversation.",
    media: "Media message",
    latest: "Latest activity",
    totalDesc: "All WhatsApp conversations recorded in the company workspace.",
    unreadDesc: "Conversations that need review or a reply.",
    resolvedDesc: "Conversations that have been completed and resolved.",
    openCountDesc: "Open conversations currently being followed up.",
    reset: "Reset",
    audio: "Audio",
    image: "Image",
    video: "Video",
    document: "Document",
    unknown: "Unknown",
    text: "Text",
    received: "Received",
    sent: "Sent",
    failed: "Failed",
  },
} as const;
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) return "";
  return parts.pop()?.split(";").shift() || "";
}
function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(Number.isFinite(value) ? value : 0),
  );
}
function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
function safeText(value: string | undefined | null): string {
  return String(value || "");
}
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };
  const csrfToken = getCookie("csrftoken");
  if (csrfToken && options.method && options.method !== "GET") {
    headers["X-CSRFToken"] = csrfToken;
  }
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });
  const payload = (await response.json().catch(() => null)) as
    | (Record<string, unknown> & { message?: string; success?: boolean })
    | null;
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }
  return payload as T;
}
function pickConversations(payload: InboxListPayload): InboxConversation[] {
  return (
    payload.conversations ||
    payload.results ||
    payload.data?.conversations ||
    payload.data?.results ||
    []
  );
}
function pickMessages(payload: InboxMessagesPayload): InboxMessage[] {
  return payload.messages || payload.results || payload.data?.messages || payload.data?.results || [];
}
function displayName(conversation?: InboxConversation | null): string {
  const contact = conversation?.contact;
  return (
    contact?.display_name?.trim() ||
    contact?.push_name?.trim() ||
    contact?.phone_number?.trim() ||
    contact?.normalized_phone?.trim() ||
    contact?.whatsapp_jid?.trim() ||
    `#${conversation?.id || ""}`
  );
}
function displayPhone(conversation?: InboxConversation | null): string {
  const contact = conversation?.contact;
  return contact?.phone_number || contact?.normalized_phone || "—";
}
function displayJid(conversation?: InboxConversation | null): string {
  return conversation?.contact?.whatsapp_jid || "—";
}
function messageTypeLabel(type: string | undefined, locale: Locale): string {
  const normalized = String(type || "").toUpperCase();
  const t = translations[locale];
  if (normalized === "TEXT") return t.text;
  if (normalized === "AUDIO") return t.audio;
  if (normalized === "IMAGE") return t.image;
  if (normalized === "VIDEO") return t.video;
  if (normalized === "DOCUMENT") return t.document;
  if (normalized === "UNKNOWN") return t.unknown;
  return normalized || t.media;
}
function messageText(message: InboxMessage, locale: Locale): string {
  const body = (message.body || "").trim();
  if (body) return body;
  const type = (message.message_type || "").trim();
  if (type) return `[${messageTypeLabel(type, locale)}]`;
  return translations[locale].media;
}
function statusLabel(status: string | undefined, locale: Locale): string {
  const value = (status || "OPEN").toUpperCase();
  const labels: Record<Locale, Record<string, string>> = {
    ar: {
      OPEN: "مفتوحة",
      CLOSED: "مغلقة",
      ARCHIVED: "مؤرشفة",
      SPAM: "مزعجة",
    },
    en: {
      OPEN: "Open",
      CLOSED: "Closed",
      ARCHIVED: "Archived",
      SPAM: "Spam",
    },
  };
  return labels[locale][value] || value;
}
function deliveryStatusLabel(status: string | undefined, locale: Locale): string {
  const value = String(status || "").toUpperCase();
  const t = translations[locale];
  if (value === "RECEIVED") return t.received;
  if (value === "SENT") return t.sent;
  if (value === "FAILED") return t.failed;
  return value || "—";
}
function directionLabel(direction: string | undefined, locale: Locale): string {
  return direction === "OUTBOUND" ? translations[locale].outbound : translations[locale].inbound;
}
function statusClass(status: string | undefined): string {
  const value = (status || "OPEN").toUpperCase();
  if (value === "OPEN") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "CLOSED") return "border-slate-200 bg-slate-50 text-slate-700";
  if (value === "ARCHIVED") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "SPAM") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
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
    <Card className="rounded-2xl border-border/70 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {formatInteger(value)}
          </CardTitle>
        </div>
        <span className="rounded-xl border bg-background p-2.5 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
function InboxSkeleton({ locale }: { locale: Locale }) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8" dir={dir}>
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        <div className="space-y-3 py-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-full max-w-3xl" />
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
      </div>
    </main>
  );
}
export default function CompanyWhatsAppInboxView() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [summary, setSummary] = React.useState<InboxSummary>({});
  const [conversations, setConversations] = React.useState<InboxConversation[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [messages, setMessages] = React.useState<InboxMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = React.useState(true);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [reply, setReply] = React.useState("");
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
  const selectedConversation = React.useMemo(
    () => conversations.find((item) => item.id === selectedId) || null,
    [conversations, selectedId],
  );
  const loadConversations = React.useCallback(async () => {
    setLoadingConversations(true);
    try {
      const query = new URLSearchParams();
      query.set("page_size", "100");
      if (search.trim()) query.set("search", search.trim());
      if (status !== "all") query.set("status", status);
      const payload = await apiFetch<InboxListPayload>(`${API_ROOT}?${query.toString()}`);
      const items = pickConversations(payload);
      setSummary(payload.summary || {});
      setConversations(items);
      setSelectedId((current) => {
        if (current && items.some((item) => item.id === current)) return current;
        return items[0]?.id || null;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : translations[getInitialLocale()].loadError);
    } finally {
      setLoadingConversations(false);
    }
  }, [search, status]);
  const loadMessages = React.useCallback(async (conversationId: number) => {
    setLoadingMessages(true);
    try {
      const payload = await apiFetch<InboxMessagesPayload>(
        `${API_ROOT}${conversationId}/messages/`,
      );
      setMessages(pickMessages(payload));
      if (payload.conversation) {
        setConversations((items) =>
          items.map((item) =>
            item.id === conversationId ? { ...item, ...payload.conversation } : item,
          ),
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : translations[getInitialLocale()].messagesLoadError);
    } finally {
      setLoadingMessages(false);
    }
  }, []);
  React.useEffect(() => {
    void loadConversations();
  }, [loadConversations]);
  React.useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
  }, [loadMessages, selectedId]);
  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput);
  }
  async function handleRefresh() {
    await loadConversations();
    if (selectedId) await loadMessages(selectedId);
  }
  async function handleReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    const body = reply.trim();
    if (!body) {
      toast.error(t.replyRequired);
      return;
    }
    setSending(true);
    try {
      const payload = await apiFetch<InboxReplyPayload>(`${API_ROOT}${selectedId}/reply/`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      if (!payload.success) {
        throw new Error(payload.message || t.loadError);
      }
      setReply("");
      toast.success(t.replySent);
      await loadMessages(selectedId);
      await loadConversations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadError);
    } finally {
      setSending(false);
    }
  }
  if (loadingConversations && conversations.length === 0) {
    return <InboxSkeleton locale={locale} />;
  }
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8" dir={dir}>
      <div className="mx-auto w-full max-w-[1500px] space-y-6">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className={cn("min-w-0 space-y-3", alignClass)}>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {t.badge}
            </Badge>

            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                {t.desc}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/company/whatsapp/settings">
                  <Settings2 />
                  {t.settings}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/company/whatsapp/templates">
                  <FileText />
                  {t.templates}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/company/whatsapp/messages">
                  <SendHorizontal />
                  {t.logs}
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleRefresh}
              disabled={loadingConversations || loadingMessages}
            >
              {loadingConversations || loadingMessages ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              {t.refresh}
            </Button>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t.total}
            value={summary.total_conversations || conversations.length || 0}
            description={t.totalDesc}
            icon={Inbox}
          />
          <KpiCard
            title={t.unread}
            value={summary.unread_conversations || 0}
            description={t.unreadDesc}
            icon={AlertCircle}
          />
          <KpiCard
            title={t.resolved}
            value={summary.resolved_conversations || 0}
            description={t.resolvedDesc}
            icon={CheckCircle2}
          />
          <KpiCard
            title={t.openCount}
            value={summary.open_conversations || 0}
            description={t.openCountDesc}
            icon={Wifi}
          />
        </div>

        <Card className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm">
          <CardHeader className={cn("gap-4 border-b border-border/70", alignClass)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">{t.conversations}</CardTitle>
                  <Badge variant="outline" className="rounded-full">
                    {formatInteger(summary.total_conversations || conversations.length || 0)}
                  </Badge>
                </div>
                <CardDescription className="mt-2">
                  {t.selectConversationDesc}
                </CardDescription>
              </div>

              <Badge variant="outline" className="w-fit rounded-full">
                <Inbox className="h-3.5 w-3.5" />
                {formatInteger(summary.unread_conversations || 0)} {t.unread}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-4 sm:p-5">
            <form
              onSubmit={handleSearch}
              className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-3 md:grid-cols-[minmax(0,1fr)_180px_auto_auto]"
            >
              <div className="relative">
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
                    locale === "ar" ? "pr-10 text-right" : "pl-10 text-left",
                  )}
                />
              </div>

              <Select
                value={status}
                onValueChange={(value) => setStatus(value as StatusFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.all} />
                </SelectTrigger>
                <SelectContent align={locale === "ar" ? "end" : "start"}>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="OPEN">{t.open}</SelectItem>
                  <SelectItem value="CLOSED">{t.closed}</SelectItem>
                  <SelectItem value="ARCHIVED">{t.archived}</SelectItem>
                  <SelectItem value="SPAM">{t.spam}</SelectItem>
                </SelectContent>
              </Select>

              <Button type="submit">
                <Search />
                {t.search}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setStatus("all");
                }}
              >
                <RefreshCw />
                {t.reset}
              </Button>
            </form>

            <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
              <section className="overflow-hidden rounded-xl border border-border/70 bg-background xl:h-[720px]">
                <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4">
                  <div className={alignClass}>
                    <h2 className="text-sm font-semibold">{t.conversations}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatInteger(conversations.length)} {t.conversationCount}
                    </p>
                  </div>
                  <span className="rounded-xl border bg-muted/30 p-2 text-muted-foreground">
                    <Inbox className="h-4 w-4" />
                  </span>
                </div>

                <div className="flex max-h-[650px] flex-col gap-2 overflow-y-auto p-3">
                  {loadingConversations ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="rounded-xl border p-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="mt-2 h-3 w-24" />
                        <Skeleton className="mt-4 h-10 w-full" />
                      </div>
                    ))
                  ) : conversations.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                      <div className="rounded-full bg-muted p-4 text-muted-foreground">
                        <Inbox className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {t.noConversations}
                        </h3>
                        <p className="mt-1 text-sm leading-7 text-muted-foreground">
                          {t.noConversationsDesc}
                        </p>
                      </div>
                    </div>
                  ) : (
                    conversations.map((conversation) => {
                      const isActive = conversation.id === selectedId;
                      const unread = conversation.unread_count || 0;

                      return (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => setSelectedId(conversation.id)}
                          className={cn(
                            "w-full rounded-xl border p-3 transition-colors hover:bg-muted/40",
                            alignClass,
                            isActive
                              ? "border-foreground/20 bg-muted/60"
                              : "border-border/70 bg-background",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div
                                className={cn(
                                  "flex items-center gap-2",
                                  locale === "ar" ? "justify-end" : "justify-start",
                                )}
                              >
                                <p className="truncate text-sm font-semibold">
                                  {displayName(conversation)}
                                </p>
                                <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {displayPhone(conversation)}
                              </p>
                            </div>

                            {unread > 0 ? (
                              <span className="rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                                {formatInteger(unread)}
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-3 line-clamp-2 text-xs leading-6 text-muted-foreground">
                            {conversation.last_message_preview
                              ? safeText(conversation.last_message_preview)
                              : t.media}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                            <span>
                              {formatDate(
                                conversation.last_message_at || conversation.updated_at,
                              )}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full px-2.5 py-1",
                                statusClass(conversation.status),
                              )}
                            >
                              {statusLabel(conversation.status, locale)}
                            </Badge>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="flex min-h-[620px] flex-col overflow-hidden rounded-xl border border-border/70 bg-background xl:h-[720px]">
                {!selectedConversation ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                    <div className="rounded-full bg-muted p-4 text-muted-foreground">
                      <MessageCircle className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {t.selectConversation}
                      </h3>
                      <p className="mt-1 max-w-md text-sm leading-7 text-muted-foreground">
                        {t.selectConversationDesc}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={cn("border-b border-border/70 p-4", alignClass)}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-lg font-semibold">
                              {displayName(selectedConversation)}
                            </h2>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full",
                                statusClass(selectedConversation.status),
                              )}
                            >
                              {statusLabel(selectedConversation.status, locale)}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              <span className="font-medium text-foreground">{t.phone}: </span>
                              {displayPhone(selectedConversation)}
                            </span>
                            <span>
                              <span className="font-medium text-foreground">{t.jid}: </span>
                              {displayJid(selectedConversation)}
                            </span>
                            <span>
                              <span className="font-medium text-foreground">{t.latest}: </span>
                              {formatDate(selectedConversation.last_message_at)}
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void loadMessages(selectedConversation.id)}
                        >
                          {loadingMessages ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <RefreshCw />
                          )}
                          {t.refresh}
                        </Button>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4">
                      {loadingMessages ? (
                        <div className="flex h-full min-h-[360px] items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center">
                          <div className="rounded-full bg-muted p-4 text-muted-foreground">
                            <MessageCircle className="h-6 w-6" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {t.emptyMessages}
                          </h3>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {messages.map((message) => {
                            const outbound = message.direction === "OUTBOUND";

                            return (
                              <div
                                key={message.id}
                                className={cn(
                                  "flex",
                                  outbound ? "justify-start" : "justify-end",
                                )}
                              >
                                <div
                                  className={cn(
                                    "max-w-[82%] rounded-2xl border px-4 py-3 shadow-sm",
                                    outbound
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background",
                                  )}
                                >
                                  <div className="mb-2 flex items-center justify-between gap-5 text-[11px] opacity-80">
                                    <span>{directionLabel(message.direction, locale)}</span>
                                    <span>{deliveryStatusLabel(message.status, locale)}</span>
                                  </div>
                                  <p className="whitespace-pre-wrap text-sm leading-7">
                                    {messageText(message, locale)}
                                  </p>
                                  <p className="mt-3 text-[11px] opacity-70">
                                    {formatDate(
                                      message.sent_at ||
                                        message.received_at ||
                                        message.created_at,
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border/70 p-4">
                      <form
                        onSubmit={handleReply}
                        className="flex flex-col gap-3 lg:flex-row lg:items-end"
                      >
                        <textarea
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          placeholder={t.messagePlaceholder}
                          rows={3}
                          className={cn(
                            "min-h-24 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm leading-7 shadow-sm outline-none transition focus-visible:ring-1 focus-visible:ring-ring",
                            alignClass,
                          )}
                        />
                        <Button type="submit" disabled={sending || !reply.trim()}>
                          {sending ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <SendHorizontal />
                          )}
                          {sending ? t.sending : t.send}
                        </Button>
                      </form>
                    </div>
                  </>
                )}
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
