"use client";

/* ============================================================
   📂 app/customer/profile/page.tsx
   🧭 Primey Care | Customer Profile Page
   ------------------------------------------------------------
   ✅ صفحة محتوى فقط داخل الشِل الموحد
   ✅ لا تنشئ سايدر أو هيدر مستقل
   ✅ تعتمد على /api/customers/me/
   ✅ تعديل بيانات العميل الأساسية
   ✅ PATCH /api/customers/me/
   ✅ CSRF آمن للحفظ
   ✅ تنبيه إعادة تحقق الجوال عند تغيير الرقم
   ✅ نفس النمط المعتمد للنظام
   ✅ w-full space-y-4
   ✅ عربي/إنجليزي عبر primey-locale
   ✅ أرقام إنجليزية دائمًا
   ✅ Skeleton Loading
   ✅ Error State مستقل
   ✅ Unsaved changes protection
   ✅ sonner
   ✅ بدون localhost
============================================================ */

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  RotateCcw,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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

type AppLocale = "ar" | "en";
type Dict = Record<string, unknown>;

type CustomerProfile = {
  id: string;
  customerCode: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  whatsappNumber: string;
  alternativePhoneNumber: string;
  gender: string;
  dateOfBirth: string;
  nationalId: string;
  nationality: string;
  country: string;
  city: string;
  district: string;
  streetAddress: string;
  postalCode: string;
  nationalAddressText: string;
  status: string;
  customerType: string;
  source: string;
  isPhoneVerified: boolean;
  isWhatsappVerified: boolean;
  hasCustomerAccount: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
};

type CustomerForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  whatsapp_number: string;
  alternative_phone_number: string;
  gender: string;
  date_of_birth: string;
  national_id: string;
  nationality: string;
  city: string;
  district: string;
  street_address: string;
  postal_code: string;
  national_address_text: string;
};

type ApiEnvelope = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  errors?: unknown;
  data?: unknown;
  customer?: unknown;
  profile?: unknown;
  user?: unknown;
  requires_phone_verification?: boolean;
};

const DEFAULT_PROFILE: CustomerProfile = {
  id: "",
  customerCode: "",
  displayName: "",
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  whatsappNumber: "",
  alternativePhoneNumber: "",
  gender: "",
  dateOfBirth: "",
  nationalId: "",
  nationality: "",
  country: "",
  city: "",
  district: "",
  streetAddress: "",
  postalCode: "",
  nationalAddressText: "",
  status: "",
  customerType: "",
  source: "",
  isPhoneVerified: false,
  isWhatsappVerified: false,
  hasCustomerAccount: false,
  lastLoginAt: "",
  createdAt: "",
  updatedAt: "",
};

const DEFAULT_FORM: CustomerForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  whatsapp_number: "",
  alternative_phone_number: "",
  gender: "",
  date_of_birth: "",
  national_id: "",
  nationality: "",
  city: "",
  district: "",
  street_address: "",
  postal_code: "",
  national_address_text: "",
};

function readLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const savedLocale = window.localStorage.getItem("primey-locale");

    if (savedLocale === "en") return "en";
    if (savedLocale === "ar") return "ar";

    return document.documentElement.lang === "en" ? "en" : "ar";
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

async function readJson(response: Response): Promise<ApiEnvelope | null> {
  return (await response.json().catch(() => null)) as ApiEnvelope | null;
}

function asDict(value: unknown): Dict {
  return value && typeof value === "object" ? (value as Dict) : {};
}

function getValue(obj: Dict, key: string): unknown {
  const direct = obj[key];

  if (direct !== undefined && direct !== null && direct !== "") return direct;

  for (const container of ["customer", "profile", "user", "data"]) {
    const nested = obj[container];

    if (nested && typeof nested === "object") {
      const value = (nested as Dict)[key];

      if (value !== undefined && value !== null && value !== "") return value;
    }
  }

  return undefined;
}

function toBool(value: unknown) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase());
  }

  return Boolean(value);
}

