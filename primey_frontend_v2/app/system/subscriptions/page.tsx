"use client";

import * as React from "react";
import {
  Activity,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Printer,
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
  actionLabel,
  billingCycleLabel,
  fetchSystemSubscriptions,
  formatDate,
  formatDateTime,
  formatInteger,
  MoneyValue,
  readSystemLocale,
  StatusBadge,
  statusLabel,
  type SystemLocale,
  type SystemSubscriptionRecord,
} from "@/lib/system-subscriptions";

type SortKey = "newest" | "oldest" | "company" | "amount";

const translations = {
  ar: {
    title: "الاشتراكات",
    subtitle:
      "مركز إدارة اشتراكات المنصة ومتابعة أحدث اشتراك لكل شركة والحالة والدورة والقيمة من مكان واحد.",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",

    total: "إجمالي الاشتراكات",
    current: "الاشتراكات الحالية",
    pending: "بانتظار الدفع",
    expired: "الاشتراكات المنتهية",
    live: "أحدث اشتراك لكل شركة",

    statusTitle: "حالات الاشتراكات",
    statusDesc: "توزيع أحدث اشتراك لكل شركة حسب حالته الحالية.",
    active: "نشط",
    trial: "تجريبي",
    suspended: "موقوف",
    cancelled: "ملغي",

    tableTitle: "أحدث اشتراك لكل شركة",
    tableDesc:
      "يعرض سجلًا واحدًا فقط لكل شركة، وهو أحدث اشتراك حسب تاريخ الإنشاء ثم معرف الاشتراك.",
    search: "ابحث بالشركة أو الكود أو الباقة أو مرجع الفوترة...",
    all: "الكل",
    plan: "الباقة",
    cycle: "الدورة",
    from: "من",
    to: "إلى",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    companySort: "الشركة",
    amountSort: "القيمة",
    reset: "إعادة ضبط",

    company: "الشركة",
    action: "العملية",
    amount: "الإجمالي",
    status: "الحالة",
    endDate: "تاريخ الانتهاء",
    createdAt: "تاريخ الإنشاء",

    showing: "عرض",
    of: "من",
    rows: "صفوف",

    noData: "لا توجد اشتراكات",
    noDataDesc: "ستظهر الاشتراكات هنا عند توفرها من API.",
    noResults: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    error: "تعذر تحميل الاشتراكات",
    retry: "إعادة المحاولة",
    refreshed: "تم تحديث الاشتراكات.",

    reportTitle: "تقرير اشتراكات Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
  },
  en: {
    title: "Subscriptions",
    subtitle:
      "Manage platform subscriptions and review each company's latest subscription, status, cycle, and value in one place.",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",

    total: "Total subscriptions",
    current: "Current subscriptions",
    pending: "Pending payment",
    expired: "Expired subscriptions",
    live: "Latest subscription per company",

    statusTitle: "Subscription statuses",
    statusDesc: "Distribution of each company's latest subscription by current status.",
    active: "Active",
    trial: "Trial",
    suspended: "Suspended",
    cancelled: "Cancelled",

    tableTitle: "Latest subscription per company",
    tableDesc:
      "Shows one row per company: the newest subscription by creation time, then subscription ID.",
    search: "Search company, code, plan, or billing reference...",
    all: "All",
    plan: "Plan",
    cycle: "Cycle",
    from: "From",
    to: "To",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    companySort: "Company",
    amountSort: "Amount",
    reset: "Reset",

    company: "Company",
    action: "Action",
    amount: "Total",
    status: "Status",
    endDate: "End date",
    createdAt: "Created at",

    showing: "Showing",
    of: "of",
    rows: "rows",

    noData: "No subscriptions",
    noDataDesc: "Subscriptions will appear here when returned by the API.",
    noResults: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    error: "Could not load subscriptions",
    retry: "Try again",
    refreshed: "Subscriptions refreshed.",

    reportTitle: "Mhamcloud Subscriptions Report",
    generatedAt: "Generated at",
  },
} as const;

