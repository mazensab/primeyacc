"use client";

/* ============================================================
   📂 primey_frontend/app/system/products/page.tsx
   🧭 Primey Care — Products Catalog
   ------------------------------------------------------------
   ✅ Product = fixed catalog item
   ✅ Provider-specific offers/prices = /api/offers/
   ✅ Premium paid product list style
   ✅ Internal UI components only
   ✅ No @tanstack/react-table dependency
   ✅ Local sorting/filtering/pagination/columns
   ✅ Real API only: /api/products/ + /api/offers/
   ✅ No /system/products/list
   ✅ No localhost
   ✅ RTL/LTR + Arabic/English
   ✅ Excel .xls + Web print
   ✅ SAR icon from /currency/sar.svg
   ============================================================ */

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpDown,
  BadgePercent,
  CheckCircle2,
  ColumnsIcon,
  Copy,
  Download,
  Eye,
  FilterIcon,
  Layers3,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  PlusCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Sparkles,
  TriangleAlert,
  X,
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Locale = "ar" | "en";

type NamedEntity = {
  id?: number | string;
  name?: string;
  name_ar?: string;
  name_en?: string;
  title?: string;
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
  product_type?: string;
  type?: string;
  status?: string;
  category?: string | NamedEntity | null;
  category_name?: string;
  price?: string | number | null;
  sale_price?: string | number | null;
  final_price?: string | number | null;
  base_price?: string | number | null;
  discount_percentage?: string | number | null;
  highest_discount_percent?: string | number | null;
  highest_product_discount_percent?: string | number | null;
  active_contracts_count?: number;
  contracted_products_count?: number;
  provider_offers_count?: number;
  offers_count?: number;
  active_offers_count?: number;
  orders_count?: number;
  order_count?: number;
  total_orders?: number;
  sales_count?: number;
  sold_count?: number;
  total_sales?: number;
  is_public?: boolean;
  is_featured?: boolean;
  is_offer?: boolean;
  show_on_landing?: boolean;
  show_on_mobile?: boolean;
  show_on_offers?: boolean;
  thumbnail_image_url?: string;
  marketing_image_url?: string;
  image_url?: string;
  image?: string;
  created_at?: string;
};

type ProductsSummary = {
  total_products?: number;
  active_products?: number;
  offer_products?: number;
  contracted_products?: number;
  products_with_active_contracts?: number;
};

type ProductsApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  results?: ProductRecord[];
  items?: ProductRecord[];
  data?:
    | ProductRecord[]
    | {
        results?: ProductRecord[];
        items?: ProductRecord[];
        data?: ProductRecord[];
      };
  pagination?: {
    total?: number;
  };
  summary?: ProductsSummary;
};

type OfferRecord = {
  id?: number | string;
  offer_id?: number | string;
  contract_product_id?: number | string;
  product_id?: number | string;
  product?: number | string | NamedEntity | null;
  product_name?: string;
  product_title?: string;
  provider?: string | NamedEntity | null;
  provider_id?: number | string;
  provider_name?: string;
  title?: string;
  offer_title?: string;
  badge?: string;
  offer_badge?: string;
  status?: string;
  is_active?: boolean;
  price_before_discount?: string | number | null;
  unit_price_before_discount?: string | number | null;
  old_price?: string | number | null;
  original_price?: string | number | null;
  price_after_discount?: string | number | null;
  unit_price?: string | number | null;
  final_price?: string | number | null;
  sale_price?: string | number | null;
  price?: string | number | null;
  discount_percentage?: string | number | null;
  unit_discount_percentage?: string | number | null;
  discount_percent?: string | number | null;
  checkout_payload?: Record<string, unknown>;
  order_payload?: Record<string, unknown>;
  order_item_payload?: Record<string, unknown>;
  checkout_source?: string;
};

type OffersApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  results?: OfferRecord[];
  items?: OfferRecord[];
  data?:
    | OfferRecord[]
    | {
        results?: OfferRecord[];
        items?: OfferRecord[];
        data?: OfferRecord[];
      };
  pagination?: {
    total?: number;
  };
};

type ProductStatusFilter = "all" | "active" | "draft" | "inactive" | "archived";
type ProductTypeFilter = "all" | "card" | "program" | "service" | "membership";
type OfferFilter = "all" | "with_offers" | "without_offers";
type SortKey =
  | "created_at"
  | "name"
  | "price"
  | "category"
  | "type"
  | "provider_offers"
  | "orders"
  | "status";
type SortDirection = "asc" | "desc";
type SortFilter =
  | "newest"
  | "oldest"
  | "name"
  | "best_selling"
  | "most_offers"
  | "highest_price"
  | "lowest_price"
  | "highest_discount";

type FiltersState = {
  search: string;
  status: ProductStatusFilter;
  type: ProductTypeFilter;
  category: string;
  offer: OfferFilter;
  sort: SortFilter;
};

type ColumnKey =
  | "select"
  | "product"
  | "price"
  | "category"
  | "type"
  | "providerOffers"
  | "orders"
  | "status"
  | "actions";

type FilterOption = {
  value: string;
  label: string;
};

type ColumnConfig = {
  key: ColumnKey;
  label: string;
  canHide?: boolean;
};

const SAR_ICON = "/currency/sar.svg";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

