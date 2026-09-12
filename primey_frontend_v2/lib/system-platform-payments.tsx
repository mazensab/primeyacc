"use client";

import { Badge } from "@/components/ui/badge";
import { API_PATHS } from "@/lib/api/endpoints";
import {
  apiUrl,
  asRecord,
  numberValue,
  text,
  type ApiRecord,
  type SystemLocale,
} from "@/lib/system-subscriptions";

export type { SystemLocale };

export type PaymentAllowedActions = {
  confirm: boolean;
  fail: boolean;
  cancel: boolean;
  void: boolean;
  refund: boolean;
  financialAdjustment: boolean;
};

export type SystemPlatformPaymentRecord = {
  id: string;
  paymentReference: string;
  attemptNumber: number;
  status: string;
  gateway: string;
  paymentMethod: string;
  gatewayPaymentId: string;
  transactionReference: string;
  billingReference: string;
  amount: string;
  currency: string;
  failureCode: string;
  failureMessage: string;
  cancellationReason: string;
  initiatedAt: string | null;
  processingAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  companyId: string;
  companyName: string;
  companyCode: string;
  subscriptionId: string;
  subscriptionStatus: string;
  subscriptionAction: string;
  billingCycle: string;
  subscriptionTotal: string;
  planId: string;
  planName: string;
  planSlug: string;
  invoiceId: string;
  invoiceNumber: string;
  receiptId: string;
  receiptNumber: string;
  allowed: PaymentAllowedActions;
};

export type SystemPlatformPaymentEvent = {
  id: string;
  eventType: string;
  fromStatus: string;
  toStatus: string;
  message: string;
  createdAt: string | null;
};

export type SystemPlatformRefund = {
  id: string;
  reference: string;
  status: string;
  gateway: string;
  providerRefundId: string;
  amount: string;
  currency: string;
  reason: string;
  refundedAt: string | null;
  createdAt: string | null;
};

export type SystemPlatformAdjustment = {
  id: string;
  reference: string;
  type: string;
  status: string;
  amount: string;
  currency: string;
  reason: string;
  accountingReference: string;
  postedAt: string | null;
  reversedAt: string | null;
};

export type SystemPlatformPaymentFinancial = {
  paidAmount: string;
  successfulRefundedAmount: string;
  reservedRefundAmount: string;
  remainingRefundableAmount: string;
  currency: string;
};

export type SystemPlatformPaymentDetail = SystemPlatformPaymentRecord & {
  events: SystemPlatformPaymentEvent[];
  refunds: SystemPlatformRefund[];
  adjustments: SystemPlatformAdjustment[];
  financial: SystemPlatformPaymentFinancial;
};

export type GatewayPerformanceRow = {
  gateway: string;
  total: number;
  paid: number;
  failed: number;
  successRate: string;
  failureRate: string;
};

export type PaymentMethodMetric = {
  paymentMethod: string;
  count: number;
  amount: string;
};

export type SystemPlatformPaymentMetrics = {
  total: number;
  pending: number;
  processing: number;
  paid: number;
  failed: number;
  cancelled: number;
  grossPaid: string;
  successRate: string;
  failureRate: string;
  currency: string;
  gatewayPerformance: GatewayPerformanceRow[];
  paymentMethods: PaymentMethodMetric[];
};

