"use client";

/* ============================================================
   📂 app/system/products/[id]/page.tsx
   🧭 Primey Care — Product Detail Premium Page
   ------------------------------------------------------------
   ✅ Premium paid-style product detail
   ✅ Real product data from /api/products/{id}/
   ✅ Real orders count from /api/orders/
   ✅ Full detailed Web Print report
   ✅ PATCH update in same page
   ✅ Upload thumbnail / marketing image
   ✅ Product image gallery
   ✅ KPI cards + description + all details
   ✅ Arabic / English
   ✅ RTL / LTR
   ✅ English numerals
   ✅ SAR icon from /currency/sar.svg
   ✅ Sonner toast
   ✅ Permission-aware actions
   ✅ No localhost
   ============================================================ */

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  Box,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Edit3,
  FileText,
  HandCoins,
  ImagePlus,
  Layers2,
  Layers3,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  Save,
  ShoppingCart,
  Sparkles,
  Store,
  TriangleAlert,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

/* ============================================================
   Types
   ============================================================ */

type Locale = "ar" | "en";

type ProductCategory = {
  id?: number | string;
  name?: string;
  name_ar?: string;
  name_en?: string;
  title?: string;
};

type ProductProvider = {
  id?: number | string;
  name?: string;
  name_ar?: string;
  name_en?: string;
  title?: string;
  city?: string;
  region?: string;
};

type ProductBenefit =
  | string
  | {
      id?: number | string;
      title?: string;
      title_ar?: string;
      title_en?: string;
      name?: string;
      name_ar?: string;
      name_en?: string;
      description?: string;
      description_ar?: string;
      description_en?: string;
    };

type PricingTier = {
  id?: number | string;
  name?: string;
  name_ar?: string;
  name_en?: string;
  price?: string | number | null;
  sale_price?: string | number | null;
  duration_days?: string | number | null;
};

type ServiceItem = {
  id?: number | string;
  name?: string;
  name_ar?: string;
  name_en?: string;
  title?: string;
  title_ar?: string;
  title_en?: string;
  quantity?: string | number | null;
};

type ProductRecord = {
  id: number | string;
  name?: string;
  name_ar?: string;
  name_en?: string;
  title?: string;
  code?: string;
  sku?: string;
  slug?: string;

  description?: string;
  description_ar?: string;
  description_en?: string;

  product_type?: string;
  type?: string;
  status?: string;

  category?: ProductCategory | string | null;
  category_name?: string;

  provider?: ProductProvider | string | null;
  provider_name?: string;

  price?: string | number | null;
  sale_price?: string | number | null;
  final_price?: string | number | null;
  base_price?: string | number | null;
  price_before_discount?: string | number | null;
  price_after_discount?: string | number | null;

  discount_percentage?: string | number | null;
  highest_discount_percent?: string | number | null;
  highest_product_discount_percent?: string | number | null;
  highest_contract_discount_percent?: string | number | null;

  active_contracts_count?: number | string | null;
  contracted_products_count?: number | string | null;

  orders_count?: number | string | null;
  order_count?: number | string | null;
  total_orders?: number | string | null;

  is_public?: boolean;
  is_featured?: boolean;
  is_offer?: boolean;
  allow_online_purchase?: boolean;
  show_on_landing?: boolean;
  show_on_mobile?: boolean;
  show_on_offers?: boolean;

  offer_title?: string;
  offer_subtitle?: string;
  offer_badge?: string;
  offer_terms?: string;
  offer_start_date?: string;
  offer_end_date?: string;

  valid_from?: string | null;
  valid_until?: string | null;

  thumbnail_image_url?: string;
  thumbnail_image_alt_text?: string;
  thumbnail_image_drive_view_url?: string;
  marketing_image_url?: string;
  marketing_image_alt_text?: string;
  marketing_image_drive_view_url?: string;
  image_url?: string;
  image?: string;

  benefits?: ProductBenefit[];
  pricing_tiers?: PricingTier[];
  service_items?: ServiceItem[];

  created_at?: string;
  updated_at?: string;
};

type ProductApiResponse = {
  ok?: boolean;
  message?: string;
  data?: ProductRecord;
  result?: ProductRecord;
  product?: ProductRecord;
};

type OrdersApiResponse = {
  ok?: boolean;
  results?: unknown[];
  items?: unknown[];
  data?: unknown[] | { results?: unknown[]; items?: unknown[] };
  pagination?: {
    total?: number;
    count?: number;
  };
  summary?: {
    total_orders?: number;
    orders_count?: number;
  };
  count?: number;
  total?: number;
};

type WhoamiPayload = {
  role?: string;
  user_type?: string;
  workspace?: string;
  is_superuser?: boolean;
  is_staff?: boolean;
  permission_codes?: string[];
  permissions?: { codes?: string[] };
  profile_permissions?: { codes?: string[] };
  profile?: {
    role?: string;
    user_type?: string;
    workspace?: string;
    permission_codes?: string[];
    permissions?: { codes?: string[] };
  };
};

type DraftState = {
  name_ar: string;
  name_en: string;
  code: string;
  status: string;
  product_type: string;
  price: string;
  sale_price: string;
  description: string;
  is_public: boolean;
  is_featured: boolean;
  is_offer: boolean;
  allow_online_purchase: boolean;
  show_on_landing: boolean;
  show_on_mobile: boolean;
  show_on_offers: boolean;
};

/* ============================================================
   Constants
   ============================================================ */

const API_WHOAMI = "/api/auth/whoami/";
const API_PRODUCTS = "/api/products/";
const API_ORDERS = "/api/orders/";
const SAR_ICON = "/currency/sar.svg";

