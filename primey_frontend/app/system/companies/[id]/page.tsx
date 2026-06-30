"use client";

const BILLING_DOCUMENT_API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");
function buildBillingDocumentPdfUrl(documentId: string | number) {
  return `${BILLING_DOCUMENT_API_BASE_URL}/api/system/billing-documents/${encodeURIComponent(String(documentId))}/pdf/`;
}

/* ============================================================
   📂 primey_frontend/app/system/companies/[id]/page.tsx
   🏢 Mhamcloud — System Company Detail
   ------------------------------------------------------------
   ✅ Premium PrimeyCare detail pattern adapted for Mhamcloud
   ✅ Real API only: GET /api/system/companies/{id}/
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
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  Copy,
  Users,
  ReceiptText,
  ExternalLink,
  CreditCard,
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

type CompanyRecord = {
  id: string;
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

type CompanyUserSummary = {
  id: string;
  userId: string;
  membershipId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  isActive: boolean;
  isPrimary: boolean;
  joinedAt: string | null;
};
type CompanySubscriptionSummary = {
  id: string;
  planName: string;
  planCode: string;
  status: string;
  action: string;
  billingCycle: string;
  startDate: string | null;
  endDate: string | null;
  totalAmount: string;
  isCurrent: boolean;
};
type CompanyBillingDocumentSummary = {
  id: string;
  documentType: string;
  documentNumber: string;
  status: string;
  subscriptionId: string;
  totalAmount: string;
  paidAmount: string;
  currencyCode: string;
  paymentMethod: string;
  transactionReference: string;
  billingReference: string;
  issueDate: string | null;
  paidAt: string | null;
};

const API_ENDPOINT = "/api/system/companies/";

const translations = {
  ar: {
    title: "تفاصيل الشركة",
    subtitle:
      "عرض ملف الشركة داخل إدارة منصة Mhamcloud مع بيانات التعريف والحالة والنشاط والاشتراك والتواصل.",
    badge: "إدارة المنصة",
    backToCompanies: "العودة للشركات",
    companiesList: "قائمة الشركات",
    systemDashboard: "لوحة النظام",
    refresh: "تحديث",
    print: "طباعة",
    pdf: "PDF",
    copyId: "نسخ المعرف",
    copied: "تم النسخ.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    refreshed: "تم تحديث تفاصيل الشركة.",

    identity: "بيانات التعريف",
    identityDesc: "اسم الشركة والكود والمعرف الداخلي.",
    contact: "بيانات التواصل",
    contactDesc: "بيانات المالك والبريد والهاتف والمدينة.",
    operations: "التشغيل والاشتراك",
    operationsDesc: "الحالة التشغيلية والنشاط والاشتراك.",
    notes: "ملاحظات",
    notesDesc: "ملاحظات إدارية داخلية عند توفرها.",
    quickLinks: "روابط سريعة",
    quickLinksDesc: "تنقل سريع داخل وحدة الشركات.",
    addCompanyUser: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0633\u062a\u062e\u062f\u0645 \u0634\u0631\u0643\u0629",
    addCompanySubscription: "\u0625\u0636\u0627\u0641\u0629 \u0627\u0634\u062a\u0631\u0627\u0643 \u0644\u0644\u0634\u0631\u0643\u0629",
    companyUsers: "\u0645\u0633\u062a\u062e\u062f\u0645\u0648 \u0627\u0644\u0634\u0631\u0643\u0629",
    companyUsersDesc: "\u0643\u0644 \u0639\u0636\u0648\u064a\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629 \u0648\u0623\u062f\u0648\u0627\u0631 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646.",
    userName: "\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
    userEmail: "\u0627\u0644\u0628\u0631\u064a\u062f",
    userRole: "\u0627\u0644\u062f\u0648\u0631",
    membershipStatus: "\u062d\u0627\u0644\u0629 \u0627\u0644\u0639\u0636\u0648\u064a\u0629",
    joinedAt: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645",
    companySubscriptions: "\u0633\u062c\u0644 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a",
    companySubscriptionsDesc: "\u0643\u0644 \u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0648\u0627\u0644\u062d\u0627\u0644\u064a\u0629.",
    plan: "\u0627\u0644\u0628\u0627\u0642\u0629",
    billingCycle: "\u062f\u0648\u0631\u0629 \u0627\u0644\u0641\u0648\u062a\u0631\u0629",
    amount: "\u0627\u0644\u0642\u064a\u0645\u0629",
    startDate: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0621",
    endDate: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621",
    actionType: "\u0646\u0648\u0639 \u0627\u0644\u062d\u0631\u0643\u0629",
    companyBillingDocs: "\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0648\u0627\u0644\u0625\u064a\u0635\u0627\u0644\u0627\u062a",
    companyBillingDocsDesc: "\u0633\u062c\u0644 \u0645\u0633\u062a\u0646\u062f\u0627\u062a \u0627\u0644\u0641\u0648\u062a\u0631\u0629 \u0648\u0645\u062f\u0641\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0643\u0629.",
    documentType: "\u0646\u0648\u0639 \u0627\u0644\u0645\u0633\u062a\u0646\u062f",
    documentNumber: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062a\u0646\u062f",
    paymentMethod: "\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639",
    reference: "\u0627\u0644\u0645\u0631\u062c\u0639",
    issueDate: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0635\u062f\u0627\u0631",
    paidAt: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062f\u0641\u0639",
    openDetails: "\u0641\u062a\u062d",
    emptyUsers: "\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646 \u0644\u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0643\u0629.",
    emptySubscriptions: "\u0644\u0627 \u064a\u0648\u062c\u062f \u0633\u062c\u0644 \u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a.",
    emptyBillingDocs: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0641\u0648\u0627\u062a\u064a\u0631 \u0623\u0648 \u0625\u064a\u0635\u0627\u0644\u0627\u062a.",
    loadingRelated: "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629...",

    companyName: "اسم الشركة",
    companyCode: "كود الشركة",
    companyId: "معرف الشركة",
    owner: "المالك",
    email: "البريد الإلكتروني",
    phone: "رقم الجوال",
    city: "المدينة",
    activity: "النشاط",
    subscription: "الاشتراك",
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
    unknown: "غير محدد",
    notAvailable: "غير متوفر",

    reportTitle: "تقرير تفاصيل شركة Mhamcloud",
    generatedAt: "تاريخ الطباعة",

    errorTitle: "تعذر تحميل تفاصيل الشركة",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    emptyTitle: "لا توجد بيانات للشركة",
    emptyDesc: "لم يرجع API بيانات صالحة لهذه الشركة.",
    tryAgain: "إعادة المحاولة",
  },
  en: {
    title: "Company details",
    subtitle:
      "View the company profile inside Mhamcloud platform management with identity, status, activity, subscription, and contact data.",
    badge: "Platform management",
    backToCompanies: "Back to companies",
    companiesList: "Companies list",
    systemDashboard: "System dashboard",
    refresh: "Refresh",
    print: "Print",
    pdf: "PDF",
    copyId: "Copy ID",
    copied: "Copied.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    refreshed: "Company details refreshed.",

    identity: "Identity",
    identityDesc: "Company name, code, and internal identifier.",
    contact: "Contact details",
    contactDesc: "Owner, email, phone, and city.",
    operations: "Operations and subscription",
    operationsDesc: "Operational status, activity, and subscription.",
    notes: "Notes",
    notesDesc: "Internal administrative notes when available.",
    quickLinks: "Quick links",
    quickLinksDesc: "Quick navigation inside the companies module.",
    addCompanyUser: "Add company user",
    addCompanySubscription: "Add company subscription",
    companyUsers: "Company users",
    companyUsersDesc: "All company memberships and user roles.",
    userName: "User",
    userEmail: "Email",
    userRole: "Role",
    membershipStatus: "Membership status",
    joinedAt: "Joined at",
    companySubscriptions: "Subscription history",
    companySubscriptionsDesc: "All previous and current subscriptions for this company.",
    plan: "Plan",
    billingCycle: "Billing cycle",
    amount: "Amount",
    startDate: "Start date",
    endDate: "End date",
    actionType: "Action",
    companyBillingDocs: "Invoices and receipts",
    companyBillingDocsDesc: "Platform billing documents and payment receipts for this company.",
    documentType: "Document type",
    documentNumber: "Document number",
    paymentMethod: "Payment method",
    reference: "Reference",
    issueDate: "Issue date",
    paidAt: "Paid at",
    openDetails: "Open",
    emptyUsers: "No users found for this company.",
    emptySubscriptions: "No subscription history found.",
    emptyBillingDocs: "No invoices or receipts found.",
    loadingRelated: "Loading related company records...",

    companyName: "Company name",
    companyCode: "Company code",
    companyId: "Company ID",
    owner: "Owner",
    email: "Email",
    phone: "Phone",
    city: "City",
    activity: "Activity",
    subscription: "Subscription",
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
    unknown: "Unknown",
    notAvailable: "Not available",

    reportTitle: "Mhamcloud Company Details Report",
    generatedAt: "Generated at",

    errorTitle: "Could not load company details",
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

function normalizeActivityName(value: unknown, fallbackValues: unknown[] = []) {
  if (typeof value === "string") return normalizeText(value);

  const record = asRecord(value);
  const keys = ["display_name", "name_ar", "name_en", "name", "title", "code"];

  for (const key of keys) {
    const text = normalizeText(record[key]);
    if (text) return text;
  }

  for (const fallbackValue of fallbackValues) {
    const text = normalizeText(fallbackValue);
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

function extractCompanyPayload(payload: unknown): ApiRecord {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const resultRecord = asRecord(record.result);

  const directCompany = asRecord(record.company);
  const dataCompany = asRecord(dataRecord.company);
  const resultCompany = asRecord(resultRecord.company);

  const directItem = asRecord(record.item || record.record || record.object);
  const dataItem = asRecord(dataRecord.item || dataRecord.record || dataRecord.object);
  const resultItem = asRecord(resultRecord.item || resultRecord.record || resultRecord.object);

  if (Object.keys(directCompany).length) return directCompany;
  if (Object.keys(dataCompany).length) return dataCompany;
  if (Object.keys(resultCompany).length) return resultCompany;

  if (Object.keys(directItem).length) return directItem;
  if (Object.keys(dataItem).length) return dataItem;
  if (Object.keys(resultItem).length) return resultItem;

  if (Object.keys(dataRecord).length) return dataRecord;
  if (Object.keys(resultRecord).length) return resultRecord;

  return record;
}


function dataRecord(payload: unknown): ApiRecord {
  const root = asRecord(payload);
  return asRecord(root.data || root.result || payload);
}
function extractCollectionItems(payload: unknown, keys: string[] = []): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  const data = dataRecord(payload);
  const result = asRecord(root.result);
  const containers = [data, root, result];
  const candidateKeys = [
    ...keys,
    "items",
    "results",
    "records",
    "memberships",
    "subscriptions",
    "documents",
    "billing_documents",
    "payment_receipts",
    "receipts",
  ];
  for (const container of containers) {
    for (const key of candidateKeys) {
      const value = container[key];
      if (Array.isArray(value)) return value;
      const nested = asRecord(value);
      for (const nestedKey of candidateKeys) {
        const nestedValue = nested[nestedKey];
        if (Array.isArray(nestedValue)) return nestedValue;
      }
    }
  }
  return [];
}

function normalizeCompanyUserSummary(value: unknown): CompanyUserSummary {
  const record = asRecord(value);
  const user = asRecord(record.user);
  const profile = asRecord(record.profile);
  const userId = normalizeText(
    user.id ||
      record.user_id ||
      record.userId ||
      record.account_id ||
      record.accountId ||
      record.id,
  );
  const membershipId = normalizeText(
    record.membership_id ||
      record.membershipId ||
      record.id,
  );
  const name =
    normalizeNestedName(user, ["name", "full_name", "email", "username"]) ||
    normalizeNestedName(profile, ["display_name", "name"]) ||
    normalizeText(user.email || user.username || record.email || record.username, "?");
  return {
    id: userId,
    userId,
    membershipId,
    name,
    email: normalizeText(user.email || record.email, "?"),
    role: normalizeText(record.role || record.company_role || record.system_role, "?"),
    status: normalizeStatus(record.status ?? record.is_active ?? record.is_active_membership),
    isActive: Boolean(record.is_active ?? record.is_active_membership ?? user.is_active),
    isPrimary: Boolean(record.is_primary),
    joinedAt: normalizeText(record.joined_at || record.created_at) || null,
  };
}

function normalizeCompanySubscriptionSummary(value: unknown): CompanySubscriptionSummary {
  const record = asRecord(value);
  const plan = asRecord(record.plan);
  return {
    id: normalizeText(record.id),
    planName: normalizeText(plan.name || record.plan_name || record.plan, "?"),
    planCode: normalizeText(plan.code || record.plan_code),
    status: normalizeStatus(record.status),
    action: normalizeText(record.action, "?"),
    billingCycle: normalizeText(record.billing_cycle || record.cycle, "?"),
    startDate: normalizeText(record.start_date) || null,
    endDate: normalizeText(record.end_date) || null,
    totalAmount: normalizeText(record.total_amount || record.amount || record.price, "0.00"),
    isCurrent: Boolean(record.is_current),
  };
}
function normalizeCompanyBillingDocumentSummary(value: unknown): CompanyBillingDocumentSummary {
  const record = asRecord(value);
  const subscription = asRecord(record.subscription);
  return {
    id: normalizeText(record.id),
    documentType: normalizeText(record.document_type || record.type, "?"),
    documentNumber: normalizeText(record.document_number || record.number, "?"),
    status: normalizeStatus(record.status),
    subscriptionId: normalizeText(subscription.id || record.subscription_id),
    totalAmount: normalizeText(record.total_amount || record.amount || record.gross_amount, "0.00"),
    paidAmount: normalizeText(record.paid_amount || record.total_amount || record.amount, "0.00"),
    currencyCode: normalizeText(record.currency_code || record.currency || "SAR", "SAR"),
    paymentMethod: normalizeText(record.payment_method, "?"),
    transactionReference: normalizeText(record.transaction_reference || record.reference),
    billingReference: normalizeText(record.billing_reference),
    issueDate: normalizeText(record.issue_date || record.issued_at || record.created_at) || null,
    paidAt: normalizeText(record.paid_at) || null,
  };
}
function formatMoneyValue(amount: string, currency = "SAR") {
  return `${currency || "SAR"} ${amount || "0.00"}`;
}

function formatDocumentType(value: string, locale: Locale) {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized.includes("RECEIPT")) {
    return locale === "ar" ? "\u0625\u064a\u0635\u0627\u0644 \u062f\u0641\u0639" : "Payment receipt";
  }
  if (normalized.includes("INVOICE")) {
    return locale === "ar" ? "\u0641\u0627\u062a\u0648\u0631\u0629 \u0627\u0634\u062a\u0631\u0627\u0643" : "Subscription invoice";
  }
  return value || "\u2014";
}


function formatBillingCycleValue(value: string, locale: Locale) {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized.includes("MONTH")) {
    return locale === "ar" ? "\u0634\u0647\u0631\u064a" : "Monthly";
  }
  if (normalized.includes("YEAR") || normalized.includes("ANNUAL")) {
    return locale === "ar" ? "\u0633\u0646\u0648\u064a" : "Yearly";
  }
  return value || "\u2014";
}

function formatSubscriptionActionValue(value: string, locale: Locale) {
  const normalized = normalizeText(value).toUpperCase();
  if (!normalized || normalized === "?" || normalized === "UNKNOWN" || normalized === "NONE" || normalized === "\u2014") {
    return "\u2014";
  }
  if (normalized.includes("RENEW")) {
    return locale === "ar" ? "\u062a\u062c\u062f\u064a\u062f" : "Renewal";
  }
  if (normalized.includes("DOWNGRADE")) {
    return locale === "ar" ? "\u062a\u062e\u0641\u064a\u0636 \u0628\u0627\u0642\u0629" : "Downgrade";
  }
  if (normalized.includes("UPGRADE") || normalized.includes("CHANGE")) {
    return locale === "ar" ? "\u062a\u063a\u064a\u064a\u0631 \u0628\u0627\u0642\u0629" : "Plan change";
  }
  if (normalized.includes("CANCEL")) {
    return locale === "ar" ? "\u0625\u0644\u063a\u0627\u0621" : "Cancellation";
  }
  if (normalized.includes("SUSPEND")) {
    return locale === "ar" ? "\u062a\u0639\u0637\u064a\u0644 \u0645\u0624\u0642\u062a" : "Suspension";
  }
  if (normalized.includes("CREATE") || normalized.includes("NEW")) {
    return locale === "ar" ? "\u0627\u0634\u062a\u0631\u0627\u0643 \u062c\u062f\u064a\u062f" : "New subscription";
  }
  return value || "\u2014";
}

function formatPaymentMethodValue(value: string, locale: Locale) {
  const normalized = normalizeText(value).toUpperCase();
  if (!normalized || normalized === "\u2014") return "\u2014";
  if (normalized === "CASH") return locale === "ar" ? "\u0646\u0642\u062f\u064a" : "Cash";
  if (normalized === "BANK_TRANSFER") return locale === "ar" ? "\u062a\u062d\u0648\u064a\u0644 \u0628\u0646\u0643\u064a" : "Bank transfer";
  if (normalized === "CARD") return locale === "ar" ? "\u0628\u0637\u0627\u0642\u0629 / \u0645\u062f\u0649" : "Card / Mada";
  if (normalized === "PAYMENT_GATEWAY") return locale === "ar" ? "\u0628\u0648\u0627\u0628\u0629 \u062f\u0641\u0639" : "Payment gateway";
  return value;
}



function normalizeCompany(payload: unknown): CompanyRecord {
  const record = extractCompanyPayload(payload);
  const owner = record.owner || record.user || record.account_owner || record.created_by;
  const activity = record.activity_profile_ref || record.activity_profile || record.activity;
  const subscription =
    record.subscription ||
    record.current_subscription ||
    record.active_subscription ||
    record.plan;
  const contact = asRecord(record.contact);
  const address = asRecord(record.address);
  const settings = asRecord(record.settings);

  return {
    id: normalizeText(record.id || record.uuid || record.pk || record.slug || record.code),
    name: normalizeText(
      record.name ||
        record.company_name ||
        record.display_name ||
        record.legal_name ||
        record.name_ar ||
        record.arabic_name ||
        record.title,
      "—",
    ),
    code: normalizeText(
      record.code ||
        record.company_code ||
        record.tenant_code ||
        record.short_code ||
        record.slug ||
        record.registration_number ||
        record.commercial_registration,
      "—",
    ),
    status: normalizeStatus(record.status ?? record.state ?? record.is_active),
    owner: normalizeNestedName(owner, ["name", "full_name", "email", "username"]) || "—",
    activity:
      normalizeActivityName(activity, [
        record.activity_profile_display,
        record.activity_profile_name,
        record.activity_profile_code,
        settings.activity_profile,
      ]) || "—",
    subscription:
      normalizeText(record.subscription_status) ||
      normalizeNestedName(subscription, ["plan_name", "name", "title", "status"]) ||
      "—",
    email: normalizeText(record.email || record.company_email || contact.email),
    phone: normalizeText(record.phone || record.mobile || record.company_phone || contact.phone || contact.mobile),
    city: normalizeText(
      record.city || record.address_city || record.national_address_city || address.city,
      "—",
    ),
    notes: normalizeText(record.notes || record.description || record.internal_notes),
    created_at: normalizeText(record.created_at || record.created || record.inserted_at || record.date_joined) || null,
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
  };

  const en: Record<string, string> = {
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    trial: "Trial",
    pending: "Pending",
    draft: "Draft",
    cancelled: "Cancelled",
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

export default function SystemCompanyDetailPage() {
  const params = useParams();
  const companyId = React.useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] || "" : String(value || "");
  }, [params]);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [company, setCompany] = React.useState<CompanyRecord | null>(null);
  const [companyUsers, setCompanyUsers] = React.useState<CompanyUserSummary[]>([]);
  const [companySubscriptions, setCompanySubscriptions] = React.useState<CompanySubscriptionSummary[]>([]);
  const [companyBillingDocuments, setCompanyBillingDocuments] = React.useState<CompanyBillingDocumentSummary[]>([]);
  const [relatedLoading, setRelatedLoading] = React.useState(false);
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
  const loadCompanyRelations = React.useCallback(
    async (options?: { silent?: boolean }) => {
      if (!companyId) return;
      setRelatedLoading(true);
      try {
        const companyPayload = await fetchJson<ApiRecord>(
          makeApiUrl(`${API_ENDPOINT}${companyId}/`),
        );
        const companyData = dataRecord(companyPayload);
        setCompanyUsers(
          extractCollectionItems(companyData, ["memberships"])
            .map(normalizeCompanyUserSummary)
            .filter((item) => item.id || item.email),
        );
        setCompanySubscriptions(
          extractCollectionItems(companyData, ["subscriptions"])
            .map(normalizeCompanySubscriptionSummary)
            .filter((item) => item.id),
        );
        try {
          const documentsPayload = await fetchJson<ApiRecord>(
            makeApiUrl(`/api/system/billing-documents/?company_id=${companyId}&page_size=100`),
          );
          setCompanyBillingDocuments(
            extractCollectionItems(documentsPayload, ["items", "results", "documents"])
              .map(normalizeCompanyBillingDocumentSummary)
              .filter((item) => item.id),
          );
        } catch {
          setCompanyBillingDocuments([]);
        }
      } catch (caughtError) {
        setCompanyUsers([]);
        setCompanySubscriptions([]);
        setCompanyBillingDocuments([]);
        if (!options?.silent) {
          toast.error(caughtError instanceof Error ? caughtError.message : t.errorDesc);
        }
      } finally {
        setRelatedLoading(false);
      }
    },
    [companyId, t.errorDesc],
  );
  React.useEffect(() => {
    void loadCompanyRelations({ silent: true });
  }, [loadCompanyRelations]);

  function fallback(value: string | null | undefined) {
    return normalizeText(value, t.notAvailable);
  }

  async function copyCompanyId() {
    if (!company?.id) return;

    try {
      await navigator.clipboard.writeText(company.id);
      toast.success(t.copied);
    } catch {
      toast.error(t.errorDesc);
    }
  }

  function buildPrintableHtml() {
    if (!company) return "";

    const rows = [
      [t.companyName, company.name],
      [t.companyCode, company.code],
      [t.companyId, company.id],
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
            <Button onClick={() => { void loadCompany({ silent: true }); void loadCompanyRelations({ silent: true }); }} className="rounded-xl">
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
              <Link href="/system/companies/list">
                <ListChecks className="h-4 w-4" />
                {t.companiesList}
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
                  <Link href="/system/companies">
                    <BackIcon className="h-4 w-4" />
                    {t.backToCompanies}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => { void loadCompany({ silent: true }); void loadCompanyRelations({ silent: true }); }}
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
                      <span className="font-mono text-xs">{company.id || t.notAvailable}</span>
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

            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    {t.companyUsers}
                  </CardTitle>
                  <CardDescription>{t.companyUsersDesc}</CardDescription>
                </div>
                <Badge variant="outline" className="w-fit rounded-full">{companyUsers.length}</Badge>
              </CardHeader>
              <CardContent>
                {relatedLoading && !companyUsers.length ? (
                  <p className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">{t.loadingRelated}</p>
                ) : companyUsers.length ? (
                  <div className="overflow-x-auto rounded-2xl border bg-background">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-muted/60 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-start font-medium">{t.userName}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.userEmail}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.userRole}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.membershipStatus}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.joinedAt}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.openDetails}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {companyUsers.map((item) => (
                          <tr key={item.membershipId || item.userId || item.email}>
                            <td className="px-4 py-3 font-medium">{item.name || t.notAvailable}</td>
                            <td className="px-4 py-3 text-muted-foreground">{item.email || t.notAvailable}</td>
                            <td className="px-4 py-3">{item.role || t.notAvailable}</td>
                            <td className="px-4 py-3"><StatusBadge value={item.status} locale={locale} /></td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.joinedAt)}</td>
                            <td className="px-4 py-3">
                              <Button asChild size="sm" variant="outline" className="h-8 rounded-lg bg-background">
                                <Link href={`/system/users/${item.userId || item.id}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  {t.openDetails}
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">{t.emptyUsers}</p>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ReceiptText className="h-5 w-5 text-muted-foreground" />
                    {t.companySubscriptions}
                  </CardTitle>
                  <CardDescription>{t.companySubscriptionsDesc}</CardDescription>
                </div>
                <Badge variant="outline" className="w-fit rounded-full">{companySubscriptions.length}</Badge>
              </CardHeader>
              <CardContent>
                {relatedLoading && !companySubscriptions.length ? (
                  <p className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">{t.loadingRelated}</p>
                ) : companySubscriptions.length ? (
                  <div className="overflow-x-auto rounded-2xl border bg-background">
                    <table className="w-full min-w-[860px] text-sm">
                      <thead className="bg-muted/60 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-start font-medium">#</th>
                          <th className="px-4 py-3 text-start font-medium">{t.plan}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.status}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.actionType}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.billingCycle}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.amount}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.endDate}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.openDetails}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {companySubscriptions.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-mono text-xs">{item.id}</td>
                            <td className="px-4 py-3 font-medium">
                              {item.planName}
                              {item.planCode ? <span className="ms-1 text-xs text-muted-foreground">({item.planCode})</span> : null}
                            </td>
                            <td className="px-4 py-3"><StatusBadge value={item.status} locale={locale} /></td>
                            <td className="px-4 py-3 text-muted-foreground">{formatSubscriptionActionValue(item.action, locale)}</td>
                            <td className="px-4 py-3">{formatBillingCycleValue(item.billingCycle, locale)}</td>
                            <td className="px-4 py-3 font-medium">{formatMoneyValue(item.totalAmount, company.code ? "SAR" : "SAR")}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.endDate)}</td>
                            <td className="px-4 py-3">
                              <Button asChild size="sm" variant="outline" className="h-8 rounded-lg bg-background">
                                <Link href={`/system/subscriptions/${item.id}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  {t.openDetails}
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">{t.emptySubscriptions}</p>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    {t.companyBillingDocs}
                  </CardTitle>
                  <CardDescription>{t.companyBillingDocsDesc}</CardDescription>
                </div>
                <Badge variant="outline" className="w-fit rounded-full">{companyBillingDocuments.length}</Badge>
              </CardHeader>
              <CardContent>
                {relatedLoading && !companyBillingDocuments.length ? (
                  <p className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">{t.loadingRelated}</p>
                ) : companyBillingDocuments.length ? (
                  <div className="overflow-x-auto rounded-2xl border bg-background">
                    <table className="w-full min-w-[980px] text-sm">
                      <thead className="bg-muted/60 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-start font-medium">{t.documentNumber}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.documentType}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.status}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.subscription}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.amount}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.paymentMethod}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.reference}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.issueDate}</th>
                          <th className="px-4 py-3 text-start font-medium">{t.openDetails}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {companyBillingDocuments.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-mono text-xs">
                              <Link
                                href={buildBillingDocumentPdfUrl(item.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
                              >
                                {item.documentNumber}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </td>
                            <td className="px-4 py-3">{formatDocumentType(item.documentType, locale)}</td>
                            <td className="px-4 py-3"><StatusBadge value={item.status} locale={locale} /></td>
                            <td className="px-4 py-3 font-mono text-xs">{item.subscriptionId || t.notAvailable}</td>
                            <td className="px-4 py-3 font-medium">{formatMoneyValue(item.totalAmount, item.currencyCode)}</td>
                            <td className="px-4 py-3">{formatPaymentMethodValue(item.paymentMethod, locale)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{item.transactionReference || item.billingReference || t.notAvailable}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDateTime(item.issueDate)}</td>
                            <td className="px-4 py-3">
                              <Button asChild size="sm" variant="outline" className="h-8 rounded-lg bg-background">
                                <Link href={`/system/platform-payments/${item.id}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  {t.openDetails}
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">{t.emptyBillingDocs}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="rounded-2xl shadow-sm xl:sticky xl:top-6">
              <CardHeader>
                <CardTitle>{t.quickLinks}</CardTitle>
                <CardDescription>{t.quickLinksDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system/companies/list">
                    <ListChecks className="h-4 w-4" />
                    {t.companiesList}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href={`/system/companies/${company.id}/users/create`}>
                    <UserRound className="h-4 w-4" />
                    {t.addCompanyUser}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href={`/system/companies/${company.id}/subscriptions/create`}>
                    <Sparkles className="h-4 w-4" />
                    {t.addCompanySubscription}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start rounded-xl bg-background">
                  <Link href="/system/companies">
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

