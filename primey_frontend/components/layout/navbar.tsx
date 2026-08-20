"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Calculator,
  ChevronLeftIcon,
  ChevronRightIcon,
  Languages,
  Landmark,
  Menu,
  ReceiptText,
  ShoppingCart,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleTheme } from "@/components/layout/toogle-theme";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

type AppLocale = "ar" | "en";

type NavbarProps = {
  initialLocale?: AppLocale;
};

type LocalizedText = {
  ar: string;
  en: string;
};

type LandingRoute = {
  href: string;
  label: LocalizedText;
};

type LandingSolution = {
  href: string;
  title: LocalizedText;
  description: LocalizedText;
  icon: React.ElementType;
};

const landingRoutes: LandingRoute[] = [
  {
    href: "/#benefits",
    label: {
      ar: "المزايا",
      en: "Benefits",
    },
  },

  {
    href: "/pricing",
    label: {
      ar: "الباقات",
      en: "Pricing",
    },
  },
  {
    href: "/#faq",
    label: {
      ar: "الأسئلة الشائعة",
      en: "FAQ",
    },
  },
  {
    href: "/contact",
    label: {
      ar: "تواصل معنا",
      en: "Contact",
    },
  },
];

const landingSolutions: LandingSolution[] = [
  {
    href: "/#solutions",
    title: {
      ar: "المحاسبة والمالية",
      en: "Accounting & Finance",
    },
    description: {
      ar: "قيود وحسابات وتقارير مالية مترابطة تساعدك على متابعة أعمالك بدقة.",
      en: "Connected accounting, journals, and financial reports for clearer control.",
    },
    icon: Calculator,
  },
  {
    href: "/#solutions",
    title: {
      ar: "المبيعات والفوترة",
      en: "Sales & Invoicing",
    },
    description: {
      ar: "إدارة العملاء والفواتير ومتابعة دورة المبيعات من مكان واحد.",
      en: "Manage customers, invoices, and your complete sales workflow.",
    },
    icon: ReceiptText,
  },
  {
    href: "/#solutions",
    title: {
      ar: "المشتريات والموردون",
      en: "Purchases & Suppliers",
    },
    description: {
      ar: "نظم الموردين والمشتريات والالتزامات ومتابعة العمليات بسهولة.",
      en: "Organize suppliers, purchases, obligations, and operational follow-up.",
    },
    icon: ShoppingCart,
  },
  {
    href: "/#solutions",
    title: {
      ar: "المخزون",
      en: "Inventory",
    },
    description: {
      ar: "متابعة المنتجات والمستودعات والحركات والمخزون بشكل متكامل.",
      en: "Track products, warehouses, stock levels, and movements.",
    },
    icon: Boxes,
  },
  {
    href: "/#solutions",
    title: {
      ar: "الخزينة والمدفوعات",
      en: "Treasury & Payments",
    },
    description: {
      ar: "إدارة النقد والبنوك والتحصيل والمدفوعات ضمن دورة مالية موحدة.",
      en: "Manage cash, banks, collections, and payments in one financial flow.",
    },
    icon: Landmark,
  },
  {
    href: "/#solutions",
    title: {
      ar: "العملاء والموردون",
      en: "Customers & Suppliers",
    },
    description: {
      ar: "ملف متكامل لكل طرف مع الأرصدة والحركات والتفاصيل المرتبطة.",
      en: "Complete party profiles with balances, movements, and related details.",
    },
    icon: UsersRound,
  },
];

