"use client";

/* ============================================================
   📂 primey_frontend/app/system/customers/page.tsx
   🧭 Primey Care — Customers Directory
   ------------------------------------------------------------
   ✅ Same visual spirit as approved Products catalog page
   ✅ Same locale handling as approved Products page
   ✅ Same cards, buttons, toolbar, filters, and table rhythm
   ✅ Internal UI components only
   ✅ Real API only: /api/customers/
   ✅ No localhost
   ✅ No fake data
   ✅ RTL/LTR + Arabic/English
   ✅ English numerals always
   ✅ Excel .xls + Web print
   ============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  CheckCircle2,
  ColumnsIcon,
  Copy,
  Download,
  Eye,
  FilterIcon,
  Loader2,
  MoreHorizontal,
  Plus,
  PlusCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  TriangleAlert,
  Users,
  X,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

type CustomerRecord = {
  id: number | string;
  customer_code?: string;
  customer_type?: string;
  status?: string;
  source?: string;

  user_id?: number | string | null;
  user_username?: string;
  has_customer_account?: boolean;
  normalized_phone?: string;
  login_identifier?: string;
  is_phone_verified?: boolean;
  is_whatsapp_verified?: boolean;
  phone_verified_at?: string | null;
  whatsapp_verified_at?: string | null;
  last_login_at?: string | null;

  first_name?: string;
  last_name?: string;
  company_name?: string;
  display_name?: string;
  full_name?: string;
  gender?: string;
  date_of_birth?: string | null;
  national_id?: string;
  passport_number?: string;
  nationality?: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  alternative_phone_number?: string;
  primary_contact_number?: string;
  country?: string;
  city?: string;
  district?: string;
  street_address?: string;
  postal_code?: string;
  national_address_text?: string;
  notes?: string;
  tags?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type CustomersSummary = {
  total?: number;
  active?: number;
  inactive?: number;
  blocked?: number;
  lead?: number;
  individual?: number;
  corporate?: number;
  with_account?: number;
  without_account?: number;
  phone_verified?: number;
  whatsapp_verified?: number;
  unverified?: number;
};

type CustomersApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  count?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
  summary?: CustomersSummary;
  results?: CustomerRecord[];
  customers?: CustomerRecord[];
  items?: CustomerRecord[];
  data?:
    | CustomerRecord[]
    | {
        results?: CustomerRecord[];
        customers?: CustomerRecord[];
        items?: CustomerRecord[];
        data?: CustomerRecord[];
      };
};

type CustomerStatusFilter = "all" | "active" | "inactive" | "blocked" | "lead";
type CustomerTypeFilter = "all" | "individual" | "corporate";
type CustomerSourceFilter =
  | "all"
  | "website"
  | "whatsapp"
  | "agent"
  | "admin"
  | "import"
  | "other";
type AccountFilter = "all" | "linked" | "missing";
type VerificationFilter = "all" | "phone" | "whatsapp" | "unverified";
type SortFilter = "newest" | "oldest" | "name" | "last_login" | "code" | "city";

type SortKey =
  | "customer"
  | "contact"
  | "city"
  | "type"
  | "source"
  | "account"
  | "verification"
  | "status"
  | "created_at";

type SortDirection = "asc" | "desc";

type FiltersState = {
  search: string;
  status: CustomerStatusFilter;
  type: CustomerTypeFilter;
  source: CustomerSourceFilter;
  account: AccountFilter;
  verification: VerificationFilter;
  city: string;
  dateFrom: string;
  dateTo: string;
  sort: SortFilter;
};

type ColumnKey =
  | "select"
  | "customer"
  | "contact"
  | "city"
  | "type"
  | "source"
  | "account"
  | "verification"
  | "status"
  | "createdAt"
  | "actions";

type ColumnConfig = {
  key: ColumnKey;
  label: string;
  canHide?: boolean;
};

type FilterOption = {
  value: string;
  label: string;
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
const NO_CITY_VALUE = "__no_city__";

const translations = {
  ar: {
    title: "دليل العملاء",
    subtitle:
      "إدارة عملاء برايمي كير وحسابات الدخول والتحقق وبيانات التواصل من مكان واحد.",
    addCustomer: "إضافة عميل",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    retry: "إعادة المحاولة",
    reset: "إعادة ضبط",
    columns: "الأعمدة",
    actions: "الإجراءات",
    sort: "الترتيب",
    mobileFilters: "الفلاتر",

    totalCustomers: "إجمالي العملاء",
    activeCustomers: "العملاء النشطون",
    customersWithAccounts: "لديهم حساب دخول",
    whatsappVerified: "موثق واتساب",

    searchPlaceholder: "بحث في العملاء...",

    all: "الكل",
    active: "نشط",
    inactive: "غير نشط",
    blocked: "موقوف",
    lead: "مهتم",

    individual: "فرد",
    corporate: "شركة",

    website: "الموقع",
    whatsapp: "واتساب",
    agent: "مندوب",
    admin: "النظام",
    import: "استيراد",
    other: "أخرى",

    linked: "مرتبط",
    missing: "بدون حساب",

    phone: "الجوال",
    unverified: "غير موثق",

    newest: "الأحدث",
    oldest: "الأقدم",
    name: "الاسم",
    lastLogin: "آخر دخول",
    code: "الكود",
    citySort: "المدينة",

    customer: "العميل",
    contact: "التواصل",
    city: "المدينة",
    type: "النوع",
    source: "المصدر",
    account: "الحساب",
    verification: "التحقق",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",

    chooseStatus: "الحالة",
    chooseType: "النوع",
    chooseSource: "المصدر",
    chooseAccount: "الحساب",
    chooseVerification: "التحقق",
    chooseCity: "المدينة",

    noCity: "بدون مدينة",
    noCode: "بدون كود",
    noOptions: "لا توجد خيارات",
    noCustomers: "لا توجد عملاء",
    noCustomersDesc: "لم يتم العثور على عملاء حسب الفلاتر الحالية.",
    errorTitle: "تعذر تحميل العملاء",

    view: "عرض التفاصيل",
    copyCode: "نسخ كود العميل",
    copyPhone: "نسخ الجوال",
    copied: "تم النسخ",

    loaded: "تم تحديث بيانات العملاء",
    exportDone: "تم تجهيز ملف Excel",
    printReady: "تم تجهيز صفحة الطباعة",

    selected: "محدد",
    selectedRows: "صفوف محددة",
    of: "من",
    previous: "السابق",
    next: "التالي",
    page: "صفحة",
    rowsPerPage: "عدد الصفوف",
    id: "الرقم",
  },
  en: {
    title: "Customers",
    subtitle:
      "Manage Primey Care customers, portal accounts, verification, and contact information.",
    addCustomer: "Add Customer",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    retry: "Retry",
    reset: "Reset",
    columns: "Columns",
    actions: "Actions",
    sort: "Sort",
    mobileFilters: "Filters",

    totalCustomers: "Total Customers",
    activeCustomers: "Active Customers",
    customersWithAccounts: "With Portal Accounts",
    whatsappVerified: "WhatsApp Verified",

    searchPlaceholder: "Search customers...",

    all: "All",
    active: "Active",
    inactive: "Inactive",
    blocked: "Blocked",
    lead: "Lead",

    individual: "Individual",
    corporate: "Corporate",

    website: "Website",
    whatsapp: "WhatsApp",
    agent: "Agent",
    admin: "System",
    import: "Import",
    other: "Other",

    linked: "Linked",
    missing: "No account",

    phone: "Phone",
    unverified: "Unverified",

    newest: "Newest",
    oldest: "Oldest",
    name: "Name",
    lastLogin: "Last login",
    code: "Code",
    citySort: "City",

    customer: "Customer",
    contact: "Contact",
    city: "City",
    type: "Type",
    source: "Source",
    account: "Account",
    verification: "Verification",
    status: "Status",
    createdAt: "Created at",

    chooseStatus: "Status",
    chooseType: "Type",
    chooseSource: "Source",
    chooseAccount: "Account",
    chooseVerification: "Verification",
    chooseCity: "City",

    noCity: "No city",
    noCode: "No code",
    noOptions: "No options",
    noCustomers: "No customers",
    noCustomersDesc: "No customers were found for the current filters.",
    errorTitle: "Unable to load customers",

    view: "View details",
    copyCode: "Copy customer code",
    copyPhone: "Copy phone",
    copied: "Copied",

    loaded: "Customers refreshed",
    exportDone: "Excel file prepared",
    printReady: "Print page prepared",

    selected: "Selected",
    selectedRows: "selected rows",
    of: "of",
    previous: "Previous",
    next: "Next",
    page: "Page",
    rowsPerPage: "Rows",
    id: "ID",
  },
} as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function toEnglishDigits(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function toNumber(value: string | number | null | undefined) {
  const cleaned = toEnglishDigits(value ?? 0).replace(/[^\d.-]/g, "");
  const numeric = Number(cleaned);

  return Number.isFinite(numeric) ? numeric : 0;
}

function formatNumber(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatDateEnglish(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
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

function extractCustomers(payload: CustomersApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.customers)) return payload.customers;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;

  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.customers)) return payload.data.customers;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.data)) return payload.data.data;
  }

  return [];
}

function getCustomerName(customer: CustomerRecord) {
  const joinedName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    customer.display_name ||
    customer.full_name ||
    joinedName ||
    customer.company_name ||
    customer.customer_code ||
    `#${customer.id}`
  );
}

function getCustomerCode(customer: CustomerRecord) {
  return customer.customer_code || `CUST-${customer.id}`;
}

function getContactNumber(customer: CustomerRecord) {
  return (
    customer.primary_contact_number ||
    customer.whatsapp_number ||
    customer.phone_number ||
    customer.normalized_phone ||
    ""
  );
}

function getCustomerStatus(customer: CustomerRecord): CustomerStatusFilter {
  const status = normalizeText(customer.status);

  if (["active", "inactive", "blocked", "lead"].includes(status)) {
    return status as CustomerStatusFilter;
  }

  return "active";
}

function getCustomerType(customer: CustomerRecord): CustomerTypeFilter {
  const type = normalizeText(customer.customer_type);

  if (type === "corporate") return "corporate";
  if (type === "individual") return "individual";

  return "individual";
}

function getCustomerSource(customer: CustomerRecord): Exclude<CustomerSourceFilter, "all"> {
  const source = normalizeText(customer.source);

  if (["website", "whatsapp", "agent", "admin", "import", "other"].includes(source)) {
    return source as Exclude<CustomerSourceFilter, "all">;
  }

  return "other";
}

function hasCustomerAccount(customer: CustomerRecord) {
  return Boolean(customer.has_customer_account || customer.user_id);
}

function isVerified(customer: CustomerRecord) {
  return Boolean(customer.is_phone_verified || customer.is_whatsapp_verified);
}

function getVerificationCount(customer: CustomerRecord) {
  let count = 0;

  if (customer.is_phone_verified) count += 1;
  if (customer.is_whatsapp_verified) count += 1;

  return count;
}

function getStatusLabel(status: string | undefined, t: (typeof translations)[Locale]) {
  const value = normalizeText(status);

  if (value === "active") return t.active;
  if (value === "inactive") return t.inactive;
  if (value === "blocked") return t.blocked;
  if (value === "lead") return t.lead;

  return t.active;
}

function getTypeLabel(type: string | undefined, t: (typeof translations)[Locale]) {
  const value = normalizeText(type);

  if (value === "corporate") return t.corporate;

  return t.individual;
}

function getSourceLabel(source: string | undefined, t: (typeof translations)[Locale]) {
  const value = normalizeText(source);

  if (value === "website") return t.website;
  if (value === "whatsapp") return t.whatsapp;
  if (value === "agent") return t.agent;
  if (value === "admin") return t.admin;
  if (value === "import") return t.import;
  if (value === "other") return t.other;

  return t.other;
}

function getStatusBadgeClass(status: string | undefined) {
  const value = normalizeText(status);

  if (value === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value === "inactive") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  if (value === "blocked") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (value === "lead") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getCustomerAvatarText(customer: CustomerRecord) {
  const name = getCustomerName(customer).trim();

  if (!name) return "عم";

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0].slice(0, 1)}${words[1].slice(0, 1)}`.toUpperCase();
}

function getCreatedTimestamp(customer: CustomerRecord) {
  const date = customer.created_at ? new Date(customer.created_at) : null;

  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function getLastLoginTimestamp(customer: CustomerRecord) {
  const date = customer.last_login_at ? new Date(customer.last_login_at) : null;

  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function getSearchBlob(customer: CustomerRecord) {
  return [
    customer.id,
    customer.customer_code,
    customer.display_name,
    customer.full_name,
    customer.first_name,
    customer.last_name,
    customer.company_name,
    customer.email,
    customer.phone_number,
    customer.whatsapp_number,
    customer.primary_contact_number,
    customer.normalized_phone,
    customer.national_id,
    customer.passport_number,
    customer.city,
    customer.district,
    customer.country,
    customer.tags,
    customer.user_username,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function customerMatchesFilters(customer: CustomerRecord, filters: FiltersState) {
  const search = normalizeText(filters.search);

  if (search && !getSearchBlob(customer).includes(search)) return false;

  if (filters.status !== "all" && getCustomerStatus(customer) !== filters.status) {
    return false;
  }

  if (filters.type !== "all" && getCustomerType(customer) !== filters.type) {
    return false;
  }

  if (filters.source !== "all" && getCustomerSource(customer) !== filters.source) {
    return false;
  }

  if (filters.account === "linked" && !hasCustomerAccount(customer)) {
    return false;
  }

  if (filters.account === "missing" && hasCustomerAccount(customer)) {
    return false;
  }

  if (filters.verification === "phone" && !customer.is_phone_verified) {
    return false;
  }

  if (filters.verification === "whatsapp" && !customer.is_whatsapp_verified) {
    return false;
  }

  if (filters.verification === "unverified" && isVerified(customer)) {
    return false;
  }

  if (filters.city !== "all" && filters.city) {
    const city = customer.city ? normalizeText(customer.city) : NO_CITY_VALUE;
    if (city !== filters.city) return false;
  }

  const createdDate = customer.created_at ? new Date(customer.created_at) : null;
  const fromDate = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
  const toDate = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;

  if (fromDate && !Number.isNaN(fromDate.getTime())) {
    if (!createdDate || Number.isNaN(createdDate.getTime()) || createdDate < fromDate) {
      return false;
    }
  }

  if (toDate && !Number.isNaN(toDate.getTime())) {
    if (!createdDate || Number.isNaN(createdDate.getTime()) || createdDate > toDate) {
      return false;
    }
  }

  return true;
}

function compareValues(a: unknown, b: unknown, direction: SortDirection) {
  const modifier = direction === "asc" ? 1 : -1;

  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * modifier;
  }

  return String(a ?? "").localeCompare(String(b ?? ""), "ar") * modifier;
}

function getSortValue(customer: CustomerRecord, key: SortKey) {
  if (key === "customer") return getCustomerName(customer);
  if (key === "contact") return getContactNumber(customer);
  if (key === "city") return customer.city || "";
  if (key === "type") return getCustomerType(customer);
  if (key === "source") return getCustomerSource(customer);
  if (key === "account") return hasCustomerAccount(customer) ? 1 : 0;
  if (key === "verification") return getVerificationCount(customer);
  if (key === "status") return getCustomerStatus(customer);

  return getCreatedTimestamp(customer);
}

function applySortPreset(customers: CustomerRecord[], sort: SortFilter) {
  const sorted = [...customers];

  if (sort === "oldest") {
    return sorted.sort((a, b) => getCreatedTimestamp(a) - getCreatedTimestamp(b));
  }

  if (sort === "name") {
    return sorted.sort((a, b) =>
      getCustomerName(a).localeCompare(getCustomerName(b), "ar"),
    );
  }

  if (sort === "last_login") {
    return sorted.sort((a, b) => getLastLoginTimestamp(b) - getLastLoginTimestamp(a));
  }

  if (sort === "code") {
    return sorted.sort((a, b) => getCustomerCode(a).localeCompare(getCustomerCode(b), "ar"));
  }

  if (sort === "city") {
    return sorted.sort((a, b) =>
      String(a.city || "").localeCompare(String(b.city || ""), "ar"),
    );
  }

  return sorted.sort((a, b) => getCreatedTimestamp(b) - getCreatedTimestamp(a));
}

function exportCustomersToExcel(
  customers: CustomerRecord[],
  t: (typeof translations)[Locale],
  locale: Locale,
) {
  const headers = [
    t.id,
    t.customer,
    t.contact,
    "Email",
    t.city,
    t.type,
    t.source,
    t.account,
    t.verification,
    t.status,
    t.createdAt,
  ];

  const rows = customers.map((customer) => [
    getCustomerCode(customer),
    getCustomerName(customer),
    toEnglishDigits(getContactNumber(customer)),
    customer.email || "",
    customer.city || "",
    getTypeLabel(customer.customer_type, t),
    getSourceLabel(customer.source, t),
    hasCustomerAccount(customer) ? t.linked : t.missing,
    isVerified(customer) ? t.whatsappVerified : t.unverified,
    getStatusLabel(customer.status, t),
    formatDateEnglish(customer.created_at),
  ]);

  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";

  const tableHtml = `
    <html dir="${dir}">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; direction: ${dir}; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #d9d9d9; padding: 8px; text-align: ${align}; }
          th { background: #f5f3ff; font-weight: 700; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) =>
                  `<tr>${row
                    .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                    .join("")}</tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", tableHtml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `primey-customers-${new Date().toISOString().slice(0, 10)}.xls`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function printCustomers(
  customers: CustomerRecord[],
  t: (typeof translations)[Locale],
  locale: Locale,
) {
  const printWindow = window.open("", "_blank", "width=1200,height=800");

  if (!printWindow) return;

  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";

  const rows = customers
    .map(
      (customer) => `
        <tr>
          <td>
            <strong>${escapeHtml(getCustomerName(customer))}</strong>
            <div class="muted">${escapeHtml(getCustomerCode(customer))}</div>
          </td>
          <td>
            ${escapeHtml(toEnglishDigits(getContactNumber(customer)) || "—")}
            <div class="muted">${escapeHtml(customer.email || "—")}</div>
          </td>
          <td>${escapeHtml(customer.city || "—")}</td>
          <td>${escapeHtml(getTypeLabel(customer.customer_type, t))}</td>
          <td>${escapeHtml(getSourceLabel(customer.source, t))}</td>
          <td>${escapeHtml(hasCustomerAccount(customer) ? t.linked : t.missing)}</td>
          <td>${escapeHtml(isVerified(customer) ? t.whatsappVerified : t.unverified)}</td>
          <td>${escapeHtml(getStatusLabel(customer.status, t))}</td>
          <td>${escapeHtml(formatDateEnglish(customer.created_at))}</td>
        </tr>
      `,
    )
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html dir="${dir}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(t.title)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #111827;
            direction: ${dir};
          }
          h1 {
            margin: 0 0 8px;
            font-size: 24px;
          }
          p {
            margin: 0 0 20px;
            color: #6b7280;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 10px;
            text-align: ${align};
            vertical-align: top;
          }
          th {
            background: #f5f3ff;
          }
          .muted {
            color: #6b7280;
            font-size: 11px;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(t.title)}</h1>
        <p>${escapeHtml(new Date().toLocaleString("en-US"))}</p>
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(t.customer)}</th>
              <th>${escapeHtml(t.contact)}</th>
              <th>${escapeHtml(t.city)}</th>
              <th>${escapeHtml(t.type)}</th>
              <th>${escapeHtml(t.source)}</th>
              <th>${escapeHtml(t.account)}</th>
              <th>${escapeHtml(t.verification)}</th>
              <th>${escapeHtml(t.status)}</th>
              <th>${escapeHtml(t.createdAt)}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
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
            className="rounded-full border px-2.5 py-1 text-xs font-semibold"
          >
            <span className="text-emerald-600">{trend}</span>
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function HeaderSortButton({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = activeSortKey === sortKey;

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-8 px-2 text-xs font-medium text-foreground hover:bg-muted",
        className,
      )}
      onClick={() => onSort(sortKey)}
    >
      {label}
      <ArrowUpDown
        className={cn(
          "h-3.5 w-3.5",
          isActive && sortDirection === "asc" ? "rotate-180" : "",
        )}
      />
    </Button>
  );
}

function FilterPopover({
  label,
  value,
  options,
  onChange,
  emptyLabel,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  emptyLabel: string;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md border bg-background px-3 text-sm font-medium shadow-none"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{label}</span>
          {selected && selected.value !== "all" ? (
            <Badge
              variant="secondary"
              className="ms-1 rounded-full px-2 py-0 text-[11px]"
            >
              {selected.label}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={label} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.value} ${option.label}`}
                  onSelect={() => onChange(option.value)}
                >
                  <span>{option.label}</span>
                  {option.value === value ? (
                    <CheckCircle2 className="ms-auto h-4 w-4 text-emerald-600" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CustomersSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-lg border bg-card shadow-none">
            <CardHeader className="relative min-h-[112px] px-6 py-5">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="mt-5 h-8 w-16 animate-pulse rounded bg-muted" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="space-y-4 pt-1">
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        <div className="overflow-hidden rounded-lg border bg-background">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-[62px] border-b bg-background last:border-0">
              <div className="h-full w-full animate-pulse bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DateTextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Input
      type="date"
      value={value}
      onChange={(event) => onChange(toEnglishDigits(event.target.value))}
      placeholder={placeholder}
      dir="ltr"
      className="h-10 w-[170px] rounded-md border bg-background text-left font-mono text-sm shadow-none [color-scheme:light] dark:[color-scheme:dark]"
    />
  );
}

export default function CustomersPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [customers, setCustomers] = React.useState<CustomerRecord[]>([]);
  const [summary, setSummary] = React.useState<CustomersSummary>({});
  const [totalFromApi, setTotalFromApi] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [filters, setFilters] = React.useState<FiltersState>({
    search: "",
    status: "all",
    type: "all",
    source: "all",
    account: "all",
    verification: "all",
    city: "all",
    dateFrom: "",
    dateTo: "",
    sort: "newest",
  });

  const [sortKey, setSortKey] = React.useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Record<ColumnKey, boolean>>({
    select: true,
    customer: true,
    contact: true,
    city: true,
    type: true,
    source: true,
    account: true,
    verification: true,
    status: true,
    createdAt: true,
    actions: true,
  });

  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const didLoadRef = React.useRef(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const isRtl = locale === "ar";
  const textAlign = locale === "ar" ? "text-right" : "text-left";
  const startNegative = locale === "ar" ? "-me-2" : "-ms-2";

  const loadCustomers = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) {
          setLoading(true);
        }

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: "1",
          page_size: "500",
        });

        const payload = await fetchJson<CustomersApiResponse>(
          makeApiUrl("/api/customers/", params),
          controller.signal,
        );

        const nextCustomers = extractCustomers(payload);

        setCustomers(nextCustomers);
        setSummary(payload.summary || {});
        setTotalFromApi(Number(payload.count ?? nextCustomers.length));

        if (silent) {
          toast.success(translations[locale].loaded);
        }
      } catch (fetchError) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load customers.";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [locale],
  );

  React.useEffect(() => {
    if (didLoadRef.current) return;

    didLoadRef.current = true;
    void loadCustomers();
  }, [loadCustomers]);

  React.useEffect(() => {
    const readLocale = () => {
      try {
        const saved = window.localStorage.getItem("primey-locale");
        const nextLocale: Locale = saved === "en" ? "en" : "ar";

        setLocale(nextLocale);
        document.documentElement.lang = nextLocale;
        document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
        document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
      } catch {
        setLocale("ar");
      }
    };

    readLocale();

    window.addEventListener("primey-locale-changed", readLocale);
    window.addEventListener("storage", readLocale);

    return () => {
      window.removeEventListener("primey-locale-changed", readLocale);
      window.removeEventListener("storage", readLocale);
    };
  }, []);

  const columns = React.useMemo<ColumnConfig[]>(
    () => [
      { key: "select", label: t.selected, canHide: false },
      { key: "customer", label: t.customer, canHide: true },
      { key: "contact", label: t.contact, canHide: true },
      { key: "city", label: t.city, canHide: true },
      { key: "type", label: t.type, canHide: true },
      { key: "source", label: t.source, canHide: true },
      { key: "account", label: t.account, canHide: true },
      { key: "verification", label: t.verification, canHide: true },
      { key: "status", label: t.status, canHide: true },
      { key: "createdAt", label: t.createdAt, canHide: true },
      { key: "actions", label: t.actions, canHide: false },
    ],
    [t],
  );

  const visibleColumnCount = columns.filter((column) => visibleColumns[column.key]).length;

  const statusOptions = React.useMemo<FilterOption[]>(
    () => [
      { value: "all", label: t.all },
      { value: "active", label: t.active },
      { value: "inactive", label: t.inactive },
      { value: "blocked", label: t.blocked },
      { value: "lead", label: t.lead },
    ],
    [t],
  );

  const typeOptions = React.useMemo<FilterOption[]>(
    () => [
      { value: "all", label: t.all },
      { value: "individual", label: t.individual },
      { value: "corporate", label: t.corporate },
    ],
    [t],
  );

  const sourceOptions = React.useMemo<FilterOption[]>(
    () => [
      { value: "all", label: t.all },
      { value: "website", label: t.website },
      { value: "whatsapp", label: t.whatsapp },
      { value: "agent", label: t.agent },
      { value: "admin", label: t.admin },
      { value: "import", label: t.import },
      { value: "other", label: t.other },
    ],
    [t],
  );

  const accountOptions = React.useMemo<FilterOption[]>(
    () => [
      { value: "all", label: t.all },
      { value: "linked", label: t.linked },
      { value: "missing", label: t.missing },
    ],
    [t],
  );

  const verificationOptions = React.useMemo<FilterOption[]>(
    () => [
      { value: "all", label: t.all },
      { value: "phone", label: t.phone },
      { value: "whatsapp", label: t.whatsapp },
      { value: "unverified", label: t.unverified },
    ],
    [t],
  );

  const cityOptions = React.useMemo<FilterOption[]>(() => {
    const map = new Map<string, string>();

    customers.forEach((customer) => {
      const label = customer.city || t.noCity;
      const value = customer.city ? normalizeText(customer.city) : NO_CITY_VALUE;
      map.set(value, label);
    });

    return [
      { value: "all", label: t.all },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [customers, t.all, t.noCity]);

  const filteredCustomers = React.useMemo(() => {
    const filtered = customers.filter((customer) =>
      customerMatchesFilters(customer, filters),
    );

    const presetSorted = applySortPreset(filtered, filters.sort);

    return [...presetSorted].sort((a, b) =>
      compareValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDirection),
    );
  }, [customers, filters, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const startRow = safePageIndex * pageSize;
  const pagedCustomers = filteredCustomers.slice(startRow, startRow + pageSize);

  const allPageIds = React.useMemo(
    () => pagedCustomers.map((customer) => String(customer.id)),
    [pagedCustomers],
  );

  const allPageSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));

  const somePageSelected =
    allPageIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  const localSummary = React.useMemo(() => {
    const total = totalFromApi || summary.total || customers.length;
    const active =
      summary.active ??
      customers.filter((customer) => getCustomerStatus(customer) === "active").length;
    const withAccount =
      summary.with_account ??
      customers.filter((customer) => hasCustomerAccount(customer)).length;
    const verified =
      summary.whatsapp_verified ??
      customers.filter((customer) => customer.is_whatsapp_verified).length;

    return {
      total,
      active,
      withAccount,
      verified,
    };
  }, [customers, summary, totalFromApi]);

  React.useEffect(() => {
    setPageIndex(0);
  }, [filters, pageSize, sortDirection, sortKey]);

  React.useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(Math.max(0, pageCount - 1));
    }
  }, [pageCount, pageIndex]);

  const updateFilter = <K extends keyof FiltersState>(
    key: K,
    value: FiltersState[K],
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      type: "all",
      source: "all",
      account: "all",
      verification: "all",
      city: "all",
      dateFrom: "",
      dateTo: "",
      sort: "newest",
    });

    setSortKey("created_at");
    setSortDirection("desc");
    setSelectedIds(new Set());
  };

  const handleSort = (key: SortKey) => {
    setSortKey((currentKey) => {
      if (currentKey === key) {
        setSortDirection((currentDirection) =>
          currentDirection === "asc" ? "desc" : "asc",
        );
        return currentKey;
      }

      setSortDirection(key === "created_at" ? "desc" : "asc");
      return key;
    });
  };

  const togglePageSelection = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      allPageIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });

      return next;
    });
  };

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) next.add(id);
      else next.delete(id);

      return next;
    });
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(value);
    }
  };

  const hasActiveFilters =
    filters.search ||
    filters.status !== "all" ||
    filters.type !== "all" ||
    filters.source !== "all" ||
    filters.account !== "all" ||
    filters.verification !== "all" ||
    filters.city !== "all" ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.sort !== "newest";

  const renderFilters = () => (
    <>
      <FilterPopover
        label={t.chooseStatus}
        value={filters.status}
        options={statusOptions}
        onChange={(value) => updateFilter("status", value as CustomerStatusFilter)}
        emptyLabel={t.noOptions}
      />

      <FilterPopover
        label={t.chooseType}
        value={filters.type}
        options={typeOptions}
        onChange={(value) => updateFilter("type", value as CustomerTypeFilter)}
        emptyLabel={t.noOptions}
      />

      <FilterPopover
        label={t.chooseSource}
        value={filters.source}
        options={sourceOptions}
        onChange={(value) => updateFilter("source", value as CustomerSourceFilter)}
        emptyLabel={t.noOptions}
      />

      <FilterPopover
        label={t.chooseAccount}
        value={filters.account}
        options={accountOptions}
        onChange={(value) => updateFilter("account", value as AccountFilter)}
        emptyLabel={t.noOptions}
      />

      <FilterPopover
        label={t.chooseVerification}
        value={filters.verification}
        options={verificationOptions}
        onChange={(value) =>
          updateFilter("verification", value as VerificationFilter)
        }
        emptyLabel={t.noOptions}
      />

      <FilterPopover
        label={t.chooseCity}
        value={filters.city}
        options={cityOptions}
        onChange={(value) => updateFilter("city", value)}
        emptyLabel={t.noOptions}
      />

      <div className="flex w-full flex-nowrap items-center gap-2 sm:w-auto">
        <DateTextInput
          value={filters.dateFrom}
          onChange={(value) => updateFilter("dateFrom", value)}
          placeholder="YYYY-MM-DD"
        />

        <DateTextInput
          value={filters.dateTo}
          onChange={(value) => updateFilter("dateTo", value)}
          placeholder="YYYY-MM-DD"
        />
      </div>
    </>
  );

  const handleExport = () => {
    exportCustomersToExcel(filteredCustomers, t, locale);
    toast.success(t.exportDone);
  };

  const handlePrint = () => {
    printCustomers(filteredCustomers, t, locale);
    toast.success(t.printReady);
  };

  return (
    <div dir={dir} className="w-full space-y-7">
      <div className="flex items-center justify-between gap-4">
        <div className={cn("space-y-1", textAlign)}>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t.title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md shadow-none"
            onClick={() => void loadCustomers({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{t.refresh}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md shadow-none"
            onClick={handleExport}
            disabled={filteredCustomers.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t.exportExcel}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md shadow-none"
            onClick={handlePrint}
            disabled={filteredCustomers.length === 0}
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">{t.print}</span>
          </Button>

          <Button asChild className="h-10 rounded-md bg-black text-white hover:bg-black/90">
            <Link href="/system/customers/create">
              <Plus className="h-4 w-4" />
              {t.addCustomer}
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <CustomersSkeleton />
      ) : error ? (
        <Card className="rounded-lg border-rose-200 bg-rose-50 shadow-none dark:border-rose-900 dark:bg-rose-950/20">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
                <TriangleAlert className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-rose-700 dark:text-rose-200">
                  {t.errorTitle}
                </p>
                <p className="text-sm text-rose-600 dark:text-rose-300">
                  {error}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="rounded-md border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
              onClick={() => void loadCustomers({ silent: true })}
            >
              <RefreshCw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title={t.totalCustomers}
              value={formatNumber(localSummary.total)}
              trend="+100%"
            />

            <KpiCard
              title={t.activeCustomers}
              value={formatNumber(localSummary.active)}
              trend={`+${formatNumber(localSummary.active)}`}
            />

            <KpiCard
              title={t.customersWithAccounts}
              value={formatNumber(localSummary.withAccount)}
              trend={`+${formatNumber(localSummary.withAccount)}`}
            />

            <KpiCard
              title={t.whatsappVerified}
              value={formatNumber(localSummary.verified)}
              trend={`+${formatNumber(localSummary.verified)}`}
            />
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
                <div className="relative w-full md:max-w-sm">
                  <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filters.search}
                    onChange={(event) => updateFilter("search", event.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-10 rounded-md border bg-background pe-10 shadow-none"
                  />
                </div>

                <div className="hidden flex-wrap items-center gap-2 md:flex">
                  {renderFilters()}
                </div>

                <div className="md:hidden">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-md shadow-none"
                      >
                        <FilterIcon className="h-4 w-4" />
                        {t.mobileFilters}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 space-y-2 p-3" align="start">
                      {renderFilters()}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Select
                  value={filters.sort}
                  onValueChange={(value) => updateFilter("sort", value as SortFilter)}
                >
                  <SelectTrigger className="h-10 w-[180px] rounded-md border bg-background shadow-none">
                    <span className="text-sm text-muted-foreground">{t.sort}:</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="name">{t.name}</SelectItem>
                    <SelectItem value="last_login">{t.lastLogin}</SelectItem>
                    <SelectItem value="code">{t.code}</SelectItem>
                    <SelectItem value="city">{t.citySort}</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-md shadow-none"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden lg:inline">{t.reset}</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-md shadow-none"
                    >
                      <span className="hidden lg:inline">{t.columns}</span>
                      <ColumnsIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {columns
                      .filter((column) => column.canHide)
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.key}
                          checked={visibleColumns[column.key]}
                          onCheckedChange={(checked) =>
                            setVisibleColumns((current) => ({
                              ...current,
                              [column.key]: Boolean(checked),
                            }))
                          }
                        >
                          {column.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {hasActiveFilters ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {formatNumber(filteredCustomers.length)} {t.of}{" "}
                  {formatNumber(customers.length)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 rounded-lg px-2 text-xs"
                  onClick={resetFilters}
                >
                  <X className="h-3.5 w-3.5" />
                  {t.reset}
                </Button>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="overflow-x-auto">
                <Table className="min-w-[1380px]">
                  <TableHeader>
                    <TableRow className="h-11 bg-background hover:bg-background">
                      {visibleColumns.select ? (
                        <TableHead className="w-[44px] px-3">
                          <Checkbox
                            checked={
                              allPageSelected
                                ? true
                                : somePageSelected
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={(checked) =>
                              togglePageSelection(Boolean(checked))
                            }
                            aria-label={t.selected}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.customer ? (
                        <TableHead className={cn("min-w-[300px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.customer}
                            sortKey="customer"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.contact ? (
                        <TableHead className={cn("min-w-[190px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.contact}
                            sortKey="contact"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.city ? (
                        <TableHead className={cn("min-w-[145px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.city}
                            sortKey="city"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.type ? (
                        <TableHead className={cn("min-w-[110px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.type}
                            sortKey="type"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.source ? (
                        <TableHead className={cn("min-w-[120px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.source}
                            sortKey="source"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.account ? (
                        <TableHead className={cn("min-w-[135px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.account}
                            sortKey="account"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.verification ? (
                        <TableHead className={cn("min-w-[140px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.verification}
                            sortKey="verification"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.status ? (
                        <TableHead className={cn("min-w-[110px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.status}
                            sortKey="status"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.createdAt ? (
                        <TableHead className={cn("min-w-[145px] px-4", textAlign)}>
                          <HeaderSortButton
                            label={t.createdAt}
                            sortKey="created_at"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            className={startNegative}
                          />
                        </TableHead>
                      ) : null}

                      {visibleColumns.actions ? (
                        <TableHead className="w-[70px] px-4 text-center">
                          <span className="text-xs font-medium text-foreground">
                            {t.actions}
                          </span>
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {pagedCustomers.length ? (
                      pagedCustomers.map((customer) => {
                        const customerId = String(customer.id);
                        const selected = selectedIds.has(customerId);
                        const name = getCustomerName(customer);
                        const contact = getContactNumber(customer);
                        const accountLinked = hasCustomerAccount(customer);

                        return (
                          <TableRow
                            key={customerId}
                            data-state={selected ? "selected" : undefined}
                            className="h-[62px] border-b bg-background hover:bg-muted/40 data-[state=selected]:bg-muted"
                          >
                            {visibleColumns.select ? (
                              <TableCell className="px-3">
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={(checked) =>
                                    toggleRowSelection(customerId, Boolean(checked))
                                  }
                                  aria-label={t.selected}
                                />
                              </TableCell>
                            ) : null}

                            {visibleColumns.customer ? (
                              <TableCell className="px-4">
                                <div className="flex items-center gap-4">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br from-violet-50 to-white text-xs font-bold text-[#432a58] shadow-sm">
                                    {getCustomerAvatarText(customer)}
                                  </div>

                                  <div className={cn("min-w-0", textAlign)}>
                                    <Link
                                      href={`/system/customers/${customer.id}`}
                                      className="line-clamp-1 text-sm font-semibold text-foreground transition hover:text-primary"
                                    >
                                      {name}
                                    </Link>

                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <span className="font-mono">
                                        {getCustomerCode(customer) || t.noCode}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            ) : null}

                            {visibleColumns.contact ? (
                              <TableCell className={cn("px-4 text-sm", textAlign)}>
                                <div className="space-y-1">
                                  <div className="font-medium tabular-nums text-foreground">
                                    {contact ? toEnglishDigits(contact) : "—"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {customer.email || "—"}
                                  </div>
                                </div>
                              </TableCell>
                            ) : null}

                            {visibleColumns.city ? (
                              <TableCell
                                className={cn(
                                  "px-4 text-sm font-medium text-foreground",
                                  textAlign,
                                )}
                              >
                                <div className="space-y-1">
                                  <div>{customer.city || t.noCity}</div>
                                  <div className="text-xs font-normal text-muted-foreground">
                                    {customer.district || customer.country || ""}
                                  </div>
                                </div>
                              </TableCell>
                            ) : null}

                            {visibleColumns.type ? (
                              <TableCell className={cn("px-4", textAlign)}>
                                <Badge variant="outline" className="rounded-full bg-white">
                                  {getTypeLabel(customer.customer_type, t)}
                                </Badge>
                              </TableCell>
                            ) : null}

                            {visibleColumns.source ? (
                              <TableCell className={cn("px-4", textAlign)}>
                                <Badge variant="outline" className="rounded-full bg-white">
                                  {getSourceLabel(customer.source, t)}
                                </Badge>
                              </TableCell>
                            ) : null}

                            {visibleColumns.account ? (
                              <TableCell className={cn("px-4", textAlign)}>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-full",
                                    accountLinked
                                      ? "border-[#8c9cdc]/30 bg-[#432a58]/10 px-3 text-xs font-bold text-[#432a58]"
                                      : "border-slate-200 bg-slate-50 text-slate-600",
                                  )}
                                >
                                  {accountLinked ? t.linked : t.missing}
                                </Badge>
                              </TableCell>
                            ) : null}

                            {visibleColumns.verification ? (
                              <TableCell className={cn("px-4", textAlign)}>
                                <div className="flex flex-wrap gap-1.5">
                                  {customer.is_phone_verified ? (
                                    <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                                      {t.phone}
                                    </Badge>
                                  ) : null}

                                  {customer.is_whatsapp_verified ? (
                                    <Badge className="rounded-full border-sky-200 bg-sky-50 text-sky-700">
                                      {t.whatsapp}
                                    </Badge>
                                  ) : null}

                                  {!customer.is_phone_verified && !customer.is_whatsapp_verified ? (
                                    <Badge variant="outline" className="rounded-full bg-white">
                                      {t.unverified}
                                    </Badge>
                                  ) : null}
                                </div>
                              </TableCell>
                            ) : null}

                            {visibleColumns.status ? (
                              <TableCell className={cn("px-4", textAlign)}>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-full",
                                    getStatusBadgeClass(customer.status),
                                  )}
                                >
                                  {getStatusLabel(customer.status, t)}
                                </Badge>
                              </TableCell>
                            ) : null}

                            {visibleColumns.createdAt ? (
                              <TableCell
                                className={cn(
                                  "px-4 text-sm text-muted-foreground",
                                  textAlign,
                                )}
                              >
                                {formatDateEnglish(customer.created_at)}
                              </TableCell>
                            ) : null}

                            {visibleColumns.actions ? (
                              <TableCell className="px-4 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-xl"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent
                                    align={isRtl ? "start" : "end"}
                                    className="w-48"
                                  >
                                    <DropdownMenuItem asChild>
                                      <Link href={`/system/customers/${customer.id}`}>
                                        <Eye className="me-2 h-4 w-4" />
                                        {t.view}
                                      </Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      onClick={() => copyText(getCustomerCode(customer))}
                                    >
                                      <Copy className="me-2 h-4 w-4" />
                                      {t.copyCode}
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      disabled={!contact}
                                      onClick={() => copyText(contact)}
                                    >
                                      <Copy className="me-2 h-4 w-4" />
                                      {t.copyPhone}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            ) : null}
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={visibleColumnCount} className="h-56 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3">
                            <div className="rounded-3xl bg-muted p-4 text-muted-foreground">
                              <Users className="h-7 w-7" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{t.noCustomers}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {t.noCustomersDesc}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              className="rounded-xl"
                              onClick={resetFilters}
                            >
                              {t.reset}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedIds.size > 0 ? (
                  <>
                    {formatNumber(selectedIds.size)} {t.selectedRows} ·{" "}
                  </>
                ) : null}
                {formatNumber(filteredCustomers.length)} {t.of}{" "}
                {formatNumber(customers.length)}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPageIndex(0);
                  }}
                >
                  <SelectTrigger className="h-9 w-[130px] rounded-xl">
                    <SelectValue placeholder={t.rowsPerPage} />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {t.rowsPerPage}: {formatNumber(size)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="text-sm text-muted-foreground">
                  {t.page} {formatNumber(safePageIndex + 1)} {t.of}{" "}
                  {formatNumber(pageCount)}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                  disabled={safePageIndex === 0}
                >
                  {t.previous}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() =>
                    setPageIndex((current) => Math.min(pageCount - 1, current + 1))
                  }
                  disabled={safePageIndex >= pageCount - 1}
                >
                  {t.next}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}