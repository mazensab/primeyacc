// ======================================================
// 📂 الملف: lib/permissions.ts
// 🧭 Primey Care — Frontend Roles & Permissions Core
// 🚀 الإصدار: Permissions Frontend V2.2
// ------------------------------------------------------
// ✅ مصدر مركزي لصلاحيات الفرونت
// ✅ يدعم Sidebar / Pages / Actions / Middleware Guards
// ✅ متوافق مع whoami.permission_codes
// ✅ متوافق مع whoami.permissions.codes
// ✅ متوافق مع whoami.profile_permissions.codes
// ✅ متوافق مع AuthProvider
// ✅ متوافق مع SidebarAuthSession بدون كسر الأنواع
// ✅ مصفوفة صلاحيات نهائية لكل Role
// ✅ system_admin / superuser يتجاوز كل القيود
// ✅ provider هو المسار الرسمي و company/center توافق خلفي
// ✅ تمت إضافة صلاحيات تقارير المرحلة 13
// ======================================================

import type {
  AppRole,
  AuthSession,
  PermissionCode,
} from "@/components/providers/AuthProvider";

// ======================================================
// TYPES
// ======================================================

export type AppWorkspace = "system" | "provider" | "customer" | "agent";

export type PrimeyRole =
  | "system_admin"
  | "accountant"
  | "support"
  | "viewer"
  | "provider_admin"
  | "customer_user"
  | "agent_user";

export type PrimeyPermissionCode = PermissionCode | (string & {});

export type PermissionCheckInput = {
  permission?: PrimeyPermissionCode | null;
  permissions?: readonly PrimeyPermissionCode[] | null;
  anyPermissions?: readonly PrimeyPermissionCode[] | null;
  allPermissions?: readonly PrimeyPermissionCode[] | null;
  role?: AppRole | PrimeyRole | string | null;
  roles?: readonly (AppRole | PrimeyRole | string)[] | null;
  workspace?: AppWorkspace | string | null;
  workspaces?: readonly (AppWorkspace | string)[] | null;
};

export type PermissionedItem<T = Record<string, unknown>> = T & {
  permission?: PrimeyPermissionCode | null;
  permissions?: readonly PrimeyPermissionCode[] | null;
  anyPermissions?: readonly PrimeyPermissionCode[] | null;
  allPermissions?: readonly PrimeyPermissionCode[] | null;
  role?: AppRole | PrimeyRole | string | null;
  roles?: readonly (AppRole | PrimeyRole | string)[] | null;
  workspace?: AppWorkspace | string | null;
  workspaces?: readonly (AppWorkspace | string)[] | null;
  children?: PermissionedItem<T>[];
};

export type PathAccessRule = {
  prefix: string;
  permissions?: readonly PrimeyPermissionCode[];
  roles?: readonly string[];
  workspaces?: readonly string[];
};

export type PermissionSession = Partial<AuthSession> & {
  authenticated?: boolean;
  role?: string | null;
  workspace?: string | null;
  dashboard_path?: string | null;
  is_system_user?: boolean;
  is_superuser?: boolean;
  is_staff?: boolean;
  permission_codes?: readonly string[] | null;
  profile?: {
    role?: string | null;
    workspace?: string | null;
    user_type?: string | null;
    preferred_language?: string | null;
    [key: string]: unknown;
  } | null;
  permissions?: {
    codes?: readonly string[] | null;
    groups?: readonly string[] | null;
    is_superuser?: boolean;
    is_staff?: boolean;
  } | null;
  profile_permissions?: {
    codes?: readonly string[] | null;
    groups?: readonly string[] | null;
    role?: string | null;
    workspace?: string | null;
    is_superuser?: boolean;
    is_staff?: boolean;
    [key: string]: unknown;
  } | null;
  subscription?: {
    apps?: readonly string[] | null;
    [key: string]: unknown;
  } | null;
};

export type RolePermissionMatrix = Record<
  PrimeyRole,
  readonly PrimeyPermissionCode[]
>;

// ======================================================
// ROLES
// ======================================================

export const ROLES = {
  SYSTEM_ADMIN: "system_admin",
  ACCOUNTANT: "accountant",
  SUPPORT: "support",
  VIEWER: "viewer",
  PROVIDER_ADMIN: "provider_admin",
  CUSTOMER_USER: "customer_user",
  AGENT_USER: "agent_user",
} as const;

export const SYSTEM_ROLES = [
  ROLES.SYSTEM_ADMIN,
  ROLES.ACCOUNTANT,
  ROLES.SUPPORT,
  ROLES.VIEWER,
] as const;

export const PROVIDER_ROLES = [ROLES.PROVIDER_ADMIN] as const;
export const CUSTOMER_ROLES = [ROLES.CUSTOMER_USER] as const;
export const AGENT_ROLES = [ROLES.AGENT_USER] as const;

export const ALL_ROLES = [
  ROLES.SYSTEM_ADMIN,
  ROLES.ACCOUNTANT,
  ROLES.SUPPORT,
  ROLES.VIEWER,
  ROLES.PROVIDER_ADMIN,
  ROLES.CUSTOMER_USER,
  ROLES.AGENT_USER,
] as const;

// ======================================================
// ROLE ALIASES
// ======================================================

export const ROLE_ALIASES: Record<string, PrimeyRole> = {
  system: ROLES.SYSTEM_ADMIN,
  super_admin: ROLES.SYSTEM_ADMIN,
  system_admin: ROLES.SYSTEM_ADMIN,
  admin: ROLES.SYSTEM_ADMIN,
  staff: ROLES.SYSTEM_ADMIN,

  accountant: ROLES.ACCOUNTANT,
  finance: ROLES.ACCOUNTANT,
  finance_manager: ROLES.ACCOUNTANT,
  treasury: ROLES.ACCOUNTANT,

  support: ROLES.SUPPORT,
  internal: ROLES.SUPPORT,

  viewer: ROLES.VIEWER,
  readonly: ROLES.VIEWER,

  provider: ROLES.PROVIDER_ADMIN,
  provider_admin: ROLES.PROVIDER_ADMIN,
  center: ROLES.PROVIDER_ADMIN,
  center_admin: ROLES.PROVIDER_ADMIN,
  service_provider: ROLES.PROVIDER_ADMIN,
  company: ROLES.PROVIDER_ADMIN,
  company_admin: ROLES.PROVIDER_ADMIN,
  company_owner: ROLES.PROVIDER_ADMIN,
  owner: ROLES.PROVIDER_ADMIN,

  customer: ROLES.CUSTOMER_USER,
  customer_user: ROLES.CUSTOMER_USER,

  agent: ROLES.AGENT_USER,
  agent_user: ROLES.AGENT_USER,
  agent_admin: ROLES.AGENT_USER,
  broker: ROLES.AGENT_USER,
  broker_user: ROLES.AGENT_USER,
  broker_admin: ROLES.AGENT_USER,
};

