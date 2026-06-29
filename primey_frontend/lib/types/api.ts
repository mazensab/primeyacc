/* ============================================================
   📂 lib/types/api.ts
   🧠 Mhamcloud | Shared API Types
   ------------------------------------------------------------
   ✅ ملف Types مستقل بدون import مكسور
   ✅ يستخدمه lib/api والصفحات
   ✅ يدعم list / detail / pagination / errors
   ✅ مناسب لـ fetch wrapper و API Layer
   ✅ يدعم ApiQuery كـ backward-compatible alias
   ✅ يدعم params و query لتوافق lib/api/client.ts
   ✅ يدعم credentials لتوافق fetch options
============================================================ */

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiLocale = "ar" | "en";

export type ApiPrimitive = string | number | boolean | null;

export type ApiQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type ApiQueryParams = Record<string, ApiQueryValue>;

/**
 * ✅ Backward-compatible alias
 * مستخدم حاليًا داخل:
 * lib/api/client.ts
 */
export type ApiQuery = ApiQueryParams;

export type ApiBody =
  | Record<string, unknown>
  | FormData
  | URLSearchParams
  | null
  | undefined;

export type ApiHeaders = Record<string, string>;

export type ApiPagination = {
  page?: number;
  page_size?: number;
  total_pages?: number;
  total_items?: number;
  has_next?: boolean;
  has_previous?: boolean;
  next_page?: number | null;
  previous_page?: number | null;
};

export type ApiMeta = ApiPagination & {
  count?: number;
  limit?: number;
  offset?: number;
  next?: string | null;
  previous?: string | null;
  [key: string]: unknown;
};

export type ApiValidationErrors = Record<
  string,
  string | string[] | Record<string, unknown>
>;

export type ApiEnvelope<TData = unknown> = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  code?: string;
  data?: TData;
  result?: TData;
  results?: TData extends Array<infer TItem> ? TItem[] : unknown[];
  errors?: ApiValidationErrors;
  pagination?: ApiPagination;
  meta?: ApiMeta;
  count?: number;
  next?: string | null;
  previous?: string | null;
};

export type ApiListEnvelope<TItem = unknown> = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    results?: TItem[];
    items?: TItem[];
    count?: number;
    pagination?: ApiPagination;
    meta?: ApiMeta;
    [key: string]: unknown;
  };
  results?: TItem[];
  items?: TItem[];
  count?: number;
  pagination?: ApiPagination;
  meta?: ApiMeta;
  next?: string | null;
  previous?: string | null;
};

export type ApiErrorPayload = {
  ok: false;
  status: number;
  message: string;
  code?: string;
  detail?: string;
  errors?: ApiValidationErrors;
  raw?: unknown;
};

export type ApiSuccessPayload<TData = unknown> = {
  ok: true;
  status: number;
  message?: string;
  data: TData;
  raw?: unknown;
};

export type ApiResult<TData = unknown> =
  | ApiSuccessPayload<TData>
  | ApiErrorPayload;

export type ApiRequestOptions = {
  method?: ApiMethod;

  /**
   * الاسم الرسمي الجديد لاستخدام query params
   */
  params?: ApiQueryParams;

  /**
   * ✅ Backward-compatible field
   * مستخدم في lib/api/client.ts:
   * buildApiUrl(path, options.query)
   */
  query?: ApiQueryParams;

  body?: ApiBody;
  headers?: ApiHeaders;
  locale?: ApiLocale;
  token?: string | null;
  withAuth?: boolean;

  /**
   * الاسم القديم/العام داخل بعض الملفات
   */
  withCredentials?: boolean;

  /**
   * ✅ Fetch credentials
   * مستخدم في lib/api/client.ts:
   * credentials: options.credentials || "include"
   */
  credentials?: RequestCredentials;

  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  signal?: AbortSignal;
  toastOnError?: boolean;
  toastOnSuccess?: boolean;
  successMessage?: string;
  errorMessage?: string;
};

export type ApiUploadOptions = Omit<ApiRequestOptions, "body" | "method"> & {
  method?: Extract<ApiMethod, "POST" | "PUT" | "PATCH">;
  body: FormData;
};

export type ApiDeleteOptions = Omit<ApiRequestOptions, "body" | "method"> & {
  method?: Extract<ApiMethod, "DELETE">;
};

export type ApiId = string | number;

export type ApiStatus =
  | "active"
  | "inactive"
  | "pending"
  | "draft"
  | "published"
  | "archived"
  | "cancelled"
  | "completed"
  | "failed"
  | "unknown";

export type ApiSelectOption<TValue extends string | number = string> = {
  label: string;
  value: TValue;
  description?: string;
  disabled?: boolean;
};

export type ApiDateRange = {
  date_from?: string | null;
  date_to?: string | null;
};

export type ApiAuditFields = {
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | number | null;
  updated_by?: string | number | null;
};

export type ApiSoftDeleteFields = {
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | number | null;
};

export type ApiActiveFields = {
  is_active?: boolean;
  status?: string;
};

export type ApiCurrencyCode = "SAR" | "USD" | "EUR" | string;

export type ApiMoneyValue = {
  amount: string | number;
  currency?: ApiCurrencyCode;
};

export type ApiFileMeta = {
  id?: ApiId;
  name?: string;
  filename?: string;
  url?: string;
  size?: number;
  mime_type?: string;
  uploaded_at?: string | null;
};

export type ApiLookupItem = {
  id: ApiId;
  name?: string;
  title?: string;
  code?: string;
  status?: string;
  [key: string]: unknown;
};

export type ApiTableColumn<TItem = unknown> = {
  key: keyof TItem | string;
  label: string;
  visible?: boolean;
  sortable?: boolean;
};

export type ApiSortDirection = "asc" | "desc";

export type ApiSortState<TSortKey extends string = string> = {
  key: TSortKey;
  direction: ApiSortDirection;
};

export type ApiPageState = {
  page: number;
  pageSize: number;
};

export type ApiFilterState = Record<string, ApiQueryValue>;

export type ApiListState<TItem = unknown> = {
  items: TItem[];
  loading: boolean;
  error: string | null;
  pagination: ApiPagination;
};

export type ApiDetailState<TItem = unknown> = {
  item: TItem | null;
  loading: boolean;
  error: string | null;
};

export type ApiFormState<TForm extends Record<string, unknown>> = {
  values: TForm;
  errors: Partial<Record<keyof TForm, string>>;
  submitting: boolean;
};