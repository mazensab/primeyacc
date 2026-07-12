"use client";
/* ============================================================
   📂 primey_frontend/app/company/_components/company-party-detail-page.tsx
   🧠 PrimeyAcc — Company Party Detail
   ------------------------------------------------------------
   ✅ Approved company design
   ✅ Shared customer/supplier detail page
   ✅ Real company-scoped APIs only
   ✅ Header actions + semantic status confirmation
   ✅ KPI cards + identity/contact/finance/address cards
   ✅ Local Excel/print actions for every table
   ✅ Full party Excel/print report
   ✅ Clickable document rows
   ✅ No fabricated ledger/statement rows
   ✅ sonner + Arabic/English + English digits
   ✅ SAR icon from /currency/sar.svg
============================================================ */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  FileSpreadsheet,
  FileText,
  Hash,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Power,
  PowerOff,
  Printer,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Store,
  TriangleAlert,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
type PartyStatus = "active" | "inactive";
type DetailTab = "documents" | "payments" | "ledger" | "statement";
type ApiRecord = Record<string, unknown>;

type PartyDetailRecord = {
  id: string;
  kind: PartyKind;
  code: string;
  displayName: string;
  legalName: string;
  partyKind: "INDIVIDUAL" | "ORGANIZATION";
  status: PartyStatus;
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
  creditLimit: number;
  openingBalance: number;
  balance: number;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type DocumentRow = {
  id: string;
  number: string;
  date: string | null;
  status: string;
  amount: number;
  description: string;
  href: string;
};

type LedgerRow = {
  id: string;
  reference: string;
  date: string | null;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  href: string;
};

type PartyEditForm = {
  display_name: string;
  legal_name: string;
  contact_person: string;
  phone: string;
  mobile: string;
  whatsapp_number: string;
  email: string;
  vat_number: string;
  commercial_registration: string;
  city: string;
  district: string;
  street: string;
  building_number: string;
  additional_number: string;
  postal_code: string;
  short_address: string;
  address_line: string;
  credit_limit: string;
  opening_balance: string;
  notes: string;
};

type CollectionResult<T> = {
  rows: T[];
  error: string;
};
function isOptionalMissingEndpointError(message: string) {
  const normalized = message.trim().toLowerCase();
  const parts = normalized
    .replaceAll(":", " ")
    .replaceAll(".", " ")
    .split(" ")
    .filter(Boolean);
  return (
    normalized === "not found" ||
    normalized === "not found." ||
    (parts.includes("404") &&
      (parts.includes("http") ||
        parts.includes("status") ||
        (parts.includes("not") && parts.includes("found"))))
  );
}

const translations = {
  ar: {
    badge: "وحدة العملاء والموردين",
    customerTitle: "تفاصيل العميل",
    supplierTitle: "تفاصيل المورد",
    customerSubtitle:
      "ملف العميل التشغيلي مع بيانات التواصل، الأرصدة، الفواتير، الدفعات، ودفتر الأستاذ.",
    supplierSubtitle:
      "ملف المورد التشغيلي مع بيانات التواصل، الأرصدة، فواتير المشتريات، الدفعات، ودفتر الأستاذ.",
    backCustomers: "العودة للعملاء",
    backSuppliers: "العودة للموردين",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    refreshed: "تم تحديث التفاصيل.",
    exportReady: "تم تجهيز ملف Excel بنجاح.",
    printReady: "تم تجهيز صفحة الطباعة.",
    printBlocked: "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.",
    noExportRows: "لا توجد بيانات في هذا الجدول للتصدير.",
    noPrintRows: "لا توجد بيانات في هذا الجدول للطباعة.",
    identity: "بيانات التعريف",
    identityDesc: "اسم العمل، الكود، نوع الطرف، والحالة.",
    contact: "بيانات التواصل",
    contactDesc: "الجوال، البريد، الهاتف، وشخص التواصل.",
    finance: "البيانات المالية",
    financeDesc: "الرصيد، الرصيد الافتتاحي، وحد الائتمان.",
    nationalAddress: "العنوان الوطني",
    nationalAddressDesc: "بيانات العنوان الوطني المعتمدة للمنشأة.",
    quickLinks: "اختصارات الطرف",
    quickLinksDesc: "انتقال سريع للصفحات المرتبطة بهذا الطرف.",
    documents: "الفواتير",
    customerDocuments: "فواتير المبيعات",
    supplierDocuments: "فواتير المشتريات",
    documentsDesc: "آخر المستندات المرتبطة بهذا الطرف.",
    payments: "الدفعات",
    customerPayments: "سندات القبض",
    supplierPayments: "سندات الصرف",
    paymentsDesc: "آخر سندات القبض أو الصرف المرتبطة بالطرف.",
    ledger: "دفتر الأستاذ",
    ledgerDesc: "حركات دفتر الأستاذ الخاصة بهذا الطرف فقط.",
    statement: "كشف الحساب",
    statementDesc: "كشف حركة الطرف المالية حسب البيانات المتاحة من دفتر الأستاذ.",
    noRows: "لا توجد سجلات حالياً.",
    partialWarning: "تم تحميل بعض أقسام الصفحة جزئياً.",
    code: "الكود",
    businessName: "اسم العمل",
    legalName: "الاسم القانوني",
    partyKind: "الصفة",
    individual: "فرد",
    organization: "منشأة",
    status: "الحالة",
    active: "نشط",
    inactive: "غير نشط",
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
    addressLine: "تفاصيل العنوان",
    creditLimit: "حد الائتمان",
    openingBalance: "الرصيد الافتتاحي",
    balance: "الرصيد الحالي",
    notes: "ملاحظات",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    document: "المستند",
    reference: "المرجع",
    date: "التاريخ",
    amount: "المبلغ",
    debit: "مدين",
    credit: "دائن",
    runningBalance: "الرصيد",
    description: "الوصف",
    open: "فتح",
    invoiceCount: "عدد الفواتير",
    paymentCount: "عدد الدفعات",
    rowsCount: "عدد السجلات",
    generatedAt: "تم الإنشاء في",
    notAvailable: "غير متوفر",
    actions: "الإجراءات",
    edit: "تعديل",
    activate: "تفعيل",
    deactivate: "تعطيل",
    confirmActivateTitle: "تأكيد تفعيل الطرف",
    confirmDeactivateTitle: "تأكيد تعطيل الطرف",
    confirmActivateDesc: "سيتم تفعيل هذا الطرف وإتاحته للاستخدام في العمليات الجديدة.",
    confirmDeactivateDesc:
      "سيتم تعطيل هذا الطرف ومنع استخدامه في العمليات الجديدة، مع الاحتفاظ بسجلاته السابقة.",
    confirmActivateAction: "تأكيد التفعيل",
    confirmDeactivateAction: "تأكيد التعطيل",
    activateSuccess: "تم تفعيل الطرف بنجاح.",
    deactivateSuccess: "تم تعطيل الطرف بنجاح.",
    editTitle: "تعديل بيانات الطرف",
    editDesc: "حدّث بيانات الطرف واحفظ التغييرات داخل الشركة.",
    save: "حفظ التغييرات",
    saving: "جاري الحفظ",
    cancel: "إلغاء",
    updateSuccess: "تم تحديث بيانات الطرف بنجاح.",
    actionFailed: "تعذر تنفيذ الإجراء.",
    errorTitle: "تعذر تحميل التفاصيل",
    errorDesc: "تأكد من صلاحية الدخول ومن توفر السجل ثم أعد المحاولة.",
    emptyTitle: "لم يتم العثور على السجل",
    emptyDesc: "لا يوجد عميل أو مورد مطابق لهذا الرابط.",
    tryAgain: "إعادة المحاولة",
  },
  en: {
    badge: "Customers & suppliers module",
    customerTitle: "Customer details",
    supplierTitle: "Supplier details",
    customerSubtitle:
      "Customer operational profile with contact details, balances, invoices, payments, and ledger.",
    supplierSubtitle:
      "Supplier operational profile with contact details, balances, purchase bills, payments, and ledger.",
    backCustomers: "Back to customers",
    backSuppliers: "Back to suppliers",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    refreshed: "Details refreshed.",
    exportReady: "Excel file prepared successfully.",
    printReady: "Print page prepared.",
    printBlocked: "The print window could not be opened. Allow pop-ups and try again.",
    noExportRows: "There is no data in this table to export.",
    noPrintRows: "There is no data in this table to print.",
    identity: "Identity",
    identityDesc: "Business name, code, party type, and status.",
    contact: "Contact details",
    contactDesc: "Mobile, email, phone, and contact person.",
    finance: "Financial details",
    financeDesc: "Balance, opening balance, and credit limit.",
    nationalAddress: "National address",
    nationalAddressDesc: "Official national address details for the organization.",
    quickLinks: "Party shortcuts",
    quickLinksDesc: "Quick navigation to pages related to this party.",
    documents: "Invoices",
    customerDocuments: "Sales invoices",
    supplierDocuments: "Purchase bills",
    documentsDesc: "Latest documents linked to this party.",
    payments: "Payments",
    customerPayments: "Receipt vouchers",
    supplierPayments: "Payment vouchers",
    paymentsDesc: "Latest receipt or payment vouchers linked to the party.",
    ledger: "Ledger",
    ledgerDesc: "Ledger movements for this party only.",
    statement: "Account statement",
    statementDesc: "Party financial statement from available ledger data.",
    noRows: "No records currently.",
    partialWarning: "Some page sections loaded partially.",
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
    addressLine: "Address details",
    creditLimit: "Credit limit",
    openingBalance: "Opening balance",
    balance: "Current balance",
    notes: "Notes",
    createdAt: "Created at",
    updatedAt: "Updated at",
    document: "Document",
    reference: "Reference",
    date: "Date",
    amount: "Amount",
    debit: "Debit",
    credit: "Credit",
    runningBalance: "Balance",
    description: "Description",
    open: "Open",
    invoiceCount: "Invoice count",
    paymentCount: "Payment count",
    rowsCount: "Records",
    generatedAt: "Generated at",
    notAvailable: "Not available",
    actions: "Actions",
    edit: "Edit",
    activate: "Activate",
    deactivate: "Deactivate",
    confirmActivateTitle: "Confirm party activation",
    confirmDeactivateTitle: "Confirm party deactivation",
    confirmActivateDesc: "This party will be activated and available for new transactions.",
    confirmDeactivateDesc:
      "This party will be disabled for new transactions while previous records remain available.",
    confirmActivateAction: "Confirm activation",
    confirmDeactivateAction: "Confirm deactivation",
    activateSuccess: "Party activated successfully.",
    deactivateSuccess: "Party deactivated successfully.",
    editTitle: "Edit party details",
    editDesc: "Update party details and save the changes inside the company.",
    save: "Save changes",
    saving: "Saving",
    cancel: "Cancel",
    updateSuccess: "Party details updated successfully.",
    actionFailed: "Could not complete the action.",
    errorTitle: "Could not load details",
    errorDesc: "Check access and record availability, then try again.",
    emptyTitle: "Record not found",
    emptyDesc: "No matching customer or supplier was found for this link.",
    tryAgain: "Try again",
  },
} as const;

const EMPTY_EDIT_FORM: PartyEditForm = {
  display_name: "",
  legal_name: "",
  contact_person: "",
  phone: "",
  mobile: "",
  whatsapp_number: "",
  email: "",
  vat_number: "",
  commercial_registration: "",
  city: "",
  district: "",
  street: "",
  building_number: "",
  additional_number: "",
  postal_code: "",
  short_address: "",
  address_line: "",
  credit_limit: "0",
  opening_balance: "0",
  notes: "",
};

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
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function getApiBaseUrl() {
  const envBase = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return envBase.endsWith("/api") ? envBase.slice(0, -4) : envBase;
}

function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const escaped = name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1] || "") : "";
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const rawText = await response.text();
  const contentType = response.headers.get("content-type") || "";
  let payload: unknown = {};
  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = {};
    }
  }
  if (!response.ok) {
    const record = asRecord(payload);
    throw new Error(
      normalizeText(record.message) ||
        normalizeText(record.detail) ||
        normalizeText(record.error) ||
        `HTTP ${response.status}`,
    );
  }
  return payload as T;
}

