/* ============================================================
   📂 components/system/billing/SystemBillingView.tsx
   🧠 Mhamcloud | Frontend Phase 5.4 — System Subscriptions + Platform Payments
===============================================================
   ✅ System company subscriptions pages
   ✅ Platform payments monitoring pages
   ✅ Uses ready backend APIs with safe endpoint fallbacks
   ✅ Uses sonner toast
   ✅ Uses SAR SVG from public/currency/sar.svg for amounts
   ✅ Preserves Phase 5.1 Auth + Phase 5.2 Dashboard + Phase 5.3 Companies
============================================================ */

"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest, buildApiUrl } from "@/lib/api";

type BillingEntity = "subscriptions" | "payments";
type ViewMode = "overview" | "list" | "detail" | "reports";
type Locale = "ar" | "en";
type AnyRecord = Record<string, unknown>;

type SystemBillingViewProps = {
  entity: BillingEntity;
  mode: ViewMode;
  itemId?: string;
};

type ApiQueryLike = Record<string, string | number | boolean | null | undefined>;

type EntityConfig = {
  basePath: string;
  list: string[];
  detail: Array<(id: string | number) => string>;
  reports: string[];
  export: string[];
};

const SAR_ICON = "/currency/sar.svg";

const ENTITY_CONFIG: Record<BillingEntity, EntityConfig> = {
  subscriptions: {
    basePath: "/system/subscriptions",
    list: [
      "/api/system/subscriptions/",
      "/api/system/company-subscriptions/",
      "/api/system/companies/subscriptions/",
      "/api/system/billing/subscriptions/",
    ],
    detail: [
      (id) => `/api/system/subscriptions/${id}/`,
      (id) => `/api/system/company-subscriptions/${id}/`,
      (id) => `/api/system/billing/subscriptions/${id}/`,
    ],
    reports: [
      "/api/system/subscriptions/reports/",
      "/api/system/company-subscriptions/reports/",
      "/api/system/billing/subscriptions/reports/",
    ],
    export: [
      "/api/system/subscriptions/export/",
      "/api/system/company-subscriptions/export/",
      "/api/system/billing/subscriptions/export/",
    ],
  },
  payments: {
    basePath: "/system/platform-payments",
    list: [
      "/api/system/platform-payments/",
      "/api/system/platform/payments/",
      "/api/system/billing/payments/",
      "/api/system/payments/",
    ],
    detail: [
      (id) => `/api/system/platform-payments/${id}/`,
      (id) => `/api/system/platform/payments/${id}/`,
      (id) => `/api/system/billing/payments/${id}/`,
      (id) => `/api/system/payments/${id}/`,
    ],
    reports: [
      "/api/system/platform-payments/reports/",
      "/api/system/billing/payments/reports/",
      "/api/system/payments/reports/",
    ],
    export: [
      "/api/system/platform-payments/export/",
      "/api/system/billing/payments/export/",
      "/api/system/payments/export/",
    ],
  },
};

