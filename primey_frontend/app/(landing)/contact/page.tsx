/* ============================================================
   📂 primey_frontend/app/(landing)/contact/page.tsx
   🧠 PrimeyAcc — Landing Contact Page
   ------------------------------------------------------------
   ✅ Approved Premium contact page pattern
   ✅ Approved landing layout/style preserved
   ✅ Content changed only for PrimeyAcc
   ✅ ContactSection / FAQ / Newsletter / Footer preserved
   ✅ Arabic/English metadata and page content
   ✅ Images/social accounts kept temporarily until approved replacements
   ✅ No localhost / no fake data
   ✅ No className/design changes
============================================================ */

import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { ChatWidget } from "@/components/chat-widget";
import { ContactSection } from "@/components/layout/sections/contact";
import { FAQSection } from "@/components/layout/sections/faq";
import { FooterSection } from "@/components/layout/sections/footer";
import { NewsletterSection } from "@/components/layout/sections/newsletter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

/* =========================================================
   🧾 Metadata
========================================================= */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getPageLang();
  const isArabic = lang === "ar";

  const title = isArabic
    ? "تواصل مع Mhamcloud | استفسر عن الباقات والنظام"
    : "Contact Mhamcloud | Ask About Plans and Platform";

  const description = isArabic
    ? "تواصل مع Mhamcloud للاستفسار عن الباقات، وحدات النظام، التسجيل، وتجهيز شركتك على المنصة."
    : "Contact Mhamcloud to ask about plans, system modules, registration, and preparing your company on the platform.";

  return {
    title,
    description,
    keywords: isArabic
      ? [
          "تواصل Mhamcloud",
          "مهام السحابي",
          "استفسار نظام محاسبي",
          "نظام ERP",
          "إدارة الفواتير",
          "إدارة المخزون",
          "اشتراك Mhamcloud",
        ]
      : [
          "Contact Mhamcloud",
          "Mhamcloud support",
          "cloud accounting inquiry",
          "ERP modules",
          "business management platform",
          "inventory and sales management",
          "Mhamcloud subscription",
        ],
    alternates: {
      canonical: "/contact",
      languages: {
        ar: "/contact",
        en: "/contact",
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
          alt: isArabic ? "تواصل مع Mhamcloud" : "Contact Mhamcloud",
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
   📝 Localized Content
========================================================= */
const content = {
  ar: {
    badge: "تواصل مع Mhamcloud",
    title: "نساعدك تختار الباقة والوحدات الأنسب لشركتك",
    description:
      "لديك سؤال عن الباقات، الفواتير، المخزون، المبيعات، المشتريات، الموارد البشرية أو طريقة بدء استخدام النظام؟ أرسل استفسارك وسنساعدك في اختيار المسار المناسب.",
    primaryButton: "أرسل طلب تجربة",
    secondaryButton: "عرض الباقات",
    note:
      "Mhamcloud منصة محاسبية وإدارية سحابية، وتختلف الوحدات والحدود حسب الباقة المفعلة من لوحة النظام.",
    cards: [
      {
        title: "استفسار عن الباقات",
        description:
          "اعرف الفرق بين الباقات الشهرية والسنوية والحدود المتاحة لكل شركة حسب احتياجك.",
      },
      {
        title: "تجهيز شركتك",
        description:
          "اسأل عن طريقة بدء استخدام النظام وتجهيز المستخدمين والصلاحيات والوحدات المناسبة.",
      },
      {
        title: "مساعدة في الاختيار",
        description:
          "نساعدك في تحديد الباقة والوحدات الأنسب لنشاطك قبل التسجيل أو الاشتراك.",
      },
    ],
    quickLinksTitle: "روابط قد تهمك",
    quickLinks: [
      {
        label: "المزايا",
        href: "/#benefits",
      },
      {
        label: "وحدات النظام",
        href: "/#features",
      },
      {
        label: "الباقات",
        href: "/pricing",
      },
      {
        label: "الأسئلة الشائعة",
        href: "/#faq",
      },
    ],
  },
  en: {
    badge: "Contact Mhamcloud",
    title: "We help you choose the right plan and modules",
    description:
      "Have a question about plans, invoices, inventory, sales, purchases, HR, or how to start using the platform? Send your inquiry and we will help you choose the right path.",
    primaryButton: "Send Trial Request",
    secondaryButton: "View Plans",
    note:
      "Mhamcloud is a cloud accounting and ERP platform. Available modules and limits depend on the active system plan.",
    cards: [
      {
        title: "Ask About Plans",
        description:
          "Understand monthly and annual plans and the available limits for your company needs.",
      },
      {
        title: "Prepare Your Company",
        description:
          "Ask how to start using the platform, set up users, permissions, and the right modules.",
      },
      {
        title: "Get Help Choosing",
        description:
          "We help you identify the right plan and modules for your activity before registration or subscription.",
      },
    ],
    quickLinksTitle: "Useful Links",
    quickLinks: [
      {
        label: "Benefits",
        href: "/#benefits",
      },
      {
        label: "System Modules",
        href: "/#features",
      },
      {
        label: "Plans",
        href: "/pricing",
      },
      {
        label: "FAQ",
        href: "/#faq",
      },
    ],
  },
} satisfies Record<
  AppLang,
  {
    badge: string;
    title: string;
    description: string;
    primaryButton: string;
    secondaryButton: string;
    note: string;
    cards: Array<{
      title: string;
      description: string;
    }>;
    quickLinksTitle: string;
    quickLinks: Array<{
      label: string;
      href: string;
    }>;
  }
>;

/* =========================================================
   🧩 Page
========================================================= */
export default async function LandingContactPage() {
  const lang = await getPageLang();
  const isArabic = lang === "ar";
  const dir = isArabic ? "rtl" : "ltr";
  const t = content[lang];

  const ArrowIcon = isArabic ? ChevronLeft : ChevronRight;
  const cardIcons = [MessageCircle, Phone, HeartPulse];

  return (
    <main lang={lang} dir={dir} className="relative min-h-screen w-full">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[280px] w-[280px] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute right-0 top-1/3 h-[260px] w-[260px] rounded-full bg-sky-500/10 blur-3xl" />
        </div>

        <div className="container relative mx-auto px-4 py-16 md:px-6 md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <Badge
              variant="outline"
              className="mb-5 rounded-full bg-background/70 px-4 py-2 text-sm backdrop-blur"
            >
              <Sparkles className="size-4 text-primary" />
              {t.badge}
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              {t.title}
            </h1>

            <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-base leading-8 md:text-lg">
              {t.description}
            </p>

            <div
              className={cn(
                "mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row!",
                isArabic && "sm:flex-row-reverse!"
              )}
            >
              <Button asChild size="lg" className="rounded-2xl px-8">
                <Link href="/register">
                  {t.primaryButton}
                  <ArrowIcon className="size-4" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-2xl px-8"
              >
                <Link href="/pricing">{t.secondaryButton}</Link>
              </Button>
            </div>

            <div className="mx-auto mt-6 max-w-3xl rounded-2xl border bg-background/70 px-5 py-4 text-sm leading-7 text-muted-foreground backdrop-blur">
              <div
                className={cn(
                  "flex items-start justify-center gap-2",
                  isArabic && "flex-row-reverse text-right"
                )}
              >
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{t.note}</span>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
            {t.cards.map((card, index) => {
              const Icon = cardIcons[index] ?? MessageCircle;

              return (
                <Card
                  key={card.title}
                  className="bg-background/75 shadow-sm backdrop-blur"
                >
                  <CardContent className="p-6">
                    <div
                      className={cn(
                        "mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-8 ring-primary/5",
                        isArabic && "mr-auto"
                      )}
                    >
                      <Icon className="size-5" />
                    </div>

                    <h2
                      className={cn(
                        "text-lg font-bold",
                        isArabic && "text-right"
                      )}
                    >
                      {card.title}
                    </h2>

                    <p
                      className={cn(
                        "text-muted-foreground mt-3 leading-7",
                        isArabic && "text-right"
                      )}
                    >
                      {card.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mx-auto mt-10 max-w-5xl rounded-3xl border bg-muted/40 p-5 backdrop-blur">
            <div
              className={cn(
                "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
                isArabic && "md:flex-row-reverse"
              )}
            >
              <h2
                className={cn(
                  "flex items-center gap-2 text-base font-bold",
                  isArabic && "flex-row-reverse text-right"
                )}
              >
                <Mail className="size-4 text-primary" />
                {t.quickLinksTitle}
              </h2>

              <div
                className={cn(
                  "flex flex-wrap gap-3",
                  isArabic && "justify-end"
                )}
              >
                {t.quickLinks.map((link) => (
                  <Button
                    key={link.href}
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-xl bg-background/70"
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* نموذج التواصل الرئيسي */}
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