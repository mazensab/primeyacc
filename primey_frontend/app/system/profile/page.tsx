"use client";

/* ============================================================
   📂 primey_frontend/app/system/profile/page.tsx
   👤 Mhamcloud — System Account Profile
   ------------------------------------------------------------
   ✅ Real session data from AuthProvider / whoami
   ✅ Read-only until a real auth profile update API exists
   ✅ No fake data
   ✅ Arabic / English
   ✅ Premium UI
   ✅ sonner notifications
   ✅ Refreshes current session safely
============================================================ */

import * as React from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Languages,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";

import {
  useAuthContext,
  type AuthProfile,
  type AuthSession,
  type AuthUser,
} from "@/components/providers/AuthProvider";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Locale = "ar" | "en";

const translations = {
  ar: {
    badge: "حساب النظام",
    title: "الملف الشخصي",
    subtitle:
      "بيانات حساب مستخدم النظام الحالية كما يعرضها نظام المصادقة والجلسة.",
    refresh: "تحديث البيانات",
    refreshing: "جاري التحديث...",
    refreshed: "تم تحديث بيانات الحساب.",
    refreshError: "تعذر تحديث بيانات الحساب.",
    identity: "هوية المستخدم",
    identityDesc:
      "البيانات الأساسية المرتبطة بحساب تسجيل الدخول الحالي.",
    profile: "بيانات الملف",
    profileDesc:
      "بيانات الملف الشخصي المتاحة حاليًا من جلسة المستخدم.",
    access: "الوصول والصلاحيات",
    accessDesc:
      "ملخص مساحة العمل والدور وصلاحيات الجلسة الحالية.",
    fullName: "الاسم",
    username: "اسم المستخدم",
    email: "البريد الإلكتروني",
    role: "الدور",
    workspace: "مساحة العمل",
    language: "اللغة المفضلة",
    timezone: "المنطقة الزمنية",
    phone: "رقم الجوال",
    whatsapp: "رقم واتساب",
    alternateEmail: "البريد البديل",
    lastLogin: "آخر تسجيل دخول",
    permissionCount: "عدد الصلاحيات",
    accountStatus: "حالة الحساب",
    authenticated: "مسجل الدخول",
    systemUser: "مستخدم نظام",
    staff: "طاقم النظام",
    superuser: "مدير بصلاحيات كاملة",
    verified: "موثق",
    notVerified: "غير موثق",
    available: "متوفر",
    unavailable: "غير متوفر",
    readOnlyTitle: "الملف للعرض حاليًا",
    readOnlyDesc:
      "لا يوجد عقد API معتمد حاليًا لتعديل ملف مستخدم النظام. تم إبقاء الصفحة للعرض فقط حتى لا ترسل الواجهة بيانات إلى مسار غير موجود.",
    arabic: "العربية",
    english: "English",
    unknown: "غير محدد",
  },
  en: {
    badge: "System account",
    title: "Profile",
    subtitle:
      "Current system-user account data provided by authentication and session state.",
    refresh: "Refresh data",
    refreshing: "Refreshing...",
    refreshed: "Account data refreshed.",
    refreshError: "Could not refresh account data.",
    identity: "User identity",
    identityDesc:
      "Core information associated with the current signed-in account.",
    profile: "Profile details",
    profileDesc:
      "Profile information currently available from the authenticated session.",
    access: "Access & permissions",
    accessDesc:
      "Current workspace, role, and session permission summary.",
    fullName: "Name",
    username: "Username",
    email: "Email",
    role: "Role",
    workspace: "Workspace",
    language: "Preferred language",
    timezone: "Timezone",
    phone: "Phone",
    whatsapp: "WhatsApp",
    alternateEmail: "Alternate email",
    lastLogin: "Last login",
    permissionCount: "Permissions",
    accountStatus: "Account status",
    authenticated: "Signed in",
    systemUser: "System user",
    staff: "System staff",
    superuser: "Full-access administrator",
    verified: "Verified",
    notVerified: "Not verified",
    available: "Available",
    unavailable: "Unavailable",
    readOnlyTitle: "Profile is currently read-only",
    readOnlyDesc:
      "There is currently no approved API contract for editing a system user's profile. This page remains read-only rather than sending data to a non-existent endpoint.",
    arabic: "Arabic",
    english: "English",
    unknown: "Unknown",
  },
} as const;


function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "ar";
  }

  return window.localStorage.getItem("primey-locale") === "en"
    ? "en"
    : "ar";
}


function toText(
  value: unknown,
  fallback = "",
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const text = String(value).trim();

  return text || fallback;
}


