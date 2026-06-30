"use client";
/* ============================================================
   📂 primey_frontend/app/company/page.tsx
   🧠 Mhamcloud — Company Dashboard
   ------------------------------------------------------------
   ✅ Same approved system dashboard pattern
   ✅ Company workspace only
   ✅ Activity-aware company overview
   ✅ Clickable KPI cards
   ✅ Separate full-width tables:
      - Latest sales invoices
      - Latest treasury payments
      - Activity records: stock/products by available API
   ✅ Real API only, no fake demo data
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ English numbers/money always
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost hardcoding
============================================================ */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowUpDown,
  Boxes,
  Building2,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TriangleAlert,
  Users,
  Wallet,
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
type ApiRecord = Record<string, unknown>;
type ApiResponse = ApiRecord | ApiRecord[];
type SortKey = "newest" | "oldest" | "amount_high" | "amount_low" | "name";
type StatusFilter =
  | "all"
  | "active"
  | "inactive"
  | "draft"
  | "posted"
  | "confirmed"
  | "paid"
  | "unpaid"
  | "partial"
  | "pending"
  | "failed"
  | "cancelled"
  | "void"
  | "refunded";
type DashboardStats = {
  salesTotal: number;
  salesInvoices: number;
  paymentAmount: number;
  payments: number;
  customers: number;
  suppliers: number;
  products: number;
  stockItems: number;
};
type SalesInvoiceRecord = {
  id: string;
  number: string;
  customer_name: string;
  status: string;
  amount: number;
  issue_date: string | null;
  created_at: string | null;
};
type PaymentRecord = {
  id: string;
  reference: string;
  party_name: string;
  method: string;
  status: string;
  amount: number;
  paid_at: string | null;
  created_at: string | null;
};
type ActivityRecord = {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  status: string;
  updated_at: string | null;
};
type DataColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};
const API_ENDPOINTS = {
  whoami: ["/api/auth/whoami/"],
  customers: ["/api/company/customers/"],
  suppliers: ["/api/company/suppliers/"],
  products: ["/api/company/products/"],
  salesInvoices: ["/api/company/sales/invoices/"],
  purchaseBills: ["/api/company/purchases/bills/"],
  /*
   * Inventory stock summary is not exposed yet in the current company API.
   * Until the inventory module page is reviewed, use company products as the
   * activity/stock snapshot source to avoid false 404 noise.
   */
  stockSummary: ["/api/company/products/"],
  /*
   * Treasury payments endpoint is not available yet.
   * Keep it optional so the dashboard remains clean and does not show a false
   * partial-warning while the treasury module is not reviewed.
   */
  treasuryPayments: [],
} as const;
const translations = {
  ar: {
    title: "لوحة الشركة",
    subtitle:
      "مركز تشغيل الشركة الحالية لمتابعة المبيعات، الخزينة، العملاء، الموردين، المنتجات، والمخزون حسب الباقة والصلاحيات والنشاط.",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    search: "بحث",
    all: "الكل",
    from: "من",
    to: "إلى",
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
    sar: "ر.س",
    unknown: "غير محدد",
    companyHealth: "مساحة الشركة",
    connectedToLiveApis: "متصل بواجهات الشركة الحقيقية",
    partialWarningTitle: "تم تحميل الصفحة جزئيًا",
    partialWarningDesc: "بعض واجهات الشركة لم تعد بيانات صالحة، لذلك تظهر الأقسام المتاحة فقط.",
    salesTotal: "إجمالي المبيعات",
    salesInvoices: "فواتير المبيعات",
    paymentAmount: "إجمالي التحصيل",
    payments: "مدفوعات الخزينة",
    customers: "العملاء",
    suppliers: "الموردون",
    products: "المنتجات والخدمات",
    stockItems: "عناصر المخزون",
    sales: "المبيعات",
    treasury: "الخزينة",
    parties: "الأطراف",
    catalog: "الكتالوج",
    inventory: "المخزون",
    latestSalesInvoices: "آخر فواتير المبيعات",
    latestSalesInvoicesDesc: "أحدث فواتير المبيعات الخاصة بالشركة الحالية.",
    latestPayments: "آخر مدفوعات الخزينة",
    latestPaymentsDesc: "أحدث عمليات القبض أو الصرف المتاحة من واجهات الشركة.",
    activityRecords: "آخر بيانات النشاط",
    activityRecordsDesc: "بيانات تشغيلية حسب نشاط الشركة والواجهات المتاحة، مثل المخزون أو المنتجات.",
    invoiceSearchPlaceholder: "ابحث برقم الفاتورة أو العميل أو الحالة...",
    paymentSearchPlaceholder: "ابحث بالمرجع أو الطرف أو الطريقة أو الحالة...",
    activitySearchPlaceholder: "ابحث باسم المنتج أو الكود أو التصنيف أو الحالة...",
    invoice: "الفاتورة",
    customer: "العميل",
    issueDate: "التاريخ",
    amount: "المبلغ",
    status: "الحالة",
    reference: "المرجع",
    party: "الطرف",
    method: "الطريقة",
    paidAt: "تاريخ الدفع",
    item: "العنصر",
    sku: "الكود",
    category: "التصنيف",
    quantity: "الكمية",
    updatedAt: "آخر تحديث",
    active: "نشط",
    inactive: "غير نشط",
    draft: "مسودة",
    posted: "مرحل",
    confirmed: "مؤكد",
    paid: "مدفوع",
    unpaid: "غير مدفوع",
    partial: "جزئي",
    pending: "معلق",
    failed: "فشل",
    cancelled: "ملغي",
    void: "ملغي",
    refunded: "مسترد",
    noDataTitle: "لا توجد بيانات",
    noDataDesc: "ستظهر البيانات هنا عند توفرها من API.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل لوحة الشركة",
    errorDesc: "تأكد من تسجيل الدخول داخل مساحة الشركة ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير لوحة الشركة",
    generatedAt: "تاريخ الطباعة",
    refreshed: "تم تحديث لوحة الشركة.",
    currentCompany: "الشركة الحالية",
    activityLabel: "النشاط",
    genericActivity: "نشاط عام",
    retailActivity: "تجارة التجزئة",
    wholesaleActivity: "تجارة الجملة",
    restaurantActivity: "مطاعم ومقاهي",
    jewelryActivity: "ذهب ومجوهرات",
    servicesActivity: "خدمات",
    manufacturingActivity: "تصنيع",
  },
  en: {
    title: "Company Dashboard",
    subtitle:
      "Operational center for the current company: sales, treasury, customers, suppliers, products, and inventory by plan, permissions, and activity.",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    search: "Search",
    all: "All",
    from: "From",
    to: "To",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    nameSort: "Name",
    open: "Open",
    showing: "Showing",
    rows: "rows",
    of: "of",
    sar: "SAR",
    unknown: "Unknown",
    companyHealth: "Company workspace",
    connectedToLiveApis: "Connected to real company APIs",
    partialWarningTitle: "Partially loaded",
    partialWarningDesc: "Some company APIs did not return valid data, so only available sections are shown.",
    salesTotal: "Sales total",
    salesInvoices: "Sales invoices",
    paymentAmount: "Collected amount",
    payments: "Treasury payments",
    customers: "Customers",
    suppliers: "Suppliers",
    products: "Products & services",
    stockItems: "Stock items",
    sales: "Sales",
    treasury: "Treasury",
    parties: "Parties",
    catalog: "Catalog",
    inventory: "Inventory",
    latestSalesInvoices: "Latest sales invoices",
    latestSalesInvoicesDesc: "Newest sales invoices for the current company.",
    latestPayments: "Latest treasury payments",
    latestPaymentsDesc: "Newest receipt or payment transactions available from company APIs.",
    activityRecords: "Latest activity records",
    activityRecordsDesc: "Operational data based on company activity and available APIs, such as inventory or products.",
    invoiceSearchPlaceholder: "Search by invoice number, customer, or status...",
    paymentSearchPlaceholder: "Search by reference, party, method, or status...",
    activitySearchPlaceholder: "Search by product name, code, category, or status...",
    invoice: "Invoice",
    customer: "Customer",
    issueDate: "Date",
    amount: "Amount",
    status: "Status",
    reference: "Reference",
    party: "Party",
    method: "Method",
    paidAt: "Paid at",
    item: "Item",
    sku: "Code",
    category: "Category",
    quantity: "Quantity",
    updatedAt: "Updated at",
    active: "Active",
    inactive: "Inactive",
    draft: "Draft",
    posted: "Posted",
    confirmed: "Confirmed",
    paid: "Paid",
    unpaid: "Unpaid",
    partial: "Partial",
    pending: "Pending",
    failed: "Failed",
    cancelled: "Cancelled",
    void: "Void",
    refunded: "Refunded",
    noDataTitle: "No data",
    noDataDesc: "Data will appear here when returned by the API.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load company dashboard",
    errorDesc: "Make sure you are signed in to a company workspace and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    printTitle: "Company Dashboard Report",
    generatedAt: "Generated at",
    refreshed: "Company dashboard refreshed.",
    currentCompany: "Current company",
    activityLabel: "Activity",
    genericActivity: "General activity",
    retailActivity: "Retail",
    wholesaleActivity: "Wholesale",
    restaurantActivity: "Restaurants & Cafes",
    jewelryActivity: "Gold & Jewelry",
    servicesActivity: "Services",
    manufacturingActivity: "Manufacturing",
  },
} as const;
const statusFilters: StatusFilter[] = [
  "all",
  "active",
  "inactive",
  "draft",
  "posted",
  "confirmed",
  "paid",
  "unpaid",
  "partial",
  "pending",
  "failed",
  "cancelled",
  "void",
  "refunded",
];
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
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
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
function formatQuantity(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
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
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/+$/,
          "",
        )
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
async function fetchFirstJson<T>(
  paths: readonly string[],
  params?: URLSearchParams,
  signal?: AbortSignal,
): Promise<T> {
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      return await fetchJson<T>(makeApiUrl(path, params), signal);
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("No API endpoint returned a valid response.");
}async function fetchOptionalFirstJson<T>(
  paths: readonly string[],
  params?: URLSearchParams,
  signal?: AbortSignal,
): Promise<T> {
  if (!paths.length) {
    return {} as T;
  }
  try {
    return await fetchFirstJson<T>(paths, params, signal);
  } catch {
    return {} as T;
  }
}function findFirstArray(payload: unknown, depth = 0): unknown[] {
  if (depth > 6) return [];
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!Object.keys(record).length) return [];
  const preferredKeys = [
    "results",
    "items",
    "records",
    "rows",
    "data",
    "customers",
    "suppliers",
    "products",
    "services",
    "invoices",
    "sales_invoices",
    "salesInvoices",
    "bills",
    "purchase_bills",
    "purchaseBills",
    "payments",
    "stock",
    "stock_items",
    "stockItems",
    "stock_summary",
    "stockSummary",
  ];
  for (const key of preferredKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
    if (isRecord(value)) {
      const nested = findFirstArray(value, depth + 1);
      if (nested.length) return nested;
    }
  }
  for (const value of Object.values(record)) {
    if (Array.isArray(value) && (value.length === 0 || value.some(isRecord))) {
      return value;
    }
    if (isRecord(value)) {
      const nested = findFirstArray(value, depth + 1);
      if (nested.length) return nested;
    }
  }
  return [];
}
function extractArray(payload: unknown): unknown[] {
  return findFirstArray(payload);
}

