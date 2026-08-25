"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleAlert,
  Clock3,
  CreditCard,
  FileText,
  Loader2,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Warehouse,
} from "lucide-react";
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
import {
  SUBSCRIPTION_ENDPOINTS,
  type AppLocale,
  type BillingData,
  type SubscriptionAccess,
  type SubscriptionPlan,
  type SubscriptionSnapshot,
  asRecord,
  formatDate,
  formatInteger,
  formatMoney,
  getStoredLocale,
  normalizeAccess,
  normalizeBilling,
  normalizePlan,
  normalizeSubscription,
  subscriptionRequest,
  text,
  unwrapData,
} from "@/lib/company-subscription";
type Gateway = "MOYASAR" | "TAMARA" | "TABBY";
type BillingCycle = "MONTHLY" | "YEARLY";
const copy = {
  ar: {
    badge: "اشتراك الشركة",
    title: "الاشتراك والفوترة",
    subtitle:
      "إدارة باقة Mhamcloud، التجديد، تغيير الخطة، ومتابعة فواتير ومدفوعات اشتراك المنصة.",
    refresh: "تحديث",
    back: "لوحة الشركة",
    currentPlan: "الباقة الحالية",
    status: "حالة الاشتراك",
    remaining: "الأيام المتبقية",
    billingCycle: "دورة الفوترة",
    monthly: "شهري",
    yearly: "سنوي",
    grace: "فترة سماح",
    graceRemaining: "أيام السماح المتبقية",
    startsAt: "تاريخ البداية",
    expiresAt: "تاريخ الانتهاء",
    invoice: "الفاتورة",
    receipt: "الإيصال",
    notLinked: "غير مرتبط",
    access: "وصول مساحة الشركة",
    fullAccess: "كامل",
    billingOnly: "الفوترة فقط",
    denied: "مرفوض",
    renewTitle: "تجديد الاشتراك",
    renewDesc:
      "يُنشئ التجديد اشتراكًا جديدًا بانتظار الدفع دون إغلاق الاشتراك الحالي قبل تأكيد الدفع.",
    gateway: "بوابة الدفع",
    renew: "إنشاء طلب التجديد",
    changing: "جارٍ الإنشاء...",
    plansTitle: "الباقات المتاحة",
    plansDesc:
      "اختر الباقة والدورة المناسبة. يحدد السيرفر ما إذا كان التغيير ترقية أو تخفيضًا.",
    current: "الحالية",
    choose: "اختيار الباقة",
    users: "مستخدم",
    branches: "فرع",
    warehouses: "مستودع",
    pos: "نقطة بيع",
    month: "شهر",
    year: "سنة",
    paymentsTitle: "مدفوعات الاشتراك",
    paymentsDesc: "سجل محاولات الدفع الخاصة باشتراك المنصة لهذه الشركة فقط.",
    documentsTitle: "فواتير وإيصالات الاشتراك",
    documentsDesc: "مستندات فوترة المنصة المرتبطة باشتراك الشركة.",
    reference: "المرجع",
    amount: "المبلغ",
    paymentGateway: "البوابة",
    date: "التاريخ",
    document: "المستند",
    type: "النوع",
    noPayments: "لا توجد مدفوعات اشتراك حتى الآن.",
    noDocuments: "لا توجد فواتير أو إيصالات اشتراك حتى الآن.",
    noPlan: "لا توجد باقة فعالة حاليًا.",
    pendingTitle: "يوجد طلب اشتراك بانتظار الدفع",
    pendingDesc:
      "لن نعتبر العملية ناجحة حتى يؤكد الباكند حالة الدفع من بوابة الدفع.",
    graceTitle: "الاشتراك داخل فترة السماح",
    graceDesc:
      "مساحة الشركة ما زالت متاحة، لكن يجب إكمال التجديد قبل نهاية فترة السماح.",
    billingOnlyTitle: "الوصول مقيد بالفوترة",
    billingOnlyDesc:
      "يمكن إدارة الاشتراك والدفع، بينما تبقى الوحدات التشغيلية مقيدة حسب سياسة الباكند.",
    errorTitle: "تعذر تحميل الاشتراك",
    retry: "إعادة المحاولة",
    loaded: "تم تحديث بيانات الاشتراك.",
    requestCreated: "تم إنشاء طلب الاشتراك والدفع.",
    paymentPending:
      "تم إنشاء محاولة الدفع. حالة النجاح النهائية ستأتي فقط من تأكيد الباكند.",
    changeCreated: "تم إنشاء طلب تغيير الباقة.",
    samePlan: "هذه هي الباقة الحالية.",
    requestOnly:
      "هذه العملية تنشئ طلب اشتراك ومحاولة دفع فقط، ولا تعتبر عملية الدفع ناجحة من المتصفح.",
    pendingAction:
      "يوجد طلب اشتراك آخر بانتظار الدفع أو التحقق.",
    renewUnavailable:
      "التجديد غير متاح في حالة الاشتراك الحالية.",
    changeUnavailable:
      "تغيير الباقة غير متاح في حالة الاشتراك الحالية.",
    deniedTitle: "الوصول إلى الاشتراك مقيد",
    deniedDesc:
      "حالة الاشتراك الحالية لا تسمح بالوصول إلى مساحة العمل، وتبقى صلاحيات الفوترة حسب سياسة الباكند.",
    expiredTitle: "انتهى الاشتراك",
    expiredDesc:
      "انتهت مدة الاشتراك. استخدم الإجراءات التي يسمح بها الباكند لإنشاء طلب تجديد.",
    suspendedTitle: "الاشتراك معلق",
    suspendedDesc:
      "الاشتراك معلق، والإجراءات المتاحة للفوترة يحددها الباكند.",
    cancelledTitle: "الاشتراك ملغي",
    cancelledDesc:
      "الاشتراك ملغي. راجع الباقات والإجراءات التي يسمح بها الباكند.",
    sar: "ريال سعودي",
    pendingPayment: "بانتظار الدفع",
    processing: "قيد المعالجة",
    paid: "مدفوع",
    failed: "فشل",
    cancelled: "ملغي",
    active: "نشط",
    trial: "تجريبي",
    expired: "منتهي",
    suspended: "معلق",
  },
  en: {
    badge: "Company subscription",
    title: "Subscription & Billing",
    subtitle:
      "Manage the Mhamcloud plan, renewal, plan changes, and platform subscription billing.",
    refresh: "Refresh",
    back: "Company dashboard",
    currentPlan: "Current plan",
    status: "Subscription status",
    remaining: "Days remaining",
    billingCycle: "Billing cycle",
    monthly: "Monthly",
    yearly: "Yearly",
    grace: "Grace period",
    graceRemaining: "Grace days remaining",
    startsAt: "Starts at",
    expiresAt: "Expires at",
    invoice: "Invoice",
    receipt: "Receipt",
    notLinked: "Not linked",
    access: "Workspace access",
    fullAccess: "Full",
    billingOnly: "Billing only",
    denied: "Denied",
    renewTitle: "Renew subscription",
    renewDesc:
      "Renewal creates a new pending subscription without closing the current subscription before payment is confirmed.",
    gateway: "Payment gateway",
    renew: "Create renewal request",
    changing: "Creating...",
    plansTitle: "Available plans",
    plansDesc:
      "Choose a plan and cycle. The server determines whether the change is an upgrade or downgrade.",
    current: "Current",
    choose: "Choose plan",
    users: "users",
    branches: "branches",
    warehouses: "warehouses",
    pos: "POS",
    month: "month",
    year: "year",
    paymentsTitle: "Subscription payments",
    paymentsDesc: "Platform subscription payment attempts for this company only.",
    documentsTitle: "Subscription invoices & receipts",
    documentsDesc: "Platform billing documents related to the company subscription.",
    reference: "Reference",
    amount: "Amount",
    paymentGateway: "Gateway",
    date: "Date",
    document: "Document",
    type: "Type",
    noPayments: "No subscription payments yet.",
    noDocuments: "No subscription invoices or receipts yet.",
    noPlan: "There is no active plan.",
    pendingTitle: "A subscription request is awaiting payment",
    pendingDesc:
      "The operation is not considered successful until backend/provider verification confirms payment.",
    graceTitle: "Subscription is in grace period",
    graceDesc:
      "The workspace is still available, but renewal should be completed before grace ends.",
    billingOnlyTitle: "Workspace is limited to billing",
    billingOnlyDesc:
      "Subscription and payment remain available while operational modules follow backend access policy.",
    errorTitle: "Could not load subscription",
    retry: "Try again",
    loaded: "Subscription data refreshed.",
    requestCreated: "Subscription and payment request created.",
    paymentPending:
      "Payment attempt created. Final success is only confirmed by the backend.",
    changeCreated: "Plan change request created.",
    samePlan: "This is the current plan.",
    requestOnly:
      "This action creates a subscription and payment request only. Browser return is never treated as payment success.",
    pendingAction:
      "Another subscription request is already awaiting payment or verification.",
    renewUnavailable:
      "Renewal is not available for the current subscription state.",
    changeUnavailable:
      "Plan changes are not available for the current subscription state.",
    deniedTitle: "Subscription access is restricted",
    deniedDesc:
      "The current subscription state does not allow workspace access. Billing permissions remain controlled by the backend.",
    expiredTitle: "Subscription expired",
    expiredDesc:
      "The subscription has expired. Use only the renewal actions currently allowed by the backend.",
    suspendedTitle: "Subscription suspended",
    suspendedDesc:
      "The subscription is suspended. Available billing actions are controlled by the backend.",
    cancelledTitle: "Subscription cancelled",
    cancelledDesc:
      "The subscription is cancelled. Review the plans and actions currently allowed by the backend.",
    sar: "Saudi Riyal",
    pendingPayment: "Pending payment",
    processing: "Processing",
    paid: "Paid",
    failed: "Failed",
    cancelled: "Cancelled",
    active: "Active",
    trial: "Trial",
    expired: "Expired",
    suspended: "Suspended",
  },
} as const;
function statusLabel(value: string, locale: AppLocale) {
  const t = copy[locale];
  switch (value.toUpperCase()) {
    case "ACTIVE":
      return t.active;
    case "TRIAL":
      return t.trial;
    case "PENDING_PAYMENT":
    case "PENDING":
      return t.pendingPayment;
    case "PROCESSING":
      return t.processing;
    case "PAID":
      return t.paid;
    case "FAILED":
      return t.failed;
    case "CANCELLED":
      return t.cancelled;
    case "EXPIRED":
      return t.expired;
    case "SUSPENDED":
      return t.suspended;
    default:
      return value || "—";
  }
}
function statusClass(value: string) {
  const normalized = value.toUpperCase();
  if (["ACTIVE", "PAID"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["TRIAL", "PENDING", "PENDING_PAYMENT", "PROCESSING"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["FAILED", "CANCELLED", "EXPIRED", "SUSPENDED"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-border bg-muted/30 text-muted-foreground";
}
function Money({ value, label }: { value: unknown; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span dir="ltr" lang="en" className="font-semibold tabular-nums">
        {formatMoney(value)}
      </span>
      <Image
        src="/currency/sar.svg"
        alt={label}
        width={15}
        height={15}
        className="h-[15px] w-[15px] shrink-0"
      />
    </span>
  );
}
function AccessLabel({
  access,
  locale,
}: {
  access: SubscriptionAccess;
  locale: AppLocale;
}) {
  const t = copy[locale];
  if (access.access === "FULL") return t.fullAccess;
  if (access.access === "BILLING_ONLY") return t.billingOnly;
  return t.denied;
}
function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-5 w-full max-w-3xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-lg" />
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}
export default function CompanySubscriptionPage() {
  const [locale, setLocale] = React.useState<AppLocale>("ar");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState("");
  const [company, setCompany] = React.useState<Record<string, unknown>>({});
  const [access, setAccess] = React.useState<SubscriptionAccess | null>(null);
  const [effective, setEffective] = React.useState<SubscriptionSnapshot | null>(
    null,
  );
  const [latest, setLatest] = React.useState<SubscriptionSnapshot | null>(null);
  const [pending, setPending] = React.useState<SubscriptionSnapshot | null>(null);
  const [plans, setPlans] = React.useState<SubscriptionPlan[]>([]);
  const [billing, setBilling] = React.useState<BillingData>({
    payments: [],
    documents: [],
    invoices: [],
    receipts: [],
  });
  const [gateway, setGateway] = React.useState<Gateway>("MOYASAR");
  const [billingCycle, setBillingCycle] =
    React.useState<BillingCycle>("MONTHLY");
  const t = copy[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const ArrowIcon = locale === "ar" ? ArrowLeft : ArrowRight;
  React.useEffect(() => {
    const sync = () => {
      const next = getStoredLocale();
      setLocale(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.body.dir = next === "ar" ? "rtl" : "ltr";
    };
    sync();
    window.addEventListener("primey-locale-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("primey-locale-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const loadAll = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const [detailPayload, plansPayload, billingPayload] = await Promise.all([
          subscriptionRequest<unknown>(SUBSCRIPTION_ENDPOINTS.detail),
          subscriptionRequest<unknown>(SUBSCRIPTION_ENDPOINTS.plans),
          subscriptionRequest<unknown>(SUBSCRIPTION_ENDPOINTS.billing),
        ]);
        const detail = unwrapData(detailPayload);
        const planData = unwrapData(plansPayload);
        setCompany(asRecord(detail.company));
        setAccess(normalizeAccess(detail.subscription_access || detail.access));
        setEffective(normalizeSubscription(detail.effective_subscription));
        setLatest(normalizeSubscription(detail.latest_subscription));
        setPending(
          normalizeSubscription(
            detail.pending_subscription ||
              detail.pending_change ||
              detail.pending,
          ),
        );
        setPlans(
          Array.isArray(planData.items)
            ? planData.items.map(normalizePlan)
            : [],
        );
        setBilling(normalizeBilling(billingPayload));
        const effectiveRow = normalizeSubscription(detail.effective_subscription);
        if (
          effectiveRow?.billing_cycle === "MONTHLY" ||
          effectiveRow?.billing_cycle === "YEARLY"
        ) {
          setBillingCycle(effectiveRow.billing_cycle);
        }
        if (silent) toast.success(t.loaded);
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : t.errorTitle;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.errorTitle, t.loaded],
  );
  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);
  const latestPendingPayment = React.useMemo(
    () =>
      billing.payments.find((row) =>
        ["PENDING", "PROCESSING"].includes(row.status.toUpperCase()),
      ) || null,
    [billing.payments],
  );
  const hasPending = Boolean(
    pending ||
      latest?.status === "PENDING_PAYMENT" ||
      latestPendingPayment,
  );

  const lifecycleStatus = (
    effective?.status ||
    access?.status ||
    latest?.status ||
    ""
  ).toUpperCase();

  const actionBlockedReason = hasPending
    ? t.pendingAction
    : !access?.can_manage_subscription
      ? access?.reason || t.deniedDesc
      : "";

  const renewBlockedReason =
    actionBlockedReason ||
    (!access?.can_renew ? t.renewUnavailable : "");

  const changeBlockedReason =
    actionBlockedReason ||
    (!access?.can_change_plan ? t.changeUnavailable : "");

  const lifecycleNotice =
    lifecycleStatus === "EXPIRED"
      ? {
          title: t.expiredTitle,
          description: t.expiredDesc,
        }
      : lifecycleStatus === "SUSPENDED"
        ? {
            title: t.suspendedTitle,
            description: t.suspendedDesc,
          }
        : lifecycleStatus === "CANCELLED"
          ? {
              title: t.cancelledTitle,
              description: t.cancelledDesc,
            }
          : access?.access === "DENIED"
            ? {
                title: t.deniedTitle,
                description: t.deniedDesc,
              }
            : null;
  async function createAction(
    path: string,
    payload: Record<string, unknown>,
    successMessage: string,
  ) {
    try {
      setWorking(true);
      await subscriptionRequest<unknown>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(successMessage);
      await loadAll(false);
      toast.info(t.paymentPending);
    } catch (caught) {
      const err = caught as Error & { code?: string };
      if (err.code === "PENDING_SUBSCRIPTION_CHANGE_EXISTS") {
        toast.warning(t.pendingTitle, {
          description: t.pendingDesc,
        });
      } else {
        toast.error(err.message || t.errorTitle);
      }
    } finally {
      setWorking(false);
    }
  }
  async function renew() {
    if (!access?.can_renew || working || hasPending) return;
    await createAction(
      SUBSCRIPTION_ENDPOINTS.renew,
      {
        gateway,
        billing_cycle: billingCycle,
      },
      t.requestCreated,
    );
  }
  async function changePlan(plan: SubscriptionPlan) {
    if (!access?.can_change_plan || working || hasPending) return;
    if (effective?.plan_id === plan.id) {
      toast.info(t.samePlan);
      return;
    }
    await createAction(
      SUBSCRIPTION_ENDPOINTS.changePlan,
      {
        plan_id: plan.id,
        gateway,
        billing_cycle: billingCycle,
      },
      t.changeCreated,
    );
  }
  if (loading) {
    return (
      <main
        dir={dir}
        className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
      >
        <PageSkeleton />
      </main>
    );
  }
  if (error && !access) {
    return (
      <main
        dir={dir}
        className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
      >
        <Card className="mx-auto max-w-2xl rounded-lg border-rose-200 shadow-none">
          <CardHeader className="text-center">
            <span className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-700">
              <CircleAlert className="h-6 w-6" />
            </span>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => void loadAll(true)}>
              <RefreshCw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  const planName =
    effective?.plan_name || access?.plan_name || latest?.plan_name || t.noPlan;
  const companyName =
    text(company.display_name || company.name || company.name_ar || company.name_en) ||
    "—";
  return (
    <main
      dir={dir}
      className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <Badge
              variant="outline"
              className="mb-3 rounded-full bg-background px-3 py-1 text-xs"
            >
              {t.badge}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.title}
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground sm:text-base">
              {t.subtitle}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border bg-background px-3 py-1">
                {companyName}
              </span>
              <span className="rounded-full border bg-background px-3 py-1">
                {planName}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={refreshing}
              onClick={() => void loadAll(true)}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t.refresh}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/company">
                {t.back}
                <ArrowIcon className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
        {lifecycleNotice ? (
          <Card className="gap-0 rounded-lg border-rose-200 bg-rose-50 py-0 shadow-none before:hidden after:hidden">
            <CardContent className="flex gap-3 p-4 text-rose-950">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">
                  {lifecycleNotice.title}
                </p>
                <p className="mt-1 text-sm opacity-80">
                  {lifecycleNotice.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {access?.is_in_grace ? (
          <Card className="gap-0 rounded-lg border-amber-200 bg-amber-50 py-0 shadow-none before:hidden after:hidden">
            <CardContent className="flex gap-3 p-4 text-amber-950">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.graceTitle}</p>
                <p className="mt-1 text-sm opacity-80">{t.graceDesc}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
        {access?.access === "BILLING_ONLY" ? (
          <Card className="gap-0 rounded-lg border-rose-200 bg-rose-50 py-0 shadow-none before:hidden after:hidden">
            <CardContent className="flex gap-3 p-4 text-rose-950">
              <CreditCard className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.billingOnlyTitle}</p>
                <p className="mt-1 text-sm opacity-80">
                  {t.billingOnlyDesc}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
        {hasPending ? (
          <Card className="gap-0 rounded-lg border-amber-200 bg-amber-50 py-0 shadow-none before:hidden after:hidden">
            <CardContent className="flex gap-3 p-4 text-amber-950">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.pendingTitle}</p>
                <p className="mt-1 text-sm opacity-80">{t.pendingDesc}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="gap-0 rounded-lg bg-card py-0 shadow-none before:hidden after:hidden">
            <CardContent className="flex min-h-[126px] items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">{t.currentPlan}</p>
                <p className="mt-2 text-xl font-bold">{planName}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {effective?.billing_cycle === "YEARLY" ? t.yearly : t.monthly}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.startsAt}:{" "}
                  <span
                    dir="ltr"
                    lang="en"
                    className="tabular-nums"
                  >
                    {formatDate(effective?.start_date)}
                  </span>
                </p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-full border bg-primary/5 text-primary">
                <PackageCheck className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
          <Card className="gap-0 rounded-lg bg-card py-0 shadow-none before:hidden after:hidden">
            <CardContent className="flex min-h-[126px] items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">{t.status}</p>
                <div className="mt-2">
                  <Badge
                    variant="outline"
                    className={statusClass(
                      effective?.status || access?.status || "",
                    )}
                  >
                    {statusLabel(
                      effective?.status || access?.status || "",
                      locale,
                    )}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t.expiresAt}:{" "}
                  <span dir="ltr" lang="en" className="tabular-nums">
                    {formatDate(
                      effective?.end_date || access?.expires_at,
                    )}
                  </span>
                </p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-full border bg-primary/5 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
          <Card className="gap-0 rounded-lg bg-card py-0 shadow-none before:hidden after:hidden">
            <CardContent className="flex min-h-[126px] items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  {access?.is_in_grace ? t.graceRemaining : t.remaining}
                </p>
                <p
                  dir="ltr"
                  lang="en"
                  className="mt-2 text-2xl font-bold tabular-nums"
                >
                  {formatInteger(
                    access?.is_in_grace
                      ? access.grace_days_remaining
                      : access?.days_remaining || 0,
                  )}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {access?.is_in_grace ? t.grace : t.billingCycle}
                </p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-full border bg-primary/5 text-primary">
                <Clock3 className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
          <Card className="gap-0 rounded-lg bg-card py-0 shadow-none before:hidden after:hidden">
            <CardContent className="flex min-h-[126px] items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-muted-foreground">{t.access}</p>
                <p className="mt-2 text-xl font-bold">
                  {access ? (
                    <AccessLabel access={access} locale={locale} />
                  ) : (
                    "—"
                  )}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {access?.reason || "—"}
                </p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-full border bg-primary/5 text-primary">
                <Building2 className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        </div>
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>{t.renewTitle}</CardTitle>
            <CardDescription>{t.renewDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs leading-6 text-muted-foreground">
              {t.requestOnly}
            </div>

            {renewBlockedReason ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-950">
                {renewBlockedReason}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="min-w-[180px] flex-1 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t.billingCycle}
              </p>
              <Select
                value={billingCycle}
                onValueChange={(value) =>
                  setBillingCycle(value as BillingCycle)
                }
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">{t.monthly}</SelectItem>
                  <SelectItem value="YEARLY">{t.yearly}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px] flex-1 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t.gateway}
              </p>
              <Select
                value={gateway}
                onValueChange={(value) => setGateway(value as Gateway)}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MOYASAR">Moyasar</SelectItem>
                  <SelectItem value="TAMARA">Tamara</SelectItem>
                  <SelectItem value="TABBY">Tabby</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="brand"
              className="h-9 min-w-[170px]"
              disabled={
                working ||
                hasPending ||
                !access?.can_renew
              }
              onClick={() => void renew()}
            >
              {working ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {working ? t.changing : t.renew}
            </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>{t.plansTitle}</CardTitle>
            <CardDescription>{t.plansDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {changeBlockedReason ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-950">
                {changeBlockedReason}
              </div>
            ) : null}

            {plans.length ? (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => {
                  const isCurrent = effective?.plan_id === plan.id;
                  const price =
                    billingCycle === "YEARLY"
                      ? plan.yearly_price
                      : plan.monthly_price;
                  return (
                    <Card
                      key={plan.id}
                      className="gap-0 rounded-lg bg-card py-0 shadow-none before:hidden after:hidden"
                    >
                      <CardContent className="flex h-full flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold">{plan.name}</p>
                              {isCurrent ? (
                                <Badge variant="success">
                                  <Check className="h-3 w-3" />
                                  {t.current}
                                </Badge>
                              ) : null}
                            </div>
                            {plan.description ? (
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {plan.description}
                              </p>
                            ) : null}
                          </div>
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-primary/5 text-primary">
                            <Sparkles className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="mt-5 flex items-end gap-2">
                          <span className="text-2xl font-bold">
                            <Money value={price} label={t.sar} />
                          </span>
                          <span className="pb-0.5 text-xs text-muted-foreground">
                            / {billingCycle === "YEARLY" ? t.year : t.month}
                          </span>
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5 rounded-lg border bg-muted/20 px-3 py-2">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            <span dir="ltr" lang="en">
                              {formatInteger(plan.max_users)}
                            </span>{" "}
                            {t.users}
                          </span>
                          <span className="flex items-center gap-1.5 rounded-lg border bg-muted/20 px-3 py-2">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            <span dir="ltr" lang="en">
                              {formatInteger(plan.max_branches)}
                            </span>{" "}
                            {t.branches}
                          </span>
                          <span className="flex items-center gap-1.5 rounded-lg border bg-muted/20 px-3 py-2">
                            <Warehouse className="h-3.5 w-3.5 text-primary" />
                            <span dir="ltr" lang="en">
                              {formatInteger(plan.max_warehouses)}
                            </span>{" "}
                            {t.warehouses}
                          </span>
                          <span className="flex items-center gap-1.5 rounded-lg border bg-muted/20 px-3 py-2">
                            <CreditCard className="h-3.5 w-3.5 text-primary" />
                            <span dir="ltr" lang="en">
                              {formatInteger(plan.max_pos)}
                            </span>{" "}
                            {t.pos}
                          </span>
                        </div>
                        {plan.features.length ? (
                          <div className="mt-4 space-y-2">
                            {plan.features.slice(0, 5).map((feature, index) => (
                              <p
                                key={`${plan.id}-${index}`}
                                className="flex items-center gap-2 text-xs text-muted-foreground"
                              >
                                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                {text(feature)}
                              </p>
                            ))}
                          </div>
                        ) : null}
                        <Button
                          variant={isCurrent ? "outline" : "brand"}
                          className="mt-5 w-full"
                          disabled={
                            isCurrent ||
                            working ||
                            hasPending ||
                            !access?.can_change_plan
                          }
                          onClick={() => void changePlan(plan)}
                        >
                          {working ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <PackageCheck className="h-4 w-4" />
                          )}
                          {isCurrent ? t.current : t.choose}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                {t.noPlan}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>{t.paymentsTitle}</CardTitle>
            <CardDescription>{t.paymentsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>{t.reference}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead>{t.paymentGateway}</TableHead>
                    <TableHead>{t.amount}</TableHead>
                    <TableHead>{t.invoice}</TableHead>
                    <TableHead>{t.receipt}</TableHead>
                    <TableHead>{t.date}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billing.payments.length ? (
                    billing.payments.map((payment) => (
                      <TableRow key={String(payment.id)}>
                        <TableCell
                          dir="ltr"
                          lang="en"
                          className="font-medium tabular-nums"
                        >
                          {payment.payment_reference}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusClass(payment.status)}
                          >
                            {statusLabel(payment.status, locale)}
                          </Badge>
                        </TableCell>
                        <TableCell>{payment.gateway || "—"}</TableCell>
                        <TableCell>
                          <Money value={payment.amount} label={t.sar} />
                        </TableCell>
                        <TableCell
                          dir="ltr"
                          lang="en"
                          className="tabular-nums"
                        >
                          {payment.invoice?.document_number ||
                            payment.invoice_id ||
                            t.notLinked}
                        </TableCell>
                        <TableCell
                          dir="ltr"
                          lang="en"
                          className="tabular-nums"
                        >
                          {payment.receipt?.document_number ||
                            payment.receipt_id ||
                            t.notLinked}
                        </TableCell>
                        <TableCell dir="ltr" lang="en" className="tabular-nums">
                          {formatDate(
                            payment.paid_at ||
                              payment.processing_at ||
                              payment.initiated_at ||
                              payment.created_at,
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-36 text-center text-muted-foreground"
                      >
                        {t.noPayments}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>{t.documentsTitle}</CardTitle>
            <CardDescription>{t.documentsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>{t.document}</TableHead>
                    <TableHead>{t.type}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead>{t.amount}</TableHead>
                    <TableHead>{t.date}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billing.documents.length ? (
                    billing.documents.map((document) => (
                      <TableRow key={String(document.id)}>
                        <TableCell
                          dir="ltr"
                          lang="en"
                          className="font-medium tabular-nums"
                        >
                          <span className="inline-flex items-center gap-2">
                            {document.document_type
                              .toUpperCase()
                              .includes("RECEIPT") ? (
                              <ReceiptText className="h-4 w-4 text-primary" />
                            ) : (
                              <FileText className="h-4 w-4 text-primary" />
                            )}
                            {document.document_number}
                          </span>
                        </TableCell>
                        <TableCell>{document.document_type}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusClass(document.status)}
                          >
                            {statusLabel(document.status, locale)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Money value={document.total_amount} label={t.sar} />
                        </TableCell>
                        <TableCell dir="ltr" lang="en" className="tabular-nums">
                          {formatDate(document.issued_at || document.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-36 text-center text-muted-foreground"
                      >
                        {t.noDocuments}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
