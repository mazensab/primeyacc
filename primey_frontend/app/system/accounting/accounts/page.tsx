"use client";

/* ============================================================
   📂 app/system/accounting/accounts/page.tsx
   🧾 Primey Care — Chart of Accounts
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API only: /api/accounting/accounts/
   ✅ Header / KPI cards / search / filters / columns / table
   ✅ Tree expand/collapse support when parent_id exists
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
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FolderTree,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  WalletCards,
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
  DropdownMenuContent,
  DropdownMenuItem,
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

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense" | "unknown";
type AccountNature = "debit" | "credit" | "unknown";

type Account = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  name_en: string;
  account_type: AccountType;
  nature: AccountNature;
  parent_id: string;
  parent_code: string;
  level: number;
  is_group: boolean;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  children_count: number;
  created_at: string;
};

type Summary = {
  total: number;
  active: number;
  posting: number;
  group: number;
};

type ColumnKey =
  | "code"
  | "name"
  | "type"
  | "nature"
  | "level"
  | "kind"
  | "status"
  | "opening"
  | "balance"
  | "children"
  | "actions";

type SortKey = "code" | "name" | "level" | "balance_desc" | "balance_asc" | "created_desc";

const translations = {
  ar: {
    title: "دليل الحسابات",
    subtitle:
      "إدارة شجرة الحسابات المحاسبية، حسابات الترحيل، الحسابات التجميعية، والأرصدة.",
    back: "المحاسبة",
    create: "حساب جديد",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث بكود الحساب أو الاسم أو النوع أو الطبيعة...",
    all: "الكل",
    accountType: "نوع الحساب",
    accountStatus: "حالة الحساب",
    accountKind: "تصنيف الحساب",
    level: "المستوى",
    sort: "الترتيب",
    columns: "الأعمدة",
    openAll: "فتح الشجرة",
    closeAll: "طي الشجرة",

    totalAccounts: "إجمالي الحسابات",
    activeAccounts: "الحسابات النشطة",
    postingAccounts: "حسابات الترحيل",
    groupAccounts: "الحسابات التجميعية",

    code: "كود الحساب",
    name: "اسم الحساب",
    type: "النوع",
    nature: "الطبيعة",
    kind: "التصنيف",
    status: "الحالة",
    opening: "الرصيد الافتتاحي",
    balance: "الرصيد الحالي",
    openingBalance: "الرصيد الافتتاحي",
    currentBalance: "الرصيد الحالي",
    children: "الفروع",
    actions: "الإجراءات",
    open: "فتح",

    asset: "أصول",
    liability: "التزامات",
    equity: "حقوق ملكية",
    revenue: "إيرادات",
    expense: "مصروفات",

    debit: "مدين",
    credit: "دائن",
    active: "نشط",
    inactive: "غير نشط",
    posting: "ترحيل",
    group: "تجميعي",

    codeSort: "الكود",
    nameSort: "الاسم",
    levelSort: "المستوى",
    balanceHigh: "الأعلى رصيدًا",
    balanceLow: "الأقل رصيدًا",
    newest: "الأحدث",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noDataTitle: "لا توجد حسابات",
    noDataDesc: "ستظهر الحسابات هنا بعد إضافتها في النظام.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل دليل الحسابات",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث دليل الحسابات.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير دليل الحسابات",
    generatedAt: "تاريخ الطباعة",
    sar: "ر.س",
    unknown: "غير محدد",
  },
  en: {
    title: "Chart of Accounts",
    subtitle:
      "Manage the accounting tree, posting accounts, group accounts, and balances.",
    back: "Accounting",
    create: "New account",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    searchPlaceholder: "Search by account code, name, type, or nature...",
    all: "All",
    accountType: "Account type",
    accountStatus: "Account status",
    accountKind: "Account kind",
    level: "Level",
    sort: "Sort",
    columns: "Columns",
    openAll: "Expand tree",
    closeAll: "Collapse tree",

    totalAccounts: "Total accounts",
    activeAccounts: "Active accounts",
    postingAccounts: "Posting accounts",
    groupAccounts: "Group accounts",

    code: "Account code",
    name: "Account name",
    type: "Type",
    nature: "Nature",
    kind: "Kind",
    status: "Status",
    opening: "Opening balance",
    balance: "Current balance",
    openingBalance: "Opening balance",
    currentBalance: "Current balance",
    children: "Children",
    actions: "Actions",
    open: "Open",

    asset: "Assets",
    liability: "Liabilities",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expenses",

    debit: "Debit",
    credit: "Credit",
    active: "Active",
    inactive: "Inactive",
    posting: "Posting",
    group: "Group",

    codeSort: "Code",
    nameSort: "Name",
    levelSort: "Level",
    balanceHigh: "Highest balance",
    balanceLow: "Lowest balance",
    newest: "Newest",

    showing: "Showing",
    of: "of",
    rows: "rows",
    noDataTitle: "No accounts",
    noDataDesc: "Accounts will appear here after they are added.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load chart of accounts",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Chart of accounts refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Chart of accounts report",
    generatedAt: "Generated at",
    sar: "SAR",
    unknown: "Unknown",
  },
} as const;

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  code: true,
  name: true,
  type: true,
  nature: true,
  level: true,
  kind: true,
  status: true,
  opening: true,
  balance: true,
  children: true,
  actions: true,
};

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

    if (["1", "true", "yes", "on", "active", "posting", "group"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off", "inactive"].includes(normalized)) {
      return false;
    }
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

function getApiBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  return configured.replace(/\/+$/, "");
}

function apiUrl(path: string) {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!baseUrl) return normalizedPath;

  return `${baseUrl}${normalizedPath}`;
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function getAccountType(value: unknown): AccountType {
  const normalized = normalizeText(value).toLowerCase();

  if (["asset", "assets"].includes(normalized)) return "asset";
  if (["liability", "liabilities"].includes(normalized)) return "liability";
  if (["equity"].includes(normalized)) return "equity";
  if (["revenue", "income"].includes(normalized)) return "revenue";
  if (["expense", "expenses"].includes(normalized)) return "expense";

  return "unknown";
}

function getNature(value: unknown): AccountNature {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "debit") return "debit";
  if (normalized === "credit") return "credit";

  return "unknown";
}

function getAccountId(raw: ApiRecord) {
  return normalizeText(raw.id || raw.pk || raw.account_id || raw.uuid);
}

function normalizeAccount(rawValue: unknown): Account | null {
  const raw = asRecord(rawValue);
  const id = getAccountId(raw);

  if (!id) return null;

  const parentRaw = asRecord(raw.parent || raw.parent_account);

  const parentId = normalizeText(
    raw.parent_id ||
      raw.parent ||
      raw.parent_account_id ||
      parentRaw.id ||
      parentRaw.pk,
  );

  const accountType = getAccountType(raw.account_type || raw.type || raw.category);
  const nature = getNature(raw.nature || raw.normal_balance || raw.balance_type);

  return {
    id,
    code: normalizeText(raw.code || raw.account_code || raw.number, id),
    name: normalizeText(raw.name || raw.title || raw.name_ar || raw.name_en, id),
    name_ar: normalizeText(raw.name_ar || raw.arabic_name || raw.name || raw.title, id),
    name_en: normalizeText(raw.name_en || raw.english_name || raw.name || raw.title, id),
    account_type: accountType,
    nature,
    parent_id: parentId,
    parent_code: normalizeText(parentRaw.code || raw.parent_code || raw.parent_account_code),
    level: Math.max(0, toNumber(raw.level || raw.depth, parentId ? 1 : 0)),
    is_group: toBoolean(raw.is_group ?? raw.group ?? raw.is_parent, false),
    is_active: toBoolean(raw.is_active ?? raw.active, true),
    opening_balance: toNumber(raw.opening_balance || raw.initial_balance),
    current_balance: toNumber(
      raw.current_balance ||
        raw.balance ||
        raw.closing_balance ||
        raw.net_balance,
    ),
    children_count: toNumber(raw.children_count || raw.child_count || raw.children_total),
    created_at: normalizeText(raw.created_at || raw.created || raw.inserted_at),
  };
}

function normalizeAccounts(payload: unknown): Account[] {
  const root = asRecord(payload);
  const data = root.data;
  const results = root.results;
  const accounts = root.accounts;

  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(results)
      ? results
      : Array.isArray(data)
        ? data
        : Array.isArray(accounts)
          ? accounts
          : isRecord(data) && Array.isArray(data.results)
            ? data.results
            : isRecord(data) && Array.isArray(data.accounts)
              ? data.accounts
              : [];

  return source
    .map(normalizeAccount)
    .filter((account): account is Account => Boolean(account));
}

function extractError(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback;

  const direct =
    normalizeText(payload.message) ||
    normalizeText(payload.detail) ||
    normalizeText(payload.error);

  if (direct) return direct;

  const errors = payload.errors;

  if (typeof errors === "string") return errors;

  if (Array.isArray(errors)) {
    return errors.map((item) => normalizeText(item)).filter(Boolean).join(" ") || fallback;
  }

  if (isRecord(errors)) {
    const first = Object.values(errors)[0];

    if (Array.isArray(first)) return first.map((item) => normalizeText(item)).filter(Boolean).join(" ");
    if (typeof first === "string") return first;
  }

  return fallback;
}

function accountName(account: Account, locale: Locale) {
  if (locale === "ar") return account.name_ar || account.name || account.name_en || account.code;
  return account.name_en || account.name || account.name_ar || account.code;
}

function accountTypeLabel(type: AccountType, locale: Locale) {
  const t = translations[locale];

  if (type === "unknown") return t.unknown;

  return t[type];
}

function natureLabel(nature: AccountNature, locale: Locale) {
  const t = translations[locale];

  if (nature === "unknown") return t.unknown;

  return t[nature];
}

function accountDepth(account: Account, accountMap: Map<string, Account>) {
  if (account.level > 0) return account.level;

  let depth = 0;
  let currentParentId = account.parent_id;
  const visited = new Set<string>();

  while (currentParentId && !visited.has(currentParentId)) {
    visited.add(currentParentId);
    const parent = accountMap.get(currentParentId);

    if (!parent) break;

    depth += 1;
    currentParentId = parent.parent_id;
  }

  return depth;
}

function buildTreeRows(accounts: Account[], expanded: Set<string>) {
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const childrenByParent = new Map<string, Account[]>();

  accounts.forEach((account) => {
    const parentKey = account.parent_id || "__root__";
    const list = childrenByParent.get(parentKey) || [];

    list.push(account);
    childrenByParent.set(parentKey, list);
  });

  childrenByParent.forEach((list) => {
    list.sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
  });

  const rows: Array<Account & { depth: number; hasChildren: boolean }> = [];

  const walk = (parentId: string, depth: number) => {
    const list = childrenByParent.get(parentId) || [];

    list.forEach((account) => {
      const children = childrenByParent.get(account.id) || [];
      const hasChildren = children.length > 0 || account.children_count > 0;

      rows.push({
        ...account,
        depth: Math.max(depth, accountDepth(account, accountMap)),
        hasChildren,
      });

      if (hasChildren && expanded.has(account.id)) {
        walk(account.id, depth + 1);
      }
    });
  };

  walk("__root__", 0);

  const orphanAccounts = accounts.filter((account) => {
    if (!account.parent_id) return false;
    return !accountMap.has(account.parent_id);
  });

  orphanAccounts.forEach((account) => {
    if (!rows.some((row) => row.id === account.id)) {
      rows.push({
        ...account,
        depth: account.level || 0,
        hasChildren: false,
      });
    }
  });

  return rows;
}

function sortAccounts(accounts: Account[], sort: SortKey, locale: Locale) {
  const copy = [...accounts];

  copy.sort((a, b) => {
    if (sort === "name") {
      return accountName(a, locale).localeCompare(accountName(b, locale), locale);
    }

    if (sort === "level") {
      return a.level - b.level || a.code.localeCompare(b.code, "en", { numeric: true });
    }

    if (sort === "balance_desc") {
      return b.current_balance - a.current_balance;
    }

    if (sort === "balance_asc") {
      return a.current_balance - b.current_balance;
    }

    if (sort === "created_desc") {
      return (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0);
    }

    return a.code.localeCompare(b.code, "en", { numeric: true });
  });

  return copy;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildSummary(accounts: Account[]): Summary {
  return {
    total: accounts.length,
    active: accounts.filter((account) => account.is_active).length,
    posting: accounts.filter((account) => !account.is_group).length,
    group: accounts.filter((account) => account.is_group).length,
  };
}

function PageSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
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
          <Skeleton key={index} className="h-24 rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-[620px] rounded-lg" />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{formatInteger(value)}</div>
        </div>

        <div className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

function BadgePill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "purple";
}) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "purple"
            ? "border-purple-200 bg-purple-50 text-purple-700"
            : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <Badge variant="outline" className={className}>
      {children}
    </Badge>
  );
}

export default function AccountingAccountsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<AccountType | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [kindFilter, setKindFilter] = React.useState<"all" | "group" | "posting">("all");
  const [levelFilter, setLevelFilter] = React.useState<"all" | "root" | "child">("all");
  const [sort, setSort] = React.useState<SortKey>("code");
  const [columns, setColumns] = React.useState<Record<ColumnKey, boolean>>(DEFAULT_COLUMNS);

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

  const loadAccounts = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setLoading(true);
      setRefreshing(true);
      setError("");

      try {
        const response = await fetch(apiUrl("/api/accounting/accounts/"), {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        let payload: unknown = null;

        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          throw new Error(extractError(payload, t.errorDesc));
        }

        const normalized = normalizeAccounts(payload);
        setAccounts(normalized);

        const rootGroupIds = normalized
          .filter((account) => !account.parent_id && (account.is_group || account.children_count > 0))
          .map((account) => account.id);

        setExpanded(new Set(rootGroupIds));

        if (silent) toast.success(t.refreshed);
      } catch (requestError) {
        const message =
          requestError instanceof Error && requestError.message
            ? requestError.message
            : t.errorDesc;

        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const summary = React.useMemo(() => buildSummary(accounts), [accounts]);

  const filteredAccounts = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const name = accountName(account, locale).toLowerCase();
      const haystack = [
        account.code,
        name,
        account.name_ar,
        account.name_en,
        accountTypeLabel(account.account_type, locale),
        natureLabel(account.nature, locale),
      ]
        .join(" ")
        .toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (typeFilter !== "all" && account.account_type !== typeFilter) return false;
      if (statusFilter === "active" && !account.is_active) return false;
      if (statusFilter === "inactive" && account.is_active) return false;
      if (kindFilter === "group" && !account.is_group) return false;
      if (kindFilter === "posting" && account.is_group) return false;

      const isRoot = !account.parent_id && account.level === 0;

      if (levelFilter === "root" && !isRoot) return false;
      if (levelFilter === "child" && isRoot) return false;

      return true;
    });
  }, [accounts, kindFilter, levelFilter, locale, search, statusFilter, typeFilter]);

  const visibleAccounts = React.useMemo(() => {
    const sorted = sortAccounts(filteredAccounts, sort, locale);

    if (sort !== "code") return sorted;

    return buildTreeRows(sorted, expanded);
  }, [expanded, filteredAccounts, locale, sort]);

  const toggleExpanded = React.useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }, []);

  const resetFilters = React.useCallback(() => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setKindFilter("all");
    setLevelFilter("all");
    setSort("code");
    setColumns(DEFAULT_COLUMNS);
  }, []);

  const expandAll = React.useCallback(() => {
    const expandableIds = accounts
      .filter((account) => account.is_group || account.children_count > 0)
      .map((account) => account.id);

    setExpanded(new Set(expandableIds));
  }, [accounts]);

  const collapseAll = React.useCallback(() => {
    setExpanded(new Set());
  }, []);

  const exportExcel = React.useCallback(() => {
    if (!visibleAccounts.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const rows = visibleAccounts.map((account) => ({
      [t.code]: account.code,
      [t.name]: accountName(account, locale),
      [t.accountType]: accountTypeLabel(account.account_type, locale),
      [t.nature]: natureLabel(account.nature, locale),
      [t.level]: account.level,
      [t.accountKind]: account.is_group ? t.group : t.posting,
      [t.accountStatus]: account.is_active ? t.active : t.inactive,
      [t.openingBalance]: account.opening_balance,
      [t.currentBalance]: account.current_balance,
      [t.children]: account.children_count,
    }));

    const headers = Object.keys(rows[0] || {});
    const htmlRows = rows
      .map(
        (row) =>
          `<tr>${headers
            .map((header) => `<td>${escapeHtml(String(row[header as keyof typeof row] ?? ""))}</td>`)
            .join("")}</tr>`,
      )
      .join("");

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
            <tbody>${htmlRows}</tbody>
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
    link.download = `primey-care-chart-of-accounts-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }, [locale, t, visibleAccounts]);

  const printTable = React.useCallback(() => {
    if (!visibleAccounts.length) {
      toast.error(t.printEmpty);
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.printEmpty);
      return;
    }

    const direction = locale === "ar" ? "rtl" : "ltr";

    const rows = visibleAccounts
      .map(
        (account) => `
          <tr>
            <td>${escapeHtml(account.code)}</td>
            <td>${escapeHtml(accountName(account, locale))}</td>
            <td>${escapeHtml(accountTypeLabel(account.account_type, locale))}</td>
            <td>${escapeHtml(natureLabel(account.nature, locale))}</td>
            <td>${escapeHtml(String(account.level))}</td>
            <td>${escapeHtml(account.is_group ? t.group : t.posting)}</td>
            <td>${escapeHtml(account.is_active ? t.active : t.inactive)}</td>
            <td>${escapeHtml(formatMoney(account.opening_balance))}</td>
            <td>${escapeHtml(formatMoney(account.current_balance))}</td>
            <td>${escapeHtml(String(account.children_count))}</td>
          </tr>
        `,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html dir="${direction}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)}</title>
          <style>
            body {
              font-family: Arial, Tahoma, sans-serif;
              margin: 24px;
              color: #111827;
            }

            h1 {
              margin: 0 0 8px;
              font-size: 22px;
            }

            .meta {
              color: #6b7280;
              margin-bottom: 20px;
              font-size: 12px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th,
            td {
              border: 1px solid #e5e7eb;
              padding: 8px;
              text-align: start;
            }

            th {
              background: #f9fafb;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.printTitle)}</h1>
          <div class="meta">${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString("en-US"))}</div>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.code)}</th>
                <th>${escapeHtml(t.name)}</th>
                <th>${escapeHtml(t.accountType)}</th>
                <th>${escapeHtml(t.nature)}</th>
                <th>${escapeHtml(t.level)}</th>
                <th>${escapeHtml(t.accountKind)}</th>
                <th>${escapeHtml(t.accountStatus)}</th>
                <th>${escapeHtml(t.openingBalance)}</th>
                <th>${escapeHtml(t.currentBalance)}</th>
                <th>${escapeHtml(t.children)}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
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
  }, [locale, t, visibleAccounts]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/system/accounting" className="hover:text-foreground">
              {t.back}
            </Link>
            <span>/</span>
            <span className="text-foreground">{t.title}</span>
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/system/accounting">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={() => void loadAccounts({ silent: true })}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {t.refresh}
          </Button>

          <Button variant="outline" onClick={exportExcel}>
            <Download className="h-4 w-4" />
            {t.export}
          </Button>

          <Button variant="outline" onClick={printTable}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <Button className="bg-foreground text-background hover:bg-foreground/90" asChild>
            <Link href="/system/accounting/accounts/create">
              <Plus className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50/60 shadow-none">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-100 p-2 text-red-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-red-900">{t.errorTitle}</h2>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>

            <Button variant="outline" className="bg-background" onClick={() => void loadAccounts()}>
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t.totalAccounts}
          value={summary.total}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          title={t.activeAccounts}
          value={summary.active}
          icon={<WalletCards className="h-5 w-5" />}
        />
        <StatCard
          title={t.postingAccounts}
          value={summary.posting}
          icon={<FileSpreadsheet className="h-5 w-5" />}
        />
        <StatCard
          title={t.groupAccounts}
          value={summary.group}
          icon={<FolderTree className="h-5 w-5" />}
        />
      </div>

      <Card className="rounded-lg border bg-card shadow-none">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{t.title}</CardTitle>
              <CardDescription>{t.subtitle}</CardDescription>
            </div>

            <CardAction className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={expandAll}>
                <ChevronDown className="h-4 w-4" />
                {t.openAll}
              </Button>

              <Button type="button" variant="outline" onClick={collapseAll}>
                <ChevronRight className="h-4 w-4" />
                {t.closeAll}
              </Button>
            </CardAction>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="ps-9"
            />
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as AccountType | "all")}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder={t.accountType} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="asset">{t.asset}</SelectItem>
                  <SelectItem value="liability">{t.liability}</SelectItem>
                  <SelectItem value="equity">{t.equity}</SelectItem>
                  <SelectItem value="revenue">{t.revenue}</SelectItem>
                  <SelectItem value="expense">{t.expense}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t.accountStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="active">{t.active}</SelectItem>
                  <SelectItem value="inactive">{t.inactive}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as "all" | "group" | "posting")}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder={t.accountKind} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="group">{t.group}</SelectItem>
                  <SelectItem value="posting">{t.posting}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as "all" | "root" | "child")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t.level} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="root">{locale === "ar" ? "رئيسي" : "Root"}</SelectItem>
                  <SelectItem value="child">{locale === "ar" ? "فرعي" : "Child"}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder={t.sort} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">{t.codeSort}</SelectItem>
                  <SelectItem value="name">{t.nameSort}</SelectItem>
                  <SelectItem value="level">{t.levelSort}</SelectItem>
                  <SelectItem value="balance_desc">{t.balanceHigh}</SelectItem>
                  <SelectItem value="balance_asc">{t.balanceLow}</SelectItem>
                  <SelectItem value="created_desc">{t.newest}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select
                value=""
                onValueChange={(value) => {
                  if (value in columns) {
                    setColumns((current) => ({
                      ...current,
                      [value]: !current[value as ColumnKey],
                    }));
                  }
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SlidersHorizontal className="h-4 w-4" />
                  <SelectValue placeholder={t.columns} />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(columns) as ColumnKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {columns[key] ? "✓ " : ""}{t[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" type="button" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[1120px]">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40">
                    <TableHead className="w-12">
                      <Checkbox checked={false} disabled />
                    </TableHead>
                    {columns.code ? <TableHead>{t.code}</TableHead> : null}
                    {columns.name ? <TableHead>{t.name}</TableHead> : null}
                    {columns.type ? <TableHead>{t.type}</TableHead> : null}
                    {columns.nature ? <TableHead>{t.nature}</TableHead> : null}
                    {columns.level ? <TableHead>{t.level}</TableHead> : null}
                    {columns.kind ? <TableHead>{t.kind}</TableHead> : null}
                    {columns.status ? <TableHead>{t.status}</TableHead> : null}
                    {columns.opening ? <TableHead className="text-end">{t.openingBalance}</TableHead> : null}
                    {columns.balance ? <TableHead className="text-end">{t.currentBalance}</TableHead> : null}
                    {columns.children ? <TableHead>{t.children}</TableHead> : null}
                    {columns.actions ? <TableHead className="w-16 text-end">{t.actions}</TableHead> : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {visibleAccounts.length ? (
                    visibleAccounts.map((account) => {
                      const hasChildren = "hasChildren" in account ? Boolean(account.hasChildren) : account.children_count > 0;
                      const depth = "depth" in account ? Number(account.depth) : account.level;
                      const isExpanded = expanded.has(account.id);

                      return (
                        <TableRow key={account.id} className="h-[62px]">
                          <TableCell>
                            <Checkbox checked={false} disabled />
                          </TableCell>

                          {columns.code ? (
                            <TableCell>
                              <div className="flex items-center gap-1" style={{ paddingInlineStart: depth * 18 }}>
                                {hasChildren ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpanded(account.id)}
                                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="h-6 w-6" />
                                )}
                                <span className="font-mono text-sm font-semibold">{account.code}</span>
                              </div>
                            </TableCell>
                          ) : null}

                          {columns.name ? (
                            <TableCell>
                              <div className="font-medium">{accountName(account, locale)}</div>
                              <div className="text-xs text-muted-foreground" dir="ltr">
                                {locale === "ar" ? account.name_en : account.name_ar}
                              </div>
                            </TableCell>
                          ) : null}

                          {columns.type ? (
                            <TableCell>
                              <BadgePill tone="purple">{accountTypeLabel(account.account_type, locale)}</BadgePill>
                            </TableCell>
                          ) : null}

                          {columns.nature ? (
                            <TableCell>
                              <BadgePill>{natureLabel(account.nature, locale)}</BadgePill>
                            </TableCell>
                          ) : null}

                          {columns.level ? (
                            <TableCell>
                              <span className="tabular-nums">{formatInteger(depth)}</span>
                            </TableCell>
                          ) : null}

                          {columns.kind ? (
                            <TableCell>
                              <BadgePill tone={account.is_group ? "warning" : "success"}>
                                {account.is_group ? t.group : t.posting}
                              </BadgePill>
                            </TableCell>
                          ) : null}

                          {columns.status ? (
                            <TableCell>
                              <BadgePill tone={account.is_active ? "success" : "danger"}>
                                {account.is_active ? t.active : t.inactive}
                              </BadgePill>
                            </TableCell>
                          ) : null}

                          {columns.opening ? (
                            <TableCell className="text-end tabular-nums">
                              {formatMoney(account.opening_balance)} {t.sar}
                            </TableCell>
                          ) : null}

                          {columns.balance ? (
                            <TableCell className="text-end tabular-nums">
                              {formatMoney(account.current_balance)} {t.sar}
                            </TableCell>
                          ) : null}

                          {columns.children ? (
                            <TableCell>
                              <span className="tabular-nums">{formatInteger(account.children_count)}</span>
                            </TableCell>
                          ) : null}

                          {columns.actions ? (
                            <TableCell className="text-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={locale === "ar" ? "start" : "end"}>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/system/accounting/accounts/${encodeURIComponent(account.id)}`}>
                                      <BookOpen className="h-4 w-4" />
                                      {t.open}
                                    </Link>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="rounded-full bg-muted p-4">
                            <BookOpen className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h3 className="mt-4 font-semibold">
                            {accounts.length ? t.noResultsTitle : t.noDataTitle}
                          </h3>
                          <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            {accounts.length ? t.noResultsDesc : t.noDataDesc}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {t.showing}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(visibleAccounts.length)}
            </span>{" "}
            {t.of}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(accounts.length)}
            </span>{" "}
            {t.rows}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}