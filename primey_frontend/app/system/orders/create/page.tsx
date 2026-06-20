"use client";

/* ============================================================
   📂 app/system/orders/create/page.tsx
   🧠 Primey Care | Create Order Premium Form
   ------------------------------------------------------------
   ✅ Premium paid-dashboard inspired layout
   ✅ Real lookups from /api/customers/ /api/products/ /api/agents/
   ✅ Create order through /api/orders/
   ✅ No manual contract selector
   ✅ Agent selector only for authorized users
   ✅ Agent users do not see agent selector
   ✅ COD supported without visible custody alert card
   ✅ Local draft + unsaved changes protection
   ✅ Arabic / English
   ✅ English numerals
   ✅ sonner
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost hardcoded
============================================================ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Package,
  RefreshCcw,
  RotateCcw,
  Save,
  ShoppingCart,
  Sparkles,
  Truck,
  UserRound,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AppLocale = "ar" | "en";
type Dict = Record<string, unknown>;

type OrderKind = "card" | "membership" | "program" | "service" | "package" | "general";

type PaymentMethod =
  | "none"
  | "cash"
  | "cash_on_delivery"
  | "bank_transfer"
  | "gateway"
  | "card"
  | "wallet"
  | "tamara"
  | "tabby";

type OptionItem = {
  id: string;
  label: string;
  subtitle: string;
  raw: Dict;
};

type FormState = {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_city: string;
  customer_address: string;

  product_id: string;
  order_kind: OrderKind;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  tax_amount: string;

  starts_at: string;
  ends_at: string;
  scheduled_at: string;

  payment_method: PaymentMethod;
  amount_paid: string;
  payment_reference: string;

  agent_id: string;
  referral_code: string;

  customer_notes: string;
  delivery_notes: string;
  internal_notes: string;

  create_invoice: boolean;
  issue_invoice_immediately: boolean;
  notify_customer: boolean;
};

type ValidationErrors = Partial<Record<keyof FormState, string>>;

type LookupState = {
  customers: OptionItem[];
  products: OptionItem[];
  agents: OptionItem[];
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  order?: unknown;
  item?: unknown;
  id?: string | number;
};

const SAR_ICON = "/currency/sar.svg";
const DRAFT_STORAGE_KEY = "primey-orders-create-draft-v2";

const initialForm: FormState = {
  customer_id: "",
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_city: "",
  customer_address: "",

  product_id: "",
  order_kind: "card",
  quantity: "1",
  unit_price: "",
  discount_amount: "0",
  tax_amount: "0",

  starts_at: "",
  ends_at: "",
  scheduled_at: "",

  payment_method: "cash_on_delivery",
  amount_paid: "0",
  payment_reference: "",

  agent_id: "",
  referral_code: "",

  customer_notes: "",
  delivery_notes: "",
  internal_notes: "",

  create_invoice: true,
  issue_invoice_immediately: false,
  notify_customer: true,
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function apiUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}

function readLocale(): AppLocale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function readCookie(name: string) {
  if (typeof document === "undefined") return "";

  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=")[1] || "") : "";
}

function asRecord(value: unknown): Dict {
  return value && typeof value === "object" ? (value as Dict) : {};
}

function stringify(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const cleaned = stringify(value).replace(/,/g, "").replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
}

function toBool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;

  if (typeof value === "string") {
    return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase());
  }

  return Boolean(value);
}

function readNested(source: Dict, keys: string[]) {
  for (const key of keys) {
    const parts = key.split(".");
    let current: unknown = source;
    let found = true;

    for (const part of parts) {
      const obj = asRecord(current);

      if (part in obj) {
        current = obj[part];
      } else {
        found = false;
        break;
      }
    }

    if (found && current !== null && current !== undefined && current !== "") {
      return current;
    }
  }

  return "";
}

function unwrapList(payload: unknown) {
  const obj = asRecord(payload);
  const data = asRecord(obj.data);

  const candidates = [
    data.results,
    data.items,
    data.data,
    obj.results,
    obj.items,
    obj.data,
    payload,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => {
          if (!value) return [];

          if (typeof value === "string") return [value];

          if (Array.isArray(value)) {
            return value.flatMap((item) => {
              if (typeof item === "string") return [item];

              const obj = asRecord(item);
              return [
                obj.code,
                obj.codename,
                obj.permission,
                obj.name,
                obj.role,
              ].filter(Boolean) as string[];
            });
          }

          const obj = asRecord(value);

          return [
            obj.code,
            obj.codename,
            obj.permission,
            obj.name,
            obj.role,
          ].filter(Boolean) as string[];
        })
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  );
}

function getAuthUser(authValue: unknown) {
  const auth = asRecord(authValue);

  for (const key of ["user", "currentUser", "profile", "account", "session", "data"]) {
    const value = auth[key];
    if (value && typeof value === "object") return value as Dict;
  }

  return {};
}

function getAuthRoles(authValue: unknown) {
  const auth = asRecord(authValue);
  const user = getAuthUser(authValue);

  return uniqueStrings([
    auth.role,
    auth.roles,
    auth.user_type,
    auth.userType,
    auth.workspace,
    user.role,
    user.roles,
    user.user_type,
    user.userType,
    user.workspace,
  ]).map((item) => item.toLowerCase());
}

function getAuthPermissions(authValue: unknown) {
  const auth = asRecord(authValue);
  const user = getAuthUser(authValue);
  const authPermissions = asRecord(auth.permissions);
  const userPermissions = asRecord(user.permissions);
  const profilePermissions = asRecord(auth.profile_permissions);
  const userProfilePermissions = asRecord(user.profile_permissions);

  return uniqueStrings([
    auth.permission_codes,
    auth.permissions,
    auth.codes,
    auth.profile_permissions,
    authPermissions.codes,
    profilePermissions.codes,
    user.permission_codes,
    user.permissions,
    user.codes,
    user.profile_permissions,
    userPermissions.codes,
    userProfilePermissions.codes,
  ]);
}

function isSystemAdmin(authValue: unknown) {
  const auth = asRecord(authValue);
  const user = getAuthUser(authValue);
  const roles = getAuthRoles(authValue);

  return (
    toBool(auth.is_superuser) ||
    toBool(auth.isSuperuser) ||
    toBool(user.is_superuser) ||
    roles.some((role) =>
      ["system_admin", "superuser", "super_admin", "admin", "owner"].includes(role)
    )
  );
}

function hasPermission(authValue: unknown, permissions: string[], mode: "view" | "action") {
  if (isSystemAdmin(authValue)) return true;

  const roles = getAuthRoles(authValue);
  const codes = getAuthPermissions(authValue);

  if (codes.some((code) => permissions.includes(code))) return true;

  if (mode === "view" && !codes.length && !roles.length) return true;

  if (mode === "view") {
    return roles.some((role) =>
      ["order_manager", "orders_manager", "support", "accountant", "sales_manager"].includes(role)
    );
  }

  return roles.some((role) =>
    ["order_manager", "orders_manager", "sales_manager"].includes(role)
  );
}

function isAgentUser(authValue: unknown) {
  const roles = getAuthRoles(authValue);

  return roles.some((role) =>
    ["agent", "agent_user", "sales_agent", "delivery_agent"].includes(role)
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function normalizeCustomer(value: unknown): OptionItem {
  const obj = asRecord(value);
  const user = asRecord(obj.user);

  const name = stringify(
    readNested(obj, [
      "display_name",
      "full_name",
      "name",
      "customer_name",
      "user.full_name",
      "user.name",
    ]) ||
      user.full_name ||
      user.name ||
      "-"
  );

  const phone = stringify(
    readNested(obj, [
      "normalized_phone",
      "phone",
      "mobile",
      "whatsapp_number",
      "user.phone",
    ])
  );

  return {
    id: stringify(obj.id ?? obj.pk),
    label: name,
    subtitle: phone,
    raw: obj,
  };
}

function normalizeProduct(value: unknown): OptionItem {
  const obj = asRecord(value);

  const name = stringify(
    readNested(obj, [
      "name_ar",
      "name_en",
      "name",
      "title",
      "product_name",
      "offer_title",
    ]) || "-"
  );

  const type = stringify(
    readNested(obj, ["product_type", "type", "kind", "order_kind"])
  );

  return {
    id: stringify(obj.id ?? obj.pk),
    label: name,
    subtitle: type,
    raw: obj,
  };
}

function normalizeAgent(value: unknown): OptionItem {
  const obj = asRecord(value);
  const user = asRecord(obj.user);

  const name = stringify(
    readNested(obj, ["name", "full_name", "user.full_name", "user.name"]) ||
      user.full_name ||
      user.name ||
      "-"
  );

  const code = stringify(readNested(obj, ["code", "agent_code"]));

  return {
    id: stringify(obj.id ?? obj.pk),
    label: name,
    subtitle: code,
    raw: obj,
  };
}

function getProductPrice(product: OptionItem | undefined) {
  if (!product) return 0;

  const obj = product.raw;

  return toNumber(
    readNested(obj, [
      "unit_price",
      "price",
      "final_price",
      "price_after_discount",
      "sale_price",
      "default_price",
    ])
  );
}

function getProductOrderKind(product: OptionItem | undefined): OrderKind {
  if (!product) return "card";

  const rawKind = stringify(
    readNested(product.raw, ["order_kind", "kind", "product_type", "type"])
  ).toLowerCase();

  if (rawKind.includes("membership")) return "membership";
  if (rawKind.includes("program")) return "program";
  if (rawKind.includes("service")) return "service";
  if (rawKind.includes("package")) return "package";
  if (rawKind.includes("card")) return "card";

  return "card";
}

function getTranslation(locale: AppLocale) {
  const isArabic = locale === "ar";

  return {
    orders: isArabic ? "الطلبات" : "Orders",
    title: isArabic ? "إنشاء طلب جديد" : "Create New Order",
    subtitle: isArabic
      ? "سجل طلبًا تشغيليًا جديدًا مع العميل والمنتج وطريقة الدفع ومعلومات التوصيل."
      : "Create an operational order with customer, product, payment, and delivery details.",
    back: isArabic ? "العودة للطلبات" : "Back to Orders",
    refresh: isArabic ? "تحديث البيانات" : "Refresh",
    reset: isArabic ? "تفريغ النموذج" : "Reset Form",
    save: isArabic ? "حفظ الطلب" : "Save Order",
    saving: isArabic ? "جاري الحفظ..." : "Saving...",
    select: isArabic ? "اختر" : "Select",
    required: isArabic ? "هذا الحقل مطلوب" : "This field is required",
    invalidPhone: isArabic ? "رقم الجوال غير صحيح" : "Invalid mobile number",
    invalidAmount: isArabic ? "المبلغ غير صحيح" : "Invalid amount",
    created: isArabic ? "تم إنشاء الطلب بنجاح" : "Order created successfully",
    createError: isArabic ? "تعذر إنشاء الطلب" : "Unable to create order",
    loadError: isArabic ? "تعذر تحميل بيانات النموذج" : "Unable to load form data",
    draftRestored: isArabic ? "تم استرجاع مسودة الطلب" : "Order draft restored",
    draftCleared: isArabic ? "تم تفريغ النموذج" : "Form cleared",
    unsaved: isArabic
      ? "لديك تغييرات غير محفوظة، هل تريد المتابعة؟"
      : "You have unsaved changes. Continue?",
    noPermissionTitle: isArabic ? "لا تملك صلاحية إنشاء الطلبات" : "No permission to create orders",
    noPermissionDesc: isArabic
      ? "لا يمكن لهذا الحساب إنشاء طلبات جديدة."
      : "This account cannot create new orders.",

    stepCustomer: isArabic ? "العميل" : "Customer",
    stepProduct: isArabic ? "المنتج" : "Product",
    stepPayment: isArabic ? "الدفع" : "Payment",
    stepReview: isArabic ? "المراجعة" : "Review",

    customerSection: isArabic ? "بيانات العميل" : "Customer Details",
    customerSectionDesc: isArabic
      ? "اختر عميلًا موجودًا أو أدخل بيانات عميل جديد."
      : "Select an existing customer or enter a new customer details.",
    productSection: isArabic ? "المنتج والطلب" : "Product & Order",
    productSectionDesc: isArabic
      ? "حدد المنتج ونوع الطلب والقيمة المالية."
      : "Choose the product, order kind, and financial values.",
    datesSection: isArabic ? "التواريخ والمواعيد" : "Dates & Schedule",
    datesSectionDesc: isArabic
      ? "حدد بداية ونهاية الاشتراك أو موعد التنفيذ عند الحاجة."
      : "Set subscription dates or service schedule when needed.",
    paymentSection: isArabic ? "الدفع والتحصيل" : "Payment & Collection",
    paymentSectionDesc: isArabic
      ? "حدد طريقة الدفع والمبلغ المدفوع والمرجع عند وجوده."
      : "Choose payment method, paid amount, and reference when available.",
    agentSection: isArabic ? "المندوب والإحالة" : "Agent & Referral",
    agentSectionDesc: isArabic
      ? "مستخدم المندوب يتم ربط طلبه تلقائيًا، والمدير يمكنه اختيار مندوب."
      : "Agent users are linked automatically; managers can assign an agent.",
    notesSection: isArabic ? "الملاحظات" : "Notes",
    notesSectionDesc: isArabic
      ? "أضف ملاحظات العميل أو التوصيل أو الملاحظات الداخلية."
      : "Add customer, delivery, or internal notes.",
    optionsSection: isArabic ? "خيارات إضافية" : "Additional Options",

    contractHint: isArabic
      ? "لا يتم اختيار العقد يدويًا؛ النظام يربط العقد المناسب من المنتج ومقدم الخدمة والعقد التسويقي النشط."
      : "Contract is not selected manually; the system resolves it from product, provider, and active marketing contract.",

    fields: {
      customer: isArabic ? "عميل موجود" : "Existing Customer",
      customerName: isArabic ? "اسم العميل" : "Customer Name",
      customerPhone: isArabic ? "رقم الجوال" : "Mobile",
      customerEmail: isArabic ? "البريد الإلكتروني" : "Email",
      customerCity: isArabic ? "المدينة" : "City",
      customerAddress: isArabic ? "العنوان" : "Address",
      product: isArabic ? "المنتج / البطاقة" : "Product / Card",
      orderKind: isArabic ? "نوع الطلب" : "Order Kind",
      quantity: isArabic ? "الكمية" : "Quantity",
      unitPrice: isArabic ? "سعر الوحدة" : "Unit Price",
      discountAmount: isArabic ? "الخصم" : "Discount",
      taxAmount: isArabic ? "الضريبة" : "Tax",
      startsAt: isArabic ? "بداية الاشتراك" : "Start Date",
      endsAt: isArabic ? "نهاية الاشتراك" : "End Date",
      scheduledAt: isArabic ? "موعد التنفيذ" : "Schedule",
      paymentMethod: isArabic ? "طريقة الدفع" : "Payment Method",
      amountPaid: isArabic ? "المبلغ المدفوع" : "Amount Paid",
      paymentReference: isArabic ? "مرجع الدفع" : "Payment Reference",
      agent: isArabic ? "مندوب الطلب" : "Order Agent",
      referralCode: isArabic ? "كود الإحالة" : "Referral Code",
      customerNotes: isArabic ? "ملاحظات العميل" : "Customer Notes",
      deliveryNotes: isArabic ? "ملاحظات التوصيل" : "Delivery Notes",
      internalNotes: isArabic ? "ملاحظات داخلية" : "Internal Notes",
      createInvoice: isArabic ? "إنشاء فاتورة للطلب" : "Create invoice for order",
      issueInvoice: isArabic ? "إصدار الفاتورة مباشرة" : "Issue invoice immediately",
      notifyCustomer: isArabic ? "إشعار العميل" : "Notify customer",
    },

    orderKind: {
      card: isArabic ? "بطاقة" : "Card",
      membership: isArabic ? "عضوية" : "Membership",
      program: isArabic ? "برنامج" : "Program",
      service: isArabic ? "خدمة" : "Service",
      package: isArabic ? "باقة" : "Package",
      general: isArabic ? "عام" : "General",
    } as Record<OrderKind, string>,

    paymentMethods: {
      none: isArabic ? "بدون دفع الآن" : "No payment now",
      cash: isArabic ? "نقدي" : "Cash",
      cash_on_delivery: isArabic ? "الدفع عند الاستلام" : "Cash on delivery",
      bank_transfer: isArabic ? "تحويل بنكي" : "Bank transfer",
      gateway: isArabic ? "بوابة دفع" : "Payment gateway",
      card: isArabic ? "بطاقة بنكية" : "Card",
      wallet: isArabic ? "محفظة" : "Wallet",
      tamara: isArabic ? "تمارا" : "Tamara",
      tabby: isArabic ? "تابي" : "Tabby",
    } as Record<PaymentMethod, string>,

    summary: isArabic ? "ملخص الطلب" : "Order Summary",
    liveSummary: isArabic
      ? "مراجعة سريعة قبل حفظ الطلب."
      : "Quick review before saving.",
    customer: isArabic ? "العميل" : "Customer",
    product: isArabic ? "المنتج" : "Product",
    orderType: isArabic ? "نوع الطلب" : "Order type",
    method: isArabic ? "طريقة الدفع" : "Method",
    quantity: isArabic ? "الكمية" : "Quantity",
    unitPrice: isArabic ? "سعر الوحدة" : "Unit price",
    subtotal: isArabic ? "الإجمالي قبل الخصم" : "Subtotal",
    discount: isArabic ? "الخصم" : "Discount",
    tax: isArabic ? "الضريبة" : "Tax",
    total: isArabic ? "الإجمالي" : "Total",
    paid: isArabic ? "المدفوع" : "Paid",
    remaining: isArabic ? "المتبقي" : "Remaining",
    readiness: isArabic ? "جاهزية الطلب" : "Order Readiness",
    customerReady: isArabic ? "بيانات العميل مكتملة" : "Customer ready",
    productReady: isArabic ? "المنتج والقيمة مكتملة" : "Product ready",
    paymentReady: isArabic ? "الدفع مضبوط" : "Payment ready",
  };
}

function getCreatedId(payload: ApiResponse) {
  const data = asRecord(payload.data);
  const order = asRecord(payload.order);
  const item = asRecord(payload.item);

  return stringify(
    payload.id ||
      data.id ||
      data.order_id ||
      order.id ||
      item.id
  );
}

function buildPayload(form: FormState) {
  const quantity = Math.max(toNumber(form.quantity), 1);
  const unitPrice = toNumber(form.unit_price);
  const discountAmount = toNumber(form.discount_amount);
  const taxAmount = toNumber(form.tax_amount);
  const amountPaid =
    form.payment_method === "cash_on_delivery" ? 0 : toNumber(form.amount_paid);

  const subtotalAmount = quantity * unitPrice;
  const totalAmount = Math.max(subtotalAmount - discountAmount + taxAmount, 0);

  return {
    customer_id: form.customer_id || undefined,
    customer_name: form.customer_name.trim(),
    customer_phone: form.customer_phone.trim(),
    customer_email: form.customer_email.trim(),
    customer_city: form.customer_city.trim(),
    customer_address: form.customer_address.trim(),

    product_id: form.product_id || undefined,
    order_kind: form.order_kind,
    quantity,
    unit_price: unitPrice,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    subtotal_amount: subtotalAmount,
    total_amount: totalAmount,

    starts_at: form.starts_at || undefined,
    ends_at: form.ends_at || undefined,
    scheduled_at: form.scheduled_at || undefined,

    payment_method: form.payment_method === "none" ? "" : form.payment_method,
    amount_paid: amountPaid,
    payment_reference: form.payment_reference.trim(),

    agent_id: form.agent_id || undefined,
    referral_code: form.referral_code.trim(),

    customer_notes: form.customer_notes.trim(),
    delivery_notes: form.delivery_notes.trim(),
    internal_notes: form.internal_notes.trim(),

    create_invoice: form.create_invoice,
    issue_invoice_immediately: form.issue_invoice_immediately,
    notify_customer: form.notify_customer,
  };
}

function validateForm(form: FormState, t: ReturnType<typeof getTranslation>) {
  const errors: ValidationErrors = {};

  if (!form.customer_id && !form.customer_name.trim()) {
    errors.customer_name = t.required;
  }

  if (!form.customer_id && !form.customer_phone.trim()) {
    errors.customer_phone = t.required;
  }

  if (form.customer_phone.trim() && form.customer_phone.replace(/\D/g, "").length < 8) {
    errors.customer_phone = t.invalidPhone;
  }

  if (!form.product_id) {
    errors.product_id = t.required;
  }

  if (toNumber(form.quantity) <= 0) {
    errors.quantity = t.invalidAmount;
  }

  if (toNumber(form.unit_price) < 0) {
    errors.unit_price = t.invalidAmount;
  }

  if (toNumber(form.discount_amount) < 0) {
    errors.discount_amount = t.invalidAmount;
  }

  if (toNumber(form.tax_amount) < 0) {
    errors.tax_amount = t.invalidAmount;
  }

  if (form.payment_method !== "cash_on_delivery" && toNumber(form.amount_paid) < 0) {
    errors.amount_paid = t.invalidAmount;
  }

  return errors;
}

function SarAmount({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold tabular-nums">
      <span>{formatMoney(value)}</span>
      <img src={SAR_ICON} alt="SAR" className="h-3.5 w-3.5 opacity-80" />
    </span>
  );
}

function TextInput({
  label,
  value,
  onChange,
  error,
  type = "text",
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 rounded-lg",
          error && "border-red-500 focus-visible:ring-red-500"
        )}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "min-h-[92px] rounded-lg",
          error && "border-red-500 focus-visible:ring-red-500"
        )}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  children,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus:ring-red-500"
        )}
      >
        {children}
      </select>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function FormPanel({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="border-b px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            {icon}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-end font-semibold">{value || "—"}</span>
    </div>
  );
}

function StepPill({
  active,
  done,
  index,
  label,
}: {
  active: boolean;
  done: boolean;
  index: number;
  label: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
        active && "border-black bg-black text-white",
        !active && done && "border-emerald-200 bg-emerald-50 text-emerald-700",
        !active && !done && "bg-background text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full text-[11px]",
          active ? "bg-white/20" : "bg-muted"
        )}
      >
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index}
      </span>
      {label}
    </div>
  );
}

export default function SystemOrdersCreatePage() {
  const router = useRouter();
  const authContext = useAuth() as unknown;

  const [locale, setLocale] = React.useState<AppLocale>("ar");
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [errors, setErrors] = React.useState<ValidationErrors>({});

  const [customers, setCustomers] = React.useState<OptionItem[]>([]);
  const [products, setProducts] = React.useState<OptionItem[]>([]);
  const [agents, setAgents] = React.useState<OptionItem[]>([]);

  const [isLoadingLookups, setIsLoadingLookups] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  const t = React.useMemo(() => getTranslation(locale), [locale]);
  const isRtl = locale === "ar";

  const canCreate = hasPermission(authContext, ["orders.create"], "action");
  const canAssignAgent =
    !isAgentUser(authContext) &&
    hasPermission(
      authContext,
      ["orders.assign_agent", "orders.create_for_agent", "agents.view"],
      "action"
    );

  const selectedCustomer = React.useMemo(
    () => customers.find((customer) => customer.id === form.customer_id),
    [customers, form.customer_id]
  );

  const selectedProduct = React.useMemo(
    () => products.find((product) => product.id === form.product_id),
    [products, form.product_id]
  );

  const selectedAgent = React.useMemo(
    () => agents.find((agent) => agent.id === form.agent_id),
    [agents, form.agent_id]
  );

  const quantity = Math.max(toNumber(form.quantity), 1);
  const unitPrice = toNumber(form.unit_price);
  const discountAmount = toNumber(form.discount_amount);
  const taxAmount = toNumber(form.tax_amount);
  const subtotalAmount = quantity * unitPrice;
  const totalAmount = Math.max(subtotalAmount - discountAmount + taxAmount, 0);
  const amountPaid =
    form.payment_method === "cash_on_delivery" ? 0 : Math.min(toNumber(form.amount_paid), totalAmount);
  const remainingAmount = Math.max(totalAmount - amountPaid, 0);

  const stepState = {
    customer: Boolean(form.customer_id || (form.customer_name && form.customer_phone)),
    product: Boolean(form.product_id && toNumber(form.unit_price) >= 0 && toNumber(form.quantity) > 0),
    payment: Boolean(form.payment_method),
  };

  const activeStep = !stepState.customer
    ? 1
    : !stepState.product
      ? 2
      : !stepState.payment
        ? 3
        : 4;

  React.useEffect(() => {
    const syncLocale = () => {
      const nextLocale = readLocale();
      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
      document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
    };

    syncLocale();

    window.addEventListener("storage", syncLocale);
    window.addEventListener("primey-locale-changed", syncLocale);

    return () => {
      window.removeEventListener("storage", syncLocale);
      window.removeEventListener("primey-locale-changed", syncLocale);
    };
  }, []);

  React.useEffect(() => {
    try {
      const draft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!draft) return;

      const parsed = JSON.parse(draft) as Partial<FormState>;
      setForm((current) => ({
        ...current,
        ...parsed,
      }));
      toast.success(getTranslation(readLocale()).draftRestored);
    } catch {
      // ignore invalid draft
    }
  }, []);

  React.useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
      } catch {
        // ignore storage errors
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [form, hasUnsavedChanges]);

  React.useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t.unsaved;
      return t.unsaved;
    };

    window.addEventListener("beforeunload", handler);

    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges, t.unsaved]);

  const loadLookups = React.useCallback(async () => {
    setIsLoadingLookups(true);
    setLoadError("");

    try {
      const [customersResponse, productsResponse, agentsResponse] = await Promise.all([
        fetch(apiUrl("/api/customers/?page_size=100"), {
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Accept-Language": locale,
          },
        }),
        fetch(apiUrl("/api/products/?page_size=100"), {
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Accept-Language": locale,
          },
        }),
        canAssignAgent
          ? fetch(apiUrl("/api/agents/?page_size=100"), {
              credentials: "include",
              headers: {
                Accept: "application/json",
                "Accept-Language": locale,
              },
            })
          : Promise.resolve(null),
      ]);

      if (!customersResponse.ok) throw new Error(t.loadError);
      if (!productsResponse.ok) throw new Error(t.loadError);

      const customersPayload = await customersResponse.json().catch(() => ({}));
      const productsPayload = await productsResponse.json().catch(() => ({}));
      const agentsPayload = agentsResponse
        ? await agentsResponse.json().catch(() => ({}))
        : {};

      if (agentsResponse && !agentsResponse.ok) throw new Error(t.loadError);

      setCustomers(unwrapList(customersPayload).map(normalizeCustomer).filter((item) => item.id));
      setProducts(unwrapList(productsPayload).map(normalizeProduct).filter((item) => item.id));
      setAgents(canAssignAgent ? unwrapList(agentsPayload).map(normalizeAgent).filter((item) => item.id) : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t.loadError);
      setCustomers([]);
      setProducts([]);
      setAgents([]);
    } finally {
      setIsLoadingLookups(false);
    }
  }, [canAssignAgent, locale, t.loadError]);

  React.useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => {
      if (!current[key]) return current;

      const next = { ...current };
      delete next[key];
      return next;
    });

    setHasUnsavedChanges(true);
  }

  function handleCustomerChange(value: string) {
    const customer = customers.find((item) => item.id === value);

    if (!customer) {
      updateField("customer_id", "");
      return;
    }

    const raw = customer.raw;

    setForm((current) => ({
      ...current,
      customer_id: customer.id,
      customer_name: customer.label,
      customer_phone: stringify(
        readNested(raw, [
          "normalized_phone",
          "phone",
          "mobile",
          "whatsapp_number",
          "user.phone",
        ])
      ),
      customer_email: stringify(readNested(raw, ["email", "user.email"])),
      customer_city: stringify(readNested(raw, ["city", "address_city"])),
      customer_address: stringify(readNested(raw, ["address", "full_address"])),
    }));

    setErrors((current) => {
      const next = { ...current };
      delete next.customer_name;
      delete next.customer_phone;
      return next;
    });

    setHasUnsavedChanges(true);
  }

  function handleProductChange(value: string) {
    const product = products.find((item) => item.id === value);

    if (!product) {
      updateField("product_id", "");
      return;
    }

    const price = getProductPrice(product);
    const orderKind = getProductOrderKind(product);

    setForm((current) => ({
      ...current,
      product_id: product.id,
      order_kind: orderKind,
      unit_price: price > 0 ? price.toFixed(2) : current.unit_price,
    }));

    setErrors((current) => {
      const next = { ...current };
      delete next.product_id;
      delete next.unit_price;
      return next;
    });

    setHasUnsavedChanges(true);
  }

  async function submitOrder() {
    if (!canCreate) {
      toast.error(t.noPermissionTitle);
      return;
    }

    const nextErrors = validateForm(form, t);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      toast.error(t.createError);
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildPayload(form);

      const response = await fetch(apiUrl("/api/orders/"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRFToken": readCookie("csrftoken"),
          "Accept-Language": locale,
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || result.ok === false || result.success === false) {
        throw new Error(stringify(result.message || t.createError));
      }

      const createdId = getCreatedId(result);

      toast.success(stringify(result.message || t.created));
      setHasUnsavedChanges(false);

      try {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }

      if (createdId) {
        router.push(`/system/orders/${createdId}`);
      } else {
        router.push("/system/orders");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.createError);
    } finally {
      setIsSaving(false);
    }
  }

  function clearForm() {
    if (hasUnsavedChanges && !window.confirm(t.unsaved)) return;

    setForm(initialForm);
    setErrors({});
    setHasUnsavedChanges(false);

    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }

    toast.success(t.draftCleared);
  }

  if (!canCreate) {
    return (
      <div className="w-full space-y-4" dir={isRtl ? "rtl" : "ltr"}>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="flex min-h-[340px] flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-lg bg-muted">
              <XCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">{t.noPermissionTitle}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t.noPermissionDesc}</p>
            <Button asChild className="mt-5 h-9 rounded-lg bg-black px-3 text-white hover:bg-black/90">
              <Link href="/system/orders">
                <ArrowLeft className="h-4 w-4" />
                {t.back}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="h-9 gap-2 rounded-lg px-3">
              <Link href="/system/orders">
                <ArrowLeft className="h-4 w-4" />
                {t.back}
              </Link>
            </Button>
          </div>

          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{t.title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2 rounded-lg px-3"
            onClick={() => void loadLookups()}
            disabled={isLoadingLookups}
          >
            {isLoadingLookups ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2 rounded-lg px-3"
            onClick={clearForm}
          >
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </Button>

          <Button
            type="button"
            className="h-9 gap-2 rounded-lg bg-black px-3 text-white hover:bg-black/90"
            onClick={submitOrder}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? t.saving : t.save}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StepPill active={activeStep === 1} done={stepState.customer} index={1} label={t.stepCustomer} />
        <StepPill active={activeStep === 2} done={stepState.product} index={2} label={t.stepProduct} />
        <StepPill active={activeStep === 3} done={stepState.payment} index={3} label={t.stepPayment} />
        <StepPill active={activeStep === 4} done={stepState.customer && stepState.product && stepState.payment} index={4} label={t.stepReview} />
      </div>

      {loadError ? (
        <Card className="rounded-lg border-red-200 bg-red-50/80 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 text-red-600" />
              <div>
                <p className="font-bold text-red-800">{t.loadError}</p>
                <p className="mt-1 text-sm text-red-700">{loadError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <FormPanel
            title={t.customerSection}
            description={t.customerSectionDesc}
            icon={<UserRound className="h-5 w-5 text-muted-foreground" />}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <SelectInput
                label={t.fields.customer}
                value={form.customer_id}
                onChange={handleCustomerChange}
              >
                <option value="">{t.select}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.label}
                    {customer.subtitle ? ` - ${customer.subtitle}` : ""}
                  </option>
                ))}
              </SelectInput>

              <TextInput
                label={t.fields.customerName}
                value={form.customer_name}
                onChange={(value) => updateField("customer_name", value)}
                error={errors.customer_name}
                disabled={Boolean(form.customer_id)}
              />

              <TextInput
                label={t.fields.customerPhone}
                value={form.customer_phone}
                onChange={(value) => updateField("customer_phone", value)}
                error={errors.customer_phone}
                disabled={Boolean(form.customer_id)}
              />

              <TextInput
                label={t.fields.customerEmail}
                value={form.customer_email}
                onChange={(value) => updateField("customer_email", value)}
                type="email"
                disabled={Boolean(form.customer_id)}
              />

              <TextInput
                label={t.fields.customerCity}
                value={form.customer_city}
                onChange={(value) => updateField("customer_city", value)}
                disabled={Boolean(form.customer_id)}
              />

              <TextInput
                label={t.fields.customerAddress}
                value={form.customer_address}
                onChange={(value) => updateField("customer_address", value)}
                disabled={Boolean(form.customer_id)}
              />
            </div>
          </FormPanel>

          <FormPanel
            title={t.productSection}
            description={t.productSectionDesc}
            icon={<Package className="h-5 w-5 text-muted-foreground" />}
          >
            <div className="mb-4 rounded-lg border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
              <div className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t.contractHint}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SelectInput
                label={t.fields.product}
                value={form.product_id}
                onChange={handleProductChange}
                error={errors.product_id}
              >
                <option value="">{t.select}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.label}
                    {product.subtitle ? ` - ${product.subtitle}` : ""}
                  </option>
                ))}
              </SelectInput>

              <SelectInput
                label={t.fields.orderKind}
                value={form.order_kind}
                onChange={(value) => updateField("order_kind", value as OrderKind)}
              >
                {Object.entries(t.orderKind).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectInput>

              <TextInput
                label={t.fields.quantity}
                value={form.quantity}
                onChange={(value) => updateField("quantity", value)}
                type="number"
                error={errors.quantity}
              />

              <TextInput
                label={t.fields.unitPrice}
                value={form.unit_price}
                onChange={(value) => updateField("unit_price", value)}
                type="number"
                error={errors.unit_price}
              />

              <TextInput
                label={t.fields.discountAmount}
                value={form.discount_amount}
                onChange={(value) => updateField("discount_amount", value)}
                type="number"
                error={errors.discount_amount}
              />

              <TextInput
                label={t.fields.taxAmount}
                value={form.tax_amount}
                onChange={(value) => updateField("tax_amount", value)}
                type="number"
                error={errors.tax_amount}
              />
            </div>
          </FormPanel>

          <FormPanel
            title={t.datesSection}
            description={t.datesSectionDesc}
            icon={<CalendarDays className="h-5 w-5 text-muted-foreground" />}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <TextInput
                label={t.fields.startsAt}
                value={form.starts_at}
                onChange={(value) => updateField("starts_at", value)}
                type="date"
              />

              <TextInput
                label={t.fields.endsAt}
                value={form.ends_at}
                onChange={(value) => updateField("ends_at", value)}
                type="date"
              />

              <TextInput
                label={t.fields.scheduledAt}
                value={form.scheduled_at}
                onChange={(value) => updateField("scheduled_at", value)}
                type="datetime-local"
              />
            </div>
          </FormPanel>

          <FormPanel
            title={t.paymentSection}
            description={t.paymentSectionDesc}
            icon={<Wallet className="h-5 w-5 text-muted-foreground" />}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <SelectInput
                label={t.fields.paymentMethod}
                value={form.payment_method}
                onChange={(value) => updateField("payment_method", value as PaymentMethod)}
              >
                {Object.entries(t.paymentMethods).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectInput>

              <TextInput
                label={t.fields.amountPaid}
                value={form.amount_paid}
                onChange={(value) => updateField("amount_paid", value)}
                type="number"
                error={errors.amount_paid}
                disabled={form.payment_method === "cash_on_delivery"}
              />

              <div className="md:col-span-2">
                <TextInput
                  label={t.fields.paymentReference}
                  value={form.payment_reference}
                  onChange={(value) => updateField("payment_reference", value)}
                  placeholder="TRX / Gateway / Bank reference"
                />
              </div>
            </div>
          </FormPanel>

          <FormPanel
            title={t.agentSection}
            description={t.agentSectionDesc}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {canAssignAgent ? (
                <SelectInput
                  label={t.fields.agent}
                  value={form.agent_id}
                  onChange={(value) => updateField("agent_id", value)}
                >
                  <option value="">{t.select}</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.label}
                      {agent.subtitle ? ` - ${agent.subtitle}` : ""}
                    </option>
                  ))}
                </SelectInput>
              ) : (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {t.agentSectionDesc}
                </div>
              )}

              <TextInput
                label={t.fields.referralCode}
                value={form.referral_code}
                onChange={(value) => updateField("referral_code", value)}
              />
            </div>
          </FormPanel>

          <FormPanel
            title={t.notesSection}
            description={t.notesSectionDesc}
            icon={<FileText className="h-5 w-5 text-muted-foreground" />}
          >
            <div className="grid gap-4">
              <TextAreaInput
                label={t.fields.customerNotes}
                value={form.customer_notes}
                onChange={(value) => updateField("customer_notes", value)}
              />

              <TextAreaInput
                label={t.fields.deliveryNotes}
                value={form.delivery_notes}
                onChange={(value) => updateField("delivery_notes", value)}
              />

              <TextAreaInput
                label={t.fields.internalNotes}
                value={form.internal_notes}
                onChange={(value) => updateField("internal_notes", value)}
              />
            </div>
          </FormPanel>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4 rounded-lg border bg-card shadow-none">
            <CardHeader className="border-b px-4 py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-5 w-5" />
                {t.summary}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t.liveSummary}</p>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              <div className="rounded-lg border bg-muted/20 p-4">
                <SummaryRow
                  label={t.customer}
                  value={
                    selectedCustomer?.label ||
                    form.customer_name ||
                    "—"
                  }
                />

                <SummaryRow
                  label={t.product}
                  value={
                    selectedProduct?.label ||
                    "—"
                  }
                />

                <SummaryRow
                  label={t.orderType}
                  value={t.orderKind[form.order_kind]}
                />

                <SummaryRow
                  label={t.method}
                  value={t.paymentMethods[form.payment_method]}
                />

                <SummaryRow
                  label={t.quantity}
                  value={formatMoney(quantity)}
                />

                <SummaryRow
                  label={t.unitPrice}
                  value={<SarAmount value={unitPrice} />}
                />

                <SummaryRow
                  label={t.subtotal}
                  value={<SarAmount value={subtotalAmount} />}
                />

                <SummaryRow
                  label={t.discount}
                  value={<SarAmount value={discountAmount} />}
                />

                <SummaryRow
                  label={t.tax}
                  value={<SarAmount value={taxAmount} />}
                />

                <SummaryRow
                  label={t.total}
                  value={<SarAmount value={totalAmount} />}
                />

                <SummaryRow
                  label={t.paid}
                  value={<SarAmount value={amountPaid} />}
                />

                <SummaryRow
                  label={t.remaining}
                  value={<SarAmount value={remainingAmount} />}
                />

                {canAssignAgent ? (
                  <SummaryRow
                    label={t.fields.agent}
                    value={selectedAgent?.label || "—"}
                  />
                ) : null}
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                <div className="flex gap-2">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{t.contractHint}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-semibold">{t.optionsSection}</p>

                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={form.create_invoice}
                    onCheckedChange={(checked) => updateField("create_invoice", Boolean(checked))}
                  />
                  <span>{t.fields.createInvoice}</span>
                </label>

                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={form.issue_invoice_immediately}
                    onCheckedChange={(checked) =>
                      updateField("issue_invoice_immediately", Boolean(checked))
                    }
                    disabled={!form.create_invoice}
                  />
                  <span>{t.fields.issueInvoice}</span>
                </label>

                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={form.notify_customer}
                    onCheckedChange={(checked) => updateField("notify_customer", Boolean(checked))}
                  />
                  <span>{t.fields.notifyCustomer}</span>
                </label>
              </div>

              <Button
                type="button"
                onClick={submitOrder}
                disabled={isSaving}
                className="h-10 w-full rounded-lg bg-black text-white hover:bg-black/90"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? t.saving : t.save}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/system/orders")}
                className="h-10 w-full rounded-lg"
              >
                {t.back}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}