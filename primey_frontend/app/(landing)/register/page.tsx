"use client";

import * as React from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";

import { ChatWidget } from "@/components/chat-widget";
import { MoyasarPublicCheckout } from "@/components/payments/moyasar-public-checkout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type AppLocale,
  type BillingCycle,
  type PublicPlan,
  type RegistrationForm,
  type RegistrationGateway,
  type RegistrationOptions,
  type RegistrationResult,
  createPublicRegistration,
  startPublicRegistrationCheckout,
  formatInteger,
  formatMoney,
  isValidEmail,
  isValidSaudiPhone,
  loadRegistrationOptions,
  normalizeSaudiPhone,
} from "@/lib/public-registration";

const localeCopy = {
  ar: {
    badge: "إنشاء حساب شركة",
    title: "ابدأ اشتراك شركتك في Mhamcloud",
    subtitle:
      "أنشئ حساب المالك والشركة، واختر الباقة ودورة الفوترة وبوابة الدفع. يبقى الاشتراك بانتظار الدفع حتى يؤكد النظام عملية الدفع فعليًا.",
    secure: "تسجيل آمن وربط مباشر مع نظام الاشتراكات",
    ownerSection: "بيانات مالك الحساب",
    companySection: "بيانات الشركة",
    subscriptionSection: "اختيار الاشتراك",
    paymentSection: "طريقة الدفع",
    reviewSection: "مراجعة الطلب",
    ownerName: "اسم المالك",
    ownerNamePlaceholder: "مثال: مازن العتيبي",
    phone: "رقم الجوال",
    phonePlaceholder: "05XXXXXXXX",
    email: "البريد الإلكتروني",
    emailPlaceholder: "name@example.com",
    password: "كلمة المرور",
    passwordPlaceholder: "8 أحرف على الأقل",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    companyName: "اسم الشركة",
    companyNamePlaceholder: "الاسم التجاري للشركة",
    commercialRegistration: "السجل التجاري",
    commercialRegistrationPlaceholder: "10 أرقام",
    taxNumber: "الرقم الضريبي",
    taxNumberPlaceholder: "اختياري",
    city: "المدينة",
    cityPlaceholder: "مثال: الرياض",
    plan: "الباقة",
    loadingPlans: "جاري تحميل الباقات...",
    reloadPlans: "إعادة تحميل الباقات",
    noPlans: "لا توجد باقات عامة متاحة حاليًا.",
    monthly: "شهري",
    yearly: "سنوي",
    users: "مستخدم",
    branches: "فرع",
    warehouses: "مستودع",
    pos: "نقطة بيع",
    month: "شهر",
    year: "سنة",
    gateway: "بوابة الدفع",
    autoRenew: "التجديد التلقائي",
    autoRenewHint:
      "يمكنك تغيير إعداد التجديد لاحقًا من صفحة الاشتراك.",
    paymentNotice:
      "إنشاء الطلب لا يعني نجاح الدفع. حالة الدفع النهائية تعتمد فقط على تأكيد الخادم وبوابة الدفع.",
    create: "إنشاء الشركة والاشتراك",
    creating: "جاري إنشاء الحساب...",
    login: "لدي حساب بالفعل",
    backHome: "الرئيسية",
    pricing: "الباقات",
    selectedPlan: "الباقة المختارة",
    selectedCycle: "دورة الفوترة",
    selectedGateway: "بوابة الدفع",
    amount: "المبلغ",
    vatNote:
      "القيمة النهائية تعتمد على تسعير الاشتراك الذي يحسبه الخادم.",
    accountReady: "تم إنشاء حساب الشركة",
    accountReadyDesc:
      "تم إنشاء حساب المالك والشركة والاشتراك ومحاولة الدفع بنجاح. الدفع ما زال بانتظار التأكيد.",
    companyCode: "رمز الشركة",
    username: "اسم المستخدم",
    paymentReference: "مرجع الدفع",
    subscriptionStatus: "حالة الاشتراك",
    paymentStatus: "حالة الدفع",
    nextLogin: "تسجيل الدخول ومتابعة الاشتراك",
    createAnother: "إنشاء تسجيل آخر",
    pendingPayment:
      "لا نعتبر نتيجة المتصفح دليلًا على نجاح الدفع. بعد تسجيل الدخول ستظهر حالة الاشتراك الحقيقية المؤكدة من الخادم.",
    validationOwner: "اكتب اسم المالك بشكل صحيح.",
    validationPhone: "اكتب رقم جوال سعودي صحيحًا.",
    validationEmail: "اكتب بريدًا إلكترونيًا صحيحًا.",
    validationPassword:
      "كلمة المرور يجب ألا تقل عن 8 أحرف.",
    validationCompany: "اكتب اسم الشركة.",
    validationCr:
      "السجل التجاري يجب أن يتكون من 10 أرقام.",
    validationCity: "اكتب المدينة.",
    validationPlan: "اختر باقة اشتراك.",
    validationGateway: "اختر بوابة دفع.",
    loadError: "تعذر تحميل خيارات التسجيل.",
    registrationError: "تعذر إنشاء تسجيل الشركة.",
    registrationSuccess:
      "تم إنشاء حساب الشركة والاشتراك بنجاح.",
    sarAlt: "ريال سعودي",
    moya: "Moyasar",
    tamara: "Tamara",
    tabby: "Tabby",
  },
  en: {
    badge: "Create company account",
    title: "Start your Mhamcloud subscription",
    subtitle:
      "Create the owner and company account, select a plan, billing cycle, and payment gateway. The subscription stays pending until payment is verified by the backend.",
    secure: "Secure registration connected to subscription billing",
    ownerSection: "Account owner",
    companySection: "Company details",
    subscriptionSection: "Subscription",
    paymentSection: "Payment method",
    reviewSection: "Review",
    ownerName: "Owner name",
    ownerNamePlaceholder: "Example: Mazen Alotaibi",
    phone: "Mobile number",
    phonePlaceholder: "05XXXXXXXX",
    email: "Email",
    emailPlaceholder: "name@example.com",
    password: "Password",
    passwordPlaceholder: "At least 8 characters",
    showPassword: "Show password",
    hidePassword: "Hide password",
    companyName: "Company name",
    companyNamePlaceholder: "Registered business name",
    commercialRegistration: "Commercial registration",
    commercialRegistrationPlaceholder: "10 digits",
    taxNumber: "Tax number",
    taxNumberPlaceholder: "Optional",
    city: "City",
    cityPlaceholder: "Example: Riyadh",
    plan: "Plan",
    loadingPlans: "Loading plans...",
    reloadPlans: "Reload plans",
    noPlans: "No public plans are currently available.",
    monthly: "Monthly",
    yearly: "Yearly",
    users: "users",
    branches: "branches",
    warehouses: "warehouses",
    pos: "POS",
    month: "month",
    year: "year",
    gateway: "Payment gateway",
    autoRenew: "Auto renew",
    autoRenewHint:
      "You can change auto-renew later from subscription management.",
    paymentNotice:
      "Creating the registration is not proof of payment. Final payment status comes only from backend/provider verification.",
    create: "Create company & subscription",
    creating: "Creating account...",
    login: "I already have an account",
    backHome: "Home",
    pricing: "Pricing",
    selectedPlan: "Selected plan",
    selectedCycle: "Billing cycle",
    selectedGateway: "Payment gateway",
    amount: "Amount",
    vatNote: "The final total is calculated by the subscription backend.",
    accountReady: "Company account created",
    accountReadyDesc:
      "The owner, company, pending subscription, and payment attempt were created successfully. Payment is still awaiting confirmation.",
    companyCode: "Company code",
    username: "Username",
    paymentReference: "Payment reference",
    subscriptionStatus: "Subscription status",
    paymentStatus: "Payment status",
    nextLogin: "Sign in & continue subscription",
    createAnother: "Create another registration",
    pendingPayment:
      "Browser return is never treated as payment success. After sign-in, subscription management shows backend-confirmed status.",
    validationOwner: "Enter a valid owner name.",
    validationPhone: "Enter a valid Saudi mobile number.",
    validationEmail: "Enter a valid email address.",
    validationPassword: "Password must contain at least 8 characters.",
    validationCompany: "Enter the company name.",
    validationCr: "Commercial registration must contain exactly 10 digits.",
    validationCity: "Enter the city.",
    validationPlan: "Choose a subscription plan.",
    validationGateway: "Choose a payment gateway.",
    loadError: "Could not load registration options.",
    registrationError: "Could not create company registration.",
    registrationSuccess: "Company account and subscription created.",
    sarAlt: "Saudi Riyal",
    moya: "Moyasar",
    tamara: "Tamara",
    tabby: "Tabby",
  },
} as const;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const row = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  return row
    ? decodeURIComponent(row.slice(name.length + 1))
    : null;
}

