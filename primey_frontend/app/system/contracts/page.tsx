"use client";

/* ============================================================
   📂 primey_frontend/app/system/contracts/page.tsx
   📄 Primey Care — Contracts
   ------------------------------------------------------------
   ✅ Same approved Customers / Providers / Agents table pattern
   ✅ Header buttons / KPI cards / toolbar / table unified
   ✅ Real API only: /api/contracts/
   ✅ Server pagination
   ✅ Contract status actions
   ✅ Excel .xls + Web print
   ✅ SAR icon from /currency/sar.svg
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  BadgePercent,
  CheckCircle2,
  ColumnsIcon,
  Copy,
  Eye,
  FileSpreadsheet,
  Layers3,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
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

type ContractStatus =
  | "all"
  | "DRAFT"
  | "ACTIVE"
  | "SUSPENDED"
  | "EXPIRED"
  | "TERMINATED";

type PricingModel =
  | "all"
  | "FIXED"
  | "COMMISSION"
  | "PERCENTAGE"
  | "DISCOUNT"
  | "MIXED"
  | "OTHER";

type SortKey =
  | "newest"
  | "oldest"
  | "contract_number"
  | "provider"
  | "status"
  | "start_date"
  | "end_date"
  | "most_products"
  | "most_offers"
  | "highest_discount";

type ColumnKey =
  | "select"
  | "contract"
  | "provider"
  | "status"
  | "pricing"
  | "dates"
  | "products"
  | "offers"
  | "visibility"
  | "discount"
  | "commission"
  | "createdAt"
  | "actions";

type ContractProduct = {
  id: number;
  product_id: number | null;
  product_name: string;
  product_type: string;
  is_active: boolean;
  is_featured: boolean;
  show_on_landing: boolean;
  show_on_mobile: boolean;
  show_on_offers: boolean;
  price_before_discount: number;
  price_after_discount: number;
  discount_percentage: number;
  system_commission_percentage: number;
  offer_title: string;
  offer_badge: string;
};

type ContractRecord = {
  id: number;
  contract_number: string;
  title: string;
  code: string;
  provider_id: number | null;
  provider_name: string;
  provider_name_ar: string;
  provider_name_en: string;
  status: string;
  pricing_model: string;
  start_date: string | null;
  end_date: string | null;
  notes: string;
  internal_notes: string;
  total_contract_products: number;
  active_contract_products: number;
  featured_contract_offers: number;
  landing_contract_offers: number;
  mobile_contract_offers: number;
  offers_page_contract_offers: number;
  max_discount_percentage: number;
  max_system_commission_percentage: number;
  created_at: string | null;
  updated_at: string | null;
  contract_products: ContractProduct[];
};

type ContractsSummary = {
  total_contracts: number;
  active_contracts: number;
  draft_contracts: number;
  suspended_contracts: number;
  expired_contracts: number;
  terminated_contracts: number;
  contracts_with_products: number;
  providers_with_contracts: number;
  total_contract_products: number;
  active_contract_products: number;
  featured_contract_offers: number;
  landing_contract_offers: number;
  mobile_contract_offers: number;
  offers_page_contract_offers: number;
  distinct_products_in_contracts: number;
};

type PaginationState = {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

type ContractsApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  results?: unknown[];
  items?: unknown[];
  data?: {
    results?: unknown[];
    items?: unknown[];
    summary?: unknown;
    pagination?: unknown;
  };
  summary?: unknown;
  pagination?: unknown;
  count?: number;
};

const SAR_ICON = "/currency/sar.svg";
const PAGE_SIZE = 10;

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  contract: true,
  provider: true,
  status: true,
  pricing: true,
  dates: true,
  products: true,
  offers: true,
  visibility: true,
  discount: true,
  commission: true,
  createdAt: true,
  actions: true,
};

const translations = {
  ar: {
    title: "العقود",
    subtitle: "إدارة عقود مقدمي الخدمة وعروض المنتجات والأسعار والخصومات.",
    create: "إنشاء عقد",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث برقم العقد أو مقدم الخدمة أو المنتج...",
    totalContracts: "إجمالي العقود",
    activeContracts: "العقود النشطة",
    offers: "العروض",
    products: "المنتجات",
    providers: "مقدمو الخدمة",
    featuredOffers: "العروض المميزة",
    landingOffers: "ظهور الهبوط",
    mobileOffers: "ظهور الموبايل",
    contract: "العقد",
    provider: "مقدم الخدمة",
    status: "الحالة",
    pricing: "التسعير",
    dates: "المدة",
    productsCol: "المنتجات",
    offersCol: "العروض",
    visibility: "الظهور",
    discount: "الخصم",
    commission: "العمولة",
    createdAt: "تاريخ الإنشاء",
    actions: "الإجراءات",
    columns: "الأعمدة",
    sort: "الترتيب",
    selected: "محدد",
    allStatuses: "كل الحالات",
    draft: "مسودة",
    active: "نشط",
    suspended: "معلق",
    expired: "منتهي",
    terminated: "منهى",
    allPricing: "كل نماذج التسعير",
    fixed: "ثابت",
    commissionModel: "عمولة",
    percentage: "نسبة",
    discountModel: "خصم",
    mixed: "مختلط",
    other: "أخرى",
    newest: "الأحدث",
    oldest: "الأقدم",
    contractNumberSort: "رقم العقد",
    providerSort: "مقدم الخدمة",
    statusSort: "الحالة",
    startDateSort: "تاريخ البداية",
    endDateSort: "تاريخ النهاية",
    mostProducts: "الأكثر منتجات",
    mostOffers: "الأكثر عروض",
    highestDiscount: "الأعلى خصمًا",
    from: "من",
    to: "إلى",
    activeFilters: "فلاتر مفعلة",
    clearSelection: "إلغاء التحديد",
    view: "عرض التفاصيل",
    copyNumber: "نسخ رقم العقد",
    copyProvider: "نسخ مقدم الخدمة",
    activate: "تفعيل العقد",
    suspend: "تعليق العقد",
    terminate: "إنهاء العقد",
    expire: "إنهاء كمنتهي",
    copied: "تم النسخ",
    actionSuccess: "تم تحديث حالة العقد بنجاح.",
    actionFailed: "تعذر تنفيذ العملية.",
    confirmActivate: "هل تريد تفعيل العقد؟",
    confirmSuspend: "هل تريد تعليق العقد؟",
    confirmTerminate: "هل تريد إنهاء العقد؟",
    confirmExpire: "هل تريد تعيين العقد كمنتهي؟",
    noDataTitle: "لا توجد عقود بعد",
    noDataDesc: "عند إنشاء عقود مقدمي الخدمة ستظهر هنا.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل العقود",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير العقود",
    generatedAt: "تاريخ الطباعة",
    showing: "عرض",
    rows: "صفوف",
    page: "صفحة",
    of: "من",
    next: "التالي",
    previous: "السابق",
    unknown: "غير محدد",
    start: "البداية",
    end: "النهاية",
    landing: "هبوط",
    mobile: "موبايل",
    offersPage: "العروض",
    featured: "مميز",
  },
  en: {
    title: "Contracts",
    subtitle: "Manage provider contracts, product offers, prices, and discounts.",
    create: "Create Contract",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    searchPlaceholder: "Search contract number, provider, or product...",
    totalContracts: "Total contracts",
    activeContracts: "Active contracts",
    offers: "Offers",
    products: "Products",
    providers: "Providers",
    featuredOffers: "Featured offers",
    landingOffers: "Landing visibility",
    mobileOffers: "Mobile visibility",
    contract: "Contract",
    provider: "Provider",
    status: "Status",
    pricing: "Pricing",
    dates: "Dates",
    productsCol: "Products",
    offersCol: "Offers",
    visibility: "Visibility",
    discount: "Discount",
    commission: "Commission",
    createdAt: "Created at",
    actions: "Actions",
    columns: "Columns",
    sort: "Sort",
    selected: "Selected",
    allStatuses: "All statuses",
    draft: "Draft",
    active: "Active",
    suspended: "Suspended",
    expired: "Expired",
    terminated: "Terminated",
    allPricing: "All pricing",
    fixed: "Fixed",
    commissionModel: "Commission",
    percentage: "Percentage",
    discountModel: "Discount",
    mixed: "Mixed",
    other: "Other",
    newest: "Newest",
    oldest: "Oldest",
    contractNumberSort: "Contract number",
    providerSort: "Provider",
    statusSort: "Status",
    startDateSort: "Start date",
    endDateSort: "End date",
    mostProducts: "Most products",
    mostOffers: "Most offers",
    highestDiscount: "Highest discount",
    from: "From",
    to: "To",
    activeFilters: "Active filters",
    clearSelection: "Clear selection",
    view: "View details",
    copyNumber: "Copy contract number",
    copyProvider: "Copy provider",
    activate: "Activate contract",
    suspend: "Suspend contract",
    terminate: "Terminate contract",
    expire: "Mark as expired",
    copied: "Copied",
    actionSuccess: "Contract status updated successfully.",
    actionFailed: "Unable to complete operation.",
    confirmActivate: "Do you want to activate this contract?",
    confirmSuspend: "Do you want to suspend this contract?",
    confirmTerminate: "Do you want to terminate this contract?",
    confirmExpire: "Do you want to mark this contract as expired?",
    noDataTitle: "No contracts yet",
    noDataDesc: "Provider contracts will appear here once created.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load contracts",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Contracts report",
    generatedAt: "Generated at",
    showing: "Showing",
    rows: "Rows",
    page: "Page",
    of: "of",
    next: "Next",
    previous: "Previous",
    unknown: "Unknown",
    start: "Start",
    end: "End",
    landing: "Landing",
    mobile: "Mobile",
    offersPage: "Offers",
    featured: "Featured",
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    return ["1", "true", "yes", "on", "نعم"].includes(value.toLowerCase());
  }

  return false;
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

function formatPercent(value: unknown) {
  return `${formatMoney(value)}%`;
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

async function fetchJson<T>(
  url: string,
  options?: {
    signal?: AbortSignal;
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
  },
): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    method: options?.method || "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal: options?.signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options?.method && options.method !== "GET"
        ? { "Content-Type": "application/json" }
        : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method && options.method !== "GET"
        ? JSON.stringify(options.body || {})
        : undefined,
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

function extractContracts(payload: ContractsApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;

  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.items)) return payload.data.items;
  }

  return [];
}

function extractSummary(payload: ContractsApiResponse) {
  if (payload.summary && typeof payload.summary === "object") return payload.summary;

  if (
    payload.data &&
    typeof payload.data === "object" &&
    payload.data.summary &&
    typeof payload.data.summary === "object"
  ) {
    return payload.data.summary;
  }

  return {};
}

function extractPagination(payload: ContractsApiResponse): PaginationState {
  const rootPagination = asRecord(payload.pagination);
  const dataPagination = asRecord(asRecord(payload.data).pagination);
  const pagination = Object.keys(dataPagination).length ? dataPagination : rootPagination;

  const count = toNumber(
    pagination.count ??
      pagination.total_count ??
      pagination.total ??
      payload.count,
    0,
  );

  const page = toNumber(pagination.page ?? pagination.current_page, 1);
  const pageSize = toNumber(pagination.page_size ?? pagination.per_page, PAGE_SIZE);
  const totalPages = Math.max(
    toNumber(
      pagination.total_pages ??
        pagination.pages ??
        Math.ceil(count / Math.max(pageSize, 1)),
      1,
    ),
    1,
  );

  return {
    count,
    page,
    page_size: pageSize,
    total_pages: totalPages,
    has_next: toBoolean(pagination.has_next) || page < totalPages,
    has_previous: toBoolean(pagination.has_previous) || page > 1,
  };
}

function normalizeContractProduct(value: unknown): ContractProduct {
  const item = asRecord(value);
  const product = asRecord(item.product);

  return {
    id: toNumber(item.id),
    product_id:
      item.product_id === null || item.product_id === undefined
        ? toNumber(product.id) || null
        : toNumber(item.product_id),
    product_name: normalizeText(
      item.product_name ||
        item.product_title ||
        product.name ||
        product.title ||
        product.name_ar ||
        product.name_en,
    ),
    product_type: normalizeText(
      item.product_type || product.product_type || product.type,
    ),
    is_active: toBoolean(item.is_active),
    is_featured: toBoolean(item.is_featured),
    show_on_landing: toBoolean(item.show_on_landing),
    show_on_mobile: toBoolean(item.show_on_mobile),
    show_on_offers: toBoolean(item.show_on_offers),
    price_before_discount: toNumber(item.price_before_discount),
    price_after_discount: toNumber(item.price_after_discount),
    discount_percentage: toNumber(item.discount_percentage),
    system_commission_percentage: toNumber(item.system_commission_percentage),
    offer_title: normalizeText(item.offer_title || item.title),
    offer_badge: normalizeText(item.offer_badge || item.badge),
  };
}

function normalizeContract(value: unknown): ContractRecord {
  const item = asRecord(value);
  const provider = asRecord(item.provider);

  const contractProducts = asArray(
    item.contract_products ||
      item.products ||
      item.items ||
      item.offers,
  ).map(normalizeContractProduct);

  const providerName = normalizeText(
    item.provider_name ||
      item.provider_display_name ||
      provider.name_ar ||
      provider.name ||
      provider.name_en,
  );

  const maxDiscount =
    toNumber(item.max_discount_percentage) ||
    toNumber(item.highest_discount_percentage) ||
    contractProducts.reduce(
      (max, product) => Math.max(max, product.discount_percentage),
      0,
    );

  const maxCommission =
    toNumber(item.max_system_commission_percentage) ||
    contractProducts.reduce(
      (max, product) => Math.max(max, product.system_commission_percentage),
      0,
    );

  return {
    id: toNumber(item.id),
    contract_number: normalizeText(
      item.contract_number || item.number || item.code || item.reference,
      `CON-${normalizeText(item.id)}`,
    ),
    title: normalizeText(item.title || item.name || item.contract_title),
    code: normalizeText(item.code),
    provider_id:
      item.provider_id === null || item.provider_id === undefined
        ? toNumber(provider.id) || null
        : toNumber(item.provider_id),
    provider_name: providerName,
    provider_name_ar: normalizeText(item.provider_name_ar || provider.name_ar),
    provider_name_en: normalizeText(item.provider_name_en || provider.name_en),
    status: normalizeText(item.status).toUpperCase(),
    pricing_model: normalizeText(item.pricing_model).toUpperCase(),
    start_date: normalizeText(item.start_date) || null,
    end_date: normalizeText(item.end_date) || null,
    notes: normalizeText(item.notes),
    internal_notes: normalizeText(item.internal_notes),
    total_contract_products: toNumber(
      item.total_contract_products,
      contractProducts.length,
    ),
    active_contract_products: toNumber(
      item.active_contract_products,
      contractProducts.filter((product) => product.is_active).length,
    ),
    featured_contract_offers: toNumber(
      item.featured_contract_offers,
      contractProducts.filter((product) => product.is_featured).length,
    ),
    landing_contract_offers: toNumber(
      item.landing_contract_offers,
      contractProducts.filter((product) => product.show_on_landing).length,
    ),
    mobile_contract_offers: toNumber(
      item.mobile_contract_offers,
      contractProducts.filter((product) => product.show_on_mobile).length,
    ),
    offers_page_contract_offers: toNumber(
      item.offers_page_contract_offers,
      contractProducts.filter((product) => product.show_on_offers).length,
    ),
    max_discount_percentage: maxDiscount,
    max_system_commission_percentage: maxCommission,
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
    contract_products: contractProducts,
  };
}

function normalizeSummary(value: unknown): ContractsSummary {
  const item = asRecord(value);

  return {
    total_contracts: toNumber(item.total_contracts),
    active_contracts: toNumber(item.active_contracts),
    draft_contracts: toNumber(item.draft_contracts),
    suspended_contracts: toNumber(item.suspended_contracts),
    expired_contracts: toNumber(item.expired_contracts),
    terminated_contracts: toNumber(item.terminated_contracts),
    contracts_with_products: toNumber(item.contracts_with_products),
    providers_with_contracts: toNumber(item.providers_with_contracts),
    total_contract_products: toNumber(item.total_contract_products),
    active_contract_products: toNumber(item.active_contract_products),
    featured_contract_offers: toNumber(item.featured_contract_offers),
    landing_contract_offers: toNumber(item.landing_contract_offers),
    mobile_contract_offers: toNumber(item.mobile_contract_offers),
    offers_page_contract_offers: toNumber(item.offers_page_contract_offers),
    distinct_products_in_contracts: toNumber(item.distinct_products_in_contracts),
  };
}

function getStatusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "DRAFT") return t.draft;
  if (normalized === "ACTIVE") return t.active;
  if (normalized === "SUSPENDED") return t.suspended;
  if (normalized === "EXPIRED") return t.expired;
  if (normalized === "TERMINATED") return t.terminated;

  return normalized || t.unknown;
}

function getStatusClass(status: string) {
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "ACTIVE") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (normalized === "SUSPENDED") {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  if (normalized === "EXPIRED") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  if (normalized === "TERMINATED") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function getPricingLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(value).toUpperCase();

  if (normalized === "FIXED") return t.fixed;
  if (normalized === "COMMISSION") return t.commissionModel;
  if (normalized === "PERCENTAGE") return t.percentage;
  if (normalized === "DISCOUNT") return t.discountModel;
  if (normalized === "MIXED") return t.mixed;
  if (normalized === "OTHER") return t.other;

  return normalized || t.unknown;
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

function MoneyValue({ value }: { value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums text-foreground">
      <span>{formatMoney(value)}</span>
      <img src={SAR_ICON} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
    </span>
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

function HeaderSortButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center justify-start gap-1 truncate text-xs font-semibold transition hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="truncate">{children}</span>
      <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

function TableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-11 whitespace-nowrap px-4 text-right align-middle text-xs font-semibold text-muted-foreground",
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
  className: string;
}) {
  return (
    <TableCell
      className={cn(
        "h-[62px] overflow-hidden px-4 text-right align-middle",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}

export default function SystemContractsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [contracts, setContracts] = React.useState<ContractRecord[]>([]);
  const [summary, setSummary] = React.useState<ContractsSummary>(() =>
    normalizeSummary({}),
  );
  const [pagination, setPagination] = React.useState<PaginationState>({
    count: 0,
    page: 1,
    page_size: PAGE_SIZE,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<number | null>(null);
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ContractStatus>("all");
  const [pricingFilter, setPricingFilter] = React.useState<PricingModel>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Array<number>>([]);
  const [visibleColumns, setVisibleColumns] =
    React.useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [page, setPage] = React.useState(1);

  const didLoadRef = React.useRef(false);

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

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadContracts = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: String(page),
          page_size: String(PAGE_SIZE),
        });

        if (search) {
          params.set("search", search);
          params.set("q", search);
        }

        if (statusFilter !== "all") params.set("status", statusFilter);
        if (pricingFilter !== "all") params.set("pricing_model", pricingFilter);

        if (dateFrom) {
          params.set("date_from", dateFrom);
          params.set("created_from", dateFrom);
          params.set("start_from", dateFrom);
        }

        if (dateTo) {
          params.set("date_to", dateTo);
          params.set("created_to", dateTo);
          params.set("end_to", dateTo);
        }

        if (sortKey === "oldest") {
          params.set("ordering", "created_at");
          params.set("sort", "oldest");
        } else if (sortKey === "provider") {
          params.set("ordering", "provider__name");
          params.set("sort", "provider");
        } else if (sortKey === "contract_number") {
          params.set("ordering", "contract_number");
          params.set("sort", "contract_number");
        } else if (sortKey === "start_date") {
          params.set("ordering", "start_date");
          params.set("sort", "start_date");
        } else if (sortKey === "end_date") {
          params.set("ordering", "end_date");
          params.set("sort", "end_date");
        } else if (sortKey === "status") {
          params.set("ordering", "status");
          params.set("sort", "status");
        } else {
          params.set("ordering", "-created_at");
          params.set("sort", sortKey);
        }

        const payload = await fetchJson<ContractsApiResponse>(
          makeApiUrl("/api/contracts/", params),
          { signal: controller.signal },
        );

        const nextContracts = extractContracts(payload).map(normalizeContract);
        const nextSummary = normalizeSummary(extractSummary(payload));
        const nextPagination = extractPagination(payload);

        setContracts(nextContracts);
        setSummary(nextSummary);
        setPagination(nextPagination);
        setSelectedIds([]);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setContracts([]);
        setSummary(normalizeSummary({}));
        setPagination({
          count: 0,
          page,
          page_size: PAGE_SIZE,
          total_pages: 1,
          has_next: false,
          has_previous: false,
        });
        setSelectedIds([]);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [
      dateFrom,
      dateTo,
      page,
      pricingFilter,
      search,
      sortKey,
      statusFilter,
      t.errorDesc,
    ],
  );

  React.useEffect(() => {
    if (!didLoadRef.current) {
      didLoadRef.current = true;
      void loadContracts();
      return;
    }

    void loadContracts({ silent: true });
  }, [loadContracts]);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    pricingFilter !== "all" ||
    sortKey !== "newest" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const allPageSelected =
    contracts.length > 0 && contracts.every((contract) => selectedIds.includes(contract.id));

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setPricingFilter("all");
    setSortKey("newest");
    setDateFrom("");
    setDateTo("");
    setSelectedIds([]);
    setPage(1);
  }

  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(contracts.map((contract) => contract.id));
  }

  function toggleSelectContract(id: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((item) => item !== id);
    });
  }

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.actionFailed);
    }
  }

  async function runStatusAction(
    contract: ContractRecord,
    action: "activate" | "suspend" | "terminate" | "expire",
  ) {
    const confirmations = {
      activate: t.confirmActivate,
      suspend: t.confirmSuspend,
      terminate: t.confirmTerminate,
      expire: t.confirmExpire,
    };

    if (!window.confirm(confirmations[action])) return;

    setActionLoadingId(contract.id);

    try {
      await fetchJson<unknown>(
        makeApiUrl(`/api/contracts/${contract.id}/${action}/`),
        {
          method: "POST",
          body: {},
        },
      );

      toast.success(t.actionSuccess);
      await loadContracts({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.actionFailed;

      toast.error(message);
    } finally {
      setActionLoadingId(null);
    }
  }

  function buildExportRows() {
    return contracts.map((contract) => ({
      contract: contract.contract_number,
      title: contract.title,
      provider: contract.provider_name,
      status: getStatusLabel(contract.status, locale),
      pricing: getPricingLabel(contract.pricing_model, locale),
      start: formatDate(contract.start_date),
      end: formatDate(contract.end_date),
      products: contract.total_contract_products,
      activeProducts: contract.active_contract_products,
      featured: contract.featured_contract_offers,
      landing: contract.landing_contract_offers,
      mobile: contract.mobile_contract_offers,
      offersPage: contract.offers_page_contract_offers,
      discount: contract.max_discount_percentage,
      commission: contract.max_system_commission_percentage,
      createdAt: formatDate(contract.created_at),
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
            .num { mso-number-format: "0"; }
            .money { mso-number-format: "0.00"; }
          </style>
        </head>
        <body>
          <h2>${escapeHtml(t.printTitle)}</h2>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.contract)}</th>
                <th>${escapeHtml(t.provider)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.pricing)}</th>
                <th>${escapeHtml(t.start)}</th>
                <th>${escapeHtml(t.end)}</th>
                <th>${escapeHtml(t.products)}</th>
                <th>${escapeHtml(t.featured)}</th>
                <th>${escapeHtml(t.landing)}</th>
                <th>${escapeHtml(t.mobile)}</th>
                <th>${escapeHtml(t.offersPage)}</th>
                <th>${escapeHtml(t.discount)}</th>
                <th>${escapeHtml(t.commission)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.contract)}</td>
                      <td>${escapeHtml(row.provider)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.pricing)}</td>
                      <td>${escapeHtml(row.start)}</td>
                      <td>${escapeHtml(row.end)}</td>
                      <td class="num">${escapeHtml(row.products)}</td>
                      <td class="num">${escapeHtml(row.featured)}</td>
                      <td class="num">${escapeHtml(row.landing)}</td>
                      <td class="num">${escapeHtml(row.mobile)}</td>
                      <td class="num">${escapeHtml(row.offersPage)}</td>
                      <td class="money">${escapeHtml(row.discount)}</td>
                      <td class="money">${escapeHtml(row.commission)}</td>
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
    link.download = `primey-care-contracts-${new Date().toISOString().slice(0, 10)}.xls`;
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
      toast.error(t.actionFailed);
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
              align-items: flex-start;
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
              <p>${escapeHtml(t.showing)}: ${escapeHtml(rows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalContracts)}</span><strong>${escapeHtml(summary.total_contracts || pagination.count)}</strong></div>
            <div class="box"><span>${escapeHtml(t.activeContracts)}</span><strong>${escapeHtml(summary.active_contracts)}</strong></div>
            <div class="box"><span>${escapeHtml(t.products)}</span><strong>${escapeHtml(summary.total_contract_products)}</strong></div>
            <div class="box"><span>${escapeHtml(t.featuredOffers)}</span><strong>${escapeHtml(summary.featured_contract_offers)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.contract)}</th>
                <th>${escapeHtml(t.provider)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.pricing)}</th>
                <th>${escapeHtml(t.dates)}</th>
                <th>${escapeHtml(t.products)}</th>
                <th>${escapeHtml(t.visibility)}</th>
                <th>${escapeHtml(t.discount)}</th>
                <th>${escapeHtml(t.commission)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.contract)}</td>
                      <td>${escapeHtml(row.provider)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.pricing)}</td>
                      <td>${escapeHtml(row.start)} - ${escapeHtml(row.end)}</td>
                      <td class="num">${escapeHtml(row.products)}</td>
                      <td class="num">${escapeHtml(row.landing)} / ${escapeHtml(row.mobile)} / ${escapeHtml(row.offersPage)}</td>
                      <td class="num">${escapeHtml(formatPercent(row.discount))}</td>
                      <td class="num">${escapeHtml(formatPercent(row.commission))}</td>
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
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
            onClick={() => void loadContracts({ silent: true })}
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

          <Button asChild className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90">
            <Link href="/system/contracts/create">
              <Plus className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalContracts}
          value={formatInteger(summary.total_contracts || pagination.count)}
          trend={`${t.activeContracts}: ${formatInteger(summary.active_contracts)}`}
          icon={ShieldCheck}
        />

        <KpiCard
          title={t.products}
          value={formatInteger(summary.total_contract_products)}
          trend={`${t.active}: ${formatInteger(summary.active_contract_products)}`}
          icon={Layers3}
        />

        <KpiCard
          title={t.featuredOffers}
          value={formatInteger(summary.featured_contract_offers)}
          trend={`${t.landing}: ${formatInteger(summary.landing_contract_offers)}`}
          icon={Sparkles}
        />

        <KpiCard
          title={t.providers}
          value={formatInteger(summary.providers_with_contracts)}
          trend={`${t.offersPage}: ${formatInteger(summary.offers_page_contract_offers)}`}
          icon={BadgePercent}
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
              onClick={() => void loadContracts()}
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
                  onValueChange={(value) => {
                    setStatusFilter(value as ContractStatus);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[145px]">
                    <CheckCircle2 className="h-4 w-4" />
                    <SelectValue placeholder={t.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    <SelectItem value="DRAFT">{t.draft}</SelectItem>
                    <SelectItem value="ACTIVE">{t.active}</SelectItem>
                    <SelectItem value="SUSPENDED">{t.suspended}</SelectItem>
                    <SelectItem value="EXPIRED">{t.expired}</SelectItem>
                    <SelectItem value="TERMINATED">{t.terminated}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={pricingFilter}
                  onValueChange={(value) => {
                    setPricingFilter(value as PricingModel);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[150px]">
                    <BadgePercent className="h-4 w-4" />
                    <SelectValue placeholder={t.pricing} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allPricing}</SelectItem>
                    <SelectItem value="FIXED">{t.fixed}</SelectItem>
                    <SelectItem value="COMMISSION">{t.commissionModel}</SelectItem>
                    <SelectItem value="PERCENTAGE">{t.percentage}</SelectItem>
                    <SelectItem value="DISCOUNT">{t.discountModel}</SelectItem>
                    <SelectItem value="MIXED">{t.mixed}</SelectItem>
                    <SelectItem value="OTHER">{t.other}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.from}</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => {
                      setDateFrom(event.target.value);
                      setPage(1);
                    }}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.to}</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(event) => {
                      setDateTo(event.target.value);
                      setPage(1);
                    }}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 rounded-lg bg-background">
                      <ColumnsIcon className="h-4 w-4" />
                      {t.columns}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                    <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(
                      [
                        ["select", t.selected],
                        ["contract", t.contract],
                        ["provider", t.provider],
                        ["status", t.status],
                        ["pricing", t.pricing],
                        ["dates", t.dates],
                        ["products", t.productsCol],
                        ["offers", t.offersCol],
                        ["visibility", t.visibility],
                        ["discount", t.discount],
                        ["commission", t.commission],
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

                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-background"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 rounded-lg bg-background">
                      <ArrowUpDown className="h-4 w-4" />
                      {t.sort}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                    {(
                      [
                        ["newest", t.newest],
                        ["oldest", t.oldest],
                        ["contract_number", t.contractNumberSort],
                        ["provider", t.providerSort],
                        ["status", t.statusSort],
                        ["start_date", t.startDateSort],
                        ["end_date", t.endDateSort],
                        ["most_products", t.mostProducts],
                        ["most_offers", t.mostOffers],
                        ["highest_discount", t.highestDiscount],
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
              <Table className="min-w-[1260px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {visibleColumns.select ? (
                      <TableHeaderCell className="w-[46px] px-3">
                        <Checkbox
                          checked={allPageSelected}
                          onCheckedChange={(checked) =>
                            toggleSelectAllPage(Boolean(checked))
                          }
                          aria-label={t.selected}
                        />
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.contract ? (
                      <TableHeaderCell className="w-[220px]">
                        <HeaderSortButton
                          active={sortKey === "contract_number"}
                          onClick={() => {
                            setSortKey("contract_number");
                            setPage(1);
                          }}
                        >
                          {t.contract}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.provider ? (
                      <TableHeaderCell className="w-[210px]">
                        <HeaderSortButton
                          active={sortKey === "provider"}
                          onClick={() => {
                            setSortKey("provider");
                            setPage(1);
                          }}
                        >
                          {t.provider}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.status ? (
                      <TableHeaderCell className="w-[115px]">
                        <HeaderSortButton
                          active={sortKey === "status"}
                          onClick={() => {
                            setSortKey("status");
                            setPage(1);
                          }}
                        >
                          {t.status}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.pricing ? (
                      <TableHeaderCell className="w-[120px]">{t.pricing}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.dates ? (
                      <TableHeaderCell className="w-[150px]">{t.dates}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.products ? (
                      <TableHeaderCell className="w-[95px]">
                        <HeaderSortButton
                          active={sortKey === "most_products"}
                          onClick={() => {
                            setSortKey("most_products");
                            setPage(1);
                          }}
                        >
                          {t.productsCol}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.offers ? (
                      <TableHeaderCell className="w-[95px]">
                        <HeaderSortButton
                          active={sortKey === "most_offers"}
                          onClick={() => {
                            setSortKey("most_offers");
                            setPage(1);
                          }}
                        >
                          {t.offersCol}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.visibility ? (
                      <TableHeaderCell className="w-[150px]">{t.visibility}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.discount ? (
                      <TableHeaderCell className="w-[105px]">
                        <HeaderSortButton
                          active={sortKey === "highest_discount"}
                          onClick={() => {
                            setSortKey("highest_discount");
                            setPage(1);
                          }}
                        >
                          {t.discount}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.commission ? (
                      <TableHeaderCell className="w-[105px]">{t.commission}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.createdAt ? (
                      <TableHeaderCell className="w-[120px]">
                        <HeaderSortButton
                          active={sortKey === "newest" || sortKey === "oldest"}
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
                  {contracts.length ? (
                    contracts.map((contract) => (
                      <TableRow key={contract.id} className="h-[62px]">
                        {visibleColumns.select ? (
                          <TableBodyCell className="w-[46px] px-3">
                            <Checkbox
                              checked={selectedIds.includes(contract.id)}
                              onCheckedChange={(checked) =>
                                toggleSelectContract(contract.id, Boolean(checked))
                              }
                              aria-label={contract.contract_number}
                            />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.contract ? (
                          <TableBodyCell className="w-[220px]">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/system/contracts/${contract.id}`}
                                  className="block truncate text-sm font-semibold text-foreground hover:underline"
                                >
                                  {contract.contract_number}
                                </Link>
                                <p className="truncate text-xs text-muted-foreground">
                                  {contract.title || contract.code || "—"}
                                </p>
                              </div>
                            </div>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.provider ? (
                          <TableBodyCell className="w-[210px]">
                            {contract.provider_id ? (
                              <Link
                                href={`/system/providers/${contract.provider_id}`}
                                className="block truncate text-sm font-medium text-foreground hover:underline"
                              >
                                {contract.provider_name || "—"}
                              </Link>
                            ) : (
                              <span className="block truncate text-sm text-muted-foreground">
                                {contract.provider_name || "—"}
                              </span>
                            )}
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.status ? (
                          <TableBodyCell className="w-[115px]">
                            <StatusBadge status={contract.status} locale={locale} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.pricing ? (
                          <TableBodyCell className="w-[120px]">
                            <Badge
                              variant="outline"
                              className="max-w-full rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium"
                            >
                              <span className="truncate">
                                {getPricingLabel(contract.pricing_model, locale)}
                              </span>
                            </Badge>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.dates ? (
                          <TableBodyCell className="w-[150px]">
                            <div className="space-y-0.5 text-xs tabular-nums text-muted-foreground">
                              <p className="truncate">{t.start}: {formatDate(contract.start_date)}</p>
                              <p className="truncate">{t.end}: {formatDate(contract.end_date)}</p>
                            </div>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.products ? (
                          <TableBodyCell className="w-[95px]">
                            <span className="block truncate text-sm font-medium tabular-nums">
                              {formatInteger(contract.total_contract_products)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.offers ? (
                          <TableBodyCell className="w-[95px]">
                            <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                              <Sparkles className="h-3.5 w-3.5" />
                              {formatInteger(contract.featured_contract_offers)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.visibility ? (
                          <TableBodyCell className="w-[150px]">
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="rounded-full bg-muted/40 text-[11px]">
                                {t.landing}: {formatInteger(contract.landing_contract_offers)}
                              </Badge>
                              <Badge variant="outline" className="rounded-full bg-muted/40 text-[11px]">
                                {t.mobile}: {formatInteger(contract.mobile_contract_offers)}
                              </Badge>
                              <Badge variant="outline" className="rounded-full bg-muted/40 text-[11px]">
                                {t.offersPage}: {formatInteger(contract.offers_page_contract_offers)}
                              </Badge>
                            </div>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.discount ? (
                          <TableBodyCell className="w-[105px]">
                            <Badge
                              variant="outline"
                              className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              {formatPercent(contract.max_discount_percentage)}
                            </Badge>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.commission ? (
                          <TableBodyCell className="w-[105px]">
                            <span className="block truncate text-sm font-medium tabular-nums">
                              {formatPercent(contract.max_system_commission_percentage)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.createdAt ? (
                          <TableBodyCell className="w-[120px]">
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {formatDate(contract.created_at)}
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
                                  disabled={actionLoadingId === contract.id}
                                >
                                  {actionLoadingId === contract.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align={locale === "ar" ? "start" : "end"}
                                className="w-56"
                              >
                                <DropdownMenuItem asChild>
                                  <Link href={`/system/contracts/${contract.id}`}>
                                    <Eye className="h-4 w-4" />
                                    {t.view}
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => void copyValue(contract.contract_number)}
                                >
                                  <Copy className="h-4 w-4" />
                                  {t.copyNumber}
                                </DropdownMenuItem>

                                {contract.provider_name ? (
                                  <DropdownMenuItem
                                    onClick={() => void copyValue(contract.provider_name)}
                                  >
                                    <Copy className="h-4 w-4" />
                                    {t.copyProvider}
                                  </DropdownMenuItem>
                                ) : null}

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => void runStatusAction(contract, "activate")}
                                  disabled={contract.status === "ACTIVE"}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  {t.activate}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => void runStatusAction(contract, "suspend")}
                                  disabled={contract.status === "SUSPENDED"}
                                >
                                  <TriangleAlert className="h-4 w-4" />
                                  {t.suspend}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => void runStatusAction(contract, "expire")}
                                  disabled={contract.status === "EXPIRED"}
                                >
                                  <XCircle className="h-4 w-4" />
                                  {t.expire}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => void runStatusAction(contract, "terminate")}
                                  disabled={contract.status === "TERMINATED"}
                                >
                                  <XCircle className="h-4 w-4" />
                                  {t.terminate}
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
                            <ShieldCheck className="h-6 w-6 text-muted-foreground" />
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
                              <Link href="/system/contracts/create">
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
                {formatInteger(contracts.length)}
              </span>{" "}
              {t.of}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(pagination.count || summary.total_contracts)}
              </span>{" "}
              {t.rows}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={!pagination.has_previous || refreshing}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                {t.previous}
              </Button>

              <div className="rounded-lg border bg-background px-3 py-2 text-sm tabular-nums">
                {t.page} {formatInteger(page)} {t.of}{" "}
                {formatInteger(pagination.total_pages)}
              </div>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={!pagination.has_next || refreshing}
                onClick={() =>
                  setPage((current) =>
                    Math.min(current + 1, pagination.total_pages),
                  )
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