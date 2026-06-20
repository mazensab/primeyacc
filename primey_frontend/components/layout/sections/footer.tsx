"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FacebookIcon,
  LinkedinIcon,
  Twitter,
  Instagram,
  Youtube,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* =========================================================
   🌐 Language Types
========================================================= */
type AppLang = "ar" | "en";

type FooterContent = {
  description: string;
  disclaimer: string;
  groups: {
    explore: string;
    programs: string;
    support: string;
    socials: string;
  };
  links: {
    benefits: string;
    features: string;
    pricing: string;
    register: string;
    annualCard: string;
    dentalProgram: string;
    checkupsProgram: string;
    beautyProgram: string;
    contactUs: string;
    faq: string;
    network: string;
    offers: string;
    facebook: string;
    twitter: string;
    instagram: string;
    youtube: string;
    linkedin: string;
  };
  copyright: string;
  logoAlt: string;
};

/* =========================================================
   🍪 Cookie Helpers
========================================================= */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function getCurrentLang(): AppLang {
  const cookieLang =
    getCookie("lang") || getCookie("locale") || getCookie("NEXT_LOCALE") || "";

  return cookieLang.toLowerCase().startsWith("ar") ? "ar" : "en";
}

/* =========================================================
   🔗 External Links
========================================================= */
const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/mhamcloud",
  instagram: "https://www.instagram.com/mhamcloud",
  twitter: "https://twitter.com/mhamcloud",
  youtube: "https://www.youtube.com/@mhamcloud",
  linkedin: "https://in.linkedin.com/company/mhamcloud",
} as const;

/* =========================================================
   📝 Localized Content
========================================================= */
const content: Record<AppLang, FooterContent> = {
  ar: {
    description:
      "Primey Care بطاقة وبرامج رعاية صحية تمنحك مزايا وخصومات طبية مختارة على خدمات متنوعة لدى مزودي خدمة مشاركين، بطريقة سهلة وواضحة لك ولعائلتك.",
    disclaimer:
      "تنبيه: Primey Care ليست تأمينًا طبيًا ولا تغني عن التأمين الصحي. تختلف المزايا والخصومات حسب مقدم الخدمة، المدينة، نوع البرنامج، وشروط العرض المتاحة.",
    groups: {
      explore: "استكشف",
      programs: "البرامج",
      support: "الدعم",
      socials: "تابعنا",
    },
    links: {
      benefits: "المزايا",
      features: "الخدمات الصحية",
      pricing: "الاشتراكات",
      register: "اشترك الآن",
      annualCard: "بطاقة الرعاية السنوية",
      dentalProgram: "برنامج الأسنان",
      checkupsProgram: "الفحوصات والتحاليل",
      beautyProgram: "الجلدية والتجميل",
      contactUs: "تواصل معنا",
      faq: "الأسئلة الشائعة",
      network: "الشبكة الطبية",
      offers: "العروض والمزايا",
      facebook: "فيسبوك",
      twitter: "إكس",
      instagram: "إنستغرام",
      youtube: "يوتيوب",
      linkedin: "لينكدإن",
    },
    copyright: "جميع الحقوق محفوظة",
    logoAlt: "شعار Primey Care",
  },
  en: {
    description:
      "Primey Care offers healthcare cards and programs with selected medical benefits and discounts across participating providers, giving you and your family a clearer and easier way to access care.",
    disclaimer:
      "Notice: Primey Care is not medical insurance and does not replace health insurance. Benefits and discounts may vary by provider, city, program type, and available offer terms.",
    groups: {
      explore: "Explore",
      programs: "Programs",
      support: "Support",
      socials: "Follow Us",
    },
    links: {
      benefits: "Benefits",
      features: "Healthcare Services",
      pricing: "Subscriptions",
      register: "Join Now",
      annualCard: "Annual Care Card",
      dentalProgram: "Dental Program",
      checkupsProgram: "Checkups & Lab Tests",
      beautyProgram: "Dermatology & Beauty",
      contactUs: "Contact Us",
      faq: "FAQ",
      network: "Healthcare Network",
      offers: "Offers & Benefits",
      facebook: "Facebook",
      twitter: "X",
      instagram: "Instagram",
      youtube: "YouTube",
      linkedin: "LinkedIn",
    },
    copyright: "All rights reserved",
    logoAlt: "Primey Care logo",
  },
};

