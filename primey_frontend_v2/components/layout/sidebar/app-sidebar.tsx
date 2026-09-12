"use client";

import * as React from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useIsTablet } from "@/hooks/use-mobile";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { useThemeConfig } from "@/components/active-theme";
import { SidebarCollapsible, SidebarVariant } from "@/lib/themes";
import { NavMain } from "@/components/layout/sidebar/nav-main";
import Search from "@/components/layout/sidebar/search";
import { ScrollArea } from "@/components/ui/scroll-area";
import Logo from "@/components/layout/logo";

type AppLocale = "ar" | "en";
const KEY = "Mhamcloud-locale";
const EVENT = "Mhamcloud-locale-changed";

function readLocale(): AppLocale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem(KEY) === "en" ? "en" : "ar";
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [locale, setLocale] = React.useState<AppLocale>("ar");
  const pathname = usePathname();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const { theme } = useThemeConfig();
  const isTablet = useIsTablet();

  React.useEffect(() => {
    const sync = () => setLocale(readLocale());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isArabic = locale === "ar";

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, pathname, setOpenMobile]);

  const prevIsTablet = React.useRef(isTablet);
  useEffect(() => {
    if (prevIsTablet.current !== isTablet) {
      prevIsTablet.current = isTablet;
      setOpen(!isTablet);
    }
  }, [isTablet, setOpen]);

  return (
    <Sidebar
      side={isArabic ? "right" : "left"}
      dir={isArabic ? "rtl" : "ltr"}
      collapsible={theme.sidebarCollapsible as SidebarCollapsible}
      variant={theme.sidebarVariant as SidebarVariant}
      {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:text-foreground h-20 w-full group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:px-0!">
              <Link href="/system" aria-label="Mhamcloud" className="flex w-full items-center justify-center overflow-hidden">
                <div className="flex w-full items-center justify-center">
                  <Logo sidebarBrand />
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Search />
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full [&>[data-slot=scroll-area-viewport]]:scroll-fade">
          <NavMain type="system" />
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