const translations = {
  ar: {
    back: "رجوع",
    list: "قائمة المنتجات",
    refresh: "تحديث",
    print: "طباعة",
    edit: "تعديل البيانات",
    cancel: "إلغاء",
    save: "حفظ التعديلات",
    saving: "جاري الحفظ...",
    uploadThumbnail: "رفع صورة المنتج",
    uploadMarketing: "رفع الصورة التسويقية",
    uploading: "جاري الرفع...",
    copied: "تم النسخ",
    updated: "تم حفظ بيانات المنتج",
    loaded: "تم تحديث المنتج",
    uploaded: "تم رفع الصورة بنجاح",
    noPermission: "لا تملك صلاحية تنفيذ هذا الإجراء",

    pageTitle: "تفاصيل المنتج",
    premiumBadge: "تفاصيل المنتج",
    productInfo: "معلومات المنتج",
    description: "الوصف",
    keyBenefits: "المميزات",
    serviceItems: "عناصر الخدمة",
    pricingTiers: "شرائح التسعير",
    visibility: "الظهور والتسويق",
    productData: "بيانات المنتج",
    images: "صور المنتج",
    thumbnail: "الصورة الرئيسية",
    marketingImage: "الصورة التسويقية",
    fullPrintReport: "تقرير تفاصيل المنتج",

    price: "السعر",
    salePrice: "سعر البيع",
    basePrice: "السعر الأساسي",
    discount: "الخصم",
    contracts: "العقود",
    ordersCount: "طلبات المنتج",
    openProductOrders: "عرض طلبات المنتج",
    type: "النوع",
    status: "الحالة",
    category: "التصنيف",
    provider: "مقدم الخدمة",
    code: "الكود",
    createdAt: "تاريخ الإضافة",
    updatedAt: "آخر تحديث",
    validFrom: "بداية الصلاحية",
    validUntil: "نهاية الصلاحية",

    nameAr: "اسم المنتج عربي",
    nameEn: "اسم المنتج إنجليزي",
    productType: "نوع المنتج",

    active: "نشط",
    draft: "مسودة",
    inactive: "غير نشط",
    archived: "مؤرشف",

    card: "بطاقة",
    program: "برنامج",
    service: "خدمة",
    membership: "عضوية",

    public: "عام",
    featured: "مميز",
    offer: "عرض",
    onlinePurchase: "شراء إلكتروني",
    landing: "صفحة الهبوط",
    mobile: "الموبايل",
    offers: "صفحة العروض",

    yes: "نعم",
    no: "لا",

    noProduct: "لم يتم العثور على المنتج",
    noProductDesc: "المنتج غير موجود أو لا يمكن الوصول إليه.",
    errorTitle: "تعذر تحميل المنتج",
    retry: "إعادة المحاولة",
    noDescription: "لا يوجد وصف مسجل لهذا المنتج.",
    noBenefits: "لا توجد مميزات مسجلة.",
    noServiceItems: "لا توجد عناصر خدمة.",
    noPricingTiers: "لا توجد شرائح تسعير.",
    noProvider: "بدون مقدم خدمة",
    noCategory: "بدون تصنيف",
    noCode: "بدون كود",
    noImage: "لا توجد صورة",
    notAvailable: "غير محدد",
    durationDays: "مدة الأيام",
    quantity: "الكمية",
  },
  en: {
    back: "Back",
    list: "Product List",
    refresh: "Refresh",
    print: "Print",
    edit: "Edit Details",
    cancel: "Cancel",
    save: "Save Changes",
    saving: "Saving...",
    uploadThumbnail: "Upload Product Image",
    uploadMarketing: "Upload Marketing Image",
    uploading: "Uploading...",
    copied: "Copied",
    updated: "Product updated",
    loaded: "Product refreshed",
    uploaded: "Image uploaded successfully",
    noPermission: "You do not have permission to perform this action",

    pageTitle: "Product Details",
    premiumBadge: "Product Details",
    productInfo: "Product Information",
    description: "Description",
    keyBenefits: "Key Benefits",
    serviceItems: "Service Items",
    pricingTiers: "Pricing Tiers",
    visibility: "Visibility & Marketing",
    productData: "Product Data",
    images: "Product Images",
    thumbnail: "Thumbnail Image",
    marketingImage: "Marketing Image",
    fullPrintReport: "Product Detail Report",

    price: "Price",
    salePrice: "Sale Price",
    basePrice: "Base Price",
    discount: "Discount",
    contracts: "Contracts",
    ordersCount: "Product Orders",
    openProductOrders: "View Product Orders",
    type: "Type",
    status: "Status",
    category: "Category",
    provider: "Provider",
    code: "Code",
    createdAt: "Created At",
    updatedAt: "Updated At",
    validFrom: "Valid From",
    validUntil: "Valid Until",

    nameAr: "Arabic Name",
    nameEn: "English Name",
    productType: "Product Type",

    active: "Active",
    draft: "Draft",
    inactive: "Inactive",
    archived: "Archived",

    card: "Card",
    program: "Program",
    service: "Service",
    membership: "Membership",

    public: "Public",
    featured: "Featured",
    offer: "Offer",
    onlinePurchase: "Online Purchase",
    landing: "Landing",
    mobile: "Mobile",
    offers: "Offers Page",

    yes: "Yes",
    no: "No",

    noProduct: "Product not found",
    noProductDesc: "The product does not exist or cannot be accessed.",
    errorTitle: "Unable to load product",
    retry: "Retry",
    noDescription: "No description is available for this product.",
    noBenefits: "No benefits are available.",
    noServiceItems: "No service items are available.",
    noPricingTiers: "No pricing tiers are available.",
    noProvider: "No provider",
    noCategory: "No category",
    noCode: "No code",
    noImage: "No image",
    notAvailable: "Not available",
    durationDays: "Duration days",
    quantity: "Quantity",
  },
} as const;

