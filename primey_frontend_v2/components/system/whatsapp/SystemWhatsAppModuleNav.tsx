"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, ScrollText, Settings2, Shapes } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Locale = "ar" | "en";

const labels = {
  ar: {
    chats: "المحادثات",
    messages: "سجل الرسائل",
    templates: "القوالب",
    settings: "الإعدادات",
  },
  en: {
    chats: "Chats",
    messages: "Message logs",
    templates: "Templates",
    settings: "Settings",
  },
} as const;

function getLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("Mhamcloud-locale") === "en" ? "en" : "ar";
}

export default function SystemWhatsAppModuleNav() {
  const pathname = usePathname();
  const [locale, setLocale] = React.useState<Locale>("ar");

  React.useEffect(() => {
    const apply = () => setLocale(getLocale());
    apply();
    window.addEventListener("storage", apply);
    window.addEventListener("Mhamcloud-locale-changed", apply);
    return () => {
      window.removeEventListener("storage", apply);
      window.removeEventListener("Mhamcloud-locale-changed", apply);
    };
  }, []);

  const t = labels[locale];
  const items = [
    { href: "/system/whatsapp", label: t.chats, icon: MessageCircle, active: pathname === "/system/whatsapp" || pathname === "/system/whatsapp/inbox" },
    { href: "/system/whatsapp/messages", label: t.messages, icon: ScrollText, active: pathname === "/system/whatsapp/messages" },
    { href: "/system/whatsapp/templates", label: t.templates, icon: Shapes, active: pathname === "/system/whatsapp/templates" },
    { href: "/system/whatsapp/settings", label: t.settings, icon: Settings2, active: pathname === "/system/whatsapp/settings" },
  ];

  return (
    <nav
      className="flex flex-wrap items-center gap-2"
      dir={locale === "ar" ? "rtl" : "ltr"}
      aria-label={locale === "ar" ? "تنقل وحدة واتساب" : "WhatsApp module navigation"}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.href}
            asChild
            variant={item.active ? "default" : "outline"}
            className={cn(
              "h-9 rounded-lg px-3",
              item.active && "bg-black text-white hover:bg-black/90",
            )}
          >
            <Link href={item.href}>
              <Icon className="size-4" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
