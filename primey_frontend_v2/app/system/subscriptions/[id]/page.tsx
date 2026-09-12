"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  FileText,
  Hash,
  Layers3,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  registerBrandButtonClass,
  registerOutlineButtonClass,
} from "@/components/ui/data-register";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SystemMetricCard } from "@/components/ui/system-metric-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_PATHS } from "@/lib/api/endpoints";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import {
  createSystemBillingInvoice,
  createSystemBillingReceipt,
} from "@/lib/system-billing-document-actions";
import { openPrintReport } from "@/lib/print-report";
import {
  actionLabel,
  apiUrl,
  asRecord,
  billingCycleLabel,
  formatDate,
  formatDateTime,
  MoneyValue,
  numberValue,
  readSystemLocale,
  StatusBadge,
  statusLabel,
  text,
  type ApiRecord,
  type SystemLocale,
} from "@/lib/system-subscriptions";

type BillingCycle = "MONTHLY" | "YEARLY";
type ConfirmationAction = "suspend" | "reactivate" | "cancel";
type BillingConfirmationAction = "invoice" | "receipt";
type BusyAction =
  | "invoice"
  | "receipt"
  | "confirm"
  | "renew"
  | "changePlan"
  | ConfirmationAction
  | null;

type PlanOption = {
  id: string;
  name: string;
  code: string;
  monthlyPrice: string;
  yearlyPrice: string;
  active: boolean;
};

type SubscriptionDetail = {
  id: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  companyStatus: string;
  companyEmail: string;
  companyPhone: string;
  companyCity: string;
  planId: string;
  planName: string;
  planCode: string;
  planMonthlyPrice: string;
  planYearlyPrice: string;
  status: string;
  action: string;
  billingCycle: BillingCycle;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  isCurrent: boolean;
  isPendingPayment: boolean;
  price: string;
  discountAmount: string;
  amountBeforeTax: string;
  taxAmount: string;
  totalAmount: string;
  autoRenew: boolean;
  billingReference: string;
  paidAt: string;
  activatedAt: string;
  cancelledAt: string;
  suspendedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  canConfirmPayment: boolean;
  canRenew: boolean;
  canChangePlan: boolean;
  canCancel: boolean;
};

type HistoryRow = {
  id: string;
  planName: string;
  status: string;
  action: string;
  billingCycle: string;
  totalAmount: string;
  startDate: string;
  endDate: string;
};

