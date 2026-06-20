"use client";

// ======================================================
// ًں”گ PrimeyAcc â€” Auth Provider
// ًںڑ€ ط§ظ„ط¥طµط¯ط§ط±: Auth Provider V2.2
// ------------------------------------------------------
// âœ… Session-based auth
// âœ… ظٹط¯ط¹ظ… PrimeyAcc workspaces
// âœ… ظٹط¯ط¹ظ… role / workspace / user_type ظ…ظ† whoami
// âœ… ظٹط¯ط¹ظ… permission_codes
// âœ… ظٹط¯ط¹ظ… permissions.codes
// âœ… ظٹط¯ط¹ظ… profile_permissions.codes
// âœ… ظ…طھظˆط§ظپظ‚ ظ…ط¹ lib/permissions.ts
// âœ… ظ…طھظˆط§ظپظ‚ ظ…ط¹ Sidebar / Pages / Actions Guards
// âœ… provider ظ‡ظˆ ط§ظ„ط±ط³ظ…ظٹ ظ…ط¹ ط¯ط¹ظ… company/center ظƒطھظˆط§ظپظ‚ ط®ظ„ظپظٹ
// âœ… طھط­ط¯ظٹط« ط§ظ„ظ„ط؛ط© ظ…ظ† profile.preferred_language ط¹ظ†ط¯ طھظˆظپط±ظ‡ط§
// âœ… ط¥طµظ„ط§ط­ TypeScript: inferWorkspaceFromRole ظ„ط§ ظٹط³طھظ‚ط¨ظ„ undefined
// ======================================================

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { usePathname, useRouter } from "next/navigation";

// ======================================================
// TYPES
// ======================================================

export type AppWorkspace = "system" | "company" | "customer" | "agent";

export type AppRole =
  | "system_admin"
  | "provider_admin"
  | "customer_user"
  | "agent_user"
  | "accountant"
  | "support"
  | "viewer";

export type PermissionCode = string;

export type AuthPermissions = {
  is_superuser?: boolean;
  is_staff?: boolean;
  groups?: string[];
  codes?: PermissionCode[];
};

export type AuthProfilePermissions = {
  is_superuser?: boolean;
  is_staff?: boolean;
  groups?: string[];
  codes?: PermissionCode[];
  role?: AppRole | string | null;
  workspace?: AppWorkspace | string | null;
  [key: string]: unknown;
};

export type AuthProfile = {
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  alternate_email?: string | null;
  preferred_language?: "ar" | "en" | string | null;
  timezone?: string | null;
  user_type?: string | null;
  role?: AppRole | string | null;
  workspace?: AppWorkspace | string | null;
  is_phone_verified?: boolean;
  is_whatsapp_verified?: boolean;
  is_email_verified?: boolean;
  is_profile_completed?: boolean;
  tags?: string[];
  extra_data?: Record<string, unknown>;
};

export type AuthUser = {
  id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  last_login?: string | null;
  [key: string]: unknown;
};

export type AuthSession = {
  authenticated: boolean;

  is_superuser: boolean;
  is_staff?: boolean;
  is_system_user?: boolean;

  workspace?: AppWorkspace | string | null;
  dashboard_path?: string | null;

  role?: AppRole | string | null;
  user_type?: string | null;
  scope_type?: string | null;

  entity_type?: string | null;
  entity_id?: number | null;

  company?: unknown;
  company_id?: number | null;
  provider_id?: number | null;
  center_id?: number | null;
  customer_id?: number | null;
  agent_id?: number | null;
  broker_id?: number | null;

  user?: AuthUser | null;

  subscription?: {
    apps?: string[];
    [key: string]: unknown;
  } | null;

  permission_codes?: PermissionCode[];
  permissions?: AuthPermissions | null;
  profile_permissions?: AuthProfilePermissions | null;
  profile?: AuthProfile | null;
  session?: Record<string, unknown> | null;
};

type AuthContextValue = {
  session: AuthSession;
  setSession: React.Dispatch<React.SetStateAction<AuthSession>>;
  refreshSession: () => Promise<AuthSession>;
  logoutLocal: () => void;
};

// ======================================================
// DEFAULT SESSION
// ======================================================

