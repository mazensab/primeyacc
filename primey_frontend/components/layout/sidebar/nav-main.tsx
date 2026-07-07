"use client";

/* =====================================================
   📂 components/layout/sidebar/nav-main.tsx
   🧠 Mhamcloud — Main Sidebar Navigation
   Premium sidebar navigation items
===================================================== */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useAuth,
  type AuthSession,
} from "@/components/providers/AuthProvider";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import {
  BarChart3,
  BellRing,
  Boxes,
  Briefcase,
  Calculator,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Gift,
  Home,
  KeyRound,
  MessageCircle,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  canAccess,
  hasPermission,
  isSystemAdmin,
  PERMISSIONS,
  type PermissionCheckInput,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

/* =====================================================
   TYPES
===================================================== */

type AppLocale = "ar" | "en";

type WorkspaceType =
  | "system"
  | "company"
  | "center"
  | "provider"
  | "customer"
  | "agent";

type NavItem = {
  title: {
    ar: string;
    en: string;
  };
  href: string;
  aliases?: string[];
  icon?: LucideIcon;
  items?: NavItem[];
  newTab?: boolean;
  isNew?: boolean;
  isComing?: boolean;
  isDataBadge?: string;
  roles?: string[];
  apps?: string[];

  permission?: string | null;
  permissions?: string[] | readonly string[] | null;
  anyPermissions?: string[] | readonly string[] | null;
  allPermissions?: string[] | readonly string[] | null;
  workspace?: string | null;
  workspaces?: string[] | readonly string[] | null;
};

type NavGroup = {
  title: {
    ar: string;
    en: string;
  };
  items: NavItem[];
};

type NavMainProps = {
  type: WorkspaceType;
};

type SidebarAuthSession = Partial<AuthSession>;

/* =====================================================
   SYSTEM NAV
===================================================== */

const systemNavItems: NavGroup[] = [
  {
    title: { ar: "منصة Mhamcloud", en: "Mhamcloud Platform" },
    items: [
      {
        title: { ar: "لوحة النظام", en: "System Dashboard" },
        href: "/system",
        icon: Home,
        permission: PERMISSIONS.SYSTEM_VIEW,
        workspaces: ["system"],
      },
      {
        title: { ar: "إدارة المنصة", en: "Platform Management" },
        href: "/system/companies",
        icon: ShieldCheck,
        anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
        workspaces: ["system"],
        items: [
          {
            title: { ar: "الشركات", en: "Companies" },
            href: "/system/companies",
            icon: Users,
            anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
            workspaces: ["system"],
          },
          {
            title: { ar: "اشتراكات الشركات", en: "Company Subscriptions" },
            href: "/system/subscriptions",
            aliases: ["/system/subscriptions/list", "/system/subscriptions/reports"],
            icon: Gift,
            anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.PAYMENTS_VIEW],
            workspaces: ["system"],
          },
          {
            title: { ar: "\u0628\u0627\u0642\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629", en: "Platform Plans" },
            href: "/system/plans",
            icon: Gift,
            anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
            workspaces: ["system"],
          },
          {
            title: { ar: "مدفوعات المنصة", en: "Platform Payments" },
            href: "/system/platform-payments",
            aliases: [
              "/system/platform-payments/list",
              "/system/platform-payments/reports",
            ],
            icon: CreditCard,
            anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.PAYMENTS_VIEW],
            workspaces: ["system"],
          },
          {
            title: { ar: "مستخدمو النظام", en: "System Users" },
            href: "/system/users",
            icon: UserCog,
            anyPermissions: [PERMISSIONS.USERS_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
            workspaces: ["system"],
          },
          {
            title: { ar: "إعدادات النظام", en: "System Settings" },
            href: "/system/settings",
            icon: Settings,
            permission: PERMISSIONS.SYSTEM_SETTINGS,
            workspaces: ["system"],
          },
        ],
      },
      {
        title: { ar: "الجاهزية والربط", en: "Readiness & API" },
        href: "/system/release-readiness",
        icon: FileText,
        anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
        workspaces: ["system"],
        items: [
          {
            title: { ar: "جاهزية الإصدار", en: "Release Readiness" },
            href: "/system/release-readiness",
            icon: ShieldCheck,
            anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
            workspaces: ["system"],
          },
          {
            title: { ar: "أنشطة الشركات", en: "Activity Profiles" },
            href: "/system/activity-profiles",
            icon: Stethoscope,
            anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
            workspaces: ["system"],
            isNew: true,
          },
        ],
      },
      {
        title: { ar: "التكاملات", en: "Integrations" },
        href: "/system/integrations",
        icon: Briefcase,
        anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_INTEGRATION_API_KEYS_VIEW],
        workspaces: ["system"],
        items: [
          {
            title: { ar: "مركز التكاملات", en: "Integrations Center" },
            href: "/system/integrations",
            icon: Briefcase,
            anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_INTEGRATION_API_KEYS_VIEW],
            workspaces: ["system"],
          },
          {
            title: { ar: "عقود API", en: "API Contracts" },
            href: "/system/integrations/api-contracts",
            aliases: ["/system/api-contracts"],
            icon: FileText,
            anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
            workspaces: ["system"],
          },
          {
            title: { ar: "مفاتيح API", en: "API Keys" },
            href: "/system/integrations/api-keys",
            icon: KeyRound,
            anyPermissions: [PERMISSIONS.SYSTEM_INTEGRATION_API_KEYS_VIEW, PERMISSIONS.SYSTEM_VIEW],
            workspaces: ["system"],
            isNew: true,
          },
        ],
      },
      {
        title: { ar: "الحوكمة والصلاحيات", en: "Governance & Access" },
        href: "/system/roles",
        icon: ShieldCheck,
        anyPermissions: [PERMISSIONS.SYSTEM_VIEW],
        workspaces: ["system"],
        items: [
          { title: { ar: "الأدوار", en: "Roles" }, href: "/system/roles", icon: ShieldCheck, anyPermissions: [PERMISSIONS.SYSTEM_VIEW], workspaces: ["system"] },
          { title: { ar: "الصلاحيات", en: "Permissions" }, href: "/system/permissions", icon: ShieldCheck, anyPermissions: [PERMISSIONS.SYSTEM_VIEW], workspaces: ["system"] },
          { title: { ar: "ضوابط الأعمال", en: "Business Controls" }, href: "/system/business-controls", icon: Calculator, anyPermissions: [PERMISSIONS.SYSTEM_VIEW], workspaces: ["system"] },
          { title: { ar: "خلفيات الأنشطة", en: "Activity Backends" }, href: "/system/activity-backends", icon: Boxes, anyPermissions: [PERMISSIONS.SYSTEM_VIEW], workspaces: ["system"] },
        ],
      },
      {
        title: { ar: "المستندات والطباعة", en: "Documents & Printing" },
        href: "/system/documents",
        icon: FileText,
        anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
        workspaces: ["system"],
        items: [
          { title: { ar: "المستندات", en: "Documents" }, href: "/system/documents", icon: FileText, anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS], workspaces: ["system"] },
          { title: { ar: "قوالب المستندات", en: "Document Templates" }, href: "/system/documents/templates", icon: FileText, anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS], workspaces: ["system"] },
          { title: { ar: "إعدادات المستندات", en: "Document Settings" }, href: "/system/documents/settings", icon: Settings, anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS], workspaces: ["system"] },
          { title: { ar: "تصيير المستندات", en: "Document Rendering" }, href: "/system/documents/rendering", icon: ReceiptText, anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS], workspaces: ["system"] },
          { title: { ar: "الطباعة الحرارية", en: "Thermal Printing" }, href: "/system/documents/thermal", icon: ReceiptText, anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS], workspaces: ["system"] },
        ],
      },
      {
        title: { ar: "التواصل والإشعارات", en: "Messaging & Notifications" },
        href: "/system/notifications",
        icon: MessageCircle,
        anyPermissions: [PERMISSIONS.SYSTEM_VIEW],
        workspaces: ["system"],
        items: [
          {
            title: { ar: "الإشعارات", en: "Notifications" },
            href: "/system/notifications",
            icon: BellRing,
            anyPermissions: [PERMISSIONS.SYSTEM_VIEW],
            workspaces: ["system"],
          },
          {
            title: { ar: "واتساب", en: "WhatsApp" },
            href: "/system/whatsapp",
            icon: MessageCircle,
            anyPermissions: [PERMISSIONS.SYSTEM_VIEW],
            workspaces: ["system"],
          },
        ],
      },
    ],
  },
];