/* =========================================================
   🧩 Section
========================================================= */
export const FooterSection = () => {
  const [lang, setLang] = useState<AppLang>("en");

  useEffect(() => {
    const updateLang = () => {
      setLang(getCurrentLang());
    };

    updateLang();

    const observer = new MutationObserver(() => {
      updateLang();
    });

    if (typeof document !== "undefined") {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["lang", "dir"],
      });
    }

    return () => observer.disconnect();
  }, []);

  const isArabic = lang === "ar";
  const t = content[lang];

  return (
    <footer
      id="footer"
      className="container space-y-4 pb-4 lg:pb-8"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="bg-muted rounded-2xl border p-10">
        <div className="grid grid-cols-2 gap-x-12 gap-y-8 md:grid-cols-4 xl:grid-cols-6">
          <div className="col-span-full space-y-4 xl:col-span-2">
            <Link
              href="/"
              className={cn(
                "inline-flex w-full",
                isArabic ? "justify-start xl:justify-start" : "justify-start"
              )}
              aria-label={t.logoAlt}
            >
              <Image
                src="/hero logo.png"
                alt={t.logoAlt}
                width={1200}
                height={420}
                priority
                unoptimized
                className="
                  h-auto
                  w-full
                  max-w-[180px]
                  object-contain
                  sm:max-w-[220px]
                  md:max-w-[240px]
                  lg:max-w-[260px]
                "
              />
            </Link>

            <p
              className={cn(
                "text-muted-foreground leading-7",
                isArabic && "text-right"
              )}
            >
              {t.description}
            </p>

            <p
              className={cn(
                "text-muted-foreground/80 rounded-xl border bg-background/60 p-3 text-xs leading-6",
                isArabic && "text-right"
              )}
            >
              {t.disclaimer}
            </p>
          </div>

          <div className={cn("flex flex-col gap-2", isArabic && "text-right")}>
            <h3 className="mb-2 text-lg font-bold">{t.groups.explore}</h3>

            <div>
              <Link href="/#benefits" className="opacity-60 hover:opacity-100">
                {t.links.benefits}
              </Link>
            </div>

            <div>
              <Link href="/#features" className="opacity-60 hover:opacity-100">
                {t.links.features}
              </Link>
            </div>

            <div>
              <Link href="/pricing" className="opacity-60 hover:opacity-100">
                {t.links.pricing}
              </Link>
            </div>

            <div>
              <Link href="/register" className="opacity-60 hover:opacity-100">
                {t.links.register}
              </Link>
            </div>
          </div>

          <div className={cn("flex flex-col gap-2", isArabic && "text-right")}>
            <h3 className="mb-2 text-lg font-bold">{t.groups.programs}</h3>

            <div>
              <Link href="/#solutions" className="opacity-60 hover:opacity-100">
                {t.links.annualCard}
              </Link>
            </div>

            <div>
              <Link href="/#solutions" className="opacity-60 hover:opacity-100">
                {t.links.dentalProgram}
              </Link>
            </div>

            <div>
              <Link href="/#solutions" className="opacity-60 hover:opacity-100">
                {t.links.checkupsProgram}
              </Link>
            </div>

            <div>
              <Link href="/#solutions" className="opacity-60 hover:opacity-100">
                {t.links.beautyProgram}
              </Link>
            </div>
          </div>

          <div className={cn("flex flex-col gap-2", isArabic && "text-right")}>
            <h3 className="mb-2 text-lg font-bold">{t.groups.support}</h3>

            <div>
              <Link href="/contact" className="opacity-60 hover:opacity-100">
                {t.links.contactUs}
              </Link>
            </div>

            <div>
              <Link href="/#faq" className="opacity-60 hover:opacity-100">
                {t.links.faq}
              </Link>
            </div>

            <div>
              <Link href="/#features" className="opacity-60 hover:opacity-100">
                {t.links.network}
              </Link>
            </div>

            <div>
              <Link href="/#pricing" className="opacity-60 hover:opacity-100">
                {t.links.offers}
              </Link>
            </div>
          </div>

          <div className={cn("flex flex-col gap-2", isArabic && "text-right")}>
            <h3 className="mb-2 text-lg font-bold">{t.groups.socials}</h3>

            <div>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100"
              >
                {t.links.facebook}
              </a>
            </div>

            <div>
              <a
                href={SOCIAL_LINKS.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100"
              >
                {t.links.twitter}
              </a>
            </div>

            <div>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100"
              >
                {t.links.instagram}
              </a>
            </div>

            <div>
              <a
                href={SOCIAL_LINKS.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100"
              >
                {t.links.youtube}
              </a>
            </div>

            <div>
              <a
                href={SOCIAL_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-60 hover:opacity-100"
              >
                {t.links.linkedin}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col justify-between gap-4 sm:flex-row!",
          isArabic && "sm:flex-row-reverse!"
        )}
      >
        <div
          className={cn(
            "text-muted-foreground flex items-center justify-center gap-1 text-sm sm:justify-start",
            isArabic && "sm:justify-end"
          )}
        >
          <span>&copy; {new Date().getFullYear()}</span>
          <span>|</span>
          <span className="font-medium">Primey Care</span>
          <span>|</span>
          <span>{t.copyright}</span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="ghost" className="hover:opacity-50" asChild>
            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <FacebookIcon />
            </a>
          </Button>

          <Button size="icon" variant="ghost" className="hover:opacity-50" asChild>
            <a
              href={SOCIAL_LINKS.twitter}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter X"
            >
              <Twitter />
            </a>
          </Button>

          <Button size="icon" variant="ghost" className="hover:opacity-50" asChild>
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <Instagram />
            </a>
          </Button>

          <Button size="icon" variant="ghost" className="hover:opacity-50" asChild>
            <a
              href={SOCIAL_LINKS.youtube}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
            >
              <Youtube />
            </a>
          </Button>

          <Button size="icon" variant="ghost" className="hover:opacity-50" asChild>
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <LinkedinIcon />
            </a>
          </Button>
        </div>
      </div>
    </footer>
  );
};