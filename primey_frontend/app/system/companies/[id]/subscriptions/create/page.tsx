"use client";
/* ============================================================
   ?? primey_frontend/app/system/companies/[id]/subscriptions/create/page.tsx
   ?? Mhamcloud ? System Company Subscription Create Page V1.0
   ------------------------------------------------------------
   ? Premium system form pattern
   ? Real API only: POST /api/system/subscriptions/create/
   ? Creates PENDING_PAYMENT subscription first
   ? Company-scoped from /system/companies/{id}
   ? Session + CSRF safe fetch
   ? Arabic/English locale support
============================================================ */
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type BillingCycle = "MONTHLY" | "YEARLY";
type CompanyInfo = {
  id: string;
  name: string;
  code: string;
};
type PlanInfo = {
  id: string;
  name: string;
  code: string;
  monthlyPrice: string;
  yearlyPrice: string;
  isActive: boolean;
};
type FormState = {
  planId: string;
  billingCycle: BillingCycle;
  startDate: string;
  discountAmount: string;
  vatRate: string;
  autoRenew: boolean;
  billingReference: string;
  notes: string;
};
const translations = {
  ar: {
    title: "\u0625\u0636\u0627\u0641\u0629 \u0627\u0634\u062a\u0631\u0627\u0643 \u0644\u0644\u0634\u0631\u0643\u0629",
    subtitle: "\u0625\u0646\u0634\u0627\u0621 \u0627\u0634\u062a\u0631\u0627\u0643 \u062c\u062f\u064a\u062f \u0644\u0644\u0634\u0631\u0643\u0629 \u0628\u062d\u0627\u0644\u0629 \u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062f\u0641\u0639\u060c \u0648\u0628\u0639\u062f\u0647\u0627 \u0646\u0643\u0645\u0644 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629 \u0648\u0627\u0644\u062f\u0641\u0639 \u0648\u0627\u0644\u062a\u0641\u0639\u064a\u0644.",
    badge: "\u0627\u0634\u062a\u0631\u0627\u0643 \u0634\u0631\u0643\u0629",
    back: "\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0634\u0631\u0643\u0629",
    refresh: "\u062a\u062d\u062f\u064a\u062b",
    companyCard: "\u0627\u0644\u0634\u0631\u0643\u0629",
    companyLoading: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629...",
    companyFallback: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0634\u0631\u0643\u0629\u060c \u0644\u0643\u0646 \u064a\u0645\u0643\u0646 \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0625\u0630\u0627 \u0643\u0627\u0646 \u0631\u0642\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 \u0635\u062d\u064a\u062d\u064b\u0627.",
    subscriptionData: "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643",
    subscriptionDesc: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0628\u0627\u0642\u0629 \u0648\u062f\u0648\u0631\u0629 \u0627\u0644\u0641\u0648\u062a\u0631\u0629 \u0648\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629.",
    billingData: "\u0627\u0644\u0641\u0648\u062a\u0631\u0629 \u0648\u0627\u0644\u062f\u0641\u0639",
    billingDesc: "\u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064a\u0629 \u0644\u0627 \u062a\u0641\u0639\u0651\u0644 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0645\u0628\u0627\u0634\u0631\u0629\u060c \u0628\u0644 \u062a\u0646\u0634\u0626 \u0627\u0634\u062a\u0631\u0627\u0643\u064b\u0627 \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062f\u0641\u0639.",
    plan: "\u0627\u0644\u0628\u0627\u0642\u0629",
    choosePlan: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0628\u0627\u0642\u0629",
    billingCycle: "\u062f\u0648\u0631\u0629 \u0627\u0644\u0641\u0648\u062a\u0631\u0629",
    monthly: "\u0634\u0647\u0631\u064a",
    yearly: "\u0633\u0646\u0648\u064a",
    startDate: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629",
    discountAmount: "\u0627\u0644\u062e\u0635\u0645",
    vatRate: "\u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629",
    autoRenew: "\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u062a\u062c\u062f\u064a\u062f \u0627\u0644\u062a\u0644\u0642\u0627\u0626\u064a",
    billingReference: "\u0645\u0631\u062c\u0639 \u0627\u0644\u0641\u0648\u062a\u0631\u0629",
    notes: "\u0645\u0644\u0627\u062d\u0638\u0627\u062a",
    selectedPrice: "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0645\u062e\u062a\u0627\u0631",
    totalHint: "\u0633\u064a\u062d\u0633\u0628 \u0627\u0644\u0628\u0627\u0643\u0646\u062f \u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u0636\u0631\u064a\u0628\u0629 \u0648\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0648\u064a\u0639\u064a\u062f \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0627\u0644\u0646\u0647\u0627\u0626\u064a.",
    create: "\u0625\u0646\u0634\u0627\u0621 \u0627\u0634\u062a\u0631\u0627\u0643 \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062f\u0641\u0639",
    creating: "\u062c\u0627\u0631\u064a \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643...",
    required: "\u0627\u062e\u062a\u0631 \u0628\u0627\u0642\u0629 \u0642\u0628\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643.",
    created: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0634\u062a\u0631\u0627\u0643 \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062f\u0641\u0639 \u0628\u0646\u062c\u0627\u062d.",
    failed: "\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643.",
    loadingPlans: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u0627\u0642\u0627\u062a...",
    noPlans: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u0627\u0642\u0627\u062a \u0646\u0634\u0637\u0629 \u0645\u062a\u0627\u062d\u0629.",
    nextStepTitle: "\u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629",
    nextStepDesc: "\u0628\u0639\u062f \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0633\u064a\u062a\u0645 \u0641\u062a\u062d \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0644\u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629 \u0648\u0627\u0644\u062f\u0641\u0639 \u0648\u0627\u0644\u062a\u0641\u0639\u064a\u0644.",
    pending: "\u0633\u064a\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0628\u0627\u0644\u062d\u0627\u0644\u0629: PENDING_PAYMENT",
  },
  en: {
    title: "Add company subscription",
    subtitle: "Create a new company subscription as pending payment, then continue with invoice, payment, and activation.",
    badge: "Company subscription",
    back: "Back to company details",
    refresh: "Refresh",
    companyCard: "Company",
    companyLoading: "Loading company details...",
    companyFallback: "Could not load company details, but you can continue if the company id is correct.",
    subscriptionData: "Subscription details",
    subscriptionDesc: "Choose the plan, billing cycle, and start date.",
    billingData: "Billing and payment",
    billingDesc: "This does not activate the subscription directly. It creates a pending payment subscription first.",
    plan: "Plan",
    choosePlan: "Choose plan",
    billingCycle: "Billing cycle",
    monthly: "Monthly",
    yearly: "Yearly",
    startDate: "Start date",
    discountAmount: "Discount",
    vatRate: "VAT rate",
    autoRenew: "Enable auto renew",
    billingReference: "Billing reference",
    notes: "Notes",
    selectedPrice: "Selected price",
    totalHint: "The backend will calculate price, VAT, total amount, and return the final subscription.",
    create: "Create pending payment subscription",
    creating: "Creating subscription...",
    required: "Choose a plan before creating the subscription.",
    created: "Pending payment subscription created successfully.",
    failed: "Could not create subscription.",
    loadingPlans: "Loading plans...",
    noPlans: "No active plans available.",
    nextStepTitle: "Next step",
    nextStepDesc: "After creating the subscription, the subscription detail page will open to continue invoice, payment, and activation.",
    pending: "The subscription will be created as: PENDING_PAYMENT",
  },
} as const;
function getApiBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}
function makeApiUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
const initialForm: FormState = {
  planId: "",
  billingCycle: "MONTHLY",
  startDate: todayIso(),
  discountAmount: "0.00",
  vatRate: "0.15",
  autoRenew: false,
  billingReference: "",
  notes: "",
};
function asRecord(value: unknown): ApiRecord {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as ApiRecord;
  }
  return {};
}
function text(value: unknown, fallback = "") {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return fallback;
}
function toBool(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "active", "enabled"].includes(normalized)) return true;
    if (["false", "0", "no", "inactive", "disabled"].includes(normalized)) return false;
  }
  return fallback;
}
function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const result = asRecord(root.result);
  const candidates = [
    root.results,
    root.items,
    root.plans,
    root.data,
    data.results,
    data.items,
    data.plans,
    result.results,
    result.items,
    result.plans,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}
