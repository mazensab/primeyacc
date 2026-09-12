"use client";

import * as React from "react";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { SubscriptionStatusTable } from "./components/subscription-status-table";
import { SystemFinancialCard } from "./components/system-financial-card";
import { SystemRecentCard } from "./components/system-recent-card";
import { SystemRevenueChart } from "./components/system-revenue-chart";
import { TopSubscriptionPlans } from "./components/top-subscription-plans";

type Locale = "ar" | "en";
type ApiRecord = Record<string, any>;

type Analytics = {
  period: {
    date_from: string;
    date_to: string;
    days: number;
    previous_date_from: string;
    previous_date_to: string;
  };
  financial_cards: Record<
    "net_collected" | "gross_paid" | "successful_refunds" | "subscription_tax",
    {
      current: string;
      previous: string;
      delta: string;
      change_percent: number | null;
      direction: "up" | "down" | "stable";
    }
  >;
  chart: {
    series: Array<{
      date: string;
      gross_paid: string;
      net_collected: string;
      subscription_value: string;
    }>;
    totals: { net_collected: string; subscription_value: string };
    default_series: "net_collected" | "subscription_value";
  };
  top_plans: Array<{
    plan_id: number;
    name: string;
    code: string;
    subscriptions: number;
    subscription_value: string;
  }>;
  subscription_events: Record<
    "new" | "renewals" | "activated" | "expired",
    {
      current: number;
      previous: number;
      delta: number;
      change_percent: number | null;
      direction: "up" | "down" | "stable";
    }
  >;
};

