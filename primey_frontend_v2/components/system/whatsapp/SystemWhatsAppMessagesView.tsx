"use client";

import * as React from "react";
import {
  ArrowUpDown,
  CheckCircle2,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Inbox,
  Loader2,
  MessageCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  SendHorizontal,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { API_PATHS } from "@/lib/api/endpoints";
import {
  downloadExcelReport,
  type ExcelReportSection,
} from "@/lib/excel-report";
import {
  openPrintTableReport,
  type PrintReportTableSection,
} from "@/lib/print-report";
import SystemWhatsAppModuleNav from "@/components/system/whatsapp/SystemWhatsAppModuleNav";
import {
  DataRegisterEmptyState,
  DataRegisterSearch,
  DataRegisterToolbar,
  registerBrandButtonClass,
  registerOutlineButtonClass,
} from "@/components/ui/data-register";
import {
  DataRegisterResultCount,
  DataRegisterTableFrame,
} from "@/components/ui/data-register-table";
import { SystemMetricCard } from "@/components/ui/system-metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
type Row = {
  id: string;
  company: string;
  companyCode: string;
  recipient: string;
  phone: string;
  body: string;
  messageType: string;
  attachmentCount: number;
  attachmentName: string;
  attachmentMime: string;
  attachmentSize: number;
  status: string;
  direction: string;
  provider: string;
  createdAt: string | null;
};
type StatusFilter =
  | "all"
  | "DRAFT"
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "RECEIVED"
  | "FAILED"
  | "CANCELLED";
type DirectionFilter = "all" | "OUTBOUND" | "INBOUND";
type SortKey = "newest" | "oldest" | "recipient" | "status";

const translations = {
  ar: {
    title: "سجل رسائل واتساب",
    subtitle:
      "متابعة رسائل واتساب المسجلة في النظام مع البحث والتصفية والتصدير والطباعة.",
    refresh: "تحديث",
    excel: "تصدير Excel",
    print: "طباعة",
    total: "إجمالي الرسائل",
    sent: "مرسلة",
    received: "مستلمة",
    failed: "فاشلة",
    live: "من واجهات النظام الحقيقية",
    tableTitle: "بيانات رسائل واتساب",
    tableDesc: "جدول V2 موحد للرسائل مع الحالة والاتجاه والمزود.",
    search: "ابحث بالشركة أو المستلم أو الهاتف أو نص الرسالة...",
    all: "الكل",
    newest: "الأحدث",
    oldest: "الأقدم",
    recipientSort: "المستلم",
    statusSort: "الحالة",
    reset: "إعادة ضبط",
    company: "الشركة",
    recipient: "المستلم",
    message: "الرسالة",
    status: "الحالة",
    direction: "الاتجاه",
    provider: "المزود",
    createdAt: "تاريخ الإنشاء",
    noData: "لا توجد رسائل",
    noDataDesc: "ستظهر رسائل واتساب هنا عند توفرها من API.",
    noResults: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    error: "تعذر تحميل سجل رسائل واتساب",
    tryAgain: "إعادة المحاولة",
    showing: "عرض",
    of: "من",
    rows: "سجل",
    emptyExport: "لا توجد بيانات للتصدير.",
    emptyPrint: "لا توجد بيانات للطباعة.",
    generatedAt: "تم الإنشاء في",
    outbound: "صادرة",
    inbound: "واردة",
    statusDraft: "مسودة",
    statusQueued: "بالانتظار",
    statusSent: "مرسلة",
    statusDelivered: "تم التسليم",
    statusRead: "مقروءة",
    statusReceived: "مستلمة",
    statusFailed: "فاشلة",
    statusCancelled: "ملغاة",
    mediaImage: "صورة",
    mediaAudio: "رسالة صوتية",
    mediaVideo: "فيديو",
    mediaDocument: "مستند",
  },
  en: {
    title: "WhatsApp Message Logs",
    subtitle:
      "Monitor system WhatsApp messages with search, filters, export, and print.",
    refresh: "Refresh",
    excel: "Export Excel",
    print: "Print",
    total: "Total messages",
    sent: "Sent",
    received: "Received",
    failed: "Failed",
    live: "From real system APIs",
    tableTitle: "WhatsApp message data",
    tableDesc: "Unified V2 message register with status, direction, and provider.",
    search: "Search company, recipient, phone, or message...",
    all: "All",
    newest: "Newest",
    oldest: "Oldest",
    recipientSort: "Recipient",
    statusSort: "Status",
    reset: "Reset",
    company: "Company",
    recipient: "Recipient",
    message: "Message",
    status: "Status",
    direction: "Direction",
    provider: "Provider",
    createdAt: "Created at",
    noData: "No messages",
    noDataDesc: "WhatsApp messages will appear here when returned by the API.",
    noResults: "No matching results",
    noResultsDesc: "Change search or filters to view other results.",
    error: "Could not load WhatsApp messages",
    tryAgain: "Try again",
    showing: "Showing",
    of: "of",
    rows: "rows",
    emptyExport: "No data to export.",
    emptyPrint: "No data to print.",
    generatedAt: "Generated at",
    outbound: "Outbound",
    inbound: "Inbound",
    statusDraft: "Draft",
    statusQueued: "Queued",
    statusSent: "Sent",
    statusDelivered: "Delivered",
    statusRead: "Read",
    statusReceived: "Received",
    statusFailed: "Failed",
    statusCancelled: "Cancelled",
    mediaImage: "Image",
    mediaAudio: "Voice message",
    mediaVideo: "Video",
    mediaDocument: "Document",
  },
} as const;

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : {};
}
function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}
function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}
function getLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("Mhamcloud-locale") === "en" ? "en" : "ar";
}
function apiBaseUrl() {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return raw.endsWith("/api") ? raw.slice(0, -4) : raw;
}
function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${apiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}
async function fetchJson<T>(path: string, params?: URLSearchParams): Promise<T> {
  const response = await fetch(makeApiUrl(path, params), {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const raw = await response.text();
  let payload: unknown = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }
  const record = asRecord(payload);
  if (!response.ok || record.success === false) {
    throw new Error(
      text(record.message) ||
        text(record.detail) ||
        text(record.error) ||
        `Request failed with status ${response.status}`,
    );
  }
  return payload as T;
}
function listFromPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  const data = asRecord(record.data);
  for (const value of [
    record.results,
    record.items,
    record.records,
    record.messages,
    data.results,
    data.items,
    data.records,
  ]) {
    if (Array.isArray(value)) return value;
  }
  return [];
}
function totalFromPayload(payload: unknown, fallback: number) {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  return numberValue(
    record.count ??
      record.total ??
      record.total_count ??
      data.count ??
      data.total ??
      data.total_count,
    fallback,
  );
}
function normalizeRow(value: unknown): Row {
  const record = asRecord(value);
  const company = asRecord(record.company);
  const attachments = Array.isArray(record.attachments) ? record.attachments : [];
  const firstAttachment = asRecord(attachments[0]);
  return {
    id: text(record.id),
    company: text(company.name || company.company_name || record.company_name, "—"),
    companyCode: text(
      company.code || company.company_code || record.company_code,
      "—",
    ),
    recipient: text(record.recipient_name, "—"),
    phone: text(record.recipient_phone),
    body: text(record.message_body || record.body || record.content, "—"),
    messageType: text(record.message_type, "TEXT").toUpperCase(),
    attachmentCount: numberValue(record.attachment_count, attachments.length),
    attachmentName: text(firstAttachment.original_filename),
    attachmentMime: text(firstAttachment.mime_type),
    attachmentSize: numberValue(firstAttachment.file_size),
    status: text(record.status || record.delivery_status, "DRAFT").toUpperCase(),
    direction: text(record.direction, "OUTBOUND").toUpperCase(),
    provider: text(record.provider, "—"),
    createdAt: text(record.created_at) || null,
  };
}
function formatDate(value: string | null, locale: Locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
function statusClass(status: string) {
  if (["SENT", "DELIVERED", "READ"].includes(status)) {
    return "border-emerald-500/30 text-emerald-700";
  }
  if (status === "RECEIVED") {
    return "border-sky-500/30 text-sky-700";
  }
  if (["FAILED", "CANCELLED"].includes(status)) {
    return "border-rose-500/30 text-rose-700";
  }
  return "border-amber-500/30 text-amber-700";
}

function formatFileSize(bytes: number, locale: Locale) {
  if (!bytes) return "";
  const mb = bytes >= 1024 * 1024;
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 1,
  }).format(mb ? bytes / (1024 * 1024) : bytes / 1024) + (mb ? " MB" : " KB");
}
function statusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const labels: Record<string,string> = {DRAFT:t.statusDraft,QUEUED:t.statusQueued,SENT:t.statusSent,DELIVERED:t.statusDelivered,READ:t.statusRead,RECEIVED:t.statusReceived,FAILED:t.statusFailed,CANCELLED:t.statusCancelled};
  return labels[status] || status;
}
function directionLabel(direction: string, locale: Locale) {
  const t=translations[locale];
  return direction==="INBOUND"?t.inbound:direction==="OUTBOUND"?t.outbound:direction;
}
function mediaLabel(type: string, locale: Locale) {
  const t=translations[locale];
  const labels: Record<string,string>={IMAGE:t.mediaImage,AUDIO:t.mediaAudio,VIDEO:t.mediaVideo,DOCUMENT:t.mediaDocument};
  return labels[type] || type;
}
function mediaIcon(type: string) {
  if(type==="IMAGE") return FileImage;
  if(type==="AUDIO") return FileAudio;
  if(type==="VIDEO") return FileVideo;
  return FileText;
}
function cleanMediaBody(row: Row) {
  const raw=String(row.body||"").trim();
  const marker=`[${row.messageType}]`;
  if(!raw || raw===marker) return "";
  return raw.startsWith(`${marker} `)?raw.slice(marker.length).trim():raw;
}

