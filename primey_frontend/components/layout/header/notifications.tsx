"use client";

/* =====================================================
   📂 components/layout/header/notifications.tsx
   🧠 PrimeyAcc — Premium Header Notifications
   -----------------------------------------------------
   ✅ متوافق مع الهيدر الجديد
   ✅ يحافظ على API الإشعارات الحالي
   ✅ يدعم WebSocket اختياريًا
   ✅ يدعم عربي/إنجليزي عبر primey-locale
   ✅ بدون hardcoded localhost
===================================================== */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellIcon,
  CheckCheckIcon,
  ClockIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/* =====================================================
   TYPES
===================================================== */

type AppLocale = "ar" | "en";

interface Notification {
  id: number;
  title: string;
  message: string;
  severity?: string | null;
  notification_type?: string | null;
  priority?: string | null;
  channel?: string | null;
  is_read: boolean;
  link?: string | null;
  action_url?: string | null;
  created_at: string;
  read_at?: string | null;
  event_id?: number | null;
  recipient_id?: number | null;
}

type NotificationsApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  results?: Notification[];
  notifications?: Notification[];
  count?: number;
  unread_count?: number;
  data?:
    | Notification[]
    | {
        items?: Notification[];
        results?: Notification[];
        unread_count?: number;
        counts?: {
          unread?: number;
          total?: number;
          read?: number;
        };
      };
  meta?: {
    unread_count?: number;
    counts?: {
      unread?: number;
      total?: number;
      read?: number;
    };
  };
};

/* =====================================================
   CONSTANTS
===================================================== */

const SYSTEM_NOTIFICATIONS_ENDPOINT = "/api/system/notifications/";
const COMPANY_NOTIFICATIONS_ENDPOINT = "/api/company/notifications/";

/* =====================================================
   HELPERS
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
    console.error("Notifications locale read error:", error);
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
    console.error("Notifications locale apply error:", error);
  }
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  return parts.length === 2 ? parts.pop()?.split(";").shift() || "" : "";
}

function getCSRFToken(): string {
  return getCookie("csrftoken") || getCookie("csrf_token") || "";
}
function getApiBaseUrl(): string {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";
  return apiUrl.replace(/\/+$/, "");
}
function buildApiUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!base) return path;
  return `${base}${path}`;
}
function getNotificationsEndpoint(isCompanyScope: boolean): string {
  return isCompanyScope ? COMPANY_NOTIFICATIONS_ENDPOINT : SYSTEM_NOTIFICATIONS_ENDPOINT;
}

function normalizeNotification(item: Notification): Notification {
  const notificationType = String(item.notification_type || item.severity || "INFO").toUpperCase();
  return {
    ...item,
    severity: item.severity || notificationType.toLowerCase(),
    notification_type: notificationType,
    priority: item.priority || "NORMAL",
    link: item.link || item.action_url || null,
    action_url: item.action_url || item.link || null,
    is_read: Boolean(item.is_read),
    created_at: item.created_at || new Date().toISOString(),
  };
}
function extractNotifications(payload: NotificationsApiResponse): {
  results: Notification[];
  unreadCount: number;
} {
  let results: Notification[] = [];
  if (Array.isArray(payload.results)) {
    results = payload.results;
  } else if (Array.isArray(payload.notifications)) {
    results = payload.notifications;
  } else if (Array.isArray(payload.data)) {
    results = payload.data;
  } else if (
    payload.data &&
    !Array.isArray(payload.data) &&
    Array.isArray(payload.data.items)
  ) {
    results = payload.data.items;
  } else if (
    payload.data &&
    !Array.isArray(payload.data) &&
    Array.isArray(payload.data.results)
  ) {
    results = payload.data.results;
  }
  const normalizedResults = results.map(normalizeNotification);
  const unreadCount = Number(
    payload.unread_count ??
      payload.meta?.unread_count ??
      payload.meta?.counts?.unread ??
      (!Array.isArray(payload.data) ? payload.data?.unread_count : undefined) ??
      (!Array.isArray(payload.data) ? payload.data?.counts?.unread : undefined) ??
      normalizedResults.filter((item) => !item.is_read).length,
  );
  return {
    results: normalizedResults,
    unreadCount: Number.isFinite(unreadCount) ? unreadCount : 0,
  };
}
function resolveWebSocketUrl(): string {
  const envWs = process.env.NEXT_PUBLIC_WS_URL?.trim();

  if (!envWs) return "";

  return `${envWs.replace(/\/+$/, "")}/ws/system/notifications/`;
}

function formatNotificationDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function severityClassName(severity: string): string {
  const normalized = String(severity || "").toLowerCase();

  if (normalized === "success") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (normalized === "warning") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (normalized === "error" || normalized === "critical") {
    return "bg-red-500/10 text-red-700 dark:text-red-300";
  }

  return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
}

/* =====================================================
   COMPONENT
===================================================== */

