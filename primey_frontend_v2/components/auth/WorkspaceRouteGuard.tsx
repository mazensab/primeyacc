/* ============================================================
   📂 components/auth/WorkspaceRouteGuard.tsx
   🧠 Mhamcloud | Workspace Route Guard — Phase 5.1.2

   ✅ يحمي مداخل مساحات العمل
   ✅ يعتمد على AuthProvider الحالي بدون كسر المنجز السابق
   ✅ يوجه غير المسجل إلى /login مع next
   ✅ يوجه المستخدم للمساحة المناسبة عند اختلاف الصلاحية

   القاعدة المعتمدة:
   - لا نكرر AuthProvider.
   - لا نضيف باكند جديد.
   - لا نضيف ملفات backup.
   - الحارس مرن مع شكل whoami الحالي والمستقبلي.
============================================================ */

"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

type Workspace = "system" | "company" | "agent" | "customer";
type UnknownRecord = Record<string, unknown>;

type AuthSnapshot = {
  status?: string;
  loading?: boolean;
  isLoading?: boolean;
  authenticated?: boolean;
  isAuthenticated?: boolean;
  user?: UnknownRecord | null;
  profile?: UnknownRecord | null;
  data?: UnknownRecord | null;
  workspace?: string | null;
  permissions?: UnknownRecord | null;
};

const WORKSPACE_HOME: Record<Workspace, string> = {
  system: "/system",
  company: "/company",
  agent: "/agent",
  customer: "/customer",
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function normalizeText(value: unknown) {
  return String(value || "").toLowerCase().trim();
}

function getUser(session: AuthSnapshot) {
  const data = asRecord(session.data);

  return asRecord(
    session.user ||
      session.profile ||
      data.user ||
      data.profile ||
      data.account ||
      data,
  );
}

function isSessionLoading(session: AuthSnapshot) {
  const status = normalizeText(session.status);

  return (
    session.loading === true ||
    session.isLoading === true ||
    status === "loading" ||
    status === "checking" ||
    status === "idle"
  );
}

function isAuthenticated(session: AuthSnapshot) {
  const status = normalizeText(session.status);

  if (session.authenticated === true || session.isAuthenticated === true) return true;
  if (status === "authenticated" || status === "ready") return true;
  if (session.user || session.profile) return true;

  return false;
}

function resolveWorkspace(session: AuthSnapshot): Workspace | null {
  const user = getUser(session);
  const permissions = asRecord(session.permissions);

  const workspace = normalizeText(
    session.workspace ||
      permissions.workspace ||
      user.workspace ||
      user.workspace_type ||
      user.default_workspace ||
      user.dashboard,
  );

  const role = normalizeText(
    user.role ||
      user.user_role ||
      user.user_type ||
      user.type ||
      user.kind ||
      user.position,
  );

  const isStaff = user.is_staff === true || user.is_superuser === true;

  if (
    workspace === "system" ||
    role.includes("super") ||
    role.includes("admin") ||
    role.includes("staff") ||
    role.includes("accountant") ||
    isStaff
  ) {
    return "system";
  }

  if (
    workspace === "company" ||
    workspace === "center" ||
    workspace === "provider" ||
    role.includes("company") ||
    role.includes("center") ||
    role.includes("provider")
  ) {
    return "company";
  }

  if (workspace === "agent" || role.includes("agent")) return "agent";
  if (workspace === "customer" || role.includes("customer")) return "customer";

  return null;
}

function buildLoginPath(pathname: string) {
  const next = pathname && pathname.startsWith("/") ? pathname : "/system";
  return `/login?next=${encodeURIComponent(next)}`;
}

export function WorkspaceRouteGuard({
  children,
  workspace,
}: {
  children: ReactNode;
  workspace: Workspace;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth() as AuthSnapshot;

  const state = useMemo(() => {
    const loading = isSessionLoading(auth);
    const authenticated = isAuthenticated(auth);
    const actualWorkspace = resolveWorkspace(auth);
    const allowed = authenticated && actualWorkspace === workspace;

    return {
      loading,
      authenticated,
      actualWorkspace,
      allowed,
    };
  }, [auth, workspace]);

  useEffect(() => {
    if (state.loading) return;

    if (!state.authenticated) {
      router.replace(buildLoginPath(pathname));
      return;
    }

    if (!state.allowed) {
      const fallback = state.actualWorkspace
        ? WORKSPACE_HOME[state.actualWorkspace]
        : "/login";

      router.replace(fallback);
    }
  }, [
    pathname,
    router,
    state.actualWorkspace,
    state.allowed,
    state.authenticated,
    state.loading,
  ]);

  if (state.loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="rounded-3xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Mhamcloud</p>
          <h1 className="mt-2 text-xl font-bold">جاري التحقق من الجلسة...</h1>
        </div>
      </main>
    );
  }

  if (!state.authenticated || !state.allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="rounded-3xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Mhamcloud</p>
          <h1 className="mt-2 text-xl font-bold">جاري تحويلك للمساحة المناسبة...</h1>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}