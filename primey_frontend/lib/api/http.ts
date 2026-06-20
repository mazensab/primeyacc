/* ============================================================
   📂 lib/api/http.ts
   Primey Care - HTTP Helpers
   ------------------------------------------------------------
   ✅ اختصارات HTTP موحدة فوق apiRequest
   ✅ إصلاح body unknown إلى ApiBody
   ✅ دعم GET / POST / PATCH / PUT / DELETE
   ✅ safeApiGet
   ✅ getResults + getDataObject بشكل مرن
============================================================ */

import type {
  ApiBody,
  ApiQuery,
  ApiRequestOptions,
  ApiResult,
} from "@/lib/types/api";
import { apiRequest } from "./client";

type ApiOptionsWithoutMethod = Omit<ApiRequestOptions, "method">;
type ApiOptionsWithoutMethodBody = Omit<ApiRequestOptions, "method" | "body">;
type ApiOptionsWithoutMethodBodyQuery = Omit<
  ApiRequestOptions,
  "method" | "body" | "query"
>;

export function apiGet<T = unknown>(
  path: string,
  query?: ApiQuery,
  options: ApiOptionsWithoutMethodBodyQuery = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>(path, {
    ...options,
    method: "GET",
    query,
  });
}

export function apiPost<T = unknown>(
  path: string,
  body?: ApiBody,
  options: ApiOptionsWithoutMethodBody = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>(path, {
    ...options,
    method: "POST",
    body,
  });
}

export function apiPatch<T = unknown>(
  path: string,
  body?: ApiBody,
  options: ApiOptionsWithoutMethodBody = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>(path, {
    ...options,
    method: "PATCH",
    body,
  });
}

export function apiPut<T = unknown>(
  path: string,
  body?: ApiBody,
  options: ApiOptionsWithoutMethodBody = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>(path, {
    ...options,
    method: "PUT",
    body,
  });
}

export function apiDelete<T = unknown>(
  path: string,
  body?: ApiBody,
  options: ApiOptionsWithoutMethod = {},
): Promise<ApiResult<T>> {
  return apiRequest<T>(path, {
    ...options,
    method: "DELETE",
    body,
  });
}

export async function safeApiGet<T = unknown>(
  path: string,
  query?: ApiQuery,
  fallback: T | null = null,
): Promise<T | null> {
  const result = await apiGet<T>(path, query);

  if (!result.ok) {
    console.error("[Primey Care API Error]", {
      path,
      status: result.status,
      message: result.message,
    });

    return fallback;
  }

  return result.data;
}

export function getResults<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.results)) {
    return record.results as T[];
  }

  if (Array.isArray(record.items)) {
    return record.items as T[];
  }

  if (Array.isArray(record.data)) {
    return record.data as T[];
  }

  if (record.data && typeof record.data === "object") {
    const nested = record.data as Record<string, unknown>;

    if (Array.isArray(nested.results)) {
      return nested.results as T[];
    }

    if (Array.isArray(nested.items)) {
      return nested.items as T[];
    }

    if (Array.isArray(nested.data)) {
      return nested.data as T[];
    }
  }

  return [];
}

export function getDataObject<T = Record<string, unknown>>(
  payload: unknown,
): T | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (
    record.data &&
    typeof record.data === "object" &&
    !Array.isArray(record.data)
  ) {
    return record.data as T;
  }

  if (
    record.result &&
    typeof record.result === "object" &&
    !Array.isArray(record.result)
  ) {
    return record.result as T;
  }

  return record as T;
}