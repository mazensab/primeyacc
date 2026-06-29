"use client";
/* ============================================================
   📂 primey_frontend/app/system/users/create/page.tsx
   👤 Mhamcloud — Create System User
   ------------------------------------------------------------
   ✅ Real API only: POST /api/users/
   ✅ CSRF/session auth with credentials include
   ✅ Arabic/English via primey-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
type Locale = "ar" | "en";
type FormState = {
  username: string;
  password: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  system_role: "SUPER_ADMIN" | "SYSTEM_ADMIN" | "SUPPORT" | "BILLING_MANAGER";
  status: "active" | "inactive";
  notes: string;
};
const API_ENDPOINT = "/api/users/";
const CSRF_ENDPOINT = "/api/auth/csrf";
const initialForm: FormState = {
  username: "",
  password: "",
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  system_role: "SUPPORT",
  status: "active",
  notes: "",
};
const translations = {
  ar: {
    title: "إضافة مستخدم نظام",
    subtitle: "إنشاء مستخدم جديد داخل إدارة منصة Mhamcloud باستخدام API الحقيقي فقط.",
    badge: "إدارة المنصة",
    back: "العودة للمستخدمين",
    list: "قائمة المستخدمين",
    reports: "تقارير المستخدمين",
    save: "إنشاء المستخدم",
    saving: "جاري الإنشاء...",
    account: "بيانات الحساب",
    profile: "بيانات التواصل",
    access: "الدور والحالة",
    username: "اسم الدخول",
    password: "كلمة المرور",
    email: "البريد الإلكتروني",
    firstName: "الاسم الأول",
    lastName: "الاسم الأخير",
    phone: "رقم الجوال",
    role: "دور النظام",
    status: "حالة المستخدم",
    notes: "ملاحظات",
    active: "نشط",
    inactive: "غير نشط",
    hint: "سيتم إرسال الطلب إلى /api/users/ باستخدام Session + CSRF.",
    required: "اسم الدخول وكلمة المرور مطلوبة، وكلمة المرور 8 أحرف على الأقل.",
    success: "تم إنشاء المستخدم بنجاح.",
    failed: "تعذر إنشاء المستخدم.",
  },
  en: {
    title: "Add system user",
    subtitle: "Create a new Mhamcloud platform user using the real API only.",
    badge: "Platform management",
    back: "Back to users",
    list: "Users list",
    reports: "Users reports",
    save: "Create user",
    saving: "Creating...",
    account: "Account details",
    profile: "Contact details",
    access: "Role and status",
    username: "Username",
    password: "Password",
    email: "Email",
    firstName: "First name",
    lastName: "Last name",
    phone: "Phone",
    role: "System role",
    status: "User status",
    notes: "Notes",
    active: "Active",
    inactive: "Inactive",
    hint: "The request will be sent to /api/users/ using Session + CSRF.",
    required: "Username and password are required. Password must be at least 8 characters.",
    success: "User created successfully.",
    failed: "Could not create user.",
  },
} as const;
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function getApiBaseUrl() {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || ""
      : "";
  const base = raw.replace(/\/+$/, "");
  return base.endsWith("/api") ? base.slice(0, -4) : base;
}
function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) return "";
  return decodeURIComponent(parts.pop()?.split(";").shift() || "");
}
async function ensureCsrfToken() {
  let token = getCookie("csrftoken");
  if (token) return token;
  await fetch(makeApiUrl(CSRF_ENDPOINT), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  token = getCookie("csrftoken");
  return token;
}
function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}
function extractError(payload: unknown) {
  if (typeof payload === "string") return payload.slice(0, 240);
  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    const direct = record.detail || record.message || record.error || record.username || record.email || record.password;
    if (Array.isArray(direct)) return direct.map(String).join(" ");
    if (direct) return String(direct);
    const first = Object.entries(record)[0];
    if (first) return Array.isArray(first[1]) ? `${first[0]}: ${first[1].map(String).join(" ")}` : `${first[0]}: ${String(first[1])}`;
  }
  return "";
}
async function postUser(payload: Record<string, unknown>) {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch(makeApiUrl(API_ENDPOINT), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: JSON.stringify(payload),
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(extractError(data) || `${response.status} ${response.statusText}`);
  }
  return data;
}
function getCreatedId(payload: unknown) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return "";
  const record = payload as Record<string, unknown>;
  const data = typeof record.data === "object" && record.data !== null && !Array.isArray(record.data)
    ? (record.data as Record<string, unknown>)
    : {};
  return [record.id, record.user_id, record.pk, data.id, data.user_id, data.pk]
    .map((value) => text(value))
    .find(Boolean) || "";
}
export default function SystemUsersCreatePage() {
  const router = useRouter();
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [saving, setSaving] = React.useState(false);
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const isReady = text(form.username).length > 0 && text(form.password).length >= 8;
  React.useEffect(() => {
    const applyLocale = () => setLocale(getInitialLocale());
    applyLocale();
    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);
    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);
  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReady) {
      toast.error(t.required);
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        username: form.username.trim().replace(/\s+/g, ".").toLowerCase(),
        password: form.password,
        system_role: form.system_role,
        access_type: "system",
        is_active: form.status === "active",
      };
      if (text(form.email)) payload.email = form.email.trim();
      if (text(form.first_name)) payload.first_name = form.first_name.trim();
      if (text(form.last_name)) payload.last_name = form.last_name.trim();
      if (text(form.phone)) payload.phone = form.phone.trim();
      if (text(form.notes)) payload.status_reason = form.notes.trim();
      const responsePayload = await postUser(payload);
      const createdId = getCreatedId(responsePayload);
      toast.success(t.success);
      if (createdId) {
        router.push(`/system/users/${encodeURIComponent(createdId)}`);
      } else {
        router.push("/system/users/list");
      }
    } catch (error) {
      toast.error(t.failed, {
        description: error instanceof Error ? error.message : t.failed,
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <section className="rounded-3xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                {t.badge}
              </span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{t.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-xl border bg-background px-4 py-2 text-sm font-medium" href="/system/users">
                {t.back}
              </Link>
              <Link className="rounded-xl border bg-background px-4 py-2 text-sm font-medium" href="/system/users/list">
                {t.list}
              </Link>
              <Link className="rounded-xl border bg-background px-4 py-2 text-sm font-medium" href="/system/users/reports">
                {t.reports}
              </Link>
            </div>
          </div>
        </section>
        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-3xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold">{t.account}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">{t.username} *</span>
                  <input className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={form.username} onChange={(event) => updateField("username", event.target.value)} placeholder="support.user" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">{t.password} *</span>
                  <input className="h-11 w-full rounded-xl border bg-background px-3 text-sm" type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="********" />
                </label>
              </div>
            </section>
            <section className="rounded-3xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold">{t.profile}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">{t.email}</span>
                  <input className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="user@example.com" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">{t.phone}</span>
                  <input className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="05xxxxxxxx" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">{t.firstName}</span>
                  <input className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={form.first_name} onChange={(event) => updateField("first_name", event.target.value)} placeholder="Mazen" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">{t.lastName}</span>
                  <input className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={form.last_name} onChange={(event) => updateField("last_name", event.target.value)} placeholder="Admin" />
                </label>
              </div>
            </section>
            <section className="rounded-3xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold">{t.access}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">{t.role}</span>
                  <select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={form.system_role} onChange={(event) => updateField("system_role", event.target.value as FormState["system_role"])}>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
                    <option value="SUPPORT">SUPPORT</option>
                    <option value="BILLING_MANAGER">BILLING_MANAGER</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">{t.status}</span>
                  <select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={form.status} onChange={(event) => updateField("status", event.target.value as FormState["status"])}>
                    <option value="active">{t.active}</option>
                    <option value="inactive">{t.inactive}</option>
                  </select>
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium">{t.notes}</span>
                  <textarea className="min-h-28 w-full rounded-xl border bg-background px-3 py-2 text-sm" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder={t.notes} />
                </label>
              </div>
            </section>
          </div>
          <aside className="space-y-4">
            <section className="rounded-3xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-bold">{t.save}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{t.hint}</p>
              <p className="mt-3 rounded-2xl border bg-muted/40 p-4 text-xs leading-6 text-muted-foreground">{t.required}</p>
              <button className="mt-5 h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={saving || !isReady} type="submit">
                {saving ? t.saving : t.save}
              </button>
            </section>
          </aside>
        </form>
      </div>
    </main>
  );
}
