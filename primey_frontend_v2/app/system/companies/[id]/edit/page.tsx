"use client";

// V2-05I — System Company Edit
// Real contracts:
// GET   /api/system/companies/{id}/
// GET   /api/system/companies/options/
// PATCH /api/system/companies/{id}/update/
// company_code remains backend-owned and immutable.

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FileText,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  registerBrandButtonClass,
  registerOutlineButtonClass,
} from "@/components/ui/data-register";
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
import { API_PATHS } from "@/lib/api/endpoints";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

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

type LegacyActivityOption = {
  value: string;
  label: string;
};

type CompanyEditForm = {
  name: string;
  name_ar: string;
  name_en: string;
  company_code: string;
  activity_profile_id: string;
  commercial_registration: string;
  tax_number: string;
  email: string;
  phone: string;
  mobile: string;
  whatsapp_number: string;
  website: string;
  country: string;
  building_number: string;
  street_name: string;
  district: string;
  city: string;
  region: string;
  postal_code: string;
  short_address: string;
  address: string;
  notes: string;
};

const emptyForm: CompanyEditForm = {
  name: "",
  name_ar: "",
  name_en: "",
  company_code: "",
  activity_profile_id: "",
  commercial_registration: "",
  tax_number: "",
  email: "",
  phone: "",
  mobile: "",
  whatsapp_number: "",
  website: "",
  country: "Saudi Arabia",
  building_number: "",
  street_name: "",
  district: "",
  city: "",
  region: "",
  postal_code: "",
  short_address: "",
  address: "",
  notes: "",
};

const billingIdentityKeys: Array<keyof CompanyEditForm> = [
  "commercial_registration",
  "tax_number",
  "building_number",
  "street_name",
  "district",
  "city",
  "region",
  "postal_code",
  "short_address",
  "address",
];

const requiredBillingKeys: Array<keyof CompanyEditForm> = [
  "commercial_registration",
  "tax_number",
  "building_number",
  "street_name",
  "district",
  "city",
  "region",
  "postal_code",
];

