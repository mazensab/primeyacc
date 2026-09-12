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

export type SystemBillingDocumentRecord = {
  id: string;
  documentType: string;
  status: string;
  documentNumber: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  subscriptionId: string;
  subscriptionStatus: string;
  planName: string;
  relatedInvoiceId: string;
  relatedInvoiceNumber: string;
  currency: string;
  subtotal: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  billingReference: string;
  transactionReference: string;
  paymentMethod: string;
  issueDate: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string;
  notes: string;
  isInvoice: boolean;
  isPaymentReceipt: boolean;
  isPaid: boolean;
  isCancelled: boolean;
  allowedPrint: boolean;
  allowedCreateReceipt: boolean;
};

export type SystemBillingDocumentStats = {
  total: number;
  subscriptionInvoices: number;
  paymentReceipts: number;
  draft: number;
  issued: number;
  paid: number;
  cancelled: number;
  subtotal: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
};

export type SystemBillingDocumentDetail = {
  document: SystemBillingDocumentRecord;
  seller: ApiRecord;
  buyer: ApiRecord;
  subscriptionSnapshot: ApiRecord;
  planSnapshot: ApiRecord;
  paymentReceipts: SystemBillingDocumentRecord[];
};

export type SystemBillingDocumentFilters = {
  search?: string;
  documentType?: string;
  status?: string;
  issueDateFrom?: string;
  issueDateTo?: string;
};

export const emptyBillingDocumentStats: SystemBillingDocumentStats = {
  total: 0,
  subscriptionInvoices: 0,
  paymentReceipts: 0,
  draft: 0,
  issued: 0,
  paid: 0,
  cancelled: 0,
  subtotal: "0.00",
  discountAmount: "0.00",
  taxableAmount: "0.00",
  taxAmount: "0.00",
  totalAmount: "0.00",
  paidAmount: "0.00",
  balanceAmount: "0.00",
};

function normalizeStatus(value: unknown) {
  return text(value, "UNKNOWN").toUpperCase().replace(/[\s-]+/g, "_");
}

function normalizeDocumentType(value: unknown) {
  return text(value, "UNKNOWN").toUpperCase().replace(/[\s-]+/g, "_");
}

function nestedName(value: unknown, keys: string[]) {
  const record = asRecord(value);
  for (const key of keys) {
    const resolved = text(record[key]);
    if (resolved) return resolved;
  }
  return "";
}

export function normalizeBillingDocument(
  value: unknown,
): SystemBillingDocumentRecord {
  const row = asRecord(value);
  const company = asRecord(row.company);
  const subscription = asRecord(row.subscription);
  const plan = asRecord(subscription.plan);
  const related = asRecord(row.related_invoice);
  const amounts = asRecord(row.amounts);
  const allowedActions = asRecord(row.allowed_actions);

  return {
    id: text(row.id ?? row.pk),
    documentType: normalizeDocumentType(row.document_type),
    status: normalizeStatus(row.status),
    documentNumber: text(row.document_number, "—"),
    companyId: text(company.id ?? row.company_id),
    companyName:
      nestedName(company, ["display_name", "name", "name_ar", "name_en"]) || "—",
    companyCode: text(company.company_code ?? company.code, "—"),
    subscriptionId: text(subscription.id ?? row.subscription_id),
    subscriptionStatus: text(subscription.status).toUpperCase(),
    planName: nestedName(plan, ["name", "title", "display_name"]) || "—",
    relatedInvoiceId: text(related.id ?? row.related_invoice_id),
    relatedInvoiceNumber: text(related.document_number),
    currency: text(row.currency_code, "SAR").toUpperCase(),
    subtotal: text(amounts.subtotal ?? row.subtotal, "0.00"),
    discountAmount: text(
      amounts.discount_amount ?? row.discount_amount,
      "0.00",
    ),
    taxableAmount: text(
      amounts.taxable_amount ?? row.taxable_amount,
      "0.00",
    ),
    taxAmount: text(amounts.tax_amount ?? row.tax_amount, "0.00"),
    totalAmount: text(amounts.total_amount ?? row.total_amount, "0.00"),
    paidAmount: text(amounts.paid_amount ?? row.paid_amount, "0.00"),
    balanceAmount: text(
      amounts.balance_amount ?? row.balance_amount,
      "0.00",
    ),
    billingReference: text(row.billing_reference),
    transactionReference: text(row.transaction_reference),
    paymentMethod: text(row.payment_method),
    issueDate: text(row.issue_date) || null,
    issuedAt: text(row.issued_at) || null,
    paidAt: text(row.paid_at) || null,
    cancelledAt: text(row.cancelled_at) || null,
    cancellationReason: text(row.cancellation_reason),
    notes: text(row.notes),
    isInvoice: Boolean(row.is_invoice),
    isPaymentReceipt: Boolean(row.is_payment_receipt),
    isPaid: Boolean(row.is_paid),
    isCancelled: Boolean(row.is_cancelled),
    allowedPrint: Boolean(allowedActions.print),
    allowedCreateReceipt: Boolean(allowedActions.create_receipt),
  };
}