/* ============================================================
   Helpers
   ============================================================ */

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function toEnglishDigits(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function toNumber(value: string | number | null | undefined) {
  const numeric = Number(toEnglishDigits(value ?? 0));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatNumber(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatMoney(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatPercent(value: string | number | null | undefined) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(toNumber(value))}%`;
}

function formatDate(value: string | null | undefined, locale: Locale) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getProductFromPayload(payload: ProductApiResponse): ProductRecord | null {
  return payload.data || payload.result || payload.product || null;
}

function getProductName(product: ProductRecord | null, locale: Locale) {
  if (!product) return "—";

  return (
    (locale === "ar"
      ? product.name_ar || product.name || product.title || product.name_en
      : product.name_en || product.name || product.title || product.name_ar) || "—"
  );
}

function getDescription(product: ProductRecord | null, locale: Locale) {
  if (!product) return "";

  return (
    (locale === "ar"
      ? product.description_ar || product.description || product.description_en
      : product.description_en || product.description || product.description_ar) || ""
  );
}

function getCategoryName(product: ProductRecord | null, locale: Locale, fallback: string) {
  if (!product) return fallback;

  if (typeof product.category === "string") return product.category;

  if (product.category && typeof product.category === "object") {
    return (
      (locale === "ar"
        ? product.category.name_ar ||
          product.category.name ||
          product.category.title ||
          product.category.name_en
        : product.category.name_en ||
          product.category.name ||
          product.category.title ||
          product.category.name_ar) || fallback
    );
  }

  return product.category_name || fallback;
}

function getProviderName(product: ProductRecord | null, locale: Locale, fallback: string) {
  if (!product) return fallback;

  if (typeof product.provider === "string") return product.provider;

  if (product.provider && typeof product.provider === "object") {
    return (
      (locale === "ar"
        ? product.provider.name_ar ||
          product.provider.name ||
          product.provider.title ||
          product.provider.name_en
        : product.provider.name_en ||
          product.provider.name ||
          product.provider.title ||
          product.provider.name_ar) || fallback
    );
  }

  return product.provider_name || fallback;
}

function getProductStatus(product: ProductRecord | null) {
  return normalizeText(product?.status || "draft");
}

function getProductType(product: ProductRecord | null) {
  return normalizeText(product?.product_type || product?.type || "service");
}

function getProductPrice(product: ProductRecord | null) {
  return (
    product?.final_price ??
    product?.price_after_discount ??
    product?.sale_price ??
    product?.price ??
    product?.base_price ??
    product?.price_before_discount ??
    0
  );
}

function getBasePrice(product: ProductRecord | null) {
  return product?.base_price ?? product?.price_before_discount ?? product?.price ?? 0;
}

function getSalePrice(product: ProductRecord | null) {
  return (
    product?.sale_price ??
    product?.price_after_discount ??
    product?.final_price ??
    product?.price ??
    0
  );
}

function getProductDiscount(product: ProductRecord | null) {
  return (
    product?.highest_discount_percent ??
    product?.highest_product_discount_percent ??
    product?.highest_contract_discount_percent ??
    product?.discount_percentage ??
    0
  );
}

function getProductContractsCount(product: ProductRecord | null) {
  if (!product) return 0;

  return (
    Number(product.active_contracts_count || 0) ||
    Number(product.contracted_products_count || 0)
  );
}

function getProductOrdersCount(product: ProductRecord | null, fallbackCount: number) {
  if (!product) return fallbackCount;

  return (
    Number(product.orders_count || 0) ||
    Number(product.order_count || 0) ||
    Number(product.total_orders || 0) ||
    fallbackCount
  );
}

function getOrdersTotalFromPayload(payload: OrdersApiResponse) {
  if (typeof payload.pagination?.total === "number") return payload.pagination.total;
  if (typeof payload.pagination?.count === "number") return payload.pagination.count;
  if (typeof payload.summary?.total_orders === "number") return payload.summary.total_orders;
  if (typeof payload.summary?.orders_count === "number") return payload.summary.orders_count;
  if (typeof payload.count === "number") return payload.count;
  if (typeof payload.total === "number") return payload.total;

  if (Array.isArray(payload.results)) return payload.results.length;
  if (Array.isArray(payload.items)) return payload.items.length;
  if (Array.isArray(payload.data)) return payload.data.length;

  if (payload.data && !Array.isArray(payload.data)) {
    if (Array.isArray(payload.data.results)) return payload.data.results.length;
    if (Array.isArray(payload.data.items)) return payload.data.items.length;
  }

  return 0;
}

function getImages(product: ProductRecord | null) {
  if (!product) return [];

  const images = [
    product.thumbnail_image_url,
    product.thumbnail_image_drive_view_url,
    product.marketing_image_url,
    product.marketing_image_drive_view_url,
    product.image_url,
    product.image,
  ].filter(Boolean) as string[];

  return Array.from(new Set(images));
}

function getBenefitTitle(item: ProductBenefit, locale: Locale) {
  if (typeof item === "string") return item;

  return (
    (locale === "ar"
      ? item.title_ar || item.name_ar || item.title || item.name || item.title_en || item.name_en
      : item.title_en || item.name_en || item.title || item.name || item.title_ar || item.name_ar) || "—"
  );
}

function getBenefitDescription(item: ProductBenefit, locale: Locale) {
  if (typeof item === "string") return "";

  return (
    (locale === "ar"
      ? item.description_ar || item.description || item.description_en
      : item.description_en || item.description || item.description_ar) || ""
  );
}

function getPricingName(item: PricingTier, locale: Locale) {
  return (
    (locale === "ar"
      ? item.name_ar || item.name || item.name_en
      : item.name_en || item.name || item.name_ar) || "—"
  );
}

function getServiceItemName(item: ServiceItem, locale: Locale) {
  return (
    (locale === "ar"
      ? item.name_ar || item.title_ar || item.name || item.title || item.name_en || item.title_en
      : item.name_en || item.title_en || item.name || item.title || item.name_ar || item.title_ar) || "—"
  );
}

function getPermissionCodes(payload: WhoamiPayload | null) {
  if (!payload) return [];

  return Array.from(
    new Set(
      [
        ...(payload.permission_codes || []),
        ...(payload.permissions?.codes || []),
        ...(payload.profile_permissions?.codes || []),
        ...(payload.profile?.permission_codes || []),
        ...(payload.profile?.permissions?.codes || []),
      ].filter(Boolean),
    ),
  );
}

function isAdminLike(payload: WhoamiPayload | null) {
  if (!payload) return false;

  const role = normalizeText(payload.role || payload.profile?.role);
  const userType = normalizeText(payload.user_type || payload.profile?.user_type);

  return Boolean(
    payload.is_superuser ||
      role === "system_admin" ||
      role === "superuser" ||
      userType === "system_admin" ||
      userType === "superuser",
  );
}

function hasPermission(payload: WhoamiPayload | null, permission: string) {
  if (isAdminLike(payload)) return true;
  return getPermissionCodes(payload).includes(permission);
}

function getApiBaseUrl() {
  const envBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

  if (!envBase) return "";

  return envBase.replace(/\/+$/, "");
}

function buildApiUrl(path: string) {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${base}${cleanPath}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) return parts.pop()?.split(";").shift() || "";

  return "";
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(init?.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  let payload: any = null;

  if (contentType.includes("application/json") && text) {
    try {
      payload = JSON.parse(text);
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

function buildDraft(product: ProductRecord): DraftState {
  return {
    name_ar: product.name_ar || product.name || "",
    name_en: product.name_en || "",
    code: product.code || product.sku || "",
    status: getProductStatus(product),
    product_type: getProductType(product),
    price: String(product.price ?? product.base_price ?? ""),
    sale_price: String(product.sale_price ?? product.final_price ?? ""),
    description: product.description || product.description_ar || product.description_en || "",
    is_public: Boolean(product.is_public),
    is_featured: Boolean(product.is_featured),
    is_offer: Boolean(product.is_offer),
    allow_online_purchase: Boolean(product.allow_online_purchase),
    show_on_landing: Boolean(product.show_on_landing),
    show_on_mobile: Boolean(product.show_on_mobile),
    show_on_offers: Boolean(product.show_on_offers),
  };
}

function localizedStatus(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(status);

  if (normalized === "active") return t.active;
  if (normalized === "draft") return t.draft;
  if (normalized === "inactive") return t.inactive;
  return t.archived;
}

function localizedType(type: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(type);

  if (normalized === "card") return t.card;
  if (normalized === "program") return t.program;
  if (normalized === "membership") return t.membership;
  return t.service;
}

function yesNo(value: boolean, locale: Locale) {
  const t = translations[locale];
  return value ? t.yes : t.no;
}

/* ============================================================
   UI Components
   ============================================================ */

function SarIcon({ className }: { className?: string }) {
  return (
    <img
      src={SAR_ICON}
      alt="SAR"
      className={cn("inline-flex h-3.5 w-3.5 shrink-0 object-contain", className)}
    />
  );
}

function MoneyValue({
  value,
  className,
}: {
  value: string | number | null | undefined;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", className)}>
      <span>{formatMoney(value)}</span>
      <SarIcon />
    </span>
  );
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  const normalized = normalizeText(status);
  const label = localizedStatus(status, locale);

  if (normalized === "active") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-600 hover:bg-emerald-50">
        {label}
      </Badge>
    );
  }

  if (normalized === "draft") {
    return (
      <Badge className="rounded-full border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-600 hover:bg-amber-50">
        {label}
      </Badge>
    );
  }

  if (normalized === "inactive") {
    return (
      <Badge className="rounded-full border-orange-200 bg-orange-50 px-2.5 py-1 text-orange-600 hover:bg-orange-50">
        {label}
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-600 hover:bg-rose-50">
      {label}
    </Badge>
  );
}

function TypeBadge({ type, locale }: { type: string; locale: Locale }) {
  return (
    <Badge variant="outline" className="rounded-full px-2.5 py-1">
      {localizedType(type, locale)}
    </Badge>
  );
}

function BooleanChip({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-500",
      )}
    >
      {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  href,
  hint,
  tone,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  hint?: string;
  tone?: string;
}) {
  const content = (
    <div
      className={cn(
        "grid auto-cols-max grid-flow-col items-center gap-4 rounded-lg border bg-white p-4 transition hover:border-primary/30",
        href ? "cursor-pointer hover:bg-muted/40" : "",
      )}
    >
      <Icon className={cn("size-6 opacity-70", tone || "text-muted-foreground")} />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span className="truncate text-lg font-semibold">{value}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function ProductsSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="xl:col-span-1">
        <div className="aspect-square animate-pulse rounded-lg bg-slate-100" />
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
      <div className="space-y-4 xl:col-span-2">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params?.id;

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [whoami, setWhoami] = React.useState<WhoamiPayload | null>(null);
  const [product, setProduct] = React.useState<ProductRecord | null>(null);
  const [draft, setDraft] = React.useState<DraftState | null>(null);

  const [selectedImage, setSelectedImage] = React.useState("");
  const [ordersCount, setOrdersCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [uploadingType, setUploadingType] = React.useState<"thumbnail" | "marketing" | "">("");
  const [error, setError] = React.useState("");
  const [editMode, setEditMode] = React.useState(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  const canView = hasPermission(whoami, "products.view") || !whoami;
  const canEdit =
    hasPermission(whoami, "products.edit") ||
    hasPermission(whoami, "products.update") ||
    isAdminLike(whoami) ||
    !whoami;
  const canUpload =
    hasPermission(whoami, "products.upload") ||
    hasPermission(whoami, "products.edit") ||
    hasPermission(whoami, "products.update") ||
    isAdminLike(whoami) ||
    !whoami;
  const canPrint =
    hasPermission(whoami, "products.print") || isAdminLike(whoami) || !whoami;

  React.useEffect(() => {
    const storedLocale =
      typeof window !== "undefined"
        ? window.localStorage.getItem("primey-locale")
        : null;

    const nextLocale: Locale = storedLocale === "en" ? "en" : "ar";

    setLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
  }, []);

  const loadOrdersCount = React.useCallback(
    async (currentProduct: ProductRecord) => {
      const productName = getProductName(currentProduct, locale);
      const fallback = getProductOrdersCount(currentProduct, 0);

      const queries = [
        `${API_ORDERS}?page=1&page_size=1&product_id=${encodeURIComponent(String(currentProduct.id))}`,
        `${API_ORDERS}?page=1&page_size=1&product=${encodeURIComponent(String(currentProduct.id))}`,
        currentProduct.code
          ? `${API_ORDERS}?page=1&page_size=1&search=${encodeURIComponent(String(currentProduct.code))}`
          : "",
        productName && productName !== "—"
          ? `${API_ORDERS}?page=1&page_size=1&search=${encodeURIComponent(productName)}`
          : "",
      ].filter(Boolean);

      for (const query of queries) {
        try {
          const payload = await fetchJson<OrdersApiResponse>(query);
          const total = getOrdersTotalFromPayload(payload);

          setOrdersCount(total || fallback);
          return;
        } catch {
          setOrdersCount(fallback);
        }
      }

      setOrdersCount(fallback);
    },
    [locale],
  );

  const loadProduct = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!productId) return;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const whoamiPayload = await fetchJson<WhoamiPayload>(API_WHOAMI).catch(
          () => null,
        );

        if (whoamiPayload) {
          setWhoami(whoamiPayload);
        }

        const payload = await fetchJson<ProductApiResponse>(
          `${API_PRODUCTS}${productId}/`,
        );

        const nextProduct = getProductFromPayload(payload);

        if (!nextProduct) {
          setProduct(null);
          setDraft(null);
          setOrdersCount(0);
          return;
        }

        setProduct(nextProduct);
        setDraft(buildDraft(nextProduct));
        setOrdersCount(getProductOrdersCount(nextProduct, 0));

        const images = getImages(nextProduct);
        setSelectedImage((current) => current || images[0] || "");

        void loadOrdersCount(nextProduct);

        if (silent) toast.success(t.loaded);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load product.";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadOrdersCount, productId, t.loaded],
  );

  React.useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const images = React.useMemo(() => getImages(product), [product]);
  const productName = getProductName(product, locale);
  const productDescription = getDescription(product, locale);
  const categoryName = getCategoryName(product, locale, t.noCategory);
  const providerName = getProviderName(product, locale, t.noProvider);
  const productType = getProductType(product);
  const productStatus = getProductStatus(product);
  const contractsCount = getProductContractsCount(product);
  const finalOrdersCount = getProductOrdersCount(product, ordersCount);

  const ordersHref = product
    ? `/system/orders/list?product_id=${encodeURIComponent(String(product.id))}&product=${encodeURIComponent(String(product.id))}&product_name=${encodeURIComponent(productName)}`
    : "/system/orders/list";

  const updateDraft = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((current) => {
      if (!current) return current;

      return {
        ...current,
        [key]: value,
      };
    });
  };

  const copyText = async (value: string) => {
    if (!value) return;

    await navigator.clipboard.writeText(value);
    toast.success(t.copied);
  };

  const saveProduct = async () => {
    if (!product || !draft || !productId) return;

    if (!canEdit) {
      toast.error(t.noPermission);
      return;
    }

    setSaving(true);

    try {
      const csrfToken = getCookie("csrftoken");

      const payload = await fetchJson<ProductApiResponse>(
        `${API_PRODUCTS}${productId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
          body: JSON.stringify({
            name_ar: draft.name_ar.trim(),
            name_en: draft.name_en.trim(),
            name: draft.name_ar.trim() || draft.name_en.trim(),
            code: draft.code.trim(),
            status: draft.status,
            product_type: draft.product_type,
            price: draft.price || "0",
            sale_price: draft.sale_price || draft.price || "0",
            description: draft.description.trim(),
            is_public: draft.is_public,
            is_featured: draft.is_featured,
            is_offer: draft.is_offer,
            allow_online_purchase: draft.allow_online_purchase,
            show_on_landing: draft.show_on_landing,
            show_on_mobile: draft.show_on_mobile,
            show_on_offers: draft.show_on_offers,
          }),
        },
      );

      const updatedProduct = getProductFromPayload(payload);

      if (updatedProduct) {
        setProduct(updatedProduct);
        setDraft(buildDraft(updatedProduct));
        setSelectedImage(getImages(updatedProduct)[0] || "");
        setOrdersCount(getProductOrdersCount(updatedProduct, ordersCount));
        void loadOrdersCount(updatedProduct);
      }

      setEditMode(false);
      toast.success(t.updated);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Unable to update product.";

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
    imageType: "thumbnail" | "marketing",
  ) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !productId) return;

    if (!canUpload) {
      toast.error(t.noPermission);
      return;
    }

    setUploadingType(imageType);

    try {
      const csrfToken = getCookie("csrftoken");
      const formData = new FormData();

      formData.append("file", file);
      formData.append("image_type", imageType);

      const payload = await fetchJson<ProductApiResponse>(
        `${API_PRODUCTS}${productId}/upload-image/`,
        {
          method: "POST",
          headers: {
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
          body: formData,
        },
      );

      const updatedProduct = getProductFromPayload(payload);

      if (updatedProduct) {
        setProduct(updatedProduct);
        setDraft(buildDraft(updatedProduct));
        setSelectedImage(getImages(updatedProduct)[0] || "");
        void loadOrdersCount(updatedProduct);
      }

      toast.success(t.uploaded);
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload image.";

      toast.error(message);
    } finally {
      setUploadingType("");
    }
  };

  const printProduct = () => {
    if (!product) return;

    if (!canPrint) {
      toast.error(t.noPermission);
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) return;

    const imageHtml = images[0]
      ? `<div class="image-box"><img src="${escapeHtml(images[0])}" alt="${escapeHtml(productName)}" /></div>`
      : `<div class="image-box image-empty">${escapeHtml(t.noImage)}</div>`;

    const visibilityRows = [
      [t.public, yesNo(Boolean(product.is_public), locale)],
      [t.featured, yesNo(Boolean(product.is_featured), locale)],
      [t.offer, yesNo(Boolean(product.is_offer), locale)],
      [t.onlinePurchase, yesNo(Boolean(product.allow_online_purchase), locale)],
      [t.landing, yesNo(Boolean(product.show_on_landing), locale)],
      [t.mobile, yesNo(Boolean(product.show_on_mobile), locale)],
      [t.offers, yesNo(Boolean(product.show_on_offers), locale)],
    ];

    const mainRows = [
      [t.price, `${formatMoney(getProductPrice(product))} SAR`],
      [t.salePrice, `${formatMoney(getSalePrice(product))} SAR`],
      [t.basePrice, `${formatMoney(getBasePrice(product))} SAR`],
      [t.discount, formatPercent(getProductDiscount(product))],
      [t.ordersCount, formatNumber(finalOrdersCount)],
      [t.contracts, formatNumber(contractsCount)],
      [t.category, categoryName],
      [t.provider, providerName],
      [t.type, localizedType(productType, locale)],
      [t.status, localizedStatus(productStatus, locale)],
      [t.code, product.code || product.sku || t.noCode],
      [t.createdAt, formatDate(product.created_at, locale)],
      [t.updatedAt, formatDate(product.updated_at, locale)],
      [t.validFrom, formatDate(product.valid_from, locale)],
      [t.validUntil, formatDate(product.valid_until, locale)],
    ];

    const benefitsHtml =
      product.benefits && product.benefits.length > 0
        ? product.benefits
            .map((benefit) => {
              const title = getBenefitTitle(benefit, locale);
              const desc = getBenefitDescription(benefit, locale);
              return `<li><strong>${escapeHtml(title)}</strong>${desc ? ` — ${escapeHtml(desc)}` : ""}</li>`;
            })
            .join("")
        : `<li>${escapeHtml(t.noBenefits)}</li>`;

    const tiersHtml =
      product.pricing_tiers && product.pricing_tiers.length > 0
        ? product.pricing_tiers
            .map(
              (tier) => `
                <tr>
                  <td>${escapeHtml(getPricingName(tier, locale))}</td>
                  <td>${escapeHtml(formatMoney(tier.sale_price ?? tier.price ?? 0))} SAR</td>
                  <td>${tier.duration_days ? escapeHtml(formatNumber(tier.duration_days)) : "—"}</td>
                </tr>
              `,
            )
            .join("")
        : `<tr><td colspan="3">${escapeHtml(t.noPricingTiers)}</td></tr>`;

    const serviceItemsHtml =
      product.service_items && product.service_items.length > 0
        ? product.service_items
            .map(
              (item) => `
                <tr>
                  <td>${escapeHtml(getServiceItemName(item, locale))}</td>
                  <td>${item.quantity ? escapeHtml(formatNumber(item.quantity)) : "—"}</td>
                </tr>
              `,
            )
            .join("")
        : `<tr><td colspan="2">${escapeHtml(t.noServiceItems)}</td></tr>`;

    const rowsHtml = mainRows
      .map(
        ([label, value]) => `
          <tr>
            <th>${escapeHtml(label)}</th>
            <td>${escapeHtml(value)}</td>
          </tr>
        `,
      )
      .join("");

    const visibilityHtml = visibilityRows
      .map(
        ([label, value]) => `
          <tr>
            <th>${escapeHtml(label)}</th>
            <td>${escapeHtml(value)}</td>
          </tr>
        `,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(productName)}</title>
          <style>
            @page {
              size: A4;
              margin: 14mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #ffffff;
              color: #111827;
              font-family: Arial, Tahoma, sans-serif;
              direction: ${dir};
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .page {
              width: 100%;
              max-width: 960px;
              margin: 0 auto;
            }

            .header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 20px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }

            .brand {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 6px;
            }

            h1 {
              margin: 0;
              color: #111827;
              font-size: 24px;
              line-height: 1.5;
            }

            .subtitle {
              margin-top: 6px;
              color: #6b7280;
              font-size: 13px;
              line-height: 1.7;
            }

            .meta {
              text-align: ${dir === "rtl" ? "left" : "right"};
              color: #6b7280;
              font-size: 11px;
              line-height: 1.8;
              min-width: 150px;
            }

            .grid {
              display: grid;
              grid-template-columns: 260px 1fr;
              gap: 18px;
              align-items: start;
            }

            .image-box {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              background: #f8fafc;
              height: 260px;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }

            .image-box img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }

            .image-empty {
              color: #9ca3af;
              font-size: 13px;
            }

            .cards {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 14px;
            }

            .card {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 12px;
              background: #ffffff;
            }

            .card-label {
              color: #6b7280;
              font-size: 11px;
              margin-bottom: 6px;
            }

            .card-value {
              color: #111827;
              font-size: 16px;
              font-weight: 700;
            }

            .section {
              margin-top: 18px;
              break-inside: avoid;
            }

            .section-title {
              margin: 0 0 8px;
              font-size: 15px;
              font-weight: 700;
              color: #111827;
            }

            .description {
              color: #374151;
              font-size: 13px;
              line-height: 1.9;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 12px;
              background: #ffffff;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              overflow: hidden;
              font-size: 12px;
            }

            th,
            td {
              border: 1px solid #e5e7eb;
              padding: 9px 10px;
              text-align: ${dir === "rtl" ? "right" : "left"};
              vertical-align: top;
            }

            th {
              width: 34%;
              background: #f8fafc;
              color: #111827;
              font-weight: 700;
            }

            td {
              color: #374151;
            }

            ul {
              margin: 0;
              padding-${dir === "rtl" ? "right" : "left"}: 20px;
              color: #374151;
              font-size: 12px;
              line-height: 1.9;
            }

            .two-cols {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14px;
            }

            .footer {
              margin-top: 22px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
              color: #9ca3af;
              font-size: 11px;
              display: flex;
              justify-content: space-between;
              gap: 12px;
            }

            @media print {
              .page {
                max-width: none;
              }

              .section,
              .card,
              table,
              .image-box {
                break-inside: avoid;
              }
            }
          </style>
        </head>

        <body>
          <div class="page">
            <div class="header">
              <div>
                <div class="brand">Primey Care — ${escapeHtml(t.fullPrintReport)}</div>
                <h1>${escapeHtml(productName)}</h1>
                <div class="subtitle">${escapeHtml(productDescription || t.noDescription)}</div>
              </div>
              <div class="meta">
                <div>${escapeHtml(formatDate(new Date().toISOString(), locale))}</div>
                <div>${escapeHtml(t.code)}: ${escapeHtml(product.code || product.sku || t.noCode)}</div>
                <div>${escapeHtml(t.status)}: ${escapeHtml(localizedStatus(productStatus, locale))}</div>
              </div>
            </div>

            <div class="grid">
              <div>
                ${imageHtml}
              </div>

              <div>
                <div class="cards">
                  <div class="card">
                    <div class="card-label">${escapeHtml(t.price)}</div>
                    <div class="card-value">${escapeHtml(formatMoney(getProductPrice(product)))} SAR</div>
                  </div>
                  <div class="card">
                    <div class="card-label">${escapeHtml(t.ordersCount)}</div>
                    <div class="card-value">${escapeHtml(formatNumber(finalOrdersCount))}</div>
                  </div>
                  <div class="card">
                    <div class="card-label">${escapeHtml(t.discount)}</div>
                    <div class="card-value">${escapeHtml(formatPercent(getProductDiscount(product)))}</div>
                  </div>
                  <div class="card">
                    <div class="card-label">${escapeHtml(t.contracts)}</div>
                    <div class="card-value">${escapeHtml(formatNumber(contractsCount))}</div>
                  </div>
                </div>

                <table>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">${escapeHtml(t.visibility)}</h2>
              <table>
                <tbody>
                  ${visibilityHtml}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2 class="section-title">${escapeHtml(t.keyBenefits)}</h2>
              <ul>${benefitsHtml}</ul>
            </div>

            <div class="section two-cols">
              <div>
                <h2 class="section-title">${escapeHtml(t.pricingTiers)}</h2>
                <table>
                  <thead>
                    <tr>
                      <th>${escapeHtml(t.productInfo)}</th>
                      <th>${escapeHtml(t.price)}</th>
                      <th>${escapeHtml(t.durationDays)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tiersHtml}
                  </tbody>
                </table>
              </div>

              <div>
                <h2 class="section-title">${escapeHtml(t.serviceItems)}</h2>
                <table>
                  <thead>
                    <tr>
                      <th>${escapeHtml(t.serviceItems)}</th>
                      <th>${escapeHtml(t.quantity)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${serviceItemsHtml}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="footer">
              <span>Primey Care</span>
              <span>${escapeHtml(t.pageTitle)} — ${escapeHtml(productName)}</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (loading) {
    return (
      <div dir={dir} className="w-full space-y-6">
        <ProductsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div dir={dir} className="w-full space-y-4">
        <Card className="rounded-xl border-rose-200 bg-rose-50 shadow-none">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-rose-700">{t.errorTitle}</p>
                <p className="text-sm text-rose-600">{error}</p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
              onClick={() => void loadProduct()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product || !draft || !canView) {
    return (
      <div dir={dir} className="w-full space-y-4">
        <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-950">{t.noProduct}</h1>
              <p className="mt-1 text-sm text-slate-500">{t.noProductDesc}</p>
            </div>
            <Button asChild variant="outline" className="mt-3 rounded-lg">
              <Link href="/system/products">
                <ArrowLeft className="h-4 w-4" />
                {t.back}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div dir={dir} className="w-full space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#8c9cdc]" />
            {t.premiumBadge}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              {productName}
            </h1>
            <StatusBadge status={productStatus} locale={locale} />
            <TypeBadge type={productType} locale={locale} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>{categoryName}</span>
            <span>•</span>
            <span>{providerName}</span>
            <span>•</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 hover:text-slate-900"
              onClick={() => copyText(product.code || product.sku || "")}
            >
              {product.code || product.sku || t.noCode}
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Button>

          <Button asChild variant="outline" className="h-10 rounded-lg">
            <Link href="/system/products">
              <Package className="h-4 w-4" />
              {t.list}
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-10 rounded-lg">
            <Link href={ordersHref}>
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
              {t.openProductOrders}
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg"
            onClick={() => void loadProduct({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          {canPrint ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-lg"
              onClick={printProduct}
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
          ) : null}

          {canEdit && !editMode ? (
            <Button
              type="button"
              className="h-10 rounded-lg bg-slate-950 text-white hover:bg-slate-800"
              onClick={() => setEditMode(true)}
            >
              <Edit3 className="h-4 w-4" />
              {t.edit}
            </Button>
          ) : null}

          {editMode ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg"
                onClick={() => {
                  setDraft(buildDraft(product));
                  setEditMode(false);
                }}
                disabled={saving}
              >
                <X className="h-4 w-4" />
                {t.cancel}
              </Button>
              <Button
                type="button"
                className="h-10 rounded-lg bg-slate-950 text-white hover:bg-slate-800"
                onClick={saveProduct}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? t.saving : t.save}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-1">
          <div className="sticky top-20 space-y-4">
            <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
              <CardContent className="p-4">
                <figure className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border bg-slate-50">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt={productName}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Box className="h-10 w-10" />
                      <span className="text-sm">{t.noImage}</span>
                    </div>
                  )}
                </figure>

                {images.length > 0 ? (
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {images.map((image) => (
                      <button
                        key={image}
                        type="button"
                        className={cn(
                          "aspect-square overflow-hidden rounded-lg border bg-slate-50 p-1 transition",
                          selectedImage === image
                            ? "border-[#8c9cdc] ring-2 ring-[#8c9cdc]/30"
                            : "hover:border-slate-400",
                        )}
                        onClick={() => setSelectedImage(image)}
                      >
                        <img
                          src={image}
                          alt={productName}
                          className="h-full w-full object-contain"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {canUpload ? (
              <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
                <CardContent className="space-y-3 p-4">
                  <p className="font-semibold text-slate-950">{t.images}</p>

                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed p-3 transition hover:border-[#8c9cdc]">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <ImagePlus className="h-4 w-4 text-slate-500" />
                      {t.uploadThumbnail}
                    </span>
                    {uploadingType === "thumbnail" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UploadCloud className="h-4 w-4 text-slate-400" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => uploadImage(event, "thumbnail")}
                      disabled={Boolean(uploadingType)}
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed p-3 transition hover:border-[#8c9cdc]">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <ImagePlus className="h-4 w-4 text-slate-500" />
                      {t.uploadMarketing}
                    </span>
                    {uploadingType === "marketing" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UploadCloud className="h-4 w-4 text-slate-400" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => uploadImage(event, "marketing")}
                      disabled={Boolean(uploadingType)}
                    />
                  </label>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              title={t.price}
              value={<MoneyValue value={getProductPrice(product)} />}
              icon={CircleDollarSign}
              tone="text-primary"
            />
            <KpiCard
              title={t.ordersCount}
              value={formatNumber(finalOrdersCount)}
              icon={ShoppingCart}
              href={ordersHref}
              hint={t.openProductOrders}
              tone="text-emerald-600"
            />
            <KpiCard
              title={t.discount}
              value={formatPercent(getProductDiscount(product))}
              icon={BadgePercent}
              tone="text-primary"
            />
            <KpiCard
              title={t.contracts}
              value={formatNumber(contractsCount)}
              icon={Layers2}
              tone="text-primary"
            />
            <KpiCard
              title={t.salePrice}
              value={<MoneyValue value={getSalePrice(product)} />}
              icon={HandCoins}
              tone="text-muted-foreground"
            />
          </div>

          <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
            <CardContent className="space-y-6 p-5">
              {editMode ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t.nameAr}</label>
                    <Input
                      value={draft.name_ar}
                      onChange={(event) => updateDraft("name_ar", event.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t.nameEn}</label>
                    <Input
                      value={draft.name_en}
                      onChange={(event) => updateDraft("name_en", event.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t.code}</label>
                    <Input
                      value={draft.code}
                      onChange={(event) => updateDraft("code", event.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t.status}</label>
                    <Select
                      value={draft.status}
                      onValueChange={(value) => updateDraft("status", value)}
                    >
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t.active}</SelectItem>
                        <SelectItem value="draft">{t.draft}</SelectItem>
                        <SelectItem value="inactive">{t.inactive}</SelectItem>
                        <SelectItem value="archived">{t.archived}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t.productType}</label>
                    <Select
                      value={draft.product_type}
                      onValueChange={(value) => updateDraft("product_type", value)}
                    >
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">{t.card}</SelectItem>
                        <SelectItem value="program">{t.program}</SelectItem>
                        <SelectItem value="service">{t.service}</SelectItem>
                        <SelectItem value="membership">{t.membership}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t.price}</label>
                    <Input
                      value={draft.price}
                      onChange={(event) =>
                        updateDraft("price", toEnglishDigits(event.target.value))
                      }
                      inputMode="decimal"
                      className="h-10 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">{t.salePrice}</label>
                    <Input
                      value={draft.sale_price}
                      onChange={(event) =>
                        updateDraft("sale_price", toEnglishDigits(event.target.value))
                      }
                      inputMode="decimal"
                      className="h-10 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold">{t.description}</label>
                    <textarea
                      value={draft.description}
                      onChange={(event) => updateDraft("description", event.target.value)}
                      rows={5}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        { key: "is_public", label: t.public },
                        { key: "is_featured", label: t.featured },
                        { key: "is_offer", label: t.offer },
                        { key: "allow_online_purchase", label: t.onlinePurchase },
                        { key: "show_on_landing", label: t.landing },
                        { key: "show_on_mobile", label: t.mobile },
                        { key: "show_on_offers", label: t.offers },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className={cn(
                            "rounded-lg border px-3 py-2 text-start text-sm font-semibold transition",
                            draft[item.key as keyof DraftState]
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-600",
                          )}
                          onClick={() =>
                            updateDraft(
                              item.key as keyof DraftState,
                              !draft[item.key as keyof DraftState] as never,
                            )
                          }
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid items-start gap-8 xl:grid-cols-3">
                  <div className="space-y-8 xl:col-span-2">
                    <div>
                      <h3 className="mb-2 font-semibold">{t.description}:</h3>
                      <p className="leading-7 text-muted-foreground">
                        {productDescription || t.noDescription}
                      </p>
                    </div>

                    <div>
                      <h3 className="mb-2 font-semibold">{t.keyBenefits}:</h3>
                      {product.benefits && product.benefits.length > 0 ? (
                        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                          {product.benefits.map((benefit, index) => (
                            <li key={index}>
                              {getBenefitTitle(benefit, locale)}
                              {getBenefitDescription(benefit, locale)
                                ? ` — ${getBenefitDescription(benefit, locale)}`
                                : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500">{t.noBenefits}</p>
                      )}
                    </div>

                    <div>
                      <h3 className="mb-2 font-semibold">{t.visibility}:</h3>
                      <div className="flex flex-wrap gap-2">
                        <BooleanChip active={Boolean(product.is_public)} label={t.public} />
                        <BooleanChip active={Boolean(product.is_featured)} label={t.featured} />
                        <BooleanChip active={Boolean(product.is_offer)} label={t.offer} />
                        <BooleanChip
                          active={Boolean(product.allow_online_purchase)}
                          label={t.onlinePurchase}
                        />
                        <BooleanChip
                          active={Boolean(product.show_on_landing)}
                          label={t.landing}
                        />
                        <BooleanChip
                          active={Boolean(product.show_on_mobile)}
                          label={t.mobile}
                        />
                        <BooleanChip
                          active={Boolean(product.show_on_offers)}
                          label={t.offers}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border xl:col-span-1">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-semibold">{t.category}</TableCell>
                          <TableCell className="text-end">{categoryName}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">{t.provider}</TableCell>
                          <TableCell className="text-end">{providerName}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">{t.type}</TableCell>
                          <TableCell className="text-end">
                            <TypeBadge type={productType} locale={locale} />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">{t.status}</TableCell>
                          <TableCell className="text-end">
                            <StatusBadge status={productStatus} locale={locale} />
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">{t.ordersCount}</TableCell>
                          <TableCell className="text-end">
                            <Link
                              href={ordersHref}
                              className="font-semibold text-emerald-700 underline-offset-4 hover:underline"
                            >
                              {formatNumber(finalOrdersCount)}
                            </Link>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">{t.code}</TableCell>
                          <TableCell className="text-end">
                            {product.code || product.sku || t.noCode}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">{t.createdAt}</TableCell>
                          <TableCell className="text-end">
                            {formatDate(product.created_at, locale)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">{t.updatedAt}</TableCell>
                          <TableCell className="text-end">
                            {formatDate(product.updated_at, locale)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">{t.validFrom}</TableCell>
                          <TableCell className="text-end">
                            {formatDate(product.valid_from, locale)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-semibold">{t.validUntil}</TableCell>
                          <TableCell className="text-end">
                            {formatDate(product.valid_until, locale)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <Layers3 className="h-5 w-5 text-[#8c9cdc]" />
                  <h3 className="font-semibold">{t.pricingTiers}</h3>
                </div>

                {product.pricing_tiers && product.pricing_tiers.length > 0 ? (
                  <div className="space-y-2">
                    {product.pricing_tiers.map((tier) => (
                      <div
                        key={tier.id || getPricingName(tier, locale)}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-semibold">{getPricingName(tier, locale)}</p>
                          {tier.duration_days ? (
                            <p className="text-xs text-slate-500">
                              {formatNumber(tier.duration_days)} {t.durationDays}
                            </p>
                          ) : null}
                        </div>
                        <MoneyValue value={tier.sale_price ?? tier.price ?? 0} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">{t.noPricingTiers}</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#8c9cdc]" />
                  <h3 className="font-semibold">{t.serviceItems}</h3>
                </div>

                {product.service_items && product.service_items.length > 0 ? (
                  <div className="space-y-2">
                    {product.service_items.map((item) => (
                      <div
                        key={item.id || getServiceItemName(item, locale)}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <p className="font-semibold">{getServiceItemName(item, locale)}</p>
                        <span className="text-sm text-slate-500">
                          {item.quantity ? formatNumber(item.quantity) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">{t.noServiceItems}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-[#8c9cdc]" />
                <h3 className="font-semibold">{t.productData}</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{t.price}</p>
                  <div className="mt-1 text-lg">
                    <MoneyValue value={getProductPrice(product)} />
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{t.salePrice}</p>
                  <div className="mt-1 text-lg">
                    <MoneyValue value={getSalePrice(product)} />
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{t.discount}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatPercent(getProductDiscount(product))}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{t.contracts}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatNumber(contractsCount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}