function extractSummary(payload: unknown): ApiRecord {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);
  return {
    ...asRecord(record.summary),
    ...asRecord(dataRecord.summary),
    ...asRecord(metaRecord.summary),
    ...record,
    ...dataRecord,
  };
}
function findFirstCount(payload: unknown, depth = 0): number | null {
  if (depth > 6) return null;
  const record = asRecord(payload);
  if (!Object.keys(record).length) return null;
  const countKeys = [
    "count",
    "total",
    "total_count",
    "totalCount",
    "records_total",
    "recordsTotal",
    "filtered_count",
    "filteredCount",
  ];
  for (const key of countKeys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const value = toNumber(record[key], Number.NaN);
      if (Number.isFinite(value)) return value;
    }
  }
  const preferredContainers = ["meta", "pagination", "page", "summary", "data"];
  for (const key of preferredContainers) {
    const value = record[key];
    if (isRecord(value)) {
      const nested = findFirstCount(value, depth + 1);
      if (nested !== null) return nested;
    }
  }
  return null;
}
function extractCount(payload: unknown) {
  const explicitCount = findFirstCount(payload);
  if (explicitCount !== null) {
    return explicitCount;
  }
  return extractArray(payload).length;
}

function normalizeNestedName(value: unknown, keys: string[] = ["name", "title", "full_name"]) {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  for (const key of keys) {
    const text = normalizeText(record[key]);
    if (text) return text;
  }
  return "";
}
function normalizeStatus(record: ApiRecord, fallback = "active") {
  const status = normalizeText(
    record.status || record.state || record.lifecycle_status || record.payment_status,
  );
  if (status) return status.toLowerCase();
  if (typeof record.is_active === "boolean") {
    return record.is_active ? "active" : "inactive";
  }
  return fallback;
}
function normalizeSalesInvoice(value: unknown): SalesInvoiceRecord {
  const record = asRecord(value);
  const customer = record.customer || record.party || record.client;
  return {
    id: normalizeText(record.id || record.uuid || record.pk || record.number || record.invoice_number),
    number: normalizeText(record.number || record.invoice_number || record.code || record.reference),
    customer_name:
      normalizeText(record.customer_name || record.party_name || record.client_name) ||
      normalizeNestedName(customer, ["name", "display_name", "full_name", "email"]),
    status: normalizeStatus(record, "draft"),
    amount: toNumber(record.total_amount || record.grand_total || record.net_total || record.total || record.amount),
    issue_date:
      normalizeText(record.issue_date || record.invoice_date || record.date || record.posted_at || record.created_at) ||
      null,
    created_at: normalizeText(record.created_at || record.created || record.inserted_at) || null,
  };
}
function normalizePayment(value: unknown): PaymentRecord {
  const record = asRecord(value);
  const party = record.party || record.customer || record.supplier || record.contact;
  const method = record.method || record.payment_method || record.gateway;
  return {
    id: normalizeText(record.id || record.uuid || record.pk || record.reference || record.payment_number),
    reference: normalizeText(
      record.reference || record.reference_number || record.payment_number || record.voucher_number || record.transaction_id,
    ),
    party_name:
      normalizeText(record.party_name || record.customer_name || record.supplier_name) ||
      normalizeNestedName(party, ["name", "display_name", "full_name", "email"]),
    method:
      normalizeText(record.method_name || record.payment_method_name || record.gateway_name) ||
      normalizeNestedName(method, ["name", "title", "code"]) ||
      normalizeText(record.method || record.payment_method),
    status: normalizeStatus(record, "pending"),
    amount: toNumber(record.amount || record.total_amount || record.paid_amount || record.net_amount || record.value),
    paid_at:
      normalizeText(record.paid_at || record.confirmed_at || record.payment_date || record.date || record.created_at) ||
      null,
    created_at: normalizeText(record.created_at || record.created || record.inserted_at) || null,
  };
}
function normalizeActivity(value: unknown): ActivityRecord {
  const record = asRecord(value);
  const product = record.product || record.item || record.stock_item;
  const category = record.category || record.product_category;
  return {
    id: normalizeText(record.id || record.uuid || record.pk || record.product_id || record.sku || record.code),
    name:
      normalizeText(record.name || record.product_name || record.item_name || record.title) ||
      normalizeNestedName(product, ["name", "title", "sku", "code"]),
    sku:
      normalizeText(record.sku || record.code || record.product_code || record.barcode) ||
      normalizeNestedName(product, ["sku", "code", "barcode"]),
    category:
      normalizeText(record.category_name || record.group_name) ||
      normalizeNestedName(category, ["name", "title", "code"]),
    quantity: toNumber(record.quantity || record.available_quantity || record.balance || record.qty || record.stock_balance),
    status: normalizeStatus(record, "active"),
    updated_at:
      normalizeText(record.updated_at || record.last_movement_at || record.created_at || record.created || record.inserted_at) ||
      null,
  };
}
function getCompanyRecord(authPayload: unknown) {
  const auth = asRecord(authPayload);
  const candidates = [
    auth.company,
    auth.current_company,
    auth.active_company,
    auth.workspace_company,
    auth.tenant,
  ];
  for (const candidate of candidates) {
    if (isRecord(candidate)) return candidate;
  }
  return {};
}
function getCompanyName(authPayload: unknown, fallback: string) {
  const auth = asRecord(authPayload);
  const company = getCompanyRecord(authPayload);
  return (
    normalizeText(company.name || company.legal_name || company.commercial_name) ||
    normalizeText(auth.company_name || auth.current_company_name || auth.tenant_name) ||
    fallback
  );
}
function getActivityCode(authPayload: unknown) {
  const auth = asRecord(authPayload);
  const company = getCompanyRecord(authPayload);
  const activity = company.activity_profile || company.activity || auth.activity_profile || auth.activity;
  const raw =
    normalizeText(activity) ||
    normalizeNestedName(activity, ["code", "name", "title"]) ||
    normalizeText(company.activity_code || company.business_activity || auth.activity_code);
  return raw.toUpperCase();
}
function getActivityLabel(authPayload: unknown, locale: Locale) {
  const t = translations[locale];
  const code = getActivityCode(authPayload);
  if (code.includes("RETAIL")) return t.retailActivity;
  if (code.includes("WHOLESALE")) return t.wholesaleActivity;
  if (code.includes("RESTAURANT")) return t.restaurantActivity;
  if (code.includes("JEWELRY")) return t.jewelryActivity;
  if (code.includes("SERVICES")) return t.servicesActivity;
  if (code.includes("MANUFACTURING")) return t.manufacturingActivity;
  return t.genericActivity;
}
function getStatusLabel(value: string, locale: Locale) {
  const key = value.toLowerCase().replace(/[^a-z_]/g, "") as keyof (typeof translations)["ar"];
  const fallback = normalizeText(value, translations[locale].unknown);
  return normalizeText(translations[locale][key], fallback);
}
function getBadgeClass(value: string) {
  const normalized = value.toLowerCase();
  if (["active", "paid", "confirmed", "posted", "success"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["pending", "partial", "draft", "processing", "unpaid"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["failed", "cancelled", "void", "inactive", "refunded"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}
function rowDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
function isWithinDate(dateValue: string | null, from: string, to: string) {
  const normalized = formatDate(dateValue);
  if (normalized === "—") return !from && !to;
  if (from && normalized < from) return false;
  if (to && normalized > to) return false;
  return true;
}
function sortRows<T>(
  rows: T[],
  sort: SortKey,
  getDate: (row: T) => string | null,
  getAmount: (row: T) => number,
  getName: (row: T) => string,
) {
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return rowDateValue(getDate(a)) - rowDateValue(getDate(b));
    if (sort === "amount_high") return getAmount(b) - getAmount(a);
    if (sort === "amount_low") return getAmount(a) - getAmount(b);
    if (sort === "name") return getName(a).localeCompare(getName(b));
    return rowDateValue(getDate(b)) - rowDateValue(getDate(a));
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
function StatusBadge({ value, label }: { value: string; label: string }) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getBadgeClass(value))}>
      {label}
    </Badge>
  );
}
function KpiCard({
  title,
  value,
  description,
  href,
  icon: Icon,
  money,
  t,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  money?: boolean;
  t: (typeof translations)[Locale];
}) {
  return (
    <Card className="group overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
      </Link>
    </Card>
  );
}
function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
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
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="rounded-2xl">
          <CardHeader>
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      ))}
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
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
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
function FiltersBar({
  search,
  onSearchChange,
  searchPlaceholder,
  status,
  onStatusChange,
  sort,
  onSortChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onReset,
  t,
  locale,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  onReset: () => void;
  t: (typeof translations)[Locale];
  locale: Locale;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 rounded-xl ps-9"
          />
        </div>
        <Select value={status} onValueChange={(value) => onStatusChange(value as StatusFilter)}>
          <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusFilters.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "all" ? t.all : getStatusLabel(item, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3">
          <span className="text-xs text-muted-foreground">{t.from}</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            className="h-8 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3">
          <span className="text-xs text-muted-foreground">{t.to}</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            className="h-8 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <Select value={sort} onValueChange={(value) => onSortChange(value as SortKey)}>
          <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[160px]">
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
        <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {t.reset}
        </Button>
      </div>
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
                      "h-11 whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground",
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
                  <TableRow key={rowKey(row)} className="h-[62px]">
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn("h-[62px] overflow-hidden px-4 text-right align-middle", column.className)}
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
function tableHtmlForSections(
  sections: Array<{
    title: string;
    headers: string[];
    rows: string[][];
  }>,
) {
  return sections
    .map(
      (section) => `
        <h2>${escapeHtml(section.title)}</h2>
        <table>
          <thead>
            <tr>${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${
              section.rows.length
                ? section.rows
                    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
                    .join("")
                : `<tr><td colspan="${section.headers.length}">—</td></tr>`
            }
          </tbody>
        </table>
      `,
    )
    .join("");
}
export default function CompanyDashboardPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [authPayload, setAuthPayload] = React.useState<ApiResponse>({});
  const [stats, setStats] = React.useState<DashboardStats>({
    salesTotal: 0,
    salesInvoices: 0,
    paymentAmount: 0,
    payments: 0,
    customers: 0,
    suppliers: 0,
    products: 0,
    stockItems: 0,
  });
  const [salesInvoices, setSalesInvoices] = React.useState<SalesInvoiceRecord[]>([]);
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);
  const [activityRows, setActivityRows] = React.useState<ActivityRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [invoiceSearch, setInvoiceSearch] = React.useState("");
  const [invoiceStatus, setInvoiceStatus] = React.useState<StatusFilter>("all");
  const [invoiceSort, setInvoiceSort] = React.useState<SortKey>("newest");
  const [invoiceDateFrom, setInvoiceDateFrom] = React.useState("");
  const [invoiceDateTo, setInvoiceDateTo] = React.useState("");
  const [paymentSearch, setPaymentSearch] = React.useState("");
  const [paymentStatus, setPaymentStatus] = React.useState<StatusFilter>("all");
  const [paymentSort, setPaymentSort] = React.useState<SortKey>("newest");
  const [paymentDateFrom, setPaymentDateFrom] = React.useState("");
  const [paymentDateTo, setPaymentDateTo] = React.useState("");
  const [activitySearch, setActivitySearch] = React.useState("");
  const [activityStatus, setActivityStatus] = React.useState<StatusFilter>("all");
  const [activitySort, setActivitySort] = React.useState<SortKey>("newest");
  const [activityDateFrom, setActivityDateFrom] = React.useState("");
  const [activityDateTo, setActivityDateTo] = React.useState("");
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
        setWarnings([]);
        const rowsParams = new URLSearchParams({ page: "1", page_size: "12", ordering: "-created_at" });
        const results = await Promise.allSettled([
          fetchFirstJson<ApiResponse>(API_ENDPOINTS.whoami, undefined, controller.signal),
          fetchFirstJson<ApiResponse>(API_ENDPOINTS.customers, rowsParams, controller.signal),
          fetchFirstJson<ApiResponse>(API_ENDPOINTS.suppliers, rowsParams, controller.signal),
          fetchFirstJson<ApiResponse>(API_ENDPOINTS.products, rowsParams, controller.signal),
          fetchFirstJson<ApiResponse>(API_ENDPOINTS.salesInvoices, rowsParams, controller.signal),
          fetchFirstJson<ApiResponse>(API_ENDPOINTS.purchaseBills, rowsParams, controller.signal),
          fetchFirstJson<ApiResponse>(API_ENDPOINTS.stockSummary, rowsParams, controller.signal),
          fetchOptionalFirstJson<ApiResponse>(API_ENDPOINTS.treasuryPayments, rowsParams, controller.signal),
        ]);
        const failedMessages = results
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) => normalizeText(result.reason instanceof Error ? result.reason.message : result.reason));
        const [
          authResult,
          customersResult,
          suppliersResult,
          productsResult,
          salesResult,
          purchaseBillsResult,
          stockResult,
          paymentsResult,
        ] = results.map((result) => (result.status === "fulfilled" ? result.value : {}));
        const salesRows = extractArray(salesResult).map(normalizeSalesInvoice);
        const paymentRows = extractArray(paymentsResult).map(normalizePayment);
        const stockRows = extractArray(stockResult).map(normalizeActivity);
        const productRows = extractArray(productsResult).map(normalizeActivity);
        const activityData = stockRows.length ? stockRows : productRows;
        const salesSummary = extractSummary(salesResult);
        const paymentsSummary = extractSummary(paymentsResult);
        setAuthPayload(authResult);
        setSalesInvoices(salesRows);
        setPayments(paymentRows);
        setActivityRows(activityData);
        setStats({
          salesTotal: toNumber(
            salesSummary.total_amount ?? salesSummary.amount_total ?? salesSummary.sales_total,
            salesRows.reduce((sum, item) => sum + item.amount, 0),
          ),
          salesInvoices: extractCount(salesResult),
          paymentAmount: toNumber(
            paymentsSummary.total_amount ?? paymentsSummary.amount_total ?? paymentsSummary.paid_amount,
            paymentRows.reduce((sum, item) => sum + item.amount, 0),
          ),
          payments: extractCount(paymentsResult),
          customers: extractCount(customersResult),
          suppliers: extractCount(suppliersResult),
          products: extractCount(productsResult),
          stockItems: extractCount(stockResult),
        });
        setWarnings(failedMessages.filter(Boolean));
        const fulfilledCount = results.filter((result) => result.status === "fulfilled").length;
        if (fulfilledCount === 0) {
          throw new Error(failedMessages[0] || t.errorDesc);
        }
        if (failedMessages.length && !silent) {
          toast.warning(t.partialWarningTitle);
        }
        if (silent && failedMessages.length) {
          toast.warning(t.partialWarningTitle);
        } else if (silent) {
          toast.success(t.refreshed);
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      return () => controller.abort();
    },
    [t.errorDesc, t.partialWarningTitle, t.refreshed],
  );
  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);
  const resetInvoiceFilters = React.useCallback(() => {
    setInvoiceSearch("");
    setInvoiceStatus("all");
    setInvoiceSort("newest");
    setInvoiceDateFrom("");
    setInvoiceDateTo("");
  }, []);
  const resetPaymentFilters = React.useCallback(() => {
    setPaymentSearch("");
    setPaymentStatus("all");
    setPaymentSort("newest");
    setPaymentDateFrom("");
    setPaymentDateTo("");
  }, []);
  const resetActivityFilters = React.useCallback(() => {
    setActivitySearch("");
    setActivityStatus("all");
    setActivitySort("newest");
    setActivityDateFrom("");
    setActivityDateTo("");
  }, []);
  const filteredInvoices = React.useMemo(() => {
    const needle = invoiceSearch.trim().toLowerCase();
    const rows = salesInvoices.filter((invoice) => {
      const haystack = [invoice.number, invoice.customer_name, invoice.status, invoice.amount].join(" ").toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (invoiceStatus !== "all" && invoice.status !== invoiceStatus) return false;
      return isWithinDate(invoice.issue_date || invoice.created_at, invoiceDateFrom, invoiceDateTo);
    });
    return sortRows(rows, invoiceSort, (row) => row.issue_date || row.created_at, (row) => row.amount, (row) => row.customer_name);
  }, [invoiceDateFrom, invoiceDateTo, invoiceSearch, invoiceSort, invoiceStatus, salesInvoices]);
  const filteredPayments = React.useMemo(() => {
    const needle = paymentSearch.trim().toLowerCase();
    const rows = payments.filter((payment) => {
      const haystack = [payment.reference, payment.party_name, payment.method, payment.status, payment.amount]
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (paymentStatus !== "all" && payment.status !== paymentStatus) return false;
      return isWithinDate(payment.paid_at || payment.created_at, paymentDateFrom, paymentDateTo);
    });
    return sortRows(rows, paymentSort, (row) => row.paid_at || row.created_at, (row) => row.amount, (row) => row.party_name);
  }, [paymentDateFrom, paymentDateTo, paymentSearch, paymentSort, paymentStatus, payments]);
  const filteredActivity = React.useMemo(() => {
    const needle = activitySearch.trim().toLowerCase();
    const rows = activityRows.filter((item) => {
      const haystack = [item.name, item.sku, item.category, item.status, item.quantity].join(" ").toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (activityStatus !== "all" && item.status !== activityStatus) return false;
      return isWithinDate(item.updated_at, activityDateFrom, activityDateTo);
    });
    return sortRows(rows, activitySort, (row) => row.updated_at, (row) => row.quantity, (row) => row.name);
  }, [activityDateFrom, activityDateTo, activityRows, activitySearch, activitySort, activityStatus]);
  const hasInvoiceFilters = Boolean(invoiceSearch || invoiceStatus !== "all" || invoiceDateFrom || invoiceDateTo || invoiceSort !== "newest");
  const hasPaymentFilters = Boolean(paymentSearch || paymentStatus !== "all" || paymentDateFrom || paymentDateTo || paymentSort !== "newest");
  const hasActivityFilters = Boolean(activitySearch || activityStatus !== "all" || activityDateFrom || activityDateTo || activitySort !== "newest");
  const invoiceColumns = React.useMemo<DataColumn<SalesInvoiceRecord>[]>(
    () => [
      {
        key: "invoice",
        label: t.invoice,
        className: "w-[210px]",
        render: (invoice) => (
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{invoice.number || t.unknown}</span>
            <span className="block truncate text-xs text-muted-foreground">#{invoice.id || "—"}</span>
          </div>
        ),
      },
      {
        key: "customer",
        label: t.customer,
        className: "w-[240px]",
        render: (invoice) => <span className="truncate text-sm text-muted-foreground">{invoice.customer_name || "—"}</span>,
      },
      {
        key: "date",
        label: t.issueDate,
        className: "w-[150px]",
        render: (invoice) => <span className="text-sm tabular-nums text-muted-foreground">{formatDate(invoice.issue_date)}</span>,
      },
      {
        key: "amount",
        label: t.amount,
        className: "w-[160px]",
        render: (invoice) => <MoneyValue value={invoice.amount} label={t.sar} />,
      },
      {
        key: "status",
        label: t.status,
        className: "w-[140px]",
        render: (invoice) => <StatusBadge value={invoice.status} label={getStatusLabel(invoice.status, locale)} />,
      },
      {
        key: "open",
        label: t.open,
        className: "w-[90px]",
        render: (invoice) => (
          <Button asChild variant="ghost" size="sm" className="rounded-lg">
            <Link href={invoice.id ? `/company/sales/invoices/${invoice.id}` : "/company/sales/invoices"}>{t.open}</Link>
          </Button>
        ),
      },
    ],
    [locale, t],
  );
  const paymentColumns = React.useMemo<DataColumn<PaymentRecord>[]>(
    () => [
      {
        key: "reference",
        label: t.reference,
        className: "w-[220px]",
        render: (payment) => (
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{payment.reference || t.unknown}</span>
            <span className="block truncate text-xs text-muted-foreground">#{payment.id || "—"}</span>
          </div>
        ),
      },
      {
        key: "party",
        label: t.party,
        className: "w-[220px]",
        render: (payment) => <span className="truncate text-sm text-muted-foreground">{payment.party_name || "—"}</span>,
      },
      {
        key: "method",
        label: t.method,
        className: "w-[170px]",
        render: (payment) => <span className="truncate text-sm text-muted-foreground">{payment.method || "—"}</span>,
      },
      {
        key: "amount",
        label: t.amount,
        className: "w-[160px]",
        render: (payment) => <MoneyValue value={payment.amount} label={t.sar} />,
      },
      {
        key: "paid_at",
        label: t.paidAt,
        className: "w-[160px]",
        render: (payment) => <span className="text-sm tabular-nums text-muted-foreground">{formatDate(payment.paid_at)}</span>,
      },
      {
        key: "status",
        label: t.status,
        className: "w-[140px]",
        render: (payment) => <StatusBadge value={payment.status} label={getStatusLabel(payment.status, locale)} />,
      },
    ],
    [locale, t],
  );
  const activityColumns = React.useMemo<DataColumn<ActivityRecord>[]>(
    () => [
      {
        key: "item",
        label: t.item,
        className: "w-[260px]",
        render: (item) => (
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{item.name || t.unknown}</span>
            <span className="block truncate text-xs text-muted-foreground">#{item.id || "—"}</span>
          </div>
        ),
      },
      {
        key: "sku",
        label: t.sku,
        className: "w-[160px]",
        render: (item) => <span className="truncate text-sm tabular-nums text-muted-foreground">{item.sku || "—"}</span>,
      },
      {
        key: "category",
        label: t.category,
        className: "w-[200px]",
        render: (item) => <span className="truncate text-sm text-muted-foreground">{item.category || "—"}</span>,
      },
      {
        key: "quantity",
        label: t.quantity,
        className: "w-[150px]",
        render: (item) => <span className="text-sm font-semibold tabular-nums">{formatQuantity(item.quantity)}</span>,
      },
      {
        key: "updated",
        label: t.updatedAt,
        className: "w-[170px]",
        render: (item) => <span className="text-sm tabular-nums text-muted-foreground">{formatDate(item.updated_at)}</span>,
      },
      {
        key: "status",
        label: t.status,
        className: "w-[140px]",
        render: (item) => <StatusBadge value={item.status} label={getStatusLabel(item.status, locale)} />,
      },
    ],
    [locale, t],
  );
  function buildExportSections() {
    return [
      {
        title: t.latestSalesInvoices,
        headers: [t.invoice, t.customer, t.issueDate, t.amount, t.status],
        rows: filteredInvoices.map((invoice) => [
          invoice.number,
          invoice.customer_name,
          formatDate(invoice.issue_date),
          formatMoney(invoice.amount),
          getStatusLabel(invoice.status, locale),
        ]),
      },
      {
        title: t.latestPayments,
        headers: [t.reference, t.party, t.method, t.amount, t.status],
        rows: filteredPayments.map((payment) => [
          payment.reference,
          payment.party_name,
          payment.method,
          formatMoney(payment.amount),
          getStatusLabel(payment.status, locale),
        ]),
      },
      {
        title: t.activityRecords,
        headers: [t.item, t.sku, t.category, t.quantity, t.status],
        rows: filteredActivity.map((item) => [
          item.name,
          item.sku,
          item.category,
          formatQuantity(item.quantity),
          getStatusLabel(item.status, locale),
        ]),
      },
    ];
  }
  function exportExcel() {
    const sections = buildExportSections();
    const totalRows = sections.reduce((sum, section) => sum + section.rows.length, 0);
    if (!totalRows) {
      toast.error(t.exportEmpty);
      return;
    }
    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <h1>${escapeHtml(t.printTitle)}</h1>
          <p>${escapeHtml(t.currentCompany)}: ${escapeHtml(getCompanyName(authPayload, t.unknown))}</p>
          <p>${escapeHtml(t.activityLabel)}: ${escapeHtml(getActivityLabel(authPayload, locale))}</p>
          ${tableHtmlForSections(sections)}
        </body>
      </html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `company-dashboard-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function printPage() {
    const sections = buildExportSections();
    const totalRows = sections.reduce((sum, section) => sum + section.rows.length, 0);
    if (!totalRows) {
      toast.error(t.printEmpty);
      return;
    }
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!printWindow) return;
    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            h2 { margin: 24px 0 10px; font-size: 18px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: ${dir === "rtl" ? "right" : "left"}; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.printTitle)}</h1>
          <p>${escapeHtml(t.currentCompany)}: ${escapeHtml(getCompanyName(authPayload, t.unknown))}</p>
          <p>${escapeHtml(t.activityLabel)}: ${escapeHtml(getActivityLabel(authPayload, locale))}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${tableHtmlForSections(sections)}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  }
  if (loading) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <DashboardSkeleton />
      </main>
    );
  }
  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-3xl border-destructive/30 bg-card shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => void loadDashboard({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
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
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.companyHealth}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border bg-background px-3 py-1">
                    {t.currentCompany}: {getCompanyName(authPayload, t.unknown)}
                  </span>
                  <span className="rounded-full border bg-background px-3 py-1">
                    {t.activityLabel}: {getActivityLabel(authPayload, locale)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => void loadDashboard({ silent: true })} disabled={refreshing}>
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button className="rounded-xl" onClick={printPage}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </div>
        </section>
        {warnings.length ? (
          <Card className="rounded-2xl border-amber-200 bg-amber-50 text-amber-950 shadow-sm">
            <CardContent className="flex gap-3 p-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.partialWarningTitle}</p>
                <p className="mt-1 text-sm opacity-80">{t.partialWarningDesc}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.salesTotal} value={stats.salesTotal} description={t.connectedToLiveApis} href="/company/sales/invoices" icon={ShoppingCart} money t={t} />
          <KpiCard title={t.salesInvoices} value={stats.salesInvoices} description={t.sales} href="/company/sales/invoices" icon={FileText} t={t} />
          <KpiCard title={t.paymentAmount} value={stats.paymentAmount} description={t.treasury} href="/company/treasury" icon={Wallet} money t={t} />
          <KpiCard title={t.payments} value={stats.payments} description={t.connectedToLiveApis} href="/company/payments" icon={CreditCard} t={t} />
          <KpiCard title={t.customers} value={stats.customers} description={t.parties} href="/company/customers" icon={Users} t={t} />
          <KpiCard title={t.suppliers} value={stats.suppliers} description={t.parties} href="/company/suppliers" icon={Building2} t={t} />
          <KpiCard title={t.products} value={stats.products} description={t.catalog} href="/company/products" icon={Boxes} t={t} />
          <KpiCard title={t.stockItems} value={stats.stockItems} description={t.inventory} href="/company/inventory" icon={Package} t={t} />
        </div>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.latestSalesInvoices}</CardTitle>
            <CardDescription>{t.latestSalesInvoicesDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FiltersBar
              search={invoiceSearch}
              onSearchChange={setInvoiceSearch}
              searchPlaceholder={t.invoiceSearchPlaceholder}
              status={invoiceStatus}
              onStatusChange={setInvoiceStatus}
              sort={invoiceSort}
              onSortChange={setInvoiceSort}
              dateFrom={invoiceDateFrom}
              onDateFromChange={setInvoiceDateFrom}
              dateTo={invoiceDateTo}
              onDateToChange={setInvoiceDateTo}
              onReset={resetInvoiceFilters}
              t={t}
              locale={locale}
            />
            <DataTable
              rows={filteredInvoices}
              allRowsCount={salesInvoices.length}
              columns={invoiceColumns}
              rowKey={(row) => row.id || row.number}
              emptyTitle={t.noDataTitle}
              emptyDescription={t.noDataDesc}
              noResultsTitle={t.noResultsTitle}
              noResultsDescription={t.noResultsDesc}
              hasFilters={hasInvoiceFilters}
              onReset={resetInvoiceFilters}
              resetLabel={t.reset}
              showingLabel={t.showing}
              ofLabel={t.of}
              rowsLabel={t.rows}
            />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.latestPayments}</CardTitle>
            <CardDescription>{t.latestPaymentsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FiltersBar
              search={paymentSearch}
              onSearchChange={setPaymentSearch}
              searchPlaceholder={t.paymentSearchPlaceholder}
              status={paymentStatus}
              onStatusChange={setPaymentStatus}
              sort={paymentSort}
              onSortChange={setPaymentSort}
              dateFrom={paymentDateFrom}
              onDateFromChange={setPaymentDateFrom}
              dateTo={paymentDateTo}
              onDateToChange={setPaymentDateTo}
              onReset={resetPaymentFilters}
              t={t}
              locale={locale}
            />
            <DataTable
              rows={filteredPayments}
              allRowsCount={payments.length}
              columns={paymentColumns}
              rowKey={(row) => row.id || row.reference}
              emptyTitle={t.noDataTitle}
              emptyDescription={t.noDataDesc}
              noResultsTitle={t.noResultsTitle}
              noResultsDescription={t.noResultsDesc}
              hasFilters={hasPaymentFilters}
              onReset={resetPaymentFilters}
              resetLabel={t.reset}
              showingLabel={t.showing}
              ofLabel={t.of}
              rowsLabel={t.rows}
            />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.activityRecords}</CardTitle>
            <CardDescription>{t.activityRecordsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FiltersBar
              search={activitySearch}
              onSearchChange={setActivitySearch}
              searchPlaceholder={t.activitySearchPlaceholder}
              status={activityStatus}
              onStatusChange={setActivityStatus}
              sort={activitySort}
              onSortChange={setActivitySort}
              dateFrom={activityDateFrom}
              onDateFromChange={setActivityDateFrom}
              dateTo={activityDateTo}
              onDateToChange={setActivityDateTo}
              onReset={resetActivityFilters}
              t={t}
              locale={locale}
            />
            <DataTable
              rows={filteredActivity}
              allRowsCount={activityRows.length}
              columns={activityColumns}
              rowKey={(row) => row.id || row.sku || row.name}
              emptyTitle={t.noDataTitle}
              emptyDescription={t.noDataDesc}
              noResultsTitle={t.noResultsTitle}
              noResultsDescription={t.noResultsDesc}
              hasFilters={hasActivityFilters}
              onReset={resetActivityFilters}
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