"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpDown,
  FileSpreadsheet,
  Gift,
  Loader2,
  Printer,
  Plus,
  RefreshCw,
  RotateCcw,
  TableProperties,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";

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
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import {
  fetchSystemPlans,
  formatDateTime,
  formatInteger,
  MoneyValue,
  PlanStateBadge,
  PlanVisibilityBadge,
  readSystemLocale,
  type SystemLocale,
  type SystemPlanRecord,
} from "@/lib/system-plans";

type SortKey = "order" | "name" | "monthly" | "yearly" | "linked";

const translations = {
  ar: {
    title: "الخطط والأسعار",
    subtitle:
      "إدارة باقات المنصة وأسعارها وحدودها وحالة تفعيلها وظهورها من مكان واحد.",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    create: "إنشاء باقة",
    total: "إجمالي الباقات",
    active: "الباقات المفعلة",
    public: "الباقات العامة",
    inactive: "الباقات الموقفة",
    live: "من بيانات الباقات الحالية",
    distributionTitle: "حالة الباقات والظهور",
    distributionDesc:
      "توزيع الباقات الحالية حسب التفعيل وإمكانية الظهور للاشتراك.",
    tableTitle: "قائمة الخطط والأسعار",
    tableDesc:
      "كل قيمة في عمود مستقل بنفس معيار جداول النظام، ويمكن فتح تفاصيل أي باقة بالضغط على صفها.",
    search: "ابحث باسم الباقة أو الكود أو المعرف أو الوصف أو المميزات...",
    all: "الكل",
    status: "الحالة",
    visibility: "الظهور",
    code: "الكود",
    orderSort: "ترتيب الظهور",
    nameSort: "اسم الباقة",
    monthlySort: "السعر الشهري",
    yearlySort: "السعر السنوي",
    linkedSort: "الاشتراكات المرتبطة",
    reset: "إعادة ضبط",
    plan: "الباقة",
    monthly: "شهري",
    yearly: "سنوي",
    users: "المستخدمون",
    branches: "الفروع",
    warehouses: "المستودعات",
    pos: "نقاط البيع",
    linked: "الاشتراكات",
    updatedAt: "آخر تحديث",
    activeLabel: "مفعلة",
    inactiveLabel: "موقفة",
    publicLabel: "عامة",
    internalLabel: "داخلية",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noData: "لا توجد باقات",
    noDataDesc: "ستظهر باقات المنصة هنا عند توفرها من API.",
    noResults: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    error: "تعذر تحميل الخطط والأسعار",
    retry: "إعادة المحاولة",
    refreshed: "تم تحديث الخطط والأسعار.",
    reportTitle: "تقرير خطط وأسعار Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
  },
  en: {
    title: "Plans & Pricing",
    subtitle:
      "Manage platform plans, pricing, limits, activation, and visibility in one place.",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    create: "Create plan",
    total: "Total plans",
    active: "Active plans",
    public: "Public plans",
    inactive: "Inactive plans",
    live: "From current plan data",
    distributionTitle: "Plan status & visibility",
    distributionDesc:
      "Current plan distribution by activation and subscription visibility.",
    tableTitle: "Plans & pricing",
    tableDesc:
      "Each field has its own column using the system table standard; click any row to open plan details.",
    search: "Search plan name, code, slug, description, or features...",
    all: "All",
    status: "Status",
    visibility: "Visibility",
    code: "Code",
    orderSort: "Display order",
    nameSort: "Plan name",
    monthlySort: "Monthly price",
    yearlySort: "Yearly price",
    linkedSort: "Linked subscriptions",
    reset: "Reset",
    plan: "Plan",
    monthly: "Monthly",
    yearly: "Yearly",
    users: "Users",
    branches: "Branches",
    warehouses: "Warehouses",
    pos: "POS",
    linked: "Subscriptions",
    updatedAt: "Updated at",
    activeLabel: "Active",
    inactiveLabel: "Inactive",
    publicLabel: "Public",
    internalLabel: "Internal",
    showing: "Showing",
    of: "of",
    rows: "rows",
    noData: "No plans",
    noDataDesc: "Platform plans will appear here when returned by the API.",
    noResults: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    error: "Could not load plans & pricing",
    retry: "Try again",
    refreshed: "Plans & pricing refreshed.",
    reportTitle: "Mhamcloud Plans & Pricing Report",
    generatedAt: "Generated at",
  },
} as const;

