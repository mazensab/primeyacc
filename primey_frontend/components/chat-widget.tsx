"use client";
/* ============================================================
   📂 primey_frontend/components/chat-widget.tsx
   💬 PrimeyAcc — Landing Floating WhatsApp Chat Widget V2.0
   ------------------------------------------------------------
   ✅ Replaces Primey Care copy with PrimeyAcc / Mham Cloud
   ✅ Floating landing support widget
   ✅ Connects to system WhatsApp number via wa.me
   ✅ Uses sonner toast
   ✅ Arabic/English via primey-locale
   ✅ No backend mutation
   ✅ No fake external sending
   ✅ Keeps premium floating UI
============================================================ */
import * as React from "react";
import {
  ArrowUpRight,
  Bot,
  MessageCircle,
  PhoneCall,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
type AppLocale = "ar" | "en";
type QuickReply = {
  label: string;
  message: string;
};
type WidgetCopy = {
  assistantName: string;
  badge: string;
  title: string;
  subtitle: string;
  greeting: string;
  helper: string;
  inputPlaceholder: string;
  whatsapp: string;
  contact: string;
  close: string;
  open: string;
  emptyToast: string;
  openToast: string;
  quickTitle: string;
  defaultMessage: string;
  quickReplies: QuickReply[];
};
const SYSTEM_WHATSAPP_NUMBER = (
  process.env.NEXT_PUBLIC_SYSTEM_WHATSAPP_NUMBER ||
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
  "966505263775"
).replace(/\D/g, "");
const copy: Record<AppLocale, WidgetCopy> = {
  ar: {
    assistantName: "مساعد Mham Cloud",
    badge: "PrimeyAcc Support",
    title: "دعم PrimeyAcc",
    subtitle: "تواصل معنا عبر واتساب النظام",
    greeting:
      "مرحبًا 👋 يسعدنا مساعدتك في الاشتراك، الباقات، الدخول، أو أي استفسار عن نظام PrimeyAcc.",
    helper:
      "اكتب رسالتك أو اختر أحد الاختصارات، وسيتم فتح واتساب برسالة جاهزة لفريق الدعم.",
    inputPlaceholder: "اكتب استفسارك هنا...",
    whatsapp: "واتساب",
    contact: "تواصل معنا",
    close: "إغلاق",
    open: "فتح المحادثة",
    emptyToast: "سيتم فتح واتساب برسالة افتراضية لفريق PrimeyAcc.",
    openToast: "جاري فتح واتساب للتواصل مع فريق الدعم.",
    quickTitle: "اختصارات سريعة",
    defaultMessage:
      "مرحبًا فريق Mham Cloud، أحتاج مساعدة بخصوص PrimeyAcc.",
    quickReplies: [
      {
        label: "أريد الاشتراك",
        message:
          "مرحبًا فريق Mham Cloud، أريد الاشتراك في PrimeyAcc ومعرفة الباقات المناسبة.",
      },
      {
        label: "أحتاج دعم الدخول",
        message:
          "مرحبًا فريق Mham Cloud، أحتاج مساعدة في تسجيل الدخول إلى PrimeyAcc.",
      },
      {
        label: "أريد عرض الباقات",
        message:
          "مرحبًا فريق Mham Cloud، أريد معرفة باقات PrimeyAcc والأسعار.",
      },
      {
        label: "لدي استفسار تقني",
        message:
          "مرحبًا فريق Mham Cloud، لدي استفسار تقني بخصوص PrimeyAcc.",
      },
    ],
  },
  en: {
    assistantName: "Mham Cloud Assistant",
    badge: "PrimeyAcc Support",
    title: "PrimeyAcc Support",
    subtitle: "Chat with the system WhatsApp support line",
    greeting:
      "Hello 👋 We can help with subscriptions, plans, login, or any PrimeyAcc question.",
    helper:
      "Write your message or choose a shortcut. WhatsApp will open with a ready message for our support team.",
    inputPlaceholder: "Write your question here...",
    whatsapp: "WhatsApp",
    contact: "Contact us",
    close: "Close",
    open: "Open chat",
    emptyToast: "WhatsApp will open with a default PrimeyAcc support message.",
    openToast: "Opening WhatsApp to contact support.",
    quickTitle: "Quick shortcuts",
    defaultMessage:
      "Hello Mham Cloud team, I need help with PrimeyAcc.",
    quickReplies: [
      {
        label: "I want to subscribe",
        message:
          "Hello Mham Cloud team, I want to subscribe to PrimeyAcc and learn about the right plans.",
      },
      {
        label: "Login support",
        message:
          "Hello Mham Cloud team, I need help logging in to PrimeyAcc.",
      },
      {
        label: "Show plans",
        message:
          "Hello Mham Cloud team, I want to learn about PrimeyAcc plans and pricing.",
      },
      {
        label: "Technical question",
        message:
          "Hello Mham Cloud team, I have a technical question about PrimeyAcc.",
      },
    ],
  },
};
function normalizeLocale(value?: string | null): AppLocale {
  const normalized = (value || "").trim().toLowerCase();
  if (
    normalized === "ar" ||
    normalized.startsWith("ar-") ||
    normalized.startsWith("ar_")
  ) {
    return "ar";
  }
  return "en";
}
function readLocale(): AppLocale {
  if (typeof window === "undefined") return "ar";
  const savedLocale = window.localStorage.getItem("primey-locale");
  const cookieLocale =
    typeof document !== "undefined"
      ? document.cookie
          .split("; ")
          .find((item) => item.startsWith("lang="))
          ?.split("=")[1]
      : null;
  return normalizeLocale(savedLocale || cookieLocale || "ar");
}
function buildWhatsAppUrl(phoneNumber: string, message: string) {
  const safeNumber = phoneNumber.replace(/\D/g, "") || "966505263775";
  return `https://wa.me/${safeNumber}?text=${encodeURIComponent(message)}`;
}
export function ChatWidget() {
  const [open, setOpen] = React.useState(false);
  const [locale, setLocale] = React.useState<AppLocale>("ar");
  const [message, setMessage] = React.useState("");
  React.useEffect(() => {
    const syncLocale = () => setLocale(readLocale());
    syncLocale();
    window.addEventListener("primey-locale-changed", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("primey-locale-changed", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);
  const isArabic = locale === "ar";
  const t = copy[locale];
  const finalMessage = message.trim() || t.defaultMessage;
  const whatsappHref = buildWhatsAppUrl(SYSTEM_WHATSAPP_NUMBER, finalMessage);
  const handleOpenWhatsApp = () => {
    if (!message.trim()) {
      toast.info(t.emptyToast);
      return;
    }
    toast.success(t.openToast);
  };
  const handleQuickReply = (value: string) => {
    setMessage(value);
    toast.success(isArabic ? "تم تجهيز الرسالة." : "Message prepared.");
  };
  if (!open) {
    return (
      <div
        className={cn(
          "fixed bottom-5 left-5 z-50",
          "sm:bottom-6 sm:left-6"
        )}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <Button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.open}
          className={cn(
            "h-14 rounded-full px-5 shadow-2xl",
            "border border-white/30",
            "bg-slate-950 text-white hover:bg-slate-900",
            "gap-3"
          )}
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <MessageCircle className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
          </span>
          <span className="hidden text-sm font-semibold sm:inline">
            {t.title}
          </span>
        </Button>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "fixed bottom-5 left-5 z-50 w-[calc(100vw-2.5rem)]",
        "sm:bottom-6 sm:left-6 sm:w-[380px]"
      )}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <Card className="overflow-hidden rounded-[26px] border bg-background/95 shadow-2xl backdrop-blur-xl">
        <CardHeader className="border-b bg-muted/25 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border bg-slate-950 text-white">
                <AvatarFallback className="bg-slate-950 text-white">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className={cn("space-y-1", isArabic ? "text-right" : "text-left")}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {t.assistantName}
                  </h3>
                  <Badge variant="outline" className="rounded-full">
                    {t.badge}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t.subtitle}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label={t.close}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-5 py-5">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>{t.title}</span>
            </div>
            <p className="text-sm leading-7 text-foreground">{t.greeting}</p>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {t.helper}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              {t.quickTitle}
            </p>
            <div className="flex flex-wrap gap-2">
              {t.quickReplies.map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickReply(item.message)}
                  className="h-8 rounded-full px-3 text-xs"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t.inputPlaceholder}
              className={cn(
                "h-11 rounded-2xl",
                isArabic ? "text-right" : "text-left"
              )}
            />
            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-2xl"
              asChild
              onClick={handleOpenWhatsApp}
            >
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.whatsapp}
              >
                <Send className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-2 border-t bg-muted/15 px-5 py-4">
          <Button
            type="button"
            className="rounded-2xl"
            asChild
            onClick={handleOpenWhatsApp}
          >
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <PhoneCall className="h-4 w-4" />
              {t.whatsapp}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            asChild
          >
            <a href="/contact">
              <MessageCircle className="h-4 w-4" />
              {t.contact}
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
export default ChatWidget;