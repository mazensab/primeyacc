"use client";

/* ============================================================
   📂 app/system/accounting/cost-centers/create/page.tsx
   🧾 Primey Care — Create Accounting Cost Center
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders form pattern
   ✅ Real API:
      GET  /api/accounting/cost-centers/?page=1&page_size=500
      POST /api/accounting/cost-centers/
      fallback:
      POST /api/accounting/cost-centers/create/
      POST /api/accounting/cost_centers/
   ✅ Premium form + side readiness summary
   ✅ Auto-generated cost center code
   ✅ Parent cost center selector
   ✅ CSRF
   ✅ Field validation
   ✅ Unsaved changes protection
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  FolderTree,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  id?: unknown;
  pk?: unknown;
  uuid?: unknown;
  data?: unknown;
  item?: unknown;
  cost_center?: unknown;
  costCenter?: unknown;
  result?: unknown;
  results?: unknown[];
  items?: unknown[];
  rows?: unknown[];
  message?: string;
  detail?: string;
  error?: string;
};

type CostCenterType =
  | "department"
  | "branch"
  | "project"
  | "provider"
  | "agent"
  | "operation"
  | "other";

type CostCenterStatus = "active" | "inactive" | "draft" | "archived";

type CostCenterOption = {
  id: string;
  code: string;
  name: string;
  type: CostCenterType;
  status: string;
};

type FormState = {
  name: string;
  code: string;
  type: CostCenterType;
  status: CostCenterStatus;
  parent_id: string;
  manager_name: string;
  budget_amount: string;
  notes: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  name: "",
  code: "",
  type: "operation",
  status: "active",
  parent_id: "",
  manager_name: "",
  budget_amount: "",
  notes: "",
};

const translations = {
  ar: {
    title: "إنشاء مركز تكلفة",
    subtitle: "أضف مركز تكلفة جديد لاستخدامه في التقارير والحركات المحاسبية.",
    back: "مراكز التكلفة",
    save: "حفظ مركز التكلفة",
    saving: "جاري الحفظ...",
    clear: "تفريغ",
    refresh: "تحديث المراكز",
    generateCode: "توليد الكود",

    formTitle: "بيانات مركز التكلفة",
    formDesc: "أدخل البيانات الأساسية لمركز التكلفة.",
    optionsTitle: "الربط والتشغيل",
    optionsDesc: "اربط المركز بمركز أب ومسؤول داخلي عند الحاجة.",
    summaryTitle: "ملخص الجاهزية",
    summaryDesc: "تحقق سريع قبل الحفظ.",

    name: "اسم مركز التكلفة",
    namePlaceholder: "مثال: عمليات البطاقات",
    code: "كود المركز",
    codePlaceholder: "مثال: CC-0001",
    type: "نوع المركز",
    status: "الحالة",
    parent: "المركز الأب",
    parentPlaceholder: "بدون مركز أب",
    manager: "المسؤول",
    managerPlaceholder: "اسم المسؤول أو القسم",
    budget: "الميزانية التقديرية",
    budgetPlaceholder: "0.00",
    notes: "الوصف / الملاحظات",
    notesPlaceholder: "اكتب وصفًا أو ملاحظات داخلية عن مركز التكلفة...",

    department: "قسم",
    branch: "فرع",
    project: "مشروع",
    provider: "مقدم خدمة",
    agent: "مندوب",
    operation: "تشغيلي",
    other: "أخرى",

    active: "نشط",
    inactive: "غير نشط",
    draft: "مسودة",
    archived: "مؤرشف",

    ready: "جاهز للحفظ",
    notReady: "بيانات مطلوبة",
    basicData: "البيانات الأساسية",
    typeReady: "نوع المركز",
    statusReady: "الحالة",
    budgetReady: "الميزانية",

    requiredName: "اسم مركز التكلفة مطلوب.",
    requiredCode: "كود مركز التكلفة مطلوب.",
    invalidBudget: "الميزانية يجب أن تكون رقمًا صحيحًا.",
    saveSuccess: "تم إنشاء مركز التكلفة بنجاح.",
    saveError: "تعذر إنشاء مركز التكلفة.",
    loadParentsError: "تعذر تحميل مراكز التكلفة.",
    unsavedConfirm: "لديك تغييرات غير محفوظة. هل تريد المغادرة؟",
    clearConfirm: "هل تريد تفريغ النموذج؟",
    tryAgain: "إعادة المحاولة",
    noParents: "لا توجد مراكز تكلفة متاحة كأب.",
    sar: "ر.س",
    unknown: "غير محدد",
  },
  en: {
    title: "Create Cost Center",
    subtitle: "Add a new cost center for reports and accounting transactions.",
    back: "Cost centers",
    save: "Save cost center",
    saving: "Saving...",
    clear: "Clear",
    refresh: "Refresh centers",
    generateCode: "Generate code",

    formTitle: "Cost center details",
    formDesc: "Enter the main cost center information.",
    optionsTitle: "Linking and operation",
    optionsDesc: "Link the center to a parent center and internal manager when needed.",
    summaryTitle: "Readiness summary",
    summaryDesc: "Quick check before saving.",

    name: "Cost center name",
    namePlaceholder: "Example: Card operations",
    code: "Center code",
    codePlaceholder: "Example: CC-0001",
    type: "Center type",
    status: "Status",
    parent: "Parent center",
    parentPlaceholder: "No parent center",
    manager: "Manager",
    managerPlaceholder: "Manager or department name",
    budget: "Estimated budget",
    budgetPlaceholder: "0.00",
    notes: "Description / notes",
    notesPlaceholder: "Write a description or internal notes about this cost center...",

    department: "Department",
    branch: "Branch",
    project: "Project",
    provider: "Provider",
    agent: "Agent",
    operation: "Operation",
    other: "Other",

    active: "Active",
    inactive: "Inactive",
    draft: "Draft",
    archived: "Archived",

    ready: "Ready to save",
    notReady: "Required data",
    basicData: "Basic data",
    typeReady: "Center type",
    statusReady: "Status",
    budgetReady: "Budget",

    requiredName: "Cost center name is required.",
    requiredCode: "Cost center code is required.",
    invalidBudget: "Budget must be a valid number.",
    saveSuccess: "Cost center created successfully.",
    saveError: "Unable to create cost center.",
    loadParentsError: "Unable to load cost centers.",
    unsavedConfirm: "You have unsaved changes. Do you want to leave?",
    clearConfirm: "Do you want to clear the form?",
    tryAgain: "Try again",
    noParents: "No parent cost centers available.",
    sar: "SAR",
    unknown: "Unknown",
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
  const cleaned = String(value).trim();
  return cleaned || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          ""
        ).replace(/\/+$/, "")
      : "";

  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}

function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")[1] || ""
  );
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": decodeURIComponent(csrfToken) } : {}),
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let payload: any = null;

  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.detail ||
      payload?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (payload || {}) as T;
}

function extractArray(payload: ApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  const data = asRecord(payload.data);

  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.cost_centers)) return data.cost_centers;
  if (Array.isArray(data.costCenters)) return data.costCenters;
  if (Array.isArray(data.centers)) return data.centers;

  return [];
}

function extractCreatedId(payload: ApiResponse) {
  const data = asRecord(payload.data);
  const item = asRecord(
    payload.item ||
      payload.cost_center ||
      payload.costCenter ||
      payload.result,
  );

  return normalizeText(
    payload.id ||
      payload.pk ||
      payload.uuid ||
      data.id ||
      data.pk ||
      data.uuid ||
      item.id ||
      item.pk ||
      item.uuid,
  );
}

function normalizeType(value: unknown): CostCenterType {
  const type = normalizeText(value).toLowerCase();

  if (["department", "dept", "section"].includes(type)) return "department";
  if (["branch", "location"].includes(type)) return "branch";
  if (["project", "program"].includes(type)) return "project";
  if (["provider", "center", "service_provider"].includes(type)) return "provider";
  if (["agent", "sales_agent", "delivery_agent"].includes(type)) return "agent";
  if (["operation", "operational", "ops"].includes(type)) return "operation";

  return "other";
}

function normalizeOption(value: unknown): CostCenterOption {
  const item = asRecord(value);
  const id = normalizeText(item.id || item.pk || item.uuid);

  return {
    id,
    code: normalizeText(item.code || item.cost_center_code || item.center_code || item.number),
    name:
      normalizeText(item.name || item.title || item.cost_center_name || item.name_ar || item.name_en) ||
      (id ? `#${id}` : ""),
    type: normalizeType(item.type || item.center_type || item.cost_center_type || item.category),
    status: normalizeText(item.status || item.center_status || "active"),
  };
}

function typeLabel(type: CostCenterType, locale: Locale) {
  const t = translations[locale];

  if (type === "department") return t.department;
  if (type === "branch") return t.branch;
  if (type === "project") return t.project;
  if (type === "provider") return t.provider;
  if (type === "agent") return t.agent;
  if (type === "operation") return t.operation;

  return t.other;
}

function statusLabel(status: CostCenterStatus, locale: Locale) {
  const t = translations[locale];

  if (status === "active") return t.active;
  if (status === "inactive") return t.inactive;
  if (status === "draft") return t.draft;

  return t.archived;
}

function getStatusClass(status: CostCenterStatus) {
  if (status === "active") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "inactive") {
    return "border-slate-500/30 bg-slate-50 text-slate-700 hover:bg-slate-50";
  }

  if (status === "draft") {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
}

function getTypeClass(type: CostCenterType) {
  if (type === "department") {
    return "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50";
  }

  if (type === "branch") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  if (type === "project") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (type === "provider") {
    return "border-cyan-500/30 bg-cyan-50 text-cyan-700 hover:bg-cyan-50";
  }

  if (type === "agent") {
    return "border-orange-500/30 bg-orange-50 text-orange-700 hover:bg-orange-50";
  }

  if (type === "operation") {
    return "border-indigo-500/30 bg-indigo-50 text-indigo-700 hover:bg-indigo-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

function generateCostCenterCode(existingCenters: CostCenterOption[]) {
  const maxNumber = existingCenters.reduce((max, center) => {
    const match = center.code.match(/CC[-_ ]?(\d+)/i);
    if (!match) return max;

    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return `CC-${String(maxNumber + 1).padStart(4, "0")}`;
}

function ReadinessItem({
  ready,
  label,
}: {
  ready: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {ready ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <TriangleAlert className="h-4 w-4 text-amber-600" />
      )}
    </div>
  );
}

function CreateSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-4 p-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CreateAccountingCostCenterPage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [parentCenters, setParentCenters] = React.useState<CostCenterOption[]>([]);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});

  const [loadingParents, setLoadingParents] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [submitError, setSubmitError] = React.useState("");
  const [dirty, setDirty] = React.useState(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

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

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || saving) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty, saving]);

  const loadParentCenters = React.useCallback(async () => {
    const controller = new AbortController();

    try {
      setLoadingParents(true);
      setLoadError("");

      const params = new URLSearchParams({
        page: "1",
        page_size: "500",
      });

      const endpoints = [
        "/api/accounting/cost-centers/",
        "/api/accounting/reports/cost-centers/",
        "/api/accounting/cost_centers/",
      ];

      let payload: ApiResponse | null = null;
      let lastError: unknown = null;

      for (const endpoint of endpoints) {
        try {
          payload = await fetchJson<ApiResponse>(makeApiUrl(endpoint, params), {
            method: "GET",
            signal: controller.signal,
          });
          break;
        } catch (caughtError) {
          lastError = caughtError;
        }
      }

      if (!payload) {
        throw lastError instanceof Error ? lastError : new Error(t.loadParentsError);
      }

      const centers = extractArray(payload)
        .map(normalizeOption)
        .filter((center) => center.id || center.name || center.code)
        .sort((a, b) => a.name.localeCompare(b.name));

      setParentCenters(centers);

      setForm((current) => {
        if (current.code.trim()) return current;

        return {
          ...current,
          code: generateCostCenterCode(centers),
        };
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.loadParentsError;

      setLoadError(message);
      setParentCenters([]);

      setForm((current) => {
        if (current.code.trim()) return current;
        return { ...current, code: "CC-0001" };
      });
    } finally {
      setLoadingParents(false);
    }

    return () => controller.abort();
  }, [t.loadParentsError]);

  React.useEffect(() => {
    void loadParentCenters();
  }, [loadParentCenters]);

  const selectedParent = React.useMemo(() => {
    return parentCenters.find((center) => center.id === form.parent_id) || null;
  }, [form.parent_id, parentCenters]);

  const readiness = React.useMemo(() => {
    const budgetValue = form.budget_amount.trim()
      ? Number(form.budget_amount.replace(/,/g, ""))
      : 0;

    const basicData = Boolean(form.name.trim()) && Boolean(form.code.trim());
    const typeReady = Boolean(form.type);
    const statusReady = Boolean(form.status);
    const budgetReady =
      !form.budget_amount.trim() ||
      (Number.isFinite(budgetValue) && budgetValue >= 0);

    return {
      basicData,
      typeReady,
      statusReady,
      budgetReady,
      ready: basicData && typeReady && statusReady && budgetReady,
    };
  }, [form]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setDirty(true);
    setSubmitError("");

    setFieldErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};
    const budgetValue = form.budget_amount.trim()
      ? Number(form.budget_amount.replace(/,/g, ""))
      : 0;

    if (!form.name.trim()) nextErrors.name = t.requiredName;
    if (!form.code.trim()) nextErrors.code = t.requiredCode;

    if (form.budget_amount.trim() && (!Number.isFinite(budgetValue) || budgetValue < 0)) {
      nextErrors.budget_amount = t.invalidBudget;
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function buildPayload() {
    const budgetValue = form.budget_amount.trim()
      ? Number(form.budget_amount.replace(/,/g, ""))
      : 0;

    return {
      name: form.name.trim(),
      title: form.name.trim(),
      cost_center_name: form.name.trim(),
      code: form.code.trim(),
      cost_center_code: form.code.trim(),
      center_code: form.code.trim(),
      type: form.type,
      center_type: form.type,
      cost_center_type: form.type,
      category: form.type,
      status: form.status,
      center_status: form.status,
      is_active: form.status === "active",
      active: form.status === "active",
      enabled: form.status === "active",
      parent_id: form.parent_id || null,
      parent_cost_center_id: form.parent_id || null,
      parent_center_id: form.parent_id || null,
      manager_name: form.manager_name.trim(),
      responsible_name: form.manager_name.trim(),
      owner_name: form.manager_name.trim(),
      budget_amount: budgetValue,
      estimated_budget: budgetValue,
      budget: budgetValue,
      notes: form.notes.trim(),
      description: form.notes.trim(),
      internal_notes: form.notes.trim(),
    };
  }

  async function submitForm(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!validateForm()) return;

    setSaving(true);
    setSubmitError("");

    const payload = buildPayload();

    const endpoints = [
      "/api/accounting/cost-centers/",
      "/api/accounting/cost-centers/create/",
      "/api/accounting/cost_centers/",
    ];

    let createdId = "";
    let lastError: unknown = null;

    try {
      for (const endpoint of endpoints) {
        try {
          const responsePayload = await fetchJson<ApiResponse>(makeApiUrl(endpoint), {
            method: "POST",
            body: JSON.stringify(payload),
          });

          createdId = extractCreatedId(responsePayload);
          break;
        } catch (caughtError) {
          lastError = caughtError;
        }
      }

      if (!createdId && lastError) {
        throw lastError instanceof Error ? lastError : new Error(t.saveError);
      }

      toast.success(t.saveSuccess);
      setDirty(false);

      if (createdId) {
        router.push(`/system/accounting/cost-centers/${createdId}`);
      } else {
        router.push("/system/accounting/cost-centers");
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.saveError;

      setSubmitError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function regenerateCode() {
    updateField("code", generateCostCenterCode(parentCenters));
  }

  function clearForm() {
    if (dirty && !window.confirm(t.clearConfirm)) return;

    setForm({
      ...initialForm,
      code: generateCostCenterCode(parentCenters),
    });
    setFieldErrors({});
    setSubmitError("");
    setDirty(false);
  }

  function goBack(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!dirty || saving) return;

    const confirmed = window.confirm(t.unsavedConfirm);

    if (!confirmed) {
      event.preventDefault();
    }
  }

  if (loadingParents) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <CreateSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-right">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/accounting/cost-centers" onClick={goBack}>
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadParentCenters()}
            disabled={saving || loadingParents}
          >
            <RefreshCw className={cn("h-4 w-4", loadingParents && "animate-spin")} />
            {t.refresh}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={clearForm}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4" />
            {t.clear}
          </Button>

          <Button
            className="h-9 rounded-lg bg-black text-white hover:bg-black/90"
            onClick={() => void submitForm()}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t.saving : t.save}
          </Button>
        </div>
      </div>

      {loadError ? (
        <Card className="rounded-lg border border-amber-200 bg-amber-50 shadow-none">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 text-right">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">{t.loadParentsError}</p>
                <p className="text-sm text-amber-700">{loadError}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadParentCenters()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {submitError ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-4 text-right">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">{t.saveError}</p>
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={submitForm}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{t.formTitle}</CardTitle>
                    <CardDescription>{t.formDesc}</CardDescription>
                  </div>

                  <CardAction>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                      <FolderTree className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardAction>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 px-6 pb-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t.name}</label>
                    <Input
                      value={form.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder={t.namePlaceholder}
                      disabled={saving}
                      className={cn(
                        "h-10 rounded-lg bg-background",
                        fieldErrors.name && "border-red-300",
                      )}
                    />
                    {fieldErrors.name ? (
                      <p className="text-xs text-red-600">{fieldErrors.name}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t.code}</label>
                    <div className="flex gap-2">
                      <Input
                        value={form.code}
                        onChange={(event) => updateField("code", event.target.value.toUpperCase())}
                        placeholder={t.codePlaceholder}
                        disabled={saving}
                        className={cn(
                          "h-10 rounded-lg bg-background tabular-nums",
                          fieldErrors.code && "border-red-300",
                        )}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 shrink-0 rounded-lg"
                        onClick={regenerateCode}
                        disabled={saving}
                      >
                        <RefreshCw className="h-4 w-4" />
                        {t.generateCode}
                      </Button>
                    </div>
                    {fieldErrors.code ? (
                      <p className="text-xs text-red-600">{fieldErrors.code}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t.type}</label>
                    <Select
                      value={form.type}
                      onValueChange={(value) => updateField("type", value as CostCenterType)}
                      disabled={saving}
                    >
                      <SelectTrigger className="h-10 rounded-lg bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department">{t.department}</SelectItem>
                        <SelectItem value="branch">{t.branch}</SelectItem>
                        <SelectItem value="project">{t.project}</SelectItem>
                        <SelectItem value="provider">{t.provider}</SelectItem>
                        <SelectItem value="agent">{t.agent}</SelectItem>
                        <SelectItem value="operation">{t.operation}</SelectItem>
                        <SelectItem value="other">{t.other}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t.status}</label>
                    <Select
                      value={form.status}
                      onValueChange={(value) => updateField("status", value as CostCenterStatus)}
                      disabled={saving}
                    >
                      <SelectTrigger className="h-10 rounded-lg bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t.active}</SelectItem>
                        <SelectItem value="inactive">{t.inactive}</SelectItem>
                        <SelectItem value="draft">{t.draft}</SelectItem>
                        <SelectItem value="archived">{t.archived}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t.parent}</label>
                    <Select
                      value={form.parent_id || "none"}
                      onValueChange={(value) => updateField("parent_id", value === "none" ? "" : value)}
                      disabled={saving}
                    >
                      <SelectTrigger className="h-10 rounded-lg bg-background">
                        <SelectValue placeholder={t.parentPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t.parentPlaceholder}</SelectItem>
                        {parentCenters.map((center) => (
                          <SelectItem
                            key={center.id || center.code || center.name}
                            value={center.id || center.code || center.name}
                          >
                            {center.code ? `${center.code} — ${center.name}` : center.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!parentCenters.length ? (
                      <p className="text-xs text-muted-foreground">{t.noParents}</p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{t.optionsTitle}</CardTitle>
                    <CardDescription>{t.optionsDesc}</CardDescription>
                  </div>

                  <CardAction>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardAction>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 px-6 pb-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t.manager}</label>
                    <Input
                      value={form.manager_name}
                      onChange={(event) => updateField("manager_name", event.target.value)}
                      placeholder={t.managerPlaceholder}
                      disabled={saving}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t.budget}</label>
                    <div className="relative">
                      <Input
                        inputMode="decimal"
                        value={form.budget_amount}
                        onChange={(event) => updateField("budget_amount", event.target.value)}
                        placeholder={t.budgetPlaceholder}
                        disabled={saving}
                        className={cn(
                          "h-10 rounded-lg bg-background tabular-nums",
                          locale === "ar" ? "pl-9" : "pr-9",
                          fieldErrors.budget_amount && "border-red-300",
                        )}
                      />
                      <img
                        src="/currency/sar.svg"
                        alt={t.sar}
                        className={cn(
                          "absolute top-1/2 h-4 w-4 -translate-y-1/2",
                          locale === "ar" ? "left-3" : "right-3",
                        )}
                      />
                    </div>
                    {fieldErrors.budget_amount ? (
                      <p className="text-xs text-red-600">{fieldErrors.budget_amount}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t.notes}</label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    placeholder={t.notesPlaceholder}
                    disabled={saving}
                    rows={5}
                    className="min-h-[128px] w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{t.summaryTitle}</CardTitle>
                    <CardDescription>{t.summaryDesc}</CardDescription>
                  </div>

                  <CardAction>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                      <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardAction>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 px-6 pb-6">
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {readiness.ready ? t.ready : t.notReady}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        getStatusClass(form.status),
                      )}
                    >
                      {statusLabel(form.status, locale)}
                    </Badge>
                  </div>
                </div>

                <ReadinessItem ready={readiness.basicData} label={t.basicData} />
                <ReadinessItem ready={readiness.typeReady} label={t.typeReady} />
                <ReadinessItem ready={readiness.statusReady} label={t.statusReady} />
                <ReadinessItem ready={readiness.budgetReady} label={t.budgetReady} />

                <div className="rounded-lg border bg-background p-4 text-sm">
                  <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {form.name || t.name}
                  </div>

                  <div className="space-y-2 text-muted-foreground">
                    <p>
                      {t.code}:{" "}
                      <span className="font-medium text-foreground tabular-nums">
                        {form.code || "—"}
                      </span>
                    </p>

                    <div className="flex items-center gap-2">
                      <span>{t.type}:</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          getTypeClass(form.type),
                        )}
                      >
                        {typeLabel(form.type, locale)}
                      </Badge>
                    </div>

                    <p>
                      {t.parent}:{" "}
                      <span className="font-medium text-foreground">
                        {selectedParent?.name || "—"}
                      </span>
                    </p>

                    <p>
                      {t.manager}:{" "}
                      <span className="font-medium text-foreground">
                        {form.manager_name || "—"}
                      </span>
                    </p>

                    <p className="flex items-center gap-1">
                      <span>{t.budget}:</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatMoney(form.budget_amount || 0)}
                      </span>
                      <img src="/currency/sar.svg" alt={t.sar} className="h-3.5 w-3.5" />
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  className="h-10 w-full rounded-lg bg-black text-white hover:bg-black/90"
                  onClick={() => void submitForm()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? t.saving : t.save}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-6 py-5">
                <CardTitle>{t.parent}</CardTitle>
                <CardDescription>{t.optionsDesc}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 px-6 pb-6">
                <div className="rounded-lg border bg-background p-4">
                  <p className="text-sm font-medium text-foreground">
                    {selectedParent?.name || t.parentPlaceholder}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {selectedParent?.code || "—"}
                  </p>
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <p className="text-sm font-medium text-foreground">
                    {t.type}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {typeLabel(form.type, locale)}
                  </p>
                </div>

                <div className="rounded-lg border bg-background p-4">
                  <p className="text-sm font-medium text-foreground">
                    {t.status}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {statusLabel(form.status, locale)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}