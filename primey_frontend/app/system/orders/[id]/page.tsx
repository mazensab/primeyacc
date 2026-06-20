"use client";

/* ============================================================
   📂 app/system/orders/[id]/page.tsx
   🧠 Primey Care | Premium Order Details
   ------------------------------------------------------------
   ✅ Golden Products/Customers operational pattern
   ✅ Real data from /api/orders/{id}/
   ✅ Lifecycle actions through /api/orders/{id}/status/
   ✅ Delivery agent assignment
   ✅ COD cash collection without visible custody alert card
   ✅ Timeline
   ✅ Web PDF print
   ✅ SAR icon
   ✅ sonner
   ✅ Arabic / English via primey-locale
   ✅ English numerals
   ✅ No fake rows
   ✅ No localhost
============================================================ */

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CheckCircle,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Edit3,
  FileText,
  Loader2,
  Package,
  Printer,
  ReceiptText,
  RefreshCw,
  Send,
  ShoppingBag,
  Truck,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Locale = "ar" | "en";

type AuthRecord = Record<string, unknown>;

type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "processing"
  | "card_ready"
  | "assigned_for_delivery"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded"
  | "UNKNOWN";

type PaymentStatus =
  | "unpaid"
  | "pending"
  | "cod_pending"
  | "partial"
  | "partially_paid"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled"
  | "UNKNOWN";

type FulfillmentStatus =
  | "not_started"
  | "pending"
  | "in_progress"
  | "issued"
  | "ready"
  | "assigned"
  | "out_for_delivery"
  | "delivered"
  | "fulfilled"
  | "failed"
  | "returned"
  | "cancelled"
  | "UNKNOWN";

type PaymentMethod =
  | "cash"
  | "cash_on_delivery"
  | "bank_transfer"
  | "gateway"
  | "card"
  | "wallet"
  | "tamara"
  | "tabby"
  | "UNKNOWN";

type LifecycleAction =
  | "confirm"
  | "processing"
  | "mark_card_printed"
  | "mark_card_ready"
  | "assign_delivery"
  | "start_delivery"
  | "confirm_delivery"
  | "collect_cash"
  | "complete"
  | "cancel"
  | "refund";

type AgentOption = {
  id: string;
  name: string;
  code: string;
  phone: string;
};

type TimelineEvent = {
  id: string;
  eventType: string;
  title: string;
  description: string;
  fromStatus: string;
  toStatus: string;
  amount: number;
  actorName: string;
  agentName: string;
  deliveryAgentName: string;
  createdAt: string;
};

type OrderItem = {
  id: string;
  name: string;
  providerName: string;
  status: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type OrderDetail = {
  id: string;
  orderNumber: string;

  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;

  productName: string;
  productType: string;
  providerName: string;
  contractNumber: string;
  invoiceNumber: string;
  invoiceId: string;

  agentName: string;
  agentCode: string;
  deliveryAgentName: string;
  deliveryAgentId: string;

  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  paymentMethod: PaymentMethod;
  orderKind: string;
  source: string;

  startsAt: string;
  endsAt: string;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;

  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  agentCommission: number;

  cashCollectedAmount: number;
  cashCollectedAt: string;
  cashCollectedByName: string;

  notes: string;
  internalNotes: string;
  deliveryNotes: string;
  cancellationReason: string;

  availableActions: string[];
  timeline: TimelineEvent[];
  items: OrderItem[];

  raw: Record<string, unknown>;
};

type OrderResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  order?: unknown;
  item?: unknown;
};

type StatusResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  order?: unknown;
};

const SAR_ICON = "/currency/sar.svg";