function timeValue(value: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function idValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareLatest(
  a: SystemSubscriptionRecord,
  b: SystemSubscriptionRecord,
) {
  const dateDiff = timeValue(b.createdAt) - timeValue(a.createdAt);
  if (dateDiff !== 0) return dateDiff;
  return idValue(b.id) - idValue(a.id);
}

export default function SystemSubscriptionsPage() {
  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [rows, setRows] = React.useState<SystemSubscriptionRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [plan, setPlan] = React.useState("all");
  const [cycle, setCycle] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("newest");

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

  const load = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const result = await fetchSystemSubscriptions();
        setRows(result.rows);

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
    [t.error, t.refreshed],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  const latestRows = React.useMemo(() => {
    const ordered = [...rows].sort(compareLatest);
    const seenCompanies = new Set<string>();

    return ordered.filter((row) => {
      const companyKey = row.companyId.trim();

      // Missing company IDs must never merge unrelated records.
      if (!companyKey) return true;

      if (seenCompanies.has(companyKey)) return false;

      seenCompanies.add(companyKey);
      return true;
    });
  }, [rows]);

  const statusOptions = React.useMemo(
    () => [...new Set(latestRows.map((row) => row.status).filter(Boolean))].sort(),
    [latestRows],
  );

  const planOptions = React.useMemo(
    () =>
      [...new Set(latestRows.map((row) => row.planName).filter((value) => value && value !== "—"))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [latestRows],
  );

  const viewStats = React.useMemo(() => {
    const active = latestRows.filter((row) => row.status === "active").length;
    const trial = latestRows.filter((row) => row.status === "trial").length;

    return {
      total: latestRows.length,
      current: active + trial,
      active,
      trial,
      pending: latestRows.filter((row) => row.status === "pending_payment").length,
      expired: latestRows.filter((row) => row.status === "expired").length,
      suspended: latestRows.filter((row) => row.status === "suspended").length,
      cancelled: latestRows.filter((row) => row.status === "cancelled").length,
    };
  }, [latestRows]);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();

    const subset = latestRows.filter((row) => {
      const haystack = [
        row.companyName,
        row.companyCode,
        row.planName,
        row.planCode,
        row.billingReference,
        row.action,
        row.billingCycle,
        row.status,
      ]
        .join(" ")
        .toLowerCase();

      if (needle && !haystack.includes(needle)) return false;
      if (status !== "all" && row.status !== status) return false;
      if (plan !== "all" && row.planName !== plan) return false;
      if (cycle !== "all" && row.billingCycle !== cycle) return false;

      const created = formatDate(row.createdAt);
      if (dateFrom && created !== "—" && created < dateFrom) return false;
      if (dateTo && created !== "—" && created > dateTo) return false;

      return true;
    });

    return [...subset].sort((a, b) => {
      if (sort === "oldest") return -compareLatest(a, b);
      if (sort === "company") return a.companyName.localeCompare(b.companyName);
      if (sort === "amount") return Number(b.totalAmount) - Number(a.totalAmount);
      return compareLatest(a, b);
    });
  }, [cycle, dateFrom, dateTo, latestRows, plan, search, sort, status]);

  const hasFilters = Boolean(
    search ||
      status !== "all" ||
      plan !== "all" ||
      cycle !== "all" ||
      dateFrom ||
      dateTo ||
      sort !== "newest",
  );

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setPlan("all");
    setCycle("all");
    setDateFrom("");
    setDateTo("");
    setSort("newest");
  }

  function exportRows() {
    return filtered.map((row) => [
      row.companyName,
      row.companyCode,
      row.planName,
      actionLabel(row.action, locale),
      billingCycleLabel(row.billingCycle, locale),
      row.totalAmount,
      statusLabel(row.status, locale),
      formatDate(row.endDate),
      formatDateTime(row.createdAt),
    ]);
  }

  function printSection(): PrintReportTableSection {
    return {
      title: t.tableTitle,
      columns: [
        { label: t.company, width: 220, type: "text" },
        { label: t.plan, width: 170, type: "text" },
        { label: t.action, width: 120, type: "text" },
        { label: t.cycle, width: 100, type: "text" },
        { label: t.amount, width: 120, type: "text" },
        { label: t.status, width: 120, type: "text" },
        { label: t.endDate, width: 120, type: "text" },
        { label: t.createdAt, width: 150, type: "text" },
      ],
      rows: exportRows().map((row) => row.filter((_, index) => index !== 1)),
    };
  }

  function exportExcel() {
    if (!filtered.length) {
      toast.error(t.noData);
      return;
    }

    const section: ExcelReportSection = {
      title: t.tableTitle,
      headers: [
        t.company,
        "Code",
        t.plan,
        t.action,
        t.cycle,
        t.amount,
        t.status,
        t.endDate,
        t.createdAt,
      ],
      rows: exportRows().map((row) =>
        row.map((value) => ({
          value,
          type: "text" as const,
        })),
      ),
    };

    downloadExcelReport({
      locale,
      title: t.reportTitle,
      filename: `Mhamcloud-system-subscriptions-${new Date().toISOString().slice(0, 10)}.xls`,
      generatedAtLabel: t.generatedAt,
      sections: [section],
    });
  }

  function printRows() {
    if (!filtered.length) {
      toast.error(t.noData);
      return;
    }

    openPrintTableReport({
      locale,
      title: t.reportTitle,
      sections: [printSection()],
      recordsCount: filtered.length,
      recordsLabel: t.rows,
      generatedAtLabel: t.generatedAt,
    });
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
            {refreshing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            <span className="hidden lg:inline">{t.refresh}</span>
          </Button>

          <Button
            variant="outline"
            className={registerOutlineButtonClass}
            onClick={exportExcel}
          >
            <FileSpreadsheet />
            <span className="hidden lg:inline">{t.exportExcel}</span>
          </Button>

          <Button
            className={registerBrandButtonClass}
            onClick={printRows}
          >
            <Printer />
            <span className="hidden lg:inline">{t.print}</span>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
        <SystemMetricCard
          title={t.total}
          value={viewStats.total}
          description={t.live}
          icon={WalletCards}
        />
        <SystemMetricCard
          title={t.current}
          value={viewStats.current}
          description={t.live}
          icon={CheckCircle2}
        />
        <SystemMetricCard
          title={t.pending}
          value={viewStats.pending}
          description={t.live}
          icon={CalendarClock}
        />
        <SystemMetricCard
          title={t.expired}
          value={viewStats.expired}
          description={t.live}
          icon={Activity}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={Activity} iconPosition="opposite">
            {t.statusTitle}
          </CardTitle>
          <CardDescription>{t.statusDesc}</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {[
            ["active", viewStats.active],
            ["trial", viewStats.trial],
            ["pending_payment", viewStats.pending],
            ["expired", viewStats.expired],
            ["suspended", viewStats.suspended],
            ["cancelled", viewStats.cancelled],
          ].map(([key, value]) => (
            <div
              key={String(key)}
              className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted"
            >
              <StatusBadge value={String(key)} locale={locale} />
              <span className="font-display text-lg tabular-nums">
                {formatInteger(value)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

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
                className="w-full md:min-w-[260px] md:flex-1"
              />

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  {statusOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {statusLabel(item, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[190px]">
                  <SelectValue placeholder={t.plan} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  {planOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={cycle} onValueChange={setCycle}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[135px]">
                  <SelectValue placeholder={t.cycle} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="MONTHLY">
                    {billingCycleLabel("MONTHLY", locale)}
                  </SelectItem>
                  <SelectItem value="YEARLY">
                    {billingCycleLabel("YEARLY", locale)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DataRegisterDatePicker
                label={t.from}
                value={dateFrom}
                onChange={setDateFrom}
                locale={locale}
              />
              <DataRegisterDatePicker
                label={t.to}
                value={dateTo}
                onChange={setDateTo}
                locale={locale}
              />

              <Select
                value={sort}
                onValueChange={(value) => setSort(value as SortKey)}
              >
                <SelectTrigger className="h-9 bg-background shadow-none sm:w-[150px]">
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
            <Table className="min-w-[1080px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px] px-4">{t.company}</TableHead>
                  <TableHead className="w-[165px] px-4">{t.plan}</TableHead>
                  <TableHead className="w-[110px] px-4">{t.action}</TableHead>
                  <TableHead className="w-[100px] px-4">{t.cycle}</TableHead>
                  <TableHead className="w-[115px] px-4">{t.amount}</TableHead>
                  <TableHead className="w-[120px] px-4">{t.status}</TableHead>
                  <TableHead className="w-[125px] px-4">{t.endDate}</TableHead>
                  <TableHead className="w-[150px] px-4">{t.createdAt}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length ? (
                  filtered.map((row) => (
                    <TableRow key={row.id} href={row.id ? `/system/subscriptions/${row.id}` : undefined} aria-label={`${t.title}: ${row.companyName}`}>
                      <TableCell className="px-4">
                        <div className="min-w-0">
                          <span className="block truncate font-medium">
                            {row.companyName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {row.companyCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {row.planName}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {actionLabel(row.action, locale)}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {billingCycleLabel(row.billingCycle, locale)}
                      </TableCell>
                      <TableCell className="px-4">
                        <MoneyValue
                          amount={row.totalAmount}
                          currency={row.currency}
                        />
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
                          {formatDate(row.endDate)}
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <DataRegisterEmptyState
                        title={hasFilters ? t.noResults : t.noData}
                        description={
                          hasFilters ? t.noResultsDesc : t.noDataDesc
                        }
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

          <DataRegisterResultCount
            showingLabel={t.showing}
            showingCount={formatInteger(filtered.length)}
            ofLabel={t.of}
            totalCount={formatInteger(latestRows.length)}
            rowsLabel={t.rows}
          />
        </CardContent>
      </Card>
    </div>
  );
}
