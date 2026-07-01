/*
 * 📂 path: primey_frontend/app/company/settings/_components/company-settings-client.tsx
 * 🧩 Company settings shared client UI
 * ✅ Approved Premium pattern
 * ✅ Real API only
 * ✅ Tenant-safe: never sends company_id from frontend
 * ✅ SAR icon from public/currency/sar.svg
 */
"use client";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  UserRoundCog,
  UsersRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  ""
).replace(/\/$/, "");
function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>("ar");
  useEffect(() => {
    const syncLocale = () => {
      const html = document.documentElement;
      const lang = html.lang.toLowerCase();
      const dir = html.dir.toLowerCase();
      setLocale(lang.startsWith("en") || dir === "ltr" ? "en" : "ar");
    };
    syncLocale();
    const observer = new MutationObserver(syncLocale);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang", "dir"],
    });
    return () => observer.disconnect();
  }, []);
  return locale;
}
function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) return "";
  return decodeURIComponent(parts.pop()?.split(";").shift() ?? "");
}
function asRecord(value: unknown): ApiRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ApiRecord;
  }
  return {};
}
function normalizeList(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) return value.map(asRecord);
  const record = asRecord(value);
  const data = asRecord(record.data);
  const candidates: unknown[] = [
    record.results,
    record.items,
    record.rows,
    record.data,
    data.results,
    data.items,
    data.rows,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(asRecord);
  }
  return [];
}
function getText(row: ApiRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
}
function getBool(row: ApiRecord, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      if (["true", "1", "active", "enabled"].includes(normalized)) return true;
      if (["false", "0", "inactive", "disabled"].includes(normalized)) return false;
    }
  }
  return fallback;
}
function getRowId(row: ApiRecord): string {
  return getText(row, ["id", "uuid", "pk", "key", "code"]);
}
function getErrorMessage(payload: unknown): string {
  if (typeof payload === "string") return payload;
  const record = asRecord(payload);
  const candidates = [
    record.detail,
    record.message,
    record.error,
    record.non_field_errors,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string") return candidate;
    if (Array.isArray(candidate) && candidate.length > 0) return String(candidate[0]);
  }
  return "";
}
async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const method = (options.method ?? "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfToken = getCookie("csrftoken");
    if (csrfToken) headers.set("X-CSRFToken", csrfToken);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }
  if (!response.ok) {
    throw new Error(getErrorMessage(payload) || `HTTP ${response.status}`);
  }
  return payload as T;
}
function PageShell({
  title,
  description,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const locale = useLocale();
  const rtl = locale === "ar";
  return (
    <main dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-neutral-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-sm">
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <Link href="/company" className="rounded-full border border-neutral-200 px-3 py-1 hover:bg-neutral-50">
                    {rtl ? "مساحة الشركة" : "Company"}
                  </Link>
                  <ArrowLeft className="h-3.5 w-3.5 opacity-60" />
                  <Link href="/company/settings" className="rounded-full border border-neutral-200 px-3 py-1 hover:bg-neutral-50">
                    {rtl ? "إعدادات الشركة" : "Company settings"}
                  </Link>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-950">{title}</h1>
                <p className="max-w-3xl text-sm leading-6 text-neutral-500">{description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SarBadge />
              {actions}
            </div>
          </div>
        </section>
        <ApiNotice />
        {children}
      </div>
    </main>
  );
}
function SarBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm">
      <Image src="/currency/sar.svg" alt="SAR" width={16} height={16} />
      SAR
    </span>
  );
}
function ApiNotice() {
  const locale = useLocale();
  const rtl = locale === "ar";
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white/80 px-4 py-3 text-xs leading-6 text-neutral-500 shadow-sm">
      {rtl
        ? "تنبيه أمان: هذه الصفحات لا ترسل company_id من الواجهة. يجب أن يحدد الباكند الشركة الحالية من جلسة المستخدم وعضويته فقط."
        : "Security note: these pages never send company_id from the frontend. The backend must resolve the current company from the authenticated session and membership only."}
    </div>
  );
}
function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}
function SecondaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}
function StatusPill({ active }: { active: boolean }) {
  const locale = useLocale();
  const rtl = locale === "ar";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200"
      }`}
    >
      {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {active ? (rtl ? "نشط" : "Active") : rtl ? "غير نشط" : "Inactive"}
    </span>
  );
}
function Card({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        {Icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div>
          <h2 className="text-base font-bold text-neutral-950">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-neutral-500">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm text-neutral-500">{label}</p>
          <p className="text-3xl font-bold text-neutral-950">{value}</p>
          <p className="text-xs text-neutral-400">{hint}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/60 p-8 text-center">
      <Search className="mb-3 h-8 w-8 text-neutral-400" />
      <h3 className="text-sm font-bold text-neutral-800">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">{description}</p>
    </div>
  );
}
function LoadingBlock() {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-3xl border border-neutral-200 bg-white">
      <Loader2 className="h-7 w-7 animate-spin text-neutral-500" />
    </div>
  );
}
function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-neutral-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/10"
      />
    </label>
  );
}
function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2 md:col-span-2">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/10"
      />
    </label>
  );
}
function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm outline-none transition focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function ToggleInput({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <span>
        <span className="block text-sm font-semibold text-neutral-800">{label}</span>
        {description ? <span className="mt-1 block text-xs leading-5 text-neutral-500">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950"
      />
    </label>
  );
}
function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 ltr:left-4 rtl:right-4" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-11 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-4 focus:ring-neutral-950/10"
      />
    </div>
  );
}
export function CompanySettingsHome() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState("");
  const [stats, setStats] = useState({
    profileReady: false,
    branches: 0,
    users: 0,
    paymentMethods: 0,
    taxReady: false,
  });
  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      apiRequest<unknown>("/api/company/profile/"),
      apiRequest<unknown>("/api/company/branches/"),
      apiRequest<unknown>("/api/company/users/"),
      apiRequest<unknown>("/api/company/payment-methods/"),
      apiRequest<unknown>("/api/company/tax-settings/"),
    ]);
    setStats({
      profileReady: results[0].status === "fulfilled" && Object.keys(asRecord(results[0].value)).length > 0,
      branches: results[1].status === "fulfilled" ? normalizeList(results[1].value).length : 0,
      users: results[2].status === "fulfilled" ? normalizeList(results[2].value).length : 0,
      paymentMethods: results[3].status === "fulfilled" ? normalizeList(results[3].value).length : 0,
      taxReady: results[4].status === "fulfilled" && Object.keys(asRecord(results[4].value)).length > 0,
    });
    setLastSync(new Date().toLocaleTimeString(rtl ? "ar-SA" : "en-US"));
    setLoading(false);
  }, [rtl]);
  useEffect(() => {
    void load();
  }, [load]);
  const pages = useMemo(
    () => [
      {
        href: "/company/settings/company-profile",
        title: rtl ? "ملف الشركة" : "Company profile",
        description: rtl ? "بيانات الشركة الأساسية والتواصل والعنوان." : "Basic company identity, contact, and address.",
        icon: Building2,
      },
      {
        href: "/company/settings/general",
        title: rtl ? "الإعدادات العامة" : "General settings",
        description: rtl ? "اللغة، المنطقة الزمنية، السنة المالية، وإعدادات التشغيل." : "Language, timezone, fiscal year, and operating preferences.",
        icon: SlidersHorizontal,
      },
      {
        href: "/company/settings/branches",
        title: rtl ? "الفروع" : "Branches",
        description: rtl ? "إدارة فروع الشركة ونطاق استخدامها داخل العمليات." : "Manage company branches used across operations.",
        icon: Store,
      },
      {
        href: "/company/settings/users",
        title: rtl ? "مستخدمو الشركة" : "Company users",
        description: rtl ? "إضافة المستخدمين وربطهم بالأدوار والفروع." : "Add users and assign roles and branches.",
        icon: UsersRound,
      },
      {
        href: "/company/settings/permissions",
        title: rtl ? "صلاحيات الشركة" : "Company permissions",
        description: rtl ? "مراجعة وتحديث صلاحيات الأدوار داخل الشركة." : "Review and update role permissions inside the company.",
        icon: LockKeyhole,
      },
      {
        href: "/company/settings/tax",
        title: rtl ? "إعدادات الضريبة" : "Tax settings",
        description: rtl ? "الرقم الضريبي، التسجيل في ضريبة القيمة المضافة، ونسبة VAT." : "VAT registration, tax number, and tax rate.",
        icon: FileText,
      },
      {
        href: "/company/settings/payment-methods",
        title: rtl ? "طرق الدفع" : "Payment methods",
        description: rtl ? "إدارة طرق الدفع المتاحة في الفواتير ونقاط البيع." : "Manage payment methods for invoices and POS.",
        icon: CreditCard,
      },
    ],
    [rtl],
  );
  return (
    <PageShell
      title={rtl ? "إعدادات الشركة" : "Company settings"}
      description={
        rtl
          ? "مركز تشغيل إعدادات الشركة الحالية: الملف، الفروع، المستخدمين، الصلاحيات، الضريبة وطرق الدفع."
          : "Operational settings center for the current company: profile, branches, users, permissions, tax, and payment methods."
      }
      icon={Settings2}
      actions={
        <SecondaryButton onClick={() => void load()} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          {rtl ? "تحديث" : "Refresh"}
        </SecondaryButton>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={rtl ? "ملف الشركة" : "Profile"}
          value={stats.profileReady ? (rtl ? "جاهز" : "Ready") : (rtl ? "غير مكتمل" : "Pending")}
          hint={rtl ? "من API الشركة الحالية" : "From current company API"}
          icon={Building2}
        />
        <StatCard label={rtl ? "الفروع" : "Branches"} value={stats.branches} hint={rtl ? "فرع مسجل" : "Registered branches"} icon={Store} />
        <StatCard label={rtl ? "المستخدمون" : "Users"} value={stats.users} hint={rtl ? "مستخدم داخل الشركة" : "Company users"} icon={UsersRound} />
        <StatCard label={rtl ? "طرق الدفع" : "Payment methods"} value={stats.paymentMethods} hint={rtl ? "طريقة دفع" : "Payment methods"} icon={CreditCard} />
        <StatCard
          label={rtl ? "الضريبة" : "Tax"}
          value={stats.taxReady ? (rtl ? "مفعّلة" : "Ready") : (rtl ? "غير مكتملة" : "Pending")}
          hint={rtl ? "إعداد VAT" : "VAT setup"}
          icon={FileText}
        />
      </section>
      <Card title={rtl ? "صفحات إعدادات الشركة" : "Company settings pages"} description={lastSync ? `${rtl ? "آخر تحديث" : "Last sync"}: ${lastSync}` : undefined}>
        {loading ? (
          <LoadingBlock />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pages.map((page) => {
              const Icon = page.icon;
              return (
                <Link
                  key={page.href}
                  href={page.href}
                  className="group rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-950 hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700 transition group-hover:bg-neutral-950 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-950">{page.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">{page.description}</p>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </PageShell>
  );
}
type CompanyProfileForm = {
  name: string;
  commercial_registration: string;
  tax_number: string;
  phone: string;
  email: string;
  website: string;
  city: string;
  country: string;
  address: string;
};
const emptyCompanyProfile: CompanyProfileForm = {
  name: "",
  commercial_registration: "",
  tax_number: "",
  phone: "",
  email: "",
  website: "",
  city: "",
  country: "SA",
  address: "",
};
export function CompanyProfilePage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const [form, setForm] = useState<CompanyProfileForm>(emptyCompanyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setField = (key: keyof CompanyProfileForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiRequest<unknown>("/api/company/profile/");
      const root = asRecord(payload);
      const source = Object.keys(asRecord(root.company)).length > 0 ? asRecord(root.company) : root;
      setForm({
        name: getText(source, ["name", "company_name"]),
        commercial_registration: getText(source, ["commercial_registration", "commercial_registration_number", "cr_number"]),
        tax_number: getText(source, ["tax_number", "vat_number"]),
        phone: getText(source, ["phone", "mobile"]),
        email: getText(source, ["email"]),
        website: getText(source, ["website"]),
        city: getText(source, ["city"]),
        country: getText(source, ["country"], "SA"),
        address: getText(source, ["address", "full_address"]),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر تحميل ملف الشركة" : "Could not load company profile");
    } finally {
      setLoading(false);
    }
  }, [rtl]);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async () => {
    try {
      setSaving(true);
      await apiRequest("/api/company/profile/", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      toast.success(rtl ? "تم حفظ ملف الشركة" : "Company profile saved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر الحفظ" : "Could not save");
    } finally {
      setSaving(false);
    }
  };
  return (
    <PageShell
      title={rtl ? "ملف الشركة" : "Company profile"}
      description={rtl ? "تحديث بيانات الشركة الحالية بدون إرسال company_id من الواجهة." : "Update the current company profile without sending company_id from the frontend."}
      icon={Building2}
      actions={
        <PrimaryButton onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {rtl ? "حفظ" : "Save"}
        </PrimaryButton>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <Card title={rtl ? "بيانات الشركة" : "Company information"} icon={Building2}>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput label={rtl ? "اسم الشركة" : "Company name"} value={form.name} onChange={(value) => setField("name", value)} required />
            <TextInput label={rtl ? "السجل التجاري" : "Commercial registration"} value={form.commercial_registration} onChange={(value) => setField("commercial_registration", value)} />
            <TextInput label={rtl ? "الرقم الضريبي" : "Tax number"} value={form.tax_number} onChange={(value) => setField("tax_number", value)} />
            <TextInput label={rtl ? "رقم التواصل" : "Phone"} value={form.phone} onChange={(value) => setField("phone", value)} />
            <TextInput label={rtl ? "البريد الإلكتروني" : "Email"} value={form.email} onChange={(value) => setField("email", value)} type="email" />
            <TextInput label={rtl ? "الموقع الإلكتروني" : "Website"} value={form.website} onChange={(value) => setField("website", value)} />
            <TextInput label={rtl ? "المدينة" : "City"} value={form.city} onChange={(value) => setField("city", value)} />
            <TextInput label={rtl ? "الدولة" : "Country"} value={form.country} onChange={(value) => setField("country", value)} />
            <TextArea label={rtl ? "العنوان" : "Address"} value={form.address} onChange={(value) => setField("address", value)} />
          </div>
        </Card>
      )}
    </PageShell>
  );
}
type GeneralSettingsForm = {
  default_currency: string;
  language: string;
  timezone: string;
  fiscal_year_start: string;
  invoice_prefix: string;
  enable_notifications: boolean;
  allow_negative_stock: boolean;
  print_footer: string;
};
const emptyGeneralSettings: GeneralSettingsForm = {
  default_currency: "SAR",
  language: "ar",
  timezone: "Asia/Riyadh",
  fiscal_year_start: "",
  invoice_prefix: "",
  enable_notifications: true,
  allow_negative_stock: false,
  print_footer: "",
};
export function GeneralSettingsPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const [form, setForm] = useState<GeneralSettingsForm>(emptyGeneralSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setField = <K extends keyof GeneralSettingsForm>(key: K, value: GeneralSettingsForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const payload = asRecord(await apiRequest<unknown>("/api/company/settings/"));
      setForm({
        default_currency: getText(payload, ["default_currency", "currency"], "SAR"),
        language: getText(payload, ["language", "default_language"], "ar"),
        timezone: getText(payload, ["timezone"], "Asia/Riyadh"),
        fiscal_year_start: getText(payload, ["fiscal_year_start"]),
        invoice_prefix: getText(payload, ["invoice_prefix"]),
        enable_notifications: getBool(payload, ["enable_notifications", "notifications_enabled"], true),
        allow_negative_stock: getBool(payload, ["allow_negative_stock"], false),
        print_footer: getText(payload, ["print_footer", "receipt_footer"]),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر تحميل الإعدادات العامة" : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }, [rtl]);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async () => {
    try {
      setSaving(true);
      await apiRequest("/api/company/settings/", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      toast.success(rtl ? "تم حفظ الإعدادات العامة" : "General settings saved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر الحفظ" : "Could not save");
    } finally {
      setSaving(false);
    }
  };
  return (
    <PageShell
      title={rtl ? "الإعدادات العامة" : "General settings"}
      description={rtl ? "إعدادات التشغيل الافتراضية للشركة الحالية." : "Default operating settings for the current company."}
      icon={SlidersHorizontal}
      actions={
        <PrimaryButton onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {rtl ? "حفظ" : "Save"}
        </PrimaryButton>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <Card title={rtl ? "تفضيلات التشغيل" : "Operating preferences"} icon={Settings2}>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectInput
              label={rtl ? "العملة الافتراضية" : "Default currency"}
              value={form.default_currency}
              onChange={(value) => setField("default_currency", value)}
              options={[{ value: "SAR", label: "SAR" }]}
            />
            <SelectInput
              label={rtl ? "اللغة الافتراضية" : "Default language"}
              value={form.language}
              onChange={(value) => setField("language", value)}
              options={[
                { value: "ar", label: rtl ? "العربية" : "Arabic" },
                { value: "en", label: rtl ? "الإنجليزية" : "English" },
              ]}
            />
            <TextInput label={rtl ? "المنطقة الزمنية" : "Timezone"} value={form.timezone} onChange={(value) => setField("timezone", value)} />
            <TextInput label={rtl ? "بداية السنة المالية" : "Fiscal year start"} value={form.fiscal_year_start} onChange={(value) => setField("fiscal_year_start", value)} type="date" />
            <TextInput label={rtl ? "بادئة الفواتير" : "Invoice prefix"} value={form.invoice_prefix} onChange={(value) => setField("invoice_prefix", value)} />
            <div className="grid gap-4">
              <ToggleInput label={rtl ? "تفعيل الإشعارات" : "Enable notifications"} checked={form.enable_notifications} onChange={(value) => setField("enable_notifications", value)} />
              <ToggleInput label={rtl ? "السماح بالمخزون السالب" : "Allow negative stock"} checked={form.allow_negative_stock} onChange={(value) => setField("allow_negative_stock", value)} />
            </div>
            <TextArea label={rtl ? "تذييل الطباعة" : "Print footer"} value={form.print_footer} onChange={(value) => setField("print_footer", value)} />
          </div>
        </Card>
      )}
    </PageShell>
  );
}
type BranchForm = {
  name: string;
  code: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  is_active: boolean;
};
const emptyBranchForm: BranchForm = {
  name: "",
  code: "",
  phone: "",
  email: "",
  city: "",
  address: "",
  is_active: true,
};
export function BranchesPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<BranchForm>(emptyBranchForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setField = <K extends keyof BranchForm>(key: K, value: BranchForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiRequest<unknown>("/api/company/branches/");
      setRows(normalizeList(payload));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر تحميل الفروع" : "Could not load branches");
    } finally {
      setLoading(false);
    }
  }, [rtl]);
  useEffect(() => {
    void load();
  }, [load]);
  const resetForm = () => {
    setEditingId("");
    setForm(emptyBranchForm);
  };
  const edit = (row: ApiRecord) => {
    setEditingId(getRowId(row));
    setForm({
      name: getText(row, ["name"]),
      code: getText(row, ["code", "branch_code"]),
      phone: getText(row, ["phone"]),
      email: getText(row, ["email"]),
      city: getText(row, ["city"]),
      address: getText(row, ["address"]),
      is_active: getBool(row, ["is_active", "active"], true),
    });
  };
  const save = async () => {
    if (!form.name.trim()) {
      toast.error(rtl ? "اسم الفرع مطلوب" : "Branch name is required");
      return;
    }
    try {
      setSaving(true);
      await apiRequest(editingId ? `/api/company/branches/${editingId}/` : "/api/company/branches/", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(form),
      });
      toast.success(editingId ? (rtl ? "تم تحديث الفرع" : "Branch updated") : rtl ? "تم إنشاء الفرع" : "Branch created");
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر حفظ الفرع" : "Could not save branch");
    } finally {
      setSaving(false);
    }
  };
  const toggleActive = async (row: ApiRecord, nextActive: boolean) => {
    const id = getRowId(row);
    if (!id) return;
    try {
      try {
        await apiRequest(`/api/company/branches/${id}/${nextActive ? "activate" : "deactivate"}/`, {
          method: "POST",
          body: JSON.stringify({}),
        });
      } catch {
        await apiRequest(`/api/company/branches/${id}/`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: nextActive }),
        });
      }
      toast.success(nextActive ? (rtl ? "تم تفعيل الفرع" : "Branch activated") : rtl ? "تم تعطيل الفرع" : "Branch deactivated");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر تحديث حالة الفرع" : "Could not update branch status");
    }
  };
  const filteredRows = rows.filter((row) => {
    const haystack = [
      getText(row, ["name"]),
      getText(row, ["code", "branch_code"]),
      getText(row, ["phone"]),
      getText(row, ["city"]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  return (
    <PageShell
      title={rtl ? "الفروع" : "Branches"}
      description={rtl ? "إدارة فروع الشركة الحالية وإتاحتها للعمليات." : "Manage current company branches for operational use."}
      icon={Store}
      actions={
        <SecondaryButton onClick={() => void load()} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          {rtl ? "تحديث" : "Refresh"}
        </SecondaryButton>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card title={editingId ? (rtl ? "تعديل فرع" : "Edit branch") : rtl ? "إضافة فرع" : "Add branch"} icon={Plus}>
          <div className="grid gap-4">
            <TextInput label={rtl ? "اسم الفرع" : "Branch name"} value={form.name} onChange={(value) => setField("name", value)} required />
            <TextInput label={rtl ? "كود الفرع" : "Branch code"} value={form.code} onChange={(value) => setField("code", value)} />
            <TextInput label={rtl ? "الهاتف" : "Phone"} value={form.phone} onChange={(value) => setField("phone", value)} />
            <TextInput label={rtl ? "البريد الإلكتروني" : "Email"} value={form.email} onChange={(value) => setField("email", value)} type="email" />
            <TextInput label={rtl ? "المدينة" : "City"} value={form.city} onChange={(value) => setField("city", value)} />
            <TextArea label={rtl ? "العنوان" : "Address"} value={form.address} onChange={(value) => setField("address", value)} />
            <ToggleInput label={rtl ? "فرع نشط" : "Active branch"} checked={form.is_active} onChange={(value) => setField("is_active", value)} />
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {rtl ? "حفظ" : "Save"}
              </PrimaryButton>
              {editingId ? <SecondaryButton onClick={resetForm}>{rtl ? "إلغاء" : "Cancel"}</SecondaryButton> : null}
            </div>
          </div>
        </Card>
        <Card title={rtl ? "قائمة الفروع" : "Branches list"} description={`${rtl ? "الإجمالي" : "Total"}: ${rows.length}`} icon={Store}>
          <div className="mb-4">
            <SearchBox value={query} onChange={setQuery} placeholder={rtl ? "ابحث باسم الفرع أو الكود أو المدينة..." : "Search branch name, code, or city..."} />
          </div>
          {loading ? (
            <LoadingBlock />
          ) : filteredRows.length === 0 ? (
            <EmptyState title={rtl ? "لا توجد فروع" : "No branches"} description={rtl ? "ستظهر الفروع هنا عند توفرها من API." : "Branches will appear here when returned by the API."} />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-neutral-200">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "الفرع" : "Branch"}</th>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "الكود" : "Code"}</th>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "المدينة" : "City"}</th>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "الحالة" : "Status"}</th>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {filteredRows.map((row, index) => {
                    const active = getBool(row, ["is_active", "active"], true);
                    return (
                      <tr key={getRowId(row) || index}>
                        <td className="px-4 py-4 font-semibold text-neutral-900">{getText(row, ["name"], "-")}</td>
                        <td className="px-4 py-4 text-neutral-600">{getText(row, ["code", "branch_code"], "-")}</td>
                        <td className="px-4 py-4 text-neutral-600">{getText(row, ["city"], "-")}</td>
                        <td className="px-4 py-4"><StatusPill active={active} /></td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <SecondaryButton onClick={() => edit(row)}>{rtl ? "تعديل" : "Edit"}</SecondaryButton>
                            <SecondaryButton onClick={() => void toggleActive(row, !active)}>
                              {active ? (rtl ? "تعطيل" : "Deactivate") : rtl ? "تفعيل" : "Activate"}
                            </SecondaryButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
type UserForm = {
  full_name: string;
  email: string;
  role: string;
  branch_id: string;
  is_active: boolean;
};
const emptyUserForm: UserForm = {
  full_name: "",
  email: "",
  role: "VIEWER",
  branch_id: "",
  is_active: true,
};
export function CompanyUsersPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [branches, setBranches] = useState<ApiRecord[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<UserForm>(emptyUserForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const roleOptions = [
    { value: "OWNER", label: rtl ? "مالك" : "Owner" },
    { value: "ADMIN", label: rtl ? "مدير" : "Admin" },
    { value: "MANAGER", label: rtl ? "مشرف" : "Manager" },
    { value: "ACCOUNTANT", label: rtl ? "محاسب" : "Accountant" },
    { value: "CASHIER", label: rtl ? "كاشير" : "Cashier" },
    { value: "SALES", label: rtl ? "مبيعات" : "Sales" },
    { value: "INVENTORY", label: rtl ? "مخزون" : "Inventory" },
    { value: "HR", label: rtl ? "موارد بشرية" : "HR" },
    { value: "EMPLOYEE", label: rtl ? "موظف" : "Employee" },
    { value: "VIEWER", label: rtl ? "مشاهد" : "Viewer" },
  ];
  const setField = <K extends keyof UserForm>(key: K, value: UserForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [usersPayload, branchesPayload] = await Promise.all([
        apiRequest<unknown>("/api/company/users/"),
        apiRequest<unknown>("/api/company/branches/").catch(() => []),
      ]);
      setRows(normalizeList(usersPayload));
      setBranches(normalizeList(branchesPayload));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر تحميل المستخدمين" : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, [rtl]);
  useEffect(() => {
    void load();
  }, [load]);
  const resetForm = () => {
    setEditingId("");
    setForm(emptyUserForm);
  };
  const edit = (row: ApiRecord) => {
    setEditingId(getRowId(row));
    setForm({
      full_name: getText(row, ["full_name", "name", "display_name"]),
      email: getText(row, ["email"]),
      role: getText(row, ["role", "company_role"], "VIEWER"),
      branch_id: getText(row, ["branch_id"]),
      is_active: getBool(row, ["is_active", "active"], true),
    });
  };
  const save = async () => {
    if (!form.email.trim()) {
      toast.error(rtl ? "البريد الإلكتروني مطلوب" : "Email is required");
      return;
    }
    const payload: ApiRecord = {
      full_name: form.full_name,
      email: form.email,
      role: form.role,
      is_active: form.is_active,
    };
    if (form.branch_id) payload.branch_id = form.branch_id;
    try {
      setSaving(true);
      await apiRequest(editingId ? `/api/company/users/${editingId}/` : "/api/company/users/", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(editingId ? (rtl ? "تم تحديث المستخدم" : "User updated") : rtl ? "تم إضافة المستخدم" : "User added");
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر حفظ المستخدم" : "Could not save user");
    } finally {
      setSaving(false);
    }
  };
  const toggleActive = async (row: ApiRecord, nextActive: boolean) => {
    const id = getRowId(row);
    if (!id) return;
    try {
      try {
        await apiRequest(`/api/company/users/${id}/${nextActive ? "activate" : "deactivate"}/`, {
          method: "POST",
          body: JSON.stringify({}),
        });
      } catch {
        await apiRequest(`/api/company/users/${id}/`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: nextActive }),
        });
      }
      toast.success(nextActive ? (rtl ? "تم تفعيل المستخدم" : "User activated") : rtl ? "تم تعطيل المستخدم" : "User deactivated");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر تحديث حالة المستخدم" : "Could not update user status");
    }
  };
  const filteredRows = rows.filter((row) => {
    const haystack = [
      getText(row, ["full_name", "name", "display_name"]),
      getText(row, ["email"]),
      getText(row, ["role", "company_role"]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  return (
    <PageShell
      title={rtl ? "مستخدمو الشركة" : "Company users"}
      description={rtl ? "إدارة مستخدمي الشركة الحالية وأدوارهم وفروعهم." : "Manage current company users, roles, and branches."}
      icon={UsersRound}
      actions={
        <SecondaryButton onClick={() => void load()} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          {rtl ? "تحديث" : "Refresh"}
        </SecondaryButton>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card title={editingId ? (rtl ? "تعديل مستخدم" : "Edit user") : rtl ? "إضافة مستخدم" : "Add user"} icon={UserRoundCog}>
          <div className="grid gap-4">
            <TextInput label={rtl ? "الاسم" : "Name"} value={form.full_name} onChange={(value) => setField("full_name", value)} />
            <TextInput label={rtl ? "البريد الإلكتروني" : "Email"} value={form.email} onChange={(value) => setField("email", value)} type="email" required />
            <SelectInput label={rtl ? "الدور" : "Role"} value={form.role} onChange={(value) => setField("role", value)} options={roleOptions} />
            <SelectInput
              label={rtl ? "الفرع" : "Branch"}
              value={form.branch_id}
              onChange={(value) => setField("branch_id", value)}
              options={[
                { value: "", label: rtl ? "بدون فرع محدد" : "No specific branch" },
                ...branches.map((branch) => ({ value: getRowId(branch), label: getText(branch, ["name"], getRowId(branch)) })),
              ]}
            />
            <ToggleInput label={rtl ? "مستخدم نشط" : "Active user"} checked={form.is_active} onChange={(value) => setField("is_active", value)} />
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {rtl ? "حفظ" : "Save"}
              </PrimaryButton>
              {editingId ? <SecondaryButton onClick={resetForm}>{rtl ? "إلغاء" : "Cancel"}</SecondaryButton> : null}
            </div>
          </div>
        </Card>
        <Card title={rtl ? "قائمة المستخدمين" : "Users list"} description={`${rtl ? "الإجمالي" : "Total"}: ${rows.length}`} icon={UsersRound}>
          <div className="mb-4">
            <SearchBox value={query} onChange={setQuery} placeholder={rtl ? "ابحث بالاسم أو البريد أو الدور..." : "Search name, email, or role..."} />
          </div>
          {loading ? (
            <LoadingBlock />
          ) : filteredRows.length === 0 ? (
            <EmptyState title={rtl ? "لا يوجد مستخدمون" : "No users"} description={rtl ? "ستظهر بيانات المستخدمين هنا عند توفرها من API." : "Users will appear here when returned by the API."} />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-neutral-200">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "المستخدم" : "User"}</th>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "الدور" : "Role"}</th>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "الحالة" : "Status"}</th>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {filteredRows.map((row, index) => {
                    const active = getBool(row, ["is_active", "active"], true);
                    return (
                      <tr key={getRowId(row) || index}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-neutral-900">{getText(row, ["full_name", "name", "display_name"], "-")}</p>
                          <p className="mt-1 text-xs text-neutral-500">{getText(row, ["email"], "-")}</p>
                        </td>
                        <td className="px-4 py-4 text-neutral-600">{getText(row, ["role", "company_role"], "-")}</td>
                        <td className="px-4 py-4"><StatusPill active={active} /></td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <SecondaryButton onClick={() => edit(row)}>{rtl ? "تعديل" : "Edit"}</SecondaryButton>
                            <SecondaryButton onClick={() => void toggleActive(row, !active)}>
                              {active ? (rtl ? "تعطيل" : "Deactivate") : rtl ? "تفعيل" : "Activate"}
                            </SecondaryButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
type PermissionItem = {
  key: string;
  label: string;
  category: string;
};
type PermissionRole = {
  key: string;
  label: string;
  permissions: string[];
};
function normalizePermissionItems(value: unknown): PermissionItem[] {
  return normalizeList(value)
    .map((item) => {
      const key = getText(item, ["key", "code", "codename", "name", "id"]);
      if (!key) return null;
      return {
        key,
        label: getText(item, ["label", "name", "title", "description"], key),
        category: getText(item, ["category", "module", "group", "app"], "General"),
      };
    })
    .filter((item): item is PermissionItem => Boolean(item));
}
function normalizePermissionKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "number") return String(item);
      return getText(asRecord(item), ["key", "code", "codename", "name", "id"]);
    })
    .filter(Boolean);
}
function normalizePermissionPayload(payload: unknown): { permissions: PermissionItem[]; roles: PermissionRole[] } {
  const root = asRecord(payload);
  const permissions = normalizePermissionItems(root.permissions ?? root.available_permissions ?? root.items ?? root.data);
  let roleSource = normalizeList(root.roles ?? root.company_roles ?? root.role_permissions);
  if (roleSource.length === 0) {
    const list = normalizeList(payload);
    const looksLikeRoles = list.some((row) => Array.isArray(row.permissions) || Array.isArray(row.permission_keys));
    if (looksLikeRoles) roleSource = list;
  }
  const roles = roleSource
    .map((row) => {
      const key = getText(row, ["key", "code", "role", "name", "id"]);
      if (!key) return null;
      return {
        key,
        label: getText(row, ["label", "display_name", "name", "role"], key),
        permissions: normalizePermissionKeys(row.permissions ?? row.permission_keys ?? row.allowed_permissions),
      };
    })
    .filter((role): role is PermissionRole => Boolean(role));
  return { permissions, roles };
}
export function CompanyPermissionsPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [roles, setRoles] = useState<PermissionRole[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiRequest<unknown>("/api/company/permissions/");
      const normalized = normalizePermissionPayload(payload);
      setPermissions(normalized.permissions);
      setRoles(normalized.roles);
      const firstRole = normalized.roles[0];
      if (firstRole) {
        setSelectedRole(firstRole.key);
        setSelectedPermissions(firstRole.permissions);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر تحميل الصلاحيات" : "Could not load permissions");
    } finally {
      setLoading(false);
    }
  }, [rtl]);
  useEffect(() => {
    void load();
  }, [load]);
  const changeRole = (roleKey: string) => {
    setSelectedRole(roleKey);
    const role = roles.find((item) => item.key === roleKey);
    setSelectedPermissions(role?.permissions ?? []);
  };
  const togglePermission = (permissionKey: string) => {
    setSelectedPermissions((current) =>
      current.includes(permissionKey)
        ? current.filter((key) => key !== permissionKey)
        : [...current, permissionKey],
    );
  };
  const save = async () => {
    if (!selectedRole) {
      toast.error(rtl ? "اختر الدور أولاً" : "Select a role first");
      return;
    }
    try {
      setSaving(true);
      await apiRequest("/api/company/permissions/", {
        method: "PATCH",
        body: JSON.stringify({
          role: selectedRole,
          permissions: selectedPermissions,
        }),
      });
      toast.success(rtl ? "تم حفظ صلاحيات الدور" : "Role permissions saved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر حفظ الصلاحيات" : "Could not save permissions");
    } finally {
      setSaving(false);
    }
  };
  const filteredPermissions = permissions.filter((permission) => {
    const haystack = `${permission.key} ${permission.label} ${permission.category}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  const groupedPermissions = filteredPermissions.reduce<Record<string, PermissionItem[]>>((acc, permission) => {
    acc[permission.category] = [...(acc[permission.category] ?? []), permission];
    return acc;
  }, {});
  return (
    <PageShell
      title={rtl ? "صلاحيات الشركة" : "Company permissions"}
      description={rtl ? "مراجعة وتحديث صلاحيات الأدوار داخل الشركة الحالية." : "Review and update role permissions inside the current company."}
      icon={LockKeyhole}
      actions={
        <PrimaryButton onClick={() => void save()} disabled={saving || loading || !selectedRole}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {rtl ? "حفظ الصلاحيات" : "Save permissions"}
        </PrimaryButton>
      }
    >
      <Card title={rtl ? "الأدوار والصلاحيات" : "Roles and permissions"} icon={ShieldCheck}>
        {loading ? (
          <LoadingBlock />
        ) : roles.length === 0 || permissions.length === 0 ? (
          <EmptyState
            title={rtl ? "لا توجد صلاحيات" : "No permissions"}
            description={rtl ? "ستظهر الأدوار والصلاحيات هنا عند توفرها من API." : "Roles and permissions will appear here when returned by the API."}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
            <div className="space-y-3">
              {roles.map((role) => (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => changeRole(role.key)}
                  className={`w-full rounded-2xl border p-4 text-start transition ${
                    selectedRole === role.key
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                  }`}
                >
                  <p className="font-bold">{role.label}</p>
                  <p className={`mt-1 text-xs ${selectedRole === role.key ? "text-white/70" : "text-neutral-500"}`}>
                    {role.permissions.length} {rtl ? "صلاحية" : "permissions"}
                  </p>
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <SearchBox value={query} onChange={setQuery} placeholder={rtl ? "ابحث في الصلاحيات..." : "Search permissions..."} />
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([category, items]) => (
                  <div key={category} className="rounded-3xl border border-neutral-200 bg-neutral-50/40 p-4">
                    <h3 className="mb-3 text-sm font-bold text-neutral-900">{category}</h3>
                    <div className="grid gap-2 md:grid-cols-2">
                      {items.map((permission) => (
                        <label key={permission.key} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-neutral-100">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(permission.key)}
                            onChange={() => togglePermission(permission.key)}
                            className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950"
                          />
                          <span>
                            <span className="block text-sm font-semibold text-neutral-800">{permission.label}</span>
                            <span className="mt-1 block text-xs text-neutral-400">{permission.key}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
type TaxSettingsForm = {
  is_vat_registered: boolean;
  tax_number: string;
  vat_rate: string;
  prices_include_tax: boolean;
  invoice_tax_label: string;
  tax_address: string;
};
const emptyTaxSettings: TaxSettingsForm = {
  is_vat_registered: true,
  tax_number: "",
  vat_rate: "15.00",
  prices_include_tax: false,
  invoice_tax_label: "VAT",
  tax_address: "",
};
export function TaxSettingsPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const [form, setForm] = useState<TaxSettingsForm>(emptyTaxSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setField = <K extends keyof TaxSettingsForm>(key: K, value: TaxSettingsForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const payload = asRecord(await apiRequest<unknown>("/api/company/tax-settings/"));
      setForm({
        is_vat_registered: getBool(payload, ["is_vat_registered", "vat_registered"], true),
        tax_number: getText(payload, ["tax_number", "vat_number"]),
        vat_rate: getText(payload, ["vat_rate", "tax_rate"], "15.00"),
        prices_include_tax: getBool(payload, ["prices_include_tax", "tax_inclusive"], false),
        invoice_tax_label: getText(payload, ["invoice_tax_label", "tax_label"], "VAT"),
        tax_address: getText(payload, ["tax_address", "address"]),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر تحميل إعدادات الضريبة" : "Could not load tax settings");
    } finally {
      setLoading(false);
    }
  }, [rtl]);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async () => {
    try {
      setSaving(true);
      await apiRequest("/api/company/tax-settings/", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      toast.success(rtl ? "تم حفظ إعدادات الضريبة" : "Tax settings saved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر الحفظ" : "Could not save");
    } finally {
      setSaving(false);
    }
  };
  return (
    <PageShell
      title={rtl ? "إعدادات الضريبة" : "Tax settings"}
      description={rtl ? "إعداد ضريبة القيمة المضافة والرقم الضريبي للشركة الحالية." : "Configure VAT and tax number for the current company."}
      icon={FileText}
      actions={
        <PrimaryButton onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {rtl ? "حفظ" : "Save"}
        </PrimaryButton>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card title={rtl ? "ضريبة القيمة المضافة" : "VAT configuration"} icon={FileText}>
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label={rtl ? "الرقم الضريبي" : "Tax number"} value={form.tax_number} onChange={(value) => setField("tax_number", value)} />
              <TextInput label={rtl ? "نسبة VAT" : "VAT rate"} value={form.vat_rate} onChange={(value) => setField("vat_rate", value)} type="number" />
              <TextInput label={rtl ? "مسمى الضريبة في الفاتورة" : "Invoice tax label"} value={form.invoice_tax_label} onChange={(value) => setField("invoice_tax_label", value)} />
              <div className="grid gap-4">
                <ToggleInput label={rtl ? "الشركة مسجلة في VAT" : "VAT registered"} checked={form.is_vat_registered} onChange={(value) => setField("is_vat_registered", value)} />
                <ToggleInput label={rtl ? "الأسعار تشمل الضريبة" : "Prices include tax"} checked={form.prices_include_tax} onChange={(value) => setField("prices_include_tax", value)} />
              </div>
              <TextArea label={rtl ? "العنوان الضريبي" : "Tax address"} value={form.tax_address} onChange={(value) => setField("tax_address", value)} />
            </div>
          </Card>
          <Card title={rtl ? "ملخص الضريبة" : "Tax summary"} icon={Landmark}>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-neutral-50 p-4">
                <span className="text-neutral-500">{rtl ? "العملة" : "Currency"}</span>
                <SarBadge />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-neutral-50 p-4">
                <span className="text-neutral-500">{rtl ? "النسبة" : "Rate"}</span>
                <span className="font-bold text-neutral-950">{form.vat_rate || "0"}%</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-neutral-50 p-4">
                <span className="text-neutral-500">{rtl ? "الحالة" : "Status"}</span>
                <StatusPill active={form.is_vat_registered} />
              </div>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
type PaymentMethodForm = {
  name: string;
  code: string;
  type: string;
  account_name: string;
  is_active: boolean;
};
const emptyPaymentMethodForm: PaymentMethodForm = {
  name: "",
  code: "",
  type: "cash",
  account_name: "",
  is_active: true,
};
export function PaymentMethodsPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<PaymentMethodForm>(emptyPaymentMethodForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setField = <K extends keyof PaymentMethodForm>(key: K, value: PaymentMethodForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiRequest<unknown>("/api/company/payment-methods/");
      setRows(normalizeList(payload));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر تحميل طرق الدفع" : "Could not load payment methods");
    } finally {
      setLoading(false);
    }
  }, [rtl]);
  useEffect(() => {
    void load();
  }, [load]);
  const resetForm = () => {
    setEditingId("");
    setForm(emptyPaymentMethodForm);
  };
  const edit = (row: ApiRecord) => {
    setEditingId(getRowId(row));
    setForm({
      name: getText(row, ["name"]),
      code: getText(row, ["code"]),
      type: getText(row, ["type", "method_type"], "cash"),
      account_name: getText(row, ["account_name", "account"]),
      is_active: getBool(row, ["is_active", "active"], true),
    });
  };
  const save = async () => {
    if (!form.name.trim()) {
      toast.error(rtl ? "اسم طريقة الدفع مطلوب" : "Payment method name is required");
      return;
    }
    try {
      setSaving(true);
      await apiRequest(editingId ? `/api/company/payment-methods/${editingId}/` : "/api/company/payment-methods/", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(form),
      });
      toast.success(editingId ? (rtl ? "تم تحديث طريقة الدفع" : "Payment method updated") : rtl ? "تم إنشاء طريقة الدفع" : "Payment method created");
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر حفظ طريقة الدفع" : "Could not save payment method");
    } finally {
      setSaving(false);
    }
  };
  const toggleActive = async (row: ApiRecord, nextActive: boolean) => {
    const id = getRowId(row);
    if (!id) return;
    try {
      try {
        await apiRequest(`/api/company/payment-methods/${id}/${nextActive ? "activate" : "deactivate"}/`, {
          method: "POST",
          body: JSON.stringify({}),
        });
      } catch {
        await apiRequest(`/api/company/payment-methods/${id}/`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: nextActive }),
        });
      }
      toast.success(nextActive ? (rtl ? "تم تفعيل طريقة الدفع" : "Payment method activated") : rtl ? "تم تعطيل طريقة الدفع" : "Payment method deactivated");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر تحديث حالة طريقة الدفع" : "Could not update payment method status");
    }
  };
  const filteredRows = rows.filter((row) => {
    const haystack = [
      getText(row, ["name"]),
      getText(row, ["code"]),
      getText(row, ["type", "method_type"]),
      getText(row, ["account_name", "account"]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  return (
    <PageShell
      title={rtl ? "طرق الدفع" : "Payment methods"}
      description={rtl ? "إدارة طرق الدفع التي تستخدمها الشركة في الفواتير ونقطة البيع." : "Manage payment methods used by the company in invoices and POS."}
      icon={CreditCard}
      actions={
        <SecondaryButton onClick={() => void load()} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          {rtl ? "تحديث" : "Refresh"}
        </SecondaryButton>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card title={editingId ? (rtl ? "تعديل طريقة دفع" : "Edit payment method") : rtl ? "إضافة طريقة دفع" : "Add payment method"} icon={Plus}>
          <div className="grid gap-4">
            <TextInput label={rtl ? "اسم طريقة الدفع" : "Payment method name"} value={form.name} onChange={(value) => setField("name", value)} required />
            <TextInput label={rtl ? "الكود" : "Code"} value={form.code} onChange={(value) => setField("code", value)} />
            <SelectInput
              label={rtl ? "النوع" : "Type"}
              value={form.type}
              onChange={(value) => setField("type", value)}
              options={[
                { value: "cash", label: rtl ? "نقدي" : "Cash" },
                { value: "bank", label: rtl ? "تحويل بنكي" : "Bank transfer" },
                { value: "card", label: rtl ? "بطاقة" : "Card" },
                { value: "wallet", label: rtl ? "محفظة" : "Wallet" },
                { value: "other", label: rtl ? "أخرى" : "Other" },
              ]}
            />
            <TextInput label={rtl ? "اسم الحساب" : "Account name"} value={form.account_name} onChange={(value) => setField("account_name", value)} />
            <ToggleInput label={rtl ? "طريقة دفع نشطة" : "Active payment method"} checked={form.is_active} onChange={(value) => setField("is_active", value)} />
            <div className="flex flex-wrap gap-2">
              <PrimaryButton onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {rtl ? "حفظ" : "Save"}
              </PrimaryButton>
              {editingId ? <SecondaryButton onClick={resetForm}>{rtl ? "إلغاء" : "Cancel"}</SecondaryButton> : null}
            </div>
          </div>
        </Card>
        <Card title={rtl ? "قائمة طرق الدفع" : "Payment methods list"} description={`${rtl ? "الإجمالي" : "Total"}: ${rows.length}`} icon={CreditCard}>
          <div className="mb-4">
            <SearchBox value={query} onChange={setQuery} placeholder={rtl ? "ابحث باسم طريقة الدفع أو الكود..." : "Search payment method name or code..."} />
          </div>
          {loading ? (
            <LoadingBlock />
          ) : filteredRows.length === 0 ? (
            <EmptyState title={rtl ? "لا توجد طرق دفع" : "No payment methods"} description={rtl ? "ستظهر طرق الدفع هنا عند توفرها من API." : "Payment methods will appear here when returned by the API."} />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-neutral-200">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "طريقة الدفع" : "Payment method"}</th>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "النوع" : "Type"}</th>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "الحساب" : "Account"}</th>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "الحالة" : "Status"}</th>
                    <th className="px-4 py-3 text-start font-semibold">{rtl ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {filteredRows.map((row, index) => {
                    const active = getBool(row, ["is_active", "active"], true);
                    return (
                      <tr key={getRowId(row) || index}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-neutral-900">{getText(row, ["name"], "-")}</p>
                          <p className="mt-1 text-xs text-neutral-500">{getText(row, ["code"], "-")}</p>
                        </td>
                        <td className="px-4 py-4 text-neutral-600">{getText(row, ["type", "method_type"], "-")}</td>
                        <td className="px-4 py-4 text-neutral-600">{getText(row, ["account_name", "account"], "-")}</td>
                        <td className="px-4 py-4"><StatusPill active={active} /></td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <SecondaryButton onClick={() => edit(row)}>{rtl ? "تعديل" : "Edit"}</SecondaryButton>
                            <SecondaryButton onClick={() => void toggleActive(row, !active)}>
                              {active ? (rtl ? "تعطيل" : "Deactivate") : rtl ? "تفعيل" : "Activate"}
                            </SecondaryButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
