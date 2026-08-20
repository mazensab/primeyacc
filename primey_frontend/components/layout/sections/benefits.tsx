import { cookies } from "next/headers";
import {
  ChartNoAxesCombined,
  DatabaseZap,
  Gauge,
  Layers3,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import SectionContainer from "../section-container";
import SectionHeader from "../section-header";

type AppLang = "ar" | "en";

async function getPageLang(): Promise<AppLang> {
  const cookieStore = await cookies();

  const cookieLang =
    cookieStore.get("lang")?.value ||
    cookieStore.get("locale")?.value ||
    cookieStore.get("NEXT_LOCALE")?.value ||
    "";

  return cookieLang.toLowerCase().startsWith("ar") ? "ar" : "en";
}

const benefits = [
  {
    icon: DatabaseZap,
    title: {
      ar: "بيانات مترابطة بدل الإدخال المتكرر",
      en: "Connected data instead of repeated entry",
    },
    description: {
      ar: "تنتقل آثار العمليات بين المبيعات والمشتريات والعملاء والموردين والمخزون والحسابات ضمن دورة مترابطة فتقل الحاجة إلى إعادة إدخال نفس البيانات في أكثر من مكان.",
      en: "Sales, purchases, customers, suppliers, inventory, and accounting work through connected workflows, reducing repeated data entry across separate tools.",
    },
  },
  {
    icon: ChartNoAxesCombined,
    title: {
      ar: "رؤية مالية أوضح",
      en: "Clearer financial visibility",
    },
    description: {
      ar: "تابع القيود والأرصدة والحركات والخزينة والتقارير من نفس بيئة العمل بحيث تكون الصورة المالية أقرب إلى العمليات التي أنشأتها.",
      en: "Track journals, balances, movements, treasury, and reports in the same workspace so financial visibility stays close to the operations behind it.",
    },
  },
  {
    icon: Gauge,
    title: {
      ar: "تشغيل أسرع للفريق",
      en: "Faster team operations",
    },
    description: {
      ar: "تجميع الوحدات في منصة واحدة يقلل التنقل بين الأدوات ويساعد الفرق المالية والتشغيلية على الوصول للمعلومة والإجراء المطلوب بصورة أسرع.",
      en: "Bringing modules into one platform reduces tool switching and helps financial and operational teams reach the right information and action faster.",
    },
  },
  {
    icon: Layers3,
    title: {
      ar: "منصة تنمو مع شركتك",
      en: "A platform that grows with your business",
    },
    description: {
      ar: "ابدأ بالنطاق الذي تحتاجه ثم وسع المستخدمين والوحدات والصلاحيات مع نمو عملياتك بدل تغيير النظام كلما تطورت الشركة.",
      en: "Start with the scope you need, then expand users, modules, and permissions as operations grow instead of replacing the system as your business evolves.",
    },
  },
] as const;

export const BenefitsSection = async () => {
  const lang = await getPageLang();
  const isArabic = lang === "ar";

  return (
    <SectionContainer id="benefits" className="py-10 md:py-12 lg:py-14">
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="space-y-8 md:space-y-10"
      >
        <div>
          <SectionHeader
            className={cn(
              "mx-auto max-w-3xl text-center",
              ""
            )}
            subTitle={
              isArabic ? "لماذا Mhamcloud" : "Why Mhamcloud?"
            }
            title={
              isArabic
                ? "من العمليات اليومية إلى القرار المالي"
                : "From daily operations to financial decisions"
            }
            description={
              isArabic
                ? "Mhamcloud لا يجمع الشاشات فقط بل يربط الدورة التشغيلية والمالية حتى تعمل الفرق على بيانات أوضح ويصل أثر العملية إلى المكان الصحيح."
                : "Mhamcloud does more than group screens. It connects operational and financial workflows so teams work with clearer data and each transaction reaches the right place."
            }
          />
        </div>

        <div className="grid w-full gap-4 md:grid-cols-2 lg:gap-5">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <Card
                key={benefit.title.en}
                className="group/number h-full overflow-hidden border-border/70 bg-background/90 shadow-[0_14px_36px_rgba(15,23,42,0.045)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(15,23,42,0.075)]"

              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex size-10 items-center justify-center rounded-[14px] border border-border/70 bg-muted/55 text-foreground">
                      <Icon className="size-[18px]" />
                    </div>

                    <span className="text-[42px] font-bold leading-none text-muted-foreground/15 transition group-hover/number:text-muted-foreground/30">
                      0{index + 1}
                    </span>
                  </div>

                  <CardTitle
                    className={cn(
                      "mt-2 text-xl leading-7",
                      isArabic && "text-right"
                    )}
                  >
                    {isArabic ? benefit.title.ar : benefit.title.en}
                  </CardTitle>
                </CardHeader>

                <CardContent
                  className={cn(
                    "pb-5 text-sm leading-7 text-muted-foreground sm:text-[15px]",
                    isArabic && "text-right"
                  )}
                >
                  {isArabic
                    ? benefit.description.ar
                    : benefit.description.en}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </SectionContainer>
  );
};