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
      apiRequest<unknown>("/api/company/payment-methods/"),
      apiRequest<unknown>("/api/company/tax-settings/"),
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
          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
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
export function CompanyPermissionsPage() {
  const locale = useLocale();
  const rtl = locale === "ar";
  const roles = [
    "OWNER",
    "ADMIN",
    "MANAGER",
    "ACCOUNTANT",
    "CASHIER",
    "SALES",
    "INVENTORY",
    "HR",
    "EMPLOYEE",
    "VIEWER",
  ];
  return (
    <PageShell
      title={rtl ? "\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629" : "Company permissions"}
      description={
        rtl
          ? "\u0645\u0631\u0627\u062c\u0639\u0629 \u0623\u062f\u0648\u0627\u0631 \u0648\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0645\u0633\u062a\u062e\u062f\u0645\u064a \u0627\u0644\u0634\u0631\u0643\u0629."
          : "Review company user roles and permissions."
      }
      icon={ShieldCheck}
    >
      <ProfileSectionCard
        title={rtl ? "\u0623\u062f\u0648\u0627\u0631 \u0627\u0644\u0634\u0631\u0643\u0629" : "Company roles"}
        description={
          rtl
            ? "\u0639\u0631\u0636 \u0623\u062f\u0648\u0627\u0631 \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u0629. \u0633\u0646\u0631\u0627\u062c\u0639 \u062a\u0641\u0627\u0635\u064a\u0644 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629 \u0641\u064a \u062e\u0637\u0648\u062a\u0647\u0627."
            : "Shows approved company roles. This page will be reviewed in its own step."
        }
        icon={ShieldCheck}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {roles.map((role) => (
            <div key={role} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-foreground">{role}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {rtl ? "\u062f\u0648\u0631 \u0634\u0631\u0643\u0629" : "Company role"}
              </p>
            </div>
          ))}
        </div>
      </ProfileSectionCard>
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
        <Card title={rtl ? "قائمة طرق الدفع" : "Payment methods list"} description={`${rtl ? "الإجمالي" : "Total"}: ${formatInteger(rows.length)}`} icon={CreditCard}>
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
