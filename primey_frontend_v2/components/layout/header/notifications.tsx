"use client";

import * as React from "react";
import Link from "next/link";
import {
  BellIcon,
  CheckCircle2,
  ClockIcon,
  Inbox,
  Loader2,
} from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { API_PATHS } from "@/lib/api/endpoints";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type HeaderNotification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | null;
};

const translations = {
  ar: {
    title: "الإشعارات",
    viewAll: "عرض الكل",
    emptyTitle: "لا توجد إشعارات",
    emptyDesc: "ستظهر إشعارات النظام هنا عند توفرها.",
    loading: "جارٍ تحميل الإشعارات...",
    errorTitle: "تعذر تحميل الإشعارات",
    unread: "غير مقروء",
  },
  en: {
    title: "Notifications",
    viewAll: "View all",
    emptyTitle: "No notifications",
    emptyDesc: "System notifications will appear here when available.",
    loading: "Loading notifications...",
    errorTitle: "Could not load notifications",
    unread: "Unread",
  },
} as const;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}

function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function getLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("Mhamcloud-locale") === "en" ? "en" : "ar";
}

function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          ""
        ).replace(/\/+$/, "")
      : "";

  return envBase.endsWith("/api") ? envBase.slice(0, -4) : envBase;
}

function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const record = asRecord(payload);
  const data = asRecord(record.data);

  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.notifications)) return record.notifications;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.notifications)) return data.notifications;
  if (Array.isArray(data.items)) return data.items;

  return [];
}

function normalizeNotification(value: unknown): HeaderNotification {
  const record = asRecord(value);

  return {
    id: normalizeText(record.id, "—"),
    title: normalizeText(record.title, "—"),
    message: normalizeText(record.message, "—"),
    isRead: Boolean(record.is_read),
    createdAt: normalizeText(record.created_at) || null,
  };
}

function extractUnreadCount(payload: unknown, rows: HeaderNotification[]) {
  const record = asRecord(payload);
  const data = asRecord(record.data);

  return toNumber(
    record.unread_count ?? data.unread_count,
    rows.filter((row) => !row.isRead).length,
  );
}

function formatDateTime(value: string | null, locale: Locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function fetchHeaderNotifications(signal?: AbortSignal) {
  const params = new URLSearchParams({
    limit: "8",
    offset: "0",
  });

  const response = await fetch(makeApiUrl(API_PATHS.systemNotifications.list, params), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();

  let payload: unknown = {};
  if (raw && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    const record = asRecord(payload);
    throw new Error(
      normalizeText(record.message) ||
        normalizeText(record.detail) ||
        normalizeText(record.error) ||
        `Request failed with status ${response.status}`,
    );
  }

  const rows = extractArray(payload).map(normalizeNotification);
  return {
    rows,
    unreadCount: extractUnreadCount(payload, rows),
  };
}

const Notifications = () => {
  const isMobile = useIsMobile();
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [rows, setRows] = React.useState<HeaderNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  const load = React.useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");
      const result = await fetchHeaderNotifications(signal);
      setRows(result.rows);
      setUnreadCount(result.unreadCount);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : t.errorTitle);
      setRows([]);
      setUnreadCount(0);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [t.errorTitle]);

  React.useEffect(() => {
    const syncLocale = () => setLocale(getLocale());

    syncLocale();
    window.addEventListener("storage", syncLocale);
    window.addEventListener("Mhamcloud-locale-changed", syncLocale);

    return () => {
      window.removeEventListener("storage", syncLocale);
      window.removeEventListener("Mhamcloud-locale-changed", syncLocale);
    };
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);

    return () => controller.abort();
  }, [load]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="relative"
          aria-label={t.title}
        >
          <BellIcon />
          {unreadCount > 0 ? (
            <span
              className="bg-destructive absolute end-0.5 top-0.5 block size-1.5 shrink-0 rounded-full"
              aria-label={`${unreadCount} ${t.unread}`}
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isMobile ? "center" : "end"}
        className="ms-4 w-80 p-0"
      >
        <DropdownMenuLabel className="bg-background dark:bg-muted sticky top-0 z-10 p-0">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2 font-medium">
              <BellIcon className="size-4 text-[#a57b3d]" />
              <span>{t.title}</span>
              {unreadCount > 0 ? (
                <span
                  dir="ltr"
                  lang="en"
                  className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums"
                >
                  {unreadCount}
                </span>
              ) : null}
            </div>

            <Button variant="link" className="h-auto p-0 text-xs" asChild>
              <Link href="/system/notifications">{t.viewAll}</Link>
            </Button>
          </div>
        </DropdownMenuLabel>

        <ScrollArea className="h-[350px]">
          {loading ? (
            <div className="flex h-[220px] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>{t.loading}</span>
            </div>
          ) : error ? (
            <div className="flex h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
              <Inbox className="size-7 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t.errorTitle}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {error}
                </p>
              </div>
            </div>
          ) : rows.length ? (
            <div>
              {rows.map((item) => (
                <Link
                  key={item.id}
                  href="/system/notifications"
                  className="group flex items-start gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    {item.isRead ? (
                      <CheckCircle2 className="size-4 text-muted-foreground" />
                    ) : (
                      <BellIcon className="size-4 text-[#a57b3d]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          item.isRead
                            ? "truncate text-sm font-medium"
                            : "truncate text-sm font-semibold"
                        }
                      >
                        {item.title}
                      </span>

                      {!item.isRead ? (
                        <span className="bg-destructive/80 block size-2 shrink-0 rounded-full" />
                      ) : null}
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {item.message}
                    </p>

                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <ClockIcon className="size-3" />
                      <span>{formatDateTime(item.createdAt, locale)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Inbox className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{t.emptyTitle}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t.emptyDesc}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Notifications;
