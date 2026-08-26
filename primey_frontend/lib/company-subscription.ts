"use client";
export type AppLocale = "ar" | "en";
export type ApiRecord = Record<string, unknown>;
export type SubscriptionAccess = {
  access: "FULL" | "BILLING_ONLY" | "DENIED" | string;
  reason: string;
  status: string | null;
  subscription_id: number | null;
  plan_id: number | null;
  plan_name: string;
  can_use_workspace: boolean;
  can_manage_subscription: boolean;
  can_pay: boolean;
  can_renew: boolean;
  can_change_plan: boolean;
  days_remaining: number;
  expires_at: string | null;
  is_in_grace: boolean;
  grace_days_remaining: number;
  grace_expires_at: string | null;
};
export type SubscriptionSnapshot = {
  id: number;
  plan_id: number | null;
  plan_name: string;
  status: string;
  action: string;
  billing_cycle: string;
  start_date: string | null;
  end_date: string | null;
  days_remaining: number;
  is_in_grace: boolean;
  grace_days_remaining: number;
  grace_expires_at: string | null;
  auto_renew: boolean;
  price: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  billing_reference: string;
  paid_at: string | null;
  activated_at: string | null;
};
export type SubscriptionPlan = {
  id: number;
  name: string;
  code: string;
  slug: string;
  description: string;
  monthly_price: string;
  yearly_price: string;
  max_users: number;
  max_branches: number;
  max_warehouses: number;
  max_pos: number;
  features: unknown[];
  is_active?: boolean;
  is_public?: boolean;
};
export type BillingDocument = {
  id: number | string;
  document_number: string;
  document_type: string;
  status: string;
  total_amount: string;
  currency_code: string;
  issued_at?: string | null;
  created_at?: string | null;
};
export type SubscriptionPayment = {
  id: number | string;
  payment_reference: string;
  status: string;
  gateway: string;
  payment_method: string;
  amount: string;
  currency_code: string;
  transaction_reference: string;
  billing_reference: string;
  gateway_payment_id: string;
  invoice_id: number | string | null;
  receipt_id: number | string | null;
  failure_code: string;
  failure_message: string;
  cancellation_reason: string;
  initiated_at?: string | null;
  processing_at?: string | null;
  paid_at?: string | null;
  failed_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  invoice?: BillingDocument | null;
  receipt?: BillingDocument | null;
};
export type SubscriptionDetailData = {
  company: ApiRecord;
  subscription_access: SubscriptionAccess;
  effective_subscription: SubscriptionSnapshot | null;
  current_subscription: SubscriptionSnapshot | null;
  latest_subscription: SubscriptionSnapshot | null;
  pending_subscription?: SubscriptionSnapshot | null;
};
export type BillingData = {
  payments: SubscriptionPayment[];
  documents: BillingDocument[];
  invoices: BillingDocument[];
  receipts: BillingDocument[];
};
export const SUBSCRIPTION_ENDPOINTS = {
  detail: "/api/company/subscription/",
  plans: "/api/company/subscription/plans/",
  billing: "/api/company/subscription/billing/",
  renew: "/api/company/subscription/renew/",
  changePlan: "/api/company/subscription/change-plan/",
} as const;
export function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}
export function text(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const result = String(value).trim();
  return result || fallback;
}
export function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(
    String(value ?? "")
      .replaceAll(",", "")
      .replace(/[^\d.-]/g, ""),
  );
  return Number.isFinite(parsed) ? parsed : fallback;
}
export function getStoredLocale(): AppLocale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
export function apiBase(): string {
  const value = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  return value.endsWith("/api") ? value.slice(0, -4) : value;
}
export function apiUrl(path: string): string {
  return `${apiBase()}${path}`;
}
function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const row = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));
  return row ? decodeURIComponent(row.slice(name.length + 1)) : "";
}
export async function subscriptionRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = String(options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  headers.set("X-Requested-With", "XMLHttpRequest");
  if (method !== "GET" && method !== "HEAD") {
    headers.set("Content-Type", "application/json");
    const csrf = getCookie("csrftoken");
    if (csrf) {
      headers.set("X-CSRFToken", csrf);
    }
  }
  const response = await fetch(apiUrl(path), {
    ...options,
    method,
    headers,
    credentials: "include",
    cache: "no-store",
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
  if (!response.ok) {
    const record = asRecord(payload);
    const message =
      text(record.message) ||
      text(record.detail) ||
      text(record.error) ||
      `HTTP ${response.status}`;
    const error = new Error(message) as Error & {
      status?: number;
      code?: string;
      payload?: unknown;
    };
    error.status = response.status;
    error.code = text(record.code);
    error.payload = payload;
    throw error;
  }
  return payload as T;
}
export function unwrapData(payload: unknown): ApiRecord {
  const record = asRecord(payload);
  return asRecord(record.data);
}
export function normalizeAccess(value: unknown): SubscriptionAccess {
  const row = asRecord(value);
  return {
    access: text(row.access, "DENIED"),
    reason: text(row.reason),
    status: row.status == null ? null : text(row.status),
    subscription_id:
      row.subscription_id == null ? null : numberValue(row.subscription_id),
    plan_id: row.plan_id == null ? null : numberValue(row.plan_id),
    plan_name: text(row.plan_name),
    can_use_workspace: Boolean(row.can_use_workspace),
    can_manage_subscription: Boolean(row.can_manage_subscription),
    can_pay: Boolean(row.can_pay),
    can_renew: Boolean(row.can_renew),
    can_change_plan: Boolean(row.can_change_plan),
    days_remaining: numberValue(row.days_remaining),
    expires_at: row.expires_at == null ? null : text(row.expires_at),
    is_in_grace: Boolean(row.is_in_grace),
    grace_days_remaining: numberValue(row.grace_days_remaining),
    grace_expires_at:
      row.grace_expires_at == null ? null : text(row.grace_expires_at),
  };
}
export function normalizeSubscription(
  value: unknown,
): SubscriptionSnapshot | null {
  if (!isRecord(value)) return null;

  const plan = asRecord(value.plan);

  const rawPlanId =
    value.plan_id ??
    plan.id;

  const rawPlanName =
    value.plan_name ??
    plan.name;

  return {
    id: numberValue(value.id),
    plan_id:
      rawPlanId == null
        ? null
        : numberValue(rawPlanId),
    plan_name: text(rawPlanName),
    status: text(value.status),
    action: text(value.action),
    billing_cycle: text(value.billing_cycle),
    start_date: value.start_date == null ? null : text(value.start_date),
    end_date: value.end_date == null ? null : text(value.end_date),
    days_remaining: numberValue(value.days_remaining),
    is_in_grace: Boolean(value.is_in_grace),
    grace_days_remaining: numberValue(value.grace_days_remaining),
    grace_expires_at:
      value.grace_expires_at == null ? null : text(value.grace_expires_at),
    auto_renew: Boolean(value.auto_renew),
    price: text(value.price, "0.00"),
    discount_amount: text(value.discount_amount, "0.00"),
    tax_amount: text(value.tax_amount, "0.00"),
    total_amount: text(value.total_amount, "0.00"),
    billing_reference: text(value.billing_reference),
    paid_at: value.paid_at == null ? null : text(value.paid_at),
    activated_at: value.activated_at == null ? null : text(value.activated_at),
  };
}
export function normalizePlan(value: unknown): SubscriptionPlan {
  const row = asRecord(value);
  return {
    id: numberValue(row.id),
    name: text(row.name),
    code: text(row.code),
    slug: text(row.slug),
    description: text(row.description),
    monthly_price: text(row.monthly_price, "0.00"),
    yearly_price: text(row.yearly_price, "0.00"),
    max_users: numberValue(row.max_users),
    max_branches: numberValue(row.max_branches),
    max_warehouses: numberValue(row.max_warehouses),
    max_pos: numberValue(row.max_pos),
    features: Array.isArray(row.features) ? row.features : [],
    is_active: row.is_active == null ? undefined : Boolean(row.is_active),
    is_public: row.is_public == null ? undefined : Boolean(row.is_public),
  };
}
export function normalizeDocument(value: unknown): BillingDocument {
  const row = asRecord(value);
  return {
    id: text(row.id),
    document_number: text(row.document_number || row.number, "—"),
    document_type: text(row.document_type || row.type),
    status: text(row.status),
    total_amount: text(row.total_amount || row.amount, "0.00"),
    currency_code: text(row.currency_code, "SAR"),
    issued_at: row.issued_at == null ? null : text(row.issued_at),
    created_at: row.created_at == null ? null : text(row.created_at),
  };
}
export function normalizePayment(value: unknown): SubscriptionPayment {
  const row = asRecord(value);
  return {
    id: text(row.id),
    payment_reference: text(row.payment_reference, "—"),
    status: text(row.status),
    gateway: text(row.gateway),
    payment_method: text(row.payment_method),
    amount: text(row.amount, "0.00"),
    currency_code: text(row.currency_code, "SAR"),
    transaction_reference: text(row.transaction_reference),
    billing_reference: text(row.billing_reference),
    gateway_payment_id: text(row.gateway_payment_id),
    invoice_id:
      row.invoice_id == null
        ? null
        : text(row.invoice_id),
    receipt_id:
      row.receipt_id == null
        ? null
        : text(row.receipt_id),
    failure_code: text(row.failure_code),
    failure_message: text(row.failure_message),
    cancellation_reason: text(row.cancellation_reason),
    initiated_at: row.initiated_at == null ? null : text(row.initiated_at),
    processing_at: row.processing_at == null ? null : text(row.processing_at),
    paid_at: row.paid_at == null ? null : text(row.paid_at),
    failed_at: row.failed_at == null ? null : text(row.failed_at),
    cancelled_at: row.cancelled_at == null ? null : text(row.cancelled_at),
    created_at: row.created_at == null ? null : text(row.created_at),
    invoice: isRecord(row.invoice) ? normalizeDocument(row.invoice) : null,
    receipt: isRecord(row.receipt) ? normalizeDocument(row.receipt) : null,
  };
}
function normalizeArray<T>(
  value: unknown,
  normalizer: (value: unknown) => T,
): T[] {
  return Array.isArray(value) ? value.map(normalizer) : [];
}
export function normalizeBilling(payload: unknown): BillingData {
  const data = unwrapData(payload);
  const documents = normalizeArray(data.documents, normalizeDocument);
  const explicitInvoices = normalizeArray(data.invoices, normalizeDocument);
  const explicitReceipts = normalizeArray(data.receipts, normalizeDocument);

  const invoices =
    explicitInvoices.length > 0
      ? explicitInvoices
      : documents.filter((row) =>
          row.document_type.toUpperCase().includes("INVOICE"),
        );

  const receipts =
    explicitReceipts.length > 0
      ? explicitReceipts
      : documents.filter((row) =>
          row.document_type.toUpperCase().includes("RECEIPT"),
        );

  const documentsById = new Map(
    documents.map((document) => [
      String(document.id),
      document,
    ]),
  );

  const payments = normalizeArray(
    data.payments,
    normalizePayment,
  ).map((payment) => ({
    ...payment,
    invoice:
      payment.invoice ||
      (
        payment.invoice_id == null
          ? null
          : documentsById.get(String(payment.invoice_id)) || null
      ),
    receipt:
      payment.receipt ||
      (
        payment.receipt_id == null
          ? null
          : documentsById.get(String(payment.receipt_id)) || null
      ),
  }));

  return {
    payments,
    documents,
    invoices,
    receipts,
  };
}
export function formatMoney(value: unknown): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue(value));
}
export function formatInteger(value: unknown): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(numberValue(value));
}
export function formatDate(value: unknown): string {
  const raw = text(value);
  if (!raw) return "—";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw.slice(0, 10) || "—";
  }
  return parsed.toISOString().slice(0, 10);
}
