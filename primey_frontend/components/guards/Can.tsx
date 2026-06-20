"use client";

// ======================================================
// 📂 الملف: components/guards/Can.tsx
// 🧭 Primey Care — Action Permission Guard
// 🚀 الإصدار: Can Guard V1.1
// ------------------------------------------------------
// ✅ إظهار/إخفاء الأزرار والأكشنز حسب الصلاحية
// ✅ يدعم permission / anyPermissions / allPermissions
// ✅ يدعم roles / workspaces
// ✅ مناسب للاستخدام داخل الصفحات والسايدر
// ======================================================

import type { ReactNode } from "react";

import { usePermissions } from "@/hooks/use-permissions";

import type { AppWorkspace, PermissionCheckInput } from "@/lib/permissions";

import type {
  AppRole,
  PermissionCode,
} from "@/components/providers/AuthProvider";

// ======================================================
// TYPES
// ======================================================

type CanFallbackProps = {
  reason?: "unauthenticated" | "forbidden";
};

type CanPermissionProps = {
  permission?: PermissionCode | string | null;
  permissions?: readonly (PermissionCode | string)[] | null;
  anyPermissions?: readonly (PermissionCode | string)[] | null;
  allPermissions?: readonly (PermissionCode | string)[] | null;

  role?: AppRole | string | null;
  roles?: readonly (AppRole | string)[] | null;

  workspace?: AppWorkspace | string | null;
  workspaces?: readonly (AppWorkspace | string)[] | null;
};

export type CanProps = CanPermissionProps & {
  children: ReactNode;

  fallback?: ReactNode | ((props: CanFallbackProps) => ReactNode);

  /**
   * عند true:
   * المستخدم غير المسجل لا يرى fallback.
   * مفيد للأزرار داخل صفحات محمية.
   */
  hideWhenUnauthenticated?: boolean;
};

// ======================================================
// HELPERS
// ======================================================

function renderFallback(
  fallback: CanProps["fallback"],
  reason: CanFallbackProps["reason"]
): ReactNode {
  if (!fallback) return null;

  if (typeof fallback === "function") {
    return fallback({ reason });
  }

  return fallback;
}

function buildPermissionInput(props: CanPermissionProps): PermissionCheckInput {
  return {
    permission: props.permission,
    permissions: props.permissions,
    anyPermissions: props.anyPermissions,
    allPermissions: props.allPermissions,
    role: props.role,
    roles: props.roles,
    workspace: props.workspace,
    workspaces: props.workspaces,
  };
}

// ======================================================
// COMPONENT
// ======================================================

export function Can({
  children,
  fallback = null,
  hideWhenUnauthenticated = true,
  ...permissionProps
}: CanProps) {
  const permissions = usePermissions();

  if (!permissions.authenticated) {
    if (hideWhenUnauthenticated) return null;
    return <>{renderFallback(fallback, "unauthenticated")}</>;
  }

  const allowed = permissions.canAccess(buildPermissionInput(permissionProps));

  if (!allowed) {
    return <>{renderFallback(fallback, "forbidden")}</>;
  }

  return <>{children}</>;
}

export default Can;