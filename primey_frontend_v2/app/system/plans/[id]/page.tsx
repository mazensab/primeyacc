"use client";

import * as React from "react";
import { PlanManagementActions } from "@/app/system/plans/components/plan-management-actions";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  Gift,
  Layers3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TableProperties,
  Users,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  registerOutlineButtonClass,
} from "@/components/ui/data-register";
import { DataRegisterTableFrame } from "@/components/ui/data-register-table";
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
  billingCycleLabel,
  StatusBadge,
} from "@/lib/system-subscriptions";
import {
  fetchSystemPlanDetail,
  formatDate,
  formatDateTime,
  formatInteger,
  MoneyValue,
  PlanStateBadge,
  PlanVisibilityBadge,
  planFeatureLabel,
  readSystemLocale,
  type SystemLocale,
  type SystemPlanDetail,
  type SystemPlanRecentSubscription,
} from "@/lib/system-plans";

const translations = {
  ar: {
    title: "تفاصيل الباقة",
    subtitle: "بيانات الباقة وأسعارها وحدودها ومميزاتها والاشتراكات المرتبطة بها.",
    back: "العودة للخطط والأسعار",
    refresh: "تحديث",
    totalSubscriptions: "إجمالي الاشتراكات",
    activeSubscriptions: "الاشتراكات النشطة",
    trialSubscriptions: "الاشتراكات التجريبية",
    expiredSubscriptions: "الاشتراكات المنتهية",
    linkedDesc: "حسب جميع سجلات الاشتراك المرتبطة بالباقة",
    identityTitle: "بيانات الباقة",
    identityDesc: "الاسم والكود والمعرف والحالة والظهور والترتيب.",
    pricingTitle: "الأسعار",
    pricingDesc: "السعر الشهري والسنوي للباقة الحالية.",
    limitsTitle: "الحدود التشغيلية",
    limitsDesc: "الحدود القصوى المعتمدة على مستوى الباقة.",
    featuresTitle: "مميزات الباقة",
    featuresDesc: "مجموعات المميزات المسجلة في بيانات الباقة.",
    historyTitle: "آخر الاشتراكات المرتبطة",
    historyDesc: "آخر اشتراكات الشركات المرتبطة بهذه الباقة، ويمكن فتح كل اشتراك مباشرة.",
    name: "اسم الباقة",
    code: "الكود",
    slug: "معرف الرابط",
    status: "الحالة",
    visibility: "الظهور",
    sortOrder: "ترتيب الظهور",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    description: "الوصف",
    monthly: "السعر الشهري",
    yearly: "السعر السنوي",
    users: "المستخدمون",
    branches: "الفروع",
    warehouses: "المستودعات",
    pos: "نقاط البيع",
    company: "الشركة",
    cycle: "الدورة",
    amount: "الإجمالي",
    start: "البداية",
    end: "النهاية",
    noFeatures: "لا توجد مميزات مسجلة لهذه الباقة.",
    noSubscriptions: "لا توجد اشتراكات مرتبطة بهذه الباقة.",
    error: "تعذر تحميل تفاصيل الباقة",
    retry: "إعادة المحاولة",
    refreshed: "تم تحديث تفاصيل الباقة.",
  },
  en: {
    title: "Plan details",
    subtitle: "Plan data, pricing, limits, features, and linked subscriptions.",
    back: "Back to plans & pricing",
    refresh: "Refresh",
    totalSubscriptions: "Total subscriptions",
    activeSubscriptions: "Active subscriptions",
    trialSubscriptions: "Trial subscriptions",
    expiredSubscriptions: "Expired subscriptions",
    linkedDesc: "Across all subscription records linked to this plan",
    identityTitle: "Plan information",
    identityDesc: "Name, code, slug, status, visibility, and display order.",
    pricingTitle: "Pricing",
    pricingDesc: "Current monthly and yearly plan pricing.",
    limitsTitle: "Operating limits",
    limitsDesc: "Maximum limits configured for this plan.",
    featuresTitle: "Plan features",
    featuresDesc: "Feature groups stored on the plan.",
    historyTitle: "Recent linked subscriptions",
    historyDesc: "Recent company subscriptions linked to this plan; click any row to open it.",
    name: "Plan name",
    code: "Code",
    slug: "Slug",
    status: "Status",
    visibility: "Visibility",
    sortOrder: "Display order",
    createdAt: "Created at",
    updatedAt: "Updated at",
    description: "Description",
    monthly: "Monthly price",
    yearly: "Yearly price",
    users: "Users",
    branches: "Branches",
    warehouses: "Warehouses",
    pos: "POS",
    company: "Company",
    cycle: "Cycle",
    amount: "Total",
    start: "Start",
    end: "End",
    noFeatures: "No features are stored for this plan.",
    noSubscriptions: "No subscriptions are linked to this plan.",
    error: "Could not load plan details",
    retry: "Try again",
    refreshed: "Plan details refreshed.",
  },
} as const;

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 rounded-md border px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm font-medium">{value}</div>
    </div>
  );
}

