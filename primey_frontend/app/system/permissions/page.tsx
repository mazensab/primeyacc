"use client";
/* ============================================================
   📂 primey_frontend/app/system/permissions/page.tsx
   🏢 PrimeyAcc — System Permissions Catalog
   ------------------------------------------------------------
   ✅ Approved Premium PrimeyAcc system page pattern
   ✅ Real API only: GET /api/system/permissions/
   ✅ System + Company permissions catalog
   ✅ KPI cards + groups + searchable table
   ✅ Scope/group/search filters
   ✅ Excel .xls export
   ✅ Web print + PDF through browser print dialog
   ✅ Skeleton loading
   ✅ Error / Empty / No results states
   ✅ sonner toast
   ✅ Arabic/English via primey-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */
import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  CheckCircle2,
  CircleAlert,
  Copy,
  FileSpreadsheet,
  Filter,
  KeyRound,
  Layers3,
  LayoutDashboard,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TableProperties,
  TriangleAlert,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
type Locale = "ar" | "en";
type ScopeFilter = "all" | "system" | "company";
type SortKey = "code" | "scope" | "group" | "name";
type ApiPermission = {
  code?: string;
  scope?: string;
  group?: string;
  name?: string;
  name_ar?: string;
  description?: string;
  is_all?: boolean;
};
type ApiPermissionGroup = {
  scope?: string;
  group?: string;
  name?: string;
  name_ar?: string;
  permission_count?: number;
  permissions?: ApiPermission[];
};
type PermissionsCatalog = {
  system_permissions: ApiPermission[];
  company_permissions: ApiPermission[];
  system_groups: ApiPermissionGroup[];
  company_groups: ApiPermissionGroup[];
  counts: {
    system_permissions?: number;
    company_permissions?: number;
    system_groups?: number;
    company_groups?: number;
    total_permissions?: number;
  };
};
const EMPTY_CATALOG: PermissionsCatalog = {
  system_permissions: [],
  company_permissions: [],
  system_groups: [],
  company_groups: [],
  counts: {},
};
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).replace(/\/$/, "");
function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}
function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "ar";
  }
  const stored = window.localStorage.getItem("primey-locale");
  if (stored === "ar" || stored === "en") {
    return stored;
  }
  const htmlLang = document.documentElement.lang;
  return htmlLang?.toLowerCase().startsWith("en") ? "en" : "ar";
}
function textByLocale(locale: Locale, ar: string, en: string) {
  return locale === "ar" ? ar : en;
}
function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}
function normalizeText(value: unknown) {
  return String(value || "").trim();
}
function permissionLabel(permission: ApiPermission, locale: Locale) {
  const localized = locale === "ar" ? permission.name_ar : permission.name;
  return normalizeText(localized || permission.name || permission.name_ar || permission.code);
}
function scopeLabel(scope: string | undefined, locale: Locale) {
  if (scope === "company") {
    return textByLocale(locale, "الشركات", "Company");
  }
  if (scope === "system") {
    return textByLocale(locale, "النظام", "System");
  }
  return textByLocale(locale, "غير محدد", "Unknown");
}
function scopeBadgeClass(scope: string | undefined) {
  if (scope === "system") {
    return "border-slate-900 bg-slate-950 text-white hover:bg-slate-950";
  }
  if (scope === "company") {
    return "border-slate-300 bg-white text-slate-900";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}
function sortPermissions(rows: ApiPermission[], sortKey: SortKey) {
  return [...rows].sort((a, b) => {
    const left = normalizeText(a[sortKey]).toLowerCase();
    const right = normalizeText(b[sortKey]).toLowerCase();
    return left.localeCompare(right);
  });
}
function buildExcelHtml(rows: ApiPermission[], locale: Locale) {
  const headers =
    locale === "ar"
      ? ["الكود", "النطاق", "المجموعة", "الاسم", "الوصف", "صلاحية شاملة"]
      : ["Code", "Scope", "Group", "Name", "Description", "All Permission"];
  const escape = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const body = rows
    .map((row) => {
      const cells = [
        row.code,
        row.scope,
        row.group,
        permissionLabel(row, locale),
        row.description,
        row.is_all ? "Yes" : "No",
      ];
      return `<tr>${cells.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`;
    })
    .join("");
  return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escape(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}
export default function SystemPermissionsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [catalog, setCatalog] = React.useState<PermissionsCatalog>(EMPTY_CATALOG);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = React.useState<ScopeFilter>("all");
  const [groupFilter, setGroupFilter] = React.useState("all");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("code");
  const direction = locale === "ar" ? "rtl" : "ltr";
  const allPermissions = React.useMemo(() => {
    return [
      ...catalog.system_permissions.map((permission) => ({
        ...permission,
        scope: permission.scope || "system",
      })),
      ...catalog.company_permissions.map((permission) => ({
        ...permission,
        scope: permission.scope || "company",
      })),
    ];
  }, [catalog.company_permissions, catalog.system_permissions]);
  const allGroups = React.useMemo(() => {
    return [
      ...catalog.system_groups.map((group) => ({
        ...group,
        scope: group.scope || "system",
      })),
      ...catalog.company_groups.map((group) => ({
        ...group,
        scope: group.scope || "company",
      })),
    ];
  }, [catalog.company_groups, catalog.system_groups]);
  const visibleGroups = React.useMemo(() => {
    const scopedGroups =
      scopeFilter === "all"
        ? allGroups
        : allGroups.filter((group) => group.scope === scopeFilter);
    const unique = new Map<string, ApiPermissionGroup>();
    scopedGroups.forEach((group) => {
      const key = normalizeText(group.group || "general");
      if (!unique.has(key)) {
        unique.set(key, group);
      }
    });
    return [...unique.values()].sort((a, b) =>
      normalizeText(a.group).localeCompare(normalizeText(b.group)),
    );
  }, [allGroups, scopeFilter]);
  const filteredPermissions = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = allPermissions.filter((permission) => {
      const permissionScope = normalizeText(permission.scope);
      const permissionGroup = normalizeText(permission.group || "general");
      const matchesScope =
        scopeFilter === "all" || permissionScope === scopeFilter;
      const matchesGroup =
        groupFilter === "all" || permissionGroup === groupFilter;
      const haystack = [
        permission.code,
        permission.scope,
        permission.group,
        permission.name,
        permission.name_ar,
        permission.description,
      ]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ");
      const matchesSearch = !query || haystack.includes(query);
      return matchesScope && matchesGroup && matchesSearch;
    });
    return sortPermissions(filtered, sortKey);
  }, [allPermissions, groupFilter, scopeFilter, searchTerm, sortKey]);
  const totals = React.useMemo(() => {
    const system = catalog.counts.system_permissions ?? catalog.system_permissions.length;
    const company = catalog.counts.company_permissions ?? catalog.company_permissions.length;
    const groups =
      (catalog.counts.system_groups ?? catalog.system_groups.length) +
      (catalog.counts.company_groups ?? catalog.company_groups.length);
    return {
      system,
      company,
      groups,
      total: catalog.counts.total_permissions ?? system + company,
    };
  }, [catalog]);
  const loadCatalog = React.useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      const controller = new AbortController();
      try {
        if (mode === "initial") {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError(null);
        const response = await fetch(apiUrl("/api/system/permissions/"), {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        const data = payload?.data || {};
        setCatalog({
          system_permissions: Array.isArray(data.system_permissions)
            ? data.system_permissions
            : [],
          company_permissions: Array.isArray(data.company_permissions)
            ? data.company_permissions
            : [],
          system_groups: Array.isArray(data.system_groups)
            ? data.system_groups
            : [],
          company_groups: Array.isArray(data.company_groups)
            ? data.company_groups
            : [],
          counts: data.counts || {},
        });
        if (mode === "refresh") {
          toast.success(
            textByLocale(locale, "تم تحديث الصلاحيات", "Permissions refreshed"),
          );
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : textByLocale(locale, "تعذر تحميل الصلاحيات", "Failed to load permissions");
        setError(message);
        toast.error(
          textByLocale(locale, "تعذر تحميل الصلاحيات", "Failed to load permissions"),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      return () => controller.abort();
    },
    [locale],
  );
  React.useEffect(() => {
    setLocale(getInitialLocale());
  }, []);
  React.useEffect(() => {
    void loadCatalog("initial");
  }, [loadCatalog]);
  React.useEffect(() => {
    setGroupFilter("all");
  }, [scopeFilter]);
  const resetFilters = () => {
    setScopeFilter("all");
    setGroupFilter("all");
    setSearchTerm("");
    setSortKey("code");
  };
  const exportExcel = () => {
    if (!filteredPermissions.length) {
      toast.error(textByLocale(locale, "لا توجد بيانات للتصدير", "No data to export"));
      return;
    }
    const html = buildExcelHtml(filteredPermissions, locale);
    const blob = new Blob([`\uFEFF${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "primeyacc-system-permissions.xls";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(textByLocale(locale, "تم تصدير Excel", "Excel exported"));
  };
  const printPage = () => {
    window.print();
  };
  const copyCode = async (code: string | undefined) => {
    const value = normalizeText(code);
    if (!value) {
      return;
    }
    await navigator.clipboard.writeText(value);
    toast.success(textByLocale(locale, "تم نسخ كود الصلاحية", "Permission code copied"));
  };
  const pageTitle = textByLocale(locale, "كتالوج صلاحيات النظام", "System Permissions Catalog");
  const pageDescription = textByLocale(
    locale,
    "عرض وتحليل صلاحيات النظام والشركات من API الحقيقي.",
    "View and analyze system and company permissions from the real API.",
  );
  return (
    <main
      dir={direction}
      className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8 print:bg-white"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
                    <ShieldCheck className="me-1 h-3.5 w-3.5" />
                    PrimeyAcc System
                  </Badge>
                  <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
                    GET /api/system/permissions/
                  </Badge>
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {pageTitle}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
                    {pageDescription}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="secondary" className="rounded-full">
                    <Link href="/system">
                      <LayoutDashboard className="me-2 h-4 w-4" />
                      {textByLocale(locale, "لوحة النظام", "System Dashboard")}
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" className="rounded-full">
                    <Link href="/system/roles">
                      <KeyRound className="me-2 h-4 w-4" />
                      {textByLocale(locale, "الأدوار", "Roles")}
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:min-w-80">
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => void loadCatalog("refresh")}
                  disabled={refreshing || loading}
                >
                  {refreshing ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="me-2 h-4 w-4" />
                  )}
                  {textByLocale(locale, "تحديث", "Refresh")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  onClick={printPage}
                >
                  <Printer className="me-2 h-4 w-4" />
                  {textByLocale(locale, "طباعة / PDF", "Print / PDF")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full sm:col-span-2"
                  onClick={exportExcel}
                >
                  <FileSpreadsheet className="me-2 h-4 w-4" />
                  {textByLocale(locale, "تصدير Excel", "Export Excel")}
                </Button>
              </div>
            </div>
          </div>
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription>{textByLocale(locale, "إجمالي الصلاحيات", "Total Permissions")}</CardDescription>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <ShieldCheck className="h-5 w-5 text-slate-500" />
                    {loading ? <Skeleton className="h-7 w-16" /> : formatNumber(totals.total)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription>{textByLocale(locale, "صلاحيات النظام", "System Permissions")}</CardDescription>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <KeyRound className="h-5 w-5 text-slate-500" />
                    {loading ? <Skeleton className="h-7 w-16" /> : formatNumber(totals.system)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription>{textByLocale(locale, "صلاحيات الشركات", "Company Permissions")}</CardDescription>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Layers3 className="h-5 w-5 text-slate-500" />
                    {loading ? <Skeleton className="h-7 w-16" /> : formatNumber(totals.company)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription>{textByLocale(locale, "المجموعات", "Groups")}</CardDescription>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <TableProperties className="h-5 w-5 text-slate-500" />
                    {loading ? <Skeleton className="h-7 w-16" /> : formatNumber(totals.groups)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          </CardContent>
        </section>
        <Card className="border-slate-200 bg-white shadow-sm print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {textByLocale(locale, "الفلاتر", "Filters")}
            </CardTitle>
            <CardDescription>
              {textByLocale(
                locale,
                "ابحث حسب الكود أو النطاق أو المجموعة أو الوصف.",
                "Search by code, scope, group, or description.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 rounded-full ps-10"
                  placeholder={textByLocale(locale, "بحث في الصلاحيات...", "Search permissions...")}
                />
              </div>
              <Select value={scopeFilter} onValueChange={(value) => setScopeFilter(value as ScopeFilter)}>
                <SelectTrigger className="h-11 rounded-full">
                  <SelectValue placeholder={textByLocale(locale, "النطاق", "Scope")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{textByLocale(locale, "كل النطاقات", "All scopes")}</SelectItem>
                  <SelectItem value="system">{textByLocale(locale, "النظام", "System")}</SelectItem>
                  <SelectItem value="company">{textByLocale(locale, "الشركات", "Company")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="h-11 rounded-full">
                  <SelectValue placeholder={textByLocale(locale, "المجموعة", "Group")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{textByLocale(locale, "كل المجموعات", "All groups")}</SelectItem>
                  {visibleGroups.map((group) => (
                    <SelectItem key={`${group.scope}-${group.group}`} value={normalizeText(group.group || "general")}>
                      {normalizeText(group.name || group.group || "general")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                <SelectTrigger className="h-11 rounded-full">
                  <SelectValue placeholder={textByLocale(locale, "الترتيب", "Sort")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">{textByLocale(locale, "حسب الكود", "By code")}</SelectItem>
                  <SelectItem value="scope">{textByLocale(locale, "حسب النطاق", "By scope")}</SelectItem>
                  <SelectItem value="group">{textByLocale(locale, "حسب المجموعة", "By group")}</SelectItem>
                  <SelectItem value="name">{textByLocale(locale, "حسب الاسم", "By name")}</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" className="h-11 rounded-full" onClick={resetFilters}>
                <RotateCcw className="me-2 h-4 w-4" />
                {textByLocale(locale, "إعادة", "Reset")}
              </Button>
            </div>
          </CardContent>
        </Card>
        {error ? (
          <Card className="border-red-200 bg-red-50 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 text-red-600" />
                <div>
                  <h2 className="font-semibold text-red-900">
                    {textByLocale(locale, "تعذر تحميل البيانات", "Unable to load data")}
                  </h2>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
              <Button type="button" onClick={() => void loadCatalog("refresh")}>
                <RefreshCw className="me-2 h-4 w-4" />
                {textByLocale(locale, "إعادة المحاولة", "Retry")}
              </Button>
            </CardContent>
          </Card>
        ) : null}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TableProperties className="h-5 w-5" />
                {textByLocale(locale, "جدول الصلاحيات", "Permissions Table")}
              </CardTitle>
              <CardDescription>
                {textByLocale(locale, "عدد النتائج الحالية", "Current results")}{" "}
                <span className="font-semibold text-slate-900">
                  {formatNumber(filteredPermissions.length)}
                </span>
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit rounded-full">
              <CheckCircle2 className="me-1 h-3.5 w-3.5" />
              {textByLocale(locale, "Real API", "Real API")}
            </Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-2xl" />
                ))}
              </div>
            ) : allPermissions.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 p-8 text-center">
                <TriangleAlert className="h-10 w-10 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold">
                  {textByLocale(locale, "لا توجد صلاحيات", "No permissions")}
                </h3>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  {textByLocale(
                    locale,
                    "لم يرجع API أي صلاحيات حتى الآن.",
                    "The API did not return any permissions yet.",
                  )}
                </p>
              </div>
            ) : filteredPermissions.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 p-8 text-center">
                <Search className="h-10 w-10 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold">
                  {textByLocale(locale, "لا توجد نتائج", "No results")}
                </h3>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  {textByLocale(
                    locale,
                    "غيّر الفلاتر أو امسح البحث لعرض الصلاحيات.",
                    "Change filters or clear search to show permissions.",
                  )}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="min-w-72">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-semibold"
                          onClick={() => setSortKey("code")}
                        >
                          {textByLocale(locale, "الكود", "Code")}
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead>{textByLocale(locale, "النطاق", "Scope")}</TableHead>
                      <TableHead>{textByLocale(locale, "المجموعة", "Group")}</TableHead>
                      <TableHead>{textByLocale(locale, "الاسم", "Name")}</TableHead>
                      <TableHead>{textByLocale(locale, "الوصف", "Description")}</TableHead>
                      <TableHead className="text-center">{textByLocale(locale, "نسخ", "Copy")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPermissions.map((permission) => (
                      <TableRow key={`${permission.scope}-${permission.code}`} className="align-top">
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <code className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-900">
                              {normalizeText(permission.code)}
                            </code>
                            {permission.is_all ? (
                              <Badge variant="outline" className="w-fit border-amber-200 bg-amber-50 text-amber-700">
                                {textByLocale(locale, "صلاحية شاملة", "All permission")}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={scopeBadgeClass(permission.scope)}>
                            {scopeLabel(permission.scope, locale)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {normalizeText(permission.group || "general")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {permissionLabel(permission, locale)}
                        </TableCell>
                        <TableCell className="max-w-md text-sm leading-6 text-slate-500">
                          {normalizeText(permission.description) || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="rounded-full"
                            onClick={() => void copyCode(permission.code)}
                          >
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">
                              {textByLocale(locale, "نسخ", "Copy")}
                            </span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
