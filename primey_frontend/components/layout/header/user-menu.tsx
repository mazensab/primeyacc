"use client";

/* =====================================================
   📂 components/layout/header/user-menu.tsx
   🧠 Primey Care — Premium Header User Menu
   -----------------------------------------------------
   ✅ متوافق مع الهيدر الجديد
   ✅ يدعم system / provider / customer / agent
   ✅ بدون hardcoded localhost
   ✅ يدعم عربي/إنجليزي عبر primey-locale
   ✅ يحافظ على تسجيل الخروج مع CSRF
===================================================== */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";

import {
  BadgeCheck,
  Bell,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCard,
  HeadphonesIcon,
  Loader2,
  LogOut,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type AppLocale = "ar" | "en";

type HeaderUser = {
  id?: number | string | null;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar?: string | null;
  image?: string | null;
};

type HeaderSubscription = {
  days_remaining?: number | null;
};

type HeaderAuthSession = {
  user?: HeaderUser | null;
  role?: string | null;
  subscription?: HeaderSubscription | null;
};

/* =====================================================
   Locale Helpers
===================================================== */

function readLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const savedLocale = window.localStorage.getItem("primey-locale");
    if (savedLocale === "en") return "en";
    if (savedLocale === "ar") return "ar";

    return document.documentElement.lang === "en" ? "en" : "ar";
  } catch (error) {
    console.error("Header user menu locale read error:", error);
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
    console.error("Header user menu locale apply error:", error);
  }
}

/* =====================================================
   API Helpers
===================================================== */

function normalizeApiBase(value: string | undefined): string {
  const cleanValue = String(value || "").trim().replace(/\/+$/, "");

  if (!cleanValue) return "";

  if (cleanValue.endsWith("/api")) {
    return cleanValue.slice(0, -4);
  }

  return cleanValue;
}

function getApiBaseUrl(): string {
  return normalizeApiBase(
    process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL,
  );
}

function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();

  if (!base) return path;

  return `${base}${path}`;
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  return parts.length === 2
    ? decodeURIComponent(parts.pop()?.split(";").shift() || "")
    : "";
}

function getCSRFToken(): string {
  return getCookie("csrftoken") || getCookie("csrf_token") || "";
}

/* =====================================================
   User Helpers
===================================================== */

function normalizeSession(value: unknown): HeaderAuthSession {
  if (!value || typeof value !== "object") return {};

  return value as HeaderAuthSession;
}

function getUserDisplayName(
  user: HeaderUser | null | undefined,
  isArabic: boolean,
): string {
  const fullName = String(user?.full_name || "").trim();
  const username = String(user?.username || "").trim();
  const email = String(user?.email || "").trim();

  if (fullName) return fullName;
  if (username) return username;
  if (email) return email;

  return isArabic ? "مستخدم" : "User";
}

function getAvatarFallback(userName: string, isArabic: boolean): string {
  const cleanName = userName.trim();

  if (!cleanName) return isArabic ? "م" : "U";

  return cleanName.charAt(0).toUpperCase();
}

function getRoleLabel(role: string | null | undefined, isArabic: boolean): string {
  const normalizedRole = String(role || "").trim().toLowerCase();

  const labels: Record<string, { ar: string; en: string }> = {
    system_admin: { ar: "مدير النظام", en: "System Admin" },
    superuser: { ar: "مدير عام", en: "Superuser" },
    provider_admin: { ar: "مدير مقدم خدمة", en: "Provider Admin" },
    customer_user: { ar: "عميل", en: "Customer" },
    agent_user: { ar: "مندوب", en: "Agent" },
    accountant: { ar: "محاسب", en: "Accountant" },
    support: { ar: "دعم", en: "Support" },
    viewer: { ar: "مشاهد", en: "Viewer" },
  };

  return (
    labels[normalizedRole]?.[isArabic ? "ar" : "en"] ||
    normalizedRole ||
    (isArabic ? "حساب مستخدم" : "User Account")
  );
}

/* =====================================================
   Component
===================================================== */

