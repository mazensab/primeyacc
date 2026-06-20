"use client";

/* =====================================================
   📂 components/layout/sidebar/nav-main.tsx
   🧠 Primey Care — Main Sidebar Navigation
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
    title: { ar: "", en: "" },
    items: [
      {
        title: { ar: "لوحة التحكم", en: "Dashboard" },
        href: "/system",
        icon: Home,
        permission: PERMISSIONS.SYSTEM_VIEW,
        workspaces: ["system"],
      },
      {
        title: { ar: "المالية", en: "Finance" },
        href: "/system/treasury",
        icon: Calculator,
        anyPermissions: [
          PERMISSIONS.ACCOUNTING_VIEW,
          PERMISSIONS.TREASURY_VIEW,
        ],
        workspaces: ["system"],
        items: [
          {
            title: { ar: "الخزينة", en: "Treasury" },
            href: "/system/treasury",
            icon: Wallet,
            permission: PERMISSIONS.TREASURY_VIEW,
            workspaces: ["system"],
          },
          {
            title: { ar: "المحاسبة", en: "Accounting" },
            href: "/system/accounting",
            icon: Calculator,
            permission: PERMISSIONS.ACCOUNTING_VIEW,
            workspaces: ["system"],
          },
        ],
      },
      {
        title: { ar: "شبكة الخدمة", en: "Service Network" },
        href: "/system/providers",
        icon: Stethoscope,
        anyPermissions: [
          PERMISSIONS.PROVIDERS_VIEW,
          PERMISSIONS.CONTRACTS_VIEW,
          PERMISSIONS.AGENTS_VIEW,
        ],
        workspaces: ["system"],
        items: [
          {
            title: { ar: "مقدمو الخدمة", en: "Providers" },
            href: "/system/providers",
            icon: Stethoscope,
            permission: PERMISSIONS.PROVIDERS_VIEW,
            workspaces: ["system"],
          },
          {
            title: { ar: "العقود", en: "Contracts" },
            href: "/system/contracts",
            icon: FileText,
            permission: PERMISSIONS.CONTRACTS_VIEW,
            workspaces: ["system"],
          },
          {
            title: { ar: "الوسطاء", en: "Brokers" },
            href: "/system/brokers",
            icon: Users,
            permission: PERMISSIONS.AGENTS_VIEW,
            workspaces: ["system"],
          },
          {
            title: { ar: "المندوبون", en: "Agents" },
            href: "/system/agents",
            icon: Briefcase,
            permission: PERMISSIONS.AGENTS_VIEW,
            workspaces: ["system"],
          },
        ],
      },
      {
        title: { ar: "العمليات", en: "Operations" },
        href: "/system/customers",
        icon: ShoppingCart,
        anyPermissions: [
          PERMISSIONS.CUSTOMERS_VIEW,
          PERMISSIONS.ORDERS_VIEW,
          PERMISSIONS.INVOICES_VIEW,
          PERMISSIONS.PAYMENTS_VIEW,
          PERMISSIONS.PRODUCTS_VIEW,
        ],
        workspaces: ["system"],
        items: [
          {
            title: { ar: "العملاء", en: "Customers" },
            href: "/system/customers",
            icon: Users,
            permission: PERMISSIONS.CUSTOMERS_VIEW,
            workspaces: ["system"],
          },
          {
            title: { ar: "المنتجات والبرامج", en: "Products & Programs" },
            href: "/system/products",
            icon: Boxes,
            permission: PERMISSIONS.PRODUCTS_VIEW,
            workspaces: ["system"],
          },
          {
            title: { ar: "الطلبات", en: "Orders" },
            href: "/system/orders",
            icon: ShoppingCart,
            permission: PERMISSIONS.ORDERS_VIEW,
            workspaces: ["system"],
          },
          {
            title: { ar: "الفواتير", en: "Invoices" },
            href: "/system/invoices",
            icon: ReceiptText,
            permission: PERMISSIONS.INVOICES_VIEW,
            workspaces: ["system"],
          },
          {
            title: { ar: "المدفوعات", en: "Payments" },
            href: "/system/payments",
            icon: CreditCard,
            permission: PERMISSIONS.PAYMENTS_VIEW,
            workspaces: ["system"],
          },
        ],
      },
      {
        title: { ar: "التقارير", en: "Reports" },
        href: "/system/reports",
        icon: BarChart3,
        permission: PERMISSIONS.REPORTS_VIEW,
        workspaces: ["system"],
        items: [
          {
            title: { ar: "لوحة التقارير", en: "Reports Overview" },
            href: "/system/reports",
            icon: BarChart3,
            permission: PERMISSIONS.REPORTS_VIEW,
            workspaces: ["system"],
          },
          {
            title: { ar: "تقارير العملاء", en: "Customers Reports" },
            href: "/system/reports/customers",
            icon: Users,
            anyPermissions: [
              PERMISSIONS.REPORTS_VIEW,
              PERMISSIONS.REPORTS_CUSTOMERS_VIEW,
            ],
            workspaces: ["system"],
          },
          {
            title: { ar: "تقارير مقدمي الخدمة", en: "Providers Reports" },
            href: "/system/reports/providers",
            icon: Stethoscope,
            anyPermissions: [
              PERMISSIONS.REPORTS_VIEW,
              PERMISSIONS.REPORTS_PROVIDERS_VIEW,
            ],
            workspaces: ["system"],
          },
          {
            title: { ar: "تقارير الطلبات", en: "Orders Reports" },
            href: "/system/reports/orders",
            icon: ShoppingCart,
            anyPermissions: [
              PERMISSIONS.REPORTS_VIEW,
              PERMISSIONS.REPORTS_ORDERS_VIEW,
            ],
            workspaces: ["system"],
          },
          {
            title: { ar: "تقارير الفواتير", en: "Invoices Reports" },
            href: "/system/reports/invoices",
            icon: ReceiptText,
            anyPermissions: [
              PERMISSIONS.REPORTS_VIEW,
              PERMISSIONS.REPORTS_INVOICES_VIEW,
            ],
            workspaces: ["system"],
          },
          {
            title: { ar: "تقارير المدفوعات", en: "Payments Reports" },
            href: "/system/reports/payments",
            icon: CreditCard,
            anyPermissions: [
              PERMISSIONS.REPORTS_VIEW,
              PERMISSIONS.REPORTS_PAYMENTS_VIEW,
            ],
            workspaces: ["system"],
          },
          {
            title: { ar: "تقارير الخزينة", en: "Treasury Reports" },
            href: "/system/reports/treasury",
            icon: Wallet,
            anyPermissions: [
              PERMISSIONS.REPORTS_VIEW,
              PERMISSIONS.TREASURY_VIEW,
            ],
            workspaces: ["system"],
          },
          {
            title: { ar: "تقارير المحاسبة", en: "Accounting Reports" },
            href: "/system/reports/accounting",
            icon: Calculator,
            anyPermissions: [
              PERMISSIONS.REPORTS_VIEW,
              PERMISSIONS.REPORTS_ACCOUNTING_VIEW,
              PERMISSIONS.ACCOUNTING_VIEW,
            ],
            workspaces: ["system"],
          },
        ],
      },
      {
        title: {
          ar: "الإشعارات والتواصل",
          en: "Notifications & Communication",
        },
        href: "/system/notifications",
        icon: BellRing,
        anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
        workspaces: ["system"],
        items: [
          {
            title: { ar: "الإشعارات", en: "Notifications" },
            href: "/system/notifications",
            icon: BellRing,
            anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
            workspaces: ["system"],
          },
          {
            title: { ar: "واتساب", en: "WhatsApp" },
            href: "/system/whatsapp",
            icon: MessageCircle,
            anyPermissions: [PERMISSIONS.SYSTEM_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
            workspaces: ["system"],
          },
        ],
      },
      {
        title: { ar: "النظام", en: "System" },
        href: "/system/users",
        icon: UserCog,
        anyPermissions: [PERMISSIONS.USERS_VIEW, PERMISSIONS.SYSTEM_SETTINGS],
        workspaces: ["system"],
        items: [
          {
            title: { ar: "مستخدمو النظام", en: "System Users" },
            href: "/system/users",
            icon: UserCog,
            permission: PERMISSIONS.USERS_VIEW,
            workspaces: ["system"],
          },
          {
            title: { ar: "الإعدادات", en: "Settings" },
            href: "/system/settings",
            icon: Settings,
            permission: PERMISSIONS.SYSTEM_SETTINGS,
            workspaces: ["system"],
          },
        ],
      },
    ],
  },
];

/* =====================================================
   PROVIDER WORKSPACE NAV
===================================================== */

