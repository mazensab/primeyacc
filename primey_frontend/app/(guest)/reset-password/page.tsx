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
      secureSession: isArabic ? "استعادة الحساب" : "Account recovery",

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
        ? "استعد الوصول إلى حسابك بسهولة، ثم عد مباشرة إلى إدارة أعمالك وخدماتك في Mhamcloud."
        : "Restore access to your account easily, then return directly to managing your business and Mhamcloud services.",
      pointOneTitle: isArabic ? "حسابات النظام" : "System accounts",
      pointOneDescription: isArabic
        ? "مناسب لمستخدمي إدارة المنصة والصلاحيات العليا."
        : "Suitable for platform admins and system-level roles.",
      pointTwoTitle: isArabic ? "حسابات الشركات" : "Company accounts",
      pointTwoDescription: isArabic
        ? "مناسب للمالك والمدير والمحاسب والموظفين حسب صلاحيات العضوية."
        : "Suitable for owners, admins, accountants, and staff based on memberships.",
      pointThreeTitle: isArabic ? "الفاتورة الإلكترونية" : "E-Invoicing",
      pointThreeDescription: isArabic
        ? "متوافق مع متطلبات هيئة الزكاة والضريبة والجمارك."
        : "Compliant with ZATCA requirements.",
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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="absolute -left-16 top-24 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-16 bottom-16 h-60 w-60 rounded-full bg-[#8c9cdc]/15 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full items-center justify-center px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-8">
        <div className="grid w-full max-w-[1180px] overflow-hidden rounded-[26px] border border-white/70 bg-white/80 shadow-[0_32px_90px_-34px_rgba(15,23,42,0.32)] backdrop-blur-2xl lg:grid-cols-[1.08fr_0.92fr] lg:rounded-[32px]">
          <section className="relative hidden min-h-[660px] overflow-hidden bg-[radial-gradient(circle_at_82%_12%,rgba(71,103,165,0.30),transparent_34%),radial-gradient(circle_at_18%_88%,rgba(59,84,132,0.22),transparent_38%),linear-gradient(145deg,#0b1728_0%,#10233c_48%,#17365d_100%)] text-white lg:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.94),transparent_34%),radial-gradient(circle_at_84%_78%,rgba(148,163,184,0.22),transparent_38%),radial-gradient(circle_at_52%_40%,rgba(99,102,241,0.07),transparent_30%)]" />
            <div className="absolute right-[-80px] top-[-80px] h-72 w-72 rounded-full bg-white/[0.075] blur-3xl" />
            <div className="absolute bottom-[-90px] left-[-90px] h-80 w-80 rounded-full bg-black/10 blur-3xl" />

            <div className="relative z-10 flex min-h-full w-full flex-col px-9 py-9 xl:px-11 xl:py-10">
              <div
                className={`flex items-center gap-3 ${
                  isArabic ? "flex-row-reverse" : ""
                }`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/15 bg-white/[0.075] backdrop-blur">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className={isArabic ? "text-right" : "text-left"}>
                  <p className="whitespace-nowrap text-[11px] font-medium text-white/60">
                    {content.badge}
                  </p>
                  <h1 className="whitespace-nowrap text-[21px] font-bold tracking-tight">
                    Mhamcloud
                  </h1>
                </div>
              </div>

              <div className={`mt-9 ${isArabic ? "text-right" : "text-left"}`}>
                <div
                  className={`mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.075] px-3.5 py-2 text-xs backdrop-blur ${
                    isArabic ? "flex-row-reverse" : ""
                  }`}
                >
                  <LockKeyhole className="h-3.5 w-3.5" />
                  <span>{content.secureSession}</span>
                </div>

                <h2 className="max-w-xl text-[30px] font-extrabold leading-tight tracking-[-0.025em] xl:text-[36px] bg-gradient-to-l from-[#2563eb] via-[#7c3aed] to-[#0ea5e9] bg-clip-text text-transparent">
                  {content.sideTitle}
                </h2>

                <p className="mt-4 max-w-xl text-[13px] leading-6 text-white/75 xl:text-[14px]">
                  {content.sideDescription}
                </p>
              </div>

              <div className="mt-8 grid gap-3.5">
                <div className="flex min-h-[92px] flex-col justify-center rounded-[20px] border border-white/15 bg-white/[0.09] p-4 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  <div
                    className={`mb-2.5 flex items-center gap-2.5 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.075]">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <h3 className="whitespace-nowrap text-[12.5px] font-semibold">{content.pointOneTitle}</h3>
                  </div>
                  <p className="text-[10.5px] leading-5 text-white/70 xl:text-[11px]">
                    {content.pointOneDescription}
                  </p>
                </div>

                <div className="flex min-h-[92px] flex-col justify-center rounded-[20px] border border-white/15 bg-white/[0.09] p-4 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  <div
                    className={`mb-2.5 flex items-center gap-2.5 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.075]">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <h3 className="whitespace-nowrap text-[12.5px] font-semibold">{content.pointTwoTitle}</h3>
                  </div>
                  <p className="text-[10.5px] leading-5 text-white/70 xl:text-[11px]">
                    {content.pointTwoDescription}
                  </p>
                </div>

                <div className="flex min-h-[92px] flex-col justify-center rounded-[20px] border border-white/15 bg-white/[0.09] p-4 shadow-[0_18px_45px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  <div
                    className={`mb-2.5 flex items-center gap-2.5 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-white/90">
                      <Image
                        src="/currency/sar.svg"
                        alt="SAR"
                        width={17}
                        height={17}
                        className="h-[17px] w-[17px]"
                      />
                    </div>
                    <h3 className="whitespace-nowrap text-[12.5px] font-semibold">{content.pointThreeTitle}</h3>
                  </div>
                  <p className="text-[10.5px] leading-5 text-white/70 xl:text-[11px]">
                    {content.pointThreeDescription}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="relative flex min-h-[640px] items-center justify-center bg-white/70 px-4 py-7 sm:px-7 lg:min-h-[660px] lg:px-8 xl:px-10">
            <div className="w-full max-w-[430px]">
              <div className="mb-4 flex items-center justify-between">
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
                  className="h-9 rounded-xl border-border/60 bg-white/75 px-3 text-xs font-medium shadow-sm backdrop-blur-md transition hover:bg-white"
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

                <h2 className="text-[25px] font-extrabold tracking-[-0.02em] text-slate-950 dark:text-white sm:text-[28px]">
                  {content.title}
                </h2>
                <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
                  {content.subtitle}
                </p>
              </div>

              <div className="mt-5 rounded-[24px] border border-border/60 bg-white/80 p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.30)] backdrop-blur-xl dark:bg-slate-900/60 sm:p-5">
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
                  <form onSubmit={handleResetSubmit} className="space-y-4">
                    <div
                      className={`rounded-[16px] border border-slate-200/90 bg-slate-100/80 p-3 ${
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
                      <p className="text-[11.5px] leading-5 text-muted-foreground">
                        {content.sideDescription}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground/85">
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
                          className={`h-11 rounded-[13px] border-slate-200/90 bg-slate-100/90 text-[13px] shadow-none dark:border-slate-700 dark:bg-slate-800/70 transition-all duration-200 placeholder:text-muted-foreground/55 hover:border-slate-300 hover:bg-slate-200/70 dark:hover:border-slate-600 dark:hover:bg-slate-800 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300/35 ${
                            isArabic ? "pr-11 text-right" : "pl-11 text-left"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground/85">
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
                          className={`h-11 rounded-[13px] border-slate-200/90 bg-slate-100/90 text-[13px] shadow-none dark:border-slate-700 dark:bg-slate-800/70 transition-all duration-200 placeholder:text-muted-foreground/55 hover:border-slate-300 hover:bg-slate-200/70 dark:hover:border-slate-600 dark:hover:bg-slate-800 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300/35 ${
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

                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-foreground/85">
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
                          className={`h-11 rounded-[13px] border-slate-200/90 bg-slate-100/90 text-[13px] shadow-none dark:border-slate-700 dark:bg-slate-800/70 transition-all duration-200 placeholder:text-muted-foreground/55 hover:border-slate-300 hover:bg-slate-200/70 dark:hover:border-slate-600 dark:hover:bg-slate-800 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300/35 ${
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
                      className="h-11 w-full rounded-[13px] bg-[#151b2b] text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.75)] transition hover:bg-[#20283c]"
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
                      className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-[13px] border border-slate-200/90 bg-white/70 px-4 text-[12px] font-medium text-muted-foreground transition hover:border-slate-300 hover:bg-slate-100 hover:text-foreground ${
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