"use client";

import * as React from "react";
import {
  Activity,
  ArrowUpDown,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileSpreadsheet,
  Gauge,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  TableProperties,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DataRegisterEmptyState,
  DataRegisterSearch,
  DataRegisterToolbar,
  registerBrandButtonClass,
  registerOutlineButtonClass,
} from "@/components/ui/data-register";
import {
  DataRegisterResultCount,
  DataRegisterTableFrame,
} from "@/components/ui/data-register-table";
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
import {
  downloadExcelReport,
  type ExcelReportSection,
} from "@/lib/excel-report";
import {
  openPrintTableReport,
  type PrintReportTableSection,
} from "@/lib/print-report";
import {
  formatDateTime,
  formatInteger,
  MoneyValue,
  readSystemLocale,
} from "@/lib/system-subscriptions";
import {
  fetchAllSystemPlatformPayments,
  fetchSystemPlatformPaymentMetrics,
  fetchSystemPlatformPayments,
  paymentStatusLabel,
  PlatformPaymentStatusBadge,
  type SystemLocale,
  type SystemPlatformPaymentMetrics,
  type SystemPlatformPaymentRecord,
} from "@/lib/system-platform-payments";

import { PlatformPaymentOperationsCenter } from "@/app/system/platform-payments/components/platform-payment-operations-center";

type SortKey = "newest" | "oldest" | "company" | "amount";

const translations = {
  ar: {
    title: "مدفوعات المنصة",
    subtitle:
      "مركز عمليات دفع اشتراكات Mhamcloud مع حالة الدفع والبوابة والمراجع والربط المباشر بالسجلات المالية.",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    total: "إجمالي العمليات",
    paid: "العمليات المدفوعة",
    processing: "قيد الانتظار والمعالجة",
    failed: "فاشلة أو ملغاة",
    platformSummary: "من تقرير المنصة التشغيلي",
    pageSummary: "من السجلات المحملة في الصفحة الحالية",
    distributionTitle: "حالات الدفع",
    distributionDesc:
      "توزيع عمليات دفع اشتراكات المنصة حسب الحالة الحالية.",
    financialTitle: "ملخص التحصيل",
    financialDesc:
      "إجمالي المدفوع ونسب النجاح والفشل من تقرير المنصة.",
    grossPaid: "إجمالي المدفوع",
    successRate: "نسبة النجاح",
    failureRate: "نسبة الفشل",
    gateways: "البوابات المسجلة",
    tableTitle: "سجل مدفوعات المنصة",
    tableDesc:
      "كل عملية في صف مستقل؛ اضغط على الصف لفتح تفاصيل الدفع والأحداث والسجل المالي.",
    search:
      "ابحث بمرجع الدفع أو الشركة أو مرجع المزود أو العملية أو الفوترة...",
    all: "الكل",
    status: "الحالة",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    companySort: "الشركة",
    amountSort: "المبلغ",
    reset: "إعادة ضبط",
    reference: "مرجع الدفع",
    company: "الشركة",
    plan: "الباقة / الاشتراك",
    gateway: "البوابة",
    method: "طريقة الدفع",
    amount: "المبلغ",
    attempt: "المحاولة",
    transaction: "مرجع العملية",
    createdAt: "تاريخ الإنشاء",
    paidAt: "تاريخ الدفع",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    page: "صفحة",
    previous: "السابق",
    next: "التالي",
    noData: "لا توجد عمليات دفع",
    noDataDesc: "ستظهر عمليات دفع اشتراكات المنصة هنا عند توفرها من API.",
    noResults: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    error: "تعذر تحميل مدفوعات المنصة",
    retry: "إعادة المحاولة",
    refreshed: "تم تحديث مدفوعات المنصة.",
    exporting: "جاري تجهيز التقرير...",
    reportTitle: "تقرير مدفوعات منصة Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
  },
  en: {
    title: "Platform Payments",
    subtitle:
      "Mhamcloud subscription payment operations center with statuses, gateways, references, and direct financial record links.",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    total: "Total payments",
    paid: "Paid payments",
    processing: "Pending & processing",
    failed: "Failed or cancelled",
    platformSummary: "From the operational platform report",
    pageSummary: "From records loaded on the current page",
    distributionTitle: "Payment statuses",
    distributionDesc:
      "Platform subscription payment distribution by current status.",
    financialTitle: "Collection summary",
    financialDesc:
      "Gross paid amount and success/failure rates from the platform report.",
    grossPaid: "Gross paid",
    successRate: "Success rate",
    failureRate: "Failure rate",
    gateways: "Registered gateways",
    tableTitle: "Platform payment register",
    tableDesc:
      "Each payment is a separate row; click a row to open payment details, events, and financial history.",
    search:
      "Search payment reference, company, provider ID, transaction, or billing reference...",
    all: "All",
    status: "Status",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    companySort: "Company",
    amountSort: "Amount",
    reset: "Reset",
    reference: "Payment reference",
    company: "Company",
    plan: "Plan / subscription",
    gateway: "Gateway",
    method: "Payment method",
    amount: "Amount",
    attempt: "Attempt",
    transaction: "Transaction reference",
    createdAt: "Created at",
    paidAt: "Paid at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    page: "Page",
    previous: "Previous",
    next: "Next",
    noData: "No platform payments",
    noDataDesc:
      "Platform subscription payments will appear here when returned by the API.",
    noResults: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    error: "Could not load platform payments",
    retry: "Try again",
    refreshed: "Platform payments refreshed.",
    exporting: "Preparing report...",
    reportTitle: "Mhamcloud Platform Payments Report",
    generatedAt: "Generated at",
  },
} as const;