const translations = {
  ar: {
    title: "كتالوج المنتجات",
    subtitle:
      "إدارة المنتجات الثابتة مع فصل أسعار وخصومات مقدمي الخدمة داخل عروض مستقلة.",
    fixedCatalog: "كتالوج ثابت",
    addProduct: "إضافة منتج",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    columns: "الأعمدة",
    actions: "الإجراءات",
    totalProducts: "إجمالي المنتجات",
    activeProducts: "المنتجات النشطة",
    productsWithOffers: "لديها عروض مقدمي خدمة",
    offerProducts: "عروض عامة على المنتج",
    fixedCatalogHint: "كتالوج ثابت",
    activeHint: "نشط",
    providerOffersHint: "عروض من مقدمي الخدمة",
    publicOffersHint: "عروض عامة",
    searchPlaceholder: "بحث في المنتجات...",
    all: "الكل",
    active: "نشط",
    draft: "مسودة",
    inactive: "غير نشط",
    archived: "مؤرشف",
    card: "بطاقة",
    program: "برنامج",
    service: "خدمة",
    membership: "عضوية",
    withOffers: "لديه عروض",
    withoutOffers: "بدون عروض",
    newest: "الأحدث",
    oldest: "الأقدم",
    name: "الاسم",
    highestPrice: "أعلى سعر",
    lowestPrice: "أقل سعر",
    highestDiscountSort: "أعلى خصم",
    bestSelling: "الأكثر طلبًا",
    mostOffers: "الأكثر عروضًا",
    product: "المنتج",
    productName: "اسم المنتج",
    catalogPrice: "السعر",
    category: "التصنيف",
    type: "النوع",
    providerOffers: "عروض مقدمي الخدمة",
    orders: "الطلبات",
    status: "الحالة",
    noCategory: "بدون تصنيف",
    noCode: "بدون كود",
    view: "عرض التفاصيل",
    viewOffers: "عرض العروض",
    closeOffers: "إغلاق العروض",
    copyId: "نسخ الرقم",
    copied: "تم نسخ الرقم",
    noProducts: "لا توجد منتجات",
    noProductsDesc: "لم يتم العثور على منتجات حسب الفلاتر الحالية.",
    noProviderOffers: "لا توجد عروض لهذا المنتج",
    noProviderOffersDesc:
      "يمكن إضافة عروض المنتج داخل عقد مقدم الخدمة ليظهر السعر والخصم حسب مقدم الخدمة.",
    selectedProductOffers: "عروض المنتج حسب مقدم الخدمة",
    provider: "مقدم الخدمة",
    beforeDiscount: "قبل الخصم",
    afterDiscount: "بعد الخصم",
    discount: "الخصم",
    checkoutReady: "جاهز للطلب",
    offerId: "رقم العرض",
    errorTitle: "تعذر تحميل المنتجات",
    offersErrorTitle: "تعذر تحميل عروض المنتج",
    retry: "إعادة المحاولة",
    loaded: "تم تحديث بيانات المنتجات",
    offersLoaded: "تم تحميل عروض المنتج",
    exportDone: "تم تجهيز ملف Excel",
    printReady: "تم تجهيز صفحة الطباعة",
    selected: "محدد",
    selectedRows: "صفوف محددة",
    of: "من",
    previous: "السابق",
    next: "التالي",
    page: "صفحة",
    rowsPerPage: "عدد الصفوف",
    chooseStatus: "الحالة",
    chooseCategory: "التصنيف",
    chooseType: "النوع",
    chooseOffer: "العروض",
    noOptions: "لا توجد نتائج",
    mobileFilters: "الفلاتر",
    sort: "الترتيب",
    id: "الرقم",
  },
  en: {
    title: "Products",
    subtitle:
      "Manage fixed catalog products while provider pricing and discounts stay in separate offers.",
    fixedCatalog: "Fixed catalog",
    addProduct: "Add Product",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    reset: "Reset",
    columns: "Columns",
    actions: "Actions",
    totalProducts: "Total Products",
    activeProducts: "Active Products",
    productsWithOffers: "With Provider Offers",
    offerProducts: "General Product Offers",
    fixedCatalogHint: "Fixed catalog",
    activeHint: "Active",
    providerOffersHint: "Provider offers",
    publicOffersHint: "General offers",
    searchPlaceholder: "Search products...",
    all: "All",
    active: "Active",
    draft: "Draft",
    inactive: "Inactive",
    archived: "Archived",
    card: "Card",
    program: "Program",
    service: "Service",
    membership: "Membership",
    withOffers: "With offers",
    withoutOffers: "Without offers",
    newest: "Newest",
    oldest: "Oldest",
    name: "Name",
    highestPrice: "Highest price",
    lowestPrice: "Lowest price",
    highestDiscountSort: "Highest discount",
    bestSelling: "Most ordered",
    mostOffers: "Most offers",
    product: "Product",
    productName: "Product Name",
    catalogPrice: "Price",
    category: "Category",
    type: "Type",
    providerOffers: "Provider Offers",
    orders: "Orders",
    status: "Status",
    noCategory: "No category",
    noCode: "No code",
    view: "View details",
    viewOffers: "View offers",
    closeOffers: "Close offers",
    copyId: "Copy ID",
    copied: "ID copied",
    noProducts: "No products",
    noProductsDesc: "No products were found for the current filters.",
    noProviderOffers: "No offers for this product",
    noProviderOffersDesc:
      "Add product offers inside provider contracts to show pricing and discounts per provider.",
    selectedProductOffers: "Product offers by provider",
    provider: "Provider",
    beforeDiscount: "Before discount",
    afterDiscount: "After discount",
    discount: "Discount",
    checkoutReady: "Checkout ready",
    offerId: "Offer ID",
    errorTitle: "Unable to load products",
    offersErrorTitle: "Unable to load product offers",
    retry: "Retry",
    loaded: "Products refreshed",
    offersLoaded: "Product offers loaded",
    exportDone: "Excel file prepared",
    printReady: "Print page prepared",
    selected: "Selected",
    selectedRows: "selected rows",
    of: "of",
    previous: "Previous",
    next: "Next",
    page: "Page",
    rowsPerPage: "Rows",
    chooseStatus: "Status",
    chooseCategory: "Category",
    chooseType: "Type",
    chooseOffer: "Offers",
    noOptions: "No results",
    mobileFilters: "Filters",
    sort: "Sort",
    id: "ID",
  },
} as const;

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
  const cleaned = toEnglishDigits(value ?? 0).replace(/[^\d.-]/g, "");
  const numeric = Number(cleaned);
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

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

