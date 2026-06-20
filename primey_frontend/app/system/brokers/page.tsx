"use client";

/* ============================================================
   📂 primey_frontend/app/system/brokers/page.tsx
   🤝 Primey Care — Brokers List Page V1
   ------------------------------------------------------------
   ✅ Approved Products/Customers operational pattern
   ✅ Real API only: GET /api/agents/brokers/
   ✅ Search + filters + columns
   ✅ KPI cards
   ✅ Excel .xls HTML workbook
   ✅ Web Print
   ✅ SAR icon from /currency/sar.svg
   ✅ sonner toast
   ✅ Arabic/English through primey-locale
   ✅ No localhost / no fake data
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpDown,
  BadgePercent,
  CheckCircle2,
  Columns3,
  Copy,
  Eye,
  FileSpreadsheet,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
  WalletCards,
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

type BrokerStatusFilter = "all" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DRAFT";
type CommissionTypeFilter = "all" | "PERCENTAGE" | "FIXED";

type SortKey =
  | "name"
  | "newest"
  | "highest_commission"
  | "code"
  | "city";

type ColumnKey =
  | "select"
  | "broker"
  | "contact"
  | "city"
  | "commissionType"
  | "commissionValue"
  | "status"
  | "createdAt"
  | "actions";

type BrokerRecord = {
  id: number;
  name: string;
  full_name: string;
  broker_name: string;
  broker_code: string;
  code: string;
  referral_code: string;
  status: string;
  phone: string;
  phone_number: string;
  email: string;
  city: string;
  address: string;
  default_commission_type: string;
  default_commission_value: number;
  revenue_recognition_mode: string;
  settlement_mode: string;
  bank_name: string;
  bank_account_name: string;
  iban: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
};

type BrokersApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  count?: number;
  results?: unknown[];
  items?: unknown[];
  brokers?: unknown[];
  data?: {
    count?: number;
    results?: unknown[];
    items?: unknown[];
    brokers?: unknown[];
  };
};

type BrokerStats = {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  draft: number;
  percentage_count: number;
  fixed_count: number;
  average_commission: number;
};

const SAR_ICON = "/currency/sar.svg";

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  broker: true,
  contact: true,
  city: true,
  commissionType: true,
  commissionValue: true,
  status: true,
  createdAt: false,
  actions: true,
};

const translations = {
  ar: {
    title: "الوسطاء والوكلاء",
    subtitle:
      "إدارة الوسطاء المرتبطين بالمندوبين، أكواد الإحالة، إعدادات العمولة، وبيانات التواصل.",
    create: "إنشاء وسيط",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث باسم الوسيط، الكود، كود الإحالة، الجوال، البريد، أو المدينة...",
    totalBrokers: "إجمالي الوسطاء",
    activeBrokers: "النشطون",
    averageCommission: "متوسط العمولة",
    percentageBrokers: "عمولة نسبة",
    fixedBrokers: "عمولة ثابتة",
    inactiveBrokers: "غير نشط",
    broker: "الوسيط",
    contact: "التواصل",
    city: "المدينة",
    commissionType: "نوع العمولة",
    commissionValue: "قيمة العمولة",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",
    actions: "الإجراءات",
    columns: "الأعمدة",
    sort: "الترتيب",
    selected: "محدد",
    allStatuses: "كل الحالات",
    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    draft: "مسودة",
    allCommissionTypes: "كل أنواع العمولة",
    percentage: "نسبة",
    fixed: "مبلغ ثابت",
    allCities: "كل المدن",
    nameSort: "الاسم",
    newest: "الأحدث",
    highestCommission: "الأعلى عمولة",
    codeSort: "الكود",
    citySort: "المدينة",
    activeFilters: "فلاتر مفعلة",
    clearSelection: "إلغاء التحديد",
    view: "عرض التفاصيل",
    copyCode: "نسخ كود الوسيط",
    copyReferral: "نسخ كود الإحالة",
    copied: "تم النسخ",
    noDataTitle: "لا يوجد وسطاء بعد",
    noDataDesc: "عند إنشاء الوسطاء سيظهرون هنا ليتم اختيارهم في صفحة إنشاء المندوب.",
    noResultsTitle: "لا توجد نتائج",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل الوسطاء",
    errorDesc: "تأكد من تشغيل الخادم ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    showing: "عرض",
    of: "من",
    rows: "سجل",
    page: "صفحة",
    previous: "السابق",
    next: "التالي",
    generatedAt: "تاريخ الإنشاء",
    printTitle: "تقرير الوسطاء",
    unknown: "غير معروف",
  },
  en: {
    title: "Brokers",
    subtitle:
      "Manage brokers linked to agents, referral codes, commission settings, and contact data.",
    create: "Create broker",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    searchPlaceholder: "Search by broker name, code, referral, phone, email, or city...",
    totalBrokers: "Total brokers",
    activeBrokers: "Active brokers",
    averageCommission: "Average commission",
    percentageBrokers: "Percentage commission",
    fixedBrokers: "Fixed commission",
    inactiveBrokers: "Inactive",
    broker: "Broker",
    contact: "Contact",
    city: "City",
    commissionType: "Commission type",
    commissionValue: "Commission value",
    status: "Status",
    createdAt: "Created at",
    actions: "Actions",
    columns: "Columns",
    sort: "Sort",
    selected: "Selected",
    allStatuses: "All statuses",
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    draft: "Draft",
    allCommissionTypes: "All commission types",
    percentage: "Percentage",
    fixed: "Fixed amount",
    allCities: "All cities",
    nameSort: "Name",
    newest: "Newest",
    highestCommission: "Highest commission",
    codeSort: "Code",
    citySort: "City",
    activeFilters: "Active filters",
    clearSelection: "Clear selection",
    view: "View details",
    copyCode: "Copy broker code",
    copyReferral: "Copy referral code",
    copied: "Copied",
    noDataTitle: "No brokers yet",
    noDataDesc: "Brokers will appear here after creation and can be selected when creating agents.",
    noResultsTitle: "No results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load brokers",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    showing: "Showing",
    of: "of",
    rows: "rows",
    page: "Page",
    previous: "Previous",
    next: "Next",
    generatedAt: "Generated at",
    printTitle: "Brokers report",
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }

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

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
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

function normalizeBroker(value: unknown): BrokerRecord {
  const item = asRecord(value);

  const id = toNumber(item.id || item.value);
  const name = normalizeText(
    item.name || item.full_name || item.broker_name || item.label,
    `#${id}`,
  );
  const brokerCode = normalizeText(item.broker_code || item.code);
  const phone = normalizeText(item.phone || item.phone_number || item.mobile);

  return {
    id,
    name,
    full_name: name,
    broker_name: name,
    broker_code: brokerCode,
    code: brokerCode,
    referral_code: normalizeText(item.referral_code || item.ref_code),
    status: normalizeText(item.status).toUpperCase(),
    phone,
    phone_number: phone,
    email: normalizeText(item.email),
    city: normalizeText(item.city),
    address: normalizeText(item.address),
    default_commission_type: normalizeText(
      item.default_commission_type || item.commission_type,
    ).toUpperCase(),
    default_commission_value: toNumber(
      item.default_commission_value || item.commission_value,
    ),
    revenue_recognition_mode: normalizeText(item.revenue_recognition_mode),
    settlement_mode: normalizeText(item.settlement_mode),
    bank_name: normalizeText(item.bank_name),
    bank_account_name: normalizeText(item.bank_account_name),
    iban: normalizeText(item.iban),
    notes: normalizeText(item.notes),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function extractBrokers(payload: BrokersApiResponse): BrokerRecord[] {
  const data = asRecord(payload.data);

  const candidates = [
    data.brokers,
    data.results,
    data.items,
    payload.brokers,
    payload.results,
    payload.items,
  ];

  for (const candidate of candidates) {
    const rows = asArray(candidate)
      .map(normalizeBroker)
      .filter((broker) => broker.id > 0);

    if (rows.length) return rows;
  }

  return [];
}

function calculateStats(rows: BrokerRecord[]): BrokerStats {
  const total = rows.length;
  const active = rows.filter((broker) => broker.status === "ACTIVE").length;
  const inactive = rows.filter((broker) => broker.status === "INACTIVE").length;
  const suspended = rows.filter((broker) => broker.status === "SUSPENDED").length;
  const draft = rows.filter((broker) => broker.status === "DRAFT").length;
  const percentage_count = rows.filter(
    (broker) => broker.default_commission_type === "PERCENTAGE",
  ).length;
  const fixed_count = rows.filter(
    (broker) => broker.default_commission_type === "FIXED",
  ).length;

  const average_commission = total
    ? rows.reduce((sum, broker) => sum + broker.default_commission_value, 0) / total
    : 0;

  return {
    total,
    active,
    inactive,
    suspended,
    draft,
    percentage_count,
    fixed_count,
    average_commission,
  };
}

function getStatusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "ACTIVE") return t.active;
  if (normalized === "INACTIVE") return t.inactive;
  if (normalized === "SUSPENDED") return t.suspended;
  if (normalized === "DRAFT") return t.draft;

  return normalized || t.unknown;
}

function getStatusClass(status: string) {
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "ACTIVE") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (normalized === "DRAFT") {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  if (normalized === "SUSPENDED") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function getCommissionTypeLabel(type: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(type).toUpperCase();

  if (normalized === "PERCENTAGE") return t.percentage;
  if (normalized === "FIXED") return t.fixed;

  return normalized || t.unknown;
}

function SarIcon({ className }: { className?: string }) {
  return (
    <Image
      src={SAR_ICON}
      alt="SAR"
      width={14}
      height={14}
      className={cn("inline-block h-3.5 w-3.5 object-contain", className)}
      unoptimized
    />
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "purple";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : tone === "purple"
          ? "bg-purple-50 text-purple-700"
          : "bg-background text-muted-foreground";

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
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", toneClass)}>
            <Icon className="h-4 w-4" />
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full rounded-full px-2.5 py-1 text-xs font-medium",
        getStatusClass(status),
      )}
    >
      <span className="truncate">{getStatusLabel(status, locale)}</span>
    </Badge>
  );
}

function TableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={cn(
        "whitespace-nowrap px-4 text-start text-xs font-semibold text-muted-foreground",
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
  className?: string;
}) {
  return <TableCell className={cn("px-4 text-start align-middle", className)}>{children}</TableCell>;
}

function HeaderSortButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-start transition hover:text-foreground",
        active && "font-bold text-foreground",
      )}
    >
      {children}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </button>
  );
}

function BrokersSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-lg border bg-card shadow-none">
            <CardHeader className="min-h-[112px] px-6 py-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[480px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SystemBrokersPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [brokers, setBrokers] = React.useState<BrokerRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<BrokerStatusFilter>("all");
  const [commissionTypeFilter, setCommissionTypeFilter] =
    React.useState<CommissionTypeFilter>("all");
  const [cityFilter, setCityFilter] = React.useState("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [visibleColumns, setVisibleColumns] =
    React.useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [page, setPage] = React.useState(1);

  const didLoadRef = React.useRef(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const pageSize = 10;

  React.useEffect(() => {
    const applyLocale = () => setLocale(getInitialLocale());

    applyLocale();

    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  const loadBrokers = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const payload = await fetchJson<BrokersApiResponse>(
          makeApiUrl(
            "/api/agents/brokers/",
            new URLSearchParams({
              page: "1",
              page_size: "500",
            }),
          ),
          controller.signal,
        );

        setBrokers(extractBrokers(payload));
        setSelectedIds([]);
        setPage(1);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setBrokers([]);
        setSelectedIds([]);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [t.errorDesc],
  );

  React.useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    void loadBrokers();
  }, [loadBrokers]);

  const availableCities = React.useMemo(() => {
    const cities = new Set<string>();

    brokers.forEach((broker) => {
      if (broker.city) cities.add(broker.city);
    });

    return Array.from(cities).sort((a, b) => a.localeCompare(b));
  }, [brokers]);

  const filteredBrokers = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = brokers.filter((broker) => {
      const status = normalizeText(broker.status).toUpperCase();
      const commissionType = normalizeText(broker.default_commission_type).toUpperCase();

      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (
        commissionTypeFilter !== "all" &&
        commissionType !== commissionTypeFilter
      ) {
        return false;
      }

      if (cityFilter !== "all" && broker.city !== cityFilter) return false;

      if (!query) return true;

      const haystack = [
        broker.name,
        broker.broker_code,
        broker.referral_code,
        broker.phone,
        broker.email,
        broker.city,
        broker.address,
        broker.bank_name,
        broker.iban,
        broker.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    return [...rows].sort((a, b) => {
      if (sortKey === "newest") {
        return normalizeText(b.created_at).localeCompare(normalizeText(a.created_at));
      }

      if (sortKey === "highest_commission") {
        return b.default_commission_value - a.default_commission_value;
      }

      if (sortKey === "code") {
        return normalizeText(a.broker_code).localeCompare(normalizeText(b.broker_code));
      }

      if (sortKey === "city") {
        return normalizeText(a.city).localeCompare(normalizeText(b.city));
      }

      return normalizeText(a.name).localeCompare(normalizeText(b.name));
    });
  }, [
    brokers,
    cityFilter,
    commissionTypeFilter,
    search,
    sortKey,
    statusFilter,
  ]);

  const stats = React.useMemo(() => calculateStats(brokers), [brokers]);
  const filteredStats = React.useMemo(() => calculateStats(filteredBrokers), [filteredBrokers]);

  const totalPages = Math.max(Math.ceil(filteredBrokers.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);

  const paginatedBrokers = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBrokers.slice(start, start + pageSize);
  }, [currentPage, filteredBrokers]);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    commissionTypeFilter !== "all" ||
    cityFilter !== "all" ||
    sortKey !== "name";

  const allPageSelected =
    paginatedBrokers.length > 0 &&
    paginatedBrokers.every((broker) => selectedIds.includes(broker.id));

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setCommissionTypeFilter("all");
    setCityFilter("all");
    setSortKey("name");
    setSelectedIds([]);
    setPage(1);
  }

  function toggleSelectBroker(brokerId: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, brokerId]));
      return current.filter((id) => id !== brokerId);
    });
  }

  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds((current) =>
        current.filter((id) => !paginatedBrokers.some((broker) => broker.id === id)),
      );
      return;
    }

    setSelectedIds((current) =>
      Array.from(new Set([...current, ...paginatedBrokers.map((broker) => broker.id)])),
    );
  }

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.errorDesc);
    }
  }

  function exportExcel() {
    const selectedRows = selectedIds.length
      ? filteredBrokers.filter((broker) => selectedIds.includes(broker.id))
      : filteredBrokers;

    const headers = [
      t.broker,
      t.contact,
      t.city,
      t.commissionType,
      t.commissionValue,
      t.status,
      t.createdAt,
    ];

    const bodyRows = selectedRows.map((broker) => [
      broker.name,
      broker.phone || broker.email || "",
      broker.city || "",
      getCommissionTypeLabel(broker.default_commission_type, locale),
      broker.default_commission_type === "PERCENTAGE"
        ? `${formatMoney(broker.default_commission_value)}%`
        : formatMoney(broker.default_commission_value),
      getStatusLabel(broker.status, locale),
      formatDate(broker.created_at),
    ]);

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
        </head>
        <body>
          <table border="1">
            <thead>
              <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${bodyRows
                .map(
                  (row) =>
                    `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
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
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `primey-care-brokers-${new Date().toISOString().slice(0, 10)}.xls`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    const selectedRows = selectedIds.length
      ? filteredBrokers.filter((broker) => selectedIds.includes(broker.id))
      : filteredBrokers;

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.errorDesc);
      return;
    }

    const rowsHtml = selectedRows.length
      ? selectedRows
          .map(
            (broker) => `
              <tr>
                <td>${escapeHtml(broker.name)}</td>
                <td>${escapeHtml(broker.broker_code || "—")}</td>
                <td>${escapeHtml(broker.referral_code || "—")}</td>
                <td>${escapeHtml(broker.phone || "—")}</td>
                <td>${escapeHtml(broker.city || "—")}</td>
                <td>${escapeHtml(getCommissionTypeLabel(broker.default_commission_type, locale))}</td>
                <td class="num">${escapeHtml(formatMoney(broker.default_commission_value))}</td>
                <td>${escapeHtml(getStatusLabel(broker.status, locale))}</td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="8">${escapeHtml(t.noResultsDesc)}</td></tr>`;

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
            .num { direction: ltr; unicode-bidi: embed; white-space: nowrap; }
            @media print {
              body { padding: 16px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Primey Care - ${escapeHtml(t.printTitle)}</h1>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.showing)}: ${escapeHtml(formatInteger(selectedRows.length))} ${escapeHtml(t.rows)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalBrokers)}</span><strong class="num">${escapeHtml(formatInteger(filteredStats.total))}</strong></div>
            <div class="box"><span>${escapeHtml(t.activeBrokers)}</span><strong class="num">${escapeHtml(formatInteger(filteredStats.active))}</strong></div>
            <div class="box"><span>${escapeHtml(t.percentageBrokers)}</span><strong class="num">${escapeHtml(formatInteger(filteredStats.percentage_count))}</strong></div>
            <div class="box"><span>${escapeHtml(t.averageCommission)}</span><strong class="num">${escapeHtml(formatMoney(filteredStats.average_commission))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.broker)}</th>
                <th>${escapeHtml(t.broker)} #</th>
                <th>${escapeHtml(t.copyReferral)}</th>
                <th>${escapeHtml(t.contact)}</th>
                <th>${escapeHtml(t.city)}</th>
                <th>${escapeHtml(t.commissionType)}</th>
                <th>${escapeHtml(t.commissionValue)}</th>
                <th>${escapeHtml(t.status)}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
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
        <BrokersSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-start">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadBrokers({ silent: true })}
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
            variant="outline"
            className="h-9 rounded-lg"
            onClick={exportExcel}
            disabled={!filteredBrokers.length}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {t.export}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={printPage}
            disabled={!filteredBrokers.length}
          >
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <Button
            asChild
            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
          >
            <Link href="/system/brokers/create">
              <Plus className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalBrokers}
          value={formatInteger(stats.total)}
          icon={UsersRound}
        />
        <KpiCard
          title={t.activeBrokers}
          value={formatInteger(stats.active)}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          title={t.percentageBrokers}
          value={formatInteger(stats.percentage_count)}
          icon={BadgePercent}
          tone="purple"
        />
        <KpiCard
          title={t.averageCommission}
          value={`${formatMoney(stats.average_commission)}%`}
          icon={WalletCards}
          tone="warning"
        />
      </div>

      {error ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-red-200 bg-white">
              <TriangleAlert className="h-6 w-6 text-red-600" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-red-900">{t.errorTitle}</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadBrokers()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

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
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={t.searchPlaceholder}
                className={cn(
                  "h-10 rounded-lg bg-background",
                  locale === "ar" ? "pr-9" : "pl-9",
                )}
              />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as BrokerStatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[145px]">
                    <CheckCircle2 className="h-4 w-4" />
                    <SelectValue placeholder={t.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    <SelectItem value="ACTIVE">{t.active}</SelectItem>
                    <SelectItem value="INACTIVE">{t.inactive}</SelectItem>
                    <SelectItem value="SUSPENDED">{t.suspended}</SelectItem>
                    <SelectItem value="DRAFT">{t.draft}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={commissionTypeFilter}
                  onValueChange={(value) => {
                    setCommissionTypeFilter(value as CommissionTypeFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[175px]">
                    <BadgePercent className="h-4 w-4" />
                    <SelectValue placeholder={t.commissionType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allCommissionTypes}</SelectItem>
                    <SelectItem value="PERCENTAGE">{t.percentage}</SelectItem>
                    <SelectItem value="FIXED">{t.fixed}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={cityFilter}
                  onValueChange={(value) => {
                    setCityFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[150px]">
                    <UsersRound className="h-4 w-4" />
                    <SelectValue placeholder={t.city} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allCities}</SelectItem>
                    {availableCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 rounded-lg bg-background">
                      <Columns3 className="h-4 w-4" />
                      {t.columns}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-64">
                    <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(
                      [
                        ["select", t.selected],
                        ["broker", t.broker],
                        ["contact", t.contact],
                        ["city", t.city],
                        ["commissionType", t.commissionType],
                        ["commissionValue", t.commissionValue],
                        ["status", t.status],
                        ["createdAt", t.createdAt],
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
                        ["name", t.nameSort],
                        ["newest", t.newest],
                        ["highest_commission", t.highestCommission],
                        ["code", t.codeSort],
                        ["city", t.citySort],
                      ] as [SortKey, string][]
                    ).map(([key, label]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={sortKey === key}
                        onCheckedChange={() => {
                          setSortKey(key);
                          setPage(1);
                        }}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-background"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>

                {selectedIds.length > 0 ? (
                  <Button
                    variant="outline"
                    className="h-9 rounded-lg bg-background"
                    onClick={() => setSelectedIds([])}
                  >
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
              <Table className="min-w-[1120px] table-fixed">
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

                    {visibleColumns.broker ? (
                      <TableHeaderCell className="w-[280px]">
                        <HeaderSortButton
                          active={sortKey === "name"}
                          onClick={() => {
                            setSortKey("name");
                            setPage(1);
                          }}
                        >
                          {t.broker}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.contact ? (
                      <TableHeaderCell className="w-[210px]">{t.contact}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.city ? (
                      <TableHeaderCell className="w-[130px]">
                        <HeaderSortButton
                          active={sortKey === "city"}
                          onClick={() => {
                            setSortKey("city");
                            setPage(1);
                          }}
                        >
                          {t.city}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.commissionType ? (
                      <TableHeaderCell className="w-[155px]">{t.commissionType}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.commissionValue ? (
                      <TableHeaderCell className="w-[140px]">
                        <HeaderSortButton
                          active={sortKey === "highest_commission"}
                          onClick={() => {
                            setSortKey("highest_commission");
                            setPage(1);
                          }}
                        >
                          {t.commissionValue}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.status ? (
                      <TableHeaderCell className="w-[120px]">{t.status}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.createdAt ? (
                      <TableHeaderCell className="w-[130px]">
                        <HeaderSortButton
                          active={sortKey === "newest"}
                          onClick={() => {
                            setSortKey("newest");
                            setPage(1);
                          }}
                        >
                          {t.createdAt}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.actions ? (
                      <TableHeaderCell className="w-[72px] text-center">
                        {t.actions}
                      </TableHeaderCell>
                    ) : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedBrokers.length ? (
                    paginatedBrokers.map((broker) => (
                      <TableRow key={broker.id} className="h-[62px]">
                        {visibleColumns.select ? (
                          <TableBodyCell className="w-[46px] px-3">
                            <Checkbox
                              checked={selectedIds.includes(broker.id)}
                              onCheckedChange={(checked) =>
                                toggleSelectBroker(broker.id, Boolean(checked))
                              }
                              aria-label={broker.name}
                            />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.broker ? (
                          <TableBodyCell className="w-[280px]">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/system/brokers/${broker.id}`}
                                  className="block truncate text-sm font-semibold text-foreground hover:underline"
                                >
                                  {broker.name}
                                </Link>
                                <p className="truncate text-xs text-muted-foreground">
                                  {broker.broker_code || "—"} · {broker.referral_code || "—"}
                                </p>
                              </div>
                            </div>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.contact ? (
                          <TableBodyCell className="w-[210px]">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {broker.phone || "—"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {broker.email || "—"}
                              </p>
                            </div>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.city ? (
                          <TableBodyCell className="w-[130px]">
                            <span className="block truncate text-sm text-muted-foreground">
                              {broker.city || "—"}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.commissionType ? (
                          <TableBodyCell className="w-[155px]">
                            <Badge
                              variant="outline"
                              className="max-w-full rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium"
                            >
                              <span className="truncate">
                                {getCommissionTypeLabel(broker.default_commission_type, locale)}
                              </span>
                            </Badge>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.commissionValue ? (
                          <TableBodyCell className="w-[140px]">
                            {broker.default_commission_type === "PERCENTAGE" ? (
                              <span className="block truncate text-sm font-medium tabular-nums">
                                {formatMoney(broker.default_commission_value)}%
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium tabular-nums">
                                {formatMoney(broker.default_commission_value)}
                                <SarIcon />
                              </span>
                            )}
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.status ? (
                          <TableBodyCell className="w-[120px]">
                            <StatusBadge status={broker.status} locale={locale} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.createdAt ? (
                          <TableBodyCell className="w-[130px]">
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {formatDate(broker.created_at)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.actions ? (
                          <TableBodyCell className="w-[72px] text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align={locale === "ar" ? "start" : "end"}
                                className="w-52"
                              >
                                <DropdownMenuItem asChild>
                                  <Link href={`/system/brokers/${broker.id}`}>
                                    <Eye className="h-4 w-4" />
                                    {t.view}
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => void copyValue(broker.broker_code)}
                                >
                                  <Copy className="h-4 w-4" />
                                  {t.copyCode}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => void copyValue(broker.referral_code)}
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  {t.copyReferral}
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
                            <UsersRound className="h-6 w-6 text-muted-foreground" />
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
                            <Button
                              variant="outline"
                              className="h-9 rounded-lg"
                              onClick={resetFilters}
                            >
                              <RotateCcw className="h-4 w-4" />
                              {t.reset}
                            </Button>
                          ) : (
                            <Button
                              asChild
                              className="h-9 rounded-lg bg-black text-white hover:bg-black/90"
                            >
                              <Link href="/system/brokers/create">
                                <Plus className="h-4 w-4" />
                                {t.create}
                              </Link>
                            </Button>
                          )}
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
                {formatInteger(paginatedBrokers.length)}
              </span>{" "}
              {t.of}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(filteredBrokers.length)}
              </span>{" "}
              {t.rows}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                {t.previous}
              </Button>

              <div className="rounded-lg border bg-background px-3 py-2 text-sm tabular-nums">
                {t.page} {formatInteger(currentPage)} {t.of}{" "}
                {formatInteger(totalPages)}
              </div>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(current + 1, totalPages))
                }
              >
                {t.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}