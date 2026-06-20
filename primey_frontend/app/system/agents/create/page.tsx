"use client";

/* ============================================================
   📂 primey_frontend/app/system/agents/create/page.tsx
   👤 Primey Care — Create Agent V6 Login-User Ready
   ------------------------------------------------------------
   ✅ Approved Premium form pattern
   ✅ Real API only
   ✅ POST /api/agents/create/
   ✅ Broker searchable selector from /api/agents/brokers/
   ✅ Supports broker_id
   ✅ Supports broker_id from URL query:
      /system/agents/create?broker_id=1
   ✅ Supports default_delivery_fee
   ✅ Supports multiple financial_rules
   ✅ Model-accurate rule payload:
      rule_name / calculation_type / value
   ✅ Keeps aliases for compatibility:
      name / commission_type / commission_value
   ✅ Creates optional login user for agent:
      create_login_user / login_username / login_email / login_password
      login_display_name / login_phone / login_whatsapp
   ✅ Rule types:
      SALES_COMMISSION / DELIVERY_FEE / BROKER_SHARE
   ✅ Rule scopes:
      GLOBAL / PRODUCT_TYPE / PRODUCT / PROVIDER / CONTRACT / CONTRACT_PRODUCT / ORDER_KIND
   ✅ Calculation:
      PERCENTAGE / FIXED
   ✅ Main form + side readiness summary
   ✅ Local draft protection
   ✅ sonner toast
   ✅ SAR icon from /currency/sar.svg
   ✅ RTL/LTR via primey-locale
   ✅ No localhost / no fake data
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Banknote,
  CheckCircle2,
  ChevronDown,
  FileText,
  KeyRound,
  Landmark,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  Truck,
  UserRound,
  WalletCards,
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
  DropdownMenu,
  DropdownMenuContent,
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

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;

type AgentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DRAFT";
type CommissionType = "PERCENTAGE" | "FIXED";

type RuleType = "SALES_COMMISSION" | "DELIVERY_FEE" | "BROKER_SHARE";

type RuleScope =
  | "GLOBAL"
  | "PRODUCT_TYPE"
  | "PRODUCT"
  | "PROVIDER"
  | "CONTRACT"
  | "CONTRACT_PRODUCT"
  | "ORDER_KIND";

type CalculationBase =
  | "NET_BEFORE_TAX"
  | "GROSS_AMOUNT"
  | "TOTAL_WITH_TAX"
  | "PLATFORM_SHARE"
  | "BROKER_SHARE";

type ProductType =
  | ""
  | "card"
  | "program"
  | "service"
  | "medical_service"
  | "subscription"
  | "product";

type OrderKind =
  | ""
  | "card"
  | "program"
  | "service"
  | "medical_service"
  | "subscription"
  | "product";

type BrokerOption = {
  id: number;
  name: string;
  code: string;
  phone: string;
  email: string;
  status: string;
};

type FinancialRuleForm = {
  local_id: string;
  rule_name: string;
  rule_type: RuleType;
  scope: RuleScope;
  calculation_type: CommissionType;
  value: string;
  calculation_base: CalculationBase;
  priority: string;
  is_active: boolean;

  product_type: ProductType;
  order_kind: OrderKind;
  product_id: string;
  provider_id: string;
  contract_id: string;
  contract_product_id: string;

  min_amount: string;
  max_amount: string;

  valid_from: string;
  valid_until: string;
  notes: string;
};

type FormState = {
  full_name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  status: AgentStatus;

  broker_id: string;
  broker_name: string;

  agent_code: string;
  referral_code: string;

  default_commission_type: CommissionType;
  default_commission_value: string;
  default_delivery_fee: string;

  create_login_user: boolean;
  login_username: string;
  login_email: string;
  login_password: string;
  login_display_name: string;
  login_phone: string;
  login_whatsapp: string;

  bank_name: string;
  bank_account_name: string;
  iban: string;
  notes: string;

  financial_rules: FinancialRuleForm[];
};

type ApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  item?: unknown;
  agent?: unknown;
  id?: number;
};

const SAR_ICON = "/currency/sar.svg";
const DRAFT_KEY = "primey-care.agent-create.v6.login-user.draft";

const RULE_TYPE_OPTIONS: RuleType[] = [
  "SALES_COMMISSION",
  "DELIVERY_FEE",
  "BROKER_SHARE",
];

const RULE_SCOPE_OPTIONS: RuleScope[] = [
  "GLOBAL",
  "PRODUCT_TYPE",
  "ORDER_KIND",
  "PRODUCT",
  "PROVIDER",
  "CONTRACT",
  "CONTRACT_PRODUCT",
];

const CALCULATION_BASE_OPTIONS: CalculationBase[] = [
  "NET_BEFORE_TAX",
  "GROSS_AMOUNT",
  "TOTAL_WITH_TAX",
  "PLATFORM_SHARE",
  "BROKER_SHARE",
];

const PRODUCT_KIND_OPTIONS: Array<Exclude<ProductType, "">> = [
  "card",
  "program",
  "service",
  "medical_service",
  "subscription",
  "product",
];

function makeLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeRule(overrides: Partial<FinancialRuleForm> = {}): FinancialRuleForm {
  return {
    local_id: makeLocalId(),
    rule_name: "",
    rule_type: "SALES_COMMISSION",
    scope: "GLOBAL",
    calculation_type: "PERCENTAGE",
    value: "10",
    calculation_base: "NET_BEFORE_TAX",
    priority: "100",
    is_active: true,

    product_type: "",
    order_kind: "",
    product_id: "",
    provider_id: "",
    contract_id: "",
    contract_product_id: "",

    min_amount: "0",
    max_amount: "",

    valid_from: "",
    valid_until: "",
    notes: "",
    ...overrides,
  };
}

function createInitialForm(): FormState {
  return {
    full_name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    status: "ACTIVE",

    broker_id: "",
    broker_name: "",

    agent_code: "",
    referral_code: "",

    default_commission_type: "PERCENTAGE",
    default_commission_value: "10",
    default_delivery_fee: "15",

    create_login_user: true,
    login_username: "",
    login_email: "",
    login_password: "",
    login_display_name: "",
    login_phone: "",
    login_whatsapp: "",

    bank_name: "",
    bank_account_name: "",
    iban: "",
    notes: "",

    financial_rules: [
      makeRule({
        rule_name: "عمولة بيع افتراضية",
        rule_type: "SALES_COMMISSION",
        scope: "GLOBAL",
        calculation_type: "PERCENTAGE",
        value: "10",
        priority: "100",
      }),
      makeRule({
        rule_name: "عمولة توصيل افتراضية",
        rule_type: "DELIVERY_FEE",
        scope: "GLOBAL",
        calculation_type: "FIXED",
        value: "15",
        priority: "110",
      }),
    ],
  };
}

const translations = {
  ar: {
    title: "إنشاء مندوب",
    subtitle:
      "إضافة مندوب جديد مع اختيار الوسيط، إنشاء حساب دخول للمندوب، كود الإحالة، وقواعد العمولات المتعددة حسب البطاقة أو البرنامج أو الخدمة أو العقد.",
    back: "رجوع",
    saveDraft: "حفظ مسودة",
    clear: "مسح",
    submit: "حفظ المندوب",
    saving: "جاري الحفظ",

    basicInfo: "بيانات المندوب",
    brokerInfo: "اختيار الوسيط / الوكيل",
    brokerSearch: "ابحث عن وسيط بالاسم أو الكود أو الجوال...",
    brokerManualId: "معرّف الوسيط اليدوي",
    brokerHint:
      "اختر الوسيط من القائمة. إذا فتحت الصفحة من ملف وسيط سيتم تحديده تلقائيًا.",
    noBroker: "بدون وسيط",
    loadingBrokers: "جاري تحميل الوسطاء",
    noBrokers: "لا توجد نتائج للوسطاء",
    selectedBroker: "الوسيط المحدد",

    loginInfo: "حساب دخول المندوب",
    createLoginUser: "إنشاء حساب دخول للمندوب",
    loginUsername: "اسم مستخدم الدخول",
    loginEmail: "بريد الدخول",
    loginPassword: "كلمة مرور الدخول",
    loginDisplayName: "اسم العرض في الحساب",
    loginPhone: "جوال حساب الدخول",
    loginWhatsapp: "واتساب حساب الدخول",
    loginHint:
      "عند تفعيل هذا الخيار سيتم إنشاء User وربطه مباشرة بالمندوب Agent.user مع user_type=AGENT و role=agent_user.",
    passwordHint:
      "اترك كلمة المرور فارغة إذا تريد من الباكند توليد كلمة مؤقتة أو استخدام رابط كلمة مرور لاحقًا.",

    contactInfo: "بيانات التواصل",
    commissionInfo: "إعدادات العمولة الافتراضية",
    rulesInfo: "قواعد العمولات المالية",
    bankInfo: "البيانات البنكية",
    notesInfo: "الملاحظات",

    fullName: "اسم المندوب",
    phone: "الجوال",
    email: "البريد الإلكتروني",
    city: "المدينة",
    address: "العنوان",
    status: "الحالة",
    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    draft: "مسودة",

    agentCode: "كود المندوب",
    referralCode: "كود الإحالة",
    generateReferral: "توليد كود",

    commissionType: "طريقة الحساب",
    percentage: "نسبة",
    fixed: "مبلغ ثابت",
    commissionValue: "القيمة",
    defaultSalesCommission: "عمولة البيع الافتراضية",
    deliveryFee: "عمولة التوصيل الافتراضية",

    bankName: "اسم البنك",
    bankAccountName: "اسم صاحب الحساب",
    iban: "الآيبان",
    notes: "ملاحظات",

    summary: "ملخص المندوب",
    readiness: "جاهزية البيانات",
    complete: "مكتمل",
    incomplete: "غير مكتمل",
    requiredFields: "الحقول المطلوبة",
    optionalFields: "الحقول الاختيارية",

    financialReady: "جاهز للدورة المالية",
    financialReadyDesc:
      "هذه البيانات ستستخدم في عهدة COD، عمولات البيع، مستحقات التوصيل، وحسابات الوسيط.",

    addRule: "إضافة قاعدة",
    removeRule: "حذف القاعدة",
    ruleName: "اسم القاعدة",
    ruleType: "نوع القاعدة",
    ruleScope: "نطاق القاعدة",
    calculationBase: "أساس الحساب",
    priority: "الأولوية",
    isActive: "مفعلة",
    validFrom: "تبدأ من",
    validUntil: "تنتهي في",
    minAmount: "الحد الأدنى",
    maxAmount: "الحد الأعلى",

    productType: "نوع المنتج",
    orderKind: "نوع الطلب",
    productId: "معرّف المنتج",
    providerId: "معرّف مقدم الخدمة",
    contractId: "معرّف العقد",
    contractProductId: "معرّف عرض مقدم الخدمة",

    global: "عام",
    product: "منتج محدد",
    productTypeScope: "نوع منتج",
    provider: "مقدم خدمة",
    contract: "عقد",
    contractProduct: "عرض مقدم خدمة",
    orderKindScope: "نوع طلب",

    card: "بطاقة",
    program: "برنامج",
    service: "خدمة",
    medicalService: "خدمة طبية",
    subscription: "اشتراك",

    salesCommission: "عمولة بيع",
    deliveryRule: "عمولة توصيل",
    brokerShare: "حصة وسيط",

    netBeforeTax: "الصافي قبل الضريبة",
    grossAmount: "الإجمالي",
    totalWithTax: "الإجمالي مع الضريبة",
    platformShare: "حصة النظام",
    brokerShareBase: "حصة الوسيط",

    rulesCount: "عدد قواعد العمولات",
    estimated: "القيمة المتوقعة",

    requiredName: "اسم المندوب مطلوب.",
    requiredPhone: "رقم الجوال مطلوب.",
    requiredAgentCode: "كود المندوب مطلوب.",
    requiredReferral: "كود الإحالة مطلوب.",
    invalidEmail: "صيغة البريد الإلكتروني غير صحيحة.",
    invalidLoginEmail: "صيغة بريد الدخول غير صحيحة.",
    invalidBroker: "معرّف الوسيط يجب أن يكون رقمًا صحيحًا.",
    invalidCommission: "قيمة العمولة يجب أن تكون رقمًا صحيحًا.",
    invalidPercentage: "النسبة يجب أن تكون بين 0 و 100.",
    invalidDeliveryFee: "عمولة التوصيل يجب أن تكون رقمًا صحيحًا.",
    invalidRule: "يوجد خطأ في قواعد العمولات.",
    invalidAmountRange: "الحد الأعلى لا يمكن أن يكون أقل من الحد الأدنى.",
    invalidDateRange: "تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية.",
    ruleTargetRequired: "هدف القاعدة مطلوب حسب النطاق.",
    shortPassword: "كلمة المرور يجب ألا تقل عن 8 أحرف.",

    saved: "تم إنشاء المندوب بنجاح.",
    draftSaved: "تم حفظ المسودة محليًا.",
    draftLoaded: "تم استعادة المسودة.",
    cleared: "تم مسح النموذج.",
    errorTitle: "تعذر تنفيذ العملية",
    submitError: "تعذر إنشاء المندوب.",
    confirmClear: "هل تريد مسح النموذج الحالي؟",
    unsaved: "لديك تغييرات غير محفوظة.",
    viewAgent: "فتح المندوب",
  },
  en: {
    title: "Create Agent",
    subtitle:
      "Add a new agent with broker selection, agent login account, referral code, and multiple financial rules by card, program, service, provider, or contract.",
    back: "Back",
    saveDraft: "Save draft",
    clear: "Clear",
    submit: "Save agent",
    saving: "Saving",

    basicInfo: "Agent info",
    brokerInfo: "Broker / agency selection",
    brokerSearch: "Search brokers by name, code, or phone...",
    brokerManualId: "Manual broker ID",
    brokerHint:
      "Select a broker from the list. If opened from a broker profile, it will be selected automatically.",
    noBroker: "No broker",
    loadingBrokers: "Loading brokers",
    noBrokers: "No broker results",
    selectedBroker: "Selected broker",

    loginInfo: "Agent login account",
    createLoginUser: "Create login account for agent",
    loginUsername: "Login username",
    loginEmail: "Login email",
    loginPassword: "Login password",
    loginDisplayName: "Login display name",
    loginPhone: "Login phone",
    loginWhatsapp: "Login WhatsApp",
    loginHint:
      "When enabled, a User will be created and linked to Agent.user with user_type=AGENT and role=agent_user.",
    passwordHint:
      "Leave password empty if backend should generate a temporary password or a password setup link will be used later.",

    contactInfo: "Contact info",
    commissionInfo: "Default commission settings",
    rulesInfo: "Financial commission rules",
    bankInfo: "Bank info",
    notesInfo: "Notes",

    fullName: "Agent name",
    phone: "Phone",
    email: "Email",
    city: "City",
    address: "Address",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    draft: "Draft",

    agentCode: "Agent code",
    referralCode: "Referral code",
    generateReferral: "Generate code",

    commissionType: "Calculation",
    percentage: "Percentage",
    fixed: "Fixed",
    commissionValue: "Value",
    defaultSalesCommission: "Default sales commission",
    deliveryFee: "Default delivery fee",

    bankName: "Bank name",
    bankAccountName: "Account holder",
    iban: "IBAN",
    notes: "Notes",

    summary: "Agent summary",
    readiness: "Data readiness",
    complete: "Complete",
    incomplete: "Incomplete",
    requiredFields: "Required fields",
    optionalFields: "Optional fields",

    financialReady: "Financial-ready",
    financialReadyDesc:
      "These values will be used for COD custody, sales commissions, delivery dues, and broker statements.",

    addRule: "Add rule",
    removeRule: "Remove rule",
    ruleName: "Rule name",
    ruleType: "Rule type",
    ruleScope: "Rule scope",
    calculationBase: "Calculation base",
    priority: "Priority",
    isActive: "Active",
    validFrom: "Valid from",
    validUntil: "Valid until",
    minAmount: "Minimum amount",
    maxAmount: "Maximum amount",

    productType: "Product type",
    orderKind: "Order kind",
    productId: "Product ID",
    providerId: "Provider ID",
    contractId: "Contract ID",
    contractProductId: "Provider offer ID",

    global: "Global",
    product: "Specific product",
    productTypeScope: "Product type",
    provider: "Provider",
    contract: "Contract",
    contractProduct: "Provider offer",
    orderKindScope: "Order kind",

    card: "Card",
    program: "Program",
    service: "Service",
    medicalService: "Medical service",
    subscription: "Subscription",

    salesCommission: "Sales commission",
    deliveryRule: "Delivery fee",
    brokerShare: "Broker share",

    netBeforeTax: "Net before tax",
    grossAmount: "Gross amount",
    totalWithTax: "Total with tax",
    platformShare: "Platform share",
    brokerShareBase: "Broker share",

    rulesCount: "Rules count",
    estimated: "Estimated",

    requiredName: "Agent name is required.",
    requiredPhone: "Phone number is required.",
    requiredAgentCode: "Agent code is required.",
    requiredReferral: "Referral code is required.",
    invalidEmail: "Email format is invalid.",
    invalidLoginEmail: "Login email format is invalid.",
    invalidBroker: "Broker ID must be a valid number.",
    invalidCommission: "Commission value must be a valid number.",
    invalidPercentage: "Percentage must be between 0 and 100.",
    invalidDeliveryFee: "Delivery fee must be a valid number.",
    invalidRule: "There is an error in financial rules.",
    invalidAmountRange: "Maximum amount cannot be less than minimum amount.",
    invalidDateRange: "End date cannot be before start date.",
    ruleTargetRequired: "Rule target is required for the selected scope.",
    shortPassword: "Password must be at least 8 characters.",

    saved: "Agent created successfully.",
    draftSaved: "Draft saved locally.",
    draftLoaded: "Draft restored.",
    cleared: "Form cleared.",
    errorTitle: "Unable to complete operation",
    submitError: "Unable to create agent.",
    confirmClear: "Do you want to clear the current form?",
    unsaved: "You have unsaved changes.",
    viewAgent: "Open agent",
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
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
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function generateCode(prefix: string) {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${random}`;
}

function validateEmail(value: string) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function extractCreatedAgentId(payload: ApiResponse) {
  const data = asRecord(payload.data);
  const item = asRecord(payload.item);
  const agent = asRecord(payload.agent);

  return toNumber(
    data.id ||
      asRecord(data.agent).id ||
      item.id ||
      agent.id ||
      payload.id,
  );
}

function normalizeBroker(value: unknown): BrokerOption {
  const item = asRecord(value);

  return {
    id: toNumber(item.id || item.value),
    name: normalizeText(item.name || item.full_name || item.broker_name || item.label),
    code: normalizeText(item.broker_code || item.code),
    phone: normalizeText(item.phone || item.mobile || item.phone_number),
    email: normalizeText(item.email),
    status: normalizeText(item.status),
  };
}

function extractBrokerOptions(payload: unknown): BrokerOption[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  const candidates = [
    data.brokers,
    data.results,
    data.items,
    root.brokers,
    root.results,
    root.items,
  ];

  for (const candidate of candidates) {
    const rows = asArray(candidate)
      .map(normalizeBroker)
      .filter((item) => item.id > 0);

    if (rows.length) return rows;
  }

  return [];
}

function getRuleTypeLabel(type: RuleType, locale: Locale) {
  const t = translations[locale];

  if (type === "SALES_COMMISSION") return t.salesCommission;
  if (type === "DELIVERY_FEE") return t.deliveryRule;
  return t.brokerShare;
}

function getScopeLabel(scope: RuleScope, locale: Locale) {
  const t = translations[locale];

  if (scope === "GLOBAL") return t.global;
  if (scope === "PRODUCT_TYPE") return t.productTypeScope;
  if (scope === "PRODUCT") return t.product;
  if (scope === "PROVIDER") return t.provider;
  if (scope === "CONTRACT") return t.contract;
  if (scope === "CONTRACT_PRODUCT") return t.contractProduct;
  return t.orderKindScope;
}

function getCalculationBaseLabel(base: CalculationBase, locale: Locale) {
  const t = translations[locale];

  if (base === "NET_BEFORE_TAX") return t.netBeforeTax;
  if (base === "GROSS_AMOUNT") return t.grossAmount;
  if (base === "TOTAL_WITH_TAX") return t.totalWithTax;
  if (base === "PLATFORM_SHARE") return t.platformShare;
  return t.brokerShareBase;
}

function getProductTypeLabel(value: ProductType | OrderKind, locale: Locale) {
  const t = translations[locale];

  if (value === "card") return t.card;
  if (value === "program") return t.program;
  if (value === "service") return t.service;
  if (value === "medical_service") return t.medicalService;
  if (value === "subscription") return t.subscription;
  if (value === "product") return t.product;

  return "—";
}

function isRuleTargetReady(rule: FinancialRuleForm) {
  if (rule.scope === "GLOBAL") return true;
  if (rule.scope === "PRODUCT_TYPE") return Boolean(rule.product_type);
  if (rule.scope === "ORDER_KIND") return Boolean(rule.order_kind);
  if (rule.scope === "PRODUCT") return toNumber(rule.product_id) > 0;
  if (rule.scope === "PROVIDER") return toNumber(rule.provider_id) > 0;
  if (rule.scope === "CONTRACT") return toNumber(rule.contract_id) > 0;
  if (rule.scope === "CONTRACT_PRODUCT") return toNumber(rule.contract_product_id) > 0;

  return false;
}

function estimateRuleAmount(rule: FinancialRuleForm, sampleAmount = 200) {
  const value = toNumber(rule.value);

  if (rule.calculation_type === "PERCENTAGE") {
    return (sampleAmount * value) / 100;
  }

  return value;
}

function cleanRuleForPayload(rule: FinancialRuleForm) {
  const ruleName =
    normalizeText(rule.rule_name) || `${rule.rule_type} - ${rule.scope}`;
  const ruleValue = toNumber(rule.value).toFixed(2);
  const minAmount = toNumber(rule.min_amount).toFixed(2);
  const maxAmount = normalizeText(rule.max_amount)
    ? toNumber(rule.max_amount).toFixed(2)
    : "";

  const payload: ApiRecord = {
    rule_name: ruleName,
    rule_type: rule.rule_type,
    scope: rule.scope,
    calculation_type: rule.calculation_type,
    calculation_base: rule.calculation_base,
    value: ruleValue,
    min_amount: minAmount,
    priority: toNumber(rule.priority, 100),
    is_active: rule.is_active,
    notes: normalizeText(rule.notes),

    name: ruleName,
    commission_type: rule.calculation_type,
    commission_value: ruleValue,
  };

  if (maxAmount) payload.max_amount = maxAmount;
  if (rule.valid_from) payload.valid_from = rule.valid_from;
  if (rule.valid_until) payload.valid_until = rule.valid_until;

  if (rule.scope === "PRODUCT_TYPE") payload.product_type = rule.product_type;
  if (rule.scope === "ORDER_KIND") payload.order_kind = rule.order_kind;
  if (rule.scope === "PRODUCT") payload.product_id = toNumber(rule.product_id);
  if (rule.scope === "PROVIDER") payload.provider_id = toNumber(rule.provider_id);
  if (rule.scope === "CONTRACT") payload.contract_id = toNumber(rule.contract_id);
  if (rule.scope === "CONTRACT_PRODUCT") {
    payload.contract_product_id = toNumber(rule.contract_product_id);
  }

  return payload;
}

function buildPayload(form: FormState) {
  const brokerId = toNumber(form.broker_id);
  const hasBroker = normalizeText(form.broker_id) !== "";

  const loginEmail = normalizeText(form.login_email) || normalizeText(form.email);
  const loginPhone = normalizeText(form.login_phone) || normalizeText(form.phone);
  const loginWhatsapp =
    normalizeText(form.login_whatsapp) ||
    normalizeText(form.phone) ||
    normalizeText(form.login_phone);
  const loginDisplayName =
    normalizeText(form.login_display_name) || normalizeText(form.full_name);

  return {
    full_name: normalizeText(form.full_name),
    name: normalizeText(form.full_name),
    phone: normalizeText(form.phone),
    email: normalizeText(form.email),
    city: normalizeText(form.city),
    address: normalizeText(form.address),
    status: form.status,

    ...(hasBroker ? { broker_id: brokerId } : {}),

    agent_code: normalizeText(form.agent_code),
    referral_code: normalizeText(form.referral_code),

    default_commission_type: form.default_commission_type,
    default_commission_value: toNumber(form.default_commission_value).toFixed(2),
    default_delivery_fee: toNumber(form.default_delivery_fee).toFixed(2),

    create_login_user: form.create_login_user,
    create_user: form.create_login_user,
    create_account: form.create_login_user,
    login_username: normalizeText(form.login_username) || undefined,
    login_email: loginEmail || undefined,
    user_email: loginEmail || undefined,
    login_password: normalizeText(form.login_password) || undefined,
    login_display_name: loginDisplayName || undefined,
    login_phone: loginPhone || undefined,
    login_phone_number: loginPhone || undefined,
    login_whatsapp: loginWhatsapp || undefined,
    login_whatsapp_number: loginWhatsapp || undefined,

    bank_name: normalizeText(form.bank_name),
    bank_account_name: normalizeText(form.bank_account_name),
    iban: normalizeText(form.iban),
    notes: normalizeText(form.notes),

    auto_create_default_rules: false,
    financial_rules: form.financial_rules.map(cleanRuleForPayload),
  };
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let payload: unknown = null;

  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const data = asRecord(payload);
    const message =
      normalizeText(data.message) ||
      normalizeText(data.detail) ||
      normalizeText(data.error) ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
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

function SarIcon({ className }: { className?: string }) {
  return (
    <Image
      src={SAR_ICON}
      alt="SAR"
      width={14}
      height={14}
      className={cn("inline-block h-3.5 w-3.5 object-contain", className)}
      unoptimized
    />
  );
}

function MoneyValue({ value }: { value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums text-foreground">
      <span>{formatMoney(value)}</span>
      <SarIcon />
    </span>
  );
}

function FieldBlock({
  label,
  children,
  description,
  required,
}: {
  label: string;
  children: React.ReactNode;
  description?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2 text-start">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {description ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function ReadinessItem({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {ready ? (
        <Badge
          variant="outline"
          className="rounded-full border-emerald-500/30 bg-emerald-50 text-emerald-700"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="rounded-full border-amber-500/30 bg-amber-50 text-amber-700"
        >
          <TriangleAlert className="h-3.5 w-3.5" />
        </Badge>
      )}
    </div>
  );
}

export default function CreateAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [form, setForm] = React.useState<FormState>(() => createInitialForm());
  const [saving, setSaving] = React.useState(false);
  const [createdAgentId, setCreatedAgentId] = React.useState<number | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState("");

  const [brokers, setBrokers] = React.useState<BrokerOption[]>([]);
  const [brokersLoading, setBrokersLoading] = React.useState(false);
  const [brokerSearch, setBrokerSearch] = React.useState("");

  const queryBrokerAppliedRef = React.useRef(false);

  const queryBrokerId = React.useMemo(() => {
    return toEnglishDigits(
      searchParams.get("broker_id") ||
        searchParams.get("broker") ||
        searchParams.get("brokerId") ||
        "",
    );
  }, [searchParams]);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  const sampleAmount = 200;
  const defaultCommissionValue = toNumber(form.default_commission_value);
  const deliveryFee = toNumber(form.default_delivery_fee);

  const previewDefaultCommission =
    form.default_commission_type === "PERCENTAGE"
      ? (sampleAmount * defaultCommissionValue) / 100
      : defaultCommissionValue;

  const selectedBroker = React.useMemo(() => {
    if (!form.broker_id) return null;

    return (
      brokers.find((broker) => String(broker.id) === String(form.broker_id)) ||
      {
        id: toNumber(form.broker_id),
        name: form.broker_name || `#${form.broker_id}`,
        code: "",
        phone: "",
        email: "",
        status: "",
      }
    );
  }, [brokers, form.broker_id, form.broker_name]);

  const filteredBrokers = React.useMemo(() => {
    const query = brokerSearch.trim().toLowerCase();

    if (!query) return brokers;

    return brokers.filter((broker) =>
      [broker.name, broker.code, broker.phone, broker.email, String(broker.id)]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [brokerSearch, brokers]);

  React.useEffect(() => {
    const applyLocale = () => setLocale(getInitialLocale());

    applyLocale();

    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  React.useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(DRAFT_KEY);

      if (!savedDraft) return;

      const parsed = JSON.parse(savedDraft) as Partial<FormState>;

      setForm((current) => ({
        ...current,
        ...parsed,
        status: (parsed.status || current.status) as AgentStatus,
        default_commission_type: (parsed.default_commission_type ||
          current.default_commission_type) as CommissionType,
        financial_rules: Array.isArray(parsed.financial_rules)
          ? parsed.financial_rules.map((rule) =>
              makeRule({
                ...rule,
                local_id: rule.local_id || makeLocalId(),
              }),
            )
          : current.financial_rules,
      }));

      toast.info(t.draftLoaded);
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, [t.draftLoaded]);

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadBrokers() {
      setBrokersLoading(true);

      try {
        const payload = await fetchJson<unknown>(
          makeApiUrl(
            "/api/agents/brokers/",
            new URLSearchParams({
              page: "1",
              page_size: "200",
            }),
          ),
          controller.signal,
        );

        setBrokers(extractBrokerOptions(payload));
      } catch {
        setBrokers([]);
      } finally {
        setBrokersLoading(false);
      }
    }

    void loadBrokers();

    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    if (queryBrokerAppliedRef.current) return;
    if (!queryBrokerId) return;
    if (brokersLoading) return;

    const matchedBroker =
      brokers.find((broker) => String(broker.id) === String(queryBrokerId)) ||
      null;

    setForm((current) => ({
      ...current,
      broker_id: queryBrokerId,
      broker_name: matchedBroker?.name || current.broker_name || "",
    }));

    setBrokerSearch("");
    setDirty(false);
    queryBrokerAppliedRef.current = true;
  }, [brokers, brokersLoading, queryBrokerId]);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || saving) return;

      event.preventDefault();
      event.returnValue = t.unsaved;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty, saving, t.unsaved]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setDirty(true);
    setError("");
  }

  function updateRule<K extends keyof FinancialRuleForm>(
    localId: string,
    key: K,
    value: FinancialRuleForm[K],
  ) {
    setForm((current) => ({
      ...current,
      financial_rules: current.financial_rules.map((rule) => {
        if (rule.local_id !== localId) return rule;

        const nextRule: FinancialRuleForm = {
          ...rule,
          [key]: value,
        };

        if (key === "scope") {
          nextRule.product_type = value === "PRODUCT_TYPE" ? "card" : "";
          nextRule.order_kind = value === "ORDER_KIND" ? "card" : "";
          nextRule.product_id = "";
          nextRule.provider_id = "";
          nextRule.contract_id = "";
          nextRule.contract_product_id = "";
        }

        if (key === "rule_type" && value === "DELIVERY_FEE") {
          nextRule.calculation_type = "FIXED";

          if (!nextRule.value || nextRule.value === "10") {
            nextRule.value = "15";
          }
        }

        if (key === "rule_type" && value === "SALES_COMMISSION") {
          if (!nextRule.value || nextRule.value === "15") {
            nextRule.value = "10";
          }
        }

        return nextRule;
      }),
    }));
    setDirty(true);
    setError("");
  }

  function addRule(overrides: Partial<FinancialRuleForm> = {}) {
    setForm((current) => ({
      ...current,
      financial_rules: [...current.financial_rules, makeRule(overrides)],
    }));
    setDirty(true);
  }

  function removeRule(localId: string) {
    setForm((current) => ({
      ...current,
      financial_rules: current.financial_rules.filter(
        (rule) => rule.local_id !== localId,
      ),
    }));
    setDirty(true);
  }

  function selectBroker(broker: BrokerOption | null) {
    if (!broker) {
      setForm((current) => ({
        ...current,
        broker_id: "",
        broker_name: "",
      }));
      setBrokerSearch("");
      setDirty(true);
      return;
    }

    setForm((current) => ({
      ...current,
      broker_id: String(broker.id),
      broker_name: broker.name,
    }));
    setBrokerSearch("");
    setDirty(true);
  }

  function updateManualBrokerId(value: string) {
    setForm((current) => ({
      ...current,
      broker_id: toEnglishDigits(value),
      broker_name: "",
    }));
    setDirty(true);
    setError("");
  }

  function saveDraft() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    toast.success(t.draftSaved);
  }

  function clearForm() {
    if (!window.confirm(t.confirmClear)) return;

    setForm(createInitialForm());
    setDirty(false);
    setCreatedAgentId(null);
    setError("");
    setBrokerSearch("");
    queryBrokerAppliedRef.current = false;
    window.localStorage.removeItem(DRAFT_KEY);
    toast.success(t.cleared);
  }

  function generateReferralCode() {
    const code = generateCode("AGT");

    setForm((current) => ({
      ...current,
      referral_code: code,
      agent_code: current.agent_code || code,
      login_username: current.login_username || code.toLowerCase(),
    }));
    setDirty(true);
  }

  function validateRule(rule: FinancialRuleForm) {
    const value = toNumber(rule.value, Number.NaN);
    const minAmount = toNumber(rule.min_amount, Number.NaN);
    const maxAmount = normalizeText(rule.max_amount)
      ? toNumber(rule.max_amount, Number.NaN)
      : null;

    if (!Number.isFinite(value) || value < 0) return t.invalidRule;

    if (rule.calculation_type === "PERCENTAGE" && value > 100) {
      return t.invalidPercentage;
    }

    if (!Number.isFinite(minAmount) || minAmount < 0) {
      return t.invalidRule;
    }

    if (maxAmount !== null && (!Number.isFinite(maxAmount) || maxAmount < minAmount)) {
      return t.invalidAmountRange;
    }

    if (!isRuleTargetReady(rule)) {
      return t.ruleTargetRequired;
    }

    if (toNumber(rule.priority, Number.NaN) < 0) {
      return t.invalidRule;
    }

    if (rule.valid_from && rule.valid_until && rule.valid_until < rule.valid_from) {
      return t.invalidDateRange;
    }

    return "";
  }

  function validateForm() {
    const fullName = normalizeText(form.full_name);
    const phone = normalizeText(form.phone);
    const agentCode = normalizeText(form.agent_code);
    const referralCode = normalizeText(form.referral_code);
    const email = normalizeText(form.email);
    const loginEmail = normalizeText(form.login_email);
    const loginPassword = normalizeText(form.login_password);
    const brokerIdText = normalizeText(form.broker_id);
    const commission = toNumber(form.default_commission_value, Number.NaN);
    const delivery = toNumber(form.default_delivery_fee, Number.NaN);

    if (!fullName) return t.requiredName;
    if (!phone) return t.requiredPhone;
    if (!agentCode) return t.requiredAgentCode;
    if (!referralCode) return t.requiredReferral;
    if (!validateEmail(email)) return t.invalidEmail;
    if (form.create_login_user && loginEmail && !validateEmail(loginEmail)) {
      return t.invalidLoginEmail;
    }
    if (form.create_login_user && loginPassword && loginPassword.length < 8) {
      return t.shortPassword;
    }

    if (
      brokerIdText &&
      (!Number.isFinite(Number(brokerIdText)) || Number(brokerIdText) <= 0)
    ) {
      return t.invalidBroker;
    }

    if (!Number.isFinite(commission) || commission < 0) {
      return t.invalidCommission;
    }

    if (
      form.default_commission_type === "PERCENTAGE" &&
      (commission < 0 || commission > 100)
    ) {
      return t.invalidPercentage;
    }

    if (!Number.isFinite(delivery) || delivery < 0) {
      return t.invalidDeliveryFee;
    }

    if (!form.financial_rules.length) {
      return t.invalidRule;
    }

    for (const rule of form.financial_rules) {
      const ruleError = validateRule(rule);
      if (ruleError) return ruleError;
    }

    return "";
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = buildPayload(form);
      const response = await postJson<ApiResponse>(
        makeApiUrl("/api/agents/create/"),
        payload,
      );

      const agentId = extractCreatedAgentId(response);

      setCreatedAgentId(agentId || null);
      setDirty(false);
      window.localStorage.removeItem(DRAFT_KEY);
      toast.success(t.saved);

      if (agentId) {
        router.push(`/system/agents/${agentId}`);
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

  const requiredReady =
    Boolean(normalizeText(form.full_name)) &&
    Boolean(normalizeText(form.phone)) &&
    Boolean(normalizeText(form.agent_code)) &&
    Boolean(normalizeText(form.referral_code));

  const loginReady =
    !form.create_login_user ||
    Boolean(
      normalizeText(form.login_username) ||
        normalizeText(form.login_email) ||
        normalizeText(form.email) ||
        normalizeText(form.phone),
    );

  const defaultCommissionReady =
    Number.isFinite(defaultCommissionValue) &&
    defaultCommissionValue >= 0 &&
    (form.default_commission_type === "FIXED" || defaultCommissionValue <= 100);

  const deliveryReady = Number.isFinite(deliveryFee) && deliveryFee >= 0;

  const rulesReady =
    form.financial_rules.length > 0 &&
    form.financial_rules.every((rule) => validateRule(rule) === "");

  const bankReady =
    Boolean(normalizeText(form.bank_name)) && Boolean(normalizeText(form.iban));

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-start">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/agents">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg"
            onClick={saveDraft}
            disabled={saving}
          >
            <FileText className="h-4 w-4" />
            {t.saveDraft}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg"
            onClick={clearForm}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4" />
            {t.clear}
          </Button>

          {createdAgentId ? (
            <Button
              asChild
              className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
            >
              <Link href={`/system/agents/${createdAgentId}`}>
                <UserRound className="h-4 w-4" />
                {t.viewAgent}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex items-start gap-3 p-4">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="space-y-1 text-start">
              <p className="font-semibold text-red-900">{t.errorTitle}</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <form
        onSubmit={submitForm}
        className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.basicInfo}</CardTitle>
              <CardDescription>{t.requiredFields}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-2">
              <FieldBlock label={t.fullName} required>
                <Input
                  value={form.full_name}
                  onChange={(event) => {
                    updateField("full_name", event.target.value);
                    if (!form.login_display_name) {
                      updateField("login_display_name", event.target.value);
                    }
                  }}
                  className="h-10 rounded-lg bg-background"
                />
              </FieldBlock>

              <FieldBlock label={t.status}>
                <Select
                  value={form.status}
                  onValueChange={(value) => updateField("status", value as AgentStatus)}
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
              </FieldBlock>

              <FieldBlock label={t.agentCode} required>
                <Input
                  value={form.agent_code}
                  onChange={(event) =>
                    updateField("agent_code", event.target.value.toUpperCase())
                  }
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </FieldBlock>

              <FieldBlock label={t.referralCode} required>
                <div className="flex gap-2">
                  <Input
                    value={form.referral_code}
                    onChange={(event) =>
                      updateField("referral_code", event.target.value.toUpperCase())
                    }
                    className="h-10 rounded-lg bg-background"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 rounded-lg"
                    onClick={generateReferralCode}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t.generateReferral}
                  </Button>
                </div>
              </FieldBlock>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.brokerInfo}</CardTitle>
              <CardDescription>{t.brokerHint}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-[minmax(0,1fr)_240px]">
              <FieldBlock label={t.selectedBroker}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-between rounded-lg bg-background"
                    >
                      <span className="truncate">
                        {selectedBroker
                          ? `${selectedBroker.name || `#${selectedBroker.id}`} ${
                              selectedBroker.code ? `· ${selectedBroker.code}` : ""
                            }`
                          : t.noBroker}
                      </span>
                      {brokersLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align={locale === "ar" ? "start" : "end"}
                    className="w-[min(520px,calc(100vw-2rem))] p-2"
                  >
                    <div className="relative mb-2">
                      <Search
                        className={cn(
                          "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                          locale === "ar" ? "right-3" : "left-3",
                        )}
                      />
                      <Input
                        value={brokerSearch}
                        onChange={(event) => setBrokerSearch(event.target.value)}
                        placeholder={t.brokerSearch}
                        className={cn(
                          "h-9 rounded-lg bg-background",
                          locale === "ar" ? "pr-9" : "pl-9",
                        )}
                      />
                    </div>

                    <div className="max-h-[280px] space-y-1 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => selectBroker(null)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted"
                      >
                        <span>{t.noBroker}</span>
                        {!form.broker_id ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : null}
                      </button>

                      {brokersLoading ? (
                        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t.loadingBrokers}
                        </div>
                      ) : filteredBrokers.length ? (
                        filteredBrokers.map((broker) => (
                          <button
                            type="button"
                            key={broker.id}
                            onClick={() => selectBroker(broker)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {broker.name || `#${broker.id}`}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                #{broker.id} · {broker.code || "—"} · {broker.phone || "—"}
                              </span>
                            </span>

                            {String(form.broker_id) === String(broker.id) ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            ) : null}
                          </button>
                        ))
                      ) : (
                        <div className="rounded-lg px-3 py-3 text-sm text-muted-foreground">
                          {t.noBrokers}
                        </div>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </FieldBlock>

              <FieldBlock label={t.brokerManualId}>
                <div className="flex gap-2">
                  <Input
                    value={form.broker_id}
                    onChange={(event) => updateManualBrokerId(event.target.value)}
                    className="h-10 rounded-lg bg-background"
                    inputMode="numeric"
                    dir="ltr"
                  />
                  {form.broker_id ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg"
                      onClick={() => selectBroker(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </FieldBlock>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.loginInfo}</CardTitle>
              <CardDescription>{t.loginHint}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-5 pb-5">
              <label className="flex items-start gap-3 rounded-lg border bg-background p-3">
                <Checkbox
                  checked={form.create_login_user}
                  onCheckedChange={(checked) =>
                    updateField("create_login_user", Boolean(checked))
                  }
                />
                <span className="space-y-1 text-start">
                  <span className="block text-sm font-medium text-foreground">
                    {t.createLoginUser}
                  </span>
                  <span className="block text-xs leading-5 text-muted-foreground">
                    {t.loginHint}
                  </span>
                </span>
              </label>

              <div
                className={cn(
                  "grid gap-4 md:grid-cols-2",
                  !form.create_login_user && "opacity-60",
                )}
              >
                <FieldBlock label={t.loginUsername}>
                  <Input
                    value={form.login_username}
                    onChange={(event) =>
                      updateField("login_username", event.target.value.trim())
                    }
                    disabled={!form.create_login_user}
                    className="h-10 rounded-lg bg-background"
                    dir="ltr"
                  />
                </FieldBlock>

                <FieldBlock label={t.loginEmail}>
                  <Input
                    value={form.login_email}
                    onChange={(event) =>
                      updateField("login_email", event.target.value.trim())
                    }
                    disabled={!form.create_login_user}
                    placeholder={form.email || ""}
                    className="h-10 rounded-lg bg-background"
                    dir="ltr"
                  />
                </FieldBlock>

                <FieldBlock label={t.loginDisplayName}>
                  <Input
                    value={form.login_display_name}
                    onChange={(event) =>
                      updateField("login_display_name", event.target.value)
                    }
                    disabled={!form.create_login_user}
                    placeholder={form.full_name || ""}
                    className="h-10 rounded-lg bg-background"
                  />
                </FieldBlock>

                <FieldBlock label={t.loginPassword} description={t.passwordHint}>
                  <Input
                    type="password"
                    value={form.login_password}
                    onChange={(event) =>
                      updateField("login_password", event.target.value)
                    }
                    disabled={!form.create_login_user}
                    className="h-10 rounded-lg bg-background"
                  />
                </FieldBlock>

                <FieldBlock label={t.loginPhone}>
                  <Input
                    value={form.login_phone}
                    onChange={(event) =>
                      updateField("login_phone", event.target.value)
                    }
                    disabled={!form.create_login_user}
                    placeholder={form.phone || ""}
                    className="h-10 rounded-lg bg-background"
                    dir="ltr"
                  />
                </FieldBlock>

                <FieldBlock label={t.loginWhatsapp}>
                  <Input
                    value={form.login_whatsapp}
                    onChange={(event) =>
                      updateField("login_whatsapp", event.target.value)
                    }
                    disabled={!form.create_login_user}
                    placeholder={form.phone || ""}
                    className="h-10 rounded-lg bg-background"
                    dir="ltr"
                  />
                </FieldBlock>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.contactInfo}</CardTitle>
              <CardDescription>{t.requiredFields}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-2">
              <FieldBlock label={t.phone} required>
                <Input
                  value={form.phone}
                  onChange={(event) => {
                    updateField("phone", event.target.value);

                    if (!form.login_phone) {
                      updateField("login_phone", event.target.value);
                    }

                    if (!form.login_whatsapp) {
                      updateField("login_whatsapp", event.target.value);
                    }
                  }}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </FieldBlock>

              <FieldBlock label={t.email}>
                <Input
                  value={form.email}
                  onChange={(event) => {
                    updateField("email", event.target.value);

                    if (!form.login_email) {
                      updateField("login_email", event.target.value);
                    }
                  }}
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </FieldBlock>

              <FieldBlock label={t.city}>
                <Input
                  value={form.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                />
              </FieldBlock>

              <FieldBlock label={t.address}>
                <Input
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                />
              </FieldBlock>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.commissionInfo}</CardTitle>
              <CardDescription>{t.financialReadyDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-3">
              <FieldBlock label={t.commissionType}>
                <Select
                  value={form.default_commission_type}
                  onValueChange={(value) =>
                    updateField("default_commission_type", value as CommissionType)
                  }
                >
                  <SelectTrigger className="h-10 rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">{t.percentage}</SelectItem>
                    <SelectItem value="FIXED">{t.fixed}</SelectItem>
                  </SelectContent>
                </Select>
              </FieldBlock>

              <FieldBlock label={t.defaultSalesCommission}>
                <Input
                  value={form.default_commission_value}
                  onChange={(event) =>
                    updateField(
                      "default_commission_value",
                      toEnglishDigits(event.target.value),
                    )
                  }
                  className="h-10 rounded-lg bg-background"
                  inputMode="decimal"
                  dir="ltr"
                />
              </FieldBlock>

              <FieldBlock label={t.deliveryFee}>
                <div className="relative">
                  <Input
                    value={form.default_delivery_fee}
                    onChange={(event) =>
                      updateField(
                        "default_delivery_fee",
                        toEnglishDigits(event.target.value),
                      )
                    }
                    className="h-10 rounded-lg bg-background pe-9"
                    inputMode="decimal"
                    dir="ltr"
                  />
                  <SarIcon
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2",
                      locale === "ar" ? "left-3" : "right-3",
                    )}
                  />
                </div>
              </FieldBlock>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="text-base">{t.rulesInfo}</CardTitle>
                  <CardDescription>{t.financialReadyDesc}</CardDescription>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={() => addRule()}
                >
                  <Plus className="h-4 w-4" />
                  {t.addRule}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 px-5 pb-5">
              {form.financial_rules.map((rule) => (
                <Card
                  key={rule.local_id}
                  className="rounded-lg border bg-background shadow-none"
                >
                  <CardHeader className="px-4 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-1 text-start">
                        <CardTitle className="truncate text-sm">
                          {rule.rule_name ||
                            `${getRuleTypeLabel(rule.rule_type, locale)} · ${getScopeLabel(rule.scope, locale)}`}
                        </CardTitle>
                        <CardDescription>
                          {getRuleTypeLabel(rule.rule_type, locale)} ·{" "}
                          {getScopeLabel(rule.scope, locale)} ·{" "}
                          {rule.calculation_type === "PERCENTAGE"
                            ? `${formatMoney(rule.value)}%`
                            : `${formatMoney(rule.value)} SAR`}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2.5 py-1",
                            rule.is_active
                              ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                              : "border-muted bg-muted/40 text-muted-foreground",
                          )}
                        >
                          {rule.is_active ? t.active : t.inactive}
                        </Badge>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          disabled={form.financial_rules.length <= 1}
                          onClick={() => removeRule(rule.local_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="grid gap-4 px-4 pb-4 md:grid-cols-2 xl:grid-cols-4">
                    <FieldBlock label={t.ruleName}>
                      <Input
                        value={rule.rule_name}
                        onChange={(event) =>
                          updateRule(rule.local_id, "rule_name", event.target.value)
                        }
                        className="h-10 rounded-lg bg-card"
                      />
                    </FieldBlock>

                    <FieldBlock label={t.ruleType}>
                      <Select
                        value={rule.rule_type}
                        onValueChange={(value) =>
                          updateRule(rule.local_id, "rule_type", value as RuleType)
                        }
                      >
                        <SelectTrigger className="h-10 rounded-lg bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RULE_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {getRuleTypeLabel(option, locale)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldBlock>

                    <FieldBlock label={t.ruleScope}>
                      <Select
                        value={rule.scope}
                        onValueChange={(value) =>
                          updateRule(rule.local_id, "scope", value as RuleScope)
                        }
                      >
                        <SelectTrigger className="h-10 rounded-lg bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RULE_SCOPE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {getScopeLabel(option, locale)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldBlock>

                    <FieldBlock label={t.commissionType}>
                      <Select
                        value={rule.calculation_type}
                        onValueChange={(value) =>
                          updateRule(
                            rule.local_id,
                            "calculation_type",
                            value as CommissionType,
                          )
                        }
                      >
                        <SelectTrigger className="h-10 rounded-lg bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">{t.percentage}</SelectItem>
                          <SelectItem value="FIXED">{t.fixed}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldBlock>

                    <FieldBlock label={t.commissionValue}>
                      <Input
                        value={rule.value}
                        onChange={(event) =>
                          updateRule(
                            rule.local_id,
                            "value",
                            toEnglishDigits(event.target.value),
                          )
                        }
                        className="h-10 rounded-lg bg-card"
                        inputMode="decimal"
                        dir="ltr"
                      />
                    </FieldBlock>

                    <FieldBlock label={t.calculationBase}>
                      <Select
                        value={rule.calculation_base}
                        onValueChange={(value) =>
                          updateRule(
                            rule.local_id,
                            "calculation_base",
                            value as CalculationBase,
                          )
                        }
                      >
                        <SelectTrigger className="h-10 rounded-lg bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CALCULATION_BASE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {getCalculationBaseLabel(option, locale)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldBlock>

                    <FieldBlock label={t.priority}>
                      <Input
                        value={rule.priority}
                        onChange={(event) =>
                          updateRule(
                            rule.local_id,
                            "priority",
                            toEnglishDigits(event.target.value),
                          )
                        }
                        className="h-10 rounded-lg bg-card"
                        inputMode="numeric"
                        dir="ltr"
                      />
                    </FieldBlock>

                    <FieldBlock label={t.isActive}>
                      <div className="flex h-10 items-center gap-2 rounded-lg border bg-card px-3">
                        <Checkbox
                          checked={rule.is_active}
                          onCheckedChange={(checked) =>
                            updateRule(rule.local_id, "is_active", Boolean(checked))
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {rule.is_active ? t.active : t.inactive}
                        </span>
                      </div>
                    </FieldBlock>

                    <FieldBlock label={t.minAmount}>
                      <Input
                        value={rule.min_amount}
                        onChange={(event) =>
                          updateRule(
                            rule.local_id,
                            "min_amount",
                            toEnglishDigits(event.target.value),
                          )
                        }
                        className="h-10 rounded-lg bg-card"
                        inputMode="decimal"
                        dir="ltr"
                      />
                    </FieldBlock>

                    <FieldBlock label={t.maxAmount}>
                      <Input
                        value={rule.max_amount}
                        onChange={(event) =>
                          updateRule(
                            rule.local_id,
                            "max_amount",
                            toEnglishDigits(event.target.value),
                          )
                        }
                        className="h-10 rounded-lg bg-card"
                        inputMode="decimal"
                        dir="ltr"
                      />
                    </FieldBlock>

                    {rule.scope === "PRODUCT_TYPE" ? (
                      <FieldBlock label={t.productType} required>
                        <Select
                          value={rule.product_type || "card"}
                          onValueChange={(value) =>
                            updateRule(
                              rule.local_id,
                              "product_type",
                              value as ProductType,
                            )
                          }
                        >
                          <SelectTrigger className="h-10 rounded-lg bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRODUCT_KIND_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {getProductTypeLabel(option, locale)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldBlock>
                    ) : null}

                    {rule.scope === "ORDER_KIND" ? (
                      <FieldBlock label={t.orderKind} required>
                        <Select
                          value={rule.order_kind || "card"}
                          onValueChange={(value) =>
                            updateRule(
                              rule.local_id,
                              "order_kind",
                              value as OrderKind,
                            )
                          }
                        >
                          <SelectTrigger className="h-10 rounded-lg bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRODUCT_KIND_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {getProductTypeLabel(option, locale)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldBlock>
                    ) : null}

                    {rule.scope === "PRODUCT" ? (
                      <FieldBlock label={t.productId} required>
                        <Input
                          value={rule.product_id}
                          onChange={(event) =>
                            updateRule(
                              rule.local_id,
                              "product_id",
                              toEnglishDigits(event.target.value),
                            )
                          }
                          className="h-10 rounded-lg bg-card"
                          inputMode="numeric"
                          dir="ltr"
                        />
                      </FieldBlock>
                    ) : null}

                    {rule.scope === "PROVIDER" ? (
                      <FieldBlock label={t.providerId} required>
                        <Input
                          value={rule.provider_id}
                          onChange={(event) =>
                            updateRule(
                              rule.local_id,
                              "provider_id",
                              toEnglishDigits(event.target.value),
                            )
                          }
                          className="h-10 rounded-lg bg-card"
                          inputMode="numeric"
                          dir="ltr"
                        />
                      </FieldBlock>
                    ) : null}

                    {rule.scope === "CONTRACT" ? (
                      <FieldBlock label={t.contractId} required>
                        <Input
                          value={rule.contract_id}
                          onChange={(event) =>
                            updateRule(
                              rule.local_id,
                              "contract_id",
                              toEnglishDigits(event.target.value),
                            )
                          }
                          className="h-10 rounded-lg bg-card"
                          inputMode="numeric"
                          dir="ltr"
                        />
                      </FieldBlock>
                    ) : null}

                    {rule.scope === "CONTRACT_PRODUCT" ? (
                      <FieldBlock label={t.contractProductId} required>
                        <Input
                          value={rule.contract_product_id}
                          onChange={(event) =>
                            updateRule(
                              rule.local_id,
                              "contract_product_id",
                              toEnglishDigits(event.target.value),
                            )
                          }
                          className="h-10 rounded-lg bg-card"
                          inputMode="numeric"
                          dir="ltr"
                        />
                      </FieldBlock>
                    ) : null}

                    <FieldBlock label={t.validFrom}>
                      <Input
                        type="date"
                        value={rule.valid_from}
                        onChange={(event) =>
                          updateRule(rule.local_id, "valid_from", event.target.value)
                        }
                        className="h-10 rounded-lg bg-card"
                        dir="ltr"
                      />
                    </FieldBlock>

                    <FieldBlock label={t.validUntil}>
                      <Input
                        type="date"
                        value={rule.valid_until}
                        onChange={(event) =>
                          updateRule(rule.local_id, "valid_until", event.target.value)
                        }
                        className="h-10 rounded-lg bg-card"
                        dir="ltr"
                      />
                    </FieldBlock>

                    <FieldBlock label={t.estimated}>
                      <div className="flex h-10 items-center rounded-lg border bg-card px-3">
                        <MoneyValue value={estimateRuleAmount(rule, sampleAmount)} />
                      </div>
                    </FieldBlock>

                    <FieldBlock label={t.notes}>
                      <Input
                        value={rule.notes}
                        onChange={(event) =>
                          updateRule(rule.local_id, "notes", event.target.value)
                        }
                        className="h-10 rounded-lg bg-card"
                      />
                    </FieldBlock>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.bankInfo}</CardTitle>
              <CardDescription>{t.optionalFields}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 md:grid-cols-2">
              <FieldBlock label={t.bankName}>
                <Input
                  value={form.bank_name}
                  onChange={(event) => updateField("bank_name", event.target.value)}
                  className="h-10 rounded-lg bg-background"
                />
              </FieldBlock>

              <FieldBlock label={t.bankAccountName}>
                <Input
                  value={form.bank_account_name}
                  onChange={(event) =>
                    updateField("bank_account_name", event.target.value)
                  }
                  className="h-10 rounded-lg bg-background"
                />
              </FieldBlock>

              <FieldBlock label={t.iban}>
                <Input
                  value={form.iban}
                  onChange={(event) =>
                    updateField("iban", event.target.value.toUpperCase())
                  }
                  className="h-10 rounded-lg bg-background"
                  dir="ltr"
                />
              </FieldBlock>
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.notesInfo}</CardTitle>
              <CardDescription>{t.optionalFields}</CardDescription>
            </CardHeader>

            <CardContent className="px-5 pb-5">
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                className="min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4 rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4">
              <CardTitle className="text-base">{t.summary}</CardTitle>
              <CardDescription>{t.readiness}</CardDescription>
              <CardAction>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2.5 py-1",
                    requiredReady &&
                      loginReady &&
                      defaultCommissionReady &&
                      deliveryReady &&
                      rulesReady
                      ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                      : "border-amber-500/30 bg-amber-50 text-amber-700",
                  )}
                >
                  {requiredReady &&
                  loginReady &&
                  defaultCommissionReady &&
                  deliveryReady &&
                  rulesReady
                    ? t.complete
                    : t.incomplete}
                </Badge>
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-3 px-5 pb-5">
              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <UserRound className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {form.full_name || t.fullName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.agent_code || form.referral_code || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <LockKeyhole className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.loginInfo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.create_login_user
                      ? form.login_username ||
                        form.login_email ||
                        form.email ||
                        form.phone ||
                        t.createLoginUser
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.selectedBroker}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedBroker
                      ? `${selectedBroker.name || `#${selectedBroker.id}`}`
                      : t.noBroker}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <BadgePercent className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {t.defaultSalesCommission}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.default_commission_type === "PERCENTAGE"
                      ? `${formatMoney(form.default_commission_value)}%`
                      : `${formatMoney(form.default_commission_value)} SAR`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <WalletCards className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.estimated}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <MoneyValue value={previewDefaultCommission} />
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.deliveryFee}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <MoneyValue value={deliveryFee} />
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.rulesCount}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {form.financial_rules.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Landmark className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {form.bank_name || t.bankName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {form.iban || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.financialReady}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.financialReadyDesc}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <ReadinessItem label={t.requiredFields} ready={requiredReady} />
                <ReadinessItem label={t.loginInfo} ready={loginReady} />
                <ReadinessItem
                  label={t.commissionInfo}
                  ready={defaultCommissionReady}
                />
                <ReadinessItem label={t.deliveryFee} ready={deliveryReady} />
                <ReadinessItem label={t.rulesInfo} ready={rulesReady} />
                <ReadinessItem label={t.bankInfo} ready={bankReady} />
              </div>

              <Button
                type="submit"
                className="h-10 w-full rounded-lg bg-black text-white hover:bg-black/90"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? t.saving : t.submit}
              </Button>

              {createdAgentId ? (
                <Button
                  asChild
                  type="button"
                  variant="outline"
                  className="h-10 w-full rounded-lg"
                >
                  <Link href={`/system/agents/${createdAgentId}`}>
                    <UserRound className="h-4 w-4" />
                    {t.viewAgent}
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}