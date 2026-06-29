/* ============================================================
   📂 lib/types/common.ts
   Mhamcloud - Common Shared Types
============================================================ */

export type ID = string | number;

export type AppLocale = "ar" | "en";

export type DateString = string;

export type CurrencyCode = "SAR";

export type CurrencyAmount = {
  amount: number;
  currency: CurrencyCode;
};

export type StatusOption = {
  value: string;
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "muted";
};

export type SelectOption<TValue extends string | number = string> = {
  value: TValue;
  label: string;
};

export type SortDirection = "asc" | "desc";

export type ListQuery = {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  status?: string;
};