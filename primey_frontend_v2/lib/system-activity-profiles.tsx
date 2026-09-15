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

export type SystemActivityProfile = {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  description: string;
  scope: string;
  activityType: string;
  sector: string;
  status: string;
  isActive: boolean;
  isSystem: boolean;
  companiesCount: number;
  modules: string[];
  features: string[];
  defaultSettings: ApiRecord;
  extraData: ApiRecord;
  createdAt: string | null;
  updatedAt: string | null;
  companies: SystemActivityProfileCompany[];
};

export type SystemActivityProfileCompany = {
  id: string;
  name: string;
  displayName: string;
  companyCode: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  status: string;
  isActive: boolean;
};

export type ActivityProfilesSummary = {
  total: number;
  active: number;
  inactive: number;
  companiesCount: number;
  systemCount: number;
  companyCount: number;
};

export type ActivityProfilesFilters = {
  search?: string;
  status?: string;
  scope?: string;
  ordering?: string;
  limit?: number;
  offset?: number;
};

export type ActivityProfilesResult = {
  rows: SystemActivityProfile[];
  count: number;
  summary: ActivityProfilesSummary;
  limit: number;
  offset: number;
};

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item)).filter(Boolean);
}

function scopeFrom(row: ApiRecord) {
  const explicit = text(row.scope).toLowerCase();
  if (explicit) return explicit;
  if (row.is_system === true || !text(row.company_id)) return "system";
  return "company";
}

export function normalizeActivityProfile(value: unknown): SystemActivityProfile {
  const row = asRecord(value);
  const companiesRaw = Array.isArray(row.companies) ? row.companies : [];

  return {
    id: text(row.id ?? row.pk),
    code: text(row.code ?? row.key, "—"),
    name:
      text(row.display_name) ||
      text(row.name_ar) ||
      text(row.name_en) ||
      text(row.name) ||
      "—",
    nameAr: text(row.name_ar),
    nameEn: text(row.name_en),
    description: text(row.description),
    scope: scopeFrom(row),
    activityType:
      text(row.activity_type) ||
      text(row.business_type) ||
      text(row.sector),
    sector: text(row.sector),
    status: text(row.status, row.is_active === false ? "INACTIVE" : "ACTIVE").toUpperCase(),
    isActive: row.is_active !== false && text(row.status, "ACTIVE").toUpperCase() !== "INACTIVE",
    isSystem: row.is_system === true || scopeFrom(row) === "system",
    companiesCount: numberValue(row.companies_count),
    modules: stringList(row.modules),
    features: stringList(row.features),
    defaultSettings: asRecord(row.default_settings ?? row.settings),
    extraData: asRecord(row.extra_data ?? row.metadata),
    createdAt: text(row.created_at) || null,
    updatedAt: text(row.updated_at) || null,
    companies: companiesRaw.map(normalizeActivityProfileCompany),
  };
}

export function normalizeActivityProfileCompany(
  value: unknown,
): SystemActivityProfileCompany {
  const row = asRecord(value);
  return {
    id: text(row.id ?? row.pk),
    name: text(row.name),
    displayName:
      text(row.display_name) ||
      text(row.name_ar) ||
      text(row.name_en) ||
      text(row.name) ||
      "—",
    companyCode: text(row.company_code ?? row.code),
    email: text(row.email),
    phone: text(row.phone ?? row.mobile),
    city: text(row.city),
    country: text(row.country),
    status: text(row.status, row.is_active === false ? "INACTIVE" : "ACTIVE").toUpperCase(),
    isActive: row.is_active !== false,
  };
}

function normalizeSummary(value: unknown): ActivityProfilesSummary {
  const row = asRecord(value);
  return {
    total: numberValue(row.total),
    active: numberValue(row.active),
    inactive: numberValue(row.inactive),
    companiesCount: numberValue(row.companies_count),
    systemCount: numberValue(row.system_count ?? row.system),
    companyCount: numberValue(row.company_count ?? row.company),
  };
}

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
  if (!response.ok) {
    throw new Error(
      text(root.message) ||
        text(root.detail) ||
        text(root.error) ||
        `HTTP ${response.status}`,
    );
  }

  return root;
}