const companyNavItems: NavGroup[] = [
  {
    title: { ar: "وحدات الشركة", en: "Company Modules" },
    items: [
      {
        title: { ar: "لوحة الشركة", en: "Company Dashboard" },
        href: "/company",
        aliases: ["/center", "/provider"],
        icon: Home,
        permission: PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
        workspaces: ["company"],
      },
      {
        title: { ar: "الحسابات العامة", en: "General Accounting" },
        href: "/company/accounting",
        icon: Calculator,
        anyPermissions: [
          PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
          PERMISSIONS.ACCOUNTING_VIEW,
          PERMISSIONS.ACCOUNTING_REPORTS_VIEW,
        ],
        workspaces: ["company"],
        items: [
          {
            title: { ar: "لوحة الحسابات", en: "Accounting Dashboard" },
            href: "/company/accounting",
            icon: Calculator,
            permission: PERMISSIONS.ACCOUNTING_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "دليل الحسابات", en: "Chart of Accounts" },
            href: "/company/accounting/chart-of-accounts",
            icon: FileText,
            permission: PERMISSIONS.ACCOUNTING_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "القيود اليومية", en: "Journal Entries" },
            href: "/company/accounting/journal-entries",
            icon: ReceiptText,
            permission: PERMISSIONS.ACCOUNTING_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "مراكز التكلفة", en: "Cost Centers" },
            href: "/company/accounting/cost-centers",
            icon: ReceiptText,
            permission: PERMISSIONS.ACCOUNTING_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "دفتر الأستاذ", en: "General Ledger" },
            href: "/company/accounting/ledger",
            icon: FileText,
            permission: PERMISSIONS.ACCOUNTING_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "ميزان المراجعة", en: "Trial Balance" },
            href: "/company/accounting/trial-balance",
            icon: BarChart3,
            anyPermissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.ACCOUNTING_REPORTS_VIEW],
            workspaces: ["company"],
          },
          {
            title: { ar: "الأرباح والخسائر", en: "Profit & Loss" },
            href: "/company/accounting/profit-loss",
            icon: BarChart3,
            anyPermissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.ACCOUNTING_REPORTS_VIEW],
            workspaces: ["company"],
          },
          {
            title: { ar: "الميزانية العمومية", en: "Balance Sheet" },
            href: "/company/accounting/balance-sheet",
            icon: BarChart3,
            anyPermissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.ACCOUNTING_REPORTS_VIEW],
            workspaces: ["company"],
          },
          {
            title: { ar: "التدفقات النقدية", en: "Cash Flow" },
            href: "/company/accounting/cash-flow",
            icon: Wallet,
            anyPermissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.ACCOUNTING_REPORTS_VIEW],
            workspaces: ["company"],
          },
        ],
      },
      {
        title: { ar: "الخزينة والمدفوعات", en: "Treasury & Payments" },
        href: "/company/treasury",
        icon: Wallet,
        anyPermissions: [
          PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
          PERMISSIONS.TREASURY_VIEW,
          PERMISSIONS.PAYMENTS_VIEW,
        ],
        workspaces: ["company"],
        items: [
          {
            title: { ar: "الخزينة", en: "Treasury" },
            href: "/company/treasury",
            icon: Wallet,
            permission: PERMISSIONS.TREASURY_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "الصناديق", en: "Cashboxes" },
            href: "/company/treasury/cashboxes",
            icon: Wallet,
            permission: PERMISSIONS.TREASURY_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "الحسابات البنكية", en: "Bank Accounts" },
            href: "/company/treasury/bank-accounts",
            icon: CreditCard,
            permission: PERMISSIONS.TREASURY_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "سندات القبض", en: "Receipt Vouchers" },
            href: "/company/treasury/receipt-vouchers",
            icon: ReceiptText,
            permission: PERMISSIONS.TREASURY_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "سندات الصرف", en: "Payment Vouchers" },
            href: "/company/treasury/payment-vouchers",
            icon: FileText,
            permission: PERMISSIONS.TREASURY_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "المدفوعات", en: "Payments" },
            href: "/company/payments",
            aliases: ["/center/payments", "/provider/payments"],
            icon: CreditCard,
            permission: PERMISSIONS.PAYMENTS_VIEW,
            workspaces: ["company"],
          },
        ],
      },
      {
        title: { ar: "العملاء والموردون", en: "Customers & Suppliers" },
        href: "/company/parties",
        icon: Users,
        anyPermissions: [
          PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
          PERMISSIONS.CUSTOMERS_VIEW,
          "suppliers.view",
          "parties.view",
        ],
        workspaces: ["company"],
        items: [
          {
            title: { ar: "لوحة الأطراف", en: "Parties Dashboard" },
            href: "/company/parties",
            icon: Users,
            anyPermissions: [PERMISSIONS.PROVIDER_WORKSPACE_VIEW, PERMISSIONS.CUSTOMERS_VIEW, "suppliers.view", "parties.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "العملاء", en: "Customers" },
            href: "/company/customers",
            aliases: ["/center/customers", "/provider/customers"],
            icon: Users,
            permission: PERMISSIONS.CUSTOMERS_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "الموردون", en: "Suppliers" },
            href: "/company/suppliers",
            icon: Briefcase,
            anyPermissions: [PERMISSIONS.CUSTOMERS_VIEW, "suppliers.view"],
            workspaces: ["company"],
          },
        ],
      },
      {
        title: { ar: "المبيعات ونقاط البيع", en: "Sales & POS" },
        href: "/company/sales",
        icon: ShoppingCart,
        anyPermissions: [
          PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
          PERMISSIONS.ORDERS_VIEW,
          PERMISSIONS.INVOICES_VIEW,
          PERMISSIONS.PAYMENTS_VIEW,
          "pos.view",
        ],
        workspaces: ["company"],
        items: [
          {
            title: { ar: "لوحة المبيعات", en: "Sales Dashboard" },
            href: "/company/sales",
            icon: ShoppingCart,
            anyPermissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.INVOICES_VIEW],
            workspaces: ["company"],
          },
          {
            title: { ar: "عروض الأسعار", en: "Quotations" },
            href: "/company/sales/quotations",
            icon: FileText,
            anyPermissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.INVOICES_VIEW],
            workspaces: ["company"],
          },
          {
            title: { ar: "أوامر البيع", en: "Sales Orders" },
            href: "/company/sales/orders",
            icon: ShoppingCart,
            permission: PERMISSIONS.ORDERS_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "فواتير المبيعات", en: "Sales Invoices" },
            href: "/company/sales/invoices",
            aliases: ["/company/invoices", "/center/invoices", "/provider/invoices"],
            icon: ReceiptText,
            permission: PERMISSIONS.INVOICES_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "مرتجعات المبيعات", en: "Sales Returns" },
            href: "/company/sales/returns",
            icon: FileText,
            anyPermissions: [PERMISSIONS.INVOICES_VIEW, "sales_returns.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "الإشعارات الدائنة", en: "Credit Notes" },
            href: "/company/sales/credit-notes",
            icon: ReceiptText,
            anyPermissions: [PERMISSIONS.INVOICES_VIEW, "credit_notes.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "نقاط البيع", en: "POS" },
            href: "/company/pos",
            icon: CreditCard,
            anyPermissions: ["pos.view", PERMISSIONS.ORDERS_VIEW, PERMISSIONS.PAYMENTS_VIEW],
            workspaces: ["company"],
          },
        ],
      },
      {
        title: { ar: "المشتريات والموردين", en: "Purchases & Suppliers" },
        href: "/company/purchases",
        icon: Briefcase,
        anyPermissions: [
          PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
          "purchases.view",
          "supplier_bills.view",
          "suppliers.view",
        ],
        workspaces: ["company"],
        items: [
          {
            title: { ar: "لوحة المشتريات", en: "Purchases Dashboard" },
            href: "/company/purchases",
            icon: Briefcase,
            anyPermissions: ["purchases.view", "supplier_bills.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "أوامر الشراء", en: "Purchase Orders" },
            href: "/company/purchases/orders",
            icon: ShoppingCart,
            anyPermissions: ["purchases.view", "purchase_orders.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "فواتير الموردين", en: "Supplier Bills" },
            href: "/company/purchases/bills",
            icon: FileText,
            anyPermissions: ["purchases.view", "supplier_bills.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "مرتجعات المشتريات", en: "Purchase Returns" },
            href: "/company/purchases/returns",
            icon: ReceiptText,
            anyPermissions: ["purchases.view", "purchase_returns.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "مدفوعات الموردين", en: "Supplier Payments" },
            href: "/company/purchases/payments",
            icon: CreditCard,
            anyPermissions: [PERMISSIONS.PAYMENTS_VIEW, "supplier_payments.view"],
            workspaces: ["company"],
          },
        ],
      },
      {
        title: { ar: "المنتجات والخدمات", en: "Products & Services" },
        href: "/company/catalog",
        icon: Boxes,
        anyPermissions: [
          PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
          PERMISSIONS.PRODUCTS_VIEW,
          "catalog.view",
        ],
        workspaces: ["company"],
        items: [
          {
            title: { ar: "لوحة الكتالوج", en: "Catalog Dashboard" },
            href: "/company/catalog",
            icon: Package,
            anyPermissions: [PERMISSIONS.PROVIDER_WORKSPACE_VIEW, PERMISSIONS.PRODUCTS_VIEW, "catalog.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "المنتجات والخدمات", en: "Products & Services" },
            href: "/company/products",
            aliases: ["/center/products", "/provider/products"],
            icon: Boxes,
            anyPermissions: [PERMISSIONS.PRODUCTS_VIEW, "catalog.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "التصنيفات", en: "Categories" },
            href: "/company/catalog/categories",
            icon: Package,
            anyPermissions: [PERMISSIONS.PRODUCTS_VIEW, "catalog.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "الوحدات", en: "Units" },
            href: "/company/catalog/units",
            icon: Calculator,
            anyPermissions: [PERMISSIONS.PRODUCTS_VIEW, "catalog.view"],
            workspaces: ["company"],
          },
        ],
      },
      {
        title: { ar: "المخزون والمستودعات", en: "Inventory & Warehouses" },
        href: "/company/inventory",
        icon: Package,
        anyPermissions: [
          PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
          PERMISSIONS.PRODUCTS_VIEW,
          "inventory.view",
          "warehouses.view",
        ],
        workspaces: ["company"],
        items: [
          {
            title: { ar: "لوحة المخزون", en: "Inventory Dashboard" },
            href: "/company/inventory",
            icon: Package,
            anyPermissions: ["inventory.view", PERMISSIONS.PRODUCTS_VIEW],
            workspaces: ["company"],
          },
          {
            title: { ar: "المستودعات", en: "Warehouses" },
            href: "/company/inventory/warehouses",
            icon: Boxes,
            anyPermissions: ["warehouses.view", "inventory.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "المواقع والبِن", en: "Locations & Bins" },
            href: "/company/inventory/locations",
            icon: Boxes,
            anyPermissions: ["warehouses.view", "inventory.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "حركات المخزون", en: "Stock Movements" },
            href: "/company/inventory/movements",
            icon: FileText,
            anyPermissions: ["stock_movements.view", "inventory.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "الجرد", en: "Physical Counts" },
            href: "/company/inventory/counts",
            icon: ReceiptText,
            anyPermissions: ["inventory.view", "physical_counts.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "الحجز والتخصيص", en: "Reservations & Allocation" },
            href: "/company/inventory/reservations",
            icon: ShieldCheck,
            anyPermissions: ["inventory.view", "reservations.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "الدُفعات والسيريالات", en: "Batches & Serials" },
            href: "/company/inventory/tracking",
            icon: KeyRound,
            anyPermissions: ["inventory.view", "tracking.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "تقييم المخزون", en: "Inventory Valuation" },
            href: "/company/inventory/valuation",
            icon: BarChart3,
            anyPermissions: ["inventory.view", PERMISSIONS.REPORTS_VIEW],
            workspaces: ["company"],
          },
        ],
      },
      {
        title: { ar: "الموارد البشرية", en: "Human Resources" },
        href: "/company/hr",
        icon: Users,
        anyPermissions: [
          PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
          PERMISSIONS.USERS_VIEW,
          "hr.view",
          "employees.view",
        ],
        workspaces: ["company"],
        items: [
          {
            title: { ar: "لوحة الموارد البشرية", en: "HR Dashboard" },
            href: "/company/hr",
            icon: Users,
            anyPermissions: ["hr.view", "employees.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "الموظفون", en: "Employees" },
            href: "/company/hr/employees",
            icon: Users,
            anyPermissions: ["employees.view", "hr.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "الحضور والانصراف", en: "Attendance" },
            href: "/company/hr/attendance",
            icon: BellRing,
            anyPermissions: ["attendance.view", "hr.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "الإجازات", en: "Leave" },
            href: "/company/hr/leave",
            icon: FileText,
            anyPermissions: ["leave.view", "hr.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "الرواتب", en: "Payroll" },
            href: "/company/hr/payroll",
            icon: Wallet,
            anyPermissions: ["payroll.view", "hr.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "الأداء", en: "Performance" },
            href: "/company/hr/performance",
            icon: BarChart3,
            anyPermissions: ["performance.view", "hr.view"],
            workspaces: ["company"],
          },
        ],
      },
      {
        title: { ar: "التقارير والتحليلات", en: "Reports & Analytics" },
        href: "/company/reports",
        icon: BarChart3,
        anyPermissions: [
          PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
          PERMISSIONS.REPORTS_VIEW,
          PERMISSIONS.ACCOUNTING_REPORTS_VIEW,
        ],
        workspaces: ["company"],
        items: [
          {
            title: { ar: "لوحة التقارير", en: "Reports Dashboard" },
            href: "/company/reports",
            icon: BarChart3,
            permission: PERMISSIONS.REPORTS_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "التقارير المالية", en: "Financial Reports" },
            href: "/company/reports/financial",
            icon: Calculator,
            anyPermissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.ACCOUNTING_REPORTS_VIEW],
            workspaces: ["company"],
          },
          {
            title: { ar: "تقارير المبيعات", en: "Sales Reports" },
            href: "/company/reports/sales",
            icon: ShoppingCart,
            permission: PERMISSIONS.REPORTS_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "تقارير المشتريات", en: "Purchase Reports" },
            href: "/company/reports/purchases",
            icon: Briefcase,
            permission: PERMISSIONS.REPORTS_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "تقارير المخزون", en: "Inventory Reports" },
            href: "/company/reports/inventory",
            icon: Package,
            permission: PERMISSIONS.REPORTS_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "تقارير العملاء والموردين", en: "Parties Reports" },
            href: "/company/reports/parties",
            icon: Users,
            permission: PERMISSIONS.REPORTS_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "تقارير نقاط البيع", en: "POS Reports" },
            href: "/company/reports/pos",
            icon: CreditCard,
            permission: PERMISSIONS.REPORTS_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "تقارير الضريبة", en: "VAT Reports" },
            href: "/company/reports/vat",
            icon: ReceiptText,
            permission: PERMISSIONS.REPORTS_VIEW,
            workspaces: ["company"],
          },
        ],
      },
      {
        title: { ar: "المستندات والطباعة", en: "Documents & Printing" },
        href: "/company/documents",
        icon: FileText,
        anyPermissions: [
          PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
          PERMISSIONS.INVOICES_VIEW,
          "documents.view",
        ],
        workspaces: ["company"],
        items: [
          {
            title: { ar: "مركز المستندات", en: "Documents Center" },
            href: "/company/documents",
            icon: FileText,
            anyPermissions: [PERMISSIONS.PROVIDER_WORKSPACE_VIEW, "documents.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "قوالب المستندات", en: "Document Templates" },
            href: "/company/documents/templates",
            icon: FileText,
            anyPermissions: ["documents.view", "document_templates.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "تصيير المستندات", en: "Document Rendering" },
            href: "/company/documents/rendering",
            icon: ReceiptText,
            anyPermissions: ["documents.view", "document_rendering.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "الطباعة الحرارية", en: "Thermal Printing" },
            href: "/company/documents/thermal",
            icon: ReceiptText,
            anyPermissions: ["documents.view", "thermal_printing.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "مهام الطباعة", en: "Print Jobs" },
            href: "/company/documents/print-jobs",
            icon: FileText,
            anyPermissions: ["documents.view", "print_jobs.view"],
            workspaces: ["company"],
          },
          {
            title: { ar: "إعدادات المستندات", en: "Document Settings" },
            href: "/company/documents/settings",
            icon: Settings,
            anyPermissions: ["documents.view", "document_settings.view"],
            workspaces: ["company"],
          },
        ],
      },
      {
        title: { ar: "التواصل والإشعارات", en: "Messaging & Notifications" },
        href: "/company/notifications",
        icon: MessageCircle,
        anyPermissions: [
          PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
          PERMISSIONS.NOTIFICATIONS_VIEW,
          PERMISSIONS.WHATSAPP_VIEW,
        ],
        workspaces: ["company"],
        items: [
          {
            title: { ar: "مركز الإشعارات", en: "Notifications Center" },
            href: "/company/notifications",
            icon: BellRing,
            anyPermissions: [PERMISSIONS.NOTIFICATIONS_VIEW, PERMISSIONS.PROVIDER_WORKSPACE_VIEW],
            workspaces: ["company"],
          },
          {
            title: { ar: "واتساب الشركة", en: "Company WhatsApp" },
            href: "/company/whatsapp",
            aliases: ["/center/whatsapp", "/provider/whatsapp"],
            icon: MessageCircle,
            permission: PERMISSIONS.WHATSAPP_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "صندوق وارد واتساب", en: "WhatsApp Inbox" },
            href: "/company/whatsapp/inbox",
            icon: MessageCircle,
            permission: PERMISSIONS.WHATSAPP_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "رسائل واتساب", en: "WhatsApp Messages" },
            href: "/company/whatsapp/messages",
            icon: MessageCircle,
            permission: PERMISSIONS.WHATSAPP_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "قوالب واتساب", en: "WhatsApp Templates" },
            href: "/company/whatsapp/templates",
            icon: FileText,
            permission: PERMISSIONS.WHATSAPP_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "إعدادات واتساب", en: "WhatsApp Settings" },
            href: "/company/whatsapp/settings",
            icon: Settings,
            permission: PERMISSIONS.WHATSAPP_VIEW,
            workspaces: ["company"],
          },
        ],
      },
      {
        title: { ar: "إعدادات الشركة", en: "Company Settings" },
        href: "/company/settings",
        icon: Settings,
        anyPermissions: [
          PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
          PERMISSIONS.PROVIDER_USERS_VIEW,
          PERMISSIONS.USERS_VIEW,
        ],
        workspaces: ["company"],
        items: [
          {
            title: { ar: "ملف الشركة", en: "Company Profile" },
            href: "/company/settings/company-profile",
            icon: ShieldCheck,
            permission: PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "الإعدادات العامة", en: "General Settings" },
            href: "/company/settings",
            aliases: ["/center/settings", "/provider/settings"],
            icon: Settings,
            permission: PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "الفروع", en: "Branches" },
            href: "/company/branches",
            icon: Briefcase,
            permission: PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "مستخدمو الشركة", en: "Company Users" },
            href: "/company/users",
            aliases: ["/center/users", "/provider/users"],
            icon: UserCog,
            anyPermissions: [PERMISSIONS.PROVIDER_USERS_VIEW, PERMISSIONS.USERS_VIEW],
            workspaces: ["company"],
          },
          {
            title: { ar: "صلاحيات الشركة", en: "Company Permissions" },
            href: "/company/permissions",
            icon: ShieldCheck,
            anyPermissions: [PERMISSIONS.PROVIDER_USERS_VIEW, PERMISSIONS.USERS_VIEW],
            workspaces: ["company"],
          },
          {
            title: { ar: "إعدادات الضريبة", en: "Tax Settings" },
            href: "/company/settings/tax",
            icon: ReceiptText,
            permission: PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
            workspaces: ["company"],
          },
          {
            title: { ar: "طرق الدفع", en: "Payment Methods" },
            href: "/company/settings/payment-methods",
            icon: CreditCard,
            permission: PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
            workspaces: ["company"],
          },
        ],
      },
    ],
  },
];

const customerNavItems: NavGroup[] = [
  {
    title: { ar: "بوابة العميل", en: "Customer Portal" },
    items: [
      {
        title: { ar: "الرئيسية", en: "Home" },
        href: "/customer",
        icon: Home,
        permission: PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "طلباتي", en: "My Orders" },
        href: "/customer/orders",
        icon: ShoppingCart,
        permission: PERMISSIONS.CUSTOMER_ORDERS_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "فواتيري", en: "My Invoices" },
        href: "/customer/invoices",
        icon: ReceiptText,
        permission: PERMISSIONS.INVOICES_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "مدفوعاتي", en: "My Payments" },
        href: "/customer/payments",
        icon: CreditCard,
        permission: PERMISSIONS.PAYMENTS_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "الدعم", en: "Support" },
        href: "/customer/support",
        icon: MessageCircle,
        permission: PERMISSIONS.CUSTOMER_SUPPORT_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "حسابي", en: "My Profile" },
        href: "/customer/profile",
        icon: ShieldCheck,
        permission: PERMISSIONS.CUSTOMER_ACCOUNT_VIEW,
        workspaces: ["customer"],
      },
    ],
  },
];

