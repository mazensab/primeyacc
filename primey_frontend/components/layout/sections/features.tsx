"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  Calculator,
  Landmark,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  UsersRound,
} from "lucide-react";

import SectionContainer from "@/components/layout/section-container";
import SectionHeader from "@/components/layout/section-header";
import { CardTitle } from "@/components/ui/card";
import { CardHover, CardsHover } from "@/components/ui/extras/cards-hover";
import { cn } from "@/lib/utils";

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

const features = [
  {
    id: "accounting",
    icon: Calculator,
    title: {
      ar: "المحاسبة العامة",
      en: "General Accounting",
    },
    description: {
      ar: "دليل الحسابات والقيود اليومية ودفتر الأستاذ والتقارير المالية ضمن أساس محاسبي مترابط.",
      en: "Chart of accounts, journal entries, ledger, and financial reporting within a connected accounting core.",
    },
  },
  {
    id: "parties",
    icon: UsersRound,
    title: {
      ar: "العملاء والموردون",
      en: "Customers & Suppliers",
    },
    description: {
      ar: "ملفات وأرصدة وحركات مرتبطة لكل عميل ومورد لتبقى العلاقات المالية واضحة أمام فريقك.",
      en: "Connected profiles, balances, and movements for each customer and supplier.",
    },
  },
  {
    id: "sales",
    icon: ReceiptText,
    title: {
      ar: "المبيعات والفوترة",
      en: "Sales & Invoicing",
    },
    description: {
      ar: "إدارة دورة المبيعات والفواتير والتحصيلات وربط أثرها بالحسابات والمتابعة المالية.",
      en: "Manage sales, invoices, collections, and their financial impact through one workflow.",
    },
  },
  {
    id: "purchases",
    icon: ShoppingCart,
    title: {
      ar: "المشتريات والالتزامات",
      en: "Purchases & Payables",
    },
    description: {
      ar: "تابع المشتريات والموردين والالتزامات والمدفوعات ضمن دورة واضحة من العملية إلى الحساب.",
      en: "Track purchases, suppliers, obligations, and payments from transaction to accounting.",
    },
  },
  {
    id: "inventory",
    icon: Boxes,
    title: {
      ar: "المخزون والمستودعات",
      en: "Inventory & Warehouses",
    },
    description: {
      ar: "راقب المنتجات والأرصدة والمستودعات والحركات مع ربط التشغيل بالمبيعات والمشتريات.",
      en: "Monitor products, balances, warehouses, and stock movements alongside sales and purchasing.",
    },
  },
  {
    id: "treasury",
    icon: Landmark,
    title: {
      ar: "الخزينة والمدفوعات",
      en: "Treasury & Payments",
    },
    description: {
      ar: "إدارة الصناديق والحسابات البنكية والتحصيل والصرف والتحويلات من مساحة مالية موحدة.",
      en: "Manage cashboxes, bank accounts, collections, payments, and transfers from one financial workspace.",
    },
  },
  {
    id: "reports",
    icon: BarChart3,
    title: {
      ar: "التقارير والمتابعة",
      en: "Reports & Monitoring",
    },
    description: {
      ar: "حول الحركات اليومية إلى تقارير ومؤشرات تساعد الإدارة على فهم الأداء ومتابعة الوضع المالي.",
      en: "Turn daily transactions into reports and indicators that help management understand performance.",
    },
  },
  {
    id: "control",
    icon: ShieldCheck,
    title: {
      ar: "المستخدمون والصلاحيات",
      en: "Users & Permissions",
    },
    description: {
      ar: "نظم الوصول إلى الوحدات والإجراءات حسب مسؤوليات المستخدمين وحاجة الشركة.",
      en: "Control access to modules and actions according to user responsibilities and company needs.",
    },
  },
] as const;

export const FeaturesSection = () => {
  const [value, setValue] = React.useState<string | null>(null);
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

  return (
    <SectionContainer id="features" className="py-8 md:py-10 lg:py-12">
      <div dir={isArabic ? "rtl" : "ltr"}>
        <SectionHeader
          subTitle={
            isArabic ? "قدرات المنصة" : "Platform Capabilities"
          }
          title={
            isArabic
              ? "الوحدات التي تربط دورة العمل"
              : "Modules that connect your business workflow"
          }
          description={
            isArabic
              ? "كل وحدة تؤدي دورها داخل نفس البيئة مع بيانات مشتركة تساعدك على الانتقال من العملية التشغيلية إلى أثرها المالي والتقرير."
              : "Each module works within the same environment, using shared business data to connect operations with their financial impact and reporting."
          }
        />

        <CardsHover
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          value={value}
          onValueChange={setValue}
        >
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <CardHover
                key={feature.id}
                value={feature.id}
                className={cn(
                  "flex min-h-[220px] items-start gap-5",
                  isArabic && "flex-row-reverse text-right"
                )}
              >
                <div className="flex flex-1 flex-col space-y-4">
                  <CardTitle
                    className={cn(
                      "text-lg",
                      isArabic && "text-right"
                    )}
                  >
                    {isArabic ? feature.title.ar : feature.title.en}
                  </CardTitle>

                  <p
                    className={cn(
                      "text-sm font-normal leading-7 text-muted-foreground",
                      isArabic && "text-right"
                    )}
                  >
                    {isArabic
                      ? feature.description.ar
                      : feature.description.en}
                  </p>
                </div>

                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/60 text-foreground">
                  <Icon className="size-5" />
                </div>
              </CardHover>
            );
          })}
        </CardsHover>
      </div>
    </SectionContainer>
  );
};