const DEFAULT_AUTH_SESSION: AuthSession = {
  authenticated: false,

  is_superuser: false,
  is_staff: false,
  is_system_user: false,

  workspace: null,
  dashboard_path: "/login",

  role: null,
  user_type: null,
  scope_type: null,

  entity_type: null,
  entity_id: null,

  company: null,
  company_id: null,
  provider_id: null,
  center_id: null,
  customer_id: null,
  agent_id: null,
  broker_id: null,

  user: null,
  subscription: null,

  permission_codes: [],

  permissions: {
    is_superuser: false,
    is_staff: false,
    groups: [],
    codes: [],
  },

  profile_permissions: {
    is_superuser: false,
    is_staff: false,
    groups: [],
    codes: [],
    role: null,
    workspace: null,
  },

  profile: {
    display_name: null,
    avatar_url: null,
    bio: null,
    phone_number: null,
    whatsapp_number: null,
    alternate_email: null,
    preferred_language: "ar",
    timezone: "Asia/Riyadh",
    user_type: null,
    role: null,
    workspace: null,
    is_phone_verified: false,
    is_whatsapp_verified: false,
    is_email_verified: false,
    is_profile_completed: false,
    tags: [],
    extra_data: {},
  },

  session: null,
};

// ======================================================
// ROLE / WORKSPACE ALIASES
// ======================================================

const ROLE_ALIASES: Record<string, AppRole> = {
  system: "system_admin",
  super_admin: "system_admin",
  system_admin: "system_admin",
  admin: "system_admin",
  staff: "system_admin",

  accountant: "accountant",
  finance: "accountant",
  finance_manager: "accountant",
  treasury: "accountant",

  support: "support",
  internal: "support",

  viewer: "viewer",
  readonly: "viewer",

  provider: "provider_admin",
  provider_admin: "provider_admin",
  center: "provider_admin",
  center_admin: "provider_admin",
  service_provider: "provider_admin",
  company: "provider_admin",
  company_admin: "provider_admin",
  company_owner: "provider_admin",
  owner: "provider_admin",

  customer: "customer_user",
  customer_user: "customer_user",

  agent: "agent_user",
  agent_user: "agent_user",
  agent_admin: "agent_user",
  broker: "agent_user",
  broker_user: "agent_user",
  broker_admin: "agent_user",
};

const ROLE_WORKSPACE_MAP: Record<AppRole, AppWorkspace> = {
  system_admin: "system",
  accountant: "system",
  support: "system",
  viewer: "system",
  provider_admin: "company",
  customer_user: "customer",
  agent_user: "agent",
};

// ======================================================
// HELPERS
// ======================================================

function resolveApiUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
    "";

  const safePath = path.startsWith("/") ? path : `/${path}`;

  return base ? `${base}${safePath}` : safePath;
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );
}

function normalizeRole(value: unknown): AppRole | string | null {
  const role = String(value || "").trim().toLowerCase();

  if (!role) return null;

  return ROLE_ALIASES[role] || role;
}

function normalizeWorkspace(value: unknown): AppWorkspace | string | null {
  const workspace = String(value || "").trim().toLowerCase();

  if (!workspace) return null;

  if (workspace === "company" || workspace === "center") { return "company"; }

  if (
    workspace === "system" ||
    workspace === "company" ||
    workspace === "customer" ||
    workspace === "agent"
  ) {
    return workspace;
  }

  return workspace;
}

function isAppRole(value: AppRole | string | null | undefined): value is AppRole {
  return (
    value === "system_admin" ||
    value === "provider_admin" ||
    value === "customer_user" ||
    value === "agent_user" ||
    value === "accountant" ||
    value === "support" ||
    value === "viewer"
  );
}

function inferWorkspaceFromRole(
  role: AppRole | string | null | undefined,
): AppWorkspace | null {
  if (!role) return null;

  if (isAppRole(role)) {
    return ROLE_WORKSPACE_MAP[role];
  }

  return null;
}

function normalizeNumberId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(value);

  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  return null;
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeProfile(input?: AuthProfile | null): AuthProfile {
  return {
    ...DEFAULT_AUTH_SESSION.profile,
    ...(input || {}),
    tags: uniqueStrings(input?.tags || []),
    extra_data: normalizeRecord(input?.extra_data),
  };
}

