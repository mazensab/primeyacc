"use client";

/* ============================================================
   📂 app/system/accounting/cost-centers/[id]/page.tsx
   🧾 Primey Care — Accounting Cost Center Details
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders detail pattern
   ✅ Real API:
      GET /api/accounting/cost-centers/{id}/
      fallback:
      GET /api/accounting/reports/cost-centers/{id}/
      GET /api/accounting/cost_centers/{id}/
      GET /api/accounting/ledger/?cost_center_id={id}
      fallback:
      GET /api/accounting/journals/?cost_center_id={id}
   ✅ Profile side card + KPI cards + related movements table
   ✅ Search / type / sort / columns / pagination
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Not Found / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Copy,
  Eye,
  FileSpreadsheet,
  FolderTree,
  Loader2,
  Printer,
  ReceiptText,
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
  item?: unknown;
  cost_center?: unknown;
  costCenter?: unknown;
  summary?: unknown;
  result?: unknown;
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

type MovementType = "debit" | "credit" | "balanced" | "unknown";
type MovementFilter = "all" | MovementType;

type SortKey =
  | "newest"
  | "oldest"
  | "reference"
  | "debit_high"
  | "credit_high"
  | "amount_high";

type ColumnKey =
  | "reference"
  | "date"
  | "description"
  | "account"
  | "type"
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
  parent_id: string;
  parent_name: string;
  accounts_count: number;
  transactions_count: number;
  total_debit: number;
  total_credit: number;
  balance: number;
  budget_amount: number;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
};

type MovementRecord = {
  id: string;
  reference: string;
  date: string | null;
  description: string;
  account_id: string;
  account_code: string;
  account_name: string;
  journal_id: string;
  journal_number: string;
  type: MovementType;
  debit: number;
  credit: number;
  balance: number;
  created_at: string | null;
};

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  reference: true,
  date: true,
  description: true,
  account: true,
  type: true,
  debit: true,
  credit: true,
  balance: true,
  actions: true,
};

const translations = {
  ar: {
    title: "تفاصيل مركز التكلفة",
    subtitle: "عرض بيانات مركز التكلفة والحركات المحاسبية المرتبطة به.",
    back: "مراكز التكلفة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    copy: "نسخ",
    copied: "تم النسخ.",
    openDetails: "فتح التفاصيل",

    profileTitle: "بطاقة مركز التكلفة",
    profileDesc: "ملخص المركز والحالة والربط.",
    infoTitle: "بيانات مركز التكلفة",
    infoDesc: "النوع، المسؤول، المركز الأب والملاحظات.",
    movementsTitle: "حركات مركز التكلفة",
    movementsDesc: "الحركات والقيود المحاسبية المرتبطة بهذا المركز.",

    totalDebit: "إجمالي المدين",
    totalCredit: "إجمالي الدائن",
    totalBalance: "الرصيد",
    budget: "الميزانية",
    transactions: "الحركات",

    center: "مركز التكلفة",
    code: "الكود",
    type: "النوع",
    status: "الحالة",
    manager: "المسؤول",
    parent: "المركز الأب",
    accounts: "الحسابات",
    notes: "الملاحظات",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",

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

    all: "الكل",
    movementType: "نوع الحركة",
    debitType: "مدين",
    creditType: "دائن",
    balancedType: "متوازنة",
    searchPlaceholder: "ابحث برقم المرجع أو الوصف أو الحساب...",
    sort: "الترتيب",
    columns: "الأعمدة",
    rowsPerPage: "عدد الصفوف",

    reference: "المرجع",
    date: "التاريخ",
    description: "الوصف",
    account: "الحساب",
    debit: "مدين",
    credit: "دائن",
    balance: "الرصيد",
    actions: "الإجراءات",

    newest: "الأحدث",
    oldest: "الأقدم",
    referenceSort: "المرجع",
    debitHigh: "الأعلى مدين",
    creditHigh: "الأعلى دائن",
    amountHigh: "الأعلى مبلغًا",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    page: "صفحة",
    previous: "السابق",
    next: "التالي",

    noDataTitle: "لا توجد حركات مرتبطة",
    noDataDesc: "ستظهر الحركات المحاسبية المرتبطة بمركز التكلفة هنا.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل تفاصيل مركز التكلفة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    notFoundTitle: "مركز التكلفة غير موجود",
    notFoundDesc: "لم يتم العثور على مركز التكلفة المطلوب أو ربما تم حذفه.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث تفاصيل مركز التكلفة.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير تفاصيل مركز التكلفة",
    generatedAt: "تاريخ الطباعة",
    sar: "ر.س",
    notAvailable: "—",
  },
  en: {
    title: "Cost Center Details",
    subtitle: "View cost center details and related accounting movements.",
    back: "Cost centers",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    copy: "Copy",
    copied: "Copied.",
    openDetails: "Open details",

    profileTitle: "Cost center card",
    profileDesc: "Center summary, status, and linking.",
    infoTitle: "Cost center information",
    infoDesc: "Type, manager, parent center, and notes.",
    movementsTitle: "Cost center movements",
    movementsDesc: "Accounting movements and journal entries linked to this center.",

    totalDebit: "Total debit",
    totalCredit: "Total credit",
    totalBalance: "Balance",
    budget: "Budget",
    transactions: "Transactions",

    center: "Cost center",
    code: "Code",
    type: "Type",
    status: "Status",
    manager: "Manager",
    parent: "Parent center",
    accounts: "Accounts",
    notes: "Notes",
    createdAt: "Created at",
    updatedAt: "Updated at",

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

    all: "All",
    movementType: "Movement type",
    debitType: "Debit",
    creditType: "Credit",
    balancedType: "Balanced",
    searchPlaceholder: "Search by reference, description, or account...",
    sort: "Sort",
    columns: "Columns",
    rowsPerPage: "Rows per page",

    reference: "Reference",
    date: "Date",
    description: "Description",
    account: "Account",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    actions: "Actions",

    newest: "Newest",
    oldest: "Oldest",
    referenceSort: "Reference",
    debitHigh: "Highest debit",
    creditHigh: "Highest credit",
    amountHigh: "Highest amount",

    showing: "Showing",
    of: "of",
    rows: "rows",
    page: "Page",
    previous: "Previous",
    next: "Next",

    noDataTitle: "No linked movements",
    noDataDesc: "Accounting movements linked to this cost center will appear here.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load cost center details",
    errorDesc: "Make sure the backend is running, then try again.",
    notFoundTitle: "Cost center not found",
    notFoundDesc: "The requested cost center was not found or may have been deleted.",
    tryAgain: "Try again",
    refreshed: "Cost center details refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Cost center details report",
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

function extractObject(payload: ApiResponse) {
  const candidates = [
    payload.cost_center,
    payload.costCenter,
    payload.item,
    payload.data,
    payload.result,
    payload.summary,
  ];

  for (const candidate of candidates) {
    if (isRecord(candidate)) return candidate;
  }

  return {};
}

function extractArray(payload: ApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  const data = asRecord(payload.data);

  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.movements)) return data.movements;
  if (Array.isArray(data.entries)) return data.entries;
  if (Array.isArray(data.journal_entries)) return data.journal_entries;
  if (Array.isArray(data.ledger)) return data.ledger;

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

function normalizeCostCenter(value: unknown, fallbackId = ""): CostCenterRecord {
  const item = asRecord(value);
  const parent = asRecord(item.parent || item.parent_cost_center || item.parent_center);
  const manager = asRecord(item.manager || item.responsible_user || item.owner);

  const id = normalizeText(item.id || item.pk || item.uuid || fallbackId);
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
    parent_id: normalizeText(item.parent_id || item.parent_cost_center_id || parent.id || parent.pk),
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
    budget_amount: toNumber(item.budget_amount ?? item.estimated_budget ?? item.budget),
    notes: normalizeText(item.notes || item.description || item.internal_notes),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function normalizeMovementType(debit: number, credit: number): MovementType {
  if (debit > credit) return "debit";
  if (credit > debit) return "credit";
  if (debit > 0 || credit > 0) return "balanced";
  return "unknown";
}

function normalizeMovement(value: unknown): MovementRecord {
  const item = asRecord(value);
  const account = asRecord(item.account || item.account_object || item.chart_account);
  const journal = asRecord(item.journal || item.journal_entry || item.entry);

  const debit = toNumber(item.debit ?? item.debit_amount ?? item.total_debit);
  const credit = toNumber(item.credit ?? item.credit_amount ?? item.total_credit);
  const balance = toNumber(item.balance ?? item.running_balance ?? debit - credit);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    reference: normalizeText(
      item.reference ||
        item.reference_number ||
        item.entry_number ||
        item.journal_number ||
        item.code ||
        journal.entry_number ||
        journal.number ||
        journal.code,
    ),
    date:
      normalizeText(item.date || item.entry_date || item.posting_date || item.created_at) ||
      null,
    description: normalizeText(item.description || item.notes || item.memo || journal.description),
    account_id: normalizeText(item.account_id || account.id || account.pk),
    account_code: normalizeText(item.account_code || account.code || account.number),
    account_name: normalizeText(item.account_name || account.name || account.title),
    journal_id: normalizeText(item.journal_id || item.journal_entry_id || journal.id || journal.pk),
    journal_number: normalizeText(
      item.journal_number || item.entry_number || journal.entry_number || journal.number,
    ),
    type: normalizeMovementType(debit, credit),
    debit,
    credit,
    balance,
    created_at: normalizeText(item.created_at) || null,
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

function movementTypeLabel(type: MovementType, locale: Locale) {
  const t = translations[locale];

  if (type === "debit") return t.debitType;
  if (type === "credit") return t.creditType;
  if (type === "balanced") return t.balancedType;

  return t.unknown;
}

function getStatusClass(status: CostCenterStatus) {
  if (status === "active") return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  if (status === "inactive") return "border-slate-500/30 bg-slate-50 text-slate-700 hover:bg-slate-50";
  if (status === "draft") return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  if (status === "archived") return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";

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

function getMovementTypeClass(type: MovementType) {
  if (type === "debit") return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  if (type === "credit") return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  if (type === "balanced") return "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50";

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
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

function MovementTypeBadge({ type, locale }: { type: MovementType; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getMovementTypeClass(type))}
    >
      {movementTypeLabel(type, locale)}
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

function DetailLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-left text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-20 w-full" />
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
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
      </div>
    </div>
  );
}

export default function AccountingCostCenterDetailsPage() {
  const params = useParams<{ id?: string }>();
  const costCenterId = decodeURIComponent(String(params?.id || ""));

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [costCenter, setCostCenter] = React.useState<CostCenterRecord | null>(null);
  const [movements, setMovements] = React.useState<MovementRecord[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notFound, setNotFound] = React.useState(false);

  const [searchInput, setSearchInput] = React.useState("");
  const [movementFilter, setMovementFilter] = React.useState<MovementFilter>("all");
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

  const loadDetails = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");
        setNotFound(false);

        const detailEndpoints = [
          `/api/accounting/cost-centers/${costCenterId}/`,
          `/api/accounting/reports/cost-centers/${costCenterId}/`,
          `/api/accounting/cost_centers/${costCenterId}/`,
        ];

        let detailPayload: ApiResponse | null = null;
        let lastError: unknown = null;

        for (const endpoint of detailEndpoints) {
          try {
            detailPayload = await fetchJson<ApiResponse>(makeApiUrl(endpoint), controller.signal);
            break;
          } catch (caughtError) {
            lastError = caughtError;
          }
        }

        if (!detailPayload) {
          const message = lastError instanceof Error ? lastError.message : "";

          if (message.includes("404") || message.toLowerCase().includes("not found")) {
            setNotFound(true);
            setCostCenter(null);
            setMovements([]);
            return;
          }

          throw lastError instanceof Error ? lastError : new Error(t.errorDesc);
        }

        const centerRecord = normalizeCostCenter(extractObject(detailPayload), costCenterId);
        setCostCenter(centerRecord);

        const ledgerParams = new URLSearchParams({
          page: "1",
          page_size: "500",
          cost_center_id: centerRecord.id || costCenterId,
        });

        const movementEndpoints = [
          "/api/accounting/ledger/",
          "/api/accounting/journals/",
        ];

        let movementRows: MovementRecord[] = [];

        for (const endpoint of movementEndpoints) {
          try {
            const payload = await fetchJson<ApiResponse>(
              makeApiUrl(endpoint, ledgerParams),
              controller.signal,
            );

            movementRows = extractArray(payload).map(normalizeMovement);
            break;
          } catch {
            movementRows = [];
          }
        }

        setMovements(movementRows);

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
    [costCenterId, t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const summary = React.useMemo(() => {
    const debit = movements.length
      ? movements.reduce((sum, movement) => sum + movement.debit, 0)
      : costCenter?.total_debit || 0;

    const credit = movements.length
      ? movements.reduce((sum, movement) => sum + movement.credit, 0)
      : costCenter?.total_credit || 0;

    const balance = movements.length
      ? movements.reduce((sum, movement) => sum + movement.balance, 0)
      : costCenter?.balance || debit - credit;

    return {
      transactions: movements.length || costCenter?.transactions_count || 0,
      debit,
      credit,
      balance,
      budget: costCenter?.budget_amount || 0,
    };
  }, [costCenter, movements]);

  const filteredMovements = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let result = movements.filter((movement) => {
      const matchesSearch =
        !query ||
        movement.reference.toLowerCase().includes(query) ||
        movement.description.toLowerCase().includes(query) ||
        movement.account_code.toLowerCase().includes(query) ||
        movement.account_name.toLowerCase().includes(query) ||
        movement.journal_number.toLowerCase().includes(query);

      const matchesType = movementFilter === "all" || movement.type === movementFilter;

      return matchesSearch && matchesType;
    });

    result = [...result].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.date || a.created_at || "").localeCompare(String(b.date || b.created_at || ""));
      }

      if (sortKey === "reference") return a.reference.localeCompare(b.reference);
      if (sortKey === "debit_high") return b.debit - a.debit;
      if (sortKey === "credit_high") return b.credit - a.credit;
      if (sortKey === "amount_high") return Math.max(b.debit, b.credit) - Math.max(a.debit, a.credit);

      return String(b.date || b.created_at || "").localeCompare(String(a.date || a.created_at || ""));
    });

    return result;
  }, [movements, movementFilter, searchInput, sortKey]);

  React.useEffect(() => {
    setPage(1);
  }, [movementFilter, pageSize, searchInput, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredMovements.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasActiveFilters =
    Boolean(searchInput.trim()) || movementFilter !== "all" || sortKey !== "newest";

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setMovementFilter("all");
    setSortKey("newest");
    setPage(1);
  }

  function columnLabel(key: ColumnKey) {
    if (key === "reference") return t.reference;
    if (key === "date") return t.date;
    if (key === "description") return t.description;
    if (key === "account") return t.account;
    if (key === "type") return t.type;
    if (key === "debit") return t.debit;
    if (key === "credit") return t.credit;
    if (key === "balance") return t.balance;
    return t.actions;
  }

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.success(t.copied);
    }
  }

  function buildExportRows() {
    return filteredMovements.map((movement) => ({
      reference: movement.reference || movement.id || t.notAvailable,
      date: formatDate(movement.date),
      description: movement.description || t.notAvailable,
      account: movement.account_code
        ? `${movement.account_code} - ${movement.account_name || ""}`
        : movement.account_name || t.notAvailable,
      type: movementTypeLabel(movement.type, locale),
      debit: formatMoney(movement.debit),
      credit: formatMoney(movement.credit),
      balance: formatMoney(movement.balance),
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
          <p>${escapeHtml(t.center)}: ${escapeHtml(costCenter?.name || "")}</p>
          <p>${escapeHtml(t.code)}: ${escapeHtml(costCenter?.code || costCenter?.id || "")}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.reference)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.type)}</th>
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
                      <td>${escapeHtml(row.reference)}</td>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.account)}</td>
                      <td>${escapeHtml(row.type)}</td>
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
    link.download = `primey-care-cost-center-${costCenter?.code || costCenterId}-${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;
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
              <p>${escapeHtml(t.center)}: ${escapeHtml(costCenter?.name || "")}</p>
              <p>${escapeHtml(t.code)}: ${escapeHtml(costCenter?.code || costCenter?.id || "")}</p>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.showing)}: ${escapeHtml(rows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.transactions)}</span><strong>${escapeHtml(summary.transactions)}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalDebit)}</span><strong>${escapeHtml(formatMoney(summary.debit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalCredit)}</span><strong>${escapeHtml(formatMoney(summary.credit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalBalance)}</span><strong>${escapeHtml(formatMoney(summary.balance))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.reference)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.type)}</th>
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
                      <td>${escapeHtml(row.reference)}</td>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.account)}</td>
                      <td>${escapeHtml(row.type)}</td>
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

  if (notFound) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted/40">
              <XCircle className="h-7 w-7 text-muted-foreground" />
            </div>

            <div className="space-y-1">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {t.notFoundTitle}
              </h1>
              <p className="text-sm text-muted-foreground">{t.notFoundDesc}</p>
            </div>

            <Button asChild variant="outline" className="h-9 rounded-lg">
              <Link href="/system/accounting/cost-centers">
                <BackIcon className="h-4 w-4" />
                {t.back}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-right">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {costCenter?.name || t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/accounting/cost-centers">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadDetails({ silent: true })}
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
        </div>
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
              onClick={() => void loadDetails()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{t.profileTitle}</CardTitle>
                  <CardDescription>{t.profileDesc}</CardDescription>
                </div>

                <CardAction>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                    <FolderTree className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardAction>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6">
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">
                      {costCenter?.name || t.notAvailable}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground tabular-nums">
                      {costCenter?.code || costCenter?.id || t.notAvailable}
                    </p>
                  </div>

                  <StatusBadge status={costCenter?.status || "unknown"} locale={locale} />
                </div>
              </div>

              <DetailLine
                label={t.code}
                value={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:underline"
                    onClick={() => void copyValue(costCenter?.code || costCenter?.id || "")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {costCenter?.code || costCenter?.id || t.notAvailable}
                  </button>
                }
              />

              <DetailLine
                label={t.type}
                value={<TypeBadge type={costCenter?.type || "other"} locale={locale} />}
              />

              <DetailLine
                label={t.status}
                value={<StatusBadge status={costCenter?.status || "unknown"} locale={locale} />}
              />

              <DetailLine
                label={t.manager}
                value={costCenter?.manager_name || t.notAvailable}
              />

              <DetailLine
                label={t.parent}
                value={costCenter?.parent_name || t.notAvailable}
              />

              <DetailLine
                label={t.accounts}
                value={<span className="tabular-nums">{formatInteger(costCenter?.accounts_count || 0)}</span>}
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.infoTitle}</CardTitle>
              <CardDescription>{t.infoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6">
              <DetailLine
                label={t.createdAt}
                value={<span className="tabular-nums">{formatDateTime(costCenter?.created_at)}</span>}
              />

              <DetailLine
                label={t.updatedAt}
                value={<span className="tabular-nums">{formatDateTime(costCenter?.updated_at)}</span>}
              />

              <div className="rounded-lg border bg-background p-4">
                <p className="mb-2 text-sm font-medium text-foreground">{t.notes}</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {costCenter?.notes || t.notAvailable}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={t.transactions}
              value={formatInteger(summary.transactions)}
              trend={t.movementsTitle}
              icon={ReceiptText}
            />

            <KpiCard
              title={t.totalDebit}
              value={<MoneyValue value={summary.debit} label={t.sar} />}
              trend={t.debit}
              icon={WalletCards}
            />

            <KpiCard
              title={t.totalCredit}
              value={<MoneyValue value={summary.credit} label={t.sar} />}
              trend={t.credit}
              icon={ShieldCheck}
            />

            <KpiCard
              title={t.totalBalance}
              value={<MoneyValue value={summary.balance} label={t.sar} />}
              trend={`${t.budget}: ${formatMoney(summary.budget)}`}
              icon={Building2}
            />
          </div>

          <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
            <CardHeader className="px-4 py-4">
              <CardTitle>{t.movementsTitle}</CardTitle>
              <CardDescription>{t.movementsDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 p-4 pt-0">
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
                    value={movementFilter}
                    onValueChange={(value) => setMovementFilter(value as MovementFilter)}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t.movementType}: {t.all}
                      </SelectItem>
                      <SelectItem value="debit">{t.debitType}</SelectItem>
                      <SelectItem value="credit">{t.creditType}</SelectItem>
                      <SelectItem value="balanced">{t.balancedType}</SelectItem>
                      <SelectItem value="unknown">{t.unknown}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                    <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[165px]">
                      <ArrowUpDown className="h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">{t.newest}</SelectItem>
                      <SelectItem value="oldest">{t.oldest}</SelectItem>
                      <SelectItem value="reference">{t.referenceSort}</SelectItem>
                      <SelectItem value="debit_high">{t.debitHigh}</SelectItem>
                      <SelectItem value="credit_high">{t.creditHigh}</SelectItem>
                      <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
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
                  <Table className="min-w-[1160px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        {columns.reference ? (
                          <TableHead className="h-11 w-[150px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.reference}
                          </TableHead>
                        ) : null}

                        {columns.date ? (
                          <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.date}
                          </TableHead>
                        ) : null}

                        {columns.description ? (
                          <TableHead className="h-11 w-[245px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.description}
                          </TableHead>
                        ) : null}

                        {columns.account ? (
                          <TableHead className="h-11 w-[190px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.account}
                          </TableHead>
                        ) : null}

                        {columns.type ? (
                          <TableHead className="h-11 w-[115px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.type}
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
                          <TableHead className="h-11 w-[80px] whitespace-nowrap px-4 text-center text-xs font-semibold text-muted-foreground">
                            {t.actions}
                          </TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {pageRows.length ? (
                        pageRows.map((movement) => (
                          <TableRow key={movement.id || movement.reference} className="h-[62px]">
                            {columns.reference ? (
                              <TableCell className="h-[62px] w-[150px] overflow-hidden px-4 text-right align-middle">
                                <div className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-foreground">
                                    {movement.reference || movement.id || t.notAvailable}
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                    {movement.journal_number || t.notAvailable}
                                  </span>
                                </div>
                              </TableCell>
                            ) : null}

                            {columns.date ? (
                              <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                                <span className="text-sm text-muted-foreground tabular-nums">
                                  {formatDate(movement.date)}
                                </span>
                              </TableCell>
                            ) : null}

                            {columns.description ? (
                              <TableCell className="h-[62px] w-[245px] overflow-hidden px-4 text-right align-middle">
                                <span className="block truncate text-sm text-muted-foreground">
                                  {movement.description || t.notAvailable}
                                </span>
                              </TableCell>
                            ) : null}

                            {columns.account ? (
                              <TableCell className="h-[62px] w-[190px] overflow-hidden px-4 text-right align-middle">
                                <div className="min-w-0">
                                  <span className="block truncate text-sm font-medium text-foreground">
                                    {movement.account_name || t.notAvailable}
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                    {movement.account_code || t.notAvailable}
                                  </span>
                                </div>
                              </TableCell>
                            ) : null}

                            {columns.type ? (
                              <TableCell className="h-[62px] w-[115px] overflow-hidden px-4 text-right align-middle">
                                <MovementTypeBadge type={movement.type} locale={locale} />
                              </TableCell>
                            ) : null}

                            {columns.debit ? (
                              <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                                <MoneyValue value={movement.debit} label={t.sar} />
                              </TableCell>
                            ) : null}

                            {columns.credit ? (
                              <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                                <MoneyValue value={movement.credit} label={t.sar} />
                              </TableCell>
                            ) : null}

                            {columns.balance ? (
                              <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                                <MoneyValue value={movement.balance} label={t.sar} />
                              </TableCell>
                            ) : null}

                            {columns.actions ? (
                              <TableCell className="h-[62px] w-[80px] overflow-hidden px-4 text-center align-middle">
                                {movement.journal_id ? (
                                  <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                                    <Link
                                      href={`/system/accounting/journals/${encodeURIComponent(movement.journal_id)}`}
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
                    {formatInteger(filteredMovements.length)}
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
                    <span className="mx-1 tabular-nums">
                      {formatInteger(currentPage)}
                    </span>{" "}
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
      </div>
    </div>
  );
}