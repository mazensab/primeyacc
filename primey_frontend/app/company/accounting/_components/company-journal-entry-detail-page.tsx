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
  FileSpreadsheet,
  FileText,
  Hash,
  Landmark,
  Printer,
  RefreshCw,
  UserCheck,
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
    print: "طباعة القيد",
    export: "تصدير Excel",
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
    lineNo: "م",
    total: "الإجمالي",
    notFound: "لم يتم العثور على القيد المطلوب.",
    loadFailed: "تعذر تحميل تفاصيل القيد.",
    loading: "جاري تحميل تفاصيل القيد...",
    sar: "ريال سعودي",
    openAccount: "فتح تفاصيل الحساب",
    draft: "مسودة",
    posted: "مرحل",
    reversed: "معكوس",
    cancelled: "ملغي",
    printBlocked: "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.",
    exportReady: "تم تجهيز ملف Excel بنجاح.",
    exportEmpty: "لا توجد سطور لتصديرها.",
    documentTitle: "نموذج قيد يومية",
    companyFallback: "الشركة الحالية",
    preparedBy: "إعداد",
    reviewedBy: "مراجعة",
    approvedBy: "اعتماد",
    generatedAt: "تاريخ الطباعة",
  },
  en: {
    badge: "Journal Entry Details",
    title: "Journal Entry Details",
    subtitle: "View entry information, debit and credit lines, and linked accounts.",
    back: "Back to Journal Entries",
    refresh: "Refresh",
    print: "Print Entry",
    export: "Export Excel",
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
    lineNo: "No.",
    total: "Total",
    notFound: "The requested journal entry was not found.",
    loadFailed: "Could not load journal entry details.",
    loading: "Loading journal entry details...",
    sar: "Saudi Riyal",
    openAccount: "Open account details",
    draft: "Draft",
    posted: "Posted",
    reversed: "Reversed",
    cancelled: "Cancelled",
    printBlocked: "The print window could not be opened. Allow pop-ups and try again.",
    exportReady: "Excel file prepared successfully.",
    exportEmpty: "There are no lines to export.",
    documentTitle: "Journal Entry Voucher",
    companyFallback: "Current Company",
    preparedBy: "Prepared by",
    reviewedBy: "Reviewed by",
    approvedBy: "Approved by",
    generatedAt: "Printed at",
  },
} as const;

