// ============================================================
// ًں“‚ ط§ظ„ظ…ظ„ظپ: lib/whatsapp/constants.ts
// ًںں¢ Mham Cloud - WhatsApp Module Constants
// ------------------------------------------------------------
// âœ… ط§ظ„ط«ظˆط§ط¨طھ ط§ظ„ط¹ط§ظ…ط© ط§ظ„ط®ط§طµط© ط¨ظ…ظˆط¯ظٹظˆظ„ ط§ظ„ظˆط§طھط³ط§ط¨
// âœ… API Paths
// âœ… ط§ظ„ظ‚ظٹظ… ط§ظ„ط§ظپطھط±ط§ط¶ظٹط©
// âœ… ط§ظ„ظپظ„ط§طھط± ظˆط§ظ„ط­ط§ظ„ط§طھ
// ============================================================

import type {
  ConversationStatusValue,
  Locale,
  MessageDeliveryStatus,
  MessageDirection,
  WhatsAppMessageType,
} from "@/lib/whatsapp/types"

export const WHATSAPP_API_PATHS = {
  status: "/api/company/whatsapp/status/",
  settings: "/api/company/whatsapp/settings/",
  inboxSummary: "/api/company/whatsapp/inbox/summary/",
  inboxList: "/api/company/whatsapp/inbox/",
  conversationDetail: (id: number) => `/api/company/whatsapp/inbox/${id}/`,
  conversationMessages: (id: number) =>
    `/api/company/whatsapp/inbox/${id}/messages/`,
  conversationMarkRead: (id: number) =>
    `/api/company/whatsapp/inbox/${id}/mark-read/`,
  conversationStatus: (id: number) =>
    `/api/company/whatsapp/inbox/${id}/status/`,
  conversationResolved: (id: number) =>
    `/api/company/whatsapp/inbox/${id}/resolved/`,
  conversationPinned: (id: number) =>
    `/api/company/whatsapp/inbox/${id}/pinned/`,
} as const

export const DEFAULT_WHATSAPP_SEARCH_LIMIT = 100

export const CONVERSATION_STATUS_OPTIONS: Array<{
  value: ConversationStatusValue | ""
  labelKey:
    | "all"
    | "filterOpen"
    | "filterClosed"
    | "filterArchived"
    | "filterSpam"
}> = [
  { value: "", labelKey: "all" },
  { value: "OPEN", labelKey: "filterOpen" },
  { value: "CLOSED", labelKey: "filterClosed" },
  { value: "ARCHIVED", labelKey: "filterArchived" },
  { value: "SPAM", labelKey: "filterSpam" },
]

export const CONVERSATION_ACTION_STATUSES: ConversationStatusValue[] = [
  "OPEN",
  "CLOSED",
  "ARCHIVED",
  "SPAM",
]

export const DELIVERY_STATUS_ORDER: MessageDeliveryStatus[] = [
  "PENDING",
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "UNKNOWN",
]

export const SUPPORTED_MESSAGE_DIRECTIONS: MessageDirection[] = [
  "INBOUND",
  "OUTBOUND",
]

export const SUPPORTED_MESSAGE_TYPES: WhatsAppMessageType[] = [
  "TEXT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "VOICE",
  "DOCUMENT",
  "FILE",
  "STICKER",
  "LOCATION",
  "CONTACT",
  "SYSTEM",
  "UNKNOWN",
]

export const DEFAULT_LOCALE: Locale = "ar"

export const DEFAULT_EMPTY_VALUE = "â€”"

