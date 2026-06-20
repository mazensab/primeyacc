"use client";

/* ============================================================
   📂 app/system/accounting/cost-centers/page.tsx
   🧾 Primey Care — Accounting Cost Centers
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET /api/accounting/cost-centers/?page=1&page_size=500
      fallback:
      GET /api/accounting/reports/cost-centers/?page=1&page_size=500
      GET /api/accounting/cost_centers/?page=1&page_size=500
   ✅ Create + details links
   ✅ Search / status / type / sort / columns
   ✅ Local pagination
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  FolderTree,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  TriangleAlert,
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

type ApiResponse = {
  count?: number;
  total?: number;
  total_count?: number;
  results?: unknown[];
  items?: unknown[];
  rows?: unknown[];
  data?: unknown;
  summary?: unknown;
};

type CostCenterStatus = "active" | "inactive" | "archived" | "draft" | "unknown";
type CostCenterType =
  | "department"
  | "branch"
  | "project"
  | "provider"
  | "agent"
  | "operation"
  | "other";

type StatusFilter = "all" | CostCenterStatus;
type TypeFilter = "all" | CostCenterType;

type SortKey =
  | "newest"
  | "oldest"
  | "name"
  | "code"
  | "status"
  | "balance_high"
  | "debit_high"
  | "credit_high"
  | "transactions_high";

type ColumnKey =
  | "center"
  | "code"
  | "type"
  | "status"
  | "manager"
  | "transactions"
  | "debit"
  | "credit"
  | "balance"
  | "actions";

type CostCenterRecord = {
  id: string;
  code: string;
  name: string;
  type: CostCenterType;
  type_label: string;
  status: CostCenterStatus;
  is_active: boolean;
  manager_name: string;
  parent_name: string;
  accounts_count: number;
  transactions_count: number;
  total_debit: number;
  total_credit: number;
  balance: number;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
};

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  center: true,
  code: true,
  type: true,
  status: true,
  manager: true,
  transactions: true,
  debit: true,
  credit: true,
  balance: true,
  actions: true,
};

const translations = {
  ar: {
    title: "مراكز التكلفة",
    subtitle: "إدارة مراكز التكلفة وتتبع الأرصدة والحركات المرتبطة بها.",
    back: "المحاسبة",
    create: "مركز تكلفة جديد",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    openDetails: "فتح التفاصيل",

    totalCenters: "إجمالي المراكز",
    activeCenters: "المراكز النشطة",
    totalTransactions: "إجمالي الحركات",
    totalBalance: "إجمالي الرصيد",

    all: "الكل",
    searchPlaceholder: "ابحث باسم مركز التكلفة أو الكود أو المسؤول...",
    statusFilter: "الحالة",
    typeFilter: "النوع",
    sort: "الترتيب",
    columns: "الأعمدة",
    rowsPerPage: "عدد الصفوف",

    center: "مركز التكلفة",
    code: "الكود",
    type: "النوع",
    status: "الحالة",
    manager: "المسؤول",
    transactions: "الحركات",
    debit: "مدين",
    credit: "دائن",
    balance: "الرصيد",
    actions: "الإجراءات",

    active: "نشط",
    inactive: "غير نشط",
    archived: "مؤرشف",
    draft: "مسودة",
    unknown: "غير محدد",

    department: "قسم",
    branch: "فرع",
    project: "مشروع",
    provider: "مقدم خدمة",
    agent: "مندوب",
    operation: "تشغيلي",
    other: "أخرى",

    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    codeSort: "الكود",
    statusSort: "الحالة",
    balanceHigh: "الأعلى رصيدًا",
    debitHigh: "الأعلى مدين",
    creditHigh: "الأعلى دائن",
    transactionsHigh: "الأكثر حركات",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    page: "صفحة",
    previous: "السابق",
    next: "التالي",
    noDataTitle: "لا توجد مراكز تكلفة",
    noDataDesc: "ستظهر مراكز التكلفة هنا بعد إنشائها.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل مراكز التكلفة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث مراكز التكلفة.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير مراكز التكلفة",
    generatedAt: "تاريخ الطباعة",
    sar: "ر.س",
    notAvailable: "—",
  },
  en: {
    title: "Cost Centers",
    subtitle: "Manage cost centers and track related balances and transactions.",
    back: "Accounting",
    create: "New cost center",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    openDetails: "Open details",

    totalCenters: "Total centers",
    activeCenters: "Active centers",
    totalTransactions: "Total transactions",
    totalBalance: "Total balance",

    all: "All",
    searchPlaceholder: "Search by cost center name, code, or manager...",
    statusFilter: "Status",
    typeFilter: "Type",
    sort: "Sort",
    columns: "Columns",
    rowsPerPage: "Rows per page",

    center: "Cost center",
    code: "Code",
    type: "Type",
    status: "Status",
    manager: "Manager",
    transactions: "Transactions",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    actions: "Actions",

    active: "Active",
    inactive: "Inactive",
    archived: "Archived",
    draft: "Draft",
    unknown: "Unknown",

    department: "Department",
    branch: "Branch",
    project: "Project",
    provider: "Provider",
    agent: "Agent",
    operation: "Operation",
    other: "Other",

    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    codeSort: "Code",
    statusSort: "Status",
    balanceHigh: "Highest balance",
    debitHigh: "Highest debit",
    creditHigh: "Highest credit",
    transactionsHigh: "Most transactions",

    showing: "Showing",
    of: "of",
    rows: "rows",
    page: "Page",
    previous: "Previous",
    next: "Next",
    noDataTitle: "No cost centers",
    noDataDesc: "Cost centers will appear here once created.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load cost centers",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Cost centers refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Cost centers report",
    generatedAt: "Generated at",
    sar: "SAR",
    notAvailable: "—",
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

    if (["1", "true", "yes", "on", "active", "enabled"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off", "inactive", "disabled", "archived"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(toNumber(value));
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
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

  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}

function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
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

  return (payload || {}) as T;
}

function extractArray(payload: ApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  const data = asRecord(payload.data);

  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.cost_centers)) return data.cost_centers;
  if (Array.isArray(data.costCenters)) return data.costCenters;
  if (Array.isArray(data.centers)) return data.centers;

  return [];
}

function normalizeType(value: unknown): CostCenterType {
  const type = normalizeText(value).toLowerCase();

  if (["department", "dept", "section"].includes(type)) return "department";
  if (["branch", "location"].includes(type)) return "branch";
  if (["project", "program"].includes(type)) return "project";
  if (["provider", "center", "service_provider"].includes(type)) return "provider";
  if (["agent", "sales_agent", "delivery_agent"].includes(type)) return "agent";
  if (["operation", "operational", "ops"].includes(type)) return "operation";

  return "other";
}

function normalizeStatus(value: unknown, isActive: boolean): CostCenterStatus {
  const status = normalizeText(value).toLowerCase();

  if (["active", "enabled", "open"].includes(status)) return "active";
  if (["inactive", "disabled", "closed"].includes(status)) return "inactive";
  if (["archived", "archive"].includes(status)) return "archived";
  if (["draft", "pending", "new"].includes(status)) return "draft";

  return isActive ? "active" : "inactive";
}

function normalizeCostCenter(value: unknown): CostCenterRecord {
  const item = asRecord(value);
  const parent = asRecord(item.parent || item.parent_cost_center || item.parent_center);
  const manager = asRecord(item.manager || item.responsible_user || item.owner);

  const id = normalizeText(item.id || item.pk || item.uuid);
  const isActive = toBoolean(item.is_active ?? item.active ?? item.enabled, true);
  const type = normalizeType(item.type || item.center_type || item.cost_center_type || item.category);

  const totalDebit = toNumber(item.total_debit ?? item.debit ?? item.debit_amount);
  const totalCredit = toNumber(item.total_credit ?? item.credit ?? item.credit_amount);
  const balance = toNumber(item.balance ?? item.current_balance ?? totalDebit - totalCredit);

  return {
    id,
    code: normalizeText(item.code || item.cost_center_code || item.center_code || item.number),
    name:
      normalizeText(item.name || item.title || item.cost_center_name || item.name_ar || item.name_en) ||
      (id ? `#${id}` : ""),
    type,
    type_label: normalizeText(item.type_label || item.center_type_label || item.category_label),
    status: normalizeStatus(item.status || item.center_status, isActive),
    is_active: isActive,
    manager_name: normalizeText(
      item.manager_name ||
        item.responsible_name ||
        item.owner_name ||
        manager.name ||
        manager.full_name ||
        manager.username,
    ),
    parent_name: normalizeText(
      item.parent_name ||
        item.parent_cost_center_name ||
        parent.name ||
        parent.title ||
        parent.code,
    ),
    accounts_count: toNumber(item.accounts_count ?? item.linked_accounts_count),
    transactions_count: toNumber(
      item.transactions_count ??
        item.entries_count ??
        item.journal_entries_count ??
        item.movements_count,
    ),
    total_debit: totalDebit,
    total_credit: totalCredit,
    balance,
    notes: normalizeText(item.notes || item.description || item.internal_notes),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function statusLabel(status: CostCenterStatus, locale: Locale) {
  const t = translations[locale];

  if (status === "active") return t.active;
  if (status === "inactive") return t.inactive;
  if (status === "archived") return t.archived;
  if (status === "draft") return t.draft;

  return t.unknown;
}

function typeLabel(type: CostCenterType, locale: Locale) {
  const t = translations[locale];

  if (type === "department") return t.department;
  if (type === "branch") return t.branch;
  if (type === "project") return t.project;
  if (type === "provider") return t.provider;
  if (type === "agent") return t.agent;
  if (type === "operation") return t.operation;

  return t.other;
}

function getStatusClass(status: CostCenterStatus) {
  if (status === "active") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "inactive") {
    return "border-slate-500/30 bg-slate-50 text-slate-700 hover:bg-slate-50";
  }

  if (status === "draft") {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  if (status === "archived") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function getTypeClass(type: CostCenterType) {
  if (type === "department") return "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50";
  if (type === "branch") return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  if (type === "project") return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  if (type === "provider") return "border-cyan-500/30 bg-cyan-50 text-cyan-700 hover:bg-cyan-50";
  if (type === "agent") return "border-orange-500/30 bg-orange-50 text-orange-700 hover:bg-orange-50";
  if (type === "operation") return "border-indigo-500/30 bg-indigo-50 text-indigo-700 hover:bg-indigo-50";

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

function StatusBadge({ status, locale }: { status: CostCenterStatus; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getStatusClass(status))}
    >
      {statusLabel(status, locale)}
    </Badge>
  );
}

function TypeBadge({ type, locale }: { type: CostCenterType; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getTypeClass(type))}
    >
      {typeLabel(type, locale)}
    </Badge>
  );
}

function MoneyValue({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center justify-start gap-1 text-sm font-semibold tabular-nums">
      <span>{formatMoney(value)}</span>
      <img src="/currency/sar.svg" alt={label} className="h-3.5 w-3.5" />
    </div>
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

function PageSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
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

      <Card className="rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountingCostCentersPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [centers, setCenters] = React.useState<CostCenterRecord[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const [columns, setColumns] = React.useState<Record<ColumnKey, boolean>>(DEFAULT_COLUMNS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

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

  const loadCostCenters = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: "1",
          page_size: "500",
        });

        const endpoints = [
          "/api/accounting/cost-centers/",
          "/api/accounting/reports/cost-centers/",
          "/api/accounting/cost_centers/",
        ];

        let payload: ApiResponse | null = null;
        let lastError: unknown = null;

        for (const endpoint of endpoints) {
          try {
            payload = await fetchJson<ApiResponse>(
              makeApiUrl(endpoint, params),
              controller.signal,
            );
            break;
          } catch (caughtError) {
            lastError = caughtError;
          }
        }

        if (!payload) {
          throw lastError instanceof Error ? lastError : new Error(t.errorDesc);
        }

        const rows = extractArray(payload)
          .map(normalizeCostCenter)
          .filter((center) => center.id || center.name || center.code);

        setCenters(rows);

        if (silent) toast.success(t.refreshed);
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
    [t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadCostCenters();
  }, [loadCostCenters]);

  const summary = React.useMemo(() => {
    return {
      total: centers.length,
      active: centers.filter((center) => center.status === "active" || center.is_active).length,
      transactions: centers.reduce((sum, center) => sum + center.transactions_count, 0),
      debit: centers.reduce((sum, center) => sum + center.total_debit, 0),
      credit: centers.reduce((sum, center) => sum + center.total_credit, 0),
      balance: centers.reduce((sum, center) => sum + center.balance, 0),
    };
  }, [centers]);

  const filteredCenters = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let result = centers.filter((center) => {
      const matchesSearch =
        !query ||
        center.name.toLowerCase().includes(query) ||
        center.code.toLowerCase().includes(query) ||
        center.manager_name.toLowerCase().includes(query) ||
        center.parent_name.toLowerCase().includes(query) ||
        center.notes.toLowerCase().includes(query) ||
        center.type.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || center.status === statusFilter;
      const matchesType = typeFilter === "all" || center.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });

    result = [...result].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.created_at || "").localeCompare(String(b.created_at || ""));
      }

      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "code") return a.code.localeCompare(b.code);
      if (sortKey === "status") return a.status.localeCompare(b.status);
      if (sortKey === "balance_high") return b.balance - a.balance;
      if (sortKey === "debit_high") return b.total_debit - a.total_debit;
      if (sortKey === "credit_high") return b.total_credit - a.total_credit;
      if (sortKey === "transactions_high") return b.transactions_count - a.transactions_count;

      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

    return result;
  }, [centers, searchInput, sortKey, statusFilter, typeFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [pageSize, searchInput, sortKey, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCenters.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredCenters.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    sortKey !== "newest";

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSortKey("newest");
    setPage(1);
  }

  function columnLabel(key: ColumnKey) {
    if (key === "center") return t.center;
    if (key === "code") return t.code;
    if (key === "type") return t.type;
    if (key === "status") return t.status;
    if (key === "manager") return t.manager;
    if (key === "transactions") return t.transactions;
    if (key === "debit") return t.debit;
    if (key === "credit") return t.credit;
    if (key === "balance") return t.balance;
    return t.actions;
  }

  function buildExportRows() {
    return filteredCenters.map((center) => ({
      center: center.name || t.notAvailable,
      code: center.code || t.notAvailable,
      type: typeLabel(center.type, locale),
      status: statusLabel(center.status, locale),
      manager: center.manager_name || t.notAvailable,
      transactions: center.transactions_count,
      debit: formatMoney(center.total_debit),
      credit: formatMoney(center.total_credit),
      balance: formatMoney(center.balance),
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
          <h1>${escapeHtml(t.printTitle)}</h1>
          <p>${escapeHtml(t.totalCenters)}: ${escapeHtml(summary.total)}</p>
          <p>${escapeHtml(t.activeCenters)}: ${escapeHtml(summary.active)}</p>
          <p>${escapeHtml(t.totalTransactions)}: ${escapeHtml(summary.transactions)}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.center)}</th>
                <th>${escapeHtml(t.code)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.manager)}</th>
                <th>${escapeHtml(t.transactions)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.balance)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.center)}</td>
                      <td>${escapeHtml(row.code)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.manager)}</td>
                      <td>${escapeHtml(row.transactions)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.balance)}</td>
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
    link.download = `primey-care-cost-centers-${new Date().toISOString().slice(0, 10)}.xls`;
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
      toast.error(t.printEmpty);
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
              margin-bottom: 18px;
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
            <div class="box"><span>${escapeHtml(t.totalCenters)}</span><strong>${escapeHtml(summary.total)}</strong></div>
            <div class="box"><span>${escapeHtml(t.activeCenters)}</span><strong>${escapeHtml(summary.active)}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalTransactions)}</span><strong>${escapeHtml(summary.transactions)}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalBalance)}</span><strong>${escapeHtml(formatMoney(summary.balance))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.center)}</th>
                <th>${escapeHtml(t.code)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.manager)}</th>
                <th>${escapeHtml(t.transactions)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.balance)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.center)}</td>
                      <td>${escapeHtml(row.code)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.manager)}</td>
                      <td>${escapeHtml(row.transactions)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.balance)}</td>
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
        <PageSkeleton />
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
            <Link href="/system/accounting">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadCostCenters({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            {t.export}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <Button asChild className="h-9 rounded-lg bg-black text-white hover:bg-black/90">
            <Link href="/system/accounting/cost-centers/create">
              <Plus className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalCenters}
          value={formatInteger(summary.total)}
          trend={t.center}
          icon={FolderTree}
        />

        <KpiCard
          title={t.activeCenters}
          value={formatInteger(summary.active)}
          trend={t.active}
          icon={CheckCircle2}
        />

        <KpiCard
          title={t.totalTransactions}
          value={formatInteger(summary.transactions)}
          trend={t.transactions}
          icon={ShieldCheck}
        />

        <KpiCard
          title={t.totalBalance}
          value={<MoneyValue value={summary.balance} label={t.sar} />}
          trend={t.balance}
          icon={WalletCards}
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
              onClick={() => void loadCostCenters()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
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
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[165px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t.statusFilter}: {t.all}
                  </SelectItem>
                  <SelectItem value="active">{t.active}</SelectItem>
                  <SelectItem value="inactive">{t.inactive}</SelectItem>
                  <SelectItem value="draft">{t.draft}</SelectItem>
                  <SelectItem value="archived">{t.archived}</SelectItem>
                  <SelectItem value="unknown">{t.unknown}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as TypeFilter)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t.typeFilter}: {t.all}
                  </SelectItem>
                  <SelectItem value="department">{t.department}</SelectItem>
                  <SelectItem value="branch">{t.branch}</SelectItem>
                  <SelectItem value="project">{t.project}</SelectItem>
                  <SelectItem value="provider">{t.provider}</SelectItem>
                  <SelectItem value="agent">{t.agent}</SelectItem>
                  <SelectItem value="operation">{t.operation}</SelectItem>
                  <SelectItem value="other">{t.other}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[170px]">
                  <ArrowUpDown className="h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t.newest}</SelectItem>
                  <SelectItem value="oldest">{t.oldest}</SelectItem>
                  <SelectItem value="name">{t.nameSort}</SelectItem>
                  <SelectItem value="code">{t.codeSort}</SelectItem>
                  <SelectItem value="status">{t.statusSort}</SelectItem>
                  <SelectItem value="balance_high">{t.balanceHigh}</SelectItem>
                  <SelectItem value="debit_high">{t.debitHigh}</SelectItem>
                  <SelectItem value="credit_high">{t.creditHigh}</SelectItem>
                  <SelectItem value="transactions_high">{t.transactionsHigh}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value="columns"
                onValueChange={(value) => {
                  if (value in columns) {
                    setColumns((current) => ({
                      ...current,
                      [value]: !current[value as ColumnKey],
                    }));
                  }
                }}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[150px]">
                  <Settings2 className="h-4 w-4" />
                  <SelectValue placeholder={t.columns} />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(columns) as ColumnKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {columns[key] ? "✓ " : ""}
                      {columnLabel(key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                onClick={resetFilters}
              >
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[1260px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {columns.center ? (
                      <TableHead className="h-11 w-[230px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.center}
                      </TableHead>
                    ) : null}

                    {columns.code ? (
                      <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.code}
                      </TableHead>
                    ) : null}

                    {columns.type ? (
                      <TableHead className="h-11 w-[135px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.type}
                      </TableHead>
                    ) : null}

                    {columns.status ? (
                      <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.status}
                      </TableHead>
                    ) : null}

                    {columns.manager ? (
                      <TableHead className="h-11 w-[150px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.manager}
                      </TableHead>
                    ) : null}

                    {columns.transactions ? (
                      <TableHead className="h-11 w-[105px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.transactions}
                      </TableHead>
                    ) : null}

                    {columns.debit ? (
                      <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.debit}
                      </TableHead>
                    ) : null}

                    {columns.credit ? (
                      <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.credit}
                      </TableHead>
                    ) : null}

                    {columns.balance ? (
                      <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.balance}
                      </TableHead>
                    ) : null}

                    {columns.actions ? (
                      <TableHead className="h-11 w-[85px] whitespace-nowrap px-4 text-center text-xs font-semibold text-muted-foreground">
                        {t.actions}
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pageRows.length ? (
                    pageRows.map((center) => (
                      <TableRow key={center.id || center.code || center.name} className="h-[62px]">
                        {columns.center ? (
                          <TableCell className="h-[62px] w-[230px] overflow-hidden px-4 text-right align-middle">
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {center.name || t.notAvailable}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {center.parent_name || center.id || t.notAvailable}
                              </span>
                            </div>
                          </TableCell>
                        ) : null}

                        {columns.code ? (
                          <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm font-medium text-foreground tabular-nums">
                              {center.code || t.notAvailable}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.type ? (
                          <TableCell className="h-[62px] w-[135px] overflow-hidden px-4 text-right align-middle">
                            <TypeBadge type={center.type} locale={locale} />
                          </TableCell>
                        ) : null}

                        {columns.status ? (
                          <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-right align-middle">
                            <StatusBadge status={center.status} locale={locale} />
                          </TableCell>
                        ) : null}

                        {columns.manager ? (
                          <TableCell className="h-[62px] w-[150px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {center.manager_name || t.notAvailable}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.transactions ? (
                          <TableCell className="h-[62px] w-[105px] overflow-hidden px-4 text-right align-middle">
                            <span className="text-sm font-medium tabular-nums">
                              {formatInteger(center.transactions_count)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.debit ? (
                          <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={center.total_debit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.credit ? (
                          <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={center.total_credit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.balance ? (
                          <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={center.balance} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.actions ? (
                          <TableCell className="h-[62px] w-[85px] overflow-hidden px-4 text-center align-middle">
                            {center.id ? (
                              <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                                <Link
                                  href={`/system/accounting/cost-centers/${encodeURIComponent(center.id)}`}
                                  title={t.openDetails}
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={Math.max(1, visibleColumnCount)} className="h-72">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                            <Search className="h-6 w-6 text-muted-foreground" />
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
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              {t.showing}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(pageRows.length)}
              </span>{" "}
              {t.of}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(filteredCenters.length)}
              </span>{" "}
              {t.rows}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="h-9 w-[140px] rounded-lg bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {t.rowsPerPage}: {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {t.previous}
              </Button>

              <div className="flex h-9 items-center rounded-lg border bg-background px-3 text-sm font-medium text-foreground">
                {t.page}{" "}
                <span className="mx-1 tabular-nums">{formatInteger(currentPage)}</span>{" "}
                {t.of}{" "}
                <span className="mx-1 tabular-nums">{formatInteger(totalPages)}</span>
              </div>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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