"use client";
/* ============================================================
   📂 primey_frontend/app/company/whatsapp/messages/page.tsx
   💬 Mhamcloud — Company WhatsApp Message Logs Page
   ------------------------------------------------------------
   ✅ Standalone route page, no internal tabs
   ✅ Approved Premium system page pattern
   ✅ Real API only: /api/company/whatsapp/messages/
   ✅ Message logs monitoring only
   ✅ No company WhatsApp mutation
   ✅ Arabic/English via primey-locale
============================================================ */
import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FileText,
  Inbox,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  SendHorizontal,
  Settings2,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type StatusFilter = "all" | "DRAFT" | "QUEUED" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "CANCELLED";
type DirectionFilter = "all" | "OUTBOUND" | "INBOUND";
type SortKey = "newest" | "oldest" | "recipient" | "status" | "provider" | "direction";
type MessageRow = {
  id: string;
  companyName: string;
  companyCode: string;
  templateName: string;
  templateCode: string;
  recipientName: string;
  recipientPhone: string;
  messageBody: string;
  status: string;
  direction: string;
  provider: string;
  sourceType: string;
  errorMessage: string;
  createdAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
};
const ENDPOINT = "/api/company/whatsapp/messages/?limit=100";
const tr = {
  ar: {
    title: "سجل رسائل واتساب",
    subtitle: "صفحة مستقلة لمتابعة رسائل واتساب المسجلة في النظام مع البحث والتصفية والتصدير والطباعة.",
    badge: "التواصل والإشعارات",
    refresh: "تحديث",
    excel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    reset: "إعادة ضبط",
    total: "إجمالي الرسائل",
    sent: "مرسلة",
    failed: "فاشلة",
    pending: "بانتظار المعالجة",
    live: "من واجهات النظام الحقيقية",
    pagesTitle: "صفحات واتساب النظام",
    pagesDesc: "تنقل بين صفحات واتساب المستقلة بنفس نمط إدارة المنصة.",
    settings: "إعدادات واتساب النظام",
    settingsDesc: "إعداد الرقم الرسمي وQR وWebhook.",
    templates: "قوالب واتساب",
    templatesDesc: "إدارة قوالب واتساب وتحديث حالتها.",
    overview: "مركز واتساب",
    overviewDesc: "نظرة عامة على واتساب النظام.",
    dashboard: "لوحة النظام",
    dashboardDesc: "العودة إلى لوحة النظام.",
    tableTitle: "بيانات رسائل واتساب",
    tableDesc: "جدول الرسائل مع البحث والتصفية حسب الحالة والاتجاه والمزود.",
    search: "ابحث بالشركة أو القالب أو المستلم أو رقم الهاتف أو نص الرسالة...",
    statusFilter: "الحالة",
    directionFilter: "الاتجاه",
    sort: "الترتيب",
    all: "الكل",
    newest: "الأحدث",
    oldest: "الأقدم",
    recipientSort: "المستلم",
    statusSort: "الحالة",
    providerSort: "المزود",
    directionSort: "الاتجاه",
    company: "الشركة",
    recipient: "المستلم",
    template: "القالب",
    status: "الحالة",
    direction: "الاتجاه",
    provider: "المزود",
    source: "المصدر",
    body: "نص الرسالة",
    createdAt: "تاريخ الإنشاء",
    timeline: "التتبع",
    error: "الخطأ",
    DRAFT: "مسودة",
    QUEUED: "بالانتظار",
    SENT: "مرسلة",
    DELIVERED: "تم التسليم",
    READ: "مقروءة",
    FAILED: "فاشلة",
    CANCELLED: "ملغاة",
    OUTBOUND: "صادرة",
    INBOUND: "واردة",
    noData: "لا توجد بيانات",
    noDataDesc: "ستظهر رسائل واتساب هنا عند توفرها من API.",
    noResults: "لا توجد نتائج",
    noResultsDesc: "غيّر البحث أو الفلاتر.",
    errorTitle: "تعذر تحميل سجل رسائل واتساب",
    errorDesc: "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    showing: "عرض",
    of: "من",
    rows: "صف",
    unknown: "غير معروف",
  },
  en: {
    title: "WhatsApp Message Logs",
    subtitle: "Standalone page for monitoring company WhatsApp messages with search, filters, export, and print.",
    badge: "Communication",
    refresh: "Refresh",
    excel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    reset: "Reset",
    total: "Total messages",
    sent: "Sent",
    failed: "Failed",
    pending: "Pending",
    live: "From real system APIs",
    pagesTitle: "Company WhatsApp pages",
    pagesDesc: "Navigate between standalone WhatsApp system pages.",
    settings: "Company WhatsApp settings",
    settingsDesc: "Configure official number, QR, and webhook.",
    templates: "WhatsApp templates",
    templatesDesc: "Manage WhatsApp templates and status.",
    overview: "WhatsApp center",
    overviewDesc: "Company WhatsApp overview.",
    dashboard: "Company dashboard",
    dashboardDesc: "Return to company dashboard.",
    tableTitle: "WhatsApp messages data",
    tableDesc: "Messages table with search and filters by status, direction, and provider.",
    search: "Search company, template, recipient, phone, or message body...",
    statusFilter: "Status",
    directionFilter: "Direction",
    sort: "Sort",
    all: "All",
    newest: "Newest",
    oldest: "Oldest",
    recipientSort: "Recipient",
    statusSort: "Status",
    providerSort: "Provider",
    directionSort: "Direction",
    company: "Company",
    recipient: "Recipient",
    template: "Template",
    status: "Status",
    direction: "Direction",
    provider: "Provider",
    source: "Source",
    body: "Message body",
    createdAt: "Created at",
    timeline: "Timeline",
    error: "Error",
    DRAFT: "Draft",
    QUEUED: "Queued",
    SENT: "Sent",
    DELIVERED: "Delivered",
    READ: "Read",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    OUTBOUND: "Outbound",
    INBOUND: "Inbound",
    noData: "No data",
    noDataDesc: "WhatsApp messages will appear here when returned by the API.",
    noResults: "No results",
    noResultsDesc: "Change the search or filters.",
    errorTitle: "Failed to load WhatsApp messages",
    errorDesc: "Make sure you are signed in with system permissions and the backend is running.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    showing: "Showing",
    of: "of",
    rows: "rows",
    unknown: "Unknown",
  },
} as const;
function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ApiRecord) : {};
}
function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
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
function normalizeMessage(value: unknown): MessageRow {
  const record = asRecord(value);
  const company = asRecord(record.company);
  const template = asRecord(record.template);
  return {
    id: toStringValue(record.id),
    companyName: toStringValue(company.name || company.company_name || company.title || record.company_name || record.companyName || record.company_id),
    companyCode: toStringValue(company.company_code || company.companyCode || company.code || record.company_code || record.companyCode),
    templateName: toStringValue(record.template_name || record.templateName || template.name || template.code || record.template_id),
    templateCode: toStringValue(record.template_code || record.templateCode || template.code),
    recipientName: toStringValue(record.recipient_name || record.recipientName),
    recipientPhone: toStringValue(record.recipient_phone || record.recipientPhone),
    messageBody: toStringValue(record.message_body || record.messageBody || record.body || record.content),
    status: toStringValue(record.status || record.delivery_status, "DRAFT").toUpperCase(),
    direction: toStringValue(record.direction, "OUTBOUND").toUpperCase(),
    provider: toStringValue(record.provider, "MOCK").toUpperCase(),
    sourceType: toStringValue(record.source_type || record.sourceType, "MANUAL").toUpperCase(),
    errorMessage: toStringValue(record.error_message || record.errorMessage || record.failure_reason),
    createdAt: toStringValue(record.created_at || record.createdAt) || null,
    sentAt: toStringValue(record.sent_at || record.sentAt) || null,
    deliveredAt: toStringValue(record.delivered_at || record.deliveredAt) || null,
    readAt: toStringValue(record.read_at || record.readAt) || null,
    failedAt: toStringValue(record.failed_at || record.failedAt) || null,
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
  if (["SENT", "DELIVERED", "READ"].includes(status)) return "border-emerald-500/30 text-emerald-700";
  if (["FAILED", "CANCELLED"].includes(status)) return "border-destructive/40 text-destructive";
  if (["QUEUED", "DRAFT"].includes(status)) return "border-amber-500/30 text-amber-700";
  return "border-muted-foreground/30 text-muted-foreground";
}
function directionBadgeClass(value: string): string {
  return value.toUpperCase() === "INBOUND"
    ? "border-blue-500/30 text-blue-700"
    : "border-slate-500/30 text-slate-700";
}
function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
function KpiCard({ title, value, description, icon: Icon }: { title: string; value: number; description: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-3xl font-bold tracking-tight">{formatInteger(value)}</CardTitle>
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
function MessagesSkeleton({ dir }: { dir: "rtl" | "ltr" }) {
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
export default function CompanyWhatsAppMessagesPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [directionFilter, setDirectionFilter] = React.useState<DirectionFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const t = tr[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";
  const lowerSearch = search.trim().toLowerCase();
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
  const loadMessages = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const payload = await fetchJson<unknown>(ENDPOINT);
        setMessages(extractResults(payload).map(normalizeMessage));
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
    void loadMessages();
  }, [loadMessages]);
  const filteredMessages = React.useMemo(() => {
    const filtered = messages.filter((item) => {
      if (lowerSearch) {
        const haystack = [
          item.companyName,
          item.companyCode,
          item.templateName,
          item.templateCode,
          item.recipientName,
          item.recipientPhone,
          item.messageBody,
          item.provider,
          item.status,
          item.direction,
          item.sourceType,
          item.errorMessage,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(lowerSearch)) return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (directionFilter !== "all" && item.direction !== directionFilter) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (sortKey === "oldest") return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
      if (sortKey === "recipient") return (a.recipientName || a.recipientPhone).localeCompare(b.recipientName || b.recipientPhone);
      if (sortKey === "status") return a.status.localeCompare(b.status);
      if (sortKey === "provider") return a.provider.localeCompare(b.provider);
      if (sortKey === "direction") return a.direction.localeCompare(b.direction);
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  }, [directionFilter, lowerSearch, messages, sortKey, statusFilter]);
  const hasFilters = Boolean(search || statusFilter !== "all" || directionFilter !== "all" || sortKey !== "newest");
  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setDirectionFilter("all");
    setSortKey("newest");
  }
  function exportExcel() {
    if (!filteredMessages.length) {
      toast.error(t.exportEmpty);
      return;
    }
    const headers = [t.company, t.recipient, t.template, t.status, t.direction, t.provider, t.createdAt, t.body, t.error];
    const rows = filteredMessages.map((item) => [
      item.companyName || t.unknown,
      item.recipientName || item.recipientPhone || "—",
      item.templateName || "—",
      labelFor(item.status, locale),
      labelFor(item.direction, locale),
      item.provider || "—",
      formatDate(item.createdAt, locale),
      item.messageBody || "—",
      item.errorMessage || "—",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => csvCell(String(cell))).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Mhamcloud-system-whatsapp-messages.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  function printPage(mode: "print" | "pdf") {
    if (!filteredMessages.length) {
      toast.error(t.printEmpty);
      return;
    }
    if (mode === "pdf") toast.info(t.pdfHint);
    window.print();
  }
  const sentCount = messages.filter((item) => ["SENT", "DELIVERED", "READ"].includes(item.status)).length;
  const failedCount = messages.filter((item) => ["FAILED", "CANCELLED"].includes(item.status)).length;
  const pendingCount = messages.filter((item) => !["SENT", "DELIVERED", "READ", "FAILED", "CANCELLED"].includes(item.status)).length;
  const pageLinks = [
    { title: t.settings, desc: t.settingsDesc, href: "/company/whatsapp/settings", icon: Settings2 },
    { title: t.templates, desc: t.templatesDesc, href: "/company/whatsapp/templates", icon: FileText },
    { title: t.overview, desc: t.overviewDesc, href: "/company/whatsapp", icon: MessageCircle },
    { title: t.dashboard, desc: t.dashboardDesc, href: "/system", icon: LayoutDashboard },
  ];
  if (loading) return <MessagesSkeleton dir={dir} />;
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
            <Button onClick={() => void loadMessages({ silent: true })} className="rounded-xl">
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
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => void loadMessages({ silent: true })} disabled={refreshing}>
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.excel}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => printPage("print")}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => printPage("pdf")}>
                  <FileText className="h-4 w-4" />
                  {t.pdf}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.total} value={messages.length} description={t.live} icon={MessageCircle} />
          <KpiCard title={t.sent} value={sentCount} description={t.live} icon={CheckCircle2} />
          <KpiCard title={t.failed} value={failedCount} description={t.live} icon={XCircle} />
          <KpiCard title={t.pending} value={pendingCount} description={t.live} icon={Clock3} />
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
        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.tableTitle}</CardTitle>
                <CardDescription className="mt-2">{t.tableDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <Inbox className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(filteredMessages.length)} {t.of} {formatInteger(messages.length)} {t.rows}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-2xl border bg-background p-3 lg:grid-cols-[1fr_170px_150px_160px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.search}
                  className="h-10 rounded-xl bg-muted/30 ltr:pl-9 rtl:pr-9"
                />
              </div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-10 rounded-xl border bg-muted/30 px-3 text-sm">
                <option value="all">{t.all}</option>
                <option value="DRAFT">{t.DRAFT}</option>
                <option value="QUEUED">{t.QUEUED}</option>
                <option value="SENT">{t.SENT}</option>
                <option value="DELIVERED">{t.DELIVERED}</option>
                <option value="READ">{t.READ}</option>
                <option value="FAILED">{t.FAILED}</option>
                <option value="CANCELLED">{t.CANCELLED}</option>
              </select>
              <select value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value as DirectionFilter)} className="h-10 rounded-xl border bg-muted/30 px-3 text-sm">
                <option value="all">{t.all}</option>
                <option value="OUTBOUND">{t.OUTBOUND}</option>
                <option value="INBOUND">{t.INBOUND}</option>
              </select>
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="h-10 rounded-xl border bg-muted/30 px-3 text-sm">
                <option value="newest">{t.newest}</option>
                <option value="oldest">{t.oldest}</option>
                <option value="recipient">{t.recipientSort}</option>
                <option value="status">{t.statusSort}</option>
                <option value="provider">{t.providerSort}</option>
                <option value="direction">{t.directionSort}</option>
              </select>
              <Button variant="outline" className="h-10 rounded-xl bg-muted/30" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1180px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("h-11 w-[190px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.company}</TableHead>
                      <TableHead className={cn("h-11 w-[190px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.recipient}</TableHead>
                      <TableHead className={cn("h-11 w-[160px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.template}</TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.status}</TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.direction}</TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.provider}</TableHead>
                      <TableHead className={cn("h-11 w-[280px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.body}</TableHead>
                      <TableHead className={cn("h-11 w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.createdAt}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.length ? (
                      filteredMessages.map((item) => (
                        <TableRow key={item.id || `${item.recipientPhone}-${item.createdAt}`} className="h-[78px]">
                          <TableCell className={cn("h-[78px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm font-semibold">{item.companyName || t.unknown}</span>
                            <span className="mt-1 block truncate text-xs text-muted-foreground">{item.companyCode || "—"}</span>
                          </TableCell>
                          <TableCell className={cn("h-[78px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm font-semibold">{item.recipientName || item.recipientPhone || "—"}</span>
                            <span className="mt-1 block truncate text-xs tabular-nums text-muted-foreground">{item.recipientPhone || "—"}</span>
                          </TableCell>
                          <TableCell className={cn("h-[78px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">{item.templateName || "—"}</span>
                            <span className="mt-1 block truncate text-xs tabular-nums text-muted-foreground">{item.templateCode || item.sourceType || "—"}</span>
                          </TableCell>
                          <TableCell className={cn("h-[78px] px-4 align-middle", alignClass)}>
                            <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(item.status))}>{labelFor(item.status, locale)}</Badge>
                          </TableCell>
                          <TableCell className={cn("h-[78px] px-4 align-middle", alignClass)}>
                            <Badge variant="outline" className={cn("rounded-full", directionBadgeClass(item.direction))}>{labelFor(item.direction, locale)}</Badge>
                          </TableCell>
                          <TableCell className={cn("h-[78px] px-4 align-middle", alignClass)}>
                            <span className="text-sm tabular-nums text-muted-foreground">{item.provider || "—"}</span>
                          </TableCell>
                          <TableCell className={cn("h-[78px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="line-clamp-2 text-sm leading-6 text-muted-foreground">{item.errorMessage || item.messageBody || "—"}</span>
                          </TableCell>
                          <TableCell className={cn("h-[78px] px-4 align-middle", alignClass)}>
                            <span className="text-sm tabular-nums text-muted-foreground">{formatDate(item.createdAt, locale)}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed bg-background px-6 py-10 text-center">
                            <Inbox className="h-10 w-10 text-muted-foreground" />
                            <h3 className="mt-4 text-base font-semibold">{hasFilters ? t.noResults : t.noData}</h3>
                            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{hasFilters ? t.noResultsDesc : t.noDataDesc}</p>
                            {hasFilters ? (
                              <Button variant="outline" className="mt-4 rounded-xl bg-background" onClick={resetFilters}>
                                <RotateCcw className="h-4 w-4" />
                                {t.reset}
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>{t.showing} {formatInteger(filteredMessages.length)} {t.of} {formatInteger(messages.length)} {t.rows}</span>
              <span>{t.live}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
