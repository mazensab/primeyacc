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
  includedBenefits: string;
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
      subTitle: "الاشتراكات",
      title: "اختر بطاقة أو برنامج رعاية يناسبك",
      description:
        "ابدأ مع Primey Care بخيارات مرنة للأفراد والعائلات والبرامج الطبية المتخصصة، واستفد من خصومات ومزايا مختارة لدى مزودي الخدمة المشاركين.",
    },
    periods: {
      monthly: "شهري",
      annually: "سنوي",
    },
    saveLabel: "الأوفر",
    mostPopular: "الأكثر اختيارًا",
    startsFrom: "تبدأ من",
    customPrice: "حسب البرنامج",
    annualNote: "الاشتراك السنوي يمنحك استفادة أطول من مزايا البطاقة",
    includedBenefits: "المزايا المتضمنة",
    getStarted: "اشترك الآن",
    askForDetails: "استفسر عن البرنامج",
    toastMessage: "سيتم تحويلك إلى صفحة الاشتراك في Primey Care",
  },
  en: {
    section: {
      subTitle: "Subscriptions",
      title: "Choose a care card or program that fits you",
      description:
        "Start with Primey Care through flexible options for individuals, families, and specialized healthcare programs, and enjoy selected benefits with participating providers.",
    },
    periods: {
      monthly: "Monthly",
      annually: "Annually",
    },
    saveLabel: "Best Value",
    mostPopular: "Most Chosen",
    startsFrom: "Starts from",
    customPrice: "By program",
    annualNote: "Annual subscription gives you longer access to card benefits",
    includedBenefits: "Included Benefits",
    getStarted: "Join Now",
    askForDetails: "Ask for Details",
    toastMessage: "You will be redirected to the Primey Care registration page",
  },
};

/* =========================================================
   💳 Landing Plans
   ملاحظة:
   الأسعار هنا قابلة للتعديل لاحقًا حسب الأسعار الرسمية.
   إذا لم يكن السعر ثابتًا نستخدم null وتظهر عبارة "حسب البرنامج".
========================================================= */
const landingPlans: LandingPlan[] = [
  {
    id: "individual",
    title: {
      ar: "بطاقة فردية",
      en: "Individual Card",
    },
    description: {
      ar: "خيار مناسب لمن يريد الاستفادة من خصومات ومزايا طبية طوال العام بطريقة سهلة وواضحة.",
      en: "A suitable option for individuals who want year-round medical benefits and selected discounts with a simple experience.",
    },
    price: {
      monthly: null,
      annually: null,
    },
    features: {
      ar: [
        "مزايا على الكشف والاستشارات",
        "خصومات على التحاليل والفحوصات",
        "استخدام سهل لدى مزودي الخدمة المشاركين",
        "دعم واستفسارات عبر القنوات المعتمدة",
      ],
      en: [
        "Benefits on consultations and checkups",
        "Discounts on lab tests and diagnostics",
        "Easy use with participating providers",
        "Support through approved channels",
      ],
    },
  },
  {
    id: "family",
    popular: true,
    title: {
      ar: "بطاقة عائلية",
      en: "Family Card",
    },
    description: {
      ar: "خيار مناسب للعائلة للاستفادة من مزايا صحية متنوعة لدى شبكة مختارة من مقدمي الخدمة.",
      en: "A suitable option for families to access selected healthcare benefits through a trusted provider network.",
    },
    price: {
      monthly: null,
      annually: null,
    },
    note: {
      ar: "أفضل خيار للعائلات",
      en: "Best option for families",
    },
    features: {
      ar: [
        "مناسبة لأكثر من فرد حسب نوع البطاقة",
        "مزايا على الأسنان والجلدية والفحوصات",
        "خيارات صحية متنوعة للعائلة",
        "اشتراك سنوي يساعدك على التوفير",
      ],
      en: [
        "Suitable for more than one member depending on card type",
        "Benefits on dental, dermatology, and checkups",
        "Multiple healthcare options for the family",
        "Annual subscription helps you save",
      ],
    },
  },
  {
    id: "programs",
    title: {
      ar: "برامج طبية متخصصة",
      en: "Specialized Programs",
    },
    description: {
      ar: "برامج مخصصة لاحتياجات معينة مثل الأسنان، الفحوصات، الجلدية، التجميل، الولادة والخدمات المختارة.",
      en: "Specialized programs for needs such as dental care, checkups, dermatology, beauty, maternity, and selected services.",
    },
    price: {
      monthly: null,
      annually: null,
    },
    features: {
      ar: [
        "برامج للأسنان والفحوصات والتحاليل",
        "خيارات للجلدية والتجميل والولادة",
        "مزايا حسب مقدم الخدمة والعرض المتاح",
        "مناسب لمن يبحث عن خدمة محددة",
      ],
      en: [
        "Programs for dental care, checkups, and lab tests",
        "Options for dermatology, beauty, and maternity",
        "Benefits depend on provider and available offer",
        "Suitable for specific healthcare needs",
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
                        <span>{t.includedBenefits}</span>
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
                        {plan.id === "programs" ? t.askForDetails : t.getStarted}
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