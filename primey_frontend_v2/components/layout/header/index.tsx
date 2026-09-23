"use client";

import * as React from "react";
import { Building2, Languages, MapPin, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import Notifications from "@/components/layout/header/notifications";
import ThemeSwitch from "@/components/layout/header/theme-switch";
import UserMenu from "@/components/layout/header/user-menu";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/components/providers/AuthProvider";

type HeaderLocale = "ar" | "en";
const LOCALE_KEY = "Mhamcloud-locale";
const LOCALE_EVENT = "Mhamcloud-locale-changed";

function readHeaderLocale(): HeaderLocale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem(LOCALE_KEY) === "en" ? "en" : "ar";
}

export function SiteHeader() {
  const { toggleSidebar, open } = useSidebar();
  const pathname = usePathname();
  const session = useAuth();
  const isCompanyArea = pathname === "/company" || pathname.startsWith("/company/");
  const companyRecord = session.current_company && typeof session.current_company === "object"
    ? session.current_company as Record<string, unknown>
    : session.company && typeof session.company === "object"
      ? session.company as Record<string, unknown>
      : {};
  const membershipRecord = session.current_membership && typeof session.current_membership === "object"
    ? session.current_membership as Record<string, unknown>
    : {};
  const branchCandidate = membershipRecord.last_active_branch || membershipRecord.default_branch || companyRecord.active_branch || companyRecord.default_branch;
  const branchRecord = branchCandidate && typeof branchCandidate === "object" ? branchCandidate as Record<string, unknown> : {};
  const companyNameRaw = companyRecord.name || companyRecord.display_name || companyRecord.trade_name;
  const branchName = String(branchRecord.name || branchRecord.display_name || membershipRecord.branch_name || companyRecord.branch_name || "");
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
  const companyName = String(companyNameRaw || (isArabic ? "الشركة" : "Company"));

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
            {isCompanyArea ? (
              <div className="hidden min-w-0 items-center gap-2 md:flex">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                  <Building2 className="size-4 text-[#a57b3d]" />
                </div>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <div className="max-w-[220px] truncate text-sm font-semibold">{companyName}</div>
                  <div className="flex max-w-[220px] items-center gap-1 text-[11px] text-muted-foreground">
                    {branchName ? <MapPin className="size-3 shrink-0 text-[#a57b3d]" /> : null}
                    <span className="truncate">{branchName || (isArabic ? "مساحة الشركة" : "Company workspace")}</span>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex-1" />
            {utilityControls}
          </>
        ) : (
          <>
            {sidebarToggle}
            {isCompanyArea ? (
              <div className="hidden min-w-0 items-center gap-2 md:flex">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                  <Building2 className="size-4 text-[#a57b3d]" />
                </div>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <div className="max-w-[220px] truncate text-sm font-semibold">{companyName}</div>
                  <div className="flex max-w-[220px] items-center gap-1 text-[11px] text-muted-foreground">
                    {branchName ? <MapPin className="size-3 shrink-0 text-[#a57b3d]" /> : null}
                    <span className="truncate">{branchName || (isArabic ? "مساحة الشركة" : "Company workspace")}</span>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex-1" />
            {utilityControls}
          </>
        )}
      </div>
    </header>
  );
}