export default function SystemWhatsAppMessagesView() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [apiTotal, setApiTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [direction, setDirection] = React.useState<DirectionFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("newest");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  React.useEffect(() => {
    const apply = () => setLocale(getLocale());
    apply();
    window.addEventListener("storage", apply);
    window.addEventListener("Mhamcloud-locale-changed", apply);
    return () => {
      window.removeEventListener("storage", apply);
      window.removeEventListener("Mhamcloud-locale-changed", apply);
    };
  }, []);

  const load = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const payload = await fetchJson<unknown>(
          API_PATHS.systemWhatsApp.messages,
          new URLSearchParams({ limit: "200" }),
        );
        const nextRows = listFromPayload(payload).map(normalizeRow);
        setRows(nextRows);
        setApiTotal(totalFromPayload(payload, nextRows.length));
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : t.error;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.error],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const matchesSearch =
        !query ||
        [
          row.company,
          row.companyCode,
          row.recipient,
          row.phone,
          row.body,
          row.messageType,
          row.attachmentName,
          row.attachmentMime,
          statusLabel(row.status, locale),
          directionLabel(row.direction, locale),
          row.provider,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return (
        matchesSearch &&
        (status === "all" || row.status === status) &&
        (direction === "all" || row.direction === direction)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sort === "oldest") {
        return String(a.createdAt).localeCompare(String(b.createdAt));
      }
      if (sort === "recipient") {
        return (a.recipient || a.phone).localeCompare(b.recipient || b.phone);
      }
      if (sort === "status") return a.status.localeCompare(b.status);
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }, [rows, search, status, direction, sort]);

  const hasFilters =
    Boolean(search.trim()) ||
    status !== "all" ||
    direction !== "all" ||
    sort !== "newest";

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setDirection("all");
    setSort("newest");
  }

  function exportRows() {
    return filteredRows.map((row) => [
      row.company,
      row.companyCode,
      row.recipient,
      row.phone,
      row.body,
      statusLabel(row.status, locale),
      directionLabel(row.direction, locale),
      row.provider,
      formatDate(row.createdAt, locale),
    ]);
  }

  function exportExcel() {
    const reportRows = exportRows();
    if (!reportRows.length) {
      toast.error(t.emptyExport);
      return;
    }
    const section: ExcelReportSection = {
      title: t.tableTitle,
      headers: [
        t.company,
        "Code",
        t.recipient,
        "Phone",
        t.message,
        t.status,
        t.direction,
        t.provider,
        t.createdAt,
      ],
      rows: reportRows.map((row) =>
        row.map((value) => ({ value, type: "text" as const })),
      ),
    };
    downloadExcelReport({
      locale,
      title: t.title,
      subtitle: t.subtitle,
      filename: `Mhamcloud-system-whatsapp-messages-${new Date()
        .toISOString()
        .slice(0, 10)}.xls`,
      generatedAtLabel: t.generatedAt,
      sections: [section],
    });
  }

  function printRows() {
    const reportRows = exportRows();
    if (!reportRows.length) {
      toast.error(t.emptyPrint);
      return;
    }
    const section: PrintReportTableSection = {
      title: t.tableTitle,
      columns: [
        { label: t.company, width: 180, type: "text" },
        { label: "Code", width: 100, type: "text" },
        { label: t.recipient, width: 150, type: "text" },
        { label: "Phone", width: 130, type: "text" },
        { label: t.message, width: 280, type: "text" },
        { label: t.status, width: 100, type: "text" },
        { label: t.direction, width: 100, type: "text" },
        { label: t.provider, width: 120, type: "text" },
        { label: t.createdAt, width: 150, type: "text" },
      ],
      rows: reportRows,
    };
    openPrintTableReport({
      locale,
      title: t.title,
      subtitle: t.subtitle,
      sections: [section],
      recordsCount: reportRows.length,
      recordsLabel: t.rows,
      generatedAtLabel: t.generatedAt,
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card dir={dir} className="mx-auto max-w-3xl border-destructive/30">
        <CardHeader className="text-center">
          <TriangleAlert className="mx-auto size-8 text-destructive" />
          <CardTitle>{t.error}</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => void load(true)}>
            <RefreshCw className="size-4" />
            {t.tryAgain}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sent = rows.filter((row) =>
    ["SENT", "DELIVERED", "READ"].includes(row.status),
  ).length;
  const received = rows.filter((row) => row.status === "RECEIVED").length;
  const failed = rows.filter((row) =>
    ["FAILED", "CANCELLED"].includes(row.status),
  ).length;

  return (
    <div dir={dir} className="space-y-6">
      <SystemWhatsAppModuleNav />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{t.title}</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground lg:block">
            {t.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className={registerOutlineButtonClass}
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {t.refresh}
          </Button>
          <Button className={registerBrandButtonClass} onClick={exportExcel}>
            <FileSpreadsheet className="size-4" />
            {t.excel}
          </Button>
          <Button className={registerBrandButtonClass} onClick={printRows}>
            <Printer className="size-4" />
            {t.print}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SystemMetricCard title={t.total} value={apiTotal || rows.length} description={t.live} icon={MessageCircle} />
        <SystemMetricCard title={t.sent} value={sent} description={t.live} icon={CheckCircle2} />
        <SystemMetricCard title={t.received} value={received} description={t.live} icon={Inbox} />
        <SystemMetricCard title={t.failed} value={failed} description={t.live} icon={XCircle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.tableTitle}</CardTitle>
          <CardDescription>{t.tableDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataRegisterToolbar className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
              <DataRegisterSearch
                value={search}
                onChange={setSearch}
                placeholder={t.search}
                className="w-full md:min-w-[320px] md:flex-1"
              />
              <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  {["DRAFT","QUEUED","SENT","DELIVERED","READ","RECEIVED","FAILED","CANCELLED"].map((value) => (
                    <SelectItem key={value} value={value}>{statusLabel(value, locale)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={direction} onValueChange={(value) => setDirection(value as DirectionFilter)}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="OUTBOUND">{t.outbound}</SelectItem>
                  <SelectItem value="INBOUND">{t.inbound}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger className="h-9 bg-background shadow-none sm:w-[160px]">
                  <ArrowUpDown className="size-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t.newest}</SelectItem>
                  <SelectItem value="oldest">{t.oldest}</SelectItem>
                  <SelectItem value="recipient">{t.recipientSort}</SelectItem>
                  <SelectItem value="status">{t.statusSort}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-9 bg-background shadow-none" onClick={resetFilters}>
                <RotateCcw className="size-4" />
                {t.reset}
              </Button>
            </div>
          </DataRegisterToolbar>

          <DataRegisterTableFrame>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.company}</TableHead>
                  <TableHead>{t.recipient}</TableHead>
                  <TableHead>{t.message}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.direction}</TableHead>
                  <TableHead>{t.provider}</TableHead>
                  <TableHead>{t.createdAt}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length ? (
                  filteredRows.map((row) => (
                    <TableRow key={row.id || `${row.phone}-${row.createdAt}`}>
                      <TableCell className="h-[68px] px-4 align-middle">
                        <div className="font-medium">{row.company}</div>
                        <div className="text-xs text-muted-foreground">{row.companyCode}</div>
                      </TableCell>
                      <TableCell className="h-[68px] px-4 align-middle">
                        <div>{row.recipient}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{row.phone}</div>
                      </TableCell>
                      <TableCell className="h-[68px] max-w-[360px] px-4 align-middle">
                        {row.messageType !== "TEXT" ? (() => {
                          const MediaIcon = mediaIcon(row.messageType);
                          const caption = cleanMediaBody(row);
                          return (
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                                <MediaIcon className="size-4 text-[#a57b3d]" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-sm font-medium">{mediaLabel(row.messageType, locale)}</span>
                                  {row.attachmentCount > 1 ? <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{row.attachmentCount}</Badge> : null}
                                </div>
                                <p className="truncate text-xs text-muted-foreground">
                                  {row.attachmentName || caption || row.attachmentMime || mediaLabel(row.messageType, locale)}
                                  {row.attachmentSize ? ` / ${formatFileSize(row.attachmentSize, locale)}` : ""}
                                </p>
                                {caption && row.attachmentName ? <p className="line-clamp-1 text-xs">{caption}</p> : null}
                              </div>
                            </div>
                          );
                        })() : <p className="line-clamp-2 whitespace-normal">{row.body}</p>}
                      </TableCell>
                      <TableCell className="h-[68px] px-4 align-middle">
                        <Badge variant="outline" className={statusClass(row.status)}>
                          {statusLabel(row.status, locale)}
                        </Badge>
                      </TableCell>
                      <TableCell className="h-[68px] px-4 align-middle">{directionLabel(row.direction, locale)}</TableCell>
                      <TableCell className="h-[68px] px-4 align-middle">{row.provider}</TableCell>
                      <TableCell className="h-[68px] px-4 align-middle text-muted-foreground">
                        {formatDate(row.createdAt, locale)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <DataRegisterEmptyState
                        icon={Inbox}
                        title={hasFilters ? t.noResults : t.noData}
                        description={hasFilters ? t.noResultsDesc : t.noDataDesc}
                        showReset={hasFilters}
                        resetLabel={t.reset}
                        onReset={resetFilters}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DataRegisterTableFrame>

          <DataRegisterResultCount
            showingLabel={t.showing}
            showingCount={filteredRows.length}
            ofLabel={t.of}
            totalCount={apiTotal || rows.length}
            rowsLabel={t.rows}
          />
        </CardContent>
      </Card>
    </div>
  );
}