function initialLocale(): Locale {
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

function extractCompanyName(
  payload: unknown,
  locale: Locale,
  fallback: string,
) {
  const source = record(payload);
  const data = record(source.data);
  const membership = record(
    source.membership || data.membership,
  );
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
    fallback,
  );
}
function normalizeLine(value: unknown): JournalLine {
  const source = record(value);
  const account = record(source.account);
  const costCenter = record(source.cost_center);

  return {
    id: text(source.id || source.pk),
    accountId: text(source.account_id || account.id || account.pk),
    accountCode: text(source.account_code || account.code),
    accountName: text(
      source.account_name ||
        account.name ||
        account.name_ar ||
        account.name_en ||
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
        costCenter.name_ar ||
        costCenter.name_en ||
        costCenter.code,
      "—",
    ),
    debit: numberValue(source.debit || source.debit_amount),
    credit: numberValue(source.credit || source.credit_amount),
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
    totalDebit: numberValue(source.total_debit || source.debit_total),
    totalCredit: numberValue(source.total_credit || source.credit_total),
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

function reportDateTime() {
  const value = new Date();
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function Money({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold tabular-nums">
      <span dir="ltr" lang="en">
        {money(value)}
      </span>

      <Image
        src="/currency/sar.svg"
        alt={label}
        width={15}
        height={15}
        className="h-4 w-4 shrink-0"
      />
    </span>
  );
}

function statusLabel(status: string, locale: Locale) {
  const normalized = status.toUpperCase();
  const t = translations[locale];

  if (normalized === "POSTED") return t.posted;
  if (normalized === "REVERSED") return t.reversed;
  if (normalized === "CANCELLED") return t.cancelled;
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

  if (normalized === "CANCELLED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
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
    <div className="rounded-lg border bg-background px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>

      <div className="mt-2 min-h-5 text-sm font-semibold" dir={dir}>
        {value || "—"}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="group rounded-lg border bg-card shadow-none transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="mt-3 text-xl">{value}</CardTitle>
        </div>

        <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:text-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1450px] space-y-5">
        <Card className="rounded-lg">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg" />
          ))}
        </div>

        <Skeleton className="h-96 rounded-lg" />
      </div>
    </main>
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
  const [companyName, setCompanyName] = React.useState("");
  const [companyNameLoaded, setCompanyNameLoaded] =
    React.useState(false);
  const autoPrintStartedRef = React.useRef(false);

  React.useEffect(() => {
    const applyLocale = () => {
      const next = initialLocale();
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

  const t = translations[locale];
  const isRtl = locale === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  React.useEffect(() => {
    let active = true;
    setCompanyNameLoaded(false);
    void fetchJson<unknown>("/api/auth/whoami/")
      .then((payload) => {
        if (!active) return;
        setCompanyName(
          extractCompanyName(
            payload,
            locale,
            translations[locale].companyFallback,
          ),
        );
      })
      .catch(() => {
        if (!active) return;
        setCompanyName(
          translations[locale].companyFallback,
        );
      })
      .finally(() => {
        if (active) {
          setCompanyNameLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [locale]);
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

  function buildEntryDocument(mode: "excel" | "print") {
    if (!entry) return "";

    const align = isRtl ? "right" : "left";
    const lines = entry.lines
      .map(
        (line, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td>
              <strong>${escapeHtml(line.accountName || "—")}</strong>
              <div class="muted ltr">${escapeHtml(line.accountCode || "—")}</div>
            </td>
            <td>${escapeHtml(line.costCenter || "—")}</td>
            <td>${escapeHtml(line.description || "—")}</td>
            <td class="number">${escapeHtml(line.debit ? money(line.debit) : "—")}</td>
            <td class="number">${escapeHtml(line.credit ? money(line.credit) : "—")}</td>
          </tr>`,
      )
      .join("");

    const officeXml =
      mode === "excel"
        ? `<!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${escapeHtml(t.lines.slice(0, 31))}</x:Name>
                  <x:WorksheetOptions>
                    ${isRtl ? "<x:DisplayRightToLeft/>" : ""}
                    <x:Selected/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
        <![endif]-->`
        : "";

    return `<!doctype html>
      <html
        lang="${locale}"
        dir="${dir}"
        xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40"
      >
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.documentTitle)} - ${escapeHtml(entry.number)}</title>
          ${officeXml}

          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: ${mode === "print" ? "0" : "10px"};
              color: #111827;
              direction: ${dir};
              font-family: Tahoma, Arial, sans-serif;
              font-size: 10px;
            }

            .document {
              width: 100%;
              max-width: 190mm;
              margin: 0 auto;
            }

            .header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid #000;
            }

            .company-name {
              max-width: 118mm;
              font-size: 12px;
              font-weight: 700;
              line-height: 1.6;
              overflow-wrap: anywhere;
            }

            h1 {
              margin: 5px 0 0;
              font-size: 22px;
            }

            .document-number {
              min-width: 62mm;
              border: 1px solid #000;
              padding: 9px;
              text-align: ${align};
            }

            .document-number strong {
              display: block;
              margin-top: 4px;
              direction: ltr;
              unicode-bidi: embed;
              font-size: 16px;
            }

            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              margin-top: 10px;
              border-top: 1px solid #000;
              border-inline-start: 1px solid #000;
            }

            .meta-item {
              min-height: 48px;
              padding: 7px;
              border-inline-end: 1px solid #000;
              border-bottom: 1px solid #000;
            }

            .label,
            .muted {
              color: #4b5563;
              font-size: 9px;
            }

            .value {
              margin-top: 5px;
              font-weight: 700;
            }

            .description {
              margin-top: 10px;
              border: 1px solid #000;
              padding: 8px;
              min-height: 48px;
            }

            .section-title {
              margin: 12px 0 6px;
              font-size: 13px;
              font-weight: 700;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            thead {
              display: table-header-group;
            }

            tr {
              page-break-inside: avoid;
            }

            th,
            td {
              border: 1px solid #000;
              padding: 6px 5px;
              text-align: ${align};
              vertical-align: middle;
              overflow-wrap: anywhere;
            }

            th {
              background: #e5e7eb;
              font-weight: 700;
            }

            .center {
              text-align: center;
            }

            .number,
            .ltr {
              direction: ltr;
              unicode-bidi: embed;
              white-space: nowrap;
              mso-number-format: "\\@";
            }

            .number {
              text-align: right;
            }

            .total-row td {
              background: #f3f4f6;
              font-weight: 700;
            }

            .signatures {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 10px;
              margin-top: 18px;
              page-break-inside: avoid;
            }

            .signature {
              min-height: 58px;
              padding: 8px;
              border: 1px solid #000;
            }

            .footer {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin-top: 12px;
              padding-top: 7px;
              border-top: 1px solid #000;
              color: #4b5563;
              font-size: 8px;
            }
          </style>
        </head>

        <body>
          <div class="document">
            <div class="header">
              <div>
                <div class="company-name">${escapeHtml(
                  companyName || t.companyFallback,
                )}</div>
                <h1>${escapeHtml(t.documentTitle)}</h1>
              </div>

              <div class="document-number">
                <span>${escapeHtml(t.number)}</span>
                <strong>${escapeHtml(entry.number)}</strong>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-item">
                <div class="label">${escapeHtml(t.date)}</div>
                <div class="value ltr">${escapeHtml(formatDate(entry.date))}</div>
              </div>

              <div class="meta-item">
                <div class="label">${escapeHtml(t.status)}</div>
                <div class="value">${escapeHtml(statusLabel(entry.status, locale))}</div>
              </div>

              <div class="meta-item">
                <div class="label">${escapeHtml(t.currency)}</div>
                <div class="value ltr">${escapeHtml(entry.currency || "SAR")}</div>
              </div>

              <div class="meta-item">
                <div class="label">${escapeHtml(t.createdBy)}</div>
                <div class="value">${escapeHtml(entry.createdBy || "—")}</div>
              </div>
            </div>

            <div class="description">
              <div class="label">${escapeHtml(t.description)}</div>
              <div class="value">${escapeHtml(entry.description || "—")}</div>
            </div>

            <div class="section-title">${escapeHtml(t.lines)}</div>

            <table>
              <colgroup>
                <col style="width: 7%;" />
                <col style="width: 27%;" />
                <col style="width: 16%;" />
                <col style="width: 24%;" />
                <col style="width: 13%;" />
                <col style="width: 13%;" />
              </colgroup>

              <thead>
                <tr>
                  <th class="center">${escapeHtml(t.lineNo)}</th>
                  <th>${escapeHtml(t.account)}</th>
                  <th>${escapeHtml(t.costCenter)}</th>
                  <th>${escapeHtml(t.lineDescription)}</th>
                  <th>${escapeHtml(t.debit)}</th>
                  <th>${escapeHtml(t.credit)}</th>
                </tr>
              </thead>

              <tbody>
                ${
                  lines ||
                  `<tr>
                    <td colspan="6" class="center">—</td>
                  </tr>`
                }

                <tr class="total-row">
                  <td colspan="4">${escapeHtml(t.total)}</td>
                  <td class="number">${escapeHtml(money(entry.totalDebit))}</td>
                  <td class="number">${escapeHtml(money(entry.totalCredit))}</td>
                </tr>
              </tbody>
            </table>

            ${
              mode === "print"
                ? `<div class="signatures">
                    <div class="signature">${escapeHtml(t.preparedBy)}</div>
                    <div class="signature">${escapeHtml(t.reviewedBy)}</div>
                    <div class="signature">${escapeHtml(t.approvedBy)}</div>
                  </div>`
                : ""
            }

            <div class="footer">
              <span>${escapeHtml(t.generatedAt)}: ${escapeHtml(reportDateTime())}</span>
              <span class="ltr">${escapeHtml(entry.number)}</span>
            </div>
          </div>
        </body>
      </html>`;
  }

  function exportEntryExcel() {
    if (!entry?.lines.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const blob = new Blob(
      ["\uFEFF", buildEntryDocument("excel")],
      {
        type: "application/vnd.ms-excel;charset=utf-8;",
      },
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `journal-entry-${entry.number || entry.id}.xls`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(t.exportReady);
  }

  function printEntryDocument() {
    if (!entry) return;

    const popup = window.open("", "_blank", "width=1100,height=900");

    if (!popup) {
      toast.error(t.printBlocked);
      return;
    }

    popup.opener = null;
    popup.document.open();
    popup.document.write(buildEntryDocument("print"));
    popup.document.close();

    popup.onafterprint = () => popup.close();

    window.setTimeout(() => {
      popup.focus();
      popup.print();
    }, 300);
  }

  React.useEffect(() => {
    if (
      !entry ||
      !companyNameLoaded ||
      autoPrintStartedRef.current
    ) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") !== "1") return;
    autoPrintStartedRef.current = true;
    const documentHtml = buildEntryDocument("print");
    window.document.open();
    window.document.write(documentHtml);
    window.document.close();
    window.onafterprint = () => window.close();
    window.setTimeout(() => {
      window.focus();
      window.print();
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyName,
    companyNameLoaded,
    entry,
    locale,
  ]);
  if (loading) return <DetailSkeleton />;

  if (!entry) {
    return (
      <main
        dir={dir}
        className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-[1450px]">
          <Card className="rounded-lg border-rose-200 shadow-none">
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
                  <ArrowLeft className="h-4 w-4" />
                  {t.back}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main
      dir={dir}
      className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[1450px] space-y-5">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="gap-4 p-5 sm:p-6 lg:flex lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <Badge variant="outline" className="rounded-full">
                <BookOpen className="h-3.5 w-3.5" />
                {t.badge}
              </Badge>

              <div>
                <CardTitle
                  className="text-3xl font-bold tracking-tight"
                  dir="ltr"
                  lang="en"
                >
                  {entry.number}
                </CardTitle>

                <CardDescription className="mt-2 leading-7">
                  {t.subtitle}
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/company/accounting/journal-entries">
                  <ArrowLeft className="h-4 w-4" />
                  {t.back}
                </Link>
              </Button>

              <Button variant="outline" onClick={() => void loadEntry()}>
                <RefreshCw className="h-4 w-4" />
                {t.refresh}
              </Button>

              <Button variant="outline" onClick={exportEntryExcel}>
                <FileSpreadsheet className="h-4 w-4" />
                {t.export}
              </Button>

              <Button onClick={printEntryDocument}>
                <Printer className="h-4 w-4" />
                {t.print}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t.status}
            value={
              <Badge
                variant="outline"
                className={`rounded-full ${statusClasses(entry.status)}`}
              >
                {statusLabel(entry.status, locale)}
              </Badge>
            }
            icon={BadgeCheck}
          />

          <MetricCard
            label={t.debit}
            value={<Money value={entry.totalDebit} label={t.sar} />}
            icon={Landmark}
          />

          <MetricCard
            label={t.credit}
            value={<Money value={entry.totalCredit} label={t.sar} />}
            icon={Landmark}
          />

          <MetricCard
            label={t.date}
            value={
              <span dir="ltr" lang="en" className="tabular-nums">
                {formatDate(entry.date)}
              </span>
            }
            icon={CalendarDays}
          />
        </div>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              {t.title}
            </CardTitle>
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
            <InfoField
              label={t.createdBy}
              value={
                <span className="inline-flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  {entry.createdBy}
                </span>
              }
            />
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
            <InfoField
              label={t.reversalOf}
              value={entry.reversalOf || "—"}
              dir="ltr"
            />
            <InfoField
              label={t.reversedBy}
              value={entry.reversedBy || "—"}
              dir="ltr"
            />

            <div className="md:col-span-2 xl:col-span-3">
              <InfoField label={t.description} value={entry.description} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
          <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-muted-foreground" />
                {t.lines}

                <Badge variant="outline" className="rounded-full tabular-nums">
                  {entry.lines.length.toLocaleString("en-US")}
                </Badge>
              </CardTitle>

              <CardDescription className="mt-1">
                {t.linesDesc}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={exportEntryExcel}>
                <FileSpreadsheet className="h-4 w-4" />
                {t.export}
              </Button>

              <Button variant="outline" onClick={printEntryDocument}>
                <Printer className="h-4 w-4" />
                {t.print}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="overflow-x-auto">
                <Table className="min-w-[950px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
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
                    {entry.lines.length ? (
                      entry.lines.map((line, index) => (
                        <TableRow
                          key={line.id || `${line.accountCode}-${index}`}
                          className="h-[62px]"
                        >
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
                                  lang="en"
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
                                  lang="en"
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
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-28 text-center text-muted-foreground"
                        >
                          —
                        </TableCell>
                      </TableRow>
                    )}

                    <TableRow className="bg-muted/30 font-bold hover:bg-muted/30">
                      <TableCell colSpan={4}>{t.total}</TableCell>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
