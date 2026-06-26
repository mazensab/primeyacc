"use client";
/* ============================================================
   📂 primey_frontend/app/system/roles/page.tsx
   🏢 PrimeyAcc — System Roles Catalog
   ------------------------------------------------------------
   ✅ Approved Premium PrimeyAcc system page pattern
   ✅ Real API only: GET /api/system/roles/
   ✅ System + Company roles catalog
   ✅ KPI cards + searchable table
   ✅ Scope/search/sort filters
   ✅ Role permissions preview
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
  Building2,
  CheckCircle2,
  CircleAlert,
  Copy,
  FileSpreadsheet,
  Filter,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TableProperties,
  TriangleAlert,
  UsersRound,
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
type SortKey = "code" | "scope" | "name" | "permission_count";
type ApiRole = {
  code?: string;
  scope?: string;
  name?: string;
  name_ar?: string;
  user_count?: number;
  membership_count?: number;
  permission_count?: number;
  permissions?: string[];
  is_system_role?: boolean;
  is_company_role?: boolean;
};
type RolesCatalog = {
  system_roles: ApiRole[];
  company_roles: ApiRole[];
  counts: {
    system_roles?: number;
    company_roles?: number;
    total_roles?: number;
    system_role_users?: number;
    company_role_memberships?: number;
  };
};
const EMPTY_CATALOG: RolesCatalog = {
  system_roles: [],
  company_roles: [],
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
function roleLabel(role: ApiRole, locale: Locale) {
  const localized = locale === "ar" ? role.name_ar : role.name;
  return normalizeText(localized || role.name || role.name_ar || role.code);
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
function principalCount(role: ApiRole) {
  if (role.scope === "company") {
    return Number(role.membership_count || 0);
  }
  return Number(role.user_count || 0);
}
function sortRoles(rows: ApiRole[], sortKey: SortKey) {
  return [...rows].sort((a, b) => {
    if (sortKey === "permission_count") {
      return Number(b.permission_count || 0) - Number(a.permission_count || 0);
    }
    const left = normalizeText(a[sortKey]).toLowerCase();
    const right = normalizeText(b[sortKey]).toLowerCase();
    return left.localeCompare(right);
  });
}
function buildExcelHtml(rows: ApiRole[], locale: Locale) {
  const headers =
    locale === "ar"
      ? ["الكود", "النطاق", "الاسم", "عدد المستخدمين/العضويات", "عدد الصلاحيات", "الصلاحيات"]
      : ["Code", "Scope", "Name", "Users/Memberships", "Permission Count", "Permissions"];
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
        roleLabel(row, locale),
        principalCount(row),
        row.permission_count,
        Array.isArray(row.permissions) ? row.permissions.join(", ") : "",
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
export default function SystemRolesPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [catalog, setCatalog] = React.useState<RolesCatalog>(EMPTY_CATALOG);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = React.useState<ScopeFilter>("all");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("code");
  const direction = locale === "ar" ? "rtl" : "ltr";
  const allRoles = React.useMemo(() => {
    return [
      ...catalog.system_roles.map((role) => ({
        ...role,
        scope: role.scope || "system",
      })),
      ...catalog.company_roles.map((role) => ({
        ...role,
        scope: role.scope || "company",
      })),
    ];
  }, [catalog.company_roles, catalog.system_roles]);
  const filteredRoles = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = allRoles.filter((role) => {
      const roleScope = normalizeText(role.scope);
      const matchesScope = scopeFilter === "all" || roleScope === scopeFilter;
      const permissionsText = Array.isArray(role.permissions)
        ? role.permissions.join(" ")
        : "";
      const haystack = [
        role.code,
        role.scope,
        role.name,
        role.name_ar,
        role.permission_count,
        permissionsText,
      ]
        .map((value) => normalizeText(value).toLowerCase())
        .join(" ");
      const matchesSearch = !query || haystack.includes(query);
      return matchesScope && matchesSearch;
    });
    return sortRoles(filtered, sortKey);
  }, [allRoles, scopeFilter, searchTerm, sortKey]);
  const totals = React.useMemo(() => {
    const system = catalog.counts.system_roles ?? catalog.system_roles.length;
    const company = catalog.counts.company_roles ?? catalog.company_roles.length;
    return {
      system,
      company,
      total: catalog.counts.total_roles ?? system + company,
      systemUsers: catalog.counts.system_role_users ?? 0,
      companyMemberships: catalog.counts.company_role_memberships ?? 0,
    };
  }, [catalog]);
  const loadCatalog = React.useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      try {
        if (mode === "initial") {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError(null);
        const response = await fetch(apiUrl("/api/system/roles/"), {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        const data = payload?.data || {};
        setCatalog({
          system_roles: Array.isArray(data.system_roles) ? data.system_roles : [],
          company_roles: Array.isArray(data.company_roles) ? data.company_roles : [],
          counts: data.counts || {},
        });
        if (mode === "refresh") {
          toast.success(textByLocale(locale, "تم تحديث الأدوار", "Roles refreshed"));
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : textByLocale(locale, "تعذر تحميل الأدوار", "Failed to load roles");
        setError(message);
        toast.error(textByLocale(locale, "تعذر تحميل الأدوار", "Failed to load roles"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [locale],
  );
  React.useEffect(() => {
    setLocale(getInitialLocale());
  }, []);
  React.useEffect(() => {
    void loadCatalog("initial");
  }, [loadCatalog]);
  const resetFilters = () => {
    setScopeFilter("all");
    setSearchTerm("");
    setSortKey("code");
  };
  const exportExcel = () => {
    if (!filteredRoles.length) {
      toast.error(textByLocale(locale, "لا توجد بيانات للتصدير", "No data to export"));
      return;
    }
    const html = buildExcelHtml(filteredRoles, locale);
    const blob = new Blob([`\uFEFF${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "primeyacc-system-roles.xls";
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
    toast.success(textByLocale(locale, "تم نسخ كود الدور", "Role code copied"));
  };
  const pageTitle = textByLocale(locale, "كتالوج أدوار النظام", "System Roles Catalog");
  const pageDescription = textByLocale(
    locale,
    "عرض وتحليل أدوار النظام والشركات وصلاحيات كل دور من API الحقيقي.",
    "View and analyze system and company roles with permissions from the real API.",
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
                    <KeyRound className="me-1 h-3.5 w-3.5" />
                    PrimeyAcc System
                  </Badge>
                  <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/10">
                    GET /api/system/roles/
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
                    <Link href="/system/permissions">
                      <ShieldCheck className="me-2 h-4 w-4" />
                      {textByLocale(locale, "الصلاحيات", "Permissions")}
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
                  <CardDescription>
                    {textByLocale(locale, "إجمالي الأدوار", "Total Roles")}
                  </CardDescription>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <KeyRound className="h-5 w-5 text-slate-500" />
                    {loading ? <Skeleton className="h-7 w-16" /> : formatNumber(totals.total)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription>
                    {textByLocale(locale, "أدوار النظام", "System Roles")}
                  </CardDescription>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <UsersRound className="h-5 w-5 text-slate-500" />
                    {loading ? <Skeleton className="h-7 w-16" /> : formatNumber(totals.system)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription>
                    {textByLocale(locale, "أدوار الشركات", "Company Roles")}
                  </CardDescription>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Building2 className="h-5 w-5 text-slate-500" />
                    {loading ? <Skeleton className="h-7 w-16" /> : formatNumber(totals.company)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription>
                    {textByLocale(locale, "المستخدمون والعضويات", "Users & Memberships")}
                  </CardDescription>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <TableProperties className="h-5 w-5 text-slate-500" />
                    {loading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      formatNumber(totals.systemUsers + totals.companyMemberships)
                    )}
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
                "ابحث حسب كود الدور أو النطاق أو الاسم أو الصلاحيات.",
                "Search by role code, scope, name, or permissions.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 rounded-full ps-10"
                  placeholder={textByLocale(locale, "بحث في الأدوار...", "Search roles...")}
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
              <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                <SelectTrigger className="h-11 rounded-full">
                  <SelectValue placeholder={textByLocale(locale, "الترتيب", "Sort")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">{textByLocale(locale, "حسب الكود", "By code")}</SelectItem>
                  <SelectItem value="scope">{textByLocale(locale, "حسب النطاق", "By scope")}</SelectItem>
                  <SelectItem value="name">{textByLocale(locale, "حسب الاسم", "By name")}</SelectItem>
                  <SelectItem value="permission_count">
                    {textByLocale(locale, "حسب عدد الصلاحيات", "By permission count")}
                  </SelectItem>
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
                {textByLocale(locale, "جدول الأدوار", "Roles Table")}
              </CardTitle>
              <CardDescription>
                {textByLocale(locale, "عدد النتائج الحالية", "Current results")}{" "}
                <span className="font-semibold text-slate-900">
                  {formatNumber(filteredRoles.length)}
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
            ) : allRoles.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 p-8 text-center">
                <TriangleAlert className="h-10 w-10 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold">
                  {textByLocale(locale, "لا توجد أدوار", "No roles")}
                </h3>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  {textByLocale(locale, "لم يرجع API أي أدوار حتى الآن.", "The API did not return any roles yet.")}
                </p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 p-8 text-center">
                <Search className="h-10 w-10 text-slate-400" />
                <h3 className="mt-4 text-lg font-semibold">
                  {textByLocale(locale, "لا توجد نتائج", "No results")}
                </h3>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  {textByLocale(locale, "غيّر الفلاتر أو امسح البحث لعرض الأدوار.", "Change filters or clear search to show roles.")}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="min-w-56">
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
                      <TableHead>{textByLocale(locale, "الاسم", "Name")}</TableHead>
                      <TableHead>{textByLocale(locale, "المستخدمون/العضويات", "Users/Memberships")}</TableHead>
                      <TableHead>{textByLocale(locale, "الصلاحيات", "Permissions")}</TableHead>
                      <TableHead className="text-center">{textByLocale(locale, "نسخ", "Copy")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => {
                      const permissions = Array.isArray(role.permissions) ? role.permissions : [];
                      const previewPermissions = permissions.slice(0, 5);
                      const remainingCount = Math.max(permissions.length - previewPermissions.length, 0);
                      return (
                        <TableRow key={`${role.scope}-${role.code}`} className="align-top">
                          <TableCell>
                            <code className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-900">
                              {normalizeText(role.code)}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge className={scopeBadgeClass(role.scope)}>
                              {scopeLabel(role.scope, locale)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {roleLabel(role, locale)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-full">
                              {formatNumber(principalCount(role))}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xl">
                            <div className="flex flex-wrap gap-1.5">
                              {previewPermissions.length > 0 ? (
                                previewPermissions.map((permission) => (
                                  <Badge
                                    key={`${role.code}-${permission}`}
                                    variant="outline"
                                    className="max-w-64 truncate rounded-full bg-slate-50"
                                  >
                                    {permission}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-slate-500">—</span>
                              )}
                              {remainingCount > 0 ? (
                                <Badge className="rounded-full bg-slate-950 text-white hover:bg-slate-950">
                                  +{formatNumber(remainingCount)}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="rounded-full"
                              onClick={() => void copyCode(role.code)}
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">
                                {textByLocale(locale, "نسخ", "Copy")}
                              </span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
