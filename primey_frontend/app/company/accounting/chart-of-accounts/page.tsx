"use client";

/* ============================================================
   📂 primey_frontend/app/company/accounting/chart-of-accounts/page.tsx
   🧠 PrimeyAcc — Company Chart of Accounts
   ------------------------------------------------------------
   ✅ Approved Premium company/system page pattern
   ✅ Real API only, no fake demo data
   ✅ Company scoped API
   ✅ Operational page: create / edit / activate / deactivate
   ✅ No delete action
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost hardcoding except safe dev fallback
============================================================ */

import * as React from "react";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  FolderTree,
  Layers3,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  TriangleAlert,
  WalletCards,
  X,
  ExternalLink,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
type SortKey = "code" | "name" | "type" | "balance_high" | "balance_low";
type StatusFilter = "all" | "active" | "inactive";
type AccountTypeFilter = "all" | "asset" | "liability" | "equity" | "revenue" | "expense";

type AccountRecord = {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  type: AccountTypeFilter;
  typeLabel: string;
  parentId: string;
  parentName: string;
  level: number;
  balance: number;
  isActive: boolean;
  isSystem: boolean;
  notes: string;
};

type AccountFormState = {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  type: AccountTypeFilter;
  parentId: string;
  openingBalance: string;
  isActive: boolean;
  notes: string;
};

type DataColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};


type AccountHrefRecord = {
  id?: string | number;
  account_id?: string | number;
  accountId?: string | number;
};
function accountDetailHref(row: AccountHrefRecord) {
  const id = row.id ?? row.account_id ?? row.accountId ?? "";
  return `/company/accounting/chart-of-accounts/${encodeURIComponent(String(id))}`;
}

const API_PATH = "/api/company/accounting/accounts/";

const emptyForm: AccountFormState = {
  id: "",
  code: "",
  name: "",
  nameAr: "",
  nameEn: "",
  type: "asset",
  parentId: "",
  openingBalance: "0",
  isActive: true,
  notes: "",
};

const translations = {
  ar: {
    moduleBadge: "الحسابات العامة",
    title: "دليل الحسابات",
    subtitle:
      "إدارة شجرة الحسابات الرئيسية والفرعية للشركة وربطها بالقيود والتقارير المالية.",
    back: "لوحة الحسابات",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    add: "إضافة حساب",
    edit: "تعديل حساب",
    save: "حفظ",
    saving: "جاري الحفظ...",
    cancel: "إلغاء",
    activate: "تفعيل",
    deactivate: "تعطيل",
    search: "بحث",
    reset: "إعادة ضبط",
    all: "الكل",
    status: "الحالة",
    type: "النوع",
    sort: "الترتيب",
    code: "الكود",
    accountName: "اسم الحساب",
    parent: "الحساب الأب",
    level: "المستوى",
    balance: "الرصيد",
    actions: "الإجراءات",
    notes: "ملاحظات",
    noParent: "بدون حساب أب",
    active: "نشط",
    inactive: "غير نشط",
    system: "نظامي",
    manual: "يدوي",
    asset: "أصل",
    liability: "خصم",
    equity: "حقوق ملكية",
    revenue: "إيراد",
    expense: "مصروف",
    assets: "الأصول",
    liabilities: "الخصوم",
    equities: "حقوق الملكية",
    revenues: "الإيرادات",
    expenses: "المصروفات",
    totalAccounts: "إجمالي الحسابات",
    activeAccounts: "الحسابات النشطة",
    inactiveAccounts: "الحسابات المعطلة",
    childAccounts: "حسابات فرعية",
    operationalHintTitle: "صفحة تشغيلية",
    operationalHintDesc:
      "هذه الصفحة مخصصة لإضافة وتعديل حسابات الشركة. لا يتم حذف الحسابات لحماية القيود والحركات السابقة.",
    searchPlaceholder: "ابحث بالكود أو اسم الحساب أو النوع...",
    namePlaceholder: "مثال: البنك الأهلي",
    codePlaceholder: "مثال: 1010",
    parentPlaceholder: "اختر الحساب الأب",
    openingBalance: "الرصيد الافتتاحي",
    nameAr: "الاسم العربي",
    nameEn: "الاسم الإنجليزي",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    sar: "ر.س",
    newest: "الكود",
    nameSort: "الاسم",
    typeSort: "النوع",
    balanceHigh: "أعلى رصيد",
    balanceLow: "أقل رصيد",
    noDataTitle: "لا توجد حسابات",
    noDataDesc: "ابدأ بإضافة أول حساب في دليل الحسابات.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غير البحث أو الفلاتر لعرض حسابات أخرى.",
    errorTitle: "تعذر تحميل دليل الحسابات",
    errorDesc: "تأكد من تسجيل الدخول للشركة ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    created: "تم إنشاء الحساب بنجاح.",
    updated: "تم تحديث الحساب بنجاح.",
    statusUpdated: "تم تحديث حالة الحساب.",
    validationRequired: "أدخل كود الحساب واسمه ونوعه.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    generatedAt: "تم الإنشاء في",
    apiUnsupported:
      "تعذر تنفيذ العملية من الواجهة الحالية. قد يحتاج الباكند لدعم POST/PATCH لهذا المسار.",
  },
  en: {
    moduleBadge: "General Accounting",
    title: "Chart of Accounts",
    subtitle:
      "Manage company parent and child accounts and connect them to journals and financial reports.",
    back: "Accounting dashboard",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    add: "Add account",
    edit: "Edit account",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    activate: "Activate",
    deactivate: "Deactivate",
    search: "Search",
    reset: "Reset",
    all: "All",
    status: "Status",
    type: "Type",
    sort: "Sort",
    code: "Code",
    accountName: "Account name",
    parent: "Parent account",
    level: "Level",
    balance: "Balance",
    actions: "Actions",
    notes: "Notes",
    noParent: "No parent",
    active: "Active",
    inactive: "Inactive",
    system: "System",
    manual: "Manual",
    asset: "Asset",
    liability: "Liability",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expense",
    assets: "Assets",
    liabilities: "Liabilities",
    equities: "Equity",
    revenues: "Revenue",
    expenses: "Expenses",
    totalAccounts: "Total accounts",
    activeAccounts: "Active accounts",
    inactiveAccounts: "Inactive accounts",
    childAccounts: "Child accounts",
    operationalHintTitle: "Operational page",
    operationalHintDesc:
      "This page is used to create and update company accounts. Accounts are not deleted to protect historical journals.",
    searchPlaceholder: "Search by code, name, or type...",
    namePlaceholder: "Example: National Bank",
    codePlaceholder: "Example: 1010",
    parentPlaceholder: "Select parent account",
    openingBalance: "Opening balance",
    nameAr: "Arabic name",
    nameEn: "English name",
    showing: "Showing",
    of: "of",
    rows: "rows",
    sar: "SAR",
    newest: "Code",
    nameSort: "Name",
    typeSort: "Type",
    balanceHigh: "Highest balance",
    balanceLow: "Lowest balance",
    noDataTitle: "No accounts",
    noDataDesc: "Start by creating the first account in the chart of accounts.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other accounts.",
    errorTitle: "Could not load chart of accounts",
    errorDesc: "Make sure you are signed in to the company and the backend is running, then try again.",
    tryAgain: "Try again",
    created: "Account created successfully.",
    updated: "Account updated successfully.",
    statusUpdated: "Account status updated.",
    validationRequired: "Enter account code, name, and type.",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    generatedAt: "Generated at",
    apiUnsupported:
      "The operation could not be completed from this page. The backend may need POST/PATCH support for this route.",
  },
} as const;

