"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CircleAlert,
  FileText,
  Hash,
  Landmark,
  Loader2,
  Printer,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
type JournalLine = {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  costCenter: string;
  debit: number;
  credit: number;
};
type JournalEntry = {
  id: string;
  number: string;
  date: string;
  description: string;
  status: string;
  currency: string;
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  createdAt: string;
  postedAt: string;
  reversalOf: string;
  reversedBy: string;
  lines: JournalLine[];
};
const translations = {
  ar: {
    badge: "تفاصيل القيد المحاسبي",
    title: "تفاصيل القيد",
    subtitle: "عرض بيانات القيد وسطور المدين والدائن والحسابات المرتبطة.",
    back: "العودة إلى القيود اليومية",
    refresh: "تحديث",
    print: "طباعة",
    status: "الحالة",
    debit: "إجمالي المدين",
    credit: "إجمالي الدائن",
    date: "تاريخ القيد",
    number: "رقم القيد",
    description: "الوصف",
    currency: "العملة",
    createdBy: "أنشئ بواسطة",
    createdAt: "تاريخ الإنشاء",
    postedAt: "تاريخ الترحيل",
    reversalOf: "عكس القيد",
    reversedBy: "قيد العكس",
    lines: "سطور القيد",
    linesDesc: "الحسابات ومراكز التكلفة والمبالغ المدينة والدائنة.",
    account: "الحساب",
    costCenter: "مركز التكلفة",
    lineDescription: "وصف السطر",
    notFound: "لم يتم العثور على القيد المطلوب.",
    loadFailed: "تعذر تحميل تفاصيل القيد.",
    loading: "جاري تحميل تفاصيل القيد...",
    sar: "ريال سعودي",
    openAccount: "فتح تفاصيل الحساب",
    draft: "مسودة",
    posted: "مرحل",
    reversed: "معكوس",
  },
  en: {
    badge: "Journal Entry Details",
    title: "Journal Entry Details",
    subtitle: "View entry information, debit and credit lines, and linked accounts.",
    back: "Back to Journal Entries",
    refresh: "Refresh",
    print: "Print",
    status: "Status",
    debit: "Total debit",
    credit: "Total credit",
    date: "Entry date",
    number: "Entry number",
    description: "Description",
    currency: "Currency",
    createdBy: "Created by",
    createdAt: "Created at",
    postedAt: "Posted at",
    reversalOf: "Reversal of",
    reversedBy: "Reversed by",
    lines: "Entry Lines",
    linesDesc: "Accounts, cost centers, debit amounts, and credit amounts.",
    account: "Account",
    costCenter: "Cost center",
    lineDescription: "Line description",
    notFound: "The requested journal entry was not found.",
    loadFailed: "Could not load journal entry details.",
    loading: "Loading journal entry details...",
    sar: "Saudi Riyal",
    openAccount: "Open account details",
    draft: "Draft",
    posted: "Posted",
    reversed: "Reversed",
  },
} as const;
function initialLocale(): Locale {
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
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : {};
  if (!response.ok) {
    throw new Error(
      String(payload?.message || payload?.detail || `HTTP ${response.status}`),
    );
  }
  return payload as T;
}
function record(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : {};
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function text(value: unknown, fallback = "") {
  const result =
    value === undefined || value === null ? "" : String(value).trim();
  return result || fallback;
}
function numberValue(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}
function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const source = record(payload);
  for (const key of [
    "results",
    "items",
    "entries",
    "journal_entries",
    "data",
  ]) {
    if (Array.isArray(source[key])) return source[key] as unknown[];
  }
  const nested = record(source.data);
  for (const key of ["results", "items", "entries", "journal_entries"]) {
    if (Array.isArray(nested[key])) return nested[key] as unknown[];
  }
  return [];
}
function unwrapEntry(payload: unknown) {
  const source = record(payload);
  return (
    source.entry ||
    source.journal_entry ||
    source.result ||
    source.data ||
    payload
  );
}
function normalizeLine(value: unknown): JournalLine {
  const source = record(value);
  const account = record(source.account);
  const costCenter = record(source.cost_center);
  return {
    id: text(source.id || source.pk),
    accountId: text(
      source.account_id ||
        account.id ||
        account.pk,
    ),
    accountCode: text(
      source.account_code ||
        account.code,
    ),
    accountName: text(
      source.account_name ||
        account.name ||
        source.account_display,
    ),
    description: text(
      source.description ||
        source.line_description ||
        source.memo,
    ),
    costCenter: text(
      source.cost_center_name ||
        source.cost_center_code ||
        costCenter.name ||
        costCenter.code,
      "—",
    ),
    debit: numberValue(
      source.debit ||
        source.debit_amount,
    ),
    credit: numberValue(
      source.credit ||
        source.credit_amount,
    ),
  };
}
function normalizeEntry(value: unknown): JournalEntry {
  const source = record(value);
  const createdBy = record(source.created_by);
  const reversalOf = record(source.reversal_of);
  const reversedBy = record(source.reversal_entry);
  const rawLines =
    source.lines ||
    source.entry_lines ||
    source.journal_lines ||
    source.details;
  return {
    id: text(source.id || source.pk),
    number: text(
      source.entry_number ||
        source.number ||
        source.journal_number,
    ),
    date: text(
      source.entry_date ||
        source.date ||
        source.posting_date,
    ),
    description: text(
      source.description ||
        source.memo ||
        source.notes,
      "—",
    ),
    status: text(source.status, "DRAFT").toUpperCase(),
    currency: text(source.currency || source.currency_code, "SAR"),
    totalDebit: numberValue(
      source.total_debit ||
        source.debit_total,
    ),
    totalCredit: numberValue(
      source.total_credit ||
        source.credit_total,
    ),
    createdBy: text(
      source.created_by_name ||
        source.created_by_username ||
        createdBy.name ||
        createdBy.username ||
        createdBy.email,
      "—",
    ),
    createdAt: text(source.created_at),
    postedAt: text(source.posted_at),
    reversalOf: text(
      source.reversal_of_number ||
        reversalOf.entry_number,
    ),
    reversedBy: text(
      source.reversal_entry_number ||
        reversedBy.entry_number,
    ),
    lines: array(rawLines).map(normalizeLine),
  };
}
function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
function formatDate(value: string) {
  if (!value) return "—";
  return value.slice(0, 10);
}
function Money({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
      <Image
        src="/currency/sar.svg"
        alt={label}
        width={15}
        height={15}
        className="h-4 w-4"
      />
      {money(value)}
    </span>
  );
}
function statusLabel(status: string, locale: Locale) {
  const normalized = status.toUpperCase();
  const t = translations[locale];
  if (normalized === "POSTED") return t.posted;
  if (normalized === "REVERSED") return t.reversed;
  return t.draft;
}
function statusClasses(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "POSTED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "REVERSED") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}
function InfoField({
  label,
  value,
  dir,
}: {
  label: string;
  value: React.ReactNode;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="rounded-2xl border bg-background px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div
        className="mt-2 min-h-5 text-sm font-semibold"
        dir={dir}
      >
        {value || "—"}
      </div>
    </div>
  );
}
function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1450px] space-y-6">
      <Card className="rounded-3xl">
        <CardContent className="space-y-3 p-7">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