function timeValue(value: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortRows(rows: SystemPlatformPaymentRecord[], sort: SortKey) {
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return timeValue(a.createdAt) - timeValue(b.createdAt);
    if (sort === "company") return a.companyName.localeCompare(b.companyName);
    if (sort === "amount") return Number(b.amount) - Number(a.amount);
    const diff = timeValue(b.createdAt) - timeValue(a.createdAt);
    if (diff !== 0) return diff;
    return Number(b.id || 0) - Number(a.id || 0);
  });
}

export default function SystemPlatformPaymentsPage() {
  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [rows, setRows] = React.useState<SystemPlatformPaymentRecord[]>([]);
  const [metrics, setMetrics] =
    React.useState<SystemPlatformPaymentMetrics | null>(null);
  const [totalCount, setTotalCount] = React.useState(0);
  const [pages, setPages] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("newest");

  const deferredSearch = React.useDeferredValue(search);
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

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

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch, status]);

  const load = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const result = await fetchSystemPlatformPayments({
          q: deferredSearch,
          status,
          page,
          pageSize: 50,
        });

        setRows(result.rows);
        setTotalCount(result.count);
        setPages(result.pages);

        try {
          const nextMetrics = await fetchSystemPlatformPaymentMetrics();
          setMetrics(nextMetrics);
        } catch {
          setMetrics(null);
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
    [deferredSearch, page, status, t.error, t.refreshed],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  const sortedRows = React.useMemo(() => sortRows(rows, sort), [rows, sort]);

  const fallback = React.useMemo(
    () => ({
      total: totalCount,
      pending: rows.filter((row) => row.status === "pending").length,
      processing: rows.filter((row) => row.status === "processing").length,
      paid: rows.filter((row) => row.status === "paid").length,
      failed: rows.filter((row) => row.status === "failed").length,
      cancelled: rows.filter((row) => row.status === "cancelled").length,
    }),
    [rows, totalCount],
  );

  const stats = metrics
    ? {
        total: metrics.total,
        pending: metrics.pending,
        processing: metrics.processing,
        paid: metrics.paid,
        failed: metrics.failed,
        cancelled: metrics.cancelled,
      }
    : fallback;

  const hasFilters = Boolean(
    search || status !== "all" || sort !== "newest",
  );

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setSort("newest");
    setPage(1);
  }

  function rowsForReport(source: SystemPlatformPaymentRecord[]) {
    return source.map((row) => [
      row.paymentReference,
      row.companyName,
      row.companyCode,
      row.planName,
      row.subscriptionId,
      row.gateway,
      row.paymentMethod,
      row.amount,
      paymentStatusLabel(row.status, locale),
      formatInteger(row.attemptNumber),
      row.transactionReference || "—",
      formatDateTime(row.createdAt),
      formatDateTime(row.paidAt),
    ]);
  }

  function printSection(source: SystemPlatformPaymentRecord[]): PrintReportTableSection {
    return {
      title: t.tableTitle,
      columns: [
        { label: t.reference, width: 150, type: "text" },
        { label: t.company, width: 190, type: "text" },
        { label: t.plan, width: 160, type: "text" },
        { label: t.gateway, width: 100, type: "text" },
        { label: t.method, width: 110, type: "text" },
        { label: t.amount, width: 110, type: "text" },
        { label: t.status, width: 105, type: "text" },
        { label: t.createdAt, width: 145, type: "text" },
        { label: t.paidAt, width: 145, type: "text" },
      ],
      rows: rowsForReport(source).map((row) => [
        row[0],
        `${row[1]} — ${row[2]}`,
        `${row[3]} — #${row[4]}`,
        row[5],
        row[6],
        row[7],
        row[8],
        row[11],
        row[12],
      ]),
    };
  }

  async function loadAllForReport() {
    const all = await fetchAllSystemPlatformPayments({
      q: deferredSearch,
      status,
    });
    return sortRows(all, sort);
  }

  async function exportExcel() {
    try {
      setExporting(true);
      const all = await loadAllForReport();
      if (!all.length) {
        toast.error(t.noData);
        return;
      }

      const section: ExcelReportSection = {
        title: t.tableTitle,
        headers: [
          t.reference,
          t.company,
          "Code",
          t.plan,
          "Subscription ID",
          t.gateway,
          t.method,
          t.amount,
          t.status,
          t.attempt,
          t.transaction,
          t.createdAt,
          t.paidAt,
        ],
        rows: rowsForReport(all).map((row) =>
          row.map((value) => ({ value, type: "text" as const })),
        ),
      };

      downloadExcelReport({
        locale,
        title: t.reportTitle,
        filename: `Mhamcloud-platform-payments-${new Date().toISOString().slice(0, 10)}.xls`,
        generatedAtLabel: t.generatedAt,
        sections: [section],
      });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t.error);
    } finally {
      setExporting(false);
    }
  }

  async function printRows() {
    try {
      setExporting(true);
      const all = await loadAllForReport();
      if (!all.length) {
        toast.error(t.noData);
        return;
      }

      openPrintTableReport({
        locale,
        title: t.reportTitle,
        sections: [printSection(all)],
        recordsCount: all.length,
        recordsLabel: t.rows,
        generatedAtLabel: t.generatedAt,
      });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t.error);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-[560px]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card dir={dir}>
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <Activity className="size-9 text-destructive" />
          <CardTitle>{t.error}</CardTitle>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => void load()}>{t.retry}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div dir={dir} className="space-y-4 lg:space-y-6">
      <header className="flex flex-row items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {t.title}
          </h1>
          <p className="mt-1 hidden text-sm text-muted-foreground lg:block">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            className={registerOutlineButtonClass}
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            <span className="hidden lg:inline">{t.refresh}</span>
          </Button>
          <Button
            variant="outline"
            className={registerOutlineButtonClass}
            onClick={() => void exportExcel()}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <FileSpreadsheet />
            )}
            <span className="hidden lg:inline">
              {exporting ? t.exporting : t.exportExcel}
            </span>
          </Button>
          <Button
            className={registerBrandButtonClass}
            onClick={() => void printRows()}
            disabled={exporting}
          >
            <Printer />
            <span className="hidden lg:inline">{t.print}</span>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
        <SystemMetricCard
          title={t.total}
          value={stats.total}
          description={metrics ? t.platformSummary : t.pageSummary}
          icon={CreditCard}
        />
        <SystemMetricCard
          title={t.paid}
          value={stats.paid}
          description={metrics ? t.platformSummary : t.pageSummary}
          icon={CheckCircle2}
        />
        <SystemMetricCard
          title={t.processing}
          value={stats.pending + stats.processing}
          description={metrics ? t.platformSummary : t.pageSummary}
          icon={Gauge}
        />
        <SystemMetricCard
          title={t.failed}
          value={stats.failed + stats.cancelled}
          description={metrics ? t.platformSummary : t.pageSummary}
          icon={TriangleAlert}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={Activity} iconPosition="opposite">
              {t.distributionTitle}
            </CardTitle>
            <CardDescription>{t.distributionDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              ["paid", stats.paid],
              ["processing", stats.processing],
              ["pending", stats.pending],
              ["failed", stats.failed],
              ["cancelled", stats.cancelled],
            ].map(([key, value]) => (
              <div
                key={String(key)}
                className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted"
              >
                <PlatformPaymentStatusBadge
                  value={String(key)}
                  locale={locale}
                />
                <span
                  dir="ltr"
                  lang="en"
                  className="font-display text-lg tabular-nums"
                >
                  {formatInteger(value)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={CircleDollarSign} iconPosition="opposite">
              {t.financialTitle}
            </CardTitle>
            <CardDescription>{t.financialDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border px-4 py-3">
              <p className="text-xs text-muted-foreground">{t.grossPaid}</p>
              <div className="mt-2 text-lg font-semibold">
                {metrics ? (
                  <MoneyValue
                    amount={metrics.grossPaid}
                    currency={metrics.currency}
                  />
                ) : (
                  "—"
                )}
              </div>
            </div>
            <div className="rounded-md border px-4 py-3">
              <p className="text-xs text-muted-foreground">{t.successRate}</p>
              <p
                dir="ltr"
                lang="en"
                className="mt-2 text-lg font-semibold tabular-nums"
              >
                {metrics ? `${metrics.successRate}%` : "—"}
              </p>
            </div>
            <div className="rounded-md border px-4 py-3">
              <p className="text-xs text-muted-foreground">{t.failureRate}</p>
              <p
                dir="ltr"
                lang="en"
                className="mt-2 text-lg font-semibold tabular-nums"
              >
                {metrics ? `${metrics.failureRate}%` : "—"}
              </p>
            </div>
            <div className="rounded-md border px-4 py-3">
              <p className="text-xs text-muted-foreground">{t.gateways}</p>
              <p
                dir="ltr"
                lang="en"
                className="mt-2 text-lg font-semibold tabular-nums"
              >
                {metrics
                  ? formatInteger(metrics.gatewayPerformance.length)
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={TableProperties}>{t.tableTitle}</CardTitle>
          <CardDescription>{t.tableDesc}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <DataRegisterToolbar className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
              <DataRegisterSearch
                value={search}
                onChange={setSearch}
                placeholder={t.search}
                className="w-full md:min-w-[340px] md:flex-1"
              />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[170px]">
                  <SelectValue placeholder={t.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="paid">
                    {paymentStatusLabel("paid", locale)}
                  </SelectItem>
                  <SelectItem value="pending">
                    {paymentStatusLabel("pending", locale)}
                  </SelectItem>
                  <SelectItem value="processing">
                    {paymentStatusLabel("processing", locale)}
                  </SelectItem>
                  <SelectItem value="failed">
                    {paymentStatusLabel("failed", locale)}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {paymentStatusLabel("cancelled", locale)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={sort}
                onValueChange={(value) => setSort(value as SortKey)}
              >
                <SelectTrigger className="h-9 bg-background shadow-none sm:w-[185px]">
                  <ArrowUpDown />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t.newest}</SelectItem>
                  <SelectItem value="oldest">{t.oldest}</SelectItem>
                  <SelectItem value="company">{t.companySort}</SelectItem>
                  <SelectItem value="amount">{t.amountSort}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="h-9 bg-background shadow-none"
                onClick={resetFilters}
              >
                <RotateCcw />
                {t.reset}
              </Button>
            </div>
          </DataRegisterToolbar>

          <DataRegisterTableFrame>
            <Table className="min-w-[1510px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[170px] px-4">{t.reference}</TableHead>
                  <TableHead className="w-[210px] px-4">{t.company}</TableHead>
                  <TableHead className="w-[185px] px-4">{t.plan}</TableHead>
                  <TableHead className="w-[110px] px-4">{t.gateway}</TableHead>
                  <TableHead className="w-[120px] px-4">{t.method}</TableHead>
                  <TableHead className="w-[120px] px-4">{t.amount}</TableHead>
                  <TableHead className="w-[120px] px-4">{t.status}</TableHead>
                  <TableHead className="w-[90px] px-4">{t.attempt}</TableHead>
                  <TableHead className="w-[170px] px-4">
                    {t.transaction}
                  </TableHead>
                  <TableHead className="w-[160px] px-4">
                    {t.createdAt}
                  </TableHead>
                  <TableHead className="w-[160px] px-4">{t.paidAt}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedRows.length ? (
                  sortedRows.map((row) => (
                    <TableRow
                      key={row.id}
                      href={
                        row.id
                          ? `/system/platform-payments/${row.id}`
                          : undefined
                      }
                      aria-label={`${t.title}: ${row.paymentReference}`}
                    >
                      <TableCell className="px-4">
                        <div className="min-w-0">
                          <span
                            dir="ltr"
                            lang="en"
                            className="block truncate font-medium"
                          >
                            {row.paymentReference}
                          </span>
                          {row.billingReference ? (
                            <span
                              dir="ltr"
                              lang="en"
                              className="block truncate text-xs text-muted-foreground"
                            >
                              {row.billingReference}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="min-w-0">
                          <span className="block truncate font-medium">
                            {row.companyName}
                          </span>
                          <span
                            dir="ltr"
                            lang="en"
                            className="block truncate text-xs text-muted-foreground"
                          >
                            {row.companyCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="min-w-0">
                          <span className="block truncate">{row.planName}</span>
                          <span
                            dir="ltr"
                            lang="en"
                            className="block text-xs text-muted-foreground"
                          >
                            #{row.subscriptionId || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        <span dir="ltr" lang="en">{row.gateway}</span>
                      </TableCell>
                      <TableCell className="px-4">
                        <span dir="ltr" lang="en">{row.paymentMethod}</span>
                      </TableCell>
                      <TableCell className="px-4">
                        <MoneyValue amount={row.amount} currency={row.currency} />
                      </TableCell>
                      <TableCell className="px-4">
                        <PlatformPaymentStatusBadge
                          value={row.status}
                          locale={locale}
                        />
                      </TableCell>
                      <TableCell className="px-4">
                        <span dir="ltr" lang="en" className="tabular-nums">
                          {formatInteger(row.attemptNumber)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4">
                        <span
                          dir="ltr"
                          lang="en"
                          className="block truncate tabular-nums text-muted-foreground"
                        >
                          {row.transactionReference || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="px-4">
                        <span
                          dir="ltr"
                          lang="en"
                          className="tabular-nums text-muted-foreground"
                        >
                          {formatDateTime(row.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4">
                        <span
                          dir="ltr"
                          lang="en"
                          className="tabular-nums text-muted-foreground"
                        >
                          {formatDateTime(row.paidAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11}>
                      <DataRegisterEmptyState
                        title={hasFilters ? t.noResults : t.noData}
                        description={hasFilters ? t.noResultsDesc : t.noDataDesc}
                        showReset={hasFilters}
                        resetLabel={t.reset}
                        onReset={resetFilters}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DataRegisterTableFrame>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DataRegisterResultCount
              showingLabel={t.showing}
              showingCount={formatInteger(rows.length)}
              ofLabel={t.of}
              totalCount={formatInteger(totalCount)}
              rowsLabel={t.rows}
            />

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 bg-background shadow-none"
                disabled={page <= 1 || refreshing}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {t.previous}
              </Button>
              <span
                dir="ltr"
                lang="en"
                className="min-w-24 text-center text-sm tabular-nums text-muted-foreground"
              >
                {t.page} {formatInteger(page)} / {formatInteger(pages)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 bg-background shadow-none"
                disabled={page >= pages || refreshing}
                onClick={() =>
                  setPage((value) => Math.min(pages, value + 1))
                }
              >
                {t.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PlatformPaymentOperationsCenter locale={locale} />
    </div>
  );
}
