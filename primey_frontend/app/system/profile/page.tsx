"use client";

/* ============================================================
   📂 primey_frontend/app/system/profile/page.tsx
   👤 Primey Care — Current Login Profile V2
   ------------------------------------------------------------
   ✅ ملف حساب الدخول الحالي فقط
   ✅ لا يغير بيانات Provider / Customer / Agent / Broker
   ✅ GET/POST /api/auth/profile/
   ✅ POST /api/auth/change-password/
   ✅ يعرض workspace / role / user_type / linked actor للقراءة
   ✅ يدعم entity / actor / linked_actor / actor_context من الباكند
   ✅ تعديل بيانات البروفايل فقط
   ✅ Same approved Primey Care pattern
   ✅ w-full space-y-4
   ✅ Web Print
   ✅ sonner
   ✅ RTL/LTR through primey-locale
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Pencil,
  Phone,
  Printer,
  RefreshCw,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type ProfileForm = {
  first_name: string;
  last_name: string;
  email: string;
  display_name: string;
  phone_number: string;
  whatsapp_number: string;
  alternate_email: string;
  preferred_language: Locale;
  timezone: string;
  bio: string;
  avatar_url: string;
};

type PasswordForm = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

type CurrentProfile = {
  authenticated: boolean;
  workspace: string;
  dashboard_path: string;
  redirect_to: string;
  home_path: string;

  role: string;
  user_type: string;
  entity_type: string;
  entity_id: number | null;
  actor_type: string;
  actor_id: number | null;
  actor_name: string;
  actor_code: string;

  company_id: number | null;
  provider_id: number | null;
  center_id: number | null;
  customer_id: number | null;
  agent_id: number | null;
  broker_id: number | null;

  permission_codes: string[];
  permissions: ApiRecord;
  profile_permissions: ApiRecord;

  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    is_active: boolean;
    is_staff: boolean;
    is_superuser: boolean;
    last_login: string | null;
    date_joined: string | null;
  };

  profile: {
    id: number;
    display_name: string;
    avatar_url: string;
    bio: string;
    phone_number: string;
    whatsapp_number: string;
    alternate_email: string;
    preferred_language: string;
    timezone: string;
    user_type: string;
    role: string;
    workspace: string;
    is_phone_verified: boolean;
    is_whatsapp_verified: boolean;
    is_email_verified: boolean;
    is_profile_completed: boolean;
    tags: string[];
    extra_data: ApiRecord;
    last_profile_update_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
};

type ProfileApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  authenticated?: unknown;
  workspace?: unknown;
  dashboard_path?: unknown;
  redirect_to?: unknown;
  home_path?: unknown;
  role?: unknown;
  user_type?: unknown;
  entity_type?: unknown;
  entity_id?: unknown;
  actor_type?: unknown;
  actor_id?: unknown;
  actor_name?: unknown;
  actor_code?: unknown;
  company_id?: unknown;
  provider_id?: unknown;
  center_id?: unknown;
  customer_id?: unknown;
  agent_id?: unknown;
  broker_id?: unknown;
  permission_codes?: unknown;
  permissions?: unknown;
  profile_permissions?: unknown;
  user?: unknown;
  profile?: unknown;
  entity?: unknown;
  actor?: unknown;
  linked_actor?: unknown;
  actor_context?: unknown;
  ignored_account_fields?: unknown;
};

type PasswordApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  session?: unknown;
};

const translations = {
  ar: {
    title: "ملفي الشخصي",
    subtitle:
      "إدارة بيانات حساب الدخول الحالي فقط. نوع الحساب والدور والكيان المرتبط تظهر للقراءة ولا يتم تعديل بياناتها التشغيلية من هنا.",
    refresh: "تحديث",
    print: "طباعة",
    edit: "تعديل البيانات",
    cancel: "إلغاء",
    save: "حفظ التعديلات",
    saving: "جاري الحفظ",
    backDashboard: "لوحة التحكم",
    copied: "تم النسخ",
    copy: "نسخ",

    overview: "نظرة عامة",
    account: "الحساب",
    editProfile: "تعديل الملف",
    security: "الأمان",
    permissions: "الصلاحيات",

    accountInfo: "بيانات حساب الدخول",
    profileInfo: "بيانات الملف الشخصي",
    contactInfo: "بيانات التواصل",
    actorInfo: "الكيان المرتبط",
    permissionsInfo: "الصلاحيات والدور",
    securityInfo: "تغيير كلمة المرور",

    username: "اسم المستخدم",
    email: "البريد الإلكتروني",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    fullName: "الاسم الكامل",
    displayName: "اسم العرض",
    phone: "الجوال",
    whatsapp: "واتساب",
    alternateEmail: "البريد البديل",
    preferredLanguage: "اللغة المفضلة",
    timezone: "المنطقة الزمنية",
    bio: "نبذة",
    avatarUrl: "رابط الصورة",

    status: "الحالة",
    active: "نشط",
    inactive: "غير نشط",
    staff: "إداري",
    superuser: "سوبر أدمن",
    normal: "عادي",

    workspace: "المساحة",
    role: "الدور",
    userType: "نوع الحساب",
    actor: "الكيان المرتبط",
    actorType: "نوع الكيان",
    actorId: "معرّف الكيان",
    actorName: "اسم الكيان",
    actorCode: "كود الكيان",
    dashboardPath: "مسار لوحة التحكم",

    system: "النظام",
    provider: "مقدم خدمة",
    center: "مركز",
    customer: "عميل",
    agent: "مندوب",
    broker: "وسيط",
    other: "أخرى",
    notLinked: "غير مرتبط",

    systemAdmin: "مدير النظام",
    providerAdmin: "مدير مقدم خدمة",
    customerUser: "مستخدم عميل",
    agentUser: "مستخدم مندوب",
    brokerUser: "مستخدم وسيط",
    accountant: "محاسب",
    support: "الدعم",
    viewer: "مشاهد",

    verified: "موثق",
    notVerified: "غير موثق",
    profileCompleted: "الملف مكتمل",
    lastLogin: "آخر دخول",
    dateJoined: "تاريخ الإنشاء",
    lastUpdated: "آخر تحديث",

    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور",
    changePassword: "تغيير كلمة المرور",
    passwordHint: "يتم تطبيق قواعد قوة كلمة المرور من Django.",
    passwordChanged: "تم تغيير كلمة المرور بنجاح.",
    currentPasswordRequired: "كلمة المرور الحالية مطلوبة.",
    newPasswordRequired: "كلمة المرور الجديدة مطلوبة.",
    confirmPasswordRequired: "تأكيد كلمة المرور مطلوب.",
    passwordMismatch: "كلمة المرور الجديدة وتأكيدها غير متطابقين.",
    passwordTooShort: "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.",

    invalidEmail: "صيغة البريد الإلكتروني غير صحيحة.",
    invalidAlternateEmail: "صيغة البريد البديل غير صحيحة.",
    saved: "تم حفظ بيانات الملف الشخصي.",
    errorTitle: "تعذر تحميل الملف الشخصي",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    operationFailed: "تعذر تنفيذ العملية.",
    readonlyNotice:
      "الربط التشغيلي يظهر للقراءة فقط. بيانات العميل أو مقدم الخدمة أو المندوب أو الوسيط تدار من صفحاتها.",
    noPermissions: "لا توجد صلاحيات ظاهرة.",
    printTitle: "تقرير الملف الشخصي",
    generatedAt: "تاريخ الطباعة",
    yes: "نعم",
    no: "لا",
    unknown: "غير محدد",
  },
  en: {
    title: "My Profile",
    subtitle:
      "Manage the current login account profile only. Account type, role, and linked actor are read-only here; operational data is managed from its own pages.",
    refresh: "Refresh",
    print: "Print",
    edit: "Edit profile",
    cancel: "Cancel",
    save: "Save changes",
    saving: "Saving",
    backDashboard: "Dashboard",
    copied: "Copied",
    copy: "Copy",

    overview: "Overview",
    account: "Account",
    editProfile: "Edit profile",
    security: "Security",
    permissions: "Permissions",

    accountInfo: "Login account data",
    profileInfo: "Profile data",
    contactInfo: "Contact data",
    actorInfo: "Linked actor",
    permissionsInfo: "Role & permissions",
    securityInfo: "Change password",

    username: "Username",
    email: "Email",
    firstName: "First name",
    lastName: "Last name",
    fullName: "Full name",
    displayName: "Display name",
    phone: "Phone",
    whatsapp: "WhatsApp",
    alternateEmail: "Alternate email",
    preferredLanguage: "Preferred language",
    timezone: "Timezone",
    bio: "Bio",
    avatarUrl: "Avatar URL",

    status: "Status",
    active: "Active",
    inactive: "Inactive",
    staff: "Staff",
    superuser: "Superuser",
    normal: "Normal",

    workspace: "Workspace",
    role: "Role",
    userType: "Account type",
    actor: "Linked actor",
    actorType: "Actor type",
    actorId: "Actor ID",
    actorName: "Actor name",
    actorCode: "Actor code",
    dashboardPath: "Dashboard path",

    system: "System",
    provider: "Provider",
    center: "Center",
    customer: "Customer",
    agent: "Agent",
    broker: "Broker",
    other: "Other",
    notLinked: "Not linked",

    systemAdmin: "System admin",
    providerAdmin: "Provider admin",
    customerUser: "Customer user",
    agentUser: "Agent user",
    brokerUser: "Broker user",
    accountant: "Accountant",
    support: "Support",
    viewer: "Viewer",

    verified: "Verified",
    notVerified: "Not verified",
    profileCompleted: "Profile completed",
    lastLogin: "Last login",
    dateJoined: "Created at",
    lastUpdated: "Last updated",

    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    changePassword: "Change password",
    passwordHint: "Django password strength rules are applied.",
    passwordChanged: "Password changed successfully.",
    currentPasswordRequired: "Current password is required.",
    newPasswordRequired: "New password is required.",
    confirmPasswordRequired: "Confirm password is required.",
    passwordMismatch: "New password and confirmation do not match.",
    passwordTooShort: "New password must be at least 8 characters.",

    invalidEmail: "Email format is invalid.",
    invalidAlternateEmail: "Alternate email format is invalid.",
    saved: "Profile data saved.",
    errorTitle: "Unable to load profile",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    operationFailed: "Unable to complete operation.",
    readonlyNotice:
      "Operational linking is read-only here. Customer, provider, agent, and broker data is managed from its own pages.",
    noPermissions: "No visible permissions.",
    printTitle: "Profile report",
    generatedAt: "Generated at",
    yes: "Yes",
    no: "No",
    unknown: "Unknown",
  },
} as const;

const EMPTY_PROFILE: CurrentProfile = {
  authenticated: false,
  workspace: "",
  dashboard_path: "/system",
  redirect_to: "/system",
  home_path: "/system",

  role: "",
  user_type: "",
  entity_type: "",
  entity_id: null,
  actor_type: "",
  actor_id: null,
  actor_name: "",
  actor_code: "",

  company_id: null,
  provider_id: null,
  center_id: null,
  customer_id: null,
  agent_id: null,
  broker_id: null,

  permission_codes: [],
  permissions: {},
  profile_permissions: {},

  user: {
    id: 0,
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    full_name: "",
    is_active: false,
    is_staff: false,
    is_superuser: false,
    last_login: null,
    date_joined: null,
  },

  profile: {
    id: 0,
    display_name: "",
    avatar_url: "",
    bio: "",
    phone_number: "",
    whatsapp_number: "",
    alternate_email: "",
    preferred_language: "ar",
    timezone: "Asia/Riyadh",
    user_type: "",
    role: "",
    workspace: "",
    is_phone_verified: false,
    is_whatsapp_verified: false,
    is_email_verified: false,
    is_profile_completed: false,
    tags: [],
    extra_data: {},
    last_profile_update_at: null,
    created_at: null,
    updated_at: null,
  },
};

const EMPTY_PASSWORD: PasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).trim();
  return cleaned || fallback;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    return ["1", "true", "yes", "on", "active", "نشط"].includes(value.toLowerCase());
  }

  return Boolean(value);
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toNullableNumber(value: unknown) {
  const parsed = toNumber(value, 0);
  return parsed > 0 ? parsed : null;
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => {
          if (!value) return [];

          if (typeof value === "string") return [value];

          if (Array.isArray(value)) {
            return value
              .map((item) => {
                if (typeof item === "string") return item;
                if (isRecord(item)) {
                  return normalizeText(
                    item.code || item.codename || item.permission || item.name,
                  );
                }
                return "";
              })
              .filter(Boolean);
          }

          if (isRecord(value)) {
            return Object.values(value)
              .flatMap((item) => {
                if (typeof item === "string") return [item];
                if (Array.isArray(item)) {
                  return item.map((entry) => normalizeText(entry)).filter(Boolean);
                }
                return [];
              })
              .filter(Boolean);
          }

          return [];
        })
        .map((item) => normalizeText(item))
        .filter(Boolean),
    ),
  );
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).replace("T", " ").slice(0, 16);
  }

  return parsed.toISOString().replace("T", " ").slice(0, 16);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          ""
        ).replace(/\/+$/, "")
      : "";

  if (envBase.endsWith("/api")) {
    return envBase.slice(0, -4);
  }

  return envBase;
}

function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
}

async function fetchJson<T>(
  url: string,
  options?: {
    signal?: AbortSignal;
    method?: "GET" | "POST";
    body?: unknown;
  },
): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    method: options?.method || "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal: options?.signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options?.method === "POST" ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method === "POST"
        ? JSON.stringify(options.body || {})
        : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let payload: any = null;

  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.detail ||
      payload?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

function getRecordName(record: ApiRecord) {
  return normalizeText(
    record.name ||
      record.full_name ||
      record.display_name ||
      record.company_name ||
      record.title ||
      record.provider_name ||
      record.customer_name ||
      record.agent_name ||
      record.broker_name,
  );
}

function getRecordCode(record: ApiRecord) {
  return normalizeText(
    record.code ||
      record.agent_code ||
      record.broker_code ||
      record.customer_code ||
      record.provider_code ||
      record.referral_code ||
      record.external_reference,
  );
}

function normalizeCurrentProfile(payload: ProfileApiResponse): CurrentProfile {
  const data = asRecord(payload.data);

  const user = asRecord(payload.user || data.user);
  const profile = asRecord(payload.profile || data.profile);
  const permissions = asRecord(payload.permissions || data.permissions);
  const profilePermissions = asRecord(
    payload.profile_permissions || data.profile_permissions,
  );

  const entityRecord = asRecord(
    payload.entity ||
      data.entity ||
      payload.actor ||
      data.actor ||
      payload.linked_actor ||
      data.linked_actor ||
      payload.actor_context ||
      data.actor_context,
  );

  const rawCodes = uniqueStrings([
    payload.permission_codes,
    data.permission_codes,
    permissions.codes,
    permissions.permission_codes,
    profilePermissions.codes,
    profilePermissions.permission_codes,
  ]);

  const extraData = asRecord(profile.extra_data);

  const role = normalizeText(payload.role || data.role || profile.role);
  const userType = normalizeText(payload.user_type || data.user_type || profile.user_type);
  const workspace = normalizeText(
    payload.workspace || data.workspace || profile.workspace || extraData.workspace,
    "system",
  );

  const entityType = normalizeText(
    payload.entity_type ||
      data.entity_type ||
      entityRecord.entity_type ||
      entityRecord.type ||
      payload.actor_type ||
      data.actor_type ||
      extraData.entity_type ||
      extraData.actor_type,
  ).toLowerCase();

  const entityId = toNullableNumber(
    payload.entity_id ||
      data.entity_id ||
      entityRecord.entity_id ||
      entityRecord.id ||
      payload.actor_id ||
      data.actor_id ||
      extraData.entity_id ||
      extraData.actor_id,
  );

  const actorName = normalizeText(
    payload.actor_name ||
      data.actor_name ||
      entityRecord.actor_name ||
      getRecordName(entityRecord),
  );

  const actorCode = normalizeText(
    payload.actor_code ||
      data.actor_code ||
      entityRecord.actor_code ||
      getRecordCode(entityRecord),
  );

  const tags = asArray(profile.tags).map((tag) => normalizeText(tag)).filter(Boolean);

  return {
    authenticated: toBoolean(payload.authenticated ?? data.authenticated ?? true),
    workspace,
    dashboard_path: normalizeText(
      payload.dashboard_path || data.dashboard_path || "/system",
      "/system",
    ),
    redirect_to: normalizeText(
      payload.redirect_to ||
        data.redirect_to ||
        payload.dashboard_path ||
        data.dashboard_path ||
        "/system",
      "/system",
    ),
    home_path: normalizeText(
      payload.home_path ||
        data.home_path ||
        payload.dashboard_path ||
        data.dashboard_path ||
        "/system",
      "/system",
    ),

    role,
    user_type: userType,
    entity_type: entityType,
    entity_id: entityId,
    actor_type: normalizeText(payload.actor_type || data.actor_type || entityType).toLowerCase(),
    actor_id: toNullableNumber(payload.actor_id || data.actor_id || entityId),
    actor_name: actorName,
    actor_code: actorCode,

    company_id: toNullableNumber(payload.company_id || data.company_id || extraData.company_id),
    provider_id: toNullableNumber(payload.provider_id || data.provider_id || extraData.provider_id),
    center_id: toNullableNumber(payload.center_id || data.center_id || extraData.center_id),
    customer_id: toNullableNumber(payload.customer_id || data.customer_id || extraData.customer_id),
    agent_id: toNullableNumber(payload.agent_id || data.agent_id || extraData.agent_id),
    broker_id: toNullableNumber(payload.broker_id || data.broker_id || extraData.broker_id),

    permission_codes: rawCodes,
    permissions,
    profile_permissions: profilePermissions,

    user: {
      id: toNumber(user.id),
      username: normalizeText(user.username),
      email: normalizeText(user.email),
      first_name: normalizeText(user.first_name),
      last_name: normalizeText(user.last_name),
      full_name: normalizeText(user.full_name),
      is_active: toBoolean(user.is_active),
      is_staff: toBoolean(user.is_staff),
      is_superuser: toBoolean(user.is_superuser),
      last_login: normalizeText(user.last_login) || null,
      date_joined: normalizeText(user.date_joined) || null,
    },

    profile: {
      id: toNumber(profile.id),
      display_name: normalizeText(profile.display_name),
      avatar_url: normalizeText(profile.avatar_url),
      bio: normalizeText(profile.bio),
      phone_number: normalizeText(profile.phone_number),
      whatsapp_number: normalizeText(profile.whatsapp_number),
      alternate_email: normalizeText(profile.alternate_email),
      preferred_language: normalizeText(profile.preferred_language || "ar"),
      timezone: normalizeText(profile.timezone || "Asia/Riyadh"),
      user_type: normalizeText(profile.user_type || userType),
      role: normalizeText(profile.role || role),
      workspace: normalizeText(profile.workspace || workspace),
      is_phone_verified: toBoolean(profile.is_phone_verified),
      is_whatsapp_verified: toBoolean(profile.is_whatsapp_verified),
      is_email_verified: toBoolean(profile.is_email_verified),
      is_profile_completed: toBoolean(profile.is_profile_completed),
      tags,
      extra_data: extraData,
      last_profile_update_at: normalizeText(profile.last_profile_update_at) || null,
      created_at: normalizeText(profile.created_at) || null,
      updated_at: normalizeText(profile.updated_at) || null,
    },
  };
}

function profileToForm(profile: CurrentProfile): ProfileForm {
  return {
    first_name: profile.user.first_name,
    last_name: profile.user.last_name,
    email: profile.user.email,
    display_name:
      profile.profile.display_name ||
      profile.user.full_name ||
      profile.user.username ||
      profile.user.email,
    phone_number: profile.profile.phone_number,
    whatsapp_number: profile.profile.whatsapp_number,
    alternate_email: profile.profile.alternate_email,
    preferred_language: profile.profile.preferred_language === "en" ? "en" : "ar",
    timezone: profile.profile.timezone || "Asia/Riyadh",
    bio: profile.profile.bio,
    avatar_url: profile.profile.avatar_url,
  };
}

function getDisplayName(profile: CurrentProfile) {
  return (
    profile.profile.display_name ||
    profile.user.full_name ||
    [profile.user.first_name, profile.user.last_name].filter(Boolean).join(" ") ||
    profile.user.username ||
    profile.user.email ||
    `#${profile.user.id}`
  );
}

function getWorkspaceLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "system") return t.system;
  if (normalized === "provider") return t.provider;
  if (normalized === "center") return t.center;
  if (normalized === "customer") return t.customer;
  if (normalized === "agent") return t.agent;
  if (normalized === "broker") return t.broker;

  return normalized || t.unknown;
}

function getRoleLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "system_admin" || normalized === "admin" || normalized === "super_admin") return t.systemAdmin;
  if (normalized === "provider_admin" || normalized === "center_admin") return t.providerAdmin;
  if (normalized === "customer_user" || normalized === "customer") return t.customerUser;
  if (normalized === "agent_user" || normalized === "agent") return t.agentUser;
  if (normalized === "broker_user" || normalized === "broker") return t.brokerUser;
  if (normalized === "accountant" || normalized === "finance") return t.accountant;
  if (normalized === "support") return t.support;
  if (normalized === "viewer") return t.viewer;

  return normalized || t.unknown;
}

function getUserTypeLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(value).toUpperCase();

  if (normalized === "SUPER_ADMIN") return t.superuser;
  if (normalized === "SYSTEM") return t.system;
  if (normalized === "STAFF") return t.support;
  if (normalized === "ACCOUNTANT") return t.accountant;
  if (normalized === "PROVIDER") return t.provider;
  if (normalized === "CENTER") return t.center;
  if (normalized === "CUSTOMER") return t.customer;
  if (normalized === "AGENT") return t.agent;
  if (normalized === "BROKER") return t.broker;
  if (normalized === "OTHER") return t.other;

  return normalized || t.unknown;
}

function getActorType(profile: CurrentProfile) {
  if (profile.provider_id) return "provider";
  if (profile.center_id) return "center";
  if (profile.customer_id) return "customer";
  if (profile.agent_id) return "agent";
  if (profile.broker_id) return "broker";
  if (profile.entity_type) return profile.entity_type;
  if (profile.actor_type) return profile.actor_type;
  return "system";
}

function getActorId(profile: CurrentProfile) {
  return (
    profile.provider_id ||
    profile.center_id ||
    profile.customer_id ||
    profile.agent_id ||
    profile.broker_id ||
    profile.entity_id ||
    profile.actor_id ||
    null
  );
}

function getActorTypeLabel(actorType: string, locale: Locale) {
  const t = translations[locale];

  if (actorType === "provider") return t.provider;
  if (actorType === "center") return t.center;
  if (actorType === "customer") return t.customer;
  if (actorType === "agent") return t.agent;
  if (actorType === "broker") return t.broker;
  if (actorType === "system") return t.system;

  return actorType || t.notLinked;
}

function getActorLabel(profile: CurrentProfile, locale: Locale) {
  const actorType = getActorType(profile);
  const actorId = getActorId(profile);
  const actorName = normalizeText(profile.actor_name);
  const actorCode = normalizeText(profile.actor_code);
  const label = getActorTypeLabel(actorType, locale);

  if (actorName && actorCode) return `${label}: ${actorName} · ${actorCode}`;
  if (actorName) return `${label}: ${actorName}`;
  if (actorCode) return `${label}: ${actorCode}`;
  if (actorType === "system") return label;
  if (actorId) return `${label} #${actorId}`;

  return label || translations[locale].notLinked;
}

function getActorHref(profile: CurrentProfile) {
  const actorType = getActorType(profile);
  const actorId = getActorId(profile);

  if (!actorId) return "";

  if (actorType === "provider") return `/system/providers/${actorId}`;
  if (actorType === "center") return `/system/centers/${actorId}`;
  if (actorType === "customer") return `/system/customers/${actorId}`;
  if (actorType === "agent") return `/system/agents/${actorId}`;
  if (actorType === "broker") return `/system/brokers/${actorId}`;

  return "";
}

function getActorBadgeClass(profile: CurrentProfile) {
  const actorType = getActorType(profile);

  if (actorType === "provider" || actorType === "center") {
    return "border-violet-500/30 bg-violet-50 text-violet-700";
  }

  if (actorType === "customer") {
    return "border-blue-500/30 bg-blue-50 text-blue-700";
  }

  if (actorType === "agent") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700";
  }

  if (actorType === "broker") {
    return "border-amber-500/30 bg-amber-50 text-amber-700";
  }

  return "border-slate-500/30 bg-slate-50 text-slate-700";
}

function getStatusClass(isActive: boolean) {
  if (isActive) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
}

function buildProfilePayload(form: ProfileForm) {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim().toLowerCase(),
    display_name: form.display_name.trim(),
    phone_number: form.phone_number.trim(),
    whatsapp_number: form.whatsapp_number.trim(),
    alternate_email: form.alternate_email.trim().toLowerCase(),
    preferred_language: form.preferred_language,
    timezone: form.timezone.trim() || "Asia/Riyadh",
    bio: form.bio.trim(),
    avatar_url: form.avatar_url.trim(),
  };
}

function StatusBadge({
  active,
  locale,
}: {
  active: boolean;
  locale: Locale;
}) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        getStatusClass(active),
      )}
    >
      {active ? t.active : t.inactive}
    </Badge>
  );
}

function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[112px] px-6 py-5">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>

        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground">
          {value}
        </CardTitle>

        <CardAction>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardAction>

        <div className="pt-1">
          <Badge
            variant="outline"
            className="max-w-full rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            <span className="truncate">{trend}</span>
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-left text-sm font-medium text-foreground">
        {children || value || "—"}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function LoadingState() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-3">
            <Skeleton className="h-16 w-16 rounded-lg" />
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="rounded-lg border bg-card shadow-none">
                <CardHeader className="min-h-[112px] px-6 py-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-5 w-20" />
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SystemProfilePage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [profile, setProfile] = React.useState<CurrentProfile>(EMPTY_PROFILE);
  const [form, setForm] = React.useState<ProfileForm>(profileToForm(EMPTY_PROFILE));
  const [passwordForm, setPasswordForm] = React.useState<PasswordForm>(EMPTY_PASSWORD);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [changingPassword, setChangingPassword] = React.useState(false);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  React.useEffect(() => {
    const applyLocale = () => {
      const nextLocale = getInitialLocale();

      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
      document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
    };

    applyLocale();

    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  const loadProfile = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const payload = await fetchJson<ProfileApiResponse>(
          makeApiUrl("/api/auth/profile/"),
          { signal: controller.signal },
        );

        const normalized = normalizeCurrentProfile(payload);

        setProfile(normalized);
        setForm(profileToForm(normalized));
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [t.errorDesc],
  );

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function updateForm<T extends keyof ProfileForm>(key: T, value: ProfileForm[T]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updatePasswordForm<T extends keyof PasswordForm>(key: T, value: PasswordForm[T]) {
    setPasswordForm((current) => ({ ...current, [key]: value }));
  }

  function cancelEdit() {
    setForm(profileToForm(profile));
    setEditing(false);
  }

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.operationFailed);
    }
  }

  function validateProfileForm() {
    if (form.email.trim() && !isValidEmail(form.email)) {
      toast.error(t.invalidEmail);
      return false;
    }

    if (form.alternate_email.trim() && !isValidEmail(form.alternate_email)) {
      toast.error(t.invalidAlternateEmail);
      return false;
    }

    return true;
  }

  async function saveProfile() {
    if (!validateProfileForm()) return;

    setSaving(true);
    setError("");

    try {
      const payload = await fetchJson<ProfileApiResponse>(
        makeApiUrl("/api/auth/profile/"),
        {
          method: "POST",
          body: buildProfilePayload(form),
        },
      );

      const normalized = normalizeCurrentProfile(payload);

      setProfile(normalized);
      setForm(profileToForm(normalized));
      setEditing(false);
      toast.success(t.saved);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function validatePasswordForm() {
    if (!passwordForm.current_password.trim()) {
      toast.error(t.currentPasswordRequired);
      return false;
    }

    if (!passwordForm.new_password.trim()) {
      toast.error(t.newPasswordRequired);
      return false;
    }

    if (!passwordForm.confirm_password.trim()) {
      toast.error(t.confirmPasswordRequired);
      return false;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error(t.passwordMismatch);
      return false;
    }

    if (passwordForm.new_password.trim().length < 8) {
      toast.error(t.passwordTooShort);
      return false;
    }

    return true;
  }

  async function changePassword() {
    if (!validatePasswordForm()) return;

    setChangingPassword(true);

    try {
      await fetchJson<PasswordApiResponse>(makeApiUrl("/api/auth/change-password/"), {
        method: "POST",
        body: {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
          confirm_password: passwordForm.confirm_password,
        },
      });

      setPasswordForm(EMPTY_PASSWORD);
      toast.success(t.passwordChanged);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;

      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  }

  function printPage() {
    const displayName = getDisplayName(profile);
    const actorLabel = getActorLabel(profile, locale);
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.operationFailed);
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)} - ${escapeHtml(displayName)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 28px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            h1 { margin: 0; font-size: 22px; }
            h2 { margin: 18px 0 8px; font-size: 16px; }
            p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 10px;
              margin-bottom: 18px;
            }
            .box {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 10px;
            }
            .box span {
              display: block;
              color: #6b7280;
              font-size: 11px;
              margin-bottom: 4px;
            }
            .box strong { font-size: 16px; }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              margin-bottom: 16px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px;
              text-align: ${locale === "ar" ? "right" : "left"};
              vertical-align: top;
            }
            th {
              background: #f9fafb;
              color: #374151;
              font-weight: 700;
            }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Primey Care - ${escapeHtml(t.printTitle)}</h1>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.username)}: <strong>${escapeHtml(profile.user.username || "—")}</strong></p>
              <p>${escapeHtml(t.status)}: ${escapeHtml(profile.user.is_active ? t.active : t.inactive)}</p>
              <p>${escapeHtml(t.role)}: ${escapeHtml(getRoleLabel(profile.role, locale))}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.workspace)}</span><strong>${escapeHtml(getWorkspaceLabel(profile.workspace, locale))}</strong></div>
            <div class="box"><span>${escapeHtml(t.userType)}</span><strong>${escapeHtml(getUserTypeLabel(profile.user_type, locale))}</strong></div>
            <div class="box"><span>${escapeHtml(t.role)}</span><strong>${escapeHtml(getRoleLabel(profile.role, locale))}</strong></div>
            <div class="box"><span>${escapeHtml(t.actor)}</span><strong>${escapeHtml(actorLabel)}</strong></div>
          </div>

          <h2>${escapeHtml(t.accountInfo)}</h2>
          <table>
            <tbody>
              <tr><th>${escapeHtml(t.displayName)}</th><td>${escapeHtml(displayName)}</td></tr>
              <tr><th>${escapeHtml(t.fullName)}</th><td>${escapeHtml(profile.user.full_name || "—")}</td></tr>
              <tr><th>${escapeHtml(t.username)}</th><td>${escapeHtml(profile.user.username || "—")}</td></tr>
              <tr><th>${escapeHtml(t.email)}</th><td>${escapeHtml(profile.user.email || "—")}</td></tr>
              <tr><th>${escapeHtml(t.phone)}</th><td>${escapeHtml(profile.profile.phone_number || "—")}</td></tr>
              <tr><th>${escapeHtml(t.whatsapp)}</th><td>${escapeHtml(profile.profile.whatsapp_number || "—")}</td></tr>
              <tr><th>${escapeHtml(t.workspace)}</th><td>${escapeHtml(getWorkspaceLabel(profile.workspace, locale))}</td></tr>
              <tr><th>${escapeHtml(t.actor)}</th><td>${escapeHtml(actorLabel)}</td></tr>
              <tr><th>${escapeHtml(t.actorName)}</th><td>${escapeHtml(profile.actor_name || "—")}</td></tr>
              <tr><th>${escapeHtml(t.actorCode)}</th><td>${escapeHtml(profile.actor_code || "—")}</td></tr>
              <tr><th>${escapeHtml(t.lastLogin)}</th><td>${escapeHtml(formatDateTime(profile.user.last_login))}</td></tr>
              <tr><th>${escapeHtml(t.dateJoined)}</th><td>${escapeHtml(formatDate(profile.user.date_joined))}</td></tr>
            </tbody>
          </table>

          <h2>${escapeHtml(t.permissionsInfo)}</h2>
          <table>
            <tbody>
              <tr><th>${escapeHtml(t.role)}</th><td>${escapeHtml(getRoleLabel(profile.role, locale))}</td></tr>
              <tr><th>${escapeHtml(t.userType)}</th><td>${escapeHtml(getUserTypeLabel(profile.user_type, locale))}</td></tr>
              <tr><th>${escapeHtml(t.permissions)}</th><td>${escapeHtml(profile.permission_codes.join(", ") || "—")}</td></tr>
            </tbody>
          </table>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  const displayName = getDisplayName(profile);
  const initials = displayName.slice(0, 2).toUpperCase();
  const actorHref = getActorHref(profile);
  const actorLabel = getActorLabel(profile, locale);
  const actorType = getActorType(profile);
  const actorId = getActorId(profile);

  if (loading) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <LoadingState />
      </div>
    );
  }

  if (error && !profile.user.id) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 text-right">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>

        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-red-200 bg-white">
              <TriangleAlert className="h-6 w-6 text-red-600" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-red-900">{t.errorTitle}</p>
              <p className="text-sm text-red-700">{error || t.errorDesc}</p>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadProfile()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-right">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t.title}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href={profile.dashboard_path || "/system"}>
              <BackIcon className="h-4 w-4" />
              {t.backDashboard}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadProfile({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          {editing ? (
            <>
              <Button
                variant="outline"
                className="h-9 rounded-lg"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X className="h-4 w-4" />
                {t.cancel}
              </Button>

              <Button
                className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
                disabled={saving}
                onClick={() => void saveProfile()}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? t.saving : t.save}
              </Button>
            </>
          ) : (
            <Button
              className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-4 w-4" />
              {t.edit}
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-4 text-right">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">{t.errorTitle}</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-4 px-6 py-5">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
              {profile.profile.avatar_url ? (
                <img
                  src={profile.profile.avatar_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">
                  {initials}
                </span>
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate text-xl font-bold">
                {displayName}
              </CardTitle>
              <CardDescription className="truncate">
                {profile.user.username || profile.user.email || `#${profile.user.id}`}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge active={profile.user.is_active} locale={locale} />

              <Badge
                variant="outline"
                className="rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium"
              >
                {getWorkspaceLabel(profile.workspace, locale)}
              </Badge>

              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  getActorBadgeClass(profile),
                )}
              >
                {actorLabel}
              </Badge>

              {profile.user.is_superuser ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-violet-500/30 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700"
                >
                  {t.superuser}
                </Badge>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-2 px-6 pb-6">
            <InfoRow label={t.role} value={getRoleLabel(profile.role, locale)} />
            <InfoRow label={t.userType} value={getUserTypeLabel(profile.user_type, locale)} />
            <InfoRow label={t.workspace} value={getWorkspaceLabel(profile.workspace, locale)} />
            <InfoRow label={t.actor} value={actorLabel} />
            <InfoRow label={t.email} value={profile.user.email || "—"} />
            <InfoRow label={t.phone} value={profile.profile.phone_number || "—"} />
            <InfoRow label={t.whatsapp} value={profile.profile.whatsapp_number || "—"} />
            <InfoRow
              label={t.profileCompleted}
              value={profile.profile.is_profile_completed ? t.yes : t.no}
            />
            <InfoRow label={t.lastLogin} value={formatDateTime(profile.user.last_login)} />

            <div className="grid gap-2 pt-3">
              {actorHref ? (
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href={actorHref}>
                    <Building2 className="h-4 w-4" />
                    {t.actor}
                  </Link>
                </Button>
              ) : null}

              <Button
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => void copyValue(profile.user.username)}
              >
                <Copy className="h-4 w-4" />
                {t.copy} {t.username}
              </Button>

              {profile.user.email ? (
                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={() => void copyValue(profile.user.email)}
                >
                  <Mail className="h-4 w-4" />
                  {t.copy} {t.email}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={t.status}
              value={profile.user.is_active ? t.active : t.inactive}
              trend={profile.profile.is_profile_completed ? t.profileCompleted : t.notVerified}
              icon={CheckCircle2}
            />

            <KpiCard
              title={t.workspace}
              value={getWorkspaceLabel(profile.workspace, locale)}
              trend={profile.dashboard_path || "/system"}
              icon={Building2}
            />

            <KpiCard
              title={t.role}
              value={getRoleLabel(profile.role, locale)}
              trend={getUserTypeLabel(profile.user_type, locale)}
              icon={ShieldCheck}
            />

            <KpiCard
              title={t.permissions}
              value={formatInteger(profile.permission_codes.length)}
              trend={t.permissions}
              icon={BadgeCheck}
            />
          </div>

          <Card className="rounded-lg border border-amber-200 bg-amber-50 shadow-none">
            <CardContent className="flex items-start gap-3 p-4 text-right">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">{t.readonlyNotice}</p>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="space-y-4">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardContent className="p-4">
                <TabsList className="h-auto flex-wrap justify-start rounded-lg bg-muted/40 p-1">
                  <TabsTrigger value="overview" className="rounded-md">
                    <Eye className="h-4 w-4" />
                    {t.overview}
                  </TabsTrigger>

                  <TabsTrigger value="account" className="rounded-md">
                    <UserCog className="h-4 w-4" />
                    {t.account}
                  </TabsTrigger>

                  <TabsTrigger value="edit" className="rounded-md">
                    <Pencil className="h-4 w-4" />
                    {t.editProfile}
                  </TabsTrigger>

                  <TabsTrigger value="security" className="rounded-md">
                    <LockKeyhole className="h-4 w-4" />
                    {t.security}
                  </TabsTrigger>

                  <TabsTrigger value="permissions" className="rounded-md">
                    <ShieldCheck className="h-4 w-4" />
                    {t.permissions}
                  </TabsTrigger>
                </TabsList>
              </CardContent>
            </Card>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.accountInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.displayName} value={displayName} />
                    <InfoRow label={t.fullName} value={profile.user.full_name || "—"} />
                    <InfoRow label={t.username}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{profile.user.username || "—"}</span>
                        {profile.user.username ? (
                          <button
                            type="button"
                            onClick={() => void copyValue(profile.user.username)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </InfoRow>
                    <InfoRow label={t.email} value={profile.user.email || "—"} />
                    <InfoRow label={t.status}>
                      <StatusBadge active={profile.user.is_active} locale={locale} />
                    </InfoRow>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.contactInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.phone} value={profile.profile.phone_number || "—"} />
                    <InfoRow label={t.whatsapp} value={profile.profile.whatsapp_number || "—"} />
                    <InfoRow label={t.alternateEmail} value={profile.profile.alternate_email || "—"} />
                    <InfoRow label={t.preferredLanguage} value={profile.profile.preferred_language || "—"} />
                    <InfoRow label={t.timezone} value={profile.profile.timezone || "—"} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.actorInfo}</CardTitle>
                    <CardDescription>{t.readonlyNotice}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.actor} value={actorLabel} />
                    <InfoRow label={t.actorType} value={actorType || "—"} />
                    <InfoRow label={t.actorId} value={actorId ? `#${actorId}` : "—"} />
                    <InfoRow label={t.actorName} value={profile.actor_name || "—"} />
                    <InfoRow label={t.actorCode} value={profile.actor_code || "—"} />
                    <InfoRow label={t.workspace} value={getWorkspaceLabel(profile.workspace, locale)} />
                    <InfoRow label={t.dashboardPath} value={profile.dashboard_path || "—"} />

                    <div className="pt-3">
                      {actorHref ? (
                        <Button asChild variant="outline" className="h-9 rounded-lg">
                          <Link href={actorHref}>
                            <Building2 className="h-4 w-4" />
                            {t.actor}
                          </Link>
                        </Button>
                      ) : (
                        <Badge variant="outline" className="rounded-full bg-muted/40 px-2.5 py-1 text-xs">
                          {t.notLinked}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.profileInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.profileCompleted} value={profile.profile.is_profile_completed ? t.yes : t.no} />
                    <InfoRow label={t.verified} value={profile.profile.is_email_verified ? t.verified : t.notVerified} />
                    <InfoRow label={t.lastLogin} value={formatDateTime(profile.user.last_login)} />
                    <InfoRow label={t.dateJoined} value={formatDate(profile.user.date_joined)} />
                    <InfoRow label={t.lastUpdated} value={formatDateTime(profile.profile.last_profile_update_at || profile.profile.updated_at)} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none xl:col-span-2">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.bio}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <div className="min-h-[120px] rounded-lg border bg-background p-4">
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {profile.profile.bio || "—"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="account" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.accountInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.status} value={profile.user.is_active ? t.active : t.inactive} />
                    <InfoRow label={t.staff} value={profile.user.is_staff ? t.yes : t.no} />
                    <InfoRow label={t.superuser} value={profile.user.is_superuser ? t.yes : t.no} />
                    <InfoRow label={t.dateJoined} value={formatDate(profile.user.date_joined)} />
                    <InfoRow label={t.lastLogin} value={formatDateTime(profile.user.last_login)} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.permissionsInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.userType} value={getUserTypeLabel(profile.user_type, locale)} />
                    <InfoRow label={t.role} value={getRoleLabel(profile.role, locale)} />
                    <InfoRow label={t.workspace} value={getWorkspaceLabel(profile.workspace, locale)} />
                    <InfoRow label={t.dashboardPath} value={profile.dashboard_path || "—"} />
                    <InfoRow label={t.permissions} value={formatInteger(profile.permission_codes.length)} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="edit" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="text-base">{t.editProfile}</CardTitle>
                      <CardDescription>{displayName}</CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {editing ? (
                        <>
                          <Button
                            variant="outline"
                            className="h-9 rounded-lg"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            <X className="h-4 w-4" />
                            {t.cancel}
                          </Button>

                          <Button
                            className="h-9 rounded-lg bg-black text-white hover:bg-black/90"
                            disabled={saving}
                            onClick={() => void saveProfile()}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {saving ? t.saving : t.save}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          className="h-9 rounded-lg"
                          onClick={() => setEditing(true)}
                        >
                          <Pencil className="h-4 w-4" />
                          {t.edit}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 px-5 pb-5">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {t.actorInfo}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t.readonlyNotice}
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit rounded-full px-2.5 py-1 text-xs font-medium",
                          getActorBadgeClass(profile),
                        )}
                      >
                        {actorLabel}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <FieldLabel>{t.firstName}</FieldLabel>
                      <Input
                        value={form.first_name}
                        onChange={(event) => updateForm("first_name", event.target.value)}
                        disabled={!editing || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.lastName}</FieldLabel>
                      <Input
                        value={form.last_name}
                        onChange={(event) => updateForm("last_name", event.target.value)}
                        disabled={!editing || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <FieldLabel>{t.displayName}</FieldLabel>
                      <Input
                        value={form.display_name}
                        onChange={(event) => updateForm("display_name", event.target.value)}
                        disabled={!editing || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <FieldLabel>{t.email}</FieldLabel>
                      <Input
                        value={form.email}
                        onChange={(event) => updateForm("email", event.target.value)}
                        disabled={!editing || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.phone}</FieldLabel>
                      <Input
                        value={form.phone_number}
                        onChange={(event) => updateForm("phone_number", event.target.value)}
                        disabled={!editing || saving}
                        className="h-10 rounded-lg bg-background text-right tabular-nums"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.whatsapp}</FieldLabel>
                      <Input
                        value={form.whatsapp_number}
                        onChange={(event) => updateForm("whatsapp_number", event.target.value)}
                        disabled={!editing || saving}
                        className="h-10 rounded-lg bg-background text-right tabular-nums"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <FieldLabel>{t.alternateEmail}</FieldLabel>
                      <Input
                        value={form.alternate_email}
                        onChange={(event) => updateForm("alternate_email", event.target.value)}
                        disabled={!editing || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.preferredLanguage}</FieldLabel>
                      <Select
                        value={form.preferred_language}
                        disabled={!editing || saving}
                        onValueChange={(value) => updateForm("preferred_language", value as Locale)}
                      >
                        <SelectTrigger className="h-10 rounded-lg bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ar">العربية</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.timezone}</FieldLabel>
                      <Input
                        value={form.timezone}
                        onChange={(event) => updateForm("timezone", event.target.value)}
                        disabled={!editing || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <FieldLabel>{t.avatarUrl}</FieldLabel>
                      <Input
                        value={form.avatar_url}
                        onChange={(event) => updateForm("avatar_url", event.target.value)}
                        disabled={!editing || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2 xl:col-span-4">
                      <FieldLabel>{t.bio}</FieldLabel>
                      <textarea
                        value={form.bio}
                        onChange={(event) => updateForm("bio", event.target.value)}
                        disabled={!editing || saving}
                        className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.securityInfo}</CardTitle>
                    <CardDescription>{t.passwordHint}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 px-5 pb-5">
                    <div className="space-y-2">
                      <FieldLabel>{t.currentPassword}</FieldLabel>
                      <Input
                        type="password"
                        value={passwordForm.current_password}
                        onChange={(event) =>
                          updatePasswordForm("current_password", event.target.value)
                        }
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.newPassword}</FieldLabel>
                      <Input
                        type="password"
                        value={passwordForm.new_password}
                        onChange={(event) =>
                          updatePasswordForm("new_password", event.target.value)
                        }
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.confirmPassword}</FieldLabel>
                      <Input
                        type="password"
                        value={passwordForm.confirm_password}
                        onChange={(event) =>
                          updatePasswordForm("confirm_password", event.target.value)
                        }
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <Button
                      className="h-10 rounded-lg bg-black text-white hover:bg-black/90"
                      disabled={changingPassword}
                      onClick={() => void changePassword()}
                    >
                      {changingPassword ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                      {t.changePassword}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.accountInfo}</CardTitle>
                  </CardHeader>

                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.username} value={profile.user.username || "—"} />
                    <InfoRow label={t.email} value={profile.user.email || "—"} />
                    <InfoRow label={t.lastLogin} value={formatDateTime(profile.user.last_login)} />
                    <InfoRow label={t.status} value={profile.user.is_active ? t.active : t.inactive} />
                    <InfoRow label={t.staff} value={profile.user.is_staff ? t.yes : t.no} />
                    <InfoRow label={t.superuser} value={profile.user.is_superuser ? t.yes : t.no} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.permissionsInfo}</CardTitle>
                  </CardHeader>

                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.userType} value={getUserTypeLabel(profile.user_type, locale)} />
                    <InfoRow label={t.role} value={getRoleLabel(profile.role, locale)} />
                    <InfoRow label={t.workspace} value={getWorkspaceLabel(profile.workspace, locale)} />
                    <InfoRow label={t.dashboardPath} value={profile.dashboard_path || "—"} />
                    <InfoRow label={t.actor} value={actorLabel} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.permissions}</CardTitle>
                    <CardDescription>
                      {formatInteger(profile.permission_codes.length)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-5 pb-5">
                    {profile.permission_codes.length ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.permission_codes.map((permission) => (
                          <Badge
                            key={permission}
                            variant="outline"
                            className="rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium"
                          >
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="flex min-h-[120px] items-center justify-center rounded-lg border bg-background p-4 text-center text-sm text-muted-foreground">
                        {t.noPermissions}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}