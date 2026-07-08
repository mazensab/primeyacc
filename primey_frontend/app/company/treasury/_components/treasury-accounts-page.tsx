"use client";
/* ============================================================
   📂 primey_frontend/app/company/treasury/_components/treasury-accounts-page.tsx
   🧠 PrimeyAcc — Company Treasury Accounts Shared Page
   ------------------------------------------------------------
   ✅ Approved Premium company operational pattern
   ✅ Real API only, no fake demo data
   ✅ Company scoped API through backend session
   ✅ Cashboxes and bank accounts pages
   ✅ Create / edit / activate / deactivate
   ✅ No delete action
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ English numbers/money always
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost hardcoding except safe dev fallback
============================================================ */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpDown,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  Edit3,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TriangleAlert,
  WalletCards,
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
type PageVariant = "cashboxes" | "bankAccounts";
type ApiRecord = Record<string, unknown>;
type SortKey = "name" | "code" | "balance_high" | "balance_low" | "updated";
type StatusFilter = "all" | "active" | "inactive";
type TreasuryAccountApiType = "CASH" | "BANK";
type TreasuryAccountRecord = {
  id: string;
  name: string;
  code: string;
  apiType: TreasuryAccountApiType;
  status: "active" | "inactive";
  currency: string;
  openingBalance: number;
  currentBalance: number;
  accountingAccountId: string;
  accountingAccountCode: string;
  accountingAccountName: string;
  openingAccountingEntryId: string;
  openingAccountingEntryNumber: string;
  openingAccountingEntryStatus: string;
  bankName: string;
  bankAccountNumber: string;
  iban: string;
  isDefault: boolean;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
};
type AccountFormState = {
  id: string;
  name: string;
  code: string;
  openingBalance: string;
  bankName: string;
  bankAccountNumber: string;
  iban: string;
  isDefault: boolean;
  isActive: boolean;
  notes: string;
};
type DataColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};
const API_PATH = "/api/company/treasury/accounts/";
const translations = {
  ar: {
    back: "الخزينة والمدفوعات",
    moduleBadge: "الخزينة والمدفوعات",
    cashboxesTitle: "الصناديق",
    cashboxesSubtitle:
      "إدارة صناديق الشركة النقدية ومتابعة أرصدتها وحالتها بدون حذف للحفاظ على الحركات السابقة.",
    bankAccountsTitle: "الحسابات البنكية",
    bankAccountsSubtitle:
      "إدارة الحسابات البنكية والآيبان وربطها بحركات الخزينة والمدفوعات داخل الشركة.",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    addCashbox: "إضافة صندوق",
    addBankAccount: "إضافة حساب بنكي",
    editCashbox: "تعديل صندوق",
    editBankAccount: "تعديل حساب بنكي",
    formCreateDesc: "أدخل بيانات الحساب، وسيتم إنشاؤه داخل الشركة الحالية فقط.",
    formEditDesc: "يمكن تعديل البيانات الأساسية والحالة، ولا يتم تعديل الأثر السابق للحركات.",
    save: "حفظ",
    saving: "جاري الحفظ...",
    cancel: "إلغاء",
    reset: "إعادة ضبط",
    activate: "تفعيل",
    deactivate: "تعطيل",
    active: "نشط",
    inactive: "غير نشط",
    all: "الكل",
    search: "بحث",
    status: "الحالة",
    sort: "الترتيب",
    newest: "آخر تحديث",
    nameSort: "الاسم",
    codeSort: "الكود",
    balanceHigh: "أعلى رصيد",
    balanceLow: "أقل رصيد",
    accountName: "اسم الحساب",
    code: "الكود",
    openingBalance: "الرصيد الافتتاحي",
    currentBalance: "الرصيد الحالي",
    bankName: "اسم البنك",
    bankAccountNumber: "رقم الحساب البنكي",
    iban: "IBAN",
    defaultAccount: "افتراضي",
    notes: "ملاحظات",
    actions: "الإجراءات",
    totalAccounts: "إجمالي الحسابات",
    activeAccounts: "النشطة",
    inactiveAccounts: "المعطلة",
    totalBalance: "إجمالي الرصيد",
    defaultAccounts: "الحسابات الافتراضية",
    operationalHintTitle: "صفحة تشغيلية",
    cashOperationalHint:
      "هذه الصفحة مخصصة لإنشاء وتعديل وتعطيل الصناديق. لا يوجد حذف حتى لا تتأثر الحركات السابقة.",
    bankOperationalHint:
      "هذه الصفحة مخصصة لإنشاء وتعديل وتعطيل الحسابات البنكية. لا يوجد حذف حتى لا تتأثر الحركات السابقة.",
    tableTitleCash: "قائمة الصناديق",
    tableTitleBank: "قائمة الحسابات البنكية",
    tableDescCash: "الصناديق النقدية الخاصة بالشركة الحالية.",
    tableDescBank: "الحسابات البنكية الخاصة بالشركة الحالية.",
    searchPlaceholderCash: "ابحث باسم الصندوق أو الكود أو الملاحظات...",
    searchPlaceholderBank: "ابحث باسم الحساب أو الكود أو البنك أو الآيبان...",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    sar: "ر.س",
    unknown: "غير محدد",
    noDataTitleCash: "لا توجد صناديق",
    noDataTitleBank: "لا توجد حسابات بنكية",
    noDataDescCash: "ابدأ بإضافة أول صندوق للشركة.",
    noDataDescBank: "ابدأ بإضافة أول حساب بنكي للشركة.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitleCash: "تعذر تحميل الصناديق",
    errorTitleBank: "تعذر تحميل الحسابات البنكية",
    errorDesc: "تأكد من تسجيل الدخول للشركة ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    created: "تم إنشاء الحساب بنجاح.",
    updated: "تم تحديث الحساب بنجاح.",
    statusUpdated: "تم تحديث حالة الحساب.",
    validationRequired: "أدخل اسم الحساب والكود.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    generatedAt: "تم الإنشاء في",
    apiUnsupported: "تعذر تنفيذ العملية من الواجهة الحالية.",
  },
  en: {
    back: "Treasury & Payments",
    moduleBadge: "Treasury & Payments",
    cashboxesTitle: "Cashboxes",
    cashboxesSubtitle:
      "Manage company cashboxes, balances, and status without deleting historical movements.",
    bankAccountsTitle: "Bank Accounts",
    bankAccountsSubtitle:
      "Manage company bank accounts and IBANs connected to treasury movements and payments.",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    addCashbox: "Add cashbox",
    addBankAccount: "Add bank account",
    editCashbox: "Edit cashbox",
    editBankAccount: "Edit bank account",
    formCreateDesc: "Enter account details; it will be created inside the current company only.",
    formEditDesc: "Edit account details and status without changing previous movement effects.",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    reset: "Reset",
    activate: "Activate",
    deactivate: "Deactivate",
    active: "Active",
    inactive: "Inactive",
    all: "All",
    search: "Search",
    status: "Status",
    sort: "Sort",
    newest: "Last updated",
    nameSort: "Name",
    codeSort: "Code",
    balanceHigh: "Highest balance",
    balanceLow: "Lowest balance",
    accountName: "Account name",
    code: "Code",
    openingBalance: "Opening balance",
    currentBalance: "Current balance",
    bankName: "Bank name",
    bankAccountNumber: "Bank account number",
    iban: "IBAN",
    defaultAccount: "Default",
    notes: "Notes",
    actions: "Actions",
    totalAccounts: "Total accounts",
    activeAccounts: "Active",
    inactiveAccounts: "Inactive",
    totalBalance: "Total balance",
    defaultAccounts: "Default accounts",
    operationalHintTitle: "Operational page",
    cashOperationalHint:
      "This page creates, updates, and deactivates cashboxes. Delete is disabled to protect previous movements.",
    bankOperationalHint:
      "This page creates, updates, and deactivates bank accounts. Delete is disabled to protect previous movements.",
    tableTitleCash: "Cashboxes list",
    tableTitleBank: "Bank accounts list",
    tableDescCash: "Company cash accounts for the current workspace.",
    tableDescBank: "Company bank accounts for the current workspace.",
    searchPlaceholderCash: "Search by cashbox name, code, or notes...",
    searchPlaceholderBank: "Search by account name, code, bank, or IBAN...",
    showing: "Showing",
    of: "of",
    rows: "rows",
    sar: "SAR",
    unknown: "Unknown",
    noDataTitleCash: "No cashboxes",
    noDataTitleBank: "No bank accounts",
    noDataDescCash: "Start by creating the first company cashbox.",
    noDataDescBank: "Start by creating the first company bank account.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitleCash: "Could not load cashboxes",
    errorTitleBank: "Could not load bank accounts",
    errorDesc: "Make sure you are signed in to the company and the backend is running, then try again.",
    tryAgain: "Try again",
    created: "Account created successfully.",
    updated: "Account updated successfully.",
    statusUpdated: "Account status updated.",
    validationRequired: "Enter account name and code.",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    generatedAt: "Generated at",
    apiUnsupported: "The operation could not be completed from this page.",
  },
} as const;
const emptyForm: AccountFormState = {
  id: "",
  name: "",
  code: "",
  openingBalance: "0",
  bankName: "",
  bankAccountNumber: "",
  iban: "",
  isDefault: false,
  isActive: true,
  notes: "",
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
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
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
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function getApiBaseUrl() {
  const fallbackBase = "http://127.0.0.1:8000";
  const envBase =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/+$/,
          "",
        )
      : "";
  if (!envBase) return fallbackBase;
  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}
