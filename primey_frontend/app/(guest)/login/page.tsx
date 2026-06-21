"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Languages,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  User2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* =========================================================
   📌 PrimeyAcc - Unified Login Page
   Path: primey_frontend/app/(guest)/login/page.tsx

   ✅ صفحة دخول موحدة للنظام والشركات
   ✅ دخول آمن: username/password
   ✅ يدعم العربية والإنجليزية
   ✅ يدعم RTL / LTR
   ✅ CSRF + Cookies Session
   ✅ Redirect ذكي حسب whoami/dashboard_path
   ✅ Sonner Toasts
========================================================= */

type AppLocale = "ar" | "en";
type LoginMode = "system" | "company";

type MembershipSnapshot = {
  company_id?: number | string | null;
  role?: string | null;
  workspace?: string | null;
  company?: {
    id?: number | string | null;
  } | null;
};

type WhoAmIResponse = {
  authenticated?: boolean;
  workspace?: string | null;
  dashboard_path?: string | null;
  is_system_user?: boolean;
  is_superuser?: boolean;
  is_staff?: boolean;
  role?: string | null;
  user_type?: string | null;
  scope_type?: string | null;
  company_id?: number | string | null;
  default_company_id?: number | string | null;
  agent_id?: number | string | null;
  default_membership?: MembershipSnapshot | null;
  memberships?: MembershipSnapshot[] | null;
  permissions?: {
    is_superuser?: boolean;
    is_staff?: boolean;
    groups?: string[];
  } | null;
  profile?: {
    role?: string | null;
    user_type?: string | null;
    extra_data?: Record<string, unknown> | null;
  } | null;
};

type JsonObject = Record<string, unknown>;

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() ?? null;
  }

  return null;
}

