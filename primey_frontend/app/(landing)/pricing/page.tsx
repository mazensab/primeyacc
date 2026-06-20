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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContactSection } from "@/components/layout/sections/contact";
import { FAQSection } from "@/components/layout/sections/faq";
import { FooterSection } from "@/components/layout/sections/footer";
import { NewsletterSection } from "@/components/layout/sections/newsletter";
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
    ? "تواصل مع Primey Care | استفسر عن البطاقات والمزايا"
    : "Contact Primey Care | Ask About Cards and Benefits";

  const description = isArabic
    ? "تواصل مع Primey Care للاستفسار عن بطاقات وبرامج الرعاية الصحية، المزايا الطبية، الشبكة المشاركة، وخطوات الاشتراك."
    : "Contact Primey Care to ask about healthcare cards, medical benefits, participating providers, and subscription steps.";

  return {
    title,
    description,
    keywords: isArabic
      ? [
          "تواصل Primey Care",
          "برايمي كير",
          "استفسار بطاقة رعاية صحية",
          "بطاقة خصم طبي",
          "مزايا طبية",
          "الشبكة الطبية",
          "اشتراك Primey Care",
        ]
      : [
          "Contact Primey Care",
          "Primey Care support",
          "healthcare card inquiry",
          "medical benefits",
          "medical discount card",
          "healthcare network",
          "Primey Care subscription",
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
      siteName: "Primey Care",
      locale: isArabic ? "ar_SA" : "en_US",
      images: [
        {
          url: "/seo.jpg",
          width: 1200,
          height: 630,
          alt: isArabic ? "تواصل مع Primey Care" : "Contact Primey Care",
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
    badge: "تواصل مع Primey Care",
    title: "نساعدك تختار البطاقة أو البرنامج الأنسب لك",
    description:
      "لديك سؤال عن المزايا، الشبكة الطبية، الاشتراك، أو البرامج الصحية؟ أرسل استفسارك وسنساعدك في معرفة الخيار المناسب لك ولعائلتك.",
    primaryButton: "أرسل طلب اشتراك",
    secondaryButton: "عرض الاشتراكات",
    note:
      "Primey Care ليست تأمينًا طبيًا، بل بطاقة وبرامج مزايا وخصومات طبية لدى مزودي خدمة مشاركين.",
    cards: [
      {
        title: "استفسار عن المزايا",
        description:
          "اعرف الخدمات الطبية التي يمكن أن تشملها البطاقة أو البرنامج حسب احتياجك.",
      },
      {
        title: "معرفة الشبكة الطبية",
        description:
          "اسأل عن مقدمي الخدمة والمراكز المشاركة حسب المدينة أو نوع الخدمة.",
      },
      {
        title: "مساعدة في الاختيار",
        description:
          "نساعدك في تحديد ما إذا كانت البطاقة الفردية أو العائلية أو البرنامج المتخصص هو الأنسب.",
      },
    ],
    quickLinksTitle: "روابط قد تهمك",
    quickLinks: [
      {
        label: "المزايا",
        href: "/#benefits",
      },
      {
        label: "الخدمات الصحية",
        href: "/#features",
      },
      {
        label: "الاشتراكات",
        href: "/pricing",
      },
      {
        label: "الأسئلة الشائعة",
        href: "/#faq",
      },
    ],
  },
  en: {
    badge: "Contact Primey Care",
    title: "We help you choose the right card or program",
    description:
      "Have a question about benefits, providers, subscriptions, or healthcare programs? Send your inquiry and we will help you find the right option for you and your family.",
    primaryButton: "Send Subscription Request",
    secondaryButton: "View Subscriptions",
    note:
      "Primey Care is not medical insurance. It is a healthcare benefits and discount card through participating providers.",
    cards: [
      {
        title: "Ask About Benefits",
        description:
          "Learn what healthcare services may be included in the card or program based on your needs.",
      },
      {
        title: "Check Provider Network",
        description:
          "Ask about participating providers and centers by city or service type.",
      },
      {
        title: "Get Help Choosing",
        description:
          "We help you decide whether an individual card, family card, or specialized program is the right fit.",
      },
    ],
    quickLinksTitle: "Useful Links",
    quickLinks: [
      {
        label: "Benefits",
        href: "/#benefits",
      },
      {
        label: "Healthcare Services",
        href: "/#features",
      },
      {
        label: "Subscriptions",
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

      {/* العروض والتحديثات */}
      <NewsletterSection />

      {/* الفوتر */}
      <FooterSection />

      {/* الدعم العائم */}
      <ChatWidget />
    </main>
  );
}