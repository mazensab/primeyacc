"use client";
/*
================================================================================
📂 primey_frontend/components/system/whatsapp/SystemWhatsAppInboxView.tsx
🟢 PrimeyAcc — System WhatsApp Inbox Premium View
================================================================================
✅ Approved Premium pattern
✅ Real API only: /api/system/whatsapp/inbox/
✅ Main /system/whatsapp page is Inbox, not dashboard quick-card page
✅ No "لوحة النظام / العودة إلى لوحة النظام الرئيسية" card
✅ System WhatsApp conversations + messages + reply
✅ Supports LID/JID reply through backend Phase 3
✅ Arabic-first with English support-ready labels
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
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
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
const TEXT = {
  badge: "التواصل والإشعارات",
  title: "صندوق محادثات واتساب النظام",
  desc: "متابعة المحادثات الواردة والرد عليها مباشرة من داخل PrimeyAcc باستخدام اتصال واتساب الرسمي للنظام.",
  settings: "إعدادات واتساب",
  templates: "قوالب واتساب",
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
  selectConversationDesc: "اختر محادثة من القائمة لعرض الرسائل والرد من داخل النظام.",
  contact: "جهة الاتصال",
  jid: "JID",
  phone: "الرقم",
  unread: "غير مقروء",
  total: "إجمالي المحادثات",
  resolved: "المحادثات المحلولة",
  pinned: "المحادثات المثبتة",
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
  status: "الحالة",
  latest: "آخر نشاط",
  connected: "اتصال واتساب متصل",
};
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
function messageText(message: InboxMessage): string {
  const body = (message.body || "").trim();
  if (body) return body;
  const type = (message.message_type || "").trim();
  if (type && type !== "TEXT") return `[${type}]`;
  return TEXT.media;
}
function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
function statusLabel(status?: string): string {
  const value = (status || "OPEN").toUpperCase();
  const labels: Record<string, string> = {
    OPEN: "مفتوحة",
    CLOSED: "مغلقة",
    ARCHIVED: "مؤرشفة",
    SPAM: "مزعجة",
  };
  return labels[value] || value;
}
function directionLabel(direction?: string): string {
  return direction === "OUTBOUND" ? TEXT.outbound : TEXT.inbound;
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
    <div className="rounded-[1.7rem] border border-border/70 bg-card/95 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-end">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
          <p className="mt-3 text-xs text-muted-foreground">من واجهات النظام الحقيقية</p>
        </div>
      </div>
    </div>
  );
}
function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Inbox;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.4rem] border border-border/70 bg-background/80 p-4 transition hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-sm font-bold">{label}</span>
      </div>
    </Link>
  );
}
export default function SystemWhatsAppInboxView() {
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
      toast.error(error instanceof Error ? error.message : TEXT.loadError);
    } finally {
      setLoadingConversations(false);
    }
  }, [search, status]);
  const loadMessages = useCallback(async (conversationId: number) => {
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
      toast.error(error instanceof Error ? error.message : TEXT.messagesLoadError);
    } finally {
      setLoadingMessages(false);
    }
  }, []);
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
      toast.error(TEXT.replyRequired);
      return;
    }
    setSending(true);
    try {
      const payload = await apiFetch<InboxReplyPayload>(`${API_ROOT}${selectedId}/reply/`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      if (!payload.success) {
        throw new Error(payload.message || TEXT.loadError);
      }
      setReply("");
      toast.success(TEXT.replySent);
      await loadMessages(selectedId);
      await loadConversations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : TEXT.loadError);
    } finally {
      setSending(false);
    }
  }
  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-6">
        <section className="rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                {TEXT.badge}
              </div>
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {TEXT.title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                {TEXT.desc}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/system/whatsapp/settings"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
              >
                <Settings2 className="h-4 w-4" />
                {TEXT.settings}
              </Link>
              <Link
                href="/system/whatsapp/templates"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
              >
                <FileText className="h-4 w-4" />
                {TEXT.templates}
              </Link>
              <Link
                href="/system/whatsapp/messages"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40 hover:text-primary"
              >
                <SendHorizontal className="h-4 w-4" />
                {TEXT.logs}
              </Link>
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                disabled={loadingConversations || loadingMessages}
              >
                <RefreshCcw
                  className={`h-4 w-4 ${loadingConversations || loadingMessages ? "animate-spin" : ""}`}
                />
                {TEXT.refresh}
              </button>
            </div>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label={TEXT.total}
            value={summary.total_conversations || conversations.length || 0}
            icon={Inbox}
          />
          <SummaryCard
            label={TEXT.unread}
            value={summary.unread_conversations || 0}
            icon={AlertCircle}
          />
          <SummaryCard
            label={TEXT.resolved}
            value={summary.resolved_conversations || 0}
            icon={CheckCircle2}
          />
          <SummaryCard
            label={TEXT.openCount}
            value={summary.open_conversations || 0}
            icon={Wifi}
          />
        </section>
        <section className="rounded-[2rem] border border-border/70 bg-card/95 p-5 shadow-sm lg:p-6">
          <div className="mb-5 flex flex-col gap-2 text-end">
            <h2 className="text-lg font-bold">صفحات واتساب النظام</h2>
            <p className="text-sm text-muted-foreground">
              التنقل السريع للصفحات المرتبطة بدون العودة إلى لوحة النظام الرئيسية.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <QuickLink href="/system/whatsapp/settings" label={TEXT.settings} icon={Settings2} />
            <QuickLink href="/system/whatsapp/templates" label={TEXT.templates} icon={FileText} />
            <QuickLink href="/system/whatsapp/messages" label={TEXT.logs} icon={SendHorizontal} />
          </div>
        </section>
        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-border/70 bg-card/95 p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="text-end">
                <h2 className="text-lg font-bold">{TEXT.conversations}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.total_conversations || conversations.length || 0} محادثة
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground">
                <Inbox className="h-5 w-5" />
              </span>
            </div>
            <form onSubmit={handleSearch} className="mb-5 flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={TEXT.searchPlaceholder}
                  className="h-12 w-full rounded-2xl border border-border bg-background px-4 pr-11 text-sm outline-none transition focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as StatusFilter)}
                  className="h-12 rounded-2xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
                >
                  <option value="">{TEXT.all}</option>
                  <option value="OPEN">{TEXT.open}</option>
                  <option value="CLOSED">{TEXT.closed}</option>
                  <option value="ARCHIVED">{TEXT.archived}</option>
                  <option value="SPAM">{TEXT.spam}</option>
                </select>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                >
                  {TEXT.search}
                </button>
              </div>
            </form>
            <div className="flex max-h-[680px] flex-col gap-3 overflow-y-auto pe-1">
              {loadingConversations ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-[1.7rem] border border-border/70 bg-muted/40"
                  />
                ))
              ) : conversations.length === 0 ? (
                <div className="rounded-[1.7rem] border border-dashed border-border p-7 text-center">
                  <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
                  <h3 className="mt-3 font-bold">{TEXT.noConversations}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {TEXT.noConversationsDesc}
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
                      className={`rounded-[1.7rem] border p-4 text-start transition ${
                        isActive
                          ? "border-primary/60 bg-muted"
                          : "border-border/70 bg-background hover:border-primary/30 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1 text-end">
                          <p className="truncate text-sm font-bold">{displayName(conversation)}</p>
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
                      <p className="mt-4 line-clamp-2 text-sm leading-7 text-muted-foreground">
                        {conversation.last_message_preview || TEXT.media}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-[11px] text-muted-foreground">
                        <span>{formatDate(conversation.last_message_at || conversation.updated_at)}</span>
                        <span className="rounded-full bg-muted px-2 py-1">
                          {statusLabel(conversation.status)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
          <section className="rounded-[2rem] border border-border/70 bg-card/95 shadow-sm">
            {!selectedConversation ? (
              <div className="flex min-h-[700px] flex-col items-center justify-center p-8 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-bold">{TEXT.selectConversation}</h2>
                <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                  {TEXT.selectConversationDesc}
                </p>
              </div>
            ) : (
              <div className="flex min-h-[700px] flex-col">
                <div className="border-b border-border/70 p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="text-end">
                      <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                        <Wifi className="h-3.5 w-3.5" />
                        {TEXT.connected}
                      </div>
                      <h2 className="mt-3 text-2xl font-bold">{displayName(selectedConversation)}</h2>
                      <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                        <p>
                          <span className="font-semibold text-foreground">{TEXT.phone}: </span>
                          {displayPhone(selectedConversation)}
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">{TEXT.status}: </span>
                          {statusLabel(selectedConversation.status)}
                        </p>
                        <p className="md:col-span-2">
                          <span className="font-semibold text-foreground">{TEXT.jid}: </span>
                          {displayJid(selectedConversation)}
                        </p>
                        <p className="md:col-span-2">
                          <span className="font-semibold text-foreground">{TEXT.latest}: </span>
                          {formatDate(selectedConversation.last_message_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadMessages(selectedConversation.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-bold transition hover:border-primary/40 hover:text-primary"
                    >
                      <RefreshCcw className={`h-4 w-4 ${loadingMessages ? "animate-spin" : ""}`} />
                      {TEXT.refresh}
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-muted/20 p-6">
                  {loadingMessages ? (
                    <div className="flex h-full min-h-[420px] items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
                      <MessageCircle className="h-10 w-10 text-muted-foreground" />
                      <h3 className="mt-3 font-bold">{TEXT.emptyMessages}</h3>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {messages.map((message) => {
                        const outbound = message.direction === "OUTBOUND";
                        return (
                          <div
                            key={message.id}
                            className={`flex ${outbound ? "justify-start" : "justify-end"}`}
                          >
                            <div
                              className={`max-w-[78%] rounded-[1.6rem] border px-4 py-3 shadow-sm ${
                                outbound
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background"
                              }`}
                            >
                              <div className="mb-2 flex items-center justify-between gap-5 text-[11px] opacity-80">
                                <span>{directionLabel(message.direction)}</span>
                                <span>{message.status || "—"}</span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-7">
                                {messageText(message)}
                              </p>
                              <p className="mt-3 text-[11px] opacity-70">
                                {formatDate(message.sent_at || message.received_at || message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <form onSubmit={handleReply} className="border-t border-border/70 bg-card p-5">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder={TEXT.messagePlaceholder}
                      rows={3}
                      className="min-h-24 flex-1 resize-none rounded-[1.5rem] border border-border bg-background px-4 py-3 text-sm leading-7 outline-none transition focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={sending || !reply.trim()}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {TEXT.sending}
                        </>
                      ) : (
                        <>
                          <SendHorizontal className="h-4 w-4" />
                          {TEXT.send}
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