"use client";

/* ============================================================
   📂 primey_frontend/app/system/brokers/create/page.tsx
   🤝 Primey Care — Create Broker Page V1
   ------------------------------------------------------------
   ✅ Approved Premium form pattern
   ✅ Real API only: POST /api/agents/brokers/create/
   ✅ Uses correct Broker defaults:
      revenue_recognition_mode = GROSS_SALE
      settlement_mode = AGENT_WITH_BROKER_SUMMARY
   ✅ Main form + side readiness summary
   ✅ Local draft protection
   ✅ sonner toast
   ✅ SAR icon from /currency/sar.svg
   ✅ Arabic/English via primey-locale
   ✅ No localhost / no fake data
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Banknote,
  Building2,
  CheckCircle2,
  FileText,
  Landmark,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  WalletCards,
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

type BrokerStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DRAFT";
type CommissionType = "PERCENTAGE" | "FIXED";
type RevenueRecognitionMode = "GROSS_SALE";
type SettlementMode = "AGENT_WITH_BROKER_SUMMARY";

type FormState = {
  name: string;
  broker_code: string;
  referral_code: string;
  status: BrokerStatus;

  phone: string;
  email: string;
  city: string;
  address: string;

  default_commission_type: CommissionType;
  default_commission_value: string;

  revenue_recognition_mode: RevenueRecognitionMode;
  settlement_mode: SettlementMode;

  bank_name: string;
  bank_account_name: string;
  iban: string;

  notes: string;
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  item?: unknown;
  broker?: unknown;
  id?: number;
};

const SAR_ICON = "/currency/sar.svg";
const DRAFT_KEY = "primey-care.broker-create.v1.draft";

const INITIAL_FORM: FormState = {
  name: "",
  broker_code: "",
  referral_code: "",
  status: "ACTIVE",

  phone: "",
  email: "",
  city: "",
  address: "",

  default_commission_type: "PERCENTAGE",
  default_commission_value: "5",

  revenue_recognition_mode: "GROSS_SALE",
  settlement_mode: "AGENT_WITH_BROKER_SUMMARY",

  bank_name: "",
  bank_account_name: "",
  iban: "",

  notes: "",
};

const translations = {
  ar: {
    title: "إنشاء وسيط / وكيل",
    subtitle:
      "إضافة وسيط جديد ليتم ربطه بالمندوبين، مع كود إحالة، إعدادات عمولة، وبيانات مالية وبنكية.",
    back: "رجوع",
    saveDraft: "حفظ مسودة",
    clear: "مسح",
    submit: "حفظ الوسيط",
    saving: "جاري الحفظ",

    basicInfo: "بيانات الوسيط",
    contactInfo: "بيانات التواصل",
    commissionInfo: "إعدادات العمولة",
    financialInfo: "الإعدادات المالية",
    bankInfo: "البيانات البنكية",
    notesInfo: "الملاحظات",

    name: "اسم الوسيط",
    brokerCode: "كود الوسيط",
    referralCode: "كود الإحالة",
    generateCodes: "توليد الأكواد",
    status: "الحالة",
    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    draft: "مسودة",

    phone: "الجوال",
    email: "البريد الإلكتروني",
    city: "المدينة",
    address: "العنوان",

    commissionType: "نوع العمولة",
    percentage: "نسبة",
    fixed: "مبلغ ثابت",
    commissionValue: "قيمة العمولة",

    revenueRecognitionMode: "طريقة إثبات الإيراد",
    grossSale: "إجمالي البيع",
    settlementMode: "طريقة التسوية",
    agentWithBrokerSummary: "مندوب مع ملخص وسيط",

    bankName: "اسم البنك",
    bankAccountName: "اسم صاحب الحساب",
    iban: "الآيبان",
    notes: "ملاحظات",

    summary: "ملخص الوسيط",
    readiness: "جاهزية البيانات",
    complete: "مكتمل",
    incomplete: "غير مكتمل",
    requiredFields: "الحقول المطلوبة",
    optionalFields: "الحقول الاختيارية",

    financialReady: "جاهز للربط المالي",
    financialReadyDesc:
      "هذه البيانات ستستخدم لاحقًا في ربط الوسطاء بالمندوبين، احتساب حصة الوسيط، وملخصات التسوية.",

    requiredName: "اسم الوسيط مطلوب.",
    invalidEmail: "صيغة البريد الإلكتروني غير صحيحة.",
    invalidCommission: "قيمة العمولة يجب أن تكون رقمًا صحيحًا.",
    invalidPercentage: "نسبة العمولة يجب أن تكون بين 0 و 100.",

    saved: "تم إنشاء الوسيط بنجاح.",
    draftSaved: "تم حفظ المسودة محليًا.",
    draftLoaded: "تم استعادة المسودة.",
    cleared: "تم مسح النموذج.",
    errorTitle: "تعذر تنفيذ العملية",
    submitError: "تعذر إنشاء الوسيط.",
    confirmClear: "هل تريد مسح النموذج الحالي؟",
    unsaved: "لديك تغييرات غير محفوظة.",
    viewBroker: "فتح الوسيط",

    codePreview: "معاينة الكود",
    commissionPreview: "معاينة العمولة",
    estimatedCommission: "عمولة متوقعة على 200",
  },
  en: {
    title: "Create Broker",
    subtitle:
      "Add a new broker to link with agents, including referral code, commission settings, and financial/bank data.",
    back: "Back",
    saveDraft: "Save draft",
    clear: "Clear",
    submit: "Save broker",
    saving: "Saving",

    basicInfo: "Broker info",
    contactInfo: "Contact info",
    commissionInfo: "Commission settings",
    financialInfo: "Financial settings",
    bankInfo: "Bank info",
    notesInfo: "Notes",

    name: "Broker name",
    brokerCode: "Broker code",
    referralCode: "Referral code",
    generateCodes: "Generate codes",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    draft: "Draft",

    phone: "Phone",
    email: "Email",
    city: "City",
    address: "Address",

    commissionType: "Commission type",
    percentage: "Percentage",
    fixed: "Fixed amount",
    commissionValue: "Commission value",

    revenueRecognitionMode: "Revenue recognition",
    grossSale: "Gross sale",
    settlementMode: "Settlement mode",
    agentWithBrokerSummary: "Agent with broker summary",

    bankName: "Bank name",
    bankAccountName: "Account holder",
    iban: "IBAN",
    notes: "Notes",

    summary: "Broker summary",
    readiness: "Data readiness",
    complete: "Complete",
    incomplete: "Incomplete",
    requiredFields: "Required fields",
    optionalFields: "Optional fields",

    financialReady: "Financial-ready",
    financialReadyDesc:
      "These values will be used later for broker-agent linking, broker share calculation, and settlement summaries.",

    requiredName: "Broker name is required.",
    invalidEmail: "Email format is invalid.",
    invalidCommission: "Commission value must be a valid number.",
    invalidPercentage: "Commission percentage must be between 0 and 100.",

    saved: "Broker created successfully.",
    draftSaved: "Draft saved locally.",
    draftLoaded: "Draft restored.",
    cleared: "Form cleared.",
    errorTitle: "Unable to complete operation",
    submitError: "Unable to create broker.",
    confirmClear: "Do you want to clear the current form?",
    unsaved: "You have unsaved changes.",
    viewBroker: "Open broker",

    codePreview: "Code preview",
    commissionPreview: "Commission preview",
    estimatedCommission: "Estimated commission on 200",
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

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
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

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function generateCode(prefix: string) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}

function validateEmail(value: string) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function extractCreatedBrokerId(payload: ApiResponse) {
  const data = asRecord(payload.data);
  const item = asRecord(payload.item);
  const broker = asRecord(payload.broker);

  return toNumber(
    data.id ||
      asRecord(data.broker).id ||
      item.id ||
      broker.id ||
      payload.id,
  );
}

function buildPayload(form: FormState) {
  return {
    name: normalizeText(form.name),
    full_name: normalizeText(form.name),
    broker_name: normalizeText(form.name),

    broker_code: normalizeText(form.broker_code),
    code: normalizeText(form.broker_code),

    referral_code: normalizeText(form.referral_code),
    ref_code: normalizeText(form.referral_code),

    status: form.status,

    phone: normalizeText(form.phone),
    phone_number: normalizeText(form.phone),
    email: normalizeText(form.email),
    city: normalizeText(form.city),
    address: normalizeText(form.address),

    default_commission_type: form.default_commission_type,
    commission_type: form.default_commission_type,
    default_commission_value: toNumber(form.default_commission_value).toFixed(2),
    commission_value: toNumber(form.default_commission_value).toFixed(2),

    revenue_recognition_mode: form.revenue_recognition_mode,
    settlement_mode: form.settlement_mode,

    bank_name: normalizeText(form.bank_name),
    bank_account_name: normalizeText(form.bank_account_name),
    iban: normalizeText(form.iban).replace(/\s+/g, "").toUpperCase(),

    notes: normalizeText(form.notes),

    metadata: {
      source: "frontend_broker_create",
      financial_ready: true,
    },
  };
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

function SarIcon({ className }: { className?: string }) {
  return (
    <Image
      src={SAR_ICON}
      alt="SAR"
      width={14}
      height={14}
      className={cn("inline-block h-3.5 w-3.5 object-contain", className)}
      unoptimized
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

function FieldBlock({
  label,
  children,
  description,
  required,
}: {
  label: string;
  children: React.ReactNode;
  description?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2 text-start">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {description ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function ReadinessItem({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {ready ? (
        <Badge
          variant="outline"
          className="rounded-full border-emerald-500/30 bg-emerald-50 text-emerald-700"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="rounded-full border-amber-500/30 bg-amber-50 text-amber-700"
        >
          <TriangleAlert className="h-3.5 w-3.5" />
        </Badge>
      )}
    </div>
  );
}

export default function CreateBrokerPage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM);
  const [saving, setSaving] = React.useState(false);
  const [createdBrokerId, setCreatedBrokerId] = React.useState<number | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const commissionValue = toNumber(form.default_commission_value);
  const estimatedCommission =
    form.default_commission_type === "PERCENTAGE"
      ? (200 * commissionValue) / 100
      : commissionValue;

  React.useEffect(() => {
    const applyLocale = () => setLocale(getInitialLocale());

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
      const savedDraft = window.localStorage.getItem(DRAFT_KEY);

      if (!savedDraft) return;

      const parsed = JSON.parse(savedDraft) as Partial<FormState>;

      setForm((current) => ({
        ...current,
        ...parsed,
        status: (parsed.status || current.status) as BrokerStatus,
        default_commission_type: (parsed.default_commission_type ||
          current.default_commission_type) as CommissionType,
        revenue_recognition_mode: "GROSS_SALE",
        settlement_mode: "AGENT_WITH_BROKER_SUMMARY",
      }));

      toast.info(t.draftLoaded);
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, [t.draftLoaded]);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || saving) return;

      event.preventDefault();
      event.returnValue = t.unsaved;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty, saving, t.unsaved]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setDirty(true);
    setError("");
  }

  function saveDraft() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    toast.success(t.draftSaved);
  }

  function clearForm() {
    if (!window.confirm(t.confirmClear)) return;

    setForm(INITIAL_FORM);
    setDirty(false);
    setCreatedBrokerId(null);
    setError("");
    window.localStorage.removeItem(DRAFT_KEY);
    toast.success(t.cleared);
  }

  function generateCodes() {
    const brokerCode = form.broker_code || generateCode("BRK");
    const referralCode = form.referral_code || generateCode("REF-BRK");

    setForm((current) => ({
      ...current,
      broker_code: brokerCode,
      referral_code: referralCode,
    }));
    setDirty(true);
  }

  function validateForm() {
    const name = normalizeText(form.name);
    const email = normalizeText(form.email);
    const commission = toNumber(form.default_commission_value, Number.NaN);

    if (!name) return t.requiredName;
    if (!validateEmail(email)) return t.invalidEmail;

    if (!Number.isFinite(commission) || commission < 0) {
      return t.invalidCommission;
    }

    if (
      form.default_commission_type === "PERCENTAGE" &&
      (commission < 0 || commission > 100)
    ) {
      return t.invalidPercentage;
    }

    return "";
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await postJson<ApiResponse>(
        makeApiUrl("/api/agents/brokers/create/"),
        buildPayload(form),
      );

      const brokerId = extractCreatedBrokerId(response);

      setCreatedBrokerId(brokerId || null);
      setDirty(false);
      window.localStorage.removeItem(DRAFT_KEY);
      toast.success(t.saved);

      if (brokerId) {
        router.push(`/system/brokers/${brokerId}`);
      } else {
        router.push("/system/brokers");
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

  const requiredReady = Boolean(normalizeText(form.name));
  const codesReady =
    Boolean(normalizeText(form.broker_code)) &&
    Boolean(normalizeText(form.referral_code));
  const commissionReady =
    Number.isFinite(commissionValue) &&
    commissionValue >= 0 &&
    (form.default_commission_type === "FIXED" || commissionValue <= 100);
  const bankReady = Boolean(normalizeText(form.bank_name)) && Boolean(normalizeText(form.iban));

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-start">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/brokers">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg"
            onClick={saveDraft}
            disabled={saving}
          >
            <FileText className="h-4 w-4" />
            {t.saveDraft}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg"
            onClick={clearForm}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4" />
            {t.clear}
          </Button>

          {createdBrokerId ? (
            <Button
              asChild
              className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
            >
              <Link href={`/system/brokers/${createdBrokerId}`}>
                <UserRound className="h-4 w-4" />
                {t.viewBroker}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-4">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="space-y-1 text-start">
              <p className="font-semibold text-red-900">{t.errorTitle}</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <form
        onSubmit={submitForm}
        className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.basicInfo}</CardTitle>
              <CardDescription>{t.requiredFields}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-2">
              <FieldBlock label={t.name} required>
                <Input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                />
              </FieldBlock>

              <FieldBlock label={t.status}>
                <Select
                  value={form.status}
                  onValueChange={(value) => updateField("status", value as BrokerStatus)}
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
              </FieldBlock>

              <FieldBlock label={t.brokerCode}>
                <Input
                  value={form.broker_code}
                  onChange={(event) =>
                    updateField("broker_code", event.target.value.toUpperCase())
                  }
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </FieldBlock>

              <FieldBlock label={t.referralCode}>
                <div className="flex gap-2">
                  <Input
                    value={form.referral_code}
                    onChange={(event) =>
                      updateField("referral_code", event.target.value.toUpperCase())
                    }
                    className="h-10 rounded-lg bg-background"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 rounded-lg"
                    onClick={generateCodes}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t.generateCodes}
                  </Button>
                </div>
              </FieldBlock>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.contactInfo}</CardTitle>
              <CardDescription>{t.optionalFields}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-2">
              <FieldBlock label={t.phone}>
                <Input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </FieldBlock>

              <FieldBlock label={t.email}>
                <Input
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </FieldBlock>

              <FieldBlock label={t.city}>
                <Input
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                />
              </FieldBlock>

              <FieldBlock label={t.address}>
                <Input
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                />
              </FieldBlock>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.commissionInfo}</CardTitle>
              <CardDescription>{t.financialReadyDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-2">
              <FieldBlock label={t.commissionType}>
                <Select
                  value={form.default_commission_type}
                  onValueChange={(value) =>
                    updateField("default_commission_type", value as CommissionType)
                  }
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">{t.percentage}</SelectItem>
                    <SelectItem value="FIXED">{t.fixed}</SelectItem>
                  </SelectContent>
                </Select>
              </FieldBlock>

              <FieldBlock label={t.commissionValue}>
                <div className="relative">
                  <Input
                    value={form.default_commission_value}
                    onChange={(event) =>
                      updateField(
                        "default_commission_value",
                        toEnglishDigits(event.target.value),
                      )
                    }
                    className="h-10 rounded-lg bg-background pe-9"
                    inputMode="decimal"
                    dir="ltr"
                  />
                  {form.default_commission_type === "FIXED" ? (
                    <SarIcon
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2",
                        locale === "ar" ? "left-3" : "right-3",
                      )}
                    />
                  ) : null}
                </div>
              </FieldBlock>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.financialInfo}</CardTitle>
              <CardDescription>{t.financialReadyDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-2">
              <FieldBlock label={t.revenueRecognitionMode}>
                <Select
                  value={form.revenue_recognition_mode}
                  onValueChange={(value) =>
                    updateField(
                      "revenue_recognition_mode",
                      value as RevenueRecognitionMode,
                    )
                  }
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GROSS_SALE">{t.grossSale}</SelectItem>
                  </SelectContent>
                </Select>
              </FieldBlock>

              <FieldBlock label={t.settlementMode}>
                <Select
                  value={form.settlement_mode}
                  onValueChange={(value) =>
                    updateField("settlement_mode", value as SettlementMode)
                  }
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGENT_WITH_BROKER_SUMMARY">
                      {t.agentWithBrokerSummary}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FieldBlock>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.bankInfo}</CardTitle>
              <CardDescription>{t.optionalFields}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-2">
              <FieldBlock label={t.bankName}>
                <Input
                  value={form.bank_name}
                  onChange={(event) => updateField("bank_name", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                />
              </FieldBlock>

              <FieldBlock label={t.bankAccountName}>
                <Input
                  value={form.bank_account_name}
                  onChange={(event) =>
                    updateField("bank_account_name", event.target.value)
                  }
                  className="h-10 rounded-lg bg-background"
                />
              </FieldBlock>

              <FieldBlock label={t.iban}>
                <Input
                  value={form.iban}
                  onChange={(event) =>
                    updateField("iban", event.target.value.toUpperCase())
                  }
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </FieldBlock>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.notesInfo}</CardTitle>
              <CardDescription>{t.optionalFields}</CardDescription>
            </CardHeader>

            <CardContent className="px-5 pb-5">
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4 rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.summary}</CardTitle>
              <CardDescription>{t.readiness}</CardDescription>
              <CardAction>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2.5 py-1",
                    requiredReady && commissionReady
                      ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                      : "border-amber-500/30 bg-amber-50 text-amber-700",
                  )}
                >
                  {requiredReady && commissionReady ? t.complete : t.incomplete}
                </Badge>
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-3 px-5 pb-5">
              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <UserRound className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {form.name || t.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.broker_code || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.codePreview}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.referral_code || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <BadgePercent className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.commissionPreview}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.default_commission_type === "PERCENTAGE"
                      ? `${formatMoney(form.default_commission_value)}%`
                      : `${formatMoney(form.default_commission_value)} SAR`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <WalletCards className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {t.estimatedCommission}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.default_commission_type === "PERCENTAGE" ? (
                      <MoneyValue value={estimatedCommission} />
                    ) : (
                      <MoneyValue value={estimatedCommission} />
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {t.revenueRecognitionMode}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.grossSale}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Landmark className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {form.bank_name || t.bankName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {form.iban || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.financialReady}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.financialReadyDesc}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <ReadinessItem label={t.requiredFields} ready={requiredReady} />
                <ReadinessItem label={t.codePreview} ready={codesReady} />
                <ReadinessItem label={t.commissionInfo} ready={commissionReady} />
                <ReadinessItem label={t.bankInfo} ready={bankReady} />
              </div>

              <Button
                type="submit"
                className="h-10 w-full rounded-lg bg-black text-white hover:bg-black/90"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? t.saving : t.submit}
              </Button>

              {createdBrokerId ? (
                <Button
                  asChild
                  type="button"
                  variant="outline"
                  className="h-10 w-full rounded-lg"
                >
                  <Link href={`/system/brokers/${createdBrokerId}`}>
                    <UserRound className="h-4 w-4" />
                    {t.viewBroker}
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}