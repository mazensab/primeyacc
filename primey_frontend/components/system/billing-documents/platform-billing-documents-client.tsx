"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowUpDown,
  Building2,
  CalendarDays,
  CircleAlert,
  CreditCard,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
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

export type PlatformBillingDocumentsMode =
  | "overview"
  | "invoices"
  | "receipts"
  | "detail";

type Locale = "ar" | "en";
type Row = Record<string, unknown>;

type BillingDocument = {
  id: string;
  type: string;
  status: string;
  number: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  subscriptionId: string;
  subscriptionStatus: string;
  planName: string;
  relatedInvoiceId: string;
  relatedInvoiceNumber: string;
  currency: string;
  subtotal: string;
  discount: string;
  taxable: string;
  tax: string;
  total: string;
  paid: string;
  balance: string;
  billingReference: string;
  transactionReference: string;
  paymentMethod: string;
  issueDate: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string;
  notes: string;
  allowedPrint: boolean;
  printable: boolean;
  seller: Row;
  buyer: Row;
  subscriptionSnapshot: Row;
  planSnapshot: Row;
};

const API = "/api/system/billing-documents/";

const dictionaries = {
  ar: {
    badge: "إدارة المنصة",
    title: "فواتير وإيصالات المنصة",
    invoicesTitle: "فواتير اشتراكات المنصة",
    receiptsTitle: "إيصالات دفع المنصة",
    detailTitle: "تفاصيل مستند الفوترة",
    overviewDesc: "مركز مستندات فوترة اشتراكات Mhamcloud المبني على عقود Backend المجمدة.",
    invoicesDesc: "فواتير الاشتراك مع الشركة والاشتراك والحالة والقيم والضريبة والخصم.",
    receiptsDesc: "إيصالات الدفع المرتبطة بفواتير الاشتراكات وعمليات التحصيل.",
    detailDesc: "تفاصيل المستند والنسخ الثابتة والروابط ومعاينة الطباعة المحفوظة.",
    refresh: "تحديث",
    overview: "المركز",
    invoices: "الفواتير",
    receipts: "الإيصالات",
    payments: "مدفوعات المنصة",
    dashboard: "لوحة النظام",
    export: "تصدير Excel",
    print: "طباعة",
    pdf: "فتح PDF",
    reset: "إعادة ضبط",
    open: "فتح",
    all: "الكل",
    from: "من",
    to: "إلى",
    newest: "الأحدث",
    oldest: "الأقدم",
    numberSort: "رقم المستند",
    companySort: "الشركة",
    totalDocuments: "إجمالي المستندات",
    invoiceCount: "فواتير الاشتراك",
    receiptCount: "إيصالات الدفع",
    totalAmount: "إجمالي القيمة",
    search: "ابحث برقم المستند أو الشركة أو مرجع الفوترة أو العملية...",
    status: "الحالة",
    company: "الشركة",
    subscription: "الاشتراك",
    documentNumber: "رقم المستند",
    documentType: "نوع المستند",
    plan: "الباقة",
    paymentMethod: "طريقة الدفع",
    billingReference: "مرجع الفوترة",
    transactionReference: "مرجع العملية",
    issueDate: "تاريخ الإصدار",
    paidAt: "تاريخ الدفع",
    amount: "الإجمالي",
    paid: "المدفوع",
    balance: "المتبقي",
    noData: "لا توجد مستندات فوترة منصة.",
    noResults: "لا توجد نتائج مطابقة للفلاتر الحالية.",
    loadError: "تعذر تحميل مستندات فوترة المنصة.",
    retry: "إعادة المحاولة",
    refreshed: "تم تحديث مستندات الفوترة.",
    identity: "هوية المستند",
    financials: "القيم المالية",
    links: "الروابط المرتبطة",
    immutable: "البيانات الثابتة وقت الإصدار",
    printable: "معاينة المستند القابل للطباعة",
    printableDesc: "المعاينة تأتي مباشرة من Renderer الخاص بالـBackend وتعتمد على printable_payload المحفوظ.",
    safeSnapshot: "تعرض الواجهة حقولًا آمنة محددة فقط ولا تعرض metadata أو provider payloads أو payment_snapshot الخام.",
    subtotal: "المجموع قبل الخصم",
    discount: "الخصم",
    taxable: "الخاضع للضريبة",
    tax: "الضريبة",
    total: "الإجمالي",
    seller: "البائع",
    buyer: "المشتري",
    taxNumber: "الرقم الضريبي",
    commercialRegistration: "السجل التجاري",
    email: "البريد الإلكتروني",
    city: "المدينة",
    billingCycle: "دورة الفوترة",
    action: "نوع الاشتراك",
    cancelledAt: "تاريخ الإلغاء",
    cancellationReason: "سبب الإلغاء",
    notes: "ملاحظات",
    linkedReceipts: "إيصالات الدفع المرتبطة",
    none: "غير متوفر",
    previewUnavailable: "لا توجد معاينة طباعة محفوظة لهذا المستند.",
  },
  en: {
    badge: "Platform management",
    title: "Platform invoices & receipts",
    invoicesTitle: "Platform subscription invoices",
    receiptsTitle: "Platform payment receipts",
    detailTitle: "Billing document details",
    overviewDesc: "Mhamcloud subscription billing documents center built on the frozen backend contracts.",
    invoicesDesc: "Subscription invoices with company, subscription, status, totals, VAT, and discount.",
    receiptsDesc: "Payment receipts linked to platform subscription invoices and collections.",
    detailDesc: "Document detail, immutable snapshots, links, and stored printable preview.",
    refresh: "Refresh",
    overview: "Center",
    invoices: "Invoices",
    receipts: "Receipts",
    payments: "Platform payments",
    dashboard: "System dashboard",
    export: "Export Excel",
    print: "Print",
    pdf: "Open PDF",
    reset: "Reset",
    open: "Open",
    all: "All",
    from: "From",
    to: "To",
    newest: "Newest",
    oldest: "Oldest",
    numberSort: "Document number",
    companySort: "Company",
    totalDocuments: "Total documents",
    invoiceCount: "Subscription invoices",
    receiptCount: "Payment receipts",
    totalAmount: "Total amount",
    search: "Search document number, company, billing or transaction reference...",
    status: "Status",
    company: "Company",
    subscription: "Subscription",
    documentNumber: "Document number",
    documentType: "Document type",
    plan: "Plan",
    paymentMethod: "Payment method",
    billingReference: "Billing reference",
    transactionReference: "Transaction reference",
    issueDate: "Issue date",
    paidAt: "Paid at",
    amount: "Total",
    paid: "Paid",
    balance: "Balance",
    noData: "No platform billing documents.",
    noResults: "No documents match the current filters.",
    loadError: "Could not load platform billing documents.",
    retry: "Try again",
    refreshed: "Billing documents refreshed.",
    identity: "Document identity",
    financials: "Financial values",
    links: "Linked records",
    immutable: "Immutable issue-time data",
    printable: "Printable document preview",
    printableDesc: "The preview comes directly from the backend renderer and uses stored printable_payload.",
    safeSnapshot: "The UI exposes only allowlisted safe snapshot fields; raw metadata, provider payloads, and raw payment_snapshot are not displayed.",
    subtotal: "Subtotal",
    discount: "Discount",
    taxable: "Taxable amount",
    tax: "VAT",
    total: "Total",
    seller: "Seller",
    buyer: "Buyer",
    taxNumber: "Tax number",
    commercialRegistration: "Commercial registration",
    email: "Email",
    city: "City",
    billingCycle: "Billing cycle",
    action: "Subscription action",
    cancelledAt: "Cancelled at",
    cancellationReason: "Cancellation reason",
    notes: "Notes",
    linkedReceipts: "Linked payment receipts",
    none: "Not available",
    previewUnavailable: "No stored printable preview is available for this document.",
  },
} as const;

