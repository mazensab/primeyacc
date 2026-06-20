"use client";

/* ============================================================
   📂 app/system/accounting/account_statement/page.tsx
   🧾 Primey Care — Account Statement
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Customer / Agent account statement
   ✅ Real API first:
      GET /api/accounting/account-statement/
      fallback:
      GET /api/reports/accounting/account-statement/
   ✅ If statement endpoint is unavailable:
      builds statement from real customers, agents, orders, invoices, payments
   ✅ Searchable party selector for customers / agents
   ✅ Search / party type / party selector / date range / movement type
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
  FileSpreadsheet,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  TriangleAlert,
  UserRound,
  UsersRound,
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

type PartyType = "customer" | "agent";
type MovementType =
  | "all"
  | "invoice"
  | "payment"
  | "order"
  | "commission"
  | "settlement"
  | "adjustment";
type SortKey =
  | "newest"
  | "oldest"
  | "reference"
  | "debit_high"
  | "credit_high"
  | "balance_high";

type ColumnKey =
  | "date"
  | "reference"
  | "type"
  | "description"
  | "debit"
  | "credit"
  | "balance"
  | "source";

type ApiResponse = {
  count?: number;
  total?: number;
  total_count?: number;
  results?: unknown[];
  items?: unknown[];
  rows?: unknown[];
  data?: unknown;
  summary?: unknown;
  statement?: unknown;
  transactions?: unknown[];
};

type PartyOption = {
  id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  type: PartyType;
};

type StatementRow = {
  id: string;
  date: string | null;
  reference: string;
  type: Exclude<MovementType, "all">;
  type_label: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  source: string;
  source_id: string;
};

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  date: true,
  reference: true,
  type: true,
  description: true,
  debit: true,
  credit: true,
  balance: true,
  source: true,
};

const translations = {
  ar: {
    title: "كشف الحساب",
    subtitle: "كشف حساب تفصيلي للعميل أو المندوب مع الفلاتر والحركات المالية.",
    back: "المحاسبة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",

    totalDebit: "إجمالي المدين",
    totalCredit: "إجمالي الدائن",
    balance: "الرصيد",
    movements: "عدد الحركات",

    partyType: "نوع الطرف",
    customer: "عميل",
    agent: "مندوب",
    party: "الطرف",
    allParties: "كل الأطراف",
    partySearchPlaceholder: "ابحث باسم الطرف أو الكود أو الجوال...",
    noParties: "لا توجد نتائج مطابقة.",
    movementType: "نوع الحركة",
    fromDate: "من تاريخ",
    toDate: "إلى تاريخ",
    sort: "الترتيب",
    columns: "الأعمدة",
    rowsPerPage: "عدد الصفوف",
    searchPlaceholder: "ابحث بالمرجع أو الوصف أو المصدر...",

    all: "الكل",
    invoice: "فاتورة",
    payment: "دفعة",
    order: "طلب",
    commission: "عمولة",
    settlement: "تسوية",
    adjustment: "تعديل",

    date: "التاريخ",
    reference: "المرجع",
    type: "النوع",
    description: "الوصف",
    debit: "مدين",
    credit: "دائن",
    source: "المصدر",

    newest: "الأحدث",
    oldest: "الأقدم",
    referenceSort: "المرجع",
    debitHigh: "الأعلى مدين",
    creditHigh: "الأعلى دائن",
    balanceHigh: "الأعلى رصيد",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    page: "صفحة",
    previous: "السابق",
    next: "التالي",

    noDataTitle: "لا توجد حركات",
    noDataDesc: "اختر عميلًا أو مندوبًا أو غيّر الفلاتر لعرض كشف الحساب.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل كشف الحساب",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث كشف الحساب.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير كشف الحساب",
    generatedAt: "تاريخ الطباعة",
    notAvailable: "—",
    sar: "ر.س",
  },
  en: {
    title: "Account Statement",
    subtitle: "Detailed customer or agent statement with filters and financial movements.",
    back: "Accounting",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",

    totalDebit: "Total debit",
    totalCredit: "Total credit",
    balance: "Balance",
    movements: "Movements",

    partyType: "Party type",
    customer: "Customer",
    agent: "Agent",
    party: "Party",
    allParties: "All parties",
    partySearchPlaceholder: "Search by party name, code, or phone...",
    noParties: "No matching results.",
    movementType: "Movement type",
    fromDate: "From date",
    toDate: "To date",
    sort: "Sort",
    columns: "Columns",
    rowsPerPage: "Rows per page",
    searchPlaceholder: "Search by reference, description, or source...",

    all: "All",
    invoice: "Invoice",
    payment: "Payment",
    order: "Order",
    commission: "Commission",
    settlement: "Settlement",
    adjustment: "Adjustment",

    date: "Date",
    reference: "Reference",
    type: "Type",
    description: "Description",
    debit: "Debit",
    credit: "Credit",
    source: "Source",

    newest: "Newest",
    oldest: "Oldest",
    referenceSort: "Reference",
    debitHigh: "Highest debit",
    creditHigh: "Highest credit",
    balanceHigh: "Highest balance",

    showing: "Showing",
    of: "of",
    rows: "rows",
    page: "Page",
    previous: "Previous",
    next: "Next",

    noDataTitle: "No movements",
    noDataDesc: "Select a customer or agent, or change filters to show the statement.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load statement",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Statement refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Account statement report",
    generatedAt: "Generated at",
    notAvailable: "—",
    sar: "SAR",
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
  if (Array.isArray(payload.transactions)) return payload.transactions;

  const data = asRecord(payload.data);
  const statement = asRecord(payload.statement);

  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.transactions)) return data.transactions;
  if (Array.isArray(data.statement)) return data.statement;
  if (Array.isArray(statement.rows)) return statement.rows;
  if (Array.isArray(statement.transactions)) return statement.transactions;

  return [];
}

function normalizeParty(value: unknown, type: PartyType): PartyOption {
  const item = asRecord(value);

  const id = normalizeText(item.id || item.pk || item.uuid || item.customer_id || item.agent_id);

  const name =
    normalizeText(
      item.name ||
        item.full_name ||
        item.customer_name ||
        item.agent_name ||
        item.display_name ||
        item.company_name ||
        item.first_name,
    ) || (id ? `#${id}` : "");

  return {
    id,
    name,
    code: normalizeText(item.code || item.customer_code || item.agent_code || item.number),
    phone: normalizeText(item.phone || item.mobile || item.phone_number || item.whatsapp_number),
    email: normalizeText(item.email || item.email_address),
    type,
  };
}

function movementTypeLabel(type: Exclude<MovementType, "all">, locale: Locale) {
  const t = translations[locale];

  if (type === "invoice") return t.invoice;
  if (type === "payment") return t.payment;
  if (type === "order") return t.order;
  if (type === "commission") return t.commission;
  if (type === "settlement") return t.settlement;

  return t.adjustment;
}

function normalizeStatementRow(value: unknown, index: number): StatementRow {
  const item = asRecord(value);

  const debit = toNumber(item.debit ?? item.debit_amount ?? item.owed_amount);
  const credit = toNumber(item.credit ?? item.credit_amount ?? item.paid_amount);
  const typeRaw = normalizeText(item.type || item.movement_type || item.source || "adjustment").toLowerCase();

  let type: Exclude<MovementType, "all"> = "adjustment";

  if (typeRaw.includes("invoice")) type = "invoice";
  else if (typeRaw.includes("payment")) type = "payment";
  else if (typeRaw.includes("order")) type = "order";
  else if (typeRaw.includes("commission")) type = "commission";
  else if (typeRaw.includes("settlement")) type = "settlement";

  return {
    id: normalizeText(item.id || item.pk || item.uuid || `row-${index}`),
    date:
      normalizeText(item.date || item.created_at || item.issue_date || item.payment_date || item.order_date) ||
      null,
    reference: normalizeText(
      item.reference ||
        item.reference_number ||
        item.invoice_number ||
        item.payment_number ||
        item.order_number ||
        item.code ||
        `#${index + 1}`,
    ),
    type,
    type_label: normalizeText(item.type_label || item.movement_type_label),
    description: normalizeText(item.description || item.notes || item.title || item.memo),
    debit,
    credit,
    balance: toNumber(item.balance ?? item.running_balance ?? debit - credit),
    source: normalizeText(item.source || item.module || item.object_type || type),
    source_id: normalizeText(item.source_id || item.object_id || item.invoice_id || item.payment_id || item.order_id),
  };
}

function getNestedId(value: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const direct = normalizeText(value[key]);
    if (direct) return direct;

    const nested = asRecord(value[key.replace("_id", "")]);
    const nestedId = normalizeText(nested.id || nested.pk || nested.uuid);
    if (nestedId) return nestedId;
  }

  return "";
}

function getNestedName(value: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const direct = normalizeText(value[key]);
    if (direct) return direct;

    const nested = asRecord(value[key.replace("_name", "")]);
    const nestedName = normalizeText(nested.name || nested.full_name || nested.title || nested.code);
    if (nestedName) return nestedName;
  }

  return "";
}

function buildCustomerRowsFromInvoices(invoices: unknown[], selectedPartyId: string): StatementRow[] {
  return invoices
    .map((value, index) => {
      const item = asRecord(value);
      const customerId = getNestedId(item, ["customer_id", "customer"]);
      const customerName = getNestedName(item, ["customer_name", "customer"]);

      if (selectedPartyId && customerId && customerId !== selectedPartyId) return null;

      const total = toNumber(
        item.total_amount ?? item.total ?? item.amount ?? item.due_amount ?? item.subtotal,
      );
      const paid = toNumber(item.paid_amount);

      return {
        id: normalizeText(item.id || item.pk || item.uuid || `invoice-${index}`),
        date: normalizeText(item.issue_date || item.created_at || item.date) || null,
        reference: normalizeText(item.invoice_number || item.number || item.reference || `INV-${index + 1}`),
        type: "invoice",
        type_label: "",
        description:
          normalizeText(item.description || item.notes) ||
          `فاتورة ${customerName || ""}`.trim(),
        debit: total,
        credit: paid > 0 ? paid : 0,
        balance: total - paid,
        source: "invoices",
        source_id: normalizeText(item.id || item.pk || item.uuid),
      } satisfies StatementRow;
    })
    .filter(Boolean) as StatementRow[];
}

function buildCustomerRowsFromPayments(payments: unknown[], selectedPartyId: string): StatementRow[] {
  return payments
    .map((value, index) => {
      const item = asRecord(value);
      const customerId = getNestedId(item, ["customer_id", "customer"]);

      if (selectedPartyId && customerId && customerId !== selectedPartyId) return null;

      const amount = toNumber(item.amount ?? item.paid_amount ?? item.total_amount);

      return {
        id: normalizeText(item.id || item.pk || item.uuid || `payment-${index}`),
        date: normalizeText(item.payment_date || item.created_at || item.confirmed_at || item.date) || null,
        reference: normalizeText(item.payment_number || item.reference || item.transaction_id || `PAY-${index + 1}`),
        type: "payment",
        type_label: "",
        description: normalizeText(item.description || item.notes || item.method || item.payment_method),
        debit: 0,
        credit: amount,
        balance: -amount,
        source: "payments",
        source_id: normalizeText(item.id || item.pk || item.uuid),
      } satisfies StatementRow;
    })
    .filter(Boolean) as StatementRow[];
}

function buildCustomerRowsFromOrders(orders: unknown[], selectedPartyId: string): StatementRow[] {
  return orders
    .map((value, index) => {
      const item = asRecord(value);
      const customerId = getNestedId(item, ["customer_id", "customer"]);

      if (selectedPartyId && customerId && customerId !== selectedPartyId) return null;

      const total = toNumber(item.total_amount ?? item.total ?? item.amount ?? item.final_total);

      return {
        id: normalizeText(item.id || item.pk || item.uuid || `order-${index}`),
        date: normalizeText(item.created_at || item.order_date || item.date) || null,
        reference: normalizeText(item.order_number || item.reference || item.number || `ORD-${index + 1}`),
        type: "order",
        type_label: "",
        description: normalizeText(item.description || item.product_name || item.service_name || item.notes),
        debit: total,
        credit: 0,
        balance: total,
        source: "orders",
        source_id: normalizeText(item.id || item.pk || item.uuid),
      } satisfies StatementRow;
    })
    .filter(Boolean) as StatementRow[];
}

function buildAgentRowsFromOrders(orders: unknown[], selectedPartyId: string): StatementRow[] {
  return orders
    .map((value, index) => {
      const item = asRecord(value);

      const agentId =
        getNestedId(item, ["agent_id", "sales_agent_id", "delivery_agent_id", "agent"]) ||
        normalizeText(asRecord(item.agent).id);

      if (selectedPartyId && agentId && agentId !== selectedPartyId) return null;

      const commission = toNumber(
        item.agent_commission_amount ??
          item.sales_agent_commission ??
          item.delivery_agent_commission ??
          item.commission_amount ??
          item.commission,
      );

      if (!commission) return null;

      return {
        id: normalizeText(item.id || item.pk || item.uuid || `agent-order-${index}`),
        date: normalizeText(item.created_at || item.order_date || item.delivered_at || item.date) || null,
        reference: normalizeText(item.order_number || item.reference || item.number || `ORD-${index + 1}`),
        type: "commission",
        type_label: "",
        description: normalizeText(item.description || item.product_name || item.service_name || item.notes),
        debit: 0,
        credit: commission,
        balance: -commission,
        source: "orders",
        source_id: normalizeText(item.id || item.pk || item.uuid),
      } satisfies StatementRow;
    })
    .filter(Boolean) as StatementRow[];
}

function buildAgentRowsFromPayments(payments: unknown[], selectedPartyId: string): StatementRow[] {
  return payments
    .map((value, index) => {
      const item = asRecord(value);
      const agentId = getNestedId(item, ["agent_id", "sales_agent_id", "delivery_agent_id", "agent"]);

      if (!agentId) return null;
      if (selectedPartyId && agentId !== selectedPartyId) return null;

      const amount = toNumber(item.amount ?? item.paid_amount ?? item.total_amount);

      return {
        id: normalizeText(item.id || item.pk || item.uuid || `agent-payment-${index}`),
        date: normalizeText(item.payment_date || item.created_at || item.confirmed_at || item.date) || null,
        reference: normalizeText(item.payment_number || item.reference || item.transaction_id || `PAY-${index + 1}`),
        type: "settlement",
        type_label: "",
        description: normalizeText(item.description || item.notes || item.method || item.payment_method),
        debit: amount,
        credit: 0,
        balance: amount,
        source: "payments",
        source_id: normalizeText(item.id || item.pk || item.uuid),
      } satisfies StatementRow;
    })
    .filter(Boolean) as StatementRow[];
}

function recomputeRunningBalance(rows: StatementRow[]) {
  let balance = 0;

  return rows
    .slice()
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    .map((row) => {
      balance += row.debit - row.credit;
      return { ...row, balance };
    });
}

function MoneyValue({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center justify-start gap-1 text-sm font-semibold tabular-nums">
      <span>{formatMoney(value)}</span>
      <img src="/currency/sar.svg" alt={label} className="h-3.5 w-3.5" />
    </div>
  );
}

function MovementBadge({ type, locale }: { type: Exclude<MovementType, "all">; locale: Locale }) {
  const label = movementTypeLabel(type, locale);

  const className =
    type === "invoice" || type === "order"
      ? "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50"
      : type === "payment" || type === "settlement"
        ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
        : type === "commission"
          ? "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50"
          : "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";

  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 text-xs font-medium", className)}>
      {label}
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

function PartySearchSelect({
  locale,
  value,
  options,
  allLabel,
  placeholder,
  noResultsLabel,
  onChange,
}: {
  locale: Locale;
  value: string;
  options: PartyOption[];
  allLabel: string;
  placeholder: string;
  noResultsLabel: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    setQuery("");
  }, [value, options]);

  const selectedOption = React.useMemo(() => {
    if (value === "all") return null;
    return options.find((option) => option.id === value || option.name === value) || null;
  }, [options, value]);

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return options;

    return options.filter((option) => {
      return (
        option.name.toLowerCase().includes(normalizedQuery) ||
        option.code.toLowerCase().includes(normalizedQuery) ||
        option.phone.toLowerCase().includes(normalizedQuery) ||
        option.email.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [options, query]);

  const selectedLabel = selectedOption
    ? selectedOption.code
      ? `${selectedOption.code} — ${selectedOption.name}`
      : selectedOption.name
    : allLabel;

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full justify-between rounded-lg bg-background px-3 text-start font-normal"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="block truncate">{selectedLabel}</span>
        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </Button>

      {open ? (
        <div
          className={cn(
            "absolute z-50 mt-2 w-full min-w-[280px] rounded-lg border bg-popover p-2 text-popover-foreground shadow-md",
            locale === "ar" ? "right-0" : "left-0",
          )}
        >
          <div className="relative mb-2">
            <Search
              className={cn(
                "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                locale === "ar" ? "right-3" : "left-3",
              )}
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              className={cn(
                "h-9 rounded-lg bg-background",
                locale === "ar" ? "pr-9" : "pl-9",
              )}
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
              onClick={() => {
                onChange("all");
                setOpen(false);
                setQuery("");
              }}
            >
              <span>{allLabel}</span>
              {value === "all" ? <span className="text-sm text-primary">✓</span> : null}
            </button>

            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const optionValue = option.id || option.name;
                const active = value === optionValue;

                return (
                  <button
                    key={optionValue}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => {
                      onChange(optionValue);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="min-w-0 text-start">
                      <span className="block truncate font-medium">
                        {option.code ? `${option.code} — ${option.name}` : option.name}
                      </span>
                      {option.phone || option.email ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {option.phone || option.email}
                        </span>
                      ) : null}
                    </span>
                    {active ? <span className="text-sm text-primary">✓</span> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {noResultsLabel}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
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

export default function AccountingAccountStatementPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");

  const [partyType, setPartyType] = React.useState<PartyType>("customer");
  const [selectedPartyId, setSelectedPartyId] = React.useState("all");

  const [customers, setCustomers] = React.useState<PartyOption[]>([]);
  const [agents, setAgents] = React.useState<PartyOption[]>([]);
  const [rows, setRows] = React.useState<StatementRow[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [movementType, setMovementType] = React.useState<MovementType>("all");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
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

  const partyOptions = React.useMemo(() => {
    return partyType === "customer" ? customers : agents;
  }, [agents, customers, partyType]);

  const selectedParty = React.useMemo(() => {
    if (selectedPartyId === "all") return null;
    return partyOptions.find((party) => party.id === selectedPartyId) || null;
  }, [partyOptions, selectedPartyId]);

  const loadStatement = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const selectedId = selectedPartyId === "all" ? "" : selectedPartyId;

        const params = new URLSearchParams({
          party_type: partyType,
          type: partyType,
          page: "1",
          page_size: "500",
        });

        if (selectedId) {
          params.set("party_id", selectedId);
          params.set(`${partyType}_id`, selectedId);
        }

        if (fromDate) params.set("date_from", fromDate);
        if (toDate) params.set("date_to", toDate);

        const customersPayload = await fetchJson<ApiResponse>(
          makeApiUrl("/api/customers/", new URLSearchParams({ page: "1", page_size: "500" })),
          controller.signal,
        ).catch(() => null);

        const agentsPayload = await fetchJson<ApiResponse>(
          makeApiUrl("/api/agents/", new URLSearchParams({ page: "1", page_size: "500" })),
          controller.signal,
        ).catch(() => null);

        const nextCustomers = customersPayload
          ? extractArray(customersPayload).map((item) => normalizeParty(item, "customer")).filter((party) => party.id || party.name)
          : [];

        const nextAgents = agentsPayload
          ? extractArray(agentsPayload).map((item) => normalizeParty(item, "agent")).filter((party) => party.id || party.name)
          : [];

        setCustomers(nextCustomers);
        setAgents(nextAgents);

        const statementEndpoints = [
          "/api/accounting/account-statement/",
          "/api/reports/accounting/account-statement/",
        ];

        let statementPayload: ApiResponse | null = null;

        for (const endpoint of statementEndpoints) {
          try {
            statementPayload = await fetchJson<ApiResponse>(
              makeApiUrl(endpoint, params),
              controller.signal,
            );
            break;
          } catch {
            statementPayload = null;
          }
        }

        if (statementPayload) {
          const statementRows = recomputeRunningBalance(
            extractArray(statementPayload).map(normalizeStatementRow),
          );

          setRows(statementRows);

          if (silent) toast.success(t.refreshed);
          return;
        }

        const ordersPayload = await fetchJson<ApiResponse>(
          makeApiUrl("/api/orders/", new URLSearchParams({ page: "1", page_size: "500" })),
          controller.signal,
        ).catch(() => null);

        const invoicesPayload = await fetchJson<ApiResponse>(
          makeApiUrl("/api/invoices/", new URLSearchParams({ page: "1", page_size: "500" })),
          controller.signal,
        ).catch(() => null);

        const paymentsPayload = await fetchJson<ApiResponse>(
          makeApiUrl("/api/payments/", new URLSearchParams({ page: "1", page_size: "500" })),
          controller.signal,
        ).catch(() => null);

        const orders = ordersPayload ? extractArray(ordersPayload) : [];
        const invoices = invoicesPayload ? extractArray(invoicesPayload) : [];
        const payments = paymentsPayload ? extractArray(paymentsPayload) : [];

        const generatedRows =
          partyType === "customer"
            ? [
                ...buildCustomerRowsFromOrders(orders, selectedId),
                ...buildCustomerRowsFromInvoices(invoices, selectedId),
                ...buildCustomerRowsFromPayments(payments, selectedId),
              ]
            : [
                ...buildAgentRowsFromOrders(orders, selectedId),
                ...buildAgentRowsFromPayments(payments, selectedId),
              ];

        setRows(recomputeRunningBalance(generatedRows));

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
    [fromDate, partyType, selectedPartyId, t.errorDesc, t.refreshed, toDate],
  );

  React.useEffect(() => {
    void loadStatement();
  }, [loadStatement]);

  React.useEffect(() => {
    setSelectedPartyId("all");
  }, [partyType]);

  const filteredRows = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let result = rows.filter((row) => {
      const rowDate = formatDate(row.date);

      const matchesSearch =
        !query ||
        row.reference.toLowerCase().includes(query) ||
        row.description.toLowerCase().includes(query) ||
        row.source.toLowerCase().includes(query) ||
        row.type.toLowerCase().includes(query);

      const matchesType = movementType === "all" || row.type === movementType;
      const matchesFrom = !fromDate || rowDate >= fromDate;
      const matchesTo = !toDate || rowDate <= toDate;

      return matchesSearch && matchesType && matchesFrom && matchesTo;
    });

    result = [...result].sort((a, b) => {
      if (sortKey === "oldest") return String(a.date || "").localeCompare(String(b.date || ""));
      if (sortKey === "reference") return a.reference.localeCompare(b.reference);
      if (sortKey === "debit_high") return b.debit - a.debit;
      if (sortKey === "credit_high") return b.credit - a.credit;
      if (sortKey === "balance_high") return b.balance - a.balance;

      return String(b.date || "").localeCompare(String(a.date || ""));
    });

    return result;
  }, [fromDate, movementType, rows, searchInput, sortKey, toDate]);

  React.useEffect(() => {
    setPage(1);
  }, [fromDate, movementType, pageSize, searchInput, sortKey, toDate]);

  const summary = React.useMemo(() => {
    const debit = filteredRows.reduce((sum, row) => sum + row.debit, 0);
    const credit = filteredRows.reduce((sum, row) => sum + row.credit, 0);

    return {
      debit,
      credit,
      balance: debit - credit,
      movements: filteredRows.length,
    };
  }, [filteredRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    movementType !== "all" ||
    Boolean(fromDate) ||
    Boolean(toDate) ||
    sortKey !== "newest";

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setMovementType("all");
    setFromDate("");
    setToDate("");
    setSortKey("newest");
    setPage(1);
  }

  function columnLabel(key: ColumnKey) {
    if (key === "date") return t.date;
    if (key === "reference") return t.reference;
    if (key === "type") return t.type;
    if (key === "description") return t.description;
    if (key === "debit") return t.debit;
    if (key === "credit") return t.credit;
    if (key === "balance") return t.balance;
    return t.source;
  }

  function buildExportRows() {
    return filteredRows.map((row) => ({
      date: formatDate(row.date),
      reference: row.reference || t.notAvailable,
      type: movementTypeLabel(row.type, locale),
      description: row.description || t.notAvailable,
      debit: formatMoney(row.debit),
      credit: formatMoney(row.credit),
      balance: formatMoney(row.balance),
      source: row.source || t.notAvailable,
    }));
  }

  function exportExcel() {
    const exportRows = buildExportRows();

    if (!exportRows.length) {
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
          <p>${escapeHtml(t.partyType)}: ${escapeHtml(partyType === "customer" ? t.customer : t.agent)}</p>
          <p>${escapeHtml(t.party)}: ${escapeHtml(selectedParty?.name || t.allParties)}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.reference)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.balance)}</th>
                <th>${escapeHtml(t.source)}</th>
              </tr>
            </thead>
            <tbody>
              ${exportRows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.reference)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.balance)}</td>
                      <td>${escapeHtml(row.source)}</td>
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
    link.download = `primey-care-account-statement-${partyType}-${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    const exportRows = buildExportRows();

    if (!exportRows.length) {
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
              <p>${escapeHtml(t.partyType)}: ${escapeHtml(partyType === "customer" ? t.customer : t.agent)}</p>
              <p>${escapeHtml(t.party)}: ${escapeHtml(selectedParty?.name || t.allParties)}</p>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalDebit)}</span><strong>${escapeHtml(formatMoney(summary.debit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalCredit)}</span><strong>${escapeHtml(formatMoney(summary.credit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.balance)}</span><strong>${escapeHtml(formatMoney(summary.balance))}</strong></div>
            <div class="box"><span>${escapeHtml(t.movements)}</span><strong>${escapeHtml(summary.movements)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.reference)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.balance)}</th>
                <th>${escapeHtml(t.source)}</th>
              </tr>
            </thead>
            <tbody>
              ${exportRows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.reference)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.balance)}</td>
                      <td>${escapeHtml(row.source)}</td>
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
            onClick={() => void loadStatement({ silent: true })}
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalDebit}
          value={<MoneyValue value={summary.debit} label={t.sar} />}
          trend={partyType === "customer" ? t.customer : t.agent}
          icon={WalletCards}
        />

        <KpiCard
          title={t.totalCredit}
          value={<MoneyValue value={summary.credit} label={t.sar} />}
          trend={t.credit}
          icon={ReceiptText}
        />

        <KpiCard
          title={t.balance}
          value={<MoneyValue value={summary.balance} label={t.sar} />}
          trend={selectedParty?.name || t.allParties}
          icon={UserRound}
        />

        <KpiCard
          title={t.movements}
          value={formatInteger(summary.movements)}
          trend={t.rows}
          icon={UsersRound}
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
              onClick={() => void loadStatement()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-2 xl:grid-cols-[180px_minmax(220px,1fr)_160px_160px]">
            <Select value={partyType} onValueChange={(value) => setPartyType(value as PartyType)}>
              <SelectTrigger className="h-10 rounded-lg bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">{t.customer}</SelectItem>
                <SelectItem value="agent">{t.agent}</SelectItem>
              </SelectContent>
            </Select>

            <PartySearchSelect
              locale={locale}
              value={selectedPartyId}
              options={partyOptions}
              allLabel={t.allParties}
              placeholder={t.partySearchPlaceholder}
              noResultsLabel={t.noParties}
              onChange={setSelectedPartyId}
            />

            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 rounded-lg bg-background"
              title={t.fromDate}
            />

            <Input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 rounded-lg bg-background"
              title={t.toDate}
            />
          </div>

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
              <Select value={movementType} onValueChange={(value) => setMovementType(value as MovementType)}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t.movementType}: {t.all}
                  </SelectItem>
                  <SelectItem value="invoice">{t.invoice}</SelectItem>
                  <SelectItem value="payment">{t.payment}</SelectItem>
                  <SelectItem value="order">{t.order}</SelectItem>
                  <SelectItem value="commission">{t.commission}</SelectItem>
                  <SelectItem value="settlement">{t.settlement}</SelectItem>
                  <SelectItem value="adjustment">{t.adjustment}</SelectItem>
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
                  <SelectItem value="balance_high">{t.balanceHigh}</SelectItem>
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
              <Table className="min-w-[1180px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {columns.date ? (
                      <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.date}
                      </TableHead>
                    ) : null}

                    {columns.reference ? (
                      <TableHead className="h-11 w-[150px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.reference}
                      </TableHead>
                    ) : null}

                    {columns.type ? (
                      <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.type}
                      </TableHead>
                    ) : null}

                    {columns.description ? (
                      <TableHead className="h-11 w-[300px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.description}
                      </TableHead>
                    ) : null}

                    {columns.debit ? (
                      <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.debit}
                      </TableHead>
                    ) : null}

                    {columns.credit ? (
                      <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.credit}
                      </TableHead>
                    ) : null}

                    {columns.balance ? (
                      <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.balance}
                      </TableHead>
                    ) : null}

                    {columns.source ? (
                      <TableHead className="h-11 w-[145px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.source}
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pageRows.length ? (
                    pageRows.map((row) => (
                      <TableRow key={row.id || row.reference} className="h-[62px]">
                        {columns.date ? (
                          <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-right align-middle">
                            <span className="text-sm text-muted-foreground tabular-nums">
                              {formatDate(row.date)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.reference ? (
                          <TableCell className="h-[62px] w-[150px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm font-semibold text-foreground tabular-nums">
                              {row.reference || t.notAvailable}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.type ? (
                          <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                            <MovementBadge type={row.type} locale={locale} />
                          </TableCell>
                        ) : null}

                        {columns.description ? (
                          <TableCell className="h-[62px] w-[300px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {row.description || movementTypeLabel(row.type, locale)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.debit ? (
                          <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.debit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.credit ? (
                          <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.credit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.balance ? (
                          <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.balance} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.source ? (
                          <TableCell className="h-[62px] w-[145px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {row.source || t.notAvailable}
                            </span>
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
                {formatInteger(filteredRows.length)}
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