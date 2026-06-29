"use client";

/* ============================================================
   📂 primey_frontend/app/system/settings/page.tsx
   ⚙️ Mhamcloud — System Settings Center
   ------------------------------------------------------------
   ✅ Approved Premium PrimeyCare admin pattern adapted for Mhamcloud
   ✅ Real API only: /api/system/settings/
   ✅ Uses backend Settings Center API
   ✅ KPI cards from /api/system/settings/summary/
   ✅ Settings list + filters + search + sorting
   ✅ Seed defaults + reset setting to default
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
import {
  ArrowUpDown,
  CheckCircle2,
  DatabaseZap,
  FileSpreadsheet,
  FileText,
  Layers3,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  TriangleAlert,
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
type SortKey = "group" | "key" | "newest" | "oldest" | "type";
type StatusFilter = "all" | "active" | "inactive" | "public" | "private" | "required" | "optional";
type GroupFilter = "all" | string;

type SettingRecord = {
  id: string;
  group: string;
  key: string;
  label_ar: string;
  label_en: string;
  description_ar: string;
  description_en: string;
  value_type: string;
  value: unknown;
  default_value: unknown;
  choices: unknown[];
  is_active: boolean;
  is_public: boolean;
  is_required: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

type SettingsSummary = {
  total: number;
  active: number;
  inactive: number;
  public: number;
  required: number;
  groups: Record<string, number>;
};

const SETTINGS_ENDPOINT = "/api/system/settings/";
const SETTINGS_SUMMARY_ENDPOINT = "/api/system/settings/summary/";
const SETTINGS_SEED_DEFAULTS_ENDPOINT = "/api/system/settings/seed-defaults/";

const translations = {
  ar: {
    title: "إعدادات النظام",
    subtitle:
      "مركز إدارة إعدادات Mhamcloud العامة، الفوترة، الاشتراكات، الأمان، الإشعارات، المستندات والتوطين من API حقيقي.",
    badge: "إدارة المنصة",
    refresh: "تحديث",
    seedDefaults: "تهيئة الافتراضيات",
    seeding: "جاري التهيئة",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    reset: "إعادة ضبط",
    resetSetting: "إرجاع الافتراضي",
    searchPlaceholder: "ابحث بالمجموعة أو المفتاح أو الاسم أو الوصف أو نوع القيمة...",
    all: "الكل",
    group: "المجموعة",
    sort: "الترتيب",
    groupSort: "المجموعة",
    keySort: "المفتاح",
    newest: "الأحدث",
    oldest: "الأقدم",
    typeSort: "نوع القيمة",

    totalSettings: "إجمالي الإعدادات",
    activeSettings: "إعدادات نشطة",
    publicSettings: "إعدادات عامة",
    requiredSettings: "إعدادات مطلوبة",
    fromLiveApi: "من API إعدادات النظام الحقيقي",

    tableTitle: "سجل إعدادات النظام",
    tableDesc:
      "يعرض هذا الجدول إعدادات النظام من الباكند مباشرة مع القيمة الحالية والافتراضية والحالة.",
    setting: "الإعداد",
    key: "المفتاح",
    valueType: "نوع القيمة",
    value: "القيمة الحالية",
    defaultValue: "القيمة الافتراضية",
    flags: "الخصائص",
    status: "الحالة",
    updatedAt: "آخر تحديث",
    actions: "إجراء",

    active: "نشط",
    inactive: "غير نشط",
    public: "عام",
    private: "خاص",
    required: "مطلوب",
    optional: "اختياري",
    unknown: "غير محدد",

    general: "عام",
    billing: "الفوترة",
    subscriptions: "الاشتراكات",
    security: "الأمان",
    notifications: "الإشعارات",
    documents: "المستندات",
    localization: "التوطين",

    string: "نص",
    integer: "رقم صحيح",
    decimal: "رقم عشري",
    boolean: "صح / خطأ",
    json: "JSON",
    choice: "اختيار",

    yes: "نعم",
    no: "لا",

    noDataTitle: "لا توجد إعدادات",
    noDataDesc: "اضغط تهيئة الافتراضيات لإنشاء إعدادات النظام الافتراضية من الباكند.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل إعدادات النظام",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير إعدادات نظام Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    refreshed: "تم تحديث إعدادات النظام.",
    seedDone: "تمت تهيئة إعدادات النظام الافتراضية.",
    resetDone: "تم إرجاع الإعداد إلى القيمة الافتراضية.",
    confirmReset: "هل تريد إرجاع هذا الإعداد إلى قيمته الافتراضية؟",
  },
  en: {
    title: "System settings",
    subtitle:
      "Mhamcloud system settings center for general, billing, subscriptions, security, notifications, documents, and localization settings from the real API.",
    badge: "Platform management",
    refresh: "Refresh",
    seedDefaults: "Seed defaults",
    seeding: "Seeding",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    reset: "Reset",
    resetSetting: "Reset default",
    searchPlaceholder: "Search by group, key, label, description, or value type...",
    all: "All",
    group: "Group",
    sort: "Sort",
    groupSort: "Group",
    keySort: "Key",
    newest: "Newest",
    oldest: "Oldest",
    typeSort: "Value type",

    totalSettings: "Total settings",
    activeSettings: "Active settings",
    publicSettings: "Public settings",
    requiredSettings: "Required settings",
    fromLiveApi: "From the real system settings API",

    tableTitle: "System settings registry",
    tableDesc:
      "This table displays system settings directly from the backend with current value, default value, and status.",
    setting: "Setting",
    key: "Key",
    valueType: "Value type",
    value: "Current value",
    defaultValue: "Default value",
    flags: "Flags",
    status: "Status",
    updatedAt: "Updated at",
    actions: "Action",

    active: "Active",
    inactive: "Inactive",
    public: "Public",
    private: "Private",
    required: "Required",
    optional: "Optional",
    unknown: "Unknown",

    general: "General",
    billing: "Billing",
    subscriptions: "Subscriptions",
    security: "Security",
    notifications: "Notifications",
    documents: "Documents",
    localization: "Localization",

    string: "String",
    integer: "Integer",
    decimal: "Decimal",
    boolean: "Boolean",
    json: "JSON",
    choice: "Choice",

    yes: "Yes",
    no: "No",

    noDataTitle: "No settings",
    noDataDesc: "Click Seed defaults to create the default system settings from the backend.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load system settings",
    errorDesc:
      "Make sure you are signed in as a system user and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "Mhamcloud System Settings Report",
    generatedAt: "Generated at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    refreshed: "System settings refreshed.",
    seedDone: "Default system settings were seeded.",
    resetDone: "The setting was reset to its default value.",
    confirmReset: "Reset this setting to its default value?",
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

function toText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
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
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "enabled", "active"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "disabled", "inactive"].includes(normalized)) return false;
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

function rowDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
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

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const cookies = document.cookie ? document.cookie.split("; ") : [];

  for (const cookie of cookies) {
    const [rawKey, ...rawParts] = cookie.split("=");
    if (decodeURIComponent(rawKey) === name) {
      return decodeURIComponent(rawParts.join("="));
    }
  }

  return "";
}

function getCsrfToken() {
  return getCookie("csrftoken") || getCookie("csrf_token") || getCookie("CSRF-TOKEN");
}

async function requestJson<T>(
  url: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
  } = {},
): Promise<T> {
  const method = options.method || "GET";
  const headers: HeadersInit = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    const csrf = getCsrfToken();
    if (csrf) headers["X-CSRFToken"] = csrf;
  }

  const response = await fetch(url, {
    method,
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    headers,
    body: method === "GET" ? undefined : JSON.stringify(options.body ?? {}),
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
    const message =
      toText(record.message) ||
      toText(record.detail) ||
      toText(record.error) ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (payload || {}) as T;
}

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);

  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.records)) return dataRecord.records;
  if (Array.isArray(metaRecord.results)) return metaRecord.results;

  return [];
}

function extractCount(payload: unknown) {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);
  const arrayCount = extractArray(payload).length;

  return toNumber(
    record.count ??
      record.total ??
      record.total_count ??
      dataRecord.count ??
      dataRecord.total ??
      dataRecord.total_count ??
      metaRecord.count ??
      metaRecord.total ??
      metaRecord.total_count,
    arrayCount,
  );
}

function parsePossibleJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return value;
    }
  }

  return value;
}

function displayValue(value: unknown, locale: Locale) {
  const t = translations[locale];

  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? t.yes : t.no;
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeChoices(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  const parsed = parsePossibleJsonValue(value);
  return Array.isArray(parsed) ? parsed : [];
}

function normalizeSetting(value: unknown): SettingRecord {
  const record = asRecord(value);

  const group = toText(record.group, "general");
  const key = toText(record.key, toText(record.code, "setting"));
  const id = toText(record.id, `${group}:${key}`);

  const rawValue =
    record.value ??
    record.current_value ??
    record.value_json ??
    record.current_value_json ??
    record.setting_value;

  const rawDefault =
    record.default_value ??
    record.default ??
    record.default_value_json ??
    record.initial_value;

  return {
    id,
    group,
    key,
    label_ar: toText(record.label_ar, toText(record.name_ar, toText(record.title_ar, key))),
    label_en: toText(record.label_en, toText(record.name_en, toText(record.title_en, key))),
    description_ar: toText(record.description_ar, toText(record.description, "")),
    description_en: toText(record.description_en, toText(record.description, "")),
    value_type: toText(record.value_type, toText(record.type, "string")).toLowerCase(),
    value: parsePossibleJsonValue(rawValue),
    default_value: parsePossibleJsonValue(rawDefault),
    choices: normalizeChoices(record.choices ?? record.choices_json ?? record.options),
    is_active: toBoolean(record.is_active ?? record.active ?? record.enabled, true),
    is_public: toBoolean(record.is_public ?? record.public ?? record.frontend_visible, false),
    is_required: toBoolean(record.is_required ?? record.required ?? record.mandatory, false),
    sort_order: toNumber(record.sort_order ?? record.order, 0),
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    updated_at:
      typeof record.updated_at === "string"
        ? record.updated_at
        : typeof record.modified_at === "string"
          ? record.modified_at
          : null,
  };
}

function normalizeSummary(payload: unknown, rows: SettingRecord[]): SettingsSummary {
  const record = asRecord(payload);
  const groupsRecord = asRecord(record.groups);

  const fallbackGroups = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.group] = (acc[row.group] || 0) + 1;
    return acc;
  }, {});

  const groups = Object.keys(groupsRecord).length
    ? Object.fromEntries(
        Object.entries(groupsRecord).map(([key, value]) => [key, toNumber(value)]),
      )
    : fallbackGroups;

  return {
    total: toNumber(record.total, rows.length),
    active: toNumber(
      record.active,
      rows.filter((row) => row.is_active).length,
    ),
    inactive: toNumber(
      record.inactive,
      rows.filter((row) => !row.is_active).length,
    ),
    public: toNumber(
      record.public ?? record.public_settings,
      rows.filter((row) => row.is_public).length,
    ),
    required: toNumber(
      record.required ?? record.required_settings,
      rows.filter((row) => row.is_required).length,
    ),
    groups,
  };
}

function getGroupLabel(group: string, locale: Locale) {
  const t = translations[locale] as Record<string, string>;
  return t[group] || group;
}

function getTypeLabel(valueType: string, locale: Locale) {
  const t = translations[locale] as Record<string, string>;
  return t[valueType] || valueType || t.unknown;
}

function getStatusClass(setting: SettingRecord) {
  if (!setting.is_active) return "border-rose-200 bg-rose-50 text-rose-700";
  if (setting.is_required) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (setting.is_public) return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function SettingStatusBadge({ setting, locale }: { setting: SettingRecord; locale: Locale }) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getStatusClass(setting))}
    >
      {setting.is_active ? t.active : t.inactive}
    </Badge>
  );
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
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {formatInteger(value)}
          </CardTitle>
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

function SettingsSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
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
        <Card className="rounded-2xl">
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

function EmptyState({
  title,
  description,
  showReset,
  resetLabel,
  onReset,
}: {
  title: string;
  description: string;
  showReset?: boolean;
  resetLabel: string;
  onReset: () => void;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {showReset ? (
        <Button variant="outline" size="sm" onClick={onReset} className="rounded-lg">
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default function SystemSettingsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [settings, setSettings] = React.useState<SettingRecord[]>([]);
  const [apiTotal, setApiTotal] = React.useState(0);
  const [summary, setSummary] = React.useState<SettingsSummary>({
    total: 0,
    active: 0,
    inactive: 0,
    public: 0,
    required: 0,
    groups: {},
  });

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);
  const [resettingId, setResettingId] = React.useState("");
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [group, setGroup] = React.useState<GroupFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("group");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";
  const actionStickyClass = locale === "ar" ? "sticky left-0" : "sticky right-0";

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
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const listPayload = await requestJson<unknown>(makeApiUrl(SETTINGS_ENDPOINT));
        const rows = extractArray(listPayload).map(normalizeSetting);

        setSettings(rows);
        setApiTotal(extractCount(listPayload));

        try {
          const summaryPayload = await requestJson<unknown>(makeApiUrl(SETTINGS_SUMMARY_ENDPOINT));
          setSummary(normalizeSummary(summaryPayload, rows));
        } catch {
          setSummary(normalizeSummary({}, rows));
        }

        if (silent) toast.success(t.refreshed);
      } catch (errorValue) {
        const message =
          errorValue instanceof Error ? errorValue.message : t.errorDesc;

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
    void loadSettings();
  }, [loadSettings]);

  const groupOptions = React.useMemo(() => {
    return Array.from(new Set(settings.map((setting) => setting.group).filter(Boolean))).sort();
  }, [settings]);

  const resetFilters = React.useCallback(() => {
    setSearch("");
    setStatus("all");
    setGroup("all");
    setSort("group");
  }, []);

  const filteredSettings = React.useMemo(() => {
    const needle = search.trim().toLowerCase();

    const rows = settings.filter((setting) => {
      const label = locale === "ar" ? setting.label_ar : setting.label_en;
      const description = locale === "ar" ? setting.description_ar : setting.description_en;

      const haystack = [
        setting.group,
        setting.key,
        setting.value_type,
        label,
        description,
        displayValue(setting.value, locale),
        displayValue(setting.default_value, locale),
      ]
        .join(" ")
        .toLowerCase();

      if (needle && !haystack.includes(needle)) return false;
      if (group !== "all" && setting.group !== group) return false;

      if (status === "active" && !setting.is_active) return false;
      if (status === "inactive" && setting.is_active) return false;
      if (status === "public" && !setting.is_public) return false;
      if (status === "private" && setting.is_public) return false;
      if (status === "required" && !setting.is_required) return false;
      if (status === "optional" && setting.is_required) return false;

      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === "newest") return rowDateValue(b.updated_at || b.created_at) - rowDateValue(a.updated_at || a.created_at);
      if (sort === "oldest") return rowDateValue(a.updated_at || a.created_at) - rowDateValue(b.updated_at || b.created_at);
      if (sort === "key") return a.key.localeCompare(b.key);
      if (sort === "type") return a.value_type.localeCompare(b.value_type);
      return `${a.group}:${a.sort_order}:${a.key}`.localeCompare(`${b.group}:${b.sort_order}:${b.key}`);
    });
  }, [settings, search, group, status, sort, locale]);

  const stats = React.useMemo(() => {
    return {
      total: summary.total || apiTotal || settings.length,
      active: summary.active || settings.filter((setting) => setting.is_active).length,
      public: summary.public || settings.filter((setting) => setting.is_public).length,
      required: summary.required || settings.filter((setting) => setting.is_required).length,
    };
  }, [summary, apiTotal, settings]);

  const hasFilters = Boolean(search || status !== "all" || group !== "all" || sort !== "group");
  const previewRows = filteredSettings.slice(0, 12);

  async function seedDefaults() {
    try {
      setSeeding(true);
      await requestJson<unknown>(makeApiUrl(SETTINGS_SEED_DEFAULTS_ENDPOINT), {
        method: "POST",
        body: {},
      });
      toast.success(t.seedDone);
      await loadSettings({ silent: false });
    } catch (errorValue) {
      toast.error(errorValue instanceof Error ? errorValue.message : t.errorDesc);
    } finally {
      setSeeding(false);
    }
  }

  async function resetSetting(setting: SettingRecord) {
    const confirmed = window.confirm(t.confirmReset);
    if (!confirmed) return;

    try {
      setResettingId(setting.id);
      await requestJson<unknown>(makeApiUrl(`${SETTINGS_ENDPOINT}${setting.id}/reset/`), {
        method: "POST",
        body: {},
      });
      toast.success(t.resetDone);
      await loadSettings({ silent: false });
    } catch (errorValue) {
      toast.error(errorValue instanceof Error ? errorValue.message : t.errorDesc);
    } finally {
      setResettingId("");
    }
  }

  function buildExportRows() {
    return filteredSettings.map((setting) => {
      const label = locale === "ar" ? setting.label_ar : setting.label_en;

      return [
        getGroupLabel(setting.group, locale),
        setting.key,
        label,
        getTypeLabel(setting.value_type, locale),
        displayValue(setting.value, locale),
        displayValue(setting.default_value, locale),
        setting.is_active ? t.active : t.inactive,
        setting.is_public ? t.public : t.private,
        setting.is_required ? t.required : t.optional,
        formatDate(setting.updated_at || setting.created_at),
      ];
    });
  }

  function buildTableHtml() {
    const headers = [
      t.group,
      t.key,
      t.setting,
      t.valueType,
      t.value,
      t.defaultValue,
      t.status,
      t.public,
      t.required,
      t.updatedAt,
    ];

    const rows = buildExportRows();

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
    const rows = buildExportRows();

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
    link.download = `Mhamcloud-system-settings-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function openPrintWindow(mode: "print" | "pdf") {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }

    if (mode === "pdf") {
      toast.info(t.pdfHint);
    }

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
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) return <SettingsSkeleton />;

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
            <Button onClick={() => void loadSettings({ silent: true })} className="rounded-xl">
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
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadSettings({ silent: true })}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void seedDefaults()}
                  disabled={seeding}
                >
                  {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
                  {seeding ? t.seeding : t.seedDefaults}
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
          <KpiCard title={t.totalSettings} value={stats.total} description={t.fromLiveApi} icon={Settings} />
          <KpiCard title={t.activeSettings} value={stats.active} description={t.fromLiveApi} icon={CheckCircle2} />
          <KpiCard title={t.publicSettings} value={stats.public} description={t.fromLiveApi} icon={ShieldCheck} />
          <KpiCard title={t.requiredSettings} value={stats.required} description={t.fromLiveApi} icon={Layers3} />
        </div>

        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.tableTitle}</CardTitle>
                <CardDescription className="mt-2">{t.tableDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <Settings className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(previewRows.length)} {t.of} {formatInteger(apiTotal || settings.length)} {t.rows}
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

                <Select value={group} onValueChange={(value) => setGroup(value)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    {groupOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {getGroupLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="active">{t.active}</SelectItem>
                    <SelectItem value="inactive">{t.inactive}</SelectItem>
                    <SelectItem value="public">{t.public}</SelectItem>
                    <SelectItem value="private">{t.private}</SelectItem>
                    <SelectItem value="required">{t.required}</SelectItem>
                    <SelectItem value="optional">{t.optional}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[160px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">{t.groupSort}</SelectItem>
                    <SelectItem value="key">{t.keySort}</SelectItem>
                    <SelectItem value="type">{t.typeSort}</SelectItem>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1180px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("h-11 w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.group}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[190px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.key}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[250px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.setting}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[120px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.valueType}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[180px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.value}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[180px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.defaultValue}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.flags}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[110px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.status}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.updatedAt}
                      </TableHead>
                      <TableHead className={cn(actionStickyClass, "z-10 h-11 w-[125px] bg-muted/40 px-3 text-center text-xs font-semibold text-muted-foreground")}>
                        {t.actions}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {previewRows.length ? (
                      previewRows.map((setting) => {
                        const label = locale === "ar" ? setting.label_ar : setting.label_en;
                        const description = locale === "ar" ? setting.description_ar : setting.description_en;

                        return (
                          <TableRow key={setting.id || `${setting.group}:${setting.key}`} className="h-[72px]">
                            <TableCell className={cn("h-[72px] overflow-hidden px-4 align-middle", alignClass)}>
                              <Badge variant="outline" className="max-w-full rounded-full">
                                <span className="truncate">{getGroupLabel(setting.group, locale)}</span>
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("h-[72px] overflow-hidden px-4 align-middle", alignClass)}>
                              <span className="block truncate text-sm font-medium tabular-nums text-foreground">
                                {setting.key || "—"}
                              </span>
                            </TableCell>
                            <TableCell className={cn("h-[72px] overflow-hidden px-4 align-middle", alignClass)}>
                              <div className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-foreground">
                                  {label || setting.key || t.unknown}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {description || "—"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className={cn("h-[72px] overflow-hidden px-4 align-middle", alignClass)}>
                              <span className="block truncate text-sm text-muted-foreground">
                                {getTypeLabel(setting.value_type, locale)}
                              </span>
                            </TableCell>
                            <TableCell className={cn("h-[72px] overflow-hidden px-4 align-middle", alignClass)}>
                              <span className="block truncate rounded-lg bg-muted/50 px-2 py-1 text-xs tabular-nums text-foreground">
                                {displayValue(setting.value, locale)}
                              </span>
                            </TableCell>
                            <TableCell className={cn("h-[72px] overflow-hidden px-4 align-middle", alignClass)}>
                              <span className="block truncate rounded-lg bg-muted/30 px-2 py-1 text-xs tabular-nums text-muted-foreground">
                                {displayValue(setting.default_value, locale)}
                              </span>
                            </TableCell>
                            <TableCell className={cn("h-[72px] overflow-hidden px-4 align-middle", alignClass)}>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="rounded-full text-[11px]">
                                  {setting.is_public ? t.public : t.private}
                                </Badge>
                                <Badge variant="outline" className="rounded-full text-[11px]">
                                  {setting.is_required ? t.required : t.optional}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className={cn("h-[72px] px-4 align-middle", alignClass)}>
                              <SettingStatusBadge setting={setting} locale={locale} />
                            </TableCell>
                            <TableCell className={cn("h-[72px] px-4 align-middle", alignClass)}>
                              <span className="text-sm tabular-nums text-muted-foreground">
                                {formatDate(setting.updated_at || setting.created_at)}
                              </span>
                            </TableCell>
                            <TableCell className={cn(actionStickyClass, "z-10 h-[72px] bg-background px-3 text-center align-middle")}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg bg-background px-3"
                                onClick={() => void resetSetting(setting)}
                                disabled={resettingId === setting.id}
                              >
                                {resettingId === setting.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4" />
                                )}
                                {t.resetSetting}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10}>
                          <EmptyState
                            title={hasFilters ? t.noResultsTitle : t.noDataTitle}
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
              </div>
            </div>

            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                {t.showing}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(previewRows.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(apiTotal || settings.length)}
                </span>{" "}
                {t.rows}
              </p>
              <Button
                variant="outline"
                className="w-fit rounded-xl bg-background"
                onClick={() => void loadSettings({ silent: true })}
                disabled={refreshing}
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {t.refresh}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}