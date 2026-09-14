"use client";

import * as React from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Download,
  FileText,
  Inbox,
  Loader2,
  MessageCircle,
  Mic,
  Paperclip,
  Pause,
  Play,
  RefreshCw,
  Reply,
  Search,
  SendHorizontal,
  Square,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { API_PATHS } from "@/lib/api/endpoints";
import { useAuth } from "@/components/providers/AuthProvider";
import { canManageSystemWhatsApp } from "@/lib/permissions";
import SystemWhatsAppModuleNav from "@/components/system/whatsapp/SystemWhatsAppModuleNav";
import SystemWhatsAppMediaLightbox, {
  type WhatsAppLightboxItem,
} from "@/components/system/whatsapp/SystemWhatsAppMediaLightbox";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

type Locale = "ar" | "en";
type StatusFilter = "all" | "OPEN" | "CLOSED" | "ARCHIVED" | "SPAM";

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

type InboxAttachment = {
  id: number;
  message_id?: number;
  attachment_type?: string;
  original_filename?: string;
  mime_type?: string;
  file_size?: number;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  provider_media_id?: string;
  sha256?: string;
  download_url?: string;
  metadata?: Record<string, unknown>;
  created_at?: string | null;
};

type InboxReplyReference = {
  id: number;
  direction?: "INBOUND" | "OUTBOUND" | string;
  message_type?: string;
  body?: string;
  external_message_id?: string;
  attachment?: {
    id?: number;
    attachment_type?: string;
    original_filename?: string;
    mime_type?: string;
  } | null;
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
  attachments?: InboxAttachment[];
  reply_to_message_id?: number | null;
  reply_to?: InboxReplyReference | null;
};

type InboxListPayload = {
  success?: boolean;
  message?: string;
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

const translations = {
  ar: {
    title: "محادثات واتساب",
    subtitle: "إدارة محادثات واتساب النظام والرد عليها مباشرة.",
    conversations: "المحادثات",
    searchPlaceholder: "ابحث بالاسم أو الرقم أو آخر رسالة...",
    noConversations: "لا توجد محادثات",
    noConversationsDesc: "ستظهر المحادثات هنا عند وصول أول رسالة إلى رقم النظام.",
    selectConversation: "اختر محادثة",
    selectConversationDesc: "اختر محادثة من القائمة لعرض الرسائل والرد عليها.",
    writeMessage: "اكتب رسالة...",
    send: "إرسال",
    sending: "جارٍ الإرسال...",
    refresh: "تحديث",
    all: "الكل",
    open: "مفتوحة",
    closed: "مغلقة",
    archived: "مؤرشفة",
    spam: "مزعجة",
    unread: "غير مقروء",
    loadError: "تعذر تحميل محادثات واتساب.",
    messagesLoadError: "تعذر تحميل رسائل المحادثة.",
    replyRequired: "اكتب رسالة أو أرفق ملفًا أولًا.",
    replySent: "تم إرسال الرسالة.",
    mediaTooLarge: "حجم الملف يتجاوز الحد المسموح 16MB.",
    mediaSelected: "تم اختيار المرفق.",
    removeAttachment: "إزالة المرفق",
    attachFile: "إرفاق صورة أو فيديو أو صوت أو مستند",
    startRecording: "بدء تسجيل رسالة صوتية",
    stopRecording: "إيقاف التسجيل",
    recording: "جارٍ التسجيل...",
    recorderUnavailable: "التسجيل الصوتي غير مدعوم في هذا المتصفح.",
    microphoneDenied: "تعذر الوصول إلى الميكروفون.",
    emptyMessages: "لا توجد رسائل في هذه المحادثة.",
    inbound: "وارد",
    outbound: "صادر",
    replyAction: "رد",
    replyingTo: "الرد على",
    cancelReply: "إلغاء الرد",
    quotedImage: "صورة",
    quotedAudio: "رسالة صوتية",
    quotedVideo: "فيديو",
    quotedDocument: "مستند",
    quotedSticker: "ملصق",
    quotedMessage: "رسالة",
    readOnly: "لديك صلاحية عرض المحادثات فقط. الرد يتطلب صلاحية إدارة واتساب النظام.",
  },
  en: {
    title: "WhatsApp Chats",
    subtitle: "Manage system WhatsApp conversations and reply directly.",
    conversations: "Chats",
    searchPlaceholder: "Search by name, phone, or latest message...",
    noConversations: "No conversations",
    noConversationsDesc: "Conversations will appear here when the first message arrives.",
    selectConversation: "Select a conversation",
    selectConversationDesc: "Choose a chat from the list to view messages and reply.",
    writeMessage: "Type a message...",
    send: "Send",
    sending: "Sending...",
    refresh: "Refresh",
    all: "All",
    open: "Open",
    closed: "Closed",
    archived: "Archived",
    spam: "Spam",
    unread: "Unread",
    loadError: "Unable to load WhatsApp conversations.",
    messagesLoadError: "Unable to load conversation messages.",
    replyRequired: "Write a message or attach a file first.",
    replySent: "Message sent.",
    mediaTooLarge: "The file exceeds the 16 MB limit.",
    mediaSelected: "Attachment selected.",
    removeAttachment: "Remove attachment",
    attachFile: "Attach image, video, audio, or document",
    startRecording: "Start voice recording",
    stopRecording: "Stop recording",
    recording: "Recording...",
    recorderUnavailable: "Voice recording is not supported in this browser.",
    microphoneDenied: "Unable to access the microphone.",
    emptyMessages: "No messages in this conversation.",
    inbound: "Inbound",
    outbound: "Outbound",
    replyAction: "Reply",
    replyingTo: "Replying to",
    cancelReply: "Cancel reply",
    quotedImage: "Image",
    quotedAudio: "Voice message",
    quotedVideo: "Video",
    quotedDocument: "Document",
    quotedSticker: "Sticker",
    quotedMessage: "Message",
    readOnly: "You have read-only access. Replying requires System WhatsApp management permission.",
  },
} as const;

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("Mhamcloud-locale") === "en" ? "en" : "ar";
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2
    ? decodeURIComponent(parts.pop()?.split(";").shift() || "")
    : "";
}

function apiBaseUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return raw.endsWith("/api") ? raw.slice(0, -4) : raw;
}

function makeApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

async function ensureCsrfToken(): Promise<string> {
  let token = getCookie("csrftoken");
  if (token) return token;

  await fetch(makeApiUrl("/api/auth/csrf/"), {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  }).catch(() => null);

  token = getCookie("csrftoken");
  return token;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...(options.body && !isFormData
      ? { "Content-Type": "application/json" }
      : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  if (method !== "GET" && method !== "HEAD") {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) headers["X-CSRFToken"] = csrfToken;
  }

  const response = await fetch(makeApiUrl(path), {
    ...options,
    method,
    headers,
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
  });

  const raw = await response.text();
  let payload:
    | (Record<string, unknown> & { message?: string; success?: boolean })
    | null = null;

  try {
    payload = raw
      ? (JSON.parse(raw) as Record<string, unknown> & {
          message?: string;
          success?: boolean;
        })
      : {};
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    const message =
      payload?.message ||
      (payload && typeof payload.detail === "string" ? payload.detail : "") ||
      (payload && typeof payload.error === "string" ? payload.error : "") ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
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
  return (
    payload.messages ||
    payload.results ||
    payload.data?.messages ||
    payload.data?.results ||
    []
  );
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
  return contact?.phone_number || contact?.normalized_phone || contact?.whatsapp_jid || "—";
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function formatDateTime(value?: string | null, locale: Locale = "ar"): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value?: string | null, locale: Locale = "ar"): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function conversationStatusLabel(status: string | undefined, locale: Locale) {
  const value = (status || "OPEN").toUpperCase();
  const labels = {
    ar: { OPEN: "مفتوحة", CLOSED: "مغلقة", ARCHIVED: "مؤرشفة", SPAM: "مزعجة" },
    en: { OPEN: "Open", CLOSED: "Closed", ARCHIVED: "Archived", SPAM: "Spam" },
  } as const;
  return labels[locale][value as keyof (typeof labels)[Locale]] || value;
}

function messageText(message: InboxMessage): string {
  const body = String(message.body || "").trim();
  if (body) return body;
  const type = String(message.message_type || "MEDIA").toUpperCase();
  return `[${type}]`;
}

function attachmentUrl(attachment: InboxAttachment): string {
  return makeApiUrl(String(attachment.download_url || ""));
}

function quotedPreview(
  reference: InboxReplyReference | InboxMessage | null | undefined,
  locale: Locale,
): string {
  if (!reference) return "";
  const type = String(reference.message_type || "TEXT").toUpperCase();
  const body = String(reference.body || "").trim();
  const synthetic = `[${type}]`;
  if (body && body !== synthetic) return body;

  const labels = translations[locale];
  if (type === "IMAGE") return labels.quotedImage;
  if (type === "AUDIO") return labels.quotedAudio;
  if (type === "VIDEO") return labels.quotedVideo;
  if (type === "DOCUMENT") {
    return ("attachment" in reference && reference.attachment?.original_filename) || labels.quotedDocument;
  }
  if (type === "STICKER") return labels.quotedSticker;
  return body || labels.quotedMessage;
}

function QuotedMessageBlock({
  reference,
  locale,
  outbound,
  compact = false,
}: {
  reference: InboxReplyReference;
  locale: Locale;
  outbound: boolean;
  compact?: boolean;
}) {
  const type = String(reference.message_type || "TEXT").toUpperCase();
  const attachmentName = reference.attachment?.original_filename || "";
  const mediaLabel =
    type === "IMAGE"
      ? translations[locale].quotedImage
      : type === "AUDIO"
        ? translations[locale].quotedAudio
        : type === "VIDEO"
          ? translations[locale].quotedVideo
          : type === "DOCUMENT"
            ? attachmentName || translations[locale].quotedDocument
            : type === "STICKER"
              ? translations[locale].quotedSticker
              : "";
  const preview = quotedPreview(reference, locale);

  return (
    <div
      className={cn(
        "mb-2 overflow-hidden rounded-lg border-s-2 px-2.5 py-1.5",
        outbound
          ? "border-background/60 bg-background/10"
          : "border-[#a57b3d] bg-muted/60",
        compact && "mb-0",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Reply className="size-3 shrink-0 opacity-70" />
        <span className="text-[10px] font-semibold opacity-70">
          {reference.direction === "OUTBOUND"
            ? translations[locale].outbound
            : translations[locale].inbound}
        </span>
      </div>
      <p className="mt-0.5 line-clamp-2 text-xs leading-5 opacity-80">
        {mediaLabel && preview === mediaLabel ? mediaLabel : preview}
      </p>
    </div>
  );
}

function formatFileSize(value?: number): string {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function visibleCaption(message: InboxMessage): string {
  const body = String(message.body || "").trim();
  const type = String(message.message_type || "").toUpperCase();
  if (!body || body === `[${type}]`) return "";
  return body;
}

function outboundMessageType(file: File): "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" {
  const mime = String(file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("audio/") || mime === "application/ogg") return "AUDIO";
  if (mime.startsWith("video/")) return "VIDEO";
  return "DOCUMENT";
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function WhatsAppAudio({
  attachment,
  outbound,
}: {
  attachment: InboxAttachment;
  outbound: boolean;
}) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(
    Number(attachment.duration_ms || 0) / 1000,
  );

  const bars = React.useMemo(() => {
    let seed = attachment.id || 7;
    return Array.from({ length: 28 }, () => {
      seed = (seed * 9301 + 49297) % 233280;
      return 0.25 + (seed / 233280) * 0.75;
    });
  }, [attachment.id]);

  return (
    <div className="flex min-w-[260px] items-center gap-3 p-3">
      <audio
        ref={audioRef}
        src={attachmentUrl(attachment)}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
          setProgress(0);
        }}
        onDurationChange={(event) => {
          setDuration(event.currentTarget.duration || duration);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          setCurrentTime(audio.currentTime);
          setProgress(audio.currentTime / (audio.duration || 1));
        }}
      />

      <Button
        type="button"
        size="icon"
        variant={outbound ? "secondary" : "outline"}
        className="size-9 rounded-full"
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (audio.paused) {
            void audio.play();
          } else {
            audio.pause();
          }
        }}
      >
        {playing ? (
          <Pause className="size-4 fill-current" />
        ) : (
          <Play className="size-4 fill-current" />
        )}
      </Button>

      <div
        className="flex h-8 flex-1 cursor-pointer items-center gap-0.5"
        onClick={(event) => {
          const audio = audioRef.current;
          if (!audio || !Number.isFinite(audio.duration)) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / rect.width;
          audio.currentTime = ratio * audio.duration;
        }}
      >
        {bars.map((height, index) => (
          <span
            key={index}
            style={{ height: `${Math.round(height * 100)}%` }}
            className={cn(
              "min-w-0 flex-1 rounded-full",
              index / bars.length < progress
                ? "bg-current"
                : "bg-current/25",
            )}
          />
        ))}
      </div>

      <span className="min-w-9 shrink-0 text-end text-xs tabular-nums opacity-70">
        {formatAudioTime(currentTime || duration || 0)}
      </span>
    </div>
  );
}