export function CompanyJournalEntryDetailPage({
  entryNumber,
}: {
  entryNumber: string;
}) {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [loading, setLoading] = React.useState(true);
  const [entry, setEntry] = React.useState<JournalEntry | null>(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    setLocale(initialLocale());
    const onStorage = () => setLocale(initialLocale());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const t = translations[locale];
  const isRtl = locale === "ar";
  const loadEntry = React.useCallback(async () => {
    if (!entryNumber) return;
    setLoading(true);
    setError("");
    try {
      const encoded = encodeURIComponent(entryNumber);
      let listPayload = await fetchJson<unknown>(
        `/api/company/accounting/journal-entries/?search=${encoded}&page_size=100`,
      );
      let rows = extractRows(listPayload).map(normalizeEntry);
      let match =
        rows.find(
          (row) =>
            row.number.toUpperCase() === entryNumber.toUpperCase(),
        ) ||
        (rows.length === 1 ? rows[0] : undefined);
      if (!match) {
        listPayload = await fetchJson<unknown>(
          "/api/company/accounting/journal-entries/?page_size=500",
        );
        rows = extractRows(listPayload).map(normalizeEntry);
        match = rows.find(
          (row) =>
            row.number.toUpperCase() === entryNumber.toUpperCase(),
        );
      }
      if (!match) {
        throw new Error(t.notFound);
      }
      if (match.id) {
        const detailPayload = await fetchJson<unknown>(
          `/api/company/accounting/journal-entries/${encodeURIComponent(match.id)}/`,
        );
        setEntry(normalizeEntry(unwrapEntry(detailPayload)));
      } else {
        setEntry(match);
      }
    } catch (caughtError) {
      setEntry(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t.loadFailed,
      );
    } finally {
      setLoading(false);
    }
  }, [entryNumber, t.loadFailed, t.notFound]);
  React.useEffect(() => {
    void loadEntry();
  }, [loadEntry]);
  if (loading) return <DetailSkeleton />;
  if (!entry) {
    return (
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className="mx-auto max-w-[1450px]"
      >
        <Card className="rounded-3xl border-rose-200">
          <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
            <CircleAlert className="h-10 w-10 text-rose-500" />
            <div>
              <h1 className="text-xl font-bold">{t.loadFailed}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {error || t.notFound}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/company/accounting/journal-entries">
                {t.back}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto max-w-[1450px] space-y-6"
    >
      <Card className="overflow-hidden rounded-3xl border-border/70 shadow-sm">
        <div className="h-1.5 bg-slate-950" />
        <CardHeader className="gap-5 p-7 md:flex md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="rounded-full">
              <BookOpen className="h-3.5 w-3.5" />
              {t.badge}
            </Badge>
            <div>
              <CardTitle
                className="text-3xl font-bold tracking-tight"
                dir="ltr"
              >
                {entry.number}
              </CardTitle>
              <CardDescription className="mt-2 leading-7">
                {t.subtitle}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/company/accounting/journal-entries">
                <ArrowLeft className="h-4 w-4" />
                {t.back}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void loadEntry()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.refresh}
            </Button>
            <Button
              className="rounded-xl bg-slate-950 text-white hover:bg-slate-800"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
          </div>
        </CardHeader>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardDescription>{t.status}</CardDescription>
              <Badge
                variant="outline"
                className={cn(
                  "mt-3 rounded-full",
                  statusClasses(entry.status),
                )}
              >
                {statusLabel(entry.status, locale)}
              </Badge>
            </div>
            <BadgeCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardDescription>{t.debit}</CardDescription>
              <CardTitle className="mt-3 text-xl">
                <Money value={entry.totalDebit} label={t.sar} />
              </CardTitle>
            </div>
            <Landmark className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardDescription>{t.credit}</CardDescription>
              <CardTitle className="mt-3 text-xl">
                <Money value={entry.totalCredit} label={t.sar} />
              </CardTitle>
            </div>
            <Landmark className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardDescription>{t.date}</CardDescription>
              <CardTitle
                className="mt-3 text-xl tabular-nums"
                dir="ltr"
              >
                {formatDate(entry.date)}
              </CardTitle>
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
        </Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoField label={t.number} value={entry.number} dir="ltr" />
          <InfoField label={t.date} value={formatDate(entry.date)} dir="ltr" />
          <InfoField
            label={t.status}
            value={statusLabel(entry.status, locale)}
          />
          <InfoField label={t.currency} value={entry.currency} dir="ltr" />
          <InfoField label={t.createdBy} value={entry.createdBy} />
          <InfoField
            label={t.createdAt}
            value={formatDate(entry.createdAt)}
            dir="ltr"
          />
          <InfoField
            label={t.postedAt}
            value={formatDate(entry.postedAt)}
            dir="ltr"
          />
          <InfoField label={t.reversalOf} value={entry.reversalOf || "—"} dir="ltr" />
          <InfoField label={t.reversedBy} value={entry.reversedBy || "—"} dir="ltr" />
          <div className="md:col-span-2 xl:col-span-3">
            <InfoField label={t.description} value={entry.description} />
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t.lines}
          </CardTitle>
          <CardDescription>{t.linesDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border">
            <Table className="min-w-[950px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px] text-center">
                    <Hash className="mx-auto h-4 w-4" />
                  </TableHead>
                  <TableHead className="w-[270px] text-start">
                    {t.account}
                  </TableHead>
                  <TableHead className="w-[170px] text-start">
                    {t.costCenter}
                  </TableHead>
                  <TableHead className="text-start">
                    {t.lineDescription}
                  </TableHead>
                  <TableHead className="w-[140px] text-end">
                    {t.debit}
                  </TableHead>
                  <TableHead className="w-[140px] text-end">
                    {t.credit}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines.map((line, index) => (
                  <TableRow key={line.id || `${line.accountCode}-${index}`}>
                    <TableCell className="text-center tabular-nums">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      {line.accountId ? (
                        <Link
                          href={`/company/accounting/chart-of-accounts/${encodeURIComponent(line.accountId)}`}
                          className="block rounded-lg px-2 py-1 transition hover:bg-muted hover:underline"
                          title={t.openAccount}
                        >
                          <p className="font-semibold">
                            {line.accountName || "—"}
                          </p>
                          <p
                            className="mt-1 text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            {line.accountCode || "—"}
                          </p>
                        </Link>
                      ) : (
                        <div>
                          <p className="font-semibold">
                            {line.accountName || "—"}
                          </p>
                          <p
                            className="mt-1 text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            {line.accountCode || "—"}
                          </p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{line.costCenter}</TableCell>
                    <TableCell>{line.description || "—"}</TableCell>
                    <TableCell className="text-end">
                      {line.debit ? (
                        <Money value={line.debit} label={t.sar} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      {line.credit ? (
                        <Money value={line.credit} label={t.sar} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell colSpan={4}>
                    {locale === "ar" ? "الإجمالي" : "Total"}
                  </TableCell>
                  <TableCell className="text-end">
                    <Money value={entry.totalDebit} label={t.sar} />
                  </TableCell>
                  <TableCell className="text-end">
                    <Money value={entry.totalCredit} label={t.sar} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
