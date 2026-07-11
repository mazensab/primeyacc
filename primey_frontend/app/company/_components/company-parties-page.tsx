"use client";
/* ============================================================
   📂 primey_frontend/app/company/_components/company-parties-page.tsx
   🧠 PrimeyAcc — Company Customers & Suppliers Shared Page
   ------------------------------------------------------------
   ✅ Approved Premium company pattern
   ✅ Real API only, no fake demo data
   ✅ Company scoped customers/suppliers center
   ✅ /company/parties + /company/customers + /company/suppliers
   ✅ KPI cards + filters + tables
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ English numbers/money always
   ✅ SAR icon from /currency/sar.svg
   ✅ components/ui only
   ✅ No localhost hardcoding
============================================================ */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Store,
  TriangleAlert,
  Users,
  WalletCards,
  Phone,
  Mail,
  MapPin,
  Hash,
  Landmark,
  CircleDollarSign,
  ExternalLink,
  MoreVertical,
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
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
type PageVariant = "parties" | "customers" | "suppliers";
type PartyKind = "customer" | "supplier";
type StatusFilter = "all" | "active" | "inactive";
type KindFilter = "all" | PartyKind;
type SortKey = "newest" | "oldest" | "name" | "code" | "balance_high" | "balance_low";
type ApiRecord = Record<string, unknown>;
type ApiResponse = ApiRecord | ApiRecord[];
type PartyRecord = {
  id: string;
  kind: PartyKind;
  code: string;
  name: string;
  legalName: string;
  partyKind: "INDIVIDUAL" | "ORGANIZATION";
  contactPerson: string;
  email: string;
  phone: string;
  mobile: string;
  whatsappNumber: string;
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
  status: "active" | "inactive";
  balance: number;
  creditLimit: number;
  openingBalance: number;
  paymentTermsDays: number;
  taxExempt: boolean;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
};
type PartyFormValues = {
  kind: PartyKind;
  code: string;
  display_name: string;
  legal_name: string;
  party_kind: "INDIVIDUAL" | "ORGANIZATION";
  status: "ACTIVE" | "INACTIVE";
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
  payment_terms_days: string;
  tax_exempt: "true" | "false";
  notes: string;
};
type PartyStats = {
  total: number;
  customers: number;
  suppliers: number;
  active: number;
  inactive: number;
  customerBalance: number;
  supplierBalance: number;
  creditLimit: number;
};
type DataColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};
const ENDPOINTS = {
  customers: "/api/company/customers/",
  suppliers: "/api/company/suppliers/",
};
const ACTION_ENDPOINTS = {
  customer: {
    create: "/api/company/customers/create/",
    detail: (id: string) => `/api/company/customers/${encodeURIComponent(id)}/`,
    status: (id: string, action: "activate" | "deactivate") =>
      `/api/company/customers/${encodeURIComponent(id)}/${action}/`,
  },
  supplier: {
    create: "/api/company/suppliers/create/",
    detail: (id: string) => `/api/company/suppliers/${encodeURIComponent(id)}/`,
    status: (id: string, action: "activate" | "deactivate") =>
      `/api/company/suppliers/${encodeURIComponent(id)}/${action}/`,
  },
} as const;
const DEFAULT_PARTY_FORM: PartyFormValues = {
  kind: "customer",
  code: "",
  display_name: "",
  legal_name: "",
  party_kind: "INDIVIDUAL",
  status: "ACTIVE",
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
  payment_terms_days: "0",
  tax_exempt: "false",
  notes: "",
};
const translations = {
  ar: {
    badge: "وحدة العملاء والموردين",
    partiesTitle: "العملاء والموردون",
    customersTitle: "العملاء",
    suppliersTitle: "الموردون",
    partiesSubtitle:
      "\u0645\u0631\u0643\u0632 \u0645\u062a\u0627\u0628\u0639\u0629 \u0623\u0637\u0631\u0627\u0641 \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629: \u0627\u0644\u0639\u0645\u0644\u0627\u0621\u060c \u0627\u0644\u0645\u0648\u0631\u062f\u0648\u0646\u060c \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644\u060c \u0627\u0644\u062d\u0627\u0644\u0629\u060c \u0648\u0627\u0644\u0623\u0631\u0635\u062f\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629.",
    customersSubtitle:
      "\u0642\u0627\u0626\u0645\u0629 \u062a\u0634\u063a\u064a\u0644\u064a\u0629 \u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621\u060c \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644\u060c \u0627\u0644\u062d\u0627\u0644\u0629\u060c \u0627\u0644\u0631\u0635\u064a\u062f\u060c \u0648\u062d\u062f \u0627\u0644\u0627\u0626\u062a\u0645\u0627\u0646 \u062f\u0627\u062e\u0644 \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.",
    suppliersSubtitle:
      "\u0642\u0627\u0626\u0645\u0629 \u062a\u0634\u063a\u064a\u0644\u064a\u0629 \u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646\u060c \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644\u060c \u0627\u0644\u062d\u0627\u0644\u0629\u060c \u0627\u0644\u0631\u0635\u064a\u062f\u060c \u0648\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0636\u0631\u064a\u0628\u064a\u0629 \u062f\u0627\u062e\u0644 \u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    search: "بحث",
    all: "الكل",
    active: "نشط",
    inactive: "غير نشط",
    customer: "عميل",
    supplier: "مورد",
    customers: "العملاء",
    suppliers: "الموردون",
    activeCustomers: "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0646\u0634\u0637\u0648\u0646",
    inactiveCustomers: "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0639\u0637\u0644\u0648\u0646",
    activeSuppliers: "\u0627\u0644\u0645\u0648\u0631\u062f\u0648\u0646 \u0627\u0644\u0646\u0634\u0637\u0648\u0646",
    inactiveSuppliers: "\u0627\u0644\u0645\u0648\u0631\u062f\u0648\u0646 \u0627\u0644\u0645\u0639\u0637\u0644\u0648\u0646",
    parties: "الأطراف",
    totalParties: "إجمالي الأطراف",
    activeParties: "الأطراف النشطة",
    inactiveParties: "الأطراف المعطلة",
    customerBalance: "أرصدة العملاء",
    supplierBalance: "أرصدة الموردين",
    creditLimit: "حدود الائتمان",
    customersDesc: "عدد العملاء المسجلين",
    suppliersDesc: "عدد الموردين المسجلين",
    activeDesc: "الأطراف المفعلة حاليًا",
    inactiveDesc: "الأطراف غير المفعلة",
    customerBalanceDesc: "إجمالي أرصدة العملاء حسب البيانات المتاحة",
    supplierBalanceDesc: "إجمالي أرصدة الموردين حسب البيانات المتاحة",
    creditLimitDesc: "إجمالي حدود الائتمان المسجلة",
    shortcutsTitle: "اختصارات الوحدة",
    shortcutsDesc: "انتقال سريع للصفحات المرتبطة بالعملاء والموردين.",
    customersList: "قائمة العملاء",
    suppliersList: "قائمة الموردين",
    salesInvoices: "فواتير المبيعات",
    purchaseBills: "فواتير المشتريات",
    receiptVouchers: "سندات القبض",
    paymentVouchers: "سندات الصرف",
    filtersTitle: "فلاتر الأطراف",
    filtersDesc: "ابحث وفلتر حسب النوع والحالة والترتيب.",
    searchPlaceholder: "ابحث بالاسم أو الكود أو الجوال أو البريد أو الرقم الضريبي...",
    type: "النوع",
    status: "الحالة",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    codeSort: "الكود",
    balanceHigh: "الأعلى رصيدًا",
    balanceLow: "الأقل رصيدًا",
    partiesTable: "سجل العملاء والموردين",
    customersTable: "سجل العملاء",
    suppliersTable: "سجل الموردين",
    partiesTableDesc: "\u0633\u062c\u0644 \u0645\u0648\u062d\u062f \u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646 \u062f\u0627\u062e\u0644 \u0627\u0644\u0634\u0631\u0643\u0629.",
    customersTableDesc: "\u0633\u062c\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0648\u0627\u0644\u062d\u0627\u0644\u0629 \u0648\u0627\u0644\u0623\u0631\u0635\u062f\u0629.",
    suppliersTableDesc: "\u0633\u062c\u0644 \u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646 \u0648\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0648\u0627\u0644\u062d\u0627\u0644\u0629 \u0648\u0627\u0644\u0623\u0631\u0635\u062f\u0629.",
    party: "الطرف",
    contact: "التواصل",
    tax: "الرقم الضريبي",
    city: "المدينة",
    balance: "الرصيد",
    limit: "حد الائتمان",
    updatedAt: "آخر تحديث",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    sar: "ر.س",
    unknown: "غير محدد",
    noDataTitle: "لا توجد بيانات",
    noDataDesc: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0633\u062c\u0644\u0627\u062a \u062d\u0627\u0644\u064a\u0627\u064b.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "\u063a\u064a\u0651\u0631 \u0627\u0644\u0628\u062d\u062b \u0623\u0648 \u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0644\u0639\u0631\u0636 \u0646\u062a\u0627\u0626\u062c \u0623\u062e\u0631\u0649.",
    errorTitle: "تعذر تحميل وحدة العملاء والموردين",
    errorDesc: "\u062a\u0623\u0643\u062f \u0645\u0646 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u062f\u0627\u062e\u0644 \u0627\u0644\u0634\u0631\u0643\u0629 \u062b\u0645 \u0623\u0639\u062f \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629.",
    tryAgain: "إعادة المحاولة",
    partialWarningTitle: "تم تحميل الصفحة جزئيًا",
    refreshed: "تم تحديث البيانات.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    generatedAt: "تم الإنشاء في",
    dateFrom: "من تاريخ",
    dateTo: "إلى تاريخ",
    reportRows: "عدد السجلات",
    exportSuccess: "تم تجهيز ملف Excel بنجاح.",
    printReady: "تم تجهيز صفحة الطباعة.",
    printWindowBlocked: "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.",
  },
  en: {
    badge: "Customers & Suppliers Module",
    partiesTitle: "Customers & Suppliers",
    customersTitle: "Customers",
    suppliersTitle: "Suppliers",
    partiesSubtitle:
      "Company parties center: customers, suppliers, contact details, status, and operational balances.",
    customersSubtitle:
      "Operational customer list with contact details, status, balance, and credit limit inside the current company.",
    suppliersSubtitle:
      "Operational supplier list with contact details, status, balances, and tax data inside the current company.",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    search: "Search",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    customer: "Customer",
    supplier: "Supplier",
    customers: "Customers",
    suppliers: "Suppliers",
    activeCustomers: "Active customers",
    inactiveCustomers: "Inactive customers",
    activeSuppliers: "Active suppliers",
    inactiveSuppliers: "Inactive suppliers",
    parties: "Parties",
    totalParties: "Total parties",
    activeParties: "Active parties",
    inactiveParties: "Inactive parties",
    customerBalance: "Customer balances",
    supplierBalance: "Supplier balances",
    creditLimit: "Credit limits",
    customersDesc: "Registered customers",
    suppliersDesc: "Registered suppliers",
    activeDesc: "Currently active parties",
    inactiveDesc: "Inactive parties",
    customerBalanceDesc: "Customer balance total from available data",
    supplierBalanceDesc: "Supplier balance total from available data",
    creditLimitDesc: "Registered credit limits total",
    shortcutsTitle: "Module shortcuts",
    shortcutsDesc: "Quick navigation to customers and suppliers related pages.",
    customersList: "Customers list",
    suppliersList: "Suppliers list",
    salesInvoices: "Sales invoices",
    purchaseBills: "Purchase bills",
    receiptVouchers: "Receipt vouchers",
    paymentVouchers: "Payment vouchers",
    filtersTitle: "Party filters",
    filtersDesc: "Search and filter by kind, status, and sorting.",
    searchPlaceholder: "Search by name, code, phone, email, or tax number...",
    type: "Type",
    status: "Status",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    codeSort: "Code",
    balanceHigh: "Highest balance",
    balanceLow: "Lowest balance",
    partiesTable: "Customers & suppliers register",
    customersTable: "Customers register",
    suppliersTable: "Suppliers register",
    partiesTableDesc: "Unified register for company customers and suppliers.",
    customersTableDesc: "Customer register with contact details, status, and balances.",
    suppliersTableDesc: "Supplier register with contact details, status, and balances.",
    party: "Party",
    contact: "Contact",
    tax: "Tax number",
    city: "City",
    balance: "Balance",
    limit: "Credit limit",
    updatedAt: "Updated at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    sar: "SAR",
    unknown: "Unknown",
    noDataTitle: "No data",
    noDataDesc: "No records are available yet.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load customers and suppliers module",
    errorDesc: "Make sure you are signed in to the company, then try again.",
    tryAgain: "Try again",
    partialWarningTitle: "Page loaded partially",
    refreshed: "Data refreshed.",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    generatedAt: "Generated at",
    dateFrom: "From date",
    dateTo: "To date",
    reportRows: "Records",
    exportSuccess: "Excel file prepared successfully.",
    printReady: "Print page prepared.",
    printWindowBlocked: "The print window could not be opened. Allow pop-ups and try again.",
  },
} as const;
const actionTranslations = {
  ar: {
    addParty: "\u0625\u0636\u0627\u0641\u0629 \u0637\u0631\u0641",
    addCustomer: "\u0625\u0636\u0627\u0641\u0629 \u0639\u0645\u064a\u0644",
    addSupplier: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0631\u062f",
    editParty: "\u062a\u0639\u062f\u064a\u0644 \u0637\u0631\u0641",
    editCustomer: "\u062a\u0639\u062f\u064a\u0644 \u0639\u0645\u064a\u0644",
    editSupplier: "\u062a\u0639\u062f\u064a\u0644 \u0645\u0648\u0631\u062f",
    createDesc: "\u0623\u062f\u062e\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0637\u0631\u0641 \u0648\u0627\u062d\u0641\u0638\u0647 \u062f\u0627\u062e\u0644 \u0627\u0644\u0634\u0631\u0643\u0629.",
    editDesc: "\u062d\u062f\u062b \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0637\u0631\u0641 \u062f\u0627\u062e\u0644 \u0627\u0644\u0634\u0631\u0643\u0629.",
    basic: "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629",
    contact: "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644",
    financial: "\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0629",
    partyType: "\u0646\u0648\u0639 \u0627\u0644\u0637\u0631\u0641",
    displayName: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u0644",
    code: "\u0627\u0644\u0643\u0648\u062f",
    legalName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a",
    partyKind: "\u0627\u0644\u0635\u0641\u0629",
    individual: "\u0641\u0631\u062f",
    organization: "\u0645\u0646\u0634\u0623\u0629",
    contactPerson: "\u0634\u062e\u0635 \u0627\u0644\u062a\u0648\u0627\u0635\u0644",
    phone: "\u0627\u0644\u0647\u0627\u062a\u0641",
    mobile: "\u0627\u0644\u062c\u0648\u0627\u0644",
    whatsapp: "\u0631\u0642\u0645 \u0648\u0627\u062a\u0633\u0627\u0628",
    email: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a",
    vat: "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0636\u0631\u064a\u0628\u064a",
    commercialRegistration: "\u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u062a\u062c\u0627\u0631\u064a",
    address: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646",
    openingBalance: "\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u0627\u0641\u062a\u062a\u0627\u062d\u064a",
    paymentTerms: "\u0623\u064a\u0627\u0645 \u0627\u0644\u0633\u062f\u0627\u062f",
    taxExempt: "\u0645\u0639\u0641\u0649 \u0636\u0631\u064a\u0628\u064a\u0627\u064b",
    notes: "\u0645\u0644\u0627\u062d\u0638\u0627\u062a",
    yes: "\u0646\u0639\u0645",
    no: "\u0644\u0627",
    actions: "\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a",
    edit: "\u062a\u0639\u062f\u064a\u0644",
    activate: "\u062a\u0641\u0639\u064a\u0644",
    deactivate: "\u062a\u0639\u0637\u064a\u0644",
    confirmActivateTitle: "تأكيد تفعيل الطرف",
    confirmDeactivateTitle: "تأكيد تعطيل الطرف",
    confirmActivateDesc: "سيتم تفعيل هذا الطرف وإتاحته للاستخدام في العمليات الجديدة.",
    confirmDeactivateDesc: "سيتم تعطيل هذا الطرف ومنع استخدامه في العمليات الجديدة، مع الاحتفاظ بسجلاته السابقة.",
    confirmActivateAction: "تأكيد التفعيل",
    confirmDeactivateAction: "تأكيد التعطيل",
    save: "\u062d\u0641\u0638",
    cancel: "\u0625\u0644\u063a\u0627\u0621",
    saving: "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638",
    requiredName: "\u0627\u0633\u0645 \u0627\u0644\u0637\u0631\u0641 \u0645\u0637\u0644\u0648\u0628.",
    createSuccess: "\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0633\u062c\u0644 \u0628\u0646\u062c\u0627\u062d.",
    updateSuccess: "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0633\u062c\u0644 \u0628\u0646\u062c\u0627\u062d.",
    activateSuccess: "\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0637\u0631\u0641 \u0628\u0646\u062c\u0627\u062d.",
    deactivateSuccess: "\u062a\u0645 \u062a\u0639\u0637\u064a\u0644 \u0627\u0644\u0637\u0631\u0641 \u0628\u0646\u062c\u0627\u062d.",
    actionFailed: "\u062a\u0639\u0630\u0631 \u062a\u0646\u0641\u064a\u0630 \u0627\u0644\u0625\u062c\u0631\u0627\u0621.",
  },
  en: {
    addParty: "Add party",
    addCustomer: "Add customer",
    addSupplier: "Add supplier",
    editParty: "Edit party",
    editCustomer: "Edit customer",
    editSupplier: "Edit supplier",
    createDesc: "Enter party details and save it inside the company.",
    editDesc: "Update party details inside the company.",
    basic: "Basic information",
    contact: "Contact information",
    financial: "Financial information",
    partyType: "Party type",
    displayName: "Business name",
    code: "Code",
    legalName: "Legal name",
    partyKind: "Kind",
    individual: "Individual",
    organization: "Organization",
    contactPerson: "Contact person",
    phone: "Phone",
    mobile: "Mobile",
    whatsapp: "WhatsApp number",
    email: "Email",
    vat: "VAT number",
    commercialRegistration: "Commercial registration",
    address: "Address",
    openingBalance: "Opening balance",
    paymentTerms: "Payment terms days",
    taxExempt: "Tax exempt",
    notes: "Notes",
    yes: "Yes",
    no: "No",
    actions: "Actions",
    edit: "Edit",
    activate: "Activate",
    deactivate: "Deactivate",
    confirmActivateTitle: "Confirm party activation",
    confirmDeactivateTitle: "Confirm party deactivation",
    confirmActivateDesc: "This party will be activated and available for new transactions.",
    confirmDeactivateDesc: "This party will be disabled for new transactions while previous records remain available.",
    confirmActivateAction: "Confirm activation",
    confirmDeactivateAction: "Confirm deactivation",
    save: "Save",
    cancel: "Cancel",
    saving: "Saving",
    requiredName: "Party name is required.",
    createSuccess: "Record created successfully.",
    updateSuccess: "Record updated successfully.",
    activateSuccess: "Party activated successfully.",
    deactivateSuccess: "Party deactivated successfully.",
    actionFailed: "Could not complete the action.",
  },
} as const;
const nationalAddressTranslations = {
  ar: {
    title: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0648\u0637\u0646\u064a",
    desc: "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u0629 \u0644\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0648\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631.",
    city: "\u0627\u0644\u0645\u062f\u064a\u0646\u0629",
    district: "\u0627\u0644\u062d\u064a",
    street: "\u0627\u0644\u0634\u0627\u0631\u0639",
    buildingNumber: "\u0631\u0642\u0645 \u0627\u0644\u0645\u0628\u0646\u0649",
    additionalNumber: "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0625\u0636\u0627\u0641\u064a",
    postalCode: "\u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0628\u0631\u064a\u062f\u064a",
    shortAddress: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u062e\u062a\u0635\u0631",
    addressLine: "\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0639\u0646\u0648\u0627\u0646",
  },
  en: {
    title: "National address",
    desc: "Official address details used for invoices and reports.",
    city: "City",
    district: "District",
    street: "Street",
    buildingNumber: "Building number",
    additionalNumber: "Additional number",
    postalCode: "Postal code",
    shortAddress: "Short address",
    addressLine: "Address details",
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
function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}
function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
function boolValue(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "active", "enabled"].includes(normalized)) return true;
    if (["false", "0", "no", "inactive", "disabled"].includes(normalized)) return false;
  }
  return fallback;
}
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function apiBase() {
  const value = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return value.endsWith("/api") ? value.slice(0, -4) : value;
}
function apiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${apiBase()}${path}${query ? `?${query}` : ""}`;
}
async function fetchJson<T>(path: string, params?: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(path, params), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
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
      text(record.message) ||
        text(record.detail) ||
        text(record.error) ||
        `HTTP ${response.status}`,
    );
  }
  return payload as T;
}
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&")}=([^;]*)`));
  return match ? decodeURIComponent(match[1] || "") : "";
}
async function submitJson<T>(path: string, method: "POST" | "PATCH" | "PUT", body: ApiRecord): Promise<T> {
  const csrfToken = getCookie("csrftoken");
  const response = await fetch(apiUrl(path), {
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
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
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
      text(record.message) || text(record.detail) || text(record.error) || `HTTP ${response.status}`,
    );
  }
  return payload as T;
}
function inputNumber(value: unknown) {
  const next = text(value);
  return next || "0";
}
function buildPartyPayload(form: PartyFormValues): ApiRecord {
  return {
    code: form.code.trim(),
    display_name: form.display_name.trim(),
    legal_name: form.legal_name.trim(),
    party_kind: form.party_kind,
    status: form.status,
    contact_person: form.contact_person.trim(),
    phone: form.phone.trim(),
    mobile: form.mobile.trim(),
    whatsapp_number: form.whatsapp_number.trim(),
    email: form.email.trim(),
    vat_number: form.vat_number.trim(),
    commercial_registration: form.commercial_registration.trim(),
    city: form.city.trim(),
    district: form.district.trim(),
    street: form.street.trim(),
    building_number: form.building_number.trim(),
    additional_number: form.additional_number.trim(),
    postal_code: form.postal_code.trim(),
    short_address: form.short_address.trim(),
    address_line: form.address_line.trim(),
    credit_limit: inputNumber(form.credit_limit),
    opening_balance: inputNumber(form.opening_balance),
    payment_terms_days: inputNumber(form.payment_terms_days),
    tax_exempt: form.tax_exempt === "true",
    notes: form.notes.trim(),
  };
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
      record.objects,
      record.payload,
      record.response,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    for (const candidate of candidates) {
      const nested = unwrap(candidate, depth + 1);
      if (nested.length > 0) return nested;
    }
    return [];
  }
  return unwrap(payload);
}
function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(numberValue(value)),
  );
}
function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue(value));
}
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10) || "—";
  return parsed.toISOString().slice(0, 10);
}
function parseIsoDate(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value
    .slice(0, 10)
    .split("-")
    .map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}