const TEXT = {
  ar: {
    title: "تفاصيل الطلب",
    subtitle: "متابعة الطلب والدفع والتوصيل والتحصيل من صفحة واحدة.",
    back: "الطلبات",
    refresh: "تحديث",
    print: "طباعة",
    copy: "نسخ",
    copied: "تم النسخ",
    loading: "جاري تحميل تفاصيل الطلب...",
    notFoundTitle: "الطلب غير موجود",
    notFoundDesc: "لم يتم العثور على الطلب المطلوب أو قد لا تملك صلاحية الوصول إليه.",
    errorTitle: "تعذر تحميل الطلب",
    retry: "إعادة المحاولة",

    orderSummary: "ملخص الطلب",
    customer: "العميل",
    payment: "الدفع",
    delivery: "التوصيل",
    items: "عناصر الطلب",
    timeline: "سجل الحركة",
    lifecycle: "إجراءات الطلب",
    financial: "الملخص المالي",
    notes: "الملاحظات",
    customerAddress: "عنوان العميل",

    product: "المنتج",
    provider: "مقدم الخدمة",
    contract: "العقد",
    invoice: "الفاتورة",
    orderNo: "رقم الطلب",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    startDate: "بداية الاشتراك",
    endDate: "نهاية الاشتراك",
    scheduledAt: "الموعد",
    source: "المصدر",
    type: "النوع",

    subtotal: "الإجمالي قبل الضريبة",
    discount: "الخصم",
    tax: "الضريبة",
    total: "الإجمالي",
    paid: "المدفوع",
    remaining: "المتبقي",
    commission: "عمولة المندوب",
    cashCollected: "الكاش المحصل",

    paymentMethod: "طريقة الدفع",
    paymentStatus: "حالة الدفع",
    orderStatus: "حالة الطلب",
    fulfillmentStatus: "حالة التنفيذ",

    salesAgent: "مندوب البيع",
    deliveryAgent: "مندوب التوصيل",
    noAgent: "غير مسند",
    selectAgent: "اختر مندوب التوصيل",
    actionNote: "ملاحظة الإجراء",
    cashAmount: "مبلغ التحصيل",

    confirm: "تأكيد الطلب",
    processing: "بدء المعالجة",
    printed: "طباعة البطاقة",
    ready: "جاهزية البطاقة",
    assignDelivery: "إسناد التوصيل",
    startDelivery: "خارج للتوصيل",
    confirmDelivery: "تأكيد التسليم",
    collectCash: "تحصيل الكاش",
    complete: "إكمال الطلب",
    cancel: "إلغاء الطلب",
    refund: "استرجاع",
    runAction: "تنفيذ",
    confirmAction: "هل تريد تنفيذ هذا الإجراء؟",
    actionSuccess: "تم تنفيذ الإجراء",
    actionError: "تعذر تنفيذ الإجراء",
    loadAgentsError: "تعذر تحميل مندوبي التوصيل",
    chooseAgentFirst: "اختر مندوب التوصيل أولًا",

    table: {
      item: "العنصر",
      provider: "مقدم الخدمة",
      status: "الحالة",
      qty: "الكمية",
      unitPrice: "سعر الوحدة",
      total: "الإجمالي",
    },
    progress: {
      confirmed: "مؤكد",
      ready: "جاهز",
      assigned: "مسند",
      out: "خارج للتوصيل",
      delivered: "تم التسليم",
    },
    emptyTimeline: "لا توجد حركات مسجلة بعد.",
    emptyItems: "لا توجد عناصر مسجلة لهذا الطلب.",
  },
  en: {
    title: "Order Details",
    subtitle: "Track order, payment, delivery, and collection from one page.",
    back: "Orders",
    refresh: "Refresh",
    print: "Print",
    copy: "Copy",
    copied: "Copied",
    loading: "Loading order details...",
    notFoundTitle: "Order not found",
    notFoundDesc: "The requested order was not found or you may not have access.",
    errorTitle: "Unable to load order",
    retry: "Retry",

    orderSummary: "Order Summary",
    customer: "Customer",
    payment: "Payment",
    delivery: "Delivery",
    items: "Order Items",
    timeline: "Timeline",
    lifecycle: "Order Actions",
    financial: "Financial Summary",
    notes: "Notes",
    customerAddress: "Customer Address",

    product: "Product",
    provider: "Provider",
    contract: "Contract",
    invoice: "Invoice",
    orderNo: "Order No.",
    createdAt: "Created At",
    updatedAt: "Updated At",
    startDate: "Start Date",
    endDate: "End Date",
    scheduledAt: "Scheduled At",
    source: "Source",
    type: "Type",

    subtotal: "Subtotal",
    discount: "Discount",
    tax: "Tax",
    total: "Total",
    paid: "Paid",
    remaining: "Remaining",
    commission: "Agent Commission",
    cashCollected: "Cash Collected",

    paymentMethod: "Payment Method",
    paymentStatus: "Payment Status",
    orderStatus: "Order Status",
    fulfillmentStatus: "Fulfillment Status",

    salesAgent: "Sales Agent",
    deliveryAgent: "Delivery Agent",
    noAgent: "Unassigned",
    selectAgent: "Select delivery agent",
    actionNote: "Action note",
    cashAmount: "Cash amount",

    confirm: "Confirm Order",
    processing: "Start Processing",
    printed: "Print Card",
    ready: "Card Ready",
    assignDelivery: "Assign Delivery",
    startDelivery: "Out for Delivery",
    confirmDelivery: "Confirm Delivery",
    collectCash: "Collect Cash",
    complete: "Complete Order",
    cancel: "Cancel Order",
    refund: "Refund",
    runAction: "Run",
    confirmAction: "Do you want to perform this action?",
    actionSuccess: "Action completed",
    actionError: "Unable to perform action",
    loadAgentsError: "Unable to load delivery agents",
    chooseAgentFirst: "Select delivery agent first",

    table: {
      item: "Item",
      provider: "Provider",
      status: "Status",
      qty: "Qty",
      unitPrice: "Unit Price",
      total: "Total",
    },
    progress: {
      confirmed: "Confirmed",
      ready: "Ready",
      assigned: "Assigned",
      out: "Out for Delivery",
      delivered: "Delivered",
    },
    emptyTimeline: "No timeline events yet.",
    emptyItems: "No items registered for this order.",
  },
} as const;

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

