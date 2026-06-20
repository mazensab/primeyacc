"use client";

/* ============================================================
   📂 app/customer/offers/page.tsx
   🧭 Primey Care | Customer Offers Page
   ------------------------------------------------------------
   ✅ صفحة محتوى فقط داخل customer/layout الموحد
   ✅ تعرض عروض Primey Care للعميل
   ✅ تجلب العروض الحقيقية من /api/products/offers/
   ✅ تقرأ الأسعار والخصومات من عقود التسويق النشطة
   ✅ تدعم البحث والفلاتر والترتيب محليًا
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
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Gift,
  HeartPulse,
  Loader2,
  PackageCheck,
  Percent,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tags,
  Trophy,
  X,
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

type OfferItem = {
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
  showOnLanding: boolean;
  hasActiveContract: boolean;
  activeContractNumber: string;
  activeContractTitle: string;
  createdAt: string;
};

type SortKey = "latest" | "highest_discount" | "lowest_price" | "highest_price";
type DiscountFilter = "all" | "any" | "10" | "25" | "50";
type TypeFilter = "all" | "card" | "program" | "service" | "membership" | "package";

const SAR_ICON = "/currency/sar.svg";

const translations = {
  ar: {
    pageTitle: "العروض والخصومات",
    pageSubtitle:
      "استعرض أحدث عروض Primey Care المرتبطة بعقود مقدمي الخدمة النشطة.",
    backHome: "الرئيسية",
    medicalNetwork: "الشبكة الطبية",
    refresh: "تحديث",
    refreshSuccess: "تم تحديث العروض.",
    loadError: "تعذر تحميل العروض.",
    retry: "إعادة المحاولة",

    totalOffers: "إجمالي العروض",
    highestDiscount: "أعلى خصم",
    newOffers: "الجديد",
    contractedOffers: "عروض متعاقدة",

    searchPlaceholder: "ابحث باسم العرض أو مقدم الخدمة...",
    typeFilter: "نوع العرض",
    discountFilter: "الخصم",
    sortBy: "الترتيب",
    clearFilters: "مسح الفلاتر",

    all: "الكل",
    card: "بطاقات",
    program: "برامج",
    service: "خدمات",
    membership: "عضويات",
    package: "باقات",

    anyDiscount: "أي خصم",
    discount10: "10% فأكثر",
    discount25: "25% فأكثر",
    discount50: "50% فأكثر",

    latest: "الأحدث",
    highestDiscountSort: "الأعلى خصمًا",
    lowestPrice: "الأقل سعرًا",
    highestPrice: "الأعلى سعرًا",

    featured: "مميز",
    contracted: "متعاقد",
    new: "جديد",
    offer: "عرض",
    discount: "خصم",
    from: "ابتداءً من",
    beforeDiscount: "قبل الخصم",
    afterDiscount: "بعد الخصم",
    provider: "مقدم الخدمة",
    requestOffer: "طلب العرض",
    contactSupport: "تواصل مع الدعم",
    noData: "غير متوفر",

    emptyTitle: "لا توجد عروض مطابقة",
    emptyDesc:
      "غيّر كلمات البحث أو الفلاتر لعرض المزيد من العروض المتاحة حاليًا.",
    noOffers: "لا توجد عروض متاحة حاليًا.",

    helpTitle: "تحتاج مساعدة في اختيار العرض؟",
    helpDesc:
      "فريق الدعم يساعدك في اختيار البطاقة أو البرنامج المناسب لك حسب المدينة ومقدم الخدمة.",
  },
  en: {
    pageTitle: "Offers & Discounts",
    pageSubtitle:
      "Explore the latest Primey Care offers linked to active provider contracts.",
    backHome: "Home",
    medicalNetwork: "Medical Network",
    refresh: "Refresh",
    refreshSuccess: "Offers refreshed.",
    loadError: "Unable to load offers.",
    retry: "Retry",

    totalOffers: "Total offers",
    highestDiscount: "Highest discount",
    newOffers: "New",
    contractedOffers: "Contracted offers",

    searchPlaceholder: "Search by offer or provider...",
    typeFilter: "Offer type",
    discountFilter: "Discount",
    sortBy: "Sort by",
    clearFilters: "Clear filters",

    all: "All",
    card: "Cards",
    program: "Programs",
    service: "Services",
    membership: "Memberships",
    package: "Packages",

    anyDiscount: "Any discount",
    discount10: "10%+",
    discount25: "25%+",
    discount50: "50%+",

    latest: "Latest",
    highestDiscountSort: "Highest discount",
    lowestPrice: "Lowest price",
    highestPrice: "Highest price",

    featured: "Featured",
    contracted: "Contracted",
    new: "New",
    offer: "Offer",
    discount: "Discount",
    from: "From",
    beforeDiscount: "Before discount",
    afterDiscount: "After discount",
    provider: "Provider",
    requestOffer: "Request offer",
    contactSupport: "Contact support",
    noData: "Not available",

    emptyTitle: "No matching offers",
    emptyDesc:
      "Change your search or filters to view more currently available offers.",
    noOffers: "No offers are currently available.",

    helpTitle: "Need help choosing an offer?",
    helpDesc:
      "Support can help you choose the right card or program based on your city and preferred provider.",
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
    root.offers,
    root.data,
    data.results,
    data.items,
    data.products,
    data.offers,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
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

function normalizeType(value: string): TypeFilter | "other" {
  const text = value.toLowerCase().trim();

  if (["card", "cards", "بطاقة", "بطاقات"].includes(text)) return "card";
  if (["program", "programs", "برنامج", "برامج"].includes(text)) return "program";
  if (["service", "services", "خدمة", "خدمات"].includes(text)) return "service";
  if (["membership", "memberships", "عضوية", "عضويات"].includes(text)) return "membership";
  if (["package", "packages", "bundle", "باقة", "باقات"].includes(text)) return "package";

  return "other";
}

function normalizeOffer(item: unknown, lang: Lang): OfferItem {
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
      getValue(dict, "discounted_price") ||
      getValue(dict, "final_price") ||
      getValue(dict, "effective_price") ||
      getValue(dict, "sale_price") ||
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

  const showOnLanding =
    toBoolean(getValue(dict, "show_on_landing")) ||
    toBoolean(getValue(dict, "show_in_landing")) ||
    toBoolean(getValue(dict, "show_on_mobile")) ||
    toBoolean(getValue(dict, "show_in_offers")) ||
    toBoolean(getValue(dict, "show_on_offers"));

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
      toBoolean(getValue(dict, "featured")),
    isNew:
      toBoolean(getValue(dict, "is_new")) ||
      toBoolean(getValue(dict, "new")) ||
      daysSinceCreate <= 30,
    isOffer:
      toBoolean(getValue(dict, "is_offer")) ||
      toBoolean(getValue(dict, "show_in_offers")) ||
      toBoolean(getValue(dict, "show_on_offers")) ||
      discountPercent > 0 ||
      hasActiveContract ||
      showOnLanding,
    showOnLanding,
    hasActiveContract,
    activeContractNumber: String(getValue(dict, "active_contract_number") || ""),
    activeContractTitle: String(getValue(dict, "active_contract_title") || ""),
    createdAt,
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

function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </div>

        <div>
          <div className="font-bold">{title}</div>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="mt-1 text-2xl font-black">{value}</div>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function OfferCard({
  offer,
  lang,
  labels,
}: {
  offer: OfferItem;
  lang: Lang;
  labels: typeof translations.ar | typeof translations.en;
}) {
  const image = offer.marketingImageUrl || offer.imageUrl;
  const hasDiscount = offer.discountPercent > 0;
  const isArabic = lang === "ar";

  return (
    <Card className="overflow-hidden">
      <div className="relative min-h-44 bg-muted/30">
        {image ? (
          <SafeImage
            src={image}
            alt={offer.name || labels.offer}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex min-h-44 items-center justify-center">
            <Gift className="h-12 w-12 text-muted-foreground/60" />
          </div>
        )}

        <div className="absolute inset-x-3 top-3 flex flex-wrap items-center gap-2">
          {offer.hasActiveContract ? (
            <Badge className="rounded-full">
              <BadgeCheck className="h-3.5 w-3.5" />
              {labels.contracted}
            </Badge>
          ) : null}

          {offer.isFeatured ? (
            <Badge variant="secondary" className="rounded-full">
              <Star className="h-3.5 w-3.5" />
              {labels.featured}
            </Badge>
          ) : null}

          {offer.isNew ? (
            <Badge variant="secondary" className="rounded-full">
              <Sparkles className="h-3.5 w-3.5" />
              {labels.new}
            </Badge>
          ) : null}

          {hasDiscount ? (
            <Badge variant="destructive" className="rounded-full">
              <Percent className="h-3.5 w-3.5" />
              {formatNumber(offer.discountPercent)}%
            </Badge>
          ) : null}
        </div>
      </div>

      <CardContent className="space-y-4 p-4">
        <div className="space-y-1">
          <div className="line-clamp-1 text-base font-black">
            {offer.name || labels.noData}
          </div>

          <div className="line-clamp-2 min-h-10 text-sm leading-6 text-muted-foreground">
            {offer.subtitle || offer.providerName || labels.pageSubtitle}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {offer.productType ? (
            <Badge variant="outline" className="rounded-full">
              {offer.productType.replaceAll("_", " ")}
            </Badge>
          ) : null}

          {offer.providerName ? (
            <Badge variant="secondary" className="rounded-full">
              <HeartPulse className="h-3.5 w-3.5" />
              {offer.providerName}
            </Badge>
          ) : null}

          {offer.activeContractNumber ? (
            <Badge variant="outline" className="rounded-full">
              {offer.activeContractNumber}
            </Badge>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-2xl border bg-background p-3 sm:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">
              {hasDiscount ? labels.afterDiscount : labels.from}
            </div>

            <SarAmount
              value={offer.price || offer.originalPrice}
              className="mt-1 text-lg font-black"
            />
          </div>

          <div>
            <div className="text-xs text-muted-foreground">
              {hasDiscount ? labels.beforeDiscount : labels.discount}
            </div>

            {hasDiscount && offer.originalPrice > 0 ? (
              <div className="mt-1 text-sm text-muted-foreground line-through">
                <SarAmount value={offer.originalPrice} />
              </div>
            ) : (
              <div className="mt-1 text-lg font-black">
                {hasDiscount ? `${formatNumber(offer.discountPercent)}%` : "0%"}
              </div>
            )}
          </div>
        </div>

        <Link href="/customer/support" className="block">
          <Button className="h-10 w-full rounded-xl">
            <ShoppingBag className={isArabic ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
            {labels.requestOffer}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function CustomerOffersPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [payload, setPayload] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [discountFilter, setDiscountFilter] = useState<DiscountFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("latest");

  const t = useMemo(() => translations[lang], [lang]);
  const isArabic = lang === "ar";

  const offers = useMemo(() => {
    return unwrapList(payload)
      .map((item) => normalizeOffer(item, lang))
      .filter((item) => item.id || item.name)
      .filter(
        (item) =>
          item.isOffer ||
          item.discountPercent > 0 ||
          item.hasActiveContract ||
          item.showOnLanding,
      );
  }, [payload, lang]);

  const filteredOffers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const items = offers.filter((offer) => {
      const normalizedType = normalizeType(offer.productType);

      const matchesSearch =
        !term ||
        offer.name.toLowerCase().includes(term) ||
        offer.subtitle.toLowerCase().includes(term) ||
        offer.providerName.toLowerCase().includes(term) ||
        offer.productType.toLowerCase().includes(term) ||
        offer.activeContractNumber.toLowerCase().includes(term) ||
        offer.activeContractTitle.toLowerCase().includes(term);

      const matchesType =
        typeFilter === "all" ||
        normalizedType === typeFilter ||
        offer.productType.toLowerCase().includes(typeFilter);

      const matchesDiscount =
        discountFilter === "all" ||
        (discountFilter === "any" && offer.discountPercent > 0) ||
        (discountFilter !== "any" &&
          offer.discountPercent >= Number(discountFilter));

      return matchesSearch && matchesType && matchesDiscount;
    });

    return [...items].sort((a, b) => {
      if (sortKey === "highest_discount") {
        return b.discountPercent - a.discountPercent;
      }

      if (sortKey === "lowest_price") {
        return (a.price || a.originalPrice) - (b.price || b.originalPrice);
      }

      if (sortKey === "highest_price") {
        return (b.price || b.originalPrice) - (a.price || a.originalPrice);
      }

      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return bTime - aTime;
    });
  }, [offers, searchTerm, typeFilter, discountFilter, sortKey]);

  const highestDiscount = useMemo(() => {
    return offers.reduce(
      (max, offer) => Math.max(max, offer.discountPercent || 0),
      0,
    );
  }, [offers]);

  const newCount = useMemo(() => {
    return offers.filter((offer) => offer.isNew).length;
  }, [offers]);

  const contractedCount = useMemo(() => {
    return offers.filter((offer) => offer.hasActiveContract).length;
  }, [offers]);

  const hasFilters =
    Boolean(searchTerm.trim()) ||
    typeFilter !== "all" ||
    discountFilter !== "all" ||
    sortKey !== "latest";

  async function load(showToast = false) {
    setLoading(true);
    setErrorMessage("");

    const result = await safeFetch(
      "/api/products/offers/?page=1&page_size=100&include_children=false&sort=highest_discount",
    );

    if (!result.ok) {
      setPayload(null);
      setErrorMessage(result.message || t.loadError);
      toast.error(t.loadError);
      setLoading(false);
      return;
    }

    setPayload(result.payload);
    setLoading(false);

    if (showToast) {
      toast.success(t.refreshSuccess);
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setTypeFilter("all");
    setDiscountFilter("all");
    setSortKey("latest");
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
        <div className="relative p-5 md:p-7">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-muted/30" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Gift className="h-3.5 w-3.5 text-primary" />
                {t.offer}
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight md:text-4xl">
                  {t.pageTitle}
                </h1>

                <p className="mt-2 text-sm leading-7 text-muted-foreground md:text-base">
                  {t.pageSubtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/customer">
                <Button variant="outline" className="h-11 rounded-xl">
                  {isArabic ? (
                    <ArrowRight className="ml-2 h-4 w-4" />
                  ) : (
                    <ArrowLeft className="mr-2 h-4 w-4" />
                  )}
                  {t.backHome}
                </Button>
              </Link>

              <Link href="/customer/network">
                <Button variant="outline" className="h-11 rounded-xl">
                  <HeartPulse className={isArabic ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                  {t.medicalNetwork}
                </Button>
              </Link>

              <Button
                variant="outline"
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
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Gift className="h-5 w-5" />}
          title={t.totalOffers}
          value={formatNumber(offers.length)}
        />

        <KpiCard
          icon={<Trophy className="h-5 w-5" />}
          title={t.highestDiscount}
          value={highestDiscount ? `${formatNumber(highestDiscount)}%` : "0%"}
        />

        <KpiCard
          icon={<Sparkles className="h-5 w-5" />}
          title={t.newOffers}
          value={formatNumber(newCount)}
        />

        <KpiCard
          icon={<BadgeCheck className="h-5 w-5" />}
          title={t.contractedOffers}
          value={formatNumber(contractedCount)}
        />
      </div>

      {errorMessage ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div className="font-semibold text-destructive">{t.loadError}</div>

            <Button variant="outline" onClick={() => void load(true)}>
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search
              className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${
                isArabic ? "right-3" : "left-3"
              }`}
            />

            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t.searchPlaceholder}
              className={`h-11 w-full rounded-2xl border bg-background px-4 text-sm outline-none ring-offset-background transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring ${
                isArabic ? "pr-10" : "pl-10"
              }`}
            />

            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className={`absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted ${
                  isArabic ? "left-2" : "right-2"
                }`}
                aria-label={t.clearFilters}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t.typeFilter}
              </span>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
                className="h-11 w-full rounded-2xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">{t.all}</option>
                <option value="card">{t.card}</option>
                <option value="program">{t.program}</option>
                <option value="service">{t.service}</option>
                <option value="membership">{t.membership}</option>
                <option value="package">{t.package}</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t.discountFilter}
              </span>

              <select
                value={discountFilter}
                onChange={(event) =>
                  setDiscountFilter(event.target.value as DiscountFilter)
                }
                className="h-11 w-full rounded-2xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">{t.all}</option>
                <option value="any">{t.anyDiscount}</option>
                <option value="10">{t.discount10}</option>
                <option value="25">{t.discount25}</option>
                <option value="50">{t.discount50}</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t.sortBy}
              </span>

              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="h-11 w-full rounded-2xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="latest">{t.latest}</option>
                <option value="highest_discount">{t.highestDiscountSort}</option>
                <option value="lowest_price">{t.lowestPrice}</option>
                <option value="highest_price">{t.highestPrice}</option>
              </select>
            </label>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="h-11 w-full rounded-2xl"
                disabled={!hasFilters}
                onClick={clearFilters}
              >
                <X className={isArabic ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                {t.clearFilters}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingCard label={t.pageTitle} />
      ) : filteredOffers.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredOffers.map((offer) => (
            <OfferCard
              key={`${offer.id}-${offer.name}`}
              offer={offer}
              lang={lang}
              labels={t}
            />
          ))}
        </div>
      ) : offers.length ? (
        <EmptyState
          icon={<Search className="h-7 w-7" />}
          title={t.emptyTitle}
          description={t.emptyDesc}
        />
      ) : (
        <EmptyState
          icon={<Gift className="h-7 w-7" />}
          title={t.noOffers}
          description={t.pageSubtitle}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t.helpTitle}
          </CardTitle>

          <CardDescription>{t.helpDesc}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Link
              href="/customer/cards"
              className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 transition hover:bg-muted/40"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <CreditCard className="h-4 w-4 text-primary" />
                {t.card}
              </span>
              <span className="text-muted-foreground">←</span>
            </Link>

            <Link
              href="/customer/network"
              className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 transition hover:bg-muted/40"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <HeartPulse className="h-4 w-4 text-primary" />
                {t.medicalNetwork}
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
            {t.pageSubtitle}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}