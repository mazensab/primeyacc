"use client";

/* ============================================================
   📂 primey_frontend/app/system/whatsapp/settings/page.tsx
   ⚙️ Primey Care — WhatsApp Settings
   ------------------------------------------------------------
   ✅ Same approved Products / Customers / Orders operational pattern
   ✅ Real API only:
      GET  /api/whatsapp/settings/
      POST /api/whatsapp/settings/
      POST /api/whatsapp/settings/update/ fallback
   ✅ Header / KPI cards / settings form / summary side card
   ✅ Skeleton loading
   ✅ Error state
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Globe2,
  KeyRound,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  Webhook,
  Wifi,
  WifiOff,
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
type SessionMode = "qr" | "pairing_code" | "manual";
type ProviderMode = "whatsapp_web_session" | "meta_cloud_api" | "custom";

type ApiRecord = Record<string, unknown>;

type WhatsAppConfig = {
  id: number | null;
  provider: ProviderMode | string;
  is_enabled: boolean;
  is_active: boolean;

  app_name: string;
  business_name: string;
  phone_number: string;
  phone_number_id: string;
  business_account_id: string;
  app_id: string;
  api_version: string;

  access_token: string;
  access_token_masked: string;

  webhook_callback_url: string;
  webhook_verify_token: string;
  webhook_verify_token_masked: string;

  default_language_code: Locale | string;
  default_country_code: string;

  allow_broadcasts: boolean;
  send_test_enabled: boolean;
  default_test_recipient: string;

  session_name: string;
  session_mode: SessionMode | string;
  session_status: string;
  session_connected_phone: string;
  session_device_label: string;
  session_qr_code: string;
  session_pairing_code: string;
  session_last_connected_at: string | null;

  last_health_check_at: string | null;
  last_error_message: string;

  created_at: string | null;
  updated_at: string | null;
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  config?: unknown;
  data?: unknown;
};

const translations = {
  ar: {
    title: "إعدادات واتساب",
    subtitle: "إدارة اتصال واتساب، بيانات النشاط، إعدادات Meta، Webhook، الجلسة، والبث.",
    back: "واتساب",
    refresh: "تحديث",
    save: "حفظ الإعدادات",
    saving: "جاري الحفظ",
    reset: "إعادة ضبط",
    settings: "الإعدادات",

    connectionStatus: "حالة الاتصال",
    activeStatus: "حالة التفعيل",
    broadcasts: "البث",
    testSending: "الإرسال التجريبي",

    enabled: "مفعل",
    disabled: "معطل",
    active: "نشط",
    inactive: "غير نشط",
    connected: "متصل",
    disconnected: "غير متصل",
    configured: "مكتمل",
    incomplete: "غير مكتمل",

    basicSettings: "الإعدادات الأساسية",
    basicSettingsDesc: "التحكم في تفعيل واتساب والمزود المستخدم وبيانات النشاط.",
    businessSettings: "بيانات النشاط",
    businessSettingsDesc: "بيانات حساب واتساب التجاري والمعلومات العامة.",
    metaSettings: "إعدادات Meta / Cloud API",
    metaSettingsDesc: "حقول Meta تستخدم عند تفعيل مزود Cloud API أو التوافق الخلفي.",
    webhookSettings: "إعدادات Webhook",
    webhookSettingsDesc: "بيانات استقبال أحداث واتساب وربطها بالباكند.",
    defaultsSettings: "الإعدادات الافتراضية",
    defaultsSettingsDesc: "اللغة، الدولة، البث، والإرسال التجريبي.",
    sessionSettings: "إعدادات الجلسة",
    sessionSettingsDesc: "إعدادات جلسة WhatsApp Web / Baileys.",
    summary: "ملخص الإعدادات",
    summaryDesc: "الحالة الحالية لإعدادات واتساب.",

    provider: "المزود",
    whatsappWebSession: "WhatsApp Web Session",
    metaCloudApi: "Meta Cloud API",
    customProvider: "مزود مخصص",

    isEnabled: "تشغيل واتساب",
    isActive: "اعتباره نشطًا في النظام",

    appName: "اسم التطبيق",
    businessName: "اسم النشاط",
    phoneNumber: "رقم واتساب",
    phoneNumberId: "Phone Number ID",
    businessAccountId: "Business Account ID",
    appId: "App ID",
    apiVersion: "إصدار API",
    accessToken: "Access Token",
    accessTokenMasked: "التوكن الحالي",
    webhookCallbackUrl: "Webhook Callback URL",
    webhookVerifyToken: "Webhook Verify Token",
    webhookVerifyTokenMasked: "Verify Token الحالي",

    defaultLanguageCode: "اللغة الافتراضية",
    defaultCountryCode: "مفتاح الدولة",
    allowBroadcasts: "السماح بالبث",
    sendTestEnabled: "السماح بالإرسال التجريبي",
    defaultTestRecipient: "رقم الاختبار الافتراضي",

    sessionName: "اسم الجلسة",
    sessionMode: "وضع الجلسة",
    qrMode: "QR",
    pairingCodeMode: "Pairing Code",
    manualMode: "Manual",
    sessionStatus: "حالة الجلسة",
    sessionConnectedPhone: "الرقم المتصل",
    sessionDeviceLabel: "اسم الجهاز",
    sessionLastConnectedAt: "آخر اتصال",
    lastHealthCheckAt: "آخر فحص",
    lastErrorMessage: "آخر خطأ",

    noToken: "غير محفوظ",
    noError: "لا توجد أخطاء",
    saved: "تم حفظ إعدادات واتساب بنجاح.",
    loaded: "تم تحديث إعدادات واتساب.",
    resetDone: "تمت إعادة الإعدادات لآخر نسخة محملة.",
    errorTitle: "تعذر تحميل إعدادات واتساب",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    saveError: "تعذر حفظ إعدادات واتساب.",
    tryAgain: "إعادة المحاولة",
    requiredSession: "اسم الجلسة مطلوب.",
    requiredBusiness: "اسم النشاط مطلوب.",
    copied: "تم النسخ",
    copy: "نسخ",
    unknown: "غير محدد",
  },
  en: {
    title: "WhatsApp Settings",
    subtitle: "Manage WhatsApp connection, business data, Meta settings, webhook, session, and broadcasts.",
    back: "WhatsApp",
    refresh: "Refresh",
    save: "Save settings",
    saving: "Saving",
    reset: "Reset",
    settings: "Settings",

    connectionStatus: "Connection status",
    activeStatus: "Activation status",
    broadcasts: "Broadcasts",
    testSending: "Test sending",

    enabled: "Enabled",
    disabled: "Disabled",
    active: "Active",
    inactive: "Inactive",
    connected: "Connected",
    disconnected: "Disconnected",
    configured: "Complete",
    incomplete: "Incomplete",

    basicSettings: "Basic settings",
    basicSettingsDesc: "Control WhatsApp activation, provider, and business data.",
    businessSettings: "Business data",
    businessSettingsDesc: "WhatsApp business account and general information.",
    metaSettings: "Meta / Cloud API settings",
    metaSettingsDesc: "Meta fields are used with Cloud API provider or backward compatibility.",
    webhookSettings: "Webhook settings",
    webhookSettingsDesc: "Receive WhatsApp events and connect them to the backend.",
    defaultsSettings: "Default settings",
    defaultsSettingsDesc: "Language, country, broadcasts, and test sending.",
    sessionSettings: "Session settings",
    sessionSettingsDesc: "WhatsApp Web / Baileys session settings.",
    summary: "Settings summary",
    summaryDesc: "Current WhatsApp settings status.",

    provider: "Provider",
    whatsappWebSession: "WhatsApp Web Session",
    metaCloudApi: "Meta Cloud API",
    customProvider: "Custom provider",

    isEnabled: "Enable WhatsApp",
    isActive: "Mark as active in system",

    appName: "App name",
    businessName: "Business name",
    phoneNumber: "WhatsApp number",
    phoneNumberId: "Phone Number ID",
    businessAccountId: "Business Account ID",
    appId: "App ID",
    apiVersion: "API version",
    accessToken: "Access Token",
    accessTokenMasked: "Current token",
    webhookCallbackUrl: "Webhook Callback URL",
    webhookVerifyToken: "Webhook Verify Token",
    webhookVerifyTokenMasked: "Current verify token",

    defaultLanguageCode: "Default language",
    defaultCountryCode: "Country code",
    allowBroadcasts: "Allow broadcasts",
    sendTestEnabled: "Allow test sending",
    defaultTestRecipient: "Default test recipient",

    sessionName: "Session name",
    sessionMode: "Session mode",
    qrMode: "QR",
    pairingCodeMode: "Pairing Code",
    manualMode: "Manual",
    sessionStatus: "Session status",
    sessionConnectedPhone: "Connected phone",
    sessionDeviceLabel: "Device label",
    sessionLastConnectedAt: "Last connected",
    lastHealthCheckAt: "Last health check",
    lastErrorMessage: "Last error",

    noToken: "Not saved",
    noError: "No errors",
    saved: "WhatsApp settings saved successfully.",
    loaded: "WhatsApp settings refreshed.",
    resetDone: "Settings restored to the last loaded version.",
    errorTitle: "Unable to load WhatsApp settings",
    errorDesc: "Make sure the backend is running, then try again.",
    saveError: "Unable to save WhatsApp settings.",
    tryAgain: "Try again",
    requiredSession: "Session name is required.",
    requiredBusiness: "Business name is required.",
    copied: "Copied",
    copy: "Copy",
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

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (["1", "true", "yes", "on", "enabled", "active", "connected"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off", "disabled", "inactive", "disconnected"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).replace("T", " ").slice(0, 16);
  }

  return parsed.toISOString().replace("T", " ").slice(0, 16);
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

function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
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
    method?: "GET" | "POST";
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
      ...(options?.method === "POST" ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method === "POST"
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

function extractConfig(payload: ApiResponse) {
  if (payload.config) return payload.config;

  const data = asRecord(payload.data);
  if (data.config) return data.config;

  return data;
}

function normalizeConfig(value: unknown): WhatsAppConfig {
  const item = asRecord(value);

  return {
    id: item.id === null || item.id === undefined ? null : toNumber(item.id),
    provider: normalizeText(item.provider || "whatsapp_web_session") as ProviderMode,
    is_enabled: toBoolean(item.is_enabled),
    is_active: toBoolean(item.is_active),

    app_name: normalizeText(item.app_name || item.business_name || "Primey Care"),
    business_name: normalizeText(item.business_name || item.app_name || "Primey Care"),
    phone_number: normalizeText(item.phone_number),
    phone_number_id: normalizeText(item.phone_number_id),
    business_account_id: normalizeText(item.business_account_id),
    app_id: normalizeText(item.app_id),
    api_version: normalizeText(item.api_version || "v22.0"),

    access_token: "",
    access_token_masked: normalizeText(item.access_token_masked),

    webhook_callback_url: normalizeText(item.webhook_callback_url),
    webhook_verify_token: "",
    webhook_verify_token_masked: normalizeText(item.webhook_verify_token_masked),

    default_language_code: normalizeText(item.default_language_code || "ar"),
    default_country_code: normalizeText(item.default_country_code || "966"),

    allow_broadcasts: toBoolean(item.allow_broadcasts, true),
    send_test_enabled: toBoolean(item.send_test_enabled, true),
    default_test_recipient: normalizeText(item.default_test_recipient),

    session_name: normalizeText(item.session_name || "primey-care-system-session"),
    session_mode: normalizeText(item.session_mode || "qr"),
    session_status: normalizeText(item.session_status || "disconnected"),
    session_connected_phone: normalizeText(item.session_connected_phone),
    session_device_label: normalizeText(item.session_device_label),
    session_qr_code: normalizeText(item.session_qr_code),
    session_pairing_code: normalizeText(item.session_pairing_code),
    session_last_connected_at: normalizeText(item.session_last_connected_at) || null,

    last_health_check_at: normalizeText(item.last_health_check_at) || null,
    last_error_message: normalizeText(item.last_error_message),

    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function buildPayload(config: WhatsAppConfig) {
  return {
    provider: config.provider,
    is_enabled: config.is_enabled,
    is_active: config.is_active,

    app_name: config.business_name.trim(),
    business_name: config.business_name.trim(),
    phone_number: normalizePhone(config.phone_number),
    phone_number_id: config.phone_number_id.trim(),
    business_account_id: config.business_account_id.trim(),
    app_id: config.app_id.trim(),
    api_version: config.api_version.trim(),

    access_token: config.access_token.trim(),
    webhook_callback_url: config.webhook_callback_url.trim(),
    webhook_verify_token: config.webhook_verify_token.trim(),

    default_language_code: config.default_language_code,
    default_country_code: normalizeText(config.default_country_code || "966"),

    allow_broadcasts: config.allow_broadcasts,
    send_test_enabled: config.send_test_enabled,
    default_test_recipient: normalizePhone(config.default_test_recipient),

    session_name: config.session_name.trim(),
    session_mode: config.session_mode,
    session_status: config.session_status.trim() || "disconnected",
    session_connected_phone: normalizePhone(config.session_connected_phone),
    session_device_label: config.session_device_label.trim(),
  };
}

function getConnectionLabel(config: WhatsAppConfig, locale: Locale) {
  const t = translations[locale];
  const status = config.session_status.toLowerCase();

  if (status === "connected" || config.session_connected_phone) return t.connected;
  return t.disconnected;
}

function getConnectionClass(config: WhatsAppConfig) {
  const status = config.session_status.toLowerCase();

  if (status === "connected" || config.session_connected_phone) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status.includes("error") || status.includes("failed")) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function SettingCheckbox({
  checked,
  disabled,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description?: string;
  onChange: (checked: boolean) => void;
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
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </label>
  );
}

function InfoRow({
  label,
  value,
  dir,
  copyLabel,
  copyable,
  onCopy,
}: {
  label: string;
  value: React.ReactNode;
  dir?: "ltr" | "rtl";
  copyLabel?: string;
  copyable?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-foreground">
        <span className="truncate" dir={dir}>
          {value}
        </span>
        {copyable ? (
          <button
            type="button"
            onClick={onCopy}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {copyLabel || "Copy"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SystemWhatsAppSettingsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [config, setConfig] = React.useState<WhatsAppConfig>(() => normalizeConfig({}));
  const [loadedConfig, setLoadedConfig] = React.useState<WhatsAppConfig | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const isConnected =
    config.session_status.toLowerCase() === "connected" || Boolean(config.session_connected_phone);

  const isConfigured =
    Boolean(config.business_name.trim()) &&
    Boolean(config.session_name.trim()) &&
    Boolean(config.provider.trim());

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

        const payload = await fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/settings/"), {
          signal: controller.signal,
        });

        const nextConfig = normalizeConfig(extractConfig(payload));

        setConfig(nextConfig);
        setLoadedConfig(nextConfig);

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
    [t.errorDesc, t.loaded],
  );

  React.useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function updateConfig<T extends keyof WhatsAppConfig>(key: T, value: WhatsAppConfig[T]) {
    setConfig((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetToLoaded() {
    if (!loadedConfig) return;

    setConfig(loadedConfig);
    toast.success(t.resetDone);
  }

  function validate() {
    if (!config.business_name.trim()) {
      toast.error(t.requiredBusiness);
      return false;
    }

    if (!config.session_name.trim()) {
      toast.error(t.requiredSession);
      return false;
    }

    return true;
  }

  async function saveSettings() {
    if (!validate()) return;

    setSaving(true);
    setError("");

    const body = buildPayload(config);

    try {
      let payload: ApiResponse;

      try {
        payload = await fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/settings/"), {
          method: "POST",
          body,
        });
      } catch {
        payload = await fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/settings/update/"), {
          method: "POST",
          body,
        });
      }

      const nextConfig = normalizeConfig(extractConfig(payload));

      setConfig(nextConfig);
      setLoadedConfig(nextConfig);
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

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.saveError);
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
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/whatsapp">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
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
            disabled={saving || !loadedConfig}
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.connectionStatus}
          value={getConnectionLabel(config, locale)}
          trend={config.session_connected_phone || config.session_status || "—"}
          icon={isConnected ? Wifi : WifiOff}
        />

        <KpiCard
          title={t.activeStatus}
          value={config.is_enabled ? t.enabled : t.disabled}
          trend={config.is_active ? t.active : t.inactive}
          icon={CheckCircle2}
        />

        <KpiCard
          title={t.broadcasts}
          value={config.allow_broadcasts ? t.enabled : t.disabled}
          trend={config.default_country_code || "966"}
          icon={MessageCircle}
        />

        <KpiCard
          title={t.testSending}
          value={config.send_test_enabled ? t.enabled : t.disabled}
          trend={config.default_test_recipient || "—"}
          icon={Phone}
        />
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.basicSettings}</CardTitle>
              <CardDescription>{t.basicSettingsDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <FieldLabel>{t.provider}</FieldLabel>
                <Select
                  value={String(config.provider || "whatsapp_web_session")}
                  disabled={saving}
                  onValueChange={(value) => updateConfig("provider", value)}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp_web_session">{t.whatsappWebSession}</SelectItem>
                    <SelectItem value="meta_cloud_api">{t.metaCloudApi}</SelectItem>
                    <SelectItem value="custom">{t.customProvider}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <SettingCheckbox
                checked={config.is_enabled}
                disabled={saving}
                label={t.isEnabled}
                description={config.is_enabled ? t.enabled : t.disabled}
                onChange={(checked) => updateConfig("is_enabled", checked)}
              />

              <SettingCheckbox
                checked={config.is_active}
                disabled={saving}
                label={t.isActive}
                description={config.is_active ? t.active : t.inactive}
                onChange={(checked) => updateConfig("is_active", checked)}
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.businessSettings}</CardTitle>
              <CardDescription>{t.businessSettingsDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>{t.businessName}</FieldLabel>
                <Input
                  value={config.business_name}
                  onChange={(event) => updateConfig("business_name", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.phoneNumber}</FieldLabel>
                <Input
                  value={config.phone_number}
                  onChange={(event) => updateConfig("phone_number", normalizePhone(event.target.value))}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.defaultLanguageCode}</FieldLabel>
                <Select
                  value={String(config.default_language_code || "ar")}
                  disabled={saving}
                  onValueChange={(value) => updateConfig("default_language_code", value)}
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

              <div className="space-y-2">
                <FieldLabel>{t.defaultCountryCode}</FieldLabel>
                <Input
                  value={config.default_country_code}
                  onChange={(event) =>
                    updateConfig("default_country_code", normalizePhone(event.target.value))
                  }
                  disabled={saving}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.metaSettings}</CardTitle>
              <CardDescription>{t.metaSettingsDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>{t.phoneNumberId}</FieldLabel>
                <Input
                  value={config.phone_number_id}
                  onChange={(event) => updateConfig("phone_number_id", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.businessAccountId}</FieldLabel>
                <Input
                  value={config.business_account_id}
                  onChange={(event) => updateConfig("business_account_id", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.appId}</FieldLabel>
                <Input
                  value={config.app_id}
                  onChange={(event) => updateConfig("app_id", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.apiVersion}</FieldLabel>
                <Input
                  value={config.api_version}
                  onChange={(event) => updateConfig("api_version", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel>{t.accessToken}</FieldLabel>
                <Input
                  value={config.access_token}
                  onChange={(event) => updateConfig("access_token", event.target.value)}
                  disabled={saving}
                  placeholder={config.access_token_masked || t.noToken}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                  type="password"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.webhookSettings}</CardTitle>
              <CardDescription>{t.webhookSettingsDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6">
              <div className="space-y-2">
                <FieldLabel>{t.webhookCallbackUrl}</FieldLabel>
                <Input
                  value={config.webhook_callback_url}
                  onChange={(event) => updateConfig("webhook_callback_url", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.webhookVerifyToken}</FieldLabel>
                <Input
                  value={config.webhook_verify_token}
                  onChange={(event) => updateConfig("webhook_verify_token", event.target.value)}
                  disabled={saving}
                  placeholder={config.webhook_verify_token_masked || t.noToken}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                  type="password"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.defaultsSettings}</CardTitle>
              <CardDescription>{t.defaultsSettingsDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <SettingCheckbox
                checked={config.allow_broadcasts}
                disabled={saving}
                label={t.allowBroadcasts}
                description={config.allow_broadcasts ? t.enabled : t.disabled}
                onChange={(checked) => updateConfig("allow_broadcasts", checked)}
              />

              <SettingCheckbox
                checked={config.send_test_enabled}
                disabled={saving}
                label={t.sendTestEnabled}
                description={config.send_test_enabled ? t.enabled : t.disabled}
                onChange={(checked) => updateConfig("send_test_enabled", checked)}
              />

              <div className="space-y-2 md:col-span-2">
                <FieldLabel>{t.defaultTestRecipient}</FieldLabel>
                <Input
                  value={config.default_test_recipient}
                  onChange={(event) =>
                    updateConfig("default_test_recipient", normalizePhone(event.target.value))
                  }
                  disabled={saving}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.sessionSettings}</CardTitle>
              <CardDescription>{t.sessionSettingsDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>{t.sessionName}</FieldLabel>
                <Input
                  value={config.session_name}
                  onChange={(event) => updateConfig("session_name", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.sessionMode}</FieldLabel>
                <Select
                  value={String(config.session_mode || "qr")}
                  disabled={saving}
                  onValueChange={(value) => updateConfig("session_mode", value)}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qr">{t.qrMode}</SelectItem>
                    <SelectItem value="pairing_code">{t.pairingCodeMode}</SelectItem>
                    <SelectItem value="manual">{t.manualMode}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.sessionStatus}</FieldLabel>
                <Input
                  value={config.session_status}
                  onChange={(event) => updateConfig("session_status", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.sessionConnectedPhone}</FieldLabel>
                <Input
                  value={config.session_connected_phone}
                  onChange={(event) =>
                    updateConfig("session_connected_phone", normalizePhone(event.target.value))
                  }
                  disabled={saving}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel>{t.sessionDeviceLabel}</FieldLabel>
                <Input
                  value={config.session_device_label}
                  onChange={(event) => updateConfig("session_device_label", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
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
                  <CardDescription>{t.summaryDesc}</CardDescription>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 px-6 pb-6">
              <InfoRow label={t.connectionStatus} value={getConnectionLabel(config, locale)} />
              <InfoRow label={t.isEnabled} value={config.is_enabled ? t.enabled : t.disabled} />
              <InfoRow label={t.isActive} value={config.is_active ? t.active : t.inactive} />
              <InfoRow label={t.provider} value={config.provider || "—"} dir="ltr" />
              <InfoRow label={t.businessName} value={config.business_name || "—"} />
              <InfoRow label={t.phoneNumber} value={config.phone_number || "—"} dir="ltr" />
              <InfoRow label={t.defaultLanguageCode} value={config.default_language_code || "—"} />
              <InfoRow label={t.defaultCountryCode} value={config.default_country_code || "—"} dir="ltr" />
              <InfoRow label={t.allowBroadcasts} value={config.allow_broadcasts ? t.enabled : t.disabled} />
              <InfoRow label={t.sendTestEnabled} value={config.send_test_enabled ? t.enabled : t.disabled} />
              <InfoRow label={t.sessionName} value={config.session_name || "—"} dir="ltr" />
              <InfoRow label={t.sessionMode} value={config.session_mode || "—"} dir="ltr" />
              <InfoRow label={t.sessionStatus} value={config.session_status || "—"} dir="ltr" />
              <InfoRow label={t.sessionConnectedPhone} value={config.session_connected_phone || "—"} dir="ltr" />
              <InfoRow label={t.sessionDeviceLabel} value={config.session_device_label || "—"} />
              <InfoRow label={t.sessionLastConnectedAt} value={formatDateTime(config.session_last_connected_at)} />
              <InfoRow label={t.lastHealthCheckAt} value={formatDateTime(config.last_health_check_at)} />
              <InfoRow label={t.lastErrorMessage} value={config.last_error_message || t.noError} />

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
                  disabled={saving || !loadedConfig}
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
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg border",
                    isConnected ? "bg-emerald-50" : "bg-muted/40",
                  )}
                >
                  {isConnected ? (
                    <Wifi className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.connectionStatus}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-1 rounded-full px-2.5 py-1 text-xs font-medium",
                      getConnectionClass(config),
                    )}
                  >
                    {getConnectionLabel(config, locale)}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.configured}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {isConfigured ? t.configured : t.incomplete}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.sessionName}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {config.session_name || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
                  <Webhook className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.webhookCallbackUrl}</p>
                  <button
                    type="button"
                    className="max-w-full truncate text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => void copyValue(config.webhook_callback_url)}
                    dir="ltr"
                  >
                    {config.webhook_callback_url || "—"}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
                  <KeyRound className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.accessTokenMasked}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {config.access_token_masked || t.noToken}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
                  <Globe2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.apiVersion}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {config.api_version || "—"}
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