function readLocale(): Locale {
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
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

function readNested(source: Record<string, unknown>, keys: string[]) {
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

function unwrapOrder(payload: unknown) {
  const wrapper = asRecord(payload);
  const data = asRecord(wrapper.data);

  if (data.order) return data.order;
  if (wrapper.order) return wrapper.order;
  if (wrapper.item) return wrapper.item;
  if (wrapper.data) return wrapper.data;

  return payload;
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

  for (const item of candidates) {
    if (Array.isArray(item)) return item;
  }

  return [];
}

function normalizeStatus(value: unknown): OrderStatus {
  const status = stringify(value).toLowerCase();

  if (status === "draft") return "draft";
  if (status === "pending") return "pending";
  if (status === "confirmed") return "confirmed";
  if (status === "processing") return "processing";
  if (status === "card_ready") return "card_ready";
  if (status === "assigned_for_delivery") return "assigned_for_delivery";
  if (status === "out_for_delivery") return "out_for_delivery";
  if (status === "delivered") return "delivered";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "refunded") return "refunded";

  return "UNKNOWN";
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const status = stringify(value).toLowerCase();

  if (status === "unpaid") return "unpaid";
  if (status === "pending") return "pending";
  if (status === "cod_pending") return "cod_pending";
  if (status === "partial") return "partial";
  if (status === "partially_paid") return "partially_paid";
  if (status === "paid") return "paid";
  if (status === "failed") return "failed";
  if (status === "refunded") return "refunded";
  if (status === "cancelled" || status === "canceled") return "cancelled";

  return "UNKNOWN";
}

function normalizeFulfillmentStatus(value: unknown): FulfillmentStatus {
  const status = stringify(value).toLowerCase();

  if (status === "not_started") return "not_started";
  if (status === "pending") return "pending";
  if (status === "in_progress") return "in_progress";
  if (status === "issued") return "issued";
  if (status === "ready") return "ready";
  if (status === "assigned") return "assigned";
  if (status === "out_for_delivery") return "out_for_delivery";
  if (status === "delivered") return "delivered";
  if (status === "fulfilled") return "fulfilled";
  if (status === "failed") return "failed";
  if (status === "returned") return "returned";
  if (status === "cancelled" || status === "canceled") return "cancelled";

  return "UNKNOWN";
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  const method = stringify(value).toLowerCase();

  if (method === "cash") return "cash";
  if (method === "cash_on_delivery" || method === "cod") return "cash_on_delivery";
  if (method === "bank_transfer") return "bank_transfer";
  if (method === "gateway") return "gateway";
  if (method === "card") return "card";
  if (method === "wallet") return "wallet";
  if (method === "tamara") return "tamara";
  if (method === "tabby") return "tabby";

  return "UNKNOWN";
}

function normalizeTimelineEvent(value: unknown): TimelineEvent {
  const obj = asRecord(value);
  const agent = asRecord(obj.agent);
  const deliveryAgent = asRecord(obj.delivery_agent);

  return {
    id: stringify(obj.id),
    eventType: stringify(obj.event_type ?? obj.type ?? obj.code),
    title: stringify(obj.title ?? obj.event_type ?? obj.type),
    description: stringify(obj.description ?? obj.note ?? obj.notes),
    fromStatus: stringify(obj.from_status),
    toStatus: stringify(obj.to_status),
    amount: toNumber(obj.amount),
    actorName: stringify(obj.actor_name ?? obj.changed_by_name ?? obj.user_name),
    agentName: stringify(obj.agent_name ?? agent.name),
    deliveryAgentName: stringify(obj.delivery_agent_name ?? deliveryAgent.name),
    createdAt: stringify(obj.created_at ?? obj.timestamp ?? obj.date),
  };
}

function normalizeOrderItem(value: unknown): OrderItem {
  const obj = asRecord(value);
  const product = asRecord(obj.product);
  const provider = asRecord(obj.provider);

  const quantity = toNumber(obj.quantity ?? obj.qty ?? 1);
  const unitPrice = toNumber(obj.unit_price ?? obj.price ?? obj.amount);
  const total = toNumber(obj.total ?? obj.total_amount ?? unitPrice * quantity);

  return {
    id: stringify(obj.id ?? obj.pk),
    name: stringify(
      obj.name ??
        obj.product_name ??
        obj.service_name ??
        obj.item_name ??
        product.name_ar ??
        product.name ??
        "-"
    ),
    providerName: stringify(
      obj.provider_name ?? provider.name_ar ?? provider.name ?? obj.center_name
    ),
    status: stringify(obj.status ?? obj.fulfillment_status ?? obj.execution_status ?? "-"),
    quantity,
    unitPrice,
    total,
  };
}

function normalizeOrderDetail(payload: unknown): OrderDetail {
  const obj = asRecord(unwrapOrder(payload));

  const totalAmount = toNumber(
    readNested(obj, ["total_amount", "grand_total", "final_amount", "amount", "total"])
  );
  const paidAmount = toNumber(
    readNested(obj, ["paid_amount", "amount_paid", "payment.paid_amount"])
  );

  const itemsRaw = Array.isArray(obj.items)
    ? obj.items
    : Array.isArray(obj.order_items)
      ? obj.order_items
      : Array.isArray(obj.lines)
        ? obj.lines
        : [];

  const timelineRaw = Array.isArray(obj.timeline)
    ? obj.timeline
    : Array.isArray(obj.status_history)
      ? obj.status_history
      : Array.isArray(obj.events)
        ? obj.events
        : [];

  const paymentMethod = normalizePaymentMethod(
    readNested(obj, ["payment_method", "payment.method", "method"])
  );

  const id = stringify(obj.id ?? obj.pk);

  return {
    id,
    orderNumber: stringify(
      readNested(obj, ["order_number", "number", "reference", "code"]) ||
        (id ? `ORD-${id}` : "-")
    ),

    customerName: stringify(
      readNested(obj, [
        "customer_name",
        "customer.display_name",
        "customer.full_name",
        "customer.name",
        "customer.user.full_name",
        "customer.user.name",
      ]) || "-"
    ),
    customerPhone: stringify(
      readNested(obj, [
        "customer_phone",
        "phone",
        "mobile",
        "customer.normalized_phone",
        "customer.phone",
        "customer.mobile",
        "customer.whatsapp_number",
        "customer.user.phone",
      ])
    ),
    customerEmail: stringify(
      readNested(obj, ["customer_email", "email", "customer.email", "customer.user.email"])
    ),
    customerAddress: stringify(
      readNested(obj, [
        "customer_address",
        "address",
        "delivery_address",
        "customer.address",
        "customer.city",
      ])
    ),

    productName: stringify(
      readNested(obj, [
        "product_name",
        "product.name_ar",
        "product.name_en",
        "product.name",
        "product.title",
        "program_name",
        "service_name",
      ]) || "-"
    ),
    productType: stringify(
      readNested(obj, ["product_type", "product.product_type", "order_kind", "type"])
    ),
    providerName: stringify(
      readNested(obj, [
        "provider_name",
        "center_name",
        "provider.name_ar",
        "provider.name_en",
        "provider.name",
        "center.name_ar",
        "center.name",
      ])
    ),
    contractNumber: stringify(
      readNested(obj, ["contract_number", "contract.number", "contract.reference"])
    ),
    invoiceNumber: stringify(
      readNested(obj, ["invoice_number", "invoice.number", "invoice.invoice_number"])
    ),
    invoiceId: stringify(readNested(obj, ["invoice_id", "invoice.id"])),

    agentName: stringify(
      readNested(obj, [
        "agent_name",
        "sales_agent_name",
        "agent.name",
        "sales_agent.name",
        "agent.user.full_name",
      ])
    ),
    agentCode: stringify(readNested(obj, ["agent_code", "agent.code", "sales_agent.code"])),
    deliveryAgentName: stringify(
      readNested(obj, [
        "delivery_agent_name",
        "delivery_agent.name",
        "delivery_agent.user.full_name",
      ])
    ),
    deliveryAgentId: stringify(readNested(obj, ["delivery_agent_id", "delivery_agent.id"])),

    status: normalizeStatus(readNested(obj, ["status", "order_status"])),
    paymentStatus: normalizePaymentStatus(
      readNested(obj, ["payment_status", "payment.status"])
    ),
    fulfillmentStatus: normalizeFulfillmentStatus(
      readNested(obj, ["fulfillment_status", "execution_status", "fulfillment.status"])
    ),
    paymentMethod,
    orderKind: stringify(readNested(obj, ["order_kind", "kind", "type"])),
    source: stringify(readNested(obj, ["source", "channel", "created_from"])),

    startsAt: stringify(readNested(obj, ["starts_at", "start_date", "valid_from"])),
    endsAt: stringify(readNested(obj, ["ends_at", "end_date", "valid_to"])),
    scheduledAt: stringify(readNested(obj, ["scheduled_at", "appointment_at"])),
    createdAt: stringify(readNested(obj, ["created_at", "created", "date", "ordered_at"])),
    updatedAt: stringify(readNested(obj, ["updated_at", "modified_at"])),

    subtotalAmount: toNumber(readNested(obj, ["subtotal_amount", "subtotal"])),
    discountAmount: toNumber(readNested(obj, ["discount_amount", "discount"])),
    taxAmount: toNumber(readNested(obj, ["tax_amount", "vat_amount", "tax"])),
    totalAmount,
    paidAmount,
    remainingAmount: toNumber(
      readNested(obj, ["remaining_amount", "remaining", "balance"]) ||
        Math.max(totalAmount - paidAmount, 0)
    ),
    agentCommission: toNumber(readNested(obj, ["agent_commission", "commission_amount"])),

    cashCollectedAmount: toNumber(
      readNested(obj, ["cash_collected_amount", "collected_cash", "cod_collected_amount"])
    ),
    cashCollectedAt: stringify(readNested(obj, ["cash_collected_at", "cod_collected_at"])),
    cashCollectedByName: stringify(
      readNested(obj, ["cash_collected_by_name", "cash_collector_name"])
    ),

    notes: stringify(readNested(obj, ["notes", "note"])),
    internalNotes: stringify(readNested(obj, ["internal_notes"])),
    deliveryNotes: stringify(readNested(obj, ["delivery_notes"])),
    cancellationReason: stringify(readNested(obj, ["cancellation_reason"])),

    availableActions: Array.isArray(obj.available_actions)
      ? obj.available_actions.map((item) => stringify(item)).filter(Boolean)
      : [],
    timeline: timelineRaw.map(normalizeTimelineEvent),
    items: itemsRaw.map(normalizeOrderItem),

    raw: obj,
  };
}

function normalizeAgent(value: unknown): AgentOption {
  const obj = asRecord(value);
  const user = asRecord(obj.user);

  return {
    id: stringify(obj.id ?? obj.pk),
    name: stringify(obj.name ?? obj.full_name ?? user.full_name ?? user.name ?? "-"),
    code: stringify(obj.code ?? obj.agent_code),
    phone: stringify(obj.phone ?? obj.mobile ?? user.phone),
  };
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
    if (value && typeof value === "object") return value as AuthRecord;
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0
  );
}