const Notifications = () => {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);
  const didLoadRef = useRef(false);

  const isArabic = locale === "ar";

  const isCompanyScope = useMemo(() => {
    return (
      pathname?.startsWith("/company") ||
      pathname?.startsWith("/center") ||
      pathname?.startsWith("/provider")
    );
  }, [pathname]);

  const pageHref = isCompanyScope
    ? "/company/notifications"
    : "/system/notifications";


  const notificationsEndpoint = useMemo(
    () => getNotificationsEndpoint(isCompanyScope),
    [isCompanyScope],
  );
  const wsNotificationsUrl = useMemo(() => resolveWebSocketUrl(), []);

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

  async function loadNotifications() {
    try {
      setLoading(true);

      const searchParams = new URLSearchParams({
        limit: "8",
      });

      const res = await fetch(
        buildApiUrl(`${notificationsEndpoint}?${searchParams.toString()}`),
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (res.status === 401 || res.status === 403 || res.status === 404) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      if (!res.ok) {
        console.warn(`Notifications inbox API unavailable: ${res.status}`);
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const data = (await res.json()) as NotificationsApiResponse;
      const parsed = extractNotifications(data);

      setNotifications(parsed.results);
      setUnreadCount(parsed.unreadCount);
    } catch (error) {
      console.error("Notifications load error:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!didLoadRef.current) {
      didLoadRef.current = true;
    }
    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 30000);
    const handleFocus = () => {
      void loadNotifications();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [notificationsEndpoint]);

  useEffect(() => {
    if (!wsNotificationsUrl) return;

    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsNotificationsUrl);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          const notification =
            payload?.notification || payload?.data?.notification || payload;

          if (!notification?.id) return;

          setNotifications((prev) => {
            const exists = prev.some((item) => item.id === notification.id);
            if (exists) return prev;

            return [normalizeNotification(notification as Notification), ...prev].slice(0, 8);
          });

          setUnreadCount((prev) => prev + 1);
        } catch (error) {
          console.error("Realtime notification parse error:", error);
        }
      };

      socket.onerror = () => {
        socketRef.current = null;
      };

      socket.onclose = () => {
        socketRef.current = null;
      };
    } catch (error) {
      console.error("Notification socket initialization error:", error);
    }

    return () => {
      try {
        socket?.close();
        socketRef.current?.close();
      } catch (error) {
        console.error("Notification socket close error:", error);
      } finally {
        socketRef.current = null;
      }
    };
  }, [wsNotificationsUrl]);

  async function markAsRead(id: number) {
    try {
      const csrfToken = getCSRFToken();
      const res = await fetch(buildApiUrl(`${notificationsEndpoint}${id}/read/`), {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
        body: JSON.stringify({}),
      });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        toast.error(
          isArabic
            ? "تعذر تحديث حالة الإشعار بسبب الصلاحية أو الجلسة"
            : "Could not update notification because of permissions or session",
        );
        return;
      }
      if (!res.ok) {
        toast.error(
          isArabic
            ? "تعذر تحديث حالة الإشعار"
            : "Could not update notification",
        );
        return;
      }
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, is_read: true, read_at: new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
    } catch (error) {
      console.error("Mark notification read error:", error);
    }
  }
  async function markAllAsRead() {
    if (unreadCount <= 0) return;
    try {
      setMarkingAll(true);
      const csrfToken = getCSRFToken();
      const res = await fetch(buildApiUrl(`${notificationsEndpoint}mark-all-read/`), {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
        body: JSON.stringify({}),
      });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        toast.error(
          isArabic
            ? "تعذر تعليم كل الإشعارات كمقروءة بسبب الصلاحية أو الجلسة"
            : "Could not mark all notifications as read because of permissions or session",
        );
        return;
      }
      if (!res.ok) {
        toast.error(
          isArabic
            ? "تعذر تعليم الإشعارات كمقروءة"
            : "Could not mark notifications as read",
        );
        return;
      }
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
          read_at: new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
      toast.success(
        isArabic
          ? "تم تعليم كل الإشعارات كمقروءة"
          : "All notifications marked as read",
      );
    } catch (error) {
      console.error("Mark all notifications read error:", error);
    } finally {
      setMarkingAll(false);
    }
  }
  async function handleNotificationClick(item: Notification) {
    if (!item.is_read) {
      await markAsRead(item.id);
    }

    const actionUrl = item.action_url || item.link;
    if (actionUrl) {
      router.push(actionUrl);
    }
  }

  const menuDirectionClass = isArabic
    ? "flex-row-reverse text-right"
    : "flex-row text-left";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            "relative h-9 w-9 rounded-xl transition",
            "hover:bg-slate-100 hover:text-foreground",
            "dark:hover:bg-white/[0.08]",
          )}
          aria-label={isArabic ? "الإشعارات" : "Notifications"}
          title={isArabic ? "الإشعارات" : "Notifications"}
        >
          <BellIcon className="h-4.5 w-4.5" />

          {unreadCount > 0 ? (
            <span
              className={cn(
                "absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1",
                "bg-red-600 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-background",
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isMobile ? "center" : isArabic ? "start" : "end"}
        sideOffset={10}
        className={cn(
          "w-[22rem] overflow-hidden rounded-[1.65rem] border-white/70 bg-background/95 p-0 shadow-[0_22px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl",
          "dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_22px_80px_rgba(0,0,0,0.42)]",
        )}
      >
        <div dir={isArabic ? "rtl" : "ltr"}>
          <DropdownMenuLabel className="sticky top-0 z-10 bg-background/95 p-0 backdrop-blur-xl dark:bg-slate-950/95">
            <div className="border-b border-slate-200/70 p-3 dark:border-white/10">
              <div
                className={cn(
                  "flex items-center justify-between gap-3",
                  menuDirectionClass,
                )}
              >
                <div
                  className={cn(
                    "flex min-w-0 items-center gap-3",
                    isArabic ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <BellIcon className="h-4.5 w-4.5" />
                  </span>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-foreground">
                      {isArabic ? "الإشعارات" : "Notifications"}
                    </div>

                    <div className="mt-0.5 truncate text-xs font-normal text-muted-foreground">
                      {unreadCount > 0
                        ? isArabic
                          ? `${unreadCount} غير مقروءة`
                          : `${unreadCount} unread`
                        : isArabic
                          ? "لا توجد إشعارات غير مقروءة"
                          : "No unread notifications"}
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex shrink-0 items-center gap-2",
                    isArabic ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    disabled={unreadCount <= 0 || markingAll}
                    className={cn(
                      "inline-flex h-8 items-center gap-1 rounded-xl px-2 text-xs font-semibold transition",
                      "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      isArabic ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    {markingAll ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCheckIcon className="size-3.5" />
                    )}
                    {isArabic ? "قراءة الكل" : "Read all"}
                  </button>

                  <Link
                    href={pageHref}
                    className="inline-flex h-8 items-center rounded-xl px-2 text-xs font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                  >
                    {isArabic ? "عرض الكل" : "View all"}
                  </Link>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>

          <ScrollArea className="h-[360px]">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`notification-skeleton-${index}`}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/60 p-3",
                      "dark:border-white/10 dark:bg-white/[0.045]",
                      isArabic ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-2xl bg-muted" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
                      <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
                      <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!loading && notifications.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>

                <div className="mt-4 text-sm font-semibold text-foreground">
                  {isArabic ? "لا توجد إشعارات" : "No notifications"}
                </div>

                <div className="mt-1 max-w-56 text-xs leading-5 text-muted-foreground">
                  {isArabic
                    ? "عند وصول إشعارات جديدة ستظهر هنا مباشرة."
                    : "New notifications will appear here as soon as they arrive."}
                </div>
              </div>
            ) : null}

            {!loading && notifications.length > 0 ? (
              <div className="space-y-2 p-3">
                {notifications.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={cn(
                      "group cursor-pointer rounded-2xl border p-0 transition",
                      "focus:bg-primary/8 focus:text-foreground",
                      item.is_read
                        ? "border-slate-200/65 bg-white/52 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.035] dark:hover:bg-white/[0.06]"
                        : "border-primary/15 bg-primary/8 hover:bg-primary/12 dark:border-primary/20 dark:bg-primary/12",
                    )}
                  >
                    <div
                      className={cn(
                        "flex w-full items-start gap-3 p-3",
                        isArabic ? "flex-row-reverse text-right" : "flex-row text-left",
                      )}
                    >
                      <Avatar className="h-10 w-10 shrink-0 rounded-2xl border border-white/80 shadow-sm dark:border-white/10">
                        <AvatarFallback
                          className={cn(
                            "rounded-2xl text-sm font-bold",
                            severityClassName(item.severity || item.notification_type || item.priority || ""),
                          )}
                        >
                          {item.title?.charAt(0) || (isArabic ? "إ" : "N")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "flex items-center gap-2",
                            isArabic ? "flex-row-reverse" : "flex-row",
                          )}
                        >
                          <div className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                            {item.title}
                          </div>

                          {!item.is_read ? (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-sm" />
                          ) : null}
                        </div>

                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {item.message}
                        </div>

                        <div
                          className={cn(
                            "mt-2 flex items-center gap-1 text-xs text-muted-foreground",
                            isArabic ? "flex-row-reverse" : "flex-row",
                          )}
                        >
                          <ClockIcon className="size-3" />
                          <span>{formatNotificationDate(item.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            ) : null}
          </ScrollArea>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Notifications;