function extractProducts(payload: ProductsApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;

  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.data)) return payload.data.data;
  }

  return [];
}

function extractOffers(payload: OffersApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;

  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.data)) return payload.data.data;
  }

  return [];
}

function getEntityName(
  entity: string | NamedEntity | null | undefined,
  locale: Locale,
  fallback: string,
) {
  if (typeof entity === "string") return entity;

  if (entity && typeof entity === "object") {
    return (
      (locale === "ar"
        ? entity.name_ar || entity.name || entity.title || entity.name_en
        : entity.name_en || entity.name || entity.title || entity.name_ar) ||
      fallback
    );
  }

  return fallback;
}

function getProductName(product: ProductRecord, locale: Locale) {
  return (
    (locale === "ar"
      ? product.name_ar || product.name || product.title || product.name_en
      : product.name_en || product.name || product.title || product.name_ar) ||
    `#${product.id}`
  );
}

function getCategoryName(product: ProductRecord, locale: Locale, fallback: string) {
  return (
    product.category_name ||
    getEntityName(product.category, locale, fallback) ||
    fallback
  );
}

function getProductType(product: ProductRecord) {
  return normalizeText(product.product_type || product.type || "service");
}

function getProductImage(product: ProductRecord) {
  return (
    product.thumbnail_image_url ||
    product.marketing_image_url ||
    product.image_url ||
    product.image ||
    ""
  );
}

function getProductStatus(product: ProductRecord) {
  return normalizeText(product.status || "active");
}

function getCatalogPrice(product: ProductRecord) {
  return (
    product.final_price ??
    product.sale_price ??
    product.price ??
    product.base_price ??
    0
  );
}

function getProviderOffersCount(product: ProductRecord) {
  return Math.max(
    toNumber(product.provider_offers_count),
    toNumber(product.active_contracts_count),
    toNumber(product.contracted_products_count),
    toNumber(product.active_offers_count),
    0,
  );
}

function getGeneralOffersCount(product: ProductRecord) {
  return Math.max(toNumber(product.offers_count), product.is_offer ? 1 : 0);
}

function getProductSalesCount(product: ProductRecord) {
  return Math.max(
    toNumber(product.orders_count),
    toNumber(product.order_count),
    toNumber(product.total_orders),
    toNumber(product.sales_count),
    toNumber(product.sold_count),
    toNumber(product.total_sales),
    0,
  );
}

function getDiscountPercent(product: ProductRecord) {
  return Math.max(
    toNumber(product.highest_discount_percent),
    toNumber(product.highest_product_discount_percent),
    toNumber(product.discount_percentage),
    0,
  );
}

function getOfferId(offer: OfferRecord) {
  return offer.offer_id || offer.contract_product_id || offer.id || "";
}

function getOfferTitle(offer: OfferRecord, locale: Locale) {
  const productName = getEntityName(offer.product as NamedEntity, locale, "");

  return (
    offer.offer_title ||
    offer.title ||
    offer.product_title ||
    offer.product_name ||
    productName ||
    `#${getOfferId(offer)}`
  );
}

function getOfferProviderName(offer: OfferRecord, locale: Locale, fallback: string) {
  return (
    offer.provider_name ||
    getEntityName(offer.provider as NamedEntity, locale, fallback) ||
    fallback
  );
}

function getOfferBeforePrice(offer: OfferRecord) {
  return (
    offer.price_before_discount ??
    offer.unit_price_before_discount ??
    offer.old_price ??
    offer.original_price ??
    offer.price ??
    0
  );
}

function getOfferAfterPrice(offer: OfferRecord) {
  return (
    offer.price_after_discount ??
    offer.unit_price ??
    offer.final_price ??
    offer.sale_price ??
    offer.price ??
    0
  );
}

function getOfferDiscount(offer: OfferRecord) {
  return (
    offer.discount_percentage ??
    offer.unit_discount_percentage ??
    offer.discount_percent ??
    0
  );
}

function isOfferCheckoutReady(offer: OfferRecord) {
  return Boolean(
    offer.checkout_payload ||
      offer.order_payload ||
      offer.order_item_payload ||
      offer.checkout_source === "offers",
  );
}

function getSortValue(product: ProductRecord, key: SortKey, locale: Locale) {
  if (key === "name") return getProductName(product, locale);
  if (key === "price") return toNumber(getCatalogPrice(product));
  if (key === "category") return getCategoryName(product, locale, "");
  if (key === "type") return getProductType(product);
  if (key === "provider_offers") return getProviderOffersCount(product);
  if (key === "orders") return getProductSalesCount(product);
  if (key === "status") return getProductStatus(product);

  return new Date(product.created_at || 0).getTime();
}

function compareValues(a: unknown, b: unknown, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;

  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * multiplier;
  }

  return String(a ?? "").localeCompare(String(b ?? "")) * multiplier;
}

function filterBySearch(product: ProductRecord, search: string, locale: Locale) {
  const query = normalizeText(search);
  if (!query) return true;

  const values = [
    getProductName(product, locale),
    product.name,
    product.name_ar,
    product.name_en,
    product.title,
    product.code,
    product.sku,
    product.slug,
    product.description,
    getCategoryName(product, locale, ""),
  ];

  return values.some((value) => normalizeText(value).includes(query));
}

function productMatchesFilters(
  product: ProductRecord,
  filters: FiltersState,
  locale: Locale,
) {
  const status = getProductStatus(product);
  const type = getProductType(product);
  const categoryName = normalizeText(getCategoryName(product, locale, ""));
  const providerOffersCount = getProviderOffersCount(product);

  if (!filterBySearch(product, filters.search, locale)) return false;
  if (filters.status !== "all" && status !== filters.status) return false;
  if (filters.type !== "all" && type !== filters.type) return false;

  if (filters.category !== "all" && categoryName !== normalizeText(filters.category)) {
    return false;
  }

  if (filters.offer === "with_offers" && providerOffersCount <= 0) return false;
  if (filters.offer === "without_offers" && providerOffersCount > 0) return false;

  return true;
}

