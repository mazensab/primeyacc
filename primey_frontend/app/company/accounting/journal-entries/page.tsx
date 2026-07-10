// ============================================================
// 📂 app/company/accounting/journal-entries/page.tsx
// 🧠 Mhamcloud | Company Journal Entries
// ------------------------------------------------------------
// ✅ Approved company dashboard premium pattern
// ✅ Real API only
// ✅ Tenant scoped by backend session
// ✅ Cost centers from DB only
// ✅ Auto journal number preview
// ✅ English digits / SAR icon / RTL-LTR
// ============================================================
"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom"; import {   ArrowLeft, ArrowUpDown, BookOpen, CheckCircle2, Eye, FileSpreadsheet, Loader2, Printer, RefreshCw, RotateCcw, Save, Search, Sparkles, Trash2, Undo2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
type EntryStatus = "DRAFT" | "POSTED" | "CANCELLED" | "REVERSED" | string;
type StatusFilter = "all" | "DRAFT" | "POSTED" | "REVERSED" | "CANCELLED";
type SortKey = "newest" | "oldest" | "number";
type AccountOption = {
  id: string;
  code: string;
  name: string;
  isGroup: boolean;
  isActive: boolean;
};
type CostCenterOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  canPost: boolean;
};
type JournalEntryLine = {
  id?: string | number;
  account_code?: string;
  account_name?: string;
  account?: { code?: string; name?: string; name_ar?: string; name_en?: string };
  cost_center?: { id?: string | number; code?: string; name?: string; name_en?: string };
  description?: string;
  debit_amount?: string | number;
  credit_amount?: string | number;
};
type JournalEntry = {
  id: string;
  entryNumber: string;
  entryDate: string;
  reference: string;
  description: string;
  status: EntryStatus;
  totalDebit: number;
  totalCredit: number;
  currency: string;
  lines: JournalEntryLine[];
};
type EntryLineForm = {
  accountCode: string;
  costCenterId: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
};
type EntryForm = {
  entryDate: string;
  description: string;
  currency: string;
  autoPost: boolean;
  lines: EntryLineForm[];
};
const ACCOUNT_NONE = "__none_account__";
const COST_CENTER_NONE = "__none_cost_center__";
const translations = {
  ar: {
    title: "القيود اليومية",
    subtitle: "إنشاء القيود اليدوية، مراجعة تفاصيلها، ترحيل القيود المتوازنة، وعكس القيود المرحلة.",
    badge: "القيود اليومية",
    accountingDashboard: "لوحة الحسابات",
    registerChip: "دفتر القيود اليومية",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    save: "حفظ القيد",
    saving: "جاري الحفظ...",
    totalEntries: "إجمالي القيود",
    drafts: "مسودات",
    posted: "مرحلة",
    reversed: "معكوسة / ملغاة",
    totalEntriesDesc: "كل القيود المسجلة",
    draftsDesc: "قيود قابلة للتعديل",
    postedDesc: "قيود مؤثرة على الدفاتر",
    reversedDesc: "قيود تم عكسها أو إلغاؤها",
    createTitle: "إضافة قيد يومية",
    createDesc: "أدخل بيانات القيد وأسطر المدين والدائن. لا يمكن حفظ أو ترحيل القيد إلا إذا كان متوازنًا.",
    entryDate: "تاريخ القيد",
    entryNumber: "رقم القيد",
    autoNumber: "ينشئه النظام عند الحفظ",
    description: "الوصف",
    descriptionPlaceholder: "وصف مختصر للقيد",
    currency: "العملة",
    autoPost: "ترحيل مباشر بعد الإنشاء",
    account: "الحساب",
    chooseAccount: "اختر حسابًا",
    accountSearchPlaceholder: "اكتب رقم الحساب أو اختر من القائمة",
    accountNotFound: "الحساب غير موجود في دليل الحسابات",
    invalidAccount: "يوجد رقم حساب غير صحيح في أسطر القيد.",
    costCenter: "مركز التكلفة",
    costCenterSearchPlaceholder: "اكتب رمز أو اسم مركز التكلفة",
    costCenterNotFound: "مركز التكلفة غير موجود",
    noCostCenter: "بدون مركز تكلفة",
    noCostCenters: "لا توجد مراكز تكلفة",
    lineDescription: "وصف السطر",
    debit: "مدين",
    credit: "دائن",
    actions: "الإجراءات",
    addLine: "إضافة سطر",
    removeLine: "حذف",
    totals: "الإجماليات",
    totalDebit: "إجمالي المدين",
    totalCredit: "إجمالي الدائن",
    difference: "الفرق",
    balanced: "متوازن",
    unbalanced: "غير متوازن",
    registerTitle: "دفتر القيود اليومية",
    registerDesc: "آخر القيود المحاسبية الخاصة بالشركة مباشرة من قاعدة البيانات.",
    searchPlaceholder: "ابحث برقم القيد أو المرجع أو الوصف...",
    all: "الكل",
    newest: "الأحدث",
    oldest: "الأقدم",
    numberSort: "رقم القيد",
    date: "التاريخ",
    status: "الحالة",
    view: "عرض",
    post: "ترحيل",
    reverse: "عكس",
    confirmReverse: "تأكيد عكس القيد",
    cancel: "إلغاء",
    reverseDialogTitle: "عكس القيد المرحل",
    reverseDialogDesc: "سيتم إنشاء قيد عكسي مرتبط بهذا القيد المرحل. راجع رقم القيد والمبالغ قبل التأكيد.",
    close: "إغلاق",
    detailTitle: "تفاصيل القيد",
    detailDesc: "مراجعة رأس القيد وأسطر المدين والدائن ومراكز التكلفة.",
    printDetails: "طباعة تفاصيل القيد",
    entryInfo: "بيانات القيد",
    entryLines: "أسطر القيد",
    lineNo: "السطر",
    emptyLines: "لا توجد أسطر لهذا القيد.",
    emptyTitle: "لا توجد قيود يومية",
    emptyDesc: "أضف أول قيد يدوي أو عدّل الفلاتر لعرض نتائج أخرى.",
    loadFailed: "تعذر تحميل القيود اليومية.",
    createSuccess: "تم حفظ القيد بنجاح.",
    postSuccess: "تم ترحيل القيد بنجاح.",
    reverseSuccess: "تم عكس القيد بنجاح.",
    actionFailed: "تعذر تنفيذ العملية.",
    required: "أكمل بيانات القيد، واختر حسابين على الأقل مع مبالغ مدينة/دائنة.",
    balanceRequired: "القيد غير متوازن.",
    reverseConfirm: "هل تريد عكس هذا القيد المرحل؟",
    reverseReason: "عكس من واجهة القيود اليومية",
    sar: "ر.س",
    DRAFT: "مسودة",
    POSTED: "مرحل",
    CANCELLED: "ملغي",
    REVERSED: "معكوس",
  },
  en: {
    title: "Journal Entries",
    subtitle: "Create manual entries, review details, post balanced drafts, and reverse posted entries.",
    badge: "Journal Entries",
    accountingDashboard: "Accounting Dashboard",
    registerChip: "Journal Register",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    save: "Save entry",
    saving: "Saving...",
    totalEntries: "Total entries",
    drafts: "Drafts",
    posted: "Posted",
    reversed: "Reversed / Cancelled",
    totalEntriesDesc: "All registered entries",
    draftsDesc: "Editable entries",
    postedDesc: "Affecting the ledger",
    reversedDesc: "Reversed or cancelled entries",
    createTitle: "Add Journal Entry",
    createDesc: "Enter the header and debit/credit lines. The entry can only be saved or posted when balanced.",
    entryDate: "Entry date",
    entryNumber: "Entry number",
    autoNumber: "Generated on save",
    description: "Description",
    descriptionPlaceholder: "Short entry description",
    currency: "Currency",
    autoPost: "Post immediately after create",
    account: "Account",
    chooseAccount: "Select account",
    accountSearchPlaceholder: "Type account number or choose from list",
    accountNotFound: "Account is not found in chart of accounts",
    invalidAccount: "One journal line has an invalid account code.",
    costCenter: "Cost center",
    costCenterSearchPlaceholder: "Type cost center code or name",
    costCenterNotFound: "Cost center is not found",
    noCostCenter: "No cost center",
    noCostCenters: "No cost centers",
    lineDescription: "Line description",
    debit: "Debit",
    credit: "Credit",
    actions: "Actions",
    addLine: "Add line",
    removeLine: "Remove",
    totals: "Totals",
    totalDebit: "Total debit",
    totalCredit: "Total credit",
    difference: "Difference",
    balanced: "Balanced",
    unbalanced: "Unbalanced",
    registerTitle: "Journal Entries Register",
    registerDesc: "Latest company journal entries directly from the database.",
    searchPlaceholder: "Search by entry number, reference, or description...",
    all: "All",
    newest: "Newest",
    oldest: "Oldest",
    numberSort: "Entry number",
    date: "Date",
    status: "Status",
    view: "View",
    post: "Post",
    reverse: "Reverse",
    confirmReverse: "Confirm reversal",
    cancel: "Cancel",
    reverseDialogTitle: "Reverse posted entry",
    reverseDialogDesc: "A reversing journal entry will be created for this posted entry. Review the entry number and amounts before confirming.",
    close: "Close",
    detailTitle: "Entry details",
    detailDesc: "Review the entry header, debit/credit lines, and cost centers.",
    printDetails: "Print entry details",
    entryInfo: "Entry information",
    entryLines: "Entry lines",
    lineNo: "Line",
    emptyLines: "No lines found for this entry.",
    emptyTitle: "No journal entries",
    emptyDesc: "Create the first manual entry or reset filters to show other results.",
    loadFailed: "Could not load journal entries.",
    createSuccess: "Journal entry saved successfully.",
    postSuccess: "Journal entry posted successfully.",
    reverseSuccess: "Journal entry reversed successfully.",
    actionFailed: "Action failed.",
    required: "Complete the entry, select at least two accounts, and enter debit/credit amounts.",
    balanceRequired: "The entry is not balanced.",
    reverseConfirm: "Reverse this posted entry?",
    reverseReason: "Reversed from journal entries page",
    sar: "SAR",
    DRAFT: "Draft",
    POSTED: "Posted",
    CANCELLED: "Cancelled",
    REVERSED: "Reversed",
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
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2 ? decodeURIComponent(parts.pop()?.split(";").shift() || "") : "";
}
async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (method !== "GET" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (method !== "GET") {
    const csrf = getCookie("csrftoken") || getCookie("csrf_token");
    if (csrf) headers.set("X-CSRFToken", csrf);
  }
  const response = await fetch(apiUrl(path), { ...init, method, credentials: "include", headers });
  const text = await response.text();
  const payload = (text ? JSON.parse(text) : {}) as ApiRecord;
  if (!response.ok) {
    throw new Error(String(payload.message || payload.detail || `HTTP ${response.status}`));
  }
  return payload as T;
}
function isRecord(value: unknown): value is ApiRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function record(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}
function firstArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const row = record(value);
  for (const key of ["results", "items", "data", "entries", "accounts", "cost_centers"]) {
    const next = row[key];
    if (Array.isArray(next)) return next;
    if (isRecord(next)) {
      const nested = firstArray(next);
      if (nested.length) return nested;
    }
  }
  return [];
}
function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}
function amount(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
function formatInteger(value: number) {
  return Math.trunc(value || 0).toLocaleString("en-US");
}
function formatMoney(value: unknown) {
  return amount(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function normalizeDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
}
function normalizeAccount(value: unknown): AccountOption {
  const row = record(value);
  return {
    id: text(row.id || row.code),
    code: text(row.code),
    name: text(row.name || row.name_ar || row.name_en || row.display_name || row.code),
    isGroup: Boolean(row.is_group ?? row.isGroup ?? false),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
  };
}
function normalizeCostCenter(value: unknown): CostCenterOption {
  const row = record(value);
  return {
    id: text(row.id || row.code),
    code: text(row.code),
    name: text(row.name || row.name_ar || row.name_en || row.display_name || row.code),
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    canPost: Boolean(row.can_post ?? true),
  };
}
function normalizeEntry(value: unknown): JournalEntry {
  const row = record(value);
  return {
    id: text(row.id || row.entry_number || row.number),
    entryNumber: text(row.entry_number || row.number),
    entryDate: text(row.entry_date || row.date || row.created_at),
    reference: text(row.reference || row.external_reference),
    description: text(row.description || row.memo || row.notes),
    status: text(row.status || "DRAFT") || "DRAFT",
    totalDebit: amount(row.total_debit || row.debit_total),
    totalCredit: amount(row.total_credit || row.credit_total),
    currency: text(row.currency || "SAR") || "SAR",
    lines: Array.isArray(row.lines) ? (row.lines as JournalEntryLine[]) : [],
  };
}
function buildForm(): EntryForm {
  return {
    entryDate: todayIso(),
    description: "",
    currency: "SAR",
    autoPost: false,
    lines: [
      { accountCode: "", costCenterId: "", description: "", debitAmount: "", creditAmount: "" },
      { accountCode: "", costCenterId: "", description: "", debitAmount: "", creditAmount: "" },
    ],
  };
}
function statusLabel(status: EntryStatus, locale: Locale) {
  const t = translations[locale];
  return String(t[status as keyof typeof t] || status || "DRAFT");
}
function statusClass(status: EntryStatus) {
  if (status === "POSTED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REVERSED") return "border-purple-200 bg-purple-50 text-purple-700";
  if (status === "CANCELLED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function MoneyValue({ value, label }: { value: unknown; label: string }) {
  return (
    <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums">
      <Image src="/currency/sar.svg" alt={label} width={14} height={14} className="h-3.5 w-3.5" />
      <span>{formatMoney(value)}</span>
    </span>
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
    <Card className="group h-[128px] overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-5 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-black tracking-tight tabular-nums">{formatInteger(value)}</CardTitle>
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

function AccountSearchField({
  value,
  accounts,
  placeholder,
  notFound,
  onChange,
}: {
  value: string;
  accounts: AccountOption[];
  placeholder: string;
  notFound: string;
  onChange: (value: string) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const [menuPosition, setMenuPosition] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const query = value.trim().toLowerCase();
  const selected = React.useMemo(
    () => accounts.find((account) => account.code === value),
    [accounts, value],
  );
  const filtered = React.useMemo(() => {
    if (!query) return accounts.slice(0, 18);
    return accounts
      .filter((account) => {
        const haystack = `${account.code} ${account.name}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 24);
  }, [accounts, query]);
  const updateMenuPosition = React.useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || typeof window === "undefined") return;
    const viewportPadding = 12;
    const width = Math.max(rect.width, 320);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding,
    );
    setMenuPosition({
      top: rect.bottom + 6,
      left,
      width,
    });
  }, []);
  const openMenu = React.useCallback(() => {
    setOpen(true);
    window.requestAnimationFrame(updateMenuPosition);
  }, [updateMenuPosition]);
  const closeMenu = React.useCallback(() => {
    setOpen(false);
  }, []);
  const chooseAccount = React.useCallback(
    (account: AccountOption) => {
      onChange(account.code);
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange],
  );
  React.useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);
  React.useEffect(() => {
    if (!open) return;
    setHighlightedIndex(filtered.length ? 0 : -1);
  }, [filtered.length, open, query]);
  React.useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [highlightedIndex, open]);
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setHighlightedIndex((current) => {
        if (!filtered.length) return -1;
        return current < filtered.length - 1 ? current + 1 : 0;
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setHighlightedIndex((current) => {
        if (!filtered.length) return -1;
        return current > 0 ? current - 1 : filtered.length - 1;
      });
      return;
    }
    if (event.key === "Enter") {
      if (open && highlightedIndex >= 0 && filtered[highlightedIndex]) {
        event.preventDefault();
        chooseAccount(filtered[highlightedIndex]);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  }
  const menu =
    open && menuPosition
      ? createPortal(
          <div
            className="fixed z-[9999] max-h-64 overflow-y-auto overscroll-contain rounded-xl border bg-popover p-1 shadow-2xl ring-1 ring-black/5"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            {filtered.length ? (
              filtered.map((account, optionIndex) => (
                <button
                  key={account.id || account.code}
                  ref={(element) => {
                    optionRefs.current[optionIndex] = element;
                  }}
                  type="button"
                  aria-selected={optionIndex === highlightedIndex}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-xs transition ${
                    optionIndex === highlightedIndex
                      ? "bg-slate-950 text-white shadow-sm hover:bg-slate-950"
                      : "text-foreground hover:bg-muted"
                  }`}
                  onMouseEnter={() => setHighlightedIndex(optionIndex)}
                  onMouseMove={() => setHighlightedIndex(optionIndex)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseAccount(account)}
                >
                  <span
                    className={`min-w-0 truncate ${
                      optionIndex === highlightedIndex ? "text-white/85" : "text-muted-foreground"
                    }`}
                  >
                    {account.name}
                  </span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      optionIndex === highlightedIndex ? "text-white" : "text-foreground"
                    }`}
                  >
                    {account.code}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">{notFound}</div>
            )}
          </div>,
          document.body,
        )
      : null;
  return (
    <div ref={containerRef} className="relative space-y-1">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onFocus={openMenu}
          onBlur={() => window.setTimeout(closeMenu, 120)}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            onChange(event.target.value.trim());
            openMenu();
          }}
          placeholder={placeholder}
          className="h-9 rounded-xl border-slate-200 bg-slate-50/90 ps-9 font-mono text-sm font-semibold tabular-nums shadow-inner placeholder:font-normal placeholder:text-slate-400 focus-visible:bg-background"
        />
      </div>
      {menu}
      {!open && selected ? (
        <p className="truncate px-1 text-[11px] text-muted-foreground">{selected.name}</p>
      ) : !open && value ? (
        <p className="truncate px-1 text-[11px] text-rose-600">{notFound}</p>
      ) : null}
    </div>
  );
}


function CostCenterSearchField({
  value,
  costCenters,
  placeholder,
  noCostCenter,
  notFound,
  onChange,
}: {
  value: string;
  costCenters: CostCenterOption[];
  placeholder: string;
  noCostCenter: string;
  notFound: string;
  onChange: (value: string) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const [searchValue, setSearchValue] = React.useState("")
  React.useEffect(() => {
    // primeyAccountQueryPrefill: open reports already filtered by the selected account.
    const params = new URLSearchParams(window.location.search);
    const query =
      params.get("account_code") ||
      params.get("search") ||
      params.get("q") ||
      params.get("account") ||
      params.get("account_id") ||
      "";
    if (query.trim()) {
      setSearchValue(query.trim());
    }
  }, []);
;
  const [menuPosition, setMenuPosition] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const selected = React.useMemo(
    () => costCenters.find((costCenter) => costCenter.id === value),
    [costCenters, value],
  );
  const query = searchValue.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    const rows = costCenters;
    if (!query) return rows.slice(0, 18);
    return rows
      .filter((costCenter) => {
        const haystack = `${costCenter.code} ${costCenter.name}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 24);
  }, [costCenters, query]);
  const displayValue = open ? searchValue : selected ? `${selected.code} — ${selected.name}` : "";
  const updateMenuPosition = React.useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || typeof window === "undefined") return;
    const viewportPadding = 12;
    const width = Math.max(rect.width, 260);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding,
    );
    setMenuPosition({
      top: rect.bottom + 6,
      left,
      width,
    });
  }, []);
  const openMenu = React.useCallback(() => {
    setOpen(true);
    setSearchValue("");
    window.requestAnimationFrame(updateMenuPosition);
  }, [updateMenuPosition]);
  const closeMenu = React.useCallback(() => {
    setOpen(false);
    setSearchValue("");
  }, []);
  const chooseCostCenter = React.useCallback(
    (costCenterId: string) => {
      onChange(costCenterId);
      setOpen(false);
      setSearchValue("");
      inputRef.current?.blur();
    },
    [onChange],
  );
  React.useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);
  React.useEffect(() => {
    if (!open) return;
    setHighlightedIndex(0);
  }, [filtered.length, open, query]);
  React.useEffect(() => {
    if (!open || highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [highlightedIndex, open]);
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const optionCount = filtered.length + 1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setHighlightedIndex((current) => (current < optionCount - 1 ? current + 1 : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setHighlightedIndex((current) => (current > 0 ? current - 1 : optionCount - 1));
      return;
    }
    if (event.key === "Enter") {
      if (open) {
        event.preventDefault();
        if (highlightedIndex === 0) {
          chooseCostCenter("");
          return;
        }
        const selectedCostCenter = filtered[highlightedIndex - 1];
        if (selectedCostCenter) {
          chooseCostCenter(selectedCostCenter.id);
        }
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  }
  const menu =
    open && menuPosition
      ? createPortal(
          <div
            className="fixed z-[9999] max-h-64 overflow-y-auto overscroll-contain rounded-xl border bg-popover p-1 shadow-2xl ring-1 ring-black/5"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <button
              type="button"
              aria-selected={highlightedIndex === 0}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-xs transition ${
                highlightedIndex === 0
                  ? "bg-slate-950 text-white shadow-sm hover:bg-slate-950"
                  : "text-foreground hover:bg-muted"
              }`}
              onMouseEnter={() => setHighlightedIndex(0)}
              onMouseMove={() => setHighlightedIndex(0)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseCostCenter("")}
            >
              <span className={highlightedIndex === 0 ? "text-white/85" : "text-muted-foreground"}>
                {noCostCenter}
              </span>
              <span className={highlightedIndex === 0 ? "text-white" : "text-foreground"}>—</span>
            </button>
            {filtered.length ? (
              filtered.map((costCenter, optionIndex) => {
                const realIndex = optionIndex + 1;
                return (
                  <button
                    key={costCenter.id || costCenter.code}
                    ref={(element) => {
                      optionRefs.current[realIndex] = element;
                    }}
                    type="button"
                    aria-selected={realIndex === highlightedIndex}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-xs transition ${
                      realIndex === highlightedIndex
                        ? "bg-slate-950 text-white shadow-sm hover:bg-slate-950"
                        : "text-foreground hover:bg-muted"
                    }`}
                    onMouseEnter={() => setHighlightedIndex(realIndex)}
                    onMouseMove={() => setHighlightedIndex(realIndex)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseCostCenter(costCenter.id)}
                  >
                    <span
                      className={`min-w-0 truncate ${
                        realIndex === highlightedIndex ? "text-white/85" : "text-muted-foreground"
                      }`}
                    >
                      {costCenter.name}
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        realIndex === highlightedIndex ? "text-white" : "text-foreground"
                      }`}
                    >
                      {costCenter.code}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">{notFound}</div>
            )}
          </div>,
          document.body,
        )
      : null;
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={displayValue}
          onFocus={openMenu}
          onBlur={() => window.setTimeout(closeMenu, 120)}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setSearchValue(event.target.value);
            setOpen(true);
            window.requestAnimationFrame(updateMenuPosition);
          }}
          placeholder={placeholder}
          className="h-9 rounded-xl border-slate-200 bg-slate-50/90 ps-9 text-sm font-semibold shadow-inner placeholder:font-normal placeholder:text-slate-400 focus-visible:bg-background"
        />
      </div>
      {menu}
    </div>
  );
}

export default function CompanyJournalEntriesPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [entries, setEntries] = React.useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = React.useState<AccountOption[]>([]);
  const [costCenters, setCostCenters] = React.useState<CostCenterOption[]>([]);
  const [selectedEntry, setSelectedEntry] = React.useState<JournalEntry | null>(null);

  const openEntryDetails = React.useCallback((entry: JournalEntry) => {
    setSelectedEntry(entry);
    window.setTimeout(() => {
      const detailPanel =
        document.getElementById("journal-entry-details-panel") ??
        document.querySelector("[data-journal-entry-details-panel]");
      if (detailPanel instanceof HTMLElement) {
        detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 80);
  }, []);
  const [reverseTarget, setReverseTarget] = React.useState<JournalEntry | null>(null);
  const [form, setForm] = React.useState<EntryForm>(buildForm);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [actionId, setActionId] = React.useState("");
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
  const activeAccounts = React.useMemo(
    () => accounts.filter((item) => item.code && item.isActive && !item.isGroup).sort((a, b) => a.code.localeCompare(b.code, "en")),
    [accounts],
  );
  const activeCostCenters = React.useMemo(
    () => costCenters.filter((item) => item.id && item.isActive && item.canPost).sort((a, b) => a.code.localeCompare(b.code, "en")),
    [costCenters],
  );
  const totals = React.useMemo(() => {
    const debit = form.lines.reduce((sum, line) => sum + amount(line.debitAmount), 0);
    const credit = form.lines.reduce((sum, line) => sum + amount(line.creditAmount), 0);
    return { debit, credit, difference: Math.abs(debit - credit), balanced: debit > 0 && Math.abs(debit - credit) < 0.005 };
  }, [form.lines]);
  const stats = React.useMemo(() => ({
    total: entries.length,
    drafts: entries.filter((entry) => entry.status === "DRAFT").length,
    posted: entries.filter((entry) => entry.status === "POSTED").length,
    reversed: entries.filter((entry) => ["REVERSED", "CANCELLED"].includes(String(entry.status))).length,
  }), [entries]);
  const autoNumber = React.useMemo(() => {
    const datePart = (form.entryDate || todayIso()).replaceAll("-", "");
    return `JE-${datePart}-${String(entries.length + 1).padStart(4, "0")}`;
  }, [entries.length, form.entryDate]);
  const filteredEntries = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = entries.filter((entry) => {
      const byStatus = status === "all" || entry.status === status;
      const bySearch =
        !q ||
        [entry.entryNumber, entry.reference, entry.description, entry.status].some((value) =>
          String(value || "").toLowerCase().includes(q),
        );
      return byStatus && bySearch;
    });
    return [...rows].sort((a, b) => {
      if (sort === "oldest") return a.entryDate.localeCompare(b.entryDate);
      if (sort === "number") return a.entryNumber.localeCompare(b.entryNumber, "en");
      return b.entryDate.localeCompare(a.entryDate);
    });
  }, [entries, search, sort, status]);
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [entryPayload, accountPayload, costCenterPayload] = await Promise.all([
        fetchJson<unknown>("/api/company/accounting/journal-entries/"),
        fetchJson<unknown>("/api/company/accounting/accounts/"),
        fetchJson<unknown>("/api/company/accounting/cost-centers/?postable=1"),
      ]);
      setEntries(firstArray(entryPayload).map(normalizeEntry));
      setAccounts(firstArray(accountPayload).map(normalizeAccount));
      setCostCenters(firstArray(costCenterPayload).map(normalizeCostCenter));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t.loadFailed]);
  React.useEffect(() => {
    void loadData();
  }, [loadData]);
  function patchLine(index: number, patch: Partial<EntryLineForm>) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    }));
  }
  function addLine() {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, { accountCode: "", costCenterId: "", description: "", debitAmount: "", creditAmount: "" }],
    }));
  }
  function removeLine(index: number) {
    setForm((current) => ({
      ...current,
      lines: current.lines.length <= 2 ? current.lines : current.lines.filter((_line, lineIndex) => lineIndex !== index),
    }));
  }
  function resetFilters() {
    setSearch("");
    setStatus("all");
    setSort("newest");
  }
  function resetForm() {
    setForm(buildForm());
  }
  function validateForm() {
    const validLines = form.lines.filter((line) => line.accountCode && (amount(line.debitAmount) > 0 || amount(line.creditAmount) > 0));
    if (!form.entryDate || !form.description.trim() || validLines.length < 2) return t.required;
    const accountCodes = new Set(activeAccounts.map((account) => account.code));
    if (validLines.some((line) => !accountCodes.has(line.accountCode))) {
      return t.invalidAccount;
    }
    if (!totals.balanced) return t.balanceRequired;
    return "";
  }
  async function submitForm() {
    const validation = validateForm();
    if (validation) {
      toast.error(validation);
      return;
    }
    setSaving(true);
    try {
      await fetchJson<unknown>("/api/company/accounting/journal-entries/create/", {
        method: "POST",
        body: JSON.stringify({
          entry_date: form.entryDate,
          description: form.description.trim(),
          reference: "",
          currency: form.currency || "SAR",
          auto_post: form.autoPost,
          lines: form.lines
            .filter((line) => line.accountCode && (amount(line.debitAmount) > 0 || amount(line.creditAmount) > 0))
            .map((line, index) => {
              const payloadLine: Record<string, string | number> = {
                account_code: line.accountCode,
                description: line.description.trim() || form.description.trim(),
                debit_amount: formatMoney(line.debitAmount),
                credit_amount: formatMoney(line.creditAmount),
                currency: form.currency || "SAR",
                sort_order: index + 1,
              };
              if (line.costCenterId) payloadLine.cost_center_id = Number(line.costCenterId);
              return payloadLine;
            }),
        }),
      });
      toast.success(t.createSuccess);
      resetForm();
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed);
    } finally {
      setSaving(false);
    }
  }
  async function openDetail(entryId: string) {
    setActionId(entryId);
    try {
      const payload = await fetchJson<{ entry?: unknown }>(`/api/company/accounting/journal-entries/${entryId}/`);
      const nextEntry = payload.entry ? normalizeEntry(payload.entry) : null;
      if (nextEntry) {
        openEntryDetails(nextEntry);
      } else {
        setSelectedEntry(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed);
    } finally {
      setActionId("");
    }
  }
  async function postEntry(entryId: string) {
    setActionId(entryId);
    try {
      await fetchJson<unknown>(`/api/company/accounting/journal-entries/${entryId}/post/`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success(t.postSuccess);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed);
    } finally {
      setActionId("");
    }
  }
  async function reverseEntry(entryId: string) {
    setActionId(entryId);
    try {
      await fetchJson<unknown>(`/api/company/accounting/journal-entries/${entryId}/reverse/`, {
        method: "POST",
        body: JSON.stringify({ reversal_date: todayIso(), reason: t.reverseReason }),
      });
      toast.success(t.reverseSuccess);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.actionFailed);
    } finally {
      setActionId("");
    }
  }
  function printSelectedEntry(entry: JournalEntry) {
    const lines = entry.lines || [];
    const html = `
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.detailTitle)} - ${escapeHtml(entry.entryNumber || entry.id)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, Tahoma, sans-serif;
              color: #0f172a;
              background: #ffffff;
            }
            .header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 18px;
              margin-bottom: 24px;
            }
            .brand {
              font-size: 13px;
              color: #64748b;
              font-weight: 700;
            }
            h1 {
              margin: 8px 0 0;
              font-size: 28px;
              line-height: 1.2;
            }
            .entry-no {
              font-family: monospace;
              font-size: 15px;
              font-weight: 800;
              padding: 8px 12px;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              background: #f8fafc;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 22px;
            }
            .box {
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              padding: 12px;
              background: #f8fafc;
              min-height: 74px;
            }
            .label {
              color: #64748b;
              font-size: 12px;
              margin-bottom: 8px;
            }
            .value {
              font-size: 15px;
              font-weight: 800;
              font-variant-numeric: tabular-nums;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 14px;
              font-size: 13px;
            }
            th, td {
              border: 1px solid #e2e8f0;
              padding: 10px;
              vertical-align: top;
            }
            th {
              background: #f1f5f9;
              color: #334155;
              font-weight: 800;
            }
            td.money {
              text-align: end;
              font-weight: 800;
              font-variant-numeric: tabular-nums;
              white-space: nowrap;
            }
            .section-title {
              margin-top: 20px;
              margin-bottom: 8px;
              font-size: 18px;
              font-weight: 900;
            }
            .footer {
              margin-top: 28px;
              color: #64748b;
              font-size: 11px;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
            }
            @media print {
              body { padding: 18px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Mham Cloud Accounting System</div>
              <h1>${escapeHtml(t.detailTitle)}</h1>
            </div>
            <div class="entry-no">${escapeHtml(entry.entryNumber || entry.id)}</div>
          </div>
          <div class="grid">
            <div class="box">
              <div class="label">${escapeHtml(t.entryNumber)}</div>
              <div class="value">${escapeHtml(entry.entryNumber || entry.id)}</div>
            </div>
            <div class="box">
              <div class="label">${escapeHtml(t.date)}</div>
              <div class="value">${escapeHtml(normalizeDate(entry.entryDate))}</div>
            </div>
            <div class="box">
              <div class="label">${escapeHtml(t.status)}</div>
              <div class="value">${escapeHtml(statusLabel(entry.status, locale))}</div>
            </div>
            <div class="box">
              <div class="label">${escapeHtml(t.currency)}</div>
              <div class="value">${escapeHtml(entry.currency || "SAR")}</div>
            </div>
            <div class="box">
              <div class="label">${escapeHtml(t.totalDebit)}</div>
              <div class="value">${formatMoney(entry.totalDebit)}</div>
            </div>
            <div class="box">
              <div class="label">${escapeHtml(t.totalCredit)}</div>
              <div class="value">${formatMoney(entry.totalCredit)}</div>
            </div>
            <div class="box" style="grid-column: span 2;">
              <div class="label">${escapeHtml(t.description)}</div>
              <div class="value">${escapeHtml(entry.description || "—")}</div>
            </div>
          </div>
          <div class="section-title">${escapeHtml(t.entryLines)}</div>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.lineNo)}</th>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.costCenter)}</th>
                <th>${escapeHtml(t.lineDescription)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
              </tr>
            </thead>
            <tbody>
              ${
                lines.length
                  ? lines
                      .map((line, index) => {
                        const accountCode = line.account_code || line.account?.code || "";
                        const accountName =
                          line.account_name ||
                          line.account?.name ||
                          line.account?.name_ar ||
                          line.account?.name_en ||
                          "";
                        const costCenterCode = line.cost_center?.code || "";
                        const costCenterName = line.cost_center?.name || line.cost_center?.name_en || "";
                        return `
                          <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(accountCode ? `${accountCode} — ${accountName}` : "—")}</td>
                            <td>${escapeHtml(costCenterCode ? `${costCenterCode} — ${costCenterName}` : "—")}</td>
                            <td>${escapeHtml(line.description || "—")}</td>
                            <td class="money">${formatMoney(line.debit_amount)}</td>
                            <td class="money">${formatMoney(line.credit_amount)}</td>
                          </tr>
                        `;
                      })
                      .join("")
                  : `<tr><td colspan="6">${escapeHtml(t.emptyLines)}</td></tr>`
              }
            </tbody>
          </table>
          <div class="footer">
            ${escapeHtml(t.printDetails)} — ${new Date().toLocaleString("en-US")}
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
    const popup = window.open("", "_blank", "width=1100,height=800");
    if (!popup) return;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }
  function exportExcel() {
    const headers = [t.entryNumber, t.date, t.description, t.status, t.totalDebit, t.totalCredit, t.currency];
    const rows = filteredEntries.map((entry) => [
      entry.entryNumber || entry.id,
      entry.entryDate,
      entry.description,
      statusLabel(entry.status, locale),
      formatMoney(entry.totalDebit),
      formatMoney(entry.totalCredit),
      entry.currency,
    ]);
    const html = `<html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${headers
      .map((header) => `<th>${escapeHtml(header)}</th>`)
      .join("")}</tr></thead><tbody>${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></body></html>`;
    const blob = new Blob(["\\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "journal-entries.xls";
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
                  <span className="rounded-full border bg-background px-3 py-1">{t.registerChip}</span>
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
                <Button variant="outline" className="rounded-xl bg-background shadow-sm hover:bg-muted/70" onClick={() => void loadData()}>
                  <RefreshCw className="h-4 w-4" />
                  {t.refresh}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalEntries} value={stats.total} description={t.totalEntriesDesc} icon={BookOpen} />
          <KpiCard title={t.drafts} value={stats.drafts} description={t.draftsDesc} icon={RotateCcw} />
          <KpiCard title={t.posted} value={stats.posted} description={t.postedDesc} icon={CheckCircle2} />
          <KpiCard title={t.reversed} value={stats.reversed} description={t.reversedDesc} icon={Undo2} />
        </div>
        <Card className="rounded-2xl border-border/70 bg-card shadow-sm transition hover:shadow-md">
          <CardHeader className="px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.createTitle}</CardTitle>
                <CardDescription className="mt-1">{t.createDesc}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-xl bg-background" onClick={resetForm} disabled={saving}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
                <Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 disabled:bg-muted disabled:text-muted-foreground" onClick={() => void submitForm()} disabled={saving || !totals.balanced}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? t.saving : t.save}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-5">
            <div className="grid gap-3 rounded-2xl border bg-muted/20 p-3 lg:grid-cols-[145px_255px_1fr_115px_220px]">
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.entryDate}</span>
                <Input
                  value={form.entryDate}
                  onChange={(event) => setForm((current) => ({ ...current, entryDate: event.target.value }))}
                  placeholder="YYYY-MM-DD"
                  inputMode="numeric"
                  className="h-9 rounded-xl bg-background font-mono text-sm tabular-nums"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.entryNumber}</span>
                <div className="flex h-9 items-center justify-between gap-3 rounded-xl border bg-background px-3">
                  <span className="font-mono text-xs font-semibold tabular-nums">{autoNumber}</span>
                  <span className="whitespace-nowrap text-[11px] text-muted-foreground">{t.autoNumber}</span>
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.description}</span>
                <Input
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder={t.descriptionPlaceholder}
                  className="h-9 rounded-xl bg-background"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.currency}</span>
                <div className="flex h-9 items-center gap-2 rounded-xl border bg-background px-3 font-semibold">
                  <Image src="/currency/sar.svg" alt={t.sar} width={14} height={14} className="h-3.5 w-3.5" />
                  <span>SAR</span>
                </div>
              </label>
              <label className="flex h-9 items-center gap-3 self-end rounded-xl border bg-background px-3">
                <input
                  type="checkbox"
                  checked={form.autoPost}
                  onChange={(event) => setForm((current) => ({ ...current, autoPost: event.target.checked }))}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">{t.autoPost}</span>
              </label>
            </div>
            <div className="overflow-hidden rounded-2xl border">
              <div className="overflow-x-auto">
                <Table className="min-w-[1360px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-[330px] text-start">{t.account}</TableHead>
                      <TableHead className="w-[260px] text-start">{t.costCenter}</TableHead>
                      <TableHead className="text-start">{t.lineDescription}</TableHead>
                      <TableHead className="w-[150px] text-end">{t.debit}</TableHead>
                      <TableHead className="w-[150px] text-end">{t.credit}</TableHead>
                      <TableHead className="w-[110px] text-center">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.lines.map((line, index) => (
                      <TableRow key={index} className="h-[54px] bg-card hover:bg-muted/30">
                        <TableCell>
                          <AccountSearchField
                            value={line.accountCode}
                            accounts={activeAccounts}
                            placeholder={t.accountSearchPlaceholder}
                            notFound={t.accountNotFound}
                            onChange={(nextValue) =>
                              patchLine(index, { accountCode: nextValue })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <CostCenterSearchField
                            value={line.costCenterId}
                            costCenters={activeCostCenters}
                            placeholder={t.costCenterSearchPlaceholder}
                            noCostCenter={t.noCostCenter}
                            notFound={t.costCenterNotFound}
                            onChange={(nextValue) =>
                              patchLine(index, { costCenterId: nextValue })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.description}
                            onChange={(event) => patchLine(index, { description: event.target.value })}
                            className="h-9 rounded-xl border-slate-200 bg-slate-50/85 shadow-inner focus-visible:bg-background"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.debitAmount}
                            onChange={(event) =>
                              patchLine(index, {
                                debitAmount: event.target.value,
                                creditAmount: amount(event.target.value) > 0 ? "" : line.creditAmount,
                              })
                            }
                            className="h-9 rounded-xl border-slate-200 bg-slate-50/85 text-end font-semibold tabular-nums shadow-inner focus-visible:bg-background"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.creditAmount}
                            onChange={(event) =>
                              patchLine(index, {
                                creditAmount: event.target.value,
                                debitAmount: amount(event.target.value) > 0 ? "" : line.debitAmount,
                              })
                            }
                            className="h-9 rounded-xl border-slate-200 bg-slate-50/85 text-end font-semibold tabular-nums shadow-inner focus-visible:bg-background"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="outline" size="sm" className="rounded-lg bg-background" onClick={() => removeLine(index)} disabled={form.lines.length <= 2}>
                            <Trash2 className="h-4 w-4" />
                            {t.removeLine}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t bg-muted/20 p-3">
                <Button variant="outline" className="h-9 w-full rounded-xl bg-background" onClick={addLine}>
                  + {t.addLine}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`rounded-full px-3 py-1 ${
                    totals.balanced ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {totals.balanced ? t.balanced : t.unbalanced}
                </Badge>
                <span className="text-sm font-semibold">{t.totals}</span>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[520px]">
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.totalDebit}</p>
                  <p className="mt-1"><MoneyValue value={totals.debit} label={t.sar} /></p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.totalCredit}</p>
                  <p className="mt-1"><MoneyValue value={totals.credit} label={t.sar} /></p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.difference}</p>
                  <p className="mt-1"><MoneyValue value={totals.difference} label={t.sar} /></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70 bg-card shadow-sm transition hover:shadow-md">
          <CardHeader className="px-5 py-4 sm:px-6">
            <div>
              <CardTitle>{t.registerTitle}</CardTitle>
              <CardDescription className="mt-1">{t.registerDesc}</CardDescription>
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="h-9 rounded-xl bg-background ps-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-9 rounded-xl bg-background sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="DRAFT">{t.DRAFT}</SelectItem>
                    <SelectItem value="POSTED">{t.POSTED}</SelectItem>
                    <SelectItem value="REVERSED">{t.REVERSED}</SelectItem>
                    <SelectItem value="CANCELLED">{t.CANCELLED}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-9 rounded-xl bg-background sm:w-[160px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="number">{t.numberSort}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-9 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
            {loading ? (
              <div className="space-y-3 rounded-2xl border p-4">
                {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : filteredEntries.length ? (
              <div className="overflow-hidden rounded-2xl border">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1080px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-[190px] text-start">{t.entryNumber}</TableHead>
                        <TableHead className="w-[135px] text-start">{t.date}</TableHead>
                        <TableHead className="text-start">{t.description}</TableHead>
                        <TableHead className="w-[130px] text-center">{t.status}</TableHead>
                        <TableHead className="w-[150px] text-end">{t.totalDebit}</TableHead>
                        <TableHead className="w-[150px] text-end">{t.totalCredit}</TableHead>
                        <TableHead className="w-[88px] text-center">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => (
                        <TableRow
                          key={entry.id}
                          role="button"
                          tabIndex={0}
                          title={locale === "ar" ? "اضغط لفتح تفاصيل القيد" : "Click to open journal entry details"}
                          onClick={() => void openDetail(entry.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              void openDetail(entry.id);
                            }
                          }}
                          className="h-[54px] cursor-pointer bg-card transition-colors hover:bg-muted/30"
                        >
                          <TableCell className="font-mono font-semibold tabular-nums">
                            <span className="inline-flex max-w-full select-none rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:underline">
                              {entry.entryNumber || entry.id}
                            </span>
                          </TableCell>
                          <TableCell className="tabular-nums">{normalizeDate(entry.entryDate)}</TableCell>
                          <TableCell className="max-w-[360px] truncate">{entry.description || "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-xs ${statusClass(entry.status)}`}>
                              {statusLabel(entry.status, locale)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end"><MoneyValue value={entry.totalDebit} label={t.sar} /></TableCell>
                          <TableCell className="text-end"><MoneyValue value={entry.totalCredit} label={t.sar} /></TableCell>
                          <TableCell className="w-[88px] text-center align-middle" onClick={(event) => event.stopPropagation()}>
                            <div onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} className="journal-actions-cell flex w-full items-center justify-center">
                                                          <DropdownMenu>
                                                                                        <DropdownMenuTrigger asChild>
                                                                                          <Button
                                                                                            type="button"
                                                                                            variant="outline"
                                                                                            size="icon"
                                                                                            className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50"

      onClick={(event) => event.stopPropagation()}
    >
                                                                                            <MoreVertical className="h-4 w-4" />
                                                                                            <span className="sr-only">الإجراءات</span>
                                                                                          </Button>
                                                                                        </DropdownMenuTrigger>
                                                                                        <DropdownMenuContent
                                                                                          align="start"
                                                                                          className="w-40 rounded-xl border-slate-200 bg-white p-1 shadow-lg"
                                                                                        >
                                                                                          <div className="[&>button]:h-9 [&>button]:w-full [&>button]:justify-start [&>button]:rounded-lg [&>button]:border-0 [&>button]:bg-transparent [&>button]:px-2 [&>button]:text-sm [&>button]:font-medium [&>button]:shadow-none [&>button:hover]:bg-slate-50">

                                                                                        <Button variant="outline" size="sm" className="rounded-lg bg-background" onClick={() => void openDetail(entry.id)} disabled={actionId === entry.id}>
                                                                                          {actionId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                                                                          {t.view}
                                                                                        </Button>
                                                                                        {entry.status === "DRAFT" ? (
                                                                                          <Button size="sm" className="rounded-lg" onClick={() => void postEntry(entry.id)} disabled={actionId === entry.id}>
                                                                                            <CheckCircle2 className="h-4 w-4" />
                                                                                            {t.post}
                                                                                          </Button>
                                                                                        ) : null}
                                                                                        {entry.status === "POSTED" ? (
                                                                                          <Button variant="outline" size="sm" className="rounded-lg bg-background" onClick={() => setReverseTarget(entry)} disabled={actionId === entry.id}>
                                                                                            <Undo2 className="h-4 w-4" />
                                                                                            {t.reverse}
                                                                                          </Button>
                                                                                        ) : null}
                                                                                          </div>
                                                                                        </DropdownMenuContent>
                                                                                      </DropdownMenu>
                                                        </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
                <Search className="h-7 w-7 text-muted-foreground" />
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
        <AlertDialog
          open={Boolean(reverseTarget)}
          onOpenChange={(open) => {
            if (!open) setReverseTarget(null);
          }}
        >
          <AlertDialogContent dir={dir} className="rounded-2xl border bg-card shadow-2xl sm:max-w-[520px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black">
                {t.reverseDialogTitle}
              </AlertDialogTitle>
              <AlertDialogDescription className="leading-7">
                {t.reverseDialogDesc}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {reverseTarget ? (
              <div className="grid gap-3 rounded-2xl border bg-muted/20 p-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.entryNumber}</p>
                  <p className="mt-1 font-mono text-sm font-black tabular-nums">
                    {reverseTarget.entryNumber || reverseTarget.id}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                  <p className="mt-1 font-mono text-sm font-black tabular-nums">
                    {normalizeDate(reverseTarget.entryDate)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.totalDebit}</p>
                  <p className="mt-1">
                    <MoneyValue value={reverseTarget.totalDebit} label={t.sar} />
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.totalCredit}</p>
                  <p className="mt-1">
                    <MoneyValue value={reverseTarget.totalCredit} label={t.sar} />
                  </p>
                </div>
              </div>
            ) : null}
            <AlertDialogFooter className="gap-2 sm:justify-start">
              <AlertDialogCancel className="rounded-xl bg-background">
                {t.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                onClick={() => {
                  const entryId = reverseTarget?.id;
                  setReverseTarget(null);
                  if (entryId) {
                    void reverseEntry(entryId);
                  }
                }}
              >
                <Undo2 className="h-4 w-4" />
                {t.confirmReverse}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {selectedEntry ? (
          <Card id="journal-entry-details-panel" data-journal-entry-details-panel="true" className="rounded-2xl border-border/70 bg-card shadow-sm transition hover:shadow-md">
            <CardHeader className="px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle>
                    {t.detailTitle}:{" "}
                    <span className="font-mono tabular-nums">
                      {selectedEntry.entryNumber || selectedEntry.id}
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-1">{t.detailDesc}</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                    onClick={() => printSelectedEntry(selectedEntry)}
                  >
                    <Printer className="h-4 w-4" />
                    {t.printDetails}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl bg-background"
                    onClick={() => setSelectedEntry(null)}
                  >
                    {t.close}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.entryNumber}</p>
                  <p className="mt-1 font-mono text-sm font-black tabular-nums">
                    {selectedEntry.entryNumber || selectedEntry.id}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                  <p className="mt-1 font-mono text-sm font-black tabular-nums">
                    {normalizeDate(selectedEntry.entryDate)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.status}</p>
                  <Badge
                    variant="outline"
                    className={`mt-1 rounded-full px-2.5 py-1 text-xs ${statusClass(selectedEntry.status)}`}
                  >
                    {statusLabel(selectedEntry.status, locale)}
                  </Badge>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.totalDebit}</p>
                  <p className="mt-1">
                    <MoneyValue value={selectedEntry.totalDebit} label={t.sar} />
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.totalCredit}</p>
                  <p className="mt-1">
                    <MoneyValue value={selectedEntry.totalCredit} label={t.sar} />
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-inner">
                  <p className="text-xs text-muted-foreground">{t.currency}</p>
                  <p className="mt-1 inline-flex items-center gap-1 font-black">
                    <Image src="/currency/sar.svg" alt={t.sar} width={14} height={14} />
                    {selectedEntry.currency || "SAR"}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <p className="mt-1 text-sm font-semibold">{selectedEntry.description || "—"}</p>
              </div>
              <div className="overflow-hidden rounded-2xl border">
                <div className="overflow-x-auto">
                  <Table className="min-w-[960px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-[90px] text-start">{t.lineNo}</TableHead>
                        <TableHead className="text-start">{t.account}</TableHead>
                        <TableHead className="w-[240px] text-start">{t.costCenter}</TableHead>
                        <TableHead className="text-start">{t.lineDescription}</TableHead>
                        <TableHead className="w-[140px] text-end">{t.debit}</TableHead>
                        <TableHead className="w-[140px] text-end">{t.credit}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedEntry.lines || []).length ? (
                        (selectedEntry.lines || []).map((line, index) => {
                          const accountCode = line.account_code || line.account?.code || "";
                          const accountName =
                            line.account_name ||
                            line.account?.name ||
                            line.account?.name_ar ||
                            line.account?.name_en ||
                            "";
                          const costCenterCode = line.cost_center?.code || "";
                          const costCenterName =
                            line.cost_center?.name || line.cost_center?.name_en || "";
                          return (
                            <TableRow key={String(line.id || index)} className="h-[56px]">
                              <TableCell className="font-mono font-bold tabular-nums">
                                {index + 1}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {accountCode ? `${accountCode} — ${accountName}` : "—"}
                              </TableCell>
                              <TableCell>
                                {costCenterCode ? `${costCenterCode} — ${costCenterName}` : "—"}
                              </TableCell>
                              <TableCell>{line.description || "—"}</TableCell>
                              <TableCell className="text-end">
                                <MoneyValue value={line.debit_amount} label={t.sar} />
                              </TableCell>
                              <TableCell className="text-end">
                                <MoneyValue value={line.credit_amount} label={t.sar} />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            {t.emptyLines}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