const accountTypes: AccountTypeFilter[] = ["asset", "liability", "equity", "revenue", "expense"];
const statusFilters: StatusFilter[] = ["all", "active", "inactive"];

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
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "active", "enabled"].includes(normalized)) return true;
    if (["false", "0", "no", "inactive", "disabled"].includes(normalized)) return false;
  }
  return fallback;
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(toNumber(value)),
  );
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatReportDateTime(value = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(value)
    .replace(",", "");
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
  const fallbackBase = "http://127.0.0.1:8000";
  const envBase =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "")
      : "";

  if (!envBase) return fallbackBase;
  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}

function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1] || "";
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": decodeURIComponent(csrfToken) } : {}),
      ...(init?.headers || {}),
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
    const message =
      normalizeText(record.message) ||
      normalizeText(record.detail) ||
      normalizeText(record.error) ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (payload || {}) as T;
}

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const record = asRecord(payload);
  const data = record.data;
  const meta = record.meta;

  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.rows)) return record.rows;
  if (Array.isArray(record.accounts)) return record.accounts;
  if (Array.isArray(data)) return data;

  const dataRecord = asRecord(data);
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.records)) return dataRecord.records;
  if (Array.isArray(dataRecord.rows)) return dataRecord.rows;
  if (Array.isArray(dataRecord.accounts)) return dataRecord.accounts;

  const metaRecord = asRecord(meta);
  if (Array.isArray(metaRecord.results)) return metaRecord.results;

  return [];
}

function normalizeType(value: unknown): AccountTypeFilter {
  const normalized = normalizeText(value, "asset").toLowerCase();

  if (["asset", "assets", "اصل", "أصل", "الأصول"].includes(normalized)) return "asset";
  if (["liability", "liabilities", "خصم", "الخصوم"].includes(normalized)) return "liability";
  if (["equity", "حقوق ملكية", "حقوق الملكية"].includes(normalized)) return "equity";
  if (["revenue", "income", "إيراد", "الايرادات", "الإيرادات"].includes(normalized)) return "revenue";
  if (["expense", "expenses", "مصروف", "المصروفات"].includes(normalized)) return "expense";

  return "asset";
}

function typeLabel(type: AccountTypeFilter, locale: Locale) {
  const t = translations[locale];
  if (type === "asset") return t.asset;
  if (type === "liability") return t.liability;
  if (type === "equity") return t.equity;
  if (type === "revenue") return t.revenue;
  return t.expense;
}

function normalizeAccount(value: unknown, locale: Locale): AccountRecord {
  const record = asRecord(value);
  const id = normalizeText(record.id ?? record.uuid ?? record.pk);
  const code = normalizeText(record.code ?? record.account_code ?? record.number ?? record.account_number, "—");

  const nameAr = normalizeText(record.name_ar ?? record.arabic_name ?? record.name);
  const nameEn = normalizeText(record.name_en ?? record.english_name ?? record.name);
  const name = locale === "ar" ? nameAr || nameEn : nameEn || nameAr;

  const type = normalizeType(record.account_type ?? record.type ?? record.category);
  const parent = asRecord(record.parent);
  const parentId = normalizeText(record.parent_id ?? parent.id ?? record.parent);
  const parentName = normalizeText(parent.name_ar ?? parent.name ?? record.parent_name, "");

  return {
    id: id || code,
    code,
    name: name || "—",
    nameAr,
    nameEn,
    type,
    typeLabel: typeLabel(type, locale),
    parentId,
    parentName,
    level: toNumber(record.level ?? record.depth, parentId ? 2 : 1),
    balance: toNumber(record.balance ?? record.current_balance ?? record.opening_balance ?? record.amount, 0),
    isActive: toBoolean(record.is_active ?? record.active ?? record.enabled, true),
    isSystem: toBoolean(record.is_system ?? record.system ?? record.is_locked, false),
    notes: normalizeText(record.notes ?? record.description ?? record.memo),
  };
}

