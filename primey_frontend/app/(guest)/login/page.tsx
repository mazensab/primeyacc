"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Languages,
  Loader2,
  LockKeyhole,
  Route,
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
        window.localStorage.getItem("primey-locale") ||
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
      window.localStorage.setItem("primey-locale", nextLocale);
      window.localStorage.setItem("Mhamcloud-locale", nextLocale);
      applyDocumentLocale(nextLocale);
      window.dispatchEvent(new Event("primey-locale-changed"));
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
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_16%_14%,rgba(255,255,255,0.96),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(226,232,240,0.72),transparent_30%),radial-gradient(circle_at_52%_100%,rgba(203,213,225,0.48),transparent_42%),linear-gradient(135deg,#f8fafc_0%,#f1f5f9_42%,#e9edf3_72%,#f8fafc_100%)]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-20 top-[35%] h-52 w-52 rotate-45 rounded-[38%] bg-slate-300/25" />
        <div className="absolute -right-16 top-[8%] h-72 w-72 rotate-45 rounded-[42%] bg-slate-300/22" />
        <div className="absolute right-[8%] bottom-[7%] h-36 w-36 rotate-45 rounded-[40%] bg-slate-300/20" />
        <div className="absolute left-[6%] top-[10%] h-12 w-12 rotate-45 bg-slate-400/16" />
        <div className="absolute right-[11%] top-[45%] h-12 w-12 rotate-45 bg-slate-400/18" />
        <div className="absolute left-[8%] bottom-[12%] h-10 w-10 rotate-45 bg-slate-300/20" />
        <div className="absolute left-[13%] top-[48%] h-3 w-3 rotate-45 bg-slate-200/95 shadow-[0_0_22px_8px_rgba(148,163,184,0.28)]" />
        <div className="absolute right-[9%] top-[38%] h-3 w-3 rotate-45 bg-slate-200/95 shadow-[0_0_24px_9px_rgba(148,163,184,0.30)]" />
        <div className="absolute right-[4%] bottom-[20%] h-2.5 w-2.5 rotate-45 bg-slate-200/90 shadow-[0_0_20px_7px_rgba(148,163,184,0.24)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full items-center justify-center px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-8">
        <div className="grid w-full max-w-[1180px] overflow-hidden rounded-[26px] border border-white/70 bg-white/80 shadow-[0_32px_90px_-34px_rgba(15,23,42,0.32)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 lg:grid-cols-[1.08fr_0.92fr] lg:rounded-[32px]">

          <section className="relative hidden min-h-[660px] overflow-hidden bg-[radial-gradient(circle_at_82%_12%,rgba(71,103,165,0.30),transparent_34%),radial-gradient(circle_at_18%_88%,rgba(59,84,132,0.22),transparent_38%),linear-gradient(145deg,#0b1728_0%,#10233c_48%,#17365d_100%)] text-white lg:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(255,255,255,0.92),transparent_32%),radial-gradient(circle_at_88%_82%,rgba(148,163,184,0.24),transparent_38%),radial-gradient(circle_at_58%_38%,rgba(99,102,241,0.08),transparent_30%)]" />

            <div className="relative z-10 flex min-h-full w-full flex-col px-9 py-9 xl:px-11 xl:py-10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/15 bg-white/[0.075]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <p className="whitespace-nowrap text-[11px] font-medium text-white/60">
                    {isArabic ? "نظام محاسبي متكامل" : "Integrated accounting system"}
                  </p>
                  <h1 className="whitespace-nowrap bg-gradient-to-l from-[#2563eb] via-[#4f46e5] to-[#7c3aed] bg-clip-text text-[21px] font-bold text-transparent">Mhamcloud</h1>
                </div>
              </div>

              <div className={`mt-11 ${isArabic ? "text-right" : "text-left"}`}>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.075] px-3.5 py-2 text-xs text-white/85">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">
                    {isArabic ? "منصة أعمال متكاملة" : "Integrated business platform"}
                  </span>
                </div>

                <h2 className="whitespace-nowrap bg-gradient-to-l from-[#2563eb] via-[#7c3aed] to-[#0ea5e9] bg-clip-text text-[30px] font-extrabold tracking-[-0.025em] text-transparent xl:text-[36px]">
                  {isArabic
                    ? "حلول محاسبية متكاملة لنمو أعمالك"
                    : "Integrated accounting solutions for growth"}
                </h2>

                <p className="mt-4 whitespace-nowrap text-[13px] text-white/70 xl:text-[14px]">
                  {isArabic
                    ? "إدارة أسهل • قرارات أذكى • رؤية مالية أوضح"
                    : "Simpler operations • Smarter decisions • Clearer finance"}
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3.5">
                {[
                  {
                    icon: BarChart3,
                    title: isArabic ? "المحاسبة والتقارير" : "Accounting & reports",
                    text: isArabic ? "تقارير مالية لحظية ودقيقة" : "Accurate real-time financial reports",
                  },
                  {
                    icon: Building2,
                    title: isArabic ? "إدارة الشركات" : "Company management",
                    text: isArabic ? "إدارة العمليات من مساحة موحدة" : "Run operations from one workspace",
                  },
                  {
                    icon: Route,
                    title: isArabic ? "المبيعات والمشتريات" : "Sales & purchases",
                    text: isArabic ? "دورة عمل مترابطة وسريعة" : "Connected and efficient workflows",
                  },
                  {
                    icon: ShieldCheck,
                    title: isArabic ? "الامتثال والأمان" : "Compliance & security",
                    text: isArabic ? "صلاحيات وحماية بمستوى مؤسسي" : "Enterprise-grade access and protection",
                  },
                ].map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.title}
                      className="flex min-h-[92px] flex-col justify-center rounded-[20px] border border-white/15 bg-white/[0.09] p-4 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.11]"
                    >
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.075]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <h3 className="whitespace-nowrap text-[12.5px] font-semibold">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="whitespace-nowrap text-[10.5px] text-white/70 xl:text-[11px]">
                        {feature.text}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3.5">
                <div className="flex min-h-[92px] flex-col justify-center rounded-[20px] border border-white/15 bg-white/[0.09] p-4 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-white/90">
                      <Image
                        src="/currency/sar.svg"
                        alt="SAR"
                        width={17}
                        height={17}
                        className="h-[17px] w-[17px]"
                      />
                    </div>
                    <h3 className="whitespace-nowrap text-[12.5px] font-semibold">
                      {isArabic ? "الفاتورة الإلكترونية" : "E-Invoicing"}
                    </h3>
                  </div>
                  <p className="whitespace-nowrap text-[10.5px] text-white/70 xl:text-[11px]">
                    {isArabic ? "متوافق مع متطلبات هيئة الزكاة والضريبة والجمارك" : "Compliant with ZATCA requirements"}
                  </p>
                </div>

                <div className="flex min-h-[92px] flex-col justify-center rounded-[20px] border border-white/15 bg-white/[0.09] p-4 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.075]">
                      <LockKeyhole className="h-4 w-4" />
                    </div>
                    <h3 className="whitespace-nowrap text-[12.5px] font-semibold">
                      {isArabic ? "تحكم وصلاحيات" : "Access control"}
                    </h3>
                  </div>
                  <p className="whitespace-nowrap text-[10.5px] text-white/70 xl:text-[11px]">
                    {isArabic ? "أدوار وصلاحيات تناسب فريقك" : "Roles and permissions built for teams"}
                  </p>
                </div>
              </div>

              <div className="mt-auto pt-5">
                <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/15 bg-white/[0.09] px-4 py-4 shadow-[0_14px_40px_-28px_rgba(0,0,0,0.75)] backdrop-blur-xl">
                  <div className={isArabic ? "text-right" : "text-left"}>
                    <p className="whitespace-nowrap text-[12px] font-semibold text-white">
                      {isArabic ? "نظام واحد لإدارة أعمالك بثقة" : "One system to run your business with confidence"}
                    </p>
                    <p className="mt-1 whitespace-nowrap text-[10.5px] text-white/60">
                      {isArabic ? "محاسبة • مبيعات • مشتريات • مخزون • تقارير" : "Accounting • Sales • Purchases • Inventory • Reports"}
                    </p>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.075]">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="relative flex min-h-[640px] items-center justify-center bg-white/70 px-4 py-7 dark:bg-slate-950/45 sm:px-7 lg:min-h-[660px] lg:px-8 xl:px-10">
            <div
              className={`absolute top-5 z-20 sm:top-6 ${
                isArabic ? "left-5 sm:left-6" : "right-5 sm:right-6"
              }`}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleLanguage}
                className="h-9 rounded-xl border-border/60 bg-white/75 px-3 text-xs font-medium shadow-sm backdrop-blur-md transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900"
              >
                <Languages className="h-3.5 w-3.5" />
                <span>{isArabic ? "EN" : "عربي"}</span>
              </Button>
            </div>

            <div className="w-full max-w-[430px]">
              <div className="mb-5 flex w-full flex-col items-center justify-center pt-7 sm:pt-5">
                <div className="flex min-h-[78px] w-full items-center justify-center">
                  <Image
                    src="/logo/primey.svg"
                    alt="Mhamcloud"
                    width={210}
                    height={70}
                    priority
                    className="h-auto w-[155px] object-contain sm:w-[175px] md:w-[188px] lg:w-[198px] xl:w-[215px]"
                  />
                </div>
                <div className="mt-3 h-px w-14 bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>

              <div className={`mx-auto max-w-[390px] ${isArabic ? "text-right" : "text-left"}`}>
                <div className="mb-3 flex justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#8c9cdc]/20 bg-[#8c9cdc]/[0.08] px-3 py-1.5 text-[11px] font-medium text-foreground/75">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#6578b4]" />
                    <span>{content.securityNote}</span>
                  </div>
                </div>

                <h2 className="text-center text-[25px] font-extrabold tracking-[-0.02em] text-slate-950 dark:text-white sm:text-[28px]">
                  {content.title}
                </h2>

                <p className="mx-auto mt-2 max-w-[350px] text-center text-[12.5px] leading-6 text-muted-foreground">
                  {content.subtitle}
                </p>
              </div>

              <div className="mt-5 rounded-[24px] border border-border/60 bg-white/80 p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl dark:bg-slate-900/60 sm:p-5">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="login-identifier" className="block text-[12px] font-medium text-foreground/85">
                      {content.identifierLabel}
                    </label>
                    <div className="group relative">
                      <User2
                        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 transition group-focus-within:text-[#6578b4] ${
                          isArabic ? "right-3.5" : "left-3.5"
                        }`}
                      />
                      <Input
                        id="login-identifier"
                        name="identifier"
                        required
                        autoComplete="username"
                        dir="auto"
                        placeholder={content.identifierPlaceholder}
                        value={identifier}
                        onChange={(event) => {
                          setIdentifier(event.target.value);
                          setError(null);
                        }}
                        className={`h-11 rounded-[13px] border-slate-200/90 bg-slate-100/90 text-[13px] shadow-none dark:border-slate-700 dark:bg-slate-800/70 transition-all duration-200 placeholder:text-muted-foreground/55 hover:border-slate-300 hover:bg-slate-200/70 dark:hover:border-slate-600 dark:hover:bg-slate-800 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300/35 ${
                          isArabic ? "pr-10 text-right" : "pl-10 text-left"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="login-password" className="block text-[12px] font-medium text-foreground/85">
                      {content.passwordLabel}
                    </label>
                    <div className="group relative">
                      <LockKeyhole
                        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 transition group-focus-within:text-[#6578b4] ${
                          isArabic ? "right-3.5" : "left-3.5"
                        }`}
                      />
                      <Input
                        id="login-password"
                        name="password"
                        required
                        autoComplete="current-password"
                        type={showPassword ? "text" : "password"}
                        dir="ltr"
                        placeholder={content.passwordPlaceholder}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setError(null);
                        }}
                        className={`h-11 rounded-[13px] border-slate-200/90 bg-slate-100/90 text-[13px] shadow-none dark:border-slate-700 dark:bg-slate-800/70 transition-all duration-200 placeholder:text-muted-foreground/55 hover:border-slate-300 hover:bg-slate-200/70 dark:hover:border-slate-600 dark:hover:bg-slate-800 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300/35 ${
                          isArabic ? "pr-10 pl-11 text-right" : "pl-10 pr-11 text-left"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className={`absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[9px] text-muted-foreground/70 transition hover:bg-muted hover:text-foreground ${
                          isArabic ? "left-1.5" : "right-1.5"
                        }`}
                        aria-label={showPassword ? content.passwordHide : content.passwordShow}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-[11.5px]">
                    <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={() => setRemember((current) => !current)}
                        className="h-3.5 w-3.5 rounded border-border accent-[#6578b4]"
                      />
                      <span>{content.remember}</span>
                    </label>

                    <Link
                      href="/reset-password"
                      className="font-medium text-[#6578b4] transition hover:text-[#432a58] hover:underline"
                    >
                      {content.resetPassword}
                    </Link>
                  </div>

                  {error ? (
                    <div
                      role="alert"
                      className={`rounded-[13px] border border-red-200/80 bg-red-50/80 px-3 py-2.5 text-[11.5px] leading-5 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 ${
                        isArabic ? "text-right" : "text-left"
                      }`}
                    >
                      {error}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded-[13px] bg-[#151b2b] text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.75)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#20283c] active:translate-y-0 disabled:translate-y-0 disabled:opacity-65 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{content.loading}</span>
                      </span>
                    ) : (
                      content.login
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
