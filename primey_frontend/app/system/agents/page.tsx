"use client";

/* ============================================================
   📂 primey_frontend/app/system/agents/page.tsx
   👤 Primey Care — Agents Dashboard/List V3 Financial
   ------------------------------------------------------------
   ✅ Approved Premium pattern
   ✅ Real API only: /api/agents/
   ✅ Shows AgentFinancialEntry financial summaries:
      COD_CUSTODY / SALES_COMMISSION / DELIVERY_FEE / BROKER_SHARE
   ✅ Shows amount due from agents / due to agents / net balance
   ✅ Search row + filters/columns row
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
  Banknote,
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
  Truck,
  UserRound,
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

type AgentStatus = "all" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DRAFT";
type CommissionTypeFilter = "all" | "PERCENTAGE" | "FIXED";
type BrokerFilter = "all" | "with_broker" | "without_broker";
type BalanceFilter = "all" | "has_balance" | "cod_custody" | "clear_balance";

type SortKey =
  | "name"
  | "newest"
  | "highest_sales"
  | "highest_orders"
  | "highest_commission"
  | "highest_paid"
  | "highest_cod_custody"
  | "highest_due_from"
  | "highest_due_to"
  | "highest_net_balance";

type ColumnKey =
  | "select"
  | "agent"
  | "contact"
  | "broker"
  | "city"
  | "commissionType"
  | "commissionValue"
  | "orders"
  | "customers"
  | "sales"
  | "codCustody"
  | "salesCommission"
  | "deliveryFee"
  | "dueFromAgent"
  | "dueToAgent"
  | "netBalance"
  | "accountingPosted"
  | "status"
  | "createdAt"
  | "actions";

type FinancialSummary = {
  financial_entries_count: number;
  accounting_posted_count: number;

  total_debit_amount: number;
  total_credit_amount: number;
  total_debit_paid_amount: number;
  total_credit_paid_amount: number;
  total_debit_remaining_amount: number;
  total_credit_remaining_amount: number;
  net_balance_amount: number;

  cod_custody_amount: number;
  cod_custody_paid_amount: number;
  cod_custody_remaining_amount: number;

  sales_commission_amount: number;
  sales_commission_paid_amount: number;
  sales_commission_remaining_amount: number;

  delivery_fee_amount: number;
  delivery_fee_paid_amount: number;
  delivery_fee_remaining_amount: number;

  broker_share_amount: number;
  broker_share_paid_amount: number;
  broker_share_remaining_amount: number;

  amount_due_from_agent: number;
  amount_due_to_agent: number;
};

type AgentRecord = {
  id: number;
  full_name: string;
  name: string;
  agent_code: string;
  code: string;
  referral_code: string;
  status: string;
  phone: string;
  email: string;
  city: string;
  address: string;

  broker_id: number | null;
  broker_name: string;
  broker_code: string;

  default_commission_type: string;
  default_commission_value: number;
  default_delivery_fee: number;

  bank_name: string;
  bank_account_name: string;
  iban: string;
  notes: string;

  total_customers: number;
  customers_count: number;
  total_orders: number;
  orders_count: number;
  total_sales: number;
  sales_total: number;

  pending_commission: number;
  approved_commission: number;
  paid_commission: number;
  accounting_posted_commission: number;

  financial: FinancialSummary;

  created_at: string | null;
  updated_at: string | null;
};

type AgentsStats = {
  total_agents: number;
  active_agents: number;
  inactive_agents: number;
  suspended_agents: number;
  draft_agents: number;

  total_sales: number;
  total_commission: number;
  total_paid: number;

  financial_entries_count: number;
  accounting_posted_count: number;

  cod_custody_amount: number;
  cod_custody_remaining_amount: number;

  sales_commission_amount: number;
  sales_commission_remaining_amount: number;

  delivery_fee_amount: number;
  delivery_fee_remaining_amount: number;

  amount_due_from_agents: number;
  amount_due_to_agents: number;
  net_balance_amount: number;
};

type AgentsApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    items?: unknown[];
    results?: unknown[];
    stats?: unknown;
    pagination?: unknown;
  };
  items?: unknown[];
  results?: unknown[];
  stats?: unknown;
  count?: number;
};

const SAR_ICON = "/currency/sar.svg";

const EMPTY_FINANCIAL: FinancialSummary = {
  financial_entries_count: 0,
  accounting_posted_count: 0,

  total_debit_amount: 0,
  total_credit_amount: 0,
  total_debit_paid_amount: 0,
  total_credit_paid_amount: 0,
  total_debit_remaining_amount: 0,
  total_credit_remaining_amount: 0,
  net_balance_amount: 0,

  cod_custody_amount: 0,
  cod_custody_paid_amount: 0,
  cod_custody_remaining_amount: 0,

  sales_commission_amount: 0,
  sales_commission_paid_amount: 0,
  sales_commission_remaining_amount: 0,

  delivery_fee_amount: 0,
  delivery_fee_paid_amount: 0,
  delivery_fee_remaining_amount: 0,

  broker_share_amount: 0,
  broker_share_paid_amount: 0,
  broker_share_remaining_amount: 0,

  amount_due_from_agent: 0,
  amount_due_to_agent: 0,
};

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  agent: true,
  contact: true,
  broker: true,
  city: true,
  commissionType: true,
  commissionValue: true,
  orders: true,
  customers: false,
  sales: true,
  codCustody: true,
  salesCommission: true,
  deliveryFee: true,
  dueFromAgent: true,
  dueToAgent: true,
  netBalance: true,
  accountingPosted: true,
  status: true,
  createdAt: false,
  actions: true,
};

const translations = {
  ar: {
    title: "المندوبين",
    subtitle:
      "إدارة المندوبين، أكواد الإحالة، العهد، المستحقات، عمولات البيع، ومبالغ التوصيل.",
    create: "إنشاء مندوب",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث باسم المندوب، الكود، الجوال، المدينة، أو الوسيط...",
    totalAgents: "إجمالي المندوبين",
    activeAgents: "النشطون",
    totalSales: "إجمالي المبيعات",
    totalCommission: "العمولات القديمة",
    paidCommission: "المدفوع قديمًا",
    codCustody: "عهدة COD",
    codCustodyRemaining: "عهدة COD المتبقية",
    salesCommission: "عمولة البيع",
    salesCommissionRemaining: "عمولة البيع المتبقية",
    deliveryFee: "مستحق التوصيل",
    deliveryFeeRemaining: "مستحق التوصيل المتبقي",
    dueFromAgents: "المستحق على المندوبين",
    dueToAgents: "المستحق للمندوبين",
    netBalance: "صافي الرصيد",
    accountingPosted: "مرحّل محاسبيًا",
    financialEntries: "الحركات المالية",
    agent: "المندوب",
    contact: "التواصل",
    broker: "الوسيط",
    city: "المدينة",
    commissionType: "نوع العمولة",
    commissionValue: "قيمة العمولة",
    orders: "الطلبات",
    customers: "العملاء",
    sales: "المبيعات",
    dueFromAgent: "عليه",
    dueToAgent: "له",
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
    allBrokers: "كل الوسطاء",
    withBroker: "مرتبط بوسيط",
    withoutBroker: "بدون وسيط",
    allBalances: "كل الأرصدة",
    hasBalance: "لديه حركات مالية",
    hasCodCustody: "لديه عهدة COD",
    clearBalance: "رصيده صفر",
    nameSort: "الاسم",
    newest: "الأحدث",
    highestSales: "الأعلى مبيعات",
    highestOrders: "الأعلى طلبات",
    highestCommission: "الأعلى عمولات",
    highestPaid: "الأعلى مدفوع",
    highestCodCustody: "الأعلى عهدة",
    highestDueFrom: "الأعلى عليه",
    highestDueTo: "الأعلى له",
    highestNetBalance: "الأعلى صافي",
    clearSelection: "إلغاء التحديد",
    activeFilters: "فلاتر مفعلة",
    view: "عرض التفاصيل",
    copyCode: "نسخ كود المندوب",
    copyReferral: "نسخ كود الإحالة",
    copied: "تم النسخ",
    noDataTitle: "لا يوجد مندوبين بعد",
    noDataDesc: "عند إنشاء المندوبين سيظهرون هنا.",
    noResultsTitle: "لا توجد نتائج",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل المندوبين",
    errorDesc: "تأكد من تشغيل الخادم ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    showing: "عرض",
    of: "من",
    rows: "سجل",
    page: "صفحة",
    previous: "السابق",
    next: "التالي",
    generatedAt: "تاريخ الإنشاء",
    printTitle: "تقرير المندوبين",
    unknown: "غير معروف",
  },
  en: {
    title: "Agents",
    subtitle:
      "Manage agents, referral codes, custody, dues, sales commissions, and delivery dues.",
    create: "Create agent",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    searchPlaceholder: "Search by agent, code, phone, city, or broker...",
    totalAgents: "Total agents",
    activeAgents: "Active agents",
    totalSales: "Total sales",
    totalCommission: "Legacy commissions",
    paidCommission: "Legacy paid",
    codCustody: "COD custody",
    codCustodyRemaining: "Remaining COD custody",
    salesCommission: "Sales commission",
    salesCommissionRemaining: "Remaining sales commission",
    deliveryFee: "Delivery due",
    deliveryFeeRemaining: "Remaining delivery due",
    dueFromAgents: "Due from agents",
    dueToAgents: "Due to agents",
    netBalance: "Net balance",
    accountingPosted: "Accounting posted",
    financialEntries: "Financial entries",
    agent: "Agent",
    contact: "Contact",
    broker: "Broker",
    city: "City",
    commissionType: "Commission type",
    commissionValue: "Commission value",
    orders: "Orders",
    customers: "Customers",
    sales: "Sales",
    dueFromAgent: "Due from",
    dueToAgent: "Due to",
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
    allBrokers: "All brokers",
    withBroker: "With broker",
    withoutBroker: "Without broker",
    allBalances: "All balances",
    hasBalance: "Has financial entries",
    hasCodCustody: "Has COD custody",
    clearBalance: "Zero balance",
    nameSort: "Name",
    newest: "Newest",
    highestSales: "Highest sales",
    highestOrders: "Highest orders",
    highestCommission: "Highest commissions",
    highestPaid: "Highest paid",
    highestCodCustody: "Highest custody",
    highestDueFrom: "Highest due from",
    highestDueTo: "Highest due to",
    highestNetBalance: "Highest net",
    clearSelection: "Clear selection",
    activeFilters: "Active filters",
    view: "View details",
    copyCode: "Copy agent code",
    copyReferral: "Copy referral code",
    copied: "Copied",
    noDataTitle: "No agents yet",
    noDataDesc: "Agents will appear here after creation.",
    noResultsTitle: "No results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load agents",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    showing: "Showing",
    of: "of",
    rows: "rows",
    page: "Page",
    previous: "Previous",
    next: "Next",
    generatedAt: "Generated at",
    printTitle: "Agents report",
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
  const base = getApiBaseUrl();
  const query = params?.toString();

  return `${base}${path}${query ? `?${query}` : ""}`;
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

function normalizeFinancialSummary(value: unknown): FinancialSummary {
  const item = asRecord(value);

  return {
    financial_entries_count: toNumber(item.financial_entries_count),
    accounting_posted_count: toNumber(item.accounting_posted_count),

    total_debit_amount: toNumber(item.total_debit_amount),
    total_credit_amount: toNumber(item.total_credit_amount),
    total_debit_paid_amount: toNumber(item.total_debit_paid_amount),
    total_credit_paid_amount: toNumber(item.total_credit_paid_amount),
    total_debit_remaining_amount: toNumber(item.total_debit_remaining_amount),
    total_credit_remaining_amount: toNumber(item.total_credit_remaining_amount),
    net_balance_amount: toNumber(item.net_balance_amount),

    cod_custody_amount: toNumber(item.cod_custody_amount),
    cod_custody_paid_amount: toNumber(item.cod_custody_paid_amount),
    cod_custody_remaining_amount: toNumber(item.cod_custody_remaining_amount),

    sales_commission_amount: toNumber(item.sales_commission_amount),
    sales_commission_paid_amount: toNumber(item.sales_commission_paid_amount),
    sales_commission_remaining_amount: toNumber(item.sales_commission_remaining_amount),

    delivery_fee_amount: toNumber(item.delivery_fee_amount),
    delivery_fee_paid_amount: toNumber(item.delivery_fee_paid_amount),
    delivery_fee_remaining_amount: toNumber(item.delivery_fee_remaining_amount),

    broker_share_amount: toNumber(item.broker_share_amount),
    broker_share_paid_amount: toNumber(item.broker_share_paid_amount),
    broker_share_remaining_amount: toNumber(item.broker_share_remaining_amount),

    amount_due_from_agent: toNumber(
      item.amount_due_from_agent || item.amount_due_from_agents,
    ),
    amount_due_to_agent: toNumber(
      item.amount_due_to_agent || item.amount_due_to_agents,
    ),
  };
}

function normalizeAgent(value: unknown): AgentRecord {
  const item = asRecord(value);
  const financial = normalizeFinancialSummary(item.financial_summary || item);

  const fullName = normalizeText(
    item.full_name || item.name || item.agent_name,
    `#${normalizeText(item.id)}`,
  );
  const agentCode = normalizeText(item.agent_code || item.code);

  return {
    id: toNumber(item.id),
    full_name: fullName,
    name: fullName,
    agent_code: agentCode,
    code: agentCode,
    referral_code: normalizeText(item.referral_code || item.ref_code),
    status: normalizeText(item.status).toUpperCase(),
    phone: normalizeText(item.phone || item.mobile || item.phone_number),
    email: normalizeText(item.email),
    city: normalizeText(item.city),
    address: normalizeText(item.address),

    broker_id:
      item.broker_id === null || item.broker_id === undefined
        ? null
        : toNumber(item.broker_id),
    broker_name: normalizeText(item.broker_name || asRecord(item.broker).name),
    broker_code: normalizeText(item.broker_code || asRecord(item.broker).broker_code),

    default_commission_type: normalizeText(
      item.default_commission_type || item.commission_type,
    ).toUpperCase(),
    default_commission_value: toNumber(
      item.default_commission_value || item.commission_value,
    ),
    default_delivery_fee: toNumber(item.default_delivery_fee),

    bank_name: normalizeText(item.bank_name),
    bank_account_name: normalizeText(item.bank_account_name),
    iban: normalizeText(item.iban),
    notes: normalizeText(item.notes),

    total_customers: toNumber(item.total_customers || item.customers_count),
    customers_count: toNumber(item.customers_count || item.total_customers),
    total_orders: toNumber(item.total_orders || item.orders_count),
    orders_count: toNumber(item.orders_count || item.total_orders),
    total_sales: toNumber(item.total_sales || item.sales_total),
    sales_total: toNumber(item.sales_total || item.total_sales),

    pending_commission: toNumber(item.pending_commission),
    approved_commission: toNumber(item.approved_commission),
    paid_commission: toNumber(item.paid_commission),
    accounting_posted_commission: toNumber(item.accounting_posted_commission),

    financial,

    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function extractAgents(payload: AgentsApiResponse): AgentRecord[] {
  const data = asRecord(payload.data);
  const candidates = [data.results, data.items, payload.results, payload.items];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(normalizeAgent);
  }

  return [];
}

function normalizeAgentsStats(value: unknown, rows: AgentRecord[]): AgentsStats {
  const item = asRecord(value);
  const totalCommissionFallback = rows.reduce(
    (sum, agent) =>
      sum +
      agent.pending_commission +
      agent.approved_commission +
      agent.paid_commission,
    0,
  );

  return {
    total_agents: toNumber(item.total_agents, rows.length),
    active_agents: toNumber(
      item.active_agents,
      rows.filter((agent) => agent.status === "ACTIVE").length,
    ),
    inactive_agents: toNumber(
      item.inactive_agents,
      rows.filter((agent) => agent.status === "INACTIVE").length,
    ),
    suspended_agents: toNumber(
      item.suspended_agents,
      rows.filter((agent) => agent.status === "SUSPENDED").length,
    ),
    draft_agents: toNumber(
      item.draft_agents,
      rows.filter((agent) => agent.status === "DRAFT").length,
    ),

    total_sales: toNumber(
      item.total_sales,
      rows.reduce((sum, agent) => sum + agent.total_sales, 0),
    ),
    total_commission: toNumber(item.total_commission, totalCommissionFallback),
    total_paid: toNumber(
      item.total_paid,
      rows.reduce((sum, agent) => sum + agent.paid_commission, 0),
    ),

    financial_entries_count: toNumber(
      item.financial_entries_count,
      rows.reduce((sum, agent) => sum + agent.financial.financial_entries_count, 0),
    ),
    accounting_posted_count: toNumber(
      item.accounting_posted_count,
      rows.reduce((sum, agent) => sum + agent.financial.accounting_posted_count, 0),
    ),

    cod_custody_amount: toNumber(
      item.cod_custody_amount,
      rows.reduce((sum, agent) => sum + agent.financial.cod_custody_amount, 0),
    ),
    cod_custody_remaining_amount: toNumber(
      item.cod_custody_remaining_amount,
      rows.reduce(
        (sum, agent) => sum + agent.financial.cod_custody_remaining_amount,
        0,
      ),
    ),

    sales_commission_amount: toNumber(
      item.sales_commission_amount,
      rows.reduce((sum, agent) => sum + agent.financial.sales_commission_amount, 0),
    ),
    sales_commission_remaining_amount: toNumber(
      item.sales_commission_remaining_amount,
      rows.reduce(
        (sum, agent) => sum + agent.financial.sales_commission_remaining_amount,
        0,
      ),
    ),

    delivery_fee_amount: toNumber(
      item.delivery_fee_amount,
      rows.reduce((sum, agent) => sum + agent.financial.delivery_fee_amount, 0),
    ),
    delivery_fee_remaining_amount: toNumber(
      item.delivery_fee_remaining_amount,
      rows.reduce(
        (sum, agent) => sum + agent.financial.delivery_fee_remaining_amount,
        0,
      ),
    ),

    amount_due_from_agents: toNumber(
      item.amount_due_from_agents || item.amount_due_from_agent,
      rows.reduce((sum, agent) => sum + agent.financial.amount_due_from_agent, 0),
    ),
    amount_due_to_agents: toNumber(
      item.amount_due_to_agents || item.amount_due_to_agent,
      rows.reduce((sum, agent) => sum + agent.financial.amount_due_to_agent, 0),
    ),
    net_balance_amount: toNumber(
      item.net_balance_amount,
      rows.reduce((sum, agent) => sum + agent.financial.net_balance_amount, 0),
    ),
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

function MoneyValue({ value }: { value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums text-foreground">
      <span>{formatMoney(value)}</span>
      <SarIcon />
    </span>
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
  tone?: "default" | "debit" | "credit" | "net" | "success";
}) {
  const toneClass =
    tone === "debit"
      ? "bg-red-50 text-red-700"
      : tone === "credit"
        ? "bg-emerald-50 text-emerald-700"
        : tone === "net"
          ? "bg-purple-50 text-purple-700"
          : tone === "success"
            ? "bg-blue-50 text-blue-700"
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

function AgentsSkeleton() {
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
        {Array.from({ length: 8 }).map((_, index) => (
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

export default function SystemAgentsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [agents, setAgents] = React.useState<AgentRecord[]>([]);
  const [stats, setStats] = React.useState<AgentsStats>(() =>
    normalizeAgentsStats({}, []),
  );
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<AgentStatus>("all");
  const [commissionTypeFilter, setCommissionTypeFilter] =
    React.useState<CommissionTypeFilter>("all");
  const [cityFilter, setCityFilter] = React.useState("all");
  const [brokerFilter, setBrokerFilter] = React.useState<BrokerFilter>("all");
  const [balanceFilter, setBalanceFilter] = React.useState<BalanceFilter>("all");
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

  const loadAgents = React.useCallback(
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

        const payload = await fetchJson<AgentsApiResponse>(
          makeApiUrl("/api/agents/", params),
          controller.signal,
        );

        const nextAgents = extractAgents(payload);
        const data = asRecord(payload.data);
        const nextStats = normalizeAgentsStats(
          data.stats || payload.stats,
          nextAgents,
        );

        setAgents(nextAgents);
        setStats(nextStats);
        setSelectedIds([]);
        setPage(1);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setAgents([]);
        setStats(normalizeAgentsStats({}, []));
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
    void loadAgents();
  }, [loadAgents]);

  const availableCities = React.useMemo(() => {
    const cities = new Set<string>();

    agents.forEach((agent) => {
      if (agent.city) cities.add(agent.city);
    });

    return Array.from(cities).sort((a, b) => a.localeCompare(b));
  }, [agents]);

  const filteredAgents = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = agents.filter((agent) => {
      const status = normalizeText(agent.status).toUpperCase();
      const commissionType = normalizeText(agent.default_commission_type).toUpperCase();

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (commissionTypeFilter !== "all" && commissionType !== commissionTypeFilter) {
        return false;
      }
      if (cityFilter !== "all" && agent.city !== cityFilter) return false;

      if (brokerFilter === "with_broker" && !agent.broker_id) return false;
      if (brokerFilter === "without_broker" && agent.broker_id) return false;

      if (
        balanceFilter === "has_balance" &&
        agent.financial.financial_entries_count <= 0
      ) {
        return false;
      }

      if (
        balanceFilter === "cod_custody" &&
        agent.financial.cod_custody_remaining_amount <= 0
      ) {
        return false;
      }

      if (
        balanceFilter === "clear_balance" &&
        Math.abs(agent.financial.net_balance_amount) > 0
      ) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        agent.full_name,
        agent.agent_code,
        agent.referral_code,
        agent.phone,
        agent.email,
        agent.city,
        agent.address,
        agent.broker_name,
        agent.broker_code,
        agent.bank_name,
        agent.iban,
        agent.notes,
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

      if (sortKey === "highest_sales") return b.total_sales - a.total_sales;
      if (sortKey === "highest_orders") return b.total_orders - a.total_orders;

      if (sortKey === "highest_commission") {
        const bTotal =
          b.pending_commission + b.approved_commission + b.paid_commission;
        const aTotal =
          a.pending_commission + a.approved_commission + a.paid_commission;
        return bTotal - aTotal;
      }

      if (sortKey === "highest_paid") return b.paid_commission - a.paid_commission;
      if (sortKey === "highest_cod_custody") {
        return (
          b.financial.cod_custody_remaining_amount -
          a.financial.cod_custody_remaining_amount
        );
      }
      if (sortKey === "highest_due_from") {
        return b.financial.amount_due_from_agent - a.financial.amount_due_from_agent;
      }
      if (sortKey === "highest_due_to") {
        return b.financial.amount_due_to_agent - a.financial.amount_due_to_agent;
      }
      if (sortKey === "highest_net_balance") {
        return b.financial.net_balance_amount - a.financial.net_balance_amount;
      }

      return normalizeText(a.full_name).localeCompare(normalizeText(b.full_name));
    });
  }, [
    agents,
    balanceFilter,
    brokerFilter,
    cityFilter,
    commissionTypeFilter,
    search,
    sortKey,
    statusFilter,
  ]);

  const filteredStats = React.useMemo(
    () => normalizeAgentsStats({}, filteredAgents),
    [filteredAgents],
  );

  const totalPages = Math.max(Math.ceil(filteredAgents.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);

  const paginatedAgents = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgents.slice(start, start + pageSize);
  }, [currentPage, filteredAgents]);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    commissionTypeFilter !== "all" ||
    cityFilter !== "all" ||
    brokerFilter !== "all" ||
    balanceFilter !== "all" ||
    sortKey !== "name";

  const allPageSelected =
    paginatedAgents.length > 0 &&
    paginatedAgents.every((agent) => selectedIds.includes(agent.id));

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setCommissionTypeFilter("all");
    setCityFilter("all");
    setBrokerFilter("all");
    setBalanceFilter("all");
    setSortKey("name");
    setSelectedIds([]);
    setPage(1);
  }

  function toggleSelectAgent(agentId: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, agentId]));
      return current.filter((id) => id !== agentId);
    });
  }

  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds((current) =>
        current.filter((id) => !paginatedAgents.some((agent) => agent.id === id)),
      );
      return;
    }

    setSelectedIds((current) =>
      Array.from(new Set([...current, ...paginatedAgents.map((agent) => agent.id)])),
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
      ? filteredAgents.filter((agent) => selectedIds.includes(agent.id))
      : filteredAgents;

    const headers = [
      t.agent,
      t.contact,
      t.broker,
      t.city,
      t.commissionType,
      t.commissionValue,
      t.orders,
      t.customers,
      t.sales,
      t.codCustody,
      t.salesCommission,
      t.deliveryFee,
      t.dueFromAgent,
      t.dueToAgent,
      t.netBalance,
      t.accountingPosted,
      t.status,
      t.createdAt,
    ];

    const bodyRows = selectedRows.map((agent) => [
      agent.full_name,
      agent.phone || agent.email || "",
      agent.broker_name || "",
      agent.city || "",
      getCommissionTypeLabel(agent.default_commission_type, locale),
      agent.default_commission_type === "PERCENTAGE"
        ? `${formatMoney(agent.default_commission_value)}%`
        : formatMoney(agent.default_commission_value),
      formatInteger(agent.total_orders),
      formatInteger(agent.total_customers),
      formatMoney(agent.total_sales),
      formatMoney(agent.financial.cod_custody_remaining_amount),
      formatMoney(agent.financial.sales_commission_remaining_amount),
      formatMoney(agent.financial.delivery_fee_remaining_amount),
      formatMoney(agent.financial.amount_due_from_agent),
      formatMoney(agent.financial.amount_due_to_agent),
      formatMoney(agent.financial.net_balance_amount),
      formatInteger(agent.financial.accounting_posted_count),
      getStatusLabel(agent.status, locale),
      formatDate(agent.created_at),
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
    anchor.download = `primey-care-agents-${new Date().toISOString().slice(0, 10)}.xls`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    const selectedRows = selectedIds.length
      ? filteredAgents.filter((agent) => selectedIds.includes(agent.id))
      : filteredAgents;

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.errorDesc);
      return;
    }

    const rowsHtml = selectedRows.length
      ? selectedRows
          .map(
            (agent) => `
              <tr>
                <td>${escapeHtml(agent.full_name)}</td>
                <td>${escapeHtml(agent.agent_code || "—")}</td>
                <td>${escapeHtml(agent.broker_name || "—")}</td>
                <td>${escapeHtml(agent.city || "—")}</td>
                <td class="num">${escapeHtml(formatInteger(agent.total_orders))}</td>
                <td class="num">${escapeHtml(formatMoney(agent.total_sales))}</td>
                <td class="num">${escapeHtml(formatMoney(agent.financial.cod_custody_remaining_amount))}</td>
                <td class="num">${escapeHtml(formatMoney(agent.financial.amount_due_from_agent))}</td>
                <td class="num">${escapeHtml(formatMoney(agent.financial.amount_due_to_agent))}</td>
                <td class="num">${escapeHtml(formatMoney(agent.financial.net_balance_amount))}</td>
                <td>${escapeHtml(getStatusLabel(agent.status, locale))}</td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="11">${escapeHtml(t.noResultsDesc)}</td></tr>`;

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
            <div class="box"><span>${escapeHtml(t.codCustody)}</span><strong class="num">${escapeHtml(formatMoney(filteredStats.cod_custody_remaining_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.dueFromAgents)}</span><strong class="num">${escapeHtml(formatMoney(filteredStats.amount_due_from_agents))}</strong></div>
            <div class="box"><span>${escapeHtml(t.dueToAgents)}</span><strong class="num">${escapeHtml(formatMoney(filteredStats.amount_due_to_agents))}</strong></div>
            <div class="box"><span>${escapeHtml(t.netBalance)}</span><strong class="num">${escapeHtml(formatMoney(filteredStats.net_balance_amount))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.agent)}</th>
                <th>${escapeHtml(t.agent)} #</th>
                <th>${escapeHtml(t.broker)}</th>
                <th>${escapeHtml(t.city)}</th>
                <th>${escapeHtml(t.orders)}</th>
                <th>${escapeHtml(t.sales)}</th>
                <th>${escapeHtml(t.codCustody)}</th>
                <th>${escapeHtml(t.dueFromAgent)}</th>
                <th>${escapeHtml(t.dueToAgent)}</th>
                <th>${escapeHtml(t.netBalance)}</th>
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
        <AgentsSkeleton />
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
            onClick={() => void loadAgents({ silent: true })}
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
            disabled={!filteredAgents.length}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {t.export}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={printPage}
            disabled={!filteredAgents.length}
          >
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <Button
            asChild
            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
          >
            <Link href="/system/agents/create">
              <Plus className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalAgents}
          value={formatInteger(stats.total_agents)}
          icon={UsersRound}
        />
        <KpiCard
          title={t.activeAgents}
          value={formatInteger(stats.active_agents)}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          title={t.totalSales}
          value={<MoneyValue value={stats.total_sales} />}
          icon={Banknote}
        />
        <KpiCard
          title={t.accountingPosted}
          value={formatInteger(stats.accounting_posted_count)}
          icon={FileSpreadsheet}
          tone="success"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.codCustodyRemaining}
          value={<MoneyValue value={stats.cod_custody_remaining_amount} />}
          icon={WalletCards}
          tone="debit"
        />
        <KpiCard
          title={t.dueFromAgents}
          value={<MoneyValue value={stats.amount_due_from_agents} />}
          icon={WalletCards}
          tone="debit"
        />
        <KpiCard
          title={t.dueToAgents}
          value={<MoneyValue value={stats.amount_due_to_agents} />}
          icon={BadgePercent}
          tone="credit"
        />
        <KpiCard
          title={t.netBalance}
          value={<MoneyValue value={stats.net_balance_amount} />}
          icon={Banknote}
          tone="net"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.salesCommissionRemaining}
          value={<MoneyValue value={stats.sales_commission_remaining_amount} />}
          icon={BadgePercent}
          tone="credit"
        />
        <KpiCard
          title={t.deliveryFeeRemaining}
          value={<MoneyValue value={stats.delivery_fee_remaining_amount} />}
          icon={Truck}
          tone="credit"
        />
        <KpiCard
          title={t.financialEntries}
          value={formatInteger(stats.financial_entries_count)}
          icon={Columns3}
        />
        <KpiCard
          title={t.paidCommission}
          value={<MoneyValue value={stats.total_paid} />}
          icon={ShieldCheck}
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
              onClick={() => void loadAgents()}
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
                    setStatusFilter(value as AgentStatus);
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

                <Select
                  value={brokerFilter}
                  onValueChange={(value) => {
                    setBrokerFilter(value as BrokerFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[155px]">
                    <ShieldCheck className="h-4 w-4" />
                    <SelectValue placeholder={t.broker} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allBrokers}</SelectItem>
                    <SelectItem value="with_broker">{t.withBroker}</SelectItem>
                    <SelectItem value="without_broker">{t.withoutBroker}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={balanceFilter}
                  onValueChange={(value) => {
                    setBalanceFilter(value as BalanceFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[180px]">
                    <WalletCards className="h-4 w-4" />
                    <SelectValue placeholder={t.allBalances} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allBalances}</SelectItem>
                    <SelectItem value="has_balance">{t.hasBalance}</SelectItem>
                    <SelectItem value="cod_custody">{t.hasCodCustody}</SelectItem>
                    <SelectItem value="clear_balance">{t.clearBalance}</SelectItem>
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
                        ["agent", t.agent],
                        ["contact", t.contact],
                        ["broker", t.broker],
                        ["city", t.city],
                        ["commissionType", t.commissionType],
                        ["commissionValue", t.commissionValue],
                        ["orders", t.orders],
                        ["customers", t.customers],
                        ["sales", t.sales],
                        ["codCustody", t.codCustody],
                        ["salesCommission", t.salesCommission],
                        ["deliveryFee", t.deliveryFee],
                        ["dueFromAgent", t.dueFromAgent],
                        ["dueToAgent", t.dueToAgent],
                        ["netBalance", t.netBalance],
                        ["accountingPosted", t.accountingPosted],
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
                  <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-60">
                    {(
                      [
                        ["name", t.nameSort],
                        ["newest", t.newest],
                        ["highest_sales", t.highestSales],
                        ["highest_orders", t.highestOrders],
                        ["highest_commission", t.highestCommission],
                        ["highest_paid", t.highestPaid],
                        ["highest_cod_custody", t.highestCodCustody],
                        ["highest_due_from", t.highestDueFrom],
                        ["highest_due_to", t.highestDueTo],
                        ["highest_net_balance", t.highestNetBalance],
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
              <Table className="min-w-[1900px] table-fixed">
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

                    {visibleColumns.agent ? (
                      <TableHeaderCell className="w-[240px]">
                        <HeaderSortButton
                          active={sortKey === "name"}
                          onClick={() => {
                            setSortKey("name");
                            setPage(1);
                          }}
                        >
                          {t.agent}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.contact ? (
                      <TableHeaderCell className="w-[190px]">{t.contact}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.broker ? (
                      <TableHeaderCell className="w-[170px]">{t.broker}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.city ? (
                      <TableHeaderCell className="w-[120px]">{t.city}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.commissionType ? (
                      <TableHeaderCell className="w-[130px]">{t.commissionType}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.commissionValue ? (
                      <TableHeaderCell className="w-[120px]">{t.commissionValue}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.orders ? (
                      <TableHeaderCell className="w-[95px]">
                        <HeaderSortButton
                          active={sortKey === "highest_orders"}
                          onClick={() => {
                            setSortKey("highest_orders");
                            setPage(1);
                          }}
                        >
                          {t.orders}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.customers ? (
                      <TableHeaderCell className="w-[95px]">{t.customers}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.sales ? (
                      <TableHeaderCell className="w-[130px]">
                        <HeaderSortButton
                          active={sortKey === "highest_sales"}
                          onClick={() => {
                            setSortKey("highest_sales");
                            setPage(1);
                          }}
                        >
                          {t.sales}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.codCustody ? (
                      <TableHeaderCell className="w-[135px]">
                        <HeaderSortButton
                          active={sortKey === "highest_cod_custody"}
                          onClick={() => {
                            setSortKey("highest_cod_custody");
                            setPage(1);
                          }}
                        >
                          {t.codCustody}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.salesCommission ? (
                      <TableHeaderCell className="w-[135px]">{t.salesCommission}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.deliveryFee ? (
                      <TableHeaderCell className="w-[135px]">{t.deliveryFee}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.dueFromAgent ? (
                      <TableHeaderCell className="w-[130px]">
                        <HeaderSortButton
                          active={sortKey === "highest_due_from"}
                          onClick={() => {
                            setSortKey("highest_due_from");
                            setPage(1);
                          }}
                        >
                          {t.dueFromAgent}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.dueToAgent ? (
                      <TableHeaderCell className="w-[130px]">
                        <HeaderSortButton
                          active={sortKey === "highest_due_to"}
                          onClick={() => {
                            setSortKey("highest_due_to");
                            setPage(1);
                          }}
                        >
                          {t.dueToAgent}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.netBalance ? (
                      <TableHeaderCell className="w-[130px]">
                        <HeaderSortButton
                          active={sortKey === "highest_net_balance"}
                          onClick={() => {
                            setSortKey("highest_net_balance");
                            setPage(1);
                          }}
                        >
                          {t.netBalance}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.accountingPosted ? (
                      <TableHeaderCell className="w-[120px]">{t.accountingPosted}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.status ? (
                      <TableHeaderCell className="w-[110px]">{t.status}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.createdAt ? (
                      <TableHeaderCell className="w-[120px]">
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
                  {paginatedAgents.length ? (
                    paginatedAgents.map((agent) => (
                      <TableRow key={agent.id} className="h-[62px]">
                        {visibleColumns.select ? (
                          <TableBodyCell className="w-[46px] px-3">
                            <Checkbox
                              checked={selectedIds.includes(agent.id)}
                              onCheckedChange={(checked) =>
                                toggleSelectAgent(agent.id, Boolean(checked))
                              }
                              aria-label={agent.full_name}
                            />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.agent ? (
                          <TableBodyCell className="w-[240px]">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                                <UserRound className="h-4 w-4 text-muted-foreground" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/system/agents/${agent.id}`}
                                  className="block truncate text-sm font-semibold text-foreground hover:underline"
                                >
                                  {agent.full_name}
                                </Link>
                                <p className="truncate text-xs text-muted-foreground">
                                  {agent.agent_code || "—"} · {agent.referral_code || "—"}
                                </p>
                              </div>
                            </div>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.contact ? (
                          <TableBodyCell className="w-[190px]">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {agent.phone || "—"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {agent.email || "—"}
                              </p>
                            </div>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.broker ? (
                          <TableBodyCell className="w-[170px]">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {agent.broker_name || "—"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {agent.broker_code || "—"}
                              </p>
                            </div>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.city ? (
                          <TableBodyCell className="w-[120px]">
                            <span className="block truncate text-sm text-muted-foreground">
                              {agent.city || "—"}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.commissionType ? (
                          <TableBodyCell className="w-[130px]">
                            <Badge
                              variant="outline"
                              className="max-w-full rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium"
                            >
                              <span className="truncate">
                                {getCommissionTypeLabel(agent.default_commission_type, locale)}
                              </span>
                            </Badge>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.commissionValue ? (
                          <TableBodyCell className="w-[120px]">
                            <span className="block truncate text-sm font-medium tabular-nums">
                              {agent.default_commission_type === "PERCENTAGE"
                                ? `${formatMoney(agent.default_commission_value)}%`
                                : formatMoney(agent.default_commission_value)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.orders ? (
                          <TableBodyCell className="w-[95px]">
                            <span className="block truncate text-sm font-medium tabular-nums">
                              {formatInteger(agent.total_orders)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.customers ? (
                          <TableBodyCell className="w-[95px]">
                            <span className="block truncate text-sm font-medium tabular-nums">
                              {formatInteger(agent.total_customers)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.sales ? (
                          <TableBodyCell className="w-[130px]">
                            <MoneyValue value={agent.total_sales} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.codCustody ? (
                          <TableBodyCell className="w-[135px]">
                            <MoneyValue value={agent.financial.cod_custody_remaining_amount} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.salesCommission ? (
                          <TableBodyCell className="w-[135px]">
                            <MoneyValue value={agent.financial.sales_commission_remaining_amount} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.deliveryFee ? (
                          <TableBodyCell className="w-[135px]">
                            <MoneyValue value={agent.financial.delivery_fee_remaining_amount} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.dueFromAgent ? (
                          <TableBodyCell className="w-[130px]">
                            <MoneyValue value={agent.financial.amount_due_from_agent} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.dueToAgent ? (
                          <TableBodyCell className="w-[130px]">
                            <MoneyValue value={agent.financial.amount_due_to_agent} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.netBalance ? (
                          <TableBodyCell className="w-[130px]">
                            <MoneyValue value={agent.financial.net_balance_amount} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.accountingPosted ? (
                          <TableBodyCell className="w-[120px]">
                            <span className="block truncate text-sm font-medium tabular-nums">
                              {formatInteger(agent.financial.accounting_posted_count)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.status ? (
                          <TableBodyCell className="w-[110px]">
                            <StatusBadge status={agent.status} locale={locale} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.createdAt ? (
                          <TableBodyCell className="w-[120px]">
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {formatDate(agent.created_at)}
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
                                  <Link href={`/system/agents/${agent.id}`}>
                                    <Eye className="h-4 w-4" />
                                    {t.view}
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => void copyValue(agent.agent_code)}
                                >
                                  <Copy className="h-4 w-4" />
                                  {t.copyCode}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => void copyValue(agent.referral_code)}
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
                              <Link href="/system/agents/create">
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
                {formatInteger(paginatedAgents.length)}
              </span>{" "}
              {t.of}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(filteredAgents.length)}
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