export default function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const authSession = normalizeSession(useAuth());

  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<AppLocale>("ar");

  const isArabic = locale === "ar";

  const sessionUser = authSession.user || null;
  const subscription = authSession.subscription || {};

  const userName = getUserDisplayName(sessionUser, isArabic);
  const userEmail = String(sessionUser?.email || "");
  const userAvatar = String(sessionUser?.avatar || sessionUser?.image || "");
  const avatarFallback = getAvatarFallback(userName, isArabic);
  const roleLabel = getRoleLabel(authSession.role, isArabic);

  const daysRemaining = subscription.days_remaining;

  const isCompanyArea =
    pathname?.startsWith("/company") ||
    pathname?.startsWith("/center") ||
    pathname?.startsWith("/provider");

  const isCustomerArea = pathname?.startsWith("/customer");
  const isAgentArea = pathname?.startsWith("/agent");

  const accountHref = useMemo(() => {
    if (isCustomerArea) return "/customer/profile";
    if (isAgentArea) return "/agent/account";
    if (isCompanyArea) return "/company/profile";

    return "/system/profile";
  }, [isCompanyArea, isCustomerArea, isAgentArea]);

  const billingHref = useMemo(() => {
    if (isCustomerArea) return "/customer/invoices";
    if (isAgentArea) return "/agent/commissions";
    if (isCompanyArea) return "/company/billing";

    return "/system/invoices";
  }, [isCompanyArea, isCustomerArea, isAgentArea]);

  const notificationsHref = useMemo(() => {
    if (isCustomerArea) return "/customer/support";
    if (isAgentArea) return "/agent/account";
    if (isCompanyArea) return "/company/notifications";

    return "/system/notifications";
  }, [isCompanyArea, isCustomerArea, isAgentArea]);

  const accountLabel = useMemo(() => {
    if (isCustomerArea) return isArabic ? "حسابي" : "My Profile";
    if (isAgentArea) return isArabic ? "حسابي" : "My Account";

    return isArabic ? "الحساب" : "Account";
  }, [isArabic, isCustomerArea, isAgentArea]);

  const billingLabel = useMemo(() => {
    if (isCustomerArea) return isArabic ? "فواتيري" : "My Invoices";
    if (isAgentArea) return isArabic ? "عمولاتي" : "My Commissions";

    return isArabic ? "الفواتير" : "Invoices";
  }, [isArabic, isCustomerArea, isAgentArea]);

  const notificationsLabel = useMemo(() => {
    if (isCustomerArea) return isArabic ? "الدعم" : "Support";
    if (isAgentArea) return isArabic ? "حساب المندوب" : "Agent Account";

    return isArabic ? "الإشعارات" : "Notifications";
  }, [isArabic, isCustomerArea, isAgentArea]);

  const subscriptionRemainingText = useMemo(() => {
    if (typeof daysRemaining !== "number") {
      return isArabic
        ? "مدة الاشتراك غير متوفرة"
        : "Subscription duration unavailable";
    }

    if (daysRemaining < 0) {
      return isArabic ? "انتهى الاشتراك" : "Subscription has expired";
    }

    if (daysRemaining === 0) {
      return isArabic ? "ينتهي الاشتراك اليوم" : "Subscription ends today";
    }

    if (daysRemaining === 1) {
      return isArabic
        ? "متبقي يوم واحد على الاشتراك"
        : "1 day remaining in subscription";
    }

    return isArabic
      ? `متبقي ${daysRemaining} يوم على الاشتراك`
      : `${daysRemaining} days remaining in subscription`;
  }, [daysRemaining, isArabic]);

  const progressValue = useMemo(() => {
    if (typeof daysRemaining !== "number") return 0;
    if (daysRemaining <= 0) return 0;
    if (daysRemaining >= 365) return 100;

    return Math.max(0, Math.min(100, Math.round((daysRemaining / 365) * 100)));
  }, [daysRemaining]);

  useEffect(() => {
    const syncLocale = () => {
      const nextLocale = readLocale();

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

  const handleLogout = async () => {
    if (loading) return;

    setLoading(true);

    try {
      await fetch(buildApiUrl("/api/auth/csrf/"), {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const csrfToken = getCSRFToken();

      await fetch(buildApiUrl("/api/auth/logout/"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
      });

      toast.success(isArabic ? "تم تسجيل الخروج بنجاح" : "Signed out successfully");
    } catch (error) {
      console.error("Logout request error:", error);
      toast.error(
        isArabic
          ? "تعذر الاتصال بالخادم، سيتم تحويلك لصفحة الدخول"
          : "Could not reach the server. Redirecting to login.",
      );
    } finally {
      try {
        window.localStorage.setItem("primey_logout", Date.now().toString());
      } catch (error) {
        console.error("Logout localStorage error:", error);
      }

      router.replace("/login");
    }
  };

  const menuDirectionClass = isArabic
    ? "flex-row-reverse text-right"
    : "flex-row text-left";

  const NotificationsIcon = isCustomerArea ? HeadphonesIcon : Bell;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl transition",
            "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            "dark:hover:bg-white/[0.08]",
          )}
          aria-label={isArabic ? "قائمة المستخدم" : "User menu"}
          title={isArabic ? "قائمة المستخدم" : "User menu"}
        >
          <Avatar className="h-8.5 w-8.5 cursor-pointer rounded-xl border border-white/80 shadow-sm dark:border-white/10">
            {userAvatar ? (
              <AvatarImage
                src={userAvatar}
                alt={userName}
                referrerPolicy="no-referrer"
              />
            ) : null}

            <AvatarFallback className="rounded-xl bg-primary/10 text-sm font-bold text-primary">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className={cn(
          "w-[--radix-dropdown-menu-trigger-width] min-w-72 overflow-hidden rounded-[1.65rem] border-white/70 bg-background/95 p-2 shadow-[0_22px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl",
          "dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_22px_80px_rgba(0,0,0,0.42)]",
        )}
        align={isArabic ? "start" : "end"}
        sideOffset={10}
      >
        <div dir={isArabic ? "rtl" : "ltr"}>
          <DropdownMenuLabel className="p-0 font-normal">
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-3 text-sm shadow-sm",
                "dark:border-white/10 dark:bg-white/[0.055]",
                menuDirectionClass,
              )}
            >
              <Avatar className="h-10 w-10 shrink-0 rounded-2xl border border-white/80 shadow-sm dark:border-white/10">
                {userAvatar ? (
                  <AvatarImage
                    src={userAvatar}
                    alt={userName}
                    referrerPolicy="no-referrer"
                  />
                ) : null}

                <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>

              <div
                className={cn(
                  "grid min-w-0 flex-1 text-sm leading-tight",
                  isArabic ? "text-right" : "text-left",
                )}
              >
                <span className="truncate font-semibold text-foreground">
                  {userName}
                </span>

                <span className="truncate text-xs text-muted-foreground">
                  {userEmail || roleLabel}
                </span>

                <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <ShieldCheck className="size-3" />
                  {roleLabel}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="my-2" />

          <DropdownMenuGroup className="space-y-1">
            <DropdownMenuItem
              asChild
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                "focus:bg-primary/10 focus:text-primary",
                menuDirectionClass,
              )}
            >
              <Link href="/system/settings">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-4" />
                </span>

                <span className="min-w-0 flex-1 truncate">
                  {isArabic ? "إعدادات النظام" : "System Settings"}
                </span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-2" />

          <DropdownMenuGroup className="space-y-1">
            <DropdownMenuItem
              onClick={() => router.push(accountHref)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                "focus:bg-primary/10 focus:text-primary",
                menuDirectionClass,
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-muted-foreground dark:bg-white/[0.06]">
                <BadgeCheck className="size-4" />
              </span>

              <span className="min-w-0 flex-1 truncate">{accountLabel}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push(billingHref)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                "focus:bg-primary/10 focus:text-primary",
                menuDirectionClass,
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-muted-foreground dark:bg-white/[0.06]">
                <CreditCard className="size-4" />
              </span>

              <span className="min-w-0 flex-1 truncate">{billingLabel}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => router.push(notificationsHref)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                "focus:bg-primary/10 focus:text-primary",
                menuDirectionClass,
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-muted-foreground dark:bg-white/[0.06]">
                <NotificationsIcon className="size-4" />
              </span>

              <span className="min-w-0 flex-1 truncate">{notificationsLabel}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-2" />

          <DropdownMenuItem
            onClick={handleLogout}
            disabled={loading}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              "text-red-600 focus:bg-red-50 focus:text-red-700",
              "dark:text-red-400 dark:focus:bg-red-950/30 dark:focus:text-red-300",
              "disabled:cursor-not-allowed disabled:opacity-60",
              menuDirectionClass,
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
            </span>

            <span className="min-w-0 flex-1 truncate">
              {loading
                ? isArabic
                  ? "جارٍ تسجيل الخروج..."
                  : "Signing out..."
                : isArabic
                  ? "تسجيل الخروج"
                  : "Log out"}
            </span>
          </DropdownMenuItem>

          <div className="mt-2 rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.055]">
            <div
              className={cn(
                "flex items-center justify-between gap-3",
                isArabic ? "flex-row-reverse text-right" : "flex-row text-left",
              )}
            >
              <h4 className="text-sm font-semibold text-foreground">
                {isArabic ? "الاشتراك" : "Subscription"}
              </h4>

              <div
                className={cn(
                  "flex items-center text-sm font-semibold text-muted-foreground",
                  isArabic ? "flex-row-reverse" : "flex-row",
                )}
              >
                {isArabic ? (
                  <>
                    <ChevronLeftIcon className="h-4 w-4" />
                    <span>
                      {typeof daysRemaining === "number"
                        ? `${Math.max(daysRemaining, 0)} ي`
                        : "--"}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {typeof daysRemaining === "number"
                        ? `${Math.max(daysRemaining, 0)}d`
                        : "--"}
                    </span>
                    <ChevronRightIcon className="h-4 w-4" />
                  </>
                )}
              </div>
            </div>

            <Progress
              value={progressValue}
              indicatorColor="bg-primary"
              className="mt-3 h-2 rounded-full"
            />

            <div
              className={cn(
                "mt-3 text-xs leading-5 text-muted-foreground",
                isArabic ? "text-right" : "text-left",
              )}
            >
              {subscriptionRemainingText}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}