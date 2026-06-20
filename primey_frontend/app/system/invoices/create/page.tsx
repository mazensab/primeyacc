"use client";

/* ============================================================
   📂 primey_frontend/app/system/invoices/create/page.tsx
   🧾 Primey Care — Create Invoice
   ------------------------------------------------------------
   ✅ Same approved Customers / Invoices visual pattern
   ✅ Main form + sidebar summary
   ✅ Create from order or manual invoice
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
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Save,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  User,
} from "lucide-react";
import {
  toast
} from "sonner";

import {
  Badge
} from "@/components/ui/badge";
import {
  Button
} from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Checkbox
} from "@/components/ui/checkbox";
import {
  Input
} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Skeleton
} from "@/components/ui/skeleton";
import {
  Table,
} from "@/components/ui/table";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type InvoiceMode = "order" | "manual";
type InvoiceStatus = "draft" | "issued";
type InvoiceType = "sales" | "service" | "subscription" | "other";

type CustomerOption = {
  id: number;
  name: string;
  phone: string;
  email: string;
  code: string;
};

type OrderOption = {
  id: number;
  order_number: string;
  customer_id: number | null;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  payment_status: string;
  product_name: string;
};

type InvoiceLine = {
  local_id: string;
  title: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  tax_rate: string;
};

type FormState = {
  mode: InvoiceMode;
  invoice_type: InvoiceType;
  status: InvoiceStatus;
  customer_id: string;
  order_id: string;
  issue_date: string;
  due_date: string;
  notes: string;
  internal_notes: string;
  lines: InvoiceLine[];
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  item?: unknown;
  invoice?: unknown;
  id?: number;
};

const SAR_ICON = "/currency/sar.svg";
const DRAFT_KEY = "primey-care.invoice-create.draft";

const translations = {
  ar: {
    title: "إنشاء فاتورة",
    subtitle: "إنشاء فاتورة من طلب أو فاتورة يدوية مع بنود وحسابات مالية.",
    back: "رجوع",
    refresh: "تحديث",
    saveDraft: "حفظ مسودة",
    clear: "مسح",
    submit: "حفظ الفاتورة",
    submitAndIssue: "حفظ وإصدار",
    loading: "جاري التحميل",
    saving: "جاري الحفظ",
    invoiceInfo: "بيانات الفاتورة",
    customerInfo: "العميل والطلب",
    linesInfo: "بنود الفاتورة",
    notesInfo: "الملاحظات",
    summary: "ملخص الفاتورة",
    readiness: "جاهزية البيانات",
    mode: "نوع الإنشاء",
    fromOrder: "من طلب",
    manual: "يدوية",
    invoiceType: "نوع الفاتورة",
    status: "الحالة",
    draft: "مسودة",
    issued: "مصدر",
    sales: "مبيعات",
    service: "خدمة",
    subscription: "اشتراك",
    other: "أخرى",
    customer: "العميل",
    order: "الطلب",
    noOrder: "بدون طلب",
    selectCustomer: "اختر العميل",
    selectOrder: "اختر الطلب",
    issueDate: "تاريخ الإصدار",
    dueDate: "تاريخ الاستحقاق",
    notes: "ملاحظات",
    internalNotes: "ملاحظات داخلية",
    addLine: "إضافة بند",
    remove: "حذف",
    itemTitle: "البند",
    description: "الوصف",
    quantity: "الكمية",
    unitPrice: "سعر الوحدة",
    discount: "الخصم",
    taxRate: "الضريبة %",
    subtotal: "الإجمالي قبل الضريبة",
    tax: "الضريبة",
    grandTotal: "الإجمالي",
    linesCount: "عدد البنود",
    orderAmount: "قيمة الطلب",
    paidAmount: "المدفوع",
    remainingAmount: "المتبقي",
    complete: "مكتمل",
    incomplete: "غير مكتمل",
    noCustomers: "لا يوجد عملاء متاحون.",
    noOrders: "لا توجد طلبات متاحة.",
    emptyLinesTitle: "لا توجد بنود",
    emptyLinesDesc: "أضف بندًا واحدًا على الأقل لإكمال الفاتورة اليدوية.",
    requiredCustomer: "العميل مطلوب.",
    requiredOrder: "الطلب مطلوب عند إنشاء فاتورة من طلب.",
    requiredLines: "أضف بندًا واحدًا على الأقل.",
    invalidLine: "يوجد بند غير مكتمل.",
    saved: "تم إنشاء الفاتورة بنجاح.",
    draftSaved: "تم حفظ المسودة محليًا.",
    draftLoaded: "تم استعادة المسودة.",
    cleared: "تم مسح النموذج.",
    errorTitle: "تعذر تنفيذ العملية",
    submitError: "تعذر إنشاء الفاتورة.",
    loadError: "تعذر تحميل العملاء أو الطلبات.",
    confirmClear: "هل تريد مسح النموذج الحالي؟",
    unsaved: "لديك تغييرات غير محفوظة.",
    viewInvoice: "فتح الفاتورة",
    unknown: "غير محدد",
  },
  en: {
    title: "Create Invoice",
    subtitle: "Create an invoice from an order or manually with financial lines.",
    back: "Back",
    refresh: "Refresh",
    saveDraft: "Save draft",
    clear: "Clear",
    submit: "Save invoice",
    submitAndIssue: "Save and issue",
    loading: "Loading",
    saving: "Saving",
    invoiceInfo: "Invoice info",
    customerInfo: "Customer and order",
    linesInfo: "Invoice lines",
    notesInfo: "Notes",
    summary: "Invoice summary",
    readiness: "Data readiness",
    mode: "Creation mode",
    fromOrder: "From order",
    manual: "Manual",
    invoiceType: "Invoice type",
    status: "Status",
    draft: "Draft",
    issued: "Issued",
    sales: "Sales",
    service: "Service",
    subscription: "Subscription",
    other: "Other",
    customer: "Customer",
    order: "Order",
    noOrder: "No order",
    selectCustomer: "Select customer",
    selectOrder: "Select order",
    issueDate: "Issue date",
    dueDate: "Due date",
    notes: "Notes",
    internalNotes: "Internal notes",
    addLine: "Add line",
    remove: "Remove",
    itemTitle: "Item",
    description: "Description",
    quantity: "Quantity",
    unitPrice: "Unit price",
    discount: "Discount",
    taxRate: "Tax %",
    subtotal: "Subtotal",
    tax: "Tax",
    grandTotal: "Grand total",
    linesCount: "Lines count",
    orderAmount: "Order amount",
    paidAmount: "Paid",
    remainingAmount: "Remaining",
    complete: "Complete",
    incomplete: "Incomplete",
    noCustomers: "No customers available.",
    noOrders: "No orders available.",
    emptyLinesTitle: "No lines",
    emptyLinesDesc: "Add at least one line to complete a manual invoice.",
    requiredCustomer: "Customer is required.",
    requiredOrder: "Order is required when creating from order.",
    requiredLines: "Add at least one line.",
    invalidLine: "There is an incomplete line.",
    saved: "Invoice created successfully.",
    draftSaved: "Draft saved locally.",
    draftLoaded: "Draft restored.",
    cleared: "Form cleared.",
    errorTitle: "Unable to complete operation",
    submitError: "Unable to create invoice.",
    loadError: "Unable to load customers or orders.",
    confirmClear: "Do you want to clear the current form?",
    unsaved: "You have unsaved changes.",
    viewInvoice: "Open invoice",
    unknown: "Unknown",
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

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
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

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
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

  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
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

async function fetchJson<T>(
  url: string,
  options?: {
    method?: "GET" | "POST";
    body?: unknown;
    signal?: AbortSignal;
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

  if (Array.isArray(root.results)) return root.results;
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(root.data)) return root.data;

  return [];
}

function extractCreatedId(payload: unknown): number | null {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  const candidates = [
    data.id,
    asRecord(data.invoice).id,
    asRecord(data.item).id,
    root.id,
    asRecord(root.invoice).id,
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
    phone: normalizeText(item.phone || item.phone_number || item.mobile || item.whatsapp_number),
    email: normalizeText(item.email),
    code: normalizeText(item.customer_code || item.code),
  };
}

function normalizeOrder(value: unknown): OrderOption {
  const item = asRecord(value);
  const customer = asRecord(item.customer);
  const product = asRecord(item.product);

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
    paid_amount: toNumber(item.amount_paid || item.paid_amount),
    remaining_amount: toNumber(item.remaining_amount || item.due_amount),
    status: normalizeText(item.status),
    payment_status: normalizeText(item.payment_status),
    product_name: normalizeText(
      item.product_name ||
        product.name ||
        product.title ||
        product.name_ar ||
        product.name_en ||
        item.title,
    ),
  };
}

function createEmptyLine(): InvoiceLine {
  return {
    local_id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "",
    description: "",
    quantity: "1",
    unit_price: "0",
    discount_amount: "0",
    tax_rate: "15",
  };
}

function createInitialForm(): FormState {
  return {
    mode: "order",
    invoice_type: "sales",
    status: "draft",
    customer_id: "",
    order_id: "",
    issue_date: todayIso(),
    due_date: addDaysIso(14),
    notes: "",
    internal_notes: "",
    lines: [createEmptyLine()],
  };
}

function lineAmounts(line: InvoiceLine) {
  const quantity = Math.max(toNumber(line.quantity), 0);
  const unitPrice = Math.max(toNumber(line.unit_price), 0);
  const discount = Math.max(toNumber(line.discount_amount), 0);
  const taxRate = Math.max(toNumber(line.tax_rate), 0);

  const beforeTax = Math.max(quantity * unitPrice - discount, 0);
  const taxAmount = beforeTax * (taxRate / 100);
  const total = beforeTax + taxAmount;

  return {
    beforeTax,
    taxAmount,
    total,
  };
}

function invoiceTotals(lines: InvoiceLine[]) {
  return lines.reduce(
    (totals, line) => {
      const amounts = lineAmounts(line);

      return {
        subtotal: totals.subtotal + amounts.beforeTax,
        tax: totals.tax + amounts.taxAmount,
        total: totals.total + amounts.total,
      };
    },
    {
      subtotal: 0,
      tax: 0,
      total: 0,
    },
  );
}

function buildPayload(form: FormState) {
  return {
    invoice_type: form.invoice_type,
    status: form.status,
    customer_id: toNumber(form.customer_id) || null,
    order_id: form.mode === "order" ? toNumber(form.order_id) || null : null,
    issue_date: form.issue_date || null,
    due_date: form.due_date || null,
    notes: form.notes.trim(),
    internal_notes: form.internal_notes.trim(),
    lines:
      form.mode === "manual"
        ? form.lines.map((line) => ({
            title: line.title.trim(),
            description: line.description.trim(),
            quantity: toNumber(line.quantity).toFixed(2),
            unit_price: toNumber(line.unit_price).toFixed(2),
            discount_amount: toNumber(line.discount_amount).toFixed(2),
            tax_rate: toNumber(line.tax_rate).toFixed(2),
          }))
        : [],
  };
}

function SarIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <Image
      src={SAR_ICON}
      alt=""
      width={16}
      height={16}
      className={cn("inline-block h-3.5 w-3.5 shrink-0 object-contain", className)}
    />
  );
}

function MoneyValue({
  value,
}: {
  value: unknown;
}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums text-foreground">
      <span>{formatMoney(value)}</span>
      <SarIcon />
    </span>
  );
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

function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
  icon: React.ComponentType<{ className?: string }>;
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardAction>

        <div className="pt-1">
          <Badge
            variant="outline"
            className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {trend}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}

function FieldLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

export default function SystemInvoiceCreatePage() {
  const router = useRouter();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<FormState>(() => createInitialForm());
  const [customers, setCustomers] = React.useState<CustomerOption[]>([]);
  const [orders, setOrders] = React.useState<OrderOption[]>([]);

  const [initialLoading, setInitialLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState("");
  const [createdId, setCreatedId] = React.useState<number | null>(null);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const selectedCustomer = React.useMemo(
    () => customers.find((customer) => String(customer.id) === form.customer_id) || null,
    [customers, form.customer_id],
  );

  const selectedOrder = React.useMemo(
    () => orders.find((order) => String(order.id) === form.order_id) || null,
    [orders, form.order_id],
  );

  const orderFilteredOrders = React.useMemo(() => {
    if (!form.customer_id) return orders;

    return orders.filter((order) => !order.customer_id || String(order.customer_id) === form.customer_id);
  }, [form.customer_id, orders]);

  const totals = React.useMemo(() => invoiceTotals(form.lines), [form.lines]);

  const readinessComplete =
    Boolean(form.customer_id) &&
    (form.mode === "manual" ? form.lines.length > 0 : Boolean(form.order_id));

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

  React.useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty || saving) return;

      event.preventDefault();
      event.returnValue = t.unsaved;
    };

    window.addEventListener("beforeunload", handler);

    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, saving, t.unsaved]);

  const loadOptions = React.useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    const controller = new AbortController();

    try {
      if (!silent) setInitialLoading(true);

      setRefreshing(true);
      setError("");

      const customersParams = new URLSearchParams({
        page: "1",
        page_size: "500",
      });

      const ordersParams = new URLSearchParams({
        page: "1",
        page_size: "500",
      });

      const [customersPayload, ordersPayload] = await Promise.all([
        fetchJson<unknown>(makeApiUrl("/api/customers/", customersParams), {
          signal: controller.signal,
        }),
        fetchJson<unknown>(makeApiUrl("/api/orders/", ordersParams), {
          signal: controller.signal,
        }),
      ]);

      setCustomers(extractList(customersPayload).map(normalizeCustomer).filter((item) => item.id));
      setOrders(extractList(ordersPayload).map(normalizeOrder).filter((item) => item.id));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.loadError;

      setError(message);
      toast.error(message);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }

    return () => controller.abort();
  }, [t.loadError]);

  React.useEffect(() => {
    void loadOptions();

    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as FormState;

        if (parsed && Array.isArray(parsed.lines)) {
          setForm({
            ...createInitialForm(),
            ...parsed,
            lines: parsed.lines.map((line) => ({
              ...createEmptyLine(),
              ...line,
              local_id: line.local_id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            })),
          });
          setDirty(true);
          toast.success(t.draftLoaded);
        }
      }
    } catch {
      // ignore invalid drafts
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm<T extends keyof FormState>(key: T, value: FormState[T]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "customer_id" ? { order_id: "" } : {}),
      ...(key === "mode" ? { order_id: "" } : {}),
    }));

    setDirty(true);
  }

  function updateLine<T extends keyof InvoiceLine>(
    localId: string,
    key: T,
    value: InvoiceLine[T],
  ) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.local_id === localId ? { ...line, [key]: value } : line)),
    }));

    setDirty(true);
  }

  function addLine() {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, createEmptyLine()],
    }));

    setDirty(true);
  }

  function removeLine(localId: string) {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((line) => line.local_id !== localId),
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
    setError("");
    window.localStorage.removeItem(DRAFT_KEY);
    toast.success(t.cleared);
  }

  function validate() {
    if (!form.customer_id) {
      toast.error(t.requiredCustomer);
      return false;
    }

    if (form.mode === "order" && !form.order_id) {
      toast.error(t.requiredOrder);
      return false;
    }

    if (form.mode === "manual") {
      if (!form.lines.length) {
        toast.error(t.requiredLines);
        return false;
      }

      const invalid = form.lines.some((line) => {
        return !line.title.trim() || toNumber(line.quantity) <= 0 || toNumber(line.unit_price) < 0;
      });

      if (invalid) {
        toast.error(t.invalidLine);
        return false;
      }
    }

    return true;
  }

  async function submitInvoice(nextStatus: InvoiceStatus) {
    if (!validate()) return;

    setSaving(true);
    setError("");

    try {
      const payload = buildPayload({
        ...form,
        status: nextStatus,
      });

      let response: ApiResponse;

      try {
        response = await fetchJson<ApiResponse>(makeApiUrl("/api/invoices/"), {
          method: "POST",
          body: payload,
        });
      } catch {
        response = await fetchJson<ApiResponse>(makeApiUrl("/api/invoices/create/"), {
          method: "POST",
          body: payload,
        });
      }

      const invoiceId = extractCreatedId(response);

      setCreatedId(invoiceId);
      setDirty(false);
      window.localStorage.removeItem(DRAFT_KEY);
      toast.success(t.saved);

      if (invoiceId) {
        router.push(`/system/invoices/${invoiceId}`);
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

  if (initialLoading) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-lg border bg-card shadow-none">
              <CardHeader className="min-h-[112px] px-6 py-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-5 w-20" />
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
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

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadOptions({ silent: true })}
            disabled={refreshing || saving}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={saveDraft} disabled={saving}>
            <Save className="h-4 w-4" />
            {t.saveDraft}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={clearForm} disabled={saving}>
            <RotateCcw className="h-4 w-4" />
            {t.clear}
          </Button>

          <Button
            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
            disabled={saving}
            onClick={() => void submitInvoice("draft")}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {saving ? t.saving : t.submit}
          </Button>

          <Button
            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
            disabled={saving}
            onClick={() => void submitInvoice("issued")}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ReceiptText className="h-4 w-4" />
            )}
            {saving ? t.saving : t.submitAndIssue}
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
            <KpiCard
              title={t.linesCount}
              value={formatInteger(form.mode === "manual" ? form.lines.length : selectedOrder ? 1 : 0)}
              trend={readinessComplete ? t.complete : t.incomplete}
              icon={FileText}
            />

            <KpiCard
              title={t.subtotal}
              value={<MoneyValue value={form.mode === "manual" ? totals.subtotal : selectedOrder?.total_amount || 0} />}
              trend={form.mode === "order" ? t.fromOrder : t.manual}
              icon={Banknote}
            />

            <KpiCard
              title={t.tax}
              value={<MoneyValue value={form.mode === "manual" ? totals.tax : 0} />}
              trend={t.taxRate}
              icon={ReceiptText}
            />

            <KpiCard
              title={t.grandTotal}
              value={<MoneyValue value={form.mode === "manual" ? totals.total : selectedOrder?.total_amount || 0} />}
              trend={form.status === "issued" ? t.issued : t.draft}
              icon={ShoppingCart}
            />
          </div>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.invoiceInfo}</CardTitle>
                <CardDescription>{t.readiness}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <FieldLabel>{t.mode}</FieldLabel>
                  <Select
                    value={form.mode}
                    onValueChange={(value) => updateForm("mode", value as InvoiceMode)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order">{t.fromOrder}</SelectItem>
                      <SelectItem value="manual">{t.manual}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.invoiceType}</FieldLabel>
                  <Select
                    value={form.invoice_type}
                    onValueChange={(value) => updateForm("invoice_type", value as InvoiceType)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">{t.sales}</SelectItem>
                      <SelectItem value="service">{t.service}</SelectItem>
                      <SelectItem value="subscription">{t.subscription}</SelectItem>
                      <SelectItem value="other">{t.other}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.status}</FieldLabel>
                  <Select
                    value={form.status}
                    onValueChange={(value) => updateForm("status", value as InvoiceStatus)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t.draft}</SelectItem>
                      <SelectItem value="issued">{t.issued}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.issueDate}</FieldLabel>
                  <Input
                    type="date"
                    value={form.issue_date}
                    onChange={(event) => updateForm("issue_date", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>{t.dueDate}</FieldLabel>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(event) => updateForm("due_date", event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.customerInfo}</CardTitle>
                <CardDescription>{t.customer}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 px-6 pb-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>{t.customer}</FieldLabel>
                  <Select
                    value={form.customer_id}
                    onValueChange={(value) => updateForm("customer_id", value)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-10 rounded-lg bg-background">
                      <SelectValue placeholder={t.selectCustomer} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.length ? (
                        customers.map((customer) => (
                          <SelectItem key={customer.id} value={String(customer.id)}>
                            {customer.name}
                            {customer.phone ? ` — ${customer.phone}` : ""}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none" disabled>
                          {t.noCustomers}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {form.mode === "order" ? (
                  <div className="space-y-2">
                    <FieldLabel>{t.order}</FieldLabel>
                    <Select
                      value={form.order_id}
                      onValueChange={(value) => updateForm("order_id", value)}
                      disabled={saving || !orderFilteredOrders.length}
                    >
                      <SelectTrigger className="h-10 rounded-lg bg-background">
                        <SelectValue placeholder={t.selectOrder} />
                      </SelectTrigger>
                      <SelectContent>
                        {orderFilteredOrders.length ? (
                          orderFilteredOrders.map((order) => (
                            <SelectItem key={order.id} value={String(order.id)}>
                              {order.order_number}
                              {order.product_name ? ` — ${order.product_name}` : ""}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__none" disabled>
                            {t.noOrders}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {form.mode === "manual" ? (
            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle>{t.linesInfo}</CardTitle>
                    <CardDescription>{t.emptyLinesDesc}</CardDescription>
                  </div>

                  <Button
                    variant="outline"
                    className="h-10 rounded-lg"
                    onClick={addLine}
                    disabled={saving}
                  >
                    <Plus className="h-4 w-4" />
                    {t.addLine}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-6 pb-6">
                {form.lines.length ? (
                  <div className="overflow-hidden rounded-lg border bg-background">
                    <Table>
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="px-3 py-3 text-right text-sm font-medium">{t.itemTitle}</th>
                          <th className="px-3 py-3 text-right text-sm font-medium">{t.quantity}</th>
                          <th className="px-3 py-3 text-right text-sm font-medium">{t.unitPrice}</th>
                          <th className="px-3 py-3 text-right text-sm font-medium">{t.discount}</th>
                          <th className="px-3 py-3 text-right text-sm font-medium">{t.taxRate}</th>
                          <th className="px-3 py-3 text-right text-sm font-medium">{t.grandTotal}</th>
                          <th className="px-3 py-3 text-right text-sm font-medium">{t.remove}</th>
                        </tr>
                      </thead>

                      <tbody>
                        {form.lines.map((line) => {
                          const amounts = lineAmounts(line);

                          return (
                            <tr key={line.local_id} className="border-b last:border-0">
                              <td className="min-w-[240px] px-3 py-3">
                                <Input
                                  value={line.title}
                                  onChange={(event) => updateLine(line.local_id, "title", event.target.value)}
                                  className="h-9 rounded-lg bg-background"
                                  disabled={saving}
                                />
                              </td>

                              <td className="w-[110px] px-3 py-3">
                                <Input
                                  value={line.quantity}
                                  inputMode="decimal"
                                  onChange={(event) => updateLine(line.local_id, "quantity", toEnglishDigits(event.target.value))}
                                  className="h-9 rounded-lg bg-background text-right tabular-nums"
                                  disabled={saving}
                                />
                              </td>

                              <td className="w-[140px] px-3 py-3">
                                <Input
                                  value={line.unit_price}
                                  inputMode="decimal"
                                  onChange={(event) => updateLine(line.local_id, "unit_price", toEnglishDigits(event.target.value))}
                                  className="h-9 rounded-lg bg-background text-right tabular-nums"
                                  disabled={saving}
                                />
                              </td>

                              <td className="w-[120px] px-3 py-3">
                                <Input
                                  value={line.discount_amount}
                                  inputMode="decimal"
                                  onChange={(event) => updateLine(line.local_id, "discount_amount", toEnglishDigits(event.target.value))}
                                  className="h-9 rounded-lg bg-background text-right tabular-nums"
                                  disabled={saving}
                                />
                              </td>

                              <td className="w-[110px] px-3 py-3">
                                <Input
                                  value={line.tax_rate}
                                  inputMode="decimal"
                                  onChange={(event) => updateLine(line.local_id, "tax_rate", toEnglishDigits(event.target.value))}
                                  className="h-9 rounded-lg bg-background text-right tabular-nums"
                                  disabled={saving}
                                />
                              </td>

                              <td className="w-[150px] px-3 py-3">
                                <MoneyValue value={amounts.total} />
                              </td>

                              <td className="w-[90px] px-3 py-3">
                                <Button
                                  variant="outline"
                                  className="h-9 rounded-lg text-red-600 hover:text-red-600"
                                  onClick={() => removeLine(line.local_id)}
                                  disabled={saving || form.lines.length <= 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border bg-background text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{t.emptyLinesTitle}</p>
                      <p className="text-sm text-muted-foreground">{t.emptyLinesDesc}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div>
                <CardTitle>{t.notesInfo}</CardTitle>
                <CardDescription>{t.notes}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="grid gap-4 px-6 pb-6 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>{t.notes}</FieldLabel>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>{t.internalNotes}</FieldLabel>
                <textarea
                  value={form.internal_notes}
                  onChange={(event) => updateForm("internal_notes", event.target.value)}
                  className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  disabled={saving}
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
                  <CardDescription>{t.readiness}</CardDescription>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                  <ReceiptText className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 px-6 pb-6">
              <InfoRow label={t.mode} value={form.mode === "order" ? t.fromOrder : t.manual} />
              <InfoRow label={t.customer} value={selectedCustomer?.name || "—"} />
              <InfoRow label={t.order} value={selectedOrder?.order_number || t.noOrder} />
              <InfoRow label={t.invoiceType} value={t[form.invoice_type]} />
              <InfoRow label={t.status} value={t[form.status]} />
              <InfoRow label={t.issueDate} value={form.issue_date || "—"} />
              <InfoRow label={t.dueDate} value={form.due_date || "—"} />
              <InfoRow label={t.linesCount} value={formatInteger(form.mode === "manual" ? form.lines.length : selectedOrder ? 1 : 0)} />
              <InfoRow
                label={t.grandTotal}
                value={
                  <MoneyValue
                    value={form.mode === "manual" ? totals.total : selectedOrder?.total_amount || 0}
                  />
                }
              />

              <div className="grid gap-2 pt-4">
                <Button
                  className="h-10 rounded-lg bg-black text-white hover:bg-black/90"
                  disabled={saving}
                  onClick={() => void submitInvoice("draft")}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {saving ? t.saving : t.submit}
                </Button>

                <Button
                  className="h-10 rounded-lg bg-black text-white hover:bg-black/90"
                  disabled={saving}
                  onClick={() => void submitInvoice("issued")}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ReceiptText className="h-4 w-4" />
                  )}
                  {saving ? t.saving : t.submitAndIssue}
                </Button>

                <Button
                  variant="outline"
                  className="h-10 rounded-lg bg-background"
                  disabled={saving}
                  onClick={saveDraft}
                >
                  <Save className="h-4 w-4" />
                  {t.saveDraft}
                </Button>

                {createdId ? (
                  <Button asChild variant="outline" className="h-10 rounded-lg bg-background">
                    <Link href={`/system/invoices/${createdId}`}>
                      <FileText className="h-4 w-4" />
                      {t.viewInvoice}
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
                  <p className="truncate text-sm font-medium">{selectedCustomer?.name || t.selectCustomer}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedCustomer?.phone || selectedCustomer?.email || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedOrder?.order_number || t.noOrder}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedOrder ? `${t.orderAmount}: ${formatMoney(selectedOrder.total_amount)}` : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.grandTotal}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatMoney(totals.total)} SAR
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