function normalizeStats(value: unknown): SystemBillingDocumentStats {
  const row = asRecord(value);
  const amounts = asRecord(row.amounts);

  return {
    total: numberValue(row.total),
    subscriptionInvoices: numberValue(row.subscription_invoices),
    paymentReceipts: numberValue(row.payment_receipts),
    draft: numberValue(row.draft),
    issued: numberValue(row.issued),
    paid: numberValue(row.paid),
    cancelled: numberValue(row.cancelled),
    subtotal: text(amounts.subtotal, "0.00"),
    discountAmount: text(amounts.discount_amount, "0.00"),
    taxableAmount: text(amounts.taxable_amount, "0.00"),
    taxAmount: text(amounts.tax_amount, "0.00"),
    totalAmount: text(amounts.total_amount, "0.00"),
    paidAmount: text(amounts.paid_amount, "0.00"),
    balanceAmount: text(amounts.balance_amount, "0.00"),
  };
}

async function requestJson(path: string): Promise<unknown> {
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

  return payload;
}

export async function fetchSystemBillingDocuments(
  filters: SystemBillingDocumentFilters = {},
): Promise<{
  rows: SystemBillingDocumentRecord[];
  stats: SystemBillingDocumentStats;
}> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.documentType && filters.documentType !== "all") {
    params.set("document_type", filters.documentType);
  }
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.issueDateFrom) {
    params.set("issue_date_from", filters.issueDateFrom);
  }
  if (filters.issueDateTo) {
    params.set("issue_date_to", filters.issueDateTo);
  }

  const query = params.toString();
  const path = `${API_PATHS.systemBillingDocuments.list}${query ? `?${query}` : ""}`;
  const payload = await requestJson(path);
  const data = asRecord(asRecord(payload).data);
  const rawItems = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.results)
      ? data.results
      : [];

  return {
    rows: rawItems.map(normalizeBillingDocument),
    stats: normalizeStats(data.stats),
  };
}

export async function fetchSystemBillingDocumentDetail(
  id: string,
): Promise<SystemBillingDocumentDetail> {
  const payload = await requestJson(API_PATHS.systemBillingDocuments.detail(id));
  const data = asRecord(asRecord(payload).data);
  const rawDocument = asRecord(data.document);
  const snapshots = asRecord(rawDocument.snapshots);
  const rawReceipts = Array.isArray(data.payment_receipts)
    ? data.payment_receipts
    : [];

  return {
    document: normalizeBillingDocument(rawDocument),
    seller: asRecord(snapshots.seller ?? rawDocument.seller_snapshot),
    buyer: asRecord(snapshots.buyer ?? rawDocument.buyer_snapshot),
    subscriptionSnapshot: asRecord(
      snapshots.subscription ?? rawDocument.subscription_snapshot,
    ),
    planSnapshot: asRecord(snapshots.plan ?? rawDocument.plan_snapshot),
    paymentReceipts: rawReceipts.map(normalizeBillingDocument),
  };
}

const typeAr: Record<string, string> = {
  SUBSCRIPTION_INVOICE: "فاتورة اشتراك",
  PAYMENT_RECEIPT: "إيصال دفع",
};

const typeEn: Record<string, string> = {
  SUBSCRIPTION_INVOICE: "Subscription invoice",
  PAYMENT_RECEIPT: "Payment receipt",
};

export function billingDocumentTypeLabel(
  value: string,
  locale: SystemLocale,
) {
  const key = normalizeDocumentType(value);
  return (locale === "ar" ? typeAr : typeEn)[key] || value || "—";
}

const statusAr: Record<string, string> = {
  DRAFT: "مسودة",
  ISSUED: "مصدر",
  PAID: "مدفوع",
  CANCELLED: "ملغي",
};

const statusEn: Record<string, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export function billingDocumentStatusLabel(
  value: string,
  locale: SystemLocale,
) {
  const key = normalizeStatus(value);
  return (locale === "ar" ? statusAr : statusEn)[key] || value || "—";
}

function statusVariant(value: string) {
  const key = normalizeStatus(value);
  if (key === "PAID") return "success";
  if (key === "ISSUED") return "info";
  if (key === "DRAFT") return "warning";
  if (key === "CANCELLED") return "destructive";
  return "outline";
}

export function BillingDocumentStatusBadge({
  value,
  locale,
}: {
  value: string;
  locale: SystemLocale;
}) {
  return (
    <Badge variant={statusVariant(value) as any}>
      {billingDocumentStatusLabel(value, locale)}
    </Badge>
  );
}

export function BillingDocumentTypeBadge({
  value,
  locale,
}: {
  value: string;
  locale: SystemLocale;
}) {
  const normalized = normalizeDocumentType(value);
  return (
    <Badge variant={normalized === "PAYMENT_RECEIPT" ? "secondary" : "outline"}>
      {billingDocumentTypeLabel(normalized, locale)}
    </Badge>
  );
}

export function billingDocumentPrintUrl(id: string) {
  return apiUrl(API_PATHS.systemBillingDocuments.print(id));
}

export function billingDocumentPdfUrl(id: string) {
  return apiUrl(API_PATHS.systemBillingDocuments.pdf(id));
}
