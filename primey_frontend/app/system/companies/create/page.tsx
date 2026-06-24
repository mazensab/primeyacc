"use client";

/* ============================================================
   📂 primey_frontend/app/system/companies/create/page.tsx
   🏢 PrimeyAcc — Create System Company
   ------------------------------------------------------------
   ✅ Premium PrimeyCare form pattern adapted for PrimeyAcc
   ✅ Real API only: POST /api/system/companies/create/
   ✅ CSRF/session auth with credentials include
   ✅ Validation before submit
   ✅ Local draft save/restore
   ✅ Unsaved changes protection
   ✅ sonner toast
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
  UserRound,
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
type CompanyStatus = "active" | "inactive" | "trial" | "pending" | "suspended";
type DraftKey = "primeyacc-system-company-create-draft";

type CompanyForm = {
  name: string;
  code: string;
  owner_name: string;
  email: string;
  phone: string;
  city: string;
  activity_profile: string;
  subscription_status: string;
  status: CompanyStatus;
  notes: string;
};

const API_ENDPOINT = "/api/system/companies/create/";
const CSRF_ENDPOINT = "/api/auth/csrf";
const DRAFT_KEY: DraftKey = "primeyacc-system-company-create-draft";

const initialForm: CompanyForm = {
  name: "",
  code: "",
  owner_name: "",
  email: "",
  phone: "",
  city: "",
  activity_profile: "",
  subscription_status: "",
  status: "active",
  notes: "",
};

const translations = {
  ar: {
    title: "إضافة شركة",
    subtitle:
      "إنشاء شركة جديدة داخل منصة PrimeyAcc وربط بياناتها الأساسية بالنظام. سيتم إرسال البيانات إلى API الحقيقي فقط.",
    badge: "إدارة المنصة",
    backToCompanies: "العودة للشركات",
    companiesList: "قائمة الشركات",
    reportsTitle: "تقارير الشركات",
    systemDashboard: "لوحة النظام",
    save: "حفظ الشركة",
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
    csrfFailed: "تعذر تجهيز رمز الحماية CSRF.",
    unsavedWarning: "لديك تغييرات غير محفوظة.",

    basicInfo: "المعلومات الأساسية",
    basicInfoDesc: "اسم الشركة والكود والحالة والنشاط.",
    contactInfo: "بيانات التواصل",
    contactInfoDesc: "بيانات المالك والتواصل والعنوان المختصر.",
    subscriptionInfo: "الاشتراك والملاحظات",
    subscriptionInfoDesc: "حالة الاشتراك وأي ملاحظات إدارية داخلية.",
    readiness: "جاهزية النموذج",
    readinessDesc: "متابعة اكتمال البيانات قبل الإرسال.",
    quickLinks: "روابط سريعة",
    quickLinksDesc: "تنقل سريع داخل وحدة الشركات.",

    name: "اسم الشركة",
    namePlaceholder: "مثال: شركة تجريبية",
    code: "كود الشركة",
    codePlaceholder: "مثال: TEST-001",
    ownerName: "اسم المالك",
    ownerNamePlaceholder: "مثال: admin",
    email: "البريد الإلكتروني",
    emailPlaceholder: "company@example.com",
    phone: "رقم الجوال",
    phonePlaceholder: "05xxxxxxxx",
    city: "المدينة",
    cityPlaceholder: "مثال: Jeddah",
    activity: "النشاط",
    activityPlaceholder: "مثال: RETAIL",
    subscription: "حالة الاشتراك",
    subscriptionPlaceholder: "مثال: ACTIVE",
    status: "حالة الشركة",
    notes: "ملاحظات",
    notesPlaceholder: "ملاحظات داخلية اختيارية عن الشركة...",

    active: "نشط",
    inactive: "غير نشط",
    trial: "تجريبي",
    pending: "معلق",
    suspended: "موقوف",

    required: "مطلوب",
    optional: "اختياري",
    completedFields: "حقول مكتملة",
    requiredFields: "حقول مطلوبة",
    readyToSubmit: "جاهز للإرسال",
    notReady: "غير مكتمل",
    apiHint: "سيتم استخدام Session + CSRF وإرسال الطلب إلى /api/system/companies/create/.",
    noFakeData: "لا توجد بيانات وهمية أو localhost hardcoding.",
    afterSaveHint: "بعد الإنشاء سيتم فتح صفحة التفاصيل إذا أعاد API رقم الشركة وإلا سيتم فتح قائمة الشركات.",

    nameRequired: "اسم الشركة مطلوب.",
    codeRequired: "كود الشركة مطلوب.",
    emailInvalid: "صيغة البريد الإلكتروني غير صحيحة.",
    phoneInvalid: "رقم الجوال قصير جدا.",
  },
  en: {
    title: "Add company",
    subtitle:
      "Create a new company inside PrimeyAcc and connect its core data to the platform. Data is sent to the real API only.",
    badge: "Platform management",
    backToCompanies: "Back to companies",
    companiesList: "Companies list",
    reportsTitle: "Companies reports",
    systemDashboard: "System dashboard",
    save: "Save company",
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
    csrfFailed: "Could not prepare CSRF protection.",
    unsavedWarning: "You have unsaved changes.",

    basicInfo: "Basic information",
    basicInfoDesc: "Company name, code, status, and activity.",
    contactInfo: "Contact details",
    contactInfoDesc: "Owner, contact, and short address data.",
    subscriptionInfo: "Subscription and notes",
    subscriptionInfoDesc: "Subscription status and internal admin notes.",
    readiness: "Form readiness",
    readinessDesc: "Track data completion before submission.",
    quickLinks: "Quick links",
    quickLinksDesc: "Quick navigation inside the companies module.",

    name: "Company name",
    namePlaceholder: "Example: Demo Company",
    code: "Company code",
    codePlaceholder: "Example: TEST-001",
    ownerName: "Owner name",
    ownerNamePlaceholder: "Example: admin",
    email: "Email",
    emailPlaceholder: "company@example.com",
    phone: "Phone",
    phonePlaceholder: "05xxxxxxxx",
    city: "City",
    cityPlaceholder: "Example: Jeddah",
    activity: "Activity",
    activityPlaceholder: "Example: RETAIL",
    subscription: "Subscription status",
    subscriptionPlaceholder: "Example: ACTIVE",
    status: "Company status",
    notes: "Notes",
    notesPlaceholder: "Optional internal notes about the company...",

    active: "Active",
    inactive: "Inactive",
    trial: "Trial",
    pending: "Pending",
    suspended: "Suspended",

    required: "Required",
    optional: "Optional",
    completedFields: "Completed fields",
    requiredFields: "Required fields",
    readyToSubmit: "Ready to submit",
    notReady: "Incomplete",
    apiHint: "Session + CSRF will be used and the request is sent to /api/system/companies/create/.",
    noFakeData: "No fake data or localhost hardcoding.",
    afterSaveHint: "After creation, details will open if the API returns an ID; otherwise the list opens.",

    nameRequired: "Company name is required.",
    codeRequired: "Company code is required.",
    emailInvalid: "Email format is invalid.",
    phoneInvalid: "Phone number is too short.",
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
  return String(value).trim() || fallback;
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
    const record = asRecord(payload);
    const message =
      normalizeText(record.message) ||
      normalizeText(record.detail) ||
      normalizeText(record.error) ||
      normalizeText(record.non_field_errors) ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (payload || {}) as T;
}

function extractCreatedId(payload: unknown) {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const resultRecord = asRecord(record.result);

  return normalizeText(
    record.id ||
      record.uuid ||
      record.pk ||
      dataRecord.id ||
      dataRecord.uuid ||
      dataRecord.pk ||
      resultRecord.id ||
      resultRecord.uuid ||
      resultRecord.pk,
  );
}

function buildPayload(form: CompanyForm): ApiRecord {
  const payload: ApiRecord = {
    name: form.name.trim(),
    code: form.code.trim(),
    status: form.status,
  };

  if (form.owner_name.trim()) payload.owner_name = form.owner_name.trim();
  if (form.email.trim()) payload.email = form.email.trim();
  if (form.phone.trim()) payload.phone = form.phone.trim();
  if (form.city.trim()) payload.city = form.city.trim();
  if (form.activity_profile.trim()) payload.activity_profile = form.activity_profile.trim();
  if (form.subscription_status.trim()) payload.subscription_status = form.subscription_status.trim();
  if (form.notes.trim()) payload.notes = form.notes.trim();

  return payload;
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
  const [submitting, setSubmitting] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [draftAvailable, setDraftAvailable] = React.useState(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const backIcon = locale === "ar" ? ChevronLeft : ArrowRight;

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
    if (!form.code.trim()) errors.push(t.codeRequired);

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.push(t.emailInvalid);
    }

    if (form.phone.trim() && form.phone.trim().replace(/\D/g, "").length < 8) {
      errors.push(t.phoneInvalid);
    }

    return errors;
  }, [form.code, form.email, form.name, form.phone, t.codeRequired, t.emailInvalid, t.nameRequired, t.phoneInvalid]);

  const completedFields = React.useMemo(() => {
    return Object.values(form).filter((value) => String(value).trim()).length;
  }, [form]);

  const isReady = validationErrors.length === 0;

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
      const parsed = JSON.parse(rawDraft) as Partial<CompanyForm>;
      setForm({
        ...initialForm,
        ...parsed,
        status: ["active", "inactive", "trial", "pending", "suspended"].includes(String(parsed.status))
          ? (parsed.status as CompanyStatus)
          : "active",
      });
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
                  <FieldLabel required>{t.code}</FieldLabel>
                  <Input
                    value={form.code}
                    onChange={(event) => updateField("code", event.target.value.toUpperCase())}
                    placeholder={t.codePlaceholder}
                    className="h-11 rounded-xl font-mono"
                    dir="ltr"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <FieldLabel>{t.activity}</FieldLabel>
                  <Input
                    value={form.activity_profile}
                    onChange={(event) => updateField("activity_profile", event.target.value.toUpperCase())}
                    placeholder={t.activityPlaceholder}
                    className="h-11 rounded-xl"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <FieldLabel>{t.status}</FieldLabel>
                  <Select value={form.status} onValueChange={(value) => updateField("status", value as CompanyStatus)}>
                    <SelectTrigger className="h-11 rounded-xl bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t.active}</SelectItem>
                      <SelectItem value="inactive">{t.inactive}</SelectItem>
                      <SelectItem value="trial">{t.trial}</SelectItem>
                      <SelectItem value="pending">{t.pending}</SelectItem>
                      <SelectItem value="suspended">{t.suspended}</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <FieldLabel>{t.ownerName}</FieldLabel>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={form.owner_name}
                      onChange={(event) => updateField("owner_name", event.target.value)}
                      placeholder={t.ownerNamePlaceholder}
                      className="h-11 rounded-xl ps-9"
                      autoComplete="name"
                    />
                  </div>
                </div>

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
                  <FieldLabel>{t.city}</FieldLabel>
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
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.subscriptionInfo}</CardTitle>
                <CardDescription>{t.subscriptionInfoDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <div>
                  <FieldLabel>{t.subscription}</FieldLabel>
                  <Input
                    value={form.subscription_status}
                    onChange={(event) => updateField("subscription_status", event.target.value.toUpperCase())}
                    placeholder={t.subscriptionPlaceholder}
                    className="h-11 rounded-xl"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <FieldLabel>{t.notes}</FieldLabel>
                  <TextAreaField
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder={t.notesPlaceholder}
                  />
                </div>
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
                      style={{ width: `${Math.min(100, Math.round((completedFields / Object.keys(initialForm).length) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {form.name.trim() ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <CircleAlert className="h-4 w-4 text-amber-600" />
                    )}
                    <span>{t.name}</span>
                    <Badge variant="outline" className="ms-auto rounded-full">
                      {t.required}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    {form.code.trim() ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <CircleAlert className="h-4 w-4 text-amber-600" />
                    )}
                    <span>{t.code}</span>
                    <Badge variant="outline" className="ms-auto rounded-full">
                      {t.required}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
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