// ======================================================
// PERMISSION CODES
// لازم تتطابق مع auth_center/permissions.py قدر الإمكان
// ======================================================

export const PERMISSIONS = {
  // System
  SYSTEM_VIEW: "system.view",
  SYSTEM_SETTINGS: "system.settings",

  // Users
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",
  USERS_ACTIVATE: "users.activate",
  USERS_DEACTIVATE: "users.deactivate",
  USERS_DISABLE: "users.disable",
  USERS_SEND_PASSWORD_LINK: "users.send_password_link",

  // Customers
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_EDIT: "customers.edit",
  CUSTOMERS_DELETE: "customers.delete",
  CUSTOMERS_EXPORT: "customers.export",

  // Providers / Centers
  PROVIDERS_VIEW: "providers.view",
  PROVIDERS_CREATE: "providers.create",
  PROVIDERS_EDIT: "providers.edit",
  PROVIDERS_DELETE: "providers.delete",
  PROVIDERS_EXPORT: "providers.export",

  // Agents
  AGENTS_VIEW: "agents.view",
  AGENTS_CREATE: "agents.create",
  AGENTS_EDIT: "agents.edit",
  AGENTS_DELETE: "agents.delete",
  AGENTS_EXPORT: "agents.export",
  AGENTS_COMMISSIONS_VIEW: "agents.commissions.view",
  AGENTS_COMMISSIONS_APPROVE: "agents.commissions.approve",

  // Products
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_EDIT: "products.edit",
  PRODUCTS_DELETE: "products.delete",
  PRODUCTS_EXPORT: "products.export",

  // Orders
  ORDERS_VIEW: "orders.view",
  ORDERS_CREATE: "orders.create",
  ORDERS_EDIT: "orders.edit",
  ORDERS_DELETE: "orders.delete",
  ORDERS_APPROVE: "orders.approve",
  ORDERS_CANCEL: "orders.cancel",
  ORDERS_EXPORT: "orders.export",

  // Contracts
  CONTRACTS_VIEW: "contracts.view",
  CONTRACTS_CREATE: "contracts.create",
  CONTRACTS_EDIT: "contracts.edit",
  CONTRACTS_DELETE: "contracts.delete",
  CONTRACTS_APPROVE: "contracts.approve",
  CONTRACTS_EXPORT: "contracts.export",

  // Invoices
  INVOICES_VIEW: "invoices.view",
  INVOICES_CREATE: "invoices.create",
  INVOICES_EDIT: "invoices.edit",
  INVOICES_DELETE: "invoices.delete",
  INVOICES_ISSUE: "invoices.issue",
  INVOICES_CANCEL: "invoices.cancel",
  INVOICES_EXPORT: "invoices.export",

  // Payments
  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_CREATE: "payments.create",
  PAYMENTS_EDIT: "payments.edit",
  PAYMENTS_DELETE: "payments.delete",
  PAYMENTS_CONFIRM: "payments.confirm",
  PAYMENTS_CANCEL: "payments.cancel",
  PAYMENTS_EXPORT: "payments.export",

  // Accounting
  ACCOUNTING_VIEW: "accounting.view",
  ACCOUNTING_CREATE: "accounting.create",
  ACCOUNTING_EDIT: "accounting.edit",
  ACCOUNTING_DELETE: "accounting.delete",
  ACCOUNTING_POST: "accounting.post",
  ACCOUNTING_REPORTS_VIEW: "accounting.reports.view",
  ACCOUNTING_EXPORT: "accounting.export",

  // Treasury
  TREASURY_VIEW: "treasury.view",
  TREASURY_CREATE: "treasury.create",
  TREASURY_EDIT: "treasury.edit",
  TREASURY_DELETE: "treasury.delete",
  TREASURY_CONFIRM: "treasury.confirm",
  TREASURY_TRANSFER: "treasury.transfer",
  TREASURY_REPORTS_VIEW: "treasury.reports.view",
  TREASURY_SETTINGS: "treasury.settings",
  TREASURY_EXPORT: "treasury.export",

  // Reports
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  REPORTS_PRINT: "reports.print",
  REPORTS_CUSTOMERS_VIEW: "reports.customers.view",
  REPORTS_PROVIDERS_VIEW: "reports.providers.view",
  REPORTS_ORDERS_VIEW: "reports.orders.view",
  REPORTS_INVOICES_VIEW: "reports.invoices.view",
  REPORTS_PAYMENTS_VIEW: "reports.payments.view",
  REPORTS_ACCOUNTING_VIEW: "reports.accounting.view",

  // WhatsApp
  WHATSAPP_VIEW: "whatsapp.view",
  WHATSAPP_SETTINGS: "whatsapp.settings",
  WHATSAPP_TEMPLATES: "whatsapp.templates",
  WHATSAPP_BROADCASTS: "whatsapp.broadcasts",
  WHATSAPP_LOGS: "whatsapp.logs",

  // Notifications
  NOTIFICATIONS_VIEW: "notifications.view",
  NOTIFICATIONS_CREATE: "notifications.create",
  NOTIFICATIONS_SEND: "notifications.send",

  // Provider Workspace
  PROVIDER_WORKSPACE_VIEW: "provider_workspace.view",
  PROVIDER_ORDERS_VIEW: "provider_orders.view",
  PROVIDER_ORDERS_UPDATE_STATUS: "provider_orders.update_status",
  PROVIDER_CONTRACTS_VIEW: "provider_contracts.view",
  PROVIDER_USERS_VIEW: "provider_users.view",
  PROVIDER_USERS_CREATE: "provider_users.create",

  // Customer Workspace
  CUSTOMER_WORKSPACE_VIEW: "customer_workspace.view",
  CUSTOMER_ORDERS_VIEW: "customer_orders.view",
  CUSTOMER_ORDERS_CREATE: "customer_orders.create",
  CUSTOMER_CARDS_VIEW: "customer_cards.view",
  CUSTOMER_PRODUCTS_VIEW: "customer_products.view",
  CUSTOMER_SUPPORT_VIEW: "customer_support.view",
  CUSTOMER_SUPPORT_CREATE: "customer_support.create",
  CUSTOMER_ACCOUNT_VIEW: "customer_account.view",
  CUSTOMER_ACCOUNT_EDIT: "customer_account.edit",

  // Agent Workspace
  AGENT_WORKSPACE_VIEW: "agent_workspace.view",
  AGENT_CUSTOMERS_VIEW: "agent_customers.view",
  AGENT_CUSTOMERS_CREATE: "agent_customers.create",
  AGENT_CUSTOMERS_EDIT: "agent_customers.edit",
  AGENT_COMMISSIONS_VIEW: "agent_commissions.view",
  AGENT_ACCOUNT_VIEW: "agent_account.view",
  AGENT_ACCOUNT_EDIT: "agent_account.edit",
} as const;

