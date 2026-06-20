"use client";

/* ============================================================
   📂 app/customer/page.tsx
   🧭 Primey Care | Customer Home Marketplace Page
   ------------------------------------------------------------
   ✅ صفحة محتوى فقط داخل customer/layout الموحد
   ✅ الصفحة الرئيسية للعميل تعرض المنتجات والبطاقات والعروض والشبكة الطبية
   ✅ لا تعرض "لوحة العميل" أو "Primey Care — مساحة العميل"
   ✅ تعتمد على /api/customers/me/ كبيانات عميل اختيارية
   ✅ تجلب المنتجات الرئيسية من /api/products/landing/
   ✅ تجلب العروض الحقيقية من /api/products/offers/
   ✅ تجلب مقدمي الخدمة المتعاقدين من /api/providers/?has_active_contracts=true
   ✅ معالجة آمنة للصور الخارجية بدون كسر next/image
   ✅ w-full space-y-4
   ✅ عربي/إنجليزي عبر primey-locale
   ✅ أرقام إنجليزية دائمًا
   ✅ رمز SAR من /currency/sar.svg
   ✅ sonner
   ✅ بدون localhost أو عبارات تقنية ظاهرة في الواجهة
============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  CreditCard,
  FileText,
  Gift,
  HeartPulse,
  Loader2,
  MapPin,
  PackageCheck,
  Percent,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tags,
  Trophy,
  UserRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Lang = "ar" | "en";
type Dict = Record<string, unknown>;

type ApiResult = {
  ok: boolean;
  payload: unknown;
  message: string;
};

type HomeProduct = {
  id: string;
  name: string;
  subtitle: string;
  providerName: string;
  imageUrl: string;
  marketingImageUrl: string;
  productType: string;
  originalPrice: number;
  price: number;
  discountPercent: number;
  isFeatured: boolean;
  isNew: boolean;
  isOffer: boolean;
  hasActiveContract: boolean;
};

type HomeProvider = {
  id: string;
  name: string;
  city: string;
  region: string;
  category: string;
  discountPercent: number;
  logoUrl: string;
  imageUrl: string;
  isFeatured: boolean;
  hasActiveContract: boolean;
  contractedProductsCount: number;
};

const SAR_ICON = "/currency/sar.svg";

const translations = {
  ar: {
    welcomeBack: "أهلًا بك",
    heroTitle: "اكتشف عروض Primey Care الطبية",
    heroSubtitle:
      "بطاقات خصم، برامج صحية، وعروض حقيقية من عقود مقدمي الخدمة المتعاقدين.",
    refresh: "تحديث",
    refreshSuccess: "تم تحديث الصفحة.",
    loadError: "تعذر تحميل بعض البيانات.",
    retry: "إعادة المحاولة",

    activeCards: "بطاقاتي",
    activeCardsDesc: "تابع بطاقاتك واشتراكاتك",
    myOrders: "طلباتي",
    myOrdersDesc: "تابع الطلبات والخدمات",
    myInvoices: "فواتيري",
    myInvoicesDesc: "الفواتير والمستحقات",
    support: "الدعم",
    supportDesc: "المساعدة والمحادثات",

    productsAndCards: "البطاقات والمنتجات",
    productsAndCardsDesc: "منتجات وبرامج ظاهرة للعميل من البيانات الحقيقية",
    latestOffers: "أحدث العروض",
    latestOffersDesc: "عروض وخصومات مرتبطة بالعقود النشطة",
    topDiscounts: "أعلى الخصومات",
    topDiscountsDesc: "أفضل نسب الخصم المتاحة الآن",
    newArrivals: "الجديد",
    newArrivalsDesc: "أحدث المنتجات والبرامج الصحية",
    medicalNetwork: "الشبكة الطبية",
    medicalNetworkDesc: "مقدمو خدمة لديهم عقود ومنتجات متعاقدة",

    viewMyCards: "عرض بطاقاتي",
    viewOrders: "عرض الطلبات",
    viewInvoices: "عرض الفواتير",
    contactSupport: "تواصل مع الدعم",
    requestOffer: "طلب العرض",
    askForProvider: "استفسار عن مقدم الخدمة",
    viewAllOffers: "عرض كل العروض",
    viewNetwork: "عرض الشبكة الطبية",

    featured: "مميز",
    contracted: "متعاقد",
    new: "جديد",
    offer: "عرض",
    discount: "خصم",
    upTo: "حتى",
    noProducts: "لا توجد منتجات أو بطاقات متاحة حاليًا.",
    noOffers: "لا توجد عروض متاحة حاليًا.",
    noProviders: "لا توجد بيانات شبكة طبية متاحة حاليًا.",
    provider: "مقدم الخدمة",
    noData: "غير متوفر",
    from: "ابتداءً من",
    productsCount: "منتجات متعاقدة",

    customer: "عميل Primey Care",
  },
  en: {
    welcomeBack: "Welcome back",
    heroTitle: "Discover Primey Care medical offers",
    heroSubtitle:
      "Discount cards, healthcare programs, and real offers from active provider contracts.",
    refresh: "Refresh",
    refreshSuccess: "Page refreshed.",
    loadError: "Unable to load some data.",
    retry: "Retry",

    activeCards: "My Cards",
    activeCardsDesc: "Manage cards and subscriptions",
    myOrders: "My Orders",
    myOrdersDesc: "Track orders and services",
    myInvoices: "My Invoices",
    myInvoicesDesc: "Invoices and dues",
    support: "Support",
    supportDesc: "Help and conversations",

    productsAndCards: "Cards & Products",
    productsAndCardsDesc: "Customer-facing products and programs from real data",
    latestOffers: "Latest Offers",
    latestOffersDesc: "Offers and discounts linked to active contracts",
    topDiscounts: "Top Discounts",
    topDiscountsDesc: "Best discount rates available now",
    newArrivals: "New Arrivals",
    newArrivalsDesc: "Latest cards and healthcare programs",
    medicalNetwork: "Medical Network",
    medicalNetworkDesc: "Providers with active contracts and contracted products",

    viewMyCards: "View my cards",
    viewOrders: "View orders",
    viewInvoices: "View invoices",
    contactSupport: "Contact support",
    requestOffer: "Request offer",
    askForProvider: "Ask about provider",
    viewAllOffers: "View all offers",
    viewNetwork: "View medical network",

    featured: "Featured",
    contracted: "Contracted",
    new: "New",
    offer: "Offer",
    discount: "Discount",
    upTo: "Up to",
    noProducts: "No cards or products are currently available.",
    noOffers: "No offers are currently available.",
    noProviders: "No medical network data is currently available.",
    provider: "Provider",
    noData: "Not available",
    from: "From",
    productsCount: "Contracted products",

    customer: "Primey Care Customer",
  },
} as const;

function readLang(): Lang {
  try {
    if (typeof window === "undefined") return "ar";

    const saved = window.localStorage.getItem("primey-locale");
    if (saved === "en") return "en";
    if (saved === "ar") return "ar";

    return document.documentElement.lang?.startsWith("en") ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function apiUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  if (!base) return path;

  return `${base.replace(/\/$/, "")}${path}`;
}

async function safeFetch(path: string): Promise<ApiResult> {
  try {
    const res = await fetch(apiUrl(path), {
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const payload = await res.json().catch(() => null);
    const payloadDict = asDict(payload);

    if (
      !res.ok ||
      payloadDict.ok === false ||
      payloadDict.success === false ||
      payloadDict.status === false
    ) {
      return {
        ok: false,
        payload,
        message:
          String(payloadDict.message || "") ||
          String(payloadDict.detail || "") ||
          String(payloadDict.error || "") ||
          "Request failed",
      };
    }

    return {
      ok: true,
      payload,
      message: "",
    };
  } catch (error) {
    return {
      ok: false,
      payload: null,
      message: error instanceof Error ? error.message : "Request failed",
    };
  }
}

function asDict(value: unknown): Dict {
  return value && typeof value === "object" ? (value as Dict) : {};
}

function getValue(obj: Dict, key: string): unknown {
  const direct = obj[key];

  if (direct !== undefined && direct !== null && direct !== "") return direct;

  for (const container of [
    "data",
    "profile",
    "customer",
    "provider",
    "product",
    "summary",
    "pricing",
    "meta",
    "active_contract",
    "contract_product",
  ]) {
    const nested = obj[container];

    if (nested && typeof nested === "object") {
      const value = (nested as Dict)[key];

      if (value !== undefined && value !== null && value !== "") return value;
    }
  }

  return undefined;
}

function unwrapList(payload: unknown): unknown[] {
  const root = asDict(payload);
  const data = asDict(root.data);

  const candidates = [
    root.results,
    root.items,
    root.products,
    root.providers,
    root.offers,
    root.data,
    data.results,
    data.items,
    data.products,
    data.providers,
    data.offers,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function unwrapCustomer(payload: unknown) {
  const root = asDict(payload);
  const data = asDict(root.data);
  const customer = asDict(data.customer || root.customer || root.data || {});

  const firstName = String(getValue(customer, "first_name") || "");
  const lastName = String(getValue(customer, "last_name") || "");
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    name: String(
      getValue(customer, "display_name") ||
        getValue(customer, "full_name") ||
        fullName ||
        getValue(customer, "name") ||
        "",
    ),
  };
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(
    String(value ?? "")
      .replace(/[^\d.-]/g, "")
      .trim(),
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;

  const text = String(value ?? "").toLowerCase().trim();

  return ["1", "true", "yes", "active", "featured", "published"].includes(text);
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("en-US").format(toNumber(value));
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function normalizeImageUrl(value: unknown) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (
    raw.includes("example.com") ||
    raw.includes("placeholder.com") ||
    raw.includes("placehold.co")
  ) {
    return "";
  }

  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("https://")) return raw;

  if (raw.startsWith("http://")) return "";

  return `/${raw.replace(/^\/+/, "")}`;
}

function isExternalImage(src: string) {
  return src.startsWith("https://");
}

function SafeImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = "",
  sizes,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  sizes?: string;
}) {
  if (!src) return null;

  if (isExternalImage(src)) {
    if (fill) {
      return (
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 h-full w-full ${className}`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      );
    }

    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 56}
      height={height || 56}
      className={className}
    />
  );
}

function productName(item: Dict, lang: Lang) {
  return String(
    (lang === "ar"
      ? getValue(item, "name_ar") || getValue(item, "title_ar")
      : getValue(item, "name_en") || getValue(item, "title_en")) ||
      getValue(item, "offer_title") ||
      getValue(item, "name") ||
      getValue(item, "title") ||
      getValue(item, "product_name") ||
      "",
  );
}

function productSubtitle(item: Dict, lang: Lang) {
  return String(
    (lang === "ar"
      ? getValue(item, "description_ar") ||
        getValue(item, "short_description_ar") ||
        getValue(item, "offer_subtitle")
      : getValue(item, "description_en") ||
        getValue(item, "short_description_en") ||
        getValue(item, "offer_subtitle")) ||
      getValue(item, "description") ||
      getValue(item, "short_description") ||
      "",
  );
}

function providerNameFromItem(item: Dict, lang: Lang) {
  const provider = asDict(getValue(item, "provider") || item.provider || {});

  return String(
    (lang === "ar"
      ? getValue(provider, "name_ar") || getValue(provider, "display_name_ar")
      : getValue(provider, "name_en") || getValue(provider, "display_name_en")) ||
      getValue(provider, "name") ||
      getValue(item, "provider_name") ||
      getValue(item, "provider_display_name") ||
      "",
  );
}

function normalizeProduct(item: unknown, lang: Lang): HomeProduct {
  const dict = asDict(item);

  const originalPrice = toNumber(
    getValue(dict, "price_before_discount") ||
      getValue(dict, "original_price") ||
      getValue(dict, "base_price") ||
      getValue(dict, "price") ||
      getValue(dict, "amount"),
  );

  const price = toNumber(
    getValue(dict, "price_after_discount") ||
      getValue(dict, "sale_price") ||
      getValue(dict, "discounted_price") ||
      getValue(dict, "final_price") ||
      getValue(dict, "effective_price") ||
      getValue(dict, "price") ||
      originalPrice,
  );

  const explicitDiscount = toNumber(
    getValue(dict, "discount_percent") ||
      getValue(dict, "discount_percentage") ||
      getValue(dict, "discount_rate") ||
      getValue(dict, "contract_discount_percent"),
  );

  const calculatedDiscount =
    originalPrice > 0 && price > 0 && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  const discountPercent = explicitDiscount || calculatedDiscount;

  const createdAt = String(getValue(dict, "created_at") || "");
  const createdDate = createdAt ? new Date(createdAt) : null;

  const daysSinceCreate =
    createdDate && !Number.isNaN(createdDate.getTime())
      ? (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      : 9999;

  const hasActiveContract =
    toBoolean(getValue(dict, "has_active_contract")) ||
    toBoolean(getValue(dict, "has_active_contracts")) ||
    Boolean(getValue(dict, "active_contract_id")) ||
    Boolean(getValue(dict, "contract_product_id"));

  return {
    id: String(getValue(dict, "id") || getValue(dict, "uuid") || ""),
    name: productName(dict, lang),
    subtitle: productSubtitle(dict, lang),
    providerName: providerNameFromItem(dict, lang),
    imageUrl: normalizeImageUrl(
      getValue(dict, "image_url") ||
        getValue(dict, "image") ||
        getValue(dict, "thumbnail") ||
        getValue(dict, "thumbnail_image_url") ||
        getValue(dict, "logo_url"),
    ),
    marketingImageUrl: normalizeImageUrl(
      getValue(dict, "marketing_image_url") ||
        getValue(dict, "marketing_image") ||
        getValue(dict, "cover_image") ||
        getValue(dict, "banner_image"),
    ),
    productType: String(
      getValue(dict, "product_type") ||
        getValue(dict, "type") ||
        getValue(dict, "category") ||
        "",
    ),
    originalPrice,
    price,
    discountPercent,
    isFeatured:
      toBoolean(getValue(dict, "is_featured")) ||
      toBoolean(getValue(dict, "featured")) ||
      toBoolean(getValue(dict, "show_on_landing")) ||
      toBoolean(getValue(dict, "show_in_landing")),
    isNew:
      toBoolean(getValue(dict, "is_new")) ||
      toBoolean(getValue(dict, "new")) ||
      daysSinceCreate <= 30,
    isOffer:
      toBoolean(getValue(dict, "is_offer")) ||
      toBoolean(getValue(dict, "show_in_offers")) ||
      toBoolean(getValue(dict, "show_on_offers")) ||
      discountPercent > 0 ||
      hasActiveContract,
    hasActiveContract,
  };
}

function normalizeProvider(item: unknown, lang: Lang): HomeProvider {
  const dict = asDict(item);

  const name = String(
    (lang === "ar"
      ? getValue(dict, "name_ar") || getValue(dict, "display_name_ar")
      : getValue(dict, "name_en") || getValue(dict, "display_name_en")) ||
      getValue(dict, "name") ||
      getValue(dict, "provider_name") ||
      "",
  );

  return {
    id: String(getValue(dict, "id") || getValue(dict, "uuid") || ""),
    name,
    city: String(getValue(dict, "city") || getValue(dict, "city_name") || ""),
    region: String(getValue(dict, "region") || getValue(dict, "region_name") || ""),
    category: String(
      getValue(dict, "category") ||
        getValue(dict, "classification") ||
        getValue(dict, "source_category") ||
        getValue(dict, "provider_type") ||
        "",
    ),
    discountPercent: toNumber(
      getValue(dict, "discount_percent") ||
        getValue(dict, "max_discount_percent") ||
        getValue(dict, "highest_discount_percent") ||
        getValue(dict, "discount_percentage"),
    ),
    logoUrl: normalizeImageUrl(
      getValue(dict, "logo_url") ||
        getValue(dict, "logo") ||
        getValue(dict, "provider_logo"),
    ),
    imageUrl: normalizeImageUrl(
      getValue(dict, "image_url") ||
        getValue(dict, "image") ||
        getValue(dict, "cover_image") ||
        getValue(dict, "banner_image"),
    ),
    isFeatured:
      toBoolean(getValue(dict, "is_featured")) ||
      toBoolean(getValue(dict, "featured")),
    hasActiveContract:
      toBoolean(getValue(dict, "has_active_contract")) ||
      toBoolean(getValue(dict, "has_active_contracts")) ||
      toBoolean(getValue(dict, "active_contract")) ||
      toBoolean(getValue(dict, "contracted")) ||
      toBoolean(getValue(dict, "has_marketing_contract")),
    contractedProductsCount: toNumber(
      getValue(dict, "contracted_products_count") ||
        getValue(dict, "products_with_active_contracts"),
    ),
  };
}

function SarAmount({
  value,
  className = "",
}: {
  value: unknown;
  className?: string;
}) {
  return (
    <div dir="ltr" className={`inline-flex items-center gap-1.5 ${className}`}>
      <span>{formatMoney(value)}</span>
      <Image
        src={SAR_ICON}
        alt="SAR"
        width={16}
        height={16}
        className="h-4 w-4 shrink-0"
      />
    </div>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>

        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function ProductCard({
  product,
  lang,
  labels,
}: {
  product: HomeProduct;
  lang: Lang;
  labels: typeof translations.ar | typeof translations.en;
}) {
  const image = product.marketingImageUrl || product.imageUrl;
  const hasDiscount = product.discountPercent > 0;

  return (
    <Card className="overflow-hidden">
      <div className="relative min-h-36 bg-muted/30">
        {image ? (
          <SafeImage
            src={image}
            alt={product.name || labels.productsAndCards}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex min-h-36 items-center justify-center">
            <PackageCheck className="h-10 w-10 text-muted-foreground/60" />
          </div>
        )}

        <div className="absolute inset-x-3 top-3 flex flex-wrap items-center gap-2">
          {product.hasActiveContract ? (
            <Badge className="rounded-full">
              <BadgeCheck className="h-3.5 w-3.5" />
              {labels.contracted}
            </Badge>
          ) : null}

          {product.isFeatured ? (
            <Badge className="rounded-full" variant="secondary">
              <Star className="h-3.5 w-3.5" />
              {labels.featured}
            </Badge>
          ) : null}

          {product.isNew ? (
            <Badge variant="secondary" className="rounded-full">
              <Sparkles className="h-3.5 w-3.5" />
              {labels.new}
            </Badge>
          ) : null}

          {hasDiscount ? (
            <Badge variant="destructive" className="rounded-full">
              <Percent className="h-3.5 w-3.5" />
              {formatNumber(product.discountPercent)}%
            </Badge>
          ) : null}
        </div>
      </div>

      <CardContent className="space-y-4 p-4">
        <div className="space-y-1">
          <div className="line-clamp-1 font-bold">
            {product.name || labels.noData}
          </div>

          <div className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
            {product.subtitle || product.providerName || labels.productsAndCards}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {product.productType ? (
            <Badge variant="outline" className="rounded-full">
              {product.productType.replaceAll("_", " ")}
            </Badge>
          ) : null}

          {product.providerName ? (
            <Badge variant="secondary" className="rounded-full">
              {product.providerName}
            </Badge>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-background p-3">
          <div className="mb-2 text-xs text-muted-foreground">{labels.from}</div>

          <div className="flex items-end justify-between gap-3">
            <SarAmount
              value={product.price || product.originalPrice}
              className="text-lg font-black"
            />

            {hasDiscount && product.originalPrice > 0 ? (
              <div className="text-xs text-muted-foreground line-through">
                <SarAmount value={product.originalPrice} />
              </div>
            ) : null}
          </div>
        </div>

        <Link href="/customer/support" className="block">
          <Button className="h-10 w-full rounded-xl">
            <ShoppingBag className={lang === "ar" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
            {labels.requestOffer}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function CompactOfferCard({
  product,
  labels,
}: {
  product: HomeProduct;
  labels: typeof translations.ar | typeof translations.en;
}) {
  const image = product.marketingImageUrl || product.imageUrl;

  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-background p-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
        {image ? (
          <SafeImage
            src={image}
            alt={product.name || labels.offer}
            width={56}
            height={56}
            className="h-14 w-14 object-cover"
          />
        ) : (
          <Gift className="h-6 w-6 text-primary" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">
          {product.name || labels.noData}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {product.providerName ? <span>{product.providerName}</span> : null}

          {product.hasActiveContract ? (
            <Badge variant="secondary" className="rounded-full">
              {labels.contracted}
            </Badge>
          ) : null}

          {product.discountPercent > 0 ? (
            <Badge variant="destructive" className="rounded-full">
              {labels.discount} {formatNumber(product.discountPercent)}%
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 text-sm font-bold">
        <SarAmount value={product.price || product.originalPrice} />
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  labels,
}: {
  provider: HomeProvider;
  labels: typeof translations.ar | typeof translations.en;
}) {
  const image = provider.logoUrl || provider.imageUrl;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
            {image ? (
              <SafeImage
                src={image}
                alt={provider.name || labels.provider}
                width={56}
                height={56}
                className="h-14 w-14 object-cover"
              />
            ) : (
              <HeartPulse className="h-7 w-7 text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 font-bold">
              {provider.name || labels.provider}
            </div>

            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="line-clamp-1">
                {[provider.region, provider.city].filter(Boolean).join(" - ") ||
                  labels.noData}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {provider.category ? (
            <Badge variant="outline" className="rounded-full">
              {provider.category}
            </Badge>
          ) : null}

          {provider.hasActiveContract ? (
            <Badge variant="secondary" className="rounded-full">
              <BadgeCheck className="h-3.5 w-3.5" />
              {labels.contracted}
            </Badge>
          ) : null}

          {provider.discountPercent > 0 ? (
            <Badge variant="destructive" className="rounded-full">
              {labels.upTo} {formatNumber(provider.discountPercent)}%
            </Badge>
          ) : null}
        </div>

        {provider.contractedProductsCount > 0 ? (
          <div className="rounded-2xl border bg-background p-3 text-xs text-muted-foreground">
            {labels.productsCount}:{" "}
            <span className="font-bold text-foreground">
              {formatNumber(provider.contractedProductsCount)}
            </span>
          </div>
        ) : null}

        <Link href="/customer/support" className="block">
          <Button variant="outline" className="h-10 w-full rounded-xl">
            {labels.askForProvider}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>

          <div className="min-w-0">
            <div className="font-bold">{title}</div>
            <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {description}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function CustomerHomePage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [customerPayload, setCustomerPayload] = useState<unknown>(null);
  const [landingPayload, setLandingPayload] = useState<unknown>(null);
  const [offersPayload, setOffersPayload] = useState<unknown>(null);
  const [providersPayload, setProvidersPayload] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [softError, setSoftError] = useState("");

  const t = useMemo(() => translations[lang], [lang]);
  const isArabic = lang === "ar";

  const customer = useMemo(() => unwrapCustomer(customerPayload), [customerPayload]);

  const products = useMemo(() => {
    return unwrapList(landingPayload)
      .map((item) => normalizeProduct(item, lang))
      .filter((item) => item.id || item.name)
      .slice(0, 12);
  }, [landingPayload, lang]);

  const offers = useMemo(() => {
    return unwrapList(offersPayload)
      .map((item) => normalizeProduct(item, lang))
      .filter((item) => item.id || item.name)
      .filter((item) => item.isOffer || item.discountPercent > 0 || item.hasActiveContract)
      .slice(0, 12);
  }, [offersPayload, lang]);

  const providers = useMemo(() => {
    return unwrapList(providersPayload)
      .map((item) => normalizeProvider(item, lang))
      .filter((item) => item.id || item.name)
      .filter(
        (item) =>
          item.hasActiveContract || item.isFeatured || item.discountPercent > 0,
      )
      .slice(0, 8);
  }, [providersPayload, lang]);

  const featuredProducts = useMemo(() => {
    const featured = products.filter((item) => item.isFeatured || item.hasActiveContract);
    return (featured.length ? featured : products).slice(0, 6);
  }, [products]);

  const latestOffers = useMemo(() => {
    return (offers.length ? offers : products.filter((item) => item.isOffer)).slice(0, 5);
  }, [offers, products]);

  const topDiscounts = useMemo(() => {
    return [...offers, ...products]
      .filter((item, index, arr) => {
        const key = item.id || item.name;
        return item.discountPercent > 0 && arr.findIndex((row) => (row.id || row.name) === key) === index;
      })
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, 5);
  }, [offers, products]);

  const newProducts = useMemo(() => {
    const items = products.filter((item) => item.isNew);
    return (items.length ? items : products).slice(0, 3);
  }, [products]);

  const bestDiscount = topDiscounts[0]?.discountPercent || 0;

  async function load(showToast = false) {
    setLoading(true);
    setSoftError("");

    const [customerResult, landingResult, offersResult, providersResult] =
      await Promise.all([
        safeFetch("/api/customers/me/"),
        safeFetch(
          "/api/products/landing/?page=1&page_size=12&include_children=false&sort=contracted",
        ),
        safeFetch(
          "/api/products/offers/?page=1&page_size=12&include_children=false&sort=highest_discount",
        ),
        safeFetch(
          "/api/providers/?page=1&page_size=8&is_active=true&has_active_contracts=true&sort=highest_discount",
        ),
      ]);

    setCustomerPayload(customerResult.ok ? customerResult.payload : null);
    setLandingPayload(landingResult.ok ? landingResult.payload : null);
    setOffersPayload(offersResult.ok ? offersResult.payload : null);
    setProvidersPayload(providersResult.ok ? providersResult.payload : null);

    if (!landingResult.ok || !offersResult.ok || !providersResult.ok) {
      setSoftError(t.loadError);
      toast.error(t.loadError);
    }

    setLoading(false);

    if (showToast) {
      toast.success(t.refreshSuccess);
    }
  }

  useEffect(() => {
    const syncLang = () => setLang(readLang());

    syncLang();

    window.addEventListener("primey-locale-changed", syncLang);
    window.addEventListener("storage", syncLang);

    return () => {
      window.removeEventListener("primey-locale-changed", syncLang);
      window.removeEventListener("storage", syncLang);
    };
  }, []);

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative grid gap-6 p-5 md:grid-cols-[1.35fr_0.65fr] md:p-7">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-muted/30" />

          <div className="relative z-10 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t.welcomeBack}
              {customer.name ? `، ${customer.name}` : `، ${t.customer}`}
            </div>

            <div className="max-w-3xl space-y-2">
              <h1 className="text-2xl font-black tracking-tight md:text-4xl">
                {t.heroTitle}
              </h1>

              <p className="text-sm leading-7 text-muted-foreground md:text-base">
                {t.heroSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/customer/offers">
                <Button className="h-11 rounded-xl">
                  <Gift className={isArabic ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                  {t.viewAllOffers}
                </Button>
              </Link>

              <Link href="/customer/network">
                <Button variant="outline" className="h-11 rounded-xl">
                  <HeartPulse className={isArabic ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                  {t.viewNetwork}
                </Button>
              </Link>

              <Button
                variant="ghost"
                className="h-11 rounded-xl"
                disabled={loading}
                onClick={() => void load(true)}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                {t.refresh}
              </Button>
            </div>
          </div>

          <div className="relative z-10 grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <Card className="bg-background/80 backdrop-blur">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {t.productsAndCards}
                  </div>
                  <div className="mt-1 text-2xl font-black">
                    {formatNumber(products.length)}
                  </div>
                </div>
                <PackageCheck className="h-7 w-7 text-primary" />
              </CardContent>
            </Card>

            <Card className="bg-background/80 backdrop-blur">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {t.topDiscounts}
                  </div>
                  <div className="mt-1 text-2xl font-black">
                    {bestDiscount ? `${formatNumber(bestDiscount)}%` : "0%"}
                  </div>
                </div>
                <Trophy className="h-7 w-7 text-primary" />
              </CardContent>
            </Card>

            <Card className="bg-background/80 backdrop-blur">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {t.medicalNetwork}
                  </div>
                  <div className="mt-1 text-2xl font-black">
                    {formatNumber(providers.length)}
                  </div>
                </div>
                <HeartPulse className="h-7 w-7 text-primary" />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {softError ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div className="font-semibold text-destructive">{softError}</div>

            <Button variant="outline" onClick={() => void load(true)}>
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <QuickActionCard
          href="/customer/cards"
          icon={<CreditCard className="h-5 w-5" />}
          title={t.activeCards}
          description={t.activeCardsDesc}
        />

        <QuickActionCard
          href="/customer/orders"
          icon={<ShoppingBag className="h-5 w-5" />}
          title={t.myOrders}
          description={t.myOrdersDesc}
        />

        <QuickActionCard
          href="/customer/invoices"
          icon={<FileText className="h-5 w-5" />}
          title={t.myInvoices}
          description={t.myInvoicesDesc}
        />

        <QuickActionCard
          href="/customer/support"
          icon={<UserRound className="h-5 w-5" />}
          title={t.support}
          description={t.supportDesc}
        />
      </div>

      {loading ? (
        <LoadingCard label={t.productsAndCards} />
      ) : (
        <>
          <section className="space-y-4">
            <SectionHeader
              icon={<PackageCheck className="h-5 w-5" />}
              title={t.productsAndCards}
              description={t.productsAndCardsDesc}
            />

            {featuredProducts.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={`${product.id}-${product.name}`}
                    product={product}
                    lang={lang}
                    labels={t}
                  />
                ))}
              </div>
            ) : (
              <EmptyState>{t.noProducts}</EmptyState>
            )}
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-primary" />
                      {t.latestOffers}
                    </CardTitle>
                    <CardDescription>{t.latestOffersDesc}</CardDescription>
                  </div>

                  <Link href="/customer/offers">
                    <Button variant="outline" size="sm" className="rounded-xl">
                      {t.viewAllOffers}
                    </Button>
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {latestOffers.length ? (
                  latestOffers.map((product) => (
                    <CompactOfferCard
                      key={`${product.id}-offer-${product.name}`}
                      product={product}
                      labels={t}
                    />
                  ))
                ) : (
                  <EmptyState>{t.noOffers}</EmptyState>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" />
                  {t.topDiscounts}
                </CardTitle>
                <CardDescription>{t.topDiscountsDesc}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {topDiscounts.length ? (
                  topDiscounts.map((product) => (
                    <CompactOfferCard
                      key={`${product.id}-discount-${product.name}`}
                      product={product}
                      labels={t}
                    />
                  ))
                ) : (
                  <EmptyState>{t.noOffers}</EmptyState>
                )}
              </CardContent>
            </Card>
          </div>

          <section className="space-y-4">
            <SectionHeader
              icon={<Sparkles className="h-5 w-5" />}
              title={t.newArrivals}
              description={t.newArrivalsDesc}
            />

            {newProducts.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {newProducts.map((product) => (
                  <ProductCard
                    key={`${product.id}-new-${product.name}`}
                    product={product}
                    lang={lang}
                    labels={t}
                  />
                ))}
              </div>
            ) : (
              <EmptyState>{t.noProducts}</EmptyState>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeader
              icon={<HeartPulse className="h-5 w-5" />}
              title={t.medicalNetwork}
              description={t.medicalNetworkDesc}
              action={
                <Link href="/customer/network">
                  <Button variant="outline" className="rounded-xl">
                    {t.viewNetwork}
                  </Button>
                </Link>
              }
            />

            {providers.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {providers.map((provider) => (
                  <ProviderCard
                    key={`${provider.id}-${provider.name}`}
                    provider={provider}
                    labels={t}
                  />
                ))}
              </div>
            ) : (
              <EmptyState>{t.noProviders}</EmptyState>
            )}
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t.support}
              </CardTitle>
              <CardDescription>{t.supportDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Link
                  href="/customer/offers"
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 transition hover:bg-muted/40"
                >
                  <span className="inline-flex items-center gap-2 font-medium">
                    <Gift className="h-4 w-4 text-primary" />
                    {t.viewAllOffers}
                  </span>
                  <span className="text-muted-foreground">←</span>
                </Link>

                <Link
                  href="/customer/network"
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 transition hover:bg-muted/40"
                >
                  <span className="inline-flex items-center gap-2 font-medium">
                    <HeartPulse className="h-4 w-4 text-primary" />
                    {t.viewNetwork}
                  </span>
                  <span className="text-muted-foreground">←</span>
                </Link>

                <Link
                  href="/customer/support"
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 transition hover:bg-muted/40"
                >
                  <span className="inline-flex items-center gap-2 font-medium">
                    <Tags className="h-4 w-4 text-primary" />
                    {t.contactSupport}
                  </span>
                  <span className="text-muted-foreground">←</span>
                </Link>
              </div>

              <Separator />

              <div className="text-xs leading-6 text-muted-foreground">
                {t.heroSubtitle}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}