export default function SystemPlanDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [detail, setDetail] = React.useState<SystemPlanDetail | null>(null);
  const [recent, setRecent] = React.useState<SystemPlanRecentSubscription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  React.useEffect(() => {
    const sync = () => {
      const next = readSystemLocale();
      setLocale(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.body.dir = next === "ar" ? "rtl" : "ltr";
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("Mhamcloud-locale-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("Mhamcloud-locale-changed", sync);
    };
  }, []);

  const load = React.useCallback(
    async (silent = false) => {
      if (!id) return;
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const result = await fetchSystemPlanDetail(id);
        setDetail(result.plan);
        setRecent(result.recentSubscriptions);
        if (silent) toast.success(t.refreshed);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : t.error;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, t.error, t.refreshed],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <Card dir={dir}>
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <Activity className="size-9 text-destructive" />
          <CardTitle>{t.error}</CardTitle>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => void load()}>{t.retry}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div dir={dir} className="space-y-4 lg:space-y-6">
      <header className="flex flex-row items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{t.title}</h1>
            <PlanStateBadge active={detail.active} locale={locale} />
          </div>
          <p className="mt-1 hidden text-sm text-muted-foreground lg:block">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" className={registerOutlineButtonClass} asChild>
            <Link href="/system/plans">
              <BackIcon />
              <span className="hidden lg:inline">{t.back}</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className={registerOutlineButtonClass}
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            <span className="hidden lg:inline">{t.refresh}</span>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
        <SystemMetricCard
          title={t.totalSubscriptions}
          value={detail.stats.subscriptionsTotal}
          description={t.linkedDesc}
          icon={Gift}
        />
        <SystemMetricCard
          title={t.activeSubscriptions}
          value={detail.stats.activeSubscriptions}
          description={t.linkedDesc}
          icon={Activity}
        />
        <SystemMetricCard
          title={t.trialSubscriptions}
          value={detail.stats.trialSubscriptions}
          description={t.linkedDesc}
          icon={ShieldCheck}
        />
        <SystemMetricCard
          title={t.expiredSubscriptions}
          value={detail.stats.expiredSubscriptions}
          description={t.linkedDesc}
          icon={Activity}
        />
      </div>

      <PlanManagementActions
        id={id}
        active={detail.active}
        isPublic={detail.public}
        locale={locale}
        onChanged={() => void load()}
      />

      <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={Gift}>{t.identityTitle}</CardTitle>
            <CardDescription>{t.identityDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label={t.name} value={detail.name} />
            <InfoRow label={t.code} value={<span dir="ltr" lang="en">{detail.code}</span>} />
            <InfoRow label={t.slug} value={<span dir="ltr" lang="en">{detail.slug}</span>} />
            <InfoRow label={t.status} value={<PlanStateBadge active={detail.active} locale={locale} />} />
            <InfoRow label={t.visibility} value={<PlanVisibilityBadge isPublic={detail.public} locale={locale} />} />
            <InfoRow label={t.sortOrder} value={<span dir="ltr" lang="en" className="tabular-nums">{formatInteger(detail.sortOrder)}</span>} />
            <InfoRow label={t.createdAt} value={<span dir="ltr" lang="en" className="tabular-nums">{formatDateTime(detail.createdAt)}</span>} />
            <InfoRow label={t.updatedAt} value={<span dir="ltr" lang="en" className="tabular-nums">{formatDateTime(detail.updatedAt)}</span>} />
            {detail.description ? <InfoRow label={t.description} value={detail.description} /> : null}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle icon={Layers3}>{t.pricingTitle}</CardTitle>
              <CardDescription>{t.pricingDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">{t.monthly}</p>
                <div className="mt-2 text-xl"><MoneyValue amount={detail.monthlyPrice} /></div>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">{t.yearly}</p>
                <div className="mt-2 text-xl"><MoneyValue amount={detail.yearlyPrice} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={Warehouse}>{t.limitsTitle}</CardTitle>
              <CardDescription>{t.limitsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [t.users, detail.maxUsers],
                [t.branches, detail.maxBranches],
                [t.warehouses, detail.maxWarehouses],
                [t.pos, detail.maxPos],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-md border p-4 text-center">
                  <p className="text-xs text-muted-foreground">{String(label)}</p>
                  <p dir="ltr" lang="en" className="mt-2 text-xl font-semibold tabular-nums">
                    {formatInteger(value)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={Users}>{t.featuresTitle}</CardTitle>
          <CardDescription>{t.featuresDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.features.length ? (
            <div className="flex flex-wrap gap-2">
              {detail.features.map((feature) => (
                <span
                  key={feature}
                  dir="ltr"
                  lang="en"
                  className="rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
                >
                  {planFeatureLabel(feature, locale)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.noFeatures}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle icon={TableProperties}>{t.historyTitle}</CardTitle>
          <CardDescription>{t.historyDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataRegisterTableFrame>
            <Table className="min-w-[980px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[245px] px-4">{t.company}</TableHead>
                  <TableHead className="w-[130px] px-4">{t.status}</TableHead>
                  <TableHead className="w-[120px] px-4">{t.cycle}</TableHead>
                  <TableHead className="w-[140px] px-4">{t.amount}</TableHead>
                  <TableHead className="w-[130px] px-4">{t.start}</TableHead>
                  <TableHead className="w-[130px] px-4">{t.end}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.length ? (
                  recent.map((row) => (
                    <TableRow
                      key={row.id}
                      href={row.id ? `/system/subscriptions/${row.id}` : undefined}
                      aria-label={`${t.historyTitle}: ${row.companyName}`}
                    >
                      <TableCell className="px-4">
                        <div className="min-w-0">
                          <span className="block truncate font-medium">{row.companyName}</span>
                          <span className="block truncate text-xs text-muted-foreground">{row.companyCode}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4"><StatusBadge value={row.status} locale={locale} /></TableCell>
                      <TableCell className="px-4 text-muted-foreground">{billingCycleLabel(row.billingCycle, locale)}</TableCell>
                      <TableCell className="px-4"><MoneyValue amount={row.totalAmount} /></TableCell>
                      <TableCell className="px-4"><span dir="ltr" lang="en" className="tabular-nums">{formatDate(row.startDate)}</span></TableCell>
                      <TableCell className="px-4"><span dir="ltr" lang="en" className="tabular-nums">{formatDate(row.endDate)}</span></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      {t.noSubscriptions}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DataRegisterTableFrame>
        </CardContent>
      </Card>
    </div>
  );
}