const translations = {
  ar: {
    title: "تفاصيل الاشتراك",
    subtitle: "تفاصيل الاشتراك ودورة الحياة والقيمة والفوترة والإجراءات المرتبطة به.",
    back: "العودة للاشتراكات",
    refresh: "تحديث",
    print: "طباعة",
    subscriptionId: "معرف الاشتراك",
    status: "الحالة",
    plan: "الباقة",
    total: "الإجمالي",
    companyTitle: "الشركة",
    companyDesc: "الشركة المرتبطة بهذا الاشتراك.",
    subscriptionTitle: "بيانات الاشتراك",
    subscriptionDesc: "الحالة والدورة والتواريخ ومؤشرات دورة الحياة.",
    financialTitle: "القيمة والفوترة",
    financialDesc: "السعر والخصم والضريبة والإجمالي.",
    lifecycleTitle: "دورة حياة الاشتراك",
    lifecycleDesc: "الأحداث الفعلية المسجلة لهذا الاشتراك.",
    historyTitle: "سجل اشتراكات الشركة",
    historyDesc: "جميع اشتراكات الشركة، ويمكن فتح أي سجل منها مباشرة.",
    actionsTitle: "إجراءات الاشتراك",
    actionsDesc: "الإجراءات المتاحة حسب حالة الاشتراك الحالية.",
    billingTitle: "إجراءات الفوترة والدفع",
    billingDesc: "إجراءات اشتراك انتظار الدفع فقط.",
    notesTitle: "ملاحظات",
    company: "الشركة",
    companyCode: "كود الشركة",
    companyStatus: "حالة الشركة",
    email: "البريد",
    phone: "الجوال",
    city: "المدينة",
    action: "العملية",
    cycle: "الدورة",
    start: "البداية",
    end: "النهاية",
    days: "الأيام المتبقية",
    current: "اشتراك حالي",
    autoRenew: "تجديد تلقائي",
    yes: "نعم",
    no: "لا",
    price: "السعر",
    discount: "الخصم",
    beforeTax: "قبل الضريبة",
    tax: "الضريبة",
    billingReference: "مرجع الفوترة",
    created: "الإنشاء",
    updated: "آخر تحديث",
    paid: "تأكيد الدفع",
    activated: "التفعيل",
    suspended: "التعليق",
    cancelled: "الإلغاء",
    periodStart: "بداية الفترة",
    periodEnd: "نهاية الفترة",
    renew: "تجديد الاشتراك",
    changePlan: "تغيير الباقة",
    suspend: "تعليق مؤقت",
    reactivate: "إعادة تفعيل",
    cancel: "إلغاء الاشتراك",
    targetPlan: "الباقة المستهدفة",
    choosePlan: "اختر الباقة",
    createInvoice: "إنشاء فاتورة",
    createReceipt: "إنشاء إيصال دفع",
    paymentReferenceOptional: "اختياري — لا ينشئ النظام مرجعًا وهميًا",
    confirmInvoiceTitle: "تأكيد إنشاء الفاتورة",
    confirmInvoiceDesc:
      "سيطلب النظام إنشاء فاتورة اشتراك المنصة. إذا كانت موجودة مسبقًا فسيعيد نفس الفاتورة دون تكرار.",
    confirmReceiptTitle: "تأكيد إنشاء إيصال الدفع",
    confirmReceiptDesc:
      "إنشاء إيصال الدفع إجراء مالي فعلي، وقد يحول الفاتورة المرتبطة إلى مدفوعة. لن ينشئ النظام مرجع عملية وهميًا.",
    invoiceCreated: "تم إنشاء فاتورة الاشتراك.",
    invoiceExists: "فاتورة الاشتراك موجودة مسبقًا.",
    receiptCreated: "تم إنشاء إيصال الدفع.",
    receiptExists: "إيصال الدفع موجود مسبقًا.",
    confirmPayment: "تأكيد الدفع والتفعيل",
    paymentMethod: "طريقة الدفع",
    paymentReference: "مرجع الدفع",
    cash: "نقدي",
    bank: "تحويل بنكي",
    card: "بطاقة / مدى",
    gateway: "بوابة دفع",
    processing: "جاري المعالجة...",
    confirmTitle: "تأكيد الإجراء",
    confirmSuspend: "هل تريد تعليق هذا الاشتراك مؤقتًا؟",
    confirmReactivate: "هل تريد إعادة تفعيل هذا الاشتراك؟",
    confirmCancel: "هل أنت متأكد من إلغاء هذا الاشتراك؟",
    backAction: "تراجع",
    confirmAction: "تأكيد",
    refreshed: "تم تحديث تفاصيل الاشتراك.",
    actionDone: "تم تنفيذ الإجراء بنجاح.",
    noNotes: "لا توجد ملاحظات.",
    noHistory: "لا توجد سجلات إضافية.",
    error: "تعذر تحميل تفاصيل الاشتراك",
    retry: "إعادة المحاولة",
    reportTitle: "تقرير تفاصيل اشتراك Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
  },
  en: {
    title: "Subscription details",
    subtitle: "Subscription lifecycle, value, billing, and related actions.",
    back: "Back to subscriptions",
    refresh: "Refresh",
    print: "Print",
    subscriptionId: "Subscription ID",
    status: "Status",
    plan: "Plan",
    total: "Total",
    companyTitle: "Company",
    companyDesc: "Company linked to this subscription.",
    subscriptionTitle: "Subscription",
    subscriptionDesc: "Status, cycle, dates, and lifecycle indicators.",
    financialTitle: "Value & billing",
    financialDesc: "Price, discount, tax, and total.",
    lifecycleTitle: "Subscription lifecycle",
    lifecycleDesc: "Actual recorded events for this subscription.",
    historyTitle: "Company subscription history",
    historyDesc: "All company subscriptions with direct access to each record.",
    actionsTitle: "Subscription actions",
    actionsDesc: "Available actions based on the current subscription status.",
    billingTitle: "Billing & payment actions",
    billingDesc: "Actions available for pending-payment subscriptions.",
    notesTitle: "Notes",
    company: "Company",
    companyCode: "Company code",
    companyStatus: "Company status",
    email: "Email",
    phone: "Phone",
    city: "City",
    action: "Action",
    cycle: "Cycle",
    start: "Start",
    end: "End",
    days: "Days remaining",
    current: "Current subscription",
    autoRenew: "Auto renew",
    yes: "Yes",
    no: "No",
    price: "Price",
    discount: "Discount",
    beforeTax: "Before tax",
    tax: "Tax",
    billingReference: "Billing reference",
    created: "Created",
    updated: "Updated",
    paid: "Payment confirmed",
    activated: "Activated",
    suspended: "Suspended",
    cancelled: "Cancelled",
    periodStart: "Period start",
    periodEnd: "Period end",
    renew: "Renew subscription",
    changePlan: "Change plan",
    suspend: "Suspend temporarily",
    reactivate: "Reactivate",
    cancel: "Cancel subscription",
    targetPlan: "Target plan",
    choosePlan: "Choose plan",
    createInvoice: "Create invoice",
    createReceipt: "Create payment receipt",
    paymentReferenceOptional: "Optional — no synthetic reference is generated",
    confirmInvoiceTitle: "Confirm invoice creation",
    confirmInvoiceDesc:
      "The system will request the platform subscription invoice. If it already exists, the same invoice is returned without duplication.",
    confirmReceiptTitle: "Confirm payment receipt creation",
    confirmReceiptDesc:
      "Creating a payment receipt is a real financial action and may mark the related invoice as paid. No synthetic transaction reference will be generated.",
    invoiceCreated: "Subscription invoice created.",
    invoiceExists: "Subscription invoice already exists.",
    receiptCreated: "Payment receipt created.",
    receiptExists: "Payment receipt already exists.",
    confirmPayment: "Confirm payment & activate",
    paymentMethod: "Payment method",
    paymentReference: "Payment reference",
    cash: "Cash",
    bank: "Bank transfer",
    card: "Card / Mada",
    gateway: "Payment gateway",
    processing: "Processing...",
    confirmTitle: "Confirm action",
    confirmSuspend: "Suspend this subscription temporarily?",
    confirmReactivate: "Reactivate this subscription?",
    confirmCancel: "Are you sure you want to cancel this subscription?",
    backAction: "Back",
    confirmAction: "Confirm",
    refreshed: "Subscription details refreshed.",
    actionDone: "Action completed successfully.",
    noNotes: "No notes.",
    noHistory: "No additional records.",
    error: "Could not load subscription details",
    retry: "Try again",
    reportTitle: "Mhamcloud Subscription Details Report",
    generatedAt: "Generated at",
  },
} as const;

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const found = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : "";
}