const translations = {
  ar: {
    title: "لوحة تحكم النظام",
    subtitle: "إدارة الشركات والاشتراكات والمستخدمين وإيرادات المنصة من واجهة BundUI الموحدة.",
    refresh: "تحديث",
    revenueChart: "مخطط الإيرادات",
    selectedPeriod: "الفترة المحددة",
    netCollected: "صافي التحصيل",
    subscriptionValue: "قيمة الاشتراكات",
    grossPaid: "إجمالي التحصيل",
    refunds: "الاستردادات الناجحة",
    subscriptionTax: "ضريبة الاشتراكات",
    compare: "مقارنة بالفترة السابقة",
    noBaseline: "لا توجد قيمة أساس للفترة السابقة",
    topPlans: "أفضل باقات الاشتراك",
    topPlansDesc: "الباقات الأعلى حسب الاشتراكات خلال الفترة المحددة",
    subscriptions: "اشتراكات",
    viewAll: "عرض الكل",
    noData: "لا توجد بيانات للفترة المحددة",
    statusTitle: "متابعة حالة الاشتراكات",
    statusDesc: "مقارنة حركة الاشتراكات مع الفترة السابقة وعرض أحدث السجلات",
    newSubscriptions: "اشتراكات جديدة",
    renewals: "تجديدات",
    activated: "تم تفعيلها",
    expired: "منتهية",
    filterSubscriptions: "ابحث باسم الشركة...",
    columns: "الأعمدة",
    id: "المعرف",
    company: "الشركة",
    plan: "الباقة",
    cycle: "الدورة",
    amount: "المبلغ",
    status: "الحالة",
    previous: "السابق",
    next: "التالي",
    of: "من",
    export: "تصدير",
    excel: "Excel / CSV",
    print: "طباعة",
    noResults: "لا توجد نتائج.",
    latestCompanies: "أحدث الشركات",
    latestUsers: "أحدث المستخدمين",
    expiredLatest: "آخر الاشتراكات المنتهية",
    expiringLatest: "الاشتراكات القريبة من الانتهاء",
    latestPayments: "أحدث مدفوعات المنصة",
    latestSubscriptions: "أحدث الاشتراكات",
    latestDesc: "بيانات تشغيلية مباشرة من النظام",
    operational: "المؤشرات التشغيلية",
    exp7: "تنتهي خلال 7 أيام",
    exp30: "تنتهي خلال 30 يومًا",
    grace: "داخل فترة السماح",
    pendingPayments: "مدفوعات معلقة",
    failedPayments: "مدفوعات فاشلة",
    reconciliation: "فروقات التسوية",
    openReceivables: "ذمم مفتوحة",
    errorTitle: "تعذر تحميل لوحة النظام",
    retry: "إعادة المحاولة",
    sar: "ريال سعودي",
  },
  en: {
    title: "System Dashboard",
    subtitle: "Manage companies, subscriptions, users, and platform revenue in the unified BundUI experience.",
    refresh: "Refresh",
    revenueChart: "Revenue Chart",
    selectedPeriod: "Selected period",
    netCollected: "Net collected",
    subscriptionValue: "Subscription value",
    grossPaid: "Gross collected",
    refunds: "Successful refunds",
    subscriptionTax: "Subscription tax",
    compare: "Compare with previous period",
    noBaseline: "No previous-period baseline",
    topPlans: "Top Subscription Plans",
    topPlansDesc: "Highest subscription plans in the selected period",
    subscriptions: "subscriptions",
    viewAll: "View all",
    noData: "No data for the selected period",
    statusTitle: "Track Subscription Status",
    statusDesc: "Compare subscription activity with the previous period and review latest records",
    newSubscriptions: "New subscriptions",
    renewals: "Renewals",
    activated: "Activated",
    expired: "Expired",
    filterSubscriptions: "Filter by company...",
    columns: "Columns",
    id: "ID",
    company: "Company",
    plan: "Plan",
    cycle: "Cycle",
    amount: "Amount",
    status: "Status",
    previous: "Previous",
    next: "Next",
    of: "of",
    export: "Export",
    excel: "Excel / CSV",
    print: "Print",
    noResults: "No results.",
    latestCompanies: "Latest companies",
    latestUsers: "Latest users",
    expiredLatest: "Recently expired subscriptions",
    expiringLatest: "Subscriptions expiring soon",
    latestPayments: "Latest platform payments",
    latestSubscriptions: "Latest subscriptions",
    latestDesc: "Live operational data from the system",
    operational: "Operational signals",
    exp7: "Expiring in 7 days",
    exp30: "Expiring in 30 days",
    grace: "Active grace",
    pendingPayments: "Pending payments",
    failedPayments: "Failed payments",
    reconciliation: "Reconciliation discrepancies",
    openReceivables: "Open receivables",
    errorTitle: "Could not load system dashboard",
    retry: "Try again",
    sar: "Saudi riyal",
  },
} as const;

function initialRange(): DateRange {
  const now = new Date();
  return { from: startOfDay(subDays(now, 27)), to: endOfDay(now) };
}
function readLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("Mhamcloud-locale") === "en" ? "en" : "ar";
}
function apiBase() {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  return raw.endsWith("/api") ? raw.slice(0, -4) : raw;
}
async function fetchJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    credentials: "include",
    cache: "no-store",
    signal,
    headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.message || payload?.detail || `HTTP ${response.status}`);
  }
  return payload as T;
}
function periodQuery(range: DateRange | undefined) {
  const params = new URLSearchParams({ limit: "12" });
  if (range?.from) params.set("date_from", format(range.from, "yyyy-MM-dd"));
  if (range?.to) params.set("date_to", format(range.to, "yyyy-MM-dd"));
  return params.toString();
}
function integer(value: unknown) {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number.isFinite(parsed) ? parsed : 0);
}

