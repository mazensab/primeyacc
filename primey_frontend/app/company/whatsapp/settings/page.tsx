"use client";
/* ============================================================
   📂 primey_frontend/app/company/whatsapp/settings/page.tsx
   💬 Mhamcloud — Company WhatsApp Settings Page
   ------------------------------------------------------------
   ✅ Standalone route page, no internal tabs
   ✅ Approved Premium system page pattern
   ✅ Real API only: /api/company/whatsapp/connection/
   ✅ Company WhatsApp connection/settings/QR/pairing/test
   ✅ No company WhatsApp mutation
   ✅ Arabic/English via primey-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */
import * as React from "react";
import Link from "next/link";
import {
  Copy,
  FileText,
  KeyRound,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Phone,
  Power,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Save,
  SendHorizontal,
  Settings2,
  Smartphone,
  Sparkles,
  TriangleAlert,
  Unplug,
  Webhook,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type ConnectionAction = "status" | "qr" | "pairing" | "disconnect" | "test";
type CompanyConnection = {
  id: number;
  provider: string;
  isEnabled: boolean;
  isActive: boolean;
  businessName: string;
  phoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string;
  appId: string;
  hasAccessToken: boolean;
  hasWebhookVerifyToken: boolean;
  webhookCallbackUrl: string;
  webhookVerified: boolean;
  apiVersion: string;
  defaultLanguageCode: string;
  defaultCountryCode: string;
  allowBroadcasts: boolean;
  sendTestEnabled: boolean;
  defaultTestRecipient: string;
  sessionName: string;
  sessionMode: string;
  sessionStatus: string;
  sessionConnectedPhone: string;
  sessionDeviceLabel: string;
  sessionLastConnectedAt: string;
  sessionQrCode: string;
  sessionPairingCode: string;
  lastHealthCheckAt: string;
  lastErrorMessage: string;
  gatewayConfigured: boolean;
  updatedAt: string;
};
type ConnectionForm = {
  provider: string;
  is_enabled: boolean;
  is_active: boolean;
  business_name: string;
  phone_number: string;
  phone_number_id: string;
  business_account_id: string;
  app_id: string;
  access_token: string;
  webhook_verify_token: string;
  webhook_callback_url: string;
  webhook_verified: boolean;
  api_version: string;
  default_language_code: string;
  default_country_code: string;
  allow_broadcasts: boolean;
  send_test_enabled: boolean;
  default_test_recipient: string;
  session_name: string;
  session_mode: string;
};
type QuickLink = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};
const API_ENDPOINT = "/api/company/whatsapp/connection/";
const DEFAULT_TEST_BODY = "Mhamcloud company WhatsApp test message.";
const translations = {
  ar: {
    title: "إعدادات واتساب الشركة",
    subtitle:
      "صفحة مستقلة لإعداد رقم واتساب الرسمي للشركة، إدارة الاتصال، QR، Pairing Code، Webhook، ورسالة الاختبار.",
    badge: "التواصل والإشعارات",
    refresh: "تحديث",
    save: "حفظ الإعدادات",
    print: "طباعة",
    pdf: "PDF",
    reset: "إعادة ضبط",
    connectionStatus: "حالة الاتصال",
    gatewayStatus: "حالة Gateway",
    tokenStatus: "التوكنات",
    sessionMode: "طريقة الربط",
    connected: "متصل",
    disconnected: "غير متصل",
    pending: "بانتظار الربط",
    failed: "فشل",
    configured: "مضبوط",
    notConfigured: "غير مضبوط",
    saved: "محفوظ",
    missing: "غير محفوظ",
    fromLiveApi: "من واجهات الشركة",
    pageLinksTitle: "صفحات واتساب الشركة",
    pageLinksDesc: "تنقل بين صفحات واتساب الخاصة بالشركة.",
    overviewTitle: "مركز واتساب",
    overviewDesc: "نظرة عامة على إعدادات واتساب والقوالب وسجل الرسائل.",
    templatesTitle: "قوالب واتساب",
    templatesDesc: "إدارة حالة القوالب ومراجعة محتواها.",
    messagesTitle: "سجل الرسائل",
    messagesDesc: "متابعة رسائل واتساب المسجلة في مساحة الشركة.",
    dashboardTitle: "لوحة الشركة",
    dashboardDesc: "العودة إلى لوحة تحكم الشركة.",
    actionsTitle: "اختصارات اتصال واتساب",
    actionsDesc: "عمليات الاتصال الفعلية الخاصة برقم واتساب الشركة.",
    refreshConnection: "تحديث الاتصال",
    refreshConnectionDesc: "فحص حالة الجلسة الحالية من Gateway.",
    createQr: "إنشاء QR",
    createQrDesc: "توليد رمز QR للربط من الأجهزة المرتبطة.",
    createPairing: "إنشاء Pairing Code",
    createPairingDesc: "توليد كود ربط باستخدام رقم الهاتف.",
    disconnect: "فصل الاتصال",
    disconnectDesc: "فصل الجلسة الحالية وتنظيف حالة الربط.",
    disconnectConfirmTitle: "تأكيد فصل اتصال واتساب",
    disconnectConfirmDesc:
      "سيتم فصل الجلسة الحالية وإيقاف الربط على هذا الجهاز. لن يتم حذف إعدادات واتساب المحفوظة.",
    confirmDisconnect: "فصل الاتصال",
    cancel: "إلغاء",
    settingsTitle: "بيانات اتصال واتساب الشركة",
    settingsDesc: "هذه البيانات تخص واتساب الشركة ولا تكشف التوكنات المحفوظة.",
    provider: "المزود",
    businessName: "اسم النشاط",
    phoneNumber: "رقم واتساب",
    phoneNumberId: "Phone Number ID",
    businessAccountId: "Business Account ID",
    appId: "App ID",
    sessionName: "اسم الجلسة",
    apiVersion: "إصدار API",
    defaultLanguage: "اللغة الافتراضية",
    defaultCountry: "مفتاح الدولة",
    enabled: "مفعل",
    active: "نشط",
    allowBroadcasts: "السماح بالبث",
    sendTestEnabled: "تفعيل رسالة الاختبار",
    connectionDetailsTitle: "تفاصيل الجلسة",
    connectionDetailsDesc: "حالة الربط الحالية والبيانات التي ترجع من Gateway.",
    connectedPhone: "الرقم المتصل",
    deviceLabel: "الجهاز",
    lastConnected: "آخر اتصال",
    lastHealth: "آخر فحص",
    lastError: "آخر رسالة",
    noData: "لا توجد بيانات بعد.",
    qrTitle: "رمز QR",
    qrDesc: "افتح واتساب ثم الأجهزة المرتبطة وامسح الرمز.",
    qrEmpty: "لا يوجد QR بعد.",
    pairingTitle: "Pairing Code",
    pairingDesc: "استخدم هذا الكود عند الربط من واتساب.",
    pairingEmpty: "لا يوجد كود ربط بعد.",
    copy: "نسخ",
    copied: "تم النسخ.",
    webhookTitle: "إعدادات Webhook",
    webhookDesc: "إعداد callback والتوكنات بدون كشف القيم المحفوظة.",
    callbackUrl: "Webhook Callback URL",
    accessToken: "Access Token",
    verifyToken: "Webhook Verify Token",
    accessTokenHint: "اتركه فارغًا للإبقاء على التوكن الحالي.",
    verifyTokenHint: "اتركه فارغًا للإبقاء على التوكن الحالي.",
    webhookVerified: "Webhook موثق",
    yes: "نعم",
    no: "لا",
    testTitle: "رسالة اختبار",
    testDesc: "استخدمها بعد تشغيل Gateway وربط الجلسة.",
    defaultRecipient: "مستلم الاختبار الافتراضي",
    recipientPhone: "رقم المستلم",
    messageBody: "نص الرسالة",
    sendTest: "إرسال اختبار",
    gatewayHint:
      "بوابة اتصال واتساب غير مهيأة بعد. أكمل إعداد الاتصال من إعدادات النظام أو تواصل مع مسؤول المنصة.",
    loadError: "تعذر تحميل إعدادات واتساب الشركة.",
    saveSuccess: "تم حفظ إعدادات واتساب الشركة.",
    saveError: "تعذر حفظ إعدادات واتساب الشركة.",
    actionError: "تعذر تنفيذ العملية.",
    refreshed: "تم تحديث اتصال واتساب الشركة.",
    qrRequested: "تم طلب QR.",
    pairingRequested: "تم طلب Pairing Code.",
    disconnectRequested: "تم طلب فصل الاتصال.",
    testRequested: "تم طلب إرسال رسالة اختبار.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    tryAgain: "إعادة المحاولة",
    errorTitle: "تعذر تحميل إعدادات واتساب الشركة",
  },
  en: {
    title: "Company WhatsApp Settings",
    subtitle:
      "Standalone page for the official company WhatsApp number, connection, QR, pairing code, webhook, and test message.",
    badge: "Communication",
    refresh: "Refresh",
    save: "Save settings",
    print: "Print",
    pdf: "PDF",
    reset: "Reset",
    connectionStatus: "Connection status",
    gatewayStatus: "Gateway status",
    tokenStatus: "Tokens",
    sessionMode: "Session mode",
    connected: "Connected",
    disconnected: "Disconnected",
    pending: "Pending",
    failed: "Failed",
    configured: "Configured",
    notConfigured: "Not configured",
    saved: "Saved",
    missing: "Missing",
    fromLiveApi: "From real company APIs",
    pageLinksTitle: "Company WhatsApp pages",
    pageLinksDesc: "Navigate between standalone WhatsApp company pages.",
    overviewTitle: "WhatsApp center",
    overviewDesc: "Overview for WhatsApp settings, templates, and messages.",
    templatesTitle: "WhatsApp templates",
    templatesDesc: "Manage template status and review content.",
    messagesTitle: "Message logs",
    messagesDesc: "Monitor WhatsApp messages registered for the company.",
    dashboardTitle: "Company dashboard",
    dashboardDesc: "Return to the main company dashboard.",
    actionsTitle: "WhatsApp connection shortcuts",
    actionsDesc: "Real connection operations for the company WhatsApp number.",
    refreshConnection: "Refresh connection",
    refreshConnectionDesc: "Check the current session from Gateway.",
    createQr: "Create QR",
    createQrDesc: "Generate a QR code for linked devices.",
    createPairing: "Create Pairing Code",
    createPairingDesc: "Generate a pairing code using the phone number.",
    disconnect: "Disconnect",
    disconnectDesc: "Disconnect the current session and clear link state.",
    disconnectConfirmTitle: "Confirm WhatsApp disconnection",
    disconnectConfirmDesc:
      "The current session will be disconnected from this device. Saved WhatsApp settings will not be deleted.",
    confirmDisconnect: "Disconnect",
    cancel: "Cancel",
    settingsTitle: "Company WhatsApp connection details",
    settingsDesc: "These details belong to the official company WhatsApp and do not expose saved tokens.",
    provider: "Provider",
    businessName: "Business name",
    phoneNumber: "WhatsApp phone",
    phoneNumberId: "Phone Number ID",
    businessAccountId: "Business Account ID",
    appId: "App ID",
    sessionName: "Session name",
    apiVersion: "API version",
    defaultLanguage: "Default language",
    defaultCountry: "Country code",
    enabled: "Enabled",
    active: "Active",
    allowBroadcasts: "Allow broadcasts",
    sendTestEnabled: "Enable test message",
    connectionDetailsTitle: "Session details",
    connectionDetailsDesc: "Current link state and data returned from Gateway.",
    connectedPhone: "Connected phone",
    deviceLabel: "Device",
    lastConnected: "Last connected",
    lastHealth: "Last health check",
    lastError: "Last message",
    noData: "No data yet.",
    qrTitle: "QR Code",
    qrDesc: "Open WhatsApp, linked devices, then scan the code.",
    qrEmpty: "No QR yet.",
    pairingTitle: "Pairing Code",
    pairingDesc: "Use this code when linking from WhatsApp.",
    pairingEmpty: "No pairing code yet.",
    copy: "Copy",
    copied: "Copied.",
    webhookTitle: "Webhook settings",
    webhookDesc: "Configure callback and tokens without exposing saved values.",
    callbackUrl: "Webhook Callback URL",
    accessToken: "Access Token",
    verifyToken: "Webhook Verify Token",
    accessTokenHint: "Leave empty to keep the current token.",
    verifyTokenHint: "Leave empty to keep the current verify token.",
    webhookVerified: "Webhook verified",
    yes: "Yes",
    no: "No",
    testTitle: "Test message",
    testDesc: "Use it after starting Gateway and linking the session.",
    defaultRecipient: "Default test recipient",
    recipientPhone: "Recipient phone",
    messageBody: "Message body",
    sendTest: "Send test",
    gatewayHint:
      "The WhatsApp connection gateway is not configured yet. Complete the platform connection setup or contact the system administrator.",
    loadError: "Failed to load company WhatsApp settings.",
    saveSuccess: "Company WhatsApp settings saved.",
    saveError: "Failed to save company WhatsApp settings.",
    actionError: "Action failed.",
    refreshed: "Company WhatsApp connection refreshed.",
    qrRequested: "QR requested.",
    pairingRequested: "Pairing code requested.",
    disconnectRequested: "Disconnect requested.",
    testRequested: "Test message requested.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    tryAgain: "Try again",
    errorTitle: "Failed to load company WhatsApp settings",
  },
} as const;
function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ApiRecord) : {};
}
function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}
function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}
function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  const stored =
    window.localStorage.getItem("primey-locale") ||
    window.localStorage.getItem("locale") ||
    window.localStorage.getItem("lang");
  if (stored?.toLowerCase().startsWith("en")) return "en";
  const htmlLang = document.documentElement.lang || "";
  return htmlLang.toLowerCase().startsWith("en") ? "en" : "ar";
}
function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  const found = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
}
async function getCsrfToken(): Promise<string> {
  let token = getCookie("csrftoken");
  if (token) return token;
  try {
    await fetch("/api/auth/csrf/", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    token = getCookie("csrftoken");
  } catch {
    token = "";
  }
  return token;
}
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    const message = toStringValue(asRecord(payload).message) || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return payload;
}
async function postJson<T>(url: string, body: ApiRecord): Promise<T> {
  const csrfToken = await getCsrfToken();
  return fetchJson<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
  });
}
function normalizeConnection(value: unknown): CompanyConnection {
  const record = asRecord(value);
  return {
    id: toNumber(record.id),
    provider: toStringValue(record.provider) || "WEB_SESSION",
    isEnabled: toBool(record.is_enabled),
    isActive: toBool(record.is_active),
    businessName: toStringValue(record.business_name),
    phoneNumber: toStringValue(record.phone_number),
    phoneNumberId: toStringValue(record.phone_number_id),
    businessAccountId: toStringValue(record.business_account_id),
    appId: toStringValue(record.app_id),
    hasAccessToken: toBool(record.has_access_token),
    hasWebhookVerifyToken: toBool(record.has_webhook_verify_token),
    webhookCallbackUrl: toStringValue(record.webhook_callback_url),
    webhookVerified: toBool(record.webhook_verified),
    apiVersion: toStringValue(record.api_version) || "v22.0",
    defaultLanguageCode: toStringValue(record.default_language_code) || "ar",
    defaultCountryCode: toStringValue(record.default_country_code) || "+966",
    allowBroadcasts: toBool(record.allow_broadcasts),
    sendTestEnabled: toBool(record.send_test_enabled),
    defaultTestRecipient: toStringValue(record.default_test_recipient),
    sessionName: toStringValue(record.session_name) || "company-whatsapp-session",
    sessionMode: toStringValue(record.session_mode) || "qr",
    sessionStatus: toStringValue(record.session_status) || "disconnected",
    sessionConnectedPhone: toStringValue(record.session_connected_phone),
    sessionDeviceLabel: toStringValue(record.session_device_label),
    sessionLastConnectedAt: toStringValue(record.session_last_connected_at),
    sessionQrCode: toStringValue(record.session_qr_code),
    sessionPairingCode: toStringValue(record.session_pairing_code),
    lastHealthCheckAt: toStringValue(record.last_health_check_at),
    lastErrorMessage: toStringValue(record.last_error_message),
    gatewayConfigured: toBool(record.gateway_configured),
    updatedAt: toStringValue(record.updated_at),
  };
}
function buildForm(connection: CompanyConnection | null): ConnectionForm {
  return {
    provider: connection?.provider || "WEB_SESSION",
    is_enabled: connection?.isEnabled ?? false,
    is_active: connection?.isActive ?? false,
    business_name: connection?.businessName || "Mhamcloud Support",
    phone_number: connection?.phoneNumber || "",
    phone_number_id: connection?.phoneNumberId || "",
    business_account_id: connection?.businessAccountId || "",
    app_id: connection?.appId || "",
    access_token: "",
    webhook_verify_token: "",
    webhook_callback_url: connection?.webhookCallbackUrl || "",
    webhook_verified: connection?.webhookVerified ?? false,
    api_version: connection?.apiVersion || "v22.0",
    default_language_code: connection?.defaultLanguageCode || "ar",
    default_country_code: connection?.defaultCountryCode || "+966",
    allow_broadcasts: connection?.allowBroadcasts ?? true,
    send_test_enabled: connection?.sendTestEnabled ?? true,
    default_test_recipient: connection?.defaultTestRecipient || "",
    session_name: connection?.sessionName || "company-whatsapp-session",
    session_mode: connection?.sessionMode || "qr",
  };
}
function statusLabel(status: string, locale: Locale): string {
  const t = translations[locale];
  const normalized = status.toLowerCase();
  if (normalized === "connected") return t.connected;
  if (normalized === "failed") return t.failed;
  if (normalized.includes("pending") || normalized.includes("connecting") || normalized.includes("reconnecting")) {
    return t.pending;
  }
  return t.disconnected;
}
function statusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "connected") return "border-emerald-500/30 text-emerald-700";
  if (normalized === "failed") return "border-destructive/40 text-destructive";
  if (normalized.includes("pending") || normalized.includes("connecting") || normalized.includes("reconnecting")) {
    return "border-amber-500/30 text-amber-700";
  }
  return "border-muted-foreground/30 text-muted-foreground";
}
function formatDate(value: string, _locale: Locale, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-xl border bg-background shadow-none">
      <CardContent className="flex min-h-[132px] items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-3 truncate text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-5 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/20 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function QuickLinkCard({ action }: { action: QuickLink }) {
  const Icon = action.icon;

  return (
    <Card className="group rounded-xl border bg-background shadow-none transition-colors hover:bg-muted/20">
      <Link
        href={action.href}
        className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardContent className="flex min-h-[102px] items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{action.title}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {action.description}
            </p>
          </div>

          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/20 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </span>
        </CardContent>
      </Link>
    </Card>
  );
}

