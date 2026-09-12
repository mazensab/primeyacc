"use client";

import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { API_PATHS } from "@/lib/api/endpoints";

export type SystemLocale = "ar" | "en";
export type ApiRecord = Record<string, unknown>;

export type SystemPlanRecord = {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  maxPos: number;
  features: string[];
  active: boolean;
  public: boolean;
  sortOrder: number;
  linkedSubscriptions: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SystemPlanDetailStats = {
  subscriptionsTotal: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  suspendedSubscriptions: number;
};

export type SystemPlanDetail = SystemPlanRecord & {
  stats: SystemPlanDetailStats;
};

export type SystemPlanRecentSubscription = {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  status: string;
  billingCycle: string;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number;
  totalAmount: string;
  autoRenew: boolean;
  isCurrent: boolean;
  createdAt: string | null;
};

export type SystemPlanStats = {
  total: number;
  active: number;
  inactive: number;
  public: number;
  internal: number;
};

export const emptyPlanStats: SystemPlanStats = {
  total: 0,
  active: 0,
  inactive: 0,
  public: 0,
  internal: 0,
};

export function readSystemLocale(): SystemLocale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("Mhamcloud-locale") === "en" ? "en" : "ar";
}

export function apiBase() {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return raw.endsWith("/api") ? raw.slice(0, -4) : raw;
}

export function apiUrl(path: string) {
  return `${apiBase()}${path}`;
}

export function asRecord(value: unknown): ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as ApiRecord)
    : {};
}

export function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

export function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function boolValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

export function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(numberValue(value)));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).replace("T", " ").slice(0, 16);
  }
  return parsed.toISOString().replace("T", " ").slice(0, 16);
}

export function MoneyValue({
  amount,
  currency = "SAR",
}: {
  amount: string | number;
  currency?: string;
}) {
  const parsed = numberValue(amount);
  const formatted = parsed.toFixed(2);
  const normalized = text(currency, "SAR").toUpperCase();

  if (normalized !== "SAR") {
    return (
      <span dir="ltr" lang="en" className="tabular-nums">
        {formatted} {normalized}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 font-medium tabular-nums">
      <Image
        src="/currency/sar.svg"
        alt="SAR"
        width={15}
        height={15}
        className="size-[15px]"
      />
      <span dir="ltr" lang="en">
        {formatted}
      </span>
    </span>
  );
}

export function PlanStateBadge({
  active,
  locale,
}: {
  active: boolean;
  locale: SystemLocale;
}) {
  return (
    <Badge variant={active ? "success" : "destructive"}>
      {active
        ? locale === "ar"
          ? "مفعلة"
          : "Active"
        : locale === "ar"
          ? "موقفة"
          : "Inactive"}
    </Badge>
  );
}

export function PlanVisibilityBadge({
  isPublic,
  locale,
}: {
  isPublic: boolean;
  locale: SystemLocale;
}) {
  return (
    <Badge variant={isPublic ? "info" : "outline"}>
      {isPublic
        ? locale === "ar"
          ? "عامة"
          : "Public"
        : locale === "ar"
          ? "داخلية"
          : "Internal"}
    </Badge>
  );
}

export function normalizePlan(value: unknown): SystemPlanRecord {
  const row = asRecord(value);

  return {
    id: text(row.id ?? row.pk),
    name: text(row.name, "—"),
    code: text(row.code, "—").toUpperCase(),
    slug: text(row.slug, "—"),
    description: text(row.description),
    monthlyPrice: text(row.monthly_price, "0.00"),
    yearlyPrice: text(row.yearly_price, "0.00"),
    maxUsers: numberValue(row.max_users),
    maxBranches: numberValue(row.max_branches),
    maxWarehouses: numberValue(row.max_warehouses),
    maxPos: numberValue(row.max_pos),
    features: Array.isArray(row.features)
      ? row.features.map((item) => text(item)).filter(Boolean)
      : [],
    active: boolValue(row.is_active, true),
    public: boolValue(row.is_public, true),
    sortOrder: numberValue(row.sort_order),
    linkedSubscriptions: numberValue(row.companies_count),
    createdAt: text(row.created_at) || null,
    updatedAt: text(row.updated_at) || null,
  };
}

function normalizeStats(value: unknown): SystemPlanStats {
  const row = asRecord(value);
  return {
    total: numberValue(row.total),
    active: numberValue(row.active),
    inactive: numberValue(row.inactive),
    public: numberValue(row.public),
    internal: numberValue(row.internal),
  };
}

function normalizeDetailStats(value: unknown): SystemPlanDetailStats {
  const row = asRecord(value);
  return {
    subscriptionsTotal: numberValue(row.subscriptions_total),
    activeSubscriptions: numberValue(row.active_subscriptions),
    trialSubscriptions: numberValue(row.trial_subscriptions),
    expiredSubscriptions: numberValue(row.expired_subscriptions),
    cancelledSubscriptions: numberValue(row.cancelled_subscriptions),
    suspendedSubscriptions: numberValue(row.suspended_subscriptions),
  };
}

function normalizeRecentSubscription(value: unknown): SystemPlanRecentSubscription {
  const row = asRecord(value);
  const company = asRecord(row.company);

  return {
    id: text(row.id ?? row.pk),
    companyId: text(company.id ?? row.company_id),
    companyName: text(company.name ?? company.display_name, "—"),
    companyCode: text(company.company_code ?? company.code, "—"),
    status: text(row.status, "UNKNOWN"),
    billingCycle: text(row.billing_cycle, "MONTHLY"),
    startDate: text(row.start_date) || null,
    endDate: text(row.end_date) || null,
    daysRemaining: numberValue(row.days_remaining),
    totalAmount: text(row.total_amount, "0.00"),
    autoRenew: boolValue(row.auto_renew),
    isCurrent: boolValue(row.is_current),
    createdAt: text(row.created_at) || null,
  };
}

async function readJson(path: string) {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const raw = await response.text();
  let payload: unknown = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = {};
    }
  }

  const root = asRecord(payload);
  if (!response.ok || root.ok === false) {
    throw new Error(
      text(root.message) ||
        text(root.detail) ||
        text(root.error) ||
        `HTTP ${response.status}`,
    );
  }

  return root;
}

