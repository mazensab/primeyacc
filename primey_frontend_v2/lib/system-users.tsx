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

export type SystemUserMembership = {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  companyStatus: string;
  role: string;
  status: string;
  isActive: boolean;
  isPrimary: boolean;
  jobTitle: string;
  department: string;
  permissions: string[];
  joinedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SystemUserRecord = {
  id: string;
  profileId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  displayName: string;
  phone: string;
  mobile: string;
  whatsappNumber: string;
  status: string;
  isActive: boolean;
  isStaff: boolean;
  isSuperuser: boolean;
  defaultWorkspace: string;
  systemRole: string;
  rawSystemRole: string;
  role: string;
  companyRole: string;
  companyId: string;
  companyName: string;
  isSystemUser: boolean;
  canAccessSystem: boolean;
  accessType: string;
  systemPermissions: string[];
  defaultCompanyId: string;
  lastSeenAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string;
  createdAt: string | null;
  updatedAt: string | null;
  memberships: SystemUserMembership[];
  membershipsCount: number;
  activeMembershipsCount: number;
};

export type SystemUserStats = {
  total: number;
  active: number;
  suspended: number;
  systemUsers: number;
  activeSystemUsers: number;
};

export type SystemUsersFilters = {
  search?: string;
  status?: string;
  role?: string;
  access?: string;
  ordering?: string;
  page?: number;
  pageSize?: number;
};

export type SystemUsersResult = {
  rows: SystemUserRecord[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  stats: SystemUserStats;
};

export const emptySystemUserStats: SystemUserStats = {
  total: 0,
  active: 0,
  suspended: 0,
  systemUsers: 0,
  activeSystemUsers: 0,
};

function normalizeStatus(value: unknown) {
  return text(value, "UNKNOWN")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function normalizeRole(value: unknown) {
  return text(value, "NONE")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function normalizeAccess(value: unknown, canAccessSystem = false) {
  const resolved = text(value).toLowerCase();
  if (resolved) return resolved;
  return canAccessSystem ? "system" : "company";
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => text(item))
          .filter(Boolean),
      ),
    );
  }

  const record = asRecord(value);
  return Object.entries(record)
    .filter(([, enabled]) => enabled === true || enabled === 1 || enabled === "true")
    .map(([key]) => key);
}

function nestedName(value: unknown) {
  const record = asRecord(value);
  return (
    text(record.display_name) ||
    text(record.name) ||
    text(record.name_ar) ||
    text(record.name_en) ||
    text(record.title)
  );
}

function normalizeMembership(value: unknown): SystemUserMembership {
  const row = asRecord(value);
  const company = asRecord(row.company);

  return {
    id: text(row.id ?? row.pk),
    companyId: text(company.id ?? row.company_id),
    companyName: nestedName(company) || text(row.company_name, "—"),
    companySlug: text(company.slug),
    companyStatus: normalizeStatus(company.status),
    role: normalizeRole(row.role),
    status: normalizeStatus(row.status),
    isActive: Boolean(row.is_active),
    isPrimary: Boolean(row.is_primary),
    jobTitle: text(row.job_title),
    department: text(row.department),
    permissions: normalizeStringList(row.permissions),
    joinedAt: text(row.joined_at) || null,
    createdAt: text(row.created_at) || null,
    updatedAt: text(row.updated_at) || null,
  };
}

export function normalizeSystemUser(value: unknown): SystemUserRecord {
  const row = asRecord(value);
  const membership = asRecord(
    row.company_membership ?? row.default_membership,
  );
  const company = asRecord(membership.company);
  const canAccessSystem = Boolean(row.can_access_system);
  const rawMemberships = Array.isArray(row.memberships)
    ? row.memberships
    : [];

  const username = text(row.username, "—");
  const firstName = text(row.first_name);
  const lastName = text(row.last_name);
  const fullName =
    text(row.full_name) ||
    `${firstName} ${lastName}`.trim();

  return {
    id: text(row.id ?? row.user_id),
    profileId: text(row.profile_id),
    username,
    email: text(row.email, "—"),
    firstName,
    lastName,
    fullName,
    displayName:
      text(row.display_name) ||
      text(row.name) ||
      fullName ||
      username,
    phone: text(row.phone),
    mobile: text(row.mobile),
    whatsappNumber: text(row.whatsapp_number),
    status: normalizeStatus(row.status),
    isActive: Boolean(row.is_active),
    isStaff: Boolean(row.is_staff),
    isSuperuser: Boolean(row.is_superuser),
    defaultWorkspace: text(row.default_workspace),
    systemRole: normalizeRole(row.system_role),
    rawSystemRole: normalizeRole(row.raw_system_role),
    role: normalizeRole(row.role),
    companyRole: normalizeRole(
      row.company_role ?? row.membership_role,
    ),
    companyId: text(
      row.company_id ?? company.id,
    ),
    companyName:
      text(row.company_name) ||
      nestedName(company),
    isSystemUser: Boolean(row.is_system_user),
    canAccessSystem,
    accessType: normalizeAccess(
      row.access_type,
      canAccessSystem,
    ),
    systemPermissions: normalizeStringList(
      row.system_permissions,
    ),
    defaultCompanyId: text(row.default_company_id),
    lastSeenAt: text(row.last_seen_at) || null,
    suspendedAt: text(row.suspended_at) || null,
    suspendedReason: text(row.suspended_reason),
    createdAt: text(row.created_at) || null,
    updatedAt: text(row.updated_at) || null,
    memberships: rawMemberships.map(normalizeMembership),
    membershipsCount: numberValue(row.memberships_count),
    activeMembershipsCount: numberValue(
      row.active_memberships_count,
    ),
  };
}

