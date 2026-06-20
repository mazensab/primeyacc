"use client"

// ======================================================
// 🏛 Primey Care — APP SIDEBAR
// Premium workspace sidebar
// RTL/LTR ready — keeps Primey Care navigation intact
// ======================================================

import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronsUpDown,
  Shield,
  ShoppingBagIcon,
  Sparkles,
  UserCircle2Icon,
} from "lucide-react"
import { usePathname } from "next/navigation"

import Logo from "@/components/layout/logo"
import { NavMain } from "@/components/layout/sidebar/nav-main"
import { NavUser } from "@/components/layout/sidebar/nav-user"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useIsTablet } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

/* ======================================================
   TYPES
====================================================== */

type AppLocale = "ar" | "en"

type WorkspaceType =
  | "system"
  | "company"
  | "center"
  | "provider"
  | "customer"
  | "agent"

type NormalizedWorkspace = "system" | "company" | "customer" | "agent"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  type: WorkspaceType
}

/* ======================================================
   LOCALE HELPERS
====================================================== */

function readStoredLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar"

    const savedLocale = window.localStorage.getItem("primey-locale")
    if (savedLocale === "en") return "en"
    if (savedLocale === "ar") return "ar"

    const htmlLang = document.documentElement.lang
    return htmlLang === "en" ? "en" : "ar"
  } catch (error) {
    console.error("Sidebar locale read error:", error)
    return "ar"
  }
}

function applyDocumentLocale(locale: AppLocale): void {
  try {
    if (typeof document === "undefined") return

    document.documentElement.lang = locale
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
    document.body.dir = locale === "ar" ? "rtl" : "ltr"
  } catch (error) {
    console.error("Sidebar locale apply error:", error)
  }
}

/* ======================================================
   WORKSPACE HELPERS
====================================================== */

function normalizeWorkspace(type: WorkspaceType): NormalizedWorkspace {
  if (type === "company" || type === "center" || type === "provider") {
    return "company"
  }

  if (type === "customer") return "customer"
  if (type === "agent") return "agent"

  return "system"
}

function getWorkspaceCopy(
  workspace: NormalizedWorkspace,
  isArabic: boolean,
): {
  workspaceLabel: string
  workspaceBadge: string
  firstItemTitle: string
  firstItemStatus: string
  secondItemTitle: string
  secondItemSubtitle: string
} {
  if (workspace === "system") {
    return {
      workspaceLabel: isArabic ? "مساحة عمل النظام" : "System Workspace",
      workspaceBadge: isArabic ? "Primey Care" : "Primey Care",
      firstItemTitle: isArabic ? "لوحة النظام" : "System Dashboard",
      firstItemStatus: isArabic ? "نشط" : "Active",
      secondItemTitle: isArabic ? "إدارة المنصة" : "Platform Management",
      secondItemSubtitle: isArabic ? "منطقة الإدارة" : "Admin Area",
    }
  }

  if (workspace === "company") {
    return {
      workspaceLabel: isArabic ? "مساحة الشركة" : "Company Workspace",
      workspaceBadge: isArabic ? "شبكة الخدمة" : "Service Network",
      firstItemTitle: isArabic ? "لوحة الشركة" : "Company Dashboard",
      firstItemStatus: isArabic ? "نشط" : "Active",
      secondItemTitle: isArabic ? "تشغيل الشركة" : "Company Operations",
      secondItemSubtitle: isArabic ? "المنطقة التشغيلية" : "Workspace Area",
    }
  }

  if (workspace === "customer") {
    return {
      workspaceLabel: isArabic ? "مساحة العميل" : "Customer Workspace",
      workspaceBadge: isArabic ? "بوابة العميل" : "Customer Portal",
      firstItemTitle: isArabic ? "لوحة العميل" : "Customer Dashboard",
      firstItemStatus: isArabic ? "نشط" : "Active",
      secondItemTitle: isArabic ? "خدماتي وطلباتي" : "My Services & Orders",
      secondItemSubtitle: isArabic ? "المساحة الشخصية" : "Personal Area",
    }
  }

  return {
    workspaceLabel: isArabic ? "مساحة المندوب" : "Agent Workspace",
    workspaceBadge: isArabic ? "تشغيل المندوب" : "Agent Operations",
    firstItemTitle: isArabic ? "لوحة المندوب" : "Agent Dashboard",
    firstItemStatus: isArabic ? "نشط" : "Active",
    secondItemTitle: isArabic ? "عملائي وعمولاتي" : "Customers & Commissions",
    secondItemSubtitle: isArabic ? "مساحة المندوب" : "Agent Area",
  }
}

function getWorkspaceIcons(workspace: NormalizedWorkspace) {
  if (workspace === "system") {
    return {
      first: Shield,
      second: ShoppingBagIcon,
    }
  }

  if (workspace === "company") {
    return {
      first: Building2,
      second: Briefcase,
    }
  }

  if (workspace === "customer") {
    return {
      first: UserCircle2Icon,
      second: ShoppingBagIcon,
    }
  }

  return {
    first: Briefcase,
    second: UserCircle2Icon,
  }
}

/* ======================================================
   COMPONENT
====================================================== */

