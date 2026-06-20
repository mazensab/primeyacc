"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/* =========================================================
   🌐 Types
========================================================= */
type AppLocale = "ar" | "en";

type ChatMessage = {
  role: "agent" | "user";
  content: string;
};

type QuickQuestion = {
  ar: string;
  en: string;
};

type ChatWidgetContent = {
  title: string;
  status: string;
  welcome: string;
  placeholder: string;
  send: string;
  openChat: string;
  closeChat: string;
  register: string;
  contact: string;
  whatsapp: string;
  email: string;
  copiedMessage: string;
  quickTitle: string;
  quickQuestions: QuickQuestion[];
};

/* =========================================================
   📝 Localized Content
========================================================= */
const content: Record<AppLocale, ChatWidgetContent> = {
  ar: {
    title: "مساعد Primey Care",
    status: "نساعدك في اختيار البطاقة أو البرنامج المناسب",
    welcome:
      "مرحبًا 👋 كيف أقدر أساعدك؟ يمكنك السؤال عن الاشتراك، المزايا، البرامج، أو الشبكة الطبية المشاركة.",
    placeholder: "اكتب استفسارك هنا...",
    send: "إرسال",
    openChat: "فتح الدعم",
    closeChat: "إغلاق الدعم",
    register: "اشترك الآن",
    contact: "تواصل معنا",
    whatsapp: "واتساب",
    email: "البريد",
    copiedMessage: "تم تسجيل استفسارك، يمكنك إرساله عبر قنوات التواصل.",
    quickTitle: "أسئلة سريعة",
    quickQuestions: [
      {
        ar: "ما هي مزايا البطاقة؟",
        en: "What are the card benefits?",
      },
      {
        ar: "هل Primey Care تأمين طبي؟",
        en: "Is Primey Care medical insurance?",
      },
      {
        ar: "كيف أعرف الشبكة الطبية؟",
        en: "How can I check the provider network?",
      },
    ],
  },
  en: {
    title: "Primey Care Assistant",
    status: "We help you choose the right card or program",
    welcome:
      "Hello 👋 How can I help you? You can ask about subscriptions, benefits, programs, or participating healthcare providers.",
    placeholder: "Type your inquiry here...",
    send: "Send",
    openChat: "Open support",
    closeChat: "Close support",
    register: "Join Now",
    contact: "Contact Us",
    whatsapp: "WhatsApp",
    email: "Email",
    copiedMessage:
      "Your inquiry has been noted. You can send it through our contact channels.",
    quickTitle: "Quick Questions",
    quickQuestions: [
      {
        ar: "ما هي مزايا البطاقة؟",
        en: "What are the card benefits?",
      },
      {
        ar: "هل Primey Care تأمين طبي؟",
        en: "Is Primey Care medical insurance?",
      },
      {
        ar: "كيف أعرف الشبكة الطبية؟",
        en: "How can I check the provider network?",
      },
    ],
  },
};

/* =========================================================
   🌐 Locale Helpers
========================================================= */
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

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=")[1] || "") : null;
}

function getCurrentLocale(): AppLocale {
  if (typeof window === "undefined") return "ar";

  const storageLocale = window.localStorage.getItem("primey-locale");
  const cookieLocale =
    getCookie("lang") || getCookie("locale") || getCookie("NEXT_LOCALE");

  return normalizeLocale(storageLocale || cookieLocale || "ar");
}

