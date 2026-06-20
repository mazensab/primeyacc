"use client";

import React, { useEffect, useState } from "react";

import { featureList } from "@/@data/features";
import Icon from "@/components/icon";
import SectionContainer from "@/components/layout/section-container";
import SectionHeader from "@/components/layout/section-header";
import { CardTitle } from "@/components/ui/card";
import { CardHover, CardsHover } from "@/components/ui/extras/cards-hover";
import { cn } from "@/lib/utils";

/* =========================================================
   🌐 Language Types
========================================================= */
type AppLang = "ar" | "en";

type FeatureItemTranslation = {
  title: string;
  description: string;
};

type FeaturesContent = {
  subTitle: string;
  title: string;
  description: string;
  items: FeatureItemTranslation[];
};

/* =========================================================
   🍪 Cookie Helper
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

/* =========================================================
   📝 Localized Content
========================================================= */
const content: Record<AppLang, FeaturesContent> = {
  ar: {
    subTitle: "مزايا البطاقة",
    title: "خدمات صحية متنوعة بخصومات أقرب لك",
    description:
      "تمنحك Primey Care مزايا مختارة على مجموعة واسعة من الخدمات الطبية اليومية والمتخصصة، لتجعل الوصول إلى الرعاية الصحية أسهل وأوضح لك ولعائلتك.",
    items: [
      {
        title: "الكشف والاستشارات",
        description:
          "استفد من خصومات على الكشف والاستشارات الطبية لدى عيادات ومراكز مختارة في تخصصات متعددة حسب الشبكة المتاحة.",
      },
      {
        title: "التحاليل والمختبرات",
        description:
          "احصل على مزايا وخصومات على التحاليل الطبية والفحوصات المخبرية الأساسية والدورية لدى مزودي خدمة مشاركين.",
      },
      {
        title: "الأشعة والفحوصات",
        description:
          "استفد من عروض مختارة على خدمات الأشعة والفحوصات التشخيصية، بما يساعدك على متابعة صحتك بتكلفة أوضح.",
      },
      {
        title: "الأسنان والعناية بالفم",
        description:
          "خصومات على الكشف، التنظيف، الحشوات، التقويم وبعض خدمات الأسنان الأخرى حسب مقدم الخدمة والعرض المتاح.",
      },
      {
        title: "الجلدية والتجميل",
        description:
          "مزايا على خدمات الجلدية، العناية بالبشرة، الجلسات التجميلية، والإجراءات المختارة لدى مزودي خدمة معتمدين.",
      },
      {
        title: "الولادة والبرامج الصحية",
        description:
          "برامج وخيارات مساندة للمتابعة، الفحوصات، الولادة، والخدمات الصحية المتخصصة حسب الباقات المتاحة.",
      },
    ],
  },
  en: {
    subTitle: "Card Benefits",
    title: "Healthcare services with savings closer to you",
    description:
      "Primey Care gives you selected benefits across everyday and specialized healthcare services, making access to care easier and clearer for you and your family.",
    items: [
      {
        title: "Consultations & Checkups",
        description:
          "Enjoy selected discounts on medical consultations and checkups at participating clinics and centers across multiple specialties.",
      },
      {
        title: "Lab Tests",
        description:
          "Get benefits on medical lab tests, routine screenings, and essential diagnostics through participating healthcare providers.",
      },
      {
        title: "Scans & Diagnostics",
        description:
          "Access selected offers on scans and diagnostic services to help you follow up on your health with clearer costs.",
      },
      {
        title: "Dental Care",
        description:
          "Save on dental consultations, cleaning, fillings, orthodontics, and selected dental services depending on the provider and available offer.",
      },
      {
        title: "Dermatology & Beauty",
        description:
          "Enjoy benefits on dermatology, skincare, beauty sessions, and selected procedures through approved healthcare providers.",
      },
      {
        title: "Maternity & Care Programs",
        description:
          "Explore supportive programs for follow-ups, tests, maternity, and specialized healthcare needs depending on available packages.",
      },
    ],
  },
};

/* =========================================================
   🧩 Section
========================================================= */
export const FeaturesSection = () => {
  const [value, setValue] = React.useState<string | null>(null);
  const [lang, setLang] = useState<AppLang>("en");

  useEffect(() => {
    const updateLang = () => setLang(getCurrentLang());

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

  return (
    <SectionContainer id="features">
      <div dir={dir}>
        <SectionHeader
          subTitle={t.subTitle}
          title={t.title}
          description={t.description}
        />

        <CardsHover
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          value={value}
          onValueChange={setValue}
        >
          {featureList.map((card, index) => {
            const translatedItem = t.items[index];

            return (
              <CardHover
                key={card.icon}
                value={card.icon}
                className={cn(
                  "flex items-start gap-6",
                  isArabic && "flex-row-reverse text-right"
                )}
              >
                <div className="space-y-4">
                  <CardTitle
                    className={cn("text-lg", isArabic && "text-right")}
                  >
                    {translatedItem?.title || card.title}
                  </CardTitle>

                  <p
                    className={cn(
                      "text-muted-foreground font-normal leading-7",
                      isArabic && "text-right"
                    )}
                  >
                    {translatedItem?.description || card.description}
                  </p>
                </div>

                <div className="bg-primary/20 ring-primary/10 rounded-full p-2 ring-8">
                  <Icon name={card.icon} className="text-primary size-6" />
                </div>
              </CardHover>
            );
          })}
        </CardsHover>
      </div>
    </SectionContainer>
  );
};