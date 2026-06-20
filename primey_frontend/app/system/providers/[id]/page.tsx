"use client";

/* ============================================================
   📂 primey_frontend/app/system/providers/[id]/page.tsx
   🏥 Primey Care — Provider Details
   ------------------------------------------------------------
   ✅ Same approved Customers / Agents / Providers detail pattern
   ✅ Side profile card + main details workspace
   ✅ Real API only: GET/PATCH/DELETE /api/providers/{id}/
   ✅ Upload API: POST /api/providers/{id}/upload/
   ✅ Inline edit without separate edit page
   ✅ Safe disable instead of destructive delete
   ✅ Documents / logo / main image upload
   ✅ Internal UI components only
   ✅ No localhost
   ✅ No fake data
   ✅ SAR icon from /currency/sar.svg
   ✅ Web print
   ✅ Shows Provider.user login_user/profile after backend linking
   ✅ sonner toast
   ✅ RTL/LTR via primey-locale
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  ImageIcon,
  Layers3,
  Loader2,
  MoreHorizontal,
  Pencil,
  Printer,
  RefreshCw,
  Save,
  ShieldCheck,
  ShoppingCart,
  UserCircle2,
  Sparkles,
  TriangleAlert,
  Upload,
  X,
  XCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type LoginUserProfile = {
  id?: number | string | null;
  display_name?: string;
  user_type?: string;
  role?: string;
  phone_number?: string;
  whatsapp_number?: string;
  alternate_email?: string;
  preferred_language?: string;
  timezone?: string;
  extra_data?: Record<string, unknown>;
  tags?: unknown[];
};

type LoginUserRecord = {
  id?: number | string | null;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  last_login?: string | null;
  date_joined?: string | null;
  profile?: LoginUserProfile | null;
};

type ProviderStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DRAFT";
type ProviderType =
  | "HOSPITAL"
  | "MEDICAL_CENTER"
  | "PHARMACY"
  | "LAB"
  | "CLINIC"
  | "PARTNER"
  | "OTHER";

type UploadKind =
  | ""
  | "LOGO"
  | "IMAGE"
  | "OTHER"
  | "COMMERCIAL_REGISTRATION"
  | "TAX_CERTIFICATE"
  | "CONTRACT"
  | "PRODUCT_IMAGE";

type ProviderDocument = {
  id: number;
  file_type: string;
  title: string;
  description: string;
  file_url: string;
  drive_file_id: string;
  drive_folder_id: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  is_primary: boolean;
  created_at: string | null;
  uploaded_by_name: string;
};

type ProviderRecord = {
  id: number;
  name: string;
  name_ar: string;
  name_en: string;
  code: string;
  provider_type: string;
  status: string;
  region: string;
  area: string;
  city: string;
  district: string;
  street: string;
  address: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  source_category: string;
  import_source: string;
  external_reference: string;
  is_featured: boolean;
  commercial_registration: string;
  tax_number: string;
  logo_url: string;
  image_url: string;
  logo_drive_file_id: string;
  image_drive_file_id: string;
  drive_folder_id: string;
  drive_folder_url: string;
  active_contracts_count: number;
  contracted_products_count: number;
  highest_discount_percent: number;
  orders_count: number;
  total_orders: number;
  has_active_contract: boolean;

  user_id?: number | string | null;
  has_login_user?: boolean;
  login_user?: LoginUserRecord | null;

  notes: string;
  created_at: string | null;
  updated_at: string | null;
  documents: ProviderDocument[];
};

type FormState = {
  name: string;
  name_ar: string;
  name_en: string;
  code: string;
  provider_type: ProviderType;
  status: ProviderStatus;
  region: string;
  area: string;
  city: string;
  district: string;
  street: string;
  address: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  source_category: string;
  import_source: string;
  external_reference: string;
  is_featured: boolean;
  commercial_registration: string;
  tax_number: string;
  notes: string;
};

type ProviderApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  provider?: unknown;
};

const SAR_ICON = "/currency/sar.svg";

const translations = {
  ar: {
    title: "تفاصيل مقدم الخدمة",
    subtitle: "ملف مقدم الخدمة، البيانات النظامية، الشبكة الطبية، المرفقات، والطلبات.",
    back: "رجوع",
    refresh: "تحديث",
    print: "طباعة",
    actions: "الإجراءات",
    edit: "تعديل البيانات",
    save: "حفظ التعديلات",
    cancelEdit: "إلغاء التعديل",
    disable: "تعطيل مقدم الخدمة",
    copyName: "نسخ الاسم",
    copyCode: "نسخ الكود",
    copied: "تم النسخ",
    overview: "نظرة عامة",
    legal: "البيانات النظامية",
    network: "الشبكة الطبية",
    documents: "المرفقات",
    editTab: "تعديل البيانات",
    activity: "السجل",
    providerInfo: "بيانات مقدم الخدمة",
    contactInfo: "بيانات التواصل",
    accountInfo: "حساب الدخول",
    accountStatus: "حالة الحساب",
    linked: "مرتبط",
    missing: "بدون حساب",
    loginUsername: "اسم المستخدم",
    loginEmail: "بريد الحساب",
    loginDisplayName: "اسم العرض",
    loginUserId: "معرّف الحساب",
    loginRole: "الدور",
    loginUserType: "نوع المستخدم",
    loginWorkspace: "المساحة",
    loginPhone: "جوال الحساب",
    loginWhatsapp: "واتساب الحساب",
    accountActive: "الحساب نشط",
    providerWorkspace: "مساحة مقدم الخدمة",
    addressInfo: "العنوان والموقع",
    legalInfo: "البيانات النظامية",
    mediaInfo: "الشعار والصورة",
    networkInfo: "بيانات الشبكة",
    notes: "الملاحظات",
    noNotes: "لا توجد ملاحظات.",
    name: "الاسم",
    nameAr: "الاسم العربي",
    nameEn: "الاسم الإنجليزي",
    code: "الكود",
    type: "التصنيف",
    status: "الحالة",
    region: "المنطقة",
    area: "النطاق",
    city: "المدينة",
    district: "الحي",
    street: "الشارع",
    address: "العنوان",
    phone: "الهاتف",
    mobile: "الجوال",
    email: "البريد",
    website: "الموقع الإلكتروني",
    source: "المصدر",
    sourceCategory: "تصنيف المصدر",
    importSource: "مصدر الاستيراد",
    externalReference: "المرجع الخارجي",
    featured: "مميز",
    commercialRegistration: "السجل التجاري",
    taxNumber: "الرقم الضريبي",
    logo: "الشعار",
    image: "صورة مقدم الخدمة",
    driveFolder: "مجلد Google Drive",
    orders: "الطلبات",
    contracts: "العقود النشطة",
    products: "المنتجات المتعاقدة",
    highestDiscount: "أعلى خصم",
    activeContract: "تعاقد نشط",
    uploadLogo: "رفع الشعار",
    uploadImage: "رفع الصورة",
    uploadDocument: "رفع مرفق",
    upload: "رفع",
    fileType: "نوع الملف",
    documentTitle: "عنوان المرفق",
    documentDescription: "وصف المرفق",
    fileName: "اسم الملف",
    size: "الحجم",
    primary: "أساسي",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    draft: "مسودة",
    hospital: "مستشفى",
    medicalCenter: "مركز طبي",
    pharmacy: "صيدلية",
    lab: "مختبر",
    clinic: "عيادة",
    partner: "شريك",
    other: "أخرى",
    yes: "نعم",
    no: "لا",
    imported: "مستوردة من الشبكة",
    manual: "إدخال يدوي",
    unknown: "غير محدد",
    noDocumentsTitle: "لا توجد مرفقات",
    noDocumentsDesc: "عند رفع ملفات مقدم الخدمة ستظهر هنا.",
    confirmDisable: "هل تريد تعطيل مقدم الخدمة؟ لن يتم حذفه نهائيًا.",
    disabledSuccess: "تم تعطيل مقدم الخدمة بنجاح.",
    saveSuccess: "تم حفظ بيانات مقدم الخدمة.",
    uploadSuccess: "تم رفع الملف بنجاح.",
    operationFailed: "تعذر تنفيذ العملية.",
    errorTitle: "تعذر تحميل تفاصيل مقدم الخدمة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    notFoundTitle: "مقدم الخدمة غير موجود",
    notFoundDesc: "تعذر العثور على مقدم الخدمة المطلوب.",
    tryAgain: "إعادة المحاولة",
    requiredName: "اسم مقدم الخدمة مطلوب.",
    invalidEmail: "صيغة البريد الإلكتروني غير صحيحة.",
    printTitle: "تقرير مقدم الخدمة",
    generatedAt: "تاريخ الطباعة",
  },
  en: {
    title: "Provider Details",
    subtitle: "Provider profile, legal info, medical network, documents, and orders.",
    back: "Back",
    refresh: "Refresh",
    print: "Print",
    actions: "Actions",
    edit: "Edit data",
    save: "Save changes",
    cancelEdit: "Cancel edit",
    disable: "Disable provider",
    copyName: "Copy name",
    copyCode: "Copy code",
    copied: "Copied",
    overview: "Overview",
    legal: "Legal info",
    network: "Medical network",
    documents: "Documents",
    editTab: "Edit data",
    activity: "Activity",
    providerInfo: "Provider info",
    contactInfo: "Contact info",
    accountInfo: "Login Account",
    accountStatus: "Account Status",
    linked: "Linked",
    missing: "No account",
    loginUsername: "Username",
    loginEmail: "Account Email",
    loginDisplayName: "Display Name",
    loginUserId: "User ID",
    loginRole: "Role",
    loginUserType: "User Type",
    loginWorkspace: "Workspace",
    loginPhone: "Account Phone",
    loginWhatsapp: "Account WhatsApp",
    accountActive: "Account Active",
    providerWorkspace: "Provider Workspace",
    addressInfo: "Address & location",
    legalInfo: "Legal info",
    mediaInfo: "Logo & image",
    networkInfo: "Network info",
    notes: "Notes",
    noNotes: "No notes.",
    name: "Name",
    nameAr: "Arabic name",
    nameEn: "English name",
    code: "Code",
    type: "Type",
    status: "Status",
    region: "Region",
    area: "Area",
    city: "City",
    district: "District",
    street: "Street",
    address: "Address",
    phone: "Phone",
    mobile: "Mobile",
    email: "Email",
    website: "Website",
    source: "Source",
    sourceCategory: "Source category",
    importSource: "Import source",
    externalReference: "External reference",
    featured: "Featured",
    commercialRegistration: "Commercial registration",
    taxNumber: "Tax number",
    logo: "Logo",
    image: "Provider image",
    driveFolder: "Google Drive folder",
    orders: "Orders",
    contracts: "Active contracts",
    products: "Contracted products",
    highestDiscount: "Highest discount",
    activeContract: "Active contract",
    uploadLogo: "Upload logo",
    uploadImage: "Upload image",
    uploadDocument: "Upload document",
    upload: "Upload",
    fileType: "File type",
    documentTitle: "Document title",
    documentDescription: "Document description",
    fileName: "File name",
    size: "Size",
    primary: "Primary",
    createdAt: "Created at",
    updatedAt: "Updated at",
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    draft: "Draft",
    hospital: "Hospital",
    medicalCenter: "Medical center",
    pharmacy: "Pharmacy",
    lab: "Lab",
    clinic: "Clinic",
    partner: "Partner",
    other: "Other",
    yes: "Yes",
    no: "No",
    imported: "Imported network",
    manual: "Manual entry",
    unknown: "Unknown",
    noDocumentsTitle: "No documents",
    noDocumentsDesc: "Uploaded provider files will appear here.",
    confirmDisable: "Do you want to disable this provider? It will not be permanently deleted.",
    disabledSuccess: "Provider disabled successfully.",
    saveSuccess: "Provider data saved.",
    uploadSuccess: "File uploaded successfully.",
    operationFailed: "Unable to complete operation.",
    errorTitle: "Unable to load provider details",
    errorDesc: "Make sure the backend is running, then try again.",
    notFoundTitle: "Provider not found",
    notFoundDesc: "The requested provider could not be found.",
    tryAgain: "Try again",
    requiredName: "Provider name is required.",
    invalidEmail: "Email format is invalid.",
    printTitle: "Provider report",
    generatedAt: "Generated at",
  },
} as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function toEnglishDigits(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const cleaned = toEnglishDigits(String(value ?? "")).replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
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

function formatPercent(value: unknown) {
  const parsed = toNumber(value);
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parsed)}%`;
}

function formatFileSize(size: unknown) {
  const bytes = toNumber(size);

  if (!bytes) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatInteger(bytes / 1024)} KB`;

  return `${formatMoney(bytes / 1024 / 1024)} MB`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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

  if (envBase.endsWith("/api")) {
    return envBase.slice(0, -4);
  }

  return envBase;
}

function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}

function pickRecord(...values: unknown[]): ApiRecord {
  for (const value of values) {
    if (isRecord(value)) return value;
  }

  return {};
}

function pickArray<T>(...values: unknown[]): T[] {
  for (const value of values) {
    if (Array.isArray(value)) return value as T[];
  }

  return [];
}

function readString(record: ApiRecord, key: string) {
  const value = record[key];
  if (value === null || value === undefined) return "";

  return String(value);
}

function readBoolean(record: ApiRecord, key: string) {
  return Boolean(record[key]);
}

function readNumber(record: ApiRecord, key: string) {
  return toNumber(record[key]);
}

function normalizeProvider(record: ApiRecord): ProviderRecord {
  const documents = pickArray<ProviderDocument>(
    record.documents,
    asRecord(record.data).documents,
  );

  return {
    id: readNumber(record, "id"),
    name: readString(record, "name"),
    name_ar: readString(record, "name_ar"),
    name_en: readString(record, "name_en"),
    code: readString(record, "code"),
    provider_type: readString(record, "provider_type"),
    status: readString(record, "status"),
    region: readString(record, "region"),
    area: readString(record, "area"),
    city: readString(record, "city"),
    district: readString(record, "district"),
    street: readString(record, "street"),
    address: readString(record, "address"),
    phone: readString(record, "phone"),
    mobile: readString(record, "mobile"),
    email: readString(record, "email"),
    website: readString(record, "website"),
    source_category: readString(record, "source_category"),
    import_source: readString(record, "import_source"),
    external_reference: readString(record, "external_reference"),
    is_featured: readBoolean(record, "is_featured"),
    commercial_registration: readString(record, "commercial_registration"),
    tax_number: readString(record, "tax_number"),
    logo_url: readString(record, "logo_url"),
    image_url: readString(record, "image_url"),
    logo_drive_file_id: readString(record, "logo_drive_file_id"),
    image_drive_file_id: readString(record, "image_drive_file_id"),
    drive_folder_id: readString(record, "drive_folder_id"),
    drive_folder_url: readString(record, "drive_folder_url"),
    active_contracts_count: readNumber(record, "active_contracts_count"),
    contracted_products_count: readNumber(record, "contracted_products_count"),
    highest_discount_percent: readNumber(
      record,
      "highest_discount_percent",
    ),
    orders_count: readNumber(record, "orders_count") || readNumber(record, "total_orders"),
    total_orders: readNumber(record, "total_orders") || readNumber(record, "orders_count"),
    has_active_contract: readBoolean(record, "has_active_contract"),
    user_id: record.user_id as ProviderRecord["user_id"],
    has_login_user: readBoolean(record, "has_login_user"),
    login_user: isRecord(record.login_user) ? (record.login_user as LoginUserRecord) : null,
    notes: readString(record, "notes"),
    created_at: readString(record, "created_at") || null,
    updated_at: readString(record, "updated_at") || null,
    documents,
  };
}

function extractProvider(payload: ProviderApiResponse): ProviderRecord | null {
  const providerRecord = pickRecord(
    payload.provider,
    asRecord(payload.data).provider,
    asRecord(payload.data).item,
    payload.data,
  );

  if (!providerRecord.id) return null;

  return normalizeProvider(providerRecord);
}

function providerToForm(provider: ProviderRecord): FormState {
  return {
    name: provider.name,
    name_ar: provider.name_ar,
    name_en: provider.name_en,
    code: provider.code,
    provider_type: (provider.provider_type || "MEDICAL_CENTER") as ProviderType,
    status: (provider.status || "ACTIVE") as ProviderStatus,
    region: provider.region,
    area: provider.area,
    city: provider.city,
    district: provider.district,
    street: provider.street,
    address: provider.address,
    phone: provider.phone,
    mobile: provider.mobile,
    email: provider.email,
    website: provider.website,
    source_category: provider.source_category,
    import_source: provider.import_source,
    external_reference: provider.external_reference,
    is_featured: provider.is_featured,
    commercial_registration: provider.commercial_registration,
    tax_number: provider.tax_number,
    notes: provider.notes,
  };
}

function formToPayload(form: FormState) {
  return {
    name: form.name.trim(),
    name_ar: form.name_ar.trim(),
    name_en: form.name_en.trim(),
    code: form.code.trim(),
    provider_type: form.provider_type,
    status: form.status,
    region: form.region.trim(),
    area: form.area.trim(),
    city: form.city.trim(),
    district: form.district.trim(),
    street: form.street.trim(),
    address: form.address.trim(),
    phone: form.phone.trim(),
    mobile: form.mobile.trim(),
    email: form.email.trim(),
    website: form.website.trim(),
    source_category: form.source_category.trim(),
    import_source: form.import_source.trim(),
    external_reference: form.external_reference.trim(),
    is_featured: form.is_featured,
    commercial_registration: form.commercial_registration.trim(),
    tax_number: form.tax_number.trim(),
    notes: form.notes.trim(),
  };
}

async function fetchProviderJson<T>(
  url: string,
  options?: {
    method?: "GET" | "PATCH" | "DELETE";
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
      ...(options?.method === "PATCH" ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method === "PATCH"
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
      payload?.errors ||
      `Request failed with status ${response.status}`;

    throw new Error(
      typeof message === "string" ? message : JSON.stringify(message),
    );
  }

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

async function uploadProviderFile(
  providerId: number,
  file: File,
  payload: {
    file_type: UploadKind;
    title?: string;
    description?: string;
    is_primary?: boolean;
  },
) {
  const csrfToken = getCookie("csrftoken");
  const formData = new FormData();

  formData.append("file", file);
  formData.append("file_type", payload.file_type || "OTHER");
  formData.append("title", payload.title || file.name);
  formData.append("description", payload.description || "");
  formData.append("is_primary", payload.is_primary ? "1" : "0");

  const response = await fetch(makeApiUrl(`/api/providers/${providerId}/upload/`), {
    method: "POST",
    credentials: "include",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: formData,
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let responsePayload: any = null;
  if (rawText && contentType.includes("application/json")) {
    try {
      responsePayload = JSON.parse(rawText);
    } catch {
      responsePayload = null;
    }
  }

  if (!response.ok) {
    const message =
      responsePayload?.message ||
      responsePayload?.detail ||
      responsePayload?.error ||
      `Upload failed with status ${response.status}`;

    throw new Error(message);
  }

  return responsePayload;
}

function getStatusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "ACTIVE") return t.active;
  if (normalized === "INACTIVE") return t.inactive;
  if (normalized === "SUSPENDED") return t.suspended;
  if (normalized === "DRAFT") return t.draft;

  return normalized || t.unknown;
}

function getStatusClass(status: string) {
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "ACTIVE") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (normalized === "SUSPENDED") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (normalized === "INACTIVE" || normalized === "DRAFT") {
    return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function getProviderTypeLabel(type: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(type).toUpperCase();

  if (normalized === "HOSPITAL") return t.hospital;
  if (normalized === "MEDICAL_CENTER") return t.medicalCenter;
  if (normalized === "PHARMACY") return t.pharmacy;
  if (normalized === "LAB") return t.lab;
  if (normalized === "CLINIC") return t.clinic;
  if (normalized === "PARTNER") return t.partner;
  if (normalized === "OTHER") return t.other;

  return normalized || t.unknown;
}

function hasProviderAccount(provider: ProviderRecord | null) {
  return Boolean(provider?.has_login_user || provider?.user_id || provider?.login_user?.id);
}

function getProviderLoginUser(provider: ProviderRecord | null): LoginUserRecord | null {
  if (!provider?.login_user) return null;
  return provider.login_user;
}

function getProviderLoginProfile(provider: ProviderRecord | null): LoginUserProfile | null {
  return getProviderLoginUser(provider)?.profile || null;
}

function getProviderLoginUsername(provider: ProviderRecord | null) {
  return getProviderLoginUser(provider)?.username || "";
}

function getProviderLoginEmail(provider: ProviderRecord | null) {
  return getProviderLoginUser(provider)?.email || provider?.email || "";
}

function getProviderProfileWorkspace(profile: LoginUserProfile | null) {
  const extraData = profile?.extra_data || {};
  const workspaceValue = extraData.workspace;

  return typeof workspaceValue === "string" ? workspaceValue : "";
}

function MoneyValue({ value }: { value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums text-foreground">
      <span>{formatMoney(value)}</span>
      <img src={SAR_ICON} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
    </span>
  );
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full rounded-full px-2.5 py-1 text-xs font-medium",
        getStatusClass(status),
      )}
    >
      <span className="truncate">{getStatusLabel(status, locale)}</span>
    </Badge>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-left text-sm font-medium text-foreground">
        {children || value || "—"}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[104px] px-6 py-5">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>

        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground">
          {value}
        </CardTitle>

        <CardAction>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-foreground">{children}</label>;
}

function EmptyBlock({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ProviderDetailSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-80 rounded-lg" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-4 px-6 py-5">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <Skeleton className="h-6 w-56 rounded-lg" />
            <Skeleton className="h-4 w-40 rounded-lg" />
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-6">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[104px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-[520px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function ProviderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();

  const providerId = React.useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const parsed = Number(raw);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [params]);

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [provider, setProvider] = React.useState<ProviderRecord | null>(null);
  const [form, setForm] = React.useState<FormState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [error, setError] = React.useState("");
  const [documentType, setDocumentType] = React.useState<UploadKind>("OTHER");
  const [documentTitle, setDocumentTitle] = React.useState("");
  const [documentDescription, setDocumentDescription] = React.useState("");

  const logoInputRef = React.useRef<HTMLInputElement | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const documentInputRef = React.useRef<HTMLInputElement | null>(null);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const loadProvider = React.useCallback(
    async (options?: { silent?: boolean; signal?: AbortSignal }) => {
      if (!providerId) {
        setError(t.notFoundDesc);
        setLoading(false);
        return;
      }

      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const payload = await fetchProviderJson<ProviderApiResponse>(
          makeApiUrl(`/api/providers/${providerId}/`),
          {
            method: "GET",
            signal: options?.signal,
          },
        );

        const nextProvider = extractProvider(payload);
        if (!nextProvider) {
          throw new Error(t.notFoundDesc);
        }

        setProvider(nextProvider);
        setForm(providerToForm(nextProvider));

        if (options?.silent) {
          toast.success(t.saveSuccess);
        }
      } catch (caughtError) {
        if (options?.signal?.aborted) return;

        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.operationFailed;

        setError(message);
      } finally {
        if (!options?.signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [providerId, t.notFoundDesc, t.operationFailed, t.saveSuccess],
  );

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
    const controller = new AbortController();

    void loadProvider({ signal: controller.signal });

    return () => controller.abort();
  }, [loadProvider]);

  function updateForm<T extends keyof FormState>(key: T, value: FormState[T]) {
    setForm((current) => {
      if (!current) return current;
      return { ...current, [key]: value };
    });
  }

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.error(t.operationFailed);
    }
  }

  async function saveProvider() {
    if (!provider || !form) return;

    if (!form.name.trim() && !form.name_ar.trim() && !form.name_en.trim()) {
      toast.error(t.requiredName);
      return;
    }

    if (!isValidEmail(form.email)) {
      toast.error(t.invalidEmail);
      return;
    }

    setSaving(true);

    try {
      const payload = await fetchProviderJson<ProviderApiResponse>(
        makeApiUrl(`/api/providers/${provider.id}/`),
        {
          method: "PATCH",
          body: formToPayload(form),
        },
      );

      const updatedProvider = extractProvider(payload);
      if (!updatedProvider) {
        throw new Error(t.operationFailed);
      }

      setProvider(updatedProvider);
      setForm(providerToForm(updatedProvider));
      setEditMode(false);
      toast.success(t.saveSuccess);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function disableProvider() {
    if (!provider) return;

    if (!window.confirm(t.confirmDisable)) return;

    setSaving(true);

    try {
      const payload = await fetchProviderJson<ProviderApiResponse>(
        makeApiUrl(`/api/providers/${provider.id}/`),
        {
          method: "DELETE",
        },
      );

      const updatedProvider = extractProvider(payload);
      if (updatedProvider) {
        setProvider(updatedProvider);
        setForm(providerToForm(updatedProvider));
      }

      toast.success(t.disabledSuccess);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(fileType: UploadKind, file?: File | null) {
    if (!provider || !file) return;

    setUploading(true);

    try {
      await uploadProviderFile(provider.id, file, {
        file_type: fileType || "OTHER",
        title: documentTitle || file.name,
        description: documentDescription,
        is_primary: fileType === "LOGO" || fileType === "IMAGE",
      });

      toast.success(t.uploadSuccess);
      setDocumentTitle("");
      setDocumentDescription("");
      setDocumentType("OTHER");
      await loadProvider({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;
      toast.error(message);
    } finally {
      setUploading(false);

      if (logoInputRef.current) logoInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  }

  function printPage() {
    if (!provider) return;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return;

    const displayName = provider.name_ar || provider.name || provider.name_en;
    const generatedAt = new Date().toLocaleString("en-US");

    printWindow.document.write(`
      <!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${t.printTitle}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #111827;
              padding: 32px;
              direction: ${dir};
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            h1 { margin: 0; font-size: 26px; }
            p { margin: 4px 0; }
            .muted { color: #6b7280; font-size: 13px; }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14px;
              margin-top: 16px;
            }
            .box {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 14px;
              page-break-inside: avoid;
            }
            .label { color: #6b7280; font-size: 12px; }
            .value { font-weight: 700; margin-top: 4px; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 9px;
              font-size: 12px;
              text-align: ${locale === "ar" ? "right" : "left"};
            }
            th { background: #f9fafb; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>${displayName}</h1>
              <p class="muted">${provider.code || provider.external_reference || ""}</p>
            </div>
            <div>
              <p class="muted">${t.generatedAt}</p>
              <p>${generatedAt}</p>
            </div>
          </div>

          <div class="grid">
            <div class="box"><div class="label">${t.status}</div><div class="value">${getStatusLabel(provider.status, locale)}</div></div>
            <div class="box"><div class="label">${t.type}</div><div class="value">${getProviderTypeLabel(provider.provider_type, locale)}</div></div>
            <div class="box"><div class="label">${t.phone}</div><div class="value">${provider.phone || "-"}</div></div>
            <div class="box"><div class="label">${t.mobile}</div><div class="value">${provider.mobile || "-"}</div></div>
            <div class="box"><div class="label">${t.email}</div><div class="value">${provider.email || "-"}</div></div>
            <div class="box"><div class="label">${t.city}</div><div class="value">${provider.city || "-"}</div></div>
            <div class="box"><div class="label">${t.accountStatus}</div><div class="value">${hasProviderAccount(provider) ? t.linked : t.missing}</div></div>
            <div class="box"><div class="label">${t.loginUsername}</div><div class="value">${getProviderLoginUsername(provider) || "-"}</div></div>
            <div class="box"><div class="label">${t.commercialRegistration}</div><div class="value">${provider.commercial_registration || "-"}</div></div>
            <div class="box"><div class="label">${t.taxNumber}</div><div class="value">${provider.tax_number || "-"}</div></div>
            <div class="box"><div class="label">${t.orders}</div><div class="value">${formatInteger(provider.orders_count)}</div></div>
            <div class="box"><div class="label">${t.contracts}</div><div class="value">${formatInteger(provider.active_contracts_count)}</div></div>
          </div>

          <h2>${t.documents}</h2>
          <table>
            <thead>
              <tr>
                <th>${t.fileType}</th>
                <th>${t.documentTitle}</th>
                <th>${t.fileName}</th>
                <th>${t.createdAt}</th>
              </tr>
            </thead>
            <tbody>
              ${
                provider.documents.length
                  ? provider.documents
                      .map(
                        (document) => `
                          <tr>
                            <td>${document.file_type || "-"}</td>
                            <td>${document.title || "-"}</td>
                            <td>${document.original_filename || "-"}</td>
                            <td>${formatDate(document.created_at)}</td>
                          </tr>
                        `,
                      )
                      .join("")
                  : `<tr><td colspan="4">${t.noDocumentsTitle}</td></tr>`
              }
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  if (loading) {
    return (
      <div className="w-full" dir={dir}>
        <ProviderDetailSkeleton />
      </div>
    );
  }

  if (error || !provider || !form) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 text-right">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <Button variant="outline" className="h-9 rounded-lg" onClick={() => router.back()}>
            <BackIcon className="h-4 w-4" />
            {t.back}
          </Button>
        </div>

        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-red-200 bg-white">
              <TriangleAlert className="h-6 w-6 text-red-600" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-red-900">
                {error ? t.errorTitle : t.notFoundTitle}
              </p>
              <p className="text-sm text-red-700">{error || t.notFoundDesc}</p>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadProvider()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = provider.name_ar || provider.name || provider.name_en;
  const sourceLabel = provider.import_source ? t.imported : t.manual;
  const loginUser = getProviderLoginUser(provider);
  const loginProfile = getProviderLoginProfile(provider);
  const providerAccountLinked = hasProviderAccount(provider);

  return (
    <div className="w-full space-y-4" dir={dir}>
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleUpload("LOGO", event.target.files?.[0])}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleUpload("IMAGE", event.target.files?.[0])}
      />
      <input
        ref={documentInputRef}
        type="file"
        className="hidden"
        onChange={(event) => void handleUpload(documentType || "OTHER", event.target.files?.[0])}
      />

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
            onClick={() => void loadProvider({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => {
              setEditMode(true);
              setForm(providerToForm(provider));
            }}
          >
            <Pencil className="h-4 w-4" />
            {t.edit}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90">
                <MoreHorizontal className="h-4 w-4" />
                {t.actions}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
              <DropdownMenuItem onClick={() => void copyValue(displayName)}>
                <Copy className="h-4 w-4" />
                {t.copyName}
              </DropdownMenuItem>

              {provider.code ? (
                <DropdownMenuItem onClick={() => void copyValue(provider.code)}>
                  <ShieldCheck className="h-4 w-4" />
                  {t.copyCode}
                </DropdownMenuItem>
              ) : null}

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => logoInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {t.uploadLogo}
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="h-4 w-4" />
                {t.uploadImage}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                disabled={saving || provider.status === "INACTIVE"}
                onClick={() => void disableProvider()}
              >
                <XCircle className="h-4 w-4" />
                {t.disable}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="space-y-4 px-6 py-5">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
              {provider.logo_url ? (
                <img
                  src={provider.logo_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate text-xl font-bold">
                {displayName}
              </CardTitle>
              <CardDescription className="truncate">
                {provider.code || provider.name_en || provider.external_reference || "—"}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={provider.status} locale={locale} />
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  providerAccountLinked
                    ? "border-violet-500/30 bg-violet-50 text-violet-700"
                    : "border-muted bg-muted/40 text-muted-foreground",
                )}
              >
                <UserCircle2 className="me-1 h-3.5 w-3.5" />
                {providerAccountLinked ? t.linked : t.missing}
              </Badge>
              <Badge variant="outline" className="rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium">
                {getProviderTypeLabel(provider.provider_type, locale)}
              </Badge>
              {provider.is_featured ? (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-500/30 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                >
                  {t.featured}
                </Badge>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="space-y-2 px-6 pb-6">
            <InfoRow label={t.orders} value={formatInteger(provider.orders_count)} />
            <InfoRow label={t.contracts} value={formatInteger(provider.active_contracts_count)} />
            <InfoRow label={t.products} value={formatInteger(provider.contracted_products_count)} />
            <InfoRow label={t.highestDiscount} value={formatPercent(provider.highest_discount_percent)} />
            <InfoRow label={t.source} value={sourceLabel} />
            <InfoRow label={t.accountStatus}>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full",
                  providerAccountLinked
                    ? "border-violet-500/30 bg-violet-50 text-violet-700"
                    : "border-muted bg-muted/40 text-muted-foreground",
                )}
              >
                {providerAccountLinked ? t.linked : t.missing}
              </Badge>
            </InfoRow>
            <InfoRow label={t.createdAt} value={formatDate(provider.created_at)} />

            <div className="grid gap-2 pt-3">
              <Button asChild variant="outline" className="h-9 rounded-lg">
                <Link href={`/system/orders?provider_id=${provider.id}`}>
                  <ShoppingCart className="h-4 w-4" />
                  {t.orders}
                </Link>
              </Button>

              <Button
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4" />
                {t.uploadLogo}
              </Button>

              <Button
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
              >
                <ImageIcon className="h-4 w-4" />
                {t.uploadImage}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title={t.orders}
              value={formatInteger(provider.orders_count)}
              icon={ShoppingCart}
            />
            <MetricCard
              title={t.contracts}
              value={formatInteger(provider.active_contracts_count)}
              icon={FileText}
            />
            <MetricCard
              title={t.products}
              value={formatInteger(provider.contracted_products_count)}
              icon={Layers3}
            />
            <MetricCard
              title={t.highestDiscount}
              value={formatPercent(provider.highest_discount_percent)}
              icon={Sparkles}
            />
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <Card className="rounded-lg border bg-card shadow-none">
              <CardContent className="p-4">
                <TabsList className="h-auto flex-wrap justify-start rounded-lg bg-muted/40 p-1">
                  <TabsTrigger value="overview" className="rounded-md">
                    <Eye className="h-4 w-4" />
                    {t.overview}
                  </TabsTrigger>
                  <TabsTrigger value="legal" className="rounded-md">
                    <ShieldCheck className="h-4 w-4" />
                    {t.legal}
                  </TabsTrigger>
                  <TabsTrigger value="network" className="rounded-md">
                    <Layers3 className="h-4 w-4" />
                    {t.network}
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="rounded-md">
                    <FileText className="h-4 w-4" />
                    {t.documents}
                  </TabsTrigger>
                  <TabsTrigger value="edit" className="rounded-md">
                    <Pencil className="h-4 w-4" />
                    {t.editTab}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="rounded-md">
                    <CalendarDays className="h-4 w-4" />
                    {t.activity}
                  </TabsTrigger>
                </TabsList>
              </CardContent>
            </Card>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.providerInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.name} value={provider.name || "—"} />
                    <InfoRow label={t.nameAr} value={provider.name_ar || "—"} />
                    <InfoRow label={t.nameEn} value={provider.name_en || "—"} />
                    <InfoRow label={t.code} value={provider.code || "—"} />
                    <InfoRow label={t.type} value={getProviderTypeLabel(provider.provider_type, locale)} />
                    <InfoRow label={t.status}>
                      <StatusBadge status={provider.status} locale={locale} />
                    </InfoRow>
                    <InfoRow label={t.featured} value={provider.is_featured ? t.yes : t.no} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.contactInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.phone} value={provider.phone || "—"} />
                    <InfoRow label={t.mobile} value={provider.mobile || "—"} />
                    <InfoRow label={t.email} value={provider.email || "—"} />
                    <InfoRow label={t.website}>
                      {provider.website ? (
                        <a href={provider.website} target="_blank" rel="noreferrer" className="truncate text-sm hover:underline">
                          {provider.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </InfoRow>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.accountInfo}</CardTitle>
                    <CardDescription>
                      {getProviderLoginUsername(provider) || provider.user_id || "—"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.accountStatus}>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full",
                          providerAccountLinked
                            ? "border-violet-500/30 bg-violet-50 text-violet-700"
                            : "border-muted bg-muted/40 text-muted-foreground",
                        )}
                      >
                        <UserCircle2 className="me-1 h-3.5 w-3.5" />
                        {providerAccountLinked ? t.linked : t.missing}
                      </Badge>
                    </InfoRow>
                    <InfoRow label={t.loginUsername} value={getProviderLoginUsername(provider) || "—"} />
                    <InfoRow label={t.loginEmail} value={getProviderLoginEmail(provider) || "—"} />
                    <InfoRow
                      label={t.loginDisplayName}
                      value={loginUser?.full_name || loginProfile?.display_name || "—"}
                    />
                    <InfoRow label={t.loginUserId} value={String(loginUser?.id || provider.user_id || "—")} />
                    <InfoRow label={t.accountActive}>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full",
                          loginUser?.is_active
                            ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                            : "border-muted bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {loginUser?.is_active ? t.active : t.inactive}
                      </Badge>
                    </InfoRow>
                    <InfoRow label={t.loginUserType} value={loginProfile?.user_type || "—"} />
                    <InfoRow label={t.loginRole} value={loginProfile?.role || "—"} />
                    <InfoRow
                      label={t.loginWorkspace}
                      value={getProviderProfileWorkspace(loginProfile) || t.providerWorkspace}
                    />
                    <InfoRow label={t.loginPhone} value={loginProfile?.phone_number || "—"} />
                    <InfoRow label={t.loginWhatsapp} value={loginProfile?.whatsapp_number || "—"} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.addressInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.region} value={provider.region || "—"} />
                    <InfoRow label={t.area} value={provider.area || "—"} />
                    <InfoRow label={t.city} value={provider.city || "—"} />
                    <InfoRow label={t.district} value={provider.district || "—"} />
                    <InfoRow label={t.street} value={provider.street || "—"} />
                    <InfoRow label={t.address} value={provider.address || "—"} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.notes}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <div className="min-h-[236px] rounded-lg border bg-background p-4">
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {provider.notes || t.noNotes}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="legal" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.legalInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <InfoRow label={t.commercialRegistration} value={provider.commercial_registration || "—"} />
                    <InfoRow label={t.taxNumber} value={provider.tax_number || "—"} />
                    <InfoRow label={t.sourceCategory} value={provider.source_category || "—"} />
                    <InfoRow label={t.importSource} value={provider.import_source || "—"} />
                    <InfoRow label={t.externalReference} value={provider.external_reference || "—"} />
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.mediaInfo}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-2">
                    <div className="space-y-3 rounded-lg border bg-background p-4">
                      <div className="relative h-40 overflow-hidden rounded-lg border bg-muted/40">
                        {provider.logo_url ? (
                          <img
                            src={provider.logo_url}
                            alt={t.logo}
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.logo}</p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {provider.logo_drive_file_id || provider.logo_url || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border bg-background p-4">
                      <div className="relative h-40 overflow-hidden rounded-lg border bg-muted/40">
                        {provider.image_url ? (
                          <img
                            src={provider.image_url}
                            alt={t.image}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.image}</p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {provider.image_drive_file_id || provider.image_url || "—"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-lg border bg-card shadow-none xl:col-span-2">
                  <CardHeader className="px-5 py-4">
                    <CardTitle className="text-base">{t.driveFolder}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <div className="rounded-lg border bg-background p-4">
                      <p className="text-sm font-medium">{provider.drive_folder_id || "—"}</p>
                      {provider.drive_folder_url ? (
                        <a
                          href={provider.drive_folder_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex break-all text-sm text-primary hover:underline"
                        >
                          {provider.drive_folder_url}
                        </a>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="network" className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title={t.activeContract}
                  value={provider.has_active_contract ? t.yes : t.no}
                  icon={CheckCircle2}
                />
                <MetricCard
                  title={t.contracts}
                  value={formatInteger(provider.active_contracts_count)}
                  icon={FileText}
                />
                <MetricCard
                  title={t.products}
                  value={formatInteger(provider.contracted_products_count)}
                  icon={Layers3}
                />
                <MetricCard
                  title={t.orders}
                  value={formatInteger(provider.orders_count)}
                  icon={ShoppingCart}
                />
              </div>

              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-base">{t.networkInfo}</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoRow label={t.highestDiscount} value={formatPercent(provider.highest_discount_percent)} />
                    <InfoRow label={t.source} value={sourceLabel} />
                    <InfoRow label={t.sourceCategory} value={provider.source_category || "—"} />
                    <InfoRow label={t.externalReference} value={provider.external_reference || "—"} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-base">{t.uploadDocument}</CardTitle>
                  <CardAction>
                    <Button
                      className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
                      disabled={uploading}
                      onClick={() => documentInputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {t.upload}
                    </Button>
                  </CardAction>
                </CardHeader>

                <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-3">
                  <div className="space-y-2">
                    <FieldLabel>{t.fileType}</FieldLabel>
                    <Select value={documentType} onValueChange={(value) => setDocumentType(value as UploadKind)}>
                      <SelectTrigger className="h-10 rounded-lg bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OTHER">{t.other}</SelectItem>
                        <SelectItem value="COMMERCIAL_REGISTRATION">{t.commercialRegistration}</SelectItem>
                        <SelectItem value="TAX_CERTIFICATE">{t.taxNumber}</SelectItem>
                        <SelectItem value="CONTRACT">{t.contracts}</SelectItem>
                        <SelectItem value="PRODUCT_IMAGE">{t.image}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.documentTitle}</FieldLabel>
                    <Input
                      value={documentTitle}
                      onChange={(event) => setDocumentTitle(event.target.value)}
                      className="h-10 rounded-lg bg-background"
                      placeholder={t.documentTitle}
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.documentDescription}</FieldLabel>
                    <Input
                      value={documentDescription}
                      onChange={(event) => setDocumentDescription(event.target.value)}
                      className="h-10 rounded-lg bg-background"
                      placeholder={t.documentDescription}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-lg border bg-card shadow-none">
                <CardContent className="p-0">
                  {provider.documents.length ? (
                    <div className="overflow-hidden rounded-lg border-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead>{t.fileType}</TableHead>
                            <TableHead>{t.documentTitle}</TableHead>
                            <TableHead>{t.fileName}</TableHead>
                            <TableHead>{t.size}</TableHead>
                            <TableHead>{t.createdAt}</TableHead>
                            <TableHead className="w-[80px] text-center">{t.actions}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {provider.documents.map((document) => (
                            <TableRow key={document.id}>
                              <TableCell>
                                <Badge variant="outline" className="rounded-full bg-muted/40">
                                  {document.file_type || t.other}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{document.title || "—"}</TableCell>
                              <TableCell className="max-w-[220px] truncate">
                                {document.original_filename || "—"}
                              </TableCell>
                              <TableCell>{formatFileSize(document.size_bytes)}</TableCell>
                              <TableCell>{formatDate(document.created_at)}</TableCell>
                              <TableCell className="text-center">
                                {document.file_url ? (
                                  <Button
                                    asChild
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                  >
                                    <a href={document.file_url} target="_blank" rel="noreferrer">
                                      <Eye className="h-4 w-4" />
                                    </a>
                                  </Button>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <EmptyBlock
                      icon={FileText}
                      title={t.noDocumentsTitle}
                      description={t.noDocumentsDesc}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="edit" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-base">{t.editTab}</CardTitle>
                  <CardAction>
                    <div className="flex items-center gap-2">
                      {editMode ? (
                        <>
                          <Button
                            variant="outline"
                            className="h-9 rounded-lg"
                            onClick={() => {
                              setForm(providerToForm(provider));
                              setEditMode(false);
                            }}
                          >
                            <X className="h-4 w-4" />
                            {t.cancelEdit}
                          </Button>

                          <Button
                            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
                            disabled={saving}
                            onClick={() => void saveProvider()}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {t.save}
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
                          onClick={() => setEditMode(true)}
                        >
                          <Pencil className="h-4 w-4" />
                          {t.edit}
                        </Button>
                      )}
                    </div>
                  </CardAction>
                </CardHeader>

                <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2 md:col-span-2">
                    <FieldLabel>{t.name}</FieldLabel>
                    <Input
                      value={form.name}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("name", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.nameAr}</FieldLabel>
                    <Input
                      value={form.name_ar}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("name_ar", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.nameEn}</FieldLabel>
                    <Input
                      value={form.name_en}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("name_en", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.code}</FieldLabel>
                    <Input
                      value={form.code}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("code", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.type}</FieldLabel>
                    <Select
                      value={form.provider_type}
                      disabled={!editMode || saving}
                      onValueChange={(value) => updateForm("provider_type", value as ProviderType)}
                    >
                      <SelectTrigger className="h-10 rounded-lg bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOSPITAL">{t.hospital}</SelectItem>
                        <SelectItem value="MEDICAL_CENTER">{t.medicalCenter}</SelectItem>
                        <SelectItem value="PHARMACY">{t.pharmacy}</SelectItem>
                        <SelectItem value="LAB">{t.lab}</SelectItem>
                        <SelectItem value="CLINIC">{t.clinic}</SelectItem>
                        <SelectItem value="PARTNER">{t.partner}</SelectItem>
                        <SelectItem value="OTHER">{t.other}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.status}</FieldLabel>
                    <Select
                      value={form.status}
                      disabled={!editMode || saving}
                      onValueChange={(value) => updateForm("status", value as ProviderStatus)}
                    >
                      <SelectTrigger className="h-10 rounded-lg bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">{t.active}</SelectItem>
                        <SelectItem value="INACTIVE">{t.inactive}</SelectItem>
                        <SelectItem value="SUSPENDED">{t.suspended}</SelectItem>
                        <SelectItem value="DRAFT">{t.draft}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.phone}</FieldLabel>
                    <Input
                      value={form.phone}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("phone", toEnglishDigits(event.target.value))}
                      className="h-10 rounded-lg bg-background"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.mobile}</FieldLabel>
                    <Input
                      value={form.mobile}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("mobile", toEnglishDigits(event.target.value))}
                      className="h-10 rounded-lg bg-background"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.email}</FieldLabel>
                    <Input
                      value={form.email}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("email", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.website}</FieldLabel>
                    <Input
                      value={form.website}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("website", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.region}</FieldLabel>
                    <Input
                      value={form.region}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("region", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.area}</FieldLabel>
                    <Input
                      value={form.area}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("area", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.city}</FieldLabel>
                    <Input
                      value={form.city}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("city", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.district}</FieldLabel>
                    <Input
                      value={form.district}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("district", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.street}</FieldLabel>
                    <Input
                      value={form.street}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("street", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <FieldLabel>{t.address}</FieldLabel>
                    <Input
                      value={form.address}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("address", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.commercialRegistration}</FieldLabel>
                    <Input
                      value={form.commercial_registration}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("commercial_registration", toEnglishDigits(event.target.value))}
                      className="h-10 rounded-lg bg-background"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.taxNumber}</FieldLabel>
                    <Input
                      value={form.tax_number}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("tax_number", toEnglishDigits(event.target.value))}
                      className="h-10 rounded-lg bg-background"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.sourceCategory}</FieldLabel>
                    <Input
                      value={form.source_category}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("source_category", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel>{t.externalReference}</FieldLabel>
                    <Input
                      value={form.external_reference}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("external_reference", event.target.value)}
                      className="h-10 rounded-lg bg-background"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2 xl:col-span-4">
                    <FieldLabel>{t.notes}</FieldLabel>
                    <textarea
                      value={form.notes}
                      disabled={!editMode || saving}
                      onChange={(event) => updateForm("notes", event.target.value)}
                      className="min-h-[130px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card className="rounded-lg border bg-card shadow-none">
                <CardContent className="p-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoRow label={t.createdAt} value={formatDate(provider.created_at)} />
                    <InfoRow label={t.updatedAt} value={formatDate(provider.updated_at)} />
                    <InfoRow label={t.source} value={sourceLabel} />
                    <InfoRow label={t.importSource} value={provider.import_source || "—"} />
                    <InfoRow label={t.externalReference} value={provider.external_reference || "—"} />
                    <InfoRow label={t.driveFolder} value={provider.drive_folder_id || "—"} />
                    <InfoRow label={t.accountStatus}>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full",
                          providerAccountLinked
                            ? "border-violet-500/30 bg-violet-50 text-violet-700"
                            : "border-muted bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {providerAccountLinked ? t.linked : t.missing}
                      </Badge>
                    </InfoRow>
                    <InfoRow label={t.loginUsername} value={getProviderLoginUsername(provider) || "—"} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}