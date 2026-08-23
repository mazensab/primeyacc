"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type Locale = "ar" | "en";

type SetupChecklistItem = {
  code: string;
  label: string;
  is_complete: boolean;
  severity: "required" | "recommended" | "optional" | string;
};

type SetupData = {
  company: Record<string, unknown>;
  settings: Record<string, unknown>;
  operational_settings: Record<string, unknown>;
  default_branch: Record<string, unknown> | null;
  checklist: SetupChecklistItem[];
  readiness: {
    is_ready: boolean;
    score: number;
    total_checks: number;
    completed_checks: number;
    required_checks: number;
    required_completed: number;
    missing_required: string[];
    missing_recommended: string[];
  };
  onboarding: {
    managed: boolean;
    required: boolean;
    ready: boolean;
    status: string | null;
    current_step: string;
  };
  subscription_access: {
    access: string;
  };
  workspace_path: string;
  current_role: string;
};

type SetupForm = {
  name: string;
  name_ar: string;
  name_en: string;
  commercial_registration: string;
  tax_number: string;
  email: string;
  phone: string;
  mobile: string;
  whatsapp_number: string;
  country: string;
  city: string;
  region: string;
  district: string;
  street_name: string;
  building_number: string;
  postal_code: string;
  short_address: string;
  address: string;
  currency_code: string;

  default_language: string;
  timezone_name: string;
  date_format: string;
  time_format: string;
  fiscal_year_start_month: string;
  fiscal_year_start_day: string;
  invoice_prefix: string;
  quotation_prefix: string;
  purchase_prefix: string;
  receipt_prefix: string;
  payment_prefix: string;
  enable_vat: boolean;
  default_vat_percentage: string;
  enable_inventory_tracking: boolean;
  enable_pos: boolean;
  enable_purchases: boolean;
  enable_hr: boolean;
  allow_negative_stock: boolean;
  require_customer_for_sales: boolean;
  require_supplier_for_purchases: boolean;

  branch_name: string;
  branch_name_ar: string;
  branch_name_en: string;
  branch_manager_name: string;
  branch_email: string;
  branch_phone: string;
  branch_mobile: string;
  branch_whatsapp_number: string;
  branch_country: string;
  branch_city: string;
  branch_region: string;
  branch_district: string;
  branch_street_name: string;
  branch_building_number: string;
  branch_postal_code: string;
  branch_short_address: string;
  branch_address: string;
  branch_opening_time: string;
  branch_closing_time: string;
};

const EMPTY_FORM: SetupForm = {
  name: "",
  name_ar: "",
  name_en: "",
  commercial_registration: "",
  tax_number: "",
  email: "",
  phone: "",
  mobile: "",
  whatsapp_number: "",
  country: "SA",
  city: "",
  region: "",
  district: "",
  street_name: "",
  building_number: "",
  postal_code: "",
  short_address: "",
  address: "",
  currency_code: "SAR",

  default_language: "ar",
  timezone_name: "Asia/Riyadh",
  date_format: "YYYY-MM-DD",
  time_format: "HH:mm",
  fiscal_year_start_month: "1",
  fiscal_year_start_day: "1",
  invoice_prefix: "INV",
  quotation_prefix: "QUO",
  purchase_prefix: "PUR",
  receipt_prefix: "REC",
  payment_prefix: "PAY",
  enable_vat: true,
  default_vat_percentage: "15.00",
  enable_inventory_tracking: true,
  enable_pos: true,
  enable_purchases: true,
  enable_hr: true,
  allow_negative_stock: false,
  require_customer_for_sales: false,
  require_supplier_for_purchases: false,

  branch_name: "",
  branch_name_ar: "",
  branch_name_en: "",
  branch_manager_name: "",
  branch_email: "",
  branch_phone: "",
  branch_mobile: "",
  branch_whatsapp_number: "",
  branch_country: "SA",
  branch_city: "",
  branch_region: "",
  branch_district: "",
  branch_street_name: "",
  branch_building_number: "",
  branch_postal_code: "",
  branch_short_address: "",
  branch_address: "",
  branch_opening_time: "",
  branch_closing_time: "",
};

