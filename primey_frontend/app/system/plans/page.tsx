"use client";
/* ============================================================
   📂 primey_frontend/app/system/plans/page.tsx
   💼 PrimeyAcc — System Plans Overview
   ------------------------------------------------------------
   ✅ Approved Premium PrimeyAcc system page pattern
   ✅ Same spirit as companies/subscriptions/platform-payments pages
   ✅ Real API only: GET /api/system/plans/
   ✅ KPI cards + quick actions + plans table
   ✅ Search, status filter, visibility filter, code filter, sorting, reset
   ✅ Excel .xls export
   ✅ Web print + PDF through browser print dialog
   ✅ Skeleton loading
   ✅ Error / Empty / No results states
   ✅ sonner toast
   ✅ Arabic/English via primey-locale
   ✅ SAR icon from public/currency/sar.svg
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowUpDown,
  BadgeCheck,
  CreditCard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Gift,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  TriangleAlert,
  UsersRound,
  Warehouse,
  Zap,
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
type StatusFilter = "all" | "active" | "inactive";
type VisibilityFilter = "all" | "public" | "internal";
type SortKey = "order" | "name" | "monthly" | "yearly" | "companies";
type PlanRecord = {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string;
  monthly_price: string;
  yearly_price: string;
  max_users: number;
  max_branches: number;
  max_warehouses: number;
  max_pos: number;
  features: string[];
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  companies_count: number;
  created_at: string | null;
  updated_at: string | null;
};
type ServerStats = {
  total: number;
  active: number;
  inactive: number;
  public: number;
  internal: number;
};
type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};
const API_ENDPOINT = "/api/system/plans/";
const translations = {
  ar: {
    title: "\u0628\u0627\u0642\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629",
    subtitle:
      "\u0645\u0631\u0643\u0632 \u0625\u062f\u0627\u0631\u0629 \u0628\u0627\u0642\u0627\u062a PrimeyAcc \u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u062d\u062f\u0648\u062f \u0648\u0638\u0647\u0648\u0631 \u0627\u0644\u0628\u0627\u0642\u0629 \u0648\u0627\u0631\u062a\u0628\u0627\u0637\u0647\u0627 \u0628\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0627\u062a \u0645\u0646 \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.",
    badge: "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u0635\u0629",
    refresh: "\u062a\u062d\u062f\u064a\u062b",
    exportExcel: "\u062a\u0635\u062f\u064a\u0631 Excel",
    print: "\u0637\u0628\u0627\u0639\u0629",
    pdf: "PDF",
    reset: "\u0625\u0639\u0627\u062f\u0629 \u0636\u0628\u0637",
    searchPlaceholder: "\u0627\u0628\u062d\u062b \u0628\u0627\u0633\u0645 \u0627\u0644\u0628\u0627\u0642\u0629 \u0623\u0648 \u0627\u0644\u0643\u0648\u062f \u0623\u0648 \u0627\u0644\u0645\u0639\u0631\u0641 \u0623\u0648 \u0627\u0644\u0648\u0635\u0641...",
    all: "\u0627\u0644\u0643\u0644",
    allStatuses: "\u0643\u0644 \u0627\u0644\u062d\u0627\u0644\u0627\u062a",
    allVisibility: "\u0643\u0644 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0638\u0647\u0648\u0631",
    allCodes: "\u0643\u0644 \u0627\u0644\u0623\u0643\u0648\u0627\u062f",
    activeOnly: "\u0627\u0644\u0645\u0641\u0639\u0644\u0629",
    inactiveOnly: "\u0627\u0644\u0645\u0648\u0642\u0641\u0629",
    publicOnly: "\u0627\u0644\u0639\u0627\u0645\u0629",
    internalOnly: "\u0627\u0644\u062f\u0627\u062e\u0644\u064a\u0629",
    sort: "\u0627\u0644\u062a\u0631\u062a\u064a\u0628",
    sortOrder: "\u0627\u0644\u062a\u0631\u062a\u064a\u0628",
    sortName: "\u0627\u0644\u0627\u0633\u0645",
    sortMonthly: "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0634\u0647\u0631\u064a",
    sortYearly: "\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0633\u0646\u0648\u064a",
    sortCompanies: "\u0639\u062f\u062f \u0627\u0644\u0634\u0631\u0643\u0627\u062a",
    totalPlans: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0628\u0627\u0642\u0627\u062a",
    activePlans: "\u0627\u0644\u0628\u0627\u0642\u0627\u062a \u0627\u0644\u0645\u0641\u0639\u0644\u0629",
    inactivePlans: "\u0627\u0644\u0628\u0627\u0642\u0627\u062a \u0627\u0644\u0645\u0648\u0642\u0641\u0629",
    publicPlans: "\u0628\u0627\u0642\u0627\u062a \u0638\u0627\u0647\u0631\u0629",
    fromLiveApi: "\u0645\u0646 \u0648\u0627\u062c\u0647\u0627\u062a \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u062d\u0642\u064a\u0642\u064a\u0629",
    actionsTitle: "\u0627\u062e\u062a\u0635\u0627\u0631\u0627\u062a \u0648\u062d\u062f\u0629 \u0627\u0644\u0628\u0627\u0642\u0627\u062a",
    actionsDesc: "\u062a\u0646\u0642\u0644 \u0633\u0631\u064a\u0639 \u0628\u064a\u0646 \u0627\u0644\u0628\u0627\u0642\u0627\u062a \u0648\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0648\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a \u0628\u0646\u0641\u0633 \u0646\u0645\u0637 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u0635\u0629.",
    openSubscriptionsTitle: "\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0627\u062a",
    openSubscriptionsDesc: "\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u0627\u0644\u0628\u0627\u0642\u0627\u062a.",
    openPaymentsTitle: "\u0645\u062f\u0641\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629",
    openPaymentsDesc: "\u0645\u0631\u0627\u062c\u0639\u0629 \u0639\u0645\u0644\u064a\u0627\u062a \u062a\u062d\u0635\u064a\u0644 \u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629.",
    openSettingsTitle: "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0646\u0638\u0627\u0645",
    openSettingsDesc: "\u062a\u062d\u0643\u0645 \u0628\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629 \u0648\u0633\u064a\u0627\u0633\u0627\u062a\u0647\u0627.",
    dashboardTitle: "\u0644\u0648\u062d\u0629 \u0627\u0644\u0646\u0638\u0627\u0645",
    dashboardDesc: "\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629.",
    tableTitle: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0628\u0627\u0642\u0627\u062a",
    tableDesc:
      "\u0646\u0638\u0631\u0629 \u0633\u0631\u064a\u0639\u0629 \u0639\u0644\u0649 \u0628\u0627\u0642\u0627\u062a PrimeyAcc \u0645\u0639 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u062d\u062f\u0648\u062f \u0648\u0627\u0644\u062d\u0627\u0644\u0629 \u0648\u0639\u062f\u062f \u0627\u0644\u0634\u0631\u0643\u0627\u062a.",
    plan: "\u0627\u0644\u0628\u0627\u0642\u0629",
    code: "\u0627\u0644\u0643\u0648\u062f",
    prices: "\u0627\u0644\u0623\u0633\u0639\u0627\u0631",
    monthly: "\u0634\u0647\u0631\u064a",
    yearly: "\u0633\u0646\u0648\u064a",
    limits: "\u0627\u0644\u062d\u062f\u0648\u062f",
    users: "\u0645\u0633\u062a\u062e\u062f\u0645",
    branches: "\u0641\u0631\u0639",
    warehouses: "\u0645\u062e\u0632\u0646",
    pos: "\u0646\u0642\u0637\u0629 \u0628\u064a\u0639",
    companies: "\u0627\u0644\u0634\u0631\u0643\u0627\u062a",
    status: "\u0627\u0644\u062d\u0627\u0644\u0629",
    visibility: "\u0627\u0644\u0638\u0647\u0648\u0631",
    updatedAt: "\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b",
    active: "\u0645\u0641\u0639\u0644\u0629",
    inactive: "\u0645\u0648\u0642\u0641\u0629",
    public: "\u0639\u0627\u0645\u0629",
    internal: "\u062f\u0627\u062e\u0644\u064a\u0629",
    unknown: "\u063a\u064a\u0631 \u0645\u062d\u062f\u062f",
    noDataTitle: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u0627\u0642\u0627\u062a",
    noDataDesc: "\u0633\u062a\u0638\u0647\u0631 \u0628\u0627\u0642\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629 \u0647\u0646\u0627 \u0639\u0646\u062f \u062a\u0648\u0641\u0631\u0647\u0627 \u0645\u0646 API.",
    noResultsTitle: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0637\u0627\u0628\u0642\u0629",
    noResultsDesc: "\u063a\u064a\u0631 \u0627\u0644\u0628\u062d\u062b \u0623\u0648 \u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0644\u0639\u0631\u0636 \u0646\u062a\u0627\u0626\u062c \u0623\u062e\u0631\u0649.",
    errorTitle: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0645\u0631\u0643\u0632 \u0627\u0644\u0628\u0627\u0642\u0627\u062a",
    errorDesc:
      "\u062a\u0623\u0643\u062f \u0645\u0646 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0635\u0644\u0627\u062d\u064a\u0629 \u0646\u0638\u0627\u0645 \u0648\u0645\u0646 \u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0628\u0627\u0643\u0646\u062f \u062b\u0645 \u0623\u0639\u062f \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629.",
    tryAgain: "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629",
    exportEmpty: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u062a\u0635\u062f\u064a\u0631.",
    printEmpty: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u0637\u0628\u0627\u0639\u0629.",
    pdfHint: "\u0627\u062e\u062a\u0631 \u062d\u0641\u0638 \u0643\u0640 PDF \u0645\u0646 \u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0637\u0628\u0627\u0639\u0629.",
    reportTitle: "\u062a\u0642\u0631\u064a\u0631 \u0628\u0627\u0642\u0627\u062a PrimeyAcc",
    generatedAt: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621",
    showing: "\u0639\u0631\u0636",
    of: "\u0645\u0646",
    rows: "\u0635\u0641\u0648\u0641",
    refreshed: "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0645\u0631\u0643\u0632 \u0627\u0644\u0628\u0627\u0642\u0627\u062a.",
  },
  en: {
    title: "Platform Plans",
    subtitle:
      "PrimeyAcc plans center for prices, limits, visibility, and company subscription usage in one place.",
    badge: "Platform management",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    reset: "Reset",
    searchPlaceholder: "Search by plan name, code, slug, or description...",
    all: "All",
    allStatuses: "All statuses",
    allVisibility: "All visibility",
    allCodes: "All codes",
    activeOnly: "Active only",
    inactiveOnly: "Inactive only",
    publicOnly: "Public only",
    internalOnly: "Internal only",
    sort: "Sort",
    sortOrder: "Order",
    sortName: "Name",
    sortMonthly: "Monthly price",
    sortYearly: "Yearly price",
    sortCompanies: "Companies count",
    totalPlans: "Total plans",
    activePlans: "Active plans",
    inactivePlans: "Inactive plans",
    publicPlans: "Public plans",
    fromLiveApi: "From real system APIs",
    actionsTitle: "Plans module shortcuts",
    actionsDesc: "Quick navigation between plans, subscriptions, and payments using the platform pattern.",
    openSubscriptionsTitle: "Company subscriptions",
    openSubscriptionsDesc: "Review company subscriptions linked to platform plans.",
    openPaymentsTitle: "Platform payments",
    openPaymentsDesc: "Review platform subscription payment collection.",
    openSettingsTitle: "System settings",
    openSettingsDesc: "Control platform settings and policies.",
    dashboardTitle: "System dashboard",
    dashboardDesc: "Return to the main system dashboard.",
    tableTitle: "Plans list",
    tableDesc: "A quick view of PrimeyAcc plans with prices, limits, status, and company usage.",
    plan: "Plan",
    code: "Code",
    prices: "Prices",
    monthly: "Monthly",
    yearly: "Yearly",
    limits: "Limits",
    users: "users",
    branches: "branches",
    warehouses: "warehouses",
    pos: "POS",
    companies: "Companies",
    status: "Status",
    visibility: "Visibility",
    updatedAt: "Updated at",
    active: "Active",
    inactive: "Inactive",
    public: "Public",
    internal: "Internal",
    unknown: "Unknown",
    noDataTitle: "No plans",
    noDataDesc: "Platform plans will appear here when returned by the API.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Could not load plans center",
    errorDesc: "Make sure you are signed in as a system user and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "PrimeyAcc Platform Plans Report",
    generatedAt: "Generated at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    refreshed: "Plans center refreshed.",
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
function formatMoney(value: unknown, _locale: Locale) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
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
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  return [];
}
function extractCount(payload: unknown) {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const arrayCount = extractArray(payload).length;
  return toNumber(
    record.count ??
      record.total ??
      record.total_count ??
      dataRecord.count ??
      dataRecord.total ??
      dataRecord.total_count,
    arrayCount,
  );
}
function extractServerStats(payload: unknown): ServerStats {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const statsRecord = asRecord(dataRecord.stats || record.stats);
  return {
    total: toNumber(statsRecord.total),
    active: toNumber(statsRecord.active),
    inactive: toNumber(statsRecord.inactive),
    public: toNumber(statsRecord.public),
    internal: toNumber(statsRecord.internal),
  };
}
function normalizeFeatures(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((feature) => {
        if (typeof feature === "string") return feature;
        const record = asRecord(feature);
        return normalizeText(record.label || record.name || record.title);
      })
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}
function normalizePlan(value: unknown): PlanRecord {
  const record = asRecord(value);
  return {
    id: normalizeText(record.id || record.uuid || record.pk || record.slug || record.code),
    name: normalizeText(record.name || record.title, "—"),
    code: normalizeText(record.code || record.plan_code, "—"),
    slug: normalizeText(record.slug || record.code, "—"),
    description: normalizeText(record.description),
    monthly_price: normalizeText(record.monthly_price || record.monthly || record.price_monthly, "0.00"),
    yearly_price: normalizeText(record.yearly_price || record.yearly || record.price_yearly, "0.00"),
    max_users: toNumber(record.max_users),
    max_branches: toNumber(record.max_branches),
    max_warehouses: toNumber(record.max_warehouses),
    max_pos: toNumber(record.max_pos),
    features: normalizeFeatures(record.features),
    is_active: Boolean(record.is_active),
    is_public: Boolean(record.is_public),
    sort_order: toNumber(record.sort_order),
    companies_count: toNumber(record.companies_count || record.subscriptions_count || record.companies),
    created_at: normalizeText(record.created_at || record.created) || null,
    updated_at: normalizeText(record.updated_at || record.updated) || null,
  };
}
function getStatusClass(active: boolean) {
  return active
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
}
function StatusBadge({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getStatusClass(active))}
    >
      {label}
    </Badge>
  );
}
function SarIcon() {
  return (
    <Image
      src="/currency/sar.svg"
      alt="SAR"
      width={14}
      height={14}
      className="inline-block align-middle"
    />
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
function PlansOverviewSkeleton() {
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
export default function SystemPlansPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [plans, setPlans] = React.useState<PlanRecord[]>([]);
  const [apiTotal, setApiTotal] = React.useState(0);
  const [serverStats, setServerStats] = React.useState<ServerStats>({
    total: 0,
    active: 0,
    inactive: 0,
    public: 0,
    internal: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [visibility, setVisibility] = React.useState<VisibilityFilter>("all");
  const [code, setCode] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("order");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
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
  const loadPlans = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (status !== "all") params.set("status", status);
        if (visibility !== "all") params.set("visibility", visibility);
        if (code !== "all") params.set("code", code);
        const payload = await fetchJson<unknown>(makeApiUrl(API_ENDPOINT, params));
        const rows = extractArray(payload).map(normalizePlan);
        setPlans(rows);
        setApiTotal(extractCount(payload));
        setServerStats(extractServerStats(payload));
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
    [code, search, status, t.errorDesc, t.refreshed, visibility],
  );
  React.useEffect(() => {
    void loadPlans();
  }, [loadPlans]);
  const resetFilters = React.useCallback(() => {
    setSearch("");
    setStatus("all");
    setVisibility("all");
    setCode("all");
    setSort("order");
  }, []);
  const planCodes = React.useMemo(() => {
    return Array.from(new Set(plans.map((plan) => plan.code).filter(Boolean))).sort();
  }, [plans]);
  const filteredPlans = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = plans.filter((plan) => {
      const haystack = [
        plan.name,
        plan.code,
        plan.slug,
        plan.description,
        plan.features.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (status === "active" && !plan.is_active) return false;
      if (status === "inactive" && plan.is_active) return false;
      if (visibility === "public" && !plan.is_public) return false;
      if (visibility === "internal" && plan.is_public) return false;
      if (code !== "all" && plan.code !== code) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "monthly") return toNumber(a.monthly_price) - toNumber(b.monthly_price);
      if (sort === "yearly") return toNumber(a.yearly_price) - toNumber(b.yearly_price);
      if (sort === "companies") return b.companies_count - a.companies_count;
      return a.sort_order - b.sort_order;
    });
  }, [code, plans, search, sort, status, visibility]);
  const stats = React.useMemo(() => {
    return {
      total: serverStats.total || apiTotal || plans.length,
      active: serverStats.active || plans.filter((plan) => plan.is_active).length,
      inactive: serverStats.inactive || plans.filter((plan) => !plan.is_active).length,
      public: serverStats.public || plans.filter((plan) => plan.is_public).length,
    };
  }, [apiTotal, plans, serverStats]);
  const quickActions = React.useMemo<QuickAction[]>(
    () => [
      {
        title: t.openSubscriptionsTitle,
        description: t.openSubscriptionsDesc,
        href: "/system/subscriptions",
        icon: ListChecks,
      },
      {
        title: t.openPaymentsTitle,
        description: t.openPaymentsDesc,
        href: "/system/platform-payments",
        icon: CreditCard,
      },
      {
        title: t.openSettingsTitle,
        description: t.openSettingsDesc,
        href: "/system/settings",
        icon: Settings,
      },
      {
        title: t.dashboardTitle,
        description: t.dashboardDesc,
        href: "/system",
        icon: LayoutDashboard,
      },
    ],
    [
      t.dashboardDesc,
      t.dashboardTitle,
      t.openPaymentsDesc,
      t.openPaymentsTitle,
      t.openSettingsDesc,
      t.openSettingsTitle,
      t.openSubscriptionsDesc,
      t.openSubscriptionsTitle,
    ],
  );
  const hasFilters = Boolean(search || status !== "all" || visibility !== "all" || code !== "all" || sort !== "order");
  const previewRows = filteredPlans.slice(0, 12);
  function buildExportRows() {
    return filteredPlans.map((plan) => [
      plan.name,
      plan.code,
      plan.slug,
      plan.monthly_price,
      plan.yearly_price,
      plan.max_users,
      plan.max_branches,
      plan.max_warehouses,
      plan.max_pos,
      plan.companies_count,
      plan.is_active ? t.active : t.inactive,
      plan.is_public ? t.public : t.internal,
      formatDate(plan.updated_at || plan.created_at),
    ]);
  }
  function buildTableHtml() {
    const headers = [
      t.plan,
      t.code,
      t.monthly,
      t.yearly,
      t.users,
      t.branches,
      t.warehouses,
      t.pos,
      t.companies,
      t.status,
      t.visibility,
      t.updatedAt,
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
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString("en-US"))}</p>
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
    link.download = `primeyacc-system-plans-overview-${new Date().toISOString().slice(0, 10)}.xls`;
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
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString("en-US"))}</p>
          ${buildTableHtml()}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
  if (loading) return <PlansOverviewSkeleton />;
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
            <Button onClick={() => void loadPlans({ silent: true })} className="rounded-xl">
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
                  onClick={() => void loadPlans({ silent: true })}
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalPlans} value={stats.total} description={t.fromLiveApi} icon={Gift} />
          <KpiCard title={t.activePlans} value={stats.active} description={t.fromLiveApi} icon={BadgeCheck} />
          <KpiCard title={t.inactivePlans} value={stats.inactive} description={t.fromLiveApi} icon={EyeOff} />
          <KpiCard title={t.publicPlans} value={stats.public} description={t.fromLiveApi} icon={Eye} />
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
                {t.showing} {formatInteger(previewRows.length)} {t.of} {formatInteger(apiTotal || plans.length)} {t.rows}
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
                  <SelectTrigger className="h-10 w-full rounded-xl md:w-44">
                    <SelectValue placeholder={t.allStatuses} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    <SelectItem value="active">{t.activeOnly}</SelectItem>
                    <SelectItem value="inactive">{t.inactiveOnly}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={visibility} onValueChange={(value) => setVisibility(value as VisibilityFilter)}>
                  <SelectTrigger className="h-10 w-full rounded-xl md:w-48">
                    <SelectValue placeholder={t.allVisibility} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allVisibility}</SelectItem>
                    <SelectItem value="public">{t.publicOnly}</SelectItem>
                    <SelectItem value="internal">{t.internalOnly}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={code} onValueChange={setCode}>
                  <SelectTrigger className="h-10 w-full rounded-xl md:w-44">
                    <SelectValue placeholder={t.allCodes} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allCodes}</SelectItem>
                    {planCodes.map((planCode) => (
                      <SelectItem key={planCode} value={planCode}>
                        {planCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 w-full rounded-xl md:w-44">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue placeholder={t.sort} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order">{t.sortOrder}</SelectItem>
                    <SelectItem value="name">{t.sortName}</SelectItem>
                    <SelectItem value="monthly">{t.sortMonthly}</SelectItem>
                    <SelectItem value="yearly">{t.sortYearly}</SelectItem>
                    <SelectItem value="companies">{t.sortCompanies}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={resetFilters} className="h-10 rounded-xl bg-background">
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
            {!plans.length ? (
              <EmptyState title={t.noDataTitle} description={t.noDataDesc} resetLabel={t.reset} onReset={resetFilters} />
            ) : !filteredPlans.length ? (
              <EmptyState
                title={t.noResultsTitle}
                description={t.noResultsDesc}
                showReset={hasFilters}
                resetLabel={t.reset}
                onReset={resetFilters}
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="min-w-[260px]">{t.plan}</TableHead>
                      <TableHead>{t.prices}</TableHead>
                      <TableHead>{t.limits}</TableHead>
                      <TableHead>{t.companies}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead>{t.visibility}</TableHead>
                      <TableHead>{t.updatedAt}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="align-top">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{plan.name}</span>
                              <Badge variant="outline" className="rounded-full">
                                {plan.code}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{plan.slug}</p>
                            {plan.description ? (
                              <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{plan.description}</p>
                            ) : null}
                            {plan.features.length ? (
                              <div className="flex flex-wrap gap-1">
                                {plan.features.slice(0, 3).map((feature) => (
                                  <Badge key={feature} variant="secondary" className="rounded-full text-[11px]">
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1 font-medium">
                              <SarIcon />
                              <span>{formatMoney(plan.monthly_price, locale)}</span>
                              <span className="text-xs text-muted-foreground">/ {t.monthly}</span>
                            </div>
                            <div className="flex items-center gap-1 font-medium">
                              <SarIcon />
                              <span>{formatMoney(plan.yearly_price, locale)}</span>
                              <span className="text-xs text-muted-foreground">/ {t.yearly}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="grid gap-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <UsersRound className="h-3.5 w-3.5" />
                              {formatInteger(plan.max_users)} {t.users}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Activity className="h-3.5 w-3.5" />
                              {formatInteger(plan.max_branches)} {t.branches}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Warehouse className="h-3.5 w-3.5" />
                              {formatInteger(plan.max_warehouses)} {t.warehouses}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Zap className="h-3.5 w-3.5" />
                              {formatInteger(plan.max_pos)} {t.pos}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant="outline" className="rounded-full px-3 py-1">
                            {formatInteger(plan.companies_count)}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          <StatusBadge active={plan.is_active} label={plan.is_active ? t.active : t.inactive} />
                        </TableCell>
                        <TableCell className="align-top">
                          <StatusBadge active={plan.is_public} label={plan.is_public ? t.public : t.internal} />
                        </TableCell>
                        <TableCell className="align-top text-sm text-muted-foreground">
                          {formatDate(plan.updated_at || plan.created_at)}
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

