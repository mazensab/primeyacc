"use client";

import * as React from "react";
import {
  Activity,
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  TableProperties,
  WalletCards,
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
  DataRegisterDatePicker,
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
  BillingDocumentStatusBadge,
  BillingDocumentTypeBadge,
  billingDocumentStatusLabel,
  billingDocumentTypeLabel,
  emptyBillingDocumentStats,
  fetchSystemBillingDocuments,
  type SystemBillingDocumentRecord,
  type SystemBillingDocumentStats,
} from "@/lib/system-billing-documents";
import {
  formatDate,
  formatInteger,
  MoneyValue,
  readSystemLocale,
  type SystemLocale,
} from "@/lib/system-subscriptions";

type SortKey = "newest" | "oldest" | "company" | "amount";

const PAGE_SIZE = 50;

const translations = {
  ar: {
    title: "الفواتير والإيصالات",
    subtitle:
      "مركز مستندات فوترة اشتراكات Mhamcloud مع الفواتير وإيصالات الدفع والقيم الضريبية والروابط التشغيلية.",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    total: "إجمالي المستندات",
    invoices: "فواتير الاشتراك",
    receipts: "إيصالات الدفع",
    paidDocs: "المستندات المدفوعة",
    filteredSummary: "حسب الفلاتر الحالية",
    statusTitle: "حالات المستندات",
    statusDesc: "توزيع مستندات الفوترة حسب حالتها الحالية.",
    financialTitle: "الملخص المالي",
    financialDesc:
      "القيم الإجمالية للمستندات الظاهرة حسب الفلاتر الحالية.",
    totalAmount: "إجمالي القيمة",
    paidAmount: "المدفوع المسجل بالمستندات",
    balanceAmount: "إجمالي المتبقي",
    taxAmount: "إجمالي الضريبة",
    tableTitle: "سجل الفواتير والإيصالات",
    tableDesc:
      "كل مستند في صف مستقل؛ اضغط على الصف لفتح التفاصيل والبيانات الثابتة والطباعة.",
    search:
      "ابحث برقم المستند أو الشركة أو مرجع الفوترة أو العملية أو طريقة الدفع...",
    all: "الكل",
    type: "نوع المستند",
    status: "الحالة",
    from: "من تاريخ",
    to: "إلى تاريخ",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    companySort: "الشركة",
    amountSort: "القيمة",
    reset: "إعادة ضبط",
    documentNumber: "رقم المستند",
    company: "الشركة",
    plan: "الباقة / الاشتراك",
    amount: "الإجمالي",
    paid: "المدفوع",
    balance: "المتبقي",
    paymentMethod: "طريقة الدفع",
    issueDate: "تاريخ الإصدار",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    page: "صفحة",
    previous: "السابق",
    next: "التالي",
    noData: "لا توجد مستندات فوترة",
    noDataDesc:
      "ستظهر فواتير الاشتراكات وإيصالات الدفع هنا عند توفرها من API.",
    noResults: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    error: "تعذر تحميل الفواتير والإيصالات",
    retry: "إعادة المحاولة",
    refreshed: "تم تحديث مستندات الفوترة.",
    exporting: "جاري تجهيز التقرير...",
    reportTitle: "تقرير فواتير وإيصالات منصة Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
  },
  en: {
    title: "Invoices & Receipts",
    subtitle:
      "Mhamcloud subscription billing documents center with invoices, payment receipts, tax values, and operational links.",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    total: "Total documents",
    invoices: "Subscription invoices",
    receipts: "Payment receipts",
    paidDocs: "Paid documents",
    filteredSummary: "Based on current filters",
    statusTitle: "Document statuses",
    statusDesc: "Billing document distribution by current status.",
    financialTitle: "Financial summary",
    financialDesc: "Document totals based on the current filters.",
    totalAmount: "Total amount",
    paidAmount: "Paid recorded on documents",
    balanceAmount: "Balance amount",
    taxAmount: "Tax amount",
    tableTitle: "Invoices & receipts register",
    tableDesc:
      "Each document is a separate row; click it to open details, immutable snapshots, and printing.",
    search:
      "Search document number, company, billing reference, transaction, or payment method...",
    all: "All",
    type: "Document type",
    status: "Status",
    from: "From date",
    to: "To date",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    companySort: "Company",
    amountSort: "Amount",
    reset: "Reset",
    documentNumber: "Document number",
    company: "Company",
    plan: "Plan / subscription",
    amount: "Total",
    paid: "Paid",
    balance: "Balance",
    paymentMethod: "Payment method",
    issueDate: "Issue date",
    showing: "Showing",
    of: "of",
    rows: "rows",
    page: "Page",
    previous: "Previous",
    next: "Next",
    noData: "No billing documents",
    noDataDesc:
      "Subscription invoices and payment receipts will appear here when returned by the API.",
    noResults: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    error: "Could not load invoices and receipts",
    retry: "Try again",
    refreshed: "Billing documents refreshed.",
    exporting: "Preparing report...",
    reportTitle: "Mhamcloud Platform Invoices & Receipts Report",
    generatedAt: "Generated at",
  },
} as const;

