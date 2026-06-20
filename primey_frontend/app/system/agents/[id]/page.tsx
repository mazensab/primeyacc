"use client";

/* ============================================================
   📂 primey_frontend/app/system/agents/[id]/page.tsx
   👤 Primey Care — Agent Details V4 Financial Statement + Login User
   ------------------------------------------------------------
   ✅ Approved Products/Customers premium pattern
   ✅ Real API only: GET /api/agents/{id}/?include_statement=1
   ✅ Shows Agent.user / login_user / profile after backend linking
   ✅ Shows AgentFinancialEntry statement:
      COD_CUSTODY / SALES_COMMISSION / DELIVERY_FEE / BROKER_SHARE
   ✅ Shows amount due from agent / due to agent / net balance
   ✅ Shows journal_entry_reference per movement
   ✅ Recent financial entries
   ✅ Legacy orders and commissions kept
   ✅ Web print
   ✅ SAR icon from /currency/sar.svg
   ✅ sonner toast
   ✅ RTL/LTR via primey-locale
   ✅ No localhost / no fake data
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Home,
  Landmark,
  Layers3,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Printer,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  TriangleAlert,
  UserCircle2,
  UserRound,
  UsersRound,
  WalletCards,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type LoginUserProfile = {
  id?: number | string | null;
  display_name?: string;
  user_type?: string;
  role?: string;
  phone_number?: string;
  whatsapp_number?: string;
  alternate_email?: string;
  preferred_language?: string;
  timezone?: string;
  extra_data?: Record<string, unknown>;
  tags?: unknown[];
};

type LoginUserRecord = {
  id?: number | string | null;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  last_login?: string | null;
  date_joined?: string | null;
  profile?: LoginUserProfile | null;
};

type FinancialSummary = {
  financial_entries_count: number;
  accounting_posted_count: number;

  total_debit_amount: number;
  total_credit_amount: number;
  total_debit_paid_amount: number;
  total_credit_paid_amount: number;
  total_debit_remaining_amount: number;
  total_credit_remaining_amount: number;
  net_balance_amount: number;

  cod_custody_amount: number;
  cod_custody_paid_amount: number;
  cod_custody_remaining_amount: number;

  sales_commission_amount: number;
  sales_commission_paid_amount: number;
  sales_commission_remaining_amount: number;

  delivery_fee_amount: number;
  delivery_fee_paid_amount: number;
  delivery_fee_remaining_amount: number;

  broker_share_amount: number;
  broker_share_paid_amount: number;
  broker_share_remaining_amount: number;

  settlements_amount: number;
  amount_due_from_agent: number;
  amount_due_to_agent: number;
  currency: string;
};

type AgentRecord = {
  id: number;
  full_name: string;
  name: string;
  agent_code: string;
  code: string;
  referral_code: string;
  status: string;
  phone: string;
  email: string;
  city: string;
  address: string;

  user_id: number | string | null;
  has_login_user: boolean;
  login_user: LoginUserRecord | null;

  broker_id: number | null;
  broker_name: string;
  broker_code: string;

  default_commission_type: string;
  default_commission_value: number;
  default_delivery_fee: number;

  bank_name: string;
  bank_account_name: string;
  iban: string;
  notes: string;

  total_customers: number;
  customers_count: number;
  total_orders: number;
  orders_count: number;
  total_sales: number;

  pending_commission: number;
  approved_commission: number;
  paid_commission: number;
  total_commission: number;
  due_commission: number;

  financial: FinancialSummary;

  created_at: string | null;
  updated_at: string | null;
};

type AgentOrderRecord = {
  id: number;
  order_id: number | null;
  order_number: string;
  agent_id: number | null;
  customer_id: number | null;
  customer_name: string;
  commission_type: string;
  commission_value: number;
  sales_amount: number;
  commission_amount: number;
  referral_code_used: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
};

type AgentCommissionRecord = {
  id: number;
  reference: string;
  status: string;
  commission_status: string;
  agent_id: number | null;
  agent_name: string;
  agent_code: string;
  referral_code: string;
  order_id: number | null;
  order_number: string;
  payment_id: number | null;
  payment_number: string;
  customer_id: number | null;
  customer_name: string;
  base_amount: number;
  amount: number;
  commission_amount: number;
  paid_amount: number;
  remaining_amount: number;
  journal_entry_id: number | null;
  journal_entry_reference: string;
  is_accounting_posted: boolean;
  earned_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  notes: string;
};

type FinancialEntryRecord = {
  id: number;
  entry_number: string;
  entry_type: string;
  entry_type_label: string;
  direction: string;
  direction_label: string;
  status: string;
  status_label: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  currency: string;
  debit_amount: number;
  credit_amount: number;

  order_id: number | null;
  order_number: string;
  payment_id: number | null;
  payment_number: string;
  commission_id: number | null;
  rule_id: number | null;

  description: string;
  reference: string;
  source_type: string;
  source_id: string;
  source_number: string;

  journal_entry_id: number | null;
  journal_entry_reference: string;
  journal_entry_number: string;
  is_accounting_posted: boolean;

  earned_at: string | null;
  approved_at: string | null;
  settled_at: string | null;
  paid_at: string | null;
  posted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type StatementLineRecord = {
  line_type: string;
  line_date: string | null;
  reference: string;
  related_order_id: number | null;
  related_agent_order_id: number | null;
  related_commission_id: number | null;
  related_financial_entry_id: number | null;
  description: string;
  debit_amount: number;
  credit_amount: number;
  balance_after: number;
  currency: string;
  status: string;
  metadata: ApiRecord;
};

type AgentApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  agent?: unknown;
  stats?: unknown;
  financial_summary?: unknown;
  recent_orders?: unknown[];
  recent_commissions?: unknown[];
  recent_financial_entries?: unknown[];
  statement?: unknown;
};

const SAR_ICON = "/currency/sar.svg";

const EMPTY_FINANCIAL: FinancialSummary = {
  financial_entries_count: 0,
  accounting_posted_count: 0,

  total_debit_amount: 0,
  total_credit_amount: 0,
  total_debit_paid_amount: 0,
  total_credit_paid_amount: 0,
  total_debit_remaining_amount: 0,
  total_credit_remaining_amount: 0,
  net_balance_amount: 0,

  cod_custody_amount: 0,
  cod_custody_paid_amount: 0,
  cod_custody_remaining_amount: 0,

  sales_commission_amount: 0,
  sales_commission_paid_amount: 0,
  sales_commission_remaining_amount: 0,

  delivery_fee_amount: 0,
  delivery_fee_paid_amount: 0,
  delivery_fee_remaining_amount: 0,

  broker_share_amount: 0,
  broker_share_paid_amount: 0,
  broker_share_remaining_amount: 0,

  settlements_amount: 0,
  amount_due_from_agent: 0,
  amount_due_to_agent: 0,
  currency: "SAR",
};

const translations = {
  ar: {
    title: "تفاصيل المندوب",
    subtitle: "ملف المندوب، كشف الحساب، العهدة، المستحقات، العمولات، وحركاته المالية.",
    back: "رجوع",
    refresh: "تحديث",
    print: "طباعة",
    actions: "الإجراءات",
    copyCode: "نسخ كود المندوب",
    copyReferral: "نسخ كود الإحالة",
    copyIban: "نسخ الآيبان",
    copied: "تم النسخ",
    overview: "نظرة عامة",
    orders: "الطلبات",
    commissions: "العمولات",
    statement: "كشف الحساب",
    entries: "الحركات المالية",
    bank: "الحساب البنكي",
    activity: "السجل",
    agentInfo: "بيانات المندوب",
    contactInfo: "بيانات التواصل",
    accountInfo: "حساب الدخول",
    accountStatus: "حالة حساب الدخول",
    linked: "مرتبط",
    missing: "بدون حساب",
    loginUsername: "اسم المستخدم",
    loginEmail: "بريد الحساب",
    loginDisplayName: "اسم العرض",
    loginUserId: "معرّف الحساب",
    loginRole: "الدور",
    loginUserType: "نوع المستخدم",
    loginWorkspace: "المساحة",
    loginPhone: "جوال الحساب",
    loginWhatsapp: "واتساب الحساب",
    accountActive: "الحساب نشط",
    agentWorkspace: "مساحة المندوب",
    bankInfo: "البيانات البنكية",
    performance: "الأداء",
    financialPosition: "المركز المالي للمندوب",
    notes: "الملاحظات",
    noNotes: "لا توجد ملاحظات.",
    fullName: "اسم المندوب",
    agentCode: "كود المندوب",
    referralCode: "كود الإحالة",
    broker: "الوسيط",
    status: "الحالة",
    phone: "الجوال",
    email: "البريد",
    city: "المدينة",
    address: "العنوان",
    commissionType: "نوع العمولة",
    commissionValue: "قيمة العمولة",
    deliveryFee: "عمولة التوصيل",
    percentage: "نسبة",
    fixed: "مبلغ ثابت",
    bankName: "اسم البنك",
    bankAccountName: "اسم صاحب الحساب",
    iban: "الآيبان",

    totalSales: "إجمالي المبيعات",
    totalOrders: "إجمالي الطلبات",
    totalCustomers: "إجمالي العملاء",
    dueCommission: "المستحقات القديمة",
    pendingCommission: "عمولة معلقة",
    approvedCommission: "عمولة معتمدة",
    paidCommission: "عمولة مدفوعة",
    totalCommission: "إجمالي العمولات القديمة",

    codCustody: "عهدة COD",
    salesCommission: "عمولة البيع",
    deliveryFeeAmount: "مستحق التوصيل",
    brokerShare: "حصة الوسيط",
    dueFromAgent: "المستحق على المندوب",
    dueToAgent: "المستحق للمندوب",
    netBalance: "الصافي",
    accountingPosted: "مرحّل محاسبيًا",
    financialEntriesCount: "عدد الحركات المالية",
    debitTotal: "إجمالي مدين",
    creditTotal: "إجمالي دائن",

    orderNumber: "رقم الطلب",
    customer: "العميل",
    salesAmount: "مبلغ البيع",
    commissionAmount: "العمولة",
    paidAmount: "المسدد",
    remainingAmount: "المتبقي",
    commissionStatus: "حالة العمولة",
    payment: "الدفعة",
    earnedAt: "تاريخ الاستحقاق",
    approvedAt: "تاريخ الاعتماد",
    paidAt: "تاريخ الدفع",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    postedAt: "تاريخ الترحيل",
    reference: "المرجع",
    description: "الوصف",
    debit: "مدين",
    credit: "دائن",
    balance: "الرصيد",
    date: "التاريخ",
    type: "النوع",
    journal: "القيد",
    source: "المصدر",

    approveCommission: "اعتماد العمولة",
    confirmApprove: "هل تريد اعتماد هذه العمولة؟",
    approveSuccess: "تم اعتماد العمولة بنجاح.",
    operationFailed: "تعذر تنفيذ العملية.",
    openOrder: "فتح الطلب",
    openCustomer: "فتح العميل",
    openPayment: "فتح الدفعة",

    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    draft: "مسودة",
    pending: "معلق",
    approved: "معتمد",
    paid: "مدفوع",
    settled: "مسوى",
    earned: "مستحق",
    cancelled: "ملغي",
    reversed: "معكوس",
    unknown: "غير معروف",

    noOrdersTitle: "لا توجد طلبات",
    noOrdersDesc: "لم يتم ربط طلبات بهذا المندوب بعد.",
    noCommissionsTitle: "لا توجد عمولات",
    noCommissionsDesc: "لم يتم تسجيل عمولات لهذا المندوب بعد.",
    noStatementTitle: "لا توجد حركات",
    noStatementDesc: "لم يرجع كشف الحساب أي حركات لهذا المندوب.",
    noEntriesTitle: "لا توجد حركات مالية",
    noEntriesDesc: "لا توجد حركات مالية تفصيلية لهذا المندوب.",
    errorTitle: "تعذر تحميل تفاصيل المندوب",
    errorDesc: "تأكد من تشغيل الخادم ثم أعد المحاولة.",
    notFoundTitle: "المندوب غير موجود",
    notFoundDesc: "لم يتم العثور على المندوب المطلوب.",
    tryAgain: "إعادة المحاولة",
    printTitle: "تقرير المندوب",
    generatedAt: "تاريخ الإنشاء",
  },
  en: {
    title: "Agent details",
    subtitle: "Agent profile, statement, custody, dues, commissions, and financial movements.",
    back: "Back",
    refresh: "Refresh",
    print: "Print",
    actions: "Actions",
    copyCode: "Copy agent code",
    copyReferral: "Copy referral code",
    copyIban: "Copy IBAN",
    copied: "Copied",
    overview: "Overview",
    orders: "Orders",
    commissions: "Commissions",
    statement: "Statement",
    entries: "Financial entries",
    bank: "Bank account",
    activity: "Activity",
    agentInfo: "Agent info",
    contactInfo: "Contact info",
    accountInfo: "Login account",
    accountStatus: "Login account status",
    linked: "Linked",
    missing: "No account",
    loginUsername: "Username",
    loginEmail: "Account email",
    loginDisplayName: "Display name",
    loginUserId: "User ID",
    loginRole: "Role",
    loginUserType: "User type",
    loginWorkspace: "Workspace",
    loginPhone: "Account phone",
    loginWhatsapp: "Account WhatsApp",
    accountActive: "Account active",
    agentWorkspace: "Agent workspace",
    bankInfo: "Bank info",
    performance: "Performance",
    financialPosition: "Agent financial position",
    notes: "Notes",
    noNotes: "No notes.",
    fullName: "Agent name",
    agentCode: "Agent code",
    referralCode: "Referral code",
    broker: "Broker",
    status: "Status",
    phone: "Phone",
    email: "Email",
    city: "City",
    address: "Address",
    commissionType: "Commission type",
    commissionValue: "Commission value",
    deliveryFee: "Delivery fee",
    percentage: "Percentage",
    fixed: "Fixed",
    bankName: "Bank name",
    bankAccountName: "Account holder",
    iban: "IBAN",

    totalSales: "Total sales",
    totalOrders: "Total orders",
    totalCustomers: "Total customers",
    dueCommission: "Legacy dues",
    pendingCommission: "Pending commission",
    approvedCommission: "Approved commission",
    paidCommission: "Paid commission",
    totalCommission: "Legacy commissions",

    codCustody: "COD custody",
    salesCommission: "Sales commission",
    deliveryFeeAmount: "Delivery due",
    brokerShare: "Broker share",
    dueFromAgent: "Due from agent",
    dueToAgent: "Due to agent",
    netBalance: "Net balance",
    accountingPosted: "Accounting posted",
    financialEntriesCount: "Financial entries",
    debitTotal: "Total debit",
    creditTotal: "Total credit",

    orderNumber: "Order number",
    customer: "Customer",
    salesAmount: "Sales amount",
    commissionAmount: "Commission",
    paidAmount: "Paid",
    remainingAmount: "Remaining",
    commissionStatus: "Commission status",
    payment: "Payment",
    earnedAt: "Earned at",
    approvedAt: "Approved at",
    paidAt: "Paid at",
    createdAt: "Created at",
    updatedAt: "Updated at",
    postedAt: "Posted at",
    reference: "Reference",
    description: "Description",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    date: "Date",
    type: "Type",
    journal: "Journal",
    source: "Source",

    approveCommission: "Approve commission",
    confirmApprove: "Do you want to approve this commission?",
    approveSuccess: "Commission approved successfully.",
    operationFailed: "Unable to complete operation.",
    openOrder: "Open order",
    openCustomer: "Open customer",
    openPayment: "Open payment",

    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    draft: "Draft",
    pending: "Pending",
    approved: "Approved",
    paid: "Paid",
    settled: "Settled",
    earned: "Earned",
    cancelled: "Cancelled",
    reversed: "Reversed",
    unknown: "Unknown",

    noOrdersTitle: "No orders",
    noOrdersDesc: "No orders have been linked to this agent yet.",
    noCommissionsTitle: "No commissions",
    noCommissionsDesc: "No commissions were recorded for this agent yet.",
    noStatementTitle: "No statement",
    noStatementDesc: "No statement data was returned for this agent.",
    noEntriesTitle: "No financial entries",
    noEntriesDesc: "No detailed financial entries were returned for this agent.",
    errorTitle: "Unable to load agent details",
    errorDesc: "Make sure the backend is running, then try again.",
    notFoundTitle: "Agent not found",
    notFoundDesc: "The requested agent could not be found.",
    tryAgain: "Try again",
    printTitle: "Agent report",
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

function makeApiUrl(path: string, params?: URLSearchParams) {
  const base = getApiBaseUrl();
  const query = params?.toString();

  return `${base}${path}${query ? `?${query}` : ""}`;
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

async function fetchJson<T>(
  url: string,
  options?: {
    signal?: AbortSignal;
    method?: "GET" | "POST";
    body?: unknown;
  },
): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    method: options?.method || "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal: options?.signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options?.method === "POST" ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method === "POST"
        ? JSON.stringify(options.body || {})
        : undefined,
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
    financial_entries_count: toNumber(item.financial_entries_count),
    accounting_posted_count: toNumber(item.accounting_posted_count),

    total_debit_amount: toNumber(item.total_debit_amount),
    total_credit_amount: toNumber(item.total_credit_amount),
    total_debit_paid_amount: toNumber(item.total_debit_paid_amount),
    total_credit_paid_amount: toNumber(item.total_credit_paid_amount),
    total_debit_remaining_amount: toNumber(item.total_debit_remaining_amount),
    total_credit_remaining_amount: toNumber(item.total_credit_remaining_amount),
    net_balance_amount: toNumber(item.net_balance_amount),

    cod_custody_amount: toNumber(item.cod_custody_amount),
    cod_custody_paid_amount: toNumber(item.cod_custody_paid_amount),
    cod_custody_remaining_amount: toNumber(item.cod_custody_remaining_amount),

    sales_commission_amount: toNumber(item.sales_commission_amount),
    sales_commission_paid_amount: toNumber(item.sales_commission_paid_amount),
    sales_commission_remaining_amount: toNumber(item.sales_commission_remaining_amount),

    delivery_fee_amount: toNumber(item.delivery_fee_amount),
    delivery_fee_paid_amount: toNumber(item.delivery_fee_paid_amount),
    delivery_fee_remaining_amount: toNumber(item.delivery_fee_remaining_amount),

    broker_share_amount: toNumber(item.broker_share_amount),
    broker_share_paid_amount: toNumber(item.broker_share_paid_amount),
    broker_share_remaining_amount: toNumber(item.broker_share_remaining_amount),

    settlements_amount: toNumber(item.settlements_amount),
    amount_due_from_agent: toNumber(item.amount_due_from_agent),
    amount_due_to_agent: toNumber(item.amount_due_to_agent),
    currency: normalizeText(item.currency, "SAR"),
  };
}

function extractAgentPayload(payload: AgentApiResponse): ApiRecord {
  const data = asRecord(payload.data);

  if (data.agent) return asRecord(data.agent);
  if (payload.agent) return asRecord(payload.agent);

  return data.id || data.full_name ? data : asRecord(payload);
}

function extractStatsPayload(payload: AgentApiResponse): ApiRecord {
  const data = asRecord(payload.data);
  return asRecord(data.stats || payload.stats);
}

function extractFinancialSummaryPayload(payload: AgentApiResponse): ApiRecord {
  const data = asRecord(payload.data);
  const agent = asRecord(data.agent || payload.agent);
  const stats = extractStatsPayload(payload);

  return asRecord(
    data.financial_summary ||
      payload.financial_summary ||
      agent.financial_summary ||
      stats,
  );
}

function normalizeAgent(value: unknown, summaryValue?: unknown): AgentRecord {
  const item = asRecord(value);
  const stats = asRecord(summaryValue);
  const fullName = normalizeText(
    item.full_name || item.name || item.agent_name,
    `#${normalizeText(item.id)}`,
  );
  const agentCode = normalizeText(item.agent_code || item.code);
  const financial = normalizeFinancialSummary(item.financial_summary || stats);
  const loginUser = isRecord(item.login_user) ? (item.login_user as LoginUserRecord) : null;

  const legacyTotalCommission = toNumber(
    item.total_commission || stats.total_commission,
    toNumber(item.pending_commission || stats.pending_commission) +
      toNumber(item.approved_commission || stats.approved_commission) +
      toNumber(item.paid_commission || stats.paid_commission),
  );

  return {
    id: toNumber(item.id),
    full_name: fullName,
    name: fullName,
    agent_code: agentCode,
    code: agentCode,
    referral_code: normalizeText(item.referral_code || item.ref_code),
    status: normalizeText(item.status).toUpperCase(),
    phone: normalizeText(item.phone || item.mobile || item.phone_number),
    email: normalizeText(item.email),
    city: normalizeText(item.city),
    address: normalizeText(item.address),

    user_id:
      item.user_id === null || item.user_id === undefined
        ? loginUser?.id || null
        : (item.user_id as number | string),
    has_login_user: Boolean(item.has_login_user || item.user_id || loginUser?.id),
    login_user: loginUser,

    broker_id:
      item.broker_id === null || item.broker_id === undefined
        ? null
        : toNumber(item.broker_id),
    broker_name: normalizeText(item.broker_name || asRecord(item.broker).name),
    broker_code: normalizeText(item.broker_code || asRecord(item.broker).broker_code),

    default_commission_type: normalizeText(
      item.default_commission_type || item.commission_type,
    ).toUpperCase(),
    default_commission_value: toNumber(
      item.default_commission_value || item.commission_value,
    ),
    default_delivery_fee: toNumber(item.default_delivery_fee),

    bank_name: normalizeText(item.bank_name),
    bank_account_name: normalizeText(item.bank_account_name),
    iban: normalizeText(item.iban),
    notes: normalizeText(item.notes),

    total_customers: toNumber(item.total_customers || item.customers_count),
    customers_count: toNumber(item.customers_count || item.total_customers),
    total_orders: toNumber(item.total_orders || item.orders_count),
    orders_count: toNumber(item.orders_count || item.total_orders),
    total_sales: toNumber(item.total_sales || item.sales_total),

    pending_commission: toNumber(item.pending_commission || stats.pending_commission),
    approved_commission: toNumber(item.approved_commission || stats.approved_commission),
    paid_commission: toNumber(item.paid_commission || stats.paid_commission),
    total_commission: legacyTotalCommission,
    due_commission: toNumber(
      item.due_commission || stats.due_commission,
      Math.max(legacyTotalCommission - toNumber(item.paid_commission), 0),
    ),

    financial,

    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function normalizeAgentOrder(value: unknown): AgentOrderRecord {
  const item = asRecord(value);

  return {
    id: toNumber(item.id),
    order_id:
      item.order_id === null || item.order_id === undefined
        ? null
        : toNumber(item.order_id),
    order_number: normalizeText(item.order_number || asRecord(item.order).order_number),
    agent_id:
      item.agent_id === null || item.agent_id === undefined
        ? null
        : toNumber(item.agent_id),
    customer_id:
      item.customer_id === null || item.customer_id === undefined
        ? null
        : toNumber(item.customer_id),
    customer_name: normalizeText(item.customer_name || asRecord(item.customer).name),
    commission_type: normalizeText(item.commission_type).toUpperCase(),
    commission_value: toNumber(item.commission_value),
    sales_amount: toNumber(item.sales_amount),
    commission_amount: toNumber(item.commission_amount),
    referral_code_used: normalizeText(item.referral_code_used),
    notes: normalizeText(item.notes),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function normalizeCommission(value: unknown): AgentCommissionRecord {
  const item = asRecord(value);

  return {
    id: toNumber(item.id),
    reference: normalizeText(item.reference || `COM-${normalizeText(item.id)}`),
    status: normalizeText(item.status || item.commission_status).toUpperCase(),
    commission_status: normalizeText(item.commission_status || item.status).toUpperCase(),
    agent_id:
      item.agent_id === null || item.agent_id === undefined
        ? null
        : toNumber(item.agent_id),
    agent_name: normalizeText(item.agent_name),
    agent_code: normalizeText(item.agent_code),
    referral_code: normalizeText(item.referral_code),
    order_id:
      item.order_id === null || item.order_id === undefined
        ? null
        : toNumber(item.order_id),
    order_number: normalizeText(item.order_number),
    payment_id:
      item.payment_id === null || item.payment_id === undefined
        ? null
        : toNumber(item.payment_id),
    payment_number: normalizeText(item.payment_number),
    customer_id:
      item.customer_id === null || item.customer_id === undefined
        ? null
        : toNumber(item.customer_id),
    customer_name: normalizeText(item.customer_name),
    base_amount: toNumber(item.base_amount),
    amount: toNumber(item.amount || item.commission_amount),
    commission_amount: toNumber(item.commission_amount || item.amount),
    paid_amount: toNumber(item.paid_amount),
    remaining_amount: toNumber(item.remaining_amount),
    journal_entry_id:
      item.journal_entry_id === null || item.journal_entry_id === undefined
        ? null
        : toNumber(item.journal_entry_id),
    journal_entry_reference: normalizeText(item.journal_entry_reference),
    is_accounting_posted: Boolean(item.is_accounting_posted),
    earned_at: normalizeText(item.earned_at) || null,
    approved_at: normalizeText(item.approved_at) || null,
    paid_at: normalizeText(item.paid_at) || null,
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
    notes: normalizeText(item.notes),
  };
}

function normalizeFinancialEntry(value: unknown): FinancialEntryRecord {
  const item = asRecord(value);

  return {
    id: toNumber(item.id),
    entry_number: normalizeText(item.entry_number),
    entry_type: normalizeText(item.entry_type).toUpperCase(),
    entry_type_label: normalizeText(item.entry_type_label || item.entry_type),
    direction: normalizeText(item.direction).toUpperCase(),
    direction_label: normalizeText(item.direction_label || item.direction),
    status: normalizeText(item.status).toUpperCase(),
    status_label: normalizeText(item.status_label || item.status),
    amount: toNumber(item.amount),
    paid_amount: toNumber(item.paid_amount),
    remaining_amount: toNumber(item.remaining_amount),
    currency: normalizeText(item.currency, "SAR"),
    debit_amount: toNumber(item.debit_amount),
    credit_amount: toNumber(item.credit_amount),

    order_id:
      item.order_id === null || item.order_id === undefined
        ? null
        : toNumber(item.order_id),
    order_number: normalizeText(item.order_number),
    payment_id:
      item.payment_id === null || item.payment_id === undefined
        ? null
        : toNumber(item.payment_id),
    payment_number: normalizeText(item.payment_number),
    commission_id:
      item.commission_id === null || item.commission_id === undefined
        ? null
        : toNumber(item.commission_id),
    rule_id:
      item.rule_id === null || item.rule_id === undefined ? null : toNumber(item.rule_id),

    description: normalizeText(item.description),
    reference: normalizeText(item.reference),
    source_type: normalizeText(item.source_type),
    source_id: normalizeText(item.source_id),
    source_number: normalizeText(item.source_number),

    journal_entry_id:
      item.journal_entry_id === null || item.journal_entry_id === undefined
        ? null
        : toNumber(item.journal_entry_id),
    journal_entry_reference: normalizeText(
      item.journal_entry_reference || item.journal_entry_number,
    ),
    journal_entry_number: normalizeText(item.journal_entry_number),
    is_accounting_posted: Boolean(item.is_accounting_posted),
    earned_at: normalizeText(item.earned_at) || null,
    approved_at: normalizeText(item.approved_at) || null,
    settled_at: normalizeText(item.settled_at) || null,
    paid_at: normalizeText(item.paid_at) || null,
    posted_at: normalizeText(item.posted_at) || null,
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function normalizeStatementLine(value: unknown, index: number): StatementLineRecord {
  const item = asRecord(value);
  const metadata = asRecord(item.metadata);

  return {
    line_type: normalizeText(item.line_type || item.type || metadata.entry_type).toUpperCase(),
    line_date: normalizeText(item.line_date || item.date || item.created_at) || null,
    reference: normalizeText(item.reference || metadata.entry_number),
    related_order_id:
      item.related_order_id === null || item.related_order_id === undefined
        ? metadata.order_id === null || metadata.order_id === undefined
          ? null
          : toNumber(metadata.order_id)
        : toNumber(item.related_order_id),
    related_agent_order_id:
      item.related_agent_order_id === null || item.related_agent_order_id === undefined
        ? null
        : toNumber(item.related_agent_order_id),
    related_commission_id:
      item.related_commission_id === null || item.related_commission_id === undefined
        ? metadata.commission_id === null || metadata.commission_id === undefined
          ? null
          : toNumber(metadata.commission_id)
        : toNumber(item.related_commission_id),
    related_financial_entry_id:
      item.related_financial_entry_id === null || item.related_financial_entry_id === undefined
        ? metadata.entry_id === null || metadata.entry_id === undefined
          ? index
          : toNumber(metadata.entry_id)
        : toNumber(item.related_financial_entry_id),
    description: normalizeText(item.description || metadata.description || metadata.entry_type_label),
    debit_amount: toNumber(item.debit_amount || item.debit),
    credit_amount: toNumber(item.credit_amount || item.credit),
    balance_after: toNumber(item.balance_after || item.balance),
    currency: normalizeText(item.currency || metadata.currency, "SAR"),
    status: normalizeText(item.status || metadata.status).toUpperCase(),
    metadata,
  };
}

function extractRecentOrders(payload: AgentApiResponse): AgentOrderRecord[] {
  const data = asRecord(payload.data);

  const candidates = [
    data.recent_orders,
    payload.recent_orders,
    data.orders,
    asRecord(data.statement).orders,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(normalizeAgentOrder);
  }

  return [];
}

function extractRecentCommissions(payload: AgentApiResponse): AgentCommissionRecord[] {
  const data = asRecord(payload.data);

  const candidates = [
    data.recent_commissions,
    payload.recent_commissions,
    data.commissions,
    asRecord(data.statement).commissions,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(normalizeCommission);
  }

  return [];
}

function extractRecentFinancialEntries(payload: AgentApiResponse): FinancialEntryRecord[] {
  const data = asRecord(payload.data);

  const candidates = [
    data.recent_financial_entries,
    payload.recent_financial_entries,
    data.financial_entries,
    data.entries,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(normalizeFinancialEntry);
  }

  return [];
}

function extractStatementRows(payload: AgentApiResponse): StatementLineRecord[] {
  const data = asRecord(payload.data);
  const statement = asRecord(data.statement || payload.statement);

  const candidates = [
    statement.lines,
    statement.rows,
    statement.items,
    statement.results,
    statement.entries,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(normalizeStatementLine);
  }

  return [];
}

function getStatusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "ACTIVE") return t.active;
  if (normalized === "INACTIVE") return t.inactive;
  if (normalized === "SUSPENDED") return t.suspended;
  if (normalized === "DRAFT") return t.draft;
  if (normalized === "PENDING") return t.pending;
  if (normalized === "APPROVED") return t.approved;
  if (normalized === "PAID") return t.paid;
  if (normalized === "SETTLED") return t.settled;
  if (normalized === "EARNED") return t.earned;
  if (normalized === "CANCELLED") return t.cancelled;
  if (normalized === "REVERSED") return t.reversed;

  return normalized || t.unknown;
}

function getStatusClass(status: string) {
  const normalized = normalizeText(status).toUpperCase();

  if (["ACTIVE", "PAID", "SETTLED"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["APPROVED", "EARNED"].includes(normalized)) {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  if (["PENDING", "DRAFT"].includes(normalized)) {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  if (["SUSPENDED", "CANCELLED", "REVERSED"].includes(normalized)) {
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

function getEntryTypeLabel(type: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(type).toUpperCase();

  if (normalized === "COD_CUSTODY") return t.codCustody;
  if (normalized === "SALES_COMMISSION") return t.salesCommission;
  if (normalized === "DELIVERY_FEE") return t.deliveryFeeAmount;
  if (normalized === "BROKER_SHARE") return t.brokerShare;

  return normalized || t.unknown;
}

function hasAgentAccount(agent: AgentRecord | null) {
  return Boolean(agent?.has_login_user || agent?.user_id || agent?.login_user?.id);
}

function getAgentLoginUser(agent: AgentRecord | null): LoginUserRecord | null {
  if (!agent?.login_user) return null;
  return agent.login_user;
}

function getAgentLoginProfile(agent: AgentRecord | null): LoginUserProfile | null {
  return getAgentLoginUser(agent)?.profile || null;
}

function getAgentLoginUsername(agent: AgentRecord | null) {
  return getAgentLoginUser(agent)?.username || "";
}

function getAgentLoginEmail(agent: AgentRecord | null) {
  return getAgentLoginUser(agent)?.email || agent?.email || "";
}

function getAgentProfileWorkspace(profile: LoginUserProfile | null) {
  const extraData = profile?.extra_data || {};
  const workspaceValue = extraData.workspace;

  return typeof workspaceValue === "string" ? workspaceValue : "";
}

function canApproveCommission(commission: AgentCommissionRecord) {
  return commission.id > 0 && commission.commission_status === "PENDING";
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

function DirectionBadge({ direction }: { direction: string }) {
  const normalized = normalizeText(direction).toUpperCase();
  const isDebit = normalized === "DEBIT";

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        isDebit
          ? "border-red-500/30 bg-red-50 text-red-700"
          : "border-emerald-500/30 bg-emerald-50 text-emerald-700",
      )}
    >
      {isDebit ? "DR" : "CR"}
    </Badge>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-start text-sm font-medium text-foreground">
        {children || value || "—"}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "debit" | "credit" | "net";
}) {
  const toneClass =
    tone === "debit"
      ? "bg-red-50 text-red-700"
      : tone === "credit"
        ? "bg-emerald-50 text-emerald-700"
        : tone === "net"
          ? "bg-purple-50 text-purple-700"
          : "bg-background text-muted-foreground";

  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[104px] px-6 py-5">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>

        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground">
          {value}
        </CardTitle>

        <CardAction>
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", toneClass)}>
            <Icon className="h-4 w-4" />
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="rounded-lg border bg-card shadow-none">
                <CardHeader className="min-h-[104px] px-6 py-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-28" />
                </CardHeader>
              </Card>
            ))}
          </div>
          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SystemAgentDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const agentId = normalizeText(params?.id);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [agent, setAgent] = React.useState<AgentRecord | null>(null);
  const [orders, setOrders] = React.useState<AgentOrderRecord[]>([]);
  const [commissions, setCommissions] = React.useState<AgentCommissionRecord[]>([]);
  const [financialEntries, setFinancialEntries] = React.useState<FinancialEntryRecord[]>([]);
  const [statementRows, setStatementRows] = React.useState<StatementLineRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<number | null>(null);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

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

  const loadAgent = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!agentId) {
        setLoading(false);
        setError(t.notFoundDesc);
        return;
      }

      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          include_statement: "1",
          include_financial_entries: "1",
          include_agent_orders: "1",
          include_commissions: "1",
        });

        const payload = await fetchJson<AgentApiResponse>(
          makeApiUrl(`/api/agents/${agentId}/`, params),
          { signal: controller.signal },
        );

        const nextAgent = normalizeAgent(
          extractAgentPayload(payload),
          extractFinancialSummaryPayload(payload),
        );

        setAgent(nextAgent.id ? nextAgent : null);
        setOrders(extractRecentOrders(payload));
        setCommissions(extractRecentCommissions(payload));
        setFinancialEntries(extractRecentFinancialEntries(payload));
        setStatementRows(extractStatementRows(payload));
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setAgent(null);
        setOrders([]);
        setCommissions([]);
        setFinancialEntries([]);
        setStatementRows([]);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [agentId, t.errorDesc, t.notFoundDesc],
  );

  React.useEffect(() => {
    void loadAgent();
  }, [loadAgent]);

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.operationFailed);
    }
  }

  async function approveCommission(commission: AgentCommissionRecord) {
    if (!window.confirm(t.confirmApprove)) return;

    setActionLoadingId(commission.id);

    try {
      await fetchJson<unknown>(
        makeApiUrl(`/api/agents/commissions/${commission.id}/approve/`),
        {
          method: "POST",
          body: {
            auto_post_accounting: true,
          },
        },
      );

      toast.success(t.approveSuccess);
      await loadAgent({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;

      toast.error(message);
    } finally {
      setActionLoadingId(null);
    }
  }

  function printPage() {
    if (!agent) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.operationFailed);
      return;
    }

    const loginUser = getAgentLoginUser(agent);
    const loginProfile = getAgentLoginProfile(agent);

    const statementHtml = statementRows.length
      ? statementRows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(formatDate(row.line_date))}</td>
                <td>${escapeHtml(getEntryTypeLabel(row.line_type, locale))}</td>
                <td>${escapeHtml(row.reference || "—")}</td>
                <td>${escapeHtml(row.description || "—")}</td>
                <td class="num">${escapeHtml(formatMoney(row.debit_amount))}</td>
                <td class="num">${escapeHtml(formatMoney(row.credit_amount))}</td>
                <td class="num">${escapeHtml(formatMoney(row.balance_after))}</td>
                <td>${escapeHtml(normalizeText(row.metadata?.journal_entry_reference || row.metadata?.journal_entry_number, "—"))}</td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="8">${escapeHtml(t.noStatementDesc)}</td></tr>`;

    printWindow.document.write(`
      <!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)} - ${escapeHtml(agent.full_name)}</title>
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
            h2 { margin: 18px 0 8px; font-size: 16px; }
            p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 10px;
              margin-bottom: 18px;
            }
            .box {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 10px;
            }
            .box span {
              display: block;
              color: #6b7280;
              font-size: 11px;
              margin-bottom: 4px;
            }
            .box strong {
              font-size: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              margin-bottom: 16px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px;
              text-align: ${locale === "ar" ? "right" : "left"};
              vertical-align: top;
            }
            th {
              background: #f9fafb;
              color: #374151;
              font-weight: 700;
            }
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
              <p>${escapeHtml(t.fullName)}: <strong>${escapeHtml(agent.full_name)}</strong></p>
              <p>${escapeHtml(t.agentCode)}: ${escapeHtml(agent.agent_code || "—")}</p>
              <p>${escapeHtml(t.referralCode)}: ${escapeHtml(agent.referral_code || "—")}</p>
              <p>${escapeHtml(t.broker)}: ${escapeHtml(agent.broker_name || "—")}</p>
              <p>${escapeHtml(t.accountStatus)}: ${escapeHtml(hasAgentAccount(agent) ? t.linked : t.missing)}</p>
              <p>${escapeHtml(t.loginUsername)}: ${escapeHtml(loginUser?.username || "—")}</p>
              <p>${escapeHtml(t.loginRole)}: ${escapeHtml(loginProfile?.role || "—")}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.codCustody)}</span><strong class="num">${escapeHtml(formatMoney(agent.financial.cod_custody_remaining_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.dueToAgent)}</span><strong class="num">${escapeHtml(formatMoney(agent.financial.amount_due_to_agent))}</strong></div>
            <div class="box"><span>${escapeHtml(t.netBalance)}</span><strong class="num">${escapeHtml(formatMoney(agent.financial.net_balance_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.accountingPosted)}</span><strong class="num">${escapeHtml(agent.financial.accounting_posted_count)}</strong></div>
          </div>

          <h2>${escapeHtml(t.agentInfo)}</h2>
          <table>
            <tbody>
              <tr><th>${escapeHtml(t.status)}</th><td>${escapeHtml(getStatusLabel(agent.status, locale))}</td></tr>
              <tr><th>${escapeHtml(t.phone)}</th><td>${escapeHtml(agent.phone || "—")}</td></tr>
              <tr><th>${escapeHtml(t.email)}</th><td>${escapeHtml(agent.email || "—")}</td></tr>
              <tr><th>${escapeHtml(t.city)}</th><td>${escapeHtml(agent.city || "—")}</td></tr>
              <tr><th>${escapeHtml(t.commissionType)}</th><td>${escapeHtml(getCommissionTypeLabel(agent.default_commission_type, locale))}</td></tr>
              <tr><th>${escapeHtml(t.commissionValue)}</th><td>${escapeHtml(agent.default_commission_type === "PERCENTAGE" ? `${formatMoney(agent.default_commission_value)}%` : formatMoney(agent.default_commission_value))}</td></tr>
            </tbody>
          </table>

          <h2>${escapeHtml(t.statement)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.reference)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.balance)}</th>
                <th>${escapeHtml(t.journal)}</th>
              </tr>
            </thead>
            <tbody>${statementHtml}</tbody>
          </table>

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
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 text-start">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>
        </div>

        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-red-200 bg-white">
              <TriangleAlert className="h-6 w-6 text-red-600" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-red-900">
                {error ? t.errorTitle : t.notFoundTitle}
              </p>
              <p className="text-sm text-red-700">
                {error || t.notFoundDesc}
              </p>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadAgent()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const agentAccountLinked = hasAgentAccount(agent);
  const loginUser = getAgentLoginUser(agent);
  const loginProfile = getAgentLoginProfile(agent);

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
          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadAgent({ silent: true })}
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90">
                <MoreHorizontal className="h-4 w-4" />
                {t.actions}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
              <DropdownMenuItem onClick={() => void copyValue(agent.agent_code)}>
                <Copy className="h-4 w-4" />
                {t.copyCode}
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => void copyValue(agent.referral_code)}>
                <ShieldCheck className="h-4 w-4" />
                {t.copyReferral}
              </DropdownMenuItem>

              {agent.iban ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void copyValue(agent.iban)}>
                    <Landmark className="h-4 w-4" />
                    {t.copyIban}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-4 px-6 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
              <UserRound className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate text-xl font-bold">
                {agent.full_name}
              </CardTitle>
              <CardDescription className="truncate">
                {agent.agent_code || "—"} · {agent.referral_code || "—"}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={agent.status} locale={locale} />
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  agentAccountLinked
                    ? "border-violet-500/30 bg-violet-50 text-violet-700"
                    : "border-muted bg-muted/40 text-muted-foreground",
                )}
              >
                <UserCircle2 className="me-1 h-3.5 w-3.5" />
                {agentAccountLinked ? t.linked : t.missing}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium"
              >
                {getCommissionTypeLabel(agent.default_commission_type, locale)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-2 px-6 pb-6">
            <InfoRow label={t.broker} value={agent.broker_name || "—"} />
            <InfoRow label={t.accountStatus}>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full",
                  agentAccountLinked
                    ? "border-violet-500/30 bg-violet-50 text-violet-700"
                    : "border-muted bg-muted/40 text-muted-foreground",
                )}
              >
                {agentAccountLinked ? t.linked : t.missing}
              </Badge>
            </InfoRow>
            <InfoRow label={t.codCustody}>
              <MoneyValue value={agent.financial.cod_custody_remaining_amount} />
            </InfoRow>
            <InfoRow label={t.dueToAgent}>
              <MoneyValue value={agent.financial.amount_due_to_agent} />
            </InfoRow>
            <InfoRow label={t.netBalance}>
              <MoneyValue value={agent.financial.net_balance_amount} />
            </InfoRow>
            <InfoRow label={t.totalOrders} value={formatInteger(agent.total_orders)} />
            <InfoRow label={t.totalCustomers} value={formatInteger(agent.total_customers)} />
            <InfoRow label={t.accountingPosted} value={formatInteger(agent.financial.accounting_posted_count)} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title={t.dueFromAgent}
              value={<MoneyValue value={agent.financial.amount_due_from_agent} />}
              icon={WalletCards}
              tone="debit"
            />
            <MetricCard
              title={t.dueToAgent}
              value={<MoneyValue value={agent.financial.amount_due_to_agent} />}
              icon={BadgePercent}
              tone="credit"
            />
            <MetricCard
              title={t.netBalance}
              value={<MoneyValue value={agent.financial.net_balance_amount} />}
              icon={Banknote}
              tone="net"
            />
            <MetricCard
              title={t.accountingPosted}
              value={formatInteger(agent.financial.accounting_posted_count)}
              icon={ReceiptText}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title={t.codCustody}
              value={<MoneyValue value={agent.financial.cod_custody_remaining_amount} />}
              icon={WalletCards}
              tone="debit"
            />
            <MetricCard
              title={t.salesCommission}
              value={<MoneyValue value={agent.financial.sales_commission_remaining_amount} />}
              icon={BadgePercent}
              tone="credit"
            />
            <MetricCard
              title={t.deliveryFeeAmount}
              value={<MoneyValue value={agent.financial.delivery_fee_remaining_amount} />}
              icon={ShoppingCart}
              tone="credit"
            />
            <MetricCard
              title={t.financialEntriesCount}
              value={formatInteger(agent.financial.financial_entries_count)}
              icon={Layers3}
            />
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardContent className="p-4">
                <TabsList className="h-auto flex-wrap justify-start rounded-lg bg-muted/40 p-1">
                  <TabsTrigger value="overview" className="rounded-md">
                    <Eye className="h-4 w-4" />
                    {t.overview}
                  </TabsTrigger>
                  <TabsTrigger value="statement" className="rounded-md">
                    <ReceiptText className="h-4 w-4" />
                    {t.statement}
                  </TabsTrigger>
                  <TabsTrigger value="entries" className="rounded-md">
                    <Layers3 className="h-4 w-4" />
                    {t.entries}
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="rounded-md">
                    <ShoppingCart className="h-4 w-4" />
                    {t.orders}
                  </TabsTrigger>
                  <TabsTrigger value="commissions" className="rounded-md">
                    <BadgePercent className="h-4 w-4" />
                    {t.commissions}
                  </TabsTrigger>
                  <TabsTrigger value="bank" className="rounded-md">
                    <Landmark className="h-4 w-4" />
                    {t.bank}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="rounded-md">
                    <CalendarDays className="h-4 w-4" />
                    {t.activity}
                  </TabsTrigger>
                </TabsList>
              </CardContent>
            </Card>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.agentInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.fullName} value={agent.full_name} />
                    <InfoRow label={t.agentCode} value={agent.agent_code || "—"} />
                    <InfoRow label={t.referralCode} value={agent.referral_code || "—"} />
                    <InfoRow label={t.broker} value={agent.broker_name || "—"} />
                    <InfoRow label={t.status}>
                      <StatusBadge status={agent.status} locale={locale} />
                    </InfoRow>
                    <InfoRow
                      label={t.commissionType}
                      value={getCommissionTypeLabel(agent.default_commission_type, locale)}
                    />
                    <InfoRow
                      label={t.commissionValue}
                      value={
                        agent.default_commission_type === "PERCENTAGE"
                          ? `${formatMoney(agent.default_commission_value)}%`
                          : <MoneyValue value={agent.default_commission_value} />
                      }
                    />
                    <InfoRow label={t.deliveryFee}>
                      <MoneyValue value={agent.default_delivery_fee} />
                    </InfoRow>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.accountInfo}</CardTitle>
                    <CardDescription>
                      {getAgentLoginUsername(agent) || agent.user_id || "—"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.accountStatus}>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full",
                          agentAccountLinked
                            ? "border-violet-500/30 bg-violet-50 text-violet-700"
                            : "border-muted bg-muted/40 text-muted-foreground",
                        )}
                      >
                        <UserCircle2 className="me-1 h-3.5 w-3.5" />
                        {agentAccountLinked ? t.linked : t.missing}
                      </Badge>
                    </InfoRow>

                    <InfoRow label={t.loginUsername} value={getAgentLoginUsername(agent) || "—"} />
                    <InfoRow label={t.loginEmail} value={getAgentLoginEmail(agent) || "—"} />
                    <InfoRow
                      label={t.loginDisplayName}
                      value={loginUser?.full_name || loginProfile?.display_name || "—"}
                    />
                    <InfoRow label={t.loginUserId} value={String(loginUser?.id || agent.user_id || "—")} />
                    <InfoRow label={t.accountActive}>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full",
                          loginUser?.is_active
                            ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                            : "border-muted bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {loginUser?.is_active ? t.active : t.inactive}
                      </Badge>
                    </InfoRow>
                    <InfoRow label={t.loginUserType} value={loginProfile?.user_type || "—"} />
                    <InfoRow label={t.loginRole} value={loginProfile?.role || "—"} />
                    <InfoRow
                      label={t.loginWorkspace}
                      value={getAgentProfileWorkspace(loginProfile) || t.agentWorkspace}
                    />
                    <InfoRow label={t.loginPhone} value={loginProfile?.phone_number || "—"} />
                    <InfoRow label={t.loginWhatsapp} value={loginProfile?.whatsapp_number || "—"} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.financialPosition}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.debitTotal}>
                      <MoneyValue value={agent.financial.total_debit_amount} />
                    </InfoRow>
                    <InfoRow label={t.creditTotal}>
                      <MoneyValue value={agent.financial.total_credit_amount} />
                    </InfoRow>
                    <InfoRow label={t.codCustody}>
                      <MoneyValue value={agent.financial.cod_custody_remaining_amount} />
                    </InfoRow>
                    <InfoRow label={t.salesCommission}>
                      <MoneyValue value={agent.financial.sales_commission_remaining_amount} />
                    </InfoRow>
                    <InfoRow label={t.deliveryFeeAmount}>
                      <MoneyValue value={agent.financial.delivery_fee_remaining_amount} />
                    </InfoRow>
                    <InfoRow label={t.netBalance}>
                      <MoneyValue value={agent.financial.net_balance_amount} />
                    </InfoRow>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.contactInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.phone} value={agent.phone || "—"} />
                    <InfoRow label={t.email} value={agent.email || "—"} />
                    <InfoRow label={t.city} value={agent.city || "—"} />
                    <InfoRow label={t.address} value={agent.address || "—"} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none xl:col-span-2">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.notes}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <div className="min-h-[140px] rounded-lg border bg-background p-4">
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {agent.notes || t.noNotes}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="statement" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardContent className="p-4">
                  <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[1160px] table-fixed">
                        <TableHeader>
                          <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-[120px] px-4 text-start">{t.date}</TableHead>
                            <TableHead className="w-[150px] px-4 text-start">{t.type}</TableHead>
                            <TableHead className="w-[150px] px-4 text-start">{t.reference}</TableHead>
                            <TableHead className="w-[260px] px-4 text-start">{t.description}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.debit}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.credit}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.balance}</TableHead>
                            <TableHead className="w-[150px] px-4 text-start">{t.journal}</TableHead>
                            <TableHead className="w-[110px] px-4 text-start">{t.status}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statementRows.length ? (
                            statementRows.map((row, index) => (
                              <TableRow key={`${row.related_financial_entry_id}-${row.reference}-${index}`} className="h-[62px]">
                                <TableCell className="px-4 text-start tabular-nums text-muted-foreground">
                                  {formatDate(row.line_date)}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <Badge variant="outline" className="rounded-full bg-muted/40">
                                    {getEntryTypeLabel(row.line_type, locale)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-4 text-start font-medium">
                                  {row.reference || "—"}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <p className="line-clamp-2">{row.description || "—"}</p>
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <MoneyValue value={row.debit_amount} />
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <MoneyValue value={row.credit_amount} />
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <MoneyValue value={row.balance_after} />
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  {normalizeText(row.metadata?.journal_entry_reference || row.metadata?.journal_entry_number) || "—"}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <StatusBadge status={row.status} locale={locale} />
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={9}>
                                <EmptyBlock
                                  icon={ReceiptText}
                                  title={t.noStatementTitle}
                                  description={t.noStatementDesc}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="entries" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardContent className="p-4">
                  <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[1180px] table-fixed">
                        <TableHeader>
                          <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-[140px] px-4 text-start">{t.reference}</TableHead>
                            <TableHead className="w-[150px] px-4 text-start">{t.type}</TableHead>
                            <TableHead className="w-[90px] px-4 text-start">{t.debit}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.credit}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.paidAmount}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.remainingAmount}</TableHead>
                            <TableHead className="w-[150px] px-4 text-start">{t.orderNumber}</TableHead>
                            <TableHead className="w-[150px] px-4 text-start">{t.journal}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.status}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {financialEntries.length ? (
                            financialEntries.map((entry) => (
                              <TableRow key={entry.id || entry.entry_number} className="h-[62px]">
                                <TableCell className="px-4 text-start font-medium">
                                  {entry.entry_number || "—"}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <Badge variant="outline" className="rounded-full bg-muted/40">
                                    {getEntryTypeLabel(entry.entry_type, locale)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <DirectionBadge direction={entry.direction} />
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <MoneyValue value={entry.amount} />
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <MoneyValue value={entry.paid_amount} />
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <MoneyValue value={entry.remaining_amount} />
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  {entry.order_id ? (
                                    <Link
                                      href={`/system/orders/${entry.order_id}`}
                                      className="hover:underline"
                                    >
                                      {entry.order_number || `#${entry.order_id}`}
                                    </Link>
                                  ) : (
                                    entry.order_number || "—"
                                  )}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  {entry.journal_entry_reference || "—"}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <StatusBadge status={entry.status} locale={locale} />
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={9}>
                                <EmptyBlock
                                  icon={Layers3}
                                  title={t.noEntriesTitle}
                                  description={t.noEntriesDesc}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardContent className="p-4">
                  <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[920px] table-fixed">
                        <TableHeader>
                          <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-[150px] px-4 text-start">{t.orderNumber}</TableHead>
                            <TableHead className="w-[180px] px-4 text-start">{t.customer}</TableHead>
                            <TableHead className="w-[130px] px-4 text-start">{t.salesAmount}</TableHead>
                            <TableHead className="w-[130px] px-4 text-start">{t.commissionType}</TableHead>
                            <TableHead className="w-[130px] px-4 text-start">{t.commissionValue}</TableHead>
                            <TableHead className="w-[130px] px-4 text-start">{t.commissionAmount}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.createdAt}</TableHead>
                            <TableHead className="w-[72px] px-4 text-center">{t.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.length ? (
                            orders.map((order) => (
                              <TableRow key={order.id || order.order_number} className="h-[62px]">
                                <TableCell className="px-4 text-start font-medium">
                                  {order.order_id ? (
                                    <Link href={`/system/orders/${order.order_id}`} className="hover:underline">
                                      {order.order_number || `#${order.order_id}`}
                                    </Link>
                                  ) : (
                                    order.order_number || "—"
                                  )}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  {order.customer_id ? (
                                    <Link
                                      href={`/system/customers/${order.customer_id}`}
                                      className="block truncate hover:underline"
                                    >
                                      {order.customer_name || "—"}
                                    </Link>
                                  ) : (
                                    <span className="block truncate">{order.customer_name || "—"}</span>
                                  )}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <MoneyValue value={order.sales_amount} />
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  {getCommissionTypeLabel(order.commission_type, locale)}
                                </TableCell>
                                <TableCell className="px-4 text-start tabular-nums">
                                  {order.commission_type === "PERCENTAGE"
                                    ? `${formatMoney(order.commission_value)}%`
                                    : formatMoney(order.commission_value)}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <MoneyValue value={order.commission_amount} />
                                </TableCell>
                                <TableCell className="px-4 text-start tabular-nums text-muted-foreground">
                                  {formatDate(order.created_at)}
                                </TableCell>
                                <TableCell className="px-4 text-center">
                                  {order.order_id ? (
                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                      <Link href={`/system/orders/${order.order_id}`}>
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={8}>
                                <EmptyBlock
                                  icon={ShoppingCart}
                                  title={t.noOrdersTitle}
                                  description={t.noOrdersDesc}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commissions" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardContent className="p-4">
                  <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[1220px] table-fixed">
                        <TableHeader>
                          <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-[130px] px-4 text-start">{t.reference}</TableHead>
                            <TableHead className="w-[140px] px-4 text-start">{t.orderNumber}</TableHead>
                            <TableHead className="w-[160px] px-4 text-start">{t.customer}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.salesAmount}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.commissionAmount}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.paidAmount}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.remainingAmount}</TableHead>
                            <TableHead className="w-[150px] px-4 text-start">{t.journal}</TableHead>
                            <TableHead className="w-[120px] px-4 text-start">{t.commissionStatus}</TableHead>
                            <TableHead className="w-[82px] px-4 text-center">{t.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {commissions.length ? (
                            commissions.map((commission) => (
                              <TableRow key={commission.id || commission.reference} className="h-[62px]">
                                <TableCell className="px-4 text-start font-medium">
                                  {commission.reference}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  {commission.order_id ? (
                                    <Link href={`/system/orders/${commission.order_id}`} className="block truncate hover:underline">
                                      {commission.order_number || `#${commission.order_id}`}
                                    </Link>
                                  ) : (
                                    <span className="block truncate">{commission.order_number || "—"}</span>
                                  )}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  {commission.customer_id ? (
                                    <Link
                                      href={`/system/customers/${commission.customer_id}`}
                                      className="block truncate hover:underline"
                                    >
                                      {commission.customer_name || "—"}
                                    </Link>
                                  ) : (
                                    <span className="block truncate">{commission.customer_name || "—"}</span>
                                  )}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <MoneyValue value={commission.base_amount} />
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <MoneyValue value={commission.commission_amount} />
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <MoneyValue value={commission.paid_amount} />
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <MoneyValue value={commission.remaining_amount} />
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  {commission.journal_entry_reference || "—"}
                                </TableCell>
                                <TableCell className="px-4 text-start">
                                  <StatusBadge status={commission.commission_status} locale={locale} />
                                </TableCell>
                                <TableCell className="px-4 text-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        disabled={actionLoadingId === commission.id}
                                      >
                                        {actionLoadingId === commission.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <MoreHorizontal className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align={locale === "ar" ? "start" : "end"}
                                      className="w-52"
                                    >
                                      {commission.order_id ? (
                                        <DropdownMenuItem asChild>
                                          <Link href={`/system/orders/${commission.order_id}`}>
                                            <ShoppingCart className="h-4 w-4" />
                                            {t.openOrder}
                                          </Link>
                                        </DropdownMenuItem>
                                      ) : null}

                                      {commission.payment_id ? (
                                        <DropdownMenuItem asChild>
                                          <Link href={`/system/payments/${commission.payment_id}`}>
                                            <WalletCards className="h-4 w-4" />
                                            {t.openPayment}
                                          </Link>
                                        </DropdownMenuItem>
                                      ) : null}

                                      {canApproveCommission(commission) ? (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => void approveCommission(commission)}>
                                            <CheckCircle2 className="h-4 w-4" />
                                            {t.approveCommission}
                                          </DropdownMenuItem>
                                        </>
                                      ) : null}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={10}>
                                <EmptyBlock
                                  icon={BadgePercent}
                                  title={t.noCommissionsTitle}
                                  description={t.noCommissionsDesc}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.bankInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.bankName} value={agent.bank_name || "—"} />
                    <InfoRow label={t.bankAccountName} value={agent.bank_account_name || "—"} />
                    <InfoRow label={t.iban}>
                      <span className="inline-flex items-center gap-2">
                        <span className="max-w-[220px] truncate">{agent.iban || "—"}</span>
                        {agent.iban ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg"
                            onClick={() => void copyValue(agent.iban)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </span>
                    </InfoRow>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.financialPosition}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.dueFromAgent}>
                      <MoneyValue value={agent.financial.amount_due_from_agent} />
                    </InfoRow>
                    <InfoRow label={t.dueToAgent}>
                      <MoneyValue value={agent.financial.amount_due_to_agent} />
                    </InfoRow>
                    <InfoRow label={t.netBalance}>
                      <MoneyValue value={agent.financial.net_balance_amount} />
                    </InfoRow>
                    <InfoRow label={t.accountingPosted} value={formatInteger(agent.financial.accounting_posted_count)} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-base">{t.activity}</CardTitle>
                  <CardDescription>{agent.full_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-5">
                  {[
                    {
                      label: t.createdAt,
                      value: formatDate(agent.created_at),
                      icon: UserRound,
                    },
                    {
                      label: t.updatedAt,
                      value: formatDate(agent.updated_at),
                      icon: RefreshCw,
                    },
                    {
                      label: t.accountStatus,
                      value: agentAccountLinked ? t.linked : t.missing,
                      icon: UserCircle2,
                    },
                    {
                      label: t.loginUsername,
                      value: getAgentLoginUsername(agent) || "—",
                      icon: Mail,
                    },
                    {
                      label: t.financialEntriesCount,
                      value: formatInteger(agent.financial.financial_entries_count),
                      icon: Layers3,
                    },
                    {
                      label: t.accountingPosted,
                      value: formatInteger(agent.financial.accounting_posted_count),
                      icon: FileText,
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="truncate font-medium">{item.label}</p>
                        </div>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}