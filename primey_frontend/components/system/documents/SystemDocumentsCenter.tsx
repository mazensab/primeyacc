"use client";
/* ============================================================
   📂 primey_frontend/components/system/documents/SystemDocumentsCenter.tsx
   🧩 Mhamcloud — System Documents Center
   ------------------------------------------------------------
   ✅ Premium PrimeyCare admin pattern adapted for Mhamcloud
   ✅ Shared system documents pages component
   ✅ Real API only: /api/system/documents/*
   ✅ KPI cards + quick actions + document tables
   ✅ Search, type/category/status filter, sorting, reset
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
  ClipboardList,
  Database,
  FileSpreadsheet,
  FileText,
  Inbox,
  Layers3,
  LayoutTemplate,
  Loader2,
  Monitor,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
type Mode = "overview" | "templates" | "rendering" | "thermal" | "settings";
type RowType = "all" | "template" | "capability" | "model" | "route" | "print_job" | "setting";
type SortKey = "newest" | "name" | "type" | "status";
type UnifiedRow = {
  id: string;
  numericId: number;
  type: "template" | "capability" | "model" | "route" | "print_job" | "setting";
  category: string;
  name: string;
  code: string;
  companyName: string;
  status: string;
  path: string;
  countValue: number;
  description: string;
  createdAt: string;
  updatedAt: string;
};
type Summary = {
  documentModelsCount: number;
  documentRecordsCount: number;
  templateModelsCount: number;
  templateRecordsCount: number;
  renderingModelsCount: number;
  renderingRecordsCount: number;
  printJobModelsCount: number;
  printJobsCount: number;
  companiesWithTemplates: number;
  companiesWithPrintJobs: number;
  companyRoutesAvailableCount: number;
  systemRoutesAvailableCount: number;
};
const ENDPOINTS: Record<Mode, string> = {
  overview: "/api/system/documents/",
  templates: "/api/system/documents/templates/",
  rendering: "/api/system/documents/rendering/",
  thermal: "/api/system/documents/thermal/",
  settings: "/api/system/documents/settings/",
};
const translations = {
  ar: {
    overviewTitle: "مركز وثائق النظام",
    templatesTitle: "قوالب الوثائق",
    renderingTitle: "عرض وتوليد الوثائق",
    thermalTitle: "الطباعة الحرارية",
    settingsTitle: "إعدادات الوثائق",
    overviewSubtitle:
      "لوحة مراقبة وثائق Mhamcloud من API النظام الحقيقي: القوالب، التوليد، PDF، الطباعة الحرارية، ومهام الطباعة.",
    templatesSubtitle:
      "مراقبة قوالب الوثائق المسجلة للشركات بدون تجاوز عزل الشركات أو إرسال company_id من الفرونت.",
    renderingSubtitle:
      "مراقبة قدرات توليد الوثائق، Web Print، و PDF من طبقة النظام.",
    thermalSubtitle:
      "مراقبة الطباعة الحرارية ومهام الطباعة المرتبطة بوثائق الشركات.",
    settingsSubtitle:
      "ملخص إعدادات وحوكمة الوثائق على مستوى النظام، مع إبقاء التنفيذ التشغيلي داخل نطاق الشركة.",
    badge: "الوثائق والطباعة",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    reset: "إعادة ضبط",
    apiContracts: "عقود API",
    releaseReadiness: "جاهزية الإطلاق",
    overview: "الملخص",
    templates: "القوالب",
    rendering: "التوليد",
    thermal: "حراري",
    settings: "الإعدادات",
    documentModels: "نماذج الوثائق",
    documentRecords: "سجلات الوثائق",
    templateRecords: "سجلات القوالب",
    routesAvailable: "المسارات المتاحة",
    printJobs: "مهام الطباعة",
    companiesWithTemplates: "شركات لديها قوالب",
    fromLiveApi: "من API حقيقي",
    searchPlaceholder: "ابحث بالاسم أو الكود أو الشركة أو المسار أو الوصف...",
    all: "الكل",
    rowType: "النوع",
    category: "التصنيف",
    status: "الحالة",
    sort: "الترتيب",
    newest: "الأحدث",
    nameSort: "الاسم",
    typeSort: "النوع",
    statusSort: "الحالة",
    tableTitle: "سجل الوثائق",
    tableDesc: "بيانات موحدة من API النظام الحقيقي للوثائق والقوالب والمسارات والقدرات.",
    showing: "عرض",
    of: "من",
    rows: "سجل",
    name: "الاسم",
    code: "الكود",
    company: "الشركة",
    path: "المسار",
    count: "العدد",
    description: "الوصف",
    createdAt: "تاريخ الإنشاء",
    template: "قالب",
    capability: "قدرة",
    model: "نموذج",
    route: "مسار",
    printJob: "مهمة طباعة",
    setting: "إعداد",
    active: "نشط",
    inactive: "غير نشط",
    available: "متاح",
    missing: "غير متاح",
    pending: "معلّق",
    completed: "مكتمل",
    failed: "فشل",
    emptyTitle: "لا توجد بيانات وثائق",
    emptyDesc: "لم يرجع API أي سجلات لهذه الصفحة.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل وثائق النظام",
    errorDesc: "تأكد من صلاحيات النظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير وثائق النظام في Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
    refreshed: "تم تحديث وثائق النظام.",
    unknown: "غير معروف",
    notAvailable: "—",
  },
  en: {
    overviewTitle: "System Documents Center",
    templatesTitle: "Document Templates",
    renderingTitle: "Document Rendering",
    thermalTitle: "Thermal Printing",
    settingsTitle: "Document Settings",
    overviewSubtitle:
      "Mhamcloud system documents monitoring from the live system API: templates, rendering, PDF, thermal printing, and print jobs.",
    templatesSubtitle:
      "Monitor company document templates without bypassing tenant isolation or sending company_id from the frontend.",
    renderingSubtitle:
      "Monitor document rendering, Web Print, and PDF capabilities from the system layer.",
    thermalSubtitle:
      "Monitor thermal document output and print jobs related to company documents.",
    settingsSubtitle:
      "System-level document governance and settings summary while runtime execution remains company-scoped.",
    badge: "Documents & Printing",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    reset: "Reset",
    apiContracts: "API Contracts",
    releaseReadiness: "Release Readiness",
    overview: "Overview",
    templates: "Templates",
    rendering: "Rendering",
    thermal: "Thermal",
    settings: "Settings",
    documentModels: "Document models",
    documentRecords: "Document records",
    templateRecords: "Template records",
    routesAvailable: "Routes available",
    printJobs: "Print jobs",
    companiesWithTemplates: "Companies with templates",
    fromLiveApi: "From live API",
    searchPlaceholder: "Search name, code, company, path, or description...",
    all: "All",
    rowType: "Type",
    category: "Category",
    status: "Status",
    sort: "Sort",
    newest: "Newest",
    nameSort: "Name",
    typeSort: "Type",
    statusSort: "Status",
    tableTitle: "Documents log",
    tableDesc: "Unified live system API data for documents, templates, routes, and capabilities.",
    showing: "Showing",
    of: "of",
    rows: "rows",
    name: "Name",
    code: "Code",
    company: "Company",
    path: "Path",
    count: "Count",
    description: "Description",
    createdAt: "Created at",
    template: "Template",
    capability: "Capability",
    model: "Model",
    route: "Route",
    printJob: "Print job",
    setting: "Setting",
    active: "Active",
    inactive: "Inactive",
    available: "Available",
    missing: "Missing",
    pending: "Pending",
    completed: "Completed",
    failed: "Failed",
    emptyTitle: "No document data",
    emptyDesc: "The API returned no records for this page.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show more results.",
    errorTitle: "Could not load system documents",
    errorDesc: "Make sure you have system permission and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "Mhamcloud System Documents Report",
    generatedAt: "Generated at",
    refreshed: "System documents refreshed.",
    unknown: "Unknown",
    notAvailable: "—",
  },
} as const;
const pageMeta: Record<Mode, { titleKey: keyof typeof translations.ar; subtitleKey: keyof typeof translations.ar; icon: LucideIcon }> = {
  overview: { titleKey: "overviewTitle", subtitleKey: "overviewSubtitle", icon: FileText },
  templates: { titleKey: "templatesTitle", subtitleKey: "templatesSubtitle", icon: LayoutTemplate },
  rendering: { titleKey: "renderingTitle", subtitleKey: "renderingSubtitle", icon: Monitor },
  thermal: { titleKey: "thermalTitle", subtitleKey: "thermalSubtitle", icon: Printer },
  settings: { titleKey: "settingsTitle", subtitleKey: "settingsSubtitle", icon: Settings },
};
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}
function normalizeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
function normalizeBool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["1", "true", "yes", "active", "available"].includes(value.toLowerCase());
  }
  return fallback;
}
function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(normalizeNumber(value)),
  );
}
function formatDateTime(value: unknown, locale: Locale) {
  const raw = normalizeText(value);
  if (!raw) return translations[locale].notAvailable;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}
async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(makeApiUrl(path), {
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
    throw new Error(
      normalizeText(record.message) ||
        normalizeText(record.detail) ||
        normalizeText(record.error) ||
        `Request failed with status ${response.status}`,
    );
  }
  return (payload || {}) as T;
}
function getCompanyName(value: unknown, locale: Locale) {
  const company = asRecord(value);
  return (
    normalizeText(company.display_name) ||
    normalizeText(company.name) ||
    normalizeText(company.company_name) ||
    normalizeText(company.company_code) ||
    translations[locale].unknown
  );
}
function statusLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const normalized = value.toLowerCase();
  if (normalized === "active") return t.active;
  if (normalized === "inactive") return t.inactive;
  if (normalized === "available") return t.available;
  if (normalized === "missing") return t.missing;
  if (normalized === "pending") return t.pending;
  if (normalized === "completed") return t.completed;
  if (normalized === "failed") return t.failed;
  return value || t.unknown;
}
function typeLabel(value: UnifiedRow["type"], locale: Locale) {
  const t = translations[locale];
  if (value === "template") return t.template;
  if (value === "capability") return t.capability;
  if (value === "model") return t.model;
  if (value === "route") return t.route;
  if (value === "print_job") return t.printJob;
  return t.setting;
}
function statusBadgeClass(value: string) {
  const normalized = value.toLowerCase();
  if (["active", "available", "completed", "enabled", "true"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (["pending", "draft", "configured"].includes(normalized)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (["missing", "failed", "inactive", "disabled", "false"].includes(normalized)) {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-muted-foreground/30 bg-muted text-muted-foreground";
}
function typeBadgeClass(value: UnifiedRow["type"]) {
  if (value === "template") return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (value === "capability") return "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300";
  if (value === "model") return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300";
  if (value === "route") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (value === "print_job") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-muted-foreground/30 bg-muted text-muted-foreground";
}
function normalizeTemplate(value: unknown, index: number, locale: Locale): UnifiedRow {
  const item = asRecord(value);
  return {
    id: `template-${normalizeText(item.model)}-${normalizeText(item.id, String(index + 1))}`,
    numericId: normalizeNumber(item.id, index + 1),
    type: "template",
    category: normalizeText(item.document_type) || normalizeText(item.template_type) || "templates",
    name: normalizeText(item.name) || normalizeText(item.name_ar) || normalizeText(item.name_en) || translations[locale].unknown,
    code: normalizeText(item.code),
    companyName: getCompanyName(item.company, locale),
    status: normalizeBool(item.is_active, true) ? normalizeText(item.status, "active") : "inactive",
    path: normalizeText(item.paper_size) || normalizeText(item.orientation),
    countValue: 0,
    description: normalizeText(item.description) || normalizeText(item.template_type) || translations[locale].notAvailable,
    createdAt: normalizeText(item.created_at),
    updatedAt: normalizeText(item.updated_at),
  };
}
function normalizePrintJob(value: unknown, index: number, locale: Locale): UnifiedRow {
  const item = asRecord(value);
  return {
    id: `print-${normalizeText(item.model)}-${normalizeText(item.id, String(index + 1))}`,
    numericId: normalizeNumber(item.id, index + 1),
    type: "print_job",
    category: normalizeText(item.document_type) || "print",
    name: normalizeText(item.name) || normalizeText(item.printer_name) || translations[locale].printJob,
    code: normalizeText(item.code),
    companyName: getCompanyName(item.company, locale),
    status: normalizeText(item.status, "pending"),
    path: normalizeText(item.printer_name),
    countValue: normalizeNumber(item.copies, 1),
    description: normalizeText(item.document_type) || translations[locale].notAvailable,
    createdAt: normalizeText(item.created_at),
    updatedAt: normalizeText(item.updated_at),
  };
}
function normalizeCapability(value: unknown, index: number): UnifiedRow {
  const item = asRecord(value);
  return {
    id: `capability-${normalizeText(item.key, String(index + 1))}`,
    numericId: index + 1,
    type: "capability",
    category: normalizeText(item.category, "documents"),
    name: normalizeText(item.title, normalizeText(item.key)),
    code: normalizeText(item.key),
    companyName: "",
    status: "available",
    path: normalizeText(item.system_path) || normalizeText(item.company_path),
    countValue: 0,
    description: normalizeText(item.description),
    createdAt: "",
    updatedAt: "",
  };
}
function normalizeModel(value: unknown, index: number): UnifiedRow {
  const item = asRecord(value);
  const count = normalizeNumber(item.count);
  return {
    id: `model-${normalizeText(item.app_label)}-${normalizeText(item.model, String(index + 1))}`,
    numericId: index + 1,
    type: "model",
    category: normalizeText(item.app_label),
    name: normalizeText(item.model),
    code: normalizeText(item.db_table),
    companyName: normalizeBool(item.company_scoped) ? "company scoped" : "system",
    status: normalizeBool(item.has_status) ? "configured" : "available",
    path: normalizeText(item.db_table),
    countValue: count,
    description: `${normalizeText(item.app_label)} / ${normalizeText(item.model_name)}`,
    createdAt: "",
    updatedAt: "",
  };
}
function normalizeRoute(value: unknown, index: number): UnifiedRow {
  const item = asRecord(value);
  const available = normalizeBool(item.available, false);
  return {
    id: `route-${index}-${normalizeText(item.path)}`,
    numericId: index + 1,
    type: "route",
    category: normalizeText(item.url_name) || "route",
    name: normalizeText(item.url_name) || normalizeText(item.path),
    code: normalizeText(item.view),
    companyName: "",
    status: available ? "available" : "missing",
    path: normalizeText(item.path),
    countValue: available ? 1 : 0,
    description: normalizeText(item.error) || normalizeText(item.view),
    createdAt: "",
    updatedAt: "",
  };
}
function normalizeSetting(key: string, value: unknown, index: number): UnifiedRow {
  const isSimple = typeof value !== "object" || value === null;
  return {
    id: `setting-${key}`,
    numericId: index + 1,
    type: "setting",
    category: "settings",
    name: key.replaceAll("_", " "),
    code: key,
    companyName: "",
    status: isSimple ? String(Boolean(value)) : "configured",
    path: "",
    countValue: 0,
    description: isSimple ? normalizeText(value) : JSON.stringify(value),
    createdAt: "",
    updatedAt: "",
  };
}
function extractRows(payload: ApiRecord, mode: Mode, locale: Locale): UnifiedRow[] {
  const data = asRecord(payload.data);
  const rows: UnifiedRow[] = [];
  if (mode === "overview") {
    rows.push(...asArray(data.latest_templates).map((item, index) => normalizeTemplate(item, index, locale)));
    rows.push(...asArray(data.latest_print_jobs).map((item, index) => normalizePrintJob(item, index, locale)));
    rows.push(...asArray(data.capabilities).map(normalizeCapability));
    rows.push(...asArray(data.models).map(normalizeModel));
    return rows;
  }
  if (mode === "templates") {
    rows.push(...asArray(data.results || payload.results).map((item, index) => normalizeTemplate(item, index, locale)));
    rows.push(...asArray(data.models).map(normalizeModel));
    return rows;
  }
  if (mode === "rendering") {
    rows.push(...asArray(data.capabilities || payload.results).map(normalizeCapability));
    rows.push(...asArray(data.models).map(normalizeModel));
    rows.push(...asArray(data.routes).map(normalizeRoute));
    return rows;
  }
  if (mode === "thermal") {
    rows.push(...asArray(data.latest_print_jobs || payload.results).map((item, index) => {
      const record = asRecord(item);
      return normalizeText(record.key) ? normalizeCapability(item, index) : normalizePrintJob(item, index, locale);
    }));
    rows.push(...asArray(data.capabilities).map(normalizeCapability));
    rows.push(...asArray(data.models).map(normalizeModel));
    rows.push(...asArray(data.routes).map(normalizeRoute));
    return rows;
  }
  const settings = asRecord(data.settings);
  rows.push(...Object.entries(settings).map(([key, value], index) => normalizeSetting(key, value, index)));
  rows.push(...asArray(data.capabilities || payload.results).map(normalizeCapability));
  const routes = asRecord(data.routes);
  rows.push(...asArray(routes.system_routes).map(normalizeRoute));
  rows.push(...asArray(routes.company_routes).map(normalizeRoute));
  return rows;
}
function extractSummary(payload: ApiRecord, rows: UnifiedRow[]): Summary {
  const summary = asRecord(asRecord(payload.data).summary);
  return {
    documentModelsCount: normalizeNumber(summary.document_models_count, rows.filter((row) => row.type === "model").length),
    documentRecordsCount: normalizeNumber(summary.document_records_count, rows.length),
    templateModelsCount: normalizeNumber(summary.template_models_count),
    templateRecordsCount: normalizeNumber(summary.template_records_count, rows.filter((row) => row.type === "template").length),
    renderingModelsCount: normalizeNumber(summary.rendering_models_count),
    renderingRecordsCount: normalizeNumber(summary.rendering_records_count),
    printJobModelsCount: normalizeNumber(summary.print_job_models_count),
    printJobsCount: normalizeNumber(summary.print_jobs_count, rows.filter((row) => row.type === "print_job").length),
    companiesWithTemplates: normalizeNumber(summary.companies_with_templates),
    companiesWithPrintJobs: normalizeNumber(summary.companies_with_print_jobs),
    companyRoutesAvailableCount: normalizeNumber(summary.company_routes_available_count),
    systemRoutesAvailableCount: normalizeNumber(summary.system_routes_available_count),
  };
}
function buildExportRows(rows: UnifiedRow[], locale: Locale) {
  return rows.map((row) => [
    typeLabel(row.type, locale),
    row.category,
    row.name,
    row.code,
    row.companyName,
    statusLabel(row.status, locale),
    row.path,
    formatInteger(row.countValue),
    row.description,
    formatDateTime(row.createdAt || row.updatedAt, locale),
  ]);
}
function buildTableHtml(headers: string[], rows: string[][]) {
  return `
    <table border="1" cellspacing="0" cellpadding="6">
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}
function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-3 truncate text-3xl font-bold tabular-nums">
              {typeof value === "number" ? formatInteger(value) : value}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-2xl bg-muted p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
function DocumentsSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Card className="rounded-3xl">
          <CardHeader className="space-y-4">
            <Skeleton className="h-7 w-44 rounded-full" />
            <Skeleton className="h-10 w-80 rounded-xl" />
            <Skeleton className="h-5 w-full max-w-3xl rounded-xl" />
          </CardHeader>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardContent className="space-y-4 p-5">
                <Skeleton className="h-5 w-32 rounded-xl" />
                <Skeleton className="h-9 w-20 rounded-xl" />
                <Skeleton className="h-4 w-40 rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
export function SystemDocumentsCenter({ mode }: { mode: Mode }) {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [payload, setPayload] = React.useState<ApiRecord>({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<RowType>("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";
  const meta = pageMeta[mode];
  const HeroIcon = meta.icon;
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
  const loadDocuments = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const data = await fetchJson<ApiRecord>(ENDPOINTS[mode]);
        setPayload(data);
        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mode, t.errorDesc, t.refreshed],
  );
  React.useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);
  const rows = React.useMemo(() => extractRows(payload, mode, locale), [payload, mode, locale]);
  const summary = React.useMemo(() => extractSummary(payload, rows), [payload, rows]);
  const categories = React.useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.category).filter(Boolean))).sort();
  }, [rows]);
  const statuses = React.useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.status).filter(Boolean))).sort();
  }, [rows]);
  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        const matchesType = typeFilter === "all" || row.type === typeFilter;
        const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;
        const matchesStatus = statusFilter === "all" || row.status.toLowerCase() === statusFilter.toLowerCase();
        const haystack = [
          row.type,
          row.category,
          row.name,
          row.code,
          row.companyName,
          row.status,
          row.path,
          row.description,
        ]
          .join(" ")
          .toLowerCase();
        return matchesType && matchesCategory && matchesStatus && (!query || haystack.includes(query));
      })
      .sort((first, second) => {
        if (sort === "name") return first.name.localeCompare(second.name);
        if (sort === "type") return first.type.localeCompare(second.type);
        if (sort === "status") return first.status.localeCompare(second.status);
        const firstTime = new Date(first.updatedAt || first.createdAt).getTime() || first.numericId;
        const secondTime = new Date(second.updatedAt || second.createdAt).getTime() || second.numericId;
        return secondTime - firstTime;
      });
  }, [rows, search, sort, categoryFilter, statusFilter, typeFilter]);
  const hasFilters =
    Boolean(search) ||
    typeFilter !== "all" ||
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    sort !== "newest";
  function resetFilters() {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSort("newest");
  }
  function exportHeaders() {
    return [
      t.rowType,
      t.category,
      t.name,
      t.code,
      t.company,
      t.status,
      t.path,
      t.count,
      t.description,
      t.createdAt,
    ];
  }
  function exportExcel() {
    const exportRows = buildExportRows(filteredRows, locale);
    if (!exportRows.length) {
      toast.error(t.exportEmpty);
      return;
    }
    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml(exportHeaders(), exportRows)}
        </body>
      </html>
    `;
    const blob = new Blob([`\ufeff${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Mhamcloud-system-documents-${mode}-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function openPrintWindow(printMode: "print" | "pdf") {
    const exportRows = buildExportRows(filteredRows, locale);
    if (!exportRows.length) {
      toast.error(t.printEmpty);
      return;
    }
    if (printMode === "pdf") toast.info(t.pdfHint);
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
          <script>window.onload = function () { window.print(); };</script>
        </head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml(exportHeaders(), exportRows)}
        </body>
      </html>
    `);
    printWindow.document.close();
  }
  if (loading) return <DocumentsSkeleton />;
  if (error) {
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
            <Button onClick={() => void loadDocuments({ silent: true })} className="rounded-xl">
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
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-muted p-3 text-primary">
                    <HeroIcon className="h-6 w-6" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {String(t[meta.titleKey])}
                  </h1>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  {String(t[meta.subtitleKey])}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadDocuments({ silent: true })}
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
              </div>
            </div>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.documentModels} value={summary.documentModelsCount} description={t.fromLiveApi} icon={Database} />
          <KpiCard title={t.templateRecords} value={summary.templateRecordsCount} description={`${t.templates}: ${formatInteger(summary.templateModelsCount)}`} icon={LayoutTemplate} />
          <KpiCard title={t.routesAvailable} value={summary.systemRoutesAvailableCount} description={`${t.company}: ${formatInteger(summary.companyRoutesAvailableCount)}`} icon={ShieldCheck} />
          <KpiCard title={t.printJobs} value={summary.printJobsCount} description={`${t.companiesWithTemplates}: ${formatInteger(summary.companiesWithTemplates)}`} icon={Printer} />
        </section>
        <Card className="rounded-2xl border-border/70 bg-card shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2">
              <Link href="/system/documents" className={cn("inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium hover:bg-muted", mode === "overview" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background")}>
                <FileText className="h-4 w-4" />
                {t.overview}
              </Link>
              <Link href="/system/documents/templates" className={cn("inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium hover:bg-muted", mode === "templates" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background")}>
                <LayoutTemplate className="h-4 w-4" />
                {t.templates}
              </Link>
              <Link href="/system/documents/rendering" className={cn("inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium hover:bg-muted", mode === "rendering" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background")}>
                <Monitor className="h-4 w-4" />
                {t.rendering}
              </Link>
              <Link href="/system/documents/thermal" className={cn("inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium hover:bg-muted", mode === "thermal" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background")}>
                <Printer className="h-4 w-4" />
                {t.thermal}
              </Link>
              <Link href="/system/documents/settings" className={cn("inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium hover:bg-muted", mode === "settings" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background")}>
                <Settings className="h-4 w-4" />
                {t.settings}
              </Link>
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
                <Inbox className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(filteredRows.length)} {t.of} {formatInteger(rows.length)} {t.rows}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 xl:flex-row xl:items-center xl:justify-between">
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
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as RowType)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="template">{t.template}</SelectItem>
                    <SelectItem value="capability">{t.capability}</SelectItem>
                    <SelectItem value="model">{t.model}</SelectItem>
                    <SelectItem value="route">{t.route}</SelectItem>
                    <SelectItem value="print_job">{t.printJob}</SelectItem>
                    <SelectItem value="setting">{t.setting}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    {categories.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    {statuses.map((item) => (
                      <SelectItem key={item} value={item}>
                        {statusLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                    <SelectItem value="type">{t.typeSort}</SelectItem>
                    <SelectItem value="status">{t.statusSort}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
                <Link href="/system/api-contracts" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted">
                  <ClipboardList className="h-4 w-4" />
                  {t.apiContracts}
                </Link>
                <Link href="/system/release-readiness" className="inline-flex h-10 items-center gap-2 rounded-xl border bg-background px-4 text-sm font-medium hover:bg-muted">
                  <Activity className="h-4 w-4" />
                  {t.releaseReadiness}
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1260px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        <span className="inline-flex items-center gap-1">
                          <Layers3 className="h-3.5 w-3.5" />
                          {t.rowType}
                        </span>
                      </TableHead>
                      <TableHead className={cn("w-[150px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.category}
                      </TableHead>
                      <TableHead className={cn("w-[220px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          {t.name}
                        </span>
                      </TableHead>
                      <TableHead className={cn("w-[170px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.code}
                      </TableHead>
                      <TableHead className={cn("w-[190px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {t.company}
                        </span>
                      </TableHead>
                      <TableHead className={cn("w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.status}
                      </TableHead>
                      <TableHead className={cn("w-[240px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.path}
                      </TableHead>
                      <TableHead className={cn("w-[80px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.count}
                      </TableHead>
                      <TableHead className={cn("w-[270px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.description}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length ? (
                      filteredRows.map((row) => (
                        <TableRow key={row.id} className="h-[76px]">
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <Badge variant="outline" className={cn("rounded-full", typeBadgeClass(row.type))}>
                              {typeLabel(row.type, locale)}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle text-sm", alignClass)}>
                            <span className="block truncate">{row.category || t.notAvailable}</span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm font-semibold">{row.name || t.notAvailable}</span>
                            <span className="block truncate text-xs text-muted-foreground">#{row.numericId}</span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <code className="block truncate rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                              {row.code || t.notAvailable}
                            </code>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm">{row.companyName || t.notAvailable}</span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <Badge variant="outline" className={cn("rounded-full", statusBadgeClass(row.status))}>
                              {statusLabel(row.status, locale)}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="block truncate text-xs text-muted-foreground">
                              {row.path || t.notAvailable}
                            </span>
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle text-sm font-semibold tabular-nums", alignClass)}>
                            {formatInteger(row.countValue)}
                          </TableCell>
                          <TableCell className={cn("px-4 align-middle", alignClass)}>
                            <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {row.description || t.notAvailable}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="h-64 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                            <div className="rounded-full bg-muted p-4 text-muted-foreground">
                              <Inbox className="h-8 w-8" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{hasFilters ? t.noResultsTitle : t.emptyTitle}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {hasFilters ? t.noResultsDesc : t.emptyDesc}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="rounded-2xl border-border/70 bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {t.routesAvailable}
                  </CardTitle>
                  <CardDescription>
                    System: {formatInteger(summary.systemRoutesAvailableCount)} · Company: {formatInteger(summary.companyRoutesAvailableCount)}
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="rounded-2xl border-border/70 bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LayoutTemplate className="h-4 w-4 text-primary" />
                    {t.templates}
                  </CardTitle>
                  <CardDescription>
                    {t.templateRecords}: {formatInteger(summary.templateRecordsCount)} · {t.companiesWithTemplates}: {formatInteger(summary.companiesWithTemplates)}
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="rounded-2xl border-border/70 bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Printer className="h-4 w-4 text-primary" />
                    {t.printJobs}
                  </CardTitle>
                  <CardDescription>
                    {t.printJobs}: {formatInteger(summary.printJobsCount)} · {t.company}: {formatInteger(summary.companiesWithPrintJobs)}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
