// ======================================================
// 📂 الملف: hooks/use-permissions.ts
// 🧭 Mhamcloud — Permissions Hook
// 🚀 الإصدار: Permissions Hook V1.0
// ------------------------------------------------------
// ✅ Hook مركزي لاستخدام الصلاحيات داخل الصفحات والمكونات
// ✅ يعتمد على AuthProvider + lib/permissions.ts
// ✅ يدعم Sidebar / Pages / Actions
// ======================================================

"use client";

import { useMemo } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  canAccess,
  canAccessItem,
  canAccessPath,
  filterByPermissions,
  getSessionPermissions,
  getSessionRole,
  getSessionWorkspace,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
  hasAnyWorkspace,
  hasPermission,
  hasRole,
  hasWorkspace,
  isAuthenticated,
  isSystemAdmin,
  type AppWorkspace,
  type PermissionCheckInput,
  type PermissionedItem,
} from "@/lib/permissions";

import type {
  AppRole,
  AuthSession,
  PermissionCode,
} from "@/components/providers/AuthProvider";

// ======================================================
// TYPES
// ======================================================

export type UsePermissionsResult = {
  session: AuthSession;

  authenticated: boolean;
  isSuperuser: boolean;
  isSystemAdmin: boolean;

  role: string;
  workspace: string;
  permissions: string[];

  can: (permission: PermissionCode | string | null | undefined) => boolean;
  canAny: (
    permissions: readonly (PermissionCode | string)[] | null | undefined
  ) => boolean;
  canAll: (
    permissions: readonly (PermissionCode | string)[] | null | undefined
  ) => boolean;

  hasRole: (role: AppRole | string | null | undefined) => boolean;
  hasAnyRole: (
    roles: readonly (AppRole | string)[] | null | undefined
  ) => boolean;

  hasWorkspace: (
    workspace: AppWorkspace | string | null | undefined
  ) => boolean;
  hasAnyWorkspace: (
    workspaces: readonly (AppWorkspace | string)[] | null | undefined
  ) => boolean;

  canAccess: (input: PermissionCheckInput) => boolean;
  canAccessPath: (pathname: string) => boolean;

  canAccessItem: <T extends PermissionedItem>(item: T) => boolean;
  filterByPermissions: <T extends PermissionedItem>(items: T[]) => T[];
};

// ======================================================
// HOOK
// ======================================================

export function usePermissions(): UsePermissionsResult {
  const session = useAuth();

  return useMemo(() => {
    const authenticated = isAuthenticated(session);
    const role = getSessionRole(session);
    const workspace = getSessionWorkspace(session);
    const permissions = getSessionPermissions(session);
    const superAdmin = isSystemAdmin(session);

    return {
      session,

      authenticated,
      isSuperuser: session.is_superuser === true,
      isSystemAdmin: superAdmin,

      role,
      workspace,
      permissions,

      can: (permission) => hasPermission(session, permission),

      canAny: (permissionList) => hasAnyPermission(session, permissionList),

      canAll: (permissionList) => hasAllPermissions(session, permissionList),

      hasRole: (wantedRole) => hasRole(session, wantedRole),

      hasAnyRole: (roles) => hasAnyRole(session, roles),

      hasWorkspace: (wantedWorkspace) =>
        hasWorkspace(session, wantedWorkspace),

      hasAnyWorkspace: (workspaces) =>
        hasAnyWorkspace(session, workspaces),

      canAccess: (input) => canAccess(session, input),

      canAccessPath: (pathname) => canAccessPath(session, pathname),

      canAccessItem: <T extends PermissionedItem>(item: T) =>
        canAccessItem(session, item),

      filterByPermissions: <T extends PermissionedItem>(items: T[]) =>
        filterByPermissions(session, items),
    };
  }, [session]);
}

// ======================================================
// CONVENIENCE HOOKS
// ======================================================

export function useCan(
  permission: PermissionCode | string | null | undefined
): boolean {
  const { can } = usePermissions();
  return can(permission);
}

export function useCanAny(
  permissions: readonly (PermissionCode | string)[] | null | undefined
): boolean {
  const { canAny } = usePermissions();
  return canAny(permissions);
}

export function useCanAll(
  permissions: readonly (PermissionCode | string)[] | null | undefined
): boolean {
  const { canAll } = usePermissions();
  return canAll(permissions);
}

export function useHasRole(
  role: AppRole | string | null | undefined
): boolean {
  const permissions = usePermissions();
  return permissions.hasRole(role);
}

export function useCanAccessPath(pathname: string): boolean {
  const permissions = usePermissions();
  return permissions.canAccessPath(pathname);
}