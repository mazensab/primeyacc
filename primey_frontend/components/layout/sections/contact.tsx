"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import SectionContainer from "@/components/layout/section-container";
import SectionHeader from "@/components/layout/section-header";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
   🧩 Types
========================================================= */
const SUBJECT_OPTIONS = [
  "Join Mhamcloud",
  "Ask About Benefits",
  "Healthcare Network",
  "Family Card",
  "Medical Programs",
  "Customer Support",
] as const;

type AppLang = "ar" | "en";
type SubjectOption = (typeof SUBJECT_OPTIONS)[number];

type ContactFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  subject: SubjectOption;
  message: string;
};

type ContactContent = {
  section: {
    subTitle: string;
    title: string;
    description: string;
  };
  contactInfo: {
    locationLabel: string;
    locationValue: string;
    phoneLabel: string;
    phoneValue: string;
    whatsappLabel: string;
    whatsappValue: string;
    emailLabel: string;
    emailValue: string;
    businessHoursLabel: string;
    businessHoursValue: string;
  };
  form: {
    cardTitle: string;
    firstName: string;
    lastName: string;
    email: string;
    subject: string;
    message: string;
    firstNamePlaceholder: string;
    lastNamePlaceholder: string;
    emailPlaceholder: string;
    subjectPlaceholder: string;
    messagePlaceholder: string;
    submit: string;
    submitting: string;
  };
  validation: {
    firstNameRequired: string;
    lastNameRequired: string;
    tooLong: string;
    invalidEmail: string;
    selectSubject: string;
    messageTooShort: string;
    messageTooLong: string;
  };
  toast: {
    success: string;
    errorDefault: string;
    sendFailed: string;
  };
  subjects: Record<SubjectOption, string>;
};

