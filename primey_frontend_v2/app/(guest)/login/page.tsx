"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
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
   📌 Mhamcloud - Authoritative Unified Login
   Path: primey_frontend/app/(guest)/login/page.tsx

   ✅ بوابة دخول واحدة للنظام والشركات
   ✅ username / email / phone
   ✅ Session + CSRF
   ✅ التوجيه حصريًا من whoami.dashboard_path
   ✅ لا يوجد اختيار يدوي لمساحة العمل
   ✅ Sonner + RTL/LTR + SAR icon
========================================================= */

type AppLocale = "ar" | "en";
type JsonObject = Record<string, unknown>;

type AuthPayload = {
  authenticated?: boolean;
  code?: string | null;
  detail?: unknown;
  message?: unknown;
  error?: unknown;
  errors?: unknown;
  dashboard_path?: string | null;
};

function normalizeApiBase(value: string | undefined): string {
  const clean = String(value || "").trim().replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean.slice(0, -4) : clean;
}

const API_BASE = normalizeApiBase(
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL,
);

function resolveApiUrl(path: string): string {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${safePath}` : safePath;
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length !== 2) return "";

  const raw = parts.pop()?.split(";").shift() || "";

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstString(value: unknown): string {
  const direct = asString(value);
  if (direct) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = firstString(item);
      if (text) return text;
    }
  }

  return "";
}

function asRecord(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

async function readJson(response: Response): Promise<AuthPayload> {
  try {
    const payload = await response.json();
    return asRecord(payload) as AuthPayload;
  } catch {
    return {};
  }
}

function applyDocumentLocale(locale: AppLocale): void {
  if (typeof document === "undefined") return;

  const direction = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = locale;
  document.documentElement.dir = direction;
  document.body.dir = direction;
}

function authoritativeDashboardPath(
  payload: AuthPayload,
  noWorkspaceMessage: string,
): string {
  if (payload.authenticated !== true) {
    throw new Error(noWorkspaceMessage);
  }

  const path = asString(payload.dashboard_path);
  const isSystemPath = path === "/system" || path.startsWith("/system/");
  const isCompanyPath = path === "/company" || path.startsWith("/company/");

  if (isSystemPath || isCompanyPath) return path;

  throw new Error(noWorkspaceMessage);
}

async function prepareCsrf(errorMessage: string): Promise<string> {
  const response = await fetch(resolveApiUrl("/api/auth/csrf/"), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) throw new Error(errorMessage);

  const token = getCookie("csrftoken");
  if (!token) throw new Error(errorMessage);

  return token;
}

export default function Page() {
  const router = useRouter();

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArabic = locale === "ar";

  const content = useMemo(
    () => ({
      title: isArabic
        ? "مرحبًا بعودتك إلى Mhamcloud"
        : "Welcome back to Mhamcloud",
      subtitle: isArabic
        ? "بوابة واحدة وآمنة لجميع مستخدمي المنصة والشركات."
        : "One secure portal for every platform and company user.",
      identifierLabel: isArabic
        ? "اسم المستخدم أو البريد الإلكتروني أو رقم الجوال"
        : "Username, email, or mobile number",
      identifierPlaceholder: isArabic
        ? "أدخل بيانات حسابك"
        : "Enter your account identifier",
      passwordLabel: isArabic ? "كلمة المرور" : "Password",
      passwordPlaceholder: isArabic ? "أدخل كلمة المرور" : "Enter password",
      remember: isArabic ? "تذكرني" : "Remember me",
      resetPassword: isArabic ? "نسيت كلمة المرور؟" : "Forgot password?",
      login: isArabic ? "تسجيل الدخول" : "Sign in",
      loading: isArabic ? "جاري التحقق والتوجيه..." : "Signing in and routing...",
      passwordShow: isArabic ? "إظهار كلمة المرور" : "Show password",
      passwordHide: isArabic ? "إخفاء كلمة المرور" : "Hide password",
      securityNote: isArabic
        ? "جلسة دخول آمنة ومحمية"
        : "Secure protected session",
      portalBadge: isArabic ? "بوابة الدخول الموحدة" : "Unified access portal",
      requiredFields: isArabic
        ? "يرجى إدخال بيانات الحساب وكلمة المرور."
        : "Enter your account identifier and password.",
      invalidCredentials: isArabic
        ? "بيانات الدخول غير صحيحة، أو لم يتم إعداد كلمة مرور لهذا الحساب بعد."
        : "Invalid credentials, or this account does not have a password set yet.",
      accountInactive: isArabic
        ? "هذا الحساب غير فعال. تواصل مع مسؤول النظام."
        : "This account is inactive. Contact the system administrator.",
      profileDenied: isArabic
        ? "ملف المستخدم موقوف أو غير مسموح له بالدخول."
        : "This user profile is suspended or not allowed to sign in.",
      noWorkspace: isArabic
        ? "تم التحقق من الحساب، لكن لا توجد له مساحة نظام أو عضوية شركة فعالة."
        : "The account was verified, but it has no active system workspace or company membership.",
      csrfMissing: isArabic
        ? "تعذر تجهيز جلسة الأمان. حدّث الصفحة ثم حاول مرة أخرى."
        : "Unable to initialize the secure session. Refresh and try again.",
      sessionFailed: isArabic
        ? "تم قبول بيانات الدخول لكن تعذر تثبيت الجلسة."
        : "Credentials were accepted, but the session could not be verified.",
      throttled: isArabic
        ? "تم تجاوز عدد محاولات الدخول المسموح. انتظر قليلًا ثم حاول مرة أخرى."
        : "Too many sign-in attempts. Wait briefly and try again.",
      loginFailed: isArabic ? "تعذر تسجيل الدخول." : "Unable to sign in.",
      loginSuccess: isArabic
        ? "تم تسجيل الدخول وسيتم توجيهك إلى مساحتك."
        : "Signed in. Redirecting to your workspace.",
      systemFeature: isArabic ? "إدارة المنصة" : "Platform management",
      systemFeatureText: isArabic
        ? "حسابات السوبر أدمن وموظفي النظام توجه إلى مركز النظام."
        : "Super-admin and system staff accounts are routed to the system center.",
      companyFeature: isArabic ? "مساحات الشركات" : "Company workspaces",
      companyFeatureText: isArabic
        ? "المالك والمدير والمحاسب والموظفون يوجهون حسب العضوية الفعالة."
        : "Owners, admins, accountants, and employees are routed by active membership.",
      reportsFeature: isArabic ? "تقارير مالية" : "Financial reporting",
      reportsFeatureText: isArabic
        ? "المحاسبة والفواتير والمخزون والخزينة في مساحة موحدة."
        : "Accounting, invoicing, inventory, and treasury in one workspace.",
      saudiFeature: isArabic ? "جاهز للسعودية" : "Saudi-ready",
      saudiFeatureText: isArabic
        ? "الريال السعودي وضريبة القيمة المضافة وتجربة عربية أولًا."
        : "SAR, VAT, and an Arabic-first business experience.",
    }),
    [isArabic],
  );

  function apiMessage(
    payload: AuthPayload,
    responseStatus: number,
  ): string {
    if (responseStatus === 429) return content.throttled;

    const code = asString(payload.code).toLowerCase();
    const byCode: Record<string, string> = {
      credentials_required: content.requiredFields,
      invalid_credentials: content.invalidCredentials,
      account_inactive: content.accountInactive,
      profile_access_denied: content.profileDenied,
      workspace_access_denied: content.noWorkspace,
    };

    if (byCode[code]) return byCode[code];

    const direct =
      firstString(payload.message) ||
      firstString(payload.detail) ||
      firstString(payload.error);

    const normalized = direct.toLowerCase();
    if (normalized.includes("invalid username/email/phone")) {
      return content.invalidCredentials;
    }
    if (normalized.includes("account is inactive")) {
      return content.accountInactive;
    }
    if (normalized.includes("profile is not allowed")) {
      return content.profileDenied;
    }

    const errors = asRecord(payload.errors);
    const firstError = Object.values(errors)
      .map((value) => firstString(value))
      .find(Boolean);

    return firstError || direct || content.loginFailed;
  }

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem("Mhamcloud-locale") ||
        window.localStorage.getItem("Mhamcloud-locale");
      const nextLocale: AppLocale = saved === "en" ? "en" : "ar";

      setLocale(nextLocale);
      applyDocumentLocale(nextLocale);
    } catch (caught) {
      console.error("Login locale initialization error:", caught);
    }
  }, []);

  function toggleLanguage(): void {
    try {
      const nextLocale: AppLocale = locale === "ar" ? "en" : "ar";
      setLocale(nextLocale);
      window.localStorage.setItem("Mhamcloud-locale", nextLocale);
      applyDocumentLocale(nextLocale);
      window.dispatchEvent(new Event("Mhamcloud-locale-changed"));
    } catch (caught) {
      console.error("Login language toggle error:", caught);
    }
  }

  async function handleLoginSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (loading) return;

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier || !password) {
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
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          identifier: cleanIdentifier,
          password,
          remember,
        }),
      });
      const loginPayload = await readJson(loginResponse);

      if (!loginResponse.ok) {
        throw new Error(apiMessage(loginPayload, loginResponse.status));
      }

      const whoamiResponse = await fetch(resolveApiUrl("/api/auth/whoami/"), {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      const whoamiPayload = await readJson(whoamiResponse);

      if (!whoamiResponse.ok || whoamiPayload.authenticated !== true) {
        throw new Error(content.sessionFailed);
      }

      const redirectPath = authoritativeDashboardPath(
        whoamiPayload,
        content.noWorkspace,
      );

      toast.success(content.loginSuccess);
      router.replace(redirectPath);
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : content.loginFailed;

      setError(message);
      toast.error(message);
      console.error("Mhamcloud login error:", caught);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main data-mhamcloud-login="bundui-v1" dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden min-h-screen overflow-hidden bg-muted lg:block">
          <Image src="/images/extra/image4.jpg" alt="" fill priority sizes="50vw" className="object-cover" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/35" />

          <div className="relative z-10 flex h-full min-h-screen flex-col justify-between p-10 text-white xl:p-14">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-xs text-white/65">{isArabic ? "منصة إدارة الأعمال" : "Business management platform"}</p>
                <p className="text-xl font-semibold tracking-tight">Mhamcloud</p>
              </div>
            </div>

            <div className={isArabic ? "text-right" : "text-left"}>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs backdrop-blur">
                <CheckCircle2 className="size-3.5" />
                {content.portalBadge}
              </div>
              <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
                {isArabic ? "إدارة أعمالك من مساحة واحدة متكاملة" : "Run your business from one connected workspace"}
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-white/75 xl:text-base">
                {isArabic
                  ? "المحاسبة والمبيعات والمشتريات والمخزون والتقارير وإدارة الشركات في تجربة موحدة وآمنة."
                  : "Accounting, sales, purchases, inventory, reporting, and company operations in one secure experience."}
              </p>

              <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <Building2 className="mb-3 size-5" />
                  <p className="text-sm font-medium">{content.companyFeature}</p>
                  <p className="mt-1 text-xs leading-5 text-white/65">{content.companyFeatureText}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <ShieldCheck className="mb-3 size-5" />
                  <p className="text-sm font-medium">{content.systemFeature}</p>
                  <p className="mt-1 text-xs leading-5 text-white/65">{content.systemFeatureText}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/55">
              {isArabic ? "Mhamcloud — منصة موحدة لإدارة الأعمال" : "Mhamcloud — Unified business management"}
            </p>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className={`absolute top-6 ${isArabic ? "left-6" : "right-6"}`}
          >
            <Languages className="size-3.5" />
            <span>{isArabic ? "EN" : "عربي"}</span>
          </Button>

          <div className="w-full max-w-md">
            <div className="mb-9 text-center">
              <div className="mx-auto mb-6 flex h-20 items-center justify-center">
                <Image src="/logo/primey.svg" alt="Mhamcloud" width={220} height={72} priority className="h-auto w-[190px] object-contain" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">{content.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{content.subtitle}</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-identifier" className="text-sm font-medium">{content.identifierLabel}</label>
                <div className="relative">
                  <User2 className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ${isArabic ? "right-3" : "left-3"}`} />
                  <Input
                    id="login-identifier"
                    name="identifier"
                    required
                    autoComplete="username"
                    dir="auto"
                    placeholder={content.identifierPlaceholder}
                    value={identifier}
                    onChange={(event) => { setIdentifier(event.target.value); setError(null); }}
                    className={`h-10 ${isArabic ? "pr-9 text-right" : "pl-9 text-left"}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="login-password" className="text-sm font-medium">{content.passwordLabel}</label>
                  <Link href="/reset-password" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {content.resetPassword}
                  </Link>
                </div>
                <div className="relative">
                  <LockKeyhole className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ${isArabic ? "right-3" : "left-3"}`} />
                  <Input
                    id="login-password"
                    name="password"
                    required
                    autoComplete="current-password"
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    placeholder={content.passwordPlaceholder}
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); setError(null); }}
                    className={`h-10 ${isArabic ? "pr-9 pl-10 text-right" : "pl-9 pr-10 text-left"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className={`absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground ${isArabic ? "left-1" : "right-1"}`}
                    aria-label={showPassword ? content.passwordHide : content.passwordShow}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember((current) => !current)}
                  className="size-4 rounded border-border accent-black"
                />
                <span>{content.remember}</span>
              </label>

              {error ? (
                <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="h-10 w-full bg-black text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{content.loading}</span>
                  </>
                ) : content.login}
              </Button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              <span>{content.securityNote}</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