async function submitJson<T>(
  path: string,
  method: "POST" | "PATCH",
  body: ApiRecord,
): Promise<T> {
  const csrfToken = getCookie("csrftoken");
  const response = await fetch(makeApiUrl(path), {
    method,
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: JSON.stringify(body),
  });
  const rawText = await response.text();
  const contentType = response.headers.get("content-type") || "";
  let payload: unknown = {};
  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = {};
    }
  }
  if (!response.ok) {
    const record = asRecord(payload);
    throw new Error(
      normalizeText(record.message) ||
        normalizeText(record.detail) ||
        normalizeText(record.error) ||
        `HTTP ${response.status}`,
    );
  }
  return payload as T;
}

function extractArray(payload: unknown): unknown[] {
  const visited = new Set<unknown>();
  function unwrap(value: unknown, depth = 0): unknown[] {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object" || depth > 7 || visited.has(value)) return [];
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
      record.movements,
      record.entries,
      record.lines,
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

function normalizeStatus(value: unknown): PartyStatus {
  if (typeof value === "boolean") return value ? "active" : "inactive";
  const normalized = normalizeText(value, "active").toUpperCase();
  return ["INACTIVE", "DISABLED", "SUSPENDED", "BLOCKED", "FALSE", "0"].includes(
    normalized,
  )
    ? "inactive"
    : "active";
}

function normalizeParty(payload: unknown, kind: PartyKind): PartyDetailRecord {
  const record = extractObject(payload);
  const address = asRecord(record.address);
  const cityRecord = asRecord(record.city);
  const partyKind = normalizeText(record.party_kind || record.kind || record.type)
    .toUpperCase()
    .includes("ORG")
    ? "ORGANIZATION"
    : "INDIVIDUAL";
  return {
    id: normalizeText(record.id || record.uuid || record.pk),
    kind,
    code: normalizeText(record.code || record.party_code || record.number),
    displayName: normalizeText(
      record.display_name || record.name || record.title || record.legal_name,
    ),
    legalName: normalizeText(
      record.legal_name || record.name_ar || record.name_en || record.display_name,
    ),
    partyKind,
    status: normalizeStatus(record.status ?? record.is_active),
    contactPerson: normalizeText(record.contact_person || record.contact_name),
    phone: normalizeText(record.phone || record.telephone),
    mobile: normalizeText(record.mobile || record.mobile_number || record.phone),
    whatsapp: normalizeText(record.whatsapp_number || record.whatsapp || record.mobile),
    email: normalizeText(record.email || record.email_address),
    taxNumber: normalizeText(
      record.tax_number || record.vat_number || record.trn || record.tax_id,
    ),
    commercialRegistration: normalizeText(
      record.commercial_registration ||
        record.commercialRegistration ||
        record.cr_number,
    ),
    city: normalizeText(
      record.city_name || cityRecord.name || cityRecord.name_ar || address.city || record.city,
    ),
    district: normalizeText(record.district || address.district),
    street: normalizeText(record.street || address.street),
    buildingNumber: normalizeText(record.building_number || address.building_number),
    additionalNumber: normalizeText(record.additional_number || address.additional_number),
    postalCode: normalizeText(record.postal_code || address.postal_code),
    shortAddress: normalizeText(record.short_address || address.short_address),
    addressLine: normalizeText(
      record.address_line || record.address || address.address_line || address.line,
    ),
    creditLimit: toNumber(record.credit_limit ?? record.limit),
    openingBalance: toNumber(record.opening_balance),
    balance: toNumber(
      record.balance ?? record.current_balance ?? record.account_balance ?? record.total_balance,
    ),
    notes: normalizeText(record.notes || record.description),
    createdAt: normalizeText(record.created_at || record.created) || null,
    updatedAt:
      normalizeText(record.updated_at || record.modified_at || record.updated || record.created_at) ||
      null,
  };
}

function normalizeDocumentRow(
  value: unknown,
  hrefBase: string,
  useNumberInHref = false,
): DocumentRow {
  const record = asRecord(value);
  const id = normalizeText(record.id || record.uuid || record.pk);
  const number = normalizeText(
    record.voucher_number ||
      record.invoice_number ||
      record.bill_number ||
      record.document_number ||
      record.number ||
      record.reference ||
      id,
    "—",
  );
  const routeValue = useNumberInHref ? number : id || number;
  return {
    id: id || number,
    number,
    date:
      normalizeText(
        record.date || record.issue_date || record.posting_date || record.created_at,
      ) || null,
    status: normalizeText(record.status || record.state, "—"),
    amount: toNumber(
      record.total_amount ??
        record.amount ??
        record.net_amount ??
        record.paid_amount ??
        record.total,
    ),
    description: normalizeText(
      record.description || record.notes || record.memo || record.party_name,
    ),
    href:
      routeValue && routeValue !== "—"
        ? `${hrefBase}/${encodeURIComponent(routeValue)}`
        : "",
  };
}

function normalizeLedgerRow(value: unknown): LedgerRow {
  const record = asRecord(value);
  const id = normalizeText(record.id || record.uuid || record.pk);
  const reference = normalizeText(
    record.reference ||
      record.reference_number ||
      record.entry_number ||
      record.voucher_number ||
      record.document_number ||
      record.number ||
      id,
    "—",
  );
  const entryNumber = normalizeText(record.entry_number || record.journal_entry_number);
  return {
    id: id || reference,
    reference,
    date:
      normalizeText(
        record.date || record.posting_date || record.entry_date || record.created_at,
      ) || null,
    debit: toNumber(record.debit ?? record.debit_amount),
    credit: toNumber(record.credit ?? record.credit_amount),
    balance: toNumber(
      record.balance ?? record.running_balance ?? record.closing_balance,
    ),
    description: normalizeText(
      record.description || record.memo || record.notes || record.narration,
    ),
    href: entryNumber
      ? `/company/accounting/journal-entries/${encodeURIComponent(entryNumber)}`
      : "",
  };
}

async function fetchFirstCollection<T>(
  urls: string[],
  normalizer: (value: unknown) => T,
  signal?: AbortSignal,
): Promise<CollectionResult<T>> {
  let lastError = "";
  let hadSuccessfulRequest = false;
  for (const url of urls) {
    try {
      const payload = await fetchJson<unknown>(makeApiUrl(url), signal);
      hadSuccessfulRequest = true;
      const rows = extractArray(payload).map(normalizer);
      if (rows.length) return { rows, error: "" };
    } catch (caughtError) {
      if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
        throw caughtError;
      }
      lastError = caughtError instanceof Error ? caughtError.message : String(caughtError);
    }
  }
  return {
    rows: [],
    error: hadSuccessfulRequest ? "" : lastError,
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10) || "—";
  return parsed.toISOString().slice(0, 10);
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(toNumber(value)),
  );
}

