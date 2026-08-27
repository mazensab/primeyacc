"use client";

/* =====================================================
   📂 components/layout/header/search.tsx
   🧠 Mhamcloud — Premium Header Search
   -----------------------------------------------------
   ✅ متوافق مع الهيدر الجديد
   ✅ يدعم system / provider / customer / agent
   ✅ يدعم عربي/إنجليزي عبر primey-locale
   ✅ بدون hardcoded localhost
   ✅ يحافظ على روابط Mhamcloud المعتمدة
===================================================== */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Command } from "cmdk";
import {
  ArrowUpRight,
  Boxes,
  Briefcase,
  Building2,
  Calculator,
  CreditCard,
  FileText,
  Gift,
  Home,
  KeyRound,
  MessageCircle,
  ReceiptText,
  SearchIcon,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/components/providers/AuthProvider";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type AppLocale = "ar" | "en";
type WorkspaceType =
  | "system"
  | "company"
  | "center"
  | "provider"
  | "customer"
  | "agent";

type SearchItem = {
  title: {
    ar: string;
    en: string;
  };
  href: string;
  aliases?: string[];
  icon?: LucideIcon;
  description?: {
    ar: string;
    en: string;
  };
  permission?: string;
};

/* =====================================================
   SEARCH DATA
===================================================== */

const systemSearchItems: SearchItem[] = [
  {
    title: { ar: "لوحة النظام", en: "System Dashboard" },
    href: "/system",
    icon: Home,
    description: {
      ar: "لوحة التحكم الرئيسية للنظام",
      en: "Main system dashboard",
    },
  },
  {
    title: { ar: "الشركات", en: "Companies" },
    href: "/system/companies",
    aliases: ["/system/companies/list", "/system/companies/reports"],
    icon: Building2,
    description: {
      ar: "إدارة الشركات وحالاتها وبياناتها",
      en: "Manage companies, status, and company data",
    },
  },
  {
    title: {
      ar: "اشتراكات الشركات",
      en: "Company Subscriptions",
    },
    href: "/system/subscriptions",
    aliases: [
      "/system/subscriptions/list",
      "/system/subscriptions/reports",
    ],
    icon: Gift,
    description: {
      ar: "متابعة اشتراكات الشركات ودوراتها",
      en: "Track company subscriptions and lifecycle",
    },
  },
  {
    title: {
      ar: "الخطط والأسعار",
      en: "Plans & Pricing",
    },
    href: "/system/plans",
    aliases: [
      "/system/plans/create",
      "/system/plans/reports",
    ],
    icon: Gift,
    description: {
      ar: "إدارة خطط المنصة والأسعار",
      en: "Manage platform plans and pricing",
    },
  },
  {
    title: {
      ar: "مستخدمو النظام",
      en: "System Users",
    },
    href: "/system/users",
    aliases: [
      "/system/users/list",
      "/system/users/reports",
    ],
    icon: UserCog,
    description: {
      ar: "إدارة مستخدمي النظام",
      en: "Manage system users",
    },
  },
  {
    title: {
      ar: "ملفات الأنشطة",
      en: "Activity Profiles",
    },
    href: "/system/activity-profiles",
    aliases: ["/system/activity-profiles/list"],
    icon: Stethoscope,
    description: {
      ar: "إدارة ملفات أنشطة الشركات",
      en: "Manage company activity profiles",
    },
  },
  {
    title: {
      ar: "مدفوعات المنصة",
      en: "Platform Payments",
    },
    href: "/system/platform-payments",
    aliases: [
      "/system/platform-payments/list",
      "/system/platform-payments/reports",
    ],
    icon: CreditCard,
    description: {
      ar: "مراقبة مدفوعات المنصة والتحصيل",
      en: "Monitor platform payments and collections",
    },
  },
  {
    title: {
      ar: "الفواتير والإيصالات",
      en: "Invoices & Receipts",
    },
    href: "/system/invoices",
    aliases: [
      "/system/invoices/list",
      "/system/invoices/receipts",
    ],
    icon: ReceiptText,
    description: {
      ar: "فواتير وإيصالات اشتراكات المنصة",
      en: "Platform subscription invoices and receipts",
    },
  },
  {
    title: {
      ar: "الإشعارات",
      en: "Notifications",
    },
    href: "/system/notifications",
    aliases: [
      "/system/notifications/list",
      "/system/notifications/unread",
    ],
    icon: MessageCircle,
    description: {
      ar: "مركز إشعارات النظام",
      en: "System notifications center",
    },
  },
  {
    title: {
      ar: "واتساب",
      en: "WhatsApp",
    },
    href: "/system/whatsapp",
    aliases: [
      "/system/whatsapp/inbox",
      "/system/whatsapp/messages",
      "/system/whatsapp/templates",
      "/system/whatsapp/settings",
    ],
    icon: MessageCircle,
    description: {
      ar: "إدارة واتساب ورسائل المنصة",
      en: "Manage platform WhatsApp and messages",
    },
  },
  {
    title: {
      ar: "مركز التكاملات",
      en: "Integrations Center",
    },
    href: "/system/integrations",
    icon: Briefcase,
    description: {
      ar: "إدارة تكاملات المنصة",
      en: "Manage platform integrations",
    },
    permission: PERMISSIONS.SYSTEM_INTEGRATIONS_VIEW,
  },
  {
    title: {
      ar: "مفاتيح API",
      en: "API Keys",
    },
    href: "/system/integrations/api-keys",
    icon: KeyRound,
    description: {
      ar: "إدارة مفاتيح تكامل API",
      en: "Manage API integration keys",
    },
    permission: PERMISSIONS.SYSTEM_INTEGRATION_API_KEYS_VIEW,
  },
  {
    title: {
      ar: "عقود API",
      en: "API Contracts",
    },
    href: "/system/integrations/api-contracts",
    aliases: ["/system/api-contracts"],
    icon: FileText,
    description: {
      ar: "عرض عقود واجهات API المعتمدة",
      en: "View approved API contracts",
    },
    permission: PERMISSIONS.SYSTEM_INTEGRATIONS_VIEW,
  },
  {
    title: {
      ar: "جاهزية الإصدار",
      en: "Release Readiness",
    },
    href: "/system/release-readiness",
    icon: ShieldCheck,
    description: {
      ar: "متابعة جاهزية النظام للإصدار",
      en: "Track system release readiness",
    },
  },
  {
    title: {
      ar: "ضوابط الأعمال",
      en: "Business Controls",
    },
    href: "/system/business-controls",
    icon: Calculator,
    description: {
      ar: "مراجعة ضوابط وحوكمة العمليات",
      en: "Review business controls and governance",
    },
  },
  {
    title: {
      ar: "محركات الأنشطة",
      en: "Activity Backends",
    },
    href: "/system/activity-backends",
    icon: Boxes,
    description: {
      ar: "إدارة محركات الأنشطة المرتبطة بالمنصة",
      en: "Manage platform activity backends",
    },
  },
  {
    title: {
      ar: "المستندات والطباعة",
      en: "Documents & Printing",
    },
    href: "/system/documents",
    aliases: [
      "/system/documents/templates",
      "/system/documents/settings",
      "/system/documents/rendering",
      "/system/documents/thermal",
    ],
    icon: FileText,
    description: {
      ar: "إدارة المستندات والقوالب والطباعة",
      en: "Manage documents, templates, and printing",
    },
  },
  {
    title: {
      ar: "الأدوار",
      en: "Roles",
    },
    href: "/system/roles",
    icon: ShieldCheck,
    description: {
      ar: "عرض كتالوج أدوار النظام والشركات للقراءة فقط",
      en: "View the read-only system and company roles catalog",
    },
    permission: PERMISSIONS.SYSTEM_VIEW,
  },
  {
    title: {
      ar: "الصلاحيات",
      en: "Permissions",
    },
    href: "/system/permissions",
    icon: ShieldCheck,
    description: {
      ar: "عرض كتالوج صلاحيات النظام والشركات للقراءة فقط",
      en: "View the read-only system and company permissions catalog",
    },
    permission: PERMISSIONS.SYSTEM_VIEW,
  },
  {
    title: {
      ar: "إعدادات النظام",
      en: "System Settings",
    },
    href: "/system/settings",
    icon: Settings,
    description: {
      ar: "إعدادات النظام العامة",
      en: "General system settings",
    },
    permission: PERMISSIONS.SYSTEM_SETTINGS,
  },
];

const providerSearchItems: SearchItem[] = [
  {
    title: { ar: "الرئيسية", en: "Home" },
    href: "/company",
    aliases: ["/center", "/provider"],
    icon: Home,
    description: {
      ar: "لوحة مقدم الخدمة",
      en: "Provider dashboard home",
    },
  },
  {
    title: { ar: "العملاء", en: "Customers" },
    href: "/company/customers",
    aliases: ["/center/customers", "/provider/customers"],
    icon: Users,
    description: {
      ar: "إدارة عملاء مقدم الخدمة",
      en: "Manage provider customers",
    },
  },
  {
    title: { ar: "الفواتير", en: "Invoices" },
    href: "/company#sales-invoices",
    icon: ReceiptText,
    description: {
      ar: "فواتير مقدم الخدمة",
      en: "Provider invoices",
    },
  },
  {
    title: { ar: "المدفوعات", en: "Payments" },
    href: "/company/payments",
    aliases: ["/center/payments", "/provider/payments"],
    icon: CreditCard,
    description: {
      ar: "مدفوعات مقدم الخدمة",
      en: "Provider payments",
    },
  },
  {
    title: { ar: "الإعدادات", en: "Settings" },
    href: "/company/settings",
    aliases: ["/center/settings", "/provider/settings"],
    icon: Settings,
    description: {
      ar: "إعدادات مقدم الخدمة",
      en: "Provider settings",
    },
  },
];

const customerSearchItems: SearchItem[] = [
];

const agentSearchItems: SearchItem[] = [
  {
    title: { ar: "الرئيسية", en: "Home" },
    href: "/agent",
    icon: Home,
    description: {
      ar: "لوحة المندوب",
      en: "Agent dashboard home",
    },
  },
];

/* =====================================================
   HELPERS
===================================================== */

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

function getWorkspaceFromPathname(pathname: string): WorkspaceType {
  if (pathname.startsWith("/system")) return "system";
  if (pathname.startsWith("/customer")) return "customer";
  if (pathname.startsWith("/agent")) return "agent";
  if (pathname.startsWith("/provider")) return "provider";
  if (pathname.startsWith("/center")) return "center";
  if (pathname.startsWith("/company")) return "company";

  return "system";
}

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

  const rootRoutes = ["/system", "/company", "/customer", "/agent"];

  if (rootRoutes.includes(normalizedHref)) {
    return normalizedPathname === normalizedHref;
  }

  return (
    normalizedPathname === normalizedHref ||
    normalizedPathname.startsWith(`${normalizedHref}/`)
  );
}

