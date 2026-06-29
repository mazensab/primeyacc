"use client";

/* ============================================================
   📂 primey_frontend/app/system/subscriptions/[id]/page.tsx
   💳 Mhamcloud — System Subscription Detail
   ------------------------------------------------------------
   ✅ Premium PrimeyCare detail pattern adapted for Mhamcloud
   ✅ Real API only: GET /api/system/subscriptions/{id}/
   ✅ Detail cards + printable report
   ✅ Refresh, print, PDF through browser print dialog
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ Arabic/English via primey-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  Copy,
  FileText,
  Hash,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserRound,
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

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type SubscriptionAction = "invoice" | "receipt" | "confirm";
type ActiveSubscriptionAction = "renew" | "changePlan" | "suspend" | "reactivate" | "cancel";
type BillingCycle = "MONTHLY" | "YEARLY";
type SystemReceiptPaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD" | "PAYMENT_GATEWAY";

type CompanyRecord = {
  id: string;
  companyProfileId: string;
  name: string;
  code: string;
  status: string;
  owner: string;
  activity: string;
  subscription: string;
  email: string;
  phone: string;
  city: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
};
type PlanInfo = {
  id: string;
  name: string;
  code: string;
  monthlyPrice: string;
  yearlyPrice: string;
  isActive: boolean;
};

const API_ENDPOINT = "/api/system/subscriptions/";

const translations = {
  ar: {
    title: "تفاصيل الاشتراك",
    subtitle:
      "عرض تفاصيل اشتراك الشركة داخل إدارة منصة Mhamcloud مع بيانات الشركة والخطة والحالة والدورة والقيمة والتواريخ.",
    badge: "إدارة المنصة",
    backToCompanies: "العودة للاشتراكات",
    companiesList: "قائمة الاشتراكات",
    systemDashboard: "لوحة النظام",
    refresh: "تحديث",
    print: "طباعة",
    pdf: "PDF",
    copyId: "نسخ المعرف",
    copied: "تم النسخ.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    refreshed: "تم تحديث تفاصيل الاشتراك.",
    billingActions: "\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0641\u0648\u062a\u0631\u0629 \u0648\u0627\u0644\u062f\u0641\u0639",
    billingActionsDesc: "\u0623\u0643\u0645\u0644 \u0641\u0627\u062a\u0648\u0631\u0629 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0648\u0625\u064a\u0635\u0627\u0644 \u0627\u0644\u062f\u0641\u0639 \u062b\u0645 \u0641\u0639\u0651\u0644 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643.",
    createInvoice: "\u0625\u0646\u0634\u0627\u0621 \u0641\u0627\u062a\u0648\u0631\u0629",
    createReceipt: "\u0625\u0646\u0634\u0627\u0621 \u0625\u064a\u0635\u0627\u0644 \u062f\u0641\u0639",
    confirmPayment: "\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062f\u0641\u0639 \u0648\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643",
    invoiceCreated: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0641\u0627\u062a\u0648\u0631\u0629 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643.",
    receiptCreated: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0625\u064a\u0635\u0627\u0644 \u0627\u0644\u062f\u0641\u0639.",
    paymentConfirmed: "\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062f\u0641\u0639 \u0648\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643.",
    processing: "\u062c\u0627\u0631\u064a \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629...",
    pendingPaymentOnly: "\u062a\u0638\u0647\u0631 \u0647\u0630\u0647 \u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062f\u0641\u0639 \u0641\u0642\u0637.",
    paymentMethodLabel: "\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639",
    paymentMethodCash: "\u0646\u0642\u062f\u064a",
    paymentMethodBankTransfer: "\u062a\u062d\u0648\u064a\u0644 \u0628\u0646\u0643\u064a",
    paymentMethodCard: "\u0628\u0637\u0627\u0642\u0629 / \u0645\u062f\u0649",
    paymentMethodGateway: "\u0628\u0648\u0627\u0628\u0629 \u062f\u0641\u0639",
    paymentReference: "\u0645\u0631\u062c\u0639 \u0627\u0644\u062f\u0641\u0639",
    paymentReferencePlaceholder: "\u0627\u062e\u062a\u064a\u0627\u0631\u064a: \u0631\u0642\u0645 \u0627\u0644\u062a\u062d\u0648\u064a\u0644 \u0623\u0648 \u0639\u0645\u0644\u064a\u0629 \u0627\u0644\u062f\u0641\u0639",
    activeActions: "\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0627\u0644\u0646\u0634\u0637",
    activeActionsDesc: "\u062c\u062f\u062f \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u060c \u0623\u0648 \u063a\u064a\u0651\u0631 \u0627\u0644\u0628\u0627\u0642\u0629\u060c \u0623\u0648 \u0623\u0644\u063a \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0628\u062a\u0623\u0643\u064a\u062f \u0648\u0627\u0636\u062d.",
    targetPlan: "\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u0633\u062a\u0647\u062f\u0641\u0629 \u0644\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0628\u0627\u0642\u0629",
    chooseTargetPlan: "\u0627\u062e\u062a\u0631 \u0627\u0644\u0628\u0627\u0642\u0629",
    activeBillingCycle: "\u062f\u0648\u0631\u0629 \u0627\u0644\u0641\u0648\u062a\u0631\u0629",
    renewSubscription: "\u062a\u062c\u062f\u064a\u062f \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643",
    changePlan: "\u062a\u0631\u0642\u064a\u0629 / \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0628\u0627\u0642\u0629",
    cancelSubscription: "\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643",
    suspendSubscription: "\u062a\u0639\u0637\u064a\u0644 \u0645\u0624\u0642\u062a",
    reactivateSubscription: "\u0625\u0639\u0627\u062f\u0629 \u062a\u0641\u0639\u064a\u0644",
    subscriptionSuspended: "\u062a\u0645 \u062a\u0639\u0637\u064a\u0644 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0645\u0624\u0642\u062a\u064b\u0627.",
    subscriptionReactivated: "\u062a\u0645\u062a \u0625\u0639\u0627\u062f\u0629 \u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643.",
    suspendConfirm: "\u0647\u0644 \u062a\u0631\u064a\u062f \u062a\u0639\u0637\u064a\u0644 \u0647\u0630\u0627 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0645\u0624\u0642\u062a\u064b\u0627\u061f",
    reactivateConfirm: "\u0647\u0644 \u062a\u0631\u064a\u062f \u0625\u0639\u0627\u062f\u0629 \u062a\u0641\u0639\u064a\u0644 \u0647\u0630\u0627 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u061f",
    renewalCreated: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 \u062a\u062c\u062f\u064a\u062f \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062f\u0641\u0639.",
    changePlanCreated: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 \u062a\u063a\u064a\u064a\u0631 \u0628\u0627\u0642\u0629 \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u062f\u0641\u0639.",
    subscriptionCancelled: "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643.",
    cancelConfirm: "\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u0625\u0644\u063a\u0627\u0621 \u0647\u0630\u0627 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u061f",
    planRequired: "\u0627\u062e\u062a\u0631 \u0628\u0627\u0642\u0629 \u0642\u0628\u0644 \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629.",
    loadingPlans: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u0627\u0642\u0627\u062a...",
    monthly: "\u0634\u0647\u0631\u064a",
    yearly: "\u0633\u0646\u0648\u064a",
    activeActionHint: "\u0627\u0644\u062a\u062c\u062f\u064a\u062f \u064a\u0633\u062a\u062e\u062f\u0645 \u0628\u0627\u0642\u0629 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0627\u0644\u062d\u0627\u0644\u064a\u060c \u0648\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0628\u0627\u0642\u0629 \u064a\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u0633\u062a\u0647\u062f\u0641\u0629.",

    identity: "بيانات التعريف",
    identityDesc: "اسم الشركة والكود والمعرف الداخلي.",
    contact: "بيانات التواصل",
    contactDesc: "بيانات العملة وتاريخ البداية وتاريخ الانتهاء والملاحظات.",
    operations: "الخطة والدورة والقيمة",
    operationsDesc: "حالة الاشتراك والخطة ودورة الفوترة والقيمة.",
    notes: "ملاحظات",
    notesDesc: "ملاحظات إدارية داخلية عند توفرها.",
    quickLinks: "روابط سريعة",
    quickLinksDesc: "تنقل سريع داخل وحدة الشركات.",

    companyName: "اسم الشركة",
    companyCode: "كود الاشتراك",
    companyId: "معرف الشركة",
    owner: "الخطة",
    email: "العملة",
    phone: "رقم الجوال",
    city: "تاريخ الانتهاء",
    activity: "دورة الفوترة",
    subscription: "القيمة",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",

    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    trial: "تجريبي",
    pending: "معلق",
    draft: "مسودة",
    cancelled: "ملغي",
    expired: "منتهي",
    past_due: "متأخر",
    unknown: "غير محدد",
    notAvailable: "غير متوفر",

    reportTitle: "تقرير تفاصيل شركة Mhamcloud",
    generatedAt: "تاريخ الطباعة",

    errorTitle: "تعذر تحميل تفاصيل الاشتراك",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    emptyTitle: "لا توجد بيانات للشركة",
    emptyDesc: "لم يرجع API بيانات صالحة لهذه الشركة.",
    tryAgain: "إعادة المحاولة",
  },
  en: {
    title: "Subscription details",
    subtitle:
      "View the company subscription inside Mhamcloud platform management with company, plan, status, billing cycle, value, and dates.",
    badge: "Platform management",
    backToCompanies: "Back to subscriptions",
    companiesList: "Subscriptions list",
    systemDashboard: "System dashboard",
    refresh: "Refresh",
    print: "Print",
    pdf: "PDF",
    copyId: "Copy ID",
    copied: "Copied.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    refreshed: "Subscription details refreshed.",
    billingActions: "Billing and payment actions",
    billingActionsDesc: "Complete the invoice, payment receipt, then activate the subscription.",
    createInvoice: "Create invoice",
    createReceipt: "Create payment receipt",
    confirmPayment: "Confirm payment and activate",
    invoiceCreated: "Subscription invoice created.",
    receiptCreated: "Payment receipt created.",
    paymentConfirmed: "Payment confirmed and subscription activated.",
    processing: "Processing...",
    pendingPaymentOnly: "These actions appear only for pending payment subscriptions.",
    paymentMethodLabel: "Payment method",
    paymentMethodCash: "Cash",
    paymentMethodBankTransfer: "Bank transfer",
    paymentMethodCard: "Card / Mada",
    paymentMethodGateway: "Payment gateway",
    paymentReference: "Payment reference",
    paymentReferencePlaceholder: "Optional: transfer or payment transaction reference",
    activeActions: "Active subscription actions",
    activeActionsDesc: "Renew the subscription, change the plan, or cancel it with clear confirmation.",
    targetPlan: "Target plan for plan change",
    chooseTargetPlan: "Choose plan",
    activeBillingCycle: "Billing cycle",
    renewSubscription: "Renew subscription",
    changePlan: "Upgrade / change plan",
    cancelSubscription: "Cancel subscription",
    suspendSubscription: "Suspend temporarily",
    reactivateSubscription: "Reactivate subscription",
    subscriptionSuspended: "Subscription suspended temporarily.",
    subscriptionReactivated: "Subscription reactivated.",
    suspendConfirm: "Suspend this subscription temporarily?",
    reactivateConfirm: "Reactivate this subscription?",
    renewalCreated: "Renewal request created as pending payment.",
    changePlanCreated: "Plan change request created as pending payment.",
    subscriptionCancelled: "Subscription cancelled.",
    cancelConfirm: "Are you sure you want to cancel this subscription?",
    planRequired: "Choose a plan before continuing.",
    loadingPlans: "Loading plans...",
    monthly: "Monthly",
    yearly: "Yearly",
    activeActionHint: "Renewal keeps the current subscription plan. Plan change uses the selected target plan.",

    identity: "Identity",
    identityDesc: "Company name, code, and internal identifier.",
    contact: "Contact details",
    contactDesc: "Owner, email, phone, and city.",
    operations: "Plan, cycle, and value",
    operationsDesc: "Subscription status, plan, billing cycle, and value.",
    notes: "Notes",
    notesDesc: "Internal administrative notes when available.",
    quickLinks: "Quick links",
    quickLinksDesc: "Quick navigation inside the companies module.",

    companyName: "Company name",
    companyCode: "Company code",
    companyId: "Company ID",
    owner: "Plan",
    email: "Currency",
    phone: "Start date",
    city: "End date",
    activity: "Billing cycle",
    subscription: "Value",
    status: "Status",
    createdAt: "Created at",
    updatedAt: "Updated at",

    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    trial: "Trial",
    pending: "Pending",
    draft: "Draft",
    cancelled: "Cancelled",
    expired: "Expired",
    past_due: "Past due",
    unknown: "Unknown",
    notAvailable: "Not available",

    reportTitle: "Mhamcloud Subscription Details Report",
    generatedAt: "Generated at",

    errorTitle: "Could not load subscription details",
    errorDesc:
      "Make sure you are signed in as a system user and the backend is running, then try again.",
    emptyTitle: "No company data",
    emptyDesc: "The API did not return valid data for this company.",
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

function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).replace("T", " ").slice(0, 16);
  }

  return parsed.toISOString().replace("T", " ").slice(0, 16);
}

function normalizeNestedName(
  value: unknown,
  keys: string[] = ["name", "title", "full_name"],
) {
  if (typeof value === "string") return value;
  const record = asRecord(value);

  for (const key of keys) {
    const text = normalizeText(record[key]);
    if (text) return text;
  }

  return "";
}

function normalizeStatus(value: unknown) {
  if (value === null || value === undefined || value === "") return "unknown";
  if (typeof value === "boolean") return value ? "active" : "inactive";

  const text = normalizeText(value).toLowerCase();

  if (!text) return "unknown";
  if (text === "true") return "active";
  if (text === "false") return "inactive";
  if (text === "enabled") return "active";
  if (text === "disabled") return "inactive";

  return text;
}


function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const resultRecord = asRecord(record.result);
  const candidates = [
    record.results,
    record.items,
    record.records,
    record.plans,
    record.data,
    dataRecord.results,
    dataRecord.items,
    dataRecord.records,
    dataRecord.plans,
    resultRecord.results,
    resultRecord.items,
    resultRecord.records,
    resultRecord.plans,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}
function normalizePlan(value: unknown): PlanInfo {
  const record = asRecord(value);
  const activeStatus = normalizeStatus(record.status ?? record.is_active ?? record.active ?? true);
  return {
    id: normalizeText(record.id || record.pk || record.uuid),
    name: normalizeText(record.name || record.title || record.display_name || record.name_ar || record.name_en, "?"),
    code: normalizeText(record.code || record.slug),
    monthlyPrice: normalizeText(record.monthly_price || record.monthlyPrice || record.price_monthly || record.price, "0.00"),
    yearlyPrice: normalizeText(record.yearly_price || record.yearlyPrice || record.price_yearly || record.price, "0.00"),
    isActive: activeStatus !== "inactive" && activeStatus !== "disabled" && activeStatus !== "false",
  };
}
function normalizeBillingCycle(value: unknown): BillingCycle {
  const text = normalizeText(value).toUpperCase();
  return text === "YEARLY" || text === "ANNUAL" || text === "ANNUALLY" ? "YEARLY" : "MONTHLY";
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function extractCompanyPayload(payload: unknown): ApiRecord {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const resultRecord = asRecord(record.result);
  const directSubscription = asRecord(record.subscription);
  const dataSubscription = asRecord(dataRecord.subscription);
  const resultSubscription = asRecord(resultRecord.subscription);
  const directItem = asRecord(record.item || record.record || record.object);
  const dataItem = asRecord(dataRecord.item || dataRecord.record || dataRecord.object);
  const resultItem = asRecord(resultRecord.item || resultRecord.record || resultRecord.object);
  if (Object.keys(directSubscription).length) return directSubscription;
  if (Object.keys(dataSubscription).length) return dataSubscription;
  if (Object.keys(resultSubscription).length) return resultSubscription;
  if (Object.keys(directItem).length) return directItem;
  if (Object.keys(dataItem).length) return dataItem;
  if (Object.keys(resultItem).length) return resultItem;
  if (Object.keys(dataRecord).length) return dataRecord;
  if (Object.keys(resultRecord).length) return resultRecord;
  return record;
}

function normalizeCompanyProfileId(payload: unknown) {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const result = asRecord(root.result);
  const record = extractCompanyPayload(payload);
  const relatedCompanyCandidates = [
    root.company,
    data.company,
    result.company,
    record.company,
    root.company_detail,
    data.company_detail,
    result.company_detail,
    record.company_detail,
    root.company_info,
    data.company_info,
    result.company_info,
    record.company_info,
  ];
  for (const candidate of relatedCompanyCandidates) {
    const relatedCompany = asRecord(candidate);
    const relatedId = normalizeText(
      relatedCompany.id ||
        relatedCompany.pk ||
        relatedCompany.company_id ||
        relatedCompany.companyId,
    );
    if (relatedId) return relatedId;
  }
  return normalizeText(
    root.company_id ||
      data.company_id ||
      result.company_id ||
      record.company_id ||
      root.companyId ||
      data.companyId ||
      result.companyId ||
      record.companyId,
  );
}
function normalizeCompany(payload: unknown): CompanyRecord {
  const record = extractCompanyPayload(payload);
  const company = record.company || record.company_ref || record.tenant || record.account_company;
  const plan = record.plan || record.subscription_plan || record.package || record.product;
  const planRecord = asRecord(plan);
  const pricing = asRecord(record.pricing);
  const totals = asRecord(record.totals);
  const amount = normalizeText(
    record.amount ||
      record.price ||
      record.monthly_price ||
      record.subscription_amount ||
      record.total_amount ||
      pricing.amount ||
      pricing.price ||
      totals.amount ||
      totals.total,
    "0",
  );
  const currency = normalizeText(record.currency || pricing.currency || "SAR", "SAR");
  const rawCycle = normalizeText(
    record.billing_cycle || record.cycle || record.period || planRecord.billing_cycle,
    "unknown",
  ).toLowerCase();
  const cycle =
    rawCycle === "month"
      ? "monthly"
      : rawCycle === "year"
        ? "yearly"
        : rawCycle === "semiannual" || rawCycle === "semi-annual"
          ? "semi_annual"
          : rawCycle === "one-time"
            ? "one_time"
            : rawCycle;
  const planName =
    normalizeNestedName(plan, ["name", "plan_name", "title", "display_name"]) ||
    normalizeText(record.plan_name || record.package_name, "—");
  return {
    companyProfileId: normalizeCompanyProfileId(payload),
    id: normalizeText(record.id || record.uuid || record.pk || record.slug || record.code),
    name:
      normalizeNestedName(company, ["name", "company_name", "title", "display_name"]) ||
      normalizeText(record.company_name || record.company_title, "—"),
    code: normalizeText(
      record.code ||
        record.subscription_code ||
        record.reference ||
        record.invoice_number ||
        record.uuid ||
        record.id,
      "—",
    ),
    status: normalizeStatus(record.status ?? record.state ?? record.is_active),
    owner: planName,
    activity: cycle || "unknown",
    subscription: `${amount} ${currency}`,
    email: currency,
    phone: normalizeText(record.starts_at || record.start_date || record.started_at || record.valid_from),
    city: normalizeText(record.ends_at || record.end_date || record.expires_at || record.valid_to, "—"),
    notes: normalizeText(record.notes || record.description || record.internal_notes),
    created_at: normalizeText(record.created_at || record.created || record.inserted_at) || null,
    updated_at: normalizeText(record.updated_at || record.modified_at || record.updated || record.last_modified) || null,
  };
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


function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return "";
  return decodeURIComponent(match.slice(name.length + 1));
}
async function postJson<T>(url: string, body: ApiRecord = {}): Promise<T> {
  const csrfToken = getCookie("csrftoken");
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  let payload: unknown = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = { message: raw };
    }
  }
  const record = asRecord(payload);
  if (!response.ok || record.ok === false) {
    const errors = asRecord(record.errors);
    const firstError = Object.values(errors)[0];
    const message =
      normalizeText(record.message) ||
      normalizeText(record.detail) ||
      (Array.isArray(firstError) ? normalizeText(firstError[0]) : normalizeText(firstError)) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return (payload || {}) as T;
}
function getStatusLabel(value: string, locale: Locale) {
  const normalized = value.toLowerCase();

  const ar: Record<string, string> = {
    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    trial: "تجريبي",
    pending: "معلق",
    draft: "مسودة",
    cancelled: "ملغي",
    expired: "منتهي",
    past_due: "متأخر",
  };

  const en: Record<string, string> = {
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    trial: "Trial",
    pending: "Pending",
    draft: "Draft",
    cancelled: "Cancelled",
    expired: "Expired",
    past_due: "Past due",
  };

  return locale === "ar" ? ar[normalized] || value : en[normalized] || value;
}

function getStatusClass(value: string) {
  const normalized = value.toLowerCase();

  if (["active", "paid", "confirmed", "ready", "success"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["pending", "trial", "draft", "processing"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["inactive", "failed", "cancelled", "expired", "suspended", "blocked"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StatusBadge({ value, locale }: { value: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getStatusClass(value))}
    >
      {getStatusLabel(value, locale)}
    </Badge>
  );
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

function CompanyDetailSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-8 w-72" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-36" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function SystemSubscriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = React.useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] || "" : String(value || "");
  }, [params]);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [company, setCompany] = React.useState<CompanyRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<SubscriptionAction | ActiveSubscriptionAction | null>(null);
  const [plans, setPlans] = React.useState<PlanInfo[]>([]);
  const [selectedPlanId, setSelectedPlanId] = React.useState("");
  const [selectedBillingCycle, setSelectedBillingCycle] = React.useState<BillingCycle>("MONTHLY");
  const [receiptPaymentMethod, setReceiptPaymentMethod] = React.useState<SystemReceiptPaymentMethod>("CASH");
  const [receiptReference, setReceiptReference] = React.useState("");
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

  const loadCompany = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!companyId) {
        setError(t.emptyDesc);
        setLoading(false);
        return;
      }

      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const payload = await fetchJson<unknown>(
          makeApiUrl(`${API_ENDPOINT}${encodeURIComponent(companyId)}/`),
        );
        const normalized = normalizeCompany(payload);

        if (!normalized.id && !normalized.name) {
          setCompany(null);
          setError("");
          return;
        }

        setCompany(normalized);

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
    [companyId, t.emptyDesc, t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadCompany();
  }, [loadCompany]);
  const loadPlans = React.useCallback(async () => {
    try {
      const payload = await fetchJson<unknown>(makeApiUrl("/api/system/plans/?page_size=200"));
      const activePlans = extractArray(payload)
        .map(normalizePlan)
        .filter((plan) => plan.id && plan.isActive);
      setPlans(activePlans);
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : t.errorDesc);
    }
  }, [t.errorDesc]);
  React.useEffect(() => {
    void loadPlans();
  }, [loadPlans]);
  React.useEffect(() => {
    if (!company) return;
    setSelectedBillingCycle(normalizeBillingCycle(company.activity));
  }, [company]);
  React.useEffect(() => {
    if (!plans.length) return;
    setSelectedPlanId((current) => {
      if (current) return current;
      const currentPlanName = normalizeText(company?.owner).toLowerCase();
      const alternativePlan =
        plans.find((plan) => {
          const planName = plan.name.toLowerCase();
          const planCode = plan.code.toLowerCase();
          return planName !== currentPlanName && (!planCode || !currentPlanName.includes(planCode));
        }) || plans[0];
      return alternativePlan?.id || "";
    });
  }, [plans, company?.owner]);

  function fallback(value: string | null | undefined) {
    return normalizeText(value, t.notAvailable);
  }

  async function copyCompanyId() {
    if (!company?.id) return;

    try {
      await navigator.clipboard.writeText(company.companyProfileId || company.id);
      toast.success(t.copied);
    } catch {
      toast.error(t.errorDesc);
    }
  }

  async function handleSubscriptionAction(action: SubscriptionAction) {
    if (!companyId || !company) return;
    const actionConfig: Record<SubscriptionAction, { endpoint: string; message: string }> = {
      invoice: {
        endpoint: `/api/system/billing-documents/subscriptions/${companyId}/invoice/`,
        message: t.invoiceCreated,
      },
      receipt: {
        endpoint: `/api/system/billing-documents/subscriptions/${companyId}/receipt/`,
        message: t.receiptCreated,
      },
      confirm: {
        endpoint: `/api/system/subscriptions/${companyId}/confirm-payment/`,
        message: t.paymentConfirmed,
      },
    };
    setActionLoading(action);
    try {
      const actionBody: Record<SubscriptionAction, ApiRecord> = {
        invoice: {},
        receipt: {
          payment_method: receiptPaymentMethod,
          transaction_reference: normalizeText(receiptReference) || `SUB-${companyId}-${Date.now()}`,
          billing_reference: company.code || company.id || String(companyId),
          issue_date: new Date().toISOString().slice(0, 10),
          payment_extra: {
            source: "system_admin_manual",
            method: receiptPaymentMethod,
          },
          notes: "Platform subscription payment receipt created manually by a system user.",
        },
        confirm: {},
      };
      await postJson<ApiRecord>(makeApiUrl(actionConfig[action].endpoint), actionBody[action]);
      toast.success(actionConfig[action].message);
      await loadCompany({ silent: true });
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : t.errorDesc);
    } finally {
      setActionLoading(null);
    }
  }
  async function handleActiveSubscriptionAction(action: ActiveSubscriptionAction) {
    if (!companyId || !company) return;
    if (action === "changePlan" && !selectedPlanId) {
      toast.error(t.planRequired);
      return;
    }
    if (action === "suspend" && !window.confirm(t.suspendConfirm)) {
      return;
    }
    if (action === "reactivate" && !window.confirm(t.reactivateConfirm)) {
      return;
    }
    if (action === "cancel" && !window.confirm(t.cancelConfirm)) {
      return;
    }
    const actionConfig: Record<ActiveSubscriptionAction, { endpoint: string; message: string }> = {
      renew: {
        endpoint: `/api/system/subscriptions/${companyId}/renew/`,
        message: t.renewalCreated,
      },
      changePlan: {
        endpoint: `/api/system/subscriptions/${companyId}/change-plan/`,
        message: t.changePlanCreated,
      },
      suspend: {
        endpoint: `/api/system/subscriptions/${companyId}/suspend/`,
        message: t.subscriptionSuspended,
      },
      reactivate: {
        endpoint: `/api/system/subscriptions/${companyId}/reactivate/`,
        message: t.subscriptionReactivated,
      },
      cancel: {
        endpoint: `/api/system/subscriptions/${companyId}/cancel/`,
        message: t.subscriptionCancelled,
      },
    };
    const commonPendingBody: ApiRecord = {
      billing_cycle: selectedBillingCycle,
      start_date: todayIso(),
      discount_amount: "0.00",
      vat_rate: "0.15",
      auto_renew: true,
      billing_reference: company.code || company.id || String(companyId),
    };
    const actionBody: Record<ActiveSubscriptionAction, ApiRecord> = {
      renew: {
        ...commonPendingBody,
        notes: "Subscription renewal request from system subscription detail. Renewal keeps the current subscription plan.",
      },
      changePlan: {
        ...commonPendingBody,
        plan_id: Number.parseInt(selectedPlanId, 10),
        action: "UPGRADE",
        notes: "Subscription plan change request from system subscription detail.",
      },
      suspend: {
        reason: "Suspended temporarily from system subscription detail.",
      },
      reactivate: {
        reason: "Reactivated from system subscription detail.",
      },
      cancel: {
        reason: "Cancelled from system subscription detail.",
      },
    };
    setActionLoading(action);
    try {
      const payload = await postJson<ApiRecord>(
        makeApiUrl(actionConfig[action].endpoint),
        actionBody[action],
      );
      toast.success(actionConfig[action].message);
      const root = asRecord(payload);
      const data = asRecord(root.data);
      const subscription = asRecord(data.subscription || root.subscription || data.item || root.item);
      const nextSubscriptionId = normalizeText(subscription.id || data.id || root.id);
      if (action !== "cancel" && nextSubscriptionId && nextSubscriptionId !== companyId) {
        router.push(`/system/subscriptions/${nextSubscriptionId}`);
        return;
      }
      await loadCompany({ silent: true });
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : t.errorDesc);
    } finally {
      setActionLoading(null);
    }
  }
  function buildPrintableHtml() {
    if (!company) return "";

    const rows = [
      [t.companyName, company.name],
      [t.companyCode, company.code],
      [t.companyId, company.companyProfileId || company.id],
      [t.status, getStatusLabel(company.status, locale)],
      [t.owner, company.owner],
      [t.email, fallback(company.email)],
      [t.phone, fallback(company.phone)],
      [t.city, company.city],
      [t.activity, company.activity],
      [t.subscription, company.subscription],
      [t.createdAt, formatDateTime(company.created_at)],
      [t.updatedAt, formatDateTime(company.updated_at)],
      [t.notes, fallback(company.notes)],
    ];

    return `
      <table>
        <tbody>
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <th>${escapeHtml(label)}</th>
                  <td>${escapeHtml(value)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function openPrintWindow(mode: "print" | "pdf") {
    if (!company) return;

    if (mode === "pdf") {
      toast.info(t.pdfHint);
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1000,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.reportTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 10px;
              font-size: 13px;
              text-align: ${dir === "rtl" ? "right" : "left"};
              vertical-align: top;
            }
            th { width: 220px; background: #f1f5f9; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildPrintableHtml()}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) return <CompanyDetailSkeleton />;

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
            <Button onClick={() => void loadCompany({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!company) {
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
              <Link href="/system/subscriptions/list">
                <ListChecks className="h-4 w-4" />
                {t.companiesList}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const companyProfileId = company.companyProfileId || "";
  const companyDetailsHref = companyProfileId ? `/system/companies/${companyProfileId}` : "/system/companies/list";
  const normalizedStatusForActions = company.status.toLowerCase().replace(/\s+/g, "_");
  const canProcessPendingPayment =
    normalizedStatusForActions === "pending_payment" ||
    normalizedStatusForActions === "pending";
  const canProcessBillingActions = canProcessPendingPayment;
  const canRenewSubscription =
    normalizedStatusForActions === "active" ||
    normalizedStatusForActions === "trial" ||
    normalizedStatusForActions === "expired";
  const canChangeSubscriptionPlan =
    normalizedStatusForActions === "active" ||
    normalizedStatusForActions === "trial";
  const canSuspendSubscription =
    normalizedStatusForActions === "active" ||
    normalizedStatusForActions === "trial";
  const canReactivateSubscription = normalizedStatusForActions === "suspended";
  const canCancelSubscription =
    normalizedStatusForActions === "active" ||
    normalizedStatusForActions === "trial" ||
    normalizedStatusForActions === "suspended" ||
    normalizedStatusForActions === "pending_payment" ||
    normalizedStatusForActions === "pending";
  const canProcessActiveActions =
    canRenewSubscription ||
    canChangeSubscriptionPlan ||
    canSuspendSubscription ||
    canReactivateSubscription ||
    canCancelSubscription;
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
                    {company.name || t.title}
                  </h1>
                  <StatusBadge value={company.status} locale={locale} />
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  {t.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" className="rounded-xl bg-background">
                  <Link href="/system/subscriptions">
                    <BackIcon className="h-4 w-4" />
                    {t.backToCompanies}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadCompany({ silent: true })}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("print")}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("pdf")}>
                  <FileText className="h-4 w-4" />
                  {t.pdf}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard title={t.companyCode} value={company.code || t.notAvailable} description={t.identity} icon={Hash} />
          <InfoCard title={t.status} value={<StatusBadge value={company.status} locale={locale} />} description={t.operations} icon={ShieldCheck} />
          <InfoCard title={t.activity} value={company.activity || t.notAvailable} description={t.operations} icon={Activity} />
          <InfoCard title={t.createdAt} value={formatDateTime(company.created_at)} description={t.identity} icon={CalendarDays} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.identity}</CardTitle>
                <CardDescription>{t.identityDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <DetailRow label={t.companyName} value={company.name || t.notAvailable} icon={Building2} />
                <DetailRow label={t.companyCode} value={company.code || t.notAvailable} icon={Hash} />
                <DetailRow
                  label={t.companyId}
                  value={
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs">{company.companyProfileId || t.notAvailable}</span>
                      {company.id ? (
                        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg" onClick={copyCompanyId}>
                          <Copy className="h-3.5 w-3.5" />
                          {t.copyId}
                        </Button>
                      ) : null}
                    </div>
                  }
                  icon={Hash}
                />
                <DetailRow label={t.updatedAt} value={formatDateTime(company.updated_at)} icon={CalendarDays} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.contact}</CardTitle>
                <CardDescription>{t.contactDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <DetailRow label={t.owner} value={fallback(company.owner)} icon={UserRound} />
                <DetailRow label={t.email} value={fallback(company.email)} icon={Mail} />
                <DetailRow label={t.phone} value={fallback(company.phone)} icon={Phone} />
                <DetailRow label={t.city} value={fallback(company.city)} icon={MapPin} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.operations}</CardTitle>
                <CardDescription>{t.operationsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <DetailRow label={t.status} value={<StatusBadge value={company.status} locale={locale} />} icon={ShieldCheck} />
                <DetailRow label={t.activity} value={fallback(company.activity)} icon={Activity} />
                <DetailRow label={t.subscription} value={fallback(company.subscription)} icon={CheckCircle2} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.notes}</CardTitle>
                <CardDescription>{t.notesDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-24 rounded-2xl border bg-background p-4 text-sm leading-7 text-muted-foreground">
                  {company.notes || t.notAvailable}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            {canProcessBillingActions ? (
              <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-sm">
                <CardHeader>
                  <CardTitle>{t.billingActions}</CardTitle>
                  <CardDescription>{t.billingActionsDesc}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start rounded-xl bg-background"
                    disabled={Boolean(actionLoading)}
                    onClick={() => void handleSubscriptionAction("invoice")}
                  >
                    {actionLoading === "invoice" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {actionLoading === "invoice" ? t.processing : t.createInvoice}
                  </Button>
                  <label className="grid gap-2 text-sm font-medium">
                    <span>{t.paymentMethodLabel}</span>
                    <select
                      value={receiptPaymentMethod}
                      onChange={(event) => setReceiptPaymentMethod(event.target.value as SystemReceiptPaymentMethod)}
                      className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    >
                      <option value="CASH">{t.paymentMethodCash}</option>
                      <option value="BANK_TRANSFER">{t.paymentMethodBankTransfer}</option>
                      <option value="CARD">{t.paymentMethodCard}</option>
                      <option value="PAYMENT_GATEWAY">{t.paymentMethodGateway}</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    <span>{t.paymentReference}</span>
                    <input
                      value={receiptReference}
                      onChange={(event) => setReceiptReference(event.target.value)}
                      placeholder={t.paymentReferencePlaceholder}
                      className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start rounded-xl bg-background"
                    disabled={Boolean(actionLoading)}
                    onClick={() => void handleSubscriptionAction("receipt")}
                  >
                    {actionLoading === "receipt" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {actionLoading === "receipt" ? t.processing : t.createReceipt}
                  </Button>
                  {canProcessPendingPayment ? (
                    <Button
                      type="button"
                      className="justify-start rounded-xl"
                      disabled={Boolean(actionLoading)}
                      onClick={() => void handleSubscriptionAction("confirm")}
                    >
                      {actionLoading === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {actionLoading === "confirm" ? t.processing : t.confirmPayment}
                    </Button>
                  ) : null}
                  <p className="pt-1 text-xs leading-6 text-muted-foreground">{t.pendingPaymentOnly}</p>
                </CardContent>
              </Card>
            ) : null}
            {canProcessActiveActions ? (
              <Card className="rounded-2xl border-emerald-200 bg-emerald-50/40 shadow-sm">
                <CardHeader>
                  <CardTitle>{t.activeActions}</CardTitle>
                  <CardDescription>{t.activeActionsDesc}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <label className="grid gap-2 text-sm font-medium">
                    <span>{t.targetPlan}</span>
                    <select
                      value={selectedPlanId}
                      onChange={(event) => setSelectedPlanId(event.target.value)}
                      className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    >
                      <option value="">{plans.length ? t.chooseTargetPlan : t.loadingPlans}</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} {plan.code ? `(${plan.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    <span>{t.activeBillingCycle}</span>
                    <select
                      value={selectedBillingCycle}
                      onChange={(event) => setSelectedBillingCycle(event.target.value as BillingCycle)}
                      className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    >
                      <option value="MONTHLY">{t.monthly}</option>
                      <option value="YEARLY">{t.yearly}</option>
                    </select>
                  </label>
                  {canChangeSubscriptionPlan ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start rounded-xl bg-background"
                      disabled={Boolean(actionLoading) || !selectedPlanId}
                      onClick={() => void handleActiveSubscriptionAction("changePlan")}
                    >
                      {actionLoading === "changePlan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {actionLoading === "changePlan" ? t.processing : t.changePlan}
                    </Button>
                  ) : null}
                  {canRenewSubscription ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start rounded-xl bg-background"
                      disabled={Boolean(actionLoading)}
                      onClick={() => void handleActiveSubscriptionAction("renew")}
                    >
                      {actionLoading === "renew" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {actionLoading === "renew" ? t.processing : t.renewSubscription}
                    </Button>
                  ) : null}
                  {canSuspendSubscription ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start rounded-xl bg-background"
                      disabled={Boolean(actionLoading)}
                      onClick={() => void handleActiveSubscriptionAction("suspend")}
                    >
                      {actionLoading === "suspend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TriangleAlert className="h-4 w-4" />}
                      {actionLoading === "suspend" ? t.processing : t.suspendSubscription}
                    </Button>
                  ) : null}
                  {canReactivateSubscription ? (
                    <Button
                      type="button"
                      className="justify-start rounded-xl"
                      disabled={Boolean(actionLoading)}
                      onClick={() => void handleActiveSubscriptionAction("reactivate")}
                    >
                      {actionLoading === "reactivate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {actionLoading === "reactivate" ? t.processing : t.reactivateSubscription}
                    </Button>
                  ) : null}
                  {canCancelSubscription ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start rounded-xl border-rose-200 bg-background text-rose-700 hover:bg-rose-50"
                      disabled={Boolean(actionLoading)}
                      onClick={() => void handleActiveSubscriptionAction("cancel")}
                    >
                      {actionLoading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TriangleAlert className="h-4 w-4" />}
                      {actionLoading === "cancel" ? t.processing : t.cancelSubscription}
                    </Button>
                  ) : null}
                  <p className="pt-1 text-xs leading-6 text-muted-foreground">{t.activeActionHint}</p>
                </CardContent>
              </Card>
            ) : null}
            <Card className="rounded-2xl shadow-sm xl:sticky xl:top-6">
              <CardHeader>
                <CardTitle>{t.quickLinks}</CardTitle>
                <CardDescription>{t.quickLinksDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system/subscriptions/list">
                    <ListChecks className="h-4 w-4" />
                    {t.companiesList}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system/subscriptions">
                    <Building2 className="h-4 w-4" />
                    {t.backToCompanies}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system">
                    <LayoutDashboard className="h-4 w-4" />
                    {t.systemDashboard}
                  </Link>
                </Button>
                <Button type="button" variant="outline" className="justify-start rounded-xl bg-background" onClick={() => openPrintWindow("print")}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button type="button" variant="outline" className="justify-start rounded-xl bg-background" onClick={() => openPrintWindow("pdf")}>
                  <FileText className="h-4 w-4" />
                  {t.pdf}
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}






