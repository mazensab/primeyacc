import { cookies } from "next/headers";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import SectionHeader from "../section-header";
import SectionContainer from "../section-container";

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

const faqItems = [
  {
    question: {
      ar: "ما هو Mhamcloud",
      en: "What is Mhamcloud?",
    },
    answer: {
      ar: "Mhamcloud منصة محاسبية وإدارية لإدارة العمليات المالية والتشغيلية مثل المحاسبة والمبيعات والمشتريات والعملاء والموردين والمخزون والخزينة والتقارير من بيئة عمل مترابطة.",
      en: "Mhamcloud is an accounting and business management platform for connected financial and operational workflows including accounting, sales, purchases, customers, suppliers, inventory, treasury, and reporting.",
    },
  },
  {
    question: {
      ar: "هل يمكن البدء بوحدات محددة ثم التوسع لاحقا",
      en: "Can we start with selected modules and expand later?",
    },
    answer: {
      ar: "نعم. يتم تحديد نطاق الاشتراك والتهيئة بحسب احتياج المنشأة ويمكن توسيع الوحدات والمستخدمين والصلاحيات مع نمو العمليات وفق الباقة والنطاق المتاح.",
      en: "Yes. Subscription and setup scope can be defined around your current needs, then expanded with additional modules, users, and permissions as operations grow according to the available plan and scope.",
    },
  },
  {
    question: {
      ar: "هل يدعم Mhamcloud عدة مستخدمين وصلاحيات مختلفة",
      en: "Does Mhamcloud support multiple users and permissions?",
    },
    answer: {
      ar: "يدعم النظام إدارة المستخدمين والصلاحيات بحيث يمكن تنظيم الوصول إلى الوحدات والإجراءات وفق مسؤوليات كل مستخدم ونطاق عمله.",
      en: "The platform supports users and permissions so access to modules and actions can be organized according to each user's responsibilities and operating scope.",
    },
  },
  {
    question: {
      ar: "هل توجد إدارة للمخزون والمستودعات",
      en: "Does Mhamcloud include inventory and warehouse management?",
    },
    answer: {
      ar: "نعم يتضمن Mhamcloud نطاقا لإدارة المنتجات والمخزون والمستودعات والحركات وربطها بالعمليات ذات الصلة مثل المبيعات والمشتريات.",
      en: "Yes. Mhamcloud includes product, inventory, warehouse, and stock movement management connected with related workflows such as sales and purchases.",
    },
  },
  {
    question: {
      ar: "هل الخزينة والمدفوعات مرتبطة بالحسابات",
      en: "Are treasury and payments connected to accounting?",
    },
    answer: {
      ar: "تم تصميم وحدات الخزينة والمدفوعات لتعمل ضمن الدورة المالية للنظام بما يشمل الصناديق والحسابات البنكية والتحصيل والصرف والحركات المرتبطة.",
      en: "Treasury and payment modules are designed to operate within the platform's financial workflow, including cashboxes, bank accounts, collections, payments, and related movements.",
    },
  },
  {
    question: {
      ar: "كيف يتم تحديد الباقة والسعر",
      en: "How are the plan and price determined?",
    },
    answer: {
      ar: "يتم تحديد النطاق المناسب بناء على احتياج الشركة وعدد المستخدمين والوحدات المطلوبة وطبيعة التشغيل. يمكنك إرسال طلب تجربة أو التواصل معنا للحصول على التفاصيل المناسبة.",
      en: "The appropriate scope is determined based on company needs, number of users, required modules, and operating model. You can request a trial or contact us for the appropriate details.",
    },
  },
  {
    question: {
      ar: "هل بيانات كل شركة منفصلة عن الشركات الأخرى",
      en: "Is each company's data separated from other companies?",
    },
    answer: {
      ar: "Mhamcloud مبني حول نطاق الشركة وصلاحيات الوصول بحيث تدار بيانات وعمليات كل منشأة ضمن نطاقها المخصص في النظام.",
      en: "Mhamcloud is built around company scope and access permissions so each organization's data and operations are managed within its assigned system scope.",
    },
  },
] as const;

export const FAQSection = async () => {
  const lang = await getPageLang();
  const isArabic = lang === "ar";

  return (
    <SectionContainer id="faq" className="py-8 md:py-10 lg:py-12">
      <div dir={isArabic ? "rtl" : "ltr"}>
        <SectionHeader
          subTitle={
            isArabic ? "الأسئلة الشائعة" : "FAQ"
          }
          title={
            isArabic
              ? "قبل أن تبدأ مع Mhamcloud"
              : "Before you get started with Mhamcloud"
          }
          description={
            isArabic
              ? "إجابات مختصرة عن نطاق المنصة وطريقة التهيئة والوحدات الأساسية."
              : "Quick answers about the platform scope, setup approach, and core modules."
          }
        />

        <Accordion
          type="single"
          collapsible
          className="mx-auto w-full max-w-4xl"
        >
          {faqItems.map((item, index) => (
            <AccordionItem
              key={item.question.en}
              value={`item-${index + 1}`}
              className="border-border/70"
            >
              <AccordionTrigger
                className={cn(
                  "text-base font-semibold sm:text-lg",
                  isArabic && "text-right"
                )}
              >
                {isArabic ? item.question.ar : item.question.en}
              </AccordionTrigger>

              <AccordionContent
                className={cn(
                  "text-sm leading-8 text-muted-foreground sm:text-base",
                  isArabic && "text-right"
                )}
              >
                {isArabic ? item.answer.ar : item.answer.en}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SectionContainer>
  );
};