export function AppSidebar({ type, className, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const { setOpen, setOpenMobile, isMobile, dir } = useSidebar()
  const isTablet = useIsTablet()

  const [locale, setLocale] = useState<AppLocale>("ar")
  const hasInitializedResponsiveState = useRef(false)

  const isArabic = locale === "ar"
  const workspace = normalizeWorkspace(type)

  const copy = useMemo(
    () => getWorkspaceCopy(workspace, isArabic),
    [workspace, isArabic],
  )

  const icons = useMemo(() => getWorkspaceIcons(workspace), [workspace])

  const FirstIcon = icons.first
  const SecondIcon = icons.second

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, setOpenMobile])

  useEffect(() => {
    if (!hasInitializedResponsiveState.current) {
      setOpen(!isTablet)
      hasInitializedResponsiveState.current = true
    }
  }, [isTablet, setOpen])

  useEffect(() => {
    const syncLocale = () => {
      const nextLocale = readStoredLocale()

      applyDocumentLocale(nextLocale)
      setLocale(nextLocale)
    }

    const syncLocaleAfterPaint = () => {
      syncLocale()

      window.setTimeout(() => {
        syncLocale()
      }, 0)
    }

    syncLocaleAfterPaint()

    window.addEventListener("primey-locale-changed", syncLocaleAfterPaint)
    window.addEventListener("storage", syncLocaleAfterPaint)

    return () => {
      window.removeEventListener("primey-locale-changed", syncLocaleAfterPaint)
      window.removeEventListener("storage", syncLocaleAfterPaint)
    }
  }, [])

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-none bg-transparent p-2",
        "[&_[data-sidebar=sidebar]]:border-none",
        "[&_[data-sidebar=sidebar]]:bg-transparent",
        "[&_[data-sidebar=sidebar]]:shadow-none",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden rounded-[1.65rem]",
          "border border-white/70 bg-white/78 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl",
          "dark:border-white/10 dark:bg-slate-950/72 dark:shadow-[0_18px_55px_rgba(0,0,0,0.30)]",
        )}
      >
        <SidebarHeader className="border-b border-slate-200/70 p-2 dark:border-white/10">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    className={cn(
                      "h-14 rounded-2xl px-3 transition",
                      "border border-transparent bg-gradient-to-b from-white/88 to-white/54 shadow-sm",
                      "hover:border-slate-200 hover:bg-white hover:text-foreground hover:shadow-md",
                      "dark:from-white/[0.08] dark:to-white/[0.03] dark:hover:border-white/10 dark:hover:bg-white/[0.08]",
                      "group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!w-12 group-data-[collapsible=icon]:!px-0",
                    )}
                    aria-label={copy.workspaceLabel}
                    title={copy.workspaceLabel}
                  >
                    <Logo />

                    <div
                      className={cn(
                        "min-w-0 flex-1 group-data-[collapsible=icon]:hidden",
                        isArabic ? "text-right" : "text-left",
                      )}
                    >
                      <p className="truncate text-xs font-semibold text-foreground">
                        {copy.workspaceLabel}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {copy.workspaceBadge}
                      </p>
                    </div>

                    <ChevronsUpDown className="ms-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className={cn(
                    "mt-3 w-[--radix-dropdown-menu-trigger-width] min-w-64 overflow-hidden rounded-2xl border-white/70 bg-background/95 p-2 shadow-[0_18px_55px_rgba(15,23,42,0.14)] backdrop-blur-xl",
                    "dark:border-white/10 dark:bg-slate-950/94 dark:shadow-[0_18px_55px_rgba(0,0,0,0.35)]",
                  )}
                  side={isMobile ? "bottom" : dir === "rtl" ? "left" : "right"}
                  align="end"
                  sideOffset={8}
                >
                  <div dir={isArabic ? "rtl" : "ltr"}>
                    <DropdownMenuLabel
                      className={cn(
                        "flex items-center gap-2 px-2 py-2",
                        isArabic ? "text-right" : "text-left",
                      )}
                    >
                      <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="size-4" />
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {copy.workspaceLabel}
                        </span>
                        <span className="block truncate text-xs font-normal text-muted-foreground">
                          {copy.workspaceBadge}
                        </span>
                      </span>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator className="my-2" />

                    <DropdownMenuItem className="flex cursor-default items-center gap-3 rounded-xl p-2 focus:bg-muted/70">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/78 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                        <FirstIcon className="size-4 text-muted-foreground" />
                      </div>

                      <div
                        className={cn(
                          "flex min-w-0 flex-1 flex-col",
                          isArabic ? "text-right" : "text-left",
                        )}
                      >
                        <span className="truncate text-sm font-medium">
                          {copy.firstItemTitle}
                        </span>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          {copy.firstItemStatus}
                        </span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="flex cursor-default items-center gap-3 rounded-xl p-2 focus:bg-muted/70">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/78 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                        <SecondIcon className="size-4 text-muted-foreground" />
                      </div>

                      <div
                        className={cn(
                          "flex min-w-0 flex-1 flex-col",
                          isArabic ? "text-right" : "text-left",
                        )}
                      >
                        <span className="truncate text-sm font-medium">
                          {copy.secondItemTitle}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {copy.secondItemSubtitle}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="min-h-0 flex-1 px-2 py-3">
          <ScrollArea className="h-full pe-1">
            <NavMain type={type} />
          </ScrollArea>
        </SidebarContent>

        <SidebarFooter className="border-t border-slate-200/70 p-2 dark:border-white/10">
          <NavUser />
        </SidebarFooter>
      </div>
    </Sidebar>
  )
}