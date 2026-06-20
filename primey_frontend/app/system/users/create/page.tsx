"use client";

/* ============================================================
   📂 primey_frontend/app/system/users/create/page.tsx
   👤 Primey Care — Create Login Account V2
   ------------------------------------------------------------
   ✅ إنشاء حساب دخول فقط
   ✅ لا ينشئ بيانات تشغيلية للعميل / مقدم الخدمة / المندوب / الوسيط
   ✅ يدعم ربط اختياري بكيان موجود entity_type/entity_id
   ✅ يدعم actor_type/actor_id للتوافق مع auth_center
   ✅ UserType مطابق للباكند:
      SUPER_ADMIN / SYSTEM / STAFF / ACCOUNTANT / PROVIDER / CENTER / CUSTOMER / AGENT / BROKER / OTHER
   ✅ لا يحوّل تلقائيًا بعد الإنشاء حتى يظهر رابط كلمة المرور
   ✅ Fallback من /api/users/create/ إلى /api/users/
   ✅ Same approved Products / Customers / Agents create pattern
   ✅ Internal UI components only
   ✅ No localhost
   ✅ No fake operational records
   ✅ sonner toast
   ✅ RTL/LTR via primey-locale
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  UserPlus,
  Users,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

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

type EntityType =
  | "none"
  | "system"
  | "provider"
  | "center"
  | "customer"
  | "agent"
  | "broker";

type FormState = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  phone_number: string;
  whatsapp_number: string;
  alternate_email: string;
  password: string;
  send_password_link: boolean;

  user_type: UserType;
  role: UserRole;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;

  preferred_language: Locale;
  timezone: string;
  notes: string;
  tags: string;

  entity_type: EntityType;
  entity_id: string;
  actor_name: string;
  actor_code: string;
};

type CreatedUser = {
  id?: number | string;
  username?: string;
  email?: string;
  reset?: {
    reset_url?: string;
    reset_path?: string;
    uid?: string;
    token?: string;
  };
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  errors?: unknown;
  user?: CreatedUser;
  item?: CreatedUser;
  data?: CreatedUser | { user?: CreatedUser; item?: CreatedUser; reset?: CreatedUser["reset"] };
  reset?: CreatedUser["reset"];
};

const translations = {
  ar: {
    title: "إنشاء حساب دخول",
    subtitle:
      "إنشاء حساب دخول فقط وربطه اختياريًا بكيان موجود. بيانات العميل أو مقدم الخدمة أو المندوب أو الوسيط تدار من صفحاتهم التشغيلية.",
    users: "حسابات الدخول",
    back: "رجوع",
    save: "إنشاء الحساب",
    saving: "جاري الإنشاء...",
    reset: "إعادة ضبط",
    copy: "نسخ",
    copied: "تم النسخ",
    openUser: "فتح الحساب",
    createAnother: "إنشاء حساب آخر",
    created: "تم إنشاء حساب الدخول بنجاح",
    passwordLinkCreated: "تم إنشاء رابط كلمة المرور",
    noPermission: "لا تملك صلاحية إنشاء حسابات الدخول",

    accountSection: "بيانات حساب الدخول",
    accountSectionDesc: "اسم المستخدم، البريد، الاسم، ورقم الجوال.",
    roleSection: "الدور والصلاحيات",
    roleSectionDesc: "نوع الحساب، الدور، وحالة الحساب.",
    linkSection: "الربط بكيان موجود",
    linkSectionDesc:
      "اختياري: اربط حساب الدخول بعميل أو مقدم خدمة أو مندوب أو وسيط موجود مسبقًا.",
    securitySection: "الأمان ورابط كلمة المرور",
    securitySectionDesc: "كلمة مرور اختيارية أو رابط إعداد كلمة المرور.",
    summarySection: "ملخص الحساب",
    summarySectionDesc: "مراجعة سريعة قبل الحفظ.",

    username: "اسم المستخدم",
    email: "البريد الإلكتروني",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    displayName: "اسم العرض",
    phone: "الجوال",
    whatsapp: "واتساب",
    alternateEmail: "بريد بديل",
    password: "كلمة المرور",
    passwordHint: "اتركها فارغة إذا سيتم إرسال رابط إعداد كلمة المرور.",
    sendPasswordLink: "توليد رابط إعداد كلمة المرور بعد الإنشاء",

    userType: "نوع الحساب",
    role: "الدور",
    active: "نشط",
    staff: "موظف",
    superuser: "سوبر أدمن",
    preferredLanguage: "اللغة المفضلة",
    timezone: "المنطقة الزمنية",
    tags: "الوسوم",
    notes: "الملاحظات",

    entityType: "نوع الكيان",
    entityId: "معرّف الكيان",
    actorName: "اسم الكيان",
    actorCode: "كود الكيان",
    entityNone: "بدون ربط",
    entitySystem: "النظام",
    entityProvider: "مقدم خدمة",
    entityCenter: "مركز",
    entityCustomer: "عميل",
    entityAgent: "مندوب",
    entityBroker: "وسيط",

    superAdmin: "سوبر أدمن",
    system: "النظام",
    staffUser: "موظف نظام",
    accountant: "محاسب",
    provider: "مقدم خدمة",
    center: "مركز",
    customer: "عميل",
    agent: "مندوب",
    broker: "وسيط",
    other: "أخرى",

    systemAdmin: "مدير النظام",
    providerAdmin: "مدير مقدم خدمة",
    customerUser: "مستخدم عميل",
    agentUser: "مستخدم مندوب",
    brokerUser: "مستخدم وسيط",
    support: "الدعم",
    viewer: "مشاهد",

    requiredIdentifier: "اسم المستخدم أو البريد أو الجوال مطلوب.",
    invalidEmail: "صيغة البريد الإلكتروني غير صحيحة.",
    invalidAlternateEmail: "صيغة البريد البديل غير صحيحة.",
    shortPassword: "كلمة المرور يجب ألا تقل عن 8 أحرف.",
    invalidEntityId: "معرّف الكيان يجب أن يكون رقمًا صحيحًا.",
    submitError: "تعذر إنشاء الحساب",
    unknownError: "حدث خطأ غير متوقع.",
    yes: "نعم",
    no: "لا",
    optional: "اختياري",
    required: "مطلوب",
    readOnlyLinkNote:
      "هذا الربط لا ينشئ أو يعدل بيانات تشغيلية. يتم إرسال IDs فقط للباكند لربط حساب الدخول بكيان موجود.",
    afterCreateNote:
      "بعد الإنشاء سيظهر رابط كلمة المرور هنا ولن يتم تحويلك تلقائيًا حتى تنسخه أو تفتحه.",
    resetUrl: "رابط إعداد كلمة المرور",
    createdUser: "الحساب المنشأ",
  },
  en: {
    title: "Create Login Account",
    subtitle:
      "Create login account only and optionally link it to an existing actor. Customer, provider, agent, and broker operational data stays in their own pages.",
    users: "Login Accounts",
    back: "Back",
    save: "Create Account",
    saving: "Creating...",
    reset: "Reset",
    copy: "Copy",
    copied: "Copied",
    openUser: "Open account",
    createAnother: "Create another",
    created: "Login account created successfully",
    passwordLinkCreated: "Password setup link created",
    noPermission: "You do not have permission to create login accounts",

    accountSection: "Login Account Data",
    accountSectionDesc: "Username, email, name, and mobile number.",
    roleSection: "Role & Permissions",
    roleSectionDesc: "Account type, role, and account status.",
    linkSection: "Link to Existing Actor",
    linkSectionDesc:
      "Optional: link the login account to an existing customer, provider, agent, or broker.",
    securitySection: "Security & Password Link",
    securitySectionDesc: "Optional password or password setup link.",
    summarySection: "Account Summary",
    summarySectionDesc: "Quick review before saving.",

    username: "Username",
    email: "Email",
    firstName: "First name",
    lastName: "Last name",
    displayName: "Display name",
    phone: "Phone",
    whatsapp: "WhatsApp",
    alternateEmail: "Alternate email",
    password: "Password",
    passwordHint: "Leave empty if a password setup link will be generated.",
    sendPasswordLink: "Generate password setup link after creation",

    userType: "Account type",
    role: "Role",
    active: "Active",
    staff: "Staff",
    superuser: "Superuser",
    preferredLanguage: "Preferred language",
    timezone: "Timezone",
    tags: "Tags",
    notes: "Notes",

    entityType: "Actor type",
    entityId: "Actor ID",
    actorName: "Actor name",
    actorCode: "Actor code",
    entityNone: "No link",
    entitySystem: "System",
    entityProvider: "Provider",
    entityCenter: "Center",
    entityCustomer: "Customer",
    entityAgent: "Agent",
    entityBroker: "Broker",

    superAdmin: "Super admin",
    system: "System",
    staffUser: "System staff",
    accountant: "Accountant",
    provider: "Provider",
    center: "Center",
    customer: "Customer",
    agent: "Agent",
    broker: "Broker",
    other: "Other",

    systemAdmin: "System admin",
    providerAdmin: "Provider admin",
    customerUser: "Customer user",
    agentUser: "Agent user",
    brokerUser: "Broker user",
    support: "Support",
    viewer: "Viewer",

    requiredIdentifier: "Username, email, or phone is required.",
    invalidEmail: "Email format is invalid.",
    invalidAlternateEmail: "Alternate email format is invalid.",
    shortPassword: "Password must be at least 8 characters.",
    invalidEntityId: "Actor ID must be a valid number.",
    submitError: "Unable to create account",
    unknownError: "Unexpected error occurred.",
    yes: "Yes",
    no: "No",
    optional: "Optional",
    required: "Required",
    readOnlyLinkNote:
      "This link does not create or update operational data. It only sends IDs to the backend to link the login account to an existing actor.",
    afterCreateNote:
      "After creation, the password setup link will appear here and you will not be redirected automatically until you copy or open it.",
    resetUrl: "Password setup link",
    createdUser: "Created account",
  },
} as const;

const initialForm: FormState = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  display_name: "",
  phone_number: "",
  whatsapp_number: "",
  alternate_email: "",
  password: "",
  send_password_link: true,

  user_type: "STAFF",
  role: "viewer",
  is_active: true,
  is_staff: false,
  is_superuser: false,

  preferred_language: "ar",
  timezone: "Asia/Riyadh",
  notes: "",
  tags: "",

  entity_type: "none",
  entity_id: "",
  actor_name: "",
  actor_code: "",
};

const draftKey = "primey-care-system-users-create-draft-v2";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
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
  path: string,
  options?: {
    method?: "GET" | "POST";
    body?: unknown;
  },
): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(makeApiUrl(path), {
    method: options?.method || "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
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

function userTypeLabel(value: UserType, locale: Locale) {
  const t = translations[locale];

  const labels: Record<UserType, string> = {
    SUPER_ADMIN: t.superAdmin,
    SYSTEM: t.system,
    STAFF: t.staffUser,
    ACCOUNTANT: t.accountant,
    PROVIDER: t.provider,
    CENTER: t.center,
    CUSTOMER: t.customer,
    AGENT: t.agent,
    BROKER: t.broker,
    OTHER: t.other,
  };

  return labels[value] || t.other;
}

function roleLabel(value: UserRole, locale: Locale) {
  const t = translations[locale];

  const labels: Record<UserRole, string> = {
    system_admin: t.systemAdmin,
    provider_admin: t.providerAdmin,
    customer_user: t.customerUser,
    agent_user: t.agentUser,
    broker_user: t.brokerUser,
    accountant: t.accountant,
    support: t.support,
    viewer: t.viewer,
  };

  return labels[value] || t.viewer;
}

function entityLabel(value: EntityType, locale: Locale) {
  const t = translations[locale];

  const labels: Record<EntityType, string> = {
    none: t.entityNone,
    system: t.entitySystem,
    provider: t.entityProvider,
    center: t.entityCenter,
    customer: t.entityCustomer,
    agent: t.entityAgent,
    broker: t.entityBroker,
  };

  return labels[value] || t.entityNone;
}

function getCreatedUser(payload: ApiResponse): CreatedUser {
  const data = asRecord(payload.data);

  if (payload.user) return payload.user;
  if (payload.item) return payload.item;
  if (data.user && isRecord(data.user)) return data.user as CreatedUser;
  if (data.item && isRecord(data.item)) return data.item as CreatedUser;
  if (data.id || data.username || data.email) return data as CreatedUser;

  return {};
}

function getResetUrl(payload: ApiResponse) {
  const data = asRecord(payload.data);
  const user = getCreatedUser(payload);
  const reset = asRecord(payload.reset || data.reset || user.reset);

  return normalizeText(reset.reset_url || reset.reset_path);
}

function validateForm(form: FormState, locale: Locale) {
  const t = translations[locale];

  if (!form.username.trim() && !form.email.trim() && !form.phone_number.trim()) {
    return t.requiredIdentifier;
  }

  if (form.email.trim() && !isValidEmail(form.email)) {
    return t.invalidEmail;
  }

  if (form.alternate_email.trim() && !isValidEmail(form.alternate_email)) {
    return t.invalidAlternateEmail;
  }

  if (form.password.trim() && form.password.trim().length < 8) {
    return t.shortPassword;
  }

  if (form.entity_type !== "none" && form.entity_type !== "system") {
    const id = toNumber(form.entity_id);
    if (!id || id <= 0) return t.invalidEntityId;
  }

  return "";
}

function buildPayload(form: FormState) {
  const tags = form.tags
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const payload: ApiRecord = {
    username: form.username.trim(),
    email: form.email.trim().toLowerCase(),
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    display_name: form.display_name.trim(),
    phone_number: form.phone_number.trim(),
    phone: form.phone_number.trim(),
    mobile: form.phone_number.trim(),
    whatsapp_number: form.whatsapp_number.trim(),
    alternate_email: form.alternate_email.trim().toLowerCase(),
    user_type: form.user_type,
    role: form.role,
    is_active: form.is_active,
    status: form.is_active ? "ACTIVE" : "INACTIVE",
    is_staff: form.is_staff,
    is_superuser: form.is_superuser,
    preferred_language: form.preferred_language,
    timezone: form.timezone.trim() || "Asia/Riyadh",
    notes: form.notes.trim(),
    tags,
    send_password_link: form.send_password_link,
  };

  if (form.password.trim()) {
    payload.password = form.password.trim();
  }

  if (form.entity_type !== "none") {
    const actorType = form.entity_type === "system" ? "system" : form.entity_type;
    const actorId = form.entity_type === "system" ? null : toNumber(form.entity_id);

    payload.entity_type = actorType;
    payload.entity_id = actorId;
    payload.actor_type = actorType;
    payload.actor_id = actorId;

    if (form.actor_name.trim()) payload.actor_name = form.actor_name.trim();
    if (form.actor_code.trim()) payload.actor_code = form.actor_code.trim();

    if (actorType === "provider") payload.provider_id = actorId;
    if (actorType === "center") payload.center_id = actorId;
    if (actorType === "customer") payload.customer_id = actorId;
    if (actorType === "agent") payload.agent_id = actorId;
    if (actorType === "broker") payload.broker_id = actorId;
  }

  return payload;
}

function defaultRoleForUserType(userType: UserType): UserRole {
  if (userType === "SUPER_ADMIN" || userType === "SYSTEM") return "system_admin";
  if (userType === "PROVIDER" || userType === "CENTER") return "provider_admin";
  if (userType === "CUSTOMER") return "customer_user";
  if (userType === "AGENT") return "agent_user";
  if (userType === "BROKER") return "broker_user";
  if (userType === "ACCOUNTANT") return "accountant";
  if (userType === "STAFF") return "support";
  return "viewer";
}

function defaultEntityForUserType(userType: UserType): EntityType {
  if (userType === "PROVIDER") return "provider";
  if (userType === "CENTER") return "center";
  if (userType === "CUSTOMER") return "customer";
  if (userType === "AGENT") return "agent";
  if (userType === "BROKER") return "broker";
  if (userType === "SUPER_ADMIN" || userType === "SYSTEM" || userType === "STAFF" || userType === "ACCOUNTANT") {
    return "system";
  }

  return "none";
}

function createEndpoints() {
  return ["/api/users/create/", "/api/users/"];
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

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-foreground">
      {children}
      {required ? <span className="mx-1 text-red-500">*</span> : null}
    </label>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-left text-sm font-medium text-foreground">
        {value || "—"}
      </div>
    </div>
  );
}

export default function CreateSystemUserPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [createdUser, setCreatedUser] = React.useState<CreatedUser | null>(null);
  const [resetUrl, setResetUrl] = React.useState("");
  const [hasDraft, setHasDraft] = React.useState(false);

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

    setHasDraft(Boolean(window.localStorage.getItem(draftKey)));

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  React.useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!saving && JSON.stringify(form) !== JSON.stringify(initialForm) && !createdUser) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [createdUser, form, saving]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function updateUserType(value: UserType) {
    setForm((current) => {
      const nextRole = defaultRoleForUserType(value);
      const nextEntity = defaultEntityForUserType(value);

      return {
        ...current,
        user_type: value,
        role: nextRole,
        entity_type: nextEntity,
        entity_id: nextEntity === "system" || nextEntity === "none" ? "" : current.entity_id,
      };
    });

    setError("");
  }

  function saveDraft() {
    window.localStorage.setItem(draftKey, JSON.stringify(form));
    setHasDraft(true);
    toast.success(locale === "ar" ? "تم حفظ المسودة." : "Draft saved.");
  }

  function restoreDraft() {
    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<FormState>;
      setForm({ ...initialForm, ...parsed });
      setHasDraft(true);
      toast.success(locale === "ar" ? "تم استعادة المسودة." : "Draft restored.");
    } catch {
      window.localStorage.removeItem(draftKey);
      setHasDraft(false);
    }
  }

  function clearDraft() {
    window.localStorage.removeItem(draftKey);
    setHasDraft(false);
    toast.success(locale === "ar" ? "تم حذف المسودة." : "Draft deleted.");
  }

  function resetForm() {
    if (JSON.stringify(form) !== JSON.stringify(initialForm)) {
      const confirmed = window.confirm(locale === "ar" ? "هل تريد مسح بيانات النموذج؟" : "Clear form data?");
      if (!confirmed) return;
    }

    setForm(initialForm);
    setError("");
    setCreatedUser(null);
    setResetUrl("");
  }

  async function copyText(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.unknownError);
    }
  }

  async function submitForm() {
    const validationError = validateForm(form, locale);

    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setCreatedUser(null);
    setResetUrl("");

    const payload = buildPayload(form);
    let lastError = "";

    try {
      for (const endpoint of createEndpoints()) {
        try {
          const response = await fetchJson<ApiResponse>(endpoint, {
            method: "POST",
            body: payload,
          });

          const nextCreatedUser = getCreatedUser(response);
          const nextResetUrl = getResetUrl(response);

          setCreatedUser(nextCreatedUser);
          setResetUrl(nextResetUrl);

          window.localStorage.removeItem(draftKey);
          setHasDraft(false);

          toast.success(t.created);

          if (nextResetUrl) {
            toast.success(t.passwordLinkCreated);
          }

          return;
        } catch (caughtError) {
          lastError =
            caughtError instanceof Error && caughtError.message
              ? caughtError.message
              : t.unknownError;

          if (!endpoint.includes("/create/")) {
            throw caughtError;
          }
        }
      }
    } catch {
      setError(lastError || t.submitError);
      toast.error(lastError || t.submitError);
    } finally {
      setSaving(false);
    }
  }

  const createdId = createdUser?.id ? String(createdUser.id) : "";
  const hasEntityLink = form.entity_type !== "none";
  const showEntityId = form.entity_type !== "none" && form.entity_type !== "system";

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
            <Link href="/system/users">
              <BackIcon className="h-4 w-4" />
              {t.users}
            </Link>
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={saveDraft} disabled={saving}>
            <Save className="h-4 w-4" />
            {locale === "ar" ? "حفظ مسودة" : "Save draft"}
          </Button>

          {hasDraft ? (
            <>
              <Button variant="outline" className="h-9 rounded-lg" onClick={restoreDraft} disabled={saving}>
                <RefreshCw className="h-4 w-4" />
                {locale === "ar" ? "استعادة" : "Restore"}
              </Button>

              <Button variant="outline" className="h-9 rounded-lg" onClick={clearDraft} disabled={saving}>
                <X className="h-4 w-4" />
                {locale === "ar" ? "حذف المسودة" : "Delete draft"}
              </Button>
            </>
          ) : null}

          <Button variant="outline" className="h-9 rounded-lg" onClick={resetForm} disabled={saving}>
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </Button>

          <Button
            className="h-9 rounded-lg bg-black text-white hover:bg-black/90"
            onClick={() => void submitForm()}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {saving ? t.saving : t.save}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-4">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="space-y-1 text-right">
              <p className="font-semibold text-red-900">{t.submitError}</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {createdUser ? (
        <Card className="rounded-lg border border-emerald-200 bg-emerald-50 shadow-none">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1 text-right">
                <p className="font-semibold text-emerald-900">{t.created}</p>
                <p className="text-sm text-emerald-700">
                  {t.createdUser}: {createdUser.username || createdUser.email || createdId || "—"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {createdId ? (
                  <Button asChild variant="outline" className="h-9 rounded-lg bg-white">
                    <Link href={`/system/users/${createdId}`}>
                      <Eye className="h-4 w-4" />
                      {t.openUser}
                    </Link>
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-white"
                  onClick={() => {
                    setCreatedUser(null);
                    setResetUrl("");
                    setForm(initialForm);
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  {t.createAnother}
                </Button>
              </div>
            </div>

            {resetUrl ? (
              <div className="rounded-lg border border-emerald-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-emerald-900">{t.resetUrl}</p>
                  <Button variant="outline" size="sm" onClick={() => void copyText(resetUrl)}>
                    <Copy className="h-4 w-4" />
                    {t.copy}
                  </Button>
                </div>
                <p className="break-all text-sm text-emerald-700" dir="ltr">
                  {resetUrl}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="h-4 w-4 text-muted-foreground" />
                {t.accountSection}
              </CardTitle>
              <CardDescription>{t.accountSectionDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>{t.username}</FieldLabel>
                <Input
                  value={form.username}
                  onChange={(event) => updateForm("username", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.email}</FieldLabel>
                <Input
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  autoComplete="email"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.firstName}</FieldLabel>
                <Input
                  value={form.first_name}
                  onChange={(event) => updateForm("first_name", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.lastName}</FieldLabel>
                <Input
                  value={form.last_name}
                  onChange={(event) => updateForm("last_name", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.displayName}</FieldLabel>
                <Input
                  value={form.display_name}
                  onChange={(event) => updateForm("display_name", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.phone}</FieldLabel>
                <Input
                  value={form.phone_number}
                  onChange={(event) => updateForm("phone_number", event.target.value)}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                  inputMode="tel"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.whatsapp}</FieldLabel>
                <Input
                  value={form.whatsapp_number}
                  onChange={(event) => updateForm("whatsapp_number", event.target.value)}
                  className="h-10 rounded-lg bg-background text-right tabular-nums"
                  dir="ltr"
                  inputMode="tel"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.alternateEmail}</FieldLabel>
                <Input
                  value={form.alternate_email}
                  onChange={(event) => updateForm("alternate_email", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                {t.roleSection}
              </CardTitle>
              <CardDescription>{t.roleSectionDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required>{t.userType}</FieldLabel>
                <Select value={form.user_type} onValueChange={(value) => updateUserType(value as UserType)}>
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
                <FieldLabel required>{t.role}</FieldLabel>
                <Select value={form.role} onValueChange={(value) => updateForm("role", value as UserRole)}>
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

              <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="space-y-1 text-right">
                  <p className="text-sm font-medium">{t.active}</p>
                  <p className="text-xs text-muted-foreground">{form.is_active ? t.yes : t.no}</p>
                </div>
                <Checkbox
                  checked={form.is_active}
                  onCheckedChange={(value) => updateForm("is_active", Boolean(value))}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="space-y-1 text-right">
                  <p className="text-sm font-medium">{t.staff}</p>
                  <p className="text-xs text-muted-foreground">{form.is_staff ? t.yes : t.no}</p>
                </div>
                <Checkbox
                  checked={form.is_staff}
                  onCheckedChange={(value) => updateForm("is_staff", Boolean(value))}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="space-y-1 text-right">
                  <p className="text-sm font-medium">{t.superuser}</p>
                  <p className="text-xs text-muted-foreground">{form.is_superuser ? t.yes : t.no}</p>
                </div>
                <Checkbox
                  checked={form.is_superuser}
                  onCheckedChange={(value) => updateForm("is_superuser", Boolean(value))}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.preferredLanguage}</FieldLabel>
                <Select value={form.preferred_language} onValueChange={(value) => updateForm("preferred_language", value as Locale)}>
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
                  className="h-10 rounded-lg bg-background"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.tags}</FieldLabel>
                <Input
                  value={form.tags}
                  onChange={(event) => updateForm("tags", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  placeholder={locale === "ar" ? "وسم 1, وسم 2" : "tag 1, tag 2"}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {t.linkSection}
              </CardTitle>
              <CardDescription>{t.linkSectionDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pb-6">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                {t.readOnlyLinkNote}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>{t.entityType}</FieldLabel>
                  <Select
                    value={form.entity_type}
                    onValueChange={(value) => {
                      const nextEntity = value as EntityType;
                      setForm((current) => ({
                        ...current,
                        entity_type: nextEntity,
                        entity_id: nextEntity === "none" || nextEntity === "system" ? "" : current.entity_id,
                      }));
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t.entityNone}</SelectItem>
                      <SelectItem value="system">{t.entitySystem}</SelectItem>
                      <SelectItem value="provider">{t.entityProvider}</SelectItem>
                      <SelectItem value="center">{t.entityCenter}</SelectItem>
                      <SelectItem value="customer">{t.entityCustomer}</SelectItem>
                      <SelectItem value="agent">{t.entityAgent}</SelectItem>
                      <SelectItem value="broker">{t.entityBroker}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showEntityId ? (
                  <div className="space-y-2">
                    <FieldLabel required>{t.entityId}</FieldLabel>
                    <Input
                      value={form.entity_id}
                      onChange={(event) => updateForm("entity_id", event.target.value.replace(/[^\d]/g, ""))}
                      className="h-10 rounded-lg bg-background tabular-nums"
                      dir="ltr"
                      inputMode="numeric"
                    />
                  </div>
                ) : null}

                {hasEntityLink ? (
                  <>
                    <div className="space-y-2">
                      <FieldLabel>{t.actorName}</FieldLabel>
                      <Input
                        value={form.actor_name}
                        onChange={(event) => updateForm("actor_name", event.target.value)}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel>{t.actorCode}</FieldLabel>
                      <Input
                        value={form.actor_code}
                        onChange={(event) => updateForm("actor_code", event.target.value)}
                        className="h-10 rounded-lg bg-background"
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle className="flex items-center gap-2 text-base">
                <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                {t.securitySection}
              </CardTitle>
              <CardDescription>{t.securitySectionDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pb-6">
              <div className="space-y-2">
                <FieldLabel>{t.password}</FieldLabel>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateForm("password", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                  placeholder={t.passwordHint}
                  autoComplete="new-password"
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="space-y-1 text-right">
                  <p className="text-sm font-medium">{t.sendPasswordLink}</p>
                  <p className="text-xs text-muted-foreground">{t.afterCreateNote}</p>
                </div>
                <Checkbox
                  checked={form.send_password_link}
                  onCheckedChange={(value) => updateForm("send_password_link", Boolean(value))}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.notes}</FieldLabel>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="sticky top-20 space-y-4">
            <div className="grid gap-3">
              <MetricCard
                title={t.userType}
                value={userTypeLabel(form.user_type, locale)}
                icon={UserCog}
              />
              <MetricCard
                title={t.role}
                value={roleLabel(form.role, locale)}
                icon={ShieldCheck}
              />
              <MetricCard
                title={t.entityType}
                value={entityLabel(form.entity_type, locale)}
                icon={Building2}
              />
            </div>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-5 py-4">
                <CardTitle className="text-base">{t.summarySection}</CardTitle>
                <CardDescription>{t.summarySectionDesc}</CardDescription>
              </CardHeader>

              <CardContent className="px-5 pb-5">
                <InfoLine label={t.username} value={form.username || "—"} />
                <InfoLine label={t.email} value={form.email || "—"} />
                <InfoLine label={t.phone} value={form.phone_number || "—"} />
                <InfoLine label={t.displayName} value={form.display_name || [form.first_name, form.last_name].filter(Boolean).join(" ") || "—"} />
                <InfoLine label={t.userType} value={userTypeLabel(form.user_type, locale)} />
                <InfoLine label={t.role} value={roleLabel(form.role, locale)} />
                <InfoLine label={t.active} value={form.is_active ? t.yes : t.no} />
                <InfoLine label={t.entityType} value={entityLabel(form.entity_type, locale)} />
                <InfoLine label={t.entityId} value={form.entity_id || "—"} />

                <div className="pt-4">
                  <Button
                    className="h-10 w-full rounded-lg bg-black text-white hover:bg-black/90"
                    onClick={() => void submitForm()}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {saving ? t.saving : t.save}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <KeyRound className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1 text-right">
                    <p className="text-sm font-semibold">{t.securitySection}</p>
                    <p className="text-sm text-muted-foreground">{t.afterCreateNote}</p>
                  </div>
                </div>

                <Badge variant="outline" className="rounded-full bg-muted/40 px-2.5 py-1">
                  {form.send_password_link ? t.yes : t.no}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}