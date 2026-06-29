"use client";
/* ============================================================
   📂 primey_frontend/components/system/activity-profiles/SystemActivityProfileDetail.tsx
   🧩 Mhamcloud — System Activity Profile Detail
   ------------------------------------------------------------
   ✅ Real API only: GET /api/system/activity-profiles/<id>/
   ✅ Profile details + linked companies table
   ✅ Arabic/English via primey-locale
============================================================ */
import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Inbox,
  Layers3,
  Loader2,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
type CompanyRow = {
  id: number;
  name: string;
  code: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  status: string;
  isActive: boolean;
};
type ProfileDetail = {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  description: string;
  activityType: string;
  businessType: string;
  sector: string;
  status: string;
  isActive: boolean;
  companiesCount: number;
  modules: string[];
  features: string[];
  companies: CompanyRow[];
};
const translations = {
  ar: {
    title: "تفاصيل نشاط الشركة",
    subtitle: "عرض تفاصيل ملف النشاط والشركات المرتبطة به من API النظام الحقيقي.",
    badge: "أنشطة الشركات",
    back: "رجوع",
    list: "القائمة",
    refresh: "تحديث",
    profileInfo: "بيانات ملف النشاط",
    linkedCompanies: "الشركات المرتبطة",
    linkedCompaniesDesc: "الشركات التي تم ربطها بهذا النشاط حسب بيانات النظام.",
    code: "الكود",
    name: "الاسم",
    type: "نوع النشاط",
    businessType: "نوع العمل",
    sector: "القطاع",
    status: "الحالة",
    companies: "الشركات",
    modules: "الوحدات",
    features: "الميزات",
    description: "الوصف",
    email: "البريد",
    phone: "الهاتف",
    city: "المدينة",
    country: "الدولة",
    active: "نشط",
    inactive: "غير نشط",
    fromLiveApi: "من API حقيقي",
    emptyCompanies: "لا توجد شركات مرتبطة",
    errorTitle: "تعذر تحميل تفاصيل النشاط",
    errorDesc: "تأكد من صلاحيات النظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث تفاصيل النشاط.",
    unknown: "غير معروف",
  },
  en: {
    title: "Activity Profile Details",
    subtitle: "View activity profile details and linked companies from the live system API.",
    badge: "Activity Profiles",
    back: "Back",
    list: "List",
    refresh: "Refresh",
    profileInfo: "Profile information",
    linkedCompanies: "Linked companies",
    linkedCompaniesDesc: "Companies assigned to this activity according to system data.",
    code: "Code",
    name: "Name",
    type: "Activity type",
    businessType: "Business type",
    sector: "Sector",
    status: "Status",
    companies: "Companies",
    modules: "Modules",
    features: "Features",
    description: "Description",
    email: "Email",
    phone: "Phone",
    city: "City",
    country: "Country",
    active: "Active",
    inactive: "Inactive",
    fromLiveApi: "From live API",
    emptyCompanies: "No linked companies",
    errorTitle: "Could not load activity profile detail",
    errorDesc: "Make sure you have system permission and the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Activity profile detail refreshed.",
    unknown: "Unknown",
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
function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}
function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
function boolValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["1", "true", "yes", "active"].includes(value.toLowerCase());
  return fallback;
}
function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(numberValue(value)),
  );
}
function listText(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  if (isRecord(value)) return Object.keys(value).filter(Boolean);
  const raw = text(value);
  if (!raw) return [];
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/+$/,
          "",
        )
      : "";
  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}
async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let payload: unknown = null;
  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const record = asRecord(payload);
    throw new Error(text(record.message) || text(record.detail) || `Request failed with status ${response.status}`);
  }
  return (payload || {}) as T;
}
function normalizeCompany(value: unknown, index: number): CompanyRow {
  const record = asRecord(value);
  const id = numberValue(record.id || record.pk, index + 1);
  const status = text(record.status, boolValue(record.is_active, true) ? "ACTIVE" : "INACTIVE").toUpperCase();
  return {
    id,
    name: text(record.display_name || record.name || record.company_name, `Company ${id}`),
    code: text(record.company_code || record.code || record.slug),
    email: text(record.email),
    phone: text(record.phone || record.mobile),
    city: text(record.city),
    country: text(record.country),
    status,
    isActive: boolValue(record.is_active, status === "ACTIVE"),
  };
}
function normalizeProfile(value: unknown): ProfileDetail {
  const record = asRecord(value);
  const status = text(record.status, boolValue(record.is_active, true) ? "ACTIVE" : "INACTIVE").toUpperCase();
  return {
    id: numberValue(record.id || record.pk),
    code: text(record.code || record.key || record.slug),
    name: text(record.display_name || record.name || record.title || record.label),
    nameAr: text(record.name_ar),
    nameEn: text(record.name_en),
    description: text(record.description || record.notes),
    activityType: text(record.activity_type || record.business_type || record.sector || record.category),
    businessType: text(record.business_type || record.activity_type),
    sector: text(record.sector || record.category),
    status,
    isActive: boolValue(record.is_active, status === "ACTIVE"),
    companiesCount: numberValue(record.companies_count || record.company_count),
    modules: listText(record.modules),
    features: listText(record.features),
    companies: asArray(record.companies).map(normalizeCompany),
  };
}
function statusBadgeClass(value: string) {
  const normalized = value.toUpperCase();
  if (normalized === "ACTIVE") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  return "border-muted-foreground/30 bg-muted text-muted-foreground";
}
function statusLabel(value: string, locale: Locale) {
  const t = translations[locale];
  return value.toUpperCase() === "ACTIVE" ? t.active : t.inactive;
}
function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-3 truncate text-3xl font-bold tabular-nums">
              {typeof value === "number" ? formatInteger(value) : value}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-2xl bg-muted p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
function DetailSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Card className="rounded-3xl">
          <CardHeader className="space-y-4">
            <Skeleton className="h-7 w-44 rounded-full" />
            <Skeleton className="h-10 w-72 rounded-xl" />
            <Skeleton className="h-5 w-full max-w-3xl rounded-xl" />
          </CardHeader>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </main>
  );
}
export function SystemActivityProfileDetail({ profileId }: { profileId: string }) {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [payload, setPayload] = React.useState<ApiRecord>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";
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
  const loadDetail = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        if (!profileId) {
          throw new Error("Missing activity profile id.");
        }
        const data = await fetchJson<ApiRecord>(`/api/system/activity-profiles/${profileId}/`);
        setPayload(data);
        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [profileId, t.errorDesc, t.refreshed],
  );
  React.useEffect(() => {
    void loadDetail();
  }, [loadDetail]);
  const apiData = asRecord(payload.data);
  const profile = normalizeProfile(apiData.profile || payload.profile || {});
  const companies = profile.companies;
  if (loading) return <DetailSkeleton />;
  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-3xl border-destructive/30 bg-card shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => void loadDetail({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-4xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.badge}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{profile.name || t.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full bg-background">
                    {t.code}: {profile.code || `#${profile.id}`}
                  </Badge>
                  <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(profile.status))}>
                    {statusLabel(profile.status, locale)}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadDetail({ silent: true })}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Link href="/system/activity-profiles/list" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted">
                  <ArrowRight className="h-4 w-4" />
                  {t.list}
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard title={t.companies} value={profile.companiesCount || companies.length} description={t.fromLiveApi} icon={Building2} />
          <MetricCard title={t.modules} value={profile.modules.length} description={t.fromLiveApi} icon={Layers3} />
          <MetricCard title={t.features} value={profile.features.length} description={t.fromLiveApi} icon={CheckCircle2} />
        </section>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.profileInfo}</CardTitle>
            <CardDescription>{profile.description || t.description}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              [t.code, profile.code],
              [t.name, profile.name],
              [t.type, profile.activityType],
              [t.businessType, profile.businessType],
              [t.sector, profile.sector],
              [t.status, statusLabel(profile.status, locale)],
              [t.modules, profile.modules.join(", ")],
              [t.features, profile.features.join(", ")],
              [t.description, profile.description],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 break-words text-sm font-medium">{value || "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.linkedCompanies}</CardTitle>
            <CardDescription>{t.linkedCompaniesDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[940px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("w-[220px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.name}</TableHead>
                      <TableHead className={cn("w-[140px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.code}</TableHead>
                      <TableHead className={cn("w-[180px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.email}</TableHead>
                      <TableHead className={cn("w-[140px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.phone}</TableHead>
                      <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.city}</TableHead>
                      <TableHead className={cn("w-[120px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>{t.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.length ? (
                      companies.map((item) => (
                        <TableRow key={item.id} className="h-[64px]">
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm font-medium">{item.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">#{item.id}</span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle text-sm", alignClass)}>{item.code || "—"}</TableCell>
                          <TableCell className={cn("px-4 align-middle text-sm", alignClass)}>{item.email || "—"}</TableCell>
                          <TableCell className={cn("px-4 align-middle text-sm", alignClass)}>{item.phone || "—"}</TableCell>
                          <TableCell className={cn("px-4 align-middle text-sm", alignClass)}>{item.city || item.country || "—"}</TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(item.status))}>
                              {statusLabel(item.status, locale)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                            <div className="rounded-full bg-muted p-4 text-muted-foreground">
                              <Inbox className="h-8 w-8" />
                            </div>
                            <p className="font-semibold">{t.emptyCompanies}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
