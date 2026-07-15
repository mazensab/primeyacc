"use client";
/* ============================================================
   📂 primey_frontend/app/company/whatsapp/messages/page.tsx
   💬 PrimeyAcc — Company WhatsApp Message Logs
   ------------------------------------------------------------
   ✅ PrimeyAcc approved design
   ✅ Real company API
   ✅ Page-level Excel / Print
   ✅ Table-level Excel / Print
   ✅ Shared UI buttons and selects
   ✅ Current search and filters respected
   ✅ English digits and dates
   ✅ Styled Excel and print reports
   ✅ Arabic / English locale
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
  Settings2,
  Sparkles,
  TriangleAlert,
  XCircle,
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
import { cn } from "@/lib/utils";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type StatusFilter =
  | "all"
  | "DRAFT"
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "CANCELLED";
type DirectionFilter = "all" | "OUTBOUND" | "INBOUND";
type SortKey =
  | "newest"
  | "oldest"
  | "recipient"
  | "status"
  | "provider"
  | "direction";
type ExportScope = "page" | "table";
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
const translations = {
  ar: {
    badge: "التواصل والإشعارات",
    title: "سجل رسائل واتساب",
    subtitle:
      "متابعة رسائل واتساب المسجلة في الشركة مع البحث والتصفية والتصدير والطباعة.",
    refresh: "تحديث",
    refreshSuccess: "تم تحديث سجل رسائل واتساب.",
    excel: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    settings: "إعدادات واتساب",
    templates: "قوالب واتساب",
    center: "مركز واتساب",
    dashboard: "لوحة الشركة",
    total: "إجمالي الرسائل",
    totalDesc: "جميع رسائل واتساب المسجلة داخل مساحة الشركة.",
    sent: "المرسلة",
    sentDesc: "الرسائل المرسلة أو المسلمة أو المقروءة.",
    failed: "الفاشلة",
    failedDesc: "الرسائل الفاشلة أو الملغاة.",
    pending: "بانتظار المعالجة",
    pendingDesc: "المسودات والرسائل الموجودة في قائمة الانتظار.",
    tableTitle: "بيانات رسائل واتساب",
    tableDesc:
      "جدول الرسائل مع البحث والتصفية حسب الحالة والاتجاه والمزود.",
    search:
      "ابحث بالشركة أو القالب أو المستلم أو رقم الهاتف أو نص الرسالة...",
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
    body: "نص الرسالة",
    createdAt: "تاريخ الإنشاء",
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
    showing: "عرض",
    of: "من",
    rows: "صف",
    filtered: "نتيجة مطابقة",
    noData: "لا توجد رسائل مسجلة",
    noDataDesc:
      "ستظهر رسائل واتساب هنا عند تسجيل أول رسالة داخل مساحة الشركة.",
    noResults: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر للوصول إلى الرسائل المطلوبة.",
    errorTitle: "تعذر تحميل سجل رسائل واتساب",
    errorDesc:
      "تعذر جلب الرسائل حاليًا. تحقق من الاتصال ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات مطابقة للتصدير.",
    printEmpty: "لا توجد بيانات مطابقة للطباعة.",
    exportSuccess: "تم تجهيز ملف Excel.",
    printBlocked:
      "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.",
    reportTitle: "تقرير سجل رسائل واتساب",
    tableReportTitle: "بيانات رسائل واتساب",
    generatedAt: "تاريخ الطباعة",
    appliedFilters: "الفلاتر المطبقة",
    noFilter: "بدون فلاتر إضافية",
    companyLabel: "الشركة",
    footer: "PrimeyAcc",
    unknown: "غير معروف",
  },
  en: {
    badge: "Communication & Notifications",
    title: "WhatsApp Message Logs",
    subtitle:
      "Monitor recorded company WhatsApp messages with search, filters, export, and print.",
    refresh: "Refresh",
    refreshSuccess: "WhatsApp message logs refreshed.",
    excel: "Export Excel",
    print: "Print",
    reset: "Reset",
    settings: "WhatsApp Settings",
    templates: "WhatsApp Templates",
    center: "WhatsApp Center",
    dashboard: "Company Dashboard",
    total: "Total Messages",
    totalDesc: "All WhatsApp messages recorded in the company workspace.",
    sent: "Sent",
    sentDesc: "Messages sent, delivered, or read.",
    failed: "Failed",
    failedDesc: "Failed or cancelled messages.",
    pending: "Pending",
    pendingDesc: "Draft and queued messages awaiting processing.",
    tableTitle: "WhatsApp Message Data",
    tableDesc:
      "Message records with search and filtering by status, direction, and provider.",
    search:
      "Search company, template, recipient, phone number, or message body...",
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
    body: "Message Body",
    createdAt: "Created At",
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
    showing: "Showing",
    of: "of",
    rows: "rows",
    filtered: "matching results",
    noData: "No messages recorded",
    noDataDesc:
      "WhatsApp messages will appear here when the first message is recorded.",
    noResults: "No matching results",
    noResultsDesc: "Change the search or filters to find the required messages.",
    errorTitle: "Unable to load WhatsApp message logs",
    errorDesc:
      "Messages could not be loaded. Check the connection and try again.",
    tryAgain: "Try Again",
    exportEmpty: "There is no matching data to export.",
    printEmpty: "There is no matching data to print.",
    exportSuccess: "Excel file prepared.",
    printBlocked:
      "The print window could not be opened. Allow pop-ups and try again.",
    reportTitle: "WhatsApp Message Logs Report",
    tableReportTitle: "WhatsApp Message Data",
    generatedAt: "Generated At",
    appliedFilters: "Applied Filters",
    noFilter: "No additional filters",
    companyLabel: "Company",
    footer: "PrimeyAcc",
    unknown: "Unknown",
  },
} as const;
function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : {};
}
function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  const stored =
    window.localStorage.getItem("primey-locale") ||
    window.localStorage.getItem("locale") ||
    window.localStorage.getItem("lang");
  if (stored?.toLowerCase().startsWith("en")) return "en";
  return document.documentElement.lang?.toLowerCase().startsWith("en")
    ? "en"
    : "ar";
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
  const payload = (await response
    .json()
    .catch(() => ({}))) as T & {
    message?: string;
    detail?: string;
  };
  if (!response.ok) {
    throw new Error(
      toStringValue(payload.message || payload.detail) ||
        `Request failed: ${response.status}`,
    );
  }
  return payload;
}
function extractResults(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  const data = asRecord(record.data);
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  return [];
}
function normalizeMessage(value: unknown): MessageRow {
  const record = asRecord(value);
  const company = asRecord(record.company);
  const template = asRecord(record.template);
  const provider = toStringValue(record.provider).toUpperCase();
  const providerResponse = asRecord(record.provider_response);
  const providerStatus = toStringValue(
    providerResponse.provider_status,
  ).toUpperCase();
  const gatewayConfigured = Boolean(providerResponse.gateway_configured);
  return {
    id: toStringValue(record.id),
    companyName: toStringValue(
      company.name ||
        company.company_name ||
        company.title ||
        record.company_name ||
        record.companyName ||
        record.company_id,
    ),
    companyCode: toStringValue(
      company.company_code ||
        company.companyCode ||
        company.code ||
        record.company_code ||
        record.companyCode,
    ),
    templateName: toStringValue(
      record.template_name ||
        record.templateName ||
        template.name ||
        template.code ||
        record.template_id,
    ),
    templateCode: toStringValue(
      record.template_code || record.templateCode || template.code,
    ),
    recipientName: toStringValue(
      record.recipient_name || record.recipientName,
    ),
    recipientPhone: toStringValue(
      record.recipient_phone || record.recipientPhone,
    ),
    messageBody: toStringValue(
      record.message_body ||
        record.messageBody ||
        record.body ||
        record.content,
    ),
    status: toStringValue(
      record.status || record.delivery_status,
      "DRAFT",
    ).toUpperCase(),
    direction: toStringValue(
      record.direction,
      "OUTBOUND",
    ).toUpperCase(),
    provider:
      (provider === "MOCK" || provider === "CUSTOM") &&
      (gatewayConfigured || providerStatus)
        ? "GATEWAY"
        : provider || "GATEWAY",
    sourceType: toStringValue(
      record.source_type || record.sourceType,
      "MANUAL",
    ).toUpperCase(),
    errorMessage: toStringValue(
      record.error_message ||
        record.errorMessage ||
        record.failure_reason,
    ),
    createdAt:
      toStringValue(record.created_at || record.createdAt) || null,
    sentAt:
      toStringValue(record.sent_at || record.sentAt) || null,
    deliveredAt:
      toStringValue(record.delivered_at || record.deliveredAt) || null,
    readAt:
      toStringValue(record.read_at || record.readAt) || null,
    failedAt:
      toStringValue(record.failed_at || record.failedAt) || null,
  };
}
function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}
function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (item: number) => String(item).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join(" ");
}
function currentDateStamp(): string {
  const date = new Date();
  const pad = (item: number) => String(item).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}
function labelFor(value: string, locale: Locale): string {
  const dictionary = translations[locale] as Record<string, string>;
  return dictionary[value.toUpperCase()] || value || "—";
}
function statusBadgeClass(value: string): string {
  const status = value.toUpperCase();
  if (["SENT", "DELIVERED", "READ"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["FAILED", "CANCELLED"].includes(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (["QUEUED", "DRAFT"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}
function directionBadgeClass(value: string): string {
  return value.toUpperCase() === "INBOUND"
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : "border-slate-200 bg-slate-50 text-slate-700";
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
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="min-h-[150px] rounded-2xl border-border/70 bg-card shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="text-sm">{title}</CardDescription>
          <CardTitle className="mt-3 text-2xl font-bold tracking-tight tabular-nums">
            {formatInteger(value)}
          </CardTitle>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-xs leading-6 text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
function MessagesSkeleton({ dir }: { dir: "rtl" | "ltr" }) {
  return (
    <main
      dir={dir}
      className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="w-full space-y-6">
        <section className="py-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-10 w-72" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
          <Skeleton className="mt-4 h-9 w-96" />
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card
              key={index}
              className="min-h-[150px] rounded-2xl shadow-none"
            >
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
        <Card className="rounded-2xl shadow-none">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          </CardContent>
        </Card>
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
  const [statusFilter, setStatusFilter] =
    React.useState<StatusFilter>("all");
  const [directionFilter, setDirectionFilter] =
    React.useState<DirectionFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";
  const lowerSearch = search.trim().toLowerCase();
  React.useEffect(() => {
    const applyLocale = () => {
      const nextLocale = getInitialLocale();
      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir =
        nextLocale === "ar" ? "rtl" : "ltr";
      document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
    };
    applyLocale();
    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);
    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener(
        "primey-locale-changed",
        applyLocale,
      );
    };
  }, []);
  const loadMessages = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const payload = await fetchJson<unknown>(ENDPOINT);
        const normalized = extractResults(payload).map(normalizeMessage);
        setMessages(normalized);
        if (silent) {
          toast.success(translations[locale].refreshSuccess);
        }
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : translations[locale].errorDesc;
        setError(message);
        if (silent) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [locale],
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
      if (
        statusFilter !== "all" &&
        item.status !== statusFilter
      ) {
        return false;
      }
      if (
        directionFilter !== "all" &&
        item.direction !== directionFilter
      ) {
        return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.createdAt || "").localeCompare(
          String(b.createdAt || ""),
        );
      }
      if (sortKey === "recipient") {
        return (a.recipientName || a.recipientPhone).localeCompare(
          b.recipientName || b.recipientPhone,
        );
      }
      if (sortKey === "status") {
        return a.status.localeCompare(b.status);
      }
      if (sortKey === "provider") {
        return a.provider.localeCompare(b.provider);
      }
      if (sortKey === "direction") {
        return a.direction.localeCompare(b.direction);
      }
      return String(b.createdAt || "").localeCompare(
        String(a.createdAt || ""),
      );
    });
  }, [
    directionFilter,
    lowerSearch,
    messages,
    sortKey,
    statusFilter,
  ]);
  const sentCount = React.useMemo(
    () =>
      messages.filter((item) =>
        ["SENT", "DELIVERED", "READ"].includes(item.status),
      ).length,
    [messages],
  );
  const failedCount = React.useMemo(
    () =>
      messages.filter((item) =>
        ["FAILED", "CANCELLED"].includes(item.status),
      ).length,
    [messages],
  );
  const pendingCount = React.useMemo(
    () =>
      messages.filter(
        (item) =>
          ![
            "SENT",
            "DELIVERED",
            "READ",
            "FAILED",
            "CANCELLED",
          ].includes(item.status),
      ).length,
    [messages],
  );
  const hasFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    directionFilter !== "all" ||
    sortKey !== "newest";
  const companyDisplayName =
    filteredMessages[0]?.companyName ||
    messages[0]?.companyName ||
    (locale === "ar" ? "الشركة" : "Company");
  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setDirectionFilter("all");
    setSortKey("newest");
  }
  function getAppliedFiltersText(): string {
    const filters: string[] = [];
    if (search.trim()) {
      filters.push(
        locale === "ar"
          ? `البحث: ${search.trim()}`
          : `Search: ${search.trim()}`,
      );
    }
    if (statusFilter !== "all") {
      filters.push(
        `${t.statusFilter}: ${labelFor(statusFilter, locale)}`,
      );
    }
    if (directionFilter !== "all") {
      filters.push(
        `${t.directionFilter}: ${labelFor(
          directionFilter,
          locale,
        )}`,
      );
    }
    if (sortKey !== "newest") {
      const sortLabels: Record<SortKey, string> = {
        newest: t.newest,
        oldest: t.oldest,
        recipient: t.recipientSort,
        status: t.statusSort,
        provider: t.providerSort,
        direction: t.directionSort,
      };
      filters.push(`${t.sort}: ${sortLabels[sortKey]}`);
    }
    return filters.length ? filters.join(" — ") : t.noFilter;
  }
  function buildReportRows(): string {
    return filteredMessages
      .map((item) => {
        const recipient =
          item.recipientName || item.recipientPhone || "—";
        const template =
          item.templateName || item.templateCode || "—";
        const body =
          item.errorMessage || item.messageBody || "—";
        return `
          <tr>
            <td>${escapeHtml(item.companyName || t.unknown)}</td>
            <td>
              <strong>${escapeHtml(recipient)}</strong>
              ${
                item.recipientPhone &&
                item.recipientPhone !== recipient
                  ? `<div class="secondary ltr">${escapeHtml(
                      item.recipientPhone,
                    )}</div>`
                  : ""
              }
            </td>
            <td>
              ${escapeHtml(template)}
              ${
                item.templateCode &&
                item.templateCode !== template
                  ? `<div class="secondary">${escapeHtml(
                      item.templateCode,
                    )}</div>`
                  : ""
              }
            </td>
            <td>${escapeHtml(labelFor(item.status, locale))}</td>
            <td>${escapeHtml(labelFor(item.direction, locale))}</td>
            <td class="ltr">${escapeHtml(item.provider || "—")}</td>
            <td>${escapeHtml(body)}</td>
            <td class="ltr">${escapeHtml(formatDate(item.createdAt))}</td>
          </tr>
        `;
      })
      .join("");
  }
  function buildReportHtml(
    scope: ExportScope,
    forExcel: boolean,
  ): string {
    const isPage = scope === "page";
    const pageDirection = locale === "ar" ? "rtl" : "ltr";
    const pageTitle = isPage ? t.reportTitle : t.tableReportTitle;
    const generatedAt = formatDate(new Date().toISOString());
    const summaryHtml = isPage
      ? `
        <table class="summary-table">
          <tbody>
            <tr>
              <th>${escapeHtml(t.total)}</th>
              <td class="ltr">${formatInteger(messages.length)}</td>
              <th>${escapeHtml(t.sent)}</th>
              <td class="ltr">${formatInteger(sentCount)}</td>
            </tr>
            <tr>
              <th>${escapeHtml(t.failed)}</th>
              <td class="ltr">${formatInteger(failedCount)}</td>
              <th>${escapeHtml(t.pending)}</th>
              <td class="ltr">${formatInteger(pendingCount)}</td>
            </tr>
          </tbody>
        </table>
      `
      : "";
    return `
      <!DOCTYPE html>
      <html lang="${locale}" dir="${pageDirection}">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(pageTitle)}</title>
          <style>
            * {
              box-sizing: border-box;
            }
            html,
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #111827;
              font-family: Tahoma, Arial, sans-serif;
            }
            body {
              padding: ${forExcel ? "6px" : "10mm"};
              direction: ${pageDirection};
            }
            .report {
              width: 100%;
            }
            .company-name {
              margin: 0 0 4px;
              font-size: 12px;
              font-weight: 700;
            }
            h1 {
              margin: 0;
              font-size: 22px;
              font-weight: 800;
            }
            .meta {
              margin-top: 7px;
              font-size: 10px;
              line-height: 1.7;
            }
            .meta strong {
              font-weight: 700;
            }
            .report-table,
            .summary-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            .summary-table {
              margin-top: 12px;
              margin-bottom: 12px;
            }
            .summary-table th,
            .summary-table td,
            .report-table th,
            .report-table td {
              border: 1px solid #000000;
              padding: 6px;
              vertical-align: middle;
            }
            .summary-table th {
              background: #f3f4f6;
              font-size: 11px;
              font-weight: 700;
              text-align: ${locale === "ar" ? "right" : "left"};
            }
            .summary-table td {
              font-size: 11px;
              font-weight: 700;
            }
            .report-table {
              margin-top: 12px;
              font-size: 9px;
            }
            .report-table thead th {
              background: #f3f4f6;
              font-weight: 700;
              text-align: center;
            }
            .report-table tbody td {
              overflow-wrap: anywhere;
              word-break: break-word;
            }
            .secondary {
              margin-top: 3px;
              color: #4b5563;
              font-size: 8px;
            }
            .ltr {
              direction: ltr;
              unicode-bidi: embed;
            }
            .footer {
              margin-top: 8px;
              display: flex;
              justify-content: space-between;
              gap: 12px;
              font-size: 8px;
            }
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
            @media print {
              body {
                padding: 0;
              }
              thead {
                display: table-header-group;
              }
              tr,
              td,
              th {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="report">
            <p class="company-name">
              ${escapeHtml(companyDisplayName)}
            </p>
            <h1>${escapeHtml(pageTitle)}</h1>
            <div class="meta">
              <div>
                <strong>${escapeHtml(t.generatedAt)}:</strong>
                <span class="ltr">${escapeHtml(generatedAt)}</span>
              </div>
              <div>
                <strong>${escapeHtml(t.appliedFilters)}:</strong>
                ${escapeHtml(getAppliedFiltersText())}
              </div>
              <div>
                <strong>${escapeHtml(t.showing)}:</strong>
                <span class="ltr">
                  ${formatInteger(filteredMessages.length)}
                  ${escapeHtml(t.of)}
                  ${formatInteger(messages.length)}
                </span>
              </div>
            </div>
            ${summaryHtml}
            <table class="report-table">
              <colgroup>
                <col style="width: 13%" />
                <col style="width: 14%" />
                <col style="width: 12%" />
                <col style="width: 8%" />
                <col style="width: 8%" />
                <col style="width: 9%" />
                <col style="width: 24%" />
                <col style="width: 12%" />
              </colgroup>
              <thead>
                <tr>
                  <th>${escapeHtml(t.company)}</th>
                  <th>${escapeHtml(t.recipient)}</th>
                  <th>${escapeHtml(t.template)}</th>
                  <th>${escapeHtml(t.status)}</th>
                  <th>${escapeHtml(t.direction)}</th>
                  <th>${escapeHtml(t.provider)}</th>
                  <th>${escapeHtml(t.body)}</th>
                  <th>${escapeHtml(t.createdAt)}</th>
                </tr>
              </thead>
              <tbody>
                ${buildReportRows()}
              </tbody>
            </table>
            <div class="footer">
              <span>${escapeHtml(companyDisplayName)}</span>
              <span>${escapeHtml(t.footer)}</span>
            </div>
          </div>
        </body>
      </html>
    `;
  }
  function exportExcel(scope: ExportScope) {
    if (!filteredMessages.length) {
      toast.error(t.exportEmpty);
      return;
    }
    const html = buildReportHtml(scope, true);
    const blob = new Blob([`\ufeff${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      scope === "page"
        ? `whatsapp-messages-${currentDateStamp()}.xls`
        : `whatsapp-messages-table-${currentDateStamp()}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
    toast.success(t.exportSuccess);
  }
  function printReport(scope: ExportScope) {
    if (!filteredMessages.length) {
      toast.error(t.printEmpty);
      return;
    }
    const printWindow = window.open(
      "",
      "_blank",
      "width=1280,height=860,scrollbars=yes",
    );
    if (!printWindow) {
      toast.error(t.printBlocked);
      return;
    }
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(buildReportHtml(scope, false));
    printWindow.document.close();
    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 350);
  }
  if (loading) {
    return <MessagesSkeleton dir={dir} />;
  }
  if (error) {
    return (
      <main
        dir={dir}
        className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
      >
        <Card className="mx-auto max-w-3xl rounded-2xl border-rose-200 bg-card shadow-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-700">
              <TriangleAlert className="h-7 w-7" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              {error}
            </p>
            <Button
              type="button"
              onClick={() => void loadMessages({ silent: true })}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main
      dir={dir}
      className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="w-full space-y-6">
        <section className="py-2">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className={cn("min-w-0 max-w-4xl", alignClass)}>
              <Badge
                variant="outline"
                className="mb-4 w-fit rounded-full bg-background px-3 py-1 font-normal text-muted-foreground"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t.badge}
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {t.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                {t.subtitle}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/company">
                    <LayoutDashboard className="h-4 w-4" />
                    {t.dashboard}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/company/whatsapp">
                    <MessageCircle className="h-4 w-4" />
                    {t.center}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/company/whatsapp/templates">
                    <FileText className="h-4 w-4" />
                    {t.templates}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/company/whatsapp/settings">
                    <Settings2 className="h-4 w-4" />
                    {t.settings}
                  </Link>
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadMessages({ silent: true })}
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
                size="sm"
                onClick={() => exportExcel("page")}
              >
                <FileSpreadsheet className="h-4 w-4" />
                {t.excel}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => printReport("page")}
              >
                <Printer className="h-4 w-4" />
                {t.print}
              </Button>
            </div>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t.total}
            value={messages.length}
            description={t.totalDesc}
            icon={MessageCircle}
          />
          <KpiCard
            title={t.sent}
            value={sentCount}
            description={t.sentDesc}
            icon={CheckCircle2}
          />
          <KpiCard
            title={t.failed}
            value={failedCount}
            description={t.failedDesc}
            icon={XCircle}
          />
          <KpiCard
            title={t.pending}
            value={pendingCount}
            description={t.pendingDesc}
            icon={Clock3}
          />
        </section>
        <Card className="w-full rounded-2xl border-border/70 bg-card shadow-none">
          <CardHeader className="border-b border-border/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className={cn("min-w-0", alignClass)}>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">
                    {t.tableTitle}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="rounded-full bg-background px-2.5 py-1 font-normal"
                  >
                    <Inbox className="h-3.5 w-3.5" />
                    {formatInteger(filteredMessages.length)}
                  </Badge>
                  {hasFilters ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-1 font-normal text-blue-700"
                    >
                      {formatInteger(filteredMessages.length)}{" "}
                      {t.filtered}
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="mt-2 leading-6">
                  {t.tableDesc}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => exportExcel("table")}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.excel}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => printReport("table")}
                >
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="rounded-2xl border border-border/70 bg-background p-3">
              <div className="grid gap-3 xl:grid-cols-[minmax(320px,1fr)_170px_160px_170px_auto]">
                <div className="relative">
                  <Search
                    className={cn(
                      "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                      locale === "ar" ? "right-3" : "left-3",
                    )}
                  />
                  <Input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder={t.search}
                    className={cn(
                      "h-10 bg-background",
                      locale === "ar"
                        ? "pr-10 text-right"
                        : "pl-10 text-left",
                    )}
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as StatusFilter)
                  }
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder={t.statusFilter} />
                  </SelectTrigger>
                  <SelectContent
                    align={locale === "ar" ? "end" : "start"}
                  >
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="DRAFT">{t.DRAFT}</SelectItem>
                    <SelectItem value="QUEUED">{t.QUEUED}</SelectItem>
                    <SelectItem value="SENT">{t.SENT}</SelectItem>
                    <SelectItem value="DELIVERED">
                      {t.DELIVERED}
                    </SelectItem>
                    <SelectItem value="READ">{t.READ}</SelectItem>
                    <SelectItem value="FAILED">{t.FAILED}</SelectItem>
                    <SelectItem value="CANCELLED">
                      {t.CANCELLED}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={directionFilter}
                  onValueChange={(value) =>
                    setDirectionFilter(value as DirectionFilter)
                  }
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder={t.directionFilter} />
                  </SelectTrigger>
                  <SelectContent
                    align={locale === "ar" ? "end" : "start"}
                  >
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="OUTBOUND">
                      {t.OUTBOUND}
                    </SelectItem>
                    <SelectItem value="INBOUND">
                      {t.INBOUND}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sortKey}
                  onValueChange={(value) =>
                    setSortKey(value as SortKey)
                  }
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder={t.sort} />
                  </SelectTrigger>
                  <SelectContent
                    align={locale === "ar" ? "end" : "start"}
                  >
                    <SelectItem value="newest">
                      {t.newest}
                    </SelectItem>
                    <SelectItem value="oldest">
                      {t.oldest}
                    </SelectItem>
                    <SelectItem value="recipient">
                      {t.recipientSort}
                    </SelectItem>
                    <SelectItem value="status">
                      {t.statusSort}
                    </SelectItem>
                    <SelectItem value="provider">
                      {t.providerSort}
                    </SelectItem>
                    <SelectItem value="direction">
                      {t.directionSort}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 bg-background"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1180px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead
                        className={cn(
                          "sticky right-0 z-30 h-11 w-[190px] bg-muted px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.company}
                      </TableHead>
                      <TableHead
                        className={cn(
                          "h-11 w-[190px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.recipient}
                      </TableHead>
                      <TableHead
                        className={cn(
                          "h-11 w-[160px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.template}
                      </TableHead>
                      <TableHead
                        className={cn(
                          "h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.status}
                      </TableHead>
                      <TableHead
                        className={cn(
                          "h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.direction}
                      </TableHead>
                      <TableHead
                        className={cn(
                          "h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.provider}
                      </TableHead>
                      <TableHead
                        className={cn(
                          "h-11 w-[280px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.body}
                      </TableHead>
                      <TableHead
                        className={cn(
                          "h-11 w-[150px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.createdAt}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.length ? (
                      filteredMessages.map((item) => (
                        <TableRow
                          key={
                            item.id ||
                            `${item.recipientPhone}-${item.createdAt}`
                          }
                          className="h-[78px]"
                        >
                          <TableCell
                            className={cn(
                              "sticky right-0 z-20 h-[78px] overflow-hidden border-l bg-background px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <span className="block truncate text-sm font-semibold">
                              {item.companyName || t.unknown}
                            </span>
                            <span
                              dir="ltr"
                              className="mt-1 block truncate text-xs tabular-nums text-muted-foreground"
                            >
                              {item.companyCode || "—"}
                            </span>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-[78px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <span className="block truncate text-sm font-semibold">
                              {item.recipientName ||
                                item.recipientPhone ||
                                "—"}
                            </span>
                            <span
                              dir="ltr"
                              className="mt-1 block truncate text-xs tabular-nums text-muted-foreground"
                            >
                              {item.recipientPhone || "—"}
                            </span>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-[78px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <span className="block truncate text-sm text-muted-foreground">
                              {item.templateName || "—"}
                            </span>
                            <span
                              dir="ltr"
                              className="mt-1 block truncate text-xs tabular-nums text-muted-foreground"
                            >
                              {item.templateCode ||
                                item.sourceType ||
                                "—"}
                            </span>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-[78px] px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full px-2.5 py-1 font-normal",
                                statusBadgeClass(item.status),
                              )}
                            >
                              {labelFor(item.status, locale)}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-[78px] px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full px-2.5 py-1 font-normal",
                                directionBadgeClass(item.direction),
                              )}
                            >
                              {labelFor(item.direction, locale)}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-[78px] px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <span
                              dir="ltr"
                              className="text-sm tabular-nums text-muted-foreground"
                            >
                              {item.provider || "—"}
                            </span>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-[78px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <span className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                              {item.errorMessage ||
                                item.messageBody ||
                                "—"}
                            </span>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-[78px] px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <span
                              dir="ltr"
                              className="whitespace-nowrap text-sm tabular-nums text-muted-foreground"
                            >
                              {formatDate(item.createdAt)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted/30 text-muted-foreground">
                              <Inbox className="h-7 w-7" />
                            </span>
                            <h3 className="mt-4 text-base font-semibold">
                              {hasFilters ? t.noResults : t.noData}
                            </h3>
                            <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                              {hasFilters
                                ? t.noResultsDesc
                                : t.noDataDesc}
                            </p>
                            {hasFilters ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="mt-4"
                                onClick={resetFilters}
                              >
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
            <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                {t.showing}{" "}
                <span className="tabular-nums">
                  {formatInteger(filteredMessages.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="tabular-nums">
                  {formatInteger(messages.length)}
                </span>{" "}
                {t.rows}
              </span>
              <span className="truncate">
                {getAppliedFiltersText()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}