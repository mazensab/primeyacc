"use client";
/* ============================================================
   📂 primey_frontend/components/system/whatsapp/SystemWhatsAppCenter.tsx
   💬 PrimeyAcc — Shared System WhatsApp Center Component
   ------------------------------------------------------------
   ✅ Approved Premium system page pattern
   ✅ Real API only: /api/system/whatsapp/
   ✅ Settings + templates + messages monitoring
   ✅ Template status management only
   ✅ No external WhatsApp provider calls
   ✅ KPI cards + quick actions + filters + tables
   ✅ Excel .xls export
   ✅ Web print + PDF through browser print dialog
   ✅ Skeleton loading
   ✅ Error / Empty / No results states
   ✅ sonner toast
   ✅ Arabic/English via primey-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */
import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  BellRing,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Inbox,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Phone,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type ViewMode = "settings" | "templates" | "messages";
type WhatsAppPageMode = "overview" | ViewMode;
type StatusFilter = "all" | "enabled" | "disabled" | "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED" | "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "CANCELLED";
type ProviderFilter = "all" | "MOCK" | "WHATSAPP_CLOUD" | "CUSTOM";
type CategoryFilter = "all" | "GENERAL" | "SALES" | "PURCHASES" | "TREASURY" | "POS" | "ACCOUNTING" | "INVENTORY" | "CUSTOMER_SERVICE";
type CompanyPayload = {
  id: string;
  name: string;
  companyCode: string;
  isActive: boolean;
  status: string;
};
type SettingRow = {
  id: string;
  company: CompanyPayload;
  isEnabled: boolean;
  provider: string;
  phoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string;
  defaultCountryCode: string;
  hasAccessToken: boolean;
  hasWebhookVerifyToken: boolean;
  sendInvoiceNotifications: boolean;
  sendPaymentNotifications: boolean;
  sendPosNotifications: boolean;
  sendSystemNotifications: boolean;
  lastVerifiedAt: string | null;
  updatedAt: string | null;
};
type TemplateRow = {
  id: string;
  company: CompanyPayload;
  name: string;
  code: string;
  category: string;
  status: string;
  language: string;
  body: string;
  footer: string;
  variables: string[];
  isActive: boolean;
  updatedAt: string | null;
};
type MessageRow = {
  id: string;
  company: CompanyPayload;
  templateName: string;
  templateCode: string;
  direction: string;
  status: string;
  sourceType: string;
  sourceId: string;
  recipientName: string;
  recipientPhone: string;
  messageBody: string;
  provider: string;
  providerMessageId: string;
  errorMessage: string;
  sentAt: string | null;
  createdAt: string | null;
};
type StatsPayload = {
  settings: {
    total: number;
    enabled: number;
    disabled: number;
    providers: Record<string, number>;
  };
  templates: {
    total: number;
    statuses: Record<string, number>;
    categories: Record<string, number>;
    languages: Record<string, number>;
  };
  messages: {
    total: number;
    statuses: Record<string, number>;
    directions: Record<string, number>;
    providers: Record<string, number>;
    source_types: Record<string, number>;
  };
};
const API_ROOT = "/api/system/whatsapp/";
const translations = {
  ar: {
    title: "واتساب",
    subtitle:
      "مركز واتساب للنظام لمراقبة إعدادات الشركات والقوالب وسجل الرسائل من API حقيقي بدون إرسال خارجي.",
    badge: "التواصل والإشعارات",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث باسم الشركة أو الكود أو القالب أو رقم المستلم أو نص الرسالة...",
    all: "الكل",
    settings: "الإعدادات",
    templates: "القوالب",
    messages: "سجل الرسائل",
    status: "الحالة",
    provider: "المزود",
    category: "التصنيف",
    openNotifications: "الإشعارات",
    dashboard: "لوحة النظام",
    enabledCompanies: "شركات مفعلة",
    templatesCount: "القوالب",
    messagesCount: "الرسائل",
    failedMessages: "رسائل فاشلة",
    fromLiveApi: "من واجهات واتساب الحقيقية",
    actionsTitle: "اختصارات واتساب",
    actionsDesc: "تنقل سريع بين مراقبة الإعدادات والقوالب وسجل الرسائل.",
    settingsTitle: "إعدادات الشركات",
    settingsDesc: "مراقبة إعدادات واتساب لكل شركة بدون كشف التوكنات.",
    templatesTitle: "قوالب واتساب",
    templatesDesc: "إدارة حالة القوالب ومراجعة محتواها.",
    messagesTitle: "سجل الرسائل",
    messagesDesc: "متابعة رسائل واتساب المسجلة في النظام.",
    notificationsTitle: "الإشعارات",
    notificationsDesc: "العودة إلى مركز الإشعارات.",
    tableTitle: "بيانات واتساب",
    tableDesc: "جدول كامل العرض حسب القسم المختار مع الفلاتر والتصدير والطباعة.",
    showing: "عرض",
    of: "من",
    rows: "سجل",
    company: "الشركة",
    phone: "رقم واتساب",
    token: "التوكن",
    webhook: "Webhook",
    verified: "آخر تحقق",
    updatedAt: "آخر تحديث",
    template: "القالب",
    code: "الكود",
    language: "اللغة",
    body: "المحتوى",
    variables: "المتغيرات",
    recipient: "المستلم",
    message: "الرسالة",
    source: "المصدر",
    sentAt: "تاريخ الإرسال",
    action: "إجراء",
    enabled: "مفعل",
    disabled: "غير مفعل",
    yes: "نعم",
    no: "لا",
    activate: "تفعيل",
    deactivate: "تعطيل",
    archive: "أرشفة",
    mock: "Mock",
    cloud: "WhatsApp Cloud",
    custom: "مزود مخصص",
    draft: "مسودة",
    active: "نشط",
    inactive: "غير نشط",
    archived: "مؤرشف",
    queued: "بالانتظار",
    sent: "مرسل",
    delivered: "تم التسليم",
    read: "مقروء",
    failed: "فشل",
    cancelled: "ملغي",
    general: "عام",
    sales: "المبيعات",
    purchases: "المشتريات",
    treasury: "الخزينة",
    pos: "نقاط البيع",
    accounting: "المحاسبة",
    inventory: "المخزون",
    customerService: "خدمة العملاء",
    noDataTitle: "لا توجد بيانات",
    noDataDesc: "ستظهر بيانات واتساب هنا عند توفرها من API.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل مركز واتساب",
    errorDesc: "تأكد من صلاحيات النظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير مركز واتساب PrimeyAcc",
    generatedAt: "تاريخ الإنشاء",
    refreshed: "تم تحديث مركز واتساب.",
    statusUpdated: "تم تحديث حالة القالب.",
  },
  en: {
    title: "WhatsApp",
    subtitle:
      "System WhatsApp center for monitoring company settings, templates, and message logs from the real API without external sending.",
    badge: "Communications & Notifications",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    reset: "Reset",
    searchPlaceholder: "Search company, code, template, recipient phone, or message body...",
    all: "All",
    settings: "Settings",
    templates: "Templates",
    messages: "Message logs",
    status: "Status",
    provider: "Provider",
    category: "Category",
    openNotifications: "Notifications",
    dashboard: "System dashboard",
    enabledCompanies: "Enabled companies",
    templatesCount: "Templates",
    messagesCount: "Messages",
    failedMessages: "Failed messages",
    fromLiveApi: "From live WhatsApp APIs",
    actionsTitle: "WhatsApp shortcuts",
    actionsDesc: "Quick navigation across settings, templates, and message logs.",
    settingsTitle: "Company settings",
    settingsDesc: "Monitor WhatsApp settings per company without exposing tokens.",
    templatesTitle: "WhatsApp templates",
    templatesDesc: "Manage template status and review content.",
    messagesTitle: "Message logs",
    messagesDesc: "Track WhatsApp messages logged in the system.",
    notificationsTitle: "Notifications",
    notificationsDesc: "Return to the notifications center.",
    tableTitle: "WhatsApp data",
    tableDesc: "Full-width table for the selected section with filters, export, and print.",
    showing: "Showing",
    of: "of",
    rows: "rows",
    company: "Company",
    phone: "WhatsApp phone",
    token: "Token",
    webhook: "Webhook",
    verified: "Last verified",
    updatedAt: "Updated at",
    template: "Template",
    code: "Code",
    language: "Language",
    body: "Body",
    variables: "Variables",
    recipient: "Recipient",
    message: "Message",
    source: "Source",
    sentAt: "Sent at",
    action: "Action",
    enabled: "Enabled",
    disabled: "Disabled",
    yes: "Yes",
    no: "No",
    activate: "Activate",
    deactivate: "Deactivate",
    archive: "Archive",
    mock: "Mock",
    cloud: "WhatsApp Cloud",
    custom: "Custom provider",
    draft: "Draft",
    active: "Active",
    inactive: "Inactive",
    archived: "Archived",
    queued: "Queued",
    sent: "Sent",
    delivered: "Delivered",
    read: "Read",
    failed: "Failed",
    cancelled: "Cancelled",
    general: "General",
    sales: "Sales",
    purchases: "Purchases",
    treasury: "Treasury",
    pos: "POS",
    accounting: "Accounting",
    inventory: "Inventory",
    customerService: "Customer service",
    noDataTitle: "No data",
    noDataDesc: "WhatsApp data will appear here when available from the API.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to view other results.",
    errorTitle: "Could not load WhatsApp center",
    errorDesc: "Make sure you have system permission and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "PrimeyAcc System WhatsApp Report",
    generatedAt: "Generated at",
    refreshed: "WhatsApp center refreshed.",
    statusUpdated: "Template status updated.",
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
function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(toNumber(value)),
  );
}
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/+$/,
          "",
        )
      : "";
  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}
