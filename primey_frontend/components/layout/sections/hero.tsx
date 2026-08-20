import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UsersRound,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";

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

export const HeroSection = async () => {
  const lang = await getPageLang();
  const isArabic = lang === "ar";

  const copy = isArabic
    ? {
        title: "كل أعمالك المالية في منصة واحدة",
        descriptionLine1:
          "نظام محاسبي متكامل يساعدك على إدارة أعمالك بذكاء",
        descriptionLine2:
          "من التقارير المالية إلى إدارة العملاء والمخزون والفواتير.",
        primaryButton: "ابدأ الآن",
        secondaryButton: "استكشف الحلول",
        imageAlt: "منصة Mhamcloud لإدارة الأعمال والمحاسبة",
      }
    : {
        title: "All your financial operations in one platform",
        descriptionLine1:
          "A connected accounting platform built to help you manage your business clearly,",
        descriptionLine2:
          "from financial reporting to customers, inventory and invoicing.",
        primaryButton: "Get Started",
        secondaryButton: "Explore Solutions",
        imageAlt: "Mhamcloud accounting and business management platform",
      };

  const proofItems = isArabic
    ? [
        {
          icon: "/landing/trust/fatoora.png",
          label: "إصدار وإدارة الفواتير الإلكترونية",
        },
        {
          icon: "/landing/trust/zatca.png",
          label: "تهيئة محاسبية لمتطلبات الزكاة والضريبة",
        },
        {
          icon: "/landing/trust/saudi-tech.png",
          label: "منصة تقنية مصممة لبيئة الأعمال السعودية",
        },
        {
          icon: "/landing/trust/saudi-made.svg",
          label: "حل محلي يدعم التحول الرقمي للأعمال",
        },
      ]
    : [
        {
          icon: "/landing/trust/fatoora.png",
          label: "Electronic invoicing workflows",
        },
        {
          icon: "/landing/trust/zatca.png",
          label: "Accounting readiness for local requirements",
        },
        {
          icon: "/landing/trust/saudi-tech.png",
          label: "Technology built for Saudi businesses",
        },
        {
          icon: "/landing/trust/saudi-made.svg",
          label: "A local platform supporting digital transformation",
        },
      ];

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className="relative -mt-[98px] overflow-hidden"
    >
      {/* =====================================================
          HERO DESKTOP
      ====================================================== */}
      <div className="relative hidden h-[100svh] min-h-[760px] max-h-[960px] w-full overflow-hidden md:block">
        <Image
          src="/landing/mhamcloud-hero-desktop.png"
          alt={copy.imageAlt}
          fill
          priority
          sizes="100vw"
          className="select-none object-cover object-center"
        />

        {/* تدرج خفيف فقط خلف النص لرفع الوضوح */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-y-0
            left-0
            w-[58%]
            bg-gradient-to-r
            from-slate-950/16
            via-slate-950/[0.035]
            to-transparent
          "
        />

        <div className="absolute inset-0 z-10 mx-auto h-full w-full max-w-[1600px] px-8 lg:px-10 xl:px-12">
          {/* النص */}
          <div
            dir={isArabic ? "rtl" : "ltr"}
            className="
              absolute
              left-[6.5%]
              top-[30%]
              w-[58%]
              max-w-[900px]
            "
          >
            <h1
              className="
                whitespace-nowrap
                text-[clamp(2.35rem,3.35vw,4.35rem)]
                font-black
                leading-[1.08]
                tracking-[-0.045em]
                text-[#10233f]
                drop-shadow-[0_2px_2px_rgba(255,255,255,0.20)]
              "
            >
              {copy.title}
            </h1>

            <div
              className="
                mt-6
                max-w-[650px]
                text-[clamp(1rem,1.18vw,1.28rem)]
                font-semibold
                leading-[1.9]
                text-white
                drop-shadow-[0_2px_5px_rgba(15,23,42,0.82)]
              "
            >
              <p>{copy.descriptionLine1}</p>
              <p>{copy.descriptionLine2}</p>
            </div>

            {/* الأزرار */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button
                asChild
                size="lg"
                className="
                  h-[60px]
                  min-w-[205px]
                  rounded-[14px]
                  bg-[#111b2d]
                  px-10
                  text-[17px]
                  font-bold
                  text-white
                  shadow-[0_14px_36px_rgba(15,23,42,0.22)]
                  transition-transform
                  hover:-translate-y-0.5
                  hover:bg-[#17243a]
                "
              >
                <Link href="/register">
                  {copy.primaryButton}

                  {isArabic ? (
                    <ChevronLeft className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="
                  h-[60px]
                  min-w-[210px]
                  rounded-[14px]
                  border-white/80
                  bg-white/82
                  px-10
                  text-[17px]
                  font-semibold
                  text-[#111b2d]
                  shadow-[0_10px_30px_rgba(15,23,42,0.10)]
                  backdrop-blur-xl
                  transition-transform
                  hover:-translate-y-0.5
                  hover:bg-white/90
                "
              >
                <Link href="/#solutions">{copy.secondaryButton}</Link>
              </Button>
            </div>
          </div>

          {/* =================================================
              شريط البطاقات الزجاجي
          ================================================== */}
          <div
            className="
              absolute
              bottom-[3.5%]
              left-1/2
              grid
              w-[min(1180px,86vw)]
              -translate-x-1/2
              grid-cols-4
              overflow-hidden
              rounded-[26px]
              border
              border-white/80
              bg-white/62
              shadow-[0_24px_70px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.92)]
              backdrop-blur-2xl
            "
          >
            {proofItems.map((item, index) => {
              return (
                <div
                  key={item.label}
                  className={`
                    flex
                    min-h-[128px]
                    flex-col
                    items-center
                    justify-center
                    gap-2.5
                    px-5
                    py-4
                    text-center
                    ${index !== proofItems.length - 1 ? "border-e border-slate-900/10" : ""}
                  `}
                >
                  <div
                    className="
                      flex
                      h-[80px]
                      w-full
                      items-center
                      justify-center
                      px-3
                    "
                  >
                    <Image
                      src={item.icon}
                      alt=""
                      width={230}
                      height={80}
                      className="
                        max-h-[76px]
                        w-auto
                        max-w-[220px]
                        object-contain
                      "
                    />
                  </div>

                  <div
                    className="
                      mx-auto
                      max-w-[230px]
                      text-center
                      text-[13px]
                      font-semibold
                      leading-[1.55]
                      text-[#334155]
                    "
                  >
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================
          HERO MOBILE
      ====================================================== */}
      <div className="relative min-h-[900px] overflow-hidden md:hidden">
        <Image
          src="/landing/mhamcloud-hero-mobile.png"
          alt={copy.imageAlt}
          fill
          priority
          sizes="100vw"
          className="select-none object-cover object-center"
        />

        {/* طبقة خفيفة لتحسين وضوح النص بدون إخفاء هوية الصورة */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-b
            from-slate-950/[0.03]
            via-transparent
            to-slate-950/20
          "
        />

        <div
          className="
            relative
            z-10
            flex
            min-h-[900px]
            flex-col
            px-5
            pb-5
            pt-[168px]
          "
        >
          {/* ===============================================
              محتوى Hero في الجوال
          ================================================ */}
          <div
            dir={isArabic ? "rtl" : "ltr"}
            className="
              mx-auto
              w-full
              max-w-[520px]
              text-center
            "
          >
            <h1
              className="
                mx-auto
                max-w-[470px]
                text-[clamp(2rem,8.7vw,3rem)]
                font-black
                leading-[1.22]
                tracking-[-0.035em]
                text-[#10233f]
                drop-shadow-[0_1px_1px_rgba(255,255,255,0.25)]
              "
            >
              {copy.title}
            </h1>

            <div
              className="
                mx-auto
                mt-5
                max-w-[450px]
                text-[clamp(0.9rem,3.6vw,1rem)]
                font-semibold
                leading-[1.9]
                text-white
                drop-shadow-[0_2px_5px_rgba(15,23,42,0.90)]
              "
            >
              <p>{copy.descriptionLine1}</p>
              <p>{copy.descriptionLine2}</p>
            </div>

            {/* الأزرار */}
            <div
              className="
                mx-auto
                mt-6
                grid
                w-full
                max-w-[440px]
                grid-cols-2
                gap-3
              "
            >
              <Button
                asChild
                size="lg"
                className="
                  h-[54px]
                  rounded-[14px]
                  bg-[#111b2d]
                  px-4
                  text-[15px]
                  font-bold
                  text-white
                  shadow-[0_12px_30px_rgba(15,23,42,0.24)]
                  transition-transform
                  active:scale-[0.98]
                  hover:bg-[#17243a]
                "
              >
                <Link href="/register">
                  {copy.primaryButton}

                  {isArabic ? (
                    <ChevronLeft className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="
                  h-[54px]
                  rounded-[14px]
                  border-white/80
                  bg-white/88
                  px-4
                  text-[15px]
                  font-bold
                  text-[#111b2d]
                  shadow-[0_10px_28px_rgba(15,23,42,0.12)]
                  backdrop-blur-xl
                  transition-transform
                  active:scale-[0.98]
                  hover:bg-white
                "
              >
                <Link href="/#solutions">
                  {copy.secondaryButton}
                </Link>
              </Button>
            </div>
          </div>

          {/* ===============================================
              بطاقات الجوال
              تبقى في الأسفل وتترك المشهد الرئيسي ظاهرًا
          ================================================ */}
          <div
            className="
              mx-auto
              mb-4
              mt-auto
              grid
              w-full
              max-w-[500px]
              grid-cols-2
              overflow-hidden
              rounded-[22px]
              border
              border-white/80
              bg-white/68
              shadow-[0_20px_55px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.92)]
              backdrop-blur-2xl
            "
          >
            {proofItems.map((item, index) => {
              return (
                <div
                  key={item.label}
                  className={`
                    flex
                    min-h-[118px]
                    flex-col
                    items-center
                    justify-center
                    gap-2
                    px-3
                    py-3
                    text-center
                    ${index % 2 === 0 ? "border-e border-slate-900/10" : ""}
                    ${index < 2 ? "border-b border-slate-900/10" : ""}
                  `}
                >
                  <div
                    className="
                      flex
                      h-[60px]
                      w-full
                      items-center
                      justify-center
                      px-2
                    "
                  >
                    <Image
                      src={item.icon}
                      alt=""
                      width={170}
                      height={60}
                      className="
                        max-h-[56px]
                        w-auto
                        max-w-[160px]
                        object-contain
                      "
                    />
                  </div>

                  <span
                    className="
                      mx-auto
                      block
                      max-w-[170px]
                      text-center
                      text-[10px]
                      font-semibold
                      leading-[1.5]
                      text-[#475569]
                    "
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};