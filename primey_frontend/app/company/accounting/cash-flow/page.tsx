// ============================================================
// 📂 app/company/accounting/cash-flow/page.tsx
// 🧠 Mhamcloud | Company Accounting Cash Flow Statement
// ------------------------------------------------------------
// ✅ Approved company dashboard premium pattern
// ✅ Real API only
// ✅ Cash Flow Statement / قائمة التدفقات النقدية
// ✅ Operating / Investing / Financing sections
// ✅ Calendar + Popover from components/ui
// ============================================================
"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpDown,
  BadgeCheck,
  CalendarDays,
  FileSpreadsheet,
  Filter,
  Landmark,
  Layers3,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
type SectionFilter = "ALL" | "OPERATING" | "INVESTING" | "FINANCING";
type LevelFilter = "summary" | "detailed";
type SortKey = "statement" | "name" | "amount";
type CashFlowRow = {
  id: string;
  rowType: "section" | "account" | "total" | "summary";
  section: string;
  code: string;
  name: string;
  nameEn: string;
  depth: number;
  inflow: number;
  outflow: number;
  net: number;
  parentName: string;
};
const translations = {
  ar: {
    title: "قائمة التدفقات النقدية",
    subtitle:
      "توضح التدفقات النقدية الداخلة والخارجة خلال الفترة حسب الأنشطة التشغيلية والاستثمارية والتمويلية.",
    badge: "وحدة الحسابات",
    accountingDashboard: "لوحة الحسابات",
    journalEntries: "القيود اليومية",
    ledger: "دفتر الأستاذ",
    trialBalance: "ميزان المراجعة",
    incomeStatement: "قائمة الدخل",
    financialPosition: "المركز المالي",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    openingCash: "نقد أول الفترة",
    operatingCashFlow: "التدفق التشغيلي",
    investingCashFlow: "التدفق الاستثماري",
    financingCashFlow: "التدفق التمويلي",
    netCashFlow: "صافي التدفق النقدي",
    closingCash: "نقد آخر الفترة",
    operatingDesc: "صافي التدفقات من الأنشطة التشغيلية",
    investingDesc: "صافي التدفقات من الأنشطة الاستثمارية",
    financingDesc: "صافي التدفقات من الأنشطة التمويلية",
    netDesc: "التدفق التشغيلي + الاستثماري + التمويلي",
    positive: "موجب",
    negative: "سالب",
    filtersTitle: "فلاتر التدفقات النقدية",
    filtersDesc: "اختر الفترة والقسم والمستوى ثم حدّث النتائج من قاعدة البيانات.",
    dateFrom: "من تاريخ",
    dateTo: "إلى تاريخ",
    level: "المستوى",
    section: "القسم",
    allSections: "كل الأقسام",
    operatingOnly: "التشغيلية فقط",
    investingOnly: "الاستثمارية فقط",
    financingOnly: "التمويلية فقط",
    summaryLevel: "مختصر",
    detailedLevel: "تفصيلي",
    includeZero: "إظهار الأقسام الصفرية",
    showAccountCode: "إظهار رقم الحساب",
    searchPlaceholder: "ابحث باسم الحساب أو الكود أو القسم...",
    sortStatement: "ترتيب القائمة",
    sortName: "ترتيب بالاسم",
    sortAmount: "ترتيب بالمبلغ",
    registerTitle: "كشف التدفقات النقدية",
    registerDesc: "يعرض التدفقات الداخلة والخارجة وصافي النقد من القيود المرحلة فقط.",
    item: "النشاط / البند",
    inflow: "تدفق داخل",
    outflow: "تدفق خارج",
    net: "الصافي",
    emptyTitle: "لا توجد بيانات في التدفقات النقدية",
    emptyDesc: "لا توجد حركة على حسابات النقد أو البنوك خلال الفترة المحددة.",
    loading: "جاري تحميل التدفقات النقدية...",
    loadFailed: "تعذر تحميل التدفقات النقدية.",
    sar: "ر.س",
  },
  en: {
    title: "Cash Flow Statement",
    subtitle:
      "Shows cash inflows and outflows during the period by operating, investing, and financing activities.",
    badge: "Accounting Module",
    accountingDashboard: "Accounting Dashboard",
    journalEntries: "Journal Entries",
    ledger: "General Ledger",
    trialBalance: "Trial Balance",
    incomeStatement: "Income Statement",
    financialPosition: "Financial Position",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    openingCash: "Opening cash",
    operatingCashFlow: "Operating cash flow",
    investingCashFlow: "Investing cash flow",
    financingCashFlow: "Financing cash flow",
    netCashFlow: "Net cash flow",
    closingCash: "Closing cash",
    operatingDesc: "Net cash from operating activities",
    investingDesc: "Net cash from investing activities",
    financingDesc: "Net cash from financing activities",
    netDesc: "Operating + investing + financing",
    positive: "Positive",
    negative: "Negative",
    filtersTitle: "Cash Flow Filters",
    filtersDesc: "Choose period, section, and level, then refresh results from the database.",
    dateFrom: "From date",
    dateTo: "To date",
    level: "Level",
    section: "Section",
    allSections: "All sections",
    operatingOnly: "Operating only",
    investingOnly: "Investing only",
    financingOnly: "Financing only",
    summaryLevel: "Summary",
    detailedLevel: "Detailed",
    includeZero: "Show zero sections",
    showAccountCode: "Show account code",
    searchPlaceholder: "Search by account name, code, or section...",
    sortStatement: "Statement order",
    sortName: "Sort by name",
    sortAmount: "Sort by amount",
    registerTitle: "Cash Flow Report",
    registerDesc: "Displays cash inflows, outflows, and net cash flow from posted entries only.",
    item: "Activity / item",
    inflow: "Inflow",
    outflow: "Outflow",
    net: "Net",
    emptyTitle: "No cash flow data",
    emptyDesc: "No movements were found on cash or bank accounts for the selected period.",
    loading: "Loading cash flow...",
    loadFailed: "Could not load cash flow.",
    sar: "SAR",
  },
} as const;
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function apiBase() {
  const value = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return value.endsWith("/api") ? value.slice(0, -4) : value;
}
function apiUrl(path: string) {
  return `${apiBase()}${path}`;
}
async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
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
function arrayFromPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const row = record(value);
  for (const key of ["results", "items", "rows", "data"]) {
    const next = row[key];
    if (Array.isArray(next)) return next;
    if (next && typeof next === "object") {
      const nested = arrayFromPayload(next);
      if (nested.length) return nested;
    }
  }
  return [];
}
function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}
function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "0").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function formatMoney(value: unknown) {
  const parsed = numberValue(value);
  return parsed.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function formatInteger(value: number) {
  return Math.trunc(value || 0).toLocaleString("en-US");
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function yearStartIso() {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}
function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function normalizeRow(value: unknown): CashFlowRow {
  const row = record(value);
  const parent = record(row.parent);
  return {
    id: text(row.id || `${row.row_type}-${row.code}-${row.name}`),
    rowType: (text(row.row_type) || "account") as CashFlowRow["rowType"],
    section: text(row.section),
    code: text(row.code),
    name: text(row.name),
    nameEn: text(row.name_en),
    depth: numberValue(row.depth),
    inflow: numberValue(row.inflow),
    outflow: numberValue(row.outflow),
    net: numberValue(row.net),
    parentName: text(parent.name),
  };
}
function MoneyValue({
  value,
  label,
  strong,
}: {
  value: unknown;
  label: string;
  strong?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex min-w-[104px] items-center justify-end gap-1 tabular-nums",
        strong ? "font-black" : "font-bold",
      ].join(" ")}
    >
      <span>{formatMoney(value)}</span>
      <Image src="/currency/sar.svg" alt={label} width={13} height={13} />
    </span>
  );
}
function DatePickerField({
  label,
  value,
  onChange,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir: "rtl" | "ltr";
}) {
  const selectedDate = parseIsoDate(value);
  return (
    <label className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-start rounded-xl bg-background px-3 font-mono text-sm font-semibold tabular-nums"
          >
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span>{value || "YYYY-MM-DD"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align={dir === "rtl" ? "end" : "start"} className="w-auto rounded-2xl p-0" dir={dir}>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) onChange(toIsoDate(date));
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </label>
  );
}
function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  label,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Card className="group h-[128px] overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-5 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-black tracking-tight tabular-nums">
            <MoneyValue value={value} label={label} strong />
          </CardTitle>
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="px-5 pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
export default function CompanyCashFlowPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [rows, setRows] = React.useState<CashFlowRow[]>([]);
  const [summary, setSummary] = React.useState<ApiRecord>({});
  const [dateFrom, setDateFrom] = React.useState(yearStartIso);
  const [dateTo, setDateTo] = React.useState(todayIso);
  const [level, setLevel] = React.useState<LevelFilter>("summary");
  const [section, setSection] = React.useState<SectionFilter>("ALL");
  const [includeZero, setIncludeZero] = React.useState(false);
  const [showAccountCode, setShowAccountCode] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("statement");
  const [loading, setLoading] = React.useState(true);
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
  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = rows.filter((row) => {
      if (!q) return true;
      return [row.code, row.name, row.nameEn, row.section, row.parentName]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    if (sort === "name") {
      return [...result].sort((a, b) => a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en"));
    }
    if (sort === "amount") {
      return [...result].sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    }
    return result;
  }, [locale, rows, search, sort]);
  const stats = React.useMemo(() => {
    return {
      operating: numberValue(summary.operating_cash_flow),
      investing: numberValue(summary.investing_cash_flow),
      financing: numberValue(summary.financing_cash_flow),
      net: numberValue(summary.net_cash_flow),
      opening: numberValue(summary.opening_cash),
      closing: numberValue(summary.calculated_closing_cash || summary.closing_cash),
    };
  }, [summary]);
  const loadCashFlow = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("level", level);
      params.set("section", section);
      if (includeZero) params.set("include_zero", "true");
      if (search.trim()) params.set("q", search.trim());
      const payload = await fetchJson<unknown>(
        `/api/company/accounting/reports/cash-flow/?${params.toString()}`,
      );
      const payloadRecord = record(payload);
      setSummary(record(payloadRecord.summary));
      setRows(arrayFromPayload(payload).map(normalizeRow));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, includeZero, level, search, section, t.loadFailed]);
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCashFlow();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadCashFlow]);
  function resetFilters() {
    setDateFrom(yearStartIso());
    setDateTo(todayIso());
    setLevel("summary");
    setSection("ALL");
    setIncludeZero(false);
    setShowAccountCode(false);
    setSearch("");
    setSort("statement");
  }
  function exportExcel() {
    const headers = [t.item, t.inflow, t.outflow, t.net];
    const exportRows = filteredRows.map((row) => [
      showAccountCode && row.code ? `${row.code} — ${row.name}` : row.name,
      formatMoney(row.inflow),
      formatMoney(row.outflow),
      formatMoney(row.net),
    ]);
    const html = `<html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${headers
      .map((header) => `<th>${header}</th>`)
      .join("")}</tr></thead><tbody>${exportRows
      .map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replaceAll("<", "&lt;")}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cash-flow-statement.xls";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative min-h-[154px] p-5 sm:p-7">
            <div className="absolute inset-x-0 top-0 h-[5px] bg-slate-950" />
            <div className="flex h-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-4xl">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.badge}
                </div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t.title}</h1>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">{t.subtitle}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Link href="/company/accounting" className="rounded-full border bg-background px-3 py-1 transition hover:bg-muted">
                    <ArrowLeft className="inline h-3.5 w-3.5" /> {t.accountingDashboard}
                  </Link>
                  <Link href="/company/accounting/journal-entries" className="rounded-full border bg-background px-3 py-1 transition hover:bg-muted">
                    {t.journalEntries}
                  </Link>
                  <Link href="/company/accounting/ledger" className="rounded-full border bg-background px-3 py-1 transition hover:bg-muted">
                    {t.ledger}
                  </Link>
                  <Link href="/company/accounting/trial-balance" className="rounded-full border bg-background px-3 py-1 transition hover:bg-muted">
                    {t.trialBalance}
                  </Link>
                  <Link href="/company/accounting/profit-loss" className="rounded-full border bg-background px-3 py-1 transition hover:bg-muted">
                    {t.incomeStatement}
                  </Link>
                  <Link href="/company/accounting/balance-sheet" className="rounded-full border bg-background px-3 py-1 transition hover:bg-muted">
                    {t.financialPosition}
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button className="rounded-xl bg-slate-950 text-white shadow-sm hover:bg-slate-800" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background shadow-sm hover:bg-muted/70" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background shadow-sm hover:bg-muted/70" onClick={() => void loadCashFlow()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.operatingCashFlow} value={stats.operating} description={t.operatingDesc} icon={WalletCards} label={t.sar} />
          <KpiCard title={t.investingCashFlow} value={stats.investing} description={t.investingDesc} icon={Landmark} label={t.sar} />
          <KpiCard title={t.financingCashFlow} value={stats.financing} description={t.financingDesc} icon={Layers3} label={t.sar} />
          <KpiCard title={t.netCashFlow} value={stats.net} description={t.netDesc} icon={ArrowUpDown} label={t.sar} />
        </div>
        <Card className="rounded-2xl border-border/70 bg-card shadow-sm transition hover:shadow-md">
          <CardHeader className="px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.filtersTitle}</CardTitle>
                <CardDescription className="mt-1">{t.filtersDesc}</CardDescription>
              </div>
              <Badge
                variant="outline"
                className={
                  stats.net >= 0
                    ? "w-fit rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
                    : "w-fit rounded-full border-rose-200 bg-rose-50 px-3 py-1 text-rose-700"
                }
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                {stats.net >= 0 ? t.positive : t.negative}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-5">
            <div className="grid gap-3 rounded-2xl border bg-muted/20 p-3 lg:grid-cols-4 xl:grid-cols-[160px_160px_170px_190px_165px_150px_145px_130px]">
              <DatePickerField label={t.dateFrom} value={dateFrom} onChange={setDateFrom} dir={dir} />
              <DatePickerField label={t.dateTo} value={dateTo} onChange={setDateTo} dir={dir} />
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.level}</span>
                <Select value={level} onValueChange={(value) => setLevel(value as LevelFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">{t.summaryLevel}</SelectItem>
                    <SelectItem value="detailed">{t.detailedLevel}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.section}</span>
                <Select value={section} onValueChange={(value) => setSection(value as SectionFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t.allSections}</SelectItem>
                    <SelectItem value="OPERATING">{t.operatingOnly}</SelectItem>
                    <SelectItem value="INVESTING">{t.investingOnly}</SelectItem>
                    <SelectItem value="FINANCING">{t.financingOnly}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">ترتيب</span>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background">
                    <Filter className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="statement">{t.sortStatement}</SelectItem>
                    <SelectItem value="name">{t.sortName}</SelectItem>
                    <SelectItem value="amount">{t.sortAmount}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <Button
                type="button"
                variant={includeZero ? "default" : "outline"}
                className="mt-auto h-10 rounded-xl"
                onClick={() => setIncludeZero((current) => !current)}
              >
                {t.includeZero}
              </Button>
              <Button
                type="button"
                variant={showAccountCode ? "default" : "outline"}
                className="mt-auto h-10 rounded-xl"
                onClick={() => setShowAccountCode((current) => !current)}
              >
                {t.showAccountCode}
              </Button>
              <Button variant="outline" className="mt-auto h-10 rounded-xl bg-background" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-10 rounded-xl bg-background ps-9"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70 bg-card shadow-sm transition hover:shadow-md">
          <CardHeader className="px-5 py-4 sm:px-6">
            <CardTitle>{t.registerTitle}</CardTitle>
            <CardDescription className="mt-1">{t.registerDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
            {loading ? (
              <div className="space-y-3 rounded-2xl border p-4">
                <p className="text-sm text-muted-foreground">{t.loading}</p>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredRows.length ? (
              <div className="overflow-hidden rounded-2xl border">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1020px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-start">{t.item}</TableHead>
                        <TableHead className="w-[170px] text-end">{t.inflow}</TableHead>
                        <TableHead className="w-[170px] text-end">{t.outflow}</TableHead>
                        <TableHead className="w-[170px] text-end">{t.net}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row) => {
                        const isSection = row.rowType === "section";
                        const isTotal = row.rowType === "total" || row.rowType === "summary";
                        const isStrong = isSection || isTotal;
                        return (
                          <TableRow
                            key={row.id}
                            className={[
                              "h-[58px] hover:bg-muted/30",
                              isSection ? "bg-muted/40" : "bg-card",
                              isTotal ? "bg-muted/20" : "",
                            ].join(" ")}
                          >
                            <TableCell className="align-middle">
                              <div
                                className="min-w-0"
                                style={{
                                  paddingInlineStart:
                                    !isSection && !isTotal
                                      ? `${Math.min(row.depth, 5) * 12}px`
                                      : undefined,
                                }}
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  {showAccountCode && row.code ? (
                                    <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-black tabular-nums text-slate-700">
                                      {row.code}
                                    </span>
                                  ) : null}
                                  <span className={isStrong ? "truncate text-sm font-black" : "truncate text-sm font-semibold"}>
                                    {row.name}
                                  </span>
                                </div>
                                {row.nameEn ? (
                                  <div className="truncate text-xs text-muted-foreground">{row.nameEn}</div>
                                ) : null}
                                {!isSection && !isTotal && row.parentName ? (
                                  <Badge variant="outline" className="mt-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground">
                                    {row.parentName}
                                  </Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-end">
                              <MoneyValue value={row.inflow} label={t.sar} strong={isStrong} />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-end">
                              <MoneyValue value={row.outflow} label={t.sar} strong={isStrong} />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-end">
                              <MoneyValue value={row.net} label={t.sar} strong={isStrong} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
                <WalletCards className="h-7 w-7 text-muted-foreground" />
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
      </div>
    </main>
  );
}
