"use client";
/* ============================================================
   📂 primey_frontend/app/company/whatsapp/templates/page.tsx
   💬 PrimeyAcc — Company WhatsApp Templates
   ------------------------------------------------------------
   ✅ PrimeyAcc Approved Design
   ✅ Real company API only
   ✅ Shared UI components only
   ✅ Page-level Excel / Print
   ✅ Table-level Excel / Print
   ✅ Search, filters, sorting
   ✅ Shared confirmation dialog
   ✅ Enable green / Disable red
   ✅ Styled Excel and print reports
   ✅ Arabic / English locale
   ✅ English digits and dates
============================================================ */
import * as React from "react";
import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Inbox,
  Loader2,
  MoreVertical,
  Power,
  PowerOff,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Tag,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type StatusFilter =
  | "all"
  | "DRAFT"
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED";
type CategoryFilter =
  | "all"
  | "GENERAL"
  | "SALES"
  | "PURCHASES"
  | "TREASURY"
  | "POS"
  | "ACCOUNTING"
  | "INVENTORY"
  | "CUSTOMER_SERVICE";
type SortKey =
  | "newest"
  | "oldest"
  | "name"
  | "code"
  | "status"
  | "category";
type TemplateStatus =
  | "DRAFT"
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED";
type ExportScope = "page" | "table";
type TemplateRow = {
  id: string;
  companyName: string;
  companyCode: string;
  name: string;
  code: string;
  category: string;
  status: TemplateStatus;
  language: string;
  body: string;
  variables: string[];
  metadata: ApiRecord;
  updatedAt: string | null;
};
type ConfirmTarget = {
  row: TemplateRow;
  nextStatus: Exclude<TemplateStatus, "DRAFT">;
};
const ENDPOINT = "/api/company/whatsapp/templates/?limit=100";
const API_ROOT = "/api/company/whatsapp/";
const STATUS_OPTIONS: StatusFilter[] = [
  "all",
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
];
const CATEGORY_OPTIONS: CategoryFilter[] = [
  "all",
  "GENERAL",
  "SALES",
  "PURCHASES",
  "TREASURY",
  "POS",
  "ACCOUNTING",
  "INVENTORY",
  "CUSTOMER_SERVICE",
];
const translations = {
  ar: {
    badge: "التواصل والإشعارات",
    title: "قوالب واتساب",
    subtitle:
      "مراجعة قوالب واتساب المسجلة داخل الشركة ومتابعة حالتها وتصنيفها ومحتواها.",
    refresh: "تحديث",
    refreshSuccess: "تم تحديث قوالب واتساب.",
    excel: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    center: "مركز واتساب",
    inbox: "صندوق وارد واتساب",
    messages: "سجل الرسائل",
    templates: "قوالب واتساب",
    settings: "إعدادات واتساب",
    total: "إجمالي القوالب",
    totalDesc: "جميع قوالب واتساب المسجلة داخل مساحة الشركة.",
    active: "القوالب النشطة",
    activeDesc: "القوالب المفعلة والمتاحة للاستخدام.",
    draft: "قوالب المسودة",
    draftDesc: "القوالب التي ما زالت تحت الإعداد والمراجعة.",
    archived: "القوالب المؤرشفة",
    archivedDesc: "القوالب المحفوظة في الأرشيف وغير المستخدمة حاليًا.",
    tableTitle: "بيانات قوالب واتساب",
    tableDesc:
      "جدول القوالب مع البحث والتصفية والترتيب وإدارة حالة كل قالب.",
    search:
      "ابحث باسم القالب أو الكود أو الفئة أو اللغة أو نص القالب...",
    statusFilter: "الحالة",
    categoryFilter: "الفئة",
    sort: "الترتيب",
    all: "الكل",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    codeSort: "الكود",
    statusSort: "الحالة",
    categorySort: "الفئة",
    company: "الشركة",
    template: "القالب",
    category: "الفئة",
    status: "الحالة",
    language: "اللغة",
    body: "نص القالب",
    variables: "المتغيرات",
    updatedAt: "آخر تحديث",
    actions: "الإجراءات",
    activate: "تفعيل",
    deactivate: "تعطيل",
    archive: "أرشفة",
    confirmActivateTitle: "تأكيد تفعيل القالب",
    confirmActivateDesc:
      "سيتم تفعيل هذا القالب وإتاحته للاستخدام في العمليات الجديدة.",
    confirmActivateAction: "تأكيد التفعيل",
    confirmDeactivateTitle: "تأكيد تعطيل القالب",
    confirmDeactivateDesc:
      "سيتم تعطيل هذا القالب ومنع استخدامه في العمليات الجديدة مع الاحتفاظ ببياناته.",
    confirmDeactivateAction: "تأكيد التعطيل",
    confirmArchiveTitle: "تأكيد أرشفة القالب",
    confirmArchiveDesc:
      "سيتم نقل هذا القالب إلى الأرشيف وإيقاف استخدامه في العمليات الجديدة.",
    confirmArchiveAction: "تأكيد الأرشفة",
    DRAFT: "مسودة",
    ACTIVE: "نشط",
    INACTIVE: "غير نشط",
    ARCHIVED: "مؤرشف",
    GENERAL: "عام",
    SALES: "المبيعات",
    PURCHASES: "المشتريات",
    TREASURY: "الخزينة",
    POS: "نقاط البيع",
    ACCOUNTING: "المحاسبة",
    INVENTORY: "المخزون",
    CUSTOMER_SERVICE: "خدمة العملاء",
    showing: "عرض",
    of: "من",
    rows: "صف",
    filtered: "نتيجة مطابقة",
    noData: "لا توجد قوالب واتساب",
    noDataDesc:
      "ستظهر القوالب هنا عند تسجيل أول قالب داخل مساحة الشركة.",
    noResults: "لا توجد نتائج مطابقة",
    noResultsDesc:
      "غيّر البحث أو الفلاتر للوصول إلى القوالب المطلوبة.",
    errorTitle: "تعذر تحميل قوالب واتساب",
    errorDesc:
      "تعذر جلب القوالب حاليًا. تحقق من الاتصال ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات مطابقة للتصدير.",
    printEmpty: "لا توجد بيانات مطابقة للطباعة.",
    exportSuccess: "تم تجهيز ملف Excel.",
    printReady: "تم تجهيز صفحة الطباعة.",
    printBlocked:
      "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.",
    statusUpdated: "تم تحديث حالة القالب.",
    statusUpdateFailed: "تعذر تحديث حالة القالب.",
    reportTitle: "تقرير قوالب واتساب",
    tableReportTitle: "بيانات قوالب واتساب",
    generatedAt: "تاريخ الطباعة",
    appliedFilters: "الفلاتر المطبقة",
    noFilter: "بدون فلاتر إضافية",
    currentCompany: "الشركة الحالية",
    footer: "PrimeyAcc",
    unknown: "غير محدد",
    cancel: "إلغاء",
  },
  en: {
    badge: "Communication & Notifications",
    title: "WhatsApp Templates",
    subtitle:
      "Review company WhatsApp templates and monitor their status, categories, and content.",
    refresh: "Refresh",
    refreshSuccess: "WhatsApp templates refreshed.",
    excel: "Export Excel",
    print: "Print",
    reset: "Reset",
    center: "WhatsApp Center",
    inbox: "WhatsApp Inbox",
    messages: "Message Logs",
    templates: "WhatsApp Templates",
    settings: "WhatsApp Settings",
    total: "Total Templates",
    totalDesc: "All WhatsApp templates recorded in the company workspace.",
    active: "Active Templates",
    activeDesc: "Templates enabled and available for use.",
    draft: "Draft Templates",
    draftDesc: "Templates still under preparation and review.",
    archived: "Archived Templates",
    archivedDesc: "Templates stored in the archive and not currently used.",
    tableTitle: "WhatsApp Template Data",
    tableDesc:
      "Template records with search, filters, sorting, and status management.",
    search:
      "Search template name, code, category, language, or template body...",
    statusFilter: "Status",
    categoryFilter: "Category",
    sort: "Sort",
    all: "All",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    codeSort: "Code",
    statusSort: "Status",
    categorySort: "Category",
    company: "Company",
    template: "Template",
    category: "Category",
    status: "Status",
    language: "Language",
    body: "Template Body",
    variables: "Variables",
    updatedAt: "Updated At",
    actions: "Actions",
    activate: "Activate",
    deactivate: "Disable",
    archive: "Archive",
    confirmActivateTitle: "Confirm Template Activation",
    confirmActivateDesc:
      "This template will be activated and available for new operations.",
    confirmActivateAction: "Confirm Activation",
    confirmDeactivateTitle: "Confirm Template Disable",
    confirmDeactivateDesc:
      "This template will be disabled for new operations while its data remains available.",
    confirmDeactivateAction: "Confirm Disable",
    confirmArchiveTitle: "Confirm Template Archive",
    confirmArchiveDesc:
      "This template will be moved to the archive and disabled for new operations.",
    confirmArchiveAction: "Confirm Archive",
    DRAFT: "Draft",
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    ARCHIVED: "Archived",
    GENERAL: "General",
    SALES: "Sales",
    PURCHASES: "Purchases",
    TREASURY: "Treasury",
    POS: "POS",
    ACCOUNTING: "Accounting",
    INVENTORY: "Inventory",
    CUSTOMER_SERVICE: "Customer Service",
    showing: "Showing",
    of: "of",
    rows: "rows",
    filtered: "matching results",
    noData: "No WhatsApp Templates",
    noDataDesc:
      "Templates will appear here when the first company template is recorded.",
    noResults: "No Matching Results",
    noResultsDesc:
      "Change the search or filters to find the required templates.",
    errorTitle: "Unable to Load WhatsApp Templates",
    errorDesc:
      "Templates could not be loaded. Check the connection and try again.",
    tryAgain: "Try Again",
    exportEmpty: "There is no matching data to export.",
    printEmpty: "There is no matching data to print.",
    exportSuccess: "Excel file prepared.",
    printReady: "Print page prepared.",
    printBlocked:
      "The print window could not be opened. Allow pop-ups and try again.",
    statusUpdated: "Template status updated.",
    statusUpdateFailed: "Unable to update template status.",
    reportTitle: "WhatsApp Templates Report",
    tableReportTitle: "WhatsApp Template Data",
    generatedAt: "Generated At",
    appliedFilters: "Applied Filters",
    noFilter: "No additional filters",
    currentCompany: "Current Company",
    footer: "PrimeyAcc",
    unknown: "Unknown",
    cancel: "Cancel",
  },
} as const;
function asRecord(value: unknown): ApiRecord {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as ApiRecord)
    : {};
}
function toStringValue(
  value: unknown,
  fallback = "",
): string {
  if (typeof value === "string") {
    return value.trim() || fallback;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value).trim() || fallback;
}
function apiBase() {
  const value = (
    process.env.NEXT_PUBLIC_API_URL || ""
  ).replace(/\/+$/, "");
  return value.endsWith("/api")
    ? value.slice(0, -4)
    : value;
}
function apiUrl(path: string) {
  return `${apiBase()}${path}`;
}
function getInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "ar";
  }
  return window.localStorage.getItem(
    "primey-locale",
  ) === "en"
    ? "en"
    : "ar";
}
function getCookie(name: string) {
  if (typeof document === "undefined") {
    return "";
  }
  const escapedName = name.replace(
    /[.$?*|{}()[\]\\/+^]/g,
    "\\$&",
  );
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapedName}=([^;]*)`),
  );
  return match
    ? decodeURIComponent(match[1] || "")
    : "";
}
async function ensureCsrfToken() {
  let token = getCookie("csrftoken");
  if (token) {
    return token;
  }
  await fetch(apiUrl("/api/auth/csrf/"), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  }).catch(() => undefined);
  token = getCookie("csrftoken");
  return token;
}
async function fetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(init?.headers || {}),
    },
  });
  const contentType =
    response.headers.get("content-type") || "";
  const rawText = await response.text();
  let payload: unknown = {};
  if (
    rawText &&
    contentType.includes("application/json")
  ) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = {};
    }
  }
  if (!response.ok) {
    const record = asRecord(payload);
    throw new Error(
      toStringValue(record.message) ||
        toStringValue(record.detail) ||
        toStringValue(record.error) ||
        `HTTP ${response.status}`,
    );
  }
  return payload as T;
}
async function postJson<T>(
  path: string,
  body: ApiRecord,
): Promise<T> {
  const csrfToken = await ensureCsrfToken();
  return fetchJson<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken
        ? { "X-CSRFToken": csrfToken }
        : {}),
    },
  });
}
function extractResults(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  const record = asRecord(payload);
  if (Array.isArray(record.results)) {
    return record.results;
  }
  if (Array.isArray(record.items)) {
    return record.items;
  }
  if (Array.isArray(record.data)) {
    return record.data;
  }
  if (Array.isArray(record.rows)) {
    return record.rows;
  }
  const dataRecord = asRecord(record.data);
  if (Array.isArray(dataRecord.results)) {
    return dataRecord.results;
  }
  if (Array.isArray(dataRecord.items)) {
    return dataRecord.items;
  }
  return [];
}
function normalizeStatus(
  value: unknown,
): TemplateStatus {
  const status = toStringValue(
    value,
    "DRAFT",
  ).toUpperCase();
  if (status === "ACTIVE") {
    return "ACTIVE";
  }
  if (status === "INACTIVE") {
    return "INACTIVE";
  }
  if (status === "ARCHIVED") {
    return "ARCHIVED";
  }
  return "DRAFT";
}
function normalizeTemplate(
  value: unknown,
): TemplateRow {
  const record = asRecord(value);
  const company = asRecord(record.company);
  const variables = record.variables;
  return {
    id: toStringValue(
      record.id ||
        record.uuid ||
        record.pk ||
        record.code,
    ),
    companyName:
      toStringValue(
        company.name ||
          company.company_name ||
          company.title,
      ) ||
      toStringValue(
        record.company_name ||
          record.companyName,
      ),
    companyCode:
      toStringValue(
        company.company_code ||
          company.companyCode ||
          company.code,
      ) ||
      toStringValue(
        record.company_code ||
          record.companyCode,
      ),
    name: toStringValue(
      record.name ||
        record.template_name ||
        record.title,
    ),
    code: toStringValue(
      record.code ||
        record.template_code,
    ),
    category: toStringValue(
      record.category,
      "GENERAL",
    ).toUpperCase(),
    status: normalizeStatus(record.status),
    language: toStringValue(
      record.language ||
        record.language_code ||
        record.default_language_code,
      "ar",
    ),
    body: toStringValue(
      record.body ||
        record.content ||
        record.message_body ||
        record.text,
    ),
    variables: Array.isArray(variables)
      ? variables
          .map((item) => toStringValue(item))
          .filter(Boolean)
      : [],
    metadata: asRecord(record.metadata),
    updatedAt:
      toStringValue(
        record.updated_at ||
          record.updatedAt ||
          record.modified_at ||
          record.created_at,
      ) || null,
  };
}
function localizedTemplateField(
  item: TemplateRow,
  locale: Locale,
  field: "name" | "body",
) {
  const metadata = asRecord(item.metadata);
  const i18n = asRecord(metadata.i18n);
  const current = asRecord(i18n[locale]);
  const arabic = asRecord(i18n.ar);
  const english = asRecord(i18n.en);
  const localized =
    toStringValue(current[field]) ||
    toStringValue(arabic[field]) ||
    toStringValue(english[field]);
  if (localized) {
    return localized;
  }
  return field === "name"
    ? item.name
    : item.body;
}
function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value || 0);
}
function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const year = parsed.getFullYear();
  const month = String(
    parsed.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    parsed.getDate(),
  ).padStart(2, "0");
  const hours = String(
    parsed.getHours(),
  ).padStart(2, "0");
  const minutes = String(
    parsed.getMinutes(),
  ).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
function formatReportDateTime() {
  return formatDateTime(new Date().toISOString());
}
function dateTimestamp(
  value: string | null,
) {
  if (!value) {
    return 0;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed)
    ? parsed
    : 0;
}
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function labelFor(
  value: string,
  locale: Locale,
) {
  const dictionary = translations[
    locale
  ] as Record<string, string>;
  return (
    dictionary[value.toUpperCase()] ||
    value ||
    "—"
  );
}
function statusBadgeClass(
  value: TemplateStatus,
) {
  if (value === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (value === "INACTIVE") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (value === "ARCHIVED") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}
function categoryBadgeClass(
  value: string,
) {
  if (value === "SALES") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (value === "PURCHASES") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (value === "TREASURY") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (value === "ACCOUNTING") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }
  return "border-border bg-muted/30 text-muted-foreground";
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
  icon: React.ComponentType<{
    className?: string;
  }>;
}) {
  return (
    <Card className="group overflow-hidden rounded-lg border bg-card shadow-none transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">
            {title}
          </CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {formatInteger(value)}
          </CardTitle>
        </div>
        <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
function TemplatesSkeleton({
  dir,
}: {
  dir: "rtl" | "ltr";
}) {
  return (
    <main
      dir={dir}
      className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-full max-w-3xl" />
            <Skeleton className="h-7 w-96" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map(
            (_, index) => (
              <Card
                key={index}
                className="rounded-lg border bg-card shadow-none"
              >
                <CardHeader>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ),
          )}
        </div>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader>
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-[420px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
export default function CompanyWhatsAppTemplatesPage() {
  const [locale, setLocale] =
    React.useState<Locale>("ar");
  const [templates, setTemplates] =
    React.useState<TemplateRow[]>([]);
  const [loading, setLoading] =
    React.useState(true);
  const [refreshing, setRefreshing] =
    React.useState(false);
  const [error, setError] =
    React.useState("");
  const [search, setSearch] =
    React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] =
    React.useState<CategoryFilter>("all");
  const [sortKey, setSortKey] =
    React.useState<SortKey>("newest");
  const [savingId, setSavingId] =
    React.useState("");
  const [confirmTarget, setConfirmTarget] =
    React.useState<ConfirmTarget | null>(null);
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  React.useEffect(() => {
    const applyLocale = () => {
      const nextLocale = getInitialLocale();
      setLocale(nextLocale);
      document.documentElement.lang =
        nextLocale;
      document.documentElement.dir =
        nextLocale === "ar"
          ? "rtl"
          : "ltr";
      document.body.dir =
        nextLocale === "ar"
          ? "rtl"
          : "ltr";
    };
    applyLocale();
    window.addEventListener(
      "storage",
      applyLocale,
    );
    window.addEventListener(
      "primey-locale-changed",
      applyLocale,
    );
    return () => {
      window.removeEventListener(
        "storage",
        applyLocale,
      );
      window.removeEventListener(
        "primey-locale-changed",
        applyLocale,
      );
    };
  }, []);
  const loadTemplates = React.useCallback(
    async ({
      silent = false,
    }: {
      silent?: boolean;
    } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        setRefreshing(true);
        setError("");
        const payload =
          await fetchJson<unknown>(ENDPOINT);
        const nextRows =
          extractResults(payload).map(
            normalizeTemplate,
          );
        setTemplates(nextRows);
        if (silent) {
          toast.success(t.refreshSuccess);
        }
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : t.errorDesc;
        setError(message);
        if (silent) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.errorDesc, t.refreshSuccess],
  );
  React.useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);
  const filteredTemplates =
    React.useMemo(() => {
      const query =
        search.trim().toLowerCase();
      const filtered = templates.filter(
        (item) => {
          const name =
            localizedTemplateField(
              item,
              locale,
              "name",
            );
          const body =
            localizedTemplateField(
              item,
              locale,
              "body",
            );
          const haystack = [
            name,
            item.name,
            item.code,
            item.category,
            item.status,
            item.language,
            body,
            item.body,
            item.companyName,
            item.companyCode,
            ...item.variables,
          ]
            .join(" ")
            .toLowerCase();
          if (
            query &&
            !haystack.includes(query)
          ) {
            return false;
          }
          if (
            statusFilter !== "all" &&
            item.status !== statusFilter
          ) {
            return false;
          }
          if (
            categoryFilter !== "all" &&
            item.category !== categoryFilter
          ) {
            return false;
          }
          return true;
        },
      );
      return [...filtered].sort(
        (first, second) => {
          if (sortKey === "oldest") {
            return (
              dateTimestamp(first.updatedAt) -
              dateTimestamp(second.updatedAt)
            );
          }
          if (sortKey === "name") {
            return localizedTemplateField(
              first,
              locale,
              "name",
            ).localeCompare(
              localizedTemplateField(
                second,
                locale,
                "name",
              ),
            );
          }
          if (sortKey === "code") {
            return first.code.localeCompare(
              second.code,
              undefined,
              { numeric: true },
            );
          }
          if (sortKey === "status") {
            return first.status.localeCompare(
              second.status,
            );
          }
          if (sortKey === "category") {
            return first.category.localeCompare(
              second.category,
            );
          }
          return (
            dateTimestamp(second.updatedAt) -
            dateTimestamp(first.updatedAt)
          );
        },
      );
    }, [
      categoryFilter,
      locale,
      search,
      sortKey,
      statusFilter,
      templates,
    ]);
  const stats = React.useMemo(
    () => ({
      total: templates.length,
      active: templates.filter(
        (item) =>
          item.status === "ACTIVE",
      ).length,
      draft: templates.filter(
        (item) =>
          item.status === "DRAFT",
      ).length,
      archived: templates.filter(
        (item) =>
          item.status === "ARCHIVED",
      ).length,
    }),
    [templates],
  );
  const hasFilters = Boolean(
    search ||
      statusFilter !== "all" ||
      categoryFilter !== "all" ||
      sortKey !== "newest",
  );
  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setSortKey("newest");
  }
  function getAppliedFiltersText() {
    const filters = [
      search.trim()
        ? `${t.search}: ${search.trim()}`
        : "",
      statusFilter !== "all"
        ? `${t.statusFilter}: ${labelFor(
            statusFilter,
            locale,
          )}`
        : "",
      categoryFilter !== "all"
        ? `${t.categoryFilter}: ${labelFor(
            categoryFilter,
            locale,
          )}`
        : "",
      sortKey !== "newest"
        ? `${t.sort}: ${
            sortKey === "oldest"
              ? t.oldest
              : sortKey === "name"
                ? t.nameSort
                : sortKey === "code"
                  ? t.codeSort
                  : sortKey === "status"
                    ? t.statusSort
                    : t.categorySort
          }`
        : "",
    ].filter(Boolean);
    return filters.length
      ? filters.join(" | ")
      : t.noFilter;
  }
  function buildReportDocument(
    mode: "excel" | "print",
    scope: ExportScope,
  ) {
    const includeSummary = scope === "page";
    const reportTitle = includeSummary
      ? t.reportTitle
      : t.tableReportTitle;
    const reportSubtitle = includeSummary
      ? t.subtitle
      : t.tableDesc;
    const generatedAt =
      formatReportDateTime();
    const summaryMarkup = includeSummary
      ? `
        <table class="summary-table">
          <tbody>
            <tr>
              <td>
                <span class="summary-label">
                  ${escapeHtml(t.total)}
                </span>
                <strong>
                  ${escapeHtml(
                    formatInteger(stats.total),
                  )}
                </strong>
              </td>
              <td>
                <span class="summary-label">
                  ${escapeHtml(t.active)}
                </span>
                <strong>
                  ${escapeHtml(
                    formatInteger(stats.active),
                  )}
                </strong>
              </td>
              <td>
                <span class="summary-label">
                  ${escapeHtml(t.draft)}
                </span>
                <strong>
                  ${escapeHtml(
                    formatInteger(stats.draft),
                  )}
                </strong>
              </td>
              <td>
                <span class="summary-label">
                  ${escapeHtml(t.archived)}
                </span>
                <strong>
                  ${escapeHtml(
                    formatInteger(stats.archived),
                  )}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      `
      : "";
    const bodyRows = filteredTemplates
      .map((item) => {
        const name =
          localizedTemplateField(
            item,
            locale,
            "name",
          );
        const body =
          localizedTemplateField(
            item,
            locale,
            "body",
          );
        return `
          <tr>
            <td class="text">
              <strong>
                ${escapeHtml(
                  item.companyName ||
                    t.currentCompany,
                )}
              </strong>
              ${
                item.companyCode
                  ? `<div class="muted">${escapeHtml(
                      item.companyCode,
                    )}</div>`
                  : ""
              }
            </td>
            <td class="text">
              <strong>
                ${escapeHtml(name || "—")}
              </strong>
              <div class="muted">
                ${escapeHtml(
                  item.code || "—",
                )}
              </div>
            </td>
            <td>
              ${escapeHtml(
                labelFor(
                  item.category,
                  locale,
                ),
              )}
            </td>
            <td>
              ${escapeHtml(
                labelFor(
                  item.status,
                  locale,
                ),
              )}
            </td>
            <td class="text">
              ${escapeHtml(
                item.language || "—",
              )}
            </td>
            <td>
              ${escapeHtml(body || "—")}
            </td>
            <td class="text">
              ${escapeHtml(
                item.variables.length
                  ? item.variables.join(", ")
                  : "—",
              )}
            </td>
            <td class="text">
              ${escapeHtml(
                formatDateTime(
                  item.updatedAt,
                ),
              )}
            </td>
          </tr>
        `;
      })
      .join("");
    const officeXml =
      mode === "excel"
        ? `
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>
                    ${escapeHtml(
                      reportTitle.slice(0, 31),
                    )}
                  </x:Name>
                  <x:WorksheetOptions>
                    ${
                      locale === "ar"
                        ? "<x:DisplayRightToLeft/>"
                        : ""
                    }
                    <x:FreezePanes/>
                    <x:FrozenNoSplit/>
                    <x:SplitHorizontal>1</x:SplitHorizontal>
                    <x:TopRowBottomPane>1</x:TopRowBottomPane>
                    <x:FitToPage/>
                    <x:Selected/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
        `
        : "";
    return `
      <!doctype html>
      <html
        lang="${locale}"
        dir="${dir}"
        xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40"
      >
        <head>
          <meta charset="utf-8" />
          <title>
            ${escapeHtml(reportTitle)}
          </title>
          ${officeXml}
          <style>
            * {
              box-sizing: border-box;
            }
            html,
            body {
              width: 100%;
              margin: 0;
              background: #ffffff;
            }
            body {
              padding: ${
                mode === "print"
                  ? "0"
                  : "8px"
              };
              color: #111111;
              font-family: Tahoma, Arial, sans-serif;
              font-size: 11px;
              direction: ${dir};
            }
            .report-sheet {
              width: ${
                mode === "print"
                  ? "100%"
                  : "1500px"
              };
              margin: 0 auto;
            }
            .report-header {
              margin-bottom: 10px;
            }
            .company-name {
              margin: 0 0 3px;
              font-size: 11px;
              font-weight: 700;
            }
            h1 {
              margin: 0;
              font-size: ${
                mode === "print"
                  ? "21px"
                  : "23px"
              };
              line-height: 1.3;
            }
            .subtitle {
              margin: 4px 0 0;
              color: #4b5563;
              font-size: 10px;
              line-height: 1.5;
            }
            .meta {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              margin-top: 6px;
              color: #4b5563;
              font-size: 9px;
            }
            .filters {
              margin: 5px 0 0;
              color: #374151;
              font-size: 9px;
            }
            .summary-table {
              width: 100%;
              margin: 0 0 10px;
              border-collapse: collapse;
              table-layout: fixed;
            }
            .summary-table td {
              padding: 7px;
              border: 1px solid #000000;
              vertical-align: middle;
            }
            .summary-label {
              display: block;
              margin-bottom: 3px;
              color: #4b5563;
              font-size: 9px;
            }
            .summary-table strong {
              display: block;
              direction: ltr;
              font-size: 14px;
              font-variant-numeric: tabular-nums;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            .data-table th,
            .data-table td {
              border: 1px solid #000000;
              padding: ${
                mode === "print"
                  ? "4px"
                  : "6px"
              };
              text-align: start;
              vertical-align: middle;
              line-height: 1.35;
              overflow-wrap: anywhere;
            }
            .data-table th {
              background: #e5e7eb;
              font-size: ${
                mode === "print"
                  ? "8px"
                  : "10px"
              };
              font-weight: 700;
            }
            .data-table td {
              font-size: ${
                mode === "print"
                  ? "8px"
                  : "10px"
              };
            }
            .text {
              mso-number-format: '\\@';
            }
            .muted {
              margin-top: 2px;
              color: #6b7280;
              font-size: 8px;
            }
            .report-footer {
              display: flex;
              justify-content: space-between;
              margin-top: 7px;
              color: #6b7280;
              font-size: 8px;
            }
            @page {
              size: A4 landscape;
              margin: 6mm;
            }
            @media print {
              html,
              body,
              .report-sheet {
                width: 100% !important;
                max-width: none !important;
              }
              body {
                padding: 0 !important;
              }
              thead {
                display: table-header-group;
              }
              tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <main class="report-sheet">
            <header class="report-header">
              <p class="company-name">
                ${escapeHtml(
                  filteredTemplates[0]
                    ?.companyName ||
                    t.currentCompany,
                )}
              </p>
              <h1>
                ${escapeHtml(reportTitle)}
              </h1>
              <p class="subtitle">
                ${escapeHtml(reportSubtitle)}
              </p>
              <div class="meta">
                <span>
                  ${escapeHtml(
                    t.generatedAt,
                  )}:
                  ${escapeHtml(generatedAt)}
                </span>
                <span>
                  ${escapeHtml(t.showing)}
                  ${escapeHtml(
                    formatInteger(
                      filteredTemplates.length,
                    ),
                  )}
                  ${escapeHtml(t.of)}
                  ${escapeHtml(
                    formatInteger(
                      templates.length,
                    ),
                  )}
                </span>
              </div>
              <p class="filters">
                ${escapeHtml(
                  t.appliedFilters,
                )}:
                ${escapeHtml(
                  getAppliedFiltersText(),
                )}
              </p>
            </header>
            ${summaryMarkup}
            <table class="data-table">
              <colgroup>
                <col style="width: 14%" />
                <col style="width: 16%" />
                <col style="width: 10%" />
                <col style="width: 8%" />
                <col style="width: 7%" />
                <col style="width: 25%" />
                <col style="width: 10%" />
                <col style="width: 10%" />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    ${escapeHtml(t.company)}
                  </th>
                  <th>
                    ${escapeHtml(t.template)}
                  </th>
                  <th>
                    ${escapeHtml(t.category)}
                  </th>
                  <th>
                    ${escapeHtml(t.status)}
                  </th>
                  <th>
                    ${escapeHtml(t.language)}
                  </th>
                  <th>
                    ${escapeHtml(t.body)}
                  </th>
                  <th>
                    ${escapeHtml(t.variables)}
                  </th>
                  <th>
                    ${escapeHtml(t.updatedAt)}
                  </th>
                </tr>
              </thead>
              <tbody>
                ${bodyRows}
              </tbody>
            </table>
            <footer class="report-footer">
              <span>
                ${escapeHtml(t.footer)}
              </span>
              <span>
                ${escapeHtml(generatedAt)}
              </span>
            </footer>
          </main>
          ${
            mode === "print"
              ? `
                <script>
                  window.onload = function () {
                    window.focus();
                    window.print();
                  };
                  window.onafterprint = function () {
                    window.close();
                  };
                <\/script>
              `
              : ""
          }
        </body>
      </html>
    `;
  }
  function exportExcel(
    scope: ExportScope,
  ) {
    if (!filteredTemplates.length) {
      toast.warning(t.exportEmpty);
      return;
    }
    const html = buildReportDocument(
      "excel",
      scope,
    );
    const blob = new Blob(
      ["\uFEFF", html],
      {
        type: "application/vnd.ms-excel;charset=utf-8;",
      },
    );
    const url =
      URL.createObjectURL(blob);
    const anchor =
      document.createElement("a");
    const suffix =
      scope === "page"
        ? "report"
        : "table";
    anchor.href = url;
    anchor.download =
      `whatsapp-templates-${suffix}-${new Date()
        .toISOString()
        .slice(0, 10)}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(t.exportSuccess);
  }
  function printReport(
    scope: ExportScope,
  ) {
    if (!filteredTemplates.length) {
      toast.warning(t.printEmpty);
      return;
    }
    const popup = window.open(
      "",
      "_blank",
      "width=1400,height=900",
    );
    if (!popup) {
      toast.error(t.printBlocked);
      return;
    }
    popup.opener = null;
    popup.document.open();
    popup.document.write(
      buildReportDocument(
        "print",
        scope,
      ),
    );
    popup.document.close();
    toast.success(t.printReady);
  }
  async function updateTemplateStatus() {
    if (!confirmTarget) {
      return;
    }
    const { row, nextStatus } =
      confirmTarget;
    try {
      setSavingId(row.id);
      await postJson<unknown>(
        `${API_ROOT}templates/${encodeURIComponent(
          row.id,
        )}/status/`,
        {
          status: nextStatus,
        },
      );
      setTemplates((current) =>
        current.map((item) =>
          item.id === row.id
            ? {
                ...item,
                status: nextStatus,
              }
            : item,
        ),
      );
      setConfirmTarget(null);
      toast.success(t.statusUpdated);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : t.statusUpdateFailed;
      toast.error(
        message ||
          t.statusUpdateFailed,
      );
    } finally {
      setSavingId("");
    }
  }
  function confirmationContent() {
    const nextStatus =
      confirmTarget?.nextStatus;
    if (nextStatus === "ACTIVE") {
      return {
        title: t.confirmActivateTitle,
        description:
          t.confirmActivateDesc,
        action:
          t.confirmActivateAction,
        className:
          "bg-emerald-600 text-white hover:bg-emerald-700",
      };
    }
    if (nextStatus === "INACTIVE") {
      return {
        title:
          t.confirmDeactivateTitle,
        description:
          t.confirmDeactivateDesc,
        action:
          t.confirmDeactivateAction,
        className:
          "bg-red-600 text-white hover:bg-red-700",
      };
    }
    return {
      title: t.confirmArchiveTitle,
      description:
        t.confirmArchiveDesc,
      action:
        t.confirmArchiveAction,
      className:
        "bg-red-600 text-white hover:bg-red-700",
    };
  }
  if (loading) {
    return (
      <TemplatesSkeleton dir={dir} />
    );
  }
  if (error) {
    return (
      <main
        dir={dir}
        className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
      >
        <Card className="mx-auto max-w-[900px] rounded-lg border-rose-200 bg-card shadow-none">
          <CardHeader className="text-center">
            <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <TriangleAlert className="h-7 w-7" />
            </span>
            <CardTitle>
              {t.errorTitle}
            </CardTitle>
            <CardDescription>
              {t.errorDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadTemplates({
                  silent: true,
                })
              }
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  const confirmContent =
    confirmationContent();
  return (
    <>
      <main
        dir={dir}
        className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-[1500px] space-y-5">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1 text-start">
              <Badge
                variant="outline"
                className="mb-2 w-fit rounded-full bg-background font-normal"
              >
                {t.badge}
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
                {t.title}
              </h1>
              <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
                {t.subtitle}
              </p>
              <nav
                aria-label={t.badge}
                className="flex flex-wrap items-center gap-5 pt-2"
              >
                <Link
                  href="/company/whatsapp"
                  className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t.center}
                </Link>
                <Link
                  href="/company/whatsapp/inbox"
                  className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t.inbox}
                </Link>
                <Link
                  href="/company/whatsapp/messages"
                  className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t.messages}
                </Link>
                <Link
                  href="/company/whatsapp/templates"
                  aria-current="page"
                  className="border-b-2 border-foreground pb-1 text-sm font-semibold text-foreground"
                >
                  {t.templates}
                </Link>
                <Link
                  href="/company/whatsapp/settings"
                  className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t.settings}
                </Link>
              </nav>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void loadTemplates({
                    silent: true,
                  })
                }
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {t.refresh}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  exportExcel("page")
                }
              >
                <FileSpreadsheet className="h-4 w-4" />
                {t.excel}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  printReport("page")
                }
              >
                <Printer className="h-4 w-4" />
                {t.print}
              </Button>
            </div>
          </header>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={t.total}
              value={stats.total}
              description={t.totalDesc}
              icon={FileText}
            />
            <KpiCard
              title={t.active}
              value={stats.active}
              description={t.activeDesc}
              icon={CheckCircle2}
            />
            <KpiCard
              title={t.draft}
              value={stats.draft}
              description={t.draftDesc}
              icon={Tag}
            />
            <KpiCard
              title={t.archived}
              value={stats.archived}
              description={t.archivedDesc}
              icon={Archive}
            />
          </section>
          <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 pt-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">
                      {t.tableTitle}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="rounded-full font-normal"
                    >
                      <Inbox className="h-3.5 w-3.5" />
                      {formatInteger(
                        filteredTemplates.length,
                      )}
                    </Badge>
                    {hasFilters ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-blue-200 bg-blue-50 font-normal text-blue-700"
                      >
                        {formatInteger(
                          filteredTemplates.length,
                        )}{" "}
                        {t.filtered}
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription className="mt-2">
                    {t.tableDesc}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      exportExcel("table")
                    }
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    {t.excel}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      printReport("table")
                    }
                  >
                    <Printer className="h-4 w-4" />
                    {t.print}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 sm:px-6">
              <div className="rounded-lg border bg-muted/20 p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
                    <Input
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
                      placeholder={t.search}
                      className="h-9 w-full bg-background shadow-none ltr:pl-9 rtl:pr-9"
                    />
                  </div>
                  <div className="w-full shrink-0 lg:w-[160px]">
                    <Select
                      value={statusFilter}
                      onValueChange={(value) =>
                        setStatusFilter(
                          value as StatusFilter,
                        )
                      }
                    >
                      <SelectTrigger className="h-9 w-full bg-background shadow-none">
                        <SelectValue
                          placeholder={t.statusFilter}
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                        {STATUS_OPTIONS.map(
                          (status) => (
                            <SelectItem
                              key={status}
                              value={status}
                            >
                              {status === "all"
                                ? t.all
                                : labelFor(
                                    status,
                                    locale,
                                  )}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full shrink-0 lg:w-[180px]">
                    <Select
                      value={categoryFilter}
                      onValueChange={(value) =>
                        setCategoryFilter(
                          value as CategoryFilter,
                        )
                      }
                    >
                      <SelectTrigger className="h-9 w-full bg-background shadow-none">
                        <SelectValue
                          placeholder={t.categoryFilter}
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                        {CATEGORY_OPTIONS.map(
                          (category) => (
                            <SelectItem
                              key={category}
                              value={category}
                            >
                              {category === "all"
                                ? t.all
                                : labelFor(
                                    category,
                                    locale,
                                  )}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full shrink-0 lg:w-[160px]">
                    <Select
                      value={sortKey}
                      onValueChange={(value) =>
                        setSortKey(
                          value as SortKey,
                        )
                      }
                    >
                      <SelectTrigger className="h-9 w-full bg-background shadow-none">
                        <SelectValue
                          placeholder={t.sort}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">
                          {t.newest}
                        </SelectItem>
                        <SelectItem value="oldest">
                          {t.oldest}
                        </SelectItem>
                        <SelectItem value="name">
                          {t.nameSort}
                        </SelectItem>
                        <SelectItem value="code">
                          {t.codeSort}
                        </SelectItem>
                        <SelectItem value="status">
                          {t.statusSort}
                        </SelectItem>
                        <SelectItem value="category">
                          {t.categorySort}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 w-full shrink-0 bg-background shadow-none lg:w-auto"
                    onClick={resetFilters}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t.reset}
                  </Button>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border bg-background">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1250px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        <TableHead className="sticky start-0 z-20 h-11 w-[210px] bg-muted/40 px-4 text-start text-xs font-semibold text-muted-foreground">
                          {t.company}
                        </TableHead>
                        <TableHead className="h-11 w-[230px] px-4 text-start text-xs font-semibold text-muted-foreground">
                          {t.template}
                        </TableHead>
                        <TableHead className="h-11 w-[145px] px-4 text-start text-xs font-semibold text-muted-foreground">
                          {t.category}
                        </TableHead>
                        <TableHead className="h-11 w-[125px] px-4 text-start text-xs font-semibold text-muted-foreground">
                          {t.status}
                        </TableHead>
                        <TableHead className="h-11 w-[100px] px-4 text-start text-xs font-semibold text-muted-foreground">
                          {t.language}
                        </TableHead>
                        <TableHead className="h-11 w-[310px] px-4 text-start text-xs font-semibold text-muted-foreground">
                          {t.body}
                        </TableHead>
                        <TableHead className="h-11 w-[150px] px-4 text-start text-xs font-semibold text-muted-foreground">
                          {t.updatedAt}
                        </TableHead>
                        <TableHead className="sticky end-0 z-20 h-11 w-[90px] bg-muted/40 px-4 text-center text-xs font-semibold text-muted-foreground">
                          {t.actions}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTemplates.length ? (
                        filteredTemplates.map(
                          (item) => {
                            const localizedName =
                              localizedTemplateField(
                                item,
                                locale,
                                "name",
                              );
                            const localizedBody =
                              localizedTemplateField(
                                item,
                                locale,
                                "body",
                              );
                            const isSaving =
                              savingId === item.id;
                            return (
                              <TableRow
                                key={
                                  item.id ||
                                  item.code
                                }
                                className="h-[64px] hover:bg-muted/35"
                              >
                                <TableCell className="sticky start-0 z-10 h-[64px] overflow-hidden border-e bg-background px-4 align-middle">
                                  <div className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-foreground">
                                      {item.companyName ||
                                        t.currentCompany}
                                    </span>
                                    {item.companyCode ? (
                                      <span
                                        dir="ltr"
                                        className="mt-1 block truncate text-xs tabular-nums text-muted-foreground"
                                      >
                                        {
                                          item.companyCode
                                        }
                                      </span>
                                    ) : null}
                                  </div>
                                </TableCell>
                                <TableCell className="h-[64px] overflow-hidden px-4 align-middle">
                                  <div className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-foreground">
                                      {localizedName ||
                                        t.unknown}
                                    </span>
                                    <span
                                      dir="ltr"
                                      className="mt-1 block truncate text-xs tabular-nums text-muted-foreground"
                                    >
                                      {item.code ||
                                        "—"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="h-[64px] px-4 align-middle">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "whitespace-nowrap rounded-full font-normal",
                                      categoryBadgeClass(
                                        item.category,
                                      ),
                                    )}
                                  >
                                    {labelFor(
                                      item.category,
                                      locale,
                                    )}
                                  </Badge>
                                </TableCell>
                                <TableCell className="h-[64px] px-4 align-middle">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "whitespace-nowrap rounded-full font-normal",
                                      statusBadgeClass(
                                        item.status,
                                      ),
                                    )}
                                  >
                                    {labelFor(
                                      item.status,
                                      locale,
                                    )}
                                  </Badge>
                                </TableCell>
                                <TableCell className="h-[64px] px-4 align-middle">
                                  <span
                                    dir="ltr"
                                    className="text-sm tabular-nums text-muted-foreground"
                                  >
                                    {item.language ||
                                      "—"}
                                  </span>
                                </TableCell>
                                <TableCell className="h-[64px] overflow-hidden px-4 align-middle">
                                  <div className="min-w-0">
                                    <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
                                      {localizedBody ||
                                        "—"}
                                    </p>
                                    {item.variables
                                      .length ? (
                                      <p className="mt-1 truncate text-xs text-muted-foreground">
                                        {item.variables.join(
                                          ", ",
                                        )}
                                      </p>
                                    ) : null}
                                  </div>
                                </TableCell>
                                <TableCell className="h-[64px] px-4 align-middle">
                                  <span
                                    dir="ltr"
                                    className="whitespace-nowrap text-sm tabular-nums text-muted-foreground"
                                  >
                                    {formatDateTime(
                                      item.updatedAt,
                                    )}
                                  </span>
                                </TableCell>
                                <TableCell className="sticky end-0 z-10 h-[64px] border-s bg-background px-4 text-center align-middle">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      asChild
                                    >
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={
                                          t.actions
                                        }
                                        title={
                                          t.actions
                                        }
                                        disabled={
                                          isSaving
                                        }
                                      >
                                        {isSaving ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <MoreVertical className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align={
                                        locale ===
                                        "ar"
                                          ? "start"
                                          : "end"
                                      }
                                      className="w-44"
                                    >
                                      <DropdownMenuItem
                                        disabled={
                                          isSaving ||
                                          item.status ===
                                            "ACTIVE"
                                        }
                                        onClick={() =>
                                          setConfirmTarget(
                                            {
                                              row: item,
                                              nextStatus:
                                                "ACTIVE",
                                            },
                                          )
                                        }
                                        className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:focus:bg-emerald-950/40"
                                      >
                                        <Power className="h-4 w-4 shrink-0" />
                                        {t.activate}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={
                                          isSaving ||
                                          item.status ===
                                            "INACTIVE"
                                        }
                                        onClick={() =>
                                          setConfirmTarget(
                                            {
                                              row: item,
                                              nextStatus:
                                                "INACTIVE",
                                            },
                                          )
                                        }
                                        className="flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"
                                      >
                                        <PowerOff className="h-4 w-4 shrink-0" />
                                        {t.deactivate}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        disabled={
                                          isSaving ||
                                          item.status ===
                                            "ARCHIVED"
                                        }
                                        onClick={() =>
                                          setConfirmTarget(
                                            {
                                              row: item,
                                              nextStatus:
                                                "ARCHIVED",
                                            },
                                          )
                                        }
                                        className="flex items-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"
                                      >
                                        <Archive className="h-4 w-4 shrink-0" />
                                        {t.archive}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          },
                        )
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8}>
                            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
                              <span className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted/30 text-muted-foreground">
                                <Inbox className="h-7 w-7" />
                              </span>
                              <h3 className="mt-4 text-base font-semibold">
                                {hasFilters
                                  ? t.noResults
                                  : t.noData}
                              </h3>
                              <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                                {hasFilters
                                  ? t.noResultsDesc
                                  : t.noDataDesc}
                              </p>
                              {hasFilters ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="mt-4"
                                  onClick={
                                    resetFilters
                                  }
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  {t.reset}
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {t.showing}{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {formatInteger(
                      filteredTemplates.length,
                    )}
                  </span>{" "}
                  {t.of}{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {formatInteger(
                      templates.length,
                    )}
                  </span>{" "}
                  {t.rows}
                </span>
                <span className="truncate">
                  {getAppliedFiltersText()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <AlertDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => {
          if (
            !open &&
            !savingId
          ) {
            setConfirmTarget(null);
          }
        }}
      >
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmTarget ? (
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                {localizedTemplateField(
                  confirmTarget.row,
                  locale,
                  "name",
                ) ||
                  confirmTarget.row.code ||
                  t.unknown}
              </p>
              {confirmTarget.row.code ? (
                <p
                  dir="ltr"
                  className="mt-1 text-xs tabular-nums text-muted-foreground"
                >
                  {confirmTarget.row.code}
                </p>
              ) : null}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={Boolean(savingId)}
            >
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmContent.className
              }
              disabled={Boolean(savingId)}
              onClick={(event) => {
                event.preventDefault();
                void updateTemplateStatus();
              }}
            >
              {savingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {confirmContent.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}