function formatReportDateTime() {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function MoneyValue({ value, label }: { value: unknown; label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap font-semibold tabular-nums"
    >
      <span
        dir="ltr"
        lang="en"
      >
        {formatMoney(value)}
      </span>
      <Image
        src="/currency/sar.svg"
        alt={label || "SAR"}
        width={14}
        height={14}
        className="h-3.5 w-3.5 shrink-0"
      />
    </span>
  );
}

function statusLabel(value: PartyStatus, locale: Locale) {
  return translations[locale][value];
}

function statusClass(value: PartyStatus) {
  return value === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
}

function StatusBadge({ value, locale }: { value: PartyStatus; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs", statusClass(value))}
    >
      {statusLabel(value, locale)}
    </Badge>
  );
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="group rounded-lg border bg-card shadow-none transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight">{value}</CardTitle>
        </div>
        <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function DetailField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex min-h-[74px] items-start gap-3 rounded-lg border bg-background p-4">
      <span className="rounded-lg border bg-muted/30 p-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-1 break-words text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function EmptyTableState({ text }: { text: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border bg-background px-6 py-10 text-center">
      <span className="rounded-full bg-muted p-4 text-muted-foreground">
        <FileText className="h-6 w-6" />
      </span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function TableHeaderActions({
  onExport,
  onPrint,
  exportLabel,
  printLabel,
}: {
  onExport: () => void;
  onPrint: () => void;
  exportLabel: string;
  printLabel: string;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onExport}>
        <FileSpreadsheet className="h-4 w-4" />
        {exportLabel}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onPrint}>
        <Printer className="h-4 w-4" />
        {printLabel}
      </Button>
    </div>
  );
}

