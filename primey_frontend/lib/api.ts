/* ============================================================
   📂 lib/api.ts
   Primey Care - Frontend API Client (Enhanced)
============================================================ */

import { toast } from "sonner";

export type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type ApiQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type ApiQuery = Record<string, ApiQueryValue>;

export type ApiRequestOptions = {
  method?: ApiMethod;
  query?: ApiQuery;
  body?: unknown;
  headers?: HeadersInit;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  credentials?: RequestCredentials;
  showToast?: boolean;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  status: number;
  raw: unknown;
};

export type ApiFailure = {
  ok: false;
  data: null;
  status: number;
  message: string;
  error?: string;
  raw?: unknown;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

const DEFAULT_ERROR_MESSAGE = "تعذر الاتصال بالخادم. حاول مرة أخرى.";

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeBaseUrl(value?: string | null) {
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

function normalizePath(path: string) {
  if (!path) return "/";
  if (path.startsWith("http")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export function getApiBaseUrl() {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_API_URL ||
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "",
  );
}

export function buildApiUrl(path: string, query?: ApiQuery) {
  const normalizedPath = normalizePath(path);
  const baseUrl = normalizedPath.startsWith("http") ? "" : getApiBaseUrl();
  const url = `${baseUrl}${normalizedPath}`;

  if (!query) return url;

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function getCookie(name: string) {
  if (!isBrowser()) return "";

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  return parts.length === 2 ? parts.pop()?.split(";").shift() || "" : "";
}

function getCsrfToken() {
  return getCookie("csrftoken") || getCookie("csrf_token") || "";
}

function shouldAttachCsrf(method: ApiMethod) {
  return method !== "GET";
}

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return DEFAULT_ERROR_MESSAGE;

  const record = payload as Record<string, unknown>;

  return (
    (record.message as string) ||
    (record.error as string) ||
    (record.detail as string) ||
    DEFAULT_ERROR_MESSAGE
  );
}

async function readJsonSafely(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/* ============================================================
   🚀 Core API Request
============================================================ */

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  const method = options.method || "GET";
  const url = buildApiUrl(path, options.query);

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  const hasBody = options.body !== undefined;

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (shouldAttachCsrf(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers.set("X-CSRFToken", csrf);
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      credentials: options.credentials || "include",
      cache: options.cache || "no-store",
      next: options.next,
    });

    const payload = await readJsonSafely(response);

    if (!response.ok) {
      const message = extractErrorMessage(payload);

      console.error("❌ API Error:", {
        path,
        method,
        status: response.status,
        message,
        payload,
      });

      if (options.showToast !== false) {
        toast.error(message);
      }

      return {
        ok: false,
        data: null,
        status: response.status,
        message,
        raw: payload,
      };
    }

    return {
      ok: true,
      data: payload as T,
      status: response.status,
      raw: payload,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE;

    console.error("🔥 Network Error:", { path, method, error });

    if (options.showToast !== false) {
      toast.error(message);
    }

    return {
      ok: false,
      data: null,
      status: 0,
      message,
      raw: error,
    };
  }
}

/* ============================================================
   🚀 Shortcuts
============================================================ */

export const apiGet = <T>(path: string, query?: ApiQuery) =>
  apiRequest<T>(path, { method: "GET", query });

export const apiPost = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: "POST", body });

export const apiPatch = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: "PATCH", body });

export const apiPut = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: "PUT", body });

export const apiDelete = <T>(path: string) =>
  apiRequest<T>(path, { method: "DELETE" });

/* ============================================================
   🧠 Helpers
============================================================ */

export function getResults<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.customers)) return payload.customers;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data?.customers)) return payload.data.customers;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;

  return [];
}

export function getDataObject<T>(payload: any): T | null {
  if (!payload) return null;
  return payload.data || payload.customer || payload.item || payload;
}

/* ============================================================
   📌 API Paths
============================================================ */

