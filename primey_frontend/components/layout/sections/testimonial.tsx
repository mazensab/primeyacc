"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calculator,
  GitBranch,
  PackageSearch,
  ReceiptText,
  Store,
} from "lucide-react";

import SectionContainer from "@/components/layout/section-container";
import SectionHeader from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

type AppLang = "ar" | "en";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function getCurrentLang(): AppLang {
  const cookieLang =
    getCookie("lang") ||
    getCookie("locale") ||
    getCookie("NEXT_LOCALE") ||
    "";

  return cookieLang.toLowerCase().startsWith("ar") ? "ar" : "en";
}

const useCases = [
  {
    icon: Store,
    title: {
      ar: "الشركات التجارية",
      en: "Trading Companies",
    },
    description: {
      ar: "اربط المبيعات والمشتريات والعملاء والموردين والمخزون والحسابات ضمن دورة واحدة.",
      en: "Connect sales, purchases, customers, suppliers, inventory, and accounting in one workflow.",
    },
  },
  {
    icon: ReceiptText,
    title: {
      ar: "شركات الخدمات",
      en: "Service Businesses",
    },
    description: {
      ar: "نظم الفوترة والتحصيل والمصروفات والعملاء والتقارير المالية دون الاعتماد على ملفات متفرقة.",
      en: "Organize invoicing, collections, expenses, customers, and financial reporting without scattered files.",
    },
  },
  {
    icon: PackageSearch,
    title: {
      ar: "التجزئة والمخزون",
      en: "Retail & Inventory",
    },
    description: {
      ar: "تابع المنتجات والمستودعات والحركات وربطها بالمبيعات والمشتريات والمحاسبة.",
      en: "Track products, warehouses, and stock movements alongside sales, purchases, and accounting.",
    },
  },
  {
    icon: GitBranch,
    title: {
      ar: "الشركات متعددة الفروع",
      en: "Multi-Branch Businesses",
    },
    description: {
      ar: "هيئ نطاق التشغيل والمستخدمين والصلاحيات بما يناسب توسع الشركة وفروعها.",
      en: "Configure operating scope, users, and permissions to support company and branch growth.",
    },
  },
  {
    icon: Calculator,
    title: {
      ar: "فرق المالية والمحاسبة",
      en: "Finance & Accounting Teams",
    },
    description: {
      ar: "اجمع القيود والأستاذ والخزينة والأرصدة والتقارير في مساحة عمل أقرب إلى العمليات اليومية.",
      en: "Bring journals, ledger, treasury, balances, and reports closer to daily business operations.",
    },
  },
  {
    icon: Building2,
    title: {
      ar: "المنشآت النامية",
      en: "Growing Businesses",
    },
    description: {
      ar: "ابدأ بالنطاق الذي تحتاجه ثم وسع الوحدات والمستخدمين مع تطور حجم العمل.",
      en: "Start with the scope you need and expand modules and users as your business grows.",
    },
  },
] as const;

export const TestimonialSection = () => {
  const [lang, setLang] = useState<AppLang>("en");

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
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  return (
    <SectionContainer id="use-cases" className="py-8 md:py-10 lg:py-12">
      <div dir={isArabic ? "rtl" : "ltr"}>
        <SectionHeader
          subTitle={
            isArabic ? "حالات الاستخدام" : "Use Cases"
          }
          title={
            isArabic
              ? "Mhamcloud يناسب طريقة عمل شركتك"
              : "Mhamcloud adapts to how your business operates"
          }
          description={
            isArabic
              ? "بدل شهادات غير موثقة نوضح أين يمكن أن يخدم Mhamcloud فعليا بحسب طبيعة التشغيل والوحدات المطلوبة."
              : "Rather than unverified testimonials, here is where Mhamcloud can fit based on your operating model and required modules."
          }
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.title.en}
                className="group border-border/70 bg-background/80 shadow-[0_16px_42px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(15,23,42,0.09)]"
              >
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-muted/60 text-foreground">
                    <Icon className="size-5" />
                  </div>

                  <CardTitle className="mt-5 text-xl">
                    {isArabic ? item.title.ar : item.title.en}
                  </CardTitle>

                  <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">
                    {isArabic
                      ? item.description.ar
                      : item.description.en}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-7 flex justify-center">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/register">
              {isArabic
                ? "حدد احتياج شركتك"
                : "Tell us what your business needs"}

              <ArrowIcon className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </SectionContainer>
  );
};