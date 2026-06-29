"use client";

/* =====================================================
   📂 components/layout/header/theme-switch.tsx
   🧠 Mhamcloud — Premium Theme Switch
   -----------------------------------------------------
   ✅ متوافق مع الهيدر الجديد
   ✅ يدعم light / dark / system
   ✅ يدعم عربي/إنجليزي عبر primey-locale
   ✅ يتزامن مع تغيير اللغة بدون إعادة تحميل
===================================================== */

import { useEffect, useMemo, useState } from "react";
import { Check, Laptop, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AppLocale = "ar" | "en";
type ThemeOption = "light" | "dark" | "system";

const THEME_OPTIONS: Array<{
  value: ThemeOption;
  icon: typeof SunIcon;
  label: {
    ar: string;
    en: string;
  };
}> = [
  {
    value: "light",
    icon: SunIcon,
    label: {
      ar: "فاتح",
      en: "Light",
    },
  },
  {
    value: "dark",
    icon: MoonIcon,
    label: {
      ar: "داكن",
      en: "Dark",
    },
  },
  {
    value: "system",
    icon: Laptop,
    label: {
      ar: "حسب النظام",
      en: "System",
    },
  },
];

function readStoredLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const savedLocale = window.localStorage.getItem("primey-locale");
    if (savedLocale === "en") return "en";
    if (savedLocale === "ar") return "ar";

    return document.documentElement.lang === "en" ? "en" : "ar";
  } catch (error) {
    console.error("Theme switch locale read error:", error);
    return "ar";
  }
}

function applyDocumentLocale(locale: AppLocale): void {
  try {
    if (typeof document === "undefined") return;

    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.body.dir = locale === "ar" ? "rtl" : "ltr";
  } catch (error) {
    console.error("Theme switch locale apply error:", error);
  }
}

export default function ThemeSwitch() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<AppLocale>("ar");

  useEffect(() => {
    setMounted(true);

    const syncLocale = () => {
      const nextLocale = readStoredLocale();

      applyDocumentLocale(nextLocale);
      setLocale(nextLocale);
    };

    const syncLocaleAfterPaint = () => {
      syncLocale();

      window.setTimeout(() => {
        syncLocale();
      }, 0);
    };

    syncLocaleAfterPaint();

    window.addEventListener("primey-locale-changed", syncLocaleAfterPaint);
    window.addEventListener("storage", syncLocaleAfterPaint);

    return () => {
      window.removeEventListener("primey-locale-changed", syncLocaleAfterPaint);
      window.removeEventListener("storage", syncLocaleAfterPaint);
    };
  }, []);

  const isArabic = locale === "ar";

  const activeTheme = useMemo<ThemeOption>(() => {
    if (theme === "light" || theme === "dark" || theme === "system") {
      return theme;
    }

    return "system";
  }, [theme]);

  const CurrentIcon = resolvedTheme === "dark" ? MoonIcon : SunIcon;

  if (!mounted) {
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-9 w-9 rounded-xl"
        aria-label="Toggle theme"
        disabled
      >
        <SunIcon className="h-4.5 w-4.5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            "h-9 w-9 rounded-xl transition",
            "hover:bg-slate-100 hover:text-foreground",
            "dark:hover:bg-white/[0.08]",
          )}
          aria-label={isArabic ? "تبديل المظهر" : "Toggle theme"}
          title={isArabic ? "تبديل المظهر" : "Toggle theme"}
        >
          <CurrentIcon className="h-4.5 w-4.5" />
          <span className="sr-only">
            {isArabic ? "تبديل المظهر" : "Toggle theme"}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isArabic ? "start" : "end"}
        sideOffset={10}
        className={cn(
          "min-w-44 rounded-2xl border-white/70 bg-background/95 p-2 shadow-[0_18px_55px_rgba(15,23,42,0.14)] backdrop-blur-xl",
          "dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_18px_55px_rgba(0,0,0,0.35)]",
        )}
      >
        <div dir={isArabic ? "rtl" : "ltr"} className="space-y-1">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = activeTheme === option.value;

            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  "focus:bg-primary/10 focus:text-primary",
                  isActive ? "bg-primary/10 text-primary" : "",
                  isArabic ? "flex-row-reverse text-right" : "flex-row text-left",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-xl",
                    isActive
                      ? "bg-primary/12 text-primary"
                      : "bg-slate-100 text-muted-foreground dark:bg-white/[0.06]",
                  )}
                >
                  <Icon className="size-4" />
                </span>

                <span className="min-w-0 flex-1 truncate">
                  {option.label[isArabic ? "ar" : "en"]}
                </span>

                {isActive ? <Check className="size-4 shrink-0" /> : null}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}