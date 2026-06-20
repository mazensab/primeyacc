"use client";

/* ============================================================
   📂 app/customer/network/page.tsx
   🧭 Primey Care | Customer Medical Network Page
   ------------------------------------------------------------
   ✅ صفحة محتوى فقط داخل customer/layout الموحد
   ✅ تعرض الشبكة الطبية ومقدمي الخدمة المتعاقدين للعميل
   ✅ تجلب مقدمي الخدمة المتعاقدين من /api/providers/?has_active_contracts=true
   ✅ تقرأ بيانات العقود والخصومات الحقيقية من الباكند
   ✅ بحث وفلاتر وترتيب محلي
   ✅ تستفيد من summary القادم من API
   ✅ معالجة آمنة للصور الخارجية بدون كسر next/image
   ✅ w-full space-y-4
   ✅ عربي/إنجليزي عبر primey-locale
   ✅ أرقام إنجليزية دائمًا
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
  Building2,
  FileText,
  Gift,
  HeartPulse,
  Loader2,
  MapPin,
  PackageCheck,
  Percent,
  RefreshCcw,
  Search,
  ShieldCheck,
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

type NetworkProvider = {
  id: string;
  name: string;
  subtitle: string;
  city: string;
  region: string;
  category: string;
  phone: string;
  logoUrl: string;
  imageUrl: string;
  discountPercent: number;
  isFeatured: boolean;
  isActive: boolean;
  hasActiveContract: boolean;
  activeContractsCount: number;
  contractedProductsCount: number;
  activeContractNumber: string;
  activeContractTitle: string;
  createdAt: string;
};

type NetworkSummary = {
  totalProviders: number;
  contractedProviders: number;
  contractedProductsCount: number;
  highestDiscountPercent: number;
  featuredProviders: number;
};

type ContractFilter = "all" | "contracted" | "featured" | "discounted";
type SortKey = "latest" | "highest_discount" | "most_products" | "name" | "city";

const translations = {
  ar: {
    pageTitle: "الشبكة الطبية",
    pageSubtitle:
      "استعرض مقدمي الخدمة المتعاقدين مع Primey Care والخصومات المتاحة من العقود النشطة.",
    backHome: "الرئيسية",
    offers: "العروض",
    refresh: "تحديث",
    refreshSuccess: "تم تحديث الشبكة الطبية.",
    loadError: "تعذر تحميل الشبكة الطبية.",
    retry: "إعادة المحاولة",

    totalProviders: "إجمالي الشبكة",
    contractedProviders: "المتعاقدون",
    highestDiscount: "أعلى خصم",
    contractedProducts: "منتجات متعاقدة",

    searchPlaceholder: "ابحث باسم مقدم الخدمة أو المدينة أو التصنيف أو العقد...",
    regionFilter: "المنطقة",
    cityFilter: "المدينة",
    categoryFilter: "التصنيف",
    contractFilter: "نوع العرض",
    sortBy: "الترتيب",
    clearFilters: "مسح الفلاتر",

    all: "الكل",
    contracted: "متعاقد",
    featured: "مميز",
    discounted: "لديه خصم",

    latest: "الأحدث",
    highestDiscountSort: "الأعلى خصمًا",
    mostProductsSort: "الأكثر منتجات",
    nameSort: "الاسم",
    citySort: "المدينة",

    provider: "مقدم الخدمة",
    region: "المنطقة",
    city: "المدينة",
    category: "التصنيف",
    discount: "خصم",
    upTo: "حتى",
    activeContract: "متعاقد",
    featuredBadge: "مميز",
    noData: "غير متوفر",
    askForProvider: "استفسار عن مقدم الخدمة",
    contactSupport: "تواصل مع الدعم",
    productsCount: "منتجات متعاقدة",
    contractsCount: "عقود نشطة",
    contractNumber: "رقم العقد",

    emptyTitle: "لا توجد نتائج مطابقة",
    emptyDesc:
      "غيّر كلمات البحث أو الفلاتر لعرض المزيد من مقدمي الخدمة في الشبكة الطبية.",
    noProviders: "لا توجد بيانات شبكة طبية متاحة حاليًا.",

    helpTitle: "تحتاج مساعدة في اختيار مقدم الخدمة؟",
    helpDesc:
      "يمكن لفريق الدعم مساعدتك في اختيار مقدم الخدمة المناسب حسب المدينة ونوع الخدمة والخصم المتاح.",
  },
  en: {
    pageTitle: "Medical Network",
    pageSubtitle:
      "Explore Primey Care contracted providers and discounts from active provider contracts.",
    backHome: "Home",
    offers: "Offers",
    refresh: "Refresh",
    refreshSuccess: "Medical network refreshed.",
    loadError: "Unable to load medical network.",
    retry: "Retry",

    totalProviders: "Total network",
    contractedProviders: "Contracted",
    highestDiscount: "Highest discount",
    contractedProducts: "Contracted products",

    searchPlaceholder: "Search by provider, city, category, or contract...",
    regionFilter: "Region",
    cityFilter: "City",
    categoryFilter: "Category",
    contractFilter: "Offer type",
    sortBy: "Sort by",
    clearFilters: "Clear filters",

    all: "All",
    contracted: "Contracted",
    featured: "Featured",
    discounted: "Has discount",

    latest: "Latest",
    highestDiscountSort: "Highest discount",
    mostProductsSort: "Most products",
    nameSort: "Name",
    citySort: "City",

    provider: "Provider",
    region: "Region",
    city: "City",
    category: "Category",
    discount: "Discount",
    upTo: "Up to",
    activeContract: "Contracted",
    featuredBadge: "Featured",
    noData: "Not available",
    askForProvider: "Ask about provider",
    contactSupport: "Contact support",
    productsCount: "Contracted products",
    contractsCount: "Active contracts",
    contractNumber: "Contract no.",

    emptyTitle: "No matching results",
    emptyDesc:
      "Change your search or filters to view more providers in the medical network.",
    noProviders: "No medical network data is currently available.",

    helpTitle: "Need help choosing a provider?",
    helpDesc:
      "Support can help you choose the right provider based on city, service type, and available discount.",
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
    "provider",
    "summary",
    "meta",
    "active_contract",
    "contract",
    "marketing_contract",
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
    root.providers,
    root.data,
    data.results,
    data.items,
    data.providers,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function unwrapSummary(payload: unknown): NetworkSummary {
  const root = asDict(payload);
  const data = asDict(root.data);
  const summary = asDict(root.summary || data.summary || {});

  return {
    totalProviders: toNumber(
      summary.total_providers ||
        summary.totalProviders ||
        summary.total ||
        0,
    ),
    contractedProviders: toNumber(
      summary.contracted_providers ||
        summary.providers_with_active_contracts ||
        summary.active_contracts_providers ||
        0,
    ),
    contractedProductsCount: toNumber(
      summary.contracted_products_count ||
        summary.products_with_active_contracts ||
        0,
    ),
    highestDiscountPercent: toNumber(
      summary.highest_discount_percent ||
        summary.max_discount_percent ||
        0,
    ),
    featuredProviders: toNumber(
      summary.featured_providers ||
        summary.featuredProviders ||
        0,
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

function providerName(item: Dict, lang: Lang) {
  return String(
    (lang === "ar"
      ? getValue(item, "name_ar") || getValue(item, "display_name_ar")
      : getValue(item, "name_en") || getValue(item, "display_name_en")) ||
      getValue(item, "name") ||
      getValue(item, "provider_name") ||
      "",
  );
}

function providerSubtitle(item: Dict, lang: Lang) {
  return String(
    (lang === "ar"
      ? getValue(item, "description_ar") || getValue(item, "short_description_ar")
      : getValue(item, "description_en") || getValue(item, "short_description_en")) ||
      getValue(item, "description") ||
      getValue(item, "short_description") ||
      getValue(item, "notes") ||
      "",
  );
}

function normalizeProvider(item: unknown, lang: Lang): NetworkProvider {
  const dict = asDict(item);
  const activeContract = asDict(getValue(dict, "active_contract") || {});

  const city = String(getValue(dict, "city") || getValue(dict, "city_name") || "");
  const region = String(getValue(dict, "region") || getValue(dict, "region_name") || "");
  const category = String(
    getValue(dict, "category") ||
      getValue(dict, "classification") ||
      getValue(dict, "source_category") ||
      getValue(dict, "provider_type") ||
      "",
  );

  const activeContractsCount = toNumber(
    getValue(dict, "active_contracts_count") ||
      getValue(dict, "contracts_count") ||
      0,
  );

  const contractedProductsCount = toNumber(
    getValue(dict, "contracted_products_count") ||
      getValue(dict, "products_with_active_contracts") ||
      getValue(activeContract, "contracted_products_count") ||
      0,
  );

  const hasActiveContract =
    toBoolean(getValue(dict, "has_active_contract")) ||
    toBoolean(getValue(dict, "has_active_contracts")) ||
    toBoolean(getValue(dict, "active_contract")) ||
    toBoolean(getValue(dict, "contracted")) ||
    toBoolean(getValue(dict, "has_marketing_contract")) ||
    activeContractsCount > 0 ||
    contractedProductsCount > 0;

  return {
    id: String(getValue(dict, "id") || getValue(dict, "uuid") || ""),
    name: providerName(dict, lang),
    subtitle: providerSubtitle(dict, lang),
    city,
    region,
    category,
    phone: String(
      getValue(dict, "phone") ||
        getValue(dict, "mobile") ||
        getValue(dict, "phone_number") ||
        getValue(dict, "whatsapp_number") ||
        "",
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
    discountPercent: toNumber(
      getValue(dict, "discount_percent") ||
        getValue(dict, "max_discount_percent") ||
        getValue(dict, "highest_discount_percent") ||
        getValue(dict, "discount_percentage") ||
        getValue(dict, "contract_discount_percent") ||
        getValue(activeContract, "discount_percentage"),
    ),
    isFeatured:
      toBoolean(getValue(dict, "is_featured")) ||
      toBoolean(getValue(dict, "featured")),
    isActive:
      toBoolean(getValue(dict, "is_active")) ||
      toBoolean(getValue(dict, "active")) ||
      String(getValue(dict, "status") || "").toLowerCase() === "active",
    hasActiveContract,
    activeContractsCount,
    contractedProductsCount,
    activeContractNumber: String(
      getValue(dict, "active_contract_number") ||
        getValue(activeContract, "contract_number") ||
        "",
    ),
    activeContractTitle: String(
      getValue(dict, "active_contract_title") ||
        getValue(activeContract, "title") ||
        "",
    ),
    createdAt: String(getValue(dict, "created_at") || ""),
  };
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
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

function ProviderCard({
  provider,
  lang,
  labels,
}: {
  provider: NetworkProvider;
  lang: Lang;
  labels: typeof translations.ar | typeof translations.en;
}) {
  const image = provider.imageUrl || provider.logoUrl;
  const isArabic = lang === "ar";

  return (
    <Card className="overflow-hidden">
      <div className="relative min-h-36 bg-muted/30">
        {image ? (
          <SafeImage
            src={image}
            alt={provider.name || labels.provider}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex min-h-36 items-center justify-center">
            <HeartPulse className="h-12 w-12 text-muted-foreground/60" />
          </div>
        )}

        <div className="absolute inset-x-3 top-3 flex flex-wrap items-center gap-2">
          {provider.hasActiveContract ? (
            <Badge className="rounded-full">
              <BadgeCheck className="h-3.5 w-3.5" />
              {labels.activeContract}
            </Badge>
          ) : null}

          {provider.isFeatured ? (
            <Badge variant="secondary" className="rounded-full">
              <Star className="h-3.5 w-3.5" />
              {labels.featuredBadge}
            </Badge>
          ) : null}

          {provider.discountPercent > 0 ? (
            <Badge variant="destructive" className="rounded-full">
              <Percent className="h-3.5 w-3.5" />
              {formatNumber(provider.discountPercent)}%
            </Badge>
          ) : null}
        </div>
      </div>

      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
            {provider.logoUrl ? (
              <SafeImage
                src={provider.logoUrl}
                alt={provider.name || labels.provider}
                width={56}
                height={56}
                className="h-14 w-14 object-cover"
              />
            ) : (
              <Building2 className="h-7 w-7 text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 text-base font-black">
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

        <div className="line-clamp-2 min-h-10 text-sm leading-6 text-muted-foreground">
          {provider.subtitle || provider.category || labels.pageSubtitle}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {provider.category ? (
            <Badge variant="outline" className="rounded-full">
              {provider.category}
            </Badge>
          ) : null}

          {provider.region ? (
            <Badge variant="secondary" className="rounded-full">
              {provider.region}
            </Badge>
          ) : null}

          {provider.city ? (
            <Badge variant="secondary" className="rounded-full">
              {provider.city}
            </Badge>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-background p-3">
            <div className="text-xs text-muted-foreground">{labels.discount}</div>
            <div className="mt-1 flex items-center gap-2 text-lg font-black">
              <Trophy className="h-4 w-4 text-primary" />
              {provider.discountPercent > 0
                ? `${labels.upTo} ${formatNumber(provider.discountPercent)}%`
                : labels.noData}
            </div>
          </div>

          <div className="rounded-2xl border bg-background p-3">
            <div className="text-xs text-muted-foreground">{labels.productsCount}</div>
            <div className="mt-1 flex items-center gap-2 text-lg font-black">
              <PackageCheck className="h-4 w-4 text-primary" />
              {formatNumber(provider.contractedProductsCount)}
            </div>
          </div>
        </div>

        {provider.activeContractNumber || provider.activeContractTitle ? (
          <div className="rounded-2xl border bg-background p-3 text-xs leading-6 text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              {provider.activeContractNumber || labels.contractNumber}
            </div>

            {provider.activeContractTitle ? (
              <div className="mt-1 line-clamp-1">{provider.activeContractTitle}</div>
            ) : null}
          </div>
        ) : null}

        <Link href="/customer/support" className="block">
          <Button className="h-10 w-full rounded-xl">
            <Tags className={isArabic ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
            {labels.askForProvider}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function CustomerNetworkPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [payload, setPayload] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState<ContractFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("highest_discount");

  const t = useMemo(() => translations[lang], [lang]);
  const isArabic = lang === "ar";

  const summary = useMemo(() => unwrapSummary(payload), [payload]);

  const providers = useMemo(() => {
    return unwrapList(payload)
      .map((item) => normalizeProvider(item, lang))
      .filter((item) => item.id || item.name)
      .filter(
        (item) =>
          item.hasActiveContract ||
          item.isFeatured ||
          item.discountPercent > 0 ||
          item.contractedProductsCount > 0,
      );
  }, [payload, lang]);

  const regions = useMemo(() => {
    return uniqueSorted(providers.map((provider) => provider.region));
  }, [providers]);

  const cities = useMemo(() => {
    return uniqueSorted(
      providers
        .filter((provider) => regionFilter === "all" || provider.region === regionFilter)
        .map((provider) => provider.city),
    );
  }, [providers, regionFilter]);

  const categories = useMemo(() => {
    return uniqueSorted(providers.map((provider) => provider.category));
  }, [providers]);

  const filteredProviders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const items = providers.filter((provider) => {
      const matchesSearch =
        !term ||
        provider.name.toLowerCase().includes(term) ||
        provider.subtitle.toLowerCase().includes(term) ||
        provider.city.toLowerCase().includes(term) ||
        provider.region.toLowerCase().includes(term) ||
        provider.category.toLowerCase().includes(term) ||
        provider.activeContractNumber.toLowerCase().includes(term) ||
        provider.activeContractTitle.toLowerCase().includes(term);

      const matchesRegion = regionFilter === "all" || provider.region === regionFilter;
      const matchesCity = cityFilter === "all" || provider.city === cityFilter;
      const matchesCategory =
        categoryFilter === "all" || provider.category === categoryFilter;

      const matchesContract =
        contractFilter === "all" ||
        (contractFilter === "contracted" && provider.hasActiveContract) ||
        (contractFilter === "featured" && provider.isFeatured) ||
        (contractFilter === "discounted" && provider.discountPercent > 0);

      return (
        matchesSearch &&
        matchesRegion &&
        matchesCity &&
        matchesCategory &&
        matchesContract
      );
    });

    return [...items].sort((a, b) => {
      if (sortKey === "highest_discount") {
        return b.discountPercent - a.discountPercent;
      }

      if (sortKey === "most_products") {
        return b.contractedProductsCount - a.contractedProductsCount;
      }

      if (sortKey === "name") {
        return a.name.localeCompare(b.name);
      }

      if (sortKey === "city") {
        return a.city.localeCompare(b.city);
      }

      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return bTime - aTime;
    });
  }, [
    providers,
    searchTerm,
    regionFilter,
    cityFilter,
    categoryFilter,
    contractFilter,
    sortKey,
  ]);

  const contractedCount = useMemo(() => {
    return providers.filter((provider) => provider.hasActiveContract).length;
  }, [providers]);

  const totalContractedProducts = useMemo(() => {
    return providers.reduce(
      (total, provider) => total + provider.contractedProductsCount,
      0,
    );
  }, [providers]);

  const highestDiscount = useMemo(() => {
    return providers.reduce(
      (max, provider) => Math.max(max, provider.discountPercent || 0),
      0,
    );
  }, [providers]);

  const hasFilters =
    Boolean(searchTerm.trim()) ||
    regionFilter !== "all" ||
    cityFilter !== "all" ||
    categoryFilter !== "all" ||
    contractFilter !== "all" ||
    sortKey !== "highest_discount";

  async function load(showToast = false) {
    setLoading(true);
    setErrorMessage("");

    const result = await safeFetch(
      "/api/providers/?page=1&page_size=100&is_active=true&has_active_contracts=true&sort=highest_discount",
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
    setRegionFilter("all");
    setCityFilter("all");
    setCategoryFilter("all");
    setContractFilter("all");
    setSortKey("highest_discount");
  }

  useEffect(() => {
    if (cityFilter !== "all" && !cities.includes(cityFilter)) {
      setCityFilter("all");
    }
  }, [cities, cityFilter]);

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

  const totalProvidersValue = summary.totalProviders || providers.length;
  const contractedProvidersValue = summary.contractedProviders || contractedCount;
  const highestDiscountValue = summary.highestDiscountPercent || highestDiscount;
  const contractedProductsValue =
    summary.contractedProductsCount || totalContractedProducts;

  return (
    <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative p-5 md:p-7">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-muted/30" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                <HeartPulse className="h-3.5 w-3.5 text-primary" />
                {t.pageTitle}
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

              <Link href="/customer/offers">
                <Button variant="outline" className="h-11 rounded-xl">
                  <Gift className={isArabic ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                  {t.offers}
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
          icon={<HeartPulse className="h-5 w-5" />}
          title={t.totalProviders}
          value={formatNumber(totalProvidersValue)}
        />

        <KpiCard
          icon={<BadgeCheck className="h-5 w-5" />}
          title={t.contractedProviders}
          value={formatNumber(contractedProvidersValue)}
        />

        <KpiCard
          icon={<Trophy className="h-5 w-5" />}
          title={t.highestDiscount}
          value={highestDiscountValue ? `${formatNumber(highestDiscountValue)}%` : "0%"}
        />

        <KpiCard
          icon={<PackageCheck className="h-5 w-5" />}
          title={t.contractedProducts}
          value={formatNumber(contractedProductsValue)}
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

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t.regionFilter}
              </span>
              <select
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">{t.all}</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t.cityFilter}
              </span>
              <select
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">{t.all}</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t.categoryFilter}
              </span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">{t.all}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t.contractFilter}
              </span>
              <select
                value={contractFilter}
                onChange={(event) =>
                  setContractFilter(event.target.value as ContractFilter)
                }
                className="h-11 w-full rounded-2xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">{t.all}</option>
                <option value="contracted">{t.contracted}</option>
                <option value="featured">{t.featured}</option>
                <option value="discounted">{t.discounted}</option>
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
                <option value="highest_discount">{t.highestDiscountSort}</option>
                <option value="most_products">{t.mostProductsSort}</option>
                <option value="latest">{t.latest}</option>
                <option value="name">{t.nameSort}</option>
                <option value="city">{t.citySort}</option>
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
      ) : filteredProviders.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProviders.map((provider) => (
            <ProviderCard
              key={`${provider.id}-${provider.name}`}
              provider={provider}
              lang={lang}
              labels={t}
            />
          ))}
        </div>
      ) : providers.length ? (
        <EmptyState
          icon={<Search className="h-7 w-7" />}
          title={t.emptyTitle}
          description={t.emptyDesc}
        />
      ) : (
        <EmptyState
          icon={<HeartPulse className="h-7 w-7" />}
          title={t.noProviders}
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
              href="/customer/offers"
              className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 transition hover:bg-muted/40"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <Gift className="h-4 w-4 text-primary" />
                {t.offers}
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

            <Link
              href="/customer"
              className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3 transition hover:bg-muted/40"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <HeartPulse className="h-4 w-4 text-primary" />
                {t.backHome}
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