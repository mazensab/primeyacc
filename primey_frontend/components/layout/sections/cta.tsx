"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* =========================================================
   🌐 Language Types
========================================================= */
type AppLang = "ar" | "en";

type PricingCtaContent = {
  eyebrow: string;
  title: string;
  description: string;
  askButton: string;
  joinButton: string;
  imageAlt: string;
};

/* =========================================================
   🌐 Localized Content
========================================================= */
const content: Record<AppLang, PricingCtaContent> = {
  ar: {
    eyebrow: "ابدأ الآن",
    title: "رعاية صحية أوفر وأسهل لك ولعائلتك",
    description:
      "اختر بطاقة أو برنامج Primey Care المناسب لك، واستفد من مزايا وخصومات طبية مختارة لدى مزودي خدمة مشاركين بطريقة سهلة وواضحة.",
    askButton: "استفسر عن المزايا",
    joinButton: "اشترك الآن",
    imageAlt: "بطاقة Primey Care ومزايا الرعاية الصحية",
  },
  en: {
    eyebrow: "Get Started",
    title: "Smarter and more affordable care for you and your family",
    description:
      "Choose the Primey Care card or program that fits your needs and enjoy selected healthcare benefits and discounts through participating providers with a clear and easy experience.",
    askButton: "Ask About Benefits",
    joinButton: "Join Now",
    imageAlt: "Primey Care card and healthcare benefits",
  },
};

/* =========================================================
   🍪 Cookie Helper
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
    getCookie("lang") || getCookie("locale") || getCookie("NEXT_LOCALE");

  return cookieLang === "ar" ? "ar" : "en";
}

/* =========================================================
   🧩 Section
========================================================= */
export function PricingCtaSection() {
  const [lang, setLang] = useState<AppLang>("en");

  useEffect(() => {
    const updateLang = () => setLang(getCurrentLang());

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
  const dir = isArabic ? "rtl" : "ltr";
  const t = content[lang];

  return (
    <div className="pt-10 lg:pt-20" dir={dir}>
      <div className="from-muted to-muted/50 relative flex flex-col justify-between gap-4 overflow-hidden rounded-xl border bg-gradient-to-br lg:flex-row! lg:gap-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className={cn(
            "flex max-w-lg flex-col gap-6 py-4 ps-4 pe-4 md:py-10 md:ps-10 md:pe-0",
            isArabic && "lg:text-right"
          )}
        >
          <div className="flex">
            <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-sm font-medium">
              {t.eyebrow}
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t.title}
          </h2>

          <p className="text-muted-foreground leading-7 md:text-lg">
            {t.description}
          </p>

          <div
            className={cn(
              "flex flex-col gap-4 sm:flex-row!",
              isArabic && "sm:flex-row-reverse!"
            )}
          >
            <Button asChild variant="outline">
              <Link href="/contact" className="gap-2">
                <MessageCircle className="size-4" />
                {t.askButton}
              </Link>
            </Button>

            <Button asChild className="gap-2">
              <Link href="/register">
                {t.joinButton}
                {isArabic ? <ChevronLeft /> : <ChevronRight />}
              </Link>
            </Button>
          </div>
        </motion.div>

        <figure className="relative h-75 w-full lg:mt-10">
          <Image
            fill
            className={cn(
              "bottom-0 self-end object-cover",
              isArabic ? "lg:rounded-tr-lg" : "lg:rounded-tl-lg"
            )}
            src="/hero.png"
            alt={t.imageAlt}
            unoptimized
          />
        </figure>
      </div>
    </div>
  );
}