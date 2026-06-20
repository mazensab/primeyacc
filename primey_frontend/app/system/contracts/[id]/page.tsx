"use client";

/* ============================================================
   📂 primey_frontend/app/system/contracts/[id]/page.tsx
   📄 Primey Care — Contract Details
   ------------------------------------------------------------
   ✅ Same approved Customers / Providers / Agents detail pattern
   ✅ Side profile card + main details workspace
   ✅ Real API only: GET/PATCH/DELETE /api/contracts/{id}/
   ✅ Status actions: activate/suspend/terminate/expire
   ✅ ContractProduct offers table
   ✅ Inline edit without separate edit page
   ✅ Safe terminate instead of destructive delete
   ✅ Internal UI components only
   ✅ No localhost
   ✅ No fake data
   ✅ SAR icon from /currency/sar.svg
   ✅ Web print
   ✅ sonner toast
   ✅ RTL/LTR via primey-locale
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Layers3,
  Loader2,
  MoreHorizontal,
  Pencil,
  Printer,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Store,
  TriangleAlert,
  X,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type ContractStatus =
  | "DRAFT"
  | "ACTIVE"
  | "SUSPENDED"
  | "EXPIRED"
  | "TERMINATED";

type PricingModel =
  | "FIXED"
  | "COMMISSION"
  | "PERCENTAGE"
  | "DISCOUNT"
  | "MIXED"
  | "OTHER";

type ContractProductRecord = {
  id: number;
  product_id: number | null;
  product_name: string;
  product_name_ar: string;
  product_name_en: string;
  product_type: string;
  category_name: string;
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
  offer_subtitle: string;
  offer_badge: string;
  offer_description: string;
  offer_terms: string;
  offer_start_date: string | null;
  offer_end_date: string | null;
  marketing_image_url: string;
  priority: number;
  usage_limit: number;
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
  min_price_before_discount: number;
  max_price_after_discount: number;
  created_at: string | null;
  updated_at: string | null;
  contract_products: ContractProductRecord[];
};

type FormState = {
  contract_number: string;
  title: string;
  code: string;
  status: ContractStatus;
  pricing_model: PricingModel;
  start_date: string;
  end_date: string;
  notes: string;
  internal_notes: string;
};

type ContractApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  contract?: unknown;
};

const SAR_ICON = "/currency/sar.svg";

const translations = {
  ar: {
    title: "تفاصيل العقد",
    subtitle: "ملف عقد مقدم الخدمة، عروض المنتجات، الأسعار، الخصومات، والظهور.",
    back: "رجوع",
    refresh: "تحديث",
    print: "طباعة",
    actions: "الإجراءات",
    edit: "تعديل العقد",
    save: "حفظ التعديلات",
    cancelEdit: "إلغاء التعديل",
    activate: "تفعيل العقد",
    suspend: "تعليق العقد",
    terminate: "إنهاء العقد",
    expire: "تعيين كمنتهي",
    copyNumber: "نسخ رقم العقد",
    copyProvider: "نسخ مقدم الخدمة",
    copied: "تم النسخ",
    overview: "نظرة عامة",
    offers: "عروض المنتجات",
    visibility: "الظهور",
    editTab: "تعديل العقد",
    activity: "السجل",
    contractInfo: "بيانات العقد",
    providerInfo: "مقدم الخدمة",
    pricingInfo: "التسعير والمدة",
    notes: "الملاحظات",
    noNotes: "لا توجد ملاحظات.",
    contractNumber: "رقم العقد",
    contractTitle: "عنوان العقد",
    code: "الكود",
    provider: "مقدم الخدمة",
    status: "الحالة",
    pricingModel: "نموذج التسعير",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    draft: "مسودة",
    active: "نشط",
    suspended: "معلق",
    expired: "منتهي",
    terminated: "منهى",
    fixed: "ثابت",
    commission: "عمولة",
    percentage: "نسبة",
    discount: "خصم",
    mixed: "مختلط",
    other: "أخرى",
    products: "المنتجات",
    activeProducts: "منتجات نشطة",
    featuredOffers: "عروض مميزة",
    landingOffers: "ظهور الهبوط",
    mobileOffers: "ظهور الموبايل",
    offersPage: "صفحة العروض",
    highestDiscount: "أعلى خصم",
    systemCommission: "عمولة النظام",
    priceBefore: "قبل الخصم",
    priceAfter: "بعد الخصم",
    product: "المنتج",
    type: "النوع",
    category: "التصنيف",
    productStatus: "حالة العرض",
    offerTitle: "عنوان العرض",
    offerBadge: "شارة العرض",
    offerPeriod: "مدة العرض",
    priority: "الأولوية",
    usageLimit: "حد الاستخدام",
    yes: "نعم",
    no: "لا",
    enabled: "مفعل",
    disabled: "غير مفعل",
    unknown: "غير محدد",
    openProvider: "فتح مقدم الخدمة",
    openProduct: "فتح المنتج",
    noProductsTitle: "لا توجد عروض منتجات",
    noProductsDesc: "عند إضافة منتجات للعقد ستظهر هنا.",
    confirmActivate: "هل تريد تفعيل العقد؟",
    confirmSuspend: "هل تريد تعليق العقد؟",
    confirmTerminate: "هل تريد إنهاء العقد؟",
    confirmExpire: "هل تريد تعيين العقد كمنتهي؟",
    actionSuccess: "تم تحديث حالة العقد بنجاح.",
    saveSuccess: "تم حفظ بيانات العقد.",
    operationFailed: "تعذر تنفيذ العملية.",
    errorTitle: "تعذر تحميل تفاصيل العقد",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    notFoundTitle: "العقد غير موجود",
    notFoundDesc: "تعذر العثور على العقد المطلوب.",
    tryAgain: "إعادة المحاولة",
    requiredNumber: "رقم العقد أو عنوان العقد مطلوب.",
    printTitle: "تقرير العقد",
    generatedAt: "تاريخ الطباعة",
    internalNotes: "ملاحظات داخلية",
    dateRange: "مدة العقد",
  },
  en: {
    title: "Contract Details",
    subtitle: "Provider contract profile, product offers, prices, discounts, and visibility.",
    back: "Back",
    refresh: "Refresh",
    print: "Print",
    actions: "Actions",
    edit: "Edit contract",
    save: "Save changes",
    cancelEdit: "Cancel edit",
    activate: "Activate contract",
    suspend: "Suspend contract",
    terminate: "Terminate contract",
    expire: "Mark as expired",
    copyNumber: "Copy contract number",
    copyProvider: "Copy provider",
    copied: "Copied",
    overview: "Overview",
    offers: "Product offers",
    visibility: "Visibility",
    editTab: "Edit contract",
    activity: "Activity",
    contractInfo: "Contract info",
    providerInfo: "Provider",
    pricingInfo: "Pricing & dates",
    notes: "Notes",
    noNotes: "No notes.",
    contractNumber: "Contract number",
    contractTitle: "Contract title",
    code: "Code",
    provider: "Provider",
    status: "Status",
    pricingModel: "Pricing model",
    startDate: "Start date",
    endDate: "End date",
    createdAt: "Created at",
    updatedAt: "Updated at",
    draft: "Draft",
    active: "Active",
    suspended: "Suspended",
    expired: "Expired",
    terminated: "Terminated",
    fixed: "Fixed",
    commission: "Commission",
    percentage: "Percentage",
    discount: "Discount",
    mixed: "Mixed",
    other: "Other",
    products: "Products",
    activeProducts: "Active products",
    featuredOffers: "Featured offers",
    landingOffers: "Landing visibility",
    mobileOffers: "Mobile visibility",
    offersPage: "Offers page",
    highestDiscount: "Highest discount",
    systemCommission: "System commission",
    priceBefore: "Before discount",
    priceAfter: "After discount",
    product: "Product",
    type: "Type",
    category: "Category",
    productStatus: "Offer status",
    offerTitle: "Offer title",
    offerBadge: "Offer badge",
    offerPeriod: "Offer period",
    priority: "Priority",
    usageLimit: "Usage limit",
    yes: "Yes",
    no: "No",
    enabled: "Enabled",
    disabled: "Disabled",
    unknown: "Unknown",
    openProvider: "Open provider",
    openProduct: "Open product",
    noProductsTitle: "No product offers",
    noProductsDesc: "Contract products will appear here once added.",
    confirmActivate: "Do you want to activate this contract?",
    confirmSuspend: "Do you want to suspend this contract?",
    confirmTerminate: "Do you want to terminate this contract?",
    confirmExpire: "Do you want to mark this contract as expired?",
    actionSuccess: "Contract status updated successfully.",
    saveSuccess: "Contract data saved.",
    operationFailed: "Unable to complete operation.",
    errorTitle: "Unable to load contract details",
    errorDesc: "Make sure the backend is running, then try again.",
    notFoundTitle: "Contract not found",
    notFoundDesc: "The requested contract could not be found.",
    tryAgain: "Try again",
    requiredNumber: "Contract number or title is required.",
    printTitle: "Contract report",
    generatedAt: "Generated at",
    internalNotes: "Internal notes",
    dateRange: "Contract period",
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

function dateInputValue(value: string | null | undefined) {
  if (!value) return "";
  return formatDate(value) === "—" ? "" : formatDate(value);
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
    method?: "GET" | "PATCH" | "POST" | "DELETE";
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
      ...(options?.method && options.method !== "GET" && options.method !== "DELETE"
        ? { "Content-Type": "application/json" }
        : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method && options.method !== "GET" && options.method !== "DELETE"
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

function extractContractPayload(payload: ContractApiResponse): unknown {
  const data = asRecord(payload.data);

  if (data.contract) return data.contract;
  if (payload.contract) return payload.contract;
  if (data.id || data.contract_number || data.provider) return data;

  return payload;
}

function normalizeContractProduct(value: unknown): ContractProductRecord {
  const item = asRecord(value);
  const product = asRecord(item.product);
  const category = asRecord(product.category);

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
    product_name_ar: normalizeText(item.product_name_ar || product.name_ar),
    product_name_en: normalizeText(item.product_name_en || product.name_en),
    product_type: normalizeText(item.product_type || product.product_type || product.type),
    category_name: normalizeText(
      item.category_name ||
        category.name ||
        category.name_ar ||
        category.name_en,
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
    offer_subtitle: normalizeText(item.offer_subtitle || item.subtitle),
    offer_badge: normalizeText(item.offer_badge || item.badge),
    offer_description: normalizeText(item.offer_description || item.description),
    offer_terms: normalizeText(item.offer_terms || item.terms),
    offer_start_date: normalizeText(item.offer_start_date || item.start_date) || null,
    offer_end_date: normalizeText(item.offer_end_date || item.end_date) || null,
    marketing_image_url: normalizeText(item.marketing_image_url || item.image_url),
    priority: toNumber(item.priority),
    usage_limit: toNumber(item.usage_limit),
  };
}

function normalizeContract(value: unknown): ContractRecord {
  const item = asRecord(value);
  const provider = asRecord(item.provider);

  const products = asArray(
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
    products.reduce((max, product) => Math.max(max, product.discount_percentage), 0);

  const maxCommission =
    toNumber(item.max_system_commission_percentage) ||
    products.reduce(
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
    total_contract_products: toNumber(item.total_contract_products, products.length),
    active_contract_products: toNumber(
      item.active_contract_products,
      products.filter((product) => product.is_active).length,
    ),
    featured_contract_offers: toNumber(
      item.featured_contract_offers,
      products.filter((product) => product.is_featured).length,
    ),
    landing_contract_offers: toNumber(
      item.landing_contract_offers,
      products.filter((product) => product.show_on_landing).length,
    ),
    mobile_contract_offers: toNumber(
      item.mobile_contract_offers,
      products.filter((product) => product.show_on_mobile).length,
    ),
    offers_page_contract_offers: toNumber(
      item.offers_page_contract_offers,
      products.filter((product) => product.show_on_offers).length,
    ),
    max_discount_percentage: maxDiscount,
    max_system_commission_percentage: maxCommission,
    min_price_before_discount: toNumber(
      item.min_price_before_discount,
      products.length
        ? Math.min(...products.map((product) => product.price_before_discount || 0))
        : 0,
    ),
    max_price_after_discount: toNumber(
      item.max_price_after_discount,
      products.length
        ? Math.max(...products.map((product) => product.price_after_discount || 0))
        : 0,
    ),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
    contract_products: products,
  };
}

function contractToForm(contract: ContractRecord): FormState {
  return {
    contract_number: contract.contract_number,
    title: contract.title,
    code: contract.code,
    status: (contract.status || "DRAFT") as ContractStatus,
    pricing_model: (contract.pricing_model || "MIXED") as PricingModel,
    start_date: dateInputValue(contract.start_date),
    end_date: dateInputValue(contract.end_date),
    notes: contract.notes,
    internal_notes: contract.internal_notes,
  };
}

function buildPatchPayload(form: FormState) {
  return {
    contract_number: form.contract_number.trim(),
    title: form.title.trim(),
    code: form.code.trim(),
    status: form.status,
    pricing_model: form.pricing_model,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    notes: form.notes.trim(),
    internal_notes: form.internal_notes.trim(),
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
  if (normalized === "COMMISSION") return t.commission;
  if (normalized === "PERCENTAGE") return t.percentage;
  if (normalized === "DISCOUNT") return t.discount;
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

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-left text-sm font-medium text-foreground">
        {children || value || "—"}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[104px] px-6 py-5">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>

        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground">
          {value}
        </CardTitle>

        <CardAction>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function EmptyBlock({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="space-y-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="rounded-lg border bg-card shadow-none">
                <CardHeader className="min-h-[104px] px-6 py-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-28" />
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

export default function SystemContractDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const contractId = normalizeText(params?.id);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [contract, setContract] = React.useState<ContractRecord | null>(null);
  const [form, setForm] = React.useState<FormState | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState("");
  const [editMode, setEditMode] = React.useState(false);
  const [error, setError] = React.useState("");

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

  const loadContract = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!contractId) {
        setLoading(false);
        setError(t.notFoundDesc);
        return;
      }

      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const payload = await fetchJson<ContractApiResponse>(
          makeApiUrl(`/api/contracts/${contractId}/`),
          { signal: controller.signal },
        );

        const nextContract = normalizeContract(extractContractPayload(payload));

        setContract(nextContract.id ? nextContract : null);
        setForm(contractToForm(nextContract));
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setContract(null);
        setForm(null);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [contractId, t.errorDesc, t.notFoundDesc],
  );

  React.useEffect(() => {
    void loadContract();
  }, [loadContract]);

  function updateForm<T extends keyof FormState>(key: T, value: FormState[T]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function cancelEdit() {
    if (contract) {
      setForm(contractToForm(contract));
    }

    setEditMode(false);
  }

  function validate() {
    if (!form) return false;

    if (!form.contract_number.trim() && !form.title.trim()) {
      toast.error(t.requiredNumber);
      return false;
    }

    return true;
  }

  async function saveContract() {
    if (!form || !contract || !validate()) return;

    setSaving(true);
    setError("");

    try {
      const payload = await fetchJson<ContractApiResponse>(
        makeApiUrl(`/api/contracts/${contract.id}/`),
        {
          method: "PATCH",
          body: buildPatchPayload(form),
        },
      );

      const nextContract = normalizeContract(extractContractPayload(payload));

      setContract(nextContract);
      setForm(contractToForm(nextContract));
      setEditMode(false);
      toast.success(t.saveSuccess);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function runStatusAction(
    action: "activate" | "suspend" | "terminate" | "expire",
  ) {
    if (!contract) return;

    const confirmations = {
      activate: t.confirmActivate,
      suspend: t.confirmSuspend,
      terminate: t.confirmTerminate,
      expire: t.confirmExpire,
    };

    if (!window.confirm(confirmations[action])) return;

    setActionLoading(action);

    try {
      const payload = await fetchJson<ContractApiResponse>(
        makeApiUrl(`/api/contracts/${contract.id}/${action}/`),
        {
          method: "POST",
          body: {},
        },
      );

      const nextContract = normalizeContract(extractContractPayload(payload));

      setContract(nextContract);
      setForm(contractToForm(nextContract));
      toast.success(t.actionSuccess);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;

      toast.error(message);
    } finally {
      setActionLoading("");
    }
  }

  async function terminateByDelete() {
    if (!contract) return;
    if (!window.confirm(t.confirmTerminate)) return;

    setActionLoading("terminate");

    try {
      const payload = await fetchJson<ContractApiResponse>(
        makeApiUrl(`/api/contracts/${contract.id}/`),
        {
          method: "DELETE",
        },
      );

      const nextContract = normalizeContract(extractContractPayload(payload));

      setContract(nextContract);
      setForm(contractToForm(nextContract));
      toast.success(t.actionSuccess);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;

      toast.error(message);
    } finally {
      setActionLoading("");
    }
  }

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.operationFailed);
    }
  }

  function printPage() {
    if (!contract) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.operationFailed);
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)} - ${escapeHtml(contract.contract_number)}</title>
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
            h2 { margin: 18px 0 8px; font-size: 16px; }
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
              margin-bottom: 16px;
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
              <p>${escapeHtml(t.contractNumber)}: <strong>${escapeHtml(contract.contract_number)}</strong></p>
              <p>${escapeHtml(t.provider)}: ${escapeHtml(contract.provider_name || "—")}</p>
              <p>${escapeHtml(t.status)}: ${escapeHtml(getStatusLabel(contract.status, locale))}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.products)}</span><strong class="num">${escapeHtml(contract.total_contract_products)}</strong></div>
            <div class="box"><span>${escapeHtml(t.activeProducts)}</span><strong class="num">${escapeHtml(contract.active_contract_products)}</strong></div>
            <div class="box"><span>${escapeHtml(t.featuredOffers)}</span><strong class="num">${escapeHtml(contract.featured_contract_offers)}</strong></div>
            <div class="box"><span>${escapeHtml(t.highestDiscount)}</span><strong class="num">${escapeHtml(formatPercent(contract.max_discount_percentage))}</strong></div>
          </div>

          <h2>${escapeHtml(t.contractInfo)}</h2>
          <table>
            <tbody>
              <tr><th>${escapeHtml(t.contractTitle)}</th><td>${escapeHtml(contract.title || "—")}</td></tr>
              <tr><th>${escapeHtml(t.pricingModel)}</th><td>${escapeHtml(getPricingLabel(contract.pricing_model, locale))}</td></tr>
              <tr><th>${escapeHtml(t.startDate)}</th><td>${escapeHtml(formatDate(contract.start_date))}</td></tr>
              <tr><th>${escapeHtml(t.endDate)}</th><td>${escapeHtml(formatDate(contract.end_date))}</td></tr>
              <tr><th>${escapeHtml(t.notes)}</th><td>${escapeHtml(contract.notes || "—")}</td></tr>
            </tbody>
          </table>

          <h2>${escapeHtml(t.offers)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.product)}</th>
                <th>${escapeHtml(t.priceBefore)}</th>
                <th>${escapeHtml(t.discount)}</th>
                <th>${escapeHtml(t.priceAfter)}</th>
                <th>${escapeHtml(t.systemCommission)}</th>
                <th>${escapeHtml(t.visibility)}</th>
                <th>${escapeHtml(t.status)}</th>
              </tr>
            </thead>
            <tbody>
              ${
                contract.contract_products.length
                  ? contract.contract_products
                      .map(
                        (product) => `
                          <tr>
                            <td>${escapeHtml(product.product_name || product.offer_title || "—")}</td>
                            <td class="num">${escapeHtml(formatMoney(product.price_before_discount))}</td>
                            <td class="num">${escapeHtml(formatPercent(product.discount_percentage))}</td>
                            <td class="num">${escapeHtml(formatMoney(product.price_after_discount))}</td>
                            <td class="num">${escapeHtml(formatPercent(product.system_commission_percentage))}</td>
                            <td>${escapeHtml([
                              product.show_on_landing ? t.landingOffers : "",
                              product.show_on_mobile ? t.mobileOffers : "",
                              product.show_on_offers ? t.offersPage : "",
                            ].filter(Boolean).join(" / ") || "—")}</td>
                            <td>${escapeHtml(product.is_active ? t.enabled : t.disabled)}</td>
                          </tr>
                        `,
                      )
                      .join("")
                  : `<tr><td colspan="7">${escapeHtml(t.noProductsDesc)}</td></tr>`
              }
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
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !contract || !form) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 text-right">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>
        </div>

        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-red-200 bg-white">
              <TriangleAlert className="h-6 w-6 text-red-600" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-red-900">
                {error ? t.errorTitle : t.notFoundTitle}
              </p>
              <p className="text-sm text-red-700">{error || t.notFoundDesc}</p>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadContract()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayProvider = contract.provider_name_ar || contract.provider_name || contract.provider_name_en;
  const displayTitle = contract.title || contract.contract_number;

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
          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadContract({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => {
              setEditMode(true);
              setForm(contractToForm(contract));
            }}
          >
            <Pencil className="h-4 w-4" />
            {t.edit}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90">
                <MoreHorizontal className="h-4 w-4" />
                {t.actions}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
              <DropdownMenuItem onClick={() => void copyValue(contract.contract_number)}>
                <Copy className="h-4 w-4" />
                {t.copyNumber}
              </DropdownMenuItem>

              {displayProvider ? (
                <DropdownMenuItem onClick={() => void copyValue(displayProvider)}>
                  <Store className="h-4 w-4" />
                  {t.copyProvider}
                </DropdownMenuItem>
              ) : null}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => void runStatusAction("activate")}
                disabled={Boolean(actionLoading) || contract.status === "ACTIVE"}
              >
                {actionLoading === "activate" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {t.activate}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => void runStatusAction("suspend")}
                disabled={Boolean(actionLoading) || contract.status === "SUSPENDED"}
              >
                {actionLoading === "suspend" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TriangleAlert className="h-4 w-4" />
                )}
                {t.suspend}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => void runStatusAction("expire")}
                disabled={Boolean(actionLoading) || contract.status === "EXPIRED"}
              >
                {actionLoading === "expire" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t.expire}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => void terminateByDelete()}
                disabled={Boolean(actionLoading) || contract.status === "TERMINATED"}
              >
                {actionLoading === "terminate" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t.terminate}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-4 px-6 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
              <ShieldCheck className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate text-xl font-bold">
                {displayTitle}
              </CardTitle>
              <CardDescription className="truncate">
                {contract.contract_number}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={contract.status} locale={locale} />
              <Badge variant="outline" className="rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium">
                {getPricingLabel(contract.pricing_model, locale)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-2 px-6 pb-6">
            <InfoRow label={t.provider}>
              {contract.provider_id ? (
                <Link
                  href={`/system/providers/${contract.provider_id}`}
                  className="truncate hover:underline"
                >
                  {displayProvider || "—"}
                </Link>
              ) : (
                displayProvider || "—"
              )}
            </InfoRow>
            <InfoRow label={t.products} value={formatInteger(contract.total_contract_products)} />
            <InfoRow label={t.activeProducts} value={formatInteger(contract.active_contract_products)} />
            <InfoRow label={t.featuredOffers} value={formatInteger(contract.featured_contract_offers)} />
            <InfoRow label={t.highestDiscount} value={formatPercent(contract.max_discount_percentage)} />
            <InfoRow label={t.systemCommission} value={formatPercent(contract.max_system_commission_percentage)} />
            <InfoRow label={t.dateRange} value={`${formatDate(contract.start_date)} - ${formatDate(contract.end_date)}`} />

            <div className="grid gap-2 pt-3">
              {contract.provider_id ? (
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href={`/system/providers/${contract.provider_id}`}>
                    <Store className="h-4 w-4" />
                    {t.openProvider}
                  </Link>
                </Button>
              ) : null}

              <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
                <Printer className="h-4 w-4" />
                {t.print}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title={t.products}
              value={formatInteger(contract.total_contract_products)}
              icon={Layers3}
            />
            <MetricCard
              title={t.activeProducts}
              value={formatInteger(contract.active_contract_products)}
              icon={CheckCircle2}
            />
            <MetricCard
              title={t.landingOffers}
              value={formatInteger(contract.landing_contract_offers)}
              icon={Sparkles}
            />
            <MetricCard
              title={t.highestDiscount}
              value={formatPercent(contract.max_discount_percentage)}
              icon={BadgePercent}
            />
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardContent className="p-4">
                <TabsList className="h-auto flex-wrap justify-start rounded-lg bg-muted/40 p-1">
                  <TabsTrigger value="overview" className="rounded-md">
                    <Eye className="h-4 w-4" />
                    {t.overview}
                  </TabsTrigger>
                  <TabsTrigger value="offers" className="rounded-md">
                    <Layers3 className="h-4 w-4" />
                    {t.offers}
                  </TabsTrigger>
                  <TabsTrigger value="visibility" className="rounded-md">
                    <Sparkles className="h-4 w-4" />
                    {t.visibility}
                  </TabsTrigger>
                  <TabsTrigger value="edit" className="rounded-md">
                    <Pencil className="h-4 w-4" />
                    {t.editTab}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="rounded-md">
                    <CalendarDays className="h-4 w-4" />
                    {t.activity}
                  </TabsTrigger>
                </TabsList>
              </CardContent>
            </Card>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.contractInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.contractNumber} value={contract.contract_number} />
                    <InfoRow label={t.contractTitle} value={contract.title || "—"} />
                    <InfoRow label={t.code} value={contract.code || "—"} />
                    <InfoRow label={t.status}>
                      <StatusBadge status={contract.status} locale={locale} />
                    </InfoRow>
                    <InfoRow label={t.pricingModel} value={getPricingLabel(contract.pricing_model, locale)} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.providerInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.provider}>
                      {contract.provider_id ? (
                        <Link
                          href={`/system/providers/${contract.provider_id}`}
                          className="truncate hover:underline"
                        >
                          {displayProvider || "—"}
                        </Link>
                      ) : (
                        displayProvider || "—"
                      )}
                    </InfoRow>
                    <InfoRow label={t.startDate} value={formatDate(contract.start_date)} />
                    <InfoRow label={t.endDate} value={formatDate(contract.end_date)} />
                    <InfoRow label={t.createdAt} value={formatDate(contract.created_at)} />
                    <InfoRow label={t.updatedAt} value={formatDate(contract.updated_at)} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.pricingInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.priceBefore}>
                      <MoneyValue value={contract.min_price_before_discount} />
                    </InfoRow>
                    <InfoRow label={t.priceAfter}>
                      <MoneyValue value={contract.max_price_after_discount} />
                    </InfoRow>
                    <InfoRow label={t.highestDiscount} value={formatPercent(contract.max_discount_percentage)} />
                    <InfoRow label={t.systemCommission} value={formatPercent(contract.max_system_commission_percentage)} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.notes}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <div className="min-h-[178px] rounded-lg border bg-background p-4">
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {contract.notes || t.noNotes}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="offers" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardContent className="p-4">
                  <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[1180px] table-fixed">
                        <TableHeader>
                          <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-[230px] px-4 text-right">{t.product}</TableHead>
                            <TableHead className="w-[120px] px-4 text-right">{t.type}</TableHead>
                            <TableHead className="w-[120px] px-4 text-right">{t.priceBefore}</TableHead>
                            <TableHead className="w-[105px] px-4 text-right">{t.discount}</TableHead>
                            <TableHead className="w-[120px] px-4 text-right">{t.priceAfter}</TableHead>
                            <TableHead className="w-[110px] px-4 text-right">{t.systemCommission}</TableHead>
                            <TableHead className="w-[160px] px-4 text-right">{t.offerPeriod}</TableHead>
                            <TableHead className="w-[110px] px-4 text-right">{t.productStatus}</TableHead>
                            <TableHead className="w-[80px] px-4 text-center">{t.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contract.contract_products.length ? (
                            contract.contract_products.map((product) => (
                              <TableRow key={product.id || product.product_name} className="h-[62px]">
                                <TableCell className="px-4 text-right">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                                      <Layers3 className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold">
                                        {product.offer_title || product.product_name || "—"}
                                      </p>
                                      <p className="truncate text-xs text-muted-foreground">
                                        {product.offer_badge || product.category_name || product.product_name_en || "—"}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 text-right">
                                  <Badge variant="outline" className="rounded-full bg-muted/40">
                                    {product.product_type || t.unknown}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-4 text-right">
                                  <MoneyValue value={product.price_before_discount} />
                                </TableCell>
                                <TableCell className="px-4 text-right">
                                  <Badge
                                    variant="outline"
                                    className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                  >
                                    {formatPercent(product.discount_percentage)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-4 text-right">
                                  <MoneyValue value={product.price_after_discount} />
                                </TableCell>
                                <TableCell className="px-4 text-right">
                                  {formatPercent(product.system_commission_percentage)}
                                </TableCell>
                                <TableCell className="px-4 text-right">
                                  <div className="space-y-0.5 text-xs tabular-nums text-muted-foreground">
                                    <p>{formatDate(product.offer_start_date)}</p>
                                    <p>{formatDate(product.offer_end_date)}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 text-right">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "rounded-full px-2.5 py-1 text-xs font-medium",
                                      product.is_active
                                        ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                                        : "border-muted bg-muted/40 text-muted-foreground",
                                    )}
                                  >
                                    {product.is_active ? t.enabled : t.disabled}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-4 text-center">
                                  {product.product_id ? (
                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                      <Link href={`/system/products/${product.product_id}`}>
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={9}>
                                <EmptyBlock
                                  icon={Layers3}
                                  title={t.noProductsTitle}
                                  description={t.noProductsDesc}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visibility" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.visibility}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.landingOffers} value={formatInteger(contract.landing_contract_offers)} />
                    <InfoRow label={t.mobileOffers} value={formatInteger(contract.mobile_contract_offers)} />
                    <InfoRow label={t.offersPage} value={formatInteger(contract.offers_page_contract_offers)} />
                    <InfoRow label={t.featuredOffers} value={formatInteger(contract.featured_contract_offers)} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.offers}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 px-5 pb-5">
                    {contract.contract_products.length ? (
                      contract.contract_products.slice(0, 8).map((product) => (
                        <div
                          key={`${product.id}-${product.product_name}`}
                          className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {product.offer_title || product.product_name || "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[
                                product.show_on_landing ? t.landingOffers : "",
                                product.show_on_mobile ? t.mobileOffers : "",
                                product.show_on_offers ? t.offersPage : "",
                              ]
                                .filter(Boolean)
                                .join(" / ") || "—"}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-medium",
                              product.is_featured
                                ? "border-amber-500/30 bg-amber-50 text-amber-700"
                                : "border-muted bg-muted/40 text-muted-foreground",
                            )}
                          >
                            {product.is_featured ? t.yes : t.no}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <EmptyBlock
                        icon={Sparkles}
                        title={t.noProductsTitle}
                        description={t.noProductsDesc}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="edit" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="text-base">{t.edit}</CardTitle>
                      <CardDescription>{contract.contract_number}</CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {editMode ? (
                        <>
                          <Button
                            variant="outline"
                            className="h-9 rounded-lg"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            <X className="h-4 w-4" />
                            {t.cancelEdit}
                          </Button>

                          <Button
                            className="h-9 rounded-lg bg-black text-white hover:bg-black/90"
                            onClick={() => void saveContract()}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {t.save}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          className="h-9 rounded-lg"
                          onClick={() => setEditMode(true)}
                        >
                          <Pencil className="h-4 w-4" />
                          {t.edit}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 px-5 pb-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <FieldLabel>{t.contractNumber}</FieldLabel>
                      <Input
                        value={form.contract_number}
                        onChange={(event) => updateForm("contract_number", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.code}</FieldLabel>
                      <Input
                        value={form.code}
                        onChange={(event) => updateForm("code", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <FieldLabel>{t.contractTitle}</FieldLabel>
                      <Input
                        value={form.title}
                        onChange={(event) => updateForm("title", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.status}</FieldLabel>
                      <Select
                        value={form.status}
                        disabled={!editMode || saving}
                        onValueChange={(value) => updateForm("status", value as ContractStatus)}
                      >
                        <SelectTrigger className="h-10 rounded-lg bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">{t.draft}</SelectItem>
                          <SelectItem value="ACTIVE">{t.active}</SelectItem>
                          <SelectItem value="SUSPENDED">{t.suspended}</SelectItem>
                          <SelectItem value="EXPIRED">{t.expired}</SelectItem>
                          <SelectItem value="TERMINATED">{t.terminated}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.pricingModel}</FieldLabel>
                      <Select
                        value={form.pricing_model}
                        disabled={!editMode || saving}
                        onValueChange={(value) => updateForm("pricing_model", value as PricingModel)}
                      >
                        <SelectTrigger className="h-10 rounded-lg bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIXED">{t.fixed}</SelectItem>
                          <SelectItem value="COMMISSION">{t.commission}</SelectItem>
                          <SelectItem value="PERCENTAGE">{t.percentage}</SelectItem>
                          <SelectItem value="DISCOUNT">{t.discount}</SelectItem>
                          <SelectItem value="MIXED">{t.mixed}</SelectItem>
                          <SelectItem value="OTHER">{t.other}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.startDate}</FieldLabel>
                      <Input
                        type="date"
                        value={form.start_date}
                        onChange={(event) => updateForm("start_date", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.endDate}</FieldLabel>
                      <Input
                        type="date"
                        value={form.end_date}
                        onChange={(event) => updateForm("end_date", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <FieldLabel>{t.notes}</FieldLabel>
                      <textarea
                        value={form.notes}
                        onChange={(event) => updateForm("notes", event.target.value)}
                        disabled={!editMode || saving}
                        className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <FieldLabel>{t.internalNotes}</FieldLabel>
                      <textarea
                        value={form.internal_notes}
                        onChange={(event) => updateForm("internal_notes", event.target.value)}
                        disabled={!editMode || saving}
                        className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-base">{t.activity}</CardTitle>
                  <CardDescription>{contract.contract_number}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-5">
                  {[
                    {
                      label: t.createdAt,
                      value: formatDate(contract.created_at),
                      icon: ShieldCheck,
                    },
                    {
                      label: t.updatedAt,
                      value: formatDate(contract.updated_at),
                      icon: RefreshCw,
                    },
                    {
                      label: t.products,
                      value: formatInteger(contract.total_contract_products),
                      icon: Layers3,
                    },
                    {
                      label: t.featuredOffers,
                      value: formatInteger(contract.featured_contract_offers),
                      icon: Sparkles,
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="truncate font-medium">{item.label}</p>
                        </div>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}