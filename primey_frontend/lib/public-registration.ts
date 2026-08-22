"use client";

export type AppLocale = "ar" | "en";
export type BillingCycle = "MONTHLY" | "YEARLY";
export type RegistrationGateway = "MOYASAR" | "TAMARA" | "TABBY";

export type PublicPlan = {
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
};

export type RegistrationOptions = {
  plans: PublicPlan[];
  billing_cycles: Array<{
    value: BillingCycle | string;
    label: string;
  }>;
  gateways: RegistrationGateway[];
};

export type RegistrationForm = {
  owner_name: string;
  phone: string;
  email: string;
  password: string;
  company_name: string;
  commercial_registration: string;
  tax_number: string;
  city: string;
  plan_id: number;
  billing_cycle: BillingCycle;
  gateway: RegistrationGateway;
  auto_renew: boolean;
};

export type PublicCheckoutResult = {
  checkout: {
    payment_id: number;
    payment_reference: string;
    gateway: string;
    mode: "client" | "redirect" | string;
    provider_payment_id: string;
    checkout_url: string;
    status: string;
  };
  payment: {
    id: number;
    payment_reference: string;
    status: string;
    gateway: string;
    amount: string;
    currency_code: string;
  };
};

export type PublicPaymentVerificationResult = {
  payment: {
    id: number;
    payment_reference: string;
    status: string;
    gateway: string;
    gateway_payment_id: string;
    amount: string;
    currency_code: string;
    paid_at: string | null;
    receipt_id: number | null;
  };
  subscription: {
    id: number;
    status: string;
    activated_at: string | null;
  };
};

export type RegistrationResult = {
  owner: {
    id: number;
    username: string;
    email: string;
  };
  company: {
    id: number;
    company_code: string;
    name: string;
    status: string;
  };
  subscription: {
    id: number;
    status: string;
    billing_cycle: BillingCycle | string;
    total_amount: string;
    plan: PublicPlan;
  };
  payment: {
    id: number;
    payment_reference: string;
    status: string;
    gateway: string;
    amount: string;
    currency_code: string;
  };
  next?: {
    requires_payment?: boolean;
    login_path?: string;
    subscription_path?: string;
  };
};

type ApiRecord = Record<string, unknown>;

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  ""
).replace(/\/+$/, "");

export const PUBLIC_REGISTRATION_ENDPOINTS = {
  options: "/api/public/registration/options/",
  registration: "/api/public/registration/",
  checkout: "/api/public/registration/checkout/",
  moyasarAttach: "/api/public/registration/moyasar/attach/",
  paymentVerify: "/api/public/registration/payment/verify/",
} as const;

function apiUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";

  const row = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  return row
    ? decodeURIComponent(row.slice(name.length + 1))
    : "";
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstText(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = firstText(item);
      if (text) return text;
    }
  }

  return "";
}

function extractMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;

  const direct =
    firstText(payload.message) ||
    firstText(payload.detail) ||
    firstText(payload.error);

  if (direct) return direct;

  if (isRecord(payload.errors)) {
    for (const value of Object.values(payload.errors)) {
      const message = firstText(value);
      if (message) return message;
    }
  }

  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function loadRegistrationOptions(): Promise<RegistrationOptions> {
  const response = await fetch(apiUrl(PUBLIC_REGISTRATION_ENDPOINTS.options), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(
      extractMessage(payload, "Unable to load registration options."),
    );
  }

  const record = isRecord(payload) ? payload : {};
  const data = isRecord(record.data) ? record.data : {};

  const plans = Array.isArray(data.plans)
    ? data.plans.filter(isRecord).map((row) => ({
        id: Number(row.id) || 0,
        name: String(row.name || ""),
        code: String(row.code || ""),
        slug: String(row.slug || ""),
        description: String(row.description || ""),
        monthly_price: String(row.monthly_price || "0.00"),
        yearly_price: String(row.yearly_price || "0.00"),
        max_users: Number(row.max_users) || 0,
        max_branches: Number(row.max_branches) || 0,
        max_warehouses: Number(row.max_warehouses) || 0,
        max_pos: Number(row.max_pos) || 0,
        features: Array.isArray(row.features) ? row.features : [],
      }))
    : [];

  const billingCycles = Array.isArray(data.billing_cycles)
    ? data.billing_cycles
        .filter(isRecord)
        .map((row) => ({
          value: String(row.value || "") as BillingCycle,
          label: String(row.label || row.value || ""),
        }))
    : [];

  const gateways = Array.isArray(data.gateways)
    ? data.gateways
        .map((value) => String(value || "").toUpperCase())
        .filter(
          (value): value is RegistrationGateway =>
            value === "MOYASAR" ||
            value === "TAMARA" ||
            value === "TABBY",
        )
    : [];

  return {
    plans,
    billing_cycles: billingCycles,
    gateways,
  };
}