function numericId(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function SystemPlansPage() {
  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [rows, setRows] = React.useState<SystemPlanRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [visibility, setVisibility] = React.useState("all");
  const [code, setCode] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("order");

  const session = useAuth();
  const canCreate = hasPermission(session, PERMISSIONS.SYSTEM_PLANS_CREATE);
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
        const result = await fetchSystemPlans();
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

  const stats = React.useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((row) => row.active).length,
      inactive: rows.filter((row) => !row.active).length,
      public: rows.filter((row) => row.public).length,
      internal: rows.filter((row) => !row.public).length,
    }),
    [rows],
  );

  const codeOptions = React.useMemo(
    () => [...new Set(rows.map((row) => row.code).filter(Boolean))].sort(),
    [rows],
  );

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    const subset = rows.filter((row) => {
      const haystack = [
        row.name,
        row.code,
        row.slug,
        row.description,
        ...row.features,
      ]
        .join(" ")
        .toLowerCase();

      if (needle && !haystack.includes(needle)) return false;
      if (status === "active" && !row.active) return false;
      if (status === "inactive" && row.active) return false;
      if (visibility === "public" && !row.public) return false;
      if (visibility === "internal" && row.public) return false;
      if (code !== "all" && row.code !== code) return false;
      return true;
    });

    return [...subset].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "monthly") return Number(b.monthlyPrice) - Number(a.monthlyPrice);
      if (sort === "yearly") return Number(b.yearlyPrice) - Number(a.yearlyPrice);
      if (sort === "linked") return b.linkedSubscriptions - a.linkedSubscriptions;
      const orderDiff = a.sortOrder - b.sortOrder;
      if (orderDiff !== 0) return orderDiff;
      const priceDiff = Number(a.monthlyPrice) - Number(b.monthlyPrice);
      if (priceDiff !== 0) return priceDiff;
      return numericId(a.id) - numericId(b.id);
    });
  }, [code, rows, search, sort, status, visibility]);

  const hasFilters = Boolean(
    search ||
      status !== "all" ||
      visibility !== "all" ||
      code !== "all" ||
      sort !== "order",
  );

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setVisibility("all");
    setCode("all");
    setSort("order");
  }

  function exportRows() {
    return filtered.map((row) => [
      row.name,
      row.code,
      row.monthlyPrice,
      row.yearlyPrice,
      formatInteger(row.maxUsers),
      formatInteger(row.maxBranches),
      formatInteger(row.maxWarehouses),
      formatInteger(row.maxPos),
      formatInteger(row.linkedSubscriptions),
      row.active ? t.activeLabel : t.inactiveLabel,
      row.public ? t.publicLabel : t.internalLabel,
      formatDateTime(row.updatedAt),
    ]);
  }

  function printSection(): PrintReportTableSection {
    return {
      title: t.tableTitle,
      columns: [
        { label: t.plan, width: 190, type: "text" },
        { label: t.code, width: 105, type: "text" },
        { label: t.monthly, width: 95, type: "text" },
        { label: t.yearly, width: 95, type: "text" },
        { label: t.linked, width: 90, type: "text" },
        { label: t.status, width: 90, type: "text" },
        { label: t.visibility, width: 90, type: "text" },
        { label: t.updatedAt, width: 135, type: "text" },
      ],
      rows: exportRows().map((row) => [
        row[0],
        row[1],
        row[2],
        row[3],
        row[8],
        row[9],
        row[10],
        row[11],
      ]),
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
        t.plan,
        t.code,
        t.monthly,
        t.yearly,
        t.users,
        t.branches,
        t.warehouses,
        t.pos,
        t.linked,
        t.status,
        t.visibility,
        t.updatedAt,
      ],
      rows: exportRows().map((row) =>
        row.map((value) => ({ value, type: "text" as const })),
      ),
    };
    downloadExcelReport({
      locale,
      title: t.reportTitle,
      filename: `Mhamcloud-system-plans-${new Date().toISOString().slice(0, 10)}.xls`,
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
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{t.title}</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground lg:block">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {canCreate ? (
            <Button asChild>
              <Link href="/system/plans/create">
                <Plus />
                <span className="hidden lg:inline">{t.create}</span>
              </Link>
            </Button>
          ) : null}

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
            onClick={exportExcel}
          >
            <FileSpreadsheet />
            <span className="hidden lg:inline">{t.exportExcel}</span>
          </Button>
          <Button className={registerBrandButtonClass} onClick={printRows}>
            <Printer />
            <span className="hidden lg:inline">{t.print}</span>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
        <SystemMetricCard title={t.total} value={stats.total} description={t.live} icon={Gift} />
        <SystemMetricCard title={t.active} value={stats.active} description={t.live} icon={Activity} />
        <SystemMetricCard title={t.public} value={stats.public} description={t.live} icon={Gift} />
        <SystemMetricCard title={t.inactive} value={stats.inactive} description={t.live} icon={Activity} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={Activity} iconPosition="opposite">
            {t.distributionTitle}
          </CardTitle>
          <CardDescription>{t.distributionDesc}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted">
            <PlanStateBadge active locale={locale} />
            <span className="font-display text-lg tabular-nums">{formatInteger(stats.active)}</span>
          </div>
          <div className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted">
            <PlanStateBadge active={false} locale={locale} />
            <span className="font-display text-lg tabular-nums">{formatInteger(stats.inactive)}</span>
          </div>
          <div className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted">
            <PlanVisibilityBadge isPublic locale={locale} />
            <span className="font-display text-lg tabular-nums">{formatInteger(stats.public)}</span>
          </div>
          <div className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted">
            <PlanVisibilityBadge isPublic={false} locale={locale} />
            <span className="font-display text-lg tabular-nums">{formatInteger(stats.internal)}</span>
          </div>
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
                className="w-full md:min-w-[280px] md:flex-1"
              />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[150px]">
                  <SelectValue placeholder={t.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="active">{t.activeLabel}</SelectItem>
                  <SelectItem value="inactive">{t.inactiveLabel}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[150px]">
                  <SelectValue placeholder={t.visibility} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="public">{t.publicLabel}</SelectItem>
                  <SelectItem value="internal">{t.internalLabel}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={code} onValueChange={setCode}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[170px]">
                  <SelectValue placeholder={t.code} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  {codeOptions.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger className="h-9 bg-background shadow-none sm:w-[190px]">
                  <ArrowUpDown />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">{t.orderSort}</SelectItem>
                  <SelectItem value="name">{t.nameSort}</SelectItem>
                  <SelectItem value="monthly">{t.monthlySort}</SelectItem>
                  <SelectItem value="yearly">{t.yearlySort}</SelectItem>
                  <SelectItem value="linked">{t.linkedSort}</SelectItem>
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
            <Table className="min-w-[1540px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[205px] px-4">{t.plan}</TableHead>
                  <TableHead className="w-[120px] px-4">{t.code}</TableHead>
                  <TableHead className="w-[115px] px-4">{t.monthly}</TableHead>
                  <TableHead className="w-[115px] px-4">{t.yearly}</TableHead>
                  <TableHead className="w-[105px] px-4">{t.users}</TableHead>
                  <TableHead className="w-[95px] px-4">{t.branches}</TableHead>
                  <TableHead className="w-[115px] px-4">{t.warehouses}</TableHead>
                  <TableHead className="w-[100px] px-4">{t.pos}</TableHead>
                  <TableHead className="w-[115px] px-4">{t.linked}</TableHead>
                  <TableHead className="w-[105px] px-4">{t.status}</TableHead>
                  <TableHead className="w-[105px] px-4">{t.visibility}</TableHead>
                  <TableHead className="w-[150px] px-4">{t.updatedAt}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length ? (
                  filtered.map((row) => (
                    <TableRow
                      key={row.id}
                      href={row.id ? `/system/plans/${row.id}` : undefined}
                      aria-label={`${t.title}: ${row.name}`}
                    >
                      <TableCell className="px-4">
                        <div className="min-w-0">
                          <span className="block truncate font-medium">{row.name}</span>
                          <span dir="ltr" lang="en" className="block truncate text-xs text-muted-foreground">
                            {row.slug}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        <span dir="ltr" lang="en" className="font-medium">{row.code}</span>
                      </TableCell>
                      <TableCell className="px-4"><MoneyValue amount={row.monthlyPrice} /></TableCell>
                      <TableCell className="px-4"><MoneyValue amount={row.yearlyPrice} /></TableCell>
                      <TableCell className="px-4"><span dir="ltr" lang="en" className="tabular-nums">{formatInteger(row.maxUsers)}</span></TableCell>
                      <TableCell className="px-4"><span dir="ltr" lang="en" className="tabular-nums">{formatInteger(row.maxBranches)}</span></TableCell>
                      <TableCell className="px-4"><span dir="ltr" lang="en" className="tabular-nums">{formatInteger(row.maxWarehouses)}</span></TableCell>
                      <TableCell className="px-4"><span dir="ltr" lang="en" className="tabular-nums">{formatInteger(row.maxPos)}</span></TableCell>
                      <TableCell className="px-4"><span dir="ltr" lang="en" className="font-medium tabular-nums">{formatInteger(row.linkedSubscriptions)}</span></TableCell>
                      <TableCell className="px-4"><PlanStateBadge active={row.active} locale={locale} /></TableCell>
                      <TableCell className="px-4"><PlanVisibilityBadge isPublic={row.public} locale={locale} /></TableCell>
                      <TableCell className="px-4">
                        <span dir="ltr" lang="en" className="tabular-nums text-muted-foreground">
                          {formatDateTime(row.updatedAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12}>
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

          <DataRegisterResultCount
            showingLabel={t.showing}
            showingCount={formatInteger(filtered.length)}
            ofLabel={t.of}
            totalCount={formatInteger(rows.length)}
            rowsLabel={t.rows}
          />
        </CardContent>
      </Card>
    </div>
  );
}
