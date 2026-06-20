/* ============================================================
   📂 lib/api/client.ts
   Primey Care - Frontend API Client Core
   ------------------------------------------------------------
   ✅ Fetch wrapper موحد
   ✅ يدعم query و params
   ✅ يدعم CSRF
   ✅ يدعم Authorization token
   ✅ يدعم locale headers
   ✅ Error payload متوافق مع ApiResult / ApiErrorPayload
   ✅ بدون data داخل ok:false حتى لا يكسر TypeScript
============================================================ */

import type {
  ApiMethod,
  ApiQuery,
  ApiRequestOptions,
  ApiResult,
} from "@/lib/types/api";
import { DEFAULT_ERROR_MESSAGE, extractErrorMessage } from "./errors";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeBaseUrl(value?: string | null): string {
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

function normalizePath(path: string): string {
  if (!path) return "/";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return path.startsWith("/") ? path : `/${path}`;
}

export function getApiBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "",
  );
}

export function buildApiUrl(path: string, query?: ApiQuery): string {
  const normalizedPath = normalizePath(path);

  const baseUrl =
    normalizedPath.startsWith("http://") ||
    normalizedPath.startsWith("https://")
      ? ""
      : getApiBaseUrl();

  const url = `${baseUrl}${normalizedPath}`;

  if (!query) return url;

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();

  if (!queryString) return url;

  return `${url}${url.includes("?") ? "&" : "?"}${queryString}`;
}

export function getCookie(name: string): string {
  if (!isBrowser()) return "";

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || "";
  }

  return "";
}

export function getCsrfToken(): string {
  return getCookie("csrftoken") || getCookie("csrf_token") || "";
}

export function getStoredAuthToken(): string {
  if (!isBrowser()) return "";

  try {
    return (
      window.localStorage.getItem("access_token") ||
      window.localStorage.getItem("accessToken") ||
      window.localStorage.getItem("token") ||
      ""
    );
  } catch {
    return "";
  }
}

export function readCurrentLocale(): "ar" | "en" {
  if (!isBrowser()) return "ar";

  try {
    const savedLocale =
      window.localStorage.getItem("primey-locale") ||
      window.localStorage.getItem("locale") ||
      "";

    if (savedLocale === "ar" || savedLocale === "en") {
      return savedLocale;
    }

    const htmlLang = document.documentElement.lang;

    if (htmlLang === "ar" || htmlLang === "en") {
      return htmlLang;
    }

    return "ar";
  } catch {
    return "ar";
  }
}

export function shouldAttachCsrf(method: ApiMethod): boolean {
  return !["GET"].includes(method);
}

export async function readJsonSafely(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isFormDataBody(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function isUrlSearchParamsBody(body: unknown): body is URLSearchParams {
  return typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
}

function buildRequestBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;

  if (isFormDataBody(body)) {
    return body;
  }

  if (isUrlSearchParamsBody(body)) {
    return body;
  }

  return JSON.stringify(body);
}

function getPayloadErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const record = payload as Record<string, unknown>;
  const code = record.code || record.error_code;

  return code ? String(code) : undefined;
}

function getPayloadDetail(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const record = payload as Record<string, unknown>;
  const detail = record.detail || record.error;

  return detail ? String(detail) : undefined;
}

function mergeQueryOptions(options: ApiRequestOptions): ApiQuery | undefined {
  return options.query || options.params;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  const method = options.method || "GET";
  const url = buildApiUrl(path, mergeQueryOptions(options));

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (!headers.has("Accept-Language")) {
    headers.set("Accept-Language", options.locale || readCurrentLocale());
  }

  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = isFormDataBody(options.body);
  const isUrlSearchParams = isUrlSearchParamsBody(options.body);

  if (hasBody && !isFormData && !isUrlSearchParams && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = options.token || getStoredAuthToken();

  if (token && options.withAuth !== false && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (shouldAttachCsrf(method)) {
    const csrfToken = getCsrfToken();

    if (csrfToken) {
      headers.set("X-CSRFToken", csrfToken);
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: hasBody ? buildRequestBody(options.body) : undefined,
      credentials: options.credentials || "include",
      cache: options.cache || "no-store",
      next: options.next,
      signal: options.signal,
    });

    const payload = await readJsonSafely(response);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message:
          options.errorMessage ||
          extractErrorMessage(payload) ||
          DEFAULT_ERROR_MESSAGE,
        code: getPayloadErrorCode(payload),
        detail: getPayloadDetail(payload),
        raw: payload,
      };
    }

    return {
      ok: true,
      data: payload as T,
      status: response.status,
      message:
        payload && typeof payload === "object"
          ? String((payload as Record<string, unknown>).message || "")
          : undefined,
      raw: payload,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message:
        options.errorMessage ||
        (error instanceof Error && error.message
          ? error.message
          : DEFAULT_ERROR_MESSAGE),
      raw: error,
    };
  }
}