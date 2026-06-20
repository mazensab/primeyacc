"use client";

/* =====================================================
   📂 components/layout/sidebar/nav-user.tsx
   🧠 Primey Care — Premium Sidebar User Menu
   -----------------------------------------------------
   ✅ يدعم النظام / العميل / المندوب / مقدم الخدمة
   ✅ يوجه روابط القائمة حسب المساحة الحالية
   ✅ بدون hardcoded localhost
   ✅ يحافظ على هوية السايدر الجديدة
   ✅ يدعم عربي/إنجليزي عبر primey-locale
===================================================== */

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import {
  BellIcon,
  CreditCardIcon,
  HeadphonesIcon,
  Loader2,
  LogOutIcon,
  ShieldCheck,
  UserCircle2Icon,
} from "lucide-react";
import { DotsVerticalIcon } from "@radix-ui/react-icons";

type AppLocale = "ar" | "en";

type PrimeyAuthUser = {
  id?: number | string;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar?: string | null;
};

type PrimeyAuthSubscription = {
  days_remaining?: number | null;
  apps?: string[];
};

type PrimeyAuthSession = {
  user?: PrimeyAuthUser | null;
  role?: string | null;
  subscription?: PrimeyAuthSubscription | null;
};

/* =====================================================
   Locale Helpers
===================================================== */

function readStoredLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const savedLocale = window.localStorage.getItem("primey-locale");
    if (savedLocale === "en") return "en";
    if (savedLocale === "ar") return "ar";

    const htmlLang = document.documentElement.lang;
    return htmlLang === "en" ? "en" : "ar";
  } catch (error) {
    console.error("Nav user locale read error:", error);
    return "ar";
  }
}

function applyDocumentLocale(locale: AppLocale) {
  try {
    if (typeof document === "undefined") return;

    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.body.dir = locale === "ar" ? "rtl" : "ltr";
  } catch (error) {
    console.error("Nav user locale apply error:", error);
  }
}

/* =====================================================
   API Helpers
===================================================== */

function getApiBaseUrl(): string {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

  return apiUrl.replace(/\/$/, "");
}

function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();

  if (!base) return path;

  return `${base}${path}`;
}

/* =====================================================
   Safe User Helpers
===================================================== */

function normalizeSession(value: unknown): PrimeyAuthSession {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as PrimeyAuthSession;
}

function getUserDisplayName(
  user: PrimeyAuthUser | null | undefined,
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

  if (!cleanName) {
    return isArabic ? "م" : "U";
  }

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

  return labels[normalizedRole]?.[isArabic ? "ar" : "en"] || normalizedRole || (isArabic ? "حساب مستخدم" : "User Account");
}

/* =====================================================
   Component
===================================================== */

export function NavUser() {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const authSession = useAuth();

  const session = normalizeSession(authSession);

  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<AppLocale>("ar");

  useEffect(() => {
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
  const user = session.user || null;

  const userName = getUserDisplayName(user, isArabic);
  const userEmail = String(user?.email || "");
  const userAvatar = String(user?.avatar || "");
  const avatarFallback = getAvatarFallback(userName, isArabic);
  const roleLabel = getRoleLabel(session.role, isArabic);

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

  const NotificationsIcon = isCustomerArea ? HeadphonesIcon : BellIcon;

  const getCSRFToken = () => {
    if (typeof document === "undefined") return "";

    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
  };

  const handleLogout = async () => {
    if (loading) return;

    setLoading(true);

    try {
      await fetch(buildApiUrl("/api/auth/csrf/"), {
        method: "GET",
        credentials: "include",
      });

      const csrfToken = getCSRFToken();

      await fetch(buildApiUrl("/api/auth/logout/"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
      });

      toast.success(isArabic ? "تم تسجيل الخروج بنجاح" : "Signed out successfully");
    } catch (error) {
      console.error("Logout API error:", error);
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

  const menuDirectionClass = isArabic ? "flex-row-reverse text-right" : "flex-row text-left";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "h-14 rounded-2xl border border-white/70 px-2 transition-all",
                "bg-gradient-to-b from-white/86 to-white/52 shadow-sm",
                "hover:border-slate-200 hover:bg-white hover:text-foreground hover:shadow-md",
                "data-[state=open]:border-primary/20 data-[state=open]:bg-primary/8 data-[state=open]:text-primary",
                "dark:border-white/10 dark:from-white/[0.075] dark:to-white/[0.025]",
                "dark:hover:bg-white/[0.08] dark:data-[state=open]:bg-primary/15",
                "group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!w-12 group-data-[collapsible=icon]:!px-0",
              )}
              aria-label={isArabic ? "قائمة المستخدم" : "User menu"}
              title={isArabic ? "قائمة المستخدم" : "User menu"}
            >
              <Avatar className="h-9 w-9 shrink-0 rounded-2xl border border-white/80 shadow-sm dark:border-white/10">
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
                  "grid min-w-0 flex-1 text-sm leading-tight group-data-[collapsible=icon]:hidden",
                  isArabic ? "text-right" : "text-left",
                )}
              >
                <span className="truncate font-semibold text-foreground">
                  {userName}
                </span>

                <span className="truncate text-xs text-muted-foreground">
                  {userEmail || roleLabel}
                </span>
              </div>

              <DotsVerticalIcon className="ms-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className={cn(
              "w-[--radix-dropdown-menu-trigger-width] min-w-64 overflow-hidden rounded-2xl border-white/70 bg-background/95 p-2 shadow-[0_18px_55px_rgba(15,23,42,0.14)] backdrop-blur-xl",
              "dark:border-white/10 dark:bg-slate-950/94 dark:shadow-[0_18px_55px_rgba(0,0,0,0.35)]",
            )}
            side={isMobile ? "bottom" : isArabic ? "left" : "right"}
            align="end"
            sideOffset={8}
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
                  onClick={() => router.push(accountHref)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    "focus:bg-primary/10 focus:text-primary",
                    menuDirectionClass,
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-muted-foreground dark:bg-white/[0.06]">
                    <UserCircle2Icon className="size-4" />
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
                    <CreditCardIcon className="size-4" />
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

                  <span className="min-w-0 flex-1 truncate">
                    {notificationsLabel}
                  </span>
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
                    <LogOutIcon className="size-4" />
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
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}