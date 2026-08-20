import { cookies } from "next/headers";
import {
  BarChart3,
  Boxes,
  Building2,
  Calculator,
  CreditCard,
  Landmark,
  PlugZap,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  UsersRound,
} from "lucide-react";

import { InfiniteSlider } from "@/components/ui/extras/infinite-slider";

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

const capabilities = [
  {
    icon: Calculator,
    ar: "المحاسبة والمالية",
    en: "Accounting & Finance",
  },
  {
    icon: ReceiptText,
    ar: "المبيعات والفوترة",
    en: "Sales & Invoicing",
  },
  {
    icon: ShoppingCart,
    ar: "المشتريات",
    en: "Purchases",
  },
  {
    icon: Boxes,
    ar: "المخزون والمستودعات",
    en: "Inventory & Warehouses",
  },
  {
    icon: UsersRound,
    ar: "العملاء والموردون",
    en: "Customers & Suppliers",
  },
  {
    icon: Landmark,
    ar: "الخزينة",
    en: "Treasury",
  },
  {
    icon: CreditCard,
    ar: "المدفوعات",
    en: "Payments",
  },
  {
    icon: BarChart3,
    ar: "التقارير",
    en: "Reports",
  },
  {
    icon: ShieldCheck,
    ar: "الصلاحيات والرقابة",
    en: "Permissions & Control",
  },
  {
    icon: Building2,
    ar: "إدارة الفروع",
    en: "Branch Management",
  },
  {
    icon: PlugZap,
    ar: "التكاملات",
    en: "Integrations",
  },
] as const;

export const SponsorsSection = async () => {
  const lang = await getPageLang();
  const isArabic = lang === "ar";

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className="pb-12 pt-4 lg:pb-20 lg:pt-6"
    >
      <div className="container">
        <div className="mx-auto mb-6 max-w-3xl text-center">
          <p className="text-sm font-semibold text-foreground sm:text-base">
            {isArabic
              ? "منصة واحدة تربط أهم عمليات شركتك"
              : "One platform connecting your core business operations"}
          </p>

          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {isArabic
              ? "بدل توزيع البيانات بين أنظمة منفصلة اجمع الدورة المالية والتشغيلية داخل Mhamcloud."
              : "Instead of splitting data across disconnected systems, bring financial and operational workflows together in Mhamcloud."}
          </p>
        </div>
      </div>

      <div className="container mask-r-from-50% mask-r-to-90% mask-l-from-50% mask-l-to-90%">
        <InfiniteSlider gap={18} speedOnHover={30} reverse={isArabic}>
          {capabilities.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.en}
                className="flex items-center gap-3 rounded-full border border-border/70 bg-background/75 px-5 py-3 text-sm font-semibold text-foreground shadow-sm backdrop-blur-xl sm:text-base"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                  <Icon className="size-4" />
                </span>

                <span className="whitespace-nowrap">
                  {isArabic ? item.ar : item.en}
                </span>
              </div>
            );
          })}
        </InfiniteSlider>
      </div>
    </section>
  );
};