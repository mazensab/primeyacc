"use client";

/* ============================================================
   Mhamcloud — Phase 34B System Platform Payments Center
   ------------------------------------------------------------
   Source of truth:
   GET /api/system/subscription-payments/
   GET /api/system/subscription-payments/{id}/
   GET /api/system/subscription-payments/{id}/events/
   GET /api/system/subscription-payments/{id}/reconciliations/
   GET /api/system/subscription-payments/webhook-events/
   GET /api/system/subscription-payments/gateway-readiness/

   Operational endpoints remain backend-authoritative.
   No company treasury/payment API is used here.
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowUpDown,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Copy,
  CreditCard,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  Gauge,
  Hash,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

export type PlatformPaymentsMode =
  | "overview"
  | "list"
  | "detail"
  | "reports";

type Locale = "ar" | "en";
type Row = Record<string, unknown>;

type AllowedActions = {
  confirm: boolean;
  fail: boolean;
  cancel: boolean;
  void: boolean;
  refund: boolean;
  financial_adjustment: boolean;
};

type Payment = {
  id: string;
  reference: string;
  attempt: number;
  status: string;
  gateway: string;
  method: string;
  gatewayPaymentId: string;
  transactionReference: string;
  billingReference: string;
  amount: string;
  currency: string;
  failureCode: string;
  failureMessage: string;
  cancellationReason: string;

  initiatedAt: string | null;
  processingAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;

  companyId: string;
  companyName: string;
  companyCode: string;

  subscriptionId: string;
  subscriptionStatus: string;
  planName: string;

  invoiceId: string;
  invoiceNumber: string;
  receiptId: string;
  receiptNumber: string;

  allowed: AllowedActions;

  events: Row[];
  financial: Row;
};

type ActionName =
  | "confirm"
  | "fail"
  | "cancel"
  | "void"
  | "verify"
  | "reconcile"
  | "checkout";

const API = "/api/system/subscription-payments/";

const dictionaries = {
  ar: {
    badge: "إدارة المنصة",
    title: "مدفوعات المنصة",
    overviewDesc:
      "مركز عمليات دفع اشتراكات Mhamcloud الحقيقي، مع البوابات والمراجع والتسوية والأحداث التشغيلية.",
    listTitle: "قائمة مدفوعات المنصة",
    listDesc:
      "سجل محاولات دفع اشتراكات المنصة مع الشركة والاشتراك والبوابة والحالة والمراجع.",
    reportsTitle: "تقارير مدفوعات المنصة",
    reportsDesc:
      "تحليل سجل عمليات الدفع حسب الحالة والبوابة وطريقة الدفع والقيمة.",
    detailTitle: "تفاصيل عملية الدفع",
    detailDesc:
      "التفاصيل التشغيلية الكاملة للعملية مع الأحداث والتسوية والروابط المالية الآمنة.",

    refresh: "تحديث",
    list: "القائمة",
    reports: "التقارير",
    dashboard: "لوحة النظام",
    subscriptions: "الاشتراكات",
    export: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reset: "إعادة ضبط",
    open: "فتح",
    all: "الكل",
    from: "من",
    to: "إلى",

    total: "إجمالي العمليات",
    paid: "مدفوعة",
    pending: "قيد المعالجة",
    failed: "فاشلة / ملغاة",
    collected: "إجمالي المدفوع",

    search:
      "ابحث بالمرجع أو الشركة أو مرجع المزود أو العملية أو الفوترة...",
    status: "الحالة",
    gateway: "البوابة",
    company: "الشركة",
    paymentReference: "مرجع الدفع",
    attempt: "المحاولة",
    method: "طريقة الدفع",
    amount: "المبلغ",
    transactionReference: "مرجع العملية",
    providerReference: "مرجع المزود",
    billingReference: "مرجع الفوترة",
    createdAt: "تاريخ الإنشاء",
    paidAt: "تاريخ الدفع",
    actions: "الإجراءات",

    newest: "الأحدث",
    oldest: "الأقدم",
    referenceSort: "المرجع",
    companySort: "الشركة",

    noData: "لا توجد عمليات دفع منصة.",
    noResults: "لا توجد نتائج مطابقة للفلاتر الحالية.",
    loadError: "تعذر تحميل مدفوعات المنصة.",
    retry: "إعادة المحاولة",
    refreshed: "تم تحديث مدفوعات المنصة.",

    identity: "هوية عملية الدفع",
    paymentInfo: "بيانات الدفع",
    links: "الروابط المرتبطة",
    provider: "البوابة والمزود",
    lifecycle: "دورة حياة الدفع",
    events: "أحداث عملية الدفع",
    reconciliation: "سجل التسوية",
    webhooks: "أحداث Webhook",
    readiness: "جاهزية البوابات",
    operational: "الإجراءات التشغيلية",
    safePayload:
      "المعروض هنا هو فقط البيانات التي أعادها عقد Backend المخصص للواجهة.",

    subscription: "الاشتراك",
    invoice: "الفاتورة",
    receipt: "الإيصال",
    none: "غير متوفر",
    failure: "سبب الفشل",
    cancellation: "سبب الإلغاء",

    confirm: "تأكيد الدفع",
    fail: "تسجيل فشل",
    cancel: "إلغاء المحاولة",
    void: "Void لدى المزود",
    verify: "التحقق من المزود",
    reconcile: "تشغيل التسوية",
    checkout: "بدء / إعادة Checkout",
    reason: "السبب",
    reasonPlaceholder: "اكتب سبب العملية عند الحاجة...",
    confirmAction: "تأكيد الإجراء",
    back: "تراجع",
    processing: "جاري التنفيذ...",
    actionDone: "تم تنفيذ الإجراء بنجاح.",
    copy: "نسخ",
    copied: "تم النسخ.",

    webhookReprocess: "إعادة معالجة Webhook",
    reprocessed: "تمت إعادة معالجة Webhook.",
    reconciled: "تم تشغيل التسوية.",

    distributionsStatus: "توزيع الحالات",
    distributionsGateway: "توزيع البوابات",
    distributionsMethod: "توزيع طرق الدفع",
  },
  en: {
    badge: "Platform management",
    title: "Platform payments",
    overviewDesc:
      "Mhamcloud subscription payment operations center with gateways, references, reconciliation, and operational history.",
    listTitle: "Platform payments list",
    listDesc:
      "Platform subscription payment attempts with company, subscription, gateway, status, and references.",
    reportsTitle: "Platform payments reports",
    reportsDesc:
      "Analyze payment operations by status, gateway, payment method, and value.",
    detailTitle: "Payment details",
    detailDesc:
      "Full operational payment detail with events, reconciliation, and safe financial links.",

    refresh: "Refresh",
    list: "List",
    reports: "Reports",
    dashboard: "System dashboard",
    subscriptions: "Subscriptions",
    export: "Export Excel",
    print: "Print",
    pdf: "PDF",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reset: "Reset",
    open: "Open",
    all: "All",
    from: "From",
    to: "To",

    total: "Total payments",
    paid: "Paid",
    pending: "Processing",
    failed: "Failed / cancelled",
    collected: "Collected amount",

    search:
      "Search reference, company, provider id, transaction, or billing reference...",
    status: "Status",
    gateway: "Gateway",
    company: "Company",
    paymentReference: "Payment reference",
    attempt: "Attempt",
    method: "Payment method",
    amount: "Amount",
    transactionReference: "Transaction reference",
    providerReference: "Provider reference",
    billingReference: "Billing reference",
    createdAt: "Created at",
    paidAt: "Paid at",
    actions: "Actions",

    newest: "Newest",
    oldest: "Oldest",
    referenceSort: "Reference",
    companySort: "Company",

    noData: "No platform payments.",
    noResults: "No payments match the current filters.",
    loadError: "Could not load platform payments.",
    retry: "Try again",
    refreshed: "Platform payments refreshed.",

    identity: "Payment identity",
    paymentInfo: "Payment information",
    links: "Linked records",
    provider: "Gateway / provider",
    lifecycle: "Payment lifecycle",
    events: "Payment events",
    reconciliation: "Reconciliation history",
    webhooks: "Webhook events",
    readiness: "Gateway readiness",
    operational: "Operational actions",
    safePayload:
      "Only data returned by the frontend-safe backend contract is displayed.",

    subscription: "Subscription",
    invoice: "Invoice",
    receipt: "Receipt",
    none: "Not available",
    failure: "Failure",
    cancellation: "Cancellation",

    confirm: "Confirm payment",
    fail: "Mark failed",
    cancel: "Cancel attempt",
    void: "Provider void",
    verify: "Verify provider",
    reconcile: "Run reconciliation",
    checkout: "Start / retry checkout",
    reason: "Reason",
    reasonPlaceholder: "Enter a reason when required...",
    confirmAction: "Confirm action",
    back: "Back",
    processing: "Processing...",
    actionDone: "Action completed successfully.",
    copy: "Copy",
    copied: "Copied.",

    webhookReprocess: "Reprocess webhook",
    reprocessed: "Webhook reprocessed.",
    reconciled: "Reconciliation executed.",

    distributionsStatus: "Status distribution",
    distributionsGateway: "Gateway distribution",
    distributionsMethod: "Payment method distribution",
  },
} as const;

function isRow(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function row(value: unknown): Row {
  return isRow(value) ? value : {};
}

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function numeric(value: unknown, fallback = 0) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown) {
  return value === true || value === 1 || value === "true";
}

function getLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function apiBase() {
  const base = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");

  return base.endsWith("/api") ? base.slice(0, -4) : base;
}

function apiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${apiBase()}${path}${query ? `?${query}` : ""}`;
}

function cookie(name: string) {
  if (typeof document === "undefined") return "";
  const found = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
}

async function request(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: Row;
    params?: URLSearchParams;
  } = {},
) {
  const method = options.method || "GET";
  const csrf = cookie("csrftoken");

  const response = await fetch(apiUrl(path, options.params), {
    method,
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(method === "POST"
        ? {
            "Content-Type": "application/json",
            ...(csrf ? { "X-CSRFToken": csrf } : {}),
          }
        : {}),
    },
    ...(method === "POST"
      ? { body: JSON.stringify(options.body || {}) }
      : {}),
  });

  const raw = await response.text();
  let payload: unknown = {};

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { message: raw };
    }
  }

  const root = row(payload);

  if (!response.ok || root.ok === false) {
    const errors = row(root.errors);
    const first = Object.values(errors)[0];

    const message =
      text(root.message) ||
      text(root.detail) ||
      (Array.isArray(first) ? text(first[0]) : text(first)) ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload;
}

function data(payload: unknown) {
  return row(row(payload).data);
}

function arrayFrom(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function paymentRows(payload: unknown): unknown[] {
  const root = row(payload);
  const d = data(payload);

  return (
    arrayFrom(d.results).length
      ? arrayFrom(d.results)
      : arrayFrom(root.results)
  );
}

function normalizePayment(value: unknown): Payment {
  const source = row(value);
  const company = row(source.company);
  const subscription = row(source.subscription);
  const plan = row(subscription.plan ?? source.plan);
  const invoice = row(source.invoice);
  const receipt = row(source.receipt);
  const allowed = row(source.allowed_actions);

  return {
    id: text(source.id),
    reference: text(source.payment_reference, "—"),
    attempt: numeric(source.attempt_number),
    status: text(source.status, "UNKNOWN").toUpperCase(),
    gateway: text(source.gateway, "—").toUpperCase(),
    method: text(source.payment_method, "—").toUpperCase(),
    gatewayPaymentId: text(source.gateway_payment_id),
    transactionReference: text(source.transaction_reference),
    billingReference: text(source.billing_reference),
    amount: text(source.amount, "0.00"),
    currency: text(source.currency_code, "SAR").toUpperCase(),
    failureCode: text(source.failure_code),
    failureMessage: text(source.failure_message),
    cancellationReason: text(source.cancellation_reason),

    initiatedAt: text(source.initiated_at) || null,
    processingAt: text(source.processing_at) || null,
    paidAt: text(source.paid_at) || null,
    failedAt: text(source.failed_at) || null,
    cancelledAt: text(source.cancelled_at) || null,
    createdAt: text(source.created_at) || null,
    updatedAt: text(source.updated_at) || null,

    companyId: text(company.id ?? source.company_id),
    companyName: text(
      company.name ??
        company.display_name ??
        source.company_name,
      "—",
    ),
    companyCode: text(
      company.company_code ??
        company.code ??
        source.company_code,
    ),

    subscriptionId: text(subscription.id ?? source.subscription_id),
    subscriptionStatus: text(subscription.status),
    planName: text(
      plan.name ??
        plan.title ??
        subscription.plan_name,
      "—",
    ),

    invoiceId: text(invoice.id ?? source.invoice_id),
    invoiceNumber: text(
      invoice.document_number ??
        invoice.number,
    ),
    receiptId: text(receipt.id ?? source.receipt_id),
    receiptNumber: text(
      receipt.document_number ??
        receipt.number,
    ),

    allowed: {
      confirm: bool(allowed.confirm),
      fail: bool(allowed.fail),
      cancel: bool(allowed.cancel),
      void: bool(allowed.void),
      refund: bool(allowed.refund),
      financial_adjustment: bool(allowed.financial_adjustment),
    },

    events: arrayFrom(source.events).filter(isRow),
    financial: row(source.financial),
  };
}

async function fetchAllPayments() {
  const rows: Payment[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (rows.length < total && page <= 100) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: "100",
    });

    const payload = await request(API, { params });
    const d = data(payload);
    const pageRows = paymentRows(payload).map(normalizePayment);

    rows.push(...pageRows);
    total = numeric(d.count ?? row(payload).count, rows.length);

    if (!pageRows.length || rows.length >= total) break;
    page += 1;
  }

  return rows;
}

async function fetchPaymentDetail(id: string) {
  const payload = await request(
    `${API}${encodeURIComponent(id)}/`,
  );

  const payment = data(payload).payment;
  return normalizePayment(payment);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value.replace("T", " ").slice(0, 16);
  }

  return parsed.toISOString().replace("T", " ").slice(0, 16);
}

function dateValue(value: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isoDate(value: Date | undefined) {
  if (!value) return "";
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIsoDate(value: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function statusClass(status: string) {
  const value = status.toUpperCase();

  if (value === "PAID") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["PENDING", "PROCESSING"].includes(value)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["FAILED", "CANCELLED", "CANCELED", "VOIDED"].includes(value)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StatusBadge({ value }: { value: string }) {
  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-1 text-xs ${statusClass(value)}`}
    >
      {value || "UNKNOWN"}
    </Badge>
  );
}

function Money({
  amount,
  currency,
}: {
  amount: string;
  currency: string;
}) {
  const number = Number.parseFloat(amount || "0");
  const formatted = Number.isFinite(number)
    ? number.toFixed(2)
    : "0.00";

  if (currency !== "SAR") {
    return (
      <span dir="ltr" className="tabular-nums">
        {formatted} {currency}
      </span>
    );
  }

  return (
    <span
      dir="ltr"
      className="inline-flex items-center gap-1 font-medium tabular-nums"
    >
      <Image
        src="/currency/sar.svg"
        alt="SAR"
        width={15}
        height={15}
        className="h-[15px] w-[15px]"
      />
      {formatted}
    </span>
  );
}

function Kpi({
  title,
  value,
  children,
}: {
  title: string;
  value: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="mt-2 text-2xl tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      {children ? (
        <CardContent className="pt-0 text-xs text-muted-foreground">
          {children}
        </CardContent>
      ) : null}
    </Card>
  );
}

function Header({
  mode,
  locale,
  onRefresh,
  refreshing,
}: {
  mode: PlatformPaymentsMode;
  locale: Locale;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const t = dictionaries[locale];

  const title =
    mode === "list"
      ? t.listTitle
      : mode === "reports"
        ? t.reportsTitle
        : mode === "detail"
          ? t.detailTitle
          : t.title;

  const desc =
    mode === "list"
      ? t.listDesc
      : mode === "reports"
        ? t.reportsDesc
        : mode === "detail"
          ? t.detailDesc
          : t.overviewDesc;

  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="relative p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />

        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t.badge}
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              {desc}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-xl bg-background"
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t.refresh}
            </Button>

            <Button asChild variant="outline" className="rounded-xl bg-background">
              <Link href="/system/platform-payments/list">
                <ListChecks className="h-4 w-4" />
                {t.list}
              </Link>
            </Button>

            <Button asChild variant="outline" className="rounded-xl bg-background">
              <Link href="/system/platform-payments/reports">
                <FileBarChart2 className="h-4 w-4" />
                {t.reports}
              </Link>
            </Button>

            <Button asChild variant="outline" className="rounded-xl bg-background">
              <Link href="/system/subscriptions">
                <CreditCard className="h-4 w-4" />
                {t.subscriptions}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}

function ErrorCard({
  message,
  retry,
  locale,
}: {
  message: string;
  retry: () => void;
  locale: Locale;
}) {
  const t = dictionaries[locale];

  return (
    <Card className="mx-auto max-w-3xl rounded-3xl border-destructive/30">
      <CardHeader className="text-center">
        <TriangleAlert className="mx-auto h-8 w-8 text-destructive" />
        <CardTitle>{t.loadError}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={retry}>
          <RefreshCw className="h-4 w-4" />
          {t.retry}
        </Button>
      </CardContent>
    </Card>
  );
}

function Distribution({
  title,
  values,
}: {
  title: string;
  values: Array<[string, number]>;
}) {
  const total = values.reduce((sum, [, count]) => sum + count, 0) || 1;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {values.length ? (
          values.slice(0, 10).map(([label, count]) => (
            <div key={label} className="rounded-xl border p-3">
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate font-medium">{label || "—"}</span>
                <span className="tabular-nums text-muted-foreground">
                  {count}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(3, (count / total) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </CardContent>
    </Card>
  );
}

function counts(
  payments: Payment[],
  pick: (payment: Payment) => string,
) {
  const result = new Map<string, number>();

  payments.forEach((payment) => {
    const key = pick(payment) || "—";
    result.set(key, (result.get(key) || 0) + 1);
  });

  return [...result.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

function PaymentTable({
  rows,
  locale,
}: {
  rows: Payment[];
  locale: Locale;
}) {
  const t = dictionaries[locale];

  return (
    <div className="overflow-hidden rounded-2xl border bg-background">
      <div className="overflow-x-auto">
        <Table className="min-w-[1150px]">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>{t.company}</TableHead>
              <TableHead>{t.paymentReference}</TableHead>
              <TableHead>{t.gateway}</TableHead>
              <TableHead>{t.method}</TableHead>
              <TableHead>{t.amount}</TableHead>
              <TableHead>{t.providerReference}</TableHead>
              <TableHead>{t.status}</TableHead>
              <TableHead>{t.createdAt}</TableHead>
              <TableHead className="text-center">{t.open}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <div className="max-w-[220px]">
                    <div className="truncate font-semibold">
                      {payment.companyName}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {payment.companyCode || `#${payment.companyId || "—"}`}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="max-w-[180px]">
                    <div className="truncate font-mono text-xs">
                      {payment.reference}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      #{payment.attempt}
                    </div>
                  </div>
                </TableCell>

                <TableCell>{payment.gateway}</TableCell>
                <TableCell>{payment.method}</TableCell>

                <TableCell>
                  <Money
                    amount={payment.amount}
                    currency={payment.currency}
                  />
                </TableCell>

                <TableCell>
                  <span className="block max-w-[180px] truncate font-mono text-xs">
                    {payment.gatewayPaymentId || "—"}
                  </span>
                </TableCell>

                <TableCell>
                  <StatusBadge value={payment.status} />
                </TableCell>

                <TableCell>
                  <span dir="ltr" className="text-xs tabular-nums">
                    {formatDate(payment.createdAt)}
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/system/platform-payments/${payment.id}`}>
                      {t.open}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Register({
  payments,
  mode,
  locale,
}: {
  payments: Payment[];
  mode: "overview" | "list" | "reports";
  locale: Locale;
}) {
  const t = dictionaries[locale];

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [gateway, setGateway] = React.useState("all");
  const [company, setCompany] = React.useState("all");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [sort, setSort] = React.useState("newest");

  const statuses = React.useMemo(
    () => [...new Set(payments.map((item) => item.status))].sort(),
    [payments],
  );
  const gateways = React.useMemo(
    () => [...new Set(payments.map((item) => item.gateway))].sort(),
    [payments],
  );
  const companies = React.useMemo(
    () =>
      [...new Set(payments.map((item) => item.companyName))]
        .filter(Boolean)
        .sort(),
    [payments],
  );

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();

    const result = payments.filter((item) => {
      const haystack = [
        item.reference,
        item.companyName,
        item.companyCode,
        item.gateway,
        item.method,
        item.gatewayPaymentId,
        item.transactionReference,
        item.billingReference,
        item.subscriptionId,
        item.invoiceNumber,
        item.receiptNumber,
      ]
        .join(" ")
        .toLowerCase();

      if (needle && !haystack.includes(needle)) return false;
      if (status !== "all" && item.status !== status) return false;
      if (gateway !== "all" && item.gateway !== gateway) return false;
      if (company !== "all" && item.companyName !== company) return false;

      const date = item.createdAt?.slice(0, 10) || "";
      if (fromDate && date && date < fromDate) return false;
      if (toDate && date && date > toDate) return false;

      return true;
    });

    return [...result].sort((a, b) => {
      if (sort === "oldest") return dateValue(a.createdAt) - dateValue(b.createdAt);
      if (sort === "reference") return a.reference.localeCompare(b.reference);
      if (sort === "company") return a.companyName.localeCompare(b.companyName);
      return dateValue(b.createdAt) - dateValue(a.createdAt);
    });
  }, [
    company,
    fromDate,
    gateway,
    payments,
    search,
    sort,
    status,
    toDate,
  ]);

  const displayed =
    mode === "overview" ? filtered.slice(0, 8) : filtered;

  const stats = React.useMemo(() => {
    const paidRows = payments.filter((item) => item.status === "PAID");
    return {
      total: payments.length,
      paid: paidRows.length,
      pending: payments.filter((item) =>
        ["PENDING", "PROCESSING"].includes(item.status),
      ).length,
      failed: payments.filter((item) =>
        ["FAILED", "CANCELLED", "CANCELED", "VOIDED"].includes(item.status),
      ).length,
      collected: paidRows.reduce(
        (sum, item) => sum + numeric(item.amount),
        0,
      ),
    };
  }, [payments]);

  function reset() {
    setSearch("");
    setStatus("all");
    setGateway("all");
    setCompany("all");
    setFromDate("");
    setToDate("");
    setSort("newest");
  }

  function print() {
    window.print();
  }

  function exportExcel() {
    if (!filtered.length) return;

    const esc = (value: unknown) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

    const rows = filtered
      .map(
        (item) => `
<tr>
<td>${esc(item.companyName)}</td>
<td>${esc(item.reference)}</td>
<td>${esc(item.gateway)}</td>
<td>${esc(item.method)}</td>
<td>${esc(item.amount)}</td>
<td>${esc(item.currency)}</td>
<td>${esc(item.gatewayPaymentId)}</td>
<td>${esc(item.transactionReference)}</td>
<td>${esc(item.status)}</td>
<td>${esc(formatDate(item.createdAt))}</td>
</tr>`,
      )
      .join("");

    const html = `<table border="1">
<thead>
<tr>
<th>Company</th><th>Reference</th><th>Gateway</th><th>Method</th>
<th>Amount</th><th>Currency</th><th>Provider ID</th>
<th>Transaction</th><th>Status</th><th>Created</th>
</tr>
</thead>
<tbody>${rows}</tbody>
</table>`;

    const blob = new Blob([`\ufeff${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mhamcloud-platform-payments-${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi title={t.total} value={stats.total} />
        <Kpi title={t.paid} value={stats.paid} />
        <Kpi title={t.pending} value={stats.pending} />
        <Kpi
          title={t.collected}
          value={
            <Money
              amount={String(stats.collected)}
              currency="SAR"
            />
          }
        />
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.search}
                className="h-10 rounded-xl ps-9"
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 rounded-xl xl:w-[150px]">
                <SelectValue placeholder={t.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                {statuses.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={gateway} onValueChange={setGateway}>
              <SelectTrigger className="h-10 rounded-xl xl:w-[150px]">
                <SelectValue placeholder={t.gateway} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                {gateways.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger className="h-10 rounded-xl xl:w-[180px]">
                <SelectValue placeholder={t.company} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                {companies.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode !== "overview" ? (
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 rounded-xl">
                    <CalendarDays className="h-4 w-4" />
                    {t.from}: {fromDate || "—"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={parseIsoDate(fromDate)}
                    onSelect={(date) => setFromDate(isoDate(date))}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 rounded-xl">
                    <CalendarDays className="h-4 w-4" />
                    {t.to}: {toDate || "—"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={parseIsoDate(toDate)}
                    onSelect={(date) => setToDate(isoDate(date))}
                  />
                </PopoverContent>
              </Popover>

              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-10 w-[160px] rounded-xl">
                  <ArrowUpDown className="h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t.newest}</SelectItem>
                  <SelectItem value="oldest">{t.oldest}</SelectItem>
                  <SelectItem value="reference">{t.referenceSort}</SelectItem>
                  <SelectItem value="company">{t.companySort}</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={reset} className="h-10 rounded-xl">
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>

              <Button
                variant="outline"
                onClick={exportExcel}
                className="h-10 rounded-xl"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {t.export}
              </Button>

              <Button variant="outline" onClick={print} className="h-10 rounded-xl">
                <Printer className="h-4 w-4" />
                {t.print}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {mode === "reports" ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Distribution
            title={t.distributionsStatus}
            values={counts(filtered, (item) => item.status)}
          />
          <Distribution
            title={t.distributionsGateway}
            values={counts(filtered, (item) => item.gateway)}
          />
          <Distribution
            title={t.distributionsMethod}
            values={counts(filtered, (item) => item.method)}
          />
        </div>
      ) : null}

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>
              {displayed.length} / {filtered.length}
            </CardDescription>
          </div>
          <Gauge className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {displayed.length ? (
            <PaymentTable rows={displayed} locale={locale} />
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Search className="mx-auto mb-3 h-7 w-7" />
              {payments.length ? t.noResults : t.noData}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function KeyValue({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 break-words text-sm font-medium">
        {children}
      </div>
    </div>
  );
}

function Detail({
  locale,
  payment,
  reload,
}: {
  locale: Locale;
  payment: Payment;
  reload: () => Promise<void>;
}) {
  const t = dictionaries[locale];

  const [events, setEvents] = React.useState<Row[]>(payment.events);
  const [reconciliations, setReconciliations] = React.useState<Row[]>([]);
  const [webhooks, setWebhooks] = React.useState<Row[]>([]);
  const [readiness, setReadiness] = React.useState<Row[]>([]);
  const [canWrite, setCanWrite] = React.useState(false);
  const [operationLoading, setOperationLoading] = React.useState(false);

  const [pendingAction, setPendingAction] =
    React.useState<ActionName | null>(null);
  const [reason, setReason] = React.useState("");

  const loadOperations = React.useCallback(async () => {
    const settled = await Promise.allSettled([
      request(`${API}${payment.id}/events/`),
      request(`${API}${payment.id}/reconciliations/`),
      request(`${API}webhook-events/`, {
        params: new URLSearchParams({
          payment_id: payment.id,
          page_size: "100",
        }),
      }),
      request(`${API}gateway-readiness/`),
      request("/api/auth/whoami/"),
    ]);

    if (settled[0].status === "fulfilled") {
      setEvents(
        arrayFrom(data(settled[0].value).events).filter(isRow),
      );
    }

    if (settled[1].status === "fulfilled") {
      const d = data(settled[1].value);
      setReconciliations(
        arrayFrom(d.results ?? d.reconciliations).filter(isRow),
      );
    }

    if (settled[2].status === "fulfilled") {
      const d = data(settled[2].value);
      setWebhooks(
        arrayFrom(d.results ?? d.events).filter(isRow),
      );
    }

    if (settled[3].status === "fulfilled") {
      const d = data(settled[3].value);
      setReadiness(arrayFrom(d.gateways).filter(isRow));
    }

    if (settled[4].status === "fulfilled") {
      const root = row(settled[4].value);
      const d = data(settled[4].value);
      const permissions = row(
        d.permissions ??
          root.permissions ??
          d.profile_permissions ??
          root.profile_permissions,
      );

      const codes = [
        ...arrayFrom(permissions.codes),
        ...arrayFrom(d.permission_codes ?? root.permission_codes),
      ].map((value) => text(value));

      const isSuper =
        bool(permissions.is_superuser) ||
        bool(d.is_superuser) ||
        bool(root.is_superuser);

      setCanWrite(
        isSuper || codes.includes("system.subscriptions.update"),
      );
    }
  }, [payment.id]);

  React.useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

  const lifecycle = [
    ["CREATED", payment.createdAt],
    ["INITIATED", payment.initiatedAt],
    ["PROCESSING", payment.processingAt],
    ["PAID", payment.paidAt],
    ["FAILED", payment.failedAt],
    ["CANCELLED", payment.cancelledAt],
  ].filter(([, value]) => Boolean(value));

  const operationalActions = React.useMemo(() => {
    const actions: ActionName[] = [];

    if (!canWrite) return actions;

    if (payment.allowed.confirm) actions.push("confirm");
    if (payment.allowed.fail) actions.push("fail");
    if (payment.allowed.cancel) actions.push("cancel");
    if (payment.allowed.void) actions.push("void");

    if (
      payment.gateway &&
      payment.gateway !== "MANUAL" &&
      ["PENDING", "PROCESSING", "FAILED"].includes(payment.status)
    ) {
      actions.push("verify");
    }

    if (
      payment.gateway &&
      payment.gateway !== "MANUAL" &&
      payment.gatewayPaymentId
    ) {
      actions.push("reconcile");
    }

    if (
      payment.gateway &&
      payment.gateway !== "MANUAL" &&
      ["PENDING", "FAILED"].includes(payment.status)
    ) {
      actions.push("checkout");
    }

    return [...new Set(actions)];
  }, [canWrite, payment]);

  function actionLabel(action: ActionName) {
    return t[action];
  }

  async function executeAction() {
    if (!pendingAction || operationLoading) return;

    setOperationLoading(true);

    try {
      let body: Row = {};
      const endpoint = `${API}${payment.id}/${pendingAction}/`;

      if (pendingAction === "fail") {
        body = {
          failure_code: "SYSTEM_MANUAL_FAILURE",
          failure_message: reason.trim(),
        };
      } else if (
        pendingAction === "cancel" ||
        pendingAction === "void"
      ) {
        body = { reason: reason.trim() };
      } else if (pendingAction === "checkout") {
        body = {
          metadata: {
            source: "system_platform_payments_center",
          },
          description: `Mhamcloud platform payment ${payment.reference}`,
        };
      }

      await request(endpoint, {
        method: "POST",
        body,
      });

      toast.success(
        pendingAction === "reconcile"
          ? t.reconciled
          : t.actionDone,
      );

      setPendingAction(null);
      setReason("");

      await reload();
      await loadOperations();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.loadError,
      );
    } finally {
      setOperationLoading(false);
    }
  }

  async function copy(value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(t.copied);
  }

  async function reprocessWebhook(id: string) {
    if (!canWrite || !id) return;

    try {
      await request(`${API}webhook-events/${id}/reprocess/`, {
        method: "POST",
      });
      toast.success(t.reprocessed);
      await loadOperations();
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t.loadError,
      );
    }
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi title={t.paymentReference} value={payment.reference} />
        <Kpi
          title={t.status}
          value={<StatusBadge value={payment.status} />}
        />
        <Kpi title={t.gateway} value={payment.gateway} />
        <Kpi
          title={t.amount}
          value={
            <Money
              amount={payment.amount}
              currency={payment.currency}
            />
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.identity}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <KeyValue label={t.company}>
                <div className="flex items-center justify-between gap-2">
                  <span>{payment.companyName}</span>
                  {payment.companyId ? (
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/system/companies/${payment.companyId}`}>
                        {t.open}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </KeyValue>

              <KeyValue label={t.paymentReference}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">
                    {payment.reference}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void copy(payment.reference)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </KeyValue>

              <KeyValue label={t.attempt}>
                #{payment.attempt}
              </KeyValue>

              <KeyValue label={t.createdAt}>
                <span dir="ltr">{formatDate(payment.createdAt)}</span>
              </KeyValue>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.paymentInfo}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <KeyValue label={t.gateway}>{payment.gateway}</KeyValue>
              <KeyValue label={t.method}>{payment.method}</KeyValue>
              <KeyValue label={t.providerReference}>
                {payment.gatewayPaymentId || "—"}
              </KeyValue>
              <KeyValue label={t.transactionReference}>
                {payment.transactionReference || "—"}
              </KeyValue>
              <KeyValue label={t.billingReference}>
                {payment.billingReference || "—"}
              </KeyValue>
              <KeyValue label={t.amount}>
                <Money
                  amount={payment.amount}
                  currency={payment.currency}
                />
              </KeyValue>

              {payment.failureCode || payment.failureMessage ? (
                <KeyValue label={t.failure}>
                  {[payment.failureCode, payment.failureMessage]
                    .filter(Boolean)
                    .join(" — ")}
                </KeyValue>
              ) : null}

              {payment.cancellationReason ? (
                <KeyValue label={t.cancellation}>
                  {payment.cancellationReason}
                </KeyValue>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.lifecycle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lifecycle.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-2xl border p-4"
                >
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div>
                    <div className="font-medium">{label}</div>
                    <div
                      dir="ltr"
                      className="mt-1 text-xs text-muted-foreground"
                    >
                      {formatDate(value)}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.events}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.length ? (
                events.map((event, index) => {
                  const actor = row(event.actor);
                  return (
                    <div
                      key={text(event.id, String(index))}
                      className="rounded-2xl border p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold">
                          {text(event.event_type, "EVENT")}
                        </div>
                        <span
                          dir="ltr"
                          className="text-xs text-muted-foreground"
                        >
                          {formatDate(text(event.created_at) || null)}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-muted-foreground">
                        {text(event.from_status, "—")} →{" "}
                        {text(event.to_status, "—")}
                      </div>

                      {text(event.message) ? (
                        <p className="mt-2 text-sm">
                          {text(event.message)}
                        </p>
                      ) : null}

                      {text(actor.username ?? actor.email) ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {text(actor.username ?? actor.email)}
                        </p>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.reconciliation}</CardTitle>
              <CardDescription>{t.safePayload}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reconciliations.length ? (
                reconciliations.map((item, index) => (
                  <div
                    key={text(item.id, String(index))}
                    className="grid gap-3 rounded-2xl border p-4 md:grid-cols-3"
                  >
                    <KeyValue label={t.status}>
                      {text(item.status, "—")}
                    </KeyValue>
                    <KeyValue label={t.providerReference}>
                      {text(item.provider_payment_id, "—")}
                    </KeyValue>
                    <KeyValue label={t.gateway}>
                      {text(item.gateway, "—")}
                    </KeyValue>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.webhooks}</CardTitle>
              <CardDescription>{t.safePayload}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {webhooks.length ? (
                webhooks.map((item, index) => (
                  <div
                    key={text(item.id, String(index))}
                    className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-semibold">
                        {text(item.event_type, "Webhook")}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {text(item.gateway, "—")} ·{" "}
                        {text(item.status, "—")} ·{" "}
                        {text(item.provider_event_id, "—")}
                      </div>
                    </div>

                    {canWrite && text(item.id) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void reprocessWebhook(text(item.id))
                        }
                      >
                        <Webhook className="h-4 w-4" />
                        {t.webhookReprocess}
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.links}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {payment.subscriptionId ? (
                <Button
                  asChild
                  variant="outline"
                  className="justify-start"
                >
                  <Link
                    href={`/system/subscriptions/${payment.subscriptionId}`}
                  >
                    <CreditCard className="h-4 w-4" />
                    {t.subscription} #{payment.subscriptionId}
                  </Link>
                </Button>
              ) : null}

              {payment.invoiceId ? (
                <div className="rounded-xl border p-3 text-sm">
                  <div className="font-medium">
                    {t.invoice}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {payment.invoiceNumber || `#${payment.invoiceId}`}
                  </div>
                </div>
              ) : null}

              {payment.receiptId ? (
                <div className="rounded-xl border p-3 text-sm">
                  <div className="font-medium">
                    {t.receipt}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {payment.receiptNumber || `#${payment.receiptId}`}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.readiness}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {readiness.length ? (
                readiness.map((item, index) => (
                  <div
                    key={text(item.gateway, String(index))}
                    className="rounded-xl border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {text(item.gateway, "—")}
                      </span>
                      <Badge variant="outline">
                        {text(
                          item.status ??
                            item.readiness ??
                            (bool(item.ready) ? "READY" : "CHECK"),
                          "CHECK",
                        )}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle>{t.operational}</CardTitle>
              <CardDescription>
                Backend permissions and payment state remain authoritative.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-2">
              {operationalActions.length ? (
                operationalActions.map((action) => (
                  <Button
                    key={action}
                    variant={
                      ["cancel", "fail", "void"].includes(action)
                        ? "outline"
                        : "default"
                    }
                    className={
                      ["cancel", "fail", "void"].includes(action)
                        ? "justify-start border-rose-200 text-rose-700"
                        : "justify-start"
                    }
                    disabled={operationLoading}
                    onClick={() => {
                      setReason("");
                      setPendingAction(action);
                    }}
                  >
                    {operationLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    {actionLabel(action)}
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.none}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm xl:sticky xl:top-6">
            <CardContent className="grid gap-2 pt-6">
              <Button asChild variant="outline" className="justify-start">
                <Link href="/system/platform-payments/list">
                  <ListChecks className="h-4 w-4" />
                  {t.list}
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/system">
                  <LayoutDashboard className="h-4 w-4" />
                  {t.dashboard}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open && !operationLoading) {
            setPendingAction(null);
            setReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction ? actionLabel(pendingAction) : t.confirmAction}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.safePayload}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingAction &&
          ["fail", "cancel", "void"].includes(pendingAction) ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t.reason}</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t.reasonPlaceholder}
              />
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={operationLoading}>
              {t.back}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={
                pendingAction &&
                ["fail", "cancel", "void"].includes(pendingAction)
                  ? "destructive"
                  : "default"
              }
              disabled={operationLoading}
              onClick={(event) => {
                event.preventDefault();
                void executeAction();
              }}
            >
              {operationLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.processing}
                </>
              ) : (
                t.confirmAction
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PlatformPaymentsClient({
  mode,
}: {
  mode: PlatformPaymentsMode;
}) {
  const params = useParams();

  const paymentId = React.useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] || "" : text(raw);
  }, [params]);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [payment, setPayment] = React.useState<Payment | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const sync = () => {
      const next = getLocale();
      setLocale(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.body.dir = next === "ar" ? "rtl" : "ltr";
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("primey-locale-changed", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("primey-locale-changed", sync);
    };
  }, []);

  const load = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        if (mode === "detail") {
          if (!paymentId) throw new Error("Missing payment id.");
          const current = await fetchPaymentDetail(paymentId);
          setPayment(current);
        } else {
          setPayments(await fetchAllPayments());
        }

        if (silent) toast.success(dictionaries[locale].refreshed);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : dictionaries[locale].loadError;

        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [locale, mode, paymentId],
  );

  React.useEffect(() => {
    void load(false);
  }, [load]);

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <main
      dir={dir}
      className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="w-full space-y-6">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorCard
            message={error}
            retry={() => void load(true)}
            locale={locale}
          />
        ) : (
          <>
            <Header
              mode={mode}
              locale={locale}
              onRefresh={() => void load(true)}
              refreshing={refreshing}
            />

            {mode === "detail" ? (
              payment ? (
                <Detail
                  locale={locale}
                  payment={payment}
                  reload={async () => {
                    await load(true);
                  }}
                />
              ) : (
                <Card className="rounded-2xl">
                  <CardContent className="py-16 text-center text-muted-foreground">
                    <CircleAlert className="mx-auto mb-3 h-7 w-7" />
                    {dictionaries[locale].noData}
                  </CardContent>
                </Card>
              )
            ) : (
              <Register
                payments={payments}
                mode={mode}
                locale={locale}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
