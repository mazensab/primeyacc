import { cookies } from "next/headers";

import { FAQList } from "@/@data/faq";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import SectionHeader from "../section-header";
import SectionContainer from "../section-container";

/* =========================================================
   🌐 Language Types
========================================================= */
type AppLang = "ar" | "en";

type FAQItemTranslation = {
  question: string;
  answer: string;
};

type FAQContent = {
  subTitle: string;
  title: string;
  items: FAQItemTranslation[];
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
const faqContent: Record<AppLang, FAQContent> = {
  ar: {
    subTitle: "الأسئلة الشائعة",
    title: "كل ما تحتاج معرفته قبل الاشتراك",
    items: [
      {
        question: "هل Primey Care تأمين طبي؟",
        answer:
          "لا، Primey Care ليست تأمينًا طبيًا ولا تغني عن التأمين الصحي. هي بطاقة وبرامج مزايا وخصومات طبية تساعدك على الاستفادة من عروض وأسعار مخفضة لدى مزودي خدمة مشاركين حسب الشروط المتاحة.",
      },
      {
        question: "كيف أستفيد من بطاقة Primey Care؟",
        answer:
          "بعد الاشتراك وتفعيل البطاقة أو البرنامج، يمكنك استخدام بيانات عضويتك لدى مقدم الخدمة المشارك للاستفادة من الخصم أو الميزة المتاحة حسب نوع الخدمة وشروط العرض.",
      },
      {
        question: "هل الخصومات ثابتة على جميع الخدمات؟",
        answer:
          "تختلف الخصومات والمزايا حسب مقدم الخدمة، نوع الخدمة، المدينة، البرنامج المختار، والعرض المتاح وقت الاستخدام. لذلك ننصح دائمًا بمراجعة تفاصيل الميزة قبل زيارة مقدم الخدمة.",
      },
      {
        question: "هل البطاقة مناسبة للأفراد والعائلات؟",
        answer:
          "نعم، Primey Care توفر خيارات مناسبة للأفراد والعائلات حسب نوع البطاقة أو البرنامج. بعض الخيارات قد تكون فردية، وبعضها قد يدعم أكثر من مستفيد وفق شروط الاشتراك.",
      },
      {
        question: "ما نوع الخدمات التي يمكن أن تشملها المزايا؟",
        answer:
          "يمكن أن تشمل المزايا الكشف والاستشارات، التحاليل، الأشعة، الأسنان، الجلدية، التجميل، النساء والولادة، الفحوصات الدورية، وبعض الخدمات الصحية المختارة حسب الشبكة والبرنامج.",
      },
      {
        question: "كيف أعرف المراكز أو مقدمي الخدمة المشاركين؟",
        answer:
          "يمكنك معرفة الشبكة الطبية والمراكز المشاركة من خلال قنوات Primey Care المعتمدة، أو عبر التواصل معنا قبل الاشتراك للتأكد من توفر الخدمة أو العرض المناسب في مدينتك.",
      },
    ],
  },
  en: {
    subTitle: "FAQS",
    title: "Everything You Need to Know Before Joining",
    items: [
      {
        question: "Is Primey Care medical insurance?",
        answer:
          "No. Primey Care is not medical insurance and does not replace health insurance. It is a healthcare benefits and discount card that helps you access selected offers and reduced prices through participating providers, subject to available terms.",
      },
      {
        question: "How do I use my Primey Care card?",
        answer:
          "After subscribing and activating your card or program, you can use your membership details at a participating provider to access the available discount or benefit according to the service type and offer terms.",
      },
      {
        question: "Are discounts fixed across all services?",
        answer:
          "Discounts and benefits may vary depending on the provider, service type, city, selected program, and available offer at the time of use. We recommend checking the benefit details before visiting the provider.",
      },
      {
        question: "Is the card suitable for individuals and families?",
        answer:
          "Yes. Primey Care offers options for individuals and families depending on the card or program type. Some options may be individual, while others may support more than one beneficiary according to subscription terms.",
      },
      {
        question: "What services can the benefits include?",
        answer:
          "Benefits may include consultations, lab tests, scans, dental care, dermatology, beauty services, maternity, routine checkups, and selected healthcare services depending on the network and program.",
      },
      {
        question: "How can I know the participating providers?",
        answer:
          "You can check the healthcare network and participating providers through Primey Care’s approved channels, or contact us before subscribing to confirm the right service or offer in your city.",
      },
    ],
  },
};

/* =========================================================
   🧩 Section
========================================================= */
export const FAQSection = async () => {
  const lang = await getPageLang();
  const isArabic = lang === "ar";
  const t = faqContent[lang];

  return (
    <SectionContainer id="faq">
      <div dir={isArabic ? "rtl" : "ltr"}>
        <SectionHeader subTitle={t.subTitle} title={t.title} />

        <div className="max-w-(--breakpoint-sm) mx-auto">
          <Accordion type="single" collapsible className="AccordionRoot">
            {FAQList.map(({ question, answer, value }, index) => {
              const translatedItem = t.items[index];

              return (
                <AccordionItem key={value} value={value}>
                  <AccordionTrigger
                    className={cn(
                      "text-lg",
                      isArabic ? "text-right" : "text-left"
                    )}
                  >
                    {translatedItem?.question || question}
                  </AccordionTrigger>

                  <AccordionContent
                    className={cn(
                      "text-base text-muted-foreground leading-7",
                      isArabic && "text-right"
                    )}
                  >
                    {translatedItem?.answer || answer}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </div>
    </SectionContainer>
  );
};