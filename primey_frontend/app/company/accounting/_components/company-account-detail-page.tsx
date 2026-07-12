"use client";
/* ============================================================
   📂 primey_frontend/app/company/accounting/_components/company-account-detail-page.tsx
   🧾 Mhamcloud — Company Accounting Account Detail
   ------------------------------------------------------------
   ✅ Approved Premium company detail pattern
   ✅ Real API only
   ✅ Chart of accounts detail
   ✅ Ledger / journal / trial-balance quick links
   ✅ SAR icon from public/currency/sar.svg
   ✅ Arabic/English via primey-locale
   ✅ No fake data
============================================================ */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  CircleAlert,
  CircleDollarSign,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Hash,
  Landmark,
  Layers3,
  Loader2,
  MoreVertical,
  Printer,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TableProperties,
  TriangleAlert,
  WalletCards,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
type DetailTab = "ledger" | "journal" | "payments";
type ApiRecord = Record<string, unknown>;
type AccountDetailRecord = {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  accountType: string;
  normalBalance: string;
  level: string;
  isGroup: boolean;
  status: "active" | "inactive";
  parentId: string;
  parentCode: string;
  parentName: string;
  childrenCount: number;
  openingBalance: string;
  currentBalance: string;
  debitTotal: string;
  creditTotal: string;
  description: string;
  createdAt: string | null;
  updatedAt: string | null;
};
type RelatedRow = {
  id: string;
  number: string;
  date: string | null;
  description: string;
  debit: string;
  credit: string;
  balance: string;
  href: string;
  accountMatches: boolean;
};
const translations = {
  ar: {
    badge: "دليل الحسابات",
    title: "تفاصيل الحساب المحاسبي",
    subtitle: "ملف الحساب مع بيانات التعريف، الرصيد، دفتر الأستاذ، والقيود المرتبطة.",
    back: "العودة لدليل الحسابات",
    refresh: "تحديث",
    print: "طباعة",
    export: "تصدير Excel",
    exportReady: "تم تجهيز ملف Excel بنجاح.",
    printReady: "تم تجهيز صفحة الطباعة.",
    printBlocked:
      "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.",
    noExportRows: "لا توجد بيانات في هذا الجدول للتصدير.",
    noPrintRows: "لا توجد بيانات في هذا الجدول للطباعة.",
    generatedAt: "تم الإنشاء في",
    actions: "الإجراءات",
    records: "سجلات الحساب",
    refreshed: "تم تحديث بيانات الحساب.",
    status: "الحالة",
    active: "نشط",
    inactive: "معطل",
    accountInfo: "بيانات الحساب",
    accountInfoDesc: "رقم الحساب، الاسم، النوع، المستوى، وطبيعة الحساب.",
    balances: "الأرصدة",
    balancesDesc: "الرصيد الافتتاحي، الرصيد الحالي، إجمالي المدين والدائن.",
    structure: "هيكل الحساب",
    structureDesc: "الحساب الأب وعدد الحسابات الفرعية.",
    ledger: "دفتر الأستاذ",
    ledgerDesc: "الحركات المطابقة لهذا الحساب فقط حسب البيانات المتاحة.",
    journalEntries: "القيود اليومية",
    journalEntriesDesc: "القيود المرتبطة بهذا الحساب فقط، من تفاصيل القيود أو من حركات دفتر الأستاذ المطابقة.",
    quickLinks: "اختصارات",
    quickLinksDesc: "تنقل سريع للتقارير والحركات المرتبطة.",
    code: "رقم الحساب",
    name: "اسم الحساب",
    nameAr: "الاسم العربي",
    nameEn: "الاسم الإنجليزي",
    accountType: "نوع الحساب",
    normalBalance: "طبيعة الرصيد",
    level: "المستوى",
    isGroup: "حساب أب",
    isLeaf: "حساب فرعي",
    parent: "الحساب الأب",
    childrenCount: "الحسابات الفرعية",
    openingBalance: "الرصيد الافتتاحي",
    currentBalance: "الرصيد الحالي",
    debitTotal: "إجمالي المدين",
    creditTotal: "إجمالي الدائن",
    description: "الوصف",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    document: "المستند",
    date: "التاريخ",
    debit: "مدين",
    credit: "دائن",
    balance: "الرصيد",
    open: "فتح",
    noRows: "لا توجد سجلات حالياً.",
    notAvailable: "غير متوفر",
    ledgerReport: "تقرير دفتر الأستاذ",
    trialBalance: "ميزان المراجعة",
    journalEntriesPage: "القيود اليومية",
    chart: "دليل الحسابات",
    errorTitle: "تعذر تحميل تفاصيل الحساب",
    errorDesc: "تأكد من صلاحية الدخول ومن توفر الحساب ثم أعد المحاولة.",
    emptyTitle: "لم يتم العثور على الحساب",
    emptyDesc: "لا يوجد حساب مطابق لهذا الرابط.",
    tryAgain: "إعادة المحاولة",
  },
  en: {
    badge: "Chart of accounts",
    title: "Accounting account details",
    subtitle: "Account profile with identity, balance, ledger, and linked journal entries.",
    back: "Back to chart of accounts",
    refresh: "Refresh",
    print: "Print",
    export: "Export Excel",
    exportReady: "Excel file prepared successfully.",
    printReady: "Print page prepared.",
    printBlocked:
      "The print window could not be opened. Allow pop-ups and try again.",
    noExportRows: "There is no data in this table to export.",
    noPrintRows: "There is no data in this table to print.",
    generatedAt: "Generated at",
    actions: "Actions",
    records: "Account records",
    refreshed: "Account details refreshed.",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    accountInfo: "Account information",
    accountInfoDesc: "Account code, name, type, level, and normal balance.",
    balances: "Balances",
    balancesDesc: "Opening balance, current balance, total debit, and total credit.",
    structure: "Account structure",
    structureDesc: "Parent account and child accounts count.",
    ledger: "Ledger",
    ledgerDesc: "Only movements matching this account when available.",
    journalEntries: "Journal entries",
    journalEntriesDesc: "Only journal entries linked to this account, from entry details or matching ledger rows.",
    quickLinks: "Quick links",
    quickLinksDesc: "Quick navigation to related accounting reports.",
    code: "Account code",
    name: "Account name",
    nameAr: "Arabic name",
    nameEn: "English name",
    accountType: "Account type",
    normalBalance: "Normal balance",
    level: "Level",
    isGroup: "Parent account",
    isLeaf: "Leaf account",
    parent: "Parent account",
    childrenCount: "Child accounts",
    openingBalance: "Opening balance",
    currentBalance: "Current balance",
    debitTotal: "Total debit",
    creditTotal: "Total credit",
    description: "Description",
    createdAt: "Created at",
    updatedAt: "Updated at",
    document: "Document",
    date: "Date",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    open: "Open",
    noRows: "No records currently.",
    notAvailable: "Not available",
    ledgerReport: "Ledger report",
    trialBalance: "Trial balance",
    journalEntriesPage: "Journal entries",
    chart: "Chart of accounts",
    errorTitle: "Could not load account details",
    errorDesc: "Check access and account availability, then try again.",
    emptyTitle: "Account not found",
    emptyDesc: "No matching account was found for this link.",
    tryAgain: "Try again",
  },
} as const;
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
function toBool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const text = normalizeText(value).toLowerCase();
  return ["1", "true", "yes", "y", "active", "group"].includes(text);
}
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
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
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}
function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(toNumber(value)));
}
function formatReportDateTime() {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function MoneyValue({ value }: { value: unknown }) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap font-semibold tabular-nums"
    >
      <span
        dir="ltr"
        lang="en"
      >
        {formatMoney(value)}
      </span>
      <Image
        src="/currency/sar.svg"
        alt="SAR"
        width={14}
        height={14}
        className="h-3.5 w-3.5 shrink-0"
      />
    </span>
  );
}
function statusValue(value: unknown): "active" | "inactive" {
  if (typeof value === "boolean") return value ? "active" : "inactive";
  const text = normalizeText(value, "active").toUpperCase();
  return ["INACTIVE", "DISABLED", "SUSPENDED", "FALSE", "0"].includes(text) ? "inactive" : "active";
}
function StatusBadge({ value, locale }: { value: "active" | "inactive"; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={
        value === "active"
          ? "rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700"
          : "rounded-full border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-700"
      }
    >
      {translations[locale][value]}
    </Badge>
  );
}
function extractArray(payload: unknown): unknown[] {
  const visited = new Set<unknown>();
  function unwrap(value: unknown, depth = 0): unknown[] {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object" || depth > 6 || visited.has(value)) return [];
    visited.add(value);
    const record = asRecord(value);
    const candidates = [
      record.results,
      record.data,
      record.items,
      record.rows,
      record.records,
      record.objects,
      record.payload,
      record.response,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    for (const candidate of candidates) {
      const nested = unwrap(candidate, depth + 1);
      if (nested.length) return nested;
    }
    return [];
  }
  return unwrap(payload);
}
function extractObject(payload: unknown): ApiRecord {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  const result = asRecord(record.result);
  const candidates = [
    record.account,
    record.item,
    record.record,
    record.object,
    data.account,
    data.item,
    data.record,
    data.object,
    result.account,
    result.item,
    result.record,
    result.object,
    data,
    result,
    record,
  ];
  for (const candidate of candidates) {
    const item = asRecord(candidate);
    if (Object.keys(item).length) return item;
  }
  return {};
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
function normalizeAccount(payload: unknown): AccountDetailRecord {
  const record = extractObject(payload);
  const parent = asRecord(record.parent);
  return {
    id: normalizeText(record.id || record.account_id || record.pk || record.uuid),
    code: normalizeText(record.code || record.account_code || record.number, "—"),
    name: normalizeText(record.name || record.display_name || record.title || record.name_ar || record.name_en, "—"),
    nameAr: normalizeText(record.name_ar || record.arabic_name || record.name),
    nameEn: normalizeText(record.name_en || record.english_name),
    accountType: normalizeText(record.account_type || record.type || record.category, "—"),
    normalBalance: normalizeText(record.normal_balance || record.balance_type || record.nature, "—"),
    level: normalizeText(record.level || record.depth, "—"),
    isGroup: toBool(record.is_group ?? record.is_parent ?? record.has_children),
    status: statusValue(record.status ?? record.is_active),
    parentId: normalizeText(record.parent_id || parent.id),
    parentCode: normalizeText(record.parent_code || parent.code),
    parentName: normalizeText(record.parent_name || parent.name),
    childrenCount: Math.max(
      0,
      Math.trunc(
        toNumber(
          record.children_count ??
            record.child_count ??
            record.childrenCount ??
            (Array.isArray(record.children) ? record.children.length : 0),
        ),
      ),
    ),
    openingBalance: normalizeText(record.opening_balance ?? record.openingBalance ?? "0.00"),
    currentBalance: normalizeText(record.current_balance ?? record.balance ?? record.closing_balance ?? "0.00"),
    debitTotal: normalizeText(record.debit_total ?? record.total_debit ?? record.debit ?? "0.00"),
    creditTotal: normalizeText(record.credit_total ?? record.total_credit ?? record.credit ?? "0.00"),
    description: normalizeText(record.description || record.notes),
    createdAt: normalizeText(record.created_at || record.created) || null,
    updatedAt: normalizeText(record.updated_at || record.modified_at || record.updated) || null,
  };
}
function normalizeComparable(value: unknown) {
  return normalizeText(value)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function matchesAny(value: unknown, values: Set<string>) {
  const normalized = normalizeComparable(value);
  return normalized.length > 0 && values.has(normalized);
}
function getAccountIdentity(account: AccountDetailRecord) {
  const ids = new Set<string>();
  const codes = new Set<string>();
  const names = new Set<string>();
  [account.id].forEach((value) => {
    const normalized = normalizeComparable(value);
    if (normalized) ids.add(normalized);
  });
  [account.code].forEach((value) => {
    const normalized = normalizeComparable(value);
    if (normalized && normalized !== "—") codes.add(normalized);
  });
  [account.name, account.nameAr, account.nameEn].forEach((value) => {
    const normalized = normalizeComparable(value);
    if (normalized && normalized !== "—") names.add(normalized);
  });
  return { ids, codes, names };
}
function recordDirectlyMatchesAccount(record: ApiRecord, account: AccountDetailRecord) {
  const identity = getAccountIdentity(account);
  const idKeys = [
    "account_id",
    "accountId",
    "ledger_account_id",
    "ledgerAccountId",
    "chart_account_id",
    "chartAccountId",
    "accounting_account_id",
    "accountingAccountId",
    "line_account_id",
    "lineAccountId",
    "cash_account_id",
    "cashAccountId",
    "bank_account_id",
    "bankAccountId",
    "treasury_account_id",
    "treasuryAccountId",
    "counterparty_account_id",
    "counterpartyAccountId",
    "debit_account_id",
    "debitAccountId",
    "credit_account_id",
    "creditAccountId",
  ];
  const codeKeys = [
    "account_code",
    "accountCode",
    "ledger_account_code",
    "ledgerAccountCode",
    "chart_account_code",
    "chartAccountCode",
    "accounting_account_code",
    "accountingAccountCode",
    "line_account_code",
    "lineAccountCode",
    "cash_account_code",
    "cashAccountCode",
    "bank_account_code",
    "bankAccountCode",
    "treasury_account_code",
    "treasuryAccountCode",
    "counterparty_account_code",
    "counterpartyAccountCode",
    "debit_account_code",
    "debitAccountCode",
    "credit_account_code",
    "creditAccountCode",
  ];
  const nameKeys = [
    "account_name",
    "accountName",
    "ledger_account_name",
    "ledgerAccountName",
    "chart_account_name",
    "chartAccountName",
    "accounting_account_name",
    "accountingAccountName",
    "line_account_name",
    "lineAccountName",
    "cash_account_name",
    "cashAccountName",
    "bank_account_name",
    "bankAccountName",
    "treasury_account_name",
    "treasuryAccountName",
    "counterparty_account_name",
    "counterpartyAccountName",
    "debit_account_name",
    "debitAccountName",
    "credit_account_name",
    "creditAccountName",
  ];
  for (const key of idKeys) {
    if (matchesAny(record[key], identity.ids)) return true;
  }
  for (const key of codeKeys) {
    if (matchesAny(record[key], identity.codes)) return true;
  }
  for (const key of nameKeys) {
    if (matchesAny(record[key], identity.names)) return true;
  }
  const accountValue = record.account ?? record.accountId ?? record.account_id;
  if (matchesAny(accountValue, identity.ids) || matchesAny(accountValue, identity.codes)) {
    return true;
  }
  return false;
}
function accountObjectMatchesAccount(value: unknown, account: AccountDetailRecord) {
  const record = asRecord(value);
  if (!Object.keys(record).length) return false;
  const identity = getAccountIdentity(account);
  return (
    matchesAny(record.id ?? record.account_id ?? record.accountId, identity.ids) ||
    matchesAny(record.code ?? record.account_code ?? record.accountCode, identity.codes) ||
    matchesAny(record.name ?? record.name_ar ?? record.name_en ?? record.account_name, identity.names)
  );
}
function relatedRecordBelongsToAccount(value: unknown, account: AccountDetailRecord, depth = 0): boolean {
  if (depth > 6 || !isRecord(value)) return false;
  const record = asRecord(value);
  if (recordDirectlyMatchesAccount(record, account)) return true;
  const nestedAccountKeys = [
    "account",
    "ledger_account",
    "ledgerAccount",
    "chart_account",
    "chartAccount",
    "accounting_account",
    "accountingAccount",
    "line_account",
    "lineAccount",
    "cash_account",
    "cashAccount",
    "bank_account",
    "bankAccount",
    "treasury_account",
    "treasuryAccount",
    "counterparty_account",
    "counterpartyAccount",
    "debit_account",
    "debitAccount",
    "credit_account",
    "creditAccount",
  ];
  for (const key of nestedAccountKeys) {
    if (accountObjectMatchesAccount(record[key], account)) return true;
  }
  const arrayKeys = [
    "lines",
    "items",
    "entries",
    "rows",
    "results",
    "movements",
    "transactions",
    "journal_lines",
    "journalLines",
    "entry_lines",
    "entryLines",
  ];
  for (const key of arrayKeys) {
    const rows = record[key];
    if (Array.isArray(rows) && rows.some((item) => relatedRecordBelongsToAccount(item, account, depth + 1))) {
      return true;
    }
  }
  return false;
}
function findMatchedAccountLine(value: unknown, account: AccountDetailRecord, depth = 0): ApiRecord | null {
  if (depth > 6 || !isRecord(value)) return null;
  const record = asRecord(value);
  if (recordDirectlyMatchesAccount(record, account)) {
    return record;
  }
  const arrayKeys = [
    "lines",
    "items",
    "entries",
    "rows",
    "results",
    "movements",
    "transactions",
    "journal_lines",
    "journalLines",
    "entry_lines",
    "entryLines",
  ];
  for (const key of arrayKeys) {
    const rows = record[key];
    if (!Array.isArray(rows)) continue;
    for (const item of rows) {
      const matched = findMatchedAccountLine(item, account, depth + 1);
      if (matched) return matched;
    }
  }
  return null;
}
function normalizeRelatedRow(value: unknown, hrefBase = "", account?: AccountDetailRecord): RelatedRow {
  const record = asRecord(value);
  const matchedLine = account ? findMatchedAccountLine(value, account) : null;
  const amountRecord = matchedLine || record;
  const id = normalizeText(record.id || record.entry_id || record.line_id || record.uuid || record.pk);
  const number = normalizeText(
    record.entry_number ||
      record.document_number ||
      record.number ||
      record.reference ||
      record.transaction_number ||
      record.code ||
      id,
    "—",
  );
  const accountMatches = account ? relatedRecordBelongsToAccount(value, account) : true;
  const routeValue = hrefBase.includes("/journal-entries")
    ? number
    : id;
  return {
    id,
    number,
    date:
      normalizeText(
        amountRecord.entry_date ||
          amountRecord.date ||
          amountRecord.posting_date ||
          amountRecord.transaction_date ||
          record.entry_date ||
          record.date ||
          record.posting_date ||
          record.transaction_date ||
          record.created_at,
      ) || null,
    description: normalizeText(
      amountRecord.description ||
        amountRecord.memo ||
        amountRecord.notes ||
        record.description ||
        record.memo ||
        record.notes ||
        record.account_name,
    ),
    debit: normalizeText(
      amountRecord.debit ||
        amountRecord.debit_amount ||
        amountRecord.total_debit ||
        amountRecord.debit_total ||
        record.debit ||
        record.debit_amount ||
        record.total_debit ||
        "0.00",
    ),
    credit: normalizeText(
      amountRecord.credit ||
        amountRecord.credit_amount ||
        amountRecord.total_credit ||
        amountRecord.credit_total ||
        record.credit ||
        record.credit_amount ||
        record.total_credit ||
        "0.00",
    ),
    balance: normalizeText(
      amountRecord.balance ||
        amountRecord.running_balance ||
        amountRecord.closing_balance ||
        record.balance ||
        record.running_balance ||
        record.closing_balance ||
        "0.00",
    ),
    href:
      routeValue && routeValue !== "—" && hrefBase
        ? `${hrefBase}/${encodeURIComponent(routeValue)}`
        : "",
    accountMatches,
  };
}
async function fetchFirstAccountCollection(
  urls: string[],
  hrefBase: string,
  account: AccountDetailRecord,
) {
  for (const url of urls) {
    try {
      const payload = await fetchJson<unknown>(makeApiUrl(url));
      const rows = extractArray(payload).map((item) => normalizeRelatedRow(item, hrefBase, account));
      const matchedRows = rows.filter((row) => row.accountMatches);
      if (matchedRows.length) {
        return matchedRows;
      }
    } catch {
      // Try the next real endpoint variant.
    }
  }
  return [];
}

function uniqueRelatedRows(rows: RelatedRow[]) {
  const seen = new Set<string>();
  const output: RelatedRow[] = [];
  for (const row of rows) {
    const key = normalizeComparable(row.id || row.number || row.description);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(row);
  }
  return output;
}
function deriveJournalRowsFromLedgerRows(rows: RelatedRow[]) {
  return uniqueRelatedRows(
    rows.map((row) => ({
      ...row,
      balance: "0.00",
      accountMatches: true,
    })),
  );
}
async function fetchMatchingJournalEntries(
  urls: string[],
  hrefBase: string,
  account: AccountDetailRecord,
) {
  const matched: RelatedRow[] = [];
  const fetchedDetails = new Set<string>();
  for (const url of urls) {
    try {
      const payload = await fetchJson<unknown>(makeApiUrl(url));
      const rawRows = extractArray(payload);
      for (const item of rawRows.slice(0, 120)) {
        const directRow = normalizeRelatedRow(item, hrefBase, account);
        if (directRow.accountMatches) {
          matched.push(directRow);
          continue;
        }
        const record = asRecord(item);
        const entryId = normalizeText(record.id || record.entry_id || record.pk || record.uuid);
        if (!entryId || fetchedDetails.has(entryId)) continue;
        fetchedDetails.add(entryId);
        try {
          const detailPayload = await fetchJson<unknown>(
            makeApiUrl(`/api/company/accounting/journal-entries/${encodeURIComponent(entryId)}/`),
          );
          const detailObject = extractObject(detailPayload);
          const detailRow = normalizeRelatedRow(detailObject, hrefBase, account);
          if (detailRow.accountMatches) {
            matched.push({
              ...detailRow,
              id: detailRow.id || entryId,
              href: `${hrefBase}/${encodeURIComponent(
                detailRow.number && detailRow.number !== "—"
                  ? detailRow.number
                  : entryId,
              )}`,
            });
          }
        } catch {
          // If the detail endpoint is unavailable for this entry, keep trying the next one.
        }
      }
      const unique = uniqueRelatedRows(matched.filter((row) => row.accountMatches));
      if (unique.length) return unique;
    } catch {
      // Try the next real endpoint variant.
    }
  }
  return [];
}

function accountReportHref(basePath: string, account: AccountDetailRecord | null) {
  if (!account) return basePath;
  const params = new URLSearchParams();
  const id = normalizeText(account.id);
  const code = normalizeText(account.code);
  const name = normalizeText(account.name);
  if (id) {
    params.set("account_id", id);
    params.set("account", id);
  }
  if (code && code !== "—") {
    params.set("account_code", code);
    params.set("search", code);
    params.set("q", code);
  } else if (name && name !== "—") {
    params.set("search", name);
    params.set("q", name);
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}


const ORIGINAL_VOUCHER_API_BASES = [
  "/api/company/treasury/customer-payments/",
  "/api/company/treasury/supplier-payments/"
];
function uniquePaymentRows(rows: RelatedRow[]) {
  const seen = new Set<string>();
  const output: RelatedRow[] = [];
  for (const row of rows) {
    const key = normalizeComparable(`${row.number}|${row.date}|${row.debit}|${row.credit}|${row.description}`);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(row);
  }
  return output;
}
function collectDeepText(value: unknown, depth = 0): string {
  if (value == null || depth > 4) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => collectDeepText(item, depth + 1)).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(asRecord(value))
      .map((item) => collectDeepText(item, depth + 1))
      .join(" ");
  }
  return "";
}
function paymentRecordBelongsToAccount(value: unknown, account: AccountDetailRecord) {
  const searchable = normalizeComparable(collectDeepText(value));
  const candidates = [
    account.code,
    account.name,
    account.nameAr,
    account.nameEn,
  ]
    .map((item) => normalizeComparable(item))
    .filter((item) => item && item !== "—" && item.length >= 4);
  return candidates.some((candidate) => searchable.includes(candidate));
}
function isJournalReference(value: string) {
  const normalized = normalizeComparable(value);
  return (
    normalized.startsWith("cpay") ||
    normalized.startsWith("spay") ||
    normalized.startsWith("rev") ||
    normalized.startsWith("je")
  );
}
function extractOriginalVoucherNumbers(value: unknown) {
  const textValue = normalizeText(value);
  const matches = textValue.match(/\b(?:CP|SP)-\d{4}-\d{5,}\b/gi) || [];
  return Array.from(new Set(matches.map((item) => item.toUpperCase()))).filter(
    (item) => !isJournalReference(item),
  );
}
function pickVoucherNumber(record: Record<string, unknown>) {
  const directCandidates = [
    record.voucher_number,
    record.voucherNumber,
    record.voucher_no,
    record.voucherNo,
    record.receipt_voucher_number,
    record.receiptVoucherNumber,
    record.payment_voucher_number,
    record.paymentVoucherNumber,
    record.receipt_number,
    record.receiptNumber,
    record.payment_number,
    record.paymentNumber,
    record.document_number,
    record.documentNumber,
    record.reference_number,
    record.referenceNumber,
    record.number,
    record.code,
    record.reference,
  ]
    .map((item) => normalizeText(item))
    .filter((item) => item && item !== "—");
  const originalFromDirect = directCandidates.find((item) => !isJournalReference(item));
  if (originalFromDirect) return originalFromDirect;
  const originalFromText = extractOriginalVoucherNumbers(collectDeepText(record))[0];
  return originalFromText || directCandidates[0] || "—";
}
function pickAccountingReference(record: Record<string, unknown>) {
  const candidates = [
    record.accounting_reference,
    record.accountingReference,
    record.accounting_number,
    record.accountingNumber,
    record.journal_entry_number,
    record.journalEntryNumber,
    record.journal_reference,
    record.journalReference,
    record.entry_number,
    record.entryNumber,
  ]
    .map((item) => normalizeText(item))
    .filter((item) => item && item !== "—");
  return candidates[0] || "";
}

function voucherDetailHref(
  number: string,
  accountCode: string,
) {
  const normalized = normalizeText(number).toUpperCase();
  if (/^CP-\d{4}-\d+$/i.test(normalized)) {
    return `/company/treasury/receipt-vouchers/${encodeURIComponent(
      normalized,
    )}`;
  }
  if (/^SP-\d{4}-\d+$/i.test(normalized)) {
    return `/company/treasury/payment-vouchers/${encodeURIComponent(
      normalized,
    )}`;
  }
  const searchValue =
    normalized && normalized !== "—"
      ? normalized
      : accountCode;
  if (!searchValue) {
    return "/company/payments";
  }
  return `/company/payments?account_code=${encodeURIComponent(
    accountCode,
  )}&search=${encodeURIComponent(
    searchValue,
  )}&q=${encodeURIComponent(searchValue)}`;
}
function normalizePaymentRelatedRow(value: unknown, account: AccountDetailRecord): RelatedRow {
  const record = asRecord(value);
  const id = normalizeText(record.id || record.payment_id || record.voucher_id || record.pk || record.uuid);
  const number = pickVoucherNumber(record);
  const accountingReference = pickAccountingReference(record);
  const searchableType = normalizeComparable(
    `${number} ${record.type || ""} ${record.kind || ""} ${record.voucher_type || ""} ${record.payment_type || ""}`,
  );
  const isOutflow =
    searchableType.startsWith("sp") ||
    searchableType.includes("payment") ||
    searchableType.includes("supplier") ||
    searchableType.includes("صرف") ||
    searchableType.includes("دفع");
  const amount = normalizeText(
    record.amount ||
      record.total_amount ||
      record.paid_amount ||
      record.payment_amount ||
      record.receipt_amount ||
      record.value ||
      "0.00",
  );
  const partyName = normalizeText(
    record.party_name ||
      record.customer_name ||
      record.supplier_name ||
      record.counterparty_name ||
      record.beneficiary_name ||
      record.payer_name,
  );
  const status = normalizeText(record.status || record.state || record.lifecycle_status);
  const descriptionParts = [
    isOutflow ? "سند صرف" : "سند قبض",
    partyName,
    status && status !== "—" ? status : "",
    accountingReference,
  ].filter(Boolean);
  const href = voucherDetailHref(number, account.code);
  return {
    id,
    number,
    date:
      normalizeText(
        record.date ||
          record.payment_date ||
          record.receipt_date ||
          record.voucher_date ||
          record.posting_date ||
          record.created_at,
      ) || null,
    description: normalizeText(record.description || record.memo || record.notes || descriptionParts.join(" — ")),
    debit: isOutflow ? "0.00" : amount,
    credit: isOutflow ? amount : "0.00",
    balance: "0.00",
    href,
    accountMatches: paymentRecordBelongsToAccount(value, account),
  };
}
function buildVoucherApiUrls(account: AccountDetailRecord) {
  const encodedId = encodeURIComponent(account.id || "");
  const encodedCode = account.code && account.code !== "—" ? encodeURIComponent(account.code) : "";
  const encodedName = account.name && account.name !== "—" ? encodeURIComponent(account.name) : "";
  const queryVariants = [
    encodedCode ? `account_code=${encodedCode}&page_size=200` : "",
    encodedCode ? `treasury_account_code=${encodedCode}&page_size=200` : "",
    encodedCode ? `cash_account_code=${encodedCode}&page_size=200` : "",
    encodedCode ? `bank_account_code=${encodedCode}&page_size=200` : "",
    encodedCode ? `search=${encodedCode}&page_size=200` : "",
    encodedName ? `search=${encodedName}&page_size=200` : "",
    encodedId ? `account_id=${encodedId}&page_size=200` : "",
    "page_size=200",
  ].filter(Boolean);
  return Array.from(
    new Set(
      ORIGINAL_VOUCHER_API_BASES.flatMap((base) =>
        queryVariants.map((query) => `${base}${base.includes("?") ? "&" : "?"}${query}`),
      ),
    ),
  );
}
function deriveOriginalVoucherRowsFromAccountRows(rows: RelatedRow[], account: AccountDetailRecord) {
  const output: RelatedRow[] = [];
  for (const row of rows) {
    const refs = extractOriginalVoucherNumbers(`${row.number} ${row.description} ${row.href}`);
    for (const ref of refs) {
      const isOutflow = normalizeComparable(ref).startsWith("sp");
      output.push({
        ...row,
        number: ref,
        description: row.description,
        debit: isOutflow ? "0.00" : row.debit,
        credit: isOutflow ? row.credit || row.debit : row.credit,
        href: voucherDetailHref(ref, account.code),
        accountMatches: true,
      });
    }
  }
  return uniquePaymentRows(output);
}
async function fetchMatchingPaymentRows(account: AccountDetailRecord) {
  const urls = buildVoucherApiUrls(account);
  const matched: RelatedRow[] = [];
  for (const url of urls) {
    try {
      const payload = await fetchJson<unknown>(makeApiUrl(url));
      const rows = extractArray(payload)
        .filter((item) => paymentRecordBelongsToAccount(item, account))
        .map((item) => normalizePaymentRelatedRow(item, account))
        .filter((row) => row.accountMatches && row.number && !isJournalReference(row.number));
      matched.push(...rows);
    } catch {
      // Try next discovered endpoint. If none work, the page falls back to real ledger/journal rows.
    }
  }
  return uniquePaymentRows(matched);
}


function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="group rounded-lg border bg-card shadow-none transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">
            {title}
          </CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight">
            {value}
          </CardTitle>
        </div>
        <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
function DetailField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex min-h-[74px] items-start gap-3 rounded-lg border bg-background p-4">
      <span className="rounded-lg border bg-muted/30 p-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          {label}
        </p>
        <div className="mt-1 break-words text-sm font-medium text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}
function EmptyTableState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border bg-background px-6 py-10 text-center">
      <span className="rounded-full bg-muted p-4 text-muted-foreground">
        <FileText className="h-6 w-6" />
      </span>
      <p className="text-sm text-muted-foreground">
        {text}
      </p>
    </div>
  );
}
function TableHeaderActions({
  onExport,
  onPrint,
  exportLabel,
  printLabel,
}: {
  onExport: () => void;
  onPrint: () => void;
  exportLabel: string;
  printLabel: string;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onExport}
      >
        <FileSpreadsheet className="h-4 w-4" />
        {exportLabel}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPrint}
      >
        <Printer className="h-4 w-4" />
        {printLabel}
      </Button>
    </div>
  );
}
function RelatedTable({
  title,
  description,
  rows,
  locale,
  emptyText,
  onExport,
  onPrint,
}: {
  title: string;
  description: string;
  rows: RelatedRow[];
  locale: Locale;
  emptyText: string;
  onExport: () => void;
  onPrint: () => void;
}) {
  const router = useRouter();
  const t = translations[locale];
  return (
    <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
      <CardHeader className="px-5 pt-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              {title}
              <Badge
                variant="outline"
                className="rounded-full tabular-nums"
              >
                {formatInteger(rows.length)}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              {description}
            </CardDescription>
          </div>
          <TableHeaderActions
            onExport={onExport}
            onPrint={onPrint}
            exportLabel={t.export}
            printLabel={t.print}
          />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6">
        {rows.length ? (
          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[180px] px-4 text-start text-xs font-semibold">
                      {t.document}
                    </TableHead>
                    <TableHead className="w-[130px] px-4 text-start text-xs font-semibold">
                      {t.date}
                    </TableHead>
                    <TableHead className="px-4 text-start text-xs font-semibold">
                      {t.description}
                    </TableHead>
                    <TableHead className="w-[145px] px-4 text-start text-xs font-semibold">
                      {t.debit}
                    </TableHead>
                    <TableHead className="w-[145px] px-4 text-start text-xs font-semibold">
                      {t.credit}
                    </TableHead>
                    <TableHead className="w-[145px] px-4 text-start text-xs font-semibold">
                      {t.balance}
                    </TableHead>
                    <TableHead className="w-[90px] px-4 text-center text-xs font-semibold">
                      {t.open}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      key={`${row.id}-${row.number}-${index}`}
                      className={
                        row.href
                          ? "h-[62px] cursor-pointer hover:bg-muted/35"
                          : "h-[62px]"
                      }
                      onClick={() => {
                        if (row.href) {
                          router.push(row.href);
                        }
                      }}
                    >
                      <TableCell className="px-4 font-semibold tabular-nums">
                        {row.number}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground tabular-nums">
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell className="truncate px-4 text-muted-foreground">
                        {row.description || "—"}
                      </TableCell>
                      <TableCell className="px-4">
                        <MoneyValue value={row.debit} />
                      </TableCell>
                      <TableCell className="px-4">
                        <MoneyValue value={row.credit} />
                      </TableCell>
                      <TableCell className="px-4">
                        <MoneyValue value={row.balance} />
                      </TableCell>
                      <TableCell className="px-4 text-center">
                        {row.href ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={t.open}
                            title={t.open}
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(row.href);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <EmptyTableState text={emptyText} />
        )}
      </CardContent>
    </Card>
  );
}
function DetailSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-4 w-full max-w-3xl" />
          </CardHeader>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card
              key={index}
              className="rounded-lg border bg-card shadow-none"
            >
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-32" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
export function CompanyAccountDetailPage() {
  const params = useParams();
  const id = React.useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] || "" : String(value || "");
  }, [params]);
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [account, setAccount] = React.useState<AccountDetailRecord | null>(null);
  const [ledgerRows, setLedgerRows] = React.useState<RelatedRow[]>([]);
  const [journalRows, setJournalRows] = React.useState<RelatedRow[]>([]);
  const [paymentRows, setPaymentRows] = React.useState<RelatedRow[]>([]);
  const [activeTab, setActiveTab] =
    React.useState<DetailTab>("ledger");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ChevronLeft : ArrowRight;
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
  const loadAccount = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!id) {
        setAccount(null);
        setLoading(false);
        return;
      }
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        let payload: unknown;
        try {
          payload = await fetchJson<unknown>(makeApiUrl(`/api/company/accounting/accounts/${encodeURIComponent(id)}/`));
        } catch {
          const listPayload = await fetchJson<unknown>(makeApiUrl("/api/company/accounting/accounts/?page_size=500"));
          const match = extractArray(listPayload).find((item) => {
            const record = asRecord(item);
            return String(record.id || record.account_id || record.pk || "") === String(id);
          });
          payload = match || {};
        }
        const normalized = normalizeAccount(payload);
        setAccount(normalized.id || normalized.code !== "—" ? normalized : null);
        const encodedId = encodeURIComponent(id);
        const encodedCode = normalized.code && normalized.code !== "—" ? encodeURIComponent(normalized.code) : "";
        const encodedName = normalized.name && normalized.name !== "—" ? encodeURIComponent(normalized.name) : "";
        const ledgerUrls = [
          encodedCode ? `/api/company/accounting/reports/ledger/?account_code=${encodedCode}&page_size=100` : "",
          encodedCode ? `/api/company/accounting/ledger/?account_code=${encodedCode}&page_size=100` : "",
          `/api/company/accounting/reports/ledger/?account_id=${encodedId}&page_size=100`,
          `/api/company/accounting/ledger/?account_id=${encodedId}&page_size=100`,
          encodedCode ? `/api/company/accounting/reports/ledger/?account=${encodedCode}&page_size=100` : "",
          encodedName ? `/api/company/accounting/reports/ledger/?account_name=${encodedName}&page_size=100` : "",
        ].filter(Boolean) as string[];
        const journalUrls = [
          encodedCode ? `/api/company/accounting/journal-entries/?account_code=${encodedCode}&page_size=100` : "",
          encodedCode ? `/api/company/accounting/journal-entries/?account=${encodedCode}&page_size=100` : "",
          encodedCode ? `/api/company/accounting/journal-entries/?search=${encodedCode}&page_size=100` : "",
          encodedCode ? `/api/company/accounting/journal-entries/?q=${encodedCode}&page_size=100` : "",
          encodedName ? `/api/company/accounting/journal-entries/?account_name=${encodedName}&page_size=100` : "",
          `/api/company/accounting/journal-entries/?page_size=100`,
        ].filter(Boolean) as string[];
        const ledger = await fetchFirstAccountCollection(
          ledgerUrls,
          "/company/accounting/journal-entries",
          normalized,
        );
        const journals = await fetchMatchingJournalEntries(
          journalUrls,
          "/company/accounting/journal-entries",
          normalized,
        );

        const payments = await fetchMatchingPaymentRows(normalized);
        setLedgerRows(ledger);
        setJournalRows(journals.length ? journals : deriveJournalRowsFromLedgerRows(ledger));
        setPaymentRows(payments.length ? payments : deriveOriginalVoucherRowsFromAccountRows([...ledger, ...journals], normalized));
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
    [id, t.errorDesc, t.refreshed],
  );
  React.useEffect(() => {
    void loadAccount();
  }, [loadAccount]);
  function fallback(value: string | null | undefined) {
    return normalizeText(value, t.notAvailable);
  }

  function approvedReportStyles(
    align: "right" | "left",
  ) {
    return `
      body {
        font-family: Arial, sans-serif;
        color: #111827;
        margin: 0;
      }
      h1 {
        margin: 0 0 6px;
        font-size: 22px;
      }
      h2 {
        margin: 20px 0 8px;
        font-size: 16px;
      }
      .subtitle {
        margin: 0 0 6px;
        color: #4b5563;
      }
      .meta {
        margin: 0 0 16px;
        color: #6b7280;
        font-size: 11px;
      }
      .summary {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 14px;
      }
      .summary td {
        border: 1px solid #000;
        padding: 8px;
        text-align: ${align};
      }
      table.data {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      table.data th,
      table.data td {
        border: 1px solid #000;
        padding: 7px;
        text-align: ${align};
        vertical-align: top;
        overflow-wrap: anywhere;
      }
      table.data th {
        background: #f3f4f6;
        font-weight: 700;
      }
      .number,
      .text-value {
        direction: ltr;
        unicode-bidi: plaintext;
        font-variant-numeric: tabular-nums;
      }
      .number {
        white-space: nowrap;
      }
    `;
  }
  function approvedRowsTableHtml(
    rows: RelatedRow[],
  ) {
    const body = rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.number)}</td>
            <td class="text-value">${escapeHtml(
              formatDate(row.date),
            )}</td>
            <td>${escapeHtml(row.description || "—")}</td>
            <td class="number">${escapeHtml(
              formatMoney(row.debit),
            )}</td>
            <td class="number">${escapeHtml(
              formatMoney(row.credit),
            )}</td>
            <td class="number">${escapeHtml(
              formatMoney(row.balance),
            )}</td>
          </tr>
        `,
      )
      .join("");
    return `
      <table class="data">
        <thead>
          <tr>
            <th>${escapeHtml(t.document)}</th>
            <th>${escapeHtml(t.date)}</th>
            <th>${escapeHtml(t.description)}</th>
            <th>${escapeHtml(t.debit)}</th>
            <th>${escapeHtml(t.credit)}</th>
            <th>${escapeHtml(t.balance)}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    `;
  }
  function downloadApprovedAccountExcel(
    titleText: string,
    bodyHtml: string,
    filename: string,
  ) {
    const align =
      locale === "ar"
        ? "right"
        : "left";
    const html = `
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <style>
            ${approvedReportStyles(align)}
          </style>
        </head>
        <body>
          <h1>${escapeHtml(titleText)}</h1>
          <p class="subtitle">
            ${escapeHtml(account?.name || "")}
          </p>
          <p class="meta">
            ${escapeHtml(t.generatedAt)}:
            ${escapeHtml(formatReportDateTime())}
          </p>
          ${bodyHtml}
        </body>
      </html>
    `;
    const blob = new Blob(
      ["\uFEFF", html],
      {
        type:
          "application/vnd.ms-excel;charset=utf-8;",
      },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(t.exportReady);
  }
  function openApprovedAccountPrint(
    titleText: string,
    bodyHtml: string,
  ) {
    const printWindow = window.open(
      "",
      "_blank",
      "width=1400,height=900",
    );
    if (!printWindow) {
      toast.error(t.printBlocked);
      return;
    }
    const align =
      locale === "ar"
        ? "right"
        : "left";
    printWindow.opener = null;
    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(titleText)}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
            }
            ${approvedReportStyles(align)}
          </style>
        </head>
        <body>
          <h1>${escapeHtml(titleText)}</h1>
          <p class="subtitle">
            ${escapeHtml(account?.name || "")}
          </p>
          <p class="meta">
            ${escapeHtml(t.generatedAt)}:
            ${escapeHtml(formatReportDateTime())}
          </p>
          ${bodyHtml}
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
            window.onafterprint = function () {
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(t.printReady);
  }
  function exportAccountRows(
    rows: RelatedRow[],
    titleText: string,
    suffix: string,
  ) {
    if (!rows.length) {
      toast.warning(t.noExportRows);
      return;
    }
    downloadApprovedAccountExcel(
      titleText,
      approvedRowsTableHtml(rows),
      `primeyacc-account-${account?.code || id}-${suffix}-${new Date()
        .toISOString()
        .slice(0, 10)}.xls`,
    );
  }
  function printAccountRows(
    rows: RelatedRow[],
    titleText: string,
  ) {
    if (!rows.length) {
      toast.warning(t.noPrintRows);
      return;
    }
    openApprovedAccountPrint(
      titleText,
      approvedRowsTableHtml(rows),
    );
  }
  function approvedFullReportHtml() {
    if (!account) {
      return "";
    }
    const summary = `
      <table class="summary">
        <tr>
          <td>
            <strong>${escapeHtml(t.code)}</strong>
            <br />
            ${escapeHtml(account.code)}
          </td>
          <td>
            <strong>${escapeHtml(t.status)}</strong>
            <br />
            ${escapeHtml(t[account.status])}
          </td>
          <td>
            <strong>${escapeHtml(t.currentBalance)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(account.currentBalance))}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.openingBalance)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(account.openingBalance))}
            </span>
          </td>
        </tr>
        <tr>
          <td>
            <strong>${escapeHtml(t.accountType)}</strong>
            <br />
            ${escapeHtml(account.accountType)}
          </td>
          <td>
            <strong>${escapeHtml(t.normalBalance)}</strong>
            <br />
            ${escapeHtml(account.normalBalance)}
          </td>
          <td>
            <strong>${escapeHtml(t.debitTotal)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(account.debitTotal))}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.creditTotal)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(account.creditTotal))}
            </span>
          </td>
        </tr>
      </table>
    `;
    const ledgerSection = ledgerRows.length
      ? `
          <h2>${escapeHtml(t.ledger)}</h2>
          ${approvedRowsTableHtml(ledgerRows)}
        `
      : "";
    const journalSection = journalRows.length
      ? `
          <h2>${escapeHtml(t.journalEntries)}</h2>
          ${approvedRowsTableHtml(journalRows)}
        `
      : "";
    const paymentSection = paymentRows.length
      ? `
          <h2>${escapeHtml(paymentTitle)}</h2>
          ${approvedRowsTableHtml(paymentRows)}
        `
      : "";
    return `
      ${summary}
      ${ledgerSection}
      ${journalSection}
      ${paymentSection}
    `;
  }
  function exportApprovedFullReport() {
    if (!account) {
      return;
    }
    downloadApprovedAccountExcel(
      account.name,
      approvedFullReportHtml(),
      `primeyacc-account-${account.code}-${new Date()
        .toISOString()
        .slice(0, 10)}.xls`,
    );
  }
  function printApprovedFullReport() {
    if (!account) {
      return;
    }
    openApprovedAccountPrint(
      account.name,
      approvedFullReportHtml(),
    );
  }
  if (loading) return <DetailSkeleton />;
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
            <Button onClick={() => void loadAccount({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  if (!account) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-3xl bg-card shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-muted p-4 text-muted-foreground">
              <CircleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.emptyTitle}</CardTitle>
            <CardDescription>{t.emptyDesc}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="rounded-xl">
              <Link href={accountReportHref("/company/accounting/chart-of-accounts", account)}>
                <BackIcon className="h-4 w-4" />
                {t.back}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
const paymentTitle =
    locale === "ar"
      ? "السندات الأصلية والمدفوعات"
      : "Original vouchers and payments";
  const paymentDescription =
    locale === "ar"
      ? "سندات القبض والصرف الأصلية المرتبطة بهذا الحساب فقط، وليس أرقام القيود المحاسبية."
      : "Original receipt and payment vouchers linked only to this account, not journal references.";
  const tabs: Array<{
    key: DetailTab;
    label: string;
    count: number;
  }> = [
    {
      key: "ledger",
      label: t.ledger,
      count: ledgerRows.length,
    },
    {
      key: "journal",
      label: t.journalEntries,
      count: journalRows.length,
    },
    {
      key: "payments",
      label: paymentTitle,
      count: paymentRows.length,
    },
  ];
  const currentRows =
    activeTab === "ledger"
      ? ledgerRows
      : activeTab === "journal"
        ? journalRows
        : paymentRows;
  const currentTitle =
    activeTab === "ledger"
      ? t.ledger
      : activeTab === "journal"
        ? t.journalEntries
        : paymentTitle;
  const currentDescription =
    activeTab === "ledger"
      ? t.ledgerDesc
      : activeTab === "journal"
        ? t.journalEntriesDesc
        : paymentDescription;
  return (
    <main
      dir={dir}
      className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8"
      data-primey-account-detail="PRIMEY_ACCOUNT_DETAIL_APPROVED_V2"
    >
      <div className="mx-auto max-w-[1500px] space-y-5">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-2 text-start">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  {t.badge}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
                    {account.name}
                  </h1>
                  <StatusBadge
                    value={account.status}
                    locale={locale}
                  />
                </div>
                <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
                  {t.subtitle}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span
                    dir="ltr"
                    lang="en"
                    className="font-mono tabular-nums"
                  >
                    {account.code}
                  </span>
                  <span>•</span>
                  <span>{account.accountType}</span>
                  <span>•</span>
                  <span>
                    {account.isGroup
                      ? t.isGroup
                      : t.isLeaf}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                >
                  <Link
                    href={accountReportHref(
                      "/company/accounting/chart-of-accounts",
                      account,
                    )}
                  >
                    <BackIcon className="h-4 w-4" />
                    {t.back}
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void loadAccount({
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
                  onClick={exportApprovedFullReport}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={printApprovedFullReport}
                >
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
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
                    align={
                      locale === "ar"
                        ? "start"
                        : "end"
                    }
                    className="w-56"
                  >
                    <DropdownMenuItem asChild>
                      <Link
                        href={accountReportHref(
                          "/company/accounting/ledger",
                          account,
                        )}
                      >
                        <BookOpen className="h-4 w-4" />
                        {t.ledgerReport}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={accountReportHref(
                          "/company/accounting/journal-entries",
                          account,
                        )}
                      >
                        <FileText className="h-4 w-4" />
                        {t.journalEntriesPage}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={accountReportHref(
                          "/company/accounting/trial-balance",
                          account,
                        )}
                      >
                        <Activity className="h-4 w-4" />
                        {t.trialBalance}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href={accountReportHref(
                          "/company/payments",
                          account,
                        )}
                      >
                        <WalletCards className="h-4 w-4" />
                        {paymentTitle}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t.currentBalance}
            value={
              <MoneyValue
                value={account.currentBalance}
              />
            }
            description={t.balancesDesc}
            icon={Landmark}
          />
          <KpiCard
            title={t.openingBalance}
            value={
              <MoneyValue
                value={account.openingBalance}
              />
            }
            description={t.balancesDesc}
            icon={ReceiptText}
          />
          <KpiCard
            title={t.debitTotal}
            value={
              <MoneyValue
                value={account.debitTotal}
              />
            }
            description={t.balancesDesc}
            icon={CircleDollarSign}
          />
          <KpiCard
            title={t.creditTotal}
            value={
              <MoneyValue
                value={account.creditTotal}
              />
            }
            description={t.balancesDesc}
            icon={CircleDollarSign}
          />
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-5">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-5 pt-5 sm:px-6">
                <CardTitle className="text-base">
                  {t.accountInfo}
                </CardTitle>
                <CardDescription>
                  {t.accountInfoDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 px-5 pb-5 sm:px-6 md:grid-cols-2">
                <DetailField
                  label={t.code}
                  value={
                    <span
                      dir="ltr"
                      lang="en"
                      className="font-mono tabular-nums"
                    >
                      {fallback(account.code)}
                    </span>
                  }
                  icon={Hash}
                />
                <DetailField
                  label={t.name}
                  value={fallback(account.name)}
                  icon={TableProperties}
                />
                <DetailField
                  label={t.nameAr}
                  value={fallback(account.nameAr)}
                  icon={FileText}
                />
                <DetailField
                  label={t.nameEn}
                  value={fallback(account.nameEn)}
                  icon={FileText}
                />
                <DetailField
                  label={t.accountType}
                  value={fallback(account.accountType)}
                  icon={Layers3}
                />
                <DetailField
                  label={t.normalBalance}
                  value={fallback(account.normalBalance)}
                  icon={BadgeCheck}
                />
                <DetailField
                  label={t.level}
                  value={fallback(account.level)}
                  icon={Layers3}
                />
                <DetailField
                  label={
                    account.isGroup
                      ? t.isGroup
                      : t.isLeaf
                  }
                  value={
                    account.isGroup
                      ? t.isGroup
                      : t.isLeaf
                  }
                  icon={BookOpen}
                />
                <DetailField
                  label={t.status}
                  value={
                    <StatusBadge
                      value={account.status}
                      locale={locale}
                    />
                  }
                  icon={ShieldCheck}
                />
                <DetailField
                  label={t.createdAt}
                  value={formatDate(account.createdAt)}
                  icon={CalendarDays}
                />
                <DetailField
                  label={t.updatedAt}
                  value={formatDate(account.updatedAt)}
                  icon={CalendarDays}
                />
                <DetailField
                  label={t.description}
                  value={fallback(account.description)}
                  icon={FileText}
                />
              </CardContent>
            </Card>
            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-5 pt-5 sm:px-6">
                <CardTitle className="text-base">
                  {t.structure}
                </CardTitle>
                <CardDescription>
                  {t.structureDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 px-5 pb-5 sm:px-6 md:grid-cols-2">
                <DetailField
                  label={t.parent}
                  value={
                    account.parentId ? (
                      <Link
                        href={`/company/accounting/chart-of-accounts/${encodeURIComponent(
                          account.parentId,
                        )}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {[
                          account.parentCode,
                          account.parentName,
                        ]
                          .filter(Boolean)
                          .join(" — ")}
                      </Link>
                    ) : (
                      t.notAvailable
                    )
                  }
                  icon={Layers3}
                />
                <DetailField
                  label={t.childrenCount}
                  value={
                    <span
                      dir="ltr"
                      lang="en"
                      className="tabular-nums"
                    >
                      {formatInteger(
                        account.childrenCount,
                      )}
                    </span>
                  }
                  icon={Layers3}
                />
              </CardContent>
            </Card>
            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-5 pt-5 sm:px-6">
                <CardTitle className="text-base">
                  {t.balances}
                </CardTitle>
                <CardDescription>
                  {t.balancesDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 px-5 pb-5 sm:px-6 md:grid-cols-2 xl:grid-cols-4">
                <DetailField
                  label={t.openingBalance}
                  value={
                    <MoneyValue
                      value={account.openingBalance}
                    />
                  }
                  icon={Landmark}
                />
                <DetailField
                  label={t.currentBalance}
                  value={
                    <MoneyValue
                      value={account.currentBalance}
                    />
                  }
                  icon={Landmark}
                />
                <DetailField
                  label={t.debitTotal}
                  value={
                    <MoneyValue
                      value={account.debitTotal}
                    />
                  }
                  icon={CircleDollarSign}
                />
                <DetailField
                  label={t.creditTotal}
                  value={
                    <MoneyValue
                      value={account.creditTotal}
                    />
                  }
                  icon={CircleDollarSign}
                />
              </CardContent>
            </Card>
          </div>
          <aside className="space-y-5">
            <Card className="rounded-lg border bg-card shadow-none xl:sticky xl:top-6">
              <CardHeader className="px-5 pt-5">
                <CardTitle className="text-base">
                  {t.quickLinks}
                </CardTitle>
                <CardDescription>
                  {t.quickLinksDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 px-5 pb-5">
                <Button
                  asChild
                  variant="outline"
                  className="justify-start bg-background"
                >
                  <Link
                    href={accountReportHref(
                      "/company/accounting/ledger",
                      account,
                    )}
                  >
                    <BookOpen className="h-4 w-4" />
                    {t.ledgerReport}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="justify-start bg-background"
                >
                  <Link
                    href={accountReportHref(
                      "/company/accounting/trial-balance",
                      account,
                    )}
                  >
                    <Activity className="h-4 w-4" />
                    {t.trialBalance}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="justify-start bg-background"
                >
                  <Link
                    href={accountReportHref(
                      "/company/accounting/journal-entries",
                      account,
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    {t.journalEntriesPage}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="justify-start bg-background"
                >
                  <Link
                    href={accountReportHref(
                      "/company/payments",
                      account,
                    )}
                  >
                    <WalletCards className="h-4 w-4" />
                    {paymentTitle}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="justify-start bg-background"
                >
                  <Link
                    href={accountReportHref(
                      "/company/accounting/chart-of-accounts",
                      account,
                    )}
                  >
                    <TableProperties className="h-4 w-4" />
                    {t.chart}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <CardTitle className="text-base">
              {t.records}
            </CardTitle>
            <CardDescription>
              {t.subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 sm:px-6">
            <div
              role="tablist"
              aria-label={t.records}
              className="flex flex-wrap gap-2 border-b pb-3"
            >
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={
                    activeTab === tab.key
                  }
                  variant={
                    activeTab === tab.key
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setActiveTab(tab.key)
                  }
                >
                  {tab.label}
                  <Badge
                    variant="outline"
                    className={
                      activeTab === tab.key
                        ? "ms-1 rounded-full border-white/30 text-white tabular-nums"
                        : "ms-1 rounded-full tabular-nums"
                    }
                  >
                    {formatInteger(tab.count)}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        <RelatedTable
          title={currentTitle}
          description={currentDescription}
          rows={currentRows}
          locale={locale}
          emptyText={t.noRows}
          onExport={() =>
            exportAccountRows(
              currentRows,
              currentTitle,
              activeTab,
            )
          }
          onPrint={() =>
            printAccountRows(
              currentRows,
              currentTitle,
            )
          }
        />
      </div>
    </main>
  );
}
