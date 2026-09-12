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

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "";

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
              window.localStorage.getItem("Mhamcloud-locale")) as AppLocale | null)
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
        window.dispatchEvent(new Event("Mhamcloud-locale-changed"));
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
    <main data-mhamcloud-reset="bundui-auth-split" dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden min-h-screen overflow-hidden bg-muted lg:block">
          <Image src="/images/extra/image4.jpg" alt="" fill priority sizes="50vw" className="object-cover" />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/35" />
          <div className="relative z-10 flex h-full min-h-screen flex-col justify-between p-10 text-white xl:p-14">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur"><ShieldCheck className="size-5" /></div>
              <div><p className="text-xs text-white/65">{isArabic ? "استعادة الوصول الآمن" : "Secure account recovery"}</p><p className="text-xl font-semibold">Mhamcloud</p></div>
            </div>
            <div className={isArabic ? "text-right" : "text-left"}>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs backdrop-blur"><KeyRound className="size-3.5" /><span>{content.badge}</span></div>
              <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight xl:text-5xl">{content.sideTitle}</h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-white/75 xl:text-base">{content.sideDescription}</p>
              <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur"><ShieldCheck className="mb-3 size-5" /><p className="text-sm font-medium">{content.pointOneTitle}</p><p className="mt-1 text-xs leading-5 text-white/65">{content.pointOneDescription}</p></div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur"><Building2 className="mb-3 size-5" /><p className="text-sm font-medium">{content.pointTwoTitle}</p><p className="mt-1 text-xs leading-5 text-white/65">{content.pointTwoDescription}</p></div>
              </div>
            </div>
            <p className="text-xs text-white/55">{isArabic ? "Mhamcloud — استعادة حساب آمنة" : "Mhamcloud — Secure account recovery"}</p>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <Button type="button" variant="outline" size="sm" onClick={toggleLanguage} className={`absolute top-6 ${isArabic ? "left-6" : "right-6"}`}><Languages className="size-3.5" /><span>{isArabic ? "EN" : "عربي"}</span></Button>
          <div className="w-full max-w-md">
            <div className="mb-7 text-center">
              <Image src="/logo/primey.svg" alt="Mhamcloud" width={220} height={72} priority className="mx-auto mb-5 h-auto w-[190px] object-contain" />
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground"><KeyRound className="size-3.5" /><span>{content.badge}</span></div>
              <h2 className="text-3xl font-bold tracking-tight">{content.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{content.subtitle}</p>
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
              {done ? (
                <div className="space-y-5">
                  <div role="status" className={`rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 ${isArabic ? "text-right" : "text-left"}`}><div className="mb-2 flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5" /><span>{content.successTitle}</span></div><p className="text-sm leading-6">{content.successDescription}</p></div>
                  <Button type="button" variant="outline" className="w-full" onClick={() => { setDone(false); setError(null); }}>{content.tryAgain}</Button>
                  <Button asChild className="w-full bg-black text-white hover:bg-black/85"><Link href="/login">{content.backToLogin}</Link></Button>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div className="space-y-2"><label htmlFor="reset-identifier" className="text-sm font-medium">{content.identifierLabel}</label><div className="relative"><Mail className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ${isArabic ? "right-3" : "left-3"}`} /><Input id="reset-identifier" required autoComplete="username email" dir="auto" placeholder={content.identifierPlaceholder} value={identifier} onChange={(e) => { setIdentifier(e.target.value); clearFormErrors(); }} className={`h-10 ${isArabic ? "pr-9 text-right" : "pl-9 text-left"}`} /></div></div>
                  <div className="space-y-2"><label htmlFor="reset-new-password" className="text-sm font-medium">{content.newPasswordLabel}</label><div className="relative"><LockKeyhole className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ${isArabic ? "right-3" : "left-3"}`} /><Input id="reset-new-password" required autoComplete="new-password" type={showNewPassword ? "text" : "password"} dir="ltr" placeholder={content.newPasswordPlaceholder} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); clearFormErrors(); }} className={`h-10 ${isArabic ? "pr-9 pl-10 text-right" : "pl-9 pr-10 text-left"}`} /><button type="button" onClick={() => setShowNewPassword((v) => !v)} className={`absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted ${isArabic ? "left-1" : "right-1"}`}>{showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
                  <div className="space-y-2"><label htmlFor="reset-confirm-password" className="text-sm font-medium">{content.confirmPasswordLabel}</label><div className="relative"><LockKeyhole className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ${isArabic ? "right-3" : "left-3"}`} /><Input id="reset-confirm-password" required autoComplete="new-password" type={showConfirmPassword ? "text" : "password"} dir="ltr" placeholder={content.confirmPasswordPlaceholder} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); clearFormErrors(); }} className={`h-10 ${isArabic ? "pr-9 pl-10 text-right" : "pl-9 pr-10 text-left"}`} /><button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className={`absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted ${isArabic ? "left-1" : "right-1"}`}>{showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
                  {error ? <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div> : null}
                  <Button type="submit" disabled={loading} className="h-10 w-full bg-black text-white hover:bg-black/85">{loading ? <><Loader2 className="size-4 animate-spin" /><span>{content.loadingButton}</span></> : content.resetButton}</Button>
                  <Link href="/login" className="flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted"><BackIcon className="size-4" /><span>{content.backToLogin}</span></Link>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