function getLocale(): AppLocale {
  if (typeof window === "undefined") return "ar";

  const local =
    window.localStorage.getItem("primey-locale") ||
    window.localStorage.getItem("Mhamcloud-locale");

  const cookie =
    getCookie("lang") ||
    getCookie("locale") ||
    getCookie("NEXT_LOCALE");

  const value = String(local || cookie || "ar")
    .trim()
    .toLowerCase();

  return value.startsWith("en") ? "en" : "ar";
}

function gatewayLabel(
  gateway: RegistrationGateway,
  locale: AppLocale,
): string {
  const t = localeCopy[locale];

  if (gateway === "TAMARA") return t.tamara;
  if (gateway === "TABBY") return t.tabby;
  return t.moya;
}

function Money({
  value,
  label,
}: {
  value: unknown;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        dir="ltr"
        lang="en"
        className="font-semibold tabular-nums"
      >
        {formatMoney(value)}
      </span>

      <Image
        src="/currency/sar.svg"
        alt={label}
        width={16}
        height={16}
        className="h-4 w-4 shrink-0"
      />
    </span>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1 text-sm font-semibold">
        {label}
        {required ? (
          <span className="text-destructive">*</span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-primary/5 text-primary">
        <Icon className="size-4" />
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

export default function RegisterPage() {
  const [locale, setLocale] = React.useState<AppLocale>("ar");
  const [options, setOptions] =
    React.useState<RegistrationOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = React.useState(true);
  const [optionsError, setOptionsError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [result, setResult] =
    React.useState<RegistrationResult | null>(null);
  const [checkoutStarting, setCheckoutStarting] =
    React.useState(false);
  const [checkoutMode, setCheckoutMode] =
    React.useState<"client" | "redirect" | "">("");

  const [checkoutPayment, setCheckoutPayment] =
    React.useState<{
      amount: string;
      currencyCode: string;
    } | null>(null);

  const [form, setForm] = React.useState<RegistrationForm>({
    owner_name: "",
    phone: "",
    email: "",
    password: "",
    company_name: "",
    commercial_registration: "",
    tax_number: "",
    city: "",
    plan_id: 0,
    billing_cycle: "MONTHLY",
    gateway: "MOYASAR",
    auto_renew: false,
  });

  const isArabic = locale === "ar";
  const dir = isArabic ? "rtl" : "ltr";
  const t = localeCopy[locale];
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  const selectedPlan = React.useMemo(
    () =>
      options?.plans.find(
        (plan) => plan.id === form.plan_id,
      ) || null,
    [form.plan_id, options?.plans],
  );

  const selectedPrice = selectedPlan
    ? form.billing_cycle === "YEARLY"
      ? selectedPlan.yearly_price
      : selectedPlan.monthly_price
    : "0.00";

  React.useEffect(() => {
    const sync = () => {
      const next = getLocale();
      setLocale(next);

      document.documentElement.lang = next;
      document.documentElement.dir =
        next === "ar" ? "rtl" : "ltr";
      document.body.dir =
        next === "ar" ? "rtl" : "ltr";
    };

    sync();

    window.addEventListener(
      "primey-locale-changed",
      sync,
    );
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(
        "primey-locale-changed",
        sync,
      );
      window.removeEventListener("storage", sync);
    };
  }, []);

  const loadOptions = React.useCallback(async () => {
    try {
      setLoadingOptions(true);
      setOptionsError("");

      const next = await loadRegistrationOptions();
      setOptions(next);

      setForm((current) => ({
        ...current,
        plan_id:
          current.plan_id ||
          next.plans[0]?.id ||
          0,
        billing_cycle:
          next.billing_cycles.some(
            (cycle) =>
              cycle.value === current.billing_cycle,
          )
            ? current.billing_cycle
            : "MONTHLY",
        gateway:
          next.gateways.includes(current.gateway)
            ? current.gateway
            : next.gateways[0] || "MOYASAR",
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t.loadError;

      setOptionsError(message);
      toast.error(message);
    } finally {
      setLoadingOptions(false);
    }
  }, [t.loadError]);

  React.useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  function update<K extends keyof RegistrationForm>(
    key: K,
    value: RegistrationForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validate(): boolean {
    if (form.owner_name.trim().length < 3) {
      toast.error(t.validationOwner);
      return false;
    }

    if (!isValidSaudiPhone(form.phone)) {
      toast.error(t.validationPhone);
      return false;
    }

    if (!isValidEmail(form.email)) {
      toast.error(t.validationEmail);
      return false;
    }

    if (form.password.length < 8) {
      toast.error(t.validationPassword);
      return false;
    }

    if (form.company_name.trim().length < 2) {
      toast.error(t.validationCompany);
      return false;
    }

    if (
      !/^\d{10}$/.test(
        form.commercial_registration.trim(),
      )
    ) {
      toast.error(t.validationCr);
      return false;
    }

    if (!form.city.trim()) {
      toast.error(t.validationCity);
      return false;
    }

    if (!form.plan_id) {
      toast.error(t.validationPlan);
      return false;
    }

    if (!form.gateway) {
      toast.error(t.validationGateway);
      return false;
    }

    return true;
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting || !validate()) return;

    try {
      setSubmitting(true);

      const created = await createPublicRegistration({
        ...form,
        owner_name: form.owner_name.trim(),
        phone: normalizeSaudiPhone(form.phone),
        email: form.email.trim().toLowerCase(),
        company_name: form.company_name.trim(),
        commercial_registration:
          form.commercial_registration.trim(),
        tax_number: form.tax_number.trim(),
        city: form.city.trim(),
      });

      setResult(created);
      toast.success(t.registrationSuccess);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t.registrationError;

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function startCheckout(
    registration: RegistrationResult,
  ) {
    if (checkoutStarting) return;

    try {
      setCheckoutStarting(true);

      const checkoutResult =
        await startPublicRegistrationCheckout(
          registration.payment.payment_reference,
        );

      const checkout = checkoutResult.checkout;
      const mode = String(
        checkout?.mode || "",
      ).toLowerCase();

      if (
        mode === "redirect" &&
        checkout?.checkout_url
      ) {
        setCheckoutMode("redirect");

        window.location.assign(
          checkout.checkout_url,
        );
        return;
      }

      if (mode === "client") {
        setCheckoutMode("client");

        setCheckoutPayment({
          amount:
            checkoutResult.payment.amount,

          currencyCode:
            checkoutResult.payment.currency_code,
        });

        toast.info(
          locale === "ar"
            ? "تم تجهيز محاولة الدفع عبر Moyasar. سيتم إكمال نموذج الدفع الآمن في خطوة Moyasar التالية."
            : "Moyasar payment is ready. Secure client payment will be completed in the next Moyasar step.",
        );

        return;
      }

      throw new Error(
        locale === "ar"
          ? "لم تُرجع بوابة الدفع طريقة Checkout صالحة."
          : "Payment gateway did not return a valid checkout mode.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : locale === "ar"
            ? "تعذر بدء عملية الدفع."
            : "Unable to start payment checkout.";

      toast.error(message);
    } finally {
      setCheckoutStarting(false);
    }
  }

  function resetRegistration() {
    setResult(null);
    setCheckoutMode("");
    setCheckoutPayment(null);

    setForm((current) => ({
      owner_name: "",
      phone: "",
      email: "",
      password: "",
      company_name: "",
      commercial_registration: "",
      tax_number: "",
      city: "",
      plan_id:
        options?.plans[0]?.id ||
        current.plan_id ||
        0,
      billing_cycle: "MONTHLY",
      gateway:
        options?.gateways[0] ||
        "MOYASAR",
      auto_renew: false,
    }));
  }

  if (result) {
    return (
      <main
        lang={locale}
        dir={dir}
        className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-[82vh] max-w-3xl items-center justify-center">
          <Card className="w-full border-primary/15 bg-background/90 shadow-xl">
            <CardHeader className="items-center text-center">
              <span className="mb-3 flex size-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="size-8" />
              </span>

              <Badge
                variant="outline"
                className="rounded-full border-amber-200 bg-amber-50 text-amber-700"
              >
                {t.paymentStatus}:{" "}
                {result.payment.status}
              </Badge>

              <CardTitle className="mt-3 text-3xl">
                {t.accountReady}
              </CardTitle>

              <CardDescription className="max-w-xl text-sm leading-7">
                {t.accountReadyDesc}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [t.companyCode, result.company.company_code],
                  [t.username, result.owner.username],
                  [t.paymentReference, result.payment.payment_reference],
                  [t.subscriptionStatus, result.subscription.status],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border bg-muted/20 p-4"
                  >
                    <p className="text-xs text-muted-foreground">
                      {label}
                    </p>
                    <p
                      dir="ltr"
                      lang="en"
                      className="mt-2 break-all font-semibold tabular-nums"
                    >
                      {value || "—"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    {t.selectedPlan}
                  </span>
                  <span className="font-semibold">
                    {result.subscription.plan?.name}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    {t.amount}
                  </span>
                  <Money
                    value={result.payment.amount}
                    label={t.sarAlt}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    {t.selectedGateway}
                  </span>
                  <span className="font-semibold">
                    {result.payment.gateway}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                  <p className="text-sm leading-7">
                    {t.pendingPayment}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  size="lg"
                  variant="brand"
                  disabled={checkoutStarting}
                  className="w-full rounded-2xl"
                  onClick={() => {
                    void startCheckout(result);
                  }}
                >
                  {checkoutStarting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {locale === "ar"
                        ? "جاري تجهيز الدفع..."
                        : "Preparing payment..."}
                    </>
                  ) : (
                    <>
                      <CreditCard className="size-4" />
                      {locale === "ar"
                        ? "المتابعة إلى الدفع"
                        : "Continue to payment"}
                    </>
                  )}
                </Button>

                {checkoutMode === "client" &&
                checkoutPayment ? (
                  <MoyasarPublicCheckout
                    paymentReference={
                      result.payment.payment_reference
                    }
                    amount={
                      checkoutPayment.amount
                    }
                    currencyCode={
                      checkoutPayment.currencyCode
                    }
                    locale={locale}
                  />
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => {
                      window.location.assign(
                        result.next?.login_path || "/login",
                      );
                    }}
                  >
                    {t.nextLogin}
                    <BackIcon className="size-4" />
                  </Button>

                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={resetRegistration}
                  >
                    <RefreshCw className="size-4" />
                    {t.createAnother}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <ChatWidget />
      </main>
    );
  }

  return (
    <main
      lang={locale}
      dir={dir}
      className="relative min-h-screen overflow-hidden bg-background"
      suppressHydrationWarning
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-20 left-0 h-[340px] w-[340px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[300px] w-[300px] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <section className="container relative mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="mx-auto max-w-4xl text-center">
          <Badge
            variant="outline"
            className="mb-4 rounded-full bg-background/75 px-4 py-2 backdrop-blur"
          >
            <Sparkles className="size-4 text-primary" />
            {t.badge}
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            {t.title}
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
            {t.subtitle}
          </p>

          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border bg-background/70 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
            <ShieldCheck className="size-4 text-primary" />
            {t.secure}
          </div>
        </div>

        <form
          onSubmit={submit}
          className="mx-auto mt-10 grid max-w-[1380px] gap-6 xl:grid-cols-[1fr_390px]"
        >
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <SectionTitle
                  icon={UserRound}
                  title={t.ownerSection}
                />
              </CardHeader>

              <CardContent className="grid gap-5 md:grid-cols-2">
                <Field
                  label={t.ownerName}
                  required
                >
                  <div className="relative">
                    <UserRound
                      className={cn(
                        "absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                        isArabic ? "right-3" : "left-3",
                      )}
                    />
                    <Input
                      value={form.owner_name}
                      onChange={(event) =>
                        update(
                          "owner_name",
                          event.target.value,
                        )
                      }
                      placeholder={t.ownerNamePlaceholder}
                      autoComplete="name"
                      className={cn(
                        "h-11 rounded-xl",
                        isArabic ? "pr-10" : "pl-10",
                      )}
                    />
                  </div>
                </Field>

                <Field
                  label={t.phone}
                  required
                >
                  <div className="relative">
                    <Phone
                      className={cn(
                        "absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                        isArabic ? "right-3" : "left-3",
                      )}
                    />
                    <Input
                      value={form.phone}
                      onChange={(event) =>
                        update(
                          "phone",
                          event.target.value,
                        )
                      }
                      placeholder={t.phonePlaceholder}
                      autoComplete="tel"
                      inputMode="tel"
                      dir="ltr"
                      className={cn(
                        "h-11 rounded-xl",
                        isArabic
                          ? "pr-10 text-right"
                          : "pl-10 text-left",
                      )}
                    />
                  </div>
                </Field>

                <Field
                  label={t.email}
                  required
                >
                  <div className="relative">
                    <Mail
                      className={cn(
                        "absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                        isArabic ? "right-3" : "left-3",
                      )}
                    />
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        update(
                          "email",
                          event.target.value,
                        )
                      }
                      placeholder={t.emailPlaceholder}
                      autoComplete="email"
                      dir="ltr"
                      className={cn(
                        "h-11 rounded-xl",
                        isArabic
                          ? "pr-10 text-left"
                          : "pl-10 text-left",
                      )}
                    />
                  </div>
                </Field>

                <Field
                  label={t.password}
                  required
                >
                  <div className="relative">
                    <LockKeyhole
                      className={cn(
                        "absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                        isArabic ? "right-3" : "left-3",
                      )}
                    />

                    <Input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={form.password}
                      onChange={(event) =>
                        update(
                          "password",
                          event.target.value,
                        )
                      }
                      placeholder={t.passwordPlaceholder}
                      autoComplete="new-password"
                      className={cn(
                        "h-11 rounded-xl",
                        isArabic
                          ? "pr-10 pl-11"
                          : "pl-10 pr-11",
                      )}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) => !current,
                        )
                      }
                      aria-label={
                        showPassword
                          ? t.hidePassword
                          : t.showPassword
                      }
                      className={cn(
                        "absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted",
                        isArabic ? "left-2" : "right-2",
                      )}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionTitle
                  icon={Building2}
                  title={t.companySection}
                />
              </CardHeader>

              <CardContent className="grid gap-5 md:grid-cols-2">
                <Field
                  label={t.companyName}
                  required
                >
                  <div className="relative">
                    <Building2
                      className={cn(
                        "absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                        isArabic ? "right-3" : "left-3",
                      )}
                    />
                    <Input
                      value={form.company_name}
                      onChange={(event) =>
                        update(
                          "company_name",
                          event.target.value,
                        )
                      }
                      placeholder={t.companyNamePlaceholder}
                      className={cn(
                        "h-11 rounded-xl",
                        isArabic ? "pr-10" : "pl-10",
                      )}
                    />
                  </div>
                </Field>

                <Field
                  label={t.commercialRegistration}
                  required
                >
                  <div className="relative">
                    <ReceiptText
                      className={cn(
                        "absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                        isArabic ? "right-3" : "left-3",
                      )}
                    />
                    <Input
                      value={
                        form.commercial_registration
                      }
                      onChange={(event) =>
                        update(
                          "commercial_registration",
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10),
                        )
                      }
                      placeholder={
                        t.commercialRegistrationPlaceholder
                      }
                      inputMode="numeric"
                      dir="ltr"
                      maxLength={10}
                      className={cn(
                        "h-11 rounded-xl tabular-nums",
                        isArabic
                          ? "pr-10 text-right"
                          : "pl-10 text-left",
                      )}
                    />
                  </div>
                </Field>

                <Field label={t.taxNumber}>
                  <div className="relative">
                    <Landmark
                      className={cn(
                        "absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                        isArabic ? "right-3" : "left-3",
                      )}
                    />
                    <Input
                      value={form.tax_number}
                      onChange={(event) =>
                        update(
                          "tax_number",
                          event.target.value.replace(
                            /\D/g,
                            "",
                          ),
                        )
                      }
                      placeholder={t.taxNumberPlaceholder}
                      inputMode="numeric"
                      dir="ltr"
                      className={cn(
                        "h-11 rounded-xl tabular-nums",
                        isArabic
                          ? "pr-10 text-right"
                          : "pl-10 text-left",
                      )}
                    />
                  </div>
                </Field>

                <Field
                  label={t.city}
                  required
                >
                  <div className="relative">
                    <MapPin
                      className={cn(
                        "absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                        isArabic ? "right-3" : "left-3",
                      )}
                    />
                    <Input
                      value={form.city}
                      onChange={(event) =>
                        update(
                          "city",
                          event.target.value,
                        )
                      }
                      placeholder={t.cityPlaceholder}
                      className={cn(
                        "h-11 rounded-xl",
                        isArabic ? "pr-10" : "pl-10",
                      )}
                    />
                  </div>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionTitle
                  icon={Sparkles}
                  title={t.subscriptionSection}
                />
              </CardHeader>

              <CardContent>
                {loadingOptions ? (
                  <div className="flex min-h-44 items-center justify-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="size-5 animate-spin text-primary" />
                    {t.loadingPlans}
                  </div>
                ) : optionsError ? (
                  <div className="flex min-h-44 flex-col items-center justify-center gap-4 text-center">
                    <CircleAlert className="size-8 text-destructive" />
                    <p className="text-sm text-muted-foreground">
                      {optionsError}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void loadOptions()
                      }
                    >
                      <RefreshCw className="size-4" />
                      {t.reloadPlans}
                    </Button>
                  </div>
                ) : !options?.plans.length ? (
                  <div className="flex min-h-44 items-center justify-center text-sm text-muted-foreground">
                    {t.noPlans}
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {options.plans.map((plan) => {
                      const selected =
                        plan.id === form.plan_id;

                      const price =
                        form.billing_cycle ===
                        "YEARLY"
                          ? plan.yearly_price
                          : plan.monthly_price;

                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() =>
                            update(
                              "plan_id",
                              plan.id,
                            )
                          }
                          className={cn(
                            "rounded-2xl border bg-background p-5 text-start transition",
                            "hover:border-primary/45 hover:bg-primary/[0.025]",
                            selected &&
                              "border-primary bg-primary/[0.055] ring-2 ring-primary/15",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-lg font-bold">
                                  {plan.name}
                                </p>

                                {selected ? (
                                  <Badge
                                    variant="outline"
                                    className="border-primary/30 bg-primary/5 text-primary"
                                  >
                                    <Check className="size-3" />
                                    {t.selectedPlan}
                                  </Badge>
                                ) : null}
                              </div>

                              {plan.description ? (
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                  {plan.description}
                                </p>
                              ) : null}
                            </div>

                            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-primary/5 text-primary">
                              <Sparkles className="size-4" />
                            </span>
                          </div>

                          <div className="mt-5 flex items-end gap-2">
                            <span className="text-2xl font-bold">
                              <Money
                                value={price}
                                label={t.sarAlt}
                              />
                            </span>

                            <span className="pb-0.5 text-xs text-muted-foreground">
                              /{" "}
                              {form.billing_cycle ===
                              "YEARLY"
                                ? t.year
                                : t.month}
                            </span>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5 rounded-lg border bg-muted/20 px-3 py-2">
                              <Users className="size-3.5 text-primary" />
                              <span
                                dir="ltr"
                                lang="en"
                              >
                                {formatInteger(
                                  plan.max_users,
                                )}
                              </span>
                              {t.users}
                            </span>

                            <span className="flex items-center gap-1.5 rounded-lg border bg-muted/20 px-3 py-2">
                              <Building2 className="size-3.5 text-primary" />
                              <span
                                dir="ltr"
                                lang="en"
                              >
                                {formatInteger(
                                  plan.max_branches,
                                )}
                              </span>
                              {t.branches}
                            </span>

                            <span className="flex items-center gap-1.5 rounded-lg border bg-muted/20 px-3 py-2">
                              <Warehouse className="size-3.5 text-primary" />
                              <span
                                dir="ltr"
                                lang="en"
                              >
                                {formatInteger(
                                  plan.max_warehouses,
                                )}
                              </span>
                              {t.warehouses}
                            </span>

                            <span className="flex items-center gap-1.5 rounded-lg border bg-muted/20 px-3 py-2">
                              <CreditCard className="size-3.5 text-primary" />
                              <span
                                dir="ltr"
                                lang="en"
                              >
                                {formatInteger(
                                  plan.max_pos,
                                )}
                              </span>
                              {t.pos}
                            </span>
                          </div>

                          {plan.features.length ? (
                            <div className="mt-4 space-y-2">
                              {plan.features
                                .slice(0, 5)
                                .map(
                                  (
                                    feature,
                                    index,
                                  ) => (
                                    <p
                                      key={`${plan.id}-${index}`}
                                      className="flex items-center gap-2 text-xs text-muted-foreground"
                                    >
                                      <Check className="size-3.5 shrink-0 text-emerald-600" />
                                      {String(
                                        feature,
                                      )}
                                    </p>
                                  ),
                                )}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label={t.selectedCycle}>
                    <Select
                      value={form.billing_cycle}
                      onValueChange={(value) =>
                        update(
                          "billing_cycle",
                          value as BillingCycle,
                        )
                      }
                    >
                      <SelectTrigger className="h-11 w-full rounded-xl bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">
                          {t.monthly}
                        </SelectItem>
                        <SelectItem value="YEARLY">
                          {t.yearly}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label={t.gateway}>
                    <Select
                      value={form.gateway}
                      onValueChange={(value) =>
                        update(
                          "gateway",
                          value as RegistrationGateway,
                        )
                      }
                    >
                      <SelectTrigger className="h-11 w-full rounded-xl bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(options?.gateways || []).map(
                          (gateway) => (
                            <SelectItem
                              key={gateway}
                              value={gateway}
                            >
                              {gatewayLabel(
                                gateway,
                                locale,
                              )}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <Card className="border-primary/15">
              <CardHeader>
                <SectionTitle
                  icon={CreditCard}
                  title={t.reviewSection}
                />
                <CardDescription>
                  {t.vatNote}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">
                    {t.selectedPlan}
                  </p>
                  <p className="mt-2 font-bold">
                    {selectedPlan?.name || "—"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-xs text-muted-foreground">
                      {t.selectedCycle}
                    </p>
                    <p className="mt-2 font-semibold">
                      {form.billing_cycle ===
                      "YEARLY"
                        ? t.yearly
                        : t.monthly}
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-xs text-muted-foreground">
                      {t.selectedGateway}
                    </p>
                    <p className="mt-2 font-semibold">
                      {gatewayLabel(
                        form.gateway,
                        locale,
                      )}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">
                    {t.amount}
                  </p>
                  <div className="mt-2 text-2xl font-bold">
                    <Money
                      value={selectedPrice}
                      label={t.sarAlt}
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-background p-4">
                  <Checkbox
                    checked={form.auto_renew}
                    onCheckedChange={(value) =>
                      update(
                        "auto_renew",
                        value === true,
                      )
                    }
                    className="mt-0.5"
                  />

                  <span>
                    <span className="block text-sm font-semibold">
                      {t.autoRenew}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {t.autoRenewHint}
                    </span>
                  </span>
                </label>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                    <p className="text-xs leading-6">
                      {t.paymentNotice}
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  variant="brand"
                  disabled={
                    submitting ||
                    loadingOptions ||
                    !selectedPlan
                  }
                  className="h-12 w-full rounded-2xl text-base font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t.creating}
                    </>
                  ) : (
                    <>
                      <Building2 className="size-4" />
                      {t.create}
                    </>
                  )}
                </Button>

              </CardContent>
            </Card>
          </aside>
        </form>
      </section>

      <ChatWidget />
    </main>
  );
}
