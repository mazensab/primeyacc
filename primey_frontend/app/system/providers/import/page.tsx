"use client";

/* ============================================================
   📂 primey_frontend/app/system/providers/import/page.tsx
   🧠 Primey Care | Providers Excel Import Page
   ------------------------------------------------------------
   ✅ استيراد الشبكة الطبية لمقدمي الخدمة
   ✅ Dry Run قبل الحفظ
   ✅ تنفيذ الاستيراد الفعلي بعد المراجعة
   ✅ CSRF support for Django POST FormData
   ✅ Full width layout
   ✅ Error State مستقل
   ✅ Empty State ذكي
   ✅ Arabic / English عبر primey-locale
   ✅ toast من sonner
   ✅ بدون localhost hardcoded
   ✅ بدون بيانات وهمية
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
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
import { Skeleton } from "@/components/ui/skeleton";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type ImportIssue = {
  row: string;
  message: string;
  field: string;
  value: string;
};

type ImportPreviewRow = {
  row: string;
  name: string;
  name_ar: string;
  name_en: string;
  city: string;
  region: string;
  category: string;
  phone: string;
  status: string;
};

type ImportResult = {
  total_rows: number;
  valid_rows: number;
  saved_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  duplicate_count: number;
  warnings_count: number;
  dry_run: boolean;
  message: string;
  preview: ImportPreviewRow[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
};

type UploadState = "idle" | "checking" | "saving";

const translations = {
  ar: {
    title: "استيراد مقدمي الخدمة",
    subtitle: "استيراد الشبكة الطبية من ملف Excel مع مراجعة النتائج قبل الحفظ.",
    back: "العودة لمقدمي الخدمة",
    providers: "مقدمو الخدمة",
    list: "قائمة مقدمي الخدمة",
    chooseFile: "اختر ملف Excel",
    chooseFileDescription: "ارفع ملف مقدمي الخدمة ثم نفذ مراجعة أولية قبل الحفظ.",
    selectedFile: "الملف المحدد",
    noFile: "لم يتم اختيار ملف بعد",
    remove: "إزالة",
    review: "مراجعة قبل الحفظ",
    saveImport: "تنفيذ الاستيراد",
    reviewing: "جاري المراجعة...",
    saving: "جاري الحفظ...",
    refresh: "تحديث الصفحة",
    allowedTypes: "يدعم ملفات Excel بصيغ xlsx و xls و csv عند دعمها من الخادم.",
    reviewFirst: "نفذ المراجعة أولًا قبل الحفظ.",
    fileRequired: "اختر ملف Excel أولًا.",
    reviewSuccess: "تمت مراجعة الملف بنجاح.",
    saveSuccess: "تم تنفيذ الاستيراد بنجاح.",
    requestFailed: "تعذر تنفيذ العملية.",
    summary: "ملخص الاستيراد",
    totalRows: "إجمالي الصفوف",
    validRows: "صفوف صالحة",
    saved: "تم حفظها",
    updated: "تم تحديثها",
    skipped: "متجاهلة",
    failed: "فاشلة",
    duplicates: "تكرارات",
    warnings: "تحذيرات",
    preview: "معاينة البيانات",
    previewDescription: "أول الصفوف المقروءة من الملف للمراجعة قبل الحفظ.",
    issues: "الملاحظات والأخطاء",
    issuesDescription: "راجع الصفوف التي تحتاج تصحيحًا قبل إعادة الرفع.",
    noIssues: "لا توجد أخطاء أو تحذيرات ظاهرة.",
    noPreview: "ستظهر المعاينة بعد اختيار الملف وتنفيذ المراجعة.",
    emptyTitle: "ابدأ برفع ملف الشبكة الطبية",
    emptyDescription: "اختر ملف Excel ثم اضغط مراجعة قبل الحفظ للتأكد من جودة البيانات.",
    row: "الصف",
    name: "الاسم",
    city: "المدينة",
    region: "المنطقة",
    category: "التصنيف",
    phone: "الهاتف",
    status: "الحالة",
    field: "الحقل",
    value: "القيمة",
    message: "الملاحظة",
    error: "خطأ",
    warning: "تحذير",
    readyToSave: "جاهز للحفظ",
    needsReview: "يحتاج مراجعة",
    savedBadge: "تم الحفظ",
    dryRunBadge: "مراجعة فقط",
    operationalNote: "لن يتم حفظ أي بيانات أثناء المراجعة الأولية. الحفظ يتم فقط عند الضغط على تنفيذ الاستيراد.",
    importGuideTitle: "طريقة الاستخدام",
    importGuideOne: "اختر ملف الشبكة الطبية.",
    importGuideTwo: "اضغط مراجعة قبل الحفظ.",
    importGuideThree: "راجع الملخص والأخطاء إن وجدت.",
    importGuideFour: "بعد التأكد، اضغط تنفيذ الاستيراد.",
  },
  en: {
    title: "Import Providers",
    subtitle: "Import the medical network from Excel and review results before saving.",
    back: "Back to providers",
    providers: "Providers",
    list: "Providers list",
    chooseFile: "Choose Excel file",
    chooseFileDescription: "Upload a providers file, then run a review before saving.",
    selectedFile: "Selected file",
    noFile: "No file selected yet",
    remove: "Remove",
    review: "Review before saving",
    saveImport: "Run import",
    reviewing: "Reviewing...",
    saving: "Saving...",
    refresh: "Refresh page",
    allowedTypes: "Supports xlsx, xls, and csv files when supported by the server.",
    reviewFirst: "Run review before saving.",
    fileRequired: "Choose an Excel file first.",
    reviewSuccess: "File reviewed successfully.",
    saveSuccess: "Import completed successfully.",
    requestFailed: "Could not complete the operation.",
    summary: "Import summary",
    totalRows: "Total rows",
    validRows: "Valid rows",
    saved: "Saved",
    updated: "Updated",
    skipped: "Skipped",
    failed: "Failed",
    duplicates: "Duplicates",
    warnings: "Warnings",
    preview: "Data preview",
    previewDescription: "First rows read from the file for review before saving.",
    issues: "Notes and errors",
    issuesDescription: "Review rows that need correction before uploading again.",
    noIssues: "No visible errors or warnings.",
    noPreview: "Preview will appear after choosing a file and running review.",
    emptyTitle: "Start by uploading the medical network file",
    emptyDescription: "Choose an Excel file, then click review before saving to validate the data.",
    row: "Row",
    name: "Name",
    city: "City",
    region: "Region",
    category: "Category",
    phone: "Phone",
    status: "Status",
    field: "Field",
    value: "Value",
    message: "Note",
    error: "Error",
    warning: "Warning",
    readyToSave: "Ready to save",
    needsReview: "Needs review",
    savedBadge: "Saved",
    dryRunBadge: "Review only",
    operationalNote: "No data is saved during the review step. Data is saved only when you run the import.",
    importGuideTitle: "How to use",
    importGuideOne: "Choose the medical network file.",
    importGuideTwo: "Click review before saving.",
    importGuideThree: "Review the summary and issues, if any.",
    importGuideFour: "After confirming, run the import.",
  },
} as const;

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";

  const stored = window.localStorage.getItem("primey-locale");

  return stored === "en" ? "en" : "ar";
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) return parts.pop()?.split(";").shift() || "";

  return "";
}

function getApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  return configured.replace(/\/+$/, "");
}

function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) return normalizedPath;

  return `${baseUrl}${normalizedPath}`;
}

function isRecord(value: unknown): value is ApiRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function pickRecord(...values: unknown[]): ApiRecord {
  for (const value of values) {
    if (isRecord(value)) return value;
  }

  return {};
}

function normalizeIssue(raw: unknown): ImportIssue {
  if (!isRecord(raw)) {
    return {
      row: "",
      message: asString(raw),
      field: "",
      value: "",
    };
  }

  return {
    row: asString(raw.row || raw.row_number || raw.line || raw.index),
    message: asString(raw.message || raw.error || raw.detail || raw.reason),
    field: asString(raw.field || raw.column || raw.key),
    value: asString(raw.value || raw.raw_value),
  };
}

function normalizePreviewRow(raw: unknown, index: number): ImportPreviewRow {
  if (!isRecord(raw)) {
    return {
      row: String(index + 1),
      name: asString(raw),
      name_ar: "",
      name_en: "",
      city: "",
      region: "",
      category: "",
      phone: "",
      status: "",
    };
  }

  return {
    row: asString(raw.row || raw.row_number || raw.line || index + 1),
    name: asString(raw.name || raw.provider_name || raw.display_name),
    name_ar: asString(raw.name_ar || raw.arabic_name),
    name_en: asString(raw.name_en || raw.english_name),
    city: asString(raw.city || raw.area),
    region: asString(raw.region),
    category: asString(raw.category || raw.source_category || raw.provider_type),
    phone: asString(raw.phone || raw.mobile || raw.contact_phone),
    status: asString(raw.status || raw.action || raw.result),
  };
}

function normalizeImportResult(payload: unknown, dryRun: boolean): ImportResult {
  const root = pickRecord(payload);
  const data = pickRecord(root.data, root.result, root.summary, root);

  const previewSource =
    root.preview ||
    data.preview ||
    data.rows ||
    data.items ||
    data.results ||
    [];

  const errorsSource = root.errors || data.errors || data.failed_rows || [];
  const warningsSource = root.warnings || data.warnings || data.warning_rows || [];

  const preview = Array.isArray(previewSource)
    ? previewSource.slice(0, 25).map((item, index) => normalizePreviewRow(item, index))
    : [];

  const errors = Array.isArray(errorsSource)
    ? errorsSource.slice(0, 50).map(normalizeIssue)
    : isRecord(errorsSource)
      ? Object.entries(errorsSource).map(([field, message]) => ({
          row: "",
          field,
          value: "",
          message: Array.isArray(message)
            ? message.map((item) => asString(item)).filter(Boolean).join(" ")
            : asString(message),
        }))
      : [];

  const warnings = Array.isArray(warningsSource)
    ? warningsSource.slice(0, 50).map(normalizeIssue)
    : [];

  const totalRows =
    asNumber(data.total_rows) ||
    asNumber(data.rows_count) ||
    asNumber(data.total) ||
    asNumber(data.processed_rows) ||
    preview.length;

  const savedCount =
    asNumber(data.saved_count) ||
    asNumber(data.imported_count) ||
    asNumber(data.created_count) ||
    asNumber(data.created) ||
    0;

  const updatedCount =
    asNumber(data.updated_count) ||
    asNumber(data.updated) ||
    0;

  const skippedCount =
    asNumber(data.skipped_count) ||
    asNumber(data.skipped) ||
    0;

  const failedCount =
    asNumber(data.failed_count) ||
    asNumber(data.errors_count) ||
    errors.length;

  const duplicateCount =
    asNumber(data.duplicate_count) ||
    asNumber(data.duplicates_count) ||
    asNumber(data.duplicates) ||
    0;

  const validRows =
    asNumber(data.valid_rows) ||
    asNumber(data.valid_count) ||
    Math.max(totalRows - failedCount, 0);

  return {
    total_rows: totalRows,
    valid_rows: validRows,
    saved_count: savedCount,
    updated_count: updatedCount,
    skipped_count: skippedCount,
    failed_count: failedCount,
    duplicate_count: duplicateCount,
    warnings_count:
      asNumber(data.warnings_count) ||
      asNumber(data.warning_count) ||
      warnings.length,
    dry_run: Boolean(data.dry_run ?? root.dry_run ?? dryRun),
    message: asString(root.message || data.message || root.detail),
    preview,
    errors,
    warnings,
  };
}

function extractApiError(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;

  const direct =
    asString(payload.message) ||
    asString(payload.detail) ||
    asString(payload.error);

  if (direct) return direct;

  const errors = payload.errors;

  if (typeof errors === "string") return errors;

  if (Array.isArray(errors)) {
    return errors.map((item) => asString(item)).filter(Boolean).join(" ") || fallback;
  }

  if (isRecord(errors)) {
    const first = Object.values(errors)[0];

    if (Array.isArray(first)) return first.map((item) => asString(item)).filter(Boolean).join(" ");
    if (typeof first === "string") return first;
  }

  return fallback;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function bytesToSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "bg-red-50 text-red-700"
          : "bg-muted text-foreground";

  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`mt-3 inline-flex rounded-lg px-2.5 py-1 text-xl font-semibold ${toneClass}`}>
          {formatNumber(value)}
        </div>
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Skeleton className="h-[420px] rounded-lg" />
        <Skeleton className="h-[520px] rounded-lg" />
      </div>
    </div>
  );
}

export default function ProvidersImportPage() {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [mounted, setMounted] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [uploadState, setUploadState] = React.useState<UploadState>("idle");
  const [pageError, setPageError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;
  const isBusy = uploadState !== "idle";
  const canSave = Boolean(file && result && result.failed_count === 0 && result.valid_rows > 0);

  React.useEffect(() => {
    setMounted(true);

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

  const clearFile = React.useCallback(() => {
    setFile(null);
    setResult(null);
    setPageError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleFileChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;

    setFile(selected);
    setResult(null);
    setPageError("");
  }, []);

  const runImport = React.useCallback(
    async (dryRun: boolean) => {
      if (!file) {
        toast.error(t.fileRequired);
        return;
      }

      setUploadState(dryRun ? "checking" : "saving");
      setPageError("");

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("dry_run", dryRun ? "true" : "false");

        const response = await fetch(apiUrl("/api/providers/import-excel/"), {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
          },
          body: formData,
        });

        let payload: unknown = null;

        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          throw new Error(extractApiError(payload, t.requestFailed));
        }

        const normalized = normalizeImportResult(payload, dryRun);

        setResult(normalized);

        if (dryRun) {
          toast.success(normalized.message || t.reviewSuccess);
        } else {
          toast.success(normalized.message || t.saveSuccess);
        }
      } catch (requestError) {
        const message =
          requestError instanceof Error && requestError.message
            ? requestError.message
            : t.requestFailed;

        setPageError(message);
        toast.error(message);
      } finally {
        setUploadState("idle");
      }
    },
    [file, t.fileRequired, t.requestFailed, t.reviewSuccess, t.saveSuccess],
  );

  if (!mounted) return <PageSkeleton />;

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/system/providers" className="hover:text-foreground">
              {t.providers}
            </Link>
            <span>/</span>
            <span className="text-foreground">{t.title}</span>
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/system/providers">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/system/providers/list">
              <FileSpreadsheet className="h-4 w-4" />
              {t.list}
            </Link>
          </Button>

          <Button
            variant="outline"
            type="button"
            onClick={() => window.location.reload()}
            disabled={isBusy}
          >
            <RefreshCw className="h-4 w-4" />
            {t.refresh}
          </Button>
        </div>
      </div>

      {pageError ? (
        <Card className="border-red-200 bg-red-50/70 shadow-none">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-red-100 p-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-red-900">{t.requestFailed}</div>
              <div className="text-sm text-red-700">{pageError}</div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {t.chooseFile}
              </CardTitle>
              <CardDescription>{t.chooseFileDescription}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="rounded-full bg-background p-3 shadow-sm">
                  <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="mt-3 font-semibold">{t.chooseFile}</div>
                <div className="mt-1 max-w-xs text-sm text-muted-foreground">{t.allowedTypes}</div>
              </button>

              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="rounded-lg border bg-background p-3">
                <div className="text-sm text-muted-foreground">{t.selectedFile}</div>

                {file ? (
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{bytesToSize(file.size)}</div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearFile}
                      disabled={isBusy}
                    >
                      <X className="h-4 w-4" />
                      {t.remove}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 text-sm font-medium">{t.noFile}</div>
                )}
              </div>

              <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t.operationalNote}</span>
                </div>
              </div>

              <div className="grid gap-2">
                <Button
                  type="button"
                  className="bg-foreground text-background hover:bg-foreground/90"
                  disabled={!file || isBusy}
                  onClick={() => void runImport(true)}
                >
                  {uploadState === "checking" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  {uploadState === "checking" ? t.reviewing : t.review}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={!canSave || isBusy}
                  onClick={() => void runImport(false)}
                >
                  {uploadState === "saving" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {uploadState === "saving" ? t.saving : t.saveImport}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>{t.importGuideTitle}</CardTitle>
            </CardHeader>

            <CardContent>
              <ol className="space-y-3 text-sm text-muted-foreground">
                {[t.importGuideOne, t.importGuideTwo, t.importGuideThree, t.importGuideFour].map(
                  (item, index) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                        {index + 1}
                      </span>
                      <span className="pt-0.5">{item}</span>
                    </li>
                  ),
                )}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {result ? (
            <>
              <Card className="shadow-none">
                <CardHeader className="border-b">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle>{t.summary}</CardTitle>
                      <CardDescription>
                        {result.message || t.chooseFileDescription}
                      </CardDescription>
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        result.dry_run
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }
                    >
                      {result.dry_run ? t.dryRunBadge : t.savedBadge}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard label={t.totalRows} value={result.total_rows} />
                  <SummaryCard label={t.validRows} value={result.valid_rows} tone="success" />
                  <SummaryCard label={t.saved} value={result.saved_count} tone="success" />
                  <SummaryCard label={t.updated} value={result.updated_count} />
                  <SummaryCard label={t.skipped} value={result.skipped_count} tone="warning" />
                  <SummaryCard label={t.failed} value={result.failed_count} tone="danger" />
                  <SummaryCard label={t.duplicates} value={result.duplicate_count} tone="warning" />
                  <SummaryCard label={t.warnings} value={result.warnings_count} tone="warning" />
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle>{t.preview}</CardTitle>
                  <CardDescription>{t.previewDescription}</CardDescription>
                </CardHeader>

                <CardContent>
                  {result.preview.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border bg-background">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[920px] text-sm">
                          <thead className="bg-muted/50">
                            <tr className="border-b">
                              <th className="h-11 px-3 text-start font-medium">{t.row}</th>
                              <th className="h-11 px-3 text-start font-medium">{t.name}</th>
                              <th className="h-11 px-3 text-start font-medium">{t.region}</th>
                              <th className="h-11 px-3 text-start font-medium">{t.city}</th>
                              <th className="h-11 px-3 text-start font-medium">{t.category}</th>
                              <th className="h-11 px-3 text-start font-medium">{t.phone}</th>
                              <th className="h-11 px-3 text-start font-medium">{t.status}</th>
                            </tr>
                          </thead>

                          <tbody>
                            {result.preview.map((row, index) => (
                              <tr key={`${row.row}-${index}`} className="border-b last:border-b-0">
                                <td className="h-[58px] px-3 text-muted-foreground">{row.row}</td>
                                <td className="h-[58px] px-3">
                                  <div className="font-medium">
                                    {row.name || row.name_ar || row.name_en || "-"}
                                  </div>
                                  {row.name_ar || row.name_en ? (
                                    <div className="text-xs text-muted-foreground">
                                      {[row.name_ar, row.name_en].filter(Boolean).join(" · ")}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="h-[58px] px-3">{row.region || "-"}</td>
                                <td className="h-[58px] px-3">{row.city || "-"}</td>
                                <td className="h-[58px] px-3">{row.category || "-"}</td>
                                <td className="h-[58px] px-3">{row.phone || "-"}</td>
                                <td className="h-[58px] px-3">
                                  <Badge variant="outline">{row.status || t.readyToSave}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border bg-muted/20 p-6 text-center">
                      <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                      <div className="mt-3 font-semibold">{t.noPreview}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle>{t.issues}</CardTitle>
                  <CardDescription>{t.issuesDescription}</CardDescription>
                </CardHeader>

                <CardContent>
                  {result.errors.length || result.warnings.length ? (
                    <div className="overflow-hidden rounded-lg border bg-background">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                          <thead className="bg-muted/50">
                            <tr className="border-b">
                              <th className="h-11 px-3 text-start font-medium">{t.status}</th>
                              <th className="h-11 px-3 text-start font-medium">{t.row}</th>
                              <th className="h-11 px-3 text-start font-medium">{t.field}</th>
                              <th className="h-11 px-3 text-start font-medium">{t.value}</th>
                              <th className="h-11 px-3 text-start font-medium">{t.message}</th>
                            </tr>
                          </thead>

                          <tbody>
                            {[
                              ...result.errors.map((item) => ({ ...item, kind: "error" as const })),
                              ...result.warnings.map((item) => ({ ...item, kind: "warning" as const })),
                            ].map((issue, index) => (
                              <tr key={`${issue.kind}-${issue.row}-${index}`} className="border-b last:border-b-0">
                                <td className="h-[58px] px-3">
                                  <Badge
                                    variant="outline"
                                    className={
                                      issue.kind === "error"
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : "border-amber-200 bg-amber-50 text-amber-700"
                                    }
                                  >
                                    {issue.kind === "error" ? t.error : t.warning}
                                  </Badge>
                                </td>
                                <td className="h-[58px] px-3">{issue.row || "-"}</td>
                                <td className="h-[58px] px-3">{issue.field || "-"}</td>
                                <td className="h-[58px] px-3">{issue.value || "-"}</td>
                                <td className="h-[58px] px-3">{issue.message || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border bg-muted/20 p-6 text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                      <div className="mt-3 font-semibold">{t.noIssues}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="shadow-none">
              <CardContent className="flex min-h-[520px] flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full bg-muted p-4">
                  <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">{t.emptyTitle}</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">{t.emptyDescription}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}