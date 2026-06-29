import { cookies } from "next/headers";

import { ProService, serviceList } from "@/@data/services";
import SectionContainer from "@/components/layout/section-container";
import SectionHeader from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* =========================================================
   🌐 Language Types
========================================================= */
type AppLang = "ar" | "en";

type ServiceItemTranslation = {
  title: string;
  description: string;
};

type ServicesContent = {
  subTitle: string;
  title: string;
  description: string;
  proLabel: string;
  items: ServiceItemTranslation[];
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
const content: Record<AppLang, ServicesContent> = {
  ar: {
    subTitle: "البرامج والبطاقات",
    title: "اختر الرعاية التي تناسب احتياجك",
    description:
      "سواء كنت تبحث عن بطاقة رعاية صحية طوال العام أو برنامج طبي محدد، تمنحك Mhamcloud خيارات مرنة تساعدك على الاستفادة من خصومات ومزايا مختارة لدى مزودي خدمة مشاركين.",
    proLabel: "مميز",
    items: [
      {
        title: "بطاقة الرعاية السنوية",
        description:
          "بطاقة مناسبة للأفراد والعائلات تمنحك مزايا وخصومات طبية طوال العام على مجموعة من الخدمات الصحية لدى الشبكة المشاركة.",
      },
      {
        title: "برنامج الأسنان",
        description:
          "استفد من خصومات مختارة على الكشف، تنظيف الأسنان، الحشوات، التقويم وبعض خدمات العناية بالفم حسب مقدم الخدمة والعرض المتاح.",
      },
      {
        title: "برنامج الجلدية والتجميل",
        description:
          "خيارات ومزايا على خدمات الجلدية، العناية بالبشرة، الجلسات التجميلية، والبرامج المختارة لدى مزودي خدمة معتمدين.",
      },
      {
        title: "برنامج الفحوصات والتحاليل",
        description:
          "باقات ومزايا للفحوصات الدورية، التحاليل الطبية، الأشعة والخدمات التشخيصية لمتابعة صحتك بتكلفة أوضح.",
      },
    ],
  },
  en: {
    subTitle: "Cards & Programs",
    title: "Choose the care that fits your needs",
    description:
      "Whether you need an annual healthcare card or a specific medical program, Mhamcloud gives you flexible options to access selected benefits and discounts through participating providers.",
    proLabel: "Popular",
    items: [
      {
        title: "Annual Care Card",
        description:
          "A flexible card for individuals and families that gives you year-round medical benefits and selected discounts across participating healthcare providers.",
      },
      {
        title: "Dental Program",
        description:
          "Enjoy selected discounts on dental consultations, cleaning, fillings, orthodontics, and other oral care services depending on the provider and available offer.",
      },
      {
        title: "Dermatology & Beauty Program",
        description:
          "Access benefits on dermatology, skincare, beauty sessions, and selected cosmetic services through approved healthcare providers.",
      },
      {
        title: "Checkups & Lab Tests Program",
        description:
          "Packages and benefits for routine checkups, lab tests, scans, and diagnostic services to help you follow up on your health with clearer costs.",
      },
    ],
  },
};

/* =========================================================
   🧩 Section
========================================================= */
export const ServicesSection = async () => {
  const lang = await getPageLang();
  const isArabic = lang === "ar";
  const t = content[lang];

  return (
    <SectionContainer id="solutions">
      <div dir={isArabic ? "rtl" : "ltr"}>
        <SectionHeader
          subTitle={t.subTitle}
          title={t.title}
          description={t.description}
        />

        <div className="mx-auto grid w-full max-w-(--breakpoint-lg) gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {serviceList.map(({ title, description, pro }, index) => {
            const translatedItem = t.items[index];

            return (
              <Card key={title} className="bg-muted relative h-full gap-2">
                <CardHeader>
                  <CardTitle
                    className={cn("text-lg", isArabic && "text-right")}
                  >
                    {translatedItem?.title || title}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p
                    className={cn(
                      "text-muted-foreground leading-7",
                      isArabic && "text-right"
                    )}
                  >
                    {translatedItem?.description || description}
                  </p>
                </CardContent>

                <Badge
                  data-pro={ProService.YES === pro}
                  variant="secondary"
                  className={cn(
                    "absolute data-[pro=false]:hidden",
                    isArabic ? "-top-2 -left-3" : "-top-2 -right-3"
                  )}
                >
                  {t.proLabel}
                </Badge>
              </Card>
            );
          })}
        </div>
      </div>
    </SectionContainer>
  );
};