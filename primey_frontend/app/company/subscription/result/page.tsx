"use client";
import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
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
  SUBSCRIPTION_ENDPOINTS,
  type AppLocale,
  getStoredLocale,
  normalizeBilling,
  normalizeSubscription,
  subscriptionRequest,
  unwrapData,
} from "@/lib/company-subscription";
const copy = {
  ar: {
    checking: "جارٍ التحقق من حالة الدفع...",
    paidTitle: "تم تأكيد الدفع",
    paidDesc:
      "أكد الباكند الدفع وأصبحت حالة العملية مدفوعة. يمكنك العودة إلى صفحة الاشتراك.",
    pendingTitle: "الدفع ما زال قيد التحقق",
    pendingDesc:
      "العودة من بوابة الدفع ليست دليل نجاح. سنعرض النجاح فقط بعد أن يؤكد الباكند حالة الدفع.",
    failedTitle: "لم يكتمل الدفع",
    failedDesc: "أكد الباكند أن آخر محاولة دفع فشلت أو ألغيت.",
    unknownTitle: "تعذر تحديد نتيجة الدفع",
    unknownDesc: "أعد التحقق أو افتح صفحة الاشتراك لمراجعة السجل.",
    subscription: "إدارة الاشتراك",
    verifiedByBackend: "تم التحقق من الحالة من سجلات فوترة الشركة",
    retry: "إعادة التحقق",
    active: "الاشتراك نشط",
    paymentPaid: "الدفع مدفوع",
    pending: "قيد المعالجة",
    failed: "فشل / إلغاء",
  },
  en: {
    checking: "Checking payment status...",
    paidTitle: "Payment confirmed",
    paidDesc:
      "The backend confirmed the payment and the payment is recorded as paid.",
    pendingTitle: "Payment is still being verified",
    pendingDesc:
      "Returning from a gateway is not proof of success. Success is shown only after backend confirmation.",
    failedTitle: "Payment was not completed",
    failedDesc: "The backend reports that the latest payment failed or was cancelled.",
    unknownTitle: "Payment result could not be determined",
    unknownDesc: "Check again or open subscription management to review billing.",
    subscription: "Manage subscription",
    verifiedByBackend: "Status verified from company billing records",
    retry: "Check again",
    active: "Subscription active",
    paymentPaid: "Payment paid",
    pending: "Processing",
    failed: "Failed / cancelled",
  },
} as const;
export default function CompanySubscriptionResultPage() {
  const [locale, setLocale] = React.useState<AppLocale>("ar");
  const [loading, setLoading] = React.useState(true);
  const [state, setState] = React.useState<
    "paid" | "pending" | "failed" | "unknown"
  >("unknown");
  const t = copy[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const ArrowIcon = locale === "ar" ? ArrowLeft : ArrowRight;
  React.useEffect(() => {
    const sync = () => setLocale(getStoredLocale());
    sync();
    window.addEventListener("primey-locale-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("primey-locale-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const verifyState = React.useCallback(async () => {
    try {
      setLoading(true);
      const [detailPayload, billingPayload] = await Promise.all([
        subscriptionRequest<unknown>(SUBSCRIPTION_ENDPOINTS.detail),
        subscriptionRequest<unknown>(SUBSCRIPTION_ENDPOINTS.billing),
      ]);
      const detail = unwrapData(detailPayload);
      const billing = normalizeBilling(billingPayload);
      const effective = normalizeSubscription(detail.effective_subscription);
      const latest = normalizeSubscription(detail.latest_subscription);
      const latestPayment = billing.payments[0] || null;
      const paymentStatus = latestPayment?.status.toUpperCase() || "";
      if (
        paymentStatus === "PAID" &&
        effective?.status.toUpperCase() === "ACTIVE"
      ) {
        setState("paid");
        return;
      }
      if (["FAILED", "CANCELLED"].includes(paymentStatus)) {
        setState("failed");
        return;
      }
      if (
        ["PENDING", "PROCESSING"].includes(paymentStatus) ||
        latest?.status.toUpperCase() === "PENDING_PAYMENT"
      ) {
        setState("pending");
        return;
      }
      setState("unknown");
    } catch {
      setState("unknown");
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => {
    void verifyState();
  }, [verifyState]);
  if (loading) {
    return (
      <main
        dir={dir}
        className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-8"
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          {t.checking}
        </div>
      </main>
    );
  }
  const data =
    state === "paid"
      ? {
          Icon: CircleCheck,
          title: t.paidTitle,
          description: t.paidDesc,
          badge: t.paymentPaid,
          className: "border-emerald-200",
          iconClass: "bg-emerald-50 text-emerald-700",
        }
      : state === "failed"
        ? {
            Icon: XCircle,
            title: t.failedTitle,
            description: t.failedDesc,
            badge: t.failed,
            className: "border-rose-200",
            iconClass: "bg-rose-50 text-rose-700",
          }
        : state === "pending"
          ? {
              Icon: Clock3,
              title: t.pendingTitle,
              description: t.pendingDesc,
              badge: t.pending,
              className: "border-amber-200",
              iconClass: "bg-amber-50 text-amber-700",
            }
          : {
              Icon: CircleAlert,
              title: t.unknownTitle,
              description: t.unknownDesc,
              badge: t.pending,
              className: "border-border",
              iconClass: "bg-muted text-muted-foreground",
            };
  return (
    <main
      dir={dir}
      className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-8"
    >
      <Card
        className={`w-full max-w-xl rounded-lg shadow-none ${data.className}`}
      >
        <CardHeader className="items-center text-center">
          <span
            className={`mb-2 flex size-14 items-center justify-center rounded-full ${data.iconClass}`}
          >
            <data.Icon className="h-7 w-7" />
          </span>
          <Badge variant="outline">{data.badge}</Badge>
          <p className="text-xs text-muted-foreground">
            {t.verifiedByBackend}
          </p>
          <CardTitle className="mt-2 text-2xl">{data.title}</CardTitle>
          <CardDescription className="max-w-md leading-6">
            {data.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => void verifyState()}>
            <RefreshCw className="h-4 w-4" />
            {t.retry}
          </Button>
          <Button asChild variant="brand">
            <Link href="/company/subscription">
              {t.subscription}
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
