"use client";

/* ============================================================
   📂 app/system/products/create/page.tsx
   🧭 Primey Care — Create Product Premium Page
   ------------------------------------------------------------
   ✅ Same visual spirit as Products list + Product detail
   ✅ Product = fixed catalog item
   ✅ Provider pricing/offers stay in ContractProduct / Offers
   ✅ Real POST to /api/products/
   ✅ No mock data
   ✅ No localhost
   ✅ Internal UI only
   ✅ Local draft
   ✅ Arabic / English
   ✅ RTL / LTR
   ✅ English numerals
   ✅ SAR icon from /currency/sar.svg
   ✅ Sonner toast
   ✅ Permission-aware
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  Box,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  FileText,
  ImagePlus,
  Layers3,
  Loader2,
  Package,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ============================================================
   Types
============================================================ */

type Locale = "ar" | "en";
type Direction = "rtl" | "ltr";

type ProductType =
  | "card"
  | "membership"
  | "program"
  | "service"
  | "medical_service"
  | "package";

type ProductStatus = "active" | "draft" | "inactive" | "archived";

type ProductFormData = {
  name_ar: string;
  name_en: string;
  code: string;
  category_name: string;
  product_type: ProductType;
  status: ProductStatus;

  description_ar: string;
  description_en: string;

  base_price: string;
  sale_price: string;
  discount_percentage: string;

  has_duration: boolean;
  duration_days: string;
  has_expiry: boolean;
  valid_from: string;
  valid_until: string;

  is_public: boolean;
  is_featured: boolean;
  is_offer: boolean;
  allow_online_purchase: boolean;
  show_on_landing: boolean;
  show_on_mobile: boolean;
  show_on_offers: boolean;

  offer_title_ar: string;
  offer_title_en: string;
  offer_subtitle_ar: string;
  offer_subtitle_en: string;
  offer_badge_ar: string;
  offer_badge_en: string;
  offer_terms_ar: string;
  offer_terms_en: string;

  thumbnail_image_url: string;
  marketing_image_url: string;
};

type ProductFormErrors = Partial<Record<keyof ProductFormData | "form", string>>;

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  id?: number | string;
  product?: {
    id?: number | string;
  };
  data?: {
    id?: number | string;
    product?: {
      id?: number | string;
    };
  };
  result?: {
    id?: number | string;
  };
  errors?: Record<string, unknown>;
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

type Dict = {
  dir: Direction;
  pageTitle: string;
  subtitle: string;
  back: string;
  products: string;
  save: string;
  saving: string;
  reset: string;
  refresh: string;
  saveDraft: string;
  restoreDraft: string;
  deleteDraft: string;
  draftSaved: string;
  draftRestored: string;
  draftDeleted: string;
  confirmReset: string;
  confirmLeave: string;
  created: string;
  noPermission: string;

  basicInfo: string;
  basicInfoDesc: string;
  pricing: string;
  pricingDesc: string;
  availability: string;
  availabilityDesc: string;
  marketing: string;
  marketingDesc: string;
  images: string;
  imagesDesc: string;
  preview: string;
  readiness: string;
  summary: string;

  nameAr: string;
  nameEn: string;
  code: string;
  category: string;
  productType: string;
  status: string;
  descriptionAr: string;
  descriptionEn: string;
  basePrice: string;
  salePrice: string;
  discountPercentage: string;
  finalPrice: string;
  duration: string;
  durationDays: string;
  hasDuration: string;
  hasExpiry: string;
  validFrom: string;
  validUntil: string;

  visibility: string;
  isPublic: string;
  isFeatured: string;
  isOffer: string;
  allowOnlinePurchase: string;
  showOnLanding: string;
  showOnMobile: string;
  showOnOffers: string;

  offerTitleAr: string;
  offerTitleEn: string;
  offerSubtitleAr: string;
  offerSubtitleEn: string;
  offerBadgeAr: string;
  offerBadgeEn: string;
  offerTermsAr: string;
  offerTermsEn: string;

  thumbnailImage: string;
  marketingImage: string;
  imageUrl: string;

  card: string;
  membership: string;
  program: string;
  service: string;
  medicalService: string;
  package: string;

  active: string;
  draft: string;
  inactive: string;
  archived: string;

  complete: string;
  incomplete: string;
  required: string;
  invalidNumber: string;
  invalidDateRange: string;
  submitError: string;
  requiredFields: string;
  pricingReady: string;
  marketingReady: string;
  yes: string;
  no: string;
  notSet: string;
  sar: string;
};

/* ============================================================
   Constants
============================================================ */

