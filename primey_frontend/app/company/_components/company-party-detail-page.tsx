"use client";
/* ============================================================
   📂 primey_frontend/app/company/_components/company-party-detail-page.tsx
   👥 Mhamcloud — Company Party Detail
   ------------------------------------------------------------
   ✅ Approved Premium company detail pattern
   ✅ Real API only
   ✅ Customer/Supplier detail pages
   ✅ Identity + contact + financial + national address cards
   ✅ Invoices/Bills, payments, and statement sections
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
  Building2,
  CalendarDays,
  ChevronLeft,
  CircleAlert,
  CircleDollarSign,
  CreditCard,
  ExternalLink,
  FileText,
  Hash,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Printer,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  TriangleAlert,
  UserRound,
  Users,
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
type PartyKind = "customer" | "supplier";
type ApiRecord = Record<string, unknown>;
type PartyDetailRecord = {
  id: string;
  kind: PartyKind;
  code: string;
  displayName: string;
  legalName: string;
  partyKind: "INDIVIDUAL" | "ORGANIZATION";
  status: "active" | "inactive";
  contactPerson: string;
  phone: string;
  mobile: string;
  whatsapp: string;
  email: string;
  taxNumber: string;
  commercialRegistration: string;
  city: string;
  district: string;
  street: string;
  buildingNumber: string;
  additionalNumber: string;
  postalCode: string;
  shortAddress: string;
  addressLine: string;
  creditLimit: string;
  openingBalance: string;
  balance: string;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
};
type RelatedRow = {
  id: string;
  number: string;
  date: string | null;
  status: string;
  amount: string;
  description: string;
  href: string;
};
const translations = {
  ar: {
    badge: "وحدة العملاء والموردين",
    customerTitle: "تفاصيل العميل",
    supplierTitle: "تفاصيل المورد",
    customerSubtitle: "ملف العميل التشغيلي مع بيانات التواصل، الأرصدة، الفواتير، الدفعات، وكشف الحساب.",
    supplierSubtitle: "ملف المورد التشغيلي مع بيانات التواصل، الأرصدة، الفواتير، الدفعات، وكشف الحساب.",
    backCustomers: "العودة للعملاء",
    backSuppliers: "العودة للموردين",
    refresh: "تحديث",
    print: "طباعة",
    refreshed: "تم تحديث البيانات.",
    identity: "بيانات التعريف",
    identityDesc: "اسم العمل، الكود، نوع الطرف، والحالة.",
    contact: "بيانات التواصل",
    contactDesc: "الجوال، البريد، وشخص التواصل.",
    finance: "البيانات المالية",
    financeDesc: "الرصيد، الرصيد الافتتاحي، وحد الائتمان.",
    nationalAddress: "العنوان الوطني",
    nationalAddressDesc: "بيانات العنوان الوطني للمنشآت.",
    quickLinks: "اختصارات",
    quickLinksDesc: "تنقل سريع للعمليات المرتبطة.",
    invoices: "الفواتير",
    bills: "فواتير المشتريات",
    invoicesDesc: "آخر المستندات المرتبطة بهذا الطرف.",
    payments: "الدفعات",
    paymentsDesc: "آخر سندات القبض أو الصرف المرتبطة.",
    statement: "كشف الحساب",
    statementDesc: "حركات الطرف المالية حسب البيانات المتاحة.",
    noRows: "لا توجد سجلات حالياً.",
    code: "الكود",
    businessName: "اسم العمل",
    legalName: "الاسم القانوني",
    partyKind: "الصفة",
    individual: "فرد",
    organization: "منشأة",
    status: "الحالة",
    active: "نشط",
    inactive: "معطل",
    contactPerson: "شخص التواصل",
    phone: "الهاتف",
    mobile: "الجوال",
    whatsapp: "واتساب",
    email: "البريد الإلكتروني",
    taxNumber: "الرقم الضريبي",
    commercialRegistration: "السجل التجاري",
    city: "المدينة",
    district: "الحي",
    street: "الشارع",
    buildingNumber: "رقم المبنى",
    additionalNumber: "الرقم الإضافي",
    postalCode: "الرمز البريدي",
    shortAddress: "العنوان المختصر",
    addressLine: "العنوان",
    creditLimit: "حد الائتمان",
    openingBalance: "الرصيد الافتتاحي",
    balance: "الرصيد",
    notes: "ملاحظات",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    document: "المستند",
    date: "التاريخ",
    amount: "المبلغ",
    description: "الوصف",
    open: "فتح",
    salesInvoices: "فواتير المبيعات",
    purchaseBills: "فواتير المشتريات",
    receiptVouchers: "سندات القبض",
    paymentVouchers: "سندات الصرف",
    ledger: "دفتر الأستاذ",
    notAvailable: "غير متوفر",
    errorTitle: "تعذر تحميل التفاصيل",
    errorDesc: "تأكد من صلاحية الدخول ومن توفر السجل ثم أعد المحاولة.",
    emptyTitle: "لم يتم العثور على السجل",
    emptyDesc: "لا يوجد عميل أو مورد مطابق لهذا الرابط.",
    tryAgain: "إعادة المحاولة",
  },
  en: {
    badge: "Customers and suppliers",
    customerTitle: "Customer details",
    supplierTitle: "Supplier details",
    customerSubtitle: "Customer operational profile with contact, balances, invoices, payments, and statement.",
    supplierSubtitle: "Supplier operational profile with contact, balances, bills, payments, and statement.",
    backCustomers: "Back to customers",
    backSuppliers: "Back to suppliers",
    refresh: "Refresh",
    print: "Print",
    refreshed: "Details refreshed.",
    identity: "Identity",
    identityDesc: "Business name, code, party type, and status.",
    contact: "Contact details",
    contactDesc: "Mobile, email, and contact person.",
    finance: "Financial details",
    financeDesc: "Balance, opening balance, and credit limit.",
    nationalAddress: "National address",
    nationalAddressDesc: "National address data for organizations.",
    quickLinks: "Quick links",
    quickLinksDesc: "Quick navigation for related operations.",
    invoices: "Invoices",
    bills: "Purchase bills",
    invoicesDesc: "Latest documents linked to this party.",
    payments: "Payments",
    paymentsDesc: "Latest receipt or payment vouchers.",
    statement: "Account statement",
    statementDesc: "Financial movements for this party when available.",
    noRows: "No records currently.",
    code: "Code",
    businessName: "Business name",
    legalName: "Legal name",
    partyKind: "Type",
    individual: "Individual",
    organization: "Organization",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    contactPerson: "Contact person",
    phone: "Phone",
    mobile: "Mobile",
    whatsapp: "WhatsApp",
    email: "Email",
    taxNumber: "VAT number",
    commercialRegistration: "Commercial registration",
    city: "City",
    district: "District",
    street: "Street",
    buildingNumber: "Building number",
    additionalNumber: "Additional number",
    postalCode: "Postal code",
    shortAddress: "Short address",
    addressLine: "Address",
    creditLimit: "Credit limit",
    openingBalance: "Opening balance",
    balance: "Balance",
    notes: "Notes",
    createdAt: "Created at",
    updatedAt: "Updated at",
    document: "Document",
    date: "Date",
    amount: "Amount",
    description: "Description",
    open: "Open",
    salesInvoices: "Sales invoices",
    purchaseBills: "Purchase bills",
    receiptVouchers: "Receipt vouchers",
    paymentVouchers: "Payment vouchers",
    ledger: "Ledger",
    notAvailable: "Not available",
    errorTitle: "Could not load details",
    errorDesc: "Check access and record availability, then try again.",
    emptyTitle: "Record not found",
    emptyDesc: "No matching customer or supplier was found for this link.",
    tryAgain: "Try again",
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
function normalizeStatus(value: unknown): "active" | "inactive" {
  if (typeof value === "boolean") return value ? "active" : "inactive";
  const text = normalizeText(value, "active").toUpperCase();
  if (["INACTIVE", "DISABLED", "SUSPENDED", "BLOCKED", "FALSE"].includes(text)) return "inactive";
  return "active";
}
function statusLabel(value: "active" | "inactive", locale: Locale) {
  return translations[locale][value];
}
function statusClass(value: "active" | "inactive") {
  return value === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
}
function StatusBadge({ value, locale }: { value: "active" | "inactive"; locale: Locale }) {
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 text-xs", statusClass(value))}>
      {statusLabel(value, locale)}
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
    record.party,
    record.customer,
    record.supplier,
    record.item,
    record.record,
    record.object,
    data.party,
    data.customer,
    data.supplier,
    data.item,
    data.record,
    data.object,
    result.party,
    result.customer,
    result.supplier,
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
function normalizeParty(payload: unknown, kind: PartyKind): PartyDetailRecord {
  const record = extractObject(payload);
  const address = asRecord(record.address);
  const cityRecord = asRecord(record.city);
  return {
    id: normalizeText(record.id || record.uuid || record.pk),
    kind,
    code: normalizeText(record.code || record.party_code || record.number, "—"),
    displayName: normalizeText(record.display_name || record.name || record.title || record.legal_name, "—"),
    legalName: normalizeText(record.legal_name || record.name_ar || record.name_en || record.display_name),
    partyKind: normalizeText(record.party_kind || record.kind || record.type).toUpperCase().includes("ORG")
      ? "ORGANIZATION"
      : "INDIVIDUAL",
    status: normalizeStatus(record.status ?? record.is_active),
    contactPerson: normalizeText(record.contact_person || record.contact_name),
    phone: normalizeText(record.phone || record.telephone),
    mobile: normalizeText(record.mobile || record.mobile_number || record.phone),
    whatsapp: normalizeText(record.whatsapp_number || record.whatsapp || record.mobile),
    email: normalizeText(record.email || record.email_address),
    taxNumber: normalizeText(record.tax_number || record.vat_number || record.trn || record.tax_id),
    commercialRegistration: normalizeText(record.commercial_registration || record.commercialRegistration || record.cr_number),
    city: normalizeText(record.city || record.city_name || cityRecord.name || cityRecord.name_ar || address.city),
    district: normalizeText(record.district || address.district),
    street: normalizeText(record.street || address.street),
    buildingNumber: normalizeText(record.building_number || address.building_number),
    additionalNumber: normalizeText(record.additional_number || address.additional_number),
    postalCode: normalizeText(record.postal_code || address.postal_code),
    shortAddress: normalizeText(record.short_address || address.short_address),
    addressLine: normalizeText(record.address_line || record.address || address.address_line),
    creditLimit: normalizeText(record.credit_limit || record.limit, "0.00"),
    openingBalance: normalizeText(record.opening_balance, "0.00"),
    balance: normalizeText(record.balance || record.current_balance || record.account_balance, "0.00"),
    notes: normalizeText(record.notes || record.description),
    createdAt: normalizeText(record.created_at || record.created) || null,
    updatedAt: normalizeText(record.updated_at || record.modified_at || record.updated) || null,
  };
}
function normalizeRelatedRow(value: unknown, hrefBase = ""): RelatedRow {
  const record = asRecord(value);
  const id = normalizeText(record.id || record.uuid || record.pk);
  const number = normalizeText(
    record.number ||
      record.document_number ||
      record.invoice_number ||
      record.bill_number ||
      record.voucher_number ||
      record.reference ||
      id,
    "—",
  );
  return {
    id,
    number,
    date: normalizeText(record.date || record.issue_date || record.posting_date || record.created_at) || null,
    status: normalizeText(record.status || record.state, "—"),
    amount: normalizeText(record.total_amount || record.amount || record.net_amount || record.paid_amount || "0.00"),
    description: normalizeText(record.description || record.notes || record.memo || record.party_name),
    href: id && hrefBase ? `${hrefBase}/${encodeURIComponent(id)}` : "",
  };
}
async function fetchFirstCollection(urls: string[], hrefBase = "") {
  for (const url of urls) {
    try {
      const payload = await fetchJson<unknown>(makeApiUrl(url));
      const rows = extractArray(payload).map((item) => normalizeRelatedRow(item, hrefBase));
      if (rows.length) return rows;
    } catch {
      // Try the next real endpoint variant.
    }
  }
  return [];
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
          <CardTitle className="mt-2 truncate text-lg font-bold tracking-tight">
            {value}
          </CardTitle>
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
            <ReceiptText className="h-5 w-5 text-muted-foreground" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge variant="outline" className="w-fit rounded-full">{rows.length}</Badge>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="overflow-x-auto rounded-2xl border bg-background">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="px-4 py-3 text-start text-xs">{t.document}</TableHead>
                  <TableHead className="px-4 py-3 text-start text-xs">{t.date}</TableHead>
                  <TableHead className="px-4 py-3 text-start text-xs">{t.status}</TableHead>
                  <TableHead className="px-4 py-3 text-start text-xs">{t.amount}</TableHead>
                  <TableHead className="px-4 py-3 text-start text-xs">{t.description}</TableHead>
                  <TableHead className="px-4 py-3 text-center text-xs">{t.open}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.id}-${row.number}`}>
                    <TableCell className="px-4 py-3 font-medium">{row.number}</TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">{formatDate(row.date)}</TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">{row.status || "—"}</TableCell>
                    <TableCell className="px-4 py-3"><MoneyValue value={row.amount} /></TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">{row.description || "—"}</TableCell>
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
export function CompanyPartyDetailPage({ kind }: { kind: PartyKind }) {
  const params = useParams();
  const id = React.useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] || "" : String(value || "");
  }, [params]);
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [party, setParty] = React.useState<PartyDetailRecord | null>(null);
  const [documents, setDocuments] = React.useState<RelatedRow[]>([]);
  const [payments, setPayments] = React.useState<RelatedRow[]>([]);
  const [ledgerRows, setLedgerRows] = React.useState<RelatedRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ChevronLeft : ArrowRight;
  const isCustomer = kind === "customer";
  const listHref = isCustomer ? "/company/customers" : "/company/suppliers";
  const endpoint = isCustomer ? "customers" : "suppliers";
  const title = isCustomer ? t.customerTitle : t.supplierTitle;
  const subtitle = isCustomer ? t.customerSubtitle : t.supplierSubtitle;
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
  const loadParty = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!id) {
        setParty(null);
        setLoading(false);
        return;
      }
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        let payload: unknown;
        try {
          payload = await fetchJson<unknown>(makeApiUrl(`/api/company/${endpoint}/${encodeURIComponent(id)}/`));
        } catch {
          const listPayload = await fetchJson<unknown>(makeApiUrl(`/api/company/${endpoint}/?page_size=200`));
          const match = extractArray(listPayload).find((item) => {
            const record = asRecord(item);
            return String(record.id || record.uuid || record.pk || "") === String(id);
          });
          payload = match || {};
        }
        const normalized = normalizeParty(payload, kind);
        if (!normalized.id && !normalized.displayName) {
          setParty(null);
        } else {
          setParty(normalized);
        }
        const docs = isCustomer
          ? await fetchFirstCollection(
              [
                `/api/company/sales/invoices/?customer_id=${encodeURIComponent(id)}&page_size=50`,
                `/api/company/sales/invoices/?party_id=${encodeURIComponent(id)}&page_size=50`,
              ],
              "/company/sales/invoices",
            )
          : await fetchFirstCollection(
              [
                `/api/company/purchases/bills/?supplier_id=${encodeURIComponent(id)}&page_size=50`,
                `/api/company/purchases/bills/?party_id=${encodeURIComponent(id)}&page_size=50`,
              ],
              "/company/purchases/bills",
            );
        const paymentRows = isCustomer
          ? await fetchFirstCollection(
              [
                `/api/company/treasury/receipt-vouchers/?party_id=${encodeURIComponent(id)}&page_size=50`,
                `/api/company/treasury/customer-payments/?customer_id=${encodeURIComponent(id)}&page_size=50`,
              ],
              "/company/treasury/receipt-vouchers",
            )
          : await fetchFirstCollection(
              [
                `/api/company/treasury/payment-vouchers/?party_id=${encodeURIComponent(id)}&page_size=50`,
                `/api/company/treasury/supplier-payments/?supplier_id=${encodeURIComponent(id)}&page_size=50`,
              ],
              "/company/treasury/payment-vouchers",
            );
        const ledger = await fetchFirstCollection(
          [
            `/api/company/accounting/ledger/?party_id=${encodeURIComponent(id)}&page_size=50`,
            `/api/company/accounting/ledger/?counterparty_id=${encodeURIComponent(id)}&page_size=50`,
          ],
          "/company/accounting/ledger",
        );
        setDocuments(docs);
        setPayments(paymentRows);
        setLedgerRows(ledger.length ? ledger : [...docs, ...paymentRows]);
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
    [endpoint, id, isCustomer, kind, t.errorDesc, t.refreshed],
  );
  React.useEffect(() => {
    void loadParty();
  }, [loadParty]);
  function fallback(value: string | null | undefined) {
    return normalizeText(value, t.notAvailable);
  }
  function openPrintWindow() {
    window.print();
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
            <Button onClick={() => void loadParty({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  if (!party) {
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
              <Link href={listHref}>
                <BackIcon className="h-4 w-4" />
                {isCustomer ? t.backCustomers : t.backSuppliers}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  const isOrganization = party.partyKind === "ORGANIZATION";
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
                    {party.displayName || title}
                  </h1>
                  <StatusBadge value={party.status} locale={locale} />
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href={listHref}>
                    <BackIcon className="h-4 w-4" />
                    {isCustomer ? t.backCustomers : t.backSuppliers}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadParty({ silent: true })}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={openPrintWindow}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard title={t.status} value={<StatusBadge value={party.status} locale={locale} />} description={t.identity} icon={ShieldCheck} />
          <InfoCard title={t.balance} value={<MoneyValue value={party.balance} />} description={t.finance} icon={Landmark} />
          <InfoCard title={t.creditLimit} value={<MoneyValue value={party.creditLimit} />} description={t.finance} icon={CircleDollarSign} />
          <InfoCard title={t.createdAt} value={formatDate(party.createdAt)} description={t.identity} icon={CalendarDays} />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.identity}</CardTitle>
                <CardDescription>{t.identityDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <DetailRow label={t.businessName} value={fallback(party.displayName)} icon={Store} />
                <DetailRow label={t.code} value={fallback(party.code)} icon={Hash} />
                <DetailRow label={t.legalName} value={fallback(party.legalName)} icon={Building2} />
                <DetailRow label={t.partyKind} value={isOrganization ? t.organization : t.individual} icon={Users} />
                {isOrganization ? (
                  <>
                    <DetailRow label={t.taxNumber} value={fallback(party.taxNumber)} icon={BadgeCheck} />
                    <DetailRow label={t.commercialRegistration} value={fallback(party.commercialRegistration)} icon={Hash} />
                  </>
                ) : null}
                <DetailRow label={t.updatedAt} value={formatDate(party.updatedAt)} icon={CalendarDays} />
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.contact}</CardTitle>
                <CardDescription>{t.contactDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <DetailRow label={t.contactPerson} value={fallback(party.contactPerson)} icon={UserRound} />
                <DetailRow label={t.mobile} value={fallback(party.mobile)} icon={Phone} />
                <DetailRow label={t.phone} value={fallback(party.phone)} icon={Phone} />
                <DetailRow label={t.whatsapp} value={fallback(party.whatsapp)} icon={Phone} />
                <DetailRow label={t.email} value={fallback(party.email)} icon={Mail} />
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.finance}</CardTitle>
                <CardDescription>{t.financeDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <DetailRow label={t.balance} value={<MoneyValue value={party.balance} />} icon={Landmark} />
                <DetailRow label={t.openingBalance} value={<MoneyValue value={party.openingBalance} />} icon={ReceiptText} />
                <DetailRow label={t.creditLimit} value={<MoneyValue value={party.creditLimit} />} icon={CircleDollarSign} />
              </CardContent>
            </Card>
            {isOrganization ? (
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>{t.nationalAddress}</CardTitle>
                  <CardDescription>{t.nationalAddressDesc}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <DetailRow label={t.city} value={fallback(party.city)} icon={MapPin} />
                  <DetailRow label={t.district} value={fallback(party.district)} icon={MapPin} />
                  <DetailRow label={t.street} value={fallback(party.street)} icon={MapPin} />
                  <DetailRow label={t.buildingNumber} value={fallback(party.buildingNumber)} icon={Hash} />
                  <DetailRow label={t.additionalNumber} value={fallback(party.additionalNumber)} icon={Hash} />
                  <DetailRow label={t.postalCode} value={fallback(party.postalCode)} icon={Hash} />
                  <DetailRow label={t.shortAddress} value={fallback(party.shortAddress)} icon={MapPin} />
                  <DetailRow label={t.addressLine} value={fallback(party.addressLine)} icon={MapPin} />
                </CardContent>
              </Card>
            ) : null}
            <RelatedTable
              title={isCustomer ? t.invoices : t.bills}
              description={t.invoicesDesc}
              rows={documents}
              locale={locale}
              emptyText={t.noRows}
            />
            <RelatedTable
              title={t.payments}
              description={t.paymentsDesc}
              rows={payments}
              locale={locale}
              emptyText={t.noRows}
            />
            <RelatedTable
              title={t.statement}
              description={t.statementDesc}
              rows={ledgerRows}
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
                  <Link href={isCustomer ? "/company/sales/invoices" : "/company/purchases/bills"}>
                    <FileText className="h-4 w-4" />
                    {isCustomer ? t.salesInvoices : t.purchaseBills}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href={isCustomer ? "/company/treasury/receipt-vouchers" : "/company/treasury/payment-vouchers"}>
                    <CreditCard className="h-4 w-4" />
                    {isCustomer ? t.receiptVouchers : t.paymentVouchers}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/company/accounting/ledger">
                    <Activity className="h-4 w-4" />
                    {t.ledger}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href={listHref}>
                    <Users className="h-4 w-4" />
                    {isCustomer ? t.backCustomers : t.backSuppliers}
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
