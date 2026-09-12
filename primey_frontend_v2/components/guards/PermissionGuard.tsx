"use client";

// ======================================================
// 📂 الملف: components/guards/PermissionGuard.tsx
// 🧭 Mhamcloud — Page Permission Guard
// 🚀 الإصدار: Permission Guard V1.1
// ------------------------------------------------------
// ✅ حماية الصفحات حسب الصلاحية
// ✅ يدعم permission / anyPermissions / allPermissions
// ✅ يدعم roles / workspaces
// ✅ يدعم redirect عند عدم التصريح
// ✅ متوافق مع AuthProvider + use-permissions
// ======================================================

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";

import { usePermissions } from "@/hooks/use-permissions";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type {
  AppWorkspace,
  PermissionCheckInput,
} from "@/lib/permissions";

import type {
  AppRole,
  PermissionCode,
} from "@/components/providers/AuthProvider";

// ======================================================
// TYPES
// ======================================================

export type PermissionGuardMode = "hide" | "fallback" | "redirect";

type PermissionGuardPermissionProps = {
  permission?: PermissionCode | string | null;
  permissions?: readonly (PermissionCode | string)[] | null;
  anyPermissions?: readonly (PermissionCode | string)[] | null;
  allPermissions?: readonly (PermissionCode | string)[] | null;

  role?: AppRole | string | null;
  roles?: readonly (AppRole | string)[] | null;

  workspace?: AppWorkspace | string | null;
  workspaces?: readonly (AppWorkspace | string)[] | null;
};

export type PermissionGuardProps = PermissionGuardPermissionProps & {
  children: ReactNode;

  /**
   * fallback:
   * يعرض بطاقة غير مصرح.
   *
   * redirect:
   * يحول المستخدم لمسار آخر.
   *
   * hide:
   * يخفي المحتوى فقط.
   */
  mode?: PermissionGuardMode;

  redirectTo?: string;
  loginPath?: string;

  fallback?: ReactNode;

  title?: string;
  description?: string;
  actionLabel?: string;

  loadingFallback?: ReactNode;
};

// ======================================================
// HELPERS
// ======================================================

function buildPermissionInput(
  props: PermissionGuardPermissionProps
): PermissionCheckInput {
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

function DefaultLoadingFallback() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl border bg-background px-5 py-4 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          جاري التحقق من صلاحيات الدخول...
        </span>
      </div>
    </div>
  );
}

function DefaultForbiddenFallback({
  title = "غير مصرح بالوصول",
  description = "لا تملك الصلاحية المطلوبة للوصول إلى هذه الصفحة أو تنفيذ هذا الإجراء.",
  actionLabel = "العودة للوحة التحكم",
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center p-4">
      <Card className="w-full max-w-xl rounded-3xl border shadow-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border bg-muted">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <CardDescription className="text-sm leading-7">
              {description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-3">
          <Button onClick={onAction} className="rounded-2xl">
            {actionLabel}
          </Button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-4 w-4" />
            <span>تم منع الوصول بواسطة نظام الصلاحيات.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DefaultUnauthenticatedFallback({
  onAction,
}: {
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center p-4">
      <Card className="w-full max-w-xl rounded-3xl border shadow-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border bg-muted">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">
              يلزم تسجيل الدخول
            </CardTitle>
            <CardDescription className="text-sm leading-7">
              يجب تسجيل الدخول أولًا حتى تتمكن من الوصول إلى هذه الصفحة.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex justify-center">
          <Button onClick={onAction} className="rounded-2xl">
            الذهاب لتسجيل الدخول
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ======================================================
// COMPONENT
// ======================================================

export function PermissionGuard({
  children,

  mode = "fallback",
  redirectTo,
  loginPath = "/login",

  fallback,
  title,
  description,
  actionLabel,

  loadingFallback,

  ...permissionProps
}: PermissionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const permissions = usePermissions();

  const authenticated = permissions.authenticated;
  const allowed = permissions.canAccess(buildPermissionInput(permissionProps));

  const dashboardPath =
    permissions.session.dashboard_path ||
    (permissions.workspace ? `/${permissions.workspace}` : "/system");

  const finalRedirectTo = redirectTo || dashboardPath || "/system";

  useEffect(() => {
    if (mode !== "redirect") return;

    if (!authenticated) {
      router.replace(`${loginPath}?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!allowed) {
      router.replace(finalRedirectTo);
    }
  }, [
    allowed,
    authenticated,
    finalRedirectTo,
    loginPath,
    mode,
    pathname,
    router,
  ]);

  /**
   * في أول تحميل قد تكون الجلسة ما زالت تتحقق.
   * AuthProvider يبدأ بـ authenticated false ثم يحدثها من whoami.
   */
  if (!authenticated && mode === "redirect") {
    return <>{loadingFallback || <DefaultLoadingFallback />}</>;
  }

  if (!authenticated) {
    if (mode === "hide") return null;

    if (mode === "redirect") {
      return <>{loadingFallback || <DefaultLoadingFallback />}</>;
    }

    return (
      <>
        {fallback || (
          <DefaultUnauthenticatedFallback
            onAction={() =>
              router.replace(`${loginPath}?next=${encodeURIComponent(pathname)}`)
            }
          />
        )}
      </>
    );
  }

  if (!allowed) {
    if (mode === "hide") return null;

    if (mode === "redirect") {
      return <>{loadingFallback || <DefaultLoadingFallback />}</>;
    }

    return (
      <>
        {fallback || (
          <DefaultForbiddenFallback
            title={title}
            description={description}
            actionLabel={actionLabel}
            onAction={() => router.replace(finalRedirectTo)}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}

export default PermissionGuard;