export const API_PATHS = {
  customers: {
    list: "/api/customers/",
    detail: (id: number | string) => `/api/customers/${id}/`,
    statement: (id: number | string) => `/api/customers/${id}/statement/`,
  },

  providers: {
    list: "/api/providers/",
    detail: (id: number | string) => `/api/providers/${id}/`,
  },

  centers: {
    list: "/api/providers/",
    detail: (id: number | string) => `/api/providers/${id}/`,
  },

  agents: {
    list: "/api/agents/",
    detail: (id: number | string) => `/api/agents/${id}/`,
  },

  products: {
    list: "/api/products/",
    active: "/api/products/active/",
    detail: (id: number | string) => `/api/products/${id}/`,
  },

  serviceItems: {
    list: "/api/service-items/",
    active: "/api/service-items/active/",
    detail: (id: number | string) => `/api/service-items/${id}/`,
  },

  contracts: {
    list: "/api/contracts/",
    active: "/api/contracts/active/",
    detail: (id: number | string) => `/api/contracts/${id}/`,
  },

  orders: {
    list: "/api/orders/",
    open: "/api/orders/open/",
    detail: (id: number | string) => `/api/orders/${id}/`,
  },

  orderItems: {
    list: "/api/order-items/",
    pending: "/api/order-items/pending/",
    detail: (id: number | string) => `/api/order-items/${id}/`,
  },

  invoices: {
    list: "/api/invoices/",
    create: "/api/invoices/create/",
    open: "/api/invoices/open/",
    detail: (id: number | string) => `/api/invoices/${id}/`,
  },

  payments: {
    list: "/api/payments/",
    create: "/api/payments/create/",
    pending: "/api/payments/pending/",
    detail: (id: number | string) => `/api/payments/${id}/`,
  },

  accounting: {
    accounts: "/api/accounting/accounts/",
    accountDetail: (id: number | string) => `/api/accounting/accounts/${id}/`,
    journals: "/api/accounting/journals/",
    journalDetail: (id: number | string) => `/api/accounting/journals/${id}/`,
    ledger: "/api/accounting/ledger/",
    trialBalance: "/api/accounting/trial-balance/",
    profitLoss: "/api/accounting/profit-loss/",
    balanceSheet: "/api/accounting/balance-sheet/",
  },

  treasury: {
    list: "/api/treasury/",
    accounts: "/api/treasury/accounts/",
    accountDetail: (id: number | string) => `/api/treasury/accounts/${id}/`,
    cashboxes: "/api/treasury/cashboxes/",
    banks: "/api/treasury/banks/",
    transactions: "/api/treasury/transactions/",
    transactionDetail: (id: number | string) =>
      `/api/treasury/transactions/${id}/`,
    transfers: "/api/treasury/transfers/",
    reports: "/api/treasury/reports/",
    settings: "/api/treasury/settings/",
  },

  reports: {
    overview: "/api/reports/overview/",
    customers: "/api/reports/customers/",
    providers: "/api/reports/providers/",
    centers: "/api/reports/providers/",
    orders: "/api/reports/orders/",
    invoices: "/api/reports/invoices/",
    payments: "/api/reports/payments/",
    accounting: "/api/reports/accounting/",
  },

  users: {
    list: "/api/users/",
    detail: (id: number | string) => `/api/users/${id}/`,
    activate: (id: number | string) => `/api/users/${id}/activate/`,
    deactivate: (id: number | string) => `/api/users/${id}/deactivate/`,
    sendPasswordLink: (id: number | string) =>
      `/api/users/${id}/send-password-link/`,
  },

  auth: {
    csrf: "/api/auth/csrf/",
    whoami: "/api/auth/whoami/",
    login: "/api/auth/login/",
    logout: "/api/auth/logout/",
    profile: "/api/auth/profile/",
    changePassword: "/api/auth/change-password/",
  },

  whatsapp: {
    list: "/api/whatsapp/",
    settings: "/api/whatsapp/settings/",
    logs: "/api/whatsapp/logs/",
    templates: "/api/whatsapp/templates/",
    broadcasts: "/api/whatsapp/broadcasts/",
  },

  notificationCenter: {
    overview: "/api/notification-center/",
    list: "/api/notification-center/list/",
    detail: "/api/notification-center/detail/",
    create: "/api/notification-center/create/",
    update: "/api/notification-center/update/",
    delete: "/api/notification-center/delete/",
    inbox: "/api/notification-center/inbox/",
    preferences: "/api/notification-center/preferences/",
    logs: "/api/notification-center/logs/",
    settings: "/api/notification-center/settings/",
  },

  notifications: {
    inbox: "/api/notification-center/inbox/",
    latest: "/api/notification-center/inbox/",
    count: "/api/notification-center/inbox/",
    list: "/api/notification-center/inbox/",
    markRead: "/api/notification-center/inbox/",
    markUnread: "/api/notification-center/inbox/",
    markAllRead: "/api/notification-center/inbox/",
    bulkMarkRead: "/api/notification-center/inbox/",
  },

  systemLog: {
    summary: "/api/system-log/summary/",
    list: "/api/system-log/",
  },
} as const;

