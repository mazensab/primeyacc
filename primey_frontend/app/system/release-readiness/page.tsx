"use client";
/* ============================================================
   ?? primey_frontend/app/system/release-readiness/page.tsx
   ?? Mhamcloud ? System Release Readiness
   ------------------------------------------------------------
   ? Approved Premium PrimeyCare admin pattern adapted for Mhamcloud
   ? Real API only: GET /api/system/release-readiness/
   ? Backend release readiness summary + checks + API contracts
   ? Search, status filter, scope filter, sorting, reset
   ? Excel .xls export
   ? Web print + PDF through browser print dialog
   ? Skeleton loading
   ? Error / Empty / No results states
   ? sonner toast
   ? Arabic/English via primey-locale
   ? No localhost hardcoding
   ? No fake demo data
============================================================ */
import * as React from "react";
import {
  Activity,
  ArrowUpDown,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Layers3,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TableProperties,
  TriangleAlert,
  XCircle,
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
type StatusFilter = "all" | "ready" | "ready_with_warnings" | "blocked" | "passed" | "warning" | "failed";
type ScopeFilter = "all" | "system" | "company" | "other";
type SortKey = "default" | "key" | "status" | "scope" | "path";
type Summary = {
  contracts_count: number;
  checks_count: number;
  failed_count: number;
  warning_count: number;
  company_scoped_contracts: number;
  system_scoped_contracts: number;
};
type ReadinessCheck = {
  key: string;
  label: string;
  status: string;
  message: string;
  severity: string;
};
type ApiContract = {
  key: string;
  title: string;
  scope: string;
  base_path: string;
  methods: string[];
  company_scoped: boolean;
  description: string;
  module: string;
};
const API_ENDPOINT = "/api/system/release-readiness/";
const translations = {
  ar: {
    title: "\u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u0625\u0635\u062f\u0627\u0631",
    subtitle:
      "\u0645\u0631\u0643\u0632 \u0645\u0631\u0627\u0642\u0628\u0629 \u062c\u0627\u0647\u0632\u064a\u0629 \u0628\u0627\u0643\u0646\u062f Mhamcloud \u0648\u0639\u0642\u0648\u062f API \u0627\u0644\u0645\u0633\u062c\u0644\u0629 \u0645\u0646 \u0645\u0635\u062f\u0631 \u062d\u0642\u064a\u0642\u064a.",
    badge: "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u0635\u0629",
    refresh: "\u062a\u062d\u062f\u064a\u062b",
    exportExcel: "\u062a\u0635\u062f\u064a\u0631 Excel",
    print: "\u0637\u0628\u0627\u0639\u0629",
    pdf: "PDF",
    reset: "\u0625\u0639\u0627\u062f\u0629 \u0636\u0628\u0637",
    searchPlaceholder: "\u0627\u0628\u062d\u062b \u0628\u0627\u0644\u0645\u0641\u062a\u0627\u062d \u0623\u0648 \u0627\u0644\u0645\u0633\u0627\u0631 \u0623\u0648 \u0627\u0644\u0646\u0637\u0627\u0642 \u0623\u0648 \u0627\u0644\u0631\u0633\u0627\u0644\u0629...",
    all: "\u0627\u0644\u0643\u0644",
    statusFilter: "\u0627\u0644\u062d\u0627\u0644\u0629",
    scopeFilter: "\u0627\u0644\u0646\u0637\u0627\u0642",
    sort: "\u0627\u0644\u062a\u0631\u062a\u064a\u0628",
    ready: "\u062c\u0627\u0647\u0632",
    ready_with_warnings: "\u062c\u0627\u0647\u0632 \u0645\u0639 \u062a\u0646\u0628\u064a\u0647\u0627\u062a",
    blocked: "\u0645\u062d\u062c\u0648\u0628",
    passed: "\u0646\u0627\u062c\u062d",
    warning: "\u062a\u0646\u0628\u064a\u0647",
    failed: "\u0641\u0634\u0644",
    system: "\u0627\u0644\u0646\u0638\u0627\u0645",
    company: "\u0627\u0644\u0634\u0631\u0643\u0627\u062a",
    other: "\u0623\u062e\u0631\u0649",
    defaultSort: "\u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a",
    keySort: "\u0627\u0644\u0645\u0641\u062a\u0627\u062d",
    statusSort: "\u0627\u0644\u062d\u0627\u0644\u0629",
    scopeSort: "\u0627\u0644\u0646\u0637\u0627\u0642",
    pathSort: "\u0627\u0644\u0645\u0633\u0627\u0631",
    overallStatus: "\u062d\u0627\u0644\u0629 \u0627\u0644\u062c\u0627\u0647\u0632\u064a\u0629",
    contracts: "\u0639\u0642\u0648\u062f API",
    checks: "\u0641\u062d\u0648\u0635\u0627\u062a \u0627\u0644\u062c\u0627\u0647\u0632\u064a\u0629",
    failedChecks: "\u0641\u062d\u0648\u0635\u0627\u062a \u0641\u0627\u0634\u0644\u0629",
    warnings: "\u062a\u0646\u0628\u064a\u0647\u0627\u062a",
    systemContracts: "\u0639\u0642\u0648\u062f \u0627\u0644\u0646\u0638\u0627\u0645",
    companyContracts: "\u0639\u0642\u0648\u062f \u0627\u0644\u0634\u0631\u0643\u0627\u062a",
    fromLiveApi: "\u0645\u0646 API \u062d\u0642\u064a\u0642\u064a",
    checksTitle: "\u0641\u062d\u0648\u0635\u0627\u062a \u0627\u0644\u062c\u0627\u0647\u0632\u064a\u0629",
    checksDesc: "\u0646\u062a\u0627\u0626\u062c \u0641\u062d\u0635 \u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a \u0648\u0633\u062c\u0644 \u0627\u0644\u0639\u0642\u0648\u062f \u0648\u0645\u0633\u0627\u0631\u0627\u062a API.",
    contractsTitle: "\u0633\u062c\u0644 \u0639\u0642\u0648\u062f API",
    contractsDesc: "\u0645\u0631\u062c\u0639 \u0639\u0642\u0648\u062f API \u0627\u0644\u0645\u0633\u062c\u0644\u0629 \u0644\u0644\u0646\u0638\u0627\u0645 \u0648\u0627\u0644\u0634\u0631\u0643\u0627\u062a.",
    status: "\u0627\u0644\u062d\u0627\u0644\u0629",
    check: "\u0627\u0644\u0641\u062d\u0635",
    severity: "\u0627\u0644\u0623\u0647\u0645\u064a\u0629",
    message: "\u0627\u0644\u0631\u0633\u0627\u0644\u0629",
    key: "\u0627\u0644\u0645\u0641\u062a\u0627\u062d",
    scope: "\u0627\u0644\u0646\u0637\u0627\u0642",
    path: "\u0627\u0644\u0645\u0633\u0627\u0631",
    methods: "\u0627\u0644\u0637\u0631\u0642",
    companyScoped: "\u0645\u0639\u0632\u0648\u0644 \u0644\u0644\u0634\u0631\u0643\u0629",
    description: "\u0627\u0644\u0648\u0635\u0641",
    yes: "\u0646\u0639\u0645",
    no: "\u0644\u0627",
    rows: "\u0635\u0641\u0648\u0641",
    phase: "\u0627\u0644\u0645\u0631\u062d\u0644\u0629",
    version: "\u0625\u0635\u062f\u0627\u0631 \u0627\u0644\u0639\u0642\u062f",
    loading: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u0625\u0635\u062f\u0627\u0631",
    loadingDesc: "\u064a\u062a\u0645 \u062c\u0644\u0628 \u0627\u0644\u0641\u062d\u0648\u0635\u0627\u062a \u0648\u0627\u0644\u0639\u0642\u0648\u062f \u0645\u0646 \u0627\u0644\u0628\u0627\u0643\u0646\u062f.",
    errorTitle: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u0625\u0635\u062f\u0627\u0631",
    errorDesc: "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0648\u0627\u062c\u0647\u0629 \u0627\u0644\u062c\u0627\u0647\u0632\u064a\u0629.",
    tryAgain: "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629",
    emptyTitle: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a",
    emptyDesc: "\u0644\u0645 \u064a\u0631\u062c\u0639 API \u0623\u064a \u0641\u062d\u0648\u0635\u0627\u062a \u0623\u0648 \u0639\u0642\u0648\u062f.",
    noResultsTitle: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0637\u0627\u0628\u0642\u0629",
    noResultsDesc: "\u063a\u064a\u0631 \u0627\u0644\u0628\u062d\u062b \u0623\u0648 \u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0644\u0639\u0631\u0636 \u0646\u062a\u0627\u0626\u062c \u0623\u062e\u0631\u0649.",
    exportEmpty: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u062a\u0635\u062f\u064a\u0631.",
    printEmpty: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u0637\u0628\u0627\u0639\u0629.",
    pdfHint: "\u0627\u062e\u062a\u0631 \u062d\u0641\u0638 \u0643\u0640 PDF \u0645\u0646 \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629.",
    reportTitle: "\u062a\u0642\u0631\u064a\u0631 \u062c\u0627\u0647\u0632\u064a\u0629 \u0625\u0635\u062f\u0627\u0631 Mhamcloud",
    generatedAt: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
    refreshed: "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u062c\u0627\u0647\u0632\u064a\u0629 \u0627\u0644\u0625\u0635\u062f\u0627\u0631.",
    unknown: "\u063a\u064a\u0631 \u0645\u062d\u062f\u062f",
  },
  en: {
    title: "Release Readiness",
    subtitle: "Live Mhamcloud backend readiness center and registered API contract registry.",
    badge: "Platform management",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    reset: "Reset",
    searchPlaceholder: "Search by key, path, scope, or message...",
    all: "All",
    statusFilter: "Status",
    scopeFilter: "Scope",
    sort: "Sort",
    ready: "Ready",
    ready_with_warnings: "Ready with warnings",
    blocked: "Blocked",
    passed: "Passed",
    warning: "Warning",
    failed: "Failed",
    system: "System",
    company: "Company",
    other: "Other",
    defaultSort: "Default",
    keySort: "Key",
    statusSort: "Status",
    scopeSort: "Scope",
    pathSort: "Path",
    overallStatus: "Readiness status",
    contracts: "API contracts",
    checks: "Readiness checks",
    failedChecks: "Failed checks",
    warnings: "Warnings",
    systemContracts: "System contracts",
    companyContracts: "Company contracts",
    fromLiveApi: "From live API",
    checksTitle: "Readiness checks",
    checksDesc: "Installed apps, contract registry, API paths and company scope validation results.",
    contractsTitle: "API contract registry",
    contractsDesc: "Registered API contracts for system and company endpoints.",
    status: "Status",
    check: "Check",
    severity: "Severity",
    message: "Message",
    key: "Key",
    scope: "Scope",
    path: "Path",
    methods: "Methods",
    companyScoped: "Company scoped",
    description: "Description",
    yes: "Yes",
    no: "No",
    rows: "rows",
    phase: "Phase",
    version: "Contract version",
    loading: "Loading release readiness",
    loadingDesc: "Reading checks and API contracts from the backend.",
    errorTitle: "Could not load release readiness",
    errorDesc: "An error happened while calling the release readiness API.",
    tryAgain: "Try again",
    emptyTitle: "No data",
    emptyDesc: "The API returned no checks or contracts.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show more results.",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "Mhamcloud Release Readiness Report",
    generatedAt: "Generated at",
    refreshed: "Release readiness refreshed.",
    unknown: "Unknown",
  },
} as const;
function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "")
      : "";
  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}
