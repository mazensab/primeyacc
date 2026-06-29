"use client";

/* ============================================================
   📂 components/system/companies/SystemCompaniesView.tsx
   🧠 Mhamcloud | Frontend Phase 5.3 — System Companies Management
===============================================================
   ✅ System companies overview/list/create/detail/reports
   ✅ Uses ready backend APIs under /api/system/companies/
   ✅ Uses sonner toast
   ✅ Uses SAR SVG from public/currency/sar.svg when amounts exist
   ✅ Preserves Phase 5.1 Auth + Phase 5.2 System Dashboard pages
============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost, getDataObject, getResults } from "@/lib/api";

type ViewMode = "overview" | "list" | "create" | "detail" | "reports";

type AnyRecord = Record<string, unknown>;

type SystemCompaniesViewProps = {
  mode: ViewMode;
  companyId?: string;
};

type Locale = "ar" | "en";

type CompanyFormState = {
  name: string;
  legal_name: string;
  email: string;
  phone: string;
  city: string;
  commercial_registration: string;
  tax_number: string;
  subscription_plan: string;
  subscription_amount: string;
  status: string;
};

const SAR_ICON = "/currency/sar.svg";

const COMPANY_API = {
  list: "/api/system/companies/",
  create: "/api/system/companies/create/",
  reports: "/api/system/companies/reports/",
  export: "/api/system/companies/export/",
  detail: (id: string | number) => `/api/system/companies/${id}/`,
  contracts: (id: string | number) => `/api/system/companies/${id}/contracts/`,
  services: (id: string | number) => `/api/system/companies/${id}/services/`,
};

const initialForm: CompanyFormState = {
  name: "",
  legal_name: "",
  email: "",
  phone: "",
  city: "",
  commercial_registration: "",
  tax_number: "",
  subscription_plan: "",
  subscription_amount: "",
  status: "active",
};

const dictionary = {
  ar: {
    eyebrow: "إدارة النظام",
    title: "إدارة الشركات",
    subtitle:
      "مركز تشغيل الشركات داخل النظام: عرض، متابعة، إنشاء، وتقارير مرتبطة بواجهات الباكند الجاهزة.",
    overview: "نظرة عامة",
    list: "قائمة الشركات",
    create: "إضافة شركة",
    reports: "تقارير الشركات",
    details: "تفاصيل الشركة",
    refresh: "تحديث",
    searchPlaceholder: "ابحث باسم الشركة، البريد، المدينة، الرقم الضريبي...",
    allCompanies: "كل الشركات",
    activeCompanies: "نشطة",
    inactiveCompanies: "غير نشطة",
    pendingCompanies: "بانتظار التفعيل",
    monthlyValue: "قيمة الاشتراكات",
    latestCompanies: "أحدث الشركات",
    company: "الشركة",
    legalName: "الاسم القانوني",
    email: "البريد الإلكتروني",
    phone: "الجوال",
    city: "المدينة",
    status: "الحالة",
    plan: "الخطة",
    amount: "المبلغ",
    actions: "الإجراءات",
    open: "فتح",
    noData: "لا توجد بيانات شركات حتى الآن.",
    loading: "جاري تحميل بيانات الشركات...",
    createTitle: "إنشاء شركة جديدة",
    createSubtitle:
      "أدخل بيانات الشركة الأساسية. سيتم إرسالها إلى API الشركات في النظام.",
    save: "حفظ الشركة",
    saving: "جاري الحفظ...",
    back: "رجوع",
    nameRequired: "اسم الشركة مطلوب.",
    emailInvalid: "صيغة البريد الإلكتروني غير صحيحة.",
    amountInvalid: "مبلغ الاشتراك يجب أن يكون رقمًا صحيحًا.",
    created: "تم إنشاء الشركة بنجاح.",
    loadFailed: "تعذر تحميل بيانات الشركات.",
    detailFailed: "تعذر تحميل تفاصيل الشركة.",
    reportIntro:
      "ملخص تشغيلي سريع للشركات مع إمكانية فتح التصدير من واجهة الباكند.",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    copied: "تم نسخ الرابط.",
    companyInfo: "معلومات الشركة",
    subscriptionInfo: "بيانات الاشتراك",
    apiCoverage: "تغطية API",
    endpointReady: "جاهز",
    viewList: "عرض القائمة",
    addCompany: "إضافة شركة",
    viewReports: "عرض التقارير",
    unknown: "غير محدد",
  },
  en: {
    eyebrow: "System Management",
    title: "Companies Management",
    subtitle:
      "Operate system companies from one place: overview, list, create, detail, and reports wired to the ready backend APIs.",
    overview: "Overview",
    list: "Companies List",
    create: "Add Company",
    reports: "Companies Reports",
    details: "Company Details",
    refresh: "Refresh",
    searchPlaceholder: "Search company name, email, city, tax number...",
    allCompanies: "All companies",
    activeCompanies: "Active",
    inactiveCompanies: "Inactive",
    pendingCompanies: "Pending",
    monthlyValue: "Subscription value",
    latestCompanies: "Latest companies",
    company: "Company",
    legalName: "Legal name",
    email: "Email",
    phone: "Phone",
    city: "City",
    status: "Status",
    plan: "Plan",
    amount: "Amount",
    actions: "Actions",
    open: "Open",
    noData: "No companies data yet.",
    loading: "Loading companies data...",
    createTitle: "Create a new company",
    createSubtitle:
      "Enter the company base data. The payload will be sent to the system companies API.",
    save: "Save company",
    saving: "Saving...",
    back: "Back",
    nameRequired: "Company name is required.",
    emailInvalid: "Email format is invalid.",
    amountInvalid: "Subscription amount must be a valid number.",
    created: "Company created successfully.",
    loadFailed: "Could not load companies data.",
    detailFailed: "Could not load company details.",
    reportIntro:
      "Operational companies summary with backend export access.",
    exportExcel: "Export Excel",
    print: "Print",
    copied: "Link copied.",
    companyInfo: "Company information",
    subscriptionInfo: "Subscription information",
    apiCoverage: "API coverage",
    endpointReady: "Ready",
    viewList: "View list",
    addCompany: "Add company",
    viewReports: "View reports",
    unknown: "Unknown",
  },
} as const;

function getBrowserLocale(): Locale {
  if (typeof window === "undefined") return "ar";

  const stored = window.localStorage.getItem("primey-locale");
  if (stored === "en" || stored === "ar") return stored;

  const htmlLang = document.documentElement.lang;
  return htmlLang === "en" ? "en" : "ar";
}

function usePrimeyLocale() {
  const [locale, setLocale] = useState<Locale>("ar");

  useEffect(() => {
    const sync = () => setLocale(getBrowserLocale());

    sync();

    window.addEventListener("primey-locale-changed", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("primey-locale-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    locale,
    isArabic: locale === "ar",
    t: dictionary[locale],
  };
}

function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value).replaceAll(",", "").trim());

  return Number.isFinite(parsed) ? parsed : 0;
}

function pickValue(record: AnyRecord | null | undefined, keys: string[]) {
  if (!record) return undefined;

  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function getCompanyId(company: AnyRecord) {
  return normalizeText(
    pickValue(company, ["id", "company_id", "uuid", "reference"]),
    "",
  );
}

function getCompanyName(company: AnyRecord, fallback: string) {
  return normalizeText(
    pickValue(company, ["name", "company_name", "display_name", "legal_name"]),
    fallback,
  );
}

function getLegalName(company: AnyRecord, fallback: string) {
  return normalizeText(
    pickValue(company, ["legal_name", "registered_name", "company_legal_name"]),
    fallback,
  );
}

function getStatus(company: AnyRecord) {
  const explicit = pickValue(company, [
    "status",
    "subscription_status",
    "state",
    "company_status",
  ]);

  if (explicit) return normalizeText(explicit);

  const isActive = pickValue(company, ["is_active", "active"]);
  if (typeof isActive === "boolean") return isActive ? "active" : "inactive";

  return "unknown";
}

function getPlan(company: AnyRecord) {
  return normalizeText(
    pickValue(company, ["plan", "subscription_plan", "package", "tier"]),
    "",
  );
}

function getAmount(company: AnyRecord) {
  return normalizeNumber(
    pickValue(company, [
      "subscription_amount",
      "monthly_fee",
      "monthly_amount",
      "plan_price",
      "amount",
      "total_amount",
    ]),
  );
}

function getContact(company: AnyRecord, key: "email" | "phone" | "city") {
  const keys =
    key === "email"
      ? ["email", "company_email", "contact_email"]
      : key === "phone"
        ? ["phone", "mobile", "company_phone", "contact_phone"]
        : ["city", "company_city", "address_city"];

  return normalizeText(pickValue(company, keys), "");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function statusClass(status: string) {
  const clean = status.toLowerCase();

  if (["active", "enabled", "approved", "نشط"].includes(clean)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["pending", "draft", "review", "بانتظار"].includes(clean)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["inactive", "disabled", "suspended", "cancelled", "غير نشط"].includes(clean)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function SarAmount({ value }: { value: number }) {
  if (!value) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
      <Image src={SAR_ICON} alt="SAR" width={16} height={16} className="h-4 w-4" />
      {formatNumber(value)}
    </span>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/85 shadow-sm backdrop-blur">
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
        <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed bg-white/70 p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-32 animate-pulse rounded-3xl border bg-white/70"
          aria-label={message}
        />
      ))}
    </div>
  );
}

function HeaderActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="secondary">
        <Link href="/system/companies/list">{dictionary.ar.viewList}</Link>
      </Button>
      <Button asChild>
        <Link href="/system/companies/create">{dictionary.ar.addCompany}</Link>
      </Button>
    </div>
  );
}

export function SystemCompaniesView({
  mode,
  companyId,
}: SystemCompaniesViewProps) {
  const router = useRouter();
  const params = useParams();
  const resolvedCompanyId =
    companyId || normalizeText((params as AnyRecord | null)?.id, "");

  const { isArabic, t } = usePrimeyLocale();

  const [companies, setCompanies] = useState<AnyRecord[]>([]);
  const [company, setCompany] = useState<AnyRecord | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(mode !== "create");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CompanyFormState>(initialForm);

  const loadCompanies = useCallback(async () => {
    if (mode === "create" || mode === "detail") return;

    setIsLoading(true);

    const result = await apiGet<unknown>(COMPANY_API.list, {
      search: query || undefined,
    });

    if (result.ok) {
      setCompanies(getResults<AnyRecord>(result.data));
    } else {
      toast.error(result.message || t.loadFailed);
    }

    setIsLoading(false);
  }, [mode, query, t.loadFailed]);

  const loadCompany = useCallback(async () => {
    if (mode !== "detail" || !resolvedCompanyId) return;

    setIsLoading(true);

    const result = await apiGet<unknown>(COMPANY_API.detail(resolvedCompanyId));

    if (result.ok) {
      setCompany(getDataObject<AnyRecord>(result.data));
    } else {
      toast.error(result.message || t.detailFailed);
    }

    setIsLoading(false);
  }, [mode, resolvedCompanyId, t.detailFailed]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    void loadCompany();
  }, [loadCompany]);

  const filteredCompanies = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return companies;

    return companies.filter((item) => {
      const haystack = [
        getCompanyName(item, ""),
        getLegalName(item, ""),
        getContact(item, "email"),
        getContact(item, "phone"),
        getContact(item, "city"),
        normalizeText(pickValue(item, ["tax_number", "vat_number"]), ""),
        normalizeText(pickValue(item, ["commercial_registration", "cr_number"]), ""),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(cleanQuery);
    });
  }, [companies, query]);

  const stats = useMemo(() => {
    const total = filteredCompanies.length;
    const active = filteredCompanies.filter((item) =>
      ["active", "enabled", "approved"].includes(getStatus(item).toLowerCase()),
    ).length;
    const pending = filteredCompanies.filter((item) =>
      ["pending", "draft", "review"].includes(getStatus(item).toLowerCase()),
    ).length;
    const inactive = Math.max(total - active - pending, 0);
    const subscriptionTotal = filteredCompanies.reduce(
      (sum, item) => sum + getAmount(item),
      0,
    );

    return {
      total,
      active,
      pending,
      inactive,
      subscriptionTotal,
    };
  }, [filteredCompanies]);

  function updateForm(key: keyof CompanyFormState, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();
    const amount = form.subscription_amount.trim();

    if (!name) {
      toast.error(t.nameRequired);
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t.emailInvalid);
      return;
    }

    if (amount && !Number.isFinite(Number(amount))) {
      toast.error(t.amountInvalid);
      return;
    }

    setIsSaving(true);

    const payload = {
      name,
      legal_name: form.legal_name.trim() || undefined,
      email: email || undefined,
      phone: form.phone.trim() || undefined,
      city: form.city.trim() || undefined,
      commercial_registration:
        form.commercial_registration.trim() || undefined,
      tax_number: form.tax_number.trim() || undefined,
      subscription_plan: form.subscription_plan.trim() || undefined,
      subscription_amount: amount ? Number(amount) : undefined,
      status: form.status,
    };

    const result = await apiPost<unknown>(COMPANY_API.create, payload);

    setIsSaving(false);

    if (!result.ok) return;

    toast.success(t.created);

    const created = getDataObject<AnyRecord>(result.data);
    const createdId = normalizeText(
      pickValue(created, ["id", "company_id", "uuid"]),
      "",
    );

    router.push(createdId ? `/system/companies/${createdId}` : "/system/companies/list");
  }

  function handleExport() {
    if (typeof window === "undefined") return;
    window.open(COMPANY_API.export, "_blank", "noopener,noreferrer");
  }

  function handlePrint() {
    if (typeof window === "undefined") return;
    window.print();
  }

  const title =
    mode === "create"
      ? t.createTitle
      : mode === "detail"
        ? t.details
        : mode === "reports"
          ? t.reports
          : t.title;

  const subtitle =
    mode === "create"
      ? t.createSubtitle
      : mode === "reports"
        ? t.reportIntro
        : t.subtitle;

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8"
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1">
              {t.eyebrow}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode !== "overview" && (
              <Button variant="outline" onClick={() => router.push("/system/companies")}>
                {t.back}
              </Button>
            )}

            {mode !== "create" && mode !== "detail" && (
              <Button variant="outline" onClick={() => void loadCompanies()}>
                {t.refresh}
              </Button>
            )}

            {mode !== "create" && (
              <Button onClick={() => router.push("/system/companies/create")}>
                {t.addCompany}
              </Button>
            )}
          </div>
        </div>
      </section>

      {mode !== "create" && mode !== "detail" && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={t.allCompanies}
            value={formatNumber(stats.total)}
            hint={t.list}
          />
          <StatCard
            title={t.activeCompanies}
            value={formatNumber(stats.active)}
            hint={t.status}
          />
          <StatCard
            title={t.pendingCompanies}
            value={formatNumber(stats.pending)}
            hint={t.status}
          />
          <StatCard
            title={t.monthlyValue}
            value={formatNumber(stats.subscriptionTotal)}
            hint={t.amount}
          />
        </section>
      )}

      {mode === "create" && (
        <Card className="border-slate-200/80 bg-white/90 shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">{t.company}</span>
                  <Input
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder={t.company}
                    maxLength={180}
                    required
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">{t.legalName}</span>
                  <Input
                    value={form.legal_name}
                    onChange={(event) =>
                      updateForm("legal_name", event.target.value)
                    }
                    placeholder={t.legalName}
                    maxLength={220}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">{t.email}</span>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                    placeholder="company@example.com"
                    maxLength={180}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">{t.phone}</span>
                  <Input
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    placeholder="+966"
                    maxLength={40}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">{t.city}</span>
                  <Input
                    value={form.city}
                    onChange={(event) => updateForm("city", event.target.value)}
                    placeholder={t.city}
                    maxLength={120}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">CR</span>
                  <Input
                    value={form.commercial_registration}
                    onChange={(event) =>
                      updateForm("commercial_registration", event.target.value)
                    }
                    placeholder="Commercial registration"
                    maxLength={80}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">VAT</span>
                  <Input
                    value={form.tax_number}
                    onChange={(event) =>
                      updateForm("tax_number", event.target.value)
                    }
                    placeholder="Tax number"
                    maxLength={80}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">{t.plan}</span>
                  <Input
                    value={form.subscription_plan}
                    onChange={(event) =>
                      updateForm("subscription_plan", event.target.value)
                    }
                    placeholder={t.plan}
                    maxLength={120}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">{t.amount}</span>
                  <div className="relative">
                    <Input
                      inputMode="decimal"
                      value={form.subscription_amount}
                      onChange={(event) =>
                        updateForm("subscription_amount", event.target.value)
                      }
                      placeholder="0.00"
                      className="pe-10"
                    />
                    <Image
                      src={SAR_ICON}
                      alt="SAR"
                      width={16}
                      height={16}
                      className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">{t.status}</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateForm("status", event.target.value)
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="active">active</option>
                    <option value="pending">pending</option>
                    <option value="inactive">inactive</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/system/companies")}
                >
                  {t.back}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? t.saving : t.save}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {mode === "detail" && (
        <>
          {isLoading && <LoadingState message={t.loading} />}

          {!isLoading && !company && <EmptyState message={t.noData} />}

          {!isLoading && company && (
            <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-slate-200/80 bg-white/90 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {getCompanyName(company, t.unknown)}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getLegalName(company, t.unknown)}
                      </p>
                    </div>
                    <Badge className={statusClass(getStatus(company))}>
                      {getStatus(company)}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      [t.email, getContact(company, "email") || t.unknown],
                      [t.phone, getContact(company, "phone") || t.unknown],
                      [t.city, getContact(company, "city") || t.unknown],
                      [
                        "VAT",
                        normalizeText(
                          pickValue(company, ["tax_number", "vat_number"]),
                          t.unknown,
                        ),
                      ],
                      [
                        "CR",
                        normalizeText(
                          pickValue(company, [
                            "commercial_registration",
                            "cr_number",
                          ]),
                          t.unknown,
                        ),
                      ],
                      [t.plan, getPlan(company) || t.unknown],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border bg-slate-50/80 p-4"
                      >
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div className="mt-2 font-semibold">{value}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 bg-white/90 shadow-sm">
                <CardContent className="space-y-4 p-6">
                  <h3 className="font-semibold">{t.subscriptionInfo}</h3>
                  <div className="rounded-2xl border bg-slate-50/80 p-4">
                    <div className="text-xs text-muted-foreground">{t.amount}</div>
                    <div className="mt-2 text-xl">
                      <SarAmount value={getAmount(company)} />
                    </div>
                  </div>

                  <h3 className="pt-2 font-semibold">{t.apiCoverage}</h3>
                  <div className="grid gap-2">
                    {[
                      COMPANY_API.detail(resolvedCompanyId),
                      COMPANY_API.contracts(resolvedCompanyId),
                      COMPANY_API.services(resolvedCompanyId),
                    ].map((endpoint) => (
                      <div
                        key={endpoint}
                        className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-3 text-xs"
                      >
                        <code className="truncate">{endpoint}</code>
                        <Badge variant="secondary">{t.endpointReady}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}

      {(mode === "overview" || mode === "list" || mode === "reports") && (
        <>
          <section className="flex flex-col gap-3 rounded-3xl border bg-white/90 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="md:max-w-xl"
            />

            <div className="flex flex-wrap items-center gap-2">
              {mode === "reports" && (
                <>
                  <Button variant="outline" onClick={handleExport}>
                    {t.exportExcel}
                  </Button>
                  <Button variant="outline" onClick={handlePrint}>
                    {t.print}
                  </Button>
                </>
              )}

              {mode !== "reports" && (
                <Button
                  variant="outline"
                  onClick={() => router.push("/system/companies/reports")}
                >
                  {t.viewReports}
                </Button>
              )}
            </div>
          </section>

          {isLoading && <LoadingState message={t.loading} />}

          {!isLoading && filteredCompanies.length === 0 && (
            <EmptyState message={t.noData} />
          )}

          {!isLoading && filteredCompanies.length > 0 && (
            <Card className="overflow-hidden border-slate-200/80 bg-white/90 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-sm">
                    <thead className="bg-slate-50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-start font-medium">
                          {t.company}
                        </th>
                        <th className="px-4 py-3 text-start font-medium">
                          {t.email}
                        </th>
                        <th className="px-4 py-3 text-start font-medium">
                          {t.phone}
                        </th>
                        <th className="px-4 py-3 text-start font-medium">
                          {t.city}
                        </th>
                        <th className="px-4 py-3 text-start font-medium">
                          {t.plan}
                        </th>
                        <th className="px-4 py-3 text-start font-medium">
                          {t.amount}
                        </th>
                        <th className="px-4 py-3 text-start font-medium">
                          {t.status}
                        </th>
                        <th className="px-4 py-3 text-end font-medium">
                          {t.actions}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompanies.map((item, index) => {
                        const id = getCompanyId(item);
                        const status = getStatus(item);

                        return (
                          <tr
                            key={id || `${getCompanyName(item, "company")}-${index}`}
                            className="border-t transition hover:bg-slate-50/80"
                          >
                            <td className="px-4 py-4">
                              <div className="font-semibold">
                                {getCompanyName(item, t.unknown)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getLegalName(item, t.unknown)}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {getContact(item, "email") || "—"}
                            </td>
                            <td className="px-4 py-4">
                              {getContact(item, "phone") || "—"}
                            </td>
                            <td className="px-4 py-4">
                              {getContact(item, "city") || "—"}
                            </td>
                            <td className="px-4 py-4">
                              {getPlan(item) || "—"}
                            </td>
                            <td className="px-4 py-4">
                              <SarAmount value={getAmount(item)} />
                            </td>
                            <td className="px-4 py-4">
                              <Badge className={statusClass(status)}>
                                {status}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-end">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!id}
                                onClick={() => router.push(`/system/companies/${id}`)}
                              >
                                {t.open}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </main>
  );
}

export function SystemCompanyDetailFromRoute() {
  const params = useParams();
  const id = normalizeText((params as AnyRecord | null)?.id, "");

  return <SystemCompaniesView mode="detail" companyId={id} />;
}


