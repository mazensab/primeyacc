"use client";

/* ============================================================
   📂 primey_frontend/app/system/settings/page.tsx
   ⚙️ Primey Care — System Settings
   ------------------------------------------------------------
   ✅ Same approved Customers / Orders / Users table pattern
   ✅ Header buttons / KPI cards / toolbar / table unified
   ✅ Settings directory with internal system links
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Empty state
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ No localhost
   ✅ No fake API rows
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Bell,
  CheckCircle2,
  ColumnsIcon,
  CreditCard,
  Eye,
  FileSpreadsheet,
  Globe2,
  KeyRound,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Palette,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
  WalletCards,
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
import { Checkbox } from "@/components/ui/checkbox";
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

type CategoryFilter =
  | "all"
  | "users"
  | "security"
  | "notifications"
  | "payments"
  | "appearance"
  | "communication"
  | "system";

type StatusFilter = "all" | "ready" | "needsReview";

type SortKey = "default" | "name" | "category" | "status";

type ColumnKey =
  | "select"
  | "setting"
  | "category"
  | "description"
  | "status"
  | "importance"
  | "actions";

type SettingItem = {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: Exclude<CategoryFilter, "all">;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  status: Exclude<StatusFilter, "all">;
  importance: "high" | "medium" | "normal";
};

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  setting: true,
  category: true,
  description: true,
  status: true,
  importance: true,
  actions: true,
};

const translations = {
  ar: {
    title: "الإعدادات",
    subtitle: "إدارة إعدادات النظام، المستخدمين، الأمان، الإشعارات، التكاملات، وتجربة الواجهة.",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث في الإعدادات...",
    totalSettings: "إجمالي الإعدادات",
    readySettings: "جاهزة",
    needsReview: "تحتاج مراجعة",
    criticalSettings: "إعدادات مهمة",
    setting: "الإعداد",
    category: "التصنيف",
    description: "الوصف",
    status: "الحالة",
    importance: "الأهمية",
    actions: "الإجراءات",
    columns: "الأعمدة",
    sort: "الترتيب",
    selected: "محدد",
    allCategories: "كل التصنيفات",
    users: "المستخدمون",
    security: "الأمان",
    notifications: "الإشعارات",
    payments: "المدفوعات",
    appearance: "المظهر",
    communication: "التواصل",
    system: "النظام",
    allStatuses: "كل الحالات",
    ready: "جاهز",
    needsReviewStatus: "تحتاج مراجعة",
    high: "عالية",
    medium: "متوسطة",
    normal: "عادية",
    defaultSort: "الترتيب الافتراضي",
    nameSort: "الاسم",
    categorySort: "التصنيف",
    statusSort: "الحالة",
    activeFilters: "فلاتر مفعلة",
    clearSelection: "إلغاء التحديد",
    open: "فتح",
    noDataTitle: "لا توجد إعدادات",
    noDataDesc: "ستظهر إعدادات النظام هنا عند توفرها.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض إعدادات أخرى.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير إعدادات النظام",
    generatedAt: "تاريخ الطباعة",
    showing: "عرض",
    rows: "صفوف",
    of: "من",
    copied: "تم النسخ",
    updated: "تم تحديث الصفحة.",
    unknown: "غير محدد",
  },
  en: {
    title: "Settings",
    subtitle: "Manage system settings, users, security, notifications, integrations, and interface experience.",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    searchPlaceholder: "Search settings...",
    totalSettings: "Total settings",
    readySettings: "Ready",
    needsReview: "Needs review",
    criticalSettings: "Important settings",
    setting: "Setting",
    category: "Category",
    description: "Description",
    status: "Status",
    importance: "Importance",
    actions: "Actions",
    columns: "Columns",
    sort: "Sort",
    selected: "Selected",
    allCategories: "All categories",
    users: "Users",
    security: "Security",
    notifications: "Notifications",
    payments: "Payments",
    appearance: "Appearance",
    communication: "Communication",
    system: "System",
    allStatuses: "All statuses",
    ready: "Ready",
    needsReviewStatus: "Needs review",
    high: "High",
    medium: "Medium",
    normal: "Normal",
    defaultSort: "Default order",
    nameSort: "Name",
    categorySort: "Category",
    statusSort: "Status",
    activeFilters: "Active filters",
    clearSelection: "Clear selection",
    open: "Open",
    noDataTitle: "No settings",
    noDataDesc: "System settings will appear here once available.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other settings.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "System settings report",
    generatedAt: "Generated at",
    showing: "Showing",
    rows: "Rows",
    of: "of",
    copied: "Copied",
    updated: "Page refreshed.",
    unknown: "Unknown",
  },
} as const;

const SETTINGS_ITEMS: SettingItem[] = [
  {
    id: "system-users",
    titleAr: "مستخدمو النظام",
    titleEn: "System users",
    descriptionAr: "إدارة حسابات المستخدمين، الأدوار، حالة الحسابات، وروابط كلمة المرور.",
    descriptionEn: "Manage user accounts, roles, account status, and password links.",
    category: "users",
    href: "/system/users",
    icon: Users,
    status: "ready",
    importance: "high",
  },
  {
    id: "create-user",
    titleAr: "إضافة مستخدم",
    titleEn: "Create user",
    descriptionAr: "إنشاء مستخدم جديد وتحديد الدور والمساحة وبيانات التواصل.",
    descriptionEn: "Create a new user and set role, workspace, and contact data.",
    category: "users",
    href: "/system/users/create",
    icon: UserCog,
    status: "ready",
    importance: "high",
  },
  {
    id: "permissions",
    titleAr: "الأدوار والصلاحيات",
    titleEn: "Roles and permissions",
    descriptionAr: "مراجعة أدوار النظام والصلاحيات المرتبطة بالوحدات والإجراءات.",
    descriptionEn: "Review system roles and permissions linked to modules and actions.",
    category: "security",
    href: "/system/users",
    icon: ShieldCheck,
    status: "ready",
    importance: "high",
  },
  {
    id: "password-security",
    titleAr: "إعدادات كلمة المرور",
    titleEn: "Password security",
    descriptionAr: "إدارة روابط تعيين كلمة المرور وسياسات الوصول للمستخدمين.",
    descriptionEn: "Manage password setup links and user access policies.",
    category: "security",
    href: "/system/users",
    icon: KeyRound,
    status: "ready",
    importance: "medium",
  },
  {
    id: "notifications",
    titleAr: "مركز الإشعارات",
    titleEn: "Notification center",
    descriptionAr: "متابعة الإشعارات الداخلية وإعدادات التنبيه للمستخدمين.",
    descriptionEn: "Monitor internal notifications and user alert settings.",
    category: "notifications",
    href: "/system/notifications",
    icon: Bell,
    status: "ready",
    importance: "medium",
  },
  {
    id: "whatsapp",
    titleAr: "واتساب",
    titleEn: "WhatsApp",
    descriptionAr: "إعداد اتصال واتساب ومراجعة حالة الربط والإرسال.",
    descriptionEn: "Configure WhatsApp connection and review gateway status.",
    category: "communication",
    href: "/system/whatsapp",
    icon: MessageCircle,
    status: "ready",
    importance: "high",
  },
  {
    id: "payment-gateways",
    titleAr: "بوابات الدفع",
    titleEn: "Payment gateways",
    descriptionAr: "إدارة إعدادات بوابات الدفع والربط مع مزودي الدفع.",
    descriptionEn: "Manage gateway settings and payment provider integrations.",
    category: "payments",
    href: "/system/payment-gateways",
    icon: CreditCard,
    status: "needsReview",
    importance: "high",
  },
  {
    id: "payments",
    titleAr: "المدفوعات",
    titleEn: "Payments",
    descriptionAr: "مراجعة إعدادات المدفوعات والعمليات المالية المرتبطة بالنظام.",
    descriptionEn: "Review payment settings and related financial operations.",
    category: "payments",
    href: "/system/payments",
    icon: WalletCards,
    status: "ready",
    importance: "medium",
  },
  {
    id: "profile",
    titleAr: "الملف الشخصي",
    titleEn: "Profile",
    descriptionAr: "إدارة بيانات الحساب الحالي وتفضيلات المستخدم.",
    descriptionEn: "Manage current account data and user preferences.",
    category: "appearance",
    href: "/system/profile",
    icon: UserCog,
    status: "ready",
    importance: "normal",
  },
  {
    id: "appearance",
    titleAr: "المظهر واللغة",
    titleEn: "Appearance and language",
    descriptionAr: "مراجعة لغة الواجهة واتجاه العرض والهوية البصرية المعتمدة.",
    descriptionEn: "Review interface language, direction, and approved visual identity.",
    category: "appearance",
    href: "/system/profile",
    icon: Palette,
    status: "ready",
    importance: "normal",
  },
  {
    id: "general-system",
    titleAr: "إعدادات عامة",
    titleEn: "General settings",
    descriptionAr: "نقطة مركزية للوصول إلى إعدادات النظام الأساسية.",
    descriptionEn: "Central access point for core system configuration.",
    category: "system",
    href: "/system/settings",
    icon: Settings,
    status: "ready",
    importance: "normal",
  },
  {
    id: "locale",
    titleAr: "اللغة والمنطقة",
    titleEn: "Language and region",
    descriptionAr: "متابعة إعدادات اللغة والمنطقة الزمنية وتجربة العرض.",
    descriptionEn: "Review language, timezone, and display experience settings.",
    category: "system",
    href: "/system/profile",
    icon: Globe2,
    status: "ready",
    importance: "normal",
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getItemTitle(item: SettingItem, locale: Locale) {
  return locale === "ar" ? item.titleAr : item.titleEn;
}

function getItemDescription(item: SettingItem, locale: Locale) {
  return locale === "ar" ? item.descriptionAr : item.descriptionEn;
}

function getCategoryLabel(category: SettingItem["category"] | CategoryFilter, locale: Locale) {
  const t = translations[locale];

  const labels: Record<CategoryFilter, string> = {
    all: t.allCategories,
    users: t.users,
    security: t.security,
    notifications: t.notifications,
    payments: t.payments,
    appearance: t.appearance,
    communication: t.communication,
    system: t.system,
  };

  return labels[category as CategoryFilter] || t.unknown;
}

function getStatusLabel(status: SettingItem["status"], locale: Locale) {
  const t = translations[locale];
  return status === "ready" ? t.ready : t.needsReviewStatus;
}

function getImportanceLabel(importance: SettingItem["importance"], locale: Locale) {
  const t = translations[locale];

  if (importance === "high") return t.high;
  if (importance === "medium") return t.medium;

  return t.normal;
}

function getStatusClass(status: SettingItem["status"]) {
  if (status === "ready") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

function getImportanceClass(importance: SettingItem["importance"]) {
  if (importance === "high") {
    return "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50";
  }

  if (importance === "medium") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
  icon: React.ComponentType<{ className?: string }>;
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardAction>

        <div className="pt-1">
          <Badge
            variant="outline"
            className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {trend}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}

function HeaderSortButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center justify-start gap-1 truncate text-xs font-semibold transition hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="truncate">{children}</span>
      <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

function TableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-11 whitespace-nowrap px-4 text-right align-middle text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function TableBodyCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableCell
      className={cn(
        "h-[62px] overflow-hidden px-4 text-right align-middle",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}

export default function SystemSettingsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [hydrated, setHydrated] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const [searchInput, setSearchInput] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("default");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] =
    React.useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  React.useEffect(() => {
    const applyLocale = () => {
      const nextLocale = getInitialLocale();

      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
      document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
    };

    applyLocale();
    setHydrated(true);

    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  const filteredItems = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let nextItems = SETTINGS_ITEMS.filter((item) => {
      const title = getItemTitle(item, locale).toLowerCase();
      const description = getItemDescription(item, locale).toLowerCase();
      const category = getCategoryLabel(item.category, locale).toLowerCase();

      const matchesSearch =
        !query ||
        title.includes(query) ||
        description.includes(query) ||
        category.includes(query);

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    nextItems = [...nextItems].sort((a, b) => {
      if (sortKey === "name") {
        return getItemTitle(a, locale).localeCompare(getItemTitle(b, locale));
      }

      if (sortKey === "category") {
        return getCategoryLabel(a.category, locale).localeCompare(
          getCategoryLabel(b.category, locale),
        );
      }

      if (sortKey === "status") {
        return getStatusLabel(a.status, locale).localeCompare(
          getStatusLabel(b.status, locale),
        );
      }

      return SETTINGS_ITEMS.findIndex((item) => item.id === a.id) -
        SETTINGS_ITEMS.findIndex((item) => item.id === b.id);
    });

    return nextItems;
  }, [categoryFilter, locale, searchInput, sortKey, statusFilter]);

  const summary = React.useMemo(() => {
    const ready = SETTINGS_ITEMS.filter((item) => item.status === "ready").length;
    const needsReview = SETTINGS_ITEMS.filter((item) => item.status === "needsReview").length;
    const critical = SETTINGS_ITEMS.filter((item) => item.importance === "high").length;

    return {
      total: SETTINGS_ITEMS.length,
      ready,
      needsReview,
      critical,
    };
  }, []);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    sortKey !== "default";

  const allPageSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id));

  function resetFilters() {
    setSearchInput("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSortKey("default");
    setSelectedIds([]);
  }

  function refreshPage() {
    setRefreshing(true);

    window.setTimeout(() => {
      setRefreshing(false);
      toast.success(t.updated);
    }, 350);
  }

  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredItems.map((item) => item.id));
  }

  function toggleSelectItem(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((item) => item !== id);
    });
  }

  function buildExportRows() {
    return filteredItems.map((item) => ({
      title: getItemTitle(item, locale),
      category: getCategoryLabel(item.category, locale),
      description: getItemDescription(item, locale),
      status: getStatusLabel(item.status, locale),
      importance: getImportanceLabel(item.importance, locale),
    }));
  }

  function exportExcel() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; direction: ${dir}; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d9d9d9; padding: 8px; text-align: ${locale === "ar" ? "right" : "left"}; }
            th { background: #f3f4f6; font-weight: 700; }
          </style>
        </head>
        <body>
          <h2>${escapeHtml(t.printTitle)}</h2>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.setting)}</th>
                <th>${escapeHtml(t.category)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.importance)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.title)}</td>
                      <td>${escapeHtml(row.category)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.importance)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `primey-care-settings-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.printEmpty);
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 28px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            h1 { margin: 0; font-size: 22px; }
            p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 10px;
              margin-bottom: 18px;
            }
            .box {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 10px;
            }
            .box span {
              display: block;
              color: #6b7280;
              font-size: 11px;
              margin-bottom: 4px;
            }
            .box strong { font-size: 16px; }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px;
              text-align: ${locale === "ar" ? "right" : "left"};
              vertical-align: top;
            }
            th {
              background: #f9fafb;
              color: #374151;
              font-weight: 700;
            }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Primey Care - ${escapeHtml(t.printTitle)}</h1>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.showing)}: ${escapeHtml(rows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalSettings)}</span><strong>${escapeHtml(summary.total)}</strong></div>
            <div class="box"><span>${escapeHtml(t.readySettings)}</span><strong>${escapeHtml(summary.ready)}</strong></div>
            <div class="box"><span>${escapeHtml(t.needsReview)}</span><strong>${escapeHtml(summary.needsReview)}</strong></div>
            <div class="box"><span>${escapeHtml(t.criticalSettings)}</span><strong>${escapeHtml(summary.critical)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.setting)}</th>
                <th>${escapeHtml(t.category)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.importance)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.title)}</td>
                      <td>${escapeHtml(row.category)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.importance)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  if (!hydrated) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-lg border bg-card shadow-none">
              <CardHeader className="min-h-[112px] px-6 py-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-5 w-20" />
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-right">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={refreshPage}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            {t.export}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalSettings}
          value={formatInteger(summary.total)}
          trend={`${t.showing} ${formatInteger(filteredItems.length)}`}
          icon={Settings}
        />

        <KpiCard
          title={t.readySettings}
          value={formatInteger(summary.ready)}
          trend={t.ready}
          icon={CheckCircle2}
        />

        <KpiCard
          title={t.needsReview}
          value={formatInteger(summary.needsReview)}
          trend={t.needsReviewStatus}
          icon={SlidersHorizontal}
        />

        <KpiCard
          title={t.criticalSettings}
          value={formatInteger(summary.critical)}
          trend={t.high}
          icon={ShieldCheck}
        />
      </div>

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                  locale === "ar" ? "right-3" : "left-3",
                )}
              />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t.searchPlaceholder}
                className={cn(
                  "h-10 rounded-lg bg-background",
                  locale === "ar" ? "pr-9" : "pl-9",
                )}
              />
            </div>

            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[160px]">
                    <SlidersHorizontal className="h-4 w-4" />
                    <SelectValue placeholder={t.category} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allCategories}</SelectItem>
                    <SelectItem value="users">{t.users}</SelectItem>
                    <SelectItem value="security">{t.security}</SelectItem>
                    <SelectItem value="notifications">{t.notifications}</SelectItem>
                    <SelectItem value="payments">{t.payments}</SelectItem>
                    <SelectItem value="appearance">{t.appearance}</SelectItem>
                    <SelectItem value="communication">{t.communication}</SelectItem>
                    <SelectItem value="system">{t.system}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[145px]">
                    <CheckCircle2 className="h-4 w-4" />
                    <SelectValue placeholder={t.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    <SelectItem value="ready">{t.ready}</SelectItem>
                    <SelectItem value="needsReview">{t.needsReviewStatus}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 rounded-lg bg-background">
                      <ColumnsIcon className="h-4 w-4" />
                      {t.columns}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                    <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(
                      [
                        ["select", t.selected],
                        ["setting", t.setting],
                        ["category", t.category],
                        ["description", t.description],
                        ["status", t.status],
                        ["importance", t.importance],
                        ["actions", t.actions],
                      ] as [ColumnKey, string][]
                    ).map(([key, label]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={visibleColumns[key]}
                        onCheckedChange={(checked) =>
                          setVisibleColumns((current) => ({
                            ...current,
                            [key]: Boolean(checked),
                          }))
                        }
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-background"
                  onClick={resetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 rounded-lg bg-background">
                      <ArrowUpDown className="h-4 w-4" />
                      {t.sort}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                    {(
                      [
                        ["default", t.defaultSort],
                        ["name", t.nameSort],
                        ["category", t.categorySort],
                        ["status", t.statusSort],
                      ] as [SortKey, string][]
                    ).map(([key, label]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={sortKey === key}
                        onCheckedChange={() => setSortKey(key)}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedIds.length > 0 ? (
                  <Button
                    variant="outline"
                    className="h-9 rounded-lg bg-background"
                    onClick={() => setSelectedIds([])}
                  >
                    <XCircle className="h-4 w-4" />
                    {t.clearSelection} ({formatInteger(selectedIds.length)})
                  </Button>
                ) : null}

                {hasActiveFilters ? (
                  <Badge variant="secondary" className="h-9 rounded-lg px-3 text-xs font-semibold">
                    {t.activeFilters}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {visibleColumns.select ? (
                      <TableHeaderCell className="w-[46px] px-3">
                        <Checkbox
                          checked={allPageSelected}
                          onCheckedChange={(checked) => toggleSelectAllPage(Boolean(checked))}
                          aria-label={t.selected}
                        />
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.setting ? (
                      <TableHeaderCell className="w-[260px]">
                        <HeaderSortButton
                          active={sortKey === "name"}
                          onClick={() => setSortKey("name")}
                        >
                          {t.setting}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.category ? (
                      <TableHeaderCell className="w-[150px]">
                        <HeaderSortButton
                          active={sortKey === "category"}
                          onClick={() => setSortKey("category")}
                        >
                          {t.category}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.description ? (
                      <TableHeaderCell className="w-[320px]">{t.description}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.status ? (
                      <TableHeaderCell className="w-[130px]">
                        <HeaderSortButton
                          active={sortKey === "status"}
                          onClick={() => setSortKey("status")}
                        >
                          {t.status}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.importance ? (
                      <TableHeaderCell className="w-[120px]">{t.importance}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.actions ? (
                      <TableHeaderCell className="w-[72px] text-center">
                        {t.actions}
                      </TableHeaderCell>
                    ) : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredItems.length ? (
                    filteredItems.map((item) => {
                      const Icon = item.icon;
                      const title = getItemTitle(item, locale);
                      const description = getItemDescription(item, locale);

                      return (
                        <TableRow key={item.id} className="h-[62px]">
                          {visibleColumns.select ? (
                            <TableBodyCell className="w-[46px] px-3">
                              <Checkbox
                                checked={selectedIds.includes(item.id)}
                                onCheckedChange={(checked) =>
                                  toggleSelectItem(item.id, Boolean(checked))
                                }
                                aria-label={title}
                              />
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.setting ? (
                            <TableBodyCell className="w-[260px]">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <Link
                                    href={item.href}
                                    className="block truncate text-sm font-semibold text-foreground hover:underline"
                                  >
                                    {title}
                                  </Link>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {getCategoryLabel(item.category, locale)}
                                  </p>
                                </div>
                              </div>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.category ? (
                            <TableBodyCell className="w-[150px]">
                              <Badge
                                variant="outline"
                                className="max-w-full rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium"
                              >
                                <span className="truncate">
                                  {getCategoryLabel(item.category, locale)}
                                </span>
                              </Badge>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.description ? (
                            <TableBodyCell className="w-[320px]">
                              <p className="line-clamp-2 text-sm text-muted-foreground">
                                {description}
                              </p>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.status ? (
                            <TableBodyCell className="w-[130px]">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs font-medium",
                                  getStatusClass(item.status),
                                )}
                              >
                                {getStatusLabel(item.status, locale)}
                              </Badge>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.importance ? (
                            <TableBodyCell className="w-[120px]">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs font-medium",
                                  getImportanceClass(item.importance),
                                )}
                              >
                                {getImportanceLabel(item.importance, locale)}
                              </Badge>
                            </TableBodyCell>
                          ) : null}

                          {visibleColumns.actions ? (
                            <TableBodyCell className="w-[72px] text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                  align={locale === "ar" ? "start" : "end"}
                                  className="w-44"
                                >
                                  <DropdownMenuItem asChild>
                                    <Link href={item.href}>
                                      <Eye className="h-4 w-4" />
                                      {t.open}
                                    </Link>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableBodyCell>
                          ) : null}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={visibleColumnCount} className="h-72">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                            <Settings className="h-6 w-6 text-muted-foreground" />
                          </div>

                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {hasActiveFilters ? t.noResultsTitle : t.noDataTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {hasActiveFilters ? t.noResultsDesc : t.noDataDesc}
                            </p>
                          </div>

                          {hasActiveFilters ? (
                            <Button
                              variant="outline"
                              className="h-9 rounded-lg"
                              onClick={resetFilters}
                            >
                              <RotateCcw className="h-4 w-4" />
                              {t.reset}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {t.showing}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(filteredItems.length)}
              </span>{" "}
              {t.of}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(SETTINGS_ITEMS.length)}
              </span>{" "}
              {t.rows}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}