// ======================================================
// ROLE PERMISSION MATRIX
// هذه المصفوفة للفرونت فقط.
// الحماية النهائية يجب أن تبقى في Backend Permission Classes.
// ======================================================

export const ROLE_PERMISSION_MATRIX: RolePermissionMatrix = {
  [ROLES.SYSTEM_ADMIN]: [
    PERMISSIONS.SYSTEM_VIEW,
    PERMISSIONS.SYSTEM_SETTINGS,

    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_ACTIVATE,
    PERMISSIONS.USERS_DEACTIVATE,
    PERMISSIONS.USERS_DISABLE,
    PERMISSIONS.USERS_SEND_PASSWORD_LINK,

    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.CUSTOMERS_DELETE,
    PERMISSIONS.CUSTOMERS_EXPORT,

    PERMISSIONS.PROVIDERS_VIEW,
    PERMISSIONS.PROVIDERS_CREATE,
    PERMISSIONS.PROVIDERS_EDIT,
    PERMISSIONS.PROVIDERS_DELETE,
    PERMISSIONS.PROVIDERS_EXPORT,

    PERMISSIONS.AGENTS_VIEW,
    PERMISSIONS.AGENTS_CREATE,
    PERMISSIONS.AGENTS_EDIT,
    PERMISSIONS.AGENTS_DELETE,
    PERMISSIONS.AGENTS_EXPORT,
    PERMISSIONS.AGENTS_COMMISSIONS_VIEW,
    PERMISSIONS.AGENTS_COMMISSIONS_APPROVE,

    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_EDIT,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.PRODUCTS_EXPORT,

    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.ORDERS_DELETE,
    PERMISSIONS.ORDERS_APPROVE,
    PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.ORDERS_EXPORT,

    PERMISSIONS.CONTRACTS_VIEW,
    PERMISSIONS.CONTRACTS_CREATE,
    PERMISSIONS.CONTRACTS_EDIT,
    PERMISSIONS.CONTRACTS_DELETE,
    PERMISSIONS.CONTRACTS_APPROVE,
    PERMISSIONS.CONTRACTS_EXPORT,

    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_EDIT,
    PERMISSIONS.INVOICES_DELETE,
    PERMISSIONS.INVOICES_ISSUE,
    PERMISSIONS.INVOICES_CANCEL,
    PERMISSIONS.INVOICES_EXPORT,

    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_CREATE,
    PERMISSIONS.PAYMENTS_EDIT,
    PERMISSIONS.PAYMENTS_DELETE,
    PERMISSIONS.PAYMENTS_CONFIRM,
    PERMISSIONS.PAYMENTS_CANCEL,
    PERMISSIONS.PAYMENTS_EXPORT,

    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_CREATE,
    PERMISSIONS.ACCOUNTING_EDIT,
    PERMISSIONS.ACCOUNTING_DELETE,
    PERMISSIONS.ACCOUNTING_POST,
    PERMISSIONS.ACCOUNTING_REPORTS_VIEW,
    PERMISSIONS.ACCOUNTING_EXPORT,

    PERMISSIONS.TREASURY_VIEW,
    PERMISSIONS.TREASURY_CREATE,
    PERMISSIONS.TREASURY_EDIT,
    PERMISSIONS.TREASURY_DELETE,
    PERMISSIONS.TREASURY_CONFIRM,
    PERMISSIONS.TREASURY_TRANSFER,
    PERMISSIONS.TREASURY_REPORTS_VIEW,
    PERMISSIONS.TREASURY_SETTINGS,
    PERMISSIONS.TREASURY_EXPORT,

    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.REPORTS_PRINT,
    PERMISSIONS.REPORTS_CUSTOMERS_VIEW,
    PERMISSIONS.REPORTS_PROVIDERS_VIEW,
    PERMISSIONS.REPORTS_ORDERS_VIEW,
    PERMISSIONS.REPORTS_INVOICES_VIEW,
    PERMISSIONS.REPORTS_PAYMENTS_VIEW,
    PERMISSIONS.REPORTS_ACCOUNTING_VIEW,

    PERMISSIONS.WHATSAPP_VIEW,
    PERMISSIONS.WHATSAPP_SETTINGS,
    PERMISSIONS.WHATSAPP_TEMPLATES,
    PERMISSIONS.WHATSAPP_BROADCASTS,
    PERMISSIONS.WHATSAPP_LOGS,

    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_CREATE,
    PERMISSIONS.NOTIFICATIONS_SEND,

    PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
    PERMISSIONS.PROVIDER_ORDERS_VIEW,
    PERMISSIONS.PROVIDER_ORDERS_UPDATE_STATUS,
    PERMISSIONS.PROVIDER_CONTRACTS_VIEW,
    PERMISSIONS.PROVIDER_USERS_VIEW,
    PERMISSIONS.PROVIDER_USERS_CREATE,

    PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
    PERMISSIONS.CUSTOMER_ORDERS_VIEW,
    PERMISSIONS.CUSTOMER_ORDERS_CREATE,
    PERMISSIONS.CUSTOMER_CARDS_VIEW,
    PERMISSIONS.CUSTOMER_PRODUCTS_VIEW,
    PERMISSIONS.CUSTOMER_SUPPORT_VIEW,
    PERMISSIONS.CUSTOMER_SUPPORT_CREATE,
    PERMISSIONS.CUSTOMER_ACCOUNT_VIEW,
    PERMISSIONS.CUSTOMER_ACCOUNT_EDIT,

    PERMISSIONS.AGENT_WORKSPACE_VIEW,
    PERMISSIONS.AGENT_CUSTOMERS_VIEW,
    PERMISSIONS.AGENT_CUSTOMERS_CREATE,
    PERMISSIONS.AGENT_CUSTOMERS_EDIT,
    PERMISSIONS.AGENT_COMMISSIONS_VIEW,
    PERMISSIONS.AGENT_ACCOUNT_VIEW,
    PERMISSIONS.AGENT_ACCOUNT_EDIT,
  ],

  [ROLES.ACCOUNTANT]: [
    PERMISSIONS.SYSTEM_VIEW,

    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.AGENTS_VIEW,
    PERMISSIONS.PROVIDERS_VIEW,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.CONTRACTS_VIEW,

    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_EDIT,
    PERMISSIONS.INVOICES_ISSUE,
    PERMISSIONS.INVOICES_EXPORT,

    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_CREATE,
    PERMISSIONS.PAYMENTS_EDIT,
    PERMISSIONS.PAYMENTS_CONFIRM,
    PERMISSIONS.PAYMENTS_EXPORT,

    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.ACCOUNTING_CREATE,
    PERMISSIONS.ACCOUNTING_EDIT,
    PERMISSIONS.ACCOUNTING_POST,
    PERMISSIONS.ACCOUNTING_REPORTS_VIEW,
    PERMISSIONS.ACCOUNTING_EXPORT,

    PERMISSIONS.TREASURY_VIEW,
    PERMISSIONS.TREASURY_CREATE,
    PERMISSIONS.TREASURY_EDIT,
    PERMISSIONS.TREASURY_CONFIRM,
    PERMISSIONS.TREASURY_TRANSFER,
    PERMISSIONS.TREASURY_REPORTS_VIEW,
    PERMISSIONS.TREASURY_EXPORT,

    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.REPORTS_PRINT,
    PERMISSIONS.REPORTS_CUSTOMERS_VIEW,
    PERMISSIONS.REPORTS_PROVIDERS_VIEW,
    PERMISSIONS.REPORTS_ORDERS_VIEW,
    PERMISSIONS.REPORTS_INVOICES_VIEW,
    PERMISSIONS.REPORTS_PAYMENTS_VIEW,
    PERMISSIONS.REPORTS_ACCOUNTING_VIEW,
  ],

  [ROLES.SUPPORT]: [
    PERMISSIONS.SYSTEM_VIEW,

    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_EDIT,

    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_EDIT,

    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PROVIDERS_VIEW,
    PERMISSIONS.CONTRACTS_VIEW,

    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.PAYMENTS_VIEW,

    PERMISSIONS.WHATSAPP_VIEW,
    PERMISSIONS.WHATSAPP_LOGS,

    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_CREATE,
    PERMISSIONS.NOTIFICATIONS_SEND,

    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_CUSTOMERS_VIEW,
    PERMISSIONS.REPORTS_PROVIDERS_VIEW,
    PERMISSIONS.REPORTS_ORDERS_VIEW,
    PERMISSIONS.REPORTS_INVOICES_VIEW,
    PERMISSIONS.REPORTS_PAYMENTS_VIEW,
  ],

  [ROLES.VIEWER]: [
    PERMISSIONS.SYSTEM_VIEW,

    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.AGENTS_VIEW,
    PERMISSIONS.PROVIDERS_VIEW,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.CONTRACTS_VIEW,
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.ACCOUNTING_VIEW,
    PERMISSIONS.TREASURY_VIEW,

    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_CUSTOMERS_VIEW,
    PERMISSIONS.REPORTS_PROVIDERS_VIEW,
    PERMISSIONS.REPORTS_ORDERS_VIEW,
    PERMISSIONS.REPORTS_INVOICES_VIEW,
    PERMISSIONS.REPORTS_PAYMENTS_VIEW,
    PERMISSIONS.REPORTS_ACCOUNTING_VIEW,
  ],

  [ROLES.PROVIDER_ADMIN]: [
    PERMISSIONS.PROVIDER_WORKSPACE_VIEW,
    PERMISSIONS.PROVIDER_ORDERS_VIEW,
    PERMISSIONS.PROVIDER_ORDERS_UPDATE_STATUS,
    PERMISSIONS.PROVIDER_CONTRACTS_VIEW,

    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.CONTRACTS_VIEW,

    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_CREATE,

    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_CREATE,

    PERMISSIONS.REPORTS_VIEW,

    PERMISSIONS.WHATSAPP_VIEW,
    PERMISSIONS.WHATSAPP_LOGS,

    PERMISSIONS.PROVIDER_USERS_VIEW,
    PERMISSIONS.PROVIDER_USERS_CREATE,
  ],

  [ROLES.CUSTOMER_USER]: [
    PERMISSIONS.CUSTOMER_WORKSPACE_VIEW,
    PERMISSIONS.CUSTOMER_ORDERS_VIEW,
    PERMISSIONS.CUSTOMER_ORDERS_CREATE,
    PERMISSIONS.CUSTOMER_CARDS_VIEW,
    PERMISSIONS.CUSTOMER_PRODUCTS_VIEW,
    PERMISSIONS.CUSTOMER_SUPPORT_VIEW,
    PERMISSIONS.CUSTOMER_SUPPORT_CREATE,
    PERMISSIONS.CUSTOMER_ACCOUNT_VIEW,
    PERMISSIONS.CUSTOMER_ACCOUNT_EDIT,

    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_CREATE,
  ],

  [ROLES.AGENT_USER]: [
    PERMISSIONS.AGENT_WORKSPACE_VIEW,
    PERMISSIONS.AGENT_CUSTOMERS_VIEW,
    PERMISSIONS.AGENT_CUSTOMERS_CREATE,
    PERMISSIONS.AGENT_CUSTOMERS_EDIT,
    PERMISSIONS.AGENT_COMMISSIONS_VIEW,
    PERMISSIONS.AGENT_ACCOUNT_VIEW,
    PERMISSIONS.AGENT_ACCOUNT_EDIT,

    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_CREATE,

    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_EDIT,

    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.PAYMENTS_VIEW,

    PERMISSIONS.REPORTS_VIEW,
  ],
};

