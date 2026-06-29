"use client"

// ======================================================
// 🏛 Mhamcloud — SITE HEADER
// Premium rounded header for DashboardFrame shell
// RTL/LTR ready — keeps Mhamcloud actions intact
// ======================================================

import { useEffect, useMemo, useState } from "react"
import { Globe, PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { ActiveThemeProvider } from "@/components/active-theme"
import Notifications from "@/components/layout/header/notifications"
import Search from "@/components/layout/header/search"
import ThemeSwitch from "@/components/layout/header/theme-switch"
import UserMenu from "@/components/layout/header/user-menu"
import { ThemeCustomizerPanel } from "@/components/theme-customizer"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type AppLocale = "ar" | "en"

function applyLocaleToDocument(nextLocale: AppLocale) {
  if (typeof document === "undefined") return

  document.documentElement.lang = nextLocale
  document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr"
  document.body.setAttribute("dir", nextLocale === "ar" ? "rtl" : "ltr")
}

function getStoredLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar"

    const savedLocale = window.localStorage.getItem("primey-locale")
    return savedLocale === "en" ? "en" : "ar"
  } catch (error) {
    console.error("Read locale error:", error)
    return "ar"
  }
}

export function SiteHeader() {
  const { toggleSidebar, open } = useSidebar()
  const [locale, setLocale] = useState<AppLocale>("ar")

  useEffect(() => {
    const syncLocale = () => {
      const nextLocale = getStoredLocale()

      setLocale(nextLocale)
      applyLocaleToDocument(nextLocale)
    }

    syncLocale()

    window.addEventListener("primey-locale-changed", syncLocale)
    window.addEventListener("storage", syncLocale)

    return () => {
      window.removeEventListener("primey-locale-changed", syncLocale)
      window.removeEventListener("storage", syncLocale)
    }
  }, [])

  const toggleLanguage = () => {
    try {
      const nextLocale: AppLocale = locale === "ar" ? "en" : "ar"

      setLocale(nextLocale)

      if (typeof window !== "undefined") {
        window.localStorage.setItem("primey-locale", nextLocale)
        window.dispatchEvent(new Event("primey-locale-changed"))
      }

      applyLocaleToDocument(nextLocale)
    } catch (error) {
      console.error("Language toggle error:", error)
    }
  }

  const isArabic = locale === "ar"

  const wrapperDirection = useMemo(
    () => (isArabic ? "flex-row-reverse" : "flex-row"),
    [isArabic]
  )

  const actionsDirection = useMemo(
    () => (isArabic ? "flex-row-reverse" : "flex-row"),
    [isArabic]
  )

  return (
    <header
      className={cn(
        "relative z-40 w-full overflow-hidden rounded-[inherit]",
        "bg-transparent text-foreground"
      )}
    >
      <div className="w-full overflow-hidden rounded-[inherit] p-0">
        <div
          className={cn(
            "flex min-h-14 w-full items-center gap-2 overflow-hidden rounded-[inherit] px-2 py-2 md:min-h-16 md:px-3",
            "bg-gradient-to-b from-white/78 to-white/42 backdrop-blur-xl",
            "supports-[backdrop-filter]:from-white/72 supports-[backdrop-filter]:to-white/36",
            "dark:from-white/[0.07] dark:to-white/[0.025]"
          )}
        >
          <div className={cn("flex w-full items-center gap-3", wrapperDirection)}>
            <div
              className={cn(
                "flex shrink-0 items-center gap-2",
                actionsDirection
              )}
            >
              <Button
                type="button"
                onClick={toggleSidebar}
                size="icon"
                variant="outline"
                className={cn(
                  "h-10 w-10 rounded-2xl border-white/70 bg-white/80 shadow-sm transition",
                  "hover:bg-white hover:shadow-md",
                  "dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                )}
                aria-label={open ? "إغلاق القائمة الجانبية" : "فتح القائمة الجانبية"}
                title={open ? "إغلاق القائمة الجانبية" : "فتح القائمة الجانبية"}
              >
                {open ? (
                  <PanelLeftClose className="h-4.5 w-4.5" />
                ) : (
                  <PanelLeftOpen className="h-4.5 w-4.5" />
                )}
              </Button>

              <Separator
                orientation="vertical"
                className="mx-1 hidden h-6 bg-border/60 lg:flex"
              />
            </div>

            <div className="flex min-w-0 flex-1 justify-center">
              <div className="w-full max-w-[820px]">
                <Search />
              </div>
            </div>

            <div
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-2xl border border-white/70 bg-white/72 p-1 shadow-sm backdrop-blur-xl",
                "dark:border-white/10 dark:bg-white/[0.055]",
                actionsDirection
              )}
            >
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={toggleLanguage}
                className={cn(
                  "h-9 w-9 rounded-xl transition",
                  "hover:bg-slate-100",
                  "dark:hover:bg-white/[0.08]"
                )}
                aria-label={
                  locale === "ar" ? "Switch to English" : "التبديل إلى العربية"
                }
                title={
                  locale === "ar" ? "Switch to English" : "التبديل إلى العربية"
                }
              >
                <Globe className="h-4.5 w-4.5" />
              </Button>

              <Notifications />
              <ThemeSwitch />

              <ActiveThemeProvider>
                <ThemeCustomizerPanel />
              </ActiveThemeProvider>

              <Separator
                orientation="vertical"
                className="mx-1 hidden h-5 bg-border/60 sm:flex"
              />

              <div className="hidden sm:block">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}