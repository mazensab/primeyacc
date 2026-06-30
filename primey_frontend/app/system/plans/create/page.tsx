"use client";

/* ============================================================
   📂 primey_frontend/app/system/plans/create/page.tsx
   💼 PrimeyAcc — Create System Subscription Plan
   ------------------------------------------------------------
   ✅ Approved Premium PrimeyAcc system page pattern
   ✅ Same visual spirit as companies/create
   ✅ Real API only:
      - POST /api/system/plans/create/
   ✅ CSRF/session auth with credentials include
   ✅ Client validation + backend validation message handling
   ✅ Draft save / restore through localStorage
   ✅ Unsaved changes protection
   ✅ Arabic/English via primey-locale
   ✅ sonner toast
   ✅ SAR icon from public/currency/sar.svg
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Coins,
  CreditCard,
  FileText,
  Gift,
  LayoutDashboard,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Warehouse,
  Zap,
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

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type PlanFormState = {
  name: string;
  code: string;
  slug: string;
  description: string;
  monthly_price: string;
  yearly_price: string;
  max_users: string;
  max_branches: string;
  max_warehouses: string;
  max_pos: string;
  features: string;
  is_active: boolean;
  is_public: boolean;
  sort_order: string;
};

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const API_ENDPOINT = "/api/system/plans/create/";
const CSRF_ENDPOINT = "/api/auth/csrf";
const DRAFT_KEY = "primeyacc-system-plan-create-draft-v2";

const FEATURE_SUGGESTIONS = {
  ar: [
    "general_accounting",
    "sales_pos",
    "purchases_suppliers",
    "inventory_warehouses",
    "hr",
    "whatsapp_communications",
    "advanced_reports",
    "api_integrations",
  ],
  en: [
    "general_accounting",
    "sales_pos",
    "purchases_suppliers",
    "inventory_warehouses",
    "hr",
    "whatsapp_communications",
    "advanced_reports",
    "api_integrations",
  ],
} as const;type FeatureKey = (typeof FEATURE_SUGGESTIONS)["ar"][number];
const FEATURE_LABELS: Record<Locale, Record<FeatureKey, string>> = {
  ar: {
    general_accounting: "\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0639\u0627\u0645\u0629",
    sales_pos: "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0648\u0646\u0642\u0627\u0637 \u0627\u0644\u0628\u064a\u0639",
    purchases_suppliers: "\u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a \u0648\u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646",
    inventory_warehouses: "\u0627\u0644\u0645\u062e\u0632\u0648\u0646 \u0648\u0627\u0644\u0645\u0633\u062a\u0648\u062f\u0639\u0627\u062a",
    hr: "\u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629",
    whatsapp_communications: "\u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0648\u0627\u0644\u0648\u0627\u062a\u0633\u0627\u0628",
    advanced_reports: "\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0645\u062a\u0642\u062f\u0645\u0629",
    api_integrations: "\u0627\u0644\u062a\u0643\u0627\u0645\u0644\u0627\u062a \u0648 API",
  },
  en: {
    general_accounting: "General accounting",
    sales_pos: "Sales and POS",
    purchases_suppliers: "Purchases and suppliers",
    inventory_warehouses: "Inventory and warehouses",
    hr: "Human resources",
    whatsapp_communications: "Communications and WhatsApp",
    advanced_reports: "Advanced reports",
    api_integrations: "Integrations and API",
  },
} as const;
function getFeatureLabel(feature: string, locale: Locale) {
  return FEATURE_LABELS[locale][feature as FeatureKey] || feature;
}

const emptyForm: PlanFormState = {
  name: "",
  code: "BASIC",
  slug: "",
  description: "",
  monthly_price: "0.00",
  yearly_price: "0.00",
  max_users: "1",
  max_branches: "1",
  max_warehouses: "1",
  max_pos: "1",
  features: "",
  is_active: true,
  is_public: true,
  sort_order: "0",
};

const translations = {
  ar: {
    badge: "إدارة المنصة",
    title: "إنشاء باقة جديدة",
    subtitle:
      "أضف باقة SaaS جديدة للمنصة مع الأسعار والحدود والمميزات وحالة الظهور من API الباقات الحقيقي.",
    back: "العودة للباقات",
    save: "إنشاء الباقة",
    saving: "جاري الإنشاء...",
    reset: "إعادة ضبط",
    saveDraft: "حفظ مسودة",
    restoreDraft: "استرجاع المسودة",
    clearDraft: "حذف المسودة",
    basicInfo: "البيانات الأساسية",
    basicInfoDesc: "اسم الباقة والكود والمعرف والوصف الظاهر في إدارة المنصة.",
    pricing: "الأسعار",
    pricingDesc: "السعر الشهري والسنوي مع عرض رمز الريال السعودي.",
    limits: "الحدود التشغيلية",
    limitsDesc: "حدد عدد المستخدمين والفروع والمخازن ونقاط البيع المسموحة.",
    featuresTitle: "مميزات الباقة",
    featuresDesc: "\u0627\u062e\u062a\u0631 \u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629\u060c \u0648\u0633\u064a\u062a\u0645 \u062d\u0641\u0638\u0647\u0627 \u0643\u0642\u0627\u0626\u0645\u0629 JSON.",
    statusTitle: "حالة الباقة والظهور",
    statusDesc: "حدد هل الباقة مفعلة وهل تظهر للاشتراك مستقبلا.",
    name: "اسم الباقة",
    code: "كود الباقة",
    slug: "معرف الرابط",
    description: "الوصف",
    monthlyPrice: "السعر الشهري",
    yearlyPrice: "السعر السنوي",
    maxUsers: "عدد المستخدمين",
    maxBranches: "عدد الفروع",
    maxWarehouses: "عدد المخازن",
    maxPos: "نقاط البيع",
    sortOrder: "ترتيب العرض",
    featuresPlaceholder: "مثال:\nفواتير مبيعات\nتقارير مالية\nإدارة المخزون",
    featureInputPlaceholder: "\u0627\u0643\u062a\u0628 \u0643\u0648\u062f \u0645\u064a\u0632\u0629 \u0645\u062e\u0635\u0635 \u0639\u0646\u062f \u0627\u0644\u062d\u0627\u062c\u0629 \u062b\u0645 \u0627\u0636\u063a\u0637 \u0625\u0636\u0627\u0641\u0629...",
    addFeature: "إضافة",
    suggestedFeatures: "\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u062c\u0627\u0647\u0632\u0629",
    selectedFeatures: "\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0645\u062e\u062a\u0627\u0631\u0629",
    noFeatures: "\u0644\u0645 \u062a\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0645\u064a\u0632\u0627\u062a \u0628\u0639\u062f.",
    active: "مفعلة",
    inactive: "موقفة",
    public: "ظاهرة",
    internal: "داخلية",
    activeHint: "تعطيل الباقة لا يلغي اشتراكات الشركات الحالية.",
    publicHint: "إخفاء الباقة يمنع ظهورها مستقبلا فقط.",
    requiredName: "اسم الباقة مطلوب.",
    requiredCode: "كود الباقة مطلوب.",
    invalidNumber: "القيم الرقمية يجب أن تكون صفر أو أكبر.",
    created: "تم إنشاء الباقة بنجاح.",
    draftSaved: "تم حفظ المسودة.",
    draftRestored: "تم استرجاع المسودة.",
    draftCleared: "تم حذف المسودة.",
    noDraft: "لا توجد مسودة محفوظة.",
    resetDone: "تمت إعادة ضبط النموذج.",
    sideTitle: "اختصارات وحدة الباقات",
    sideDesc: "تنقل سريع بنفس نمط إدارة المنصة المعتمد.",
    plansList: "قائمة الباقات",
    plansListDesc: "العودة إلى جدول إدارة الباقات.",
    subscriptions: "اشتراكات الشركات",
    subscriptionsDesc: "متابعة الاشتراكات المرتبطة بالباقات.",
    payments: "مدفوعات المنصة",
    paymentsDesc: "مراجعة تحصيل اشتراكات المنصة.",
    dashboard: "لوحة النظام",
    dashboardDesc: "العودة إلى لوحة النظام الرئيسية.",
    previewTitle: "معاينة سريعة",
    previewDesc: "ملخص مباشر للبيانات قبل الإرسال.",
    planNamePreview: "اسم الباقة",
    codePreview: "الكود",
    monthlyPreview: "شهري",
    yearlyPreview: "سنوي",
    visibilityPreview: "الظهور",
  },
  en: {
    badge: "Platform management",
    title: "Create a new plan",
    subtitle:
      "Add a new SaaS plan with prices, limits, features, and visibility through the real plans API.",
    back: "Back to plans",
    save: "Create plan",
    saving: "Creating...",
    reset: "Reset",
    saveDraft: "Save draft",
    restoreDraft: "Restore draft",
    clearDraft: "Clear draft",
    basicInfo: "Basic information",
    basicInfoDesc: "Plan name, code, slug, and description used in platform management.",
    pricing: "Pricing",
    pricingDesc: "Monthly and yearly prices with the Saudi Riyal icon.",
    limits: "Operational limits",
    limitsDesc: "Set allowed users, branches, warehouses, and POS terminals.",
    featuresTitle: "Plan features",
    featuresDesc: "Select high-level feature groups; they will be saved as a JSON list.",
    statusTitle: "Plan status and visibility",
    statusDesc: "Choose whether the plan is active and public for future subscriptions.",
    name: "Plan name",
    code: "Plan code",
    slug: "Slug",
    description: "Description",
    monthlyPrice: "Monthly price",
    yearlyPrice: "Yearly price",
    maxUsers: "Max users",
    maxBranches: "Max branches",
    maxWarehouses: "Max warehouses",
    maxPos: "Max POS",
    sortOrder: "Sort order",
    featuresPlaceholder: "Example:\nSales invoices\nFinancial reports\nInventory management",
    featureInputPlaceholder: "Write a custom feature code if needed, then click Add...",
    addFeature: "Add",
    suggestedFeatures: "Suggested feature groups",
    selectedFeatures: "Selected feature groups",
    noFeatures: "No feature groups added yet.",
    active: "Active",
    inactive: "Inactive",
    public: "Public",
    internal: "Internal",
    activeHint: "Deactivating a plan does not cancel existing company subscriptions.",
    publicHint: "Hiding a plan only prevents future visibility.",
    requiredName: "Plan name is required.",
    requiredCode: "Plan code is required.",
    invalidNumber: "Numeric values must be zero or greater.",
    created: "Plan created successfully.",
    draftSaved: "Draft saved.",
    draftRestored: "Draft restored.",
    draftCleared: "Draft cleared.",
    noDraft: "No saved draft found.",
    resetDone: "Form reset.",
    sideTitle: "Plans module shortcuts",
    sideDesc: "Quick navigation using the approved platform management pattern.",
    plansList: "Plans list",
    plansListDesc: "Return to the plans management table.",
    subscriptions: "Company subscriptions",
    subscriptionsDesc: "Review subscriptions linked to plans.",
    payments: "Platform payments",
    paymentsDesc: "Review platform subscription collection.",
    dashboard: "System dashboard",
    dashboardDesc: "Return to the main system dashboard.",
    previewTitle: "Quick preview",
    previewDesc: "A live summary before submitting.",
    planNamePreview: "Plan name",
    codePreview: "Code",
    monthlyPreview: "Monthly",
    yearlyPreview: "Yearly",
    visibilityPreview: "Visibility",
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

function toSafeNumber(value: string) {
  const parsed = Number(String(value || "0").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function toEnglishDigits(value: string) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

  return String(value || "")
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)));
}

function cleanDecimalInput(value: string) {
  const normalized = toEnglishDigits(value).replace(",", ".");
  const onlyValid = normalized.replace(/[^0-9.]/g, "");
  const parts = onlyValid.split(".");

  if (parts.length <= 1) return parts[0] || "";

  return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
}

function cleanIntegerInput(value: string) {
  return toEnglishDigits(value).replace(/[^0-9]/g, "");
}

function numericInputClass(extra = "") {
  return cn("h-11 rounded-xl bg-background text-left font-mono tabular-nums", extra);
}

function formatMoney(value: string) {
  const parsed = toSafeNumber(value) ?? 0;

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function buildPlanSlug(value: string) {
  const fallback = "custom-plan";
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}
function featuresToList(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function labelClass() {
  return "text-sm font-medium text-foreground";
}

function hintClass() {
  return "text-xs leading-5 text-muted-foreground";
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="text-xs font-medium text-destructive">{message}</p>;
}

function MoneyInputIcon() {
  return (
    <Image
      src="/currency/sar.svg"
      alt="SAR"
      width={16}
      height={16}
      className="h-4 w-4"
    />
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;

  return (
    <Button
      asChild
      variant="outline"
      className="h-auto justify-start rounded-2xl bg-background p-4 text-start transition hover:-translate-y-0.5 hover:shadow-sm"
    >
      <Link href={action.href}>
        <span className="flex w-full items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <span className="space-y-1">
            <span className="block font-semibold text-foreground">{action.title}</span>
            <span className="block text-xs leading-5 text-muted-foreground">
              {action.description}
            </span>
          </span>
        </span>
      </Link>
    </Button>
  );
}

function PreviewItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm font-semibold text-foreground tabular-nums">{value}</div>
    </div>
  );
}

export default function SystemPlanCreatePage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<PlanFormState>(emptyForm);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [featureInput, setFeatureInput] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

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
      if (!dirty || submitting) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);

    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, submitting]);

  const quickActions = React.useMemo<QuickAction[]>(
    () => [
      {
        title: t.plansList,
        description: t.plansListDesc,
        href: "/system/plans",
        icon: Gift,
      },
      {
        title: t.subscriptions,
        description: t.subscriptionsDesc,
        href: "/system/subscriptions",
        icon: CreditCard,
      },
      {
        title: t.payments,
        description: t.paymentsDesc,
        href: "/system/platform-payments",
        icon: FileText,
      },
      {
        title: t.dashboard,
        description: t.dashboardDesc,
        href: "/system",
        icon: LayoutDashboard,
      },
    ],
    [
      t.dashboard,
      t.dashboardDesc,
      t.payments,
      t.paymentsDesc,
      t.plansList,
      t.plansListDesc,
      t.subscriptions,
      t.subscriptionsDesc,
    ],
  );

  function updateField<K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);

    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  const selectedFeatures = React.useMemo(() => featuresToList(form.features), [form.features]);

  function syncFeatures(items: string[]) {
    const uniqueItems = Array.from(
      new Set(items.map((item) => item.trim()).filter(Boolean)),
    );

    updateField("features", uniqueItems.join("\n"));
  }

  function addFeature(value: string) {
    const cleaned = value.trim();

    if (!cleaned) return;

    syncFeatures([...selectedFeatures, cleaned]);
    setFeatureInput("");
  }

  function removeFeature(value: string) {
    syncFeatures(selectedFeatures.filter((item) => item !== value));
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) nextErrors.name = t.requiredName;
    if (!form.code.trim()) nextErrors.code = t.requiredCode;

    const numericFields: Array<keyof PlanFormState> = [
      "monthly_price",
      "yearly_price",
      "max_users",
      "max_branches",
      "max_warehouses",
      "max_pos",
      "sort_order",
    ];

    numericFields.forEach((field) => {
      if (toSafeNumber(String(form[field])) === null) {
        nextErrors[field] = t.invalidNumber;
      }
    });

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function saveDraft() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    toast.success(t.draftSaved);
  }

  function restoreDraft() {
    const raw = window.localStorage.getItem(DRAFT_KEY);

    if (!raw) {
      toast.info(t.noDraft);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PlanFormState>;
      setForm({ ...emptyForm, ...parsed });
      setDirty(true);
      toast.success(t.draftRestored);
    } catch {
      toast.error(t.noDraft);
    }
  }

  function clearDraft() {
    window.localStorage.removeItem(DRAFT_KEY);
    toast.success(t.draftCleared);
  }

  function resetForm() {
    setForm(emptyForm);
    setErrors({});
    setDirty(false);
    toast.success(t.resetDone);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const csrfToken = await ensureCsrfToken();

      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        slug: buildPlanSlug(form.slug || form.code || form.name),
        description: form.description.trim(),
        monthly_price: String(toSafeNumber(form.monthly_price) ?? 0),
        yearly_price: String(toSafeNumber(form.yearly_price) ?? 0),
        max_users: Math.trunc(toSafeNumber(form.max_users) ?? 1),
        max_branches: Math.trunc(toSafeNumber(form.max_branches) ?? 1),
        max_warehouses: Math.trunc(toSafeNumber(form.max_warehouses) ?? 0),
        max_pos: Math.trunc(toSafeNumber(form.max_pos) ?? 0),
        features: featuresToList(form.features),
        is_active: form.is_active,
        is_public: form.is_public,
        sort_order: Math.trunc(toSafeNumber(form.sort_order) ?? 0),
      };

      const response = await fetch(makeApiUrl(API_ENDPOINT), {
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
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type") || "";
      const rawText = await response.text();
      let responsePayload: unknown = null;

      if (rawText && contentType.includes("application/json")) {
        try {
          responsePayload = JSON.parse(rawText) as unknown;
        } catch {
          responsePayload = null;
        }
      }

      const record = asRecord(responsePayload);
      const message =
        normalizeText(record.message) ||
        normalizeText(record.detail) ||
        normalizeText(record.error);

      if (!response.ok) {
        throw new Error(message || `Request failed with status ${response.status}`);
      }

      toast.success(message || t.created);
      window.localStorage.removeItem(DRAFT_KEY);
      setDirty(false);
      router.push("/system/plans");
      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : t.created;
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8" dir={dir}>
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
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  {t.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system/plans">
                    <ArrowLeft className="h-4 w-4" />
                    {t.back}
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
                  type="button"
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={restoreDraft}
                  disabled={submitting}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.restoreDraft}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.href} action={action} />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.basicInfo}</CardTitle>
                <CardDescription>{t.basicInfoDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={labelClass()} htmlFor="name">
                    {t.name}
                  </label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className="h-11 rounded-xl bg-background"
                    disabled={submitting}
                  />
                  <FieldError message={errors.name} />
                </div>

                <div className="space-y-2">
                  <label className={labelClass()} htmlFor="code">
                    {t.code}
                  </label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(event) => updateField("code", event.target.value.toUpperCase())}
                    className="h-11 rounded-xl bg-background font-mono uppercase"
                    disabled={submitting}
                  />
                  <FieldError message={errors.code} />
                </div>

                <div className="space-y-2">
                  <label className={labelClass()} htmlFor="slug">
                    {t.slug}
                  </label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(event) => updateField("slug", event.target.value)}
                    className="h-11 rounded-xl bg-background"
                    disabled={submitting}
                  />
                  <p className={hintClass()}>
                    {locale === "ar"
                      ? "اتركه فارغا ليتم إنشاؤه تلقائيا من اسم الباقة."
                      : "Leave empty to generate it automatically from the plan name."}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className={labelClass()} htmlFor="sort_order">
                    {t.sortOrder}
                  </label>
                  <Input
                    id="sort_order"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={form.sort_order}
                    onChange={(event) =>
                      updateField("sort_order", cleanIntegerInput(event.target.value))
                    }
                    className={numericInputClass()}
                    disabled={submitting}
                  />
                  <FieldError message={errors.sort_order} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className={labelClass()} htmlFor="description">
                    {t.description}
                  </label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    className="min-h-[110px] w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={submitting}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.pricing}</CardTitle>
                <CardDescription>{t.pricingDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={labelClass()} htmlFor="monthly_price">
                    {t.monthlyPrice}
                  </label>
                  <div className="relative">
                    <Input
                      id="monthly_price"
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={form.monthly_price}
                      onChange={(event) =>
                        updateField("monthly_price", cleanDecimalInput(event.target.value))
                      }
                      className={numericInputClass(locale === "ar" ? "pl-10" : "pr-10")}
                      disabled={submitting}
                    />
                    <span
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2",
                        locale === "ar" ? "left-3" : "right-3",
                      )}
                    >
                      <MoneyInputIcon />
                    </span>
                  </div>
                  <FieldError message={errors.monthly_price} />
                </div>

                <div className="space-y-2">
                  <label className={labelClass()} htmlFor="yearly_price">
                    {t.yearlyPrice}
                  </label>
                  <div className="relative">
                    <Input
                      id="yearly_price"
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={form.yearly_price}
                      onChange={(event) =>
                        updateField("yearly_price", cleanDecimalInput(event.target.value))
                      }
                      className={numericInputClass(locale === "ar" ? "pl-10" : "pr-10")}
                      disabled={submitting}
                    />
                    <span
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2",
                        locale === "ar" ? "left-3" : "right-3",
                      )}
                    >
                      <MoneyInputIcon />
                    </span>
                  </div>
                  <FieldError message={errors.yearly_price} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.limits}</CardTitle>
                <CardDescription>{t.limitsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <label className={labelClass()} htmlFor="max_users">
                    {t.maxUsers}
                  </label>
                  <Input
                    id="max_users"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={form.max_users}
                    onChange={(event) =>
                      updateField("max_users", cleanIntegerInput(event.target.value))
                    }
                    className={numericInputClass()}
                    disabled={submitting}
                  />
                  <FieldError message={errors.max_users} />
                </div>

                <div className="space-y-2">
                  <label className={labelClass()} htmlFor="max_branches">
                    {t.maxBranches}
                  </label>
                  <Input
                    id="max_branches"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={form.max_branches}
                    onChange={(event) =>
                      updateField("max_branches", cleanIntegerInput(event.target.value))
                    }
                    className={numericInputClass()}
                    disabled={submitting}
                  />
                  <FieldError message={errors.max_branches} />
                </div>

                <div className="space-y-2">
                  <label className={labelClass()} htmlFor="max_warehouses">
                    {t.maxWarehouses}
                  </label>
                  <Input
                    id="max_warehouses"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={form.max_warehouses}
                    onChange={(event) =>
                      updateField("max_warehouses", cleanIntegerInput(event.target.value))
                    }
                    className={numericInputClass()}
                    disabled={submitting}
                  />
                  <FieldError message={errors.max_warehouses} />
                </div>

                <div className="space-y-2">
                  <label className={labelClass()} htmlFor="max_pos">
                    {t.maxPos}
                  </label>
                  <Input
                    id="max_pos"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={form.max_pos}
                    onChange={(event) =>
                      updateField("max_pos", cleanIntegerInput(event.target.value))
                    }
                    className={numericInputClass()}
                    disabled={submitting}
                  />
                  <FieldError message={errors.max_pos} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.featuresTitle}</CardTitle>
                <CardDescription>{t.featuresDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={featureInput}
                    onChange={(event) => setFeatureInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addFeature(featureInput);
                      }
                    }}
                    placeholder={t.featureInputPlaceholder}
                    className="h-11 rounded-xl bg-background"
                    disabled={submitting}
                  />
                  <Button
                    type="button"
                    className="h-11 rounded-xl"
                    onClick={() => addFeature(featureInput)}
                    disabled={submitting || !featureInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                    {t.addFeature}
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className={hintClass()}>{t.suggestedFeatures}</p>
                  <div className="flex flex-wrap gap-2">
                    {FEATURE_SUGGESTIONS[locale].map((feature) => {
                      const selected = selectedFeatures.includes(feature);

                      return (
                        <Button
                          key={feature}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          className="h-8 rounded-full bg-background px-3 text-xs data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground"
                          data-selected={selected}
                          onClick={() =>
                            selected ? removeFeature(feature) : addFeature(feature)
                          }
                          disabled={submitting}
                        >
                          {getFeatureLabel(feature, locale)}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className={hintClass()}>{t.selectedFeatures}</p>
                  {selectedFeatures.length ? (
                    <div className="flex flex-wrap gap-2 rounded-2xl border bg-background p-3">
                      {selectedFeatures.map((feature) => (
                        <Badge
                          key={feature}
                          variant="secondary"
                          className="gap-2 rounded-full px-3 py-1.5"
                        >
                          {getFeatureLabel(feature, locale)}
                          <button
                            type="button"
                            className="rounded-full text-muted-foreground transition hover:text-foreground"
                            onClick={() => removeFeature(feature)}
                            disabled={submitting}
                            aria-label={getFeatureLabel(feature, locale)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                      {t.noFeatures}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.statusTitle}</CardTitle>
                <CardDescription>{t.statusDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{form.is_active ? t.active : t.inactive}</p>
                      <p className={cn(hintClass(), "mt-1")}>{t.activeHint}</p>
                    </div>
                    <Button
                      type="button"
                      variant={form.is_active ? "default" : "outline"}
                      className="rounded-xl"
                      onClick={() => updateField("is_active", !form.is_active)}
                      disabled={submitting}
                    >
                      <BadgeCheck className="h-4 w-4" />
                      {form.is_active ? t.active : t.inactive}
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{form.is_public ? t.public : t.internal}</p>
                      <p className={cn(hintClass(), "mt-1")}>{t.publicHint}</p>
                    </div>
                    <Button
                      type="button"
                      variant={form.is_public ? "default" : "outline"}
                      className="rounded-xl"
                      onClick={() => updateField("is_public", !form.is_public)}
                      disabled={submitting}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {form.is_public ? t.public : t.internal}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.previewTitle}</CardTitle>
                <CardDescription>{t.previewDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <PreviewItem label={t.planNamePreview} value={form.name || "—"} />
                <PreviewItem label={t.codePreview} value={form.code || "—"} />
                <PreviewItem
                  label={t.monthlyPreview}
                  value={
                    <span dir="ltr" className="inline-flex items-center gap-1 tabular-nums">
                      <MoneyInputIcon />
                      {formatMoney(form.monthly_price)}
                    </span>
                  }
                />
                <PreviewItem
                  label={t.yearlyPreview}
                  value={
                    <span dir="ltr" className="inline-flex items-center gap-1 tabular-nums">
                      <MoneyInputIcon />
                      {formatMoney(form.yearly_price)}
                    </span>
                  }
                />
                <PreviewItem
                  label={t.visibilityPreview}
                  value={
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full">
                        {form.is_active ? t.active : t.inactive}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        {form.is_public ? t.public : t.internal}
                      </Badge>
                    </div>
                  }
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.sideTitle}</CardTitle>
                <CardDescription>{t.sideDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border bg-background p-3">
                    <UsersRound className="mb-2 h-4 w-4 text-muted-foreground" />
                    <p dir="ltr" className="font-semibold tabular-nums">{form.max_users || "0"}</p>
                    <p className="text-xs text-muted-foreground">{t.maxUsers}</p>
                  </div>
                  <div className="rounded-2xl border bg-background p-3">
                    <Zap className="mb-2 h-4 w-4 text-muted-foreground" />
                    <p dir="ltr" className="font-semibold tabular-nums">{form.max_branches || "0"}</p>
                    <p className="text-xs text-muted-foreground">{t.maxBranches}</p>
                  </div>
                  <div className="rounded-2xl border bg-background p-3">
                    <Warehouse className="mb-2 h-4 w-4 text-muted-foreground" />
                    <p dir="ltr" className="font-semibold tabular-nums">{form.max_warehouses || "0"}</p>
                    <p className="text-xs text-muted-foreground">{t.maxWarehouses}</p>
                  </div>
                  <div className="rounded-2xl border bg-background p-3">
                    <Coins className="mb-2 h-4 w-4 text-muted-foreground" />
                    <p dir="ltr" className="font-semibold tabular-nums">{form.max_pos || "0"}</p>
                    <p className="text-xs text-muted-foreground">{t.maxPos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardContent className="space-y-3 p-4">
                <Button type="submit" className="h-11 w-full rounded-xl" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {submitting ? t.saving : t.save}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl bg-background"
                    onClick={resetForm}
                    disabled={submitting}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t.reset}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl bg-background"
                    onClick={clearDraft}
                    disabled={submitting}
                  >
                    <FileText className="h-4 w-4" />
                    {t.clearDraft}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>
        </form>
      </div>
    </main>
  );
}