const SAR_ICON = "/currency/sar.svg";
const DRAFT_KEY = "primey-care-system-product-create-draft-v2";
const PRODUCTS_ENDPOINT = "/api/products/";
const WHOAMI_ENDPOINT = "/api/auth/whoami/";

const initialForm: ProductFormData = {
  name_ar: "",
  name_en: "",
  code: "",
  category_name: "",
  product_type: "service",
  status: "active",

  description_ar: "",
  description_en: "",

  base_price: "0",
  sale_price: "0",
  discount_percentage: "0",

  has_duration: false,
  duration_days: "",
  has_expiry: false,
  valid_from: "",
  valid_until: "",

  is_public: true,
  is_featured: false,
  is_offer: false,
  allow_online_purchase: true,
  show_on_landing: false,
  show_on_mobile: false,
  show_on_offers: false,

  offer_title_ar: "",
  offer_title_en: "",
  offer_subtitle_ar: "",
  offer_subtitle_en: "",
  offer_badge_ar: "",
  offer_badge_en: "",
  offer_terms_ar: "",
  offer_terms_en: "",

  thumbnail_image_url: "",
  marketing_image_url: "",
};

const dictionaries: Record<Locale, Dict> = {
  ar: {
    dir: "rtl",
    pageTitle: "إنشاء منتج",
    subtitle:
      "إضافة منتج ثابت في كتالوج Primey Care. أسعار مقدمي الخدمة والعروض تدار لاحقًا من العقود والعروض.",
    back: "رجوع",
    products: "المنتجات",
    save: "حفظ المنتج",
    saving: "جاري الحفظ...",
    reset: "إعادة ضبط",
    refresh: "تحديث",
    saveDraft: "حفظ مسودة",
    restoreDraft: "استعادة المسودة",
    deleteDraft: "حذف المسودة",
    draftSaved: "تم حفظ المسودة محليًا",
    draftRestored: "تم استعادة المسودة",
    draftDeleted: "تم حذف المسودة",
    confirmReset: "هل تريد مسح البيانات الحالية؟",
    confirmLeave: "لديك تغييرات غير محفوظة. هل تريد المغادرة؟",
    created: "تم إنشاء المنتج بنجاح",
    noPermission: "لا تملك صلاحية إنشاء المنتجات",

    basicInfo: "البيانات الأساسية",
    basicInfoDesc: "اسم المنتج، الكود، التصنيف، النوع والحالة.",
    pricing: "التسعير الافتراضي",
    pricingDesc:
      "هذه أسعار كتالوج عامة. أسعار مقدمي الخدمة تدار من عقود المنتجات.",
    availability: "المدة والصلاحية",
    availabilityDesc: "إعداد مدة المنتج وتواريخ الصلاحية إن وجدت.",
    marketing: "التسويق والظهور",
    marketingDesc: "إعدادات ظهور المنتج والعرض الافتراضي.",
    images: "صور المنتج",
    imagesDesc: "روابط الصورة الرئيسية والصورة التسويقية.",
    preview: "معاينة المنتج",
    readiness: "جاهزية الإدخال",
    summary: "ملخص المنتج",

    nameAr: "اسم المنتج عربي",
    nameEn: "اسم المنتج إنجليزي",
    code: "كود المنتج",
    category: "التصنيف",
    productType: "نوع المنتج",
    status: "الحالة",
    descriptionAr: "الوصف عربي",
    descriptionEn: "الوصف إنجليزي",
    basePrice: "السعر الأساسي",
    salePrice: "سعر البيع",
    discountPercentage: "نسبة الخصم",
    finalPrice: "السعر النهائي",
    duration: "المدة",
    durationDays: "عدد الأيام",
    hasDuration: "له مدة",
    hasExpiry: "له تاريخ انتهاء",
    validFrom: "صالح من",
    validUntil: "صالح حتى",

    visibility: "الظهور",
    isPublic: "عام",
    isFeatured: "مميز",
    isOffer: "عرض",
    allowOnlinePurchase: "يسمح بالشراء الإلكتروني",
    showOnLanding: "إظهار في صفحة الهبوط",
    showOnMobile: "إظهار في تطبيق العميل",
    showOnOffers: "إظهار في صفحة العروض",

    offerTitleAr: "عنوان العرض عربي",
    offerTitleEn: "عنوان العرض إنجليزي",
    offerSubtitleAr: "وصف مختصر عربي",
    offerSubtitleEn: "وصف مختصر إنجليزي",
    offerBadgeAr: "شارة العرض عربي",
    offerBadgeEn: "شارة العرض إنجليزي",
    offerTermsAr: "شروط العرض عربي",
    offerTermsEn: "شروط العرض إنجليزي",

    thumbnailImage: "رابط الصورة الرئيسية",
    marketingImage: "رابط الصورة التسويقية",
    imageUrl: "رابط الصورة",

    card: "بطاقة",
    membership: "عضوية",
    program: "برنامج",
    service: "خدمة",
    medicalService: "خدمة طبية",
    package: "باقة",

    active: "نشط",
    draft: "مسودة",
    inactive: "غير نشط",
    archived: "مؤرشف",

    complete: "مكتمل",
    incomplete: "غير مكتمل",
    required: "هذا الحقل مطلوب",
    invalidNumber: "الرقم غير صحيح",
    invalidDateRange: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
    submitError: "تعذر إنشاء المنتج",
    requiredFields: "الحقول المطلوبة",
    pricingReady: "التسعير",
    marketingReady: "التسويق",
    yes: "نعم",
    no: "لا",
    notSet: "غير محدد",
    sar: "ر.س",
  },
  en: {
    dir: "ltr",
    pageTitle: "Create Product",
    subtitle:
      "Add a fixed catalog product in Primey Care. Provider-specific pricing and offers are managed later through contracts and offers.",
    back: "Back",
    products: "Products",
    save: "Save Product",
    saving: "Saving...",
    reset: "Reset",
    refresh: "Refresh",
    saveDraft: "Save draft",
    restoreDraft: "Restore draft",
    deleteDraft: "Delete draft",
    draftSaved: "Draft saved locally",
    draftRestored: "Draft restored",
    draftDeleted: "Draft deleted",
    confirmReset: "Do you want to clear the current data?",
    confirmLeave: "You have unsaved changes. Do you want to leave?",
    created: "Product created successfully",
    noPermission: "You do not have permission to create products",

    basicInfo: "Basic Information",
    basicInfoDesc: "Product name, code, category, type, and status.",
    pricing: "Default Pricing",
    pricingDesc:
      "These are general catalog prices. Provider-specific pricing is managed through product contracts.",
    availability: "Duration & Validity",
    availabilityDesc: "Configure product duration and validity dates if needed.",
    marketing: "Marketing & Visibility",
    marketingDesc: "Configure visibility and default offer metadata.",
    images: "Product Images",
    imagesDesc: "Main image and marketing image links.",
    preview: "Product Preview",
    readiness: "Input Readiness",
    summary: "Product Summary",

    nameAr: "Arabic Product Name",
    nameEn: "English Product Name",
    code: "Product Code",
    category: "Category",
    productType: "Product Type",
    status: "Status",
    descriptionAr: "Arabic Description",
    descriptionEn: "English Description",
    basePrice: "Base Price",
    salePrice: "Sale Price",
    discountPercentage: "Discount %",
    finalPrice: "Final Price",
    duration: "Duration",
    durationDays: "Duration days",
    hasDuration: "Has duration",
    hasExpiry: "Has expiry",
    validFrom: "Valid from",
    validUntil: "Valid until",

    visibility: "Visibility",
    isPublic: "Public",
    isFeatured: "Featured",
    isOffer: "Offer",
    allowOnlinePurchase: "Allow online purchase",
    showOnLanding: "Show on landing",
    showOnMobile: "Show on customer app",
    showOnOffers: "Show on offers page",

    offerTitleAr: "Arabic offer title",
    offerTitleEn: "English offer title",
    offerSubtitleAr: "Arabic offer subtitle",
    offerSubtitleEn: "English offer subtitle",
    offerBadgeAr: "Arabic offer badge",
    offerBadgeEn: "English offer badge",
    offerTermsAr: "Arabic offer terms",
    offerTermsEn: "English offer terms",

    thumbnailImage: "Thumbnail image URL",
    marketingImage: "Marketing image URL",
    imageUrl: "Image URL",

    card: "Card",
    membership: "Membership",
    program: "Program",
    service: "Service",
    medicalService: "Medical service",
    package: "Package",

    active: "Active",
    draft: "Draft",
    inactive: "Inactive",
    archived: "Archived",

    complete: "Complete",
    incomplete: "Incomplete",
    required: "This field is required",
    invalidNumber: "Invalid number",
    invalidDateRange: "End date must be after start date",
    submitError: "Unable to create product",
    requiredFields: "Required fields",
    pricingReady: "Pricing",
    marketingReady: "Marketing",
    yes: "Yes",
    no: "No",
    notSet: "Not set",
    sar: "SAR",
  },
};

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
  const normalized = toEnglishDigits(value ?? "0").replace(/,/g, "");
  const numeric = Number(normalized);

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";

  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function isAdminLike(payload: WhoamiPayload | null) {
  if (!payload) return false;

  const role = normalizeText(payload.role || payload.profile?.role);
  const userType = normalizeText(payload.user_type || payload.profile?.user_type);
  const workspace = normalizeText(payload.workspace || payload.profile?.workspace);

  return Boolean(
    payload.is_superuser ||
      payload.is_staff ||
      role === "system_admin" ||
      role === "superuser" ||
      userType === "system_admin" ||
      userType === "superuser" ||
      (workspace === "system" && role.includes("admin")),
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

    const error = new Error(message) as Error & {
      payload?: ApiResponse;
      status?: number;
    };

    error.payload = payload;
    error.status = response.status;

    throw error;
  }

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

function extractCreatedId(payload: ApiResponse) {
  return (
    payload.data?.product?.id ||
    payload.data?.id ||
    payload.product?.id ||
    payload.result?.id ||
    payload.id ||
    ""
  );
}

function calculateFinalPrice(form: ProductFormData) {
  const basePrice = toNumber(form.base_price);
  const discount = toNumber(form.discount_percentage);

  if (toNumber(form.sale_price) > 0) return toNumber(form.sale_price);
  if (discount <= 0) return basePrice;

  return Math.max(basePrice - basePrice * (discount / 100), 0);
}

function isFormDirty(form: ProductFormData) {
  return JSON.stringify(form) !== JSON.stringify(initialForm);
}

function validateForm(form: ProductFormData, t: Dict) {
  const errors: ProductFormErrors = {};

  if (!form.name_ar.trim() && !form.name_en.trim()) {
    errors.name_ar = t.required;
    errors.name_en = t.required;
  }

  if (!form.code.trim()) {
    errors.code = t.required;
  }

  if (toNumber(form.base_price) < 0) {
    errors.base_price = t.invalidNumber;
  }

  if (form.sale_price && toNumber(form.sale_price) < 0) {
    errors.sale_price = t.invalidNumber;
  }

  if (toNumber(form.discount_percentage) < 0 || toNumber(form.discount_percentage) > 100) {
    errors.discount_percentage = t.invalidNumber;
  }

  if (form.has_duration && toNumber(form.duration_days) <= 0) {
    errors.duration_days = t.invalidNumber;
  }

  if (form.has_expiry && form.valid_from && form.valid_until && form.valid_until < form.valid_from) {
    errors.valid_until = t.invalidDateRange;
  }

  return errors;
}

function buildPayload(form: ProductFormData) {
  const finalPrice = calculateFinalPrice(form);

  return {
    name: form.name_ar.trim() || form.name_en.trim(),
    name_ar: form.name_ar.trim(),
    name_en: form.name_en.trim(),
    code: form.code.trim(),
    sku: form.code.trim(),
    category_name: form.category_name.trim(),
    product_type: form.product_type,
    status: form.status,

    description: form.description_ar.trim() || form.description_en.trim(),
    description_ar: form.description_ar.trim(),
    description_en: form.description_en.trim(),

    price: toNumber(form.base_price).toFixed(2),
    base_price: toNumber(form.base_price).toFixed(2),
    sale_price: toNumber(form.sale_price) > 0 ? toNumber(form.sale_price).toFixed(2) : finalPrice.toFixed(2),
    final_price: finalPrice.toFixed(2),
    discount_percentage: toNumber(form.discount_percentage).toFixed(2),

    has_duration: form.has_duration,
    duration_days: form.has_duration ? toNumber(form.duration_days) : null,
    has_expiry: form.has_expiry,
    valid_from: form.has_expiry && form.valid_from ? form.valid_from : null,
    valid_until: form.has_expiry && form.valid_until ? form.valid_until : null,

    is_public: form.is_public,
    is_featured: form.is_featured,
    is_offer: form.is_offer,
    allow_online_purchase: form.allow_online_purchase,
    show_on_landing: form.show_on_landing,
    show_on_mobile: form.show_on_mobile,
    show_on_offers: form.show_on_offers,

    offer_title_ar: form.offer_title_ar.trim(),
    offer_title_en: form.offer_title_en.trim(),
    offer_subtitle_ar: form.offer_subtitle_ar.trim(),
    offer_subtitle_en: form.offer_subtitle_en.trim(),
    offer_badge_ar: form.offer_badge_ar.trim(),
    offer_badge_en: form.offer_badge_en.trim(),
    offer_terms_ar: form.offer_terms_ar.trim(),
    offer_terms_en: form.offer_terms_en.trim(),

    thumbnail_image_url: form.thumbnail_image_url.trim(),
    marketing_image_url: form.marketing_image_url.trim(),
  };
}

function statusLabel(status: ProductStatus, t: Dict) {
  const labels: Record<ProductStatus, string> = {
    active: t.active,
    draft: t.draft,
    inactive: t.inactive,
    archived: t.archived,
  };

  return labels[status] || t.draft;
}

function typeLabel(type: ProductType, t: Dict) {
  const labels: Record<ProductType, string> = {
    card: t.card,
    membership: t.membership,
    program: t.program,
    service: t.service,
    medical_service: t.medicalService,
    package: t.package,
  };

  return labels[type] || t.service;
}

/* ============================================================
   UI
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="text-xs font-medium text-red-600">{message}</p>;
}

function PremiumCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-slate-50">
          <Icon className="h-5 w-5 text-[#8c9cdc]" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function SwitchBox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-semibold transition",
        checked
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-600",
      )}
    >
      <span>{label}</span>
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} />
    </label>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="grid auto-cols-max grid-flow-col items-center gap-4 rounded-lg border bg-white p-4">
      <Icon className="size-6 text-[#8c9cdc] opacity-80" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span className="truncate text-lg font-semibold">{value}</span>
      </div>
    </div>
  );
}

/* ============================================================
   Page
============================================================ */

export default function ProductCreatePage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [whoami, setWhoami] = React.useState<WhoamiPayload | null>(null);
  const [form, setForm] = React.useState<ProductFormData>(initialForm);
  const [errors, setErrors] = React.useState<ProductFormErrors>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasDraft, setHasDraft] = React.useState(false);

  const t = dictionaries[locale];
  const dir = t.dir;

  const canCreate =
    hasPermission(whoami, "products.create") ||
    hasPermission(whoami, "products.add") ||
    isAdminLike(whoami) ||
    !whoami;

  const finalPrice = React.useMemo(() => calculateFinalPrice(form), [form]);
  const dirty = React.useMemo(() => isFormDirty(form), [form]);

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
    setHasDraft(Boolean(window.localStorage.getItem(DRAFT_KEY)));

    fetchJson<WhoamiPayload>(WHOAMI_ENDPOINT)
      .then((payload) => setWhoami(payload))
      .catch(() => setWhoami(null));
  }, []);

  React.useEffect(() => {
    if (!dirty || isSaving) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t.confirmLeave;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty, isSaving, t.confirmLeave]);

  const updateForm = <K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => {
      if (!current[key]) return current;

      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const restoreDraft = () => {
    const savedDraft = window.localStorage.getItem(DRAFT_KEY);

    if (!savedDraft) return;

    try {
      const parsed = JSON.parse(savedDraft) as Partial<ProductFormData>;

      setForm({
        ...initialForm,
        ...parsed,
      });

      toast.success(t.draftRestored);
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
    }
  };

  const deleteDraft = () => {
    window.localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    toast.success(t.draftDeleted);
  };

  const resetForm = () => {
    if (dirty && !window.confirm(t.confirmReset)) return;

    setForm(initialForm);
    setErrors({});
  };

  const saveDraft = () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    setHasDraft(true);
    toast.success(t.draftSaved);
  };

  const submit = async () => {
    if (!canCreate) {
      toast.error(t.noPermission);
      return;
    }

    const formErrors = validateForm(form, t);

    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      toast.error(t.submitError);
      return;
    }

    setIsSaving(true);

    try {
      const csrfToken = getCookie("csrftoken");

      const payload = await fetchJson<ApiResponse>(PRODUCTS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
        body: JSON.stringify(buildPayload(form)),
      });

      const createdId = extractCreatedId(payload);

      window.localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);

      toast.success(t.created);

      if (createdId) {
        router.push(`/system/products/${createdId}`);
      } else {
        router.push("/system/products");
      }
    } catch (submitError) {
      const error = submitError as Error & { payload?: { errors?: Record<string, unknown> } };
      const apiErrors = error.payload?.errors || {};

      if (apiErrors && typeof apiErrors === "object") {
        const mappedErrors: ProductFormErrors = {};

        Object.entries(apiErrors).forEach(([key, value]) => {
          const message = Array.isArray(value)
            ? String(value[0] || "")
            : typeof value === "string"
              ? value
              : "";

          if (message) {
            const fieldKey = key as keyof ProductFormErrors;
            mappedErrors[fieldKey] = message;
          }
        });

        setErrors((current) => ({
          ...current,
          ...mappedErrors,
          form: error.message,
        }));
      } else {
        setErrors((current) => ({
          ...current,
          form: error.message,
        }));
      }

      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div dir={dir} className="w-full space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-[#8c9cdc]" />
            {t.products}
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            {t.pageTitle}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {t.subtitle}
          </p>
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
              {t.products}
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg"
            onClick={saveDraft}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
            {t.saveDraft}
          </Button>

          {hasDraft ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg"
                onClick={restoreDraft}
                disabled={isSaving}
              >
                <RefreshCw className="h-4 w-4" />
                {t.restoreDraft}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg text-red-600 hover:text-red-700"
                onClick={deleteDraft}
                disabled={isSaving}
              >
                <Trash2 className="h-4 w-4" />
                {t.deleteDraft}
              </Button>
            </>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg"
            onClick={resetForm}
            disabled={isSaving}
          >
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </Button>

          <Button
            type="button"
            className="h-10 rounded-lg bg-slate-950 text-white hover:bg-slate-800"
            onClick={submit}
            disabled={isSaving || !canCreate}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isSaving ? t.saving : t.save}
          </Button>
        </div>
      </div>

      {errors.form ? (
        <Card className="rounded-xl border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-red-600" />
            <div className="space-y-1">
              <p className="font-semibold text-red-700">{t.submitError}</p>
              <p className="text-sm text-red-600">{errors.form}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <PremiumCard
            title={t.basicInfo}
            description={t.basicInfoDesc}
            icon={Package}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.nameAr}</Label>
                <Input
                  value={form.name_ar}
                  onChange={(event) => updateForm("name_ar", event.target.value)}
                  className="h-10 rounded-lg"
                  placeholder={t.nameAr}
                />
                <FieldError message={errors.name_ar} />
              </div>

              <div className="space-y-2">
                <Label>{t.nameEn}</Label>
                <Input
                  value={form.name_en}
                  onChange={(event) => updateForm("name_en", event.target.value)}
                  className="h-10 rounded-lg"
                  placeholder={t.nameEn}
                  dir="ltr"
                />
                <FieldError message={errors.name_en} />
              </div>

              <div className="space-y-2">
                <Label>{t.code}</Label>
                <Input
                  value={form.code}
                  onChange={(event) =>
                    updateForm("code", event.target.value.toUpperCase())
                  }
                  className="h-10 rounded-lg"
                  placeholder="PRD-001"
                  dir="ltr"
                />
                <FieldError message={errors.code} />
              </div>

              <div className="space-y-2">
                <Label>{t.category}</Label>
                <Input
                  value={form.category_name}
                  onChange={(event) => updateForm("category_name", event.target.value)}
                  className="h-10 rounded-lg"
                  placeholder={t.category}
                />
                <FieldError message={errors.category_name} />
              </div>

              <div className="space-y-2">
                <Label>{t.productType}</Label>
                <Select
                  value={form.product_type}
                  onValueChange={(value) => updateForm("product_type", value as ProductType)}
                >
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">{t.card}</SelectItem>
                    <SelectItem value="membership">{t.membership}</SelectItem>
                    <SelectItem value="program">{t.program}</SelectItem>
                    <SelectItem value="service">{t.service}</SelectItem>
                    <SelectItem value="medical_service">{t.medicalService}</SelectItem>
                    <SelectItem value="package">{t.package}</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError message={errors.product_type} />
              </div>

              <div className="space-y-2">
                <Label>{t.status}</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => updateForm("status", value as ProductStatus)}
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
                <FieldError message={errors.status} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>{t.descriptionAr}</Label>
                <textarea
                  value={form.description_ar}
                  onChange={(event) => updateForm("description_ar", event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                  placeholder={t.descriptionAr}
                />
                <FieldError message={errors.description_ar} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>{t.descriptionEn}</Label>
                <textarea
                  value={form.description_en}
                  onChange={(event) => updateForm("description_en", event.target.value)}
                  rows={4}
                  dir="ltr"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                  placeholder={t.descriptionEn}
                />
                <FieldError message={errors.description_en} />
              </div>
            </div>
          </PremiumCard>

          <PremiumCard
            title={t.pricing}
            description={t.pricingDesc}
            icon={CircleDollarSign}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t.basePrice}</Label>
                <div className="relative">
                  <Input
                    value={form.base_price}
                    onChange={(event) =>
                      updateForm("base_price", toEnglishDigits(event.target.value))
                    }
                    inputMode="decimal"
                    className="h-10 rounded-lg pe-10"
                    dir="ltr"
                  />
                  <SarIcon className="absolute end-3 top-1/2 -translate-y-1/2" />
                </div>
                <FieldError message={errors.base_price} />
              </div>

              <div className="space-y-2">
                <Label>{t.salePrice}</Label>
                <div className="relative">
                  <Input
                    value={form.sale_price}
                    onChange={(event) =>
                      updateForm("sale_price", toEnglishDigits(event.target.value))
                    }
                    inputMode="decimal"
                    className="h-10 rounded-lg pe-10"
                    dir="ltr"
                  />
                  <SarIcon className="absolute end-3 top-1/2 -translate-y-1/2" />
                </div>
                <FieldError message={errors.sale_price} />
              </div>

              <div className="space-y-2">
                <Label>{t.discountPercentage}</Label>
                <Input
                  value={form.discount_percentage}
                  onChange={(event) =>
                    updateForm("discount_percentage", toEnglishDigits(event.target.value))
                  }
                  inputMode="decimal"
                  className="h-10 rounded-lg"
                  dir="ltr"
                />
                <FieldError message={errors.discount_percentage} />
              </div>
            </div>
          </PremiumCard>

          <PremiumCard
            title={t.availability}
            description={t.availabilityDesc}
            icon={CalendarDays}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <SwitchBox
                label={t.hasDuration}
                checked={form.has_duration}
                onChange={(value) => updateForm("has_duration", value)}
              />

              <SwitchBox
                label={t.hasExpiry}
                checked={form.has_expiry}
                onChange={(value) => updateForm("has_expiry", value)}
              />

              {form.has_duration ? (
                <div className="space-y-2">
                  <Label>{t.durationDays}</Label>
                  <Input
                    value={form.duration_days}
                    onChange={(event) =>
                      updateForm("duration_days", toEnglishDigits(event.target.value))
                    }
                    inputMode="numeric"
                    className="h-10 rounded-lg"
                    dir="ltr"
                  />
                  <FieldError message={errors.duration_days} />
                </div>
              ) : null}

              {form.has_expiry ? (
                <>
                  <div className="space-y-2">
                    <Label>{t.validFrom}</Label>
                    <Input
                      type="date"
                      value={form.valid_from || todayIso()}
                      onChange={(event) => updateForm("valid_from", event.target.value)}
                      className="h-10 rounded-lg"
                    />
                    <FieldError message={errors.valid_from} />
                  </div>

                  <div className="space-y-2">
                    <Label>{t.validUntil}</Label>
                    <Input
                      type="date"
                      value={form.valid_until}
                      onChange={(event) => updateForm("valid_until", event.target.value)}
                      className="h-10 rounded-lg"
                    />
                    <FieldError message={errors.valid_until} />
                  </div>
                </>
              ) : null}
            </div>
          </PremiumCard>

          <PremiumCard
            title={t.marketing}
            description={t.marketingDesc}
            icon={BadgePercent}
          >
            <div className="space-y-4">
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                <SwitchBox
                  label={t.isPublic}
                  checked={form.is_public}
                  onChange={(value) => updateForm("is_public", value)}
                />

                <SwitchBox
                  label={t.isFeatured}
                  checked={form.is_featured}
                  onChange={(value) => updateForm("is_featured", value)}
                />

                <SwitchBox
                  label={t.isOffer}
                  checked={form.is_offer}
                  onChange={(value) => updateForm("is_offer", value)}
                />

                <SwitchBox
                  label={t.allowOnlinePurchase}
                  checked={form.allow_online_purchase}
                  onChange={(value) => updateForm("allow_online_purchase", value)}
                />

                <SwitchBox
                  label={t.showOnLanding}
                  checked={form.show_on_landing}
                  onChange={(value) => updateForm("show_on_landing", value)}
                />

                <SwitchBox
                  label={t.showOnMobile}
                  checked={form.show_on_mobile}
                  onChange={(value) => updateForm("show_on_mobile", value)}
                />

                <SwitchBox
                  label={t.showOnOffers}
                  checked={form.show_on_offers}
                  onChange={(value) => updateForm("show_on_offers", value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.offerTitleAr}</Label>
                  <Input
                    value={form.offer_title_ar}
                    onChange={(event) => updateForm("offer_title_ar", event.target.value)}
                    className="h-10 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.offerTitleEn}</Label>
                  <Input
                    value={form.offer_title_en}
                    onChange={(event) => updateForm("offer_title_en", event.target.value)}
                    className="h-10 rounded-lg"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.offerSubtitleAr}</Label>
                  <Input
                    value={form.offer_subtitle_ar}
                    onChange={(event) => updateForm("offer_subtitle_ar", event.target.value)}
                    className="h-10 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.offerSubtitleEn}</Label>
                  <Input
                    value={form.offer_subtitle_en}
                    onChange={(event) => updateForm("offer_subtitle_en", event.target.value)}
                    className="h-10 rounded-lg"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.offerBadgeAr}</Label>
                  <Input
                    value={form.offer_badge_ar}
                    onChange={(event) => updateForm("offer_badge_ar", event.target.value)}
                    className="h-10 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.offerBadgeEn}</Label>
                  <Input
                    value={form.offer_badge_en}
                    onChange={(event) => updateForm("offer_badge_en", event.target.value)}
                    className="h-10 rounded-lg"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>{t.offerTermsAr}</Label>
                  <textarea
                    value={form.offer_terms_ar}
                    onChange={(event) => updateForm("offer_terms_ar", event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>{t.offerTermsEn}</Label>
                  <textarea
                    value={form.offer_terms_en}
                    onChange={(event) => updateForm("offer_terms_en", event.target.value)}
                    rows={3}
                    dir="ltr"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                  />
                </div>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard
            title={t.images}
            description={t.imagesDesc}
            icon={ImagePlus}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.thumbnailImage}</Label>
                <Input
                  value={form.thumbnail_image_url}
                  onChange={(event) => updateForm("thumbnail_image_url", event.target.value)}
                  className="h-10 rounded-lg"
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label>{t.marketingImage}</Label>
                <Input
                  value={form.marketing_image_url}
                  onChange={(event) => updateForm("marketing_image_url", event.target.value)}
                  className="h-10 rounded-lg"
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
            </div>
          </PremiumCard>
        </div>

        <div className="space-y-4 xl:col-span-1">
          <div className="sticky top-20 space-y-4">
            <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-[#8c9cdc]" />
                  <h3 className="font-bold">{t.preview}</h3>
                </div>

                <div className="overflow-hidden rounded-xl border bg-slate-50">
                  <div className="flex aspect-[4/3] items-center justify-center bg-white">
                    {form.thumbnail_image_url || form.marketing_image_url ? (
                      <img
                        src={form.thumbnail_image_url || form.marketing_image_url}
                        alt={form.name_ar || form.name_en || t.pageTitle}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Box className="h-10 w-10" />
                        <span className="text-sm">{t.images}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        {statusLabel(form.status, t)}
                      </Badge>

                      <Badge variant="outline" className="rounded-full">
                        {typeLabel(form.product_type, t)}
                      </Badge>

                      {form.is_offer ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-amber-200 bg-amber-50 text-amber-700"
                        >
                          {t.isOffer}
                        </Badge>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="line-clamp-2 text-lg font-black text-slate-950">
                        {form.name_ar || form.name_en || t.pageTitle}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {form.description_ar || form.description_en || t.basicInfoDesc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-white p-3">
                      <span className="text-sm text-slate-500">{t.finalPrice}</span>
                      <MoneyValue value={finalPrice} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#8c9cdc]" />
                  <h3 className="font-bold">{t.readiness}</h3>
                </div>

                <div className="grid gap-3">
                  <KpiCard
                    title={t.requiredFields}
                    value={
                      form.name_ar.trim() || form.name_en.trim() ? t.complete : t.incomplete
                    }
                    icon={CheckCircle2}
                  />

                  <KpiCard
                    title={t.pricingReady}
                    value={<MoneyValue value={finalPrice} />}
                    icon={CircleDollarSign}
                  />

                  <KpiCard
                    title={t.marketingReady}
                    value={
                      form.show_on_landing ||
                      form.show_on_mobile ||
                      form.show_on_offers ||
                      form.is_featured
                        ? t.yes
                        : t.no
                    }
                    icon={Layers3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-[#8c9cdc]" />
                  <h3 className="font-bold">{t.summary}</h3>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{t.code}</span>
                    <span className="font-semibold">{form.code || t.notSet}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{t.category}</span>
                    <span className="font-semibold">{form.category_name || t.notSet}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{t.productType}</span>
                    <span className="font-semibold">{typeLabel(form.product_type, t)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{t.status}</span>
                    <span className="font-semibold">{statusLabel(form.status, t)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{t.discountPercentage}</span>
                    <span className="font-semibold">{formatPercent(form.discount_percentage)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{t.duration}</span>
                    <span className="font-semibold">
                      {form.has_duration ? `${formatNumber(form.duration_days)} ${t.durationDays}` : t.notSet}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  className="mt-2 h-10 w-full rounded-lg bg-slate-950 text-white hover:bg-slate-800"
                  onClick={submit}
                  disabled={isSaving || !canCreate}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {isSaving ? t.saving : t.save}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}