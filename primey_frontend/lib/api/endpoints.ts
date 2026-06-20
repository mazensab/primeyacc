/* ============================================================
   📂 lib/api/endpoints.ts
   PrimeyAcc - API Contract Paths
   ------------------------------------------------------------
   ✅ Centralized API endpoints
   ✅ No hardcoded localhost
   ✅ Compatible with current pages and future API Layer
   ✅ Keeps compatibility keys while aligning paths to official contracts
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
    list: "/api/company/customers/",
    create: "/api/company/customers/",
    reports: "/api/company/customers/reports/",
    export: "/api/company/customers/export/",
    detail: (id: ApiPathId) => `/api/company/customers/${id}/`,
    statement: (id: ApiPathId) => `/api/company/customers/${id}/statement/`,
    orders: (id: ApiPathId) => `/api/company/customers/${id}/orders/`,
    invoices: (id: ApiPathId) => `/api/company/customers/${id}/invoices/`,
    payments: (id: ApiPathId) => `/api/company/customers/${id}/payments/`,
  },

  centers: {
    list: "/api/system/companies/",
    create: "/api/system/companies/",
    reports: "/api/system/companies/reports/",
    export: "/api/system/companies/export/",
    detail: (id: ApiPathId) => `/api/system/companies/${id}/`,
    contracts: (id: ApiPathId) => `/api/system/companies/${id}/contracts/`,
    services: (id: ApiPathId) => `/api/system/companies/${id}/services/`,
  },

  providers: {
    list: "/api/system/companies/",
    create: "/api/system/companies/",
    reports: "/api/system/companies/reports/",
    export: "/api/system/companies/export/",
    detail: (id: ApiPathId) => `/api/system/companies/${id}/`,
    contracts: (id: ApiPathId) => `/api/system/companies/${id}/contracts/`,
    services: (id: ApiPathId) => `/api/system/companies/${id}/services/`,
  },

  agents: {
    list: "/api/company/reports/agents/",
    create: "/api/company/reports/agents/",
    reports: "/api/company/reports/agents/reports/",
    export: "/api/company/reports/agents/export/",
    commissions: "/api/company/reports/agents/commissions/",
    detail: (id: ApiPathId) => `/api/company/reports/agents/${id}/`,
    approve: (id: ApiPathId) => `/api/company/reports/agents/${id}/approve/`,
    commissionsByAgent: (id: ApiPathId) => `/api/company/reports/agents/${id}/commissions/`,
  },

  products: {
    list: "/api/company/products/",
    create: "/api/company/products/",
    public: "/api/company/products/public/",
    categories: "/api/company/products/categories/",
    reports: "/api/company/products/reports/",
    export: "/api/company/products/export/",
    detail: (id: ApiPathId) => `/api/company/products/${id}/`,
    categoryDetail: (id: ApiPathId) => `/api/company/products/categories/${id}/`,
  },

  orders: {
    list: "/api/company/sales/orders/",
    create: "/api/company/sales/orders/",
    open: "/api/company/sales/orders/open/",
    reports: "/api/company/sales/orders/reports/",
    export: "/api/company/sales/orders/export/",
    detail: (id: ApiPathId) => `/api/company/sales/orders/${id}/`,
    cancel: (id: ApiPathId) => `/api/company/sales/orders/${id}/cancel/`,
    confirm: (id: ApiPathId) => `/api/company/sales/orders/${id}/confirm/`,
    complete: (id: ApiPathId) => `/api/company/sales/orders/${id}/complete/`,
  },

  orderItems: {
    list: "/api/company/sales/order-items/",
    create: "/api/company/sales/order-items/",
    pending: "/api/company/sales/order-items/pending/",
    active: "/api/company/sales/order-items/active/",
    reports: "/api/company/sales/order-items/reports/",
    detail: (id: ApiPathId) => `/api/company/sales/order-items/${id}/`,
    approve: (id: ApiPathId) => `/api/company/sales/order-items/${id}/approve/`,
    fulfill: (id: ApiPathId) => `/api/company/sales/order-items/${id}/fulfill/`,
  },

  contracts: {
    list: "/api/company/documents/contracts/",
    create: "/api/company/documents/contracts/",
    active: "/api/company/documents/contracts/active/",
    reports: "/api/company/documents/contracts/reports/",
    export: "/api/company/documents/contracts/export/",
    detail: (id: ApiPathId) => `/api/company/documents/contracts/${id}/`,
    activate: (id: ApiPathId) => `/api/company/documents/contracts/${id}/activate/`,
    suspend: (id: ApiPathId) => `/api/company/documents/contracts/${id}/suspend/`,
    services: (id: ApiPathId) => `/api/company/documents/contracts/${id}/services/`,
  },

  serviceItems: {
    list: "/api/company/products/service-items/",
    create: "/api/company/products/service-items/",
    active: "/api/company/products/service-items/active/",
    featured: "/api/company/products/service-items/featured/",
    reports: "/api/company/products/service-items/reports/",
    detail: (id: ApiPathId) => `/api/company/products/service-items/${id}/`,
  },

  invoices: {
    list: "/api/company/sales/invoices/",
    create: "/api/company/sales/invoices/create/",
    reports: "/api/company/sales/invoices/reports/",
    export: "/api/company/sales/invoices/export/",
    excel: "/api/company/sales/invoices/excel/",
    print: "/api/company/sales/invoices/print/",
    detail: (id: ApiPathId) => `/api/company/sales/invoices/${id}/`,
    issue: (id: ApiPathId) => `/api/company/sales/invoices/${id}/issue/`,
    cancel: (id: ApiPathId) => `/api/company/sales/invoices/${id}/cancel/`,
    markPaid: (id: ApiPathId) => `/api/company/sales/invoices/${id}/mark-paid/`,
    pdf: (id: ApiPathId) => `/api/company/sales/invoices/${id}/pdf/`,
  },

  payments: {
    list: "/api/company/payments/",
    create: "/api/company/payments/create/",
    reports: "/api/company/payments/reports/",
    export: "/api/company/payments/export/",
    excel: "/api/company/payments/excel/",
    detail: (id: ApiPathId) => `/api/company/payments/${id}/`,
    confirm: (id: ApiPathId) => `/api/company/payments/${id}/confirm/`,
    cancel: (id: ApiPathId) => `/api/company/payments/${id}/cancel/`,
    refund: (id: ApiPathId) => `/api/company/payments/${id}/refund/`,
    receipt: (id: ApiPathId) => `/api/company/payments/${id}/receipt/`,
  },

  accounting: {
    overview: "/api/company/accounting/",
    accounts: "/api/company/accounting/accounts/",
    journals: "/api/company/accounting/journals/",
    ledger: "/api/company/accounting/ledger/",

    reports: "/api/company/accounting/reports/",
    trialBalance: "/api/company/accounting/reports/trial-balance/",
    profitLoss: "/api/company/accounting/reports/profit-loss/",
    balanceSheet: "/api/company/accounting/reports/balance-sheet/",

    trialBalanceExcel: "/api/company/accounting/reports/trial-balance/excel/",
    profitLossExcel: "/api/company/accounting/reports/profit-loss/excel/",
    balanceSheetExcel: "/api/company/accounting/reports/balance-sheet/excel/",
    ledgerExcel: "/api/company/accounting/ledger/excel/",
    journalsExcel: "/api/company/accounting/journals/excel/",

    accountDetail: (id: ApiPathId) => `/api/company/accounting/accounts/${id}/`,
    accountLedger: (id: ApiPathId) => `/api/company/accounting/accounts/${id}/ledger/`,
    journalDetail: (id: ApiPathId) => `/api/company/accounting/journals/${id}/`,
    journalPost: (id: ApiPathId) => `/api/company/accounting/journals/${id}/post/`,
    journalCancel: (id: ApiPathId) => `/api/company/accounting/journals/${id}/cancel/`,
  },

  treasury: {
    list: "/api/company/treasury/",
    overview: "/api/company/treasury/",
    reports: "/api/company/treasury/reports/",
    settings: "/api/company/treasury/settings/",

    accounts: "/api/company/treasury/accounts/",
    createAccount: "/api/company/treasury/accounts/create/",
    accountDetail: (id: ApiPathId) => `/api/company/treasury/accounts/${id}/`,

    cashboxes: "/api/company/treasury/cashboxes/",
    cashboxDetail: (id: ApiPathId) => `/api/company/treasury/cashboxes/${id}/`,

    banks: "/api/company/treasury/banks/",
    bankDetail: (id: ApiPathId) => `/api/company/treasury/banks/${id}/`,

    transactions: "/api/company/treasury/transactions/",
    createTransaction: "/api/company/treasury/transactions/create/",
    transactionDetail: (id: ApiPathId) => `/api/company/treasury/transactions/${id}/`,

    transfers: "/api/company/treasury/transfers/",
    createTransfer: "/api/company/treasury/transfers/create/",
    transferDetail: (id: ApiPathId) => `/api/company/treasury/transfers/${id}/`,

    reportsExcel: "/api/company/treasury/reports/excel/",
    transactionsExcel: "/api/company/treasury/transactions/excel/",
  },

  notificationCenter: {
    overview: "/api/company/notifications/",
    list: "/api/company/notifications/list/",
    notifications: "/api/company/notifications/notifications/",
    events: "/api/company/notifications/events/",
    deliveries: "/api/company/notifications/deliveries/",
    logs: "/api/company/notifications/logs/",
    settings: "/api/company/notifications/settings/",
    preferences: "/api/company/notifications/preferences/",
    readAll: "/api/company/notifications/read-all/",
    detail: (id: ApiPathId) => `/api/company/notifications/${id}/`,
    markRead: (id: ApiPathId) => `/api/company/notifications/${id}/read/`,
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
    list: "/api/system/release-readiness/logs/list/",
    summary: "/api/system/release-readiness/logs/summary/",
    export: "/api/system/release-readiness/logs/export/",
    detail: (id: ApiPathId) => `/api/system/release-readiness/logs/${id}/`,
  },

  performanceCenter: {
    overview: "/api/system/release-readiness/performance/",
    list: "/api/system/release-readiness/performance/list/",
    detail: "/api/system/release-readiness/performance/detail/",
    metrics: "/api/system/release-readiness/performance/metrics/",
  },

  paymentGateways: {
    list: "/api/company/payments/gateways/",
    detail: (id: ApiPathId) => `/api/company/payments/gateways/${id}/`,

    tapCreateCheckout: "/api/company/payments/gateways/tap/create-checkout/",
    tapWebhook: "/api/company/payments/gateways/tap/webhook/",
    tapCheckoutStatus: "/api/company/payments/gateways/tap/checkout-status/",
    tapSuccessLookup: "/api/company/payments/gateways/tap/success-lookup/",

    tamaraCreateCheckout: "/api/company/payments/gateways/tamara/create-checkout/",
    tamaraWebhook: "/api/company/payments/gateways/tamara/webhook/",
  },

  whatsapp: {
    base: "/api/company/whatsapp/",
    overview: "/api/company/whatsapp/",
    settings: "/api/company/whatsapp/settings/",
    logs: "/api/company/whatsapp/logs/",
    templates: "/api/company/whatsapp/templates/",
    broadcasts: "/api/company/whatsapp/broadcasts/",
    sessions: "/api/company/whatsapp/sessions/",
    send: "/api/company/whatsapp/send/",
    detail: (id: ApiPathId) => `/api/company/whatsapp/${id}/`,
    templateDetail: (id: ApiPathId) => `/api/company/whatsapp/templates/${id}/`,
    logDetail: (id: ApiPathId) => `/api/company/whatsapp/logs/${id}/`,
    broadcastDetail: (id: ApiPathId) => `/api/company/whatsapp/broadcasts/${id}/`,
  },

  reports: {
    accounting: "/api/company/accounting/reports/",
    invoices: "/api/company/sales/invoices/reports/",
    payments: "/api/company/payments/reports/",
    orders: "/api/company/sales/orders/reports/",
    customers: "/api/company/customers/reports/",
    products: "/api/company/products/reports/",
    providers: "/api/system/companies/reports/",
    centers: "/api/system/companies/reports/",
    contracts: "/api/company/documents/contracts/reports/",
    agents: "/api/company/reports/agents/reports/",
    treasury: "/api/company/treasury/reports/",
  },

  exports: {
    invoices: "/api/company/sales/invoices/export/",
    payments: "/api/company/payments/export/",
    orders: "/api/company/sales/orders/export/",
    customers: "/api/company/customers/export/",
    products: "/api/company/products/export/",
    providers: "/api/system/companies/export/",
    centers: "/api/system/companies/export/",
    contracts: "/api/company/documents/contracts/export/",
    agents: "/api/company/reports/agents/export/",
    treasuryTransactions: "/api/company/treasury/transactions/excel/",
    systemLog: "/api/system/release-readiness/logs/export/",
  },
} as const;

export type ApiPaths = typeof API_PATHS;