function buildQuery(filters: ActivityProfilesFilters) {
  const params = new URLSearchParams();

  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.scope && filters.scope !== "all") params.set("scope", filters.scope);
  if (filters.ordering) params.set("ordering", filters.ordering);

  params.set("limit", String(Math.min(200, Math.max(1, filters.limit || 50))));
  params.set("offset", String(Math.max(0, filters.offset || 0)));
  return params.toString();
}

export async function fetchActivityProfiles(
  filters: ActivityProfilesFilters = {},
): Promise<ActivityProfilesResult> {
  const query = buildQuery(filters);
  const root = await requestJson(`${API_PATHS.systemActivityProfiles.overview}?${query}`);
  const data = asRecord(root.data);
  const rawRows = Array.isArray(root.results)
    ? root.results
    : Array.isArray(data.results)
      ? data.results
      : [];

  const limit = Math.max(1, numberValue(asRecord(root.meta).limit, filters.limit || 50));
  const offset = Math.max(0, numberValue(asRecord(root.meta).offset, filters.offset || 0));
  const rows = rawRows.map(normalizeActivityProfile);

  return {
    rows,
    count: numberValue(root.count ?? data.filtered_count, rows.length),
    summary: normalizeSummary(data.summary),
    limit,
    offset,
  };
}

export async function fetchAllActivityProfiles(
  filters: Omit<ActivityProfilesFilters, "limit" | "offset"> = {},
) {
  const rows: SystemActivityProfile[] = [];
  let offset = 0;
  let expected = Number.POSITIVE_INFINITY;

  for (let guard = 0; guard < 100; guard += 1) {
    const result = await fetchActivityProfiles({
      ...filters,
      limit: 200,
      offset,
    });
    rows.push(...result.rows);
    expected = result.count;

    if (!result.rows.length || rows.length >= expected) break;
    offset += result.limit;
  }

  return rows;
}

export async function fetchActivityProfileDetail(id: string | number) {
  const root = await requestJson(API_PATHS.systemActivityProfiles.detail(id));
  const data = asRecord(root.data);
  return normalizeActivityProfile(root.profile ?? data.profile);
}

export async function fetchActivityProfileCompanies(
  id: string | number,
  limit = 100,
  offset = 0,
) {
  const root = await requestJson(
    `${API_PATHS.systemActivityProfiles.companies(id)}?limit=${limit}&offset=${offset}`,
  );

  const rawRows = Array.isArray(root.results) ? root.results : [];
  return {
    rows: rawRows.map(normalizeActivityProfileCompany),
    count: numberValue(root.count, rawRows.length),
  };
}

export function activityProfileStatusLabel(
  value: string,
  locale: SystemLocale,
) {
  const active = value.toUpperCase() === "ACTIVE";
  if (locale === "ar") return active ? "نشط" : "غير نشط";
  return active ? "Active" : "Inactive";
}

export function activityProfileScopeLabel(
  value: string,
  locale: SystemLocale,
) {
  if (value === "system") return locale === "ar" ? "نظام" : "System";
  return locale === "ar" ? "شركة" : "Company";
}

export function ActivityProfileStatusBadge({
  value,
  locale,
}: {
  value: string;
  locale: SystemLocale;
}) {
  const active = value.toUpperCase() === "ACTIVE";
  return (
    <Badge
      variant="outline"
      className={
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : undefined
      }
    >
      {activityProfileStatusLabel(value, locale)}
    </Badge>
  );
}

export function ActivityProfileScopeBadge({
  value,
  locale,
}: {
  value: string;
  locale: SystemLocale;
}) {
  return (
    <Badge variant="outline">
      {activityProfileScopeLabel(value, locale)}
    </Badge>
  );
}
