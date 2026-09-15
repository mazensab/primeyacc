"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Building2,
  Layers3,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemMetricCard } from "@/components/ui/system-metric-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ActivityProfileScopeBadge,
  ActivityProfileStatusBadge,
  fetchActivityProfileCompanies,
  fetchActivityProfileDetail,
  type SystemActivityProfile,
  type SystemActivityProfileCompany,
} from "@/lib/system-activity-profiles";
import {
  formatDateTime,
  formatInteger,
  readSystemLocale,
  type SystemLocale,
} from "@/lib/system-subscriptions";

const translations = {
  ar: {
    back: "العودة إلى ملفات الأنشطة",
    title: "تفاصيل ملف النشاط",
    subtitle:
      "عرض القراءة فقط لبيانات ملف النشاط والشركات المرتبطة من API الحقيقي.",
    code: "الكود",
    companies: "الشركات المرتبطة",
    modules: "الوحدات",
    features: "الميزات",
    description: "الوصف",
    arabicName: "الاسم العربي",
    englishName: "الاسم الإنجليزي",
    updatedAt: "آخر تحديث",
    companiesTitle: "الشركات المرتبطة",
    companiesDesc: "الشركات التي تستخدم ملف النشاط الحالي.",
    company: "الشركة",
    companyCode: "كود الشركة",
    city: "المدينة",
    companyStatus: "الحالة",
    noCompanies: "لا توجد شركات مرتبطة بهذا الملف.",
    error: "تعذر تحميل ملف النشاط",
  },
  en: {
    back: "Back to activity profiles",
    title: "Activity profile details",
    subtitle:
      "Read-only view of profile data and linked companies from the real API.",
    code: "Code",
    companies: "Linked companies",
    modules: "Modules",
    features: "Features",
    description: "Description",
    arabicName: "Arabic name",
    englishName: "English name",
    updatedAt: "Last updated",
    companiesTitle: "Linked companies",
    companiesDesc: "Companies currently using this activity profile.",
    company: "Company",
    companyCode: "Company code",
    city: "City",
    companyStatus: "Status",
    noCompanies: "No companies are linked to this profile.",
    error: "Could not load activity profile",
  },
} as const;

export default function SystemActivityProfileDetailPage() {
  const params = useParams<{ id: string }>();
  const profileId = String(params?.id || "");
  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [profile, setProfile] =
    React.useState<SystemActivityProfile | null>(null);
  const [companies, setCompanies] = React.useState<
    SystemActivityProfileCompany[]
  >([]);
  const [companiesCount, setCompaniesCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  React.useEffect(() => {
    const sync = () => setLocale(readSystemLocale());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("Mhamcloud-locale-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("Mhamcloud-locale-changed", sync);
    };
  }, []);

  React.useEffect(() => {
    if (!profileId) return;
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const [detailResult, companyResult] = await Promise.all([
          fetchActivityProfileDetail(profileId),
          fetchActivityProfileCompanies(profileId, 100, 0),
        ]);
        if (!active) return;
        setProfile(detailResult);
        setCompanies(companyResult.rows);
        setCompaniesCount(companyResult.count);
      } catch (caught) {
        if (!active) return;
        setError(
          caught instanceof Error ? caught.message : t.error,
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [profileId, t.error]);

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <Card dir={dir}>
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <Activity className="size-9 text-destructive" />
          <CardTitle>{t.error}</CardTitle>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link href="/system/activity-profiles">{t.back}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div dir={dir} className="space-y-4 lg:space-y-6">
      <header>
        <Button asChild variant="ghost" className="-ms-3 mb-2">
          <Link href="/system/activity-profiles">
            <ArrowLeft />
            {t.back}
          </Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
          {profile.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.subtitle}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
        <SystemMetricCard
          title={t.code}
          value={profile.code}
          description={t.title}
          icon={Layers3}
        />
        <SystemMetricCard
          title={t.companies}
          value={companiesCount}
          description={t.companiesDesc}
          icon={Building2}
        />
        <SystemMetricCard
          title={t.modules}
          value={profile.modules.length}
          description={t.title}
          icon={Activity}
        />
        <SystemMetricCard
          title={t.features}
          value={profile.features.length}
          description={t.title}
          icon={ShieldCheck}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={Activity} iconPosition="opposite">
              {t.title}
            </CardTitle>
            <CardDescription>{profile.code}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <ActivityProfileScopeBadge
                value={profile.scope}
                locale={locale}
              />
              <ActivityProfileStatusBadge
                value={profile.status}
                locale={locale}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">
                  {t.arabicName}
                </p>
                <p className="mt-1 font-medium">
                  {profile.nameAr || "—"}
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">
                  {t.englishName}
                </p>
                <p className="mt-1 font-medium">
                  {profile.nameEn || "—"}
                </p>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <p className="text-xs text-muted-foreground">
                {t.description}
              </p>
              <p className="mt-2 text-sm leading-7">
                {profile.description || "—"}
              </p>
            </div>

            <div className="rounded-md border p-4">
              <p className="text-xs text-muted-foreground">
                {t.updatedAt}
              </p>
              <p className="mt-1 font-medium">
                {formatDateTime(profile.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={Building2} iconPosition="opposite">
              {t.companiesTitle}
            </CardTitle>
            <CardDescription>{t.companiesDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {companies.length ? (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.company}</TableHead>
                      <TableHead>{t.companyCode}</TableHead>
                      <TableHead>{t.city}</TableHead>
                      <TableHead>{t.companyStatus}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id} className="h-[62px]">
                        <TableCell className="font-medium">
                          <Link
                            href={`/system/companies/${company.id}`}
                          >
                            {company.displayName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {company.companyCode || "—"}
                        </TableCell>
                        <TableCell>{company.city || "—"}</TableCell>
                        <TableCell>
                          {company.status || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t.noCompanies}
              </p>
            )}

            <p className="mt-3 text-xs text-muted-foreground">
              {formatInteger(companiesCount)} {t.companies}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
