"use client";

/* ============================================================
   📂 app/customer/support/page.tsx
   🧭 Primey Care | Customer Support Page
   ------------------------------------------------------------
   ✅ صفحة محتوى فقط داخل الشِل الموحد
   ✅ لا تنشئ سايدر أو هيدر مستقل
   ✅ تعتمد على /api/customers/me/
   ✅ نموذج دعم يجهز رسالة واتساب
   ✅ روابط سريعة لطلبات/فواتير/مدفوعات/بطاقات العميل
   ✅ w-full space-y-4
   ✅ عربي/إنجليزي عبر primey-locale
   ✅ أرقام إنجليزية دائمًا
   ✅ Skeleton Loading
   ✅ Error State مستقل
   ✅ Help State واضح
   ✅ sonner
   ✅ بدون localhost
   ✅ بدون useAuth
============================================================ */

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  FileText,
  Headphones,
  Loader2,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  RefreshCcw,
  Send,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AppLocale = "ar" | "en";
type Dict = Record<string, unknown>;

type CustomerInfo = {
  id: string;
  customerCode: string;
  displayName: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  status: string;
  isPhoneVerified: boolean;
  isWhatsappVerified: boolean;
};

type SupportForm = {
  category: string;
  subject: string;
  message: string;
  relatedReference: string;
};

type ApiEnvelope = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  data?: unknown;
  customer?: unknown;
};

const DEFAULT_CUSTOMER: CustomerInfo = {
  id: "",
  customerCode: "",
  displayName: "",
  email: "",
  phone: "",
  whatsapp: "",
  city: "",
  status: "",
  isPhoneVerified: false,
  isWhatsappVerified: false,
};

const DEFAULT_FORM: SupportForm = {
  category: "general",
  subject: "",
  message: "",
  relatedReference: "",
};

function readLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const savedLocale = window.localStorage.getItem("primey-locale");

    if (savedLocale === "en") return "en";
    if (savedLocale === "ar") return "ar";

    return document.documentElement.lang === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function apiUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  if (!base) return path;

  return `${base.replace(/\/$/, "")}${path}`;
}

async function readJson(response: Response): Promise<ApiEnvelope | null> {
  return (await response.json().catch(() => null)) as ApiEnvelope | null;
}

function asDict(value: unknown): Dict {
  return value && typeof value === "object" ? (value as Dict) : {};
}

function getValue(obj: Dict, key: string): unknown {
  const direct = obj[key];

  if (direct !== undefined && direct !== null && direct !== "") return direct;

  for (const container of ["customer", "profile", "user", "data"]) {
    const nested = obj[container];

    if (nested && typeof nested === "object") {
      const value = (nested as Dict)[key];

      if (value !== undefined && value !== null && value !== "") return value;
    }
  }

  return undefined;
}

function toBool(value: unknown) {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase());
  }

  return Boolean(value);
}

