/* ============================================================
   📂 primey_frontend/app/(landing)/pricing/page.tsx
   🧠 PrimeyAcc — Landing Pricing Page
   ------------------------------------------------------------
   ✅ Approved Premium pricing page wrapper
   ✅ Same landing layout pattern preserved
   ✅ Uses shared PricingSection
   ✅ Content/details will be controlled from pricing section
   ✅ No localhost / no fake API calls in this page
   ✅ No className/design changes outside this page
============================================================ */

import { cookies } from "next/headers";
import type { Metadata } from "next";

import { ChatWidget } from "@/components/chat-widget";
import { FAQSection } from "@/components/layout/sections/faq";
import { FooterSection } from "@/components/layout/sections/footer";
import { NewsletterSection } from "@/components/layout/sections/newsletter";
import { PricingSection } from "@/components/layout/sections/pricing";

type AppLang = "ar" | "en";

function normalizeLang(value?: string | null): AppLang {
  const normalized = (value || "").trim().toLowerCase();

  if (
    normalized === "ar" ||
    normalized.startsWith("ar-") ||
    normalized.startsWith("ar_")
  ) {
    return "ar";
  }

  return "en";
}

async function getPageLang(): Promise<AppLang> {
  const cookieStore = await cookies();

  const cookieLang =
    cookieStore.get("lang")?.value ||
    cookieStore.get("locale")?.value ||
    cookieStore.get("NEXT_LOCALE")?.value;

  return normalizeLang(cookieLang);
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getPageLang();
  const isArabic = lang === "ar";

  const title = isArabic
    ? "باقات Mhamcloud | خطط الاشتراك"
    : "Mhamcloud Pricing | Subscription Plans";

  const description = isArabic
    ? "استعرض باقات Mhamcloud المناسبة للشركات مع وحدات المحاسبة المبيعات المشتريات المخزون الخزينة والتقارير."
    : "Explore Mhamcloud subscription plans for businesses, including accounting, sales, purchases, inventory, treasury, and reporting modules.";

  return {
    title,
    description,
    alternates: {
      canonical: "/pricing",
      languages: {
        ar: "/pricing",
        en: "/pricing",
      },
    },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: "PrimeyAcc",
      locale: isArabic ? "ar_SA" : "en_US",
      images: [
        {
          url: "/seo.jpg",
          width: 1200,
          height: 630,
          alt: isArabic ? "باقات Mhamcloud" : "Mhamcloud pricing plans",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/seo.jpg"],
    },
  };
}

export default async function LandingPricingPage() {
  const lang = await getPageLang();
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <main lang={lang} dir={dir} className="min-h-screen w-full">
      <PricingSection />

      {/* FAQ */}
      <FAQSection />

      {/* Newsletter */}
      <NewsletterSection />

      {/* Footer */}
      <FooterSection />

      {/* Floating support */}
      <ChatWidget />
    </main>
  );
}