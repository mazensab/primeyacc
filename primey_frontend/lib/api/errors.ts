/* ============================================================
   📂 lib/api/errors.ts
   Mhamcloud - API Error Handling
============================================================ */

export const DEFAULT_ERROR_MESSAGE = "تعذر الاتصال بالخادم. حاول مرة أخرى.";

export function extractErrorMessage(
  payload: unknown,
  fallback = DEFAULT_ERROR_MESSAGE
) {
  if (!payload || typeof payload !== "object") return fallback;

  const record = payload as Record<string, unknown>;

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  if (typeof record.error === "string" && record.error.trim()) {
    return record.error;
  }

  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail;
  }

  if (Array.isArray(record.errors)) {
    return record.errors.filter(Boolean).join("، ") || fallback;
  }

  if (record.errors && typeof record.errors === "object") {
    try {
      return JSON.stringify(record.errors);
    } catch {
      return fallback;
    }
  }

  const fieldMessages = Object.entries(record)
    .filter(([, value]) => Array.isArray(value) || typeof value === "string")
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.filter(Boolean).join("، ")}`;
      }

      return `${key}: ${value}`;
    })
    .filter(Boolean);

  if (fieldMessages.length > 0) {
    return fieldMessages.join(" | ");
  }

  return fallback;
}

export function getApiErrorMessage(error: unknown) {
  if (!error) return DEFAULT_ERROR_MESSAGE;

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object") {
    return extractErrorMessage(error);
  }

  return DEFAULT_ERROR_MESSAGE;
}

export function isUnauthorizedStatus(status?: number) {
  return status === 401;
}

export function isForbiddenStatus(status?: number) {
  return status === 403;
}

export function isNotFoundStatus(status?: number) {
  return status === 404;
}

export function isServerErrorStatus(status?: number) {
  return typeof status === "number" && status >= 500;
}