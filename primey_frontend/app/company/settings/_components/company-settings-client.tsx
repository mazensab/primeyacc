/*
 * 📂 path: primey_frontend/app/company/settings/_components/company-settings-client.tsx
 * 🧩 Company settings shared client UI
 * ✅ Approved Premium pattern
 * ✅ Real API only
 * ✅ Tenant-safe: never sends company_id from frontend
 * ✅ SAR icon from public/currency/sar.svg
 */
"use client";

import type { ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import {
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card as UiCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
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
function formatInteger(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return String(value);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(parsed);
}
function formatEnglishDateTime(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
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
    <main dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {rtl ? "إعدادات الشركة" : "Company settings"}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border bg-background px-3 py-1">
                    {rtl ? "مساحة الشركة" : "Company workspace"}
                  </span>
                  <span className="rounded-full border bg-background px-3 py-1">
                    {rtl ? "جاهزة للتشغيل" : "Ready for operations"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {actions}
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/company">
                    <Building2 className="h-4 w-4" />
                    {rtl ? "لوحة الشركة" : "Dashboard"}
                  </Link>
                </Button>
                <SarBadge />
              </div>
            </div>
          </div>
        </section>
        {children}
      </div>
    </main>
  );
}
function SarBadge() {
  return (
    <span className="inline-flex h-10 items-center gap-1.5 rounded-xl border bg-background px-3 text-xs font-semibold text-foreground shadow-sm">
      <Image src="/currency/sar.svg" alt="SAR" width={14} height={14} className="h-3.5 w-3.5" />
      SAR
    </span>
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
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl shadow-sm disabled:cursor-not-allowed"
    >
      {children}
    </Button>
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
    <Button
      type={type}
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-background shadow-sm disabled:cursor-not-allowed"
    >
      {children}
    </Button>
  );
}
function StatusPill({ active }: { active: boolean }) {
  const locale = useLocale();
  const rtl = locale === "ar";
  return (
    <Badge
      variant="outline"
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {active ? (rtl ? "نشط" : "Active") : rtl ? "غير نشط" : "Inactive"}
    </Badge>
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
    <UiCard className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base font-bold tracking-tight">{title}</CardTitle>
          {description ? <CardDescription className="mt-1 text-sm leading-6">{description}</CardDescription> : null}
        </div>
        {Icon ? (
          <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </UiCard>
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
  const renderedValue = typeof value === "number" ? formatInteger(value) : value;
  return (
    <UiCard className="group h-full min-h-[128px] overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{label}</CardDescription>
          <CardTitle className="mt-2 truncate text-2xl font-bold tracking-tight tabular-nums">
            {renderedValue}
          </CardTitle>
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </UiCard>
  );
}
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
      <div className="mb-3 rounded-2xl bg-primary/10 p-3 text-primary">
        <Search className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
function LoadingBlock() {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-2/3 rounded-xl" />
      </div>
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
      <span className="text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl bg-background text-sm"
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
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option, index) => (
          <option key={option.value || `empty-${index}`} value={option.value}>
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
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-background p-4 transition hover:bg-muted/40">
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        {description ? <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded border-input text-primary focus:ring-ring"
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
  const locale = useLocale();
  const rtl = locale === "ar";
  return (
    <div className="relative">
      <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${rtl ? "right-4" : "left-4"}`} />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`h-11 rounded-xl bg-background text-sm ${rtl ? "pr-11" : "pl-11"}`}
      />
    </div>
  );
}export function CompanySettingsHome() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState("");
  const [stats, setStats] = useState({
    profileReady: false,
    generalSettingsReady: false,
    branches: 0,
    users: 0,
    paymentMethods: 0,
    taxReady: false,
  });
  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      apiRequest<unknown>("/api/company/profile/"),
      apiRequest<unknown>("/api/company/settings/"),
      apiRequest<unknown>("/api/company/branches/"),
      apiRequest<unknown>("/api/company/users/"),
      apiRequest<unknown>("/api/company/payments/methods/"),
      Promise.all([apiRequest<unknown>("/api/company/profile/"), apiRequest<unknown>("/api/company/settings/").catch(() => null)]),
    ]);
    setStats({
      profileReady: results[0].status === "fulfilled" && Object.keys(asRecord(results[0].value)).length > 0,
      generalSettingsReady: results[1].status === "fulfilled" && Object.keys(asRecord(results[1].value)).length > 0,
      branches: results[2].status === "fulfilled" ? normalizeList(results[2].value).length : 0,
      users: results[3].status === "fulfilled" ? normalizeList(results[3].value).length : 0,
      paymentMethods: results[4].status === "fulfilled" ? normalizeList(results[4].value).length : 0,
      taxReady: results[5].status === "fulfilled" && Object.keys(asRecord(results[5].value)).length > 0,
    });
    setLastSync(formatEnglishDateTime(new Date()));
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
      {
        href: "/company/notifications",
        title: rtl ? "إشعارات الشركة" : "Company notifications",
        description: rtl ? "متابعة إشعارات الشركة والتنبيهات التشغيلية." : "Review company notifications and operational alerts.",
        icon: ShieldCheck,
      },
      {
        href: "/company/whatsapp/settings",
        title: rtl ? "إعدادات واتساب" : "WhatsApp settings",
        description: rtl ? "إعداد اتصال واتساب الخاص بالشركة الحالية." : "Configure WhatsApp connection for the current company.",
        icon: Settings2,
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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label={rtl ? "ملف الشركة" : "Profile"}
          value={stats.profileReady ? (rtl ? "جاهز" : "Ready") : (rtl ? "غير مكتمل" : "Pending")}
          hint={rtl ? "من API الشركة الحالية" : "From current company API"}
          icon={Building2}
        />
        <StatCard
          label={rtl ? "الإعدادات العامة" : "General settings"}
          value={stats.generalSettingsReady ? (rtl ? "جاهزة" : "Ready") : (rtl ? "غير مكتملة" : "Pending")}
          hint={rtl ? "إعدادات التشغيل" : "Operating settings"}
          icon={SlidersHorizontal}
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
                  className="group flex h-full min-h-[160px] flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">{page.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{page.description}</p>
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
  logo_url: string;
  city: string;
  district: string;
  street: string;
  building_number: string;
  postal_code: string;
  additional_number: string;
  unit_number: string;
  short_address: string;
  country: string;
};
const emptyCompanyProfile: CompanyProfileForm = {
  name: "",
  commercial_registration: "",
  tax_number: "",
  phone: "",
  email: "",
  website: "",
  logo_url: "",
  city: "",
  district: "",
  street: "",
  building_number: "",
  postal_code: "",
  additional_number: "",
  unit_number: "",
  short_address: "",
  country: "SA",
};
function getFirstText(records: ApiRecord[], keys: string[], fallback = ""): string {
  for (const record of records) {
    const value = getText(record, keys);
    if (value) return value;
  }
  return fallback;
}
function getNestedRecord(record: ApiRecord, keys: string[]): ApiRecord {
  for (const key of keys) {
    const nested = asRecord(record[key]);
    if (Object.keys(nested).length > 0) return nested;
  }
  return {};
}
function getCompanyLogoUrl(records: ApiRecord[]): string {
  for (const source of records) {
    const logo = source.logo;
    if (typeof logo === "string" && logo.trim()) return logo;
    const logoRecord = asRecord(logo);
    const logoFromRecord = getText(logoRecord, ["url", "file", "path", "logo_url"]);
    if (logoFromRecord) return logoFromRecord;
    const directLogo = getText(source, ["logo_url", "logo_path", "company_logo", "image", "avatar"]);
    if (directLogo) return directLogo;
  }
  return "";
}
function getProfileSourceRecords(profilePayload: unknown, whoamiPayload: unknown): ApiRecord[] {
  const root = asRecord(profilePayload);
  const data = asRecord(root.data);
  const whoami = asRecord(whoamiPayload);
  const whoamiData = asRecord(whoami.data);
  const membership = asRecord(whoami.membership ?? whoamiData.membership);
  const candidates = [
    getNestedRecord(root, ["company", "current_company", "currentCompany"]),
    getNestedRecord(data, ["company", "current_company", "currentCompany"]),
    getNestedRecord(root, ["profile", "company_profile", "companyProfile"]),
    getNestedRecord(data, ["profile", "company_profile", "companyProfile"]),
    getNestedRecord(membership, ["company"]),
    getNestedRecord(whoami, ["company", "current_company", "currentCompany"]),
    getNestedRecord(whoamiData, ["company", "current_company", "currentCompany"]),
    data,
    root,
    whoamiData,
    whoami,
  ];
  return candidates.filter((record) => Object.keys(record).length > 0);
}
function getNationalAddressRecords(records: ApiRecord[]): ApiRecord[] {
  const nestedKeys = [
    "national_address",
    "nationalAddress",
    "address_details",
    "address_detail",
    "addressComponents",
    "address_components",
  ];
  const nested = records.flatMap((record) => nestedKeys.map((key) => asRecord(record[key])));
  return [...nested, ...records].filter((record) => Object.keys(record).length > 0);
}
function buildNationalAddressLine(form: CompanyProfileForm): string {
  return [
    form.short_address,
    form.street,
    form.district,
    form.building_number ? `Building ${form.building_number}` : "",
    form.unit_number ? `Unit ${form.unit_number}` : "",
    form.postal_code,
    form.additional_number,
    form.city,
    form.country,
  ]
    .filter(Boolean)
    .join(" - ");
}
function ProfileSectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <UiCard className="group h-full overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-4">
        <div className="min-w-0">
          <CardTitle className="text-base font-bold tracking-tight">{title}</CardTitle>
          {description ? <CardDescription className="mt-1 text-sm leading-6">{description}</CardDescription> : null}
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </UiCard>
  );
}
export function CompanyProfilePage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const [form, setForm] = useState<CompanyProfileForm>(emptyCompanyProfile);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setField = (key: keyof CompanyProfileForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [profilePayload, whoamiPayload] = await Promise.all([
        apiRequest<unknown>("/api/company/profile/"),
        apiRequest<unknown>("/api/auth/whoami/").catch(() => null),
      ]);
      const profileRecords = getProfileSourceRecords(profilePayload, whoamiPayload);
      const addressRecords = getNationalAddressRecords(profileRecords);
      const logoUrl = getCompanyLogoUrl(profileRecords);
      setLogoFile(null);
      setLogoPreview(logoUrl);
      setForm({
        name: getFirstText(profileRecords, ["name", "company_name", "legal_name", "display_name", "title"]),
        commercial_registration: getFirstText(profileRecords, [
          "commercial_registration",
          "commercial_registration_number",
          "cr_number",
          "registration_number",
          "commercial_register",
        ]),
        tax_number: getFirstText(profileRecords, ["tax_number", "vat_number", "tax_id", "vat_registration_number"]),
        phone: getFirstText(profileRecords, ["phone", "mobile", "contact_phone", "phone_number"]),
        email: getFirstText(profileRecords, ["email", "contact_email"]),
        website: getFirstText(profileRecords, ["website", "website_url", "url"]),
        logo_url: logoUrl,
        city: getFirstText(addressRecords, ["city", "city_name"]),
        district: getFirstText(addressRecords, ["district", "neighborhood", "area"]),
        street: getFirstText(addressRecords, ["street", "street_name"]),
        building_number: getFirstText(addressRecords, ["building_number", "building_no", "building"]),
        postal_code: getFirstText(addressRecords, ["postal_code", "zip_code", "postcode"]),
        additional_number: getFirstText(addressRecords, ["additional_number", "secondary_number", "additional_no"]),
        unit_number: getFirstText(addressRecords, ["unit_number", "unit_no", "unit"]),
        short_address: getFirstText(addressRecords, ["short_address", "national_short_address", "short_code"]),
        country: getFirstText(addressRecords, ["country", "country_code"], "SA"),
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
  const onLogoChange = (file: File | undefined) => {
    if (!file) return;
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(rtl ? "صيغة الشعار غير مدعومة" : "Unsupported logo format");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(rtl ? "حجم الشعار يجب ألا يتجاوز 2MB" : "Logo size must not exceed 2MB");
      return;
    }
    if (logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };
  const resetLogoChange = () => {
    if (logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(null);
    setLogoPreview(form.logo_url);
  };
  const save = async () => {
    if (!form.name.trim()) {
      toast.error(rtl ? "اسم الشركة مطلوب" : "Company name is required");
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error(rtl ? "البريد الإلكتروني غير صحيح" : "Invalid email address");
      return;
    }
    const nationalAddress = {
      city: form.city.trim(),
      district: form.district.trim(),
      street: form.street.trim(),
      building_number: form.building_number.trim(),
      postal_code: form.postal_code.trim(),
      additional_number: form.additional_number.trim(),
      unit_number: form.unit_number.trim(),
      short_address: form.short_address.trim(),
      country: form.country.trim() || "SA",
    };
    const payload = {
      name: form.name.trim(),
      commercial_registration: form.commercial_registration.trim(),
      tax_number: form.tax_number.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      website: form.website.trim(),
      city: nationalAddress.city,
      district: nationalAddress.district,
      street: nationalAddress.street,
      building_number: nationalAddress.building_number,
      postal_code: nationalAddress.postal_code,
      additional_number: nationalAddress.additional_number,
      unit_number: nationalAddress.unit_number,
      short_address: nationalAddress.short_address,
      country: nationalAddress.country,
      address: buildNationalAddressLine({ ...form, ...nationalAddress }),
      national_address: nationalAddress,
    };
    try {
      setSaving(true);
      if (logoFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (typeof value === "object") {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value);
          }
        });
        formData.append("logo", logoFile);
        await apiRequest("/api/company/profile/", {
          method: "PATCH",
          body: formData,
        });
      } else {
        await apiRequest("/api/company/profile/", {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
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
      description={rtl ? "تحديث بيانات الشركة، الشعار، والعنوان الوطني." : "Update company details, logo, and national address."}
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
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <ProfileSectionCard title={rtl ? "بيانات الشركة" : "Company information"} icon={Building2}>
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label={rtl ? "اسم الشركة" : "Company name"} value={form.name} onChange={(value) => setField("name", value)} required />
                <TextInput label={rtl ? "السجل التجاري" : "Commercial registration"} value={form.commercial_registration} onChange={(value) => setField("commercial_registration", value)} />
                <TextInput label={rtl ? "الرقم الضريبي" : "Tax number"} value={form.tax_number} onChange={(value) => setField("tax_number", value)} />
                <TextInput label={rtl ? "رقم التواصل" : "Phone"} value={form.phone} onChange={(value) => setField("phone", value)} />
                <TextInput label={rtl ? "البريد الإلكتروني" : "Email"} value={form.email} onChange={(value) => setField("email", value)} type="email" />
                <TextInput label={rtl ? "الموقع الإلكتروني" : "Website"} value={form.website} onChange={(value) => setField("website", value)} />
              </div>
            </ProfileSectionCard>
            <ProfileSectionCard
              title={rtl ? "شعار الشركة" : "Company logo"}
              description={rtl ? "يظهر في المستندات وصفحات الشركة." : "Shown in documents and company pages."}
              icon={Building2}
            >
              <div className="flex min-h-[250px] flex-col items-center justify-center gap-4 text-center">
                <div
                  className="flex h-32 w-32 items-center justify-center rounded-3xl border bg-muted/30 bg-contain bg-center bg-no-repeat shadow-sm"
                  style={logoPreview ? { backgroundImage: `url(${logoPreview})` } : undefined}
                >
                  {!logoPreview ? <Building2 className="h-11 w-11 text-muted-foreground" /> : null}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <input
                    id="company-logo-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(event) => onLogoChange(event.target.files?.[0])}
                  />
                  <label
                    htmlFor="company-logo-upload"
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border bg-background px-4 text-sm font-semibold shadow-sm transition hover:bg-muted"
                  >
                    <Plus className="h-4 w-4" />
                    {rtl ? "تغيير الشعار" : "Change logo"}
                  </label>
                  {logoFile ? (
                    <Button type="button" variant="ghost" className="h-10 rounded-xl" onClick={resetLogoChange}>
                      {rtl ? "إلغاء" : "Cancel"}
                    </Button>
                  ) : null}
                </div>
                <p className="max-w-xs text-xs leading-6 text-muted-foreground">
                  {rtl ? "PNG, JPG, WebP, SVG — الحد الأعلى 2MB." : "PNG, JPG, WebP, SVG — max 2MB."}
                </p>
              </div>
            </ProfileSectionCard>
          </section>
          <ProfileSectionCard
            title={rtl ? "العنوان الوطني" : "National address"}
            description={rtl ? "يستخدم في المستندات والفواتير الرسمية." : "Used in official documents and invoices."}
            icon={Landmark}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TextInput label={rtl ? "المدينة" : "City"} value={form.city} onChange={(value) => setField("city", value)} />
              <TextInput label={rtl ? "الحي" : "District"} value={form.district} onChange={(value) => setField("district", value)} />
              <TextInput label={rtl ? "الشارع" : "Street"} value={form.street} onChange={(value) => setField("street", value)} />
              <TextInput label={rtl ? "رقم المبنى" : "Building number"} value={form.building_number} onChange={(value) => setField("building_number", value)} />
              <TextInput label={rtl ? "الرمز البريدي" : "Postal code"} value={form.postal_code} onChange={(value) => setField("postal_code", value)} />
              <TextInput label={rtl ? "الرقم الإضافي" : "Additional number"} value={form.additional_number} onChange={(value) => setField("additional_number", value)} />
              <TextInput label={rtl ? "رقم الوحدة" : "Unit number"} value={form.unit_number} onChange={(value) => setField("unit_number", value)} />
              <TextInput label={rtl ? "الدولة" : "Country"} value={form.country} onChange={(value) => setField("country", value)} />
              <TextInput label={rtl ? "العنوان المختصر" : "Short address"} value={form.short_address} onChange={(value) => setField("short_address", value)} />
            </div>
            <div className="mt-5 rounded-2xl border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground">{rtl ? "معاينة العنوان" : "Address preview"}</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {buildNationalAddressLine(form) || (rtl ? "لم يتم إدخال العنوان الوطني بعد." : "No national address entered yet.")}
              </p>
            </div>
          </ProfileSectionCard>
        </div>
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
  quotation_prefix: string;
  purchase_prefix: string;
  date_format: string;
  enable_notifications: boolean;
  allow_negative_stock: boolean;
  auto_post_accounting: boolean;
  print_footer: string;
};
const emptyGeneralSettings: GeneralSettingsForm = {
  default_currency: "SAR",
  language: "ar",
  timezone: "Asia/Riyadh",
  fiscal_year_start: "",
  invoice_prefix: "INV",
  quotation_prefix: "QUO",
  purchase_prefix: "PUR",
  date_format: "YYYY-MM-DD",
  enable_notifications: true,
  allow_negative_stock: false,
  auto_post_accounting: true,
  print_footer: "",
};
function getGeneralSettingsRecords(payload: unknown): ApiRecord[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const candidates = [
    getNestedRecord(root, ["settings", "company_settings", "general_settings", "generalSettings"]),
    getNestedRecord(data, ["settings", "company_settings", "general_settings", "generalSettings"]),
    data,
    root,
  ];
  return candidates.filter((record) => Object.keys(record).length > 0);
}
function getFirstBool(records: ApiRecord[], keys: string[], fallback = false): boolean {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value === 1;
      if (typeof value === "string") {
        const normalized = value.toLowerCase();
        if (["true", "1", "yes", "enabled", "active"].includes(normalized)) return true;
        if (["false", "0", "no", "disabled", "inactive"].includes(normalized)) return false;
      }
    }
  }
  return fallback;
}
const generalSettingsAr = {
  title: "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0639\u0627\u0645\u0629",
  description: "\u0625\u062f\u0627\u0631\u0629 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629 \u0644\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.",
  save: "\u062d\u0641\u0638",
  currency: "\u0627\u0644\u0639\u0645\u0644\u0629",
  currencyHint: "\u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629 \u0644\u0644\u0634\u0631\u0643\u0629",
  language: "\u0627\u0644\u0644\u063a\u0629",
  languageHint: "\u0644\u063a\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629",
  timezone: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0632\u0645\u0646\u064a\u0629",
  timezoneHint: "\u062a\u0633\u062a\u062e\u062f\u0645 \u0641\u064a \u0627\u0644\u0633\u062c\u0644\u0627\u062a \u0648\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631",
  operatingTitle: "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062a\u0634\u063a\u064a\u0644",
  operatingDescription: "\u0627\u0644\u0644\u063a\u0629\u060c \u0627\u0644\u0639\u0645\u0644\u0629\u060c \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0632\u0645\u0646\u064a\u0629\u060c \u0648\u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629.",
  defaultCurrency: "\u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629",
  defaultLanguage: "\u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629",
  arabic: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
  english: "\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629",
  fiscalYearStart: "\u0628\u062f\u0627\u064a\u0629 \u0627\u0644\u0633\u0646\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629",
  dateFormat: "\u0635\u064a\u063a\u0629 \u0627\u0644\u062a\u0627\u0631\u064a\u062e",
  controlsTitle: "\u0636\u0648\u0627\u0628\u0637 \u0627\u0644\u062a\u0634\u063a\u064a\u0644",
  controlsDescription: "\u062e\u064a\u0627\u0631\u0627\u062a \u062a\u0624\u062b\u0631 \u0639\u0644\u0649 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a\u060c \u0627\u0644\u0645\u062e\u0632\u0648\u0646\u060c \u0648\u0627\u0644\u062a\u0631\u062d\u064a\u0644.",
  enableNotifications: "\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
  enableNotificationsDescription: "\u0625\u0631\u0633\u0627\u0644 \u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629 \u062d\u0633\u0628 \u0627\u0644\u0623\u062d\u062f\u0627\u062b.",
  allowNegativeStock: "\u0627\u0644\u0633\u0645\u0627\u062d \u0628\u0627\u0644\u0645\u062e\u0632\u0648\u0646 \u0627\u0644\u0633\u0627\u0644\u0628",
  allowNegativeStockDescription: "\u064a\u0641\u0636\u0644 \u062a\u0639\u0637\u064a\u0644\u0647 \u0625\u0644\u0627 \u0639\u0646\u062f \u0627\u0644\u062d\u0627\u062c\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629.",
  autoPostAccounting: "\u0627\u0644\u062a\u0631\u062d\u064a\u0644 \u0627\u0644\u0645\u062d\u0627\u0633\u0628\u064a \u0627\u0644\u062a\u0644\u0642\u0627\u0626\u064a",
  autoPostAccountingDescription: "\u062a\u0631\u062d\u064a\u0644 \u0627\u0644\u0642\u064a\u0648\u062f \u0639\u0646\u062f \u0627\u0643\u062a\u0645\u0627\u0644 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a.",
  documentsTitle: "\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a \u0648\u0627\u0644\u0637\u0628\u0627\u0639\u0629",
  documentsDescription: "\u0628\u0627\u062f\u0626\u0627\u062a \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0648\u0627\u0644\u0639\u0631\u0648\u0636 \u0648\u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a \u0648\u062a\u0630\u064a\u064a\u0644 \u0627\u0644\u0637\u0628\u0627\u0639\u0629.",
  invoicePrefix: "\u0628\u0627\u062f\u0626\u0629 \u0641\u0648\u0627\u062a\u064a\u0631 \u0627\u0644\u0628\u064a\u0639",
  quotationPrefix: "\u0628\u0627\u062f\u0626\u0629 \u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631",
  purchasePrefix: "\u0628\u0627\u062f\u0626\u0629 \u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a",
  printFooter: "\u062a\u0630\u064a\u064a\u0644 \u0627\u0644\u0637\u0628\u0627\u0639\u0629",
  printFooterPlaceholder: "\u0645\u062b\u0627\u0644: \u0634\u0643\u0631\u0627\u064b \u0644\u062a\u0639\u0627\u0645\u0644\u0643\u0645 \u0645\u0639\u0646\u0627",
  documentPreview: "\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a",
  currencyRequired: "\u0627\u0644\u0639\u0645\u0644\u0629 \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a\u0629 \u0645\u0637\u0644\u0648\u0628\u0629",
  timezoneRequired: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0632\u0645\u0646\u064a\u0629 \u0645\u0637\u0644\u0648\u0628\u0629",
  loadError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0639\u0627\u0645\u0629",
  saveError: "\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a",
  saved: "\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0639\u0627\u0645\u0629",
};
const generalSettingsEn = {
  title: "General settings",
  description: "Manage default operating settings for the current company.",
  save: "Save",
  currency: "Currency",
  currencyHint: "Default company currency",
  language: "Language",
  languageHint: "Default operating language",
  timezone: "Timezone",
  timezoneHint: "Used in logs and reports",
  operatingTitle: "Operating settings",
  operatingDescription: "Language, currency, timezone, and fiscal year start.",
  defaultCurrency: "Default currency",
  defaultLanguage: "Default language",
  arabic: "Arabic",
  english: "English",
  fiscalYearStart: "Fiscal year start",
  dateFormat: "Date format",
  controlsTitle: "Operational controls",
  controlsDescription: "Controls for notifications, inventory, and posting.",
  enableNotifications: "Enable notifications",
  enableNotificationsDescription: "Send company alerts based on events.",
  allowNegativeStock: "Allow negative stock",
  allowNegativeStockDescription: "Usually kept disabled unless operationally required.",
  autoPostAccounting: "Automatic accounting posting",
  autoPostAccountingDescription: "Post entries when operations are completed.",
  documentsTitle: "Documents and printing",
  documentsDescription: "Prefixes for invoices, quotations, purchases, and print footer.",
  invoicePrefix: "Sales invoice prefix",
  quotationPrefix: "Quotation prefix",
  purchasePrefix: "Purchase prefix",
  printFooter: "Print footer",
  printFooterPlaceholder: "Example: Thank you for your business",
  documentPreview: "Document preview",
  currencyRequired: "Default currency is required",
  timezoneRequired: "Timezone is required",
  loadError: "Could not load general settings",
  saveError: "Could not save settings",
  saved: "General settings saved",
};
export function GeneralSettingsPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const t = rtl ? generalSettingsAr : generalSettingsEn;
  const [form, setForm] = useState<GeneralSettingsForm>(emptyGeneralSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setField = <K extends keyof GeneralSettingsForm>(key: K, value: GeneralSettingsForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiRequest<unknown>("/api/company/settings/");
      const records = getGeneralSettingsRecords(payload);
      setForm({
        default_currency: getFirstText(records, ["default_currency", "currency", "base_currency"], "SAR"),
        language: getFirstText(records, ["language", "default_language", "locale"], "ar"),
        timezone: getFirstText(records, ["timezone", "time_zone"], "Asia/Riyadh"),
        fiscal_year_start: getFirstText(records, ["fiscal_year_start", "financial_year_start", "year_start"]),
        invoice_prefix: getFirstText(records, ["invoice_prefix", "sales_invoice_prefix"], "INV"),
        quotation_prefix: getFirstText(records, ["quotation_prefix", "quote_prefix"], "QUO"),
        purchase_prefix: getFirstText(records, ["purchase_prefix", "purchase_bill_prefix"], "PUR"),
        date_format: getFirstText(records, ["date_format"], "YYYY-MM-DD"),
        enable_notifications: getFirstBool(records, ["enable_notifications", "notifications_enabled"], true),
        allow_negative_stock: getFirstBool(records, ["allow_negative_stock", "negative_stock_allowed"], false),
        auto_post_accounting: getFirstBool(records, ["auto_post_accounting", "automatic_posting_enabled"], true),
        print_footer: getFirstText(records, ["print_footer", "receipt_footer", "document_footer"]),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async () => {
    if (!form.default_currency.trim()) {
      toast.error(t.currencyRequired);
      return;
    }
    if (!form.timezone.trim()) {
      toast.error(t.timezoneRequired);
      return;
    }
    const payload = {
      default_currency: form.default_currency.trim(),
      currency: form.default_currency.trim(),
      language: form.language,
      default_language: form.language,
      timezone: form.timezone.trim(),
      fiscal_year_start: form.fiscal_year_start,
      invoice_prefix: form.invoice_prefix.trim(),
      quotation_prefix: form.quotation_prefix.trim(),
      purchase_prefix: form.purchase_prefix.trim(),
      date_format: form.date_format.trim(),
      enable_notifications: form.enable_notifications,
      allow_negative_stock: form.allow_negative_stock,
      auto_post_accounting: form.auto_post_accounting,
      print_footer: form.print_footer.trim(),
    };
    try {
      setSaving(true);
      await apiRequest("/api/company/settings/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      toast.success(t.saved);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.saveError);
    } finally {
      setSaving(false);
    }
  };
  return (
    <PageShell
      title={t.title}
      description={t.description}
      icon={SlidersHorizontal}
      actions={
        <PrimaryButton onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t.save}
        </PrimaryButton>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard label={t.currency} value={form.default_currency || "SAR"} hint={t.currencyHint} icon={CreditCard} />
            <StatCard label={t.language} value={form.language === "en" ? "English" : "Arabic"} hint={t.languageHint} icon={SlidersHorizontal} />
            <StatCard label={t.timezone} value={form.timezone || "Asia/Riyadh"} hint={t.timezoneHint} icon={Settings2} />
          </section>
          <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <ProfileSectionCard title={t.operatingTitle} description={t.operatingDescription} icon={SlidersHorizontal}>
              <div className="grid gap-4 md:grid-cols-2">
                <SelectInput
                  label={t.defaultCurrency}
                  value={form.default_currency}
                  onChange={(value) => setField("default_currency", value)}
                  options={[{ value: "SAR", label: "SAR" }]}
                />
                <SelectInput
                  label={t.defaultLanguage}
                  value={form.language}
                  onChange={(value) => setField("language", value)}
                  options={[
                    { value: "ar", label: t.arabic },
                    { value: "en", label: t.english },
                  ]}
                />
                <TextInput label={t.timezone} value={form.timezone} onChange={(value) => setField("timezone", value)} />
                <TextInput
                  label={t.fiscalYearStart}
                  value={form.fiscal_year_start}
                  onChange={(value) => setField("fiscal_year_start", value)}
                  type="date"
                />
                <SelectInput
                  label={t.dateFormat}
                  value={form.date_format}
                  onChange={(value) => setField("date_format", value)}
                  options={[
                    { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
                    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
                    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
                  ]}
                />
              </div>
            </ProfileSectionCard>
            <ProfileSectionCard title={t.controlsTitle} description={t.controlsDescription} icon={ShieldCheck}>
              <div className="space-y-4">
                <ToggleInput
                  label={t.enableNotifications}
                  description={t.enableNotificationsDescription}
                  checked={form.enable_notifications}
                  onChange={(value) => setField("enable_notifications", value)}
                />
                <ToggleInput
                  label={t.allowNegativeStock}
                  description={t.allowNegativeStockDescription}
                  checked={form.allow_negative_stock}
                  onChange={(value) => setField("allow_negative_stock", value)}
                />
                <ToggleInput
                  label={t.autoPostAccounting}
                  description={t.autoPostAccountingDescription}
                  checked={form.auto_post_accounting}
                  onChange={(value) => setField("auto_post_accounting", value)}
                />
              </div>
            </ProfileSectionCard>
          </section>
          <ProfileSectionCard title={t.documentsTitle} description={t.documentsDescription} icon={FileText}>
            <div className="grid gap-4 md:grid-cols-3">
              <TextInput label={t.invoicePrefix} value={form.invoice_prefix} onChange={(value) => setField("invoice_prefix", value)} />
              <TextInput label={t.quotationPrefix} value={form.quotation_prefix} onChange={(value) => setField("quotation_prefix", value)} />
              <TextInput label={t.purchasePrefix} value={form.purchase_prefix} onChange={(value) => setField("purchase_prefix", value)} />
              <TextArea
                label={t.printFooter}
                value={form.print_footer}
                onChange={(value) => setField("print_footer", value)}
                placeholder={t.printFooterPlaceholder}
              />
            </div>
            <div className="mt-5 rounded-2xl border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground">{t.documentPreview}</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {form.invoice_prefix || "INV"}-000001 ? {form.quotation_prefix || "QUO"}-000001 ? {form.purchase_prefix || "PUR"}-000001
              </p>
            </div>
          </ProfileSectionCard>
        </div>
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
  district: string;
  address: string;
  is_active: boolean;
  is_main: boolean;
};
const emptyBranchForm: BranchForm = {
  name: "",
  code: "",
  phone: "",
  email: "",
  city: "",
  district: "",
  address: "",
  is_active: true,
  is_main: false,
};
const branchesAr = {
  title: "\u0627\u0644\u0641\u0631\u0648\u0639",
  description: "\u0625\u062f\u0627\u0631\u0629 \u0641\u0631\u0648\u0639 \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629 \u0648\u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0647\u0627 \u062f\u0627\u062e\u0644 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a.",
  refresh: "\u062a\u062d\u062f\u064a\u062b",
  addBranch: "\u0625\u0636\u0627\u0641\u0629 \u0641\u0631\u0639",
  editBranch: "\u062a\u0639\u062f\u064a\u0644 \u0641\u0631\u0639",
  formDescription: "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629 \u0648\u062d\u0627\u0644\u062a\u0647 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629.",
  listTitle: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0641\u0631\u0648\u0639",
  listDescription: "\u0639\u0631\u0636 \u0648\u0625\u062f\u0627\u0631\u0629 \u0641\u0631\u0648\u0639 \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.",
  totalBranches: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0641\u0631\u0648\u0639",
  activeBranches: "\u0641\u0631\u0648\u0639 \u0646\u0634\u0637\u0629",
  inactiveBranches: "\u0641\u0631\u0648\u0639 \u0645\u0639\u0637\u0644\u0629",
  mainBranches: "\u0641\u0631\u0648\u0639 \u0631\u0626\u064a\u0633\u064a\u0629",
  totalHint: "\u0641\u0631\u0648\u0639 \u0645\u0633\u062c\u0644\u0629 \u0644\u0644\u0634\u0631\u0643\u0629",
  activeHint: "\u0645\u062a\u0627\u062d\u0629 \u0644\u0644\u0639\u0645\u0644\u064a\u0627\u062a",
  inactiveHint: "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629 \u062d\u0627\u0644\u064a\u0627\u064b",
  mainHint: "\u0641\u0631\u0639 \u0623\u0633\u0627\u0633\u064a \u0623\u0648 \u0631\u0626\u064a\u0633\u064a",
  searchPlaceholder: "\u0627\u0628\u062d\u062b \u0628\u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u0639 \u0623\u0648 \u0627\u0644\u0643\u0648\u062f \u0623\u0648 \u0627\u0644\u0645\u062f\u064a\u0646\u0629...",
  noBranches: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0641\u0631\u0648\u0639",
  noBranchesDescription: "\u0633\u062a\u0638\u0647\u0631 \u0627\u0644\u0641\u0631\u0648\u0639 \u0647\u0646\u0627 \u0639\u0646\u062f \u0625\u0646\u0634\u0627\u0626\u0647\u0627 \u0623\u0648 \u0639\u0646\u062f \u062a\u0648\u0641\u0631\u0647\u0627 \u0645\u0646 \u0627\u0644\u0640 API.",
  name: "\u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u0639",
  code: "\u0643\u0648\u062f \u0627\u0644\u0641\u0631\u0639",
  phone: "\u0631\u0642\u0645 \u0627\u0644\u062a\u0648\u0627\u0635\u0644",
  email: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a",
  city: "\u0627\u0644\u0645\u062f\u064a\u0646\u0629",
  district: "\u0627\u0644\u062d\u064a",
  address: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646",
  activeBranch: "\u0641\u0631\u0639 \u0646\u0634\u0637",
  activeBranchDescription: "\u064a\u0645\u0643\u0646 \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0647 \u0641\u064a \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0648\u0627\u0644\u0645\u062e\u0632\u0648\u0646 \u0648\u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a.",
  mainBranch: "\u0641\u0631\u0639 \u0631\u0626\u064a\u0633\u064a",
  mainBranchDescription: "\u064a\u0633\u062a\u062e\u062f\u0645 \u0643\u0641\u0631\u0639 \u0627\u0641\u062a\u0631\u0627\u0636\u064a \u0639\u0646\u062f \u0627\u0644\u062d\u0627\u062c\u0629.",
  save: "\u062d\u0641\u0638",
  cancel: "\u0625\u0644\u063a\u0627\u0621",
  edit: "\u062a\u0639\u062f\u064a\u0644",
  activate: "\u062a\u0641\u0639\u064a\u0644",
  deactivate: "\u062a\u0639\u0637\u064a\u0644",
  branch: "\u0627\u0644\u0641\u0631\u0639",
  contact: "\u0627\u0644\u062a\u0648\u0627\u0635\u0644",
  location: "\u0627\u0644\u0645\u0648\u0642\u0639",
  status: "\u0627\u0644\u062d\u0627\u0644\u0629",
  actions: "\u0625\u062c\u0631\u0627\u0621\u0627\u062a",
  active: "\u0646\u0634\u0637",
  inactive: "\u063a\u064a\u0631 \u0646\u0634\u0637",
  main: "\u0631\u0626\u064a\u0633\u064a",
  nameRequired: "\u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u0639 \u0645\u0637\u0644\u0648\u0628",
  emailInvalid: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u063a\u064a\u0631 \u0635\u062d\u064a\u062d",
  loadError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0641\u0631\u0648\u0639",
  saveError: "\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0627\u0644\u0641\u0631\u0639",
  statusError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0627\u0644\u0641\u0631\u0639",
  created: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0641\u0631\u0639",
  updated: "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0641\u0631\u0639",
  activated: "\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0641\u0631\u0639",
  deactivated: "\u062a\u0645 \u062a\u0639\u0637\u064a\u0644 \u0627\u0644\u0641\u0631\u0639",
};
const branchesEn = {
  title: "Branches",
  description: "Manage current company branches and use them across operations.",
  refresh: "Refresh",
  addBranch: "Add branch",
  editBranch: "Edit branch",
  formDescription: "Branch core details and operational status.",
  listTitle: "Branches list",
  listDescription: "View and manage current company branches.",
  totalBranches: "Total branches",
  activeBranches: "Active branches",
  inactiveBranches: "Inactive branches",
  mainBranches: "Main branches",
  totalHint: "Registered company branches",
  activeHint: "Available for operations",
  inactiveHint: "Currently unavailable",
  mainHint: "Default or primary branch",
  searchPlaceholder: "Search branch name, code, or city...",
  noBranches: "No branches",
  noBranchesDescription: "Branches will appear here when created or returned by the API.",
  name: "Branch name",
  code: "Branch code",
  phone: "Phone",
  email: "Email",
  city: "City",
  district: "District",
  address: "Address",
  activeBranch: "Active branch",
  activeBranchDescription: "Can be used in sales, inventory, and operations.",
  mainBranch: "Main branch",
  mainBranchDescription: "Used as the default branch when needed.",
  save: "Save",
  cancel: "Cancel",
  edit: "Edit",
  activate: "Activate",
  deactivate: "Deactivate",
  branch: "Branch",
  contact: "Contact",
  location: "Location",
  status: "Status",
  actions: "Actions",
  active: "Active",
  inactive: "Inactive",
  main: "Main",
  nameRequired: "Branch name is required",
  emailInvalid: "Invalid email address",
  loadError: "Could not load branches",
  saveError: "Could not save branch",
  statusError: "Could not update branch status",
  created: "Branch created",
  updated: "Branch updated",
  activated: "Branch activated",
  deactivated: "Branch deactivated",
};
function getBranchName(row: ApiRecord): string {
  return getText(row, ["name", "branch_name", "title"], "-");
}
function getBranchCode(row: ApiRecord): string {
  return getText(row, ["code", "branch_code", "reference"], "-");
}
function getBranchActive(row: ApiRecord): boolean {
  return getBool(row, ["is_active", "active", "enabled"], true);
}
function getBranchMain(row: ApiRecord): boolean {
  return getBool(row, ["is_main", "main", "is_default", "default"], false);
}
export function BranchesPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const t = rtl ? branchesAr : branchesEn;
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<BranchForm>(emptyBranchForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const setField = <K extends keyof BranchForm>(key: K, value: BranchForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const branchStats = useMemo(() => {
    const active = rows.filter((row) => getBranchActive(row)).length;
    const main = rows.filter((row) => getBranchMain(row)).length;
    return {
      total: rows.length,
      active,
      inactive: Math.max(rows.length - active, 0),
      main,
    };
  }, [rows]);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiRequest<unknown>("/api/company/branches/");
      setRows(normalizeList(payload));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);
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
      name: getText(row, ["name", "branch_name", "title"]),
      code: getText(row, ["code", "branch_code", "reference"]),
      phone: getText(row, ["phone", "mobile", "contact_phone"]),
      email: getText(row, ["email", "contact_email"]),
      city: getText(row, ["city", "city_name"]),
      district: getText(row, ["district", "neighborhood", "area"]),
      address: getText(row, ["address", "full_address"]),
      is_active: getBranchActive(row),
      is_main: getBranchMain(row),
    });
  };
  const save = async () => {
    if (!form.name.trim()) {
      toast.error(t.nameRequired);
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error(t.emailInvalid);
      return;
    }
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      address: form.address.trim(),
      is_active: form.is_active,
      is_main: form.is_main,
    };
    try {
      setSaving(true);
      await apiRequest(editingId ? `/api/company/branches/${editingId}/` : "/api/company/branches/", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(editingId ? t.updated : t.created);
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.saveError);
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
      toast.success(nextActive ? t.activated : t.deactivated);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.statusError);
    }
  };
  const filteredRows = rows.filter((row) => {
    const haystack = [
      getBranchName(row),
      getBranchCode(row),
      getText(row, ["phone", "mobile", "contact_phone"]),
      getText(row, ["email", "contact_email"]),
      getText(row, ["city", "city_name"]),
      getText(row, ["district", "neighborhood", "area"]),
      getText(row, ["address", "full_address"]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  return (
    <PageShell
      title={t.title}
      description={t.description}
      icon={Store}
      actions={
        <SecondaryButton onClick={() => void load()} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          {t.refresh}
        </SecondaryButton>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t.totalBranches} value={branchStats.total} hint={t.totalHint} icon={Store} />
            <StatCard label={t.activeBranches} value={branchStats.active} hint={t.activeHint} icon={CheckCircle2} />
            <StatCard label={t.inactiveBranches} value={branchStats.inactive} hint={t.inactiveHint} icon={XCircle} />
            <StatCard label={t.mainBranches} value={branchStats.main} hint={t.mainHint} icon={Building2} />
          </section>
          <section className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)]">
            <ProfileSectionCard
              title={editingId ? t.editBranch : t.addBranch}
              description={t.formDescription}
              icon={editingId ? Store : Plus}
            >
              <div className="grid gap-4">
                <TextInput label={t.name} value={form.name} onChange={(value) => setField("name", value)} required />
                <TextInput label={t.code} value={form.code} onChange={(value) => setField("code", value)} />
                <TextInput label={t.phone} value={form.phone} onChange={(value) => setField("phone", value)} />
                <TextInput label={t.email} value={form.email} onChange={(value) => setField("email", value)} type="email" />
                <TextInput label={t.city} value={form.city} onChange={(value) => setField("city", value)} />
                <TextInput label={t.district} value={form.district} onChange={(value) => setField("district", value)} />
                <TextArea label={t.address} value={form.address} onChange={(value) => setField("address", value)} />
                <ToggleInput
                  label={t.activeBranch}
                  description={t.activeBranchDescription}
                  checked={form.is_active}
                  onChange={(value) => setField("is_active", value)}
                />
                <ToggleInput
                  label={t.mainBranch}
                  description={t.mainBranchDescription}
                  checked={form.is_main}
                  onChange={(value) => setField("is_main", value)}
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <PrimaryButton onClick={() => void save()} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t.save}
                  </PrimaryButton>
                  {editingId ? <SecondaryButton onClick={resetForm}>{t.cancel}</SecondaryButton> : null}
                </div>
              </div>
            </ProfileSectionCard>
            <ProfileSectionCard title={t.listTitle} description={t.listDescription} icon={Store}>
              <div className="mb-4">
                <SearchBox value={query} onChange={setQuery} placeholder={t.searchPlaceholder} />
              </div>
              {filteredRows.length === 0 ? (
                <EmptyState title={t.noBranches} description={t.noBranchesDescription} />
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] text-sm">
                      <thead className="border-b bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-start font-semibold">{t.branch}</th>
                          <th className="px-4 py-3 text-start font-semibold">{t.contact}</th>
                          <th className="px-4 py-3 text-start font-semibold">{t.location}</th>
                          <th className="px-4 py-3 text-start font-semibold">{t.status}</th>
                          <th className="px-4 py-3 text-start font-semibold">{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredRows.map((row, index) => {
                          const active = getBranchActive(row);
                          const main = getBranchMain(row);
                          return (
                            <tr key={getRowId(row) || index} className="bg-card transition hover:bg-muted/30">
                              <td className="px-4 py-4">
                                <p className="font-semibold text-foreground">{getBranchName(row)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{getBranchCode(row)}</p>
                              </td>
                              <td className="px-4 py-4 text-muted-foreground">
                                <p>{getText(row, ["phone", "mobile", "contact_phone"], "-")}</p>
                                <p className="mt-1 text-xs">{getText(row, ["email", "contact_email"], "-")}</p>
                              </td>
                              <td className="px-4 py-4 text-muted-foreground">
                                <p>{getText(row, ["city", "city_name"], "-")}</p>
                                <p className="mt-1 text-xs">{getText(row, ["district", "neighborhood", "area"], "-")}</p>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <StatusPill active={active} />
                                  {main ? (
                                    <Badge variant="outline" className="rounded-full bg-muted px-2.5 py-1 text-xs">
                                      {t.main}
                                    </Badge>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <SecondaryButton onClick={() => edit(row)}>{t.edit}</SecondaryButton>
                                  <SecondaryButton onClick={() => void toggleActive(row, !active)}>
                                    {active ? t.deactivate : t.activate}
                                  </SecondaryButton>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </ProfileSectionCard>
          </section>
        </div>
      )}
    </PageShell>
  );
}

type CompanyUserStatusFilter = "all" | "active" | "inactive";
type CompanyUserSortKey = "newest" | "oldest" | "name" | "role";
type UserForm = {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  branch_id: string;
  is_active: boolean;
};
const emptyUserForm: UserForm = {
  full_name: "",
  email: "",
  phone: "",
  role: "VIEWER",
  branch_id: "",
  is_active: true,
};
const companyUsersAr = {
  title: "\u0645\u0633\u062a\u062e\u062f\u0645\u0648 \u0627\u0644\u0634\u0631\u0643\u0629",
  description: "\u0625\u062f\u0627\u0631\u0629 \u0645\u0633\u062a\u062e\u062f\u0645\u064a \u0627\u0644\u0634\u0631\u0643\u0629\u060c \u0627\u0644\u0623\u062f\u0648\u0627\u0631\u060c \u0627\u0644\u0641\u0631\u0648\u0639\u060c \u0648\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0641\u0639\u064a\u0644 \u0628\u0646\u0641\u0633 \u0646\u0645\u0637 \u0645\u0633\u062a\u062e\u062f\u0645\u064a \u0627\u0644\u0646\u0638\u0627\u0645.",
  refresh: "\u062a\u062d\u062f\u064a\u062b",
  exportExcel: "\u062a\u0635\u062f\u064a\u0631 Excel",
  print: "\u0637\u0628\u0627\u0639\u0629",
  addUser: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0633\u062a\u062e\u062f\u0645",
  editUser: "\u062a\u0639\u062f\u064a\u0644 \u0645\u0633\u062a\u062e\u062f\u0645",
  formDescription: "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0648\u062f\u0648\u0631\u0647 \u0648\u0627\u0631\u062a\u0628\u0627\u0637\u0647 \u0628\u0627\u0644\u0641\u0631\u0639.",
  usersList: "\u0642\u0627\u0626\u0645\u0629 \u0645\u0633\u062a\u062e\u062f\u0645\u064a \u0627\u0644\u0634\u0631\u0643\u0629",
  usersListDescription: "\u0639\u0631\u0636 \u0648\u0645\u062a\u0627\u0628\u0639\u0629 \u0645\u0633\u062a\u062e\u062f\u0645\u064a \u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0639 \u0627\u0644\u0628\u062d\u062b \u0648\u0627\u0644\u062a\u0635\u0641\u064a\u0629 \u0648\u0627\u0644\u062a\u0635\u062f\u064a\u0631.",
  filters: "\u0627\u0644\u0628\u062d\u062b \u0648\u0627\u0644\u062a\u0635\u0641\u064a\u0629",
  filtersDescription: "\u0627\u0628\u062d\u062b \u0628\u0627\u0644\u0627\u0633\u0645\u060c \u0627\u0644\u0628\u0631\u064a\u062f\u060c \u0627\u0644\u062f\u0648\u0631\u060c \u0623\u0648 \u0627\u0644\u0641\u0631\u0639.",
  totalUsers: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646",
  activeUsers: "\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646 \u0646\u0634\u0637\u0648\u0646",
  inactiveUsers: "\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646 \u0645\u0639\u0637\u0644\u0648\u0646",
  adminUsers: "\u0625\u062f\u0627\u0631\u064a\u0648\u0646 \u0648\u0645\u0634\u0631\u0641\u0648\u0646",
  totalHint: "\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646 \u062f\u0627\u062e\u0644 \u0627\u0644\u0634\u0631\u0643\u0629",
  activeHint: "\u0645\u062a\u0627\u062d\u0648\u0646 \u0644\u0644\u062f\u062e\u0648\u0644 \u0648\u0627\u0644\u0639\u0645\u0644",
  inactiveHint: "\u062a\u0645 \u062a\u0639\u0637\u064a\u0644 \u0648\u0635\u0648\u0644\u0647\u0645",
  adminHint: "\u0623\u062f\u0648\u0627\u0631 \u0625\u062f\u0627\u0631\u064a\u0629 \u0623\u0648 \u0625\u0634\u0631\u0627\u0641\u064a\u0629",
  searchPlaceholder: "\u0627\u0628\u062d\u062b \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0628\u0631\u064a\u062f \u0623\u0648 \u0627\u0644\u062f\u0648\u0631 \u0623\u0648 \u0627\u0644\u0641\u0631\u0639...",
  statusFilter: "\u0627\u0644\u062d\u0627\u0644\u0629",
  sortBy: "\u0627\u0644\u062a\u0631\u062a\u064a\u0628",
  all: "\u0627\u0644\u0643\u0644",
  active: "\u0646\u0634\u0637",
  inactive: "\u063a\u064a\u0631 \u0646\u0634\u0637",
  newest: "\u0627\u0644\u0623\u062d\u062f\u062b",
  oldest: "\u0627\u0644\u0623\u0642\u062f\u0645",
  nameSort: "\u0627\u0644\u0627\u0633\u0645",
  roleSort: "\u0627\u0644\u062f\u0648\u0631",
  reset: "\u0625\u0639\u0627\u062f\u0629 \u0636\u0628\u0637",
  fullName: "\u0627\u0644\u0627\u0633\u0645",
  email: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a",
  phone: "\u0631\u0642\u0645 \u0627\u0644\u062a\u0648\u0627\u0635\u0644",
  role: "\u0627\u0644\u062f\u0648\u0631",
  branch: "\u0627\u0644\u0641\u0631\u0639",
  noBranch: "\u0628\u062f\u0648\u0646 \u0641\u0631\u0639 \u0645\u062d\u062f\u062f",
  activeUser: "\u0645\u0633\u062a\u062e\u062f\u0645 \u0646\u0634\u0637",
  activeUserDescription: "\u064a\u0633\u062a\u0637\u064a\u0639 \u0627\u0644\u062f\u062e\u0648\u0644 \u0648\u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u062d\u0633\u0628 \u0635\u0644\u0627\u062d\u064a\u0627\u062a\u0647.",
  save: "\u062d\u0641\u0638",
  cancel: "\u0625\u0644\u063a\u0627\u0621",
  edit: "\u062a\u0639\u062f\u064a\u0644",
  activate: "\u062a\u0641\u0639\u064a\u0644",
  deactivate: "\u062a\u0639\u0637\u064a\u0644",
  user: "\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
  contact: "\u0627\u0644\u062a\u0648\u0627\u0635\u0644",
  status: "\u0627\u0644\u062d\u0627\u0644\u0629",
  createdAt: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0636\u0627\u0641\u0629",
  actions: "\u0625\u062c\u0631\u0627\u0621\u0627\u062a",
  noUsers: "\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646",
  noUsersDescription: "\u0633\u062a\u0638\u0647\u0631 \u0645\u0633\u062a\u062e\u062f\u0645\u0648 \u0627\u0644\u0634\u0631\u0643\u0629 \u0647\u0646\u0627 \u0639\u0646\u062f \u062a\u0648\u0641\u0631\u0647\u0645 \u0645\u0646 \u0627\u0644\u0640 API \u0623\u0648 \u0639\u0646\u062f \u0625\u0636\u0627\u0641\u062a\u0647\u0645.",
  noResults: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c",
  noResultsDescription: "\u063a\u064a\u0631 \u0645\u0637\u0627\u0628\u0642 \u0644\u0644\u0628\u062d\u062b \u0623\u0648 \u0627\u0644\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.",
  owner: "\u0645\u0627\u0644\u0643",
  admin: "\u0645\u062f\u064a\u0631",
  manager: "\u0645\u0634\u0631\u0641",
  accountant: "\u0645\u062d\u0627\u0633\u0628",
  cashier: "\u0643\u0627\u0634\u064a\u0631",
  sales: "\u0645\u0628\u064a\u0639\u0627\u062a",
  inventory: "\u0645\u062e\u0632\u0648\u0646",
  hr: "\u0645\u0648\u0627\u0631\u062f \u0628\u0634\u0631\u064a\u0629",
  employee: "\u0645\u0648\u0638\u0641",
  viewer: "\u0645\u0634\u0627\u0647\u062f",
  emailRequired: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0645\u0637\u0644\u0648\u0628",
  emailInvalid: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u063a\u064a\u0631 \u0635\u062d\u064a\u062d",
  loadError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0645\u0633\u062a\u062e\u062f\u0645\u064a \u0627\u0644\u0634\u0631\u0643\u0629",
  saveError: "\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
  statusError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
  created: "\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
  updated: "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
  activated: "\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
  deactivated: "\u062a\u0645 \u062a\u0639\u0637\u064a\u0644 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
  exported: "\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u0645\u0633\u062a\u062e\u062f\u0645\u064a \u0627\u0644\u0634\u0631\u0643\u0629",
};
const companyUsersEn = {
  title: "Company users",
  description: "Manage company users, roles, branches, and activation status using the same system users pattern.",
  refresh: "Refresh",
  exportExcel: "Export Excel",
  print: "Print",
  addUser: "Add user",
  editUser: "Edit user",
  formDescription: "User identity, role, branch, and access status.",
  usersList: "Company users list",
  usersListDescription: "View and manage company users with search, filters, and export.",
  filters: "Search and filters",
  filtersDescription: "Search by name, email, role, or branch.",
  totalUsers: "Total users",
  activeUsers: "Active users",
  inactiveUsers: "Inactive users",
  adminUsers: "Admins and managers",
  totalHint: "Users inside the company",
  activeHint: "Can sign in and work",
  inactiveHint: "Access is disabled",
  adminHint: "Administrative or management roles",
  searchPlaceholder: "Search name, email, role, or branch...",
  statusFilter: "Status",
  sortBy: "Sort by",
  all: "All",
  active: "Active",
  inactive: "Inactive",
  newest: "Newest",
  oldest: "Oldest",
  nameSort: "Name",
  roleSort: "Role",
  reset: "Reset",
  fullName: "Name",
  email: "Email",
  phone: "Phone",
  role: "Role",
  branch: "Branch",
  noBranch: "No specific branch",
  activeUser: "Active user",
  activeUserDescription: "Can sign in and use features according to permissions.",
  save: "Save",
  cancel: "Cancel",
  edit: "Edit",
  activate: "Activate",
  deactivate: "Deactivate",
  user: "User",
  contact: "Contact",
  status: "Status",
  createdAt: "Created at",
  actions: "Actions",
  noUsers: "No users",
  noUsersDescription: "Company users will appear here when returned by the API or after adding them.",
  noResults: "No results",
  noResultsDescription: "No users match the current search or filters.",
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  accountant: "Accountant",
  cashier: "Cashier",
  sales: "Sales",
  inventory: "Inventory",
  hr: "HR",
  employee: "Employee",
  viewer: "Viewer",
  emailRequired: "Email is required",
  emailInvalid: "Invalid email address",
  loadError: "Could not load company users",
  saveError: "Could not save user",
  statusError: "Could not update user status",
  created: "User added",
  updated: "User updated",
  activated: "User activated",
  deactivated: "User deactivated",
  exported: "Company users exported",
};
function getCompanyUserName(row: ApiRecord): string {
  const user = asRecord(row.user);
  return (
    getText(row, ["full_name", "name", "display_name"]) ||
    getText(user, ["full_name", "name", "display_name", "username"]) ||
    getText(row, ["username"], "-")
  );
}
function getCompanyUserEmail(row: ApiRecord): string {
  const user = asRecord(row.user);
  return getText(row, ["email"]) || getText(user, ["email"], "-");
}
function getCompanyUserPhone(row: ApiRecord): string {
  const user = asRecord(row.user);
  return getText(row, ["phone", "mobile", "contact_phone"]) || getText(user, ["phone", "mobile"], "-");
}
function getCompanyUserRole(row: ApiRecord): string {
  return getText(row, ["role", "company_role", "membership_role", "access_role"], "VIEWER").toUpperCase();
}
function getCompanyUserBranchName(row: ApiRecord, branches: ApiRecord[]): string {
  const branchRecord = asRecord(row.branch);
  const direct = getText(row, ["branch_name", "branch"]);
  const nested = getText(branchRecord, ["name", "branch_name", "title"]);
  if (direct && direct !== "[object Object]") return direct;
  if (nested) return nested;
  const branchId = getText(row, ["branch_id"]);
  const matched = branches.find((branch) => getRowId(branch) === branchId);
  return matched ? getText(matched, ["name", "branch_name", "title"], branchId) : "";
}
function getCompanyUserActive(row: ApiRecord): boolean {
  const user = asRecord(row.user);
  if (Object.keys(user).length > 0) {
    return getBool(user, ["is_active", "active", "enabled"], getBool(row, ["is_active", "active", "enabled"], true));
  }
  return getBool(row, ["is_active", "active", "enabled"], true);
}
function getCompanyUserCreatedAt(row: ApiRecord): string {
  const user = asRecord(row.user);
  return (
    getText(row, ["created_at", "created", "date_joined", "joined_at"]) ||
    getText(user, ["created_at", "created", "date_joined", "joined_at"])
  );
}
function formatCompanyUsersDate(value: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return formatEnglishDateTime(parsed);
}
function getCompanyUserRoleLabel(role: string, t: typeof companyUsersEn): string {
  const normalized = role.toUpperCase();
  const labels: Record<string, string> = {
    OWNER: t.owner,
    ADMIN: t.admin,
    MANAGER: t.manager,
    ACCOUNTANT: t.accountant,
    CASHIER: t.cashier,
    SALES: t.sales,
    INVENTORY: t.inventory,
    HR: t.hr,
    EMPLOYEE: t.employee,
    VIEWER: t.viewer,
  };
  return labels[normalized] || role || "-";
}
function buildCompanyUsersExcel(rows: ApiRecord[], branches: ApiRecord[], t: typeof companyUsersEn): string {
  const headers = [t.user, t.email, t.phone, t.role, t.branch, t.status, t.createdAt];
  const body = rows.map((row) => {
    const active = getCompanyUserActive(row);
    return [
      getCompanyUserName(row),
      getCompanyUserEmail(row),
      getCompanyUserPhone(row),
      getCompanyUserRoleLabel(getCompanyUserRole(row), t),
      getCompanyUserBranchName(row, branches) || t.noBranch,
      active ? t.active : t.inactive,
      formatCompanyUsersDate(getCompanyUserCreatedAt(row)),
    ];
  });
  return [headers, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join("\t"))
    .join("\n");
}
export function CompanyUsersPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const t = rtl ? companyUsersAr : companyUsersEn;
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [branches, setBranches] = useState<ApiRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CompanyUserStatusFilter>("all");
  const [sortKey, setSortKey] = useState<CompanyUserSortKey>("newest");
  const [form, setForm] = useState<UserForm>(emptyUserForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const roleOptions = useMemo(
    () => [
      { value: "OWNER", label: t.owner },
      { value: "ADMIN", label: t.admin },
      { value: "MANAGER", label: t.manager },
      { value: "ACCOUNTANT", label: t.accountant },
      { value: "CASHIER", label: t.cashier },
      { value: "SALES", label: t.sales },
      { value: "INVENTORY", label: t.inventory },
      { value: "HR", label: t.hr },
      { value: "EMPLOYEE", label: t.employee },
      { value: "VIEWER", label: t.viewer },
    ],
    [t],
  );
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
      toast.error(error instanceof Error ? error.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);
  useEffect(() => {
    void load();
  }, [load]);
  const userStats = useMemo(() => {
    const active = rows.filter((row) => getCompanyUserActive(row)).length;
    const adminRoles = ["OWNER", "ADMIN", "MANAGER"];
    const admins = rows.filter((row) => adminRoles.includes(getCompanyUserRole(row))).length;
    return {
      total: rows.length,
      active,
      inactive: Math.max(rows.length - active, 0),
      admins,
    };
  }, [rows]);
  const resetForm = () => {
    setEditingId("");
    setForm(emptyUserForm);
  };
  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setSortKey("newest");
  };
  const edit = (row: ApiRecord) => {
    const user = asRecord(row.user);
    const branchRecord = asRecord(row.branch);
    setEditingId(getRowId(row));
    setForm({
      full_name: getCompanyUserName(row) === "-" ? "" : getCompanyUserName(row),
      email: getCompanyUserEmail(row) === "-" ? "" : getCompanyUserEmail(row),
      phone: getCompanyUserPhone(row) === "-" ? "" : getCompanyUserPhone(row),
      role: getCompanyUserRole(row) || "VIEWER",
      branch_id: getText(row, ["branch_id"]) || getRowId(branchRecord),
      is_active: getBool(user, ["is_active", "active", "enabled"], getCompanyUserActive(row)),
    });
  };
  const save = async () => {
    if (!form.email.trim()) {
      toast.error(t.emailRequired);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error(t.emailInvalid);
      return;
    }
    const payload: ApiRecord = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      role: form.role,
      is_active: form.is_active,
    };
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.branch_id) payload.branch_id = form.branch_id;
    try {
      setSaving(true);
      await apiRequest(editingId ? `/api/company/users/${editingId}/` : "/api/company/users/", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(editingId ? t.updated : t.created);
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.saveError);
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
      toast.success(nextActive ? t.activated : t.deactivated);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.statusError);
    }
  };
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const active = getCompanyUserActive(row);
        if (statusFilter === "active" && !active) return false;
        if (statusFilter === "inactive" && active) return false;
        const haystack = [
          getCompanyUserName(row),
          getCompanyUserEmail(row),
          getCompanyUserPhone(row),
          getCompanyUserRole(row),
          getCompanyUserRoleLabel(getCompanyUserRole(row), t),
          getCompanyUserBranchName(row, branches),
        ]
          .join(" ")
          .toLowerCase();
        return !normalizedQuery || haystack.includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sortKey === "name") {
          return getCompanyUserName(a).localeCompare(getCompanyUserName(b), "en");
        }
        if (sortKey === "role") {
          return getCompanyUserRole(a).localeCompare(getCompanyUserRole(b), "en");
        }
        const dateA = new Date(getCompanyUserCreatedAt(a)).getTime() || 0;
        const dateB = new Date(getCompanyUserCreatedAt(b)).getTime() || 0;
        return sortKey === "oldest" ? dateA - dateB : dateB - dateA;
      });
  }, [branches, query, rows, sortKey, statusFilter, t]);
  const exportExcel = () => {
    const content = buildCompanyUsersExcel(filteredRows, branches, t);
    const blob = new Blob(["\ufeff", content], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `company-users-${formatEnglishDateTime(new Date()).replace(/[: ]/g, "-")}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(t.exported);
  };
  return (
    <PageShell
      title={t.title}
      description={t.description}
      icon={UsersRound}
      actions={
        <>
          <SecondaryButton onClick={() => void load()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            {t.refresh}
          </SecondaryButton>
          <SecondaryButton onClick={exportExcel} disabled={filteredRows.length === 0}>
            <FileText className="h-4 w-4" />
            {t.exportExcel}
          </SecondaryButton>
          <SecondaryButton onClick={() => window.print()}>
            <FileText className="h-4 w-4" />
            {t.print}
          </SecondaryButton>
        </>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t.totalUsers} value={userStats.total} hint={t.totalHint} icon={UsersRound} />
            <StatCard label={t.activeUsers} value={userStats.active} hint={t.activeHint} icon={CheckCircle2} />
            <StatCard label={t.inactiveUsers} value={userStats.inactive} hint={t.inactiveHint} icon={XCircle} />
            <StatCard label={t.adminUsers} value={userStats.admins} hint={t.adminHint} icon={ShieldCheck} />
          </section>
          <ProfileSectionCard title={t.filters} description={t.filtersDescription} icon={Search}>
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
              <SearchBox value={query} onChange={setQuery} placeholder={t.searchPlaceholder} />
              <SelectInput
                label={t.statusFilter}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as CompanyUserStatusFilter)}
                options={[
                  { value: "all", label: t.all },
                  { value: "active", label: t.active },
                  { value: "inactive", label: t.inactive },
                ]}
              />
              <SelectInput
                label={t.sortBy}
                value={sortKey}
                onChange={(value) => setSortKey(value as CompanyUserSortKey)}
                options={[
                  { value: "newest", label: t.newest },
                  { value: "oldest", label: t.oldest },
                  { value: "name", label: t.nameSort },
                  { value: "role", label: t.roleSort },
                ]}
              />
              <div className="flex items-end">
                <SecondaryButton onClick={resetFilters}>
                  <RefreshCcw className="h-4 w-4" />
                  {t.reset}
                </SecondaryButton>
              </div>
            </div>
          </ProfileSectionCard>
          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <ProfileSectionCard
              title={editingId ? t.editUser : t.addUser}
              description={t.formDescription}
              icon={editingId ? UserRoundCog : Plus}
            >
              <div className="grid gap-4">
                <TextInput label={t.fullName} value={form.full_name} onChange={(value) => setField("full_name", value)} />
                <TextInput label={t.email} value={form.email} onChange={(value) => setField("email", value)} type="email" required />
                <TextInput label={t.phone} value={form.phone} onChange={(value) => setField("phone", value)} />
                <SelectInput label={t.role} value={form.role} onChange={(value) => setField("role", value)} options={roleOptions} />
                <SelectInput
                  label={t.branch}
                  value={form.branch_id}
                  onChange={(value) => setField("branch_id", value)}
                  options={[
                    { value: "", label: t.noBranch },
                    ...branches.map((branch) => ({
                      value: getRowId(branch),
                      label: getText(branch, ["name", "branch_name", "title"], getRowId(branch)),
                    })),
                  ]}
                />
                <ToggleInput
                  label={t.activeUser}
                  description={t.activeUserDescription}
                  checked={form.is_active}
                  onChange={(value) => setField("is_active", value)}
                />
                <div className="flex flex-wrap gap-2">
                  <PrimaryButton onClick={() => void save()} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t.save}
                  </PrimaryButton>
                  {editingId ? <SecondaryButton onClick={resetForm}>{t.cancel}</SecondaryButton> : null}
                </div>
              </div>
            </ProfileSectionCard>
            <ProfileSectionCard
              title={t.usersList}
              description={`${t.usersListDescription} ? ${formatInteger(filteredRows.length)} / ${formatInteger(rows.length)}`}
              icon={UsersRound}
            >
              {filteredRows.length === 0 ? (
                <EmptyState
                  title={rows.length === 0 ? t.noUsers : t.noResults}
                  description={rows.length === 0 ? t.noUsersDescription : t.noResultsDescription}
                />
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-sm">
                      <thead className="border-b bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-start font-semibold">{t.user}</th>
                          <th className="px-4 py-3 text-start font-semibold">{t.contact}</th>
                          <th className="px-4 py-3 text-start font-semibold">{t.role}</th>
                          <th className="px-4 py-3 text-start font-semibold">{t.branch}</th>
                          <th className="px-4 py-3 text-start font-semibold">{t.status}</th>
                          <th className="px-4 py-3 text-start font-semibold">{t.createdAt}</th>
                          <th className="px-4 py-3 text-start font-semibold">{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredRows.map((row, index) => {
                          const active = getCompanyUserActive(row);
                          const role = getCompanyUserRole(row);
                          const branchName = getCompanyUserBranchName(row, branches);
                          return (
                            <tr key={getRowId(row) || index} className="bg-card transition hover:bg-muted/30">
                              <td className="px-4 py-4">
                                <p className="font-semibold text-foreground">{getCompanyUserName(row)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{getRowId(row) || "-"}</p>
                              </td>
                              <td className="px-4 py-4 text-muted-foreground">
                                <p>{getCompanyUserEmail(row)}</p>
                                <p className="mt-1 text-xs">{getCompanyUserPhone(row)}</p>
                              </td>
                              <td className="px-4 py-4">
                                <Badge variant="outline" className="rounded-full bg-background px-2.5 py-1 text-xs">
                                  {getCompanyUserRoleLabel(role, t)}
                                </Badge>
                              </td>
                              <td className="px-4 py-4 text-muted-foreground">{branchName || t.noBranch}</td>
                              <td className="px-4 py-4">
                                <StatusPill active={active} />
                              </td>
                              <td className="px-4 py-4 text-muted-foreground">
                                {formatCompanyUsersDate(getCompanyUserCreatedAt(row))}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <SecondaryButton onClick={() => edit(row)}>{t.edit}</SecondaryButton>
                                  <SecondaryButton onClick={() => void toggleActive(row, !active)}>
                                    {active ? t.deactivate : t.activate}
                                  </SecondaryButton>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </ProfileSectionCard>
          </section>
        </div>
      )}
    </PageShell>
  );
}

type CompanyPermissionFilter = "all" | "granted" | "missing";
type CompanyPermissionSortKey = "code" | "group" | "name";
type CompanyPermissionItem = {
  key: string;
  label: string;
  group: string;
  description: string;
  scope: string;
};
type CompanyPermissionRole = {
  key: string;
  label: string;
  permissions: string[];
};
const companyPermissionsEn = {
  title: "Company permissions",
  description: "Review and update company role permissions using the same permissions catalog pattern.",
  refresh: "Refresh",
  exportExcel: "Export Excel",
  print: "Print",
  savePermissions: "Save permissions",
  totalPermissions: "Total permissions",
  grantedPermissions: "Granted permissions",
  missingPermissions: "Missing permissions",
  rolesCount: "Roles",
  totalHint: "Available company permissions",
  grantedHint: "Enabled for selected role",
  missingHint: "Not enabled for selected role",
  rolesHint: "Company roles returned by API",
  rolesTitle: "Company roles",
  rolesDescription: "Select a role to review and update its permissions.",
  catalogTitle: "Permissions catalog",
  catalogDescription: "Search, filter, and update permissions for the selected role.",
  filtersTitle: "Search and filters",
  searchPlaceholder: "Search by permission code, name, group, or description...",
  statusFilter: "Status",
  sortBy: "Sort by",
  all: "All",
  granted: "Granted",
  missing: "Missing",
  code: "Code",
  group: "Group",
  name: "Name",
  reset: "Reset",
  permission: "Permission",
  descriptionLabel: "Description",
  status: "Status",
  enabled: "Enabled",
  disabled: "Disabled",
  noPermissions: "No permissions",
  noPermissionsDescription: "Company permissions will appear here when returned by the API.",
  noResults: "No results",
  noResultsDescription: "No permissions match the current search or filters.",
  noRoles: "No roles",
  noRolesDescription: "Company roles will appear here when returned by the API.",
  selectRole: "Select a role first",
  loadError: "Could not load company permissions",
  saveError: "Could not save role permissions",
  saved: "Role permissions saved",
  exported: "Company permissions exported",
};
const companyPermissionsAr: typeof companyPermissionsEn = {
  title: "\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629",
  description: "\u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u062a\u062d\u062f\u064a\u062b \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0623\u062f\u0648\u0627\u0631 \u0627\u0644\u0634\u0631\u0643\u0629 \u0628\u0646\u0641\u0633 \u0646\u0645\u0637 \u0643\u062a\u0627\u0644\u0648\u062c \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a.",
  refresh: "\u062a\u062d\u062f\u064a\u062b",
  exportExcel: "\u062a\u0635\u062f\u064a\u0631 Excel",
  print: "\u0637\u0628\u0627\u0639\u0629",
  savePermissions: "\u062d\u0641\u0638 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a",
  totalPermissions: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a",
  grantedPermissions: "\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0645\u0641\u0639\u0644\u0629",
  missingPermissions: "\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u063a\u064a\u0631 \u0645\u0641\u0639\u0644\u0629",
  rolesCount: "\u0627\u0644\u0623\u062f\u0648\u0627\u0631",
  totalHint: "\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0645\u062a\u0627\u062d\u0629",
  grantedHint: "\u0645\u0641\u0639\u0644\u0629 \u0644\u0644\u062f\u0648\u0631 \u0627\u0644\u0645\u062d\u062f\u062f",
  missingHint: "\u063a\u064a\u0631 \u0645\u0641\u0639\u0644\u0629 \u0644\u0644\u062f\u0648\u0631 \u0627\u0644\u0645\u062d\u062f\u062f",
  rolesHint: "\u0623\u062f\u0648\u0627\u0631 \u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0646 API",
  rolesTitle: "\u0623\u062f\u0648\u0627\u0631 \u0627\u0644\u0634\u0631\u0643\u0629",
  rolesDescription: "\u0627\u062e\u062a\u0631 \u062f\u0648\u0631\u0627\u064b \u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0635\u0644\u0627\u062d\u064a\u0627\u062a\u0647 \u0648\u062a\u062d\u062f\u064a\u062b\u0647\u0627.",
  catalogTitle: "\u0643\u062a\u0627\u0644\u0648\u062c \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a",
  catalogDescription: "\u0628\u062d\u062b \u0648\u062a\u0635\u0641\u064a\u0629 \u0648\u062a\u062d\u062f\u064a\u062b \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u062f\u0648\u0631 \u0627\u0644\u0645\u062d\u062f\u062f.",
  filtersTitle: "\u0627\u0644\u0628\u062d\u062b \u0648\u0627\u0644\u062a\u0635\u0641\u064a\u0629",
  searchPlaceholder: "\u0627\u0628\u062d\u062b \u0628\u0643\u0648\u062f \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629 \u0623\u0648 \u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629 \u0623\u0648 \u0627\u0644\u0648\u0635\u0641...",
  statusFilter: "\u0627\u0644\u062d\u0627\u0644\u0629",
  sortBy: "\u0627\u0644\u062a\u0631\u062a\u064a\u0628",
  all: "\u0627\u0644\u0643\u0644",
  granted: "\u0645\u0641\u0639\u0644\u0629",
  missing: "\u063a\u064a\u0631 \u0645\u0641\u0639\u0644\u0629",
  code: "\u0627\u0644\u0643\u0648\u062f",
  group: "\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629",
  name: "\u0627\u0644\u0627\u0633\u0645",
  reset: "\u0625\u0639\u0627\u062f\u0629 \u0636\u0628\u0637",
  permission: "\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629",
  descriptionLabel: "\u0627\u0644\u0648\u0635\u0641",
  status: "\u0627\u0644\u062d\u0627\u0644\u0629",
  enabled: "\u0645\u0641\u0639\u0644\u0629",
  disabled: "\u063a\u064a\u0631 \u0645\u0641\u0639\u0644\u0629",
  noPermissions: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0644\u0627\u062d\u064a\u0627\u062a",
  noPermissionsDescription: "\u0633\u062a\u0638\u0647\u0631 \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629 \u0647\u0646\u0627 \u0639\u0646\u062f \u062a\u0648\u0641\u0631\u0647\u0627 \u0645\u0646 API.",
  noResults: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c",
  noResultsDescription: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0628\u062d\u062b \u0623\u0648 \u0627\u0644\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.",
  noRoles: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u062f\u0648\u0627\u0631",
  noRolesDescription: "\u0633\u062a\u0638\u0647\u0631 \u0623\u062f\u0648\u0627\u0631 \u0627\u0644\u0634\u0631\u0643\u0629 \u0647\u0646\u0627 \u0639\u0646\u062f \u062a\u0648\u0641\u0631\u0647\u0627 \u0645\u0646 API.",
  selectRole: "\u0627\u062e\u062a\u0631 \u0627\u0644\u062f\u0648\u0631 \u0623\u0648\u0644\u0627\u064b",
  loadError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629",
  saveError: "\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u062f\u0648\u0631",
  saved: "\u062a\u0645 \u062d\u0641\u0638 \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u062f\u0648\u0631",
  exported: "\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629",
};
function normalizeCompanyPermissionKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "number") return String(item);
      const record = asRecord(item);
      return getText(record, ["key", "code", "codename", "permission", "id"]);
    })
    .filter(Boolean);
}
function normalizeCompanyPermissionItems(value: unknown): CompanyPermissionItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = asRecord(item);
      const key = getText(row, ["key", "code", "codename", "permission", "id"]);
      if (!key) return null;
      return {
        key,
        label: getText(row, ["label", "name_ar", "name", "display_name", "title"], key),
        group: getText(row, ["group", "category", "module", "section"], "general"),
        description: getText(row, ["description", "help_text", "summary"]),
        scope: getText(row, ["scope"], "company"),
      };
    })
    .filter((item): item is CompanyPermissionItem => Boolean(item));
}
function normalizeCompanyPermissionRoles(value: unknown): CompanyPermissionRole[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = asRecord(item);
      const key = getText(row, ["key", "code", "role", "name", "id"]);
      if (!key) return null;
      return {
        key,
        label: getText(row, ["label", "display_name", "name", "role"], key),
        permissions: normalizeCompanyPermissionKeys(
          row.permissions ?? row.permission_keys ?? row.allowed_permissions ?? row.granted_permissions,
        ),
      };
    })
    .filter((item): item is CompanyPermissionRole => Boolean(item));
}
function normalizeCompanyPermissionsPayload(payload: unknown): {
  permissions: CompanyPermissionItem[];
  roles: CompanyPermissionRole[];
} {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const source = Object.keys(data).length > 0 ? data : root;
  const permissionCandidates = [
    source.permissions,
    source.available_permissions,
    source.company_permissions,
    source.items,
    data.permissions,
    data.available_permissions,
    data.company_permissions,
  ];
  const roleCandidates = [
    source.roles,
    source.company_roles,
    source.role_permissions,
    source.rolePermissions,
    data.roles,
    data.company_roles,
    data.role_permissions,
  ];
  let permissions: CompanyPermissionItem[] = [];
  for (const candidate of permissionCandidates) {
    permissions = normalizeCompanyPermissionItems(candidate);
    if (permissions.length > 0) break;
  }
  if (permissions.length === 0) {
    permissions = normalizeCompanyPermissionItems(normalizeList(payload));
  }
  let roles: CompanyPermissionRole[] = [];
  for (const candidate of roleCandidates) {
    roles = normalizeCompanyPermissionRoles(candidate);
    if (roles.length > 0) break;
  }
  if (roles.length === 0) {
    const list = normalizeList(payload);
    const looksLikeRoles = list.some((row) => Array.isArray(row.permissions) || Array.isArray(row.permission_keys));
    if (looksLikeRoles) {
      roles = normalizeCompanyPermissionRoles(list);
    }
  }
  return { permissions, roles };
}

