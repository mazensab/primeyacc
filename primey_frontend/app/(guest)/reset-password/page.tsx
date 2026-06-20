"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
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
   📌 Primey Care - Guest Reset Password Page
   ✅ متوافق مع Primey Care
   ✅ يدعم العربية والإنجليزية
   ✅ يدعم RTL / LTR
   ✅ CSRF + Reset Password Flow
   ✅ تصميم متناسق مع صفحة تسجيل الدخول
========================================================= */

type AppLocale = "ar" | "en";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";

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

export default function ResetGuestPasswordPage() {
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
        ? "أدخل اسم المستخدم أو البريد الإلكتروني وحدد كلمة مرور جديدة للوصول الآمن إلى Primey Care"
        : "Enter your username or email and choose a new password for secure Primey Care access",
      badge: isArabic ? "استعادة الوصول" : "Restore access",
      successTitle: isArabic
        ? "اكتملت إعادة تعيين كلمة المرور"
        : "Password reset completed",
      successDescription: isArabic
        ? "تم تحديث كلمة المرور بنجاح. إذا كان الحساب مرتبطًا ببريد إلكتروني، فقد يتم إرسال إشعار أمني إليه."
        : "Your password was updated successfully. If the account has an email address, a security notification may be sent.",
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
      loadingButton: isArabic ? "جارٍ إعادة التعيين..." : "Resetting...",
      backToLogin: isArabic ? "العودة إلى تسجيل الدخول" : "Back to login",
      showPassword: isArabic ? "إظهار كلمة المرور" : "Show password",
      hidePassword: isArabic ? "إخفاء كلمة المرور" : "Hide password",
      secureSession: isArabic ? "إجراء آمن ومحمي" : "Secure protected action",
      identifierRequired: isArabic
        ? "الرجاء إدخال اسم المستخدم أو البريد الإلكتروني"
        : "Please enter username or email",
      newPasswordRequired: isArabic
        ? "الرجاء إدخال كلمة المرور الجديدة"
        : "Please enter the new password",
      passwordMinLength: isArabic
        ? "يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل"
        : "New password must be at least 8 characters",
      passwordsMismatch: isArabic
        ? "كلمتا المرور غير متطابقتين"
        : "Passwords do not match",
      csrfMissing: isArabic
        ? "تعذر تجهيز جلسة الأمان، حاول مرة أخرى"
        : "Unable to initialize secure session, please try again",
      resetFailed: isArabic
        ? "فشلت إعادة تعيين كلمة المرور"
        : "Failed to reset password",
      successToast: isArabic
        ? "تمت إعادة تعيين كلمة المرور بنجاح"
        : "Password reset successfully",
      serverError: isArabic ? "خطأ في الخادم" : "Server error",
    }),
    [isArabic]
  );

  useEffect(() => {
    try {
      const savedLocale =
        typeof window !== "undefined"
          ? (window.localStorage.getItem("primey-locale") as AppLocale | null)
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
        window.localStorage.setItem("primey-locale", nextLocale);
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

  /* =========================================================
     🚀 Reset Password Handler
  ========================================================= */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      setError(content.identifierRequired);
      toast.error(content.identifierRequired);
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError(content.newPasswordRequired);
      toast.error(content.newPasswordRequired);
      return;
    }

    if (newPassword.length < 8) {
      setError(content.passwordMinLength);
      toast.error(content.passwordMinLength);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(content.passwordsMismatch);
      toast.error(content.passwordsMismatch);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const csrfResponse = await fetch(resolveApiUrl("/api/auth/csrf/"), {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!csrfResponse.ok) {
        throw new Error(content.csrfMissing);
      }

      const csrfToken = getCookie("csrftoken");

      if (!csrfToken) {
        throw new Error(content.csrfMissing);
      }

      const response = await fetch(
        resolveApiUrl("/api/auth/resetguest-password/"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({
            identifier: cleanIdentifier,
            new_password: newPassword,
            confirm_password: confirmPassword,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || content.resetFailed
        );
      }

      setDone(true);
      setIdentifier("");
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      const successMessage = data?.message || content.successToast;
      toast.success(successMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : content.serverError;
      setError(message);
      toast.error(message);
      console.error("Reset guest password error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.10),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.10),_transparent_35%),linear-gradient(to_bottom_right,_hsl(var(--background)),_hsl(var(--muted)/0.55))]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="absolute -left-16 top-24 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-16 bottom-16 h-60 w-60 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/20 bg-background/80 shadow-2xl backdrop-blur-xl lg:grid-cols-2">
          {/* =====================================================
              الجانب التعريفي
          ===================================================== */}
          <section className="relative hidden min-h-[720px] overflow-hidden bg-gradient-to-br from-primary/95 via-primary to-emerald-600 text-white lg:flex">
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
                    Primey Care
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
                  {isArabic
                    ? "استعد الوصول إلى حسابك بسهولة ضمن بيئة Primey Care الآمنة"
                    : "Restore access to your account inside the secure Primey Care environment"}
                </h2>

                <p className="mt-6 max-w-xl text-base leading-8 text-white/85 xl:text-lg">
                  {isArabic
                    ? "هذه الصفحة مخصصة لإعادة تعيين كلمة المرور بسرعة وأمان، مع تجربة موحدة ومتوافقة مع هوية النظام وصفحات الدخول."
                    : "This page helps you reset your password quickly and securely through a unified experience that matches the platform login flow."}
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
                      <Mail className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">
                      {isArabic ? "تعريف مرن للحساب" : "Flexible account lookup"}
                    </h3>
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    {isArabic
                      ? "يمكنك استخدام اسم المستخدم أو البريد الإلكتروني للوصول إلى الحساب المطلوب."
                      : "You can use either the username or email address to identify the target account."}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  <div
                    className={`mb-3 flex items-center gap-3 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="rounded-2xl bg-white/10 p-2">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">
                      {isArabic ? "تحديث آمن" : "Secure update"}
                    </h3>
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    {isArabic
                      ? "يتم تنفيذ العملية عبر CSRF + Cookies بشكل متوافق مع الباكند المعتمد في Primey Care."
                      : "The flow runs through CSRF + cookie-based protection and stays fully compatible with the Primey Care backend."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================
              نموذج إعادة التعيين
          ===================================================== */}
          <section className="flex min-h-[720px] items-center justify-center p-5 sm:p-8 lg:p-10">
            <div className="w-full max-w-md">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logo/primey.svg"
                    alt="Primey Care"
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
                  className="h-10 rounded-2xl border-border/70 bg-background/70 px-3 shadow-sm backdrop-blur"
                >
                  <Languages className="me-1 h-4 w-4" />
                  <span>{isArabic ? "EN" : "عربي"}</span>
                </Button>
              </div>

              <div
                className={`rounded-[28px] border border-border/60 bg-background/90 p-6 shadow-xl backdrop-blur sm:p-8 ${
                  isArabic ? "text-right" : "text-left"
                }`}
              >
                <div className="mb-8">
                  <div
                    className={`mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{content.badge}</span>
                  </div>

                  <h2 className="text-3xl font-bold tracking-tight">
                    {content.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {content.subtitle}
                  </p>
                </div>

                {done ? (
                  <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <div
                      className={`flex items-start gap-3 ${
                        isArabic ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-5 w-5" />
                      </div>

                      <div className={isArabic ? "text-right" : "text-left"}>
                        <p className="font-semibold text-foreground">
                          {content.successTitle}
                        </p>
                        <p className="mt-1 text-sm leading-7 text-muted-foreground">
                          {content.successDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-5">
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
                        dir={isArabic ? "rtl" : "ltr"}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={content.identifierPlaceholder}
                        className={`h-12 rounded-2xl border-border/70 bg-muted/30 shadow-sm ${
                          isArabic
                            ? "pr-11 text-right"
                            : "pl-11 text-left"
                        }`}
                        autoComplete="username"
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
                        type={showNewPassword ? "text" : "password"}
                        dir={isArabic ? "rtl" : "ltr"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={content.newPasswordPlaceholder}
                        className={`h-12 rounded-2xl border-border/70 bg-muted/30 shadow-sm ${
                          isArabic
                            ? "pr-11 pl-12 text-right"
                            : "pl-11 pr-12 text-left"
                        }`}
                        autoComplete="new-password"
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
                        type={showConfirmPassword ? "text" : "password"}
                        dir={isArabic ? "rtl" : "ltr"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={content.confirmPasswordPlaceholder}
                        className={`h-12 rounded-2xl border-border/70 bg-muted/30 shadow-sm ${
                          isArabic
                            ? "pr-11 pl-12 text-right"
                            : "pl-11 pr-12 text-left"
                        }`}
                        autoComplete="new-password"
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
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}