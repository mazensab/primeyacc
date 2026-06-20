"use client";

/* ============================================================
   📂 primey_frontend/app/system/users/[id]/page.tsx
   👤 Primey Care — Login Account Details V2
   ------------------------------------------------------------
   ✅ إدارة حساب الدخول فقط
   ✅ لا تكرر بيانات العميل / مقدم الخدمة / المركز / المندوب / الوسيط
   ✅ تعرض الكيان المرتبط للقراءة فقط
   ✅ يدعم entity / actor / linked_actor / actor_context من الباكند
   ✅ Same approved Products / Customers / Agents detail pattern
   ✅ Real API only: GET/PATCH /api/users/{id}/
   ✅ Actions: activate / deactivate / send password link
   ✅ Inline edit without separate edit page
   ✅ Internal UI components only
   ✅ No localhost
   ✅ No fake data
   ✅ Web print
   ✅ sonner toast
   ✅ RTL/LTR via primey-locale
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  MoreHorizontal,
  Pencil,
  Printer,
  RefreshCw,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  Users,
  X,
  XCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type UserStatus = "ACTIVE" | "INACTIVE";

type UserType =
  | "SUPER_ADMIN"
  | "SYSTEM"
  | "STAFF"
  | "ACCOUNTANT"
  | "PROVIDER"
  | "CENTER"
  | "CUSTOMER"
  | "AGENT"
  | "BROKER"
  | "OTHER";

type UserRole =
  | "system_admin"
  | "provider_admin"
  | "customer_user"
  | "agent_user"
  | "broker_user"
  | "accountant"
  | "support"
  | "viewer";

type UserProfileRecord = {
  display_name: string;
  avatar_url: string;
  bio: string;
  user_type: string;
  role: string;
  phone_number: string;
  whatsapp_number: string;
  alternate_email: string;
  preferred_language: string;
  timezone: string;
  is_profile_completed: boolean;
  extra_data: ApiRecord;
  tags: string[];
};

type UserRecord = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;

  is_active: boolean;
  status: string;
  is_staff: boolean;
  is_superuser: boolean;

  last_login: string | null;
  date_joined: string | null;
  groups: string[];

  user_type: string;
  role: string;
  workspace: string;

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

  phone: string;
  mobile: string;
  phone_number: string;
  whatsapp_number: string;
  notes: string;

  profile: UserProfileRecord;
};

type FormState = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  user_type: UserType;
  role: UserRole;
  status: UserStatus;
  is_staff: boolean;
  is_superuser: boolean;
  phone_number: string;
  whatsapp_number: string;
  alternate_email: string;
  preferred_language: Locale;
  timezone: string;
  notes: string;
  tags: string;
  password: string;
};

type UserApiResponse = {
  success?: boolean;
  ok?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  errors?: unknown;
  user?: unknown;
  item?: unknown;
  data?: unknown;
};

type PasswordLinkResponse = {
  success?: boolean;
  ok?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  errors?: unknown;
  data?: unknown;
  reset?: {
    uid?: string;
    token?: string;
    reset_path?: string;
    reset_url?: string;
  };
};

const translations = {
  ar: {
    title: "تفاصيل حساب الدخول",
    subtitle:
      "إدارة حساب الدخول فقط: بيانات الدخول، الحالة، الدور، رابط كلمة المرور. بيانات العميل أو مقدم الخدمة أو المندوب أو الوسيط تدار من صفحاتهم التشغيلية.",
    back: "رجوع",
    refresh: "تحديث",
    print: "طباعة",
    actions: "الإجراءات",
    edit: "تعديل الحساب",
    save: "حفظ التعديلات",
    cancelEdit: "إلغاء التعديل",
    activate: "تفعيل الحساب",
    deactivate: "تعطيل الحساب",
    passwordLink: "توليد رابط كلمة المرور",
    copyPasswordLink: "نسخ رابط كلمة المرور",
    copyUsername: "نسخ اسم المستخدم",
    copyEmail: "نسخ البريد",
    copied: "تم النسخ",
    passwordLinkGenerated: "تم توليد رابط كلمة المرور ونسخه.",
    overview: "نظرة عامة",
    account: "الحساب",
    security: "الأمان",
    editTab: "تعديل الحساب",
    activity: "السجل",
    userInfo: "بيانات حساب الدخول",
    contactInfo: "بيانات التواصل",
    profileInfo: "بيانات الملف",
    permissionsInfo: "الدور والصلاحيات",
    accountInfo: "بيانات الحساب",
    actorInfo: "الكيان المرتبط",
    username: "اسم المستخدم",
    email: "البريد الإلكتروني",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    fullName: "الاسم الكامل",
    displayName: "اسم العرض",
    userType: "نوع الحساب",
    role: "الدور",
    workspace: "المساحة",
    actor: "الكيان المرتبط",
    actorType: "نوع الكيان",
    actorId: "معرّف الكيان",
    actorName: "اسم الكيان",
    actorCode: "كود الكيان",
    status: "الحالة",
    active: "نشط",
    inactive: "غير نشط",
    staff: "إداري",
    superuser: "سوبر أدمن",
    normal: "عادي",
    phone: "الجوال",
    whatsapp: "واتساب",
    alternateEmail: "بريد بديل",
    preferredLanguage: "اللغة المفضلة",
    timezone: "المنطقة الزمنية",
    groups: "المجموعات",
    tags: "الوسوم",
    notes: "الملاحظات",
    noNotes: "لا توجد ملاحظات.",
    password: "كلمة مرور جديدة",
    passwordHint: "اتركها فارغة إذا لا تريد تغيير كلمة المرور.",
    profileCompleted: "الملف مكتمل",
    lastLogin: "آخر دخول",
    createdAt: "تاريخ الإنشاء",
    superAdmin: "سوبر أدمن",
    system: "النظام",
    staffUser: "موظف نظام",
    provider: "مقدم خدمة",
    center: "مركز",
    customer: "عميل",
    agent: "مندوب",
    broker: "وسيط",
    accountant: "محاسب",
    support: "الدعم",
    viewer: "مشاهد",
    other: "أخرى",
    systemAdmin: "مدير النظام",
    providerAdmin: "مدير مقدم خدمة",
    customerUser: "مستخدم عميل",
    agentUser: "مستخدم مندوب",
    brokerUser: "مستخدم وسيط",
    yes: "نعم",
    no: "لا",
    unknown: "غير محدد",
    notLinked: "غير مرتبط",
    confirmActivate: "هل تريد تفعيل هذا الحساب؟",
    confirmDeactivate: "هل تريد تعطيل هذا الحساب؟",
    actionSuccess: "تم تنفيذ العملية بنجاح.",
    saveSuccess: "تم حفظ بيانات الحساب.",
    operationFailed: "تعذر تنفيذ العملية.",
    errorTitle: "تعذر تحميل تفاصيل الحساب",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    notFoundTitle: "الحساب غير موجود",
    notFoundDesc: "تعذر العثور على حساب الدخول المطلوب.",
    tryAgain: "إعادة المحاولة",
    requiredIdentifier: "اسم المستخدم أو البريد أو الجوال مطلوب.",
    invalidEmail: "صيغة البريد الإلكتروني غير صحيحة.",
    invalidAlternateEmail: "صيغة البريد البديل غير صحيحة.",
    shortPassword: "كلمة المرور يجب ألا تقل عن 8 أحرف.",
    printTitle: "تقرير حساب الدخول",
    generatedAt: "تاريخ الطباعة",
    openUsers: "قائمة حسابات الدخول",
    managedElsewhere: "هذا الربط للعرض فقط. البيانات التشغيلية تدار من صفحة الكيان المرتبط.",
  },
  en: {
    title: "Login Account Details",
    subtitle:
      "Manage login account only: credentials, status, role, and password link. Customer, provider, agent, and broker operational data stays in their own pages.",
    back: "Back",
    refresh: "Refresh",
    print: "Print",
    actions: "Actions",
    edit: "Edit account",
    save: "Save changes",
    cancelEdit: "Cancel edit",
    activate: "Activate account",
    deactivate: "Deactivate account",
    passwordLink: "Generate password link",
    copyPasswordLink: "Copy password link",
    copyUsername: "Copy username",
    copyEmail: "Copy email",
    copied: "Copied",
    passwordLinkGenerated: "Password link generated and copied.",
    overview: "Overview",
    account: "Account",
    security: "Security",
    editTab: "Edit account",
    activity: "Activity",
    userInfo: "Login account data",
    contactInfo: "Contact info",
    profileInfo: "Profile info",
    permissionsInfo: "Role & permissions",
    accountInfo: "Account info",
    actorInfo: "Linked actor",
    username: "Username",
    email: "Email",
    firstName: "First name",
    lastName: "Last name",
    fullName: "Full name",
    displayName: "Display name",
    userType: "Account type",
    role: "Role",
    workspace: "Workspace",
    actor: "Linked actor",
    actorType: "Actor type",
    actorId: "Actor ID",
    actorName: "Actor name",
    actorCode: "Actor code",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    staff: "Staff",
    superuser: "Superuser",
    normal: "Normal",
    phone: "Phone",
    whatsapp: "WhatsApp",
    alternateEmail: "Alternate email",
    preferredLanguage: "Preferred language",
    timezone: "Timezone",
    groups: "Groups",
    tags: "Tags",
    notes: "Notes",
    noNotes: "No notes.",
    password: "New password",
    passwordHint: "Leave empty if you do not want to change the password.",
    profileCompleted: "Profile completed",
    lastLogin: "Last login",
    createdAt: "Created at",
    superAdmin: "Super admin",
    system: "System",
    staffUser: "System staff",
    provider: "Provider",
    center: "Center",
    customer: "Customer",
    agent: "Agent",
    broker: "Broker",
    accountant: "Accountant",
    support: "Support",
    viewer: "Viewer",
    other: "Other",
    systemAdmin: "System admin",
    providerAdmin: "Provider admin",
    customerUser: "Customer user",
    agentUser: "Agent user",
    brokerUser: "Broker user",
    yes: "Yes",
    no: "No",
    unknown: "Unknown",
    notLinked: "Not linked",
    confirmActivate: "Do you want to activate this account?",
    confirmDeactivate: "Do you want to deactivate this account?",
    actionSuccess: "Action completed successfully.",
    saveSuccess: "Account data saved.",
    operationFailed: "Unable to complete operation.",
    errorTitle: "Unable to load account details",
    errorDesc: "Make sure the backend is running, then try again.",
    notFoundTitle: "Account not found",
    notFoundDesc: "The requested login account could not be found.",
    tryAgain: "Try again",
    requiredIdentifier: "Username, email, or phone is required.",
    invalidEmail: "Email format is invalid.",
    invalidAlternateEmail: "Alternate email format is invalid.",
    shortPassword: "Password must be at least 8 characters.",
    printTitle: "Login account report",
    generatedAt: "Generated at",
    openUsers: "Login accounts list",
    managedElsewhere: "This link is read-only. Operational data is managed from the linked actor page.",
  },
} as const;

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

function stringifyApiError(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map((item) => stringifyApiError(item)).filter(Boolean).join("، ");
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, item]) => {
        const message = stringifyApiError(item);
        return message ? `${key}: ${message}` : "";
      })
      .filter(Boolean)
      .join(" | ");
  }

  return String(value);
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

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

async function fetchJson<T>(
  url: string,
  options?: {
    signal?: AbortSignal;
    method?: "GET" | "PATCH" | "POST";
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
      ...(options?.method && options.method !== "GET"
        ? { "Content-Type": "application/json" }
        : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method && options.method !== "GET"
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
      stringifyApiError(payload?.errors) ||
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

function normalizeProfile(value: unknown): UserProfileRecord {
  const profile = asRecord(value);

  return {
    display_name: normalizeText(profile.display_name),
    avatar_url: normalizeText(profile.avatar_url),
    bio: normalizeText(profile.bio),
    user_type: normalizeText(profile.user_type || "OTHER").toUpperCase(),
    role: normalizeText(profile.role || "viewer").toLowerCase(),
    phone_number: normalizeText(profile.phone_number),
    whatsapp_number: normalizeText(profile.whatsapp_number),
    alternate_email: normalizeText(profile.alternate_email),
    preferred_language: normalizeText(profile.preferred_language || "ar"),
    timezone: normalizeText(profile.timezone || "Asia/Riyadh"),
    is_profile_completed: toBoolean(profile.is_profile_completed),
    extra_data: asRecord(profile.extra_data),
    tags: asArray(profile.tags).map((tag) => normalizeText(tag)).filter(Boolean),
  };
}

function inferWorkspace({
  workspace,
  userType,
  role,
  entityType,
}: {
  workspace: string;
  userType: string;
  role: string;
  entityType: string;
}) {
  const cleanWorkspace = normalizeText(workspace).toLowerCase();
  const cleanUserType = normalizeText(userType).toUpperCase();
  const cleanRole = normalizeText(role).toLowerCase();
  const cleanEntityType = normalizeText(entityType).toLowerCase();

  if (["system", "provider", "center", "customer", "agent", "broker"].includes(cleanWorkspace)) {
    return cleanWorkspace;
  }

  if (
    cleanUserType === "PROVIDER" ||
    cleanRole === "provider_admin" ||
    cleanEntityType === "provider"
  ) {
    return "provider";
  }

  if (cleanUserType === "CENTER" || cleanRole === "center_admin" || cleanEntityType === "center") {
    return "center";
  }

  if (
    cleanUserType === "CUSTOMER" ||
    cleanRole === "customer_user" ||
    cleanEntityType === "customer"
  ) {
    return "customer";
  }

  if (
    cleanUserType === "AGENT" ||
    cleanRole === "agent_user" ||
    cleanEntityType === "agent"
  ) {
    return "agent";
  }

  if (
    cleanUserType === "BROKER" ||
    cleanRole === "broker_user" ||
    cleanEntityType === "broker"
  ) {
    return "broker";
  }

  return "system";
}

function normalizeUser(value: unknown): UserRecord {
  const item = asRecord(value);
  const profile = normalizeProfile(item.profile);
  const extra = profile.extra_data;

  const entityRecord = asRecord(
    item.entity || item.actor || item.linked_actor || item.actor_context,
  );

  const firstName = normalizeText(item.first_name);
  const lastName = normalizeText(item.last_name);
  const fullName = normalizeText(
    item.full_name || [firstName, lastName].filter(Boolean).join(" "),
  );

  const entityType = normalizeText(
    item.entity_type ||
      item.actor_type ||
      entityRecord.entity_type ||
      entityRecord.type ||
      extra.entity_type ||
      extra.actor_type ||
      "",
  ).toLowerCase();

  const entityId = toNullableNumber(
    item.entity_id ||
      item.actor_id ||
      entityRecord.entity_id ||
      entityRecord.id ||
      extra.entity_id ||
      extra.actor_id,
  );

  const companyId = toNullableNumber(item.company_id || extra.company_id || extra.company);
  const providerId = toNullableNumber(
    item.provider_id ||
      entityRecord.provider_id ||
      extra.provider_id ||
      extra.provider ||
      extra.service_provider_id,
  );
  const centerId = toNullableNumber(
    item.center_id || entityRecord.center_id || extra.center_id || extra.center,
  );
  const customerId = toNullableNumber(
    item.customer_id || entityRecord.customer_id || extra.customer_id || extra.customer,
  );
  const agentId = toNullableNumber(
    item.agent_id || entityRecord.agent_id || extra.agent_id || extra.agent,
  );
  const brokerId = toNullableNumber(
    item.broker_id || entityRecord.broker_id || extra.broker_id || extra.broker,
  );

  const phone = normalizeText(
    item.phone ||
      item.mobile ||
      item.phone_number ||
      item.whatsapp_number ||
      profile.phone_number ||
      profile.whatsapp_number,
  );

  const userType = normalizeText(item.user_type || profile.user_type || "OTHER").toUpperCase();
  const role = normalizeText(item.role || profile.role || "viewer").toLowerCase();

  const workspace = inferWorkspace({
    workspace: normalizeText(item.workspace || extra.workspace || extra.scope),
    userType,
    role,
    entityType,
  });

  const isActive = toBoolean(item.is_active);

  return {
    id: toNumber(item.id),
    username: normalizeText(item.username),
    email: normalizeText(item.email),
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,

    is_active: isActive,
    status: normalizeText(item.status || (isActive ? "ACTIVE" : "INACTIVE")).toUpperCase(),
    is_staff: toBoolean(item.is_staff),
    is_superuser: toBoolean(item.is_superuser),

    last_login: normalizeText(item.last_login) || null,
    date_joined: normalizeText(item.date_joined) || null,
    groups: asArray(item.groups).map((group) => normalizeText(group)).filter(Boolean),

    user_type: userType,
    role,
    workspace,

    entity_type: entityType,
    entity_id: entityId,
    actor_type: normalizeText(item.actor_type || entityType).toLowerCase(),
    actor_id: toNullableNumber(item.actor_id || entityId),
    actor_name: normalizeText(item.actor_name || entityRecord.actor_name || getRecordName(entityRecord)),
    actor_code: normalizeText(item.actor_code || entityRecord.actor_code || getRecordCode(entityRecord)),

    company_id: companyId,
    provider_id: providerId,
    center_id: centerId,
    customer_id: customerId,
    agent_id: agentId,
    broker_id: brokerId,

    phone,
    mobile: phone,
    phone_number: normalizeText(item.phone_number || profile.phone_number || phone),
    whatsapp_number: normalizeText(item.whatsapp_number || profile.whatsapp_number),
    notes: normalizeText(item.notes || extra.notes),

    profile,
  };
}

function extractUserPayload(payload: UserApiResponse): unknown {
  const data = asRecord(payload.data);

  if (payload.user) return payload.user;
  if (payload.item) return payload.item;
  if (data.user) return data.user;
  if (data.item) return data.item;
  if (data.id || data.username) return data;

  return payload;
}

function extractResetUrl(response: PasswordLinkResponse) {
  const data = asRecord(response.data);
  const reset = asRecord(response.reset || data.reset);

  return normalizeText(reset.reset_url || reset.reset_path);
}

function getUserDisplayName(user: UserRecord) {
  return (
    user.profile.display_name ||
    user.full_name ||
    user.first_name ||
    user.username ||
    user.email ||
    `#${user.id}`
  );
}

function getUserTypeLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(value).toUpperCase();

  if (normalized === "SUPER_ADMIN") return t.superAdmin;
  if (normalized === "SYSTEM") return t.system;
  if (normalized === "STAFF") return t.staffUser;
  if (normalized === "ACCOUNTANT") return t.accountant;
  if (normalized === "PROVIDER") return t.provider;
  if (normalized === "CENTER") return t.center;
  if (normalized === "CUSTOMER") return t.customer;
  if (normalized === "AGENT") return t.agent;
  if (normalized === "BROKER") return t.broker;
  if (normalized === "OTHER") return t.other;

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

function getActorType(user: UserRecord) {
  const actorType = normalizeText(user.entity_type || user.actor_type).toLowerCase();

  if (user.provider_id || actorType === "provider") return "provider";
  if (user.center_id || actorType === "center") return "center";
  if (user.customer_id || actorType === "customer") return "customer";
  if (user.agent_id || actorType === "agent") return "agent";
  if (user.broker_id || actorType === "broker") return "broker";
  if (actorType === "system" || user.workspace === "system") return "system";

  return actorType || "";
}

function getActorLabel(user: UserRecord, locale: Locale) {
  const t = translations[locale];
  const actorType = getActorType(user);
  const actorId = getActorId(user);
  const actorName = normalizeText(user.actor_name);
  const actorCode = normalizeText(user.actor_code);

  let label: string = t.notLinked;

  if (actorType === "provider") label = t.provider;
  else if (actorType === "center") label = t.center;
  else if (actorType === "customer") label = t.customer;
  else if (actorType === "agent") label = t.agent;
  else if (actorType === "broker") label = t.broker;
  else if (actorType === "system") label = t.system;
  else if (actorType) label = actorType;

  if (actorName && actorCode) return `${label}: ${actorName} · ${actorCode}`;
  if (actorName) return `${label}: ${actorName}`;
  if (actorCode) return `${label}: ${actorCode}`;
  if (actorType === "system") return label;
  if (actorId) return `${label} #${actorId}`;

  if (user.workspace === "system" || user.is_staff || user.is_superuser) {
    return t.system;
  }

  return t.notLinked;
}

function getActorTypeLabel(user: UserRecord, locale: Locale) {
  const t = translations[locale];
  const actorType = getActorType(user);

  if (actorType === "provider") return t.provider;
  if (actorType === "center") return t.center;
  if (actorType === "customer") return t.customer;
  if (actorType === "agent") return t.agent;
  if (actorType === "broker") return t.broker;
  if (actorType === "system") return t.system;

  return actorType || t.notLinked;
}

function getActorId(user: UserRecord) {
  return (
    user.provider_id ||
    user.center_id ||
    user.customer_id ||
    user.agent_id ||
    user.broker_id ||
    user.entity_id ||
    user.actor_id ||
    null
  );
}

function getActorHref(user: UserRecord) {
  const actorType = getActorType(user);
  const id = getActorId(user);

  if (!id) return "";

  if (actorType === "provider") return `/system/providers/${id}`;
  if (actorType === "center") return `/system/centers/${id}`;
  if (actorType === "customer") return `/system/customers/${id}`;
  if (actorType === "agent") return `/system/agents/${id}`;
  if (actorType === "broker") return `/system/brokers/${id}`;

  return "";
}

function getActorBadgeClass(user: UserRecord) {
  const actor = getActorType(user);

  if (actor === "provider" || actor === "center") {
    return "border-violet-500/30 bg-violet-50 text-violet-700";
  }

  if (actor === "customer") {
    return "border-blue-500/30 bg-blue-50 text-blue-700";
  }

  if (actor === "agent") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700";
  }

  if (actor === "broker") {
    return "border-amber-500/30 bg-amber-50 text-amber-700";
  }

  if (actor === "system" || user.workspace === "system") {
    return "border-slate-500/30 bg-slate-50 text-slate-700";
  }

  return "border-muted bg-muted/40 text-muted-foreground";
}

function coerceUserType(value: string): UserType {
  const normalized = normalizeText(value || "OTHER").toUpperCase();

  if (
    normalized === "SUPER_ADMIN" ||
    normalized === "SYSTEM" ||
    normalized === "STAFF" ||
    normalized === "ACCOUNTANT" ||
    normalized === "PROVIDER" ||
    normalized === "CENTER" ||
    normalized === "CUSTOMER" ||
    normalized === "AGENT" ||
    normalized === "BROKER" ||
    normalized === "OTHER"
  ) {
    return normalized;
  }

  if (normalized === "SYSTEM_ADMIN" || normalized === "ADMIN") return "SUPER_ADMIN";
  if (normalized === "PROVIDER_ADMIN") return "PROVIDER";
  if (normalized === "CUSTOMER_USER") return "CUSTOMER";
  if (normalized === "AGENT_USER") return "AGENT";
  if (normalized === "BROKER_USER") return "BROKER";
  if (normalized === "SUPPORT") return "STAFF";
  if (normalized === "VIEWER") return "OTHER";

  return "OTHER";
}

function coerceRole(value: string): UserRole {
  const normalized = normalizeText(value || "viewer").toLowerCase();

  if (
    normalized === "system_admin" ||
    normalized === "provider_admin" ||
    normalized === "customer_user" ||
    normalized === "agent_user" ||
    normalized === "broker_user" ||
    normalized === "accountant" ||
    normalized === "support" ||
    normalized === "viewer"
  ) {
    return normalized;
  }

  if (normalized === "admin" || normalized === "super_admin") return "system_admin";
  if (normalized === "customer") return "customer_user";
  if (normalized === "agent") return "agent_user";
  if (normalized === "broker") return "broker_user";
  if (normalized === "finance") return "accountant";

  return "viewer";
}

function userToForm(user: UserRecord): FormState {
  return {
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    display_name: user.profile.display_name || user.full_name || user.username,
    user_type: coerceUserType(user.user_type),
    role: coerceRole(user.role),
    status: user.is_active ? "ACTIVE" : "INACTIVE",
    is_staff: user.is_staff,
    is_superuser: user.is_superuser,
    phone_number: user.phone_number || user.phone,
    whatsapp_number: user.whatsapp_number || user.phone,
    alternate_email: user.profile.alternate_email,
    preferred_language: user.profile.preferred_language === "en" ? "en" : "ar",
    timezone: user.profile.timezone || "Asia/Riyadh",
    notes: user.notes,
    tags: user.profile.tags.join(", "),
    password: "",
  };
}

function buildPatchPayload(form: FormState, user: UserRecord) {
  const tags = form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const payload: ApiRecord = {
    username: form.username.trim(),
    email: form.email.trim().toLowerCase(),
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    display_name: form.display_name.trim(),
    user_type: form.user_type,
    role: form.role,
    status: form.status,
    is_active: form.status === "ACTIVE",
    is_staff: form.is_staff,
    is_superuser: form.is_superuser,
    phone_number: form.phone_number.trim(),
    phone: form.phone_number.trim(),
    mobile: form.phone_number.trim(),
    whatsapp_number: form.whatsapp_number.trim(),
    alternate_email: form.alternate_email.trim().toLowerCase(),
    preferred_language: form.preferred_language,
    timezone: form.timezone.trim() || "Asia/Riyadh",
    notes: form.notes.trim(),
    tags,
  };

  const actorType = getActorType(user);
  const actorId = getActorId(user);

  if (actorType && actorType !== "system" && actorId) {
    payload.entity_type = actorType;
    payload.entity_id = actorId;
    payload.actor_type = actorType;
    payload.actor_id = actorId;

    if (actorType === "provider") payload.provider_id = actorId;
    if (actorType === "center") payload.center_id = actorId;
    if (actorType === "customer") payload.customer_id = actorId;
    if (actorType === "agent") payload.agent_id = actorId;
    if (actorType === "broker") payload.broker_id = actorId;
  }

  if (form.password.trim()) {
    payload.password = form.password.trim();
  }

  return payload;
}

function getStatusClass(isActive: boolean) {
  if (isActive) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
}

function StatusBadge({ user, locale }: { user: UserRecord; locale: Locale }) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full rounded-full px-2.5 py-1 text-xs font-medium",
        getStatusClass(user.is_active),
      )}
    >
      <span className="truncate">{user.is_active ? t.active : t.inactive}</span>
    </Badge>
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

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[104px] px-6 py-5">
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
      </CardHeader>
    </Card>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function DetailSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-3">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <Skeleton className="h-6 w-48" />
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
                <CardHeader className="min-h-[104px] px-6 py-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-28" />
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

export default function SystemUserDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = normalizeText(params?.id);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [user, setUser] = React.useState<UserRecord | null>(null);
  const [form, setForm] = React.useState<FormState | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState("");
  const [editMode, setEditMode] = React.useState(false);
  const [error, setError] = React.useState("");
  const [lastPasswordLink, setLastPasswordLink] = React.useState("");

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

  const loadUser = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!userId) {
        setLoading(false);
        setError(t.notFoundDesc);
        return;
      }

      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const payload = await fetchJson<UserApiResponse>(
          makeApiUrl(`/api/users/${userId}/`),
          { signal: controller.signal },
        );

        const nextUser = normalizeUser(extractUserPayload(payload));

        setUser(nextUser.id ? nextUser : null);
        setForm(userToForm(nextUser));
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setUser(null);
        setForm(null);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [t.errorDesc, t.notFoundDesc, userId],
  );

  React.useEffect(() => {
    void loadUser();
  }, [loadUser]);

  function updateForm<T extends keyof FormState>(key: T, value: FormState[T]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function cancelEdit() {
    if (user) setForm(userToForm(user));
    setEditMode(false);
  }

  function validate() {
    if (!form) return false;

    if (!form.username.trim() && !form.email.trim() && !form.phone_number.trim()) {
      toast.error(t.requiredIdentifier);
      return false;
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
      toast.error(t.invalidEmail);
      return false;
    }

    if (form.alternate_email.trim() && !isValidEmail(form.alternate_email)) {
      toast.error(t.invalidAlternateEmail);
      return false;
    }

    if (form.password.trim() && form.password.trim().length < 8) {
      toast.error(t.shortPassword);
      return false;
    }

    return true;
  }

  async function saveUser() {
    if (!form || !user || !validate()) return;

    setSaving(true);
    setError("");

    try {
      const payload = await fetchJson<UserApiResponse>(
        makeApiUrl(`/api/users/${user.id}/`),
        {
          method: "PATCH",
          body: buildPatchPayload(form, user),
        },
      );

      const nextUser = normalizeUser(extractUserPayload(payload));

      setUser(nextUser);
      setForm(userToForm(nextUser));
      setEditMode(false);
      toast.success(t.saveSuccess);
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

  async function runUserAction(action: "activate" | "deactivate") {
    if (!user) return;

    const confirmation = action === "activate" ? t.confirmActivate : t.confirmDeactivate;
    if (!window.confirm(confirmation)) return;

    setActionLoading(action);

    try {
      await fetchJson<UserApiResponse>(makeApiUrl(`/api/users/${user.id}/${action}/`), {
        method: "POST",
        body: {},
      });

      toast.success(t.actionSuccess);
      await loadUser({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;

      toast.error(message);
    } finally {
      setActionLoading("");
    }
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

  async function generatePasswordLink() {
    if (!user) return;

    setActionLoading("password");

    try {
      const response = await fetchJson<PasswordLinkResponse>(
        makeApiUrl(`/api/users/${user.id}/send-password-link/`),
        {
          method: "POST",
          body: {
            frontend_base_url: typeof window !== "undefined" ? window.location.origin : "",
          },
        },
      );

      const resetUrl = extractResetUrl(response);

      if (resetUrl) {
        setLastPasswordLink(resetUrl);
        await copyValue(resetUrl);
      }

      toast.success(t.passwordLinkGenerated);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;

      toast.error(message);
    } finally {
      setActionLoading("");
    }
  }

  function printPage() {
    if (!user) return;

    const displayName = getUserDisplayName(user);
    const actorLabel = getActorLabel(user, locale);
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
              <p>${escapeHtml(t.username)}: <strong>${escapeHtml(user.username || "—")}</strong></p>
              <p>${escapeHtml(t.status)}: ${escapeHtml(user.is_active ? t.active : t.inactive)}</p>
              <p>${escapeHtml(t.role)}: ${escapeHtml(getRoleLabel(user.role, locale))}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.userType)}</span><strong>${escapeHtml(getUserTypeLabel(user.user_type, locale))}</strong></div>
            <div class="box"><span>${escapeHtml(t.role)}</span><strong>${escapeHtml(getRoleLabel(user.role, locale))}</strong></div>
            <div class="box"><span>${escapeHtml(t.staff)}</span><strong>${escapeHtml(user.is_superuser ? t.superuser : user.is_staff ? t.yes : t.no)}</strong></div>
            <div class="box"><span>${escapeHtml(t.actor)}</span><strong>${escapeHtml(actorLabel)}</strong></div>
          </div>

          <h2>${escapeHtml(t.userInfo)}</h2>
          <table>
            <tbody>
              <tr><th>${escapeHtml(t.displayName)}</th><td>${escapeHtml(displayName)}</td></tr>
              <tr><th>${escapeHtml(t.username)}</th><td>${escapeHtml(user.username || "—")}</td></tr>
              <tr><th>${escapeHtml(t.email)}</th><td>${escapeHtml(user.email || "—")}</td></tr>
              <tr><th>${escapeHtml(t.phone)}</th><td>${escapeHtml(user.phone_number || user.phone || "—")}</td></tr>
              <tr><th>${escapeHtml(t.whatsapp)}</th><td>${escapeHtml(user.whatsapp_number || "—")}</td></tr>
              <tr><th>${escapeHtml(t.workspace)}</th><td>${escapeHtml(user.workspace || "—")}</td></tr>
              <tr><th>${escapeHtml(t.actor)}</th><td>${escapeHtml(actorLabel)}</td></tr>
              <tr><th>${escapeHtml(t.actorName)}</th><td>${escapeHtml(user.actor_name || "—")}</td></tr>
              <tr><th>${escapeHtml(t.actorCode)}</th><td>${escapeHtml(user.actor_code || "—")}</td></tr>
              <tr><th>${escapeHtml(t.groups)}</th><td>${escapeHtml(user.groups.join(", ") || "—")}</td></tr>
              <tr><th>${escapeHtml(t.lastLogin)}</th><td>${escapeHtml(formatDateTime(user.last_login))}</td></tr>
              <tr><th>${escapeHtml(t.createdAt)}</th><td>${escapeHtml(formatDate(user.date_joined))}</td></tr>
              <tr><th>${escapeHtml(t.notes)}</th><td>${escapeHtml(user.notes || "—")}</td></tr>
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

  if (loading) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !user || !form) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 text-right">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>
        </div>

        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-red-200 bg-white">
              <TriangleAlert className="h-6 w-6 text-red-600" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-red-900">
                {error ? t.errorTitle : t.notFoundTitle}
              </p>
              <p className="text-sm text-red-700">{error || t.notFoundDesc}</p>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadUser()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = getUserDisplayName(user);
  const initials = displayName.slice(0, 2).toUpperCase();
  const actorHref = getActorHref(user);
  const actorLabel = getActorLabel(user, locale);
  const actorId = getActorId(user);

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
          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadUser({ silent: true })}
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

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => {
              setEditMode(true);
              setForm(userToForm(user));
            }}
          >
            <Pencil className="h-4 w-4" />
            {t.edit}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90">
                <MoreHorizontal className="h-4 w-4" />
                {t.actions}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
              <DropdownMenuItem onClick={() => void copyValue(user.username)}>
                <Copy className="h-4 w-4" />
                {t.copyUsername}
              </DropdownMenuItem>

              {user.email ? (
                <DropdownMenuItem onClick={() => void copyValue(user.email)}>
                  <Mail className="h-4 w-4" />
                  {t.copyEmail}
                </DropdownMenuItem>
              ) : null}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => void generatePasswordLink()}
                disabled={Boolean(actionLoading) || !user.is_active}
              >
                {actionLoading === "password" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {t.passwordLink}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => void runUserAction("activate")}
                disabled={Boolean(actionLoading) || user.is_active}
              >
                {actionLoading === "activate" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {t.activate}
              </DropdownMenuItem>

              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => void runUserAction("deactivate")}
                disabled={Boolean(actionLoading) || !user.is_active}
              >
                {actionLoading === "deactivate" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t.deactivate}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {lastPasswordLink ? (
        <Card className="rounded-lg border border-emerald-200 bg-emerald-50 shadow-none">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 text-right">
              <p className="font-semibold text-emerald-900">{t.passwordLinkGenerated}</p>
              <p className="truncate text-sm text-emerald-700" dir="ltr">
                {lastPasswordLink}
              </p>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void copyValue(lastPasswordLink)}
            >
              <Copy className="h-4 w-4" />
              {t.copyPasswordLink}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-4 px-6 py-5">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
              {user.profile.avatar_url ? (
                <img
                  src={user.profile.avatar_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">{initials}</span>
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate text-xl font-bold">{displayName}</CardTitle>
              <CardDescription className="truncate">
                {user.username || user.email || `#${user.id}`}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge user={user} locale={locale} />
              <Badge variant="outline" className="rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium">
                {getUserTypeLabel(user.user_type, locale)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  getActorBadgeClass(user),
                )}
              >
                {actorLabel}
              </Badge>
              {user.is_superuser ? (
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
            <InfoRow label={t.role} value={getRoleLabel(user.role, locale)} />
            <InfoRow label={t.workspace} value={user.workspace || "—"} />
            <InfoRow label={t.actor} value={actorLabel} />
            <InfoRow label={t.email} value={user.email || "—"} />
            <InfoRow label={t.phone} value={user.phone_number || user.phone || "—"} />
            <InfoRow label={t.whatsapp} value={user.whatsapp_number || "—"} />
            <InfoRow label={t.profileCompleted} value={user.profile.is_profile_completed ? t.yes : t.no} />
            <InfoRow label={t.lastLogin} value={formatDateTime(user.last_login)} />
            <InfoRow label={t.createdAt} value={formatDate(user.date_joined)} />

            <div className="grid gap-2 pt-3">
              <Button asChild variant="outline" className="h-9 rounded-lg">
                <Link href="/system/users">
                  <Users className="h-4 w-4" />
                  {t.openUsers}
                </Link>
              </Button>

              {actorHref ? (
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href={actorHref}>
                    <Building2 className="h-4 w-4" />
                    {t.actor}
                  </Link>
                </Button>
              ) : null}

              <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
                <Printer className="h-4 w-4" />
                {t.print}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title={t.status} value={user.is_active ? t.active : t.inactive} icon={CheckCircle2} />
            <MetricCard title={t.userType} value={getUserTypeLabel(user.user_type, locale)} icon={UserCog} />
            <MetricCard title={t.role} value={getRoleLabel(user.role, locale)} icon={ShieldCheck} />
            <MetricCard title={t.actor} value={actorLabel} icon={Building2} />
          </div>

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
                  <TabsTrigger value="security" className="rounded-md">
                    <LockKeyhole className="h-4 w-4" />
                    {t.security}
                  </TabsTrigger>
                  <TabsTrigger value="edit" className="rounded-md">
                    <Pencil className="h-4 w-4" />
                    {t.editTab}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="rounded-md">
                    <CalendarDays className="h-4 w-4" />
                    {t.activity}
                  </TabsTrigger>
                </TabsList>
              </CardContent>
            </Card>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.userInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.displayName} value={user.profile.display_name || "—"} />
                    <InfoRow label={t.fullName} value={user.full_name || "—"} />
                    <InfoRow label={t.username} value={user.username || "—"} />
                    <InfoRow label={t.email} value={user.email || "—"} />
                    <InfoRow label={t.status}>
                      <StatusBadge user={user} locale={locale} />
                    </InfoRow>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.contactInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.phone} value={user.phone_number || user.phone || "—"} />
                    <InfoRow label={t.whatsapp} value={user.whatsapp_number || "—"} />
                    <InfoRow label={t.alternateEmail} value={user.profile.alternate_email || "—"} />
                    <InfoRow label={t.preferredLanguage} value={user.profile.preferred_language || "—"} />
                    <InfoRow label={t.timezone} value={user.profile.timezone || "—"} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.permissionsInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.userType} value={getUserTypeLabel(user.user_type, locale)} />
                    <InfoRow label={t.role} value={getRoleLabel(user.role, locale)} />
                    <InfoRow label={t.workspace} value={user.workspace || "—"} />
                    <InfoRow label={t.groups} value={user.groups.length ? user.groups.join(", ") : "—"} />
                    <InfoRow label={t.tags} value={user.profile.tags.length ? user.profile.tags.join(", ") : "—"} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.actorInfo}</CardTitle>
                    <CardDescription>{t.managedElsewhere}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.actor} value={actorLabel} />
                    <InfoRow label={t.actorType} value={getActorTypeLabel(user, locale)} />
                    <InfoRow label={t.actorId} value={actorId ? `#${actorId}` : "—"} />
                    <InfoRow label={t.actorName} value={user.actor_name || "—"} />
                    <InfoRow label={t.actorCode} value={user.actor_code || "—"} />
                    <InfoRow label={t.workspace} value={user.workspace || "—"} />
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

                <Card className="rounded-lg border bg-card shadow-none xl:col-span-2">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.notes}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <div className="min-h-[120px] rounded-lg border bg-background p-4">
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {user.notes || t.noNotes}
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
                    <InfoRow label={t.status} value={user.is_active ? t.active : t.inactive} />
                    <InfoRow label={t.staff} value={user.is_staff ? t.yes : t.no} />
                    <InfoRow label={t.superuser} value={user.is_superuser ? t.yes : t.no} />
                    <InfoRow label={t.profileCompleted} value={user.profile.is_profile_completed ? t.yes : t.no} />
                    <InfoRow label={t.lastLogin} value={formatDateTime(user.last_login)} />
                    <InfoRow label={t.createdAt} value={formatDate(user.date_joined)} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.profileInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.displayName} value={user.profile.display_name || "—"} />
                    <InfoRow label={t.preferredLanguage} value={user.profile.preferred_language || "—"} />
                    <InfoRow label={t.timezone} value={user.profile.timezone || "—"} />
                    <InfoRow label={t.tags} value={user.profile.tags.length ? user.profile.tags.join(", ") : "—"} />
                    <InfoRow label={t.notes} value={user.notes || "—"} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.security}</CardTitle>
                    <CardDescription>{user.username}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 px-5 pb-5">
                    <Button
                      variant="outline"
                      className="h-10 justify-start rounded-lg"
                      disabled={Boolean(actionLoading) || !user.is_active}
                      onClick={() => void generatePasswordLink()}
                    >
                      {actionLoading === "password" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                      {t.passwordLink}
                    </Button>

                    <Button
                      variant="outline"
                      className="h-10 justify-start rounded-lg"
                      disabled={Boolean(actionLoading) || user.is_active}
                      onClick={() => void runUserAction("activate")}
                    >
                      {actionLoading === "activate" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {t.activate}
                    </Button>

                    <Button
                      variant="outline"
                      className="h-10 justify-start rounded-lg text-red-600 hover:text-red-600"
                      disabled={Boolean(actionLoading) || !user.is_active}
                      onClick={() => void runUserAction("deactivate")}
                    >
                      {actionLoading === "deactivate" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {t.deactivate}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.passwordLink}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <div className="min-h-[150px] rounded-lg border bg-background p-4">
                      {lastPasswordLink ? (
                        <div className="space-y-3">
                          <p className="break-all text-sm text-muted-foreground" dir="ltr">
                            {lastPasswordLink}
                          </p>
                          <Button
                            variant="outline"
                            className="h-9 rounded-lg"
                            onClick={() => void copyValue(lastPasswordLink)}
                          >
                            <Copy className="h-4 w-4" />
                            {t.copyPasswordLink}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t.passwordHint}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="edit" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="text-base">{t.edit}</CardTitle>
                      <CardDescription>{displayName}</CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {editMode ? (
                        <>
                          <Button
                            variant="outline"
                            className="h-9 rounded-lg"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            <X className="h-4 w-4" />
                            {t.cancelEdit}
                          </Button>

                          <Button
                            className="h-9 rounded-lg bg-black text-white hover:bg-black/90"
                            onClick={() => void saveUser()}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {t.save}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          className="h-9 rounded-lg"
                          onClick={() => setEditMode(true)}
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
                        <p className="text-sm font-semibold text-foreground">{t.actorInfo}</p>
                        <p className="text-sm text-muted-foreground">{t.managedElsewhere}</p>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit rounded-full px-2.5 py-1 text-xs font-medium",
                          getActorBadgeClass(user),
                        )}
                      >
                        {actorLabel}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <FieldLabel>{t.username}</FieldLabel>
                      <Input
                        value={form.username}
                        onChange={(event) => updateForm("username", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.email}</FieldLabel>
                      <Input
                        value={form.email}
                        onChange={(event) => updateForm("email", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.firstName}</FieldLabel>
                      <Input
                        value={form.first_name}
                        onChange={(event) => updateForm("first_name", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.lastName}</FieldLabel>
                      <Input
                        value={form.last_name}
                        onChange={(event) => updateForm("last_name", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <FieldLabel>{t.displayName}</FieldLabel>
                      <Input
                        value={form.display_name}
                        onChange={(event) => updateForm("display_name", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.status}</FieldLabel>
                      <Select
                        value={form.status}
                        disabled={!editMode || saving}
                        onValueChange={(value) => updateForm("status", value as UserStatus)}
                      >
                        <SelectTrigger className="h-10 rounded-lg bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">{t.active}</SelectItem>
                          <SelectItem value="INACTIVE">{t.inactive}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.userType}</FieldLabel>
                      <Select
                        value={form.user_type}
                        disabled={!editMode || saving}
                        onValueChange={(value) => updateForm("user_type", value as UserType)}
                      >
                        <SelectTrigger className="h-10 rounded-lg bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SUPER_ADMIN">{t.superAdmin}</SelectItem>
                          <SelectItem value="SYSTEM">{t.system}</SelectItem>
                          <SelectItem value="STAFF">{t.staffUser}</SelectItem>
                          <SelectItem value="ACCOUNTANT">{t.accountant}</SelectItem>
                          <SelectItem value="PROVIDER">{t.provider}</SelectItem>
                          <SelectItem value="CENTER">{t.center}</SelectItem>
                          <SelectItem value="CUSTOMER">{t.customer}</SelectItem>
                          <SelectItem value="AGENT">{t.agent}</SelectItem>
                          <SelectItem value="BROKER">{t.broker}</SelectItem>
                          <SelectItem value="OTHER">{t.other}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.role}</FieldLabel>
                      <Select
                        value={form.role}
                        disabled={!editMode || saving}
                        onValueChange={(value) => updateForm("role", value as UserRole)}
                      >
                        <SelectTrigger className="h-10 rounded-lg bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system_admin">{t.systemAdmin}</SelectItem>
                          <SelectItem value="provider_admin">{t.providerAdmin}</SelectItem>
                          <SelectItem value="customer_user">{t.customerUser}</SelectItem>
                          <SelectItem value="agent_user">{t.agentUser}</SelectItem>
                          <SelectItem value="broker_user">{t.brokerUser}</SelectItem>
                          <SelectItem value="accountant">{t.accountant}</SelectItem>
                          <SelectItem value="support">{t.support}</SelectItem>
                          <SelectItem value="viewer">{t.viewer}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.phone}</FieldLabel>
                      <Input
                        value={form.phone_number}
                        onChange={(event) => updateForm("phone_number", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background text-right tabular-nums"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.whatsapp}</FieldLabel>
                      <Input
                        value={form.whatsapp_number}
                        onChange={(event) => updateForm("whatsapp_number", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background text-right tabular-nums"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.alternateEmail}</FieldLabel>
                      <Input
                        value={form.alternate_email}
                        onChange={(event) => updateForm("alternate_email", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.preferredLanguage}</FieldLabel>
                      <Select
                        value={form.preferred_language}
                        disabled={!editMode || saving}
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
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.staff}</FieldLabel>
                      <Select
                        value={form.is_staff ? "yes" : "no"}
                        disabled={!editMode || saving}
                        onValueChange={(value) => updateForm("is_staff", value === "yes")}
                      >
                        <SelectTrigger className="h-10 rounded-lg bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">{t.yes}</SelectItem>
                          <SelectItem value="no">{t.no}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.superuser}</FieldLabel>
                      <Select
                        value={form.is_superuser ? "yes" : "no"}
                        disabled={!editMode || saving}
                        onValueChange={(value) => updateForm("is_superuser", value === "yes")}
                      >
                        <SelectTrigger className="h-10 rounded-lg bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">{t.yes}</SelectItem>
                          <SelectItem value="no">{t.no}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <FieldLabel>{t.password}</FieldLabel>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(event) => updateForm("password", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                        placeholder={t.passwordHint}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <FieldLabel>{t.tags}</FieldLabel>
                      <Input
                        value={form.tags}
                        onChange={(event) => updateForm("tags", event.target.value)}
                        disabled={!editMode || saving}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2 xl:col-span-4">
                      <FieldLabel>{t.notes}</FieldLabel>
                      <textarea
                        value={form.notes}
                        onChange={(event) => updateForm("notes", event.target.value)}
                        disabled={!editMode || saving}
                        className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-base">{t.activity}</CardTitle>
                  <CardDescription>{displayName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-5">
                  {[
                    {
                      label: t.createdAt,
                      value: formatDate(user.date_joined),
                      icon: UserCog,
                    },
                    {
                      label: t.lastLogin,
                      value: formatDateTime(user.last_login),
                      icon: CalendarDays,
                    },
                    {
                      label: t.status,
                      value: user.is_active ? t.active : t.inactive,
                      icon: CheckCircle2,
                    },
                    {
                      label: t.actor,
                      value: actorLabel,
                      icon: Building2,
                    },
                    {
                      label: t.profileCompleted,
                      value: user.profile.is_profile_completed ? t.yes : t.no,
                      icon: ShieldCheck,
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="truncate font-medium">{item.label}</p>
                        </div>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}