export async function fetchSystemPlans(): Promise<{
  rows: SystemPlanRecord[];
  stats: SystemPlanStats;
}> {
  const root = await readJson(API_PATHS.systemPlans.list);
  const data = asRecord(root.data);
  const rawItems = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.results)
      ? data.results
      : [];

  return {
    rows: rawItems.map(normalizePlan),
    stats: normalizeStats(data.stats),
  };
}

export async function fetchSystemPlanDetail(id: string): Promise<{
  plan: SystemPlanDetail;
  recentSubscriptions: SystemPlanRecentSubscription[];
}> {
  const root = await readJson(API_PATHS.systemPlans.detail(id));
  const data = asRecord(root.data);
  const rawPlan = asRecord(data.plan);

  if (!Object.keys(rawPlan).length) {
    throw new Error("PLAN_NOT_FOUND");
  }

  const base = normalizePlan(rawPlan);
  const plan: SystemPlanDetail = {
    ...base,
    linkedSubscriptions: numberValue(asRecord(rawPlan.stats).subscriptions_total),
    stats: normalizeDetailStats(rawPlan.stats),
  };

  const recent = Array.isArray(data.recent_subscriptions)
    ? data.recent_subscriptions.map(normalizeRecentSubscription)
    : [];

  return {
    plan,
    recentSubscriptions: recent,
  };
}


export type SystemPlanMutationInput = {
  name: string;
  code: string;
  slug: string;
  description: string;
  monthly_price: string | number;
  yearly_price: string | number;
  max_users: number;
  max_branches: number;
  max_warehouses: number;
  max_pos: number;
  features: string[];
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
};

export type SystemPlanStatusAction = "activate" | "deactivate" | "publish" | "hide";

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const found = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
}

async function ensureCsrfToken() {
  let token = getCookie("csrftoken");
  if (token) return token;
  await fetch(apiUrl(API_PATHS.auth.csrf), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  });
  token = getCookie("csrftoken");
  return token;
}

async function mutateSystemPlan(path: string, method: "POST" | "PATCH", body: unknown) {
  const csrf = await ensureCsrfToken();
  const response = await fetch(apiUrl(path), {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrf ? { "X-CSRFToken": csrf } : {}),
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let payload: unknown = {};
  if (raw) {
    try { payload = JSON.parse(raw) as unknown; } catch { payload = {}; }
  }

  const root = asRecord(payload);
  if (!response.ok || root.ok === false) {
    const errors = asRecord(root.errors);
    const firstError = Object.values(errors)[0];
    throw new Error(
      text(root.message) ||
        text(root.detail) ||
        (Array.isArray(firstError) ? text(firstError[0]) : text(firstError)) ||
        `HTTP ${response.status}`,
    );
  }
  return root;
}

function mutationPlan(root: ApiRecord) {
  const data = asRecord(root.data);
  const rawPlan = asRecord(data.plan);
  if (!Object.keys(rawPlan).length) throw new Error("PLAN_MUTATION_RESPONSE_MISSING_PLAN");
  return normalizePlan(rawPlan);
}

export async function createSystemPlan(input: SystemPlanMutationInput) {
  return mutationPlan(await mutateSystemPlan(API_PATHS.systemPlans.create, "POST", input));
}

export async function updateSystemPlan(id: string, input: SystemPlanMutationInput) {
  return mutationPlan(await mutateSystemPlan(API_PATHS.systemPlans.update(id), "POST", input));
}

export async function changeSystemPlanStatus(id: string, action: SystemPlanStatusAction) {
  return mutationPlan(await mutateSystemPlan(API_PATHS.systemPlans.status(id), "POST", { action }));
}

export const PLAN_FEATURE_OPTIONS = [
  { key: "general_accounting", ar: "الحسابات العامة", en: "General accounting" },
  { key: "sales_pos", ar: "المبيعات ونقاط البيع", en: "Sales and POS" },
  { key: "purchases_suppliers", ar: "المشتريات والموردون", en: "Purchases and suppliers" },
  { key: "inventory_warehouses", ar: "المخزون والمستودعات", en: "Inventory and warehouses" },
  { key: "hr", ar: "الموارد البشرية", en: "Human resources" },
  { key: "whatsapp_communications", ar: "التواصل والواتساب", en: "Communications and WhatsApp" },
  { key: "advanced_reports", ar: "التقارير المتقدمة", en: "Advanced reports" },
  { key: "api_integrations", ar: "التكاملات و API", en: "Integrations and API" },
] as const;

export function planFeatureLabel(feature: string, locale: SystemLocale) {
  const match = PLAN_FEATURE_OPTIONS.find((item) => item.key === feature);
  return match ? match[locale] : feature;
}