function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}
function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}
async function ensureCsrfToken() {
  let token = getCookie("csrftoken");
  if (token) return token;
  await fetch(makeApiUrl("/api/auth/csrf/"), {
    credentials: "include",
    cache: "no-store",
  }).catch(() => null);
  token = getCookie("csrftoken");
  return token;
}
async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(makeApiUrl(path), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let payload: unknown = null;
  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = null;
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
  return (payload || {}) as T;
}
async function postJson<T>(path: string, body: ApiRecord): Promise<T> {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch(makeApiUrl(path), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify(body),
  });
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let payload: unknown = null;
  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = null;
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
  return (payload || {}) as T;
}
function extractResults(payload: unknown): unknown[] {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  return [];
}
function normalizeCompany(value: unknown): CompanyPayload {
  const record = asRecord(value);
  return {
    id: normalizeText(record.id, "—"),
    name: normalizeText(record.name, "—"),
    companyCode:
      normalizeText(record.company_code) ||
      normalizeText(record.code) ||
      "—",
    isActive: Boolean(record.is_active),
    status: normalizeText(record.status),
  };
}
function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeText(item)).filter(Boolean);
}
function normalizeSetting(value: unknown): SettingRow {
  const record = asRecord(value);
  return {
    id: normalizeText(record.id, "—"),
    company: normalizeCompany(record.company),
    isEnabled: Boolean(record.is_enabled),
    provider: normalizeText(record.provider, "MOCK").toUpperCase(),
    phoneNumber: normalizeText(record.phone_number, "—"),
    phoneNumberId: normalizeText(record.phone_number_id, "—"),
    businessAccountId: normalizeText(record.business_account_id, "—"),
    defaultCountryCode: normalizeText(record.default_country_code, "+966"),
    hasAccessToken: Boolean(record.has_access_token),
    hasWebhookVerifyToken: Boolean(record.has_webhook_verify_token),
    sendInvoiceNotifications: Boolean(record.send_invoice_notifications),
    sendPaymentNotifications: Boolean(record.send_payment_notifications),
    sendPosNotifications: Boolean(record.send_pos_notifications),
    sendSystemNotifications: Boolean(record.send_system_notifications),
    lastVerifiedAt: normalizeText(record.last_verified_at) || null,
    updatedAt: normalizeText(record.updated_at) || null,
  };
}
function normalizeTemplate(value: unknown): TemplateRow {
  const record = asRecord(value);
  return {
    id: normalizeText(record.id, "—"),
    company: normalizeCompany(record.company),
    name: normalizeText(record.name, "—"),
    code: normalizeText(record.code, "—"),
    category: normalizeText(record.category, "GENERAL").toUpperCase(),
    status: normalizeText(record.status, "DRAFT").toUpperCase(),
    language: normalizeText(record.language, "ar"),
    body: normalizeText(record.body, "—"),
    footer: normalizeText(record.footer),
    variables: normalizeStringArray(record.variables),
    isActive: Boolean(record.is_active),
    updatedAt: normalizeText(record.updated_at) || null,
  };
}
function normalizeMessage(value: unknown): MessageRow {
  const record = asRecord(value);
  const template = asRecord(record.template);
  return {
    id: normalizeText(record.id, "—"),
    company: normalizeCompany(record.company),
    templateName: normalizeText(template.name, "—"),
    templateCode: normalizeText(template.code, "—"),
    direction: normalizeText(record.direction, "OUTBOUND").toUpperCase(),
    status: normalizeText(record.status, "DRAFT").toUpperCase(),
    sourceType: normalizeText(record.source_type, "MANUAL").toUpperCase(),
    sourceId: normalizeText(record.source_id, "—"),
    recipientName: normalizeText(record.recipient_name, "—"),
    recipientPhone: normalizeText(record.recipient_phone, "—"),
    messageBody: normalizeText(record.message_body, "—"),
    provider: normalizeText(record.provider, "MOCK").toUpperCase(),
    providerMessageId: normalizeText(record.provider_message_id, "—"),
    errorMessage: normalizeText(record.error_message),
    sentAt: normalizeText(record.sent_at) || null,
    createdAt: normalizeText(record.created_at) || null,
  };
}
function normalizeStats(value: unknown): StatsPayload {
  const record = asRecord(value);
  const settings = asRecord(record.settings);
  const templates = asRecord(record.templates);
  const messages = asRecord(record.messages);
  return {
    settings: {
      total: toNumber(settings.total),
      enabled: toNumber(settings.enabled),
      disabled: toNumber(settings.disabled),
      providers: asRecord(settings.providers) as Record<string, number>,
    },
    templates: {
      total: toNumber(templates.total),
      statuses: asRecord(templates.statuses) as Record<string, number>,
      categories: asRecord(templates.categories) as Record<string, number>,
      languages: asRecord(templates.languages) as Record<string, number>,
    },
    messages: {
      total: toNumber(messages.total),
      statuses: asRecord(messages.statuses) as Record<string, number>,
      directions: asRecord(messages.directions) as Record<string, number>,
      providers: asRecord(messages.providers) as Record<string, number>,
      source_types: asRecord(messages.source_types) as Record<string, number>,
    },
  };
}
function providerLabel(value: string, locale: Locale) {
  const t = translations[locale];
  if (value === "WHATSAPP_CLOUD") return t.cloud;
  if (value === "CUSTOM") return t.custom;
  return t.mock;
}
function statusLabel(value: string, locale: Locale) {
  const t = translations[locale];
  if (value === "DRAFT") return t.draft;
  if (value === "ACTIVE") return t.active;
  if (value === "INACTIVE") return t.inactive;
  if (value === "ARCHIVED") return t.archived;
  if (value === "QUEUED") return t.queued;
  if (value === "SENT") return t.sent;
  if (value === "DELIVERED") return t.delivered;
  if (value === "READ") return t.read;
  if (value === "FAILED") return t.failed;
  if (value === "CANCELLED") return t.cancelled;
  return value || "—";
}
function categoryLabel(value: string, locale: Locale) {
  const t = translations[locale];
  if (value === "SALES") return t.sales;
  if (value === "PURCHASES") return t.purchases;
  if (value === "TREASURY") return t.treasury;
  if (value === "POS") return t.pos;
  if (value === "ACCOUNTING") return t.accounting;
  if (value === "INVENTORY") return t.inventory;
  if (value === "CUSTOMER_SERVICE") return t.customerService;
  return t.general;
}
function statusBadgeClass(value: string) {
  if (["ACTIVE", "SENT", "DELIVERED", "READ"].includes(value)) {
    return "border-emerald-500/30 text-emerald-700";
  }
  if (["FAILED", "CANCELLED", "ARCHIVED"].includes(value)) {
    return "border-red-500/30 text-red-700";
  }
  if (["DRAFT", "QUEUED", "INACTIVE"].includes(value)) {
    return "border-amber-500/30 text-amber-700";
  }
  return "";
}
function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-3 text-3xl font-bold tabular-nums">{formatInteger(value)}</p>
            <p className="mt-4 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-2xl bg-muted p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
function WhatsAppSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Card className="rounded-3xl">
          <CardHeader className="space-y-4">
            <Skeleton className="h-7 w-44 rounded-full" />
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-5 w-full max-w-3xl rounded-xl" />
          </CardHeader>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-5 w-32 rounded-xl" />
                <Skeleton className="h-9 w-20 rounded-xl" />
                <Skeleton className="h-4 w-40 rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
export function SystemWhatsAppCenter({ initialView = "settings", pageMode = "overview" }: { initialView?: ViewMode; pageMode?: WhatsAppPageMode }) {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [view, setView] = React.useState<ViewMode>(initialView);
  const [settings, setSettings] = React.useState<SettingRow[]>([]);
  const [templates, setTemplates] = React.useState<TemplateRow[]>([]);
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [stats, setStats] = React.useState<StatsPayload>(normalizeStats({}));
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [providerFilter, setProviderFilter] = React.useState<ProviderFilter>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<CategoryFilter>("all");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";
  const pageTitle =
    pageMode === "overview"
      ? t.title
      : view === "settings"
        ? t.settingsTitle
        : view === "templates"
          ? t.templatesTitle
          : t.messagesTitle;
  const pageSubtitle =
    pageMode === "overview"
      ? t.subtitle
      : view === "settings"
        ? t.settingsDesc
        : view === "templates"
          ? t.templatesDesc
          : t.messagesDesc;
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
  const loadWhatsApp = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const [overviewPayload, settingsPayload, templatesPayload, messagesPayload] =
          await Promise.all([
            fetchJson<unknown>(API_ROOT),
            fetchJson<unknown>(`${API_ROOT}settings/?limit=100`),
            fetchJson<unknown>(`${API_ROOT}templates/?limit=100`),
            fetchJson<unknown>(`${API_ROOT}messages/?limit=100`),
          ]);
        setStats(normalizeStats(asRecord(overviewPayload).stats));
        setSettings(extractResults(settingsPayload).map(normalizeSetting));
        setTemplates(extractResults(templatesPayload).map(normalizeTemplate));
        setMessages(extractResults(messagesPayload).map(normalizeMessage));
        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.errorDesc, t.refreshed],
  );
  React.useEffect(() => {
    void loadWhatsApp();
  }, [loadWhatsApp]);
  const resetFilters = React.useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setProviderFilter("all");
    setCategoryFilter("all");
  }, []);
  const filteredSettings = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return settings.filter((item) => {
      const haystack = [
        item.company.name,
        item.company.companyCode,
        item.phoneNumber,
        item.phoneNumberId,
        item.businessAccountId,
        item.provider,
      ]
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (statusFilter === "enabled" && !item.isEnabled) return false;
      if (statusFilter === "disabled" && item.isEnabled) return false;
      if (providerFilter !== "all" && item.provider !== providerFilter) return false;
      return true;
    });
  }, [providerFilter, search, settings, statusFilter]);
  const filteredTemplates = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return templates.filter((item) => {
      const haystack = [
        item.company.name,
        item.company.companyCode,
        item.name,
        item.code,
        item.category,
        item.status,
        item.language,
        item.body,
      ]
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (!["all", "enabled", "disabled"].includes(statusFilter) && item.status !== statusFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      return true;
    });
  }, [categoryFilter, search, statusFilter, templates]);
  const filteredMessages = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return messages.filter((item) => {
      const haystack = [
        item.company.name,
        item.company.companyCode,
        item.templateName,
        item.templateCode,
        item.recipientName,
        item.recipientPhone,
        item.messageBody,
        item.provider,
        item.status,
        item.sourceType,
        item.sourceId,
      ]
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (!["all", "enabled", "disabled", "DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"].includes(statusFilter) && item.status !== statusFilter) return false;
      if (providerFilter !== "all" && item.provider !== providerFilter) return false;
      return true;
    });
  }, [messages, providerFilter, search, statusFilter]);
  const visibleCount =
    view === "settings"
      ? filteredSettings.length
      : view === "templates"
        ? filteredTemplates.length
        : filteredMessages.length;
  const totalCount =
    view === "settings"
      ? settings.length
      : view === "templates"
        ? templates.length
        : messages.length;
  const hasFilters =
    Boolean(search) ||
    statusFilter !== "all" ||
    providerFilter !== "all" ||
    categoryFilter !== "all";
  const statusOptions = React.useMemo(() => {
    if (view === "settings") {
      return [
        { value: "all", label: t.all },
        { value: "enabled", label: t.enabled },
        { value: "disabled", label: t.disabled },
      ];
    }
    if (view === "templates") {
      return [
        { value: "all", label: t.all },
        { value: "DRAFT", label: t.draft },
        { value: "ACTIVE", label: t.active },
        { value: "INACTIVE", label: t.inactive },
        { value: "ARCHIVED", label: t.archived },
      ];
    }
    return [
      { value: "all", label: t.all },
      { value: "DRAFT", label: t.draft },
      { value: "QUEUED", label: t.queued },
      { value: "SENT", label: t.sent },
      { value: "DELIVERED", label: t.delivered },
      { value: "READ", label: t.read },
      { value: "FAILED", label: t.failed },
      { value: "CANCELLED", label: t.cancelled },
    ];
  }, [t, view]);
  const categoryOptions = React.useMemo(
    () => [
      { value: "all", label: t.all },
      { value: "GENERAL", label: t.general },
      { value: "SALES", label: t.sales },
      { value: "PURCHASES", label: t.purchases },
      { value: "TREASURY", label: t.treasury },
      { value: "POS", label: t.pos },
      { value: "ACCOUNTING", label: t.accounting },
      { value: "INVENTORY", label: t.inventory },
      { value: "CUSTOMER_SERVICE", label: t.customerService },
    ],
    [t],
  );
  const providerOptions = React.useMemo(
    () => [
      { value: "all", label: t.all },
      { value: "MOCK", label: t.mock },
      { value: "WHATSAPP_CLOUD", label: t.cloud },
      { value: "CUSTOM", label: t.custom },
    ],
    [t],
  );
  function getExportRows() {
    if (view === "settings") {
      return filteredSettings.map((item) => [
        item.company.name,
        item.company.companyCode,
        item.isEnabled ? t.enabled : t.disabled,
        providerLabel(item.provider, locale),
        item.phoneNumber,
        item.phoneNumberId,
        item.hasAccessToken ? t.yes : t.no,
        item.hasWebhookVerifyToken ? t.yes : t.no,
        formatDate(item.lastVerifiedAt),
        formatDate(item.updatedAt),
      ]);
    }
    if (view === "templates") {
      return filteredTemplates.map((item) => [
        item.company.name,
        item.company.companyCode,
        item.name,
        item.code,
        categoryLabel(item.category, locale),
        statusLabel(item.status, locale),
        item.language,
        item.variables.join(", "),
        item.body,
        formatDate(item.updatedAt),
      ]);
    }
    return filteredMessages.map((item) => [
      item.company.name,
      item.company.companyCode,
      item.recipientName,
      item.recipientPhone,
      item.messageBody,
      providerLabel(item.provider, locale),
      statusLabel(item.status, locale),
      item.sourceType,
      item.sourceId,
      formatDate(item.sentAt || item.createdAt),
    ]);
  }
  function getExportHeaders() {
    if (view === "settings") {
      return [
        t.company,
        t.code,
        t.status,
        t.provider,
        t.phone,
        "Phone number ID",
        t.token,
        t.webhook,
        t.verified,
        t.updatedAt,
      ];
    }
    if (view === "templates") {
      return [
        t.company,
        t.code,
        t.template,
        t.code,
        t.category,
        t.status,
        t.language,
        t.variables,
        t.body,
        t.updatedAt,
      ];
    }
    return [
      t.company,
      t.code,
      t.recipient,
      t.phone,
      t.message,
      t.provider,
      t.status,
      t.source,
      "Source ID",
      t.sentAt,
    ];
  }
  function buildTableHtml() {
    const headers = getExportHeaders();
    const rows = getExportRows();
    return `
      <table border="1" cellspacing="0" cellpadding="6">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    `;
  }
  function exportExcel() {
    const rows = getExportRows();
    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }
    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml()}
        </body>
      </html>
    `;
    const blob = new Blob([`\ufeff${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `primeyacc-system-whatsapp-${view}-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function openPrintWindow(mode: "print" | "pdf") {
    const rows = getExportRows();
    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }
    if (mode === "pdf") toast.info(t.pdfHint);
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!printWindow) return;
    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.reportTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              font-size: 12px;
              text-align: ${dir === "rtl" ? "right" : "left"};
              vertical-align: top;
            }
            th { background: #f1f5f9; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml()}
        </body>
      </html>
    `);
    printWindow.document.close();
    window.setTimeout(() => printWindow.print(), 250);
  }
  async function updateTemplateStatus(template: TemplateRow, nextStatus: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    try {
      setSavingId(template.id);
      await postJson(`${API_ROOT}templates/${template.id}/status/`, {
        status: nextStatus,
      });
      toast.success(t.statusUpdated);
      await loadWhatsApp({ silent: false });
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : t.errorDesc);
    } finally {
      setSavingId(null);
    }
  }
  if (loading) return <WhatsAppSkeleton />;
  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-3xl border-destructive/30 bg-card shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => void loadWhatsApp({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-4xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.badge}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{pageTitle}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{pageSubtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadWhatsApp({ silent: true })}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.exportExcel}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("print")}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("pdf")}>
                  <FileText className="h-4 w-4" />
                  {t.pdf}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.enabledCompanies} value={stats.settings.enabled} description={t.fromLiveApi} icon={Building2} />
          <KpiCard title={t.templatesCount} value={stats.templates.total} description={t.fromLiveApi} icon={FileText} />
          <KpiCard title={t.messagesCount} value={stats.messages.total} description={t.fromLiveApi} icon={Send} />
          <KpiCard title={t.failedMessages} value={toNumber(stats.messages.statuses.FAILED)} description={t.fromLiveApi} icon={AlertTriangle} />
        </div>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.actionsTitle}</CardTitle>
            <CardDescription>{t.actionsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { key: "settings", title: t.settingsTitle, description: t.settingsDesc, icon: Settings2 },
                { key: "templates", title: t.templatesTitle, description: t.templatesDesc, icon: FileText },
                { key: "messages", title: t.messagesTitle, description: t.messagesDesc, icon: MessageCircle },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => {
                      const nextView = action.key as ViewMode;
                      setView(nextView);
                      resetFilters();
                      if (typeof window !== "undefined") {
                        window.history.pushState(null, "", `/system/whatsapp/${nextView}`);
                      }
                    }}
                    className={cn(
                      "group rounded-2xl border bg-background p-5 text-start transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm",
                      view === action.key && "border-primary/50 bg-primary/5",
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-muted p-3 text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold">{action.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              <Link
                href="/system/notifications"
                className="group rounded-2xl border bg-background p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-muted p-3 text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
                    <BellRing className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold">{t.notificationsTitle}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.notificationsDesc}</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.tableTitle}</CardTitle>
                <CardDescription className="mt-2">{t.tableDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <Inbox className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(visibleCount)} {t.of} {formatInteger(totalCount)} {t.rows}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-10 rounded-xl ps-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {view !== "templates" ? (
                  <Select value={providerFilter} onValueChange={(value) => setProviderFilter(value as ProviderFilter)}>
                    <SelectTrigger className="h-10 rounded-xl bg-background md:w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providerOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
                    <SelectTrigger className="h-10 rounded-xl bg-background md:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
                <Link href="/system" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted">
                  <LayoutDashboard className="h-4 w-4" />
                  {t.dashboard}
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                {view === "settings" ? (
                  <Table className="w-full min-w-[1080px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        <TableHead className={cn("w-[230px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.company}</TableHead>
                        <TableHead className={cn("w-[120px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.status}</TableHead>
                        <TableHead className={cn("w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.provider}</TableHead>
                        <TableHead className={cn("w-[170px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.phone}</TableHead>
                        <TableHead className={cn("w-[120px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.token}</TableHead>
                        <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.webhook}</TableHead>
                        <TableHead className={cn("w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.verified}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSettings.length ? (
                        filteredSettings.map((item) => (
                          <TableRow key={item.id} className="h-[68px]">
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <span className="block truncate text-sm font-semibold">{item.company.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">{item.company.companyCode}</span>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <Badge variant="outline" className={cn("rounded-full", item.isEnabled ? "border-emerald-500/30 text-emerald-700" : "border-amber-500/30 text-amber-700")}>
                                {item.isEnabled ? t.enabled : t.disabled}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <Badge variant="secondary" className="rounded-full">
                                <Wifi className="h-3.5 w-3.5" />
                                {providerLabel(item.provider, locale)}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle text-sm", alignClass)}>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{item.phoneNumber}</span>
                              </div>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              {item.hasAccessToken ? t.yes : t.no}
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              {item.hasWebhookVerifyToken ? t.yes : t.no}
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle text-sm text-muted-foreground", alignClass)}>
                              {formatDate(item.lastVerifiedAt)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableEmptyState colSpan={7} hasFilters={hasFilters} locale={locale} />
                      )}
                    </TableBody>
                  </Table>
                ) : null}
                {view === "templates" ? (
                  <Table className="w-full min-w-[1180px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        <TableHead className={cn("w-[210px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.company}</TableHead>
                        <TableHead className={cn("w-[230px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.template}</TableHead>
                        <TableHead className={cn("w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.category}</TableHead>
                        <TableHead className={cn("w-[125px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.status}</TableHead>
                        <TableHead className={cn("w-[90px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.language}</TableHead>
                        <TableHead className={cn("w-[250px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.body}</TableHead>
                        <TableHead className="sticky left-0 z-10 w-[210px] bg-muted/40 px-3 text-center text-xs font-semibold text-muted-foreground">{t.action}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTemplates.length ? (
                        filteredTemplates.map((item) => (
                          <TableRow key={item.id} className="h-[72px]">
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <span className="block truncate text-sm font-semibold">{item.company.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">{item.company.companyCode}</span>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <span className="block truncate text-sm font-semibold">{item.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">{item.code}</span>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <Badge variant="secondary" className="rounded-full">
                                {categoryLabel(item.category, locale)}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(item.status))}>
                                {statusLabel(item.status, locale)}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle text-sm", alignClass)}>
                              {item.language}
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{item.body}</span>
                            </TableCell>
                            <TableCell className="sticky left-0 z-10 bg-background px-3 text-center align-middle">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 rounded-xl bg-background"
                                  disabled={savingId === item.id}
                                  onClick={() => void updateTemplateStatus(item, item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                                >
                                  {savingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                  {item.status === "ACTIVE" ? t.deactivate : t.activate}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 rounded-xl bg-background"
                                  disabled={savingId === item.id || item.status === "ARCHIVED"}
                                  onClick={() => void updateTemplateStatus(item, "ARCHIVED")}
                                >
                                  <Archive className="h-4 w-4" />
                                  {t.archive}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableEmptyState colSpan={7} hasFilters={hasFilters} locale={locale} />
                      )}
                    </TableBody>
                  </Table>
                ) : null}
                {view === "messages" ? (
                  <Table className="w-full min-w-[1180px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        <TableHead className={cn("w-[210px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.company}</TableHead>
                        <TableHead className={cn("w-[170px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.recipient}</TableHead>
                        <TableHead className={cn("w-[260px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.message}</TableHead>
                        <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.provider}</TableHead>
                        <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.status}</TableHead>
                        <TableHead className={cn("w-[170px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.source}</TableHead>
                        <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.sentAt}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMessages.length ? (
                        filteredMessages.map((item) => (
                          <TableRow key={item.id} className="h-[72px]">
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <span className="block truncate text-sm font-semibold">{item.company.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">{item.company.companyCode}</span>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <span className="block truncate text-sm font-semibold">{item.recipientName}</span>
                              <span className="block truncate text-xs text-muted-foreground">{item.recipientPhone}</span>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{item.messageBody}</span>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <Badge variant="secondary" className="rounded-full">
                                {providerLabel(item.provider, locale)}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(item.status))}>
                                {statusLabel(item.status, locale)}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle", alignClass)}>
                              <span className="block truncate text-sm">{item.sourceType}</span>
                              <span className="block truncate text-xs text-muted-foreground">{item.sourceId}</span>
                            </TableCell>
                            <TableCell className={cn("px-4 align-middle text-sm text-muted-foreground", alignClass)}>
                              {formatDate(item.sentAt || item.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableEmptyState colSpan={7} hasFilters={hasFilters} locale={locale} />
                      )}
                    </TableBody>
                  </Table>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
function TableEmptyState({
  colSpan,
  hasFilters,
  locale,
}: {
  colSpan: number;
  hasFilters: boolean;
  locale: Locale;
}) {
  const t = translations[locale];
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-64 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-4 text-muted-foreground">
            <Inbox className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-semibold">
              {hasFilters ? t.noResultsTitle : t.noDataTitle}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFilters ? t.noResultsDesc : t.noDataDesc}
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

