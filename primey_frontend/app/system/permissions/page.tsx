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



function readPrimeyLocaleFromDom(): Locale {

  if (typeof window === "undefined") {

    return "ar";

  }

  const candidates = [

    window.localStorage.getItem("primey-locale"),

    window.localStorage.getItem("primey_locale"),

    window.localStorage.getItem("primey:locale"),

    window.localStorage.getItem("locale"),

    document.documentElement.lang,

    document.documentElement.dir === "ltr" ? "en" : "ar",

  ]

    .filter(Boolean)

    .map((value) => String(value).toLowerCase());

  return candidates.some((value) => value.startsWith("en")) ? "en" : "ar";

}



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



  const [locale, setLocale] = React.useState<Locale>(() => readPrimeyLocaleFromDom());



  React.useEffect(() => {

    const syncLocale = () => {

      setLocale(readPrimeyLocaleFromDom());

    };

    syncLocale();

    const events = [

      "storage",

      "primey-locale-change",

      "primey-locale-changed",

      "primey:locale-change",

      "primey:locale-changed",

      "localechange",

    ];

    events.forEach((eventName) => {

      window.addEventListener(eventName, syncLocale);

    });

    const observer = new MutationObserver(syncLocale);

    observer.observe(document.documentElement, {

      attributes: true,
      attributeFilter: ["lang", "dir"],

    });

    return () => {

      events.forEach((eventName) => {

        window.removeEventListener(eventName, syncLocale);

      });

      observer.disconnect();

    };

  }, []);





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



        const data = (payload?.data || payload || {}) as Partial<PermissionsCatalog>;



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



      className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8 print:bg-white"



    >



      <div className="w-full space-y-6">



        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">



          <div className="relative p-6 sm:p-8">



            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />



            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">



              <div className="max-w-4xl">



                <Badge variant="outline" className="w-fit rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">



                  <ShieldCheck className="me-1.5 h-3.5 w-3.5" />



                  PrimeyAcc System



                </Badge>



                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">



                  {pageTitle}



                </h1>



                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">



                  {pageDescription}



                </p>



              </div>



              <div className="flex flex-wrap items-center gap-2">



                <Button asChild className="rounded-xl">



                  <Link href="/system/roles">



                    <KeyRound className="me-2 h-4 w-4" />



                    {textByLocale(locale, "\u0627\u0644\u0623\u062f\u0648\u0627\u0631", "Roles")}



                  </Link>



                </Button>



                <Button type="button" variant="outline" className="rounded-xl bg-background" onClick={printPage}>



                  PDF



                  <FileSpreadsheet className="ms-2 h-4 w-4" />



                </Button>



                <Button type="button" variant="outline" className="rounded-xl bg-background" onClick={printPage}>



                  {textByLocale(locale, "\u0637\u0628\u0627\u0639\u0629", "Print")}



                  <Printer className="ms-2 h-4 w-4" />



                </Button>



                <Button type="button" variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>



                  {textByLocale(locale, "\u062a\u0635\u062f\u064a\u0631 Excel", "Export Excel")}



                  <FileSpreadsheet className="ms-2 h-4 w-4" />



                </Button>



                <Button



                  type="button"



                  variant="outline"



                  className="rounded-xl bg-background"



                  onClick={() => void loadCatalog("refresh")}



                  disabled={refreshing || loading}



                >



                  {textByLocale(locale, "\u062a\u062d\u062f\u064a\u062b", "Refresh")}



                  {refreshing ? (



                    <Loader2 className="ms-2 h-4 w-4 animate-spin" />



                  ) : (



                    <RefreshCw className="ms-2 h-4 w-4" />



                  )}



                </Button>



              </div>



            </div>



          </div>



        </section>



        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">



          {[



            {



              title: textByLocale(locale, "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a", "Total Permissions"),



              value: totals.total,



              icon: ShieldCheck,



            },



            {



              title: textByLocale(locale, "\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0646\u0638\u0627\u0645", "System Permissions"),



              value: totals.system,



              icon: KeyRound,



            },



            {



              title: textByLocale(locale, "\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0627\u062a", "Company Permissions"),



              value: totals.company,



              icon: Layers3,



            },



            {



              title: textByLocale(locale, "\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a", "Groups"),



              value: totals.groups,



              icon: TableProperties,



            },



          ].map((item) => {



            const Icon = item.icon;



            return (



              <Card



                key={item.title}



                className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"



              >



                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">



                  <div className="min-w-0">



                    <CardDescription className="truncate text-sm">{item.title}</CardDescription>



                    <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">



                      {loading ? <Skeleton className="h-8 w-16" /> : formatNumber(item.value)}



                    </CardTitle>



                  </div>



                  <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">



                    <Icon className="h-5 w-5" />



                  </span>



                </CardHeader>



                <CardContent className="pt-0">



                  <p className="line-clamp-2 text-xs text-muted-foreground">



                    {textByLocale(locale, "\u0645\u0646 \u0648\u0627\u062c\u0647\u0627\u062a \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u062d\u0642\u064a\u0642\u064a\u0629", "From real system APIs")}



                  </p>



                </CardContent>



              </Card>



            );



          })}



        </section>



        <Card className="rounded-2xl shadow-sm">



          <CardHeader>



            <CardTitle>{textByLocale(locale, "\u0627\u062e\u062a\u0635\u0627\u0631\u0627\u062a \u0648\u062d\u062f\u0629 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a", "Permissions shortcuts")}</CardTitle>



            <CardDescription>



              {textByLocale(locale, "\u062a\u0646\u0642\u0644 \u0633\u0631\u064a\u0639 \u0628\u064a\u0646 \u0635\u0641\u062d\u0627\u062a \u0627\u0644\u062d\u0648\u0643\u0645\u0629 \u0628\u0646\u0641\u0633 \u0646\u0645\u0637 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u0635\u0629.", "Quick navigation between governance pages using the platform management pattern.")}



            </CardDescription>



          </CardHeader>



          <CardContent>



            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">



              {[



                {



                  href: "/system/roles",



                  title: textByLocale(locale, "\u0627\u0644\u0623\u062f\u0648\u0627\u0631", "Roles"),



                  description: textByLocale(locale, "\u0639\u0631\u0636 \u0643\u062a\u0627\u0644\u0648\u062c \u0623\u062f\u0648\u0627\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0627\u0644\u0634\u0631\u0643\u0627\u062a.", "View system and company roles catalog."),



                  icon: KeyRound,



                },



                {



                  href: "/system/users/permissions",



                  title: textByLocale(locale, "\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646", "User permissions"),



                  description: textByLocale(locale, "\u0645\u0631\u0627\u062c\u0639\u0629 \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0648\u0639\u0636\u0648\u064a\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646.", "Review user permissions and memberships."),



                  icon: TableProperties,



                },



                {



                  href: "/system/business-controls",



                  title: textByLocale(locale, "\u0636\u0648\u0627\u0628\u0637 \u0627\u0644\u0623\u0639\u0645\u0627\u0644", "Business controls"),



                  description: textByLocale(locale, "\u0645\u0631\u0627\u062c\u0639\u0629 \u0636\u0648\u0627\u0628\u0637 \u0627\u0644\u062a\u062f\u0642\u064a\u0642 \u0648\u0627\u0644\u062a\u062d\u0643\u0645.", "Review audit and control settings."),



                  icon: ShieldCheck,



                },



                {



                  href: "/system",



                  title: textByLocale(locale, "\u0644\u0648\u062d\u0629 \u0627\u0644\u0646\u0638\u0627\u0645", "System dashboard"),



                  description: textByLocale(locale, "\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629.", "Return to the main system dashboard."),



                  icon: LayoutDashboard,



                },



              ].map((action) => {



                const Icon = action.icon;



                return (



                  <Link key={action.href} href={action.href}>



                    <Card className="group h-full rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">



                      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">



                        <div className="min-w-0">



                          <CardTitle className="text-base">{action.title}</CardTitle>



                          <CardDescription className="mt-2 line-clamp-2">{action.description}</CardDescription>



                        </div>



                        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">



                          <Icon className="h-5 w-5" />



                        </span>



                      </CardHeader>



                    </Card>



                  </Link>



                );



              })}



            </div>



          </CardContent>



        </Card>



        <Card className="w-full rounded-2xl shadow-sm">



          <CardHeader className="gap-3">



            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">



              <div>



                <CardTitle>{textByLocale(locale, "\u062c\u062f\u0648\u0644 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a", "Permissions table")}</CardTitle>



                <CardDescription className="mt-2">



                  {textByLocale(locale, "\u0646\u0638\u0631\u0629 \u0633\u0631\u064a\u0639\u0629 \u0639\u0644\u0649 \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0627\u0644\u0634\u0631\u0643\u0627\u062a.", "A quick view of system and company permissions.")}



                </CardDescription>



              </div>



              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">



                {textByLocale(locale, "\u0639\u0631\u0636", "Showing")} {formatNumber(filteredPermissions.length)} {textByLocale(locale, "\u0645\u0646", "of")} {formatNumber(allPermissions.length)}



              </Badge>



            </div>



          </CardHeader>



          <CardContent className="space-y-4">



            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between print:hidden">



              <div className="relative min-w-0 flex-1">



                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />



                <Input



                  value={searchTerm}



                  onChange={(event) => setSearchTerm(event.target.value)}



                  className="h-10 rounded-xl bg-background ps-10"



                  placeholder={textByLocale(locale, "\u0627\u0628\u062d\u062b \u0628\u0627\u0644\u0643\u0648\u062f \u0623\u0648 \u0627\u0644\u0646\u0637\u0627\u0642 \u0623\u0648 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629...", "Search by code, scope, or group...")}



                />



              </div>



              <Select value={scopeFilter} onValueChange={(value) => setScopeFilter(value as ScopeFilter)}>



                <SelectTrigger className="h-10 rounded-xl bg-background md:w-[170px]">



                  <SelectValue placeholder={textByLocale(locale, "\u0627\u0644\u0646\u0637\u0627\u0642", "Scope")} />



                </SelectTrigger>



                <SelectContent>



                  <SelectItem value="all">{textByLocale(locale, "\u0627\u0644\u0643\u0644", "All")}</SelectItem>



                  <SelectItem value="system">{textByLocale(locale, "\u0627\u0644\u0646\u0638\u0627\u0645", "System")}</SelectItem>



                  <SelectItem value="company">{textByLocale(locale, "\u0627\u0644\u0634\u0631\u0643\u0627\u062a", "Company")}</SelectItem>



                </SelectContent>



              </Select>



              <Select value={groupFilter} onValueChange={setGroupFilter}>



                <SelectTrigger className="h-10 rounded-xl bg-background md:w-[190px]">



                  <SelectValue placeholder={textByLocale(locale, "\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629", "Group")} />



                </SelectTrigger>



                <SelectContent>



                  <SelectItem value="all">{textByLocale(locale, "\u0643\u0644 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a", "All groups")}</SelectItem>



                  {visibleGroups.map((group) => (



                    <SelectItem key={`${group.scope}-${group.group}`} value={normalizeText(group.group || "general")}>



                      {normalizeText(group.name || group.group || "general")}



                    </SelectItem>



                  ))}



                </SelectContent>



              </Select>



              <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>



                <SelectTrigger className="h-10 rounded-xl bg-background md:w-[170px]">



                  <SelectValue placeholder={textByLocale(locale, "\u0627\u0644\u062a\u0631\u062a\u064a\u0628", "Sort")} />



                </SelectTrigger>



                <SelectContent>



                  <SelectItem value="code">{textByLocale(locale, "\u0627\u0644\u0643\u0648\u062f", "Code")}</SelectItem>



                  <SelectItem value="scope">{textByLocale(locale, "\u0627\u0644\u0646\u0637\u0627\u0642", "Scope")}</SelectItem>



                  <SelectItem value="group">{textByLocale(locale, "\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629", "Group")}</SelectItem>



                  <SelectItem value="name">{textByLocale(locale, "\u0627\u0644\u0627\u0633\u0645", "Name")}</SelectItem>



                </SelectContent>



              </Select>



              <Button type="button" variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>



                <RotateCcw className="me-2 h-4 w-4" />



                {textByLocale(locale, "\u0625\u0639\u0627\u062f\u0629 \u0636\u0628\u0637", "Reset")}



              </Button>



            </div>



            {error ? (



              <Card className="border-destructive/30 bg-destructive/5 shadow-sm">



                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">



                  <div className="flex items-start gap-3">



                    <CircleAlert className="mt-0.5 h-5 w-5 text-destructive" />



                    <div>



                      <h2 className="font-semibold text-destructive">



                        {textByLocale(locale, "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a", "Unable to load data")}



                      </h2>



                      <p className="mt-1 text-sm text-muted-foreground">{error}</p>



                    </div>



                  </div>



                  <Button type="button" className="rounded-xl" onClick={() => void loadCatalog("refresh")}>



                    <RefreshCw className="me-2 h-4 w-4" />



                    {textByLocale(locale, "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629", "Retry")}



                  </Button>



                </CardContent>



              </Card>



            ) : null}



            {loading ? (



              <div className="space-y-3">



                {Array.from({ length: 8 }).map((_, index) => (



                  <Skeleton key={index} className="h-14 w-full rounded-2xl" />



                ))}



              </div>



            ) : allPermissions.length === 0 ? (



              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">



                <TriangleAlert className="h-10 w-10 text-muted-foreground" />



                <h3 className="mt-4 text-lg font-semibold">{textByLocale(locale, "\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0644\u0627\u062d\u064a\u0627\u062a", "No permissions")}</h3>



                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">



                  {textByLocale(locale, "\u0644\u0645 \u064a\u0631\u062c\u0639 API \u0623\u064a \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u062d\u062a\u0649 \u0627\u0644\u0622\u0646.", "The API did not return any permissions yet.")}



                </p>



              </div>



            ) : filteredPermissions.length === 0 ? (



              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">



                <Search className="h-10 w-10 text-muted-foreground" />



                <h3 className="mt-4 text-lg font-semibold">{textByLocale(locale, "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c", "No results")}</h3>



                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">



                  {textByLocale(locale, "\u063a\u064a\u0651\u0631 \u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0623\u0648 \u0627\u0645\u0633\u062d \u0627\u0644\u0628\u062d\u062b \u0644\u0639\u0631\u0636 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a.", "Change filters or clear search to show permissions.")}



                </p>



              </div>



            ) : (



              <div className="overflow-hidden rounded-2xl border bg-background">



                <div className="w-full overflow-x-auto">



                  <Table className="w-full min-w-[980px] table-fixed">



                    <TableHeader>



                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">



                        <TableHead className="h-11 w-[190px] px-4 text-xs font-semibold text-muted-foreground">



                          <button type="button" className="inline-flex items-center gap-1" onClick={() => setSortKey("code")}>



                            {textByLocale(locale, "\u0627\u0644\u0643\u0648\u062f", "Code")}



                            <ArrowUpDown className="h-3.5 w-3.5" />



                          </button>



                        </TableHead>



                        <TableHead className="h-11 w-[130px] px-4 text-xs font-semibold text-muted-foreground">



                          {textByLocale(locale, "\u0627\u0644\u0646\u0637\u0627\u0642", "Scope")}



                        </TableHead>



                        <TableHead className="h-11 w-[170px] px-4 text-xs font-semibold text-muted-foreground">



                          {textByLocale(locale, "\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629", "Group")}



                        </TableHead>



                        <TableHead className="h-11 w-[220px] px-4 text-xs font-semibold text-muted-foreground">



                          {textByLocale(locale, "\u0627\u0644\u0627\u0633\u0645", "Name")}



                        </TableHead>



                        <TableHead className="h-11 px-4 text-xs font-semibold text-muted-foreground">



                          {textByLocale(locale, "\u0627\u0644\u0648\u0635\u0641", "Description")}



                        </TableHead>



                        <TableHead className="h-11 w-[80px] px-3 text-center text-xs font-semibold text-muted-foreground">



                          {textByLocale(locale, "\u0646\u0633\u062e", "Copy")}



                        </TableHead>



                      </TableRow>



                    </TableHeader>



                    <TableBody>



                      {filteredPermissions.map((permission) => (



                        <TableRow key={`${permission.scope}-${permission.code}`} className="h-[64px]">



                          <TableCell className="h-[64px] overflow-hidden px-4 align-middle">



                            <div className="flex flex-col gap-2">



                              <code className="truncate rounded-xl bg-muted px-2.5 py-1 text-xs font-semibold">



                                {normalizeText(permission.code)}



                              </code>



                              {permission.is_all ? (



                                <Badge variant="outline" className="w-fit rounded-full border-amber-200 bg-amber-50 text-amber-700">



                                  {textByLocale(locale, "\u0635\u0644\u0627\u062d\u064a\u0629 \u0634\u0627\u0645\u0644\u0629", "All permission")}



                                </Badge>



                              ) : null}



                            </div>



                          </TableCell>



                          <TableCell className="h-[64px] overflow-hidden px-4 align-middle">



                            <Badge className={scopeBadgeClass(permission.scope)}>



                              {scopeLabel(permission.scope, locale)}



                            </Badge>



                          </TableCell>



                          <TableCell className="h-[64px] overflow-hidden px-4 align-middle">



                            <Badge variant="outline" className="rounded-full">



                              {normalizeText(permission.group || "general")}



                            </Badge>



                          </TableCell>



                          <TableCell className="h-[64px] overflow-hidden px-4 align-middle font-medium">



                            {permissionLabel(permission, locale)}



                          </TableCell>



                          <TableCell className="h-[64px] overflow-hidden px-4 align-middle text-sm leading-6 text-muted-foreground">



                            {normalizeText(permission.description) || "—"}



                          </TableCell>



                          <TableCell className="h-[64px] px-3 text-center align-middle">



                            <Button



                              type="button"



                              variant="outline"



                              size="icon"



                              className="h-8 w-8 rounded-lg bg-background"



                              onClick={() => void copyCode(permission.code)}



                            >



                              <Copy className="h-4 w-4" />



                              <span className="sr-only">{textByLocale(locale, "\u0646\u0633\u062e", "Copy")}</span>



                            </Button>



                          </TableCell>



                        </TableRow>



                      ))}



                    </TableBody>



                  </Table>



                </div>



              </div>



            )}



          </CardContent>



        </Card>



      </div>



    </main>



  );



}
