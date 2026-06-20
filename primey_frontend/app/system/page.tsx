"use client";

/* ============================================================
   📂 primey_frontend/app/system/page.tsx
   🧠 Primey Care — System Dashboard
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Clickable KPI cards instead of shortcuts
   ✅ Separate full-width tables:
      - Latest orders
      - Latest payments
      - Latest customers
   ✅ Each table has independent search + filters
   ✅ Real API only
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
  ArrowUpDown,
  Bell,
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
  Loader2,
  Package,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Stethoscope,
  TriangleAlert,
  UserCog,
  Users,
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
  data?: unknown;
  summary?: unknown;
  meta?: unknown;
};

type DashboardStats = {
  customers: number;
  orders: number;
  invoices: number;
  payments: number;
  products: number;
  providers: number;
  agents: number;
  notifications: number;
  totalInvoicesAmount: number;
  totalPaymentsAmount: number;
  pendingOrders: number;
  unpaidInvoices: number;
};

type OrderRecord = {
  id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  provider_name: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  payment_method: string;
  total_amount: number;
  created_at: string | null;
};

type PaymentRecord = {
  id: string;
  payment_number: string;
  customer_name: string;
  invoice_number: string;
  method: string;
  status: string;
  amount: number;
  paid_at: string | null;
  created_at: string | null;
};

type CustomerRecord = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  city: string;
  total_orders: number;
  total_paid: number;
  created_at: string | null;
};

type OrderStatusFilter =
  | "all"
  | "pending"
  | "confirmed"
  | "processing"
  | "completed"
  | "cancelled"
  | "refunded"
  | "card_ready"
  | "assigned_for_delivery"
  | "out_for_delivery"
  | "delivered";

type PaymentStatusFilter =
  | "all"
  | "pending"
  | "paid"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "refunded";

type CustomerStatusFilter = "all" | "active" | "inactive" | "blocked";

type SortKey = "newest" | "oldest" | "amount_high" | "amount_low" | "name";

const API_ENDPOINTS = {
  customers: "/api/company/customers/",
  orders: "/api/company/sales/orders/",
  invoices: "/api/company/sales/invoices/",
  payments: "/api/company/payments/",
  products: "/api/company/products/",
  providers: "/api/providers/",
  agents: "/api/agents/",
  notifications: "/api/notifications/inbox/",
};

const translations = {
  ar: {
    title: "لوحة تحكم النظام",
    subtitle:
      "نظرة تشغيلية موحدة على Primey Care مع مؤشرات مباشرة وجداول منفصلة لآخر الطلبات والمدفوعات والعملاء.",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    from: "من",
    to: "إلى",
    search: "بحث",
    all: "الكل",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    nameSort: "الاسم",
    open: "فتح",
    showing: "عرض",
    rows: "صفوف",
    of: "من",

    totalCustomers: "إجمالي العملاء",
    totalOrders: "إجمالي الطلبات",
    totalInvoices: "إجمالي الفواتير",
    totalPayments: "إجمالي المدفوعات",
    providersCount: "مقدمو الخدمة",
    productsCount: "المنتجات",
    agentsCount: "المندوبون",
    notificationsCount: "الإشعارات",
    pendingOrders: "طلبات معلقة",
    unpaidInvoices: "فواتير غير مدفوعة",
    customers: "العملاء",
    orders: "الطلبات",
    invoices: "الفواتير",
    payments: "المدفوعات",
    products: "المنتجات",
    providers: "مقدمو الخدمة",
    agents: "المندوبون",
    notifications: "الإشعارات",

    latestOrders: "آخر الطلبات",
    latestOrdersDesc: "أحدث الطلبات المسجلة في النظام مع حالة الطلب والدفع والتنفيذ.",
    latestPayments: "آخر المدفوعات",
    latestPaymentsDesc: "أحدث عمليات الدفع والتحصيل المسجلة.",
    latestCustomers: "آخر العملاء",
    latestCustomersDesc: "آخر العملاء المضافين أو المحدثين في النظام.",

    orderSearchPlaceholder: "ابحث برقم الطلب أو العميل أو المنتج أو مقدم الخدمة...",
    paymentSearchPlaceholder: "ابحث برقم الدفع أو العميل أو الفاتورة أو طريقة الدفع...",
    customerSearchPlaceholder: "ابحث باسم العميل أو الجوال أو البريد أو المدينة...",

    orderNumber: "رقم الطلب",
    customer: "العميل",
    product: "المنتج",
    provider: "مقدم الخدمة",
    orderStatus: "حالة الطلب",
    paymentStatus: "حالة الدفع",
    fulfillmentStatus: "التنفيذ",
    paymentMethod: "طريقة الدفع",
    total: "الإجمالي",
    createdAt: "التاريخ",

    paymentNumber: "رقم الدفع",
    invoice: "الفاتورة",
    method: "الطريقة",
    amount: "المبلغ",
    paidAt: "تاريخ الدفع",

    customerName: "اسم العميل",
    phone: "الجوال",
    email: "البريد",
    city: "المدينة",
    status: "الحالة",
    customerOrders: "الطلبات",
    totalPaid: "المدفوع",

    pending: "معلق",
    confirmed: "مؤكد",
    processing: "قيد المعالجة",
    completed: "مكتمل",
    cancelled: "ملغي",
    refunded: "مسترد",
    cardReady: "جاهز للتوصيل",
    assignedForDelivery: "مسند للتوصيل",
    outForDelivery: "خارج للتوصيل",
    delivered: "تم التسليم",

    paid: "مدفوع",
    failed: "فشل",
    active: "نشط",
    inactive: "غير نشط",
    blocked: "محظور",

    noDataTitle: "لا توجد بيانات",
    noDataDesc: "ستظهر البيانات هنا عند توفرها.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل لوحة النظام",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير لوحة النظام",
    generatedAt: "تاريخ الطباعة",
    refreshed: "تم تحديث لوحة النظام.",
    unknown: "غير محدد",
    sar: "ر.س",
  },
  en: {
    title: "System Dashboard",
    subtitle:
      "A unified operational view of Primey Care with live indicators and separate latest orders, payments, and customers tables.",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    from: "From",
    to: "To",
    search: "Search",
    all: "All",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    nameSort: "Name",
    open: "Open",
    showing: "Showing",
    rows: "Rows",
    of: "of",

    totalCustomers: "Total customers",
    totalOrders: "Total orders",
    totalInvoices: "Total invoices",
    totalPayments: "Total payments",
    providersCount: "Providers",
    productsCount: "Products",
    agentsCount: "Agents",
    notificationsCount: "Notifications",
    pendingOrders: "Pending orders",
    unpaidInvoices: "Unpaid invoices",
    customers: "Customers",
    orders: "Orders",
    invoices: "Invoices",
    payments: "Payments",
    products: "Products",
    providers: "Providers",
    agents: "Agents",
    notifications: "Notifications",

    latestOrders: "Latest orders",
    latestOrdersDesc: "Latest system orders with order, payment, and fulfillment statuses.",
    latestPayments: "Latest payments",
    latestPaymentsDesc: "Latest recorded payment and collection transactions.",
    latestCustomers: "Latest customers",
    latestCustomersDesc: "Latest customers added or updated in the system.",

    orderSearchPlaceholder: "Search by order number, customer, product, or provider...",
    paymentSearchPlaceholder: "Search by payment number, customer, invoice, or method...",
    customerSearchPlaceholder: "Search by customer name, phone, email, or city...",

    orderNumber: "Order number",
    customer: "Customer",
    product: "Product",
    provider: "Provider",
    orderStatus: "Order status",
    paymentStatus: "Payment status",
    fulfillmentStatus: "Fulfillment",
    paymentMethod: "Payment method",
    total: "Total",
    createdAt: "Date",

    paymentNumber: "Payment number",
    invoice: "Invoice",
    method: "Method",
    amount: "Amount",
    paidAt: "Paid at",

    customerName: "Customer name",
    phone: "Phone",
    email: "Email",
    city: "City",
    status: "Status",
    customerOrders: "Orders",
    totalPaid: "Paid",

    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
    cardReady: "Card ready",
    assignedForDelivery: "Assigned",
    outForDelivery: "Out for delivery",
    delivered: "Delivered",

    paid: "Paid",
    failed: "Failed",
    active: "Active",
    inactive: "Inactive",
    blocked: "Blocked",

    noDataTitle: "No data",
    noDataDesc: "Data will appear here once available.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load system dashboard",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "System dashboard report",
    generatedAt: "Generated at",
    refreshed: "System dashboard refreshed.",
    unknown: "Unknown",
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).replace("T", " ").slice(0, 16);
  }

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

  if (envBase.endsWith("/api")) {
    return envBase.slice(0, -4);
  }

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

  const data = asRecord(payload.data);
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;

  return [];
}

function extractCount(payload: ApiResponse) {
  const data = asRecord(payload.data);
  const meta = asRecord(payload.meta);
  const summary = asRecord(payload.summary);

  return toNumber(
    payload.count ??
      payload.total ??
      payload.total_count ??
      data.count ??
      data.total ??
      data.total_count ??
      meta.count ??
      meta.total ??
      meta.total_items ??
      summary.total_count ??
      summary.total,
    extractArray(payload).length,
  );
}

function extractSummary(payload: ApiResponse) {
  const data = asRecord(payload.data);
  if (payload.summary) return asRecord(payload.summary);
  if (data.summary) return asRecord(data.summary);
  return data;
}

function normalizeNestedName(value: unknown, keys: string[] = ["name", "full_name", "title"]) {
  const record = asRecord(value);

  for (const key of keys) {
    const text = normalizeText(record[key]);
    if (text) return text;
  }

  return "";
}

function normalizeOrder(value: unknown): OrderRecord {
  const item = asRecord(value);
  const customer = asRecord(item.customer);
  const product = asRecord(item.product);
  const provider = asRecord(item.provider);

  const id = normalizeText(item.id || item.pk || item.uuid);

  return {
    id,
    order_number: normalizeText(item.order_number || item.number || item.code || `#${id}`),
    customer_name:
      normalizeText(item.customer_name) ||
      normalizeNestedName(customer, ["name", "full_name", "display_name"]),
    product_name:
      normalizeText(item.product_name) ||
      normalizeNestedName(product, ["name", "title", "name_ar", "name_en"]),
    provider_name:
      normalizeText(item.provider_name) ||
      normalizeNestedName(provider, ["name", "title", "name_ar", "name_en"]),
    status: normalizeText(item.status || item.order_status || "pending"),
    payment_status: normalizeText(item.payment_status || "pending"),
    fulfillment_status: normalizeText(item.fulfillment_status || item.delivery_status),
    payment_method: normalizeText(item.payment_method || item.method),
    total_amount: toNumber(
      item.total_amount ?? item.total ?? item.grand_total ?? item.amount,
    ),
    created_at: normalizeText(item.created_at || item.created || item.updated_at) || null,
  };
}

function normalizePayment(value: unknown): PaymentRecord {
  const item = asRecord(value);
  const customer = asRecord(item.customer);
  const invoice = asRecord(item.invoice);

  const id = normalizeText(item.id || item.pk || item.uuid);

  return {
    id,
    payment_number: normalizeText(
      item.payment_number || item.receipt_number || item.reference || item.code || `#${id}`,
    ),
    customer_name:
      normalizeText(item.customer_name) ||
      normalizeNestedName(customer, ["name", "full_name", "display_name"]),
    invoice_number:
      normalizeText(item.invoice_number) ||
      normalizeText(invoice.invoice_number || invoice.number || invoice.code),
    method: normalizeText(item.method || item.payment_method || item.gateway || item.channel),
    status: normalizeText(item.status || item.payment_status || "pending"),
    amount: toNumber(item.amount ?? item.paid_amount ?? item.total_amount ?? item.total),
    paid_at:
      normalizeText(item.paid_at || item.payment_date || item.confirmed_at) || null,
    created_at: normalizeText(item.created_at || item.created || item.updated_at) || null,
  };
}

function normalizeCustomer(value: unknown): CustomerRecord {
  const item = asRecord(value);

  const id = normalizeText(item.id || item.pk || item.uuid);

  return {
    id,
    name: normalizeText(item.name || item.full_name || item.display_name || `#${id}`),
    phone: normalizeText(
      item.phone ||
        item.phone_number ||
        item.mobile ||
        item.mobile_number ||
        item.whatsapp_number,
    ),
    email: normalizeText(item.email),
    status: normalizeText(item.status || (item.is_active === false ? "inactive" : "active")),
    city: normalizeText(item.city || item.city_name),
    total_orders: toNumber(item.total_orders ?? item.orders_count ?? item.order_count),
    total_paid: toNumber(item.total_paid ?? item.paid_amount ?? item.total_payments),
    created_at: normalizeText(item.created_at || item.created || item.updated_at) || null,
  };
}

function getOrderStatusLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const status = normalizeText(value).toLowerCase();

  if (status === "confirmed") return t.confirmed;
  if (status === "processing") return t.processing;
  if (status === "completed") return t.completed;
  if (status === "cancelled" || status === "canceled") return t.cancelled;
  if (status === "refunded") return t.refunded;
  if (status === "card_ready") return t.cardReady;
  if (status === "assigned_for_delivery") return t.assignedForDelivery;
  if (status === "out_for_delivery") return t.outForDelivery;
  if (status === "delivered") return t.delivered;

  return t.pending;
}

function getPaymentStatusLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const status = normalizeText(value).toLowerCase();

  if (status === "paid" || status === "confirmed" || status === "success") return t.paid;
  if (status === "failed") return t.failed;
  if (status === "cancelled" || status === "canceled") return t.cancelled;
  if (status === "refunded") return t.refunded;

  return t.pending;
}

function getCustomerStatusLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const status = normalizeText(value).toLowerCase();

  if (status === "inactive") return t.inactive;
  if (status === "blocked") return t.blocked;

  return t.active;
}

function getBadgeClass(value: string) {
  const status = normalizeText(value).toLowerCase();

  if (
    ["paid", "confirmed", "completed", "active", "delivered", "success"].includes(status)
  ) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["failed", "cancelled", "canceled", "blocked", "refunded"].includes(status)) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (["processing", "out_for_delivery", "assigned_for_delivery", "card_ready"].includes(status)) {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

function MoneyValue({
  value,
  label,
}: {
  value: number | null | undefined;
  label: string;
}) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center justify-start gap-1 text-sm font-semibold tabular-nums">
      <span>{formatMoney(value)}</span>
      <img src="/currency/sar.svg" alt={label} className="h-3.5 w-3.5" />
    </div>
  );
}

function StatusBadge({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        getBadgeClass(value),
      )}
    >
      {label}
    </Badge>
  );
}

function KpiCard({
  title,
  value,
  trend,
  href,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href} className="block rounded-lg outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="rounded-lg border bg-card shadow-none transition hover:border-foreground/20 hover:shadow-sm">
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
    </Link>
  );
}

function DashboardSkeleton() {
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
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="rounded-lg border bg-card shadow-none">
            <CardHeader className="min-h-[112px] px-6 py-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-5 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyTableState({
  title,
  description,
  onReset,
  showReset,
}: {
  title: string;
  description: string;
  onReset: () => void;
  showReset: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="space-y-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {showReset ? (
        <Button variant="outline" className="h-9 rounded-lg" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          إعادة ضبط
        </Button>
      ) : null}
    </div>
  );
}

export default function SystemDashboardPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [stats, setStats] = React.useState<DashboardStats>({
    customers: 0,
    orders: 0,
    invoices: 0,
    payments: 0,
    products: 0,
    providers: 0,
    agents: 0,
    notifications: 0,
    totalInvoicesAmount: 0,
    totalPaymentsAmount: 0,
    pendingOrders: 0,
    unpaidInvoices: 0,
  });

  const [orders, setOrders] = React.useState<OrderRecord[]>([]);
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRecord[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [ordersSearch, setOrdersSearch] = React.useState("");
  const [ordersStatus, setOrdersStatus] = React.useState<OrderStatusFilter>("all");
  const [ordersSort, setOrdersSort] = React.useState<SortKey>("newest");
  const [ordersDateFrom, setOrdersDateFrom] = React.useState("");
  const [ordersDateTo, setOrdersDateTo] = React.useState("");

  const [paymentsSearch, setPaymentsSearch] = React.useState("");
  const [paymentsStatus, setPaymentsStatus] = React.useState<PaymentStatusFilter>("all");
  const [paymentsSort, setPaymentsSort] = React.useState<SortKey>("newest");
  const [paymentsDateFrom, setPaymentsDateFrom] = React.useState("");
  const [paymentsDateTo, setPaymentsDateTo] = React.useState("");

  const [customersSearch, setCustomersSearch] = React.useState("");
  const [customersStatus, setCustomersStatus] = React.useState<CustomerStatusFilter>("all");
  const [customersSort, setCustomersSort] = React.useState<SortKey>("newest");
  const [customersDateFrom, setCustomersDateFrom] = React.useState("");
  const [customersDateTo, setCustomersDateTo] = React.useState("");

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

  const loadDashboard = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const smallParams = new URLSearchParams({
          page: "1",
          page_size: "1",
        });

        const rowsParams = new URLSearchParams({
          page: "1",
          page_size: "12",
          ordering: "-created_at",
        });

        const [
          customersCountResponse,
          ordersResponse,
          invoicesResponse,
          paymentsResponse,
          productsResponse,
          providersResponse,
          agentsResponse,
          notificationsResponse,
          customersRowsResponse,
        ] = await Promise.allSettled([
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.customers, smallParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.orders, rowsParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.invoices, smallParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.payments, rowsParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.products, smallParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.providers, smallParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.agents, smallParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.notifications, smallParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.customers, rowsParams), controller.signal),
        ]);

        const getPayload = (result: PromiseSettledResult<ApiResponse>) =>
          result.status === "fulfilled" ? result.value : {};

        const customersCountPayload = getPayload(customersCountResponse);
        const ordersPayload = getPayload(ordersResponse);
        const invoicesPayload = getPayload(invoicesResponse);
        const paymentsPayload = getPayload(paymentsResponse);
        const productsPayload = getPayload(productsResponse);
        const providersPayload = getPayload(providersResponse);
        const agentsPayload = getPayload(agentsResponse);
        const notificationsPayload = getPayload(notificationsResponse);
        const customersRowsPayload = getPayload(customersRowsResponse);

        const ordersSummary = extractSummary(ordersPayload);
        const invoicesSummary = extractSummary(invoicesPayload);
        const paymentsSummary = extractSummary(paymentsPayload);

        setOrders(extractArray(ordersPayload).map(normalizeOrder));
        setPayments(extractArray(paymentsPayload).map(normalizePayment));
        setCustomers(extractArray(customersRowsPayload).map(normalizeCustomer));

        setStats({
          customers: extractCount(customersCountPayload),
          orders: extractCount(ordersPayload),
          invoices: extractCount(invoicesPayload),
          payments: extractCount(paymentsPayload),
          products: extractCount(productsPayload),
          providers: extractCount(providersPayload),
          agents: extractCount(agentsPayload),
          notifications: extractCount(notificationsPayload),
          totalInvoicesAmount: toNumber(
            invoicesSummary.total_amount ||
              invoicesSummary.total ||
              invoicesSummary.grand_total ||
              invoicesSummary.invoices_total,
          ),
          totalPaymentsAmount: toNumber(
            paymentsSummary.total_amount ||
              paymentsSummary.total ||
              paymentsSummary.paid_amount ||
              paymentsSummary.payments_total,
          ),
          pendingOrders: toNumber(
            ordersSummary.pending_count ||
              ordersSummary.pending ||
              ordersSummary.pending_orders,
          ),
          unpaidInvoices: toNumber(
            invoicesSummary.unpaid_count ||
              invoicesSummary.pending_count ||
              invoicesSummary.unpaid ||
              invoicesSummary.due_count,
          ),
        });

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
    void loadDashboard();
  }, [loadDashboard]);

  const filteredOrders = React.useMemo(() => {
    const query = ordersSearch.trim().toLowerCase();

    let rows = orders.filter((order) => {
      const matchesSearch =
        !query ||
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.product_name.toLowerCase().includes(query) ||
        order.provider_name.toLowerCase().includes(query);

      const status = order.status.toLowerCase();
      const matchesStatus = ordersStatus === "all" || status === ordersStatus;

      const date = formatDate(order.created_at);
      const matchesFrom = !ordersDateFrom || (date !== "—" && date >= ordersDateFrom);
      const matchesTo = !ordersDateTo || (date !== "—" && date <= ordersDateTo);

      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });

    rows = [...rows].sort((a, b) => {
      if (ordersSort === "oldest") {
        return String(a.created_at || "").localeCompare(String(b.created_at || ""));
      }

      if (ordersSort === "amount_high") return b.total_amount - a.total_amount;
      if (ordersSort === "amount_low") return a.total_amount - b.total_amount;
      if (ordersSort === "name") return a.customer_name.localeCompare(b.customer_name);

      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

    return rows;
  }, [orders, ordersDateFrom, ordersDateTo, ordersSearch, ordersSort, ordersStatus]);

  const filteredPayments = React.useMemo(() => {
    const query = paymentsSearch.trim().toLowerCase();

    let rows = payments.filter((payment) => {
      const matchesSearch =
        !query ||
        payment.payment_number.toLowerCase().includes(query) ||
        payment.customer_name.toLowerCase().includes(query) ||
        payment.invoice_number.toLowerCase().includes(query) ||
        payment.method.toLowerCase().includes(query);

      const status = payment.status.toLowerCase();
      const matchesStatus = paymentsStatus === "all" || status === paymentsStatus;

      const date = formatDate(payment.paid_at || payment.created_at);
      const matchesFrom = !paymentsDateFrom || (date !== "—" && date >= paymentsDateFrom);
      const matchesTo = !paymentsDateTo || (date !== "—" && date <= paymentsDateTo);

      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });

    rows = [...rows].sort((a, b) => {
      if (paymentsSort === "oldest") {
        return String(a.paid_at || a.created_at || "").localeCompare(
          String(b.paid_at || b.created_at || ""),
        );
      }

      if (paymentsSort === "amount_high") return b.amount - a.amount;
      if (paymentsSort === "amount_low") return a.amount - b.amount;
      if (paymentsSort === "name") return a.customer_name.localeCompare(b.customer_name);

      return String(b.paid_at || b.created_at || "").localeCompare(
        String(a.paid_at || a.created_at || ""),
      );
    });

    return rows;
  }, [
    payments,
    paymentsDateFrom,
    paymentsDateTo,
    paymentsSearch,
    paymentsSort,
    paymentsStatus,
  ]);

  const filteredCustomers = React.useMemo(() => {
    const query = customersSearch.trim().toLowerCase();

    let rows = customers.filter((customer) => {
      const matchesSearch =
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        customer.city.toLowerCase().includes(query);

      const status = customer.status.toLowerCase();
      const matchesStatus = customersStatus === "all" || status === customersStatus;

      const date = formatDate(customer.created_at);
      const matchesFrom = !customersDateFrom || (date !== "—" && date >= customersDateFrom);
      const matchesTo = !customersDateTo || (date !== "—" && date <= customersDateTo);

      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });

    rows = [...rows].sort((a, b) => {
      if (customersSort === "oldest") {
        return String(a.created_at || "").localeCompare(String(b.created_at || ""));
      }

      if (customersSort === "amount_high") return b.total_paid - a.total_paid;
      if (customersSort === "amount_low") return a.total_paid - b.total_paid;
      if (customersSort === "name") return a.name.localeCompare(b.name);

      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

    return rows;
  }, [
    customers,
    customersDateFrom,
    customersDateTo,
    customersSearch,
    customersSort,
    customersStatus,
  ]);

  const hasOrdersFilters =
    Boolean(ordersSearch.trim()) ||
    ordersStatus !== "all" ||
    Boolean(ordersDateFrom) ||
    Boolean(ordersDateTo) ||
    ordersSort !== "newest";

  const hasPaymentsFilters =
    Boolean(paymentsSearch.trim()) ||
    paymentsStatus !== "all" ||
    Boolean(paymentsDateFrom) ||
    Boolean(paymentsDateTo) ||
    paymentsSort !== "newest";

  const hasCustomersFilters =
    Boolean(customersSearch.trim()) ||
    customersStatus !== "all" ||
    Boolean(customersDateFrom) ||
    Boolean(customersDateTo) ||
    customersSort !== "newest";

  function resetOrdersFilters() {
    setOrdersSearch("");
    setOrdersStatus("all");
    setOrdersDateFrom("");
    setOrdersDateTo("");
    setOrdersSort("newest");
  }

  function resetPaymentsFilters() {
    setPaymentsSearch("");
    setPaymentsStatus("all");
    setPaymentsDateFrom("");
    setPaymentsDateTo("");
    setPaymentsSort("newest");
  }

  function resetCustomersFilters() {
    setCustomersSearch("");
    setCustomersStatus("all");
    setCustomersDateFrom("");
    setCustomersDateTo("");
    setCustomersSort("newest");
  }

  function buildExportRows() {
    return {
      orders: filteredOrders.map((order) => ({
        orderNumber: order.order_number,
        customer: order.customer_name,
        product: order.product_name,
        provider: order.provider_name,
        status: getOrderStatusLabel(order.status, locale),
        payment: getPaymentStatusLabel(order.payment_status, locale),
        amount: formatMoney(order.total_amount),
        createdAt: formatDateTime(order.created_at),
      })),
      payments: filteredPayments.map((payment) => ({
        paymentNumber: payment.payment_number,
        customer: payment.customer_name,
        invoice: payment.invoice_number,
        method: payment.method,
        status: getPaymentStatusLabel(payment.status, locale),
        amount: formatMoney(payment.amount),
        paidAt: formatDateTime(payment.paid_at || payment.created_at),
      })),
      customers: filteredCustomers.map((customer) => ({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        city: customer.city,
        status: getCustomerStatusLabel(customer.status, locale),
        orders: customer.total_orders,
        paid: formatMoney(customer.total_paid),
        createdAt: formatDateTime(customer.created_at),
      })),
    };
  }

  function exportExcel() {
    const rows = buildExportRows();
    const totalRows = rows.orders.length + rows.payments.length + rows.customers.length;

    if (!totalRows) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; direction: ${dir}; }
            h2 { margin-top: 24px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
            th, td { border: 1px solid #d9d9d9; padding: 8px; text-align: ${locale === "ar" ? "right" : "left"}; }
            th { background: #f3f4f6; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.printTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <h2>${escapeHtml(t.latestOrders)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.orderNumber)}</th>
                <th>${escapeHtml(t.customer)}</th>
                <th>${escapeHtml(t.product)}</th>
                <th>${escapeHtml(t.provider)}</th>
                <th>${escapeHtml(t.orderStatus)}</th>
                <th>${escapeHtml(t.paymentStatus)}</th>
                <th>${escapeHtml(t.total)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.orders
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.orderNumber)}</td>
                      <td>${escapeHtml(row.customer)}</td>
                      <td>${escapeHtml(row.product)}</td>
                      <td>${escapeHtml(row.provider)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.payment)}</td>
                      <td>${escapeHtml(row.amount)}</td>
                      <td>${escapeHtml(row.createdAt)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

          <h2>${escapeHtml(t.latestPayments)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.paymentNumber)}</th>
                <th>${escapeHtml(t.customer)}</th>
                <th>${escapeHtml(t.invoice)}</th>
                <th>${escapeHtml(t.method)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.amount)}</th>
                <th>${escapeHtml(t.paidAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.payments
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.paymentNumber)}</td>
                      <td>${escapeHtml(row.customer)}</td>
                      <td>${escapeHtml(row.invoice)}</td>
                      <td>${escapeHtml(row.method)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.amount)}</td>
                      <td>${escapeHtml(row.paidAt)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

          <h2>${escapeHtml(t.latestCustomers)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.customerName)}</th>
                <th>${escapeHtml(t.phone)}</th>
                <th>${escapeHtml(t.email)}</th>
                <th>${escapeHtml(t.city)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.customerOrders)}</th>
                <th>${escapeHtml(t.totalPaid)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.customers
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.name)}</td>
                      <td>${escapeHtml(row.phone)}</td>
                      <td>${escapeHtml(row.email)}</td>
                      <td>${escapeHtml(row.city)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.orders)}</td>
                      <td>${escapeHtml(row.paid)}</td>
                      <td>${escapeHtml(row.createdAt)}</td>
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
    link.download = `primey-care-system-dashboard-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    const rows = buildExportRows();
    const totalRows = rows.orders.length + rows.payments.length + rows.customers.length;

    if (!totalRows) {
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
            h2 { margin: 24px 0 10px; font-size: 16px; }
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
              <p>${escapeHtml(t.showing)}: ${escapeHtml(totalRows)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.customers)}</span><strong>${escapeHtml(stats.customers)}</strong></div>
            <div class="box"><span>${escapeHtml(t.orders)}</span><strong>${escapeHtml(stats.orders)}</strong></div>
            <div class="box"><span>${escapeHtml(t.invoices)}</span><strong>${escapeHtml(stats.invoices)}</strong></div>
            <div class="box"><span>${escapeHtml(t.payments)}</span><strong>${escapeHtml(stats.payments)}</strong></div>
          </div>

          <h2>${escapeHtml(t.latestOrders)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.orderNumber)}</th>
                <th>${escapeHtml(t.customer)}</th>
                <th>${escapeHtml(t.product)}</th>
                <th>${escapeHtml(t.provider)}</th>
                <th>${escapeHtml(t.orderStatus)}</th>
                <th>${escapeHtml(t.paymentStatus)}</th>
                <th>${escapeHtml(t.total)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.orders
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.orderNumber)}</td>
                      <td>${escapeHtml(row.customer)}</td>
                      <td>${escapeHtml(row.product)}</td>
                      <td>${escapeHtml(row.provider)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.payment)}</td>
                      <td>${escapeHtml(row.amount)}</td>
                      <td>${escapeHtml(row.createdAt)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

          <h2>${escapeHtml(t.latestPayments)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.paymentNumber)}</th>
                <th>${escapeHtml(t.customer)}</th>
                <th>${escapeHtml(t.invoice)}</th>
                <th>${escapeHtml(t.method)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.amount)}</th>
                <th>${escapeHtml(t.paidAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.payments
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.paymentNumber)}</td>
                      <td>${escapeHtml(row.customer)}</td>
                      <td>${escapeHtml(row.invoice)}</td>
                      <td>${escapeHtml(row.method)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.amount)}</td>
                      <td>${escapeHtml(row.paidAt)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

          <h2>${escapeHtml(t.latestCustomers)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.customerName)}</th>
                <th>${escapeHtml(t.phone)}</th>
                <th>${escapeHtml(t.email)}</th>
                <th>${escapeHtml(t.city)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.customerOrders)}</th>
                <th>${escapeHtml(t.totalPaid)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.customers
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.name)}</td>
                      <td>${escapeHtml(row.phone)}</td>
                      <td>${escapeHtml(row.email)}</td>
                      <td>${escapeHtml(row.city)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.orders)}</td>
                      <td>${escapeHtml(row.paid)}</td>
                      <td>${escapeHtml(row.createdAt)}</td>
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
        <DashboardSkeleton />
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
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadDashboard({ silent: true })}
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
          title={t.totalCustomers}
          value={formatInteger(stats.customers)}
          trend={t.customers}
          href="/system/customers"
          icon={Users}
        />

        <KpiCard
          title={t.totalOrders}
          value={formatInteger(stats.orders)}
          trend={`${t.pendingOrders}: ${formatInteger(stats.pendingOrders)}`}
          href="/system/orders"
          icon={ShoppingCart}
        />

        <KpiCard
          title={t.totalInvoices}
          value={formatInteger(stats.invoices)}
          trend={`${formatMoney(stats.totalInvoicesAmount)} ${t.sar}`}
          href="/system/invoices"
          icon={ReceiptText}
        />

        <KpiCard
          title={t.totalPayments}
          value={formatInteger(stats.payments)}
          trend={`${formatMoney(stats.totalPaymentsAmount)} ${t.sar}`}
          href="/system/payments"
          icon={CreditCard}
        />

        <KpiCard
          title={t.providersCount}
          value={formatInteger(stats.providers)}
          trend={t.providers}
          href="/system/providers"
          icon={Stethoscope}
        />

        <KpiCard
          title={t.productsCount}
          value={formatInteger(stats.products)}
          trend={t.products}
          href="/system/products"
          icon={Package}
        />

        <KpiCard
          title={t.agentsCount}
          value={formatInteger(stats.agents)}
          trend={t.agents}
          href="/system/agents"
          icon={UserCog}
        />

        <KpiCard
          title={t.notificationsCount}
          value={formatInteger(stats.notifications)}
          trend={t.notifications}
          href="/system/notifications"
          icon={Bell}
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
              onClick={() => void loadDashboard()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardHeader className="px-6 py-5">
          <CardTitle>{t.latestOrders}</CardTitle>
          <CardDescription>{t.latestOrdersDesc}</CardDescription>
        </CardHeader>

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
                value={ordersSearch}
                onChange={(event) => setOrdersSearch(event.target.value)}
                placeholder={t.orderSearchPlaceholder}
                className={cn(
                  "h-10 rounded-lg bg-background",
                  locale === "ar" ? "pr-9" : "pl-9",
                )}
              />
            </div>

            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={ordersStatus}
                  onValueChange={(value) => setOrdersStatus(value as OrderStatusFilter)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="pending">{t.pending}</SelectItem>
                    <SelectItem value="confirmed">{t.confirmed}</SelectItem>
                    <SelectItem value="processing">{t.processing}</SelectItem>
                    <SelectItem value="completed">{t.completed}</SelectItem>
                    <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                    <SelectItem value="refunded">{t.refunded}</SelectItem>
                    <SelectItem value="card_ready">{t.cardReady}</SelectItem>
                    <SelectItem value="assigned_for_delivery">{t.assignedForDelivery}</SelectItem>
                    <SelectItem value="out_for_delivery">{t.outForDelivery}</SelectItem>
                    <SelectItem value="delivered">{t.delivered}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t.from}</span>
                  <Input
                    type="date"
                    value={ordersDateFrom}
                    onChange={(event) => setOrdersDateFrom(event.target.value)}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.to}</span>
                  <Input
                    type="date"
                    value={ordersDateTo}
                    onChange={(event) => setOrdersDateTo(event.target.value)}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={ordersSort}
                  onValueChange={(value) => setOrdersSort(value as SortKey)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[155px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
                    <SelectItem value="amount_low">{t.amountLow}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-background"
                  onClick={resetOrdersFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[1180px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-11 w-[160px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.orderNumber}
                    </TableHead>
                    <TableHead className="h-11 w-[180px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.customer}
                    </TableHead>
                    <TableHead className="h-11 w-[210px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.product}
                    </TableHead>
                    <TableHead className="h-11 w-[180px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.provider}
                    </TableHead>
                    <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.orderStatus}
                    </TableHead>
                    <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.paymentStatus}
                    </TableHead>
                    <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.total}
                    </TableHead>
                    <TableHead className="h-11 w-[145px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.createdAt}
                    </TableHead>
                    <TableHead className="h-11 w-[80px] whitespace-nowrap px-4 text-center text-xs font-semibold text-muted-foreground">
                      {t.open}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredOrders.length ? (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id || order.order_number} className="h-[62px]">
                        <TableCell className="h-[62px] w-[160px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {order.order_number}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[180px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-foreground">
                            {order.customer_name || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[210px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {order.product_name || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[180px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {order.provider_name || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                          <StatusBadge
                            value={order.status}
                            label={getOrderStatusLabel(order.status, locale)}
                          />
                        </TableCell>

                        <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                          <StatusBadge
                            value={order.payment_status}
                            label={getPaymentStatusLabel(order.payment_status, locale)}
                          />
                        </TableCell>

                        <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                          <MoneyValue value={order.total_amount} label={t.sar} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[145px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm tabular-nums text-muted-foreground">
                            {formatDateTime(order.created_at)}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[80px] overflow-hidden px-4 text-center align-middle">
                          <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                            <Link href={`/system/orders/${order.id}`}>{t.open}</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-72">
                        <EmptyTableState
                          title={hasOrdersFilters ? t.noResultsTitle : t.noDataTitle}
                          description={hasOrdersFilters ? t.noResultsDesc : t.noDataDesc}
                          onReset={resetOrdersFilters}
                          showReset={hasOrdersFilters}
                        />
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
              {formatInteger(filteredOrders.length)}
            </span>{" "}
            {t.of}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(orders.length)}
            </span>{" "}
            {t.rows}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardHeader className="px-6 py-5">
          <CardTitle>{t.latestPayments}</CardTitle>
          <CardDescription>{t.latestPaymentsDesc}</CardDescription>
        </CardHeader>

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
                value={paymentsSearch}
                onChange={(event) => setPaymentsSearch(event.target.value)}
                placeholder={t.paymentSearchPlaceholder}
                className={cn(
                  "h-10 rounded-lg bg-background",
                  locale === "ar" ? "pr-9" : "pl-9",
                )}
              />
            </div>

            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={paymentsStatus}
                  onValueChange={(value) => setPaymentsStatus(value as PaymentStatusFilter)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="pending">{t.pending}</SelectItem>
                    <SelectItem value="paid">{t.paid}</SelectItem>
                    <SelectItem value="confirmed">{t.confirmed}</SelectItem>
                    <SelectItem value="failed">{t.failed}</SelectItem>
                    <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                    <SelectItem value="refunded">{t.refunded}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t.from}</span>
                  <Input
                    type="date"
                    value={paymentsDateFrom}
                    onChange={(event) => setPaymentsDateFrom(event.target.value)}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.to}</span>
                  <Input
                    type="date"
                    value={paymentsDateTo}
                    onChange={(event) => setPaymentsDateTo(event.target.value)}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={paymentsSort}
                  onValueChange={(value) => setPaymentsSort(value as SortKey)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[155px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
                    <SelectItem value="amount_low">{t.amountLow}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-background"
                  onClick={resetPaymentsFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-11 w-[170px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.paymentNumber}
                    </TableHead>
                    <TableHead className="h-11 w-[180px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.customer}
                    </TableHead>
                    <TableHead className="h-11 w-[150px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.invoice}
                    </TableHead>
                    <TableHead className="h-11 w-[150px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.method}
                    </TableHead>
                    <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.status}
                    </TableHead>
                    <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.amount}
                    </TableHead>
                    <TableHead className="h-11 w-[145px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.paidAt}
                    </TableHead>
                    <TableHead className="h-11 w-[80px] whitespace-nowrap px-4 text-center text-xs font-semibold text-muted-foreground">
                      {t.open}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredPayments.length ? (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id || payment.payment_number} className="h-[62px]">
                        <TableCell className="h-[62px] w-[170px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {payment.payment_number}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[180px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-foreground">
                            {payment.customer_name || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[150px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {payment.invoice_number || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[150px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {payment.method || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-right align-middle">
                          <StatusBadge
                            value={payment.status}
                            label={getPaymentStatusLabel(payment.status, locale)}
                          />
                        </TableCell>

                        <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                          <MoneyValue value={payment.amount} label={t.sar} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[145px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm tabular-nums text-muted-foreground">
                            {formatDateTime(payment.paid_at || payment.created_at)}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[80px] overflow-hidden px-4 text-center align-middle">
                          <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                            <Link href={`/system/payments/${payment.id}`}>{t.open}</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-72">
                        <EmptyTableState
                          title={hasPaymentsFilters ? t.noResultsTitle : t.noDataTitle}
                          description={hasPaymentsFilters ? t.noResultsDesc : t.noDataDesc}
                          onReset={resetPaymentsFilters}
                          showReset={hasPaymentsFilters}
                        />
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
              {formatInteger(filteredPayments.length)}
            </span>{" "}
            {t.of}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(payments.length)}
            </span>{" "}
            {t.rows}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardHeader className="px-6 py-5">
          <CardTitle>{t.latestCustomers}</CardTitle>
          <CardDescription>{t.latestCustomersDesc}</CardDescription>
        </CardHeader>

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
                value={customersSearch}
                onChange={(event) => setCustomersSearch(event.target.value)}
                placeholder={t.customerSearchPlaceholder}
                className={cn(
                  "h-10 rounded-lg bg-background",
                  locale === "ar" ? "pr-9" : "pl-9",
                )}
              />
            </div>

            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={customersStatus}
                  onValueChange={(value) => setCustomersStatus(value as CustomerStatusFilter)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="active">{t.active}</SelectItem>
                    <SelectItem value="inactive">{t.inactive}</SelectItem>
                    <SelectItem value="blocked">{t.blocked}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t.from}</span>
                  <Input
                    type="date"
                    value={customersDateFrom}
                    onChange={(event) => setCustomersDateFrom(event.target.value)}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.to}</span>
                  <Input
                    type="date"
                    value={customersDateTo}
                    onChange={(event) => setCustomersDateTo(event.target.value)}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={customersSort}
                  onValueChange={(value) => setCustomersSort(value as SortKey)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[155px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
                    <SelectItem value="amount_low">{t.amountLow}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-background"
                  onClick={resetCustomersFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[1060px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-11 w-[220px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.customerName}
                    </TableHead>
                    <TableHead className="h-11 w-[155px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.phone}
                    </TableHead>
                    <TableHead className="h-11 w-[210px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.email}
                    </TableHead>
                    <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.city}
                    </TableHead>
                    <TableHead className="h-11 w-[115px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.status}
                    </TableHead>
                    <TableHead className="h-11 w-[105px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.customerOrders}
                    </TableHead>
                    <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.totalPaid}
                    </TableHead>
                    <TableHead className="h-11 w-[145px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.createdAt}
                    </TableHead>
                    <TableHead className="h-11 w-[80px] whitespace-nowrap px-4 text-center text-xs font-semibold text-muted-foreground">
                      {t.open}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredCustomers.length ? (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id || customer.phone} className="h-[62px]">
                        <TableCell className="h-[62px] w-[220px] overflow-hidden px-4 text-right align-middle">
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {customer.name || t.unknown}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              #{customer.id || "—"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="h-[62px] w-[155px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm tabular-nums text-muted-foreground" dir="ltr">
                            {customer.phone || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[210px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {customer.email || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {customer.city || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[115px] overflow-hidden px-4 text-right align-middle">
                          <StatusBadge
                            value={customer.status}
                            label={getCustomerStatusLabel(customer.status, locale)}
                          />
                        </TableCell>

                        <TableCell className="h-[62px] w-[105px] overflow-hidden px-4 text-right align-middle">
                          <span className="text-sm font-medium tabular-nums">
                            {formatInteger(customer.total_orders)}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                          <MoneyValue value={customer.total_paid} label={t.sar} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[145px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm tabular-nums text-muted-foreground">
                            {formatDateTime(customer.created_at)}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[80px] overflow-hidden px-4 text-center align-middle">
                          <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                            <Link href={`/system/customers/${customer.id}`}>{t.open}</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-72">
                        <EmptyTableState
                          title={hasCustomersFilters ? t.noResultsTitle : t.noDataTitle}
                          description={hasCustomersFilters ? t.noResultsDesc : t.noDataDesc}
                          onReset={resetCustomersFilters}
                          showReset={hasCustomersFilters}
                        />
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
              {formatInteger(filteredCustomers.length)}
            </span>{" "}
            {t.of}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(customers.length)}
            </span>{" "}
            {t.rows}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}