"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingCtaSection } from "@/components/layout/sections/cta";
import SectionContainer from "@/components/layout/section-container";
import SectionHeader from "@/components/layout/section-header";
import { AnimatedBackground } from "@/components/ui/extras/animated-background";
import { SlidingNumber } from "@/components/ui/extras/sliding-number";
import { Badge } from "@/components/ui/badge";

/* =========================================================
   🌐 Language Types
========================================================= */
type AppLang = "ar" | "en";

/* =========================================================
   🧩 Types
========================================================= */
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
  popular?: boolean;
  title: Record<AppLang, string>;
  description: Record<AppLang, string>;
  price: DisplayPrice;
  features: Record<AppLang, string[]>;
  note?: Record<AppLang, string>;
};

type PricingContent = {
  section: {
    subTitle: string;
    title: string;
    description: string;
  };
  periods: Record<PeriodValue, string>;
  saveLabel: string;
  mostPopular: string;
  startsFrom: string;
  customPrice: string;
  annualNote: string;
  includedModules: string;
  getStarted: string;
  askForDetails: string;
  toastMessage: string;
};

/* =========================================================
   📝 Localized Content
========================================================= */
const content: Record<AppLang, PricingContent> = {
  ar: {
    section: {
      subTitle: "الباقات",
      title: "اختر باقة PrimeyAcc المناسبة لشركتك",
      description:
        "ابدأ مع PrimeyAcc بباقات مرنة للمحاسبة والمبيعات والمشتريات والمخزون والخزينة والتقارير وإدارة العمليات.",
    },
    periods: {
      monthly: "شهري",
      annually: "سنوي",
    },
    saveLabel: "الأوفر",
    mostPopular: "الأكثر اختيارًا",
    startsFrom: "تبدأ من",
    customPrice: "حسب الباقة",
    annualNote: "الاشتراك السنوي يمنح شركتك قيمة أفضل ومدة استخدام أطول",
    includedModules: "الوحدات المتضمنة",
    getStarted: "ابدأ الآن",
    askForDetails: "استفسر عن الباقة",
    toastMessage: "سيتم تحويلك إلى صفحة طلب تجربة PrimeyAcc",
  },
  en: {
    section: {
      subTitle: "Plans",
      title: "Choose a PrimeyAcc plan that fits your company",
      description:
        "Start with PrimeyAcc through flexible plans for accounting, sales, purchases, inventory, treasury, reports, and business operations.",
    },
    periods: {
      monthly: "Monthly",
      annually: "Annually",
    },
    saveLabel: "Best Value",
    mostPopular: "Most Popular",
    startsFrom: "Starts from",
    customPrice: "By plan",
    annualNote: "Annual subscription gives your company longer access with better value",
    includedModules: "Included Modules",
    getStarted: "Start Now",
    askForDetails: "Ask for Details",
    toastMessage: "You will be redirected to the PrimeyAcc trial request page",
  },
};

