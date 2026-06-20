/* ============================================================
   📂 app/(guest)/login/page.tsx
   🧠 PrimeyAcc | Unified Login Page — Phase 5.1.2

   ✅ صفحة دخول موحدة
   ✅ دخول النظام: username/password
   ✅ دخول العميل: phone + WhatsApp OTP
   ✅ يدعم العربية والإنجليزية
   ✅ يدعم RTL / LTR
   ✅ CSRF + Cookies Session
   ✅ Redirect ذكي حسب whoami/dashboard_path
   ✅ Sonner Toasts

   القاعدة المعتمدة:
   - لا يتم إنشاء ملفات backup داخل المشروع.
   - لا يتم كسر تصميم الدخول الحالي.
   - لا يتم تكرار AuthProvider.
   - صفحة الدخول الرسمية هي /login.
============================================================ */
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Languages,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Phone,
  ShieldCheck,
  User2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* =========================================================
   ًں“Œ PrimeyAcc - Unified Login Page
   Path: primey_frontend/app/(guest)/login/page.tsx

   âœ… طµظپط­ط© ط¯ط®ظˆظ„ ظ…ظˆط­ط¯ط©
   âœ… ط¯ط®ظˆظ„ ط§ظ„ظ†ط¸ط§ظ…: username/password
   âœ… ط¯ط®ظˆظ„ ط§ظ„ط¹ظ…ظٹظ„: phone + WhatsApp OTP
   âœ… ظٹط¯ط¹ظ… ط§ظ„ط¹ط±ط¨ظٹط© ظˆط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹط©
   âœ… ظٹط¯ط¹ظ… RTL / LTR
   âœ… CSRF + Cookies Session
   âœ… Redirect ط°ظƒظٹ ط­ط³ط¨ whoami/dashboard_path
   âœ… Sonner Toasts
========================================================= */

type AppLocale = "ar" | "en";
type LoginMode = "system" | "customer";
type CustomerOtpStep = "phone" | "otp";

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
  company_id?: number | null;
  center_id?: number | null;
  customer_id?: number | null;
  agent_id?: number | null;
  permissions?: {
    is_superuser?: boolean;
    is_staff?: boolean;
    groups?: string[];
  } | null;
  profile?: {
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

function extractApiMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;

  const payload = data as JsonObject;

  const directMessage =
    asString(payload.message) ||
    asString(payload.detail) ||
    asString(payload.error) ||
    asString(payload.non_field_errors);

  if (directMessage) return directMessage;

  const errors = payload.errors;
  if (errors && typeof errors === "object") {
    const firstValue = Object.values(errors as JsonObject)[0];

    if (Array.isArray(firstValue)) {
      const firstMessage = firstValue.find((item) => asString(item));
      if (firstMessage) return asString(firstMessage);
    }

    if (asString(firstValue)) return asString(firstValue);
  }

  return fallback;
}