function normalizeText(value: unknown) {
  return String(value || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
}

function normalizeStatus(value: unknown) {
  const cleaned = normalizeText(value);

  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatDate(value: unknown) {
  const raw = String(value || "").trim();

  if (!raw) return "-";

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function toDateInputValue(value: unknown) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function getCookie(name: string) {
  try {
    if (typeof document === "undefined") return "";

    const cookies = document.cookie ? document.cookie.split("; ") : [];

    for (const cookie of cookies) {
      const [key, ...rest] = cookie.split("=");

      if (decodeURIComponent(key) === name) {
        return decodeURIComponent(rest.join("="));
      }
    }

    return "";
  } catch {
    return "";
  }
}

async function getCsrfToken() {
  const fromCookie = getCookie("csrftoken");
  if (fromCookie) return fromCookie;

  const response = await fetch(apiUrl("/api/auth/csrf/"), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await readJson(response);

  return String(
    getValue(asDict(payload || {}), "csrfToken") ||
      getValue(asDict(payload || {}), "csrf_token") ||
      getValue(asDict(payload || {}), "token") ||
      getCookie("csrftoken") ||
      "",
  );
}

function dictionary(locale: AppLocale) {
  const isArabic = locale === "ar";

  return {
    pageTitle: isArabic ? "حسابي" : "My Account",
    pageSubtitle: isArabic
      ? "راجع بياناتك وعدّل معلومات التواصل الخاصة بك."
      : "Review your information and update your contact details.",
    profileBadge: isArabic ? "ملف العميل" : "Customer Profile",

    refresh: isArabic ? "تحديث" : "Refresh",
    save: isArabic ? "حفظ التعديلات" : "Save Changes",
    saving: isArabic ? "جاري الحفظ" : "Saving",
    reset: isArabic ? "إلغاء التغييرات" : "Reset Changes",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    backToDashboard: isArabic ? "لوحة العميل" : "Customer Dashboard",

    overviewTitle: isArabic ? "نظرة عامة" : "Overview",
    overviewDesc: isArabic
      ? "بيانات الحساب وحالة التوثيق."
      : "Account details and verification status.",
    editTitle: isArabic ? "تعديل البيانات" : "Edit Information",
    editDesc: isArabic
      ? "حدّث بياناتك الأساسية ومعلومات التواصل."
      : "Update your basic and contact information.",
    contactTitle: isArabic ? "معلومات التواصل" : "Contact Information",
    addressTitle: isArabic ? "العنوان" : "Address",
    identityTitle: isArabic ? "الهوية والمعلومات الشخصية" : "Identity & Personal",

    customerCode: isArabic ? "رقم العميل" : "Customer Code",
    displayName: isArabic ? "اسم العميل" : "Customer Name",
    accountStatus: isArabic ? "حالة الحساب" : "Account Status",
    accountType: isArabic ? "نوع الحساب" : "Account Type",
    source: isArabic ? "المصدر" : "Source",
    phoneVerified: isArabic ? "توثيق الجوال" : "Phone Verification",
    whatsappVerified: isArabic ? "توثيق واتساب" : "WhatsApp Verification",
    verified: isArabic ? "موثق" : "Verified",
    notVerified: isArabic ? "غير موثق" : "Not Verified",
    lastLogin: isArabic ? "آخر دخول" : "Last Login",
    createdAt: isArabic ? "تاريخ الإنشاء" : "Created At",

    firstName: isArabic ? "الاسم الأول" : "First Name",
    lastName: isArabic ? "اسم العائلة" : "Last Name",
    email: isArabic ? "البريد الإلكتروني" : "Email",
    phoneNumber: isArabic ? "رقم الجوال" : "Phone Number",
    whatsappNumber: isArabic ? "رقم واتساب" : "WhatsApp Number",
    alternativePhone: isArabic ? "رقم بديل" : "Alternative Phone",
    gender: isArabic ? "الجنس" : "Gender",
    dateOfBirth: isArabic ? "تاريخ الميلاد" : "Date of Birth",
    nationalId: isArabic ? "رقم الهوية" : "National ID",
    nationality: isArabic ? "الجنسية" : "Nationality",
    city: isArabic ? "المدينة" : "City",
    district: isArabic ? "الحي" : "District",
    streetAddress: isArabic ? "العنوان" : "Street Address",
    postalCode: isArabic ? "الرمز البريدي" : "Postal Code",
    nationalAddress: isArabic ? "العنوان الوطني" : "National Address",

    selectGender: isArabic ? "اختر الجنس" : "Select Gender",
    male: isArabic ? "ذكر" : "Male",
    female: isArabic ? "أنثى" : "Female",
    notSpecified: isArabic ? "غير محدد" : "Not Specified",

    noData: isArabic ? "غير متوفر" : "Not available",
    loading: isArabic ? "جاري تحميل بيانات الحساب" : "Loading account data",
    loadError: isArabic
      ? "تعذر تحميل بيانات الحساب."
      : "Unable to load account data.",
    saveSuccess: isArabic
      ? "تم تحديث بيانات الحساب بنجاح."
      : "Account information updated successfully.",
    saveError: isArabic
      ? "تعذر حفظ بيانات الحساب."
      : "Unable to save account information.",
    phoneChanged: isArabic
      ? "تم حفظ البيانات. يلزم إعادة تحقق رقم الجوال."
      : "Saved. Phone verification is required again.",
    validationError: isArabic
      ? "يرجى إدخال الاسم الأول أو اسم العائلة على الأقل."
      : "Please enter at least first name or last name.",
    unsavedChanges: isArabic
      ? "لديك تغييرات غير محفوظة."
      : "You have unsaved changes.",
    missingProfile: isArabic
      ? "لا يوجد ملف عميل مرتبط بهذا الحساب."
      : "No customer profile is linked to this account.",
  };
}

function unwrapCustomer(payload: ApiEnvelope | null): CustomerProfile {
  const data = asDict(payload?.data);
  const customer = asDict(data.customer || payload?.customer || payload?.data || {});

  const firstName = String(getValue(customer, "first_name") || "");
  const lastName = String(getValue(customer, "last_name") || "");
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    id: String(getValue(customer, "id") || ""),
    customerCode: String(getValue(customer, "customer_code") || ""),
    displayName: String(
      getValue(customer, "display_name") ||
        getValue(customer, "full_name") ||
        fullName ||
        getValue(customer, "name") ||
        "",
    ),
    firstName,
    lastName,
    email: String(getValue(customer, "email") || ""),
    phoneNumber: String(
      getValue(customer, "phone_number") ||
        getValue(customer, "normalized_phone") ||
        getValue(customer, "primary_contact_number") ||
        "",
    ),
    whatsappNumber: String(
      getValue(customer, "whatsapp_number") ||
        getValue(customer, "phone_number") ||
        "",
    ),
    alternativePhoneNumber: String(
      getValue(customer, "alternative_phone_number") || "",
    ),
    gender: String(getValue(customer, "gender") || ""),
    dateOfBirth: toDateInputValue(getValue(customer, "date_of_birth")),
    nationalId: String(getValue(customer, "national_id") || ""),
    nationality: String(getValue(customer, "nationality") || ""),
    country: String(getValue(customer, "country") || ""),
    city: String(getValue(customer, "city") || ""),
    district: String(getValue(customer, "district") || ""),
    streetAddress: String(getValue(customer, "street_address") || ""),
    postalCode: String(getValue(customer, "postal_code") || ""),
    nationalAddressText: String(getValue(customer, "national_address_text") || ""),
    status: String(getValue(customer, "status") || ""),
    customerType: String(getValue(customer, "customer_type") || ""),
    source: String(getValue(customer, "source") || ""),
    isPhoneVerified: toBool(getValue(customer, "is_phone_verified")),
    isWhatsappVerified: toBool(getValue(customer, "is_whatsapp_verified")),
    hasCustomerAccount: toBool(getValue(customer, "has_customer_account")),
    lastLoginAt: String(getValue(customer, "last_login_at") || ""),
    createdAt: String(getValue(customer, "created_at") || ""),
    updatedAt: String(getValue(customer, "updated_at") || ""),
  };
}

function profileToForm(profile: CustomerProfile): CustomerForm {
  return {
    first_name: profile.firstName,
    last_name: profile.lastName,
    email: profile.email,
    phone_number: profile.phoneNumber,
    whatsapp_number: profile.whatsappNumber,
    alternative_phone_number: profile.alternativePhoneNumber,
    gender: profile.gender,
    date_of_birth: profile.dateOfBirth,
    national_id: profile.nationalId,
    nationality: profile.nationality,
    city: profile.city,
    district: profile.district,
    street_address: profile.streetAddress,
    postal_code: profile.postalCode,
    national_address_text: profile.nationalAddressText,
  };
}

function formToPayload(form: CustomerForm) {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone_number: form.phone_number.trim(),
    whatsapp_number: form.whatsapp_number.trim(),
    alternative_phone_number: form.alternative_phone_number.trim(),
    gender: form.gender.trim(),
    date_of_birth: form.date_of_birth || null,
    national_id: form.national_id.trim(),
    nationality: form.nationality.trim(),
    city: form.city.trim(),
    district: form.district.trim(),
    street_address: form.street_address.trim(),
    postal_code: form.postal_code.trim(),
    national_address_text: form.national_address_text.trim(),
  };
}

function isSameForm(a: CustomerForm, b: CustomerForm) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function errorText(payload: ApiEnvelope | null, fallback: string) {
  if (!payload) return fallback;

  const errors = payload.errors;

  if (errors && typeof errors === "object") {
    const firstValue = Object.values(errors as Record<string, unknown>)[0];

    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }

    if (typeof firstValue === "string") return firstValue;
  }

  return payload.message || payload.detail || payload.error || fallback;
}

function StatusBadge({
  value,
  fallback,
}: {
  value: string;
  fallback: string;
}) {
  const normalized = value.toLowerCase();

  if (["active", "verified", "approved"].includes(normalized)) {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
        {normalizeStatus(value) || fallback}
      </Badge>
    );
  }

  if (["blocked", "inactive", "rejected"].includes(normalized)) {
    return (
      <Badge variant="destructive" className="rounded-full px-3 py-1">
        {normalizeStatus(value) || fallback}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-full px-3 py-1">
      {normalizeStatus(value) || fallback}
    </Badge>
  );
}

function VerificationBadge({
  verified,
  verifiedText,
  notVerifiedText,
}: {
  verified: boolean;
  verifiedText: string;
  notVerifiedText: string;
}) {
  return verified ? (
    <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {verifiedText}
    </Badge>
  ) : (
    <Badge variant="outline" className="rounded-full px-3 py-1">
      {notVerifiedText}
    </Badge>
  );
}

function InfoBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border bg-background p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 break-words text-sm font-semibold">
          {value || "-"}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        placeholder={placeholder || label}
        disabled={disabled}
        className="h-11 rounded-2xl border bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
          onChange(event.target.value)
        }
        placeholder={placeholder || label}
        disabled={disabled}
        rows={4}
        className="resize-none rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onChange(event.target.value)
        }
        disabled={disabled}
        className="h-11 rounded-2xl border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {children}
      </select>
    </label>
  );
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-muted ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardContent className="space-y-4 p-5">
          <SkeletonLine className="h-8 w-56" />
          <SkeletonLine className="h-4 w-96 max-w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="space-y-4 p-5">
            <SkeletonLine className="h-16 w-16 rounded-2xl" />
            <SkeletonLine className="h-6 w-48" />
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="h-12 w-full rounded-2xl" />
            <SkeletonLine className="h-12 w-full rounded-2xl" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="space-y-4 p-5">
            <SkeletonLine className="h-6 w-40" />
            <div className="grid gap-4 md:grid-cols-2">
              <SkeletonLine className="h-11 w-full rounded-2xl" />
              <SkeletonLine className="h-11 w-full rounded-2xl" />
              <SkeletonLine className="h-11 w-full rounded-2xl" />
              <SkeletonLine className="h-11 w-full rounded-2xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CustomerProfilePage() {
  const [locale, setLocale] = useState<AppLocale>("ar");
  const [profile, setProfile] = useState<CustomerProfile>(DEFAULT_PROFILE);
  const [form, setForm] = useState<CustomerForm>(DEFAULT_FORM);
  const [initialForm, setInitialForm] = useState<CustomerForm>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [missingProfile, setMissingProfile] = useState(false);

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";
  const hasChanges = useMemo(() => !isSameForm(form, initialForm), [form, initialForm]);

  const setField = useCallback(
    (key: keyof CustomerForm, value: string) => {
      setForm((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const loadProfile = useCallback(
    async (showToast = false) => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setMissingProfile(false);

        const response = await fetch(apiUrl("/api/customers/me/"), {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        const payload = await readJson(response);

        if (!response.ok || payload?.ok === false || payload?.success === false) {
          if (response.status === 404) {
            setMissingProfile(true);
            setProfile(DEFAULT_PROFILE);
            setForm(DEFAULT_FORM);
            setInitialForm(DEFAULT_FORM);
            return;
          }

          throw new Error(errorText(payload, t.loadError));
        }

        const nextProfile = unwrapCustomer(payload);
        const nextForm = profileToForm(nextProfile);

        setProfile(nextProfile);
        setForm(nextForm);
        setInitialForm(nextForm);

        if (showToast) {
          toast.success(t.saveSuccess);
        }
      } catch (error) {
        console.error("Customer profile load error:", error);
        setErrorMessage(error instanceof Error ? error.message : t.loadError);
        toast.error(t.loadError);
      } finally {
        setIsLoading(false);
      }
    },
    [t.loadError, t.saveSuccess],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.first_name.trim() && !form.last_name.trim()) {
      toast.error(t.validationError);
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const csrfToken = await getCsrfToken();

      const response = await fetch(apiUrl("/api/customers/me/"), {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
        body: JSON.stringify(formToPayload(form)),
      });

      const payload = await readJson(response);

      if (!response.ok || payload?.ok === false || payload?.success === false) {
        throw new Error(errorText(payload, t.saveError));
      }

      const nextProfile = unwrapCustomer(payload);
      const nextForm = profileToForm(nextProfile);

      setProfile(nextProfile);
      setForm(nextForm);
      setInitialForm(nextForm);

      if (payload?.requires_phone_verification) {
        toast.warning(t.phoneChanged);
      } else {
        toast.success(payload?.message || t.saveSuccess);
      }
    } catch (error) {
      console.error("Customer profile save error:", error);
      const message = error instanceof Error ? error.message : t.saveError;
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setForm(initialForm);
    toast.message(t.unsavedChanges);
  }

  useEffect(() => {
    const syncLocale = () => setLocale(readLocale());

    syncLocale();

    window.addEventListener("primey-locale-changed", syncLocale);
    window.addEventListener("storage", syncLocale);

    return () => {
      window.removeEventListener("primey-locale-changed", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  useEffect(() => {
    void loadProfile(false);
  }, [loadProfile]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasChanges) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);

    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  return (
    <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Badge variant="outline" className="mb-2 rounded-full px-3 py-1">
            <UserRound className="h-3.5 w-3.5" />
            {t.profileBadge}
          </Badge>

          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {t.pageTitle}
          </h1>

          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            {t.pageSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/customer">
            <Button variant="outline" className="h-10 rounded-xl">
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              {t.backToDashboard}
            </Button>
          </Link>

          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => void loadProfile(true)}
            disabled={isLoading || isSaving}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>
        </div>
      </div>

      {hasChanges ? (
        <Card className="rounded-2xl border border-amber-200 bg-amber-50/70 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-amber-800 dark:text-amber-200">
            <Edit3 className="h-4 w-4" />
            {t.unsavedChanges}
          </CardContent>
        </Card>
      ) : null}

      {errorMessage ? (
        <Card className="rounded-2xl border border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-destructive">
                  {errorMessage || t.loadError}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.loadError}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void loadProfile(true)}
            >
              <RefreshCcw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <PageSkeleton />
      ) : missingProfile ? (
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <UserRound className="h-7 w-7 text-muted-foreground" />
            </div>

            <p className="text-lg font-semibold">{t.missingProfile}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4" />
                  {t.overviewTitle}
                </CardTitle>
                <CardDescription>{t.overviewDesc}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border bg-background p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                    {(profile.displayName || "PC")
                      .split(" ")
                      .map((item) => item[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "PC"}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-base font-bold">
                      {profile.displayName || t.noData}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {profile.customerCode || profile.id || t.noData}
                    </p>

                    <div className="mt-2">
                      <StatusBadge value={profile.status} fallback={t.noData} />
                    </div>
                  </div>
                </div>

                <InfoBox
                  label={t.customerCode}
                  value={profile.customerCode || profile.id || "-"}
                  icon={<BadgeCheck className="h-4 w-4" />}
                />

                <InfoBox
                  label={t.phoneNumber}
                  value={<span dir="ltr">{profile.phoneNumber || "-"}</span>}
                  icon={<Phone className="h-4 w-4" />}
                />

                <InfoBox
                  label={t.email}
                  value={profile.email || "-"}
                  icon={<Mail className="h-4 w-4" />}
                />

                <InfoBox
                  label={t.lastLogin}
                  value={formatDate(profile.lastLoginAt)}
                  icon={<CalendarDays className="h-4 w-4" />}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{t.overviewTitle}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <InfoBox
                  label={t.accountType}
                  value={normalizeStatus(profile.customerType) || "-"}
                  icon={<UserRound className="h-4 w-4" />}
                />

                <InfoBox
                  label={t.source}
                  value={normalizeStatus(profile.source) || "-"}
                  icon={<ShieldCheck className="h-4 w-4" />}
                />

                <div className="flex flex-wrap gap-2 rounded-2xl border bg-background p-4">
                  <VerificationBadge
                    verified={profile.isPhoneVerified}
                    verifiedText={t.verified}
                    notVerifiedText={t.notVerified}
                  />

                  <VerificationBadge
                    verified={profile.isWhatsappVerified}
                    verifiedText={t.verified}
                    notVerifiedText={t.notVerified}
                  />
                </div>
              </CardContent>
            </Card>
          </aside>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Edit3 className="h-4 w-4" />
                  {t.editTitle}
                </CardTitle>
                <CardDescription>{t.editDesc}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{t.identityTitle}</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label={t.firstName}
                      value={form.first_name}
                      onChange={(value) => setField("first_name", value)}
                      disabled={isSaving}
                    />
                    <Field
                      label={t.lastName}
                      value={form.last_name}
                      onChange={(value) => setField("last_name", value)}
                      disabled={isSaving}
                    />
                    <SelectField
                      label={t.gender}
                      value={form.gender}
                      onChange={(value) => setField("gender", value)}
                      disabled={isSaving}
                    >
                      <option value="">{t.selectGender}</option>
                      <option value="male">{t.male}</option>
                      <option value="female">{t.female}</option>
                      <option value="not_specified">{t.notSpecified}</option>
                    </SelectField>
                    <Field
                      label={t.dateOfBirth}
                      type="date"
                      value={form.date_of_birth}
                      onChange={(value) => setField("date_of_birth", value)}
                      disabled={isSaving}
                    />
                    <Field
                      label={t.nationalId}
                      value={form.national_id}
                      onChange={(value) => setField("national_id", value)}
                      disabled={isSaving}
                    />
                    <Field
                      label={t.nationality}
                      value={form.nationality}
                      onChange={(value) => setField("nationality", value)}
                      disabled={isSaving}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{t.contactTitle}</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label={t.email}
                      type="email"
                      value={form.email}
                      onChange={(value) => setField("email", value)}
                      disabled={isSaving}
                    />
                    <Field
                      label={t.phoneNumber}
                      value={form.phone_number}
                      onChange={(value) => setField("phone_number", value)}
                      disabled={isSaving}
                    />
                    <Field
                      label={t.whatsappNumber}
                      value={form.whatsapp_number}
                      onChange={(value) => setField("whatsapp_number", value)}
                      disabled={isSaving}
                    />
                    <Field
                      label={t.alternativePhone}
                      value={form.alternative_phone_number}
                      onChange={(value) =>
                        setField("alternative_phone_number", value)
                      }
                      disabled={isSaving}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{t.addressTitle}</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label={t.city}
                      value={form.city}
                      onChange={(value) => setField("city", value)}
                      disabled={isSaving}
                    />
                    <Field
                      label={t.district}
                      value={form.district}
                      onChange={(value) => setField("district", value)}
                      disabled={isSaving}
                    />
                    <Field
                      label={t.streetAddress}
                      value={form.street_address}
                      onChange={(value) => setField("street_address", value)}
                      disabled={isSaving}
                    />
                    <Field
                      label={t.postalCode}
                      value={form.postal_code}
                      onChange={(value) => setField("postal_code", value)}
                      disabled={isSaving}
                    />
                  </div>

                  <TextAreaField
                    label={t.nationalAddress}
                    value={form.national_address_text}
                    onChange={(value) => setField("national_address_text", value)}
                    disabled={isSaving}
                  />
                </section>

                <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl"
                    onClick={handleReset}
                    disabled={isSaving || !hasChanges}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t.reset}
                  </Button>

                  <Button
                    type="submit"
                    className="h-11 rounded-xl"
                    disabled={isSaving || !hasChanges}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isSaving ? t.saving : t.save}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      )}
    </div>
  );
}