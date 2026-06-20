import { cookies } from "next/headers";

import { sponsors } from "@/@data/sponsors";
import Icon from "@/components/icon";
import { InfiniteSlider } from "@/components/ui/extras/infinite-slider";
import { cn } from "@/lib/utils";

/* =========================================================
   🌐 Language Types
========================================================= */
type AppLang = "ar" | "en";

type SponsorContent = {
  intro: string;
  items: string[];
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
const content: Record<AppLang, SponsorContent> = {
  ar: {
    intro: "مزايا صحية عبر تخصصات متنوعة",
    items: [
      "العيادات الطبية",
      "المستشفيات",
      "المختبرات والتحاليل",
      "الأشعة والفحوصات",
      "الأسنان",
      "الجلدية والتجميل",
      "النساء والولادة",
      "الصيدليات",
      "الفحوصات الدورية",
      "البرامج الصحية",
    ],
  },
  en: {
    intro: "Healthcare benefits across multiple specialties",
    items: [
      "Medical Clinics",
      "Hospitals",
      "Labs & Tests",
      "Scans & Diagnostics",
      "Dental Care",
      "Dermatology & Beauty",
      "Maternity Care",
      "Pharmacies",
      "Routine Checkups",
      "Care Programs",
    ],
  },
};

/* =========================================================
   🧩 Section
========================================================= */
export const SponsorsSection = async () => {
  const lang = await getPageLang();
  const isArabic = lang === "ar";
  const t = content[lang];

  return (
    <section className="pb-12 lg:pb-24" dir={isArabic ? "rtl" : "ltr"}>
      <div className="container">
        <p
          className={cn(
            "text-muted-foreground mb-6 text-center text-sm font-medium md:text-base",
            isArabic && "tracking-normal"
          )}
        >
          {t.intro}
        </p>
      </div>

      <div className="container mask-r-from-50% mask-r-to-90% mask-l-from-50% mask-l-to-90%">
        <InfiniteSlider gap={50} speedOnHover={40} reverse={isArabic}>
          {sponsors.map(({ icon, name }, index) => {
            const label = t.items[index % t.items.length];

            return (
              <div
                key={`${name}-${index}`}
                className={cn(
                  "bg-background/70 border-border/70 flex items-center rounded-full border px-5 py-3 text-xl font-medium shadow-sm backdrop-blur md:text-2xl",
                  isArabic && "flex-row-reverse"
                )}
              >
                <Icon
                  name={icon}
                  className={cn(
                    "text-primary size-6 shrink-0",
                    isArabic ? "ml-3" : "mr-3"
                  )}
                />

                <span className="whitespace-nowrap">{label}</span>
              </div>
            );
          })}
        </InfiniteSlider>
      </div>
    </section>
  );
};