function filterRows(
  rows: AccountRecord[],
  search: string,
  status: StatusFilter,
  type: AccountTypeFilter,
) {
  const query = search.trim().toLowerCase();

  return rows.filter((row) => {
    const matchesSearch =
      !query ||
      [row.code, row.name, row.nameAr, row.nameEn, row.typeLabel, row.parentName, row.notes].some((value) =>
        value.toLowerCase().includes(query),
      );

    const matchesStatus =
      status === "all" ||
      (status === "active" && row.isActive) ||
      (status === "inactive" && !row.isActive);

    const matchesType = type === "all" || row.type === type;

    return matchesSearch && matchesStatus && matchesType;
  });
}

function sortRows(rows: AccountRecord[], sort: SortKey) {
  return [...rows].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "type") return a.type.localeCompare(b.type) || a.code.localeCompare(b.code);
    if (sort === "balance_high") return b.balance - a.balance;
    if (sort === "balance_low") return a.balance - b.balance;
    return a.code.localeCompare(b.code, undefined, { numeric: true });
  });
}

function getDigits(value: string) {
  return value.replace(/\D/g, "");
}

function compareAccountCodes(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function getDefaultParentIdForType(
  accounts: AccountRecord[],
  type: AccountTypeFilter,
  currentId = "",
) {
  if (type === "all") return "";

  const candidates = accounts
    .filter((account) => account.id !== currentId && account.type === type && account.isActive)
    .sort((a, b) => compareAccountCodes(a.code, b.code));

  const root = candidates.find((account) => !account.parentId && account.level <= 1);
  return (root || candidates[0])?.id || "";
}

function suggestAccountCode(
  accounts: AccountRecord[],
  parentId: string,
  type: AccountTypeFilter,
  currentId = "",
) {
  const cleanAccounts = accounts.filter((account) => account.id !== currentId && account.code !== "—");
  const parent = cleanAccounts.find((account) => account.id === parentId);
  const parentCode = getDigits(parent?.code || "");

  if (parent && parentCode) {
    const directChildren = cleanAccounts
      .filter((account) => account.parentId === parentId)
      .map((account) => getDigits(account.code))
      .filter((code) => code.startsWith(parentCode) && code.length > parentCode.length);

    if (directChildren.length) {
      const widestCode = [...directChildren].sort((a, b) => b.length - a.length)[0];
      const nextNumber = Math.max(...directChildren.map((code) => Number(code))) + 1;
      return String(nextNumber).padStart(widestCode.length, "0");
    }

    return `${parentCode}${parentCode.length <= 1 ? "1" : "01"}`;
  }

  const baseByType: Record<AccountTypeFilter, string> = {
    all: "",
    asset: "1",
    liability: "2",
    equity: "3",
    revenue: "4",
    expense: "5",
  };

  const baseCode = baseByType[type] || "";
  const rootExists = cleanAccounts.some((account) => !account.parentId && getDigits(account.code) === baseCode);
  return rootExists ? "" : baseCode;
}

function getAccountPath(accounts: AccountRecord[], parentId: string, locale: Locale) {
  const selectedParent = accounts.find((account) => account.id === parentId);

  if (!selectedParent) {
    return locale === "ar" ? "اختر الحساب الأب لتوليد الكود" : "Select a parent account to generate the code";
  }

  return `${selectedParent.code} — ${selectedParent.name}`;
}

function buildCreateFormForType(accounts: AccountRecord[], type: AccountTypeFilter = "asset"): AccountFormState {
  return {
    ...emptyForm,
    type,
    parentId: "",
    code: "",
  };
}

function MoneyValue({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold tabular-nums">
      <span>{formatMoney(value)}</span>
      <Image
        src="/currency/sar.svg"
        alt={label}
        width={14}
        height={14}
        className="h-3.5 w-3.5 shrink-0"
      />
    </span>
  );
}

function StatusBadge({ row, locale }: { row: AccountRecord; locale: Locale }) {
  const t = translations[locale];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge
        variant="outline"
        className={cn(
          "rounded-full px-2.5 py-1 text-xs",
          row.isActive
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700",
        )}
      >
        {row.isActive ? t.active : t.inactive}
      </Badge>
      <Badge variant="outline" className="rounded-full bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
        {row.isSystem ? t.system : t.manual}
      </Badge>
    </div>
  );
}

