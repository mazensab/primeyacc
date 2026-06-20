"use client";

/* ============================================================
   📂 app/customer/statement/page.tsx
   🧭 Primey Care | Customer Statement Page
   ------------------------------------------------------------
   ✅ كشف حساب العميل الحالي
   ✅ يعتمد على /api/customers/me/statement/
   ✅ سايدر واحد وتسجيل دخول واحد حسب workspace
   ✅ نفس النمط المعتمد
   ✅ w-full space-y-4
   ✅ بدون main / min-h-screen / max-w
   ✅ عربي/إنجليزي عبر primey-locale
   ✅ أرقام إنجليزية دائمًا
   ✅ رمز SAR من /currency/sar.svg
   ✅ Skeleton Loading
   ✅ Error State مستقل
   ✅ Empty State ذكي
   ✅ فلاتر تاريخ ونوع حركة
   ✅ Web PDF Print
   ✅ Excel .xls HTML Workbook
   ✅ sonner
   ✅ بدون نصوص تقنية ظاهرة في الواجهة
============================================================ */

import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Download,
  FileText,
  Filter,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCcw,
  Search,
  WalletCards,
} from "lucide-react";
import {
  type ChangeEvent,
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
import { Skeleton } from "@/components/ui/skeleton";

/* ============================================================
   Types
============================================================ */

type AppLocale = "ar" | "en";
type LineType = "all" | "order" | "invoice" | "payment";

type WhoamiResponse = {
  authenticated?: boolean;
  workspace?: string | null;
  entity_type?: string | null;
  customer_id?: number | null;
};

type CustomerStatementCustomer = {
  id?: number;
  customer_code?: string;
  display_name?: string;
  full_name?: string;
  status?: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  primary_contact_number?: string;
  has_customer_account?: boolean;
  normalized_phone?: string;
  login_identifier?: string;
  user_id?: number | null;
  user_username?: string;
  is_phone_verified?: boolean;
  is_whatsapp_verified?: boolean;
  phone_verified_at?: string | null;
  whatsapp_verified_at?: string | null;
  last_login_at?: string | null;
};

type CustomerStatementSummary = {
  orders_count?: number;
  invoices_count?: number;
  payments_count?: number;
  total_orders_amount?: string | number;
  total_invoices_amount?: string | number;
  total_paid_amount?: string | number;
  total_due_amount?: string | number;
  balance_due?: string | number;
  currency?: string;
};

type CustomerStatementLine = {
  id?: number | string;
  type?: string;
  source?: string;
  title?: string;
  reference?: string;
  number?: string;
  status?: string;
  payment_status?: string;
  amount?: string | number;
  debit?: string | number;
  credit?: string | number;
  balance?: string | number;
  currency?: string;
  date?: string | null;
  created_at?: string | null;
  description?: string;
  notes?: string;
  url?: string;
  order_id?: number | null;
  invoice_id?: number | null;
  payment_id?: number | null;
};

type CustomerStatementPayload = {
  customer?: CustomerStatementCustomer;
  filters?: {
    date_from?: string | null;
    date_to?: string | null;
    include_orders?: boolean;
    include_invoices?: boolean;
    include_payments?: boolean;
  };
  statement?: {
    customer?: CustomerStatementCustomer;
    summary?: CustomerStatementSummary;
    lines?: CustomerStatementLine[];
  };
  summary?: CustomerStatementSummary;
  lines?: CustomerStatementLine[];
};

type CustomerStatementResponse = CustomerStatementPayload & {
  ok?: boolean;
  success?: boolean;
  workspace?: string;
  dashboard_path?: string;
  redirect_to?: string;
  message?: string;
};

const SAR_ICON = "/currency/sar.svg";

/* ============================================================
   Dictionary
============================================================ */

function dictionary(locale: AppLocale) {
  const isArabic = locale === "ar";

  return {
    title: isArabic ? "كشف الحساب" : "Statement",
    subtitle: isArabic
      ? "راجع ملخص طلباتك وفواتيرك ومدفوعاتك والرصيد المتبقي."
      : "Review your orders, invoices, payments, and outstanding balance.",

    back: isArabic ? "العودة للوحة العميل" : "Back to dashboard",
    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة" : "Print",

    dateFrom: isArabic ? "من تاريخ" : "From date",
    dateTo: isArabic ? "إلى تاريخ" : "To date",
    movementType: isArabic ? "نوع الحركة" : "Movement type",
    all: isArabic ? "الكل" : "All",
    orders: isArabic ? "الطلبات" : "Orders",
    invoices: isArabic ? "الفواتير" : "Invoices",
    payments: isArabic ? "المدفوعات" : "Payments",
    search: isArabic ? "بحث في الكشف" : "Search statement",
    searchPlaceholder: isArabic
      ? "ابحث برقم الحركة أو الحالة أو الوصف..."
      : "Search by number, status, or description...",

    summary: isArabic ? "الملخص" : "Summary",
    customerInfo: isArabic ? "بيانات العميل" : "Customer info",
    statementLines: isArabic ? "حركات كشف الحساب" : "Statement lines",

    customerCode: isArabic ? "رقم العميل" : "Customer code",
    phone: isArabic ? "الجوال" : "Phone",
    accountStatus: isArabic ? "حالة الحساب" : "Account status",
    verified: isArabic ? "موثق" : "Verified",
    notVerified: isArabic ? "غير موثق" : "Not verified",

    ordersCount: isArabic ? "عدد الطلبات" : "Orders count",
    invoicesCount: isArabic ? "عدد الفواتير" : "Invoices count",
    paymentsCount: isArabic ? "عدد المدفوعات" : "Payments count",
    invoicesAmount: isArabic ? "إجمالي الفواتير" : "Invoices amount",
    paidAmount: isArabic ? "المدفوع" : "Paid",
    dueAmount: isArabic ? "المتبقي" : "Due",
    balanceDue: isArabic ? "الرصيد المستحق" : "Balance due",

    date: isArabic ? "التاريخ" : "Date",
    type: isArabic ? "النوع" : "Type",
    reference: isArabic ? "المرجع" : "Reference",
    description: isArabic ? "الوصف" : "Description",
    status: isArabic ? "الحالة" : "Status",
    debit: isArabic ? "مدين" : "Debit",
    credit: isArabic ? "دائن" : "Credit",
    balance: isArabic ? "الرصيد" : "Balance",
    amount: isArabic ? "المبلغ" : "Amount",

    order: isArabic ? "طلب" : "Order",
    invoice: isArabic ? "فاتورة" : "Invoice",
    payment: isArabic ? "دفعة" : "Payment",
    unknown: isArabic ? "حركة" : "Line",

    noData: isArabic ? "لا توجد بيانات متاحة." : "No data available.",
    emptyTitle: isArabic ? "لا توجد حركات مطابقة" : "No matching lines",
    emptyDescription: isArabic
      ? "غيّر الفلاتر أو حدّث الصفحة لعرض الحركات."
      : "Change filters or refresh the page to view lines.",

    loadSuccess: isArabic ? "تم تحديث كشف الحساب." : "Statement refreshed.",
    loadError: isArabic ? "تعذر تحميل كشف الحساب." : "Unable to load statement.",
    authError: isArabic ? "يرجى تسجيل الدخول للوصول إلى كشف الحساب." : "Please sign in to view your statement.",
    wrongWorkspace: isArabic ? "هذا الحساب غير مخصص لمساحة العميل." : "This account is not assigned to customer workspace.",
    invalidDates: isArabic ? "تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية." : "From date cannot be after to date.",
    exported: isArabic ? "تم تصدير كشف الحساب." : "Statement exported.",
  };
}

/* ============================================================
   Helpers
============================================================ */

function readLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const saved =
      window.localStorage.getItem("primey-locale") ||
      window.localStorage.getItem("locale") ||
      window.localStorage.getItem("lang");

    if (saved === "en") return "en";
    if (saved === "ar") return "ar";

    return document.documentElement.lang === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function applyDocumentLocale(locale: AppLocale) {
  try {
    if (typeof document === "undefined") return;

    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.body.dir = locale === "ar" ? "rtl" : "ltr";
  } catch {
    // silent
  }
}

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(toNumber(value));
}

