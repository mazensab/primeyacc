"use client";
import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Clock3,
  CreditCard,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  SUBSCRIPTION_ENDPOINTS,
  getStoredLocale,
  normalizeAccess,
  subscriptionRequest,
  unwrapData,
} from "@/lib/company-subscription";
type Locale = "ar" | "en";
const copy = {
  ar: {
    graceTitle: "اشتراكك داخل فترة السماح",
    graceText: "جدّد الاشتراك قبل انتهاء فترة السماح لتجنب تقييد مساحة الشركة.",
    expiringTitle: "موعد تجديد الاشتراك يقترب",
    expiringText: "راجع الاشتراك وجدده مبكرًا لضمان استمرار العمل دون انقطاع.",
    billingTitle: "يلزم إجراء على الاشتراك",
    billingText: "مساحة الشركة مقيدة حاليًا بإدارة الاشتراك والفوترة حتى معالجة الحالة.",
    deniedTitle: "تعذر الوصول إلى الاشتراك",
    deniedText: "لا تتوفر شركة فعالة لإدارة الاشتراك الحالي.",
    days: "أيام متبقية",
    graceDays: "أيام سماح متبقية",
    manage: "إدارة الاشتراك",
  },
  en: {
    graceTitle: "Subscription is in grace period",
    graceText: "Renew before the grace period ends to avoid workspace restriction.",
    expiringTitle: "Subscription renewal is approaching",
    expiringText: "Review and renew early to keep the workspace continuously available.",
    billingTitle: "Subscription action required",
    billingText: "The workspace is currently limited to subscription and billing management.",
    deniedTitle: "Subscription access unavailable",
    deniedText: "No active company context is available for subscription management.",
    days: "days remaining",
    graceDays: "grace days remaining",
    manage: "Manage subscription",
  },
} as const;
export function CompanySubscriptionAlert() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [access, setAccess] = React.useState<ReturnType<typeof normalizeAccess> | null>(
    null,
  );
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
  React.useEffect(() => {
    const controller = new AbortController();
    void subscriptionRequest<unknown>(SUBSCRIPTION_ENDPOINTS.detail, {
      signal: controller.signal,
    })
      .then((payload) => {
        const data = unwrapData(payload);
        setAccess(normalizeAccess(data.subscription_access || data.access));
      })
      .catch(() => {
        // Dashboard remains available if the optional subscription banner fails.
      });
    return () => controller.abort();
  }, []);
  if (!access) return null;
  const t = copy[locale];
  const isArabic = locale === "ar";
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;
  let title = "";
  let description = "";
  let meta = "";
  let Icon = CircleAlert;
  let tone = "";
  if (access.is_in_grace) {
    title = t.graceTitle;
    description = t.graceText;
    meta = `${access.grace_days_remaining} ${t.graceDays}`;
    Icon = Clock3;
    tone =
      "border-amber-200 bg-amber-50/85 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100";
  } else if (access.access === "BILLING_ONLY") {
    title = t.billingTitle;
    description = t.billingText;
    meta = access.plan_name || access.status || "";
    Icon = CreditCard;
    tone =
      "border-rose-200 bg-rose-50/85 text-rose-950 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100";
  } else if (access.access === "DENIED") {
    title = t.deniedTitle;
    description = t.deniedText;
    Icon = ShieldAlert;
    tone =
      "border-rose-200 bg-rose-50/85 text-rose-950 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100";
  } else if (access.days_remaining <= 14) {
    title = t.expiringTitle;
    description = t.expiringText;
    meta = `${access.days_remaining} ${t.days}`;
    Icon = Clock3;
    tone =
      "border-amber-200 bg-amber-50/85 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100";
  } else {
    return null;
  }
  return (
    <Card
      className={`gap-0 rounded-lg py-0 shadow-none before:hidden after:hidden ${tone}`}
    >
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-current/15 bg-white/50 dark:bg-black/10">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-sm opacity-80">{description}</p>
            {meta ? (
              <p
                dir="ltr"
                lang="en"
                className="mt-1.5 text-xs font-medium tabular-nums opacity-75"
              >
                {meta}
              </p>
            ) : null}
          </div>
        </div>
        {access.can_manage_subscription ? (
          <Button asChild variant="outline" className="shrink-0 bg-background/80">
            <Link href="/company/subscription">
              {t.manage}
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
