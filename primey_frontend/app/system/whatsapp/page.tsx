"use client";
/* ============================================================
   📂 primey_frontend/app/system/whatsapp/page.tsx
   💬 PrimeyAcc — System WhatsApp Overview Page
   ------------------------------------------------------------
   ✅ Standalone route page, no internal tabs
   ✅ Approved Premium system page pattern
   ✅ Real API only: /api/system/whatsapp/
   ✅ Links to standalone settings/templates/messages pages
   ✅ No SystemWhatsAppCenter dependency
   ✅ No company WhatsApp mutation
   ✅ Arabic/English via primey-locale
============================================================ */
import * as React from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  RefreshCw,
  SendHorizontal,
  Settings2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type TemplatePreview = {
  id: string;
  companyName: string;
  name: string;
  code: string;
  status: string;
  category: string;
  updatedAt: string | null;
};
type MessagePreview = {
  id: string;
  companyName: string;
  recipientName: string;
  recipientPhone: string;
  templateName: string;
  status: string;
  provider: string;
  createdAt: string | null;
};
type OverviewState = {
  stats: {
    settingsTotal: number;
    templatesTotal: number;
    messagesTotal: number;
    activeTemplates: number;
    failedMessages: number;
    sentMessages: number;
  };
  connection: {
    status: string;
    provider: string;
    sessionName: string;
    phoneNumber: string;
    gatewayConfigured: boolean;
    qrAvailable: boolean;
    pairingCodeAvailable: boolean;
    lastCheckedAt: string | null;
    errorMessage: string;
  };
  templates: TemplatePreview[];
  messages: MessagePreview[];
};
const API_ROOT = "/api/system/whatsapp/";
const tr = {
  ar: {
    title: "مركز واتساب النظام",
    subtitle:
      "نظرة عامة مستقلة على اتصال واتساب الرسمي، القوالب، وسجل الرسائل في PrimeyAcc باستخدام واجهات النظام الحقيقية.",
    badge: "التواصل والإشعارات",
    refresh: "تحديث",
    live: "من واجهات النظام الحقيقية",
    connected: "متصل",
    disconnected: "غير متصل",
    unknown: "غير معروف",
    configured: "مهيأ",
    notConfigured: "غير مهيأ",
    available: "متوفر",
    notAvailable: "غير متوفر",
    connectionStatus: "حالة الاتصال",
    templatesTotal: "إجمالي القوالب",
    messagesTotal: "إجمالي الرسائل",
    failedMessages: "رسائل فاشلة",
    pagesTitle: "صفحات واتساب النظام",
    pagesDesc: "انتقال مباشر للصفحات المستقلة بدون تبويبات داخلية.",
    settingsTitle: "إعدادات واتساب",
    settingsDesc: "إدارة الاتصال، QR، Pairing Code، وWebhook.",
    templatesTitle: "قوالب واتساب",
    templatesDesc: "مراجعة القوالب وتفعيلها أو أرشفتها.",
    messagesTitle: "سجل الرسائل",
    messagesDesc: "متابعة الرسائل المرسلة والفاشلة.",
    dashboardTitle: "لوحة النظام",
    dashboardDesc: "العودة إلى لوحة النظام الرئيسية.",
    connectionTitle: "اتصال واتساب الرسمي",
    connectionDesc: "ملخص الاتصال الرسمي المستخدم لإرسال إشعارات النظام.",
    provider: "المزود",
    sessionName: "اسم الجلسة",
    phoneNumber: "رقم الهاتف",
    gatewayConfigured: "إعداد البوابة",
    qrAvailable: "QR",
    pairingAvailable: "Pairing Code",
    lastCheckedAt: "آخر فحص",
    errorMessage: "آخر خطأ",
    latestTemplates: "أحدث القوالب",
    latestTemplatesDesc: "آخر قوالب واتساب المعروضة من API.",
    latestMessages: "أحدث الرسائل",
    latestMessagesDesc: "آخر رسائل واتساب المسجلة من API.",
    company: "الشركة",
    template: "القالب",
    code: "الكود",
    category: "الفئة",
    status: "الحالة",
    recipient: "المستلم",
    providerColumn: "المزود",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    DRAFT: "مسودة",
    ACTIVE: "نشط",
    INACTIVE: "غير نشط",
    ARCHIVED: "مؤرشف",
    QUEUED: "بالانتظار",
    SENT: "مرسلة",
    DELIVERED: "تم التسليم",
    READ: "مقروءة",
    FAILED: "فاشلة",
    CANCELLED: "ملغاة",
    noTemplates: "لا توجد قوالب للعرض.",
    noMessages: "لا توجد رسائل للعرض.",
    errorTitle: "تعذر تحميل مركز واتساب النظام",
    errorDesc: "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند.",
    tryAgain: "إعادة المحاولة",
  },
  en: {
    title: "System WhatsApp Center",
    subtitle:
      "Standalone overview for the official WhatsApp connection, templates, and message logs in PrimeyAcc using real system APIs.",
    badge: "Communication",
    refresh: "Refresh",
    live: "From real system APIs",
    connected: "Connected",
    disconnected: "Disconnected",
    unknown: "Unknown",
    configured: "Configured",
    notConfigured: "Not configured",
    available: "Available",
    notAvailable: "Not available",
    connectionStatus: "Connection status",
    templatesTotal: "Total templates",
    messagesTotal: "Total messages",
    failedMessages: "Failed messages",
    pagesTitle: "System WhatsApp pages",
    pagesDesc: "Direct navigation to standalone pages with no internal tabs.",
    settingsTitle: "WhatsApp settings",
    settingsDesc: "Manage connection, QR, pairing code, and webhook.",
    templatesTitle: "WhatsApp templates",
    templatesDesc: "Review, activate, or archive templates.",
    messagesTitle: "Message logs",
    messagesDesc: "Monitor sent and failed messages.",
    dashboardTitle: "System dashboard",
    dashboardDesc: "Return to the main system dashboard.",
    connectionTitle: "Official WhatsApp connection",
    connectionDesc: "Connection summary used to send system notifications.",
    provider: "Provider",
    sessionName: "Session name",
    phoneNumber: "Phone number",
    gatewayConfigured: "Gateway",
    qrAvailable: "QR",
    pairingAvailable: "Pairing code",
    lastCheckedAt: "Last checked",
    errorMessage: "Last error",
    latestTemplates: "Latest templates",
    latestTemplatesDesc: "Latest WhatsApp templates returned from the API.",
    latestMessages: "Latest messages",
    latestMessagesDesc: "Latest WhatsApp messages returned from the API.",
    company: "Company",
    template: "Template",
    code: "Code",
    category: "Category",
    status: "Status",
    recipient: "Recipient",
    providerColumn: "Provider",
    createdAt: "Created at",
    updatedAt: "Updated at",
    DRAFT: "Draft",
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    ARCHIVED: "Archived",
    QUEUED: "Queued",
    SENT: "Sent",
    DELIVERED: "Delivered",
    READ: "Read",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    noTemplates: "No templates to display.",
    noMessages: "No messages to display.",
    errorTitle: "Failed to load System WhatsApp Center",
    errorDesc: "Make sure you are signed in with system permissions and the backend is running.",
    tryAgain: "Try again",
  },
} as const;
function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ApiRecord) : {};
}
function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
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
  const stored = window.localStorage.getItem("primey-locale") || window.localStorage.getItem("locale") || window.localStorage.getItem("lang");
  if (stored?.toLowerCase().startsWith("en")) return "en";
  return document.documentElement.lang?.toLowerCase().startsWith("en") ? "en" : "ar";
}
async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    throw new Error(toStringValue(asRecord(payload).message) || `Request failed: ${response.status}`);
  }
  return payload;
}
function extractResults(payload: unknown): unknown[] {
  const record = asRecord(payload);
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  return Array.isArray(payload) ? payload : [];
}
function countStatus(items: Array<{ status: string }>, statuses: string[]): number {
  return items.filter((item) => statuses.includes(item.status.toUpperCase())).length;
}
function normalizeTemplate(value: unknown): TemplatePreview {
  const record = asRecord(value);
  const company = asRecord(record.company);
  return {
    id: toStringValue(record.id),
    companyName: toStringValue(company.name || company.company_name || company.title || record.company_name || record.companyName),
    name: toStringValue(record.name),
    code: toStringValue(record.code),
    status: toStringValue(record.status, "DRAFT").toUpperCase(),
    category: toStringValue(record.category, "GENERAL").toUpperCase(),
    updatedAt: toStringValue(record.updated_at || record.updatedAt) || null,
  };
}
function normalizeMessage(value: unknown): MessagePreview {
  const record = asRecord(value);
  const company = asRecord(record.company);
  const template = asRecord(record.template);
  return {
    id: toStringValue(record.id),
    companyName: toStringValue(company.name || company.company_name || company.title || record.company_name || record.companyName),
    recipientName: toStringValue(record.recipient_name || record.recipientName),
    recipientPhone: toStringValue(record.recipient_phone || record.recipientPhone),
    templateName: toStringValue(record.template_name || record.templateName || template.name || template.code || record.template_id),
    status: toStringValue(record.status || record.delivery_status, "DRAFT").toUpperCase(),
    provider: toStringValue(record.provider, "MOCK").toUpperCase(),
    createdAt: toStringValue(record.created_at || record.createdAt) || null,
  };
}
function normalizeOverview(overviewPayload: unknown, connectionPayload: unknown, templatesPayload: unknown, messagesPayload: unknown): OverviewState {
  const overview = asRecord(overviewPayload);
  const stats = asRecord(overview.stats);
  const templatesStats = asRecord(asRecord(stats.templates));
  const messagesStats = asRecord(asRecord(stats.messages));
  const settingsStats = asRecord(asRecord(stats.settings));
  const connection = asRecord(connectionPayload);
  const connectionData = asRecord(connection.connection || connection.data || connection);
  const templates = extractResults(templatesPayload).map(normalizeTemplate);
  const messages = extractResults(messagesPayload).map(normalizeMessage);
  return {
    stats: {
      settingsTotal: toNumber(settingsStats.total),
      templatesTotal: toNumber(templatesStats.total) || templates.length,
      messagesTotal: toNumber(messagesStats.total) || messages.length,
      activeTemplates: toNumber(asRecord(templatesStats.statuses).ACTIVE) || countStatus(templates, ["ACTIVE"]),
      failedMessages: toNumber(asRecord(messagesStats.statuses).FAILED) || countStatus(messages, ["FAILED", "CANCELLED"]),
      sentMessages: toNumber(asRecord(messagesStats.statuses).SENT) || countStatus(messages, ["SENT", "DELIVERED", "READ"]),
    },
    connection: {
      status: toStringValue(connectionData.session_status || connectionData.status || connectionData.connection_status, "disconnected").toUpperCase(),
      provider: toStringValue(connectionData.provider, "WEB_SESSION").toUpperCase(),
      sessionName: toStringValue(connectionData.session_name || connectionData.sessionName),
      phoneNumber: toStringValue(connectionData.phone_number || connectionData.phoneNumber || connectionData.connected_phone_number),
      gatewayConfigured: toBool(connectionData.gateway_configured || connectionData.gatewayConfigured),
      qrAvailable: Boolean(toStringValue(connectionData.qr_code || connectionData.qrCode || connectionData.last_qr_code)),
      pairingCodeAvailable: Boolean(toStringValue(connectionData.pairing_code || connectionData.pairingCode || connectionData.last_pairing_code)),
      lastCheckedAt: toStringValue(connectionData.last_checked_at || connectionData.lastCheckedAt || connectionData.updated_at) || null,
      errorMessage: toStringValue(connectionData.last_error || connectionData.error_message || connectionData.errorMessage),
    },
    templates,
    messages,
  };
}
function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value || 0);
}
function formatDate(value: string | null, locale: Locale): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function labelFor(value: string, locale: Locale): string {
  const dictionary = tr[locale] as Record<string, string>;
  return dictionary[value.toUpperCase()] || value || "—";
}
function statusBadgeClass(value: string): string {
  const status = value.toUpperCase();
  if (["CONNECTED", "ACTIVE", "SENT", "DELIVERED", "READ"].includes(status)) return "border-emerald-500/30 text-emerald-700";
  if (["FAILED", "CANCELLED", "ERROR"].includes(status)) return "border-destructive/40 text-destructive";
  if (["QUEUED", "DRAFT", "DISCONNECTED", "INACTIVE"].includes(status)) return "border-amber-500/30 text-amber-700";
  return "border-muted-foreground/30 text-muted-foreground";
}
function KpiCard({ title, value, description, icon: Icon }: { title: string; value: string | number; description: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 truncate text-3xl font-bold tracking-tight">{typeof value === "number" ? formatInteger(value) : value}</CardTitle>
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
function OverviewSkeleton({ dir }: { dir: "rtl" | "ltr" }) {
  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-8 w-72" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
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
      </div>
    </main>
  );
}
export default function SystemWhatsAppPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [overview, setOverview] = React.useState<OverviewState>(() => normalizeOverview({}, {}, [], []));
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const t = tr[locale];
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
  const loadOverview = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const [overviewPayload, connectionPayload, templatesPayload, messagesPayload] = await Promise.all([
          fetchJson<unknown>(API_ROOT),
          fetchJson<unknown>(`${API_ROOT}connection/status/`),
          fetchJson<unknown>(`${API_ROOT}templates/?limit=5`),
          fetchJson<unknown>(`${API_ROOT}messages/?limit=5`),
        ]);
        setOverview(normalizeOverview(overviewPayload, connectionPayload, templatesPayload, messagesPayload));
        if (silent) toast.success(t.refresh);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.errorDesc, t.refresh],
  );
  React.useEffect(() => {
    void loadOverview();
  }, [loadOverview]);
  const connectionConnected = overview.connection.status === "CONNECTED";
  const pageLinks = [
    { title: t.settingsTitle, desc: t.settingsDesc, href: "/system/whatsapp/settings", icon: Settings2 },
    { title: t.templatesTitle, desc: t.templatesDesc, href: "/system/whatsapp/templates", icon: FileText },
    { title: t.messagesTitle, desc: t.messagesDesc, href: "/system/whatsapp/messages", icon: SendHorizontal },
    { title: t.dashboardTitle, desc: t.dashboardDesc, href: "/system", icon: LayoutDashboard },
  ];
  if (loading) return <OverviewSkeleton dir={dir} />;
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
            <Button onClick={() => void loadOverview({ silent: true })} className="rounded-xl">
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
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
              </div>
              <Button variant="outline" className="w-fit rounded-xl bg-background" onClick={() => void loadOverview({ silent: true })} disabled={refreshing}>
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {t.refresh}
              </Button>
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t.connectionStatus}
            value={connectionConnected ? t.connected : t.disconnected}
            description={t.live}
            icon={connectionConnected ? Wifi : WifiOff}
          />
          <KpiCard title={t.templatesTotal} value={overview.stats.templatesTotal} description={t.live} icon={FileText} />
          <KpiCard title={t.messagesTotal} value={overview.stats.messagesTotal} description={t.live} icon={MessageCircle} />
          <KpiCard title={t.failedMessages} value={overview.stats.failedMessages} description={t.live} icon={XCircle} />
        </div>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.pagesTitle}</CardTitle>
            <CardDescription>{t.pagesDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pageLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.href} className="group rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <Link href={item.href} className="block h-full">
                      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                        <div className="min-w-0">
                          <CardTitle className="text-base">{item.title}</CardTitle>
                          <CardDescription className="mt-2 line-clamp-2">{item.desc}</CardDescription>
                        </div>
                        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                          <Icon className="h-5 w-5" />
                        </span>
                      </CardHeader>
                    </Link>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.connectionTitle}</CardTitle>
              <CardDescription>{t.connectionDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                [t.status, connectionConnected ? t.connected : labelFor(overview.connection.status, locale)],
                [t.provider, overview.connection.provider || "—"],
                [t.sessionName, overview.connection.sessionName || "—"],
                [t.phoneNumber, overview.connection.phoneNumber || "—"],
                [t.gatewayConfigured, overview.connection.gatewayConfigured ? t.configured : t.notConfigured],
                [t.qrAvailable, overview.connection.qrAvailable ? t.available : t.notAvailable],
                [t.pairingAvailable, overview.connection.pairingCodeAvailable ? t.available : t.notAvailable],
                [t.lastCheckedAt, formatDate(overview.connection.lastCheckedAt, locale)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border bg-background px-4 py-3">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="max-w-[60%] truncate text-sm font-semibold">{value}</span>
                </div>
              ))}
              {overview.connection.errorMessage ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {overview.connection.errorMessage}
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.latestTemplates}</CardTitle>
              <CardDescription>{t.latestTemplatesDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-2xl border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("text-xs font-semibold text-muted-foreground", alignClass)}>{t.company}</TableHead>
                      <TableHead className={cn("text-xs font-semibold text-muted-foreground", alignClass)}>{t.template}</TableHead>
                      <TableHead className={cn("text-xs font-semibold text-muted-foreground", alignClass)}>{t.status}</TableHead>
                      <TableHead className={cn("text-xs font-semibold text-muted-foreground", alignClass)}>{t.updatedAt}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.templates.length ? (
                      overview.templates.map((item) => (
                        <TableRow key={item.id || item.code || item.name}>
                          <TableCell className={alignClass}>{item.companyName || t.unknown}</TableCell>
                          <TableCell className={alignClass}>
                            <span className="block font-medium">{item.name || "—"}</span>
                            <span className="text-xs text-muted-foreground">{item.code || "—"}</span>
                          </TableCell>
                          <TableCell className={alignClass}>
                            <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(item.status))}>{labelFor(item.status, locale)}</Badge>
                          </TableCell>
                          <TableCell className={alignClass}>{formatDate(item.updatedAt, locale)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground">
                          {t.noTemplates}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.latestMessages}</CardTitle>
            <CardDescription>{t.latestMessagesDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className={cn("text-xs font-semibold text-muted-foreground", alignClass)}>{t.company}</TableHead>
                    <TableHead className={cn("text-xs font-semibold text-muted-foreground", alignClass)}>{t.recipient}</TableHead>
                    <TableHead className={cn("text-xs font-semibold text-muted-foreground", alignClass)}>{t.template}</TableHead>
                    <TableHead className={cn("text-xs font-semibold text-muted-foreground", alignClass)}>{t.status}</TableHead>
                    <TableHead className={cn("text-xs font-semibold text-muted-foreground", alignClass)}>{t.providerColumn}</TableHead>
                    <TableHead className={cn("text-xs font-semibold text-muted-foreground", alignClass)}>{t.createdAt}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.messages.length ? (
                    overview.messages.map((item) => (
                      <TableRow key={item.id || `${item.recipientPhone}-${item.createdAt}`}>
                        <TableCell className={alignClass}>{item.companyName || t.unknown}</TableCell>
                        <TableCell className={alignClass}>
                          <span className="block font-medium">{item.recipientName || item.recipientPhone || "—"}</span>
                          <span className="text-xs text-muted-foreground">{item.recipientPhone || "—"}</span>
                        </TableCell>
                        <TableCell className={alignClass}>{item.templateName || "—"}</TableCell>
                        <TableCell className={alignClass}>
                          <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(item.status))}>{labelFor(item.status, locale)}</Badge>
                        </TableCell>
                        <TableCell className={alignClass}>{item.provider || "—"}</TableCell>
                        <TableCell className={alignClass}>{formatDate(item.createdAt, locale)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                        {t.noMessages}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