/* ============================================================
   🔔 Notification Center Helpers
============================================================ */

export type NotificationInboxItem = {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  severity: string;
  link?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  recipient_id?: number | null;
  event_id?: number | null;
};

export type NotificationInboxCounts = {
  total?: number;
  unread?: number;
  read?: number;
  info?: number;
  success?: number;
  warning?: number;
  error?: number;
  critical?: number;
};

export type NotificationInboxPayload = {
  ok?: boolean;
  message?: string;
  data?:
    | NotificationInboxItem[]
    | {
        unread_count?: number;
        counts?: NotificationInboxCounts;
      };
  results?: NotificationInboxItem[];
  count?: number;
  meta?: {
    unread_count?: number;
    counts?: NotificationInboxCounts;
    page?: number;
    page_size?: number;
    total_pages?: number;
    total_items?: number;
    has_next?: boolean;
    has_previous?: boolean;
  };
};

export function extractNotificationInboxItems(
  payload: NotificationInboxPayload | any,
): NotificationInboxItem[] {
  return getResults<NotificationInboxItem>(payload);
}

export function extractNotificationUnreadCount(
  payload: NotificationInboxPayload | any,
): number {
  const value =
    payload?.unread_count ??
    payload?.meta?.unread_count ??
    payload?.meta?.counts?.unread ??
    payload?.data?.unread_count ??
    payload?.data?.counts?.unread;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export const notificationApi = {
  inbox: (query?: ApiQuery) =>
    apiGet<NotificationInboxPayload>(API_PATHS.notifications.inbox, query),

  latest: (limit = 8) =>
    apiGet<NotificationInboxPayload>(API_PATHS.notifications.latest, {
      action: "latest",
      limit,
    }),

  count: () =>
    apiGet<NotificationInboxPayload>(API_PATHS.notifications.count, {
      action: "count",
    }),

  markRead: (notificationId: number | string) =>
    apiPost<NotificationInboxPayload>(API_PATHS.notifications.markRead, {
      action: "mark_read",
      notification_id: notificationId,
    }),

  markUnread: (notificationId: number | string) =>
    apiPost<NotificationInboxPayload>(API_PATHS.notifications.markUnread, {
      action: "mark_unread",
      notification_id: notificationId,
    }),

  markAllRead: (filters?: {
    notification_type?: string;
    severity?: string;
    company_reference?: string;
  }) =>
    apiPost<NotificationInboxPayload>(API_PATHS.notifications.markAllRead, {
      action: "mark_all_read",
      ...(filters || {}),
    }),

  bulkMarkRead: (ids: Array<number | string>) =>
    apiPost<NotificationInboxPayload>(API_PATHS.notifications.bulkMarkRead, {
      action: "bulk_mark_read",
      ids,
    }),
};