function normalizeLocale(value?: string | null): AppLocale {
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

function setLocaleCookie(locale: AppLocale) {
  const oneYearInSeconds = 60 * 60 * 24 * 365;

  document.cookie = `lang=${locale}; path=/; max-age=${oneYearInSeconds}; samesite=lax`;
  document.cookie = `locale=${locale}; path=/; max-age=${oneYearInSeconds}; samesite=lax`;
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${oneYearInSeconds}; samesite=lax`;
}

export const Navbar = ({ initialLocale = "ar" }: NavbarProps) => {
  const router = useRouter();

  const [isOpen, setIsOpen] = React.useState(false);
  const [locale, setLocale] = useState<AppLocale>(initialLocale);

  useEffect(() => {
    try {
      const savedLocale =
        typeof window !== "undefined"
          ? window.localStorage.getItem("primey-locale")
          : null;

      const cookieLocale =
        typeof document !== "undefined"
          ? document.cookie
              .split("; ")
              .find((item) => item.startsWith("lang="))
              ?.split("=")[1]
          : null;

      const nextLocale = normalizeLocale(
        savedLocale || cookieLocale || initialLocale
      );

      setLocale(nextLocale);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("primey-locale", nextLocale);
      }

      if (typeof document !== "undefined") {
        document.documentElement.lang = nextLocale;
        document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
        document.body.setAttribute("dir", nextLocale === "ar" ? "rtl" : "ltr");
      }
    } catch (error) {
      console.error("Navbar locale initialization error:", error);
    }
  }, [initialLocale]);

  const isArabic = locale === "ar";
  const ArrowIcon = isArabic ? ChevronLeftIcon : ChevronRightIcon;

  const text = {
    logoAlt: "Mhamcloud",
    solutions: isArabic ? "المنتج والحلول" : "Product & Solutions",
    login: isArabic ? "تسجيل الدخول" : "Log in",
    register: isArabic ? "ابدأ الآن" : "Get Started",
    switchLanguage: isArabic ? "التبديل إلى الإنجليزية" : "Switch to Arabic",
    mobileMenu: isArabic ? "قائمة Mhamcloud" : "Mhamcloud Menu",
  };

  const toggleLanguage = () => {
    try {
      const nextLocale: AppLocale = locale === "ar" ? "en" : "ar";

      setLocale(nextLocale);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("primey-locale", nextLocale);
        window.dispatchEvent(new Event("primey-locale-changed"));
      }

      if (typeof document !== "undefined") {
        setLocaleCookie(nextLocale);
        document.documentElement.lang = nextLocale;
        document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
        document.body.setAttribute("dir", nextLocale === "ar" ? "rtl" : "ltr");
      }

      router.refresh();
    } catch (error) {
      console.error("Navbar language toggle error:", error);
    }
  };

  return (
    <header className="sticky top-3 z-50 px-3 sm:px-5 lg:top-4 lg:px-7">
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className={cn(
          "mx-auto flex min-h-[70px] w-full max-w-[1480px] items-center justify-between gap-4",
          "rounded-[26px] border border-white/75",
          "bg-[linear-gradient(115deg,rgba(255,255,255,0.76)_0%,rgba(248,250,252,0.62)_100%)]",
          "px-4 shadow-[0_18px_54px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.85)]",
          "backdrop-blur-2xl",
          "sm:min-h-[76px] sm:px-6",
          "lg:min-h-[82px] lg:px-7",
          "dark:border-white/10 dark:bg-[linear-gradient(115deg,rgba(17,24,39,0.86)_0%,rgba(3,7,18,0.78)_100%)]"
        )}
      >
        <Link
          href="/"
          className="flex shrink-0 items-center transition hover:opacity-85"
          aria-label={text.logoAlt}
        >
          <Image
            src="/hero logo.png"
            alt={text.logoAlt}
            width={1200}
            height={420}
            priority
            unoptimized
            className="h-auto w-auto max-w-[108px] object-contain sm:max-w-[124px] lg:max-w-[144px]"
          />
        </Link>

        <div className="flex items-center gap-2 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="h-9 rounded-full border-border/70 bg-background/70 px-3 shadow-sm backdrop-blur-xl"
          >
            <Languages className="size-4" />
            <span>{isArabic ? "EN" : "عربي"}</span>
          </Button>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 rounded-xl border-border/70 bg-background/70 shadow-sm backdrop-blur-xl"
                aria-label={text.mobileMenu}
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side={isArabic ? "right" : "left"}
              dir={isArabic ? "rtl" : "ltr"}
              className="flex w-[90vw] max-w-sm flex-col bg-background/95 backdrop-blur-2xl"
            >
              <SheetHeader>
                <SheetTitle className="flex justify-start">
                  <Image
                    src="/hero logo.png"
                    alt={text.logoAlt}
                    width={1200}
                    height={420}
                    priority
                    unoptimized
                    className="h-auto w-auto max-w-[132px] object-contain"
                  />
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 flex flex-1 flex-col gap-2">
                <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {text.solutions}
                </div>

                {landingSolutions.map(({ href, title, icon: Icon }) => (
                  <Button
                    key={title.en}
                    asChild
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "h-11 gap-3 rounded-xl",
                      isArabic
                        ? "justify-start text-right"
                        : "justify-start text-left"
                    )}
                  >
                    <Link href={href}>
                      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/8 text-primary">
                        <Icon className="size-4" />
                      </span>

                      {isArabic ? title.ar : title.en}
                    </Link>
                  </Button>
                ))}

                <Separator className="my-3" />

                {landingRoutes.map(({ href, label }) => (
                  <Button
                    key={href}
                    asChild
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "h-11 rounded-xl",
                      isArabic
                        ? "justify-start text-right"
                        : "justify-start text-left"
                    )}
                  >
                    <Link href={href}>
                      {isArabic ? label.ar : label.en}
                    </Link>
                  </Button>
                ))}

                <Separator className="my-3" />

                <Button
                  asChild
                  onClick={() => setIsOpen(false)}
                  className="h-11 rounded-xl"
                >
                  <Link href="/register">
                    {text.register}
                    <ArrowIcon className="size-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="h-11 rounded-xl"
                >
                  <Link href="/login">{text.login}</Link>
                </Button>
              </div>

              <SheetFooter className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={toggleLanguage}
                    className="rounded-xl"
                  >
                    <Languages className="size-4" />
                    {text.switchLanguage}
                  </Button>

                  <ToggleTheme />
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        <NavigationMenu className="mx-auto hidden lg:block">
          <NavigationMenuList className="gap-1">
            <NavigationMenuItem>
              <NavigationMenuTrigger className="h-10 rounded-xl bg-transparent px-4 text-sm font-semibold hover:bg-muted/60 data-[state=open]:bg-muted/70">
                {text.solutions}
              </NavigationMenuTrigger>

              <NavigationMenuContent className="border-border/70 bg-background/95 shadow-xl backdrop-blur-2xl">
                <div className="grid w-[660px] grid-cols-2 gap-2 p-2">
                  {landingSolutions.map(
                    ({ href, title, description, icon: Icon }) => (
                      <Link
                        key={title.en}
                        href={href}
                        className={cn(
                          "group flex gap-4 rounded-2xl border border-transparent p-4",
                          "transition hover:border-border hover:bg-muted/55",
                          isArabic && "flex-row-reverse"
                        )}
                      >
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-background text-primary shadow-sm">
                          <Icon className="size-5" />
                        </span>

                        <span
                          className={cn(
                            "min-w-0",
                            isArabic ? "text-right" : "text-left"
                          )}
                        >
                          <span className="block font-semibold text-foreground">
                            {isArabic ? title.ar : title.en}
                          </span>

                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {isArabic ? description.ar : description.en}
                          </span>
                        </span>
                      </Link>
                    )
                  )}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {landingRoutes.map(({ href, label }) => (
              <NavigationMenuItem key={href}>
                <NavigationMenuLink
                  asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "h-10 rounded-xl bg-transparent px-3 text-sm font-medium hover:bg-muted/55!"
                  )}
                >
                  <Link href={href}>
                    {isArabic ? label.ar : label.en}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="h-9 rounded-full border border-border/70 bg-background/60 px-3 shadow-sm"
          >
            <Languages className="size-4" />
            {isArabic ? "EN" : "عربي"}
          </Button>

          <div className="rounded-xl border border-border/60 bg-background/55 p-1">
            <ToggleTheme />
          </div>

          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-10 rounded-xl px-4"
          >
            <Link href="/login">{text.login}</Link>
          </Button>

          <Button
            size="sm"
            asChild
            className="h-10 rounded-xl px-5 shadow-sm"
          >
            <Link href="/register">
              {text.register}
              <ArrowIcon className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};