function applySortPreset(
  products: ProductRecord[],
  sort: SortFilter,
  locale: Locale,
) {
  const copy = [...products];

  copy.sort((a, b) => {
    if (sort === "oldest") {
      return (
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
      );
    }

    if (sort === "name") {
      return getProductName(a, locale).localeCompare(getProductName(b, locale));
    }

    if (sort === "best_selling") {
      return getProductSalesCount(b) - getProductSalesCount(a);
    }

    if (sort === "most_offers") {
      return getProviderOffersCount(b) - getProviderOffersCount(a);
    }

    if (sort === "highest_price") {
      return toNumber(getCatalogPrice(b)) - toNumber(getCatalogPrice(a));
    }

    if (sort === "lowest_price") {
      return toNumber(getCatalogPrice(a)) - toNumber(getCatalogPrice(b));
    }

    if (sort === "highest_discount") {
      return getDiscountPercent(b) - getDiscountPercent(a);
    }

    return (
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    );
  });

  return copy;
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

function MoneyValue({ value }: { value: string | number | null | undefined }) {
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
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
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
          <Badge
            variant="outline"
            className="rounded-full border px-2.5 py-1 text-xs font-semibold"
          >
            <span className="text-emerald-600">{trend}</span>
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  const t = translations[locale];
  const normalized = normalizeText(status);

  if (normalized === "active") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300"
      >
        {t.active}
      </Badge>
    );
  }

  if (normalized === "inactive") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-amber-500/30 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300"
      >
        {t.inactive}
      </Badge>
    );
  }

  if (normalized === "archived") {
    return (
      <Badge
        variant="outline"
        className="rounded-full border-red-500/30 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:bg-red-950/30 dark:text-red-300"
      >
        {t.archived}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="rounded-full border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    >
      {t.draft}
    </Badge>
  );
}

function TypeBadge({ type, locale }: { type: string; locale: Locale }) {
  const t = translations[locale];
  const normalized = normalizeText(type);

  const label =
    normalized === "card"
      ? t.card
      : normalized === "program"
        ? t.program
        : normalized === "membership"
          ? t.membership
          : t.service;

  return (
    <Badge
      variant="outline"
      className="rounded-full border-border bg-background px-2.5 py-1 text-xs font-medium"
    >
      {label}
    </Badge>
  );
}

function ProductsSkeleton() {
  return (
    <div className="space-y-7">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-lg border shadow-none">
            <CardContent className="space-y-4 p-6">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="h-10 w-full max-w-sm animate-pulse rounded-md bg-muted" />
        <div className="h-[520px] w-full animate-pulse rounded-lg border bg-muted/40" />
      </div>
    </div>
  );
}

function ProductImage({
  product,
  locale,
}: {
  product: ProductRecord;
  locale: Locale;
}) {
  const image = getProductImage(product);
  const name = getProductName(product, locale);

  if (image) {
    return (
      <figure className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={name} className="h-full w-full object-cover" />
      </figure>
    );
  }

  return (
    <figure className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground">
      <Package className="h-5 w-5" />
    </figure>
  );
}

function HeaderSortButton({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = activeSortKey === sortKey;

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-8 px-2 text-xs font-medium text-foreground hover:bg-muted",
        className,
      )}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <ArrowUpDown
        className={cn(
          "h-3.5 w-3.5",
          isActive && sortDirection === "asc" ? "rotate-180" : "",
        )}
      />
    </Button>
  );
}