const companyNavItems: NavGroup[] = [
  {
    title: {
      ar: "مساحة مقدم الخدمة",
      en: "Provider Workspace",
    },
    items: [
      {
        title: { ar: "الرئيسية", en: "Home" },
        href: "/company",
        aliases: ["/center", "/provider"],
        icon: Home,
        permission: PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
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
        title: { ar: "الطلبات", en: "Orders" },
        href: "/company/orders",
        aliases: ["/center/orders", "/provider/orders"],
        icon: ShoppingCart,
        anyPermissions: [
          PERMISSIONS.PROVIDER_ORDERS_VIEW,
          PERMISSIONS.ORDERS_VIEW,
        ],
        workspaces: ["company"],
      },
      {
        title: { ar: "المنتجات", en: "Products" },
        href: "/company/products",
        aliases: ["/center/products", "/provider/products"],
        icon: Boxes,
        permission: PERMISSIONS.PRODUCTS_VIEW,
        workspaces: ["company"],
      },
      {
        title: { ar: "العقود", en: "Contracts" },
        href: "/company/contracts",
        aliases: ["/center/contracts", "/provider/contracts"],
        icon: FileText,
        anyPermissions: [
          PERMISSIONS.PROVIDER_CONTRACTS_VIEW,
          PERMISSIONS.CONTRACTS_VIEW,
        ],
        workspaces: ["company"],
      },
      {
        title: { ar: "الفواتير", en: "Invoices" },
        href: "/company/invoices",
        aliases: ["/center/invoices", "/provider/invoices"],
        icon: ReceiptText,
        permission: PERMISSIONS.INVOICES_VIEW,
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
      {
        title: { ar: "المستخدمون", en: "Users" },
        href: "/company/users",
        aliases: ["/center/users", "/provider/users"],
        icon: UserCog,
        roles: ["provider_admin", "system_admin"],
        workspaces: ["company"],
      },
      {
        title: { ar: "الإعدادات", en: "Settings" },
        href: "/company/settings",
        aliases: ["/center/settings", "/provider/settings"],
        icon: Settings,
        roles: ["provider_admin", "system_admin"],
        workspaces: ["company"],
      },
    ],
  },
];

/* =====================================================
   CUSTOMER NAV
===================================================== */

const customerNavItems: NavGroup[] = [
  {
    title: {
      ar: "مساحة العميل",
      en: "Customer Workspace",
    },
    items: [
      {
        title: { ar: "الرئيسية", en: "Home" },
        href: "/customer",
        icon: Home,
        permission: PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "العروض والخصومات", en: "Offers & Discounts" },
        href: "/customer/offers",
        icon: Gift,
        permission: PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "الشبكة الطبية", en: "Medical Network" },
        href: "/customer/network",
        icon: Stethoscope,
        permission: PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "طلباتي", en: "My Orders" },
        href: "/customer/orders",
        icon: ShoppingCart,
        permission: PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "فواتيري", en: "My Invoices" },
        href: "/customer/invoices",
        icon: ReceiptText,
        permission: PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "مدفوعاتي", en: "My Payments" },
        href: "/customer/payments",
        icon: CreditCard,
        permission: PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "بطاقاتي", en: "My Cards" },
        href: "/customer/cards",
        icon: Package,
        permission: PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "الدعم", en: "Support" },
        href: "/customer/support",
        icon: MessageCircle,
        permission: PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
        workspaces: ["customer"],
      },
      {
        title: { ar: "حسابي", en: "My Profile" },
        href: "/customer/profile",
        icon: ShieldCheck,
        permission: PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
        workspaces: ["customer"],
      },
    ],
  },
];

