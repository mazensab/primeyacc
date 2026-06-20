/* ============================================================
   📂 lib/api/endpoints.ts
   Primey Care - API Paths
   ------------------------------------------------------------
   ✅ Centralized API endpoints
   ✅ No hardcoded localhost
   ✅ Compatible with current pages and future API Layer
   ✅ Keeps all previous paths without breaking imports
   ✅ Adds accounting / treasury / reports / WhatsApp / gateways
============================================================ */

export type ApiPathId = number | string;

export const API_PATHS = {
  auth: {
    csrf: "/api/auth/csrf/",
    login: "/api/auth/login/",
    logout: "/api/auth/logout/",
    whoami: "/api/auth/whoami/",
    profile: "/api/auth/profile/",
    changePassword: "/api/auth/change-password/",
    resetPasswordRequest: "/api/auth/reset-password/",
    resetPasswordConfirm: "/api/auth/reset-password/confirm/",
  },

  users: {
    list: "/api/users/",
    create: "/api/users/",
    detail: (id: ApiPathId) => `/api/users/${id}/`,
    activate: (id: ApiPathId) => `/api/users/${id}/activate/`,
    deactivate: (id: ApiPathId) => `/api/users/${id}/deactivate/`,
    resetPassword: (id: ApiPathId) => `/api/users/${id}/reset-password/`,
  },

  customers: {
    list: "/api/customers/",
    create: "/api/customers/",
    reports: "/api/customers/reports/",
    export: "/api/customers/export/",
    detail: (id: ApiPathId) => `/api/customers/${id}/`,
    statement: (id: ApiPathId) => `/api/customers/${id}/statement/`,
    orders: (id: ApiPathId) => `/api/customers/${id}/orders/`,
    invoices: (id: ApiPathId) => `/api/customers/${id}/invoices/`,
    payments: (id: ApiPathId) => `/api/customers/${id}/payments/`,
  },

  centers: {
    list: "/api/providers/",
    create: "/api/providers/",
    reports: "/api/providers/reports/",
    export: "/api/providers/export/",
    detail: (id: ApiPathId) => `/api/providers/${id}/`,
    contracts: (id: ApiPathId) => `/api/providers/${id}/contracts/`,
    services: (id: ApiPathId) => `/api/providers/${id}/services/`,
  },

  providers: {
    list: "/api/providers/",
    create: "/api/providers/",
    reports: "/api/providers/reports/",
    export: "/api/providers/export/",
    detail: (id: ApiPathId) => `/api/providers/${id}/`,
    contracts: (id: ApiPathId) => `/api/providers/${id}/contracts/`,
    services: (id: ApiPathId) => `/api/providers/${id}/services/`,
  },

  agents: {
    list: "/api/agents/",
    create: "/api/agents/",
    reports: "/api/agents/reports/",
    export: "/api/agents/export/",
    commissions: "/api/agents/commissions/",
    detail: (id: ApiPathId) => `/api/agents/${id}/`,
    approve: (id: ApiPathId) => `/api/agents/${id}/approve/`,
    commissionsByAgent: (id: ApiPathId) => `/api/agents/${id}/commissions/`,
  },

  products: {
    list: "/api/products/",
    create: "/api/products/",
    public: "/api/products/public/",
    categories: "/api/products/categories/",
    reports: "/api/products/reports/",
    export: "/api/products/export/",
    detail: (id: ApiPathId) => `/api/products/${id}/`,
    categoryDetail: (id: ApiPathId) => `/api/products/categories/${id}/`,
  },

  orders: {
    list: "/api/orders/",
    create: "/api/orders/",
    open: "/api/orders/open/",
    reports: "/api/orders/reports/",
    export: "/api/orders/export/",
    detail: (id: ApiPathId) => `/api/orders/${id}/`,
    cancel: (id: ApiPathId) => `/api/orders/${id}/cancel/`,
    confirm: (id: ApiPathId) => `/api/orders/${id}/confirm/`,
    complete: (id: ApiPathId) => `/api/orders/${id}/complete/`,
  },

  orderItems: {
    list: "/api/order-items/",
    create: "/api/order-items/",
    pending: "/api/order-items/pending/",
    active: "/api/order-items/active/",
    reports: "/api/order-items/reports/",
    detail: (id: ApiPathId) => `/api/order-items/${id}/`,
    approve: (id: ApiPathId) => `/api/order-items/${id}/approve/`,
    fulfill: (id: ApiPathId) => `/api/order-items/${id}/fulfill/`,
  },

  contracts: {
    list: "/api/contracts/",
    create: "/api/contracts/",
    active: "/api/contracts/active/",
    reports: "/api/contracts/reports/",
    export: "/api/contracts/export/",
    detail: (id: ApiPathId) => `/api/contracts/${id}/`,
    activate: (id: ApiPathId) => `/api/contracts/${id}/activate/`,
    suspend: (id: ApiPathId) => `/api/contracts/${id}/suspend/`,
    services: (id: ApiPathId) => `/api/contracts/${id}/services/`,
  },

  serviceItems: {
    list: "/api/service-items/",
    create: "/api/service-items/",
    active: "/api/service-items/active/",
    featured: "/api/service-items/featured/",
    reports: "/api/service-items/reports/",
    detail: (id: ApiPathId) => `/api/service-items/${id}/`,
  },

  invoices: {
    list: "/api/invoices/",
    create: "/api/invoices/create/",
    reports: "/api/invoices/reports/",
    export: "/api/invoices/export/",
    excel: "/api/invoices/excel/",
    print: "/api/invoices/print/",
    detail: (id: ApiPathId) => `/api/invoices/${id}/`,
    issue: (id: ApiPathId) => `/api/invoices/${id}/issue/`,
    cancel: (id: ApiPathId) => `/api/invoices/${id}/cancel/`,
    markPaid: (id: ApiPathId) => `/api/invoices/${id}/mark-paid/`,
    pdf: (id: ApiPathId) => `/api/invoices/${id}/pdf/`,
  },

  payments: {
    list: "/api/payments/",
    create: "/api/payments/create/",
    reports: "/api/payments/reports/",
    export: "/api/payments/export/",
    excel: "/api/payments/excel/",
    detail: (id: ApiPathId) => `/api/payments/${id}/`,
    confirm: (id: ApiPathId) => `/api/payments/${id}/confirm/`,
    cancel: (id: ApiPathId) => `/api/payments/${id}/cancel/`,
    refund: (id: ApiPathId) => `/api/payments/${id}/refund/`,
    receipt: (id: ApiPathId) => `/api/payments/${id}/receipt/`,
  },

  accounting: {
    overview: "/api/accounting/",
    accounts: "/api/accounting/accounts/",
    journals: "/api/accounting/journals/",
    ledger: "/api/accounting/ledger/",

    reports: "/api/accounting/reports/",
    trialBalance: "/api/accounting/reports/trial-balance/",
    profitLoss: "/api/accounting/reports/profit-loss/",
    balanceSheet: "/api/accounting/reports/balance-sheet/",

    trialBalanceExcel: "/api/accounting/reports/trial-balance/excel/",
    profitLossExcel: "/api/accounting/reports/profit-loss/excel/",
    balanceSheetExcel: "/api/accounting/reports/balance-sheet/excel/",
    ledgerExcel: "/api/accounting/ledger/excel/",
    journalsExcel: "/api/accounting/journals/excel/",

    accountDetail: (id: ApiPathId) => `/api/accounting/accounts/${id}/`,
    accountLedger: (id: ApiPathId) => `/api/accounting/accounts/${id}/ledger/`,
    journalDetail: (id: ApiPathId) => `/api/accounting/journals/${id}/`,
    journalPost: (id: ApiPathId) => `/api/accounting/journals/${id}/post/`,
    journalCancel: (id: ApiPathId) => `/api/accounting/journals/${id}/cancel/`,
  },

  treasury: {
    list: "/api/treasury/",
    overview: "/api/treasury/",
    reports: "/api/treasury/reports/",
    settings: "/api/treasury/settings/",

    accounts: "/api/treasury/accounts/",
    createAccount: "/api/treasury/accounts/create/",
    accountDetail: (id: ApiPathId) => `/api/treasury/accounts/${id}/`,

    cashboxes: "/api/treasury/cashboxes/",
    cashboxDetail: (id: ApiPathId) => `/api/treasury/cashboxes/${id}/`,

    banks: "/api/treasury/banks/",
    bankDetail: (id: ApiPathId) => `/api/treasury/banks/${id}/`,

    transactions: "/api/treasury/transactions/",
    createTransaction: "/api/treasury/transactions/create/",
    transactionDetail: (id: ApiPathId) => `/api/treasury/transactions/${id}/`,

    transfers: "/api/treasury/transfers/",
    createTransfer: "/api/treasury/transfers/create/",
    transferDetail: (id: ApiPathId) => `/api/treasury/transfers/${id}/`,

    reportsExcel: "/api/treasury/reports/excel/",
    transactionsExcel: "/api/treasury/transactions/excel/",
  },

  notificationCenter: {
    overview: "/api/notification-center/",
    list: "/api/notification-center/list/",
    notifications: "/api/notification-center/notifications/",
    events: "/api/notification-center/events/",
    deliveries: "/api/notification-center/deliveries/",
    logs: "/api/notification-center/logs/",
    settings: "/api/notification-center/settings/",
    preferences: "/api/notification-center/preferences/",
    readAll: "/api/notification-center/read-all/",
    detail: (id: ApiPathId) => `/api/notification-center/${id}/`,
    markRead: (id: ApiPathId) => `/api/notification-center/${id}/read/`,
  },

  systemNotifications: {
    list: "/api/system/notifications/",
    readAll: "/api/system/notifications/read-all/",
    markRead: (id: ApiPathId) => `/api/system/notifications/read/${id}/`,
  },

  companyNotifications: {
    list: "/api/company/notifications/",
    readAll: "/api/company/notifications/read-all/",
    markRead: (id: ApiPathId) => `/api/company/notifications/read/${id}/`,
  },

  systemLog: {
    list: "/api/system-log/list/",
    summary: "/api/system-log/summary/",
    export: "/api/system-log/export/",
    detail: (id: ApiPathId) => `/api/system-log/${id}/`,
  },

  performanceCenter: {
    overview: "/api/performance-center/",
    list: "/api/performance-center/list/",
    detail: "/api/performance-center/detail/",
    metrics: "/api/performance-center/metrics/",
  },

  paymentGateways: {
    list: "/api/payment-gateways/",
    detail: (id: ApiPathId) => `/api/payment-gateways/${id}/`,

    tapCreateCheckout: "/api/payment-gateways/tap/create-checkout/",
    tapWebhook: "/api/payment-gateways/tap/webhook/",
    tapCheckoutStatus: "/api/payment-gateways/tap/checkout-status/",
    tapSuccessLookup: "/api/payment-gateways/tap/success-lookup/",

    tamaraCreateCheckout: "/api/payment-gateways/tamara/create-checkout/",
    tamaraWebhook: "/api/payment-gateways/tamara/webhook/",
  },

  whatsapp: {
    base: "/api/whatsapp/",
    overview: "/api/whatsapp/",
    settings: "/api/whatsapp/settings/",
    logs: "/api/whatsapp/logs/",
    templates: "/api/whatsapp/templates/",
    broadcasts: "/api/whatsapp/broadcasts/",
    sessions: "/api/whatsapp/sessions/",
    send: "/api/whatsapp/send/",
    detail: (id: ApiPathId) => `/api/whatsapp/${id}/`,
    templateDetail: (id: ApiPathId) => `/api/whatsapp/templates/${id}/`,
    logDetail: (id: ApiPathId) => `/api/whatsapp/logs/${id}/`,
    broadcastDetail: (id: ApiPathId) => `/api/whatsapp/broadcasts/${id}/`,
  },

  reports: {
    accounting: "/api/accounting/reports/",
    invoices: "/api/invoices/reports/",
    payments: "/api/payments/reports/",
    orders: "/api/orders/reports/",
    customers: "/api/customers/reports/",
    products: "/api/products/reports/",
    providers: "/api/providers/reports/",
    centers: "/api/providers/reports/",
    contracts: "/api/contracts/reports/",
    agents: "/api/agents/reports/",
    treasury: "/api/treasury/reports/",
  },

  exports: {
    invoices: "/api/invoices/export/",
    payments: "/api/payments/export/",
    orders: "/api/orders/export/",
    customers: "/api/customers/export/",
    products: "/api/products/export/",
    providers: "/api/providers/export/",
    centers: "/api/providers/export/",
    contracts: "/api/contracts/export/",
    agents: "/api/agents/export/",
    treasuryTransactions: "/api/treasury/transactions/excel/",
    systemLog: "/api/system-log/export/",
  },
} as const;

export type ApiPaths = typeof API_PATHS;