async function getJson(path: string) {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
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
  const root = asRecord(payload);
  if (!response.ok || root.ok === false) {
    throw new Error(
      text(root.message) || text(root.detail) || `HTTP ${response.status}`,
    );
  }
  return root;
}

async function postJson(path: string, body: ApiRecord = {}) {
  const csrf = getCookie("csrftoken");
  const response = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRFToken": csrf } : {}),
    },
    body: JSON.stringify(body),
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
  const root = asRecord(payload);
  if (!response.ok || root.ok === false) {
    const errors = asRecord(root.errors);
    const first = Object.values(errors)[0];
    throw new Error(
      text(root.message) ||
        text(root.detail) ||
        (Array.isArray(first) ? text(first[0]) : text(first)) ||
        `HTTP ${response.status}`,
    );
  }
  return root;
}

function normalizeDetail(payload: ApiRecord) {
  const data = asRecord(payload.data);
  const row = asRecord(data.subscription);
  if (!Object.keys(row).length) {
    return {
      detail: null as SubscriptionDetail | null,
      history: [] as HistoryRow[],
    };
  }

  const company = asRecord(row.company);
  const plan = asRecord(row.plan);
  const lifecycle = asRecord(row.lifecycle);

  const detail: SubscriptionDetail = {
    id: text(row.id),
    companyId: text(company.id),
    companyName: text(company.display_name ?? company.name, "—"),
    companyCode: text(company.company_code ?? company.code, "—"),
    companyStatus: text(company.status, "—"),
    companyEmail: text(company.email),
    companyPhone: text(company.mobile ?? company.phone),
    companyCity: text(company.city),
    planId: text(plan.id),
    planName: text(plan.name, "—"),
    planCode: text(plan.code),
    planMonthlyPrice: text(plan.monthly_price, "0.00"),
    planYearlyPrice: text(plan.yearly_price, "0.00"),
    status: text(row.status ?? lifecycle.status, "unknown")
      .toLowerCase()
      .replace(/[\s-]+/g, "_"),
    action: text(row.action, "NEW").toUpperCase(),
    billingCycle:
      text(row.billing_cycle, "MONTHLY").toUpperCase() === "YEARLY"
        ? "YEARLY"
        : "MONTHLY",
    startDate: text(row.start_date ?? lifecycle.start_date),
    endDate: text(row.end_date ?? lifecycle.end_date),
    daysRemaining: numberValue(
      row.days_remaining ?? lifecycle.days_remaining,
    ),
    isCurrent: Boolean(row.is_current ?? lifecycle.is_current),
    isPendingPayment: Boolean(
      row.is_pending_payment ?? lifecycle.is_pending_payment,
    ),
    price: text(row.price, "0.00"),
    discountAmount: text(row.discount_amount, "0.00"),
    amountBeforeTax: text(row.amount_before_tax, "0.00"),
    taxAmount: text(row.tax_amount, "0.00"),
    totalAmount: text(row.total_amount, "0.00"),
    autoRenew: Boolean(row.auto_renew ?? lifecycle.auto_renew),
    billingReference: text(row.billing_reference),
    paidAt: text(row.paid_at ?? lifecycle.paid_at),
    activatedAt: text(row.activated_at ?? lifecycle.activated_at),
    cancelledAt: text(row.cancelled_at ?? lifecycle.cancelled_at),
    suspendedAt: text(row.suspended_at ?? lifecycle.suspended_at),
    notes: text(row.notes),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    canConfirmPayment: Boolean(lifecycle.can_confirm_payment),
    canRenew: Boolean(lifecycle.can_renew),
    canChangePlan: Boolean(lifecycle.can_change_plan),
    canCancel: Boolean(lifecycle.can_cancel),
  };

  const rawHistory = Array.isArray(data.company_subscriptions)
    ? data.company_subscriptions
    : [];

  const history = rawHistory.map((item): HistoryRow => {
    const historyRow = asRecord(item);
    const historyPlan = asRecord(historyRow.plan);
    return {
      id: text(historyRow.id),
      planName: text(historyPlan.name, "—"),
      status: text(historyRow.status, "unknown")
        .toLowerCase()
        .replace(/[\s-]+/g, "_"),
      action: text(historyRow.action, "NEW").toUpperCase(),
      billingCycle: text(historyRow.billing_cycle, "MONTHLY").toUpperCase(),
      totalAmount: text(historyRow.total_amount, "0.00"),
      startDate: text(historyRow.start_date),
      endDate: text(historyRow.end_date),
    };
  });

  return { detail, history };
}

