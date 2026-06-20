"use client";

/* ============================================================
   📂 app/system/reports/orders/page.tsx
   🧠 Primey Care | Orders Operational Report
   ------------------------------------------------------------
   ✅ Reports page, not dashboard
   ✅ No KPI cards
   ✅ Real data from GET /api/orders/
   ✅ Optional report summary from /api/orders/reports/
   ✅ Premium paid-table style based on approved orders list
   ✅ Date range filter: من / إلى
   ✅ All order statuses as tabs above search
   ✅ Sales agent + delivery agent filters with internal search
   ✅ Product image/avatar removed
   ✅ Sales agent column separated from delivery agent
   ✅ Excel .xls HTML workbook
   ✅ Web print
   ✅ Arabic / English + RTL/LTR
   ✅ SAR icon
   ✅ sonner
   ✅ No fake data
   ✅ No /api/orders/list/
   ✅ No localhost
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  PlusCircle,
  Printer,
  RefreshCw,
  Search,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Locale = "ar" | "en";

type Pagination = {
  count?: number;
  total?: number;
  total_items?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
  pages?: number;
};

type ApiListResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  results?: unknown[];
  items?: unknown[];
  orders?: unknown[];
  data?:
    | unknown[]
    | {
        results?: unknown[];
        items?: unknown[];
        orders?: unknown[];
        pagination?: Pagination;
      };
  pagination?: Pagination;
  count?: number;
  total?: number;
  summary?: Record<string, unknown>;
};

type WhoAmI = {
  role?: string;
  user_type?: string;
  workspace?: string;
  is_superuser?: boolean;
  permission_codes?: string[];
  permissions?: string[] | { codes?: string[] };
  profile_permissions?: string[] | { codes?: string[] };
};

type OrderRow = {
  id: string;
  number: string;
  productName: string;
  providerName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  salesAgentName: string;
  deliveryAgentName: string;
  price: number;
  remaining: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  paymentMethod: string;
  orderKind: string;
  cashCollectedAmount: number;
  isCod: boolean;
  createdAt: string;
};

type ColumnKey =
  | "select"
  | "number"
  | "product"
  | "price"
  | "customer"
  | "salesAgent"
  | "deliveryAgent"
  | "date"
  | "type"
  | "payment"
  | "delivery"
  | "status"
  | "cash"
  | "actions";

type SortKey = "created_desc" | "created_asc" | "price_desc" | "price_asc";

type PersonOption = {
  value: string;
  ar: string;
  en: string;
};

const SAR_ICON = "/currency/sar.svg";

const TEXT = {
  ar: {
    title: "تقرير الطلبات",
    subtitle: "تقرير جدولي لتتبع الطلبات وحالات الدفع والتوصيل والتحصيل.",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    search: "ابحث في تقرير الطلبات...",
    searchAgent: "ابحث باسم المندوب...",
    columns: "الأعمدة",
    salesAgentFilter: "مندوب الطلب",
    deliveryAgentFilter: "مندوب التوصيل",
    payment: "الدفع",
    delivery: "التوصيل",
    date: "التاريخ",
    sort: "الترتيب",
    from: "من",
    to: "إلى",
    reset: "إعادة ضبط",
    previous: "السابق",
    next: "التالي",
    selected: "محدد",
    of: "من",
    row: "صف",
    all: "الكل",
    noResults: "لا توجد نتائج.",
    errorTitle: "تعذر تحميل تقرير الطلبات",
    retry: "إعادة المحاولة",
    details: "تفاصيل الطلب",
    page: "صفحة",
    remaining: "متبقي",
    reportRange: "نطاق التقرير",
    reportRows: "صفوف التقرير",
    reportRowsHint: "البيانات المعروضة حسب الفلاتر المحددة.",
    reportTotal: "إجمالي النتائج",
    reportAmount: "إجمالي المبلغ",
    reportRemaining: "إجمالي المتبقي",
    reportCollected: "إجمالي المحصل",
    orderList: "قائمة الطلبات",
    table: {
      number: "#",
      product: "المنتج",
      price: "السعر",
      customer: "العميل",
      salesAgent: "مندوب الطلب",
      deliveryAgent: "مندوب التوصيل",
      date: "التاريخ",
      type: "النوع",
      payment: "الدفع",
      delivery: "التوصيل",
      status: "الحالة",
      cash: "التحصيل",
    },
  },
  en: {
    title: "Orders Report",
    subtitle: "Tabular report for orders, payment, delivery, and collection tracking.",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    search: "Search orders report...",
    searchAgent: "Search agent...",
    columns: "Columns",
    salesAgentFilter: "Sales Agent",
    deliveryAgentFilter: "Delivery Agent",
    payment: "Payment",
    delivery: "Delivery",
    date: "Date",
    sort: "Sort",
    from: "From",
    to: "To",
    reset: "Reset",
    previous: "Previous",
    next: "Next",
    selected: "selected",
    of: "of",
    row: "row",
    all: "All",
    noResults: "No results.",
    errorTitle: "Unable to load orders report",
    retry: "Retry",
    details: "Order Details",
    page: "Page",
    remaining: "Remaining",
    reportRange: "Report Range",
    reportRows: "Report Rows",
    reportRowsHint: "Rows shown based on the selected filters.",
    reportTotal: "Total Results",
    reportAmount: "Total Amount",
    reportRemaining: "Total Remaining",
    reportCollected: "Total Collected",
    orderList: "Order List",
    table: {
      number: "#",
      product: "Product",
      price: "Price",
      customer: "Customer",
      salesAgent: "Sales Agent",
      deliveryAgent: "Delivery Agent",
      date: "Date",
      type: "Type",
      payment: "Payment",
      delivery: "Delivery",
      status: "Status",
      cash: "Collection",
    },
  },
} as const;

const STATUS_TABS = [
  { value: "all", ar: "الكل", en: "All" },
  { value: "pending", ar: "مبدئية", en: "Pending" },
  { value: "confirmed", ar: "مؤكدة", en: "Confirmed" },
  { value: "processing", ar: "قيد المعالجة", en: "Processing" },
  { value: "card_ready", ar: "جاهزة", en: "Ready" },
  { value: "assigned_for_delivery", ar: "مسندة", en: "Assigned" },
  { value: "out_for_delivery", ar: "خارج للتوصيل", en: "Out" },
  { value: "delivered", ar: "تم التسليم", en: "Delivered" },
  { value: "completed", ar: "مكتملة", en: "Completed" },
  { value: "cancelled", ar: "ملغية", en: "Cancelled" },
  { value: "refunded", ar: "مسترجعة", en: "Refunded" },
] as const;

const PAYMENT_OPTIONS: PersonOption[] = [
  { value: "all", ar: "كل حالات الدفع", en: "All payments" },
  { value: "pending", ar: "بانتظار الدفع", en: "Pending" },
  { value: "unpaid", ar: "غير مدفوع", en: "Unpaid" },
  { value: "cod_pending", ar: "بانتظار تحصيل COD", en: "COD pending" },
  { value: "partial", ar: "جزئي", en: "Partial" },
  { value: "partially_paid", ar: "مدفوع جزئيًا", en: "Partially paid" },
  { value: "paid", ar: "مدفوع", en: "Paid" },
  { value: "refunded", ar: "مسترد", en: "Refunded" },
];

const DELIVERY_OPTIONS: PersonOption[] = [
  { value: "all", ar: "كل حالات التوصيل", en: "All delivery" },
  { value: "card_ready", ar: "جاهز للتوصيل", en: "Ready" },
  { value: "assigned_for_delivery", ar: "مسند للتوصيل", en: "Assigned" },
  { value: "out_for_delivery", ar: "خارج للتوصيل", en: "Out for delivery" },
  { value: "delivered", ar: "تم التسليم", en: "Delivered" },
];

const SORT_OPTIONS: { value: SortKey; ar: string; en: string }[] = [
  { value: "created_desc", ar: "الأحدث أولًا", en: "Newest first" },
  { value: "created_asc", ar: "الأقدم أولًا", en: "Oldest first" },
  { value: "price_desc", ar: "الأعلى سعرًا", en: "Highest price" },
  { value: "price_asc", ar: "الأقل سعرًا", en: "Lowest price" },
];

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  number: true,
  product: true,
  price: true,
  customer: true,
  salesAgent: true,
  deliveryAgent: true,
  date: true,
  type: true,
  payment: true,
  delivery: true,
  status: true,
  cash: true,
  actions: true,
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getLocale(): Locale {
  if (typeof window === "undefined") return "ar";

  const primeyLocale = window.localStorage.getItem("primey-locale");
  const appLocale = window.localStorage.getItem("locale");
  const htmlLocale = document.documentElement.lang;

  if (primeyLocale === "en" || appLocale === "en" || htmlLocale === "en") return "en";
  return "ar";
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function boolValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;

  if (typeof value === "string") {
    return ["true", "1", "yes", "y"].includes(value.toLowerCase());
  }

  return false;
}

function read(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const parts = key.split(".");
    let current: unknown = obj;
    let found = true;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        found = false;
        break;
      }
    }

    if (found && current !== null && current !== undefined && current !== "") return current;
  }

  return "";
}

function normalizeArray(payload: ApiListResponse | unknown[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.orders)) return payload.orders;
  if (Array.isArray(payload.data)) return payload.data;

  if (payload.data && typeof payload.data === "object") {
    const data = payload.data as {
      results?: unknown[];
      items?: unknown[];
      orders?: unknown[];
    };

    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.orders)) return data.orders;
  }

  return [];
}

function getPagination(payload: ApiListResponse | unknown[]): Pagination {
  if (Array.isArray(payload)) return {};

  if (payload.pagination) return payload.pagination;

  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    const data = payload.data as { pagination?: Pagination };
    if (data.pagination) return data.pagination;
  }

  return {};
}

function normalizeOrder(item: unknown): OrderRow {
  const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  const id = stringify(read(row, ["id", "uuid", "pk"]));
  const paymentMethod = stringify(read(row, ["payment_method", "payment.method", "method"]));

  const salesAgentName = stringify(
    read(row, [
      "agent_name",
      "sales_agent_name",
      "created_by_name",
      "created_by.full_name",
      "created_by.name",
      "created_by.username",
      "created_by.email",
      "agent.full_name",
      "agent.name",
      "agent.user.full_name",
      "agent.user.name",
      "agent.user.username",
      "sales_agent.full_name",
      "sales_agent.name",
      "sales_agent.user.full_name",
      "sales_agent.user.name",
      "referral_agent_name",
      "referral_agent.name",
      "created_by_user.full_name",
      "created_by_user.username",
    ]),
  );

  return {
    id,
    number:
      stringify(read(row, ["order_number", "number", "code", "reference", "order_code"])) ||
      (id ? `#${id}` : "—"),
    productName:
      stringify(
        read(row, [
          "product_name",
          "product.name_ar",
          "product.name_en",
          "product.name",
          "product.title",
          "program_name",
          "service_name",
          "package_name",
        ]),
      ) || "—",
    providerName: stringify(
      read(row, [
        "provider_name",
        "provider.name_ar",
        "provider.name_en",
        "provider.name",
        "center_name",
        "center.name_ar",
        "center.name",
      ]),
    ),
    customerName:
      stringify(
        read(row, [
          "customer_name",
          "customer.full_name",
          "customer.name",
          "customer.display_name",
          "customer.user.full_name",
          "customer.user.name",
        ]),
      ) || "—",
    customerPhone: stringify(
      read(row, [
        "customer_phone",
        "phone",
        "mobile",
        "customer_phone_number",
        "customer.normalized_phone",
        "customer.phone",
        "customer.mobile",
        "customer.whatsapp_number",
        "customer.user.phone",
      ]),
    ),
    customerEmail: stringify(
      read(row, ["customer_email", "customer.email", "customer.user.email", "email"]),
    ),
    salesAgentName,
    deliveryAgentName: stringify(
      read(row, [
        "delivery_agent_name",
        "delivery_agent.full_name",
        "delivery_agent.name",
        "delivery_agent.user.full_name",
        "delivery_agent.user.name",
        "assigned_delivery_agent.name",
      ]),
    ),
    price: numberValue(read(row, ["total_amount", "grand_total", "total", "amount"])),
    remaining: numberValue(read(row, ["remaining_amount", "remaining", "balance"])),
    status: stringify(read(row, ["status", "order_status"])) || "pending",
    paymentStatus: stringify(read(row, ["payment_status", "payment.status"])) || "pending",
    fulfillmentStatus:
      stringify(read(row, ["fulfillment_status", "execution_status", "fulfillment.status"])) ||
      "pending",
    paymentMethod,
    orderKind: stringify(read(row, ["order_kind", "type", "kind"])) || "general",
    cashCollectedAmount: numberValue(
      read(row, ["cash_collected_amount", "collected_cash", "cod_collected_amount"]),
    ),
    isCod:
      boolValue(read(row, ["is_cash_on_delivery", "is_cod"])) ||
      paymentMethod === "cash_on_delivery",
    createdAt: stringify(
      read(row, ["created_at", "created", "date", "ordered_at", "created_on", "updated_at"]),
    ),
  };
}

function getTotal(payload: ApiListResponse | unknown[], rowsLength: number) {
  if (Array.isArray(payload)) return rowsLength;

  const pagination = getPagination(payload);

  const total =
    numberValue(payload.count) ||
    numberValue(payload.total) ||
    numberValue(pagination.total_items) ||
    numberValue(pagination.count) ||
    numberValue(pagination.total);

  return total > 0 ? total : rowsLength;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === "all") return;
    query.set(key, String(value));
  });

  const text = query.toString();
  return text ? `?${text}` : "";
}

function getApiBases() {
  const envBase =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  const bases: string[] = [];

  if (envBase) bases.push(envBase.replace(/\/$/, ""));
  bases.push("");

  return Array.from(new Set(bases));
}

function buildApiUrl(base: string, path: string) {
  if (!base) return path;
  return `${base}${path}`;
}

async function fetchJsonFromCandidates<T>(paths: string[]): Promise<T> {
  let lastError: unknown = null;

  for (const base of getApiBases()) {
    for (const path of paths) {
      try {
        const response = await fetch(buildApiUrl(base, path), {
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          cache: "no-store",
        });

        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
          ? await response.json().catch(() => null)
          : await response.text().catch(() => null);

        if (!response.ok) {
          const message =
            payload && typeof payload === "object" && "message" in payload
              ? String((payload as { message?: unknown }).message || "")
              : payload && typeof payload === "object" && "detail" in payload
                ? String((payload as { detail?: unknown }).detail || "")
                : typeof payload === "string" && payload.length < 180
                  ? payload
                  : "";

          throw new Error(message || `HTTP ${response.status}`);
        }

        if (!contentType.includes("application/json")) {
          throw new Error("Response is not JSON.");
        }

        return payload as T;
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to fetch data.");
}

async function fetchWhoami(): Promise<WhoAmI> {
  return fetchJsonFromCandidates<WhoAmI>(["/api/auth/whoami/", "/api/auth/whoami"]);
}

async function fetchOrders(query: string): Promise<ApiListResponse | unknown[]> {
  const cleanQuery = query.startsWith("?") ? query : query ? `?${query}` : "";

  return fetchJsonFromCandidates<ApiListResponse | unknown[]>([
    `/api/orders/${cleanQuery}`,
    `/api/orders${cleanQuery}`,
  ]);
}

async function fetchOrdersReports(query: string): Promise<Record<string, unknown>> {
  const cleanQuery = query.startsWith("?") ? query : query ? `?${query}` : "";

  return fetchJsonFromCandidates<Record<string, unknown>>([
    `/api/orders/reports/${cleanQuery}`,
    `/api/orders/reports${cleanQuery}`,
  ]);
}

function useDebounce(value: string, delay = 400) {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0,
  );
}

function formatDate(value: string, locale: Locale) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function statusLabel(value: string, locale: Locale) {
  const key = value || "pending";

  const labels: Record<string, { ar: string; en: string }> = {
    pending: { ar: "قيد الانتظار", en: "Pending" },
    confirmed: { ar: "مؤكد", en: "Confirmed" },
    processing: { ar: "قيد المعالجة", en: "Processed" },
    card_ready: { ar: "جاهز للتوصيل", en: "Ready" },
    assigned_for_delivery: { ar: "مسند", en: "Assigned" },
    out_for_delivery: { ar: "خارج للتوصيل", en: "Out for delivery" },
    delivered: { ar: "تم التسليم", en: "Delivered" },
    completed: { ar: "مكتمل", en: "Completed" },
    cancelled: { ar: "ملغي", en: "Canceled" },
    canceled: { ar: "ملغي", en: "Canceled" },
    refunded: { ar: "مسترجع", en: "Returned" },
    unpaid: { ar: "غير مدفوع", en: "Unpaid" },
    cod_pending: { ar: "بانتظار التحصيل", en: "COD pending" },
    partial: { ar: "جزئي", en: "Partial" },
    partially_paid: { ar: "مدفوع جزئيًا", en: "Partially paid" },
    paid: { ar: "مدفوع", en: "Paid" },
    cash_on_delivery: { ar: "عند الاستلام", en: "COD" },
    bank_transfer: { ar: "تحويل بنكي", en: "Bank" },
    payment_gateway: { ar: "بوابة دفع", en: "Gateway" },
    gateway: { ar: "بوابة دفع", en: "Gateway" },
    tamara: { ar: "تمارا", en: "Tamara" },
    tabby: { ar: "تابي", en: "Tabby" },
    card: { ar: "بطاقة", en: "Card" },
    program: { ar: "برنامج", en: "Program" },
    service: { ar: "خدمة", en: "Service" },
    subscription: { ar: "اشتراك", en: "Subscription" },
    general: { ar: "عام", en: "General" },
    sale: { ar: "بيع", en: "Sale" },
    not_started: { ar: "لم يبدأ", en: "Not started" },
    in_progress: { ar: "قيد التنفيذ", en: "In progress" },
    issued: { ar: "مصدر", en: "Issued" },
    ready: { ar: "جاهز", en: "Ready" },
    fulfilled: { ar: "منفذ", en: "Fulfilled" },
  };

  return labels[key]?.[locale] || key.replaceAll("_", " ");
}

function badgeClass(value: string) {
  if (["completed", "paid", "delivered", "fulfilled"].includes(value)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (["pending", "unpaid", "partial", "partially_paid", "cod_pending"].includes(value)) {
    return "border-orange-500/30 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300";
  }

  if (["cancelled", "canceled", "refunded", "failed"].includes(value)) {
    return "border-red-500/30 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  }

  if (
    ["processing", "confirmed", "card_ready", "assigned_for_delivery", "out_for_delivery"].includes(
      value,
    )
  ) {
    return "border-sky-500/30 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300";
  }

  return "border-muted bg-muted/40 text-muted-foreground";
}

function Money({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums">
      <span>{formatNumber(value)}</span>
      <img src={SAR_ICON} alt="SAR" className="h-3.5 w-3.5 opacity-80" />
    </span>
  );
}

function escapeHtml(value: unknown) {
  return stringify(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hasPermission(whoami: WhoAmI | null, permission: string) {
  if (!whoami) return true;

  const role = stringify(whoami.role || whoami.user_type).toLowerCase();
  const workspace = stringify(whoami.workspace).toLowerCase();

  if (whoami.is_superuser) return true;
  if (["system_admin", "superuser", "admin", "owner"].includes(role)) return true;
  if (workspace === "system" && role.includes("admin")) return true;

  const permissions = new Set<string>();

  if (Array.isArray(whoami.permission_codes)) {
    whoami.permission_codes.forEach((item) => permissions.add(item));
  }

  if (Array.isArray(whoami.permissions)) {
    whoami.permissions.forEach((item) => permissions.add(item));
  } else if (whoami.permissions?.codes) {
    whoami.permissions.codes.forEach((item) => permissions.add(item));
  }

  if (Array.isArray(whoami.profile_permissions)) {
    whoami.profile_permissions.forEach((item) => permissions.add(item));
  } else if (whoami.profile_permissions?.codes) {
    whoami.profile_permissions.codes.forEach((item) => permissions.add(item));
  }

  return permissions.has(permission);
}

function exportExcel(rows: OrderRow[], locale: Locale) {
  const t = TEXT[locale];

  const body = rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.number)}</td>
        <td>${escapeHtml(row.productName)}</td>
        <td>${escapeHtml(row.providerName || "—")}</td>
        <td>${escapeHtml(formatNumber(row.price))}</td>
        <td>${escapeHtml(formatNumber(row.remaining))}</td>
        <td>${escapeHtml(row.customerName)}</td>
        <td>${escapeHtml(row.customerPhone || row.customerEmail || "—")}</td>
        <td>${escapeHtml(row.salesAgentName || "—")}</td>
        <td>${escapeHtml(row.deliveryAgentName || "—")}</td>
        <td>${escapeHtml(formatDate(row.createdAt, locale))}</td>
        <td>${escapeHtml(statusLabel(row.orderKind, locale))}</td>
        <td>${escapeHtml(statusLabel(row.paymentStatus, locale))}</td>
        <td>${escapeHtml(statusLabel(row.status, locale))}</td>
        <td>${escapeHtml(statusLabel(row.fulfillmentStatus, locale))}</td>
        <td>${escapeHtml(formatNumber(row.cashCollectedAmount))}</td>
      </tr>
    `,
    )
    .join("");

  const html = `
    <html>
      <head><meta charset="UTF-8" /></head>
      <body dir="${locale === "ar" ? "rtl" : "ltr"}">
        <table border="1">
          <thead>
            <tr>
              <th>${escapeHtml(t.table.number)}</th>
              <th>${escapeHtml(t.table.product)}</th>
              <th>${locale === "ar" ? "مقدم الخدمة" : "Provider"}</th>
              <th>${escapeHtml(t.table.price)}</th>
              <th>${escapeHtml(t.remaining)}</th>
              <th>${escapeHtml(t.table.customer)}</th>
              <th>${locale === "ar" ? "بيانات العميل" : "Customer info"}</th>
              <th>${escapeHtml(t.table.salesAgent)}</th>
              <th>${escapeHtml(t.table.deliveryAgent)}</th>
              <th>${escapeHtml(t.table.date)}</th>
              <th>${escapeHtml(t.table.type)}</th>
              <th>${escapeHtml(t.table.payment)}</th>
              <th>${escapeHtml(t.table.status)}</th>
              <th>${escapeHtml(t.table.delivery)}</th>
              <th>${escapeHtml(t.table.cash)}</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `primey-orders-report-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function printRows(rows: OrderRow[], locale: Locale) {
  const t = TEXT[locale];

  const body = rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.number)}</td>
        <td>${escapeHtml(row.productName)}</td>
        <td>${escapeHtml(formatNumber(row.price))}</td>
        <td>${escapeHtml(row.customerName)}</td>
        <td>${escapeHtml(row.salesAgentName || "—")}</td>
        <td>${escapeHtml(row.deliveryAgentName || "—")}</td>
        <td>${escapeHtml(formatDate(row.createdAt, locale))}</td>
        <td>${escapeHtml(statusLabel(row.paymentStatus, locale))}</td>
        <td>${escapeHtml(statusLabel(row.status, locale))}</td>
        <td>${escapeHtml(formatNumber(row.cashCollectedAmount))}</td>
      </tr>
    `,
    )
    .join("");

  const html = `
    <!doctype html>
    <html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(t.title)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          h1 { font-size: 22px; margin: 0 0 8px; }
          p { margin: 0 0 18px; color: #6b7280; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; direction: ${locale === "ar" ? "rtl" : "ltr"}; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: ${locale === "ar" ? "right" : "left"}; }
          th { background: #f9fafb; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(t.title)}</h1>
        <p>${escapeHtml(t.subtitle)}</p>
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(t.table.number)}</th>
              <th>${escapeHtml(t.table.product)}</th>
              <th>${escapeHtml(t.table.price)}</th>
              <th>${escapeHtml(t.table.customer)}</th>
              <th>${escapeHtml(t.table.salesAgent)}</th>
              <th>${escapeHtml(t.table.deliveryAgent)}</th>
              <th>${escapeHtml(t.table.date)}</th>
              <th>${escapeHtml(t.table.payment)}</th>
              <th>${escapeHtml(t.table.status)}</th>
              <th>${escapeHtml(t.table.cash)}</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>
  `;

  const win = window.open("", "_blank", "width=1200,height=800");

  if (!win) {
    toast.error(locale === "ar" ? "تعذر فتح نافذة الطباعة" : "Unable to open print window");
    return;
  }

  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function buildPersonOptions(rows: OrderRow[], key: "salesAgentName" | "deliveryAgentName") {
  const names = Array.from(
    new Set(
      rows
        .map((row) => row[key].trim())
        .filter((name) => name && name !== "—"),
    ),
  );

  return [
    { value: "all", ar: "الكل", en: "All" },
    ...names.map((name) => ({
      value: name,
      ar: name,
      en: name,
    })),
  ];
}

function SearchablePersonFilter({
  label,
  value,
  onChange,
  options,
  locale,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: PersonOption[];
  locale: Locale;
}) {
  const [query, setQuery] = React.useState("");
  const isRtl = locale === "ar";
  const t = TEXT[locale];

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return options;

    return options.filter((option) =>
      [option.value, option.ar, option.en]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query]);

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>

      <div className="relative">
        <Search
          className={cn(
            "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
            isRtl ? "right-3" : "left-3",
          )}
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchAgent}
          className={cn("h-9", isRtl ? "pr-9 text-right" : "pl-9 text-left")}
          dir={isRtl ? "rtl" : "ltr"}
        />
      </div>

      <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-1">
        {filteredOptions.length ? (
          filteredOptions.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-muted",
                  active && "bg-muted font-medium",
                  isRtl ? "text-right" : "text-left",
                )}
              >
                <span className="truncate">{option[locale]}</span>
                {active && <span className="text-xs text-primary">✓</span>}
              </button>
            );
          })
        ) : (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t.noResults}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  locale,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: PersonOption[];
  locale: Locale;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <Select value={value} onValueChange={onChange} dir={locale === "ar" ? "rtl" : "ltr"}>
        <SelectTrigger className="h-9 rounded-md">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option[locale]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, index) => (
        <TableRow key={index}>
          {Array.from({ length: 14 }).map((__, cellIndex) => (
            <TableCell key={cellIndex}>
              <div className="h-5 w-full animate-pulse rounded-md bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function applyLocalFilters({
  rows,
  search,
  statusTab,
  payment,
  delivery,
  salesAgentFilter,
  deliveryAgentFilter,
  dateFrom,
  dateTo,
  sort,
}: {
  rows: OrderRow[];
  search: string;
  statusTab: string;
  payment: string;
  delivery: string;
  salesAgentFilter: string;
  deliveryAgentFilter: string;
  dateFrom: string;
  dateTo: string;
  sort: SortKey;
}) {
  let output = [...rows];

  const localSearch = search.trim().toLowerCase();

  if (localSearch) {
    output = output.filter((row) => {
      const haystack = [
        row.number,
        row.productName,
        row.providerName,
        row.customerName,
        row.customerPhone,
        row.customerEmail,
        row.salesAgentName,
        row.deliveryAgentName,
        row.status,
        row.paymentStatus,
        row.fulfillmentStatus,
        row.paymentMethod,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(localSearch);
    });
  }

  if (statusTab !== "all") output = output.filter((row) => row.status === statusTab);
  if (payment !== "all") output = output.filter((row) => row.paymentStatus === payment);

  if (delivery !== "all") {
    output = output.filter(
      (row) => row.status === delivery || row.fulfillmentStatus === delivery,
    );
  }

  if (salesAgentFilter !== "all") {
    output = output.filter((row) => row.salesAgentName === salesAgentFilter);
  }

  if (deliveryAgentFilter !== "all") {
    output = output.filter((row) => row.deliveryAgentName === deliveryAgentFilter);
  }

  if (dateFrom || dateTo) {
    output = output.filter((row) => {
      if (!row.createdAt) return true;

      const rowDate = new Date(row.createdAt);
      if (Number.isNaN(rowDate.getTime())) return true;

      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`);
        if (rowDate < from) return false;
      }

      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`);
        if (rowDate > to) return false;
      }

      return true;
    });
  }

  output.sort((a, b) => {
    if (sort === "created_asc") {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }

    if (sort === "created_desc") {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }

    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;

    return 0;
  });

  return output;
}

function ColumnCell({
  enabled,
  children,
  className,
}: {
  enabled: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!enabled) return null;
  return <TableCell className={className}>{children}</TableCell>;
}

function HeaderCell({
  enabled,
  children,
  className,
}: {
  enabled: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  if (!enabled) return null;
  return <TableHead className={className}>{children}</TableHead>;
}

function ReportSummaryBar({
  locale,
  rows,
  totalRows,
}: {
  locale: Locale;
  rows: OrderRow[];
  totalRows: number;
}) {
  const t = TEXT[locale];

  const amount = rows.reduce((sum, row) => sum + row.price, 0);
  const remaining = rows.reduce((sum, row) => sum + row.remaining, 0);
  const collected = rows.reduce((sum, row) => sum + row.cashCollectedAmount, 0);

  return (
    <div className="grid gap-3 rounded-xl border bg-background p-3 md:grid-cols-4">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{t.reportTotal}</div>
        <div className="text-lg font-semibold tabular-nums">{formatNumber(totalRows || rows.length)}</div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{t.reportAmount}</div>
        <div className="text-lg font-semibold">
          <Money value={amount} />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{t.reportRemaining}</div>
        <div className="text-lg font-semibold">
          <Money value={remaining} />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{t.reportCollected}</div>
        <div className="text-lg font-semibold">
          <Money value={collected} />
        </div>
      </div>
    </div>
  );
}

export default function OrdersReportPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [whoami, setWhoami] = React.useState<WhoAmI | null>(null);

  const [baseRows, setBaseRows] = React.useState<OrderRow[]>([]);
  const [rows, setRows] = React.useState<OrderRow[]>([]);
  const [totalRows, setTotalRows] = React.useState(0);
  const [selectedRows, setSelectedRows] = React.useState<Record<string, boolean>>({});

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [statusTab, setStatusTab] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search);

  const [payment, setPayment] = React.useState("all");
  const [delivery, setDelivery] = React.useState("all");
  const [salesAgentFilter, setSalesAgentFilter] = React.useState("all");
  const [deliveryAgentFilter, setDeliveryAgentFilter] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("created_desc");

  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(50);
  const [columns, setColumns] = React.useState<Record<ColumnKey, boolean>>(DEFAULT_COLUMNS);

  const t = TEXT[locale];
  const isRtl = locale === "ar";

  const canView =
    hasPermission(whoami, "reports.orders.view") ||
    hasPermission(whoami, "orders.reports.view") ||
    hasPermission(whoami, "orders.view");

  const canExport =
    hasPermission(whoami, "reports.orders.export") ||
    hasPermission(whoami, "orders.export");

  const canPrint =
    hasPermission(whoami, "reports.orders.print") ||
    hasPermission(whoami, "orders.print");

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const selectedCount = Object.values(selectedRows).filter(Boolean).length;
  const visibleColSpan = Math.max(1, Object.values(columns).filter(Boolean).length);

  const allVisibleSelected =
    rows.length > 0 && rows.every((row) => selectedRows[row.id || row.number]);

  const salesAgentOptions = React.useMemo(
    () => buildPersonOptions(baseRows, "salesAgentName"),
    [baseRows],
  );

  const deliveryAgentOptions = React.useMemo(
    () => buildPersonOptions(baseRows, "deliveryAgentName"),
    [baseRows],
  );

  React.useEffect(() => {
    const syncLocale = () => {
      const nextLocale = getLocale();
      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
      document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
    };

    syncLocale();

    window.addEventListener("storage", syncLocale);
    window.addEventListener("primey-locale-changed", syncLocale);

    return () => {
      window.removeEventListener("storage", syncLocale);
      window.removeEventListener("primey-locale-changed", syncLocale);
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;

    fetchWhoami()
      .then((data) => {
        if (mounted) setWhoami(data);
      })
      .catch(() => {
        if (mounted) setWhoami(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const loadReport = React.useCallback(
    async (mode: "normal" | "refresh" = "normal") => {
      if (!canView) {
        setLoading(false);
        setBaseRows([]);
        setRows([]);
        setTotalRows(0);
        return;
      }

      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const query = buildQuery({
          page,
          page_size: pageSize,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        });

        let payload = await fetchOrders(query);
        let normalized = normalizeArray(payload).map(normalizeOrder);

        if ((dateFrom || dateTo) && normalized.length === 0) {
          const fallbackQuery = buildQuery({
            page,
            page_size: pageSize,
          });

          payload = await fetchOrders(fallbackQuery);
          normalized = normalizeArray(payload).map(normalizeOrder);
        }

        try {
          await fetchOrdersReports(
            buildQuery({
              date_from: dateFrom || undefined,
              date_to: dateTo || undefined,
            }),
          );
        } catch {
          // التقرير الجدولي يعتمد على /api/orders/؛ هذا النداء اختياري فقط حتى لا يكسر الصفحة.
        }

        const filteredRows = applyLocalFilters({
          rows: normalized,
          search: debouncedSearch,
          statusTab,
          payment,
          delivery,
          salesAgentFilter,
          deliveryAgentFilter,
          dateFrom,
          dateTo,
          sort,
        });

        setBaseRows(normalized);
        setRows(filteredRows);
        setTotalRows(getTotal(payload, normalized.length) || filteredRows.length);
        setSelectedRows({});
      } catch (err) {
        console.error(err);
        setBaseRows([]);
        setRows([]);
        setTotalRows(0);
        setError(locale === "ar" ? "حدث خطأ أثناء تحميل تقرير الطلبات." : "Failed to load orders report.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      canView,
      dateFrom,
      dateTo,
      debouncedSearch,
      delivery,
      deliveryAgentFilter,
      locale,
      page,
      pageSize,
      payment,
      salesAgentFilter,
      sort,
      statusTab,
    ],
  );

  React.useEffect(() => {
    loadReport("normal");
  }, [loadReport]);

  React.useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    statusTab,
    payment,
    delivery,
    salesAgentFilter,
    deliveryAgentFilter,
    dateFrom,
    dateTo,
    sort,
  ]);

  const resetFilters = () => {
    setSearch("");
    setStatusTab("all");
    setPayment("all");
    setDelivery("all");
    setSalesAgentFilter("all");
    setDeliveryAgentFilter("all");
    setDateFrom("");
    setDateTo("");
    setSort("created_desc");
    setPage(1);
  };

  const toggleAllRows = (checked: boolean) => {
    if (!checked) {
      setSelectedRows({});
      return;
    }

    const next: Record<string, boolean> = {};
    rows.forEach((row) => {
      next[row.id || row.number] = true;
    });
    setSelectedRows(next);
  };

  const toggleRow = (key: string, checked: boolean) => {
    setSelectedRows((current) => ({
      ...current,
      [key]: checked,
    }));
  };

  const handleExport = () => {
    if (!rows.length) {
      toast.warning(locale === "ar" ? "لا توجد بيانات للتصدير" : "No rows to export");
      return;
    }

    exportExcel(rows, locale);
    toast.success(locale === "ar" ? "تم تصدير تقرير الطلبات" : "Orders report exported");
  };

  const handlePrint = () => {
    if (!rows.length) {
      toast.warning(locale === "ar" ? "لا توجد بيانات للطباعة" : "No rows to print");
      return;
    }

    printRows(rows, locale);
  };

  const columnLabels: Record<ColumnKey, string> = {
    select: "",
    number: t.table.number,
    product: t.table.product,
    price: t.table.price,
    customer: t.table.customer,
    salesAgent: t.table.salesAgent,
    deliveryAgent: t.table.deliveryAgent,
    date: t.table.date,
    type: t.table.type,
    payment: t.table.payment,
    delivery: t.table.delivery,
    status: t.table.status,
    cash: t.table.cash,
    actions: "",
  };

  return (
    <div className="w-full space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadReport("refresh")}
            disabled={loading || refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {t.refresh}
          </Button>

          {canPrint && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={loading || !rows.length}
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
          )}

          {canExport && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={loading || !rows.length}
            >
              <Download className="h-4 w-4" />
              {t.exportExcel}
            </Button>
          )}

          <Button asChild variant="outline" size="sm">
            <Link href="/system/orders/list">
              <FileText className="h-4 w-4" />
              {t.orderList}
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border bg-background p-3">
        <div className="text-sm font-medium">{t.reportRange}</div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">{t.from}</div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 w-[170px]"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">{t.to}</div>
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-10 w-[170px]"
            />
          </div>

          <Button variant="ghost" className="h-10" onClick={resetFilters}>
            <X className="h-4 w-4" />
            {t.reset}
          </Button>
        </div>
      </div>

      <ReportSummaryBar locale={locale} rows={rows} totalRows={totalRows} />

      <div className="space-y-4 rounded-xl border bg-background p-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{t.reportRows}</h2>
          <p className="text-sm text-muted-foreground">{t.reportRowsHint}</p>
        </div>

        <Tabs value={statusTab} onValueChange={setStatusTab} dir={isRtl ? "rtl" : "ltr"}>
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto min-w-max flex-wrap justify-start gap-1 bg-transparent p-0">
              {STATUS_TABS.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="rounded-md border bg-background px-3 py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {item[locale]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10">
                <PlusCircle className="h-4 w-4" />
                {t.salesAgentFilter}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align={isRtl ? "start" : "end"}
              className="w-80 space-y-4"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <SearchablePersonFilter
                label={t.salesAgentFilter}
                value={salesAgentFilter}
                onChange={setSalesAgentFilter}
                options={salesAgentOptions}
                locale={locale}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10">
                <PlusCircle className="h-4 w-4" />
                {t.deliveryAgentFilter}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align={isRtl ? "start" : "end"}
              className="w-80 space-y-4"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <SearchablePersonFilter
                label={t.deliveryAgentFilter}
                value={deliveryAgentFilter}
                onChange={setDeliveryAgentFilter}
                options={deliveryAgentOptions}
                locale={locale}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-sm">
            <Search
              className={cn(
                "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                isRtl ? "right-3" : "left-3",
              )}
            />
            <Input
              placeholder={t.search}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={cn("h-10", isRtl ? "pr-9 text-right" : "pl-9 text-left")}
              dir={isRtl ? "rtl" : "ltr"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10">
                  <PlusCircle className="h-4 w-4" />
                  {t.payment}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align={isRtl ? "start" : "end"}
                className="w-64 space-y-4"
                dir={isRtl ? "rtl" : "ltr"}
              >
                <FilterSelect
                  label={t.payment}
                  value={payment}
                  onChange={setPayment}
                  options={PAYMENT_OPTIONS}
                  locale={locale}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10">
                  <Truck className="h-4 w-4" />
                  {t.delivery}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align={isRtl ? "start" : "end"}
                className="w-64 space-y-4"
                dir={isRtl ? "rtl" : "ltr"}
              >
                <FilterSelect
                  label={t.delivery}
                  value={delivery}
                  onChange={setDelivery}
                  options={DELIVERY_OPTIONS}
                  locale={locale}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10">
                  <ArrowUpDown className="h-4 w-4" />
                  {t.sort}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align={isRtl ? "start" : "end"}
                className="w-64 space-y-4"
                dir={isRtl ? "rtl" : "ltr"}
              >
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">{t.sort}</div>
                  <Select
                    value={sort}
                    onValueChange={(value) => setSort(value as SortKey)}
                    dir={isRtl ? "rtl" : "ltr"}
                  >
                    <SelectTrigger className="h-9 rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option[locale]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" className="h-10" onClick={resetFilters}>
              <X className="h-4 w-4" />
              {t.reset}
            </Button>
          </div>

          <div className="ms-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10">
                  <span className="hidden lg:inline">{t.columns}</span>
                  <Columns className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-56">
                <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.keys(DEFAULT_COLUMNS).map((key) => {
                  const columnKey = key as ColumnKey;

                  if (columnKey === "select" || columnKey === "actions") return null;

                  return (
                    <DropdownMenuCheckboxItem
                      key={columnKey}
                      checked={columns[columnKey]}
                      onCheckedChange={(checked) =>
                        setColumns((current) => ({
                          ...current,
                          [columnKey]: Boolean(checked),
                        }))
                      }
                    >
                      {columnLabels[columnKey]}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-md border bg-background">
            <div className="w-full overflow-x-auto">
              <Table
                dir={isRtl ? "rtl" : "ltr"}
                className={cn(
                  "min-w-[1540px]",
                  isRtl ? "[&_td]:text-right [&_th]:text-right" : "[&_td]:text-left [&_th]:text-left",
                )}
              >
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <HeaderCell enabled={columns.select} className="w-12">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(checked) => toggleAllRows(Boolean(checked))}
                        aria-label="Select all"
                      />
                    </HeaderCell>

                    <HeaderCell enabled={columns.number} className="min-w-[130px]">
                      {t.table.number}
                    </HeaderCell>

                    <HeaderCell enabled={columns.product} className="min-w-[280px]">
                      {t.table.product}
                    </HeaderCell>

                    <HeaderCell enabled={columns.price} className="min-w-[140px]">
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn("h-8 px-2", isRtl ? "-mr-3" : "-ml-3")}
                        onClick={() => setSort(sort === "price_asc" ? "price_desc" : "price_asc")}
                      >
                        {t.table.price}
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </HeaderCell>

                    <HeaderCell enabled={columns.customer} className="min-w-[220px]">
                      {t.table.customer}
                    </HeaderCell>

                    <HeaderCell enabled={columns.salesAgent} className="min-w-[170px]">
                      {t.table.salesAgent}
                    </HeaderCell>

                    <HeaderCell enabled={columns.deliveryAgent} className="min-w-[170px]">
                      {t.table.deliveryAgent}
                    </HeaderCell>

                    <HeaderCell enabled={columns.date} className="min-w-[150px]">
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn("h-8 px-2", isRtl ? "-mr-3" : "-ml-3")}
                        onClick={() => setSort(sort === "created_asc" ? "created_desc" : "created_asc")}
                      >
                        {t.table.date}
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </HeaderCell>

                    <HeaderCell enabled={columns.type} className="min-w-[120px]">
                      {t.table.type}
                    </HeaderCell>

                    <HeaderCell enabled={columns.payment} className="min-w-[140px]">
                      {t.table.payment}
                    </HeaderCell>

                    <HeaderCell enabled={columns.delivery} className="min-w-[150px]">
                      {t.table.delivery}
                    </HeaderCell>

                    <HeaderCell enabled={columns.status} className="min-w-[140px]">
                      {t.table.status}
                    </HeaderCell>

                    <HeaderCell enabled={columns.cash} className="min-w-[140px]">
                      {t.table.cash}
                    </HeaderCell>

                    <HeaderCell enabled={columns.actions} className="w-14 text-end" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableSkeleton />
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={visibleColSpan} className="h-32 text-center">
                        <div className="space-y-3">
                          <div className="font-medium">{t.errorTitle}</div>
                          <div className="text-sm text-muted-foreground">{error}</div>
                          <Button variant="outline" onClick={() => loadReport("refresh")}>
                            <RefreshCw className="h-4 w-4" />
                            {t.retry}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : rows.length ? (
                    rows.map((row) => {
                      const key = row.id || row.number;

                      return (
                        <TableRow key={key} data-state={selectedRows[key] && "selected"}>
                          <ColumnCell enabled={columns.select}>
                            <Checkbox
                              checked={Boolean(selectedRows[key])}
                              onCheckedChange={(checked) => toggleRow(key, Boolean(checked))}
                              aria-label="Select row"
                            />
                          </ColumnCell>

                          <ColumnCell enabled={columns.number}>
                            <span className="font-medium text-muted-foreground">{row.number}</span>
                          </ColumnCell>

                          <ColumnCell enabled={columns.product}>
                            <div className="min-w-0 space-y-1">
                              <div className="truncate font-medium">
                                {row.id ? (
                                  <Link href={`/system/orders/${row.id}`} className="hover:underline">
                                    {row.productName}
                                  </Link>
                                ) : (
                                  row.productName
                                )}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {row.providerName || statusLabel(row.orderKind, locale)}
                              </div>
                            </div>
                          </ColumnCell>

                          <ColumnCell enabled={columns.price}>
                            <Money value={row.price} />
                            {row.remaining > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {t.remaining} {formatNumber(row.remaining)}
                              </div>
                            )}
                          </ColumnCell>

                          <ColumnCell enabled={columns.customer}>
                            <div className="space-y-1">
                              <div className="font-semibold">{row.customerName}</div>
                              <div className="text-sm text-muted-foreground">
                                {row.customerPhone || row.customerEmail || "—"}
                              </div>
                            </div>
                          </ColumnCell>

                          <ColumnCell enabled={columns.salesAgent}>
                            <div className="font-medium">{row.salesAgentName || "—"}</div>
                          </ColumnCell>

                          <ColumnCell enabled={columns.deliveryAgent}>
                            <div className="font-medium">{row.deliveryAgentName || "—"}</div>
                          </ColumnCell>

                          <ColumnCell enabled={columns.date} className="text-muted-foreground">
                            {formatDate(row.createdAt, locale)}
                          </ColumnCell>

                          <ColumnCell enabled={columns.type}>
                            <div className="capitalize">
                              {row.isCod
                                ? statusLabel("cash_on_delivery", locale)
                                : statusLabel(row.orderKind, locale)}
                            </div>
                          </ColumnCell>

                          <ColumnCell enabled={columns.payment}>
                            <Badge
                              variant="outline"
                              className={cn("rounded-full px-2.5 py-1 capitalize", badgeClass(row.paymentStatus))}
                            >
                              {statusLabel(row.paymentStatus, locale)}
                            </Badge>
                          </ColumnCell>

                          <ColumnCell enabled={columns.delivery}>
                            <div className="text-sm">{statusLabel(row.fulfillmentStatus, locale)}</div>
                          </ColumnCell>

                          <ColumnCell enabled={columns.status}>
                            <Badge
                              variant="outline"
                              className={cn("rounded-full px-2.5 py-1 capitalize", badgeClass(row.status))}
                            >
                              {statusLabel(row.status, locale)}
                            </Badge>
                          </ColumnCell>

                          <ColumnCell enabled={columns.cash}>
                            {row.cashCollectedAmount > 0 ? (
                              <Money value={row.cashCollectedAmount} />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </ColumnCell>

                          <ColumnCell enabled={columns.actions} className="text-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <span className="sr-only">{t.details}</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isRtl ? "start" : "end"}>
                                <DropdownMenuLabel>{t.details}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/system/orders/${row.id}`}>
                                    <Eye className="h-4 w-4" />
                                    {t.details}
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </ColumnCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={visibleColSpan} className="h-24 text-center">
                        {t.noResults}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <div className="flex-1 text-sm text-muted-foreground">
              {selectedCount} {t.of} {rows.length} {t.row} {t.selected}.
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {t.page} {formatNumber(page)} {t.of} {formatNumber(totalPages)}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                {t.previous}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                {t.next}
                {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}