function normalizeCompany(payload: unknown, fallbackId: string): CompanyInfo {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const company = asRecord(data.company ?? root.company ?? data);
  return {
    id: text(company.id, fallbackId),
    name:
      text(company.display_name) ||
      text(company.name) ||
      text(company.name_ar) ||
      text(company.name_en) ||
      fallbackId,
    code: text(company.company_code) || text(company.code),
  };
}
function normalizePlan(value: unknown): PlanInfo {
  const plan = asRecord(value);
  return {
    id: text(plan.id || plan.pk || plan.uuid),
    name: text(plan.name || plan.display_name || plan.title || plan.name_ar || plan.name_en, "?"),
    code: text(plan.code || plan.slug),
    monthlyPrice: text(plan.monthly_price || plan.monthlyPrice || plan.price_monthly || plan.price, "0.00"),
    yearlyPrice: text(plan.yearly_price || plan.yearlyPrice || plan.price_yearly || plan.price, "0.00"),
    isActive: toBool(plan.is_active ?? plan.active ?? plan.enabled ?? plan.status, true),
  };
}
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return "";
  return decodeURIComponent(match.slice(name.length + 1));
}
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  const stored =
    window.localStorage.getItem("primey-locale") ||
    window.localStorage.getItem("locale");
  return stored === "en" ? "en" : "ar";
}
async function readJson(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { message: raw };
  }
}
function errorMessage(payload: unknown, fallback: string) {
  const root = asRecord(payload);
  const errors = asRecord(root.errors);
  const firstError = Object.values(errors)[0];
  if (Array.isArray(firstError)) return text(firstError[0], fallback);
  return text(root.message || root.detail || firstError, fallback);
}
function fieldClassName() {
  return "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
}
function money(value: string) {
  const numberValue = Number.parseFloat(value || "0");
  if (Number.isNaN(numberValue)) return "0.00";
  return numberValue.toFixed(2);
}
export default function SystemCompanySubscriptionCreatePage() {
  const params = useParams();
  const router = useRouter();
  const companyId = React.useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] || "" : String(raw || "");
  }, [params]);
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [company, setCompany] = React.useState<CompanyInfo | null>(null);
  const [plans, setPlans] = React.useState<PlanInfo[]>([]);
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [loading, setLoading] = React.useState(true);
  const [companyError, setCompanyError] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const selectedPlan = plans.find((plan) => plan.id === form.planId);
  const selectedPrice = selectedPlan
    ? form.billingCycle === "YEARLY"
      ? selectedPlan.yearlyPrice
      : selectedPlan.monthlyPrice
    : "0.00";
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
  const loadData = React.useCallback(async () => {
    setLoading(true);
    setCompanyError(false);
    try {
      const [companyResponse, plansResponse] = await Promise.all([
        fetch(makeApiUrl(`/api/system/companies/${companyId}/`), {
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
        fetch(makeApiUrl("/api/system/plans/?page_size=200"), {
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
      ]);
      const companyPayload = await readJson(companyResponse);
      const plansPayload = await readJson(plansResponse);
      if (companyResponse.ok) {
        setCompany(normalizeCompany(companyPayload, companyId));
      } else {
        setCompanyError(true);
        setCompany({ id: companyId, name: companyId, code: "" });
      }
      if (!plansResponse.ok) {
        throw new Error(errorMessage(plansPayload, t.failed));
      }
      const activePlans = extractArray(plansPayload)
        .map(normalizePlan)
        .filter((plan) => plan.id && plan.isActive);
      setPlans(activePlans);
      setForm((current) => ({
        ...current,
        planId: current.planId || activePlans[0]?.id || "",
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.failed);
    } finally {
      setLoading(false);
    }
  }, [companyId, t.failed]);
  React.useEffect(() => {
    if (companyId) {
      void loadData();
    }
  }, [companyId, loadData]);
  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.planId) {
      toast.error(t.required);
      return;
    }
    setSubmitting(true);
    try {
      const csrfToken = getCookie("csrftoken");
      const response = await fetch(makeApiUrl("/api/system/subscriptions/create/"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
        body: JSON.stringify({
          company_id: Number.parseInt(companyId, 10),
          plan_id: Number.parseInt(form.planId, 10),
          billing_cycle: form.billingCycle,
          action: "NEW",
          start_date: form.startDate,
          discount_amount: form.discountAmount || "0.00",
          vat_rate: form.vatRate || "0.15",
          auto_renew: form.autoRenew,
          billing_reference: form.billingReference.trim(),
          notes: form.notes.trim(),
        }),
      });
      const payload = await readJson(response);
      const root = asRecord(payload);
      if (!response.ok || root.ok === false) {
        throw new Error(errorMessage(payload, t.failed));
      }
      const data = asRecord(root.data);
      const subscription = asRecord(data.subscription);
      const subscriptionId = text(subscription.id);
      toast.success(t.created);
      if (subscriptionId) {
        router.push(`/system/subscriptions/${subscriptionId}`);
      } else {
        router.push(`/system/companies/${companyId}`);
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.failed);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <section className="rounded-3xl border bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                {t.badge}
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {t.refresh}
              </button>
              <Link
                href={`/system/companies/${companyId}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium transition hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.back}
              </Link>
            </div>
          </div>
        </section>
        <section className="rounded-3xl border bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-muted p-3 text-muted-foreground">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t.companyCard}</p>
                {loading && !company ? (
                  <p className="mt-1 text-sm text-muted-foreground">{t.companyLoading}</p>
                ) : (
                  <div>
                    <p className="mt-1 text-lg font-semibold">{company?.name || companyId}</p>
                    {company?.code ? <p className="mt-1 text-xs text-muted-foreground">{company.code}</p> : null}
                  </div>
                )}
              </div>
            </div>
            {companyError ? (
              <p className="max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                {t.companyFallback}
              </p>
            ) : null}
          </div>
        </section>
        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border bg-background p-5 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <span className="rounded-2xl bg-muted p-3 text-muted-foreground">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">{t.subscriptionData}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.subscriptionDesc}</p>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-medium md:col-span-2">
                <span>{t.plan}</span>
                <select
                  value={form.planId}
                  onChange={(event) => updateField("planId", event.target.value)}
                  disabled={loading || plans.length === 0}
                  className={fieldClassName()}
                >
                  <option value="">{loading ? t.loadingPlans : t.choosePlan}</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} {plan.code ? `(${plan.code})` : ""}
                    </option>
                  ))}
                </select>
                {!loading && plans.length === 0 ? (
                  <span className="mt-2 block text-xs text-destructive">{t.noPlans}</span>
                ) : null}
              </label>
              <label className="block text-sm font-medium">
                <span>{t.billingCycle}</span>
                <select
                  value={form.billingCycle}
                  onChange={(event) => updateField("billingCycle", event.target.value as BillingCycle)}
                  className={fieldClassName()}
                >
                  <option value="MONTHLY">{t.monthly}</option>
                  <option value="YEARLY">{t.yearly}</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                <span>{t.startDate}</span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => updateField("startDate", event.target.value)}
                  className={fieldClassName()}
                />
              </label>
              <label className="block text-sm font-medium">
                <span>{t.discountAmount}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.discountAmount}
                  onChange={(event) => updateField("discountAmount", event.target.value)}
                  className={fieldClassName()}
                />
              </label>
              <label className="block text-sm font-medium">
                <span>{t.vatRate}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.vatRate}
                  onChange={(event) => updateField("vatRate", event.target.value)}
                  className={fieldClassName()}
                />
              </label>
            </div>
          </section>
          <section className="rounded-3xl border bg-background p-5 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
              <span className="rounded-2xl bg-muted p-3 text-muted-foreground">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">{t.billingData}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.billingDesc}</p>
              </div>
            </div>
            <div className="space-y-5">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm font-medium text-muted-foreground">{t.selectedPrice}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{money(selectedPrice)} SAR</p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">{t.totalHint}</p>
              </div>
              <label className="flex items-center gap-3 rounded-2xl border bg-background p-4 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.autoRenew}
                  onChange={(event) => updateField("autoRenew", event.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                {t.autoRenew}
              </label>
              <label className="block text-sm font-medium">
                <span>{t.billingReference}</span>
                <input
                  value={form.billingReference}
                  onChange={(event) => updateField("billingReference", event.target.value)}
                  className={fieldClassName()}
                />
              </label>
              <label className="block text-sm font-medium">
                <span>{t.notes}</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  className="mt-2 min-h-[110px] w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  {t.nextStepTitle}
                </div>
                <p className="mt-2">{t.nextStepDesc}</p>
                <p className="mt-2 font-mono text-xs">{t.pending}</p>
              </div>
              <button
                type="submit"
                disabled={submitting || loading || !form.planId}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {submitting ? t.creating : t.create}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
