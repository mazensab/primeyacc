"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Activity,
  ArrowUpDown,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TableProperties,
  TriangleAlert,
  UserRound,
  UserPlus,
  UsersRound,
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
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import {
  fetchAllSystemUsers,
  fetchSystemUsers,
  SystemUserRoleBadge,
  SystemUserStatusBadge,
  systemUserAccessLabel,
  systemUserRoleLabel,
  systemUserStatusLabel,
  type SystemUserRecord,
  type SystemUserStats,
} from "@/lib/system-users";
import {
  formatDateTime,
  formatInteger,
  readSystemLocale,
  type SystemLocale,
} from "@/lib/system-subscriptions";

type SortKey = "newest" | "oldest" | "name" | "username";
const PAGE_SIZE = 50;

const translations = {
  ar: {
    title: "مستخدمو النظام",
    subtitle:
      "مركز مستخدمي منصة Mhamcloud لعرض الحسابات والأدوار والوصول والارتباط بالشركات من API النظام الحقيقي.",
    addUser: "إضافة مستخدم نظام",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    totalProfiles: "إجمالي الملفات",
    systemUsers: "مستخدمو النظام",
    activeSystemUsers: "نشطون في النظام",
    suspendedProfiles: "ملفات موقوفة",
    liveSummary: "من بيانات النظام الحالية",
    statusTitle: "حالة الحسابات",
    statusDesc: "ملخص حسابات المستخدمين المسجلة في المنصة.",
    accessTitle: "الوصول إلى النظام",
    accessDesc: "ملخص ملفات المستخدمين ذات وصول النظام.",
    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    systemAccess: "وصول النظام",
    activeSystemAccess: "وصول نظام نشط",
    companyAccess: "وصول شركة / بدون دور نظام",
    tableTitle: "سجل مستخدمي النظام",
    tableDesc:
      "كل مستخدم في صف مستقل؛ اضغط على الصف لعرض تفاصيل الحساب والعضويات والصلاحيات المسجلة.",
    search:
      "ابحث بالاسم أو اسم المستخدم أو البريد أو الجوال أو الدور...",
    all: "الكل",
    status: "الحالة",
    role: "الدور",
    access: "نوع الوصول",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    usernameSort: "اسم المستخدم",
    reset: "إعادة ضبط",
    user: "المستخدم",
    username: "اسم المستخدم",
    email: "البريد الإلكتروني",
    roleColumn: "الدور",
    accessColumn: "الوصول",
    company: "الشركة",
    createdAt: "تاريخ الإنشاء",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    page: "صفحة",
    previous: "السابق",
    next: "التالي",
    noData: "لا يوجد مستخدمون",
    noDataDesc: "ستظهر حسابات المستخدمين هنا عند توفرها من API.",
    noResults: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    error: "تعذر تحميل مستخدمي النظام",
    retry: "إعادة المحاولة",
    refreshed: "تم تحديث مستخدمي النظام.",
    exporting: "جاري تجهيز التقرير...",
    reportTitle: "تقرير مستخدمي نظام Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
  },
  en: {
    title: "System Users",
    subtitle:
      "Mhamcloud platform users center for accounts, roles, access, and company memberships from the real system API.",
    addUser: "Add system user",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    totalProfiles: "Total profiles",
    systemUsers: "System users",
    activeSystemUsers: "Active system users",
    suspendedProfiles: "Suspended profiles",
    liveSummary: "From current system data",
    statusTitle: "Account status",
    statusDesc: "Summary of user accounts registered on the platform.",
    accessTitle: "System access",
    accessDesc: "Summary of user profiles with system access.",
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    systemAccess: "System access",
    activeSystemAccess: "Active system access",
    companyAccess: "Company / no system role",
    tableTitle: "System users register",
    tableDesc:
      "Each user is a separate row; click it to view account details, memberships, and recorded permissions.",
    search:
      "Search name, username, email, mobile, or role...",
    all: "All",
    status: "Status",
    role: "Role",
    access: "Access type",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    usernameSort: "Username",
    reset: "Reset",
    user: "User",
    username: "Username",
    email: "Email",
    roleColumn: "Role",
    accessColumn: "Access",
    company: "Company",
    createdAt: "Created at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    page: "Page",
    previous: "Previous",
    next: "Next",
    noData: "No users",
    noDataDesc: "User accounts will appear here when returned by the API.",
    noResults: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    error: "Could not load system users",
    retry: "Try again",
    refreshed: "System users refreshed.",
    exporting: "Preparing report...",
    reportTitle: "Mhamcloud System Users Report",
    generatedAt: "Generated at",
  },
} as const;

