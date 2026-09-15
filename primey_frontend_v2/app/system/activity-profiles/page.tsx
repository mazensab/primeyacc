"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  FileSpreadsheet,
  Layers3,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
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
  ActivityProfileScopeBadge,
  ActivityProfileStatusBadge,
  activityProfileScopeLabel,
  activityProfileStatusLabel,
  fetchActivityProfiles,
  fetchAllActivityProfiles,
  type ActivityProfilesSummary,
  type SystemActivityProfile,
} from "@/lib/system-activity-profiles";
import {
  formatInteger,
  readSystemLocale,
  type SystemLocale,
} from "@/lib/system-subscriptions";

const PAGE_SIZE = 50;

const translations = {
  ar: {
    title: "ملفات الأنشطة",
    subtitle:
      "مركز ملفات أنشطة الشركات في منصة Mhamcloud، للعرض والمتابعة فقط من API النظام الحقيقي.",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    total: "إجمالي الملفات",
    active: "الملفات النشطة",
    inactive: "غير النشطة",
    companies: "الشركات المرتبطة",
    live: "من بيانات النظام الحالية",
    tableTitle: "سجل ملفات الأنشطة",
    tableDesc:
      "كل ملف نشاط في صف مستقل؛ اضغط على الصف لعرض تفاصيل الملف والشركات المرتبطة.",
    search: "ابحث بالاسم أو الكود أو الوصف...",
    all: "الكل",
    status: "الحالة",
    scope: "النطاق",
    system: "نظام",
    company: "شركة",
    ordering: "الترتيب",
    defaultOrder: "الافتراضي",
    nameOrder: "الاسم",
    codeOrder: "الكود",
    reset: "إعادة ضبط",
    code: "الكود",
    name: "الاسم",
    scopeCol: "النطاق",
    companiesCol: "الشركات",
    description: "الوصف",
    noData: "لا توجد ملفات أنشطة",
    noDataDesc: "ستظهر ملفات الأنشطة هنا عند توفرها من API.",
    noResults: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    error: "تعذر تحميل ملفات الأنشطة",
    retry: "إعادة المحاولة",
    refreshed: "تم تحديث ملفات الأنشطة.",
    rows: "صفوف",
    previous: "السابق",
    next: "التالي",
    page: "صفحة",
    of: "من",
    reportTitle: "تقرير ملفات أنشطة Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
  },
  en: {
    title: "Activity Profiles",
    subtitle:
      "Mhamcloud company activity profiles center, read-only from the real system API.",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    total: "Total profiles",
    active: "Active profiles",
    inactive: "Inactive profiles",
    companies: "Linked companies",
    live: "From current system data",
    tableTitle: "Activity profiles register",
    tableDesc:
      "Each activity profile is a separate row; click it to view details and linked companies.",
    search: "Search name, code, or description...",
    all: "All",
    status: "Status",
    scope: "Scope",
    system: "System",
    company: "Company",
    ordering: "Ordering",
    defaultOrder: "Default",
    nameOrder: "Name",
    codeOrder: "Code",
    reset: "Reset",
    code: "Code",
    name: "Name",
    scopeCol: "Scope",
    companiesCol: "Companies",
    description: "Description",
    noData: "No activity profiles",
    noDataDesc: "Activity profiles will appear here when returned by the API.",
    noResults: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    error: "Could not load activity profiles",
    retry: "Try again",
    refreshed: "Activity profiles refreshed.",
    rows: "rows",
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    reportTitle: "Mhamcloud Activity Profiles Report",
    generatedAt: "Generated at",
  },
} as const;

type SortKey = "default" | "name" | "code";

function orderingValue(value: SortKey) {
  if (value === "name") return "name";
  if (value === "code") return "code";
  return "";
}

