"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* =========================================================
   🌐 Types
========================================================= */
type AppLocale = "ar" | "en";

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
   🌓 Toggle Theme
========================================================= */
export const ToggleTheme = () => {
  const { resolvedTheme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<AppLocale>("ar");

  useEffect(() => {
    const updateLocale = () => {
      setLocale(getCurrentLocale());
    };

    updateLocale();
    setMounted(true);

    window.addEventListener("primey-locale-changed", updateLocale);
    window.addEventListener("storage", updateLocale);

    return () => {
      window.removeEventListener("primey-locale-changed", updateLocale);
      window.removeEventListener("storage", updateLocale);
    };
  }, []);

  const isArabic = locale === "ar";

  const labels = {
    changeTheme: isArabic ? "تغيير المظهر" : "Change theme",
    dark: isArabic ? "داكن" : "Dark",
    light: isArabic ? "فاتح" : "Light",
  };

  const isDark = resolvedTheme === "dark";

  const handleToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={labels.changeTheme}
        className="rounded-xl"
        disabled
      >
        <Sun className="size-4" />
        <span className="sr-only">{labels.changeTheme}</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleToggleTheme}
      size="icon"
      variant="ghost"
      aria-label={labels.changeTheme}
      className={cn(
        "rounded-xl transition",
        "hover:bg-white/55 dark:hover:bg-white/10"
      )}
    >
      <span className="flex items-center gap-2">
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}

        <span className="block lg:hidden">
          {isDark ? labels.light : labels.dark}
        </span>
      </span>

      <span className="sr-only">{labels.changeTheme}</span>
    </Button>
  );
};