function formatDate(value?: string | null): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function normalizeStatus(value?: string): string {
  return String(value || "").replaceAll("_", " ").trim();
}

function getStatusBadgeVariant(status?: string): "default" | "secondary" | "destructive" | "outline" {
  const normalized = String(status || "").toLowerCase();

  if (["active", "paid", "completed", "confirmed", "verified", "issued"].includes(normalized)) {
    return "default";
  }

  if (["blocked", "cancelled", "failed", "refunded"].includes(normalized)) {
    return "destructive";
  }

  if (["pending", "unpaid", "partially_paid", "not_started", "processing", "draft"].includes(normalized)) {
    return "secondary";
  }

  return "outline";
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      isObjectRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : "Request failed.";

    throw new Error(message);
  }

  return payload as T;
}

function buildStatementUrl(filters: {
  dateFrom: string;
  dateTo: string;
  lineType: LineType;
}) {
  const params = new URLSearchParams();

  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);

  params.set("include_orders", filters.lineType === "all" || filters.lineType === "order" ? "true" : "false");
  params.set("include_invoices", filters.lineType === "all" || filters.lineType === "invoice" ? "true" : "false");
  params.set("include_payments", filters.lineType === "all" || filters.lineType === "payment" ? "true" : "false");

  const queryString = params.toString();

  return queryString
    ? `/api/customers/me/statement/?${queryString}`
    : "/api/customers/me/statement/";
}