function ActionCard({
  title,
  description,
  icon: Icon,
  loading,
  danger,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
  danger?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-auto min-h-[102px] w-full justify-between whitespace-normal rounded-xl bg-background p-5 text-start shadow-none",
        danger &&
          "border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-2 block line-clamp-2 text-xs font-normal leading-5 text-muted-foreground">
          {description}
        </span>
      </span>

      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/20 text-muted-foreground",
          danger && "border-red-200 bg-red-50 text-red-600",
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>
    </Button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold text-muted-foreground">{children}</label>;
}
function InfoBox({ label, value, alignClass }: { label: string; value: string; alignClass: string }) {
  return (
    <div className={cn("rounded-2xl border bg-background p-4", alignClass)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}
function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = React.useId();

  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 text-sm"
    >
      <span className="font-medium">{label}</span>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
    </label>
  );
}

function SettingsSkeleton({ dir }: { dir: "rtl" | "ltr" }) {
  return (
    <main dir={dir} className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="rounded-xl border bg-background p-6 shadow-none">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-8 w-72" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-xl border bg-background shadow-none">
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-xl border bg-background shadow-none">
          <CardHeader>
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
export default function CompanyWhatsAppSettingsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [connection, setConnection] = React.useState<CompanyConnection | null>(null);
  const [form, setForm] = React.useState<ConnectionForm>(() => buildForm(null));
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState<ConnectionAction | "">("");
  const [disconnectDialogOpen, setDisconnectDialogOpen] = React.useState(false);
  const [testRecipient, setTestRecipient] = React.useState("");
  const [testBody, setTestBody] = React.useState(DEFAULT_TEST_BODY);
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";
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
  const syncConnection = React.useCallback((payload: unknown) => {
    const record = asRecord(payload);
    const next = normalizeConnection(record.setting || record.connection || payload);
    setConnection(next);
    setForm(buildForm(next));
    setTestRecipient((current) => current || next.defaultTestRecipient || next.phoneNumber);
    return next;
  }, []);
  const loadConnection = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const payload = await fetchJson<unknown>(API_ENDPOINT);
        syncConnection(payload);
        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.loadError;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [syncConnection, t.loadError, t.refreshed],
  );
  React.useEffect(() => {
    void loadConnection();
  }, [loadConnection]);
  function updateField<K extends keyof ConnectionForm>(key: K, value: ConnectionForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function saveSettings() {
    try {
      setSaving(true);
      const payloadBody: ApiRecord = { ...form };
      if (!payloadBody.access_token) delete payloadBody.access_token;
      if (!payloadBody.webhook_verify_token) delete payloadBody.webhook_verify_token;
      const payload = await postJson<unknown>(API_ENDPOINT, payloadBody);
      syncConnection(payload);
      toast.success(t.saveSuccess);
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function pollConnectionUntilConnected(maxAttempts = 20) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, attempt < 3 ? 1500 : 2500));
      try {
        const payload = await postJson<unknown>(`${API_ENDPOINT}status/`, {});
        const record = asRecord(payload);
        const nextConnection = normalizeConnection(asRecord(record.connection));
        setConnection(nextConnection);
        const nextStatus = String(nextConnection.sessionStatus || "").toLowerCase();
        if (["connected", "failed", "disconnected"].includes(nextStatus)) {
          return nextConnection;
        }
      } catch {
        // Keep polling quietly. Manual refresh still exists.
      }
    }
    return null;
  }
  async function runConnectionAction(action: ConnectionAction) {
    try {
      setActionLoading(action);
      let payload: unknown;
      let fallback: string = t.actionError;
      if (action === "status") {
        payload = await postJson<unknown>(`${API_ENDPOINT}status/`, {});
        fallback = t.refreshed;
      } else if (action === "qr") {
        payload = await postJson<unknown>(`${API_ENDPOINT}qr/`, {});
        fallback = t.qrRequested;
      } else if (action === "pairing") {
        payload = await postJson<unknown>(`${API_ENDPOINT}pairing/`, {
          phone_number: testRecipient || form.default_test_recipient || form.phone_number,
        });
        fallback = t.pairingRequested;
      } else if (action === "disconnect") {
        payload = await postJson<unknown>(`${API_ENDPOINT}disconnect/`, {});
        fallback = t.disconnectRequested;
      } else {
        payload = await postJson<unknown>(`${API_ENDPOINT}test/`, {
          recipient_phone: testRecipient,
          message_body: testBody,
        });
        fallback = t.testRequested;
      }
      const record = asRecord(payload);
      syncConnection(payload);
      if (record.success === false) {
        toast.error(toStringValue(record.message) || t.actionError);
      } else {
        toast.success(toStringValue(record.message) || fallback);
        if (["qr", "pairing"].includes(action)) {
          void pollConnectionUntilConnected(24);
        }
        if (action === "test") {
          window.setTimeout(() => {
            void pollConnectionUntilConnected(3);
          }, 1200);
        }
      }
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : t.actionError);
    } finally {
      setActionLoading("");
    }
  }

  function resetLocalForm() {
    setForm(buildForm(connection));
    setTestRecipient(connection?.defaultTestRecipient || connection?.phoneNumber || "");
    setTestBody(DEFAULT_TEST_BODY);
  }
  function openPrintWindow(kind: "print" | "pdf") {
    if (kind === "pdf") {
      toast.info(t.pdfHint);
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!printWindow) {
      toast.error(t.actionError);
      return;
    }

    const isArabic = locale === "ar";
    const printedAt = new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());

    const summaryRows = [
      [t.connectionStatus, statusText],
      [t.gatewayStatus, gatewayText],
      [t.tokenStatus, tokenText],
      [t.sessionMode, modeText],
    ];

    const settingRows = [
      [t.provider, form.provider || "—"],
      [t.businessName, form.business_name || "—"],
      [t.phoneNumber, form.phone_number || "—"],
      [t.sessionName, form.session_name || "—"],
      [t.apiVersion, form.api_version || "—"],
      [t.defaultLanguage, form.default_language_code || "—"],
      [t.defaultCountry, form.default_country_code || "—"],
      [t.connectedPhone, connection?.sessionConnectedPhone || "—"],
      [t.deviceLabel, connection?.sessionDeviceLabel || "—"],
      [
        t.lastConnected,
        formatDate(connection?.sessionLastConnectedAt || "", locale, "—"),
      ],
      [
        t.lastHealth,
        formatDate(connection?.lastHealthCheckAt || "", locale, "—"),
      ],
    ];

    const summaryHtml = summaryRows
      .map(
        ([label, value]) =>
          `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
      )
      .join("");

    const settingsHtml = settingRows
      .map(
        ([label, value]) =>
          `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
      )
      .join("");

    const documentTitle = isArabic
      ? "تقرير إعدادات واتساب الشركة"
      : "Company WhatsApp Settings Report";
    const printedAtLabel = isArabic ? "تاريخ الطباعة" : "Printed at";
    const note = isArabic
      ? "لا يتضمن هذا التقرير أي مفاتيح أو توكنات سرية."
      : "This report does not include secret keys or tokens.";

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="${isArabic ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #111827;
      background: #ffffff;
      font-family: Tahoma, Arial, sans-serif;
      font-size: 12px;
    }
    .header {
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 2px solid #111827;
    }
    h1 { margin: 0; font-size: 22px; }
    .meta { margin-top: 6px; color: #4b5563; }
    .section-title {
      margin: 16px 0 7px;
      font-size: 14px;
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #111827;
      padding: 7px 8px;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    th {
      width: 34%;
      background: #f3f4f6;
      text-align: ${isArabic ? "right" : "left"};
    }
    td { text-align: ${isArabic ? "right" : "left"}; }
    .note {
      margin-top: 12px;
      padding: 8px;
      border: 1px solid #9ca3af;
      background: #f9fafb;
    }
    .footer {
      margin-top: 12px;
      color: #6b7280;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>${escapeHtml(form.business_name || t.title)}</div>
    <h1>${escapeHtml(documentTitle)}</h1>
    <div class="meta">${escapeHtml(printedAtLabel)}: ${escapeHtml(printedAt)}</div>
  </div>

  <div class="section-title">${escapeHtml(
    isArabic ? "ملخص الاتصال" : "Connection summary",
  )}</div>
  <table><tbody>${summaryHtml}</tbody></table>

  <div class="section-title">${escapeHtml(
    isArabic ? "بيانات الإعداد" : "Settings details",
  )}</div>
  <table><tbody>${settingsHtml}</tbody></table>

  <div class="note">${escapeHtml(note)}</div>
  <div class="footer">PrimeyAcc</div>

  <script>
    window.addEventListener("load", function () {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`);
    printWindow.document.close();
  }

  async function copyPairingCode() {
    if (!connection?.sessionPairingCode || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(connection.sessionPairingCode);
    toast.success(t.copied);
  }
  const statusText = statusLabel(connection?.sessionStatus || "disconnected", locale);
  const gatewayText = connection?.gatewayConfigured ? t.configured : t.notConfigured;
  const tokenText = connection?.hasAccessToken || connection?.hasWebhookVerifyToken ? t.saved : t.missing;
  const modeText = connection?.sessionMode || form.session_mode || "qr";
  const pageLinks: QuickLink[] = [
    {
      title: t.overviewTitle,
      description: t.overviewDesc,
      href: "/company/whatsapp",
      icon: MessageCircle,
    },
    {
      title: t.templatesTitle,
      description: t.templatesDesc,
      href: "/company/whatsapp/templates",
      icon: FileText,
    },
    {
      title: t.messagesTitle,
      description: t.messagesDesc,
      href: "/company/whatsapp/messages",
      icon: SendHorizontal,
    },
    {
      title: t.dashboardTitle,
      description: t.dashboardDesc,
      href: "/company",
      icon: LayoutDashboard,
    },
  ];
  if (loading) return <SettingsSkeleton dir={dir} />;
  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-3xl border-destructive/30 bg-card shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.loadError}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => void loadConnection({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main dir={dir} className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between rtl:lg:flex-row-reverse">
          <div className="order-2 flex flex-wrap items-center gap-2 lg:order-1">
            <Button
              type="button"
              variant="outline"
              className="h-9 bg-background shadow-none"
              onClick={() => void loadConnection({ silent: true })}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t.refresh}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-9 bg-background shadow-none"
              onClick={() => openPrintWindow("print")}
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-9 bg-background shadow-none"
              onClick={() => openPrintWindow("pdf")}
            >
              <FileText className="h-4 w-4" />
              {t.pdf}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-9 bg-background shadow-none"
              onClick={resetLocalForm}
            >
              <RotateCcw className="h-4 w-4" />
              {t.reset}
            </Button>

            <Button
              type="button"
              className="h-9 shadow-none"
              onClick={() => void saveSettings()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t.save}
            </Button>
          </div>

          <div className="order-1 max-w-4xl text-start lg:order-2">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {t.badge}
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {t.title}
            </h1>

            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t.subtitle}
            </p>

            {!connection?.gatewayConfigured ? (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t.gatewayHint}</span>
              </div>
            ) : null}
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.connectionStatus} value={statusText} description={t.fromLiveApi} icon={Power} />
          <KpiCard title={t.gatewayStatus} value={gatewayText} description={t.fromLiveApi} icon={Webhook} />
          <KpiCard title={t.tokenStatus} value={tokenText} description={t.fromLiveApi} icon={KeyRound} />
          <KpiCard title={t.sessionMode} value={modeText} description={t.fromLiveApi} icon={Wifi} />
        </div>
        <Card className="rounded-xl border bg-background shadow-none">
          <CardHeader>
            <CardTitle>{t.pageLinksTitle}</CardTitle>
            <CardDescription>{t.pageLinksDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pageLinks.map((action) => (
                <QuickLinkCard key={action.href} action={action} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border bg-background shadow-none">
          <CardHeader>
            <CardTitle>{t.actionsTitle}</CardTitle>
            <CardDescription>{t.actionsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ActionCard
                title={t.refreshConnection}
                description={t.refreshConnectionDesc}
                icon={RefreshCw}
                loading={actionLoading === "status"}
                disabled={Boolean(actionLoading)}
                onClick={() => void runConnectionAction("status")}
              />
              <ActionCard
                title={t.createQr}
                description={t.createQrDesc}
                icon={QrCode}
                loading={actionLoading === "qr"}
                disabled={Boolean(actionLoading)}
                onClick={() => void runConnectionAction("qr")}
              />
              <ActionCard
                title={t.createPairing}
                description={t.createPairingDesc}
                icon={Smartphone}
                loading={actionLoading === "pairing"}
                disabled={Boolean(actionLoading)}
                onClick={() => void runConnectionAction("pairing")}
              />
              <ActionCard
                title={t.disconnect}
                description={t.disconnectDesc}
                icon={Unplug}
                loading={actionLoading === "disconnect"}
                disabled={Boolean(actionLoading)}
                danger
                onClick={() => setDisconnectDialogOpen(true)}
              />
            </div>
          </CardContent>
        </Card>
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-xl border bg-background shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {t.settingsTitle}
              </CardTitle>
              <CardDescription>{t.settingsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <FieldLabel>{t.provider}</FieldLabel>
                  <Select
                    value={form.provider}
                    onValueChange={(value) => updateField("provider", value)}
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl bg-background shadow-none">
                      <SelectValue placeholder={t.provider} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEB_SESSION">WEB_SESSION</SelectItem>
                      <SelectItem value="WHATSAPP_CLOUD">WHATSAPP_CLOUD</SelectItem>
                      <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                      <SelectItem value="MOCK">MOCK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <FieldLabel>{t.businessName}</FieldLabel>
                  <Input className="h-10 rounded-xl" value={form.business_name} onChange={(event) => updateField("business_name", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel>{t.phoneNumber}</FieldLabel>
                  <Input className="h-10 rounded-xl" value={form.phone_number} onChange={(event) => updateField("phone_number", event.target.value)} placeholder="+9665XXXXXXXX" />
                </div>
                <div className="grid gap-2">
                  <FieldLabel>{t.sessionName}</FieldLabel>
                  <Input className="h-10 rounded-xl" value={form.session_name} onChange={(event) => updateField("session_name", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel>{t.sessionMode}</FieldLabel>
                  <Select
                    value={form.session_mode}
                    onValueChange={(value) => updateField("session_mode", value)}
                  >
                    <SelectTrigger className="h-10 w-full rounded-xl bg-background shadow-none">
                      <SelectValue placeholder={t.sessionMode} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qr">QR</SelectItem>
                      <SelectItem value="pairing_code">Pairing Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <FieldLabel>{t.apiVersion}</FieldLabel>
                  <Input className="h-10 rounded-xl" value={form.api_version} onChange={(event) => updateField("api_version", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel>{t.defaultLanguage}</FieldLabel>
                  <Input className="h-10 rounded-xl" value={form.default_language_code} onChange={(event) => updateField("default_language_code", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel>{t.defaultCountry}</FieldLabel>
                  <Input className="h-10 rounded-xl" value={form.default_country_code} onChange={(event) => updateField("default_country_code", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel>{t.phoneNumberId}</FieldLabel>
                  <Input className="h-10 rounded-xl" value={form.phone_number_id} onChange={(event) => updateField("phone_number_id", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel>{t.businessAccountId}</FieldLabel>
                  <Input className="h-10 rounded-xl" value={form.business_account_id} onChange={(event) => updateField("business_account_id", event.target.value)} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <FieldLabel>{t.appId}</FieldLabel>
                  <Input className="h-10 rounded-xl" value={form.app_id} onChange={(event) => updateField("app_id", event.target.value)} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleRow label={t.enabled} checked={form.is_enabled} onChange={(checked) => updateField("is_enabled", checked)} />
                <ToggleRow label={t.active} checked={form.is_active} onChange={(checked) => updateField("is_active", checked)} />
                <ToggleRow label={t.allowBroadcasts} checked={form.allow_broadcasts} onChange={(checked) => updateField("allow_broadcasts", checked)} />
                <ToggleRow label={t.sendTestEnabled} checked={form.send_test_enabled} onChange={(checked) => updateField("send_test_enabled", checked)} />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border bg-background shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                {t.connectionDetailsTitle}
              </CardTitle>
              <CardDescription>{t.connectionDetailsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={cn("rounded-2xl border bg-background p-4", alignClass)}>
                <p className="text-xs text-muted-foreground">{t.connectionStatus}</p>
                <Badge variant="outline" className={cn("mt-2 rounded-full", statusBadgeClass(connection?.sessionStatus || ""))}>
                  {statusText}
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <InfoBox label={t.connectedPhone} value={connection?.sessionConnectedPhone || t.noData} alignClass={alignClass} />
                <InfoBox label={t.deviceLabel} value={connection?.sessionDeviceLabel || t.noData} alignClass={alignClass} />
                <InfoBox label={t.lastConnected} value={formatDate(connection?.sessionLastConnectedAt || "", locale, t.noData)} alignClass={alignClass} />
                <InfoBox label={t.lastHealth} value={formatDate(connection?.lastHealthCheckAt || "", locale, t.noData)} alignClass={alignClass} />
              </div>
              <InfoBox label={t.lastError} value={connection?.lastErrorMessage || t.noData} alignClass={alignClass} />
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-xl border bg-background shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                {t.webhookTitle}
              </CardTitle>
              <CardDescription>{t.webhookDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <FieldLabel>{t.callbackUrl}</FieldLabel>
                <Input className="h-10 rounded-xl" value={form.webhook_callback_url} onChange={(event) => updateField("webhook_callback_url", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>{t.accessToken}</FieldLabel>
                <Input type="password" className="h-10 rounded-xl" value={form.access_token} onChange={(event) => updateField("access_token", event.target.value)} placeholder={t.accessTokenHint} />
                <Badge variant={connection?.hasAccessToken ? "default" : "secondary"} className="w-fit rounded-full">
                  {connection?.hasAccessToken ? t.saved : t.missing}
                </Badge>
              </div>
              <div className="grid gap-2">
                <FieldLabel>{t.verifyToken}</FieldLabel>
                <Input type="password" className="h-10 rounded-xl" value={form.webhook_verify_token} onChange={(event) => updateField("webhook_verify_token", event.target.value)} placeholder={t.verifyTokenHint} />
                <Badge variant={connection?.hasWebhookVerifyToken ? "default" : "secondary"} className="w-fit rounded-full">
                  {connection?.hasWebhookVerifyToken ? t.saved : t.missing}
                </Badge>
              </div>
              <ToggleRow label={t.webhookVerified} checked={form.webhook_verified} onChange={(checked) => updateField("webhook_verified", checked)} />
            </CardContent>
          </Card>
          <Card className="rounded-xl border bg-background shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SendHorizontal className="h-5 w-5" />
                {t.testTitle}
              </CardTitle>
              <CardDescription>{t.testDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <FieldLabel>{t.defaultRecipient}</FieldLabel>
                <Input className="h-10 rounded-xl" value={form.default_test_recipient} onChange={(event) => updateField("default_test_recipient", event.target.value)} placeholder="+9665XXXXXXXX" />
              </div>
              <div className="grid gap-2">
                <FieldLabel>{t.recipientPhone}</FieldLabel>
                <Input className="h-10 rounded-xl" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder="+9665XXXXXXXX" />
              </div>
              <div className="grid gap-2">
                <FieldLabel>{t.messageBody}</FieldLabel>
                <Textarea
                  value={testBody}
                  onChange={(event) => setTestBody(event.target.value)}
                  rows={5}
                  className="min-h-28 resize-y rounded-xl bg-background shadow-none"
                />
              </div>
              <Button className="w-full rounded-xl" disabled={Boolean(actionLoading) || !testRecipient} onClick={() => void runConnectionAction("test")}>
                {actionLoading === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                {t.sendTest}
              </Button>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-xl border bg-background shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                {t.qrTitle}
              </CardTitle>
              <CardDescription>{t.qrDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              {connection?.sessionQrCode ? (
                <div className="flex justify-center rounded-2xl border bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={connection.sessionQrCode} alt={t.qrTitle} className="h-auto max-h-80 w-auto max-w-full rounded-xl" />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-background p-10 text-center text-sm text-muted-foreground">
                  {t.qrEmpty}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-xl border bg-background shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                {t.pairingTitle}
              </CardTitle>
              <CardDescription>{t.pairingDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 rounded-2xl border bg-background p-4">
                <code className="flex-1 break-all text-lg font-bold tracking-widest">
                  {connection?.sessionPairingCode || t.pairingEmpty}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl"
                  disabled={!connection?.sessionPairingCode}
                  onClick={() => void copyPairingCode()}
                  title={t.copy}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-2">
                <FieldLabel>{t.recipientPhone}</FieldLabel>
                <Input className="h-10 rounded-xl" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder="+9665XXXXXXXX" />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <AlertDialog
        open={disconnectDialogOpen}
        onOpenChange={(open) => {
          if (actionLoading !== "disconnect") {
            setDisconnectDialogOpen(open);
          }
        }}
      >
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.disconnectConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.disconnectConfirmDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-xl border bg-muted/20 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              {connection?.businessName || form.business_name || t.title}
            </p>
            <p
              dir="ltr"
              className="mt-1 text-xs tabular-nums text-muted-foreground"
            >
              {connection?.sessionConnectedPhone ||
                connection?.phoneNumber ||
                form.phone_number ||
                "—"}
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === "disconnect"}>
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={actionLoading === "disconnect"}
              onClick={(event) => {
                event.preventDefault();
                setDisconnectDialogOpen(false);
                void runConnectionAction("disconnect");
              }}
            >
              {actionLoading === "disconnect" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4" />
              )}
              {t.confirmDisconnect}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
