"use client";

/* ============================================================
   📂 primey_frontend/app/system/customers/[id]/page.tsx
   🧭 Primey Care — Customer Details
   ------------------------------------------------------------
   ✅ Same visual spirit as approved Products + Customers pages
   ✅ Paid profile detail layout: profile card + main workspace
   ✅ Real API only:
      GET /api/customers/{id}/
      GET /api/customers/{id}/statement/
   ✅ Customer profile, contact, linked login account, address, notes
   ✅ Customer statement + orders/invoices/payments lines
   ✅ Internal UI components only
   ✅ No localhost
   ✅ No fake data
   ✅ RTL/LTR via primey-locale
   ✅ English numerals + English dates always
   ✅ SAR icon from /currency/sar.svg
   ✅ Shows Customer.user login_user/profile after backend linking
   ✅ Web print
   ============================================================ */

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  Copy,
  Eye,
  FileText,
  Home,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  TriangleAlert,
  User,
  UserCircle2,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type CustomerRecord = {
  id: number | string;
  customer_code?: string;
  customer_type?: string;
  status?: string;
  source?: string;

  user_id?: number | string | null;
  user_username?: string;
  login_user?: LoginUserRecord | null;
  has_customer_account?: boolean;
  normalized_phone?: string;
  login_identifier?: string;
  is_phone_verified?: boolean;
  is_whatsapp_verified?: boolean;
  phone_verified_at?: string | null;
  whatsapp_verified_at?: string | null;
  last_login_at?: string | null;

  first_name?: string;
  last_name?: string;
  company_name?: string;
  display_name?: string;
  full_name?: string;
  gender?: string;
  date_of_birth?: string | null;
  national_id?: string;
  passport_number?: string;
  nationality?: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  alternative_phone_number?: string;
  primary_contact_number?: string;
  country?: string;
  city?: string;
  district?: string;
  street_address?: string;
  postal_code?: string;
  national_address_text?: string;
  notes?: string;
  tags?: string;
  created_by_id?: number | string | null;
  updated_by_id?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CustomerDetailResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  customer?: CustomerRecord;
  data?: CustomerRecord | { customer?: CustomerRecord };
};

type StatementSummary = {
  total_orders?: number;
  orders_count?: number;
  total_invoices?: number;
  invoices_count?: number;
  total_payments?: number;
  payments_count?: number;
  total_amount?: number | string;
  total_invoiced?: number | string;
  total_paid?: number | string;
  paid_amount?: number | string;
  outstanding_amount?: number | string;
  remaining_amount?: number | string;
  balance?: number | string;
  debit?: number | string;
  credit?: number | string;
  orders_total?: number | string;
  invoices_total?: number | string;
  payments_total?: number | string;
};

type StatementLine = {
  id?: string | number;
  type?: string;
  kind?: string;
  source?: string;
  document_type?: string;
  reference?: string;
  number?: string;
  code?: string;
  title?: string;
  description?: string;
  status?: string;
  payment_status?: string;
  fulfillment_status?: string;
  amount?: number | string;
  total?: number | string;
  paid_amount?: number | string;
  remaining_amount?: number | string;
  debit?: number | string;
  credit?: number | string;
  balance?: number | string;
  currency?: string;
  date?: string | null;
  created_at?: string | null;
  issued_at?: string | null;
  paid_at?: string | null;
  due_date?: string | null;
  order_id?: string | number;
  invoice_id?: string | number;
  payment_id?: string | number;
  url?: string;
  href?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

type StatementResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  customer?: CustomerRecord;
  filters?: Record<string, unknown>;
  statement?: {
    summary?: StatementSummary;
    lines?: StatementLine[];
    [key: string]: unknown;
  };
  summary?: StatementSummary;
  lines?: StatementLine[];
  data?: {
    statement?: {
      summary?: StatementSummary;
      lines?: StatementLine[];
    };
    summary?: StatementSummary;
    lines?: StatementLine[];
  };
};

type LineFilter = "all" | "orders" | "invoices" | "payments";
type SortFilter = "newest" | "oldest" | "amount_high" | "amount_low";

const PAGE_SIZE = 10;

