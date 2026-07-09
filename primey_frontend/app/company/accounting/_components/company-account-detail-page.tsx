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
import { useParams } from "next/navigation";
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
  FileText,
  Hash,
  Landmark,
  Layers3,
  Loader2,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TableProperties,
  TriangleAlert,
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
function MoneyValue({ value }: { value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
      <span>{formatMoney(value)}</span>
      <Image src="/currency/sar.svg" alt="SAR" width={14} height={14} className="inline-block" />
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
    href: id && hrefBase ? `${hrefBase}/${encodeURIComponent(id)}` : "",
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
              href: `${hrefBase}/${encodeURIComponent(entryId)}`,
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
  const searchValue = number && number !== "—" ? number : account.code;
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
    href: searchValue
      ? `/company/payments?account_code=${encodeURIComponent(account.code)}&search=${encodeURIComponent(searchValue)}&q=${encodeURIComponent(searchValue)}`
      : "/company/payments",
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
        href: `/company/payments?account_code=${encodeURIComponent(account.code)}&search=${encodeURIComponent(ref)}&q=${encodeURIComponent(ref)}`,
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

function InfoCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 truncate text-lg font-bold tracking-tight">{value}</CardTitle>
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      {description ? (
        <CardContent className="pt-0">
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}
function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border bg-background p-4">
      <span className="rounded-xl bg-muted p-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 break-words text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}
function RelatedTable({
  title,
  description,
  rows,
  locale,
  emptyText,
}: {
  title: string;
  description: string;
  rows: RelatedRow[];
  locale: Locale;
  emptyText: string;
}) {
  const t = translations[locale];
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge variant="outline" className="w-fit rounded-full">{rows.length}</Badge>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="overflow-x-auto rounded-2xl border bg-background">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="px-4 py-3 text-start text-xs">{t.document}</TableHead>
                  <TableHead className="px-4 py-3 text-start text-xs">{t.date}</TableHead>
                  <TableHead className="px-4 py-3 text-start text-xs">{t.description}</TableHead>
                  <TableHead className="px-4 py-3 text-start text-xs">{t.debit}</TableHead>
                  <TableHead className="px-4 py-3 text-start text-xs">{t.credit}</TableHead>
                  <TableHead className="px-4 py-3 text-start text-xs">{t.balance}</TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs">{t.open}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.id}-${row.number}`}>
                    <TableCell className="px-4 py-3 font-medium">{row.number}</TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">{formatDate(row.date)}</TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">{row.description || "—"}</TableCell>
                    <TableCell className="px-4 py-3"><MoneyValue value={row.debit} /></TableCell>
                    <TableCell className="px-4 py-3"><MoneyValue value={row.credit} /></TableCell>
                    <TableCell className="px-4 py-3"><MoneyValue value={row.balance} /></TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      {row.href ? (
                        <Button asChild size="sm" variant="outline" className="h-8 rounded-lg bg-background">
                          <Link href={row.href}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            {t.open}
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}
function DetailSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Card className="rounded-3xl p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-9 w-72" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-32" />
              </CardHeader>
            </Card>
          ))}
        </div>
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
          "/company/accounting/ledger",
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
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {account.name}
                  </h1>
                  <StatusBadge value={account.status} locale={locale} />
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href={accountReportHref("/company/accounting/chart-of-accounts", account)}>
                    <BackIcon className="h-4 w-4" />
                    {t.back}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadAccount({ silent: true })}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard title={t.status} value={<StatusBadge value={account.status} locale={locale} />} description={t.accountInfo} icon={ShieldCheck} />
          <InfoCard title={t.currentBalance} value={<MoneyValue value={account.currentBalance} />} description={t.balances} icon={Landmark} />
          <InfoCard title={t.debitTotal} value={<MoneyValue value={account.debitTotal} />} description={t.balances} icon={CircleDollarSign} />
          <InfoCard title={t.creditTotal} value={<MoneyValue value={account.creditTotal} />} description={t.balances} icon={CircleDollarSign} />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.accountInfo}</CardTitle>
                <CardDescription>{t.accountInfoDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <DetailRow label={t.code} value={fallback(account.code)} icon={Hash} />
                <DetailRow label={t.name} value={fallback(account.name)} icon={TableProperties} />
                <DetailRow label={t.nameAr} value={fallback(account.nameAr)} icon={FileText} />
                <DetailRow label={t.nameEn} value={fallback(account.nameEn)} icon={FileText} />
                <DetailRow label={t.accountType} value={fallback(account.accountType)} icon={Layers3} />
                <DetailRow label={t.normalBalance} value={fallback(account.normalBalance)} icon={BadgeCheck} />
                <DetailRow label={t.level} value={fallback(account.level)} icon={Layers3} />
                <DetailRow label={account.isGroup ? t.isGroup : t.isLeaf} value={account.isGroup ? t.isGroup : t.isLeaf} icon={BookOpen} />
                <DetailRow label={t.createdAt} value={formatDate(account.createdAt)} icon={CalendarDays} />
                <DetailRow label={t.updatedAt} value={formatDate(account.updatedAt)} icon={CalendarDays} />
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.structure}</CardTitle>
                <CardDescription>{t.structureDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <DetailRow
                  label={t.parent}
                  value={
                    account.parentId ? (
                      <Link
                        href={`/company/accounting/chart-of-accounts/${encodeURIComponent(account.parentId)}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {[account.parentCode, account.parentName].filter(Boolean).join(" — ")}
                      </Link>
                    ) : (
                      t.notAvailable
                    )
                  }
                  icon={Layers3}
                />
                <DetailRow label={t.childrenCount} value={account.childrenCount} icon={Layers3} />
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.balances}</CardTitle>
                <CardDescription>{t.balancesDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <DetailRow label={t.openingBalance} value={<MoneyValue value={account.openingBalance} />} icon={Landmark} />
                <DetailRow label={t.currentBalance} value={<MoneyValue value={account.currentBalance} />} icon={Landmark} />
                <DetailRow label={t.debitTotal} value={<MoneyValue value={account.debitTotal} />} icon={CircleDollarSign} />
                <DetailRow label={t.creditTotal} value={<MoneyValue value={account.creditTotal} />} icon={CircleDollarSign} />
              </CardContent>
            </Card>
            <RelatedTable
              title={t.ledger}
              description={t.ledgerDesc}
              rows={ledgerRows}
              locale={locale}
              emptyText={t.noRows}
            />
            <RelatedTable
              title={t.journalEntries}
              description={t.journalEntriesDesc}
              rows={journalRows}
              locale={locale}
              emptyText={t.noRows}
            />

            <RelatedTable
              title={locale === "ar" ? "السندات الأصلية والمدفوعات" : "Original vouchers and payments"}
              description={
                locale === "ar"
                  ? "سندات القبض والصرف الأصلية المرتبطة بهذا الحساب فقط، وليس أرقام القيود المحاسبية."
                  : "Original receipt and payment vouchers linked only to this account, not journal references."
              }
              rows={paymentRows}
              locale={locale}
              emptyText={t.noRows}
            />
          </div>
          <aside className="space-y-6">
            <Card className="rounded-2xl shadow-sm xl:sticky xl:top-6">
              <CardHeader>
                <CardTitle>{t.quickLinks}</CardTitle>
                <CardDescription>{t.quickLinksDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href={accountReportHref("/company/accounting/ledger", account)}>
                    <BookOpen className="h-4 w-4" />
                    {t.ledgerReport}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href={accountReportHref("/company/accounting/trial-balance", account)}>
                    <Activity className="h-4 w-4" />
                    {t.trialBalance}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href={accountReportHref("/company/accounting/journal-entries", account)}>
                    <FileText className="h-4 w-4" />
                    {t.journalEntriesPage}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href={accountReportHref("/company/payments", account)}>
                    <CircleDollarSign className="h-4 w-4" />
                    {locale === "ar" ? "المدفوعات والسندات" : "Payments and vouchers"}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href={accountReportHref("/company/accounting/chart-of-accounts", account)}>
                    <TableProperties className="h-4 w-4" />
                    {t.chart}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