function TypeBadge({ row }: { row: AccountRecord }) {
  const className =
    row.type === "asset"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : row.type === "liability"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : row.type === "equity"
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : row.type === "revenue"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 text-xs", className)}>
      {row.typeLabel}
    </Badge>
  );
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  money,
  t,
  href = "/company/accounting/chart-of-accounts",
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  money?: boolean;
  t: (typeof translations)[Locale];
  href?: string;
}) {
  return (
    <Card className="group overflow-hidden rounded-lg border bg-card shadow-none transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
      <Link
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
          <div className="min-w-0">
            <CardDescription className="truncate text-sm">{title}</CardDescription>
            <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
              {money ? <MoneyValue value={value} label={t.sar} /> : formatInteger(value)}
            </CardTitle>
          </div>
          <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
            <Icon className="h-5 w-5" />
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Link>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-lg">
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
      <Card className="rounded-lg">
        <CardHeader>
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyTableState({
  title,
  description,
  showReset,
  onReset,
  resetLabel,
}: {
  title: string;
  description: string;
  showReset?: boolean;
  onReset?: () => void;
  resetLabel: string;
}) {
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {showReset && onReset ? (
        <Button variant="outline" size="sm" onClick={onReset} className="rounded-lg">
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}

function DataTable<T extends { id: string }>({
  rows,
  allRowsCount,
  columns,
  rowKey,
  emptyTitle,
  emptyDescription,
  noResultsTitle,
  noResultsDescription,
  hasFilters,
  onReset,
  resetLabel,
  showingLabel,
  ofLabel,
  rowsLabel,
}: {
  rows: T[];
  allRowsCount: number;
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  emptyTitle: string;
  emptyDescription: string;
  noResultsTitle: string;
  noResultsDescription: string;
  hasFilters: boolean;
  onReset: () => void;
  resetLabel: string;
  showingLabel: string;
  ofLabel: string;
  rowsLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="overflow-x-auto">
          <Table className="min-w-[1120px] table-fixed">
            <TableHeader>
              <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "h-11 whitespace-nowrap px-4 text-start text-xs font-semibold text-muted-foreground",
                      column.className,
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    className="h-[62px] cursor-pointer transition hover:bg-muted/35"
                    onClick={() => window.location.assign(accountDetailHref(row))}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn("h-[62px] overflow-hidden px-4 text-start align-middle", column.className)}
                      >
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-72">
                    <EmptyTableState
                      title={hasFilters ? noResultsTitle : emptyTitle}
                      description={hasFilters ? noResultsDescription : emptyDescription}
                      showReset={hasFilters}
                      onReset={onReset}
                      resetLabel={resetLabel}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {showingLabel} <span className="font-medium text-foreground tabular-nums">{formatInteger(rows.length)}</span> {ofLabel}{" "}
        <span className="font-medium text-foreground tabular-nums">{formatInteger(allRowsCount)}</span> {rowsLabel}
      </div>
    </div>
  );
}


function AccountFormModal({
  open,
  mode,
  form,
  accounts,
  saving,
  locale,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  form: AccountFormState;
  accounts: AccountRecord[];
  saving: boolean;
  locale: Locale;
  onClose: () => void;
  onChange: (patch: Partial<AccountFormState>) => void;
  onSubmit: () => void;
}) {
  const t = translations[locale];
  const isCreate = mode === "create";
  const [parentSearch, setParentSearch] = React.useState("");
  const generatedCode =
    form.code || suggestAccountCode(accounts, form.parentId, form.type, form.id);
  const selectedParent = React.useMemo(
    () => accounts.find((account) => account.id === form.parentId),
    [accounts, form.parentId],
  );
  const parentOptions = React.useMemo(() => {
    const query = parentSearch.trim().toLowerCase();
    return accounts
      .filter((account) => account.id !== form.id)
      .filter((account) => account.isActive)
      .filter((account) => form.type === "all" || account.type === form.type)
      .filter((account) => {
        if (!query) return true;
        return [
          account.code,
          account.name,
          account.nameAr,
          account.nameEn,
          account.parentName,
          account.typeLabel,
        ].some((value) => String(value || "").toLowerCase().includes(query));
      })
      .sort((a, b) => compareAccountCodes(a.code, b.code))
      .slice(0, 80);
  }, [accounts, form.id, form.type, parentSearch]);
  function handleTypeChange(value: string) {
    const nextType = value as AccountTypeFilter;
    onChange({
      type: nextType,
      parentId: isCreate ? "" : form.parentId,
      code: isCreate ? "" : form.code,
    });
  }
  function handleParentSelect(account: AccountRecord) {
    onChange({
      parentId: account.id,
      type: account.type,
      code: isCreate
        ? suggestAccountCode(accounts, account.id, account.type, form.id)
        : form.code,
    });
  }
  function clearForm() {
    setParentSearch("");
    onClose();
  }

  if (!open) return null;

  return (
    <Card
      id="account-form"
      className="overflow-hidden rounded-lg border bg-card shadow-none"
    >
      <CardHeader className="border-b bg-background px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-base font-bold">
              {mode === "create" ? t.add : t.edit}
            </CardTitle>
            <CardDescription className="mt-1 text-xs leading-5">
              {locale === "ar"
                ? "أضف حسابًا فرعيًا واختر الحساب الأب لتوليد الكود تلقائيًا."
                : "Create a child account and select its parent to generate the code automatically."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"

              onClick={clearForm}
              disabled={saving}
            >
              <X className="h-4 w-4" />
              {t.cancel}
            </Button>
            <Button
              type="button"

              onClick={onSubmit}
              disabled={saving || !generatedCode || (isCreate && !form.parentId)}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {saving ? t.saving : t.save}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 py-4 sm:px-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border bg-background p-3">
          <div className="mb-3">
            <h3 className="text-sm font-bold">{t.parent}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {locale === "ar"
                ? "ابحث واختر الحساب الأب من داخل البطاقة."
                : "Search and select the parent account inside this card."}
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={parentSearch}
              onChange={(event) => setParentSearch(event.target.value)}
              placeholder={
                locale === "ar"
                  ? "ابحث برقم أو اسم الحساب..."
                  : "Search by account code or name..."
              }
              className="h-9 rounded-xl bg-muted/20 ps-9"
            />
          </div>
          {selectedParent ? (
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-2.5">
              <p className="truncate text-sm font-bold">
                {selectedParent.code} — {selectedParent.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {locale === "ar"
                  ? "سيتم إنشاء الحساب كفرع لهذا الحساب."
                  : "The account will be created as a child account."}
              </p>
            </div>
          ) : null}
          <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pe-1">
            {parentOptions.length ? (
              parentOptions.map((account) => {
                const active = account.id === form.parentId;
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => handleParentSelect(account)}
                    disabled={saving}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border px-2.5 py-2 text-start transition",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/30 hover:bg-muted/40",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {account.code} — {account.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {account.parentName ? `${t.parent}: ${account.parentName}` : t.noParent}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 rounded-full px-2 py-0.5 text-[11px]">
                      {typeLabel(account.type, locale)}
                    </Badge>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                {locale === "ar" ? "لا توجد حسابات مطابقة." : "No matching accounts."}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border bg-background p-3">
          <div className="mb-3">
            <h3 className="text-sm font-bold">
              {locale === "ar" ? "بيانات الحساب" : "Account details"}
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {locale === "ar"
                ? "أدخل بيانات الحساب الأساسية، وسيستخدم النظام الكود المقترح."
                : "Enter the account details; the suggested code will be used."}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <span className="text-sm font-medium">
                {locale === "ar" ? "الكود التلقائي" : "Auto code"}
              </span>
              <div className="flex h-9 items-center justify-between rounded-xl border bg-muted/20 px-3">
                <span className="font-mono text-sm font-bold tabular-nums">
                  {generatedCode || (locale === "ar" ? "بعد اختيار الأب" : "After parent")}
                </span>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-medium">{t.type}</span>
              <Select value={form.type} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-9 rounded-xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((item) => (
                    <SelectItem key={item} value={item}>
                      {typeLabel(item, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">{t.nameAr}</span>
              <Input
                value={form.nameAr}
                onChange={(event) => onChange({ nameAr: event.target.value })}
                placeholder={t.namePlaceholder}
                className="h-9 rounded-xl"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">{t.nameEn}</span>
              <Input
                value={form.nameEn}
                onChange={(event) => onChange({ nameEn: event.target.value })}
                placeholder="Example: National Bank"
                className="h-9 rounded-xl"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">{t.openingBalance}</span>
              <Input
                type="number"
                value={form.openingBalance}
                onChange={(event) => onChange({ openingBalance: event.target.value })}
                className="h-9 rounded-xl"
              />
            </label>
            <label className="flex h-9 items-center gap-3 rounded-xl border bg-background px-3">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => onChange({ isActive: event.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">{t.active}</span>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium">{t.notes}</span>
              <textarea
                value={form.notes}
                onChange={(event) => onChange({ notes: event.target.value })}
                rows={2}
                className="min-h-16 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CompanyChartOfAccountsPage() {
const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [type, setType] = React.useState<AccountTypeFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("code");

  const [modalOpen, setModalOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [form, setForm] = React.useState<AccountFormState>(emptyForm);
  const [statusConfirmTarget, setStatusConfirmTarget] = React.useState<AccountRecord | null>(null);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

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
    async ({
      silent = false,
      notify = false,
    }: {
      silent?: boolean;
      notify?: boolean;
    } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const payload = await fetchJson<unknown>(makeApiUrl(API_PATH));
        const rows = extractArray(payload).map((item) => normalizeAccount(item, locale));

        setAccounts(rows);

        if (notify) {
          toast.success(
            locale === "ar"
              ? "تم تحديث دليل الحسابات."
              : "Chart of accounts refreshed.",
          );
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        toast.error(t.errorTitle);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [locale, t],
  );

  React.useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const stats = React.useMemo(() => {
    const active = accounts.filter((account) => account.isActive);
    const inactive = accounts.filter((account) => !account.isActive);
    const child = accounts.filter((account) => account.parentId || account.level > 1);

    return {
      total: accounts.length,
      active: active.length,
      inactive: inactive.length,
      child: child.length,
      assets: accounts.filter((account) => account.type === "asset").length,
      liabilities: accounts.filter((account) => account.type === "liability").length,
      equity: accounts.filter((account) => account.type === "equity").length,
      revenue: accounts.filter((account) => account.type === "revenue").length,
      expense: accounts.filter((account) => account.type === "expense").length,
    };
  }, [accounts]);

  const filteredRows = React.useMemo(() => {
    return sortRows(filterRows(accounts, search, status, type), sort);
  }, [accounts, search, status, type, sort]);

  const hasFilters = Boolean(search || status !== "all" || type !== "all" || sort !== "code");

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setType("all");
    setSort("code");
  }


  function openEdit(row: AccountRecord) {
    setMode("edit");
    setForm({
      id: row.id,
      code: row.code === "—" ? "" : row.code,
      name: row.name,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      type: row.type,
      parentId: row.parentId,
      openingBalance: String(row.balance || 0),
      isActive: row.isActive,
      notes: row.notes,
    });
    setModalOpen(true);
  }

  function buildPayload() {
    const name = form.nameAr || form.nameEn || form.name;
    const generatedCode = form.code || suggestAccountCode(accounts, form.parentId, form.type, form.id);

    return {
      code: generatedCode.trim(),
      account_code: generatedCode.trim(),
      name: name.trim(),
      name_ar: form.nameAr.trim() || name.trim(),
      name_en: form.nameEn.trim() || name.trim(),
      account_type: form.type,
      type: form.type,
      parent: form.parentId || null,
      parent_id: form.parentId || null,
      opening_balance: toNumber(form.openingBalance),
      is_active: form.isActive,
      notes: form.notes.trim(),
      description: form.notes.trim(),
    };
  }

  async function submitForm() {
    const payload = buildPayload();

    if (!payload.code || !payload.name || !form.type) {
      toast.warning(t.validationRequired);
      return;
    }

    setSaving(true);

    try {
      if (mode === "create") {
        await fetchJson(makeApiUrl(API_PATH), {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(t.created);
      } else {
        await fetchJson(makeApiUrl(`${API_PATH}${form.id}/`), {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success(t.updated);
      }

      setMode("create");
      setForm(buildCreateFormForType(accounts, "asset"));
      setModalOpen(false);
      await loadAccounts({ silent: true });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.apiUnsupported;
      toast.error(message || t.apiUnsupported);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(row: AccountRecord) {
    setSaving(true);

    try {
      await fetchJson(makeApiUrl(`${API_PATH}${row.id}/`), {
        method: "PATCH",
        body: JSON.stringify({
          is_active: !row.isActive,
          active: !row.isActive,
          enabled: !row.isActive,
        }),
      });

      toast.success(t.statusUpdated);
      setStatusConfirmTarget(null);
      await loadAccounts({ silent: true });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.apiUnsupported;
      toast.error(message || t.apiUnsupported);
    } finally {
      setSaving(false);
    }
  }

  function buildAccountsExcelDocument() {
    const generatedAt = formatReportDateTime();
    const dir = locale === "ar" ? "rtl" : "ltr";
    const sheetName = t.title.slice(0, 31);

    const rowsHtml = filteredRows
      .map(
        (row) => `<tr>
          <td class="text-cell" lang="en-US">&#8203;${escapeHtml(row.code)}</td>
          <td class="name-cell">${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.typeLabel)}</td>
          <td>${escapeHtml(row.parentName || t.noParent)}</td>
          <td class="number-cell" lang="en-US" x:num="${row.level}">${escapeHtml(formatInteger(row.level))}</td>
          <td class="number-cell" lang="en-US" x:num="${row.balance}">${escapeHtml(formatMoney(row.balance))}</td>
          <td>${escapeHtml(row.isActive ? t.active : t.inactive)}</td>
          <td>${escapeHtml(row.isSystem ? t.system : t.manual)}</td>
        </tr>`,
      )
      .join("");

    const officeXml = `<!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${escapeHtml(sheetName)}</x:Name>
              <x:WorksheetOptions>
                ${locale === "ar" ? "<x:DisplayRightToLeft/>" : ""}
                <x:FreezePanes/>
                <x:FrozenNoSplit/>
                <x:SplitHorizontal>3</x:SplitHorizontal>
                <x:TopRowBottomPane>3</x:TopRowBottomPane>
                <x:FitToPage/>
                <x:Selected/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
    <![endif]-->`;

    return `<!doctype html>
      <html
        lang="${locale}"
        dir="${dir}"
        xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40"
      >
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.title)}</title>
          ${officeXml}
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; background: #ffffff; }
            body {
              padding: 8px;
              color: #111827;
              font-family: Tahoma, Arial, sans-serif;
              font-size: 12px;
            }
            table {
              width: 1280px;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #000000;
              padding: 7px 8px;
              text-align: start;
              vertical-align: middle;
            }
            .title-cell {
              height: 38px;
              border: 0;
              padding: 0 0 8px;
              font-size: 24px;
              font-weight: 700;
            }
            .meta-cell {
              height: 28px;
              border: 0;
              padding: 0 0 12px;
              color: #4b5563;
              font-size: 10px;
            }
            .header-cell {
              background: #e5e7eb;
              color: #111827;
              font-weight: 700;
              white-space: nowrap;
            }
            .text-cell {
              direction: ltr;
              unicode-bidi: plaintext;
              mso-number-format: "\\@";
              font-family: Arial, Tahoma, sans-serif;
              font-variant-numeric: tabular-nums;
              white-space: nowrap;
            }
            .number-cell {
              direction: ltr;
              unicode-bidi: plaintext;
              mso-number-format: "0.00";
              font-family: Arial, Tahoma, sans-serif;
              font-variant-numeric: tabular-nums;
              text-align: end;
              white-space: nowrap;
            }
            .name-cell {
              white-space: normal;
              overflow-wrap: anywhere;
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th class="title-cell" colspan="8">${escapeHtml(t.title)}</th>
              </tr>
              <tr>
                <td class="meta-cell" colspan="8">
                  ${escapeHtml(t.generatedAt)}:
                  <span class="text-cell" lang="en-US">&#8203;${escapeHtml(generatedAt)}</span>
                </td>
              </tr>
              <tr>
                <th class="header-cell" style="width: 130px">${escapeHtml(t.code)}</th>
                <th class="header-cell" style="width: 250px">${escapeHtml(t.accountName)}</th>
                <th class="header-cell" style="width: 120px">${escapeHtml(t.type)}</th>
                <th class="header-cell" style="width: 220px">${escapeHtml(t.parent)}</th>
                <th class="header-cell" style="width: 80px">${escapeHtml(t.level)}</th>
                <th class="header-cell" style="width: 110px">${escapeHtml(t.balance)}</th>
                <th class="header-cell" style="width: 100px">${escapeHtml(t.status)}</th>
                <th class="header-cell" style="width: 100px">${escapeHtml(locale === "ar" ? "المصدر" : "Source")}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>`;
  }

  function exportExcel() {
    if (!filteredRows.length) {
      toast.warning(t.exportEmpty);
      return;
    }

    const blob = new Blob(["\uFEFF", buildAccountsExcelDocument()], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "company-chart-of-accounts.xls";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);

    toast.success(locale === "ar" ? "تم تجهيز ملف Excel بنجاح." : "Excel file prepared successfully.");
  }

  function buildAccountsPrintDocument(includeSummary: boolean) {
    const generatedAt = formatReportDateTime();
    const dir = locale === "ar" ? "rtl" : "ltr";

    const summaryHtml = includeSummary
      ? `<section class="summary-grid">
          <div><span>${escapeHtml(t.totalAccounts)}</span><strong>${escapeHtml(formatInteger(stats.total))}</strong></div>
          <div><span>${escapeHtml(t.activeAccounts)}</span><strong>${escapeHtml(formatInteger(stats.active))}</strong></div>
          <div><span>${escapeHtml(t.inactiveAccounts)}</span><strong>${escapeHtml(formatInteger(stats.inactive))}</strong></div>
          <div><span>${escapeHtml(t.childAccounts)}</span><strong>${escapeHtml(formatInteger(stats.child))}</strong></div>
          <div><span>${escapeHtml(t.assets)}</span><strong>${escapeHtml(formatInteger(stats.assets))}</strong></div>
          <div><span>${escapeHtml(t.liabilities)}</span><strong>${escapeHtml(formatInteger(stats.liabilities))}</strong></div>
          <div><span>${escapeHtml(t.equities)}</span><strong>${escapeHtml(formatInteger(stats.equity))}</strong></div>
          <div><span>${escapeHtml(t.revenues)}</span><strong>${escapeHtml(formatInteger(stats.revenue))}</strong></div>
          <div><span>${escapeHtml(t.expenses)}</span><strong>${escapeHtml(formatInteger(stats.expense))}</strong></div>
        </section>`
      : "";

    const rowsHtml = filteredRows
      .map(
        (row) => `<tr>
          <td class="latin">${escapeHtml(row.code)}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.typeLabel)}</td>
          <td>${escapeHtml(row.parentName || t.noParent)}</td>
          <td class="number">${escapeHtml(formatInteger(row.level))}</td>
          <td class="number">${escapeHtml(formatMoney(row.balance))}</td>
          <td>${escapeHtml(row.isActive ? t.active : t.inactive)}</td>
          <td>${escapeHtml(row.isSystem ? t.system : t.manual)}</td>
        </tr>`,
      )
      .join("");

    return `<!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.title)}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; color: #111827; }
            body { font-family: Tahoma, Arial, sans-serif; font-size: 10px; }
            .report { width: 100%; }
            .report-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 16px;
              padding-bottom: 10px;
              border-bottom: 2px solid #111827;
            }
            h1 { margin: 0; font-size: 22px; }
            .meta { margin-top: 5px; color: #4b5563; font-size: 9px; }
            .latin, .number { direction: ltr; unicode-bidi: plaintext; font-variant-numeric: tabular-nums; }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 6px;
              margin: 10px 0;
            }
            .summary-grid > div {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              border: 1px solid #111827;
              padding: 6px 8px;
            }
            .summary-grid strong { font-size: 12px; }
            h2 { margin: 12px 0 6px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td {
              border: 1px solid #111827;
              padding: 5px 6px;
              text-align: start;
              vertical-align: middle;
              overflow-wrap: anywhere;
            }
            th { background: #e5e7eb; font-weight: 700; white-space: nowrap; }
            .number { text-align: end; white-space: nowrap; }
          </style>
        </head>
        <body>
          <main class="report">
            <header class="report-header">
              <div>
                <h1>${escapeHtml(t.title)}</h1>
                <div class="meta">
                  ${escapeHtml(t.generatedAt)}:
                  <span class="latin">${escapeHtml(generatedAt)}</span>
                </div>
              </div>
            </header>
            ${summaryHtml}
            <h2>${escapeHtml(t.title)}</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 11%">${escapeHtml(t.code)}</th>
                  <th style="width: 22%">${escapeHtml(t.accountName)}</th>
                  <th style="width: 11%">${escapeHtml(t.type)}</th>
                  <th style="width: 20%">${escapeHtml(t.parent)}</th>
                  <th style="width: 8%">${escapeHtml(t.level)}</th>
                  <th style="width: 10%">${escapeHtml(t.balance)}</th>
                  <th style="width: 9%">${escapeHtml(t.status)}</th>
                  <th style="width: 9%">${escapeHtml(locale === "ar" ? "المصدر" : "Source")}</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </main>
          <script>
            window.addEventListener("load", function () {
              window.setTimeout(function () {
                window.focus();
                window.print();
              }, 250);
            });
          </script>
        </body>
      </html>`;
  }

  function printAccounts(includeSummary = true) {
    if (!filteredRows.length) {
      toast.warning(t.printEmpty);
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      toast.error(
        locale === "ar"
          ? "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة."
          : "Could not open the print window. Allow pop-ups and try again.",
      );
      return;
    }

    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(buildAccountsPrintDocument(includeSummary));
    printWindow.document.close();
    toast.success(locale === "ar" ? "تم تجهيز صفحة الطباعة." : "Print page is ready.");
  }

  const columns: DataColumn<AccountRecord>[] = [
    {
      key: "code",
      label: t.code,
      className: "sticky start-0 z-10 w-[140px] bg-inherit",
      render: (row) => <span className="font-semibold tabular-nums text-foreground">{row.code}</span>,
    },
    {
      key: "name",
      label: t.accountName,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{row.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {row.parentName ? `${t.parent}: ${row.parentName}` : t.noParent}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      label: t.type,
      className: "w-[130px]",
      render: (row) => <TypeBadge row={row} />,
    },
    {
      key: "level",
      label: t.level,
      className: "w-[100px]",
      render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{formatInteger(row.level)}</span>,
    },
    {
      key: "balance",
      label: t.balance,
      className: "w-[150px]",
      render: (row) => <MoneyValue value={row.balance} label={t.sar} />,
    },
    {
      key: "status",
      label: t.status,
      className: "w-[190px]",
      render: (row) => <StatusBadge row={row} locale={locale} />,
    },
    {
      key: "actions",
      label: locale === "ar" ? "الإجراءات" : "Actions",
      className: "w-[92px] text-center",
      render: (row) => (
        <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                aria-label={t.actions}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-48">
              <DropdownMenuItem asChild>
                <Link href={accountDetailHref(row)} className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {locale === "ar" ? "فتح التفاصيل" : "Open details"}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openEdit(row)} className="flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                {locale === "ar" ? "تعديل حساب" : "Edit account"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusConfirmTarget(row)}
                className="flex items-center gap-2"
              >
                {row.isActive ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {row.isActive ? t.deactivate : t.activate}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          <DashboardSkeleton />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-[900px] rounded-lg border-destructive/30 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="h-5 w-5" />
              {t.errorTitle}
            </CardTitle>
            <CardDescription>{error || t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void loadAccounts()} className="rounded-xl" disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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
      className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1 text-start">
            <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
              {t.subtitle}
            </p>
            <nav className="flex flex-wrap items-center gap-5 pt-2">
              <Link
                href="/company/accounting"
                className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.back}
              </Link>
              <span className="border-b-2 border-foreground pb-1 text-sm font-semibold text-foreground">
                {t.title}
              </span>
              <Link
                href="/company/accounting/journal-entries"
                className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {locale === "ar" ? "القيود اليومية" : "Journal entries"}
              </Link>
              <Link
                href="/company/accounting/cost-centers"
                className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {locale === "ar" ? "مراكز التكلفة" : "Cost centers"}
              </Link>
            </nav>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadAccounts({
                  silent: true,
                  notify: true,
                })
              }
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
              onClick={exportExcel}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t.export}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => printAccounts(true)}
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setMode("create");
                setForm(buildCreateFormForType(accounts, "asset"));
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t.add}
            </Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalAccounts} value={stats.total} description={t.title} icon={BookOpen} t={t} />
          <KpiCard title={t.activeAccounts} value={stats.active} description={t.active} icon={ShieldCheck} t={t} />
          <KpiCard title={t.inactiveAccounts} value={stats.inactive} description={t.inactive} icon={ToggleLeft} t={t} />
          <KpiCard title={t.childAccounts} value={stats.child} description={t.parent} icon={FolderTree} t={t} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard title={t.assets} value={stats.assets} description={t.asset} icon={Layers3} t={t} />
          <KpiCard title={t.liabilities} value={stats.liabilities} description={t.liability} icon={WalletCards} t={t} />
          <KpiCard title={t.equities} value={stats.equity} description={t.equity} icon={Activity} t={t} />
          <KpiCard title={t.revenues} value={stats.revenue} description={t.revenue} icon={Activity} t={t} />
          <KpiCard title={t.expenses} value={stats.expense} description={t.expense} icon={SlidersHorizontal} t={t} />
        </div>

        <AccountFormModal
          open={modalOpen}
          mode={mode}
          form={form}
          accounts={accounts}
          saving={saving}
          locale={locale}
          onClose={() => {
            setMode("create");
            setForm(buildCreateFormForType(accounts, "asset"));
            setModalOpen(false);
          }}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onSubmit={() => void submitForm()}
        />
        <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 text-start">
                <CardTitle>{t.title}</CardTitle>
                <CardDescription className="mt-1">{t.subtitle}</CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={exportExcel}>
                  <FileSpreadsheet />
                  {t.export}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => printAccounts(false)}
                >
                  <Printer />
                  {t.print}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative w-full sm:w-[360px]">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-9 bg-background ps-9 shadow-none"
                  />
                </div>

                <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-9 bg-background shadow-none sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    {statusFilters.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "all" ? t.all : item === "active" ? t.active : t.inactive}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={type} onValueChange={(value) => setType(value as AccountTypeFilter)}>
                  <SelectTrigger className="h-9 bg-background shadow-none sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    <SelectItem value="all">{t.all}</SelectItem>
                    {accountTypes.map((item) => (
                      <SelectItem key={item} value={item}>
                        {typeLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-9 bg-background shadow-none sm:w-[170px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    <SelectItem value="code">{t.newest}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                    <SelectItem value="type">{t.typeSort}</SelectItem>
                    <SelectItem value="balance_high">{t.balanceHigh}</SelectItem>
                    <SelectItem value="balance_low">{t.balanceLow}</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>

            <DataTable
              rows={filteredRows}
              allRowsCount={accounts.length}
              columns={columns}
              rowKey={(row) => row.id}
              emptyTitle={t.noDataTitle}
              emptyDescription={t.noDataDesc}
              noResultsTitle={t.noResultsTitle}
              noResultsDescription={t.noResultsDesc}
              hasFilters={hasFilters}
              onReset={resetFilters}
              resetLabel={t.reset}
              showingLabel={t.showing}
              ofLabel={t.of}
              rowsLabel={t.rows}
            />
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={Boolean(statusConfirmTarget)}
        onOpenChange={(open) => {
          if (!open && !saving) setStatusConfirmTarget(null);
        }}
      >
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusConfirmTarget?.isActive
                ? locale === "ar"
                  ? "تأكيد تعطيل الحساب"
                  : "Confirm account deactivation"
                : locale === "ar"
                  ? "تأكيد تفعيل الحساب"
                  : "Confirm account activation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusConfirmTarget?.isActive
                ? locale === "ar"
                  ? `سيتم تعطيل الحساب «${statusConfirmTarget?.name || ""}» ومنع استخدامه في العمليات الجديدة، مع الاحتفاظ بجميع القيود السابقة.`
                  : `The account "${statusConfirmTarget?.name || ""}" will be disabled for new transactions while previous journals remain available.`
                : locale === "ar"
                  ? `سيتم تفعيل الحساب «${statusConfirmTarget?.name || ""}» وإتاحته للاستخدام في العمليات الجديدة.`
                  : `The account "${statusConfirmTarget?.name || ""}" will be activated for new transactions.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={!statusConfirmTarget || saving}
              onClick={(event) => {
                event.preventDefault();
                if (statusConfirmTarget) void toggleStatus(statusConfirmTarget);
              }}
              className={cn(
                statusConfirmTarget?.isActive
                  ? "!bg-red-600 !text-white hover:!bg-red-700"
                  : "!bg-emerald-600 !text-white hover:!bg-emerald-700",
              )}
            >
              {saving ? (
                <Loader2 className="animate-spin" />
              ) : statusConfirmTarget?.isActive ? (
                <PowerOff />
              ) : (
                <Power />
              )}
              {statusConfirmTarget?.isActive
                ? locale === "ar"
                  ? "تأكيد التعطيل"
                  : "Confirm deactivation"
                : locale === "ar"
                  ? "تأكيد التفعيل"
                  : "Confirm activation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