const translations = {
  ar: {
    title: "تفاصيل العميل",
    subtitle: "ملف العميل التشغيلي مع الطلبات والفواتير والمدفوعات وكشف الحساب.",
    back: "رجوع",
    refresh: "تحديث",
    print: "طباعة",
    copy: "نسخ",
    copied: "تم النسخ",
    retry: "إعادة المحاولة",
    loading: "جاري التحميل",
    errorTitle: "تعذر تحميل بيانات العميل",
    statementErrorTitle: "تعذر تحميل كشف الحساب",
    notFound: "العميل غير موجود",
    notFoundDesc: "لم يتم العثور على بيانات لهذا العميل.",
    customerProfile: "ملف العميل",
    customerCode: "كود العميل",
    accountStatus: "حساب الدخول",
    linked: "مرتبط",
    missing: "بدون حساب",
    verified: "موثق",
    unverified: "غير موثق",
    active: "نشط",
    inactive: "غير نشط",
    blocked: "موقوف",
    lead: "مهتم",
    individual: "فرد",
    corporate: "شركة",
    website: "الموقع",
    whatsapp: "واتساب",
    agent: "مندوب",
    admin: "النظام",
    import: "استيراد",
    other: "أخرى",
    phone: "الجوال",
    email: "البريد",
    city: "المدينة",
    country: "الدولة",
    district: "الحي",
    address: "العنوان",
    nationalAddress: "العنوان الوطني",
    identity: "الهوية",
    nationality: "الجنسية",
    birthDate: "تاريخ الميلاد",
    gender: "الجنس",
    source: "المصدر",
    type: "النوع",
    status: "الحالة",
    lastLogin: "آخر دخول",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    contactInfo: "بيانات التواصل",
    personalInfo: "البيانات الشخصية",
    accountInfo: "بيانات الحساب",
    loginUsername: "اسم المستخدم",
    loginEmail: "بريد الحساب",
    loginDisplayName: "اسم العرض",
    loginRole: "الدور",
    loginUserType: "نوع المستخدم",
    loginWorkspace: "المساحة",
    loginPhone: "جوال الحساب",
    loginWhatsapp: "واتساب الحساب",
    loginUserId: "معرّف الحساب",
    accountActive: "الحساب نشط",
    locationInfo: "العنوان والموقع",
    notes: "الملاحظات",
    noNotes: "لا توجد ملاحظات مسجلة.",
    overview: "نظرة عامة",
    statement: "كشف الحساب",
    activity: "النشاط",
    all: "الكل",
    orders: "الطلبات",
    invoices: "الفواتير",
    payments: "المدفوعات",
    totalOrders: "إجمالي الطلبات",
    totalInvoices: "إجمالي الفواتير",
    totalPayments: "إجمالي المدفوعات",
    outstanding: "المتبقي",
    totalAmount: "الإجمالي",
    paidAmount: "المدفوع",
    balance: "الرصيد",
    searchPlaceholder: "بحث في سجل العميل...",
    fromDate: "من تاريخ",
    toDate: "إلى تاريخ",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    reset: "إعادة ضبط",
    document: "المستند",
    date: "التاريخ",
    amount: "المبلغ",
    paid: "المدفوع",
    remaining: "المتبقي",
    actions: "الإجراءات",
    view: "عرض",
    noLines: "لا توجد سجلات",
    noLinesDesc: "لا توجد طلبات أو فواتير أو مدفوعات حسب الفلاتر الحالية.",
    noContact: "غير مسجل",
    noAddress: "غير مسجل",
    noValue: "—",
    statementLoaded: "تم تحديث كشف العميل",
    profileLoaded: "تم تحديث بيانات العميل",
    printReady: "تم تجهيز صفحة الطباعة",
    quickLinks: "روابط تشغيلية",
    viewOrders: "طلبات العميل",
    viewInvoices: "فواتير العميل",
    viewPayments: "مدفوعات العميل",
    customerWorkspace: "مساحة العميل",
    page: "صفحة",
    of: "من",
    previous: "السابق",
    next: "التالي",
  },
  en: {
    title: "Customer Details",
    subtitle:
      "Customer operational profile with orders, invoices, payments, and statement.",
    back: "Back",
    refresh: "Refresh",
    print: "Print",
    copy: "Copy",
    copied: "Copied",
    retry: "Retry",
    loading: "Loading",
    errorTitle: "Unable to load customer",
    statementErrorTitle: "Unable to load statement",
    notFound: "Customer not found",
    notFoundDesc: "No customer data was found for this record.",
    customerProfile: "Customer Profile",
    customerCode: "Customer Code",
    accountStatus: "Portal Account",
    linked: "Linked",
    missing: "No account",
    verified: "Verified",
    unverified: "Unverified",
    active: "Active",
    inactive: "Inactive",
    blocked: "Blocked",
    lead: "Lead",
    individual: "Individual",
    corporate: "Corporate",
    website: "Website",
    whatsapp: "WhatsApp",
    agent: "Agent",
    admin: "System",
    import: "Import",
    other: "Other",
    phone: "Phone",
    email: "Email",
    city: "City",
    country: "Country",
    district: "District",
    address: "Address",
    nationalAddress: "National Address",
    identity: "Identity",
    nationality: "Nationality",
    birthDate: "Birth Date",
    gender: "Gender",
    source: "Source",
    type: "Type",
    status: "Status",
    lastLogin: "Last Login",
    createdAt: "Created At",
    updatedAt: "Updated At",
    contactInfo: "Contact Info",
    personalInfo: "Personal Info",
    accountInfo: "Account Info",
    loginUsername: "Username",
    loginEmail: "Account Email",
    loginDisplayName: "Display Name",
    loginRole: "Role",
    loginUserType: "User Type",
    loginWorkspace: "Workspace",
    loginPhone: "Account Phone",
    loginWhatsapp: "Account WhatsApp",
    loginUserId: "User ID",
    accountActive: "Account Active",
    locationInfo: "Address & Location",
    notes: "Notes",
    noNotes: "No notes recorded.",
    overview: "Overview",
    statement: "Statement",
    activity: "Activity",
    all: "All",
    orders: "Orders",
    invoices: "Invoices",
    payments: "Payments",
    totalOrders: "Total Orders",
    totalInvoices: "Total Invoices",
    totalPayments: "Total Payments",
    outstanding: "Outstanding",
    totalAmount: "Total",
    paidAmount: "Paid",
    balance: "Balance",
    searchPlaceholder: "Search customer activity...",
    fromDate: "From date",
    toDate: "To date",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest Amount",
    amountLow: "Lowest Amount",
    reset: "Reset",
    document: "Document",
    date: "Date",
    amount: "Amount",
    paid: "Paid",
    remaining: "Remaining",
    actions: "Actions",
    view: "View",
    noLines: "No records",
    noLinesDesc: "No orders, invoices, or payments were found for current filters.",
    noContact: "Not provided",
    noAddress: "Not provided",
    noValue: "—",
    statementLoaded: "Customer statement refreshed",
    profileLoaded: "Customer refreshed",
    printReady: "Print page prepared",
    quickLinks: "Quick Links",
    viewOrders: "Customer Orders",
    viewInvoices: "Customer Invoices",
    viewPayments: "Customer Payments",
    customerWorkspace: "Customer Workspace",
    page: "Page",
    of: "of",
    previous: "Previous",
    next: "Next",
  },
} as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function toEnglishDigits(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function toNumber(value: string | number | null | undefined) {
  const cleaned = toEnglishDigits(value ?? 0).replace(/[^\d.-]/g, "");
  const numeric = Number(cleaned);

  return Number.isFinite(numeric) ? numeric : 0;
}

function formatNumber(value: string | number | null | undefined, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toNumber(value));
}