function DocumentTable({
  title,
  description,
  rows,
  locale,
  onExport,
  onPrint,
}: {
  title: string;
  description: string;
  rows: DocumentRow[];
  locale: Locale;
  onExport: () => void;
  onPrint: () => void;
}) {
  const router = useRouter();
  const t = translations[locale];
  return (
    <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
      <CardHeader className="px-5 pt-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-5 w-5 text-muted-foreground" />
              {title}
              <Badge variant="outline" className="rounded-full tabular-nums">
                {formatInteger(rows.length)}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <TableHeaderActions
            onExport={onExport}
            onPrint={onPrint}
            exportLabel={t.export}
            printLabel={t.print}
          />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6">
        {rows.length ? (
          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[880px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[170px] px-4 text-start text-xs font-semibold">
                      {t.document}
                    </TableHead>
                    <TableHead className="w-[130px] px-4 text-start text-xs font-semibold">
                      {t.date}
                    </TableHead>
                    <TableHead className="w-[130px] px-4 text-start text-xs font-semibold">
                      {t.status}
                    </TableHead>
                    <TableHead className="w-[160px] px-4 text-start text-xs font-semibold">
                      {t.amount}
                    </TableHead>
                    <TableHead className="px-4 text-start text-xs font-semibold">
                      {t.description}
                    </TableHead>
                    <TableHead className="w-[90px] px-4 text-center text-xs font-semibold">
                      {t.open}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={`${row.id}-${row.number}`}
                      className={cn(
                        "h-[62px]",
                        row.href ? "cursor-pointer hover:bg-muted/35" : "",
                      )}
                      onClick={() => {
                        if (row.href) router.push(row.href);
                      }}
                    >
                      <TableCell className="px-4 font-semibold tabular-nums">
                        {row.number}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground tabular-nums">
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {row.status || "—"}
                      </TableCell>
                      <TableCell className="px-4">
                        <MoneyValue value={row.amount} />
                      </TableCell>
                      <TableCell className="truncate px-4 text-muted-foreground">
                        {row.description || "—"}
                      </TableCell>
                      <TableCell className="px-4 text-center">
                        {row.href ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t.open}
                            title={t.open}
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(row.href);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
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
          </div>
        ) : (
          <EmptyTableState text={t.noRows} />
        )}
      </CardContent>
    </Card>
  );
}

function LedgerTable({
  title,
  description,
  rows,
  locale,
  onExport,
  onPrint,
}: {
  title: string;
  description: string;
  rows: LedgerRow[];
  locale: Locale;
  onExport: () => void;
  onPrint: () => void;
}) {
  const router = useRouter();
  const t = translations[locale];
  return (
    <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
      <CardHeader className="px-5 pt-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-muted-foreground" />
              {title}
              <Badge variant="outline" className="rounded-full tabular-nums">
                {formatInteger(rows.length)}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <TableHeaderActions
            onExport={onExport}
            onPrint={onPrint}
            exportLabel={t.export}
            printLabel={t.print}
          />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6">
        {rows.length ? (
          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[170px] px-4 text-start text-xs font-semibold">
                      {t.reference}
                    </TableHead>
                    <TableHead className="w-[130px] px-4 text-start text-xs font-semibold">
                      {t.date}
                    </TableHead>
                    <TableHead className="w-[150px] px-4 text-start text-xs font-semibold">
                      {t.debit}
                    </TableHead>
                    <TableHead className="w-[150px] px-4 text-start text-xs font-semibold">
                      {t.credit}
                    </TableHead>
                    <TableHead className="w-[150px] px-4 text-start text-xs font-semibold">
                      {t.runningBalance}
                    </TableHead>
                    <TableHead className="px-4 text-start text-xs font-semibold">
                      {t.description}
                    </TableHead>
                    <TableHead className="w-[90px] px-4 text-center text-xs font-semibold">
                      {t.open}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={`${row.id}-${row.reference}`}
                      className={cn(
                        "h-[62px]",
                        row.href ? "cursor-pointer hover:bg-muted/35" : "",
                      )}
                      onClick={() => {
                        if (row.href) router.push(row.href);
                      }}
                    >
                      <TableCell className="px-4 font-semibold tabular-nums">
                        {row.reference}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground tabular-nums">
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell className="px-4">
                        <MoneyValue value={row.debit} />
                      </TableCell>
                      <TableCell className="px-4">
                        <MoneyValue value={row.credit} />
                      </TableCell>
                      <TableCell className="px-4">
                        <MoneyValue value={row.balance} />
                      </TableCell>
                      <TableCell className="truncate px-4 text-muted-foreground">
                        {row.description || "—"}
                      </TableCell>
                      <TableCell className="px-4 text-center">
                        {row.href ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t.open}
                            title={t.open}
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(row.href);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
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
          </div>
        ) : (
          <EmptyTableState text={t.noRows} />
        )}
      </CardContent>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-80" />
            <Skeleton className="h-4 w-full max-w-3xl" />
          </CardHeader>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-lg border bg-card shadow-none">
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-32" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
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
  const [documents, setDocuments] = React.useState<DocumentRow[]>([]);
  const [payments, setPayments] = React.useState<DocumentRow[]>([]);
  const [ledgerRows, setLedgerRows] = React.useState<LedgerRow[]>([]);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<DetailTab>("documents");
  const [statusConfirmOpen, setStatusConfirmOpen] = React.useState(false);
  const [statusChanging, setStatusChanging] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editForm, setEditForm] = React.useState<PartyEditForm>(EMPTY_EDIT_FORM);

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
    async ({ silent = false, notify = false }: { silent?: boolean; notify?: boolean } = {}) => {
      if (!id) {
        setParty(null);
        setLoading(false);
        return;
      }
      const controller = new AbortController();
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        setWarnings([]);

        let payload: unknown;
        try {
          payload = await fetchJson<unknown>(
            makeApiUrl(`/api/company/${endpoint}/${encodeURIComponent(id)}/`),
            controller.signal,
          );
        } catch {
          const listPayload = await fetchJson<unknown>(
            makeApiUrl(`/api/company/${endpoint}/?page_size=200`),
            controller.signal,
          );
          const match = extractArray(listPayload).find((item) => {
            const record = asRecord(item);
            return String(record.id || record.uuid || record.pk || "") === String(id);
          });
          payload = match || {};
        }

        const normalized = normalizeParty(payload, kind);
        if (!normalized.id && !normalized.displayName) {
          setParty(null);
          setDocuments([]);
          setPayments([]);
          setLedgerRows([]);
          return;
        }
        setParty(normalized);

        const documentPromise = isCustomer
          ? fetchFirstCollection(
              [
                `/api/company/sales/invoices/?customer_id=${encodeURIComponent(id)}&page_size=50`,
                `/api/company/sales/invoices/?party_id=${encodeURIComponent(id)}&page_size=50`,
              ],
              (item) => normalizeDocumentRow(item, "/company/sales/invoices"),
              controller.signal,
            )
          : fetchFirstCollection(
              [
                `/api/company/purchases/bills/?supplier_id=${encodeURIComponent(id)}&page_size=50`,
                `/api/company/purchases/bills/?party_id=${encodeURIComponent(id)}&page_size=50`,
              ],
              (item) => normalizeDocumentRow(item, "/company/purchases/bills"),
              controller.signal,
            );

        const paymentPromise = isCustomer
          ? fetchFirstCollection(
              [
                `/api/company/treasury/receipt-vouchers/?party_id=${encodeURIComponent(id)}&page_size=50`,
                `/api/company/treasury/customer-payments/?customer_id=${encodeURIComponent(id)}&page_size=50`,
              ],
              (item) =>
                normalizeDocumentRow(
                  item,
                  "/company/treasury/receipt-vouchers",
                  true,
                ),
              controller.signal,
            )
          : fetchFirstCollection(
              [
                `/api/company/treasury/payment-vouchers/?party_id=${encodeURIComponent(id)}&page_size=50`,
                `/api/company/treasury/supplier-payments/?supplier_id=${encodeURIComponent(id)}&page_size=50`,
              ],
              (item) =>
                normalizeDocumentRow(
                  item,
                  "/company/treasury/payment-vouchers",
                  true,
                ),
              controller.signal,
            );

        const ledgerPromise = fetchFirstCollection(
          [
            `/api/company/accounting/ledger/?party_id=${encodeURIComponent(id)}&page_size=50`,
            `/api/company/accounting/ledger/?counterparty_id=${encodeURIComponent(id)}&page_size=50`,
          ],
          normalizeLedgerRow,
          controller.signal,
        );

        const [documentResult, paymentResult, ledgerResult] = await Promise.all([
          documentPromise,
          paymentPromise,
          ledgerPromise,
        ]);

        setDocuments(documentResult.rows);
        setPayments(paymentResult.rows);
        setLedgerRows(ledgerResult.rows);

        const nextWarnings = [
          documentResult.error,
          paymentResult.error,
          ledgerResult.error,
        ].filter(
          (message) =>
            Boolean(message) &&
            !isOptionalMissingEndpointError(message),
        );
        setWarnings(nextWarnings);
        if (nextWarnings.length) toast.warning(t.partialWarning);
        if (notify && !nextWarnings.length) toast.success(t.refreshed);
      } catch (caughtError) {
        if (caughtError instanceof DOMException && caughtError.name === "AbortError") return;
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (notify) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      return () => controller.abort();
    },
    [endpoint, id, isCustomer, kind, t.errorDesc, t.partialWarning, t.refreshed],
  );

  React.useEffect(() => {
    void loadParty();
  }, [loadParty]);

  function fallback(value: string | null | undefined) {
    return normalizeText(value, t.notAvailable);
  }

  function openEditDialog() {
    if (!party) return;
    setEditForm({
      display_name: party.displayName,
      legal_name: party.legalName,
      contact_person: party.contactPerson,
      phone: party.phone,
      mobile: party.mobile,
      whatsapp_number: party.whatsapp,
      email: party.email,
      vat_number: party.taxNumber,
      commercial_registration: party.commercialRegistration,
      city: party.city,
      district: party.district,
      street: party.street,
      building_number: party.buildingNumber,
      additional_number: party.additionalNumber,
      postal_code: party.postalCode,
      short_address: party.shortAddress,
      address_line: party.addressLine,
      credit_limit: String(party.creditLimit || 0),
      opening_balance: String(party.openingBalance || 0),
      notes: party.notes,
    });
    setEditOpen(true);
  }

  function updateEditForm(key: keyof PartyEditForm, value: string) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  async function saveParty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!party) return;
    try {
      setSaving(true);
      await submitJson<ApiRecord>(
        `/api/company/${endpoint}/${encodeURIComponent(party.id)}/`,
        "PATCH",
        {
          ...editForm,
          credit_limit: editForm.credit_limit || "0",
          opening_balance: editForm.opening_balance || "0",
        },
      );
      toast.success(t.updateSuccess);
      setEditOpen(false);
      await loadParty({ silent: true });
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : t.actionFailed);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!party) return;
    const action = party.status === "active" ? "deactivate" : "activate";
    try {
      setStatusChanging(true);
      await submitJson<ApiRecord>(
        `/api/company/${endpoint}/${encodeURIComponent(party.id)}/${action}/`,
        "POST",
        {},
      );
      toast.success(action === "activate" ? t.activateSuccess : t.deactivateSuccess);
      setStatusConfirmOpen(false);
      await loadParty({ silent: true });
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : t.actionFailed);
    } finally {
      setStatusChanging(false);
    }
  }

  function buildDocumentRowsHtml(rows: DocumentRow[]) {
    return rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.number)}</td>
            <td class="text-value">${escapeHtml(formatDate(row.date))}</td>
            <td>${escapeHtml(row.status || "—")}</td>
            <td class="number">${escapeHtml(formatMoney(row.amount))}</td>
            <td>${escapeHtml(row.description || "—")}</td>
          </tr>
        `,
      )
      .join("");
  }

  function buildLedgerRowsHtml(rows: LedgerRow[]) {
    return rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.reference)}</td>
            <td class="text-value">${escapeHtml(formatDate(row.date))}</td>
            <td class="number">${escapeHtml(formatMoney(row.debit))}</td>
            <td class="number">${escapeHtml(formatMoney(row.credit))}</td>
            <td class="number">${escapeHtml(formatMoney(row.balance))}</td>
            <td>${escapeHtml(row.description || "—")}</td>
          </tr>
        `,
      )
      .join("");
  }

  function reportStyles(align: "right" | "left") {
    return `
      body { font-family: Arial, sans-serif; color: #111827; margin: 0; }
      h1 { margin: 0 0 6px; font-size: 22px; }
      h2 { margin: 20px 0 8px; font-size: 16px; }
      .subtitle { margin: 0 0 6px; color: #4b5563; }
      .meta { margin: 0 0 16px; color: #6b7280; font-size: 11px; }
      .summary { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
      .summary td { border: 1px solid #000; padding: 8px; text-align: ${align}; }
      table.data { width: 100%; border-collapse: collapse; table-layout: fixed; }
      table.data th, table.data td { border: 1px solid #000; padding: 7px; text-align: ${align}; vertical-align: top; overflow-wrap: anywhere; }
      table.data th { background: #f3f4f6; font-weight: 700; }
      .number, .text-value { direction: ltr; unicode-bidi: plaintext; font-variant-numeric: tabular-nums; }
      .number { white-space: nowrap; }
      .empty { border: 1px solid #000; padding: 16px; color: #6b7280; }
    `;
  }

  function normalizeExcelTextCells(tableHtml: string) {
    // PRIMEY_EXCEL_TEXT_CELLS_V1
    const container = document.createElement("div");
    container.innerHTML = tableHtml;
    const excelTextStyle = "mso-number-format:'\\@';";
    container
      .querySelectorAll<HTMLElement>(".text-value")
      .forEach((element) => {
        const cell = element.closest("td, th") as HTMLElement | null;
        const target = cell || element;
        const currentStyle = target.getAttribute("style") || "";
        if (!currentStyle.includes("mso-number-format")) {
          const trimmedStyle = currentStyle.trim();
          const separator =
            trimmedStyle && !trimmedStyle.endsWith(";")
              ? ";"
              : "";
          target.setAttribute(
            "style",
            `${currentStyle}${separator}${excelTextStyle}`,
          );
        }
        target.classList.add("excel-text");
      });
    return container.innerHTML;
  }
  function downloadExcel(titleText: string, tableHtml: string, filename: string) {
    const align = locale === "ar" ? "right" : "left";
    const excelTableHtml = normalizeExcelTextCells(tableHtml);
    const html = `
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /><style>${reportStyles(align)}</style></head>
        <body>
          <h1>${escapeHtml(titleText)}</h1>
          <p class="subtitle">${escapeHtml(party?.displayName || "")}</p>
          <p class="meta">${escapeHtml(t.generatedAt)}: ${escapeHtml(
            formatReportDateTime(),
          )}</p>
          ${excelTableHtml}
        </body>
      </html>
    `;
    const blob = new Blob(["\uFEFF", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(t.exportReady);
  }

  function openPrintReport(titleText: string, tableHtml: string) {
    const printWindow = window.open("", "_blank", "width=1400,height=900");
    if (!printWindow) {
      toast.error(t.printBlocked);
      return;
    }
    const align = locale === "ar" ? "right" : "left";
    printWindow.opener = null;
    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(titleText)}</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            * { box-sizing: border-box; }
            ${reportStyles(align)}
          </style>
        </head>
        <body>
          <h1>${escapeHtml(titleText)}</h1>
          <p class="subtitle">${escapeHtml(party?.displayName || "")}</p>
          <p class="meta">${escapeHtml(t.generatedAt)}: ${escapeHtml(
            formatReportDateTime(),
          )}</p>
          ${tableHtml}
          <script>
            window.onload = function () { window.focus(); window.print(); };
            window.onafterprint = function () { window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(t.printReady);
  }

  function documentTableHtml(rows: DocumentRow[]) {
    return `
      <table class="data">
        <thead><tr>
          <th>${escapeHtml(t.document)}</th>
          <th>${escapeHtml(t.date)}</th>
          <th>${escapeHtml(t.status)}</th>
          <th>${escapeHtml(t.amount)}</th>
          <th>${escapeHtml(t.description)}</th>
        </tr></thead>
        <tbody>${buildDocumentRowsHtml(rows)}</tbody>
      </table>
    `;
  }

  function ledgerTableHtml(rows: LedgerRow[]) {
    return `
      <table class="data">
        <thead><tr>
          <th>${escapeHtml(t.reference)}</th>
          <th>${escapeHtml(t.date)}</th>
          <th>${escapeHtml(t.debit)}</th>
          <th>${escapeHtml(t.credit)}</th>
          <th>${escapeHtml(t.runningBalance)}</th>
          <th>${escapeHtml(t.description)}</th>
        </tr></thead>
        <tbody>${buildLedgerRowsHtml(rows)}</tbody>
      </table>
    `;
  }

  function exportDocuments(rows: DocumentRow[], titleText: string, suffix: string) {
    if (!rows.length) {
      toast.warning(t.noExportRows);
      return;
    }
    downloadExcel(
      titleText,
      documentTableHtml(rows),
      `primeyacc-${kind}-${id}-${suffix}-${new Date().toISOString().slice(0, 10)}.xls`,
    );
  }

  function printDocuments(rows: DocumentRow[], titleText: string) {
    if (!rows.length) {
      toast.warning(t.noPrintRows);
      return;
    }
    openPrintReport(titleText, documentTableHtml(rows));
  }

  function exportLedger(rows: LedgerRow[], titleText: string, suffix: string) {
    if (!rows.length) {
      toast.warning(t.noExportRows);
      return;
    }
    downloadExcel(
      titleText,
      ledgerTableHtml(rows),
      `primeyacc-${kind}-${id}-${suffix}-${new Date().toISOString().slice(0, 10)}.xls`,
    );
  }

  function printLedger(rows: LedgerRow[], titleText: string) {
    if (!rows.length) {
      toast.warning(t.noPrintRows);
      return;
    }
    openPrintReport(titleText, ledgerTableHtml(rows));
  }

  function fullReportHtml() {
    if (!party) return "";
    // PRIMEY_PARTY_FULL_REPORT_V2
    const partyType =
      party.partyKind === "ORGANIZATION"
        ? t.organization
        : t.individual;
    const emptySection = `
      <div class="empty">
        ${escapeHtml(t.noRows)}
      </div>
    `;
    const totalDebit = ledgerRows.reduce(
      (total, row) => total + row.debit,
      0,
    );
    const totalCredit = ledgerRows.reduce(
      (total, row) => total + row.credit,
      0,
    );
    const finalStatementBalance = ledgerRows.length
      ? ledgerRows[ledgerRows.length - 1].balance
      : party.balance;
    const identitySection = `
      <h2>${escapeHtml(t.identity)}</h2>
      <table class="summary">
        <tr>
          <td>
            <strong>${escapeHtml(t.businessName)}</strong>
            <br />
            ${escapeHtml(party.displayName || "—")}
          </td>
          <td>
            <strong>${escapeHtml(t.legalName)}</strong>
            <br />
            ${escapeHtml(party.legalName || "—")}
          </td>
          <td>
            <strong>${escapeHtml(t.code)}</strong>
            <br />
            <span class="text-value">
              ${escapeHtml(party.code || "—")}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.partyKind)}</strong>
            <br />
            ${escapeHtml(partyType)}
          </td>
        </tr>
        <tr>
          <td>
            <strong>${escapeHtml(t.status)}</strong>
            <br />
            ${escapeHtml(statusLabel(party.status, locale))}
          </td>
          <td>
            <strong>${escapeHtml(t.commercialRegistration)}</strong>
            <br />
            <span class="text-value">
              ${escapeHtml(party.commercialRegistration || "—")}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.taxNumber)}</strong>
            <br />
            <span class="text-value">
              ${escapeHtml(party.taxNumber || "—")}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.createdAt)}</strong>
            <br />
            <span class="text-value">
              ${escapeHtml(formatDate(party.createdAt))}
            </span>
          </td>
        </tr>
        <tr>
          <td colspan="4">
            <strong>${escapeHtml(t.updatedAt)}</strong>
            <br />
            <span class="text-value">
              ${escapeHtml(formatDate(party.updatedAt))}
            </span>
          </td>
        </tr>
      </table>
    `;
    const contactSection = `
      <h2>${escapeHtml(t.contact)}</h2>
      <table class="summary">
        <tr>
          <td>
            <strong>${escapeHtml(t.contactPerson)}</strong>
            <br />
            ${escapeHtml(party.contactPerson || "—")}
          </td>
          <td>
            <strong>${escapeHtml(t.mobile)}</strong>
            <br />
            <span class="text-value">
              ${escapeHtml(party.mobile || "—")}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.phone)}</strong>
            <br />
            <span class="text-value">
              ${escapeHtml(party.phone || "—")}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.whatsapp)}</strong>
            <br />
            <span class="text-value">
              ${escapeHtml(party.whatsapp || "—")}
            </span>
          </td>
        </tr>
        <tr>
          <td colspan="4">
            <strong>${escapeHtml(t.email)}</strong>
            <br />
            <span class="text-value">
              ${escapeHtml(party.email || "—")}
            </span>
          </td>
        </tr>
      </table>
    `;
    const financeSection = `
      <h2>${escapeHtml(t.finance)}</h2>
      <table class="summary">
        <tr>
          <td>
            <strong>${escapeHtml(t.balance)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(party.balance))}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.openingBalance)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(party.openingBalance))}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.creditLimit)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(party.creditLimit))}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.invoiceCount)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatInteger(documents.length))}
            </span>
          </td>
        </tr>
        <tr>
          <td>
            <strong>${escapeHtml(t.paymentCount)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatInteger(payments.length))}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.rowsCount)} — ${escapeHtml(t.ledger)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatInteger(ledgerRows.length))}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.debit)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(totalDebit))}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.credit)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(totalCredit))}
            </span>
          </td>
        </tr>
      </table>
    `;
    const addressSection =
      party.partyKind === "ORGANIZATION"
        ? `
          <h2>${escapeHtml(t.nationalAddress)}</h2>
          <table class="summary">
            <tr>
              <td>
                <strong>${escapeHtml(t.city)}</strong>
                <br />
                ${escapeHtml(party.city || "—")}
              </td>
              <td>
                <strong>${escapeHtml(t.district)}</strong>
                <br />
                ${escapeHtml(party.district || "—")}
              </td>
              <td>
                <strong>${escapeHtml(t.street)}</strong>
                <br />
                ${escapeHtml(party.street || "—")}
              </td>
              <td>
                <strong>${escapeHtml(t.buildingNumber)}</strong>
                <br />
                <span class="text-value">
                  ${escapeHtml(party.buildingNumber || "—")}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>${escapeHtml(t.additionalNumber)}</strong>
                <br />
                <span class="text-value">
                  ${escapeHtml(party.additionalNumber || "—")}
                </span>
              </td>
              <td>
                <strong>${escapeHtml(t.postalCode)}</strong>
                <br />
                <span class="text-value">
                  ${escapeHtml(party.postalCode || "—")}
                </span>
              </td>
              <td>
                <strong>${escapeHtml(t.shortAddress)}</strong>
                <br />
                ${escapeHtml(party.shortAddress || "—")}
              </td>
              <td>
                <strong>${escapeHtml(t.addressLine)}</strong>
                <br />
                ${escapeHtml(party.addressLine || "—")}
              </td>
            </tr>
          </table>
        `
        : "";
    const notesSection = `
      <h2>${escapeHtml(t.notes)}</h2>
      <table class="summary">
        <tr>
          <td>
            ${escapeHtml(party.notes || "—")}
          </td>
        </tr>
      </table>
    `;
    const statementSection = `
      <h2>${escapeHtml(t.statement)}</h2>
      <table class="summary">
        <tr>
          <td>
            <strong>${escapeHtml(t.openingBalance)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(party.openingBalance))}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.debit)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(totalDebit))}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.credit)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(totalCredit))}
            </span>
          </td>
          <td>
            <strong>${escapeHtml(t.runningBalance)}</strong>
            <br />
            <span class="number">
              ${escapeHtml(formatMoney(finalStatementBalance))}
            </span>
          </td>
        </tr>
      </table>
    `;
    const documentTitle = isCustomer
      ? t.customerDocuments
      : t.supplierDocuments;
    const paymentTitle = isCustomer
      ? t.customerPayments
      : t.supplierPayments;
    const documentsSection = `
      <h2>${escapeHtml(documentTitle)}</h2>
      ${
        documents.length
          ? documentTableHtml(documents)
          : emptySection
      }
    `;
    const paymentsSection = `
      <h2>${escapeHtml(paymentTitle)}</h2>
      ${
        payments.length
          ? documentTableHtml(payments)
          : emptySection
      }
    `;
    const ledgerSection = `
      <h2>${escapeHtml(t.ledger)}</h2>
      ${
        ledgerRows.length
          ? ledgerTableHtml(ledgerRows)
          : emptySection
      }
    `;
    return `
      ${identitySection}
      ${contactSection}
      ${financeSection}
      ${addressSection}
      ${notesSection}
      ${statementSection}
      ${documentsSection}
      ${paymentsSection}
      ${ledgerSection}
    `;
  }
  function exportFullReport() {
    if (!party) return;
    const reportTitle = isCustomer
      ? t.customerTitle
      : t.supplierTitle;
    downloadExcel(
      reportTitle,
      fullReportHtml(),
      `primeyacc-${kind}-${id}-full-${new Date()
        .toISOString()
        .slice(0, 10)}.xls`,
    );
  }
  function printFullReport() {
    if (!party) return;
    const reportTitle = isCustomer
      ? t.customerTitle
      : t.supplierTitle;
    openPrintReport(
      reportTitle,
      fullReportHtml(),
    );
  }

  if (loading) return <DetailSkeleton />;

  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-lg border-destructive/30 bg-card shadow-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              {error}
            </p>
            <Button onClick={() => void loadParty({ silent: true, notify: true })}>
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
        <Card className="mx-auto max-w-3xl rounded-lg border bg-card shadow-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-muted p-4 text-muted-foreground">
              <CircleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.emptyTitle}</CardTitle>
            <CardDescription>{t.emptyDesc}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
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
  const currentDocumentTitle = isCustomer ? t.customerDocuments : t.supplierDocuments;
  const currentPaymentTitle = isCustomer ? t.customerPayments : t.supplierPayments;
  const tabs: Array<{ key: DetailTab; label: string; count: number }> = [
    { key: "documents", label: currentDocumentTitle, count: documents.length },
    { key: "payments", label: currentPaymentTitle, count: payments.length },
    { key: "ledger", label: t.ledger, count: ledgerRows.length },
    { key: "statement", label: t.statement, count: ledgerRows.length },
  ];

  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-2 text-start">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {t.badge}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
                    {party.displayName || title}
                  </h1>
                  <StatusBadge value={party.status} locale={locale} />
                </div>
                <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
                  {subtitle}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span dir="ltr" lang="en" className="font-mono tabular-nums">
                    {party.code || "—"}
                  </span>
                  <span>•</span>
                  <span>{isOrganization ? t.organization : t.individual}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button asChild variant="outline">
                  <Link href={listHref}>
                    <BackIcon className="h-4 w-4" />
                    {isCustomer ? t.backCustomers : t.backSuppliers}
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadParty({ silent: true, notify: true })}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {t.refresh}
                </Button>
                <Button type="button" variant="outline" onClick={exportFullReport}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button type="button" variant="outline" onClick={printFullReport}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="icon" aria-label={t.actions}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-44">
                    <DropdownMenuItem
                      onClick={openEditDialog}
                      className="text-amber-700 hover:bg-amber-50 focus:bg-amber-50 focus:text-amber-800"
                    >
                      <Pencil className="h-4 w-4" />
                      {t.edit}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setStatusConfirmOpen(true)}
                      className={cn(
                        party.status === "active"
                          ? "text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700"
                          : "text-emerald-600 hover:bg-emerald-50 focus:bg-emerald-50 focus:text-emerald-700",
                      )}
                    >
                      {party.status === "active" ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                      {party.status === "active" ? t.deactivate : t.activate}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </Card>

        {warnings.length ? (
          <Card className="rounded-lg border-amber-200 bg-amber-50 text-amber-900 shadow-none">
            <CardContent className="flex items-start gap-3 p-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.partialWarning}</p>
                <p className="mt-1 text-xs leading-6">{warnings.join(" · ")}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t.balance}
            value={<MoneyValue value={party.balance} />}
            description={t.financeDesc}
            icon={Landmark}
          />
          <KpiCard
            title={t.invoiceCount}
            value={<span className="tabular-nums">{formatInteger(documents.length)}</span>}
            description={t.documentsDesc}
            icon={FileText}
          />
          <KpiCard
            title={t.paymentCount}
            value={<span className="tabular-nums">{formatInteger(payments.length)}</span>}
            description={t.paymentsDesc}
            icon={WalletCards}
          />
          <KpiCard
            title={t.creditLimit}
            value={<MoneyValue value={party.creditLimit} />}
            description={t.financeDesc}
            icon={CircleDollarSign}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-5">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-5 pt-5 sm:px-6">
                <CardTitle className="text-base">{t.identity}</CardTitle>
                <CardDescription>{t.identityDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 px-5 pb-5 sm:px-6 md:grid-cols-2">
                <DetailField label={t.businessName} value={fallback(party.displayName)} icon={Store} />
                <DetailField
                  label={t.code}
                  value={
                    <span dir="ltr" lang="en" className="font-mono tabular-nums">
                      {fallback(party.code)}
                    </span>
                  }
                  icon={Hash}
                />
                <DetailField label={t.legalName} value={fallback(party.legalName)} icon={Building2} />
                <DetailField
                  label={t.partyKind}
                  value={isOrganization ? t.organization : t.individual}
                  icon={Users}
                />
                <DetailField
                  label={t.status}
                  value={<StatusBadge value={party.status} locale={locale} />}
                  icon={ShieldCheck}
                />
                <DetailField label={t.updatedAt} value={formatDate(party.updatedAt)} icon={CalendarDays} />
                {isOrganization ? (
                  <>
                    <DetailField label={t.taxNumber} value={fallback(party.taxNumber)} icon={BadgeCheck} />
                    <DetailField
                      label={t.commercialRegistration}
                      value={fallback(party.commercialRegistration)}
                      icon={Hash}
                    />
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-5 pt-5 sm:px-6">
                <CardTitle className="text-base">{t.contact}</CardTitle>
                <CardDescription>{t.contactDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 px-5 pb-5 sm:px-6 md:grid-cols-2">
                <DetailField label={t.contactPerson} value={fallback(party.contactPerson)} icon={UserRound} />
                <DetailField label={t.mobile} value={fallback(party.mobile)} icon={Phone} />
                <DetailField label={t.phone} value={fallback(party.phone)} icon={Phone} />
                <DetailField label={t.whatsapp} value={fallback(party.whatsapp)} icon={Phone} />
                <DetailField label={t.email} value={fallback(party.email)} icon={Mail} />
              </CardContent>
            </Card>

            <Card className="rounded-lg border bg-card shadow-none">
              <CardHeader className="px-5 pt-5 sm:px-6">
                <CardTitle className="text-base">{t.finance}</CardTitle>
                <CardDescription>{t.financeDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 px-5 pb-5 sm:px-6 md:grid-cols-3">
                <DetailField label={t.balance} value={<MoneyValue value={party.balance} />} icon={Landmark} />
                <DetailField
                  label={t.openingBalance}
                  value={<MoneyValue value={party.openingBalance} />}
                  icon={ReceiptText}
                />
                <DetailField
                  label={t.creditLimit}
                  value={<MoneyValue value={party.creditLimit} />}
                  icon={CircleDollarSign}
                />
              </CardContent>
            </Card>

            {isOrganization ? (
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 pt-5 sm:px-6">
                  <CardTitle className="text-base">{t.nationalAddress}</CardTitle>
                  <CardDescription>{t.nationalAddressDesc}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 px-5 pb-5 sm:px-6 md:grid-cols-2">
                  <DetailField label={t.city} value={fallback(party.city)} icon={MapPin} />
                  <DetailField label={t.district} value={fallback(party.district)} icon={MapPin} />
                  <DetailField label={t.street} value={fallback(party.street)} icon={MapPin} />
                  <DetailField
                    label={t.buildingNumber}
                    value={fallback(party.buildingNumber)}
                    icon={Hash}
                  />
                  <DetailField
                    label={t.additionalNumber}
                    value={fallback(party.additionalNumber)}
                    icon={Hash}
                  />
                  <DetailField label={t.postalCode} value={fallback(party.postalCode)} icon={Hash} />
                  <DetailField label={t.shortAddress} value={fallback(party.shortAddress)} icon={MapPin} />
                  <DetailField label={t.addressLine} value={fallback(party.addressLine)} icon={MapPin} />
                </CardContent>
              </Card>
            ) : null}
          </div>

          <aside className="space-y-5">
            <Card className="rounded-lg border bg-card shadow-none xl:sticky xl:top-6">
              <CardHeader className="px-5 pt-5">
                <CardTitle className="text-base">{t.quickLinks}</CardTitle>
                <CardDescription>{t.quickLinksDesc}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 px-5 pb-5">
                <Button asChild variant="outline" className="justify-start bg-background">
                  <Link href={isCustomer ? "/company/sales/invoices" : "/company/purchases/bills"}>
                    <FileText className="h-4 w-4" />
                    {currentDocumentTitle}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start bg-background">
                  <Link
                    href={
                      isCustomer
                        ? "/company/treasury/receipt-vouchers"
                        : "/company/treasury/payment-vouchers"
                    }
                  >
                    <CreditCard className="h-4 w-4" />
                    {currentPaymentTitle}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start bg-background">
                  <Link href={`/company/accounting/ledger?party_id=${encodeURIComponent(party.id)}`}>
                    <Activity className="h-4 w-4" />
                    {t.ledger}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start bg-background">
                  <Link href={listHref}>
                    <Users className="h-4 w-4" />
                    {isCustomer ? t.backCustomers : t.backSuppliers}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <CardTitle className="text-base">{t.rowsCount}</CardTitle>
            <CardDescription>
              {isCustomer ? t.customerSubtitle : t.supplierSubtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 sm:px-6">
            <div role="tablist" aria-label={t.rowsCount} className="flex flex-wrap gap-2 border-b pb-3">
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  variant={activeTab === tab.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  <Badge
                    variant="outline"
                    className={cn(
                      "ms-1 rounded-full tabular-nums",
                      activeTab === tab.key ? "border-white/30 text-white" : "",
                    )}
                  >
                    {formatInteger(tab.count)}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {activeTab === "documents" ? (
          <DocumentTable
            title={currentDocumentTitle}
            description={t.documentsDesc}
            rows={documents}
            locale={locale}
            onExport={() => exportDocuments(documents, currentDocumentTitle, "documents")}
            onPrint={() => printDocuments(documents, currentDocumentTitle)}
          />
        ) : null}
        {activeTab === "payments" ? (
          <DocumentTable
            title={currentPaymentTitle}
            description={t.paymentsDesc}
            rows={payments}
            locale={locale}
            onExport={() => exportDocuments(payments, currentPaymentTitle, "payments")}
            onPrint={() => printDocuments(payments, currentPaymentTitle)}
          />
        ) : null}
        {activeTab === "ledger" ? (
          <LedgerTable
            title={t.ledger}
            description={t.ledgerDesc}
            rows={ledgerRows}
            locale={locale}
            onExport={() => exportLedger(ledgerRows, t.ledger, "ledger")}
            onPrint={() => printLedger(ledgerRows, t.ledger)}
          />
        ) : null}
        {activeTab === "statement" ? (
          <LedgerTable
            title={t.statement}
            description={t.statementDesc}
            rows={ledgerRows}
            locale={locale}
            onExport={() => exportLedger(ledgerRows, t.statement, "statement")}
            onPrint={() => printLedger(ledgerRows, t.statement)}
          />
        ) : null}

        <AlertDialog open={statusConfirmOpen} onOpenChange={(open) => !statusChanging && setStatusConfirmOpen(open)}>
          <AlertDialogContent dir={dir} className="sm:max-w-[480px]">
            <AlertDialogHeader className="text-start">
              <div
                className={cn(
                  "mb-2 flex h-11 w-11 items-center justify-center rounded-full",
                  party.status === "active"
                    ? "bg-red-50 text-red-600"
                    : "bg-emerald-50 text-emerald-600",
                )}
              >
                {party.status === "active" ? (
                  <PowerOff className="h-5 w-5" />
                ) : (
                  <Power className="h-5 w-5" />
                )}
              </div>
              <AlertDialogTitle>
                {party.status === "active" ? t.confirmDeactivateTitle : t.confirmActivateTitle}
              </AlertDialogTitle>
              <AlertDialogDescription className="leading-6">
                {party.status === "active" ? t.confirmDeactivateDesc : t.confirmActivateDesc}
                <span className="mt-3 block rounded-md border bg-muted/30 px-3 py-2 text-foreground">
                  <span className="font-semibold">{party.displayName}</span>
                  {party.code ? (
                    <span dir="ltr" lang="en" className="ms-2 font-mono text-xs text-muted-foreground">
                      {party.code}
                    </span>
                  ) : null}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel disabled={statusChanging}>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                disabled={statusChanging}
                onClick={(event) => {
                  event.preventDefault();
                  void toggleStatus();
                }}
                className={cn(
                  party.status === "active"
                    ? "!bg-red-600 !text-white hover:!bg-red-700 focus-visible:!ring-red-600"
                    : "!bg-emerald-600 !text-white hover:!bg-emerald-700 focus-visible:!ring-emerald-600",
                )}
              >
                {statusChanging ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : party.status === "active" ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {party.status === "active" ? t.confirmDeactivateAction : t.confirmActivateAction}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={editOpen} onOpenChange={(open) => !saving && setEditOpen(open)}>
          <DialogContent dir={dir} className="overflow-hidden rounded-lg p-0 sm:max-w-[720px]">
            <DialogHeader className="border-b px-5 py-4 text-start sm:px-6">
              <DialogTitle>{t.editTitle}</DialogTitle>
              <DialogDescription>{t.editDesc}</DialogDescription>
            </DialogHeader>
            <form id="party-detail-edit-form" onSubmit={saveParty} className="max-h-[68vh] overflow-y-auto px-5 py-4 sm:px-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium">
                  <span>{t.businessName}</span>
                  <Input
                    value={editForm.display_name}
                    onChange={(event) => updateEditForm("display_name", event.target.value)}
                    required
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>{t.legalName}</span>
                  <Input
                    value={editForm.legal_name}
                    onChange={(event) => updateEditForm("legal_name", event.target.value)}
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>{t.contactPerson}</span>
                  <Input
                    value={editForm.contact_person}
                    onChange={(event) => updateEditForm("contact_person", event.target.value)}
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>{t.mobile}</span>
                  <Input
                    value={editForm.mobile}
                    onChange={(event) => updateEditForm("mobile", event.target.value)}
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>{t.phone}</span>
                  <Input
                    value={editForm.phone}
                    onChange={(event) => updateEditForm("phone", event.target.value)}
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>{t.whatsapp}</span>
                  <Input
                    value={editForm.whatsapp_number}
                    onChange={(event) => updateEditForm("whatsapp_number", event.target.value)}
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium md:col-span-2">
                  <span>{t.email}</span>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(event) => updateEditForm("email", event.target.value)}
                  />
                </label>
                {isOrganization ? (
                  <>
                    <label className="space-y-1.5 text-sm font-medium">
                      <span>{t.taxNumber}</span>
                      <Input
                        value={editForm.vat_number}
                        onChange={(event) => updateEditForm("vat_number", event.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      <span>{t.commercialRegistration}</span>
                      <Input
                        value={editForm.commercial_registration}
                        onChange={(event) =>
                          updateEditForm("commercial_registration", event.target.value)
                        }
                      />
                    </label>
                  </>
                ) : null}
                <label className="space-y-1.5 text-sm font-medium">
                  <span>{t.creditLimit}</span>
                  <Input
                    inputMode="decimal"
                    value={editForm.credit_limit}
                    onChange={(event) => updateEditForm("credit_limit", event.target.value)}
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  <span>{t.openingBalance}</span>
                  <Input
                    inputMode="decimal"
                    value={editForm.opening_balance}
                    onChange={(event) => updateEditForm("opening_balance", event.target.value)}
                  />
                </label>
                {isOrganization ? (
                  <>
                    <label className="space-y-1.5 text-sm font-medium">
                      <span>{t.city}</span>
                      <Input value={editForm.city} onChange={(event) => updateEditForm("city", event.target.value)} />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      <span>{t.district}</span>
                      <Input
                        value={editForm.district}
                        onChange={(event) => updateEditForm("district", event.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      <span>{t.street}</span>
                      <Input value={editForm.street} onChange={(event) => updateEditForm("street", event.target.value)} />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      <span>{t.buildingNumber}</span>
                      <Input
                        value={editForm.building_number}
                        onChange={(event) => updateEditForm("building_number", event.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      <span>{t.additionalNumber}</span>
                      <Input
                        value={editForm.additional_number}
                        onChange={(event) => updateEditForm("additional_number", event.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium">
                      <span>{t.postalCode}</span>
                      <Input
                        value={editForm.postal_code}
                        onChange={(event) => updateEditForm("postal_code", event.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium md:col-span-2">
                      <span>{t.shortAddress}</span>
                      <Input
                        value={editForm.short_address}
                        onChange={(event) => updateEditForm("short_address", event.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium md:col-span-2">
                      <span>{t.addressLine}</span>
                      <Input
                        value={editForm.address_line}
                        onChange={(event) => updateEditForm("address_line", event.target.value)}
                      />
                    </label>
                  </>
                ) : null}
                <label className="space-y-1.5 text-sm font-medium md:col-span-2">
                  <span>{t.notes}</span>
                  <Input
                    value={editForm.notes}
                    onChange={(event) => updateEditForm("notes", event.target.value)}
                  />
                </label>
              </div>
            </form>
            <DialogFooter className="gap-2 border-t px-5 py-4 sm:justify-start sm:px-6">
              <Button type="submit" form="party-detail-edit-form" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? t.saving : t.save}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                {t.cancel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