function isRow(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function row(value: unknown): Row {
  return isRow(value) ? value : {};
}
function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}
function numeric(value: unknown) {
  const parsed = Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function bool(value: unknown) {
  return value === true || value === 1 || value === "true";
}
function getLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function apiBase() {
  const base = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return base.endsWith("/api") ? base.slice(0, -4) : base;
}
function apiUrl(path: string) {
  return `${apiBase()}${path}`;
}
async function request(path: string) {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const raw = await response.text();
  let payload: unknown = {};
  if (raw) {
    try { payload = JSON.parse(raw); }
    catch { payload = { message: raw }; }
  }
  const root = row(payload);
  if (!response.ok || root.ok === false) {
    throw new Error(text(root.message) || text(root.detail) || `Request failed with status ${response.status}`);
  }
  return payload;
}
function data(payload: unknown) {
  return row(row(payload).data);
}
function normalize(value: unknown): BillingDocument {
  const s = row(value);
  const company = row(s.company);
  const subscription = row(s.subscription);
  const plan = row(subscription.plan);
  const amounts = row(s.amounts);
  const related = row(s.related_invoice);
  const snapshots = row(s.snapshots);
  return {
    id: text(s.id),
    type: text(s.document_type, "UNKNOWN").toUpperCase(),
    status: text(s.status, "UNKNOWN").toUpperCase(),
    number: text(s.document_number, "—"),
    companyId: text(company.id ?? s.company_id),
    companyName: text(company.display_name ?? company.name ?? company.name_ar ?? company.name_en, "—"),
    companyCode: text(company.company_code ?? company.code),
    subscriptionId: text(subscription.id ?? s.subscription_id),
    subscriptionStatus: text(subscription.status),
    planName: text(plan.name, "—"),
    relatedInvoiceId: text(related.id ?? s.related_invoice_id),
    relatedInvoiceNumber: text(related.document_number),
    currency: text(s.currency_code, "SAR").toUpperCase(),
    subtotal: text(amounts.subtotal ?? s.subtotal, "0.00"),
    discount: text(amounts.discount_amount ?? s.discount_amount, "0.00"),
    taxable: text(amounts.taxable_amount ?? s.taxable_amount, "0.00"),
    tax: text(amounts.tax_amount ?? s.tax_amount, "0.00"),
    total: text(amounts.total_amount ?? s.total_amount, "0.00"),
    paid: text(amounts.paid_amount ?? s.paid_amount, "0.00"),
    balance: text(amounts.balance_amount ?? s.balance_amount, "0.00"),
    billingReference: text(s.billing_reference),
    transactionReference: text(s.transaction_reference),
    paymentMethod: text(s.payment_method),
    issueDate: text(s.issue_date) || null,
    issuedAt: text(s.issued_at) || null,
    paidAt: text(s.paid_at) || null,
    cancelledAt: text(s.cancelled_at) || null,
    cancellationReason: text(s.cancellation_reason),
    notes: text(s.notes),
    allowedPrint: bool(row(s.allowed_actions).print),
    printable: Object.keys(row(s.printable_payload)).length > 0,
    seller: row(snapshots.seller ?? s.seller_snapshot),
    buyer: row(snapshots.buyer ?? s.buyer_snapshot),
    subscriptionSnapshot: row(snapshots.subscription ?? s.subscription_snapshot),
    planSnapshot: row(snapshots.plan ?? s.plan_snapshot),
  };
}
async function fetchDocuments() {
  const payload = await request(API);
  const d = data(payload);
  const items = Array.isArray(d.items) ? d.items : Array.isArray(d.results) ? d.results : [];
  return items.map(normalize);
}
async function fetchDocument(id: string) {
  const payload = await request(`${API}${encodeURIComponent(id)}/`);
  const d = data(payload);
  return {
    document: normalize(d.document),
    receipts: (Array.isArray(d.payment_receipts) ? d.payment_receipts : []).map(normalize),
  };
}
function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return withTime ? value.replace("T", " ").slice(0, 16) : value.slice(0, 10);
  const iso = parsed.toISOString();
  return withTime ? iso.replace("T", " ").slice(0, 16) : iso.slice(0, 10);
}
function dateValue(value: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
function isoDate(value: Date | undefined) {
  if (!value) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
function parseIsoDate(value: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
function statusClass(value: string) {
  const s = value.toUpperCase();
  if (s === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["DRAFT", "ISSUED"].includes(s)) return "border-amber-200 bg-amber-50 text-amber-700";
  if (s === "CANCELLED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}
function StatusBadge({ value }: { value: string }) {
  return <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-xs ${statusClass(value)}`}>{value || "UNKNOWN"}</Badge>;
}
function documentTypeLabel(value: string, locale: Locale) {
  if (value === "SUBSCRIPTION_INVOICE") return locale === "ar" ? "فاتورة اشتراك" : "Subscription invoice";
  if (value === "PAYMENT_RECEIPT") return locale === "ar" ? "إيصال دفع" : "Payment receipt";
  return value || "—";
}
function paymentMethodLabel(value: string, locale: Locale) {
  const map: Record<string, { ar: string; en: string }> = {
    CASH: { ar: "نقدي", en: "Cash" },
    BANK_TRANSFER: { ar: "تحويل بنكي", en: "Bank transfer" },
    CARD: { ar: "بطاقة / مدى", en: "Card / Mada" },
    PAYMENT_GATEWAY: { ar: "بوابة دفع", en: "Payment gateway" },
  };
  return map[value.toUpperCase()]?.[locale] || value || "—";
}
function Money({ amount, currency }: { amount: string; currency: string }) {
  const parsed = Number.parseFloat(amount || "0");
  const formatted = Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
  if (currency !== "SAR") return <span dir="ltr" className="tabular-nums">{formatted} {currency}</span>;
  return <span dir="ltr" className="inline-flex items-center gap-1 font-medium tabular-nums"><Image src="/currency/sar.svg" alt="SAR" width={15} height={15} className="h-[15px] w-[15px]" />{formatted}</span>;
}
function Kpi({ title, value }: { title: string; value: React.ReactNode }) {
  return <Card className="rounded-2xl border-border/70 shadow-sm"><CardHeader className="pb-2"><CardDescription>{title}</CardDescription><CardTitle className="mt-2 text-2xl tabular-nums">{value}</CardTitle></CardHeader></Card>;
}
function Header({ mode, locale, refreshing, refresh }: { mode: PlatformBillingDocumentsMode; locale: Locale; refreshing: boolean; refresh: () => void }) {
  const t = dictionaries[locale];
  const title = mode === "invoices" ? t.invoicesTitle : mode === "receipts" ? t.receiptsTitle : mode === "detail" ? t.detailTitle : t.title;
  const desc = mode === "invoices" ? t.invoicesDesc : mode === "receipts" ? t.receiptsDesc : mode === "detail" ? t.detailDesc : t.overviewDesc;
  return <section className="overflow-hidden rounded-3xl border bg-card shadow-sm"><div className="relative p-6 sm:p-8"><div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" /><div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between"><div className="max-w-4xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" />{t.badge}</div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1><p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{desc}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" className="h-9 rounded-xl bg-background" onClick={refresh} disabled={refreshing}>{refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{t.refresh}</Button><Button asChild variant="outline" className="h-9 rounded-xl bg-background"><Link href="/system/invoices"><ReceiptText className="h-4 w-4" />{t.overview}</Link></Button><Button asChild variant="outline" className="h-9 rounded-xl bg-background"><Link href="/system/invoices/list"><FileText className="h-4 w-4" />{t.invoices}</Link></Button><Button asChild variant="outline" className="h-9 rounded-xl bg-background"><Link href="/system/invoices/receipts"><ReceiptText className="h-4 w-4" />{t.receipts}</Link></Button><Button asChild variant="outline" className="h-9 rounded-xl bg-background"><Link href="/system/platform-payments"><CreditCard className="h-4 w-4" />{t.payments}</Link></Button></div></div></div></section>;
}
function Loading() {
  return <div className="space-y-6"><Skeleton className="h-44 w-full rounded-3xl" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div><Skeleton className="h-[420px] rounded-2xl" /></div>;
}
function ErrorCard({ message, retry, locale }: { message: string; retry: () => void; locale: Locale }) {
  const t = dictionaries[locale];
  return <Card className="mx-auto max-w-3xl rounded-3xl border-destructive/30"><CardHeader className="text-center"><TriangleAlert className="mx-auto h-8 w-8 text-destructive" /><CardTitle>{t.loadError}</CardTitle><CardDescription>{message}</CardDescription></CardHeader><CardContent className="text-center"><Button onClick={retry}><RefreshCw className="h-4 w-4" />{t.retry}</Button></CardContent></Card>;
}
function DocumentTable({ rows, locale }: { rows: BillingDocument[]; locale: Locale }) {
  const t = dictionaries[locale];
  return <div className="overflow-hidden rounded-2xl border bg-background"><div className="overflow-x-auto"><Table className="min-w-[1200px]"><TableHeader><TableRow className="bg-muted/40"><TableHead>{t.documentNumber}</TableHead><TableHead>{t.documentType}</TableHead><TableHead>{t.company}</TableHead><TableHead>{t.subscription}</TableHead><TableHead>{t.amount}</TableHead><TableHead>{t.paid}</TableHead><TableHead>{t.balance}</TableHead><TableHead>{t.status}</TableHead><TableHead>{t.issueDate}</TableHead><TableHead className="text-center">{t.open}</TableHead></TableRow></TableHeader><TableBody>{rows.map((d) => <TableRow key={d.id}><TableCell><span className="font-mono text-xs font-semibold">{d.number}</span></TableCell><TableCell>{documentTypeLabel(d.type, locale)}</TableCell><TableCell><div className="max-w-[220px]"><div className="truncate font-semibold">{d.companyName}</div><div className="truncate text-xs text-muted-foreground">{d.companyCode || `#${d.companyId || "—"}`}</div></div></TableCell><TableCell><div className="max-w-[180px]"><div className="truncate font-medium">{d.planName}</div><div className="font-mono text-xs text-muted-foreground">#{d.subscriptionId || "—"}</div></div></TableCell><TableCell><Money amount={d.total} currency={d.currency} /></TableCell><TableCell><Money amount={d.paid} currency={d.currency} /></TableCell><TableCell><Money amount={d.balance} currency={d.currency} /></TableCell><TableCell><StatusBadge value={d.status} /></TableCell><TableCell><span dir="ltr" className="text-xs tabular-nums">{formatDate(d.issueDate)}</span></TableCell><TableCell className="text-center"><Button asChild variant="outline" size="sm" className="h-8 rounded-lg"><Link href={`/system/invoices/${d.id}`}><ExternalLink className="h-3.5 w-3.5" />{t.open}</Link></Button></TableCell></TableRow>)}</TableBody></Table></div></div>;
}
function Register({ documents, mode, locale }: { documents: BillingDocument[]; mode: "overview" | "invoices" | "receipts"; locale: Locale }) {
  const t = dictionaries[locale];
  const scoped = React.useMemo(() => mode === "invoices" ? documents.filter((d) => d.type === "SUBSCRIPTION_INVOICE") : mode === "receipts" ? documents.filter((d) => d.type === "PAYMENT_RECEIPT") : documents, [documents, mode]);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [company, setCompany] = React.useState("all");
  const [subscription, setSubscription] = React.useState("all");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [sort, setSort] = React.useState("newest");
  const statuses = React.useMemo(() => [...new Set(scoped.map((d) => d.status))].filter(Boolean).sort(), [scoped]);
  const companies = React.useMemo(() => [...new Map(scoped.filter((d) => d.companyId).map((d) => [d.companyId, d.companyName])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [scoped]);
  const subscriptions = React.useMemo(() => [...new Map(scoped.filter((d) => d.subscriptionId).map((d) => [d.subscriptionId, `${d.planName} #${d.subscriptionId}`])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [scoped]);
  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    const result = scoped.filter((d) => {
      const hay = [d.number, d.companyName, d.companyCode, d.subscriptionId, d.planName, d.billingReference, d.transactionReference, d.paymentMethod, d.relatedInvoiceNumber].join(" ").toLowerCase();
      if (needle && !hay.includes(needle)) return false;
      if (status !== "all" && d.status !== status) return false;
      if (company !== "all" && d.companyId !== company) return false;
      if (subscription !== "all" && d.subscriptionId !== subscription) return false;
      if (fromDate && d.issueDate && d.issueDate < fromDate) return false;
      if (toDate && d.issueDate && d.issueDate > toDate) return false;
      return true;
    });
    return [...result].sort((a, b) => sort === "oldest" ? dateValue(a.issuedAt ?? a.issueDate) - dateValue(b.issuedAt ?? b.issueDate) : sort === "number" ? a.number.localeCompare(b.number) : sort === "company" ? a.companyName.localeCompare(b.companyName) : dateValue(b.issuedAt ?? b.issueDate) - dateValue(a.issuedAt ?? a.issueDate));
  }, [company, fromDate, scoped, search, sort, status, subscription, toDate]);
  const stats = React.useMemo(() => ({ total: filtered.length, invoices: filtered.filter((d) => d.type === "SUBSCRIPTION_INVOICE").length, receipts: filtered.filter((d) => d.type === "PAYMENT_RECEIPT").length, amount: filtered.reduce((sum, d) => sum + numeric(d.total), 0) }), [filtered]);
  function reset() { setSearch(""); setStatus("all"); setCompany("all"); setSubscription("all"); setFromDate(""); setToDate(""); setSort("newest"); }
  function exportExcel() {
    if (!filtered.length) return;
    const esc = (v: unknown) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const trs = filtered.map((d) => `<tr><td>${esc(d.number)}</td><td>${esc(d.type)}</td><td>${esc(d.companyName)}</td><td>${esc(d.subscriptionId)}</td><td>${esc(d.planName)}</td><td>${esc(d.total)}</td><td>${esc(d.paid)}</td><td>${esc(d.balance)}</td><td>${esc(d.currency)}</td><td>${esc(d.status)}</td><td>${esc(d.billingReference)}</td><td>${esc(d.transactionReference)}</td><td>${esc(d.issueDate)}</td></tr>`).join("");
    const html = `<table border="1"><thead><tr><th>Document</th><th>Type</th><th>Company</th><th>Subscription</th><th>Plan</th><th>Total</th><th>Paid</th><th>Balance</th><th>Currency</th><th>Status</th><th>Billing reference</th><th>Transaction reference</th><th>Issue date</th></tr></thead><tbody>${trs}</tbody></table>`;
    const blob = new Blob([`\ufeff${html}`], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Mhamcloud-platform-billing-${new Date().toISOString().slice(0, 10)}.xls`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  return <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Kpi title={t.totalDocuments} value={stats.total} /><Kpi title={t.invoiceCount} value={stats.invoices} /><Kpi title={t.receiptCount} value={stats.receipts} /><Kpi title={t.totalAmount} value={<Money amount={String(stats.amount)} currency="SAR" />} /></div><Card className="rounded-2xl shadow-sm"><CardContent className="space-y-3 pt-6"><div className="flex flex-col gap-3 xl:flex-row xl:items-center"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} className="h-10 rounded-xl ps-9" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="h-10 rounded-xl xl:w-[150px]"><SelectValue placeholder={t.status} /></SelectTrigger><SelectContent><SelectItem value="all">{t.all}</SelectItem>{statuses.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><Select value={company} onValueChange={setCompany}><SelectTrigger className="h-10 rounded-xl xl:w-[200px]"><SelectValue placeholder={t.company} /></SelectTrigger><SelectContent><SelectItem value="all">{t.all}</SelectItem>{companies.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select><Select value={subscription} onValueChange={setSubscription}><SelectTrigger className="h-10 rounded-xl xl:w-[210px]"><SelectValue placeholder={t.subscription} /></SelectTrigger><SelectContent><SelectItem value="all">{t.all}</SelectItem>{subscriptions.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select></div><div className="flex flex-wrap gap-2"><Popover><PopoverTrigger asChild><Button variant="outline" className="h-10 rounded-xl"><CalendarDays className="h-4 w-4" />{t.from}: {fromDate || "—"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={parseIsoDate(fromDate)} onSelect={(d) => setFromDate(isoDate(d))} /></PopoverContent></Popover><Popover><PopoverTrigger asChild><Button variant="outline" className="h-10 rounded-xl"><CalendarDays className="h-4 w-4" />{t.to}: {toDate || "—"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={parseIsoDate(toDate)} onSelect={(d) => setToDate(isoDate(d))} /></PopoverContent></Popover><Select value={sort} onValueChange={setSort}><SelectTrigger className="h-10 w-[170px] rounded-xl"><ArrowUpDown className="h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">{t.newest}</SelectItem><SelectItem value="oldest">{t.oldest}</SelectItem><SelectItem value="number">{t.numberSort}</SelectItem><SelectItem value="company">{t.companySort}</SelectItem></SelectContent></Select><Button variant="outline" onClick={reset} className="h-10 rounded-xl"><RotateCcw className="h-4 w-4" />{t.reset}</Button><Button variant="outline" onClick={exportExcel} className="h-10 rounded-xl" disabled={!filtered.length}><FileSpreadsheet className="h-4 w-4" />{t.export}</Button><Button variant="outline" onClick={() => window.print()} className="h-10 rounded-xl" disabled={!filtered.length}><Printer className="h-4 w-4" />{t.print}</Button></div></CardContent></Card><Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>{mode === "invoices" ? t.invoicesTitle : mode === "receipts" ? t.receiptsTitle : t.title}</CardTitle><CardDescription>{filtered.length} / {scoped.length}</CardDescription></CardHeader><CardContent>{filtered.length ? <DocumentTable rows={filtered} locale={locale} /> : <div className="py-16 text-center text-sm text-muted-foreground"><Search className="mx-auto mb-3 h-7 w-7" />{scoped.length ? t.noResults : t.noData}</div>}</CardContent></Card></>;
}
function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border bg-background p-4"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-1 break-words text-sm font-medium">{children}</div></div>;
}
function safeSnapshotValue(snapshot: Row, ...keys: string[]) {
  for (const key of keys) { const value = text(snapshot[key]); if (value) return value; }
  return "—";
}
function SnapshotCard({ title, snapshot, locale }: { title: string; snapshot: Row; locale: Locale }) {
  const t = dictionaries[locale];
  return <Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{t.safeSnapshot}</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2"><KeyValue label={locale === "ar" ? "الاسم" : "Name"}>{safeSnapshotValue(snapshot, "name", "company_name", "legal_name", "commercial_name", "plan_name", "title")}</KeyValue><KeyValue label={t.taxNumber}>{safeSnapshotValue(snapshot, "tax_number", "vat_number", "tax_registration_number")}</KeyValue><KeyValue label={t.commercialRegistration}>{safeSnapshotValue(snapshot, "commercial_registration", "cr_number")}</KeyValue><KeyValue label={t.email}>{safeSnapshotValue(snapshot, "email")}</KeyValue><KeyValue label={t.city}>{safeSnapshotValue(snapshot, "city")}</KeyValue><KeyValue label={t.billingCycle}>{safeSnapshotValue(snapshot, "billing_cycle", "cycle")}</KeyValue></CardContent></Card>;
}
function Detail({ document, receipts, locale }: { document: BillingDocument; receipts: BillingDocument[]; locale: Locale }) {
  const t = dictionaries[locale];
  const previewUrl = apiUrl(`${API}${encodeURIComponent(document.id)}/print/`);
  const openBackend = (suffix: "print" | "pdf") => window.open(apiUrl(`${API}${encodeURIComponent(document.id)}/${suffix}/`), "_blank", "noopener,noreferrer");
  return <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Kpi title={t.documentNumber} value={document.number} /><Kpi title={t.status} value={<StatusBadge value={document.status} />} /><Kpi title={t.documentType} value={documentTypeLabel(document.type, locale)} /><Kpi title={t.total} value={<Money amount={document.total} currency={document.currency} />} /></div><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-6"><Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>{t.identity}</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><KeyValue label={t.documentNumber}><span className="font-mono text-xs">{document.number}</span></KeyValue><KeyValue label={t.issueDate}><span dir="ltr">{formatDate(document.issueDate)}</span></KeyValue><KeyValue label={t.paidAt}><span dir="ltr">{formatDate(document.paidAt, true)}</span></KeyValue><KeyValue label={t.paymentMethod}>{paymentMethodLabel(document.paymentMethod, locale)}</KeyValue><KeyValue label={t.billingReference}>{document.billingReference || "—"}</KeyValue><KeyValue label={t.transactionReference}>{document.transactionReference || "—"}</KeyValue>{document.cancelledAt ? <KeyValue label={t.cancelledAt}><span dir="ltr">{formatDate(document.cancelledAt, true)}</span></KeyValue> : null}{document.cancellationReason ? <KeyValue label={t.cancellationReason}>{document.cancellationReason}</KeyValue> : null}{document.notes ? <KeyValue label={t.notes}>{document.notes}</KeyValue> : null}</CardContent></Card><Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>{t.financials}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[[t.subtotal, document.subtotal], [t.discount, document.discount], [t.taxable, document.taxable], [t.tax, document.tax], [t.total, document.total], [t.paid, document.paid], [t.balance, document.balance]].map(([label, amount]) => <KeyValue key={label} label={label}><Money amount={amount} currency={document.currency} /></KeyValue>)}</CardContent></Card><div className="grid gap-6 xl:grid-cols-2"><SnapshotCard title={t.seller} snapshot={document.seller} locale={locale} /><SnapshotCard title={t.buyer} snapshot={document.buyer} locale={locale} /></div><Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>{t.immutable}</CardTitle><CardDescription>{t.safeSnapshot}</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><KeyValue label={t.plan}>{safeSnapshotValue(document.planSnapshot, "name", "plan_name", "title")}</KeyValue><KeyValue label={t.billingCycle}>{safeSnapshotValue(document.subscriptionSnapshot, "billing_cycle", "cycle")}</KeyValue><KeyValue label={t.action}>{safeSnapshotValue(document.subscriptionSnapshot, "action", "subscription_action")}</KeyValue><KeyValue label={t.billingReference}>{safeSnapshotValue(document.subscriptionSnapshot, "billing_reference", "reference")}</KeyValue></CardContent></Card>{document.type === "SUBSCRIPTION_INVOICE" ? <Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>{t.linkedReceipts}</CardTitle><CardDescription>{receipts.length}</CardDescription></CardHeader><CardContent>{receipts.length ? <DocumentTable rows={receipts} locale={locale} /> : <p className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">{t.none}</p>}</CardContent></Card> : null}<Card className="overflow-hidden rounded-2xl shadow-sm"><CardHeader><CardTitle>{t.printable}</CardTitle><CardDescription>{t.printableDesc}</CardDescription></CardHeader><CardContent>{document.allowedPrint || document.printable ? <iframe title={`${t.printable} ${document.number}`} src={previewUrl} className="h-[760px] w-full rounded-2xl border bg-white" /> : <div className="rounded-2xl border bg-muted/20 p-8 text-center text-sm text-muted-foreground">{t.previewUnavailable}</div>}</CardContent></Card></div><aside className="space-y-6"><Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>{t.links}</CardTitle></CardHeader><CardContent className="grid gap-2">{document.companyId ? <Button asChild variant="outline" className="justify-start"><Link href={`/system/companies/${document.companyId}`}><Building2 className="h-4 w-4" />{document.companyName}</Link></Button> : null}{document.subscriptionId ? <Button asChild variant="outline" className="justify-start"><Link href={`/system/subscriptions/${document.subscriptionId}`}><ShieldCheck className="h-4 w-4" />{t.subscription} #{document.subscriptionId}</Link></Button> : null}{document.relatedInvoiceId ? <Button asChild variant="outline" className="justify-start"><Link href={`/system/invoices/${document.relatedInvoiceId}`}><FileText className="h-4 w-4" />{document.relatedInvoiceNumber || `#${document.relatedInvoiceId}`}</Link></Button> : null}<Button asChild variant="outline" className="justify-start"><Link href="/system/platform-payments/list"><CreditCard className="h-4 w-4" />{t.payments}</Link></Button></CardContent></Card><Card className="rounded-2xl border-primary/20 shadow-sm"><CardHeader><CardTitle>{t.printable}</CardTitle></CardHeader><CardContent className="grid gap-2"><Button variant="outline" className="justify-start" disabled={!document.allowedPrint} onClick={() => openBackend("print")}><Printer className="h-4 w-4" />{t.print}</Button><Button variant="outline" className="justify-start" disabled={!document.allowedPrint} onClick={() => openBackend("pdf")}><Download className="h-4 w-4" />{t.pdf}</Button></CardContent></Card><Card className="rounded-2xl shadow-sm xl:sticky xl:top-6"><CardContent className="grid gap-2 pt-6"><Button asChild variant="outline" className="justify-start"><Link href="/system/invoices/list"><ListChecks className="h-4 w-4" />{t.invoices}</Link></Button><Button asChild variant="outline" className="justify-start"><Link href="/system/invoices/receipts"><ReceiptText className="h-4 w-4" />{t.receipts}</Link></Button><Button asChild variant="outline" className="justify-start"><Link href="/system"><LayoutDashboard className="h-4 w-4" />{t.dashboard}</Link></Button></CardContent></Card></aside></div></>;
}
export function PlatformBillingDocumentsClient({ mode }: { mode: PlatformBillingDocumentsMode }) {
  const params = useParams();
  const documentId = React.useMemo(() => { const raw = params?.id; return Array.isArray(raw) ? raw[0] || "" : text(raw); }, [params]);
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [documents, setDocuments] = React.useState<BillingDocument[]>([]);
  const [currentDocument, setCurrentDocument] = React.useState<BillingDocument | null>(null);
  const [receipts, setReceipts] = React.useState<BillingDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    const sync = () => { const next = getLocale(); setLocale(next); document.documentElement.lang = next; document.documentElement.dir = next === "ar" ? "rtl" : "ltr"; document.body.dir = next === "ar" ? "rtl" : "ltr"; };
    sync(); window.addEventListener("storage", sync); window.addEventListener("primey-locale-changed", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("primey-locale-changed", sync); };
  }, []);
  const load = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true); setError("");
      if (mode === "detail") {
        if (!documentId) throw new Error("Missing billing document id.");
        const current = await fetchDocument(documentId); setCurrentDocument(current.document); setReceipts(current.receipts);
      } else {
        setDocuments(await fetchDocuments());
      }
      if (silent) toast.success(dictionaries[locale].refreshed);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : dictionaries[locale].loadError;
      setError(message); if (silent) toast.error(message);
    } finally { setLoading(false); setRefreshing(false); }
  }, [documentId, locale, mode]);
  React.useEffect(() => { void load(false); }, [load]);
  const dir = locale === "ar" ? "rtl" : "ltr";
  return <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8"><div className="w-full space-y-6">{loading ? <Loading /> : error ? <ErrorCard message={error} retry={() => void load(true)} locale={locale} /> : <><Header mode={mode} locale={locale} refreshing={refreshing} refresh={() => void load(true)} />{mode === "detail" ? currentDocument ? <Detail document={currentDocument} receipts={receipts} locale={locale} /> : <Card className="rounded-2xl"><CardContent className="py-16 text-center text-muted-foreground"><CircleAlert className="mx-auto mb-3 h-7 w-7" />{dictionaries[locale].noData}</CardContent></Card> : <Register documents={documents} mode={mode} locale={locale} />}</>}</div></main>;
}