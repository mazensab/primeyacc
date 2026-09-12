"use client";

import * as React from "react";
import { Languages, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import Notifications from "@/components/layout/header/notifications";
import ThemeSwitch from "@/components/layout/header/theme-switch";
import UserMenu from "@/components/layout/header/user-menu";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

type HeaderLocale = "ar" | "en";
const LOCALE_KEY = "Mhamcloud-locale";
const LOCALE_EVENT = "Mhamcloud-locale-changed";

function readHeaderLocale(): HeaderLocale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem(LOCALE_KEY) === "en" ? "en" : "ar";
}

export function SiteHeader() {
  const { toggleSidebar, open } = useSidebar();
  const [locale, setLocale] = React.useState<HeaderLocale>("ar");

  React.useEffect(() => {
    const sync = () => setLocale(readHeaderLocale());
    sync();
    window.addEventListener(LOCALE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LOCALE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isArabic = locale === "ar";

  const toggleLocale = () => {
    const nextLocale: HeaderLocale = isArabic ? "en" : "ar";
    window.localStorage.setItem(LOCALE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
    document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
    setLocale(nextLocale);
    window.dispatchEvent(new Event(LOCALE_EVENT));
  };

  const utilityControls = (
    <div className="flex items-center gap-2">
      <Button onClick={toggleLocale} size="sm" variant="ghost" className="gap-1.5" aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}>
        <Languages className="size-4" />
        <span className="text-xs font-medium">{isArabic ? "EN" : "عربي"}</span>
      </Button>
      <ThemeSwitch />
      <Notifications />
      <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center" />
      <UserMenu />
    </div>
  );

  const sidebarToggle = (
    <Button onClick={toggleSidebar} size="icon" variant="ghost" aria-label={isArabic ? "إغلاق أو فتح القائمة الجانبية" : "Toggle sidebar"}>
      {open ? <PanelLeftClose /> : <PanelLeftOpen />}
    </Button>
  );

  return (
    <header className="bg-background/40 sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 border-b backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) md:rounded-tl-xl md:rounded-tr-xl">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2" dir={isArabic ? "rtl" : "ltr"}>
        {isArabic ? (
          <>
            {sidebarToggle}
            <div className="flex-1" />
            {utilityControls}
          </>
        ) : (
          <>
            {sidebarToggle}
            <div className="flex-1" />
            {utilityControls}
          </>
        )}
      </div>
    </header>
  );
}