function resolveApiUrl(path: string): string {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${safePath}` : safePath;
}

function normalizeUpper(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function extractBoolean(value: unknown): boolean {
  return value === true;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstString(value: unknown): string {
  if (asString(value)) return asString(value);

  if (Array.isArray(value)) {
    const found = value.find((item) => asString(item));
    return asString(found);
  }

  return "";
}

function extractApiMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;

  const payload = data as JsonObject;

  const directMessage =
    firstString(payload.message) ||
    firstString(payload.detail) ||
    firstString(payload.error) ||
    firstString(payload.non_field_errors);

  if (directMessage) return directMessage;

  const errors = payload.errors;
  if (errors && typeof errors === "object") {
    const firstValue = Object.values(errors as JsonObject)[0];
    const message = firstString(firstValue);

    if (message) return message;
  }

  return fallback;
}

function toPositiveId(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function extractIds(user: WhoAmIResponse | null) {
  const profileExtra = user?.profile?.extra_data ?? {};
  const defaultMembership = user?.default_membership ?? null;
  const firstMembership = Array.isArray(user?.memberships)
    ? user?.memberships?.[0]
    : null;

  return {
    companyId: toPositiveId(
      user?.company_id ??
        user?.default_company_id ??
        defaultMembership?.company_id ??
        defaultMembership?.company?.id ??
        firstMembership?.company_id ??
        firstMembership?.company?.id ??
        profileExtra["company_id"] ??
        profileExtra["default_company_id"]
    ),
    agentId: toPositiveId(user?.agent_id ?? profileExtra["agent_id"]),
  };
}

function isSystemUser(user: WhoAmIResponse | null): boolean {
  if (!user) return false;

  const normalizedRole = normalizeUpper(
    user.role || user.profile?.role || user.default_membership?.role
  );
  const normalizedUserType = normalizeUpper(
    user.user_type || user.profile?.user_type
  );
  const normalizedScope = normalizeUpper(user.scope_type || user.workspace);
  const permissions = user.permissions || {};
  const groups = Array.isArray(permissions.groups)
    ? permissions.groups.map((item) => normalizeUpper(item))
    : [];

  const systemRoles = [
    "SYSTEM",
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
    "SUPPORT",
    "BILLING_MANAGER",
    "INTERNAL",
  ];

  return (
    extractBoolean(user.is_system_user) ||
    extractBoolean(user.is_superuser) ||
    extractBoolean(user.is_staff) ||
    extractBoolean(permissions.is_superuser) ||
    extractBoolean(permissions.is_staff) ||
    systemRoles.includes(normalizedRole) ||
    systemRoles.includes(normalizedUserType) ||
    normalizedScope === "SYSTEM" ||
    groups.some((group) => systemRoles.includes(group))
  );
}

function resolveRedirectPath(
  user: WhoAmIResponse | null,
  preferredMode: LoginMode
): string {
  if (!user) {
    return preferredMode === "company" ? "/company" : "/system";
  }

  const dashboardPath = String(user.dashboard_path || "").trim();
  if (dashboardPath.startsWith("/")) {
    return dashboardPath;
  }

  const workspace = normalizeUpper(
    user.workspace || user.scope_type || user.default_membership?.workspace
  );
  const { companyId, agentId } = extractIds(user);
  const role = normalizeUpper(user.role || user.profile?.role);

  if (workspace === "SYSTEM" || isSystemUser(user)) {
    return "/system";
  }

  if (workspace === "COMPANY" || companyId) {
    return "/company";
  }

  if (workspace === "AGENT" || role === "AGENT" || agentId) {
    return "/agent";
  }

  return preferredMode === "company" ? "/company" : "/system";
}

async function prepareCsrf(errorMessage: string): Promise<string> {
  const csrfResponse = await fetch(resolveApiUrl("/api/auth/csrf/"), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!csrfResponse.ok) {
    throw new Error(errorMessage);
  }

  const csrfToken = getCookie("csrftoken");

  if (!csrfToken) {
    throw new Error(errorMessage);
  }

  return csrfToken;
}

export default function Page() {
  const router = useRouter();

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [mode, setMode] = useState<LoginMode>("company");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArabic = locale === "ar";

  const content = useMemo(
    () => ({
      title: isArabic ? "مرحبا بعودتك إلى PrimeyAcc" : "Welcome back to PrimeyAcc",
      subtitle: isArabic
        ? "سجل الدخول لإدارة المحاسبة والفواتير والمخزون والاشتراكات من منصة واحدة آمنة."
        : "Sign in to manage accounting, invoicing, inventory, and subscriptions from one secure platform.",

      systemTab: isArabic ? "إدارة المنصة" : "Platform admin",
      companyTab: isArabic ? "بوابة الشركة" : "Company portal",

      usernameLabel: isArabic ? "اسم المستخدم" : "Username",
      passwordLabel: isArabic ? "كلمة المرور" : "Password",
      remember: isArabic ? "تذكرني" : "Remember me",
      resetPassword: isArabic ? "إعادة تعيين كلمة المرور" : "Reset password?",
      login: isArabic ? "تسجيل الدخول" : "Sign in",
      loading: isArabic ? "جار تسجيل الدخول..." : "Signing in...",
      passwordShow: isArabic ? "إظهار كلمة المرور" : "Show password",
      passwordHide: isArabic ? "إخفاء كلمة المرور" : "Hide password",
      securityNote: isArabic
        ? "جلسة دخول آمنة ومحمية"
        : "Secure protected session",
      welcomeBadge: isArabic ? "بوابة الدخول" : "Access portal",
      invalidCredentials: isArabic
        ? "اسم المستخدم أو كلمة المرور غير صحيحة"
        : "Invalid username or password",
      csrfMissing: isArabic
        ? "تعذر تجهيز جلسة الأمان حاول مرة أخرى"
        : "Unable to initialize secure session, please try again",
      sessionFailed: isArabic
        ? "تم تسجيل الدخول لكن تعذر التحقق من الجلسة"
        : "Signed in, but session validation failed",
      loginFailed: isArabic ? "فشل تسجيل الدخول" : "Login failed",
      requiredFields: isArabic
        ? "يرجى تعبئة اسم المستخدم وكلمة المرور"
        : "Please enter username and password",
      loginSuccess: isArabic
        ? "تم تسجيل الدخول بنجاح"
        : "Signed in successfully",
      usernamePlaceholder: isArabic ? "أدخل اسم المستخدم" : "Enter username",
      passwordPlaceholder: isArabic ? "أدخل كلمة المرور" : "Enter password",
      modeNote:
        mode === "system"
          ? isArabic
            ? "دخول إدارة المنصة مخصص لفريق PrimeyAcc وصلاحيات النظام العليا."
            : "Platform admin access is for PrimeyAcc internal and system-level roles."
          : isArabic
            ? "دخول الشركة مخصص للمالك والمدير والمحاسب والموظفين حسب صلاحيات العضوية."
            : "Company portal access is for owners, admins, accountants, and staff based on membership permissions.",
      formTitle:
        mode === "system"
          ? isArabic
            ? "دخول إدارة PrimeyAcc"
            : "PrimeyAcc admin sign in"
          : isArabic
            ? "دخول حساب الشركة"
            : "Company account sign in",
      formSubtitle:
        mode === "system"
          ? isArabic
            ? "استخدم بيانات حساب النظام للوصول إلى لوحة إدارة المنصة."
            : "Use your system account credentials to access the platform dashboard."
          : isArabic
            ? "استخدم بيانات حسابك للوصول إلى مساحة شركتك وعملياتك المالية."
            : "Use your account credentials to access your company workspace and financial operations.",
    }),
    [isArabic, mode]
  );

  useEffect(() => {
    try {
      const savedLocale =
        typeof window !== "undefined"
          ? ((window.localStorage.getItem("primeyacc-locale") ||
              window.localStorage.getItem("primey-locale")) as AppLocale | null)
          : null;

      const nextLocale: AppLocale = savedLocale === "en" ? "en" : "ar";
      setLocale(nextLocale);

      if (typeof document !== "undefined") {
        document.documentElement.lang = nextLocale;
        document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
        document.body.setAttribute("dir", nextLocale === "ar" ? "rtl" : "ltr");
      }
    } catch (err) {
      console.error("Login locale initialization error:", err);
    }
  }, []);

  const toggleLanguage = () => {
    try {
      const nextLocale: AppLocale = locale === "ar" ? "en" : "ar";
      setLocale(nextLocale);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("primeyacc-locale", nextLocale);
      }

      if (typeof document !== "undefined") {
        document.documentElement.lang = nextLocale;
        document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
        document.body.setAttribute("dir", nextLocale === "ar" ? "rtl" : "ltr");
      }
    } catch (err) {
      console.error("Login language toggle error:", err);
    }
  };

  const switchMode = (nextMode: LoginMode) => {
    if (loading) return;

    setMode(nextMode);
    setError(null);
  };

  const fetchWhoamiAndRedirect = async (preferredMode: LoginMode) => {
    const whoamiResponse = await fetch(resolveApiUrl("/api/auth/whoami/"), {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!whoamiResponse.ok) {
      throw new Error(content.sessionFailed);
    }

    const user = (await whoamiResponse.json()) as WhoAmIResponse;
    const redirectPath = resolveRedirectPath(user, preferredMode);

    router.replace(redirectPath);
  };

  /* =========================================================
     🚀 PrimeyAcc Login Handler
  ========================================================= */
  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    if (!username.trim() || !password.trim()) {
      setError(content.requiredFields);
      toast.error(content.requiredFields);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const csrfToken = await prepareCsrf(content.csrfMissing);

      const loginResponse = await fetch(resolveApiUrl("/api/auth/login/"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
          remember,
        }),
      });

      if (!loginResponse.ok) {
        let payload: unknown = null;

        try {
          payload = await loginResponse.json();
        } catch {
          payload = null;
        }

        throw new Error(extractApiMessage(payload, content.invalidCredentials));
      }

      toast.success(content.loginSuccess);
      await fetchWhoamiAndRedirect(mode);
    } catch (err) {
      const message = err instanceof Error ? err.message : content.loginFailed;

      setError(message);
      toast.error(message);
      console.error("PrimeyAcc login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(67,42,88,0.14),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(140,156,220,0.14),_transparent_36%),linear-gradient(to_bottom_right,_hsl(var(--background)),_hsl(var(--muted)/0.55))]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="absolute -left-16 top-24 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-16 bottom-16 h-60 w-60 rounded-full bg-[#8c9cdc]/15 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/20 bg-background/80 shadow-2xl backdrop-blur-xl lg:grid-cols-2">
          <section className="relative hidden min-h-[720px] overflow-hidden bg-gradient-to-br from-[#432a58] via-primary to-[#8c9cdc] text-white lg:flex">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="absolute right-[-80px] top-[-80px] h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-[-90px] left-[-90px] h-80 w-80 rounded-full bg-black/10 blur-3xl" />

            <div className="relative z-10 flex h-full w-full flex-col justify-between p-10 xl:p-14">
              <div
                className={`flex items-center gap-3 ${
                  isArabic ? "flex-row-reverse" : ""
                }`}
              >
                <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <p className="text-sm font-medium text-white/80">
                    {content.welcomeBadge}
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight">
                    PrimeyAcc
                  </h1>
                </div>
              </div>

              <div className={isArabic ? "text-right" : "text-left"}>
                <div
                  className={`mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur ${
                    isArabic ? "flex-row-reverse" : ""
                  }`}
                >
                  <LockKeyhole className="h-4 w-4" />
                  <span>{content.securityNote}</span>
                </div>

                <h2 className="max-w-xl text-4xl font-extrabold leading-tight xl:text-5xl">
                  {isArabic
                    ? "دخول موحد لإدارة المنصة ومساحات الشركات"
                    : "Unified access for platform and company workspaces"}
                </h2>

                <p className="mt-6 max-w-xl text-base leading-8 text-white/85 xl:text-lg">
                  {isArabic
                    ? "PrimeyAcc يجمع المحاسبة والفواتير والمخزون والمدفوعات والتقارير المالية في تجربة واحدة آمنة ومهيأة للشركات داخل السعودية."
                    : "PrimeyAcc brings accounting, invoicing, inventory, payments, and financial reports into one secure experience for Saudi businesses."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  <div
                    className={`mb-3 flex items-center gap-3 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="rounded-2xl bg-white/10 p-2">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">
                      {isArabic ? "شركات متعددة" : "Multi-company"}
                    </h3>
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    {isArabic
                      ? "توجيه تلقائي لمساحة الشركة حسب عضوية المستخدم وصلاحياته."
                      : "Automatic routing to the correct company workspace by membership and permissions."}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  <div
                    className={`mb-3 flex items-center gap-3 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="rounded-2xl bg-white/10 p-2">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">
                      {isArabic ? "تقارير مالية" : "Financial reports"}
                    </h3>
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    {isArabic
                      ? "جاهزية للتقارير القيود الفواتير الخزينة والمدفوعات."
                      : "Ready for reports, journals, invoices, treasury, and payments."}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  <div
                    className={`mb-3 flex items-center gap-3 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="rounded-2xl bg-white/10 p-2">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">
                      {isArabic ? "اشتراكات ومدفوعات" : "Billing & payments"}
                    </h3>
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    {isArabic
                      ? "إدارة اشتراكات الشركات ومدفوعات المنصة من نفس النظام."
                      : "Manage company subscriptions and platform payments from the same system."}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  <div
                    className={`mb-3 flex items-center gap-3 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/90 p-2">
                      <Image
                        src="/currency/sar.svg"
                        alt="SAR"
                        width={20}
                        height={20}
                        className="h-5 w-5"
                      />
                    </div>
                    <h3 className="font-semibold">
                      {isArabic ? "جاهز للسعودية" : "Saudi-ready"}
                    </h3>
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    {isArabic
                      ? "تصميم مناسب للريال السعودي ضريبة القيمة المضافة واللغة العربية."
                      : "Designed for SAR, VAT, and Arabic-first business workflows."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-[720px] items-center justify-center p-5 sm:p-8 lg:p-10">
            <div className="w-full max-w-md">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logo/primey.svg"
                    alt="PrimeyAcc"
                    width={132}
                    height={44}
                    priority
                    className="h-auto w-[132px]"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleLanguage}
                  className="h-10 rounded-2xl px-3"
                >
                  <span
                    className={`flex items-center gap-2 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Languages className="h-4 w-4" />
                    <span>{isArabic ? "EN" : "عربي"}</span>
                  </span>
                </Button>
              </div>

              <div className={isArabic ? "text-right" : "text-left"}>
                <div
                  className={`mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium text-primary ${
                    isArabic ? "flex-row-reverse" : ""
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{content.securityNote}</span>
                </div>

                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                  {content.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {content.subtitle}
                </p>
              </div>

              <div className="mt-8 rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-xl shadow-primary/5">
                <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted/50 p-1">
                  <button
                    type="button"
                    onClick={() => switchMode("company")}
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                      mode === "company"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    } ${isArabic ? "flex-row-reverse" : ""}`}
                  >
                    <Building2 className="h-4 w-4" />
                    <span>{content.companyTab}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchMode("system")}
                    className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
                      mode === "system"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    } ${isArabic ? "flex-row-reverse" : ""}`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>{content.systemTab}</span>
                  </button>
                </div>

                <div
                  className={`mb-5 rounded-3xl border border-[#8c9cdc]/25 bg-[#8c9cdc]/10 p-4 ${
                    isArabic ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`mb-2 flex items-center gap-2 font-semibold text-foreground ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    {mode === "system" ? (
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Building2 className="h-4 w-4 text-primary" />
                    )}
                    <span>{content.formTitle}</span>
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {content.formSubtitle}
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {content.usernameLabel}
                    </label>
                    <div className="relative">
                      <User2
                        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${
                          isArabic ? "right-4" : "left-4"
                        }`}
                      />
                      <Input
                        required
                        autoComplete="username"
                        dir={isArabic ? "rtl" : "ltr"}
                        placeholder={content.usernamePlaceholder}
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setError(null);
                        }}
                        className={`h-12 rounded-2xl border-border/70 bg-muted/30 shadow-sm ${
                          isArabic ? "pr-11 text-right" : "pl-11 text-left"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {content.passwordLabel}
                    </label>
                    <div className="relative">
                      <LockKeyhole
                        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${
                          isArabic ? "right-4" : "left-4"
                        }`}
                      />

                      <Input
                        required
                        autoComplete="current-password"
                        type={showPassword ? "text" : "password"}
                        dir={isArabic ? "rtl" : "ltr"}
                        placeholder={content.passwordPlaceholder}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError(null);
                        }}
                        className={`h-12 rounded-2xl border-border/70 bg-muted/30 shadow-sm ${
                          isArabic
                            ? "pr-11 pl-12 text-right"
                            : "pl-11 pr-12 text-left"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className={`absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground ${
                          isArabic ? "left-2" : "right-2"
                        }`}
                        aria-label={
                          showPassword
                            ? content.passwordHide
                            : content.passwordShow
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-between gap-3 text-sm ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <label
                      className={`flex cursor-pointer items-center gap-2 text-muted-foreground ${
                        isArabic ? "flex-row-reverse" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={() => setRemember((prev) => !prev)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span>{content.remember}</span>
                    </label>

                    <Link
                      href="/reset-password"
                      className="font-medium text-primary transition hover:underline"
                    >
                      {content.resetPassword}
                    </Link>
                  </div>

                  {error ? (
                    <div
                      className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 ${
                        isArabic ? "text-right" : "text-left"
                      }`}
                    >
                      {error}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full rounded-2xl text-base font-semibold shadow-lg"
                  >
                    {loading ? (
                      <span
                        className={`flex items-center justify-center gap-2 ${
                          isArabic ? "flex-row-reverse" : ""
                        }`}
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{content.loading}</span>
                      </span>
                    ) : (
                      content.login
                    )}
                  </Button>
                </form>

                <div className="mt-6 border-t border-border/60 pt-5">
                  <p
                    className={`text-xs leading-6 text-muted-foreground ${
                      isArabic ? "text-right" : "text-left"
                    }`}
                  >
                    {content.modeNote}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}