function WhatsAppMessageContent({
  message,
  outbound,
  onOpenMedia,
  locale,
}: {
  message: InboxMessage;
  outbound: boolean;
  onOpenMedia: (items: WhatsAppLightboxItem[], index?: number) => void;
  locale: Locale;
}) {
  const attachments = message.attachments || [];
  const caption = visibleCaption(message);

  if (!attachments.length) {
    return (
      <div>
        {message.reply_to ? (
          <QuotedMessageBlock
            reference={message.reply_to}
            locale={locale}
            outbound={outbound}
          />
        ) : null}
        <p className="whitespace-pre-wrap break-words">
          {messageText(message)}
        </p>
      </div>
    );
  }

  const imageAttachments = attachments.filter((attachment) =>
    ["IMAGE", "STICKER"].includes(
      String(attachment.attachment_type || "").toUpperCase(),
    ),
  );
  const videoAttachments = attachments.filter(
    (attachment) =>
      String(attachment.attachment_type || "").toUpperCase() === "VIDEO",
  );
  const audioAttachments = attachments.filter(
    (attachment) =>
      String(attachment.attachment_type || "").toUpperCase() === "AUDIO",
  );
  const documentAttachments = attachments.filter(
    (attachment) =>
      String(attachment.attachment_type || "").toUpperCase() === "DOCUMENT",
  );

  const lightboxImages: WhatsAppLightboxItem[] = imageAttachments.map(
    (attachment) => ({
      type: "image",
      src: attachmentUrl(attachment),
      label: attachment.original_filename,
    }),
  );

  return (
    <div className="flex flex-col gap-2">
      {message.reply_to ? (
        <QuotedMessageBlock
          reference={message.reply_to}
          locale={locale}
          outbound={outbound}
        />
      ) : null}
      {imageAttachments.length ? (
        <div
          className={cn(
            "grid gap-1.5",
            imageAttachments.length > 1 ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {imageAttachments.slice(0, 4).map((attachment, index) => {
            const isSticker =
              String(attachment.attachment_type || "").toUpperCase() ===
              "STICKER";

            return (
              <button
                key={attachment.id}
                type="button"
                className={cn(
                  "relative overflow-hidden transition hover:opacity-90",
                  isSticker ? "bg-transparent" : "rounded-xl",
                )}
                onClick={() => onOpenMedia(lightboxImages, index)}
              >
                <img
                  src={attachmentUrl(attachment)}
                  alt={attachment.original_filename || ""}
                  className={cn(
                    "object-contain",
                    isSticker
                      ? "h-40 w-40"
                      : "aspect-4/3 w-64 object-cover",
                  )}
                />
                {imageAttachments.length > 4 && index === 3 ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xl font-semibold text-white">
                    +{imageAttachments.length - 4}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {videoAttachments.map((attachment) => (
        <button
          key={attachment.id}
          type="button"
          className="relative overflow-hidden rounded-xl bg-black"
          onClick={() =>
            onOpenMedia([
              {
                type: "video",
                src: attachmentUrl(attachment),
                label: attachment.original_filename,
              },
            ])
          }
        >
          <video
            src={attachmentUrl(attachment)}
            preload="metadata"
            muted
            playsInline
            className="w-64 max-w-full"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-black/55 text-white">
              <Play className="size-5 fill-current" />
            </span>
          </span>
        </button>
      ))}

      {audioAttachments.map((attachment) => (
        <WhatsAppAudio
          key={attachment.id}
          attachment={attachment}
          outbound={outbound}
        />
      ))}

      {documentAttachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex min-w-[260px] items-center gap-3 rounded-xl border border-current/15 p-3"
        >
          <FileText
            className="size-8 shrink-0 opacity-60"
            strokeWidth={1.5}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {attachment.original_filename || "Document"}
            </p>
            <p className="text-xs opacity-60">
              {formatFileSize(attachment.file_size)}
              {attachment.mime_type
                ? ` · ${attachment.mime_type}`
                : ""}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant={outbound ? "secondary" : "outline"}
            asChild
          >
            <a
              href={attachmentUrl(attachment)}
              download={attachment.original_filename || undefined}
              aria-label="Download"
            >
              <Download className="size-4" />
            </a>
          </Button>
        </div>
      ))}

      {caption ? (
        <p className="whitespace-pre-wrap break-words px-1">
          {caption}
        </p>
      ) : null}
    </div>
  );
}

function MessageStatusIcon({ status }: { status?: string }) {
  const value = String(status || "").toUpperCase();
  if (["READ", "DELIVERED"].includes(value)) {
    return <CheckCheck className="size-3.5 text-emerald-500" />;
  }
  if (["SENT", "QUEUED", "PENDING"].includes(value)) {
    return <Check className="size-3.5 text-muted-foreground" />;
  }
  return null;
}

function AvatarFallback({ name }: { name: string }) {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-foreground">
      {initials(name)}
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div className="grid h-[calc(100dvh-9rem)] min-h-[620px] grid-cols-1 overflow-hidden rounded-xl border bg-card lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4 border-e p-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 py-3">
            <Skeleton className="size-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden items-center justify-center lg:flex">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

export default function SystemWhatsAppInboxView() {
  const session = useAuth();
  const canManage = canManageSystemWhatsApp(session);
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [conversations, setConversations] = React.useState<InboxConversation[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [messages, setMessages] = React.useState<InboxMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = React.useState(true);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [reply, setReply] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<InboxMessage | null>(null);
  const [selectedMedia, setSelectedMedia] = React.useState<File | null>(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [lightbox, setLightbox] = React.useState<{
    items: WhatsAppLightboxItem[];
    index: number;
  } | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const mediaChunksRef = React.useRef<Blob[]>([]);
  const recordingTimerRef = React.useRef<number | null>(null);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  React.useEffect(() => {
    const applyLocale = () => setLocale(getInitialLocale());
    applyLocale();
    window.addEventListener("storage", applyLocale);
    window.addEventListener("Mhamcloud-locale-changed", applyLocale);
    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("Mhamcloud-locale-changed", applyLocale);
    };
  }, []);

  const selectedConversation = React.useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId],
  );

  const filteredConversations = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations
      .filter((conversation) => status === "all" || String(conversation.status || "OPEN").toUpperCase() === status)
      .filter((conversation) => {
        if (!query) return true;
        return [
          displayName(conversation),
          displayPhone(conversation),
          conversation.last_message_preview || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
  }, [conversations, search, status]);

  const loadConversations = React.useCallback(async () => {
    setLoadingConversations(true);
    try {
      const params = new URLSearchParams({ page_size: "100" });
      const payload = await apiFetch<InboxListPayload>(
        `${API_PATHS.systemWhatsApp.inbox}?${params.toString()}`,
      );
      const items = pickConversations(payload);
      setConversations(items);
      setSelectedId((current) => {
        if (current && items.some((item) => item.id === current)) return current;
        return null;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadError);
    } finally {
      setLoadingConversations(false);
    }
  }, [t.loadError]);

  const loadMessages = React.useCallback(async (conversationId: number) => {
    setLoadingMessages(true);
    try {
      const payload = await apiFetch<InboxMessagesPayload>(
        API_PATHS.systemWhatsApp.inboxMessages(conversationId),
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
      setMessages([]);
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
      setReplyTo(null);
      return;
    }
    setReplyTo(null);
    void loadMessages(selectedId);
  }, [loadMessages, selectedId]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loadingMessages]);

  React.useEffect(() => {
    return () => {
      if (selectedMediaUrl) URL.revokeObjectURL(selectedMediaUrl);
    };
  }, [selectedMediaUrl]);

  React.useEffect(() => {
    return () => {
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current);
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function clearSelectedMedia() {
    setSelectedMedia(null);
    setSelectedMediaUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function selectMedia(file: File | null) {
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error(t.mediaTooLarge);
      return;
    }

    clearSelectedMedia();
    setSelectedMedia(file);

    const type = outboundMessageType(file);
    if (["IMAGE", "AUDIO", "VIDEO"].includes(type)) {
      setSelectedMediaUrl(URL.createObjectURL(file));
    }
  }

  async function startVoiceRecording() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      toast.error(t.recorderUnavailable);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredTypes = [
        "audio/ogg;codecs=opus",
        "audio/webm;codecs=opus",
        "audio/webm",
      ];
      const mimeType =
        preferredTypes.find((value) => MediaRecorder.isTypeSupported(value)) ||
        "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      mediaChunksRef.current = [];
      setRecordingSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) mediaChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const actualType =
          recorder.mimeType ||
          mediaChunksRef.current[0]?.type ||
          "audio/webm";
        const blob = new Blob(mediaChunksRef.current, { type: actualType });
        const extension = actualType.includes("ogg") ? "ogg" : "webm";
        const file = new File(
          [blob],
          `primey-voice-${Date.now()}.${extension}`,
          { type: actualType },
        );

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        mediaChunksRef.current = [];

        if (recordingTimerRef.current !== null) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        setRecording(false);
        selectMedia(file);
      };

      recorder.start(250);
      setRecording(true);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((value) => value + 1);
      }, 1000);
    } catch {
      toast.error(t.microphoneDenied);
    }
  }

  function stopVoiceRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  async function handleReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !canManage) return;

    const body = reply.trim();
    if (!body && !selectedMedia) {
      toast.error(t.replyRequired);
      return;
    }

    setSending(true);
    try {
      const requestBody: BodyInit = selectedMedia
        ? (() => {
            const form = new FormData();
            form.append("media", selectedMedia);
            form.append("message_type", outboundMessageType(selectedMedia));
            if (body) form.append("body", body);
            if (replyTo) form.append("reply_to_message_id", String(replyTo.id));
            return form;
          })()
        : JSON.stringify({
            body,
            ...(replyTo ? { reply_to_message_id: replyTo.id } : {}),
          });

      const payload = await apiFetch<InboxReplyPayload>(
        API_PATHS.systemWhatsApp.inboxReply(selectedId),
        {
          method: "POST",
          body: requestBody,
        },
      );

      if (payload.success === false) {
        throw new Error(payload.message || t.loadError);
      }

      setReply("");
      setReplyTo(null);
      clearSelectedMedia();
      toast.success(t.replySent);
      await Promise.all([loadMessages(selectedId), loadConversations()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadError);
    } finally {
      setSending(false);
    }
  }

  if (loadingConversations && conversations.length === 0) {
    return <InboxSkeleton />;
  }

  return (
    <div className="space-y-4 lg:space-y-6" dir={dir}>
      <SystemWhatsAppModuleNav />

      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{t.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => void loadConversations()}
          disabled={loadingConversations}
        >
          {loadingConversations ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {t.refresh}
        </Button>
      </header>

      <Card className="h-[calc(100dvh-11.5rem)] min-h-[640px] overflow-hidden rounded-xl p-0 shadow-none">
        <div className="flex h-full min-h-0 flex-col lg:flex-row">
          <aside
            className={cn(
              "min-h-0 w-full flex-col border-border/70 lg:w-[360px] lg:shrink-0 lg:border-e",
              selectedConversation ? "hidden lg:flex" : "flex",
            )}
          >
            <div className="shrink-0 border-b border-border/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{t.conversations}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {filteredConversations.length}
                  </p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                  <MessageCircle className="size-4 text-[#a57b3d]" />
                </div>
              </div>

              <div className="relative">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="h-10 ps-9"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", t.all],
                    ["OPEN", t.open],
                    ["CLOSED", t.closed],
                    ["ARCHIVED", t.archived],
                    ["SPAM", t.spam],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={status === value ? "default" : "outline"}
                    className="h-8 rounded-full px-3 text-xs"
                    onClick={() => setStatus(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              {loadingConversations ? (
                <div className="space-y-1 p-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-lg p-3">
                      <Skeleton className="size-11 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length ? (
                <div className="divide-y divide-border/60">
                  {filteredConversations.map((conversation) => {
                    const active = conversation.id === selectedId;
                    const name = displayName(conversation);
                    const unread = Number(conversation.unread_count || 0);

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => setSelectedId(conversation.id)}
                        className={cn(
                          "group flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted/60",
                          active && "bg-muted",
                        )}
                      >
                        <AvatarFallback name={name} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold">{name}</span>
                            <time className="shrink-0 text-[11px] text-muted-foreground">
                              {formatDateTime(
                                conversation.last_message_at || conversation.updated_at,
                                locale,
                              )}
                            </time>
                          </div>

                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                              {conversation.last_message_preview || displayPhone(conversation)}
                            </span>
                            {unread > 0 ? (
                              <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white">
                                {unread}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-72 flex-col items-center justify-center px-8 text-center">
                  <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
                    <Inbox className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{t.noConversations}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t.noConversationsDesc}
                  </p>
                </div>
              )}
            </ScrollArea>
          </aside>

          <section
            className={cn(
              "min-h-0 min-w-0 flex-1 flex-col bg-background",
              selectedConversation ? "flex" : "hidden lg:flex",
            )}
          >
            {!selectedConversation ? (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                  <MessageCircle className="size-5 text-[#a57b3d]" />
                </div>
                <h3 className="text-base font-semibold">{t.selectConversation}</h3>
                <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                  {t.selectConversationDesc}
                </p>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-4 py-3 lg:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 lg:hidden"
                      onClick={() => setSelectedId(null)}
                    >
                      <ArrowLeft className="size-4 rtl:rotate-180" />
                    </Button>

                    <AvatarFallback name={displayName(selectedConversation)} />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {displayName(selectedConversation)}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{displayPhone(selectedConversation)}</span>
                        <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-normal">
                          {conversationStatusLabel(selectedConversation.status, locale)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => void loadMessages(selectedConversation.id)}
                    disabled={loadingMessages}
                  >
                    {loadingMessages ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                  </Button>
                </div>

                <ScrollArea className="min-h-0 flex-1 bg-muted/20">
                  <div className="flex min-h-full flex-col justify-end px-4 py-5 lg:px-6">
                    {loadingMessages ? (
                      <div className="flex min-h-[360px] items-center justify-center">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length ? (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const outbound = message.direction === "OUTBOUND";
                          const timestamp =
                            message.sent_at || message.received_at || message.created_at;

                          return (
                            <div
                              key={message.id}
                              className={cn(
                                "group/message flex w-full items-center gap-1.5",
                                outbound ? "justify-end" : "justify-start",
                              )}
                            >
                              {outbound && canManage ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 shrink-0 rounded-full opacity-0 transition-opacity group-hover/message:opacity-100 focus-visible:opacity-100"
                                  onClick={() => setReplyTo(message)}
                                  aria-label={t.replyAction}
                                  title={t.replyAction}
                                >
                                  <Reply className="size-3.5" />
                                </Button>
                              ) : null}

                              <div className="max-w-[85%] sm:max-w-[72%]">
                                <div
                                  className={cn(
                                    "rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm",
                                    outbound
                                      ? "rounded-ee-md bg-foreground text-background"
                                      : "rounded-es-md border bg-card text-card-foreground",
                                  )}
                                >
                                  <WhatsAppMessageContent
                                    message={message}
                                    outbound={outbound}
                                    locale={locale}
                                    onOpenMedia={(items, index = 0) =>
                                      setLightbox({ items, index })
                                    }
                                  />
                                </div>
                                <div
                                  className={cn(
                                    "mt-1 flex items-center gap-1 text-[10px] text-muted-foreground",
                                    outbound ? "justify-end" : "justify-start",
                                  )}
                                >
                                  <time>{formatTime(timestamp, locale)}</time>
                                  {outbound ? <MessageStatusIcon status={message.status} /> : null}
                                </div>
                              </div>

                              {!outbound && canManage ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 shrink-0 rounded-full opacity-0 transition-opacity group-hover/message:opacity-100 focus-visible:opacity-100"
                                  onClick={() => setReplyTo(message)}
                                  aria-label={t.replyAction}
                                  title={t.replyAction}
                                >
                                  <Reply className="size-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    ) : (
                      <div className="flex min-h-[360px] items-center justify-center text-center">
                        <div>
                          <MessageCircle className="mx-auto size-6 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t.emptyMessages}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="shrink-0 border-t border-border/70 bg-background p-3 lg:p-4">
                  {canManage ? (
                    <form onSubmit={handleReply} className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                        onChange={(event) =>
                          selectMedia(event.target.files?.[0] || null)
                        }
                      />

                      {replyTo ? (
                        <div className="flex items-center gap-3 rounded-xl border border-[#a57b3d]/25 bg-[#a57b3d]/5 p-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#a57b3d]">
                              <Reply className="size-3.5" />
                              <span>{t.replyingTo}</span>
                            </div>
                            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {quotedPreview(replyTo, locale)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8 shrink-0 rounded-full"
                            onClick={() => setReplyTo(null)}
                            disabled={sending}
                            aria-label={t.cancelReply}
                            title={t.cancelReply}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ) : null}

                      {selectedMedia ? (
                        <div className="flex items-center gap-3 rounded-xl border bg-muted/25 p-2.5">
                          {outboundMessageType(selectedMedia) === "IMAGE" &&
                          selectedMediaUrl ? (
                            <img
                              src={selectedMediaUrl}
                              alt={selectedMedia.name}
                              className="size-16 rounded-lg object-cover"
                            />
                          ) : outboundMessageType(selectedMedia) === "VIDEO" &&
                            selectedMediaUrl ? (
                            <video
                              src={selectedMediaUrl}
                              className="size-16 rounded-lg bg-black object-cover"
                              muted
                              playsInline
                            />
                          ) : outboundMessageType(selectedMedia) === "AUDIO" &&
                            selectedMediaUrl ? (
                            <audio
                              src={selectedMediaUrl}
                              controls
                              className="h-10 min-w-0 flex-1"
                            />
                          ) : (
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-background">
                              <FileText className="size-5 text-[#a57b3d]" />
                            </div>
                          )}

                          {outboundMessageType(selectedMedia) !== "AUDIO" ? (
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {selectedMedia.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {outboundMessageType(selectedMedia)} /{" "}
                                {formatFileSize(selectedMedia.size)}
                              </p>
                            </div>
                          ) : null}

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-9 shrink-0 rounded-full"
                            onClick={clearSelectedMedia}
                            disabled={sending}
                            aria-label={t.removeAttachment}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ) : null}

                      <div className="flex items-end gap-2 rounded-2xl border bg-background p-1.5 shadow-sm">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-10 shrink-0 rounded-full"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={sending || recording}
                          aria-label={t.attachFile}
                          title={t.attachFile}
                        >
                          <Paperclip className="size-4" />
                        </Button>

                        <textarea
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.shiftKey &&
                              !recording
                            ) {
                              event.preventDefault();
                              event.currentTarget.form?.requestSubmit();
                            }
                          }}
                          placeholder={
                            recording
                              ? `${t.recording} ${formatAudioTime(
                                  recordingSeconds,
                                )}`
                              : t.writeMessage
                          }
                          rows={1}
                          disabled={recording}
                          className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none"
                        />

                        <Button
                          type="button"
                          size="icon"
                          variant={recording ? "default" : "ghost"}
                          className="size-10 shrink-0 rounded-full"
                          onClick={() =>
                            recording
                              ? stopVoiceRecording()
                              : void startVoiceRecording()
                          }
                          disabled={sending || Boolean(selectedMedia)}
                          aria-label={
                            recording ? t.stopRecording : t.startRecording
                          }
                          title={
                            recording ? t.stopRecording : t.startRecording
                          }
                        >
                          {recording ? (
                            <Square className="size-3.5 fill-current" />
                          ) : (
                            <Mic className="size-4" />
                          )}
                        </Button>

                        <Button
                          type="submit"
                          size="icon"
                          className="size-10 shrink-0 rounded-full"
                          disabled={
                            sending ||
                            recording ||
                            (!reply.trim() && !selectedMedia)
                          }
                          aria-label={sending ? t.sending : t.send}
                        >
                          {sending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <SendHorizontal className="size-4 rtl:rotate-180" />
                          )}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="rounded-xl border bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
                      {t.readOnly}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </Card>

      {lightbox ? (
        <SystemWhatsAppMediaLightbox
          items={lightbox.items}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}