export default function SystemDashboardPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [range, setRange] = React.useState<DateRange | undefined>(() => initialRange());
  const [overview, setOverview] = React.useState<ApiRecord | null>(null);
  const [analytics, setAnalytics] = React.useState<Analytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  React.useEffect(() => {
    const sync = () => {
      const next = readLocale();
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
      const controller = new AbortController();
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const query = periodQuery(range);
        const [overviewPayload, analyticsPayload] = await Promise.all([
          fetchJson<{ ok: boolean; data: ApiRecord }>(`/api/system/dashboard/overview/?${query}`, controller.signal),
          fetchJson<{ ok: boolean; data: Analytics }>(`/api/system/dashboard/analytics/?${query}`, controller.signal),
        ]);
        setOverview(overviewPayload.data);
        setAnalytics(analyticsPayload.data);
        if (silent) toast.success(t.refresh);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : t.errorTitle;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      return () => controller.abort();
    },
    [range, t.errorTitle, t.refresh],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading && (!overview || !analytics)) {
    return (
      <div dir={dir} className="space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between"><Skeleton className="h-9 w-72"/><Skeleton className="h-9 w-80"/></div>
        <div className="grid gap-4 xl:grid-cols-8 lg:gap-6"><Skeleton className="h-[330px] xl:col-span-4"/><Skeleton className="h-[330px] xl:col-span-4"/></div>
        <div className="grid gap-4 xl:grid-cols-3 lg:gap-6"><Skeleton className="h-[520px]"/><Skeleton className="h-[520px] xl:col-span-2"/></div>
      </div>
    );
  }

  if (error && (!overview || !analytics)) {
    return (
      <Card dir={dir}>
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <AlertTriangle className="size-9 text-destructive"/>
          <div><CardTitle>{t.errorTitle}</CardTitle><p className="text-muted-foreground mt-2 text-sm">{error}</p></div>
          <Button onClick={() => void load()}>{t.retry}</Button>
        </CardContent>
      </Card>
    );
  }

  if (!overview || !analytics) return null;

  const latest = overview.latest || {};
  const summary = overview.summary || {};
  const alerts = overview.alerts || {};
  const financial = analytics.financial_cards;

  return (
    <div dir={dir} className="space-y-4 lg:space-y-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{t.title}</h1>
          <p className="text-muted-foreground mt-1 hidden text-sm lg:block">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="grow"><CalendarDateRangePicker value={range} onChange={setRange} locale={locale}/></div>
          <Button onClick={() => void load(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="animate-spin"/> : <RefreshCw/>}
            <span className="hidden lg:inline">{t.refresh}</span>
          </Button>
        </div>
      </div>

      <div className="gap-4 lg:gap-6 space-y-4 md:grid md:grid-cols-2 lg:space-y-0 xl:grid-cols-8">
        <div className="md:col-span-4">
          <SystemRevenueChart
            data={analytics.chart.series}
            totals={analytics.chart.totals}
            defaultSeries={analytics.chart.default_series}
            labels={{
              title: t.revenueChart,
              description: `${analytics.period.date_from} — ${analytics.period.date_to}`,
              netCollected: t.netCollected,
              subscriptionValue: t.subscriptionValue,
              sar: t.sar,
              noData: t.noData,
            }}
          />
        </div>
        <div className="md:col-span-4">
          <div className="grid h-full auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
            <SystemFinancialCard title={t.netCollected} value={financial.net_collected.current} changePercent={financial.net_collected.change_percent} direction={financial.net_collected.direction} comparisonLabel={t.compare} noBaselineLabel={t.noBaseline} sarLabel={t.sar} icon={CreditCard}/>
            <SystemFinancialCard title={t.grossPaid} value={financial.gross_paid.current} changePercent={financial.gross_paid.change_percent} direction={financial.gross_paid.direction} comparisonLabel={t.compare} noBaselineLabel={t.noBaseline} sarLabel={t.sar} icon={ReceiptText}/>
            <SystemFinancialCard title={t.refunds} value={financial.successful_refunds.current} changePercent={financial.successful_refunds.change_percent} direction={financial.successful_refunds.direction} comparisonLabel={t.compare} noBaselineLabel={t.noBaseline} sarLabel={t.sar} invertSentiment icon={RefreshCw}/>
            <SystemFinancialCard title={t.subscriptionTax} value={financial.subscription_tax.current} changePercent={financial.subscription_tax.change_percent} direction={financial.subscription_tax.direction} comparisonLabel={t.compare} noBaselineLabel={t.noBaseline} sarLabel={t.sar} icon={FileText}/>
          </div>
        </div>
      </div>

      <div className="gap-4 lg:gap-6 space-y-4 lg:space-y-0 xl:grid xl:grid-cols-3">
        <div className="xl:col-span-1">
          <TopSubscriptionPlans
            rows={analytics.top_plans}
            labels={{ title:t.topPlans, description:t.topPlansDesc, subscriptions:t.subscriptions, sar:t.sar, viewAll:t.viewAll, noData:t.noData }}
          />
        </div>
        <div className="xl:col-span-2">
          <SubscriptionStatusTable
            locale={locale}
            events={analytics.subscription_events}
            rows={latest.subscriptions || []}
            labels={{
              title:t.statusTitle, description:t.statusDesc, new:t.newSubscriptions, renewals:t.renewals, activated:t.activated, expired:t.expired,
              compare:t.compare, noBaseline:t.noBaseline, filter:t.filterSubscriptions, columns:t.columns, id:t.id, company:t.company, plan:t.plan,
              cycle:t.cycle, amount:t.amount, status:t.status, previous:t.previous, next:t.next, of:t.of, subscriptions:t.subscriptions,
              export:t.export, excel:t.excel, print:t.print, noResults:t.noResults, sar:t.sar,
            }}
          />
        </div>
      </div>

      <div className="grid items-start gap-4 lg:gap-6 xl:grid-cols-3">
        <SystemRecentCard locale={locale} title={t.latestCompanies} description={t.latestDesc} rows={latest.companies || []} kind="companies" href="/system/companies/list" labels={{viewAll:t.viewAll,noData:t.noData,sar:t.sar}} badgeValue={integer(summary.companies?.total)} icon={Building2}/>
        <SystemRecentCard locale={locale} title={t.latestUsers} description={t.latestDesc} rows={latest.users || []} kind="users" href="/system/users/list" labels={{viewAll:t.viewAll,noData:t.noData,sar:t.sar}} badgeValue={integer(summary.users?.total)} icon={Users}/>
        <Card>
          <CardHeader><CardTitle icon={ShieldCheck} iconPosition="opposite">{t.operational}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              [t.exp7, alerts.subscriptions_expiring_7_days],
              [t.exp30, alerts.subscriptions_expiring_30_days],
              [t.grace, alerts.active_grace],
              [t.pendingPayments, alerts.pending_payments],
              [t.failedPayments, alerts.failed_payments],
              [t.reconciliation, alerts.reconciliation_discrepancies],
              [t.openReceivables, alerts.open_receivables],
            ].map(([label,value]) => <div key={String(label)} className="hover:bg-muted flex items-center justify-between rounded-md border px-4 py-3"><span className="text-sm">{label}</span><span className="font-display text-lg tabular-nums">{integer(value)}</span></div>)}
          </CardContent>
        </Card>
        <SystemRecentCard locale={locale} title={t.expiredLatest} description={t.latestDesc} rows={latest.expired_subscriptions || []} kind="subscriptions" href="/system/subscriptions" labels={{viewAll:t.viewAll,noData:t.noData,sar:t.sar}} icon={CalendarDays}/>
        <SystemRecentCard locale={locale} title={t.expiringLatest} description={t.latestDesc} rows={latest.expiring_subscriptions || []} kind="subscriptions" href="/system/subscriptions" labels={{viewAll:t.viewAll,noData:t.noData,sar:t.sar}} icon={Activity}/>
        <SystemRecentCard locale={locale} title={t.latestPayments} description={t.latestDesc} rows={latest.payments || []} kind="payments" href="/system/platform-payments/list" labels={{viewAll:t.viewAll,noData:t.noData,sar:t.sar}} icon={CreditCard}/>
      </div>
    </div>
  );
}