function formatDateTime(
  value: unknown,
  locale: Locale,
): string {
  const text = toText(value);

  if (!text) {
    return "—";
  }

  const parsed = new Date(text);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return text;
  }

  try {
    return new Intl.DateTimeFormat(
      locale === "ar"
        ? "ar-SA"
        : "en-US",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    ).format(parsed);
  } catch {
    return text;
  }
}


function getDisplayName(
  user: AuthUser | null | undefined,
  profile: AuthProfile | null | undefined,
  fallback: string,
): string {
  const profileName = toText(
    profile?.display_name,
  );

  if (profileName) {
    return profileName;
  }

  const fullName = toText(
    user?.full_name,
  );

  if (fullName) {
    return fullName;
  }

  const composed = [
    toText(user?.first_name),
    toText(user?.last_name),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (composed) {
    return composed;
  }

  return (
    toText(user?.username) ||
    toText(user?.email) ||
    fallback
  );
}


function getAvatarFallback(
  name: string,
): string {
  const clean = name.trim();

  return clean
    ? clean.charAt(0).toUpperCase()
    : "U";
}


function getRoleLabel(
  role: unknown,
  locale: Locale,
): string {
  const normalized = toText(role)
    .toLowerCase();

  const labels: Record<
    string,
    {
      ar: string;
      en: string;
    }
  > = {
    system_admin: {
      ar: "مدير النظام",
      en: "System Admin",
    },
    super_admin: {
      ar: "مدير عام",
      en: "Super Admin",
    },
    accountant: {
      ar: "محاسب",
      en: "Accountant",
    },
    support: {
      ar: "دعم فني",
      en: "Support",
    },
    viewer: {
      ar: "مشاهد",
      en: "Viewer",
    },
  };

  return (
    labels[normalized]?.[locale] ||
    normalized ||
    translations[locale].unknown
  );
}


function getWorkspaceLabel(
  workspace: unknown,
  locale: Locale,
): string {
  const normalized = toText(
    workspace,
  ).toLowerCase();

  if (normalized === "system") {
    return locale === "ar"
      ? "النظام"
      : "System";
  }

  return (
    normalized ||
    translations[locale].unknown
  );
}


function uniquePermissions(
  session: AuthSession,
): string[] {
  return Array.from(
    new Set(
      [
        ...(session.permission_codes || []),
        ...(session.permissions?.codes || []),
        ...(session.profile_permissions?.codes || []),
      ]
        .map((item) =>
          String(item || "").trim(),
        )
        .filter(Boolean),
    ),
  );
}


function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-2xl border bg-background px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <div className="mt-1 truncate text-sm font-semibold text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}


function ProfileSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Card className="rounded-3xl">
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </CardHeader>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({
            length: 3,
          }).map((_, index) => (
            <Card
              key={index}
              className="rounded-2xl"
            >
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>

              <CardContent>
                <Skeleton className="h-64 w-full rounded-2xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}


export default function SystemProfilePage() {
  const {
    session,
    refreshSession,
  } = useAuthContext();

  const [locale, setLocale] =
    React.useState<Locale>("ar");

  const [refreshing, setRefreshing] =
    React.useState(false);

  const [ready, setReady] =
    React.useState(false);

  React.useEffect(() => {
    const applyLocale = () => {
      const nextLocale =
        getInitialLocale();

      setLocale(
        nextLocale,
      );

      document.documentElement.lang =
        nextLocale;

      document.documentElement.dir =
        nextLocale === "ar"
          ? "rtl"
          : "ltr";

      document.body.dir =
        nextLocale === "ar"
          ? "rtl"
          : "ltr";

      setReady(true);
    };

    applyLocale();

    window.addEventListener(
      "storage",
      applyLocale,
    );

    window.addEventListener(
      "primey-locale-changed",
      applyLocale,
    );

    return () => {
      window.removeEventListener(
        "storage",
        applyLocale,
      );

      window.removeEventListener(
        "primey-locale-changed",
        applyLocale,
      );
    };
  }, []);

  const t =
    translations[locale];

  const dir =
    locale === "ar"
      ? "rtl"
      : "ltr";

  const user =
    session.user || null;

  const profile =
    session.profile || null;

  const displayName =
    getDisplayName(
      user,
      profile,
      locale === "ar"
        ? "مستخدم النظام"
        : "System User",
    );

  const avatar =
    toText(profile?.avatar_url) ||
    toText(
      user?.avatar,
    ) ||
    "";

  const role =
    session.role ||
    profile?.role ||
    session.profile_permissions?.role;

  const workspace =
    session.workspace ||
    profile?.workspace ||
    session.profile_permissions?.workspace;

  const permissionCodes =
    uniquePermissions(
      session,
    );

  const preferredLanguage =
    profile?.preferred_language === "en"
      ? t.english
      : profile?.preferred_language === "ar"
        ? t.arabic
        : t.unknown;

  const accountFlags = [
    session.authenticated
      ? t.authenticated
      : null,
    session.is_system_user
      ? t.systemUser
      : null,
    session.is_staff
      ? t.staff
      : null,
    session.is_superuser
      ? t.superuser
      : null,
  ].filter(Boolean) as string[];

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    try {
      setRefreshing(true);

      await refreshSession();

      toast.success(
        t.refreshed,
      );
    } catch (error) {
      console.error(
        "System profile refresh error:",
        error,
      );

      toast.error(
        t.refreshError,
      );
    } finally {
      setRefreshing(false);
    }
  }

  if (!ready) {
    return <ProfileSkeleton />;
  }

  return (
    <main
      dir={dir}
      className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="w-full space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />

            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar className="h-20 w-20 shrink-0 rounded-3xl border bg-background shadow-sm">
                  {avatar ? (
                    <AvatarImage
                      src={avatar}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                    />
                  ) : null}

                  <AvatarFallback className="rounded-3xl bg-primary/10 text-2xl font-bold text-primary">
                    {getAvatarFallback(
                      displayName,
                    )}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                    <UserCircle2 className="h-3.5 w-3.5 text-primary" />
                    {t.badge}
                  </div>

                  <h1 className="truncate text-3xl font-bold tracking-tight sm:text-4xl">
                    {t.title}
                  </h1>

                  <p className="mt-2 text-lg font-semibold">
                    {displayName}
                  </p>

                  <p className="mt-1 max-w-3xl text-sm leading-7 text-muted-foreground">
                    {t.subtitle}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="h-9 rounded-xl bg-background"
                disabled={refreshing}
                onClick={() =>
                  void handleRefresh()
                }
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}

                {refreshing
                  ? t.refreshing
                  : t.refresh}
              </Button>
            </div>
          </div>
        </section>

        <Card className="rounded-2xl border-amber-200/70 bg-amber-50/70 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardContent className="flex gap-3 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <ShieldCheck className="h-5 w-5" />
            </span>

            <div>
              <p className="font-semibold">
                {t.readOnlyTitle}
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t.readOnlyDesc}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-3">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">
                {t.identity}
              </CardTitle>

              <CardDescription>
                {t.identityDesc}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <InfoRow
                label={t.fullName}
                value={displayName}
                icon={UserCircle2}
              />

              <InfoRow
                label={t.username}
                value={
                  toText(
                    user?.username,
                    "—",
                  )
                }
                icon={BadgeCheck}
              />

              <InfoRow
                label={t.email}
                value={
                  toText(
                    user?.email,
                    "—",
                  )
                }
                icon={Mail}
              />

              <InfoRow
                label={t.lastLogin}
                value={formatDateTime(
                  user?.last_login,
                  locale,
                )}
                icon={Clock3}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">
                {t.profile}
              </CardTitle>

              <CardDescription>
                {t.profileDesc}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <InfoRow
                label={t.phone}
                value={
                  toText(
                    profile?.phone_number,
                    "—",
                  )
                }
                icon={Phone}
              />

              <InfoRow
                label={t.whatsapp}
                value={
                  toText(
                    profile?.whatsapp_number,
                    "—",
                  )
                }
                icon={MessageCircle}
              />

              <InfoRow
                label={t.alternateEmail}
                value={
                  toText(
                    profile?.alternate_email,
                    "—",
                  )
                }
                icon={Mail}
              />

              <InfoRow
                label={t.language}
                value={preferredLanguage}
                icon={Languages}
              />

              <InfoRow
                label={t.timezone}
                value={
                  toText(
                    profile?.timezone,
                    "—",
                  )
                }
                icon={Clock3}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">
                {t.access}
              </CardTitle>

              <CardDescription>
                {t.accessDesc}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <InfoRow
                label={t.role}
                value={getRoleLabel(
                  role,
                  locale,
                )}
                icon={ShieldCheck}
              />

              <InfoRow
                label={t.workspace}
                value={getWorkspaceLabel(
                  workspace,
                  locale,
                )}
                icon={BadgeCheck}
              />

              <InfoRow
                label={t.permissionCount}
                value={
                  permissionCodes.length
                }
                icon={ShieldCheck}
              />

              <div className="rounded-2xl border bg-background px-4 py-4">
                <p className="text-xs text-muted-foreground">
                  {t.accountStatus}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {accountFlags.length ? (
                    accountFlags.map(
                      (flag) => (
                        <Badge
                          key={flag}
                          variant="outline"
                          className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {flag}
                        </Badge>
                      ),
                    )
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-full"
                    >
                      {t.unknown}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
