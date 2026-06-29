import { cookies } from "next/headers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SectionContainer from "@/components/layout/section-container";
import SectionHeader from "@/components/layout/section-header";

/* =========================================================
   🌐 Language Types
========================================================= */
type AppLang = "ar" | "en";

type NewsletterContent = {
  titleStart: string;
  titleHighlight: string;
  description: string;
  emailPlaceholder: string;
  emailAriaLabel: string;
  buttonText: string;
};

/* =========================================================
   🌐 Language Helper
========================================================= */
async function getPageLang(): Promise<AppLang> {
  const cookieStore = await cookies();

  const cookieLang =
    cookieStore.get("lang")?.value ||
    cookieStore.get("locale")?.value ||
    cookieStore.get("NEXT_LOCALE")?.value ||
    "";

  const normalizedLang = cookieLang.toLowerCase();

  return normalizedLang.startsWith("ar") ? "ar" : "en";
}

/* =========================================================
   📝 Localized Content
========================================================= */
const content: Record<AppLang, NewsletterContent> = {
  ar: {
    titleStart: "كن أول من يعرف",
    titleHighlight: "عروض الرعاية الصحية",
    description:
      "اشترك ليصلك جديد مزايا Mhamcloud، والعروض الطبية، والبرامج الصحية المختارة للأفراد والعائلات.",
    emailPlaceholder: "name@example.com",
    emailAriaLabel: "البريد الإلكتروني",
    buttonText: "اشترك الآن",
  },
  en: {
    titleStart: "Be the first to know about",
    titleHighlight: "healthcare offers",
    description:
      "Subscribe to receive Mhamcloud updates, medical offers, and selected healthcare programs for individuals and families.",
    emailPlaceholder: "name@example.com",
    emailAriaLabel: "Email address",
    buttonText: "Subscribe",
  },
};

/* =========================================================
   🧩 Section
========================================================= */
export async function NewsletterSection() {
  const lang = await getPageLang();
  const isArabic = lang === "ar";
  const t = content[lang];

  return (
    <SectionContainer>
      <div dir={isArabic ? "rtl" : "ltr"}>
        <SectionHeader
          title={
            <>
              {t.titleStart}{" "}
              <span className="from-primary/60 to-primary bg-linear-to-b bg-clip-text text-transparent">
                {t.titleHighlight}
              </span>
            </>
          }
          description={t.description}
        />

        <form className="mx-auto flex w-full flex-col gap-4 md:w-6/12 md:flex-row md:gap-2 lg:w-4/12">
          <Input
            type="email"
            placeholder={t.emailPlaceholder}
            className="bg-muted/50 dark:bg-muted/80"
            aria-label={t.emailAriaLabel}
            dir="ltr"
          />

          <Button type="submit">{t.buttonText}</Button>
        </form>
      </div>
    </SectionContainer>
  );
}