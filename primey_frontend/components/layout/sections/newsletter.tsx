import { cookies } from "next/headers";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import SectionContainer from "@/components/layout/section-container";

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

export async function NewsletterSection() {
  const lang = await getPageLang();
  const isArabic = lang === "ar";
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  return (
    <SectionContainer className="py-7 md:py-8 lg:py-10">
      <section
        dir={isArabic ? "rtl" : "ltr"}
        className="relative overflow-hidden rounded-[32px] border border-border/70 bg-[radial-gradient(circle_at_12%_18%,rgba(148,163,184,0.15),transparent_30%),linear-gradient(145deg,#f8fafc_0%,#eef2f7_55%,#e2e8f0_100%)] px-6 py-10 shadow-[0_22px_62px_rgba(15,23,42,0.08)] sm:px-9 lg:px-12 lg:py-12 dark:border-white/10 dark:bg-[radial-gradient(circle_at_12%_18%,rgba(255,255,255,0.06),transparent_30%),linear-gradient(145deg,#111827_0%,#0f172a_55%,#030712_100%)]"
      >
        <div className="pointer-events-none absolute -start-20 -top-20 size-56 rounded-full border border-white/65 dark:border-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -end-20 size-64 rounded-full border border-slate-400/15" />

        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Sparkles className="size-4" />
              {isArabic ? "جاهز للبدء" : "Ready to get started?"}
            </div>

            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.2] tracking-[-0.035em] text-foreground sm:text-4xl">
              {isArabic
                ? "شاهد كيف يمكن لـ Mhamcloud أن يجمع دورة عمل شركتك"
                : "See how Mhamcloud can bring your business workflow together"}
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              {isArabic
                ? "أرسل احتياج شركتك وعدد المستخدمين والوحدات المطلوبة وسنساعدك في تحديد نطاق التجربة والباقة المناسبة."
                : "Share your company needs, number of users, and required modules, and we will help define the right trial and subscription scope."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl px-7"
            >
              <Link href="/register">
                {isArabic ? "اطلب تجربة" : "Request a Trial"}
                <ArrowIcon className="size-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-xl bg-background/65 px-7 backdrop-blur-xl"
            >
              <Link href="/contact">
                <MessageCircle className="size-4" />
                {isArabic ? "تواصل معنا" : "Contact Us"}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </SectionContainer>
  );
}