function normalizePhoneInput(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return "";

  const digitsAndPlus = trimmed.replace(/[^\d+]/g, "");

  if (digitsAndPlus.startsWith("+")) {
    return `+${digitsAndPlus.slice(1).replace(/\D/g, "")}`;
  }

  const digitsOnly = digitsAndPlus.replace(/\D/g, "");

  if (digitsOnly.startsWith("966")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("05") && digitsOnly.length === 10) {
    return `+966${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.startsWith("5") && digitsOnly.length === 9) {
    return `+966${digitsOnly}`;
  }

  return digitsOnly;
}

function isValidSaudiPhone(value: string): boolean {
  const normalized = normalizePhoneInput(value);
  return /^\+9665\d{8}$/.test(normalized);
}

function extractIds(user: WhoAmIResponse | null) {
  const profileExtra = user?.profile?.extra_data ?? {};

  const toId = (value: unknown): number | null => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  };

  return {
    companyId: toId(user?.company_id ?? profileExtra?.["company_id"]),
    centerId: toId(user?.center_id ?? profileExtra?.["center_id"]),
    customerId: toId(user?.customer_id ?? profileExtra?.["customer_id"]),
    agentId: toId(user?.agent_id ?? profileExtra?.["agent_id"]),
  };
}

function isSystemUser(user: WhoAmIResponse | null): boolean {
  if (!user) return false;

  const normalizedRole = normalizeUpper(user.role);
  const normalizedUserType = normalizeUpper(
    user.user_type || user.profile?.user_type
  );
  const normalizedScope = normalizeUpper(user.scope_type);
  const permissions = user.permissions || {};
  const groups = Array.isArray(permissions.groups)
    ? permissions.groups.map((item) => normalizeUpper(item))
    : [];

  return (
    extractBoolean(user.is_system_user) ||
    extractBoolean(user.is_superuser) ||
    extractBoolean(user.is_staff) ||
    extractBoolean(permissions.is_superuser) ||
    extractBoolean(permissions.is_staff) ||
    [
      "SYSTEM",
      "SUPER_ADMIN",
      "SYSTEM_ADMIN",
      "SUPPORT",
      "INTERNAL",
      "ADMIN",
    ].includes(normalizedRole) ||
    ["SYSTEM", "SUPER_ADMIN", "SYSTEM_ADMIN", "SUPPORT"].includes(
      normalizedUserType
    ) ||
    normalizedScope === "SYSTEM" ||
    groups.some((group) =>
      ["SYSTEM", "SUPER_ADMIN", "SYSTEM_ADMIN", "SUPPORT", "ADMIN"].includes(
        group
      )
    )
  );
}

function resolveRedirectPath(
  user: WhoAmIResponse | null,
  preferredMode?: LoginMode
): string {
  if (!user) {
    return preferredMode === "customer" ? "/customer" : "/system";
  }

  const dashboardPath = String(user.dashboard_path || "").trim();
  if (dashboardPath.startsWith("/")) {
    return dashboardPath;
  }

  const { companyId, centerId, customerId, agentId } = extractIds(user);

  if (preferredMode === "customer" && customerId) {
    return "/customer";
  }

  if (isSystemUser(user)) {
    return "/system";
  }

  if (companyId) {
    return "/company";
  }

  if (centerId) {
    return "/center";
  }

  if (customerId) {
    return "/customer";
  }

  if (agentId) {
    return "/agent";
  }

  return preferredMode === "customer" ? "/customer" : "/system";
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
  const [mode, setMode] = useState<LoginMode>("system");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [customerPhone, setCustomerPhone] = useState("");
  const [customerOtp, setCustomerOtp] = useState("");
  const [customerStep, setCustomerStep] = useState<CustomerOtpStep>("phone");

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const isArabic = locale === "ar";
  const normalizedCustomerPhone = normalizePhoneInput(customerPhone);

  const content = useMemo(
    () => ({
      title: isArabic ? "ظ…ط±ط­ط¨ظ‹ط§ ط¨ط¹ظˆط¯طھظƒ" : "Welcome back",
      subtitle: isArabic
        ? "ط³ط¬ظ‘ظ„ ط§ظ„ط¯ط®ظˆظ„ ظ„ظ„ظˆطµظˆظ„ ط¥ظ„ظ‰ ظ…ظ†طµط© PrimeyAcc ظˆط¥ط¯ط§ط±ط© ط¹ظ…ظ„ظٹط§طھظƒ ط¨ط³ظ‡ظˆظ„ط© ظˆط£ظ…ط§ظ†"
        : "Sign in to access PrimeyAcc and manage your operations securely",

      systemTab: isArabic ? "ط¯ط®ظˆظ„ ط§ظ„ظ†ط¸ط§ظ…" : "System access",
      customerTab: isArabic ? "ط¯ط®ظˆظ„ ط§ظ„ط¹ظ…ظٹظ„" : "Customer access",

      usernameLabel: isArabic ? "ط§ط³ظ… ط§ظ„ظ…ط³طھط®ط¯ظ…" : "Username",
      passwordLabel: isArabic ? "ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±" : "Password",
      remember: isArabic ? "طھط°ظƒط±ظ†ظٹ" : "Remember me",
      resetPassword: isArabic ? "ط¥ط¹ط§ط¯ط© طھط¹ظٹظٹظ† ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±طں" : "Reset password?",
      login: isArabic ? "طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„" : "Sign in",
      loading: isArabic ? "ط¬ط§ط±ظچ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„..." : "Signing in...",
      passwordShow: isArabic ? "ط¥ط¸ظ‡ط§ط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±" : "Show password",
      passwordHide: isArabic ? "ط¥ط®ظپط§ط، ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±" : "Hide password",
      securityNote: isArabic
        ? "ط¬ظ„ط³ط© ط¯ط®ظˆظ„ ط¢ظ…ظ†ط© ظˆظ…ط­ظ…ظٹط©"
        : "Secure protected session",
      welcomeBadge: isArabic ? "ط¨ظˆط§ط¨ط© ط§ظ„ط¯ط®ظˆظ„" : "Access portal",
      invalidCredentials: isArabic
        ? "ط§ط³ظ… ط§ظ„ظ…ط³طھط®ط¯ظ… ط£ظˆ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط؛ظٹط± طµط­ظٹط­ط©"
        : "Invalid username or password",
      csrfMissing: isArabic
        ? "طھط¹ط°ط± طھط¬ظ‡ظٹط² ط¬ظ„ط³ط© ط§ظ„ط£ظ…ط§ظ†طŒ ط­ط§ظˆظ„ ظ…ط±ط© ط£ط®ط±ظ‰"
        : "Unable to initialize secure session, please try again",
      sessionFailed: isArabic
        ? "طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ظ„ظƒظ† طھط¹ط°ط± ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ط¬ظ„ط³ط©"
        : "Signed in, but session validation failed",
      loginFailed: isArabic ? "ظپط´ظ„ طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„" : "Login failed",
      requiredFields: isArabic
        ? "ظٹط±ط¬ظ‰ طھط¹ط¨ط¦ط© ط§ط³ظ… ط§ظ„ظ…ط³طھط®ط¯ظ… ظˆظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±"
        : "Please enter username and password",
      loginSuccess: isArabic
        ? "طھظ… طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„ ط¨ظ†ط¬ط§ط­"
        : "Signed in successfully",
      usernamePlaceholder: isArabic ? "ط£ط¯ط®ظ„ ط§ط³ظ… ط§ظ„ظ…ط³طھط®ط¯ظ…" : "Enter username",
      passwordPlaceholder: isArabic ? "ط£ط¯ط®ظ„ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±" : "Enter password",

      customerTitle: isArabic ? "ط¯ط®ظˆظ„ ط§ظ„ط¹ظ…ظٹظ„" : "Customer sign in",
      customerSubtitle: isArabic
        ? "ط£ط¯ط®ظ„ ط±ظ‚ظ… ط¬ظˆط§ظ„ظƒ ظ„ط§ط³طھظ„ط§ظ… ظƒظˆط¯ ط§ظ„طھط­ظ‚ظ‚ ط¹ط¨ط± ظˆط§طھط³ط§ط¨"
        : "Enter your phone number to receive a WhatsApp OTP",
      phoneLabel: isArabic ? "ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„" : "Phone number",
      phonePlaceholder: isArabic ? "05xxxxxxxx" : "05xxxxxxxx",
      otpLabel: isArabic ? "ظƒظˆط¯ ط§ظ„طھط­ظ‚ظ‚" : "Verification code",
      otpPlaceholder: isArabic ? "ط£ط¯ط®ظ„ ظƒظˆط¯ ط§ظ„طھط­ظ‚ظ‚" : "Enter verification code",
      requestOtp: isArabic ? "ط¥ط±ط³ط§ظ„ ظƒظˆط¯ ط§ظ„طھط­ظ‚ظ‚" : "Send OTP",
      requestOtpLoading: isArabic ? "ط¬ط§ط±ظچ ط¥ط±ط³ط§ظ„ ط§ظ„ظƒظˆط¯..." : "Sending OTP...",
      verifyOtp: isArabic ? "طھط£ظƒظٹط¯ ط§ظ„ط¯ط®ظˆظ„" : "Verify and sign in",
      verifyOtpLoading: isArabic
        ? "ط¬ط§ط±ظچ ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ظƒظˆط¯..."
        : "Verifying code...",
      backToPhone: isArabic ? "طھط؛ظٹظٹط± ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„" : "Change phone number",
      resendOtp: isArabic ? "ط¥ط¹ط§ط¯ط© ط¥ط±ط³ط§ظ„ ط§ظ„ظƒظˆط¯" : "Resend OTP",
      phoneRequired: isArabic
        ? "ظٹط±ط¬ظ‰ ط¥ط¯ط®ط§ظ„ ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„"
        : "Please enter phone number",
      phoneInvalid: isArabic
        ? "ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„ ط؛ظٹط± طµط­ظٹط­طŒ ط§ط³طھط®ط¯ظ… ط±ظ‚ظ… ط³ط¹ظˆط¯ظٹ ظٹط¨ط¯ط£ ط¨ظ€ 05"
        : "Invalid phone number, use a Saudi number starting with 05",
      otpRequired: isArabic
        ? "ظٹط±ط¬ظ‰ ط¥ط¯ط®ط§ظ„ ظƒظˆط¯ ط§ظ„طھط­ظ‚ظ‚"
        : "Please enter verification code",
      otpSent: isArabic
        ? "طھظ… ط¥ط±ط³ط§ظ„ ظƒظˆط¯ ط§ظ„طھط­ظ‚ظ‚ ط¹ط¨ط± ظˆط§طھط³ط§ط¨"
        : "OTP has been sent via WhatsApp",
      otpVerified: isArabic
        ? "طھظ… طھط³ط¬ظٹظ„ ط¯ط®ظˆظ„ ط§ظ„ط¹ظ…ظٹظ„ ط¨ظ†ط¬ط§ط­"
        : "Customer signed in successfully",
      otpRequestFailed: isArabic
        ? "طھط¹ط°ط± ط¥ط±ط³ط§ظ„ ظƒظˆط¯ ط§ظ„طھط­ظ‚ظ‚"
        : "Unable to send OTP",
      otpVerifyFailed: isArabic
        ? "ظƒظˆط¯ ط§ظ„طھط­ظ‚ظ‚ ط؛ظٹط± طµط­ظٹط­ ط£ظˆ ظ…ظ†طھظ‡ظٹ"
        : "Invalid or expired verification code",
      customerNote: isArabic
        ? "ط¯ط®ظˆظ„ ط§ظ„ط¹ظ…ظٹظ„ ظٹطھظ… ط¨ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„ ظˆظƒظˆط¯ طھط­ظ‚ظ‚ ظˆط§طھط³ط§ط¨ ط¨ط¯ظˆظ† ظƒظ„ظ…ط© ظ…ط±ظˆط±."
        : "Customer access uses phone number and WhatsApp OTP without a password.",
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
      console.error("Login locale initialization error:", err);
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
      console.error("Login language toggle error:", err);
    }
  };

  const switchMode = (nextMode: LoginMode) => {
    if (loading || otpLoading) return;

    setMode(nextMode);
    setError(null);
    setOtpError(null);
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
     ًںڑ€ System Login Handler
  ========================================================= */
  const handleSystemSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      await fetchWhoamiAndRedirect("system");
    } catch (err) {
      const message = err instanceof Error ? err.message : content.loginFailed;

      setError(message);
      toast.error(message);
      console.error("System login error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     ًں“² Customer OTP - Request
  ========================================================= */
  const handleRequestCustomerOtp = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (otpLoading) return;

    if (!customerPhone.trim()) {
      setOtpError(content.phoneRequired);
      toast.error(content.phoneRequired);
      return;
    }

    if (!isValidSaudiPhone(customerPhone)) {
      setOtpError(content.phoneInvalid);
      toast.error(content.phoneInvalid);
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const csrfToken = await prepareCsrf(content.csrfMissing);

      const response = await fetch(
        resolveApiUrl("/api/customers/auth/request-otp/"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({
            phone: normalizedCustomerPhone,
            phone_number: normalizedCustomerPhone,
            mobile: normalizedCustomerPhone,
            channel: "whatsapp",
          }),
        }
      );

      let payload: unknown = null;

      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(extractApiMessage(payload, content.otpRequestFailed));
      }

      setCustomerStep("otp");
      setCustomerOtp("");
      toast.success(extractApiMessage(payload, content.otpSent));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : content.otpRequestFailed;

      setOtpError(message);
      toast.error(message);
      console.error("Customer OTP request error:", err);
    } finally {
      setOtpLoading(false);
    }
  };

  /* =========================================================
     âœ… Customer OTP - Verify
  ========================================================= */
  const handleVerifyCustomerOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (otpLoading) return;

    if (!isValidSaudiPhone(customerPhone)) {
      setOtpError(content.phoneInvalid);
      toast.error(content.phoneInvalid);
      setCustomerStep("phone");
      return;
    }

    if (!customerOtp.trim()) {
      setOtpError(content.otpRequired);
      toast.error(content.otpRequired);
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const csrfToken = await prepareCsrf(content.csrfMissing);

      const response = await fetch(
        resolveApiUrl("/api/customers/auth/verify-otp/"),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({
            phone: normalizedCustomerPhone,
            phone_number: normalizedCustomerPhone,
            mobile: normalizedCustomerPhone,
            otp: customerOtp.trim(),
            code: customerOtp.trim(),
            verification_code: customerOtp.trim(),
            channel: "whatsapp",
          }),
        }
      );

      let payload: unknown = null;

      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(extractApiMessage(payload, content.otpVerifyFailed));
      }

      toast.success(extractApiMessage(payload, content.otpVerified));
      await fetchWhoamiAndRedirect("customer");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : content.otpVerifyFailed;

      setOtpError(message);
      toast.error(message);
      console.error("Customer OTP verify error:", err);
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(67,42,88,0.14),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(140,156,220,0.14),_transparent_36%),linear-gradient(to_bottom_right,_hsl(var(--background)),_hsl(var(--muted)/0.55))]">
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
                    ? "ط¯ط®ظˆظ„ ظ…ظˆط­ط¯ ظ„ظ„ظ†ط¸ط§ظ… ظˆط§ظ„ط¹ظ…ظ„ط§ط، ط¹ط¨ط± PrimeyAcc"
                    : "Unified access for system users and customers"}
                </h2>

                <p className="mt-6 max-w-xl text-base leading-8 text-white/85 xl:text-lg">
                  {isArabic
                    ? "ظٹظ…ظƒظ† ظ„ظ…ط³طھط®ط¯ظ…ظٹ ط§ظ„ظ†ط¸ط§ظ… ط§ظ„ط¯ط®ظˆظ„ ط¨ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±طŒ ظˆظٹظ…ظƒظ† ظ„ظ„ط¹ظ…ظ„ط§ط، ط§ظ„ط¯ط®ظˆظ„ ط¨ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„ ظˆظƒظˆط¯ طھط­ظ‚ظ‚ ظˆط§طھط³ط§ط¨ ظ…ظ† ظ†ظپط³ طµظپط­ط© ط§ظ„ط¯ط®ظˆظ„."
                    : "System users can sign in with a password, while customers can access their workspace using phone number and WhatsApp OTP from the same page."}
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
                      <User2 className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">
                      {isArabic ? "ط¯ط®ظˆظ„ ط­ط³ط¨ ط§ظ„ط¯ظˆط±" : "Role-based access"}
                    </h3>
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    {isArabic
                      ? "ظٹطھظ… طھظˆط¬ظٹظ‡ ظƒظ„ ظ…ط³طھط®ط¯ظ… طھظ„ظ‚ط§ط¦ظٹظ‹ط§ ط¥ظ„ظ‰ ط§ظ„ظˆط§ط¬ظ‡ط© ط§ظ„ظ…ظ†ط§ط³ط¨ط© ط¨ط¹ط¯ ط§ظ„ط¯ط®ظˆظ„."
                      : "Each user is redirected automatically to the correct workspace after sign in."}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                  <div
                    className={`mb-3 flex items-center gap-3 ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="rounded-2xl bg-white/10 p-2">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">
                      {isArabic ? "طھط­ظ‚ظ‚ ظˆط§طھط³ط§ط¨" : "WhatsApp OTP"}
                    </h3>
                  </div>
                  <p className="text-sm leading-7 text-white/80">
                    {isArabic
                      ? "ط§ظ„ط¹ظ…ظ„ط§ط، ظٹط¯ط®ظ„ظˆظ† ط¨ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„ ظˆظƒظˆط¯ طھط­ظ‚ظ‚ ط¨ط¯ظˆظ† ظƒظ„ظ…ط© ظ…ط±ظˆط±."
                      : "Customers sign in with phone number and verification code without a password."}
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
                  className="h-10 rounded-2xl border-border/70 bg-background/70 px-3 shadow-sm backdrop-blur"
                >
                  <Languages className="me-1 h-4 w-4" />
                  <span>{isArabic ? "EN" : "ط¹ط±ط¨ظٹ"}</span>
                </Button>
              </div>

              <div
                className={`rounded-[28px] border border-border/60 bg-background/90 p-6 shadow-xl backdrop-blur sm:p-8 ${
                  isArabic ? "text-right" : "text-left"
                }`}
              >
                <div className="mb-6">
                  <div
                    className={`mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary ${
                      isArabic ? "flex-row-reverse" : ""
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{content.welcomeBadge}</span>
                  </div>

                  <h2 className="text-3xl font-bold tracking-tight">
                    {content.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {content.subtitle}
                  </p>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-2 rounded-3xl border border-border/60 bg-muted/30 p-1.5">
                  <button
                    type="button"
                    onClick={() => switchMode("system")}
                    className={`flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition ${
                      mode === "system"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    } ${isArabic ? "flex-row-reverse" : ""}`}
                  >
                    <User2 className="h-4 w-4" />
                    <span>{content.systemTab}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchMode("customer")}
                    className={`flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition ${
                      mode === "customer"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    } ${isArabic ? "flex-row-reverse" : ""}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{content.customerTab}</span>
                  </button>
                </div>

                {mode === "system" ? (
                  <form onSubmit={handleSystemSubmit} className="space-y-5">
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
                          onChange={(e) => setUsername(e.target.value)}
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
                          onChange={(e) => setPassword(e.target.value)}
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
                ) : (
                  <div className="space-y-5">
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
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <span>{content.customerTitle}</span>
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">
                        {customerStep === "phone"
                          ? content.customerSubtitle
                          : content.customerNote}
                      </p>
                    </div>

                    {customerStep === "phone" ? (
                      <form
                        onSubmit={handleRequestCustomerOtp}
                        className="space-y-5"
                      >
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {content.phoneLabel}
                          </label>

                          <div className="relative">
                            <Phone
                              className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${
                                isArabic ? "right-4" : "left-4"
                              }`}
                            />

                            <Input
                              required
                              inputMode="tel"
                              autoComplete="tel"
                              dir="ltr"
                              placeholder={content.phonePlaceholder}
                              value={customerPhone}
                              onChange={(e) => {
                                setCustomerPhone(e.target.value);
                                setOtpError(null);
                              }}
                              className={`h-12 rounded-2xl border-border/70 bg-muted/30 shadow-sm ${
                                isArabic ? "pr-11 text-left" : "pl-11 text-left"
                              }`}
                            />
                          </div>

                          {customerPhone.trim() ? (
                            <p
                              className={`text-xs text-muted-foreground ${
                                isArabic ? "text-right" : "text-left"
                              }`}
                            >
                              {isArabic
                                ? `ط³ظٹطھظ… ط§ط³طھط®ط¯ط§ظ… ط§ظ„ط±ظ‚ظ…: ${normalizedCustomerPhone || customerPhone}`
                                : `Using: ${normalizedCustomerPhone || customerPhone}`}
                            </p>
                          ) : null}
                        </div>

                        {otpError ? (
                          <div
                            className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 ${
                              isArabic ? "text-right" : "text-left"
                            }`}
                          >
                            {otpError}
                          </div>
                        ) : null}

                        <Button
                          type="submit"
                          disabled={otpLoading}
                          className="h-12 w-full rounded-2xl text-base font-semibold shadow-lg"
                        >
                          {otpLoading ? (
                            <span
                              className={`flex items-center justify-center gap-2 ${
                                isArabic ? "flex-row-reverse" : ""
                              }`}
                            >
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>{content.requestOtpLoading}</span>
                            </span>
                          ) : (
                            <span
                              className={`flex items-center justify-center gap-2 ${
                                isArabic ? "flex-row-reverse" : ""
                              }`}
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span>{content.requestOtp}</span>
                            </span>
                          )}
                        </Button>
                      </form>
                    ) : (
                      <form
                        onSubmit={handleVerifyCustomerOtp}
                        className="space-y-5"
                      >
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                          <div
                            className={`flex items-start gap-2 ${
                              isArabic ? "flex-row-reverse text-right" : ""
                            }`}
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                              {isArabic
                                ? `طھظ… ط¥ط±ط³ط§ظ„ ظƒظˆط¯ ط§ظ„طھط­ظ‚ظ‚ ط¥ظ„ظ‰ ${normalizedCustomerPhone}`
                                : `Verification code sent to ${normalizedCustomerPhone}`}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {content.otpLabel}
                          </label>

                          <div className="relative">
                            <LockKeyhole
                              className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${
                                isArabic ? "right-4" : "left-4"
                              }`}
                            />

                            <Input
                              required
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              dir="ltr"
                              placeholder={content.otpPlaceholder}
                              value={customerOtp}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                setCustomerOtp(value.slice(0, 8));
                                setOtpError(null);
                              }}
                              className={`h-12 rounded-2xl border-border/70 bg-muted/30 text-center text-lg tracking-[0.35em] shadow-sm ${
                                isArabic ? "pr-11" : "pl-11"
                              }`}
                            />
                          </div>
                        </div>

                        {otpError ? (
                          <div
                            className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 ${
                              isArabic ? "text-right" : "text-left"
                            }`}
                          >
                            {otpError}
                          </div>
                        ) : null}

                        <Button
                          type="submit"
                          disabled={otpLoading}
                          className="h-12 w-full rounded-2xl text-base font-semibold shadow-lg"
                        >
                          {otpLoading ? (
                            <span
                              className={`flex items-center justify-center gap-2 ${
                                isArabic ? "flex-row-reverse" : ""
                              }`}
                            >
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>{content.verifyOtpLoading}</span>
                            </span>
                          ) : (
                            <span
                              className={`flex items-center justify-center gap-2 ${
                                isArabic ? "flex-row-reverse" : ""
                              }`}
                            >
                              <ShieldCheck className="h-4 w-4" />
                              <span>{content.verifyOtp}</span>
                            </span>
                          )}
                        </Button>

                        <div
                          className={`grid gap-2 sm:grid-cols-2 ${
                            isArabic ? "sm:[direction:rtl]" : ""
                          }`}
                        >
                          <Button
                            type="button"
                            variant="outline"
                            disabled={otpLoading}
                            onClick={() => {
                              setCustomerStep("phone");
                              setCustomerOtp("");
                              setOtpError(null);
                            }}
                            className="h-11 rounded-2xl"
                          >
                            <span
                              className={`flex items-center justify-center gap-2 ${
                                isArabic ? "flex-row-reverse" : ""
                              }`}
                            >
                              <ArrowLeft
                                className={`h-4 w-4 ${
                                  isArabic ? "rotate-180" : ""
                                }`}
                              />
                              <span>{content.backToPhone}</span>
                            </span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            disabled={otpLoading}
                            onClick={() => void handleRequestCustomerOtp()}
                            className="h-11 rounded-2xl"
                          >
                            <span
                              className={`flex items-center justify-center gap-2 ${
                                isArabic ? "flex-row-reverse" : ""
                              }`}
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span>{content.resendOtp}</span>
                            </span>
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                <div className="mt-6 border-t border-border/60 pt-5">
                  <p
                    className={`text-xs leading-6 text-muted-foreground ${
                      isArabic ? "text-right" : "text-left"
                    }`}
                  >
                    {mode === "system"
                      ? isArabic
                        ? "ط¯ط®ظˆظ„ ط§ظ„ظ†ط¸ط§ظ… ظ…ط®طµطµ ظ„ظ„ط¥ط¯ط§ط±ط© ظˆط§ظ„ظ…ظˆط¸ظپظٹظ† ظˆط§ظ„ظ…ظ†ط¯ظˆط¨ظٹظ† ظˆظ…ط³طھط®ط¯ظ…ظٹ PrimeyAcc ط­ط³ط¨ ط§ظ„طµظ„ط§ط­ظٹط§طھ."
                        : "System access is for admins, staff, agents, and PrimeyAcc users based on permissions."
                      : isArabic
                        ? "ط¯ط®ظˆظ„ ط§ظ„ط¹ظ…ظٹظ„ ظ…ط®طµطµ ظ„ط­ط³ط§ط¨ط§طھ ط§ظ„ط¹ظ…ظ„ط§ط، ط¹ط¨ط± ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„ ظˆظƒظˆط¯ ط§ظ„طھط­ظ‚ظ‚ ط§ظ„ظ…ط±ط³ظ„ ط¹ظ„ظ‰ ظˆط§طھط³ط§ط¨."
                        : "Customer access is for customer accounts using phone number and WhatsApp verification code."}
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