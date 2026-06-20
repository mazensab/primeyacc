"use client";

/* ============================================================
   📂 app/system/contracts/create/page.tsx
   🧠 Primey Care | Create Provider Marketing Contract
   ------------------------------------------------------------
   ✅ Same approved Customers / Providers / Contracts create pattern
   ✅ Provider marketing contract for provider product offers
   ✅ No direct financial value on contract header
   ✅ ContractProduct lines with price before / discount / after
   ✅ Per-line system commission / visibility / offer metadata
   ✅ Real APIs only: /api/providers/ + /api/products/ + /api/contracts/
   ✅ No localhost
   ✅ No fake data
   ✅ Local draft protection
   ✅ Field validation
   ✅ sonner toast
   ✅ SAR icon from /currency/sar.svg
   ✅ RTL/LTR via primey-locale
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  FileText,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  TriangleAlert,
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

type ContractStatus = "DRAFT" | "ACTIVE" | "SUSPENDED";
type PricingModel = "MIXED" | "DISCOUNT" | "COMMISSION" | "PERCENTAGE" | "FIXED" | "OTHER";

type ProviderOption = {
  id: number;
  name: string;
  name_ar: string;
  name_en: string;
  code: string;
  city: string;
  status: string;
};

type ProductOption = {
  id: number;
  name: string;
  name_ar: string;
  name_en: string;
  code: string;
  product_type: string;
  category_name: string;
  base_price: number;
  status: string;
};

type ContractProductLine = {
  uid: string;
  product_id: string;
  product_name: string;
  product_type: string;
  price_before_discount: string;
  discount_percentage: string;
  price_after_discount: string;
  system_commission_percentage: string;
  is_active: boolean;
  is_featured: boolean;
  show_on_landing: boolean;
  show_on_mobile: boolean;
  show_on_offers: boolean;
  offer_title: string;
  offer_subtitle: string;
  offer_badge: string;
  offer_description: string;
  offer_terms: string;
  offer_start_date: string;
  offer_end_date: string;
  priority: string;
  usage_limit: string;
};

type FormState = {
  provider_id: string;
  contract_number: string;
  title: string;
  code: string;
  status: ContractStatus;
  pricing_model: PricingModel;
  start_date: string;
  end_date: string;
  notes: string;
  internal_notes: string;
  contract_products: ContractProductLine[];
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  contract?: unknown;
  item?: unknown;
  id?: number;
};

const SAR_ICON = "/currency/sar.svg";
const DRAFT_KEY = "primey-care.contract-create.draft";

const translations = {
  ar: {
    title: "إنشاء عقد",
    subtitle: "إنشاء عقد تسويق لمنتجات مقدم الخدمة مع الأسعار والخصومات والظهور.",
    back: "رجوع",
    saveDraft: "حفظ مسودة",
    clear: "مسح",
    submit: "حفظ العقد",
    saving: "جاري الحفظ",
    loading: "جاري التحميل",
    refresh: "تحديث البيانات",
    contractInfo: "بيانات العقد",
    providerInfo: "مقدم الخدمة",
    productsInfo: "بنود منتجات العقد",
    notesInfo: "الملاحظات",
    contractNumber: "رقم العقد",
    contractTitle: "عنوان العقد",
    code: "الكود",
    provider: "مقدم الخدمة",
    status: "الحالة",
    pricingModel: "نموذج التسعير",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    notes: "ملاحظات",
    internalNotes: "ملاحظات داخلية",
    draft: "مسودة",
    active: "نشط",
    suspended: "معلق",
    mixed: "مختلط",
    discount: "خصم",
    commission: "عمولة",
    percentage: "نسبة",
    fixed: "ثابت",
    other: "أخرى",
    selectProvider: "اختر مقدم الخدمة",
    selectProduct: "اختر المنتج",
    addProduct: "إضافة منتج",
    remove: "حذف",
    product: "المنتج",
    type: "النوع",
    priceBefore: "قبل الخصم",
    discountPercentage: "نسبة الخصم",
    priceAfter: "بعد الخصم",
    systemCommission: "عمولة النظام",
    activeLine: "مفعل",
    featured: "مميز",
    landing: "الهبوط",
    mobile: "الموبايل",
    offersPage: "العروض",
    offerTitle: "عنوان العرض",
    offerSubtitle: "وصف مختصر",
    offerBadge: "شارة العرض",
    offerDescription: "وصف العرض",
    offerTerms: "شروط العرض",
    offerStart: "بداية العرض",
    offerEnd: "نهاية العرض",
    priority: "الأولوية",
    usageLimit: "حد الاستخدام",
    summary: "ملخص العقد",
    readiness: "جاهزية البيانات",
    requiredFields: "الحقول المطلوبة",
    productsCount: "عدد المنتجات",
    activeProducts: "منتجات نشطة",
    featuredOffers: "عروض مميزة",
    maxDiscount: "أعلى خصم",
    maxCommission: "أعلى عمولة",
    complete: "مكتمل",
    incomplete: "غير مكتمل",
    yes: "نعم",
    no: "لا",
    noProviders: "لا يوجد مقدمو خدمة متاحون.",
    noProducts: "لا توجد منتجات متاحة.",
    emptyProductsTitle: "لا توجد بنود منتجات",
    emptyProductsDesc: "أضف منتجًا واحدًا على الأقل داخل العقد.",
    requiredProvider: "مقدم الخدمة مطلوب.",
    requiredContract: "رقم العقد أو عنوان العقد مطلوب.",
    requiredProducts: "يجب إضافة منتج واحد على الأقل.",
    invalidProduct: "يوجد بند منتج غير مكتمل.",
    invalidAmounts: "تأكد من الأسعار والخصومات داخل بنود المنتجات.",
    saved: "تم إنشاء العقد بنجاح.",
    draftSaved: "تم حفظ المسودة محليًا.",
    draftLoaded: "تم استعادة المسودة.",
    cleared: "تم مسح النموذج.",
    errorTitle: "تعذر تنفيذ العملية",
    submitError: "تعذر إنشاء العقد.",
    loadError: "تعذر تحميل مقدمي الخدمة أو المنتجات.",
    confirmClear: "هل تريد مسح النموذج الحالي؟",
    unsaved: "لديك تغييرات غير محفوظة.",
    viewContract: "فتح العقد",
    placeholderContract: "مثال: MC-2026-001",
    placeholderTitle: "مثال: عقد تسويق عروض مقدم الخدمة",
    sarCurrency: "الريال السعودي",
    unknown: "غير محدد",
  },
  en: {
    title: "Create Contract",
    subtitle: "Create a provider marketing contract with prices, discounts, and visibility.",
    back: "Back",
    saveDraft: "Save draft",
    clear: "Clear",
    submit: "Save contract",
    saving: "Saving",
    loading: "Loading",
    refresh: "Refresh data",
    contractInfo: "Contract info",
    providerInfo: "Provider",
    productsInfo: "Contract product lines",
    notesInfo: "Notes",
    contractNumber: "Contract number",
    contractTitle: "Contract title",
    code: "Code",
    provider: "Provider",
    status: "Status",
    pricingModel: "Pricing model",
    startDate: "Start date",
    endDate: "End date",
    notes: "Notes",
    internalNotes: "Internal notes",
    draft: "Draft",
    active: "Active",
    suspended: "Suspended",
    mixed: "Mixed",
    discount: "Discount",
    commission: "Commission",
    percentage: "Percentage",
    fixed: "Fixed",
    other: "Other",
    selectProvider: "Select provider",
    selectProduct: "Select product",
    addProduct: "Add product",
    remove: "Remove",
    product: "Product",
    type: "Type",
    priceBefore: "Before discount",
    discountPercentage: "Discount %",
    priceAfter: "After discount",
    systemCommission: "System commission",
    activeLine: "Active",
    featured: "Featured",
    landing: "Landing",
    mobile: "Mobile",
    offersPage: "Offers",
    offerTitle: "Offer title",
    offerSubtitle: "Offer subtitle",
    offerBadge: "Offer badge",
    offerDescription: "Offer description",
    offerTerms: "Offer terms",
    offerStart: "Offer start",
    offerEnd: "Offer end",
    priority: "Priority",
    usageLimit: "Usage limit",
    summary: "Contract summary",
    readiness: "Data readiness",
    requiredFields: "Required fields",
    productsCount: "Products count",
    activeProducts: "Active products",
    featuredOffers: "Featured offers",
    maxDiscount: "Max discount",
    maxCommission: "Max commission",
    complete: "Complete",
    incomplete: "Incomplete",
    yes: "Yes",
    no: "No",
    noProviders: "No providers available.",
    noProducts: "No products available.",
    emptyProductsTitle: "No product lines",
    emptyProductsDesc: "Add at least one product to the contract.",
    requiredProvider: "Provider is required.",
    requiredContract: "Contract number or title is required.",
    requiredProducts: "At least one product is required.",
    invalidProduct: "There is an incomplete product line.",
    invalidAmounts: "Check prices and discounts in product lines.",
    saved: "Contract created successfully.",
    draftSaved: "Draft saved locally.",
    draftLoaded: "Draft restored.",
    cleared: "Form cleared.",
    errorTitle: "Unable to complete operation",
    submitError: "Unable to create contract.",
    loadError: "Unable to load providers or products.",
    confirmClear: "Do you want to clear the current form?",
    unsaved: "You have unsaved changes.",
    viewContract: "Open contract",
    placeholderContract: "Example: MC-2026-001",
    placeholderTitle: "Example: Provider marketing offers contract",
    sarCurrency: "Saudi riyal",
    unknown: "Unknown",
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

function toEnglishDigits(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(toEnglishDigits(value).replace(/[^\d.-]/g, ""));
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

function formatPercent(value: unknown) {
  return `${formatMoney(value)}%`;
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

  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
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

async function fetchJson<T>(
  url: string,
  options?: {
    method?: "GET" | "POST";
    body?: unknown;
    signal?: AbortSignal;
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
      ...(options?.method === "POST" ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method === "POST"
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

function extractList(payload: unknown): unknown[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  if (Array.isArray(root.results)) return root.results;
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(root.data)) return root.data;

  return [];
}

function extractCreatedId(payload: unknown): number | null {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  const candidates = [
    data.id,
    asRecord(data.contract).id,
    asRecord(data.item).id,
    root.id,
    asRecord(root.contract).id,
    asRecord(root.item).id,
  ];

  for (const candidate of candidates) {
    const id = toNumber(candidate);
    if (id > 0) return id;
  }

  return null;
}

function normalizeProvider(value: unknown): ProviderOption {
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
    city: normalizeText(item.city),
    status: normalizeText(item.status).toUpperCase(),
  };
}

function normalizeProduct(value: unknown): ProductOption {
  const item = asRecord(value);
  const category = asRecord(item.category);

  const nameAr = normalizeText(item.name_ar || item.title_ar);
  const nameEn = normalizeText(item.name_en || item.title_en);
  const name = normalizeText(
    item.name || item.title || item.product_name || nameAr || nameEn,
    `#${normalizeText(item.id)}`,
  );

  return {
    id: toNumber(item.id),
    name,
    name_ar: nameAr,
    name_en: nameEn,
    code: normalizeText(item.code || item.sku || item.product_code),
    product_type: normalizeText(item.product_type || item.type || item.kind).toUpperCase(),
    category_name: normalizeText(
      item.category_name ||
        category.name ||
        category.name_ar ||
        category.name_en,
    ),
    base_price: toNumber(
      item.base_price ||
        item.price ||
        item.amount ||
        item.default_price ||
        item.price_after_discount,
    ),
    status: normalizeText(item.status).toUpperCase(),
  };
}

function createUid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function calculatePriceAfter(priceBefore: string, discountPercentage: string) {
  const price = Math.max(toNumber(priceBefore), 0);
  const discount = Math.min(Math.max(toNumber(discountPercentage), 0), 100);

  return Number((price - price * (discount / 100)).toFixed(2));
}

function createLine(product?: ProductOption): ContractProductLine {
  const basePrice = product?.base_price ? String(product.base_price) : "";
  const discount = "0";
  const priceAfter = basePrice ? String(calculatePriceAfter(basePrice, discount)) : "";

  return {
    uid: createUid(),
    product_id: product?.id ? String(product.id) : "",
    product_name: product?.name || "",
    product_type: product?.product_type || "",
    price_before_discount: basePrice,
    discount_percentage: discount,
    price_after_discount: priceAfter,
    system_commission_percentage: "0",
    is_active: true,
    is_featured: false,
    show_on_landing: false,
    show_on_mobile: false,
    show_on_offers: false,
    offer_title: product?.name || "",
    offer_subtitle: "",
    offer_badge: "",
    offer_description: "",
    offer_terms: "",
    offer_start_date: "",
    offer_end_date: "",
    priority: "0",
    usage_limit: "0",
  };
}

function createInitialForm(): FormState {
  const year = new Date().getFullYear();

  return {
    provider_id: "",
    contract_number: `CON-${year}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    title: "",
    code: "",
    status: "DRAFT",
    pricing_model: "MIXED",
    start_date: "",
    end_date: "",
    notes: "",
    internal_notes: "",
    contract_products: [],
  };
}

function getProviderDisplayName(provider?: ProviderOption | null) {
  if (!provider) return "";
  return provider.name_ar || provider.name || provider.name_en || `#${provider.id}`;
}

function getProductDisplayName(product?: ProductOption | null) {
  if (!product) return "";
  return product.name_ar || product.name || product.name_en || `#${product.id}`;
}

function statusLabel(status: ContractStatus, locale: Locale) {
  const t = translations[locale];

  const labels: Record<ContractStatus, string> = {
    DRAFT: t.draft,
    ACTIVE: t.active,
    SUSPENDED: t.suspended,
  };

  return labels[status];
}

function pricingLabel(model: PricingModel, locale: Locale) {
  const t = translations[locale];

  const labels: Record<PricingModel, string> = {
    MIXED: t.mixed,
    DISCOUNT: t.discount,
    COMMISSION: t.commission,
    PERCENTAGE: t.percentage,
    FIXED: t.fixed,
    OTHER: t.other,
  };

  return labels[model];
}

function buildPayload(form: FormState) {
  return {
    provider_id: toNumber(form.provider_id) || null,
    contract_number: form.contract_number.trim(),
    title: form.title.trim(),
    code: form.code.trim(),
    status: form.status,
    pricing_model: form.pricing_model,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    notes: form.notes.trim(),
    internal_notes: form.internal_notes.trim(),
    contract_products: form.contract_products.map((line) => ({
      product_id: toNumber(line.product_id) || null,
      product_name: line.product_name.trim(),
      product_type: line.product_type.trim(),
      price_before_discount: toNumber(line.price_before_discount).toFixed(2),
      discount_percentage: toNumber(line.discount_percentage).toFixed(2),
      price_after_discount: toNumber(line.price_after_discount).toFixed(2),
      system_commission_percentage: toNumber(line.system_commission_percentage).toFixed(2),
      is_active: line.is_active,
      is_featured: line.is_featured,
      show_on_landing: line.show_on_landing,
      show_on_mobile: line.show_on_mobile,
      show_on_offers: line.show_on_offers,
      offer_title: line.offer_title.trim(),
      offer_subtitle: line.offer_subtitle.trim(),
      offer_badge: line.offer_badge.trim(),
      offer_description: line.offer_description.trim(),
      offer_terms: line.offer_terms.trim(),
      offer_start_date: line.offer_start_date || null,
      offer_end_date: line.offer_end_date || null,
      priority: toNumber(line.priority),
      usage_limit: toNumber(line.usage_limit),
    })),
  };
}

function SarIcon({ className }: { className?: string }) {
  return (
    <img
      src={SAR_ICON}
      alt=""
      className={cn("inline-block h-3.5 w-3.5 shrink-0 object-contain", className)}
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-left text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

export default function SystemContractCreatePage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<FormState>(() => createInitialForm());
  const [providers, setProviders] = React.useState<ProviderOption[]>([]);
  const [products, setProducts] = React.useState<ProductOption[]>([]);

  const [initialLoading, setInitialLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState("");
  const [createdId, setCreatedId] = React.useState<number | null>(null);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const selectedProvider = React.useMemo(
    () => providers.find((provider) => String(provider.id) === form.provider_id) || null,
    [form.provider_id, providers],
  );

  const requiredComplete = Boolean(
    form.provider_id && (form.contract_number.trim() || form.title.trim()),
  );

  const activeProductsCount = form.contract_products.filter((line) => line.is_active).length;
  const featuredOffersCount = form.contract_products.filter((line) => line.is_featured).length;
  const maxDiscount = form.contract_products.reduce(
    (max, line) => Math.max(max, toNumber(line.discount_percentage)),
    0,
  );
  const maxCommission = form.contract_products.reduce(
    (max, line) => Math.max(max, toNumber(line.system_commission_percentage)),
    0,
  );

  const totalBefore = form.contract_products.reduce(
    (sum, line) => sum + toNumber(line.price_before_discount),
    0,
  );
  const totalAfter = form.contract_products.reduce(
    (sum, line) => sum + toNumber(line.price_after_discount),
    0,
  );

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
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty || saving) return;

      event.preventDefault();
      event.returnValue = t.unsaved;
    };

    window.addEventListener("beforeunload", handler);

    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saving, t.unsaved]);

  const loadOptions = React.useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    const controller = new AbortController();

    try {
      if (!silent) setInitialLoading(true);

      setRefreshing(true);
      setError("");

      const providerParams = new URLSearchParams({
        page: "1",
        page_size: "500",
        status: "ACTIVE",
      });

      const productParams = new URLSearchParams({
        page: "1",
        page_size: "500",
        status: "ACTIVE",
      });

      const [providersPayload, productsPayload] = await Promise.all([
        fetchJson<unknown>(makeApiUrl("/api/providers/", providerParams), {
          signal: controller.signal,
        }),
        fetchJson<unknown>(makeApiUrl("/api/products/", productParams), {
          signal: controller.signal,
        }),
      ]);

      setProviders(extractList(providersPayload).map(normalizeProvider).filter((item) => item.id));
      setProducts(extractList(productsPayload).map(normalizeProduct).filter((item) => item.id));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.loadError;

      setError(message);
      toast.error(message);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }

    return () => controller.abort();
  }, [t.loadError]);

  React.useEffect(() => {
    void loadOptions();

    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as FormState;

        if (parsed && Array.isArray(parsed.contract_products)) {
          setForm({
            ...createInitialForm(),
            ...parsed,
            contract_products: parsed.contract_products.map((line) => ({
              ...createLine(),
              ...line,
              uid: line.uid || createUid(),
            })),
          });
          setDirty(true);
          toast.success(t.draftLoaded);
        }
      }
    } catch {
      // ignore invalid drafts
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm<T extends keyof FormState>(key: T, value: FormState[T]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setDirty(true);
  }

  function updateLine<T extends keyof ContractProductLine>(
    uid: string,
    key: T,
    value: ContractProductLine[T],
  ) {
    setForm((current) => ({
      ...current,
      contract_products: current.contract_products.map((line) => {
        if (line.uid !== uid) return line;

        const nextLine = {
          ...line,
          [key]: value,
        };

        if (key === "price_before_discount" || key === "discount_percentage") {
          nextLine.price_after_discount = String(
            calculatePriceAfter(
              key === "price_before_discount" ? String(value) : nextLine.price_before_discount,
              key === "discount_percentage" ? String(value) : nextLine.discount_percentage,
            ),
          );
        }

        return nextLine;
      }),
    }));

    setDirty(true);
  }

  function addProductLine(productId: string) {
    const product = products.find((item) => String(item.id) === productId);

    if (!product) return;

    setForm((current) => ({
      ...current,
      contract_products: [...current.contract_products, createLine(product)],
    }));

    setDirty(true);
  }

  function removeProductLine(uid: string) {
    setForm((current) => ({
      ...current,
      contract_products: current.contract_products.filter((line) => line.uid !== uid),
    }));

    setDirty(true);
  }

  function saveDraft() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    setDirty(false);
    toast.success(t.draftSaved);
  }

  function clearForm() {
    if (!window.confirm(t.confirmClear)) return;

    setForm(createInitialForm());
    setDirty(false);
    setCreatedId(null);
    setError("");
    window.localStorage.removeItem(DRAFT_KEY);
    toast.success(t.cleared);
  }

  function validate() {
    if (!form.provider_id) {
      toast.error(t.requiredProvider);
      return false;
    }

    if (!form.contract_number.trim() && !form.title.trim()) {
      toast.error(t.requiredContract);
      return false;
    }

    if (!form.contract_products.length) {
      toast.error(t.requiredProducts);
      return false;
    }

    const hasInvalidProduct = form.contract_products.some((line) => !line.product_id);
    if (hasInvalidProduct) {
      toast.error(t.invalidProduct);
      return false;
    }

    const hasInvalidAmounts = form.contract_products.some((line) => {
      const before = toNumber(line.price_before_discount);
      const discount = toNumber(line.discount_percentage);
      const after = toNumber(line.price_after_discount);
      const commission = toNumber(line.system_commission_percentage);

      return before < 0 || discount < 0 || discount > 100 || after < 0 || commission < 0 || commission > 100;
    });

    if (hasInvalidAmounts) {
      toast.error(t.invalidAmounts);
      return false;
    }

    return true;
  }

  async function submitContract() {
    if (!validate()) return;

    setSaving(true);
    setError("");

    try {
      const payload = buildPayload(form);

      let response: ApiResponse;

      try {
        response = await fetchJson<ApiResponse>(makeApiUrl("/api/contracts/"), {
          method: "POST",
          body: payload,
        });
      } catch {
        response = await fetchJson<ApiResponse>(makeApiUrl("/api/contracts/create/"), {
          method: "POST",
          body: payload,
        });
      }

      const contractId = extractCreatedId(response);

      setCreatedId(contractId);
      setDirty(false);
      window.localStorage.removeItem(DRAFT_KEY);
      toast.success(t.saved);

      if (contractId) {
        router.push(`/system/contracts/${contractId}`);
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.submitError;

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (initialLoading) {
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
          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadOptions({ silent: true })}
            disabled={refreshing || saving}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={saveDraft} disabled={saving}>
            <Save className="h-4 w-4" />
            {t.saveDraft}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={clearForm} disabled={saving}>
            <RotateCcw className="h-4 w-4" />
            {t.clear}
          </Button>

          <Button
            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
            disabled={saving}
            onClick={() => void submitContract()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {saving ? t.saving : t.submit}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-4 text-right">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">{t.errorTitle}</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={t.requiredFields}
              value={requiredComplete ? t.complete : t.incomplete}
              trend={requiredComplete ? t.complete : t.incomplete}
              icon={ShieldCheck}
            />

            <KpiCard
              title={t.productsCount}
              value={formatInteger(form.contract_products.length)}
              trend={`${t.activeProducts}: ${formatInteger(activeProductsCount)}`}
              icon={Layers3}
            />

            <KpiCard
              title={t.maxDiscount}
              value={formatPercent(maxDiscount)}
              trend={`${t.featuredOffers}: ${formatInteger(featuredOffersCount)}`}
              icon={BadgePercent}
            />

            <KpiCard
              title={t.maxCommission}
              value={formatPercent(maxCommission)}
              trend={pricingLabel(form.pricing_model, locale)}
              icon={Sparkles}
            />
          </div>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.contractInfo}</CardTitle>
                <CardDescription>{t.contractTitle}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 md:col-span-2">
                  <FieldLabel>{t.provider}</FieldLabel>
                  <Select
                    value={form.provider_id}
                    onValueChange={(value) => updateForm("provider_id", value)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue placeholder={t.selectProvider} />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.length ? (
                        providers.map((provider) => (
                          <SelectItem key={provider.id} value={String(provider.id)}>
                            {getProviderDisplayName(provider)}
                            {provider.city ? ` — ${provider.city}` : ""}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none" disabled>
                          {t.noProviders}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.contractNumber}</FieldLabel>
                  <Input
                    value={form.contract_number}
                    onChange={(event) => updateForm("contract_number", event.target.value.toUpperCase())}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.placeholderContract}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.code}</FieldLabel>
                  <Input
                    value={form.code}
                    onChange={(event) => updateForm("code", event.target.value.toUpperCase())}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.code}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <FieldLabel>{t.contractTitle}</FieldLabel>
                  <Input
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.placeholderTitle}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.status}</FieldLabel>
                  <Select
                    value={form.status}
                    onValueChange={(value) => updateForm("status", value as ContractStatus)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">{t.draft}</SelectItem>
                      <SelectItem value="ACTIVE">{t.active}</SelectItem>
                      <SelectItem value="SUSPENDED">{t.suspended}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.pricingModel}</FieldLabel>
                  <Select
                    value={form.pricing_model}
                    onValueChange={(value) => updateForm("pricing_model", value as PricingModel)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MIXED">{t.mixed}</SelectItem>
                      <SelectItem value="DISCOUNT">{t.discount}</SelectItem>
                      <SelectItem value="COMMISSION">{t.commission}</SelectItem>
                      <SelectItem value="PERCENTAGE">{t.percentage}</SelectItem>
                      <SelectItem value="FIXED">{t.fixed}</SelectItem>
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
                    className="h-10 rounded-lg bg-background"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.endDate}</FieldLabel>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(event) => updateForm("end_date", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>{t.productsInfo}</CardTitle>
                  <CardDescription>{t.emptyProductsDesc}</CardDescription>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Select onValueChange={addProductLine} disabled={saving || !products.length}>
                    <SelectTrigger className="h-10 w-full rounded-lg bg-background sm:w-[320px]">
                      <SelectValue placeholder={t.selectProduct} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.length ? (
                        products.map((product) => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {getProductDisplayName(product)}
                            {product.category_name ? ` — ${product.category_name}` : ""}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none" disabled>
                          {t.noProducts}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    className="h-10 rounded-lg"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        contract_products: [...current.contract_products, createLine()],
                      }))
                    }
                    disabled={saving}
                  >
                    <Plus className="h-4 w-4" />
                    {t.addProduct}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pb-6">
              {form.contract_products.length ? (
                form.contract_products.map((line, index) => (
                  <Card key={line.uid} className="rounded-lg border bg-background shadow-none">
                    <CardHeader className="px-4 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">
                            {line.offer_title || line.product_name || `${t.product} ${index + 1}`}
                          </CardTitle>
                          <CardDescription className="truncate">
                            {line.product_type || t.unknown}
                          </CardDescription>
                        </div>

                        <Button
                          variant="outline"
                          className="h-9 rounded-lg text-red-600 hover:text-red-600"
                          onClick={() => removeProductLine(line.uid)}
                          disabled={saving}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t.remove}
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 px-4 pb-4">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2 md:col-span-2">
                          <FieldLabel>{t.product}</FieldLabel>
                          <Select
                            value={line.product_id}
                            onValueChange={(value) => {
                              const product = products.find((item) => String(item.id) === value);
                              updateLine(line.uid, "product_id", value);

                              if (product) {
                                updateLine(line.uid, "product_name", getProductDisplayName(product));
                                updateLine(line.uid, "product_type", product.product_type);

                                if (!line.price_before_discount && product.base_price) {
                                  updateLine(line.uid, "price_before_discount", String(product.base_price));
                                  updateLine(
                                    line.uid,
                                    "price_after_discount",
                                    String(calculatePriceAfter(String(product.base_price), line.discount_percentage)),
                                  );
                                }

                                if (!line.offer_title) {
                                  updateLine(line.uid, "offer_title", getProductDisplayName(product));
                                }
                              }
                            }}
                            disabled={saving}
                          >
                            <SelectTrigger className="h-10 rounded-lg bg-background">
                              <SelectValue placeholder={t.selectProduct} />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={String(product.id)}>
                                  {getProductDisplayName(product)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <FieldLabel>{t.type}</FieldLabel>
                          <Input
                            value={line.product_type}
                            onChange={(event) => updateLine(line.uid, "product_type", event.target.value)}
                            className="h-10 rounded-lg bg-background"
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-2">
                          <FieldLabel>{t.offerBadge}</FieldLabel>
                          <Input
                            value={line.offer_badge}
                            onChange={(event) => updateLine(line.uid, "offer_badge", event.target.value)}
                            className="h-10 rounded-lg bg-background"
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-2">
                          <FieldLabel>{t.priceBefore}</FieldLabel>
                          <div className="relative">
                            <Input
                              value={line.price_before_discount}
                              inputMode="decimal"
                              onChange={(event) =>
                                updateLine(line.uid, "price_before_discount", toEnglishDigits(event.target.value))
                              }
                              className="h-10 rounded-lg bg-background pl-8 text-right tabular-nums"
                              disabled={saving}
                            />
                            <SarIcon className="absolute left-3 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <FieldLabel>{t.discountPercentage}</FieldLabel>
                          <Input
                            value={line.discount_percentage}
                            inputMode="decimal"
                            onChange={(event) =>
                              updateLine(line.uid, "discount_percentage", toEnglishDigits(event.target.value))
                            }
                            className="h-10 rounded-lg bg-background text-right tabular-nums"
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-2">
                          <FieldLabel>{t.priceAfter}</FieldLabel>
                          <div className="relative">
                            <Input
                              value={line.price_after_discount}
                              inputMode="decimal"
                              onChange={(event) =>
                                updateLine(line.uid, "price_after_discount", toEnglishDigits(event.target.value))
                              }
                              className="h-10 rounded-lg bg-background pl-8 text-right tabular-nums"
                              disabled={saving}
                            />
                            <SarIcon className="absolute left-3 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <FieldLabel>{t.systemCommission}</FieldLabel>
                          <Input
                            value={line.system_commission_percentage}
                            inputMode="decimal"
                            onChange={(event) =>
                              updateLine(line.uid, "system_commission_percentage", toEnglishDigits(event.target.value))
                            }
                            className="h-10 rounded-lg bg-background text-right tabular-nums"
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <FieldLabel>{t.offerTitle}</FieldLabel>
                          <Input
                            value={line.offer_title}
                            onChange={(event) => updateLine(line.uid, "offer_title", event.target.value)}
                            className="h-10 rounded-lg bg-background"
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <FieldLabel>{t.offerSubtitle}</FieldLabel>
                          <Input
                            value={line.offer_subtitle}
                            onChange={(event) => updateLine(line.uid, "offer_subtitle", event.target.value)}
                            className="h-10 rounded-lg bg-background"
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-2">
                          <FieldLabel>{t.offerStart}</FieldLabel>
                          <Input
                            type="date"
                            value={line.offer_start_date}
                            onChange={(event) => updateLine(line.uid, "offer_start_date", event.target.value)}
                            className="h-10 rounded-lg bg-background"
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-2">
                          <FieldLabel>{t.offerEnd}</FieldLabel>
                          <Input
                            type="date"
                            value={line.offer_end_date}
                            onChange={(event) => updateLine(line.uid, "offer_end_date", event.target.value)}
                            className="h-10 rounded-lg bg-background"
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-2">
                          <FieldLabel>{t.priority}</FieldLabel>
                          <Input
                            value={line.priority}
                            inputMode="numeric"
                            onChange={(event) => updateLine(line.uid, "priority", toEnglishDigits(event.target.value))}
                            className="h-10 rounded-lg bg-background text-right tabular-nums"
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-2">
                          <FieldLabel>{t.usageLimit}</FieldLabel>
                          <Input
                            value={line.usage_limit}
                            inputMode="numeric"
                            onChange={(event) => updateLine(line.uid, "usage_limit", toEnglishDigits(event.target.value))}
                            className="h-10 rounded-lg bg-background text-right tabular-nums"
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <FieldLabel>{t.offerDescription}</FieldLabel>
                          <textarea
                            value={line.offer_description}
                            onChange={(event) => updateLine(line.uid, "offer_description", event.target.value)}
                            className="min-h-[96px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            disabled={saving}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <FieldLabel>{t.offerTerms}</FieldLabel>
                          <textarea
                            value={line.offer_terms}
                            onChange={(event) => updateLine(line.uid, "offer_terms", event.target.value)}
                            className="min-h-[96px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            disabled={saving}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 rounded-lg border bg-muted/20 p-3">
                        {(
                          [
                            ["is_active", t.activeLine],
                            ["is_featured", t.featured],
                            ["show_on_landing", t.landing],
                            ["show_on_mobile", t.mobile],
                            ["show_on_offers", t.offersPage],
                          ] as [keyof ContractProductLine, string][]
                        ).map(([key, label]) => (
                          <label
                            key={key}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
                          >
                            <Checkbox
                              checked={Boolean(line[key])}
                              onCheckedChange={(checked) =>
                                updateLine(line.uid, key, Boolean(checked) as never)
                              }
                              disabled={saving}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-lg border bg-background text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                    <Layers3 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{t.emptyProductsTitle}</p>
                    <p className="text-sm text-muted-foreground">{t.emptyProductsDesc}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.notesInfo}</CardTitle>
                <CardDescription>{t.notes}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>{t.notes}</FieldLabel>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.internalNotes}</FieldLabel>
                <textarea
                  value={form.internal_notes}
                  onChange={(event) => updateForm("internal_notes", event.target.value)}
                  className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{t.summary}</CardTitle>
                  <CardDescription>{t.readiness}</CardDescription>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 px-6 pb-6">
              <InfoRow label={t.provider} value={getProviderDisplayName(selectedProvider) || "—"} />
              <InfoRow label={t.contractNumber} value={form.contract_number || "—"} />
              <InfoRow label={t.contractTitle} value={form.title || "—"} />
              <InfoRow label={t.status} value={statusLabel(form.status, locale)} />
              <InfoRow label={t.pricingModel} value={pricingLabel(form.pricing_model, locale)} />
              <InfoRow label={t.startDate} value={form.start_date || "—"} />
              <InfoRow label={t.endDate} value={form.end_date || "—"} />
              <InfoRow label={t.productsCount} value={formatInteger(form.contract_products.length)} />
              <InfoRow label={t.activeProducts} value={formatInteger(activeProductsCount)} />
              <InfoRow label={t.featuredOffers} value={formatInteger(featuredOffersCount)} />
              <InfoRow label={t.maxDiscount} value={formatPercent(maxDiscount)} />
              <InfoRow label={t.maxCommission} value={formatPercent(maxCommission)} />
              <InfoRow label={t.priceBefore} value={<MoneyValue value={totalBefore} />} />
              <InfoRow label={t.priceAfter} value={<MoneyValue value={totalAfter} />} />

              <div className="grid gap-2 pt-4">
                <Button
                  className="h-10 rounded-lg bg-black text-white hover:bg-black/90"
                  disabled={saving}
                  onClick={() => void submitContract()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {saving ? t.saving : t.submit}
                </Button>

                <Button
                  variant="outline"
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                  onClick={saveDraft}
                >
                  <Save className="h-4 w-4" />
                  {t.saveDraft}
                </Button>

                {createdId ? (
                  <Button asChild variant="outline" className="h-10 rounded-lg bg-background">
                    <Link href={`/system/contracts/${createdId}`}>
                      <FileText className="h-4 w-4" />
                      {t.viewContract}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Store className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.provider}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {getProviderDisplayName(selectedProvider) || t.incomplete}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Layers3 className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.productsCount}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatInteger(form.contract_products.length)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <BadgePercent className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.maxDiscount}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatPercent(maxDiscount)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.startDate} / {t.endDate}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.start_date || "—"} / {form.end_date || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <img src={SAR_ICON} alt="" className="h-5 w-5 object-contain opacity-70" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">SAR</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.sarCurrency}
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