const agentNavItems: NavGroup[] = [
  {
    title: { ar: "مساحة المندوب", en: "Agent Workspace" },
    items: [
      {
        title: { ar: "الرئيسية", en: "Home" },
        href: "/agent",
        icon: Home,
        permission: PERMISSIONS.AGENT_WORKSPACE_VIEW,
        workspaces: ["agent"],
      },
      {
        title: { ar: "العملاء", en: "Customers" },
        href: "/agent/customers",
        icon: Users,
        anyPermissions: [PERMISSIONS.AGENT_CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_VIEW],
        workspaces: ["agent"],
      },
      {
        title: { ar: "الطلبات", en: "Orders" },
        href: "/agent/orders",
        icon: ShoppingCart,
        permission: PERMISSIONS.ORDERS_VIEW,
        workspaces: ["agent"],
      },
      {
        title: { ar: "العمولات", en: "Commissions" },
        href: "/agent/commissions",
        icon: Wallet,
        permission: PERMISSIONS.AGENT_COMMISSIONS_VIEW,
        workspaces: ["agent"],
      },
      {
        title: { ar: "حسابي", en: "My Account" },
        href: "/agent/account",
        icon: ShieldCheck,
        permission: PERMISSIONS.AGENT_ACCOUNT_VIEW,
        workspaces: ["agent"],
      },
    ],
  },
];