// ======================================================
// WORKSPACE ROLE MAP
// ======================================================

export const ROLE_WORKSPACE_MAP: Record<PrimeyRole, AppWorkspace> = {
  [ROLES.SYSTEM_ADMIN]: "system",
  [ROLES.ACCOUNTANT]: "system",
  [ROLES.SUPPORT]: "system",
  [ROLES.VIEWER]: "system",
  [ROLES.PROVIDER_ADMIN]: "provider",
  [ROLES.CUSTOMER_USER]: "customer",
  [ROLES.AGENT_USER]: "agent",
};

// ======================================================
// PATH ACCESS RULES
// ======================================================

export const PATH_ACCESS_RULES: PathAccessRule[] = [
  // ----------------------------
  // System Users / Settings
  // ----------------------------
  {
    prefix: "/system/users/create",
    permissions: [PERMISSIONS.USERS_CREATE],
    workspaces: ["system"],
  },
  {
    prefix: "/system/users",
    permissions: [PERMISSIONS.USERS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/settings",
    permissions: [PERMISSIONS.SYSTEM_SETTINGS],
    workspaces: ["system"],
  },

  // ----------------------------
  // Accounting
  // ----------------------------
  {
    prefix: "/system/accounting/reports",
    permissions: [PERMISSIONS.ACCOUNTING_REPORTS_VIEW, PERMISSIONS.REPORTS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/accounting/trial-balance",
    permissions: [PERMISSIONS.ACCOUNTING_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/accounting/profit-loss",
    permissions: [PERMISSIONS.ACCOUNTING_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/accounting/balance-sheet",
    permissions: [PERMISSIONS.ACCOUNTING_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/accounting/ledger",
    permissions: [PERMISSIONS.ACCOUNTING_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/accounting/accounts",
    permissions: [PERMISSIONS.ACCOUNTING_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/accounting/journals",
    permissions: [PERMISSIONS.ACCOUNTING_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/accounting",
    permissions: [PERMISSIONS.ACCOUNTING_VIEW],
    workspaces: ["system"],
  },

  // ----------------------------
  // Treasury
  // ----------------------------
  {
    prefix: "/system/treasury/settings",
    permissions: [PERMISSIONS.TREASURY_SETTINGS],
    workspaces: ["system"],
  },
  {
    prefix: "/system/treasury/reports",
    permissions: [PERMISSIONS.TREASURY_REPORTS_VIEW, PERMISSIONS.REPORTS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/treasury/accounts/create",
    permissions: [PERMISSIONS.TREASURY_CREATE],
    workspaces: ["system"],
  },
  {
    prefix: "/system/treasury/transactions/create",
    permissions: [PERMISSIONS.TREASURY_CREATE],
    workspaces: ["system"],
  },
  {
    prefix: "/system/treasury/transfers",
    permissions: [PERMISSIONS.TREASURY_VIEW, PERMISSIONS.TREASURY_TRANSFER],
    workspaces: ["system"],
  },
  {
    prefix: "/system/treasury/accounts",
    permissions: [PERMISSIONS.TREASURY_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/treasury/cashboxes",
    permissions: [PERMISSIONS.TREASURY_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/treasury/banks",
    permissions: [PERMISSIONS.TREASURY_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/treasury/transactions",
    permissions: [PERMISSIONS.TREASURY_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/treasury",
    permissions: [PERMISSIONS.TREASURY_VIEW],
    workspaces: ["system"],
  },

  // ----------------------------
  // Reports
  // ----------------------------
  {
    prefix: "/system/reports/customers",
    permissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_CUSTOMERS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/reports/providers",
    permissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_PROVIDERS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/reports/orders",
    permissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_ORDERS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/reports/invoices",
    permissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_INVOICES_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/reports/payments",
    permissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_PAYMENTS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/reports/accounting",
    permissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.REPORTS_ACCOUNTING_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/reports",
    permissions: [PERMISSIONS.REPORTS_VIEW],
    workspaces: ["system"],
  },

  // ----------------------------
  // Invoices / Payments
  // ----------------------------
  {
    prefix: "/system/invoices/create",
    permissions: [PERMISSIONS.INVOICES_CREATE],
    workspaces: ["system"],
  },
  {
    prefix: "/system/invoices",
    permissions: [PERMISSIONS.INVOICES_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/payments/create",
    permissions: [PERMISSIONS.PAYMENTS_CREATE],
    workspaces: ["system"],
  },
  {
    prefix: "/system/payments",
    permissions: [PERMISSIONS.PAYMENTS_VIEW],
    workspaces: ["system"],
  },

  // ----------------------------
  // Main System Modules
  // ----------------------------
  {
    prefix: "/system/customers/create",
    permissions: [PERMISSIONS.CUSTOMERS_CREATE],
    workspaces: ["system"],
  },
  {
    prefix: "/system/customers",
    permissions: [PERMISSIONS.CUSTOMERS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/providers/create",
    permissions: [PERMISSIONS.PROVIDERS_CREATE],
    workspaces: ["system"],
  },
  {
    prefix: "/system/providers",
    permissions: [PERMISSIONS.PROVIDERS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/centers/create",
    permissions: [PERMISSIONS.PROVIDERS_CREATE],
    workspaces: ["system"],
  },
  {
    prefix: "/system/centers",
    permissions: [PERMISSIONS.PROVIDERS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/agents/create",
    permissions: [PERMISSIONS.AGENTS_CREATE],
    workspaces: ["system"],
  },
  {
    prefix: "/system/agents",
    permissions: [PERMISSIONS.AGENTS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/products/create",
    permissions: [PERMISSIONS.PRODUCTS_CREATE],
    workspaces: ["system"],
  },
  {
    prefix: "/system/products",
    permissions: [PERMISSIONS.PRODUCTS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/contracts/create",
    permissions: [PERMISSIONS.CONTRACTS_CREATE],
    workspaces: ["system"],
  },
  {
    prefix: "/system/contracts",
    permissions: [PERMISSIONS.CONTRACTS_VIEW],
    workspaces: ["system"],
  },
  {
    prefix: "/system/orders/create",
    permissions: [PERMISSIONS.ORDERS_CREATE],
    workspaces: ["system"],
  },
  {
    prefix: "/system/orders",
    permissions: [PERMISSIONS.ORDERS_VIEW],
    workspaces: ["system"],
  },

  // ----------------------------
  // WhatsApp
  // ----------------------------
  {
    prefix: "/system/whatsapp/settings",
    permissions: [PERMISSIONS.WHATSAPP_SETTINGS],
    workspaces: ["system"],
  },
  {
    prefix: "/system/whatsapp/templates",
    permissions: [PERMISSIONS.WHATSAPP_TEMPLATES],
    workspaces: ["system"],
  },
  {
    prefix: "/system/whatsapp/broadcasts",
    permissions: [PERMISSIONS.WHATSAPP_BROADCASTS],
    workspaces: ["system"],
  },
  {
    prefix: "/system/whatsapp/logs",
    permissions: [PERMISSIONS.WHATSAPP_LOGS],
    workspaces: ["system"],
  },
  {
    prefix: "/system/whatsapp",
    permissions: [PERMISSIONS.WHATSAPP_VIEW],
    workspaces: ["system"],
  },

  // ----------------------------
  // System Root
  // ----------------------------
  {
    prefix: "/system",
    permissions: [PERMISSIONS.SYSTEM_VIEW],
    workspaces: ["system"],
  },

  // ----------------------------
  // Provider Workspace — Official /provider
  // ----------------------------
  {
    prefix: "/provider/users",
    permissions: [PERMISSIONS.PROVIDER_USERS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/provider/orders",
    permissions: [PERMISSIONS.PROVIDER_ORDERS_VIEW, PERMISSIONS.ORDERS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/provider/contracts",
    permissions: [PERMISSIONS.PROVIDER_CONTRACTS_VIEW, PERMISSIONS.CONTRACTS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/provider/customers",
    permissions: [PERMISSIONS.CUSTOMERS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/provider/products",
    permissions: [PERMISSIONS.PRODUCTS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/provider/invoices/create",
    permissions: [PERMISSIONS.INVOICES_CREATE],
    workspaces: ["provider"],
  },
  {
    prefix: "/provider/invoices",
    permissions: [PERMISSIONS.INVOICES_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/provider/payments/create",
    permissions: [PERMISSIONS.PAYMENTS_CREATE],
    workspaces: ["provider"],
  },
  {
    prefix: "/provider/payments",
    permissions: [PERMISSIONS.PAYMENTS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/provider/whatsapp",
    permissions: [PERMISSIONS.WHATSAPP_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/provider/settings",
    permissions: [PERMISSIONS.PROVIDER_WORKSPACE_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/provider",
    permissions: [PERMISSIONS.PROVIDER_WORKSPACE_VIEW],
    workspaces: ["provider"],
  },

  // ----------------------------
  // Provider Backward Compatibility — /company
  // ----------------------------
  {
    prefix: "/company/users",
    permissions: [PERMISSIONS.PROVIDER_USERS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/company/orders",
    permissions: [PERMISSIONS.PROVIDER_ORDERS_VIEW, PERMISSIONS.ORDERS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/company/contracts",
    permissions: [PERMISSIONS.PROVIDER_CONTRACTS_VIEW, PERMISSIONS.CONTRACTS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/company/customers",
    permissions: [PERMISSIONS.CUSTOMERS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/company/products",
    permissions: [PERMISSIONS.PRODUCTS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/company/invoices/create",
    permissions: [PERMISSIONS.INVOICES_CREATE],
    workspaces: ["provider"],
  },
  {
    prefix: "/company/invoices",
    permissions: [PERMISSIONS.INVOICES_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/company/payments/create",
    permissions: [PERMISSIONS.PAYMENTS_CREATE],
    workspaces: ["provider"],
  },
  {
    prefix: "/company/payments",
    permissions: [PERMISSIONS.PAYMENTS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/company/whatsapp",
    permissions: [PERMISSIONS.WHATSAPP_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/company/settings",
    permissions: [PERMISSIONS.PROVIDER_WORKSPACE_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/company",
    permissions: [PERMISSIONS.PROVIDER_WORKSPACE_VIEW],
    workspaces: ["provider"],
  },

  // ----------------------------
  // Provider Backward Compatibility — /center
  // ----------------------------
  {
    prefix: "/center/users",
    permissions: [PERMISSIONS.PROVIDER_USERS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/center/orders",
    permissions: [PERMISSIONS.PROVIDER_ORDERS_VIEW, PERMISSIONS.ORDERS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/center/contracts",
    permissions: [PERMISSIONS.PROVIDER_CONTRACTS_VIEW, PERMISSIONS.CONTRACTS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/center/customers",
    permissions: [PERMISSIONS.CUSTOMERS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/center/products",
    permissions: [PERMISSIONS.PRODUCTS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/center/invoices/create",
    permissions: [PERMISSIONS.INVOICES_CREATE],
    workspaces: ["provider"],
  },
  {
    prefix: "/center/invoices",
    permissions: [PERMISSIONS.INVOICES_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/center/payments/create",
    permissions: [PERMISSIONS.PAYMENTS_CREATE],
    workspaces: ["provider"],
  },
  {
    prefix: "/center/payments",
    permissions: [PERMISSIONS.PAYMENTS_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/center/whatsapp",
    permissions: [PERMISSIONS.WHATSAPP_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/center/settings",
    permissions: [PERMISSIONS.PROVIDER_WORKSPACE_VIEW],
    workspaces: ["provider"],
  },
  {
    prefix: "/center",
    permissions: [PERMISSIONS.PROVIDER_WORKSPACE_VIEW],
    workspaces: ["provider"],
  },

  // ----------------------------
  // Customer Workspace
  // ----------------------------
  {
    prefix: "/customer/orders",
    permissions: [PERMISSIONS.CUSTOMER_ORDERS_VIEW, PERMISSIONS.ORDERS_VIEW],
    workspaces: ["customer"],
  },
  {
    prefix: "/customer/invoices",
    permissions: [PERMISSIONS.INVOICES_VIEW],
    workspaces: ["customer"],
  },
  {
    prefix: "/customer/payments",
    permissions: [PERMISSIONS.PAYMENTS_VIEW],
    workspaces: ["customer"],
  },
  {
    prefix: "/customer/products",
    permissions: [PERMISSIONS.CUSTOMER_PRODUCTS_VIEW],
    workspaces: ["customer"],
  },
  {
    prefix: "/customer/support",
    permissions: [PERMISSIONS.CUSTOMER_SUPPORT_VIEW],
    workspaces: ["customer"],
  },
  {
    prefix: "/customer/account",
    permissions: [PERMISSIONS.CUSTOMER_ACCOUNT_VIEW],
    workspaces: ["customer"],
  },
  {
    prefix: "/customer/settings",
    permissions: [PERMISSIONS.CUSTOMER_WORKSPACE_VIEW],
    workspaces: ["customer"],
  },
  {
    prefix: "/customer",
    permissions: [PERMISSIONS.CUSTOMER_WORKSPACE_VIEW],
    workspaces: ["customer"],
  },

  // ----------------------------
  // Agent Workspace
  // ----------------------------
  {
    prefix: "/agent/customers",
    permissions: [PERMISSIONS.AGENT_CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_VIEW],
    workspaces: ["agent"],
  },
  {
    prefix: "/agent/orders",
    permissions: [PERMISSIONS.ORDERS_VIEW],
    workspaces: ["agent"],
  },
  {
    prefix: "/agent/commissions",
    permissions: [PERMISSIONS.AGENT_COMMISSIONS_VIEW],
    workspaces: ["agent"],
  },
  {
    prefix: "/agent/payments",
    permissions: [PERMISSIONS.PAYMENTS_VIEW],
    workspaces: ["agent"],
  },
  {
    prefix: "/agent/reports",
    permissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.AGENT_COMMISSIONS_VIEW],
    workspaces: ["agent"],
  },
  {
    prefix: "/agent/account",
    permissions: [PERMISSIONS.AGENT_ACCOUNT_VIEW],
    workspaces: ["agent"],
  },
  {
    prefix: "/agent/settings",
    permissions: [PERMISSIONS.AGENT_WORKSPACE_VIEW],
    workspaces: ["agent"],
  },
  {
    prefix: "/agent",
    permissions: [PERMISSIONS.AGENT_WORKSPACE_VIEW],
    workspaces: ["agent"],
  },
];

// ======================================================
// NORMALIZERS
// ======================================================

export function normalizeRole(role: unknown): string {
  const value = String(role || "").trim().toLowerCase();

  if (!value) return "";

  return ROLE_ALIASES[value] || value;
}

export function normalizeWorkspace(workspace: unknown): string {
  const value = String(workspace || "").trim().toLowerCase();

  if (value === "company" || value === "center") {
    return "provider";
  }

  if (
    value === "system" ||
    value === "provider" ||
    value === "customer" ||
    value === "agent"
  ) {
    return value;
  }

  return value;
}

export function normalizePermission(permission: unknown): string {
  return String(permission || "").trim();
}

export function uniqueStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeStringList(values: unknown): string[] {
  return uniqueStringList(values).map((item) => item.toLowerCase());
}

export function isKnownPrimeyRole(role: unknown): role is PrimeyRole {
  return (ALL_ROLES as readonly string[]).includes(normalizeRole(role));
}

// ======================================================
// SESSION HELPERS
// ======================================================

export function getSessionRole(session?: PermissionSession | null): string {
  return normalizeRole(
    session?.role ||
      session?.profile_permissions?.role ||
      session?.profile?.role ||
      session?.profile?.user_type,
  );
}

export function getSessionWorkspace(session?: PermissionSession | null): string {
  const explicitWorkspace = normalizeWorkspace(
    session?.workspace ||
      session?.profile_permissions?.workspace ||
      session?.profile?.workspace,
  );

  if (explicitWorkspace) return explicitWorkspace;

  const role = getSessionRole(session);

  if (isKnownPrimeyRole(role)) {
    return ROLE_WORKSPACE_MAP[role];
  }

  return "";
}

export function getRawSessionPermissions(
  session?: PermissionSession | null,
): string[] {
  return uniqueStringList([
    ...(session?.permission_codes || []),
    ...(session?.permissions?.codes || []),
    ...(session?.profile_permissions?.codes || []),
  ]);
}

export function getRolePermissions(role: unknown): string[] {
  const normalizedRole = normalizeRole(role);

  if (!isKnownPrimeyRole(normalizedRole)) return [];

  return uniqueStringList(ROLE_PERMISSION_MATRIX[normalizedRole]);
}

export function getSessionPermissions(
  session?: PermissionSession | null,
): string[] {
  const rawPermissions = getRawSessionPermissions(session);
  const rolePermissions = getRolePermissions(getSessionRole(session));

  return uniqueStringList([...rawPermissions, ...rolePermissions]);
}

export function getSessionPermissionGroups(
  session?: PermissionSession | null,
): string[] {
  return uniqueStringList([
    ...(session?.permissions?.groups || []),
    ...(session?.profile_permissions?.groups || []),
  ]);
}

export function isAuthenticated(session?: PermissionSession | null): boolean {
  return session?.authenticated === true;
}

export function isSystemAdmin(session?: PermissionSession | null): boolean {
  return (
    getSessionRole(session) === ROLES.SYSTEM_ADMIN ||
    session?.is_superuser === true ||
    session?.permissions?.is_superuser === true ||
    session?.profile_permissions?.is_superuser === true
  );
}

export function isStaffUser(session?: PermissionSession | null): boolean {
  return (
    session?.is_staff === true ||
    session?.permissions?.is_staff === true ||
    session?.profile_permissions?.is_staff === true ||
    isSystemAdmin(session)
  );
}

export function getDashboardPath(session?: PermissionSession | null): string {
  const explicitPath = String(session?.dashboard_path || "").trim();

  if (explicitPath) return explicitPath;

  const role = getSessionRole(session);
  const workspace = getSessionWorkspace(session);

  if (role === ROLES.PROVIDER_ADMIN || workspace === "provider") {
    return "/provider";
  }

  if (role === ROLES.CUSTOMER_USER || workspace === "customer") {
    return "/customer";
  }

  if (role === ROLES.AGENT_USER || workspace === "agent") {
    return "/agent";
  }

  return "/system";
}

// ======================================================
// ROLE / WORKSPACE CHECKS
// ======================================================

export function hasRole(
  session: PermissionSession | null | undefined,
  role: AppRole | PrimeyRole | string | null | undefined,
): boolean {
  const wantedRole = normalizeRole(role);

  if (!wantedRole) return false;
  if (!isAuthenticated(session)) return false;
  if (isSystemAdmin(session) && wantedRole !== ROLES.SYSTEM_ADMIN) return true;

  return getSessionRole(session) === wantedRole;
}

export function hasAnyRole(
  session: PermissionSession | null | undefined,
  roles: readonly (AppRole | PrimeyRole | string)[] | null | undefined,
): boolean {
  if (!roles || roles.length === 0) return true;
  if (!isAuthenticated(session)) return false;
  if (isSystemAdmin(session)) return true;

  const currentRole = getSessionRole(session);

  return roles.map(normalizeRole).includes(currentRole);
}

export function hasWorkspace(
  session: PermissionSession | null | undefined,
  workspace: AppWorkspace | string | null | undefined,
): boolean {
  const wantedWorkspace = normalizeWorkspace(workspace);

  if (!wantedWorkspace) return false;
  if (!isAuthenticated(session)) return false;
  if (isSystemAdmin(session) && wantedWorkspace === "system") return true;

  return getSessionWorkspace(session) === wantedWorkspace;
}

export function hasAnyWorkspace(
  session: PermissionSession | null | undefined,
  workspaces: readonly (AppWorkspace | string)[] | null | undefined,
): boolean {
  if (!workspaces || workspaces.length === 0) return true;
  if (!isAuthenticated(session)) return false;

  const normalizedWorkspaces = workspaces.map(normalizeWorkspace).filter(Boolean);

  if (isSystemAdmin(session)) {
    return (
      normalizedWorkspaces.length === 0 ||
      normalizedWorkspaces.includes("system")
    );
  }

  const currentWorkspace = getSessionWorkspace(session);

  return normalizedWorkspaces.includes(currentWorkspace);
}

// ======================================================
// PERMISSION CHECKS
// ======================================================

export function hasPermission(
  session: PermissionSession | null | undefined,
  permission: PrimeyPermissionCode | string | null | undefined,
): boolean {
  const code = normalizePermission(permission);

  if (!code) return false;
  if (!isAuthenticated(session)) return false;
  if (isSystemAdmin(session)) return true;

  return getSessionPermissions(session).includes(code);
}

export function hasAnyPermission(
  session: PermissionSession | null | undefined,
  permissions: readonly (PrimeyPermissionCode | string)[] | null | undefined,
): boolean {
  if (!permissions || permissions.length === 0) return true;
  if (!isAuthenticated(session)) return false;
  if (isSystemAdmin(session)) return true;

  return permissions.some((permission) => hasPermission(session, permission));
}

export function hasAllPermissions(
  session: PermissionSession | null | undefined,
  permissions: readonly (PrimeyPermissionCode | string)[] | null | undefined,
): boolean {
  if (!permissions || permissions.length === 0) return true;
  if (!isAuthenticated(session)) return false;
  if (isSystemAdmin(session)) return true;

  return permissions.every((permission) => hasPermission(session, permission));
}

// ======================================================
// GENERAL ACCESS CHECK
// ======================================================

export function canAccess(
  session: PermissionSession | null | undefined,
  input: PermissionCheckInput = {},
): boolean {
  if (!isAuthenticated(session)) return false;

  if (isSystemAdmin(session)) return true;

  if (input.workspace && !hasWorkspace(session, input.workspace)) {
    return false;
  }

  if (
    input.workspaces &&
    input.workspaces.length > 0 &&
    !hasAnyWorkspace(session, input.workspaces)
  ) {
    return false;
  }

  if (input.role && !hasRole(session, input.role)) {
    return false;
  }

  if (input.roles && input.roles.length > 0 && !hasAnyRole(session, input.roles)) {
    return false;
  }

  if (input.permission && !hasPermission(session, input.permission)) {
    return false;
  }

  if (
    input.permissions &&
    input.permissions.length > 0 &&
    !hasAnyPermission(session, input.permissions)
  ) {
    return false;
  }

  if (
    input.anyPermissions &&
    input.anyPermissions.length > 0 &&
    !hasAnyPermission(session, input.anyPermissions)
  ) {
    return false;
  }

  if (
    input.allPermissions &&
    input.allPermissions.length > 0 &&
    !hasAllPermissions(session, input.allPermissions)
  ) {
    return false;
  }

  return true;
}

// ======================================================
// PATH ACCESS
// ======================================================

export function normalizePath(pathname: string): string {
  const cleanPath = String(pathname || "").trim();

  if (cleanPath === "/center" || cleanPath === "/company") {
    return "/provider";
  }

  if (cleanPath.startsWith("/center/")) {
    return cleanPath.replace("/center", "/provider");
  }

  if (cleanPath.startsWith("/company/")) {
    return cleanPath.replace("/company", "/provider");
  }

  return cleanPath;
}

export function findPathAccessRule(pathname: string): PathAccessRule | null {
  const cleanPath = normalizePath(pathname);

  if (!cleanPath) return null;

  return (
    PATH_ACCESS_RULES.slice()
      .sort((a, b) => b.prefix.length - a.prefix.length)
      .find((rule) => {
        const normalizedPrefix = normalizePath(rule.prefix);

        return (
          cleanPath === normalizedPrefix ||
          cleanPath.startsWith(`${normalizedPrefix}/`)
        );
      }) || null
  );
}

export function canAccessPath(
  session: PermissionSession | null | undefined,
  pathname: string,
): boolean {
  if (!isAuthenticated(session)) return false;
  if (isSystemAdmin(session)) return true;

  const rule = findPathAccessRule(pathname);

  if (!rule) {
    return true;
  }

  return canAccess(session, {
    anyPermissions: rule.permissions || [],
    roles: rule.roles || [],
    workspaces: rule.workspaces || [],
  });
}

// ======================================================
// FILTER HELPERS
// ======================================================

export function canAccessItem<T extends PermissionedItem>(
  session: PermissionSession | null | undefined,
  item: T,
): boolean {
  return canAccess(session, {
    permission: item.permission,
    permissions: item.permissions,
    anyPermissions: item.anyPermissions,
    allPermissions: item.allPermissions,
    role: item.role,
    roles: item.roles,
    workspace: item.workspace,
    workspaces: item.workspaces,
  });
}

export function filterByPermissions<T extends PermissionedItem>(
  session: PermissionSession | null | undefined,
  items: T[],
): T[] {
  return items
    .map((item) => {
      const filteredChildren = item.children
        ? filterByPermissions(session, item.children as T[])
        : undefined;

      return {
        ...item,
        children: filteredChildren,
      };
    })
    .filter((item) => {
      const hasOwnAccess = canAccessItem(session, item);
      const hasVisibleChildren = Boolean(item.children && item.children.length > 0);

      return hasOwnAccess || hasVisibleChildren;
    });
}

// ======================================================
// ACTION HELPERS
// ======================================================

export function canCreate(
  session: PermissionSession | null | undefined,
  permission: PrimeyPermissionCode,
): boolean {
  return hasPermission(session, permission);
}

export function canEdit(
  session: PermissionSession | null | undefined,
  permission: PrimeyPermissionCode,
): boolean {
  return hasPermission(session, permission);
}

export function canDelete(
  session: PermissionSession | null | undefined,
  permission: PrimeyPermissionCode,
): boolean {
  return hasPermission(session, permission);
}

export function canExport(
  session: PermissionSession | null | undefined,
): boolean {
  return hasAnyPermission(session, [
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.CUSTOMERS_EXPORT,
    PERMISSIONS.PROVIDERS_EXPORT,
    PERMISSIONS.AGENTS_EXPORT,
    PERMISSIONS.PRODUCTS_EXPORT,
    PERMISSIONS.ORDERS_EXPORT,
    PERMISSIONS.CONTRACTS_EXPORT,
    PERMISSIONS.INVOICES_EXPORT,
    PERMISSIONS.PAYMENTS_EXPORT,
    PERMISSIONS.ACCOUNTING_EXPORT,
    PERMISSIONS.TREASURY_EXPORT,
  ]);
}

export function canPrint(
  session: PermissionSession | null | undefined,
): boolean {
  return hasPermission(session, PERMISSIONS.REPORTS_PRINT);
}

// ======================================================
// DEBUG HELPERS
// ======================================================

export function getPermissionDebugSnapshot(session?: PermissionSession | null) {
  return {
    authenticated: isAuthenticated(session),
    role: getSessionRole(session),
    workspace: getSessionWorkspace(session),
    isSystemAdmin: isSystemAdmin(session),
    isStaff: isStaffUser(session),
    rawPermissions: getRawSessionPermissions(session),
    effectivePermissions: getSessionPermissions(session),
    groups: getSessionPermissionGroups(session),
    dashboardPath: getDashboardPath(session),
  };
}