function FilterPopover({
  label,
  value,
  options,
  onChange,
  emptyLabel,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  emptyLabel: string;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md border bg-background px-3 text-sm font-medium shadow-none"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{label}</span>
          {selected && selected.value !== "all" ? (
            <Badge
              variant="secondary"
              className="ms-1 rounded-full px-2 py-0 text-[11px]"
            >
              {selected.label}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={label} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label}-${option.value}`}
                  onSelect={() => onChange(option.value)}
                >
                  <div className="flex w-full items-center gap-3 py-1">
                    <Checkbox checked={value === option.value} />
                    <span className="text-sm">{option.label}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ProductTableEmpty({
  columnsCount,
  title,
  description,
}: {
  columnsCount: number;
  title: string;
  description: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={columnsCount} className="h-52 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Package className="h-6 w-6" />
          </div>
          <p className="mt-4 font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ProductsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [products, setProducts] = React.useState<ProductRecord[]>([]);
  const [summary, setSummary] = React.useState<ProductsSummary>({});
  const [totalFromApi, setTotalFromApi] = React.useState(0);

  const [selectedProduct, setSelectedProduct] =
    React.useState<ProductRecord | null>(null);
  const [selectedOffers, setSelectedOffers] = React.useState<OfferRecord[]>([]);
  const [offersLoading, setOffersLoading] = React.useState(false);
  const [offersError, setOffersError] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [filters, setFilters] = React.useState<FiltersState>({
    search: "",
    status: "all",
    type: "all",
    category: "all",
    offer: "all",
    sort: "newest",
  });

  const [sortKey, setSortKey] = React.useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");
  const [visibleColumns, setVisibleColumns] = React.useState<
    Record<ColumnKey, boolean>
  >({
    select: true,
    product: true,
    price: true,
    category: true,
    type: true,
    providerOffers: true,
    orders: true,
    status: true,
    actions: true,
  });
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  const didLoadRef = React.useRef(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const textAlign = locale === "ar" ? "text-right" : "text-left";
  const startNegative = locale === "ar" ? "-me-2" : "-ms-2";

  const loadProducts = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) {
          setLoading(true);
        }

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: "1",
          page_size: "500",
          ordering: "-created_at",
        });

        const payload = await fetchJson<ProductsApiResponse>(
          makeApiUrl("/api/products/", params),
          controller.signal,
        );

        const nextProducts = extractProducts(payload);

        setProducts(nextProducts);
        setSummary(payload.summary || {});
        setTotalFromApi(
          Number(
            payload.pagination?.total ??
              payload.summary?.total_products ??
              nextProducts.length,
          ),
        );

        if (silent) {
          toast.success(translations[locale].loaded);
        }
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load products.";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [locale],
  );

  React.useEffect(() => {
    if (didLoadRef.current) return;

    didLoadRef.current = true;
    void loadProducts();
  }, [loadProducts]);

  React.useEffect(() => {
    const readLocale = () => {
      try {
        const saved = window.localStorage.getItem("primey-locale");
        const nextLocale: Locale = saved === "en" ? "en" : "ar";

        setLocale(nextLocale);
        document.documentElement.lang = nextLocale;
        document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
        document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
      } catch {
        setLocale("ar");
      }
    };

    readLocale();

    window.addEventListener("primey-locale-changed", readLocale);
    window.addEventListener("storage", readLocale);

    return () => {
      window.removeEventListener("primey-locale-changed", readLocale);
      window.removeEventListener("storage", readLocale);
    };
  }, []);

  const columns = React.useMemo<ColumnConfig[]>(
    () => [
      { key: "select", label: t.selected, canHide: false },
      { key: "product", label: t.productName, canHide: false },
      { key: "price", label: t.catalogPrice, canHide: true },
      { key: "category", label: t.category, canHide: true },
      { key: "type", label: t.type, canHide: true },
      { key: "providerOffers", label: t.providerOffers, canHide: true },
      { key: "orders", label: t.orders, canHide: true },
      { key: "status", label: t.status, canHide: true },
      { key: "actions", label: t.actions, canHide: false },
    ],
    [t],
  );

  const visibleColumnsCount = React.useMemo(() => {
    return columns.filter((column) => visibleColumns[column.key]).length;
  }, [columns, visibleColumns]);

  const categoryOptions = React.useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();

    products.forEach((product) => {
      const label = getCategoryName(product, locale, "");
      if (!label) return;

      map.set(normalizeText(label), label);
    });

    return [
      { value: "all", label: t.all },
      ...Array.from(map.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [locale, products, t.all]);

  const filteredProducts = React.useMemo(() => {
    const filtered = products.filter((product) =>
      productMatchesFilters(product, filters, locale),
    );

    const presetSorted = applySortPreset(filtered, filters.sort, locale);

    return [...presetSorted].sort((a, b) =>
      compareValues(
        getSortValue(a, sortKey, locale),
        getSortValue(b, sortKey, locale),
        sortDirection,
      ),
    );
  }, [filters, locale, products, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const startRow = safePageIndex * pageSize;
  const pagedProducts = filteredProducts.slice(startRow, startRow + pageSize);

  const allPageIds = React.useMemo(
    () => pagedProducts.map((product) => String(product.id)),
    [pagedProducts],
  );

  const allPageSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const somePageSelected =
    allPageIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  const localSummary = React.useMemo(() => {
    const total = totalFromApi || summary.total_products || products.length;
    const active =
      summary.active_products ??
      products.filter((product) => getProductStatus(product) === "active").length;
    const withProviderOffers =
      summary.contracted_products ??
      summary.products_with_active_contracts ??
      products.filter((product) => getProviderOffersCount(product) > 0).length;
    const generalOffers =
      summary.offer_products ??
      products.filter((product) => getGeneralOffersCount(product) > 0).length;

    return {
      total,
      active,
      withProviderOffers,
      generalOffers,
    };
  }, [products, summary, totalFromApi]);

  React.useEffect(() => {
    setPageIndex(0);
  }, [filters, pageSize, sortDirection, sortKey]);

  React.useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(Math.max(0, pageCount - 1));
    }
  }, [pageCount, pageIndex]);

  const updateFilter = <K extends keyof FiltersState>(
    key: K,
    value: FiltersState[K],
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      type: "all",
      category: "all",
      offer: "all",
      sort: "newest",
    });
    setSortKey("created_at");
    setSortDirection("desc");
    setSelectedIds(new Set());
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "created_at" ? "desc" : "asc");
  };

  const toggleAllPageSelection = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      allPageIds.forEach((id) => {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });

      return next;
    });
  };

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  };

  const loadProductOffers = async (product: ProductRecord) => {
    setSelectedProduct(product);
    setSelectedOffers([]);
    setOffersError("");
    setOffersLoading(true);

    try {
      const params = new URLSearchParams({
        product_id: String(product.id),
        page: "1",
        page_size: "100",
      });

      const payload = await fetchJson<OffersApiResponse>(
        makeApiUrl("/api/offers/", params),
      );

      setSelectedOffers(extractOffers(payload));
      toast.success(t.offersLoaded);
    } catch (offersFetchError) {
      const message =
        offersFetchError instanceof Error
          ? offersFetchError.message
          : t.offersErrorTitle;

      setOffersError(message);
    } finally {
      setOffersLoading(false);
    }
  };

  const copyProductId = async (product: ProductRecord) => {
    try {
      await navigator.clipboard.writeText(String(product.id));
      toast.success(t.copied);
    } catch {
      toast.error(String(product.id));
    }
  };

  const statusOptions: FilterOption[] = [
    { value: "all", label: t.all },
    { value: "active", label: t.active },
    { value: "draft", label: t.draft },
    { value: "inactive", label: t.inactive },
    { value: "archived", label: t.archived },
  ];

  const typeOptions: FilterOption[] = [
    { value: "all", label: t.all },
    { value: "card", label: t.card },
    { value: "program", label: t.program },
    { value: "service", label: t.service },
    { value: "membership", label: t.membership },
  ];

  const offerOptions: FilterOption[] = [
    { value: "all", label: t.all },
    { value: "with_offers", label: t.withOffers },
    { value: "without_offers", label: t.withoutOffers },
  ];

  const exportExcel = () => {
    const rows = filteredProducts
      .map((product) => {
        const productName = getProductName(product, locale);
        const categoryName = getCategoryName(product, locale, t.noCategory);
        const type = getProductType(product);
        const status = getProductStatus(product);

        return `
          <tr>
            <td>${escapeHtml(productName)}</td>
            <td>${escapeHtml(product.code || product.sku || "")}</td>
            <td>${escapeHtml(formatMoney(getCatalogPrice(product)))}</td>
            <td>${escapeHtml(categoryName)}</td>
            <td>${escapeHtml(type)}</td>
            <td>${escapeHtml(String(getProviderOffersCount(product)))}</td>
            <td>${escapeHtml(String(getProductSalesCount(product)))}</td>
            <td>${escapeHtml(status)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
        </head>
        <body>
          <table border="1">
            <thead>
              <tr>
                <th>${escapeHtml(t.product)}</th>
                <th>${escapeHtml(t.noCode)}</th>
                <th>${escapeHtml(t.catalogPrice)}</th>
                <th>${escapeHtml(t.category)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.providerOffers)}</th>
                <th>${escapeHtml(t.orders)}</th>
                <th>${escapeHtml(t.status)}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
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
    anchor.download = `primey-products-${new Date().toISOString().slice(0, 10)}.xls`;
    anchor.click();

    URL.revokeObjectURL(url);
    toast.success(t.exportDone);
  };

  const printProducts = () => {
    const rows = filteredProducts
      .map((product) => {
        const productName = getProductName(product, locale);
        const categoryName = getCategoryName(product, locale, t.noCategory);

        return `
          <tr>
            <td>${escapeHtml(productName)}</td>
            <td>${escapeHtml(formatMoney(getCatalogPrice(product)))}</td>
            <td>${escapeHtml(categoryName)}</td>
            <td>${escapeHtml(String(getProviderOffersCount(product)))}</td>
            <td>${escapeHtml(String(getProductSalesCount(product)))}</td>
            <td>${escapeHtml(getProductStatus(product))}</td>
          </tr>
        `;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="${dir}">
        <head>
          <title>${escapeHtml(t.title)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #111827;
            }
            h1 {
              margin: 0 0 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 10px;
              text-align: ${locale === "ar" ? "right" : "left"};
              font-size: 13px;
            }
            th {
              background: #f8fafc;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.title)}</h1>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.product)}</th>
                <th>${escapeHtml(t.catalogPrice)}</th>
                <th>${escapeHtml(t.category)}</th>
                <th>${escapeHtml(t.providerOffers)}</th>
                <th>${escapeHtml(t.orders)}</th>
                <th>${escapeHtml(t.status)}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    toast.success(t.printReady);
  };

  const renderFilters = () => (
    <>
      <FilterPopover
        label={t.chooseStatus}
        value={filters.status}
        options={statusOptions}
        onChange={(value) => updateFilter("status", value as ProductStatusFilter)}
        emptyLabel={t.noOptions}
      />

      <FilterPopover
        label={t.chooseCategory}
        value={filters.category}
        options={categoryOptions}
        onChange={(value) => updateFilter("category", value)}
        emptyLabel={t.noOptions}
      />

      <FilterPopover
        label={t.chooseType}
        value={filters.type}
        options={typeOptions}
        onChange={(value) => updateFilter("type", value as ProductTypeFilter)}
        emptyLabel={t.noOptions}
      />

      <FilterPopover
        label={t.chooseOffer}
        value={filters.offer}
        options={offerOptions}
        onChange={(value) => updateFilter("offer", value as OfferFilter)}
        emptyLabel={t.noOptions}
      />
    </>
  );

  return (
    <div dir={dir} className="w-full space-y-7">
      <div className="flex items-center justify-between gap-4">
        <div className={cn("space-y-1", textAlign)}>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t.title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md shadow-none"
            onClick={() => void loadProducts({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{t.refresh}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md shadow-none"
            onClick={exportExcel}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t.exportExcel}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md shadow-none"
            onClick={printProducts}
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">{t.print}</span>
          </Button>

          <Button asChild className="h-10 rounded-md bg-black text-white hover:bg-black/90">
            <Link href="/system/products/create">
              <Plus className="h-4 w-4" />
              {t.addProduct}
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <ProductsSkeleton />
      ) : error ? (
        <Card className="rounded-lg border-rose-200 bg-rose-50 shadow-none dark:border-rose-900 dark:bg-rose-950/20">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
                <TriangleAlert className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-rose-700 dark:text-rose-200">
                  {t.errorTitle}
                </p>
                <p className="text-sm text-rose-600 dark:text-rose-300">
                  {error}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-md border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
              onClick={() => void loadProducts()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title={t.totalProducts}
              value={formatNumber(localSummary.total)}
              trend="+100%"
            />

            <KpiCard
              title={t.activeProducts}
              value={formatNumber(localSummary.active)}
              trend={`+${formatNumber(localSummary.active)}`}
            />

            <KpiCard
              title={t.productsWithOffers}
              value={formatNumber(localSummary.withProviderOffers)}
              trend={`+${formatNumber(localSummary.withProviderOffers)}`}
            />

            <KpiCard
              title={t.offerProducts}
              value={formatNumber(localSummary.generalOffers)}
              trend={`+${formatNumber(localSummary.generalOffers)}`}
            />
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
                <div className="relative w-full md:max-w-sm">
                  <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filters.search}
                    onChange={(event) => updateFilter("search", event.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-10 rounded-md border bg-background pe-10 shadow-none"
                  />
                </div>

                <div className="hidden flex-wrap items-center gap-2 md:flex">
                  {renderFilters()}
                </div>

                <div className="md:hidden">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-md shadow-none"
                      >
                        <FilterIcon className="h-4 w-4" />
                        {t.mobileFilters}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 space-y-2 p-3" align="start">
                      {renderFilters()}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Select
                  value={filters.sort}
                  onValueChange={(value) =>
                    updateFilter("sort", value as SortFilter)
                  }
                >
                  <SelectTrigger className="h-10 w-[180px] rounded-md border bg-background shadow-none">
                    <span className="text-sm text-muted-foreground">{t.sort}:</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="name">{t.name}</SelectItem>
                    <SelectItem value="best_selling">{t.bestSelling}</SelectItem>
                    <SelectItem value="most_offers">{t.mostOffers}</SelectItem>
                    <SelectItem value="highest_price">{t.highestPrice}</SelectItem>
                    <SelectItem value="lowest_price">{t.lowestPrice}</SelectItem>
                    <SelectItem value="highest_discount">
                      {t.highestDiscountSort}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-md shadow-none"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden lg:inline">{t.reset}</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-md shadow-none"
                    >
                      <span className="hidden lg:inline">{t.columns}</span>
                      <ColumnsIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {columns
                      .filter((column) => column.canHide)
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.key}
                          checked={visibleColumns[column.key]}
                          onCheckedChange={(checked) =>
                            setVisibleColumns((current) => ({
                              ...current,
                              [column.key]: checked,
                            }))
                          }
                        >
                          {column.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="overflow-x-auto">
                <Table className="min-w-[1160px]">
                  <TableHeader>
                    <TableRow className="h-11 bg-background hover:bg-background">
                      {visibleColumns.select ? (
                        <TableHead className="w-[44px] px-3">
                          <Checkbox
                            checked={
                              allPageSelected
                                ? true
                                : somePageSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={(checked) =>
                              toggleAllPageSelection(Boolean(checked))
                            }
                            aria-label={t.selected}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.product ? (
                        <TableHead className={cn("min-w-[360px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.productName}
                            sortKey="name"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.price ? (
                        <TableHead className={cn("min-w-[130px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.catalogPrice}
                            sortKey="price"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.category ? (
                        <TableHead className={cn("min-w-[150px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.category}
                            sortKey="category"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.type ? (
                        <TableHead className={cn("min-w-[120px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.type}
                            sortKey="type"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.providerOffers ? (
                        <TableHead className={cn("min-w-[150px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.providerOffers}
                            sortKey="provider_offers"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.orders ? (
                        <TableHead className={cn("min-w-[120px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.orders}
                            sortKey="orders"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.status ? (
                        <TableHead className={cn("min-w-[120px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.status}
                            sortKey="status"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.actions ? (
                        <TableHead className="w-[70px] px-4 text-center">
                          <span className="text-xs font-medium text-foreground">
                            {t.actions}
                          </span>
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {pagedProducts.length ? (
                      pagedProducts.map((product) => {
                        const productId = String(product.id);
                        const productName = getProductName(product, locale);

                        return (
                          <TableRow
                            key={productId}
                            data-state={selectedIds.has(productId) && "selected"}
                            className="h-[62px] border-b bg-background hover:bg-muted/40 data-[state=selected]:bg-muted"
                          >
                            {visibleColumns.select ? (
                              <TableCell className="px-3">
                                <Checkbox
                                  checked={selectedIds.has(productId)}
                                  onCheckedChange={(checked) =>
                                    toggleRowSelection(productId, Boolean(checked))
                                  }
                                  aria-label={t.selected}
                                />
                              </TableCell>
                            ) : null}

                            {visibleColumns.product ? (
                              <TableCell className="px-4">
                                <div className="flex items-center gap-4">
                                  <ProductImage product={product} locale={locale} />

                                  <div className={cn("min-w-0", textAlign)}>
                                    <Link
                                      href={`/system/products/${product.id}`}
                                      className="line-clamp-1 text-sm font-semibold text-foreground transition hover:text-primary"
                                    >
                                      {productName}
                                    </Link>

                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <span className="font-mono">
                                        {product.code || product.sku || t.noCode}
                                      </span>

                                      {product.is_featured ? (
                                        <Badge
                                          variant="outline"
                                          className="rounded-full px-2 py-0 text-[11px]"
                                        >
                                          <Sparkles className="h-3 w-3" />
                                          {t.offerProducts}
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            ) : null}

                            {visibleColumns.price ? (
                              <TableCell className={cn("px-4 text-sm", textAlign)}>
                                <MoneyValue value={getCatalogPrice(product)} />
                              </TableCell>
                            ) : null}

                            {visibleColumns.category ? (
                              <TableCell
                                className={cn(
                                  "px-4 text-sm font-medium text-foreground",
                                  textAlign,
                                )}
                              >
                                {getCategoryName(product, locale, t.noCategory)}
                              </TableCell>
                            ) : null}

                            {visibleColumns.type ? (
                              <TableCell className={cn("px-4", textAlign)}>
                                <TypeBadge
                                  type={getProductType(product)}
                                  locale={locale}
                                />
                              </TableCell>
                            ) : null}

                            {visibleColumns.providerOffers ? (
                              <TableCell className={cn("px-4", textAlign)}>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-full border-[#8c9cdc]/30 bg-[#432a58]/10 px-3 text-xs font-bold text-[#432a58] shadow-none transition hover:border-[#8c9cdc]/60 hover:bg-[#432a58]/15 dark:border-[#8c9cdc]/25 dark:bg-[#8c9cdc]/10 dark:text-[#8c9cdc] dark:hover:bg-[#8c9cdc]/20"
                                  onClick={() => void loadProductOffers(product)}
                                >
                                  <Layers3 className="h-3.5 w-3.5 text-[#432a58] dark:text-[#8c9cdc]" />
                                  {formatNumber(getProviderOffersCount(product))}
                                </Button>
                              </TableCell>
                            ) : null}

                            {visibleColumns.orders ? (
                              <TableCell className={cn("px-4", textAlign)}>
                                <Link
                                  href={`/system/orders?product=${encodeURIComponent(
                                    String(product.id),
                                  )}`}
                                  className="inline-flex h-8 items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 shadow-none transition hover:border-emerald-500/45 hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                                >
                                  <ShoppingCart className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                                  {formatNumber(getProductSalesCount(product))}
                                </Link>
                              </TableCell>
                            ) : null}

                            {visibleColumns.status ? (
                              <TableCell className={cn("px-4", textAlign)}>
                                <StatusBadge
                                  status={getProductStatus(product)}
                                  locale={locale}
                                />
                              </TableCell>
                            ) : null}

                            {visibleColumns.actions ? (
                              <TableCell className="px-4 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="h-8 w-8 rounded-md p-0"
                                    >
                                      <span className="sr-only">{t.actions}</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>{t.actions}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem asChild>
                                      <Link href={`/system/products/${product.id}`}>
                                        <Eye className="h-4 w-4" />
                                        {t.view}
                                      </Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => void loadProductOffers(product)}
                                    >
                                      <Layers3 className="h-4 w-4" />
                                      {t.viewOffers}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => void copyProductId(product)}
                                    >
                                      <Copy className="h-4 w-4" />
                                      {t.copyId}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        );
                      })
                    ) : (
                      <ProductTableEmpty
                        columnsCount={visibleColumnsCount}
                        title={t.noProducts}
                        description={t.noProductsDesc}
                      />
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                {formatNumber(selectedIds.size)} {t.of}{" "}
                {formatNumber(filteredProducts.length)} {t.selectedRows}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPageIndex(0);
                  }}
                >
                  <SelectTrigger className="h-9 w-[120px] rounded-md shadow-none">
                    <span className="text-sm text-muted-foreground">
                      {t.rowsPerPage}
                    </span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {formatNumber(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="px-2 text-sm font-medium text-muted-foreground">
                  {t.page} {formatNumber(safePageIndex + 1)} {t.of}{" "}
                  {formatNumber(pageCount)}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-md shadow-none"
                  onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                  disabled={safePageIndex === 0}
                >
                  {t.previous}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-md shadow-none"
                  onClick={() =>
                    setPageIndex((current) =>
                      Math.min(pageCount - 1, current + 1),
                    )
                  }
                  disabled={safePageIndex >= pageCount - 1}
                >
                  {t.next}
                </Button>
              </div>
            </div>
          </div>

          {selectedProduct ? (
            <Card className="rounded-lg border bg-background shadow-none">
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className={textAlign}>
                    <h2 className="text-xl font-bold text-foreground">
                      {t.selectedProductOffers}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getProductName(selectedProduct, locale)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md shadow-none"
                    onClick={() => {
                      setSelectedProduct(null);
                      setSelectedOffers([]);
                      setOffersError("");
                    }}
                  >
                    <X className="h-4 w-4" />
                    {t.closeOffers}
                  </Button>
                </div>

                {offersLoading ? (
                  <div className="mt-5 space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-14 animate-pulse rounded-lg bg-muted"
                      />
                    ))}
                  </div>
                ) : offersError ? (
                  <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-200">
                    <p className="font-semibold">{t.offersErrorTitle}</p>
                    <p className="mt-1">{offersError}</p>
                  </div>
                ) : selectedOffers.length === 0 ? (
                  <div className="mt-5 flex flex-col items-center justify-center rounded-lg border border-dashed bg-background p-10 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Layers3 className="h-6 w-6" />
                    </div>
                    <p className="mt-4 font-semibold text-foreground">
                      {t.noProviderOffers}
                    </p>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                      {t.noProviderOffersDesc}
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 overflow-x-auto rounded-lg border bg-background">
                    <Table className="min-w-[920px]">
                      <TableHeader>
                        <TableRow className="h-11 bg-background hover:bg-background">
                          <TableHead className={cn("min-w-[240px]", textAlign)}>
                            {t.product}
                          </TableHead>
                          <TableHead className={cn("min-w-[170px]", textAlign)}>
                            {t.provider}
                          </TableHead>
                          <TableHead className={cn("min-w-[140px]", textAlign)}>
                            {t.beforeDiscount}
                          </TableHead>
                          <TableHead className={cn("min-w-[140px]", textAlign)}>
                            {t.afterDiscount}
                          </TableHead>
                          <TableHead className={cn("min-w-[110px]", textAlign)}>
                            {t.discount}
                          </TableHead>
                          <TableHead className={cn("min-w-[130px]", textAlign)}>
                            {t.offerId}
                          </TableHead>
                          <TableHead className={cn("min-w-[130px]", textAlign)}>
                            {t.status}
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {selectedOffers.map((offer, index) => {
                          const offerId = getOfferId(offer) || String(index + 1);
                          const checkoutReady = isOfferCheckoutReady(offer);

                          return (
                            <TableRow key={`${offerId}-${index}`} className="h-14">
                              <TableCell className={textAlign}>
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {getOfferTitle(offer, locale)}
                                  </p>

                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    {offer.offer_badge || offer.badge ? (
                                      <Badge
                                        variant="outline"
                                        className="rounded-full px-2 py-0 text-[11px]"
                                      >
                                        {offer.offer_badge || offer.badge}
                                      </Badge>
                                    ) : null}

                                    {checkoutReady ? (
                                      <Badge
                                        variant="outline"
                                        className="rounded-full border-emerald-500/30 bg-emerald-50 px-2 py-0 text-[11px] text-emerald-700"
                                      >
                                        {t.checkoutReady}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className={textAlign}>
                                {getOfferProviderName(offer, locale, "—")}
                              </TableCell>

                              <TableCell className={textAlign}>
                                <MoneyValue value={getOfferBeforePrice(offer)} />
                              </TableCell>

                              <TableCell className={textAlign}>
                                <MoneyValue value={getOfferAfterPrice(offer)} />
                              </TableCell>

                              <TableCell className={textAlign}>
                                {formatPercent(getOfferDiscount(offer))}
                              </TableCell>

                              <TableCell className={textAlign}>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {offerId}
                                </span>
                              </TableCell>

                              <TableCell className={textAlign}>
                                <StatusBadge
                                  status={
                                    offer.is_active === false
                                      ? "inactive"
                                      : offer.status || "active"
                                  }
                                  locale={locale}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}