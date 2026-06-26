"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  HeartPulse,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { ChatWidget } from "@/components/chat-widget";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/* =========================================================
   🌐 API Helpers
========================================================= */
const ENV_API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (ENV_API_BASE) {
    return `${ENV_API_BASE}${normalizedPath}`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalizedPath}`;
  }

  return normalizedPath;
}

/* =========================================================
   🌐 Types
========================================================= */
type AppLocale = "ar" | "en";

type ProgramValue =
  | "starter_plan"
  | "growth_plan"
  | "sales_invoicing"
  | "inventory_operations"
  | "treasury_payments"
  | "reports_management";

type ContactPreference = "whatsapp" | "phone" | "email";

type RegisterFormState = {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  program: ProgramValue;
  contactPreference: ContactPreference;
  message: string;
};

type ProgramOption = {
  value: ProgramValue;
  icon: React.ElementType;
  title: Record<AppLocale, string>;
  description: Record<AppLocale, string>;
};

type Content = {
  badge: string;
  title: string;
  description: string;
  primaryNote: string;
  formTitle: string;
  formDescription: string;
  fullName: string;
  fullNamePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  city: string;
  cityPlaceholder: string;
  program: string;
  contactPreference: string;
  message: string;
  messagePlaceholder: string;
  submit: string;
  submitting: string;
  backHome: string;
  viewPricing: string;
  contactUs: string;
  nextStepsTitle: string;
  disclaimerTitle: string;
  disclaimerText: string;
  sideTitle: string;
  sideDescription: string;
  steps: Array<{
    title: string;
    description: string;
  }>;
  contactPreferences: Record<ContactPreference, string>;
  validation: {
    fullName: string;
    phone: string;
    email: string;
    city: string;
    program: string;
    submitError: string;
    submitSuccess: string;
  };
};

/* =========================================================
   🧭 Options
========================================================= */
const programOptions: ProgramOption[] = [
  {
    value: "starter_plan",
    icon: UserRound,
    title: {
      ar: "باقة البداية",
      en: "Starter Plan",
    },
    description: {
      ar: "مناسبة للبدء بالمحاسبة الأساسية وإدارة الأعمال اليومية.",
      en: "Suitable for starting with core accounting and business management.",
    },
  },
  {
    value: "growth_plan",
    icon: HeartPulse,
    title: {
      ar: "باقة النمو",
      en: "Growth Plan",
    },
    description: {
      ar: "مناسبة للشركات النامية التي تحتاج وحدات تشغيلية أكثر.",
      en: "Suitable for growing companies that need more operational modules.",
    },
  },
  {
    value: "sales_invoicing",
    icon: BadgeCheck,
    title: {
      ar: "المبيعات والفوترة",
      en: "Sales & Invoicing",
    },
    description: {
      ar: "إدارة العملاء وعروض الأسعار والفواتير وضريبة القيمة المضافة وسير عمل المبيعات.",
      en: "Manage quotations, invoices, customers, VAT, and sales workflow.",
    },
  },
  {
    value: "inventory_operations",
    icon: ShieldCheck,
    title: {
      ar: "المخزون والعمليات",
      en: "Inventory Operations",
    },
    description: {
      ar: "إدارة المنتجات والمستودعات وحركات المخزون والرقابة التشغيلية.",
      en: "Manage products, warehouses, stock movements, and inventory control.",
    },
  },
  {
    value: "treasury_payments",
    icon: Sparkles,
    title: {
      ar: "الخزينة والمدفوعات",
      en: "Treasury & Payments",
    },
    description: {
      ar: "متابعة النقد والبنوك ومدفوعات العملاء والموردين والتحويلات.",
      en: "Track cash, bank accounts, customer payments, supplier payments, and transfers.",
    },
  },
  {
    value: "reports_management",
    icon: HeartPulse,
    title: {
      ar: "التقارير والإدارة",
      en: "Reports & Management",
    },
    description: {
      ar: "متابعة أداء الشركة من خلال التقارير ولوحات المعلومات.",
      en: "Use dashboards and reports to follow company performance and operations.",
    },
  },
];

/* =========================================================
   📝 Localized Content
========================================================= */
const content: Record<AppLocale, Content> = {
  ar: {
    badge: "طلب تجربة Mhamcloud",
    title: "ابدأ رحلتك مع نظام محاسبي وإداري سحابي",
    description:
      "املأ بياناتك واختر الباقة أو الوحدات المناسبة لشركتك، وسيتواصل معك فريق Mhamcloud لتوضيح إمكانيات المنصة وخطوات التفعيل.",
    primaryNote:
      "Mhamcloud منصة محاسبية وإدارية سحابية لاستخدام الشركات وإدارة العمليات اليومية.",
    formTitle: "بيانات طلب التجربة",
    formDescription:
      "أدخل بياناتك الأساسية وسنساعدك في اختيار الخيار الأنسب لشركتك.",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "مثال: مازن العتيبي",
    phone: "رقم الجوال",
    phonePlaceholder: "05XXXXXXXX",
    email: "البريد الإلكتروني",
    emailPlaceholder: "name@example.com",
    city: "المدينة",
    cityPlaceholder: "مثال: الرياض",
    program: "الباقة أو الوحدات المطلوبة",
    contactPreference: "طريقة التواصل المفضلة",
    message: "ملاحظات إضافية",
    messagePlaceholder:
      "اكتب أي تفاصيل مهمة مثل نشاط الشركة، عدد المستخدمين، الفروع، أو الوحدات التي تحتاجها...",
    submit: "إرسال طلب التجربة",
    submitting: "جارٍ إرسال الطلب...",
    backHome: "العودة للرئيسية",
    viewPricing: "عرض الباقات",
    contactUs: "تواصل معنا",
    nextStepsTitle: "ماذا يحدث بعد إرسال الطلب؟",
    disclaimerTitle: "تنبيه مهم",
    disclaimerText:
      "الوحدات والحدود وشروط الاشتراك تختلف حسب الباقة وإعدادات الشركة. سيتم توضيح التفاصيل قبل التفعيل.",
    sideTitle: "Mhamcloud تجعل اختيار النظام أوضح",
    sideDescription:
      "بدل استخدام أدوات متفرقة، اختر منصة محاسبية وإدارية تساعد شركتك على إدارة العمليات اليومية من مكان واحد.",
    steps: [
      {
        title: "نراجع طلبك",
        description:
          "نراجع الباقة والوحدات التي تناسب احتياج شركتك.",
      },
      {
        title: "نوضح إمكانيات النظام",
        description:
          "نوضح لك الوحدات المتاحة وخطوات الإعداد وشروط الاشتراك قبل التفعيل.",
      },
      {
        title: "تبدأ استخدام النظام",
        description:
          "بعد التفعيل، يمكن لشركتك استخدام Mhamcloud حسب المستخدمين والوحدات المفعلة.",
      },
    ],
    contactPreferences: {
      whatsapp: "واتساب",
      phone: "اتصال هاتفي",
      email: "البريد الإلكتروني",
    },
    validation: {
      fullName: "اكتب الاسم الكامل",
      phone: "اكتب رقم جوال صحيح",
      email: "اكتب بريدًا إلكترونيًا صحيحًا",
      city: "اكتب المدينة",
      program: "اختر الباقة أو الوحدات",
      submitError: "تعذر إرسال طلب التجربة",
      submitSuccess: "تم إرسال طلب التجربة بنجاح",
    },
  },
  en: {
    badge: "Mhamcloud Subscription Request",
    title: "Start your journey with cloud accounting and business management",
    description:
      "Fill in your details and choose the plan or modules that fit your business needs. The Mhamcloud team will contact you with platform details, setup steps, and subscription options.",
    primaryNote:
      "Mhamcloud is a cloud accounting and ERP platform for business subscriptions and company operations.",
    formTitle: "Company Request Details",
    formDescription:
      "Enter your basic information and we will help you choose the best option for your company.",
    fullName: "Full Name",
    fullNamePlaceholder: "Example: Mazen Alotaibi",
    phone: "Mobile Number",
    phonePlaceholder: "05XXXXXXXX",
    email: "Email",
    emailPlaceholder: "name@example.com",
    city: "City",
    cityPlaceholder: "Example: Riyadh",
    program: "Preferred Plan or Modules",
    contactPreference: "Preferred Contact Method",
    message: "Additional Notes",
    messagePlaceholder:
      "Write any important details such as your company activity, number of users, branches, or the modules you need...",
    submit: "Send Trial Request",
    submitting: "Sending request...",
    backHome: "Back Home",
    viewPricing: "View Plans",
    contactUs: "Contact Us",
    nextStepsTitle: "What happens after submitting?",
    disclaimerTitle: "Important Notice",
    disclaimerText:
      "Available modules, limits, and subscription terms may vary by plan and company setup. Details will be clarified before activation.",
    sideTitle: "Mhamcloud makes choosing business software clearer",
    sideDescription:
      "Instead of using disconnected tools, choose a cloud accounting and ERP platform that helps your company manage daily operations from one place.",
    steps: [
      {
        title: "We review your request",
        description:
          "We review the plan and modules that fit your company needs.",
      },
      {
        title: "We explain the platform",
        description:
          "You receive platform details, available modules, and subscription terms before activation.",
      },
      {
        title: "You start using the platform",
        description:
          "After activation, your company can start using Mhamcloud with the configured users and modules.",
      },
    ],
    contactPreferences: {
      whatsapp: "WhatsApp",
      phone: "Phone Call",
      email: "Email",
    },
    validation: {
      fullName: "Enter your full name",
      phone: "Enter a valid mobile number",
      email: "Enter a valid email address",
      city: "Enter your city",
      program: "Choose a plan or modules",
      submitError: "Failed to send trial request",
      submitSuccess: "Trial request sent successfully",
    },
  },
};

/* =========================================================
   🌐 Locale Helpers
========================================================= */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function getCurrentLocale(): AppLocale {
  const storageLocale =
    typeof window !== "undefined"
      ? window.localStorage.getItem("primey-locale")
      : null;

  const cookieLocale =
    getCookie("lang") || getCookie("locale") || getCookie("NEXT_LOCALE");

  const value = (storageLocale || cookieLocale || "ar").toLowerCase();

  return value.startsWith("ar") ? "ar" : "en";
}

/* =========================================================
   ✅ Validation
========================================================= */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string): boolean {
  const normalized = value.replace(/\s+/g, "");
  return /^(\+9665|9665|05|5)[0-9]{8}$/.test(normalized);
}

/* =========================================================
   🧩 Page
========================================================= */
export default function RegisterPage() {
  const [locale, setLocale] = useState<AppLocale>("ar");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<RegisterFormState>({
    fullName: "",
    phone: "",
    email: "",
    city: "",
    program: "starter_plan",
    contactPreference: "whatsapp",
    message: "",
  });

  useEffect(() => {
    const nextLocale = getCurrentLocale();
    setLocale(nextLocale);

    if (typeof document !== "undefined") {
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
      document.body.setAttribute("dir", nextLocale === "ar" ? "rtl" : "ltr");
    }

    const updateLocale = () => {
      const updatedLocale = getCurrentLocale();
      setLocale(updatedLocale);
    };

    window.addEventListener("primey-locale-changed", updateLocale);
    window.addEventListener("storage", updateLocale);

    return () => {
      window.removeEventListener("primey-locale-changed", updateLocale);
      window.removeEventListener("storage", updateLocale);
    };
  }, []);

  const isArabic = locale === "ar";
  const dir = isArabic ? "rtl" : "ltr";
  const t = content[locale];
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;
  const ForwardIcon = isArabic ? ArrowLeft : ArrowRight;

  const selectedProgram = useMemo(
    () => programOptions.find((item) => item.value === form.program),
    [form.program]
  );

  function updateForm<K extends keyof RegisterFormState>(
    key: K,
    value: RegisterFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validateForm(): boolean {
    if (!form.fullName.trim() || form.fullName.trim().length < 3) {
      toast.error(t.validation.fullName);
      return false;
    }

    if (!isValidPhone(form.phone)) {
      toast.error(t.validation.phone);
      return false;
    }

    if (!isValidEmail(form.email)) {
      toast.error(t.validation.email);
      return false;
    }

    if (!form.city.trim() || form.city.trim().length < 2) {
      toast.error(t.validation.city);
      return false;
    }

    if (!form.program) {
      toast.error(t.validation.program);
      return false;
    }

    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(
        buildApiUrl("/api/public/register-interest/"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            full_name: form.fullName.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            city: form.city.trim(),
            requested_program: form.program,
            requested_program_label:
              selectedProgram?.title[locale] || form.program,
            contact_preference: form.contactPreference,
            message: form.message.trim(),
            source: "Mhamcloud_landing_register",
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || t.validation.submitError);
      }

      toast.success(t.validation.submitSuccess);

      setForm({
        fullName: "",
        phone: "",
        email: "",
        city: "",
        program: "starter_plan",
        contactPreference: "whatsapp",
        message: "",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t.validation.submitError;

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      lang={locale}
      dir={dir}
      className="relative min-h-screen overflow-hidden bg-background"
      suppressHydrationWarning
    >
      {/* خلفيات ناعمة */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-20 left-0 h-[320px] w-[320px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[280px] w-[280px] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <section className="container relative mx-auto px-4 py-10 md:px-6 md:py-16">
        {/* Header */}
        <div
          className={cn(
            "mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
            isArabic && "md:flex-row-reverse"
          )}
        >
          <Link
            href="/"
            className="inline-flex w-fit items-center transition hover:opacity-80"
            aria-label="Mhamcloud"
          >
            <Image
              src="/hero logo.png"
              alt="Mhamcloud"
              width={1200}
              height={420}
              priority
              unoptimized
              className="h-auto w-full max-w-[170px] object-contain"
            />
          </Link>

          <div
            className={cn(
              "flex flex-wrap gap-3",
              isArabic && "justify-start md:justify-end"
            )}
          >
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/">
                <BackIcon className="size-4" />
                {t.backHome}
              </Link>
            </Button>

            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/pricing">{t.viewPricing}</Link>
            </Button>

            <Button asChild className="rounded-2xl">
              <Link href="/contact">
                <MessageCircle className="size-4" />
                {t.contactUs}
              </Link>
            </Button>
          </div>
        </div>

        {/* Hero */}
        <div className="mx-auto max-w-5xl text-center">
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

          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border bg-background/70 px-5 py-4 text-sm leading-7 text-muted-foreground backdrop-blur">
            <div
              className={cn(
                "flex items-start justify-center gap-2",
                isArabic && "flex-row-reverse text-right"
              )}
            >
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{t.primaryNote}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          {/* Side Info */}
          <div className="space-y-6">
            <Card className="overflow-hidden border-primary/15 bg-background/80 backdrop-blur">
              <CardContent className="p-0">
                <div className="relative min-h-[320px] overflow-hidden">
                  <Image
                    src="/hero.png"
                    alt="Mhamcloud platform"
                    fill
                    priority
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

                  <div className="absolute bottom-0 p-6">
                    <Badge className="mb-3 rounded-full">
                      <HeartPulse className="size-4" />
                      Mhamcloud
                    </Badge>

                    <h2
                      className={cn(
                        "text-2xl font-bold",
                        isArabic && "text-right"
                      )}
                    >
                      {t.sideTitle}
                    </h2>

                    <p
                      className={cn(
                        "text-muted-foreground mt-3 max-w-xl leading-7",
                        isArabic && "text-right"
                      )}
                    >
                      {t.sideDescription}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <h3
                  className={cn(
                    "mb-5 text-xl font-bold",
                    isArabic && "text-right"
                  )}
                >
                  {t.nextStepsTitle}
                </h3>

                <div className="space-y-5">
                  {t.steps.map((step, index) => (
                    <div
                      key={step.title}
                      className={cn(
                        "flex gap-4",
                        isArabic && "flex-row-reverse text-right"
                      )}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-8 ring-primary/5">
                        {index + 1}
                      </div>

                      <div>
                        <h4 className="font-semibold">{step.title}</h4>
                        <p className="text-muted-foreground mt-1 leading-7">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-6">
                <div
                  className={cn(
                    "flex gap-3",
                    isArabic && "flex-row-reverse text-right"
                  )}
                >
                  <ShieldCheck className="mt-1 size-5 shrink-0 text-amber-600" />

                  <div>
                    <h3 className="font-bold">{t.disclaimerTitle}</h3>
                    <p className="text-muted-foreground mt-2 leading-7">
                      {t.disclaimerText}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form */}
          <Card className="relative overflow-hidden border-primary/15 bg-background/85 shadow-xl backdrop-blur">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

            <CardContent className="p-6 md:p-8">
              <div className={cn("mb-8", isArabic && "text-right")}>
                <Badge variant="secondary" className="mb-4 rounded-full">
                  <CheckCircle2 className="size-4 text-primary" />
                  {t.formTitle}
                </Badge>

                <h2 className="text-2xl font-bold md:text-3xl">
                  {t.formTitle}
                </h2>

                <p className="text-muted-foreground mt-3 leading-7">
                  {t.formDescription}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="fullName"
                      className={cn(
                        "text-sm font-semibold",
                        isArabic && "block text-right"
                      )}
                    >
                      {t.fullName}
                    </label>

                    <div className="relative">
                      <UserRound
                        className={cn(
                          "text-muted-foreground absolute top-1/2 size-4 -translate-y-1/2",
                          isArabic ? "right-3" : "left-3"
                        )}
                      />

                      <Input
                        id="fullName"
                        value={form.fullName}
                        onChange={(event) =>
                          updateForm("fullName", event.target.value)
                        }
                        placeholder={t.fullNamePlaceholder}
                        className={cn(isArabic ? "pr-10 text-right" : "pl-10")}
                        dir={dir}
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="phone"
                      className={cn(
                        "text-sm font-semibold",
                        isArabic && "block text-right"
                      )}
                    >
                      {t.phone}
                    </label>

                    <div className="relative">
                      <Phone
                        className={cn(
                          "text-muted-foreground absolute top-1/2 size-4 -translate-y-1/2",
                          isArabic ? "right-3" : "left-3"
                        )}
                      />

                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(event) =>
                          updateForm("phone", event.target.value)
                        }
                        placeholder={t.phonePlaceholder}
                        className={cn(isArabic ? "pr-10 text-right" : "pl-10")}
                        dir="ltr"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className={cn(
                        "text-sm font-semibold",
                        isArabic && "block text-right"
                      )}
                    >
                      {t.email}
                    </label>

                    <div className="relative">
                      <Mail
                        className={cn(
                          "text-muted-foreground absolute top-1/2 size-4 -translate-y-1/2",
                          isArabic ? "right-3" : "left-3"
                        )}
                      />

                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          updateForm("email", event.target.value)
                        }
                        placeholder={t.emailPlaceholder}
                        className={cn(isArabic ? "pr-10 text-left" : "pl-10")}
                        dir="ltr"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="city"
                      className={cn(
                        "text-sm font-semibold",
                        isArabic && "block text-right"
                      )}
                    >
                      {t.city}
                    </label>

                    <div className="relative">
                      <MapPin
                        className={cn(
                          "text-muted-foreground absolute top-1/2 size-4 -translate-y-1/2",
                          isArabic ? "right-3" : "left-3"
                        )}
                      />

                      <Input
                        id="city"
                        value={form.city}
                        onChange={(event) =>
                          updateForm("city", event.target.value)
                        }
                        placeholder={t.cityPlaceholder}
                        className={cn(isArabic ? "pr-10 text-right" : "pl-10")}
                        dir={dir}
                        autoComplete="address-level2"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label
                    className={cn(
                      "text-sm font-semibold",
                      isArabic && "block text-right"
                    )}
                  >
                    {t.program}
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    {programOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = form.program === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateForm("program", option.value)}
                          className={cn(
                            "rounded-2xl border bg-background/80 p-4 text-start transition",
                            "hover:border-primary/50 hover:bg-primary/5",
                            isSelected &&
                              "border-primary bg-primary/10 ring-2 ring-primary/15",
                            isArabic && "text-right"
                          )}
                        >
                          <div
                            className={cn(
                              "flex gap-3",
                              isArabic && "flex-row-reverse"
                            )}
                          >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              <Icon className="size-5" />
                            </div>

                            <div>
                              <div className="font-bold">
                                {option.title[locale]}
                              </div>

                              <p className="text-muted-foreground mt-1 text-sm leading-6">
                                {option.description[locale]}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <label
                    className={cn(
                      "text-sm font-semibold",
                      isArabic && "block text-right"
                    )}
                  >
                    {t.contactPreference}
                  </label>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {(
                      Object.keys(t.contactPreferences) as ContactPreference[]
                    ).map((preference) => {
                      const isSelected = form.contactPreference === preference;

                      return (
                        <button
                          key={preference}
                          type="button"
                          onClick={() =>
                            updateForm("contactPreference", preference)
                          }
                          className={cn(
                            "rounded-2xl border bg-background/80 px-4 py-3 text-sm font-semibold transition",
                            "hover:border-primary/50 hover:bg-primary/5",
                            isSelected &&
                              "border-primary bg-primary/10 text-primary ring-2 ring-primary/15"
                          )}
                        >
                          {t.contactPreferences[preference]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="message"
                    className={cn(
                      "text-sm font-semibold",
                      isArabic && "block text-right"
                    )}
                  >
                    {t.message}
                  </label>

                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(event) =>
                      updateForm("message", event.target.value)
                    }
                    placeholder={t.messagePlaceholder}
                    rows={5}
                    className={cn("resize-none", isArabic && "text-right")}
                    dir={dir}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t.submitting}
                    </>
                  ) : (
                    <>
                      {t.submit}
                      <ForwardIcon className="size-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* الدعم العائم */}
      <ChatWidget />
    </main>
  );
}