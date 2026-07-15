// ============================================================
// 📂 app/company/accounting/cost-centers/page.tsx
// 🧠 PrimeyAcc | Company Accounting Cost Centers
// ------------------------------------------------------------
// ✅ Approved company dashboard premium pattern
// ✅ Real API only
// ✅ Tenant scoped by backend session
// ✅ Cost centers operational workflow
// ✅ Arabic/English locale + English digits
// ============================================================
"use client";
import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpDown,
  CheckCircle2,
  Edit3,
  FileSpreadsheet,
  FolderTree,
  Layers3,
  Loader2,
  MoreVertical,
  Power,
  PowerOff,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sparkles,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
type StatusFilter = "all" | "ACTIVE" | "INACTIVE";
type TypeFilter = "all" | "group" | "postable";
type SortKey = "code" | "name" | "level";
type CostCenter = {
  id: number;
  code: string;
  name: string;
  nameEn: string;
  parentId: number | null;
  parentCode: string;
  parentName: string;
  level: number;
  isGroup: boolean;
  status: "ACTIVE" | "INACTIVE" | string;
  isActive: boolean;
  canPost: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
};
type CostCenterForm = {
  id: number | null;
  code: string;
  name: string;
  nameEn: string;
  parentId: string;
  isGroup: boolean;
  status: "ACTIVE" | "INACTIVE";
  description: string;
};
const NO_PARENT = "__no_parent__";
const translations = {
  ar: {
    title: "مراكز التكلفة",
    subtitle:
      "إدارة مراكز تكلفة الشركة وربطها بالقيود اليومية والتقارير التشغيلية بدون حذف فعلي لحماية القيود السابقة.",
    badge: "وحدة الحسابات",
    accountingDashboard: "لوحة الحسابات",
    journalEntries: "القيود اليومية",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    companyFallback: "الشركة الحالية",
    printBlocked: "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.",
    printEmpty: "لا توجد مراكز تكلفة مطابقة للطباعة.",
    printReady: "تم تجهيز تقرير مراكز التكلفة للطباعة.",
    generatedAt: "تاريخ التجهيز",
    searchLabel: "البحث",
    filtersApplied: "الفلاتر المطبقة",
    noFilters: "بدون فلاتر إضافية",
    reset: "إعادة ضبط",
    total: "إجمالي المراكز",
    active: "نشطة",
    inactive: "غير نشطة",
    groups: "تجميعية",
    postable: "قابلة للترحيل",
    totalDesc: "كل مراكز التكلفة",
    activeDesc: "مراكز متاحة للاستخدام",
    groupsDesc: "مراكز أب وتجميع",
    postableDesc: "مراكز نشطة غير تجميعية",
    formCreate: "إضافة مركز تكلفة",
    formEdit: "تعديل مركز تكلفة",
    formDesc:
      "استخدم مركز تكلفة تجميعي كأب، واجعل المراكز التشغيلية غير تجميعية حتى تظهر في القيود اليومية.",
    code: "الكود",
    autoCode: "يولد تلقائيًا بعد الحفظ",
    codePlaceholder: "يولد تلقائيًا بعد الحفظ",
    name: "الاسم",
    namePlaceholder: "مثال: المبيعات",
    nameEn: "الاسم الإنجليزي",
    nameEnPlaceholder: "Example: Sales",
    parent: "المركز الأب",
    noParent: "بدون أب",
    type: "النوع",
    group: "تجميعي",
    leaf: "تشغيلي",
    status: "الحالة",
    description: "الوصف",
    descriptionPlaceholder: "وصف مختصر لمركز التكلفة",
    save: "حفظ",
    saving: "جاري الحفظ...",
    cancelEdit: "إلغاء التعديل",
    tableTitle: "سجل مراكز التكلفة",
    tableDesc: "عرض وبحث وتصفية مراكز التكلفة الخاصة بالشركة مباشرة من قاعدة البيانات.",
    searchPlaceholder: "ابحث بالكود أو الاسم أو الوصف...",
    all: "الكل",
    allTypes: "كل الأنواع",
    activeOnly: "النشطة",
    inactiveOnly: "غير النشطة",
    groupOnly: "التجميعية",
    postableOnly: "القابلة للترحيل",
    sortCode: "ترتيب بالكود",
    sortName: "ترتيب بالاسم",
    sortLevel: "ترتيب بالمستوى",
    level: "المستوى",
    canPost: "قابل للترحيل",
    actions: "الإجراءات",
    edit: "تعديل",
    activate: "تفعيل",
    deactivate: "تعطيل",
    confirmActivate: "تأكيد التفعيل",
    confirmDeactivate: "تأكيد التعطيل",
    activateDesc: "سيصبح مركز التكلفة متاحًا للاستخدام في القيود والتقارير.",
    deactivateDesc: "سيتم منع استخدام مركز التكلفة في قيود جديدة مع الحفاظ على القيود السابقة.",
    confirm: "تأكيد",
    cancel: "إلغاء",
    emptyTitle: "لا توجد مراكز تكلفة",
    emptyDesc: "أضف أول مركز تكلفة أو عدّل الفلاتر لعرض نتائج أخرى.",
    loadFailed: "تعذر تحميل مراكز التكلفة.",
    saveSuccess: "تم حفظ مركز التكلفة بنجاح.",
    statusSuccess: "تم تحديث حالة مركز التكلفة بنجاح.",
    updatingStatus: "جارٍ تحديث الحالة...",
    actionFailed: "تعذر تنفيذ العملية.",
    required: "الاسم مطلوب.",
    ACTIVE: "نشط",
    INACTIVE: "غير نشط",
    yes: "نعم",
    no: "لا",
  },
  en: {
    title: "Cost Centers",
    subtitle:
      "Manage company cost centers for journal entries and operational reporting without deleting historical usage.",
    badge: "Accounting Module",
    accountingDashboard: "Accounting Dashboard",
    journalEntries: "Journal Entries",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    companyFallback: "Current Company",
    printBlocked: "The print window could not be opened. Allow pop-ups and try again.",
    printEmpty: "There are no matching cost centers to print.",
    printReady: "The cost centers report is ready to print.",
    generatedAt: "Generated at",
    searchLabel: "Search",
    filtersApplied: "Applied filters",
    noFilters: "No additional filters",
    reset: "Reset",
    total: "Total centers",
    active: "Active",
    inactive: "Inactive",
    groups: "Groups",
    postable: "Postable",
    totalDesc: "All cost centers",
    activeDesc: "Available for use",
    groupsDesc: "Parent/group centers",
    postableDesc: "Active non-group centers",
    formCreate: "Add Cost Center",
    formEdit: "Edit Cost Center",
    formDesc:
      "Use group cost centers as parents, and keep operational centers non-group so they appear in journal entries.",
    code: "Code",
    autoCode: "Auto-generated on save",
    codePlaceholder: "Auto-generated on save",
    name: "Name",
    namePlaceholder: "Example: Sales",
    nameEn: "English name",
    nameEnPlaceholder: "Example: Sales",
    parent: "Parent",
    noParent: "No parent",
    type: "Type",
    group: "Group",
    leaf: "Operational",
    status: "Status",
    description: "Description",
    descriptionPlaceholder: "Short cost center description",
    save: "Save",
    saving: "Saving...",
    cancelEdit: "Cancel edit",
    tableTitle: "Cost Centers Register",
    tableDesc: "View, search, and filter company cost centers directly from the database.",
    searchPlaceholder: "Search by code, name, or description...",
    all: "All",
    allTypes: "All types",
    activeOnly: "Active",
    inactiveOnly: "Inactive",
    groupOnly: "Groups",
    postableOnly: "Postable",
    sortCode: "Sort by code",
    sortName: "Sort by name",
    sortLevel: "Sort by level",
    level: "Level",
    canPost: "Can post",
    actions: "Actions",
    edit: "Edit",
    activate: "Activate",
    deactivate: "Deactivate",
    confirmActivate: "Confirm activation",
    confirmDeactivate: "Confirm deactivation",
    activateDesc: "The cost center will become available for journal entries and reports.",
    deactivateDesc: "The cost center will be blocked from new entries while preserving historical entries.",
    confirm: "Confirm",
    cancel: "Cancel",
    emptyTitle: "No cost centers",
    emptyDesc: "Add the first cost center or reset filters to show other results.",
    loadFailed: "Could not load cost centers.",
    saveSuccess: "Cost center saved successfully.",
    statusSuccess: "Cost center status updated successfully.",
    updatingStatus: "Updating status...",
    actionFailed: "Action failed.",
    required: "Name is required.",
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    yes: "Yes",
    no: "No",
  },
} as const;
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function apiBase() {
  const value = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  return value.endsWith("/api") ? value.slice(0, -4) : value;
}
function apiUrl(path: string) {
  return `${apiBase()}${path}`;
}
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2 ? decodeURIComponent(parts.pop()?.split(";").shift() || "") : "";
}
async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (method !== "GET" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (method !== "GET") {
    const csrf = getCookie("csrftoken") || getCookie("csrf_token");
    if (csrf) headers.set("X-CSRFToken", csrf);
  }
  const response = await fetch(apiUrl(path), {
    ...init,
    method,
    credentials: "include",
    headers,
  });
  const text = await response.text();
  const payload = (text ? JSON.parse(text) : {}) as ApiRecord;
  if (!response.ok) {
    throw new Error(String(payload.message || payload.detail || `HTTP ${response.status}`));
  }
  return payload as T;
}
function record(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : {};
}
function firstArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const row = record(value);
  for (const key of ["results", "items", "cost_centers", "data"]) {
    const next = row[key];
    if (Array.isArray(next)) return next;
    if (next && typeof next === "object") {
      const nested = firstArray(next);
      if (nested.length) return nested;
    }
  }
  return [];
}
function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}
function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function formatInteger(value: number) {
  return Math.trunc(value || 0).toLocaleString("en-US");
}
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function extractCompanyName(
  payload: unknown,
  locale: Locale,
  fallback: string,
) {
  const source = record(payload);
  const data = record(source.data);
  const membership = record(source.membership || data.membership);
  const candidates = [
    source.company,
    source.current_company,
    source.active_company,
    source.workspace_company,
    data.company,
    data.current_company,
    data.active_company,
    data.workspace_company,
    membership.company,
  ];
  for (const candidate of candidates) {
    const company = record(candidate);
    const localizedName =
      locale === "ar"
        ? company.name_ar ||
          company.legal_name_ar ||
          company.commercial_name_ar
        : company.name_en ||
          company.legal_name_en ||
          company.commercial_name_en;
    const result = text(
      localizedName ||
        company.legal_name ||
        company.commercial_name ||
        company.company_name ||
        company.display_name ||
        company.name,
    );
    if (result) return result;
  }
  return text(
    source.company_name ||
      source.current_company_name ||
      source.active_company_name ||
      data.company_name ||
      data.current_company_name ||
      data.active_company_name,
  ) || fallback;
}
function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}
function normalizeCostCenter(value: unknown): CostCenter {
  const row = record(value);
  return {
    id: numberValue(row.id),
    code: text(row.code),
    name: text(row.name || row.name_ar || row.display_name || row.code),
    nameEn: text(row.name_en),
    parentId: row.parent_id ? numberValue(row.parent_id) : null,
    parentCode: text(row.parent_code),
    parentName: text(row.parent_name),
    level: numberValue(row.level || 1),
    isGroup: Boolean(row.is_group),
    status: text(row.status || "ACTIVE") || "ACTIVE",
    isActive: Boolean(row.is_active ?? row.status === "ACTIVE"),
    canPost: Boolean(row.can_post),
    description: text(row.description),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}
function buildEmptyForm(): CostCenterForm {
  return {
    id: null,
    code: "",
    name: "",
    nameEn: "",
    parentId: "",
    isGroup: false,
    status: "ACTIVE",
    description: "",
  };
}
function statusClass(status: string) {
  if (status === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
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
    <Card className="group rounded-lg border bg-card shadow-none transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-xl font-bold tracking-tight tabular-nums">
            {formatInteger(value)}
          </CardTitle>
        </div>
        <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
export default function CompanyAccountingCostCentersPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [costCenters, setCostCenters] = React.useState<CostCenter[]>([]);
  const [form, setForm] = React.useState<CostCenterForm>(buildEmptyForm);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [type, setType] = React.useState<TypeFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("code");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [statusUpdating, setStatusUpdating] = React.useState(false);
  const [actionTarget, setActionTarget] = React.useState<CostCenter | null>(null);
  const [companyName, setCompanyName] = React.useState("");
  React.useEffect(() => {
    const applyLocale = () => {
      const next = getInitialLocale();
      setLocale(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.body.dir = next === "ar" ? "rtl" : "ltr";
    };
    applyLocale();
    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);
    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);
  React.useEffect(() => {
    let active = true;
    void fetchJson<unknown>("/api/auth/whoami/")
      .then((payload) => {
        if (!active) return;
        setCompanyName(
          extractCompanyName(payload, locale, translations[locale].companyFallback),
        );
      })
      .catch(() => {
        if (active) setCompanyName(translations[locale].companyFallback);
      });
    return () => {
      active = false;
    };
  }, [locale]);
  const stats = React.useMemo(() => {
    return {
      total: costCenters.length,
      active: costCenters.filter((item) => item.status === "ACTIVE").length,
      groups: costCenters.filter((item) => item.isGroup).length,
      postable: costCenters.filter((item) => item.canPost).length,
    };
  }, [costCenters]);
  const groupOptions = React.useMemo(
    () =>
      costCenters
        .filter((item) => item.isGroup && item.status === "ACTIVE" && item.id !== form.id)
        .sort((a, b) => a.code.localeCompare(b.code, "en")),
    [costCenters, form.id],
  );
  const filteredCostCenters = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = costCenters.filter((item) => {
      const bySearch =
        !q ||
        [item.code, item.name, item.nameEn, item.parentCode, item.parentName, item.description]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const byStatus = status === "all" || item.status === status;
      const byType =
        type === "all" ||
        (type === "group" && item.isGroup) ||
        (type === "postable" && item.canPost);
      return bySearch && byStatus && byType;
    });
    return [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en");
      if (sort === "level") return a.level - b.level || a.code.localeCompare(b.code, "en");
      return a.code.localeCompare(b.code, "en");
    });
  }, [costCenters, locale, search, sort, status, type]);
  const loadCostCenters = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchJson<unknown>("/api/company/accounting/cost-centers/?status=all");
      setCostCenters(firstArray(payload).map(normalizeCostCenter));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t.loadFailed]);
  React.useEffect(() => {
    void loadCostCenters();
  }, [loadCostCenters]);
  function resetFilters() {
    setSearch("");
    setStatus("all");
    setType("all");
    setSort("code");
  }
  function resetForm() {
    setForm(buildEmptyForm());
  }
  function editCostCenter(costCenter: CostCenter) {
    setForm({
      id: costCenter.id,
      code: costCenter.code,
      name: costCenter.name,
      nameEn: costCenter.nameEn,
      parentId: costCenter.parentId ? String(costCenter.parentId) : "",
      isGroup: costCenter.isGroup,
      status: costCenter.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      description: costCenter.description,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submitForm() {
    if (!form.name.trim()) {
      toast.error(t.required);
      return;
    }
    setSaving(true);
    try {
      const payload: ApiRecord = {
        name: form.name.trim(),
        name_en: form.nameEn.trim(),
        parent_id: form.parentId ? Number(form.parentId) : null,
        is_group: form.isGroup,
        status: form.status,
        description: form.description.trim(),
      };
      if (form.id) {
        await fetchJson(`/api/company/accounting/cost-centers/${form.id}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson("/api/company/accounting/cost-centers/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      toast.success(t.saveSuccess);
      resetForm();
      await loadCostCenters();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed);
    } finally {
      setSaving(false);
    }
  }
  async function changeStatus(costCenter: CostCenter) {
    const nextAction =
      costCenter.status === "ACTIVE" ? "deactivate" : "activate";
    setStatusUpdating(true);
    try {
      await fetchJson(
        `/api/company/accounting/cost-centers/${costCenter.id}/${nextAction}/`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      toast.success(t.statusSuccess);
      setActionTarget(null);
      await loadCostCenters();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed);
    } finally {
      setStatusUpdating(false);
    }
  }
  function filterSummary() {
    const values: string[] = [];
    if (search.trim()) values.push(`${t.searchLabel}: ${search.trim()}`);
    if (status !== "all") {
      values.push(status === "ACTIVE" ? t.activeOnly : t.inactiveOnly);
    }
    if (type !== "all") {
      values.push(type === "group" ? t.groupOnly : t.postableOnly);
    }
    values.push(
      sort === "code"
        ? t.sortCode
        : sort === "name"
          ? t.sortName
          : t.sortLevel,
    );
    return values.length ? values.join(" · ") : t.noFilters;
  }
  function buildCostCentersDocument(mode: "excel" | "print") {
    const rows = filteredCostCenters
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.code)}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.nameEn || "—")}</td>
            <td>${escapeHtml(
              item.parentCode
                ? `${item.parentCode} — ${item.parentName}`
                : t.noParent,
            )}</td>
            <td>${escapeHtml(formatInteger(item.level))}</td>
            <td>${escapeHtml(item.isGroup ? t.group : t.leaf)}</td>
            <td>${escapeHtml(
              item.status === "ACTIVE" ? t.ACTIVE : t.INACTIVE,
            )}</td>
            <td>${escapeHtml(item.canPost ? t.yes : t.no)}</td>
            <td>${escapeHtml(item.description || "—")}</td>
          </tr>`,
      )
      .join("");
    const isPrint = mode === "print";
    return `<!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.tableTitle)}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #000;
              background: #fff;
              font-family: Tahoma, Arial, sans-serif;
              font-size: 10px;
            }
            .report { width: 100%; }
            .head {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 10px;
            }
            .company {
              font-size: 13px;
              font-weight: 700;
              line-height: 1.6;
            }
            h1 { margin: 3px 0 0; font-size: 20px; }
            .meta {
              min-width: 235px;
              border: 1px solid #000;
              padding: 7px 9px;
              line-height: 1.8;
            }
            .filters {
              margin: 0 0 9px;
              border: 1px solid #000;
              padding: 7px 9px;
              line-height: 1.7;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            thead { display: table-header-group; }
            tr { break-inside: avoid; }
            th, td {
              border: 1px solid #000;
              padding: 6px 5px;
              vertical-align: top;
              overflow-wrap: anywhere;
            }
            th {
              background: #f1f1f1;
              font-weight: 700;
              text-align: ${locale === "ar" ? "right" : "left"};
            }
            td:nth-child(1),
            td:nth-child(5) {
              direction: ltr;
              text-align: center;
              font-variant-numeric: tabular-nums;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin-top: 8px;
              font-size: 9px;
            }
            ${isPrint ? "" : ".footer { display: none; }"}
          </style>
        </head>
        <body>
          <section class="report">
            <div class="head">
              <div>
                <div class="company">${escapeHtml(
                  companyName || t.companyFallback,
                )}</div>
                <h1>${escapeHtml(t.tableTitle)}</h1>
              </div>
              <div class="meta">
                <div><strong>${escapeHtml(t.total)}:</strong> ${escapeHtml(
                  formatInteger(filteredCostCenters.length),
                )}</div>
                <div><strong>${escapeHtml(t.generatedAt)}:</strong> ${escapeHtml(
                  formatDateTime(new Date()),
                )}</div>
              </div>
            </div>
            <div class="filters">
              <strong>${escapeHtml(t.filtersApplied)}:</strong>
              ${escapeHtml(filterSummary())}
            </div>
            <table>
              <thead>
                <tr>
                  <th>${escapeHtml(t.code)}</th>
                  <th>${escapeHtml(t.name)}</th>
                  <th>${escapeHtml(t.nameEn)}</th>
                  <th>${escapeHtml(t.parent)}</th>
                  <th>${escapeHtml(t.level)}</th>
                  <th>${escapeHtml(t.type)}</th>
                  <th>${escapeHtml(t.status)}</th>
                  <th>${escapeHtml(t.canPost)}</th>
                  <th>${escapeHtml(t.description)}</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="footer">
              <span>${escapeHtml(companyName || t.companyFallback)}</span>
              <span>${escapeHtml(formatDateTime(new Date()))}</span>
            </div>
          </section>
        </body>
      </html>`;
  }
  function exportExcel() {
    if (!filteredCostCenters.length) {
      toast.error(t.printEmpty);
      return;
    }
    const blob = new Blob(
      ["\ufeff", buildCostCentersDocument("excel")],
      { type: "application/vnd.ms-excel;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cost-centers-${new Date().toISOString().slice(0, 10)}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function printCostCenters() {
    if (!filteredCostCenters.length) {
      toast.error(t.printEmpty);
      return;
    }
    const popup = window.open("", "_blank", "width=1500,height=950");
    if (!popup) {
      toast.error(t.printBlocked);
      return;
    }
    popup.opener = null;
    popup.document.open();
    popup.document.write(buildCostCentersDocument("print"));
    popup.document.close();
    popup.onafterprint = () => popup.close();
    window.setTimeout(() => {
      popup.focus();
      popup.print();
    }, 300);
    toast.success(t.printReady);
  }
  return (
    <main dir={dir} className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t.badge}
            </div>
            <h1 className="text-3xl font-black tracking-tight">{t.title}</h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              {t.subtitle}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Button asChild type="button" variant="outline" size="sm">
                <Link href="/company/accounting">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t.accountingDashboard}
                </Link>
              </Button>
              <Button asChild type="button" variant="outline" size="sm">
                <Link href="/company/accounting/journal-entries">
                  {t.journalEntries}
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={printCostCenters}>
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
            <Button type="button" variant="outline" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4" />
              {t.export}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadCostCenters()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t.refresh}
            </Button>
          </div>
        </header>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.total} value={stats.total} description={t.totalDesc} icon={FolderTree} />
          <KpiCard title={t.active} value={stats.active} description={t.activeDesc} icon={CheckCircle2} />
          <KpiCard title={t.groups} value={stats.groups} description={t.groupsDesc} icon={Layers3} />
          <KpiCard title={t.postable} value={stats.postable} description={t.postableDesc} icon={Power} />
        </div>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base">
                  {form.id ? t.formEdit : t.formCreate}
                </CardTitle>
                <CardDescription className="mt-1">{t.formDesc}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void submitForm()}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? t.saving : t.save}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <RotateCcw className="h-4 w-4" />
                  {form.id ? t.cancelEdit : t.reset}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6">
            <div className="grid gap-4 rounded-lg border bg-background p-4 md:grid-cols-2 xl:grid-cols-[150px_1fr_1fr_220px_160px_160px]">
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.code}</span>
                <Input
                  value={form.id ? form.code : t.autoCode}
                  readOnly
                  placeholder={t.codePlaceholder}
                  className="h-10 bg-muted/40 font-mono text-sm font-bold tabular-nums text-muted-foreground"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.name}</span>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder={t.namePlaceholder}
                  className="h-10 bg-background"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.nameEn}</span>
                <Input
                  value={form.nameEn}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nameEn: event.target.value }))
                  }
                  placeholder={t.nameEnPlaceholder}
                  className="h-10 bg-background"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.parent}</span>
                <Select
                  value={form.parentId || NO_PARENT}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      parentId: value === NO_PARENT ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,420px)] overflow-y-auto overscroll-contain">
                    <SelectItem value={NO_PARENT}>{t.noParent}</SelectItem>
                    {groupOptions.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.code} — {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.type}</span>
                <Select
                  value={form.isGroup ? "group" : "leaf"}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, isGroup: value === "group" }))
                  }
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leaf">{t.leaf}</SelectItem>
                    <SelectItem value="group">{t.group}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.status}</span>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value === "INACTIVE" ? "INACTIVE" : "ACTIVE",
                    }))
                  }
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">{t.ACTIVE}</SelectItem>
                    <SelectItem value="INACTIVE">{t.INACTIVE}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t.description}
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={t.descriptionPlaceholder}
                className="min-h-[92px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
          </CardContent>
        </Card>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{t.tableTitle}</CardTitle>
                  <Badge variant="outline" className="rounded-full">
                    {formatInteger(filteredCostCenters.length)}
                  </Badge>
                </div>
                <CardDescription className="mt-1">{t.tableDesc}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={printCostCenters}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button type="button" variant="outline" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-lg border bg-background p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="h-10 bg-background ps-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-10 bg-background sm:w-[145px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="ACTIVE">{t.activeOnly}</SelectItem>
                    <SelectItem value="INACTIVE">{t.inactiveOnly}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={type} onValueChange={(value) => setType(value as TypeFilter)}>
                  <SelectTrigger className="h-10 bg-background sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allTypes}</SelectItem>
                    <SelectItem value="group">{t.groupOnly}</SelectItem>
                    <SelectItem value="postable">{t.postableOnly}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 bg-background sm:w-[160px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code">{t.sortCode}</SelectItem>
                    <SelectItem value="name">{t.sortName}</SelectItem>
                    <SelectItem value="level">{t.sortLevel}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-10 bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
            {loading ? (
              <div className="space-y-3 rounded-2xl border p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredCostCenters.length ? (
              <div className="overflow-hidden rounded-lg border">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1120px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        <TableHead className="sticky start-0 z-20 w-[130px] bg-muted/40 text-start">{t.code}</TableHead>
                        <TableHead className="text-start">{t.name}</TableHead>
                        <TableHead className="text-start">{t.nameEn}</TableHead>
                        <TableHead className="w-[220px] text-start">{t.parent}</TableHead>
                        <TableHead className="w-[100px] text-center">{t.level}</TableHead>
                        <TableHead className="w-[130px] text-center">{t.type}</TableHead>
                        <TableHead className="w-[130px] text-center">{t.status}</TableHead>
                        <TableHead className="w-[130px] text-center">{t.canPost}</TableHead>
                        <TableHead className="sticky end-0 z-20 w-[84px] bg-muted/40 text-center">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCostCenters.map((item) => (
                        <TableRow key={item.id} className="group h-[58px] bg-card hover:bg-muted/30">
                          <TableCell className="sticky start-0 z-10 bg-card font-mono font-black tabular-nums group-hover:bg-muted/30">{item.code}</TableCell>
                          <TableCell className="font-semibold">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground">{item.nameEn || "—"}</TableCell>
                          <TableCell>
                            {item.parentCode ? `${item.parentCode} — ${item.parentName}` : t.noParent}
                          </TableCell>
                          <TableCell className="text-center font-mono tabular-nums">
                            {formatInteger(item.level)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="rounded-full px-2.5 py-1">
                              {item.isGroup ? t.group : t.leaf}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`rounded-full px-2.5 py-1 ${statusClass(item.status)}`}>
                              {item.status === "ACTIVE" ? t.ACTIVE : t.INACTIVE}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.canPost ? (
                              <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                {t.yes}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-muted-foreground">
                                {t.no}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="sticky end-0 z-10 bg-card group-hover:bg-muted/30">
                            <div
                              className="flex items-center justify-center"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label={t.actions}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align={locale === "ar" ? "start" : "end"}
                                  className="w-44"
                                >
                                  <DropdownMenuItem
                                    className="text-amber-700 focus:bg-amber-50 focus:text-amber-800"
                                    onClick={() => editCostCenter(item)}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                    {t.edit}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className={
                                      item.status === "ACTIVE"
                                        ? "text-red-600 focus:bg-red-50 focus:text-red-700"
                                        : "text-emerald-700 focus:bg-emerald-50 focus:text-emerald-800"
                                    }
                                    onClick={() => setActionTarget(item)}
                                  >
                                    {item.status === "ACTIVE" ? (
                                      <PowerOff className="h-4 w-4" />
                                    ) : (
                                      <Power className="h-4 w-4" />
                                    )}
                                    {item.status === "ACTIVE"
                                      ? t.deactivate
                                      : t.activate}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
                <Search className="h-7 w-7 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-semibold">{t.emptyTitle}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.emptyDesc}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <AlertDialog
          open={Boolean(actionTarget)}
          onOpenChange={(open) => {
            if (!open && !statusUpdating) {
              setActionTarget(null);
            }
          }}
        >
          <AlertDialogContent
            dir={dir}
            className="overflow-hidden rounded-xl border bg-background p-0 shadow-2xl sm:max-w-[520px]"
          >
            <div className="px-6 pb-4 pt-6">
              <AlertDialogHeader className="text-start">
                <div className="flex items-start gap-3">
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                      actionTarget?.status === "ACTIVE"
                        ? "border-rose-100 bg-rose-50 text-rose-600"
                        : "border-emerald-100 bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {actionTarget?.status === "ACTIVE" ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <AlertDialogTitle
                      className={`text-lg font-black ${
                        actionTarget?.status === "ACTIVE"
                          ? "text-rose-600"
                          : "text-emerald-700"
                      }`}
                    >
                      {actionTarget?.status === "ACTIVE"
                        ? t.confirmDeactivate
                        : t.confirmActivate}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="mt-2 leading-7 text-muted-foreground">
                      {actionTarget?.status === "ACTIVE"
                        ? t.deactivateDesc
                        : t.activateDesc}
                    </AlertDialogDescription>
                  </div>
                </div>
              </AlertDialogHeader>
            </div>
            {actionTarget ? (
              <div className="px-6 pb-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-background px-3 py-3">
                    <p className="text-xs text-muted-foreground">
                      {t.code}
                    </p>
                    <p className="mt-1 font-mono text-sm font-black tabular-nums">
                      {actionTarget.code}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background px-3 py-3">
                    <p className="text-xs text-muted-foreground">
                      {t.name}
                    </p>
                    <p className="mt-1 text-sm font-black">
                      {actionTarget.name}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            <AlertDialogFooter className="gap-2 border-t bg-muted/20 px-6 py-4 sm:justify-start">
              <AlertDialogCancel
                className="bg-background"
                disabled={statusUpdating}
              >
                {t.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                className={
                  actionTarget?.status === "ACTIVE"
                    ? "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600"
                }
                disabled={statusUpdating}
                onClick={(event) => {
                  event.preventDefault();
                  if (actionTarget) {
                    void changeStatus(actionTarget);
                  }
                }}
              >
                {statusUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : actionTarget?.status === "ACTIVE" ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {statusUpdating
                  ? t.updatingStatus
                  : actionTarget?.status === "ACTIVE"
                    ? t.deactivate
                    : t.activate}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}
