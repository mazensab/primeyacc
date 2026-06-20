"use client";

/* ============================================================
   📂 primey_frontend/app/system/brokers/[id]/page.tsx
   🤝 Primey Care — Broker Details Page V2
   ------------------------------------------------------------
   ✅ Approved Premium details pattern
   ✅ Real API only: GET /api/agents/brokers/<broker_id>/
   ✅ Profile card + KPI cards + overview sections
   ✅ Broker financial summary
   ✅ Related/recent agents summary
   ✅ Web Print
   ✅ Copy codes
   ✅ SAR icon from /currency/sar.svg
   ✅ sonner toast
   ✅ Arabic/English via primey-locale
   ✅ No localhost / no fake data
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Banknote,
  CheckCircle2,
  Copy,
  FileText,
  Landmark,
  Loader2,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  UsersRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type BrokerRecord = {
  id: number;
  name: string;
  full_name: string;
  broker_name: string;
  broker_code: string;
  code: string;
  referral_code: string;
  status: string;
  phone: string;
  phone_number: string;
  email: string;
  city: string;
  address: string;
  default_commission_type: string;
  default_commission_value: number;
  revenue_recognition_mode: string;
  settlement_mode: string;
  bank_name: string;
  bank_account_name: string;
  iban: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
  financial_summary: FinancialSummary;
  agents_summary: AgentsSummary;
  recent_agents: RelatedAgent[];
};

type FinancialSummary = {
  currency: string;
  sample_amount: string;
  default_commission_type: string;
  default_commission_value: string;
  estimated_commission_on_sample: string;
  revenue_recognition_mode: string;
  settlement_mode: string;
  has_financial_profile: boolean;
};

type AgentsSummary = {
  agents_count: number;
  active_agents_count: number;
  inactive_agents_count: number;
  suspended_agents_count: number;
  draft_agents_count: number;
  default_commission_total: string;
  default_delivery_fee_total: string;
};

type RelatedAgent = {
  id: number;
  name: string;
  full_name: string;
  agent_name: string;
  agent_code: string;
  code: string;
  referral_code: string;
  status: string;
  phone: string;
  phone_number: string;
  email: string;
  city: string;
  default_commission_type: string;
  default_commission_value: string;
  default_delivery_fee: string;
  created_at: string | null;
  updated_at: string | null;
};

type BrokerDetailApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  item?: unknown;
  broker?: unknown;
};

const SAR_ICON = "/currency/sar.svg";

const EMPTY_FINANCIAL_SUMMARY: FinancialSummary = {
  currency: "SAR",
  sample_amount: "200.00",
  default_commission_type: "",
  default_commission_value: "0.00",
  estimated_commission_on_sample: "0.00",
  revenue_recognition_mode: "",
  settlement_mode: "",
  has_financial_profile: false,
};

const EMPTY_AGENTS_SUMMARY: AgentsSummary = {
  agents_count: 0,
  active_agents_count: 0,
  inactive_agents_count: 0,
  suspended_agents_count: 0,
  draft_agents_count: 0,
  default_commission_total: "0.00",
  default_delivery_fee_total: "0.00",
};

const translations = {
  ar: {
    title: "تفاصيل الوسيط",
    subtitle: "ملف الوسيط، بيانات التواصل، إعدادات العمولة، والربط المالي.",
    back: "رجوع",
    refresh: "تحديث",
    print: "طباعة",
    copied: "تم النسخ",
    copyBrokerCode: "نسخ كود الوسيط",
    copyReferralCode: "نسخ كود الإحالة",

    profile: "ملف الوسيط",
    overview: "نظرة عامة",
    contactInfo: "بيانات التواصل",
    commissionInfo: "إعدادات العمولة",
    financialInfo: "الإعدادات المالية",
    bankInfo: "البيانات البنكية",
    notesInfo: "الملاحظات",
    agentsInfo: "المندوبون المرتبطون",

    brokerName: "اسم الوسيط",
    brokerCode: "كود الوسيط",
    referralCode: "كود الإحالة",
    status: "الحالة",
    phone: "الجوال",
    email: "البريد الإلكتروني",
    city: "المدينة",
    address: "العنوان",

    commissionType: "نوع العمولة",
    commissionValue: "قيمة العمولة",
    percentage: "نسبة",
    fixed: "مبلغ ثابت",
    estimatedCommission: "عمولة متوقعة على 200",
    sampleAmount: "مبلغ العينة",

    revenueRecognitionMode: "طريقة إثبات الإيراد",
    settlementMode: "طريقة التسوية",
    grossSale: "إجمالي البيع",
    agentWithBrokerSummary: "مندوب مع ملخص وسيط",

    bankName: "اسم البنك",
    bankAccountName: "اسم صاحب الحساب",
    iban: "الآيبان",
    notes: "ملاحظات",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",

    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    draft: "مسودة",
    unknown: "غير معروف",

    agentsCount: "إجمالي المندوبين",
    activeAgents: "مندوبون نشطون",
    deliveryFeeTotal: "إجمالي عمولة التوصيل",
    commissionTotal: "إجمالي عمولات البيع",
    recentAgents: "آخر المندوبين",
    noAgents: "لا يوجد مندوبون مرتبطون بهذا الوسيط بعد.",

    noNotes: "لا توجد ملاحظات.",
    notFoundTitle: "الوسيط غير موجود",
    notFoundDesc: "لم يتم العثور على وسيط بهذا المعرّف.",
    errorTitle: "تعذر تحميل الوسيط",
    errorDesc: "تأكد من تشغيل الخادم ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    list: "قائمة الوسطاء",
    createAgent: "إنشاء مندوب",
    printTitle: "تفاصيل الوسيط",
    generatedAt: "تاريخ الطباعة",
  },
  en: {
    title: "Broker Details",
    subtitle: "Broker profile, contact data, commission settings, and financial link.",
    back: "Back",
    refresh: "Refresh",
    print: "Print",
    copied: "Copied",
    copyBrokerCode: "Copy broker code",
    copyReferralCode: "Copy referral code",

    profile: "Broker profile",
    overview: "Overview",
    contactInfo: "Contact info",
    commissionInfo: "Commission settings",
    financialInfo: "Financial settings",
    bankInfo: "Bank info",
    notesInfo: "Notes",
    agentsInfo: "Related agents",

    brokerName: "Broker name",
    brokerCode: "Broker code",
    referralCode: "Referral code",
    status: "Status",
    phone: "Phone",
    email: "Email",
    city: "City",
    address: "Address",

    commissionType: "Commission type",
    commissionValue: "Commission value",
    percentage: "Percentage",
    fixed: "Fixed amount",
    estimatedCommission: "Estimated commission on 200",
    sampleAmount: "Sample amount",

    revenueRecognitionMode: "Revenue recognition",
    settlementMode: "Settlement mode",
    grossSale: "Gross sale",
    agentWithBrokerSummary: "Agent with broker summary",

    bankName: "Bank name",
    bankAccountName: "Account holder",
    iban: "IBAN",
    notes: "Notes",
    createdAt: "Created at",
    updatedAt: "Updated at",

    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    draft: "Draft",
    unknown: "Unknown",

    agentsCount: "Total agents",
    activeAgents: "Active agents",
    deliveryFeeTotal: "Delivery fee total",
    commissionTotal: "Sales commission total",
    recentAgents: "Recent agents",
    noAgents: "No agents are linked to this broker yet.",

    noNotes: "No notes.",
    notFoundTitle: "Broker not found",
    notFoundDesc: "No broker was found with this ID.",
    errorTitle: "Unable to load broker",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    list: "Brokers list",
    createAgent: "Create agent",
    printTitle: "Broker details",
    generatedAt: "Generated at",
  },
} as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).trim();
  return cleaned || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          ""
        ).replace(/\/+$/, "")
      : "";

  if (envBase.endsWith("/api")) {
    return envBase.slice(0, -4);
  }

  return envBase;
}

function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let payload: any = null;

  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.detail ||
      payload?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

function normalizeFinancialSummary(value: unknown): FinancialSummary {
  const item = asRecord(value);

  return {
    currency: normalizeText(item.currency, "SAR"),
    sample_amount: normalizeText(item.sample_amount, "200.00"),
    default_commission_type: normalizeText(item.default_commission_type).toUpperCase(),
    default_commission_value: normalizeText(item.default_commission_value, "0.00"),
    estimated_commission_on_sample: normalizeText(
      item.estimated_commission_on_sample,
      "0.00",
    ),
    revenue_recognition_mode: normalizeText(item.revenue_recognition_mode),
    settlement_mode: normalizeText(item.settlement_mode),
    has_financial_profile: Boolean(item.has_financial_profile),
  };
}

function normalizeAgentsSummary(value: unknown): AgentsSummary {
  const item = asRecord(value);

  return {
    agents_count: toNumber(item.agents_count),
    active_agents_count: toNumber(item.active_agents_count),
    inactive_agents_count: toNumber(item.inactive_agents_count),
    suspended_agents_count: toNumber(item.suspended_agents_count),
    draft_agents_count: toNumber(item.draft_agents_count),
    default_commission_total: normalizeText(item.default_commission_total, "0.00"),
    default_delivery_fee_total: normalizeText(item.default_delivery_fee_total, "0.00"),
  };
}

function normalizeRelatedAgent(value: unknown): RelatedAgent {
  const item = asRecord(value);

  const id = toNumber(item.id);
  const name = normalizeText(
    item.name || item.full_name || item.agent_name,
    `#${id}`,
  );
  const code = normalizeText(item.agent_code || item.code);
  const phone = normalizeText(item.phone || item.phone_number || item.mobile);

  return {
    id,
    name,
    full_name: name,
    agent_name: name,
    agent_code: code,
    code,
    referral_code: normalizeText(item.referral_code),
    status: normalizeText(item.status).toUpperCase(),
    phone,
    phone_number: phone,
    email: normalizeText(item.email),
    city: normalizeText(item.city),
    default_commission_type: normalizeText(item.default_commission_type).toUpperCase(),
    default_commission_value: normalizeText(item.default_commission_value, "0.00"),
    default_delivery_fee: normalizeText(item.default_delivery_fee, "0.00"),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function normalizeBroker(value: unknown): BrokerRecord {
  const item = asRecord(value);

  const id = toNumber(item.id || item.value);
  const name = normalizeText(
    item.name || item.full_name || item.broker_name || item.display_name || item.label,
    `#${id}`,
  );
  const brokerCode = normalizeText(item.broker_code || item.code);
  const phone = normalizeText(item.phone || item.phone_number || item.mobile);

  return {
    id,
    name,
    full_name: name,
    broker_name: name,
    broker_code: brokerCode,
    code: brokerCode,
    referral_code: normalizeText(item.referral_code || item.ref_code),
    status: normalizeText(item.status).toUpperCase(),
    phone,
    phone_number: phone,
    email: normalizeText(item.email),
    city: normalizeText(item.city),
    address: normalizeText(item.address),
    default_commission_type: normalizeText(
      item.default_commission_type || item.commission_type,
    ).toUpperCase(),
    default_commission_value: toNumber(
      item.default_commission_value || item.commission_value,
    ),
    revenue_recognition_mode: normalizeText(item.revenue_recognition_mode),
    settlement_mode: normalizeText(item.settlement_mode),
    bank_name: normalizeText(item.bank_name),
    bank_account_name: normalizeText(item.bank_account_name),
    iban: normalizeText(item.iban),
    notes: normalizeText(item.notes),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
    financial_summary: normalizeFinancialSummary(item.financial_summary),
    agents_summary: normalizeAgentsSummary(item.agents_summary),
    recent_agents: asArray(item.recent_agents || item.agents)
      .map(normalizeRelatedAgent)
      .filter((agent) => agent.id > 0),
  };
}

function extractBrokerDetail(payload: BrokerDetailApiResponse): BrokerRecord | null {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const item = asRecord(root.item);
  const broker = asRecord(root.broker);

  const candidates: unknown[] = [
    data.id ? data : null,
    asRecord(data.broker).id ? data.broker : null,
    item.id ? item : null,
    broker.id ? broker : null,
    root.id ? root : null,
  ];

  for (const candidate of candidates) {
    const record = asRecord(candidate);
    if (toNumber(record.id) > 0) {
      return normalizeBroker(record);
    }
  }

  return null;
}

function getStatusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "ACTIVE") return t.active;
  if (normalized === "INACTIVE") return t.inactive;
  if (normalized === "SUSPENDED") return t.suspended;
  if (normalized === "DRAFT") return t.draft;

  return normalized || t.unknown;
}

function getStatusClass(status: string) {
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "ACTIVE") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (normalized === "DRAFT") {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  if (normalized === "SUSPENDED") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function getCommissionTypeLabel(type: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(type).toUpperCase();

  if (normalized === "PERCENTAGE") return t.percentage;
  if (normalized === "FIXED") return t.fixed;

  return normalized || t.unknown;
}

function getRevenueModeLabel(mode: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(mode).toUpperCase();

  if (normalized === "GROSS_SALE") return t.grossSale;

  return normalized || t.unknown;
}

function getSettlementModeLabel(mode: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(mode).toUpperCase();

  if (normalized === "AGENT_WITH_BROKER_SUMMARY") {
    return t.agentWithBrokerSummary;
  }

  return normalized || t.unknown;
}

function SarIcon({ className }: { className?: string }) {
  return (
    <Image
      src={SAR_ICON}
      alt="SAR"
      width={14}
      height={14}
      className={cn("inline-block h-3.5 w-3.5 object-contain", className)}
      unoptimized
    />
  );
}

function MoneyValue({ value }: { value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums text-foreground">
      <span>{formatMoney(value)}</span>
      <SarIcon />
    </span>
  );
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full rounded-full px-2.5 py-1 text-xs font-medium",
        getStatusClass(status),
      )}
    >
      <span className="truncate">{getStatusLabel(status, locale)}</span>
    </Badge>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "max-w-[60%] text-end text-sm font-medium text-foreground",
          mono && "font-mono tabular-nums",
        )}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "purple";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : tone === "purple"
          ? "bg-purple-50 text-purple-700"
          : "bg-background text-muted-foreground";

  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[112px] px-6 py-5">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>

        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          {value}
        </CardTitle>

        <CardAction>
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg border",
              toneClass,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function DetailsSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-lg border bg-card shadow-none">
            <CardHeader className="min-h-[112px] px-6 py-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Skeleton className="h-[480px] rounded-lg" />
        <Skeleton className="h-[480px] rounded-lg" />
      </div>
    </div>
  );
}

export default function BrokerDetailsPage() {
  const params = useParams<{ id?: string }>();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [broker, setBroker] = React.useState<BrokerRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notFound, setNotFound] = React.useState(false);

  const didLoadRef = React.useRef(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const brokerId = React.useMemo(() => {
    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    return toNumber(rawId);
  }, [params?.id]);

  React.useEffect(() => {
    const applyLocale = () => setLocale(getInitialLocale());

    applyLocale();

    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  const loadBroker = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");
        setNotFound(false);

        if (!brokerId) {
          setBroker(null);
          setNotFound(true);
          return;
        }

        const payload = await fetchJson<BrokerDetailApiResponse>(
          makeApiUrl(`/api/agents/brokers/${brokerId}/`),
          controller.signal,
        );

        const found = extractBrokerDetail(payload);

        setBroker(found);
        setNotFound(!found);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setBroker(null);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [brokerId, t.errorDesc],
  );

  React.useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    void loadBroker();
  }, [loadBroker]);

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.errorDesc);
    }
  }

  function printPage() {
    if (!broker) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.errorDesc);
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 28px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            h1 { margin: 0; font-size: 22px; }
            p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
            }
            .box {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 12px;
            }
            .label {
              display: block;
              color: #6b7280;
              font-size: 11px;
              margin-bottom: 4px;
            }
            .value {
              font-size: 14px;
              font-weight: 700;
              word-break: break-word;
            }
            .full { grid-column: 1 / -1; }
            .num { direction: ltr; unicode-bidi: embed; white-space: nowrap; }
            @media print {
              body { padding: 16px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Primey Care - ${escapeHtml(t.printTitle)}</h1>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(broker.name)}</p>
              <p>${escapeHtml(broker.broker_code || "—")}</p>
            </div>
          </div>

          <div class="grid">
            <div class="box"><span class="label">${escapeHtml(t.brokerName)}</span><span class="value">${escapeHtml(broker.name)}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.status)}</span><span class="value">${escapeHtml(getStatusLabel(broker.status, locale))}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.brokerCode)}</span><span class="value">${escapeHtml(broker.broker_code || "—")}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.referralCode)}</span><span class="value">${escapeHtml(broker.referral_code || "—")}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.phone)}</span><span class="value">${escapeHtml(broker.phone || "—")}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.email)}</span><span class="value">${escapeHtml(broker.email || "—")}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.city)}</span><span class="value">${escapeHtml(broker.city || "—")}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.address)}</span><span class="value">${escapeHtml(broker.address || "—")}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.commissionType)}</span><span class="value">${escapeHtml(getCommissionTypeLabel(broker.default_commission_type, locale))}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.commissionValue)}</span><span class="value num">${escapeHtml(formatMoney(broker.default_commission_value))}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.estimatedCommission)}</span><span class="value num">${escapeHtml(formatMoney(broker.financial_summary.estimated_commission_on_sample))}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.agentsCount)}</span><span class="value num">${escapeHtml(formatInteger(broker.agents_summary.agents_count))}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.revenueRecognitionMode)}</span><span class="value">${escapeHtml(getRevenueModeLabel(broker.revenue_recognition_mode, locale))}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.settlementMode)}</span><span class="value">${escapeHtml(getSettlementModeLabel(broker.settlement_mode, locale))}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.bankName)}</span><span class="value">${escapeHtml(broker.bank_name || "—")}</span></div>
            <div class="box"><span class="label">${escapeHtml(t.iban)}</span><span class="value num">${escapeHtml(broker.iban || "—")}</span></div>
            <div class="box full"><span class="label">${escapeHtml(t.notes)}</span><span class="value">${escapeHtml(broker.notes || t.noNotes)}</span></div>
          </div>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  if (loading) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <DetailsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 text-start">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/brokers">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>
        </div>

        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-red-200 bg-white">
              <TriangleAlert className="h-6 w-6 text-red-600" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-red-900">{t.errorTitle}</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadBroker()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !broker) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 text-start">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/brokers">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>
        </div>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
              <XCircle className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-foreground">{t.notFoundTitle}</p>
              <p className="text-sm text-muted-foreground">{t.notFoundDesc}</p>
            </div>

            <Button asChild className="h-9 rounded-lg bg-black text-white hover:bg-black/90">
              <Link href="/system/brokers">{t.list}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-start">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/brokers">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadBroker({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <Button
            asChild
            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
          >
            <Link href={`/system/agents/create?broker_id=${broker.id}`}>
              <UsersRound className="h-4 w-4" />
              {t.createAgent}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.status}
          value={<span className="text-xl">{getStatusLabel(broker.status, locale)}</span>}
          icon={CheckCircle2}
          tone={broker.status === "ACTIVE" ? "success" : "warning"}
        />
        <KpiCard
          title={t.commissionValue}
          value={
            broker.default_commission_type === "PERCENTAGE" ? (
              `${formatMoney(broker.default_commission_value)}%`
            ) : (
              <MoneyValue value={broker.default_commission_value} />
            )
          }
          icon={BadgePercent}
          tone="purple"
        />
        <KpiCard
          title={t.estimatedCommission}
          value={<MoneyValue value={broker.financial_summary.estimated_commission_on_sample} />}
          icon={WalletCards}
          tone="warning"
        />
        <KpiCard
          title={t.agentsCount}
          value={formatInteger(broker.agents_summary.agents_count)}
          icon={UsersRound}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 py-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border bg-muted/40">
              <UserRound className="h-8 w-8 text-muted-foreground" />
            </div>

            <div className="space-y-1">
              <CardTitle className="text-xl">{broker.name}</CardTitle>
              <CardDescription>
                {broker.broker_code || "—"} · {broker.referral_code || "—"}
              </CardDescription>
            </div>

            <div className="flex justify-center">
              <StatusBadge status={broker.status} locale={locale} />
            </div>
          </CardHeader>

          <CardContent className="space-y-3 px-5 pb-5">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-lg"
              onClick={() => void copyValue(broker.broker_code)}
              disabled={!broker.broker_code}
            >
              <Copy className="h-4 w-4" />
              {t.copyBrokerCode}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-lg"
              onClick={() => void copyValue(broker.referral_code)}
              disabled={!broker.referral_code}
            >
              <ShieldCheck className="h-4 w-4" />
              {t.copyReferralCode}
            </Button>

            <Button
              asChild
              className="h-10 w-full rounded-lg bg-black text-white hover:bg-black/90"
            >
              <Link href={`/system/agents/create?broker_id=${broker.id}`}>
                <UsersRound className="h-4 w-4" />
                {t.createAgent}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.overview}</CardTitle>
              <CardDescription>{t.profile}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 lg:grid-cols-2">
              <div className="rounded-lg border bg-background px-4">
                <InfoRow label={t.brokerName} value={broker.name} />
                <InfoRow label={t.brokerCode} value={broker.broker_code || "—"} mono />
                <InfoRow label={t.referralCode} value={broker.referral_code || "—"} mono />
                <InfoRow label={t.status} value={<StatusBadge status={broker.status} locale={locale} />} />
              </div>

              <div className="rounded-lg border bg-background px-4">
                <InfoRow label={t.createdAt} value={formatDate(broker.created_at)} mono />
                <InfoRow label={t.updatedAt} value={formatDate(broker.updated_at)} mono />
                <InfoRow
                  label={t.commissionType}
                  value={getCommissionTypeLabel(broker.default_commission_type, locale)}
                />
                <InfoRow
                  label={t.commissionValue}
                  value={
                    broker.default_commission_type === "PERCENTAGE" ? (
                      `${formatMoney(broker.default_commission_value)}%`
                    ) : (
                      <MoneyValue value={broker.default_commission_value} />
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-5 py-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {t.contactInfo}
                </CardTitle>
              </CardHeader>

              <CardContent className="px-5 pb-5">
                <div className="rounded-lg border bg-background px-4">
                  <InfoRow label={t.phone} value={broker.phone || "—"} mono />
                  <InfoRow label={t.email} value={broker.email || "—"} mono />
                  <InfoRow label={t.city} value={broker.city || "—"} />
                  <InfoRow label={t.address} value={broker.address || "—"} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-5 py-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  {t.financialInfo}
                </CardTitle>
              </CardHeader>

              <CardContent className="px-5 pb-5">
                <div className="rounded-lg border bg-background px-4">
                  <InfoRow
                    label={t.revenueRecognitionMode}
                    value={getRevenueModeLabel(
                      broker.financial_summary.revenue_recognition_mode ||
                        broker.revenue_recognition_mode,
                      locale,
                    )}
                  />
                  <InfoRow
                    label={t.settlementMode}
                    value={getSettlementModeLabel(
                      broker.financial_summary.settlement_mode ||
                        broker.settlement_mode,
                      locale,
                    )}
                  />
                  <InfoRow
                    label={t.sampleAmount}
                    value={<MoneyValue value={broker.financial_summary.sample_amount} />}
                  />
                  <InfoRow
                    label={t.estimatedCommission}
                    value={<MoneyValue value={broker.financial_summary.estimated_commission_on_sample} />}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <UsersRound className="h-4 w-4 text-muted-foreground" />
                {t.agentsInfo}
              </CardTitle>
              <CardDescription>{t.recentAgents}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 px-5 pb-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-background p-4">
                  <p className="text-sm text-muted-foreground">{t.agentsCount}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {formatInteger(broker.agents_summary.agents_count)}
                  </p>
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <p className="text-sm text-muted-foreground">{t.activeAgents}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {formatInteger(broker.agents_summary.active_agents_count)}
                  </p>
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <p className="text-sm text-muted-foreground">{t.deliveryFeeTotal}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    <MoneyValue value={broker.agents_summary.default_delivery_fee_total} />
                  </p>
                </div>
              </div>

              {broker.recent_agents.length ? (
                <div className="space-y-2">
                  {broker.recent_agents.map((agent) => (
                    <Link
                      href={`/system/agents/${agent.id}`}
                      key={agent.id}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3 transition hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {agent.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {agent.agent_code || "—"} · {agent.phone || "—"}
                        </p>
                      </div>

                      <StatusBadge status={agent.status} locale={locale} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border bg-background p-5 text-center text-sm text-muted-foreground">
                  {t.noAgents}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                {t.bankInfo}
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 lg:grid-cols-2">
              <div className="rounded-lg border bg-background px-4">
                <InfoRow label={t.bankName} value={broker.bank_name || "—"} />
                <InfoRow label={t.bankAccountName} value={broker.bank_account_name || "—"} />
              </div>

              <div className="rounded-lg border bg-background px-4">
                <InfoRow label={t.iban} value={broker.iban || "—"} mono />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {t.notesInfo}
              </CardTitle>
            </CardHeader>

            <CardContent className="px-5 pb-5">
              <div className="min-h-[120px] rounded-lg border bg-background p-4 text-sm leading-7 text-muted-foreground">
                {broker.notes || t.noNotes}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}