export default function SystemActivityProfilesPage() {
  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [rows, setRows] = React.useState<SystemActivityProfile[]>([]);
  const [summary, setSummary] = React.useState<ActivityProfilesSummary>({
    total: 0,
    active: 0,
    inactive: 0,
    companiesCount: 0,
    systemCount: 0,
    companyCount: 0,
  });
  const [count, setCount] = React.useState(0);
  const [offset, setOffset] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [scope, setScope] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("default");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [error, setError] = React.useState("");

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
    setOffset(0);
  }, [deferredSearch, status, scope, sort]);

  const load = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const result = await fetchActivityProfiles({
          search: deferredSearch,
          status,
          scope,
          ordering: orderingValue(sort),
          limit: PAGE_SIZE,
          offset,
        });
        setRows(result.rows);
        setSummary(result.summary);
        setCount(result.count);
        if (silent) toast.success(t.refreshed);
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : t.error;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [deferredSearch, status, scope, sort, offset, t.error, t.refreshed],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const hasFilters = Boolean(
    search ||
      status !== "all" ||
      scope !== "all" ||
      sort !== "default",
  );

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setScope("all");
    setSort("default");
    setOffset(0);
  }

  function reportRows(source: SystemActivityProfile[]) {
    return source.map((row) => [
      row.id,
      row.code,
      row.name,
      activityProfileScopeLabel(row.scope, locale),
      activityProfileStatusLabel(row.status, locale),
      row.companiesCount,
      row.description || "—",
    ]);
  }

  async function loadAllForReport() {
    return fetchAllActivityProfiles({
      search: deferredSearch,
      status,
      scope,
      ordering: orderingValue(sort),
    });
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
          "ID",
          t.code,
          t.name,
          t.scopeCol,
          t.status,
          t.companiesCol,
          t.description,
        ],
        rows: reportRows(all).map((row) =>
          row.map((value) => ({
            value,
            type: "text" as const,
          })),
        ),
      };

      downloadExcelReport({
        locale,
        title: t.reportTitle,
        filename: `Mhamcloud-activity-profiles-${new Date()
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
      const all = await loadAllForReport();

      if (!all.length) {
        toast.error(t.noData);
        return;
      }

      const section: PrintReportTableSection = {
        title: t.tableTitle,
        columns: [
          { label: "ID", width: 60, type: "text" },
          { label: t.code, width: 110, type: "text" },
          { label: t.name, width: 180, type: "text" },
          { label: t.scopeCol, width: 90, type: "text" },
          { label: t.status, width: 90, type: "text" },
          { label: t.companiesCol, width: 80, type: "text" },
          { label: t.description, width: 260, type: "text" },
        ],
        rows: reportRows(all),
      };

      openPrintTableReport({
        locale,
        title: t.reportTitle,
        sections: [section],
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
            {refreshing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
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
            <span className="hidden lg:inline">{t.exportExcel}</span>
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
          value={summary.total}
          description={t.live}
          icon={Layers3}
        />
        <SystemMetricCard
          title={t.active}
          value={summary.active}
          description={t.live}
          icon={ShieldCheck}
        />
        <SystemMetricCard
          title={t.inactive}
          value={summary.inactive}
          description={t.live}
          icon={Activity}
        />
        <SystemMetricCard
          title={t.companies}
          value={summary.companiesCount}
          description={t.live}
          icon={Building2}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={Activity} iconPosition="opposite">
            {t.tableTitle}
          </CardTitle>
          <CardDescription>{t.tableDesc}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <DataRegisterToolbar>
            <DataRegisterSearch
              value={search}
              onChange={setSearch}
              placeholder={t.search}
              className="min-w-0 flex-1"
            />

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="ACTIVE">{t.active}</SelectItem>
                <SelectItem value="INACTIVE">{t.inactive}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t.scope} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="system">{t.system}</SelectItem>
                <SelectItem value="company">{t.company}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sort}
              onValueChange={(value) => setSort(value as SortKey)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t.ordering} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t.defaultOrder}</SelectItem>
                <SelectItem value="name">{t.nameOrder}</SelectItem>
                <SelectItem value="code">{t.codeOrder}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              className={registerOutlineButtonClass}
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              <RotateCcw />
              <span className="hidden lg:inline">{t.reset}</span>
            </Button>
          </DataRegisterToolbar>

          <DataRegisterResultCount
            showingLabel={locale === "ar" ? "عرض" : "Showing"}
            showingCount={rows.length}
            ofLabel={t.of}
            totalCount={count}
            rowsLabel={t.rows}
          />

          {rows.length ? (
            <DataRegisterTableFrame>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.code}</TableHead>
                    <TableHead>{t.name}</TableHead>
                    <TableHead>{t.scopeCol}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead>{t.companiesCol}</TableHead>
                    <TableHead>{t.description}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="h-[62px]">
                      <TableCell className="font-medium">
                        <Link
                          href={`/system/activity-profiles/${row.id}`}
                          className="block"
                        >
                          {row.code}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/system/activity-profiles/${row.id}`}
                          className="block font-medium"
                        >
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <ActivityProfileScopeBadge
                          value={row.scope}
                          locale={locale}
                        />
                      </TableCell>
                      <TableCell>
                        <ActivityProfileStatusBadge
                          value={row.status}
                          locale={locale}
                        />
                      </TableCell>
                      <TableCell>
                        {formatInteger(row.companiesCount)}
                      </TableCell>
                      <TableCell className="max-w-[360px] truncate text-muted-foreground">
                        {row.description || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataRegisterTableFrame>
          ) : (
            <DataRegisterEmptyState
              icon={Activity}
              title={hasFilters ? t.noResults : t.noData}
              description={
                hasFilters ? t.noResultsDesc : t.noDataDesc
              }
            />
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {t.page} {formatInteger(pageNumber)} {t.of}{" "}
              {formatInteger(pages)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className={registerOutlineButtonClass}
                disabled={offset <= 0}
                onClick={() =>
                  setOffset(Math.max(0, offset - PAGE_SIZE))
                }
              >
                {t.previous}
              </Button>
              <Button
                variant="outline"
                className={registerOutlineButtonClass}
                disabled={offset + PAGE_SIZE >= count}
                onClick={() => setOffset(offset + PAGE_SIZE)}
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
