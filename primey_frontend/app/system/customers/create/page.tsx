"use client";

/* ============================================================
   📂 primey_frontend/app/system/customers/create/page.tsx
   🧭 Primey Care — Create Customer V2 Login-User Ready
   ------------------------------------------------------------
   ✅ Same visual spirit as approved Products + Customers pages
   ✅ Paid profile/form layout: main form + side summary
   ✅ Real API only: POST /api/customers/
   ✅ Optional login user for customer:
      create_login_user / login_username / login_email / login_password
      login_display_name / login_phone / login_whatsapp
   ✅ Customer user rule:
      Customer.user -> auth.User
      user_type = CUSTOMER
      role = customer_user
      workspace = customer
   ✅ Customer special rule:
      External/order creation may create Customer only, then User later by OTP.
      This system page can create/link login user immediately when enabled.
   ✅ No localhost
   ✅ No fake data
   ✅ RTL/LTR via primey-locale
   ✅ English numerals always
   ✅ sonner toasts
   ✅ Unsaved changes protection
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleAlert,
  CircleUserRound,
  Copy,
  Eraser,
  FileText,
  Home,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  User,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Textarea } from "@/components/ui/textarea";

type Locale = "ar" | "en";

type CustomerType = "individual" | "corporate";
type CustomerStatus = "active" | "inactive" | "lead" | "blocked";
type CustomerSource =
  | "website"
  | "whatsapp"
  | "agent"
  | "admin"
  | "import"
  | "other";

type CustomerForm = {
  customer_type: CustomerType;
  status: CustomerStatus;
  source: CustomerSource;

  first_name: string;
  last_name: string;
  company_name: string;
  gender: string;
  date_of_birth: string;
  national_id: string;
  passport_number: string;
  nationality: string;

  email: string;
  phone_number: string;
  whatsapp_number: string;
  alternative_phone_number: string;

  create_login_user: boolean;
  login_username: string;
  login_email: string;
  login_password: string;
  login_display_name: string;
  login_phone: string;
  login_whatsapp: string;

  country: string;
  city: string;
  district: string;
  street_address: string;
  postal_code: string;
  national_address_text: string;

  notes: string;
  tags: string;

  is_phone_verified: boolean;
  is_whatsapp_verified: boolean;
};

type FieldErrors = Partial<Record<keyof CustomerForm | "general", string>>;

type CreateCustomerResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  id?: string | number;
  customer_id?: string | number;
  customer?: {
    id?: string | number;
    customer_code?: string;
  };
  data?:
    | {
        id?: string | number;
        customer_id?: string | number;
        customer?: {
          id?: string | number;
          customer_code?: string;
        };
        item?: {
          id?: string | number;
          customer_code?: string;
        };
      }
    | Record<string, unknown>;
};

const DRAFT_KEY = "primey-care.customer-create.v2.login-user.draft";

const translations = {
  ar: {
    title: "إضافة عميل",
    subtitle:
      "إنشاء ملف عميل جديد مع بيانات التواصل والتحقق والعنوان، مع خيار إنشاء حساب دخول وربطه بالعميل.",
    back: "رجوع",
    save: "حفظ العميل",
    saving: "جاري الحفظ",
    reset: "إعادة ضبط",
    clear: "تفريغ",
    copied: "تم النسخ",

    mainInfo: "بيانات العميل",
    mainInfoDesc: "حدد نوع العميل واكتب الاسم أو اسم الشركة.",
    loginInfo: "حساب دخول العميل",
    loginInfoDesc:
      "عند تفعيل هذا الخيار سيتم إنشاء User وربطه مباشرة بالعميل Customer.user.",
    contactInfo: "بيانات التواصل",
    contactInfoDesc: "رقم الجوال أو البريد مطلوب لإنشاء ملف العميل.",
    identityInfo: "الهوية والتحقق",
    identityInfoDesc: "بيانات اختيارية تساعد في التحقق وربط الحسابات.",
    locationInfo: "العنوان والموقع",
    locationInfoDesc: "بيانات العنوان قابلة للتحديث لاحقًا.",
    notesInfo: "ملاحظات داخلية",
    notesInfoDesc: "ملاحظات تشغيلية لا تظهر للعميل.",
    summary: "ملخص العميل",
    summaryDesc: "مراجعة سريعة قبل الحفظ.",
    readiness: "جاهزية الحفظ",
    quickTips: "تنبيهات مهمة",

    createLoginUser: "إنشاء حساب دخول للعميل",
    loginUsername: "اسم مستخدم الدخول",
    loginEmail: "بريد الدخول",
    loginPassword: "كلمة مرور الدخول",
    loginDisplayName: "اسم العرض في الحساب",
    loginPhone: "جوال حساب الدخول",
    loginWhatsapp: "واتساب حساب الدخول",
    loginHint:
      "حساب العميل يستخدم user_type=Customer و role=customer_user و workspace=customer. ويمكن لاحقًا تسجيل دخوله عبر OTP.",
    passwordHint:
      "اترك كلمة المرور فارغة إذا كان الباكند سيولد كلمة مؤقتة أو سيتم استخدام رابط/OTP لاحقًا.",

    customerType: "نوع العميل",
    individual: "فرد",
    corporate: "شركة",
    status: "الحالة",
    active: "نشط",
    inactive: "غير نشط",
    lead: "عميل محتمل",
    blocked: "محظور",
    source: "المصدر",
    website: "الموقع",
    whatsapp: "واتساب",
    agent: "مندوب",
    admin: "إدخال يدوي",
    import: "استيراد",
    other: "أخرى",

    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    companyName: "اسم الشركة",
    gender: "الجنس",
    male: "ذكر",
    female: "أنثى",
    unspecified: "غير محدد",
    dateOfBirth: "تاريخ الميلاد",
    nationalId: "رقم الهوية",
    passportNumber: "رقم الجواز",
    nationality: "الجنسية",

    email: "البريد الإلكتروني",
    phone: "رقم الجوال",
    whatsappNumber: "رقم واتساب",
    alternativePhone: "رقم بديل",

    country: "الدولة",
    city: "المدينة",
    district: "الحي",
    streetAddress: "الشارع",
    postalCode: "الرمز البريدي",
    nationalAddress: "العنوان الوطني",

    notes: "ملاحظات",
    tags: "وسوم",
    phoneVerified: "الجوال موثق",
    whatsappVerified: "واتساب موثق",

    requiredIdentity:
      "أدخل رقم الجوال أو واتساب أو البريد الإلكتروني لإنشاء العميل.",
    requiredName: "أدخل اسم العميل أو اسم الشركة.",
    invalidEmail: "صيغة البريد الإلكتروني غير صحيحة.",
    invalidLoginEmail: "صيغة بريد الدخول غير صحيحة.",
    shortPassword: "كلمة المرور يجب ألا تقل عن 8 أحرف.",
    saved: "تم إنشاء العميل بنجاح.",
    draftSaved: "تم حفظ المسودة محليًا.",
    draftLoaded: "تم استعادة المسودة.",
    cleared: "تم تفريغ النموذج.",
    errorTitle: "تعذر تنفيذ العملية",
    submitError: "تعذر إنشاء العميل.",
    confirmClear: "هل تريد تفريغ النموذج الحالي؟",
    unsaved: "لديك تغييرات غير محفوظة.",
    viewCustomer: "فتح ملف العميل",
    saveDraft: "حفظ مسودة",

    complete: "مكتمل",
    incomplete: "ناقص",
    yes: "نعم",
    no: "لا",
    loginReady: "جاهزية حساب الدخول",
    contactReady: "جاهزية التواصل",
    identityReady: "جاهزية الهوية",
    addressReady: "جاهزية العنوان",
    accountMode: "وضع الحساب",
    loginCreated: "إنشاء حساب دخول",
    customerOnly: "ملف عميل فقط",
    customerOnlyHint:
      "يمكن إنشاء العميل بدون حساب دخول، خصوصًا للعملاء المستوردين أو العملاء المحتملين. وعند دخول العميل بالـ OTP يمكن إنشاء/ربط الحساب لاحقًا.",
  },
  en: {
    title: "Add Customer",
    subtitle:
      "Create a new customer profile with contact, verification, address, and optional linked login account.",
    back: "Back",
    save: "Save customer",
    saving: "Saving",
    reset: "Reset",
    clear: "Clear",
    copied: "Copied",

    mainInfo: "Customer data",
    mainInfoDesc: "Choose the customer type and enter name or company name.",
    loginInfo: "Customer login account",
    loginInfoDesc:
      "When enabled, a User will be created and linked directly to Customer.user.",
    contactInfo: "Contact data",
    contactInfoDesc: "Phone or email is required to create a customer profile.",
    identityInfo: "Identity & verification",
    identityInfoDesc: "Optional identity details for matching and verification.",
    locationInfo: "Address & location",
    locationInfoDesc: "Address data can be updated later.",
    notesInfo: "Internal notes",
    notesInfoDesc: "Operational notes are not visible to the customer.",
    summary: "Customer summary",
    summaryDesc: "Quick review before saving.",
    readiness: "Save readiness",
    quickTips: "Important notes",

    createLoginUser: "Create customer login account",
    loginUsername: "Login username",
    loginEmail: "Login email",
    loginPassword: "Login password",
    loginDisplayName: "Login display name",
    loginPhone: "Login phone",
    loginWhatsapp: "Login WhatsApp",
    loginHint:
      "Customer account uses user_type=Customer, role=customer_user, and workspace=customer. OTP login can also be used later.",
    passwordHint:
      "Leave password empty if backend should generate a temporary password or OTP/link will be used later.",

    customerType: "Customer type",
    individual: "Individual",
    corporate: "Corporate",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    lead: "Lead",
    blocked: "Blocked",
    source: "Source",
    website: "Website",
    whatsapp: "WhatsApp",
    agent: "Agent",
    admin: "Manual",
    import: "Import",
    other: "Other",

    firstName: "First name",
    lastName: "Last name",
    companyName: "Company name",
    gender: "Gender",
    male: "Male",
    female: "Female",
    unspecified: "Unspecified",
    dateOfBirth: "Date of birth",
    nationalId: "National ID",
    passportNumber: "Passport number",
    nationality: "Nationality",

    email: "Email",
    phone: "Phone number",
    whatsappNumber: "WhatsApp number",
    alternativePhone: "Alternative phone",

    country: "Country",
    city: "City",
    district: "District",
    streetAddress: "Street",
    postalCode: "Postal code",
    nationalAddress: "National address",

    notes: "Notes",
    tags: "Tags",
    phoneVerified: "Phone verified",
    whatsappVerified: "WhatsApp verified",

    requiredIdentity:
      "Enter phone, WhatsApp, or email to create the customer.",
    requiredName: "Enter customer name or company name.",
    invalidEmail: "Email format is invalid.",
    invalidLoginEmail: "Login email format is invalid.",
    shortPassword: "Password must be at least 8 characters.",
    saved: "Customer created successfully.",
    draftSaved: "Draft saved locally.",
    draftLoaded: "Draft restored.",
    cleared: "Form cleared.",
    errorTitle: "Unable to complete operation",
    submitError: "Unable to create customer.",
    confirmClear: "Do you want to clear the current form?",
    unsaved: "You have unsaved changes.",
    viewCustomer: "Open customer",
    saveDraft: "Save draft",

    complete: "Complete",
    incomplete: "Incomplete",
    yes: "Yes",
    no: "No",
    loginReady: "Login readiness",
    contactReady: "Contact readiness",
    identityReady: "Identity readiness",
    addressReady: "Address readiness",
    accountMode: "Account mode",
    loginCreated: "Create login account",
    customerOnly: "Customer profile only",
    customerOnlyHint:
      "The customer can be created without a login account, especially for imported customers or leads. A user can be created/linked later through OTP login.",
  },
} as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toEnglishDigits(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).trim();
  return cleaned || fallback;
}

function normalizePhone(value: string) {
  return toEnglishDigits(value).replace(/[^\d+]/g, "").trim();
}

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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

  if (envBase.endsWith("/api")) {
    return envBase.slice(0, -4);
  }

  return envBase;
}

function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(toEnglishDigits(value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function extractCustomerId(payload: CreateCustomerResponse) {
  const data = asRecord(payload.data);
  const dataCustomer = asRecord(data.customer);
  const dataItem = asRecord(data.item);
  const rootCustomer = asRecord(payload.customer);

  const candidates = [
    payload.id,
    payload.customer_id,
    rootCustomer.id,
    data.id,
    data.customer_id,
    dataCustomer.id,
    dataItem.id,
  ];

  for (const candidate of candidates) {
    const id = toNumber(candidate, 0);
    if (id > 0) return id;
  }

  return 0;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
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
      payload?.errors ||
      `Request failed with status ${response.status}`;

    throw new Error(
      typeof message === "string" ? message : JSON.stringify(message),
    );
  }

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

function createInitialForm(): CustomerForm {
  return {
    customer_type: "individual",
    status: "active",
    source: "admin",

    first_name: "",
    last_name: "",
    company_name: "",
    gender: "",
    date_of_birth: "",
    national_id: "",
    passport_number: "",
    nationality: "Saudi Arabia",

    email: "",
    phone_number: "",
    whatsapp_number: "",
    alternative_phone_number: "",

    create_login_user: true,
    login_username: "",
    login_email: "",
    login_password: "",
    login_display_name: "",
    login_phone: "",
    login_whatsapp: "",

    country: "Saudi Arabia",
    city: "",
    district: "",
    street_address: "",
    postal_code: "",
    national_address_text: "",

    notes: "",
    tags: "",

    is_phone_verified: false,
    is_whatsapp_verified: false,
  };
}

function getCustomerName(form: CustomerForm) {
  if (form.customer_type === "corporate") {
    return form.company_name.trim();
  }

  return [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(" ");
}

function getDisplayName(form: CustomerForm) {
  return (
    getCustomerName(form) ||
    form.company_name.trim() ||
    form.first_name.trim() ||
    form.phone_number.trim() ||
    form.whatsapp_number.trim() ||
    form.email.trim()
  );
}

function getInitials(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return "PC";
  return cleaned.slice(0, 2).toUpperCase();
}

function buildPayload(form: CustomerForm) {
  const phone = normalizePhone(form.phone_number);
  const whatsapp = normalizePhone(form.whatsapp_number);
  const alternativePhone = normalizePhone(form.alternative_phone_number);
  const displayName = getDisplayName(form);

  const loginEmail = normalizeText(form.login_email) || normalizeText(form.email);
  const loginPhone =
    normalizeText(form.login_phone) ||
    normalizeText(form.phone_number) ||
    normalizeText(form.whatsapp_number);
  const loginWhatsapp =
    normalizeText(form.login_whatsapp) ||
    normalizeText(form.whatsapp_number) ||
    normalizeText(form.phone_number);
  const loginDisplayName =
    normalizeText(form.login_display_name) ||
    displayName;

  return {
    customer_type: form.customer_type,
    status: form.status,
    source: form.source,

    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    company_name: form.company_name.trim(),
    display_name: displayName,

    gender: form.gender.trim(),
    date_of_birth: form.date_of_birth || null,
    national_id: toEnglishDigits(form.national_id).trim(),
    passport_number: form.passport_number.trim(),
    nationality: form.nationality.trim(),

    email: form.email.trim().toLowerCase(),
    phone_number: phone,
    whatsapp_number: whatsapp,
    alternative_phone_number: alternativePhone,

    create_login_user: form.create_login_user,
    create_user: form.create_login_user,
    create_account: form.create_login_user,
    login_username: normalizeText(form.login_username) || undefined,
    username: normalizeText(form.login_username) || undefined,
    login_email: loginEmail || undefined,
    user_email: loginEmail || undefined,
    login_password: normalizeText(form.login_password) || undefined,
    password: normalizeText(form.login_password) || undefined,
    login_display_name: loginDisplayName || undefined,
    login_phone: loginPhone || undefined,
    login_phone_number: loginPhone || undefined,
    login_whatsapp: loginWhatsapp || undefined,
    login_whatsapp_number: loginWhatsapp || undefined,

    country: form.country.trim(),
    city: form.city.trim(),
    district: form.district.trim(),
    street_address: form.street_address.trim(),
    postal_code: toEnglishDigits(form.postal_code).trim(),
    national_address_text: form.national_address_text.trim(),

    notes: form.notes.trim(),
    tags: form.tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),

    is_phone_verified: form.is_phone_verified,
    is_whatsapp_verified: form.is_whatsapp_verified,
  };
}

function sourceLabel(source: CustomerSource, locale: Locale) {
  const t = translations[locale];

  const labels: Record<CustomerSource, string> = {
    website: t.website,
    whatsapp: t.whatsapp,
    agent: t.agent,
    admin: t.admin,
    import: t.import,
    other: t.other,
  };

  return labels[source];
}

function statusLabel(status: CustomerStatus, locale: Locale) {
  const t = translations[locale];

  const labels: Record<CustomerStatus, string> = {
    active: t.active,
    inactive: t.inactive,
    lead: t.lead,
    blocked: t.blocked,
  };

  return labels[status];
}

function typeLabel(type: CustomerType, locale: Locale) {
  const t = translations[locale];

  return type === "corporate" ? t.corporate : t.individual;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function ReadinessRow({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge
        variant="outline"
        className={cn(
          "rounded-full px-2.5 py-1 text-xs",
          ready
            ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
            : "border-amber-500/30 bg-amber-50 text-amber-700",
        )}
      >
        {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
      </Badge>
    </div>
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

export default function SystemCustomerCreatePage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<CustomerForm>(() => createInitialForm());
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [createdId, setCreatedId] = React.useState<number | null>(null);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const displayName = getDisplayName(form);
  const customerName = getCustomerName(form);

  const contactReady = Boolean(
    form.phone_number.trim() ||
      form.whatsapp_number.trim() ||
      form.email.trim(),
  );

  const identityReady = Boolean(
    form.national_id.trim() ||
      form.passport_number.trim() ||
      form.date_of_birth.trim(),
  );

  const addressReady = Boolean(
    form.city.trim() ||
      form.district.trim() ||
      form.street_address.trim() ||
      form.national_address_text.trim(),
  );

  const nameReady = Boolean(customerName);

  const loginReady =
    !form.create_login_user ||
    Boolean(
      form.login_username.trim() ||
        form.login_email.trim() ||
        form.email.trim() ||
        form.phone_number.trim() ||
        form.whatsapp_number.trim(),
    );

  const canSubmit = nameReady && contactReady && loginReady && !saving;

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
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<CustomerForm>;

      setForm({
        ...createInitialForm(),
        ...parsed,
        customer_type:
          parsed.customer_type === "corporate" ? "corporate" : "individual",
        status:
          parsed.status === "inactive" ||
          parsed.status === "lead" ||
          parsed.status === "blocked"
            ? parsed.status
            : "active",
        source:
          parsed.source === "website" ||
          parsed.source === "whatsapp" ||
          parsed.source === "agent" ||
          parsed.source === "import" ||
          parsed.source === "other"
            ? parsed.source
            : "admin",
        create_login_user:
          typeof parsed.create_login_user === "boolean"
            ? parsed.create_login_user
            : true,
      });

      setDirty(true);
      toast.success(translations[getInitialLocale()].draftLoaded);
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  React.useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || saving) return;

      event.preventDefault();
      event.returnValue = t.unsaved;
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saving, t.unsaved]);

  function setField<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);

    if (errors[key]) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function setNameField<K extends "first_name" | "last_name" | "company_name">(
    key: K,
    value: string,
  ) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      const nextDisplay =
        next.customer_type === "corporate"
          ? next.company_name
          : [next.first_name, next.last_name].filter(Boolean).join(" ");

      if (!current.login_display_name) {
        next.login_display_name = nextDisplay;
      }

      return next;
    });

    setDirty(true);
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};

    if (!getCustomerName(form)) {
      nextErrors.general = t.requiredName;
    }

    if (!contactReady) {
      nextErrors.phone_number = t.requiredIdentity;
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
      nextErrors.email = t.invalidEmail;
    }

    if (
      form.create_login_user &&
      form.login_email.trim() &&
      !isValidEmail(form.login_email)
    ) {
      nextErrors.login_email = t.invalidLoginEmail;
    }

    if (
      form.create_login_user &&
      form.login_password.trim() &&
      form.login_password.trim().length < 8
    ) {
      nextErrors.login_password = t.shortPassword;
    }

    setErrors(nextErrors);

    const firstError = Object.values(nextErrors).find(Boolean);

    if (firstError) {
      toast.error(firstError);
      return false;
    }

    return true;
  }

  function saveDraft() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    setDirty(false);
    toast.success(t.draftSaved);
  }

  function clearForm() {
    if (!window.confirm(t.confirmClear)) return;

    setForm(createInitialForm());
    setErrors({});
    setDirty(false);
    setCreatedId(null);
    window.localStorage.removeItem(DRAFT_KEY);
    toast.success(t.cleared);
  }

  async function submitForm(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    setErrors({});

    try {
      const payload = buildPayload(form);

      const response = await postJson<CreateCustomerResponse>(
        makeApiUrl("/api/customers/"),
        payload,
      );

      const customerId = extractCustomerId(response);

      setCreatedId(customerId || null);
      setDirty(false);
      window.localStorage.removeItem(DRAFT_KEY);
      toast.success(t.saved);

      if (customerId) {
        router.push(`/system/customers/${customerId}`);
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : t.submitError;

      setErrors({ general: message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.submitError);
    }
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-right">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t.title}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={saveDraft} disabled={saving}>
            <FileText className="h-4 w-4" />
            {t.saveDraft}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={clearForm} disabled={saving}>
            <RotateCcw className="h-4 w-4" />
            {t.clear}
          </Button>

          <Button
            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
            disabled={!canSubmit}
            onClick={() => void submitForm()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {saving ? t.saving : t.save}
          </Button>
        </div>
      </div>

      {errors.general ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-4 text-right">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">{t.errorTitle}</p>
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <form
        onSubmit={(event) => void submitForm(event)}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]"
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={t.readiness}
              value={nameReady && contactReady ? t.complete : t.incomplete}
              trend={nameReady && contactReady ? t.complete : t.incomplete}
              icon={BadgeCheck}
            />

            <KpiCard
              title={t.loginReady}
              value={loginReady ? t.complete : t.incomplete}
              trend={form.create_login_user ? t.loginCreated : t.customerOnly}
              icon={LockKeyhole}
            />

            <KpiCard
              title={t.contactReady}
              value={contactReady ? t.complete : t.incomplete}
              trend={form.phone_number || form.whatsapp_number || form.email || t.incomplete}
              icon={Phone}
            />

            <KpiCard
              title={t.addressReady}
              value={addressReady ? t.complete : t.incomplete}
              trend={form.city || form.country || t.incomplete}
              icon={MapPin}
            />
          </div>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.mainInfo}</CardTitle>
              <CardDescription>{t.mainInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <FieldLabel>{t.customerType}</FieldLabel>
                <Select
                  value={form.customer_type}
                  onValueChange={(value) =>
                    setField("customer_type", value as CustomerType)
                  }
                  disabled={saving}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{t.individual}</SelectItem>
                    <SelectItem value="corporate">{t.corporate}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.status}</FieldLabel>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setField("status", value as CustomerStatus)
                  }
                  disabled={saving}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t.active}</SelectItem>
                    <SelectItem value="inactive">{t.inactive}</SelectItem>
                    <SelectItem value="lead">{t.lead}</SelectItem>
                    <SelectItem value="blocked">{t.blocked}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.source}</FieldLabel>
                <Select
                  value={form.source}
                  onValueChange={(value) =>
                    setField("source", value as CustomerSource)
                  }
                  disabled={saving}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t.admin}</SelectItem>
                    <SelectItem value="website">{t.website}</SelectItem>
                    <SelectItem value="whatsapp">{t.whatsapp}</SelectItem>
                    <SelectItem value="agent">{t.agent}</SelectItem>
                    <SelectItem value="import">{t.import}</SelectItem>
                    <SelectItem value="other">{t.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.customer_type === "corporate" ? (
                <div className="space-y-2 md:col-span-2">
                  <FieldLabel>{t.companyName}</FieldLabel>
                  <Input
                    value={form.company_name}
                    onChange={(event) => setNameField("company_name", event.target.value)}
                    disabled={saving}
                    className="h-10 rounded-lg bg-background"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <FieldLabel>{t.firstName}</FieldLabel>
                    <Input
                      value={form.first_name}
                      onChange={(event) => setNameField("first_name", event.target.value)}
                      disabled={saving}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.lastName}</FieldLabel>
                    <Input
                      value={form.last_name}
                      onChange={(event) => setNameField("last_name", event.target.value)}
                      disabled={saving}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.loginInfo}</CardTitle>
              <CardDescription>{t.loginInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pb-6">
              <label className="flex items-start gap-3 rounded-lg border bg-background p-3">
                <Checkbox
                  checked={form.create_login_user}
                  onCheckedChange={(checked) => setField("create_login_user", Boolean(checked))}
                  disabled={saving}
                />
                <span className="space-y-1 text-start">
                  <span className="block text-sm font-medium text-foreground">
                    {t.createLoginUser}
                  </span>
                  <span className="block text-xs leading-5 text-muted-foreground">
                    {t.loginHint}
                  </span>
                </span>
              </label>

              <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", !form.create_login_user && "opacity-60")}>
                <div className="space-y-2">
                  <FieldLabel>{t.loginUsername}</FieldLabel>
                  <Input
                    value={form.login_username}
                    onChange={(event) => setField("login_username", event.target.value.trim())}
                    disabled={saving || !form.create_login_user}
                    className="h-10 rounded-lg bg-background"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.loginEmail}</FieldLabel>
                  <Input
                    value={form.login_email}
                    onChange={(event) => setField("login_email", event.target.value.trim())}
                    disabled={saving || !form.create_login_user}
                    placeholder={form.email}
                    className="h-10 rounded-lg bg-background"
                    dir="ltr"
                  />
                  {errors.login_email ? (
                    <p className="text-xs text-red-600">{errors.login_email}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.loginDisplayName}</FieldLabel>
                  <Input
                    value={form.login_display_name}
                    onChange={(event) => setField("login_display_name", event.target.value)}
                    disabled={saving || !form.create_login_user}
                    placeholder={displayName}
                    className="h-10 rounded-lg bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.loginPassword}</FieldLabel>
                  <Input
                    type="password"
                    value={form.login_password}
                    onChange={(event) => setField("login_password", event.target.value)}
                    disabled={saving || !form.create_login_user}
                    placeholder={t.passwordHint}
                    className="h-10 rounded-lg bg-background"
                  />
                  {errors.login_password ? (
                    <p className="text-xs text-red-600">{errors.login_password}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.loginPhone}</FieldLabel>
                  <Input
                    value={form.login_phone}
                    onChange={(event) => setField("login_phone", normalizePhone(event.target.value))}
                    disabled={saving || !form.create_login_user}
                    placeholder={form.phone_number || form.whatsapp_number}
                    className="h-10 rounded-lg bg-background text-right tabular-nums"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.loginWhatsapp}</FieldLabel>
                  <Input
                    value={form.login_whatsapp}
                    onChange={(event) => setField("login_whatsapp", normalizePhone(event.target.value))}
                    disabled={saving || !form.create_login_user}
                    placeholder={form.whatsapp_number || form.phone_number}
                    className="h-10 rounded-lg bg-background text-right tabular-nums"
                    dir="ltr"
                  />
                </div>

                <div className="md:col-span-2 xl:col-span-2">
                  <div className="flex h-full min-h-10 items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs leading-5 text-muted-foreground">
                      {t.customerOnlyHint}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.contactInfo}</CardTitle>
              <CardDescription>{t.contactInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <FieldLabel>{t.phone}</FieldLabel>
                <Input
                  value={form.phone_number}
                  onChange={(event) => {
                    const value = normalizePhone(event.target.value);
                    setField("phone_number", value);

                    if (!form.login_phone) setField("login_phone", value);
                    if (!form.login_whatsapp && !form.whatsapp_number) {
                      setField("login_whatsapp", value);
                    }
                  }}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                />
                {errors.phone_number ? (
                  <p className="text-xs text-red-600">{errors.phone_number}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.whatsappNumber}</FieldLabel>
                <Input
                  value={form.whatsapp_number}
                  onChange={(event) => {
                    const value = normalizePhone(event.target.value);
                    setField("whatsapp_number", value);

                    if (!form.login_whatsapp) setField("login_whatsapp", value);
                  }}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.alternativePhone}</FieldLabel>
                <Input
                  value={form.alternative_phone_number}
                  onChange={(event) =>
                    setField("alternative_phone_number", normalizePhone(event.target.value))
                  }
                  disabled={saving}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.email}</FieldLabel>
                <Input
                  value={form.email}
                  onChange={(event) => {
                    setField("email", event.target.value.trim());

                    if (!form.login_email) {
                      setField("login_email", event.target.value.trim());
                    }
                  }}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
                {errors.email ? (
                  <p className="text-xs text-red-600">{errors.email}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.identityInfo}</CardTitle>
              <CardDescription>{t.identityInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <FieldLabel>{t.gender}</FieldLabel>
                <Select
                  value={form.gender || "unspecified"}
                  onValueChange={(value) =>
                    setField("gender", value === "unspecified" ? "" : value)
                  }
                  disabled={saving}
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unspecified">{t.unspecified}</SelectItem>
                    <SelectItem value="male">{t.male}</SelectItem>
                    <SelectItem value="female">{t.female}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.dateOfBirth}</FieldLabel>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(event) => setField("date_of_birth", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.nationalId}</FieldLabel>
                <Input
                  value={form.national_id}
                  onChange={(event) =>
                    setField("national_id", toEnglishDigits(event.target.value))
                  }
                  disabled={saving}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.passportNumber}</FieldLabel>
                <Input
                  value={form.passport_number}
                  onChange={(event) => setField("passport_number", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.nationality}</FieldLabel>
                <Input
                  value={form.nationality}
                  onChange={(event) => setField("nationality", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <label className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Checkbox
                  checked={form.is_phone_verified}
                  onCheckedChange={(checked) =>
                    setField("is_phone_verified", Boolean(checked))
                  }
                  disabled={saving}
                />
                <span className="text-sm font-medium">{t.phoneVerified}</span>
              </label>

              <label className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Checkbox
                  checked={form.is_whatsapp_verified}
                  onCheckedChange={(checked) =>
                    setField("is_whatsapp_verified", Boolean(checked))
                  }
                  disabled={saving}
                />
                <span className="text-sm font-medium">{t.whatsappVerified}</span>
              </label>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.locationInfo}</CardTitle>
              <CardDescription>{t.locationInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <FieldLabel>{t.country}</FieldLabel>
                <Input
                  value={form.country}
                  onChange={(event) => setField("country", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.city}</FieldLabel>
                <Input
                  value={form.city}
                  onChange={(event) => setField("city", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.district}</FieldLabel>
                <Input
                  value={form.district}
                  onChange={(event) => setField("district", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.postalCode}</FieldLabel>
                <Input
                  value={form.postal_code}
                  onChange={(event) => setField("postal_code", toEnglishDigits(event.target.value))}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel>{t.streetAddress}</FieldLabel>
                <Input
                  value={form.street_address}
                  onChange={(event) => setField("street_address", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel>{t.nationalAddress}</FieldLabel>
                <Input
                  value={form.national_address_text}
                  onChange={(event) => setField("national_address_text", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.notesInfo}</CardTitle>
              <CardDescription>{t.notesInfoDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>{t.tags}</FieldLabel>
                <Input
                  value={form.tags}
                  onChange={(event) => setField("tags", event.target.value)}
                  disabled={saving}
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel>{t.notes}</FieldLabel>
                <Textarea
                  value={form.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                  disabled={saving}
                  className="min-h-[120px] rounded-lg bg-background"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4 rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div className="flex items-start gap-3">
                <Avatar className="h-14 w-14 rounded-xl border">
                  <AvatarFallback className="rounded-xl bg-muted text-base font-bold">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate">{displayName || t.summary}</CardTitle>
                  <CardDescription className="truncate">
                    {typeLabel(form.customer_type, locale)} · {statusLabel(form.status, locale)}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pb-6">
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3 border-b py-2">
                  <span className="text-sm text-muted-foreground">{t.customerType}</span>
                  <span className="text-sm font-medium">
                    {typeLabel(form.customer_type, locale)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 border-b py-2">
                  <span className="text-sm text-muted-foreground">{t.status}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full",
                      form.status === "active"
                        ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                        : form.status === "blocked"
                          ? "border-red-500/30 bg-red-50 text-red-700"
                          : "border-amber-500/30 bg-amber-50 text-amber-700",
                    )}
                  >
                    {statusLabel(form.status, locale)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-3 border-b py-2">
                  <span className="text-sm text-muted-foreground">{t.source}</span>
                  <span className="text-sm font-medium">{sourceLabel(form.source, locale)}</span>
                </div>

                <div className="flex items-center justify-between gap-3 border-b py-2">
                  <span className="text-sm text-muted-foreground">{t.accountMode}</span>
                  <span className="text-sm font-medium">
                    {form.create_login_user ? t.loginCreated : t.customerOnly}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 border-b py-2">
                  <span className="text-sm text-muted-foreground">{t.phone}</span>
                  <button
                    type="button"
                    className="truncate text-left text-sm font-medium hover:underline"
                    onClick={() => void copyValue(form.phone_number)}
                  >
                    {form.phone_number || "—"}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-muted-foreground">{t.city}</span>
                  <span className="text-sm font-medium">{form.city || "—"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <ReadinessRow label={t.mainInfo} ready={nameReady} />
                <ReadinessRow label={t.contactReady} ready={contactReady} />
                <ReadinessRow label={t.loginReady} ready={loginReady} />
                <ReadinessRow label={t.identityReady} ready={identityReady} />
                <ReadinessRow label={t.addressReady} ready={addressReady} />
              </div>

              <div className="grid gap-2">
                <Button
                  type="submit"
                  className="h-10 rounded-lg bg-black text-white hover:bg-black/90"
                  disabled={!canSubmit}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? t.saving : t.save}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-lg"
                  onClick={saveDraft}
                  disabled={saving}
                >
                  <FileText className="h-4 w-4" />
                  {t.saveDraft}
                </Button>

                {createdId ? (
                  <Button asChild variant="outline" className="h-10 rounded-lg">
                    <Link href={`/system/customers/${createdId}`}>
                      <CircleUserRound className="h-4 w-4" />
                      {t.viewCustomer}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.quickTips}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 px-5 pb-5 text-sm text-muted-foreground">
              <div className="flex gap-3 rounded-lg border bg-background p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t.requiredIdentity}</p>
              </div>

              <div className="flex gap-3 rounded-lg border bg-background p-3">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t.customerOnlyHint}</p>
              </div>

              <div className="flex gap-3 rounded-lg border bg-background p-3">
                <Home className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t.locationInfoDesc}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}