"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  Check,
  Rocket,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import SectionContainer from "@/components/layout/section-container";
import { AnimatedBackground } from "@/components/ui/extras/animated-background";
import { SlidingNumber } from "@/components/ui/extras/sliding-number";

type AppLang = "ar" | "en";
type PeriodValue = "monthly" | "annually";

type Period = {
  label: string;
  value: PeriodValue;
};

type DisplayPrice = {
  monthly: number | null;
  annually: number | null;
};

type LandingPlan = {
  id: string;
  icon: React.ElementType;
  popular?: boolean;
  title: Record<AppLang, string>;
  description: Record<AppLang, string>;
  price: DisplayPrice;
  features: Record<AppLang, string[]>;
  note?: Record<AppLang, string>;
};

const plans: LandingPlan[] = [
  {
    id: "starter",
    icon: Rocket,
    title: {
      ar: "باقة البداية",
      en: "Starter",
    },
    description: {
      ar: "للشركات التي تريد بدء المحاسبة وإدارة المبيعات والمشتريات بصورة منظمة.",
      en: "For businesses starting with organized accounting, sales, and purchasing workflows.",
    },
    price: {
      monthly: null,
      annually: null,
    },
    features: {
      ar: [
        "إعداد الشركة والمحاسبة الأساسية",
        "العملاء والموردون",
        "المبيعات والفوترة",
        "المشتريات",
        "تقارير أساسية",
      ],
      en: [
        "Company setup and core accounting",
        "Customers and suppliers",
        "Sales and invoicing",
        "Purchases",
        "Core reports",
      ],
    },
  },
  {
    id: "growth",
    icon: TrendingUp,
    popular: true,
    title: {
      ar: "باقة النمو",
      en: "Growth",
    },
    description: {
      ar: "للشركات النامية التي تحتاج دورة تشغيل أوسع وربط المخزون والخزينة بالعمليات اليومية.",
      en: "For growing businesses needing wider workflows with inventory and treasury integration.",
    },
    price: {
      monthly: null,
      annually: null,
    },
    note: {
      ar: "الخيار الأنسب للشركات النامية",
      en: "Recommended for growing businesses",
    },
    features: {
      ar: [
        "كل ما في باقة البداية",
        "المخزون والمستودعات",
        "الخزينة والمدفوعات",
        "صلاحيات ومستخدمون أوسع",
        "تقارير ومتابعة متقدمة",
      ],
      en: [
        "Everything in Starter",
        "Inventory and warehouses",
        "Treasury and payments",
        "Expanded users and permissions",
        "Advanced reporting and monitoring",
      ],
    },
  },
  {
    id: "professional",
    icon: Building2,
    title: {
      ar: "باقة الاحتراف",
      en: "Professional",
    },
    description: {
      ar: "للشركات التي تحتاج تحكما أوسع وتقارير وصلاحيات وتهيئة متقدمة حسب نطاق العمل.",
      en: "For organizations requiring broader controls, reports, permissions, and advanced setup.",
    },
    price: {
      monthly: null,
      annually: null,
    },
    features: {
      ar: [
        "محاسبة وتشغيل متقدم",
        "وحدات أوسع حسب نطاق الشركة",
        "صلاحيات ورقابة متقدمة",
        "تقارير إدارية ومالية",
        "تهيئة حسب احتياج المنشأة",
      ],
      en: [
        "Advanced accounting and operations",
        "Wider modules by company scope",
        "Advanced permissions and governance",
        "Management and financial reports",
        "Organization-specific setup",
      ],
    },
  },
];

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function getCurrentLang(): AppLang {
  const cookieLang =
    getCookie("lang") || getCookie("locale") || getCookie("NEXT_LOCALE") || "";

  return cookieLang.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export const PricingSection = () => {
  const [lang, setLang] = useState<AppLang>("en");
  const [selectedPeriodValue, setSelectedPeriodValue] =
    useState<PeriodValue>("annually");

  useEffect(() => {
    const updateLang = () => setLang(getCurrentLang());

    updateLang();

    const observer = new MutationObserver(updateLang);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang", "dir"],
    });

    window.addEventListener("primey-locale-changed", updateLang);

    return () => {
      observer.disconnect();
      window.removeEventListener("primey-locale-changed", updateLang);
    };
  }, []);

  const isArabic = lang === "ar";
  const dir = isArabic ? "rtl" : "ltr";

  const copy = isArabic
    ? {
        eyebrow: "الباقات والاشتراكات",
        title: "اختر النطاق المناسب لمرحلة شركتك",
        description:
          "باقات مرنة تبدأ من المحاسبة الأساسية وتمتد إلى المخزون والخزينة والصلاحيات والتقارير المتقدمة. الأسعار النهائية تعتمد حسب نطاق الاشتراك.",
        monthly: "شهري",
        annually: "سنوي",
        annualBadge: "قيمة أفضل",
        popular: "الأكثر اختيارا",
        startsFrom: "تبدأ من",
        customPrice: "حسب الباقة",
        modules: "ما تتضمنه الباقة",
        start: "ابدأ الآن",
        details: "اطلب التفاصيل",
        periodSuffix: {
          monthly: "شهريا",
          annually: "سنويا",
        },
        toast: "سيتم تحويلك إلى صفحة طلب تجربة Mhamcloud",
        finalEyebrow: "جاهز للبدء",
        finalTitle: "اختر الباقة المناسبة واترك لنا تهيئة البداية",
        finalDescription:
          "أرسل احتياج شركتك وعدد المستخدمين والوحدات المطلوبة وسنساعدك على تحديد النطاق المناسب قبل التفعيل.",
        finalPrimary: "إرسال طلب تجربة",
        finalSecondary: "تواصل معنا",
      }
    : {
        eyebrow: "Plans & Subscriptions",
        title: "Choose a plan that fits your business stage",
        description:
          "Flexible plans ranging from core accounting to inventory, treasury, advanced permissions, and reporting. Final pricing is confirmed according to subscription scope.",
        monthly: "Monthly",
        annually: "Annually",
        annualBadge: "Best Value",
        popular: "Most Popular",
        startsFrom: "Starts from",
        customPrice: "By plan",
        modules: "What is included",
        start: "Get Started",
        details: "Request Details",
        periodSuffix: {
          monthly: "monthly",
          annually: "annually",
        },
        toast: "You will be redirected to the Mhamcloud trial request page",
        finalEyebrow: "Ready to start?",
        finalTitle: "Choose the right scope and let us prepare your setup",
        finalDescription:
          "Share your company needs, users, and required modules so we can help define the right setup before activation.",
        finalPrimary: "Request a Trial",
        finalSecondary: "Contact Us",
      };

  const periods: Period[] = useMemo(
    () => [
      {
        label: copy.monthly,
        value: "monthly",
      },
      {
        label: copy.annually,
        value: "annually",
      },
    ],
    [copy.monthly, copy.annually]
  );

  const selectedPeriod =
    periods.find((period) => period.value === selectedPeriodValue) ?? periods[1];

  const handleRegisterClick = () => {
    toast.success(copy.toast);
  };

  return (
    <SectionContainer id="pricing" className="py-8 md:py-10 lg:py-12">
      <div dir={dir}>
        <div className="mx-auto mb-8 max-w-3xl text-center lg:mb-10">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4" />
            {copy.eyebrow}
          </div>

          <h2 className="mt-3 text-3xl font-semibold leading-[1.18] tracking-[-0.035em] text-foreground sm:text-4xl lg:text-[44px]">
            {copy.title}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {copy.description}
          </p>

          <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-foreground/40 to-transparent" />
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex justify-center">
            <div className="rounded-2xl border border-border/70 bg-muted/35 p-1 shadow-sm">
              <AnimatedBackground
                defaultValue={selectedPeriod.value}
                className="rounded-xl border bg-background shadow-sm"
                onValueChange={(value) => {
                  const nextPeriod = periods.find(
                    (period) => period.value === value
                  );

                  if (nextPeriod) {
                    setSelectedPeriodValue(nextPeriod.value);
                  }
                }}
                transition={{
                  ease: "easeInOut",
                  duration: 0.2,
                }}
              >
                {periods.map((period) => (
                  <Button
                    key={period.value}
                    type="button"
                    data-id={period.value}
                    variant="ghost"
                    className="relative h-10 rounded-xl px-5"
                  >
                    {period.label}

                    {period.value === "annually" ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        {copy.annualBadge}
                      </span>
                    ) : null}
                  </Button>
                ))}
              </AnimatedBackground>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const currentPrice = plan.price[selectedPeriodValue];
              const hasFixedPrice = typeof currentPrice === "number";

              return (
                <article
                  key={plan.id}
                  className={cn(
                    "relative flex min-h-[560px] flex-col overflow-hidden rounded-[28px] border",
                    "bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.82)_100%)]",
                    "p-6 shadow-[0_18px_48px_rgba(15,23,42,0.065),inset_0_1px_0_rgba(255,255,255,0.82)]",
                    "backdrop-blur-2xl transition duration-300",
                    "hover:-translate-y-1 hover:shadow-[0_28px_68px_rgba(15,23,42,0.11)]",
                    "dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.90)_0%,rgba(3,7,18,0.86)_100%)]",
                    plan.popular
                      ? "border-slate-900 ring-1 ring-slate-900/10 dark:border-white/45 dark:ring-white/10"
                      : "border-border/70 dark:border-white/10"
                  )}
                >
                  {plan.popular ? (
                    <span
                      className={cn(
                        "absolute top-4 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm dark:bg-white dark:text-slate-950",
                        isArabic ? "left-4" : "right-4"
                      )}
                    >
                      {copy.popular}
                    </span>
                  ) : null}

                  <div className="flex size-12 items-center justify-center rounded-[16px] border border-border/70 bg-background text-foreground shadow-sm">
                    <Icon className="size-5" />
                  </div>

                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.025em] text-foreground">
                    {plan.title[lang]}
                  </h3>

                  <p className="mt-3 min-h-[84px] text-sm leading-7 text-muted-foreground">
                    {plan.description[lang]}
                  </p>

                  <div className="mt-5 border-y border-border/60 py-5">
                    {hasFixedPrice ? (
                      <>
                        <div className="text-sm text-muted-foreground">
                          {copy.startsFrom}
                        </div>

                        <div className="mt-2 flex items-end gap-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-4xl font-semibold tabular-nums text-foreground">
                            <span
                              dir="ltr"
                              className="inline-flex items-baseline tabular-nums leading-none"
                            >
                              <SlidingNumber value={currentPrice} />
                            </span>

                            <Image
                              src="/currency/sar.svg"
                              alt="SAR"
                              width={27}
                              height={27}
                              className="size-[27px] shrink-0"
                            />
                          </div>

                          <span className="mb-0.5 text-sm text-muted-foreground">
                            / {copy.periodSuffix[selectedPeriodValue]}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-semibold text-foreground">
                          {copy.customPrice}
                        </div>

                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          {plan.note?.[lang] ||
                            (isArabic
                              ? "يتم تحديد السعر بعد معرفة المستخدمين والوحدات ونطاق التشغيل المطلوب."
                              : "Pricing is confirmed after reviewing users, required modules, and operating scope.")}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BadgeCheck className="size-4" />
                    {copy.modules}
                  </div>

                  <ul className="mt-4 space-y-3">
                    {plan.features[lang].map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground"
                      >
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          <Check className="size-3" />
                        </span>

                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-7">
                    <Button
                      asChild
                      size="lg"
                      variant={plan.popular ? "default" : "outline"}
                      className="h-11 w-full rounded-xl"
                    >
                      <Link
                        href="/register"
                        onClick={handleRegisterClick}
                      >
                        {plan.id === "professional"
                          ? copy.details
                          : copy.start}
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="relative mt-10 overflow-hidden rounded-[30px] border border-border/70 bg-[radial-gradient(circle_at_10%_20%,rgba(148,163,184,0.13),transparent_32%),linear-gradient(145deg,#f8fafc_0%,#eef2f7_55%,#e2e8f0_100%)] px-6 py-8 shadow-[0_18px_48px_rgba(15,23,42,0.07)] sm:px-8 lg:px-10 dark:border-white/10 dark:bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.06),transparent_32%),linear-gradient(145deg,#111827_0%,#0f172a_55%,#030712_100%)]">
            <div className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full border border-white/60 dark:border-white/10" />

            <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Sparkles className="size-4" />
                  {copy.finalEyebrow}
                </div>

                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
                  {copy.finalTitle}
                </h3>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  {copy.finalDescription}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-11 rounded-xl px-6"
                >
                  <Link
                    href="/register"
                    onClick={handleRegisterClick}
                  >
                    {copy.finalPrimary}
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-xl bg-background/60 px-6"
                >
                  <Link href="/contact">{copy.finalSecondary}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
};