function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")[1] || ""
  );
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
  const result = record.result;
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.rows)) return record.rows;
  if (Array.isArray(record.accounts)) return record.accounts;
  if (Array.isArray(data)) return data;
  if (Array.isArray(result)) return result;
  const dataRecord = asRecord(data);
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.records)) return dataRecord.records;
  if (Array.isArray(dataRecord.rows)) return dataRecord.rows;
  if (Array.isArray(dataRecord.accounts)) return dataRecord.accounts;
  const resultRecord = asRecord(result);
  if (Array.isArray(resultRecord.results)) return resultRecord.results;
  if (Array.isArray(resultRecord.items)) return resultRecord.items;
  return [];
}
function normalizeStatus(value: unknown): "active" | "inactive" {
  const normalized = normalizeText(value).toUpperCase();
  return normalized === "INACTIVE" ? "inactive" : "active";
}
function normalizeAccount(value: unknown, apiType: TreasuryAccountApiType): TreasuryAccountRecord {
  const record = asRecord(value);
  return {
    id: normalizeText(record.id || record.uuid || record.pk),
    name: normalizeText(record.name, "—"),
    code: normalizeText(record.code, "—"),
    apiType,
    status: normalizeStatus(record.status),
    currency: normalizeText(record.currency, "SAR"),
    openingBalance: toNumber(record.opening_balance),
    currentBalance: toNumber(record.current_balance),
    accountingAccountId: normalizeText(record.accounting_account_id),
    accountingAccountCode: normalizeText(record.accounting_account_code),
    accountingAccountName: normalizeText(record.accounting_account_name),
    openingAccountingEntryId: normalizeText(record.opening_accounting_entry_id),
    openingAccountingEntryNumber: normalizeText(record.opening_accounting_entry_number),
    openingAccountingEntryStatus: normalizeText(record.opening_accounting_entry_status),
    bankName: normalizeText(record.bank_name),
    bankAccountNumber: normalizeText(record.bank_account_number),
    iban: normalizeText(record.iban),
    isDefault: toBoolean(record.is_default),
    notes: normalizeText(record.notes),
    createdAt: normalizeText(record.created_at) || null,
    updatedAt: normalizeText(record.updated_at || record.created_at) || null,
  };
}
function getConfig(variant: PageVariant, locale: Locale) {
  const t = translations[locale];
  const isBank = variant === "bankAccounts";
  return {
    apiType: (isBank ? "BANK" : "CASH") as TreasuryAccountApiType,
    title: isBank ? t.bankAccountsTitle : t.cashboxesTitle,
    subtitle: isBank ? t.bankAccountsSubtitle : t.cashboxesSubtitle,
    addLabel: isBank ? t.addBankAccount : t.addCashbox,
    editLabel: isBank ? t.editBankAccount : t.editCashbox,
    tableTitle: isBank ? t.tableTitleBank : t.tableTitleCash,
    tableDesc: isBank ? t.tableDescBank : t.tableDescCash,
    searchPlaceholder: isBank ? t.searchPlaceholderBank : t.searchPlaceholderCash,
    noDataTitle: isBank ? t.noDataTitleBank : t.noDataTitleCash,
    noDataDesc: isBank ? t.noDataDescBank : t.noDataDescCash,
    errorTitle: isBank ? t.errorTitleBank : t.errorTitleCash,
    operationalHint: isBank ? t.bankOperationalHint : t.cashOperationalHint,
    icon: isBank ? Landmark : Banknote,
  };
}
function suggestCode(rows: TreasuryAccountRecord[], apiType: TreasuryAccountApiType) {
  const prefix = apiType === "BANK" ? "BANK" : "CASH";
  const numbers = rows
    .map((row) => row.code)
    .filter((code) => code.toUpperCase().startsWith(prefix))
    .map((code) => Number(code.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value));
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}
function sortRows(rows: TreasuryAccountRecord[], sort: SortKey) {
  return [...rows].sort((a, b) => {
    if (sort === "balance_high") return b.currentBalance - a.currentBalance;
    if (sort === "balance_low") return a.currentBalance - b.currentBalance;
    if (sort === "code") return a.code.localeCompare(b.code, undefined, { numeric: true });
    if (sort === "updated") return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    return a.name.localeCompare(b.name);
  });
}
function MoneyValue({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold tabular-nums">
      <Image src="/currency/sar.svg" alt={label} width={14} height={14} className="h-3.5 w-3.5" />
      <span>{formatMoney(value)}</span>
    </span>
  );
}
function StatusBadge({ value, label }: { value: "active" | "inactive"; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap rounded-full px-2.5 py-1 text-xs",
        value === "active"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700",
      )}
    >
      {label}
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
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  money?: boolean;
  t: (typeof translations)[Locale];
}) {
  return (
    <Card className="group overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {money ? <MoneyValue value={value} label={t.sar} /> : formatInteger(value)}
          </CardTitle>
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
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
      <div className="overflow-hidden rounded-2xl border bg-background">
        <div className="overflow-x-auto">
          <Table className="min-w-[1080px] table-fixed">
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
                  <TableRow key={rowKey(row)} className="h-[68px]">
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn("h-[68px] overflow-hidden px-4 text-start align-middle", column.className)}
                      >
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-80">
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
function AccountFormCard({
  variant,
  mode,
  form,
  saving,
  locale,
  onChange,
  onSubmit,
  onCancel,
}: {
  variant: PageVariant;
  mode: "create" | "edit";
  form: AccountFormState;
  saving: boolean;
  locale: Locale;
  onChange: (patch: Partial<AccountFormState>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const t = translations[locale];
  const config = getConfig(variant, locale);
  const isBank = variant === "bankAccounts";
  const title = mode === "create" ? config.addLabel : config.editLabel;
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{mode === "create" ? t.formCreateDesc : t.formEditDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-medium">{t.accountName}</span>
            <Input
              value={form.name}
              onChange={(event) => onChange({ name: event.target.value })}
              className="h-10 rounded-xl bg-background"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">{t.code}</span>
            <Input
              value={form.code}
              onChange={(event) => onChange({ code: event.target.value })}
              className="h-10 rounded-xl bg-background font-mono tabular-nums"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">{t.openingBalance}</span>
            <Input
              type="number"
              value={form.openingBalance}
              onChange={(event) => onChange({ openingBalance: event.target.value })}
              disabled={mode === "edit"}
              className="h-10 rounded-xl bg-background tabular-nums"
            />
          </label>
          <label className="flex h-[68px] items-center gap-3 rounded-xl border bg-background px-3">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => onChange({ isDefault: event.target.checked })}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">{t.defaultAccount}</span>
          </label>
          {isBank ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-medium">{t.bankName}</span>
                <Input
                  value={form.bankName}
                  onChange={(event) => onChange({ bankName: event.target.value })}
                  className="h-10 rounded-xl bg-background"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">{t.bankAccountNumber}</span>
                <Input
                  value={form.bankAccountNumber}
                  onChange={(event) => onChange({ bankAccountNumber: event.target.value })}
                  className="h-10 rounded-xl bg-background tabular-nums"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">{t.iban}</span>
                <Input
                  value={form.iban}
                  onChange={(event) => onChange({ iban: event.target.value.toUpperCase() })}
                  className="h-10 rounded-xl bg-background font-mono tabular-nums"
                />
              </label>
            </>
          ) : null}
          <label className="space-y-2 md:col-span-2 xl:col-span-4">
            <span className="text-sm font-medium">{t.notes}</span>
            <textarea
              value={form.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              rows={3}
              className="min-h-20 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" className="rounded-xl" onClick={onSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? t.saving : t.save}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl bg-background" onClick={onCancel} disabled={saving}>
            {t.cancel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
export function TreasuryAccountsPage({ variant }: { variant: PageVariant }) {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [rows, setRows] = React.useState<TreasuryAccountRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [formVisible, setFormVisible] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [form, setForm] = React.useState<AccountFormState>(emptyForm);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("balance_high");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const config = getConfig(variant, locale);
  const PageIcon = config.icon;
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
  const loadRows = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const params = new URLSearchParams({
          page: "1",
          page_size: "200",
          account_type: config.apiType,
          ordering: "-current_balance",
        });
        const payload = await fetchJson<unknown>(makeApiUrl(API_PATH, params));
        const normalizedRows = extractArray(payload).map((item) => normalizeAccount(item, config.apiType));
        setRows(normalizedRows);
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
    [config.apiType, t],
  );
  React.useEffect(() => {
    void loadRows();
  }, [loadRows]);
  const stats = React.useMemo(() => {
    const active = rows.filter((row) => row.status === "active");
    const inactive = rows.filter((row) => row.status === "inactive");
    const defaults = rows.filter((row) => row.isDefault);
    return {
      total: rows.length,
      active: active.length,
      inactive: inactive.length,
      defaults: defaults.length,
      balance: rows.reduce((sum, row) => sum + row.currentBalance, 0),
    };
  }, [rows]);
  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const haystack = [
        row.name,
        row.code,
        row.accountingAccountCode,
        row.accountingAccountName,
        row.openingAccountingEntryNumber,
        row.status,
        row.bankName,
        row.bankAccountNumber,
        row.iban,
        row.notes,
      ]
        .join(" ")
        .toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (status === "active" && row.status !== "active") return false;
      if (status === "inactive" && row.status !== "inactive") return false;
      return true;
    });
    return sortRows(filtered, sort);
  }, [rows, search, sort, status]);
  const hasFilters = Boolean(search || status !== "all" || sort !== "balance_high");
  function resetFilters() {
    setSearch("");
    setStatus("all");
    setSort("balance_high");
  }
  function openCreate() {
    setMode("create");
    setForm({
      ...emptyForm,
      code: suggestCode(rows, config.apiType),
      isActive: true,
    });
    setFormVisible(true);
  }
  function openEdit(row: TreasuryAccountRecord) {
    setMode("edit");
    setForm({
      id: row.id,
      name: row.name === "—" ? "" : row.name,
      code: row.code === "—" ? "" : row.code,
      openingBalance: String(row.openingBalance || 0),
      bankName: row.bankName,
      bankAccountNumber: row.bankAccountNumber,
      iban: row.iban,
      isDefault: row.isDefault,
      isActive: row.status === "active",
      notes: row.notes,
    });
    setFormVisible(true);
  }
  function closeForm() {
    setMode("create");
    setForm(emptyForm);
    setFormVisible(false);
  }
  function buildPayload() {
    return {
      name: form.name.trim(),
      code: form.code.trim(),
      account_type: config.apiType,
      type: config.apiType,
      status: form.isActive ? "ACTIVE" : "INACTIVE",
      currency: "SAR",
      opening_balance: toNumber(form.openingBalance),
      bank_name: form.bankName.trim(),
      bank_account_number: form.bankAccountNumber.trim(),
      iban: form.iban.trim().toUpperCase(),
      is_default: form.isDefault,
      notes: form.notes.trim(),
    };
  }
  async function submitForm() {
    const payload = buildPayload();
    if (!payload.name || !payload.code) {
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
      closeForm();
      await loadRows({ silent: true });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.apiUnsupported;
      toast.error(message || t.apiUnsupported);
    } finally {
      setSaving(false);
    }
  }
  async function toggleStatus(row: TreasuryAccountRecord) {
    setSaving(true);
    try {
      if (row.status === "active") {
        await fetchJson(makeApiUrl(`${API_PATH}${row.id}/?action=deactivate`), {
          method: "POST",
          body: JSON.stringify({ action: "deactivate" }),
        });
      } else {
        await fetchJson(makeApiUrl(`${API_PATH}${row.id}/`), {
          method: "PATCH",
          body: JSON.stringify({ status: "ACTIVE" }),
        });
      }
      toast.success(t.statusUpdated);
      await loadRows({ silent: true });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.apiUnsupported;
      toast.error(message || t.apiUnsupported);
    } finally {
      setSaving(false);
    }
  }
  function exportExcel() {
    if (!filteredRows.length) {
      toast.warning(t.exportEmpty);
      return;
    }
    const rowsForExport = [
      [config.title],
      [t.generatedAt, new Date().toLocaleString()],
      [],
      [t.code, t.accountName, t.currentBalance, t.openingBalance, t.status, t.bankName, t.bankAccountNumber, t.iban, t.defaultAccount, t.notes],
      ...filteredRows.map((row) => [
        row.code,
        row.name,
        formatMoney(row.currentBalance),
        formatMoney(row.openingBalance),
        row.status === "active" ? t.active : t.inactive,
        row.bankName,
        row.bankAccountNumber,
        row.iban,
        row.isDefault ? t.defaultAccount : "",
        row.notes,
      ]),
    ];
    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <table border="1">
            ${rowsForExport
              .map(
                (row) =>
                  `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
              )
              .join("")}
          </table>
        </body>
      </html>
    `;
    const blob = new Blob(["\uFEFF", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${variant}-${new Date().toISOString().slice(0, 10)}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function printPage() {
    if (!filteredRows.length) {
      toast.warning(t.printEmpty);
      return;
    }
    window.print();
  }
  const columns: DataColumn<TreasuryAccountRecord>[] = [

    {
      key: "accountingLinkage",
      label: locale === "ar" ? "الحساب المحاسبي" : "Accounting account",
      className: "w-[260px]",
      render: (row) => (
        <div className="min-w-0">
          <span className="block truncate text-sm text-muted-foreground tabular-nums">
            {row.accountingAccountCode || "—"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.accountingAccountName ||
              (row.accountingAccountCode ? (locale === "ar" ? "حساب محاسبي" : "Accounting account") : "—")}
          </span>
          {row.openingAccountingEntryNumber ? (
            <span className="block truncate text-[11px] text-muted-foreground tabular-nums">
              {locale === "ar" ? "قيد افتتاحي" : "Opening entry"}: {row.openingAccountingEntryNumber}
            </span>
          ) : null}
        </div>
      ),
    },
{
      key: "account",
      label: t.accountName,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{row.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground tabular-nums">{row.code}</p>
        </div>
      ),
    },
    {
      key: "balance",
      label: t.currentBalance,
      className: "w-[160px]",
      render: (row) => <MoneyValue value={row.currentBalance} label={t.sar} />,
    },
    {
      key: "opening",
      label: t.openingBalance,
      className: "w-[160px]",
      render: (row) => <MoneyValue value={row.openingBalance} label={t.sar} />,
    },
    {
      key: "bank",
      label: t.bankName,
      className: "w-[220px]",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{row.bankName || "—"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground tabular-nums">{row.iban || row.bankAccountNumber || "—"}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: t.status,
      className: "w-[150px]",
      render: (row) => <StatusBadge value={row.status} label={row.status === "active" ? t.active : t.inactive} />,
    },
    {
      key: "updated",
      label: t.newest,
      className: "w-[140px]",
      render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{formatDate(row.updatedAt)}</span>,
    },
    {
      key: "actions",
      label: t.actions,
      className: "w-[230px]",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openEdit(row)}>
            <Edit3 className="h-4 w-4" />
            {mode === "edit" && form.id === row.id ? config.editLabel : t.save.replace(t.save, locale === "ar" ? "تعديل" : "Edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => void toggleStatus(row)}
            disabled={saving}
          >
            {row.status === "active" ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
            {row.status === "active" ? t.deactivate : t.activate}
          </Button>
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
        <Card className="mx-auto max-w-[900px] rounded-3xl border-destructive/30 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="h-5 w-5" />
              {config.errorTitle}
            </CardTitle>
            <CardDescription>{error || t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void loadRows()} className="rounded-xl" disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <Link
                  href="/company/treasury"
                  className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {t.back}
                </Link>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.moduleBadge}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{config.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{config.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => void loadRows({ silent: true })} disabled={refreshing}>
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={printPage}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button className="rounded-xl" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  {config.addLabel}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <Card className="rounded-2xl border-amber-200/70 bg-amber-50/70 text-amber-950 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <TriangleAlert className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t.operationalHintTitle}</p>
              <p className="mt-1 text-sm opacity-80">{config.operationalHint}</p>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalAccounts} value={stats.total} description={config.title} icon={PageIcon} t={t} />
          <KpiCard title={t.activeAccounts} value={stats.active} description={t.active} icon={ShieldCheck} t={t} />
          <KpiCard title={t.inactiveAccounts} value={stats.inactive} description={t.inactive} icon={ToggleLeft} t={t} />
          <KpiCard title={t.totalBalance} value={stats.balance} description={t.currentBalance} icon={WalletCards} money t={t} />
        </div>
        {formVisible ? (
          <AccountFormCard
            variant={variant}
            mode={mode}
            form={form}
            saving={saving}
            locale={locale}
            onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
            onSubmit={() => void submitForm()}
            onCancel={closeForm}
          />
        ) : null}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{config.tableTitle}</CardTitle>
            <CardDescription>{config.tableDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={config.searchPlaceholder}
                    className="h-10 rounded-xl bg-background ps-9"
                  />
                </div>
                <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="active">{t.active}</SelectItem>
                    <SelectItem value="inactive">{t.inactive}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[170px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balance_high">{t.balanceHigh}</SelectItem>
                    <SelectItem value="balance_low">{t.balanceLow}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                    <SelectItem value="code">{t.codeSort}</SelectItem>
                    <SelectItem value="updated">{t.newest}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
            <DataTable
              rows={filteredRows}
              allRowsCount={rows.length}
              columns={columns}
              rowKey={(row) => row.id}
              emptyTitle={config.noDataTitle}
              emptyDescription={config.noDataDesc}
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
    </main>
  );
}