function formatDateEnglish(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
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

function makeApiUrl(path: string, searchParams?: URLSearchParams) {
  const query = searchParams?.toString();

  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
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

function extractCustomer(payload: CustomerDetailResponse): CustomerRecord | null {
  if (payload.customer) return payload.customer;

  if (payload.data && !Array.isArray(payload.data)) {
    if ("customer" in payload.data && payload.data.customer) {
      return payload.data.customer;
    }

    if ("id" in payload.data) {
      return payload.data as CustomerRecord;
    }
  }

  return null;
}

function extractStatementSummary(payload: StatementResponse): StatementSummary {
  if (payload.summary) return payload.summary;
  if (payload.statement?.summary) return payload.statement.summary;
  if (payload.data?.summary) return payload.data.summary;
  if (payload.data?.statement?.summary) return payload.data.statement.summary;

  return {};
}

function extractStatementLines(payload: StatementResponse): StatementLine[] {
  if (Array.isArray(payload.lines)) return payload.lines;
  if (Array.isArray(payload.statement?.lines)) return payload.statement.lines;
  if (Array.isArray(payload.data?.lines)) return payload.data.lines;
  if (Array.isArray(payload.data?.statement?.lines)) return payload.data.statement.lines;

  return [];
}

function getCustomerName(customer: CustomerRecord | null) {
  if (!customer) return "";

  return (
    customer.display_name ||
    customer.full_name ||
    customer.company_name ||
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    customer.phone_number ||
    customer.whatsapp_number ||
    customer.email ||
    `Customer #${customer.id}`
  );
}

function getCustomerInitials(customer: CustomerRecord | null) {
  const name = getCustomerName(customer);
  const words = name.split(/\s+/).filter(Boolean);

  if (words.length === 0) return "PC";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0].slice(0, 1)}${words[1].slice(0, 1)}`.toUpperCase();
}

function hasCustomerAccount(customer: CustomerRecord | null) {
  return Boolean(customer?.has_customer_account || customer?.user_id || customer?.login_user?.id);
}

function getCustomerLoginUser(customer: CustomerRecord | null): LoginUserRecord | null {
  if (!customer?.login_user) return null;
  return customer.login_user;
}

function getCustomerLoginProfile(customer: CustomerRecord | null): LoginUserProfile | null {
  return getCustomerLoginUser(customer)?.profile || null;
}

function getCustomerLoginUsername(customer: CustomerRecord | null) {
  const loginUser = getCustomerLoginUser(customer);

  return (
    loginUser?.username ||
    customer?.user_username ||
    customer?.login_identifier ||
    ""
  );
}

function getCustomerLoginEmail(customer: CustomerRecord | null) {
  return getCustomerLoginUser(customer)?.email || customer?.email || "";
}

function getProfileWorkspace(profile: LoginUserProfile | null) {
  const extraData = profile?.extra_data || {};
  const workspaceValue = extraData.workspace;

  return typeof workspaceValue === "string" ? workspaceValue : "";
}

function getVerificationCount(customer: CustomerRecord | null) {
  let count = 0;

  if (customer?.is_phone_verified) count += 1;
  if (customer?.is_whatsapp_verified) count += 1;

  return count;
}

function getStatusLabel(status: string | undefined, t: (typeof translations)[Locale]) {
  const normalized = normalizeText(status);

  if (normalized === "active") return t.active;
  if (normalized === "inactive") return t.inactive;
  if (normalized === "blocked") return t.blocked;
  if (normalized === "lead") return t.lead;

  return status || t.noValue;
}

function getStatusBadgeClass(status: string | undefined) {
  const normalized = normalizeText(status);

  if (normalized === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "blocked") return "border-red-200 bg-red-50 text-red-700";
  if (normalized === "lead") return "border-amber-200 bg-amber-50 text-amber-700";

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getTypeLabel(type: string | undefined, t: (typeof translations)[Locale]) {
  const normalized = normalizeText(type);

  if (normalized === "individual") return t.individual;
  if (normalized === "corporate") return t.corporate;

  return type || t.noValue;
}

function getSourceLabel(source: string | undefined, t: (typeof translations)[Locale]) {
  const normalized = normalizeText(source);

  if (normalized === "website") return t.website;
  if (normalized === "whatsapp") return t.whatsapp;
  if (normalized === "agent") return t.agent;
  if (normalized === "admin") return t.admin;
  if (normalized === "import") return t.import;
  if (normalized === "other") return t.other;

  return source || t.noValue;
}

function getLineType(line: StatementLine): LineFilter {
  const raw = normalizeText(
    line.type ||
      line.kind ||
      line.source ||
      line.document_type ||
      line.metadata?.type ||
      "",
  );

  if (raw.includes("order")) return "orders";
  if (raw.includes("invoice")) return "invoices";
  if (raw.includes("payment")) return "payments";

  return "all";
}

function getLineReference(line: StatementLine) {
  return (
    line.reference ||
    line.number ||
    line.code ||
    line.title ||
    line.description ||
    `#${line.id || ""}`
  );
}