const dictionary = {
  ar: {
    eyebrow: "إدارة النظام",
    subscriptionsTitle: "اشتراكات الشركات",
    paymentsTitle: "مدفوعات المنصة",
    subscriptionsSubtitle:
      "متابعة اشتراكات الشركات، حالات الخطط، المبالغ الشهرية، وتغطية واجهات API الخاصة بالاشتراكات.",
    paymentsSubtitle:
      "مراقبة مدفوعات المنصة، حالات التحصيل، طرق الدفع، والمبالغ المرتبطة باشتراكات الشركات.",
    overview: "نظرة عامة",
    list: "القائمة",
    reports: "التقارير",
    details: "التفاصيل",
    refresh: "تحديث",
    back: "رجوع",
    open: "فتح",
    searchSubscriptions:
      "ابحث باسم الشركة، الخطة، الحالة، رقم الاشتراك...",
    searchPayments:
      "ابحث باسم الشركة، رقم العملية، بوابة الدفع، الحالة...",
    totalSubscriptions: "إجمالي الاشتراكات",
    activeSubscriptions: "الاشتراكات النشطة",
    expiringSubscriptions: "تحتاج متابعة",
    recurringValue: "القيمة الشهرية",
    totalPayments: "إجمالي المدفوعات",
    confirmedPayments: "مدفوعات مؤكدة",
    pendingPayments: "بانتظار المعالجة",
    collectedValue: "إجمالي التحصيل",
    company: "الشركة",
    reference: "المرجع",
    plan: "الخطة",
    status: "الحالة",
    amount: "المبلغ",
    method: "طريقة الدفع",
    gateway: "بوابة الدفع",
    dueDate: "تاريخ الاستحقاق",
    paidAt: "تاريخ الدفع",
    actions: "الإجراءات",
    noData: "لا توجد بيانات حالياً.",
    loading: "جاري تحميل البيانات...",
    loadFailed: "تعذر تحميل بيانات هذه الصفحة من واجهات API المتاحة.",
    detailFailed: "تعذر تحميل التفاصيل من واجهات API المتاحة.",
    copied: "تم نسخ endpoint.",
    endpointCoverage: "تغطية API",
    activeEndpoint: "الواجهة المستخدمة",
    endpointReady: "جاهز",
    endpointFallback: "مسارات احتياطية",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    viewList: "عرض القائمة",
    viewReports: "عرض التقارير",
    viewSubscriptions: "الاشتراكات",
    viewPayments: "مدفوعات المنصة",
    unknown: "غير محدد",
  },
  en: {
    eyebrow: "System Management",
    subscriptionsTitle: "Company Subscriptions",
    paymentsTitle: "Platform Payments",
    subscriptionsSubtitle:
      "Track company subscriptions, plan status, monthly values, and API coverage for subscription operations.",
    paymentsSubtitle:
      "Monitor platform payments, collection status, gateways, and amounts linked to company subscriptions.",
    overview: "Overview",
    list: "List",
    reports: "Reports",
    details: "Details",
    refresh: "Refresh",
    back: "Back",
    open: "Open",
    searchSubscriptions:
      "Search company, plan, status, subscription reference...",
    searchPayments:
      "Search company, transaction reference, gateway, status...",
    totalSubscriptions: "Total subscriptions",
    activeSubscriptions: "Active subscriptions",
    expiringSubscriptions: "Needs follow-up",
    recurringValue: "Monthly value",
    totalPayments: "Total payments",
    confirmedPayments: "Confirmed payments",
    pendingPayments: "Pending payments",
    collectedValue: "Collected value",
    company: "Company",
    reference: "Reference",
    plan: "Plan",
    status: "Status",
    amount: "Amount",
    method: "Payment method",
    gateway: "Gateway",
    dueDate: "Due date",
    paidAt: "Paid at",
    actions: "Actions",
    noData: "No data available yet.",
    loading: "Loading data...",
    loadFailed: "Could not load this page from the available API endpoints.",
    detailFailed: "Could not load details from the available API endpoints.",
    copied: "Endpoint copied.",
    endpointCoverage: "API coverage",
    activeEndpoint: "Active endpoint",
    endpointReady: "Ready",
    endpointFallback: "Fallback endpoints",
    exportExcel: "Export Excel",
    print: "Print",
    viewList: "View list",
    viewReports: "View reports",
    viewSubscriptions: "Subscriptions",
    viewPayments: "Platform payments",
    unknown: "Unknown",
  },
} as const;