function formatDate(value: string, locale: Locale) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(value: string, locale: Locale) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value: unknown) {
  return stringify(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function labelMap(value: string, locale: Locale) {
  const labels: Record<string, { ar: string; en: string }> = {
    draft: { ar: "مسودة", en: "Draft" },
    pending: { ar: "قيد الانتظار", en: "Pending" },
    confirmed: { ar: "مؤكد", en: "Confirmed" },
    processing: { ar: "قيد المعالجة", en: "Processing" },
    card_ready: { ar: "جاهز للتوصيل", en: "Ready" },
    assigned_for_delivery: { ar: "مسند للتوصيل", en: "Assigned" },
    out_for_delivery: { ar: "خارج للتوصيل", en: "Out for delivery" },
    delivered: { ar: "تم التسليم", en: "Delivered" },
    completed: { ar: "مكتمل", en: "Completed" },
    cancelled: { ar: "ملغي", en: "Cancelled" },
    refunded: { ar: "مسترجع", en: "Refunded" },
    unpaid: { ar: "غير مدفوع", en: "Unpaid" },
    cod_pending: { ar: "تحصيل عند الاستلام", en: "COD pending" },
    partial: { ar: "جزئي", en: "Partial" },
    partially_paid: { ar: "جزئي", en: "Partial" },
    paid: { ar: "مدفوع", en: "Paid" },
    failed: { ar: "فشل", en: "Failed" },
    not_started: { ar: "لم يبدأ", en: "Not started" },
    in_progress: { ar: "قيد التنفيذ", en: "In progress" },
    issued: { ar: "مصدر", en: "Issued" },
    ready: { ar: "جاهز", en: "Ready" },
    assigned: { ar: "مسند", en: "Assigned" },
    fulfilled: { ar: "منفذ", en: "Fulfilled" },
    returned: { ar: "مرتجع", en: "Returned" },
    cash: { ar: "نقدي", en: "Cash" },
    cash_on_delivery: { ar: "الدفع عند الاستلام", en: "Cash on delivery" },
    bank_transfer: { ar: "تحويل بنكي", en: "Bank transfer" },
    gateway: { ar: "بوابة دفع", en: "Gateway" },
    card: { ar: "بطاقة", en: "Card" },
    wallet: { ar: "محفظة", en: "Wallet" },
    tamara: { ar: "تمارا", en: "Tamara" },
    tabby: { ar: "تابي", en: "Tabby" },
    UNKNOWN: { ar: "غير محدد", en: "Unknown" },
  };

  return labels[value]?.[locale] || value.replaceAll("_", " ");
}

function badgeClass(status: string) {
  if (["completed", "delivered", "paid", "fulfilled", "ready"].includes(status)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700";
  }

  if (
    [
      "confirmed",
      "processing",
      "card_ready",
      "assigned_for_delivery",
      "out_for_delivery",
      "in_progress",
      "assigned",
      "issued",
    ].includes(status)
  ) {
    return "border-sky-500/30 bg-sky-50 text-sky-700";
  }

  if (["pending", "unpaid", "cod_pending", "partial", "partially_paid"].includes(status)) {
    return "border-orange-500/30 bg-orange-50 text-orange-700";
  }

  if (["cancelled", "failed", "refunded", "returned"].includes(status)) {
    return "border-red-500/30 bg-red-50 text-red-700";
  }

  return "border-muted bg-muted/40 text-muted-foreground";
}

function StatusBadge({ value, locale }: { value: string; locale: Locale }) {
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-1", badgeClass(value))}>
      {labelMap(value, locale)}
    </Badge>
  );
}

function SarAmount({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold tabular-nums">
      <span>{formatNumber(value)}</span>
      <img src={SAR_ICON} alt="SAR" className="h-3.5 w-3.5 opacity-80" />
    </span>
  );
}

function InfoRow({
  label,
  value,
  copyValue,
}: {
  label: string;
  value: React.ReactNode;
  copyValue?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex max-w-[65%] items-center gap-2 text-end text-sm font-medium">
        <div className="break-words">{value || "—"}</div>
        {copyValue ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-lg"
            onClick={() => {
              navigator.clipboard.writeText(copyValue);
              toast.success(TEXT[readLocale()].copied);
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function PremiumCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 border-b px-4 py-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function MoneyCard({
  title,
  value,
  icon,
  hint,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 space-y-2">
          <div className="truncate text-sm text-muted-foreground">{title}</div>
          <div className="text-2xl font-bold">
            <SarAmount value={value} />
          </div>
          {hint ? <div className="truncate text-xs text-muted-foreground">{hint}</div> : null}
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function progressValue(order: OrderDetail) {
  const status = order.status;

  if (status === "delivered" || status === "completed") return 100;
  if (status === "out_for_delivery") return 78;
  if (status === "assigned_for_delivery") return 58;
  if (status === "card_ready") return 38;
  if (status === "confirmed" || status === "processing") return 18;

  return 5;
}

function stepDone(order: OrderDetail, step: string) {
  const orderRank: Record<string, number> = {
    pending: 0,
    confirmed: 1,
    processing: 1,
    card_ready: 2,
    assigned_for_delivery: 3,
    out_for_delivery: 4,
    delivered: 5,
    completed: 5,
  };

  const stepRank: Record<string, number> = {
    confirmed: 1,
    ready: 2,
    assigned: 3,
    out: 4,
    delivered: 5,
  };

  return (orderRank[order.status] ?? 0) >= (stepRank[step] ?? 0);
}

function DetailSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="h-28 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default function SystemOrderDetailsPage() {
  const params = useParams<{ id?: string | string[] }>();
  const authContext = useAuth() as unknown;

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [agents, setAgents] = React.useState<AgentOption[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [agentsLoading, setAgentsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notFound, setNotFound] = React.useState(false);

  const [selectedDeliveryAgentId, setSelectedDeliveryAgentId] = React.useState("");
  const [actionNote, setActionNote] = React.useState("");
  const [cashAmount, setCashAmount] = React.useState("");

  const orderId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";
  const t = TEXT[locale];
  const isRtl = locale === "ar";

  const canView = hasPermission(authContext, ["orders.view"], "view");
  const canAct = hasPermission(
    authContext,
    [
      "orders.update_status",
      "orders.change_status",
      "orders.manage_lifecycle",
      "orders.manage_delivery",
    ],
    "action"
  );
  const canAssignDelivery = hasPermission(
    authContext,
    ["orders.assign_delivery", "orders.delivery.assign", "agents.view"],
    "action"
  );
  const canPrint = hasPermission(authContext, ["orders.print", "orders.export", "orders.view"], "view");

  const availableActions = React.useMemo(() => {
    if (!order) return new Set<string>();
    return new Set(order.availableActions);
  }, [order]);

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

  const loadOrder = React.useCallback(
    async (showToast = false) => {
      if (!orderId || !canView) return;

      if (showToast) setRefreshing(true);
      else setLoading(true);

      setError("");
      setNotFound(false);

      try {
        const response = await fetch(apiUrl(`/api/orders/${orderId}/`), {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Accept-Language": locale,
          },
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => ({}))) as OrderResponse;

        if (response.status === 404) {
          setOrder(null);
          setNotFound(true);
          return;
        }

        if (!response.ok || payload.ok === false || payload.success === false) {
          throw new Error(stringify(payload.message || t.errorTitle));
        }

        const normalized = normalizeOrderDetail(payload);
        setOrder(normalized);
        setSelectedDeliveryAgentId(normalized.deliveryAgentId);
        setCashAmount(
          String(
            normalized.remainingAmount > 0
              ? normalized.remainingAmount.toFixed(2)
              : normalized.totalAmount.toFixed(2)
          )
        );

        if (showToast) toast.success(locale === "ar" ? "تم تحديث الطلب" : "Order refreshed");
      } catch (loadError) {
        setOrder(null);
        setError(loadError instanceof Error ? loadError.message : t.errorTitle);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canView, locale, orderId, t.errorTitle]
  );

  const loadAgents = React.useCallback(async () => {
    if (!canAssignDelivery) return;

    setAgentsLoading(true);

    try {
      const response = await fetch(apiUrl("/api/agents/?page_size=100"), {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Accept-Language": locale,
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(t.loadAgentsError);

      setAgents(unwrapList(payload).map(normalizeAgent).filter((agent) => agent.id));
    } catch {
      toast.error(t.loadAgentsError);
      setAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  }, [canAssignDelivery, locale, t.loadAgentsError]);

  React.useEffect(() => {
    void loadOrder(false);
  }, [loadOrder]);

  React.useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const performAction = React.useCallback(
    async (action: LifecycleAction, extraPayload: Record<string, unknown> = {}) => {
      if (!order || !orderId || !canAct) return;

      if (!window.confirm(t.confirmAction)) return;

      setActionLoading(true);

      try {
        const response = await fetch(apiUrl(`/api/orders/${orderId}/status/`), {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRFToken": readCookie("csrftoken"),
            "Accept-Language": locale,
          },
          body: JSON.stringify({
            action,
            note: actionNote.trim(),
            ...extraPayload,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as StatusResponse;

        if (!response.ok || payload.ok === false || payload.success === false) {
          throw new Error(stringify(payload.message || t.actionError));
        }

        setOrder(normalizeOrderDetail(payload.order || payload.data || payload));
        setActionNote("");
        toast.success(stringify(payload.message || t.actionSuccess));
      } catch (actionError) {
        toast.error(actionError instanceof Error ? actionError.message : t.actionError);
      } finally {
        setActionLoading(false);
      }
    },
    [actionNote, canAct, locale, order, orderId, t.actionError, t.actionSuccess, t.confirmAction]
  );

  const handleAssignDelivery = () => {
    if (!selectedDeliveryAgentId) {
      toast.warning(t.chooseAgentFirst);
      return;
    }

    void performAction("assign_delivery", {
      delivery_agent_id: selectedDeliveryAgentId,
    });
  };

  const handleConfirmDelivery = () => {
    void performAction("confirm_delivery", {
      cash_collected_amount: toNumber(cashAmount),
    });
  };

  const handleCollectCash = () => {
    void performAction("collect_cash", {
      amount: toNumber(cashAmount),
      cash_collected_amount: toNumber(cashAmount),
    });
  };

  const handlePrint = React.useCallback(() => {
    if (!order) return;

    const html = `
      <!doctype html>
      <html lang="${locale}" dir="${isRtl ? "rtl" : "ltr"}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(order.orderNumber)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 28px; color: #111827; }
            .header { display:flex; justify-content:space-between; gap:16px; border-bottom:1px solid #e5e7eb; padding-bottom:16px; margin-bottom:20px; }
            h1 { margin:0; font-size:24px; }
            h2 { margin:24px 0 12px; font-size:16px; }
            .muted { color:#6b7280; font-size:12px; }
            .badge { display:inline-block; padding:4px 10px; border:1px solid #d1d5db; border-radius:999px; margin-inline-start:6px; font-size:12px; }
            table { width:100%; border-collapse:collapse; margin-bottom:18px; }
            th, td { border:1px solid #e5e7eb; padding:10px; font-size:12px; text-align:${isRtl ? "right" : "left"}; }
            th { background:#f9fafb; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${escapeHtml(t.title)} - ${escapeHtml(order.orderNumber)}</h1>
              <div class="muted">${escapeHtml(formatDateTime(order.createdAt, locale))}</div>
            </div>
            <div>
              <span class="badge">${escapeHtml(labelMap(order.status, locale))}</span>
              <span class="badge">${escapeHtml(labelMap(order.paymentStatus, locale))}</span>
            </div>
          </div>

          <h2>${escapeHtml(t.orderSummary)}</h2>
          <table>
            <tr><th>${escapeHtml(t.customer)}</th><td>${escapeHtml(order.customerName)}</td></tr>
            <tr><th>${escapeHtml(t.product)}</th><td>${escapeHtml(order.productName)}</td></tr>
            <tr><th>${escapeHtml(t.provider)}</th><td>${escapeHtml(order.providerName || "-")}</td></tr>
            <tr><th>${escapeHtml(t.salesAgent)}</th><td>${escapeHtml(order.agentName || "-")}</td></tr>
            <tr><th>${escapeHtml(t.deliveryAgent)}</th><td>${escapeHtml(order.deliveryAgentName || "-")}</td></tr>
          </table>

          <h2>${escapeHtml(t.financial)}</h2>
          <table>
            <tr><th>${escapeHtml(t.total)}</th><td>${escapeHtml(formatNumber(order.totalAmount))}</td></tr>
            <tr><th>${escapeHtml(t.paid)}</th><td>${escapeHtml(formatNumber(order.paidAmount))}</td></tr>
            <tr><th>${escapeHtml(t.remaining)}</th><td>${escapeHtml(formatNumber(order.remainingAmount))}</td></tr>
            <tr><th>${escapeHtml(t.cashCollected)}</th><td>${escapeHtml(formatNumber(order.cashCollectedAmount))}</td></tr>
          </table>

          <h2>${escapeHtml(t.items)}</h2>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.table.item)}</th>
                <th>${escapeHtml(t.table.provider)}</th>
                <th>${escapeHtml(t.table.status)}</th>
                <th>${escapeHtml(t.table.qty)}</th>
                <th>${escapeHtml(t.table.unitPrice)}</th>
                <th>${escapeHtml(t.table.total)}</th>
              </tr>
            </thead>
            <tbody>
              ${
                order.items.length
                  ? order.items
                      .map(
                        (item) => `
                          <tr>
                            <td>${escapeHtml(item.name)}</td>
                            <td>${escapeHtml(item.providerName || "-")}</td>
                            <td>${escapeHtml(labelMap(item.status, locale))}</td>
                            <td>${escapeHtml(item.quantity)}</td>
                            <td>${escapeHtml(formatNumber(item.unitPrice))}</td>
                            <td>${escapeHtml(formatNumber(item.total))}</td>
                          </tr>
                        `
                      )
                      .join("")
                  : `<tr><td colspan="6">${escapeHtml(t.emptyItems)}</td></tr>`
              }
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1100,height=800");

    if (!printWindow) {
      toast.error(locale === "ar" ? "تعذر فتح نافذة الطباعة" : "Unable to open print window");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [isRtl, locale, order, t]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (notFound) {
    return (
      <div className="w-full space-y-4">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-lg bg-muted">
              <XCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">{t.notFoundTitle}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t.notFoundDesc}</p>
            <Button asChild className="mt-5 h-9 rounded-lg bg-black text-white hover:bg-black/90">
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

  if (error || !order) {
    return (
      <div className="w-full space-y-4">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <XCircle className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold">{t.errorTitle}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{error || t.errorTitle}</p>
            <Button
              className="mt-5 h-9 rounded-lg"
              variant="outline"
              onClick={() => void loadOrder(true)}
            >
              <RefreshCw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps = [
    { key: "confirmed", label: t.progress.confirmed },
    { key: "ready", label: t.progress.ready },
    { key: "assigned", label: t.progress.assigned },
    { key: "out", label: t.progress.out },
    { key: "delivered", label: t.progress.delivered },
  ];

  const canRun = canAct && !actionLoading;

  return (
    <div className="w-full space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="h-9 gap-2 rounded-lg px-3">
              <Link href="/system/orders">
                <ArrowLeft className="h-4 w-4" />
                {t.back}
              </Link>
            </Button>

            <StatusBadge value={order.status} locale={locale} />
            <StatusBadge value={order.paymentStatus} locale={locale} />
            <StatusBadge value={order.fulfillmentStatus} locale={locale} />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
              {t.title} #{order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-9 gap-2 rounded-lg px-3"
            onClick={() => void loadOrder(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          {canPrint ? (
            <Button
              variant="outline"
              className="h-9 gap-2 rounded-lg px-3"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MoneyCard
          title={t.total}
          value={order.totalAmount}
          icon={<ShoppingBag className="h-5 w-5" />}
          hint={labelMap(order.paymentMethod, locale)}
        />
        <MoneyCard
          title={t.paid}
          value={order.paidAmount}
          icon={<CreditCard className="h-5 w-5" />}
          hint={labelMap(order.paymentStatus, locale)}
        />
        <MoneyCard
          title={t.remaining}
          value={order.remainingAmount}
          icon={<Wallet className="h-5 w-5" />}
        />
        <MoneyCard
          title={t.cashCollected}
          value={order.cashCollectedAmount}
          icon={<ReceiptText className="h-5 w-5" />}
          hint={order.cashCollectedByName || order.deliveryAgentName}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="border-b px-4 py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-5 w-5" />
                {t.delivery}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-4">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-black transition-all"
                  style={{ width: `${progressValue(order)}%` }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-5">
                {steps.map((step) => {
                  const done = stepDone(order, step.key);
                  return (
                    <div
                      key={step.key}
                      className={cn(
                        "rounded-lg border p-3 text-center text-xs",
                        done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "bg-muted/30 text-muted-foreground"
                      )}
                    >
                      <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-full bg-background">
                        {done ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Clock3 className="h-4 w-4" />
                        )}
                      </div>
                      {step.label}
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InfoRow label={t.deliveryAgent} value={order.deliveryAgentName || t.noAgent} />
                <InfoRow label={t.scheduledAt} value={formatDateTime(order.scheduledAt, locale)} />
                <InfoRow label={t.startDate} value={formatDate(order.startsAt, locale)} />
                <InfoRow label={t.endDate} value={formatDate(order.endsAt, locale)} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="border-b px-4 py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5" />
                {t.items}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="overflow-hidden rounded-lg border bg-background">
                <div className="w-full overflow-x-auto">
                  <Table
                    dir={isRtl ? "rtl" : "ltr"}
                    className={cn(
                      "min-w-[780px]",
                      isRtl
                        ? "[&_td]:text-right [&_th]:text-right"
                        : "[&_td]:text-left [&_th]:text-left"
                    )}
                  >
                    <TableHeader>
                      <TableRow className="h-11 hover:bg-transparent">
                        <TableHead className="min-w-[220px]">{t.table.item}</TableHead>
                        <TableHead className="min-w-[160px]">{t.table.provider}</TableHead>
                        <TableHead className="min-w-[130px]">{t.table.status}</TableHead>
                        <TableHead className="min-w-[90px]">{t.table.qty}</TableHead>
                        <TableHead className="min-w-[130px]">{t.table.unitPrice}</TableHead>
                        <TableHead className="min-w-[130px]">{t.table.total}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.length ? (
                        order.items.map((item) => (
                          <TableRow key={item.id || item.name} className="h-[62px]">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="font-medium">{item.name}</div>
                              </div>
                            </TableCell>
                            <TableCell>{item.providerName || "—"}</TableCell>
                            <TableCell>
                              <StatusBadge value={item.status} locale={locale} />
                            </TableCell>
                            <TableCell>{formatNumber(item.quantity)}</TableCell>
                            <TableCell>
                              <SarAmount value={item.unitPrice} />
                            </TableCell>
                            <TableCell>
                              <SarAmount value={item.total} />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            {t.emptyItems}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="border-b px-4 py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock3 className="h-5 w-5" />
                {t.timeline}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {order.timeline.length ? (
                <div className="space-y-4">
                  {order.timeline.map((event, index) => (
                    <div key={event.id || `${event.eventType}-${index}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex size-9 items-center justify-center rounded-full border bg-background">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        {index < order.timeline.length - 1 ? (
                          <div className="mt-2 h-full min-h-8 w-px bg-border" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1 rounded-lg border bg-muted/20 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">
                            {event.title || labelMap(event.eventType, locale)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(event.createdAt, locale)}
                          </div>
                        </div>
                        {event.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {event.actorName ? <span>{event.actorName}</span> : null}
                          {event.deliveryAgentName ? <span>{event.deliveryAgentName}</span> : null}
                          {event.amount > 0 ? <SarAmount value={event.amount} /> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                  {t.emptyTimeline}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <PremiumCard
            title={t.orderSummary}
            icon={<FileText className="h-5 w-5 text-muted-foreground" />}
          >
            <InfoRow label={t.orderNo} value={order.orderNumber} copyValue={order.orderNumber} />
            <InfoRow label={t.product} value={order.productName} />
            <InfoRow label={t.provider} value={order.providerName || "—"} />
            <InfoRow label={t.type} value={order.productType || order.orderKind || "—"} />
            <InfoRow label={t.source} value={order.source || "—"} />
            <InfoRow label={t.createdAt} value={formatDateTime(order.createdAt, locale)} />
            <InfoRow label={t.updatedAt} value={formatDateTime(order.updatedAt, locale)} />
          </PremiumCard>

          <PremiumCard
            title={t.customer}
            icon={<UserRound className="h-5 w-5 text-muted-foreground" />}
          >
            <InfoRow label={t.customer} value={order.customerName} />
            <InfoRow label="Mobile" value={order.customerPhone || "—"} copyValue={order.customerPhone} />
            <InfoRow label="Email" value={order.customerEmail || "—"} copyValue={order.customerEmail} />
            <InfoRow label={t.customerAddress} value={order.customerAddress || "—"} />
          </PremiumCard>

          <PremiumCard
            title={t.payment}
            icon={<CreditCard className="h-5 w-5 text-muted-foreground" />}
          >
            <InfoRow label={t.paymentMethod} value={labelMap(order.paymentMethod, locale)} />
            <InfoRow
              label={t.paymentStatus}
              value={<StatusBadge value={order.paymentStatus} locale={locale} />}
            />
            <InfoRow
              label={t.orderStatus}
              value={<StatusBadge value={order.status} locale={locale} />}
            />
            <InfoRow
              label={t.fulfillmentStatus}
              value={<StatusBadge value={order.fulfillmentStatus} locale={locale} />}
            />
            <InfoRow
              label={t.invoice}
              value={
                order.invoiceId ? (
                  <Link className="hover:underline" href={`/system/invoices/${order.invoiceId}`}>
                    {order.invoiceNumber || order.invoiceId}
                  </Link>
                ) : (
                  order.invoiceNumber || "—"
                )
              }
            />
            <InfoRow label={t.contract} value={order.contractNumber || "—"} />
          </PremiumCard>

          <PremiumCard
            title={t.lifecycle}
            icon={<BadgeCheck className="h-5 w-5 text-muted-foreground" />}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  disabled={!canRun || (!availableActions.has("confirm") && order.status !== "pending")}
                  onClick={() => void performAction("confirm")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t.confirm}
                </Button>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  disabled={!canRun}
                  onClick={() => void performAction("processing")}
                >
                  <RefreshCw className="h-4 w-4" />
                  {t.processing}
                </Button>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  disabled={!canRun}
                  onClick={() => void performAction("mark_card_printed")}
                >
                  <Printer className="h-4 w-4" />
                  {t.printed}
                </Button>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  disabled={!canRun}
                  onClick={() => void performAction("mark_card_ready")}
                >
                  <Package className="h-4 w-4" />
                  {t.ready}
                </Button>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  disabled={!canRun}
                  onClick={() => void performAction("start_delivery")}
                >
                  <Send className="h-4 w-4" />
                  {t.startDelivery}
                </Button>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  disabled={!canRun}
                  onClick={handleConfirmDelivery}
                >
                  <Truck className="h-4 w-4" />
                  {t.confirmDelivery}
                </Button>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  disabled={!canRun}
                  onClick={handleCollectCash}
                >
                  <ReceiptText className="h-4 w-4" />
                  {t.collectCash}
                </Button>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  disabled={!canRun}
                  onClick={() => void performAction("complete")}
                >
                  <CheckCircle className="h-4 w-4" />
                  {t.complete}
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <div className="text-sm font-medium">{t.assignDelivery}</div>
                <Select
                  value={selectedDeliveryAgentId || "none"}
                  onValueChange={(value) => setSelectedDeliveryAgentId(value === "none" ? "" : value)}
                  disabled={agentsLoading || !canAssignDelivery}
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue placeholder={t.selectAgent} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.noAgent}</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                        {agent.code ? ` - ${agent.code}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="h-9 w-full rounded-lg"
                  variant="outline"
                  disabled={!canRun || !canAssignDelivery || agentsLoading}
                  onClick={handleAssignDelivery}
                >
                  {agentsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserRound className="h-4 w-4" />
                  )}
                  {t.assignDelivery}
                </Button>
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-medium text-muted-foreground">{t.cashAmount}</label>
                <input
                  value={cashAmount}
                  onChange={(event) => setCashAmount(event.target.value)}
                  inputMode="decimal"
                  className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-medium text-muted-foreground">{t.actionNote}</label>
                <textarea
                  value={actionNote}
                  onChange={(event) => setActionNote(event.target.value)}
                  rows={3}
                  className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  disabled={!canRun}
                  onClick={() => void performAction("refund")}
                >
                  <Ban className="h-4 w-4" />
                  {t.refund}
                </Button>

                <Button
                  variant="destructive"
                  className="h-9 rounded-lg"
                  disabled={!canRun}
                  onClick={() => void performAction("cancel")}
                >
                  <XCircle className="h-4 w-4" />
                  {t.cancel}
                </Button>
              </div>

              {actionLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {locale === "ar" ? "جاري تنفيذ الإجراء..." : "Running action..."}
                </div>
              ) : null}
            </div>
          </PremiumCard>

          <PremiumCard
            title={t.financial}
            icon={<Wallet className="h-5 w-5 text-muted-foreground" />}
          >
            <InfoRow label={t.subtotal} value={<SarAmount value={order.subtotalAmount} />} />
            <InfoRow label={t.discount} value={<SarAmount value={order.discountAmount} />} />
            <InfoRow label={t.tax} value={<SarAmount value={order.taxAmount} />} />
            <InfoRow label={t.total} value={<SarAmount value={order.totalAmount} />} />
            <InfoRow label={t.paid} value={<SarAmount value={order.paidAmount} />} />
            <InfoRow label={t.remaining} value={<SarAmount value={order.remainingAmount} />} />
            <InfoRow label={t.commission} value={<SarAmount value={order.agentCommission} />} />
            <InfoRow label={t.cashCollected} value={<SarAmount value={order.cashCollectedAmount} />} />
          </PremiumCard>

          {order.notes || order.internalNotes || order.deliveryNotes || order.cancellationReason ? (
            <PremiumCard
              title={t.notes}
              icon={<Edit3 className="h-5 w-5 text-muted-foreground" />}
            >
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                {order.notes ? <p>{order.notes}</p> : null}
                {order.deliveryNotes ? <p>{order.deliveryNotes}</p> : null}
                {order.internalNotes ? <p>{order.internalNotes}</p> : null}
                {order.cancellationReason ? <p>{order.cancellationReason}</p> : null}
              </div>
            </PremiumCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}