function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json().catch(() => null)) as T | { message?: string } | null;
  if (!response.ok) {
    throw new Error((payload as { message?: string } | null)?.message || `${response.status} ${response.statusText}`);
  }
  return payload as T;
}
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function asRecord(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ApiRecord) : {};
}
function asArray(value: unknown): ApiRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}
function text(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}
function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function getStatusLabel(value: string, locale: Locale) {
  const normalized = value.toLowerCase() as keyof (typeof translations)["ar"];
  return translations[locale][normalized] || value || translations[locale].unknown;
}
function getStatusClass(value: string) {
  const normalized = value.toLowerCase();
  if (["ready", "passed", "success"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (["ready_with_warnings", "warning"].includes(normalized)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (["blocked", "failed", "error"].includes(normalized)) {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-border bg-muted text-muted-foreground";
}
function normalizeCheck(row: ApiRecord, index: number): ReadinessCheck {
  return {
    key: text(row.key, `check-${index + 1}`),
    label: text(row.label || row.title || row.name, `Check ${index + 1}`),
    status: text(row.status, "unknown"),
    message: text(row.message || row.description),
    severity: text(row.severity || row.level, "info"),
  };
}
function normalizeMethods(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}
function normalizeContract(row: ApiRecord, index: number): ApiContract {
  const basePath = text(row.base_path || row.path || row.url);
  const scope = text(row.scope || row.access_scope, basePath.includes("/company/") ? "company" : "system");
  return {
    key: text(row.key || row.code || row.id, `contract-${index + 1}`),
    title: text(row.title || row.label || row.name || row.key, `Contract ${index + 1}`),
    scope,
    base_path: basePath,
    methods: normalizeMethods(row.methods || row.method || row.http_methods),
    company_scoped: Boolean(row.company_scoped || row.is_company_scoped || scope === "company"),
    description: text(row.description || row.summary || row.message),
    module: text(row.module || row.app || row.service),
  };
}
function buildTableHtml(title: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return `
    <h2>${escapeHtml(title)}</h2>
    <table>
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`)
        .join("")}</tbody>
    </table>
  `;
}
function MetricCard({
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
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</CardTitle>
        </div>
        <div className="rounded-2xl border bg-muted p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
function ReleaseReadinessSkeleton() {
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
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
export default function SystemReleaseReadinessPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [payload, setPayload] = React.useState<ApiRecord>({});
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [scope, setScope] = React.useState<ScopeFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("default");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";
  React.useEffect(() => {
    const applyLocale = () => setLocale(getInitialLocale());
    applyLocale();
    window.addEventListener("storage", applyLocale);
    return () => window.removeEventListener("storage", applyLocale);
  }, []);
  const loadReadiness = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        setError(null);
        setRefreshing(true);
        const data = await fetchJson<ApiRecord>(makeApiUrl(API_ENDPOINT));
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
    [t.errorDesc, t.refreshed],
  );
  React.useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);
  const apiData = asRecord(payload.data);
  const meta = asRecord(payload.meta);
  const summaryRecord = asRecord(apiData.summary);
  const readinessStatus = text(apiData.status, "unknown");
  const phase = text(apiData.phase, t.unknown);
  const apiTitle = text(apiData.title, t.title);
  const contractVersion = text(meta.contract_version, "v1");
  const summary: Summary = {
    contracts_count: numberValue(summaryRecord.contracts_count),
    checks_count: numberValue(summaryRecord.checks_count),
    failed_count: numberValue(summaryRecord.failed_count),
    warning_count: numberValue(summaryRecord.warning_count),
    company_scoped_contracts: numberValue(summaryRecord.company_scoped_contracts),
    system_scoped_contracts: numberValue(summaryRecord.system_scoped_contracts),
  };
  const checks = React.useMemo(() => asArray(apiData.checks).map(normalizeCheck), [apiData.checks]);
  const contracts = React.useMemo(() => asArray(apiData.contracts).map(normalizeContract), [apiData.contracts]);
  const filteredChecks = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return checks
      .filter((item) => {
        const matchesStatus = status === "all" || item.status.toLowerCase() === status;
        const haystack = [item.key, item.label, item.status, item.severity, item.message].join(" ").toLowerCase();
        return matchesStatus && (!query || haystack.includes(query));
      })
      .sort((a, b) => {
        if (sort === "key") return a.key.localeCompare(b.key);
        if (sort === "status") return a.status.localeCompare(b.status);
        return 0;
      });
  }, [checks, search, sort, status]);
  const filteredContracts = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return contracts
      .filter((item) => {
        const contractScope = item.scope.toLowerCase();
        const matchesScope =
          scope === "all" ||
          contractScope === scope ||
          (scope === "company" && item.company_scoped) ||
          (scope === "other" && contractScope !== "system" && contractScope !== "company");
        const haystack = [item.key, item.title, item.scope, item.base_path, item.methods.join(" "), item.description]
          .join(" ")
          .toLowerCase();
        return matchesScope && (!query || haystack.includes(query));
      })
      .sort((a, b) => {
        if (sort === "key") return a.key.localeCompare(b.key);
        if (sort === "scope") return a.scope.localeCompare(b.scope);
        if (sort === "path") return a.base_path.localeCompare(b.base_path);
        return 0;
      });
  }, [contracts, scope, search, sort]);
  const hasData = checks.length > 0 || contracts.length > 0;
  const hasFilteredData = filteredChecks.length > 0 || filteredContracts.length > 0;
  function resetFilters() {
    setSearch("");
    setStatus("all");
    setScope("all");
    setSort("default");
  }
  function exportRows() {
    return [
      ...filteredChecks.map((item) => ({
        Type: "Check",
        Key: item.key,
        Title: item.label,
        Status: item.status,
        Scope: "",
        Path: "",
        Methods: "",
        Message: item.message,
      })),
      ...filteredContracts.map((item) => ({
        Type: "Contract",
        Key: item.key,
        Title: item.title,
        Status: "",
        Scope: item.scope,
        Path: item.base_path,
        Methods: item.methods.join(", ") || "GET",
        Message: item.description || item.module,
      })),
    ];
  }
  function exportExcel() {
    const rows = exportRows();
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
          <p>${escapeHtml(t.phase)}: ${escapeHtml(phase)}</p>
          <p>${escapeHtml(t.version)}: ${escapeHtml(contractVersion)}</p>
          ${buildTableHtml(t.reportTitle, rows)}
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Mhamcloud-release-readiness.xls";
    link.click();
    URL.revokeObjectURL(url);
  }
  function openPrintWindow(mode: "print" | "pdf") {
    const rows = exportRows();
    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }
    if (mode === "pdf") toast.info(t.pdfHint);
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!printWindow) return;
    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.reportTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; }
            p { color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: ${locale === "ar" ? "right" : "left"}; vertical-align: top; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          <p>${escapeHtml(t.phase)}: ${escapeHtml(phase)} ? ${escapeHtml(t.version)}: ${escapeHtml(contractVersion)}</p>
          ${buildTableHtml(t.reportTitle, rows)}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
  if (loading) return <ReleaseReadinessSkeleton />;
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
            <Button onClick={() => void loadReadiness({ silent: true })} className="rounded-xl">
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
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className={getStatusClass(readinessStatus)}>
                    <ShieldCheck className="me-1.5 h-3.5 w-3.5" />
                    {getStatusLabel(readinessStatus, locale)}
                  </Badge>
                  <Badge variant="outline" className="bg-background">{t.phase}: {phase}</Badge>
                  <Badge variant="outline" className="bg-background">{t.version}: {contractVersion}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadReadiness({ silent: true })}
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
          <MetricCard title={t.overallStatus} value={getStatusLabel(readinessStatus, locale)} description={t.fromLiveApi} icon={ClipboardCheck} />
          <MetricCard title={t.contracts} value={summary.contracts_count || contracts.length} description={`${t.systemContracts}: ${summary.system_scoped_contracts} ? ${t.companyContracts}: ${summary.company_scoped_contracts}`} icon={Layers3} />
          <MetricCard title={t.checks} value={summary.checks_count || checks.length} description={`${t.failedChecks}: ${summary.failed_count} ? ${t.warnings}: ${summary.warning_count}`} icon={Activity} />
          <MetricCard title={t.companyScoped} value={summary.company_scoped_contracts} description={`${t.companyContracts} / ${t.contracts}`} icon={TableProperties} />
        </section>
        <Card className="rounded-3xl border-border/70 bg-card shadow-sm">
          <CardHeader>
            <CardTitle>{apiTitle}</CardTitle>
            <CardDescription>{t.fromLiveApi}: {API_ENDPOINT}</CardDescription>
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
                    className="h-10 rounded-xl bg-background ps-9"
                  />
                </div>
                <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[190px]">
                    <SelectValue placeholder={t.statusFilter} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="ready">{t.ready}</SelectItem>
                    <SelectItem value="ready_with_warnings">{t.ready_with_warnings}</SelectItem>
                    <SelectItem value="blocked">{t.blocked}</SelectItem>
                    <SelectItem value="passed">{t.passed}</SelectItem>
                    <SelectItem value="warning">{t.warning}</SelectItem>
                    <SelectItem value="failed">{t.failed}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={scope} onValueChange={(value) => setScope(value as ScopeFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[180px]">
                    <SelectValue placeholder={t.scopeFilter} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="system">{t.system}</SelectItem>
                    <SelectItem value="company">{t.company}</SelectItem>
                    <SelectItem value="other">{t.other}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[170px]">
                    <SelectValue placeholder={t.sort} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t.defaultSort}</SelectItem>
                    <SelectItem value="key">{t.keySort}</SelectItem>
                    <SelectItem value="status">{t.statusSort}</SelectItem>
                    <SelectItem value="scope">{t.scopeSort}</SelectItem>
                    <SelectItem value="path">{t.pathSort}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
            {!hasData ? (
              <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
            ) : !hasFilteredData ? (
              <EmptyState title={t.noResultsTitle} description={t.noResultsDesc} />
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border">
                  <div className="border-b p-4">
                    <h2 className="font-semibold">{t.checksTitle}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t.checksDesc}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <Table className="w-full min-w-[900px] table-fixed">
                      <TableHeader>
                        <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                          <TableHead className={`w-[230px] px-4 text-xs font-semibold text-muted-foreground ${alignClass}`}>{t.check}</TableHead>
                          <TableHead className={`w-[130px] px-4 text-xs font-semibold text-muted-foreground ${alignClass}`}>{t.status}</TableHead>
                          <TableHead className={`w-[120px] px-4 text-xs font-semibold text-muted-foreground ${alignClass}`}>{t.severity}</TableHead>
                          <TableHead className={`px-4 text-xs font-semibold text-muted-foreground ${alignClass}`}>{t.message}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredChecks.map((item) => (
                          <TableRow key={item.key}>
                            <TableCell className="px-4">
                              <div className="font-medium">{item.label}</div>
                              <div className="mt-1 font-mono text-xs text-muted-foreground">{item.key}</div>
                            </TableCell>
                            <TableCell className="px-4">
                              <Badge variant="outline" className={getStatusClass(item.status)}>
                                {item.status === "passed" ? <CheckCircle2 className="me-1 h-3.5 w-3.5" /> : item.status === "failed" ? <XCircle className="me-1 h-3.5 w-3.5" /> : <CircleAlert className="me-1 h-3.5 w-3.5" />}
                                {getStatusLabel(item.status, locale)}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 text-sm text-muted-foreground">{item.severity}</TableCell>
                            <TableCell className="px-4 text-sm text-muted-foreground">{item.message || t.unknown}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="rounded-2xl border">
                  <div className="border-b p-4">
                    <h2 className="font-semibold">{t.contractsTitle}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t.contractsDesc}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <Table className="w-full min-w-[1100px] table-fixed">
                      <TableHeader>
                        <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                          <TableHead className={`w-[250px] px-4 text-xs font-semibold text-muted-foreground ${alignClass}`}>
                            <span className="inline-flex items-center gap-2">{t.key}<ArrowUpDown className="h-3.5 w-3.5" /></span>
                          </TableHead>
                          <TableHead className={`w-[120px] px-4 text-xs font-semibold text-muted-foreground ${alignClass}`}>{t.scope}</TableHead>
                          <TableHead className={`w-[280px] px-4 text-xs font-semibold text-muted-foreground ${alignClass}`}>{t.path}</TableHead>
                          <TableHead className={`w-[150px] px-4 text-xs font-semibold text-muted-foreground ${alignClass}`}>{t.methods}</TableHead>
                          <TableHead className={`w-[150px] px-4 text-xs font-semibold text-muted-foreground ${alignClass}`}>{t.companyScoped}</TableHead>
                          <TableHead className={`px-4 text-xs font-semibold text-muted-foreground ${alignClass}`}>{t.description}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredContracts.map((item) => (
                          <TableRow key={item.key}>
                            <TableCell className="px-4">
                              <div className="font-medium">{item.title}</div>
                              <div className="mt-1 font-mono text-xs text-muted-foreground">{item.key}</div>
                            </TableCell>
                            <TableCell className="px-4">
                              <Badge variant="outline" className="bg-background">{item.scope || t.unknown}</Badge>
                            </TableCell>
                            <TableCell className="px-4">
                              <code className="rounded-lg bg-muted px-2 py-1 text-xs">{item.base_path || t.unknown}</code>
                            </TableCell>
                            <TableCell className="px-4">
                              <div className="flex flex-wrap gap-1">
                                {(item.methods.length ? item.methods : ["GET"]).map((method) => (
                                  <Badge key={`${item.key}-${method}`} variant="outline" className="bg-background font-mono">{method}</Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="px-4">
                              <Badge variant="outline" className={item.company_scoped ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                                {item.company_scoped ? t.yes : t.no}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 text-sm text-muted-foreground">{item.description || item.module || t.unknown}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