function isItemActive(pathname: string, item: SearchItem): boolean {
  if (matchesHref(pathname, item.href)) return true;

  return (item.aliases || []).some((alias) => matchesHref(pathname, alias));
}

function getWorkspaceHeading(workspace: WorkspaceType, isArabic: boolean): string {
  if (workspace === "system") {
    return isArabic ? "مساحة النظام" : "System Workspace";
  }

  if (workspace === "customer") {
    return isArabic ? "مساحة العميل" : "Customer Workspace";
  }

  if (workspace === "agent") {
    return isArabic ? "مساحة المندوب" : "Agent Workspace";
  }

  return isArabic ? "مساحة مقدم الخدمة" : "Provider Workspace";
}

/* =====================================================
   COMPONENT
===================================================== */

export default function Search() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  const authSession = useAuth();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [locale, setLocale] = useState<AppLocale>("ar");

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCommandK =
        (event.key === "k" || event.key === "K") &&
        (event.metaKey || event.ctrlKey);

      if (isCommandK) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  const isArabic = locale === "ar";
  const workspace = getWorkspaceFromPathname(pathname || "");

  const searchItems = useMemo(() => {
    if (workspace === "system") return systemSearchItems;
    if (workspace === "customer") return customerSearchItems;
    if (workspace === "agent") return agentSearchItems;

    return providerSearchItems;
  }, [workspace]);

  const authorizedSearchItems = useMemo(() => {
    return searchItems.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(authSession, item.permission);
    });
  }, [authSession, searchItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return authorizedSearchItems;

    return authorizedSearchItems.filter((item) => {
      const arTitle = item.title.ar.toLowerCase();
      const enTitle = item.title.en.toLowerCase();
      const arDescription = item.description?.ar?.toLowerCase() || "";
      const enDescription = item.description?.en?.toLowerCase() || "";

      return (
        arTitle.includes(normalizedQuery) ||
        enTitle.includes(normalizedQuery) ||
        arDescription.includes(normalizedQuery) ||
        enDescription.includes(normalizedQuery)
      );
    });
  }, [authorizedSearchItems, query]);

  const placeholder = isArabic
    ? "ابحث داخل مساحة العمل الحالية..."
    : "Search current workspace...";

  const emptyText = isArabic ? "لا توجد نتائج مطابقة" : "No matching results";
  const shortcutText = isMobile ? "" : "⌘K";
  const workspaceHeading = getWorkspaceHeading(workspace, isArabic);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "h-11 w-full justify-between gap-2 rounded-2xl px-3 text-muted-foreground shadow-sm transition-all",
          "border-white/70 bg-white/76 hover:border-primary/20 hover:bg-white hover:text-foreground hover:shadow-md",
          "dark:border-white/10 dark:bg-white/[0.055] dark:hover:bg-white/[0.09]",
        )}
        aria-label={isArabic ? "فتح البحث السريع" : "Open quick search"}
        title={isArabic ? "فتح البحث السريع" : "Open quick search"}
      >
        <span
          className={cn(
            "flex min-w-0 items-center gap-2",
            isArabic ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition",
              "bg-primary/10 text-primary",
            )}
          >
            <SearchIcon className="h-4 w-4" />
          </span>

          <span className="truncate text-sm">{placeholder}</span>
        </span>

        {shortcutText ? (
          <span
            className={cn(
              "rounded-xl border px-2 py-1 text-[11px] font-semibold text-muted-foreground",
              "border-slate-200/80 bg-white/70",
              "dark:border-white/10 dark:bg-white/[0.06]",
            )}
          >
            {shortcutText}
          </span>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "overflow-hidden rounded-[1.65rem] border-white/70 bg-background/95 p-0 shadow-[0_22px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:max-w-2xl",
            "dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_22px_80px_rgba(0,0,0,0.45)]",
          )}
        >
          <DialogTitle className="sr-only">
            {isArabic ? "البحث السريع" : "Quick Search"}
          </DialogTitle>

          <DialogDescription className="sr-only">
            {isArabic
              ? "ابحث داخل مساحة العمل الحالية ثم انتقل مباشرة إلى الصفحة المطلوبة."
              : "Search within the current workspace and jump directly to the page you need."}
          </DialogDescription>

          <Command
            dir={isArabic ? "rtl" : "ltr"}
            className="flex h-full w-full flex-col overflow-hidden bg-transparent"
          >
            <div className="border-b border-slate-200/70 px-3 py-3 dark:border-white/10">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/74 px-3 shadow-sm",
                  "dark:border-white/10 dark:bg-white/[0.055]",
                  isArabic ? "flex-row-reverse" : "flex-row",
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <SearchIcon className="h-4 w-4" />
                </span>

                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder={placeholder}
                  className={cn(
                    "h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
                    isArabic ? "text-right" : "text-left",
                  )}
                />
              </div>
            </div>

            <Command.List className="max-h-[420px] overflow-y-auto p-3">
              {filteredItems.length === 0 ? (
                <Command.Empty className="py-12 text-center text-sm text-muted-foreground">
                  {emptyText}
                </Command.Empty>
              ) : (
                <Command.Group
                  heading={workspaceHeading}
                  className={cn(
                    "px-1 py-2 text-xs font-semibold text-muted-foreground",
                    isArabic ? "text-right" : "text-left",
                  )}
                >
                  <div className="mt-2 space-y-1.5">
                    {filteredItems.map((item) => {
                      const Icon = item.icon || SearchIcon;
                      const title = isArabic ? item.title.ar : item.title.en;
                      const description = isArabic
                        ? item.description?.ar
                        : item.description?.en;
                      const active = isItemActive(pathname || "", item);

                      return (
                        <Command.Item
                          key={item.href}
                          value={`${item.title.ar} ${item.title.en} ${
                            item.description?.ar || ""
                          } ${item.description?.en || ""}`}
                          className={cn(
                            "rounded-2xl p-0 aria-selected:bg-primary/8 aria-selected:text-primary",
                            "data-[selected=true]:bg-primary/8",
                          )}
                          asChild
                        >
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition",
                              "hover:bg-primary/8",
                              active ? "bg-primary/10 text-primary" : "text-foreground",
                              isArabic
                                ? "flex-row-reverse text-right"
                                : "flex-row text-left",
                            )}
                          >
                            <div
                              className={cn(
                                "flex min-w-0 items-center gap-3",
                                isArabic ? "flex-row-reverse" : "flex-row",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition",
                                  active
                                    ? "border-primary/15 bg-primary/12 text-primary"
                                    : "border-slate-200/75 bg-white/78 text-muted-foreground dark:border-white/10 dark:bg-white/[0.055]",
                                )}
                              >
                                <Icon className="h-4.5 w-4.5" />
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">
                                  {title}
                                </div>

                                {description ? (
                                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {description}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div
                              className={cn(
                                "flex shrink-0 items-center gap-2",
                                active ? "text-primary" : "text-muted-foreground",
                                isArabic ? "flex-row-reverse" : "flex-row",
                              )}
                            >
                              {active ? (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold">
                                  {isArabic ? "الحالية" : "Current"}
                                </span>
                              ) : null}

                              <ArrowUpRight className="h-4 w-4" />
                            </div>
                          </Link>
                        </Command.Item>
                      );
                    })}
                  </div>
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