function getLineDate(line: StatementLine) {
  return (
    line.date ||
    line.created_at ||
    line.issued_at ||
    line.paid_at ||
    line.due_date ||
    null
  );
}

function getLineAmount(line: StatementLine) {
  return (
    line.amount ||
    line.total ||
    line.paid_amount ||
    line.debit ||
    line.credit ||
    0
  );
}

function getLineUrl(line: StatementLine) {
  if (line.url || line.href) return String(line.url || line.href);

  if (line.order_id) return `/system/orders/${line.order_id}`;
  if (line.invoice_id) return `/system/invoices/${line.invoice_id}`;
  if (line.payment_id) return `/system/payments/${line.payment_id}`;

  const type = getLineType(line);

  if (type === "orders" && line.id) return `/system/orders/${line.id}`;
  if (type === "invoices" && line.id) return `/system/invoices/${line.id}`;
  if (type === "payments" && line.id) return `/system/payments/${line.id}`;

  return "";
}

function SarIcon({ className }: { className?: string }) {
  return (
    <img
      src="/currency/sar.svg"
      alt="SAR"
      className={cn("inline-block h-3.5 w-3.5 object-contain", className)}
    />
  );
}

function MoneyValue({ value }: { value: string | number | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
      <span>{formatNumber(value, 2)}</span>
      <SarIcon />
    </span>
  );
}

function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardAction>

        <div className="pt-1">
          <Badge
            variant="outline"
            className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {trend}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}

function DetailField({
  label,
  value,
  icon,
  copyValue,
  t,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  copyValue?: string;
  t: (typeof translations)[Locale];
}) {
  const normalizedCopy = String(copyValue || "").trim();

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="mt-1 break-words text-sm font-medium text-foreground">
            {value || "—"}
          </div>
        </div>
      </div>

      {normalizedCopy ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-lg"
          onClick={() => {
            void navigator.clipboard.writeText(normalizedCopy);
            toast.success(t.copied);
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

function HeaderSortButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-8 px-2 text-xs font-medium text-foreground hover:bg-muted"
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </Button>
  );
}

function CustomerDetailsSkeleton() {
  return (
    <div className="w-full space-y-7">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-52 animate-pulse rounded bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-lg border bg-card shadow-none">
            <CardHeader className="relative min-h-[112px] px-6 py-5">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="mt-5 h-8 w-16 animate-pulse rounded bg-muted" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          <div className="h-[430px] animate-pulse rounded-lg border bg-muted/40" />
        </div>
        <div className="space-y-4 xl:col-span-2">
          <div className="h-[520px] animate-pulse rounded-lg border bg-muted/40" />
        </div>
      </div>
    </div>
  );
}

function DateTextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Input
      type="date"
      value={value}
      onChange={(event) => onChange(toEnglishDigits(event.target.value))}
      placeholder={placeholder}
      dir="ltr"
      className="h-10 w-[170px] rounded-md border bg-background text-left font-mono text-sm shadow-none [color-scheme:light] dark:[color-scheme:dark]"
    />
  );
}

function SearchIcon() {
  return (
    <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  );
}