export const WHATSAPP_TRANSLATIONS = {
  ar: {
    centerBadge: "System WhatsApp Inbox",
    pageTitle: "طµظ†ط¯ظˆظ‚ ظˆط§طھط³ط§ط¨ ظ„ظ„ظ†ط¸ط§ظ…",
    pageDescription:
      "ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط­ط§ط¯ط«ط§طھ ط§ظ„ظˆط§ط±ط¯ط©طŒ ظ…طھط§ط¨ط¹ط© ط§ظ„ط±ط³ط§ط¦ظ„طŒ ظˆط§ظ„طھط­ظƒظ… ط¨ط­ط§ظ„ط© ط§ظ„ظ…ط­ط§ط¯ط«ط© ظ…ظ† ظˆط§ط¬ظ‡ط© ط§ط­طھط±ط§ظپظٹط© ظ…ظˆط­ط¯ط©.",
    refresh: "طھط­ط¯ظٹط«",
    settings: "ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ",
    conversations: "ط§ظ„ظ…ط­ط§ط¯ط«ط§طھ",
    connected: "ظ…طھطµظ„",
    disconnected: "ط؛ظٹط± ظ…طھطµظ„",
    active: "ظ†ط´ط·",
    inactive: "ط؛ظٹط± ظ†ط´ط·",
    whatsappConnection: "ط­ط§ظ„ط© ط§ظ„ط±ط¨ط· ظˆط§ظ„طµظ†ط¯ظˆظ‚",
    whatsappConnectionDesc:
      "ظ†ط¸ط±ط© ط³ط±ظٹط¹ط© ط¹ظ„ظ‰ ط­ط§ظ„ط© ط§ظ„ط§طھطµط§ظ„طŒ ظ…ط²ظˆط¯ ط§ظ„ظˆط§طھط³ط§ط¨طŒ ظˆط¥ط­طµط§ط¦ظٹط§طھ طµظ†ط¯ظˆظ‚ ط§ظ„ظ…ط­ط§ط¯ط«ط§طھ.",
    phoneNumberId: "Phone Number ID",
    notConfigured: "ط؛ظٹط± ظ…ط¶ط¨ظˆط·",
    webhook: "Webhook",
    verified: "ظ…ظˆط«ظ‚",
    pendingOrUnknown: "ظ‚ظٹط¯ ط§ظ„ط§ظ†طھط¸ط§ط± / ط؛ظٹط± ظ…ط¹ط±ظˆظپ",
    provider: "ط§ظ„ظ…ط²ظˆط¯",
    systemStatus: "ط­ط§ظ„ط© ط§ظ„ظ†ط¸ط§ظ…",
    totalConversations: "ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط­ط§ط¯ط«ط§طھ",
    unreadConversations: "ط؛ظٹط± ط§ظ„ظ…ظ‚ط±ظˆط،ط©",
    resolvedConversations: "ط§ظ„ظ…ط­ظ„ظˆظ„ط©",
    pinnedConversations: "ط§ظ„ظ…ط«ط¨طھط©",
    openConversations: "ط§ظ„ظ…ظپطھظˆط­ط©",
    quickAccess: "ط§ظ„ظˆطµظˆظ„ ط§ظ„ط³ط±ظٹط¹",
    quickAccessDesc: "ط§ظ„ط§ظ†طھظ‚ط§ظ„ ط§ظ„ط³ط±ظٹط¹ ط¥ظ„ظ‰ ط¨ظ‚ظٹط© ظˆط­ط¯ط§طھ ظˆط§طھط³ط§ط¨ ظ„ظ„ظ†ط¸ط§ظ….",
    logs: "ط§ظ„ط³ط¬ظ„",
    templates: "ط§ظ„ظ‚ظˆط§ظ„ط¨",
    broadcastsLabel: "ط§ظ„ط¨ط« ط§ظ„ط¬ظ…ط§ط¹ظٹ",
    smartSummary: "ظ…ظ„ط®طµ ط§ظ„طµظ†ط¯ظˆظ‚",
    smartSummaryDesc: "ط¥ط­طµط§ط،ط§طھ ط³ط±ظٹط¹ط© ظ„ظ„ظ…ط­ط§ط¯ط«ط§طھ ط§ظ„ط­ط§ظ„ظٹط©",
    systemScope: "System Scope",
    companyScope: "Company Scope",
    enabled: "ظ…ظپط¹ظ„",
    undefined: "ط؛ظٹط± ظ…ط­ط¯ط¯",
    pendingTemplates: "Pending Templates",
    failedMessages: "Failed Messages",
    dashboardLoadError: "طھط¹ط°ط± طھط­ظ…ظٹظ„ طµظ†ط¯ظˆظ‚ ظˆط§طھط³ط§ط¨ ظ„ظ„ظ†ط¸ط§ظ…",
    searchPlaceholder: "ط§ط¨ط­ط« ط¨ط§ظ„ط§ط³ظ… ط£ظˆ ط§ظ„ط±ظ‚ظ… ط£ظˆ ط¢ط®ط± ط±ط³ط§ظ„ط©...",
    inboxListTitle: "ط§ظ„ظ…ط­ط§ط¯ط«ط§طھ",
    inboxListDesc: "ظƒظ„ ط§ظ„ظ…ط­ط§ط¯ط«ط§طھ ط§ظ„ظˆط§ط±ط¯ط© ط¹ظ„ظ‰ ظ…ط³طھظˆظ‰ ط§ظ„ظ†ط¸ط§ظ…",
    noConversations: "ظ„ط§ طھظˆط¬ط¯ ظ…ط­ط§ط¯ط«ط§طھ ط­طھظ‰ ط§ظ„ط¢ظ†",
    noConversationsDesc:
      "ط³طھط¸ظ‡ط± ظ‡ظ†ط§ ط§ظ„ظ…ط­ط§ط¯ط«ط§طھ ط§ظ„ظˆط§ط±ط¯ط© طھظ„ظ‚ط§ط¦ظٹظ‹ط§ ط¹ظ†ط¯ ظˆطµظˆظ„ ط£ظˆظ„ ط±ط³ط§ظ„ط©.",
    conversationDetails: "طھظپط§طµظٹظ„ ط§ظ„ظ…ط­ط§ط¯ط«ط©",
    messagesTitle: "ط§ظ„ط±ط³ط§ط¦ظ„",
    messagesDesc: "ط¹ط±ط¶ ط§ظ„ظ…ط­ط§ط¯ط«ط© ط§ظ„ط­ط§ظ„ظٹط© ظ…ط¹ ط¬ظ…ظٹط¹ ط§ظ„ط±ط³ط§ط¦ظ„ ط§ظ„ظ…ط±طھط¨ط·ط© ط¨ظ‡ط§",
    noMessagesYet: "ظ„ط§ طھظˆط¬ط¯ ط±ط³ط§ط¦ظ„ ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظ…ط­ط§ط¯ط«ط©",
    noMessagesDesc: "ط¨ظ…ط¬ط±ط¯ ظˆطµظˆظ„ ط±ط³ط§ط¦ظ„ ط¬ط¯ظٹط¯ط© ط³طھط¸ظ‡ط± ظ‡ظ†ط§ طھظ„ظ‚ط§ط¦ظٹظ‹ط§.",
    selectConversation: "ط§ط®طھط± ظ…ط­ط§ط¯ط«ط©",
    selectConversationDesc:
      "ط§ط®طھط± ظ…ط­ط§ط¯ط«ط© ظ…ظ† ط§ظ„ظ‚ط§ط¦ظ…ط© ط§ظ„ط¬ط§ظ†ط¨ظٹط© ظ„ط¹ط±ط¶ ط§ظ„ط±ط³ط§ط¦ظ„ ظˆط§ظ„طھظپط§طµظٹظ„.",
    markRead: "طھط¹ظ„ظٹظ… ظƒظ…ظ‚ط±ظˆط،ط©",
    resolve: "ط­ظ„ ط§ظ„ظ…ط­ط§ط¯ط«ط©",
    unresolve: "ط¥ظ„ط؛ط§ط، ط§ظ„ط­ظ„",
    pin: "طھط«ط¨ظٹطھ",
    unpin: "ط¥ظ„ط؛ط§ط، ط§ظ„طھط«ط¨ظٹطھ",
    statusOpen: "ظپطھط­",
    statusClosed: "ط¥ط؛ظ„ط§ظ‚",
    statusArchived: "ط£ط±ط´ظپط©",
    statusSpam: "ط³ط¨ط§ظ…",
    unknown: "ط؛ظٹط± ظ…ط¹ط±ظˆظپ",
    unread: "ط؛ظٹط± ظ…ظ‚ط±ظˆط،",
    read: "ظ…ظ‚ط±ظˆط،",
    message: "ط±ط³ط§ظ„ط©",
    attachment: "ظ…ط±ظپظ‚",
    sender: "ط§ظ„ظ…ط±ط³ظ„",
    assignedTo: "ط§ظ„ظ…ط³ط¤ظˆظ„",
    noAssigned: "ط؛ظٹط± ظ…ط¹ظٹظ‘ظ†",
    contactPhone: "ط±ظ‚ظ… ط§ظ„طھظˆط§طµظ„",
    sessionName: "ط§ط³ظ… ط§ظ„ط¬ظ„ط³ط©",
    lastActivity: "ط¢ط®ط± ظ†ط´ط§ط·",
    preview: "ط§ظ„ظ…ط¹ط§ظٹظ†ط©",
    filters: "ط§ظ„ظپظ„ط§طھط±",
    all: "ط§ظ„ظƒظ„",
    onlyUnread: "ط؛ظٹط± ط§ظ„ظ…ظ‚ط±ظˆط، ظپظ‚ط·",
    filterOpen: "ظ…ظپطھظˆط­ط©",
    filterClosed: "ظ…ط؛ظ„ظ‚ط©",
    filterArchived: "ظ…ط¤ط±ط´ظپط©",
    filterSpam: "ط³ط¨ط§ظ…",
    markReadSuccess: "طھظ… طھط¹ظ„ظٹظ… ط§ظ„ظ…ط­ط§ط¯ط«ط© ظƒظ…ظ‚ط±ظˆط،ط©",
    pinSuccess: "طھظ… طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„طھط«ط¨ظٹطھ",
    resolveSuccess: "طھظ… طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„ط­ظ„",
    statusSuccess: "طھظ… طھط­ط¯ظٹط« ط­ط§ظ„ط© ط§ظ„ظ…ط­ط§ط¯ط«ط©",
    actionFailed: "طھط¹ط°ط± طھظ†ظپظٹط° ط§ظ„ط¹ظ…ظ„ظٹط©",
    noRecipient: "ط¨ط¯ظˆظ† ط±ظ‚ظ…",
    connectedNow: "ط§ظ„ط±ط¨ط· ظٹط¹ظ…ظ„ ط¨ط´ظƒظ„ ط³ظ„ظٹظ…",
    disconnectedNow: "ط§ظ„ط±ط¨ط· ط؛ظٹط± ظ…طھطµظ„ ط­ط§ظ„ظٹظ‹ط§",
    lastCheck: "ط¢ط®ط± ظپط­طµ",
    viewSettings: "ط¹ط±ط¶ ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ",
    fromSystem: "ظ…ظ† ط§ظ„ظ†ط¸ط§ظ…",
    fromContact: "ظ…ظ† ط¬ظ‡ط© ط§ظ„ط§طھطµط§ظ„",
    closedLabel: "ظ…ط؛ظ„ظ‚ط©",
    archivedLabel: "ظ…ط¤ط±ط´ظپط©",
    spamLabel: "ط³ط¨ط§ظ…",
    openLabel: "ظ…ظپطھظˆط­ط©",
    resolvedLabel: "ظ…ط­ظ„ظˆظ„ط©",
    unresolvedLabel: "ط؛ظٹط± ظ…ط­ظ„ظˆظ„ط©",
    pinnedLabel: "ظ…ط«ط¨طھط©",
    mediaMessage: "ط±ط³ط§ظ„ط© ظˆط³ط§ط¦ط·",
    comingSoon: "ظ‚ط±ظٹط¨ظ‹ط§",
    composerPlaceholder: "ط§ظƒطھط¨ ط±ط³ط§ظ„طھظƒ ظ‡ظ†ط§...",
    send: "ط¥ط±ط³ط§ظ„",
    loading: "ط¬ط§ط±ظٹ ط§ظ„طھط­ظ…ظٹظ„...",
  },
  en: {
    centerBadge: "System WhatsApp Inbox",
    pageTitle: "System WhatsApp Inbox",
    pageDescription:
      "Manage inbound conversations, review messages, and control conversation state from one professional interface.",
    refresh: "Refresh",
    settings: "Settings",
    conversations: "Conversations",
    connected: "Connected",
    disconnected: "Disconnected",
    active: "Active",
    inactive: "Inactive",
    whatsappConnection: "Connection & Inbox Status",
    whatsappConnectionDesc:
      "Quick view of connectivity, provider, and inbox statistics.",
    phoneNumberId: "Phone Number ID",
    notConfigured: "Not configured",
    webhook: "Webhook",
    verified: "Verified",
    pendingOrUnknown: "Pending / Unknown",
    provider: "Provider",
    systemStatus: "System Status",
    totalConversations: "Total Conversations",
    unreadConversations: "Unread",
    resolvedConversations: "Resolved",
    pinnedConversations: "Pinned",
    openConversations: "Open",
    quickAccess: "Quick Access",
    quickAccessDesc:
      "Quickly jump to the rest of the system WhatsApp modules.",
    logs: "Logs",
    templates: "Templates",
    broadcastsLabel: "Broadcasts",
    smartSummary: "Inbox Summary",
    smartSummaryDesc: "Fast statistics for current conversations",
    systemScope: "System Scope",
    companyScope: "Company Scope",
    enabled: "Enabled",
    undefined: "Undefined",
    pendingTemplates: "Pending Templates",
    failedMessages: "Failed Messages",
    dashboardLoadError: "Unable to load the system WhatsApp inbox",
    searchPlaceholder: "Search by name, number, or latest message...",
    inboxListTitle: "Conversations",
    inboxListDesc: "All inbound conversations at system level",
    noConversations: "No conversations yet",
    noConversationsDesc:
      "Inbound conversations will appear here automatically once the first message arrives.",
    conversationDetails: "Conversation Details",
    messagesTitle: "Messages",
    messagesDesc: "Display the current conversation with all linked messages",
    noMessagesYet: "No messages in this conversation",
    noMessagesDesc:
      "Messages will appear here automatically as soon as they arrive.",
    selectConversation: "Select a conversation",
    selectConversationDesc:
      "Choose a conversation from the sidebar to view details and messages.",
    markRead: "Mark as read",
    resolve: "Resolve",
    unresolve: "Unresolve",
    pin: "Pin",
    unpin: "Unpin",
    statusOpen: "Open",
    statusClosed: "Close",
    statusArchived: "Archive",
    statusSpam: "Spam",
    unknown: "Unknown",
    unread: "Unread",
    read: "Read",
    message: "Message",
    attachment: "Attachment",
    sender: "Sender",
    assignedTo: "Assigned To",
    noAssigned: "Unassigned",
    contactPhone: "Contact Phone",
    sessionName: "Session Name",
    lastActivity: "Last Activity",
    preview: "Preview",
    filters: "Filters",
    all: "All",
    onlyUnread: "Unread only",
    filterOpen: "Open",
    filterClosed: "Closed",
    filterArchived: "Archived",
    filterSpam: "Spam",
    markReadSuccess: "Conversation marked as read",
    pinSuccess: "Pinned state updated",
    resolveSuccess: "Resolved state updated",
    statusSuccess: "Conversation status updated",
    actionFailed: "Unable to complete the action",
    noRecipient: "No recipient",
    connectedNow: "Connection is healthy",
    disconnectedNow: "Connection is currently offline",
    lastCheck: "Last check",
    viewSettings: "View settings",
    fromSystem: "From system",
    fromContact: "From contact",
    closedLabel: "Closed",
    archivedLabel: "Archived",
    spamLabel: "Spam",
    openLabel: "Open",
    resolvedLabel: "Resolved",
    unresolvedLabel: "Unresolved",
    pinnedLabel: "Pinned",
    mediaMessage: "Media message",
    comingSoon: "Coming soon",
    composerPlaceholder: "Write your message here...",
    send: "Send",
    loading: "Loading...",
  },
} as const