export async function createPublicRegistration(
  form: RegistrationForm,
): Promise<RegistrationResult> {
  const csrf = getCookie("csrftoken");

  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  });

  if (csrf) {
    headers.set("X-CSRFToken", csrf);
  }

  const response = await fetch(
    apiUrl(PUBLIC_REGISTRATION_ENDPOINTS.registration),
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers,
      body: JSON.stringify(form),
    },
  );

  const payload = await readJson(response);

  if (!response.ok) {
    const error = new Error(
      extractMessage(payload, "Unable to create company registration."),
    ) as Error & {
      status?: number;
      code?: string;
      errors?: unknown;
    };

    error.status = response.status;

    if (isRecord(payload)) {
      error.code = String(payload.code || "");
      error.errors = payload.errors;
    }

    throw error;
  }

  const record = isRecord(payload) ? payload : {};
  const data = isRecord(record.data) ? record.data : {};

  return data as unknown as RegistrationResult;
}

export async function startPublicRegistrationCheckout(
  paymentReference: string,
): Promise<PublicCheckoutResult> {
  const reference = String(paymentReference || "").trim();

  if (!reference) {
    throw new Error("Payment reference is required.");
  }

  const csrf = getCookie("csrftoken");

  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  });

  if (csrf) {
    headers.set("X-CSRFToken", csrf);
  }

  const response = await fetch(
    apiUrl(PUBLIC_REGISTRATION_ENDPOINTS.checkout),
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers,
      body: JSON.stringify({
        payment_reference: reference,
      }),
    },
  );

  const payload = await readJson(response);

  if (!response.ok) {
    const error = new Error(
      extractMessage(
        payload,
        "Unable to start payment checkout.",
      ),
    ) as Error & {
      status?: number;
      code?: string;
      errors?: unknown;
    };

    error.status = response.status;

    if (isRecord(payload)) {
      error.code = String(payload.code || "");
      error.errors = payload.errors;
    }

    throw error;
  }

  const record = isRecord(payload) ? payload : {};
  const data = isRecord(record.data) ? record.data : {};

  return data as unknown as PublicCheckoutResult;
}

export async function attachPublicMoyasarPayment(
  paymentReference: string,
  providerPaymentId: string,
): Promise<PublicCheckoutResult> {
  const reference = String(
    paymentReference || "",
  ).trim();

  const providerId = String(
    providerPaymentId || "",
  ).trim();

  if (!reference) {
    throw new Error(
      "Payment reference is required.",
    );
  }

  if (!providerId) {
    throw new Error(
      "Moyasar payment ID is required.",
    );
  }

  const csrf = getCookie("csrftoken");

  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  });

  if (csrf) {
    headers.set(
      "X-CSRFToken",
      csrf,
    );
  }

  const response = await fetch(
    apiUrl(
      PUBLIC_REGISTRATION_ENDPOINTS.moyasarAttach,
    ),
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers,
      body: JSON.stringify({
        payment_reference: reference,
        provider_payment_id: providerId,
      }),
    },
  );

  const payload = await readJson(
    response,
  );

  if (!response.ok) {
    throw new Error(
      extractMessage(
        payload,
        "Unable to attach Moyasar payment.",
      ),
    );
  }

  const record = isRecord(payload)
    ? payload
    : {};

  const data = isRecord(record.data)
    ? record.data
    : {};

  return data as unknown as PublicCheckoutResult;
}

export async function verifyPublicRegistrationPayment(
  paymentReference: string,
): Promise<PublicPaymentVerificationResult> {
  const reference = String(
    paymentReference || "",
  ).trim();

  if (!reference) {
    throw new Error(
      "Payment reference is required.",
    );
  }

  const csrf = getCookie("csrftoken");

  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  });

  if (csrf) {
    headers.set(
      "X-CSRFToken",
      csrf,
    );
  }

  const response = await fetch(
    apiUrl(
      PUBLIC_REGISTRATION_ENDPOINTS.paymentVerify,
    ),
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers,
      body: JSON.stringify({
        payment_reference: reference,
      }),
    },
  );

  const payload = await readJson(
    response,
  );

  if (!response.ok) {
    const error = new Error(
      extractMessage(
        payload,
        "Unable to verify payment.",
      ),
    ) as Error & {
      status?: number;
      code?: string;
    };

    error.status = response.status;

    if (isRecord(payload)) {
      error.code = String(
        payload.code || "",
      );
    }

    throw error;
  }

  const record = isRecord(payload)
    ? payload
    : {};

  const data = isRecord(record.data)
    ? record.data
    : {};

  return data as unknown as PublicPaymentVerificationResult;
}

export function normalizeSaudiPhone(value: string): string {
  const normalized = value
    .replace(/[\s\-()]/g, "")
    .trim();

  if (normalized.startsWith("+9665")) {
    return `0${normalized.slice(4)}`;
  }

  if (normalized.startsWith("9665")) {
    return `0${normalized.slice(3)}`;
  }

  if (normalized.startsWith("5") && normalized.length === 9) {
    return `0${normalized}`;
  }

  return normalized;
}

export function isValidSaudiPhone(value: string): boolean {
  return /^05\d{8}$/.test(normalizeSaudiPhone(value));
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function formatMoney(value: unknown): string {
  const parsed = Number(
    String(value ?? "")
      .replaceAll(",", "")
      .replace(/[^\d.-]/g, ""),
  );

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

export function formatInteger(value: unknown): string {
  const parsed = Number(value);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}
