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
    ? "Primey Care | بطاقة وبرامج رعاية صحية بخصومات طبية"
    : "Primey Care | Healthcare Cards and Medical Benefits";

  const description = isArabic
    ? "Primey Care بطاقة وبرامج رعاية صحية تمنحك مزايا وخصومات طبية مختارة على الكشف، التحاليل، الأشعة، الأسنان، الجلدية، التجميل، الولادة وخدمات صحية متنوعة لدى مزودي خدمة مشاركين."
    : "Primey Care offers healthcare cards and programs with selected medical benefits and discounts on consultations, lab tests, scans, dental care, dermatology, beauty, maternity, and other healthcare services through participating providers.";

  const imageAlt = isArabic
    ? "Primey Care بطاقة وبرامج رعاية صحية"
    : "Primey Care healthcare cards and programs";

  return {
    title,
    description,
    keywords: isArabic
      ? [
          "Primey Care",
          "برايمي كير",
          "بطاقة رعاية صحية",
          "خصومات طبية",
          "بطاقة خصم طبي",
          "برامج صحية",
          "خصومات أسنان",
          "خصومات تحاليل",
          "خصومات جلدية وتجميل",
          "رعاية صحية",
        ]
      : [
          "Primey Care",
          "healthcare card",
          "medical discount card",
          "healthcare benefits",
          "medical programs",
          "dental discounts",
          "lab test discounts",
          "dermatology discounts",
          "family healthcare card",
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
      siteName: "Primey Care",
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
    name: "Primey Care",
    url: "/",
    logo: "/hero logo.png",
    description: isArabic
      ? "Primey Care بطاقة وبرامج رعاية صحية تمنح العملاء مزايا وخصومات طبية مختارة لدى مزودي خدمة مشاركين."
      : "Primey Care offers healthcare cards and programs with selected medical benefits through participating providers.",
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

      {/* التخصصات والشبكة الطبية */}
      <SponsorsSection />

      {/* لماذا Primey Care؟ */}
      <BenefitsSection />

      {/* الخدمات الصحية والمزايا */}
      <FeaturesSection />

      {/* البطاقات والبرامج */}
      <ServicesSection />

      {/* الاشتراكات */}
      <PricingSection />

      {/* تجارب العملاء */}
      <TestimonialSection />

      {/* التواصل */}
      <ContactSection />

      {/* الأسئلة الشائعة */}
      <FAQSection />

      {/* العروض والتحديثات */}
      <NewsletterSection />

      {/* الفوتر */}
      <FooterSection />

      {/* الدعم العائم */}
      <ChatWidget />
    </main>
  );
}