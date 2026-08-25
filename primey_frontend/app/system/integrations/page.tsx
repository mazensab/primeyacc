"use client";

/* ============================================================
   📂 primey_frontend/app/system/integrations/page.tsx
   🔗 Mhamcloud — System Integrations Center
   ------------------------------------------------------------
   ✅ Phase 39B
   ✅ Platform payment providers readiness
   ✅ Moyasar / Tamara / Tabby
   ✅ Webhook operational visibility
   ✅ Reconciliation operational visibility
   ✅ API Keys remain an independent integration surface
   ✅ No raw credentials / secrets displayed
   ✅ Real frozen backend contracts only
   ✅ sonner
   ✅ Loading / error / empty states
   ✅ Arabic / English
   ✅ English digits and dates
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash2,
  FileKey2,
  KeyRound,
  Loader2,
  MessageCircle,
  PlugZap,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Webhook,
  Workflow,
  XCircle,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_PATHS } from "@/lib/api/endpoints";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type GatewayName = "MOYASAR" | "TAMARA" | "TABBY";

type GatewayCheck = {
  name: string;
  configured: boolean;
  required: boolean;
  message: string;
};

type GatewayReadiness = {
  gateway: GatewayName | string;
  configured: boolean;
  ready: boolean;
  environment: string;
  checks: GatewayCheck[];
};

type WebhookEvent = {
  id: string;
  gateway: string;
  status: string;
  eventType: string;
  providerEventId: string;
  providerPaymentId: string;
  createdAt: string | null;
  processedAt: string | null;
  error: string;
};

type ReconciliationRow = {
  id: string;
  gateway: string;
  status: string;
  paymentId: string;
  providerPaymentId: string;
  mismatchCount: number;
  createdAt: string | null;
};

type OperationalSummary = {
  webhookTotal: number;
  webhookFailed: number;
  webhookPending: number;
  reconciliationTotal: number;
  reconciliationMismatch: number;
};

type GatewayFilter = "all" | "MOYASAR" | "TAMARA" | "TABBY";

const translations = {
  ar: {
    badge: "التكاملات",
    title: "مركز التكاملات",
    subtitle:
      "متابعة جاهزية بوابات اشتراكات Mhamcloud، Webhooks والمطابقة المالية بدون كشف أي بيانات اعتماد سرية.",
    refresh: "تحديث",
    refreshed: "تم تحديث مركز التكاملات.",
    apiKeys: "مفاتيح API",
    apiContracts: "عقود API",
    whatsapp: "واتساب",
    payments: "مدفوعات المنصة",
    gatewaysTitle: "بوابات الدفع",
    gatewaysDesc:
      "حالة الإعداد الفعلية للبوابات الثلاث من عقد Gateway Readiness المجمد.",
    configured: "مهيأة",
    notConfigured: "غير مهيأة",
    ready: "جاهزة",
    notReady: "غير جاهزة",
    environment: "البيئة",
    checks: "فحوصات الإعداد",
    required: "مطلوب",
    optional: "اختياري",
    available: "متوفر",
    missing: "مفقود",
    noSecret: "لا تُعرض أي قيمة Secret أو API credential في هذه الصفحة.",
    webhookTitle: "حالة Webhooks",
    webhookDesc:
      "آخر أحداث Webhook المسجلة للبوابات مع حالة المعالجة فقط.",
    reconciliationTitle: "المطابقة المالية",
    reconciliationDesc:
      "آخر سجلات reconciliation بين بيانات Mhamcloud ومزود الدفع.",
    totalWebhook: "إجمالي Webhooks",
    failedWebhook: "Webhooks فاشلة",
    pendingWebhook: "بانتظار المعالجة",
    totalReconciliation: "إجمالي المطابقات",
    mismatches: "بها اختلافات",
    gateway: "البوابة",
    status: "الحالة",
    event: "الحدث",
    providerEvent: "Provider Event",
    payment: "Payment",
    createdAt: "تاريخ الإنشاء",
    mismatchCount: "الاختلافات",
    search: "بحث...",
    all: "الكل",
    noWebhook: "لا توجد أحداث Webhook مسجلة.",
    noReconciliation: "لا توجد سجلات مطابقة مالية.",
    loadError: "تعذر تحميل بعض بيانات مركز التكاملات.",
    tryAgain: "إعادة المحاولة",
    partial:
      "تم تحميل المركز جزئيًا. بعض العقود لم تُرجع بيانات أو ليست متاحة للصلاحية الحالية.",
    providerConfigured: "إعداد المزود مكتمل",
    providerNotConfigured: "إعداد المزود غير مكتمل",
    operational: "التشغيل",
    credentialsSafety: "أمان بيانات الاعتماد",
    credentialsSafetyDesc:
      "يستخدم المركز مؤشرات readiness فقط؛ لا يقرأ أو يعرض Secret Key أو API Token أو Webhook Secret.",
    apiKeysDesc:
      "إدارة مفاتيح التكامل الخارجية بشكل مستقل عن مفاتيح بوابات الدفع.",
    whatsappDesc:
      "إدارة حالة واتساب والقنوات والرسائل من مركز التواصل الحالي.",
    contractsDesc:
      "مراجعة العقود المعتمدة ونقاط الربط المتاحة.",
    paymentsDesc:
      "فتح مركز مدفوعات اشتراكات المنصة وسجل العمليات.",
    none: "—",
  },
  en: {
    badge: "Integrations",
    title: "Integrations Center",
    subtitle:
      "Monitor Mhamcloud subscription payment gateways, webhooks, and reconciliation without exposing provider credentials.",
    refresh: "Refresh",
    refreshed: "Integrations center refreshed.",
    apiKeys: "API Keys",
    apiContracts: "API Contracts",
    whatsapp: "WhatsApp",
    payments: "Platform Payments",
    gatewaysTitle: "Payment Gateways",
    gatewaysDesc:
      "Actual configuration readiness for the three providers from the frozen Gateway Readiness contract.",
    configured: "Configured",
    notConfigured: "Not configured",
    ready: "Ready",
    notReady: "Not ready",
    environment: "Environment",
    checks: "Configuration checks",
    required: "Required",
    optional: "Optional",
    available: "Available",
    missing: "Missing",
    noSecret: "No secret or provider credential value is displayed on this page.",
    webhookTitle: "Webhook Status",
    webhookDesc:
      "Latest recorded gateway webhook events with processing status only.",
    reconciliationTitle: "Reconciliation",
    reconciliationDesc:
      "Latest reconciliation records between Mhamcloud and payment providers.",
    totalWebhook: "Total webhooks",
    failedWebhook: "Failed webhooks",
    pendingWebhook: "Pending",
    totalReconciliation: "Reconciliations",
    mismatches: "With mismatches",
    gateway: "Gateway",
    status: "Status",
    event: "Event",
    providerEvent: "Provider Event",
    payment: "Payment",
    createdAt: "Created at",
    mismatchCount: "Mismatches",
    search: "Search...",
    all: "All",
    noWebhook: "No webhook events are recorded.",
    noReconciliation: "No reconciliation records are available.",
    loadError: "Some integrations center data could not be loaded.",
    tryAgain: "Try again",
    partial:
      "The center loaded partially. Some contracts returned no data or are unavailable for the current permission.",
    providerConfigured: "Provider configuration complete",
    providerNotConfigured: "Provider configuration incomplete",
    operational: "Operations",
    credentialsSafety: "Credential safety",
    credentialsSafetyDesc:
      "The center consumes readiness indicators only; it never reads or displays Secret Keys, API Tokens, or Webhook Secrets.",
    apiKeysDesc:
      "Manage external integration keys independently from payment provider credentials.",
    whatsappDesc:
      "Manage WhatsApp status, channels, and messages in the existing communications center.",
    contractsDesc:
      "Review approved API contracts and integration endpoints.",
    paymentsDesc:
      "Open the platform subscription payments center and operations register.",
    none: "—",
  },
} as const;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function bool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;

  const normalized = text(value).toLowerCase();

  if (["true", "1", "yes", "ready", "configured", "available", "ok"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "missing", "unavailable", "failed"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function apiBase() {
  const base = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");

  return base.endsWith("/api")
    ? base.slice(0, -4)
    : base;
}

function apiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${apiBase()}${path}${query ? `?${query}` : ""}`;
}

async function requestJson<T>(
  path: string,
  params?: URLSearchParams,
): Promise<T> {
  const response = await fetch(apiUrl(path, params), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const raw = await response.text();
  let payload: unknown = {};

  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = {};
    }
  }

  const root = record(payload);

  if (!response.ok || root.ok === false || root.success === false) {
    throw new Error(
      text(root.message) ||
        text(root.detail) ||
        text(root.error) ||
        `Request failed with status ${response.status}`,
    );
  }

  return payload as T;
}

function arrayFrom(
  value: unknown,
  keys: string[],
): unknown[] {
  if (Array.isArray(value)) return value;

  const root = record(value);

  for (const key of keys) {
    if (Array.isArray(root[key])) {
      return root[key] as unknown[];
    }
  }

  const data = record(root.data);

  for (const key of keys) {
    if (Array.isArray(data[key])) {
      return data[key] as unknown[];
    }
  }

  return [];
}

function normalizeCheck(value: unknown): GatewayCheck {
  const row = record(value);

  return {
    name:
      text(row.name) ||
      text(row.key) ||
      text(row.check) ||
      text(row.label) ||
      "configuration",
    configured: bool(
      row.configured ??
        row.available ??
        row.present ??
        row.ok ??
        row.ready,
    ),
    required:
      row.required === undefined
        ? true
        : bool(row.required, true),
    message:
      text(row.message) ||
      text(row.description) ||
      "",
  };
}

function normalizeGateway(value: unknown): GatewayReadiness {
  const row = record(value);
  const checks = arrayFrom(row.checks, ["checks"]).map(normalizeCheck);

  const configured =
    row.configured !== undefined
      ? bool(row.configured)
      : checks
          .filter((item) => item.required)
          .every((item) => item.configured);

  const ready =
    row.ready !== undefined
      ? bool(row.ready)
      : row.is_ready !== undefined
        ? bool(row.is_ready)
        : configured;

  return {
    gateway: text(
      row.gateway ??
        row.provider ??
        row.name,
      "UNKNOWN",
    ).toUpperCase(),
    configured,
    ready,
    environment: text(
      row.environment ??
        row.mode ??
        row.env,
      "—",
    ).toUpperCase(),
    checks,
  };
}

function normalizeWebhook(value: unknown): WebhookEvent {
  const row = record(value);

  return {
    id: text(row.id),
    gateway: text(row.gateway, "—").toUpperCase(),
    status: text(row.status, "UNKNOWN").toUpperCase(),
    eventType:
      text(row.event_type) ||
      text(row.type) ||
      "—",
    providerEventId:
      text(row.provider_event_id) ||
      text(row.external_event_id) ||
      "—",
    providerPaymentId:
      text(row.provider_payment_id) ||
      text(row.external_payment_id) ||
      "—",
    createdAt:
      text(row.created_at) || null,
    processedAt:
      text(row.processed_at) || null,
    error:
      text(row.error_message) ||
      text(row.last_error) ||
      text(row.failure_reason),
  };
}

function normalizeReconciliation(value: unknown): ReconciliationRow {
  const row = record(value);
  const mismatches = row.mismatches;

  return {
    id: text(row.id),
    gateway: text(row.gateway, "—").toUpperCase(),
    status: text(
      row.status ??
        row.result_status ??
        row.reconciliation_status,
      "UNKNOWN",
    ).toUpperCase(),
    paymentId:
      text(row.payment_id) ||
      text(record(row.payment).id) ||
      "—",
    providerPaymentId:
      text(row.provider_payment_id) ||
      "—",
    mismatchCount:
      Array.isArray(mismatches)
        ? mismatches.length
        : numberValue(
            row.mismatch_count ??
              row.discrepancy_count,
            0,
          ),
    createdAt:
      text(row.created_at) || null,
  };
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16).replace("T", " ");
  }

  const pad = (n: number) =>
    String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function statusClass(status: string) {
  const value = status.toUpperCase();

  if (
    [
      "PROCESSED",
      "MATCHED",
      "SUCCESS",
      "COMPLETED",
      "READY",
      "SENT",
    ].includes(value)
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    [
      "FAILED",
      "ERROR",
      "MISMATCH",
      "UNMATCHED",
      "CONFLICT",
    ].includes(value)
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (
    [
      "RECEIVED",
      "PENDING",
      "PROCESSING",
      "PARTIAL",
    ].includes(value)
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (value === "IGNORED") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

function StateBadge({
  value,
}: {
  value: string;
}) {
  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-1 text-xs ${statusClass(value)}`}
    >
      {value || "UNKNOWN"}
    </Badge>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-xl border bg-card shadow-none">
      <CardContent className="flex min-h-[122px] items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">
            {title}
          </p>
          <p className="mt-3 text-2xl font-bold tabular-nums">
            {new Intl.NumberFormat("en-US").format(value)}
          </p>
        </div>

        <span className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/20 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-72 rounded-xl"
            />
          ))}
        </div>

        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </main>
  );
}

export default function SystemIntegrationsPage() {
  const [locale, setLocale] =
    React.useState<Locale>("ar");

  const [gateways, setGateways] =
    React.useState<GatewayReadiness[]>([]);

  const [webhooks, setWebhooks] =
    React.useState<WebhookEvent[]>([]);

  const [reconciliations, setReconciliations] =
    React.useState<ReconciliationRow[]>([]);

  const [loading, setLoading] =
    React.useState(true);

  const [refreshing, setRefreshing] =
    React.useState(false);

  const [errors, setErrors] =
    React.useState<string[]>([]);

  const [search, setSearch] =
    React.useState("");

  const [gatewayFilter, setGatewayFilter] =
    React.useState<GatewayFilter>("all");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  React.useEffect(() => {
    const applyLocale = () => {
      const next = getLocale();
      setLocale(next);

      document.documentElement.lang = next;
      document.documentElement.dir =
        next === "ar" ? "rtl" : "ltr";

      document.body.dir =
        next === "ar" ? "rtl" : "ltr";
    };

    applyLocale();

    window.addEventListener(
      "storage",
      applyLocale,
    );

    window.addEventListener(
      "primey-locale-changed",
      applyLocale,
    );

    return () => {
      window.removeEventListener(
        "storage",
        applyLocale,
      );

      window.removeEventListener(
        "primey-locale-changed",
        applyLocale,
      );
    };
  }, []);

  const loadData = React.useCallback(
    async ({
      silent = false,
    }: {
      silent?: boolean;
    } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      setRefreshing(true);

      const nextErrors: string[] = [];

      const [
        readinessResult,
        webhookResult,
        reconciliationResult,
      ] = await Promise.allSettled([
        requestJson<unknown>(
          API_PATHS.systemPaymentIntegrations.readiness,
        ),
        requestJson<unknown>(
          API_PATHS.systemPaymentIntegrations.webhookEvents,
          new URLSearchParams({
            page: "1",
            page_size: "25",
          }),
        ),
        requestJson<unknown>(
          API_PATHS.systemPaymentIntegrations.reconciliations,
          new URLSearchParams({
            page: "1",
            page_size: "25",
          }),
        ),
      ]);

      if (readinessResult.status === "fulfilled") {
        const root = record(readinessResult.value);
        const data = record(root.data);

        const rows = arrayFrom(
          data.gateways ?? readinessResult.value,
          ["gateways", "results", "items"],
        ).map(normalizeGateway);

        setGateways(rows);
      } else {
        setGateways([]);
        nextErrors.push(
          readinessResult.reason instanceof Error
            ? readinessResult.reason.message
            : t.loadError,
        );
      }

      if (webhookResult.status === "fulfilled") {
        const rows = arrayFrom(
          webhookResult.value,
          ["events", "results", "items"],
        ).map(normalizeWebhook);

        setWebhooks(rows);
      } else {
        setWebhooks([]);
        nextErrors.push(
          webhookResult.reason instanceof Error
            ? webhookResult.reason.message
            : t.loadError,
        );
      }

      if (
        reconciliationResult.status === "fulfilled"
      ) {
        const rows = arrayFrom(
          reconciliationResult.value,
          [
            "reconciliations",
            "results",
            "items",
          ],
        ).map(normalizeReconciliation);

        setReconciliations(rows);
      } else {
        setReconciliations([]);
        nextErrors.push(
          reconciliationResult.reason instanceof Error
            ? reconciliationResult.reason.message
            : t.loadError,
        );
      }

      setErrors(
        Array.from(new Set(nextErrors)),
      );

      setLoading(false);
      setRefreshing(false);

      if (silent) {
        if (nextErrors.length) {
          toast.warning(t.partial);
        } else {
          toast.success(t.refreshed);
        }
      }
    },
    [t.loadError, t.partial, t.refreshed],
  );

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const summary = React.useMemo<OperationalSummary>(
    () => ({
      webhookTotal: webhooks.length,
      webhookFailed: webhooks.filter((row) =>
        ["FAILED", "ERROR"].includes(row.status),
      ).length,
      webhookPending: webhooks.filter((row) =>
        ["RECEIVED", "PENDING", "PROCESSING"].includes(
          row.status,
        ),
      ).length,
      reconciliationTotal: reconciliations.length,
      reconciliationMismatch: reconciliations.filter(
        (row) =>
          row.mismatchCount > 0 ||
          ["MISMATCH", "UNMATCHED", "CONFLICT"].includes(
            row.status,
          ),
      ).length,
    }),
    [reconciliations, webhooks],
  );

  const filteredWebhooks = React.useMemo(() => {
    const needle = search.trim().toLowerCase();

    return webhooks.filter((row) => {
      if (
        gatewayFilter !== "all" &&
        row.gateway !== gatewayFilter
      ) {
        return false;
      }

      if (!needle) return true;

      return [
        row.gateway,
        row.status,
        row.eventType,
        row.providerEventId,
        row.providerPaymentId,
        row.error,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [gatewayFilter, search, webhooks]);

  const filteredReconciliations =
    React.useMemo(() => {
      const needle =
        search.trim().toLowerCase();

      return reconciliations.filter((row) => {
        if (
          gatewayFilter !== "all" &&
          row.gateway !== gatewayFilter
        ) {
          return false;
        }

        if (!needle) return true;

        return [
          row.gateway,
          row.status,
          row.paymentId,
          row.providerPaymentId,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
    }, [
      gatewayFilter,
      reconciliations,
      search,
    ]);

  const resetFilters = () => {
    setSearch("");
    setGatewayFilter("all");
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main
      dir={dir}
      className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <Badge
              variant="outline"
              className="mb-3 rounded-full bg-background"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t.badge}
            </Badge>

            <h1 className="text-3xl font-bold tracking-tight">
              {t.title}
            </h1>

            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t.subtitle}
            </p>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t.noSecret}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() =>
                void loadData({ silent: true })
              }
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}

              {t.refresh}
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-9"
            >
              <Link href="/system/integrations/api-keys">
                <KeyRound className="h-4 w-4" />
                {t.apiKeys}
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-9"
            >
              <Link href="/system/integrations/api-contracts">
                <FileKey2 className="h-4 w-4" />
                {t.apiContracts}
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-9"
            >
              <Link href="/system/whatsapp">
                <MessageCircle className="h-4 w-4" />
                {t.whatsapp}
              </Link>
            </Button>

            <Button
              asChild
              className="h-9"
            >
              <Link href="/system/payments">
                <PlugZap className="h-4 w-4" />
                {t.payments}
              </Link>
            </Button>
          </div>
        </header>

        {errors.length ? (
          <Card className="border-amber-200 bg-amber-50 shadow-none">
            <CardContent className="flex items-start gap-3 p-4 text-amber-900">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {t.loadError}
                </p>

                <p className="mt-1 text-sm">
                  {t.partial}
                </p>

                <div className="mt-2 space-y-1 text-xs">
                  {errors.map((item) => (
                    <p key={item}>
                      • {item}
                    </p>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void loadData({ silent: true })
                }
              >
                {t.tryAgain}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">
              {t.gatewaysTitle}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {t.gatewaysDesc}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {gateways.length ? (
              gateways.map((gateway) => (
                <Card
                  key={gateway.gateway}
                  className="rounded-xl border bg-card shadow-none"
                >
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">
                          {gateway.gateway}
                        </CardTitle>

                        <CardDescription className="mt-1">
                          {gateway.configured
                            ? t.providerConfigured
                            : t.providerNotConfigured}
                        </CardDescription>
                      </div>

                      {gateway.ready ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-amber-600" />
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap gap-2">
                      <StateBadge
                        value={
                          gateway.configured
                            ? t.configured
                            : t.notConfigured
                        }
                      />

                      <StateBadge
                        value={
                          gateway.ready
                            ? t.ready
                            : t.notReady
                        }
                      />

                      {gateway.environment !== "—" ? (
                        <Badge
                          variant="outline"
                          className="rounded-full"
                        >
                          {t.environment}:{" "}
                          {gateway.environment}
                        </Badge>
                      ) : null}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">
                        {t.checks}
                      </p>

                      <div className="space-y-2">
                        {gateway.checks.length ? (
                          gateway.checks.map(
                            (check, index) => (
                              <div
                                key={`${check.name}-${index}`}
                                className="flex items-start justify-between gap-3 rounded-lg border bg-muted/10 px-3 py-2.5"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {check.name}
                                  </p>

                                  {check.message ? (
                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                      {check.message}
                                    </p>
                                  ) : null}

                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    {check.required
                                      ? t.required
                                      : t.optional}
                                  </p>
                                </div>

                                {check.configured ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                                )}
                              </div>
                            ),
                          )
                        ) : (
                          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            {t.none}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="lg:col-span-3 rounded-xl border border-dashed shadow-none">
                <CardContent className="flex min-h-44 items-center justify-center text-sm text-muted-foreground">
                  {t.none}
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title={t.totalWebhook}
            value={summary.webhookTotal}
            icon={Webhook}
          />

          <SummaryCard
            title={t.failedWebhook}
            value={summary.webhookFailed}
            icon={XCircle}
          />

          <SummaryCard
            title={t.pendingWebhook}
            value={summary.webhookPending}
            icon={AlertTriangle}
          />

          <SummaryCard
            title={t.totalReconciliation}
            value={summary.reconciliationTotal}
            icon={Workflow}
          />

          <SummaryCard
            title={t.mismatches}
            value={summary.reconciliationMismatch}
            icon={CircleSlash2}
          />
        </section>

        <Card className="rounded-xl shadow-none">
          <CardHeader className="border-b">
            <CardTitle>
              {t.operational}
            </CardTitle>

            <CardDescription>
              {t.webhookDesc} {t.reconciliationDesc}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder={t.search}
                  className="h-10 ps-9"
                />
              </div>

              <Select
                value={gatewayFilter}
                onValueChange={(value) =>
                  setGatewayFilter(
                    value as GatewayFilter,
                  )
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    {t.all}
                  </SelectItem>

                  <SelectItem value="MOYASAR">
                    MOYASAR
                  </SelectItem>

                  <SelectItem value="TAMARA">
                    TAMARA
                  </SelectItem>

                  <SelectItem value="TABBY">
                    TABBY
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={resetFilters}
              >
                <RotateCcw className="h-4 w-4" />
                {t.all}
              </Button>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="rounded-xl border shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Webhook className="h-4 w-4" />
                    {t.webhookTitle}
                  </CardTitle>

                  <CardDescription>
                    {t.webhookDesc}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="overflow-hidden rounded-lg border">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[760px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              {t.gateway}
                            </TableHead>
                            <TableHead>
                              {t.status}
                            </TableHead>
                            <TableHead>
                              {t.event}
                            </TableHead>
                            <TableHead>
                              {t.providerEvent}
                            </TableHead>
                            <TableHead>
                              {t.createdAt}
                            </TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {filteredWebhooks.length ? (
                            filteredWebhooks.map(
                              (row) => (
                                <TableRow key={row.id}>
                                  <TableCell className="font-medium">
                                    {row.gateway}
                                  </TableCell>

                                  <TableCell>
                                    <StateBadge
                                      value={row.status}
                                    />
                                  </TableCell>

                                  <TableCell className="max-w-[180px] truncate">
                                    {row.eventType}
                                  </TableCell>

                                  <TableCell
                                    dir="ltr"
                                    className="max-w-[180px] truncate font-mono text-xs"
                                  >
                                    {row.providerEventId}
                                  </TableCell>

                                  <TableCell
                                    dir="ltr"
                                    className="whitespace-nowrap text-xs tabular-nums"
                                  >
                                    {formatDateTime(
                                      row.createdAt,
                                    )}
                                  </TableCell>
                                </TableRow>
                              ),
                            )
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="h-36 text-center text-muted-foreground"
                              >
                                {t.noWebhook}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Workflow className="h-4 w-4" />
                    {t.reconciliationTitle}
                  </CardTitle>

                  <CardDescription>
                    {t.reconciliationDesc}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="overflow-hidden rounded-lg border">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[720px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              {t.gateway}
                            </TableHead>
                            <TableHead>
                              {t.status}
                            </TableHead>
                            <TableHead>
                              {t.payment}
                            </TableHead>
                            <TableHead>
                              {t.mismatchCount}
                            </TableHead>
                            <TableHead>
                              {t.createdAt}
                            </TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {filteredReconciliations.length ? (
                            filteredReconciliations.map(
                              (row) => (
                                <TableRow key={row.id}>
                                  <TableCell className="font-medium">
                                    {row.gateway}
                                  </TableCell>

                                  <TableCell>
                                    <StateBadge
                                      value={row.status}
                                    />
                                  </TableCell>

                                  <TableCell
                                    dir="ltr"
                                    className="font-mono text-xs"
                                  >
                                    #{row.paymentId}
                                  </TableCell>

                                  <TableCell className="tabular-nums">
                                    {row.mismatchCount}
                                  </TableCell>

                                  <TableCell
                                    dir="ltr"
                                    className="whitespace-nowrap text-xs tabular-nums"
                                  >
                                    {formatDateTime(
                                      row.createdAt,
                                    )}
                                  </TableCell>
                                </TableRow>
                              ),
                            )
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="h-36 text-center text-muted-foreground"
                              >
                                {t.noReconciliation}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-emerald-200 bg-emerald-50/60 shadow-none">
          <CardContent className="flex items-start gap-3 p-5 text-emerald-900">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                {t.credentialsSafety}
              </p>

              <p className="mt-1 text-sm leading-6">
                {t.credentialsSafetyDesc}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
