"use client";

/* ============================================================
   📂 primey_frontend/app/system/providers/page.tsx
   🏥 Primey Care — Providers
   ------------------------------------------------------------
   ✅ Same approved Customers / Products / Orders table pattern
   ✅ Header buttons / KPI cards / toolbar / table unified
   ✅ Real API only: /api/providers/
   ✅ Server pagination: one request per page/filter
   ✅ No loading all 9000+ providers
   ✅ Keeps approved filters: search/status/type/region/city/featured/source/orders/columns
   ✅ Adds network/contract filter and date range
   ✅ No logo / CR / tax / Drive columns
   ✅ Excel .xls + Web print for current visible rows only
   ✅ SAR icon from /currency/sar.svg
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpDown,
  Building2,
  CheckCircle2,
  ColumnsIcon,
  Copy,
  Eye,
  FileSpreadsheet,
  FileUp,
  Layers3,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
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

type ProviderStatus = "all" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DRAFT";
type ProviderType =
  | "all"
  | "HOSPITAL"
  | "MEDICAL_CENTER"
  | "PHARMACY"
  | "LAB"
  | "CLINIC"
  | "PARTNER"
  | "OTHER";

type FeaturedFilter = "all" | "featured" | "not_featured";
type SourceFilter = "all" | "imported" | "manual";
type ContractFilter = "all" | "contracted" | "not_contracted";

type SortKey =
  | "newest"
  | "oldest"
  | "name"
  | "arabic_name"
  | "english_name"
  | "most_orders"
  | "highest_discount"
  | "contracted";

type ColumnKey =
  | "select"
  | "provider"
  | "type"
  | "region"
  | "city"
  | "source"
  | "orders"
  | "contracts"
  | "products"
  | "discount"
  | "featured"
  | "status"
  | "createdAt"
  | "actions";

type ProviderRecord = {
  id: number;
  name: string;
  name_ar: string;
  name_en: string;
  code: string;
  provider_type: string;
  status: string;
  region: string;
  area: string;
  city: string;
  source_category: string;
  import_source: string;
  external_reference: string;
  is_featured: boolean;
  phone: string;
  email: string;
  website: string;
  address: string;
  orders_count: number;
  active_contracts_count: number;
  contracted_products_count: number;
  highest_discount_percent: number;
  has_active_contract: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type ProvidersSummary = {
  total_providers: number;
  active_providers: number;
  inactive_providers: number;
  suspended_providers: number;
  draft_providers: number;
  hospitals_count: number;
  medical_centers_count: number;
  pharmacies_count: number;
  labs_count: number;
  clinics_count: number;
  partners_count: number;
  others_count: number;
  featured_providers: number;
  imported_providers: number;
  manual_providers: number;
  total_orders: number;
  contracted_providers: number;
  contracted_products_count: number;
  highest_discount_percent: number;
  providers_with_discounts: number;
};

type PaginationState = {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

type ProvidersApiResponse = {
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
  provider: true,
  type: true,
  region: true,
  city: true,
  source: true,
  orders: true,
  contracts: true,
  products: true,
  discount: true,
  featured: true,
  status: true,
  createdAt: true,
  actions: true,
};

const translations = {
  ar: {
    title: "مقدمو الخدمة",
    subtitle: "إدارة شبكة مقدمي الخدمة، التصنيفات، التعاقدات، والطلبات.",
    create: "إضافة مقدم خدمة",
    import: "استيراد الشبكة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث باسم مقدم الخدمة أو المدينة أو الكود...",
    totalProviders: "إجمالي النتائج",
    activeProviders: "النشطون",
    featuredProviders: "المميزون",
    importedProviders: "مستوردة من الشبكة",
    totalOrders: "عدد الطلبات",
    provider: "مقدم الخدمة",
    type: "التصنيف",
    region: "المنطقة",
    city: "المدينة",
    source: "المصدر",
    orders: "الطلبات",
    contracts: "العقود",
    products: "المنتجات",
    discount: "الخصم",
    featured: "مميز",
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
    allTypes: "كل التصنيفات",
    hospital: "مستشفى",
    medicalCenter: "مركز طبي",
    pharmacy: "صيدلية",
    lab: "مختبر",
    clinic: "عيادة",
    partner: "شريك",
    other: "أخرى",
    allRegions: "كل المناطق",
    allCities: "كل المدن",
    allFeatured: "كل المميز",
    featuredOnly: "المميز فقط",
    notFeatured: "غير المميز",
    allSources: "كل المصادر",
    imported: "مستوردة من الشبكة",
    manual: "إدخال يدوي",
    allContracts: "كل التعاقد",
    contracted: "متعاقد",
    notContracted: "غير متعاقد",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    arabicName: "الاسم العربي",
    englishName: "الاسم الإنجليزي",
    mostOrders: "الأكثر طلبات",
    highestDiscount: "الأعلى خصمًا",
    contractedSort: "الأكثر تعاقدًا",
    from: "من",
    to: "إلى",
    activeFilters: "فلاتر مفعلة",
    clearSelection: "إلغاء التحديد",
    view: "عرض التفاصيل",
    copyName: "نسخ الاسم",
    copyCode: "نسخ الكود",
    copied: "تم النسخ",
    yes: "نعم",
    no: "لا",
    noDataTitle: "لا يوجد مقدمو خدمة بعد",
    noDataDesc: "عند إضافة أو استيراد مقدمي الخدمة سيظهرون هنا.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل مقدمي الخدمة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير مقدمي الخدمة",
    generatedAt: "تاريخ الطباعة",
    showing: "عرض",
    rows: "صفوف",
    page: "صفحة",
    of: "من",
    next: "التالي",
    previous: "السابق",
    unknown: "غير محدد",
    network: "الشبكة الطبية",
    maxDiscount: "أعلى خصم",
  },
  en: {
    title: "Providers",
    subtitle: "Manage service providers, categories, contracts, and orders.",
    create: "Add Provider",
    import: "Import Network",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    searchPlaceholder: "Search provider name, city, or code...",
    totalProviders: "Total results",
    activeProviders: "Active",
    featuredProviders: "Featured",
    importedProviders: "Imported network",
    totalOrders: "Orders",
    provider: "Provider",
    type: "Type",
    region: "Region",
    city: "City",
    source: "Source",
    orders: "Orders",
    contracts: "Contracts",
    products: "Products",
    discount: "Discount",
    featured: "Featured",
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
    allTypes: "All types",
    hospital: "Hospital",
    medicalCenter: "Medical center",
    pharmacy: "Pharmacy",
    lab: "Lab",
    clinic: "Clinic",
    partner: "Partner",
    other: "Other",
    allRegions: "All regions",
    allCities: "All cities",
    allFeatured: "All featured",
    featuredOnly: "Featured only",
    notFeatured: "Not featured",
    allSources: "All sources",
    imported: "Imported network",
    manual: "Manual entry",
    allContracts: "All contracts",
    contracted: "Contracted",
    notContracted: "Not contracted",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    arabicName: "Arabic name",
    englishName: "English name",
    mostOrders: "Most orders",
    highestDiscount: "Highest discount",
    contractedSort: "Most contracted",
    from: "From",
    to: "To",
    activeFilters: "Active filters",
    clearSelection: "Clear selection",
    view: "View details",
    copyName: "Copy name",
    copyCode: "Copy code",
    copied: "Copied",
    yes: "Yes",
    no: "No",
    noDataTitle: "No providers yet",
    noDataDesc: "Added or imported providers will appear here.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load providers",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Providers report",
    generatedAt: "Generated at",
    showing: "Showing",
    rows: "Rows",
    page: "Page",
    of: "of",
    next: "Next",
    previous: "Previous",
    unknown: "Unknown",
    network: "Medical network",
    maxDiscount: "Max discount",
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

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

async function fetchJson<T>(
  url: string,
  options?: {
    signal?: AbortSignal;
  },
): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal: options?.signal,
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

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

function extractProviders(payload: ProvidersApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;

  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.items)) return payload.data.items;
  }

  return [];
}

function extractSummary(payload: ProvidersApiResponse) {
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

function extractPagination(payload: ProvidersApiResponse): PaginationState {
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

function normalizeProvider(value: unknown): ProviderRecord {
  const item = asRecord(value);

  const nameAr = normalizeText(item.name_ar);
  const nameEn = normalizeText(item.name_en);
  const name = normalizeText(
    item.name || item.display_name || nameAr || nameEn,
    `#${normalizeText(item.id)}`,
  );

  return {
    id: toNumber(item.id),
    name,
    name_ar: nameAr,
    name_en: nameEn,
    code: normalizeText(item.code || item.provider_code),
    provider_type: normalizeText(item.provider_type || item.type).toUpperCase(),
    status: normalizeText(item.status).toUpperCase(),
    region: normalizeText(item.region),
    area: normalizeText(item.area),
    city: normalizeText(item.city),
    source_category: normalizeText(item.source_category),
    import_source: normalizeText(item.import_source),
    external_reference: normalizeText(item.external_reference),
    is_featured: toBoolean(item.is_featured),
    phone: normalizeText(item.phone || item.phone_number || item.mobile),
    email: normalizeText(item.email),
    website: normalizeText(item.website),
    address: normalizeText(item.address),
    orders_count: toNumber(item.orders_count || item.order_count || item.total_orders),
    active_contracts_count: toNumber(item.active_contracts_count),
    contracted_products_count: toNumber(item.contracted_products_count),
    highest_discount_percent: toNumber(
      item.highest_discount_percent ||
        item.max_discount_percent ||
        item.discount_percent ||
        item.discount_percentage,
    ),
    has_active_contract: toBoolean(item.has_active_contract || item.has_active_contracts),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function normalizeSummary(value: unknown): ProvidersSummary {
  const item = asRecord(value);

  return {
    total_providers: toNumber(item.total_providers),
    active_providers: toNumber(item.active_providers),
    inactive_providers: toNumber(item.inactive_providers),
    suspended_providers: toNumber(item.suspended_providers),
    draft_providers: toNumber(item.draft_providers),
    hospitals_count: toNumber(item.hospitals_count),
    medical_centers_count: toNumber(item.medical_centers_count),
    pharmacies_count: toNumber(item.pharmacies_count),
    labs_count: toNumber(item.labs_count),
    clinics_count: toNumber(item.clinics_count),
    partners_count: toNumber(item.partners_count),
    others_count: toNumber(item.others_count),
    featured_providers: toNumber(item.featured_providers),
    imported_providers: toNumber(item.imported_providers),
    manual_providers: toNumber(item.manual_providers),
    total_orders: toNumber(item.total_orders),
    contracted_providers: toNumber(
      item.contracted_providers ||
        item.providers_with_active_contracts ||
        item.active_contracts_providers,
    ),
    contracted_products_count: toNumber(item.contracted_products_count),
    highest_discount_percent: toNumber(
      item.highest_discount_percent || item.max_discount_percent,
    ),
    providers_with_discounts: toNumber(item.providers_with_discounts),
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

  if (normalized === "SUSPENDED") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (normalized === "INACTIVE" || normalized === "DRAFT") {
    return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function getProviderTypeLabel(type: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(type).toUpperCase();

  if (normalized === "HOSPITAL") return t.hospital;
  if (normalized === "MEDICAL_CENTER") return t.medicalCenter;
  if (normalized === "PHARMACY") return t.pharmacy;
  if (normalized === "LAB") return t.lab;
  if (normalized === "CLINIC") return t.clinic;
  if (normalized === "PARTNER") return t.partner;
  if (normalized === "OTHER") return t.other;

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

export default function SystemProvidersPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [providers, setProviders] = React.useState<ProviderRecord[]>([]);
  const [summary, setSummary] = React.useState<ProvidersSummary>(() => normalizeSummary({}));
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
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ProviderStatus>("all");
  const [typeFilter, setTypeFilter] = React.useState<ProviderType>("all");
  const [regionFilter, setRegionFilter] = React.useState("all");
  const [cityFilter, setCityFilter] = React.useState("all");
  const [featuredFilter, setFeaturedFilter] = React.useState<FeaturedFilter>("all");
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>("all");
  const [contractFilter, setContractFilter] = React.useState<ContractFilter>("all");
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
    const applyLocale = () => setLocale(getInitialLocale());

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

  const loadProviders = React.useCallback(
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
        if (typeFilter !== "all") params.set("provider_type", typeFilter);
        if (regionFilter !== "all") params.set("region", regionFilter);
        if (cityFilter !== "all") params.set("city", cityFilter);

        if (featuredFilter === "featured") params.set("is_featured", "true");
        if (featuredFilter === "not_featured") params.set("is_featured", "false");

        if (sourceFilter !== "all") params.set("source", sourceFilter);

        if (contractFilter === "contracted") params.set("has_active_contract", "true");
        if (contractFilter === "not_contracted") params.set("has_active_contract", "false");

        if (dateFrom) {
          params.set("date_from", dateFrom);
          params.set("created_from", dateFrom);
        }

        if (dateTo) {
          params.set("date_to", dateTo);
          params.set("created_to", dateTo);
        }

        if (sortKey === "most_orders") {
          params.set("sort", "most_orders");
          params.set("ordering", "-orders_count");
        } else if (sortKey === "highest_discount") {
          params.set("sort", "highest_discount");
        } else if (sortKey === "contracted") {
          params.set("sort", "contracted");
        } else {
          params.set("sort", sortKey);
        }

        const payload = await fetchJson<ProvidersApiResponse>(
          makeApiUrl("/api/providers/", params),
          { signal: controller.signal },
        );

        const nextProviders = extractProviders(payload).map(normalizeProvider);
        const nextSummary = normalizeSummary(extractSummary(payload));
        const nextPagination = extractPagination(payload);

        setProviders(nextProviders);
        setSummary(nextSummary);
        setPagination(nextPagination);
        setSelectedIds([]);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setProviders([]);
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
      cityFilter,
      contractFilter,
      dateFrom,
      dateTo,
      featuredFilter,
      page,
      regionFilter,
      search,
      sortKey,
      sourceFilter,
      statusFilter,
      t.errorDesc,
      typeFilter,
    ],
  );

  React.useEffect(() => {
    if (!didLoadRef.current) {
      didLoadRef.current = true;
      void loadProviders();
      return;
    }

    void loadProviders({ silent: true });
  }, [loadProviders]);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const availableRegions = React.useMemo(() => {
    const values = new Set<string>();
    providers.forEach((provider) => {
      if (provider.region) values.add(provider.region);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [providers]);

  const availableCities = React.useMemo(() => {
    const values = new Set<string>();
    providers.forEach((provider) => {
      if (provider.city) values.add(provider.city);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [providers]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    regionFilter !== "all" ||
    cityFilter !== "all" ||
    featuredFilter !== "all" ||
    sourceFilter !== "all" ||
    contractFilter !== "all" ||
    sortKey !== "newest" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const allPageSelected =
    providers.length > 0 && providers.every((provider) => selectedIds.includes(provider.id));

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setRegionFilter("all");
    setCityFilter("all");
    setFeaturedFilter("all");
    setSourceFilter("all");
    setContractFilter("all");
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

    setSelectedIds(providers.map((provider) => provider.id));
  }

  function toggleSelectProvider(id: number, checked: boolean) {
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
      toast.error(t.errorDesc);
    }
  }

  function buildExportRows() {
    return providers.map((provider) => ({
      provider: provider.name,
      code: provider.code,
      type: getProviderTypeLabel(provider.provider_type, locale),
      region: provider.region || provider.area || "—",
      city: provider.city || "—",
      source: provider.import_source ? t.imported : t.manual,
      orders: provider.orders_count,
      contracts: provider.active_contracts_count,
      products: provider.contracted_products_count,
      discount: provider.highest_discount_percent,
      featured: provider.is_featured ? t.yes : t.no,
      status: getStatusLabel(provider.status, locale),
      createdAt: formatDate(provider.created_at),
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
                <th>${escapeHtml(t.provider)}</th>
                <th>${escapeHtml("Code")}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.region)}</th>
                <th>${escapeHtml(t.city)}</th>
                <th>${escapeHtml(t.source)}</th>
                <th>${escapeHtml(t.orders)}</th>
                <th>${escapeHtml(t.contracts)}</th>
                <th>${escapeHtml(t.products)}</th>
                <th>${escapeHtml(t.discount)}</th>
                <th>${escapeHtml(t.featured)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.provider)}</td>
                      <td>${escapeHtml(row.code)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.region)}</td>
                      <td>${escapeHtml(row.city)}</td>
                      <td>${escapeHtml(row.source)}</td>
                      <td class="num">${escapeHtml(row.orders)}</td>
                      <td class="num">${escapeHtml(row.contracts)}</td>
                      <td class="num">${escapeHtml(row.products)}</td>
                      <td class="money">${escapeHtml(row.discount)}</td>
                      <td>${escapeHtml(row.featured)}</td>
                      <td>${escapeHtml(row.status)}</td>
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
    link.download = `primey-care-providers-${new Date().toISOString().slice(0, 10)}.xls`;
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
      toast.error(t.errorDesc);
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
              grid-template-columns: repeat(5, minmax(0, 1fr));
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
            <div class="box"><span>${escapeHtml(t.totalProviders)}</span><strong>${escapeHtml(summary.total_providers)}</strong></div>
            <div class="box"><span>${escapeHtml(t.activeProviders)}</span><strong>${escapeHtml(summary.active_providers)}</strong></div>
            <div class="box"><span>${escapeHtml(t.featuredProviders)}</span><strong>${escapeHtml(summary.featured_providers)}</strong></div>
            <div class="box"><span>${escapeHtml(t.importedProviders)}</span><strong>${escapeHtml(summary.imported_providers)}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalOrders)}</span><strong>${escapeHtml(summary.total_orders)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.provider)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.region)}</th>
                <th>${escapeHtml(t.city)}</th>
                <th>${escapeHtml(t.source)}</th>
                <th>${escapeHtml(t.orders)}</th>
                <th>${escapeHtml(t.contracts)}</th>
                <th>${escapeHtml(t.products)}</th>
                <th>${escapeHtml(t.discount)}</th>
                <th>${escapeHtml(t.status)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.provider)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.region)}</td>
                      <td>${escapeHtml(row.city)}</td>
                      <td>${escapeHtml(row.source)}</td>
                      <td class="num">${escapeHtml(row.orders)}</td>
                      <td class="num">${escapeHtml(row.contracts)}</td>
                      <td class="num">${escapeHtml(row.products)}</td>
                      <td class="num">${escapeHtml(formatPercent(row.discount))}</td>
                      <td>${escapeHtml(row.status)}</td>
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
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
            onClick={() => void loadProviders({ silent: true })}
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

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/providers/import">
              <FileUp className="h-4 w-4" />
              {t.import}
            </Link>
          </Button>

          <Button asChild className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90">
            <Link href="/system/providers/create">
              <Plus className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          title={t.totalProviders}
          value={formatInteger(summary.total_providers || pagination.count)}
          trend={`${t.showing} ${formatInteger(providers.length)}`}
          icon={Building2}
        />

        <KpiCard
          title={t.activeProviders}
          value={formatInteger(summary.active_providers)}
          trend={t.active}
          icon={CheckCircle2}
        />

        <KpiCard
          title={t.featuredProviders}
          value={formatInteger(summary.featured_providers)}
          trend={t.featured}
          icon={Sparkles}
        />

        <KpiCard
          title={t.importedProviders}
          value={formatInteger(summary.imported_providers)}
          trend={t.network}
          icon={Layers3}
        />

        <KpiCard
          title={t.totalOrders}
          value={formatInteger(summary.total_orders)}
          trend={t.orders}
          icon={ShoppingCart}
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
              onClick={() => void loadProviders()}
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
                    setStatusFilter(value as ProviderStatus);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[135px]">
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
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value as ProviderType);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[155px]">
                    <Building2 className="h-4 w-4" />
                    <SelectValue placeholder={t.type} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allTypes}</SelectItem>
                    <SelectItem value="HOSPITAL">{t.hospital}</SelectItem>
                    <SelectItem value="MEDICAL_CENTER">{t.medicalCenter}</SelectItem>
                    <SelectItem value="PHARMACY">{t.pharmacy}</SelectItem>
                    <SelectItem value="LAB">{t.lab}</SelectItem>
                    <SelectItem value="CLINIC">{t.clinic}</SelectItem>
                    <SelectItem value="PARTNER">{t.partner}</SelectItem>
                    <SelectItem value="OTHER">{t.other}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={regionFilter}
                  onValueChange={(value) => {
                    setRegionFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[140px]">
                    <MapPin className="h-4 w-4" />
                    <SelectValue placeholder={t.region} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allRegions}</SelectItem>
                    {availableRegions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={cityFilter}
                  onValueChange={(value) => {
                    setCityFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[140px]">
                    <MapPin className="h-4 w-4" />
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
                  value={featuredFilter}
                  onValueChange={(value) => {
                    setFeaturedFilter(value as FeaturedFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[140px]">
                    <Sparkles className="h-4 w-4" />
                    <SelectValue placeholder={t.featured} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allFeatured}</SelectItem>
                    <SelectItem value="featured">{t.featuredOnly}</SelectItem>
                    <SelectItem value="not_featured">{t.notFeatured}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sourceFilter}
                  onValueChange={(value) => {
                    setSourceFilter(value as SourceFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[165px]">
                    <Layers3 className="h-4 w-4" />
                    <SelectValue placeholder={t.source} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allSources}</SelectItem>
                    <SelectItem value="imported">{t.imported}</SelectItem>
                    <SelectItem value="manual">{t.manual}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={contractFilter}
                  onValueChange={(value) => {
                    setContractFilter(value as ContractFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[150px]">
                    <ShieldCheck className="h-4 w-4" />
                    <SelectValue placeholder={t.contracts} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allContracts}</SelectItem>
                    <SelectItem value="contracted">{t.contracted}</SelectItem>
                    <SelectItem value="not_contracted">{t.notContracted}</SelectItem>
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
                        ["provider", t.provider],
                        ["type", t.type],
                        ["region", t.region],
                        ["city", t.city],
                        ["source", t.source],
                        ["orders", t.orders],
                        ["contracts", t.contracts],
                        ["products", t.products],
                        ["discount", t.discount],
                        ["featured", t.featured],
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
                        ["name", t.nameSort],
                        ["arabic_name", t.arabicName],
                        ["english_name", t.englishName],
                        ["most_orders", t.mostOrders],
                        ["highest_discount", t.highestDiscount],
                        ["contracted", t.contractedSort],
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
              <Table className="min-w-[1240px] table-fixed">
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

                    {visibleColumns.provider ? (
                      <TableHeaderCell className="w-[250px]">
                        <HeaderSortButton
                          active={["name", "arabic_name", "english_name"].includes(sortKey)}
                          onClick={() => {
                            setSortKey("name");
                            setPage(1);
                          }}
                        >
                          {t.provider}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.type ? (
                      <TableHeaderCell className="w-[135px]">{t.type}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.region ? (
                      <TableHeaderCell className="w-[125px]">{t.region}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.city ? (
                      <TableHeaderCell className="w-[125px]">{t.city}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.source ? (
                      <TableHeaderCell className="w-[140px]">{t.source}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.orders ? (
                      <TableHeaderCell className="w-[95px]">
                        <HeaderSortButton
                          active={sortKey === "most_orders"}
                          onClick={() => {
                            setSortKey("most_orders");
                            setPage(1);
                          }}
                        >
                          {t.orders}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.contracts ? (
                      <TableHeaderCell className="w-[95px]">{t.contracts}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.products ? (
                      <TableHeaderCell className="w-[95px]">{t.products}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.discount ? (
                      <TableHeaderCell className="w-[100px]">
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

                    {visibleColumns.featured ? (
                      <TableHeaderCell className="w-[90px]">{t.featured}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.status ? (
                      <TableHeaderCell className="w-[110px]">{t.status}</TableHeaderCell>
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
                  {providers.length ? (
                    providers.map((provider) => (
                      <TableRow key={provider.id} className="h-[62px]">
                        {visibleColumns.select ? (
                          <TableBodyCell className="w-[46px] px-3">
                            <Checkbox
                              checked={selectedIds.includes(provider.id)}
                              onCheckedChange={(checked) =>
                                toggleSelectProvider(provider.id, Boolean(checked))
                              }
                              aria-label={provider.name}
                            />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.provider ? (
                          <TableBodyCell className="w-[250px]">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/system/providers/${provider.id}`}
                                  className="block truncate text-sm font-semibold text-foreground hover:underline"
                                >
                                  {provider.name_ar || provider.name || provider.name_en}
                                </Link>
                                <p className="truncate text-xs text-muted-foreground">
                                  {provider.code || provider.name_en || provider.external_reference || "—"}
                                </p>
                              </div>
                            </div>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.type ? (
                          <TableBodyCell className="w-[135px]">
                            <Badge
                              variant="outline"
                              className="max-w-full rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium"
                            >
                              <span className="truncate">
                                {getProviderTypeLabel(provider.provider_type, locale)}
                              </span>
                            </Badge>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.region ? (
                          <TableBodyCell className="w-[125px]">
                            <span className="block truncate text-sm text-muted-foreground">
                              {provider.region || provider.area || "—"}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.city ? (
                          <TableBodyCell className="w-[125px]">
                            <span className="block truncate text-sm text-muted-foreground">
                              {provider.city || "—"}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.source ? (
                          <TableBodyCell className="w-[140px]">
                            <Badge
                              variant="outline"
                              className={cn(
                                "max-w-full rounded-full px-2.5 py-1 text-xs font-medium",
                                provider.import_source
                                  ? "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50"
                                  : "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40",
                              )}
                            >
                              <span className="truncate">
                                {provider.import_source ? t.imported : t.manual}
                              </span>
                            </Badge>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.orders ? (
                          <TableBodyCell className="w-[95px]">
                            <Link
                              href={`/system/orders?provider_id=${provider.id}`}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                              {formatInteger(provider.orders_count)}
                            </Link>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.contracts ? (
                          <TableBodyCell className="w-[95px]">
                            <span className="block truncate text-sm font-medium tabular-nums">
                              {formatInteger(provider.active_contracts_count)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.products ? (
                          <TableBodyCell className="w-[95px]">
                            <span className="block truncate text-sm font-medium tabular-nums">
                              {formatInteger(provider.contracted_products_count)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.discount ? (
                          <TableBodyCell className="w-[100px]">
                            <Badge
                              variant="outline"
                              className="rounded-full border-violet-500/30 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                            >
                              {formatPercent(provider.highest_discount_percent)}
                            </Badge>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.featured ? (
                          <TableBodyCell className="w-[90px]">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-medium",
                                provider.is_featured
                                  ? "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50"
                                  : "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40",
                              )}
                            >
                              {provider.is_featured ? t.yes : t.no}
                            </Badge>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.status ? (
                          <TableBodyCell className="w-[110px]">
                            <StatusBadge status={provider.status} locale={locale} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.createdAt ? (
                          <TableBodyCell className="w-[120px]">
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {formatDate(provider.created_at)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.actions ? (
                          <TableBodyCell className="w-[72px] text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align={locale === "ar" ? "start" : "end"}
                                className="w-52"
                              >
                                <DropdownMenuItem asChild>
                                  <Link href={`/system/providers/${provider.id}`}>
                                    <Eye className="h-4 w-4" />
                                    {t.view}
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    void copyValue(provider.name_ar || provider.name || provider.name_en)
                                  }
                                >
                                  <Copy className="h-4 w-4" />
                                  {t.copyName}
                                </DropdownMenuItem>

                                {provider.code ? (
                                  <DropdownMenuItem
                                    onClick={() => void copyValue(provider.code)}
                                  >
                                    <ShieldCheck className="h-4 w-4" />
                                    {t.copyCode}
                                  </DropdownMenuItem>
                                ) : null}
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
                            <Building2 className="h-6 w-6 text-muted-foreground" />
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
                              <Link href="/system/providers/create">
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
                {formatInteger(providers.length)}
              </span>{" "}
              {t.of}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(pagination.count || summary.total_providers)}
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