/* =====================================================
   HELPERS
===================================================== */

function normalizePath(path: string): string {
  if (path === "/center" || path === "/provider") return "/company";

  if (path.startsWith("/center/")) {
    return path.replace("/center", "/company");
  }

  if (path.startsWith("/provider/")) {
    return path.replace("/provider", "/company");
  }

  return path;
}

function matchesHref(pathname: string, href: string): boolean {
  const normalizedPathname = normalizePath(pathname);
  const normalizedHref = normalizePath(href);

  const rootRoutes = [
    "/system",
    "/company",
    "/center",
    "/provider",
    "/customer",
    "/agent",
  ];

  if (rootRoutes.includes(normalizedHref)) {
    return normalizedPathname === normalizedHref;
  }

  return (
    normalizedPathname === normalizedHref ||
    normalizedPathname.startsWith(`${normalizedHref}/`)
  );
}

function isItemActive(pathname: string, item: NavItem): boolean {
  if (matchesHref(pathname, item.href)) return true;

  return (item.aliases || []).some((alias) => matchesHref(pathname, alias));
}

function normalizeLower(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function hasRequiredRole(
  itemRoles: string[] | readonly string[] | undefined,
  currentRole: string,
): boolean {
  if (!itemRoles || itemRoles.length === 0) return true;
  if (!currentRole) return false;

  return itemRoles.map(normalizeLower).includes(currentRole);
}

function hasRequiredApps(
  itemApps: string[] | undefined,
  enabledApps: string[],
): boolean {
  if (!itemApps || itemApps.length === 0) return true;

  return itemApps.some((app) => enabledApps.includes(app));
}

function getStoredLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const savedLocale = window.localStorage.getItem("primey-locale");
    if (savedLocale === "en") return "en";
    if (savedLocale === "ar") return "ar";

    return document.documentElement.lang === "en" ? "en" : "ar";
  } catch (error) {
    console.error("Read locale error:", error);
    return "ar";
  }
}

