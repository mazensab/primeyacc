"use client";

import { API_PATHS } from "@/lib/api/endpoints";
import {
  apiUrl,
  asRecord,
  text,
  type ApiRecord,
} from "@/lib/system-subscriptions";

export type BillingDocumentMutationResult = {
  created: boolean;
  documentId: string;
  documentNumber: string;
  relatedInvoiceId: string;
  message: string;
};

export type CreateBillingReceiptInput = {
  paymentMethod: string;
  transactionReference?: string;
  billingReference?: string;
  notes?: string;
};

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const found = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  return found
    ? decodeURIComponent(found.slice(name.length + 1))
    : "";
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

async function parseMutationResponse(
  response: Response,
): Promise<ApiRecord> {
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

async function postJson(
  path: string,
  body: ApiRecord = {},
): Promise<ApiRecord> {
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

function normalizeMutation(
  root: ApiRecord,
): BillingDocumentMutationResult {
  const data = asRecord(root.data);
  const document = asRecord(data.document);
  const relatedInvoice = asRecord(data.related_invoice);

  return {
    created: data.created === true,
    documentId: text(document.id),
    documentNumber: text(document.document_number),
    relatedInvoiceId: text(relatedInvoice.id),
    message: text(root.message),
  };
}

export async function createSystemBillingInvoice(
  subscriptionId: string | number,
) {
  const root = await postJson(
    API_PATHS.systemBillingDocuments.createInvoice(subscriptionId),
  );

  return normalizeMutation(root);
}

export async function createSystemBillingReceipt(
  subscriptionId: string | number,
  input: CreateBillingReceiptInput,
) {
  const paymentMethod = text(input.paymentMethod).toUpperCase();

  if (!paymentMethod) {
    throw new Error("Payment method is required.");
  }

  const body: ApiRecord = {
    payment_method: paymentMethod,
  };

  const transactionReference = text(input.transactionReference);
  const billingReference = text(input.billingReference);
  const notes = text(input.notes);

  if (transactionReference) {
    body.transaction_reference = transactionReference;
  }
  if (billingReference) {
    body.billing_reference = billingReference;
  }
  if (notes) {
    body.notes = notes;
  }

  const root = await postJson(
    API_PATHS.systemBillingDocuments.createReceipt(subscriptionId),
    body,
  );

  return normalizeMutation(root);
}
