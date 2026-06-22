"use client";

/* ============================================================
   📂 primey_frontend/app/system/users/page.tsx
   🏢 PrimeyAcc — System Users Overview
   ------------------------------------------------------------
   ✅ Premium PrimeyCare admin pattern adapted for PrimeyAcc
   ✅ System users module center page
   ✅ Real API only: GET /api/users/
   ✅ KPI cards + quick actions + recent users table
   ✅ Search, status filter, sorting, reset
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
  Activity,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
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
type ApiRecord = Record<string, unknown>;
type SortKey = "newest" | "oldest" | "name" | "code";
type StatusFilter =
  | "all"
  | "active"
  | "inactive"
  | "suspended"
  | "trial"
  | "pending"
  | "draft"
  | "cancelled";

type UserRecord = {
  id: string;
  name: string;
  code: string;
  status: string;
  owner: string;
  activity: string;
  subscription: string;
  email: string;
  phone: string;
  city: string;
  created_at: string | null;
};

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const API_ENDPOINT = "/api/users/";

const statusFilters: StatusFilter[] = [
  "all",
  "active",
  "inactive",
  "suspended",
  "trial",
  "pending",
  "draft",
  "cancelled",
];

const translations = {
  ar: {
    title: "مستخدمو النظام",
    subtitle:
      "مركز إدارة مستخدمي نظام PrimeyAcc لمتابعة الحسابات، الأدوار، حالة التفعيل، والصلاحيات من مكان واحد.",
    badge: "إدارة المنصة",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    addUser: "إضافة مستخدم",
    list: "قائمة المستخدمين",
    reports: "تقارير المستخدمين",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث بالاسم أو اسم المستخدم أو البريد الإلكتروني أو الدور أو نوع الوصول...",
    all: "الكل",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    codeSort: "الكود",
    open: "فتح",

    totalUsers: "إجمالي المستخدمين",
    activeUsers: "المستخدمون النشطون",
    inactiveUsers: "غير النشطة",
    subscribedUsers: "مستخدمون بصلاحية نظام",
    fromLiveApi: "من واجهات النظام الحقيقية",

    actionsTitle: "اختصارات وحدة المستخدمين",
    actionsDesc: "تنقل سريع بين صفحات المستخدمين الأساسية بنفس نمط إدارة المنصة.",
    openListTitle: "عرض قائمة المستخدمين",
    openListDesc: "جدول كامل للمستخدمين مع الفلاتر والتصدير والطباعة.",
    createTitle: "إضافة مستخدم جديدة",
    createDesc: "إنشاء مستخدم جديد وربطه بإعدادات المنصة.",
    reportsTitle: "تقارير المستخدمين",
    reportsDesc: "تحليل المستخدمين حسب الحالة والدور وصلاحيات النظام.",
    dashboardTitle: "لوحة النظام",
    dashboardDesc: "العودة إلى لوحة تحكم النظام الرئيسية.",

    tableTitle: "أحدث المستخدمين",
    tableDesc:
      "نظرة سريعة على أحدث مستخدمي PrimeyAcc مع الحالة والدور والبريد والصلاحيات.",
    user: "المستخدم",
    code: "الكود",
    owner: "اسم المستخدم",
    activity: "الدور",
    subscription: "البريد الإلكتروني",
    city: "نوع الوصول",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",

    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    trial: "تجريبي",
    pending: "معلق",
    draft: "مسودة",
    cancelled: "ملغي",
    unknown: "غير محدد",

    noDataTitle: "لا توجد مستخدمين",
    noDataDesc: "سيظهر المستخدمون هنا عند توفرهم من API.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غير البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل مركز المستخدمين",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير مركز مستخدمين PrimeyAcc",
    generatedAt: "تاريخ الإنشاء",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    refreshed: "تم تحديث مركز المستخدمين.",
  },
  en: {
    title: "Users",
    subtitle:
      "PrimeyAcc system users center for accounts, roles, activation status, and permissions in one place.",
    badge: "Platform management",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    addUser: "Add user",
    list: "Users list",
    reports: "Users reports",
    reset: "Reset",
    searchPlaceholder: "Search by name, username, email, role, or access type...",
    all: "All",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    codeSort: "Code",
    open: "Open",

    totalUsers: "Total users",
    activeUsers: "Active users",
    inactiveUsers: "Inactive",
    subscribedUsers: "System access",
    fromLiveApi: "From real system APIs",

    actionsTitle: "Users module shortcuts",
    actionsDesc: "Quick navigation between users pages using the platform management pattern.",
    openListTitle: "Open users list",
    openListDesc: "Full users table with filters, export, and print.",
    createTitle: "Add a new user",
    createDesc: "Create a new user and connect it to platform settings.",
    reportsTitle: "Users reports",
    reportsDesc: "Analyze users by status, role, and system permissions.",
    dashboardTitle: "System dashboard",
    dashboardDesc: "Return to the main system dashboard.",

    tableTitle: "Latest users",
    tableDesc:
      "A quick view of the newest PrimeyAcc users with status, role, email, and permissions.",
    user: "User",
    code: "Code",
    owner: "Username",
    activity: "Role",
    subscription: "Email",
    city: "Access type",
    status: "Status",
    createdAt: "Created at",

    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    trial: "Trial",
    pending: "Pending",
    draft: "Draft",
    cancelled: "Cancelled",
    unknown: "Unknown",

    noDataTitle: "No users",
    noDataDesc: "Users will appear here when returned by the API.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load users center",
    errorDesc:
      "Make sure you are signed in as a system user and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "PrimeyAcc Users Center Report",
    generatedAt: "Generated at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    refreshed: "Users center refreshed.",
  },
} as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}

function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(toNumber(value)),
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/+$/,
          "",
        )
      : "";

  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}

function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let payload: unknown = null;

  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const record = asRecord(payload);
    const message =
      normalizeText(record.message) ||
      normalizeText(record.detail) ||
      normalizeText(record.error) ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (payload || {}) as T;
}

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);

  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.records)) return dataRecord.records;
  if (Array.isArray(metaRecord.results)) return metaRecord.results;

  return [];
}

function extractCount(payload: unknown) {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);
  const arrayCount = extractArray(payload).length;

  return toNumber(
    record.count ??
      record.total ??
      record.total_count ??
      dataRecord.count ??
      dataRecord.total ??
      dataRecord.total_count ??
      metaRecord.count ??
      metaRecord.total ??
      metaRecord.total_count,
    arrayCount,
  );
}

function normalizeNestedName(value: unknown, keys: string[] = ["name", "title", "full_name"]) {
  if (typeof value === "string") return value;
  const record = asRecord(value);

  for (const key of keys) {
    const text = normalizeText(record[key]);
    if (text) return text;
  }

  return "";
}

function normalizeStatus(value: unknown) {
  if (typeof value === "boolean") return value ? "active" : "inactive";

  const text = normalizeText(value, "active").toLowerCase();

  if (text === "true") return "active";
  if (text === "false") return "inactive";
  if (text === "enabled") return "active";
  if (text === "disabled") return "inactive";

  return text;
}

function normalizeUser(value: unknown): UserRecord {
  const record = asRecord(value);
  const user = record.user || record.account || record.auth_user || record.django_user;
  const userRecord = asRecord(user);
  const profile = record.profile || record.user_profile || record.profile_ref;
  const profileRecord = asRecord(profile);
  const membership = record.membership || record.default_membership || record.company_membership;
  const membershipRecord = asRecord(membership);
  const username = normalizeText(
    record.username ||
      record.user_name ||
      record.login ||
      userRecord.username ||
      userRecord.user_name ||
      profileRecord.username,
    "—",
  );
  const email = normalizeText(
    record.email ||
      record.user_email ||
      userRecord.email ||
      profileRecord.email ||
      profileRecord.user_email,
    "—",
  );
  const firstName = normalizeText(record.first_name || userRecord.first_name || profileRecord.first_name, "");
  const lastName = normalizeText(record.last_name || userRecord.last_name || profileRecord.last_name, "");
  const combinedName = normalizeText(`${firstName} ${lastName}`.trim(), "");
  const displayName =
    normalizeText(
      record.display_name ||
        record.full_name ||
        record.name ||
        profileRecord.display_name ||
        profileRecord.full_name ||
        userRecord.get_full_name ||
        combinedName,
      "",
    ) ||
    username ||
    email ||
    "—";
  const role = normalizeText(
    record.system_role ||
      record.role ||
      record.user_role ||
      profileRecord.system_role ||
      profileRecord.role ||
      membershipRecord.role,
    "—",
  );
  const isSystemUser = Boolean(
    record.is_system_user ||
      record.can_access_system ||
      profileRecord.is_system_user ||
      profileRecord.can_access_system,
  );
  const accessType = isSystemUser ? "system" : normalizeText(record.workspace_type || profileRecord.workspace_type, "company");
  return {
    id: normalizeText(record.id || record.uuid || record.pk || userRecord.id || profileRecord.id || username || email),
    name: displayName,
    code: username,
    status: normalizeStatus(record.status || record.is_active || profileRecord.status || userRecord.is_active),
    owner: username,
    activity: role,
    subscription: email,
    email,
    phone: normalizeText(record.phone || record.mobile || profileRecord.phone || profileRecord.mobile, "—"),
    city: accessType,
    created_at:
      normalizeText(
        record.created_at ||
          record.date_joined ||
          record.created ||
          userRecord.date_joined ||
          profileRecord.created_at ||
          profileRecord.created,
      ) || null,
  };
}


function getStatusLabel(value: string, locale: Locale) {
  const normalized = value.toLowerCase().replace(/[^a-z_]/g, "") as keyof (typeof translations)["ar"];
  const fallback = normalizeText(value, translations[locale].unknown);
  return normalizeText(translations[locale][normalized], fallback);
}

function getStatusClass(value: string) {
  const normalized = value.toLowerCase();

  if (["active", "paid", "confirmed", "ready", "success"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["pending", "trial", "draft", "processing"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["inactive", "failed", "cancelled", "expired", "suspended", "blocked"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function rowDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function StatusBadge({ value, locale }: { value: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getStatusClass(value))}
    >
      {getStatusLabel(value, locale)}
    </Badge>
  );
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {formatInteger(value)}
          </CardTitle>
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;

  return (
    <Card className="group rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={action.href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-base">{action.title}</CardTitle>
            <CardDescription className="mt-2 line-clamp-2">{action.description}</CardDescription>
          </div>
          <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-5 w-5" />
          </span>
        </CardHeader>
      </Link>
    </Card>
  );
}

function UsersOverviewSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-8 w-72" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl">
          <CardHeader>
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function EmptyState({
  title,
  description,
  showReset,
  resetLabel,
  onReset,
}: {
  title: string;
  description: string;
  showReset?: boolean;
  resetLabel: string;
  onReset: () => void;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {showReset ? (
        <Button variant="outline" size="sm" onClick={onReset} className="rounded-lg">
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default function SystemUsersPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [users, setUsers] = React.useState<UserRecord[]>([]);
  const [apiTotal, setApiTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [apiUnavailable, setApiUnavailable] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("newest");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";

  React.useEffect(() => {
    const applyLocale = () => {
      const nextLocale = getInitialLocale();
      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
      document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
    };

    applyLocale();
    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  const loadUsers = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: "1",
          page_size: "100",
          ordering: "-created_at",
        });

        const payload = await fetchJson<unknown>(makeApiUrl(API_ENDPOINT, params));
        const rows = extractArray(payload).map(normalizeUser);

        setUsers(rows);
        setApiTotal(extractCount(payload));

        if (silent) toast.success(t.refreshed);
            } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        const isMissingApi = message.includes("404") || message.toLowerCase().includes("not found");
        if (isMissingApi) {
          setUsers([]);
          setApiTotal(0);
          setApiUnavailable(true);
          setError("");
          return;
        }
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const resetFilters = React.useCallback(() => {
    setSearch("");
    setStatus("all");
    setSort("newest");
  }, []);

  const filteredUsers = React.useMemo(() => {
    const needle = search.trim().toLowerCase();

    const rows = users.filter((user) => {
      const haystack = [
        user.name,
        user.code,
        user.owner,
        user.activity,
        user.subscription,
        user.city,
        user.status,
      ]
        .join(" ")
        .toLowerCase();

      if (needle && !haystack.includes(needle)) return false;
      if (status !== "all" && user.status !== status) return false;

      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === "oldest") return rowDateValue(a.created_at) - rowDateValue(b.created_at);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "code") return a.code.localeCompare(b.code);
      return rowDateValue(b.created_at) - rowDateValue(a.created_at);
    });
  }, [users, search, sort, status]);

  const stats = React.useMemo(() => {
    return {
      total: apiTotal || users.length,
      active: users.filter((user) => user.status === "active").length,
      inactive: users.filter((user) =>
        ["inactive", "suspended", "cancelled"].includes(user.status),
      ).length,
      subscribed: users.filter((user) => user.city && user.city !== "—" && user.city !== "none").length,
    };
  }, [apiTotal, users]);

  const quickActions = React.useMemo<QuickAction[]>(
    () => [
      {
        title: t.openListTitle,
        description: t.openListDesc,
        href: "/system/users/list",
        icon: ListChecks,
      },
      {
        title: t.createTitle,
        description: t.createDesc,
        href: "/system/users/create",
        icon: Plus,
      },
      {
        title: t.reportsTitle,
        description: t.reportsDesc,
        href: "/system/users/reports",
        icon: FileBarChart2,
      },
      {
        title: t.dashboardTitle,
        description: t.dashboardDesc,
        href: "/system",
        icon: LayoutDashboard,
      },
    ],
    [t.createDesc, t.createTitle, t.dashboardDesc, t.dashboardTitle, t.openListDesc, t.openListTitle, t.reportsDesc, t.reportsTitle],
  );

  const hasFilters = Boolean(search || status !== "all" || sort !== "newest");
  const previewRows = filteredUsers.slice(0, 8);
  const apiStatusNote = apiUnavailable ? "api-unavailable" : "api-ready";

  function buildExportRows() {
    return filteredUsers.map((user) => [
      user.name,
      user.code,
      user.owner,
      user.activity,
      user.subscription,
      user.city,
      getStatusLabel(user.status, locale),
      formatDate(user.created_at),
    ]);
  }

  function buildTableHtml() {
    const headers = [
      t.user,
      t.code,
      t.owner,
      t.activity,
      t.subscription,
      t.city,
      t.status,
      t.createdAt,
    ];

    const rows = buildExportRows();

    return `
      <table border="1" cellspacing="0" cellpadding="6">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    `;
  }

  function exportExcel() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml()}
        </body>
      </html>
    `;

    const blob = new Blob([`\ufeff${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `primeyacc-system-users-overview-${apiStatusNote}-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function openPrintWindow(mode: "print" | "pdf") {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }

    if (mode === "pdf") {
      toast.info(t.pdfHint);
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.reportTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              font-size: 12px;
              text-align: ${dir === "rtl" ? "right" : "left"};
              vertical-align: top;
            }
            th { background: #f1f5f9; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml()}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) return <UsersOverviewSkeleton />;

  if (error && !apiUnavailable) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-3xl border-destructive/30 bg-card shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => void loadUsers({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-4xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.badge}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadUsers({ silent: true })}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.exportExcel}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("print")}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("pdf")}>
                  <FileText className="h-4 w-4" />
                  {t.pdf}
                </Button>
                <Button asChild className="rounded-xl">
                  <Link href="/system/users/create">
                    <Plus className="h-4 w-4" />
                    {t.addUser}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalUsers} value={stats.total} description={t.fromLiveApi} icon={Building2} />
          <KpiCard title={t.activeUsers} value={stats.active} description={t.fromLiveApi} icon={CheckCircle2} />
          <KpiCard title={t.inactiveUsers} value={stats.inactive} description={t.fromLiveApi} icon={ShieldCheck} />
          <KpiCard title={t.subscribedUsers} value={stats.subscribed} description={t.fromLiveApi} icon={Activity} />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.actionsTitle}</CardTitle>
            <CardDescription>{t.actionsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => (
                <QuickActionCard key={action.href} action={action} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.tableTitle}</CardTitle>
                <CardDescription className="mt-2">{t.tableDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <UsersRound className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(previewRows.length)} {t.of} {formatInteger(apiTotal || users.length)} {t.rows}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-10 rounded-xl ps-9"
                  />
                </div>

                <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "all" ? t.all : getStatusLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[160px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                    <SelectItem value="code">{t.codeSort}</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[980px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("h-11 w-[220px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.user}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[135px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.code}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.owner}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.activity}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.subscription}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.city}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[110px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.status}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.createdAt}
                      </TableHead>
                      <TableHead className="sticky left-0 z-10 h-11 w-[76px] bg-muted/40 px-3 text-center text-xs font-semibold text-muted-foreground">
                        {t.open}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {previewRows.length ? (
                      previewRows.map((user) => (
                        <TableRow key={user.id || user.code || user.name} className="h-[64px]">
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {user.name || t.unknown}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                #{user.id || user.code || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {user.code || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {user.owner || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {user.activity || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {user.subscription || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {user.city || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                            <StatusBadge value={user.status} locale={locale} />
                          </TableCell>
                          <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {formatDate(user.created_at)}
                            </span>
                          </TableCell>
                          <TableCell className="sticky left-0 z-10 h-[64px] bg-background px-3 text-center align-middle">
                            <Button asChild variant="outline" size="sm" className="h-8 rounded-lg bg-background px-3">
                              <Link href={user.id ? `/system/users/${user.id}` : "/system/users/list"}>
                                {t.open}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <EmptyState
                            title={hasFilters ? t.noResultsTitle : t.noDataTitle}
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
              </div>
            </div>

            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                {t.showing}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(previewRows.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(apiTotal || users.length)}
                </span>{" "}
                {t.rows}
              </p>
              <Button asChild variant="outline" className="w-fit rounded-xl bg-background">
                <Link href="/system/users/list">
                  <ListChecks className="h-4 w-4" />
                  {t.list}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}