function dateToIso(value?: Date) {
  if (!value) return "";
  return value.toLocaleDateString("en-CA");
}
function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = parseIsoDate(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={label}
          title={label}
          className="h-9 w-full justify-start bg-background px-3 text-start font-normal shadow-none sm:w-[150px]"
        >
          <CalendarDays className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span
            dir="ltr"
            lang="en"
            className="truncate tabular-nums"
          >
            {value || label}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(dateToIso(date))}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function rowTime(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
function normalizeStatus(record: ApiRecord): "active" | "inactive" {
  if (Object.prototype.hasOwnProperty.call(record, "is_active")) {
    return boolValue(record.is_active) ? "active" : "inactive";
  }
  if (Object.prototype.hasOwnProperty.call(record, "active")) {
    return boolValue(record.active) ? "active" : "inactive";
  }
  const status = text(record.status || record.state).toLowerCase();
  if (["inactive", "disabled", "archived", "suspended", "blocked"].includes(status)) return "inactive";
  return "active";
}
function normalizeParty(value: unknown, kind: PartyKind): PartyRecord {
  const record = asRecord(value);
  const address = asRecord(record.address);
  const cityRecord = asRecord(record.city);
  const contact = asRecord(record.contact);
  const rawKind = text(record.party_kind || record.kind || record.partyKind).toUpperCase();
  return {
    id: text(record.id || record.uuid || record.pk || record.code),
    kind,
    code: text(record.code || record.customer_code || record.supplier_code || record.number),
    name:
      text(record.name) ||
      text(record.display_name) ||
      text(record.full_name) ||
      text(record.company_name) ||
      text(record.legal_name) ||
      "?",
    legalName: text(record.legal_name || record.legalName),
    partyKind: rawKind === "ORGANIZATION" ? "ORGANIZATION" : "INDIVIDUAL",
    contactPerson: text(record.contact_person || record.contactPerson || contact.name),
    email: text(record.email || record.contact_email || contact.email),
    phone: text(record.phone || record.contact_phone || contact.phone),
    mobile: text(record.mobile || contact.mobile),
    whatsappNumber: text(record.whatsapp_number || record.whatsappNumber || contact.whatsapp_number),
    taxNumber: text(record.tax_number || record.vat_number || record.trn || record.tax_id),
    commercialRegistration: text(record.commercial_registration || record.commercialRegistration || record.cr_number),
    city: text(record.city_name || cityRecord.name || address.city || record.city),
    district: text(record.district || address.district),
    street: text(record.street || address.street),
    buildingNumber: text(record.building_number || record.buildingNumber || address.building_number),
    additionalNumber: text(record.additional_number || record.additionalNumber || address.additional_number),
    postalCode: text(record.postal_code || record.postalCode || address.postal_code),
    shortAddress: text(record.short_address || record.shortAddress || address.short_address),
    addressLine: text(record.address_line || record.addressLine || address.line || record.address),
    status: normalizeStatus(record),
    balance: numberValue(
      record.balance ??
        record.current_balance ??
        record.outstanding_balance ??
        record.receivable_balance ??
        record.payable_balance ??
        record.total_balance,
    ),
    creditLimit: numberValue(record.credit_limit || record.creditLimit || record.limit),
    openingBalance: numberValue(record.opening_balance || record.openingBalance),
    paymentTermsDays: numberValue(record.payment_terms_days || record.paymentTermsDays),
    taxExempt: boolValue(record.tax_exempt || record.taxExempt, false),
    notes: text(record.notes || record.note),
    createdAt: text(record.created_at || record.created) || null,
    updatedAt: text(record.updated_at || record.modified_at || record.created_at) || null,
  };
}
function partyLabel(kind: PartyKind, locale: Locale) {
  return kind === "customer" ? translations[locale].customer : translations[locale].supplier;
}

function partyDetailHref(row: PartyRecord) {
  const base = row.kind === "supplier" ? "/company/suppliers" : "/company/customers";
  return row.id ? `${base}/${encodeURIComponent(row.id)}` : base;
}
function statusLabel(status: "active" | "inactive", locale: Locale) {
  return status === "active" ? translations[locale].active : translations[locale].inactive;
}
function getStatusBadgeClass(status: "active" | "inactive") {
  return status === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
}
function kindBadgeClass(kind: PartyKind) {
  return kind === "customer"
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : "border-violet-200 bg-violet-50 text-violet-700";
}
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
function MoneyValue({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold">
      <span
        dir="ltr"
        lang="en"
        className="tabular-nums"
      >
        {formatMoney(value)}
      </span>
      <Image
        src="/currency/sar.svg"
        alt={label}
        width={14}
        height={14}
        className="h-3.5 w-3.5 shrink-0"
      />
    </span>
  );
}

function StatusBadge({ value, label }: { value: "active" | "inactive"; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getStatusBadgeClass(value))}
    >
      {label}
    </Badge>
  );
}
function KindBadge({ value, label }: { value: PartyKind; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", kindBadgeClass(value))}
    >
      {label}
    </Badge>
  );
}
function KpiCard({
  title,
  value,
  description,
  href,
  icon: Icon,
  money,
  t,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  money?: boolean;
  t: (typeof translations)[Locale];
}) {
  return (
    <Card className="group overflow-hidden rounded-lg border bg-card shadow-none transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
          <div className="min-w-0">
            <CardDescription className="truncate text-sm">{title}</CardDescription>
            <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
              {money ? <MoneyValue value={value} label={t.sar} /> : formatInteger(value)}
            </CardTitle>
          </div>
          <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
            <Icon className="h-5 w-5" />
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Link>
    </Card>
  );
}
function PremiumField({
  label,
  icon: Icon,
  className,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("space-y-1.5 text-sm font-medium text-foreground", className)}>
      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
        {Icon ? (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-slate-700">
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
        {label}
      </span>
      {children}
    </label>
  );
}
function PremiumPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
      </div>
      {children}
    </section>
  );
}
function formInputClass(extra = "") {
  return cn(
    "h-10 rounded-xl border-slate-200 bg-white text-start text-sm shadow-sm transition placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-slate-950/20",
    extra,
  );
}
function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-full max-w-3xl" />
          <Skeleton className="h-7 w-56" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="rounded-lg border bg-card shadow-none">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-lg border bg-card shadow-none">
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
function EmptyTableState({
  title,
  description,
  showReset,
  onReset,
  resetLabel,
}: {
  title: string;
  description: string;
  showReset?: boolean;
  onReset?: () => void;
  resetLabel: string;
}) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {showReset && onReset ? (
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}
function DataTable<T extends { id: string }>({
  rows,
  allRowsCount,
  columns,
  rowKey,
  emptyTitle,
  emptyDescription,
  noResultsTitle,
  noResultsDescription,
  hasFilters,
  onReset,
  resetLabel,
  showingLabel,
  ofLabel,
  rowsLabel,
  rowHref,
}: {
  rows: T[];
  allRowsCount: number;
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  emptyTitle: string;
  emptyDescription: string;
  noResultsTitle: string;
  noResultsDescription: string;
  hasFilters: boolean;
  onReset: () => void;
  resetLabel: string;
  showingLabel: string;
  ofLabel: string;
  rowsLabel: string;
  rowHref?: (row: T) => string;
}) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="overflow-x-auto">
          <Table className="min-w-[1120px] table-fixed">
            <TableHeader>
              <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "h-11 whitespace-nowrap px-4 text-start text-xs font-semibold text-muted-foreground",
                      column.className,
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    className={cn(
                      "h-[62px]",
                      rowHref
                        ? "cursor-pointer hover:bg-muted/35"
                        : "",
                    )}
                    onClick={() => {
                      const href = rowHref?.(row);
                      if (href) router.push(href);
                    }}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          "h-[62px] overflow-hidden px-4 text-start align-middle",
                          column.className,
                        )}
                      >
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-72">
                    <EmptyTableState
                      title={hasFilters ? noResultsTitle : emptyTitle}
                      description={hasFilters ? noResultsDescription : emptyDescription}
                      showReset={hasFilters}
                      onReset={onReset}
                      resetLabel={resetLabel}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {showingLabel} <span className="font-medium text-foreground tabular-nums">{formatInteger(rows.length)}</span>{" "}
        {ofLabel} <span className="font-medium text-foreground tabular-nums">{formatInteger(allRowsCount)}</span>{" "}
        {rowsLabel}
      </div>
    </div>
  );
}
function buildStats(rows: PartyRecord[]): PartyStats {
  const customers = rows.filter((row) => row.kind === "customer");
  const suppliers = rows.filter((row) => row.kind === "supplier");
  return {
    total: rows.length,
    customers: customers.length,
    suppliers: suppliers.length,
    active: rows.filter((row) => row.status === "active").length,
    inactive: rows.filter((row) => row.status === "inactive").length,
    customerBalance: customers.reduce((sum, row) => sum + row.balance, 0),
    supplierBalance: suppliers.reduce((sum, row) => sum + row.balance, 0),
    creditLimit: rows.reduce((sum, row) => sum + row.creditLimit, 0),
  };
}
function sortRows(rows: PartyRecord[], sort: SortKey) {
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return rowTime(a.createdAt || a.updatedAt) - rowTime(b.createdAt || b.updatedAt);
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "code") return a.code.localeCompare(b.code, undefined, { numeric: true });
    if (sort === "balance_high") return b.balance - a.balance;
    if (sort === "balance_low") return a.balance - b.balance;
    return rowTime(b.createdAt || b.updatedAt) - rowTime(a.createdAt || a.updatedAt);
  });
}
function variantTitle(variant: PageVariant, locale: Locale) {
  const t = translations[locale];
  if (variant === "customers") return t.customersTitle;
  if (variant === "suppliers") return t.suppliersTitle;
  return t.partiesTitle;
}
function variantSubtitle(variant: PageVariant, locale: Locale) {
  const t = translations[locale];
  if (variant === "customers") return t.customersSubtitle;
  if (variant === "suppliers") return t.suppliersSubtitle;
  return t.partiesSubtitle;
}
function variantTableTitle(variant: PageVariant, locale: Locale) {
  const t = translations[locale];
  if (variant === "customers") return t.customersTable;
  if (variant === "suppliers") return t.suppliersTable;
  return t.partiesTable;
}
function variantTableDesc(variant: PageVariant, locale: Locale) {
  const t = translations[locale];
  if (variant === "customers") return t.customersTableDesc;
  if (variant === "suppliers") return t.suppliersTableDesc;
  return t.partiesTableDesc;
}
export function CompanyPartiesPage({ variant }: { variant: PageVariant }) {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [rows, setRows] = React.useState<PartyRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [kind, setKind] = React.useState<KindFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = React.useState<PartyRecord | null>(null);
  const [form, setForm] = React.useState<PartyFormValues>(DEFAULT_PARTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [statusChangingId, setStatusChangingId] = React.useState("");
  const [statusConfirmTarget, setStatusConfirmTarget] =
    React.useState<PartyRecord | null>(null);
  const t = translations[locale];
  const a = actionTranslations[locale];
  const n = nationalAddressTranslations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  React.useEffect(() => {
    const applyLocale = () => {
      const next = getInitialLocale();
      setLocale(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.body.dir = next === "ar" ? "rtl" : "ltr";
    };
    applyLocale();
    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);
    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);
  const loadData = React.useCallback(
    async ({
      silent = false,
      notify = false,
    }: {
      silent?: boolean;
      notify?: boolean;
    } = {}) => {
      const controller = new AbortController();
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        setWarnings([]);
        const params = new URLSearchParams({
          page: "1",
          page_size: "100",
          ordering: "-created_at",
        });
        const requests: Array<Promise<ApiResponse>> = [];
        if (variant !== "suppliers") {
          requests.push(fetchJson<ApiResponse>(ENDPOINTS.customers, params, controller.signal));
        }
        if (variant !== "customers") {
          requests.push(fetchJson<ApiResponse>(ENDPOINTS.suppliers, params, controller.signal));
        }
        const results = await Promise.allSettled(requests);
        const failedMessages = results
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) => (result.reason instanceof Error ? result.reason.message : String(result.reason)));
        if (failedMessages.length === results.length) {
          throw new Error(failedMessages[0] || t.errorDesc);
        }
        let nextRows: PartyRecord[] = [];
        let index = 0;
        if (variant !== "suppliers") {
          const result = results[index++];
          if (result?.status === "fulfilled") {
            nextRows = nextRows.concat(extractArray(result.value).map((item) => normalizeParty(item, "customer")));
          }
        }
        if (variant !== "customers") {
          const result = results[index];
          if (result?.status === "fulfilled") {
            nextRows = nextRows.concat(extractArray(result.value).map((item) => normalizeParty(item, "supplier")));
          }
        }
        setRows(nextRows);
        setWarnings(failedMessages.filter(Boolean));
        if (failedMessages.length) {
          toast.warning(t.partialWarningTitle);
        } else if (notify) {
          toast.success(t.refreshed);
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setRows([]);
        setError(message);
        if (notify) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      return () => controller.abort();
    },
    [t.errorDesc, t.partialWarningTitle, t.refreshed, variant],
  );
  React.useEffect(() => {
    void loadData();
  }, [loadData]);
  const resetFilters = React.useCallback(() => {
    setSearch("");
    setStatus("all");
    setKind("all");
    setSort("newest");
    setDateFrom("");
    setDateTo("");
  }, []);
  const defaultCreateKind = React.useMemo<PartyKind>(() => {
    if (variant === "suppliers") return "supplier";
    return "customer";
  }, [variant]);
  const dialogTitle = React.useMemo(() => {
    if (dialogMode === "edit") {
      if (editingRow?.kind === "supplier") return a.editSupplier;
      if (editingRow?.kind === "customer") return a.editCustomer;
      return a.editParty;
    }
    if (variant === "suppliers") return a.addSupplier;
    if (variant === "customers") return a.addCustomer;
    return a.addParty;
  }, [a, dialogMode, editingRow?.kind, variant]);
  const createButtonLabel = React.useMemo(() => {
    if (variant === "suppliers") return a.addSupplier;
    if (variant === "customers") return a.addCustomer;
    return a.addParty;
  }, [a, variant]);
  const openCreateDialog = React.useCallback(() => {
    setDialogMode("create");
    setEditingRow(null);
    setForm({ ...DEFAULT_PARTY_FORM, kind: defaultCreateKind });
    setDialogOpen(true);
  }, [defaultCreateKind]);
  const openEditDialog = React.useCallback((row: PartyRecord) => {
    setDialogMode("edit");
    setEditingRow(row);
    setForm({
      kind: row.kind,
      code: row.code || "",
      display_name: row.name === "?" ? "" : row.name,
      legal_name: row.legalName || "",
      party_kind: row.partyKind,
      status: row.status === "active" ? "ACTIVE" : "INACTIVE",
      contact_person: row.contactPerson || "",
      phone: row.phone || "",
      mobile: row.mobile || "",
      whatsapp_number: row.whatsappNumber || "",
      email: row.email || "",
      vat_number: row.taxNumber || "",
      commercial_registration: row.commercialRegistration || "",
      city: row.city || "",
      district: row.district || "",
      street: row.street || "",
      building_number: row.buildingNumber || "",
      additional_number: row.additionalNumber || "",
      postal_code: row.postalCode || "",
      short_address: row.shortAddress || "",
      address_line: row.addressLine || "",
      credit_limit: String(row.creditLimit || 0),
      opening_balance: String(row.openingBalance || 0),
      payment_terms_days: String(row.paymentTermsDays || 0),
      tax_exempt: row.taxExempt ? "true" : "false",
      notes: row.notes || "",
    });
    setDialogOpen(true);
  }, []);
  const updateForm = React.useCallback((key: keyof PartyFormValues, value: string) => {
    setForm((current) => ({ ...current, [key]: value } as PartyFormValues));
  }, []);
  const handleSubmitParty = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!form.display_name.trim()) {
        toast.warning(a.requiredName);
        return;
      }
      const actionKind = dialogMode === "edit" && editingRow ? editingRow.kind : form.kind;
      const endpoint =
        dialogMode === "edit" && editingRow
          ? ACTION_ENDPOINTS[actionKind].detail(editingRow.id)
          : ACTION_ENDPOINTS[actionKind].create;
      try {
        setSaving(true);
        await submitJson<ApiResponse>(endpoint, dialogMode === "edit" ? "PATCH" : "POST", buildPartyPayload(form));
        toast.success(dialogMode === "edit" ? a.updateSuccess : a.createSuccess);
        setDialogOpen(false);
        setEditingRow(null);
        await loadData({ silent: true });
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : a.actionFailed;
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    [a, dialogMode, editingRow, form, loadData],
  );
  const handleStatusToggle = React.useCallback(
    async (row: PartyRecord) => {
      if (!row.id) return;
      const action = row.status === "active" ? "deactivate" : "activate";
      try {
        setStatusChangingId(`${row.kind}-${row.id}`);
        await submitJson<ApiResponse>(ACTION_ENDPOINTS[row.kind].status(row.id, action), "POST", {});
        toast.success(
          action === "activate"
            ? a.activateSuccess
            : a.deactivateSuccess,
        );
        setStatusConfirmTarget(null);
        await loadData({ silent: true });
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : a.actionFailed;
        toast.error(message);
      } finally {
        setStatusChangingId("");
      }
    },
    [a, loadData],
  );
  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = rows.filter((row) => {
      const haystack = [
        row.name,
        row.code,
        row.email,
        row.phone,
        row.taxNumber,
        row.city,
        row.kind,
        row.status,
        row.balance,
      ]
        .join(" ")
        .toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (status !== "all" && row.status !== status) return false;
      if (
        variant === "parties" &&
        kind !== "all" &&
        row.kind !== kind
      ) {
        return false;
      }
      const recordDate = formatDate(
        row.updatedAt || row.createdAt,
      );
      if (
        dateFrom &&
        (recordDate === "—" || recordDate < dateFrom)
      ) {
        return false;
      }
      if (
        dateTo &&
        (recordDate === "—" || recordDate > dateTo)
      ) {
        return false;
      }
      return true;
    });
    return sortRows(result, sort);
  }, [
    dateFrom,
    dateTo,
    kind,
    rows,
    search,
    sort,
    status,
    variant,
  ]);
  const stats = React.useMemo(() => buildStats(rows), [rows]);
  const hasFilters = Boolean(
    search ||
      dateFrom ||
      dateTo ||
      status !== "all" ||
      sort !== "newest" ||
      (variant === "parties" && kind !== "all"),
  );
  const columns = React.useMemo<DataColumn<PartyRecord>[]>(
    () => [
      {
        key: "party",
        label: t.party,
        className: "w-[280px]",
        render: (row) => (
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{row.name || t.unknown}</span>
            <span className="block truncate text-xs text-muted-foreground tabular-nums">{row.code || "—"}</span>
          </div>
        ),
      },
      {
        key: "kind",
        label: t.type,
        className: "w-[130px]",
        render: (row) => <KindBadge value={row.kind} label={partyLabel(row.kind, locale)} />,
      },
      {
        key: "contact",
        label: t.contact,
        className: "w-[260px]",
        render: (row) => (
          <div className="min-w-0">
            <span className="block truncate text-sm text-muted-foreground">{row.phone || "—"}</span>
            <span className="block truncate text-xs text-muted-foreground">{row.email || "—"}</span>
          </div>
        ),
      },
      {
        key: "tax",
        label: t.tax,
        className: "w-[170px]",
        render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{row.taxNumber || "—"}</span>,
      },
      {
        key: "city",
        label: t.city,
        className: "w-[150px]",
        render: (row) => <span className="truncate text-sm text-muted-foreground">{row.city || "—"}</span>,
      },
      {
        key: "balance",
        label: t.balance,
        className: "w-[160px]",
        render: (row) => <MoneyValue value={row.balance} label={t.sar} />,
      },
      {
        key: "limit",
        label: t.limit,
        className: "w-[160px]",
        render: (row) => <MoneyValue value={row.creditLimit} label={t.sar} />,
      },
      {
        key: "status",
        label: t.status,
        className: "w-[140px]",
        render: (row) => <StatusBadge value={row.status} label={statusLabel(row.status, locale)} />,
      },
      {
        key: "updated",
        label: t.updatedAt,
        className: "w-[140px]",
        render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{formatDate(row.updatedAt)}</span>,
      },
      {
        key: "actions",
        label: a.actions,
        className: "sticky left-0 z-10 w-[84px]",
        render: (row) => {
          const changingKey = `${row.kind}-${row.id}`;
          const isChanging = statusChangingId === changingKey;
          const isActive = row.status === "active";
          const nextActionLabel = isActive
            ? a.deactivate
            : a.activate;
          return (
            <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={a.actions}
                    title={a.actions}
                  >
                    {isChanging ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align={locale === "ar" ? "start" : "end"}
                  className="w-44"
                >
                  <DropdownMenuItem asChild>
                    <Link
                      href={partyDetailHref(row)}
                      className="flex items-center gap-2 text-sky-700 hover:bg-sky-50 hover:text-sky-800 focus:bg-sky-50 focus:text-sky-800 dark:text-sky-400 dark:hover:bg-sky-950/40 dark:focus:bg-sky-950/40"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      {locale === "ar"
                        ? "فتح التفاصيل"
                        : "Open details"}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openEditDialog(row)}
                    className="flex items-center gap-2 text-amber-700 hover:bg-amber-50 hover:text-amber-800 focus:bg-amber-50 focus:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40 dark:focus:bg-amber-950/40"
                  >
                    <Pencil className="h-4 w-4 shrink-0" />
                    {a.edit}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={isChanging}
                    onClick={() => setStatusConfirmTarget(row)}
                    className={cn(
                      "flex items-center gap-2",
                      isActive
                        ? "text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40"
                        : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 focus:bg-emerald-50 focus:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:focus:bg-emerald-950/40",
                    )}
                  >
                    {isChanging ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : isActive ? (
                      <PowerOff className="h-4 w-4 shrink-0" />
                    ) : (
                      <Power className="h-4 w-4 shrink-0" />
                    )}
                    {nextActionLabel}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [a, handleStatusToggle, locale, openEditDialog, statusChangingId, t],
  );
  const visibleColumns = React.useMemo(
    () => (variant === "parties" ? columns : columns.filter((column) => column.key !== "kind")),
    [columns, variant],
  );
  const kpiCards = (() => {
    if (variant === "customers") {
      return [
        {
          title: t.customers,
          value: stats.customers,
          description: t.customersDesc,
          href: "/company/customers",
          icon: Users,
        },
        {
          title: t.activeCustomers,
          value: stats.active,
          description: t.activeDesc,
          href: "/company/customers",
          icon: BadgeCheck,
        },
        {
          title: t.customerBalance,
          value: stats.customerBalance,
          description: t.customerBalanceDesc,
          href: "/company/customers",
          icon: ArrowDownLeft,
          money: true,
        },
        {
          title: t.creditLimit,
          value: stats.creditLimit,
          description: t.creditLimitDesc,
          href: "/company/customers",
          icon: WalletCards,
          money: true,
        },
      ];
    }
    if (variant === "suppliers") {
      return [
        {
          title: t.suppliers,
          value: stats.suppliers,
          description: t.suppliersDesc,
          href: "/company/suppliers",
          icon: Building2,
        },
        {
          title: t.activeSuppliers,
          value: stats.active,
          description: t.activeDesc,
          href: "/company/suppliers",
          icon: BadgeCheck,
        },
        {
          title: t.inactiveSuppliers,
          value: stats.inactive,
          description: t.inactiveDesc,
          href: "/company/suppliers",
          icon: ShieldCheck,
        },
        {
          title: t.supplierBalance,
          value: stats.supplierBalance,
          description: t.supplierBalanceDesc,
          href: "/company/suppliers",
          icon: ArrowUpRight,
          money: true,
        },
      ];
    }
    return [
      {
        title: t.totalParties,
        value: stats.total,
        description: t.parties,
        href: "/company/parties",
        icon: Users,
      },
      {
        title: t.customers,
        value: stats.customers,
        description: t.customersDesc,
        href: "/company/customers",
        icon: Users,
      },
      {
        title: t.suppliers,
        value: stats.suppliers,
        description: t.suppliersDesc,
        href: "/company/suppliers",
        icon: Building2,
      },
      {
        title: t.activeParties,
        value: stats.active,
        description: t.activeDesc,
        href: "/company/parties",
        icon: BadgeCheck,
      },
      {
        title: t.inactiveParties,
        value: stats.inactive,
        description: t.inactiveDesc,
        href: "/company/parties",
        icon: ShieldCheck,
      },
      {
        title: t.customerBalance,
        value: stats.customerBalance,
        description: t.customerBalanceDesc,
        href: "/company/customers",
        icon: ArrowDownLeft,
        money: true,
      },
      {
        title: t.supplierBalance,
        value: stats.supplierBalance,
        description: t.supplierBalanceDesc,
        href: "/company/suppliers",
        icon: ArrowUpRight,
        money: true,
      },
      {
        title: t.creditLimit,
        value: stats.creditLimit,
        description: t.creditLimitDesc,
        href: "/company/parties",
        icon: WalletCards,
        money: true,
      },
    ];
  })();
  const shortcuts = [
    { href: "/company/parties", title: t.parties, icon: Users },
    { href: "/company/customers", title: t.customersList, icon: Users },
    { href: "/company/suppliers", title: t.suppliersList, icon: Building2 },
    { href: "/company/treasury/receipt-vouchers", title: t.receiptVouchers, icon: WalletCards },
    { href: "/company/treasury/payment-vouchers", title: t.paymentVouchers, icon: WalletCards },
    { href: "/company/payments", title: t.paymentVouchers, icon: WalletCards },
  ];
  function exportExcel() {
    if (!filteredRows.length) {
      toast.warning(t.exportEmpty);
      return;
    }
    const title = variantTitle(variant, locale);
    const subtitle = variantSubtitle(variant, locale);
    const generatedAt = formatReportDateTime();
    const align = locale === "ar" ? "right" : "left";
    const amountAlign = locale === "ar" ? "left" : "right";
    const bodyRows = filteredRows
      .map(
        (row) => `
          <tr>
            <td class="text party-cell">
              <strong>${escapeHtml(row.name || "—")}</strong>
              <div class="muted">${escapeHtml(row.code || "—")}</div>
            </td>
            <td>${escapeHtml(partyLabel(row.kind, locale))}</td>
            <td class="text contact-cell">
              <div>${escapeHtml(
                row.mobile ||
                  row.phone ||
                  row.whatsappNumber ||
                  "—",
              )}</div>
              <div class="muted">
                ${escapeHtml(row.email || "—")}
              </div>
            </td>
            <td class="text">
              ${escapeHtml(row.taxNumber || "—")}
            </td>
            <td>${escapeHtml(row.city || "—")}</td>
            <td class="number">
              ${escapeHtml(row.balance.toFixed(2))}
            </td>
            <td class="number">
              ${escapeHtml(row.creditLimit.toFixed(2))}
            </td>
            <td>
              ${escapeHtml(statusLabel(row.status, locale))}
            </td>
            <td class="text">
              ${escapeHtml(formatDate(row.updatedAt))}
            </td>
          </tr>
        `,
      )
      .join("");
    const html = `
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: Arial, sans-serif;
              direction: ${dir};
              color: #111827;
            }
            h1 {
              margin: 0 0 6px;
              font-size: 22px;
            }
            .subtitle {
              margin: 0 0 6px;
              color: #4b5563;
            }
            .meta {
              margin: 0 0 16px;
              color: #6b7280;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              direction: ${dir};
            }
            th,
            td {
              border: 1px solid #000000;
              padding: 8px;
              text-align: ${align};
              vertical-align: top;
              white-space: normal;
            }
            th {
              background: #f3f4f6;
              font-weight: 700;
            }
            td.text {
              mso-number-format: "\\@";
            }
            td.number {
              mso-number-format: "0.00";
              text-align: ${amountAlign};
            }
            .muted {
              margin-top: 3px;
              color: #6b7280;
              font-size: 11px;
            }
            .party-cell {
              width: 210px;
            }
            .contact-cell {
              width: 220px;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <p class="subtitle">
            ${escapeHtml(subtitle)}
          </p>
          <p class="meta">
            ${escapeHtml(t.generatedAt)}:
            ${escapeHtml(generatedAt)}
            &nbsp; | &nbsp;
            ${escapeHtml(t.reportRows)}:
            ${escapeHtml(formatInteger(filteredRows.length))}
          </p>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.party)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.contact)}</th>
                <th>${escapeHtml(t.tax)}</th>
                <th>${escapeHtml(t.city)}</th>
                <th>
                  ${escapeHtml(`${t.balance} (${t.sar})`)}
                </th>
                <th>
                  ${escapeHtml(`${t.limit} (${t.sar})`)}
                </th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.updatedAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${bodyRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const blob = new Blob(["\uFEFF", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      `primeyacc-company-${variant}-${new Date()
        .toISOString()
        .slice(0, 10)}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(t.exportSuccess);
  }
  function printPage() {
    if (!filteredRows.length) {
      toast.warning(t.printEmpty);
      return;
    }
    const title = variantTitle(variant, locale);
    const subtitle = variantSubtitle(variant, locale);
    const generatedAt = formatReportDateTime();
    const align = locale === "ar" ? "right" : "left";
    const bodyRows = filteredRows
      .map(
        (row) => `
          <tr>
            <td>
              <strong>${escapeHtml(row.name || "—")}</strong>
              <div class="muted">
                ${escapeHtml(row.code || "—")}
              </div>
            </td>
            <td>
              ${escapeHtml(partyLabel(row.kind, locale))}
            </td>
            <td>
              <div class="text-value">
                ${escapeHtml(
                  row.mobile ||
                    row.phone ||
                    row.whatsappNumber ||
                    "—",
                )}
              </div>
              <div class="muted">
                ${escapeHtml(row.email || "—")}
              </div>
            </td>
            <td class="text-value">
              ${escapeHtml(row.taxNumber || "—")}
            </td>
            <td>${escapeHtml(row.city || "—")}</td>
            <td class="number">
              ${escapeHtml(formatMoney(row.balance))}
            </td>
            <td class="number">
              ${escapeHtml(formatMoney(row.creditLimit))}
            </td>
            <td>
              ${escapeHtml(statusLabel(row.status, locale))}
            </td>
            <td class="text-value">
              ${escapeHtml(formatDate(row.updatedAt))}
            </td>
          </tr>
        `,
      )
      .join("");
    const printWindow = window.open(
      "",
      "_blank",
      "width=1400,height=900",
    );
    if (!printWindow) {
      toast.error(t.printWindowBlocked);
      return;
    }
    printWindow.opener = null;
    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              color: #111827;
              direction: ${dir};
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 24px;
              margin-bottom: 14px;
              padding-bottom: 12px;
              border-bottom: 2px solid #111827;
            }
            h1 {
              margin: 0 0 6px;
              font-size: 24px;
            }
            .subtitle {
              margin: 0;
              max-width: 760px;
              color: #4b5563;
              font-size: 12px;
              line-height: 1.7;
            }
            .meta {
              flex: 0 0 auto;
              color: #6b7280;
              font-size: 11px;
              line-height: 1.8;
              text-align: ${align};
              white-space: nowrap;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              direction: ${dir};
              font-size: 10.5px;
            }
            thead {
              display: table-header-group;
            }
            tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            th,
            td {
              border: 1px solid #000000;
              padding: 7px;
              text-align: ${align};
              vertical-align: top;
              overflow-wrap: anywhere;
            }
            th {
              background: #f3f4f6 !important;
              color: #111827;
              font-weight: 700;
            }
            .muted {
              margin-top: 3px;
              color: #6b7280;
              font-size: 9.5px;
            }
            .text-value,
            .number {
              direction: ltr;
              unicode-bidi: plaintext;
              font-variant-numeric: tabular-nums;
            }
            .number {
              text-align: center;
              white-space: nowrap;
            }
          </style>
        </head>
        <body>
          <header class="report-header">
            <div>
              <h1>${escapeHtml(title)}</h1>
              <p class="subtitle">
                ${escapeHtml(subtitle)}
              </p>
            </div>
            <div class="meta">
              <div>
                ${escapeHtml(t.generatedAt)}:
                ${escapeHtml(generatedAt)}
              </div>
              <div>
                ${escapeHtml(t.reportRows)}:
                ${escapeHtml(formatInteger(filteredRows.length))}
              </div>
            </div>
          </header>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.party)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.contact)}</th>
                <th>${escapeHtml(t.tax)}</th>
                <th>${escapeHtml(t.city)}</th>
                <th>
                  ${escapeHtml(`${t.balance} (${t.sar})`)}
                </th>
                <th>
                  ${escapeHtml(`${t.limit} (${t.sar})`)}
                </th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.updatedAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${bodyRows}
            </tbody>
          </table>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
            window.onafterprint = function () {
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(t.printReady);
  }
  if (loading) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <PageSkeleton />
      </main>
    );
  }
  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-[900px] rounded-3xl border-destructive/30 bg-card shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-7 w-7" />
            </div>
            <CardTitle className="mt-3 text-2xl">{t.errorTitle}</CardTitle>
            <CardDescription className="text-sm leading-7">{error || t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button
              onClick={() =>
                void loadData({
                  silent: true,
                  notify: true,
                })
              }
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1 text-start">
            <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {variantTitle(variant, locale)}
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
              {variantSubtitle(variant, locale)}
            </p>
            <nav
              aria-label={t.badge}
              className="flex flex-wrap items-center gap-5 pt-2"
            >
              <Link
                href="/company/parties"
                aria-current={variant === "parties" ? "page" : undefined}
                className={cn(
                  "border-b-2 pb-1 text-sm transition-colors",
                  variant === "parties"
                    ? "border-foreground font-semibold text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.parties}
              </Link>
              <Link
                href="/company/customers"
                aria-current={variant === "customers" ? "page" : undefined}
                className={cn(
                  "border-b-2 pb-1 text-sm transition-colors",
                  variant === "customers"
                    ? "border-foreground font-semibold text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.customers}
              </Link>
              <Link
                href="/company/suppliers"
                aria-current={variant === "suppliers" ? "page" : undefined}
                className={cn(
                  "border-b-2 pb-1 text-sm transition-colors",
                  variant === "suppliers"
                    ? "border-foreground font-semibold text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.suppliers}
              </Link>
            </nav>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadData({
                  silent: true,
                  notify: true,
                })
              }
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              {t.refresh}
            </Button>
            <Button type="button" variant="outline" onClick={exportExcel}>
              <FileSpreadsheet />
              {t.export}
            </Button>
            <Button type="button" variant="outline" onClick={printPage}>
              <Printer />
              {t.print}
            </Button>
            <Button type="button" onClick={openCreateDialog}>
              <Plus />
              {createButtonLabel}
            </Button>
          </div>
        </header>

        {warnings.length ? (
          <Card className="rounded-lg border-amber-200 bg-amber-50 text-amber-900 shadow-none">
            <CardContent className="flex items-start gap-3 p-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.partialWarningTitle}</p>
                <p className="mt-1 text-xs leading-6">{warnings.join(" · ")}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <KpiCard
              key={card.title}
              title={card.title}
              value={card.value}
              description={card.description}
              href={card.href}
              icon={card.icon}
              money={card.money}
              t={t}
            />
          ))}
        </div>
        {variant === "parties" ? (
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4 sm:px-6">
              <CardTitle>{t.shortcutsTitle}</CardTitle>
              <CardDescription>{t.shortcutsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-5 pb-5 sm:px-6 md:grid-cols-2 xl:grid-cols-3">
              {shortcuts.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between gap-4 rounded-lg border bg-background p-4 transition hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="truncate text-sm font-semibold">
                      {item.title}
                    </span>
                  </div>
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}
        <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle>
                  {variantTableTitle(variant, locale)}
                </CardTitle>
                <CardDescription className="mt-1">
                  {variantTableDesc(variant, locale)}
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={exportExcel}
                >
                  <FileSpreadsheet />
                  {t.export}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={printPage}
                >
                  <Printer />
                  {t.print}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative w-full sm:w-[320px]">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder={t.searchPlaceholder}
                    className="h-9 bg-background ps-9 shadow-none"
                  />
                </div>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as StatusFilter)
                  }
                >
                  <SelectTrigger className="h-9 bg-background shadow-none sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    <SelectItem value="all">
                      {t.all}
                    </SelectItem>
                    <SelectItem value="active">
                      {t.active}
                    </SelectItem>
                    <SelectItem value="inactive">
                      {t.inactive}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {variant === "parties" ? (
                  <Select
                    value={kind}
                    onValueChange={(value) =>
                      setKind(value as KindFilter)
                    }
                  >
                    <SelectTrigger className="h-9 bg-background shadow-none sm:w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                      <SelectItem value="all">
                        {t.all}
                      </SelectItem>
                      <SelectItem value="customer">
                        {t.customer}
                      </SelectItem>
                      <SelectItem value="supplier">
                        {t.supplier}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
                <DatePickerField
                  label={t.dateFrom}
                  value={dateFrom}
                  onChange={setDateFrom}
                />
                <DatePickerField
                  label={t.dateTo}
                  value={dateTo}
                  onChange={setDateTo}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={sort}
                  onValueChange={(value) =>
                    setSort(value as SortKey)
                  }
                >
                  <SelectTrigger className="h-9 bg-background shadow-none sm:w-[180px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    <SelectItem value="newest">
                      {t.newest}
                    </SelectItem>
                    <SelectItem value="oldest">
                      {t.oldest}
                    </SelectItem>
                    <SelectItem value="name">
                      {t.nameSort}
                    </SelectItem>
                    <SelectItem value="code">
                      {t.codeSort}
                    </SelectItem>
                    <SelectItem value="balance_high">
                      {t.balanceHigh}
                    </SelectItem>
                    <SelectItem value="balance_low">
                      {t.balanceLow}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
            <DataTable
              rows={filteredRows}
              allRowsCount={rows.length}
              columns={visibleColumns}
              rowHref={(row) => partyDetailHref(row)}
              rowKey={(row) =>
                `${row.kind}-${row.id || row.code || row.name}`
              }
              emptyTitle={t.noDataTitle}
              emptyDescription={t.noDataDesc}
              noResultsTitle={t.noResultsTitle}
              noResultsDescription={t.noResultsDesc}
              hasFilters={hasFilters}
              onReset={resetFilters}
              resetLabel={t.reset}
              showingLabel={t.showing}
              ofLabel={t.of}
              rowsLabel={t.rows}
            />
          </CardContent>
        </Card>
        <AlertDialog
          open={Boolean(statusConfirmTarget)}
          onOpenChange={(open) => {
            const isBusy = Boolean(
              statusConfirmTarget &&
                statusChangingId ===
                  `${statusConfirmTarget.kind}-${statusConfirmTarget.id}`,
            );
            if (!open && !isBusy) {
              setStatusConfirmTarget(null);
            }
          }}
        >
          <AlertDialogContent
            dir={dir}
            className="sm:max-w-[480px]"
          >
            <AlertDialogHeader className="text-start">
              <div
                className={cn(
                  "mb-2 flex h-11 w-11 items-center justify-center rounded-full",
                  statusConfirmTarget?.status === "active"
                    ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
                )}
              >
                {statusConfirmTarget?.status === "active" ? (
                  <PowerOff className="h-5 w-5" />
                ) : (
                  <Power className="h-5 w-5" />
                )}
              </div>
              <AlertDialogTitle>
                {statusConfirmTarget?.status === "active"
                  ? a.confirmDeactivateTitle
                  : a.confirmActivateTitle}
              </AlertDialogTitle>
              <AlertDialogDescription className="leading-6">
                {statusConfirmTarget?.status === "active"
                  ? a.confirmDeactivateDesc
                  : a.confirmActivateDesc}
                {statusConfirmTarget ? (
                  <span className="mt-3 block rounded-md border bg-muted/30 px-3 py-2 text-foreground">
                    <span className="font-semibold">
                      {statusConfirmTarget.name}
                    </span>
                    {statusConfirmTarget.code ? (
                      <span
                        dir="ltr"
                        lang="en"
                        className="ms-2 font-mono text-xs text-muted-foreground"
                      >
                        {statusConfirmTarget.code}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel
                disabled={Boolean(
                  statusConfirmTarget &&
                    statusChangingId ===
                      `${statusConfirmTarget.kind}-${statusConfirmTarget.id}`,
                )}
              >
                {a.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={
                  !statusConfirmTarget ||
                  statusChangingId ===
                    `${statusConfirmTarget.kind}-${statusConfirmTarget.id}`
                }
                onClick={(event) => {
                  event.preventDefault();
                  if (statusConfirmTarget) {
                    void handleStatusToggle(statusConfirmTarget);
                  }
                }}
                className={cn(
                  statusConfirmTarget?.status === "active"
                    ? "!bg-red-600 !text-white hover:!bg-red-700 focus-visible:!ring-red-600"
                    : "!bg-emerald-600 !text-white hover:!bg-emerald-700 focus-visible:!ring-emerald-600",
                )}
              >
                {statusConfirmTarget &&
                statusChangingId ===
                  `${statusConfirmTarget.kind}-${statusConfirmTarget.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : statusConfirmTarget?.status === "active" ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {statusConfirmTarget?.status === "active"
                  ? a.confirmDeactivateAction
                  : a.confirmActivateAction}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open); }}>
          <DialogContent dir={dir} className="overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-[560px]">
            <div className="h-1.5 bg-slate-950" />
            <DialogHeader className="border-b bg-gradient-to-b from-slate-50 to-white px-5 py-4 text-start">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-black tracking-tight text-slate-950">
                    {dialogTitle}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-xs leading-6 text-slate-500">
                    {dialogMode === "edit" ? a.editDesc : a.createDesc}
                  </DialogDescription>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm">
                  {form.kind === "supplier" ? <Building2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                </span>
              </div>
            </DialogHeader>
            <form id="party-form" className="max-h-[64vh] space-y-4 overflow-y-auto px-5 py-4" onSubmit={handleSubmitParty}>
              <PremiumPanel title={a.basic} icon={form.party_kind === "ORGANIZATION" ? Building2 : Users}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {variant === "parties" && dialogMode === "create" ? (
                    <PremiumField label={a.partyType} icon={Users}>
                      <Select value={form.kind} onValueChange={(value) => updateForm("kind", value)}>
                        <SelectTrigger className={formInputClass()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                          <SelectItem value="customer">{t.customer}</SelectItem>
                          <SelectItem value="supplier">{t.supplier}</SelectItem>
                        </SelectContent>
                      </Select>
                    </PremiumField>
                  ) : null}
                  <PremiumField label={a.partyKind} icon={form.party_kind === "ORGANIZATION" ? Building2 : Users}>
                    <Select
                      value={form.party_kind}
                      onValueChange={(value) => {
                        const nextKind = value as PartyFormValues["party_kind"];
                        setForm((current) => ({
                          ...current,
                          party_kind: nextKind,
                          ...(nextKind === "INDIVIDUAL"
                            ? {
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
                              }
                            : {}),
                        }));
                      }}
                    >
                      <SelectTrigger className={formInputClass()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                        <SelectItem value="INDIVIDUAL">{a.individual}</SelectItem>
                        <SelectItem value="ORGANIZATION">{a.organization}</SelectItem>
                      </SelectContent>
                    </Select>
                  </PremiumField>
                  <PremiumField label={a.displayName} icon={Store} className="sm:col-span-2">
                    <Input
                      value={form.display_name}
                      onChange={(event) => updateForm("display_name", event.target.value)}
                      required
                      className={formInputClass()}
                    />
                  </PremiumField>
                  <PremiumField label={a.mobile} icon={Phone}>
                    <Input
                      value={form.mobile}
                      onChange={(event) => updateForm("mobile", event.target.value)}
                      className={formInputClass("tabular-nums")}
                    />
                  </PremiumField>
                  <PremiumField label={a.email} icon={Mail}>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateForm("email", event.target.value)}
                      className={formInputClass()}
                    />
                  </PremiumField>
                  {form.party_kind === "ORGANIZATION" ? (
                    <>
                      <PremiumField label={a.vat} icon={BadgeCheck}>
                        <Input
                          value={form.vat_number}
                          onChange={(event) => updateForm("vat_number", event.target.value)}
                          className={formInputClass("tabular-nums")}
                        />
                      </PremiumField>
                      <PremiumField label={a.commercialRegistration} icon={Hash}>
                        <Input
                          value={form.commercial_registration}
                          onChange={(event) => updateForm("commercial_registration", event.target.value)}
                          className={formInputClass("tabular-nums")}
                        />
                      </PremiumField>
                    </>
                  ) : null}
                  <PremiumField label={t.limit} icon={CircleDollarSign}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={form.credit_limit}
                      onChange={(event) => updateForm("credit_limit", event.target.value)}
                      className={formInputClass("tabular-nums")}
                    />
                  </PremiumField>
                  <PremiumField label={a.openingBalance} icon={Landmark}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={form.opening_balance}
                      onChange={(event) => updateForm("opening_balance", event.target.value)}
                      className={formInputClass("tabular-nums")}
                    />
                  </PremiumField>
                </div>
              </PremiumPanel>
              {form.party_kind === "ORGANIZATION" ? (
                <PremiumPanel title={n.title} icon={MapPin}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PremiumField label={n.city}>
                      <Input value={form.city} onChange={(event) => updateForm("city", event.target.value)} className={formInputClass()} />
                    </PremiumField>
                    <PremiumField label={n.district}>
                      <Input value={form.district} onChange={(event) => updateForm("district", event.target.value)} className={formInputClass()} />
                    </PremiumField>
                    <PremiumField label={n.street}>
                      <Input value={form.street} onChange={(event) => updateForm("street", event.target.value)} className={formInputClass()} />
                    </PremiumField>
                    <PremiumField label={n.buildingNumber}>
                      <Input value={form.building_number} onChange={(event) => updateForm("building_number", event.target.value)} className={formInputClass("tabular-nums")} />
                    </PremiumField>
                    <PremiumField label={n.additionalNumber}>
                      <Input value={form.additional_number} onChange={(event) => updateForm("additional_number", event.target.value)} className={formInputClass("tabular-nums")} />
                    </PremiumField>
                    <PremiumField label={n.postalCode}>
                      <Input value={form.postal_code} onChange={(event) => updateForm("postal_code", event.target.value)} className={formInputClass("tabular-nums")} />
                    </PremiumField>
                    <PremiumField label={n.shortAddress} className="sm:col-span-2">
                      <Input value={form.short_address} onChange={(event) => updateForm("short_address", event.target.value)} className={formInputClass()} />
                    </PremiumField>
                  </div>
                </PremiumPanel>
              ) : null}
            </form>
            <DialogFooter className="gap-2 border-t bg-white px-5 py-4 sm:justify-start">
              <Button type="submit" form="party-form" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? a.saving : a.save}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                {a.cancel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