function normalizeStats(value: unknown): SystemUserStats {
  const row = asRecord(value);

  return {
    total: numberValue(row.total),
    active: numberValue(row.active),
    suspended: numberValue(row.suspended),
    systemUsers: numberValue(row.system_users),
    activeSystemUsers: numberValue(
      row.active_system_users,
    ),
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

function buildUsersQuery(filters: SystemUsersFilters) {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.role && filters.role !== "all") {
    params.set("system_role", filters.role);
  }
  if (filters.access && filters.access !== "all") {
    params.set("access", filters.access);
  }
  if (filters.ordering) {
    params.set("ordering", filters.ordering);
  }

  params.set("page", String(Math.max(1, filters.page || 1)));
  params.set(
    "page_size",
    String(Math.min(100, Math.max(1, filters.pageSize || 50))),
  );

  return params.toString();
}

export async function fetchSystemUsers(
  filters: SystemUsersFilters = {},
): Promise<SystemUsersResult> {
  const query = buildUsersQuery(filters);
  const root = await requestJson(
    `${API_PATHS.systemUsers.list}?${query}`,
  );

  const rawRows = Array.isArray(root.results)
    ? root.results
    : [];

  const count = numberValue(
    root.count ?? root.total,
    rawRows.length,
  );
  const page = Math.max(
    1,
    numberValue(root.page, filters.page || 1),
  );
  const pageSize = Math.max(
    1,
    numberValue(root.page_size, filters.pageSize || 50),
  );

  return {
    rows: rawRows.map(normalizeSystemUser),
    count,
    total: numberValue(root.total, count),
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(count / pageSize)),
    hasNext: Boolean(root.has_next),
    hasPrevious: Boolean(root.has_previous),
    stats: normalizeStats(root.stats),
  };
}

export async function fetchAllSystemUsers(
  filters: Omit<SystemUsersFilters, "page" | "pageSize"> = {},
) {
  const rows: SystemUserRecord[] = [];
  let page = 1;
  let expected = Number.POSITIVE_INFINITY;

  for (let guard = 0; guard < 100; guard += 1) {
    const result = await fetchSystemUsers({
      ...filters,
      page,
      pageSize: 100,
    });

    rows.push(...result.rows);
    expected = result.count;

    if (!result.hasNext || rows.length >= expected) {
      break;
    }

    page += 1;
  }

  return rows;
}

export async function fetchSystemUserDetail(
  id: string | number,
) {
  const root = await requestJson(
    API_PATHS.systemUsers.detail(id),
  );

  return normalizeSystemUser(root);
}


export type SystemUserCreateRole =
  | "SUPER_ADMIN"
  | "SYSTEM_ADMIN"
  | "SUPPORT"
  | "BILLING_MANAGER";

export type SystemUserCreateStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

export type UpdateSystemUserInput = {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  systemRole: SystemUserCreateRole;
};

export type SystemUserStatusAction =
  | "activate"
  | "suspend"
  | "deactivate";

export type ChangeSystemUserStatusInput = {
  action: SystemUserStatusAction;
  reason?: string;
};

export type CreateSystemUserInput = {
  username: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  systemRole: SystemUserCreateRole;
  status: SystemUserCreateStatus;
  statusReason?: string;
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

function mutationErrorMessage(
  root: ApiRecord,
  fallback: string,
) {
  const errors = asRecord(root.errors);
  const first = Object.values(errors)[0];

  if (Array.isArray(first) && first.length) {
    return text(first[0], fallback);
  }

  return (
    text(root.message) ||
    text(root.detail) ||
    text(root.error) ||
    text(first) ||
    fallback
  );
}

async function mutateSystemUser(
  path: string,
  method: "POST" | "PATCH",
  body: ApiRecord,
) {
  const csrf = await ensureCsrfToken();

  const response = await fetch(apiUrl(path), {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrf ? { "X-CSRFToken": csrf } : {}),
    },
    body: JSON.stringify(body),
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
      mutationErrorMessage(
        root,
        `HTTP ${response.status}`,
      ),
    );
  }

  return root;
}

