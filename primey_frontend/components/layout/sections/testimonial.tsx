"use client";

import { useEffect, useState } from "react";
import { reviewList } from "@/@data/reviews";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Star } from "lucide-react";
import SectionContainer from "@/components/layout/section-container";
import SectionHeader from "@/components/layout/section-header";
import { cn } from "@/lib/utils";

/* =========================================================
   🌐 Language Types
========================================================= */
type AppLang = "ar" | "en";

type TestimonialItem = {
  name: string;
  role: string;
  comment: string;
};

type TestimonialContent = {
  subTitle: string;
  title: string;
  description: string;
  imageAlt: string;
  reviews: TestimonialItem[];
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
   📝 Localized Content
========================================================= */
const content: Record<AppLang, TestimonialContent> = {
  ar: {
    subTitle: "تجارب العملاء",
    title: "عملاء استفادوا من رعاية أوضح وتوفير أفضل",
    description:
      "آراء مختصرة تعكس كيف تساعد Mhamcloud العملاء على الوصول إلى مزايا صحية وخصومات طبية بطريقة أسهل لهم ولعائلاتهم.",
    imageAlt: "صورة عميل Mhamcloud",
    reviews: [
      {
        name: "عميل Mhamcloud",
        role: "بطاقة فردية",
        comment:
          "أكثر ما أعجبني أن المزايا واضحة وسهلة الاستخدام. عرفت الخصم قبل الزيارة واستفدت منه بدون تعقيد.",
      },
      {
        name: "مشتركة Mhamcloud",
        role: "بطاقة عائلية",
        comment:
          "البطاقة مناسبة للعائلة، خصوصًا مع تكرار زيارات الأسنان والتحاليل. وجود خيارات متعددة ساعدنا على التوفير.",
      },
      {
        name: "عميل Mhamcloud",
        role: "برنامج الفحوصات",
        comment:
          "كنت أبحث عن طريقة أوضح لمتابعة الفحوصات الدورية. البرنامج سهّل علي معرفة الخدمات والمزايا المتاحة.",
      },
      {
        name: "مشتركة Mhamcloud",
        role: "برنامج الجلدية والتجميل",
        comment:
          "أعجبني تنوع الخدمات وإمكانية الاستفسار قبل الحجز. التجربة كانت مرتبة وواضحة من البداية.",
      },
      {
        name: "عميل Mhamcloud",
        role: "برنامج الأسنان",
        comment:
          "استفدت من خصومات الأسنان، وكانت التفاصيل واضحة قبل زيارة المركز. هذا أعطاني ثقة أكبر في الاختيار.",
      },
      {
        name: "مشتركة Mhamcloud",
        role: "استفسار ودعم",
        comment:
          "الدعم ساعدني في معرفة البطاقة الأنسب وشرح لي المزايا المتاحة حسب احتياجي والمدينة.",
      },
    ],
  },
  en: {
    subTitle: "Testimonials",
    title: "Customers enjoying clearer care and better savings",
    description:
      "Short experiences showing how Mhamcloud helps customers access healthcare benefits and selected medical discounts in an easier way for themselves and their families.",
    imageAlt: "Mhamcloud customer avatar",
    reviews: [
      {
        name: "Mhamcloud Customer",
        role: "Individual Card",
        comment:
          "What I liked most is that the benefits are clear and easy to use. I knew the discount before my visit and used it without complications.",
      },
      {
        name: "Mhamcloud Member",
        role: "Family Card",
        comment:
          "The card is helpful for the family, especially with repeated dental visits and lab tests. The flexible options helped us save more.",
      },
      {
        name: "Mhamcloud Customer",
        role: "Checkups Program",
        comment:
          "I was looking for a clearer way to manage routine checkups. The program made it easier to understand available services and benefits.",
      },
      {
        name: "Mhamcloud Member",
        role: "Dermatology & Beauty Program",
        comment:
          "I liked the variety of services and the ability to ask before booking. The whole experience felt organized from the beginning.",
      },
      {
        name: "Mhamcloud Customer",
        role: "Dental Program",
        comment:
          "I used the dental benefits, and the details were clear before visiting the center. That gave me more confidence in my choice.",
      },
      {
        name: "Mhamcloud Member",
        role: "Support Inquiry",
        comment:
          "The support team helped me understand the right card and explained available benefits based on my needs and city.",
      },
    ],
  },
};

/* =========================================================
   🧩 Section
========================================================= */
export const TestimonialSection = () => {
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
    <SectionContainer id="testimonials">
      <div dir={dir}>
        <SectionHeader
          subTitle={t.subTitle}
          title={t.title}
          description={t.description}
        />

        <Carousel
          opts={{
            align: "start",
            direction: isArabic ? "rtl" : "ltr",
          }}
          className="relative mx-auto w-[80%] sm:w-[90%] lg:max-w-(--breakpoint-xl)"
        >
          <CarouselContent>
            {reviewList.map((review, index) => {
              const testimonial = t.reviews[index % t.reviews.length];

              return (
                <CarouselItem
                  key={`${testimonial.name}-${index}`}
                  className="md:basis-1/2 lg:basis-1/3"
                >
                  <Card className="bg-muted h-full">
                    <CardContent className="flex h-full flex-col gap-4">
                      <div
                        className={cn(
                          "flex gap-1",
                          isArabic && "justify-end"
                        )}
                      >
                        <Star className="size-4 fill-orange-400 text-orange-400" />
                        <Star className="size-4 fill-orange-400 text-orange-400" />
                        <Star className="size-4 fill-orange-400 text-orange-400" />
                        <Star className="size-4 fill-orange-400 text-orange-400" />
                        <Star className="size-4 fill-orange-400 text-orange-400" />
                      </div>

                      <p
                        className={cn(
                          "text-muted-foreground flex-1 leading-7",
                          isArabic && "text-right"
                        )}
                      >
                        {testimonial.comment}
                      </p>

                      <div
                        className={cn(
                          "flex flex-row items-center gap-4",
                          isArabic && "flex-row-reverse"
                        )}
                      >
                        <Avatar className="size-12">
                          <AvatarImage src={review.image} alt={t.imageAlt} />
                          <AvatarFallback>
                            {testimonial.name
                              ?.split(" ")
                              .slice(0, 2)
                              .map((part) => part.charAt(0))
                              .join("")
                              .toUpperCase() || "PC"}
                          </AvatarFallback>
                        </Avatar>

                        <div
                          className={cn(
                            "flex flex-col space-y-1",
                            isArabic && "items-end text-right"
                          )}
                        >
                          <CardTitle>{testimonial.name}</CardTitle>
                          <CardDescription>
                            {testimonial.role}
                          </CardDescription>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>

          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </SectionContainer>
  );
};