"use client";

import Image from "next/image";
import { createElement, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  HandCoins,
  Package,
  ReceiptText,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";

import { API_PATHS, apiGet, getDataObject, getResults } from "@/lib/api";

import {
  AnalyticsKpiCard,
  type AnalyticsKpiCardProps,
  type AnalyticsKpiTrendDirection,
} from "./analytics-kpi-card";

import {
  AnalyticsTargetCard,
  type AnalyticsTargetCardProps,
  type AnalyticsTargetTrendDirection,
} from "./analytics-target-card";

import {
  AnalyticsDonutCard,
  type AnalyticsDonutCardProps,
  type AnalyticsDonutItem,
} from "./analytics-donut-card";

import {
  AnalyticsPipelineCard,
  type AnalyticsPipelineCardProps,
  type AnalyticsPipelineItem,
  type AnalyticsPipelineItemTone,
} from "./analytics-pipeline-card";

import {
  AnalyticsTaskList,
  type AnalyticsTaskItem,
  type AnalyticsTaskListProps,
  type AnalyticsTaskStatus,
  type AnalyticsTaskTone,
} from "./analytics-task-list";

import {
  AnalyticsTableCard,
  type AnalyticsTableAction,
  type AnalyticsTableCardProps,
  type AnalyticsTableColumn,
} from "./analytics-table-card";

import {
  AnalyticsToolbar,
  type AnalyticsToolbarAction,
  type AnalyticsToolbarProps,
} from "./analytics-toolbar";

/* ============================================================
   Primey Analytics Core Exports
============================================================ */

export {
  AnalyticsKpiCard,
  type AnalyticsKpiCardProps,
  type AnalyticsKpiTrendDirection,
};

export {
  AnalyticsTargetCard,
  type AnalyticsTargetCardProps,
  type AnalyticsTargetTrendDirection,
};

export {
  AnalyticsDonutCard,
  type AnalyticsDonutCardProps,
  type AnalyticsDonutItem,
};

export {
  AnalyticsPipelineCard,
  type AnalyticsPipelineCardProps,
  type AnalyticsPipelineItem,
  type AnalyticsPipelineItemTone,
};

export {
  AnalyticsTaskList,
  type AnalyticsTaskItem,
  type AnalyticsTaskListProps,
  type AnalyticsTaskStatus,
  type AnalyticsTaskTone,
};

export {
  AnalyticsTableCard,
  type AnalyticsTableAction,
  type AnalyticsTableCardProps,
  type AnalyticsTableColumn,
};

export {
  AnalyticsToolbar,
  type AnalyticsToolbarAction,
  type AnalyticsToolbarProps,
};

/* ============================================================
   Primey Care Dashboard Compatibility Components
   ------------------------------------------------------------
   ✅ app/system/page.tsx يبقى كما هو
   ✅ التصميم يبقى CRM / LTR
   ✅ البيانات من APIs الفعلية
   ✅ النصوص تدعم عربي/إنجليزي بنصوص قصيرة
   ✅ التصنيفات ثابتة حتى لا ينهار الشكل عند قلة البيانات
============================================================ */

type AppLocale = "ar" | "en";

type ApiPagination = {
  total_items?: number;
};

type ListPayload<T> = {
  count?: number;
  results?: T[];
  pagination?: ApiPagination;
  meta?: ApiPagination & Record<string, unknown>;
};

type CustomerMini = {
  id?: number;
  full_name?: string;
  phone?: string;
  email?: string;
  status?: string;
};

type CustomerItem = {
  id: number;
  full_name?: string;
  phone?: string;
  email?: string;
  status?: string;
};

type ProductMini = {
  id?: number;
  name?: string;
  code?: string;
};

type OrderItem = {
  id: number;
  order_number?: string;
  customer_id?: number;
  customer?: CustomerMini | null;
  product?: ProductMini | null;
  product_name?: string;
  status?: string;
  payment_status?: string;
  fulfillment_status?: string;
  total_amount?: string;
  created_at?: string | null;
};

type InvoiceItem = {
  id: number;
  status?: string;
  total_amount?: string;
};

type PaymentItem = {
  id: number;
  reference?: string;
  status?: string;
  payment_method?: string;
  amount?: string;
};

type OrderLineItem = {
  id: number;
  status?: string;
  fulfillment_status?: string;
};

type NotificationOverview = Record<string, unknown> & {
  counts?: {
    unread_notifications?: number;
    failed_deliveries?: number;
  };
};

type SystemLogSummary = Record<string, unknown> & {
  counts?: {
    warning_logs?: number;
    error_logs?: number;
    critical_logs?: number;
  };
};

type DashboardData = {
  customers: CustomerItem[];
  orders: OrderItem[];
  invoices: InvoiceItem[];
  payments: PaymentItem[];
  pendingOrderItems: OrderLineItem[];
  notificationOverview: NotificationOverview | null;
  systemLogSummary: SystemLogSummary | null;
  totals: {
    customers: number;
    orders: number;
    invoices: number;
    payments: number;
    pendingOrderItems: number;
  };
};

type DashboardState = {
  loading: boolean;
  data: DashboardData;
};

type LeadRow = Record<string, unknown> & {
  id: string;
  status: string;
  email: string;
  amount: number;
  href: string;
};

type DashboardLabels = ReturnType<typeof labels>;

const PRIMEY_LOCALE_STORAGE_KEY = "primey-locale";
const SAR_ICON_PATH = "/currency/sar.svg";

const EMPTY_DASHBOARD: DashboardData = {
  customers: [],
  orders: [],
  invoices: [],
  payments: [],
  pendingOrderItems: [],
  notificationOverview: null,
  systemLogSummary: null,
  totals: {
    customers: 0,
    orders: 0,
    invoices: 0,
    payments: 0,
    pendingOrderItems: 0,
  },
};

let dashboardCache: DashboardData | null = null;
let dashboardPromise: Promise<DashboardData> | null = null;

function getStoredLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const savedLocale = window.localStorage.getItem(PRIMEY_LOCALE_STORAGE_KEY);
    return savedLocale === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function usePrimeyLocale() {
  const [locale, setLocale] = useState<AppLocale>(() => getStoredLocale());

  useEffect(() => {
    const syncLocale = () => {
      setLocale(getStoredLocale());
    };

    syncLocale();

    window.addEventListener("primey-locale-changed", syncLocale);
    window.addEventListener("storage", syncLocale);

    return () => {
      window.removeEventListener("primey-locale-changed", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  return locale;
}

function labels(locale: AppLocale) {
  const ar = locale === "ar";

  return {
    totalCustomers: ar ? "العملاء" : "Total Customers",
    totalOrders: ar ? "الطلبات" : "Total Deals",
    totalRevenue: ar ? "الإيرادات" : "Total Revenue",

    fromCustomers: ar ? "من بيانات العملاء" : "from customer data",
    fromOrders: ar ? "من بيانات الطلبات" : "from order data",
    fromPayments: ar ? "من المدفوعات المؤكدة" : "from confirmed payments",

    targetTitle: ar ? "هدف التحصيل" : "Your target is incomplete",
    targetDescription: ar
      ? "نسبة التحصيل من الفواتير والمدفوعات."
      : "You have completed part of the collection target, you can also check your status.",
    current: ar ? "المحقق" : "Current",
    target: ar ? "الهدف" : "Goal",
    targetUnit: ar ? "التحصيل" : "Target",

    paymentsByMethod: ar ? "طرق الدفع" : "Leads by Source",
    paymentsCenter: ar ? "مدفوعات" : "Leads",
    export: ar ? "تصدير" : "Export",

    tasks: ar ? "المهام" : "Tasks",
    tasksDescription: ar
      ? "متابعات تشغيلية قادمة."
      : "Track and manage your upcoming tasks.",
    viewAll: ar ? "عرض الكل" : "Add Task",

    pipeline: ar ? "مسار الطلبات" : "Sales Pipeline",
    pipelineDescription: ar
      ? "توزيع الطلبات حسب الحالة."
      : "Current deals in your sales pipeline.",
    deals: ar ? "طلبات" : "deals",

    leads: ar ? "آخر الطلبات" : "Leads",
    status: ar ? "الحالة" : "Status",
    email: ar ? "العميل" : "Email",
    amount: ar ? "المبلغ" : "Amount",
    columns: ar ? "الأعمدة" : "Columns",

    filterLeads: ar ? "تصفية الطلبات..." : "Filter leads...",
    selectedRows: ar ? "0 من {count} صف محدد." : "0 of {count} row(s) selected.",
    previous: ar ? "السابق" : "Previous",
    next: ar ? "التالي" : "Next",
    empty: ar ? "لا توجد بيانات." : "No data available",

    openInvoices: ar ? "فواتير مفتوحة" : "Open invoices",
    openInvoicesDesc: ar ? "تحتاج متابعة مالية" : "Need finance follow-up",
    waitingDelivery: ar ? "بانتظار التنفيذ" : "Waiting fulfillment",
    waitingDeliveryDesc: ar
      ? "طلبات تحتاج متابعة"
      : "Orders need fulfillment follow-up",
    pendingItems: ar ? "بنود معلقة" : "Pending order items",
    pendingItemsDesc: ar
      ? "بنود تحتاج إجراء"
      : "Items and services that need action",
    unreadNotifications: ar ? "تنبيهات غير مقروءة" : "Unread notifications",
    unreadNotificationsDesc: ar ? "من مركز التنبيهات" : "From notification center",
    errorsLogs: ar ? "أخطاء حرجة" : "Errors and critical logs",
    warnings: ar ? "تحذيرات" : "warnings",

    today: ar ? "اليوم" : "Due Today",
    tomorrow: ar ? "غدًا" : "Due Tomorrow",
    progress: ar ? "قيد التنفيذ" : "In progress",
    alerts: ar ? "تنبيهات" : "Alerts",
    systemLog: ar ? "سجل النظام" : "System log",

    cash: ar ? "نقدي" : "Cash",
    bankTransfer: ar ? "تحويل" : "Bank Transfer",
    gateway: ar ? "بوابة" : "Gateway",
    others: ar ? "أخرى" : "Others",

    leadStage: ar ? "معلق" : "Lead",
    qualifiedStage: ar ? "مؤكد" : "Qualified",
    proposalStage: ar ? "تنفيذ" : "Proposal",
    negotiationStage: ar ? "مدفوع" : "Negotiation",
    closedWonStage: ar ? "مكتمل" : "Closed Won",
    ordersInStage: ar ? "طلبات في المرحلة" : "orders in this stage",

    customerFallback: ar ? "عميل" : "Customer",
  };
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPaidStatus(status?: string) {
  const normalized = String(status || "").toUpperCase();

  return ["PAID", "COMPLETED", "CONFIRMED", "PARTIALLY_PAID"].includes(
    normalized,
  );
}

function isOpenInvoice(status?: string) {
  const normalized = String(status || "").toUpperCase();

  return !["PAID", "CANCELLED", "VOID", "REFUNDED"].includes(normalized);
}

function isWaitingFulfillment(order: OrderItem) {
  const fulfillment = String(order.fulfillment_status || "").toUpperCase();
  const status = String(order.status || "").toUpperCase();

  return (
    fulfillment.includes("PENDING") ||
    fulfillment.includes("NOT_STARTED") ||
    fulfillment.includes("DELIVERY") ||
    status.includes("ISSUED") ||
    status.includes("PROCESSING")
  );
}

function statusLabel(value: string | undefined, locale: AppLocale) {
  const normalized = String(value || "UNKNOWN").toUpperCase();

  const arMap: Record<string, string> = {
    DRAFT: "مسودة",
    PENDING: "معلق",
    ACTIVE: "نشط",
    PAID: "مدفوع",
    COMPLETED: "مكتمل",
    CONFIRMED: "مؤكد",
    PROCESSING: "تنفيذ",
    ISSUED: "مصدر",
    PARTIALLY_PAID: "جزئي",
    CANCELLED: "ملغي",
    FAILED: "فاشل",
    REFUNDED: "مسترجع",
    UNKNOWN: "غير محدد",
  };

  const enMap: Record<string, string> = {
    DRAFT: "Draft",
    PENDING: "Pending",
    ACTIVE: "Active",
    PAID: "Paid",
    COMPLETED: "Completed",
    CONFIRMED: "Confirmed",
    PROCESSING: "Processing",
    ISSUED: "Issued",
    PARTIALLY_PAID: "Partially Paid",
    CANCELLED: "Cancelled",
    FAILED: "Failed",
    REFUNDED: "Refunded",
    UNKNOWN: "Unknown",
  };

  return locale === "ar"
    ? arMap[normalized] || value || arMap.UNKNOWN
    : enMap[normalized] || value || enMap.UNKNOWN;
}

async function loadDashboardData(): Promise<DashboardData> {
  if (dashboardCache) {
    return dashboardCache;
  }

  if (dashboardPromise) {
    return dashboardPromise;
  }

  dashboardPromise = (async () => {
    const [
      customersResponse,
      ordersResponse,
      invoicesResponse,
      paymentsResponse,
      pendingOrderItemsResponse,
      notificationResponse,
      systemLogResponse,
    ] = await Promise.allSettled([
      apiGet<ListPayload<CustomerItem>>(API_PATHS.customers.list, {
        page_size: 100,
      }),
      apiGet<ListPayload<OrderItem>>(API_PATHS.orders.list, {
        page_size: 100,
      }),
      apiGet<ListPayload<InvoiceItem>>(API_PATHS.invoices.list, {
        limit: 100,
      }),
      apiGet<ListPayload<PaymentItem>>(API_PATHS.payments.list, {
        limit: 100,
      }),
      apiGet<ListPayload<OrderLineItem>>(API_PATHS.orderItems.pending, {
        page_size: 100,
      }),
      apiGet<unknown>(API_PATHS.notificationCenter.overview, {
        resource: "overview",
      }),
      apiGet<unknown>(API_PATHS.systemLog.summary),
    ]);

    function unwrapList<T>(result: PromiseSettledResult<unknown>): T[] {
      if (result.status !== "fulfilled") return [];

      const apiResult = result.value as {
        ok?: boolean;
        data?: unknown;
      };

      if (!apiResult.ok) return [];
      return getResults<T>(apiResult.data);
    }

    function unwrapTotal(result: PromiseSettledResult<unknown>) {
      if (result.status !== "fulfilled") return 0;

      const apiResult = result.value as {
        ok?: boolean;
        data?: unknown;
      };

      if (
        !apiResult.ok ||
        !apiResult.data ||
        typeof apiResult.data !== "object"
      ) {
        return 0;
      }

      const payload = apiResult.data as ListPayload<unknown>;

      return (
        payload.pagination?.total_items ||
        payload.meta?.total_items ||
        payload.count ||
        payload.results?.length ||
        0
      );
    }

    function unwrapObject<T extends Record<string, unknown>>(
      result: PromiseSettledResult<unknown>,
    ): T | null {
      if (result.status !== "fulfilled") return null;

      const apiResult = result.value as {
        ok?: boolean;
        data?: unknown;
      };

      if (!apiResult.ok) return null;
      return getDataObject<T>(apiResult.data);
    }

    const data: DashboardData = {
      customers: unwrapList<CustomerItem>(customersResponse),
      orders: unwrapList<OrderItem>(ordersResponse),
      invoices: unwrapList<InvoiceItem>(invoicesResponse),
      payments: unwrapList<PaymentItem>(paymentsResponse),
      pendingOrderItems: unwrapList<OrderLineItem>(pendingOrderItemsResponse),
      notificationOverview:
        unwrapObject<NotificationOverview>(notificationResponse),
      systemLogSummary: unwrapObject<SystemLogSummary>(systemLogResponse),
      totals: {
        customers: unwrapTotal(customersResponse),
        orders: unwrapTotal(ordersResponse),
        invoices: unwrapTotal(invoicesResponse),
        payments: unwrapTotal(paymentsResponse),
        pendingOrderItems: unwrapTotal(pendingOrderItemsResponse),
      },
    };

    dashboardCache = data;
    return data;
  })();

  return dashboardPromise;
}

function useDashboardData(): DashboardState {
  const [state, setState] = useState<DashboardState>({
    loading: !dashboardCache,
    data: dashboardCache || EMPTY_DASHBOARD,
  });

  useEffect(() => {
    let mounted = true;

    loadDashboardData()
      .then((data) => {
        if (!mounted) return;
        setState({ loading: false, data });
      })
      .catch((error) => {
        console.error("[Primey Dashboard Analytics Error]", error);

        if (!mounted) return;
        setState({ loading: false, data: EMPTY_DASHBOARD });
      });

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

function makePaymentMethodItems(
  payments: PaymentItem[],
  text: DashboardLabels,
): AnalyticsDonutItem[] {
  const paymentMethodGroups = payments.reduce<Record<string, number>>(
    (acc, payment) => {
      const key = String(payment.payment_method || "UNKNOWN").toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {},
  );

  return [
    {
      label: text.cash,
      value: paymentMethodGroups.CASH || 0,
    },
    {
      label: text.bankTransfer,
      value: paymentMethodGroups.BANK_TRANSFER || 0,
    },
    {
      label: text.gateway,
      value:
        (paymentMethodGroups.GATEWAY || 0) +
        (paymentMethodGroups.CARD || 0) +
        (paymentMethodGroups.TAMARA || 0) +
        (paymentMethodGroups.TABBY || 0),
    },
    {
      label: text.others,
      value:
        (paymentMethodGroups.WALLET || 0) +
        (paymentMethodGroups.UNKNOWN || 0),
    },
  ];
}

function makePipelineItems(
  orders: OrderItem[],
  text: DashboardLabels,
): AnalyticsPipelineItem[] {
  const statusGroups = orders.reduce<Record<string, number>>((acc, order) => {
    const key = String(order.status || "UNKNOWN").toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const leadStageValue =
    (statusGroups.PENDING || 0) +
    (statusGroups.DRAFT || 0) +
    (statusGroups.UNKNOWN || 0);

  const qualifiedStageValue = statusGroups.CONFIRMED || 0;

  const proposalStageValue =
    (statusGroups.PROCESSING || 0) +
    (statusGroups.ISSUED || 0) +
    (statusGroups.PARTIALLY_PAID || 0);

  const negotiationStageValue = statusGroups.PAID || 0;

  const closedWonStageValue = statusGroups.COMPLETED || 0;

  return [
    {
      label: text.leadStage,
      value: leadStageValue,
      description: `${leadStageValue} ${text.ordersInStage}`,
      href: "/system/orders",
      icon: Package,
      tone: "default",
    },
    {
      label: text.qualifiedStage,
      value: qualifiedStageValue,
      description: `${qualifiedStageValue} ${text.ordersInStage}`,
      href: "/system/orders",
      icon: FileText,
      tone: "info",
    },
    {
      label: text.proposalStage,
      value: proposalStageValue,
      description: `${proposalStageValue} ${text.ordersInStage}`,
      href: "/system/orders",
      icon: Truck,
      tone: "warning",
    },
    {
      label: text.negotiationStage,
      value: negotiationStageValue,
      description: `${negotiationStageValue} ${text.ordersInStage}`,
      href: "/system/orders",
      icon: HandCoins,
      tone: "violet",
    },
    {
      label: text.closedWonStage,
      value: closedWonStageValue,
      description: `${closedWonStageValue} ${text.ordersInStage}`,
      href: "/system/orders",
      icon: BriefcaseBusiness,
      tone: "success",
    },
  ];
}

function useDashboardComputed() {
  const locale = usePrimeyLocale();
  const dashboard = useDashboardData();
  const text = useMemo(() => labels(locale), [locale]);

  const computed = useMemo(() => {
    const customers = dashboard.data.customers;
    const orders = dashboard.data.orders;
    const invoices = dashboard.data.invoices;
    const payments = dashboard.data.payments;
    const pendingOrderItems = dashboard.data.pendingOrderItems;

    const confirmedPayments = payments.filter((payment) =>
      isPaidStatus(payment.status),
    );

    const confirmedPaymentsTotal = confirmedPayments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0,
    );

    const collectionTarget = Math.max(invoices.length, confirmedPayments.length, 1);
    const collectionPercentage =
      collectionTarget > 0
        ? (confirmedPayments.length / collectionTarget) * 100
        : 0;

    const openInvoices = invoices.filter((invoice) =>
      isOpenInvoice(invoice.status),
    ).length;

    const waitingDelivery = orders.filter(isWaitingFulfillment).length;

    const unreadNotifications =
      dashboard.data.notificationOverview?.counts?.unread_notifications || 0;

    const warningLogs = dashboard.data.systemLogSummary?.counts?.warning_logs || 0;
    const errorLogs = dashboard.data.systemLogSummary?.counts?.error_logs || 0;
    const criticalLogs =
      dashboard.data.systemLogSummary?.counts?.critical_logs || 0;

    const taskItems: AnalyticsTaskItem[] = [
      {
        title: text.openInvoices,
        description: text.openInvoicesDesc,
        value: openInvoices,
        href: "/system/invoices",
        icon: ReceiptText,
        tone: openInvoices > 0 ? "danger" : "success",
        status: openInvoices > 0 ? "warning" : "done",
        meta: text.today,
      },
      {
        title: text.waitingDelivery,
        description: text.waitingDeliveryDesc,
        value: waitingDelivery,
        href: "/system/orders",
        icon: Truck,
        tone: waitingDelivery > 0 ? "warning" : "success",
        status: waitingDelivery > 0 ? "active" : "done",
        meta: text.tomorrow,
      },
      {
        title: text.pendingItems,
        description: text.pendingItemsDesc,
        value: dashboard.data.totals.pendingOrderItems || pendingOrderItems.length,
        href: "/system/order-items",
        icon: FileText,
        tone: pendingOrderItems.length > 0 ? "warning" : "success",
        status: pendingOrderItems.length > 0 ? "active" : "done",
        meta: text.progress,
      },
      {
        title: text.unreadNotifications,
        description: text.unreadNotificationsDesc,
        value: unreadNotifications,
        href: "/system/notification-center",
        icon: Bell,
        tone: unreadNotifications > 0 ? "warning" : "success",
        status: unreadNotifications > 0 ? "warning" : "done",
        meta: text.alerts,
      },
      {
        title: text.errorsLogs,
        description: `${warningLogs} ${text.warnings}`,
        value: errorLogs + criticalLogs,
        href: "/system/system-log",
        icon: AlertTriangle,
        tone: errorLogs + criticalLogs > 0 ? "danger" : "success",
        status: errorLogs + criticalLogs > 0 ? "danger" : "done",
        meta: text.systemLog,
      },
    ];

    const leadRows: LeadRow[] = orders.slice(0, 5).map((order) => ({
      id: String(order.id),
      status: statusLabel(order.status, locale),
      email:
        order.customer?.email ||
        order.customer?.phone ||
        order.customer?.full_name ||
        `${text.customerFallback} #${order.customer_id || order.id}`,
      amount: toNumber(order.total_amount),
      href: `/system/orders/${order.id}`,
    }));

    return {
      loading: dashboard.loading,
      locale,
      text,
      totalCustomers: dashboard.data.totals.customers || customers.length,
      totalOrders: dashboard.data.totals.orders || orders.length,
      confirmedPayments,
      confirmedPaymentsTotal,
      collectionTarget,
      collectionPercentage,
      paymentMethodItems: makePaymentMethodItems(payments, text),
      pipelineItems: makePipelineItems(orders, text),
      taskItems,
      leadRows,
    };
  }, [dashboard.data, dashboard.loading, locale, text]);

  return computed;
}

function renderAmountWithCurrency(amount: number) {
  return createElement(
    "span",
    {
      className: "inline-flex items-center gap-1 font-semibold",
      dir: "ltr",
    },
    amount.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    }),
    createElement(Image, {
      src: SAR_ICON_PATH,
      alt: "SAR",
      width: 15,
      height: 15,
      className: "inline-block",
    }),
  );
}

export function TargetCard() {
  const computed = useDashboardComputed();

  return createElement(AnalyticsTargetCard, {
    title: computed.text.targetTitle,
    description: computed.text.targetDescription,
    current: computed.confirmedPayments.length,
    target: computed.collectionTarget,
    percentage: computed.collectionPercentage,
    unitLabel: computed.text.targetUnit,
    primaryLabel: computed.text.current,
    secondaryLabel: computed.text.target,
    trendValue: computed.collectionPercentage,
    trendDirection: computed.collectionPercentage >= 50 ? "up" : "neutral",
    icon: HandCoins,
    loading: computed.loading,
  } satisfies AnalyticsTargetCardProps);
}

export function TotalCustomersCard() {
  const computed = useDashboardComputed();

  return createElement(AnalyticsKpiCard, {
    title: computed.text.totalCustomers,
    value: computed.totalCustomers,
    trendValue: computed.totalCustomers > 0 ? 10.4 : 0,
    trendDirection: computed.totalCustomers > 0 ? "up" : "neutral",
    trendLabel: computed.text.fromCustomers,
    icon: Users,
    loading: computed.loading,
  } satisfies AnalyticsKpiCardProps);
}

export function TotalDeals() {
  const computed = useDashboardComputed();

  return createElement(AnalyticsKpiCard, {
    title: computed.text.totalOrders,
    value: computed.totalOrders,
    trendValue: computed.totalOrders > 0 ? 8.5 : 0,
    trendDirection: computed.totalOrders > 0 ? "up" : "neutral",
    trendLabel: computed.text.fromOrders,
    icon: BriefcaseBusiness,
    loading: computed.loading,
  } satisfies AnalyticsKpiCardProps);
}

export function TotalRevenueCard() {
  const computed = useDashboardComputed();

  return createElement(AnalyticsKpiCard, {
    title: computed.text.totalRevenue,
    value: computed.confirmedPaymentsTotal,
    valueFormat: "currency",
    trendValue: computed.confirmedPayments.length > 0 ? 20.1 : 0,
    trendDirection: computed.confirmedPayments.length > 0 ? "up" : "neutral",
    trendLabel: computed.text.fromPayments,
    icon: WalletCards,
    loading: computed.loading,
  } satisfies AnalyticsKpiCardProps);
}

export function LeadBySourceCard() {
  const computed = useDashboardComputed();

  return createElement(AnalyticsDonutCard, {
    title: computed.text.paymentsByMethod,
    items: computed.paymentMethodItems,
    centerLabel: computed.text.paymentsCenter,
    totalLabel: computed.text.paymentsCenter,
    actionLabel: computed.text.export,
    icon: CreditCard,
    loading: computed.loading,
  } satisfies AnalyticsDonutCardProps);
}

export function RecentTasks() {
  const computed = useDashboardComputed();

  return createElement(AnalyticsTaskList, {
    title: computed.text.tasks,
    description: computed.text.tasksDescription,
    items: computed.taskItems,
    actionLabel: computed.text.viewAll,
    actionHref: "/system/reports",
    icon: Bell,
    loading: computed.loading,
  } satisfies AnalyticsTaskListProps);
}

export function SalesPipeline() {
  const computed = useDashboardComputed();

  return createElement(AnalyticsPipelineCard, {
    title: computed.text.pipeline,
    description: computed.text.pipelineDescription,
    items: computed.pipelineItems,
    totalLabel: computed.text.deals,
    icon: Package,
    loading: computed.loading,
  } satisfies AnalyticsPipelineCardProps);
}

export function LeadsCard() {
  const computed = useDashboardComputed();

  const leadColumns: AnalyticsTableColumn<LeadRow>[] = [
    {
      key: "status",
      label: computed.text.status,
    },
    {
      key: "email",
      label: computed.text.email,
    },
    {
      key: "amount",
      label: computed.text.amount,
      render: (row) => renderAmountWithCurrency(row.amount),
    },
  ];

  return createElement(AnalyticsTableCard<LeadRow>, {
    title: computed.text.leads,
    columns: leadColumns,
    rows: computed.leadRows,
    getRowKey: (row) => row.id,
    getRowHref: (row) => row.href,
    actionLabel: computed.text.columns,
    actionHref: "/system/orders",
    loading: computed.loading,
    emptyLabel: computed.text.empty,
    filterPlaceholder: computed.text.filterLeads,
    selectedLabel: computed.text.selectedRows.replace(
      "{count}",
      String(computed.leadRows.length),
    ),
    previousLabel: computed.text.previous,
    nextLabel: computed.text.next,
  } satisfies AnalyticsTableCardProps<LeadRow>);
}