export async function updateSystemUser(
  id: string | number,
  input: UpdateSystemUserInput,
) {
  const root = await mutateSystemUser(
    API_PATHS.systemUsers.detail(id),
    "PATCH",
    {
      first_name: text(input.firstName),
      last_name: text(input.lastName),
      display_name: text(input.displayName),
      email: text(input.email),
      phone: text(input.phone),
      system_role: text(input.systemRole).toUpperCase(),
    },
  );

  return normalizeSystemUser(root);
}

export async function changeSystemUserStatus(
  id: string | number,
  input: ChangeSystemUserStatusInput,
) {
  const action = text(input.action).toLowerCase();

  if (!["activate", "suspend", "deactivate"].includes(action)) {
    throw new Error("A valid system user status action is required.");
  }

  const body: ApiRecord = { action };
  const reason = text(input.reason);
  if (reason) body.reason = reason;

  const root = await mutateSystemUser(
    API_PATHS.systemUsers.status(id),
    "POST",
    body,
  );

  return normalizeSystemUser(root);
}

export async function createSystemUser(
  input: CreateSystemUserInput,
) {
  const username = text(input.username);
  const password = String(input.password || "");
  const systemRole = text(input.systemRole).toUpperCase();
  const status = text(input.status).toUpperCase();

  if (!username) {
    throw new Error("Username is required.");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (
    ![
      "SUPER_ADMIN",
      "SYSTEM_ADMIN",
      "SUPPORT",
      "BILLING_MANAGER",
    ].includes(systemRole)
  ) {
    throw new Error("A valid system role is required.");
  }

  if (!["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
    throw new Error("A valid user status is required.");
  }

  const body: ApiRecord = {
    username,
    password,
    system_role: systemRole,
    status,
    is_active: status === "ACTIVE",
  };

  const email = text(input.email);
  const firstName = text(input.firstName);
  const lastName = text(input.lastName);
  const phone = text(input.phone);
  const statusReason = text(input.statusReason);

  if (email) body.email = email;
  if (firstName) body.first_name = firstName;
  if (lastName) body.last_name = lastName;
  if (phone) body.phone = phone;
  if (statusReason) body.status_reason = statusReason;

  const csrf = await ensureCsrfToken();

  const response = await fetch(
    apiUrl(API_PATHS.systemUsers.create),
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
      body: JSON.stringify(body),
    },
  );

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
      mutationErrorMessage(
        root,
        `HTTP ${response.status}`,
      ),
    );
  }

  return normalizeSystemUser(root);
}

const statusAr: Record<string, string> = {
  ACTIVE: "نشط",
  INACTIVE: "غير نشط",
  SUSPENDED: "موقوف",
  UNKNOWN: "غير محدد",
};

const statusEn: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  UNKNOWN: "Unknown",
};

export function systemUserStatusLabel(
  value: string,
  locale: SystemLocale,
) {
  const key = normalizeStatus(value);
  return (locale === "ar" ? statusAr : statusEn)[key] || value || "—";
}

export function SystemUserStatusBadge({
  value,
  locale,
}: {
  value: string;
  locale: SystemLocale;
}) {
  const key = normalizeStatus(value);

  return (
    <Badge
      variant="outline"
      className={
        key === "ACTIVE"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : key === "SUSPENDED"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-slate-200 bg-slate-50 text-slate-700"
      }
    >
      {systemUserStatusLabel(key, locale)}
    </Badge>
  );
}

const roleAr: Record<string, string> = {
  SUPER_ADMIN: "مدير أعلى",
  SYSTEM_ADMIN: "مدير النظام",
  SUPPORT: "الدعم",
  BILLING_MANAGER: "مدير الفوترة",
  NONE: "بدون دور نظام",
};

const roleEn: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  SYSTEM_ADMIN: "System admin",
  SUPPORT: "Support",
  BILLING_MANAGER: "Billing manager",
  NONE: "No system role",
};

export function systemUserRoleLabel(
  value: string,
  locale: SystemLocale,
) {
  const key = normalizeRole(value);
  return (locale === "ar" ? roleAr : roleEn)[key] || value || "—";
}

export function SystemUserRoleBadge({
  value,
  locale,
}: {
  value: string;
  locale: SystemLocale;
}) {
  return (
    <Badge variant="secondary">
      {systemUserRoleLabel(value, locale)}
    </Badge>
  );
}

export function systemUserAccessLabel(
  value: string,
  locale: SystemLocale,
) {
  const key = text(value).toLowerCase();

  if (key === "system") {
    return locale === "ar" ? "النظام" : "System";
  }
  if (key === "company") {
    return locale === "ar" ? "شركة" : "Company";
  }

  return value || "—";
}
