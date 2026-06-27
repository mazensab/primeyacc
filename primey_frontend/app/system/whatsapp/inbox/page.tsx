"use client";
/*
================================================================================
📂 primey_frontend/app/system/whatsapp/inbox/page.tsx
🟢 PrimeyAcc — System WhatsApp Inbox Chat Page
================================================================================
✅ Approved Premium pattern
✅ Real API only: /api/system/whatsapp/inbox/
✅ System WhatsApp conversations + messages + reply
✅ Supports LID/JID reply through backend Phase 3
✅ Arabic / English UI
✅ No fake data
================================================================================
*/
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Inbox,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Search,
  SendHorizontal,
  Settings2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
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
  pagination?: {
    page?: number;
    page_size?: number;
    total?: number;
    has_next?: boolean;
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
type StatusFilter = "" | "OPEN" | "CLOSED" | "ARCHIVED" | "SPAM";
const API_ROOT = "/api/system/whatsapp/inbox/";
const I18N = {
  ar: {
    badge: "System WhatsApp Inbox",
    title: "صندوق محادثات واتساب النظام",
    desc: "عرض المحادثات الواردة والرد عليها مباشرة من داخل PrimeyAcc.",
    back: "مركز واتساب",
    settings: "الإعدادات",
    templates: "القوالب",
    logs: "سجل الرسائل",
    refresh: "تحديث",
    search: "بحث",
    searchPlaceholder: "ابحث بالاسم أو الرقم أو آخر رسالة...",
    all: "الكل",
    open: "مفتوحة",
    closed: "مغلقة",
    archived: "مؤرشفة",
    spam: "مزعجة",
    conversations: "المحادثات",
    noConversations: "لا توجد محادثات بعد",
    noConversationsDesc: "ستظهر المحادثات تلقائيًا عند وصول أول رسالة إلى رقم النظام.",
    selectConversation: "اختر محادثة",
    selectConversationDesc: "اختر محادثة من القائمة لعرض الرسائل والرد.",
    messages: "الرسائل",
    contact: "جهة الاتصال",
    session: "الجلسة",
    jid: "JID",
    phone: "الرقم",
    unread: "غير مقروء",
    total: "الإجمالي",
    resolved: "المحلولة",
    pinned: "المثبتة",
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
    status: "الحالة",
    latest: "آخر نشاط",
  },
  en: {
    badge: "System WhatsApp Inbox",
    title: "System WhatsApp Inbox",
    desc: "Review inbound conversations and reply directly from PrimeyAcc.",
    back: "WhatsApp Center",
    settings: "Settings",
    templates: "Templates",
    logs: "Message Logs",
    refresh: "Refresh",
    search: "Search",
    searchPlaceholder: "Search by name, number, or latest message...",
    all: "All",
    open: "Open",
    closed: "Closed",
    archived: "Archived",
    spam: "Spam",
    conversations: "Conversations",
    noConversations: "No conversations yet",
    noConversationsDesc: "Inbound conversations will appear automatically once the first message arrives.",
    selectConversation: "Select a conversation",
    selectConversationDesc: "Choose a conversation from the list to view messages and reply.",
    messages: "Messages",
    contact: "Contact",
    session: "Session",
    jid: "JID",
    phone: "Phone",
    unread: "Unread",
    total: "Total",
    resolved: "Resolved",
    pinned: "Pinned",
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
    status: "Status",
    latest: "Latest activity",
  },
} as const;
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  const htmlLang = document.documentElement.lang || navigator.language || "ar";
  return htmlLang.toLowerCase().startsWith("en") ? "en" : "ar";
}
function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) return "";
  return parts.pop()?.split(";").shift() || "";
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
function messageText(message: InboxMessage, mediaFallback: string): string {
  const body = (message.body || "").trim();
  if (body) return body;
  const type = (message.message_type || "").trim();
  if (type && type !== "TEXT") return `[${type}]`;
  return mediaFallback;
}
function formatDate(value?: string | null, locale: Locale = "ar"): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
function directionLabel(direction: string | undefined, locale: Locale): string {
  return direction === "OUTBOUND" ? I18N[locale].outbound : I18N[locale].inbound;
}
function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Inbox;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card/95 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
export default function SystemWhatsAppInboxPage() {
  const [locale] = useState<Locale>(getInitialLocale);
  const t = I18N[locale];
  const isRtl = locale === "ar";
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [summary, setSummary] = useState<InboxSummary>({});
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState("");
  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) || null,
    [conversations, selectedId],
  );
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const query = new URLSearchParams();
      query.set("page_size", "100");
      if (search.trim()) query.set("search", search.trim());
      if (status) query.set("status", status);
      const payload = await apiFetch<InboxListPayload>(`${API_ROOT}?${query.toString()}`);
      const items = pickConversations(payload);
      setSummary(payload.summary || {});
      setConversations(items);
      setSelectedId((current) => current || items[0]?.id || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadError);
    } finally {
      setLoadingConversations(false);
    }
  }, [search, status, t.loadError]);
  const loadMessages = useCallback(
    async (conversationId: number) => {
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
        toast.error(error instanceof Error ? error.message : t.messagesLoadError);
      } finally {
        setLoadingMessages(false);
      }
    },
    [t.messagesLoadError],
  );
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
  }, [loadMessages, selectedId]);
  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput);
  }
  async function handleRefresh() {
    await loadConversations();
    if (selectedId) await loadMessages(selectedId);
  }
  async function handleReply(event: FormEvent<HTMLFormElement>) {
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
  const quickLinks = [
    { href: "/system/whatsapp", label: t.back, icon: MessageCircle },
    { href: "/system/whatsapp/settings", label: t.settings, icon: Settings2 },
    { href: "/system/whatsapp/templates", label: t.templates, icon: FileText },
    { href: "/system/whatsapp/messages", label: t.logs, icon: SendHorizontal },
  ];
  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[2rem] border border-border/70 bg-card/95 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Inbox className="h-4 w-4" />
                {t.badge}
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                {t.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                {t.desc}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                disabled={loadingConversations || loadingMessages}
              >
                <RefreshCcw
                  className={`h-4 w-4 ${loadingConversations || loadingMessages ? "animate-spin" : ""}`}
                />
                {t.refresh}
              </button>
            </div>
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label={t.total} value={summary.total_conversations || conversations.length || 0} icon={Inbox} />
          <SummaryCard label={t.unread} value={summary.unread_conversations || 0} icon={AlertCircle} />
          <SummaryCard label={t.resolved} value={summary.resolved_conversations || 0} icon={CheckCircle2} />
          <SummaryCard label={t.pinned} value={summary.pinned_conversations || 0} icon={Clock3} />
        </section>
        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-border/70 bg-card/95 p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">{t.conversations}</h2>
                <p className="text-xs text-muted-foreground">
                  {summary.total_conversations || conversations.length || 0} {t.total}
                </p>
              </div>
            </div>
            <form onSubmit={handleSearch} className="mb-4 flex flex-col gap-3">
              <div className="relative">
                <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${isRtl ? "right-3" : "left-3"}`} />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className={`h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary ${isRtl ? "pr-10" : "pl-10"}`}
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as StatusFilter)}
                  className="h-11 rounded-2xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
                >
                  <option value="">{t.all}</option>
                  <option value="OPEN">{t.open}</option>
                  <option value="CLOSED">{t.closed}</option>
                  <option value="ARCHIVED">{t.archived}</option>
                  <option value="SPAM">{t.spam}</option>
                </select>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  {t.search}
                </button>
              </div>
            </form>
            <div className="flex max-h-[640px] flex-col gap-3 overflow-y-auto pe-1">
              {loadingConversations ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-3xl border border-border/70 bg-muted/40"
                  />
                ))
              ) : conversations.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border p-6 text-center">
                  <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
                  <h3 className="mt-3 font-semibold">{t.noConversations}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t.noConversationsDesc}
                  </p>
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
                      className={`rounded-3xl border p-4 text-start transition ${
                        isActive
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/70 bg-background hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <p className="truncate text-sm font-bold">
                              {displayName(conversation)}
                            </p>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {displayPhone(conversation)}
                          </p>
                        </div>
                        {unread > 0 ? (
                          <span className="rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                            {unread}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {conversation.last_message_preview || t.media}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-1">
                          {statusLabel(conversation.status, locale)}
                        </span>
                        <span>{formatDate(conversation.last_message_at || conversation.updated_at, locale)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
          <section className="rounded-[2rem] border border-border/70 bg-card/95 shadow-sm">
            {!selectedConversation ? (
              <div className="flex min-h-[640px] flex-col items-center justify-center p-8 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-bold">{t.selectConversation}</h2>
                <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                  {t.selectConversationDesc}
                </p>
              </div>
            ) : (
              <div className="flex min-h-[640px] flex-col">
                <div className="border-b border-border/70 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{displayName(selectedConversation)}</h2>
                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>
                          <span className="font-semibold text-foreground">{t.phone}: </span>
                          {displayPhone(selectedConversation)}
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">{t.status}: </span>
                          {statusLabel(selectedConversation.status, locale)}
                        </p>
                        <p className="sm:col-span-2">
                          <span className="font-semibold text-foreground">{t.jid}: </span>
                          {displayJid(selectedConversation)}
                        </p>
                        <p className="sm:col-span-2">
                          <span className="font-semibold text-foreground">{t.latest}: </span>
                          {formatDate(selectedConversation.last_message_at, locale)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadMessages(selectedConversation.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
                    >
                      <RefreshCcw className={`h-4 w-4 ${loadingMessages ? "animate-spin" : ""}`} />
                      {t.refresh}
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {loadingMessages ? (
                    <div className="flex h-full min-h-[360px] items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                      <MessageCircle className="h-10 w-10 text-muted-foreground" />
                      <h3 className="mt-3 font-bold">{t.emptyMessages}</h3>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {messages.map((message) => {
                        const outbound = message.direction === "OUTBOUND";
                        return (
                          <div
                            key={message.id}
                            className={`flex ${outbound ? "justify-start" : "justify-end"}`}
                          >
                            <div
                              className={`max-w-[82%] rounded-3xl border px-4 py-3 shadow-sm ${
                                outbound
                                  ? "border-primary/20 bg-primary text-primary-foreground"
                                  : "border-border bg-background"
                              }`}
                            >
                              <div className="mb-2 flex items-center justify-between gap-4 text-[11px] opacity-80">
                                <span>{directionLabel(message.direction, locale)}</span>
                                <span>{message.status || "—"}</span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-7">
                                {messageText(message, t.media)}
                              </p>
                              <p className="mt-2 text-[11px] opacity-70">
                                {formatDate(message.sent_at || message.received_at || message.created_at, locale)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <form onSubmit={handleReply} className="border-t border-border/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder={t.messagePlaceholder}
                      rows={3}
                      className="min-h-24 flex-1 resize-none rounded-3xl border border-border bg-background px-4 py-3 text-sm leading-7 outline-none transition focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={sending || !reply.trim()}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t.sending}
                        </>
                      ) : (
                        <>
                          <SendHorizontal className="h-4 w-4" />
                          {t.send}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}