/* =====================================================
   AGENT NAV
===================================================== */

const agentNavItems: NavGroup[] = [
  {
    title: {
      ar: "مساحة المندوب",
      en: "Agent Workspace",
    },
    items: [
      {
        title: { ar: "الرئيسية", en: "Home" },
        href: "/agent",
        icon: Home,
        permission: PERMISSIONS.AGENT_WORKSPACE_VIEW,
        workspaces: ["agent"],
      },
      {
        title: { ar: "عملائي", en: "My Customers" },
        href: "/agent/customers",
        icon: Users,
        anyPermissions: [
          PERMISSIONS.AGENT_CUSTOMERS_VIEW,
          PERMISSIONS.CUSTOMERS_VIEW,
        ],
        workspaces: ["agent"],
      },
      {
        title: { ar: "طلباتي", en: "My Orders" },
        href: "/agent/orders",
        icon: ShoppingCart,
        permission: PERMISSIONS.ORDERS_VIEW,
        workspaces: ["agent"],
      },
      {
        title: { ar: "عمولاتي", en: "My Commissions" },
        href: "/agent/commissions",
        icon: Wallet,
        permission: PERMISSIONS.AGENT_COMMISSIONS_VIEW,
        workspaces: ["agent"],
      },
      {
        title: { ar: "مدفوعاتي", en: "My Payments" },
        href: "/agent/payments",
        icon: CreditCard,
        permission: PERMISSIONS.PAYMENTS_VIEW,
        workspaces: ["agent"],
      },
      {
        title: { ar: "حسابي", en: "My Account" },
        href: "/agent/account",
        icon: ShieldCheck,
        permission: PERMISSIONS.AGENT_WORKSPACE_VIEW,
        workspaces: ["agent"],
      },
      {
        title: { ar: "الإعدادات", en: "Settings" },
        href: "/agent/settings",
        icon: Settings,
        permission: PERMISSIONS.AGENT_WORKSPACE_VIEW,
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
    if (type === "system") {
      return filterNavGroups(
        systemNavItems,
        authSession,
        currentRole,
        enabledApps,
      );
    }

    if (type === "customer") {
      return filterNavGroups(
        customerNavItems,
        authSession,
        currentRole,
        enabledApps,
      );
    }

    if (type === "agent") {
      return filterNavGroups(
        agentNavItems,
        authSession,
        currentRole,
        enabledApps,
      );
    }

    return filterNavGroups(
      companyNavItems,
      authSession,
      currentRole,
      enabledApps,
    );
  }, [type, authSession, currentRole, enabledApps]);

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