/* =========================================================
   🧩 Chat Widget
========================================================= */
export function ChatWidget() {
  const [locale, setLocale] = React.useState<AppLocale>("ar");
  const [isOpen, setIsOpen] = React.useState(false);
  const [input, setInput] = React.useState("");

  const isArabic = locale === "ar";
  const dir = isArabic ? "rtl" : "ltr";
  const t = content[locale];

  const ArrowIcon = isArabic ? ChevronLeft : ChevronRight;

  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "agent",
      content: content.ar.welcome,
    },
  ]);

  React.useEffect(() => {
    const updateLocale = () => {
      const nextLocale = getCurrentLocale();

      setLocale(nextLocale);
      setMessages((currentMessages) => {
        const hasOnlyWelcome =
          currentMessages.length === 1 && currentMessages[0]?.role === "agent";

        if (!hasOnlyWelcome) return currentMessages;

        return [
          {
            role: "agent",
            content: content[nextLocale].welcome,
          },
        ];
      });
    };

    updateLocale();

    window.addEventListener("primey-locale-changed", updateLocale);
    window.addEventListener("storage", updateLocale);

    return () => {
      window.removeEventListener("primey-locale-changed", updateLocale);
      window.removeEventListener("storage", updateLocale);
    };
  }, []);

  const inputLength = input.trim().length;

  function handleSendMessage(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const message = input.trim();

    if (!message) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        role: "user",
        content: message,
      },
      {
        role: "agent",
        content: isArabic
          ? "شكرًا لك. للحصول على رد أسرع، يمكنك إرسال استفسارك عبر واتساب أو صفحة التواصل، وسنساعدك في اختيار البطاقة أو البرنامج الأنسب."
          : "Thank you. For a faster response, you can send your inquiry through WhatsApp or the contact page, and we will help you choose the right card or program.",
      },
    ]);

    setInput("");
    toast.success(t.copiedMessage);
  }

  function handleQuickQuestion(question: QuickQuestion) {
    const selectedQuestion = isArabic ? question.ar : question.en;

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        role: "user",
        content: selectedQuestion,
      },
      {
        role: "agent",
        content: isArabic
          ? "Primey Care بطاقة وبرامج مزايا وخصومات طبية وليست تأمينًا طبيًا. تختلف المزايا حسب مقدم الخدمة والمدينة ونوع البرنامج، ويمكنك التواصل معنا لمعرفة التفاصيل المناسبة لك."
          : "Primey Care is a healthcare benefits and discount card, not medical insurance. Benefits may vary by provider, city, and program type. You can contact us to check the right details for you.",
      },
    ]);

    toast.success(t.copiedMessage);
  }

  return (
    <div
      dir={dir}
      className={cn(
        "fixed bottom-5 z-50",
        isArabic ? "left-5" : "right-5"
      )}
    >
      {isOpen ? (
        <Card className="w-[calc(100vw-2.5rem)] max-w-[380px] overflow-hidden border-primary/15 bg-background/95 shadow-2xl backdrop-blur-xl">
          <CardHeader className="border-b bg-muted/60 p-4">
            <div
              className={cn(
                "flex items-center justify-between gap-3",
                isArabic && "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-3",
                  isArabic && "flex-row-reverse text-right"
                )}
              >
                <Avatar className="size-10 border">
                  <AvatarImage src="/logo/primey-icon.ico" alt="Primey Care" />
                  <AvatarFallback>PC</AvatarFallback>
                </Avatar>

                <div>
                  <p className="text-sm font-bold leading-none">{t.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {t.status}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 rounded-xl"
                onClick={() => setIsOpen(false)}
                aria-label={t.closeChat}
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="max-h-[360px] space-y-4 overflow-y-auto p-4">
            <div
              className={cn(
                "rounded-2xl border bg-primary/5 p-3",
                isArabic && "text-right"
              )}
            >
              <div
                className={cn(
                  "mb-2 flex items-center gap-2 text-sm font-semibold",
                  isArabic && "flex-row-reverse"
                )}
              >
                <Sparkles className="size-4 text-primary" />
                <span>{t.quickTitle}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {t.quickQuestions.map((question) => (
                  <button
                    key={question.en}
                    type="button"
                    onClick={() => handleQuickQuestion(question)}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs transition hover:border-primary/50 hover:bg-primary/5"
                  >
                    {isArabic ? question.ar : question.en}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {messages.map((message, index) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={cn(
                      "flex",
                      isUser
                        ? isArabic
                          ? "justify-start"
                          : "justify-end"
                        : isArabic
                          ? "justify-end"
                          : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-6",
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                        isArabic && "text-right"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-t bg-background/80 p-4">
            <form
              onSubmit={handleSendMessage}
              className={cn(
                "flex w-full items-center gap-2",
                isArabic && "flex-row-reverse"
              )}
            >
              <Input
                id="primey-care-chat-message"
                placeholder={t.placeholder}
                className={cn("flex-1", isArabic && "text-right")}
                autoComplete="off"
                value={input}
                dir={dir}
                onChange={(event) => setInput(event.target.value)}
              />

              <Button
                type="submit"
                size="icon"
                disabled={inputLength === 0}
                aria-label={t.send}
              >
                <Send className="size-4" />
              </Button>
            </form>

            <div className="grid w-full grid-cols-3 gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href="/register">
                  {t.register}
                  <ArrowIcon className="size-3.5" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href="/contact">
                  <Mail className="size-3.5" />
                  {t.contact}
                </Link>
              </Button>

              <Button asChild size="sm" className="rounded-xl">
                <a
                  href="https://wa.me/966505263775"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Phone className="size-3.5" />
                  {t.whatsapp}
                </a>
              </Button>
            </div>
          </CardFooter>
        </Card>
      ) : (
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          className="h-14 rounded-full px-5 shadow-2xl"
          aria-label={t.openChat}
        >
          <MessageCircle className="size-5" />
          <span className="hidden sm:inline">{t.openChat}</span>
        </Button>
      )}
    </div>
  );
}