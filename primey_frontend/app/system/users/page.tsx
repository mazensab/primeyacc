"use client";

/* ============================================================
   📂 primey_frontend/app/system/users/page.tsx
   👥 Primey Care — Login Accounts Management V2
   ------------------------------------------------------------
   ✅ إدارة حسابات الدخول فقط
   ✅ لا تكرر بيانات العميل / مقدم الخدمة / المندوب / الوسيط
   ✅ يدعم entity / actor / linked_actor / actor_context من الباكند
   ✅ Same approved Products / Customers table spirit
   ✅ Real API only: /api/users/
   ✅ Server pagination: q / user_type / role / is_active / page / per_page
   ✅ Actions: activate / deactivate / send password link
   ✅ Excel .xls + Web print
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  CheckCircle2,
  ColumnsIcon,
  Copy,
  Eye,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  Users,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type UserStatusFilter = "all" | "active" | "inactive";

type UserTypeFilter =
  | "all"
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

type RoleFilter =
  | "all"
  | "system_admin"
  | "provider_admin"
  | "customer_user"
  | "agent_user"
  | "broker_user"
  | "accountant"
  | "support"
  | "viewer";

type SortKey =
  | "newest"
  | "oldest"
  | "name"
  | "username"
  | "email"
  | "user_type"
  | "role"
  | "last_login";

type ColumnKey =
  | "select"
  | "user"
  | "contact"
  | "userType"
  | "role"
  | "workspace"
  | "actor"
  | "groups"
  | "status"
  | "staff"
  | "lastLogin"
  | "createdAt"
  | "actions";

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

type PaginationState = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

type UsersApiResponse = {
  success?: boolean;
  ok?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  errors?: unknown;
  results?: unknown[];
  items?: unknown[];
  users?: unknown[];
  data?: {
    results?: unknown[];
    items?: unknown[];
    users?: unknown[];
    pagination?: unknown;
    count?: unknown;
  };
  count?: unknown;
  page?: unknown;
  per_page?: unknown;
  page_size?: unknown;
  total_pages?: unknown;
  num_pages?: unknown;
  pagination?: unknown;
};

type ActionApiResponse = {
  success?: boolean;
  ok?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  errors?: unknown;
  data?: unknown;
  user?: unknown;
  reset?: {
    uid?: string;
    token?: string;
    reset_path?: string;
    reset_url?: string;
  };
};

const PAGE_SIZE = 10;

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  user: true,
  contact: true,
  userType: true,
  role: true,
  workspace: true,
  actor: true,
  groups: false,
  status: true,
  staff: true,
  lastLogin: true,
  createdAt: true,
  actions: true,
};

const translations = {
  ar: {
    title: "حسابات الدخول",
    subtitle:
      "إدارة حسابات الدخول فقط: التفعيل، التعطيل، بيانات الدخول، وروابط كلمة المرور. بيانات العميل أو مقدم الخدمة أو المندوب أو الوسيط تدار من صفحاتهم التشغيلية.",
    create: "إضافة حساب نظام",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث بالاسم أو اسم المستخدم أو البريد أو الجوال...",
    totalUsers: "إجمالي الحسابات",
    activeUsers: "الحسابات النشطة",
    inactiveUsers: "الحسابات المعطلة",
    linkedAccounts: "حسابات مرتبطة",
    admins: "حسابات النظام",
    completedProfiles: "ملفات مكتملة",
    user: "حساب الدخول",
    contact: "التواصل",
    userType: "نوع الحساب",
    role: "الدور",
    workspace: "المساحة",
    actor: "الكيان المرتبط",
    groups: "المجموعات",
    status: "الحالة",
    staff: "إداري",
    lastLogin: "آخر دخول",
    createdAt: "تاريخ الإنشاء",
    actions: "الإجراءات",
    columns: "الأعمدة",
    sort: "الترتيب",
    selected: "محدد",
    allTypes: "كل الأنواع",
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
    allRoles: "كل الأدوار",
    systemAdmin: "مدير النظام",
    providerAdmin: "مدير مقدم خدمة",
    customerUser: "مستخدم عميل",
    agentUser: "مستخدم مندوب",
    brokerUser: "مستخدم وسيط",
    allStatuses: "كل الحالات",
    active: "نشط",
    inactive: "غير نشط",
    yes: "نعم",
    no: "لا",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    usernameSort: "اسم المستخدم",
    emailSort: "البريد",
    userTypeSort: "نوع الحساب",
    roleSort: "الدور",
    lastLoginSort: "آخر دخول",
    activeFilters: "فلاتر مفعلة",
    clearSelection: "إلغاء التحديد",
    view: "عرض وإدارة الحساب",
    copyUsername: "نسخ اسم المستخدم",
    copyEmail: "نسخ البريد",
    activate: "تفعيل الحساب",
    deactivate: "تعطيل الحساب",
    passwordLink: "توليد رابط كلمة المرور",
    copyPasswordLink: "نسخ رابط كلمة المرور",
    copied: "تم النسخ",
    actionSuccess: "تم تنفيذ العملية بنجاح.",
    passwordLinkGenerated: "تم توليد رابط كلمة المرور.",
    actionFailed: "تعذر تنفيذ العملية.",
    confirmActivate: "هل تريد تفعيل هذا الحساب؟",
    confirmDeactivate: "هل تريد تعطيل هذا الحساب؟",
    noDataTitle: "لا توجد حسابات بعد",
    noDataDesc: "عند إنشاء حسابات دخول ستظهر هنا.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل حسابات الدخول",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير حسابات الدخول",
    generatedAt: "تاريخ الطباعة",
    showing: "عرض",
    rows: "صفوف",
    page: "صفحة",
    of: "من",
    next: "التالي",
    previous: "السابق",
    unknown: "غير محدد",
    superuser: "سوبر أدمن",
    normal: "عادي",
    noContact: "لا توجد بيانات تواصل",
    notLinked: "غير مرتبط",
  },
  en: {
    title: "Login Accounts",
    subtitle:
      "Manage login accounts only: activation, deactivation, credentials, and password links. Customer, provider, agent, and broker operational data stays in their own pages.",
    create: "Add System Account",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    searchPlaceholder: "Search name, username, email, or phone...",
    totalUsers: "Total accounts",
    activeUsers: "Active accounts",
    inactiveUsers: "Inactive accounts",
    linkedAccounts: "Linked accounts",
    admins: "System accounts",
    completedProfiles: "Completed profiles",
    user: "Login account",
    contact: "Contact",
    userType: "Account type",
    role: "Role",
    workspace: "Workspace",
    actor: "Linked actor",
    groups: "Groups",
    status: "Status",
    staff: "Staff",
    lastLogin: "Last login",
    createdAt: "Created at",
    actions: "Actions",
    columns: "Columns",
    sort: "Sort",
    selected: "Selected",
    allTypes: "All types",
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
    allRoles: "All roles",
    systemAdmin: "System admin",
    providerAdmin: "Provider admin",
    customerUser: "Customer user",
    agentUser: "Agent user",
    brokerUser: "Broker user",
    allStatuses: "All statuses",
    active: "Active",
    inactive: "Inactive",
    yes: "Yes",
    no: "No",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    usernameSort: "Username",
    emailSort: "Email",
    userTypeSort: "Account type",
    roleSort: "Role",
    lastLoginSort: "Last login",
    activeFilters: "Active filters",
    clearSelection: "Clear selection",
    view: "View account",
    copyUsername: "Copy username",
    copyEmail: "Copy email",
    activate: "Activate account",
    deactivate: "Deactivate account",
    passwordLink: "Generate password link",
    copyPasswordLink: "Copy password link",
    copied: "Copied",
    actionSuccess: "Action completed successfully.",
    passwordLinkGenerated: "Password link generated.",
    actionFailed: "Unable to complete action.",
    confirmActivate: "Do you want to activate this account?",
    confirmDeactivate: "Do you want to deactivate this account?",
    noDataTitle: "No accounts yet",
    noDataDesc: "Created login accounts will appear here.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load login accounts",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Login accounts report",
    generatedAt: "Generated at",
    showing: "Showing",
    rows: "Rows",
    page: "Page",
    of: "of",
    next: "Next",
    previous: "Previous",
    unknown: "Unknown",
    superuser: "Superuser",
    normal: "Normal",
    noContact: "No contact data",
    notLinked: "Not linked",
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

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    return ["1", "true", "yes", "on", "active", "نشط"].includes(value.toLowerCase());
  }

  return false;
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

function makeApiUrl(path: string, params?: URLSearchParams) {
  const base = getApiBaseUrl();
  const query = params?.toString();

  return `${base}${path}${query ? `?${query}` : ""}`;
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

  return {
    id: toNumber(item.id),
    username: normalizeText(item.username),
    email: normalizeText(item.email),
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    is_active: toBoolean(item.is_active),
    status: normalizeText(item.status || (toBoolean(item.is_active) ? "ACTIVE" : "INACTIVE")).toUpperCase(),
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

function extractUsers(payload: UsersApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.users)) return payload.users;

  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.users)) return payload.data.users;
  }

  return [];
}

function extractPagination(payload: UsersApiResponse): PaginationState {
  const rootPagination = asRecord(payload.pagination);
  const dataPagination = asRecord(asRecord(payload.data).pagination);
  const pagination = Object.keys(dataPagination).length ? dataPagination : rootPagination;

  const page = toNumber(pagination.page || payload.page, 1);
  const perPage = toNumber(
    pagination.per_page || pagination.page_size || payload.per_page || payload.page_size,
    PAGE_SIZE,
  );
  const total = toNumber(
    pagination.total || pagination.count || payload.count || asRecord(payload.data).count,
    0,
  );
  const totalPages = Math.max(
    toNumber(
      pagination.total_pages ||
        pagination.pages ||
        pagination.num_pages ||
        payload.total_pages ||
        payload.num_pages ||
        Math.ceil(total / Math.max(perPage, 1)),
      1,
    ),
    1,
  );

  return {
    page,
    per_page: perPage,
    total,
    total_pages: totalPages,
  };
}

function extractResetUrl(response: ActionApiResponse) {
  const data = asRecord(response.data);
  const reset = asRecord(response.reset || data.reset);

  return normalizeText(reset.reset_url || reset.reset_path);
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

function isLinkedAccount(user: UserRecord) {
  const actorType = getActorType(user);
  const actorId = getActorId(user);

  return Boolean(actorType && actorType !== "system" && actorId);
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

        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
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
            className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {trend}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}

function HeaderSortButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center justify-start gap-1 truncate text-xs font-semibold transition hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="truncate">{children}</span>
      <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

function TableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-11 whitespace-nowrap px-4 text-right align-middle text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function TableBodyCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableCell
      className={cn(
        "h-[62px] overflow-hidden px-4 text-right align-middle",
        className,
      )}
    >
      {children}
    </TableCell>
  );
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

export default function SystemUsersPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [users, setUsers] = React.useState<UserRecord[]>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    page: 1,
    per_page: PAGE_SIZE,
    total: 0,
    total_pages: 1,
  });

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<number | null>(null);
  const [error, setError] = React.useState("");
  const [lastPasswordLink, setLastPasswordLink] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<UserTypeFilter>("all");
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = React.useState<UserStatusFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const [selectedIds, setSelectedIds] = React.useState<Array<number>>([]);
  const [visibleColumns, setVisibleColumns] =
    React.useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [page, setPage] = React.useState(1);

  const didLoadRef = React.useRef(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

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

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadUsers = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: String(page),
          per_page: String(PAGE_SIZE),
          page_size: String(PAGE_SIZE),
        });

        if (search) {
          params.set("q", search);
          params.set("search", search);
        }

        if (typeFilter !== "all") {
          params.set("user_type", typeFilter);
        }

        if (roleFilter !== "all") {
          params.set("role", roleFilter);
        }

        if (statusFilter === "active") {
          params.set("is_active", "true");
        }

        if (statusFilter === "inactive") {
          params.set("is_active", "false");
        }

        const payload = await fetchJson<UsersApiResponse>(
          makeApiUrl("/api/users/", params),
          { signal: controller.signal },
        );

        const nextUsers = extractUsers(payload).map(normalizeUser);
        const nextPagination = extractPagination(payload);

        setUsers(nextUsers);
        setPagination(nextPagination);
        setSelectedIds([]);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setUsers([]);
        setPagination({
          page,
          per_page: PAGE_SIZE,
          total: 0,
          total_pages: 1,
        });
        setSelectedIds([]);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [page, roleFilter, search, statusFilter, t.errorDesc, typeFilter],
  );

  React.useEffect(() => {
    if (!didLoadRef.current) {
      didLoadRef.current = true;
      void loadUsers();
      return;
    }

    void loadUsers({ silent: true });
  }, [loadUsers]);

  const sortedUsers = React.useMemo(() => {
    const copy = [...users];

    copy.sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.date_joined || "").localeCompare(String(b.date_joined || ""));
      }

      if (sortKey === "name") {
        return getUserDisplayName(a).localeCompare(getUserDisplayName(b));
      }

      if (sortKey === "username") {
        return a.username.localeCompare(b.username);
      }

      if (sortKey === "email") {
        return a.email.localeCompare(b.email);
      }

      if (sortKey === "user_type") {
        return a.user_type.localeCompare(b.user_type);
      }

      if (sortKey === "role") {
        return a.role.localeCompare(b.role);
      }

      if (sortKey === "last_login") {
        return String(b.last_login || "").localeCompare(String(a.last_login || ""));
      }

      return String(b.date_joined || "").localeCompare(String(a.date_joined || ""));
    });

    return copy;
  }, [sortKey, users]);

  const summary = React.useMemo(() => {
    const active = users.filter((user) => user.is_active).length;
    const inactive = users.filter((user) => !user.is_active).length;
    const linked = users.filter(isLinkedAccount).length;
    const systemAccounts = users.filter(
      (user) =>
        user.is_superuser ||
        user.is_staff ||
        user.role === "system_admin" ||
        user.user_type === "SUPER_ADMIN" ||
        user.user_type === "SYSTEM" ||
        user.user_type === "STAFF" ||
        user.user_type === "ACCOUNTANT",
    ).length;

    return {
      total: pagination.total || users.length,
      active,
      inactive,
      linked,
      systemAccounts,
    };
  }, [pagination.total, users]);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const hasActiveFilters =
    Boolean(search.trim()) ||
    typeFilter !== "all" ||
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    sortKey !== "newest";

  const allPageSelected =
    sortedUsers.length > 0 && sortedUsers.every((user) => selectedIds.includes(user.id));

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setTypeFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
    setSortKey("newest");
    setSelectedIds([]);
    setPage(1);
  }

  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(sortedUsers.map((user) => user.id));
  }

  function toggleSelectUser(id: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((item) => item !== id);
    });
  }

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.actionFailed);
    }
  }

  async function runUserAction(user: UserRecord, action: "activate" | "deactivate") {
    const confirmation = action === "activate" ? t.confirmActivate : t.confirmDeactivate;

    if (!window.confirm(confirmation)) return;

    setActionLoadingId(user.id);

    try {
      await fetchJson<ActionApiResponse>(
        makeApiUrl(`/api/users/${user.id}/${action}/`),
        {
          method: "POST",
          body: {},
        },
      );

      toast.success(t.actionSuccess);
      await loadUsers({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.actionFailed;

      toast.error(message);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function generatePasswordLink(user: UserRecord) {
    setActionLoadingId(user.id);

    try {
      const response = await fetchJson<ActionApiResponse>(
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
          : t.actionFailed;

      toast.error(message);
    } finally {
      setActionLoadingId(null);
    }
  }

  function buildExportRows() {
    return sortedUsers.map((user) => ({
      name: getUserDisplayName(user),
      username: user.username,
      email: user.email,
      phone: user.phone || user.whatsapp_number || user.phone_number,
      userType: getUserTypeLabel(user.user_type, locale),
      role: getRoleLabel(user.role, locale),
      workspace: getWorkspaceLabel(user.workspace, locale),
      actor: getActorLabel(user, locale),
      groups: user.groups.join(", "),
      status: user.is_active ? t.active : t.inactive,
      staff: user.is_superuser ? t.superuser : user.is_staff ? t.yes : t.no,
      lastLogin: formatDateTime(user.last_login),
      createdAt: formatDate(user.date_joined),
    }));
  }

  function exportExcel() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; direction: ${dir}; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d9d9d9; padding: 8px; text-align: ${locale === "ar" ? "right" : "left"}; }
            th { background: #f3f4f6; font-weight: 700; }
          </style>
        </head>
        <body>
          <h2>${escapeHtml(t.printTitle)}</h2>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.user)}</th>
                <th>${escapeHtml(t.contact)}</th>
                <th>${escapeHtml(t.userType)}</th>
                <th>${escapeHtml(t.role)}</th>
                <th>${escapeHtml(t.workspace)}</th>
                <th>${escapeHtml(t.actor)}</th>
                <th>${escapeHtml(t.groups)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.staff)}</th>
                <th>${escapeHtml(t.lastLogin)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.name)}<br />${escapeHtml(row.username)}</td>
                      <td>${escapeHtml(row.email)}<br />${escapeHtml(row.phone)}</td>
                      <td>${escapeHtml(row.userType)}</td>
                      <td>${escapeHtml(row.role)}</td>
                      <td>${escapeHtml(row.workspace || "—")}</td>
                      <td>${escapeHtml(row.actor || "—")}</td>
                      <td>${escapeHtml(row.groups || "—")}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.staff)}</td>
                      <td>${escapeHtml(row.lastLogin)}</td>
                      <td>${escapeHtml(row.createdAt)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `primey-care-login-accounts-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.actionFailed);
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)}</title>
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
              align-items: flex-start;
              gap: 16px;
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            h1 { margin: 0; font-size: 22px; }
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
              <p>${escapeHtml(t.showing)}: ${escapeHtml(rows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalUsers)}</span><strong>${escapeHtml(summary.total)}</strong></div>
            <div class="box"><span>${escapeHtml(t.activeUsers)}</span><strong>${escapeHtml(summary.active)}</strong></div>
            <div class="box"><span>${escapeHtml(t.inactiveUsers)}</span><strong>${escapeHtml(summary.inactive)}</strong></div>
            <div class="box"><span>${escapeHtml(t.linkedAccounts)}</span><strong>${escapeHtml(summary.linked)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.user)}</th>
                <th>${escapeHtml(t.contact)}</th>
                <th>${escapeHtml(t.userType)}</th>
                <th>${escapeHtml(t.role)}</th>
                <th>${escapeHtml(t.workspace)}</th>
                <th>${escapeHtml(t.actor)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.staff)}</th>
                <th>${escapeHtml(t.lastLogin)}</th>
                <th>${escapeHtml(t.createdAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.name)}<br />${escapeHtml(row.username)}</td>
                      <td>${escapeHtml(row.email || "—")}<br />${escapeHtml(row.phone || "—")}</td>
                      <td>${escapeHtml(row.userType)}</td>
                      <td>${escapeHtml(row.role)}</td>
                      <td>${escapeHtml(row.workspace || "—")}</td>
                      <td>${escapeHtml(row.actor || "—")}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.staff)}</td>
                      <td>${escapeHtml(row.lastLogin)}</td>
                      <td>${escapeHtml(row.createdAt)}</td>
                    </tr>
                  `,
                )
                .join("")}
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-lg border bg-card shadow-none">
              <CardHeader className="min-h-[112px] px-6 py-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-32" />
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
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadUsers({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            {t.export}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <Button asChild className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90">
            <Link href="/system/users/create">
              <Plus className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalUsers}
          value={formatInteger(summary.total)}
          trend={`${t.showing} ${formatInteger(users.length)}`}
          icon={Users}
        />

        <KpiCard
          title={t.activeUsers}
          value={formatInteger(summary.active)}
          trend={t.active}
          icon={CheckCircle2}
        />

        <KpiCard
          title={t.inactiveUsers}
          value={formatInteger(summary.inactive)}
          trend={t.inactive}
          icon={XCircle}
        />

        <KpiCard
          title={t.linkedAccounts}
          value={formatInteger(summary.linked)}
          trend={`${t.admins}: ${formatInteger(summary.systemAccounts)}`}
          icon={ShieldCheck}
        />
      </div>

      {error ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 text-right">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">{t.errorTitle}</p>
                <p className="text-sm text-red-700">{error || t.errorDesc}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadUsers()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

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

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                  locale === "ar" ? "right-3" : "left-3",
                )}
              />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t.searchPlaceholder}
                className={cn(
                  "h-10 rounded-lg bg-background",
                  locale === "ar" ? "pr-9" : "pl-9",
                )}
              />
            </div>

            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value as UserTypeFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[170px]">
                    <UserCog className="h-4 w-4" />
                    <SelectValue placeholder={t.userType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allTypes}</SelectItem>
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

                <Select
                  value={roleFilter}
                  onValueChange={(value) => {
                    setRoleFilter(value as RoleFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[170px]">
                    <ShieldCheck className="h-4 w-4" />
                    <SelectValue placeholder={t.role} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allRoles}</SelectItem>
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

                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as UserStatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[135px]">
                    <CheckCircle2 className="h-4 w-4" />
                    <SelectValue placeholder={t.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    <SelectItem value="active">{t.active}</SelectItem>
                    <SelectItem value="inactive">{t.inactive}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 rounded-lg bg-background">
                      <ColumnsIcon className="h-4 w-4" />
                      {t.columns}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                    <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(
                      [
                        ["select", t.selected],
                        ["user", t.user],
                        ["contact", t.contact],
                        ["userType", t.userType],
                        ["role", t.role],
                        ["workspace", t.workspace],
                        ["actor", t.actor],
                        ["groups", t.groups],
                        ["status", t.status],
                        ["staff", t.staff],
                        ["lastLogin", t.lastLogin],
                        ["createdAt", t.createdAt],
                        ["actions", t.actions],
                      ] as [ColumnKey, string][]
                    ).map(([key, label]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={visibleColumns[key]}
                        onCheckedChange={(checked) =>
                          setVisibleColumns((current) => ({
                            ...current,
                            [key]: Boolean(checked),
                          }))
                        }
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-background"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 rounded-lg bg-background">
                      <ArrowUpDown className="h-4 w-4" />
                      {t.sort}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                    {(
                      [
                        ["newest", t.newest],
                        ["oldest", t.oldest],
                        ["name", t.nameSort],
                        ["username", t.usernameSort],
                        ["email", t.emailSort],
                        ["user_type", t.userTypeSort],
                        ["role", t.roleSort],
                        ["last_login", t.lastLoginSort],
                      ] as [SortKey, string][]
                    ).map(([key, label]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={sortKey === key}
                        onCheckedChange={() => setSortKey(key)}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedIds.length > 0 ? (
                  <Button
                    variant="outline"
                    className="h-9 rounded-lg bg-background"
                    onClick={() => setSelectedIds([])}
                  >
                    <XCircle className="h-4 w-4" />
                    {t.clearSelection} ({formatInteger(selectedIds.length)})
                  </Button>
                ) : null}

                {hasActiveFilters ? (
                  <Badge variant="secondary" className="h-9 rounded-lg px-3 text-xs font-semibold">
                    {t.activeFilters}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[1180px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {visibleColumns.select ? (
                      <TableHeaderCell className="w-[46px] px-3">
                        <Checkbox
                          checked={allPageSelected}
                          onCheckedChange={(checked) =>
                            toggleSelectAllPage(Boolean(checked))
                          }
                          aria-label={t.selected}
                        />
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.user ? (
                      <TableHeaderCell className="w-[240px]">
                        <HeaderSortButton
                          active={sortKey === "name" || sortKey === "username"}
                          onClick={() => setSortKey("name")}
                        >
                          {t.user}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.contact ? (
                      <TableHeaderCell className="w-[220px]">
                        <HeaderSortButton
                          active={sortKey === "email"}
                          onClick={() => setSortKey("email")}
                        >
                          {t.contact}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.userType ? (
                      <TableHeaderCell className="w-[140px]">
                        <HeaderSortButton
                          active={sortKey === "user_type"}
                          onClick={() => setSortKey("user_type")}
                        >
                          {t.userType}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.role ? (
                      <TableHeaderCell className="w-[145px]">
                        <HeaderSortButton
                          active={sortKey === "role"}
                          onClick={() => setSortKey("role")}
                        >
                          {t.role}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.workspace ? (
                      <TableHeaderCell className="w-[115px]">{t.workspace}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.actor ? (
                      <TableHeaderCell className="w-[170px]">{t.actor}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.groups ? (
                      <TableHeaderCell className="w-[160px]">{t.groups}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.status ? (
                      <TableHeaderCell className="w-[105px]">{t.status}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.staff ? (
                      <TableHeaderCell className="w-[100px]">{t.staff}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.lastLogin ? (
                      <TableHeaderCell className="w-[140px]">
                        <HeaderSortButton
                          active={sortKey === "last_login"}
                          onClick={() => setSortKey("last_login")}
                        >
                          {t.lastLogin}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.createdAt ? (
                      <TableHeaderCell className="w-[120px]">
                        <HeaderSortButton
                          active={sortKey === "newest" || sortKey === "oldest"}
                          onClick={() => setSortKey("newest")}
                        >
                          {t.createdAt}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.actions ? (
                      <TableHeaderCell className="w-[72px] text-center">
                        {t.actions}
                      </TableHeaderCell>
                    ) : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sortedUsers.length ? (
                    sortedUsers.map((user) => {
                      const displayName = getUserDisplayName(user);

                      return (
                        <TableRow key={user.id} className="h-[62px]">
                          {visibleColumns.select ? (
                            <TableBodyCell className="w-[46px] px-3">
                              <Checkbox
                                checked={selectedIds.includes(user.id)}
                                onCheckedChange={(checked) =>
                                  toggleSelectUser(user.id, Boolean(checked))
                                }
                                aria-label={displayName}
                              />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.user ? (
                            <TableBodyCell className="w-[240px]">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                                  <UserCog className="h-4 w-4 text-muted-foreground" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <Link
                                    href={`/system/users/${user.id}`}
                                    className="block truncate text-sm font-semibold text-foreground hover:underline"
                                  >
                                    {displayName}
                                  </Link>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {user.username || "—"}
                                  </p>
                                </div>
                              </div>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.contact ? (
                            <TableBodyCell className="w-[220px]">
                              <div className="min-w-0 space-y-0.5">
                                <p className="truncate text-sm text-foreground">
                                  {user.email || t.noContact}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {user.phone || user.whatsapp_number || user.phone_number || "—"}
                                </p>
                              </div>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.userType ? (
                            <TableBodyCell className="w-[140px]">
                              <Badge
                                variant="outline"
                                className="max-w-full rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium"
                              >
                                <span className="truncate">
                                  {getUserTypeLabel(user.user_type, locale)}
                                </span>
                              </Badge>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.role ? (
                            <TableBodyCell className="w-[145px]">
                              <span className="block truncate text-sm font-medium">
                                {getRoleLabel(user.role, locale)}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.workspace ? (
                            <TableBodyCell className="w-[115px]">
                              <span className="block truncate text-sm text-muted-foreground">
                                {getWorkspaceLabel(user.workspace, locale)}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.actor ? (
                            <TableBodyCell className="w-[170px]">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "max-w-full rounded-full px-2.5 py-1 text-xs font-medium",
                                  getActorBadgeClass(user),
                                )}
                              >
                                <span className="truncate">{getActorLabel(user, locale)}</span>
                              </Badge>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.groups ? (
                            <TableBodyCell className="w-[160px]">
                              <span className="block truncate text-sm text-muted-foreground">
                                {user.groups.length ? user.groups.join(", ") : "—"}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.status ? (
                            <TableBodyCell className="w-[105px]">
                              <StatusBadge user={user} locale={locale} />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.staff ? (
                            <TableBodyCell className="w-[100px]">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs font-medium",
                                  user.is_superuser
                                    ? "border-violet-500/30 bg-violet-50 text-violet-700"
                                    : user.is_staff
                                      ? "border-blue-500/30 bg-blue-50 text-blue-700"
                                      : "border-muted bg-muted/40 text-muted-foreground",
                                )}
                              >
                                {user.is_superuser ? t.superuser : user.is_staff ? t.yes : t.normal}
                              </Badge>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.lastLogin ? (
                            <TableBodyCell className="w-[140px]">
                              <span className="block truncate text-sm tabular-nums text-muted-foreground">
                                {formatDateTime(user.last_login)}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.createdAt ? (
                            <TableBodyCell className="w-[120px]">
                              <span className="block truncate text-sm tabular-nums text-muted-foreground">
                                {formatDate(user.date_joined)}
                              </span>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.actions ? (
                            <TableBodyCell className="w-[72px] text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    disabled={actionLoadingId === user.id}
                                  >
                                    {actionLoadingId === user.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreHorizontal className="h-4 w-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                  align={locale === "ar" ? "start" : "end"}
                                  className="w-56"
                                >
                                  <DropdownMenuItem asChild>
                                    <Link href={`/system/users/${user.id}`}>
                                      <Eye className="h-4 w-4" />
                                      {t.view}
                                    </Link>
                                  </DropdownMenuItem>

                                  {user.username ? (
                                    <DropdownMenuItem
                                      onClick={() => void copyValue(user.username)}
                                    >
                                      <Copy className="h-4 w-4" />
                                      {t.copyUsername}
                                    </DropdownMenuItem>
                                  ) : null}

                                  {user.email ? (
                                    <DropdownMenuItem
                                      onClick={() => void copyValue(user.email)}
                                    >
                                      <Copy className="h-4 w-4" />
                                      {t.copyEmail}
                                    </DropdownMenuItem>
                                  ) : null}

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    onClick={() => void generatePasswordLink(user)}
                                    disabled={!user.is_active}
                                  >
                                    <KeyRound className="h-4 w-4" />
                                    {t.passwordLink}
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    onClick={() => void runUserAction(user, "activate")}
                                    disabled={user.is_active}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    {t.activate}
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => void runUserAction(user, "deactivate")}
                                    disabled={!user.is_active}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    {t.deactivate}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableBodyCell>
                          ) : null}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={visibleColumnCount} className="h-72">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                            <Users className="h-6 w-6 text-muted-foreground" />
                          </div>

                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {hasActiveFilters ? t.noResultsTitle : t.noDataTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {hasActiveFilters ? t.noResultsDesc : t.noDataDesc}
                            </p>
                          </div>

                          {hasActiveFilters ? (
                            <Button
                              variant="outline"
                              className="h-9 rounded-lg"
                              onClick={resetFilters}
                            >
                              <RotateCcw className="h-4 w-4" />
                              {t.reset}
                            </Button>
                          ) : (
                            <Button
                              asChild
                              className="h-9 rounded-lg bg-black text-white hover:bg-black/90"
                            >
                              <Link href="/system/users/create">
                                <Plus className="h-4 w-4" />
                                {t.create}
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {t.showing}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(sortedUsers.length)}
              </span>{" "}
              {t.of}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(pagination.total)}
              </span>{" "}
              {t.rows}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={page <= 1 || refreshing}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                {t.previous}
              </Button>

              <div className="rounded-lg border bg-background px-3 py-2 text-sm tabular-nums">
                {t.page} {formatInteger(page)} {t.of}{" "}
                {formatInteger(pagination.total_pages)}
              </div>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={page >= pagination.total_pages || refreshing}
                onClick={() =>
                  setPage((current) =>
                    Math.min(current + 1, pagination.total_pages),
                  )
                }
              >
                {t.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}