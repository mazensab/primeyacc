"use client";

/* ============================================================
   📂 primey_frontend/app/system/payments/create/page.tsx
   💳 Primey Care — Create Payment
   ------------------------------------------------------------
   ✅ Same approved Customers / Invoices / Payments visual pattern
   ✅ Main form + sidebar summary
   ✅ Create payment from invoice / order / customer / manual
   ✅ Real API only
   ✅ No localhost
   ✅ No fake data
   ✅ Local draft protection
   ✅ Field validation
   ✅ sonner toast
   ✅ SAR icon from /currency/sar.svg
   ✅ RTL/LTR via primey-locale
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  ShoppingCart,
  TriangleAlert,
  User,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type PaymentSource = "invoice" | "order" | "customer" | "manual";
type PaymentStatus = "pending" | "paid";
type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "gateway"
  | "credit_card"
  | "debit_card"
  | "apple_pay"
  | "stc_pay"
  | "tamara"
  | "tabby"
  | "wallet";

type CustomerOption = {
  id: number;
  name: string;
  phone: string;
  email: string;
  code: string;
};

type InvoiceOption = {
  id: number;
  invoice_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
};

type OrderOption = {
  id: number;
  order_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
  status: string;
  payment_status: string;
  product_name: string;
};

type FormState = {
  source: PaymentSource;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  customer_id: string;
  invoice_id: string;
  order_id: string;
  amount: string;
  paid_amount: string;
  external_reference: string;
  transaction_id: string;
  payment_date: string;
  notes: string;
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  item?: unknown;
  payment?: unknown;
  id?: number;
};

const SAR_ICON = "/currency/sar.svg";
const DRAFT_KEY = "primey-care.payment-create.draft";

const translations = {
  ar: {
    title: "إضافة دفعة",
    subtitle: "تسجيل دفعة مرتبطة بفاتورة أو طلب أو عميل مع دعم الترحيل لاحقًا.",
    back: "رجوع",
    refresh: "تحديث",
    saveDraft: "حفظ مسودة",
    clear: "مسح",
    submit: "حفظ الدفعة",
    submitAndConfirm: "حفظ وتأكيد",
    saving: "جاري الحفظ",
    source: "مصدر الدفعة",
    fromInvoice: "من فاتورة",
    fromOrder: "من طلب",
    fromCustomer: "من عميل",
    manual: "يدوي",
    basicInfo: "البيانات الأساسية",
    paymentInfo: "بيانات الدفع",
    customer: "العميل",
    invoice: "الفاتورة",
    order: "الطلب",
    paymentMethod: "طريقة الدفع",
    paymentStatus: "حالة الدفعة",
    pending: "بانتظار",
    paid: "مدفوعة",
    amount: "المبلغ",
    paidAmount: "المبلغ المحصل",
    paymentDate: "تاريخ الدفع",
    externalReference: "مرجع خارجي",
    transactionId: "رقم العملية",
    notes: "ملاحظات",
    chooseCustomer: "اختر العميل",
    chooseInvoice: "اختر الفاتورة",
    chooseOrder: "اختر الطلب",
    chooseMethod: "اختر طريقة الدفع",
    cash: "نقدي",
    bankTransfer: "تحويل بنكي",
    gateway: "بوابة دفع",
    creditCard: "بطاقة ائتمان",
    debitCard: "مدى / بطاقة",
    applePay: "Apple Pay",
    stcPay: "STC Pay",
    tamara: "تمارا",
    tabby: "تابي",
    wallet: "محفظة",
    searchCustomer: "بحث في العملاء",
    searchInvoice: "بحث في الفواتير",
    searchOrder: "بحث في الطلبات",
    noCustomers: "لا يوجد عملاء",
    noInvoices: "لا توجد فواتير",
    noOrders: "لا توجد طلبات",
    summary: "ملخص الدفعة",
    selectedCustomer: "العميل المحدد",
    selectedInvoice: "الفاتورة المحددة",
    selectedOrder: "الطلب المحدد",
    noCustomer: "لم يتم اختيار عميل",
    noInvoice: "لم يتم اختيار فاتورة",
    noOrder: "لم يتم اختيار طلب",
    invoiceDue: "متبقي الفاتورة",
    orderRemaining: "متبقي الطلب",
    expectedAmount: "المبلغ المتوقع",
    netCollected: "صافي التحصيل",
    statusAfterSave: "الحالة بعد الحفظ",
    requiredCustomer: "اختر العميل.",
    requiredInvoice: "اختر الفاتورة.",
    requiredOrder: "اختر الطلب.",
    requiredAmount: "أدخل مبلغًا صحيحًا أكبر من صفر.",
    saved: "تم إنشاء الدفعة بنجاح.",
    draftSaved: "تم حفظ المسودة محليًا.",
    draftLoaded: "تم استعادة المسودة.",
    cleared: "تم مسح النموذج.",
    errorTitle: "تعذر تنفيذ العملية",
    loadError: "تعذر تحميل البيانات.",
    submitError: "تعذر إنشاء الدفعة.",
    confirmClear: "هل تريد مسح النموذج الحالي؟",
    unsaved: "لديك تغييرات غير محفوظة.",
    viewPayment: "فتح الدفعة",
    createAnother: "إنشاء دفعة أخرى",
  },
  en: {
    title: "Add Payment",
    subtitle: "Record a payment linked to an invoice, order, customer, or manual entry.",
    back: "Back",
    refresh: "Refresh",
    saveDraft: "Save draft",
    clear: "Clear",
    submit: "Save payment",
    submitAndConfirm: "Save & Confirm",
    saving: "Saving",
    source: "Payment source",
    fromInvoice: "From invoice",
    fromOrder: "From order",
    fromCustomer: "From customer",
    manual: "Manual",
    basicInfo: "Basic info",
    paymentInfo: "Payment info",
    customer: "Customer",
    invoice: "Invoice",
    order: "Order",
    paymentMethod: "Payment method",
    paymentStatus: "Payment status",
    pending: "Pending",
    paid: "Paid",
    amount: "Amount",
    paidAmount: "Collected amount",
    paymentDate: "Payment date",
    externalReference: "External reference",
    transactionId: "Transaction ID",
    notes: "Notes",
    chooseCustomer: "Choose customer",
    chooseInvoice: "Choose invoice",
    chooseOrder: "Choose order",
    chooseMethod: "Choose payment method",
    cash: "Cash",
    bankTransfer: "Bank transfer",
    gateway: "Gateway",
    creditCard: "Credit card",
    debitCard: "Debit card",
    applePay: "Apple Pay",
    stcPay: "STC Pay",
    tamara: "Tamara",
    tabby: "Tabby",
    wallet: "Wallet",
    searchCustomer: "Search customers",
    searchInvoice: "Search invoices",
    searchOrder: "Search orders",
    noCustomers: "No customers",
    noInvoices: "No invoices",
    noOrders: "No orders",
    summary: "Payment summary",
    selectedCustomer: "Selected customer",
    selectedInvoice: "Selected invoice",
    selectedOrder: "Selected order",
    noCustomer: "No customer selected",
    noInvoice: "No invoice selected",
    noOrder: "No order selected",
    invoiceDue: "Invoice due",
    orderRemaining: "Order remaining",
    expectedAmount: "Expected amount",
    netCollected: "Net collected",
    statusAfterSave: "Status after save",
    requiredCustomer: "Choose a customer.",
    requiredInvoice: "Choose an invoice.",
    requiredOrder: "Choose an order.",
    requiredAmount: "Enter a valid amount greater than zero.",
    saved: "Payment created successfully.",
    draftSaved: "Draft saved locally.",
    draftLoaded: "Draft restored.",
    cleared: "Form cleared.",
    errorTitle: "Unable to complete operation",
    loadError: "Unable to load data.",
    submitError: "Unable to create payment.",
    confirmClear: "Do you want to clear the current form?",
    unsaved: "You have unsaved changes.",
    viewPayment: "Open payment",
    createAnother: "Create another payment",
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).trim();
  return cleaned || fallback;
}

function toEnglishDigits(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(toEnglishDigits(value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          ""
        ).replace(/\/+$/, "")
      : "";

  if (envBase.endsWith("/api")) {
    return envBase.slice(0, -4);
  }

  return envBase;
}

function makeApiUrl(path: string, params?: URLSearchParams) {
  const base = getApiBaseUrl();
  const query = params?.toString();

  return `${base}${path}${query ? `?${query}` : ""}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

async function fetchJson<T>(
  url: string,
  options?: {
    signal?: AbortSignal;
    method?: "GET" | "POST";
    body?: unknown;
  },
): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    method: options?.method || "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal: options?.signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options?.method === "POST" ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method === "POST"
        ? JSON.stringify(options.body || {})
        : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let payload: any = null;

  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.detail ||
      payload?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

function extractList(payload: unknown): unknown[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  const candidates = [
    data.items,
    data.results,
    root.items,
    root.results,
    data.invoices,
    root.invoices,
    data.orders,
    root.orders,
    data.customers,
    root.customers,
  ];

  for (const candidate of candidates) {
    const list = asArray(candidate);
    if (list.length) return list;
  }

  return [];
}

function extractCreatedId(payload: unknown): number | null {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  const candidates = [
    data.id,
    asRecord(data.payment).id,
    asRecord(data.item).id,
    root.id,
    asRecord(root.payment).id,
    asRecord(root.item).id,
  ];

  for (const candidate of candidates) {
    const id = toNumber(candidate);
    if (id > 0) return id;
  }

  return null;
}

function normalizeCustomer(value: unknown): CustomerOption {
  const item = asRecord(value);

  return {
    id: toNumber(item.id),
    name: normalizeText(
      item.name || item.display_name || item.full_name || item.customer_name,
      `#${normalizeText(item.id)}`,
    ),
    phone: normalizeText(
      item.phone ||
        item.phone_number ||
        item.mobile ||
        item.whatsapp_number ||
        item.primary_contact_number,
    ),
    email: normalizeText(item.email),
    code: normalizeText(item.customer_code || item.code),
  };
}

function normalizeInvoice(value: unknown): InvoiceOption {
  const item = asRecord(value);
  const customer = asRecord(item.customer);

  return {
    id: toNumber(item.id),
    invoice_number: normalizeText(
      item.invoice_number || item.number || item.reference,
      `INV-${normalizeText(item.id)}`,
    ),
    customer_id:
      item.customer_id === null || item.customer_id === undefined
        ? toNumber(customer.id)
        : toNumber(item.customer_id),
    customer_name: normalizeText(
      item.customer_name ||
        customer.name ||
        customer.display_name ||
        customer.full_name,
    ),
    customer_phone: normalizeText(
      item.customer_phone ||
        customer.phone ||
        customer.phone_number ||
        customer.mobile ||
        customer.whatsapp_number,
    ),
    total_amount: toNumber(item.total_amount),
    paid_amount: toNumber(item.paid_amount),
    due_amount: toNumber(item.due_amount),
    status: normalizeText(item.status),
  };
}

function normalizeOrder(value: unknown): OrderOption {
  const item = asRecord(value);
  const customer = asRecord(item.customer);

  return {
    id: toNumber(item.id),
    order_number: normalizeText(
      item.order_number || item.number || item.code,
      `ORD-${normalizeText(item.id)}`,
    ),
    customer_id:
      item.customer_id === null || item.customer_id === undefined
        ? toNumber(customer.id)
        : toNumber(item.customer_id),
    customer_name: normalizeText(
      item.customer_name ||
        customer.name ||
        customer.display_name ||
        customer.full_name,
    ),
    customer_phone: normalizeText(
      item.customer_phone ||
        customer.phone ||
        customer.phone_number ||
        customer.mobile ||
        customer.whatsapp_number,
    ),
    total_amount: toNumber(item.total_amount),
    amount_paid: toNumber(item.amount_paid || item.paid_amount),
    remaining_amount: toNumber(item.remaining_amount || item.due_amount),
    status: normalizeText(item.status),
    payment_status: normalizeText(item.payment_status),
    product_name: normalizeText(item.product_name || asRecord(item.product).name || item.title),
  };
}

function createInitialForm(): FormState {
  return {
    source: "invoice",
    status: "pending",
    payment_method: "cash",
    customer_id: "",
    invoice_id: "",
    order_id: "",
    amount: "0",
    paid_amount: "0",
    external_reference: "",
    transaction_id: "",
    payment_date: todayIso(),
    notes: "",
  };
}

function paymentMethodLabel(method: PaymentMethod, locale: Locale) {
  const t = translations[locale];

  const labels: Record<PaymentMethod, string> = {
    cash: t.cash,
    bank_transfer: t.bankTransfer,
    gateway: t.gateway,
    credit_card: t.creditCard,
    debit_card: t.debitCard,
    apple_pay: t.applePay,
    stc_pay: t.stcPay,
    tamara: t.tamara,
    tabby: t.tabby,
    wallet: t.wallet,
  };

  return labels[method];
}

function SarIcon({ className }: { className?: string }) {
  return (
    <Image
      src={SAR_ICON}
      alt="SAR"
      width={14}
      height={14}
      className={cn("inline-block h-3.5 w-3.5 object-contain", className)}
      unoptimized
    />
  );
}

function MoneyValue({ value }: { value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums text-foreground">
      <span>{formatMoney(value)}</span>
      <SarIcon />
    </span>
  );
}

function KpiCard({
  title,
  value,
  trend,
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[112px] px-6 py-5">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>

        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          {value}
        </CardTitle>

        <CardAction>
          <Badge
            variant="outline"
            className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {trend}
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-left text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

export default function SystemPaymentCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<FormState>(() => createInitialForm());
  const [customers, setCustomers] = React.useState<CustomerOption[]>([]);
  const [invoices, setInvoices] = React.useState<InvoiceOption[]>([]);
  const [orders, setOrders] = React.useState<OrderOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<false | "pending" | "paid">(false);
  const [error, setError] = React.useState("");
  const [dirty, setDirty] = React.useState(false);
  const [createdId, setCreatedId] = React.useState<number | null>(null);

  const [customerSearch, setCustomerSearch] = React.useState("");
  const [invoiceSearch, setInvoiceSearch] = React.useState("");
  const [orderSearch, setOrderSearch] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const selectedCustomer = React.useMemo(() => {
    return customers.find((customer) => String(customer.id) === form.customer_id) || null;
  }, [customers, form.customer_id]);

  const selectedInvoice = React.useMemo(() => {
    return invoices.find((invoice) => String(invoice.id) === form.invoice_id) || null;
  }, [form.invoice_id, invoices]);

  const selectedOrder = React.useMemo(() => {
    return orders.find((order) => String(order.id) === form.order_id) || null;
  }, [form.order_id, orders]);

  const amount = React.useMemo(() => toNumber(form.amount), [form.amount]);
  const paidAmount = React.useMemo(() => toNumber(form.paid_amount), [form.paid_amount]);
  const expectedAmount = React.useMemo(() => {
    if (form.source === "invoice" && selectedInvoice) return selectedInvoice.due_amount;
    if (form.source === "order" && selectedOrder) return selectedOrder.remaining_amount;
    return amount;
  }, [amount, form.source, selectedInvoice, selectedOrder]);

  const filteredCustomers = React.useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email, customer.code]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [customerSearch, customers]);

  const filteredInvoices = React.useMemo(() => {
    const query = invoiceSearch.trim().toLowerCase();
    if (!query) return invoices;

    return invoices.filter((invoice) =>
      [
        invoice.invoice_number,
        invoice.customer_name,
        invoice.customer_phone,
        invoice.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [invoiceSearch, invoices]);

  const filteredOrders = React.useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) =>
      [
        order.order_number,
        order.customer_name,
        order.customer_phone,
        order.product_name,
        order.status,
        order.payment_status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [orderSearch, orders]);

  React.useEffect(() => {
    const applyLocale = () => setLocale(getInitialLocale());

    applyLocale();

    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  React.useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty || saving) return;

      event.preventDefault();
      event.returnValue = t.unsaved;
    };

    window.addEventListener("beforeunload", handler);

    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saving, t.unsaved]);

  const loadLookups = React.useCallback(async () => {
    const controller = new AbortController();

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: "1",
        page_size: "500",
      });

      const [customersPayload, invoicesPayload, ordersPayload] = await Promise.all([
        fetchJson<unknown>(makeApiUrl("/api/customers/", params), {
          signal: controller.signal,
        }),
        fetchJson<unknown>(makeApiUrl("/api/invoices/", params), {
          signal: controller.signal,
        }),
        fetchJson<unknown>(makeApiUrl("/api/orders/", params), {
          signal: controller.signal,
        }),
      ]);

      const nextCustomers = extractList(customersPayload)
        .map(normalizeCustomer)
        .filter((item) => item.id > 0);

      const nextInvoices = extractList(invoicesPayload)
        .map(normalizeInvoice)
        .filter((item) => item.id > 0);

      const nextOrders = extractList(ordersPayload)
        .map(normalizeOrder)
        .filter((item) => item.id > 0);

      setCustomers(nextCustomers);
      setInvoices(nextInvoices);
      setOrders(nextOrders);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.loadError;

      setError(message);
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [t.loadError]);

  React.useEffect(() => {
    void loadLookups();

    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as FormState;
        if (parsed && parsed.payment_method && parsed.source) {
          setForm(parsed);
          setDirty(true);
          toast.success(t.draftLoaded);
          return;
        }
      }
    } catch {
      // ignore invalid drafts
    }

    const invoiceId = searchParams.get("invoice_id") || searchParams.get("invoice");
    const orderId = searchParams.get("order_id") || searchParams.get("order");
    const customerId = searchParams.get("customer_id") || searchParams.get("customer");

    if (invoiceId) {
      setForm((current) => ({
        ...current,
        source: "invoice",
        invoice_id: invoiceId,
      }));
      setDirty(true);
      return;
    }

    if (orderId) {
      setForm((current) => ({
        ...current,
        source: "order",
        order_id: orderId,
      }));
      setDirty(true);
      return;
    }

    if (customerId) {
      setForm((current) => ({
        ...current,
        source: "customer",
        customer_id: customerId,
      }));
      setDirty(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!selectedInvoice) return;

    setForm((current) => {
      if (current.source !== "invoice") return current;

      return {
        ...current,
        customer_id: selectedInvoice.customer_id ? String(selectedInvoice.customer_id) : current.customer_id,
        amount: String(selectedInvoice.due_amount || selectedInvoice.total_amount || current.amount),
        paid_amount: current.status === "paid"
          ? String(selectedInvoice.due_amount || selectedInvoice.total_amount || current.paid_amount)
          : current.paid_amount,
      };
    });
  }, [selectedInvoice]);

  React.useEffect(() => {
    if (!selectedOrder) return;

    setForm((current) => {
      if (current.source !== "order") return current;

      return {
        ...current,
        customer_id: selectedOrder.customer_id ? String(selectedOrder.customer_id) : current.customer_id,
        amount: String(selectedOrder.remaining_amount || selectedOrder.total_amount || current.amount),
        paid_amount: current.status === "paid"
          ? String(selectedOrder.remaining_amount || selectedOrder.total_amount || current.paid_amount)
          : current.paid_amount,
      };
    });
  }, [selectedOrder]);

  function updateForm<T extends keyof FormState>(key: T, value: FormState[T]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setDirty(true);
  }

  function handleSourceChange(source: PaymentSource) {
    setForm((current) => ({
      ...current,
      source,
      invoice_id: source === "invoice" ? current.invoice_id : "",
      order_id: source === "order" ? current.order_id : "",
    }));
    setDirty(true);
  }

  function handleStatusChange(status: PaymentStatus) {
    setForm((current) => ({
      ...current,
      status,
      paid_amount: status === "paid" ? String(toNumber(current.amount)) : current.paid_amount,
    }));
    setDirty(true);
  }

  function handleInvoiceSelect(invoiceId: string) {
    const invoice = invoices.find((item) => String(item.id) === invoiceId);

    setForm((current) => ({
      ...current,
      source: "invoice",
      invoice_id: invoiceId,
      order_id: "",
      customer_id: invoice?.customer_id ? String(invoice.customer_id) : current.customer_id,
      amount: invoice ? String(invoice.due_amount || invoice.total_amount) : current.amount,
      paid_amount: current.status === "paid" && invoice
        ? String(invoice.due_amount || invoice.total_amount)
        : current.paid_amount,
    }));

    setDirty(true);
  }

  function handleOrderSelect(orderId: string) {
    const order = orders.find((item) => String(item.id) === orderId);

    setForm((current) => ({
      ...current,
      source: "order",
      order_id: orderId,
      invoice_id: "",
      customer_id: order?.customer_id ? String(order.customer_id) : current.customer_id,
      amount: order ? String(order.remaining_amount || order.total_amount) : current.amount,
      paid_amount: current.status === "paid" && order
        ? String(order.remaining_amount || order.total_amount)
        : current.paid_amount,
    }));

    setDirty(true);
  }

  function saveDraft() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    setDirty(false);
    toast.success(t.draftSaved);
  }

  function clearForm() {
    if (!window.confirm(t.confirmClear)) return;

    setForm(createInitialForm());
    setDirty(false);
    setCreatedId(null);
    window.localStorage.removeItem(DRAFT_KEY);
    toast.success(t.cleared);
  }

  function validate(nextStatus: PaymentStatus) {
    if (form.source === "invoice" && !form.invoice_id) {
      toast.error(t.requiredInvoice);
      return false;
    }

    if (form.source === "order" && !form.order_id) {
      toast.error(t.requiredOrder);
      return false;
    }

    if (form.source !== "manual" && !form.customer_id) {
      toast.error(t.requiredCustomer);
      return false;
    }

    if (toNumber(form.amount) <= 0) {
      toast.error(t.requiredAmount);
      return false;
    }

    if (nextStatus === "paid" && toNumber(form.paid_amount) <= 0) {
      toast.error(t.requiredAmount);
      return false;
    }

    return true;
  }

  function buildPayload(nextStatus: PaymentStatus) {
    const nextAmount = toNumber(form.amount);
    const nextPaidAmount = nextStatus === "paid" ? toNumber(form.paid_amount || form.amount) : toNumber(form.paid_amount);

    return {
      payment_method: form.payment_method,
      method: form.payment_method,
      status: nextStatus,
      customer_id: form.customer_id ? toNumber(form.customer_id) : null,
      invoice_id: form.source === "invoice" && form.invoice_id ? toNumber(form.invoice_id) : null,
      order_id: form.source === "order" && form.order_id ? toNumber(form.order_id) : null,
      amount: nextAmount.toFixed(2),
      paid_amount: nextPaidAmount.toFixed(2),
      external_reference: form.external_reference.trim(),
      transaction_id: form.transaction_id.trim(),
      paid_at: nextStatus === "paid" ? form.payment_date : null,
      initiated_at: form.payment_date || todayIso(),
      notes: form.notes.trim(),
      currency: "SAR",
      auto_create_treasury_movement: nextStatus === "paid",
      auto_post_accounting: nextStatus === "paid",
    };
  }

  async function submitPayment(nextStatus: PaymentStatus) {
    if (!validate(nextStatus)) return;

    setSaving(nextStatus);
    setError("");

    try {
      const payload = buildPayload(nextStatus);

      const response = await fetchJson<ApiResponse>(makeApiUrl("/api/payments/create/"), {
        method: "POST",
        body: payload,
      });

      const paymentId = extractCreatedId(response);

      setCreatedId(paymentId);
      setDirty(false);
      window.localStorage.removeItem(DRAFT_KEY);
      toast.success(t.saved);

      if (paymentId) {
        router.push(`/system/payments/${paymentId}`);
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.submitError;

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="space-y-4 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-right">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={() => void loadLookups()}>
            <RefreshCw className="h-4 w-4" />
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={saveDraft}>
            <Save className="h-4 w-4" />
            {t.saveDraft}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={clearForm}>
            <RotateCcw className="h-4 w-4" />
            {t.clear}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-4 text-right">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">{t.errorTitle}</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard title={t.amount} value={<MoneyValue value={amount} />} trend={t.amount} />
            <KpiCard title={t.paidAmount} value={<MoneyValue value={paidAmount} />} trend={t.paid} />
            <KpiCard title={t.expectedAmount} value={<MoneyValue value={expectedAmount} />} trend={t.expectedAmount} />
            <KpiCard title={t.netCollected} value={<MoneyValue value={paidAmount} />} trend={paymentMethodLabel(form.payment_method, locale)} />
          </div>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.basicInfo}</CardTitle>
                <CardDescription>{t.source}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <FieldLabel>{t.source}</FieldLabel>
                  <Select value={form.source} onValueChange={(value) => handleSourceChange(value as PaymentSource)}>
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">{t.fromInvoice}</SelectItem>
                      <SelectItem value="order">{t.fromOrder}</SelectItem>
                      <SelectItem value="customer">{t.fromCustomer}</SelectItem>
                      <SelectItem value="manual">{t.manual}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.paymentMethod}</FieldLabel>
                  <Select
                    value={form.payment_method}
                    onValueChange={(value) => updateForm("payment_method", value as PaymentMethod)}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue placeholder={t.chooseMethod} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{t.cash}</SelectItem>
                      <SelectItem value="bank_transfer">{t.bankTransfer}</SelectItem>
                      <SelectItem value="gateway">{t.gateway}</SelectItem>
                      <SelectItem value="credit_card">{t.creditCard}</SelectItem>
                      <SelectItem value="debit_card">{t.debitCard}</SelectItem>
                      <SelectItem value="apple_pay">{t.applePay}</SelectItem>
                      <SelectItem value="stc_pay">{t.stcPay}</SelectItem>
                      <SelectItem value="tamara">{t.tamara}</SelectItem>
                      <SelectItem value="tabby">{t.tabby}</SelectItem>
                      <SelectItem value="wallet">{t.wallet}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.paymentStatus}</FieldLabel>
                  <Select value={form.status} onValueChange={(value) => handleStatusChange(value as PaymentStatus)}>
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t.pending}</SelectItem>
                      <SelectItem value="paid">{t.paid}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.paymentDate}</FieldLabel>
                  <div className="relative">
                    <CalendarDays className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="date"
                      value={form.payment_date}
                      onChange={(event) => updateForm("payment_date", event.target.value)}
                      className="h-10 rounded-lg bg-background pr-9"
                    />
                  </div>
                </div>

                {form.source === "invoice" ? (
                  <div className="space-y-2 md:col-span-2 xl:col-span-4">
                    <FieldLabel>{t.invoice}</FieldLabel>
                    <Select value={form.invoice_id || undefined} onValueChange={handleInvoiceSelect}>
                      <SelectTrigger className="h-10 rounded-lg bg-background">
                        <SelectValue placeholder={t.chooseInvoice} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[360px]">
                        <div className="p-2">
                          <Input
                            value={invoiceSearch}
                            onChange={(event) => setInvoiceSearch(event.target.value)}
                            placeholder={t.searchInvoice}
                            className="h-9"
                          />
                        </div>
                        {filteredInvoices.length ? (
                          filteredInvoices.map((invoice) => (
                            <SelectItem key={invoice.id} value={String(invoice.id)}>
                              {invoice.invoice_number} — {invoice.customer_name || invoice.customer_phone || "—"} —{" "}
                              {formatMoney(invoice.due_amount)}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">{t.noInvoices}</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {form.source === "order" ? (
                  <div className="space-y-2 md:col-span-2 xl:col-span-4">
                    <FieldLabel>{t.order}</FieldLabel>
                    <Select value={form.order_id || undefined} onValueChange={handleOrderSelect}>
                      <SelectTrigger className="h-10 rounded-lg bg-background">
                        <SelectValue placeholder={t.chooseOrder} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[360px]">
                        <div className="p-2">
                          <Input
                            value={orderSearch}
                            onChange={(event) => setOrderSearch(event.target.value)}
                            placeholder={t.searchOrder}
                            className="h-9"
                          />
                        </div>
                        {filteredOrders.length ? (
                          filteredOrders.map((order) => (
                            <SelectItem key={order.id} value={String(order.id)}>
                              {order.order_number} — {order.customer_name || order.customer_phone || "—"} —{" "}
                              {formatMoney(order.remaining_amount || order.total_amount)}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">{t.noOrders}</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {form.source !== "manual" ? (
                  <div className="space-y-2 md:col-span-2 xl:col-span-4">
                    <FieldLabel>{t.customer}</FieldLabel>
                    <Select
                      value={form.customer_id || undefined}
                      onValueChange={(value) => updateForm("customer_id", value)}
                    >
                      <SelectTrigger className="h-10 rounded-lg bg-background">
                        <SelectValue placeholder={t.chooseCustomer} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[320px]">
                        <div className="p-2">
                          <Input
                            value={customerSearch}
                            onChange={(event) => setCustomerSearch(event.target.value)}
                            placeholder={t.searchCustomer}
                            className="h-9"
                          />
                        </div>
                        {filteredCustomers.length ? (
                          filteredCustomers.map((customer) => (
                            <SelectItem key={customer.id} value={String(customer.id)}>
                              {customer.name} {customer.phone ? `- ${customer.phone}` : ""}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">{t.noCustomers}</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.paymentInfo}</CardTitle>
                <CardDescription>{paymentMethodLabel(form.payment_method, locale)}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <FieldLabel>{t.amount}</FieldLabel>
                  <Input
                    value={form.amount}
                    inputMode="decimal"
                    onChange={(event) => updateForm("amount", toEnglishDigits(event.target.value))}
                    className="h-10 rounded-lg bg-background text-right tabular-nums"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.paidAmount}</FieldLabel>
                  <Input
                    value={form.paid_amount}
                    inputMode="decimal"
                    onChange={(event) => updateForm("paid_amount", toEnglishDigits(event.target.value))}
                    className="h-10 rounded-lg bg-background text-right tabular-nums"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.externalReference}</FieldLabel>
                  <Input
                    value={form.external_reference}
                    onChange={(event) => updateForm("external_reference", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.externalReference}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.transactionId}</FieldLabel>
                  <Input
                    value={form.transaction_id}
                    onChange={(event) => updateForm("transaction_id", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    placeholder={t.transactionId}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.notes}</FieldLabel>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  className="min-h-[110px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder={t.notes}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{t.summary}</CardTitle>
                  <CardDescription>{t.netCollected}</CardDescription>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                  <WalletCards className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 px-6 pb-6">
              <InfoRow label={t.selectedCustomer} value={selectedCustomer?.name || t.noCustomer} />
              <InfoRow label={t.selectedInvoice} value={selectedInvoice?.invoice_number || t.noInvoice} />
              <InfoRow label={t.selectedOrder} value={selectedOrder?.order_number || t.noOrder} />
              <InfoRow label={t.expectedAmount} value={<MoneyValue value={expectedAmount} />} />
              <InfoRow label={t.amount} value={<MoneyValue value={amount} />} />
              <InfoRow label={t.paidAmount} value={<MoneyValue value={paidAmount} />} />
              <InfoRow label={t.netCollected} value={<MoneyValue value={paidAmount} />} />
              <InfoRow label={t.statusAfterSave} value={form.status === "paid" ? t.paid : t.pending} />

              <div className="grid gap-2 pt-4">
                <Button
                  className="h-10 rounded-lg bg-black text-white hover:bg-black/90"
                  disabled={Boolean(saving)}
                  onClick={() => void submitPayment(form.status)}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t.submit}
                </Button>

                <Button
                  variant="outline"
                  className="h-10 rounded-lg bg-background"
                  disabled={Boolean(saving)}
                  onClick={() => void submitPayment("paid")}
                >
                  {saving === "paid" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {t.submitAndConfirm}
                </Button>

                {createdId ? (
                  <Button asChild variant="outline" className="h-10 rounded-lg bg-background">
                    <Link href={`/system/payments/${createdId}`}>
                      <FileText className="h-4 w-4" />
                      {t.viewPayment}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedCustomer?.name || t.noCustomer}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedCustomer?.phone || selectedCustomer?.email || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <ReceiptText className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedInvoice?.invoice_number || t.noInvoice}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedInvoice ? `${t.invoiceDue}: ${formatMoney(selectedInvoice.due_amount)}` : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedOrder?.order_number || t.noOrder}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedOrder ? `${t.orderRemaining}: ${formatMoney(selectedOrder.remaining_amount)}` : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{paymentMethodLabel(form.payment_method, locale)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatMoney(amount)} SAR
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.statusAfterSave}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.status === "paid" ? t.paid : t.pending}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}