function getBrowserLocale(): Locale {
  if (typeof window === "undefined") return "ar";

  const stored = window.localStorage.getItem("primey-locale");
  if (stored === "en" || stored === "ar") return stored;

  return document.documentElement.lang === "en" ? "en" : "ar";
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

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asRecord(value: unknown): AnyRecord {
  return isRecord(value) ? value : {};
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

function getRows(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);

  const record = asRecord(payload);
  const data = asRecord(record.data);

  const candidates = [
    record.results,
    record.items,
    record.rows,
    record.subscriptions,
    record.company_subscriptions,
    record.platform_payments,
    record.payments,
    data.results,
    data.items,
    data.rows,
    data.subscriptions,
    data.company_subscriptions,
    data.platform_payments,
    data.payments,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter(isRecord);
  }

  return [];
}

function getObject(payload: unknown, entity: BillingEntity): AnyRecord | null {
  if (!payload) return null;

  const record = asRecord(payload);
  const data = asRecord(record.data);

  const candidates = [
    data,
    record.subscription,
    record.company_subscription,
    record.platform_payment,
    record.payment,
    entity === "subscriptions" ? record.item : undefined,
    entity === "payments" ? record.item : undefined,
    record,
  ];

  for (const candidate of candidates) {
    if (isRecord(candidate) && Object.keys(candidate).length > 0) {
      return candidate;
    }
  }

  return null;
}

function getItemId(item: AnyRecord) {
  return normalizeText(
    pickValue(item, ["id", "uuid", "reference", "subscription_id", "payment_id"]),
  );
}

function getReference(item: AnyRecord, fallback: string) {
  return normalizeText(
    pickValue(item, [
      "reference",
      "code",
      "number",
      "subscription_number",
      "payment_number",
      "transaction_reference",
      "gateway_reference",
      "invoice_number",
      "id",
    ]),
    fallback,
  );
}

function getCompanyName(item: AnyRecord, fallback: string) {
  const company = asRecord(item.company);

  return normalizeText(
    pickValue(item, [
      "company_name",
      "tenant_name",
      "customer_name",
      "organization_name",
      "legal_name",
      "name",
    ]) || pickValue(company, ["name", "company_name", "legal_name"]),
    fallback,
  );
}

function getPlan(item: AnyRecord, fallback: string) {
  const plan = asRecord(item.plan);

  return normalizeText(
    pickValue(item, [
      "plan",
      "plan_name",
      "subscription_plan",
      "package",
      "package_name",
      "tier",
    ]) || pickValue(plan, ["name", "title", "code"]),
    fallback,
  );
}

function getStatus(item: AnyRecord) {
  return normalizeText(
    pickValue(item, [
      "status",
      "subscription_status",
      "payment_status",
      "state",
      "gateway_status",
      "is_active",
    ]),
    "unknown",
  );
}

function getMethod(item: AnyRecord, fallback: string) {
  return normalizeText(
    pickValue(item, [
      "payment_method",
      "method",
      "channel",
      "gateway",
      "gateway_name",
      "provider",
    ]),
    fallback,
  );
}

function getGateway(item: AnyRecord, fallback: string) {
  return normalizeText(
    pickValue(item, ["gateway", "gateway_name", "provider", "processor"]),
    fallback,
  );
}

function getAmount(item: AnyRecord) {
  return normalizeNumber(
    pickValue(item, [
      "amount",
      "total_amount",
      "paid_amount",
      "collected_amount",
      "subscription_amount",
      "monthly_amount",
      "monthly_fee",
      "price",
      "plan_price",
      "net_amount",
      "grand_total",
    ]),
  );
}

function getDateValue(item: AnyRecord, entity: BillingEntity) {
  const keys =
    entity === "subscriptions"
      ? ["next_billing_date", "expires_at", "end_date", "due_date", "renewal_date"]
      : ["paid_at", "confirmed_at", "created_at", "payment_date", "settled_at"];

  return normalizeText(pickValue(item, keys), "");
}

function formatDate(value: string, fallback: string) {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeStatus(status: string) {
  return status.toLowerCase().trim();
}

function isActiveStatus(status: string) {
  const clean = normalizeStatus(status);

  return [
    "active",
    "enabled",
    "approved",
    "paid",
    "confirmed",
    "success",
    "succeeded",
    "settled",
    "trial",
    "نشط",
  ].includes(clean);
}

function isPendingStatus(status: string) {
  const clean = normalizeStatus(status);

  return [
    "pending",
    "draft",
    "review",
    "processing",
    "due",
    "unpaid",
    "partially_paid",
    "بانتظار",
  ].includes(clean);
}

function isProblemStatus(status: string) {
  const clean = normalizeStatus(status);

  return [
    "expired",
    "suspended",
    "cancelled",
    "canceled",
    "failed",
    "overdue",
    "inactive",
    "disabled",
    "غير نشط",
  ].includes(clean);
}

function statusClass(status: string) {
  if (isActiveStatus(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (isPendingStatus(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (isProblemStatus(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function SarAmount({ value }: { value: number }) {
  if (!value) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
      <Image
        src={SAR_ICON}
        alt="SAR"
        width={16}
        height={16}
        className="h-4 w-4"
      />
      {formatNumber(value)}
    </span>
  );
}

function StatCard({
  title,
  value,
  hint,
  isAmount,
}: {
  title: string;
  value: string | number;
  hint: string;
  isAmount?: boolean;
}) {
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/85 shadow-sm backdrop-blur">
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-3 text-2xl font-bold tracking-tight">
          {isAmount ? (
            <SarAmount value={typeof value === "number" ? value : Number(value)} />
          ) : (
            String(value)
          )}
        </div>
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

async function tryGet<T>(
  endpoints: string[],
  query?: ApiQueryLike,
): Promise<
  | { ok: true; data: T; endpoint: string }
  | { ok: false; message: string; endpoint: string }
> {
  let lastMessage = "No endpoint responded successfully.";
  let lastEndpoint = endpoints[0] || "";

  for (const endpoint of endpoints) {
    lastEndpoint = endpoint;

    const result = await apiRequest<T>(endpoint, {
      method: "GET",
      query,
      showToast: false,
    });

    if (result.ok) {
      return {
        ok: true,
        data: result.data,
        endpoint,
      };
    }

    lastMessage = result.message || lastMessage;
  }

  return {
    ok: false,
    message: lastMessage,
    endpoint: lastEndpoint,
  };
}

export function SystemBillingView({
  entity,
  mode,
  itemId,
}: SystemBillingViewProps) {
  const router = useRouter();
  const params = useParams();
  const { isArabic, t } = usePrimeyLocale();

  const config = ENTITY_CONFIG[entity];
  const resolvedItemId =
    itemId || normalizeText((params as AnyRecord | null)?.id, "");

  const [rows, setRows] = useState<AnyRecord[]>([]);
  const [item, setItem] = useState<AnyRecord | null>(null);
  const [query, setQuery] = useState("");
  const [activeEndpoint, setActiveEndpoint] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const isSubscriptions = entity === "subscriptions";
  const entityTitle = isSubscriptions ? t.subscriptionsTitle : t.paymentsTitle;
  const entitySubtitle = isSubscriptions
    ? t.subscriptionsSubtitle
    : t.paymentsSubtitle;

  const pageTitle =
    mode === "detail"
      ? `${entityTitle} — ${t.details}`
      : mode === "reports"
        ? `${entityTitle} — ${t.reports}`
        : entityTitle;

  const loadRows = useCallback(async () => {
    if (mode === "detail") return;

    setIsLoading(true);

    const endpoints = mode === "reports" ? config.reports.concat(config.list) : config.list;

    const result = await tryGet<unknown>(endpoints, {
      search: query || undefined,
    });

    if (result.ok) {
      setRows(getRows(result.data));
      setActiveEndpoint(result.endpoint);
    } else {
      setRows([]);
      setActiveEndpoint(result.endpoint);
      toast.error(result.message || t.loadFailed);
    }

    setIsLoading(false);
  }, [config, mode, query, t.loadFailed]);

  const loadDetail = useCallback(async () => {
    if (mode !== "detail" || !resolvedItemId) return;

    setIsLoading(true);

    const result = await tryGet<unknown>(
      config.detail.map((builder) => builder(resolvedItemId)),
    );

    if (result.ok) {
      setItem(getObject(result.data, entity));
      setActiveEndpoint(result.endpoint);
    } else {
      setItem(null);
      setActiveEndpoint(result.endpoint);
      toast.error(result.message || t.detailFailed);
    }

    setIsLoading(false);
  }, [config, entity, mode, resolvedItemId, t.detailFailed]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const filteredRows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return rows;

    return rows.filter((record) => {
      const haystack = [
        getCompanyName(record, ""),
        getReference(record, ""),
        getPlan(record, ""),
        getStatus(record),
        getMethod(record, ""),
        getGateway(record, ""),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(cleanQuery);
    });
  }, [query, rows]);

  const stats = useMemo(() => {
    const total = filteredRows.length;
    const active = filteredRows.filter((record) =>
      isActiveStatus(getStatus(record)),
    ).length;
    const pending = filteredRows.filter((record) =>
      isPendingStatus(getStatus(record)),
    ).length;
    const problem = filteredRows.filter((record) =>
      isProblemStatus(getStatus(record)),
    ).length;
    const amount = filteredRows.reduce(
      (sum, record) => sum + getAmount(record),
      0,
    );

    return {
      total,
      active,
      pending,
      problem,
      amount,
    };
  }, [filteredRows]);

  const visibleRows =
    mode === "overview" ? filteredRows.slice(0, 8) : filteredRows;

  function handleRefresh() {
    if (mode === "detail") {
      void loadDetail();
      return;
    }

    void loadRows();
  }

  function handleExport() {
    if (typeof window === "undefined") return;

    const exportUrl = buildApiUrl(config.export[0], {
      search: query || undefined,
    });

    window.open(exportUrl, "_blank", "noopener,noreferrer");
  }

  function handlePrint() {
    if (typeof window === "undefined") return;
    window.print();
  }

  async function copyEndpoint(endpoint: string) {
    if (!endpoint || typeof navigator === "undefined") return;

    await navigator.clipboard.writeText(endpoint);
    toast.success(t.copied);
  }

  const searchPlaceholder = isSubscriptions
    ? t.searchSubscriptions
    : t.searchPayments;

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
              {pageTitle}
            </h1>

            <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
              {entitySubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode !== "overview" && (
              <Button
                variant="outline"
                onClick={() => router.push(config.basePath)}
              >
                {t.back}
              </Button>
            )}

            <Button variant="outline" onClick={handleRefresh}>
              {t.refresh}
            </Button>

            <Button asChild variant={isSubscriptions ? "default" : "outline"}>
              <Link href="/system/subscriptions">{t.viewSubscriptions}</Link>
            </Button>

            <Button asChild variant={!isSubscriptions ? "default" : "outline"}>
              <Link href="/system/platform-payments">{t.viewPayments}</Link>
            </Button>
          </div>
        </div>
      </section>

      {mode !== "detail" && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isSubscriptions ? (
            <>
              <StatCard
                title={t.totalSubscriptions}
                value={formatNumber(stats.total)}
                hint={t.list}
              />
              <StatCard
                title={t.activeSubscriptions}
                value={formatNumber(stats.active)}
                hint={t.status}
              />
              <StatCard
                title={t.expiringSubscriptions}
                value={formatNumber(stats.problem + stats.pending)}
                hint={t.status}
              />
              <StatCard
                title={t.recurringValue}
                value={stats.amount}
                hint={t.amount}
                isAmount
              />
            </>
          ) : (
            <>
              <StatCard
                title={t.totalPayments}
                value={formatNumber(stats.total)}
                hint={t.list}
              />
              <StatCard
                title={t.confirmedPayments}
                value={formatNumber(stats.active)}
                hint={t.status}
              />
              <StatCard
                title={t.pendingPayments}
                value={formatNumber(stats.pending)}
                hint={t.status}
              />
              <StatCard
                title={t.collectedValue}
                value={stats.amount}
                hint={t.amount}
                isAmount
              />
            </>
          )}
        </section>
      )}

      {mode !== "detail" && (
        <section className="flex flex-col gap-3 rounded-3xl border bg-white/90 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="md:max-w-xl"
          />

          <div className="flex flex-wrap items-center gap-2">
            {mode === "reports" ? (
              <>
                <Button variant="outline" onClick={handleExport}>
                  {t.exportExcel}
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  {t.print}
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href={`${config.basePath}/list`}>{t.viewList}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`${config.basePath}/reports`}>
                    {t.viewReports}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </section>
      )}

      {activeEndpoint && (
        <section className="rounded-3xl border bg-white/80 p-4 text-xs text-muted-foreground shadow-sm">
          <div className="mb-2 font-semibold text-foreground">
            {t.activeEndpoint}
          </div>
          <button
            type="button"
            onClick={() => void copyEndpoint(activeEndpoint)}
            className="w-full truncate rounded-2xl border bg-slate-50 px-3 py-2 text-start font-mono hover:bg-slate-100"
          >
            {activeEndpoint}
          </button>
        </section>
      )}

      {mode === "detail" && (
        <>
          {isLoading && <LoadingState message={t.loading} />}

          {!isLoading && !item && <EmptyState message={t.noData} />}

          {!isLoading && item && (
            <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-slate-200/80 bg-white/90 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {getCompanyName(item, t.unknown)}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getReference(item, t.unknown)}
                      </p>
                    </div>

                    <Badge className={statusClass(getStatus(item))}>
                      {getStatus(item)}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      [t.company, getCompanyName(item, t.unknown)],
                      [t.reference, getReference(item, t.unknown)],
                      [t.plan, getPlan(item, t.unknown)],
                      [t.status, getStatus(item)],
                      [t.method, getMethod(item, t.unknown)],
                      [t.gateway, getGateway(item, t.unknown)],
                      [
                        isSubscriptions ? t.dueDate : t.paidAt,
                        formatDate(getDateValue(item, entity), t.unknown),
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border bg-slate-50/80 p-4"
                      >
                        <div className="text-xs text-muted-foreground">
                          {label}
                        </div>
                        <div className="mt-2 font-semibold">{value}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 bg-white/90 shadow-sm">
                <CardContent className="space-y-4 p-6">
                  <h3 className="font-semibold">{t.amount}</h3>

                  <div className="rounded-2xl border bg-slate-50/80 p-4">
                    <div className="text-xs text-muted-foreground">
                      {t.amount}
                    </div>
                    <div className="mt-2 text-xl">
                      <SarAmount value={getAmount(item)} />
                    </div>
                  </div>

                  <h3 className="pt-2 font-semibold">{t.endpointCoverage}</h3>

                  <div className="grid gap-2">
                    {config.detail.map((builder) => {
                      const endpoint = builder(resolvedItemId);

                      return (
                        <button
                          type="button"
                          key={endpoint}
                          onClick={() => void copyEndpoint(endpoint)}
                          className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-3 text-start text-xs hover:bg-slate-50"
                        >
                          <code className="truncate">{endpoint}</code>
                          <Badge variant="secondary">{t.endpointReady}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}

      {mode !== "detail" && (
        <>
          {isLoading && <LoadingState message={t.loading} />}

          {!isLoading && visibleRows.length === 0 && (
            <EmptyState message={t.noData} />
          )}

          {!isLoading && visibleRows.length > 0 && (
            <Card className="overflow-hidden border-slate-200/80 bg-white/90 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] border-collapse text-sm">
                    <thead className="bg-slate-50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-start font-medium">
                          {t.company}
                        </th>
                        <th className="px-4 py-3 text-start font-medium">
                          {t.reference}
                        </th>
                        <th className="px-4 py-3 text-start font-medium">
                          {isSubscriptions ? t.plan : t.method}
                        </th>
                        <th className="px-4 py-3 text-start font-medium">
                          {isSubscriptions ? t.dueDate : t.gateway}
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
                      {visibleRows.map((record, index) => {
                        const id = getItemId(record) || String(index + 1);
                        const reference = getReference(record, `#${index + 1}`);
                        const detailHref = `${config.basePath}/${encodeURIComponent(id)}`;

                        return (
                          <tr
                            key={`${reference}-${index}`}
                            className="border-t hover:bg-slate-50/70"
                          >
                            <td className="px-4 py-3 font-medium">
                              {getCompanyName(record, t.unknown)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {reference}
                            </td>
                            <td className="px-4 py-3">
                              {isSubscriptions
                                ? getPlan(record, t.unknown)
                                : getMethod(record, t.unknown)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {isSubscriptions
                                ? formatDate(getDateValue(record, entity), t.unknown)
                                : getGateway(record, t.unknown)}
                            </td>
                            <td className="px-4 py-3">
                              <SarAmount value={getAmount(record)} />
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={statusClass(getStatus(record))}>
                                {getStatus(record)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-end">
                              <Button asChild size="sm" variant="outline">
                                <Link href={detailHref}>{t.open}</Link>
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

          {mode === "overview" && visibleRows.length > 0 && (
            <div className="flex justify-end">
              <Button asChild variant="outline">
                <Link href={`${config.basePath}/list`}>{t.viewList}</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