const copy = {
  ar: {
    badge: "تهيئة الشركة",
    title: "لنجهّز شركتك للعمل",
    subtitle:
      "أكمل الإعدادات الأساسية مرة واحدة، وبعدها ستفتح لك مساحة Mhamcloud التشغيلية بالكامل.",
    loading: "جارٍ تحميل بيانات التهيئة...",
    loadError: "تعذر تحميل بيانات تهيئة الشركة.",
    retry: "إعادة المحاولة",
    save: "حفظ ومتابعة",
    saving: "جارٍ الحفظ...",
    complete: "إكمال التهيئة والدخول",
    completing: "جارٍ إكمال التهيئة...",
    back: "السابق",
    next: "التالي",
    ready: "جاهز للإكمال",
    notReady: "توجد متطلبات أساسية ناقصة",
    progress: "نسبة الجاهزية",
    required: "إلزامي",
    recommended: "موصى به",
    completed: "مكتمل",
    missing: "ناقص",
    company: "بيانات الشركة",
    companyDesc: "راجع هوية الشركة وبياناتها الرسمية ووسائل التواصل.",
    operations: "الإعدادات التشغيلية",
    operationsDesc: "حدد اللغة والمنطقة الزمنية والسنة المالية والوحدات المطلوبة.",
    branch: "الفرع الرئيسي",
    branchDesc: "أدخل بيانات الفرع الافتراضي الذي ستبدأ منه العمليات.",
    review: "المراجعة والتشغيل",
    reviewDesc: "راجع الجاهزية ثم أكمل التهيئة لفتح مساحة الشركة.",
    companyName: "اسم الشركة",
    arabicName: "الاسم بالعربية",
    englishName: "الاسم بالإنجليزية",
    cr: "السجل التجاري",
    tax: "الرقم الضريبي",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    mobile: "الجوال",
    whatsapp: "واتساب",
    country: "الدولة",
    city: "المدينة",
    region: "المنطقة",
    district: "الحي",
    street: "الشارع",
    building: "رقم المبنى",
    postal: "الرمز البريدي",
    shortAddress: "العنوان المختصر",
    address: "العنوان",
    currency: "العملة",
    language: "اللغة الافتراضية",
    timezone: "المنطقة الزمنية",
    fiscalMonth: "شهر بداية السنة المالية",
    fiscalDay: "يوم بداية السنة المالية",
    vatEnabled: "تفعيل ضريبة القيمة المضافة",
    vatRate: "نسبة الضريبة",
    inventory: "تتبع المخزون",
    pos: "نقاط البيع",
    purchases: "المشتريات",
    hr: "الموارد البشرية",
    negativeStock: "السماح بالمخزون السالب",
    requireCustomer: "اشتراط العميل للمبيعات",
    requireSupplier: "اشتراط المورد للمشتريات",
    vatHint: "عند تفعيل الضريبة يصبح الرقم الضريبي متطلبًا إلزاميًا لإكمال التهيئة.",
    documentPrefixes: "بادئات المستندات",
    invoicePrefix: "الفواتير",
    quotationPrefix: "عروض الأسعار",
    purchasePrefix: "المشتريات",
    receiptPrefix: "سندات القبض",
    paymentPrefix: "سندات الصرف",
    branchName: "اسم الفرع الرئيسي",
    branchNameAr: "اسم الفرع بالعربية",
    branchNameEn: "اسم الفرع بالإنجليزية",
    manager: "مدير الفرع",
    openingTime: "وقت الافتتاح",
    closingTime: "وقت الإغلاق",
    checklist: "قائمة الجاهزية",
    checklistDesc:
      "Mhamcloud يعتمد على تحقق الخادم، وليس على حالة محلية في المتصفح.",
    requiredMissing: "المتطلبات الإلزامية الناقصة",
    recommendedMissing: "البيانات الموصى باستكمالها",
    noMissingRequired: "جميع المتطلبات الإلزامية مكتملة.",
    optionalLater: "يمكن استكمال البيانات الموصى بها لاحقًا.",
    saveSuccess: "تم حفظ بيانات التهيئة.",
    completeSuccess: "اكتملت تهيئة الشركة بنجاح.",
    subscriptionRequired: "يجب تفعيل الاشتراك قبل بدء تهيئة الشركة.",
    ownerOnly: "هذا الإجراء متاح لمالك الشركة أو المدير فقط.",
    managedRequired: "تعذر العثور على دورة تهيئة لهذه الشركة.",
    validationError: "راجع الحقول المطلوبة قبل المتابعة.",
    statusRequired: "بانتظار الإعداد",
    statusProgress: "جارٍ الإعداد",
    statusReady: "جاهزة",
    step: "الخطوة",
    of: "من",
    security:
      "يتم تحديد الشركة من الجلسة والعضوية الحالية ولا يتم إرسال company_id من الواجهة.",
    serverAuthority:
      "لن يتم فتح مساحة الشركة التشغيلية إلا بعد اعتماد الخادم لحالة READY.",
  },
  en: {
    badge: "Company setup",
    title: "Let’s prepare your company",
    subtitle:
      "Complete the essential setup once, then your full Mhamcloud company workspace will be unlocked.",
    loading: "Loading company setup...",
    loadError: "Could not load company setup.",
    retry: "Try again",
    save: "Save & continue",
    saving: "Saving...",
    complete: "Complete setup & enter",
    completing: "Completing setup...",
    back: "Back",
    next: "Next",
    ready: "Ready to complete",
    notReady: "Required setup items are missing",
    progress: "Readiness",
    required: "Required",
    recommended: "Recommended",
    completed: "Completed",
    missing: "Missing",
    company: "Company details",
    companyDesc:
      "Review the company identity, statutory information, contact details and address.",
    operations: "Operational settings",
    operationsDesc:
      "Set the language, timezone, fiscal year and initial operating modules.",
    branch: "Main branch",
    branchDesc:
      "Enter the default branch that will be used when operations start.",
    review: "Review & activate",
    reviewDesc:
      "Review server readiness and complete onboarding to unlock the company workspace.",
    companyName: "Company name",
    arabicName: "Arabic name",
    englishName: "English name",
    cr: "Commercial registration",
    tax: "VAT / Tax number",
    email: "Email",
    phone: "Phone",
    mobile: "Mobile",
    whatsapp: "WhatsApp",
    country: "Country",
    city: "City",
    region: "Region",
    district: "District",
    street: "Street",
    building: "Building number",
    postal: "Postal code",
    shortAddress: "Short address",
    address: "Address",
    currency: "Currency",
    language: "Default language",
    timezone: "Timezone",
    fiscalMonth: "Fiscal year start month",
    fiscalDay: "Fiscal year start day",
    vatEnabled: "Enable VAT",
    vatRate: "VAT percentage",
    inventory: "Inventory tracking",
    pos: "Point of sale",
    purchases: "Purchases",
    hr: "Human resources",
    negativeStock: "Allow negative stock",
    requireCustomer: "Require customer for sales",
    requireSupplier: "Require supplier for purchases",
    vatHint:
      "When VAT is enabled, the tax number becomes required before onboarding can be completed.",
    documentPrefixes: "Document prefixes",
    invoicePrefix: "Invoices",
    quotationPrefix: "Quotations",
    purchasePrefix: "Purchases",
    receiptPrefix: "Receipts",
    paymentPrefix: "Payments",
    branchName: "Main branch name",
    branchNameAr: "Arabic branch name",
    branchNameEn: "English branch name",
    manager: "Branch manager",
    openingTime: "Opening time",
    closingTime: "Closing time",
    checklist: "Readiness checklist",
    checklistDesc:
      "Mhamcloud relies on server-side readiness, not browser-local state.",
    requiredMissing: "Missing required items",
    recommendedMissing: "Recommended information to complete",
    noMissingRequired: "All required setup items are complete.",
    optionalLater: "Recommended information can be completed later.",
    saveSuccess: "Setup data saved.",
    completeSuccess: "Company setup completed successfully.",
    subscriptionRequired:
      "An active subscription is required before company setup.",
    ownerOnly: "Only the company owner or an administrator can do this.",
    managedRequired: "No onboarding lifecycle was found for this company.",
    validationError: "Review the required fields before continuing.",
    statusRequired: "Setup required",
    statusProgress: "In progress",
    statusReady: "Ready",
    step: "Step",
    of: "of",
    security:
      "The company is resolved from the authenticated membership; the frontend never sends company_id.",
    serverAuthority:
      "The operational workspace remains locked until the server confirms READY.",
  },
} as const;

function getLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function apiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    ""
  ).replace(/\/+$/, "");
}

function setupApiUrl(): string {
  const base = apiBase();

  if (!base) return "/api/company/setup/";

  if (base.endsWith("/api")) {
    return `${base}/company/setup/`;
  }

  return `${base}/api/company/setup/`;
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";

  const row = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  return row
    ? decodeURIComponent(row.slice(name.length + 1))
    : "";
}

function extractError(payload: unknown, fallback: string): string {
  const value = record(payload);

  const direct =
    stringValue(value.message) ||
    stringValue(value.detail) ||
    stringValue(value.error);

  return direct || fallback;
}

function formFromData(data: SetupData): SetupForm {
  const company = record(data.company);
  const settings = record(
    data.operational_settings || data.settings,
  );
  const branch = record(data.default_branch);

  return {
    ...EMPTY_FORM,

    name: stringValue(company.name),
    name_ar: stringValue(company.name_ar),
    name_en: stringValue(company.name_en),
    commercial_registration: stringValue(
      company.commercial_registration,
    ),
    tax_number: stringValue(company.tax_number),
    email: stringValue(company.email),
    phone: stringValue(company.phone),
    mobile: stringValue(company.mobile),
    whatsapp_number: stringValue(
      company.whatsapp_number,
    ),
    country: stringValue(company.country, "SA"),
    city: stringValue(company.city),
    region: stringValue(company.region),
    district: stringValue(company.district),
    street_name: stringValue(company.street_name),
    building_number: stringValue(
      company.building_number,
    ),
    postal_code: stringValue(company.postal_code),
    short_address: stringValue(company.short_address),
    address: stringValue(company.address),
    currency_code: stringValue(
      company.currency_code,
      "SAR",
    ),

    default_language: stringValue(
      settings.default_language,
      "ar",
    ),
    timezone_name: stringValue(
      settings.timezone_name,
      "Asia/Riyadh",
    ),
    date_format: stringValue(
      settings.date_format,
      "YYYY-MM-DD",
    ),
    time_format: stringValue(
      settings.time_format,
      "HH:mm",
    ),
    fiscal_year_start_month: stringValue(
      settings.fiscal_year_start_month,
      "1",
    ),
    fiscal_year_start_day: stringValue(
      settings.fiscal_year_start_day,
      "1",
    ),
    invoice_prefix: stringValue(
      settings.invoice_prefix,
      "INV",
    ),
    quotation_prefix: stringValue(
      settings.quotation_prefix,
      "QUO",
    ),
    purchase_prefix: stringValue(
      settings.purchase_prefix,
      "PUR",
    ),
    receipt_prefix: stringValue(
      settings.receipt_prefix,
      "REC",
    ),
    payment_prefix: stringValue(
      settings.payment_prefix,
      "PAY",
    ),

    enable_vat: booleanValue(
      settings.enable_vat,
      true,
    ),
    default_vat_percentage: stringValue(
      settings.default_vat_percentage,
      "15.00",
    ),
    enable_inventory_tracking: booleanValue(
      settings.enable_inventory_tracking,
      true,
    ),
    enable_pos: booleanValue(
      settings.enable_pos,
      true,
    ),
    enable_purchases: booleanValue(
      settings.enable_purchases,
      true,
    ),
    enable_hr: booleanValue(
      settings.enable_hr,
      true,
    ),
    allow_negative_stock: booleanValue(
      settings.allow_negative_stock,
      false,
    ),
    require_customer_for_sales: booleanValue(
      settings.require_customer_for_sales,
      false,
    ),
    require_supplier_for_purchases: booleanValue(
      settings.require_supplier_for_purchases,
      false,
    ),

    branch_name: stringValue(branch.name),
    branch_name_ar: stringValue(branch.name_ar),
    branch_name_en: stringValue(branch.name_en),
    branch_manager_name: stringValue(
      branch.manager_name,
    ),
    branch_email: stringValue(branch.email),
    branch_phone: stringValue(branch.phone),
    branch_mobile: stringValue(branch.mobile),
    branch_whatsapp_number: stringValue(
      branch.whatsapp_number,
    ),
    branch_country: stringValue(
      branch.country,
      stringValue(company.country, "SA"),
    ),
    branch_city: stringValue(
      branch.city,
      stringValue(company.city),
    ),
    branch_region: stringValue(
      branch.region,
      stringValue(company.region),
    ),
    branch_district: stringValue(branch.district),
    branch_street_name: stringValue(
      branch.street_name,
    ),
    branch_building_number: stringValue(
      branch.building_number,
    ),
    branch_postal_code: stringValue(
      branch.postal_code,
    ),
    branch_short_address: stringValue(
      branch.short_address,
    ),
    branch_address: stringValue(branch.address),
    branch_opening_time: stringValue(
      branch.opening_time,
    ).slice(0, 5),
    branch_closing_time: stringValue(
      branch.closing_time,
    ).slice(0, 5),
  };
}