function resolveLineType(line: CustomerStatementLine): string {
  const rawType = toText(line.type || line.source).toLowerCase();

  if (rawType.includes("order")) return "order";
  if (rawType.includes("invoice")) return "invoice";
  if (rawType.includes("payment")) return "payment";

  if (line.order_id) return "order";
  if (line.invoice_id) return "invoice";
  if (line.payment_id) return "payment";

  return "unknown";
}

function resolveLineReference(line: CustomerStatementLine): string {
  return (
    toText(line.reference) ||
    toText(line.number) ||
    toText(line.title) ||
    String(line.id || "-")
  );
}

function resolveLineAmount(line: CustomerStatementLine): number {
  return toNumber(line.amount || line.debit || line.credit || 0);
}

function sanitizeForExcel(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ============================================================
   Small Components
============================================================ */

function MoneyValue({ value }: { value?: string | number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span>{formatNumber(value ?? 0)}</span>
      <Image
        src={SAR_ICON}
        alt="SAR"
        width={14}
        height={14}
        className="inline-block opacity-80"
      />
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <Badge variant={getStatusBadgeVariant(status)} className="capitalize">
      {normalizeStatus(status) || "-"}
    </Badge>
  );
}

function TypeBadge({ line, locale }: { line: CustomerStatementLine; locale: AppLocale }) {
  const t = dictionary(locale);
  const type = resolveLineType(line);

  const label =
    type === "order"
      ? t.order
      : type === "invoice"
        ? t.invoice
        : type === "payment"
          ? t.payment
          : t.unknown;

  const variant: "default" | "secondary" | "outline" =
    type === "payment" ? "default" : type === "invoice" ? "secondary" : "outline";

  return <Badge variant={variant}>{label}</Badge>;
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  money = false,
}: {
  title: string;
  value?: string | number;
  icon: React.ComponentType<{ className?: string }>;
  money?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="text-2xl font-bold tracking-tight">
            {money ? <MoneyValue value={value || 0} /> : formatNumber(value || 0, 0)}
          </div>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl border bg-background/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">
        {value === undefined || value === null || value === "" ? "-" : value}
      </p>
    </div>
  );
}

function StatementSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-2xl" />
          <Skeleton className="h-4 w-96 rounded-2xl" />
        </div>
        <Skeleton className="h-10 w-28 rounded-2xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-3xl" />
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-11 w-full rounded-2xl" />
          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton className="h-11 rounded-2xl" />
            <Skeleton className="h-11 rounded-2xl" />
            <Skeleton className="h-11 rounded-2xl" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10">
        <FileText className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/* ============================================================
   Page
============================================================ */