export type PaymentListQuery = {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type PaymentListResult = {
  rows: SystemPlatformPaymentRecord[];
  count: number;
  page: number;
  pageSize: number;
  pages: number;
};

function normalizeStatus(value: unknown) {
  return text(value, "unknown").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function bool(value: unknown) {
  return value === true || value === 1 || value === "true";
}

async function requestJson(path: string): Promise<ApiRecord> {
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

export function normalizePlatformPayment(value: unknown): SystemPlatformPaymentRecord {
  const row = asRecord(value);
  const company = asRecord(row.company);
  const subscription = asRecord(row.subscription);
  const plan = asRecord(subscription.plan);
  const invoice = asRecord(row.invoice);
  const receipt = asRecord(row.receipt);
  const allowed = asRecord(row.allowed_actions);

  return {
    id: text(row.id ?? row.pk),
    paymentReference: text(row.payment_reference, "—"),
    attemptNumber: numberValue(row.attempt_number),
    status: normalizeStatus(row.status),
    gateway: text(row.gateway, "—").toUpperCase(),
    paymentMethod: text(row.payment_method, "—").toUpperCase(),
    gatewayPaymentId: text(row.gateway_payment_id),
    transactionReference: text(row.transaction_reference),
    billingReference: text(row.billing_reference),
    amount: text(row.amount, "0.00"),
    currency: text(row.currency_code, "SAR").toUpperCase(),
    failureCode: text(row.failure_code),
    failureMessage: text(row.failure_message),
    cancellationReason: text(row.cancellation_reason),
    initiatedAt: text(row.initiated_at) || null,
    processingAt: text(row.processing_at) || null,
    paidAt: text(row.paid_at) || null,
    failedAt: text(row.failed_at) || null,
    cancelledAt: text(row.cancelled_at) || null,
    createdAt: text(row.created_at) || null,
    updatedAt: text(row.updated_at) || null,
    companyId: text(company.id ?? row.company_id),
    companyName: text(company.display_name ?? company.name, "—"),
    companyCode: text(company.company_code ?? company.code, "—"),
    subscriptionId: text(subscription.id ?? row.subscription_id),
    subscriptionStatus: normalizeStatus(subscription.status),
    subscriptionAction: text(subscription.action).toUpperCase(),
    billingCycle: text(subscription.billing_cycle).toUpperCase(),
    subscriptionTotal: text(subscription.total_amount, "0.00"),
    planId: text(plan.id),
    planName: text(plan.name, "—"),
    planSlug: text(plan.slug),
    invoiceId: text(invoice.id),
    invoiceNumber: text(invoice.document_number),
    receiptId: text(receipt.id),
    receiptNumber: text(receipt.document_number),
    allowed: {
      confirm: bool(allowed.confirm),
      fail: bool(allowed.fail),
      cancel: bool(allowed.cancel),
      void: bool(allowed.void),
      refund: bool(allowed.refund),
      financialAdjustment: bool(allowed.financial_adjustment),
    },
  };
}

function normalizeEvent(value: unknown): SystemPlatformPaymentEvent {
  const row = asRecord(value);
  return {
    id: text(row.id),
    eventType: text(row.event_type, "—").toUpperCase(),
    fromStatus: normalizeStatus(row.from_status),
    toStatus: normalizeStatus(row.to_status),
    message: text(row.message),
    createdAt: text(row.created_at) || null,
  };
}

function normalizeRefund(value: unknown): SystemPlatformRefund {
  const row = asRecord(value);
  return {
    id: text(row.id),
    reference: text(row.refund_reference, "—"),
    status: normalizeStatus(row.status),
    gateway: text(row.gateway, "—").toUpperCase(),
    providerRefundId: text(row.provider_refund_id),
    amount: text(row.amount, "0.00"),
    currency: text(row.currency_code, "SAR").toUpperCase(),
    reason: text(row.reason),
    refundedAt: text(row.refunded_at) || null,
    createdAt: text(row.created_at) || null,
  };
}

function normalizeAdjustment(value: unknown): SystemPlatformAdjustment {
  const row = asRecord(value);
  return {
    id: text(row.id),
    reference: text(row.adjustment_reference, "—"),
    type: text(row.adjustment_type, "—").toUpperCase(),
    status: normalizeStatus(row.status),
    amount: text(row.amount, "0.00"),
    currency: text(row.currency_code, "SAR").toUpperCase(),
    reason: text(row.reason),
    accountingReference: text(row.accounting_reference),
    postedAt: text(row.posted_at) || null,
    reversedAt: text(row.reversed_at) || null,
  };
}

function normalizeFinancial(
  value: unknown,
  payment: SystemPlatformPaymentRecord,
): SystemPlatformPaymentFinancial {
  const row = asRecord(value);
  return {
    paidAmount: text(row.paid_amount, payment.amount),
    successfulRefundedAmount: text(
      row.successful_refunded_amount ?? row.refunded_amount,
      "0.00",
    ),
    reservedRefundAmount: text(row.reserved_refund_amount, "0.00"),
    remainingRefundableAmount: text(row.remaining_refundable_amount, "0.00"),
    currency: text(row.currency_code, payment.currency || "SAR").toUpperCase(),
  };
}

export async function fetchSystemPlatformPayments(
  query: PaymentListQuery = {},
): Promise<PaymentListResult> {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.status?.trim() && query.status !== "all") {
    params.set("status", query.status.trim().toUpperCase());
  }
  params.set("page", String(Math.max(1, query.page || 1)));
  params.set("page_size", String(Math.min(100, Math.max(1, query.pageSize || 50))));

  const root = await requestJson(
    `${API_PATHS.systemSubscriptionPayments.list}?${params.toString()}`,
  );
  const data = asRecord(root.data);
  const rawRows = Array.isArray(data.results)
    ? data.results
    : Array.isArray(data.items)
      ? data.items
      : [];

  return {
    rows: rawRows.map(normalizePlatformPayment),
    count: numberValue(data.count),
    page: Math.max(1, numberValue(data.page, 1)),
    pageSize: Math.max(1, numberValue(data.page_size, query.pageSize || 50)),
    pages: Math.max(1, numberValue(data.pages, 1)),
  };
}

export async function fetchAllSystemPlatformPayments(
  query: Omit<PaymentListQuery, "page" | "pageSize"> = {},
): Promise<SystemPlatformPaymentRecord[]> {
  const first = await fetchSystemPlatformPayments({
    ...query,
    page: 1,
    pageSize: 100,
  });

  const rows = [...first.rows];
  for (let page = 2; page <= first.pages; page += 1) {
    const next = await fetchSystemPlatformPayments({
      ...query,
      page,
      pageSize: 100,
    });
    rows.push(...next.rows);
  }
  return rows;
}

export async function fetchSystemPlatformPaymentDetail(
  id: string | number,
): Promise<SystemPlatformPaymentDetail> {
  const root = await requestJson(API_PATHS.systemSubscriptionPayments.detail(id));
  const data = asRecord(root.data);
  const rawPayment = asRecord(data.payment);
  const base = normalizePlatformPayment(rawPayment);

  const events = Array.isArray(rawPayment.events)
    ? rawPayment.events.map(normalizeEvent)
    : [];
  const refunds = Array.isArray(rawPayment.refunds)
    ? rawPayment.refunds.map(normalizeRefund)
    : [];
  const adjustments = Array.isArray(rawPayment.adjustments)
    ? rawPayment.adjustments.map(normalizeAdjustment)
    : [];

  return {
    ...base,
    events,
    refunds,
    adjustments,
    financial: normalizeFinancial(rawPayment.financial, base),
  };
}

export async function fetchSystemPlatformPaymentMetrics(): Promise<SystemPlatformPaymentMetrics> {
  const root = await requestJson(API_PATHS.systemPlatformReports.overview);
  const data = asRecord(root.data);
  const payments = asRecord(data.payments);
  const status = asRecord(payments.status);

  const gateways = Array.isArray(payments.gateway_performance)
    ? payments.gateway_performance
    : [];
  const methods = Array.isArray(payments.payment_methods)
    ? payments.payment_methods
    : [];

  return {
    total: numberValue(status.total),
    pending: numberValue(status.pending),
    processing: numberValue(status.processing),
    paid: numberValue(status.paid),
    failed: numberValue(status.failed),
    cancelled: numberValue(status.cancelled),
    grossPaid: text(payments.gross_paid, "0.00"),
    successRate: text(payments.success_rate, "0.00"),
    failureRate: text(payments.failure_rate, "0.00"),
    currency: text(payments.currency_code, "SAR").toUpperCase(),
    gatewayPerformance: gateways.map((value) => {
      const row = asRecord(value);
      return {
        gateway: text(row.gateway, "UNSPECIFIED").toUpperCase(),
        total: numberValue(row.total),
        paid: numberValue(row.paid),
        failed: numberValue(row.failed),
        successRate: text(row.success_rate, "0.00"),
        failureRate: text(row.failure_rate, "0.00"),
      };
    }),
    paymentMethods: methods.map((value) => {
      const row = asRecord(value);
      return {
        paymentMethod: text(row.payment_method, "UNSPECIFIED").toUpperCase(),
        count: numberValue(row.count),
        amount: text(row.amount, "0.00"),
      };
    }),
  };
}

const statusAr: Record<string, string> = {
  pending: "بانتظار الدفع",
  processing: "قيد المعالجة",
  paid: "مدفوعة",
  failed: "فاشلة",
  cancelled: "ملغاة",
  voided: "ملغاة لدى المزود",
  refunded: "مستردة",
  partially_refunded: "مستردة جزئيًا",
};

const statusEn: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
  voided: "Voided",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

export function paymentStatusLabel(value: string, locale: SystemLocale) {
  const key = normalizeStatus(value);
  return (locale === "ar" ? statusAr : statusEn)[key] || value || "—";
}

export function paymentStatusVariant(value: string) {
  const key = normalizeStatus(value);
  if (["paid", "refunded"].includes(key)) return "success";
  if (key === "processing") return "info";
  if (["pending", "partially_refunded"].includes(key)) return "warning";
  if (["failed", "cancelled", "voided"].includes(key)) return "destructive";
  return "outline";
}

export function PlatformPaymentStatusBadge({
  value,
  locale,
}: {
  value: string;
  locale: SystemLocale;
}) {
  return (
    <Badge variant={paymentStatusVariant(value) as any}>
      {paymentStatusLabel(value, locale)}
    </Badge>
  );
}