function setupPayloadForStep(
  form: SetupForm,
  step: number,
): Record<string, unknown> {
  if (step === 0) {
    return {
      name: form.name,
      name_ar: form.name_ar,
      name_en: form.name_en,
      commercial_registration:
        form.commercial_registration,
      tax_number: form.tax_number,
      email: form.email,
      phone: form.phone,
      mobile: form.mobile,
      whatsapp_number: form.whatsapp_number,
      country: form.country,
      city: form.city,
      region: form.region,
      district: form.district,
      street_name: form.street_name,
      building_number: form.building_number,
      postal_code: form.postal_code,
      short_address: form.short_address,
      address: form.address,
      currency_code: "SAR",
    };
  }

  if (step === 1) {
    return {
      default_language: form.default_language,
      timezone_name: form.timezone_name,
      date_format: form.date_format,
      time_format: form.time_format,
      fiscal_year_start_month: Number(
        form.fiscal_year_start_month,
      ),
      fiscal_year_start_day: Number(
        form.fiscal_year_start_day,
      ),
      invoice_prefix: form.invoice_prefix,
      quotation_prefix: form.quotation_prefix,
      purchase_prefix: form.purchase_prefix,
      receipt_prefix: form.receipt_prefix,
      payment_prefix: form.payment_prefix,
      enable_vat: form.enable_vat,
      default_vat_percentage:
        form.default_vat_percentage,
      enable_inventory_tracking:
        form.enable_inventory_tracking,
      enable_pos: form.enable_pos,
      enable_purchases: form.enable_purchases,
      enable_hr: form.enable_hr,
      allow_negative_stock:
        form.allow_negative_stock,
      require_customer_for_sales:
        form.require_customer_for_sales,
      require_supplier_for_purchases:
        form.require_supplier_for_purchases,
    };
  }

  if (step === 2) {
    return {
      default_branch: {
        name:
          form.branch_name ||
          form.branch_name_ar ||
          form.branch_name_en ||
          "Main Branch",
        name_ar: form.branch_name_ar,
        name_en: form.branch_name_en,
        manager_name: form.branch_manager_name,
        email: form.branch_email,
        phone: form.branch_phone,
        mobile: form.branch_mobile,
        whatsapp_number:
          form.branch_whatsapp_number,
        country: form.branch_country || "SA",
        city: form.branch_city,
        region: form.branch_region,
        district: form.branch_district,
        street_name: form.branch_street_name,
        building_number:
          form.branch_building_number,
        postal_code: form.branch_postal_code,
        short_address:
          form.branch_short_address,
        address: form.branch_address,
        opening_time:
          form.branch_opening_time || null,
        closing_time:
          form.branch_closing_time || null,
      },
    };
  }

  return {};
}