const companyPermissionRoleLabelsAr: Record<string, string> = {
  OWNER: "\u0645\u0627\u0644\u0643",
  ADMIN: "\u0645\u062f\u064a\u0631",
  MANAGER: "\u0645\u0634\u0631\u0641",
  ACCOUNTANT: "\u0645\u062d\u0627\u0633\u0628",
  CASHIER: "\u0643\u0627\u0634\u064a\u0631",
  SALES: "\u0645\u0628\u064a\u0639\u0627\u062a",
  INVENTORY: "\u0645\u062e\u0632\u0648\u0646",
  HR: "\u0645\u0648\u0627\u0631\u062f \u0628\u0634\u0631\u064a\u0629",
  EMPLOYEE: "\u0645\u0648\u0638\u0641",
  VIEWER: "\u0645\u0634\u0627\u0647\u062f",
};
const companyPermissionGroupLabelsAr: Record<string, string> = {
  general: "\u0639\u0627\u0645",
  accounting: "\u0627\u0644\u0645\u062d\u0627\u0633\u0628\u0629",
  branches: "\u0627\u0644\u0641\u0631\u0648\u0639",
  customers: "\u0627\u0644\u0639\u0645\u0644\u0627\u0621",
  sales: "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a",
  purchases: "\u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a",
  inventory: "\u0627\u0644\u0645\u062e\u0632\u0648\u0646",
  products: "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
  payments: "\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a",
  hr: "\u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629",
  documents: "\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a",
  whatsapp: "\u0648\u0627\u062a\u0633\u0627\u0628",
  settings: "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629",
};
const companyPermissionEntityLabelsAr: Record<string, string> = {
  accounting: "\u0627\u0644\u0645\u062d\u0627\u0633\u0628\u0629",
  "accounting.accounts": "\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a",
  "accounting.journals": "\u0627\u0644\u0642\u064a\u0648\u062f \u0627\u0644\u0645\u062d\u0627\u0633\u0628\u064a\u0629",
  "accounting.reports": "\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0645\u062d\u0627\u0633\u0628\u064a\u0629",
  activity_profiles: "\u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u0634\u0631\u0643\u0629",
  branches: "\u0627\u0644\u0641\u0631\u0648\u0639",
  categories: "\u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a",
  customers: "\u0627\u0644\u0639\u0645\u0644\u0627\u0621",
  dashboard: "\u0644\u0648\u062d\u0629 \u0627\u0644\u0634\u0631\u0643\u0629",
  documents: "\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a",
  "documents.templates": "\u0642\u0648\u0627\u0644\u0628 \u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a",
  hr: "\u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629",
  "hr.attendance": "\u0627\u0644\u062d\u0636\u0648\u0631 \u0648\u0627\u0644\u0627\u0646\u0635\u0631\u0627\u0641",
  "hr.employees": "\u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646",
  "hr.leave_balances": "\u0623\u0631\u0635\u062f\u0629 \u0627\u0644\u0625\u062c\u0627\u0632\u0627\u062a",
  "hr.leave_requests": "\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0625\u062c\u0627\u0632\u0629",
  inventory: "\u0627\u0644\u0645\u062e\u0632\u0648\u0646",
  payments: "\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a",
  "payments.terminals": "\u0623\u062c\u0647\u0632\u0629 \u0627\u0644\u062f\u0641\u0639",
  products: "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
  purchases: "\u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a",
  "purchases.bills": "\u0641\u0648\u0627\u062a\u064a\u0631 \u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a",
  "purchases.debit_notes": "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u062f\u064a\u0646\u0629",
  sales: "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a",
  "sales.invoices": "\u0641\u0648\u0627\u062a\u064a\u0631 \u0627\u0644\u0628\u064a\u0639",
  "sales.quotations": "\u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631",
  "sales.orders": "\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0628\u064a\u0639",
  "sales.returns": "\u0645\u0631\u062a\u062c\u0639\u0627\u062a \u0627\u0644\u0628\u064a\u0639",
  "sales.credit_notes": "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u062f\u0627\u0626\u0646\u0629",
  pos: "\u0646\u0642\u0627\u0637 \u0627\u0644\u0628\u064a\u0639",
  reports: "\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631",
  settings: "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629",
  users: "\u0645\u0633\u062a\u062e\u062f\u0645\u064a \u0627\u0644\u0634\u0631\u0643\u0629",
  permissions: "\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a",
  tax: "\u0627\u0644\u0636\u0631\u064a\u0628\u0629",
  whatsapp: "\u0648\u0627\u062a\u0633\u0627\u0628",
};
const companyPermissionActionLabelsAr: Record<string, string> = {
  create: "\u0625\u0646\u0634\u0627\u0621",
  update: "\u062a\u0639\u062f\u064a\u0644",
  view: "\u0639\u0631\u0636",
  delete: "\u062d\u0630\u0641",
  cancel: "\u0625\u0644\u063a\u0627\u0621",
  post: "\u062a\u0631\u062d\u064a\u0644",
  approve: "\u0627\u0639\u062a\u0645\u0627\u062f",
  reject: "\u0631\u0641\u0636",
  reverse: "\u0639\u0643\u0633",
  activate: "\u062a\u0641\u0639\u064a\u0644",
  deactivate: "\u062a\u0639\u0637\u064a\u0644",
  status: "\u0645\u062a\u0627\u0628\u0639\u0629",
  check_in: "\u062a\u0633\u062c\u064a\u0644 \u062d\u0636\u0648\u0631",
  check_out: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0646\u0635\u0631\u0627\u0641",
  submit: "\u0625\u0631\u0633\u0627\u0644",
  send: "\u0625\u0631\u0633\u0627\u0644",
  print: "\u0637\u0628\u0627\u0639\u0629",
  export: "\u062a\u0635\u062f\u064a\u0631",
  manage: "\u0625\u062f\u0627\u0631\u0629",
  confirm: "\u062a\u0623\u0643\u064a\u062f",
  complete: "\u0625\u0643\u0645\u0627\u0644",
};
function hasArabicText(value: string): boolean {
  return /[\u0600-\u06ff]/.test(value);
}
function getCompanyPermissionRoleDisplayLabel(role: CompanyPermissionRole, rtl: boolean): string {
  if (!rtl) return role.label || role.key;
  return companyPermissionRoleLabelsAr[role.key.toUpperCase()] || role.label || role.key;
}
function getCompanyPermissionGroupDisplayLabel(group: string, rtl: boolean): string {
  if (!rtl) return group || "general";
  const normalized = (group || "general").toLowerCase();
  return companyPermissionGroupLabelsAr[normalized] || "\u0639\u0627\u0645";
}
function getCompanyPermissionEntityKey(permissionKey: string): string {
  const parts = permissionKey.replace(/^company\./, "").split(".");
  const action = parts[parts.length - 1];
  if (companyPermissionActionLabelsAr[action]) {
    parts.pop();
  }
  return parts.join(".");
}
function getCompanyPermissionActionKey(permissionKey: string): string {
  const parts = permissionKey.split(".");
  return parts[parts.length - 1] || "view";
}
function getCompanyPermissionEntityLabelAr(permissionKey: string): string {
  const entityKey = getCompanyPermissionEntityKey(permissionKey);
  if (companyPermissionEntityLabelsAr[entityKey]) {
    return companyPermissionEntityLabelsAr[entityKey];
  }
  const parts = entityKey.split(".");
  while (parts.length > 0) {
    const candidate = parts.join(".");
    if (companyPermissionEntityLabelsAr[candidate]) {
      return companyPermissionEntityLabelsAr[candidate];
    }
    parts.shift();
  }
  return "\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0629";
}
function getCompanyPermissionDisplayLabel(permission: CompanyPermissionItem, rtl: boolean): string {
  if (!rtl) return permission.label || permission.key;
  if (permission.label && hasArabicText(permission.label) && !permission.label.includes("company.")) {
    return permission.label;
  }
  const actionKey = getCompanyPermissionActionKey(permission.key);
  const actionLabel = companyPermissionActionLabelsAr[actionKey] || "\u0625\u062f\u0627\u0631\u0629";
  const entityLabel = getCompanyPermissionEntityLabelAr(permission.key);
  return `${actionLabel} ${entityLabel}`;
}
function getCompanyPermissionDescriptionDisplay(permission: CompanyPermissionItem, rtl: boolean): string {
  if (!rtl) return permission.description;
  if (permission.description && hasArabicText(permission.description)) {
    return permission.description;
  }
  return `\u064a\u0633\u0645\u062d \u0628\u0640 ${getCompanyPermissionDisplayLabel(permission, true)} \u062f\u0627\u062e\u0644 \u0627\u0644\u0634\u0631\u0643\u0629.`;
}
function expandCompanyRolePermissionKeys(
  rolePermissions: string[],
  availablePermissions: CompanyPermissionItem[],
): string[] {
  const hasWildcard = rolePermissions.some((key) => ["*", "all", "__all__", "ALL"].includes(String(key).toLowerCase()));
  return hasWildcard ? availablePermissions.map((permission) => permission.key) : rolePermissions;
}
function buildCompanyPermissionsExcel(
  rows: CompanyPermissionItem[],
  selectedPermissions: string[],
  t: typeof companyPermissionsEn,
  rtl = false,
): string {
  const headers = [t.code, t.group, t.name, t.descriptionLabel, t.status];
  const body = rows.map((permission) => [
    permission.key,
    getCompanyPermissionGroupDisplayLabel(permission.group, rtl),
    getCompanyPermissionDisplayLabel(permission, rtl),
    getCompanyPermissionDescriptionDisplay(permission, rtl),
    selectedPermissions.includes(permission.key) ? t.enabled : t.disabled,
  ]);
  return [headers, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join("\t"))
    .join("\n");
}
export function CompanyPermissionsPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const t = rtl ? companyPermissionsAr : companyPermissionsEn;
  const [permissions, setPermissions] = useState<CompanyPermissionItem[]>([]);
  const [roles, setRoles] = useState<CompanyPermissionRole[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [permissionFilter, setPermissionFilter] = useState<CompanyPermissionFilter>("all");
  const [sortKey, setSortKey] = useState<CompanyPermissionSortKey>("code");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const groups = useMemo(() => {
    return Array.from(new Set(permissions.map((permission) => permission.group))).filter(Boolean).sort();
  }, [permissions]);
  const selectedRoleRecord = useMemo(() => {
    return roles.find((role) => role.key === selectedRole);
  }, [roles, selectedRole]);
  const permissionStats = useMemo(() => {
    const granted = permissions.filter((permission) => selectedPermissions.includes(permission.key)).length;
    return {
      total: permissions.length,
      granted,
      missing: Math.max(permissions.length - granted, 0),
      roles: roles.length,
    };
  }, [permissions, roles.length, selectedPermissions]);
  const filteredPermissions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return permissions
      .filter((permission) => {
        const granted = selectedPermissions.includes(permission.key);
        if (permissionFilter === "granted" && !granted) return false;
        if (permissionFilter === "missing" && granted) return false;
        const haystack = [
          permission.key,
          permission.label,
          getCompanyPermissionDisplayLabel(permission, rtl),
          permission.group,
          getCompanyPermissionGroupDisplayLabel(permission.group, rtl),
          permission.description,
          permission.scope,
        ]
          .join(" ")
          .toLowerCase();
        return !normalizedQuery || haystack.includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sortKey === "group") return a.group.localeCompare(b.group, "en");
        if (sortKey === "name") return a.label.localeCompare(b.label, "en");
        return a.key.localeCompare(b.key, "en");
      });
  }, [permissionFilter, permissions, query, rtl, selectedPermissions, sortKey]);
  const groupedPermissions = useMemo(() => {
    return filteredPermissions.reduce<Record<string, CompanyPermissionItem[]>>((acc, permission) => {
      acc[permission.group] = [...(acc[permission.group] ?? []), permission];
      return acc;
    }, {});
  }, [filteredPermissions]);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiRequest<unknown>("/api/company/permissions/");
      const normalized = normalizeCompanyPermissionsPayload(payload);
      setPermissions(normalized.permissions);
      setRoles(normalized.roles);
      const currentSelectedRole = normalized.roles.find((role) => role.key === selectedRole) ?? normalized.roles[0];
      if (currentSelectedRole) {
        setSelectedRole(currentSelectedRole.key);
        setSelectedPermissions(expandCompanyRolePermissionKeys(currentSelectedRole.permissions, normalized.permissions));
      } else {
        setSelectedRole("");
        setSelectedPermissions([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [selectedRole, t.loadError]);
  useEffect(() => {
    void load();
  }, [load]);
  const changeRole = (roleKey: string) => {
    const role = roles.find((item) => item.key === roleKey);
    setSelectedRole(roleKey);
    setSelectedPermissions(expandCompanyRolePermissionKeys(role?.permissions ?? [], permissions));
  };
  const resetFilters = () => {
    setQuery("");
    setPermissionFilter("all");
    setSortKey("code");
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
      toast.error(t.selectRole);
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
      toast.success(t.saved);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.saveError);
    } finally {
      setSaving(false);
    }
  };
  const exportExcel = () => {
    const content = buildCompanyPermissionsExcel(filteredPermissions, selectedPermissions, t, rtl);
    const blob = new Blob(["\ufeff", content], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `company-permissions-${formatEnglishDateTime(new Date()).replace(/[: ]/g, "-")}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(t.exported);
  };
  const rolePermissionCount = (role: CompanyPermissionRole) => {
    return expandCompanyRolePermissionKeys(role.permissions, permissions).length;
  };
  return (
    <PageShell
      title={t.title}
      description={t.description}
      icon={LockKeyhole}
      actions={
        <>
          <SecondaryButton onClick={() => void load()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            {t.refresh}
          </SecondaryButton>
          <SecondaryButton onClick={exportExcel} disabled={filteredPermissions.length === 0}>
            <FileText className="h-4 w-4" />
            {t.exportExcel}
          </SecondaryButton>
          <SecondaryButton onClick={() => window.print()}>
            <FileText className="h-4 w-4" />
            {t.print}
          </SecondaryButton>
          <PrimaryButton onClick={() => void save()} disabled={saving || loading || !selectedRole}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {t.savePermissions}
          </PrimaryButton>
        </>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t.totalPermissions} value={permissionStats.total} hint={t.totalHint} icon={ShieldCheck} />
            <StatCard label={t.grantedPermissions} value={permissionStats.granted} hint={t.grantedHint} icon={CheckCircle2} />
            <StatCard label={t.missingPermissions} value={permissionStats.missing} hint={t.missingHint} icon={XCircle} />
            <StatCard label={t.rolesCount} value={permissionStats.roles} hint={t.rolesHint} icon={UsersRound} />
          </section>
          <ProfileSectionCard title={t.rolesTitle} description={t.rolesDescription} icon={ShieldCheck}>
            {roles.length === 0 ? (
              <EmptyState title={t.noRoles} description={t.noRolesDescription} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {roles.map((role) => {
                  const active = role.key === selectedRole;
                  const count = rolePermissionCount(role);
                  return (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => changeRole(role.key)}
                      className={`rounded-2xl border p-4 text-start transition ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-card text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{getCompanyPermissionRoleDisplayLabel(role, rtl)}</p>
                          <p className={`mt-1 text-xs ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                            {`${formatInteger(count)} / ${formatInteger(permissions.length)}`}
                          </p>
                        </div>
                        <Badge variant="outline" className={active ? "border-white/30 text-primary-foreground" : "bg-background"}>
                          {rtl ? getCompanyPermissionRoleDisplayLabel(role, rtl) : role.key}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ProfileSectionCard>
          <ProfileSectionCard title={t.filtersTitle} description={selectedRoleRecord ? getCompanyPermissionRoleDisplayLabel(selectedRoleRecord, rtl) : t.catalogDescription} icon={Search}>
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
              <SearchBox value={query} onChange={setQuery} placeholder={t.searchPlaceholder} />
              <SelectInput
                label={t.statusFilter}
                value={permissionFilter}
                onChange={(value) => setPermissionFilter(value as CompanyPermissionFilter)}
                options={[
                  { value: "all", label: t.all },
                  { value: "granted", label: t.granted },
                  { value: "missing", label: t.missing },
                ]}
              />
              <SelectInput
                label={t.sortBy}
                value={sortKey}
                onChange={(value) => setSortKey(value as CompanyPermissionSortKey)}
                options={[
                  { value: "code", label: t.code },
                  { value: "group", label: t.group },
                  { value: "name", label: t.name },
                ]}
              />
              <div className="flex items-end">
                <SecondaryButton onClick={resetFilters}>
                  <RefreshCcw className="h-4 w-4" />
                  {t.reset}
                </SecondaryButton>
              </div>
            </div>
          </ProfileSectionCard>
          <ProfileSectionCard
            title={t.catalogTitle}
            description={`${t.catalogDescription} ? ${formatInteger(filteredPermissions.length)} / ${formatInteger(permissions.length)} ? ${formatInteger(groups.length)} ${t.group}`}
            icon={LockKeyhole}
          >
            {permissions.length === 0 ? (
              <EmptyState title={t.noPermissions} description={t.noPermissionsDescription} />
            ) : filteredPermissions.length === 0 ? (
              <EmptyState title={t.noResults} description={t.noResultsDescription} />
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([group, items]) => (
                  <div key={group} className="overflow-hidden rounded-2xl border bg-card">
                    <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{getCompanyPermissionGroupDisplayLabel(group, rtl)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatInteger(items.length)} {t.permission}</p>
                      </div>
                      <Badge variant="outline" className="rounded-full bg-background">
                        {formatInteger(items.filter((item) => selectedPermissions.includes(item.key)).length)} / {formatInteger(items.length)}
                      </Badge>
                    </div>
                    <div className="divide-y">
                      {items.map((permission) => {
                        const granted = selectedPermissions.includes(permission.key);
                        return (
                          <label key={permission.key} className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-muted/30">
                            <input
                              type="checkbox"
                              checked={granted}
                              onChange={() => togglePermission(permission.key)}
                              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-foreground">{getCompanyPermissionDisplayLabel(permission, rtl)}</span>
                                <Badge
                                  variant="outline"
                                  className="rounded-full bg-background px-2 py-0.5 text-[11px]"
                                  title={permission.key}
                                >
                                  {rtl ? getCompanyPermissionGroupDisplayLabel(permission.group, rtl) : permission.key}
                                </Badge>
                              </span>
                              {permission.description ? (
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{permission.description}</span>
                              ) : null}
                            </span>
                            <StatusPill active={granted} />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ProfileSectionCard>
        </div>
      )}
    </PageShell>
  );
}



function SettingsPageShell({
  title,
  description,
  icon: Icon,
  actions,
  children,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Icon className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
function SettingsLoading() {
  return (
    <div className="rounded-3xl border bg-card p-8 text-sm font-medium text-muted-foreground shadow-sm">
      ...
    </div>
  );
}
function ReadinessRow({
  label,
  ready,
  readyLabel,
  pendingLabel,
}: {
  label: string;
  ready: boolean;
  readyLabel: string;
  pendingLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-background p-4 text-sm">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <Badge variant="outline" className="rounded-full bg-muted px-2.5 py-1 text-xs">
        {ready ? readyLabel : pendingLabel}
      </Badge>
    </div>
  );
}
type TaxSettingsForm = {
  is_vat_registered: boolean;
  tax_number: string;
  prices_include_tax: boolean;
  invoice_tax_label: string;
  tax_address: string;
};
type TaxRateRow = {
  id: string;
  code: string;
  name: string;
  name_en: string;
  tax_type: string;
  tax_type_display: string;
  direction: string;
  direction_display: string;
  rate: string;
  calculation_base: string;
  calculation_base_display: string;
  zatca_category_code: string;
  zatca_exemption_reason_code: string;
  zatca_exemption_reason: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  is_system: boolean;
};
type TaxRateForm = {
  code: string;
  name: string;
  name_en: string;
  tax_type: string;
  direction: string;
  rate: string;
  calculation_base: string;
  zatca_category_code: string;
  zatca_exemption_reason_code: string;
  zatca_exemption_reason: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  is_system: boolean;
};
const emptyTaxSettings: TaxSettingsForm = {
  is_vat_registered: true,
  tax_number: "",
  prices_include_tax: false,
  invoice_tax_label: "VAT",
  tax_address: "",
};
const emptyTaxRateForm: TaxRateForm = {
  code: "",
  name: "",
  name_en: "",
  tax_type: "VAT",
  direction: "OUTPUT",
  rate: "15.0000",
  calculation_base: "NET",
  zatca_category_code: "S",
  zatca_exemption_reason_code: "",
  zatca_exemption_reason: "",
  description: "",
  is_active: true,
  is_default: false,
  is_system: false,
};
const taxTypeOptions = [
  { value: "VAT", labelAr: "ضريبة القيمة المضافة", labelEn: "VAT" },
  { value: "EXCISE", labelAr: "ضريبة انتقائية", labelEn: "Excise" },
  { value: "WITHHOLDING", labelAr: "ضريبة استقطاع", labelEn: "Withholding" },
  { value: "ZAKAT", labelAr: "زكاة", labelEn: "Zakat" },
  { value: "CUSTOM", labelAr: "ضريبة مخصصة", labelEn: "Custom" },
  { value: "OTHER", labelAr: "أخرى", labelEn: "Other" },
];
const taxDirectionOptions = [
  { value: "OUTPUT", labelAr: "ضريبة مبيعات", labelEn: "Sales tax" },
  { value: "INPUT", labelAr: "ضريبة مشتريات", labelEn: "Purchase tax" },
  { value: "SETTLEMENT", labelAr: "تسوية ضريبية", labelEn: "Settlement" },
];
const taxCalculationBaseOptions = [
  { value: "NET", labelAr: "صافي السطر", labelEn: "Net line" },
  { value: "GROSS", labelAr: "السعر شامل الضريبة", labelEn: "Gross price" },
  { value: "AFTER_PREVIOUS_TAX", labelAr: "بعد الضرائب السابقة", labelEn: "After previous tax" },
  { value: "RETAIL_PRICE", labelAr: "سعر البيع", labelEn: "Retail price" },
];
const zatcaCategoryOptions = [
  { value: "", labelAr: "بدون", labelEn: "None" },
  { value: "S", labelAr: "قياسي", labelEn: "Standard" },
  { value: "Z", labelAr: "صفرية", labelEn: "Zero rated" },
  { value: "E", labelAr: "معفى", labelEn: "Exempt" },
  { value: "O", labelAr: "خارج النطاق", labelEn: "Out of scope" },
];

const taxRatePercentOptions = [
  { value: "0.0000", labelAr: "0% - صفرية / معفاة", labelEn: "0% - Zero / exempt" },
  { value: "5.0000", labelAr: "5%", labelEn: "5%" },
  { value: "15.0000", labelAr: "15% - VAT القياسية", labelEn: "15% - Standard VAT" },
  { value: "50.0000", labelAr: "50% - ضريبة انتقائية", labelEn: "50% - Excise" },
  { value: "100.0000", labelAr: "100% - ضريبة انتقائية", labelEn: "100% - Excise" },
];
const autoTaxNameByType: Record<string, { ar: string; en: string }> = {
  VAT: { ar: "ضريبة القيمة المضافة", en: "VAT" },
  EXCISE: { ar: "ضريبة انتقائية", en: "Excise tax" },
  WITHHOLDING: { ar: "ضريبة استقطاع", en: "Withholding tax" },
  ZAKAT: { ar: "زكاة", en: "Zakat" },
  CUSTOM: { ar: "ضريبة مخصصة", en: "Custom tax" },
  OTHER: { ar: "ضريبة أخرى", en: "Other tax" },
};
const taxSettingsEn = {
  title: "Tax settings",
  description: "Manage tax registration, VAT/excise/custom tax codes, and future ZATCA mapping for the current company.",
  refresh: "Refresh",
  saveRegistration: "Save registration",
  seedCatalog: "Seed tax catalog",
  saveTaxRate: "Save tax code",
  updateTaxRate: "Update tax code",
  cancelEdit: "Cancel edit",
  edit: "Edit",
  activate: "Activate",
  deactivate: "Deactivate",
  active: "Active",
  inactive: "Inactive",
  system: "System",
  custom: "Custom",
  registered: "Registered",
  notRegistered: "Not registered",
  complete: "Complete",
  incomplete: "Incomplete",
  included: "Tax included",
  excluded: "Tax excluded",
  status: "VAT status",
  taxNumberStatus: "Tax number",
  defaultVat: "Default VAT",
  activeCodes: "Active codes",
  taxCodes: "Tax codes",
  priceMode: "Price mode",
  statusHint: "Shown on invoices and documents",
  taxNumberHint: "Read from company profile",
  defaultVatHint: "Default VAT code in the catalog",
  activeCodesHint: "Enabled tax codes",
  priceModeHint: "How entered prices are interpreted",
  registrationTitle: "Tax registration",
  registrationDescription: "Core registration fields used by invoices, documents, reports, and ZATCA readiness.",
  registeredLabel: "Company is VAT registered",
  registeredDescription: "Enable VAT registration on invoices and official documents.",
  pricesIncludeTax: "Prices include tax",
  pricesIncludeTaxDescription: "Treat entered prices as tax-inclusive amounts.",
  taxNumber: "Tax number",
  taxLabel: "Invoice tax label",
  taxAddress: "Tax address",
  taxAddressDescription: "Official tax address shown on invoices and printed documents.",
  catalogTitle: "Tax code catalog",
  catalogDescription: "VAT, zero-rated, exempt, out-of-scope, excise, and custom taxes used by future document lines.",
  formTitleCreate: "Create tax code",
  formTitleEdit: "Edit tax code",
  formDescription: "Create company-scoped tax codes. Do not use 100% as VAT; use excise or custom tax types.",
  code: "Code",
  name: "Arabic name",
  nameEn: "English name",
  taxType: "Tax type",
  direction: "Direction",
  rate: "Rate",
  calculationBase: "Calculation base",
  zatcaCategory: "ZATCA category",
  exemptionCode: "Exemption reason code",
  exemptionReason: "Exemption reason",
  descriptionLabel: "Description",
  isDefault: "Default",
  isSystem: "System code",
  filtersTitle: "Filters",
  searchPlaceholder: "Search tax codes...",
  typeFilter: "Tax type",
  statusFilter: "Status",
  all: "All",
  listTitle: "Tax codes list",
  noTaxCodes: "No tax codes yet",
  noTaxCodesDescription: "Seed the Saudi tax catalog or create your own company tax code.",
  summaryTitle: "Tax summary",
  summaryDescription: "Live preview of the current default VAT configuration.",
  taxableAmount: "Taxable amount",
  netAmount: "Net amount",
  taxAmount: "Tax amount",
  totalAmount: "Total amount",
  documentTitle: "Document readiness",
  documentDescription: "Checks whether tax information is ready for official documents.",
  registrationReady: "VAT registration",
  taxNumberReady: "Tax number",
  labelReady: "Invoice label",
  addressReady: "Tax address",
  ready: "Ready",
  pending: "Pending",
  taxNumberRequired: "Tax number is required when VAT registration is enabled",
  taxLabelRequired: "Invoice tax label is required",
  codeRequired: "Tax code is required",
  nameRequired: "Tax name is required",
  invalidRate: "Tax rate must be a valid number between 0 and 100",
  loadError: "Could not load tax settings",
  saveError: "Could not save tax settings",
  saved: "Tax registration saved",
  taxRateCreated: "Tax code created",
  taxRateUpdated: "Tax code updated",
  seeded: "Tax catalog seeded",
  activated: "Tax code activated",
  deactivated: "Tax code deactivated",
};
const taxSettingsAr: typeof taxSettingsEn = {
  title: "إعدادات الضريبة",
  description: "إدارة التسجيل الضريبي وأكواد VAT والضريبة الانتقائية والضرائب المخصصة وربط ZATCA مستقبلاً للشركة الحالية.",
  refresh: "تحديث",
  saveRegistration: "حفظ التسجيل",
  seedCatalog: "تهيئة كتالوج الضرائب",
  saveTaxRate: "حفظ كود الضريبة",
  updateTaxRate: "تحديث كود الضريبة",
  cancelEdit: "إلغاء التعديل",
  edit: "تعديل",
  activate: "تفعيل",
  deactivate: "تعطيل",
  active: "نشط",
  inactive: "معطل",
  system: "نظامي",
  custom: "مخصص",
  registered: "مسجلة",
  notRegistered: "غير مسجلة",
  complete: "مكتمل",
  incomplete: "ناقص",
  included: "شاملة الضريبة",
  excluded: "غير شاملة",
  status: "حالة VAT",
  taxNumberStatus: "الرقم الضريبي",
  defaultVat: "VAT الافتراضية",
  activeCodes: "الأكواد النشطة",
  taxCodes: "أكواد الضريبة",
  priceMode: "نمط الأسعار",
  statusHint: "تظهر في الفواتير والمستندات",
  taxNumberHint: "يقرأ من ملف الشركة",
  defaultVatHint: "كود VAT الافتراضي في الكتالوج",
  activeCodesHint: "أكواد الضرائب المفعلة",
  priceModeHint: "طريقة تفسير الأسعار المدخلة",
  registrationTitle: "التسجيل الضريبي",
  registrationDescription: "حقول التسجيل الأساسية المستخدمة في الفواتير والمستندات والتقارير وجاهزية ZATCA.",
  registeredLabel: "الشركة مسجلة في VAT",
  registeredDescription: "تفعيل التسجيل الضريبي على الفواتير والمستندات الرسمية.",
  pricesIncludeTax: "الأسعار تشمل الضريبة",
  pricesIncludeTaxDescription: "اعتبار السعر المدخل شاملاً للضريبة.",
  taxNumber: "الرقم الضريبي",
  taxLabel: "مسمى الضريبة في الفاتورة",
  taxAddress: "العنوان الضريبي",
  taxAddressDescription: "العنوان الرسمي الذي يظهر في الفواتير والمستندات المطبوعة.",
  catalogTitle: "كتالوج أكواد الضريبة",
  catalogDescription: "أكواد VAT والصفرية والمعفاة وخارج النطاق والانتقائية والمخصصة المستخدمة لاحقًا في سطور المستندات.",
  formTitleCreate: "إنشاء كود ضريبي",
  formTitleEdit: "تعديل كود ضريبي",
  formDescription: "أنشئ أكواد ضريبية خاصة بالشركة. لا تستخدم 100% كـ VAT؛ استخدم ضريبة انتقائية أو مخصصة.",
  code: "الكود",
  name: "الاسم العربي",
  nameEn: "الاسم الإنجليزي",
  taxType: "نوع الضريبة",
  direction: "الاتجاه",
  rate: "النسبة",
  calculationBase: "أساس الاحتساب",
  zatcaCategory: "تصنيف ZATCA",
  exemptionCode: "كود سبب الإعفاء",
  exemptionReason: "سبب الإعفاء",
  descriptionLabel: "الوصف",
  isDefault: "افتراضي",
  isSystem: "كود نظامي",
  filtersTitle: "الفلاتر",
  searchPlaceholder: "ابحث في أكواد الضرائب...",
  typeFilter: "نوع الضريبة",
  statusFilter: "الحالة",
  all: "الكل",
  listTitle: "قائمة أكواد الضريبة",
  noTaxCodes: "لا توجد أكواد ضريبية بعد",
  noTaxCodesDescription: "قم بتهيئة كتالوج الضرائب السعودي أو أنشئ كود ضريبة خاص بالشركة.",
  summaryTitle: "ملخص الضريبة",
  summaryDescription: "معاينة مباشرة لإعداد VAT الافتراضي الحالي.",
  taxableAmount: "المبلغ الخاضع",
  netAmount: "صافي المبلغ",
  taxAmount: "مبلغ الضريبة",
  totalAmount: "الإجمالي",
  documentTitle: "جاهزية المستندات",
  documentDescription: "فحص جاهزية البيانات الضريبية للمستندات الرسمية.",
  registrationReady: "تسجيل VAT",
  taxNumberReady: "الرقم الضريبي",
  labelReady: "مسمى الفاتورة",
  addressReady: "العنوان الضريبي",
  ready: "جاهز",
  pending: "ناقص",
  taxNumberRequired: "الرقم الضريبي مطلوب عند تفعيل VAT",
  taxLabelRequired: "مسمى الضريبة مطلوب",
  codeRequired: "كود الضريبة مطلوب",
  nameRequired: "اسم الضريبة مطلوب",
  invalidRate: "نسبة الضريبة يجب أن تكون رقمًا بين 0 و 100",
  loadError: "تعذر تحميل إعدادات الضريبة",
  saveError: "تعذر حفظ إعدادات الضريبة",
  saved: "تم حفظ التسجيل الضريبي",
  taxRateCreated: "تم إنشاء كود الضريبة",
  taxRateUpdated: "تم تحديث كود الضريبة",
  seeded: "تم تهيئة كتالوج الضرائب",
  activated: "تم تفعيل كود الضريبة",
  deactivated: "تم تعطيل كود الضريبة",
};
function formatTaxRate(value: string): string {
  const parsed = Number(String(value || "0").replace(",", "."));
  if (!Number.isFinite(parsed)) return "0.0000";
  return parsed.toFixed(4);
}
function formatTaxRateShort(value: string): string {
  const parsed = Number(String(value || "0").replace(",", "."));
  if (!Number.isFinite(parsed)) return "0.00";
  return parsed.toFixed(2);
}
function formatTaxMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
function getTaxPreview(rateValue: string, isVatRegistered: boolean, pricesIncludeTax: boolean) {
  const rate = Math.max(Number(formatTaxRate(rateValue)), 0) / 100;
  const sample = 1000;
  if (!isVatRegistered || rate === 0) {
    return { taxableAmount: sample, netAmount: sample, taxAmount: 0, totalAmount: sample };
  }
  if (pricesIncludeTax) {
    const netAmount = sample / (1 + rate);
    return { taxableAmount: sample, netAmount, taxAmount: sample - netAmount, totalAmount: sample };
  }
  const taxAmount = sample * rate;
  return { taxableAmount: sample, netAmount: sample, taxAmount, totalAmount: sample + taxAmount };
}
function buildTaxAddressFromProfile(profileRecords: ApiRecord[]): string {
  const addressRecords = getNationalAddressRecords(profileRecords);
  const city = getFirstText(addressRecords, ["city", "city_name"]);
  const district = getFirstText(addressRecords, ["district", "neighborhood", "area"]);
  const street = getFirstText(addressRecords, ["street", "street_name"]);
  const building = getFirstText(addressRecords, ["building_number", "building_no"]);
  return [city, district, street, building]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" - ");
}
function getTaxSettingsRecords(payload: unknown): ApiRecord[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  return [
    asRecord(root.tax_settings),
    asRecord(root.taxSettings),
    asRecord(root.settings),
    asRecord(data.tax_settings),
    asRecord(data.taxSettings),
    asRecord(data.settings),
    data,
    root,
  ].filter((record) => Object.keys(record).length > 0);
}
function normalizeTaxRateRow(row: ApiRecord): TaxRateRow {
  return {
    id: getFirstText([row], ["id", "pk"]),
    code: getFirstText([row], ["code"]),
    name: getFirstText([row], ["name"]),
    name_en: getFirstText([row], ["name_en", "nameEn"]),
    tax_type: getFirstText([row], ["tax_type", "taxType"], "VAT"),
    tax_type_display: getFirstText([row], ["tax_type_display", "taxTypeDisplay"]),
    direction: getFirstText([row], ["direction"], "OUTPUT"),
    direction_display: getFirstText([row], ["direction_display", "directionDisplay"]),
    rate: formatTaxRate(getFirstText([row], ["rate"], "0")),
    calculation_base: getFirstText([row], ["calculation_base", "calculationBase"], "NET"),
    calculation_base_display: getFirstText([row], ["calculation_base_display", "calculationBaseDisplay"]),
    zatca_category_code: getFirstText([row], ["zatca_category_code", "zatcaCategoryCode"]),
    zatca_exemption_reason_code: getFirstText([row], ["zatca_exemption_reason_code", "zatcaExemptionReasonCode"]),
    zatca_exemption_reason: getFirstText([row], ["zatca_exemption_reason", "zatcaExemptionReason"]),
    description: getFirstText([row], ["description"]),
    is_active: getFirstBool([row], ["is_active", "isActive"], true),
    is_default: getFirstBool([row], ["is_default", "isDefault"], false),
    is_system: getFirstBool([row], ["is_system", "isSystem"], false),
  };
}
function normalizeTaxRateRows(payload: unknown): TaxRateRow[] {
  return normalizeList(payload).map(normalizeTaxRateRow).filter((row) => row.id && row.code);
}
function taxOptionLabel(option: { labelAr: string; labelEn: string }, rtl: boolean): string {
  return rtl ? option.labelAr : option.labelEn;
}
function taxRateDisplayName(row: TaxRateRow, rtl: boolean): string {
  return rtl ? row.name || row.code : row.name_en || row.name || row.code;
}
function normalizeTaxRateCodePart(rateValue: string): string {
  const rate = formatTaxRateShort(rateValue);
  const [whole, decimal = "00"] = rate.split(".");
  return decimal === "00" ? whole : `${whole}_${decimal}`;
}
function buildAutoTaxRateForm(form: TaxRateForm): TaxRateForm {
  const rate = formatTaxRate(form.rate);
  const rateShort = formatTaxRateShort(rate);
  const taxType = form.tax_type || "CUSTOM";
  const names = autoTaxNameByType[taxType] || autoTaxNameByType.CUSTOM;
  return {
    ...form,
    code: `CUSTOM${taxType}${normalizeTaxRateCodePart(rate)}`.replace(/[^A-Z0-9_]/g, ""),
    name: `${names.ar} ${rateShort}%`,
    name_en: `${names.en} ${rateShort}%`,
    rate,
  };
}
function taxRateOptionLabel(
  value: string,
  options: Array<{ value: string; labelAr: string; labelEn: string }>,
  rtl: boolean
): string {
  const option = options.find((item) => item.value === value);
  return option ? taxOptionLabel(option, rtl) : value || "-";
}
function taxRateTypeLabel(row: TaxRateRow, rtl: boolean): string {
  return taxRateOptionLabel(row.tax_type, taxTypeOptions, rtl);
}
function taxRateDirectionLabel(row: TaxRateRow, rtl: boolean): string {
  return taxRateOptionLabel(row.direction, taxDirectionOptions, rtl);
}
function taxRateCalculationBaseLabel(row: TaxRateRow, rtl: boolean): string {
  return taxRateOptionLabel(row.calculation_base, taxCalculationBaseOptions, rtl);
}
function taxRateSecondaryText(row: TaxRateRow, rtl: boolean): string {
  if (rtl) {
    return row.zatca_exemption_reason || taxRateCalculationBaseLabel(row, rtl);
  }
  return row.description || taxRateCalculationBaseLabel(row, rtl);
}
function getDefaultVatTaxRate(rows: TaxRateRow[]): TaxRateRow | null {
  return (
    rows.find((row) => row.tax_type === "VAT" && row.is_default && row.is_active) ||
    rows.find((row) => row.code === "VAT15" && row.is_active) ||
    rows.find((row) => row.tax_type === "VAT" && row.is_active) ||
    null
  );
}
function taxRateToForm(row: TaxRateRow): TaxRateForm {
  return {
    code: row.code,
    name: row.name,
    name_en: row.name_en,
    tax_type: row.tax_type,
    direction: row.direction,
    rate: row.rate,
    calculation_base: row.calculation_base,
    zatca_category_code: row.zatca_category_code,
    zatca_exemption_reason_code: row.zatca_exemption_reason_code,
    zatca_exemption_reason: row.zatca_exemption_reason,
    description: row.description,
    is_active: row.is_active,
    is_default: row.is_default,
    is_system: row.is_system,
  };
}
function TaxSelectField({
  label,
  value,
  options,
  onChange,
  rtl,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; labelAr: string; labelEn: string }>;
  onChange: (value: string) => void;
  rtl: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border bg-background px-3 text-sm outline-none ring-0 transition focus:border-foreground/40"
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {taxOptionLabel(option, rtl)}
          </option>
        ))}
      </select>
    </label>
  );
}
export function TaxSettingsPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const t = rtl ? taxSettingsAr : taxSettingsEn;
  const [form, setForm] = useState<TaxSettingsForm>(emptyTaxSettings);
  const [taxRateForm, setTaxRateForm] = useState<TaxRateForm>(emptyTaxRateForm);
  const [taxRates, setTaxRates] = useState<TaxRateRow[]>([]);
  const [editingTaxRateId, setEditingTaxRateId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [savingRegistration, setSavingRegistration] = useState(false);
  const [savingTaxRate, setSavingTaxRate] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const defaultVatTaxRate = useMemo(() => getDefaultVatTaxRate(taxRates), [taxRates]);
  const defaultVatRate = defaultVatTaxRate?.rate || "15.0000";
  const previewTaxRateForm = useMemo(
    () => (editingTaxRateId ? taxRateForm : buildAutoTaxRateForm(taxRateForm)),
    [editingTaxRateId, taxRateForm]
  );
  const taxPreview = useMemo(
    () => getTaxPreview(defaultVatRate, form.is_vat_registered, form.prices_include_tax),
    [defaultVatRate, form.is_vat_registered, form.prices_include_tax]
  );
  const taxStats = useMemo(() => {
    const active = taxRates.filter((row) => row.is_active);
    return {
      total: taxRates.length,
      active: active.length,
      vat: taxRates.filter((row) => row.tax_type === "VAT").length,
      excise: taxRates.filter((row) => row.tax_type === "EXCISE").length,
    };
  }, [taxRates]);
  const filteredTaxRates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return taxRates.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          row.code,
          row.name,
          row.name_en,
          row.description,
          row.tax_type,
          row.tax_type_display,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesType = typeFilter === "ALL" || row.tax_type === typeFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && row.is_active) ||
        (statusFilter === "INACTIVE" && !row.is_active);
      return matchesQuery && matchesType && matchesStatus;
    });
  }, [query, statusFilter, taxRates, typeFilter]);
  const setField = <K extends keyof TaxSettingsForm>(key: K, value: TaxSettingsForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const setTaxRateField = <K extends keyof TaxRateForm>(key: K, value: TaxRateForm[K]) => {
    setTaxRateForm((current) => ({ ...current, [key]: value }));
  };
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [profilePayload, settingsPayload, taxRatesPayload] = await Promise.all([
        apiRequest<unknown>("/api/company/profile/"),
        apiRequest<unknown>("/api/company/settings/").catch(() => null),
        apiRequest<unknown>("/api/company/tax-rates/"),
      ]);
      const profileRecords = getProfileSourceRecords(profilePayload, null);
      const settingsRecords = getTaxSettingsRecords(settingsPayload);
      const records = [...settingsRecords, ...profileRecords];
      const profileTaxAddress = buildTaxAddressFromProfile(profileRecords);
      const loadedTaxRates = normalizeTaxRateRows(taxRatesPayload);
      const loadedDefaultVat = getDefaultVatTaxRate(loadedTaxRates);
      setTaxRates(loadedTaxRates);
      setForm({
        is_vat_registered: getFirstBool(records, ["is_vat_registered", "vat_registered"], true),
        tax_number: getFirstText(records, ["tax_number", "vat_number", "tax_id", "vat_registration_number"]),
        prices_include_tax: getFirstBool(records, ["prices_include_tax", "tax_inclusive"], false),
        invoice_tax_label: getFirstText(records, ["invoice_tax_label", "tax_label"], "VAT"),
        tax_address: getFirstText(records, ["tax_address", "address"]) || profileTaxAddress,
      });
      if (!editingTaxRateId) {
        setTaxRateForm({
          ...emptyTaxRateForm,
          rate: loadedDefaultVat?.rate || emptyTaxRateForm.rate,
        });
      }
    } catch (error) {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [editingTaxRateId, t.loadError]);
  useEffect(() => {
    void load();
  }, [load]);
  const saveRegistration = async () => {
    if (form.is_vat_registered && !form.tax_number.trim()) {
      toast.error(t.taxNumberRequired);
      return;
    }
    if (!form.invoice_tax_label.trim()) {
      toast.error(t.taxLabelRequired);
      return;
    }
    try {
      setSavingRegistration(true);
      await Promise.all([
        apiRequest("/api/company/profile/", {
          method: "PATCH",
          body: JSON.stringify({
            tax_number: form.tax_number.trim(),
          }),
        }),
        apiRequest("/api/company/settings/", {
          method: "PATCH",
          body: JSON.stringify({
            is_vat_registered: form.is_vat_registered,
            vat_registered: form.is_vat_registered,
            prices_include_tax: form.prices_include_tax,
            tax_inclusive: form.prices_include_tax,
            invoice_tax_label: form.invoice_tax_label.trim(),
            tax_label: form.invoice_tax_label.trim(),
            tax_address: form.tax_address.trim(),
          }),
        }),
      ]);
      toast.success(t.saved);
      await load();
    } catch (error) {
      toast.error(t.saveError);
    } finally {
      setSavingRegistration(false);
    }
  };
  const seedCatalog = async () => {
    try {
      setSeeding(true);
      await apiRequest("/api/company/tax-rates/seed/", {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success(t.seeded);
      await load();
    } catch (error) {
      toast.error(t.saveError);
    } finally {
      setSeeding(false);
    }
  };
  const resetTaxRateForm = () => {
    setEditingTaxRateId(null);
    setTaxRateForm({ ...emptyTaxRateForm, rate: defaultVatRate || emptyTaxRateForm.rate });
  };
  const editTaxRate = (row: TaxRateRow) => {
    setEditingTaxRateId(row.id);
    setTaxRateForm(taxRateToForm(row));
  };
  const saveTaxRate = async () => {
    const effectiveTaxRateForm = editingTaxRateId ? taxRateForm : buildAutoTaxRateForm(taxRateForm);
    const rate = Number(formatTaxRate(effectiveTaxRateForm.rate));
    if (!effectiveTaxRateForm.code.trim()) {
      toast.error(t.codeRequired);
      return;
    }
    if (!effectiveTaxRateForm.name.trim()) {
      toast.error(t.nameRequired);
      return;
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error(t.invalidRate);
      return;
    }
    const payload = {
      code: effectiveTaxRateForm.code.trim().toUpperCase(),
      name: effectiveTaxRateForm.name.trim(),
      name_en: effectiveTaxRateForm.name_en.trim(),
      tax_type: effectiveTaxRateForm.tax_type,
      direction: effectiveTaxRateForm.direction,
      rate: formatTaxRate(effectiveTaxRateForm.rate),
      calculation_base: effectiveTaxRateForm.calculation_base,
      zatca_category_code: effectiveTaxRateForm.zatca_category_code,
      zatca_exemption_reason_code: effectiveTaxRateForm.zatca_exemption_reason_code.trim(),
      zatca_exemption_reason: effectiveTaxRateForm.zatca_exemption_reason.trim(),
      description: effectiveTaxRateForm.description.trim(),
      is_active: effectiveTaxRateForm.is_active,
      is_default: effectiveTaxRateForm.is_default,
      is_system: effectiveTaxRateForm.is_system,
    };
    try {
      setSavingTaxRate(true);
      await apiRequest(
        editingTaxRateId ? `/api/company/tax-rates/${editingTaxRateId}/` : "/api/company/tax-rates/",
        {
          method: editingTaxRateId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );
      toast.success(editingTaxRateId ? t.taxRateUpdated : t.taxRateCreated);
      resetTaxRateForm();
      await load();
    } catch (error) {
      toast.error(t.saveError);
    } finally {
      setSavingTaxRate(false);
    }
  };
  const toggleTaxRate = async (row: TaxRateRow, nextActive: boolean) => {
    try {
      await apiRequest(`/api/company/tax-rates/${row.id}/${nextActive ? "activate" : "deactivate"}/`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success(nextActive ? t.activated : t.deactivated);
      await load();
    } catch (error) {
      toast.error(t.saveError);
    }
  };
  return (
    <SettingsPageShell
      title={t.title}
      description={t.description}
      icon={Landmark}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <SecondaryButton onClick={() => void load()}>{t.refresh}</SecondaryButton>
          <SecondaryButton onClick={() => void seedCatalog()} disabled={seeding}>
            {t.seedCatalog}
          </SecondaryButton>
          <PrimaryButton onClick={() => void saveRegistration()} disabled={savingRegistration}>
            {t.saveRegistration}
          </PrimaryButton>
        </div>
      }
    >
      {loading ? (
        <SettingsLoading />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t.status} value={form.is_vat_registered ? t.registered : t.notRegistered} hint={t.statusHint} icon={ShieldCheck} />
            <StatCard label={t.taxNumberStatus} value={form.tax_number.trim() ? t.complete : t.incomplete} hint={t.taxNumberHint} icon={FileText} />
            <StatCard label={t.defaultVat} value={`${formatTaxRateShort(defaultVatRate)}%`} hint={t.defaultVatHint} icon={Landmark} />
            <StatCard label={t.activeCodes} value={`${taxStats.active} / ${taxStats.total}`} hint={t.activeCodesHint} icon={CheckCircle2} />
          </section>
          <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <ProfileSectionCard title={t.registrationTitle} description={t.registrationDescription} icon={FileText}>
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label={t.taxNumber} value={form.tax_number} onChange={(value) => setField("tax_number", value)} required={form.is_vat_registered} />
                <TextInput label={t.taxLabel} value={form.invoice_tax_label} onChange={(value) => setField("invoice_tax_label", value)} required />
                <div className="grid gap-4">
                  <ToggleInput label={t.registeredLabel} description={t.registeredDescription} checked={form.is_vat_registered} onChange={(value) => setField("is_vat_registered", value)} />
                  <ToggleInput label={t.pricesIncludeTax} description={t.pricesIncludeTaxDescription} checked={form.prices_include_tax} onChange={(value) => setField("prices_include_tax", value)} />
                </div>
                <TextArea label={t.taxAddress} value={form.tax_address} onChange={(value) => setField("tax_address", value)} placeholder={t.taxAddressDescription} />
              </div>
            </ProfileSectionCard>
            <div className="space-y-6">
              <ProfileSectionCard title={t.summaryTitle} description={t.summaryDescription} icon={Landmark}>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl border bg-background p-4">
                    <span className="font-semibold text-muted-foreground">{t.defaultVat}</span>
                    <span className="font-bold text-foreground">{defaultVatTaxRate ? taxRateDisplayName(defaultVatTaxRate, rtl) : "-"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border bg-background p-4">
                    <span className="font-semibold text-muted-foreground">{t.rate}</span>
                    <span className="font-bold tabular-nums text-foreground">{formatTaxRateShort(defaultVatRate)}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border bg-background p-4">
                    <span className="font-semibold text-muted-foreground">{t.priceMode}</span>
                    <Badge variant="outline" className="rounded-full bg-muted px-2.5 py-1 text-xs">
                      {form.prices_include_tax ? t.included : t.excluded}
                    </Badge>
                  </div>
                </div>
              </ProfileSectionCard>
              <ProfileSectionCard title={t.documentTitle} description={t.documentDescription} icon={CheckCircle2}>
                <div className="space-y-3">
                  <ReadinessRow label={t.registrationReady} ready={form.is_vat_registered} readyLabel={t.ready} pendingLabel={t.pending} />
                  <ReadinessRow label={t.taxNumberReady} ready={Boolean(form.tax_number.trim())} readyLabel={t.ready} pendingLabel={t.pending} />
                  <ReadinessRow label={t.labelReady} ready={Boolean(form.invoice_tax_label.trim())} readyLabel={t.ready} pendingLabel={t.pending} />
                  <ReadinessRow label={t.addressReady} ready={Boolean(form.tax_address.trim())} readyLabel={t.ready} pendingLabel={t.pending} />
                </div>
              </ProfileSectionCard>
            </div>
          </section>
          <ProfileSectionCard title={t.summaryTitle} description={t.summaryDescription} icon={CreditCard}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">{t.taxableAmount}</p>
                <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{formatTaxMoney(taxPreview.taxableAmount)}</p>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">{t.netAmount}</p>
                <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{formatTaxMoney(taxPreview.netAmount)}</p>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">{t.taxAmount}</p>
                <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{formatTaxMoney(taxPreview.taxAmount)}</p>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">{t.totalAmount}</p>
                <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{formatTaxMoney(taxPreview.totalAmount)}</p>
              </div>
            </div>
          </ProfileSectionCard>
          <section className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)]">
            <ProfileSectionCard
              title={editingTaxRateId ? t.formTitleEdit : t.formTitleCreate}
              description={t.formDescription}
              icon={Landmark}
            >
              <div className="grid gap-4">
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <div className="grid gap-3">
                    <div className="rounded-2xl border bg-background p-3">
                      <p className="text-xs font-semibold text-muted-foreground">{t.code}</p>
                      <p dir="ltr" className="mt-2 overflow-x-auto whitespace-nowrap font-mono text-sm font-bold text-foreground">
                        {previewTaxRateForm.code || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-background p-3">
                      <p className="text-xs font-semibold text-muted-foreground">{t.name}</p>
                      <p className="mt-2 font-bold leading-7 text-foreground">
                        {previewTaxRateForm.name || "-"}
                      </p>
                    </div>
                    <div className="rounded-2xl border bg-background p-3">
                      <p className="text-xs font-semibold text-muted-foreground">{t.nameEn}</p>
                      <p dir="ltr" className="mt-2 overflow-x-auto whitespace-nowrap font-bold leading-7 text-foreground">
                        {previewTaxRateForm.name_en || "-"}
                      </p>
                    </div>
                  </div>
                </div>
                <TaxSelectField label={t.taxType} value={taxRateForm.tax_type} options={taxTypeOptions} onChange={(value) => setTaxRateField("tax_type", value)} rtl={rtl} />
                <TaxSelectField label={t.rate} value={taxRateForm.rate} options={taxRatePercentOptions} onChange={(value) => setTaxRateField("rate", value)} rtl={rtl} />
                <TaxSelectField label={t.direction} value={taxRateForm.direction} options={taxDirectionOptions} onChange={(value) => setTaxRateField("direction", value)} rtl={rtl} />
                <TaxSelectField label={t.calculationBase} value={taxRateForm.calculation_base} options={taxCalculationBaseOptions} onChange={(value) => setTaxRateField("calculation_base", value)} rtl={rtl} />
                <div className="grid gap-4 md:grid-cols-2">
                  <TaxSelectField label={t.zatcaCategory} value={taxRateForm.zatca_category_code} options={zatcaCategoryOptions} onChange={(value) => setTaxRateField("zatca_category_code", value)} rtl={rtl} />
                  <TextInput label={t.exemptionCode} value={taxRateForm.zatca_exemption_reason_code} onChange={(value) => setTaxRateField("zatca_exemption_reason_code", value)} />
                </div>
                <TextArea label={t.exemptionReason} value={taxRateForm.zatca_exemption_reason} onChange={(value) => setTaxRateField("zatca_exemption_reason", value)} />
                <TextArea label={t.descriptionLabel} value={taxRateForm.description} onChange={(value) => setTaxRateField("description", value)} />
                <div className="grid gap-4 md:grid-cols-2">
                  <ToggleInput label={t.active} description={t.activeCodesHint} checked={taxRateForm.is_active} onChange={(value) => setTaxRateField("is_active", value)} />
                  <ToggleInput label={t.isDefault} description={t.defaultVatHint} checked={taxRateForm.is_default} onChange={(value) => setTaxRateField("is_default", value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <PrimaryButton onClick={() => void saveTaxRate()} disabled={savingTaxRate}>
                    {editingTaxRateId ? t.updateTaxRate : t.saveTaxRate}
                  </PrimaryButton>
                  {editingTaxRateId ? (
                    <SecondaryButton onClick={resetTaxRateForm}>{t.cancelEdit}</SecondaryButton>
                  ) : null}
                </div>
              </div>
            </ProfileSectionCard>
            <div className="space-y-6">
              <ProfileSectionCard title={t.filtersTitle} description={`${t.catalogDescription} - ${filteredTaxRates.length} / ${taxRates.length}`} icon={Search}>
                <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
                  <SearchBox value={query} onChange={setQuery} placeholder={t.searchPlaceholder} />
                  <TaxSelectField
                    label={t.typeFilter}
                    value={typeFilter}
                    options={[{ value: "ALL", labelAr: t.all, labelEn: t.all }, ...taxTypeOptions]}
                    onChange={setTypeFilter}
                    rtl={rtl}
                  />
                  <TaxSelectField
                    label={t.statusFilter}
                    value={statusFilter}
                    options={[
                      { value: "ALL", labelAr: t.all, labelEn: t.all },
                      { value: "ACTIVE", labelAr: t.active, labelEn: t.active },
                      { value: "INACTIVE", labelAr: t.inactive, labelEn: t.inactive },
                    ]}
                    onChange={setStatusFilter}
                    rtl={rtl}
                  />
                  <div className="flex items-end">
                    <SecondaryButton onClick={() => void seedCatalog()} disabled={seeding}>
                      {t.seedCatalog}
                    </SecondaryButton>
                  </div>
                </div>
              </ProfileSectionCard>
              <ProfileSectionCard title={t.listTitle} description={t.catalogDescription} icon={FileText}>
                {filteredTaxRates.length === 0 ? (
                  <EmptyState title={t.noTaxCodes} description={t.noTaxCodesDescription} />
                ) : (
                  <div className="overflow-hidden rounded-2xl border">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y text-sm">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 text-start">{t.code}</th>
                            <th className="px-4 py-3 text-start">{t.name}</th>
                            <th className="px-4 py-3 text-start">{t.taxType}</th>
                            <th className="px-4 py-3 text-start">{t.rate}</th>
                            <th className="px-4 py-3 text-start">{t.zatcaCategory}</th>
                            <th className="px-4 py-3 text-start">{t.statusFilter}</th>
                            <th className="px-4 py-3 text-end">{t.edit}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y bg-card">
                          {filteredTaxRates.map((row) => (
                            <tr key={row.id} className="align-top">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-foreground">{row.code}</div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {row.is_default ? <Badge variant="outline" className="rounded-full">{t.isDefault}</Badge> : null}
                                  <Badge variant="outline" className="rounded-full">
                                    {row.is_system ? t.system : t.custom}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground">{taxRateDisplayName(row, rtl)}</div>
                                <div className="text-xs text-muted-foreground">{taxRateSecondaryText(row, rtl)}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium">{taxRateTypeLabel(row, rtl)}</div>
                                <div className="text-xs text-muted-foreground">{taxRateDirectionLabel(row, rtl)}</div>
                              </td>
                              <td className="px-4 py-3 font-semibold tabular-nums">{formatTaxRateShort(row.rate)}%</td>
                              <td className="px-4 py-3">{row.zatca_category_code || "-"}</td>
                              <td className="px-4 py-3">
                                <StatusPill active={row.is_active} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  <SecondaryButton onClick={() => editTaxRate(row)}>{t.edit}</SecondaryButton>
                                  <SecondaryButton onClick={() => void toggleTaxRate(row, !row.is_active)}>
                                    {row.is_active ? t.deactivate : t.activate}
                                  </SecondaryButton>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </ProfileSectionCard>
            </div>
          </section>
        </div>
      )}
    </SettingsPageShell>
  );
}


type PaymentMethodForm = {
  name: string;
  code: string;
  method_type: string;
  settlement_behavior: string;
  cashbox_account_code: string;
  bank_account_code: string;
  allow_pos: boolean;
  allow_customer_checkout: boolean;
  is_default: boolean;
  is_active: boolean;
  notes: string;
};
const paymentMethodsEndpoint = "/api/company/payments/methods/";
const emptyPaymentMethodForm: PaymentMethodForm = {
  name: "",
  code: "",
  method_type: "CASH",
  settlement_behavior: "IMMEDIATE",
  cashbox_account_code: "",
  bank_account_code: "",
  allow_pos: true,
  allow_customer_checkout: false,
  is_default: false,
  is_active: true,
  notes: "",
};
const paymentMethodTypeOptions = [
  { value: "CASH", labelAr: "نقدي", labelEn: "Cash" },
  { value: "BANK_TRANSFER", labelAr: "تحويل بنكي", labelEn: "Bank transfer" },
  { value: "POS_TERMINAL", labelAr: "جهاز نقاط بيع", labelEn: "POS terminal" },
  { value: "ONLINE_GATEWAY", labelAr: "بوابة إلكترونية", labelEn: "Online gateway" },
];
const settlementBehaviorOptions = [
  { value: "IMMEDIATE", labelAr: "فوري", labelEn: "Immediate" },
  { value: "NEEDS_SETTLEMENT", labelAr: "يحتاج تسوية", labelEn: "Needs settlement" },
];
function paymentMethodOptionLabel(
  options: Array<{ value: string; labelAr: string; labelEn: string }>,
  value: string,
  rtl: boolean
): string {
  const option = options.find((item) => item.value === value);
  if (!option) return value || "-";
  return rtl ? option.labelAr : option.labelEn;
}
function normalizePaymentMethodCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
function defaultPaymentMethodCode(methodType: string): string {
  if (methodType === "BANK_TRANSFER") return "BANK";
  if (methodType === "POS_TERMINAL") return "POS";
  if (methodType === "ONLINE_GATEWAY") return "ONLINE";
  return "CASH";
}
function buildPaymentMethodPayload(form: PaymentMethodForm) {
  const code =
    normalizePaymentMethodCode(form.code) ||
    normalizePaymentMethodCode(form.name) ||
    defaultPaymentMethodCode(form.method_type);
  return {
    name: form.name.trim(),
    code,
    method_type: form.method_type,
    type: form.method_type,
    settlement_behavior: form.settlement_behavior,
    cashbox_account_code: form.cashbox_account_code.trim(),
    bank_account_code: form.bank_account_code.trim(),
    allow_pos: form.allow_pos,
    allow_customer_checkout: form.allow_customer_checkout,
    is_default: form.is_default,
    is_active: form.is_active,
    notes: form.notes.trim(),
  };
}
function paymentMethodTypeFromRow(row: ApiRecord): string {
  return getText(row, ["method_type", "type"], "CASH").toUpperCase();
}
function paymentMethodSettlementFromRow(row: ApiRecord): string {
  return getText(row, ["settlement_behavior"], "IMMEDIATE").toUpperCase();
}
function paymentMethodDisplayName(row: ApiRecord): string {
  return getText(row, ["name", "title", "label"], "-");
}
function paymentMethodCode(row: ApiRecord): string {
  return getText(row, ["code"], "-");
}
export function PaymentMethodsPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<PaymentMethodForm>({ ...emptyPaymentMethodForm });
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const setField = <K extends keyof PaymentMethodForm>(key: K, value: PaymentMethodForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!normalizedQuery) return true;
      return [
        paymentMethodDisplayName(row),
        paymentMethodCode(row),
        getText(row, ["method_type", "method_type_display", "type"]),
        getText(row, ["settlement_behavior", "settlement_behavior_display"]),
        getText(row, ["cashbox_account_code"]),
        getText(row, ["bank_account_code"]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, rows]);
  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => getBool(row, ["is_active", "active"], true)).length,
      pos: rows.filter((row) => getBool(row, ["allow_pos"], false)).length,
      checkout: rows.filter((row) => getBool(row, ["allow_customer_checkout"], false)).length,
    };
  }, [rows]);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await apiRequest<unknown>(paymentMethodsEndpoint);
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
    setForm({ ...emptyPaymentMethodForm });
  };
  const edit = (row: ApiRecord) => {
    setEditingId(getRowId(row));
    const methodType = paymentMethodTypeFromRow(row);
    setForm({
      name: paymentMethodDisplayName(row),
      code: paymentMethodCode(row) === "-" ? "" : paymentMethodCode(row),
      method_type: methodType,
      settlement_behavior: paymentMethodSettlementFromRow(row),
      cashbox_account_code: getText(row, ["cashbox_account_code"]),
      bank_account_code: getText(row, ["bank_account_code"]),
      allow_pos: getBool(row, ["allow_pos"], methodType === "CASH" || methodType === "POS_TERMINAL"),
      allow_customer_checkout: getBool(row, ["allow_customer_checkout"], methodType === "ONLINE_GATEWAY"),
      is_default: getBool(row, ["is_default"], false),
      is_active: getBool(row, ["is_active", "active"], true),
      notes: getText(row, ["notes", "description"]),
    });
  };
  const save = async () => {
    if (!form.name.trim()) {
      toast.error(rtl ? "اسم طريقة الدفع مطلوب" : "Payment method name is required");
      return;
    }
    const payload = buildPaymentMethodPayload(form);
    try {
      setSaving(true);
      await apiRequest(editingId ? `${paymentMethodsEndpoint}${editingId}/` : paymentMethodsEndpoint, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
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
  const toggle = async (id: string, nextActive: boolean) => {
    try {
      try {
        await apiRequest(`${paymentMethodsEndpoint}${id}/status/`, {
          method: "POST",
          body: JSON.stringify({ is_active: nextActive }),
        });
      } catch {
        await apiRequest(`${paymentMethodsEndpoint}${id}/`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: nextActive }),
        });
      }
      toast.success(nextActive ? (rtl ? "تم تفعيل طريقة الدفع" : "Payment method activated") : rtl ? "تم تعطيل طريقة الدفع" : "Payment method deactivated");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذر تحديث الحالة" : "Could not update status");
    }
  };
  const seedDefaults = async () => {
    const existingCodes = new Set(rows.map((row) => paymentMethodCode(row).toUpperCase()));
    const defaults = [
      {
        name: rtl ? "نقدي" : "Cash",
        code: "CASH",
        method_type: "CASH",
        type: "CASH",
        settlement_behavior: "IMMEDIATE",
        allow_pos: true,
        allow_customer_checkout: false,
        is_default: true,
        is_active: true,
      },
      {
        name: rtl ? "بطاقة بنكية - نقطة بيع" : "Card POS",
        code: "POS",
        method_type: "POS_TERMINAL",
        type: "POS_TERMINAL",
        settlement_behavior: "NEEDS_SETTLEMENT",
        allow_pos: true,
        allow_customer_checkout: false,
        is_default: false,
        is_active: true,
      },
      {
        name: rtl ? "تحويل بنكي" : "Bank transfer",
        code: "BANK",
        method_type: "BANK_TRANSFER",
        type: "BANK_TRANSFER",
        settlement_behavior: "IMMEDIATE",
        allow_pos: false,
        allow_customer_checkout: true,
        is_default: false,
        is_active: true,
      },
    ];
    const missing = defaults.filter((item) => !existingCodes.has(item.code));
    if (missing.length === 0) {
      toast.success(rtl ? "طرق الدفع الأساسية موجودة بالفعل" : "Default payment methods already exist");
      return;
    }
    try {
      setSeeding(true);
      for (const item of missing) {
        await apiRequest(paymentMethodsEndpoint, {
          method: "POST",
          body: JSON.stringify(item),
        });
      }
      toast.success(rtl ? "تمت تهيئة طرق الدفع الأساسية" : "Default payment methods created");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : rtl ? "تعذرت تهيئة طرق الدفع" : "Could not seed payment methods");
    } finally {
      setSeeding(false);
    }
  };
  return (
    <PageShell
      title={rtl ? "طرق الدفع" : "Payment methods"}
      description={rtl ? "إدارة طرق الدفع التي تستخدمها الشركة في الفواتير ونقطة البيع والتحصيل." : "Manage company payment methods used in invoices, POS and collections."}
      icon={CreditCard}
      actions={
        <>
          <SecondaryButton onClick={() => void load()}>
            <RefreshCcw className="h-4 w-4" />
            {rtl ? "تحديث" : "Refresh"}
          </SecondaryButton>
          <SecondaryButton onClick={() => void seedDefaults()} disabled={seeding}>
            <Plus className="h-4 w-4" />
            {rtl ? "تهيئة الطرق الأساسية" : "Seed defaults"}
          </SecondaryButton>
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={rtl ? "الإجمالي" : "Total"} value={stats.total} hint={rtl ? "طرق دفع مسجلة" : "Registered payment methods"} icon={CreditCard} />
        <StatCard label={rtl ? "النشطة" : "Active"} value={stats.active} hint={rtl ? "متاحة للاستخدام" : "Available for use"} icon={CheckCircle2} />
        <StatCard label={rtl ? "نقطة البيع" : "POS"} value={stats.pos} hint={rtl ? "مفعلة لنقطة البيع" : "Allowed in POS"} icon={Store} />
        <StatCard label={rtl ? "تحصيل العملاء" : "Checkout"} value={stats.checkout} hint={rtl ? "مفعلة للتحصيل" : "Allowed for checkout"} icon={Landmark} />
      </section>
      {loading ? (
        <LoadingBlock />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card
            title={rtl ? "قائمة طرق الدفع" : "Payment methods list"}
            description={`${rtl ? "الإجمالي" : "Total"}: ${filteredRows.length} / ${rows.length}`}
            icon={CreditCard}
          >
            <div className="mb-4">
              <SearchBox
                value={query}
                onChange={setQuery}
                placeholder={rtl ? "ابحث بالاسم أو الكود أو نوع طريقة الدفع..." : "Search by name, code or method type..."}
              />
            </div>
            {filteredRows.length === 0 ? (
              <EmptyState
                title={rtl ? "لا توجد طرق دفع" : "No payment methods"}
                description={rtl ? "استخدم زر تهيئة الطرق الأساسية أو أضف طريقة دفع جديدة من النموذج." : "Use Seed defaults or add a new payment method from the form."}
              />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-neutral-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200 text-sm">
                    <thead className="bg-neutral-50 text-xs text-neutral-500">
                      <tr>
                        <th className="px-4 py-3 text-start">{rtl ? "الكود" : "Code"}</th>
                        <th className="px-4 py-3 text-start">{rtl ? "الاسم" : "Name"}</th>
                        <th className="px-4 py-3 text-start">{rtl ? "النوع" : "Type"}</th>
                        <th className="px-4 py-3 text-start">{rtl ? "التسوية" : "Settlement"}</th>
                        <th className="px-4 py-3 text-start">{rtl ? "الاستخدام" : "Usage"}</th>
                        <th className="px-4 py-3 text-start">{rtl ? "الحالة" : "Status"}</th>
                        <th className="px-4 py-3 text-end">{rtl ? "إجراءات" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 bg-white">
                      {filteredRows.map((row) => {
                        const id = getRowId(row);
                        const methodType = paymentMethodTypeFromRow(row);
                        const active = getBool(row, ["is_active", "active"], true);
                        return (
                          <tr key={id || paymentMethodCode(row)} className="align-top">
                            <td className="px-4 py-3 font-semibold text-neutral-950">{paymentMethodCode(row)}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-neutral-950">{paymentMethodDisplayName(row)}</div>
                              <div className="mt-1 text-xs text-neutral-500">
                                {getBool(row, ["is_default"], false) ? (rtl ? "افتراضية" : "Default") : rtl ? "غير افتراضية" : "Not default"}
                              </div>
                            </td>
                            <td className="px-4 py-3">{paymentMethodOptionLabel(paymentMethodTypeOptions, methodType, rtl)}</td>
                            <td className="px-4 py-3">{paymentMethodOptionLabel(settlementBehaviorOptions, paymentMethodSettlementFromRow(row), rtl)}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {getBool(row, ["allow_pos"], false) ? <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">POS</span> : null}
                                {getBool(row, ["allow_customer_checkout"], false) ? <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">{rtl ? "تحصيل" : "Checkout"}</span> : null}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <StatusPill active={active} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <SecondaryButton onClick={() => edit(row)}>{rtl ? "تعديل" : "Edit"}</SecondaryButton>
                                <SecondaryButton onClick={() => void toggle(id, !active)}>
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
              </div>
            )}
          </Card>
          <Card
            title={editingId ? (rtl ? "تعديل طريقة دفع" : "Edit payment method") : rtl ? "إضافة طريقة دفع" : "Add payment method"}
            description={rtl ? "اربط طريقة الدفع بنوعها واستخدامها في نقطة البيع أو التحصيل." : "Configure the payment method type and where it can be used."}
            icon={Plus}
          >
            <div className="grid gap-4">
              <TextInput label={rtl ? "اسم طريقة الدفع" : "Payment method name"} value={form.name} onChange={(value) => setField("name", value)} required />
              <TextInput
                label={rtl ? "الكود" : "Code"}
                value={form.code}
                onChange={(value) => setField("code", normalizePaymentMethodCode(value))}
                placeholder={rtl ? "اختياري - يولد تلقائيًا إن ترك فارغًا" : "Optional - auto generated if empty"}
              />
              <SelectInput
                label={rtl ? "النوع" : "Type"}
                value={form.method_type}
                onChange={(value) => setField("method_type", value)}
                options={paymentMethodTypeOptions.map((item) => ({ value: item.value, label: rtl ? item.labelAr : item.labelEn }))}
              />
              <SelectInput
                label={rtl ? "سلوك التسوية" : "Settlement behavior"}
                value={form.settlement_behavior}
                onChange={(value) => setField("settlement_behavior", value)}
                options={settlementBehaviorOptions.map((item) => ({ value: item.value, label: rtl ? item.labelAr : item.labelEn }))}
              />
              <TextInput label={rtl ? "كود حساب الصندوق" : "Cashbox account code"} value={form.cashbox_account_code} onChange={(value) => setField("cashbox_account_code", value)} />
              <TextInput label={rtl ? "كود الحساب البنكي" : "Bank account code"} value={form.bank_account_code} onChange={(value) => setField("bank_account_code", value)} />
              <div className="grid gap-3">
                <ToggleInput label={rtl ? "متاحة في نقطة البيع" : "Allowed in POS"} checked={form.allow_pos} onChange={(value) => setField("allow_pos", value)} />
                <ToggleInput label={rtl ? "متاحة لتحصيل العملاء" : "Allowed for customer checkout"} checked={form.allow_customer_checkout} onChange={(value) => setField("allow_customer_checkout", value)} />
                <ToggleInput label={rtl ? "طريقة الدفع الافتراضية" : "Default payment method"} checked={form.is_default} onChange={(value) => setField("is_default", value)} />
                <ToggleInput label={rtl ? "طريقة دفع نشطة" : "Active payment method"} checked={form.is_active} onChange={(value) => setField("is_active", value)} />
              </div>
              <TextArea label={rtl ? "ملاحظات" : "Notes"} value={form.notes} onChange={(value) => setField("notes", value)} />
              <div className="flex flex-wrap justify-end gap-2">
                {editingId ? <SecondaryButton onClick={resetForm}>{rtl ? "إلغاء التعديل" : "Cancel edit"}</SecondaryButton> : null}
                <PrimaryButton onClick={() => void save()} disabled={saving}>
                  <Save className="h-4 w-4" />
                  {editingId ? (rtl ? "تحديث" : "Update") : rtl ? "حفظ" : "Save"}
                </PrimaryButton>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
