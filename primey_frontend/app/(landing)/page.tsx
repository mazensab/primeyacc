/* ============================================================
   📂 primey_frontend/app/(landing)/page.tsx
   🧠 PrimeyAcc — Landing Home Page
   ------------------------------------------------------------
   ✅ Approved Premium landing pattern
   ✅ Approved landing layout/style preserved
   ✅ Content changed only for PrimeyAcc
   ✅ Arabic/English metadata and structured data
   ✅ Images/social accounts kept temporarily until approved replacements
   ✅ No localhost / no fake data
   ✅ No className/design/section-order changes
============================================================ */

import { cookies } from "next/headers";
import type { Metadata } from "next";

import { ChatWidget } from "@/components/chat-widget";
import { BenefitsSection } from "@/components/layout/sections/benefits";
import { ContactSection } from "@/components/layout/sections/contact";
import { FAQSection } from "@/components/layout/sections/faq";
import { FeaturesSection } from "@/components/layout/sections/features";
import { FooterSection } from "@/components/layout/sections/footer";
import { HeroSection } from "@/components/layout/sections/hero";
import { NewsletterSection } from "@/components/layout/sections/newsletter";
import { PricingSection } from "@/components/layout/sections/pricing";
import { ServicesSection } from "@/components/layout/sections/services";
import { SponsorsSection } from "@/components/layout/sections/sponsors";
import { TestimonialSection } from "@/components/layout/sections/testimonial";

/* =========================================================
   🌐 Language Helpers
========================================================= */
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

function getPageDirection(lang: AppLang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

/* =========================================================
   🧾 Dynamic Metadata
========================================================= */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getPageLang();
  const isArabic = lang === "ar";

  const title = isArabic
    ? "PrimeyAcc | نظام محاسبي وإداري سحابي"
    : "PrimeyAcc | Cloud Accounting and ERP Platform";

  const description = isArabic
    ? "PrimeyAcc نظام محاسبي وإداري سحابي يساعد الشركات على إدارة الفواتير المبيعات المشتريات المخزون الخزينة المدفوعات التقارير والعمليات اليومية من منصة واحدة."
    : "PrimeyAcc is a cloud accounting and ERP platform that helps businesses manage invoices, sales, purchases, inventory, treasury, payments, reports, and daily operations from one place.";

  const imageAlt = isArabic
    ? "PrimeyAcc نظام محاسبي وإداري سحابي"
    : "PrimeyAcc cloud accounting and ERP platform";

  return {
    title,
    description,
    keywords: isArabic
      ? [
          "PrimeyAcc",
          "برايمي أك",
          "نظام محاسبي سحابي",
          "ERP سعودي",
          "فواتير إلكترونية",
          "إدارة المخزون",
          "إدارة المبيعات",
          "إدارة المشتريات",
          "الخزينة والمدفوعات",
          "تقارير مالية",
          "ضريبة القيمة المضافة",
        ]
      : [
          "PrimeyAcc",
          "cloud accounting",
          "ERP platform",
          "Saudi ERP",
          "invoice management",
          "inventory management",
          "sales management",
          "purchase management",
          "treasury and payments",
          "financial reports",
          "VAT accounting",
        ],
    alternates: {
      canonical: "/",
      languages: {
        ar: "/",
        en: "/",
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
          alt: imageAlt,
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

/* =========================================================
   🧩 Structured Data
========================================================= */
function buildStructuredData(lang: AppLang) {
  const isArabic = lang === "ar";

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PrimeyAcc",
    url: "/",
    logo: "/hero logo.png",
    description: isArabic
      ? "PrimeyAcc منصة محاسبية وإدارية سحابية تساعد الشركات على تنظيم الفواتير والمخزون والمبيعات والمشتريات والتقارير."
      : "PrimeyAcc is a cloud accounting and ERP platform for invoices, inventory, sales, purchases, treasury, and reports.",
    sameAs: [
      "https://www.facebook.com/mhamcloud",
      "https://www.instagram.com/mhamcloud",
      "https://twitter.com/mhamcloud",
      "https://www.youtube.com/@mhamcloud",
      "https://in.linkedin.com/company/mhamcloud",
    ],
  };
}

/* =========================================================
   🏠 Landing Home Page
========================================================= */
export default async function Home() {
  const lang = await getPageLang();
  const dir = getPageDirection(lang);
  const structuredData = buildStructuredData(lang);

  return (
    <main lang={lang} dir={dir} className="w-full" suppressHydrationWarning>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      {/* الصفحة الرئيسية */}
      <HeroSection />

      {/* القطاعات والأنشطة */}
      <SponsorsSection />

      {/* لماذا PrimeyAcc */}
      <BenefitsSection />

      {/* وحدات النظام والمزايا */}
      <FeaturesSection />

      {/* حلول PrimeyAcc */}
      <ServicesSection />

      {/* الباقات والاشتراكات */}
      <PricingSection />

      {/* حالات الاستخدام */}
      <TestimonialSection />

      {/* التواصل */}
      <ContactSection />

      {/* الأسئلة الشائعة */}
      <FAQSection />

      {/* التحديثات والنشرة */}
      <NewsletterSection />

      {/* الفوتر */}
      <FooterSection />

      {/* الدعم العائم */}
      <ChatWidget />
    </main>
  );
}