/* =========================================================
   💳 Landing Plans
   ملاحظة:
   الأسعار هنا قابلة للتعديل لاحقًا حسب الأسعار الرسمية.
   إذا لم يكن السعر ثابتًا نستخدم null وتظهر عبارة "حسب الباقة".
========================================================= */
const landingPlans: LandingPlan[] = [
  {
    id: "starter",
    title: {
      ar: "باقة البداية",
      en: "Starter Plan",
    },
    description: {
      ar: "خيار مناسب للشركات التي تبدأ بالمحاسبة الأساسية وإدارة الأعمال اليومية.",
      en: "A suitable option for companies starting with core accounting and daily business management.",
    },
    price: {
      monthly: null,
      annually: null,
    },
    features: {
      ar: [
        "إعداد الشركة والمحاسبة الأساسية",
        "فواتير المبيعات وإدارة العملاء",
        "إدارة المشتريات والموردين",
        "تقارير أساسية ودعم المنصة",
      ],
      en: [
        "Core accounting and company setup",
        "Sales invoices and customer management",
        "Purchases and supplier management",
        "Basic reports and platform support",
      ],
    },
  },
  {
    id: "growth",
    popular: true,
    title: {
      ar: "باقة النمو",
      en: "Growth Plan",
    },
    description: {
      ar: "خيار مناسب للشركات النامية التي تحتاج مستخدمين أكثر ووحدات تشغيلية أوسع.",
      en: "A suitable option for growing companies that need more users, modules, and operational control.",
    },
    price: {
      monthly: null,
      annually: null,
    },
    note: {
      ar: "أفضل خيار للشركات النامية",
      en: "Best option for growing companies",
    },
    features: {
      ar: [
        "مناسبة للشركات والفرق النامية",
        "وحدات المبيعات والمشتريات والمخزون والخزينة",
        "تغطية تشغيلية أوسع بين الإدارات",
        "اشتراك سنوي بقيمة أفضل",
      ],
      en: [
        "Suitable for growing companies and teams",
        "Sales, purchases, inventory, and treasury modules",
        "More operational coverage across departments",
        "Annual subscription gives better value",
      ],
    },
  },
  {
    id: "professional",
    title: {
      ar: "باقة الاحتراف",
      en: "Professional Plan",
    },
    description: {
      ar: "خيار مناسب للشركات التي تحتاج وحدات متقدمة وتقارير وصلاحيات وتغطية تشغيلية أوسع.",
      en: "A suitable option for companies that need advanced modules, reports, permissions, and wider operational coverage.",
    },
    price: {
      monthly: null,
      annually: null,
    },
    features: {
      ar: [
        "محاسبة متقدمة وتقارير ورقابة",
        "مخزون وخزينة وصلاحيات وأدوات إدارة",
        "الوحدات حسب الباقة وإعدادات الشركة",
        "مناسبة للعمليات المتقدمة داخل الشركة",
      ],
      en: [
        "Advanced accounting, reports, and controls",
        "Inventory, treasury, permissions, and management tools",
        "Modules depend on selected plan and company setup",
        "Suitable for advanced company operations",
      ],
    },
  },
];

