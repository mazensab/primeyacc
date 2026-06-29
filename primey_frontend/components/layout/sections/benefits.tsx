import { cookies } from "next/headers";

import { benefitList } from "@/@data/benefits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/icon";
import { cn } from "@/lib/utils";
import SectionContainer from "../section-container";
import SectionHeader from "../section-header";

/* =========================================================
   🌐 Language Types
========================================================= */
type AppLang = "ar" | "en";

type BenefitTranslation = {
  title: string;
  description: string;
};

type BenefitsContent = {
  subTitle: string;
  title: string;
  description: string;
  items: BenefitTranslation[];
};

/* =========================================================
   🌐 Language Helper
========================================================= */
async function getPageLang(): Promise<AppLang> {
  const cookieStore = await cookies();

  const cookieLang =
    cookieStore.get("lang")?.value ||
    cookieStore.get("locale")?.value ||
    cookieStore.get("NEXT_LOCALE")?.value ||
    "";

  const normalizedLang = cookieLang.toLowerCase();

  return normalizedLang.startsWith("ar") ? "ar" : "en";
}

/* =========================================================
   📝 Localized Content
========================================================= */
const benefitsContent: Record<AppLang, BenefitsContent> = {
  ar: {
    subTitle: "لماذا Mhamcloud؟",
    title: "مزايا صحية تساعدك أنت وعائلتك على التوفير",
    description:
      "Mhamcloud تمنحك طريقة أسهل للاستفادة من خدمات طبية متنوعة بخصومات مختارة، عبر بطاقة وبرامج رعاية مصممة لتجعل الوصول إلى الرعاية الصحية أوضح وأقرب وأقل تكلفة.",
    items: [
      {
        title: "وفّر في كل زيارة",
        description:
          "استفد من خصومات مختارة على الكشف، التحاليل، الأشعة، الأسنان، الجلدية، التجميل، الولادة وخدمات طبية أخرى حسب مقدم الخدمة والعرض المتاح.",
      },
      {
        title: "بطاقة سهلة الاستخدام",
        description:
          "اشترك في البطاقة أو البرنامج المناسب، ثم استخدم بيانات عضويتك لدى مزودي الخدمة المشاركين للاستفادة من المزايا المتاحة بكل سهولة.",
      },
      {
        title: "شبكة طبية مختارة",
        description:
          "نوفر لك وصولًا إلى مجموعة من العيادات والمراكز والمستشفيات ومقدمي الخدمات الصحية المشاركين لتلبية احتياجاتك واحتياجات عائلتك.",
      },
      {
        title: "خيارات تناسب احتياجك",
        description:
          "سواء كنت تبحث عن بطاقة رعاية سنوية أو برنامج طبي محدد للأسنان أو الفحوصات أو التجميل أو الولادة، ستجد خيارات مرنة تساعدك على اختيار الأنسب.",
      },
    ],
  },
  en: {
    subTitle: "Why Mhamcloud?",
    title: "Healthcare benefits that help you and your family save",
    description:
      "Mhamcloud gives you an easier way to access a wide range of healthcare services with selected discounts through care cards and programs designed to make healthcare clearer, closer, and more affordable.",
    items: [
      {
        title: "Save on Every Visit",
        description:
          "Enjoy selected discounts on consultations, lab tests, scans, dental care, dermatology, beauty, maternity, and other healthcare services depending on the provider and available offer.",
      },
      {
        title: "Easy-to-Use Card",
        description:
          "Subscribe to the card or program that fits your needs, then use your membership details at participating providers to access available benefits with ease.",
      },
      {
        title: "Selected Healthcare Network",
        description:
          "Get access to a network of participating clinics, medical centers, hospitals, and healthcare providers that support your needs and your family’s needs.",
      },
      {
        title: "Options That Fit Your Needs",
        description:
          "Whether you need an annual care card or a specific healthcare program for dental care, checkups, beauty, or maternity, Mhamcloud offers flexible options to choose from.",
      },
    ],
  },
};

/* =========================================================
   🧩 Section
========================================================= */
export const BenefitsSection = async () => {
  const lang = await getPageLang();
  const isArabic = lang === "ar";
  const t = benefitsContent[lang];

  return (
    <SectionContainer id="benefits">
      <div className="grid lg:grid-cols-2 lg:gap-24">
        <div>
          <SectionHeader
            className={cn(
              "sticky max-w-full text-center lg:top-[22rem]",
              isArabic ? "lg:text-right" : "lg:text-start"
            )}
            subTitle={t.subTitle}
            title={t.title}
            description={t.description}
          />
        </div>

        <div className="flex w-full flex-col gap-6 lg:gap-[14rem]">
          {benefitList.map(({ icon, title }, index) => {
            const translatedItem = t.items[index];

            return (
              <Card
                key={title}
                className={cn("group/number bg-background lg:sticky")}
                style={{ top: `${20 + index + 2}rem` }}
              >
                <CardHeader>
                  <div className="flex justify-between">
                    <Icon
                      name={icon}
                      className="text-primary bg-primary/20 ring-primary/10 mb-6 size-10 rounded-full p-2 ring-8"
                    />

                    <span className="text-muted-foreground/15 group-hover/number:text-muted-foreground/30 text-5xl font-bold transition-all delay-75">
                      0{index + 1}
                    </span>
                  </div>

                  <CardTitle
                    className={cn("text-lg", isArabic && "text-right")}
                  >
                    {translatedItem?.title || title}
                  </CardTitle>
                </CardHeader>

                <CardContent
                  className={cn(
                    "text-muted-foreground leading-7",
                    isArabic && "text-right"
                  )}
                >
                  {translatedItem?.description || ""}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </SectionContainer>
  );
};