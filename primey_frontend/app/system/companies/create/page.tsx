"use client";

/* ============================================================
   📂 primey_frontend/app/system/companies/create/page.tsx
   🏢 Mhamcloud — Create System Company
   ------------------------------------------------------------
   ✅ Approved Premium pattern
   ✅ Real API only: GET /api/system/companies/options/
   ✅ Real API only: POST /api/system/companies/create/
   ✅ Backend-generated company_code only
   ✅ ActivityProfile select from backend
   ✅ Legal / tax / Saudi National Address fields
   ✅ CSRF/session auth with credentials include
   ✅ Validation before submit
   ✅ Local draft save/restore
   ✅ Unsaved changes protection
   ✅ import { toast } from "sonner"
   ✅ Arabic/English via primey-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  Eraser,
  FileText,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type DraftKey = "Mhamcloud-system-company-create-draft";
type CompanyStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "CANCELLED";

type ActivityProfileOption = {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  name_en: string;
  display_name: string;
  description: string;
  is_system: boolean;
  is_active: boolean;
};

type StatusOption = {
  value: CompanyStatus;
  label: string;
};

type CompanyForm = {
  name: string;
  name_ar: string;
  name_en: string;
  activity_profile_id: string;
  commercial_registration: string;
  tax_number: string;
  email: string;
  phone: string;
  mobile: string;
  whatsapp_number: string;
  country: string;
  building_number: string;
  street_name: string;
  district: string;
  city: string;
  region: string;
  postal_code: string;
  short_address: string;
  address: string;
  status: CompanyStatus;
  notes: string;
};

const API_ENDPOINT = "/api/system/companies/create/";
const OPTIONS_ENDPOINT = "/api/system/companies/options/";
const CSRF_ENDPOINT = "/api/auth/csrf";
const DRAFT_KEY: DraftKey = "Mhamcloud-system-company-create-draft";

const defaultStatuses: StatusOption[] = [
  { value: "TRIAL", label: "Trial" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
];

const initialForm: CompanyForm = {
  name: "",
  name_ar: "",
  name_en: "",
  activity_profile_id: "",
  commercial_registration: "",
  tax_number: "",
  email: "",
  phone: "",
  mobile: "",
  whatsapp_number: "",
  country: "Saudi Arabia",
  building_number: "",
  street_name: "",
  district: "",
  city: "",
  region: "",
  postal_code: "",
  short_address: "",
  address: "",
  status: "TRIAL",
  notes: "",
};

const translations = {
  ar: {
    title: "إضافة شركة",
    subtitle:
      "إنشاء شركة جديدة ببيانات قانونية وعنوان وطني جاهزة للاشتراك والفوترة وإيصالات الدفع.",
    badge: "إدارة المنصة",
    backToCompanies: "العودة للشركات",
    companiesList: "قائمة الشركات",
    reportsTitle: "تقارير الشركات",
    systemDashboard: "لوحة النظام",
    saveDraft: "حفظ مسودة",
    submitCreate: "إنشاء الشركة",
    saving: "جاري الحفظ...",
    reset: "إعادة ضبط",
    clearDraft: "حذف المسودة",
    restoreDraft: "استعادة المسودة",
    draftSaved: "تم حفظ المسودة محليا.",
    draftRestored: "تم استعادة المسودة.",
    draftCleared: "تم حذف المسودة.",
    createSuccess: "تم إنشاء الشركة بنجاح.",
    createFailed: "تعذر إنشاء الشركة.",
    validationTitle: "راجع الحقول المطلوبة",
    optionsFailed: "تعذر جلب خيارات إنشاء الشركة.",
    unsavedWarning: "لديك تغييرات غير محفوظة.",

    basicInfo: "المعلومات الأساسية",
    basicInfoDesc: "اسم الشركة والنشاط والحالة. كود الشركة يولده النظام تلقائيا.",
    legalInfo: "البيانات القانونية والضريبية",
    legalInfoDesc: "هذه البيانات مطلوبة لإصدار الاشتراك والفاتورة وإيصال الدفع.",
    contactInfo: "بيانات التواصل",
    contactInfoDesc: "البريد وأرقام التواصل الخاصة بالشركة.",
    nationalAddress: "العنوان الوطني",
    nationalAddressDesc: "حقول العنوان الوطني السعودي المطلوبة للفوترة والمستندات.",
    notesInfo: "الملاحظات",
    notesInfoDesc: "ملاحظات إدارية داخلية اختيارية.",
    readiness: "جاهزية النموذج",
    readinessDesc: "متابعة اكتمال البيانات قبل الإرسال.",
    quickLinks: "روابط سريعة",
    quickLinksDesc: "تنقل سريع داخل وحدة الشركات.",

    name: "اسم الشركة",
    namePlaceholder: "مثال: شركة تجريبية",
    nameAr: "الاسم العربي",
    nameArPlaceholder: "مثال: شركة تجريبية للتجارة",
    nameEn: "الاسم الإنجليزي",
    nameEnPlaceholder: "Example: Demo Trading Company",
    autoCode: "كود الشركة",
    autoCodeValue: "سيتم توليده تلقائيا",
    autoCodeHint: "لا يتم إدخال كود الشركة يدويا. الباكند يولد الكود عند الإنشاء.",
    activity: "النشاط",
    activityPlaceholder: "اختر نشاط الشركة",
    status: "حالة الشركة",

    commercialRegistration: "السجل التجاري",
    commercialRegistrationPlaceholder: "مثال: 1010000000",
    taxNumber: "الرقم الضريبي",
    taxNumberPlaceholder: "مثال: 300000000000003",

    email: "البريد الإلكتروني",
    emailPlaceholder: "company@example.com",
    phone: "الهاتف",
    phonePlaceholder: "011xxxxxxx",
    mobile: "الجوال",
    mobilePlaceholder: "05xxxxxxxx",
    whatsapp: "رقم واتساب",
    whatsappPlaceholder: "05xxxxxxxx",

    country: "الدولة",
    countryPlaceholder: "Saudi Arabia",
    buildingNumber: "رقم المبنى",
    buildingNumberPlaceholder: "مثال: 1234",
    streetName: "اسم الشارع",
    streetNamePlaceholder: "مثال: طريق الملك فهد",
    district: "الحي",
    districtPlaceholder: "مثال: العليا",
    city: "المدينة",
    cityPlaceholder: "مثال: الرياض",
    region: "المنطقة",
    regionPlaceholder: "مثال: الرياض",
    postalCode: "الرمز البريدي",
    postalCodePlaceholder: "مثال: 12345",
    shortAddress: "العنوان المختصر",
    shortAddressPlaceholder: "مثال: RRRD1234",
    address: "عنوان إضافي",
    addressPlaceholder: "ملاحظات إضافية عن العنوان عند الحاجة...",

    notes: "ملاحظات",
    notesPlaceholder: "ملاحظات داخلية اختيارية عن الشركة...",

    statusLabels: {
      TRIAL: "تجريبي",
      ACTIVE: "نشط",
      SUSPENDED: "معلق",
      EXPIRED: "منتهي",
      CANCELLED: "ملغي",
    },

    required: "مطلوب",
    optional: "اختياري",
    completedFields: "الحقول المكتملة",
    requiredFields: "الحقول المطلوبة",
    readyToSubmit: "جاهز للإرسال",
    notReady: "غير مكتمل",
    apiHint:
      "سيتم استخدام Session + CSRF وإرسال الطلب إلى /api/system/companies/create/ بدون code أو company_code.",
    noFakeData: "لا توجد بيانات وهمية أو localhost hardcoding.",
    afterSaveHint:
      "بعد إنشاء الشركة ننتقل بعدها لخطوة إنشاء المستخدم ثم الاشتراك ثم الدفع.",

    nameRequired: "اسم الشركة مطلوب.",
    activityRequired: "اختيار النشاط مطلوب.",
    commercialRegistrationRequired: "السجل التجاري مطلوب.",
    taxNumberRequired: "الرقم الضريبي مطلوب.",
    buildingNumberRequired: "رقم المبنى مطلوب.",
    streetNameRequired: "اسم الشارع مطلوب.",
    districtRequired: "الحي مطلوب.",
    cityRequired: "المدينة مطلوبة.",
    regionRequired: "المنطقة مطلوبة.",
    postalCodeRequired: "الرمز البريدي مطلوب.",
    emailInvalid: "صيغة البريد الإلكتروني غير صحيحة.",
    phoneInvalid: "رقم التواصل قصير جدا.",
  },
  en: {
    title: "Add company",
    subtitle:
      "Create a new company with legal, tax, and national address data ready for subscriptions, invoices, and payment receipts.",
    badge: "Platform management",
    backToCompanies: "Back to companies",
    companiesList: "Companies list",
    reportsTitle: "Companies reports",
    systemDashboard: "System dashboard",
    saveDraft: "Save draft",
    submitCreate: "Create company",
    saving: "Saving...",
    reset: "Reset",
    clearDraft: "Clear draft",
    restoreDraft: "Restore draft",
    draftSaved: "Draft saved locally.",
    draftRestored: "Draft restored.",
    draftCleared: "Draft cleared.",
    createSuccess: "Company created successfully.",
    createFailed: "Could not create company.",
    validationTitle: "Review required fields",
    optionsFailed: "Could not load company creation options.",
    unsavedWarning: "You have unsaved changes.",

    basicInfo: "Basic information",
    basicInfoDesc: "Company name, activity, and status. The company code is generated automatically.",
    legalInfo: "Legal and tax information",
    legalInfoDesc: "Required for subscription billing, invoices, and payment receipts.",
    contactInfo: "Contact details",
    contactInfoDesc: "Company email and contact numbers.",
    nationalAddress: "National address",
    nationalAddressDesc: "Saudi national address fields required for billing and documents.",
    notesInfo: "Notes",
    notesInfoDesc: "Optional internal admin notes.",
    readiness: "Form readiness",
    readinessDesc: "Track data completion before submission.",
    quickLinks: "Quick links",
    quickLinksDesc: "Quick navigation inside the companies module.",

    name: "Company name",
    namePlaceholder: "Example: Demo Company",
    nameAr: "Arabic name",
    nameArPlaceholder: "Example: شركة تجريبية للتجارة",
    nameEn: "English name",
    nameEnPlaceholder: "Example: Demo Trading Company",
    autoCode: "Company code",
    autoCodeValue: "Generated automatically",
    autoCodeHint: "Do not type the company code manually. The backend generates it on create.",
    activity: "Activity",
    activityPlaceholder: "Select company activity",
    status: "Company status",

    commercialRegistration: "Commercial registration",
    commercialRegistrationPlaceholder: "Example: 1010000000",
    taxNumber: "Tax number",
    taxNumberPlaceholder: "Example: 300000000000003",

    email: "Email",
    emailPlaceholder: "company@example.com",
    phone: "Phone",
    phonePlaceholder: "011xxxxxxx",
    mobile: "Mobile",
    mobilePlaceholder: "05xxxxxxxx",
    whatsapp: "WhatsApp number",
    whatsappPlaceholder: "05xxxxxxxx",

    country: "Country",
    countryPlaceholder: "Saudi Arabia",
    buildingNumber: "Building number",
    buildingNumberPlaceholder: "Example: 1234",
    streetName: "Street name",
    streetNamePlaceholder: "Example: King Fahd Road",
    district: "District",
    districtPlaceholder: "Example: Al Olaya",
    city: "City",
    cityPlaceholder: "Example: Riyadh",
    region: "Region",
    regionPlaceholder: "Example: Riyadh",
    postalCode: "Postal code",
    postalCodePlaceholder: "Example: 12345",
    shortAddress: "Short address",
    shortAddressPlaceholder: "Example: RRRD1234",
    address: "Additional address",
    addressPlaceholder: "Optional additional address notes...",

    notes: "Notes",
    notesPlaceholder: "Optional internal notes about the company...",

    statusLabels: {
      TRIAL: "Trial",
      ACTIVE: "Active",
      SUSPENDED: "Suspended",
      EXPIRED: "Expired",
      CANCELLED: "Cancelled",
    },

    required: "Required",
    optional: "Optional",
    completedFields: "Completed fields",
    requiredFields: "Required fields",
    readyToSubmit: "Ready to submit",
    notReady: "Incomplete",
    apiHint:
      "Session + CSRF will be used and the request is sent to /api/system/companies/create/ without code or company_code.",
    noFakeData: "No fake data or localhost hardcoding.",
    afterSaveHint:
      "After creating the company, continue with user creation, subscription, then payment.",

    nameRequired: "Company name is required.",
    activityRequired: "Activity selection is required.",
    commercialRegistrationRequired: "Commercial registration is required.",
    taxNumberRequired: "Tax number is required.",
    buildingNumberRequired: "Building number is required.",
    streetNameRequired: "Street name is required.",
    districtRequired: "District is required.",
    cityRequired: "City is required.",
    regionRequired: "Region is required.",
    postalCodeRequired: "Postal code is required.",
    emailInvalid: "Email format is invalid.",
    phoneInvalid: "Contact number is too short.",
  },
} as const;

class RequestError extends Error {
  errors: ApiRecord;

  constructor(message: string, errors: ApiRecord = {}) {
    super(message);
    this.name = "RequestError";
    this.errors = errors;
  }
}

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
  return String(value).trim() || fallback;
}

function normalizeStatus(value: unknown): CompanyStatus {
  const status = normalizeText(value).toUpperCase();
  return ["TRIAL", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"].includes(status)
    ? (status as CompanyStatus)
    : "TRIAL";
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/+$/,
          "",
        )
      : "";

  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}

function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) return "";
  return decodeURIComponent(parts.pop()?.split(";").shift() || "");
}

async function ensureCsrfToken() {
  let token = getCookie("csrftoken");

  if (token) return token;

  const response = await fetch(makeApiUrl(CSRF_ENDPOINT), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok) return "";

  token = getCookie("csrftoken");
  return token;
}

function errorDetailsFromPayload(payload: unknown) {
  const record = asRecord(payload);
  const errors = asRecord(record.errors);

  const details = Object.values(errors)
    .map((value) => {
      if (Array.isArray(value)) return value.map((item) => normalizeText(item)).join(" ");
      return normalizeText(value);
    })
    .filter(Boolean)
    .join(" ");

  return {
    message:
      normalizeText(record.message) ||
      normalizeText(record.detail) ||
      normalizeText(record.error) ||
      details,
    errors,
    details,
  };
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(makeApiUrl(path), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let payload: unknown = null;
  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const details = errorDetailsFromPayload(payload);
    throw new RequestError(details.message || `Request failed with status ${response.status}`, details.errors);
  }

  return (payload || {}) as T;
}

async function postJson<T>(path: string, body: ApiRecord): Promise<T> {
  const csrfToken = await ensureCsrfToken();

  const response = await fetch(makeApiUrl(path), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let payload: unknown = null;
  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const details = errorDetailsFromPayload(payload);
    throw new RequestError(details.message || `Request failed with status ${response.status}`, details.errors);
  }

  return (payload || {}) as T;
}

function extractCreatedId(payload: unknown) {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const companyRecord = asRecord(dataRecord.company);
  const resultRecord = asRecord(record.result);

  return normalizeText(
    record.id ||
      record.uuid ||
      record.pk ||
      dataRecord.id ||
      dataRecord.uuid ||
      dataRecord.pk ||
      companyRecord.id ||
      companyRecord.uuid ||
      companyRecord.pk ||
      resultRecord.id ||
      resultRecord.uuid ||
      resultRecord.pk,
  );
}

function buildPayload(form: CompanyForm): ApiRecord {
  const payload: ApiRecord = {
    name: form.name.trim(),
    activity_profile_id: Number(form.activity_profile_id),
    status: form.status,
    is_active: !["SUSPENDED", "EXPIRED", "CANCELLED"].includes(form.status),
    commercial_registration: form.commercial_registration.trim(),
    tax_number: form.tax_number.trim(),
    country: form.country.trim() || "Saudi Arabia",
    building_number: form.building_number.trim(),
    street_name: form.street_name.trim(),
    district: form.district.trim(),
    city: form.city.trim(),
    region: form.region.trim(),
    postal_code: form.postal_code.trim(),
    currency_code: "SAR",
    vat_percentage: "15.00",
  };

  if (form.name_ar.trim()) payload.name_ar = form.name_ar.trim();
  if (form.name_en.trim()) payload.name_en = form.name_en.trim();
  if (form.email.trim()) payload.email = form.email.trim();
  if (form.phone.trim()) payload.phone = form.phone.trim();
  if (form.mobile.trim()) payload.mobile = form.mobile.trim();
  if (form.whatsapp_number.trim()) payload.whatsapp_number = form.whatsapp_number.trim();
  if (form.short_address.trim()) payload.short_address = form.short_address.trim();
  if (form.address.trim()) payload.address = form.address.trim();
  if (form.notes.trim()) payload.notes = form.notes.trim();

  return payload;
}

function activityProfileName(profile: ActivityProfileOption, locale: Locale) {
  return (
    normalizeText(profile.display_name) ||
    (locale === "ar" ? normalizeText(profile.name_ar) : normalizeText(profile.name_en)) ||
    normalizeText(profile.name) ||
    normalizeText(profile.code)
  );
}

function normalizeDraft(value: unknown): CompanyForm {
  const record = asRecord(value);

  return {
    ...initialForm,
    name: normalizeText(record.name),
    name_ar: normalizeText(record.name_ar),
    name_en: normalizeText(record.name_en),
    activity_profile_id:
      normalizeText(record.activity_profile_id) || normalizeText(record.activity_profile_ref_id),
    commercial_registration: normalizeText(record.commercial_registration),
    tax_number: normalizeText(record.tax_number),
    email: normalizeText(record.email),
    phone: normalizeText(record.phone),
    mobile: normalizeText(record.mobile),
    whatsapp_number: normalizeText(record.whatsapp_number),
    country: normalizeText(record.country, "Saudi Arabia"),
    building_number: normalizeText(record.building_number),
    street_name: normalizeText(record.street_name),
    district: normalizeText(record.district),
    city: normalizeText(record.city),
    region: normalizeText(record.region),
    postal_code: normalizeText(record.postal_code),
    short_address: normalizeText(record.short_address),
    address: normalizeText(record.address),
    status: normalizeStatus(record.status),
    notes: normalizeText(record.notes),
  };
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <label className="text-sm font-medium text-foreground">{children}</label>
      {required ? (
        <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
          *
        </Badge>
      ) : null}
    </div>
  );
}

function TextAreaField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-28 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

export default function SystemCompaniesCreatePage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<CompanyForm>(initialForm);
  const [activityProfiles, setActivityProfiles] = React.useState<ActivityProfileOption[]>([]);
  const [statusOptions, setStatusOptions] = React.useState<StatusOption[]>(defaultStatuses);
  const [optionsLoading, setOptionsLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [draftAvailable, setDraftAvailable] = React.useState(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const backIcon = locale === "ar" ? ChevronLeft : ArrowRight;

  const loadOptions = React.useCallback(async () => {
    try {
      setOptionsLoading(true);

      const payload = await getJson<unknown>(OPTIONS_ENDPOINT);
      const data = asRecord(asRecord(payload).data);

      const profiles = Array.isArray(data.activity_profiles)
        ? data.activity_profiles
            .map((item) => asRecord(item))
            .map((item) => ({
              id: Number(item.id),
              code: normalizeText(item.code),
              name: normalizeText(item.name),
              name_ar: normalizeText(item.name_ar),
              name_en: normalizeText(item.name_en),
              display_name: normalizeText(item.display_name),
              description: normalizeText(item.description),
              is_system: Boolean(item.is_system),
              is_active: Boolean(item.is_active),
            }))
            .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.is_active)
        : [];

      const statuses = Array.isArray(data.statuses)
        ? data.statuses
            .map((item) => asRecord(item))
            .map((item) => ({
              value: normalizeStatus(item.value),
              label: normalizeText(item.label),
            }))
        : defaultStatuses;

      setActivityProfiles(profiles);
      setStatusOptions(statuses.length ? statuses : defaultStatuses);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.optionsFailed;
      toast.error(t.optionsFailed, {
        description: message,
      });
    } finally {
      setOptionsLoading(false);
    }
  }, [t.optionsFailed]);

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
    void loadOptions();
  }, [loadOptions]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setDraftAvailable(Boolean(window.localStorage.getItem(DRAFT_KEY)));
  }, []);

  React.useEffect(() => {
    if (!dirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t.unsavedWarning;
      return t.unsavedWarning;
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, t.unsavedWarning]);

  function updateField<Key extends keyof CompanyForm>(key: Key, value: CompanyForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  const validationErrors = React.useMemo(() => {
    const errors: string[] = [];

    if (!form.name.trim()) errors.push(t.nameRequired);
    if (!form.activity_profile_id.trim()) errors.push(t.activityRequired);
    if (!form.commercial_registration.trim()) errors.push(t.commercialRegistrationRequired);
    if (!form.tax_number.trim()) errors.push(t.taxNumberRequired);
    if (!form.building_number.trim()) errors.push(t.buildingNumberRequired);
    if (!form.street_name.trim()) errors.push(t.streetNameRequired);
    if (!form.district.trim()) errors.push(t.districtRequired);
    if (!form.city.trim()) errors.push(t.cityRequired);
    if (!form.region.trim()) errors.push(t.regionRequired);
    if (!form.postal_code.trim()) errors.push(t.postalCodeRequired);

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.push(t.emailInvalid);
    }

    const contactValues = [form.phone, form.mobile, form.whatsapp_number].filter((value) =>
      value.trim(),
    );

    if (contactValues.some((value) => value.trim().replace(/\D/g, "").length < 8)) {
      errors.push(t.phoneInvalid);
    }

    return errors;
  }, [
    form.activity_profile_id,
    form.building_number,
    form.city,
    form.commercial_registration,
    form.district,
    form.email,
    form.mobile,
    form.name,
    form.phone,
    form.postal_code,
    form.region,
    form.street_name,
    form.tax_number,
    form.whatsapp_number,
    t.activityRequired,
    t.buildingNumberRequired,
    t.cityRequired,
    t.commercialRegistrationRequired,
    t.districtRequired,
    t.emailInvalid,
    t.nameRequired,
    t.phoneInvalid,
    t.postalCodeRequired,
    t.regionRequired,
    t.streetNameRequired,
    t.taxNumberRequired,
  ]);

  const requiredChecks = React.useMemo(
    () => [
      { label: t.name, done: Boolean(form.name.trim()) },
      { label: t.activity, done: Boolean(form.activity_profile_id.trim()) },
      { label: t.commercialRegistration, done: Boolean(form.commercial_registration.trim()) },
      { label: t.taxNumber, done: Boolean(form.tax_number.trim()) },
      { label: t.buildingNumber, done: Boolean(form.building_number.trim()) },
      { label: t.streetName, done: Boolean(form.street_name.trim()) },
      { label: t.district, done: Boolean(form.district.trim()) },
      { label: t.city, done: Boolean(form.city.trim()) },
      { label: t.region, done: Boolean(form.region.trim()) },
      { label: t.postalCode, done: Boolean(form.postal_code.trim()) },
    ],
    [
      form.activity_profile_id,
      form.building_number,
      form.city,
      form.commercial_registration,
      form.district,
      form.name,
      form.postal_code,
      form.region,
      form.street_name,
      form.tax_number,
      t.activity,
      t.buildingNumber,
      t.city,
      t.commercialRegistration,
      t.district,
      t.name,
      t.postalCode,
      t.region,
      t.streetName,
      t.taxNumber,
    ],
  );

  const completedFields = React.useMemo(() => {
    return Object.values(form).filter((value) => String(value).trim()).length;
  }, [form]);

  const requiredCompleted = requiredChecks.filter((item) => item.done).length;
  const isReady = validationErrors.length === 0 && !optionsLoading;

  function saveDraft() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    setDraftAvailable(true);
    toast.success(t.draftSaved);
  }

  function restoreDraft() {
    const rawDraft = window.localStorage.getItem(DRAFT_KEY);

    if (!rawDraft) {
      toast.error(t.noFakeData);
      return;
    }

    try {
      const parsed = JSON.parse(rawDraft) as unknown;
      setForm(normalizeDraft(parsed));
      setDirty(true);
      toast.success(t.draftRestored);
    } catch {
      toast.error(t.createFailed);
    }
  }

  function clearDraft() {
    window.localStorage.removeItem(DRAFT_KEY);
    setDraftAvailable(false);
    toast.success(t.draftCleared);
  }

  function resetForm() {
    setForm(initialForm);
    setDirty(false);
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isReady) {
      toast.error(t.validationTitle, {
        description: validationErrors.join(" "),
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = buildPayload(form);
      const responsePayload = await postJson<unknown>(API_ENDPOINT, payload);
      const createdId = extractCreatedId(responsePayload);

      window.localStorage.removeItem(DRAFT_KEY);
      setDraftAvailable(false);
      setDirty(false);

      toast.success(t.createSuccess);

      if (createdId) {
        router.push(`/system/companies/${createdId}`);
      } else {
        router.push("/system/companies/list");
      }

      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.createFailed;
      toast.error(t.createFailed, {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const BackIcon = backIcon;

  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-4xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.badge}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system/companies">
                    <BackIcon className="h-4 w-4" />
                    {t.backToCompanies}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system/companies/list">
                    <ListChecks className="h-4 w-4" />
                    {t.companiesList}
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={saveDraft}
                  disabled={submitting}
                >
                  <Save className="h-4 w-4" />
                  {t.saveDraft}
                </Button>
                <Button
                  type="submit"
                  form="company-create-form"
                  className="rounded-xl"
                  disabled={submitting || !isReady}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {submitting ? t.saving : t.submitCreate}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <form id="company-create-form" onSubmit={submitForm} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.basicInfo}</CardTitle>
                <CardDescription>{t.basicInfoDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div>
                  <FieldLabel required>{t.name}</FieldLabel>
                  <Input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder={t.namePlaceholder}
                    className="h-11 rounded-xl"
                    autoComplete="organization"
                  />
                </div>

                <div>
                  <FieldLabel>{t.autoCode}</FieldLabel>
                  <div className="flex h-11 items-center gap-2 rounded-xl border bg-muted/40 px-3 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>{t.autoCodeValue}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{t.autoCodeHint}</p>
                </div>

                <div>
                  <FieldLabel>{t.nameAr}</FieldLabel>
                  <Input
                    value={form.name_ar}
                    onChange={(event) => updateField("name_ar", event.target.value)}
                    placeholder={t.nameArPlaceholder}
                    className="h-11 rounded-xl"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <FieldLabel>{t.nameEn}</FieldLabel>
                  <Input
                    value={form.name_en}
                    onChange={(event) => updateField("name_en", event.target.value)}
                    placeholder={t.nameEnPlaceholder}
                    className="h-11 rounded-xl"
                    dir="ltr"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <FieldLabel required>{t.activity}</FieldLabel>
                  <Select
                    value={form.activity_profile_id}
                    onValueChange={(value) => updateField("activity_profile_id", value)}
                    disabled={optionsLoading}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-background">
                      <SelectValue placeholder={optionsLoading ? t.saving : t.activityPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {activityProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={String(profile.id)}>
                          {activityProfileName(profile, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <FieldLabel>{t.status}</FieldLabel>
                  <Select value={form.status} onValueChange={(value) => updateField("status", normalizeStatus(value))}>
                    <SelectTrigger className="h-11 rounded-xl bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {t.statusLabels[option.value] || option.label || option.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.legalInfo}</CardTitle>
                <CardDescription>{t.legalInfoDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div>
                  <FieldLabel required>{t.commercialRegistration}</FieldLabel>
                  <Input
                    value={form.commercial_registration}
                    onChange={(event) => updateField("commercial_registration", event.target.value)}
                    placeholder={t.commercialRegistrationPlaceholder}
                    className="h-11 rounded-xl"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <FieldLabel required>{t.taxNumber}</FieldLabel>
                  <Input
                    value={form.tax_number}
                    onChange={(event) => updateField("tax_number", event.target.value)}
                    placeholder={t.taxNumberPlaceholder}
                    className="h-11 rounded-xl"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.contactInfo}</CardTitle>
                <CardDescription>{t.contactInfoDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div>
                  <FieldLabel>{t.email}</FieldLabel>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder={t.emailPlaceholder}
                      className="h-11 rounded-xl ps-9"
                      dir="ltr"
                      inputMode="email"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>{t.phone}</FieldLabel>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={form.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      placeholder={t.phonePlaceholder}
                      className="h-11 rounded-xl ps-9"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>{t.mobile}</FieldLabel>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={form.mobile}
                      onChange={(event) => updateField("mobile", event.target.value)}
                      placeholder={t.mobilePlaceholder}
                      className="h-11 rounded-xl ps-9"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>{t.whatsapp}</FieldLabel>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={form.whatsapp_number}
                      onChange={(event) => updateField("whatsapp_number", event.target.value)}
                      placeholder={t.whatsappPlaceholder}
                      className="h-11 rounded-xl ps-9"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.nationalAddress}</CardTitle>
                <CardDescription>{t.nationalAddressDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div>
                  <FieldLabel>{t.country}</FieldLabel>
                  <Input
                    value={form.country}
                    onChange={(event) => updateField("country", event.target.value)}
                    placeholder={t.countryPlaceholder}
                    className="h-11 rounded-xl"
                    autoComplete="country-name"
                  />
                </div>

                <div>
                  <FieldLabel required>{t.buildingNumber}</FieldLabel>
                  <Input
                    value={form.building_number}
                    onChange={(event) => updateField("building_number", event.target.value)}
                    placeholder={t.buildingNumberPlaceholder}
                    className="h-11 rounded-xl"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <FieldLabel required>{t.streetName}</FieldLabel>
                  <Input
                    value={form.street_name}
                    onChange={(event) => updateField("street_name", event.target.value)}
                    placeholder={t.streetNamePlaceholder}
                    className="h-11 rounded-xl"
                    autoComplete="address-line1"
                  />
                </div>

                <div>
                  <FieldLabel required>{t.district}</FieldLabel>
                  <Input
                    value={form.district}
                    onChange={(event) => updateField("district", event.target.value)}
                    placeholder={t.districtPlaceholder}
                    className="h-11 rounded-xl"
                    autoComplete="address-line2"
                  />
                </div>

                <div>
                  <FieldLabel required>{t.city}</FieldLabel>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={form.city}
                      onChange={(event) => updateField("city", event.target.value)}
                      placeholder={t.cityPlaceholder}
                      className="h-11 rounded-xl ps-9"
                      autoComplete="address-level2"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel required>{t.region}</FieldLabel>
                  <Input
                    value={form.region}
                    onChange={(event) => updateField("region", event.target.value)}
                    placeholder={t.regionPlaceholder}
                    className="h-11 rounded-xl"
                    autoComplete="address-level1"
                  />
                </div>

                <div>
                  <FieldLabel required>{t.postalCode}</FieldLabel>
                  <Input
                    value={form.postal_code}
                    onChange={(event) => updateField("postal_code", event.target.value)}
                    placeholder={t.postalCodePlaceholder}
                    className="h-11 rounded-xl"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                </div>

                <div>
                  <FieldLabel>{t.shortAddress}</FieldLabel>
                  <Input
                    value={form.short_address}
                    onChange={(event) => updateField("short_address", event.target.value.toUpperCase())}
                    placeholder={t.shortAddressPlaceholder}
                    className="h-11 rounded-xl"
                    dir="ltr"
                    autoComplete="off"
                  />
                </div>

                <div className="md:col-span-2">
                  <FieldLabel>{t.address}</FieldLabel>
                  <TextAreaField
                    value={form.address}
                    onChange={(value) => updateField("address", value)}
                    placeholder={t.addressPlaceholder}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.notesInfo}</CardTitle>
                <CardDescription>{t.notesInfoDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldLabel>{t.notes}</FieldLabel>
                <TextAreaField
                  value={form.notes}
                  onChange={(value) => updateField("notes", value)}
                  placeholder={t.notesPlaceholder}
                />
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="rounded-2xl shadow-sm xl:sticky xl:top-6">
              <CardHeader>
                <CardTitle>{t.readiness}</CardTitle>
                <CardDescription>{t.readinessDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">{t.completedFields}</span>
                    <span className="text-2xl font-bold tabular-nums">{completedFields}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((requiredCompleted / requiredChecks.length) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {requiredCompleted}/{requiredChecks.length} {t.requiredFields}
                  </p>
                </div>

                <div className="space-y-2">
                  {requiredChecks.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <CircleAlert className="h-4 w-4 text-amber-600" />
                      )}
                      <span>{item.label}</span>
                      <Badge variant="outline" className="ms-auto rounded-full">
                        {t.required}
                      </Badge>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-2 text-sm">
                    {isReady ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <CircleAlert className="h-4 w-4 text-amber-600" />
                    )}
                    <span>{isReady ? t.readyToSubmit : t.notReady}</span>
                  </div>
                </div>

                {validationErrors.length ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                    <p className="text-sm font-semibold">{t.validationTitle}</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                      {validationErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="space-y-2 rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <p>{t.apiHint}</p>
                  <p>{t.noFakeData}</p>
                  <p>{t.afterSaveHint}</p>
                </div>

                <div className="grid gap-2">
                  <Button type="submit" form="company-create-form" disabled={submitting || !isReady} className="rounded-xl">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {submitting ? t.saving : t.submitCreate}
                  </Button>

                  <Button type="button" variant="outline" className="rounded-xl bg-background" onClick={saveDraft}>
                    <Save className="h-4 w-4" />
                    {t.saveDraft}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl bg-background"
                    onClick={restoreDraft}
                    disabled={!draftAvailable}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t.restoreDraft}
                  </Button>

                  <Button type="button" variant="outline" className="rounded-xl bg-background" onClick={clearDraft} disabled={!draftAvailable}>
                    <Eraser className="h-4 w-4" />
                    {t.clearDraft}
                  </Button>

                  <Button type="button" variant="ghost" className="rounded-xl" onClick={resetForm}>
                    <Eraser className="h-4 w-4" />
                    {t.reset}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.quickLinks}</CardTitle>
                <CardDescription>{t.quickLinksDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system/companies/list">
                    <ListChecks className="h-4 w-4" />
                    {t.companiesList}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system/companies">
                    <Building2 className="h-4 w-4" />
                    {t.backToCompanies}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system">
                    <LayoutDashboard className="h-4 w-4" />
                    {t.systemDashboard}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system/companies/reports">
                    <FileText className="h-4 w-4" />
                    {t.reportsTitle}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </form>
      </div>
    </main>
  );
}