/* =========================================================
   🍪 Helpers
========================================================= */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function getCurrentLang(): AppLang {
  const cookieLang =
    getCookie("lang") || getCookie("locale") || getCookie("NEXT_LOCALE");

  return cookieLang === "ar" ? "ar" : "en";
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

/* =========================================================
   🧩 Section
========================================================= */
export const PricingSection = () => {
  const [lang, setLang] = useState<AppLang>("en");
  const [selectedPeriodValue, setSelectedPeriodValue] =
    useState<PeriodValue>("annually");

  /* -----------------------------------------------------
     🌐 Language sync
  ----------------------------------------------------- */
  useEffect(() => {
    const updateLang = () => {
      setLang(getCurrentLang());
    };

    updateLang();

    const observer = new MutationObserver(() => {
      updateLang();
    });

    if (typeof document !== "undefined") {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["lang", "dir"],
      });
    }

    return () => observer.disconnect();
  }, []);

  const isArabic = lang === "ar";
  const dir = isArabic ? "rtl" : "ltr";
  const t = content[lang];

  const periods: Period[] = useMemo(
    () => [
      { label: t.periods.monthly, value: "monthly" },
      { label: t.periods.annually, value: "annually" },
    ],
    [t]
  );

  const selectedPeriod =
    periods.find((period) => period.value === selectedPeriodValue) ?? periods[1];

  const handleRegisterClick = () => {
    toast.success(t.toastMessage);
  };

  return (
    <SectionContainer id="pricing">
      <div dir={dir}>
        <SectionHeader
          subTitle={t.section.subTitle}
          title={t.section.title}
          description={t.section.description}
        />

        <div className="mx-auto max-w-6xl">
          {/* فترة الاشتراك */}
          <div className="flex justify-center">
            <div className="mb-8 flex justify-center rounded-lg border">
              <AnimatedBackground
                defaultValue={selectedPeriod.value}
                className="bg-background rounded-lg"
                onValueChange={(value) => {
                  const nextPeriod = periods.find((p) => p.value === value);
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
                    data-id={period.value}
                    variant="ghost"
                    className="relative"
                  >
                    {period.label}

                    {period.value === "annually" && (
                      <Badge
                        className={cn(
                          "ms-2 border-0 bg-transparent text-green-600",
                          isArabic && "me-2 ms-0"
                        )}
                      >
                        {t.saveLabel}
                      </Badge>
                    )}
                  </Button>
                ))}
              </AnimatedBackground>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
            {landingPlans.map((plan) => {
              const isPopular = Boolean(plan.popular);
              const currentPrice = plan.price[selectedPeriod.value];
              const hasFixedPrice = typeof currentPrice === "number";

              return (
                <Card
                  key={plan.id}
                  className={cn("relative h-full overflow-hidden", {
                    "border-primary!": isPopular,
                  })}
                >
                  {isPopular && (
                    <div
                      className={cn(
                        "bg-primary text-primary-foreground absolute top-0 rounded-bl-lg px-3 py-1 text-xs font-medium",
                        isArabic
                          ? "left-0 rounded-br-lg rounded-bl-none"
                          : "right-0"
                      )}
                    >
                      {t.mostPopular}
                    </div>
                  )}

                  <CardHeader className="gap-3">
                    <div
                      className={cn(
                        "bg-primary/10 text-primary flex size-11 items-center justify-center rounded-2xl",
                        isArabic && "mr-auto"
                      )}
                    >
                      <Sparkles className="size-5" />
                    </div>

                    <CardTitle className={cn(isArabic && "text-right")}>
                      {plan.title[lang]}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex h-full flex-col">
                    <p
                      className={cn(
                        "text-muted-foreground leading-7",
                        isArabic && "text-right"
                      )}
                    >
                      {plan.description[lang]}
                    </p>

                    <div className="mt-6">
                      {hasFixedPrice ? (
                        <>
                          <p
                            className={cn(
                              "text-muted-foreground mb-2 text-sm",
                              isArabic && "text-right"
                            )}
                          >
                            {t.startsFrom}
                          </p>

                          {/* ✅ السعر يبقى LTR حتى لا تنعكس الأرقام */}
                          <div
                            dir="ltr"
                            className="flex items-end justify-start gap-2 whitespace-nowrap"
                          >
                            <div className="flex items-center gap-2 text-4xl font-bold tabular-nums">
                              <Image
                                src="/currency/sar.svg"
                                alt="SAR"
                                width={28}
                                height={28}
                                className="h-7 w-7 shrink-0"
                              />
                              <span className="flex items-baseline tabular-nums leading-none">
                                <SlidingNumber value={currentPrice} />
                              </span>
                            </div>

                            <span className="text-muted-foreground mb-1 shrink-0 text-sm">
                              /{selectedPeriod.label}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div
                          className={cn(
                            "rounded-2xl border bg-muted/50 px-4 py-5",
                            isArabic && "text-right"
                          )}
                        >
                          <p className="text-2xl font-bold">{t.customPrice}</p>
                          <p className="text-muted-foreground mt-2 text-sm leading-6">
                            {plan.note?.[lang] || t.annualNote}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      <div
                        className={cn(
                          "mb-3 flex items-center gap-2 text-sm font-medium",
                          isArabic && "flex-row-reverse justify-end text-right"
                        )}
                      >
                        <Sparkles className="text-primary size-4" />
                        <span>{t.includedModules}</span>
                      </div>

                      <ul className="space-y-3">
                        {plan.features[lang].map((feature, index) => (
                          <li
                            key={`${plan.id}-${index}`}
                            className={cn(
                              "flex items-start",
                              isArabic &&
                                "flex-row-reverse justify-end text-right"
                            )}
                          >
                            <Check
                              className={cn(
                                "text-primary mt-0.5 size-4 shrink-0",
                                isArabic ? "ml-2" : "mr-2"
                              )}
                            />
                            <span className="leading-6">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 flex-grow" />

                    <Button asChild variant={isPopular ? "default" : "outline"}>
                      <Link href="/register" onClick={handleRegisterClick}>
                        {plan.id === "professional" ? t.askForDetails : t.getStarted}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <PricingCtaSection />
        </div>
      </div>
    </SectionContainer>
  );
};