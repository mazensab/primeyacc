"use client";

import { API_PATHS } from "@/lib/api/endpoints";
import {
  apiUrl,
  asRecord,
  numberValue,
  text,
  type ApiRecord,
} from "@/lib/system-subscriptions";

export type GatewayReadinessCheck = {
  type: string;
  configured: boolean;
  valid: boolean;
};

export type GatewayReadinessRow = {
  gateway: string;
  ready: boolean;
  checks: GatewayReadinessCheck[];
};

export type GatewayReadinessResult = {
  ready: boolean;
  gatewayCount: number;
  readyCount: number;
  notReadyCount: number;
  gateways: GatewayReadinessRow[];
};

export type ReconciliationRow = {
  id: string;
  paymentId: string;
  paymentReference: string;
  gateway: string;
  providerPaymentId: string;
  status: string;
  localStatus: string;
  providerStatus: string;
  discrepancyCount: number;
  warningCount: number;
  errorCode: string;
  errorMessage: string;
  reconciledAt: string | null;
  createdAt: string | null;
};

export type WebhookEventRow = {
  id: string;
  paymentId: string;
  gateway: string;
  providerEventId: string;
  eventType: string;
  providerPaymentId: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  duplicateCount: number;
  errorCode: string;
  errorMessage: string;
  receivedAt: string | null;
  lastReceivedAt: string | null;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  processedAt: string | null;
  failedAt: string | null;
};

export type PagedOperationsResult<T> = {
  rows: T[];
  count: number;
  page: number;
  pageSize: number;
  pages: number;
};

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

function bool(value: unknown) {
  return value === true || value === 1 || value === "true";
}

function normalizeStatus(value: unknown) {
  return text(value, "unknown").toLowerCase().replace(/[\s-]+/g, "_");
}

export async function fetchGatewayReadiness(): Promise<GatewayReadinessResult> {
  const root = await requestJson(API_PATHS.systemPaymentIntegrations.readiness);
  const data = asRecord(root.data);
  const summary = asRecord(data.summary);
  const rows = Array.isArray(data.gateways) ? data.gateways : [];

  return {
    ready: bool(data.ready),
    gatewayCount: numberValue(summary.gateway_count),
    readyCount: numberValue(summary.ready_count),
    notReadyCount: numberValue(summary.not_ready_count),
    gateways: rows.map((value) => {
      const row = asRecord(value);
      const checks = Array.isArray(row.checks) ? row.checks : [];
      return {
        gateway: text(row.gateway, "unknown").toUpperCase(),
        ready: bool(row.ready),
        checks: checks.map((item) => {
          const check = asRecord(item);
          return {
            type: text(check.type, "configuration"),
            configured: bool(check.configured),
            valid: check.valid === undefined ? true : bool(check.valid),
          };
        }),
      };
    }),
  };
}

function normalizeReconciliation(value: unknown): ReconciliationRow {
  const row = asRecord(value);
  const discrepancies = Array.isArray(row.discrepancies) ? row.discrepancies : [];
  const warnings = Array.isArray(row.warnings) ? row.warnings : [];

  return {
    id: text(row.id),
    paymentId: text(row.payment_id),
    paymentReference: text(row.payment_reference, "—"),
    gateway: text(row.gateway, "—").toUpperCase(),
    providerPaymentId: text(row.provider_payment_id),
    status: normalizeStatus(row.status),
    localStatus: normalizeStatus(row.local_status),
    providerStatus: normalizeStatus(row.provider_status),
    discrepancyCount: discrepancies.length,
    warningCount: warnings.length,
    errorCode: text(row.error_code),
    errorMessage: text(row.error_message),
    reconciledAt: text(row.reconciled_at) || null,
    createdAt: text(row.created_at) || null,
  };
}

function normalizeWebhook(value: unknown): WebhookEventRow {
  const row = asRecord(value);
  return {
    id: text(row.id),
    paymentId: text(row.payment_id),
    gateway: text(row.gateway, "—").toUpperCase(),
    providerEventId: text(row.provider_event_id, "—"),
    eventType: text(row.event_type, "—"),
    providerPaymentId: text(row.provider_payment_id),
    status: normalizeStatus(row.status),
    attemptCount: numberValue(row.attempt_count),
    maxAttempts: numberValue(row.max_attempts),
    duplicateCount: numberValue(row.duplicate_count),
    errorCode: text(row.error_code),
    errorMessage: text(row.error_message),
    receivedAt: text(row.received_at) || null,
    lastReceivedAt: text(row.last_received_at) || null,
    lastAttemptAt: text(row.last_attempt_at) || null,
    nextRetryAt: text(row.next_retry_at) || null,
    processedAt: text(row.processed_at) || null,
    failedAt: text(row.failed_at) || null,
  };
}

async function paged<T>(
  path: string,
  normalize: (value: unknown) => T,
): Promise<PagedOperationsResult<T>> {
  const root = await requestJson(path);
  const data = asRecord(root.data);
  const rawRows = Array.isArray(data.results) ? data.results : [];

  return {
    rows: rawRows.map(normalize),
    count: numberValue(data.count),
    page: Math.max(1, numberValue(data.page, 1)),
    pageSize: Math.max(1, numberValue(data.page_size, 25)),
    pages: Math.max(1, numberValue(data.pages, 1)),
  };
}

export async function fetchReconciliations() {
  return paged(
    `${API_PATHS.systemPaymentIntegrations.reconciliations}?page=1&page_size=25`,
    normalizeReconciliation,
  );
}

export async function fetchWebhookEvents() {
  return paged(
    `${API_PATHS.systemPaymentIntegrations.webhookEvents}?page=1&page_size=25`,
    normalizeWebhook,
  );
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const found = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
}

async function ensureCsrfToken() {
  let token = getCookie("csrftoken");
  if (token) return token;

  await fetch(apiUrl(API_PATHS.auth.csrf), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  token = getCookie("csrftoken");
  return token;
}

async function parseMutationResponse(response: Response) {
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
    const errors = asRecord(root.errors);
    const first = Object.values(errors)[0];

    throw new Error(
      text(root.message) ||
        text(root.detail) ||
        text(root.error) ||
        (Array.isArray(first) ? text(first[0]) : text(first)) ||
        `HTTP ${response.status}`,
    );
  }

  return root;
}

async function postJson(path: string, body: ApiRecord = {}) {
  const csrf = await ensureCsrfToken();
  const response = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrf ? { "X-CSRFToken": csrf } : {}),
    },
    body: JSON.stringify(body),
  });

  return parseMutationResponse(response);
}

async function postForm(path: string, body: URLSearchParams) {
  const csrf = await ensureCsrfToken();
  const response = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrf ? { "X-CSRFToken": csrf } : {}),
    },
    body: body.toString(),
  });

  return parseMutationResponse(response);
}

export async function reconcileSystemPlatformPayment(
  paymentId: string | number,
) {
  return postJson(API_PATHS.systemSubscriptionPayments.reconcile(paymentId));
}

export async function reprocessSystemPlatformWebhookEvent(
  eventId: string | number,
) {
  return postForm(
    API_PATHS.systemPaymentIntegrations.webhookEventReprocess(eventId),
    new URLSearchParams({ force: "0" }),
  );
}