const copy = {
  ar: {
    title: "تعديل بيانات الشركة",
    subtitle:
      "تحديث بيانات الشركة الأساسية والقانونية وبيانات التواصل والعنوان الوطني مع إبقاء كود الشركة محميًا من التعديل.",
    back: "العودة لتفاصيل الشركة",
    save: "حفظ التعديلات",
    saving: "جاري الحفظ...",
    reset: "إلغاء التغييرات",
    loadFailed: "تعذر تحميل بيانات الشركة.",
    optionsFailed: "تعذر تحميل خيارات الشركة.",
    saveSuccess: "تم تحديث بيانات الشركة بنجاح.",
    saveFailed: "تعذر تحديث بيانات الشركة.",
    noChanges: "لا توجد تغييرات للحفظ.",
    unsavedWarning: "لديك تغييرات غير محفوظة.",
    validationTitle: "راجع البيانات المطلوبة",
    nameRequired: "اسم الشركة مطلوب.",
    billingRequired:
      "عند تعديل البيانات القانونية أو العنوان الوطني يجب استكمال جميع الحقول المطلوبة.",
    billingEditNotice:
      "أنت تعدّل بيانات قانونية أو عنوانًا وطنيًا؛ يجب استكمال الحقول المطلوبة المعلّمة بنجمة قبل الحفظ.",
    emailInvalid: "صيغة البريد الإلكتروني غير صحيحة.",
    phoneInvalid: "أحد أرقام التواصل أقصر من الحد المطلوب.",

    basicInfo: "المعلومات الأساسية",
    basicInfoDesc: "اسم الشركة والنشاط. كود الشركة يولده النظام ولا يمكن تعديله.",
    legalInfo: "البيانات القانونية والضريبية",
    legalInfoDesc: "بيانات الهوية التجارية والضريبية المستخدمة في الفوترة.",
    contactInfo: "بيانات التواصل",
    contactInfoDesc: "البريد وأرقام التواصل والموقع الإلكتروني.",
    nationalAddress: "العنوان الوطني",
    nationalAddressDesc: "بيانات العنوان الوطني السعودي المستخدمة في المستندات والفوترة.",
    notesInfo: "الملاحظات",
    notesInfoDesc: "ملاحظات إدارية داخلية اختيارية.",

    name: "اسم الشركة",
    nameAr: "الاسم العربي",
    nameEn: "الاسم الإنجليزي",
    companyCode: "كود الشركة",
    codeHint: "كود الشركة يولده النظام ولا يمكن تعديله.",
    activity: "النشاط",
    activityPlaceholder: "اختر نشاط الشركة",
    commercialRegistration: "السجل التجاري",
    taxNumber: "الرقم الضريبي",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    mobile: "الجوال",
    whatsapp: "رقم واتساب",
    website: "الموقع الإلكتروني",
    country: "الدولة",
    buildingNumber: "رقم المبنى",
    streetName: "اسم الشارع",
    district: "الحي",
    city: "المدينة",
    region: "المنطقة",
    postalCode: "الرمز البريدي",
    shortAddress: "العنوان المختصر",
    address: "عنوان إضافي",
    notes: "ملاحظات",
  },
  en: {
    title: "Edit company",
    subtitle:
      "Update core, legal, contact, and national address data while keeping the backend-generated company code immutable.",
    back: "Back to company details",
    save: "Save changes",
    saving: "Saving...",
    reset: "Discard changes",
    loadFailed: "Could not load company data.",
    optionsFailed: "Could not load company options.",
    saveSuccess: "Company updated successfully.",
    saveFailed: "Could not update company.",
    noChanges: "There are no changes to save.",
    unsavedWarning: "You have unsaved changes.",
    validationTitle: "Review required data",
    nameRequired: "Company name is required.",
    billingRequired:
      "When legal or national-address data is edited, all required billing identity fields must be complete.",
    billingEditNotice:
      "You are editing legal or national-address data; complete all required fields marked with an asterisk before saving.",
    emailInvalid: "Email format is invalid.",
    phoneInvalid: "One of the contact numbers is too short.",

    basicInfo: "Basic information",
    basicInfoDesc: "Company name and activity. The company code is generated by the backend and is immutable.",
    legalInfo: "Legal and tax information",
    legalInfoDesc: "Commercial and tax identity used for billing.",
    contactInfo: "Contact details",
    contactInfoDesc: "Email, contact numbers, and website.",
    nationalAddress: "National address",
    nationalAddressDesc: "Saudi national address data used for documents and billing.",
    notesInfo: "Notes",
    notesInfoDesc: "Optional internal administrative notes.",

    name: "Company name",
    nameAr: "Arabic name",
    nameEn: "English name",
    companyCode: "Company code",
    codeHint: "The company code is generated by the backend and cannot be edited.",
    activity: "Activity",
    activityPlaceholder: "Select company activity",
    commercialRegistration: "Commercial registration",
    taxNumber: "Tax number",
    email: "Email",
    phone: "Phone",
    mobile: "Mobile",
    whatsapp: "WhatsApp number",
    website: "Website",
    country: "Country",
    buildingNumber: "Building number",
    streetName: "Street name",
    district: "District",
    city: "City",
    region: "Region",
    postalCode: "Postal code",
    shortAddress: "Short address",
    address: "Additional address",
    notes: "Notes",
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
  return window.localStorage.getItem("Mhamcloud-locale") === "en" ? "en" : "ar";
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

  const response = await fetch(makeApiUrl(API_PATHS.auth.csrf), {
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
      if (Array.isArray(value)) {
        return value.map((item) => normalizeText(item)).join(" ");
      }
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
  };
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(makeApiUrl(path), {
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    ...options,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options.headers || {}),
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
    throw new RequestError(
      details.message || `Request failed with status ${response.status}`,
      details.errors,
    );
  }

  return (payload || {}) as T;
}

function extractCompany(payload: unknown): ApiRecord {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  return asRecord(data.company || root.company || data || root);
}

function formFromCompany(payload: unknown): CompanyEditForm {
  const company = extractCompany(payload);
  const activityRef = asRecord(company.activity_profile_ref);

  return {
    name: normalizeText(company.name || company.display_name),
    name_ar: normalizeText(company.name_ar),
    name_en: normalizeText(company.name_en),
    company_code: normalizeText(company.company_code || company.code),
    activity_profile_id:
      normalizeText(company.activity_profile_ref_id) ||
      normalizeText(activityRef.id) ||
      (normalizeText(company.activity_profile)
        ? `legacy:${normalizeText(company.activity_profile).toUpperCase()}`
        : ""),
    commercial_registration: normalizeText(company.commercial_registration),
    tax_number: normalizeText(company.tax_number),
    email: normalizeText(company.email),
    phone: normalizeText(company.phone),
    mobile: normalizeText(company.mobile),
    whatsapp_number: normalizeText(company.whatsapp_number),
    website: normalizeText(company.website),
    country: normalizeText(company.country, "Saudi Arabia"),
    building_number: normalizeText(company.building_number),
    street_name: normalizeText(company.street_name),
    district: normalizeText(company.district),
    city: normalizeText(company.city),
    region: normalizeText(company.region),
    postal_code: normalizeText(company.postal_code),
    short_address: normalizeText(company.short_address),
    address: normalizeText(company.address),
    notes: normalizeText(company.notes),
  };
}

function activityProfileName(profile: ActivityProfileOption, locale: Locale) {
  return (
    normalizeText(profile.display_name) ||
    (locale === "ar"
      ? normalizeText(profile.name_ar)
      : normalizeText(profile.name_en)) ||
    normalizeText(profile.name) ||
    normalizeText(profile.code)
  );
}

function buildChangedPayload(
  current: CompanyEditForm,
  initial: CompanyEditForm,
): ApiRecord {
  const payload: ApiRecord = {};

  const simpleKeys: Array<keyof CompanyEditForm> = [
    "name",
    "name_ar",
    "name_en",
    "commercial_registration",
    "tax_number",
    "email",
    "phone",
    "mobile",
    "whatsapp_number",
    "website",
    "country",
    "building_number",
    "street_name",
    "district",
    "city",
    "region",
    "postal_code",
    "short_address",
    "address",
    "notes",
  ];

  for (const key of simpleKeys) {
    if (current[key] !== initial[key]) {
      payload[key] = current[key].trim();
    }
  }

  if (current.activity_profile_id !== initial.activity_profile_id) {
    if (current.activity_profile_id.startsWith("legacy:")) {
      payload.activity_profile = current.activity_profile_id.slice("legacy:".length);
    } else {
      payload.activity_profile_id = current.activity_profile_id
        ? Number(current.activity_profile_id)
        : "";
    }
  }

  return payload;
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <label className="text-sm font-medium text-foreground">{children}</label>
      {required ? (
        <span
          aria-hidden="true"
          className="text-sm font-semibold text-[#a57b3d]"
        >
          *
        </span>
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
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-28 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

export default function SystemCompanyEditPage() {
  const params = useParams();
  const router = useRouter();

  const companyId = React.useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] || "" : String(raw || "");
  }, [params]);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<CompanyEditForm>(emptyForm);
  const [initialForm, setInitialForm] =
    React.useState<CompanyEditForm>(emptyForm);
  const [activityProfiles, setActivityProfiles] = React.useState<
    ActivityProfileOption[]
  >([]);
  const [legacyActivities, setLegacyActivities] = React.useState<
    LegacyActivityOption[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const t = copy[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  const dirty = React.useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm],
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
    window.addEventListener("Mhamcloud-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("Mhamcloud-locale-changed", applyLocale);
    };
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

  const loadPage = React.useCallback(async () => {
    if (!companyId) {
      setError(t.loadFailed);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [companyPayload, optionsPayload] = await Promise.all([
        requestJson<unknown>(API_PATHS.systemCompanies.detail(companyId)),
        requestJson<unknown>(API_PATHS.systemCompanies.options),
      ]);

      const nextForm = formFromCompany(companyPayload);
      const optionsData = asRecord(asRecord(optionsPayload).data);
      const profiles = Array.isArray(optionsData.activity_profiles)
        ? optionsData.activity_profiles
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
            .filter((item) => Number.isFinite(item.id) && item.id > 0)
        : [];

      const legacy = Array.isArray(optionsData.legacy_activity_profiles)
        ? optionsData.legacy_activity_profiles
            .map((item) => asRecord(item))
            .map((item) => ({
              value: normalizeText(item.value).toUpperCase(),
              label: normalizeText(item.label),
            }))
            .filter((item) => Boolean(item.value))
        : [];

      setForm(nextForm);
      setInitialForm(nextForm);
      setActivityProfiles(profiles);
      setLegacyActivities(legacy);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : t.loadFailed;
      setError(message);
      toast.error(t.loadFailed, { description: message });
    } finally {
      setLoading(false);
    }
  }, [companyId, t.loadFailed]);

  React.useEffect(() => {
    void loadPage();
  }, [loadPage]);

  function updateField<Key extends keyof CompanyEditForm>(
    key: Key,
    value: CompanyEditForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const billingIdentityChanged = React.useMemo(
    () =>
      billingIdentityKeys.some((key) => form[key] !== initialForm[key]),
    [form, initialForm],
  );

  const validationErrors = React.useMemo(() => {
    const errors: string[] = [];

    if (!form.name.trim()) errors.push(t.nameRequired);

    if (billingIdentityChanged) {
      const missingBillingField = requiredBillingKeys.some(
        (key) => !form[key].trim(),
      );
      if (missingBillingField) errors.push(t.billingRequired);
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      errors.push(t.emailInvalid);
    }

    const contactValues = [
      form.phone,
      form.mobile,
      form.whatsapp_number,
    ].filter((value) => value.trim());

    if (
      contactValues.some(
        (value) => value.trim().replace(/\D/g, "").length < 8,
      )
    ) {
      errors.push(t.phoneInvalid);
    }

    return errors;
  }, [
    billingIdentityChanged,
    form,
    t.billingRequired,
    t.emailInvalid,
    t.nameRequired,
    t.phoneInvalid,
  ]);

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dirty) {
      toast.info(t.noChanges);
      return;
    }

    if (validationErrors.length) {
      toast.error(t.validationTitle, {
        description: validationErrors.join(" "),
      });
      return;
    }

    const payload = buildChangedPayload(form, initialForm);

    if (!Object.keys(payload).length) {
      toast.info(t.noChanges);
      return;
    }

    try {
      setSaving(true);

      const csrfToken = await ensureCsrfToken();
      const responsePayload = await requestJson<unknown>(
        API_PATHS.systemCompanies.update(companyId),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
          body: JSON.stringify(payload),
        },
      );

      const updatedForm = formFromCompany(responsePayload);
      setForm(updatedForm);
      setInitialForm(updatedForm);

      toast.success(t.saveSuccess);
      router.push(`/system/companies/${companyId}`);
      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : t.saveFailed;
      toast.error(t.saveFailed, { description: message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main dir={dir} className="w-full text-foreground">
        <Card>
          <CardContent className="flex min-h-44 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {locale === "ar"
              ? "جاري تحميل بيانات الشركة..."
              : "Loading company data..."}
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error) {
    return (
      <main dir={dir} className="w-full text-foreground">
        <Card className="mx-auto max-w-3xl border-destructive/30">
          <CardHeader>
            <CardTitle icon={ShieldCheck} iconPosition="opposite">
              {t.loadFailed}
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              className={registerBrandButtonClass}
              onClick={() => void loadPage()}
            >
              <RotateCcw className="h-4 w-4" />
              {locale === "ar" ? "إعادة المحاولة" : "Try again"}
            </Button>
            <Button asChild variant="outline" className={registerOutlineButtonClass}>
              <Link href={`/system/companies/${companyId}`}>
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {t.back}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main dir={dir} className="w-full space-y-4 text-foreground lg:space-y-6">
      <div className="w-full space-y-4 lg:space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
              {t.title}
            </h1>
            <p className="mt-1 hidden max-w-3xl text-sm text-muted-foreground lg:block">
              {t.subtitle}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild variant="outline" className={registerOutlineButtonClass}>
              <Link href={`/system/companies/${companyId}`}>
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {t.back}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className={registerOutlineButtonClass}
              disabled={!dirty || saving}
              onClick={() => setForm(initialForm)}
            >
              <RotateCcw className="h-4 w-4" />
              {t.reset}
            </Button>
            <Button
              type="submit"
              form="company-edit-form"
              className={registerBrandButtonClass}
              disabled={!dirty || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? t.saving : t.save}
            </Button>
          </div>
        </header>

        <form
          id="company-edit-form"
          onSubmit={submitForm}
          className="space-y-4 lg:space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle icon={Building2} iconPosition="opposite">
                {t.basicInfo}
              </CardTitle>
              <CardDescription>{t.basicInfoDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel required>{t.name}</FieldLabel>
                <Input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className="h-11 rounded-lg"
                  autoComplete="organization"
                />
              </div>

              <div>
                <FieldLabel>{t.companyCode}</FieldLabel>
                <div className="flex h-11 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-[#a57b3d]" />
                  <span className="font-mono">{form.company_code || "—"}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t.codeHint}</p>
              </div>

              <div>
                <FieldLabel>{t.nameAr}</FieldLabel>
                <Input
                  value={form.name_ar}
                  onChange={(event) => updateField("name_ar", event.target.value)}
                  className="h-11 rounded-lg"
                />
              </div>

              <div>
                <FieldLabel>{t.nameEn}</FieldLabel>
                <Input
                  value={form.name_en}
                  onChange={(event) => updateField("name_en", event.target.value)}
                  className="h-11 rounded-lg"
                  dir="ltr"
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>{t.activity}</FieldLabel>
                <Select
                  value={form.activity_profile_id}
                  onValueChange={(value) =>
                    updateField("activity_profile_id", value)
                  }
                >
                  <SelectTrigger className="h-11 rounded-lg bg-background">
                    <SelectValue placeholder={t.activityPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {activityProfiles.map((profile) => (
                      <SelectItem key={`profile-${profile.id}`} value={String(profile.id)}>
                        {activityProfileName(profile, locale)}
                      </SelectItem>
                    ))}
                    {legacyActivities.map((option) => (
                      <SelectItem
                        key={`legacy-${option.value}`}
                        value={`legacy:${option.value}`}
                      >
                        {locale === "ar"
                          ? `نشاط قديم — ${option.label || option.value}`
                          : `Legacy — ${option.label || option.value}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={ShieldCheck} iconPosition="opposite">
                {t.legalInfo}
              </CardTitle>
              <CardDescription>{t.legalInfoDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel required={billingIdentityChanged}>{t.commercialRegistration}</FieldLabel>
                <Input
                  value={form.commercial_registration}
                  onChange={(event) =>
                    updateField("commercial_registration", event.target.value)
                  }
                  className="h-11 rounded-lg"
                  dir="ltr"
                />
              </div>
              <div>
                <FieldLabel required={billingIdentityChanged}>{t.taxNumber}</FieldLabel>
                <Input
                  value={form.tax_number}
                  onChange={(event) =>
                    updateField("tax_number", event.target.value)
                  }
                  className="h-11 rounded-lg"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={Mail} iconPosition="opposite">
                {t.contactInfo}
              </CardTitle>
              <CardDescription>{t.contactInfoDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>{t.email}</FieldLabel>
                <Input
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className="h-11 rounded-lg"
                  dir="ltr"
                  inputMode="email"
                  autoComplete="email"
                />
              </div>
              <div>
                <FieldLabel>{t.phone}</FieldLabel>
                <Input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  className="h-11 rounded-lg"
                  dir="ltr"
                  inputMode="tel"
                />
              </div>
              <div>
                <FieldLabel>{t.mobile}</FieldLabel>
                <Input
                  value={form.mobile}
                  onChange={(event) => updateField("mobile", event.target.value)}
                  className="h-11 rounded-lg"
                  dir="ltr"
                  inputMode="tel"
                />
              </div>
              <div>
                <FieldLabel>{t.whatsapp}</FieldLabel>
                <Input
                  value={form.whatsapp_number}
                  onChange={(event) =>
                    updateField("whatsapp_number", event.target.value)
                  }
                  className="h-11 rounded-lg"
                  dir="ltr"
                  inputMode="tel"
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>{t.website}</FieldLabel>
                <div className="relative">
                  <Globe2 className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={form.website}
                    onChange={(event) =>
                      updateField("website", event.target.value)
                    }
                    className="h-11 rounded-lg ps-9"
                    dir="ltr"
                    inputMode="url"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={MapPin} iconPosition="opposite">
                {t.nationalAddress}
              </CardTitle>
              <CardDescription>{t.nationalAddressDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div>
                <FieldLabel>{t.country}</FieldLabel>
                <Input
                  value={form.country}
                  onChange={(event) => updateField("country", event.target.value)}
                  className="h-11 rounded-lg"
                />
              </div>
              <div>
                <FieldLabel required={billingIdentityChanged}>{t.buildingNumber}</FieldLabel>
                <Input
                  value={form.building_number}
                  onChange={(event) =>
                    updateField("building_number", event.target.value)
                  }
                  className="h-11 rounded-lg"
                  dir="ltr"
                />
              </div>
              <div>
                <FieldLabel required={billingIdentityChanged}>{t.streetName}</FieldLabel>
                <Input
                  value={form.street_name}
                  onChange={(event) =>
                    updateField("street_name", event.target.value)
                  }
                  className="h-11 rounded-lg"
                />
              </div>
              <div>
                <FieldLabel required={billingIdentityChanged}>{t.district}</FieldLabel>
                <Input
                  value={form.district}
                  onChange={(event) =>
                    updateField("district", event.target.value)
                  }
                  className="h-11 rounded-lg"
                />
              </div>
              <div>
                <FieldLabel required={billingIdentityChanged}>{t.city}</FieldLabel>
                <Input
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  className="h-11 rounded-lg"
                />
              </div>
              <div>
                <FieldLabel required={billingIdentityChanged}>{t.region}</FieldLabel>
                <Input
                  value={form.region}
                  onChange={(event) => updateField("region", event.target.value)}
                  className="h-11 rounded-lg"
                />
              </div>
              <div>
                <FieldLabel required={billingIdentityChanged}>{t.postalCode}</FieldLabel>
                <Input
                  value={form.postal_code}
                  onChange={(event) =>
                    updateField("postal_code", event.target.value)
                  }
                  className="h-11 rounded-lg"
                  dir="ltr"
                />
              </div>
              <div>
                <FieldLabel>{t.shortAddress}</FieldLabel>
                <Input
                  value={form.short_address}
                  onChange={(event) =>
                    updateField(
                      "short_address",
                      event.target.value.toUpperCase(),
                    )
                  }
                  className="h-11 rounded-lg"
                  dir="ltr"
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>{t.address}</FieldLabel>
                <TextAreaField
                  value={form.address}
                  onChange={(value) => updateField("address", value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={FileText} iconPosition="opposite">
                {t.notesInfo}
              </CardTitle>
              <CardDescription>{t.notesInfoDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldLabel>{t.notes}</FieldLabel>
              <TextAreaField
                value={form.notes}
                onChange={(value) => updateField("notes", value)}
              />
            </CardContent>
          </Card>

          {billingIdentityChanged ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t.billingEditNotice}
            </div>
          ) : null}

          {validationErrors.length ? (
            <Card className="border-amber-200">
              <CardContent className="py-4">
                <p className="text-sm font-semibold text-amber-900">
                  {t.validationTitle}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">
                  {validationErrors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className={registerOutlineButtonClass}
              disabled={!dirty || saving}
              onClick={() => setForm(initialForm)}
            >
              <RotateCcw className="h-4 w-4" />
              {t.reset}
            </Button>
            <Button
              type="submit"
              className={registerBrandButtonClass}
              disabled={!dirty || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
              {saving ? t.saving : t.save}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
