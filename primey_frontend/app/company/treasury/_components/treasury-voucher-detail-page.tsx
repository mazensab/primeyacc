"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CalendarDays,
  CircleAlert,
  FileText,
  Landmark,
  Loader2,
  Printer,
  RefreshCw,
  UserRound,
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
import { cn } from "@/lib/utils";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
export type VoucherVariant = "receipt" | "payment";
type VoucherDetails = {
  id: string;
  number: string;
  date: string;
  status: string;
  amount: number;
  method: string;
  reference: string;
  notes: string;
  partyName: string;
  partyCode: string;
  partyPhone: string;
  partyType: string;
  treasuryAccountName: string;
  treasuryAccountCode: string;
  accountingAccountCode: string;
  accountingAccountName: string;
  accountingEntryNumber: string;
  accountingEntryStatus: string;
  treasuryTransactionNumber: string;
  treasuryTransactionStatus: string;
  linkedDocumentNumber: string;
  linkedDocumentStatus: string;
  createdAt: string;
  updatedAt: string;
};
const translations = {
  ar: {
    receiptBadge: "تفاصيل سند القبض",
    paymentBadge: "تفاصيل سند الصرف",
    receiptTitle: "سند قبض",
    paymentTitle: "سند صرف",
    receiptSubtitle:
      "تفاصيل سند القبض والطرف وحساب الخزينة والقيد المحاسبي المرتبط.",
    paymentSubtitle:
      "تفاصيل سند الصرف والطرف وحساب الخزينة والقيد المحاسبي المرتبط.",
    receiptBack: "العودة إلى سندات القبض",
    paymentBack: "العودة إلى سندات الصرف",
    refresh: "تحديث",
    print: "طباعة",
    status: "الحالة",
    amount: "المبلغ",
    date: "تاريخ السند",
    method: "طريقة الدفع",
    voucherData: "بيانات السند",
    partyData: "بيانات الطرف",
    treasuryData: "الخزينة والمحاسبة",
    number: "رقم السند",
    reference: "المرجع",
    notes: "الملاحظات",
    partyName: "اسم الطرف",
    partyCode: "كود الطرف",
    partyPhone: "الجوال",
    partyType: "نوع الطرف",
    treasuryAccount: "حساب الخزينة",
    accountingAccount: "الحساب المحاسبي",
    accountingEntry: "القيد المحاسبي",
    treasuryTransaction: "حركة الخزينة",
    linkedDocument: "المستند المرتبط",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    openEntry: "فتح تفاصيل القيد",
    notFound: "لم يتم العثور على السند المطلوب.",
    loadFailed: "تعذر تحميل تفاصيل السند.",
    loading: "جاري تحميل تفاصيل السند...",
    sar: "ريال سعودي",
    draft: "مسودة",
    confirmed: "مؤكد",
    cancelled: "ملغي",
  },
  en: {
    receiptBadge: "Receipt Voucher Details",
    paymentBadge: "Payment Voucher Details",
    receiptTitle: "Receipt Voucher",
    paymentTitle: "Payment Voucher",
    receiptSubtitle:
      "Receipt voucher, counterparty, treasury account, and linked journal entry details.",
    paymentSubtitle:
      "Payment voucher, counterparty, treasury account, and linked journal entry details.",
    receiptBack: "Back to Receipt Vouchers",
    paymentBack: "Back to Payment Vouchers",
    refresh: "Refresh",
    print: "Print",
    status: "Status",
    amount: "Amount",
    date: "Voucher date",
    method: "Payment method",
    voucherData: "Voucher Data",
    partyData: "Counterparty Data",
    treasuryData: "Treasury and Accounting",
    number: "Voucher number",
    reference: "Reference",
    notes: "Notes",
    partyName: "Counterparty name",
    partyCode: "Counterparty code",
    partyPhone: "Phone",
    partyType: "Counterparty type",
    treasuryAccount: "Treasury account",
    accountingAccount: "Accounting account",
    accountingEntry: "Journal entry",
    treasuryTransaction: "Treasury transaction",
    linkedDocument: "Linked document",
    createdAt: "Created at",
    updatedAt: "Last update",
    openEntry: "Open journal entry details",
    notFound: "The requested voucher was not found.",
    loadFailed: "Could not load voucher details.",
    loading: "Loading voucher details...",
    sar: "Saudi Riyal",
    draft: "Draft",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
  },
} as const;
function initialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en"
    ? "en"
    : "ar";
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
    "payments",
    "customer_payments",
    "supplier_payments",
    "data",
  ]) {
    if (Array.isArray(source[key])) return source[key] as unknown[];
  }
  const nested = record(source.data);
  for (const key of [
    "results",
    "items",
    "payments",
    "customer_payments",
    "supplier_payments",
  ]) {
    if (Array.isArray(nested[key])) return nested[key] as unknown[];
  }
  return [];
}
function unwrapVoucher(payload: unknown) {
  const source = record(payload);
  return (
    source.payment ||
    source.customer_payment ||
    source.supplier_payment ||
    source.result ||
    source.data ||
    payload
  );
}
function normalizeVoucher(value: unknown): VoucherDetails {
  const source = record(value);
  const customer = record(source.customer);
  const supplier = record(source.supplier);
  const party = record(
    source.party ||
      source.counterparty ||
      source.customer ||
      source.supplier,
  );
  const treasuryAccount = record(source.treasury_account);
  const accountingAccount = record(
    source.treasury_accounting_account ||
      treasuryAccount.accounting_account,
  );
  const accountingEntry = record(source.accounting_entry);
  const treasuryTransaction = record(source.treasury_transaction);
  const salesInvoice = record(source.sales_invoice);
  const purchaseBill = record(source.purchase_bill);
  return {
    id: text(source.id || source.pk),
    number: text(
      source.payment_number ||
        source.voucher_number ||
        source.number,
    ),
    date: text(
      source.payment_date ||
        source.voucher_date ||
        source.date,
    ),
    status: text(source.status, "DRAFT").toUpperCase(),
    amount: numberValue(source.amount),
    method: text(
      source.payment_method ||
        source.method,
      "—",
    ),
    reference: text(source.reference, "—"),
    notes: text(
      source.notes ||
        source.description ||
        source.memo,
      "—",
    ),
    partyName: text(
      source.party_name ||
        source.counterparty_name ||
        source.customer_name ||
        source.supplier_name ||
        party.name ||
        customer.name ||
        supplier.name,
      "—",
    ),
    partyCode: text(
      source.party_code ||
        source.counterparty_code ||
        source.customer_code ||
        source.supplier_code ||
        party.code ||
        customer.code ||
        supplier.code,
      "—",
    ),
    partyPhone: text(
      source.party_phone ||
        source.counterparty_phone ||
        source.customer_phone ||
        source.supplier_phone ||
        party.phone ||
        party.mobile ||
        customer.phone ||
        supplier.phone,
      "—",
    ),
    partyType: text(
      source.counterparty_type ||
        source.party_type ||
        (source.customer || source.customer_id ? "CUSTOMER" : "") ||
        (source.supplier || source.supplier_id ? "SUPPLIER" : ""),
      "—",
    ),
    treasuryAccountName: text(
      source.treasury_account_name ||
        treasuryAccount.name,
      "—",
    ),
    treasuryAccountCode: text(
      source.treasury_account_code ||
        treasuryAccount.code,
      "—",
    ),
    accountingAccountCode: text(
      source.treasury_accounting_account_code ||
        source.accounting_account_code ||
        accountingAccount.code,
      "—",
    ),
    accountingAccountName: text(
      source.treasury_accounting_account_name ||
        source.accounting_account_name ||
        accountingAccount.name,
      "—",
    ),
    accountingEntryNumber: text(
      source.accounting_entry_number ||
        accountingEntry.entry_number ||
        accountingEntry.number,
    ),
    accountingEntryStatus: text(
      source.accounting_entry_status ||
        accountingEntry.status,
      "—",
    ),
    treasuryTransactionNumber: text(
      source.treasury_transaction_number ||
        treasuryTransaction.transaction_number ||
        treasuryTransaction.number,
      "—",
    ),
    treasuryTransactionStatus: text(
      source.treasury_transaction_status ||
        treasuryTransaction.status,
      "—",
    ),
    linkedDocumentNumber: text(
      source.linked_document_number ||
        source.sales_invoice_number ||
        source.purchase_bill_number ||
        salesInvoice.invoice_number ||
        salesInvoice.number ||
        purchaseBill.bill_number ||
        purchaseBill.number,
      "—",
    ),
    linkedDocumentStatus: text(
      source.linked_document_status ||
        source.linked_document_payment_status ||
        salesInvoice.status ||
        purchaseBill.status,
      "—",
    ),
    createdAt: text(source.created_at),
    updatedAt: text(source.updated_at),
  };
}
function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
function formatDate(value: string) {
  return value ? value.slice(0, 10) : "—";
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
  if (normalized === "CONFIRMED" || normalized === "POSTED") {
    return t.confirmed;
  }
  if (
    normalized === "CANCELLED" ||
    normalized === "CANCELED" ||
    normalized === "REVERSED"
  ) {
    return t.cancelled;
  }
  return t.draft;
}
function statusClasses(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "CONFIRMED" || normalized === "POSTED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (
    normalized === "CANCELLED" ||
    normalized === "CANCELED" ||
    normalized === "REVERSED"
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}
function Field({
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
      <Skeleton className="h-56 rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
export function TreasuryVoucherDetailPage({
  variant,
  voucherNumber,
}: {
  variant: VoucherVariant;
  voucherNumber: string;
}) {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [loading, setLoading] = React.useState(true);
  const [voucher, setVoucher] = React.useState<VoucherDetails | null>(null);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    setLocale(initialLocale());
    const onStorage = () => setLocale(initialLocale());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const t = translations[locale];
  const isRtl = locale === "ar";
  const apiPath =
    variant === "receipt"
      ? "/api/company/treasury/customer-payments/"
      : "/api/company/treasury/supplier-payments/";
  const backHref =
    variant === "receipt"
      ? "/company/treasury/receipt-vouchers"
      : "/company/treasury/payment-vouchers";
  const title =
    variant === "receipt" ? t.receiptTitle : t.paymentTitle;
  const badge =
    variant === "receipt" ? t.receiptBadge : t.paymentBadge;
  const subtitle =
    variant === "receipt" ? t.receiptSubtitle : t.paymentSubtitle;
  const backLabel =
    variant === "receipt" ? t.receiptBack : t.paymentBack;
  const loadVoucher = React.useCallback(async () => {
    if (!voucherNumber) return;
    setLoading(true);
    setError("");
    try {
      const encoded = encodeURIComponent(voucherNumber);
      let listPayload = await fetchJson<unknown>(
        `${apiPath}?search=${encoded}&page_size=100`,
      );
      let rows = extractRows(listPayload).map(normalizeVoucher);
      let match =
        rows.find(
          (row) =>
            row.number.toUpperCase() === voucherNumber.toUpperCase(),
        ) ||
        (rows.length === 1 ? rows[0] : undefined);
      if (!match) {
        listPayload = await fetchJson<unknown>(
          `${apiPath}?page_size=500`,
        );
        rows = extractRows(listPayload).map(normalizeVoucher);
        match = rows.find(
          (row) =>
            row.number.toUpperCase() === voucherNumber.toUpperCase(),
        );
      }
      if (!match) throw new Error(t.notFound);
      if (match.id) {
        const detailPayload = await fetchJson<unknown>(
          `${apiPath}${encodeURIComponent(match.id)}/`,
        );
        setVoucher(normalizeVoucher(unwrapVoucher(detailPayload)));
      } else {
        setVoucher(match);
      }
    } catch (caughtError) {
      setVoucher(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t.loadFailed,
      );
    } finally {
      setLoading(false);
    }
  }, [apiPath, t.loadFailed, t.notFound, voucherNumber]);
  React.useEffect(() => {
    void loadVoucher();
  }, [loadVoucher]);
  if (loading) return <DetailSkeleton />;
  if (!voucher) {
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
              <Link href={backHref}>{backLabel}</Link>
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
              <FileText className="h-3.5 w-3.5" />
              {badge}
            </Badge>
            <div>
              <CardTitle className="text-3xl font-bold tracking-tight">
                {title}{" "}
                <span dir="ltr" className="inline-block">
                  {voucher.number}
                </span>
              </CardTitle>
              <CardDescription className="mt-2 leading-7">
                {subtitle}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void loadVoucher()}
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
                  statusClasses(voucher.status),
                )}
              >
                {statusLabel(voucher.status, locale)}
              </Badge>
            </div>
            <BadgeCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardDescription>{t.amount}</CardDescription>
              <CardTitle className="mt-3 text-xl">
                <Money value={voucher.amount} label={t.sar} />
              </CardTitle>
            </div>
            <Banknote className="h-5 w-5 text-muted-foreground" />
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
                {formatDate(voucher.date)}
              </CardTitle>
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardDescription>{t.method}</CardDescription>
              <CardTitle className="mt-3 text-lg">
                {voucher.method}
              </CardTitle>
            </div>
            <Landmark className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
        </Card>
      </div>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t.voucherData}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Field label={t.number} value={voucher.number} dir="ltr" />
          <Field label={t.date} value={formatDate(voucher.date)} dir="ltr" />
          <Field
            label={t.status}
            value={statusLabel(voucher.status, locale)}
          />
          <Field label={t.method} value={voucher.method} />
          <Field label={t.reference} value={voucher.reference} />
          <Field
            label={t.linkedDocument}
            value={
              <div>
                <p dir="ltr">{voucher.linkedDocumentNumber}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {voucher.linkedDocumentStatus}
                </p>
              </div>
            }
          />
          <div className="md:col-span-2 xl:col-span-3">
            <Field label={t.notes} value={voucher.notes} />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5" />
              {t.partyData}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field label={t.partyName} value={voucher.partyName} />
            <Field label={t.partyCode} value={voucher.partyCode} dir="ltr" />
            <Field label={t.partyPhone} value={voucher.partyPhone} dir="ltr" />
            <Field label={t.partyType} value={voucher.partyType} />
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              {t.treasuryData}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Field
              label={t.treasuryAccount}
              value={
                <div>
                  <p>{voucher.treasuryAccountName}</p>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {voucher.treasuryAccountCode}
                  </p>
                </div>
              }
            />
            <Field
              label={t.accountingAccount}
              value={
                <div>
                  <p>{voucher.accountingAccountName}</p>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {voucher.accountingAccountCode}
                  </p>
                </div>
              }
            />
            <Field
              label={t.treasuryTransaction}
              value={
                <div>
                  <p dir="ltr">{voucher.treasuryTransactionNumber}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {voucher.treasuryTransactionStatus}
                  </p>
                </div>
              }
            />
            <Field
              label={t.accountingEntry}
              value={
                voucher.accountingEntryNumber ? (
                  <Link
                    href={`/company/accounting/journal-entries/${encodeURIComponent(voucher.accountingEntryNumber)}`}
                    className="inline-flex flex-col rounded-lg px-2 py-1 transition hover:bg-muted hover:underline"
                    title={t.openEntry}
                  >
                    <span dir="ltr">{voucher.accountingEntryNumber}</span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {voucher.accountingEntryStatus}
                    </span>
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Field
              label={t.createdAt}
              value={formatDate(voucher.createdAt)}
              dir="ltr"
            />
            <Field
              label={t.updatedAt}
              value={formatDate(voucher.updatedAt)}
              dir="ltr"
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
