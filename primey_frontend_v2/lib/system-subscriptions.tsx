"use client";

import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { API_PATHS } from "@/lib/api/endpoints";

export type SystemLocale = "ar" | "en";
export type ApiRecord = Record<string, unknown>;

export type SystemSubscriptionRecord = {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  planId: string;
  planName: string;
  planCode: string;
  status: string;
  action: string;
  billingCycle: string;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number;
  isCurrent: boolean;
  isPendingPayment: boolean;
  totalAmount: string;
  currency: string;
  autoRenew: boolean;
  billingReference: string;
  hasInvoice: boolean;
  hasReceipt: boolean;
  invoiceStatus: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SystemSubscriptionStats = {
  total: number;
  current: number;
  pending_payment: number;
  active: number;
  trial: number;
  expired: number;
  cancelled: number;
  suspended: number;
  monthly: number;
  yearly: number;
  auto_renew: number;
  invoiced: number;
  receipts: number;
  total_amount: string;
};

export const emptySubscriptionStats: SystemSubscriptionStats = {
  total: 0,
  current: 0,
  pending_payment: 0,
  active: 0,
  trial: 0,
  expired: 0,
  cancelled: 0,
  suspended: 0,
  monthly: 0,
  yearly: 0,
  auto_renew: 0,
  invoiced: 0,
  receipts: 0,
  total_amount: "0.00",
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

function nestedName(value: unknown, keys: string[]) {
  const record = asRecord(value);
  for (const key of keys) {
    const resolved = text(record[key]);
    if (resolved) return resolved;
  }
  return typeof value === "string" ? value : "";
}

function normalizeStatus(value: unknown) {
  return text(value, "unknown").toLowerCase().replace(/[\s-]+/g, "_");
}

export function normalizeSubscription(value: unknown): SystemSubscriptionRecord {
  const row = asRecord(value);
  const company = asRecord(row.company);
  const plan = asRecord(row.plan);
  const lifecycle = asRecord(row.lifecycle);
  const billing = asRecord(row.billing_documents);
  const invoice = asRecord(billing.invoice);

  return {
    id: text(row.id ?? row.pk),
    companyId: text(company.id ?? row.company_id),
    companyName:
      nestedName(company, ["display_name", "name", "name_ar", "name_en"]) ||
      text(row.company_name, "—"),
    companyCode: text(company.company_code ?? company.code, "—"),
    planId: text(plan.id ?? row.plan_id),
    planName: nestedName(plan, ["name", "title", "display_name"]) || "—",
    planCode: text(plan.code ?? plan.slug),
    status: normalizeStatus(row.status ?? lifecycle.status),
    action: text(row.action, "NEW").toUpperCase(),
    billingCycle: text(row.billing_cycle, "MONTHLY").toUpperCase(),
    startDate: text(row.start_date ?? lifecycle.start_date) || null,
    endDate: text(row.end_date ?? lifecycle.end_date) || null,
    daysRemaining: numberValue(row.days_remaining ?? lifecycle.days_remaining),
    isCurrent: Boolean(row.is_current ?? lifecycle.is_current),
    isPendingPayment: Boolean(
      row.is_pending_payment ?? lifecycle.is_pending_payment,
    ),
    totalAmount: text(row.total_amount, "0.00"),
    currency: text(invoice.currency_code, "SAR").toUpperCase(),
    autoRenew: Boolean(row.auto_renew ?? lifecycle.auto_renew),
    billingReference: text(row.billing_reference),
    hasInvoice: Boolean(billing.has_invoice),
    hasReceipt: Boolean(billing.has_receipt),
    invoiceStatus: normalizeStatus(billing.invoice_status),
    createdAt: text(row.created_at) || null,
    updatedAt: text(row.updated_at) || null,
  };
}

function normalizeStats(value: unknown): SystemSubscriptionStats {
  const row = asRecord(value);
  return {
    total: numberValue(row.total),
    current: numberValue(row.current),
    pending_payment: numberValue(row.pending_payment),
    active: numberValue(row.active),
    trial: numberValue(row.trial),
    expired: numberValue(row.expired),
    cancelled: numberValue(row.cancelled),
    suspended: numberValue(row.suspended),
    monthly: numberValue(row.monthly),
    yearly: numberValue(row.yearly),
    auto_renew: numberValue(row.auto_renew),
    invoiced: numberValue(row.invoiced),
    receipts: numberValue(row.receipts),
    total_amount: text(row.total_amount, "0.00"),
  };
}

export async function fetchSystemSubscriptions(): Promise<{
  rows: SystemSubscriptionRecord[];
  stats: SystemSubscriptionStats;
}> {
  const response = await fetch(apiUrl(API_PATHS.systemSubscriptions.list), {
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

  const data = asRecord(root.data);
  const rawItems = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.results)
      ? data.results
      : [];

  return {
    rows: rawItems.map(normalizeSubscription),
    stats: normalizeStats(data.stats),
  };
}

const statusAr: Record<string, string> = {
  active: "نشط",
  trial: "تجريبي",
  pending_payment: "بانتظار الدفع",
  expired: "منتهي",
  cancelled: "ملغي",
  suspended: "موقوف",
  past_due: "متأخر السداد",
};

const statusEn: Record<string, string> = {
  active: "Active",
  trial: "Trial",
  pending_payment: "Pending payment",
  expired: "Expired",
  cancelled: "Cancelled",
  suspended: "Suspended",
  past_due: "Past due",
};

export function statusLabel(value: string, locale: SystemLocale) {
  const key = normalizeStatus(value);
  return (locale === "ar" ? statusAr : statusEn)[key] || value || "—";
}

export function statusVariant(value: string) {
  const key = normalizeStatus(value);
  if (key === "active") return "success";
  if (key === "trial") return "info";
  if (["pending_payment", "past_due"].includes(key)) return "warning";
  if (["expired", "cancelled", "suspended"].includes(key)) return "destructive";
  return "outline";
}

export function StatusBadge({
  value,
  locale,
}: {
  value: string;
  locale: SystemLocale;
}) {
  return (
    <Badge variant={statusVariant(value) as any}>
      {statusLabel(value, locale)}
    </Badge>
  );
}

const actionAr: Record<string, string> = {
  NEW: "اشتراك جديد",
  RENEWAL: "تجديد",
  UPGRADE: "ترقية",
  DOWNGRADE: "تخفيض",
  MANUAL: "يدوي",
};

export function actionLabel(value: string, locale: SystemLocale) {
  const key = text(value).toUpperCase();
  if (locale === "ar") return actionAr[key] || value || "—";
  return key ? key.replaceAll("_", " ") : "—";
}

export function billingCycleLabel(value: string, locale: SystemLocale) {
  const key = text(value).toUpperCase();
  if (locale === "ar") {
    if (key === "MONTHLY") return "شهري";
    if (key === "YEARLY") return "سنوي";
  }
  if (key === "MONTHLY") return "Monthly";
  if (key === "YEARLY") return "Yearly";
  return value || "—";
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
      <span dir="ltr" lang="en">{formatted}</span>
    </span>
  );
}