function timeValue(value: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortRows(rows: SystemBillingDocumentRecord[], sort: SortKey) {
  return [...rows].sort((a, b) => {
    if (sort === "oldest") {
      return timeValue(a.issuedAt) - timeValue(b.issuedAt);
    }
    if (sort === "company") {
      return a.companyName.localeCompare(b.companyName);
    }
    if (sort === "amount") {
      return Number(b.totalAmount) - Number(a.totalAmount);
    }
    const diff = timeValue(b.issuedAt) - timeValue(a.issuedAt);
    if (diff !== 0) return diff;
    return Number(b.id || 0) - Number(a.id || 0);
  });
}

export default function SystemBillingDocumentsPage() {
  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [rows, setRows] = React.useState<SystemBillingDocumentRecord[]>([]);
  const [stats, setStats] = React.useState<SystemBillingDocumentStats>(
    emptyBillingDocumentStats,
  );
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [documentType, setDocumentType] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [issueDateFrom, setIssueDateFrom] = React.useState("");
  const [issueDateTo, setIssueDateTo] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [page, setPage] = React.useState(1);

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
  }, [deferredSearch, documentType, status, issueDateFrom, issueDateTo, sort]);

  const load = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const result = await fetchSystemBillingDocuments({
          search: deferredSearch,
          documentType,
          status,
          issueDateFrom,
          issueDateTo,
        });

        setRows(result.rows);
        setStats(result.stats);
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
    [
      deferredSearch,
      documentType,
      status,
      issueDateFrom,
      issueDateTo,
      t.error,
      t.refreshed,
    ],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  const sortedRows = React.useMemo(() => sortRows(rows, sort), [rows, sort]);
  const pages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visibleRows = sortedRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const hasFilters = Boolean(
    search ||
      documentType !== "all" ||
      status !== "all" ||
      issueDateFrom ||
      issueDateTo ||
      sort !== "newest",
  );

  function resetFilters() {
    setSearch("");
    setDocumentType("all");
    setStatus("all");
    setIssueDateFrom("");
    setIssueDateTo("");
    setSort("newest");
    setPage(1);
  }

  function reportRows(source: SystemBillingDocumentRecord[]) {
    return source.map((row) => [
      row.documentNumber,
      billingDocumentTypeLabel(row.documentType, locale),
      row.companyName,
      row.companyCode,
      row.planName,
      row.subscriptionId,
      row.totalAmount,
      row.currency,
      row.paidAmount,
      row.balanceAmount,
      billingDocumentStatusLabel(row.status, locale),
      row.paymentMethod || "—",
      formatDate(row.issueDate),
    ]);
  }

  function printSection(
    source: SystemBillingDocumentRecord[],
  ): PrintReportTableSection {
    return {
      title: t.tableTitle,
      columns: [
        { label: t.documentNumber, width: 145, type: "text" },
        { label: t.type, width: 125, type: "text" },
        { label: t.company, width: 180, type: "text" },
        { label: t.plan, width: 160, type: "text" },
        { label: t.amount, width: 105, type: "text" },
        { label: t.paid, width: 105, type: "text" },
        { label: t.balance, width: 105, type: "text" },
        { label: t.status, width: 90, type: "text" },
        { label: t.issueDate, width: 110, type: "text" },
      ],
      rows: reportRows(source).map((row) => [
        row[0],
        row[1],
        `${row[2]} — ${row[3]}`,
        `${row[4]} — #${row[5]}`,
        `${row[6]} ${row[7]}`,
        `${row[8]} ${row[7]}`,
        `${row[9]} ${row[7]}`,
        row[10],
        row[12],
      ]),
    };
  }

  async function exportExcel() {
    try {
      setExporting(true);
      if (!sortedRows.length) {
        toast.error(t.noData);
        return;
      }

      const section: ExcelReportSection = {
        title: t.tableTitle,
        headers: [
          t.documentNumber,
          t.type,
          t.company,
          "Code",
          t.plan,
          "Subscription ID",
          t.amount,
          "Currency",
          t.paid,
          t.balance,
          t.status,
          t.paymentMethod,
          t.issueDate,
        ],
        rows: reportRows(sortedRows).map((row) =>
          row.map((value) => ({ value, type: "text" as const })),
        ),
      };

      downloadExcelReport({
        locale,
        title: t.reportTitle,
        filename: `Mhamcloud-platform-billing-documents-${new Date()
          .toISOString()
          .slice(0, 10)}.xls`,
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
      if (!sortedRows.length) {
        toast.error(t.noData);
        return;
      }

      openPrintTableReport({
        locale,
        title: t.reportTitle,
        sections: [printSection(sortedRows)],
        recordsCount: sortedRows.length,
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
            className={registerBrandButtonClass}
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            <span className="hidden lg:inline">{t.refresh}</span>
          </Button>
          <Button
            className={registerBrandButtonClass}
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
          description={t.filteredSummary}
          icon={FileText}
        />
        <SystemMetricCard
          title={t.invoices}
          value={stats.subscriptionInvoices}
          description={t.filteredSummary}
          icon={FileText}
        />
        <SystemMetricCard
          title={t.receipts}
          value={stats.paymentReceipts}
          description={t.filteredSummary}
          icon={ReceiptText}
        />
        <SystemMetricCard
          title={t.paidDocs}
          value={stats.paid}
          description={t.filteredSummary}
          icon={WalletCards}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={Activity} iconPosition="opposite">
              {t.statusTitle}
            </CardTitle>
            <CardDescription>{t.statusDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              ["DRAFT", stats.draft],
              ["ISSUED", stats.issued],
              ["PAID", stats.paid],
              ["CANCELLED", stats.cancelled],
            ].map(([key, value]) => (
              <div
                key={String(key)}
                className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted"
              >
                <BillingDocumentStatusBadge
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
            <CardTitle icon={WalletCards} iconPosition="opposite">
              {t.financialTitle}
            </CardTitle>
            <CardDescription>{t.financialDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              [t.totalAmount, stats.totalAmount],
              [t.paidAmount, stats.paidAmount],
              [t.balanceAmount, stats.balanceAmount],
              [t.taxAmount, stats.taxAmount],
            ].map(([label, amount]) => (
              <div key={String(label)} className="rounded-md border px-4 py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className="mt-2 text-lg font-semibold">
                  <MoneyValue amount={String(amount)} currency="SAR" />
                </div>
              </div>
            ))}
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
                className="w-full md:min-w-[320px] md:flex-1"
              />
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[190px]">
                  <SelectValue placeholder={t.type} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="SUBSCRIPTION_INVOICE">
                    {billingDocumentTypeLabel(
                      "SUBSCRIPTION_INVOICE",
                      locale,
                    )}
                  </SelectItem>
                  <SelectItem value="PAYMENT_RECEIPT">
                    {billingDocumentTypeLabel("PAYMENT_RECEIPT", locale)}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[155px]">
                  <SelectValue placeholder={t.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  {["DRAFT", "ISSUED", "PAID", "CANCELLED"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {billingDocumentStatusLabel(value, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DataRegisterDatePicker
                label={t.from}
                value={issueDateFrom}
                onChange={setIssueDateFrom}
                locale={locale}
              />
              <DataRegisterDatePicker
                label={t.to}
                value={issueDateTo}
                onChange={setIssueDateTo}
                locale={locale}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={sort}
                onValueChange={(value) => setSort(value as SortKey)}
              >
                <SelectTrigger className="h-9 bg-background shadow-none sm:w-[180px]">
                  <ArrowUpDown />
                  <SelectValue placeholder={t.sort} />
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
            <Table className="min-w-[1490px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[155px]">{t.documentNumber}</TableHead>
                  <TableHead className="w-[140px]">{t.type}</TableHead>
                  <TableHead className="w-[205px]">{t.company}</TableHead>
                  <TableHead className="w-[190px]">{t.plan}</TableHead>
                  <TableHead className="w-[125px]">{t.amount}</TableHead>
                  <TableHead className="w-[125px]">{t.paid}</TableHead>
                  <TableHead className="w-[125px]">{t.balance}</TableHead>
                  <TableHead className="w-[115px]">{t.status}</TableHead>
                  <TableHead className="w-[150px]">
                    {t.paymentMethod}
                  </TableHead>
                  <TableHead className="w-[160px]">{t.issueDate}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length ? (
                  visibleRows.map((row) => (
                    <TableRow
                      key={row.id}
                      href={`/system/invoices/${row.id}`}
                    >
                      <TableCell>
                        <div className="font-medium">{row.documentNumber}</div>
                        <div
                          dir="ltr"
                          lang="en"
                          className="mt-1 text-xs text-muted-foreground tabular-nums"
                        >
                          #{row.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <BillingDocumentTypeBadge
                          value={row.documentType}
                          locale={locale}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.companyName}</div>
                        <div
                          dir="ltr"
                          lang="en"
                          className="mt-1 text-xs text-muted-foreground"
                        >
                          {row.companyCode}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.planName}</div>
                        <div
                          dir="ltr"
                          lang="en"
                          className="mt-1 text-xs text-muted-foreground tabular-nums"
                        >
                          #{row.subscriptionId || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <MoneyValue
                          amount={row.totalAmount}
                          currency={row.currency}
                        />
                      </TableCell>
                      <TableCell>
                        <MoneyValue
                          amount={row.paidAmount}
                          currency={row.currency}
                        />
                      </TableCell>
                      <TableCell>
                        <MoneyValue
                          amount={row.balanceAmount}
                          currency={row.currency}
                        />
                      </TableCell>
                      <TableCell>
                        <BillingDocumentStatusBadge
                          value={row.status}
                          locale={locale}
                        />
                      </TableCell>
                      <TableCell>{row.paymentMethod || "—"}</TableCell>
                      <TableCell>
                        <span dir="ltr" lang="en" className="tabular-nums">
                          {formatDate(row.issueDate)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="p-0">
                      <DataRegisterEmptyState
                        icon={FileText}
                        title={hasFilters ? t.noResults : t.noData}
                        description={
                          hasFilters ? t.noResultsDesc : t.noDataDesc
                        }
                        showReset={hasFilters}
                        onReset={resetFilters}
                        resetLabel={t.reset}
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
              showingCount={formatInteger(visibleRows.length)}
              ofLabel={t.of}
              totalCount={formatInteger(sortedRows.length)}
              rowsLabel={t.rows}
            />

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t.page}{" "}
                <span dir="ltr" lang="en" className="tabular-nums">
                  {formatInteger(currentPage)} / {formatInteger(pages)}
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                className={registerOutlineButtonClass}
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {t.previous}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={registerOutlineButtonClass}
                disabled={currentPage >= pages}
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
    </div>
  );
}