function normalizeSort(value: SortKey) {
  if (value === "oldest") return "oldest";
  if (value === "name") return "name";
  if (value === "username") return "username";
  return "newest";
}

export default function SystemUsersPage() {
  const session = useAuth();
  const [locale, setLocale] = React.useState<SystemLocale>("ar");
  const [rows, setRows] = React.useState<SystemUserRecord[]>([]);
  const [stats, setStats] = React.useState<SystemUserStats>({
    total: 0,
    active: 0,
    suspended: 0,
    systemUsers: 0,
    activeSystemUsers: 0,
  });
  const [count, setCount] = React.useState(0);
  const [pages, setPages] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [role, setRole] = React.useState("all");
  const [access, setAccess] = React.useState("system");
  const [sort, setSort] = React.useState<SortKey>("newest");

  const deferredSearch = React.useDeferredValue(search);
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const canCreate = hasPermission(
    session,
    PERMISSIONS.SYSTEM_USERS_CREATE,
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

  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch, status, role, access, sort]);

  const load = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const result = await fetchSystemUsers({
          search: deferredSearch,
          status,
          role,
          access,
          ordering: normalizeSort(sort),
          page,
          pageSize: PAGE_SIZE,
        });

        setRows(result.rows);
        setStats(result.stats);
        setCount(result.count);
        setPages(result.pages);

        if (silent) toast.success(t.refreshed);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : t.error;
        setError(message);

        if (silent) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      deferredSearch,
      status,
      role,
      access,
      sort,
      page,
      t.error,
      t.refreshed,
    ],
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  const inactiveCount = Math.max(
    0,
    stats.total - stats.active - stats.suspended,
  );
  const companyAccessCount = Math.max(
    0,
    stats.total - stats.systemUsers,
  );

  const hasFilters = Boolean(
    search ||
      status !== "all" ||
      role !== "all" ||
      access !== "system" ||
      sort !== "newest",
  );

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setRole("all");
    setAccess("system");
    setSort("newest");
    setPage(1);
  }

  function rowsForReport(source: SystemUserRecord[]) {
    return source.map((row) => [
      row.id,
      row.displayName,
      row.username,
      row.email,
      systemUserRoleLabel(row.role, locale),
      systemUserAccessLabel(row.accessType, locale),
      systemUserStatusLabel(row.status, locale),
      row.companyName || "—",
      row.phone || row.mobile || "—",
      formatDateTime(row.createdAt),
    ]);
  }

  function printSection(
    source: SystemUserRecord[],
  ): PrintReportTableSection {
    return {
      title: t.tableTitle,
      columns: [
        { label: "ID", width: 70, type: "text" },
        { label: t.user, width: 170, type: "text" },
        { label: t.username, width: 120, type: "text" },
        { label: t.email, width: 190, type: "text" },
        { label: t.roleColumn, width: 120, type: "text" },
        { label: t.accessColumn, width: 105, type: "text" },
        { label: t.status, width: 100, type: "text" },
        { label: t.company, width: 150, type: "text" },
        { label: t.createdAt, width: 145, type: "text" },
      ],
      rows: rowsForReport(source).map((row) => [
        row[0],
        row[1],
        row[2],
        row[3],
        row[4],
        row[5],
        row[6],
        row[7],
        row[9],
      ]),
    };
  }

  async function loadAllForReport() {
    return fetchAllSystemUsers({
      search: deferredSearch,
      status,
      role,
      access,
      ordering: normalizeSort(sort),
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
          t.user,
          t.username,
          t.email,
          t.roleColumn,
          t.accessColumn,
          t.status,
          t.company,
          "Phone",
          t.createdAt,
        ],
        rows: rowsForReport(all).map((row) =>
          row.map((value) => ({
            value,
            type: "text" as const,
          })),
        ),
      };

      downloadExcelReport({
        locale,
        title: t.reportTitle,
        filename: `Mhamcloud-system-users-${new Date()
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
          {canCreate ? (
            <Button asChild className={registerBrandButtonClass}>
              <Link href="/system/users/create">
                <UserPlus />
                <span className="hidden lg:inline">{t.addUser}</span>
              </Link>
            </Button>
          ) : null}

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
          title={t.totalProfiles}
          value={stats.total}
          description={t.liveSummary}
          icon={UsersRound}
        />
        <SystemMetricCard
          title={t.systemUsers}
          value={stats.systemUsers}
          description={t.liveSummary}
          icon={ShieldCheck}
        />
        <SystemMetricCard
          title={t.activeSystemUsers}
          value={stats.activeSystemUsers}
          description={t.liveSummary}
          icon={CheckCircle2}
        />
        <SystemMetricCard
          title={t.suspendedProfiles}
          value={stats.suspended}
          description={t.liveSummary}
          icon={TriangleAlert}
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
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {[
              [t.active, stats.active],
              [t.inactive, inactiveCount],
              [t.suspended, stats.suspended],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-md border px-4 py-3"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p
                  dir="ltr"
                  lang="en"
                  className="mt-2 font-display text-lg tabular-nums"
                >
                  {formatInteger(value)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={ShieldCheck} iconPosition="opposite">
              {t.accessTitle}
            </CardTitle>
            <CardDescription>{t.accessDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {[
              [t.systemAccess, stats.systemUsers],
              [t.activeSystemAccess, stats.activeSystemUsers],
              [t.companyAccess, companyAccessCount],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-md border px-4 py-3"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p
                  dir="ltr"
                  lang="en"
                  className="mt-2 font-display text-lg tabular-nums"
                >
                  {formatInteger(value)}
                </p>
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

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[150px]">
                  <SelectValue placeholder={t.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="ACTIVE">
                    {systemUserStatusLabel("ACTIVE", locale)}
                  </SelectItem>
                  <SelectItem value="INACTIVE">
                    {systemUserStatusLabel("INACTIVE", locale)}
                  </SelectItem>
                  <SelectItem value="SUSPENDED">
                    {systemUserStatusLabel("SUSPENDED", locale)}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[175px]">
                  <SelectValue placeholder={t.role} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  {[
                    "SUPER_ADMIN",
                    "SYSTEM_ADMIN",
                    "SUPPORT",
                    "BILLING_MANAGER",
                    "NONE",
                  ].map((value) => (
                    <SelectItem key={value} value={value}>
                      {systemUserRoleLabel(value, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={access} onValueChange={setAccess}>
                <SelectTrigger className="h-9 bg-background shadow-none md:w-[155px]">
                  <SelectValue placeholder={t.access} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="system">
                    {systemUserAccessLabel("system", locale)}
                  </SelectItem>
                  <SelectItem value="company">
                    {systemUserAccessLabel("company", locale)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={sort}
                onValueChange={(value) => setSort(value as SortKey)}
              >
                <SelectTrigger className="h-9 bg-background shadow-none sm:w-[170px]">
                  <ArrowUpDown />
                  <SelectValue placeholder={t.sort} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t.newest}</SelectItem>
                  <SelectItem value="oldest">{t.oldest}</SelectItem>
                  <SelectItem value="name">{t.nameSort}</SelectItem>
                  <SelectItem value="username">
                    {t.usernameSort}
                  </SelectItem>
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
            <Table className="min-w-[1340px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[210px]">{t.user}</TableHead>
                  <TableHead className="w-[150px]">{t.username}</TableHead>
                  <TableHead className="w-[220px]">{t.email}</TableHead>
                  <TableHead className="w-[145px]">{t.roleColumn}</TableHead>
                  <TableHead className="w-[120px]">{t.accessColumn}</TableHead>
                  <TableHead className="w-[120px]">{t.status}</TableHead>
                  <TableHead className="w-[190px]">{t.company}</TableHead>
                  <TableHead className="w-[175px]">{t.createdAt}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.length ? (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      href={`/system/users/${row.id}`}
                    >
                      <TableCell>
                        <div className="font-medium">{row.displayName}</div>
                        <div
                          dir="ltr"
                          lang="en"
                          className="mt-1 text-xs text-muted-foreground tabular-nums"
                        >
                          #{row.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span dir="ltr" className="break-all">
                          {row.username}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span dir="ltr" className="break-all">
                          {row.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <SystemUserRoleBadge
                          value={row.role}
                          locale={locale}
                        />
                      </TableCell>
                      <TableCell>
                        {systemUserAccessLabel(row.accessType, locale)}
                      </TableCell>
                      <TableCell>
                        <SystemUserStatusBadge
                          value={row.status}
                          locale={locale}
                        />
                      </TableCell>
                      <TableCell>
                        {row.companyName || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          dir="ltr"
                          lang="en"
                          className="tabular-nums"
                        >
                          {formatDateTime(row.createdAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <DataRegisterEmptyState
                        icon={UserRound}
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
              showingCount={formatInteger(rows.length)}
              ofLabel={t.of}
              totalCount={formatInteger(count)}
              rowsLabel={t.rows}
            />

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t.page}{" "}
                <span dir="ltr" lang="en" className="tabular-nums">
                  {formatInteger(page)} / {formatInteger(pages)}
                </span>
              </span>

              <Button
                variant="outline"
                size="sm"
                className={registerOutlineButtonClass}
                disabled={page <= 1}
                onClick={() =>
                  setPage((value) => Math.max(1, value - 1))
                }
              >
                {t.previous}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className={registerOutlineButtonClass}
                disabled={page >= pages}
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