function normalizePermissions(input?: AuthPermissions | null): AuthPermissions {
  return {
    ...DEFAULT_AUTH_SESSION.permissions,
    ...(input || {}),
    is_superuser: input?.is_superuser === true,
    is_staff: input?.is_staff === true,
    groups: uniqueStrings(input?.groups || []),
    codes: uniqueStrings(input?.codes || []),
  };
}

function normalizeProfilePermissions(
  input?: AuthProfilePermissions | null,
): AuthProfilePermissions {
  return {
    ...DEFAULT_AUTH_SESSION.profile_permissions,
    ...(input || {}),
    is_superuser: input?.is_superuser === true,
    is_staff: input?.is_staff === true,
    groups: uniqueStrings(input?.groups || []),
    codes: uniqueStrings(input?.codes || []),
    role: normalizeRole(input?.role),
    workspace: normalizeWorkspace(input?.workspace),
  };
}

function resolveDashboardPath(
  dashboardPath: unknown,
  workspace: AppWorkspace | string | null,
): string {
  const explicit = String(dashboardPath || "").trim();

  if (explicit) return explicit;

  if (workspace === "company") return "/provider";
  if (workspace === "customer") return "/company";
  if (workspace === "agent") return "/agent";
  if (workspace === "system") return "/system";

  return "/login";
}

function normalizeSession(
  input: Partial<AuthSession> | null | undefined,
): AuthSession {
  const permissions = normalizePermissions(input?.permissions);
  const profilePermissions = normalizeProfilePermissions(
    input?.profile_permissions,
  );
  const profile = normalizeProfile(input?.profile);

  const role: AppRole | string | null =
    normalizeRole(input?.role) ||
    normalizeRole(profilePermissions.role) ||
    normalizeRole(profile.role) ||
    normalizeRole(input?.user_type) ||
    normalizeRole(profile.user_type) ||
    null;

  const workspace: AppWorkspace | string | null =
    normalizeWorkspace(input?.workspace) ||
    normalizeWorkspace(profilePermissions.workspace) ||
    normalizeWorkspace(profile.workspace) ||
    inferWorkspaceFromRole(role) ||
    null;

  const rawPermissionCodes = uniqueStrings([
    ...(input?.permission_codes || []),
    ...(permissions.codes || []),
    ...(profilePermissions.codes || []),
  ]);

  const normalizedPermissions: AuthPermissions = {
    ...permissions,
    is_superuser:
      input?.is_superuser === true ||
      permissions.is_superuser === true ||
      profilePermissions.is_superuser === true,
    is_staff:
      input?.is_staff === true ||
      permissions.is_staff === true ||
      profilePermissions.is_staff === true,
    groups: uniqueStrings([
      ...(permissions.groups || []),
      ...(profilePermissions.groups || []),
    ]),
    codes: rawPermissionCodes,
  };

  const normalizedProfilePermissions: AuthProfilePermissions = {
    ...profilePermissions,
    is_superuser:
      input?.is_superuser === true ||
      permissions.is_superuser === true ||
      profilePermissions.is_superuser === true,
    is_staff:
      input?.is_staff === true ||
      permissions.is_staff === true ||
      profilePermissions.is_staff === true,
    role,
    workspace,
    codes: rawPermissionCodes,
  };

  const normalizedProfile: AuthProfile = {
    ...profile,
    role,
    workspace,
    user_type: input?.user_type || profile.user_type || role,
  };

  const isSystemUser =
    input?.is_system_user === true ||
    workspace === "system" ||
    role === "system_admin" ||
    role === "accountant" ||
    role === "support" ||
    role === "viewer";

  return {
    ...DEFAULT_AUTH_SESSION,
    ...(input || {}),

    authenticated: input?.authenticated === true,

    is_superuser:
      input?.is_superuser === true ||
      permissions.is_superuser === true ||
      profilePermissions.is_superuser === true,

    is_staff:
      input?.is_staff === true ||
      permissions.is_staff === true ||
      profilePermissions.is_staff === true,

    is_system_user: isSystemUser,

    workspace,
    dashboard_path: resolveDashboardPath(input?.dashboard_path, workspace),

    role,
    user_type: input?.user_type || profile.user_type || role,
    scope_type: input?.scope_type || null,

    entity_type: input?.entity_type || null,
    entity_id: normalizeNumberId(input?.entity_id),

    company: input?.company || null,
    company_id: normalizeNumberId(input?.company_id),
    provider_id: normalizeNumberId(input?.provider_id),
    center_id: normalizeNumberId(input?.center_id),
    customer_id: normalizeNumberId(input?.customer_id),
    agent_id: normalizeNumberId(input?.agent_id),
    broker_id: normalizeNumberId(input?.broker_id),

    user: input?.user || null,

    subscription: input?.subscription
      ? {
          ...input.subscription,
          apps: uniqueStrings(input.subscription.apps || []),
        }
      : null,

    permission_codes: rawPermissionCodes,
    permissions: normalizedPermissions,
    profile_permissions: normalizedProfilePermissions,
    profile: normalizedProfile,
    session: input?.session || null,
  };
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password/") ||
    pathname.startsWith("/public/")
  );
}