function applyDocumentLocale(locale: AppLocale): void {
  try {
    if (typeof document === "undefined") return;

    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.body.dir = locale === "ar" ? "rtl" : "ltr";
  } catch (error) {
    console.error("Apply locale error:", error);
  }
}

function inferPermissionInputByHref(item: NavItem): PermissionCheckInput {
  if (
    item.permission ||
    item.permissions ||
    item.anyPermissions ||
    item.allPermissions ||
    item.roles ||
    item.workspace ||
    item.workspaces
  ) {
    return {
      permission: item.permission,
      permissions: item.permissions,
      anyPermissions: item.anyPermissions,
      allPermissions: item.allPermissions,
      roles: item.roles,
      workspace: item.workspace,
      workspaces: item.workspaces,
    };
  }

  const href = item.href;

  if (href === "/system") {
    return {
      permission: PERMISSIONS.SYSTEM_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/companies")) {
    return {
      anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/notifications")) {
    return {
      anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/whatsapp")) {
    return {
      anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/reports")) {
    return {
      permission: PERMISSIONS.REPORTS_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/users/create")) {
    return {
      permission: PERMISSIONS.USERS_CREATE,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/users")) {
    return {
      permission: PERMISSIONS.USERS_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/settings")) {
    return {
      permission: PERMISSIONS.SYSTEM_SETTINGS,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/centers") || href.startsWith("/system/providers")) {
    return {
      permission: href.includes("/create")
        ? PERMISSIONS.PROVIDERS_CREATE
        : PERMISSIONS.PROVIDERS_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/customers")) {
    return {
      permission: href.includes("/create")
        ? PERMISSIONS.CUSTOMERS_CREATE
        : PERMISSIONS.CUSTOMERS_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/brokers")) {
    return {
      permission: href.includes("/create")
        ? PERMISSIONS.AGENTS_CREATE
        : PERMISSIONS.AGENTS_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/agents")) {
    return {
      permission: href.includes("/create")
        ? PERMISSIONS.AGENTS_CREATE
        : PERMISSIONS.AGENTS_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/products")) {
    return {
      permission: href.includes("/create")
        ? PERMISSIONS.PRODUCTS_CREATE
        : PERMISSIONS.PRODUCTS_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/orders")) {
    return {
      permission: href.includes("/create")
        ? PERMISSIONS.ORDERS_CREATE
        : PERMISSIONS.ORDERS_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/contracts")) {
    return {
      permission: href.includes("/create")
        ? PERMISSIONS.CONTRACTS_CREATE
        : PERMISSIONS.CONTRACTS_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/invoices")) {
    return {
      permission: href.includes("/create")
        ? PERMISSIONS.INVOICES_CREATE
        : PERMISSIONS.INVOICES_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/payments")) {
    return {
      permission: href.includes("/create")
        ? PERMISSIONS.PAYMENTS_CREATE
        : PERMISSIONS.PAYMENTS_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/accounting")) {
    return {
      permission: PERMISSIONS.ACCOUNTING_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/system/treasury")) {
    if (href.includes("/settings")) {
      return {
        permission: PERMISSIONS.TREASURY_EDIT,
        workspaces: ["system"],
      };
    }

    if (
      href.includes("/create") ||
      href.includes("/vouchers/receipt") ||
      href.includes("/vouchers/payment")
    ) {
      return {
        permission: PERMISSIONS.TREASURY_CREATE,
        workspaces: ["system"],
      };
    }

    return {
      permission: PERMISSIONS.TREASURY_VIEW,
      workspaces: ["system"],
    };
  }

  if (href.startsWith("/customer")) {
    return {
      permission: PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
      workspaces: ["customer"],
    };
  }

  if (href.startsWith("/agent")) {
    return {
      permission: PERMISSIONS.AGENT_WORKSPACE_VIEW,
      workspaces: ["agent"],
    };
  }

  if (
    href.startsWith("/company") ||
    href.startsWith("/center") ||
    href.startsWith("/provider")
  ) {
    return {
      permission: PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
      workspaces: ["company"],
    };
  }

  return {};
}

function canAccessNavItem(
  authSession: SidebarAuthSession,
  item: NavItem,
  currentRole: string,
  enabledApps: string[],
): boolean {
  const appAllowed = hasRequiredApps(item.apps, enabledApps);
  if (!appAllowed) return false;

  const roleAllowed = hasRequiredRole(item.roles, currentRole);
  if (!roleAllowed && !isSystemAdmin(authSession)) return false;

  const input = inferPermissionInputByHref(item);

  if (
    !input.permission &&
    !input.permissions &&
    !input.anyPermissions &&
    !input.allPermissions &&
    !input.workspace &&
    !input.workspaces
  ) {
    return true;
  }

  if (canAccess(authSession, input)) return true;

  if (input.permission && hasPermission(authSession, input.permission)) {
    return true;
  }

  return false;
}

function filterNavItems(
  items: NavItem[],
  authSession: SidebarAuthSession,
  currentRole: string,
  enabledApps: string[],
): NavItem[] {
  return items
    .map((item) => {
      const filteredChildren = item.items
        ? filterNavItems(item.items, authSession, currentRole, enabledApps)
        : undefined;

      return {
        ...item,
        items: filteredChildren,
      };
    })
    .filter((item) => {
      const ownAccess = canAccessNavItem(
        authSession,
        item,
        currentRole,
        enabledApps,
      );

      const hasVisibleChildren = Boolean(item.items && item.items.length > 0);

      return ownAccess || hasVisibleChildren;
    });
}

function filterNavGroups(
  groups: NavGroup[],
  authSession: SidebarAuthSession,
  currentRole: string,
  enabledApps: string[],
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: filterNavItems(group.items, authSession, currentRole, enabledApps),
    }))
    .filter((group) => group.items.length > 0);
}

function hasActiveChild(pathname: string, item: NavItem): boolean {
  return Boolean(
    item.items?.some((subItem) => {
      if (isItemActive(pathname, subItem)) return true;

      return hasActiveChild(pathname, subItem);
    }),
  );
}

/* =====================================================
   COMPONENT
===================================================== */

export function NavMain({ type }: NavMainProps) {
  const pathname = usePathname();
  const authSession = useAuth() as SidebarAuthSession;

  const [locale, setLocale] = useState<AppLocale>("ar");

  const currentRole = String(authSession.role || "").toLowerCase();
  const enabledApps = Array.isArray(authSession.subscription?.apps)
    ? authSession.subscription.apps.map((app) => String(app).toLowerCase())
    : [];

  useEffect(() => {
    const syncLocale = () => {
      const nextLocale = getStoredLocale();

      applyDocumentLocale(nextLocale);
      setLocale(nextLocale);
    };

    const syncLocaleAfterPaint = () => {
      syncLocale();

      window.setTimeout(() => {
        syncLocale();
      }, 0);
    };

    syncLocaleAfterPaint();

    window.addEventListener("primey-locale-changed", syncLocaleAfterPaint);
    window.addEventListener("storage", syncLocaleAfterPaint);

    return () => {
      window.removeEventListener("primey-locale-changed", syncLocaleAfterPaint);
      window.removeEventListener("storage", syncLocaleAfterPaint);
    };
  }, []);

  const isArabic = locale === "ar";
  const ChevronIcon = isArabic ? ChevronLeft : ChevronRight;

  const navItems = useMemo(() => {
    const sourceGroups =
      type === "system"
        ? systemNavItems
        : type === "customer"
          ? customerNavItems
          : type === "agent"
            ? agentNavItems
            : companyNavItems;

    const filteredGroups = filterNavGroups(
      sourceGroups,
      authSession,
      currentRole,
      enabledApps,
    );

    if (filteredGroups.length > 0) {
      return filteredGroups;
    }

    const normalizedRole = currentRole.trim().toLowerCase();
    const authRecord = authSession as Record<string, unknown>;
    const workspaceHint = String(
      authRecord.workspace ||
        authRecord.workspace_type ||
        authRecord.active_workspace ||
        "",
    )
      .trim()
      .toLowerCase();
    const hasAuthenticatedUser = Boolean(
      authSession.user ||
        authRecord.user ||
        authRecord.email ||
        authRecord.id ||
        authRecord.user_id,
    );
    const canUseSystemFallback =
      type === "system" &&
      hasAuthenticatedUser &&
      (authSession.is_superuser === true ||
        authSession.is_staff === true ||
        authSession.is_system_user === true ||
        normalizedRole === "super_admin" ||
        normalizedRole === "system_admin" ||
        normalizedRole === "admin" ||
        normalizedRole === "staff");
    const companyFallbackRoles = [
      "owner",
      "admin",
      "manager",
      "accountant",
      "cashier",
      "sales",
      "inventory",
      "hr",
      "employee",
      "viewer",
      "retail",
    ];
    const canUseCompanyFallback =
      (type === "company" || type === "center" || type === "provider") &&
      hasAuthenticatedUser &&
      (workspaceHint === "company" ||
        workspaceHint === "center" ||
        workspaceHint === "provider" ||
        authRecord.is_company_user === true ||
        authRecord.is_company_admin === true ||
        Boolean(
          authRecord.company ||
            authRecord.company_id ||
            authRecord.current_company ||
            authRecord.active_company,
        ) ||
        companyFallbackRoles.includes(normalizedRole));
    if (canUseSystemFallback || canUseCompanyFallback) {
      return sourceGroups;
    }
    return filteredGroups;}, [type, authSession, currentRole, enabledApps]);

  const getRowClassName = (level: number) =>
    cn(
      "group/nav-row flex w-full min-w-0 items-center gap-2",
      isArabic ? "flex-row-reverse text-right" : "flex-row text-left",
      level === 0 ? "px-0" : "px-0",
    );

  const renderIconWrap = (
    Icon: LucideIcon | undefined,
    active: boolean,
    level: number,
  ) => {
    if (!Icon) return null;

    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl transition",
          level === 0 ? "size-8" : "size-7",
          active
            ? "bg-primary/12 text-primary"
            : "bg-slate-100/70 text-muted-foreground group-hover/nav-row:bg-primary/10 group-hover/nav-row:text-primary",
          "dark:bg-white/[0.055] dark:group-hover/nav-row:bg-primary/15",
        )}
      >
        <Icon className={cn(level === 0 ? "size-4" : "size-3.5")} />
      </span>
    );
  };

  const renderNewBadge = (item: NavItem) => {
    if (!item.isNew && !item.isDataBadge) return null;

    return (
      <SidebarMenuBadge
        className={cn(
          "rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary",
          "dark:border-primary/20 dark:bg-primary/15",
        )}
      >
        {item.isDataBadge || (isArabic ? "جديد" : "New")}
      </SidebarMenuBadge>
    );
  };

  const renderNavNode = (item: NavItem, level = 0) => {
    const Icon = item.icon;
    const itemTitle = isArabic ? item.title.ar : item.title.en;
    const active = isItemActive(pathname, item);
    const activeParent = active || hasActiveChild(pathname, item);
    const hasChildren = Boolean(item.items?.length);

    const rowClassName = getRowClassName(level);

    if (hasChildren) {
      if (level === 0) {
        return (
          <SidebarMenuItem key={`${item.href}-${item.title.en}`}>
            <Collapsible defaultOpen={activeParent}>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={itemTitle}
                  isActive={activeParent}
                  className={cn(
                    "h-11 rounded-2xl px-2 transition-all",
                    "text-muted-foreground hover:bg-white/76 hover:text-foreground hover:shadow-sm",
                    "data-[active=true]:bg-gradient-to-b data-[active=true]:from-primary/14 data-[active=true]:to-primary/7 data-[active=true]:text-primary data-[active=true]:shadow-sm",
                    "dark:hover:bg-white/[0.065] dark:data-[active=true]:from-primary/20 dark:data-[active=true]:to-primary/10",
                  )}
                >
                  <div className={rowClassName}>
                    {renderIconWrap(Icon, activeParent, level)}

                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {itemTitle}
                    </span>

                    {renderNewBadge(item)}

                    <ChevronIcon
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        activeParent ? "text-primary" : "",
                      )}
                    />
                  </div>
                </SidebarMenuButton>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <SidebarMenuSub
                  className={cn(
                    "my-1 space-y-1 border-slate-200/70 py-1",
                    isArabic
                      ? "mr-4 border-r pr-2"
                      : "ml-4 border-l pl-2",
                    "dark:border-white/10",
                  )}
                >
                  {item.items?.map((child) => renderNavNode(child, level + 1))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
        );
      }

      return (
        <SidebarMenuSubItem key={`${item.href}-${item.title.en}`}>
          <Collapsible defaultOpen={activeParent}>
            <CollapsibleTrigger asChild>
              <SidebarMenuSubButton
                isActive={activeParent}
                className={cn(
                  "h-10 rounded-xl px-2 transition-all",
                  "text-muted-foreground hover:bg-white/70 hover:text-foreground hover:shadow-sm",
                  "data-[active=true]:bg-primary/10 data-[active=true]:text-primary",
                  "dark:hover:bg-white/[0.055] dark:data-[active=true]:bg-primary/15",
                )}
              >
                <div className={rowClassName}>
                  {renderIconWrap(Icon, activeParent, level)}

                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {itemTitle}
                  </span>

                  {renderNewBadge(item)}

                  <ChevronIcon
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                      activeParent ? "text-primary" : "",
                    )}
                  />
                </div>
              </SidebarMenuSubButton>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarMenuSub
                className={cn(
                  "my-1 space-y-1 border-slate-200/70 py-1",
                  isArabic ? "mr-3 border-r pr-2" : "ml-3 border-l pl-2",
                  "dark:border-white/10",
                )}
              >
                {item.items?.map((child) => renderNavNode(child, level + 1))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuSubItem>
      );
    }

    if (level === 0) {
      return (
        <SidebarMenuItem key={`${item.href}-${item.title.en}`}>
          <SidebarMenuButton
            tooltip={itemTitle}
            isActive={active}
            asChild
            className={cn(
              "h-11 rounded-2xl px-2 transition-all",
              "text-muted-foreground hover:bg-white/76 hover:text-foreground hover:shadow-sm",
              "data-[active=true]:bg-gradient-to-b data-[active=true]:from-primary/14 data-[active=true]:to-primary/7 data-[active=true]:text-primary data-[active=true]:shadow-sm",
              "dark:hover:bg-white/[0.065] dark:data-[active=true]:from-primary/20 dark:data-[active=true]:to-primary/10",
            )}
          >
            <Link
              href={item.href}
              target={item.newTab ? "_blank" : undefined}
              className={rowClassName}
            >
              {renderIconWrap(Icon, active, level)}

              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {itemTitle}
              </span>

              {renderNewBadge(item)}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuSubItem key={`${item.href}-${item.title.en}`}>
        <SidebarMenuSubButton
          asChild
          isActive={active}
          className={cn(
            "h-10 rounded-xl px-2 transition-all",
            "text-muted-foreground hover:bg-white/70 hover:text-foreground hover:shadow-sm",
            "data-[active=true]:bg-primary/10 data-[active=true]:text-primary",
            "dark:hover:bg-white/[0.055] dark:data-[active=true]:bg-primary/15",
          )}
        >
          <Link
            href={item.href}
            target={item.newTab ? "_blank" : undefined}
            className={rowClassName}
          >
            {renderIconWrap(Icon, active, level)}

            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {itemTitle}
            </span>

            {renderNewBadge(item)}
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  return (
    <>
      {navItems.map((nav) => {
        const groupTitle = isArabic ? nav.title.ar : nav.title.en;

        return (
          <SidebarGroup
            key={nav.title.en || "primey-main-navigation"}
            className="px-0 py-1"
          >
            {groupTitle ? (
              <SidebarGroupLabel
                className={cn(
                  "mb-2 px-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70",
                  isArabic ? "text-right" : "text-left",
                )}
              >
                {groupTitle}
              </SidebarGroupLabel>
            ) : null}

            <SidebarGroupContent>
              <SidebarMenu className="space-y-1.5">
                {nav.items.map((item) => renderNavNode(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </>
  );
}