function normalizeText(value: unknown) {
  return String(value || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
}

function normalizeStatus(value: unknown) {
  const cleaned = normalizeText(value);

  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function cleanPhoneForWhatsapp(value: unknown) {
  const digits = String(value || "").replace(/[^\d]/g, "");

  if (!digits) return "";

  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `966${digits.slice(1)}`;
  if (digits.startsWith("966")) return digits;

  return digits;
}

function dictionary(locale: AppLocale) {
  const isArabic = locale === "ar";

  return {
    pageTitle: isArabic ? "الدعم والمساعدة" : "Support & Help",
    pageSubtitle: isArabic
      ? "تواصل مع فريق الدعم بخصوص طلباتك أو فواتيرك أو مدفوعاتك."
      : "Contact support about your orders, invoices, payments, or cards.",
    pageBadge: isArabic ? "مركز دعم العميل" : "Customer Support",

    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    loading: isArabic ? "جاري تحميل بيانات العميل" : "Loading customer data",
    loadError: isArabic
      ? "تعذر تحميل بيانات الدعم."
      : "Unable to load support data.",
    refreshSuccess: isArabic
      ? "تم تحديث بيانات الدعم."
      : "Support data refreshed.",

    customerInfo: isArabic ? "بيانات العميل" : "Customer Information",
    customerCode: isArabic ? "رقم العميل" : "Customer Code",
    customerName: isArabic ? "اسم العميل" : "Customer Name",
    phone: isArabic ? "رقم الجوال" : "Phone",
    whatsapp: isArabic ? "واتساب" : "WhatsApp",
    email: isArabic ? "البريد الإلكتروني" : "Email",
    city: isArabic ? "المدينة" : "City",
    accountStatus: isArabic ? "حالة الحساب" : "Account Status",
    verified: isArabic ? "موثق" : "Verified",
    notVerified: isArabic ? "غير موثق" : "Not Verified",

    supportForm: isArabic ? "إنشاء طلب دعم" : "Create Support Request",
    supportFormDesc: isArabic
      ? "اكتب تفاصيل المشكلة وسيتم تجهيز رسالة واتساب للدعم."
      : "Write your issue details and a WhatsApp message will be prepared.",
    category: isArabic ? "نوع الطلب" : "Request Type",
    subject: isArabic ? "عنوان الطلب" : "Subject",
    message: isArabic ? "تفاصيل الطلب" : "Message",
    relatedReference: isArabic ? "رقم مرجعي اختياري" : "Optional Reference",
    relatedReferenceHint: isArabic
      ? "رقم طلب، فاتورة، دفعة، أو بطاقة"
      : "Order, invoice, payment, or card number",
    sendWhatsapp: isArabic ? "إرسال عبر واتساب" : "Send via WhatsApp",
    reset: isArabic ? "تفريغ النموذج" : "Clear Form",

    subjectPlaceholder: isArabic
      ? "مثال: مشكلة في فاتورة أو طلب"
      : "Example: issue with an invoice or order",
    messagePlaceholder: isArabic
      ? "اكتب تفاصيل المشكلة أو الطلب هنا..."
      : "Write the issue or request details here...",

    categoryGeneral: isArabic ? "استفسار عام" : "General Inquiry",
    categoryOrder: isArabic ? "طلب" : "Order",
    categoryInvoice: isArabic ? "فاتورة" : "Invoice",
    categoryPayment: isArabic ? "دفعة" : "Payment",
    categoryCard: isArabic ? "بطاقة أو اشتراك" : "Card or Membership",
    categoryProfile: isArabic ? "بيانات الحساب" : "Account Profile",

    quickLinks: isArabic ? "روابط سريعة" : "Quick Links",
    quickLinksDesc: isArabic
      ? "انتقل مباشرة للأقسام المرتبطة بطلب الدعم."
      : "Open sections related to your support request.",
    orders: isArabic ? "طلباتي" : "My Orders",
    invoices: isArabic ? "فواتيري" : "My Invoices",
    payments: isArabic ? "مدفوعاتي" : "My Payments",
    cards: isArabic ? "بطاقاتي" : "My Cards",
    profile: isArabic ? "حسابي" : "My Account",

    ordersHint: isArabic ? "راجع حالات الطلبات." : "Review order status.",
    invoicesHint: isArabic ? "راجع الفواتير." : "Review invoices.",
    paymentsHint: isArabic ? "راجع المدفوعات." : "Review payments.",
    cardsHint: isArabic ? "راجع البطاقات." : "Review cards.",
    profileHint: isArabic ? "راجع بيانات حسابك." : "Review your account.",

    helpTitle: isArabic ? "كيف نساعدك؟" : "How can we help?",
    help1Title: isArabic ? "الدعم عبر واتساب" : "WhatsApp Support",
    help1Text: isArabic
      ? "أرسل تفاصيل المشكلة مع بيانات حسابك لتسريع المعالجة."
      : "Send issue details with your account info to speed up support.",
    help2Title: isArabic ? "اذكر رقم المرجع" : "Include a Reference",
    help2Text: isArabic
      ? "أضف رقم الطلب أو الفاتورة أو الدفعة عند وجودها."
      : "Add an order, invoice, or payment number when available.",
    help3Title: isArabic ? "راجع الأقسام أولًا" : "Check Sections First",
    help3Text: isArabic
      ? "قد تجد حالة الطلب أو الفاتورة مباشرة في حسابك."
      : "You may find order or invoice status directly in your account.",

    validationSubject: isArabic
      ? "اكتب عنوان طلب الدعم."
      : "Please enter a support subject.",
    validationMessage: isArabic
      ? "اكتب تفاصيل طلب الدعم."
      : "Please enter support request details.",
    whatsappError: isArabic
      ? "لم يتم ضبط رقم واتساب الدعم."
      : "Support WhatsApp number is not configured.",
    whatsappPrepared: isArabic
      ? "تم تجهيز رسالة واتساب."
      : "WhatsApp message prepared.",
    formCleared: isArabic ? "تم تفريغ النموذج." : "Form cleared.",

    noData: isArabic ? "غير متوفر" : "Not available",
  };
}

function getCategoryLabel(category: string, locale: AppLocale) {
  const t = dictionary(locale);

  const map: Record<string, string> = {
    general: t.categoryGeneral,
    order: t.categoryOrder,
    invoice: t.categoryInvoice,
    payment: t.categoryPayment,
    card: t.categoryCard,
    profile: t.categoryProfile,
  };

  return map[category] || t.categoryGeneral;
}

function unwrapCustomer(payload: ApiEnvelope | null): CustomerInfo {
  const data = asDict(payload?.data);
  const customer = asDict(data.customer || payload?.customer || payload?.data || {});

  const firstName = String(getValue(customer, "first_name") || "");
  const lastName = String(getValue(customer, "last_name") || "");
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    id: String(getValue(customer, "id") || ""),
    customerCode: String(getValue(customer, "customer_code") || ""),
    displayName: String(
      getValue(customer, "display_name") ||
        getValue(customer, "full_name") ||
        fullName ||
        getValue(customer, "name") ||
        "",
    ),
    email: String(getValue(customer, "email") || ""),
    phone: String(
      getValue(customer, "phone_number") ||
        getValue(customer, "normalized_phone") ||
        getValue(customer, "primary_contact_number") ||
        "",
    ),
    whatsapp: String(
      getValue(customer, "whatsapp_number") ||
        getValue(customer, "phone_number") ||
        getValue(customer, "normalized_phone") ||
        "",
    ),
    city: String(getValue(customer, "city") || ""),
    status: String(getValue(customer, "status") || ""),
    isPhoneVerified: toBool(getValue(customer, "is_phone_verified")),
    isWhatsappVerified: toBool(getValue(customer, "is_whatsapp_verified")),
  };
}

function getSupportWhatsappNumber() {
  const configured =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ||
    process.env.NEXT_PUBLIC_PRIMEY_SUPPORT_WHATSAPP ||
    "";

  return cleanPhoneForWhatsapp(configured);
}

function buildWhatsappMessage({
  locale,
  customer,
  form,
}: {
  locale: AppLocale;
  customer: CustomerInfo;
  form: SupportForm;
}) {
  const isArabic = locale === "ar";
  const categoryLabel = getCategoryLabel(form.category, locale);

  if (isArabic) {
    return [
      "مرحبًا فريق Primey Care،",
      "",
      "أحتاج دعم بخصوص:",
      `نوع الطلب: ${categoryLabel}`,
      `العنوان: ${form.subject.trim()}`,
      form.relatedReference.trim()
        ? `الرقم المرجعي: ${form.relatedReference.trim()}`
        : "",
      "",
      "تفاصيل الطلب:",
      form.message.trim(),
      "",
      "بيانات العميل:",
      `الاسم: ${customer.displayName || "-"}`,
      `رقم العميل: ${customer.customerCode || customer.id || "-"}`,
      `الجوال: ${customer.phone || customer.whatsapp || "-"}`,
      `البريد: ${customer.email || "-"}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Hello Primey Care Support,",
    "",
    "I need support regarding:",
    `Request type: ${categoryLabel}`,
    `Subject: ${form.subject.trim()}`,
    form.relatedReference.trim()
      ? `Reference: ${form.relatedReference.trim()}`
      : "",
    "",
    "Message:",
    form.message.trim(),
    "",
    "Customer information:",
    `Name: ${customer.displayName || "-"}`,
    `Customer code: ${customer.customerCode || customer.id || "-"}`,
    `Phone: ${customer.phone || customer.whatsapp || "-"}`,
    `Email: ${customer.email || "-"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function StatusBadge({
  value,
  fallback,
}: {
  value: string;
  fallback: string;
}) {
  const normalized = value.toLowerCase();

  if (["active", "verified", "approved"].includes(normalized)) {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
        {normalizeStatus(value) || fallback}
      </Badge>
    );
  }

  if (["blocked", "inactive", "rejected"].includes(normalized)) {
    return (
      <Badge variant="destructive" className="rounded-full px-3 py-1">
        {normalizeStatus(value) || fallback}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-full px-3 py-1">
      {normalizeStatus(value) || fallback}
    </Badge>
  );
}

function InfoBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border bg-background p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 break-words text-sm font-semibold">
          {value || "-"}
        </div>
      </div>
    </div>
  );
}

function QuickLinkCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="h-full rounded-2xl border bg-background/70 shadow-sm transition hover:bg-muted/40">
        <CardContent className="flex h-full items-start gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{title}</p>
              <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function HelpCard({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-muted ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardContent className="space-y-4 p-5">
          <SkeletonLine className="h-14 w-14 rounded-2xl" />
          <SkeletonLine className="h-7 w-48" />
          <SkeletonLine className="h-4 w-36" />
          <SkeletonLine className="h-12 w-full rounded-xl" />
          <SkeletonLine className="h-12 w-full rounded-xl" />
          <SkeletonLine className="h-12 w-full rounded-xl" />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardContent className="space-y-4 p-5">
          <SkeletonLine className="h-7 w-40" />
          <SkeletonLine className="h-11 w-full rounded-2xl" />
          <SkeletonLine className="h-11 w-full rounded-2xl" />
          <SkeletonLine className="h-32 w-full rounded-2xl" />
          <SkeletonLine className="h-11 w-36 rounded-2xl" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerSupportPage() {
  const [locale, setLocale] = useState<AppLocale>("ar");
  const [customer, setCustomer] = useState<CustomerInfo>(DEFAULT_CUSTOMER);
  const [form, setForm] = useState<SupportForm>(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";

  const setField = useCallback(
    (key: keyof SupportForm, value: string) => {
      setForm((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const loadCustomer = useCallback(
    async (showToast = false) => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(apiUrl("/api/customers/me/"), {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        const payload = await readJson(response);

        if (!response.ok || payload?.ok === false || payload?.success === false) {
          throw new Error(
            payload?.message ||
              payload?.detail ||
              payload?.error ||
              t.loadError,
          );
        }

        setCustomer(unwrapCustomer(payload));

        if (showToast) {
          toast.success(t.refreshSuccess);
        }
      } catch (error) {
        console.error("Customer support load error:", error);
        setCustomer(DEFAULT_CUSTOMER);
        setErrorMessage(error instanceof Error ? error.message : t.loadError);
        toast.error(t.loadError);
      } finally {
        setIsLoading(false);
      }
    },
    [t.loadError, t.refreshSuccess],
  );

  function handleReset() {
    setForm(DEFAULT_FORM);
    toast.message(t.formCleared);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.subject.trim()) {
      toast.error(t.validationSubject);
      return;
    }

    if (!form.message.trim()) {
      toast.error(t.validationMessage);
      return;
    }

    const supportNumber = getSupportWhatsappNumber();

    if (!supportNumber) {
      toast.error(t.whatsappError);
      return;
    }

    const message = buildWhatsappMessage({
      locale,
      customer,
      form,
    });

    const whatsappUrl = `https://wa.me/${supportNumber}?text=${encodeURIComponent(
      message,
    )}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    toast.success(t.whatsappPrepared);
  }

  useEffect(() => {
    const syncLocale = () => setLocale(readLocale());

    syncLocale();

    window.addEventListener("primey-locale-changed", syncLocale);
    window.addEventListener("storage", syncLocale);

    return () => {
      window.removeEventListener("primey-locale-changed", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  useEffect(() => {
    void loadCustomer(false);
  }, [loadCustomer]);

  return (
    <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Badge variant="outline" className="mb-2 rounded-full px-3 py-1">
            <Headphones className="h-3.5 w-3.5" />
            {t.pageBadge}
          </Badge>

          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {t.pageTitle}
          </h1>

          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            {t.pageSubtitle}
          </p>
        </div>

        <Button
          variant="outline"
          className="h-10 rounded-xl"
          onClick={() => void loadCustomer(true)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          {t.refresh}
        </Button>
      </div>

      {errorMessage ? (
        <Card className="rounded-2xl border border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-destructive">
                  {errorMessage || t.loadError}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.loadError}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void loadCustomer(true)}
            >
              <RefreshCcw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserRound className="h-4 w-4" />
                  {t.customerInfo}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <InfoBox
                  label={t.customerName}
                  value={customer.displayName || t.noData}
                  icon={<UserRound className="h-4 w-4" />}
                />

                <InfoBox
                  label={t.customerCode}
                  value={customer.customerCode || customer.id || "-"}
                  icon={<BadgeCheck className="h-4 w-4" />}
                />

                <InfoBox
                  label={t.phone}
                  value={<span dir="ltr">{customer.phone || "-"}</span>}
                  icon={<Phone className="h-4 w-4" />}
                />

                <InfoBox
                  label={t.whatsapp}
                  value={<span dir="ltr">{customer.whatsapp || "-"}</span>}
                  icon={<MessageCircle className="h-4 w-4" />}
                />

                <InfoBox
                  label={t.email}
                  value={customer.email || "-"}
                  icon={<Mail className="h-4 w-4" />}
                />

                <InfoBox
                  label={t.accountStatus}
                  value={
                    customer.status ? (
                      <StatusBadge
                        value={customer.status}
                        fallback={t.noData}
                      />
                    ) : (
                      "-"
                    )
                  }
                  icon={<ShieldCheck className="h-4 w-4" />}
                />

                <div className="flex flex-wrap gap-2 rounded-2xl border bg-background p-4">
                  <Badge
                    className={
                      customer.isPhoneVerified
                        ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                        : "rounded-full"
                    }
                    variant={customer.isPhoneVerified ? undefined : "outline"}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {customer.isPhoneVerified ? t.verified : t.notVerified}
                  </Badge>

                  <Badge
                    className={
                      customer.isWhatsappVerified
                        ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                        : "rounded-full"
                    }
                    variant={customer.isWhatsappVerified ? undefined : "outline"}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {customer.isWhatsappVerified ? t.verified : t.notVerified}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{t.quickLinks}</CardTitle>
                <CardDescription>{t.quickLinksDesc}</CardDescription>
              </CardHeader>

              <CardContent className="grid gap-3">
                <QuickLinkCard
                  href="/customer/orders"
                  title={t.orders}
                  description={t.ordersHint}
                  icon={<ShoppingBag className="h-5 w-5" />}
                />
                <QuickLinkCard
                  href="/customer/invoices"
                  title={t.invoices}
                  description={t.invoicesHint}
                  icon={<FileText className="h-5 w-5" />}
                />
                <QuickLinkCard
                  href="/customer/payments"
                  title={t.payments}
                  description={t.paymentsHint}
                  icon={<CreditCard className="h-5 w-5" />}
                />
                <QuickLinkCard
                  href="/customer/cards"
                  title={t.cards}
                  description={t.cardsHint}
                  icon={<WalletCards className="h-5 w-5" />}
                />
                <QuickLinkCard
                  href="/customer/profile"
                  title={t.profile}
                  description={t.profileHint}
                  icon={<UserRound className="h-5 w-5" />}
                />
              </CardContent>
            </Card>
          </aside>

          <div className="space-y-4">
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Headphones className="h-4 w-4" />
                  {t.supportForm}
                </CardTitle>
                <CardDescription>{t.supportFormDesc}</CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium">{t.category}</span>
                      <select
                        value={form.category}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          setField("category", event.target.value)
                        }
                        className="h-11 rounded-2xl border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      >
                        <option value="general">{t.categoryGeneral}</option>
                        <option value="order">{t.categoryOrder}</option>
                        <option value="invoice">{t.categoryInvoice}</option>
                        <option value="payment">{t.categoryPayment}</option>
                        <option value="card">{t.categoryCard}</option>
                        <option value="profile">{t.categoryProfile}</option>
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium">
                        {t.relatedReference}
                      </span>
                      <Input
                        value={form.relatedReference}
                        onChange={(event) =>
                          setField("relatedReference", event.target.value)
                        }
                        placeholder={t.relatedReferenceHint}
                        className="h-11 rounded-2xl bg-background"
                      />
                    </label>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium">{t.subject}</span>
                    <Input
                      value={form.subject}
                      onChange={(event) => setField("subject", event.target.value)}
                      placeholder={t.subjectPlaceholder}
                      className="h-11 rounded-2xl bg-background"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium">{t.message}</span>
                    <textarea
                      value={form.message}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        setField("message", event.target.value)
                      }
                      placeholder={t.messagePlaceholder}
                      rows={7}
                      className="resize-none rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </label>

                  <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-xl"
                      onClick={handleReset}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {t.reset}
                    </Button>

                    <Button type="submit" className="h-11 rounded-xl">
                      <Send className="h-4 w-4" />
                      {t.sendWhatsapp}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{t.helpTitle}</CardTitle>
                <CardDescription>{t.pageSubtitle}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <HelpCard
                    title={t.help1Title}
                    text={t.help1Text}
                    icon={<MessageCircle className="h-5 w-5" />}
                  />
                  <HelpCard
                    title={t.help2Title}
                    text={t.help2Text}
                    icon={<BadgeCheck className="h-5 w-5" />}
                  />
                  <HelpCard
                    title={t.help3Title}
                    text={t.help3Text}
                    icon={<PackageCheck className="h-5 w-5" />}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}