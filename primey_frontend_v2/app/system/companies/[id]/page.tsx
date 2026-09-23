"use client";

// phase47D1B1_system_dashboard_design_contract=true

const BILLING_DOCUMENT_API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
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
   ✅ Arabic/English via Mhamcloud-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  MoreVertical,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Hash,
  Pencil,
  ListChecks,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  registerBrandButtonClass,
  registerOutlineButtonClass,
} from "@/components/ui/data-register";
import { DataRegisterTableFrame } from "@/components/ui/data-register-table";
import {
  downloadExcelReport,
  type ExcelReportSection,
} from "@/lib/excel-report";
import { openPrintReport } from "@/lib/print-report";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  commercialRegistration: string;
  taxNumber: string;
  nationalAddress: string;
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
  branchAccessMode: string;
  branches: Array<{ id: string; name: string; code: string; isDefault: boolean }>;
};

type CompanyBranchSummary = { id:string; name:string; code:string; type:string; status:string; isActive:boolean; isDefault:boolean; activity:string; manager:string; email:string; phone:string; city:string; address:string };
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
  legacyPaidVia: string;
  legacyTransactionReference: string;
  legacyStatus: string;
  legacyPackageName: string;
  legacyCreatedBy: string;
  legacyCreatedAt: string | null;
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
    editCompany: "\u062a\u0639\u062f\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u0631\u0643\u0629",
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
    editCompany: "Edit company",
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
  return window.localStorage.getItem("Mhamcloud-locale") === "en" ? "en" : "ar";
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
function canonicalActivityCode(value: unknown) {
  const code = normalizeText(value).toUpperCase();
  return ["GENERAL", "RETAIL", "WHOLESALE"].includes(code) ? "COMMERCE" : code;
}
function activityDisplayLabel(value: unknown, locale: Locale) {
  const code=canonicalActivityCode(value);
  const ar:Record<string,string>={COMMERCE:"التجارة",RESTAURANT:"المطاعم",SERVICES:"الخدمات",MANUFACTURING:"التصنيع",JEWELRY:"الذهب والمجوهرات",CONTRACTING:"المقاولات"};
  const en:Record<string,string>={COMMERCE:"Commerce",RESTAURANT:"Restaurant",SERVICES:"Services",MANUFACTURING:"Manufacturing",JEWELRY:"Jewelry / Gold",CONTRACTING:"Contracting"};
  return (locale==="ar"?ar:en)[code]||normalizeText(value,"—");
}
function companyRoleDisplayLabel(value:unknown,locale:Locale){
  const code=normalizeText(value).toUpperCase(); if(locale!=="ar")return normalizeText(value,"—");
  return ({OWNER:"مالك",ADMIN:"مدير",MANAGER:"مدير فرع",ACCOUNTANT:"محاسب",CASHIER:"كاشير",SALES:"مبيعات",INVENTORY:"مخزون",HR:"موارد بشرية",EMPLOYEE:"موظف",VIEWER:"مشاهد"} as Record<string,string>)[code]||normalizeText(value,"—");
}
function branchTypeDisplayLabel(value:unknown,locale:Locale){
  const code=normalizeText(value).toUpperCase(); if(locale!=="ar")return normalizeText(value,"—");
  return ({HEAD_OFFICE:"مقر رئيسي",BRANCH:"فرع",WAREHOUSE:"مستودع",POS:"نقطة بيع",SERVICE_CENTER:"مركز خدمة"} as Record<string,string>)[code]||normalizeText(value,"—");
}
function normalizeCompanyBranchSummary(value:unknown):CompanyBranchSummary{
  const x=asRecord(value);return {id:normalizeText(x.id),name:normalizeText(x.display_name||x.name,"—"),code:normalizeText(x.branch_code,"—"),type:normalizeText(x.branch_type,"—"),status:normalizeStatus(x.status??x.is_active),isActive:Boolean(x.is_active),isDefault:Boolean(x.is_default),activity:canonicalActivityCode(x.effective_activity_code||"COMMERCE"),manager:normalizeText(x.manager_name),email:normalizeText(x.email),phone:normalizeText(x.mobile||x.phone),city:normalizeText(x.city),address:normalizeText(x.national_address_line)};
}
function branchAccessDisplayLabel(item:CompanyUserSummary,locale:Locale){
  if(item.branchAccessMode==="ALL")return locale==="ar"?"جميع الفروع":"All branches";
  if(item.branchAccessMode==="RESTRICTED")return item.branches.map(b=>b.name).filter(Boolean).join("، ")||(locale==="ar"?"فروع محددة":"Restricted branches");
  return locale==="ar"?"غير محسوم":"Unresolved";
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
    branchAccessMode: normalizeText(asRecord(record.branch_access).mode, "LEGACY_UNRESOLVED"),
    branches: extractCollectionItems(asRecord(record.branch_access), ["branches"]).map((v)=>{const b=asRecord(v);return {id:normalizeText(b.id),name:normalizeText(b.name,"—"),code:normalizeText(b.branch_code,"—"),isDefault:Boolean(b.is_default)};}),
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
    legacyPaidVia: normalizeText(asRecord(asRecord(record.legacy).subscription).paid_via),
    legacyTransactionReference: normalizeText(asRecord(asRecord(record.legacy).subscription).payment_transaction_id),
    legacyStatus: normalizeText(asRecord(asRecord(record.legacy).subscription).status),
    legacyPackageName: normalizeText(asRecord(asRecord(record.legacy).subscription).package_name),
    legacyCreatedBy: normalizeText(asRecord(asRecord(record.legacy).subscription).created_by_name),
    legacyCreatedAt: normalizeText(asRecord(asRecord(record.legacy).subscription).created_at) || null,
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

function formatMoneyNumber(amount: string) {
  const parsed = Number(String(amount ?? "0").replace(/,/g, ""));
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function SarAmount({ amount, label }: { amount: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-medium tabular-nums">
      <Image src="/currency/sar.svg" alt={label} width={14} height={14} />
      {formatMoneyNumber(amount)}
    </span>
  );
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
    commercialRegistration: normalizeText(record.commercial_registration),
    taxNumber: normalizeText(record.tax_number),
    nationalAddress: normalizeText(record.national_address_line || record.short_address || record.address),
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
    expired: "منتهي",
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle icon={Icon} iconPosition="opposite">
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className="truncate text-xl font-bold tracking-tight">{value}</div>
      </CardContent>
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
    <div className="flex items-start gap-3 rounded-lg border bg-background p-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#a57b3d]/15 bg-[#a57b3d]/[0.07] text-[#a57b3d]">
        <Icon className="size-4" />
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
    <main className="w-full text-foreground">
      <div className="w-full space-y-4 lg:space-y-6">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-8 w-72" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
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
  const [companyBranches, setCompanyBranches] = React.useState<CompanyBranchSummary[]>([]);
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
    window.addEventListener("Mhamcloud-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("Mhamcloud-locale-changed", applyLocale);
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
        setCompanyBranches(extractCollectionItems(companyData, ["branches"]).map(normalizeCompanyBranchSummary).filter((item)=>item.id));
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


  function getRelatedRegisterSection(
    kind: "users" | "subscriptions" | "billing",
  ): ExcelReportSection {
    if (kind === "users") {
      return {
        title: t.companyUsers,
        headers: [t.userName, t.userEmail, t.userRole, t.membershipStatus, t.joinedAt],
        widths: [210, 230, 150, 150, 170],
        rows: companyUsers.map((item) => [
          { value: item.name || t.notAvailable, type: "text" as const },
          { value: item.email || t.notAvailable, type: "text" as const },
          { value: item.role || t.notAvailable, type: "text" as const },
          { value: getStatusLabel(item.status, locale), type: "text" as const },
          { value: formatDateTime(item.joinedAt), type: "text" as const },
        ]),
      };
    }

    if (kind === "subscriptions") {
      return {
        title: t.companySubscriptions,
        headers: ["#", t.plan, t.status, t.actionType, t.billingCycle, t.amount, t.endDate],
        widths: [90, 200, 130, 160, 140, 150, 170],
        rows: companySubscriptions.map((item) => [
          { value: item.id, type: "text" as const },
          {
            value: item.planCode
              ? `${item.legacyPackageName || item.planName} (${item.planCode})`
              : item.planName,
            type: "text" as const,
          },
          { value: getStatusLabel(item.status, locale), type: "text" as const },
          { value: formatSubscriptionActionValue(item.action, locale), type: "text" as const },
          { value: formatBillingCycleValue(item.billingCycle, locale), type: "text" as const },
          { value: formatMoneyValue(item.totalAmount, "SAR"), type: "text" as const },
          { value: formatDateTime(item.endDate), type: "text" as const },
        ]),
      };
    }

    return {
      title: t.companyBillingDocs,
      headers: [
        t.documentNumber,
        t.documentType,
        t.status,
        t.subscription,
        t.amount,
        t.paymentMethod,
        t.reference,
        t.issueDate,
      ],
      widths: [180, 170, 130, 120, 150, 160, 190, 170],
      rows: companyBillingDocuments.map((item) => [
        { value: item.documentNumber, type: "text" as const },
        { value: formatDocumentType(item.documentType, locale), type: "text" as const },
        { value: getStatusLabel(item.status, locale), type: "text" as const },
        { value: item.subscriptionId || t.notAvailable, type: "text" as const },
        { value: formatMoneyValue(item.totalAmount, item.currencyCode), type: "text" as const },
        { value: formatPaymentMethodValue(item.paymentMethod, locale), type: "text" as const },
        {
          value: item.transactionReference || item.billingReference || t.notAvailable,
          type: "text" as const,
        },
        { value: formatDateTime(item.issueDate), type: "text" as const },
      ]),
    };
  }

  function relatedRegisterCount(
    kind: "users" | "subscriptions" | "billing",
  ) {
    if (kind === "users") return companyUsers.length;
    if (kind === "subscriptions") return companySubscriptions.length;
    return companyBillingDocuments.length;
  }

  function exportRelatedRegister(
    kind: "users" | "subscriptions" | "billing",
  ) {
    const count = relatedRegisterCount(kind);

    if (!count) {
      toast.error(
        locale === "ar"
          ? "لا توجد بيانات للتصدير."
          : "There is no data to export.",
      );
      return;
    }

    const section = getRelatedRegisterSection(kind);

    downloadExcelReport({
      locale,
      title: `${company?.name || t.title} — ${section.title}`,
      subtitle: t.subtitle,
      filename: `Mhamcloud-company-${company?.id || companyId}-${kind}-${new Date()
        .toISOString()
        .slice(0, 10)}.xls`,
      generatedAtLabel: t.generatedAt,
      sections: [section],
    });

    toast.success(
      locale === "ar"
        ? "تم تجهيز ملف Excel بنجاح."
        : "Excel file prepared successfully.",
    );
  }

  function printLegacySubscriptionReceipt(item: CompanySubscriptionSummary) {
    if (!company) return;
    const paymentChannel = item.legacyPaidVia.toLowerCase() === "offline" ? (locale === "ar" ? "خارج البوابة / يدوي" : "Offline / manual") : (item.legacyPaidVia || t.notAvailable);
    const sourceStatus = item.legacyStatus.toLowerCase() === "approved" ? (locale === "ar" ? "معتمدة" : "Approved") : (item.legacyStatus || t.notAvailable);
    const rows = [
      [locale === "ar" ? "اسم الشركة" : "Company", company.name],
      [locale === "ar" ? "كود الشركة" : "Company code", company.code],
      [locale === "ar" ? "المالك / المسؤول" : "Owner / administrator", company.owner],
      [locale === "ar" ? "الجوال" : "Phone", fallback(company.phone)],
      [locale === "ar" ? "المدينة" : "City", fallback(company.city)],
      [locale === "ar" ? "السجل التجاري" : "Commercial registration", fallback(company.commercialRegistration)],
      [locale === "ar" ? "الرقم الضريبي" : "Tax number", fallback(company.taxNumber)],
      [locale === "ar" ? "الباقة" : "Package", item.legacyPackageName || item.planName],
      [locale === "ar" ? "رقم الاشتراك" : "Subscription ID", item.id],
      [locale === "ar" ? "بداية الاشتراك" : "Start date", formatDateTime(item.startDate)],
      [locale === "ar" ? "نهاية الاشتراك" : "End date", formatDateTime(item.endDate)],
      [locale === "ar" ? "دورة الفوترة" : "Billing cycle", formatBillingCycleValue(item.billingCycle, locale)],
      [locale === "ar" ? "المبلغ" : "Amount", `${formatMoneyNumber(item.totalAmount)} SAR`],
      [locale === "ar" ? "حالة العملية" : "Source status", sourceStatus],
      [locale === "ar" ? "قناة الدفع" : "Payment channel", paymentChannel],
      [locale === "ar" ? "مرجع العملية" : "Transaction reference", item.legacyTransactionReference || t.notAvailable],
      [locale === "ar" ? "منشئ الاشتراك" : "Subscription created by", item.legacyCreatedBy || t.notAvailable],
      [locale === "ar" ? "تاريخ العملية" : "Transaction date", formatDateTime(item.legacyCreatedAt)],
    ];
    const tableHtml = `<section class="report-section"><h2>${escapeHtml(locale === "ar" ? "بيانات الاشتراك والدفع" : "Subscription and payment")}</h2><table class="data"><tbody>${rows.map(([label,value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table><p>${escapeHtml(locale === "ar" ? "مستند اشتراك تاريخي مهاجر من مهام، وليس فاتورة ضريبية أو إيصال بوابة دفع إلكترونية من Primey." : "Historical migrated subscription document; not a Primey tax invoice or electronic gateway receipt.")}</p></section>`;
    const opened = openPrintReport({ locale, title: locale === "ar" ? "مستند اشتراك ودفع تاريخي" : "Historical subscription payment document", subtitle: `${company.name} - ${item.legacyPackageName || item.planName}`, tableHtml, recordsCount: 1, recordsLabel: locale === "ar" ? "اشتراك" : "subscription", generatedAtLabel: t.generatedAt });
    if (!opened) { toast.error(locale === "ar" ? "تعذر فتح نافذة الطباعة." : "Could not open print window."); return; }
    toast.success(locale === "ar" ? "تم تجهيز مستند الاشتراك للطباعة." : "Subscription document prepared.");
  }

  function printRelatedRegister(
    kind: "users" | "subscriptions" | "billing",
  ) {
    const count = relatedRegisterCount(kind);

    if (!count) {
      toast.error(
        locale === "ar"
          ? "لا توجد بيانات للطباعة."
          : "There is no data to print.",
      );
      return;
    }

    const section = getRelatedRegisterSection(kind);

    const tableHtml = `
      <section class="report-section">
        <h2>${escapeHtml(section.title)}</h2>
        <table class="data">
          <thead>
            <tr>
              ${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${section.rows
              .map(
                (row) => `
                  <tr>
                    ${row.map((cell) => `<td>${escapeHtml(cell.value)}</td>`).join("")}
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </section>
    `;

    const opened = openPrintReport({
      locale,
      title: `${company?.name || t.title} — ${section.title}`,
      subtitle: t.subtitle,
      tableHtml,
      recordsCount: count,
      recordsLabel: t.openDetails,
      generatedAtLabel: t.generatedAt,
    });

    if (!opened) {
      toast.error(
        locale === "ar"
          ? "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة."
          : "Could not open the print window. Allow pop-ups and try again.",
      );
      return;
    }

    toast.success(
      locale === "ar"
        ? "تم تجهيز صفحة الطباعة."
        : "Print page prepared.",
    );
  }

  function openPrintWindow() {
    if (!company) return;

    const opened = openPrintReport({
      locale,
      title: t.reportTitle,
      subtitle: `${company.name} · ${company.code}`,
      tableHtml: buildPrintableHtml(),
      recordsCount: 1,
      recordsLabel: locale === "ar" ? "شركة" : "company",
      generatedAtLabel: t.generatedAt,
    });

    if (!opened) {
      toast.error(
        locale === "ar"
          ? "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة."
          : "Could not open the print window. Allow pop-ups and try again.",
      );
      return;
    }

    toast.success(
      locale === "ar"
        ? "تم تجهيز صفحة الطباعة."
        : "Print page prepared.",
    );
  }

  if (loading) return <CompanyDetailSkeleton />;

  if (error) {
    return (
      <main dir={dir} className="w-full text-foreground">
        <Card className="mx-auto max-w-3xl border-destructive/30">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => { void loadCompany({ silent: true }); void loadCompanyRelations({ silent: true }); }} className={registerBrandButtonClass}>
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
      <main dir={dir} className="w-full text-foreground">
        <Card className="mx-auto max-w-3xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-muted p-4 text-muted-foreground">
              <CircleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.emptyTitle}</CardTitle>
            <CardDescription>{t.emptyDesc}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className={registerBrandButtonClass}>
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
    <main dir={dir} className="w-full text-foreground">
      <div className="w-full space-y-4 lg:space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
                {company.name || t.title}
              </h1>
              <StatusBadge value={company.status} locale={locale} />
            </div>
            <p className="mt-1 hidden max-w-3xl text-sm text-muted-foreground lg:block">
              {t.subtitle}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild variant="outline" className={registerOutlineButtonClass}>
              <Link href="/system/companies">
                <BackIcon className="h-4 w-4" />
                {t.backToCompanies}
              </Link>
            </Button>
            <Button asChild variant="outline" className={registerOutlineButtonClass}>
              <Link href={`/system/companies/${company.id}/edit`}>
                <Pencil className="h-4 w-4" />
                {t.editCompany}
              </Link>
            </Button>
            <Button asChild className={registerBrandButtonClass}>
              <Link href={`/system/companies/${company.id}/users/create`}>
                <UserRound className="h-4 w-4" />
                {t.addCompanyUser}
              </Link>
            </Button>
            <Button asChild variant="outline" className={registerOutlineButtonClass}>
              <Link href={`/system/companies/${company.id}/subscriptions/create`}>
                <ReceiptText className="h-4 w-4" />
                {t.addCompanySubscription}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className={registerOutlineButtonClass}
              onClick={() => {
                void loadCompany({ silent: true });
                void loadCompanyRelations({ silent: true });
              }}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t.refresh}
            </Button>
            <Button
              type="button"
              variant="default"
              className={registerBrandButtonClass}
              onClick={openPrintWindow}
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard title={t.companyCode} value={company.code || t.notAvailable} description={t.identity} icon={Hash} />
          <InfoCard title={t.status} value={<StatusBadge value={company.status} locale={locale} />} description={t.operations} icon={ShieldCheck} />
          <InfoCard title={t.activity} value={activityDisplayLabel(company.activity, locale)} description={t.operations} icon={Activity} />
          <InfoCard title={t.createdAt} value={formatDateTime(company.created_at)} description={t.identity} icon={CalendarDays} />
        </div>

        <div className="grid gap-4 lg:gap-6">
          <div className="space-y-4 lg:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle icon={Building2} iconPosition="opposite">{t.identity}</CardTitle>
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
                <DetailRow label={locale === "ar" ? "السجل التجاري" : "Commercial registration"} value={fallback(company.commercialRegistration)} icon={FileText} />
                <DetailRow label={locale === "ar" ? "الرقم الضريبي" : "Tax number"} value={fallback(company.taxNumber)} icon={Hash} />
                <DetailRow label={locale === "ar" ? "العنوان الوطني" : "National address"} value={fallback(company.nationalAddress)} icon={MapPin} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle icon={Mail} iconPosition="opposite">{t.contact}</CardTitle>
                <CardDescription>{t.contactDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <DetailRow label={t.owner} value={fallback(company.owner)} icon={UserRound} />
                <DetailRow label={t.email} value={fallback(company.email)} icon={Mail} />
                <DetailRow label={t.phone} value={fallback(company.phone)} icon={Phone} />
                <DetailRow label={t.city} value={fallback(company.city)} icon={MapPin} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle icon={Activity} iconPosition="opposite">{t.operations}</CardTitle>
                <CardDescription>{t.operationsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <DetailRow label={t.status} value={<StatusBadge value={company.status} locale={locale} />} icon={ShieldCheck} />
                <DetailRow label={t.activity} value={activityDisplayLabel(company.activity, locale)} icon={Activity} />
                <DetailRow label={t.subscription} value={companySubscriptions.find((item) => item.isCurrent)?.legacyPackageName || companySubscriptions.find((item) => item.isCurrent)?.planName || companySubscriptions.find((item) => ["ACTIVE", "TRIAL"].includes(item.status))?.legacyPackageName || companySubscriptions.find((item) => ["ACTIVE", "TRIAL"].includes(item.status))?.planName || fallback(company.subscription)} icon={CheckCircle2} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle icon={FileText} iconPosition="opposite">{t.notes}</CardTitle>
                <CardDescription>{t.notesDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="min-h-24 rounded-lg border bg-background p-4 text-sm leading-7 text-muted-foreground">
                  {company.notes || t.notAvailable}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><CardTitle icon={Building2}>{locale === "ar" ? "فروع الشركة" : "Company branches"}</CardTitle><CardDescription>{locale === "ar" ? "الفروع التشغيلية التابعة للشركة وبياناتها الحقيقية." : "Operational branches and real branch data."}</CardDescription></div>
                <Badge variant="outline" className="w-fit rounded-full">{companyBranches.length}</Badge>
              </CardHeader>
              <CardContent>
                {companyBranches.length ? <DataRegisterTableFrame className="overflow-x-auto"><table className="w-full min-w-[1040px] border-collapse text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="h-11 px-4 text-start">الفرع</th><th className="h-11 px-4 text-start">الكود</th><th className="h-11 px-4 text-start">النوع</th><th className="h-11 px-4 text-start">{t.activity}</th><th className="h-11 px-4 text-start">{t.city}</th><th className="h-11 px-4 text-start">مدير الفرع</th><th className="h-11 px-4 text-start">{t.phone}</th><th className="h-11 px-4 text-start">{t.status}</th></tr></thead>
                  <tbody className="divide-y">{companyBranches.map((branch)=><tr key={branch.id} className="hover:bg-muted/20"><td className="px-4 py-3 font-medium">{branch.name}{branch.isDefault ? <Badge variant="outline" className="ms-2 rounded-full">{locale === "ar" ? "افتراضي" : "Default"}</Badge>:null}</td><td className="px-4 py-3 font-mono text-xs">{branch.code}</td><td className="px-4 py-3">{branchTypeDisplayLabel(branch.type,locale)}</td><td className="px-4 py-3">{activityDisplayLabel(branch.activity,locale)}</td><td className="px-4 py-3">{branch.city||t.notAvailable}</td><td className="px-4 py-3">{branch.manager||t.notAvailable}</td><td className="px-4 py-3" dir="ltr">{branch.phone||t.notAvailable}</td><td className="px-4 py-3"><StatusBadge value={branch.status} locale={locale}/></td></tr>)}</tbody>
                </table></DataRegisterTableFrame> : <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">{locale === "ar" ? "لا توجد فروع مسجلة لهذه الشركة." : "No branches registered."}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle icon={Users}>{t.companyUsers}</CardTitle>
                  <CardDescription>{t.companyUsersDesc}</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="w-fit rounded-full">{companyUsers.length}</Badge>
                  <Button
                    type="button"
                    variant="outline"
                    className={registerOutlineButtonClass}
                    onClick={() => exportRelatedRegister("users")}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className={registerBrandButtonClass}
                    onClick={() => printRelatedRegister("users")}
                  >
                    <Printer className="h-4 w-4" />
                    {t.print}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {relatedLoading && !companyUsers.length ? (
                  <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">{t.loadingRelated}</p>
                ) : companyUsers.length ? (
                  <DataRegisterTableFrame className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.userName}</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.userEmail}</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.userRole}</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.membershipStatus}</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{locale === "ar" ? "الفروع المسموحة" : "Branch access"}</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.joinedAt}</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.openDetails}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {companyUsers.map((item) => (
                          <tr key={item.membershipId || item.userId || item.email}>
                            <td className="px-4 py-3 align-middle font-medium">{item.name || t.notAvailable}</td>
                            <td className="px-4 py-3 align-middle text-muted-foreground">{item.email || t.notAvailable}</td>
                            <td className="px-4 py-3 align-middle">{companyRoleDisplayLabel(item.role, locale)}</td>
                            <td className="px-4 py-3 align-middle"><StatusBadge value={item.status} locale={locale} /></td>
                            <td className="px-4 py-3 align-middle text-muted-foreground">{branchAccessDisplayLabel(item, locale)}</td>
                            <td className="px-4 py-3 align-middle text-muted-foreground">{formatDateTime(item.joinedAt)}</td>
                            <td className="px-4 py-3 align-middle">
                              <Button asChild size="sm" variant="outline" className={registerOutlineButtonClass}>
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
                  </DataRegisterTableFrame>
                ) : (
                  <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">{t.emptyUsers}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle icon={ReceiptText}>{t.companySubscriptions}</CardTitle>
                  <CardDescription>{t.companySubscriptionsDesc}</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="w-fit rounded-full">{companySubscriptions.length}</Badge>
                  <Button
                    type="button"
                    variant="outline"
                    className={registerOutlineButtonClass}
                    onClick={() => exportRelatedRegister("subscriptions")}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className={registerBrandButtonClass}
                    onClick={() => printRelatedRegister("subscriptions")}
                  >
                    <Printer className="h-4 w-4" />
                    {t.print}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {relatedLoading && !companySubscriptions.length ? (
                  <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">{t.loadingRelated}</p>
                ) : companySubscriptions.length ? (
                  <DataRegisterTableFrame className="overflow-x-auto">
                    <table className="w-full min-w-[860px] border-collapse text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">#</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.plan}</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.status}</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.actionType}</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.billingCycle}</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.amount}</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.endDate}</th><th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{locale === "ar" ? "قناة الدفع" : "Payment channel"}</th><th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.reference}</th>
                          <th className="h-11 px-4 text-start text-xs font-semibold text-muted-foreground">{t.openDetails}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {companySubscriptions.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-mono text-xs">{item.id}</td>
                            <td className="px-4 py-3 align-middle font-medium">
                              {item.legacyPackageName || item.planName}
                              {item.planCode ? <span className="ms-1 text-xs text-muted-foreground">({item.planCode})</span> : null}
                            </td>
                            <td className="px-4 py-3 align-middle"><StatusBadge value={item.status} locale={locale} /></td>
                            <td className="px-4 py-3 align-middle text-muted-foreground">{formatSubscriptionActionValue(item.action, locale)}</td>
                            <td className="px-4 py-3 align-middle">{formatBillingCycleValue(item.billingCycle, locale)}</td>
                            <td className="px-4 py-3 align-middle font-medium"><SarAmount amount={item.totalAmount} label="SAR" /></td>
                            <td className="px-4 py-3 align-middle text-muted-foreground">{formatDateTime(item.endDate)}</td><td className="px-4 py-3 align-middle">{item.legacyPaidVia.toLowerCase() === "offline" ? (locale === "ar" ? "خارج البوابة / يدوي" : "Offline / manual") : (item.legacyPaidVia || t.notAvailable)}</td><td className="px-4 py-3 align-middle font-mono text-xs">{item.legacyTransactionReference || t.notAvailable}</td>
                            <td className="px-4 py-3 align-middle">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" variant="outline" size="icon" aria-label={locale === "ar" ? "إجراءات الاشتراك" : "Subscription actions"}>
                                    <MoreVertical />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={locale === "ar" ? "start" : "end"}>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/system/subscriptions/${item.id}`}>
                                      <ExternalLink />
                                      {locale === "ar" ? "تفاصيل الاشتراك" : "Subscription details"}
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => printLegacySubscriptionReceipt(item)}>
                                    <Printer />
                                    {locale === "ar" ? "طباعة مستند الاشتراك" : "Print subscription document"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </DataRegisterTableFrame>
                ) : (
                  <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">{t.emptySubscriptions}</p>
                )}
              </CardContent>
            </Card>



          </div>

        </div>
      </div>
    </main>
  );
}