export default function CustomerStatementPage() {
  const [locale, setLocale] = useState<AppLocale>("ar");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [whoami, setWhoami] = useState<WhoamiResponse | null>(null);
  const [statement, setStatement] = useState<CustomerStatementResponse | null>(null);

  const [search, setSearch] = useState("");
  const [lineType, setLineType] = useState<LineType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const currentLocale = readLocale();
    setLocale(currentLocale);
    applyDocumentLocale(currentLocale);
  }, []);

  const t = dictionary(locale);
  const isRtl = locale === "ar";

  const customer =
    statement?.customer ||
    statement?.statement?.customer;

  const summary =
    statement?.summary ||
    statement?.statement?.summary ||
    {};

  const rawLines =
    statement?.lines ||
    statement?.statement?.lines ||
    [];

  const canViewCustomer =
    Boolean(whoami?.authenticated) &&
    (whoami?.workspace === "customer" || whoami?.entity_type === "customer");

  const filteredLines = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rawLines.filter((line) => {
      const currentType = resolveLineType(line);

      if (lineType !== "all" && currentType !== lineType) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        line.type,
        line.source,
        line.title,
        line.reference,
        line.number,
        line.status,
        line.payment_status,
        line.description,
        line.notes,
        line.amount,
        line.debit,
        line.credit,
        line.balance,
      ]
        .map((item) => String(item ?? "").toLowerCase())
        .join(" ");

      return haystack.includes(query);
    });
  }, [lineType, rawLines, search]);

  const loadData = useCallback(
    async (silent = false) => {
      if (dateFrom && dateTo && dateFrom > dateTo) {
        toast.error(t.invalidDates);
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      try {
        const [whoamiPayload, statementPayload] = await Promise.all([
          fetchJson<WhoamiResponse>("/api/auth/whoami/"),
          fetchJson<CustomerStatementResponse>(
            buildStatementUrl({
              dateFrom,
              dateTo,
              lineType,
            }),
          ),
        ]);

        setWhoami(whoamiPayload);
        setStatement(statementPayload);

        if (!whoamiPayload.authenticated) {
          setErrorMessage(t.authError);
          return;
        }

        if (
          whoamiPayload.workspace &&
          whoamiPayload.workspace !== "customer" &&
          whoamiPayload.entity_type !== "customer"
        ) {
          setErrorMessage(t.wrongWorkspace);
          return;
        }

        if (silent) {
          toast.success(t.loadSuccess);
        }
      } catch (error) {
        const message = getErrorMessage(error, t.loadError);
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      dateFrom,
      dateTo,
      lineType,
      t.authError,
      t.invalidDates,
      t.loadError,
      t.loadSuccess,
      t.wrongWorkspace,
    ],
  );

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  function exportExcel() {
    const rows = filteredLines.map((line) => ({
      date: formatDate(line.date || line.created_at),
      type:
        resolveLineType(line) === "order"
          ? t.order
          : resolveLineType(line) === "invoice"
            ? t.invoice
            : resolveLineType(line) === "payment"
              ? t.payment
              : t.unknown,
      reference: resolveLineReference(line),
      description: line.description || line.title || line.notes || "",
      status: normalizeStatus(line.status || line.payment_status),
      debit: formatNumber(line.debit || 0),
      credit: formatNumber(line.credit || 0),
      amount: formatNumber(resolveLineAmount(line)),
      balance: formatNumber(line.balance || 0),
    }));

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
            th, td { border: 1px solid #d9d9d9; padding: 8px; text-align: ${locale === "ar" ? "right" : "left"}; }
            th { background: #f3f4f6; font-weight: bold; }
            h1, p { font-family: Arial, sans-serif; }
          </style>
        </head>
        <body dir="${locale === "ar" ? "rtl" : "ltr"}">
          <h1>${sanitizeForExcel(t.title)}</h1>
          <p>${sanitizeForExcel(customer?.display_name || customer?.full_name || "")}</p>
          <table>
            <thead>
              <tr>
                <th>${sanitizeForExcel(t.date)}</th>
                <th>${sanitizeForExcel(t.type)}</th>
                <th>${sanitizeForExcel(t.reference)}</th>
                <th>${sanitizeForExcel(t.description)}</th>
                <th>${sanitizeForExcel(t.status)}</th>
                <th>${sanitizeForExcel(t.debit)}</th>
                <th>${sanitizeForExcel(t.credit)}</th>
                <th>${sanitizeForExcel(t.amount)}</th>
                <th>${sanitizeForExcel(t.balance)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${sanitizeForExcel(row.date)}</td>
                      <td>${sanitizeForExcel(row.type)}</td>
                      <td>${sanitizeForExcel(row.reference)}</td>
                      <td>${sanitizeForExcel(row.description)}</td>
                      <td>${sanitizeForExcel(row.status)}</td>
                      <td>${sanitizeForExcel(row.debit)}</td>
                      <td>${sanitizeForExcel(row.credit)}</td>
                      <td>${sanitizeForExcel(row.amount)}</td>
                      <td>${sanitizeForExcel(row.balance)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `customer-statement-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    toast.success(t.exported);
  }

  function printStatement() {
    window.print();
  }

  if (loading) {
    return <StatementSkeleton />;
  }

  if (errorMessage || !canViewCustomer) {
    return (
      <div className="w-full space-y-4">
        <Card>
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold">{errorMessage || t.authError}</h2>
              <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            </div>

            <Button
              type="button"
              onClick={() => void loadData(false)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <section className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between print:hidden">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="px-0">
            <Link href="/customer">
              <ArrowRight className={`h-4 w-4 ${isRtl ? "" : "rotate-180"}`} />
              {t.back}
            </Link>
          </Button>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="w-full sm:w-auto"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={exportExcel}
            disabled={!filteredLines.length}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            {t.exportExcel}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={printStatement}
            className="w-full sm:w-auto"
          >
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          title={t.ordersCount}
          value={summary.orders_count || 0}
          icon={FileText}
        />
        <SummaryCard
          title={t.invoicesCount}
          value={summary.invoices_count || 0}
          icon={ReceiptText}
        />
        <SummaryCard
          title={t.paymentsCount}
          value={summary.payments_count || 0}
          icon={WalletCards}
        />
        <SummaryCard
          title={t.invoicesAmount}
          value={summary.total_invoices_amount || 0}
          icon={ReceiptText}
          money
        />
        <SummaryCard
          title={t.paidAmount}
          value={summary.total_paid_amount || 0}
          icon={WalletCards}
          money
        />
        <SummaryCard
          title={t.dueAmount}
          value={summary.total_due_amount || summary.balance_due || 0}
          icon={CalendarDays}
          money
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.customerInfo}</CardTitle>
            <CardDescription>{customer?.display_name || customer?.full_name || t.noData}</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-3">
            <InfoBox label={t.customerCode} value={customer?.customer_code} />
            <InfoBox label={t.phone} value={customer?.primary_contact_number || customer?.phone_number} />
            <InfoBox
              label={t.accountStatus}
              value={customer?.has_customer_account ? t.verified : t.notVerified}
            />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-5 w-5 text-primary" />
              {t.summary}
            </CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-11 w-full rounded-2xl border border-input bg-background ps-10 pe-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.dateFrom}</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setDateFrom(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.dateTo}</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setDateTo(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.movementType}</label>
                <select
                  value={lineType}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => setLineType(event.target.value as LineType)}
                  className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="all">{t.all}</option>
                  <option value="order">{t.orders}</option>
                  <option value="invoice">{t.invoices}</option>
                  <option value="payment">{t.payments}</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={() => void loadData(true)}
                  disabled={refreshing}
                  className="h-11 w-full"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  {t.refresh}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-primary" />
            {t.statementLines}
          </CardTitle>
          <CardDescription>
            {formatNumber(filteredLines.length, 0)} {t.statementLines}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {filteredLines.length ? (
            <>
              <div className="hidden overflow-hidden rounded-2xl border md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-start font-semibold">{t.date}</th>
                      <th className="px-4 py-3 text-start font-semibold">{t.type}</th>
                      <th className="px-4 py-3 text-start font-semibold">{t.reference}</th>
                      <th className="px-4 py-3 text-start font-semibold">{t.description}</th>
                      <th className="px-4 py-3 text-start font-semibold">{t.status}</th>
                      <th className="px-4 py-3 text-end font-semibold">{t.amount}</th>
                      <th className="px-4 py-3 text-end font-semibold">{t.balance}</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredLines.map((line, index) => (
                      <tr
                        key={`${line.id || resolveLineReference(line)}-${index}`}
                        className="border-t transition hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(line.date || line.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <TypeBadge line={line} locale={locale} />
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {resolveLineReference(line)}
                        </td>
                        <td className="max-w-[320px] px-4 py-3 text-muted-foreground">
                          <span className="line-clamp-2">
                            {line.description || line.title || line.notes || t.noData}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={line.status || line.payment_status} />
                        </td>
                        <td className="px-4 py-3 text-end font-semibold">
                          <MoneyValue value={resolveLineAmount(line)} />
                        </td>
                        <td className="px-4 py-3 text-end">
                          <MoneyValue value={line.balance || 0} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredLines.map((line, index) => (
                  <div
                    key={`${line.id || resolveLineReference(line)}-${index}`}
                    className="rounded-2xl border bg-background/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold">{resolveLineReference(line)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(line.date || line.created_at)}
                        </p>
                      </div>
                      <TypeBadge line={line} locale={locale} />
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">
                      {line.description || line.title || line.notes || t.noData}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <StatusBadge status={line.status || line.payment_status} />
                      <MoneyValue value={resolveLineAmount(line)} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}