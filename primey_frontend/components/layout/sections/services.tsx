import { cookies } from "next/headers";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  Calculator,
  Landmark,
  ReceiptText,
  ShoppingCart,
  Sparkles,
} from "lucide-react";

import SectionContainer from "@/components/layout/section-container";

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

const solutions = [
  {
    id: "accounting",
    icon: Calculator,
    badge: {
      ar: "الأساس المالي",
      en: "Financial Core",
    },
    title: {
      ar: "المحاسبة العامة",
      en: "General Accounting",
    },
    description: {
      ar: "دليل حسابات وقيود ودفاتر وتقارير مالية مترابطة تمنحك رؤية أوضح للحركة المالية.",
      en: "Connected chart of accounts, journals, ledgers, and financial reports for clearer visibility.",
    },
  },
  {
    id: "sales",
    icon: ReceiptText,
    badge: {
      ar: "الإيرادات",
      en: "Revenue",
    },
    title: {
      ar: "المبيعات والفوترة",
      en: "Sales & Invoicing",
    },
    description: {
      ar: "نظم العملاء والفواتير والتحصيلات ودورة المبيعات من بداية العملية حتى انعكاسها المالي.",
      en: "Manage customers, invoices, collections, and the sales cycle through its financial impact.",
    },
  },
  {
    id: "purchases",
    icon: ShoppingCart,
    badge: {
      ar: "المصروفات",
      en: "Spend",
    },
    title: {
      ar: "المشتريات والموردون",
      en: "Purchases & Suppliers",
    },
    description: {
      ar: "تابع الموردين والمشتريات والمدفوعات والالتزامات ضمن دورة تشغيلية ومالية واحدة.",
      en: "Track suppliers, purchases, payments, and obligations in one operational and financial flow.",
    },
  },
  {
    id: "inventory",
    icon: Boxes,
    badge: {
      ar: "التشغيل",
      en: "Operations",
    },
    title: {
      ar: "المخزون والمستودعات",
      en: "Inventory & Warehouses",
    },
    description: {
      ar: "راقب المنتجات والمستودعات والحركات والأرصدة لتبقى صورة المخزون واضحة أمام فريقك.",
      en: "Track products, warehouses, stock movements, and balances with clearer operational visibility.",
    },
  },
  {
    id: "treasury",
    icon: Landmark,
    badge: {
      ar: "السيولة",
      en: "Liquidity",
    },
    title: {
      ar: "الخزينة والمدفوعات",
      en: "Treasury & Payments",
    },
    description: {
      ar: "إدارة الصناديق والحسابات البنكية والتحصيل والصرف والتحويلات مع تتبع مالي متكامل.",
      en: "Manage cashboxes, bank accounts, collections, payments, and transfers in one treasury workflow.",
    },
  },
  {
    id: "reports",
    icon: BarChart3,
    badge: {
      ar: "الرؤية",
      en: "Visibility",
    },
    title: {
      ar: "التقارير والإدارة",
      en: "Reports & Management",
    },
    description: {
      ar: "حول بياناتك التشغيلية والمالية إلى مؤشرات وتقارير تساعد الإدارة على المتابعة واتخاذ القرار.",
      en: "Turn financial and operational data into reports and indicators that support better decisions.",
    },
  },
] as const;

export const ServicesSection = async () => {
  const lang = await getPageLang();
  const isArabic = lang === "ar";
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  return (
    <SectionContainer id="solutions" className="py-8 md:py-10 lg:py-12">
      <section
        dir={isArabic ? "rtl" : "ltr"}
        className="relative overflow-hidden py-2 sm:py-3 lg:py-4"
      >
        <div className="mx-auto mb-6 max-w-3xl text-center lg:mb-7">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4" />

            <span>
              {isArabic ? "حلول Mhamcloud" : "Mhamcloud Solutions"}
            </span>
          </div>

          <h2 className="mt-3 text-3xl font-semibold leading-[1.18] tracking-[-0.035em] text-foreground sm:text-4xl lg:text-[44px]">
            {isArabic
              ? "وحدات مترابطة حول دورة عمل شركتك"
              : "Connected modules around your business workflow"}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {isArabic
              ? "بدل العمل بين أدوات منفصلة اجمع العمليات المالية والتشغيلية في منصة واحدة تتشارك نفس البيانات وتمنح كل فريق ما يحتاجه."
              : "Instead of working across disconnected tools, bring financial and operational workflows into one platform built around shared business data."}
          </p>

          <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-foreground/40 to-transparent" />
        </div>

        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {solutions.map((solution) => {
            const Icon = solution.icon;

            return (
              <article
                key={solution.id}
                className="group relative flex w-[82vw] max-w-[330px] shrink-0 snap-center flex-col overflow-hidden rounded-[22px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.90)_0%,rgba(248,250,252,0.78)_100%)] shadow-[0_16px_42px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_58px_rgba(15,23,42,0.11)] sm:w-auto sm:max-w-none dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(17,24,39,0.88)_0%,rgba(3,7,18,0.82)_100%)] dark:hover:border-white/20"
              >
                <div className="relative min-h-[132px] overflow-hidden border-b border-border/60 bg-[radial-gradient(circle_at_20%_16%,rgba(148,163,184,0.16),transparent_34%),linear-gradient(145deg,#f8fafc_0%,#eef2f7_52%,#e2e8f0_100%)] dark:bg-[radial-gradient(circle_at_20%_16%,rgba(255,255,255,0.08),transparent_34%),linear-gradient(145deg,#111827_0%,#0f172a_52%,#030712_100%)]">
                  <div className="absolute -left-12 -top-12 size-40 rounded-full border border-white/65 dark:border-white/10" />

                  <div className="absolute -bottom-16 -right-10 size-44 rounded-full border border-slate-400/15" />

                  <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                    <div className="flex size-14 items-center justify-center rounded-[18px] border border-white/80 bg-white/72 text-slate-900 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80 dark:text-white">
                      <Icon className="size-6" />
                    </div>
                  </div>

                  <span className="absolute end-3 top-3 rounded-full border border-border/70 bg-background/88 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm backdrop-blur-xl">
                    {isArabic ? solution.badge.ar : solution.badge.en}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <h3 className="text-lg font-semibold leading-7 text-foreground">
                    {isArabic ? solution.title.ar : solution.title.en}
                  </h3>

                  <p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">
                    {isArabic
                      ? solution.description.ar
                      : solution.description.en}
                  </p>

                  <Link
                    href="/register"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition hover:opacity-70"
                  >
                    {isArabic ? "استكشف الحل" : "Explore solution"}

                    <ArrowIcon className="size-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </SectionContainer>
  );
};