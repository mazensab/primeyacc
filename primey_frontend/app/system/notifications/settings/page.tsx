"use client";

/* ============================================================
   📂 primey_frontend/app/system/notifications/settings/page.tsx
   🔔 Primey Care — Notification Settings
   ------------------------------------------------------------
   ✅ Same approved Customers / Orders / Users create/settings pattern
   ✅ Main settings form + sidebar summary
   ✅ Real API only with safe notification-center endpoint fallbacks
   ✅ GET/POST settings + preferences
   ✅ Header buttons / KPI cards / sections unified
   ✅ Safe save + reset to loaded state
   ✅ Skeleton loading
   ✅ Error state
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldAlert,
  Smartphone,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type DigestFrequency = "none" | "daily" | "weekly";
type QuietMode = "disabled" | "enabled";

type NotificationSettings = {
  enabled: boolean;
  in_app_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  push_enabled: boolean;

  notify_info: boolean;
  notify_success: boolean;
  notify_warning: boolean;
  notify_error: boolean;
  notify_critical: boolean;

  orders_enabled: boolean;
  invoices_enabled: boolean;
  payments_enabled: boolean;
  customers_enabled: boolean;
  providers_enabled: boolean;
  whatsapp_events_enabled: boolean;
  system_events_enabled: boolean;

  digest_frequency: DigestFrequency;
  quiet_mode: QuietMode;
  quiet_from: string;
  quiet_to: string;
  preferred_language: Locale;
  timezone: string;

  email_address: string;
  whatsapp_number: string;
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  settings?: unknown;
  preferences?: unknown;
};

const API_BASE_CANDIDATES = [
  "/api/notifications",
  "/api/notification-center",
  "/api/notification_center",
  "/api/notification-center-api",
];

const translations = {
  ar: {
    title: "إعدادات الإشعارات",
    subtitle: "إدارة قنوات الإشعارات، التنبيهات المهمة، الملخصات، وأوقات الهدوء.",
    back: "رجوع",
    refresh: "تحديث",
    save: "حفظ الإعدادات",
    saving: "جاري الحفظ",
    reset: "إعادة ضبط",
    enabled: "الإشعارات مفعلة",
    disabled: "الإشعارات غير مفعلة",
    channels: "قنوات الإشعارات",
    channelsDesc: "حدد القنوات التي يستقبل المستخدم الإشعارات من خلالها.",
    severity: "مستويات التنبيه",
    severityDesc: "حدد مستويات الشدة التي تظهر للمستخدم.",
    modules: "أنواع الإشعارات",
    modulesDesc: "حدد أنواع أحداث النظام التي يتم إرسال إشعارات عنها.",
    preferences: "التفضيلات",
    preferencesDesc: "إعدادات الملخص اليومي، اللغة، والمنطقة الزمنية.",
    quietHours: "أوقات الهدوء",
    quietHoursDesc: "عند تفعيلها يتم تقليل التنبيهات خلال هذه الفترة حسب إعدادات النظام.",
    contact: "بيانات التواصل",
    contactDesc: "بيانات القنوات الخارجية المستخدمة للإشعارات.",
    summary: "ملخص الإعدادات",
    readiness: "جاهزية الإعدادات",
    masterSwitch: "تشغيل الإشعارات",
    inApp: "داخل النظام",
    email: "البريد الإلكتروني",
    whatsapp: "واتساب",
    push: "تنبيهات Push",
    info: "معلومات",
    success: "نجاح",
    warning: "تحذير",
    error: "خطأ",
    critical: "حرج",
    orders: "الطلبات",
    invoices: "الفواتير",
    payments: "المدفوعات",
    customers: "العملاء",
    providers: "مقدمو الخدمة",
    whatsappEvents: "أحداث واتساب",
    systemEvents: "أحداث النظام",
    digestFrequency: "تكرار الملخص",
    none: "بدون ملخص",
    daily: "يومي",
    weekly: "أسبوعي",
    quietMode: "وضع الهدوء",
    quietFrom: "من الساعة",
    quietTo: "إلى الساعة",
    preferredLanguage: "اللغة المفضلة",
    timezone: "المنطقة الزمنية",
    emailAddress: "بريد الإشعارات",
    whatsappNumber: "رقم واتساب",
    activeChannels: "القنوات المفعلة",
    activeSeverities: "مستويات مفعلة",
    activeModules: "أنواع مفعلة",
    quietStatus: "وضع الهدوء",
    complete: "مكتمل",
    incomplete: "غير مكتمل",
    yes: "نعم",
    no: "لا",
    saved: "تم حفظ إعدادات الإشعارات بنجاح.",
    loaded: "تم تحديث الإعدادات.",
    resetDone: "تمت إعادة الإعدادات لآخر نسخة محملة.",
    errorTitle: "تعذر تحميل إعدادات الإشعارات",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    saveError: "تعذر حفظ إعدادات الإشعارات.",
    tryAgain: "إعادة المحاولة",
    invalidEmail: "صيغة البريد الإلكتروني غير صحيحة.",
    invalidQuietHours: "وقت بداية ونهاية الهدوء مطلوب عند تفعيل وضع الهدوء.",
    unknown: "غير محدد",
  },
  en: {
    title: "Notification Settings",
    subtitle: "Manage notification channels, important alerts, digests, and quiet hours.",
    back: "Back",
    refresh: "Refresh",
    save: "Save settings",
    saving: "Saving",
    reset: "Reset",
    enabled: "Notifications enabled",
    disabled: "Notifications disabled",
    channels: "Notification channels",
    channelsDesc: "Choose the channels where the user receives notifications.",
    severity: "Alert levels",
    severityDesc: "Choose the severity levels shown to the user.",
    modules: "Notification types",
    modulesDesc: "Choose system event types that trigger notifications.",
    preferences: "Preferences",
    preferencesDesc: "Digest, language, and timezone settings.",
    quietHours: "Quiet hours",
    quietHoursDesc: "When enabled, alerts are reduced during this period based on system rules.",
    contact: "Contact data",
    contactDesc: "External channel contact data used for notifications.",
    summary: "Settings summary",
    readiness: "Settings readiness",
    masterSwitch: "Enable notifications",
    inApp: "In-app",
    email: "Email",
    whatsapp: "WhatsApp",
    push: "Push notifications",
    info: "Info",
    success: "Success",
    warning: "Warning",
    error: "Error",
    critical: "Critical",
    orders: "Orders",
    invoices: "Invoices",
    payments: "Payments",
    customers: "Customers",
    providers: "Providers",
    whatsappEvents: "WhatsApp events",
    systemEvents: "System events",
    digestFrequency: "Digest frequency",
    none: "No digest",
    daily: "Daily",
    weekly: "Weekly",
    quietMode: "Quiet mode",
    quietFrom: "From",
    quietTo: "To",
    preferredLanguage: "Preferred language",
    timezone: "Timezone",
    emailAddress: "Notification email",
    whatsappNumber: "WhatsApp number",
    activeChannels: "Active channels",
    activeSeverities: "Active severities",
    activeModules: "Active types",
    quietStatus: "Quiet mode",
    complete: "Complete",
    incomplete: "Incomplete",
    yes: "Yes",
    no: "No",
    saved: "Notification settings saved successfully.",
    loaded: "Settings refreshed.",
    resetDone: "Settings restored to the last loaded version.",
    errorTitle: "Unable to load notification settings",
    errorDesc: "Make sure the backend is running, then try again.",
    saveError: "Unable to save notification settings.",
    tryAgain: "Try again",
    invalidEmail: "Email format is invalid.",
    invalidQuietHours: "Quiet start and end time are required when quiet mode is enabled.",
    unknown: "Unknown",
  },
} as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}

function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).trim();
  return cleaned || fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (["1", "true", "yes", "on", "enabled", "active"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off", "disabled", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function toEnglishDigits(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function normalizePhone(value: string) {
  return toEnglishDigits(value).replace(/[^\d+]/g, "");
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
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

  if (envBase.endsWith("/api")) {
    return envBase.slice(0, -4);
  }

  return envBase;
}

function makeApiUrl(basePath: string, suffix: string) {
  return `${getApiBaseUrl()}${basePath}${suffix}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
}

async function fetchJson<T>(
  url: string,
  options?: {
    signal?: AbortSignal;
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
  },
): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    method: options?.method || "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal: options?.signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options?.method && options.method !== "GET"
        ? { "Content-Type": "application/json" }
        : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method && options.method !== "GET"
        ? JSON.stringify(options.body || {})
        : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let payload: any = null;

  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.detail ||
      payload?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

async function requestNotificationApi<T>(
  suffixes: string[],
  options?: {
    signal?: AbortSignal;
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
  },
): Promise<T> {
  let lastError: unknown = null;

  for (const basePath of API_BASE_CANDIDATES) {
    for (const suffix of suffixes) {
      try {
        return await fetchJson<T>(makeApiUrl(basePath, suffix), {
          signal: options?.signal,
          method: options?.method,
          body: options?.body,
        });
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Notification settings request failed.");
}

function createDefaultSettings(locale: Locale): NotificationSettings {
  return {
    enabled: true,
    in_app_enabled: true,
    email_enabled: false,
    whatsapp_enabled: false,
    push_enabled: false,

    notify_info: true,
    notify_success: true,
    notify_warning: true,
    notify_error: true,
    notify_critical: true,

    orders_enabled: true,
    invoices_enabled: true,
    payments_enabled: true,
    customers_enabled: true,
    providers_enabled: true,
    whatsapp_events_enabled: true,
    system_events_enabled: true,

    digest_frequency: "none",
    quiet_mode: "disabled",
    quiet_from: "",
    quiet_to: "",
    preferred_language: locale,
    timezone: "Asia/Riyadh",

    email_address: "",
    whatsapp_number: "",
  };
}

function extractSettingsPayload(payload: ApiResponse): unknown {
  const data = asRecord(payload.data);

  if (payload.settings) return payload.settings;
  if (payload.preferences) return payload.preferences;
  if (data.settings) return data.settings;
  if (data.preferences) return data.preferences;
  if (Object.keys(data).length) return data;

  return payload;
}

function normalizeDigest(value: unknown): DigestFrequency {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "daily") return "daily";
  if (normalized === "weekly") return "weekly";

  return "none";
}

function normalizeQuietMode(value: unknown): QuietMode {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "enabled" || normalized === "true" || normalized === "on") {
    return "enabled";
  }

  return "disabled";
}

function normalizeSettings(value: unknown, locale: Locale): NotificationSettings {
  const defaults = createDefaultSettings(locale);
  const item = asRecord(value);

  return {
    enabled: toBoolean(item.enabled ?? item.notifications_enabled, defaults.enabled),
    in_app_enabled: toBoolean(item.in_app_enabled ?? item.in_app, defaults.in_app_enabled),
    email_enabled: toBoolean(item.email_enabled ?? item.email_notifications, defaults.email_enabled),
    whatsapp_enabled: toBoolean(item.whatsapp_enabled ?? item.whatsapp_notifications, defaults.whatsapp_enabled),
    push_enabled: toBoolean(item.push_enabled ?? item.push_notifications, defaults.push_enabled),

    notify_info: toBoolean(item.notify_info ?? item.info_enabled, defaults.notify_info),
    notify_success: toBoolean(item.notify_success ?? item.success_enabled, defaults.notify_success),
    notify_warning: toBoolean(item.notify_warning ?? item.warning_enabled, defaults.notify_warning),
    notify_error: toBoolean(item.notify_error ?? item.error_enabled, defaults.notify_error),
    notify_critical: toBoolean(item.notify_critical ?? item.critical_enabled, defaults.notify_critical),

    orders_enabled: toBoolean(item.orders_enabled ?? item.order_notifications, defaults.orders_enabled),
    invoices_enabled: toBoolean(item.invoices_enabled ?? item.invoice_notifications, defaults.invoices_enabled),
    payments_enabled: toBoolean(item.payments_enabled ?? item.payment_notifications, defaults.payments_enabled),
    customers_enabled: toBoolean(item.customers_enabled ?? item.customer_notifications, defaults.customers_enabled),
    providers_enabled: toBoolean(item.providers_enabled ?? item.provider_notifications, defaults.providers_enabled),
    whatsapp_events_enabled: toBoolean(item.whatsapp_events_enabled ?? item.whatsapp_event_notifications, defaults.whatsapp_events_enabled),
    system_events_enabled: toBoolean(item.system_events_enabled ?? item.system_notifications, defaults.system_events_enabled),

    digest_frequency: normalizeDigest(item.digest_frequency ?? item.digest),
    quiet_mode: normalizeQuietMode(item.quiet_mode ?? item.quiet_hours_enabled),
    quiet_from: normalizeText(item.quiet_from ?? item.quiet_hours_from),
    quiet_to: normalizeText(item.quiet_to ?? item.quiet_hours_to),
    preferred_language: normalizeText(item.preferred_language) === "en" ? "en" : "ar",
    timezone: normalizeText(item.timezone, defaults.timezone),

    email_address: normalizeText(item.email_address ?? item.notification_email),
    whatsapp_number: normalizeText(item.whatsapp_number ?? item.notification_whatsapp),
  };
}

function buildPayload(settings: NotificationSettings) {
  return {
    enabled: settings.enabled,
    notifications_enabled: settings.enabled,

    in_app_enabled: settings.in_app_enabled,
    email_enabled: settings.email_enabled,
    whatsapp_enabled: settings.whatsapp_enabled,
    push_enabled: settings.push_enabled,

    notify_info: settings.notify_info,
    notify_success: settings.notify_success,
    notify_warning: settings.notify_warning,
    notify_error: settings.notify_error,
    notify_critical: settings.notify_critical,

    orders_enabled: settings.orders_enabled,
    invoices_enabled: settings.invoices_enabled,
    payments_enabled: settings.payments_enabled,
    customers_enabled: settings.customers_enabled,
    providers_enabled: settings.providers_enabled,
    whatsapp_events_enabled: settings.whatsapp_events_enabled,
    system_events_enabled: settings.system_events_enabled,

    digest_frequency: settings.digest_frequency,
    quiet_mode: settings.quiet_mode,
    quiet_hours_enabled: settings.quiet_mode === "enabled",
    quiet_from: settings.quiet_from,
    quiet_to: settings.quiet_to,
    preferred_language: settings.preferred_language,
    timezone: settings.timezone,

    email_address: settings.email_address.trim().toLowerCase(),
    whatsapp_number: normalizePhone(settings.whatsapp_number),
  };
}

function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[112px] px-6 py-5">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>

        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          {value}
        </CardTitle>

        <CardAction>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardAction>

        <div className="pt-1">
          <Badge
            variant="outline"
            className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {trend}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}

function SettingSwitch({
  label,
  description,
  checked,
  disabled,
  onChange,
  icon: Icon,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-4 transition hover:bg-muted/20",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(Boolean(value))}
        className="mt-1"
      />

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </label>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-left text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-lg border bg-card shadow-none">
            <CardHeader className="min-h-[112px] px-6 py-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-5 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-7 w-32" />
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SystemNotificationSettingsPage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [settings, setSettings] = React.useState<NotificationSettings>(() =>
    createDefaultSettings("ar"),
  );
  const [loadedSettings, setLoadedSettings] = React.useState<NotificationSettings | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const activeChannels = [
    settings.in_app_enabled,
    settings.email_enabled,
    settings.whatsapp_enabled,
    settings.push_enabled,
  ].filter(Boolean).length;

  const activeSeverities = [
    settings.notify_info,
    settings.notify_success,
    settings.notify_warning,
    settings.notify_error,
    settings.notify_critical,
  ].filter(Boolean).length;

  const activeModules = [
    settings.orders_enabled,
    settings.invoices_enabled,
    settings.payments_enabled,
    settings.customers_enabled,
    settings.providers_enabled,
    settings.whatsapp_events_enabled,
    settings.system_events_enabled,
  ].filter(Boolean).length;

  const isReady =
    settings.enabled &&
    activeChannels > 0 &&
    activeSeverities > 0 &&
    activeModules > 0 &&
    (settings.quiet_mode === "disabled" || Boolean(settings.quiet_from && settings.quiet_to));

  React.useEffect(() => {
    const applyLocale = () => {
      const nextLocale = getInitialLocale();

      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
      document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
    };

    applyLocale();

    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  const loadSettings = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const payload = await requestNotificationApi<ApiResponse>(
          ["/settings/", "/preferences/", "/settings/me/", "/preferences/me/"],
          {
            signal: controller.signal,
          },
        );

        const nextSettings = normalizeSettings(extractSettingsPayload(payload), locale);

        setSettings(nextSettings);
        setLoadedSettings(nextSettings);
        if (silent) toast.success(t.loaded);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [locale, t.errorDesc, t.loaded],
  );

  React.useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function updateSetting<T extends keyof NotificationSettings>(
    key: T,
    value: NotificationSettings[T],
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetToLoaded() {
    if (!loadedSettings) return;

    setSettings(loadedSettings);
    toast.success(t.resetDone);
  }

  function validate() {
    if (settings.email_address && !isValidEmail(settings.email_address)) {
      toast.error(t.invalidEmail);
      return false;
    }

    if (settings.quiet_mode === "enabled" && (!settings.quiet_from || !settings.quiet_to)) {
      toast.error(t.invalidQuietHours);
      return false;
    }

    return true;
  }

  async function saveSettings() {
    if (!validate()) return;

    setSaving(true);
    setError("");

    try {
      const payloadBody = buildPayload(settings);

      const payload = await requestNotificationApi<ApiResponse>(
        ["/settings/", "/preferences/", "/settings/me/", "/preferences/me/"],
        {
          method: "POST",
          body: payloadBody,
        },
      );

      const nextSettings = normalizeSettings(
        extractSettingsPayload(payload) || payloadBody,
        locale,
      );

      setSettings(nextSettings);
      setLoadedSettings(nextSettings);
      toast.success(t.saved);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.saveError;

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-right">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadSettings({ silent: true })}
            disabled={refreshing || saving}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={resetToLoaded}
            disabled={saving || !loadedSettings}
          >
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </Button>

          <Button
            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
            disabled={saving}
            onClick={() => void saveSettings()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? t.saving : t.save}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 text-right">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">{t.errorTitle}</p>
                <p className="text-sm text-red-700">{error || t.errorDesc}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadSettings()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.masterSwitch}
          value={settings.enabled ? t.enabled : t.disabled}
          trend={isReady ? t.complete : t.incomplete}
          icon={Bell}
        />

        <KpiCard
          title={t.activeChannels}
          value={formatInteger(activeChannels)}
          trend={`${formatInteger(activeChannels)} / 4`}
          icon={MessageCircle}
        />

        <KpiCard
          title={t.activeSeverities}
          value={formatInteger(activeSeverities)}
          trend={`${formatInteger(activeSeverities)} / 5`}
          icon={ShieldAlert}
        />

        <KpiCard
          title={t.quietStatus}
          value={settings.quiet_mode === "enabled" ? t.enabled : t.disabled}
          trend={settings.digest_frequency === "none" ? t.none : settings.digest_frequency === "daily" ? t.daily : t.weekly}
          icon={Clock3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.channels}</CardTitle>
              <CardDescription>{t.channelsDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pb-6">
              <SettingSwitch
                label={t.masterSwitch}
                description={settings.enabled ? t.enabled : t.disabled}
                checked={settings.enabled}
                disabled={saving}
                icon={Bell}
                onChange={(checked) => updateSetting("enabled", checked)}
              />

              <div className="grid gap-3 md:grid-cols-2">
                <SettingSwitch
                  label={t.inApp}
                  checked={settings.in_app_enabled}
                  disabled={saving || !settings.enabled}
                  icon={Settings}
                  onChange={(checked) => updateSetting("in_app_enabled", checked)}
                />
                <SettingSwitch
                  label={t.email}
                  checked={settings.email_enabled}
                  disabled={saving || !settings.enabled}
                  icon={Mail}
                  onChange={(checked) => updateSetting("email_enabled", checked)}
                />
                <SettingSwitch
                  label={t.whatsapp}
                  checked={settings.whatsapp_enabled}
                  disabled={saving || !settings.enabled}
                  icon={MessageCircle}
                  onChange={(checked) => updateSetting("whatsapp_enabled", checked)}
                />
                <SettingSwitch
                  label={t.push}
                  checked={settings.push_enabled}
                  disabled={saving || !settings.enabled}
                  icon={Smartphone}
                  onChange={(checked) => updateSetting("push_enabled", checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.severity}</CardTitle>
              <CardDescription>{t.severityDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 px-6 pb-6 md:grid-cols-2 xl:grid-cols-3">
              <SettingSwitch label={t.info} checked={settings.notify_info} disabled={saving || !settings.enabled} icon={Bell} onChange={(checked) => updateSetting("notify_info", checked)} />
              <SettingSwitch label={t.success} checked={settings.notify_success} disabled={saving || !settings.enabled} icon={CheckCircle2} onChange={(checked) => updateSetting("notify_success", checked)} />
              <SettingSwitch label={t.warning} checked={settings.notify_warning} disabled={saving || !settings.enabled} icon={TriangleAlert} onChange={(checked) => updateSetting("notify_warning", checked)} />
              <SettingSwitch label={t.error} checked={settings.notify_error} disabled={saving || !settings.enabled} icon={XCircle} onChange={(checked) => updateSetting("notify_error", checked)} />
              <SettingSwitch label={t.critical} checked={settings.notify_critical} disabled={saving || !settings.enabled} icon={ShieldAlert} onChange={(checked) => updateSetting("notify_critical", checked)} />
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.modules}</CardTitle>
              <CardDescription>{t.modulesDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-3 px-6 pb-6 md:grid-cols-2 xl:grid-cols-3">
              <SettingSwitch label={t.orders} checked={settings.orders_enabled} disabled={saving || !settings.enabled} icon={Bell} onChange={(checked) => updateSetting("orders_enabled", checked)} />
              <SettingSwitch label={t.invoices} checked={settings.invoices_enabled} disabled={saving || !settings.enabled} icon={Bell} onChange={(checked) => updateSetting("invoices_enabled", checked)} />
              <SettingSwitch label={t.payments} checked={settings.payments_enabled} disabled={saving || !settings.enabled} icon={Bell} onChange={(checked) => updateSetting("payments_enabled", checked)} />
              <SettingSwitch label={t.customers} checked={settings.customers_enabled} disabled={saving || !settings.enabled} icon={Bell} onChange={(checked) => updateSetting("customers_enabled", checked)} />
              <SettingSwitch label={t.providers} checked={settings.providers_enabled} disabled={saving || !settings.enabled} icon={Bell} onChange={(checked) => updateSetting("providers_enabled", checked)} />
              <SettingSwitch label={t.whatsappEvents} checked={settings.whatsapp_events_enabled} disabled={saving || !settings.enabled} icon={MessageCircle} onChange={(checked) => updateSetting("whatsapp_events_enabled", checked)} />
              <SettingSwitch label={t.systemEvents} checked={settings.system_events_enabled} disabled={saving || !settings.enabled} icon={Settings} onChange={(checked) => updateSetting("system_events_enabled", checked)} />
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.preferences}</CardTitle>
              <CardDescription>{t.preferencesDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <FieldLabel>{t.digestFrequency}</FieldLabel>
                <Select
                  value={settings.digest_frequency}
                  disabled={saving}
                  onValueChange={(value) => updateSetting("digest_frequency", value as DigestFrequency)}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.none}</SelectItem>
                    <SelectItem value="daily">{t.daily}</SelectItem>
                    <SelectItem value="weekly">{t.weekly}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.preferredLanguage}</FieldLabel>
                <Select
                  value={settings.preferred_language}
                  disabled={saving}
                  onValueChange={(value) => updateSetting("preferred_language", value as Locale)}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel>{t.timezone}</FieldLabel>
                <Input
                  value={settings.timezone}
                  onChange={(event) => updateSetting("timezone", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.quietHours}</CardTitle>
              <CardDescription>{t.quietHoursDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-3">
              <div className="space-y-2">
                <FieldLabel>{t.quietMode}</FieldLabel>
                <Select
                  value={settings.quiet_mode}
                  disabled={saving}
                  onValueChange={(value) => updateSetting("quiet_mode", value as QuietMode)}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">{t.disabled}</SelectItem>
                    <SelectItem value="enabled">{t.enabled}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.quietFrom}</FieldLabel>
                <Input
                  type="time"
                  value={settings.quiet_from}
                  onChange={(event) => updateSetting("quiet_from", event.target.value)}
                  disabled={saving || settings.quiet_mode === "disabled"}
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.quietTo}</FieldLabel>
                <Input
                  type="time"
                  value={settings.quiet_to}
                  onChange={(event) => updateSetting("quiet_to", event.target.value)}
                  disabled={saving || settings.quiet_mode === "disabled"}
                  className="h-10 rounded-lg bg-background"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.contact}</CardTitle>
              <CardDescription>{t.contactDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>{t.emailAddress}</FieldLabel>
                <Input
                  value={settings.email_address}
                  onChange={(event) => updateSetting("email_address", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.whatsappNumber}</FieldLabel>
                <Input
                  value={settings.whatsapp_number}
                  onChange={(event) => updateSetting("whatsapp_number", normalizePhone(event.target.value))}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{t.summary}</CardTitle>
                  <CardDescription>{t.readiness}</CardDescription>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 px-6 pb-6">
              <InfoRow label={t.masterSwitch} value={settings.enabled ? t.enabled : t.disabled} />
              <InfoRow label={t.activeChannels} value={`${formatInteger(activeChannels)} / 4`} />
              <InfoRow label={t.activeSeverities} value={`${formatInteger(activeSeverities)} / 5`} />
              <InfoRow label={t.activeModules} value={`${formatInteger(activeModules)} / 7`} />
              <InfoRow label={t.digestFrequency} value={settings.digest_frequency === "none" ? t.none : settings.digest_frequency === "daily" ? t.daily : t.weekly} />
              <InfoRow label={t.quietMode} value={settings.quiet_mode === "enabled" ? t.enabled : t.disabled} />
              <InfoRow label={t.quietFrom} value={settings.quiet_from || "—"} />
              <InfoRow label={t.quietTo} value={settings.quiet_to || "—"} />
              <InfoRow label={t.preferredLanguage} value={settings.preferred_language === "ar" ? "العربية" : "English"} />
              <InfoRow label={t.timezone} value={settings.timezone || "—"} />
              <InfoRow label={t.readiness} value={isReady ? t.complete : t.incomplete} />

              <div className="grid gap-2 pt-4">
                <Button
                  className="h-10 rounded-lg bg-black text-white hover:bg-black/90"
                  disabled={saving}
                  onClick={() => void saveSettings()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? t.saving : t.save}
                </Button>

                <Button
                  variant="outline"
                  className="h-10 rounded-lg bg-background"
                  disabled={saving || !loadedSettings}
                  onClick={resetToLoaded}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.masterSwitch}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {settings.enabled ? t.enabled : t.disabled}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.activeChannels}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatInteger(activeChannels)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.activeSeverities}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatInteger(activeSeverities)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Clock3 className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.quietStatus}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {settings.quiet_mode === "enabled" ? t.enabled : t.disabled}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                {isReady ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <TriangleAlert className="h-5 w-5 text-amber-600" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.readiness}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {isReady ? t.complete : t.incomplete}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}