function normalizePlans(payload: ApiRecord): PlanOption[] {
  const data = asRecord(payload.data);
  const raw = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.results)
      ? data.results
      : [];

  return raw
    .map((item): PlanOption => {
      const row = asRecord(item);
      return {
        id: text(row.id),
        name: text(row.name ?? row.title, "—"),
        code: text(row.code ?? row.slug),
        monthlyPrice: text(row.monthly_price, "0.00"),
        yearlyPrice: text(row.yearly_price, "0.00"),
        active: row.is_active !== false,
      };
    })
    .filter((plan) => plan.id && plan.active);
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-end text-sm font-medium">{value}</div>
    </div>
  );
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function SystemSubscriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = React.useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] || "" : String(value || "");
  }, [params]);

  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [detail, setDetail] = React.useState<SubscriptionDetail | null>(null);
  const [history, setHistory] = React.useState<HistoryRow[]>([]);
  const [plans, setPlans] = React.useState<PlanOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = React.useState("");
  const [selectedCycle, setSelectedCycle] =
    React.useState<BillingCycle>("MONTHLY");
  const [paymentMethod, setPaymentMethod] = React.useState("CASH");
  const [paymentReference, setPaymentReference] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [busy, setBusy] = React.useState<BusyAction>(null);
  const [confirmation, setConfirmation] =
    React.useState<ConfirmationAction | null>(null);
  const [billingConfirmation, setBillingConfirmation] =
    React.useState<BillingConfirmationAction | null>(null);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;
  const session = useAuth();
  const canCreateInvoice = hasPermission(
    session,
    PERMISSIONS.SYSTEM_BILLING_DOCUMENTS_CREATE_INVOICE,
  );
  const canCreateReceipt = hasPermission(
    session,
    PERMISSIONS.SYSTEM_BILLING_DOCUMENTS_CREATE_RECEIPT,
  );

  React.useEffect(() => {
    const sync = () => {
      const next = readSystemLocale();
      setLocale(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.body.dir = next === "ar" ? "rtl" : "ltr";
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("Mhamcloud-locale-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("Mhamcloud-locale-changed", sync);
    };
  }, []);

  const load = React.useCallback(
    async (silent = false) => {
      if (!subscriptionId) return;
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const detailPayload = await getJson(
          API_PATHS.systemSubscriptions.detail(subscriptionId),
        );
        const normalized = normalizeDetail(detailPayload);

        if (!normalized.detail) throw new Error(t.error);

        setDetail(normalized.detail);
        setHistory(normalized.history);
        setSelectedPlanId("");
        setSelectedCycle(normalized.detail.billingCycle);

        try {
          const planPayload = await getJson(API_PATHS.systemPlans.list);
          setPlans(normalizePlans(planPayload));
        } catch {
          setPlans([]);
        }

        if (silent) toast.success(t.refreshed);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : t.error;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [subscriptionId, t.error, t.refreshed],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  const selectedPlan = React.useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId],
  );

  const changeAction = React.useMemo<"UPGRADE" | "DOWNGRADE">(() => {
    if (!detail || !selectedPlan) return "UPGRADE";

    const currentPrice =
      selectedCycle === "YEARLY"
        ? numberValue(detail.planYearlyPrice)
        : numberValue(detail.planMonthlyPrice);
    const targetPrice =
      selectedCycle === "YEARLY"
        ? numberValue(selectedPlan.yearlyPrice)
        : numberValue(selectedPlan.monthlyPrice);

    return targetPrice < currentPrice ? "DOWNGRADE" : "UPGRADE";
  }, [detail, selectedCycle, selectedPlan]);

  async function execute(action: Exclude<BusyAction, null>) {
    if (!detail) return;

    if (action === "changePlan" && !selectedPlanId) {
      toast.error(t.choosePlan);
      return;
    }

    setBusy(action);
    try {
      if (action === "invoice") {
        const result = await createSystemBillingInvoice(detail.id);
        toast.success(
          result.created ? t.invoiceCreated : t.invoiceExists,
        );
        setBillingConfirmation(null);

        if (result.documentId) {
          router.push(`/system/invoices/${result.documentId}`);
          return;
        }

        await load(true);
        return;
      }

      if (action === "receipt") {
        const result = await createSystemBillingReceipt(detail.id, {
          paymentMethod,
          transactionReference: paymentReference.trim(),
          billingReference: detail.billingReference,
        });
        toast.success(
          result.created ? t.receiptCreated : t.receiptExists,
        );
        setBillingConfirmation(null);

        if (result.documentId) {
          router.push(`/system/invoices/${result.documentId}`);
          return;
        }

        await load(true);
        return;
      }

      let payload: ApiRecord = {};

      if (action === "confirm") {
        payload = await postJson(
          API_PATHS.systemSubscriptions.confirmPayment(detail.id),
          {
            payment_method: paymentMethod,
            transaction_reference: paymentReference.trim(),
            billing_reference: detail.billingReference || detail.id,
          },
        );
      } else if (action === "renew") {
        payload = await postJson(
          API_PATHS.systemSubscriptions.renew(detail.id),
          {
            billing_cycle: selectedCycle,
            discount_amount: "0.00",
            vat_rate: "0.15",
            auto_renew: detail.autoRenew,
            billing_reference: detail.billingReference,
          },
        );
      } else if (action === "changePlan") {
        payload = await postJson(
          API_PATHS.systemSubscriptions.changePlan(detail.id),
          {
            plan_id: Number(selectedPlanId),
            billing_cycle: selectedCycle,
            action: changeAction,
            start_date: new Date().toISOString().slice(0, 10),
            discount_amount: "0.00",
            vat_rate: "0.15",
            auto_renew: detail.autoRenew,
            billing_reference: detail.billingReference,
          },
        );
      } else if (action === "suspend") {
        payload = await postJson(
          API_PATHS.systemSubscriptions.suspend(detail.id),
          { reason: "Suspended from V2 system subscription detail." },
        );
      } else if (action === "reactivate") {
        payload = await postJson(
          API_PATHS.systemSubscriptions.reactivate(detail.id),
          { reason: "Reactivated from V2 system subscription detail." },
        );
      } else if (action === "cancel") {
        payload = await postJson(
          API_PATHS.systemSubscriptions.cancel(detail.id),
          { notes: "Cancelled from V2 system subscription detail." },
        );
      }

      const data = asRecord(payload.data);
      const nextSubscription = asRecord(data.subscription);
      const nextId = text(nextSubscription.id);

      toast.success(t.actionDone);

      if (
        (action === "renew" || action === "changePlan") &&
        nextId &&
        nextId !== detail.id
      ) {
        router.push(`/system/subscriptions/${nextId}`);
        return;
      }

      await load(true);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t.error);
    } finally {
      setBusy(null);
    }
  }

  function openPrint() {
    if (!detail) return;

    const rows = [
      [t.subscriptionId, detail.id],
      [t.company, detail.companyName],
      [t.companyCode, detail.companyCode],
      [t.plan, detail.planName],
      [t.status, statusLabel(detail.status, locale)],
      [t.action, actionLabel(detail.action, locale)],
      [t.cycle, billingCycleLabel(detail.billingCycle, locale)],
      [t.start, formatDate(detail.startDate)],
      [t.end, formatDate(detail.endDate)],
      [t.total, detail.totalAmount],
      [t.billingReference, detail.billingReference || "—"],
      [t.created, formatDateTime(detail.createdAt)],
      [t.updated, formatDateTime(detail.updatedAt)],
    ];

    const tableHtml = `<table><tbody>${rows
      .map(
        ([label, value]) =>
          `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
      )
      .join("")}</tbody></table>`;

    openPrintReport({
      locale,
      title: t.reportTitle,
      tableHtml,
      recordsCount: 1,
      recordsLabel: locale === "ar" ? "سجل" : "record",
      generatedAtLabel: t.generatedAt,
    });
  }

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-[520px]" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <Card dir={dir}>
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <CircleAlert className="size-9 text-destructive" />
          <CardTitle>{t.error}</CardTitle>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => void load()}>{t.retry}</Button>
        </CardContent>
      </Card>
    );
  }

  const lifecycleEvents = [
    { label: t.created, value: detail.createdAt, dateOnly: false },
    { label: t.periodStart, value: detail.startDate, dateOnly: true },
    { label: t.paid, value: detail.paidAt, dateOnly: false },
    { label: t.activated, value: detail.activatedAt, dateOnly: false },
    { label: t.suspended, value: detail.suspendedAt, dateOnly: false },
    { label: t.cancelled, value: detail.cancelledAt, dateOnly: false },
    { label: t.periodEnd, value: detail.endDate, dateOnly: true },
  ].filter((event) => Boolean(event.value));

  const canSuspend = detail.status === "active" || detail.status === "trial";
  const canReactivate = detail.status === "suspended";

  return (
    <div dir={dir} className="space-y-4 lg:space-y-6">
      <header className="flex flex-row items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
              {t.title}
            </h1>
            <StatusBadge value={detail.status} locale={locale} />
          </div>
          <p className="mt-1 hidden text-sm text-muted-foreground lg:block">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            asChild
            variant="outline"
            className={registerOutlineButtonClass}
          >
            <Link href="/system/subscriptions">
              <BackIcon />
              {t.back}
            </Link>
          </Button>
          <Button
            variant="outline"
            className={registerOutlineButtonClass}
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            {t.refresh}
          </Button>
          <Button className={registerBrandButtonClass} onClick={openPrint}>
            <Printer />
            {t.print}
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
        <SystemMetricCard
          title={t.subscriptionId}
          value={detail.id}
          description={detail.companyCode}
          icon={Hash}
        />
        <SystemMetricCard
          title={t.status}
          value={statusLabel(detail.status, locale)}
          description={actionLabel(detail.action, locale)}
          icon={ShieldCheck}
        />
        <SystemMetricCard
          title={t.plan}
          value={detail.planName}
          description={billingCycleLabel(detail.billingCycle, locale)}
          icon={Layers3}
        />
        <Card>
          <CardHeader>
            <CardTitle icon={WalletCards} iconPosition="opposite">
              {t.total}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl lg:text-3xl">
              <MoneyValue amount={detail.totalAmount} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={Building2}>{t.companyTitle}</CardTitle>
            <CardDescription>{t.companyDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label={t.company}
              value={
                <Link
                  href={
                    detail.companyId
                      ? `/system/companies/${detail.companyId}`
                      : "/system/companies"
                  }
                  className="hover:underline"
                >
                  {detail.companyName}
                </Link>
              }
            />
            <InfoRow label={t.companyCode} value={detail.companyCode} />
            <InfoRow
              label={t.companyStatus}
              value={<StatusBadge value={detail.companyStatus} locale={locale} />}
            />
            <InfoRow label={t.email} value={detail.companyEmail || "—"} />
            <InfoRow
              label={t.phone}
              value={<span dir="ltr">{detail.companyPhone || "—"}</span>}
            />
            <InfoRow label={t.city} value={detail.companyCity || "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={Activity}>{t.subscriptionTitle}</CardTitle>
            <CardDescription>{t.subscriptionDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label={t.action}
              value={actionLabel(detail.action, locale)}
            />
            <InfoRow
              label={t.cycle}
              value={billingCycleLabel(detail.billingCycle, locale)}
            />
            <InfoRow
              label={t.start}
              value={
                <span dir="ltr" lang="en" className="tabular-nums">
                  {formatDate(detail.startDate)}
                </span>
              }
            />
            <InfoRow
              label={t.end}
              value={
                <span dir="ltr" lang="en" className="tabular-nums">
                  {formatDate(detail.endDate)}
                </span>
              }
            />
            <InfoRow
              label={t.days}
              value={
                <span dir="ltr" lang="en" className="tabular-nums">
                  {detail.daysRemaining}
                </span>
              }
            />
            <InfoRow label={t.current} value={detail.isCurrent ? t.yes : t.no} />
            <InfoRow
              label={t.autoRenew}
              value={detail.autoRenew ? t.yes : t.no}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={CreditCard}>{t.financialTitle}</CardTitle>
          <CardDescription>{t.financialDesc}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            [t.price, detail.price],
            [t.discount, detail.discountAmount],
            [t.beforeTax, detail.amountBeforeTax],
            [t.tax, detail.taxAmount],
            [t.total, detail.totalAmount],
          ].map(([label, amount]) => (
            <div key={label} className="rounded-md border px-4 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className="mt-2 text-base font-semibold">
                <MoneyValue amount={amount} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={CalendarDays}>{t.lifecycleTitle}</CardTitle>
            <CardDescription>{t.lifecycleDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lifecycleEvents.map((event) => (
              <div
                key={event.label}
                className="flex items-start gap-3 rounded-md border px-4 py-3"
              >
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[#a57b3d]" />
                <div>
                  <p className="text-sm font-medium">{event.label}</p>
                  <p
                    dir="ltr"
                    lang="en"
                    className="mt-1 text-xs tabular-nums text-muted-foreground"
                  >
                    {event.dateOnly
                      ? formatDate(event.value)
                      : formatDateTime(event.value)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={FileText}>{t.notesTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-40 whitespace-pre-wrap rounded-md border p-4 text-sm leading-7 text-muted-foreground">
              {detail.notes || t.noNotes}
            </div>
          </CardContent>
        </Card>
      </div>

      {(detail.canRenew ||
        detail.canChangePlan ||
        canSuspend ||
        canReactivate ||
        detail.canCancel) && (
        <Card>
          <CardHeader>
            <CardTitle icon={RefreshCw}>{t.actionsTitle}</CardTitle>
            <CardDescription>{t.actionsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(detail.canRenew || detail.canChangePlan) && (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  <span>{t.targetPlan}</span>
                  <Select
                    value={selectedPlanId}
                    onValueChange={setSelectedPlanId}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t.choosePlan} />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} {plan.code ? `(${plan.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  <span>{t.cycle}</span>
                  <Select
                    value={selectedCycle}
                    onValueChange={(value) =>
                      setSelectedCycle(value as BillingCycle)
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">
                        {billingCycleLabel("MONTHLY", locale)}
                      </SelectItem>
                      <SelectItem value="YEARLY">
                        {billingCycleLabel("YEARLY", locale)}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {detail.canRenew && (
                <Button
                  variant="outline"
                  disabled={Boolean(busy)}
                  onClick={() => void execute("renew")}
                >
                  <RefreshCw />
                  {t.renew}
                </Button>
              )}
              {detail.canChangePlan && (
                <Button
                  variant="outline"
                  disabled={Boolean(busy) || !selectedPlanId}
                  onClick={() => void execute("changePlan")}
                >
                  <Layers3 />
                  {t.changePlan}
                </Button>
              )}
              {canSuspend && (
                <Button
                  variant="outline"
                  disabled={Boolean(busy)}
                  onClick={() => setConfirmation("suspend")}
                >
                  <TriangleAlert />
                  {t.suspend}
                </Button>
              )}
              {canReactivate && (
                <Button
                  disabled={Boolean(busy)}
                  onClick={() => setConfirmation("reactivate")}
                >
                  <CheckCircle2 />
                  {t.reactivate}
                </Button>
              )}
              {detail.canCancel && (
                <Button
                  variant="destructive"
                  disabled={Boolean(busy)}
                  onClick={() => setConfirmation("cancel")}
                >
                  <TriangleAlert />
                  {t.cancel}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {detail.canConfirmPayment && (
        <Card>
          <CardHeader>
            <CardTitle icon={ReceiptText}>{t.billingTitle}</CardTitle>
            <CardDescription>{t.billingDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                <span>{t.paymentMethod}</span>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">{t.cash}</SelectItem>
                    <SelectItem value="BANK_TRANSFER">{t.bank}</SelectItem>
                    <SelectItem value="CARD">{t.card}</SelectItem>
                    <SelectItem value="PAYMENT_GATEWAY">{t.gateway}</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="grid gap-2 text-sm font-medium">
                <span>{t.paymentReference}</span>
                <Input
                  value={paymentReference}
                  onChange={(event) =>
                    setPaymentReference(event.target.value)
                  }
                  placeholder={t.paymentReferenceOptional}
                  className="bg-background"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {canCreateInvoice ? (
                <Button
                  className={registerBrandButtonClass}
                  disabled={Boolean(busy)}
                  onClick={() => setBillingConfirmation("invoice")}
                >
                  <FileText />
                  {t.createInvoice}
                </Button>
              ) : null}
              {canCreateReceipt ? (
                <Button
                  className={registerBrandButtonClass}
                  disabled={Boolean(busy)}
                  onClick={() => setBillingConfirmation("receipt")}
                >
                  <ReceiptText />
                  {t.createReceipt}
                </Button>
              ) : null}
              <Button
                disabled={Boolean(busy)}
                onClick={() => void execute("confirm")}
              >
                <ShieldCheck />
                {t.confirmPayment}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle icon={WalletCards}>{t.historyTitle}</CardTitle>
          <CardDescription>{t.historyDesc}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="min-w-[900px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px] px-4">ID</TableHead>
                <TableHead className="w-[180px] px-4">{t.plan}</TableHead>
                <TableHead className="w-[120px] px-4">{t.action}</TableHead>
                <TableHead className="w-[105px] px-4">{t.cycle}</TableHead>
                <TableHead className="w-[120px] px-4">{t.total}</TableHead>
                <TableHead className="w-[120px] px-4">{t.status}</TableHead>
                <TableHead className="w-[120px] px-4">{t.start}</TableHead>
                <TableHead className="w-[120px] px-4">{t.end}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length ? (
                history.map((row) => (
                  <TableRow
                    key={row.id}
                    href={
                      row.id && row.id !== detail.id
                        ? `/system/subscriptions/${row.id}`
                        : undefined
                    }
                  >
                    <TableCell className="px-4">
                      <span dir="ltr" lang="en" className="tabular-nums">
                        {row.id}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">{row.planName}</TableCell>
                    <TableCell className="px-4">
                      {actionLabel(row.action, locale)}
                    </TableCell>
                    <TableCell className="px-4">
                      {billingCycleLabel(row.billingCycle, locale)}
                    </TableCell>
                    <TableCell className="px-4">
                      <MoneyValue amount={row.totalAmount} />
                    </TableCell>
                    <TableCell className="px-4">
                      <StatusBadge value={row.status} locale={locale} />
                    </TableCell>
                    <TableCell className="px-4">
                      <span
                        dir="ltr"
                        lang="en"
                        className="tabular-nums text-muted-foreground"
                      >
                        {formatDate(row.startDate)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4">
                      <span
                        dir="ltr"
                        lang="en"
                        className="tabular-nums text-muted-foreground"
                      >
                        {formatDate(row.endDate)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-28 text-center text-muted-foreground"
                  >
                    {t.noHistory}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(billingConfirmation)}
        onOpenChange={(open) => {
          if (!open && !busy) setBillingConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {billingConfirmation === "invoice"
                ? t.confirmInvoiceTitle
                : t.confirmReceiptTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {billingConfirmation === "invoice"
                ? t.confirmInvoiceDesc
                : t.confirmReceiptDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busy)}>
              {t.backAction}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(busy)}
              onClick={() => {
                const action = billingConfirmation;
                if (action) void execute(action);
              }}
            >
              {busy ? t.processing : t.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation === "suspend"
                ? t.confirmSuspend
                : confirmation === "reactivate"
                  ? t.confirmReactivate
                  : t.confirmCancel}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busy)}>
              {t.backAction}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={confirmation === "cancel" ? "destructive" : "default"}
              disabled={Boolean(busy)}
              onClick={() => {
                const action = confirmation;
                setConfirmation(null);
                if (action) void execute(action);
              }}
            >
              {busy ? t.processing : t.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
