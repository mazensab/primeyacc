"use client";

/* ============================================================
   📂 primey_frontend/app/system/providers/create/page.tsx
   🏥 Primey Care — Create Provider V2 Login-User Ready
   ------------------------------------------------------------
   ✅ Same approved Customers / Agents / Providers visual pattern
   ✅ Main form + sidebar summary
   ✅ Real API only: POST /api/providers/create/
   ✅ Creates optional login user for provider:
      create_login_user / login_username / login_email / login_password
      login_display_name / login_phone / login_whatsapp
   ✅ Provider user rule:
      Provider.user -> auth.User
      user_type = PROVIDER
      role = provider_admin
      workspace = provider
   ✅ No localhost
   ✅ No fake data
   ✅ Local draft protection
   ✅ Field validation
   ✅ sonner toast
   ✅ SAR icon path kept for system consistency
   ✅ RTL/LTR via primey-locale
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Globe2,
  KeyRound,
  Landmark,
  Layers3,
  Loader2,
  LockKeyhole,
  MapPin,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
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

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type ProviderStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DRAFT";
type ProviderType =
  | "HOSPITAL"
  | "MEDICAL_CENTER"
  | "PHARMACY"
  | "LAB"
  | "CLINIC"
  | "PARTNER"
  | "OTHER";

type FormState = {
  name: string;
  name_ar: string;
  name_en: string;
  code: string;
  provider_type: ProviderType;
  status: ProviderStatus;

  region: string;
  area: string;
  city: string;
  district: string;
  street: string;
  address: string;

  phone: string;
  mobile: string;
  email: string;
  website: string;

  create_login_user: boolean;
  login_username: string;
  login_email: string;
  login_password: string;
  login_display_name: string;
  login_phone: string;
  login_whatsapp: string;

  source_category: string;
  import_source: string;
  external_reference: string;
  is_featured: boolean;
  commercial_registration: string;
  tax_number: string;
  notes: string;
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  item?: unknown;
  provider?: unknown;
  id?: number;
};

const SAR_ICON = "/currency/sar.svg";
const DRAFT_KEY = "primey-care.provider-create.v2.login-user.draft";

const translations = {
  ar: {
    title: "إضافة مقدم خدمة",
    subtitle:
      "إضافة مقدم خدمة جديد إلى الشبكة الطبية مع حساب دخول اختياري، بيانات التواصل، التصنيف، والبيانات النظامية.",
    back: "رجوع",
    saveDraft: "حفظ مسودة",
    clear: "مسح",
    submit: "حفظ مقدم الخدمة",
    saving: "جاري الحفظ",

    basicInfo: "بيانات مقدم الخدمة",
    contactInfo: "بيانات التواصل",
    loginInfo: "حساب دخول مقدم الخدمة",
    addressInfo: "العنوان والموقع",
    legalInfo: "البيانات النظامية",
    networkInfo: "بيانات الشبكة",
    notesInfo: "الملاحظات",

    name: "الاسم العام",
    nameAr: "الاسم العربي",
    nameEn: "الاسم الإنجليزي",
    code: "الكود",
    type: "التصنيف",
    status: "الحالة",

    region: "المنطقة",
    area: "النطاق",
    city: "المدينة",
    district: "الحي",
    street: "الشارع",
    address: "العنوان",

    phone: "الهاتف",
    mobile: "الجوال",
    email: "البريد الإلكتروني",
    website: "الموقع الإلكتروني",

    createLoginUser: "إنشاء حساب دخول لمقدم الخدمة",
    loginUsername: "اسم مستخدم الدخول",
    loginEmail: "بريد الدخول",
    loginPassword: "كلمة مرور الدخول",
    loginDisplayName: "اسم العرض في الحساب",
    loginPhone: "جوال حساب الدخول",
    loginWhatsapp: "واتساب حساب الدخول",
    loginHint:
      "عند تفعيل هذا الخيار سيتم إنشاء User وربطه مباشرة بمقدم الخدمة Provider.user مع user_type=PROVIDER و role=provider_admin.",
    passwordHint:
      "اترك كلمة المرور فارغة إذا كان الباكند سيولد كلمة مؤقتة أو سيتم إرسال رابط كلمة مرور لاحقًا.",

    sourceCategory: "تصنيف المصدر",
    importSource: "مصدر الاستيراد",
    externalReference: "المرجع الخارجي",
    featured: "مميز",
    commercialRegistration: "السجل التجاري",
    taxNumber: "الرقم الضريبي",
    notes: "ملاحظات",

    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    draft: "مسودة",

    hospital: "مستشفى",
    medicalCenter: "مركز طبي",
    pharmacy: "صيدلية",
    lab: "مختبر",
    clinic: "عيادة",
    partner: "شريك",
    other: "أخرى",

    yes: "نعم",
    no: "لا",

    summary: "ملخص مقدم الخدمة",
    readiness: "جاهزية البيانات",
    requiredFields: "الحقول المطلوبة",
    optionalFields: "الحقول الاختيارية",
    loginReadiness: "جاهزية حساب الدخول",
    networkReadiness: "جاهزية الشبكة",
    legalReadiness: "جاهزية النظامية",
    complete: "مكتمل",
    incomplete: "غير مكتمل",

    requiredName: "اسم مقدم الخدمة مطلوب.",
    invalidEmail: "صيغة البريد الإلكتروني غير صحيحة.",
    invalidLoginEmail: "صيغة بريد الدخول غير صحيحة.",
    shortPassword: "كلمة المرور يجب ألا تقل عن 8 أحرف.",

    saved: "تم إنشاء مقدم الخدمة بنجاح.",
    draftSaved: "تم حفظ المسودة محليًا.",
    draftLoaded: "تم استعادة المسودة.",
    cleared: "تم مسح النموذج.",
    errorTitle: "تعذر تنفيذ العملية",
    submitError: "تعذر إنشاء مقدم الخدمة.",
    confirmClear: "هل تريد مسح النموذج الحالي؟",
    unsaved: "لديك تغييرات غير محفوظة.",
    viewProvider: "فتح مقدم الخدمة",

    placeholderNameAr: "مثال: مستشفى برايمي",
    placeholderNameEn: "Example: Primey Hospital",
    placeholderWebsite: "https://example.com",
    sourceManual: "إدخال يدوي",
    sourceImported: "مستوردة من الشبكة",
  },
  en: {
    title: "Add Provider",
    subtitle:
      "Add a new provider to the medical network with optional login account, contact, category, and legal information.",
    back: "Back",
    saveDraft: "Save draft",
    clear: "Clear",
    submit: "Save provider",
    saving: "Saving",

    basicInfo: "Provider info",
    contactInfo: "Contact info",
    loginInfo: "Provider login account",
    addressInfo: "Address & location",
    legalInfo: "Legal info",
    networkInfo: "Network info",
    notesInfo: "Notes",

    name: "General name",
    nameAr: "Arabic name",
    nameEn: "English name",
    code: "Code",
    type: "Type",
    status: "Status",

    region: "Region",
    area: "Area",
    city: "City",
    district: "District",
    street: "Street",
    address: "Address",

    phone: "Phone",
    mobile: "Mobile",
    email: "Email",
    website: "Website",

    createLoginUser: "Create provider login account",
    loginUsername: "Login username",
    loginEmail: "Login email",
    loginPassword: "Login password",
    loginDisplayName: "Login display name",
    loginPhone: "Login phone",
    loginWhatsapp: "Login WhatsApp",
    loginHint:
      "When enabled, a User will be created and linked to Provider.user with user_type=PROVIDER and role=provider_admin.",
    passwordHint:
      "Leave password empty if backend should generate a temporary password or a password setup link will be used later.",

    sourceCategory: "Source category",
    importSource: "Import source",
    externalReference: "External reference",
    featured: "Featured",
    commercialRegistration: "Commercial registration",
    taxNumber: "Tax number",
    notes: "Notes",

    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    draft: "Draft",

    hospital: "Hospital",
    medicalCenter: "Medical center",
    pharmacy: "Pharmacy",
    lab: "Lab",
    clinic: "Clinic",
    partner: "Partner",
    other: "Other",

    yes: "Yes",
    no: "No",

    summary: "Provider summary",
    readiness: "Data readiness",
    requiredFields: "Required fields",
    optionalFields: "Optional fields",
    loginReadiness: "Login readiness",
    networkReadiness: "Network readiness",
    legalReadiness: "Legal readiness",
    complete: "Complete",
    incomplete: "Incomplete",

    requiredName: "Provider name is required.",
    invalidEmail: "Email format is invalid.",
    invalidLoginEmail: "Login email format is invalid.",
    shortPassword: "Password must be at least 8 characters.",

    saved: "Provider created successfully.",
    draftSaved: "Draft saved locally.",
    draftLoaded: "Draft restored.",
    cleared: "Form cleared.",
    errorTitle: "Unable to complete operation",
    submitError: "Unable to create provider.",
    confirmClear: "Do you want to clear the current form?",
    unsaved: "You have unsaved changes.",
    viewProvider: "Open provider",

    placeholderNameAr: "Example: Primey Hospital",
    placeholderNameEn: "Example: Primey Hospital",
    placeholderWebsite: "https://example.com",
    sourceManual: "Manual entry",
    sourceImported: "Imported from network",
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

function normalizePhone(value: string) {
  return toEnglishDigits(value).replace(/[^\d+]/g, "").trim();
}

function normalizeCode(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .toUpperCase();
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
  const base = getApiBaseUrl();
  return `${base}${path}`;
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
    method?: "POST" | "GET";
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

function extractCreatedId(payload: unknown): number | null {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  const candidates = [
    data.id,
    asRecord(data.provider).id,
    asRecord(data.item).id,
    root.id,
    asRecord(root.provider).id,
    asRecord(root.item).id,
  ];

  for (const candidate of candidates) {
    const id = Number(candidate);
    if (Number.isFinite(id) && id > 0) return id;
  }

  return null;
}

function createInitialForm(): FormState {
  return {
    name: "",
    name_ar: "",
    name_en: "",
    code: "",
    provider_type: "MEDICAL_CENTER",
    status: "ACTIVE",

    region: "",
    area: "",
    city: "",
    district: "",
    street: "",
    address: "",

    phone: "",
    mobile: "",
    email: "",
    website: "",

    create_login_user: true,
    login_username: "",
    login_email: "",
    login_password: "",
    login_display_name: "",
    login_phone: "",
    login_whatsapp: "",

    source_category: "manual",
    import_source: "",
    external_reference: "",
    is_featured: false,
    commercial_registration: "",
    tax_number: "",
    notes: "",
  };
}

function buildPayload(form: FormState) {
  const name =
    form.name.trim() ||
    form.name_ar.trim() ||
    form.name_en.trim();

  const phone = normalizePhone(form.phone);
  const mobile = normalizePhone(form.mobile);

  const loginEmail = normalizeText(form.login_email) || normalizeText(form.email);
  const loginPhone =
    normalizeText(form.login_phone) ||
    normalizeText(form.mobile) ||
    normalizeText(form.phone);
  const loginWhatsapp =
    normalizeText(form.login_whatsapp) ||
    normalizeText(form.mobile) ||
    normalizeText(form.phone);
  const loginDisplayName =
    normalizeText(form.login_display_name) ||
    name;

  return {
    name,
    display_name: name,
    name_ar: form.name_ar.trim(),
    name_en: form.name_en.trim(),
    code: normalizeCode(form.code),
    provider_type: form.provider_type,
    type: form.provider_type,
    status: form.status,

    region: form.region.trim(),
    area: form.area.trim(),
    city: form.city.trim(),
    district: form.district.trim(),
    street: form.street.trim(),
    address: form.address.trim(),

    phone,
    phone_number: phone,
    mobile,
    mobile_number: mobile,
    email: form.email.trim(),
    website: form.website.trim(),

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

    source_category: form.source_category.trim(),
    import_source: form.import_source.trim(),
    external_reference: form.external_reference.trim(),
    is_featured: form.is_featured,
    commercial_registration: form.commercial_registration.trim(),
    tax_number: form.tax_number.trim(),
    notes: form.notes.trim(),
  };
}

function providerTypeLabel(type: ProviderType, locale: Locale) {
  const t = translations[locale];

  const labels: Record<ProviderType, string> = {
    HOSPITAL: t.hospital,
    MEDICAL_CENTER: t.medicalCenter,
    PHARMACY: t.pharmacy,
    LAB: t.lab,
    CLINIC: t.clinic,
    PARTNER: t.partner,
    OTHER: t.other,
  };

  return labels[type];
}

function statusLabel(status: ProviderStatus, locale: Locale) {
  const t = translations[locale];

  const labels: Record<ProviderStatus, string> = {
    ACTIVE: t.active,
    INACTIVE: t.inactive,
    SUSPENDED: t.suspended,
    DRAFT: t.draft,
  };

  return labels[status];
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

export default function SystemProviderCreatePage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<FormState>(() => createInitialForm());
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState("");
  const [createdId, setCreatedId] = React.useState<number | null>(null);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const providerName =
    form.name.trim() ||
    form.name_ar.trim() ||
    form.name_en.trim();

  const requiredComplete = Boolean(providerName);

  const loginComplete =
    !form.create_login_user ||
    Boolean(
      form.login_username.trim() ||
        form.login_email.trim() ||
        form.email.trim() ||
        form.mobile.trim() ||
        form.phone.trim(),
    );

  const optionalComplete = Boolean(
    form.phone.trim() ||
      form.mobile.trim() ||
      form.email.trim() ||
      form.region.trim() ||
      form.city.trim() ||
      form.address.trim(),
  );

  const legalComplete = Boolean(
    form.commercial_registration.trim() || form.tax_number.trim(),
  );

  const networkComplete = Boolean(
    form.provider_type ||
      form.source_category.trim() ||
      form.external_reference.trim() ||
      form.import_source.trim(),
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

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FormState>;

        if (parsed && parsed.provider_type) {
          setForm({
            ...createInitialForm(),
            ...parsed,
            provider_type: parsed.provider_type as ProviderType,
            status: (parsed.status as ProviderStatus) || "ACTIVE",
            create_login_user:
              typeof parsed.create_login_user === "boolean"
                ? parsed.create_login_user
                : true,
          });
          setDirty(true);
          toast.success(t.draftLoaded);
        }
      }
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
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

  function updateNameField<T extends "name" | "name_ar" | "name_en">(
    key: T,
    value: string,
  ) {
    setForm((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      const nextName =
        next.name.trim() ||
        next.name_ar.trim() ||
        next.name_en.trim();

      if (!current.login_display_name) {
        next.login_display_name = nextName;
      }

      return next;
    });

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
    if (!requiredComplete) {
      toast.error(t.requiredName);
      return false;
    }

    if (!isValidEmail(form.email)) {
      toast.error(t.invalidEmail);
      return false;
    }

    if (form.create_login_user && form.login_email.trim() && !isValidEmail(form.login_email)) {
      toast.error(t.invalidLoginEmail);
      return false;
    }

    if (
      form.create_login_user &&
      form.login_password.trim() &&
      form.login_password.trim().length < 8
    ) {
      toast.error(t.shortPassword);
      return false;
    }

    return true;
  }

  async function submitProvider() {
    if (!validate()) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetchJson<ApiResponse>(makeApiUrl("/api/providers/create/"), {
        method: "POST",
        body: buildPayload(form),
      });

      const providerId = extractCreatedId(response);

      setCreatedId(providerId);
      setDirty(false);
      window.localStorage.removeItem(DRAFT_KEY);
      toast.success(t.saved);

      if (providerId) {
        router.push(`/system/providers/${providerId}`);
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

          <Button variant="outline" className="h-9 rounded-lg" onClick={saveDraft}>
            <Save className="h-4 w-4" />
            {t.saveDraft}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={clearForm}>
            <RotateCcw className="h-4 w-4" />
            {t.clear}
          </Button>

          <Button
            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
            disabled={saving}
            onClick={() => void submitProvider()}
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
              title={t.loginReadiness}
              value={loginComplete ? t.complete : t.incomplete}
              trend={form.create_login_user ? t.createLoginUser : t.no}
              icon={LockKeyhole}
            />

            <KpiCard
              title={t.legalReadiness}
              value={legalComplete ? t.complete : t.incomplete}
              trend={legalComplete ? t.complete : t.incomplete}
              icon={Landmark}
            />

            <KpiCard
              title={t.networkReadiness}
              value={networkComplete ? t.complete : t.incomplete}
              trend={providerTypeLabel(form.provider_type, locale)}
              icon={Layers3}
            />
          </div>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.basicInfo}</CardTitle>
                <CardDescription>{t.nameAr}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 md:col-span-2">
                  <FieldLabel>{t.nameAr}</FieldLabel>
                  <Input
                    value={form.name_ar}
                    onChange={(event) => updateNameField("name_ar", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.placeholderNameAr}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <FieldLabel>{t.nameEn}</FieldLabel>
                  <Input
                    value={form.name_en}
                    onChange={(event) => updateNameField("name_en", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.placeholderNameEn}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <FieldLabel>{t.name}</FieldLabel>
                  <Input
                    value={form.name}
                    onChange={(event) => updateNameField("name", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.name}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.code}</FieldLabel>
                  <Input
                    value={form.code}
                    onChange={(event) => updateForm("code", normalizeCode(event.target.value))}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.code}
                    disabled={saving}
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.featured}</FieldLabel>
                  <Select
                    value={form.is_featured ? "yes" : "no"}
                    onValueChange={(value) => updateForm("is_featured", value === "yes")}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">{t.yes}</SelectItem>
                      <SelectItem value="no">{t.no}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.type}</FieldLabel>
                  <Select
                    value={form.provider_type}
                    onValueChange={(value) => updateForm("provider_type", value as ProviderType)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOSPITAL">{t.hospital}</SelectItem>
                      <SelectItem value="MEDICAL_CENTER">{t.medicalCenter}</SelectItem>
                      <SelectItem value="PHARMACY">{t.pharmacy}</SelectItem>
                      <SelectItem value="LAB">{t.lab}</SelectItem>
                      <SelectItem value="CLINIC">{t.clinic}</SelectItem>
                      <SelectItem value="PARTNER">{t.partner}</SelectItem>
                      <SelectItem value="OTHER">{t.other}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.status}</FieldLabel>
                  <Select
                    value={form.status}
                    onValueChange={(value) => updateForm("status", value as ProviderStatus)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">{t.active}</SelectItem>
                      <SelectItem value="INACTIVE">{t.inactive}</SelectItem>
                      <SelectItem value="SUSPENDED">{t.suspended}</SelectItem>
                      <SelectItem value="DRAFT">{t.draft}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.loginInfo}</CardTitle>
                <CardDescription>{t.loginHint}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pb-6">
              <label className="flex items-start gap-3 rounded-lg border bg-background p-3">
                <Checkbox
                  checked={form.create_login_user}
                  onCheckedChange={(checked) => updateForm("create_login_user", Boolean(checked))}
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
                    onChange={(event) => updateForm("login_username", event.target.value.trim())}
                    className="h-10 rounded-lg bg-background"
                    disabled={saving || !form.create_login_user}
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.loginEmail}</FieldLabel>
                  <Input
                    value={form.login_email}
                    onChange={(event) => updateForm("login_email", event.target.value.trim())}
                    className="h-10 rounded-lg bg-background"
                    disabled={saving || !form.create_login_user}
                    placeholder={form.email}
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.loginDisplayName}</FieldLabel>
                  <Input
                    value={form.login_display_name}
                    onChange={(event) => updateForm("login_display_name", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    disabled={saving || !form.create_login_user}
                    placeholder={providerName}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.loginPassword}</FieldLabel>
                  <Input
                    type="password"
                    value={form.login_password}
                    onChange={(event) => updateForm("login_password", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    disabled={saving || !form.create_login_user}
                    placeholder={t.passwordHint}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.loginPhone}</FieldLabel>
                  <Input
                    value={form.login_phone}
                    onChange={(event) => updateForm("login_phone", normalizePhone(event.target.value))}
                    className="h-10 rounded-lg bg-background text-right tabular-nums"
                    disabled={saving || !form.create_login_user}
                    placeholder={form.mobile || form.phone}
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.loginWhatsapp}</FieldLabel>
                  <Input
                    value={form.login_whatsapp}
                    onChange={(event) => updateForm("login_whatsapp", normalizePhone(event.target.value))}
                    className="h-10 rounded-lg bg-background text-right tabular-nums"
                    disabled={saving || !form.create_login_user}
                    placeholder={form.mobile || form.phone}
                    dir="ltr"
                  />
                </div>

                <div className="md:col-span-2 xl:col-span-2">
                  <div className="flex h-full min-h-10 items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs leading-5 text-muted-foreground">
                      {t.passwordHint}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.contactInfo}</CardTitle>
                <CardDescription>{t.phone}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <FieldLabel>{t.phone}</FieldLabel>
                  <Input
                    value={form.phone}
                    onChange={(event) => {
                      const value = normalizePhone(event.target.value);
                      updateForm("phone", value);

                      if (!form.login_phone) updateForm("login_phone", value);
                      if (!form.login_whatsapp) updateForm("login_whatsapp", value);
                    }}
                    className="h-10 rounded-lg bg-background text-right tabular-nums"
                    placeholder={t.phone}
                    disabled={saving}
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.mobile}</FieldLabel>
                  <Input
                    value={form.mobile}
                    onChange={(event) => {
                      const value = normalizePhone(event.target.value);
                      updateForm("mobile", value);

                      if (!form.login_phone) updateForm("login_phone", value);
                      if (!form.login_whatsapp) updateForm("login_whatsapp", value);
                    }}
                    className="h-10 rounded-lg bg-background text-right tabular-nums"
                    placeholder={t.mobile}
                    disabled={saving}
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.email}</FieldLabel>
                  <Input
                    value={form.email}
                    onChange={(event) => {
                      updateForm("email", event.target.value);
                      if (!form.login_email) {
                        updateForm("login_email", event.target.value);
                      }
                    }}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.email}
                    disabled={saving}
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.website}</FieldLabel>
                  <Input
                    value={form.website}
                    onChange={(event) => updateForm("website", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.placeholderWebsite}
                    disabled={saving}
                    dir="ltr"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.addressInfo}</CardTitle>
                <CardDescription>{t.city}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <FieldLabel>{t.region}</FieldLabel>
                  <Input
                    value={form.region}
                    onChange={(event) => updateForm("region", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.region}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.area}</FieldLabel>
                  <Input
                    value={form.area}
                    onChange={(event) => updateForm("area", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.area}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.city}</FieldLabel>
                  <Input
                    value={form.city}
                    onChange={(event) => updateForm("city", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.city}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.district}</FieldLabel>
                  <Input
                    value={form.district}
                    onChange={(event) => updateForm("district", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.district}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.street}</FieldLabel>
                  <Input
                    value={form.street}
                    onChange={(event) => updateForm("street", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.street}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2 md:col-span-2 xl:col-span-3">
                  <FieldLabel>{t.address}</FieldLabel>
                  <Input
                    value={form.address}
                    onChange={(event) => updateForm("address", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.address}
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.legalInfo}</CardTitle>
                <CardDescription>{t.commercialRegistration}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <FieldLabel>{t.commercialRegistration}</FieldLabel>
                  <Input
                    value={form.commercial_registration}
                    onChange={(event) =>
                      updateForm("commercial_registration", toEnglishDigits(event.target.value))
                    }
                    className="h-10 rounded-lg bg-background text-right tabular-nums"
                    placeholder={t.commercialRegistration}
                    disabled={saving}
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.taxNumber}</FieldLabel>
                  <Input
                    value={form.tax_number}
                    onChange={(event) => updateForm("tax_number", toEnglishDigits(event.target.value))}
                    className="h-10 rounded-lg bg-background text-right tabular-nums"
                    placeholder={t.taxNumber}
                    disabled={saving}
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.sourceCategory}</FieldLabel>
                  <Input
                    value={form.source_category}
                    onChange={(event) => updateForm("source_category", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.sourceCategory}
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.externalReference}</FieldLabel>
                  <Input
                    value={form.external_reference}
                    onChange={(event) => updateForm("external_reference", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.externalReference}
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.networkInfo}</CardTitle>
                <CardDescription>{t.importSource}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>{t.importSource}</FieldLabel>
                  <Select
                    value={form.import_source ? "imported" : "manual"}
                    onValueChange={(value) => {
                      if (value === "manual") {
                        updateForm("import_source", "");
                        updateForm("source_category", "manual");
                        return;
                      }

                      updateForm("import_source", "network");
                      updateForm("source_category", "network");
                    }}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">{t.sourceManual}</SelectItem>
                      <SelectItem value="imported">{t.sourceImported}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.importSource}</FieldLabel>
                  <Input
                    value={form.import_source}
                    onChange={(event) => updateForm("import_source", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.importSource}
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.notesInfo}</CardTitle>
                <CardDescription>{t.notes}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={t.notes}
                disabled={saving}
              />
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
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 px-6 pb-6">
              <InfoRow label={t.nameAr} value={form.name_ar || "—"} />
              <InfoRow label={t.nameEn} value={form.name_en || "—"} />
              <InfoRow label={t.name} value={form.name || "—"} />
              <InfoRow label={t.type} value={providerTypeLabel(form.provider_type, locale)} />
              <InfoRow label={t.status} value={statusLabel(form.status, locale)} />
              <InfoRow label={t.city} value={form.city || "—"} />
              <InfoRow label={t.region} value={form.region || "—"} />
              <InfoRow label={t.phone} value={form.phone || form.mobile || "—"} />
              <InfoRow label={t.email} value={form.email || "—"} />
              <InfoRow
                label={t.loginInfo}
                value={
                  form.create_login_user
                    ? form.login_username ||
                      form.login_email ||
                      form.email ||
                      form.mobile ||
                      form.phone ||
                      t.createLoginUser
                    : t.no
                }
              />
              <InfoRow label={t.featured} value={form.is_featured ? t.yes : t.no} />

              <div className="grid gap-2 pt-4">
                <Button
                  className="h-10 rounded-lg bg-black text-white hover:bg-black/90"
                  disabled={saving}
                  onClick={() => void submitProvider()}
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
                    <Link href={`/system/providers/${createdId}`}>
                      <FileText className="h-4 w-4" />
                      {t.viewProvider}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.requiredFields}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {requiredComplete ? t.complete : t.incomplete}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <UserRound className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.loginReadiness}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {loginComplete ? t.complete : t.incomplete}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.addressInfo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.city || form.region || t.incomplete}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Landmark className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.legalReadiness}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {legalComplete ? t.complete : t.incomplete}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.featured}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.is_featured ? t.yes : t.no}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <img src={SAR_ICON} alt="" className="h-5 w-5 object-contain opacity-70" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">SAR</p>
                  <p className="truncate text-xs text-muted-foreground">
                    /currency/sar.svg
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