/* =========================================================
   📝 Localized Content
========================================================= */
const content: Record<AppLang, ContactContent> = {
  ar: {
    section: {
      subTitle: "تواصل معنا",
      title: "هل تريد معرفة البطاقة أو البرنامج الأنسب لك؟",
      description:
        "أرسل لنا استفسارك وسنساعدك في اختيار بطاقة أو برنامج Mhamcloud المناسب لك ولعائلتك، مع توضيح المزايا والشبكة الطبية المتاحة حسب احتياجك.",
    },
    contactInfo: {
      locationLabel: "الموقع:",
      locationValue: "المملكة العربية السعودية",
      phoneLabel: "اتصل بنا:",
      phoneValue: "00966 (50) 526-3775",
      whatsappLabel: "واتساب:",
      whatsappValue: "تواصل سريع للاستفسار عن المزايا والاشتراك",
      emailLabel: "البريد الإلكتروني:",
      emailValue: "info@mhamcloud.sa",
      businessHoursLabel: "ساعات التواصل:",
      businessHoursValue: "من السبت إلى الخميس، 9 صباحًا - 5 مساءً",
    },
    form: {
      cardTitle: "أرسل استفسارك",
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      email: "البريد الإلكتروني",
      subject: "نوع الاستفسار",
      message: "الرسالة",
      firstNamePlaceholder: "مازن",
      lastNamePlaceholder: "العتيبي",
      emailPlaceholder: "name@example.com",
      subjectPlaceholder: "اختر نوع الاستفسار",
      messagePlaceholder:
        "اكتب استفسارك هنا، مثل المدينة، نوع البطاقة، أو الخدمة الطبية التي تريد معرفة مزاياها...",
      submit: "إرسال الاستفسار",
      submitting: "جارٍ الإرسال...",
    },
    validation: {
      firstNameRequired: "الاسم الأول مطلوب",
      lastNameRequired: "اسم العائلة مطلوب",
      tooLong: "النص طويل جدًا",
      invalidEmail: "البريد الإلكتروني غير صالح",
      selectSubject: "يرجى اختيار نوع الاستفسار",
      messageTooShort: "الرسالة قصيرة جدًا",
      messageTooLong: "الرسالة طويلة جدًا",
    },
    toast: {
      success: "تم إرسال استفسارك بنجاح.",
      errorDefault: "حدث خطأ أثناء إرسال الاستفسار.",
      sendFailed: "تعذر إرسال الاستفسار",
    },
    subjects: {
      "Join Mhamcloud": "الاشتراك في Mhamcloud",
      "Ask About Benefits": "الاستفسار عن المزايا",
      "Healthcare Network": "الشبكة الطبية والمراكز المشاركة",
      "Family Card": "البطاقة العائلية",
      "Medical Programs": "البرامج الطبية",
      "Customer Support": "الدعم والمساعدة",
    },
  },
  en: {
    section: {
      subTitle: "Contact",
      title: "Need help choosing the right card or program?",
      description:
        "Send us your inquiry and we will help you choose the Mhamcloud card or program that fits you and your family, with clear details about benefits and available healthcare providers.",
    },
    contactInfo: {
      locationLabel: "Location:",
      locationValue: "Saudi Arabia",
      phoneLabel: "Call us:",
      phoneValue: "+966 (50) 526-3775",
      whatsappLabel: "WhatsApp:",
      whatsappValue: "Quick support for benefits and subscription inquiries",
      emailLabel: "Email:",
      emailValue: "info@mhamcloud.sa",
      businessHoursLabel: "Contact Hours:",
      businessHoursValue: "Saturday to Thursday, 9 AM - 5 PM",
    },
    form: {
      cardTitle: "Send Your Inquiry",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      subject: "Inquiry Type",
      message: "Message",
      firstNamePlaceholder: "First name",
      lastNamePlaceholder: "Last name",
      emailPlaceholder: "name@example.com",
      subjectPlaceholder: "Select inquiry type",
      messagePlaceholder:
        "Write your inquiry here, such as your city, preferred card type, or the healthcare service you want to know about...",
      submit: "Send Inquiry",
      submitting: "Sending...",
    },
    validation: {
      firstNameRequired: "First name is required",
      lastNameRequired: "Last name is required",
      tooLong: "Too long",
      invalidEmail: "Invalid email address",
      selectSubject: "Please select an inquiry type",
      messageTooShort: "Message is too short",
      messageTooLong: "Message is too long",
    },
    toast: {
      success: "Your inquiry has been sent successfully.",
      errorDefault: "Something went wrong while sending your inquiry.",
      sendFailed: "Failed to send inquiry",
    },
    subjects: {
      "Join Mhamcloud": "Join Mhamcloud",
      "Ask About Benefits": "Ask About Benefits",
      "Healthcare Network": "Healthcare Network",
      "Family Card": "Family Card",
      "Medical Programs": "Medical Programs",
      "Customer Support": "Customer Support",
    },
  },
};

/* =========================================================
   🍪 Language Helpers
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

  if (cookieLang === "ar") return "ar";
  return "en";
}

/* =========================================================
   ✅ Validation
========================================================= */
function createFormSchema(t: ContactContent) {
  return z.object({
    firstName: z
      .string()
      .trim()
      .min(1, t.validation.firstNameRequired)
      .max(50, t.validation.tooLong),
    lastName: z
      .string()
      .trim()
      .min(1, t.validation.lastNameRequired)
      .max(50, t.validation.tooLong),
    email: z.string().trim().email(t.validation.invalidEmail),
    subject: z.enum(SUBJECT_OPTIONS, {
      errorMap: () => ({ message: t.validation.selectSubject }),
    }),
    message: z
      .string()
      .trim()
      .min(2, t.validation.messageTooShort)
      .max(2000, t.validation.messageTooLong),
  });
}