function applyPreferredLocale(session: AuthSession): void {
  try {
    if (typeof window === "undefined") return;

    const preferred = session.profile?.preferred_language;

    if (preferred !== "ar" && preferred !== "en") return;

    const current = window.localStorage.getItem("primey-locale");

    if (current === preferred) return;

    window.localStorage.setItem("primey-locale", preferred);
    document.documentElement.lang = preferred;
    document.documentElement.dir = preferred === "ar" ? "rtl" : "ltr";
    document.body.dir = preferred === "ar" ? "rtl" : "ltr";
    window.dispatchEvent(new Event("primey-locale-changed"));
  } catch {
    // ignore locale errors
  }
}

async function fetchJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// ======================================================
// CONTEXT
// ======================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ======================================================
// PROVIDER
// ======================================================

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: Partial<AuthSession>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<AuthSession>(
    normalizeSession(initialUser),
  );

  const logoutLocal = React.useCallback(() => {
    try {
      localStorage.setItem("primey_logout", Date.now().toString());
    } catch {
      // ignore localStorage errors
    }

    setSession(normalizeSession(null));
  }, []);

  const refreshSession = React.useCallback(async (): Promise<AuthSession> => {
    const response = await fetch(resolveApiUrl("/api/auth/whoami/"), {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = await fetchJsonSafely(response);
      const message =
        payload &&
        typeof payload === "object" &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : `Failed to validate session: HTTP ${response.status}`;

      throw new Error(message);
    }

    const data = (await response.json()) as Partial<AuthSession>;
    const normalized = normalizeSession(data);

    setSession(normalized);

    if (normalized.authenticated) {
      applyPreferredLocale(normalized);
    }

    return normalized;
  }, []);

  useEffect(() => {
    let active = true;

    async function validateSession() {
      try {
        const normalized = await refreshSession();

        if (!active) return;

        if (!normalized.authenticated) {
          logoutLocal();

          if (!isPublicPath(pathname)) {
            router.replace("/login");
          }

          return;
        }

        if (pathname === "/login") {
          router.replace(normalized.dashboard_path || "/system");
        }
      } catch (error) {
        if (!active) return;

        console.error("AuthProvider session validation failed:", error);
        logoutLocal();

        if (!isPublicPath(pathname)) {
          router.replace("/login");
        }
      }
    }

    validateSession();

    const interval = window.setInterval(validateSession, 60_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [logoutLocal, pathname, refreshSession, router]);

  useEffect(() => {
    function syncLogout(event: StorageEvent) {
      if (event.key === "primey_logout") {
        setSession(normalizeSession(null));

        if (!isPublicPath(pathname)) {
          router.replace("/login");
        }
      }
    }

    window.addEventListener("storage", syncLogout);

    return () => {
      window.removeEventListener("storage", syncLogout);
    };
  }, [pathname, router]);

  const contextValue = useMemo(
    () => ({
      session,
      setSession,
      refreshSession,
      logoutLocal,
    }),
    [logoutLocal, refreshSession, session],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ======================================================
// HOOKS
// ======================================================

export function useAuth(): AuthSession {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx.session;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }

  return ctx;
}

// ======================================================
// OPTIONAL EXPORTS
// ======================================================

export { DEFAULT_AUTH_SESSION, normalizeSession };
