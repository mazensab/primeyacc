"use client";

/* ============================================================
   📂 primey_frontend/app/system/whatsapp/templates/page.tsx
   🧠 Primey Care — WhatsApp Templates
   ------------------------------------------------------------
   ✅ Same approved Products / Customers / Orders operational pattern
   ✅ Real API only: /api/whatsapp/templates/
   ✅ Header / KPI cards / search / filters / columns / table unified
   ✅ Inline create/edit form
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
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
  ArrowUpDown,
  CheckCircle2,
  Clipboard,
  ColumnsIcon,
  Copy,
  Edit3,
  FileSpreadsheet,
  Layers3,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type StatusFilter = "all" | "active" | "inactive";
type LanguageFilter = "all" | "ar" | "en";
type TemplateKindFilter = "all" | "event" | "manual" | "system";
type SortKey = "newest" | "oldest" | "name" | "event" | "language" | "status";

type ColumnKey =
  | "select"
  | "template"
  | "event"
  | "language"
  | "kind"
  | "status"
  | "content"
  | "updatedAt"
  | "actions";

type WhatsAppTemplateRecord = {
  id: number;
  name: string;
  code: string;
  event_code: string;
  title: string;
  body: string;
  footer: string;
  language_code: Locale | string;
  template_kind: string;
  variables: string[];
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
  created_at: string | null;
  updated_at: string | null;
};

type TemplateForm = {
  id: number | null;
  name: string;
  code: string;
  event_code: string;
  title: string;
  body: string;
  footer: string;
  language_code: Locale;
  template_kind: "event" | "manual" | "system";
  variables: string;
  is_active: boolean;
  is_default: boolean;
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  results?: unknown[];
  count?: number;
  template?: unknown;
};

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  template: true,
  event: true,
  language: true,
  kind: true,
  status: true,
  content: true,
  updatedAt: true,
  actions: true,
};

const translations = {
  ar: {
    title: "قوالب واتساب",
    subtitle: "إدارة قوالب رسائل واتساب المستخدمة في الأحداث، التنبيهات، الرسائل اليدوية، والتشغيل الآلي.",
    back: "واتساب",
    settings: "الإعدادات",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    totalTemplates: "إجمالي القوالب",
    activeTemplates: "نشطة",
    inactiveTemplates: "غير نشطة",
    eventTemplates: "قوالب أحداث",
    createTemplate: "إضافة قالب",
    editTemplate: "تعديل القالب",
    saveTemplate: "حفظ القالب",
    saving: "جاري الحفظ",
    clearForm: "تفريغ النموذج",
    templates: "القوالب",
    searchPlaceholder: "ابحث باسم القالب أو الكود أو الحدث أو المحتوى...",
    allStatuses: "كل الحالات",
    allLanguages: "كل اللغات",
    allKinds: "كل الأنواع",
    active: "نشط",
    inactive: "غير نشط",
    arabic: "العربية",
    english: "English",
    event: "حدث",
    manual: "يدوي",
    system: "نظام",
    template: "القالب",
    eventCode: "كود الحدث",
    language: "اللغة",
    kind: "النوع",
    status: "الحالة",
    content: "المحتوى",
    updatedAt: "آخر تحديث",
    actions: "الإجراءات",
    columns: "الأعمدة",
    sort: "الترتيب",
    selected: "محدد",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    eventSort: "الحدث",
    languageSort: "اللغة",
    statusSort: "الحالة",
    activeFilters: "فلاتر مفعلة",
    clearSelection: "إلغاء التحديد",
    name: "اسم القالب",
    code: "كود القالب",
    titleField: "العنوان",
    body: "نص الرسالة",
    footer: "التذييل",
    variables: "المتغيرات",
    defaultTemplate: "قالب افتراضي",
    enabled: "مفعل",
    disabled: "معطل",
    usageCount: "مرات الاستخدام",
    copyBody: "نسخ النص",
    edit: "تعديل",
    activate: "تفعيل",
    deactivate: "تعطيل",
    formDesc: "أدخل بيانات القالب ثم احفظه. المتغيرات تفصل بفواصل مثل: customer_name, order_number.",
    noDataTitle: "لا توجد قوالب",
    noDataDesc: "ستظهر قوالب واتساب هنا عند إضافتها.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض قوالب أخرى.",
    errorTitle: "تعذر تحميل قوالب واتساب",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    requiredName: "اسم القالب أو الكود مطلوب.",
    requiredBody: "نص الرسالة مطلوب.",
    saved: "تم حفظ القالب بنجاح.",
    actionSuccess: "تم تنفيذ العملية بنجاح.",
    actionFailed: "تعذر تنفيذ العملية.",
    copied: "تم النسخ",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير قوالب واتساب",
    generatedAt: "تاريخ الطباعة",
    showing: "عرض",
    rows: "صفوف",
    of: "من",
    unknown: "غير محدد",
  },
  en: {
    title: "WhatsApp Templates",
    subtitle: "Manage WhatsApp message templates used for events, alerts, manual messages, and automation.",
    back: "WhatsApp",
    settings: "Settings",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    totalTemplates: "Total templates",
    activeTemplates: "Active",
    inactiveTemplates: "Inactive",
    eventTemplates: "Event templates",
    createTemplate: "Add template",
    editTemplate: "Edit template",
    saveTemplate: "Save template",
    saving: "Saving",
    clearForm: "Clear form",
    templates: "Templates",
    searchPlaceholder: "Search by template name, code, event, or content...",
    allStatuses: "All statuses",
    allLanguages: "All languages",
    allKinds: "All kinds",
    active: "Active",
    inactive: "Inactive",
    arabic: "Arabic",
    english: "English",
    event: "Event",
    manual: "Manual",
    system: "System",
    template: "Template",
    eventCode: "Event code",
    language: "Language",
    kind: "Kind",
    status: "Status",
    content: "Content",
    updatedAt: "Updated at",
    actions: "Actions",
    columns: "Columns",
    sort: "Sort",
    selected: "Selected",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    eventSort: "Event",
    languageSort: "Language",
    statusSort: "Status",
    activeFilters: "Active filters",
    clearSelection: "Clear selection",
    name: "Template name",
    code: "Template code",
    titleField: "Title",
    body: "Message body",
    footer: "Footer",
    variables: "Variables",
    defaultTemplate: "Default template",
    enabled: "Enabled",
    disabled: "Disabled",
    usageCount: "Usage count",
    copyBody: "Copy body",
    edit: "Edit",
    activate: "Activate",
    deactivate: "Deactivate",
    formDesc: "Enter template data then save it. Separate variables by commas, e.g. customer_name, order_number.",
    noDataTitle: "No templates",
    noDataDesc: "WhatsApp templates will appear here once added.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other templates.",
    errorTitle: "Unable to load WhatsApp templates",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    requiredName: "Template name or code is required.",
    requiredBody: "Message body is required.",
    saved: "Template saved successfully.",
    actionSuccess: "Action completed successfully.",
    actionFailed: "Unable to complete action.",
    copied: "Copied",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "WhatsApp templates report",
    generatedAt: "Generated at",
    showing: "Showing",
    rows: "Rows",
    of: "of",
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
    if (["1", "true", "yes", "on", "active", "enabled"].includes(normalized)) return true;
    if (["0", "false", "no", "off", "inactive", "disabled"].includes(normalized)) return false;
  }

  return fallback;
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);

  return parsed.toISOString().slice(0, 10);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).replace("T", " ").slice(0, 16);

  return parsed.toISOString().replace("T", " ").slice(0, 16);
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

function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
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

function extractArray(payload: ApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;

  const data = asRecord(payload.data);
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;

  return [];
}

function normalizeVariables(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTemplate(value: unknown): WhatsAppTemplateRecord {
  const item = asRecord(value);

  return {
    id: toNumber(item.id),
    name: normalizeText(item.name || item.template_name),
    code: normalizeText(item.code || item.template_code || item.slug),
    event_code: normalizeText(item.event_code),
    title: normalizeText(item.title || item.subject),
    body: normalizeText(item.body || item.message_body || item.content),
    footer: normalizeText(item.footer),
    language_code: normalizeText(item.language_code || item.locale || "ar"),
    template_kind: normalizeText(item.template_kind || item.kind || (item.event_code ? "event" : "manual")),
    variables: normalizeVariables(item.variables),
    is_active: toBoolean(item.is_active, true),
    is_default: toBoolean(item.is_default),
    usage_count: toNumber(item.usage_count),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function createInitialForm(locale: Locale): TemplateForm {
  return {
    id: null,
    name: "",
    code: "",
    event_code: "",
    title: "",
    body: "",
    footer: "",
    language_code: locale,
    template_kind: "event",
    variables: "",
    is_active: true,
    is_default: false,
  };
}

function formFromTemplate(template: WhatsAppTemplateRecord, locale: Locale): TemplateForm {
  return {
    id: template.id,
    name: template.name,
    code: template.code,
    event_code: template.event_code,
    title: template.title,
    body: template.body,
    footer: template.footer,
    language_code: template.language_code === "en" ? "en" : "ar",
    template_kind:
      template.template_kind === "system" || template.template_kind === "manual"
        ? (template.template_kind as "system" | "manual")
        : "event",
    variables: template.variables.join(", "),
    is_active: template.is_active,
    is_default: template.is_default,
  };
}

function buildPayload(form: TemplateForm) {
  return {
    name: form.name.trim(),
    template_name: form.name.trim(),
    code: form.code.trim(),
    template_code: form.code.trim(),
    event_code: form.event_code.trim(),
    title: form.title.trim(),
    body: form.body.trim(),
    message_body: form.body.trim(),
    footer: form.footer.trim(),
    language_code: form.language_code,
    template_kind: form.template_kind,
    kind: form.template_kind,
    variables: normalizeVariables(form.variables),
    is_active: form.is_active,
    is_default: form.is_default,
  };
}

function getLanguageLabel(value: string, locale: Locale) {
  const t = translations[locale];
  return value === "en" ? t.english : t.arabic;
}

function getKindLabel(value: string, locale: Locale) {
  const t = translations[locale];

  if (value === "manual") return t.manual;
  if (value === "system") return t.system;

  return t.event;
}

function StatusBadge({ isActive, locale }: { isActive: boolean; locale: Locale }) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        isActive
          ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          : "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40",
      )}
    >
      {isActive ? t.active : t.inactive}
    </Badge>
  );
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

function HeaderSortButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center justify-start gap-1 truncate text-xs font-semibold transition hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="truncate">{children}</span>
      <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

function TableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-11 whitespace-nowrap px-4 text-right align-middle text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function TableBodyCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableCell
      className={cn(
        "h-[62px] overflow-hidden px-4 text-right align-middle",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function TemplatesSkeleton() {
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
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SystemWhatsAppTemplatesPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [templates, setTemplates] = React.useState<WhatsAppTemplateRecord[]>([]);
  const [form, setForm] = React.useState<TemplateForm>(() => createInitialForm("ar"));

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState("");
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [languageFilter, setLanguageFilter] = React.useState<LanguageFilter>("all");
  const [kindFilter, setKindFilter] = React.useState<TemplateKindFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [visibleColumns, setVisibleColumns] =
    React.useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

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

  const loadTemplates = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          limit: "500",
          page_size: "500",
        });

        if (searchInput.trim()) params.set("search", searchInput.trim());
        if (statusFilter !== "all") params.set("is_active", statusFilter === "active" ? "true" : "false");
        if (languageFilter !== "all") params.set("language_code", languageFilter);
        if (kindFilter !== "all") params.set("template_kind", kindFilter);

        const payload = await fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/templates/", params), {
          signal: controller.signal,
        });

        setTemplates(extractArray(payload).map(normalizeTemplate));
        setSelectedIds([]);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setError(message);
        setTemplates([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [kindFilter, languageFilter, searchInput, statusFilter, t.errorDesc],
  );

  React.useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let items = templates.filter((template) => {
      const matchesSearch =
        !query ||
        template.name.toLowerCase().includes(query) ||
        template.code.toLowerCase().includes(query) ||
        template.event_code.toLowerCase().includes(query) ||
        template.title.toLowerCase().includes(query) ||
        template.body.toLowerCase().includes(query) ||
        template.footer.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? template.is_active : !template.is_active);

      const matchesLanguage =
        languageFilter === "all" || template.language_code === languageFilter;

      const matchesKind =
        kindFilter === "all" || template.template_kind === kindFilter;

      return matchesSearch && matchesStatus && matchesLanguage && matchesKind;
    });

    items = [...items].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.created_at || "").localeCompare(String(b.created_at || ""));
      }

      if (sortKey === "name") {
        return (a.name || a.code).localeCompare(b.name || b.code);
      }

      if (sortKey === "event") {
        return a.event_code.localeCompare(b.event_code);
      }

      if (sortKey === "language") {
        return String(a.language_code).localeCompare(String(b.language_code));
      }

      if (sortKey === "status") {
        return Number(b.is_active) - Number(a.is_active);
      }

      return String(b.updated_at || b.created_at || "").localeCompare(
        String(a.updated_at || a.created_at || ""),
      );
    });

    return items;
  }, [kindFilter, languageFilter, searchInput, sortKey, statusFilter, templates]);

  const summary = React.useMemo(() => {
    const active = templates.filter((item) => item.is_active).length;
    const inactive = templates.filter((item) => !item.is_active).length;
    const eventTemplates = templates.filter((item) => item.event_code || item.template_kind === "event").length;

    return {
      total: templates.length,
      active,
      inactive,
      eventTemplates,
    };
  }, [templates]);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    statusFilter !== "all" ||
    languageFilter !== "all" ||
    kindFilter !== "all" ||
    sortKey !== "newest";

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const allPageSelected =
    filteredTemplates.length > 0 &&
    filteredTemplates.every((item) => selectedIds.includes(item.id));

  function updateForm<T extends keyof TemplateForm>(key: T, value: TemplateForm[T]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setLanguageFilter("all");
    setKindFilter("all");
    setSortKey("newest");
    setSelectedIds([]);
  }

  function clearForm() {
    setForm(createInitialForm(locale));
  }

  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredTemplates.map((item) => item.id));
  }

  function toggleSelectItem(id: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((item) => item !== id);
    });
  }

  async function saveTemplate() {
    if (!form.name.trim() && !form.code.trim()) {
      toast.error(t.requiredName);
      return;
    }

    if (!form.body.trim()) {
      toast.error(t.requiredBody);
      return;
    }

    setSaving(true);

    try {
      const payloadBody = buildPayload(form);
      const endpoint = form.id
        ? `/api/whatsapp/templates/${form.id}/`
        : "/api/whatsapp/templates/";

      try {
        await fetchJson<ApiResponse>(makeApiUrl(endpoint), {
          method: form.id ? "PATCH" : "POST",
          body: payloadBody,
        });
      } catch (firstError) {
        await fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/templates/"), {
          method: "POST",
          body: {
            ...payloadBody,
            id: form.id || undefined,
            action: form.id ? "update" : "create",
          },
        });
      }

      toast.success(t.saved);
      clearForm();
      await loadTemplates({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.actionFailed;

      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleTemplateStatus(template: WhatsAppTemplateRecord) {
    setActionLoading(`status-${template.id}`);

    try {
      const payloadBody = {
        is_active: !template.is_active,
        action: template.is_active ? "deactivate" : "activate",
      };

      try {
        await fetchJson<ApiResponse>(makeApiUrl(`/api/whatsapp/templates/${template.id}/`), {
          method: "PATCH",
          body: payloadBody,
        });
      } catch (firstError) {
        await fetchJson<ApiResponse>(makeApiUrl("/api/whatsapp/templates/"), {
          method: "POST",
          body: {
            id: template.id,
            ...payloadBody,
          },
        });
      }

      toast.success(t.actionSuccess);
      await loadTemplates({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.actionFailed;

      toast.error(message);
    } finally {
      setActionLoading("");
    }
  }

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.actionFailed);
    }
  }

  function buildExportRows() {
    return filteredTemplates.map((template) => ({
      name: template.name || template.code || "—",
      code: template.code || "—",
      event: template.event_code || "—",
      language: getLanguageLabel(String(template.language_code), locale),
      kind: getKindLabel(template.template_kind, locale),
      status: template.is_active ? t.active : t.inactive,
      title: template.title || "—",
      body: template.body || "—",
      variables: template.variables.join(", "),
      updatedAt: formatDateTime(template.updated_at || template.created_at),
    }));
  }

  function exportExcel() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; direction: ${dir}; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d9d9d9; padding: 8px; text-align: ${locale === "ar" ? "right" : "left"}; }
            th { background: #f3f4f6; font-weight: 700; }
          </style>
        </head>
        <body>
          <h2>${escapeHtml(t.printTitle)}</h2>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.template)}</th>
                <th>${escapeHtml(t.eventCode)}</th>
                <th>${escapeHtml(t.language)}</th>
                <th>${escapeHtml(t.kind)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.titleField)}</th>
                <th>${escapeHtml(t.body)}</th>
                <th>${escapeHtml(t.variables)}</th>
                <th>${escapeHtml(t.updatedAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.name)}<br />${escapeHtml(row.code)}</td>
                      <td>${escapeHtml(row.event)}</td>
                      <td>${escapeHtml(row.language)}</td>
                      <td>${escapeHtml(row.kind)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.title)}</td>
                      <td>${escapeHtml(row.body)}</td>
                      <td>${escapeHtml(row.variables)}</td>
                      <td>${escapeHtml(row.updatedAt)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `primey-care-whatsapp-templates-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.actionFailed);
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 28px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            h1 { margin: 0; font-size: 22px; }
            p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 10px;
              margin-bottom: 18px;
            }
            .box {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 10px;
            }
            .box span {
              display: block;
              color: #6b7280;
              font-size: 11px;
              margin-bottom: 4px;
            }
            .box strong { font-size: 16px; }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px;
              text-align: ${locale === "ar" ? "right" : "left"};
              vertical-align: top;
            }
            th {
              background: #f9fafb;
              color: #374151;
              font-weight: 700;
            }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Primey Care - ${escapeHtml(t.printTitle)}</h1>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.showing)}: ${escapeHtml(rows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalTemplates)}</span><strong>${escapeHtml(summary.total)}</strong></div>
            <div class="box"><span>${escapeHtml(t.activeTemplates)}</span><strong>${escapeHtml(summary.active)}</strong></div>
            <div class="box"><span>${escapeHtml(t.inactiveTemplates)}</span><strong>${escapeHtml(summary.inactive)}</strong></div>
            <div class="box"><span>${escapeHtml(t.eventTemplates)}</span><strong>${escapeHtml(summary.eventTemplates)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.template)}</th>
                <th>${escapeHtml(t.eventCode)}</th>
                <th>${escapeHtml(t.language)}</th>
                <th>${escapeHtml(t.kind)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.titleField)}</th>
                <th>${escapeHtml(t.body)}</th>
                <th>${escapeHtml(t.updatedAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.name)}<br />${escapeHtml(row.code)}</td>
                      <td>${escapeHtml(row.event)}</td>
                      <td>${escapeHtml(row.language)}</td>
                      <td>${escapeHtml(row.kind)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.title)}</td>
                      <td>${escapeHtml(row.body)}</td>
                      <td>${escapeHtml(row.updatedAt)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  if (loading) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <TemplatesSkeleton />
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
            onClick={() => void loadTemplates({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/whatsapp/settings">
              <Settings className="h-4 w-4" />
              {t.settings}
            </Link>
          </Button>

          <Button
            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
            onClick={clearForm}
          >
            <Plus className="h-4 w-4" />
            {t.createTemplate}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            {t.export}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalTemplates}
          value={formatInteger(summary.total)}
          trend={`${t.showing} ${formatInteger(filteredTemplates.length)}`}
          icon={Layers3}
        />

        <KpiCard
          title={t.activeTemplates}
          value={formatInteger(summary.active)}
          trend={t.active}
          icon={CheckCircle2}
        />

        <KpiCard
          title={t.inactiveTemplates}
          value={formatInteger(summary.inactive)}
          trend={t.inactive}
          icon={XCircle}
        />

        <KpiCard
          title={t.eventTemplates}
          value={formatInteger(summary.eventTemplates)}
          trend={t.event}
          icon={ShieldCheck}
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
              onClick={() => void loadTemplates()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-col gap-3">
              <div className="relative w-full">
                <Search
                  className={cn(
                    "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                    locale === "ar" ? "right-3" : "left-3",
                  )}
                />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className={cn(
                    "h-10 rounded-lg bg-background",
                    locale === "ar" ? "pr-9" : "pl-9",
                  )}
                />
              </div>

              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                    <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[145px]">
                      <CheckCircle2 className="h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allStatuses}</SelectItem>
                      <SelectItem value="active">{t.active}</SelectItem>
                      <SelectItem value="inactive">{t.inactive}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={languageFilter} onValueChange={(value) => setLanguageFilter(value as LanguageFilter)}>
                    <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[145px]">
                      <MessageCircle className="h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allLanguages}</SelectItem>
                      <SelectItem value="ar">{t.arabic}</SelectItem>
                      <SelectItem value="en">{t.english}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as TemplateKindFilter)}>
                    <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[145px]">
                      <Layers3 className="h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.allKinds}</SelectItem>
                      <SelectItem value="event">{t.event}</SelectItem>
                      <SelectItem value="manual">{t.manual}</SelectItem>
                      <SelectItem value="system">{t.system}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-9 rounded-lg bg-background">
                        <ColumnsIcon className="h-4 w-4" />
                        {t.columns}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                      <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {(
                        [
                          ["select", t.selected],
                          ["template", t.template],
                          ["event", t.eventCode],
                          ["language", t.language],
                          ["kind", t.kind],
                          ["status", t.status],
                          ["content", t.content],
                          ["updatedAt", t.updatedAt],
                          ["actions", t.actions],
                        ] as [ColumnKey, string][]
                      ).map(([key, label]) => (
                        <DropdownMenuCheckboxItem
                          key={key}
                          checked={visibleColumns[key]}
                          onCheckedChange={(checked) =>
                            setVisibleColumns((current) => ({
                              ...current,
                              [key]: Boolean(checked),
                            }))
                          }
                        >
                          {label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="outline" className="h-9 rounded-lg bg-background" onClick={resetFilters}>
                    <RotateCcw className="h-4 w-4" />
                    {t.reset}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-9 rounded-lg bg-background">
                        <ArrowUpDown className="h-4 w-4" />
                        {t.sort}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                      {(
                        [
                          ["newest", t.newest],
                          ["oldest", t.oldest],
                          ["name", t.nameSort],
                          ["event", t.eventSort],
                          ["language", t.languageSort],
                          ["status", t.statusSort],
                        ] as [SortKey, string][]
                      ).map(([key, label]) => (
                        <DropdownMenuCheckboxItem
                          key={key}
                          checked={sortKey === key}
                          onCheckedChange={() => setSortKey(key)}
                        >
                          {label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {selectedIds.length > 0 ? (
                    <Button variant="outline" className="h-9 rounded-lg bg-background" onClick={() => setSelectedIds([])}>
                      <XCircle className="h-4 w-4" />
                      {t.clearSelection} ({formatInteger(selectedIds.length)})
                    </Button>
                  ) : null}

                  {hasActiveFilters ? (
                    <Badge variant="secondary" className="h-9 rounded-lg px-3 text-xs font-semibold">
                      {t.activeFilters}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="overflow-x-auto">
                <Table className="min-w-[1160px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      {visibleColumns.select ? (
                        <TableHeaderCell className="w-[46px] px-3">
                          <Checkbox
                            checked={allPageSelected}
                            onCheckedChange={(checked) => toggleSelectAllPage(Boolean(checked))}
                            aria-label={t.selected}
                          />
                        </TableHeaderCell>
                      ) : null}

                      {visibleColumns.template ? (
                        <TableHeaderCell className="w-[240px]">
                          <HeaderSortButton active={sortKey === "name"} onClick={() => setSortKey("name")}>
                            {t.template}
                          </HeaderSortButton>
                        </TableHeaderCell>
                      ) : null}

                      {visibleColumns.event ? (
                        <TableHeaderCell className="w-[150px]">
                          <HeaderSortButton active={sortKey === "event"} onClick={() => setSortKey("event")}>
                            {t.eventCode}
                          </HeaderSortButton>
                        </TableHeaderCell>
                      ) : null}

                      {visibleColumns.language ? (
                        <TableHeaderCell className="w-[110px]">
                          <HeaderSortButton active={sortKey === "language"} onClick={() => setSortKey("language")}>
                            {t.language}
                          </HeaderSortButton>
                        </TableHeaderCell>
                      ) : null}

                      {visibleColumns.kind ? (
                        <TableHeaderCell className="w-[110px]">{t.kind}</TableHeaderCell>
                      ) : null}

                      {visibleColumns.status ? (
                        <TableHeaderCell className="w-[110px]">
                          <HeaderSortButton active={sortKey === "status"} onClick={() => setSortKey("status")}>
                            {t.status}
                          </HeaderSortButton>
                        </TableHeaderCell>
                      ) : null}

                      {visibleColumns.content ? (
                        <TableHeaderCell className="w-[330px]">{t.content}</TableHeaderCell>
                      ) : null}

                      {visibleColumns.updatedAt ? (
                        <TableHeaderCell className="w-[145px]">{t.updatedAt}</TableHeaderCell>
                      ) : null}

                      {visibleColumns.actions ? (
                        <TableHeaderCell className="w-[72px] text-center">{t.actions}</TableHeaderCell>
                      ) : null}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredTemplates.length ? (
                      filteredTemplates.map((template) => (
                        <TableRow key={template.id} className="h-[62px]">
                          {visibleColumns.select ? (
                            <TableBodyCell className="w-[46px] px-3">
                              <Checkbox
                                checked={selectedIds.includes(template.id)}
                                onCheckedChange={(checked) => toggleSelectItem(template.id, Boolean(checked))}
                                aria-label={template.name || template.code}
                              />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.template ? (
                            <TableBodyCell className="w-[240px]">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-emerald-50">
                                  <Layers3 className="h-4 w-4 text-emerald-700" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <button
                                    type="button"
                                    className="block max-w-full truncate text-sm font-semibold text-foreground hover:underline"
                                    onClick={() => setForm(formFromTemplate(template, locale))}
                                  >
                                    {template.name || template.code || t.unknown}
                                  </button>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {template.code || "—"}
                                  </p>
                                </div>
                              </div>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.event ? (
                            <TableBodyCell className="w-[150px]">
                              <span className="block truncate text-sm text-muted-foreground">
                                {template.event_code || "—"}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.language ? (
                            <TableBodyCell className="w-[110px]">
                              <Badge variant="outline" className="rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium">
                                {getLanguageLabel(String(template.language_code), locale)}
                              </Badge>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.kind ? (
                            <TableBodyCell className="w-[110px]">
                              <Badge variant="outline" className="rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium">
                                {getKindLabel(template.template_kind, locale)}
                              </Badge>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.status ? (
                            <TableBodyCell className="w-[110px]">
                              <StatusBadge isActive={template.is_active} locale={locale} />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.content ? (
                            <TableBodyCell className="w-[330px]">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {template.title || "—"}
                                </p>
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                  {template.body || "—"}
                                </p>
                              </div>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.updatedAt ? (
                            <TableBodyCell className="w-[145px]">
                              <span className="block truncate text-sm tabular-nums text-muted-foreground">
                                {formatDateTime(template.updated_at || template.created_at)}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.actions ? (
                            <TableBodyCell className="w-[72px] text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-48">
                                  <DropdownMenuItem onClick={() => setForm(formFromTemplate(template, locale))}>
                                    <Edit3 className="h-4 w-4" />
                                    {t.edit}
                                  </DropdownMenuItem>

                                  <DropdownMenuItem onClick={() => void copyValue(template.body)}>
                                    <Copy className="h-4 w-4" />
                                    {t.copyBody}
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    disabled={actionLoading === `status-${template.id}`}
                                    onClick={() => void toggleTemplateStatus(template)}
                                  >
                                    {template.is_active ? (
                                      <ToggleLeft className="h-4 w-4" />
                                    ) : (
                                      <ToggleRight className="h-4 w-4" />
                                    )}
                                    {template.is_active ? t.deactivate : t.activate}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableBodyCell>
                          ) : null}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={visibleColumnCount} className="h-72">
                          <div className="flex flex-col items-center justify-center gap-3 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                              <Layers3 className="h-6 w-6 text-muted-foreground" />
                            </div>

                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">
                                {hasActiveFilters ? t.noResultsTitle : t.noDataTitle}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {hasActiveFilters ? t.noResultsDesc : t.noDataDesc}
                              </p>
                            </div>

                            {hasActiveFilters ? (
                              <Button variant="outline" className="h-9 rounded-lg" onClick={resetFilters}>
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

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                {t.showing}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(filteredTemplates.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(templates.length)}
                </span>{" "}
                {t.rows}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-6 py-5">
            <CardTitle>{form.id ? t.editTemplate : t.createTemplate}</CardTitle>
            <CardDescription>{t.formDesc}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-6 pb-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <FieldLabel>{t.name}</FieldLabel>
                <Input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.code}</FieldLabel>
                <Input
                  value={form.code}
                  onChange={(event) => updateForm("code", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.eventCode}</FieldLabel>
                <Input
                  value={form.event_code}
                  onChange={(event) => updateForm("event_code", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                  dir="ltr"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>{t.language}</FieldLabel>
                  <Select
                    value={form.language_code}
                    disabled={saving}
                    onValueChange={(value) => updateForm("language_code", value as Locale)}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">{t.arabic}</SelectItem>
                      <SelectItem value="en">{t.english}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.kind}</FieldLabel>
                  <Select
                    value={form.template_kind}
                    disabled={saving}
                    onValueChange={(value) => updateForm("template_kind", value as TemplateForm["template_kind"])}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">{t.event}</SelectItem>
                      <SelectItem value="manual">{t.manual}</SelectItem>
                      <SelectItem value="system">{t.system}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.titleField}</FieldLabel>
                <Input
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.body}</FieldLabel>
                <textarea
                  value={form.body}
                  onChange={(event) => updateForm("body", event.target.value)}
                  disabled={saving}
                  className="min-h-[150px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.footer}</FieldLabel>
                <Input
                  value={form.footer}
                  onChange={(event) => updateForm("footer", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.variables}</FieldLabel>
                <Input
                  value={form.variables}
                  onChange={(event) => updateForm("variables", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                  dir="ltr"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm">
                  <Checkbox
                    checked={form.is_active}
                    disabled={saving}
                    onCheckedChange={(checked) => updateForm("is_active", Boolean(checked))}
                  />
                  {t.enabled}
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm">
                  <Checkbox
                    checked={form.is_default}
                    disabled={saving}
                    onCheckedChange={(checked) => updateForm("is_default", Boolean(checked))}
                  />
                  {t.defaultTemplate}
                </label>
              </div>

              <div className="grid gap-2">
                <Button
                  className="h-10 rounded-lg bg-black text-white hover:bg-black/90"
                  disabled={saving}
                  onClick={() => void saveTemplate()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? t.saving : t.saveTemplate}
                </Button>

                <Button
                  variant="outline"
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                  onClick={clearForm}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.clearForm}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}