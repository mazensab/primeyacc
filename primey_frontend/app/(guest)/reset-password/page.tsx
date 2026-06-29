"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* =========================================================
   📌 Mhamcloud - Guest Reset Password Page
   Path: primey_frontend/app/(guest)/reset-password/page.tsx

   ✅ صفحة إعادة تعيين كلمة المرور
   ✅ متوافقة مع هوية Mhamcloud
   ✅ يدعم العربية والإنجليزية
   ✅ يدعم RTL / LTR
   ✅ CSRF + Cookies Session
   ✅ Sonner Toasts
   ✅ لا تنفذ أي تغيير أمني محليا القرار النهائي للـ Backend
========================================================= */

type AppLocale = "ar" | "en";
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

export default function ResetPasswordPage() {
  const [locale, setLocale] = useState<AppLocale>("ar");

  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArabic = locale === "ar";
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const content = useMemo(
    () => ({
      title: isArabic ? "إعادة تعيين كلمة المرور" : "Reset password",
      subtitle: isArabic
        ? "أدخل اسم المستخدم أو البريد الإلكتروني وحدد كلمة مرور جديدة لحسابك في Mhamcloud."
        : "Enter your username or email and choose a new password for your Mhamcloud account.",
      badge: isArabic ? "استعادة الوصول" : "Restore access",
      secureSession: isArabic ? "إجراء آمن ومحمي" : "Secure protected action",

      successTitle: isArabic
        ? "تم إرسال طلب إعادة التعيين"
        : "Reset request completed",
      successDescription: isArabic
        ? "تمت معالجة الطلب بنجاح. يمكنك العودة إلى صفحة تسجيل الدخول واستخدام بياناتك بعد اعتماد التغيير من النظام."
        : "Your request was processed successfully. You can return to sign in and use your credentials after the system accepts the change.",

      identifierLabel: isArabic
        ? "اسم المستخدم أو البريد الإلكتروني"
        : "Username or email",
      identifierPlaceholder: isArabic
        ? "أدخل اسم المستخدم أو البريد الإلكتروني"
        : "Enter username or email",

      newPasswordLabel: isArabic ? "كلمة المرور الجديدة" : "New password",
      newPasswordPlaceholder: isArabic
        ? "أدخل كلمة المرور الجديدة"
        : "Enter new password",

      confirmPasswordLabel: isArabic
        ? "تأكيد كلمة المرور"
        : "Confirm password",
      confirmPasswordPlaceholder: isArabic
        ? "أكد كلمة المرور الجديدة"
        : "Confirm new password",

      resetButton: isArabic ? "إعادة تعيين كلمة المرور" : "Reset password",
      loadingButton: isArabic ? "جار إعادة التعيين..." : "Resetting...",
      backToLogin: isArabic ? "العودة إلى تسجيل الدخول" : "Back to login",
      tryAgain: isArabic ? "إعادة المحاولة" : "Try again",

      showPassword: isArabic ? "إظهار كلمة المرور" : "Show password",
      hidePassword: isArabic ? "إخفاء كلمة المرور" : "Hide password",

      identifierRequired: isArabic
        ? "الرجاء إدخال اسم المستخدم أو البريد الإلكتروني"
        : "Please enter username or email",
      newPasswordRequired: isArabic
        ? "الرجاء إدخال كلمة المرور الجديدة"
        : "Please enter the new password",
      confirmPasswordRequired: isArabic
        ? "الرجاء تأكيد كلمة المرور الجديدة"
        : "Please confirm the new password",
      passwordTooShort: isArabic
        ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
        : "Password must be at least 8 characters",
      passwordMismatch: isArabic
        ? "كلمة المرور وتأكيدها غير متطابقين"
        : "Password and confirmation do not match",
      csrfMissing: isArabic
        ? "تعذر تجهيز جلسة الأمان حاول مرة أخرى"
        : "Unable to initialize secure session, please try again",
      resetFailed: isArabic
        ? "تعذر إعادة تعيين كلمة المرور"
        : "Unable to reset password",

      sideTitle: isArabic
        ? "استعادة آمنة لحساب Mhamcloud"
        : "Secure Mhamcloud account recovery",
      sideDescription: isArabic
        ? "تساعدك هذه الصفحة على استعادة الوصول لحساب النظام أو حساب الشركة مع الحفاظ على حماية الجلسة والتحقق من الطلب عبر الـ Backend."
        : "This page helps restore access for platform and company accounts while keeping the session protected and the backend in control.",
      pointOneTitle: isArabic ? "حسابات النظام" : "System accounts",
      pointOneDescription: isArabic
        ? "مناسب لمستخدمي إدارة المنصة والصلاحيات العليا."
        : "Suitable for platform admins and system-level roles.",
      pointTwoTitle: isArabic ? "حسابات الشركات" : "Company accounts",
      pointTwoDescription: isArabic
        ? "مناسب للمالك والمدير والمحاسب والموظفين حسب صلاحيات العضوية."
        : "Suitable for owners, admins, accountants, and staff based on memberships.",
      pointThreeTitle: isArabic ? "جاهز للسعودية" : "Saudi-ready",
      pointThreeDescription: isArabic
        ? "متوافق مع تجربة Mhamcloud العربية والريال السعودي."
        : "Aligned with Arabic-first Mhamcloud workflows and SAR.",
    }),
    [isArabic]
  );

  useEffect(() => {
    try {
      const savedLocale =
        typeof window !== "undefined"
          ? ((window.localStorage.getItem("Mhamcloud-locale") ||
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
      console.error("Reset password locale initialization error:", err);
    }
  }, []);

  const toggleLanguage = () => {
    try {
      const nextLocale: AppLocale = locale === "ar" ? "en" : "ar";
      setLocale(nextLocale);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("Mhamcloud-locale", nextLocale);
      }

      if (typeof document !== "undefined") {
        document.documentElement.lang = nextLocale;
        document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
        document.body.setAttribute("dir", nextLocale === "ar" ? "rtl" : "ltr");
      }
    } catch (err) {
      console.error("Reset password language toggle error:", err);
    }
  };

  const clearFormErrors = () => {
    setError(null);
    setDone(false);
  };

  const validateForm = (): string | null => {
    if (!identifier.trim()) return content.identifierRequired;
    if (!newPassword.trim()) return content.newPasswordRequired;
    if (!confirmPassword.trim()) return content.confirmPasswordRequired;
    if (newPassword.length < 8) return content.passwordTooShort;
    if (newPassword !== confirmPassword) return content.passwordMismatch;

    return null;
  };

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setDone(false);

    try {
      const trimmedIdentifier = identifier.trim();
      const csrfToken = await prepareCsrf(content.csrfMissing);

      const response = await fetch(resolveApiUrl("/api/auth/reset-password/"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          identifier: trimmedIdentifier,
          username: trimmedIdentifier,
          email: trimmedIdentifier.includes("@") ? trimmedIdentifier : undefined,
          new_password: newPassword,
          confirm_password: confirmPassword,
          password: newPassword,
          password_confirm: confirmPassword,
        }),
      });

      let payload: unknown = null;

      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(extractApiMessage(payload, content.resetFailed));
      }

      const message = extractApiMessage(payload, content.successTitle);
      setDone(true);
      setIdentifier("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(message);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : content.resetFailed;

      setError(message);
      toast.error(message);
      console.error("Mhamcloud reset password error:", err);
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
                    {content.badge}
                  </p>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Mhamcloud
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
                  <span>{content.secureSession}</span>
                </div>

                <h2 className="max-w-xl text-4xl font-extrabold leading-tight xl:text-5xl">
                  {content.sideTitle}
                </h2>

                <p className="mt-6 max-w-xl text-base leading-8 text-white/85 xl:text-lg">
                  {content.sideDescription}
                </p>
              </div>

              <div className="grid gap-4">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  <div
                    className={`mb-3 flex items-center gap-3 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="rounded-2xl bg-white/10 p-2">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">{content.pointOneTitle}</h3>
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    {content.pointOneDescription}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  <div
                    className={`mb-3 flex items-center gap-3 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="rounded-2xl bg-white/10 p-2">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">{content.pointTwoTitle}</h3>
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    {content.pointTwoDescription}
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
                    <h3 className="font-semibold">{content.pointThreeTitle}</h3>
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    {content.pointThreeDescription}
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
                    alt="Mhamcloud"
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
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{content.badge}</span>
                </div>

                <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                  {content.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {content.subtitle}
                </p>
              </div>

              <div className="mt-8 rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-xl shadow-primary/5">
                {done ? (
                  <div className="space-y-5">
                    <div
                      className={`rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 ${
                        isArabic ? "text-right" : "text-left"
                      }`}
                    >
                      <div
                        className={`mb-3 flex items-center gap-2 font-semibold ${
                          isArabic ? "flex-row-reverse" : ""
                        }`}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        <span>{content.successTitle}</span>
                      </div>
                      <p className="text-sm leading-7">
                        {content.successDescription}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDone(false);
                        setError(null);
                      }}
                      className="h-12 w-full rounded-2xl"
                    >
                      {content.tryAgain}
                    </Button>

                    <Link
                      href="/login"
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90 ${
                        isArabic ? "flex-row-reverse" : ""
                      }`}
                    >
                      <BackIcon className="h-4 w-4" />
                      <span>{content.backToLogin}</span>
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleResetSubmit} className="space-y-5">
                    <div
                      className={`rounded-3xl border border-[#8c9cdc]/25 bg-[#8c9cdc]/10 p-4 ${
                        isArabic ? "text-right" : "text-left"
                      }`}
                    >
                      <div
                        className={`mb-2 flex items-center gap-2 font-semibold text-foreground ${
                          isArabic ? "flex-row-reverse" : ""
                        }`}
                      >
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span>{content.secureSession}</span>
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">
                        {content.sideDescription}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {content.identifierLabel}
                      </label>

                      <div className="relative">
                        <Mail
                          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${
                            isArabic ? "right-4" : "left-4"
                          }`}
                        />

                        <Input
                          required
                          autoComplete="username email"
                          dir={isArabic ? "rtl" : "ltr"}
                          placeholder={content.identifierPlaceholder}
                          value={identifier}
                          onChange={(e) => {
                            setIdentifier(e.target.value);
                            clearFormErrors();
                          }}
                          className={`h-12 rounded-2xl border-border/70 bg-muted/30 shadow-sm ${
                            isArabic ? "pr-11 text-right" : "pl-11 text-left"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {content.newPasswordLabel}
                      </label>

                      <div className="relative">
                        <LockKeyhole
                          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${
                            isArabic ? "right-4" : "left-4"
                          }`}
                        />

                        <Input
                          required
                          autoComplete="new-password"
                          type={showNewPassword ? "text" : "password"}
                          dir={isArabic ? "rtl" : "ltr"}
                          placeholder={content.newPasswordPlaceholder}
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            clearFormErrors();
                          }}
                          className={`h-12 rounded-2xl border-border/70 bg-muted/30 shadow-sm ${
                            isArabic
                              ? "pr-11 pl-12 text-right"
                              : "pl-11 pr-12 text-left"
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className={`absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground ${
                            isArabic ? "left-2" : "right-2"
                          }`}
                          aria-label={
                            showNewPassword
                              ? content.hidePassword
                              : content.showPassword
                          }
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {content.confirmPasswordLabel}
                      </label>

                      <div className="relative">
                        <LockKeyhole
                          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${
                            isArabic ? "right-4" : "left-4"
                          }`}
                        />

                        <Input
                          required
                          autoComplete="new-password"
                          type={showConfirmPassword ? "text" : "password"}
                          dir={isArabic ? "rtl" : "ltr"}
                          placeholder={content.confirmPasswordPlaceholder}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            clearFormErrors();
                          }}
                          className={`h-12 rounded-2xl border-border/70 bg-muted/30 shadow-sm ${
                            isArabic
                              ? "pr-11 pl-12 text-right"
                              : "pl-11 pr-12 text-left"
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          className={`absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground ${
                            isArabic ? "left-2" : "right-2"
                          }`}
                          aria-label={
                            showConfirmPassword
                              ? content.hidePassword
                              : content.showPassword
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
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
                          <span>{content.loadingButton}</span>
                        </span>
                      ) : (
                        content.resetButton
                      )}
                    </Button>

                    <Link
                      href="/login"
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground ${
                        isArabic ? "flex-row-reverse" : ""
                      }`}
                    >
                      <BackIcon className="h-4 w-4" />
                      <span>{content.backToLogin}</span>
                    </Link>
                  </form>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}