async function requestSetup(
  method: "GET" | "PATCH" | "POST",
  body?: Record<string, unknown>,
): Promise<SetupData> {
  const headers = new Headers({
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  });

  if (method !== "GET") {
    headers.set("Content-Type", "application/json");

    const csrf =
      getCookie("csrftoken") ||
      getCookie("csrf_token");

    if (csrf) {
      headers.set("X-CSRFToken", csrf);
    }
  }

  const response = await fetch(setupApiUrl(), {
    method,
    credentials: "include",
    cache: "no-store",
    headers,
    body:
      method === "GET"
        ? undefined
        : JSON.stringify(body || {}),
  });

  let payload: unknown = {};

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error(
      extractError(
        payload,
        `HTTP ${response.status}`,
      ),
    ) as Error & {
      status?: number;
      code?: string;
      payload?: unknown;
    };

    error.status = response.status;

    const value = record(payload);
    error.code = stringValue(value.code);
    error.payload = payload;

    throw error;
  }

  const root = record(payload);
  const data = record(root.data);

  return data as unknown as SetupData;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  dir,
  disabled = false,
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  dir?: "ltr" | "rtl";
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? (
          <span className="ms-1 text-destructive">*</span>
        ) : null}
      </Label>

      <Input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        dir={dir}
        disabled={disabled}
        placeholder={placeholder}
        className="h-10 shadow-none"
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-background p-3">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) =>
          onChange(value === true)
        }
        className="mt-0.5"
      />

      <div className="min-w-0">
        <p className="text-sm font-medium">
          {label}
        </p>

        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StepIcon({
  step,
  currentStep,
  icon: Icon,
}: {
  step: number;
  currentStep: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  const complete = step < currentStep;
  const active = step === currentStep;

  return (
    <span
      className={[
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : complete
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "bg-background text-muted-foreground",
      ].join(" ")}
    >
      {complete ? (
        <Check className="h-4 w-4" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
    </span>
  );
}

export default function CompanySetupPage() {
  const router = useRouter();
  const {
    session,
    refreshSession,
  } = useAuthContext();

  const [locale, setLocale] =
    React.useState<Locale>("ar");

  const [step, setStep] = React.useState(0);
  const [data, setData] =
    React.useState<SetupData | null>(null);
  const [form, setForm] =
    React.useState<SetupForm>(EMPTY_FORM);

  const [loading, setLoading] =
    React.useState(true);
  const [saving, setSaving] =
    React.useState(false);
  const [completing, setCompleting] =
    React.useState(false);
  const [error, setError] =
    React.useState("");

  const t = copy[locale];
  const isArabic = locale === "ar";
  const direction = isArabic ? "rtl" : "ltr";

  const steps = React.useMemo(
    () => [
      {
        title: t.company,
        description: t.companyDesc,
        icon: Building2,
      },
      {
        title: t.operations,
        description: t.operationsDesc,
        icon: Settings2,
      },
      {
        title: t.branch,
        description: t.branchDesc,
        icon: MapPin,
      },
      {
        title: t.review,
        description: t.reviewDesc,
        icon: ShieldCheck,
      },
    ],
    [t],
  );

  React.useEffect(() => {
    const sync = () => {
      const next = getLocale();
      setLocale(next);

      document.documentElement.lang = next;
      document.documentElement.dir =
        next === "ar" ? "rtl" : "ltr";
      document.body.dir =
        next === "ar" ? "rtl" : "ltr";
    };

    sync();

    window.addEventListener(
      "primey-locale-changed",
      sync,
    );

    window.addEventListener(
      "storage",
      sync,
    );

    return () => {
      window.removeEventListener(
        "primey-locale-changed",
        sync,
      );

      window.removeEventListener(
        "storage",
        sync,
      );
    };
  }, []);

  const handleSetupError = React.useCallback(
    (
      caught: unknown,
      fallback: string,
    ) => {
      const err =
        caught instanceof Error
          ? (caught as Error & {
              code?: string;
              status?: number;
            })
          : null;

      if (
        err?.code ===
        "SUBSCRIPTION_ACCESS_REQUIRED"
      ) {
        toast.error(t.subscriptionRequired);
        router.replace(
          "/company/subscription",
        );
        return;
      }

      if (
        err?.code ===
          "ONBOARDING_UPDATE_FORBIDDEN" ||
        err?.code ===
          "ONBOARDING_COMPLETE_FORBIDDEN"
      ) {
        toast.error(t.ownerOnly);
        return;
      }

      if (
        err?.code ===
        "ONBOARDING_NOT_MANAGED"
      ) {
        toast.error(t.managedRequired);
        return;
      }

      toast.error(
        err?.message || fallback,
      );
    },
    [
      router,
      t.managedRequired,
      t.ownerOnly,
      t.subscriptionRequired,
    ],
  );

  const loadSetup = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        setError("");

        const nextData =
          await requestSetup("GET");

        setData(nextData);
        setForm(formFromData(nextData));

        if (
          nextData.subscription_access?.access !==
          "FULL"
        ) {
          router.replace(
            "/company/subscription",
          );
          return;
        }

        if (nextData.onboarding?.ready) {
          const refreshed =
            await refreshSession();

          router.replace(
            refreshed.dashboard_path ===
              "/company/setup"
              ? "/company"
              : refreshed.dashboard_path ||
                  "/company",
          );

          return;
        }

        if (
          nextData.default_branch &&
          nextData.onboarding?.status ===
            "IN_PROGRESS"
        ) {
          setStep(3);
        }
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : t.loadError;

        setError(message);

        handleSetupError(
          caught,
          t.loadError,
        );
      } finally {
        setLoading(false);
      }
    },
    [
      handleSetupError,
      refreshSession,
      router,
      t.loadError,
    ],
  );

  React.useEffect(() => {
    void loadSetup();
  }, [loadSetup]);

  const update = React.useCallback(
    <K extends keyof SetupForm>(
      key: K,
      value: SetupForm[K],
    ) => {
      setForm((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const validateStep = React.useCallback(
    (targetStep: number): boolean => {
      if (
        targetStep === 0 &&
        !form.name.trim()
      ) {
        toast.error(t.validationError);
        return false;
      }

      if (
        targetStep === 1 &&
        (
          !form.default_language ||
          !form.timezone_name ||
          !form.fiscal_year_start_month ||
          !form.fiscal_year_start_day
        )
      ) {
        toast.error(t.validationError);
        return false;
      }

      if (
        targetStep === 1 &&
        form.enable_vat &&
        !form.tax_number.trim()
      ) {
        toast.error(t.vatHint);
        return false;
      }

      if (
        targetStep === 2 &&
        !(
          form.branch_name.trim() ||
          form.branch_name_ar.trim() ||
          form.branch_name_en.trim()
        )
      ) {
        toast.error(t.validationError);
        return false;
      }

      return true;
    },
    [form, t],
  );

  const saveStep = React.useCallback(
    async (
      targetStep: number,
      moveNext = true,
    ) => {
      if (!validateStep(targetStep)) {
        return false;
      }

      setSaving(true);

      try {
        const payload =
          setupPayloadForStep(
            form,
            targetStep,
          );

        if (
          Object.keys(payload).length >
          0
        ) {
          const nextData =
            await requestSetup(
              "PATCH",
              payload,
            );

          setData(nextData);
          setForm(
            formFromData(nextData),
          );
        }

        toast.success(t.saveSuccess);

        if (moveNext) {
          setStep((current) =>
            Math.min(
              current + 1,
              steps.length - 1,
            ),
          );
        }

        return true;
      } catch (caught) {
        handleSetupError(
          caught,
          t.validationError,
        );

        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      form,
      handleSetupError,
      steps.length,
      t.saveSuccess,
      t.validationError,
      validateStep,
    ],
  );

  const completeSetup =
    React.useCallback(async () => {
      setCompleting(true);

      try {
        // Save all editable contracts before the
        // authoritative POST completion gate.
        for (
          let index = 0;
          index <= 2;
          index += 1
        ) {
          if (!validateStep(index)) {
            setStep(index);
            return;
          }

          const payload =
            setupPayloadForStep(
              form,
              index,
            );

          const nextData =
            await requestSetup(
              "PATCH",
              payload,
            );

          setData(nextData);
        }

        const completed =
          await requestSetup(
            "POST",
            {},
          );

        setData(completed);

        if (!completed.onboarding?.ready) {
          throw new Error(
            t.validationError,
          );
        }

        toast.success(
          t.completeSuccess,
        );

        const refreshed =
          await refreshSession();

        const destination =
          refreshed.dashboard_path &&
          refreshed.dashboard_path !==
            "/company/setup"
            ? refreshed.dashboard_path
            : "/company";

        router.replace(destination);
        router.refresh();
      } catch (caught) {
        handleSetupError(
          caught,
          t.validationError,
        );
      } finally {
        setCompleting(false);
      }
    }, [
      form,
      handleSetupError,
      refreshSession,
      router,
      t.completeSuccess,
      t.validationError,
      validateStep,
    ]);

  const statusLabel =
    data?.onboarding?.status === "READY"
      ? t.statusReady
      : data?.onboarding?.status ===
          "IN_PROGRESS"
        ? t.statusProgress
        : t.statusRequired;

  const progress =
    Number(data?.readiness?.score || 0);

  const canComplete =
    data?.readiness?.is_ready === true &&
    (data?.readiness?.missing_required
      ?.length || 0) === 0;

  if (loading) {
    return (
      <div
        dir={direction}
        className="flex min-h-[65vh] items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {t.loading}
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        dir={direction}
        className="mx-auto flex min-h-[65vh] max-w-2xl items-center"
      >
        <Card className="w-full rounded-2xl border-destructive/20 shadow-none">
          <CardHeader className="text-center">
            <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <CircleAlert className="h-5 w-5" />
            </span>

            <CardTitle>
              {t.loadError}
            </CardTitle>

            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex justify-center">
            <Button
              onClick={() =>
                void loadSetup()
              }
            >
              <RefreshCw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      dir={direction}
      className="mx-auto max-w-[1380px] space-y-5 pb-10"
    >
      <section className="overflow-hidden rounded-[1.5rem] border bg-gradient-to-br from-background via-background to-primary/[0.035] shadow-none">
        <div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[1fr_360px]">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t.badge}
            </div>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {t.title}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              {t.subtitle}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium">
                {stringValue(
                  data?.company?.display_name ||
                    data?.company?.name,
                  "Mhamcloud",
                )}
              </span>

              <span className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium">
                {statusLabel}
              </span>

              <span
                dir="ltr"
                className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium tabular-nums"
              >
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          <Card className="rounded-2xl border bg-background/80 shadow-none backdrop-blur">
            <CardHeader className="pb-3">
              <CardDescription>
                {t.progress}
              </CardDescription>

              <CardTitle
                dir="ltr"
                className="text-3xl tabular-nums"
              >
                {Math.round(progress)}%
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, progress),
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {data?.readiness
                    ?.completed_checks || 0}
                  /
                  {data?.readiness
                    ?.total_checks || 0}
                </span>

                <span>
                  {canComplete
                    ? t.ready
                    : t.notReady}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit rounded-2xl shadow-none xl:sticky xl:top-24">
          <CardHeader>
            <CardTitle className="text-base">
              {t.badge}
            </CardTitle>

            <CardDescription>
              {t.step} {step + 1} {t.of}{" "}
              {steps.length}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2">
            {steps.map(
              (item, index) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() =>
                      setStep(index)
                    }
                    className={[
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-start transition",
                      step === index
                        ? "border-primary/30 bg-primary/[0.055]"
                        : "border-transparent hover:border-border hover:bg-muted/30",
                    ].join(" ")}
                  >
                    <StepIcon
                      step={index}
                      currentStep={step}
                      icon={Icon}
                    />

                    <span className="min-w-0 pt-0.5">
                      <span className="block text-sm font-semibold">
                        {item.title}
                      </span>

                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              },
            )}

            <div className="mt-4 space-y-2 rounded-xl border bg-muted/20 p-3">
              <p className="flex gap-2 text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t.security}
              </p>

              <p className="flex gap-2 text-xs leading-5 text-muted-foreground">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t.serverAuthority}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {step === 0 ? (
            <Card className="rounded-2xl shadow-none">
              <CardHeader>
                <CardTitle>
                  {t.company}
                </CardTitle>
                <CardDescription>
                  {t.companyDesc}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field
                    label={t.companyName}
                    value={form.name}
                    onChange={(value) =>
                      update("name", value)
                    }
                    required
                  />

                  <Field
                    label={t.arabicName}
                    value={form.name_ar}
                    onChange={(value) =>
                      update("name_ar", value)
                    }
                    dir="rtl"
                  />

                  <Field
                    label={t.englishName}
                    value={form.name_en}
                    onChange={(value) =>
                      update("name_en", value)
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.cr}
                    value={
                      form.commercial_registration
                    }
                    onChange={(value) =>
                      update(
                        "commercial_registration",
                        value,
                      )
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.tax}
                    value={form.tax_number}
                    onChange={(value) =>
                      update(
                        "tax_number",
                        value,
                      )
                    }
                    dir="ltr"
                    required={form.enable_vat}
                  />

                  <Field
                    label={t.email}
                    type="email"
                    value={form.email}
                    onChange={(value) =>
                      update("email", value)
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.phone}
                    value={form.phone}
                    onChange={(value) =>
                      update("phone", value)
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.mobile}
                    value={form.mobile}
                    onChange={(value) =>
                      update("mobile", value)
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.whatsapp}
                    value={
                      form.whatsapp_number
                    }
                    onChange={(value) =>
                      update(
                        "whatsapp_number",
                        value,
                      )
                    }
                    dir="ltr"
                  />
                </div>

                <div className="border-t pt-5">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field
                      label={t.country}
                      value={form.country}
                      onChange={(value) =>
                        update(
                          "country",
                          value,
                        )
                      }
                    />

                    <Field
                      label={t.city}
                      value={form.city}
                      onChange={(value) =>
                        update("city", value)
                      }
                    />

                    <Field
                      label={t.region}
                      value={form.region}
                      onChange={(value) =>
                        update(
                          "region",
                          value,
                        )
                      }
                    />

                    <Field
                      label={t.district}
                      value={form.district}
                      onChange={(value) =>
                        update(
                          "district",
                          value,
                        )
                      }
                    />

                    <Field
                      label={t.street}
                      value={form.street_name}
                      onChange={(value) =>
                        update(
                          "street_name",
                          value,
                        )
                      }
                    />

                    <Field
                      label={t.building}
                      value={
                        form.building_number
                      }
                      onChange={(value) =>
                        update(
                          "building_number",
                          value,
                        )
                      }
                      dir="ltr"
                    />

                    <Field
                      label={t.postal}
                      value={form.postal_code}
                      onChange={(value) =>
                        update(
                          "postal_code",
                          value,
                        )
                      }
                      dir="ltr"
                    />

                    <Field
                      label={t.shortAddress}
                      value={form.short_address}
                      onChange={(value) =>
                        update(
                          "short_address",
                          value,
                        )
                      }
                    />
                  </div>

                  <div className="mt-4">
                    <Field
                      label={t.address}
                      value={form.address}
                      onChange={(value) =>
                        update(
                          "address",
                          value,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <Label>
                    {t.currency}
                  </Label>

                  <div className="mt-2 flex h-11 items-center gap-3 rounded-lg border bg-background px-3">
                    <span
                      aria-label="Saudi Riyal"
                      className="inline-block h-5 w-5 shrink-0 bg-contain bg-center bg-no-repeat"
                      style={{
                        backgroundImage:
                          'url("/currency/sar.svg")',
                      }}
                    />

                    <span
                      dir="ltr"
                      className="font-semibold tabular-nums"
                    >
                      SAR
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card className="rounded-2xl shadow-none">
              <CardHeader>
                <CardTitle>
                  {t.operations}
                </CardTitle>
                <CardDescription>
                  {t.operationsDesc}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label>
                      {t.language}
                    </Label>

                    <Select
                      value={
                        form.default_language
                      }
                      onValueChange={(value) =>
                        update(
                          "default_language",
                          value,
                        )
                      }
                    >
                      <SelectTrigger className="h-10 shadow-none">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="ar">
                          العربية
                        </SelectItem>

                        <SelectItem value="en">
                          English
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {t.timezone}
                    </Label>

                    <Select
                      value={
                        form.timezone_name
                      }
                      onValueChange={(value) =>
                        update(
                          "timezone_name",
                          value,
                        )
                      }
                    >
                      <SelectTrigger className="h-10 shadow-none">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="Asia/Riyadh">
                          Asia/Riyadh
                        </SelectItem>
                        <SelectItem value="UTC">
                          UTC
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {t.fiscalMonth}
                    </Label>

                    <Select
                      value={
                        form.fiscal_year_start_month
                      }
                      onValueChange={(value) =>
                        update(
                          "fiscal_year_start_month",
                          value,
                        )
                      }
                    >
                      <SelectTrigger
                        dir="ltr"
                        className="h-10 shadow-none"
                      >
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {Array.from(
                          { length: 12 },
                          (_, index) =>
                            index + 1,
                        ).map((month) => (
                          <SelectItem
                            key={month}
                            value={String(month)}
                          >
                            {String(month)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {t.fiscalDay}
                    </Label>

                    <Select
                      value={
                        form.fiscal_year_start_day
                      }
                      onValueChange={(value) =>
                        update(
                          "fiscal_year_start_day",
                          value,
                        )
                      }
                    >
                      <SelectTrigger
                        dir="ltr"
                        className="h-10 shadow-none"
                      >
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {Array.from(
                          { length: 31 },
                          (_, index) =>
                            index + 1,
                        ).map((day) => (
                          <SelectItem
                            key={day}
                            value={String(day)}
                          >
                            {String(day)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <ToggleRow
                    label={t.vatEnabled}
                    checked={form.enable_vat}
                    onChange={(value) =>
                      update(
                        "enable_vat",
                        value,
                      )
                    }
                    description={t.vatHint}
                  />

                  <ToggleRow
                    label={t.inventory}
                    checked={
                      form.enable_inventory_tracking
                    }
                    onChange={(value) =>
                      update(
                        "enable_inventory_tracking",
                        value,
                      )
                    }
                  />

                  <ToggleRow
                    label={t.pos}
                    checked={form.enable_pos}
                    onChange={(value) =>
                      update(
                        "enable_pos",
                        value,
                      )
                    }
                  />

                  <ToggleRow
                    label={t.purchases}
                    checked={
                      form.enable_purchases
                    }
                    onChange={(value) =>
                      update(
                        "enable_purchases",
                        value,
                      )
                    }
                  />

                  <ToggleRow
                    label={t.hr}
                    checked={form.enable_hr}
                    onChange={(value) =>
                      update(
                        "enable_hr",
                        value,
                      )
                    }
                  />

                  <ToggleRow
                    label={t.negativeStock}
                    checked={
                      form.allow_negative_stock
                    }
                    onChange={(value) =>
                      update(
                        "allow_negative_stock",
                        value,
                      )
                    }
                  />

                  <ToggleRow
                    label={t.requireCustomer}
                    checked={
                      form.require_customer_for_sales
                    }
                    onChange={(value) =>
                      update(
                        "require_customer_for_sales",
                        value,
                      )
                    }
                  />

                  <ToggleRow
                    label={t.requireSupplier}
                    checked={
                      form.require_supplier_for_purchases
                    }
                    onChange={(value) =>
                      update(
                        "require_supplier_for_purchases",
                        value,
                      )
                    }
                  />
                </div>

                {form.enable_vat ? (
                  <div className="max-w-xs">
                    <Field
                      label={t.vatRate}
                      value={
                        form.default_vat_percentage
                      }
                      onChange={(value) =>
                        update(
                          "default_vat_percentage",
                          value,
                        )
                      }
                      dir="ltr"
                      required
                    />
                  </div>
                ) : null}

                <div className="border-t pt-5">
                  <h3 className="mb-4 text-sm font-semibold">
                    {t.documentPrefixes}
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <Field
                      label={t.invoicePrefix}
                      value={form.invoice_prefix}
                      onChange={(value) =>
                        update(
                          "invoice_prefix",
                          value,
                        )
                      }
                      dir="ltr"
                    />

                    <Field
                      label={t.quotationPrefix}
                      value={
                        form.quotation_prefix
                      }
                      onChange={(value) =>
                        update(
                          "quotation_prefix",
                          value,
                        )
                      }
                      dir="ltr"
                    />

                    <Field
                      label={t.purchasePrefix}
                      value={form.purchase_prefix}
                      onChange={(value) =>
                        update(
                          "purchase_prefix",
                          value,
                        )
                      }
                      dir="ltr"
                    />

                    <Field
                      label={t.receiptPrefix}
                      value={form.receipt_prefix}
                      onChange={(value) =>
                        update(
                          "receipt_prefix",
                          value,
                        )
                      }
                      dir="ltr"
                    />

                    <Field
                      label={t.paymentPrefix}
                      value={form.payment_prefix}
                      onChange={(value) =>
                        update(
                          "payment_prefix",
                          value,
                        )
                      }
                      dir="ltr"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card className="rounded-2xl shadow-none">
              <CardHeader>
                <CardTitle>
                  {t.branch}
                </CardTitle>
                <CardDescription>
                  {t.branchDesc}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field
                    label={t.branchName}
                    value={form.branch_name}
                    onChange={(value) =>
                      update(
                        "branch_name",
                        value,
                      )
                    }
                    required
                  />

                  <Field
                    label={t.branchNameAr}
                    value={
                      form.branch_name_ar
                    }
                    onChange={(value) =>
                      update(
                        "branch_name_ar",
                        value,
                      )
                    }
                    dir="rtl"
                  />

                  <Field
                    label={t.branchNameEn}
                    value={
                      form.branch_name_en
                    }
                    onChange={(value) =>
                      update(
                        "branch_name_en",
                        value,
                      )
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.manager}
                    value={
                      form.branch_manager_name
                    }
                    onChange={(value) =>
                      update(
                        "branch_manager_name",
                        value,
                      )
                    }
                  />

                  <Field
                    label={t.email}
                    type="email"
                    value={form.branch_email}
                    onChange={(value) =>
                      update(
                        "branch_email",
                        value,
                      )
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.phone}
                    value={form.branch_phone}
                    onChange={(value) =>
                      update(
                        "branch_phone",
                        value,
                      )
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.mobile}
                    value={form.branch_mobile}
                    onChange={(value) =>
                      update(
                        "branch_mobile",
                        value,
                      )
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.whatsapp}
                    value={
                      form.branch_whatsapp_number
                    }
                    onChange={(value) =>
                      update(
                        "branch_whatsapp_number",
                        value,
                      )
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.country}
                    value={
                      form.branch_country
                    }
                    onChange={(value) =>
                      update(
                        "branch_country",
                        value,
                      )
                    }
                  />

                  <Field
                    label={t.city}
                    value={form.branch_city}
                    onChange={(value) =>
                      update(
                        "branch_city",
                        value,
                      )
                    }
                  />

                  <Field
                    label={t.region}
                    value={
                      form.branch_region
                    }
                    onChange={(value) =>
                      update(
                        "branch_region",
                        value,
                      )
                    }
                  />

                  <Field
                    label={t.district}
                    value={
                      form.branch_district
                    }
                    onChange={(value) =>
                      update(
                        "branch_district",
                        value,
                      )
                    }
                  />

                  <Field
                    label={t.street}
                    value={
                      form.branch_street_name
                    }
                    onChange={(value) =>
                      update(
                        "branch_street_name",
                        value,
                      )
                    }
                  />

                  <Field
                    label={t.building}
                    value={
                      form.branch_building_number
                    }
                    onChange={(value) =>
                      update(
                        "branch_building_number",
                        value,
                      )
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.postal}
                    value={
                      form.branch_postal_code
                    }
                    onChange={(value) =>
                      update(
                        "branch_postal_code",
                        value,
                      )
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.shortAddress}
                    value={
                      form.branch_short_address
                    }
                    onChange={(value) =>
                      update(
                        "branch_short_address",
                        value,
                      )
                    }
                  />

                  <Field
                    label={t.openingTime}
                    type="time"
                    value={
                      form.branch_opening_time
                    }
                    onChange={(value) =>
                      update(
                        "branch_opening_time",
                        value,
                      )
                    }
                    dir="ltr"
                  />

                  <Field
                    label={t.closingTime}
                    type="time"
                    value={
                      form.branch_closing_time
                    }
                    onChange={(value) =>
                      update(
                        "branch_closing_time",
                        value,
                      )
                    }
                    dir="ltr"
                  />
                </div>

                <Field
                  label={t.address}
                  value={form.branch_address}
                  onChange={(value) =>
                    update(
                      "branch_address",
                      value,
                    )
                  }
                />
              </CardContent>
            </Card>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="rounded-2xl shadow-none">
                <CardHeader>
                  <CardTitle>
                    {t.checklist}
                  </CardTitle>

                  <CardDescription>
                    {t.checklistDesc}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {(data?.checklist || []).map(
                    (item) => (
                      <div
                        key={item.code}
                        className="flex items-center gap-3 rounded-xl border bg-background p-3"
                      >
                        <span
                          className={[
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            item.is_complete
                              ? "bg-emerald-50 text-emerald-700"
                              : item.severity ===
                                  "required"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {item.is_complete ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <CircleAlert className="h-4 w-4" />
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {stringValue(
                              item.label,
                              item.code,
                            )}
                          </p>

                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.severity ===
                            "required"
                              ? t.required
                              : item.severity ===
                                  "recommended"
                                ? t.recommended
                                : item.severity}
                            {" · "}
                            {item.is_complete
                              ? t.completed
                              : t.missing}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card
                  className={[
                    "rounded-2xl shadow-none",
                    canComplete
                      ? "border-emerald-200"
                      : "border-amber-200",
                  ].join(" ")}
                >
                  <CardHeader>
                    <span
                      className={[
                        "mb-2 flex h-11 w-11 items-center justify-center rounded-xl",
                        canComplete
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700",
                      ].join(" ")}
                    >
                      {canComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <CircleAlert className="h-5 w-5" />
                      )}
                    </span>

                    <CardTitle className="text-base">
                      {canComplete
                        ? t.ready
                        : t.notReady}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="rounded-xl bg-muted/30 p-3">
                      <p className="text-xs font-semibold">
                        {t.requiredMissing}
                      </p>

                      {(data?.readiness
                        ?.missing_required
                        ?.length || 0) > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {data?.readiness?.missing_required?.map(
                            (code) => (
                              <span
                                key={code}
                                className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700"
                              >
                                {code}
                              </span>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-emerald-700">
                          {t.noMissingRequired}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl bg-muted/30 p-3">
                      <p className="text-xs font-semibold">
                        {t.recommendedMissing}
                      </p>

                      {(data?.readiness
                        ?.missing_recommended
                        ?.length || 0) > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {data?.readiness?.missing_recommended?.map(
                            (code) => (
                              <span
                                key={code}
                                className="rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground"
                              >
                                {code}
                              </span>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t.optionalLater}
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      className="h-11 w-full"
                      disabled={
                        completing ||
                        !canComplete
                      }
                      onClick={() =>
                        void completeSetup()
                      }
                    >
                      {completing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}

                      {completing
                        ? t.completing
                        : t.complete}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background p-3 shadow-sm">
            <Button
              type="button"
              variant="outline"
              disabled={
                step === 0 ||
                saving ||
                completing
              }
              onClick={() =>
                setStep((current) =>
                  Math.max(0, current - 1),
                )
              }
            >
              {isArabic ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
              {t.back}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={
                  saving || completing
                }
                onClick={() =>
                  void loadSetup(true)
                }
              >
                <RefreshCw className="h-4 w-4" />
                {t.retry}
              </Button>

              {step < 3 ? (
                <Button
                  type="button"
                  disabled={
                    saving || completing
                  }
                  onClick={() =>
                    void saveStep(step)
                  }
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {t.save}
                      {isArabic ? (
                        <ChevronLeft className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </div>

          {session.onboarding?.required ? (
            <p className="text-center text-xs text-muted-foreground">
              {t.serverAuthority}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