/* =========================================================
   🧩 Section
========================================================= */
export const ContactSection = () => {
  const [lang, setLang] = useState<AppLang>("en");
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const nextLang = getCurrentLang();

    setLang(nextLang);
    setMounted(true);

    if (typeof document !== "undefined") {
      const observer = new MutationObserver(() => {
        const updatedLang = getCurrentLang();
        setLang((prev) => (prev === updatedLang ? prev : updatedLang));
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["lang", "dir"],
      });

      return () => observer.disconnect();
    }
  }, []);

  const t = content[lang];
  const isArabic = lang === "ar";
  const dir = isArabic ? "rtl" : "ltr";

  const formSchema = useMemo(() => createFormSchema(t), [t]);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      subject: undefined,
      message: "",
    },
  });

  useEffect(() => {
    if (!mounted) return;
    form.clearErrors();
  }, [lang, mounted, form]);

  async function onSubmit(values: ContactFormValues) {
    setIsSubmitting(true);

    try {
      const response = await fetch(buildApiUrl("/api/public/contact/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          first_name: values.firstName,
          last_name: values.lastName,
          email: values.email,
          subject: values.subject,
          message: values.message,
          source: "primey_care_landing",
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || t.toast.sendFailed);
      }

      toast.success(t.toast.success);

      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        subject: undefined,
        message: "",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t.toast.errorDefault;

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SectionContainer id="contact">
      <div dir={dir} className={cn("w-full", isArabic && "font-[inherit]")}>
        <SectionHeader
          subTitle={t.section.subTitle}
          title={t.section.title}
          description={t.section.description}
        />

        <section className="mx-auto grid max-w-screen-lg grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="flex flex-col gap-6 *:rounded-lg *:border *:p-6">
              <div className="bg-muted">
                <div
                  className={cn(
                    "mb-4 flex items-center gap-3",
                    isArabic && "flex-row-reverse justify-end text-right"
                  )}
                >
                  <MapPin className="size-4 shrink-0" />
                  <div className="font-bold">{t.contactInfo.locationLabel}</div>
                </div>

                <div
                  className={cn(
                    "text-muted-foreground leading-7",
                    isArabic && "text-right"
                  )}
                >
                  {t.contactInfo.locationValue}
                </div>
              </div>

              <div className="bg-muted">
                <div
                  className={cn(
                    "mb-4 flex items-center gap-3",
                    isArabic && "flex-row-reverse justify-end text-right"
                  )}
                >
                  <Phone className="size-4 shrink-0" />
                  <div className="font-bold">{t.contactInfo.phoneLabel}</div>
                </div>

                <div
                  dir="ltr"
                  className={cn(
                    "text-muted-foreground",
                    isArabic && "text-right"
                  )}
                >
                  {t.contactInfo.phoneValue}
                </div>
              </div>

              <div className="bg-muted">
                <div
                  className={cn(
                    "mb-4 flex items-center gap-3",
                    isArabic && "flex-row-reverse justify-end text-right"
                  )}
                >
                  <MessageCircle className="size-4 shrink-0" />
                  <div className="font-bold">
                    {t.contactInfo.whatsappLabel}
                  </div>
                </div>

                <div
                  className={cn(
                    "text-muted-foreground leading-7",
                    isArabic && "text-right"
                  )}
                >
                  {t.contactInfo.whatsappValue}
                </div>
              </div>

              <div className="bg-muted">
                <div
                  className={cn(
                    "mb-4 flex items-center gap-3",
                    isArabic && "flex-row-reverse justify-end text-right"
                  )}
                >
                  <Mail className="size-4 shrink-0" />
                  <div className="font-bold">{t.contactInfo.emailLabel}</div>
                </div>

                <div
                  dir="ltr"
                  className={cn(
                    "text-muted-foreground",
                    isArabic && "text-right"
                  )}
                >
                  {t.contactInfo.emailValue}
                </div>
              </div>

              <div className="bg-muted">
                <div
                  className={cn(
                    "mb-4 flex items-center gap-3",
                    isArabic && "flex-row-reverse justify-end text-right"
                  )}
                >
                  <Clock className="size-4 shrink-0" />
                  <div className="font-bold">
                    {t.contactInfo.businessHoursLabel}
                  </div>
                </div>

                <div
                  className={cn(
                    "text-muted-foreground leading-7",
                    isArabic && "text-right"
                  )}
                >
                  {t.contactInfo.businessHoursValue}
                </div>
              </div>
            </div>
          </div>

          <Card className="bg-muted">
            <CardHeader>
              <CardTitle className={cn(isArabic && "text-right")}>
                {t.form.cardTitle}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="grid w-full gap-6"
                >
                  <div
                    className={cn(
                      "flex flex-col gap-6 md:flex-row",
                      isArabic && "md:flex-row-reverse"
                    )}
                  >
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field, fieldState }) => (
                        <FormItem className="w-full gap-4">
                          <FormLabel
                            className={cn(
                              "font-semibold",
                              isArabic && "text-right"
                            )}
                          >
                            {t.form.firstName}
                          </FormLabel>

                          <FormControl>
                            <Input
                              placeholder={t.form.firstNamePlaceholder}
                              dir={isArabic ? "rtl" : "ltr"}
                              className={cn(isArabic && "text-right")}
                              {...field}
                            />
                          </FormControl>

                          {fieldState.error && (
                            <p
                              className={cn(
                                "text-sm text-red-500",
                                isArabic && "text-right"
                              )}
                            >
                              {fieldState.error.message}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field, fieldState }) => (
                        <FormItem className="w-full gap-4">
                          <FormLabel
                            className={cn(
                              "font-semibold",
                              isArabic && "text-right"
                            )}
                          >
                            {t.form.lastName}
                          </FormLabel>

                          <FormControl>
                            <Input
                              placeholder={t.form.lastNamePlaceholder}
                              dir={isArabic ? "rtl" : "ltr"}
                              className={cn(isArabic && "text-right")}
                              {...field}
                            />
                          </FormControl>

                          {fieldState.error && (
                            <p
                              className={cn(
                                "text-sm text-red-500",
                                isArabic && "text-right"
                              )}
                            >
                              {fieldState.error.message}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <FormItem className="gap-4">
                        <FormLabel
                          className={cn(
                            "font-semibold",
                            isArabic && "text-right"
                          )}
                        >
                          {t.form.email}
                        </FormLabel>

                        <FormControl>
                          <Input
                            type="email"
                            placeholder={t.form.emailPlaceholder}
                            dir="ltr"
                            className="text-left"
                            {...field}
                          />
                        </FormControl>

                        {fieldState.error && (
                          <p
                            className={cn(
                              "text-sm text-red-500",
                              isArabic && "text-right"
                            )}
                          >
                            {fieldState.error.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field, fieldState }) => (
                      <FormItem className="gap-4">
                        <FormLabel
                          className={cn(
                            "font-semibold",
                            isArabic && "text-right"
                          )}
                        >
                          {t.form.subject}
                        </FormLabel>

                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          dir={dir}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(
                                "w-full",
                                isArabic && "text-right"
                              )}
                            >
                              <SelectValue
                                placeholder={t.form.subjectPlaceholder}
                              />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {SUBJECT_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {t.subjects[option]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {fieldState.error && (
                          <p
                            className={cn(
                              "text-sm text-red-500",
                              isArabic && "text-right"
                            )}
                          >
                            {fieldState.error.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field, fieldState }) => (
                      <FormItem className="gap-4">
                        <FormLabel
                          className={cn(
                            "font-semibold",
                            isArabic && "text-right"
                          )}
                        >
                          {t.form.message}
                        </FormLabel>

                        <FormControl>
                          <Textarea
                            rows={5}
                            placeholder={t.form.messagePlaceholder}
                            className={cn(
                              "resize-none",
                              isArabic && "text-right"
                            )}
                            dir={isArabic ? "rtl" : "ltr"}
                            {...field}
                          />
                        </FormControl>

                        {fieldState.error && (
                          <p
                            className={cn(
                              "text-sm text-red-500",
                              isArabic && "text-right"
                            )}
                          >
                            {fieldState.error.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <Button size="lg" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t.form.submitting : t.form.submit}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>
      </div>
    </SectionContainer>
  );
};