export default function CustomerDetailsPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();

  const customerId = React.useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;

    return String(raw || "").trim();
  }, [params]);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [customer, setCustomer] = React.useState<CustomerRecord | null>(null);
  const [statementSummary, setStatementSummary] = React.useState<StatementSummary>({});
  const [statementLines, setStatementLines] = React.useState<StatementLine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [statementError, setStatementError] = React.useState("");

  const [lineFilter, setLineFilter] = React.useState<LineFilter>("all");
  const [lineSearch, setLineSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sort, setSort] = React.useState<SortFilter>("newest");
  const [pageIndex, setPageIndex] = React.useState(0);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const isRtl = locale === "ar";
  const textAlign = locale === "ar" ? "text-right" : "text-left";

  React.useEffect(() => {
    const readLocale = () => {
      try {
        const saved = window.localStorage.getItem("primey-locale");
        const nextLocale: Locale = saved === "en" ? "en" : "ar";

        setLocale(nextLocale);
        document.documentElement.lang = nextLocale;
        document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
        document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
      } catch {
        setLocale("ar");
      }
    };

    readLocale();

    window.addEventListener("storage", readLocale);
    window.addEventListener("primey-locale-changed", readLocale);

    return () => {
      window.removeEventListener("storage", readLocale);
      window.removeEventListener("primey-locale-changed", readLocale);
    };
  }, []);

  const loadCustomerOnly = React.useCallback(
    async (signal?: AbortSignal) => {
      const payload = await fetchJson<CustomerDetailResponse>(
        makeApiUrl(`/api/customers/${customerId}/`),
        signal,
      );

      const nextCustomer = extractCustomer(payload);

      if (!nextCustomer) {
        throw new Error(t.notFound);
      }

      setCustomer(nextCustomer);

      return nextCustomer;
    },
    [customerId, t.notFound],
  );

  const loadStatementOnly = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!customerId) return;

      setRefreshing(true);
      setStatementError("");

      try {
        const params = new URLSearchParams();

        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo) params.set("date_to", dateTo);

        const payload = await fetchJson<StatementResponse>(
          makeApiUrl(`/api/customers/${customerId}/statement/`, params),
          signal,
        );

        setStatementSummary(extractStatementSummary(payload));
        setStatementLines(extractStatementLines(payload));
        setPageIndex(0);

        if (!signal?.aborted) {
          toast.success(t.statementLoaded);
        }
      } catch (caughtError) {
        if (signal?.aborted) return;

        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.statementErrorTitle;

        setStatementError(message);
      } finally {
        if (!signal?.aborted) setRefreshing(false);
      }
    },
    [customerId, dateFrom, dateTo, t.statementErrorTitle, t.statementLoaded],
  );

  const loadAll = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!customerId) return;

      setLoading(true);
      setError("");
      setStatementError("");

      try {
        await loadCustomerOnly(signal);

        const statementPayload = await fetchJson<StatementResponse>(
          makeApiUrl(`/api/customers/${customerId}/statement/`),
          signal,
        );

        setStatementSummary(extractStatementSummary(statementPayload));
        setStatementLines(extractStatementLines(statementPayload));
      } catch (caughtError) {
        if (signal?.aborted) return;

        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorTitle;

        setError(message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [customerId, loadCustomerOnly, t.errorTitle],
  );

  React.useEffect(() => {
    const controller = new AbortController();

    void loadAll(controller.signal);

    return () => controller.abort();
  }, [loadAll]);

  const filteredLines = React.useMemo(() => {
    const query = normalizeText(lineSearch);
    const fromTime = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTime = dateTo ? new Date(dateTo).getTime() : null;

    const rows = statementLines.filter((line) => {
      const type = getLineType(line);
      const ref = normalizeText(
        [
          getLineReference(line),
          line.status,
          line.payment_status,
          line.fulfillment_status,
          line.description,
        ]
          .filter(Boolean)
          .join(" "),
      );

      if (lineFilter !== "all" && type !== lineFilter) return false;
      if (query && !ref.includes(query)) return false;

      const lineDate = getLineDate(line);
      if (fromTime || toTime) {
        if (!lineDate) return false;

        const time = new Date(lineDate).getTime();
        if (Number.isNaN(time)) return false;

        if (fromTime && time < fromTime) return false;
        if (toTime && time > toTime + 86_399_999) return false;
      }

      return true;
    });

    return rows.sort((a, b) => {
      if (sort === "amount_high") return toNumber(getLineAmount(b)) - toNumber(getLineAmount(a));
      if (sort === "amount_low") return toNumber(getLineAmount(a)) - toNumber(getLineAmount(b));

      const aDate = new Date(getLineDate(a) || 0).getTime();
      const bDate = new Date(getLineDate(b) || 0).getTime();

      if (sort === "oldest") return aDate - bDate;

      return bDate - aDate;
    });
  }, [dateFrom, dateTo, lineFilter, lineSearch, sort, statementLines]);

  const totalPages = Math.max(1, Math.ceil(filteredLines.length / PAGE_SIZE));
  const currentPage = Math.min(pageIndex, totalPages - 1);
  const pageRows = filteredLines.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  const customerName = getCustomerName(customer);
  const customerCode = customer?.customer_code || `#${customer?.id || customerId}`;
  const accountLinked = hasCustomerAccount(customer);
  const verificationCount = getVerificationCount(customer);

  const totalOrders =
    statementSummary.total_orders ||
    statementSummary.orders_count ||
    0;
  const totalInvoices =
    statementSummary.total_invoices ||
    statementSummary.invoices_count ||
    0;
  const totalPayments =
    statementSummary.total_payments ||
    statementSummary.payments_count ||
    0;
  const totalPaid =
    statementSummary.total_paid ||
    statementSummary.paid_amount ||
    statementSummary.payments_total ||
    0;
  const outstanding =
    statementSummary.outstanding_amount ||
    statementSummary.remaining_amount ||
    statementSummary.balance ||
    0;

  function handlePrint() {
    window.print();
    toast.success(t.printReady);
  }

  function resetFilters() {
    setLineFilter("all");
    setLineSearch("");
    setDateFrom("");
    setDateTo("");
    setSort("newest");
    setPageIndex(0);
  }

  if (loading) {
    return <CustomerDetailsSkeleton />;
  }

  if (error || !customer) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
            <TriangleAlert className="h-10 w-10 text-red-600" />
            <h2 className="mt-4 text-xl font-semibold">{error ? t.errorTitle : t.notFound}</h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              {error || t.notFoundDesc}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                className="h-9 rounded-md bg-black px-4 text-white hover:bg-black/90"
                onClick={() => void loadAll()}
              >
                <RefreshCw className="h-4 w-4" />
                {t.retry}
              </Button>

              <Button asChild variant="outline" className="h-9 rounded-md">
                <Link href="/system/customers">
                  {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                  {t.back}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className={cn("space-y-1", textAlign)}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("rounded-full px-2.5 py-1", getStatusBadgeClass(customer.status))}
            >
              {getStatusLabel(customer.status, t)}
            </Badge>

            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-2.5 py-1",
                accountLinked
                  ? "border-violet-200 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-slate-50 text-slate-600",
              )}
            >
              <UserCircle2 className="me-1 h-3.5 w-3.5" />
              {accountLinked ? t.linked : t.missing}
            </Badge>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {customerName}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/customers">
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {t.back}
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadAll()}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {t.refresh}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align={isRtl ? "start" : "end"}>
              <DropdownMenuItem asChild>
                <Link href={`/system/orders?customer=${encodeURIComponent(String(customer.id))}`}>
                  <ShoppingCart className="h-4 w-4" />
                  {t.viewOrders}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/system/invoices?customer=${encodeURIComponent(String(customer.id))}`}>
                  <ReceiptText className="h-4 w-4" />
                  {t.viewInvoices}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/system/payments?customer=${encodeURIComponent(String(customer.id))}`}>
                  <WalletCards className="h-4 w-4" />
                  {t.viewPayments}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void navigator.clipboard.writeText(String(customer.id));
                  toast.success(t.copied);
                }}
              >
                <Copy className="h-4 w-4" />
                {t.copy}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalOrders}
          value={formatNumber(totalOrders)}
          trend={t.orders}
          icon={ShoppingCart}
        />
        <KpiCard
          title={t.totalInvoices}
          value={formatNumber(totalInvoices)}
          trend={t.invoices}
          icon={ReceiptText}
        />
        <KpiCard
          title={t.totalPayments}
          value={formatNumber(totalPayments)}
          trend={t.payments}
          icon={WalletCards}
        />
        <KpiCard
          title={t.outstanding}
          value={<MoneyValue value={outstanding} />}
          trend={`${t.paidAmount}: ${formatNumber(totalPaid, 2)}`}
          icon={CircleDollarSign}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
            <CardHeader className="border-b bg-muted/20 px-6 py-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 rounded-2xl border">
                  <AvatarFallback className="rounded-2xl bg-background text-lg font-bold">
                    {getCustomerInitials(customer)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <CardTitle className="truncate text-lg">{customerName}</CardTitle>
                  <CardDescription className="truncate">{customerCode}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 p-5">
              <DetailField
                label={t.customerCode}
                value={customerCode}
                copyValue={customer.customer_code || String(customer.id)}
                icon={<BadgeCheck className="h-4 w-4" />}
                t={t}
              />

              <DetailField
                label={t.accountStatus}
                value={
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full",
                      accountLinked
                        ? "border-violet-200 bg-violet-50 text-violet-700"
                        : "border-slate-200 bg-slate-50 text-slate-600",
                    )}
                  >
                    {accountLinked ? t.linked : t.missing}
                  </Badge>
                }
                icon={<UserCircle2 className="h-4 w-4" />}
                t={t}
              />

              <DetailField
                label={t.phone}
                value={customer.phone_number || customer.primary_contact_number || t.noContact}
                copyValue={customer.phone_number || customer.primary_contact_number}
                icon={<Phone className="h-4 w-4" />}
                t={t}
              />

              <DetailField
                label={t.whatsapp}
                value={customer.whatsapp_number || t.noContact}
                copyValue={customer.whatsapp_number}
                icon={<Phone className="h-4 w-4" />}
                t={t}
              />

              <DetailField
                label={t.email}
                value={customer.email || t.noContact}
                copyValue={customer.email}
                icon={<Mail className="h-4 w-4" />}
                t={t}
              />

              <DetailField
                label={t.city}
                value={customer.city || t.noAddress}
                icon={<MapPin className="h-4 w-4" />}
                t={t}
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{t.quickLinks}</CardTitle>
              <CardDescription>{t.customerWorkspace}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-2">
              <Button
                asChild
                variant="outline"
                className="h-10 w-full justify-between rounded-md shadow-none"
              >
                <Link href={`/system/orders?customer=${encodeURIComponent(String(customer.id))}`}>
                  <span className="inline-flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    {t.viewOrders}
                  </span>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-10 w-full justify-between rounded-md shadow-none"
              >
                <Link href={`/system/invoices?customer=${encodeURIComponent(String(customer.id))}`}>
                  <span className="inline-flex items-center gap-2">
                    <ReceiptText className="h-4 w-4" />
                    {t.viewInvoices}
                  </span>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-10 w-full justify-between rounded-md shadow-none"
              >
                <Link href={`/system/payments?customer=${encodeURIComponent(String(customer.id))}`}>
                  <span className="inline-flex items-center gap-2">
                    <WalletCards className="h-4 w-4" />
                    {t.viewPayments}
                  </span>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="rounded-lg border bg-background p-1 shadow-none">
              <TabsTrigger value="overview">{t.overview}</TabsTrigger>
              <TabsTrigger value="statement">{t.statement}</TabsTrigger>
              <TabsTrigger value="activity">{t.activity}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">{t.personalInfo}</CardTitle>
                    <CardDescription>{customerCode}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <DetailField
                      label={t.type}
                      value={getTypeLabel(customer.customer_type, t)}
                      icon={<User className="h-4 w-4" />}
                      t={t}
                    />
                    <DetailField
                      label={t.source}
                      value={getSourceLabel(customer.source, t)}
                      icon={<Inbox className="h-4 w-4" />}
                      t={t}
                    />
                    <DetailField
                      label={t.identity}
                      value={customer.national_id || customer.passport_number || t.noValue}
                      copyValue={customer.national_id || customer.passport_number}
                      icon={<BadgeCheck className="h-4 w-4" />}
                      t={t}
                    />
                    <DetailField
                      label={t.nationality}
                      value={customer.nationality || t.noValue}
                      icon={<Users className="h-4 w-4" />}
                      t={t}
                    />
                    <DetailField
                      label={t.birthDate}
                      value={formatDateEnglish(customer.date_of_birth)}
                      icon={<CalendarDays className="h-4 w-4" />}
                      t={t}
                    />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">{t.accountInfo}</CardTitle>
                    <CardDescription>
                      {getCustomerLoginUsername(customer) || customer.login_identifier || "—"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <DetailField
                      label={t.accountStatus}
                      value={
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full",
                            hasCustomerAccount(customer)
                              ? "border-violet-200 bg-violet-50 text-violet-700"
                              : "border-slate-200 bg-slate-50 text-slate-600",
                          )}
                        >
                          <UserCircle2 className="me-1 h-3.5 w-3.5" />
                          {hasCustomerAccount(customer) ? t.linked : t.missing}
                        </Badge>
                      }
                      icon={<UserCircle2 className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.loginUsername}
                      value={getCustomerLoginUsername(customer) || t.noValue}
                      copyValue={getCustomerLoginUsername(customer)}
                      icon={<UserCircle2 className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.loginEmail}
                      value={getCustomerLoginEmail(customer) || t.noValue}
                      copyValue={getCustomerLoginEmail(customer)}
                      icon={<Mail className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.loginDisplayName}
                      value={
                        getCustomerLoginUser(customer)?.full_name ||
                        getCustomerLoginProfile(customer)?.display_name ||
                        t.noValue
                      }
                      icon={<User className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.loginUserId}
                      value={
                        getCustomerLoginUser(customer)?.id ||
                        customer.user_id ||
                        t.noValue
                      }
                      copyValue={String(getCustomerLoginUser(customer)?.id || customer.user_id || "")}
                      icon={<BadgeCheck className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.accountActive}
                      value={
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full",
                            getCustomerLoginUser(customer)?.is_active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-600",
                          )}
                        >
                          {getCustomerLoginUser(customer)?.is_active ? t.active : t.inactive}
                        </Badge>
                      }
                      icon={<ShieldCheck className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.loginUserType}
                      value={getCustomerLoginProfile(customer)?.user_type || t.noValue}
                      icon={<Users className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.loginRole}
                      value={getCustomerLoginProfile(customer)?.role || t.noValue}
                      icon={<ShieldCheck className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.loginWorkspace}
                      value={getProfileWorkspace(getCustomerLoginProfile(customer)) || t.customerWorkspace}
                      icon={<Home className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.loginPhone}
                      value={getCustomerLoginProfile(customer)?.phone_number || t.noValue}
                      copyValue={getCustomerLoginProfile(customer)?.phone_number}
                      icon={<Phone className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.loginWhatsapp}
                      value={getCustomerLoginProfile(customer)?.whatsapp_number || t.noValue}
                      copyValue={getCustomerLoginProfile(customer)?.whatsapp_number}
                      icon={<Phone className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.verified}
                      value={
                        <div className="flex flex-wrap gap-1.5">
                          {customer.is_phone_verified ? (
                            <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                              {t.phone}
                            </Badge>
                          ) : null}

                          {customer.is_whatsapp_verified ? (
                            <Badge className="rounded-full border-sky-200 bg-sky-50 text-sky-700">
                              {t.whatsapp}
                            </Badge>
                          ) : null}

                          {getVerificationCount(customer) === 0 ? (
                            <Badge variant="outline" className="rounded-full bg-white">
                              {t.unverified}
                            </Badge>
                          ) : null}
                        </div>
                      }
                      icon={<ShieldCheck className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.lastLogin}
                      value={formatDateEnglish(customer.last_login_at)}
                      icon={<Activity className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.createdAt}
                      value={formatDateEnglish(customer.created_at)}
                      icon={<CalendarDays className="h-4 w-4" />}
                      t={t}
                    />

                    <DetailField
                      label={t.updatedAt}
                      value={formatDateEnglish(customer.updated_at)}
                      icon={<RefreshCw className="h-4 w-4" />}
                      t={t}
                    />
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">{t.locationInfo}</CardTitle>
                  <CardDescription>
                    {customer.city || customer.country || t.noAddress}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 lg:grid-cols-2">
                  <DetailField
                    label={t.country}
                    value={customer.country || t.noAddress}
                    icon={<MapPin className="h-4 w-4" />}
                    t={t}
                  />
                  <DetailField
                    label={t.city}
                    value={customer.city || t.noAddress}
                    icon={<MapPin className="h-4 w-4" />}
                    t={t}
                  />
                  <DetailField
                    label={t.district}
                    value={customer.district || t.noAddress}
                    icon={<Home className="h-4 w-4" />}
                    t={t}
                  />
                  <DetailField
                    label={t.address}
                    value={customer.street_address || t.noAddress}
                    copyValue={customer.street_address}
                    icon={<Home className="h-4 w-4" />}
                    t={t}
                  />
                  <div className="lg:col-span-2">
                    <DetailField
                      label={t.nationalAddress}
                      value={customer.national_address_text || t.noAddress}
                      copyValue={customer.national_address_text}
                      icon={<MapPin className="h-4 w-4" />}
                      t={t}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">{t.notes}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="min-h-[72px] rounded-lg border bg-background p-4 text-sm leading-7 text-muted-foreground">
                    {customer.notes || t.noNotes}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statement" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">{t.statement}</CardTitle>
                  <CardDescription>{customerName}</CardDescription>
                  <CardAction>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-md shadow-none"
                      onClick={() => void loadStatementOnly()}
                      disabled={refreshing}
                    >
                      {refreshing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {t.refresh}
                    </Button>
                  </CardAction>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
                      <div className="relative w-full md:max-w-sm">
                        <SearchIcon />
                        <Input
                          value={lineSearch}
                          onChange={(event) => setLineSearch(event.target.value)}
                          placeholder={t.searchPlaceholder}
                          className="h-10 rounded-md border bg-background pe-10 shadow-none"
                        />
                      </div>

                      <Select
                        value={lineFilter}
                        onValueChange={(value) => setLineFilter(value as LineFilter)}
                      >
                        <SelectTrigger className="h-10 w-[150px] rounded-md border bg-background shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t.all}</SelectItem>
                          <SelectItem value="orders">{t.orders}</SelectItem>
                          <SelectItem value="invoices">{t.invoices}</SelectItem>
                          <SelectItem value="payments">{t.payments}</SelectItem>
                        </SelectContent>
                      </Select>

                      <DateTextInput
                        value={dateFrom}
                        onChange={setDateFrom}
                        placeholder={t.fromDate}
                      />

                      <DateTextInput
                        value={dateTo}
                        onChange={setDateTo}
                        placeholder={t.toDate}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={sort}
                        onValueChange={(value) => setSort(value as SortFilter)}
                      >
                        <SelectTrigger className="h-10 w-[150px] rounded-md border bg-background shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">{t.newest}</SelectItem>
                          <SelectItem value="oldest">{t.oldest}</SelectItem>
                          <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
                          <SelectItem value="amount_low">{t.amountLow}</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-md shadow-none"
                        onClick={resetFilters}
                      >
                        <RotateCcw className="h-4 w-4" />
                        {t.reset}
                      </Button>
                    </div>
                  </div>

                  {statementError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <p className="font-semibold">{t.statementErrorTitle}</p>
                      <p className="mt-1">{statementError}</p>
                    </div>
                  ) : null}

                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className={cn("min-w-[180px]", textAlign)}>
                            <HeaderSortButton label={t.document} />
                          </TableHead>
                          <TableHead className={textAlign}>{t.date}</TableHead>
                          <TableHead className={textAlign}>{t.status}</TableHead>
                          <TableHead className={textAlign}>{t.amount}</TableHead>
                          <TableHead className={textAlign}>{t.paid}</TableHead>
                          <TableHead className={textAlign}>{t.remaining}</TableHead>
                          <TableHead className="w-[70px] text-center">{t.actions}</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {pageRows.length ? (
                          pageRows.map((line, index) => {
                            const href = getLineUrl(line);
                            const lineType = getLineType(line);

                            return (
                              <TableRow key={`${line.id || "line"}-${index}`}>
                                <TableCell className="align-top">
                                  <div className="space-y-1">
                                    <p className="font-medium">{getLineReference(line)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {lineType === "orders"
                                        ? t.orders
                                        : lineType === "invoices"
                                          ? t.invoices
                                          : lineType === "payments"
                                            ? t.payments
                                            : t.document}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {formatDateEnglish(getLineDate(line))}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="rounded-full bg-background">
                                    {line.status ||
                                      line.payment_status ||
                                      line.fulfillment_status ||
                                      t.noValue}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <MoneyValue value={getLineAmount(line)} />
                                </TableCell>
                                <TableCell>
                                  <MoneyValue value={line.paid_amount || 0} />
                                </TableCell>
                                <TableCell>
                                  <MoneyValue value={line.remaining_amount || 0} />
                                </TableCell>
                                <TableCell className="text-center">
                                  {href ? (
                                    <Button
                                      asChild
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-xl"
                                    >
                                      <Link href={href}>
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7}>
                              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                                <Activity className="h-8 w-8 text-muted-foreground" />
                                <p className="mt-3 font-semibold">{t.noLines}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{t.noLinesDesc}</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {filteredLines.length > PAGE_SIZE ? (
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t.page} {formatNumber(currentPage + 1)} {t.of} {formatNumber(totalPages)}
                      </p>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-md shadow-none"
                          disabled={currentPage <= 0}
                          onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
                        >
                          {t.previous}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-md shadow-none"
                          disabled={currentPage >= totalPages - 1}
                          onClick={() =>
                            setPageIndex((value) => Math.min(totalPages - 1, value + 1))
                          }
                        >
                          {t.next}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">{t.activity}</CardTitle>
                  <CardDescription>{customerName}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {statementLines.slice(0, 12).map((line, index) => {
                    const href = getLineUrl(line);

                    return (
                      <div
                        key={`${line.id || "activity"}-${index}`}
                        className="flex items-start justify-between gap-4 rounded-lg border bg-background p-3"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            {getLineType(line) === "orders" ? (
                              <ShoppingCart className="h-4 w-4" />
                            ) : getLineType(line) === "invoices" ? (
                              <ReceiptText className="h-4 w-4" />
                            ) : getLineType(line) === "payments" ? (
                              <WalletCards className="h-4 w-4" />
                            ) : (
                              <Activity className="h-4 w-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {getLineReference(line)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDateEnglish(getLineDate(line))} ·{" "}
                              {line.status || line.payment_status || t.noValue}
                            </p>
                          </div>
                        </div>

                        {href ? (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-xl"
                          >
                            <Link href={href}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}

                  {statementLines.length === 0 ? (
                    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border bg-background text-center">
                      <Activity className="h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 font-semibold">{t.noLines}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t.noLinesDesc}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}